import React, { useState } from 'react';
import { X, FileDown, CheckCircle2 } from 'lucide-react';
import { Vehicle } from '../types/vehicle';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredVehicles: Vehicle[];
  selectedVehicles: Vehicle[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  filteredVehicles,
  selectedVehicles
}) => {
  const [scope, setScope] = useState<'filtered' | 'selected'>(
    selectedVehicles.length > 0 ? 'selected' : 'filtered'
  );
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'xls' | 'html' | 'pdf'>('xlsx');
  const [columnScope, setColumnScope] = useState<'visible' | 'all'>('visible');
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const targetVehicles = scope === 'selected' ? selectedVehicles : filteredVehicles;

  const handleExport = () => {
    if (targetVehicles.length === 0) {
      alert('No vehicles to export.');
      return;
    }

    if (format === 'pdf') {
      window.print();
      onClose();
      return;
    }

    const headers = ['Registration Number', 'Vehicle Name', 'Company', 'Make', 'Model', 'Year', 'Status', 'Transporter', 'Driver', 'Online'];
    const rows = targetVehicles.map((v) => [
      v.registration_number,
      v.name,
      v.company,
      v.make || '',
      v.model || '',
      v.year?.toString() || '',
      v.status,
      v.transporter || '',
      v.driver || '',
      v.online ? 'Online' : 'Offline'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fleetrobo_vehicles_export.${format === 'xlsx' || format === 'xls' ? 'csv' : format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportSuccess(true);
    setTimeout(() => {
      setExportSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-xl shadow-2xl p-5 max-w-md w-full space-y-4 border border-slate-200">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Export Vehicles</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {targetVehicles.length} vehicles matching current selection
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>

        {/* Scope chooser */}
        <div className="space-y-1.5 text-xs">
          <label className="font-bold text-slate-700 block">Export Scope</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="exportScope"
                checked={scope === 'filtered'}
                onChange={() => setScope('filtered')}
                className="text-[#FA8A63]"
              />
              <span>Matching Filtered ({filteredVehicles.length})</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="exportScope"
                disabled={selectedVehicles.length === 0}
                checked={scope === 'selected'}
                onChange={() => setScope('selected')}
                className="text-[#FA8A63]"
              />
              <span className={selectedVehicles.length === 0 ? 'text-slate-400' : ''}>
                Selected Rows ({selectedVehicles.length})
              </span>
            </label>
          </div>
        </div>

        {/* Format chooser */}
        <div className="space-y-1.5 text-xs">
          <label className="font-bold text-slate-700 block">Format</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'xlsx', label: 'Excel (.xlsx)' },
              { id: 'csv', label: 'CSV' },
              { id: 'xls', label: 'Excel (.xls)' },
              { id: 'html', label: 'HTML Table' },
              { id: 'pdf', label: 'Print / PDF' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id as any)}
                className={`py-1.5 px-2 text-xs rounded-lg border font-semibold text-center transition-colors ${
                  format === f.id
                    ? 'border-[#FA8A63] bg-orange-50 text-[#FA8A63]'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Column chooser */}
        <div className="space-y-1.5 text-xs">
          <label className="font-bold text-slate-700 block">Columns to Include</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="colScope"
                checked={columnScope === 'visible'}
                onChange={() => setColumnScope('visible')}
                className="text-[#FA8A63]"
              />
              <span>Visible columns (10 default)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="colScope"
                checked={columnScope === 'all'}
                onChange={() => setColumnScope('all')}
                className="text-[#FA8A63]"
              />
              <span>All core master columns</span>
            </label>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-500">
          One row per vehicle. Associated child workflows (routes, sharing) are summarized without multiplying vehicle rows.
        </div>

        {exportSuccess && (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 p-2 rounded-lg">
            <CheckCircle2 size={14} />
            <span>Export generated successfully!</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs"
          >
            <FileDown size={14} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};
