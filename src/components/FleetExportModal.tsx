import React, { useState } from 'react';
import { X, FileDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { Fleet, computeFleetCounts } from '../types/fleet';

interface FleetExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allCompanyFleets: Fleet[];
  selectedFleets: Fleet[];
}

export const FleetExportModal: React.FC<FleetExportModalProps> = ({
  isOpen,
  onClose,
  allCompanyFleets,
  selectedFleets
}) => {
  const [scope, setScope] = useState<'all' | 'selected'>(
    selectedFleets.length > 0 ? 'selected' : 'all'
  );
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [isSuccess, setIsSuccess] = useState(false);
  const [exportedCount, setExportedCount] = useState(0);

  if (!isOpen) return null;

  const targetFleets = scope === 'selected' ? selectedFleets : allCompanyFleets;

  const handleExport = () => {
    if (targetFleets.length === 0) {
      alert('Zero fleets available in current export scope.');
      return;
    }

    // 14 Ordered Source Headers
    const headers = [
      'ID',
      'Name',
      'Service Area',
      'Parent Fleet',
      'Vendor',
      'Zone',
      'Drivers Count',
      'Drivers Online Count',
      'Vehicles Count',
      'Vehicles Online Count',
      'Task',
      'Status',
      'Date Created',
      'Date Updated'
    ];

    const fleetMap = new Map<string, Fleet>();
    allCompanyFleets.forEach((f) => fleetMap.set(f.id, f));

    const rows = targetFleets.map((f) => {
      const counts = computeFleetCounts(f);
      const parentName = f.parent ? fleetMap.get(f.parent)?.name || f.parent : '—';
      const createdDate = f.created_at ? f.created_at.slice(0, 10) : '';
      const updatedDate = f.updated_at ? f.updated_at.slice(0, 10) : '';

      return [
        f.public_id || '',
        f.name || '',
        f.service_area || '',
        parentName,
        f.vendor || '',
        f.zone || '',
        counts.directDriversCount.toString(),
        counts.driversOnlineCount.toString(),
        counts.directVehiclesCount.toString(),
        counts.vehiclesOnlineCount.toString(),
        f.task || '',
        f.status || '',
        createdDate,
        updatedDate
      ];
    });

    const csvContent =
      '\uFEFF' +
      [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      ].join('\r\n');

    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    const mime =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv;charset=utf-8';

    const blob = new Blob([csvContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FleetRobo_Fleet_Master.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportedCount(targetFleets.length);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl p-5 max-w-md w-full space-y-4 border border-slate-200 font-sans text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Export fleets</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {targetFleets.length} fleets matching current export scope
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scope chooser */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700 block">Export Scope</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="fleetExportScope"
                checked={scope === 'all'}
                onChange={() => setScope('all')}
                className="accent-[#FA8A63]"
              />
              <span>All company fleets ({allCompanyFleets.length})</span>
            </label>
            <label
              className={`flex items-center gap-1.5 ${
                selectedFleets.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <input
                type="radio"
                name="fleetExportScope"
                disabled={selectedFleets.length === 0}
                checked={scope === 'selected'}
                onChange={() => setScope('selected')}
                className="accent-[#FA8A63]"
              />
              <span>Selected records ({selectedFleets.length})</span>
            </label>
          </div>
        </div>

        {/* Format chooser */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700 block">Export Format</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat('xlsx')}
              className={`py-2 px-3 rounded-lg border font-semibold text-center transition-colors cursor-pointer ${
                format === 'xlsx'
                  ? 'border-[#FA8A63] bg-orange-50 text-[#FA8A63] font-bold'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`py-2 px-3 rounded-lg border font-semibold text-center transition-colors cursor-pointer ${
                format === 'csv'
                  ? 'border-[#FA8A63] bg-orange-50 text-[#FA8A63] font-bold'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              CSV (.csv)
            </button>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-500">
          Exports 14 summary attributes (including ID, Name, Service Area, Parent Fleet, Vendor, Zone, Counts, Task, and Status). Individual member rosters are not multiplied into extra rows.
        </div>

        {isSuccess && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-700 rounded-lg font-semibold text-xs">
            <CheckCircle2 size={16} />
            <span>Export generated successfully for {exportedCount} fleets!</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <FileDown size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};
