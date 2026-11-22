import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Upload
} from 'lucide-react';

export type DirectUploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface DirectUploadStat {
  label: string;
  value: number;
  tone?: 'emerald' | 'slate' | 'amber';
}

export interface DirectUploadDoneSummary {
  headline: string;
  description: string;
  stats?: DirectUploadStat[];
}

export function formatUploadFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'CSV / JSON';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function useDirectUploadState(isActive: boolean = true) {
  const [status, setStatus] = useState<DirectUploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [fileLabel, setFileLabel] = useState('');
  const [fileMeta, setFileMeta] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [doneSummary, setDoneSummary] = useState<DirectUploadDoneSummary | null>(null);

  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setStatus('idle');
    setProgress(0);
    setFileLabel('');
    setFileMeta('');
    setErrorMessage(null);
    setDoneSummary(null);
  }, [clearTimers]);

  useEffect(() => {
    if (!isActive) {
      reset();
    }
    return () => {
      clearTimers();
    };
  }, [isActive, reset, clearTimers]);

  const fail = useCallback(
    (message: string) => {
      clearTimers();
      setStatus('error');
      setProgress(0);
      setErrorMessage(message);
    },
    [clearTimers]
  );

  const startUploading = useCallback(
    (
      label: string,
      meta: string,
      onComplete: () => DirectUploadDoneSummary
    ) => {
      clearTimers();
      setErrorMessage(null);
      setDoneSummary(null);
      setFileLabel(label);
      setFileMeta(meta);
      setStatus('uploading');
      setProgress(18);

      const t1 = window.setTimeout(() => setProgress(54), 180);
      const t2 = window.setTimeout(() => setProgress(86), 420);
      const t3 = window.setTimeout(() => {
        setProgress(100);
        const summary = onComplete();
        setDoneSummary(summary);
        setStatus('done');
      }, 680);

      timersRef.current = [t1, t2, t3];
    },
    [clearTimers]
  );

  return {
    status,
    progress,
    fileLabel,
    fileMeta,
    errorMessage,
    doneSummary,
    reset,
    fail,
    startUploading
  };
}

interface DirectBulkUploadViewProps {
  status: DirectUploadStatus;
  progress: number;
  fileLabel: string;
  fileMeta?: string;
  errorMessage?: string | null;
  doneSummary: DirectUploadDoneSummary | null;
  accept?: string;
  dropTitle?: string;
  dropSubtitle?: string;
  chooseButtonLabel?: string;
  downloadLabel?: string;
  sampleLabel?: string;
  templateTitle?: string;
  templateSubtitle?: string;
  doneButtonLabel?: string;
  onFileSelected: (file: File) => void;
  onDownloadTemplate?: () => void;
  onUseSample?: () => void;
  onReset: () => void;
  onDone: () => void;
}

export const DirectBulkUploadView: React.FC<DirectBulkUploadViewProps> = ({
  status,
  progress,
  fileLabel,
  fileMeta,
  errorMessage,
  doneSummary,
  accept = '.csv,text/csv',
  dropTitle = 'Choose CSV or drag & drop',
  dropSubtitle = 'Upload a spreadsheet file to import records directly.',
  chooseButtonLabel = 'Choose CSV file',
  downloadLabel = 'Download template',
  sampleLabel = 'Use sample CSV',
  templateTitle = 'Need a starting format?',
  templateSubtitle = 'Download standard header template or upload sample rows.',
  doneButtonLabel = 'Done',
  onFileSelected,
  onDownloadTemplate,
  onUseSample,
  onReset,
  onDone
}) => {
  const [isDragging, setIsDragging] = useState(false);

  if (status === 'uploading') {
    return (
      <div className="border border-slate-200 rounded-2xl bg-slate-50/70 p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 text-[#FA8A63] flex items-center justify-center mx-auto shadow-2xs">
          <Loader2 size={26} className="animate-spin" />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">Uploading file...</h3>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <FileText size={13} className="text-slate-400" />
            <span className="truncate max-w-[280px]">{fileLabel || 'upload.csv'}</span>
            {fileMeta && <span className="text-slate-400">· {fileMeta}</span>}
          </div>
          <p className="text-[11px] text-slate-500">Reading records and saving into workspace…</p>
        </div>

        <div className="max-w-sm mx-auto space-y-1.5">
          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#FA8A63] transition-all duration-200 ease-out"
              style={{ width: `${Math.min(100, Math.max(8, progress))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Uploading</span>
            <span className="text-[#B85324] tabular-nums">{Math.min(100, progress)}%</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'done' && doneSummary) {
    return (
      <div className="border border-emerald-200 rounded-2xl bg-emerald-50/40 p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
          <CheckCircle2 size={28} />
        </div>

        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-sm font-bold text-slate-900">{doneSummary.headline}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{doneSummary.description}</p>
        </div>

        {doneSummary.stats && doneSummary.stats.length > 0 && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {doneSummary.stats.map((st) => {
              const cls =
                st.tone === 'amber'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : st.tone === 'slate'
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800';
              return (
                <div key={st.label} className={`px-4 py-2 rounded-xl border text-center min-w-[96px] ${cls}`}>
                  <div className="text-base font-bold tabular-nums">{st.value}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{st.label}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-1 flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
          >
            Upload another file
          </button>
          <button
            type="button"
            onClick={onDone}
            className="px-5 py-2 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            {doneButtonLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onFileSelected(dropped);
        }}
        className={`border-2 border-dashed rounded-xl p-8 text-center space-y-3 transition-colors ${
          isDragging
            ? 'border-[#FA8A63] bg-orange-50/50'
            : 'border-slate-300 bg-slate-50/50 hover:border-[#FA8A63]/70'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-orange-50 text-[#FA8A63] flex items-center justify-center mx-auto">
          <Upload size={22} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{dropTitle}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{dropSubtitle}</p>
        </div>
        <div className="pt-2">
          <label className="px-4 py-2 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-xs inline-block">
            {chooseButtonLabel}
            <input
              type="file"
              accept={accept}
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) onFileSelected(selected);
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {(onDownloadTemplate || onUseSample) && (
        <div className="flex items-center justify-between gap-3 flex-wrap p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-800">{templateTitle}</div>
            <div className="text-[11px] text-slate-500">{templateSubtitle}</div>
          </div>
          <div className="flex items-center gap-2">
            {onDownloadTemplate && (
              <button
                type="button"
                onClick={onDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                <Download size={13} />
                <span>{downloadLabel}</span>
              </button>
            )}
            {onUseSample && (
              <button
                type="button"
                onClick={onUseSample}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Sparkles size={12} />
                <span>{sampleLabel}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
