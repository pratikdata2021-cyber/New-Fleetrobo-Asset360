import React from 'react';
import { X, History, Download, Printer, CheckCircle2, AlertTriangle, FileSpreadsheet, Trash2 } from 'lucide-react';
import { TransferHistoryJob } from '../types/driver';

interface DriverTransferHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyJobs: TransferHistoryJob[];
  onClearHistory: () => void;
}

export const DriverTransferHistoryModal: React.FC<DriverTransferHistoryModalProps> = ({
  isOpen,
  onClose,
  historyJobs,
  onClearHistory
}) => {
  if (!isOpen) return null;

  const handleDownloadAgain = (job: TransferHistoryJob) => {
    if (job.format === 'pdf') {
      window.print();
      return;
    }
    if (!job.fileData) return;

    const ext = job.format === 'xlsx' ? 'xlsx' : job.format === 'xls' ? 'xls' : job.format === 'html' ? 'html' : 'csv';
    const mime =
      job.format === 'html'
        ? 'text/html;charset=utf-8'
        : job.format === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const blob = new Blob([job.fileData], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `redownload_${job.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full flex flex-col max-h-[85vh] border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FA8A63] flex items-center justify-center">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Driver Transfer History</h3>
              <p className="text-xs text-slate-500">
                Session activity log for driver imports, exports, and bulk modifications
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {historyJobs.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Clear session history"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {historyJobs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <FileSpreadsheet size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-700">No transfer events recorded</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Completed driver CSV imports, formatted exports, and bulk status updates during this browser session will appear here.
              </p>
            </div>
          ) : (
            historyJobs.map((job) => (
              <div
                key={job.id}
                className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl transition-colors flex items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                        job.type === 'Import'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : job.type === 'Export'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-purple-100 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {job.type}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {job.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>{job.timestamp}</span>
                    <span>•</span>
                    <span>{job.recordCount} records</span>
                    {job.skippedCount !== undefined && job.skippedCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-600 font-medium">
                          {job.skippedCount} skipped
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                      job.status === 'Completed'
                        ? 'text-emerald-700 bg-emerald-50'
                        : job.status === 'Partial'
                        ? 'text-amber-700 bg-amber-50'
                        : 'text-red-700 bg-red-50'
                    }`}
                  >
                    {job.status === 'Completed' ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <AlertTriangle size={12} />
                    )}
                    {job.status}
                  </span>

                  {job.type === 'Export' && (
                    <button
                      type="button"
                      onClick={() => handleDownloadAgain(job)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
                      title={job.format === 'pdf' ? 'Print again' : 'Download exported file again'}
                    >
                      {job.format === 'pdf' ? (
                        <>
                          <Printer size={12} />
                          <span>Print</span>
                        </>
                      ) : (
                        <>
                          <Download size={12} />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Session history persists in prototype until tab reload.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white font-semibold rounded-lg shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
