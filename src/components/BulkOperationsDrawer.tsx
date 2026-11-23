import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Users,
  Truck,
  Tag,
  FileDown,
  Info
} from 'lucide-react';
import {
  Vehicle,
  DEMO_LOOKUPS,
  getVehicleOwningCompany,
  isVehicleAuthorizedForCompany
} from '../types/vehicle';
import { INITIAL_DEMO_FLEETS } from '../types/fleet';
import {
  getCanonicalTransporterVendors,
  resolveTransporterVendor
} from '../data/vendorsSeed';
import {
  ModalMasterStore,
  getVehicleMappingReferences,
  loadModalMasterStore
} from '../types/modalMaster';

export type BulkActionType = 'status' | 'fleet_add' | 'fleet_remove' | 'transporter';

export interface BulkEligibilityResult {
  eligible: { vehicle: Vehicle; reason?: string }[];
  skipped: { vehicle: Vehicle; reason: string }[];
}

const VALID_VEHICLE_STATUSES = new Set<string>(DEMO_LOOKUPS.operationalStatuses);

export function evaluateVehicleBulkEligibility(
  selectedVehicles: Vehicle[],
  action: BulkActionType,
  targetValue: string,
  modalStore: Pick<ModalMasterStore, 'connections' | 'resourceAllocations' | 'resourceRelationships'>,
  allVehicleIds: Set<string>,
  companyContext?: string
): BulkEligibilityResult {
  const eligible: { vehicle: Vehicle; reason?: string }[] = [];
  const skipped: { vehicle: Vehicle; reason: string }[] = [];
  const trimmedTarget = (targetValue || '').trim();
  const targetFleetMeta = INITIAL_DEMO_FLEETS.find(
    (f) => f.name.trim().toLowerCase() === trimmedTarget.toLowerCase()
  );

  selectedVehicles.forEach((veh) => {
    if (!isVehicleAuthorizedForCompany(veh, companyContext)) {
      skipped.push({
        vehicle: veh,
        reason: `Outside authorized scope (${getVehicleOwningCompany(veh) || 'Unknown tenant'})`
      });
      return;
    }

    const vehCompany = getVehicleOwningCompany(veh);

    switch (action) {
      case 'status': {
        if (!VALID_VEHICLE_STATUSES.has(trimmedTarget)) {
          skipped.push({ vehicle: veh, reason: 'Unsupported operational status' });
          return;
        }
        if (veh.status === trimmedTarget) {
          skipped.push({ vehicle: veh, reason: 'Already has selected status' });
          return;
        }
        if (trimmedTarget === 'Inactive') {
          const refs = getVehicleMappingReferences(veh, modalStore, allVehicleIds);
          if (refs.activeAllocations.length > 0) {
            const connList = Array.from(
              new Set(refs.activeAllocations.map((a) => a.connectionId))
            ).join(', ');
            skipped.push({
              vehicle: veh,
              reason: `Active Asset Mapping (${connList}) — end allocation before deactivating`
            });
            return;
          }
        }
        eligible.push({ vehicle: veh });
        break;
      }

      case 'fleet_add': {
        if (!trimmedTarget) {
          skipped.push({ vehicle: veh, reason: 'No target fleet specified' });
          return;
        }
        if (
          targetFleetMeta &&
          targetFleetMeta.company &&
          vehCompany &&
          targetFleetMeta.company.trim().toLowerCase() !== vehCompany.toLowerCase()
        ) {
          skipped.push({
            vehicle: veh,
            reason: `Cross-tenant fleet blocked (belongs to ${targetFleetMeta.company})`
          });
          return;
        }
        if (veh.fleets?.some((f) => f.trim().toLowerCase() === trimmedTarget.toLowerCase())) {
          skipped.push({ vehicle: veh, reason: 'Already in this fleet' });
          return;
        }
        eligible.push({ vehicle: veh });
        break;
      }

      case 'fleet_remove': {
        if (!trimmedTarget) {
          skipped.push({ vehicle: veh, reason: 'No target fleet specified' });
          return;
        }
        if (!veh.fleets?.some((f) => f.trim().toLowerCase() === trimmedTarget.toLowerCase())) {
          skipped.push({ vehicle: veh, reason: 'No existing membership' });
          return;
        }
        eligible.push({ vehicle: veh });
        break;
      }

      case 'transporter': {
        if (!trimmedTarget) {
          skipped.push({ vehicle: veh, reason: 'No transporter specified' });
          return;
        }
        if ((veh.transporter || '').trim().toLowerCase() === trimmedTarget.toLowerCase()) {
          skipped.push({ vehicle: veh, reason: 'Already assigned' });
          return;
        }
        const permittedForOwner = getCanonicalTransporterVendors(vehCompany || undefined);
        const vendorMeta = resolveTransporterVendor(trimmedTarget);
        const isPermitted =
          permittedForOwner.some(
            (pv) =>
              pv.name.trim().toLowerCase() === trimmedTarget.toLowerCase() &&
              pv.is_active !== false &&
              pv.status !== 'blacklisted' &&
              pv.status !== 'terminated'
          ) ||
          (!vendorMeta && DEMO_LOOKUPS.transporters.includes(trimmedTarget));

        if (!isPermitted) {
          skipped.push({
            vehicle: veh,
            reason: `Transporter "${trimmedTarget}" not permitted for ${vehCompany || 'this company'}`
          });
          return;
        }
        eligible.push({ vehicle: veh });
        break;
      }
    }
  });

  return { eligible, skipped };
}

interface BulkOperationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicles: Vehicle[];
  scopedVehicles?: Vehicle[];
  allVehicleIds?: Set<string>;
  companyContext?: string;
  onCommitBulkAction: (action: BulkActionType, value: string, eligibleVehicles: Vehicle[]) => void;
  onExportSelected: () => void;
}

export const BulkOperationsDrawer: React.FC<BulkOperationsDrawerProps> = ({
  isOpen,
  onClose,
  selectedVehicles,
  scopedVehicles = [],
  allVehicleIds,
  companyContext,
  onCommitBulkAction,
  onExportSelected
}) => {
  const [selectedAction, setSelectedAction] = useState<BulkActionType | null>(null);
  const [targetValue, setTargetValue] = useState<string>('');
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<BulkEligibilityResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [vendorRefreshTick, setVendorRefreshTick] = useState(0);
  const [modalRefreshTick, setModalRefreshTick] = useState(0);

  useEffect(() => {
    const onVendorsUpdated = () => setVendorRefreshTick((t) => t + 1);
    const onModalUpdated = () => setModalRefreshTick((t) => t + 1);
    window.addEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
    window.addEventListener('fleetrobo:modal-store-updated', onModalUpdated);
    return () => {
      window.removeEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
      window.removeEventListener('fleetrobo:modal-store-updated', onModalUpdated);
    };
  }, []);

  // Reset wizard state cleanly whenever drawer opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAction(null);
      setTargetValue('');
      setIsPreviewMode(false);
      setPreviewData(null);
      setErrorMessage('');
    }
  }, [isOpen]);

  const modalStore = useMemo(() => {
    void modalRefreshTick;
    return loadModalMasterStore();
  }, [modalRefreshTick]);

  const resolvedAllVehicleIds = useMemo(() => {
    if (allVehicleIds) return allVehicleIds;
    return new Set(
      [...selectedVehicles, ...scopedVehicles].map((v) => v.id)
    );
  }, [allVehicleIds, selectedVehicles, scopedVehicles]);

  const authorizedSelectedVehicles = useMemo(
    () => selectedVehicles.filter((v) => isVehicleAuthorizedForCompany(v, companyContext)),
    [selectedVehicles, companyContext]
  );

  const fleetAddOptions = useMemo(() => {
    const isAdmin =
      !companyContext ||
      companyContext === 'All Clients' ||
      companyContext === 'Platform Admin' ||
      companyContext === 'Binary';

    const tenantMasterFleets = INITIAL_DEMO_FLEETS.filter((f) => {
      if (f.status === 'inactive' || f.status === 'decommissioning') return false;
      if (isAdmin) return true;
      return f.company.trim().toLowerCase() === companyContext.trim().toLowerCase();
    }).map((f) => f.name);

    const existingFleetNames = scopedVehicles.flatMap((v) => v.fleets || []);
    const selectedFleetNames = authorizedSelectedVehicles.flatMap((v) => v.fleets || []);

    return Array.from(
      new Set([
        ...existingFleetNames,
        ...selectedFleetNames,
        ...tenantMasterFleets,
        ...(isAdmin ? DEMO_LOOKUPS.fleets : [])
      ].filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [companyContext, scopedVehicles, authorizedSelectedVehicles]);

  const fleetRemoveOptions = useMemo(() => {
    const selectedFleetNames = authorizedSelectedVehicles.flatMap((v) => v.fleets || []);
    const scopedFleetNames = scopedVehicles.flatMap((v) => v.fleets || []);
    return Array.from(new Set([...selectedFleetNames, ...scopedFleetNames].filter(Boolean))).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [authorizedSelectedVehicles, scopedVehicles]);

  const transporterOptions = useMemo(() => {
    void vendorRefreshTick;
    const isAdmin =
      !companyContext ||
      companyContext === 'All Clients' ||
      companyContext === 'Platform Admin' ||
      companyContext === 'Binary';
    const ctx = isAdmin ? undefined : companyContext;
    const vendors = getCanonicalTransporterVendors(ctx).filter(
      (v) => v.is_active !== false && v.status !== 'blacklisted' && v.status !== 'terminated'
    );
    return Array.from(new Set(vendors.map((v) => v.name).filter(Boolean)));
  }, [companyContext, vendorRefreshTick]);

  if (!isOpen) return null;

  const actionCards: {
    type: BulkActionType;
    label: string;
    description: string;
    icon: any;
    dropdownLabel: string;
    options: string[];
    helperNote: string;
  }[] = [
    {
      type: 'status',
      label: 'Change vehicle status',
      description: 'Update the operational availability status of selected vehicles.',
      icon: Tag,
      dropdownLabel: 'Vehicle status',
      options: [...DEMO_LOOKUPS.operationalStatuses],
      helperNote:
        'All 9 operational statuses are supported. Moving to Inactive synchronizes active_status=false and skips vehicles with active Asset Mappings.'
    },
    {
      type: 'fleet_add',
      label: 'Add to fleet / group',
      description: 'Add selected vehicles to an operational fleet without removing prior fleets.',
      icon: Users,
      dropdownLabel: 'Fleet / Group',
      options: fleetAddOptions,
      helperNote: 'Preserves existing fleet memberships and enforces tenant boundaries.'
    },
    {
      type: 'fleet_remove',
      label: 'Remove from fleet / group',
      description: 'Remove selected vehicles from a designated fleet membership.',
      icon: Users,
      dropdownLabel: 'Fleet / Group',
      options: fleetRemoveOptions,
      helperNote: 'Removes only the selected fleet membership while keeping other fleets intact.'
    },
    {
      type: 'transporter',
      label: 'Change transporter',
      description: 'Reassign managing transporter while preserving vendor & driver records.',
      icon: Truck,
      dropdownLabel: 'Transporter',
      options: transporterOptions,
      helperNote:
        'Only transporters permitted for each vehicle’s owning company can be assigned.'
    }
  ];

  const currentActionMeta = actionCards.find((c) => c.type === selectedAction);

  const handleComputePreview = () => {
    if (!selectedAction) return;
    if (!targetValue) {
      setErrorMessage('Choose a target value before continuing.');
      return;
    }
    setErrorMessage('');

    const result = evaluateVehicleBulkEligibility(
      authorizedSelectedVehicles,
      selectedAction,
      targetValue,
      modalStore,
      resolvedAllVehicleIds,
      companyContext
    );

    setPreviewData(result);
    setIsPreviewMode(true);
  };

  const handleConfirm = () => {
    if (!selectedAction || !previewData || previewData.eligible.length === 0) return;
    // Revalidate against latest modal store right before commit
    const latestModalStore = loadModalMasterStore();
    const finalEvaluation = evaluateVehicleBulkEligibility(
      previewData.eligible.map((e) => e.vehicle),
      selectedAction,
      targetValue,
      latestModalStore,
      resolvedAllVehicleIds,
      companyContext
    );

    onCommitBulkAction(
      selectedAction,
      targetValue,
      finalEvaluation.eligible.map((e) => e.vehicle)
    );

    setSelectedAction(null);
    setTargetValue('');
    setIsPreviewMode(false);
    setPreviewData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* 675px Right Drawer */}
      <div className="relative w-[675px] max-w-full bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            {selectedAction && (
              <button
                type="button"
                onClick={() => {
                  if (isPreviewMode) {
                    setIsPreviewMode(false);
                  } else {
                    setSelectedAction(null);
                    setTargetValue('');
                    setErrorMessage('');
                  }
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {isPreviewMode
                    ? 'Review Impact & Confirm'
                    : selectedAction
                    ? currentActionMeta?.label
                    : 'Bulk Operations'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-[#B85324]">
                  {authorizedSelectedVehicles.length} selected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {authorizedSelectedVehicles.length} explicitly selected authorized vehicles · no changes apply until confirmation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* STEP 1: Choose Action */}
          {!selectedAction && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
                <Info size={15} className="text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Choose an operation, configure the target value, and review eligible versus skipped vehicles before confirming. Active Asset Mappings and tenant rules are verified automatically.
                </span>
              </div>

              <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                1. Choose Bulk Action
              </div>

              <div className="space-y-2.5">
                {actionCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      type="button"
                      key={card.type}
                      onClick={() => {
                        setSelectedAction(card.type);
                        setTargetValue(card.options[0] || '');
                        setErrorMessage('');
                      }}
                      className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#FA8A63] hover:bg-orange-50/20 transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[#FEEFEA] flex items-center justify-center text-slate-600 group-hover:text-[#FA8A63] transition-colors shrink-0 mt-0.5">
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-[#FA8A63] transition-colors">
                            {card.label}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {card.description}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-[#FA8A63] transition-colors shrink-0 ml-3">
                        Configure →
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  disabled={authorizedSelectedVehicles.length === 0}
                  onClick={onExportSelected}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <FileDown size={14} />
                  Export selected ({authorizedSelectedVehicles.length})
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Configure Selected Action */}
          {selectedAction && !isPreviewMode && currentActionMeta && (
            <div className="space-y-5">
              {/* Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Selected records
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {authorizedSelectedVehicles.length}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    In scope
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {authorizedSelectedVehicles.length}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Applied changes
                  </div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">0</div>
                </div>
              </div>

              {/* Action Details & Dropdown */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentActionMeta.dropdownLabel} <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mb-3">
                    {currentActionMeta.helperNote}
                  </p>
                  {currentActionMeta.options.length === 0 ? (
                    <div className="px-3 py-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 italic">
                      No permitted {currentActionMeta.dropdownLabel.toLowerCase()} options available for the current tenant selection.
                    </div>
                  ) : (
                    <select
                      value={targetValue}
                      onChange={(e) => {
                        setTargetValue(e.target.value);
                        setErrorMessage('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                    >
                      <option value="">Select {currentActionMeta.dropdownLabel}...</option>
                      {currentActionMeta.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold">
                    <AlertCircle size={13} />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAction(null);
                    setTargetValue('');
                    setErrorMessage('');
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={currentActionMeta.options.length === 0 || authorizedSelectedVehicles.length === 0}
                  onClick={handleComputePreview}
                  className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Review changes →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview Eligible vs Skipped & Confirm */}
          {isPreviewMode && previewData && (
            <div className="space-y-5">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Selected</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {authorizedSelectedVehicles.length}
                  </div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Eligible</div>
                  <div className="text-lg font-bold text-emerald-800 mt-0.5">
                    {previewData.eligible.length}
                  </div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="text-[10px] uppercase font-bold text-amber-700">Skipped</div>
                  <div className="text-lg font-bold text-amber-800 mt-0.5">
                    {previewData.skipped.length}
                  </div>
                </div>
              </div>

              {/* Eligible list */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Eligible for update ({previewData.eligible.length})</span>
                </div>
                {previewData.eligible.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No vehicles are eligible for this change.
                  </p>
                ) : (
                  <div className="max-h-44 overflow-y-auto border border-emerald-200/80 rounded-lg divide-y divide-emerald-100 bg-emerald-50/20">
                    {previewData.eligible.map(({ vehicle }) => (
                      <div
                        key={vehicle.id}
                        className="px-3 py-2 text-xs flex items-center justify-between gap-2"
                      >
                        <span className="font-bold text-slate-800 shrink-0">
                          {vehicle.registration_number}
                        </span>
                        <span className="text-slate-500 truncate">
                          {vehicle.name} · {getVehicleOwningCompany(vehicle)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Skipped list with reasons */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <AlertCircle size={14} className="text-amber-600" />
                  <span>Skipped vehicles &amp; reason ({previewData.skipped.length})</span>
                </div>
                {previewData.skipped.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">None skipped.</p>
                ) : (
                  <div className="max-h-44 overflow-y-auto border border-amber-200/80 rounded-lg divide-y divide-amber-100 bg-amber-50/20">
                    {previewData.skipped.map(({ vehicle, reason }) => (
                      <div
                        key={vehicle.id}
                        className="px-3 py-2 text-xs flex items-center justify-between gap-3"
                      >
                        <span className="font-bold text-slate-800 shrink-0">
                          {vehicle.registration_number}
                        </span>
                        <span className="text-amber-800 font-medium text-right">{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-800 leading-relaxed">
                Only the designated <strong>{currentActionMeta?.label}</strong> attribute will be
                updated{selectedAction === 'status' ? ' (with active_status kept synchronized)' : ''}.
                All other identity records, hardware connections, drivers, and relationship fields remain unchanged.
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={previewData.eligible.length === 0}
                  onClick={handleConfirm}
                  className={`px-5 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                    previewData.eligible.length === 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#FA8A63] hover:bg-[#e77a54] text-white cursor-pointer'
                  }`}
                >
                  Confirm {previewData.eligible.length} update
                  {previewData.eligible.length === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
