import React from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Bookmark,
  Trash2,
  Layers
} from 'lucide-react';
import {
  ALL_MODAL_CONNECTION_COLUMNS,
  MODAL_CONNECTION_DEFAULT_COLUMNS,
  SavedModalView
} from '../../types/modalMaster';
import { ModelCategoryRecord } from '../../types/modelCategoryMaster';
import {
  DirectBulkUploadView,
  formatUploadFileSize,
  useDirectUploadState
} from '../common/DirectBulkUploadView';

export const MappingInfoTooltip: React.FC<{ text: string; align?: 'left' | 'right' | 'center' }> = ({
  text,
  align = 'center'
}) => (
  <span className="relative group inline-flex items-center ml-1 align-middle" onClick={(e) => e.stopPropagation()}>
    <button
      type="button"
      tabIndex={0}
      aria-label={text}
      className="w-[15px] h-[15px] rounded-full border border-[#d6dfe8] bg-white text-[#5c6b7a] hover:text-[#17212b] hover:border-[#94a3b8] inline-flex items-center justify-center text-[10px] font-semibold cursor-help focus:outline-none"
    >
      i
    </button>
    <span
      role="tooltip"
      className={`pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute top-full mt-1.5 w-60 p-2 rounded-lg bg-[#17212b] text-white text-[11px] font-normal normal-case tracking-normal leading-relaxed shadow-xl z-[95] border border-slate-700 ${
        align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2'
      }`}
    >
      {text}
    </span>
  </span>
);

interface FiltersDrawerProps {
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  filterDeviceModelId: string;
  setFilterDeviceModelId: (v: string) => void;
  filterBindingMode: string;
  setFilterBindingMode: (v: string) => void;
  filterBindingState: string;
  setFilterBindingState: (v: string) => void;
  filterResourceAllocated: string;
  setFilterResourceAllocated: (v: string) => void;
  filterUpdatedFrom: string;
  setFilterUpdatedFrom: (v: string) => void;
  filterUpdatedTo: string;
  setFilterUpdatedTo: (v: string) => void;
  enabledDeviceModels: ModelCategoryRecord[];
  onClearAll: () => void;
  onClose: () => void;
}

export const ModalConnectionFiltersDrawer: React.FC<FiltersDrawerProps> = ({
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  filterDeviceModelId,
  setFilterDeviceModelId,
  filterBindingMode,
  setFilterBindingMode,
  filterBindingState,
  setFilterBindingState,
  filterResourceAllocated,
  setFilterResourceAllocated,
  filterUpdatedFrom,
  setFilterUpdatedFrom,
  filterUpdatedTo,
  setFilterUpdatedTo,
  enabledDeviceModels,
  onClearAll,
  onClose
}) => (
  <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/30">
    <div className="w-full max-w-[400px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-slate-900">Filter Connections</h3>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-[12px]">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-slate-800">Status</label>
            <MappingInfoTooltip text="Filter by overall connection lifecycle." align="right" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white"
          >
            {['All', 'Draft', 'Scheduled', 'Active', 'Inactive', 'Needs Attention'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-slate-800">Hardware Category Present</label>
            <MappingInfoTooltip text="Find connections that include at least one unit in the selected category." align="right" />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white"
          >
            {['All', 'Device', 'Sensor', 'SIM'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-slate-800">Device Model Type</label>
            <MappingInfoTooltip text="Filter connections containing a specific registered Device model enabled for this client." align="right" />
          </div>
          <select
            value={filterDeviceModelId}
            onChange={(e) => setFilterDeviceModelId(e.target.value)}
            className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white"
          >
            <option value="All">All Enabled Device Models</option>
            {enabledDeviceModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.typeName} {m.manufacturer ? `· ${m.manufacturer}` : ''} {m.modelReference ? `(${m.modelReference})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-slate-800">Binding Mode Present</label>
            <MappingInfoTooltip text="Find connections containing at least one binding with this period type." align="right" />
          </div>
          <select
            value={filterBindingMode}
            onChange={(e) => setFilterBindingMode(e.target.value)}
            className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white"
          >
            {['All', 'Permanent', 'Temporal', 'None'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-slate-800">Binding State</label>
            <MappingInfoTooltip text="Filter by state of any contained pairwise binding." align="right" />
          </div>
          <select
            value={filterBindingState}
            onChange={(e) => setFilterBindingState(e.target.value)}
            className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white"
          >
            {['All', 'Active', 'Scheduled', 'Ended', 'Conflict', 'None'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-slate-800">Resource Allocated</label>
            <MappingInfoTooltip text="Find connections with associated resource records." align="right" />
          </div>
          <select
            value={filterResourceAllocated}
            onChange={(e) => setFilterResourceAllocated(e.target.value)}
            className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white"
          >
            {['All', 'Vehicle', 'Driver', 'Unallocated'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-slate-800">Updated On Range</label>
            <MappingInfoTooltip text="Filter by last change timestamp in the selected timezone." align="right" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filterUpdatedFrom}
              onChange={(e) => setFilterUpdatedFrom(e.target.value)}
              className="h-9 px-2 rounded-lg border border-slate-200 text-[12px]"
            />
            <input
              type="date"
              value={filterUpdatedTo}
              onChange={(e) => setFilterUpdatedTo(e.target.value)}
              className="h-9 px-2 rounded-lg border border-slate-200 text-[12px]"
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
        <button
          type="button"
          onClick={onClearAll}
          className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          Clear Filters
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-8 px-4 rounded-lg bg-[#F26522] text-white text-[12px] font-semibold hover:bg-[#d95417] cursor-pointer"
        >
          Apply Filters
        </button>
      </div>
    </div>
  </div>
);

interface ColumnsDrawerProps {
  hiddenCols: string[];
  setHiddenCols: React.Dispatch<React.SetStateAction<string[]>>;
  colSearch: string;
  setColSearch: (v: string) => void;
  onRestoreDefaults: () => void;
  onClose: () => void;
}

export const ModalConnectionColumnsDrawer: React.FC<ColumnsDrawerProps> = ({
  hiddenCols,
  setHiddenCols,
  colSearch,
  setColSearch,
  onRestoreDefaults,
  onClose
}) => {
  const lockedKeys = new Set(['id']);
  const filteredCols = ALL_MODAL_CONNECTION_COLUMNS.filter(
    (c) => !colSearch.trim() || c.label.toLowerCase().includes(colSearch.trim().toLowerCase())
  );

  const toggleCol = (key: string) => {
    if (lockedKeys.has(key)) return;
    setHiddenCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/30">
      <div className="w-full max-w-[380px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-slate-900">Configure Columns</h3>
            <p className="text-[11px] text-slate-500">CONNECTION ID & ACTIONS remain pinned.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-3 pb-2 border-b border-slate-100">
          <input
            type="text"
            value={colSearch}
            onChange={(e) => setColSearch(e.target.value)}
            placeholder="Search columns..."
            className="w-full h-8 px-3 rounded-lg border border-slate-200 text-[12px]"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {filteredCols.map((col) => {
            const isLocked = lockedKeys.has(col.key);
            const checked = !hiddenCols.includes(col.key);
            return (
              <label
                key={col.key}
                className={`flex items-center justify-between p-2 rounded-lg border text-[12px] ${
                  isLocked
                    ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isLocked}
                    onChange={() => toggleCol(col.key)}
                    className="accent-[#F26522]"
                  />
                  <span className="font-semibold text-slate-800 truncate">{col.label}</span>
                  {col.optional && (
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 text-[9px] font-semibold">
                      Optional
                    </span>
                  )}
                </div>
                {col.tooltip && <MappingInfoTooltip text={col.tooltip} align="right" />}
              </label>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={onRestoreDefaults}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Restore Defaults ({MODAL_CONNECTION_DEFAULT_COLUMNS.length})
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-[#F26522] text-white text-[12px] font-semibold hover:bg-[#d95417] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

interface SavedViewsDrawerProps {
  views: SavedModalView[];
  newViewName: string;
  setNewViewName: (v: string) => void;
  onSaveView: () => void;
  onApplyView: (v: SavedModalView) => void;
  onDeleteView: (id: string) => void;
  onClose: () => void;
}

export const ModalConnectionSavedViewsDrawer: React.FC<SavedViewsDrawerProps> = ({
  views,
  newViewName,
  setNewViewName,
  onSaveView,
  onApplyView,
  onDeleteView,
  onClose
}) => (
  <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/30">
    <div className="w-full max-w-[380px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-[#F26522]" />
          <h3 className="text-[14px] font-bold text-slate-900">Saved Views</h3>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 border-b border-slate-100 space-y-2">
        <label className="block text-[11px] font-bold text-slate-600 uppercase">Save Current Table State</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            placeholder="e.g. Mundra Active Kits"
            className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 text-[12px]"
          />
          <button
            type="button"
            onClick={onSaveView}
            disabled={!newViewName.trim()}
            className="h-8 px-3 rounded-lg bg-[#F26522] disabled:bg-slate-200 text-white text-[12px] font-semibold cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        {views.length === 0 ? (
          <div className="text-center text-[12px] text-slate-400 py-8">No saved views yet.</div>
        ) : (
          views.map((v) => (
            <div key={v.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-slate-900 truncate">{v.name}</div>
                <div className="text-[10px] text-slate-500">
                  Sort: {v.sortKey} ({v.sortDir}) · {v.density || 'comfortable'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onApplyView(v)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#F26522] text-[11px] font-semibold text-slate-800 cursor-pointer"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteView(v.id)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);

interface ExportModalProps {
  selectedCount: number;
  filteredCount: number;
  exportScope: 'filtered' | 'selected';
  setExportScope: (v: 'filtered' | 'selected') => void;
  exportFormat: 'visible-csv' | 'relational-bundle';
  setExportFormat: (v: 'visible-csv' | 'relational-bundle') => void;
  onExport: () => void;
  onClose: () => void;
}

export const ModalConnectionExportModal: React.FC<ExportModalProps> = ({
  selectedCount,
  filteredCount,
  exportScope,
  setExportScope,
  exportFormat,
  setExportFormat,
  onExport,
  onClose
}) => (
  <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/40 p-4">
    <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-[#F26522]" />
          <h3 className="text-[14px] font-bold text-slate-900">Export Assets Connections</h3>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 text-[12px]">
        <div>
          <label className="block font-bold text-slate-700 mb-1.5">Export Scope</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setExportScope('filtered')}
              className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                exportScope === 'filtered' ? 'border-[#F26522] bg-[#FFF3EE]' : 'border-slate-200'
              }`}
            >
              <div className="font-bold text-slate-900">Filtered Dataset</div>
              <div className="text-[11px] text-slate-500">{filteredCount} connection(s)</div>
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => setExportScope('selected')}
              className={`p-2.5 rounded-xl border text-left ${
                selectedCount === 0
                  ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                  : exportScope === 'selected'
                  ? 'border-[#F26522] bg-[#FFF3EE] cursor-pointer'
                  : 'border-slate-200 cursor-pointer'
              }`}
            >
              <div className="font-bold">Selected Rows</div>
              <div className="text-[11px] text-slate-500">{selectedCount} selected</div>
            </button>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1.5">Dataset Structure</label>
          <div className="space-y-2">
            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer ${
                exportFormat === 'visible-csv' ? 'border-[#F26522] bg-[#FFF3EE]/50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                checked={exportFormat === 'visible-csv'}
                onChange={() => setExportFormat('visible-csv')}
                className="mt-0.5 accent-[#F26522]"
              />
              <div>
                <div className="font-bold text-slate-900">Visible Table Columns (CSV)</div>
                <div className="text-[11px] text-slate-500">
                  Exports currently visible columns with explicit timezone and UTF-8 text-safe identifiers.
                </div>
              </div>
            </label>
            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer ${
                exportFormat === 'relational-bundle' ? 'border-[#F26522] bg-[#FFF3EE]/50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                checked={exportFormat === 'relational-bundle'}
                onChange={() => setExportFormat('relational-bundle')}
                className="mt-0.5 accent-[#F26522]"
              />
              <div>
                <div className="font-bold text-slate-900">Full Relational Multi-Dataset Export (4 CSVs)</div>
                <div className="text-[11px] text-slate-500">
                  Downloads separate Connections, Hardware Membership, Pairwise Bindings, and Resource Allocations CSV files without flattening.
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
        <button type="button" onClick={onClose} className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer">
          Cancel
        </button>
        <button type="button" onClick={onExport} className="h-8 px-4 rounded-lg bg-[#F26522] text-white text-[12px] font-semibold hover:bg-[#d95417] cursor-pointer">
          Download Export
        </button>
      </div>
    </div>
  </div>
);

interface ImportDrawerProps {
  onProcessUpload: (
    format: 'csv' | 'json',
    rawContent: string
  ) => { uploaded: number; skipped: number; error?: string };
  onClose: () => void;
}

const SAMPLE_CONNECTION_CSV =
  'name,client,hardwareIdentifier,status,site\n' +
  'Mundra – Cold Gate Kit,Adani Mundra,861753060499955,Draft,Mundra CT2';

export const ModalConnectionImportDrawer: React.FC<ImportDrawerProps> = ({
  onProcessUpload,
  onClose
}) => {
  const upload = useDirectUploadState(true);

  const runDirectUpload = (
    fmt: 'csv' | 'json',
    rawText: string,
    fileName: string,
    fileSize?: number
  ) => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      upload.fail('Uploaded file is empty.');
      return;
    }

    upload.startUploading(fileName, formatUploadFileSize(fileSize), () => {
      const result = onProcessUpload(fmt, trimmed);
      if (result.error || result.uploaded === 0) {
        return {
          headline: result.error || 'No valid connections imported',
          description:
            result.error ||
            `0 valid connections found in ${fileName}${
              result.skipped > 0 ? ` (${result.skipped} skipped due to missing or unknown hardware)` : ''
            }.`,
          stats: [
            { label: 'Uploaded', value: 0, tone: 'slate' },
            { label: 'Skipped', value: result.skipped, tone: 'amber' }
          ]
        };
      }

      return {
        headline: 'Connections uploaded successfully',
        description: `${result.uploaded} connection${result.uploaded === 1 ? '' : 's'} created from ${fileName}.${
          result.skipped > 0 ? ` ${result.skipped} invalid or unmatched row${result.skipped === 1 ? '' : 's'} skipped.` : ''
        }`,
        stats: [
          { label: 'Uploaded', value: result.uploaded, tone: 'emerald' },
          { label: 'Skipped', value: result.skipped, tone: result.skipped > 0 ? 'amber' : 'slate' }
        ]
      };
    });
  };

  const handleFileSelected = (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.json')) {
      upload.fail('Please upload a .csv or .json file.');
      return;
    }
    const fmt: 'csv' | 'json' = lower.endsWith('.json') ? 'json' : 'csv';
    const reader = new FileReader();
    reader.onload = (ev) => {
      runDirectUpload(fmt, String(ev.target?.result || ''), file.name, file.size);
    };
    reader.onerror = () => upload.fail('Unable to read the selected file.');
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CONNECTION_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fleetrobo_connections_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/35">
      <div className="w-full max-w-[540px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#F26522]" />
              <h3 className="text-[14px] font-bold text-slate-900">Import Connections</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Upload a CSV or JSON file to import connections directly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <DirectBulkUploadView
            status={upload.status}
            progress={upload.progress}
            fileLabel={upload.fileLabel}
            fileMeta={upload.fileMeta}
            errorMessage={upload.errorMessage}
            doneSummary={upload.doneSummary}
            accept=".csv,.json,text/csv,application/json"
            dropTitle="Choose CSV / JSON or drag & drop"
            dropSubtitle="Columns: name, client, hardwareIdentifier, status, site"
            chooseButtonLabel="Choose file"
            downloadLabel="Download template"
            sampleLabel="Use sample CSV"
            templateTitle="Need a starting format?"
            templateSubtitle="Download CSV template or upload a sample connection."
            doneButtonLabel="Done"
            onFileSelected={handleFileSelected}
            onDownloadTemplate={handleDownloadTemplate}
            onUseSample={() =>
              runDirectUpload('csv', SAMPLE_CONNECTION_CSV, 'sample_connections.csv', SAMPLE_CONNECTION_CSV.length)
            }
            onReset={upload.reset}
            onDone={onClose}
          />
        </div>
      </div>
    </div>
  );
};

interface BulkDrawerProps {
  selectedCount: number;
  activeSelectedCount: number;
  activeBindingsInSelection: number;
  onExportSelected: () => void;
  onDeactivateSelected: () => void;
  onEndSelectedBindings: () => void;
  onClose: () => void;
}

export const ModalConnectionBulkDrawer: React.FC<BulkDrawerProps> = ({
  selectedCount,
  activeSelectedCount,
  activeBindingsInSelection,
  onExportSelected,
  onDeactivateSelected,
  onEndSelectedBindings,
  onClose
}) => (
  <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/40 p-4">
    <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#F26522]" />
          <h3 className="text-[14px] font-bold text-slate-900">Bulk Actions ({selectedCount} selected)</h3>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-3 text-[12px]">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-slate-100 text-slate-700">
            {selectedCount} Connection(s) Selected
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-200 bg-amber-50 text-amber-800">
            {activeSelectedCount} Active / Scheduled
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-rose-200 bg-rose-50 text-rose-700">
            {activeBindingsInSelection} Open Binding(s)
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-3 h-3" /> Audit History Preserved
          </span>
        </div>

        <button
          type="button"
          onClick={onExportSelected}
          className="w-full p-3 rounded-xl border border-slate-200 hover:border-[#F26522] bg-white text-left cursor-pointer"
        >
          <div className="font-bold text-slate-900">Export Selected Connections</div>
          <div className="text-[11px] text-slate-500">Open export options pre-scoped to your {selectedCount} selected rows.</div>
        </button>

        {activeBindingsInSelection > 0 && (
          <button
            type="button"
            onClick={onEndSelectedBindings}
            className="w-full p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-left cursor-pointer"
          >
            <div className="font-bold text-amber-900">End {activeBindingsInSelection} Active/Scheduled Binding(s)</div>
            <div className="text-[11px] text-amber-700">
              Sets exact end timestamp to now and preserves all historical binding records.
            </div>
          </button>
        )}

        {activeSelectedCount > 0 && (
          <button
            type="button"
            onClick={onDeactivateSelected}
            className="w-full p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-left cursor-pointer"
          >
            <div className="font-bold text-rose-900">Deactivate {activeSelectedCount} Connection(s)</div>
            <div className="text-[11px] text-rose-700">
              Marks selected connections Inactive and safely ends their active pairwise bindings with audit logging.
            </div>
          </button>
        )}
      </div>

      <div className="px-5 py-3 border-t border-slate-200 flex justify-end bg-slate-50">
        <button type="button" onClick={onClose} className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer">
          Close
        </button>
      </div>
    </div>
  </div>
);
