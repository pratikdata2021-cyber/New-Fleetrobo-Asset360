import React, { useState, useEffect } from 'react';
import { X, FileDown, CheckCircle2 } from 'lucide-react';
import { ClientCompany } from '../../types/companyModelEnablement';
import { getRecordIdentifierTypes } from '../../types/modelCategoryMaster';
import { ModelRowComputed } from './ModelAccessFilterDrawer';

interface ModelAccessExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: ClientCompany;
  filteredRows: ModelRowComputed[];
  selectedRows: ModelRowComputed[];
  defaultScope?: 'filtered' | 'selected';
  onExportSuccess?: (count: number, scope: 'filtered' | 'selected') => void;
}

const escapeCsv = (val: unknown): string => {
  const s = val === null || val === undefined ? '' : String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const ModelAccessExportModal: React.FC<ModelAccessExportModalProps> = ({
  isOpen,
  onClose,
  company,
  filteredRows,
  selectedRows,
  defaultScope = 'filtered',
  onExportSuccess,
}) => {
  const [scope, setScope] = useState<'filtered' | 'selected'>(defaultScope);

  useEffect(() => {
    if (isOpen) {
      setScope(defaultScope === 'selected' && selectedRows.length > 0 ? 'selected' : 'filtered');
    }
  }, [isOpen, defaultScope, selectedRows.length]);

  if (!isOpen) return null;

  const targetRows = scope === 'selected' ? selectedRows : filteredRows;

  const handleDownloadCsv = () => {
    if (targetRows.length === 0) return;

    const headers = [
      'Company ID',
      'Company Name',
      'Company Status',
      'Model ID',
      'Category',
      'Model Type',
      'Manufacturer / Provider',
      'Model Name / Number',
      'Identifier Types',
      'Global Model Status',
      'Saved Company Access',
      'Effective Company Access',
      'Pending Change',
      'Currently Available',
      'In-Use Count',
      'In-Use Provenance',
      'Model Last Updated',
    ];

    const lines = [headers.map(escapeCsv).join(',')];

    targetRows.forEach((row) => {
      const m = row.model;
      const provenanceLabel =
        row.inUseDetail.provenance === 'live'
          ? 'Live Inventory/Mapping'
          : row.inUseDetail.provenance === 'baseline'
          ? 'Verified Demo Baseline'
          : 'None';

      lines.push(
        [
          company.id,
          company.name,
          company.status,
          m.id,
          m.category,
          m.typeName,
          m.manufacturer || '',
          m.modelReference || '',
          getRecordIdentifierTypes(m).join('; '),
          m.status,
          row.isSavedEnabled ? 'Enabled' : 'Disabled',
          row.isEffectiveEnabled ? 'Enabled' : 'Disabled',
          row.isPending ? 'Yes' : 'No',
          row.isCurrentlyAvailable ? 'Yes' : 'No',
          row.inUseDetail.count,
          provenanceLabel,
          m.updatedAt || '',
        ]
          .map(escapeCsv)
          .join(',')
      );
    });

    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeComp = company.id.replace(/[^a-z0-9-_]/gi, '-');
    a.href = url;
    a.download = `company-model-access-${safeComp}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onExportSuccess?.(targetRows.length, scope);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileDown className="w-4 h-4 text-[#FA8A63]" />
            <h3 className="text-sm font-bold text-slate-900">Export Model Access CSV</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Export model permissions for <strong>{company.name}</strong> ({company.id}). Includes global status, saved & pending company access, current availability, and in-use counts. No sensitive contact details are included.
          </p>

          <div className="space-y-2">
            <label
              onClick={() => setScope('filtered')}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                scope === 'filtered'
                  ? 'border-[#FA8A63] bg-orange-50/40'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="font-bold text-slate-900">Filtered View</div>
                <div className="text-[11px] text-slate-500">All models matching current search & drawer filters</div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 font-bold text-slate-800">
                {filteredRows.length} rows
              </span>
            </label>

            <label
              onClick={() => {
                if (selectedRows.length > 0) setScope('selected');
              }}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                selectedRows.length === 0
                  ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                  : scope === 'selected'
                  ? 'border-[#FA8A63] bg-orange-50/40 cursor-pointer'
                  : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <div>
                <div className="font-bold text-slate-900">Selected Rows Only</div>
                <div className="text-[11px] text-slate-500">Explicitly checked models in current view</div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 font-bold text-slate-800">
                {selectedRows.length} rows
              </span>
            </label>
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={targetRows.length === 0}
            onClick={handleDownloadCsv}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold shadow-xs ${
              targetRows.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#FA8A63] hover:bg-[#e57953] text-white cursor-pointer'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Export CSV ({targetRows.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
