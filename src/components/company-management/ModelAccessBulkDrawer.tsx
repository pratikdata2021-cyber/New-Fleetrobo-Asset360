import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  FileDown,
  Power,
  Ban,
  Trash,
} from 'lucide-react';
import { ModelCategoryRecord } from '../../types/modelCategoryMaster';
import { ClientCompany, InUseDetail, isCompanyEligibleForNewRegistration } from '../../types/companyModelEnablement';
import { ModelRowComputed } from './ModelAccessFilterDrawer';

export type ModelAccessBulkAction = 'enable' | 'disable';

interface BulkPreviewItem {
  row: ModelRowComputed;
  reason?: string;
}

interface ModelAccessBulkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  company: ClientCompany;
  selectedRows: ModelRowComputed[];
  onQueueEnable: (eligibleModelIds: string[]) => void;
  onQueueDisable: (eligibleModelIds: string[]) => void;
  onOpenExportSelected: () => void;
  onClearSelection: () => void;
}

export const ModelAccessBulkDrawer: React.FC<ModelAccessBulkDrawerProps> = ({
  isOpen,
  onClose,
  company,
  selectedRows,
  onQueueEnable,
  onQueueDisable,
  onOpenExportSelected,
  onClearSelection,
}) => {
  const [activeAction, setActiveAction] = useState<ModelAccessBulkAction | null>(null);
  const [ackInUseImpact, setAckInUseImpact] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setActiveAction(null);
      setAckInUseImpact(false);
    }
  }, [isOpen]);

  const companyEligible = isCompanyEligibleForNewRegistration(company);

  const preview = useMemo(() => {
    const eligible: BulkPreviewItem[] = [];
    const skipped: BulkPreviewItem[] = [];

    if (!activeAction) return { eligible, skipped, inUseAffected: [] as BulkPreviewItem[] };

    selectedRows.forEach((row) => {
      if (activeAction === 'enable') {
        if (row.model.status === 'Inactive') {
          skipped.push({
            row,
            reason: 'Globally Inactive in Model Category Master — activate globally first',
          });
        } else if (row.isEffectiveEnabled) {
          skipped.push({
            row,
            reason: row.isPending ? 'Already queued for Enable' : 'Already Enabled for this company',
          });
        } else {
          eligible.push({ row });
        }
      } else {
        if (!row.isEffectiveEnabled) {
          skipped.push({
            row,
            reason: row.isPending ? 'Already queued for Disable' : 'Already Disabled for this company',
          });
        } else {
          eligible.push({ row });
        }
      }
    });

    const inUseAffected =
      activeAction === 'disable'
        ? eligible.filter((e) => (e.row.inUseDetail.count || 0) > 0)
        : [];

    return { eligible, skipped, inUseAffected };
  }, [activeAction, selectedRows]);

  if (!isOpen) return null;

  const totalInUseUnits = preview.inUseAffected.reduce(
    (sum, item) => sum + (item.row.inUseDetail.count || 0),
    0
  );

  const handleConfirm = () => {
    if (!activeAction || preview.eligible.length === 0) return;
    if (activeAction === 'disable' && preview.inUseAffected.length > 0 && !ackInUseImpact) {
      return;
    }
    const ids = preview.eligible.map((e) => e.row.model.id);
    if (activeAction === 'enable') {
      onQueueEnable(ids);
    } else {
      onQueueDisable(ids);
    }
    setActiveAction(null);
    setAckInUseImpact(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] overflow-hidden flex justify-end">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      <div className="relative w-[640px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            {activeAction && (
              <button
                type="button"
                onClick={() => {
                  setActiveAction(null);
                  setAckInUseImpact(false);
                }}
                className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                title="Back to bulk operations"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activeAction === 'enable'
                  ? 'Review Bulk Enablement'
                  : activeAction === 'disable'
                  ? 'Review Bulk Disable & In-Use Impact'
                  : 'Bulk Operations — Model Access'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedRows.length} visible model(s) selected for{' '}
                <span className="font-semibold text-slate-700">{company.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bulk drawer"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!activeAction ? (
            <>
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose a company-scoped action below. All operations preview eligible versus skipped models before queuing pending changes. Remember to click{' '}
                <strong>Save Changes</strong> on the Model Access page to commit queued edits.
              </p>

              {!companyEligible && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Company status restriction ({company.status}):</span>{' '}
                    {company.status === 'Inactive'
                      ? 'Inactive companies cannot select granted models for new hardware registrations until reactivated.'
                      : 'Onboarding companies require explicit onboarding registration approval before granted models become selectable for new registrations.'}
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setActiveAction('enable')}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-[#FA8A63] hover:bg-orange-50/20 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <Power className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-[#FA8A63]">
                        Enable Selected
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Grant selected globally Active models to {company.name}. Globally Inactive or already-enabled models are automatically skipped.
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 group-hover:text-[#FA8A63] shrink-0 ml-3">
                    Preview →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAction('disable')}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                      <Ban className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700">
                        Disable Selected
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Revoke model access for future registrations. Shows consolidated in-use counts and safeguards before queuing changes.
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 group-hover:text-amber-700 shrink-0 ml-3">
                    Preview →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenExportSelected();
                  }}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                      <FileDown className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Export Selected ({selectedRows.length})
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Download CSV containing company scope, model IDs, global status, access flags, availability, and in-use counts.
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 shrink-0 ml-3">
                    Export →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClearSelection();
                    onClose();
                  }}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50/30 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-rose-600 shrink-0">
                      <Trash className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-rose-700">
                        Clear Selection
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Deselect all {selectedRows.length} selected rows without modifying company access.
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-5">
              {/* Summary Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Selected</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{selectedRows.length}</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Eligible</div>
                  <div className="text-lg font-bold text-emerald-800 mt-0.5">
                    {preview.eligible.length}
                  </div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="text-[10px] uppercase font-bold text-amber-700">Skipped</div>
                  <div className="text-lg font-bold text-amber-800 mt-0.5">
                    {preview.skipped.length}
                  </div>
                </div>
              </div>

              {/* Consolidated In-Use Warning Banner for Bulk Disable */}
              {activeAction === 'disable' && preview.inUseAffected.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-900">
                        In-Use Safeguard: {preview.inUseAffected.length} selected model(s) are currently in active use ({totalInUseUnits} assigned units/mappings)
                      </div>
                      <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                        Disabling these models prevents <strong>new</strong> Device, Sensor, SIM registrations or Asset Mappings for <strong>{company.name}</strong>.{' '}
                        <strong>Historical preservation:</strong> all {totalInUseUnits} existing hardware records, bindings, trips, and telemetry data remain intact and visible in details/history.
                      </p>
                    </div>
                  </div>

                  <div className="max-h-36 overflow-y-auto bg-white rounded-lg border border-amber-200 divide-y divide-amber-100">
                    {preview.inUseAffected.map(({ row }) => (
                      <div key={row.model.id} className="px-3 py-2 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900">{row.model.typeName}</span>
                          {row.model.modelReference && (
                            <span className="ml-1.5 font-mono text-[11px] text-slate-500">
                              ({row.model.modelReference})
                            </span>
                          )}
                          <span className="ml-2 text-[10px] text-slate-400">{row.model.id}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-bold">
                          {row.inUseDetail.count} in use ({row.inUseDetail.provenance === 'live' ? 'Live' : 'Demo Baseline'})
                        </span>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={ackInUseImpact}
                      onChange={(e) => setAckInUseImpact(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>
                      I understand existing inventory/mappings are preserved and want to queue disabling these in-use models.
                    </span>
                  </label>
                </div>
              )}

              {/* Eligible List */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>
                    Eligible to queue for {activeAction === 'enable' ? 'Enable' : 'Disable'} ({preview.eligible.length})
                  </span>
                </div>
                {preview.eligible.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No selected models are eligible for this operation.</p>
                ) : (
                  <div className="max-h-44 overflow-y-auto border border-emerald-100 rounded-lg divide-y divide-emerald-50 bg-emerald-50/20">
                    {preview.eligible.map(({ row }) => (
                      <div key={row.model.id} className="px-3 py-2 text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800">{row.model.typeName}</span>
                          {row.model.modelReference && (
                            <span className="ml-1.5 text-slate-500">({row.model.modelReference})</span>
                          )}
                          <div className="text-[10px] text-slate-400">
                            {row.model.category} · {row.model.manufacturer} · {row.model.id}
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700 shrink-0">
                          {activeAction === 'enable' ? 'Disabled → Enabled' : 'Enabled → Disabled'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Skipped List */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <AlertCircle size={14} className="text-amber-600" />
                  <span>Skipped models & reasons ({preview.skipped.length})</span>
                </div>
                {preview.skipped.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No models skipped.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-amber-100 rounded-lg divide-y divide-amber-50 bg-amber-50/20">
                    {preview.skipped.map(({ row, reason }) => (
                      <div key={row.model.id} className="px-3 py-2 text-xs flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 truncate">
                          {row.model.typeName} {row.model.modelReference ? `(${row.model.modelReference})` : ''}
                        </span>
                        <span className="text-amber-700 font-semibold text-[11px] shrink-0">
                          {reason}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-800">
                Confirming queues pending access changes for <strong>{company.name}</strong> ({company.id}). Click <strong>Save Changes</strong> in the Model Access header to commit and write audit records.
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          {activeAction ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveAction(null);
                  setAckInUseImpact(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={
                  preview.eligible.length === 0 ||
                  (activeAction === 'disable' && preview.inUseAffected.length > 0 && !ackInUseImpact)
                }
                onClick={handleConfirm}
                className={`px-5 py-2 text-xs font-bold rounded-lg shadow-xs transition-colors ${
                  preview.eligible.length === 0 ||
                  (activeAction === 'disable' && preview.inUseAffected.length > 0 && !ackInUseImpact)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : activeAction === 'disable'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                    : 'bg-[#FA8A63] hover:bg-[#e57953] text-white cursor-pointer'
                }`}
              >
                {activeAction === 'enable'
                  ? `Confirm & Queue Enable (${preview.eligible.length})`
                  : `Confirm & Queue Disable (${preview.eligible.length})`}
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
