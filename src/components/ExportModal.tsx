import React, { useState, useEffect } from 'react';
import { X, FileDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { Vehicle, getVehicleOwningCompany } from '../types/vehicle';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredVehicles: Vehicle[];
  selectedVehicles: Vehicle[];
  visibleColumns?: string[];
}

const COLUMN_EXPORT_MAP: Record<
  string,
  { label: string; getValue: (v: Vehicle) => string }
> = {
  registration_number: {
    label: 'Registration Number',
    getValue: (v) => v.registration_number || ''
  },
  machine_model: {
    label: 'Machine Model',
    getValue: (v) => v.machine_model || v.model || ''
  },
  chassis_number: {
    label: 'Chassis No.',
    getValue: (v) => v.chassis_number || v.vin || ''
  },
  year: { label: 'Year of Make', getValue: (v) => (v.year ? String(v.year) : '') },
  fuel_type: { label: 'Fuel Type', getValue: (v) => v.fuel_type || '' },
  insurance_to: {
    label: 'Insurance Expiry',
    getValue: (v) => v.insurance_to || v.documents?.insurance?.due_date || ''
  },
  status: { label: 'Operational Status', getValue: (v) => v.status || '' },
  name: { label: 'Vehicle Name', getValue: (v) => v.name || '' },
  company: {
    label: 'Owning Company',
    getValue: (v) => getVehicleOwningCompany(v)
  },
  client: { label: 'Client', getValue: (v) => v.client || '' },
  make: { label: 'Make', getValue: (v) => v.make || '' },
  model: { label: 'Model', getValue: (v) => v.model || '' },
  vehicle_model_id: {
    label: 'Vehicle Model ID',
    getValue: (v) => v.vehicle_model_id || ''
  },
  transporter: { label: 'Transporter', getValue: (v) => v.transporter || '' },
  driver: { label: 'Assigned Driver', getValue: (v) => v.driver || '' },
  fleets: {
    label: 'Fleets',
    getValue: (v) => (v.fleets || []).join('; ')
  },
  zone: { label: 'Zone', getValue: (v) => v.zone || '' },
  location: {
    label: 'Location',
    getValue: (v) => v.location || v.client_location || ''
  },
  active_status: {
    label: 'Active Flag',
    getValue: (v) => (v.active_status !== false ? 'Active' : 'Inactive')
  },
  online: {
    label: 'Telematics Online',
    getValue: (v) => (v.online === true ? 'Online' : v.online === false ? 'Offline' : '')
  },
  public_id: { label: 'Public ID', getValue: (v) => v.public_id || '' }
};

const ALL_CORE_COLUMN_KEYS = [
  'public_id',
  'company',
  'registration_number',
  'name',
  'make',
  'machine_model',
  'vehicle_model_id',
  'chassis_number',
  'year',
  'fuel_type',
  'status',
  'active_status',
  'transporter',
  'driver',
  'fleets',
  'zone',
  'location',
  'insurance_to',
  'online'
];

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  filteredVehicles,
  selectedVehicles,
  visibleColumns
}) => {
  const [scope, setScope] = useState<'filtered' | 'selected'>(
    selectedVehicles.length > 0 ? 'selected' : 'filtered'
  );
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'xls' | 'html' | 'pdf'>('xlsx');
  const [columnScope, setColumnScope] = useState<'visible' | 'all'>('visible');
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setScope(selectedVehicles.length > 0 ? 'selected' : 'filtered');
      setExportError('');
      setExportSuccess(false);
    }
  }, [isOpen, selectedVehicles.length]);

  if (!isOpen) return null;

  const targetVehicles = scope === 'selected' ? selectedVehicles : filteredVehicles;
  const visibleKeys =
    visibleColumns && visibleColumns.length > 0
      ? visibleColumns.filter((k) => Boolean(COLUMN_EXPORT_MAP[k]))
      : [
          'registration_number',
          'name',
          'company',
          'make',
          'machine_model',
          'year',
          'status',
          'transporter',
          'driver',
          'location'
        ];

  const handleExport = () => {
    setExportError('');
    if (targetVehicles.length === 0) {
      setExportError('No vehicles available in the chosen scope to export.');
      return;
    }

    if (format === 'pdf') {
      window.print();
      onClose();
      return;
    }

    const keys = columnScope === 'all' ? ALL_CORE_COLUMN_KEYS : visibleKeys;
    const cols = keys
      .map((k) => COLUMN_EXPORT_MAP[k])
      .filter(Boolean);

    if (format === 'html') {
      const ths = cols
        .map((c) => `<th style="border:1px solid #cbd5e1;padding:6px;background:#f8fafc;">${c.label}</th>`)
        .join('');
      const trs = targetVehicles
        .map(
          (v) =>
            `<tr>${cols
              .map(
                (c) =>
                  `<td style="border:1px solid #cbd5e1;padding:6px;">${c
                    .getValue(v)
                    .replace(/</g, '&lt;')}</td>`
              )
              .join('')}</tr>`
        )
        .join('');
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>FleetRobo Vehicles Export</title></head><body><table style="border-collapse:collapse;font-family:sans-serif;font-size:12px;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fleetrobo_vehicles_export.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const headers = cols.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
      const rows = targetVehicles.map((v) =>
        cols
          .map((c) => `"${c.getValue(v).replace(/"/g, '""')}"`)
          .join(',')
      );
      const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fleetrobo_vehicles_export.${
        format === 'xlsx' || format === 'xls' ? 'csv' : format
      }`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

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
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
          >
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
                onChange={() => {
                  setScope('filtered');
                  setExportError('');
                }}
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
                onChange={() => {
                  setScope('selected');
                  setExportError('');
                }}
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
                className={`py-1.5 px-2 text-xs rounded-lg border font-semibold text-center transition-colors cursor-pointer ${
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
              <span>Visible columns ({visibleKeys.length})</span>
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

        {exportError && (
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
            <AlertCircle size={14} />
            <span>{exportError}</span>
          </div>
        )}

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
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
          >
            <FileDown size={14} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};
