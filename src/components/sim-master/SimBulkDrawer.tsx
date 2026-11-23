import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Building2,
  CheckCircle2,
  FileDown,
  Info,
  Layers,
  MapPin,
  Radio,
  ShieldAlert,
  Trash2,
  X
} from 'lucide-react';
import {
  EffectiveSimInventoryStatus,
  ModalMasterStore,
  SIM_LIFECYCLE_OPTIONS,
  SIM_PLANS,
  SimLifecycleStatus,
  SimMappingReferenceSummary,
  SimRecord,
  deriveSimEffectiveInventoryStatus,
  getSimMappingReferences
} from '../../types/modalMaster';
import {
  getEnabledModelsForCompanyName,
  isCompanyEligibleForNewRegistration,
  resolveClientCompanyByNameOrId
} from '../../types/companyModelEnablement';

export type SimBulkActionMode =
  | 'update_owner'
  | 'update_lifecycle'
  | 'update_plan'
  | 'update_location'
  | 'retire'
  | 'delete'
  | 'export_selected';

interface BulkOutcome {
  actionLabel: string;
  updatedCount: number;
  skippedCount: number;
  details: string;
}

interface SimBulkEvaluation {
  record: SimRecord;
  effectiveStatus: EffectiveSimInventoryStatus;
  refs: SimMappingReferenceSummary;
  eligible: boolean;
  reason: string;
  targetOutcomeLabel: string;
}

interface SimBulkDrawerProps {
  isOpen: boolean;
  isPlatformAdmin: boolean;
  selectedRecords: SimRecord[];
  store: ModalMasterStore;
  effectiveStatusById: Map<string, EffectiveSimInventoryStatus>;
  availableLocations: string[];
  availableOrganizations: string[];
  onClose: () => void;
  onClearSelection: () => void;
  onExportSelected: (records: SimRecord[]) => void;
  onApplyBulkUpdate: (
    mode: Exclude<SimBulkActionMode, 'export_selected'>,
    eligibleIds: string[],
    options?: {
      targetOwner?: string;
      targetLifecycle?: SimLifecycleStatus;
      targetPlan?: string;
      targetLocation?: string;
    }
  ) => void;
}

export const SimBulkDrawer: React.FC<SimBulkDrawerProps> = ({
  isOpen,
  isPlatformAdmin,
  selectedRecords,
  store,
  effectiveStatusById,
  availableLocations,
  availableOrganizations,
  onClose,
  onClearSelection,
  onExportSelected,
  onApplyBulkUpdate
}) => {
  const [actionMode, setActionMode] = useState<SimBulkActionMode>(() =>
    isPlatformAdmin ? 'update_owner' : 'update_lifecycle'
  );
  const [targetOwner, setTargetOwner] = useState(() => availableOrganizations[0] || '');
  const [targetLifecycle, setTargetLifecycle] = useState<SimLifecycleStatus>('Suspended');
  const [targetPlan, setTargetPlan] = useState<string>(() => SIM_PLANS[0] || 'IoT Business 10GB');
  const [targetLocation, setTargetLocation] = useState('');
  const [formError, setFormError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [outcome, setOutcome] = useState<BulkOutcome | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirming(false);
      setFormError('');
      setOutcome(null);
      if (!targetOwner && availableOrganizations.length > 0) {
        setTargetOwner(availableOrganizations[0]);
      }
      if (!isPlatformAdmin && actionMode === 'update_owner') {
        setActionMode('update_lifecycle');
      }
    }
  }, [isOpen, availableOrganizations, targetOwner, isPlatformAdmin, actionMode]);

  const targetOwnerEnabledSimModels = useMemo(() => {
    if (!targetOwner) return [];
    return getEnabledModelsForCompanyName(targetOwner).filter((m) => m.category === 'SIM');
  }, [targetOwner]);

  const evaluations = useMemo<SimBulkEvaluation[]>(() => {
    const nowMs = Date.now();
    const trimmedOwner = targetOwner.trim();
    const targetCompany = trimmedOwner ? resolveClientCompanyByNameOrId(trimmedOwner) : null;
    const isTargetValid =
      Boolean(targetCompany) &&
      !targetCompany?.isPlatformOwner &&
      isCompanyEligibleForNewRegistration(targetCompany);

    return selectedRecords.map((rec) => {
      const eff =
        effectiveStatusById.get(rec.id) ??
        deriveSimEffectiveInventoryStatus(rec, store, nowMs);
      const refs = getSimMappingReferences(rec.id, store, nowMs);

      const allConnLabels = Array.from(
        new Set(
          [
            ...refs.allConnections.map((c) => c.connectionId || c.id),
            ...refs.allSimAssignments.map((sa) => sa.connectionId)
          ].filter(Boolean)
        )
      )
        .slice(0, 3)
        .join(', ');

      const activeConnLabels = Array.from(
        new Set(
          refs.activeOrScheduledConnections
            .map((c) => c.connectionId || c.id)
            .filter(Boolean)
        )
      )
        .slice(0, 3)
        .join(', ');

      if (actionMode === 'update_owner') {
        if (!isPlatformAdmin) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: 'Not authorized (Platform Admin only)',
            targetOutcomeLabel: 'Blocked'
          };
        }
        if (!trimmedOwner || !isTargetValid) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: 'Ownership conflict: select an active client organization',
            targetOutcomeLabel: 'Blocked'
          };
        }
        if ((rec.owner || '').trim().toLowerCase() === trimmedOwner.toLowerCase()) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: `Already owned by ${trimmedOwner}`,
            targetOutcomeLabel: 'Skipped'
          };
        }
        if (refs.hasAnyReference) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: refs.hasActiveOrScheduledReference
              ? `Active/Scheduled mapping (${activeConnLabels || 'Asset Mapping'}); end mapping before tenant transfer`
              : `Historical mapping reference (${allConnLabels || 'assignment history'}); cross-tenant transfer blocked`,
            targetOutcomeLabel: 'Protected'
          };
        }
        if (
          rec.modelTypeId &&
          !targetOwnerEnabledSimModels.some((m) => m.id === rec.modelTypeId)
        ) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: `Model access conflict: SIM model is not enabled for ${targetCompany?.name || trimmedOwner}`,
            targetOutcomeLabel: 'Blocked'
          };
        }
        return {
          record: rec,
          effectiveStatus: eff,
          refs,
          eligible: true,
          reason: '',
          targetOutcomeLabel: `→ ${targetCompany?.name || trimmedOwner}`
        };
      }

      if (actionMode === 'update_lifecycle') {
        if (rec.status === targetLifecycle) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: `Carrier lifecycle is already ${targetLifecycle}`,
            targetOutcomeLabel: 'Skipped'
          };
        }
        if (
          refs.hasActiveOrScheduledReference &&
          (targetLifecycle === 'Retired' || targetLifecycle === 'Inventory')
        ) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: `Active/Scheduled SIM mapping (${activeConnLabels || 'Asset Mapping'}); end mapping before setting carrier to ${targetLifecycle}`,
            targetOutcomeLabel: 'Protected'
          };
        }
        const projectedEff = deriveSimEffectiveInventoryStatus(
          { ...rec, status: targetLifecycle },
          store,
          nowMs
        );
        const flagsExisting =
          refs.hasActiveOrScheduledReference &&
          (targetLifecycle === 'Suspended' || targetLifecycle === 'Inactive');
        return {
          record: rec,
          effectiveStatus: eff,
          refs,
          eligible: true,
          reason: '',
          targetOutcomeLabel: flagsExisting
            ? `Carrier: ${targetLifecycle} · Eff: ${projectedEff} (flags mapping)`
            : `Carrier: ${targetLifecycle} · Eff: ${projectedEff}`
        };
      }

      if (actionMode === 'update_plan') {
        if (rec.status === 'Retired') {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: 'Retired SIM plan metadata cannot be modified',
            targetOutcomeLabel: 'Protected'
          };
        }
        if ((rec.plan || '').trim() === targetPlan.trim()) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: `Plan metadata is already ${targetPlan}`,
            targetOutcomeLabel: 'Skipped'
          };
        }
        return {
          record: rec,
          effectiveStatus: eff,
          refs,
          eligible: true,
          reason: '',
          targetOutcomeLabel: `→ ${targetPlan}`
        };
      }

      if (actionMode === 'update_location') {
        if (rec.status === 'Retired') {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: 'Retired SIM inventory location cannot be modified',
            targetOutcomeLabel: 'Protected'
          };
        }
        return {
          record: rec,
          effectiveStatus: eff,
          refs,
          eligible: true,
          reason: '',
          targetOutcomeLabel: targetLocation.trim()
            ? `→ ${targetLocation.trim()}`
            : 'Will update location'
        };
      }

      if (actionMode === 'retire') {
        if (rec.status === 'Retired') {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: 'Already Retired',
            targetOutcomeLabel: 'Skipped'
          };
        }
        if (refs.hasActiveOrScheduledReference) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: `Active/Scheduled SIM mapping (${activeConnLabels || 'Asset Mapping'}); end mappings before retiring`,
            targetOutcomeLabel: 'Protected'
          };
        }
        return {
          record: rec,
          effectiveStatus: eff,
          refs,
          eligible: true,
          reason: '',
          targetOutcomeLabel: '→ Retired'
        };
      }

      if (actionMode === 'delete') {
        if (refs.hasAnyReference) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: `Referenced in mapping/assignment history (${allConnLabels || 'binding/assignment'}); use Retire instead`,
            targetOutcomeLabel: 'Protected'
          };
        }
        return {
          record: rec,
          effectiveStatus: eff,
          refs,
          eligible: true,
          reason: '',
          targetOutcomeLabel: 'Will delete'
        };
      }

      // export_selected
      return {
        record: rec,
        effectiveStatus: eff,
        refs,
        eligible: true,
        reason: '',
        targetOutcomeLabel: 'Will export'
      };
    });
  }, [
    selectedRecords,
    actionMode,
    store,
    effectiveStatusById,
    targetOwner,
    targetLifecycle,
    targetPlan,
    targetLocation,
    targetOwnerEnabledSimModels,
    isPlatformAdmin
  ]);

  const eligibleEvaluations = useMemo(
    () => evaluations.filter((e) => e.eligible),
    [evaluations]
  );
  const skippedEvaluations = useMemo(
    () => evaluations.filter((e) => !e.eligible),
    [evaluations]
  );

  if (!isOpen) return null;

  const isDestructive =
    actionMode === 'retire' ||
    actionMode === 'delete' ||
    actionMode === 'update_owner';

  const resetLocalState = (nextMode?: SimBulkActionMode) => {
    if (nextMode) setActionMode(nextMode);
    setConfirming(false);
    setFormError('');
    setOutcome(null);
  };

  const executeAction = () => {
    const eligibleIds = eligibleEvaluations.map((e) => e.record.id);
    if (eligibleIds.length === 0) return;

    if (actionMode === 'export_selected') {
      onExportSelected(eligibleEvaluations.map((e) => e.record));
      setOutcome({
        actionLabel: 'Export Selected',
        updatedCount: eligibleIds.length,
        skippedCount: 0,
        details: `Downloaded CSV export for ${eligibleIds.length} selected SIM card(s) with computed effective inventory status.`
      });
      setConfirming(false);
      return;
    }

    onApplyBulkUpdate(actionMode, eligibleIds, {
      targetOwner: targetOwner.trim(),
      targetLifecycle,
      targetPlan: targetPlan.trim(),
      targetLocation: targetLocation.trim()
    });

    if (actionMode === 'update_owner') {
      setOutcome({
        actionLabel: 'Update Owner',
        updatedCount: eligibleIds.length,
        skippedCount: skippedEvaluations.length,
        details: `Transferred ownership of ${eligibleIds.length} unreferenced SIM(s) to "${targetOwner.trim()}".`
      });
    } else if (actionMode === 'update_lifecycle') {
      setOutcome({
        actionLabel: 'Update Lifecycle',
        updatedCount: eligibleIds.length,
        skippedCount: skippedEvaluations.length,
        details: `Updated carrier lifecycle to "${targetLifecycle}" on ${eligibleIds.length} eligible SIM(s). Effective inventory status remains derived from valid Asset Mapping state.`
      });
    } else if (actionMode === 'update_plan') {
      setOutcome({
        actionLabel: 'Update Plan',
        updatedCount: eligibleIds.length,
        skippedCount: skippedEvaluations.length,
        details: `Updated stored FleetRobo plan metadata to "${targetPlan.trim()}" on ${eligibleIds.length} eligible SIM(s) (local inventory metadata only; carrier MNO provisioning is unchanged).`
      });
    } else if (actionMode === 'update_location') {
      setOutcome({
        actionLabel: 'Update Inventory Location',
        updatedCount: eligibleIds.length,
        skippedCount: skippedEvaluations.length,
        details: `Updated Inventory Location to "${targetLocation.trim()}" on ${eligibleIds.length} eligible SIM(s).`
      });
    } else if (actionMode === 'retire') {
      setOutcome({
        actionLabel: 'Retire Eligible',
        updatedCount: eligibleIds.length,
        skippedCount: skippedEvaluations.length,
        details: `Retired ${eligibleIds.length} eligible SIM(s). Historical records and ended assignments remain preserved.`
      });
    } else if (actionMode === 'delete') {
      setOutcome({
        actionLabel: 'Delete Eligible',
        updatedCount: eligibleIds.length,
        skippedCount: skippedEvaluations.length,
        details: `Permanently deleted ${eligibleIds.length} unreferenced SIM(s) from inventory.`
      });
    }
    setConfirming(false);
  };

  const handleRequestAction = () => {
    setFormError('');
    if (eligibleEvaluations.length === 0) {
      setFormError('No eligible SIMs in the current selection for this action.');
      return;
    }
    if (actionMode === 'update_owner' && !targetOwner.trim()) {
      setFormError('Select a target client organization before applying.');
      return;
    }
    if (actionMode === 'update_location' && !targetLocation.trim()) {
      setFormError('Enter a target Inventory Location before applying.');
      return;
    }
    if (actionMode === 'export_selected') {
      executeAction();
      return;
    }
    setConfirming(true);
  };

  const actionItems: {
    id: SimBulkActionMode;
    label: string;
    desc: string;
    icon: React.ReactNode;
    danger?: boolean;
  }[] = [
    ...(isPlatformAdmin
      ? [
          {
            id: 'update_owner' as SimBulkActionMode,
            label: 'Update Owner',
            desc: 'Transfer unmapped org',
            icon: <Building2 className="w-3.5 h-3.5" />
          }
        ]
      : []),
    {
      id: 'update_lifecycle',
      label: 'Update Lifecycle',
      desc: 'Carrier service state',
      icon: <Radio className="w-3.5 h-3.5" />
    },
    {
      id: 'update_plan',
      label: 'Update Plan',
      desc: 'Prototype plan label',
      icon: <Layers className="w-3.5 h-3.5" />
    },
    {
      id: 'update_location',
      label: 'Update Location',
      desc: 'Set warehouse / site',
      icon: <MapPin className="w-3.5 h-3.5" />
    },
    {
      id: 'retire',
      label: 'Retire Eligible',
      desc: 'Permanently retire SIM',
      icon: <Archive className="w-3.5 h-3.5" />,
      danger: true
    },
    {
      id: 'delete',
      label: 'Delete Eligible',
      desc: 'No mapping history',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      danger: true
    },
    {
      id: 'export_selected',
      label: 'Export Selected',
      desc: 'Download CSV rows',
      icon: <FileDown className="w-3.5 h-3.5" />
    }
  ];

  return (
    <div className="fixed inset-0 z-[125] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[560px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Bulk Operations · SIM Master</h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-[#B85324]">
                {selectedRecords.length} selected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Apply safe bulk carrier lifecycle, plan metadata, ownership, location, and export operations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {outcome && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {outcome.actionLabel} completed: {outcome.updatedCount} processed
                  {outcome.skippedCount > 0 ? `, ${outcome.skippedCount} skipped` : ''}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">{outcome.details}</p>
            </div>
          )}

          {/* Section 1: Selection Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Selection Summary
              </span>
              {selectedRecords.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClearSelection();
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-600 cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Selected SIMs
                </div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedRecords.length}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                  Eligible
                </div>
                <div className="text-lg font-bold text-emerald-700 mt-0.5">
                  {eligibleEvaluations.length}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                  Protected / Skipped
                </div>
                <div className="text-lg font-bold text-amber-800 mt-0.5">
                  {skippedEvaluations.length}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Choose Bulk Action */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Choose Bulk Action
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {actionItems.map((item) => {
                const active = actionMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => resetLocalState(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? item.danger
                          ? 'border-rose-400 bg-rose-50 text-rose-800 ring-1 ring-rose-400'
                          : 'border-[#FA8A63] bg-[#FFF3EE] text-[#B85324] ring-1 ring-[#FA8A63]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>

            {actionMode === 'update_owner' && isPlatformAdmin && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Target Client Organization <span className="text-rose-600">*</span>
                </label>
                <select
                  value={targetOwner}
                  onChange={(e) => {
                    setTargetOwner(e.target.value);
                    setConfirming(false);
                    setFormError('');
                  }}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                >
                  {availableOrganizations.length === 0 && (
                    <option value="">No eligible client organizations</option>
                  )}
                  {availableOrganizations.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Platform Admin only. SIMs with active, scheduled, or historical mapping references or unenabled target SIM models are protected.
                </p>
              </div>
            )}

            {actionMode === 'update_lifecycle' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Target Carrier Lifecycle Status <span className="text-rose-600">*</span>
                </label>
                <select
                  value={targetLifecycle}
                  onChange={(e) => {
                    setTargetLifecycle(e.target.value as SimLifecycleStatus);
                    setConfirming(false);
                    setFormError('');
                  }}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                >
                  {SIM_LIFECYCLE_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Updates stored carrier service lifecycle only (retaining <strong>Inactive</strong> vs <strong>Suspended</strong> distinctly). Setting a mapped SIM to <strong>Suspended</strong> or <strong>Inactive</strong> flags affected open mappings as <strong>Needs Attention</strong>; unassigned SIMs set to carrier <strong>Active</strong> stay <strong>Inventory</strong> until mapped.
                </p>
              </div>
            )}

            {actionMode === 'update_plan' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Target Plan / Data Package <span className="text-rose-600">*</span>
                </label>
                <select
                  value={targetPlan}
                  onChange={(e) => {
                    setTargetPlan(e.target.value);
                    setConfirming(false);
                    setFormError('');
                  }}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                >
                  {SIM_PLANS.map((pl) => (
                    <option key={pl} value={pl}>
                      {pl}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Prototype inventory metadata update only — this does not alter live telecom operator billing or external carrier provisioning.
                </p>
              </div>
            )}

            {actionMode === 'update_location' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Target Inventory Location <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  list="bulk-sim-location-suggestions"
                  value={targetLocation}
                  onChange={(e) => {
                    setTargetLocation(e.target.value);
                    setConfirming(false);
                    setFormError('');
                  }}
                  placeholder="e.g. Mundra CT2, Central Store..."
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                />
                <datalist id="bulk-sim-location-suggestions">
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
                <p className="text-[11px] text-slate-500">
                  Updates stored warehouse / site location metadata (filterable in Filter SIM Inventory) without changing Asset Mapping state.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Effective inventory <strong>Active</strong> requires both carrier lifecycle <strong>Active</strong> and a valid current hardware mapping. Carrier <strong>Inactive</strong> and <strong>Suspended</strong> both derive effective inventory <strong>Suspended</strong> while preserving the underlying carrier state.
              </span>
            </div>
          </div>

          {/* Section 3: Validation, Skipped Reasons & Confirmation */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Validation &amp; Preview
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  {eligibleEvaluations.length} eligible
                </span>
                {skippedEvaluations.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                    {skippedEvaluations.length} skipped
                  </span>
                )}
              </div>
            </div>

            {actionMode === 'retire' && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Retiring sets carrier lifecycle to <strong>Retired</strong> and blocks new Asset Mapping. SIMs with active or scheduled bindings/connections are protected.
                </span>
              </div>
            )}

            {actionMode === 'delete' && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Permanent deletion only removes unreferenced SIMs. Any SIM referenced by active, scheduled, or historical mappings or assignment history is blocked.
                </span>
              </div>
            )}

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {selectedRecords.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <Layers className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                  Select one or more SIM cards in the current view to run a bulk operation.
                </div>
              ) : (
                evaluations.map(
                  ({ record, effectiveStatus, eligible, reason, targetOutcomeLabel }) => (
                    <div
                      key={record.id}
                      className={`px-3 py-2 flex items-start justify-between gap-2 text-xs ${
                        eligible ? 'bg-white' : 'bg-slate-50/90 opacity-80'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-semibold text-slate-900 truncate">
                          {record.iccid}{' '}
                          <span className="font-sans font-normal text-[11px] text-slate-500">
                            ({record.operator})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {record.owner} · Eff: <strong>{effectiveStatus}</strong> · Carrier:{' '}
                          {record.status}
                          {record.location ? ` · ${record.location}` : ''}
                        </div>
                        {!eligible && reason && (
                          <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                            Blocked: {reason}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border ${
                          eligible
                            ? actionMode === 'delete' ||
                              actionMode === 'retire' ||
                              actionMode === 'update_owner'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {targetOutcomeLabel}
                      </span>
                    </div>
                  )
                )
              )}
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            {confirming && (
              <div
                className={`p-3.5 rounded-xl border space-y-2.5 ${
                  isDestructive
                    ? 'bg-rose-50 border-rose-300'
                    : 'bg-amber-50 border-amber-300'
                }`}
              >
                <div
                  className={`flex items-center gap-2 text-xs font-bold ${
                    isDestructive ? 'text-rose-900' : 'text-amber-900'
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 ${
                      isDestructive ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  />
                  <span>
                    Confirm{' '}
                    {actionItems.find((a) => a.id === actionMode)?.label || 'Bulk Action'} (
                    {eligibleEvaluations.length} SIM(s))
                  </span>
                </div>
                <p
                  className={`text-[11px] leading-relaxed ${
                    isDestructive ? 'text-rose-800' : 'text-amber-800'
                  }`}
                >
                  {actionMode === 'update_owner' &&
                    `Transfer ${eligibleEvaluations.length} unreferenced SIM(s) to "${targetOwner.trim()}". ${skippedEvaluations.length} protected/incompatible SIM(s) will remain untouched.`}
                  {actionMode === 'update_lifecycle' &&
                    `Set carrier lifecycle to "${targetLifecycle}" for ${eligibleEvaluations.length} eligible SIM(s). Effective inventory statuses are recalculated automatically from valid mappings.`}
                  {actionMode === 'update_plan' &&
                    `Update local FleetRobo plan metadata to "${targetPlan.trim()}" for ${eligibleEvaluations.length} eligible SIM(s). Carrier MNO billing is not contacted.`}
                  {actionMode === 'update_location' &&
                    `Update Inventory Location to "${targetLocation.trim()}" for ${eligibleEvaluations.length} eligible SIM(s).`}
                  {actionMode === 'retire' &&
                    `This permanently sets carrier lifecycle to Retired on ${eligibleEvaluations.length} eligible SIM(s) and prevents future mapping.`}
                  {actionMode === 'delete' &&
                    `This permanently deletes ${eligibleEvaluations.length} unreferenced SIM(s) from SIM Master inventory. This cannot be undone.`}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="h-7 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={executeAction}
                    className={`h-7 px-3.5 rounded-lg text-white text-xs font-semibold cursor-pointer ${
                      actionMode === 'delete'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : actionMode === 'retire' || actionMode === 'update_owner'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-[#FA8A63] hover:bg-[#e57953]'
                    }`}
                  >
                    Confirm &amp; Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Unselected &amp; cross-tenant SIMs are never modified.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
            {!confirming && (
              <button
                type="button"
                disabled={eligibleEvaluations.length === 0}
                onClick={handleRequestAction}
                className={`h-8 px-4 rounded-lg disabled:opacity-40 text-white text-xs font-semibold shadow-xs cursor-pointer ${
                  actionMode === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#FA8A63] hover:bg-[#e57953]'
                }`}
              >
                {actionMode === 'export_selected'
                  ? `Export Selected (${eligibleEvaluations.length})`
                  : `Review & Apply (${eligibleEvaluations.length})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
