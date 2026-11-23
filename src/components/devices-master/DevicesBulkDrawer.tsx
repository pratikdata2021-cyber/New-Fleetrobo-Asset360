import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  FileDown,
  Info,
  Layers,
  MapPin,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import {
  DeviceMappingReferenceSummary,
  DeviceRecord,
  EffectiveDeviceStatus,
  ModalMasterStore,
  deriveDeviceStatus,
  getDeviceMappingReferences
} from '../../types/modalMaster';

export type DevicesBulkActionMode =
  | 'send_maintenance'
  | 'return_service'
  | 'update_location'
  | 'decommission'
  | 'delete'
  | 'export_selected';

interface BulkOutcome {
  actionLabel: string;
  updatedCount: number;
  skippedCount: number;
  details: string;
}

interface DeviceBulkEvaluation {
  record: DeviceRecord;
  effectiveStatus: EffectiveDeviceStatus;
  refs: DeviceMappingReferenceSummary;
  eligible: boolean;
  reason: string;
  targetOutcomeLabel: string;
}

interface DevicesBulkDrawerProps {
  isOpen: boolean;
  selectedRecords: DeviceRecord[];
  store: ModalMasterStore;
  effectiveStatusById: Map<string, EffectiveDeviceStatus>;
  availableLocations: string[];
  onClose: () => void;
  onClearSelection: () => void;
  onExportSelected: (records: DeviceRecord[]) => void;
  onApplyBulkUpdate: (
    mode: Exclude<DevicesBulkActionMode, 'export_selected'>,
    eligibleIds: string[],
    options?: { targetLocation?: string }
  ) => void;
}

export const DevicesBulkDrawer: React.FC<DevicesBulkDrawerProps> = ({
  isOpen,
  selectedRecords,
  store,
  effectiveStatusById,
  availableLocations,
  onClose,
  onClearSelection,
  onExportSelected,
  onApplyBulkUpdate
}) => {
  const [actionMode, setActionMode] = useState<DevicesBulkActionMode>('send_maintenance');
  const [targetLocation, setTargetLocation] = useState('');
  const [formError, setFormError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [outcome, setOutcome] = useState<BulkOutcome | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirming(false);
      setFormError('');
      setOutcome(null);
    }
  }, [isOpen]);

  const evaluations = useMemo<DeviceBulkEvaluation[]>(() => {
    const nowMs = Date.now();
    return selectedRecords.map((rec) => {
      const eff = effectiveStatusById.get(rec.id) ?? deriveDeviceStatus(rec, store, nowMs);
      const refs = getDeviceMappingReferences(rec.id, store, nowMs);
      const connLabels = refs.allConnections
        .map((c) => c.connectionId || c.id)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      const activeConnLabels = refs.activeOrScheduledConnections
        .map((c) => c.connectionId || c.id)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');

      if (actionMode === 'send_maintenance') {
        if (eff === 'Decommissioned') {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: 'Already permanently Decommissioned',
            targetOutcomeLabel: 'Blocked'
          };
        }
        if (eff === 'In Maintenance') {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: 'Already In Maintenance',
            targetOutcomeLabel: 'Skipped'
          };
        }
        if (refs.hasActiveOrScheduledReference) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: `Linked to Active/Scheduled mapping (${activeConnLabels || 'Asset Mapping'}); resolve mapping first`,
            targetOutcomeLabel: 'Protected'
          };
        }
        return {
          record: rec,
          effectiveStatus: eff,
          refs,
          eligible: true,
          reason: '',
          targetOutcomeLabel: '→ In Maintenance'
        };
      }

      if (actionMode === 'return_service') {
        if (eff === 'Decommissioned') {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: 'Permanently Decommissioned; cannot return to service',
            targetOutcomeLabel: 'Blocked'
          };
        }
        if (eff !== 'In Maintenance') {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: `Not In Maintenance (derived status is ${eff})`,
            targetOutcomeLabel: 'Skipped'
          };
        }
        const recalc = deriveDeviceStatus({ ...rec, statusOverride: null }, store, nowMs);
        return {
          record: rec,
          effectiveStatus: eff,
          refs,
          eligible: true,
          reason: '',
          targetOutcomeLabel: `→ ${recalc} (recalculated)`
        };
      }

      if (actionMode === 'update_location') {
        if (eff === 'Decommissioned') {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: 'Decommissioned device location cannot be modified',
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

      if (actionMode === 'decommission') {
        if (eff === 'Decommissioned') {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: 'Already Decommissioned',
            targetOutcomeLabel: 'Skipped'
          };
        }
        if (refs.hasActiveOrScheduledReference) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: `Linked to Active/Scheduled mapping (${activeConnLabels || 'Asset Mapping'}); end mappings first`,
            targetOutcomeLabel: 'Protected'
          };
        }
        return {
          record: rec,
          effectiveStatus: eff,
          refs,
          eligible: true,
          reason: '',
          targetOutcomeLabel: '→ Decommissioned'
        };
      }

      if (actionMode === 'delete') {
        if (refs.hasAnyReference) {
          return {
            record: rec,
            effectiveStatus: eff,
            refs,
            eligible: false,
            reason: `Referenced in Asset Mapping history (${connLabels || 'binding/allocation'}); use Decommission instead`,
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
  }, [selectedRecords, actionMode, store, effectiveStatusById, targetLocation]);

  const eligibleEvaluations = useMemo(
    () => evaluations.filter((e) => e.eligible),
    [evaluations]
  );
  const skippedEvaluations = useMemo(
    () => evaluations.filter((e) => !e.eligible),
    [evaluations]
  );

  if (!isOpen) return null;

  const isDestructive = actionMode === 'decommission' || actionMode === 'delete';

  const resetLocalState = (nextMode?: DevicesBulkActionMode) => {
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
        details: `Downloaded CSV export for ${eligibleIds.length} selected device(s) with computed effective status.`
      });
      setConfirming(false);
      return;
    }

    onApplyBulkUpdate(actionMode, eligibleIds, {
      targetLocation: targetLocation.trim()
    });

    if (actionMode === 'send_maintenance') {
      setOutcome({
        actionLabel: 'Send to Maintenance',
        updatedCount: eligibleIds.length,
        skippedCount: skippedEvaluations.length,
        details: `Placed ${eligibleIds.length} eligible device(s) into In Maintenance override. Protected mapped devices remain untouched.`
      });
    } else if (actionMode === 'return_service') {
      setOutcome({
        actionLabel: 'Return to Service',
        updatedCount: eligibleIds.length,
        skippedCount: skippedEvaluations.length,
        details: `Cleared Maintenance override on ${eligibleIds.length} device(s) and recalculated effective status from Asset Mapping.`
      });
    } else if (actionMode === 'update_location') {
      setOutcome({
        actionLabel: 'Update Inventory Location',
        updatedCount: eligibleIds.length,
        skippedCount: skippedEvaluations.length,
        details: `Updated Inventory Location to "${targetLocation.trim()}" on ${eligibleIds.length} eligible device(s).`
      });
    } else if (actionMode === 'decommission') {
      setOutcome({
        actionLabel: 'Decommission Eligible',
        updatedCount: eligibleIds.length,
        skippedCount: skippedEvaluations.length,
        details: `Permanently decommissioned ${eligibleIds.length} device(s). Historical records and mappings remain preserved.`
      });
    } else if (actionMode === 'delete') {
      setOutcome({
        actionLabel: 'Delete Eligible',
        updatedCount: eligibleIds.length,
        skippedCount: skippedEvaluations.length,
        details: `Deleted ${eligibleIds.length} unreferenced device(s) from inventory.`
      });
    }
    setConfirming(false);
  };

  const handleRequestAction = () => {
    setFormError('');
    if (eligibleEvaluations.length === 0) {
      setFormError('No eligible devices in the current selection for this action.');
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
    id: DevicesBulkActionMode;
    label: string;
    desc: string;
    icon: React.ReactNode;
    danger?: boolean;
  }[] = [
    {
      id: 'send_maintenance',
      label: 'Send to Maintenance',
      desc: 'Hold idle device',
      icon: <Wrench className="w-3.5 h-3.5" />
    },
    {
      id: 'return_service',
      label: 'Return to Service',
      desc: 'Recalculate status',
      icon: <RotateCcw className="w-3.5 h-3.5" />
    },
    {
      id: 'update_location',
      label: 'Update Location',
      desc: 'Set warehouse / site',
      icon: <MapPin className="w-3.5 h-3.5" />
    },
    {
      id: 'decommission',
      label: 'Decommission Eligible',
      desc: 'Permanently retire',
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
      <div className="w-[540px] max-w-full h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Bulk Operations</h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-[#B85324]">
                {selectedRecords.length} selected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Apply safe bulk lifecycle, location, and export operations to eligible selected Devices.
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
          {/* Outcome Banner */}
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
                  Selected Devices
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
                  Skipped / Protected
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

            {actionMode === 'update_location' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Target Inventory Location <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  list="bulk-device-location-suggestions"
                  value={targetLocation}
                  onChange={(e) => {
                    setTargetLocation(e.target.value);
                    setConfirming(false);
                    setFormError('');
                  }}
                  placeholder="e.g. Mundra CT2, JNPT Yard..."
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                />
                <datalist id="bulk-device-location-suggestions">
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
                <p className="text-[11px] text-slate-500">
                  Updates warehouse or operational site metadata on selected active/inventory devices without altering Asset Mapping status.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Inventory</strong> and <strong>Active</strong> are derived automatically from Asset Mapping and cannot be forced manually. Returning from Maintenance recalculates effective status from active mappings.
              </span>
            </div>
          </div>

          {/* Section 3: Validation & Preview */}
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

            {actionMode === 'decommission' && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Decommissioning permanently retires devices and blocks future Asset Mapping. Devices with Active or Scheduled mappings are protected and skipped.
                </span>
              </div>
            )}

            {actionMode === 'delete' && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Permanent deletion only removes devices with zero Asset Mapping history. Any device referenced in active, scheduled, or historical connections is automatically protected.
                </span>
              </div>
            )}

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {selectedRecords.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <Layers className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                  No devices selected in the current authorized view.
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
                        <div className="font-semibold text-slate-900 truncate">
                          {record.name}{' '}
                          <span className="font-mono text-[11px] text-slate-500">
                            ({record.deviceId})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {record.company} · Current: <strong>{effectiveStatus}</strong>
                          {record.inventoryLocation ? ` · ${record.inventoryLocation}` : ''}
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
                            ? actionMode === 'delete' || actionMode === 'decommission'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {eligible ? targetOutcomeLabel : targetOutcomeLabel}
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
                    {eligibleEvaluations.length} device(s))
                  </span>
                </div>
                <p
                  className={`text-[11px] leading-relaxed ${
                    isDestructive ? 'text-rose-800' : 'text-amber-800'
                  }`}
                >
                  {actionMode === 'send_maintenance' &&
                    `Move ${eligibleEvaluations.length} eligible device(s) into In Maintenance override. ${skippedEvaluations.length} protected/ineligible device(s) will remain untouched.`}
                  {actionMode === 'return_service' &&
                    `Clear In Maintenance override for ${eligibleEvaluations.length} device(s) and recalculate effective status from active Asset Mappings.`}
                  {actionMode === 'update_location' &&
                    `Update Inventory Location to "${targetLocation.trim()}" for ${eligibleEvaluations.length} eligible device(s).`}
                  {actionMode === 'decommission' &&
                    `This permanently retires ${eligibleEvaluations.length} eligible device(s) as Decommissioned. They cannot be added to new Asset Mappings.`}
                  {actionMode === 'delete' &&
                    `This permanently deletes ${eligibleEvaluations.length} unreferenced device(s) from inventory. This action cannot be undone.`}
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
                        : actionMode === 'decommission'
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
            Unselected &amp; cross-company devices are never modified.
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
