import React, { useState, useMemo } from 'react';
import { X, Search, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { Fleet, FLEET_LOOKUPS, FLEET_STATUSES } from '../types/fleet';
import { InfoTooltip } from './InfoTooltip';

interface FleetFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: Record<string, any>;
  filterMode: 'basic' | 'advanced';
  allFleets: Fleet[];
  onApplyFilters: (filters: Record<string, any>, mode: 'basic' | 'advanced') => void;
  totalMatchedCount: number;
}

export const FleetFilterDrawer: React.FC<FleetFilterDrawerProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  filterMode: initialMode,
  allFleets,
  onApplyFilters,
  totalMatchedCount
}) => {
  const [mode, setMode] = useState<'basic' | 'advanced'>(initialMode);
  const [draftFilters, setDraftFilters] = useState<Record<string, any>>({ ...appliedFilters });
  const [searchFilterQuery, setSearchFilterQuery] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [rangeErrors, setRangeErrors] = useState<Record<string, string>>({});
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);

  // Parent fleet options derived from allFleets
  const parentFleetOptions = useMemo(() => {
    return allFleets.map((f) => ({ id: f.id, label: `${f.name} (${f.public_id})` }));
  }, [allFleets]);

  // All Zones
  const allZoneOptions = useMemo(() => {
    const list: string[] = [];
    Object.values(FLEET_LOOKUPS.serviceAreaZones).forEach((zones) => {
      zones.forEach((z) => {
        if (!list.includes(z)) list.push(z);
      });
    });
    return list;
  }, []);

  const isDirty =
    JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters) || mode !== initialMode;

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const updateDraft = (key: string, value: any) => {
    setDraftFilters((prev) => {
      const next = { ...prev };
      if (
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });

    if (rangeErrors[key]) {
      setRangeErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const toggleMultiOption = (key: string, optionValue: string) => {
    const current: string[] = draftFilters[key] || [];
    if (current.includes(optionValue)) {
      updateDraft(
        key,
        current.filter((v) => v !== optionValue)
      );
    } else {
      updateDraft(key, [...current, optionValue]);
    }
  };

  const handleApply = () => {
    // Validate date range errors
    const errs: Record<string, string> = {};
    ['created_at', 'updated_at'].forEach((k) => {
      const val = draftFilters[k];
      if (val && val.from && val.to) {
        if (new Date(val.from) > new Date(val.to)) {
          errs[k] = 'From date cannot be after To date.';
        }
      }
    });

    if (Object.keys(errs).length > 0) {
      setRangeErrors(errs);
      return;
    }

    onApplyFilters(draftFilters, mode);
    onClose();
  };

  const handleReset = () => {
    setDraftFilters({});
    setRangeErrors({});
  };

  const activeCount = Object.keys(draftFilters).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        onClick={handleCloseAttempt}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Body (580px wide) */}
      <div className="relative w-full max-w-[580px] bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 z-10 font-sans text-xs">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Fleet Filters</h2>
              {activeCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#FA8A63] text-white text-[11px] font-bold flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Refine directory records by 10 canonical attributes
            </p>
          </div>

          <button
            onClick={handleCloseAttempt}
            className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector & Search Filter */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          {/* Basic vs Advanced Logic Pill */}
          <div className="flex items-center justify-between bg-white p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setMode('basic')}
              className={`flex-1 py-1 px-3 rounded-md text-xs font-semibold text-center transition-colors cursor-pointer ${
                mode === 'basic'
                  ? 'bg-orange-50 text-[#FA8A63] font-bold border border-orange-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Basic (AND)
            </button>
            <button
              type="button"
              onClick={() => setMode('advanced')}
              className={`flex-1 py-1 px-3 rounded-md text-xs font-semibold text-center transition-colors cursor-pointer ${
                mode === 'advanced'
                  ? 'bg-orange-50 text-[#FA8A63] font-bold border border-orange-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Advanced (OR with Status AND)
            </button>
          </div>

          {/* Search Box inside drawer */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Find filter..."
              value={searchFilterQuery}
              onChange={(e) => setSearchFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#FA8A63]"
            />
          </div>
        </div>

        {/* Filter List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. IDENTITY GROUP */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
              Identity
            </div>

            {/* Fleet Name (text) */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Fleet Name</span>
                <InfoTooltip content="Case-insensitive text containment on Fleet Name." />
              </label>
              <input
                type="text"
                placeholder="Contains..."
                value={draftFilters.name || ''}
                onChange={(e) => updateDraft('name', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#FA8A63]"
              />
            </div>

            {/* Public ID (text) */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Public ID</span>
                <InfoTooltip content="Case-insensitive text containment on Fleet Public ID, e.g. FLT-1001." />
              </label>
              <input
                type="text"
                placeholder="e.g. FLT-1001"
                value={draftFilters.public_id || ''}
                onChange={(e) => updateDraft('public_id', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#FA8A63]"
              />
            </div>
          </div>

          {/* 2. OPERATIONS GROUP */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
              Operations
            </div>

            {/* Fleet Status (multi) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Fleet Status</span>
                <InfoTooltip content="Restrict Fleet Status to selected statuses. This remains a mandatory AND condition even in Advanced mode." />
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {FLEET_STATUSES.map((st) => {
                  const isChecked = (draftFilters.status || []).includes(st.code);
                  return (
                    <label
                      key={st.code}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-[#FA8A63] bg-orange-50/50 text-[#FA8A63] font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleMultiOption('status', st.code)}
                        className="w-3.5 h-3.5 text-[#FA8A63] rounded border-slate-300"
                      />
                      <span>{st.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Task / Mission (text) */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Task / Mission</span>
                <InfoTooltip content="Case-insensitive text containment on Task / Mission." />
              </label>
              <input
                type="text"
                placeholder="Contains task description..."
                value={draftFilters.task || ''}
                onChange={(e) => updateDraft('task', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#FA8A63]"
              />
            </div>
          </div>

          {/* 3. COVERAGE GROUP */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
              Coverage
            </div>

            {/* Service Area (multi) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Service Area</span>
                <InfoTooltip content="Choose one or more configured Service Areas to include." />
              </label>
              <div className="space-y-1">
                {FLEET_LOOKUPS.serviceAreas.map((sa) => {
                  const isChecked = (draftFilters.service_area || []).includes(sa);
                  return (
                    <label
                      key={sa}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-[#FA8A63] bg-orange-50/40 text-slate-900 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleMultiOption('service_area', sa)}
                        className="w-3.5 h-3.5 text-[#FA8A63] rounded border-slate-300"
                      />
                      <span>{sa}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Zone (multi) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Zone</span>
                <InfoTooltip content="Choose one or more operational zones, scoped elsewhere by Service Area." />
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-100 p-1 rounded-lg">
                {allZoneOptions.map((z) => {
                  const isChecked = (draftFilters.zone || []).includes(z);
                  return (
                    <label
                      key={z}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-[#FA8A63] bg-orange-50/40 text-slate-900 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleMultiOption('zone', z)}
                        className="w-3.5 h-3.5 text-[#FA8A63] rounded border-slate-300"
                      />
                      <span>{z}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. HIERARCHY & RELATIONSHIPS */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
              Hierarchy & Relationships
            </div>

            {/* Parent Fleet (multi) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Parent Fleet</span>
                <InfoTooltip content="Select one or more parent Fleet IDs; display their names." />
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-100 p-1 rounded-lg">
                {parentFleetOptions.map((opt) => {
                  const isChecked = (draftFilters.parent || []).includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-[#FA8A63] bg-orange-50/40 text-slate-900 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleMultiOption('parent', opt.id)}
                        className="w-3.5 h-3.5 text-[#FA8A63] rounded border-slate-300"
                      />
                      <span className="truncate">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Vendor (multi) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Vendor</span>
                <InfoTooltip content="Choose one or more Vendor values from the source list." />
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {FLEET_LOOKUPS.vendors.map((vn) => {
                  const isChecked = (draftFilters.vendor || []).includes(vn);
                  return (
                    <label
                      key={vn}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-[#FA8A63] bg-orange-50/40 text-slate-900 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleMultiOption('vendor', vn)}
                        className="w-3.5 h-3.5 text-[#FA8A63] rounded border-slate-300"
                      />
                      <span className="truncate">{vn}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. AUDIT DATES */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
              Audit Timestamps
            </div>

            {/* Created At Range */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Created At (Date range)</span>
                <InfoTooltip content="Inclusive Created At date range, From and To." />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={draftFilters.created_at?.from || ''}
                  onChange={(e) =>
                    updateDraft('created_at', {
                      ...draftFilters.created_at,
                      from: e.target.value
                    })
                  }
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#FA8A63]"
                />
                <input
                  type="date"
                  value={draftFilters.created_at?.to || ''}
                  onChange={(e) =>
                    updateDraft('created_at', {
                      ...draftFilters.created_at,
                      to: e.target.value
                    })
                  }
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#FA8A63]"
                />
              </div>
              {rangeErrors.created_at && (
                <p className="text-[11px] text-red-600 font-medium">{rangeErrors.created_at}</p>
              )}
            </div>

            {/* Updated At Range */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Updated At (Date range)</span>
                <InfoTooltip content="Inclusive Updated At date range, From and To." />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={draftFilters.updated_at?.from || ''}
                  onChange={(e) =>
                    updateDraft('updated_at', {
                      ...draftFilters.updated_at,
                      from: e.target.value
                    })
                  }
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#FA8A63]"
                />
                <input
                  type="date"
                  value={draftFilters.updated_at?.to || ''}
                  onChange={(e) =>
                    updateDraft('updated_at', {
                      ...draftFilters.updated_at,
                      to: e.target.value
                    })
                  }
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#FA8A63]"
                />
              </div>
              {rangeErrors.updated_at && (
                <p className="text-[11px] text-red-600 font-medium">{rangeErrors.updated_at}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset filters</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Apply filters ({totalMatchedCount} matches)
            </button>
          </div>
        </div>
      </div>

      {/* DISCARD CONFIRM DIALOG */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-70 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertCircle size={20} />
              <h4 className="text-sm font-bold text-slate-900">Discard filter changes?</h4>
            </div>
            <p className="text-xs text-slate-600">
              You have unapplied filter selections. Leaving now will discard all changes made in this drawer.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
              >
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
