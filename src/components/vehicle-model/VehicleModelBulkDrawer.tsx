import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  Layers,
  Power,
  Trash2,
  X,
} from 'lucide-react';
import {
  VehicleModelRecord,
  countDependentVehicles,
  getIconSetupSummary,
} from '../../types/vehicleModelMaster';
import { Vehicle } from '../../types/vehicle';

export type VehicleModelBulkAction = 'activate' | 'deactivate' | 'delete' | 'export';

interface VehicleModelBulkDrawerProps {
  isOpen: boolean;
  selectedRecords: VehicleModelRecord[];
  vehiclesList: Vehicle[];
  isPlatformAdmin: boolean;
  onClose: () => void;
  onClearSelection: () => void;
  onApplyBulkStatus: (ids: string[], nextActive: boolean) => void;
  onApplyBulkDelete: (ids: string[]) => void;
  onExportSelected: () => void;
}

export const VehicleModelBulkDrawer: React.FC<VehicleModelBulkDrawerProps> = ({
  isOpen,
  selectedRecords,
  vehiclesList,
  isPlatformAdmin,
  onClose,
  onClearSelection,
  onApplyBulkStatus,
  onApplyBulkDelete,
  onExportSelected,
}) => {
  const [actionMode, setActionMode] = useState<VehicleModelBulkAction>('deactivate');
  const [confirming, setConfirming] = useState(false);
  const [formError, setFormError] = useState('');

  const eligibility = useMemo(() => {
    if (actionMode === 'activate') {
      const eligible = selectedRecords.filter((r) => !r.isActive);
      const skipped = selectedRecords.filter((r) => r.isActive).map((r) => ({
        record: r,
        reason: 'Already Active in catalog',
      }));
      return { eligible, skipped };
    }
    if (actionMode === 'deactivate') {
      const eligible = selectedRecords.filter((r) => r.isActive);
      const skipped = selectedRecords.filter((r) => !r.isActive).map((r) => ({
        record: r,
        reason: 'Already Inactive',
      }));
      return { eligible, skipped };
    }
    if (actionMode === 'delete') {
      const eligible: VehicleModelRecord[] = [];
      const skipped: Array<{ record: VehicleModelRecord; reason: string }> = [];
      selectedRecords.forEach((r) => {
        const depCount = countDependentVehicles(r, vehiclesList);
        if (depCount > 0) {
          skipped.push({
            record: r,
            reason: `${depCount} dependent vehicle(s) linked in Vehicle Master`,
          });
        } else {
          eligible.push(r);
        }
      });
      return { eligible, skipped };
    }
    // export
    return {
      eligible: selectedRecords,
      skipped: [] as Array<{ record: VehicleModelRecord; reason: string }>,
    };
  }, [actionMode, selectedRecords, vehiclesList]);

  if (!isOpen) return null;

  const handleExecute = () => {
    setFormError('');
    if (!isPlatformAdmin && actionMode !== 'export') {
      setFormError('Platform Admin permission required to execute catalog modifications.');
      return;
    }
    if (eligibility.eligible.length === 0) {
      setFormError('No eligible records in current selection for this action.');
      return;
    }

    const eligibleIds = eligibility.eligible.map((r) => r.id);

    if (actionMode === 'activate') {
      onApplyBulkStatus(eligibleIds, true);
      onClose();
    } else if (actionMode === 'deactivate') {
      onApplyBulkStatus(eligibleIds, false);
      onClose();
    } else if (actionMode === 'delete') {
      onApplyBulkDelete(eligibleIds);
      onClose();
    } else if (actionMode === 'export') {
      onExportSelected();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
      <div className="w-full max-w-[500px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FA8A63]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Bulk Operations</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                  {selectedRecords.length} selected
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Safeguarded bulk actions for Vehicle Model Master
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Selection Tabs */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Select Operation
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setActionMode('deactivate');
                setConfirming(false);
                setFormError('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                actionMode === 'deactivate'
                  ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Power className="w-3.5 h-3.5 text-amber-600" />
                <span>Deactivate</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                Hides from new Add Vehicle selections; preserves linked vehicles.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionMode('activate');
                setConfirming(false);
                setFormError('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                actionMode === 'activate'
                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Activate</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                Enables model in new Add Vehicle Machine Model dropdown.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionMode('delete');
                setConfirming(false);
                setFormError('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                actionMode === 'delete'
                  ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete (Guarded)</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                Permanently deletes unlinked models only. Linked models skipped!
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionMode('export');
                setConfirming(false);
                setFormError('');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                actionMode === 'export'
                  ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <FileDown className="w-3.5 h-3.5 text-blue-600" />
                <span>Export CSV</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                Exports only the selected {selectedRecords.length} records.
              </p>
            </button>
          </div>
        </div>

        {/* Content Body: Eligibility & Safeguard Preview */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {/* Summary Chips */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                  Eligible For Action
                </div>
                <div className="text-lg font-extrabold text-emerald-900">
                  {eligibility.eligible.length}
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>

            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                  Skipped (Safeguarded)
                </div>
                <div className="text-lg font-extrabold text-amber-900">
                  {eligibility.skipped.length}
                </div>
              </div>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
          </div>

          {/* Action Specific Safeguard Note */}
          {actionMode === 'delete' && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Destructive Deletion Safeguard</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Models that are referenced by registered vehicles cannot be deleted to preserve historical data integrity. They are automatically skipped with exact dependent counts.
              </p>
            </div>
          )}

          {actionMode === 'deactivate' && (
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Preserve Vehicle Associations</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Deactivated models remain tied to historical vehicles. Inactive models will simply not appear in the new Add Vehicle dropdown.
              </p>
            </div>
          )}

          {/* List of Eligible Records */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Eligible Records ({eligibility.eligible.length})</span>
            </div>
            {eligibility.eligible.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-center text-[11px]">
                No records eligible for this operation in the current selection.
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-slate-200 p-2 bg-slate-50">
                {eligibility.eligible.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded border border-slate-200 text-[11px]"
                  >
                    <div className="font-semibold text-slate-800 truncate mr-2">
                      <span className="font-mono text-slate-500 text-[10px] mr-1.5">{r.id}</span>
                      {r.manufacturer} · {r.modelName} ({r.variant})
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        r.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* List of Skipped Records */}
          {eligibility.skipped.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center justify-between">
                <span>Skipped Records & Reasons ({eligibility.skipped.length})</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-amber-200 p-2 bg-amber-50/30">
                {eligibility.skipped.map(({ record, reason }) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded border border-amber-200 text-[11px]"
                  >
                    <div className="font-semibold text-slate-800 truncate mr-2">
                      <span className="font-mono text-slate-500 text-[10px] mr-1.5">{record.id}</span>
                      {record.manufacturer} · {record.modelName}
                    </div>
                    <span className="text-[10px] text-amber-700 font-medium whitespace-nowrap">
                      {reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium text-xs">
              {formError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClearSelection}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Clear Selection
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={eligibility.eligible.length === 0}
              onClick={handleExecute}
              className={`px-4 py-1.5 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                actionMode === 'delete'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : actionMode === 'activate'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : actionMode === 'export'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-[#FA8A63] hover:bg-[#e77a54]'
              }`}
            >
              {actionMode === 'activate'
                ? `Activate ${eligibility.eligible.length} Model(s)`
                : actionMode === 'deactivate'
                ? `Deactivate ${eligibility.eligible.length} Model(s)`
                : actionMode === 'delete'
                ? `Delete ${eligibility.eligible.length} Model(s)`
                : `Export ${eligibility.eligible.length} Model(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
