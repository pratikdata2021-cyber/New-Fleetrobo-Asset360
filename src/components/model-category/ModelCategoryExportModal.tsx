import React, { useEffect, useState } from 'react';
import { FileDown, X } from 'lucide-react';
import { ModelCategoryRecord } from '../../types/modelCategoryMaster';
import {
  CANONICAL_CSV_HEADERS,
  exportFullCanonicalCsv,
  exportVisibleColumnsCsv,
  triggerCsvDownload,
} from '../../utils/modelCategoryCsv';

interface ModelCategoryExportModalProps {
  isOpen: boolean;
  allRecords: ModelCategoryRecord[];
  filteredRecords: ModelCategoryRecord[];
  selectedRecords: ModelCategoryRecord[];
  visibleColumns: { key: string; label: string }[];
  onClose: () => void;
  onExportComplete: (message: string) => void;
}

export const ModelCategoryExportModal: React.FC<ModelCategoryExportModalProps> = ({
  isOpen,
  allRecords,
  filteredRecords,
  selectedRecords,
  visibleColumns,
  onClose,
  onExportComplete,
}) => {
  const [scope, setScope] = useState<'selected' | 'filtered' | 'all'>('filtered');
  const [columnMode, setColumnMode] = useState<'full' | 'visible'>('full');

  useEffect(() => {
    if (isOpen) {
      setScope(selectedRecords.length > 0 ? 'selected' : 'filtered');
      setColumnMode('full');
    }
  }, [isOpen, selectedRecords.length]);

  if (!isOpen) return null;

  const targetRecords =
    scope === 'selected'
      ? selectedRecords
      : scope === 'filtered'
      ? filteredRecords
      : allRecords;

  const handleDownload = () => {
    if (targetRecords.length === 0) return;
    const csv =
      columnMode === 'full'
        ? exportFullCanonicalCsv(targetRecords)
        : exportVisibleColumnsCsv(targetRecords, visibleColumns);
    const suffix = `${scope}_${columnMode}_${new Date().toISOString().slice(0, 10)}`;
    triggerCsvDownload(csv, `model_category_master_${suffix}.csv`);
    onExportComplete(
      `Exported ${targetRecords.length} model definition(s) (${
        columnMode === 'full'
          ? `${CANONICAL_CSV_HEADERS.length} canonical fields`
          : `${visibleColumns.length} visible columns`
      }) to CSV`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-[460px] max-w-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Export Model Categories (CSV)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Download quote-safe UTF-8 CSV preserving all stored values.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800">1. Record Scope</div>
            <div className="space-y-1.5">
              {[
                {
                  id: 'selected' as const,
                  label: `Selected rows (${selectedRecords.length})`,
                  desc: 'Export only currently checked rows in the table.',
                  disabled: selectedRecords.length === 0,
                },
                {
                  id: 'filtered' as const,
                  label: `Filtered rows (${filteredRecords.length})`,
                  desc: 'Export rows matching active search, category, manufacturer, and status filters.',
                  disabled: filteredRecords.length === 0,
                },
                {
                  id: 'all' as const,
                  label: `All catalog rows (${allRecords.length})`,
                  desc: 'Export every model definition currently stored in Model Category Master.',
                  disabled: allRecords.length === 0,
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors ${
                    opt.disabled
                      ? 'opacity-45 cursor-not-allowed border-slate-200 bg-slate-50'
                      : scope === opt.id
                      ? 'border-[#FA8A63] bg-[#FFF3EE]/60 cursor-pointer'
                      : 'border-slate-200 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="export-scope"
                    disabled={opt.disabled}
                    checked={scope === opt.id}
                    onChange={() => setScope(opt.id)}
                    className="mt-0.5 accent-[#FA8A63]"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900">{opt.label}</div>
                    <div className="text-[11px] text-slate-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800">2. Column Set</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setColumnMode('full')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  columnMode === 'full'
                    ? 'border-[#FA8A63] bg-[#FFF3EE] text-[#B85324]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold">
                  Full fields ({CANONICAL_CSV_HEADERS.length} cols)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  All canonical specs; re-import compatible.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setColumnMode('visible')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  columnMode === 'visible'
                    ? 'border-[#FA8A63] bg-[#FFF3EE] text-[#B85324]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold">
                  Visible columns ({visibleColumns.length} cols)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Matches current table column configuration.
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={targetRecords.length === 0}
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] disabled:opacity-40 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export CSV ({targetRecords.length})
          </button>
        </div>
      </div>
    </div>
  );
};
