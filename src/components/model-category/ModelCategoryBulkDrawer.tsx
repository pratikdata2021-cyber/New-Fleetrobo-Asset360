import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  FileDown,
  Info,
  Layers,
  Power,
  X,
} from 'lucide-react';
import {
  ModelCategoryRecord,
  isValidHttpUrl,
} from '../../types/modelCategoryMaster';
import { ModelReferenceSummary } from '../../utils/modelCategoryRefs';

export type BulkActionMode = 'activate' | 'deactivate' | 'edit_docs';

interface BulkOutcome {
  actionLabel: string;
  updatedCount: number;
  skippedCount: number;
  details: string;
}

interface ModelCategoryBulkDrawerProps {
  isOpen: boolean;
  selectedRecords: ModelCategoryRecord[];
  referenceMap: Record<string, ModelReferenceSummary>;
  onClose: () => void;
  onClearSelection: () => void;
  onExportSelected: () => void;
  onApplyBulkStatus: (ids: string[], nextStatus: 'Active' | 'Inactive') => void;
  onApplyBulkMetadata: (
    ids: string[],
    patch: { description?: string; documentationUrl?: string }
  ) => void;
}

export const ModelCategoryBulkDrawer: React.FC<ModelCategoryBulkDrawerProps> = ({
  isOpen,
  selectedRecords,
  referenceMap,
  onClose,
  onClearSelection,
  onExportSelected,
  onApplyBulkStatus,
  onApplyBulkMetadata,
}) => {
  const [actionMode, setActionMode] = useState<BulkActionMode>('deactivate');
  const [updateDescription, setUpdateDescription] = useState(false);
  const [bulkDescription, setBulkDescription] = useState('');
  const [updateDocUrl, setUpdateDocUrl] = useState(false);
  const [bulkDocUrl, setBulkDocUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [outcome, setOutcome] = useState<BulkOutcome | null>(null);

  const eligibility = useMemo(() => {
    if (actionMode === 'activate') {
      const eligible = selectedRecords.filter((r) => r.status === 'Inactive');
      const skipped = selectedRecords.filter((r) => r.status !== 'Inactive');
      return {
        eligible,
        skipped,
        skipReason: 'Already Active',
      };
    }
    if (actionMode === 'deactivate') {
      const eligible = selectedRecords.filter((r) => r.status === 'Active');
      const skipped = selectedRecords.filter((r) => r.status !== 'Active');
      return {
        eligible,
        skipped,
        skipReason: 'Already Inactive',
      };
    }
    return {
      eligible: selectedRecords,
      skipped: [] as ModelCategoryRecord[],
      skipReason: '',
    };
  }, [actionMode, selectedRecords]);

  const affectedRefsSummary = useMemo(() => {
    if (actionMode !== 'deactivate') return null;
    const referencedRecords = eligibility.eligible.filter(
      (r) => referenceMap[r.id]?.isReferenced
    );
    const totalAssets = referencedRecords.reduce(
      (sum, r) =>
        sum +
        (referenceMap[r.id]?.devicesCount || 0) +
        (referenceMap[r.id]?.sensorsCount || 0) +
        (referenceMap[r.id]?.simsCount || 0),
      0
    );
    const totalMappings = referencedRecords.reduce(
      (sum, r) => sum + (referenceMap[r.id]?.mappingsCount || 0),
      0
    );
    const companySet = new Set<string>();
    referencedRecords.forEach((r) => {
      (referenceMap[r.id]?.enabledCompanyNames || []).forEach((c) => companySet.add(c));
    });
    return {
      referencedCount: referencedRecords.length,
      totalAssets,
      totalMappings,
      companiesCount: companySet.size,
    };
  }, [actionMode, eligibility.eligible, referenceMap]);

  if (!isOpen) return null;

  const resetLocalState = (nextMode?: BulkActionMode) => {
    if (nextMode) setActionMode(nextMode);
    setConfirming(false);
    setFormError('');
    setOutcome(null);
  };

  const handleRequestConfirm = () => {
    setFormError('');
    if (eligibility.eligible.length === 0) {
      setFormError('No eligible records in the current selection for this action.');
      return;
    }
    if (actionMode === 'edit_docs') {
      if (!updateDescription && !updateDocUrl) {
        setFormError('Select at least Description or Documentation URL to update.');
        return;
      }
      if (updateDocUrl && bulkDocUrl.trim() && !isValidHttpUrl(bulkDocUrl)) {
        setFormError('Documentation URL must be a valid http:// or https:// URL.');
        return;
      }
    }
    setConfirming(true);
  };

  const handleCommit = () => {
    const eligibleIds = eligibility.eligible.map((r) => r.id);
    if (eligibleIds.length === 0) return;

    if (actionMode === 'activate') {
      onApplyBulkStatus(eligibleIds, 'Active');
      setOutcome({
        actionLabel: 'Bulk Activate',
        updatedCount: eligibleIds.length,
        skippedCount: eligibility.skipped.length,
        details:
          'Activated models are now globally eligible for enablement. No client companies were auto-enabled.',
      });
    } else if (actionMode === 'deactivate') {
      onApplyBulkStatus(eligibleIds, 'Inactive');
      setOutcome({
        actionLabel: 'Bulk Deactivate',
        updatedCount: eligibleIds.length,
        skippedCount: eligibility.skipped.length,
        details:
          'Deactivated models are hidden from new inventory registration and enablement; existing historical assets remain intact.',
      });
    } else {
      const patch: { description?: string; documentationUrl?: string } = {};
      if (updateDescription) patch.description = bulkDescription.trim();
      if (updateDocUrl) patch.documentationUrl = bulkDocUrl.trim();
      onApplyBulkMetadata(eligibleIds, patch);
      setOutcome({
        actionLabel: 'Bulk Edit Description / Documentation URL',
        updatedCount: eligibleIds.length,
        skippedCount: 0,
        details: `Updated ${[
          updateDescription ? 'Description' : '',
          updateDocUrl ? 'Documentation URL' : '',
        ]
          .filter(Boolean)
          .join(' and ')} on ${eligibleIds.length} model definition(s).`,
      });
    }
    setConfirming(false);
  };

  return (
    <div className="fixed inset-0 z-[125] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
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
              Apply safe bulk governance updates to eligible selected Model Category definitions.
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
          {/* Quick Utilities */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900">{selectedRecords.length}</strong> model definition(s) selected
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportSelected}
                disabled={selectedRecords.length === 0}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-slate-500" />
                Export Selected
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearSelection();
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* Outcome Banner */}
          {outcome && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {outcome.actionLabel} completed: {outcome.updatedCount} updated
                  {outcome.skippedCount > 0 ? `, ${outcome.skippedCount} skipped` : ''}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">{outcome.details}</p>
            </div>
          )}

          {/* Action Picker */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Choose Bulk Action
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'activate' as BulkActionMode,
                  label: 'Activate',
                  desc: 'Set Inactive → Active',
                  icon: <Power className="w-3.5 h-3.5" />,
                },
                {
                  id: 'deactivate' as BulkActionMode,
                  label: 'Deactivate',
                  desc: 'Set Active → Inactive',
                  icon: <Power className="w-3.5 h-3.5" />,
                },
                {
                  id: 'edit_docs' as BulkActionMode,
                  label: 'Edit Docs / URL',
                  desc: 'Description & URL',
                  icon: <Edit3 className="w-3.5 h-3.5" />,
                },
              ].map((item) => {
                const active = actionMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => resetLocalState(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[#FA8A63] bg-[#FFF3EE] text-[#B85324] ring-1 ring-[#FA8A63]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Bulk deletion and bulk edits to Category, Model Type, Manufacturer / Provider, or technical specifications are disabled to prevent downstream reference corruption.
              </span>
            </div>
          </div>

          {/* Action-specific Configuration */}
          {actionMode === 'edit_docs' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Fields to Update
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateDescription}
                    onChange={(e) => {
                      setUpdateDescription(e.target.checked);
                      setConfirming(false);
                      setFormError('');
                    }}
                    className="rounded border-slate-300 accent-[#FA8A63]"
                  />
                  <span>Update Description</span>
                </label>
                {updateDescription && (
                  <textarea
                    rows={3}
                    value={bulkDescription}
                    onChange={(e) => {
                      setBulkDescription(e.target.value);
                      setConfirming(false);
                    }}
                    placeholder="Enter new description (leave blank to clear description on selected rows)..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  />
                )}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateDocUrl}
                    onChange={(e) => {
                      setUpdateDocUrl(e.target.checked);
                      setConfirming(false);
                      setFormError('');
                    }}
                    className="rounded border-slate-300 accent-[#FA8A63]"
                  />
                  <span>Update Documentation URL</span>
                </label>
                {updateDocUrl && (
                  <input
                    type="url"
                    value={bulkDocUrl}
                    onChange={(e) => {
                      setBulkDocUrl(e.target.value);
                      setConfirming(false);
                      setFormError('');
                    }}
                    placeholder="https://docs.manufacturer.example/guide (leave blank to clear)"
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  />
                )}
              </div>
            </div>
          )}

          {/* Eligibility Preview */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {actionMode === 'edit_docs' ? '3. Preview & Eligibility' : '2. Preview & Eligibility'}
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  {eligibility.eligible.length} eligible
                </span>
                {eligibility.skipped.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                    {eligibility.skipped.length} skipped
                  </span>
                )}
              </div>
            </div>

            {actionMode === 'activate' && (
              <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-[11px] text-sky-800">
                Reactivating sets global <strong>Model Status</strong> to Active. It does <strong>not</strong> automatically enable these models for any client company.
              </div>
            )}

            {actionMode === 'deactivate' && affectedRefsSummary && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Deactivation Impact Preview</span>
                </div>
                {affectedRefsSummary.referencedCount > 0 ? (
                  <p className="leading-relaxed">
                    <strong>{affectedRefsSummary.referencedCount}</strong> of {eligibility.eligible.length}{' '}
                    eligible model(s) currently have known references ({affectedRefsSummary.totalAssets}{' '}
                    registered asset(s), {affectedRefsSummary.totalMappings} mapping(s), enabled in{' '}
                    {affectedRefsSummary.companiesCount} client company(ies)). Existing assets and mappings remain readable; new registrations will be blocked.
                  </p>
                ) : (
                  <p className="leading-relaxed">
                    No active inventory or company-access references detected in local storage for the eligible models (external/unloaded tenant impact unknown). Existing records remain preserved.
                  </p>
                )}
              </div>
            )}

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {selectedRecords.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <Layers className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                  No rows selected.
                </div>
              ) : (
                selectedRecords.map((rec) => {
                  const isEligible = eligibility.eligible.some((e) => e.id === rec.id);
                  const ref = referenceMap[rec.id];
                  return (
                    <div
                      key={rec.id}
                      className={`px-3 py-2 flex items-center justify-between gap-2 text-xs ${
                        isEligible ? 'bg-white' : 'bg-slate-50/80 opacity-65'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {rec.typeName}{' '}
                          {rec.modelReference && (
                            <span className="font-mono text-[11px] text-slate-500">
                              ({rec.modelReference})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {rec.category} · {rec.manufacturer || '—'} · Current: {rec.status}
                          {actionMode === 'deactivate' && ref?.isReferenced
                            ? ` · ${ref.shortReason.replace(' — deactivate instead', '')}`
                            : ''}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border ${
                          isEligible
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {isEligible ? 'Will update' : eligibility.skipReason}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            {confirming && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Confirm Bulk Update ({eligibility.eligible.length} record(s))</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {actionMode === 'activate' &&
                    `Set Model Status to Active for ${eligibility.eligible.length} model definition(s). Unselected and already-Active records will remain untouched.`}
                  {actionMode === 'deactivate' &&
                    `Set Model Status to Inactive for ${eligibility.eligible.length} model definition(s). They will no longer be selectable for new registrations; existing records remain intact.`}
                  {actionMode === 'edit_docs' &&
                    `Apply the specified ${[
                      updateDescription ? 'Description' : '',
                      updateDocUrl ? 'Documentation URL' : '',
                    ]
                      .filter(Boolean)
                      .join(' and ')} to ${eligibility.eligible.length} selected model definition(s). Unselected records remain untouched.`}
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
                    onClick={handleCommit}
                    className={`h-7 px-3.5 rounded-lg text-white text-xs font-semibold cursor-pointer ${
                      actionMode === 'deactivate'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-[#FA8A63] hover:bg-[#e57953]'
                    }`}
                  >
                    Confirm & Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Unselected records are never modified.
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
                disabled={eligibility.eligible.length === 0}
                onClick={handleRequestConfirm}
                className="h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] disabled:opacity-40 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Review & Apply ({eligibility.eligible.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
