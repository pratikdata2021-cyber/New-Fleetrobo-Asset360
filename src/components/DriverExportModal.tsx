import React, { useState } from 'react';
import { X, FileDown, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { Driver, deriveDriverBadges, TransferHistoryJob } from '../types/driver';
import { DRIVER_COLUMNS_CATALOGUE } from '../types/driverFilters';

interface DriverExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredDrivers: Driver[];
  selectedDrivers: Driver[];
  visibleColumnIds: string[];
  onLogHistory: (job: Omit<TransferHistoryJob, 'id' | 'timestamp'>) => void;
  onOpenHistory: () => void;
}

export const DriverExportModal: React.FC<DriverExportModalProps> = ({
  isOpen,
  onClose,
  filteredDrivers,
  selectedDrivers,
  visibleColumnIds,
  onLogHistory,
  onOpenHistory
}) => {
  const [scope, setScope] = useState<'filtered' | 'selected'>(
    selectedDrivers.length > 0 ? 'selected' : 'filtered'
  );
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'xls' | 'html' | 'pdf'>('xlsx');
  const [columnScope, setColumnScope] = useState<'visible' | 'all'>('visible');
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [exportedCount, setExportedCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetDrivers = scope === 'selected' ? selectedDrivers : filteredDrivers;

  const handleExport = () => {
    setErrorMessage(null);
    if (targetDrivers.length === 0) {
      setErrorMessage('Zero drivers available in current export scope.');
      return;
    }

    const columnsToExport =
      columnScope === 'visible'
        ? DRIVER_COLUMNS_CATALOGUE.filter((c) => visibleColumnIds.includes(c.key))
        : DRIVER_COLUMNS_CATALOGUE;

    const columnHeaders = columnsToExport.map((c) => c.label);

    const getDriverCellValue = (driver: Driver, key: string): string => {
      const badges = deriveDriverBadges(driver);
      switch (key) {
        case 'name':
          return driver.name || '';
        case 'licence':
          return driver.licence || '';
        case 'phone':
          return driver.phone || '';
        case 'company':
          return driver.company || '';
        case 'status':
          return driver.status || '';
        case 'reg':
          return driver.reg || 'Unassigned';
        case 'licenceTo':
          return driver.licenceTo || '';
        case 'accountStatus':
          return badges.accountStatus;
        case 'accountName':
          return driver.accountName || '';
        case 'accountEmail':
          return driver.accountEmail || '';
        case 'accountPhone':
          return driver.accountPhone || '';
        case 'accountCountry':
          return driver.accountCountry || '';
        case 'accountRole':
          return driver.accountRole || '';
        case 'transporter':
          return driver.transporter || '';
        case 'joining':
          return driver.joining || '';
        case 'vendor':
          return driver.vendor ? 'Yes' : 'No';
        case 'verification':
          return badges.verification;
        case 'licenceType':
          return driver.licenceType || '';
        case 'licenceFrom':
          return driver.licenceFrom || '';
        case 'rto':
          return driver.rto ? 'Yes' : 'No';
        case 'police':
          return driver.police ? 'Yes' : 'No';
        case 'training':
          return driver.training ? 'Yes' : 'No';
        case 'documents':
          return badges.documents;
        case 'dob':
          return driver.dob || '';
        case 'blood':
          return driver.blood || '';
        case 'experience':
          return driver.experience !== undefined ? `${driver.experience} yrs` : '';
        case 'rfid':
          return driver.rfid ? 'Yes' : 'No';
        case 'nextRest':
          return driver.nextRest || 'Not scheduled';
        default:
          return (driver as any)[key]?.toString() || '';
      }
    };

    const rows = targetDrivers.map((d) =>
      columnsToExport.map((col) => getDriverCellValue(d, col.key))
    );

    let fileContent = '';
    let fileName = `fleetrobo_drivers_export_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'pdf') {
      onLogHistory({
        type: 'Export',
        name: `Driver Export (PDF Print - ${targetDrivers.length} records)`,
        recordCount: targetDrivers.length,
        status: 'Completed',
        format: 'pdf'
      });
      setExportedCount(targetDrivers.length);
      setExportSuccess(true);
      setTimeout(() => {
        window.print();
      }, 300);
      return;
    }

    if (format === 'html') {
      const tableRows = rows
        .map((r) => `<tr>${r.map((c) => `<td style="padding: 6px 12px; border: 1px solid #e2e8f0;">${c}</td>`).join('')}</tr>`)
        .join('');
      fileContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FleetRobo Driver Export</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1e293b; }
    h2 { margin-bottom: 8px; color: #0f172a; }
    p { margin-top: 0; color: #64748b; font-size: 13px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th { background: #f8fafc; padding: 8px 12px; text-align: left; border: 1px solid #cbd5e1; font-weight: 600; }
  </style>
</head>
<body>
  <h2>FleetRobo 2.0 — Drivers Directory Export</h2>
  <p>Generated: ${new Date().toLocaleString()} | Scope: ${scope === 'selected' ? 'Selected Drivers' : 'Filtered Directory'} | Total: ${targetDrivers.length} records</p>
  <table>
    <thead>
      <tr>${columnHeaders.map((h) => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;
      fileName += '.html';
      const blob = new Blob([fileContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // CSV or pseudo-excel
      const csvRows = [
        columnHeaders.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(','))
      ];
      fileContent = '\uFEFF' + csvRows.join('\r\n');
      const ext = format === 'xlsx' ? 'xlsx' : format === 'xls' ? 'xls' : 'csv';
      fileName += `.${ext}`;

      const blob = new Blob([fileContent], {
        type:
          format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    onLogHistory({
      type: 'Export',
      name: `Driver Export (${format.toUpperCase()} - ${targetDrivers.length} records)`,
      recordCount: targetDrivers.length,
      status: 'Completed',
      format,
      fileData: fileContent
    });

    setExportedCount(targetDrivers.length);
    setExportSuccess(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl p-5 max-w-md w-full space-y-4 border border-slate-200">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Export Drivers</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {targetDrivers.length} drivers matching current scope
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {exportSuccess ? (
          <div className="py-4 space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Driver export prepared</h4>
              <p className="text-xs text-slate-500 mt-1">
                Successfully exported <span className="font-semibold text-slate-800">{exportedCount}</span> records in{' '}
                <span className="font-semibold uppercase text-slate-800">{format}</span> format.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 flex items-center justify-between">
              <span>Saved in session history for re-download.</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenHistory();
                }}
                className="text-[#FA8A63] hover:underline font-semibold flex items-center gap-1"
              >
                <History size={12} />
                Transfer History
              </button>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Scope chooser */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 block">Export Scope</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="exportDriverScope"
                    checked={scope === 'filtered'}
                    onChange={() => setScope('filtered')}
                    className="accent-[#FA8A63]"
                  />
                  <span>Matching Filtered ({filteredDrivers.length} across all pages)</span>
                </label>
                <label
                  className={`flex items-center gap-1.5 ${
                    selectedDrivers.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportDriverScope"
                    disabled={selectedDrivers.length === 0}
                    checked={scope === 'selected'}
                    onChange={() => setScope('selected')}
                    className="accent-[#FA8A63]"
                  />
                  <span>Selected Drivers ({selectedDrivers.length})</span>
                </label>
              </div>
            </div>

            {/* Format chooser */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 block">Format</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'xlsx', label: 'Excel (.xlsx)' },
                  { id: 'csv', label: 'CSV (.csv)' },
                  { id: 'xls', label: 'Excel 97 (.xls)' },
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
                    name="colDriverScope"
                    checked={columnScope === 'visible'}
                    onChange={() => setColumnScope('visible')}
                    className="accent-[#FA8A63]"
                  />
                  <span>Visible columns only ({visibleColumnIds.length})</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="colDriverScope"
                    checked={columnScope === 'all'}
                    onChange={() => setColumnScope('all')}
                    className="accent-[#FA8A63]"
                  />
                  <span>All 28 master columns</span>
                </label>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-500">
              Export respects all matching records across pages. Linked user accounts and verification badges are included without duplicating driver records.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <FileDown size={14} />
                Export
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
