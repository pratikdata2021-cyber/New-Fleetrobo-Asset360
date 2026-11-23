import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  Info,
  Upload,
  X,
} from 'lucide-react';
import { ModelCategoryRecord } from '../../types/modelCategoryMaster';
import {
  CANONICAL_CSV_HEADERS,
  CsvDuplicateDecision,
  CsvImportAnalysis,
  CsvRowStatus,
  MULTI_VALUE_SEPARATOR,
  ParsedCsvImportRow,
  analyzeModelCategoryCsv,
  buildImportErrorReportCsv,
  buildModelCategoryTemplateCsv,
  triggerCsvDownload,
} from '../../utils/modelCategoryCsv';

interface ModelCategoryImportDrawerProps {
  isOpen: boolean;
  existingRecords: ModelCategoryRecord[];
  onClose: () => void;
  onCommitImport: (payload: {
    toCreate: Omit<ModelCategoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'supportingDocs'>[];
    toUpdate: {
      existingId: string;
      data: Omit<ModelCategoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'supportingDocs'>;
    }[];
  }) => void;
}

export const ModelCategoryImportDrawer: React.FC<ModelCategoryImportDrawerProps> = ({
  isOpen,
  existingRecords,
  onClose,
  onCommitImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState<CsvImportAnalysis | null>(null);
  const [rowsState, setRowsState] = useState<ParsedCsvImportRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'all' | CsvRowStatus>('all');

  const summary = useMemo(() => {
    const createCount = rowsState.filter((r) => r.status === 'valid').length;
    const updateCount = rowsState.filter(
      (r) => r.status === 'duplicate' && r.duplicateDecision === 'update'
    ).length;
    const skipDuplicateCount = rowsState.filter(
      (r) => r.status === 'duplicate' && r.duplicateDecision === 'skip'
    ).length;
    const unchangedCount = rowsState.filter((r) => r.status === 'unchanged').length;
    const invalidCount = rowsState.filter((r) => r.status === 'invalid').length;
    return {
      total: rowsState.length,
      createCount,
      updateCount,
      skipDuplicateCount,
      unchangedCount,
      invalidCount,
      commitCount: createCount + updateCount,
    };
  }, [rowsState]);

  const filteredPreviewRows = useMemo(() => {
    if (previewFilter === 'all') return rowsState;
    return rowsState.filter((r) => r.status === previewFilter);
  }, [rowsState, previewFilter]);

  if (!isOpen) return null;

  const handleReset = () => {
    setFileName('');
    setAnalysis(null);
    setRowsState([]);
    setPreviewFilter('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = analyzeModelCategoryCsv(text, existingRecords);
      setAnalysis(result);
      setRowsState(result.rows);
      setPreviewFilter('all');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleSetRowDecision = (rowNumber: number, decision: CsvDuplicateDecision) => {
    setRowsState((prev) =>
      prev.map((row) =>
        row.rowNumber === rowNumber ? { ...row, duplicateDecision: decision } : row
      )
    );
  };

  const handleSetAllDuplicateDecisions = (decision: CsvDuplicateDecision) => {
    setRowsState((prev) =>
      prev.map((row) =>
        row.status === 'duplicate' ? { ...row, duplicateDecision: decision } : row
      )
    );
  };

  const handleDownloadTemplate = () => {
    const csv = buildModelCategoryTemplateCsv();
    triggerCsvDownload(csv, 'fleetrobo_model_category_master_template.csv');
  };

  const handleDownloadErrors = () => {
    const csv = buildImportErrorReportCsv(rowsState);
    triggerCsvDownload(csv, `model_category_import_errors_${Date.now()}.csv`);
  };

  const handleCommit = () => {
    const toCreate = rowsState
      .filter((r) => r.status === 'valid' && r.parsedRecord)
      .map((r) => r.parsedRecord!);
    const toUpdate = rowsState
      .filter(
        (r) =>
          r.status === 'duplicate' &&
          r.duplicateDecision === 'update' &&
          r.matchedExistingId &&
          r.parsedRecord
      )
      .map((r) => ({
        existingId: r.matchedExistingId!,
        data: r.parsedRecord!,
      }));

    if (toCreate.length === 0 && toUpdate.length === 0) return;
    onCommitImport({ toCreate, toUpdate });
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[125] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
      <div className="w-[740px] max-w-full h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-base font-bold text-slate-900">Import</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Validate, review duplicates, inspect row/field errors, and commit canonical model definitions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Step 1: Template & Upload */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  1. Download Canonical Template & Upload CSV
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Uses {CANONICAL_CSV_HEADERS.length} canonical columns. Separate multi-select values (Identifier Types, Supported Modes, Supported Protocols, Connectivity Types) with{' '}
                  <code className="px-1 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-800">
                    {MULTI_VALUE_SEPARATOR}
                  </code>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 shrink-0 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-[#FA8A63]" />
                Download Template
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-5 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#FA8A63] bg-white hover:bg-[#FFF9F6] transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-5 h-5 text-[#FA8A63]" />
                <span className="text-xs font-semibold text-slate-800">
                  {fileName ? `Selected: ${fileName} (click to replace)` : 'Click to choose a UTF-8 CSV file'}
                </span>
                <span className="text-[11px] text-slate-400">
                  RFC-4180 quote-safe parsing (handles commas, escaped quotes, and multiline descriptions)
                </span>
              </button>
            </div>
          </div>

          {/* Header Error */}
          {analysis?.headerError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">CSV Header Validation Failed</div>
                <p className="mt-0.5">{analysis.headerError}</p>
              </div>
            </div>
          )}

          {/* Step 2: Preview Summary */}
          {analysis && !analysis.headerError && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPreviewFilter(previewFilter === 'valid' ? 'all' : 'valid')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    previewFilter === 'valid'
                      ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400'
                      : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-emerald-700">Valid (New)</div>
                  <div className="text-lg font-bold text-emerald-900">{summary.createCount}</div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewFilter(previewFilter === 'duplicate' ? 'all' : 'duplicate')
                  }
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    previewFilter === 'duplicate'
                      ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400'
                      : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-amber-700">Duplicate</div>
                  <div className="text-lg font-bold text-amber-900">
                    {summary.updateCount + summary.skipDuplicateCount}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter(previewFilter === 'invalid' ? 'all' : 'invalid')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    previewFilter === 'invalid'
                      ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-400'
                      : 'border-rose-200 bg-rose-50/50 hover:bg-rose-50'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-rose-700">Invalid</div>
                  <div className="text-lg font-bold text-rose-900">{summary.invalidCount}</div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewFilter(previewFilter === 'unchanged' ? 'all' : 'unchanged')
                  }
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    previewFilter === 'unchanged'
                      ? 'border-slate-400 bg-slate-100 ring-1 ring-slate-400'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-slate-600">Unchanged</div>
                  <div className="text-lg font-bold text-slate-800">{summary.unchangedCount}</div>
                </button>
              </div>

              {/* Duplicate Bulk Controls & Error Download */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium">Filter:</span>
                  {(['all', 'valid', 'duplicate', 'invalid', 'unchanged'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPreviewFilter(tab)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold capitalize cursor-pointer ${
                        previewFilter === tab
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {summary.updateCount + summary.skipDuplicateCount > 0 && (
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-500">Duplicates:</span>
                      <button
                        type="button"
                        onClick={() => handleSetAllDuplicateDecisions('skip')}
                        className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
                      >
                        Skip all
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAllDuplicateDecisions('update')}
                        className="px-2 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 font-semibold text-amber-800 cursor-pointer"
                      >
                        Update all
                      </button>
                    </div>
                  )}

                  {summary.invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadErrors}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Download Error CSV ({summary.invalidCount})
                    </button>
                  )}
                </div>
              </div>

              {summary.updateCount + summary.skipDuplicateCount > 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Duplicates default to <strong>Skip</strong> and are never silently overwritten. Choose <strong>Update</strong> on individual rows to overwrite matching definitions while preserving their Model IDs and existing attachments.
                  </span>
                </div>
              )}

              {/* Preview Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div className="max-h-[340px] overflow-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-600 w-14">Row</th>
                        <th className="px-3 py-2 font-semibold text-slate-600">Model Definition</th>
                        <th className="px-3 py-2 font-semibold text-slate-600 w-28">Result</th>
                        <th className="px-3 py-2 font-semibold text-slate-600 w-36 text-right">
                          Action / Errors
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400">
                            No rows match this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewRows.map((row) => (
                          <tr key={row.rowNumber} className="align-top hover:bg-slate-50/70">
                            <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                              #{row.rowNumber}
                            </td>
                            <td className="px-3 py-2.5 space-y-0.5">
                              <div className="font-semibold text-slate-900">
                                {row.rawValues['Model Type'] || (
                                  <span className="italic text-rose-500">Missing Model Type</span>
                                )}
                                {row.rawValues['Model Name / Number'] && (
                                  <span className="ml-1.5 font-mono text-[11px] text-slate-500">
                                    ({row.rawValues['Model Name / Number']})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {row.rawValues['Category'] || '—'} ·{' '}
                                {row.rawValues['Manufacturer / Provider'] || '—'} · IDs:{' '}
                                {row.rawValues['Identifier Types'] || '—'}
                              </div>
                              {row.status === 'duplicate' && row.matchedExistingLabel && (
                                <div className="text-[10px] text-amber-700 font-medium">
                                  Matches existing: {row.matchedExistingLabel}
                                </div>
                              )}
                              {row.errors.length > 0 && (
                                <ul className="mt-1 space-y-0.5">
                                  {row.errors.map((err, i) => (
                                    <li
                                      key={`${row.rowNumber}-${i}`}
                                      className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded px-2 py-0.5"
                                    >
                                      <strong>{err.field}:</strong> {err.message}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {row.status === 'valid' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Valid
                                </span>
                              )}
                              {row.status === 'duplicate' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  Duplicate
                                </span>
                              )}
                              {row.status === 'unchanged' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  Unchanged
                                </span>
                              )}
                              {row.status === 'invalid' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertTriangle className="w-3 h-3" /> Invalid
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {row.status === 'valid' && (
                                <span className="text-[11px] font-semibold text-emerald-700">
                                  Create
                                </span>
                              )}
                              {row.status === 'unchanged' && (
                                <span className="text-[11px] text-slate-400">Skip (identical)</span>
                              )}
                              {row.status === 'invalid' && (
                                <span className="text-[11px] font-semibold text-rose-600">
                                  {row.errors.length} error(s)
                                </span>
                              )}
                              {row.status === 'duplicate' && (
                                <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-white">
                                  <button
                                    type="button"
                                    onClick={() => handleSetRowDecision(row.rowNumber, 'skip')}
                                    className={`px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                                      row.duplicateDecision === 'skip'
                                        ? 'bg-slate-800 text-white'
                                        : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    Skip
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetRowDecision(row.rowNumber, 'update')}
                                    className={`px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                                      row.duplicateDecision === 'update'
                                        ? 'bg-[#FA8A63] text-white'
                                        : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    Update
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!analysis && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <FileSpreadsheet className="w-4 h-4 text-[#FA8A63]" />
                <span>Canonical CSV Validation Rules</span>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4 leading-relaxed">
                <li>
                  <strong>All rows:</strong> Category (Device / Sensor / SIM), Model Type, Manufacturer / Provider, and at least 1 Identifier Type.
                </li>
                <li>
                  <strong>Device rows:</strong> Model Name / Number and Device Function required; Maximum Camera Channels (optional) must be a positive whole integer.
                </li>
                <li>
                  <strong>Sensor rows:</strong> Measurement Type required; Measurement Unit required for Temperature, Fuel Level, and Pressure.
                </li>
                <li>
                  <strong>SIM rows:</strong> SIM Type required; Default Validity (Months) (optional) must be a positive whole integer.
                </li>
                <li>
                  <strong>Documentation URL:</strong> Optional; if provided, must be a valid <code className="font-mono">http://</code> or <code className="font-mono">https://</code> link.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-600">
            {analysis && !analysis.headerError ? (
              <span>
                Will commit: <strong>{summary.createCount}</strong> create,{' '}
                <strong>{summary.updateCount}</strong> update ({summary.skipDuplicateCount + summary.unchangedCount}{' '}
                skipped, {summary.invalidCount} invalid)
              </span>
            ) : (
              <span>Upload a CSV file to preview changes before committing.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={summary.commitCount === 0}
              onClick={handleCommit}
              className="h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] disabled:opacity-40 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Commit Import ({summary.commitCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
