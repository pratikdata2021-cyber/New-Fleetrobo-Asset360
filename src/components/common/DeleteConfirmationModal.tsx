import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';

export type ChipTone =
  | 'slate'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'emerald'
  | 'amber'
  | 'rose';

export interface DeleteTargetChip {
  id?: string;
  label: string;
  sublabel?: string;
  tone?: ChipTone;
}

export interface DeleteStatusChip {
  id: string;
  label: string;
  tone?: ChipTone;
  icon?: React.ReactNode;
}

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  targetChips?: DeleteTargetChip[];
  confirmationChips?: DeleteStatusChip[];
  warningNote?: React.ReactNode;
  reasonPresets?: string[];
  secondaryAction?: {
    label: string;
    onClick: () => void;
    tone?: 'amber' | 'slate';
  };
  zIndexClass?: string;
  onCancel: () => void;
  onConfirm: (selectedReason?: string) => void;
}

const TONE_CLASS: Record<ChipTone, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  orange: 'bg-orange-50 text-[#B85324] border-[#FA8A63]/40',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
};

const DEFAULT_REASONS = [
  'Data cleanup',
  'Duplicate record',
  'Decommissioned',
  'No longer required',
];

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm Delete',
  cancelLabel = 'Cancel',
  targetChips = [],
  confirmationChips = [],
  warningNote,
  reasonPresets = DEFAULT_REASONS,
  secondaryAction,
  zIndexClass = 'z-[150]',
  onCancel,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedReason('');
    }
  }, [isOpen, title]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4`}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <Trash2 size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{title}</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close delete dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body with Confirmation Chips */}
        <div className="px-5 py-4 space-y-3.5 bg-slate-50/50">
          {/* Target Record Chips */}
          {targetChips.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Record Details
              </div>
              <div className="flex flex-wrap gap-1.5">
                {targetChips.map((chip, idx) => (
                  <span
                    key={chip.id || `${chip.label}-${idx}`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                      TONE_CLASS[chip.tone || 'slate']
                    }`}
                  >
                    <span>{chip.label}</span>
                    {chip.sublabel && (
                      <span className="opacity-75 font-normal">· {chip.sublabel}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Safeguard / Disposition Confirmation Chips */}
          {confirmationChips.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Confirmation & Safeguard Check
              </div>
              <div className="flex flex-wrap gap-1.5">
                {confirmationChips.map((chip) => {
                  const defaultIcon =
                    chip.tone === 'emerald' ? (
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                    ) : chip.tone === 'amber' ? (
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                    ) : chip.tone === 'rose' ? (
                      <ShieldAlert className="w-3 h-3 shrink-0" />
                    ) : null;

                  return (
                    <span
                      key={chip.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        TONE_CLASS[chip.tone || 'slate']
                      }`}
                    >
                      {chip.icon ?? defaultIcon}
                      <span>{chip.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Warning Note */}
          {warningNote && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11.5px] text-amber-900 leading-relaxed">
              {warningNote}
            </div>
          )}

          {/* Selectable Reason Chips */}
          {reasonPresets.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Confirmation Reason Chip (Optional)
                </span>
                {selectedReason && (
                  <button
                    type="button"
                    onClick={() => setSelectedReason('')}
                    className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {reasonPresets.map((reason) => {
                  const isActive = selectedReason === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() =>
                        setSelectedReason((curr) => (curr === reason ? '' : reason))
                      }
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {reason}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white cursor-pointer"
          >
            {cancelLabel}
          </button>
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                secondaryAction.tone === 'amber'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
              }`}
            >
              {secondaryAction.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => onConfirm(selectedReason || undefined)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer inline-flex items-center gap-1.5"
          >
            <Trash2 size={13} />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
