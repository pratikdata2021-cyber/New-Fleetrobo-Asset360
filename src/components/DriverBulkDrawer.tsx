import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Truck,
  ShieldCheck,
  Archive,
  Power,
  PauseCircle,
  AlertTriangle,
  FileDown,
  Info
} from 'lucide-react';
import {
  Driver,
  DRIVER_LOOKUPS,
  deriveDriverBadges,
  getDriverOwningCompany,
  isDriverAuthorizedForCompany,
  isGlobalDriverAdminContext
} from '../types/driver';
import {
  getCanonicalTransporterNames,
  getCanonicalTransporterVendors,
  resolveTransporterVendor
} from '../data/vendorsSeed';
import { ModalMasterStore, loadModalMasterStore } from '../types/modalMaster';
import { InfoTooltip } from './InfoTooltip';

export type DriverBulkActionType =
  | 'activate'
  | 'deactivate'
  | 'suspend'
  | 'archive'
  | 'transporter'
  | 'verify';

export interface DriverBulkParams {
  transporter?: string;
  rto?: boolean;
  police?: boolean;
  training?: boolean;
}

export interface DriverEligibilityReview {
  eligible: { driver: Driver; changeNote?: string; warningNote?: string }[];
  skipped: { driver: Driver; reason: string }[];
}

export function evaluateDriverBulkEligibility(
  selectedDrivers: Driver[],
  action: DriverBulkActionType,
  params: DriverBulkParams,
  ctx?: {
    companyContext?: string;
    modalStore?: Pick<ModalMasterStore, 'connections' | 'resourceAllocations' | 'resourceRelationships'>;
    allDriverIds?: Set<string>;
    nowMs?: number;
  }
): DriverEligibilityReview {
  const eligible: { driver: Driver; changeNote?: string; warningNote?: string }[] = [];
  const skipped: { driver: Driver; reason: string }[] = [];
  const store = ctx?.modalStore || loadModalMasterStore();
  const nowMs = ctx?.nowMs ?? Date.now();
  const targetTransporter = (params.transporter || '').trim();

  selectedDrivers.forEach((driver) => {
    if (!isDriverAuthorizedForCompany(driver, ctx?.companyContext)) {
      skipped.push({
        driver,
        reason: `Outside authorized tenant scope (${getDriverOwningCompany(driver) || 'Unknown'})`
      });
      return;
    }

    const badges = deriveDriverBadges(driver, store, nowMs, ctx?.allDriverIds);

    if (action === 'activate') {
      if (driver.status === 'Active') {
        skipped.push({ driver, reason: 'Already active' });
      } else if (driver.status === 'Archived') {
        skipped.push({
          driver,
          reason: 'Archived record — restore individually from View/Edit profile'
        });
      } else {
        const licenceWarning =
          badges.expiry === 'Expired'
            ? 'Licence expired (compliance review needed before dispatch)'
            : badges.expiry === 'Missing'
            ? 'Licence validity date missing'
            : undefined;
        eligible.push({
          driver,
          changeNote: 'Status → Active',
          warningNote: licenceWarning
        });
      }
      return;
    }

    if (action === 'deactivate') {
      if (driver.status === 'Archived') {
        skipped.push({ driver, reason: 'Archived record' });
      } else if (driver.status === 'Inactive') {
        skipped.push({ driver, reason: 'Already inactive' });
      } else {
        eligible.push({
          driver,
          changeNote: badges.hasAnyMappingReference
            ? 'Status → Inactive (mapping history retained)'
            : 'Status → Inactive'
        });
      }
      return;
    }

    if (action === 'suspend') {
      if (driver.status === 'Archived') {
        skipped.push({ driver, reason: 'Archived record' });
      } else if (driver.status === 'Suspended') {
        skipped.push({ driver, reason: 'Already suspended' });
      } else {
        eligible.push({ driver, changeNote: 'Status → Suspended' });
      }
      return;
    }

    if (action === 'archive') {
      if (driver.status === 'Archived') {
        skipped.push({ driver, reason: 'Already archived' });
      } else {
        eligible.push({
          driver,
          changeNote: badges.hasAnyMappingReference
            ? 'Status → Archived (historical mapping & profile retained)'
            : 'Status → Archived'
        });
      }
      return;
    }

    if (action === 'transporter') {
      if (driver.status === 'Archived') {
        skipped.push({ driver, reason: 'Archived record' });
        return;
      }
      if (!targetTransporter) {
        skipped.push({ driver, reason: 'No target transporter selected' });
        return;
      }
      if ((driver.transporter || '').trim().toLowerCase() === targetTransporter.toLowerCase()) {
        skipped.push({ driver, reason: 'Already assigned to selected transporter' });
        return;
      }
      const owner = getDriverOwningCompany(driver);
      const canonicalCompanyVendors = getCanonicalTransporterVendors(owner || undefined).filter(
        (v) =>
          v.is_active !== false &&
          v.status !== 'blacklisted' &&
          v.status !== 'terminated'
      );
      const canonicalNames = canonicalCompanyVendors.map((v) => v.name.trim().toLowerCase());
      const legacyNames = (DRIVER_LOOKUPS.companyTransporterMap[owner] || []).map((t) =>
        t.trim().toLowerCase()
      );
      const vendorMeta = resolveTransporterVendor(targetTransporter);
      const targetLower = targetTransporter.toLowerCase();

      const allowed =
        canonicalNames.includes(targetLower) ||
        legacyNames.includes(targetLower) ||
        (!vendorMeta &&
          legacyNames.length === 0 &&
          DRIVER_LOOKUPS.transporters.some((t) => t.toLowerCase() === targetLower));

      if (!allowed) {
        skipped.push({
          driver,
          reason: `Transporter not permitted for owning company (${owner || 'Unknown'})`
        });
      } else {
        eligible.push({
          driver,
          changeNote: `Transporter → ${targetTransporter} (${owner || 'unchanged'} kept)`
        });
      }
      return;
    }

    if (action === 'verify') {
      if (driver.status === 'Archived') {
        skipped.push({ driver, reason: 'Archived record' });
        return;
      }
      const changes: string[] = [];
      if (typeof params.rto === 'boolean' && Boolean(driver.rto) !== params.rto) {
        changes.push(`RTO: ${params.rto ? 'YES' : 'NO'}`);
      }
      if (typeof params.police === 'boolean' && Boolean(driver.police) !== params.police) {
        changes.push(`Police: ${params.police ? 'YES' : 'NO'}`);
      }
      if (typeof params.training === 'boolean' && Boolean(driver.training) !== params.training) {
        changes.push(`Training: ${params.training ? 'YES' : 'NO'}`);
      }

      if (changes.length === 0) {
        skipped.push({ driver, reason: 'Verification flags already match requested values' });
      } else {
        eligible.push({ driver, changeNote: changes.join(', ') });
      }
    }
  });

  return { eligible, skipped };
}

interface DriverBulkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDrivers: Driver[];
  companyContext?: string;
  modalStore?: Pick<ModalMasterStore, 'connections' | 'resourceAllocations' | 'resourceRelationships'>;
  allDriverIds?: Set<string>;
  onCommitBulkAction: (
    action: DriverBulkActionType,
    params: DriverBulkParams,
    eligibleIds: string[]
  ) => void;
  onExportSelected: () => void;
}

export const DriverBulkDrawer: React.FC<DriverBulkDrawerProps> = ({
  isOpen,
  onClose,
  selectedDrivers,
  companyContext,
  modalStore,
  allDriverIds,
  onCommitBulkAction,
  onExportSelected
}) => {
  const [selectedAction, setSelectedAction] = useState<DriverBulkActionType | null>(null);
  const [targetTransporter, setTargetTransporter] = useState<string>('');

  // Verification flags: 'keep' | 'yes' | 'no'
  const [verifyRto, setVerifyRto] = useState<'keep' | 'yes' | 'no'>('keep');
  const [verifyPolice, setVerifyPolice] = useState<'keep' | 'yes' | 'no'>('keep');
  const [verifyTraining, setVerifyTraining] = useState<'keep' | 'yes' | 'no'>('keep');

  const [step, setStep] = useState<'menu' | 'configure' | 'review'>('menu');
  const [configError, setConfigError] = useState<string>('');
  const [reviewData, setReviewData] = useState<DriverEligibilityReview | null>(null);
  const [vendorRefreshTick, setVendorRefreshTick] = useState(0);

  useEffect(() => {
    const onVendorsUpdated = () => setVendorRefreshTick((t) => t + 1);
    window.addEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
    return () => window.removeEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
  }, []);

  // Reset internal wizard state cleanly whenever drawer opens
  useEffect(() => {
    if (isOpen) {
      setStep('menu');
      setSelectedAction(null);
      setTargetTransporter('');
      setVerifyRto('keep');
      setVerifyPolice('keep');
      setVerifyTraining('keep');
      setConfigError('');
      setReviewData(null);
    }
  }, [isOpen]);

  const authorizedSelectedCount = useMemo(
    () =>
      selectedDrivers.filter((d) => isDriverAuthorizedForCompany(d, companyContext)).length,
    [selectedDrivers, companyContext]
  );

  const availableTransporterNames = useMemo(() => {
    void vendorRefreshTick;
    const tenantScope = isGlobalDriverAdminContext(companyContext) ? undefined : companyContext;
    const set = new Set<string>(
      getCanonicalTransporterNames(tenantScope, DRIVER_LOOKUPS.transporters)
    );
    if (!tenantScope) {
      // Include per-company legacy transporters in admin mode
      Object.values(DRIVER_LOOKUPS.companyTransporterMap).forEach((arr) =>
        arr.forEach((t) => set.add(t))
      );
    } else if (tenantScope && DRIVER_LOOKUPS.companyTransporterMap[tenantScope]) {
      DRIVER_LOOKUPS.companyTransporterMap[tenantScope].forEach((t) => set.add(t));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [companyContext, vendorRefreshTick]);

  if (!isOpen) return null;

  const handleSelectAction = (act: DriverBulkActionType) => {
    setSelectedAction(act);
    setConfigError('');
    if (act === 'transporter') {
      setTargetTransporter(availableTransporterNames[0] || '');
    }
    if (act === 'verify') {
      setVerifyRto('keep');
      setVerifyPolice('keep');
      setVerifyTraining('keep');
    }
    setStep('configure');
  };

  const buildCurrentParams = (): DriverBulkParams => {
    const params: DriverBulkParams = {};
    if (selectedAction === 'transporter') {
      params.transporter = targetTransporter;
    }
    if (selectedAction === 'verify') {
      if (verifyRto !== 'keep') params.rto = verifyRto === 'yes';
      if (verifyPolice !== 'keep') params.police = verifyPolice === 'yes';
      if (verifyTraining !== 'keep') params.training = verifyTraining === 'yes';
    }
    return params;
  };

  const handleProceedToReview = () => {
    setConfigError('');
    if (!selectedAction) return;

    if (selectedAction === 'transporter' && !targetTransporter) {
      setConfigError('Choose a transporter before reviewing changes.');
      return;
    }

    if (selectedAction === 'verify') {
      if (verifyRto === 'keep' && verifyPolice === 'keep' && verifyTraining === 'keep') {
        setConfigError(
          'Choose at least one verification update (cannot leave all three unchanged).'
        );
        return;
      }
    }

    const params = buildCurrentParams();
    const evaluated = evaluateDriverBulkEligibility(selectedDrivers, selectedAction, params, {
      companyContext,
      modalStore,
      allDriverIds
    });

    setReviewData(evaluated);
    setStep('review');
  };

  const handleConfirmCommit = () => {
    if (!reviewData || reviewData.eligible.length === 0 || !selectedAction) return;

    const params = buildCurrentParams();
    const eligibleIds = reviewData.eligible.map((item) => item.driver.id);

    onCommitBulkAction(selectedAction, params, eligibleIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* 640px Right Drawer */}
      <div className="relative w-[640px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            {step !== 'menu' && (
              <button
                type="button"
                onClick={() => setStep(step === 'review' ? 'configure' : 'menu')}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 mr-0.5 cursor-pointer transition-colors"
                title="Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {step === 'menu'
                    ? 'Bulk Operations'
                    : step === 'configure'
                    ? 'Configure Bulk Action'
                    : 'Review Changes'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-[#FA8A63] border border-orange-200">
                  {selectedDrivers.length} selected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {step === 'menu'
                  ? 'Only explicitly selected authorized drivers are in scope. Eligibility is validated before commit.'
                  : `Bulk Operations · ${authorizedSelectedCount} authorized of ${selectedDrivers.length} selected`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body content based on step */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: MENU (EXACT SIX BULK ACTIONS IN TWO GROUPS) */}
          {step === 'menu' && (
            <div className="space-y-6">
              {/* Group 1: Driver status */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Driver Status Operations
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectAction('activate')}
                    className="text-left p-3.5 bg-white border border-slate-200 hover:border-[#FA8A63] hover:bg-orange-50/20 rounded-xl transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-slate-900 text-xs">
                      <Power size={15} className="text-emerald-600" />
                      <span>Activate drivers</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Activate eligible inactive or suspended drivers (archived records are skipped).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAction('deactivate')}
                    className="text-left p-3.5 bg-white border border-slate-200 hover:border-[#FA8A63] hover:bg-orange-50/20 rounded-xl transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-slate-900 text-xs">
                      <PauseCircle size={15} className="text-slate-600" />
                      <span>Deactivate drivers</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Set availability to Inactive while preserving records and mapping history.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAction('suspend')}
                    className="text-left p-3.5 bg-white border border-slate-200 hover:border-[#FA8A63] hover:bg-orange-50/20 rounded-xl transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-slate-900 text-xs">
                      <AlertTriangle size={15} className="text-amber-600" />
                      <span>Suspend drivers</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Temporarily suspend selected drivers pending compliance inquiry or review.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAction('archive')}
                    className="text-left p-3.5 bg-white border border-slate-200 hover:border-red-400 hover:bg-red-50/20 rounded-xl transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-slate-900 text-xs">
                      <Archive size={15} className="text-red-600" />
                      <span>Archive drivers</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Retain full history and references; exclude from operational scheduling.
                    </p>
                  </button>
                </div>
              </div>

              {/* Group 2: Ownership & compliance */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Ownership & Compliance Operations
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectAction('transporter')}
                    className="text-left p-3.5 bg-white border border-slate-200 hover:border-[#FA8A63] hover:bg-orange-50/20 rounded-xl transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-slate-900 text-xs">
                      <Truck size={15} className="text-sky-600" />
                      <span>Change transporter</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Apply transporter to eligible drivers within their existing owning company.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAction('verify')}
                    className="text-left p-3.5 bg-white border border-slate-200 hover:border-[#FA8A63] hover:bg-orange-50/20 rounded-xl transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-slate-900 text-xs">
                      <ShieldCheck size={15} className="text-purple-600" />
                      <span>Update verification</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Update RTO, Police, and Training flags selectively without overwriting kept checks.
                    </p>
                  </button>
                </div>
              </div>

              {/* Selection Summary Callout */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">Need to export selected drivers first?</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Download complete profiles of your {selectedDrivers.length} selected drivers.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onExportSelected}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs cursor-pointer"
                >
                  <FileDown size={13} />
                  <span>Export Selected</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIGURE */}
          {step === 'configure' && selectedAction && (
            <div className="space-y-5">
              <div className="p-3.5 bg-orange-50/50 border border-orange-200 rounded-xl text-xs text-slate-700 flex items-start gap-2.5">
                <Info size={15} className="text-[#FA8A63] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900">Step 1 of 2 · Configure operation</span>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    No records are modified until you review eligible vs. skipped drivers and confirm.
                  </p>
                </div>
              </div>

              {/* Status Actions Configuration */}
              {['activate', 'deactivate', 'suspend', 'archive'].includes(selectedAction) && (
                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2">
                  <div className="text-xs font-bold text-slate-900 capitalize">
                    {selectedAction} {selectedDrivers.length} selected{' '}
                    {selectedDrivers.length === 1 ? 'driver' : 'drivers'}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedAction === 'activate'
                      ? 'Eligible Inactive and Suspended drivers will be set to Active. Already Active and Archived drivers will be skipped automatically.'
                      : selectedAction === 'deactivate'
                      ? 'Eligible drivers will be marked Inactive while keeping existing mapping history intact. Archived or already Inactive drivers will be skipped.'
                      : selectedAction === 'suspend'
                      ? 'Eligible drivers will be marked Suspended. Archived or already Suspended drivers will be skipped.'
                      : 'Eligible drivers will be Archived non-destructively (retaining historical compliance and mapping records).'}
                  </p>
                </div>
              )}

              {/* Transporter Configuration */}
              {selectedAction === 'transporter' && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Select New Transporter <span className="text-red-500 ml-0.5">*</span>
                    <InfoTooltip content="Transporter must belong to the owning company of each selected driver. Owning company is never altered." />
                  </label>
                  <select
                    value={targetTransporter}
                    onChange={(e) => setTargetTransporter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  >
                    {availableTransporterNames.length === 0 ? (
                      <option value="">No transporters available</option>
                    ) : (
                      availableTransporterNames.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Verification Configuration */}
              {selectedAction === 'verify' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-600">
                    Select which verification flags to update. Flags set to{' '}
                    <span className="font-semibold text-slate-800">Keep unchanged</span> will retain
                    their current values per driver.
                  </div>

                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    {/* RTO */}
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-800 flex items-center">
                        RTO Certified
                        <InfoTooltip content="Choose Certified / Uncertified or leave unchanged." />
                      </label>
                      <select
                        value={verifyRto}
                        onChange={(e) => setVerifyRto(e.target.value as 'keep' | 'yes' | 'no')}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="keep">Keep unchanged</option>
                        <option value="yes">Yes (Certified)</option>
                        <option value="no">No (Uncertified)</option>
                      </select>
                    </div>

                    {/* Police */}
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-800 flex items-center">
                        Police Verified
                        <InfoTooltip content="Choose Verified / Pending or leave unchanged." />
                      </label>
                      <select
                        value={verifyPolice}
                        onChange={(e) => setVerifyPolice(e.target.value as 'keep' | 'yes' | 'no')}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="keep">Keep unchanged</option>
                        <option value="yes">Yes (Verified)</option>
                        <option value="no">No (Pending)</option>
                      </select>
                    </div>

                    {/* Training */}
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-800 flex items-center">
                        Training Completed
                        <InfoTooltip content="Choose Completed / Incomplete or leave unchanged." />
                      </label>
                      <select
                        value={verifyTraining}
                        onChange={(e) => setVerifyTraining(e.target.value as 'keep' | 'yes' | 'no')}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="keep">Keep unchanged</option>
                        <option value="yes">Yes (Completed)</option>
                        <option value="no">No (Incomplete)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {configError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-semibold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{configError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: REVIEW CHANGES */}
          {step === 'review' && reviewData && (
            <div className="space-y-5">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-900">Step 2 of 2 · Eligibility Review</span>
                <p className="text-[11px] text-slate-500">
                  Only eligible records within your authorized scope will update. Identity,
                  licence, mapping, and documents remain intact.
                </p>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Selected</div>
                  <div className="text-xl font-bold text-slate-900">{selectedDrivers.length}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-medium">Will Update</div>
                  <div className="text-xl font-bold text-emerald-700">
                    {reviewData.eligible.length}
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-[11px] text-amber-700 font-medium">Skipped</div>
                  <div className="text-xl font-bold text-amber-700">
                    {reviewData.skipped.length}
                  </div>
                </div>
              </div>

              {/* Eligible List */}
              {reviewData.eligible.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Eligible Drivers ({reviewData.eligible.length})</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs bg-white">
                    {reviewData.eligible.map(({ driver, changeNote, warningNote }) => (
                      <div key={driver.id} className="p-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {driver.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              DL: {driver.licence || '—'} · {driver.company || 'No company'}
                            </div>
                          </div>
                          <span className="text-[11px] text-emerald-700 font-semibold shrink-0">
                            {changeNote}
                          </span>
                        </div>
                        {warningNote && (
                          <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 inline-flex items-center gap-1">
                            <AlertTriangle size={11} />
                            <span>{warningNote}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped List */}
              {reviewData.skipped.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-600" />
                    <span>Skipped Drivers ({reviewData.skipped.length})</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto text-xs bg-slate-50/50">
                    {reviewData.skipped.map(({ driver, reason }) => (
                      <div key={driver.id} className="p-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate">{driver.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            DL: {driver.licence || '—'} · {driver.company || 'No company'}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold text-right shrink-0 max-w-[55%]">
                          {reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reviewData.eligible.length === 0 && (
                <div className="p-6 text-center text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertCircle size={22} className="mx-auto mb-1 text-amber-500" />
                  <div className="font-bold">No eligible drivers found</div>
                  <p className="mt-0.5 text-[11px] text-amber-800">
                    All selected drivers are already in the target state or ineligible for this
                    operation.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {step === 'configure' && (
              <button
                type="button"
                onClick={handleProceedToReview}
                className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Review changes →
              </button>
            )}

            {step === 'review' && (
              <button
                type="button"
                disabled={!reviewData || reviewData.eligible.length === 0}
                onClick={handleConfirmCommit}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                  selectedAction === 'archive'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-[#FA8A63] hover:bg-[#e77a54] text-white'
                }`}
              >
                Confirm {reviewData?.eligible.length || 0} updates
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
