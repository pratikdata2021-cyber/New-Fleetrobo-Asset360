import React, { useState, useMemo } from 'react';
import {
  X,
  Trash2,
  FileDown,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
  Layers,
  Users,
  Truck
} from 'lucide-react';
import { Fleet } from '../types/fleet';

interface FleetBulkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFleets: Fleet[];
  allFleets: Fleet[];
  onCommitBulkDelete: (eligibleFleetIds: string[]) => void;
  onExportSelected: () => void;
}

interface FleetDeletionEvaluation {
  fleet: Fleet;
  isEligible: boolean;
  reason: string;
}

export const FleetBulkDrawer: React.FC<FleetBulkDrawerProps> = ({
  isOpen,
  onClose,
  selectedFleets,
  allFleets,
  onCommitBulkDelete,
  onExportSelected
}) => {
  const [stage, setStage] = useState<'choose' | 'review'>('choose');

  // Deletion evaluation with the critical safety repair:
  // A fleet is BLOCKED if:
  // 1. It has direct driver members (driverIds.length > 0)
  // 2. It has direct vehicle members (vehicleIds.length > 0)
  // 3. It has child fleets that are NOT selected, OR child fleets that are selected but themselves blocked!
  const deletionEvaluations = useMemo(() => {
    const selectedIds = new Set(selectedFleets.map((f) => f.id));

    // First pass: identify direct members
    const evaluations = new Map<string, FleetDeletionEvaluation>();

    selectedFleets.forEach((f) => {
      const driverCount = f.driverIds ? f.driverIds.length : 0;
      const vehicleCount = f.vehicleIds ? f.vehicleIds.length : 0;

      if (driverCount > 0 || vehicleCount > 0) {
        evaluations.set(f.id, {
          fleet: f,
          isEligible: false,
          reason: `Has direct members (${driverCount} drivers, ${vehicleCount} vehicles)`
        });
      } else {
        evaluations.set(f.id, {
          fleet: f,
          isEligible: true,
          reason: 'Eligible for deletion (no members or dependents)'
        });
      }
    });

    // Second pass: check child fleets across allFleets
    // If a fleet has a child that is NOT in selectedIds, or whose evaluation is NOT eligible, block the parent!
    let changed = true;
    while (changed) {
      changed = false;
      selectedFleets.forEach((f) => {
        const currentEval = evaluations.get(f.id);
        if (!currentEval || !currentEval.isEligible) return;

        // Find child fleets
        const children = allFleets.filter((candidate) => candidate.parent === f.id);
        if (children.length > 0) {
          const unselectedChild = children.find((c) => !selectedIds.has(c.id));
          if (unselectedChild) {
            evaluations.set(f.id, {
              fleet: f,
              isEligible: false,
              reason: `Has active child fleet outside deletion (${unselectedChild.name})`
            });
            changed = true;
            return;
          }

          const blockedChild = children.find((c) => {
            const childEval = evaluations.get(c.id);
            return !childEval || !childEval.isEligible;
          });
          if (blockedChild) {
            evaluations.set(f.id, {
              fleet: f,
              isEligible: false,
              reason: `Child fleet cannot be deleted (${blockedChild.name})`
            });
            changed = true;
            return;
          }
        }
      });
    }

    return Array.from(evaluations.values());
  }, [selectedFleets, allFleets]);

  const eligibleFleets = useMemo(
    () => deletionEvaluations.filter((e) => e.isEligible),
    [deletionEvaluations]
  );
  const blockedFleets = useMemo(
    () => deletionEvaluations.filter((e) => !e.isEligible),
    [deletionEvaluations]
  );

  const handleConfirmDelete = () => {
    if (eligibleFleets.length === 0) return;
    const idsToDelete = eligibleFleets.map((e) => e.fleet.id);
    onCommitBulkDelete(idsToDelete);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Container (600px wide) */}
      <div className="relative w-full max-w-[600px] bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 z-10 font-sans text-xs">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {stage === 'review' && (
              <button
                type="button"
                onClick={() => setStage('choose')}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 mr-1"
                title="Back to bulk menu"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {stage === 'choose' ? 'Bulk Operations' : 'Review Deletion'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedFleets.length} explicitly selected fleet(s) • selection may span pages
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* STAGE 1: CHOOSE ACTION */}
        {stage === 'choose' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Stats Summary Tiles */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 block">Selected</span>
                <span className="text-xl font-bold text-slate-900">{selectedFleets.length}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                <span className="text-[11px] text-emerald-700 block">Eligible to Delete</span>
                <span className="text-xl font-bold text-emerald-700">{eligibleFleets.length}</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                <span className="text-[11px] text-amber-700 block">Blocked / Skipped</span>
                <span className="text-xl font-bold text-amber-700">{blockedFleets.length}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Available Operations
              </h3>

              {/* Action 1: Delete Selected Fleets */}
              <div
                onClick={() => setStage('review')}
                className="p-4 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/20 cursor-pointer transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                      <Trash2 size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-red-700">
                        Delete selected fleets
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Review eligibility for selected fleet records before confirmed deletion.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pt-2 flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-semibold text-emerald-600">{eligibleFleets.length} eligible</span>
                  <span>•</span>
                  <span className="font-semibold text-amber-600">{blockedFleets.length} skipped</span>
                </div>
              </div>

              {/* Action 2: Export Selected Fleets */}
              <div
                onClick={() => {
                  onClose();
                  onExportSelected();
                }}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <FileDown size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-700">
                        Export selected fleets
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Download 14-column spreadsheet scoped to current selected records.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Prototype safety rule:</p>
              <p>
                Deleting a Fleet removes only the grouping record. Assigned Driver Master and Vehicle Master records are never deleted. Fleets with dependent members or child relationships are automatically skipped.
              </p>
            </div>
          </div>
        )}

        {/* STAGE 2: REVIEW DELETION */}
        {stage === 'review' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
              <AlertTriangle size={18} className="shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold text-red-950">Destructive Deletion Review</p>
                <p className="text-[11px] text-red-700 mt-0.5">
                  This action will permanently delete eligible fleet groupings. Fleets with direct members or surviving child fleets will be safely skipped.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-slate-100 text-slate-700">
                {selectedFleets.length} Selected
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={12} /> {eligibleFleets.length} Will Delete
              </span>
              {blockedFleets.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-200 bg-amber-50 text-amber-800">
                  <AlertTriangle size={12} /> {blockedFleets.length} Skipped (Has Members / Child)
                </span>
              )}
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-sky-200 bg-sky-50 text-sky-700">
                Master Drivers & Vehicles Safe
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                <span>Fleet Record</span>
                <span>Eligibility Status</span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {deletionEvaluations.map(({ fleet, isEligible, reason }) => (
                  <div
                    key={fleet.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isEligible
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-amber-200 bg-amber-50/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{fleet.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">{fleet.public_id}</span>
                      </div>
                      <p
                        className={`text-[11px] font-medium mt-0.5 ${
                          isEligible ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {reason}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        isEligible
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isEligible ? 'Will Delete' : 'Skipped'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500">
              Only the <strong className="font-semibold text-slate-800">{eligibleFleets.length}</strong> eligible fleet(s) will be deleted. The {blockedFleets.length} skipped fleet(s) will remain in your directory and remain selected.
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            {stage === 'choose'
              ? `${selectedFleets.length} fleets selected`
              : `${eligibleFleets.length} of ${selectedFleets.length} eligible to delete`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {stage === 'review' && (
              <button
                type="button"
                disabled={eligibleFleets.length === 0}
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
              >
                Confirm deletion • {eligibleFleets.length}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
