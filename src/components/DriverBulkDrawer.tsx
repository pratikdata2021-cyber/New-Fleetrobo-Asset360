import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  Tag, 
  ShieldCheck, 
  Archive, 
  Power, 
  PauseCircle,
  AlertTriangle
} from 'lucide-react';
import { Driver, DRIVER_LOOKUPS } from '../types/driver';
import {
  getCanonicalTransporterNames,
  getCanonicalTransporterVendors,
} from '../data/vendorsSeed';
import { InfoTooltip } from './InfoTooltip';

export type DriverBulkActionType = 
  | 'activate' 
  | 'deactivate' 
  | 'suspend' 
  | 'archive' 
  | 'transporter' 
  | 'verify';

interface DriverBulkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDrivers: Driver[];
  onCommitBulkAction: (action: DriverBulkActionType, params: any, eligibleIds: string[]) => void;
  onExportSelected: () => void;
}

interface EligibilityReview {
  eligible: { driver: Driver; changeNote?: string }[];
  skipped: { driver: Driver; reason: string }[];
}

export const DriverBulkDrawer: React.FC<DriverBulkDrawerProps> = ({
  isOpen,
  onClose,
  selectedDrivers,
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
  const [reviewData, setReviewData] = useState<EligibilityReview | null>(null);
  const [vendorRefreshTick, setVendorRefreshTick] = useState(0);

  useEffect(() => {
    const onVendorsUpdated = () => setVendorRefreshTick(t => t + 1);
    window.addEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
    return () => window.removeEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
  }, []);

  if (!isOpen) return null;

  void vendorRefreshTick;
  const allTransporterNames = getCanonicalTransporterNames(undefined, DRIVER_LOOKUPS.transporters);

  const handleSelectAction = (act: DriverBulkActionType) => {
    setSelectedAction(act);
    setConfigError('');
    if (act === 'transporter') {
      setTargetTransporter(allTransporterNames[0] || DRIVER_LOOKUPS.transporters[0]);
    }
    if (act === 'verify') {
      setVerifyRto('keep');
      setVerifyPolice('keep');
      setVerifyTraining('keep');
    }
    setStep('configure');
  };

  const handleProceedToReview = () => {
    setConfigError('');

    if (selectedAction === 'transporter' && !targetTransporter) {
      setConfigError('Choose a transporter before reviewing changes.');
      return;
    }

    if (selectedAction === 'verify') {
      if (verifyRto === 'keep' && verifyPolice === 'keep' && verifyTraining === 'keep') {
        setConfigError('Choose at least one verification update (cannot keep all unchanged).');
        return;
      }
    }

    // Evaluate eligibility based on Section 07.3 rules
    const eligible: { driver: Driver; changeNote?: string }[] = [];
    const skipped: { driver: Driver; reason: string }[] = [];

    selectedDrivers.forEach((driver) => {
      if (selectedAction === 'activate') {
        if (driver.status === 'Active') {
          skipped.push({ driver, reason: 'Already active' });
        } else {
          eligible.push({ driver, changeNote: 'Driver status will change to Active' });
        }
      } else if (selectedAction === 'deactivate') {
        if (driver.status === 'Archived') {
          skipped.push({ driver, reason: 'Archived record' });
        } else if (driver.status === 'Inactive') {
          skipped.push({ driver, reason: 'Already inactive' });
        } else {
          eligible.push({ driver, changeNote: 'Driver status will change to Inactive' });
        }
      } else if (selectedAction === 'suspend') {
        if (driver.status === 'Archived') {
          skipped.push({ driver, reason: 'Archived record' });
        } else if (driver.status === 'Suspended') {
          skipped.push({ driver, reason: 'Already suspended' });
        } else {
          eligible.push({ driver, changeNote: 'Driver status will change to Suspended' });
        }
      } else if (selectedAction === 'archive') {
        if (driver.status === 'Archived') {
          skipped.push({ driver, reason: 'Already archived' });
        } else {
          eligible.push({ driver, changeNote: 'Record will be archived (historical data retained)' });
        }
      } else if (selectedAction === 'transporter') {
        if (driver.status === 'Archived') {
          skipped.push({ driver, reason: 'Archived record' });
        } else {
          const canonicalCompanyNames = getCanonicalTransporterVendors(driver.company).map(v => v.name);
          const legacyCompanyNames = DRIVER_LOOKUPS.companyTransporterMap[driver.company] || [];
          const allowedSet = new Set<string>([...canonicalCompanyNames, ...legacyCompanyNames]);
          if (allowedSet.size > 0 && !allowedSet.has(targetTransporter)) {
            skipped.push({ 
              driver, 
              reason: `Transporter not associated with owning company (${driver.company})` 
            });
          } else {
            eligible.push({ driver, changeNote: `Transporter will change to ${targetTransporter}` });
          }
        }
      } else if (selectedAction === 'verify') {
        if (driver.status === 'Archived') {
          skipped.push({ driver, reason: 'Archived record' });
        } else {
          const changes: string[] = [];
          if (verifyRto !== 'keep') changes.push(`RTO: ${verifyRto.toUpperCase()}`);
          if (verifyPolice !== 'keep') changes.push(`Police: ${verifyPolice.toUpperCase()}`);
          if (verifyTraining !== 'keep') changes.push(`Training: ${verifyTraining.toUpperCase()}`);
          eligible.push({ driver, changeNote: changes.join(', ') });
        }
      }
    });

    setReviewData({ eligible, skipped });
    setStep('review');
  };

  const handleConfirmCommit = () => {
    if (!reviewData || reviewData.eligible.length === 0 || !selectedAction) return;

    const eligibleIds = reviewData.eligible.map((item) => item.driver.id);
    const params: any = {};
    if (selectedAction === 'transporter') {
      params.transporter = targetTransporter;
    }
    if (selectedAction === 'verify') {
      if (verifyRto !== 'keep') params.rto = verifyRto === 'yes';
      if (verifyPolice !== 'keep') params.police = verifyPolice === 'yes';
      if (verifyTraining !== 'keep') params.training = verifyTraining === 'yes';
    }

    onCommitBulkAction(selectedAction, params, eligibleIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" />

      {/* 640px Right Drawer */}
      <div className="relative w-[640px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            {step !== 'menu' && (
              <button
                type="button"
                onClick={() => setStep(step === 'review' ? 'configure' : 'menu')}
                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 mr-1 cursor-pointer"
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
                  ? 'Only explicitly selected drivers are in scope. You will review eligibility before confirming.'
                  : `Bulk Operations · ${selectedDrivers.length} selected drivers`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
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
                  <div
                    onClick={() => handleSelectAction('activate')}
                    className="p-3.5 bg-white border border-slate-200 hover:border-[#FA8A63] hover:bg-orange-50/20 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-slate-900 text-xs">
                      <Power size={15} className="text-emerald-600" />
                      <span>Activate drivers</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Make eligible driver records active. Reactivates inactive, suspended, or archived records.
                    </p>
                  </div>

                  <div
                    onClick={() => handleSelectAction('deactivate')}
                    className="p-3.5 bg-white border border-slate-200 hover:border-[#FA8A63] hover:bg-orange-50/20 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-slate-900 text-xs">
                      <PauseCircle size={15} className="text-slate-600" />
                      <span>Deactivate drivers</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Keep records and mapping history; change driver operational availability.
                    </p>
                  </div>

                  <div
                    onClick={() => handleSelectAction('suspend')}
                    className="p-3.5 bg-white border border-slate-200 hover:border-[#FA8A63] hover:bg-orange-50/20 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-slate-900 text-xs">
                      <AlertTriangle size={15} className="text-amber-600" />
                      <span>Suspend drivers</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Temporarily suspend selected drivers pending compliance inquiry or review.
                    </p>
                  </div>

                  <div
                    onClick={() => handleSelectAction('archive')}
                    className="p-3.5 bg-white border border-slate-200 hover:border-red-400 hover:bg-red-50/20 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-slate-900 text-xs">
                      <Archive size={15} className="text-red-600" />
                      <span>Archive drivers</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Retain full history; exclude from operational scheduling (non-destructive).
                    </p>
                  </div>
                </div>
              </div>

              {/* Group 2: Ownership & compliance */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Ownership & Compliance Operations
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => handleSelectAction('transporter')}
                    className="p-3.5 bg-white border border-slate-200 hover:border-[#FA8A63] hover:bg-orange-50/20 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-slate-900 text-xs">
                      <Truck size={15} className="text-sky-600" />
                      <span>Change transporter</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Apply designated transporter to eligible selected drivers belonging to matching companies.
                    </p>
                  </div>

                  <div
                    onClick={() => handleSelectAction('verify')}
                    className="p-3.5 bg-white border border-slate-200 hover:border-[#FA8A63] hover:bg-orange-50/20 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-slate-900 text-xs">
                      <ShieldCheck size={15} className="text-purple-600" />
                      <span>Update verification</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Update RTO, Police, and Training flags simultaneously without overwriting unmodified checks.
                    </p>
                  </div>
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
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs cursor-pointer"
                >
                  Export Selected
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIGURE */}
          {step === 'configure' && selectedAction && (
            <div className="space-y-5">
              <div className="p-3.5 bg-orange-50/40 border border-orange-200 rounded-xl text-xs text-slate-700">
                <span className="font-bold text-slate-900">Step 1 of 2 · Configure operation:</span>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  No changes will occur until you review and confirm the eligible records on the next step.
                </p>
              </div>

              {/* Status Actions Configuration */}
              {['activate', 'deactivate', 'suspend', 'archive'].includes(selectedAction) && (
                <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2">
                  <div className="text-xs font-bold text-slate-900 capitalize">
                    {selectedAction} {selectedDrivers.length} selected drivers
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This will update the operational availability status of all eligible selected records.
                    Records already in the target state or archived (for deactivate/suspend) will be shown as skipped in review.
                  </p>
                </div>
              )}

              {/* Transporter Configuration */}
              {selectedAction === 'transporter' && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Select New Transporter <span className="text-red-500 ml-0.5">*</span>
                    <InfoTooltip content="Transporter must belong to the owning company of each selected driver. Incompatible records will be skipped." />
                  </label>
                  <select
                    value={targetTransporter}
                    onChange={(e) => setTargetTransporter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  >
                    {allTransporterNames.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Verification Configuration */}
              {selectedAction === 'verify' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-600">
                    Select the verification flags to update. Unmodified checks will retain their current state.
                  </div>

                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    {/* RTO */}
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-800 flex items-center">
                        RTO Certified
                        <InfoTooltip content="Choose a new value or leave unchanged." />
                      </label>
                      <select
                        value={verifyRto}
                        onChange={(e) => setVerifyRto(e.target.value as any)}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
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
                        <InfoTooltip content="Choose a new value or leave unchanged." />
                      </label>
                      <select
                        value={verifyPolice}
                        onChange={(e) => setVerifyPolice(e.target.value as any)}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
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
                        <InfoTooltip content="Choose a new value or leave unchanged." />
                      </label>
                      <select
                        value={verifyTraining}
                        onChange={(e) => setVerifyTraining(e.target.value as any)}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
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
                  Only the eligible records will change. Existing identity, licence and document attachments are retained.
                </p>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500">Selected</div>
                  <div className="text-xl font-bold text-slate-900">{selectedDrivers.length}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-700">Will Update</div>
                  <div className="text-xl font-bold text-emerald-700">{reviewData.eligible.length}</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-[11px] text-amber-700">Skipped</div>
                  <div className="text-xl font-bold text-amber-700">{reviewData.skipped.length}</div>
                </div>
              </div>

              {/* Eligible List */}
              {reviewData.eligible.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Eligible Drivers ({reviewData.eligible.length})</span>
                  </div>
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
                    {reviewData.eligible.map(({ driver, changeNote }) => (
                      <div key={driver.id} className="p-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{driver.name}</div>
                          <div className="text-[11px] text-slate-500">DL: {driver.licence} · {driver.company}</div>
                        </div>
                        <span className="text-[11px] text-emerald-700 font-medium">{changeNote}</span>
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
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto text-xs bg-slate-50/50">
                    {reviewData.skipped.map(({ driver, reason }) => (
                      <div key={driver.id} className="p-2.5 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800">{driver.name}</div>
                          <div className="text-[11px] text-slate-500">DL: {driver.licence} · {driver.company}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
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
                    All selected drivers are already in the target state or incompatible with this operation.
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
                className={`px-4 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer ${
                  selectedAction === 'archive'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-[#FA8A63] hover:bg-[#e77a54] text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed'
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
