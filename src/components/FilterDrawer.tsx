import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Layers
} from 'lucide-react';
import {
  ALL_61_FILTERS,
  FilterDefinition,
  RangeFilterValue,
  countActiveVehicleFilters,
  evaluateVehicleFilters,
  getOptionsForVehicleFilter,
  getVehicleFilterValues,
  isRangeFilterActive,
  sanitizeVehicleFilters,
  validateFilterRange
} from '../types/filters';
import { Vehicle } from '../types/vehicle';
import { InfoTooltip } from './InfoTooltip';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: Record<string, any>;
  filterMode: 'basic' | 'advanced';
  onApplyFilters: (filters: Record<string, any>, mode: 'basic' | 'advanced') => void;
  totalMatchedCount: number;
  scopedVehicles?: Vehicle[];
  baseMatchedVehicles?: Vehicle[];
  companyContext?: string;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  filterMode: initialMode,
  onApplyFilters,
  totalMatchedCount,
  scopedVehicles = [],
  baseMatchedVehicles,
  companyContext
}) => {
  const [mode, setMode] = useState<'basic' | 'advanced'>(initialMode);
  const [draftFilters, setDraftFilters] = useState<Record<string, any>>(() =>
    sanitizeVehicleFilters(appliedFilters)
  );
  const [searchFilterQuery, setSearchFilterQuery] = useState('');
  const [showAllAdvanced, setShowAllAdvanced] = useState(false);
  const [rangeErrors, setRangeErrors] = useState<Record<string, string>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [multiOptionSearch, setMultiOptionSearch] = useState<Record<string, string>>({});
  const [vendorRefreshTick, setVendorRefreshTick] = useState(0);

  useEffect(() => {
    const onVendorsUpdated = () => setVendorRefreshTick((t) => t + 1);
    window.addEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
    return () => window.removeEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
  }, []);

  // Re-sync draft state whenever the drawer opens (fixes stale state after Reset / Saved Views)
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setDraftFilters(sanitizeVehicleFilters(appliedFilters));
      setRangeErrors({});
      setShowDiscardConfirm(false);
      setSearchFilterQuery('');
    }
  }, [isOpen, appliedFilters, initialMode]);

  const sanitizedDraft = useMemo(() => sanitizeVehicleFilters(draftFilters), [draftFilters]);
  const sanitizedApplied = useMemo(() => sanitizeVehicleFilters(appliedFilters), [appliedFilters]);

  const liveMatchedCount = useMemo(() => {
    if (baseMatchedVehicles) {
      return baseMatchedVehicles.filter((v) =>
        evaluateVehicleFilters(v, sanitizedDraft, mode)
      ).length;
    }
    if (scopedVehicles.length > 0) {
      return scopedVehicles.filter((v) =>
        evaluateVehicleFilters(v, sanitizedDraft, mode)
      ).length;
    }
    return totalMatchedCount;
  }, [baseMatchedVehicles, scopedVehicles, sanitizedDraft, mode, totalMatchedCount]);

  if (!isOpen) return null;

  const isDirty =
    JSON.stringify(sanitizedDraft) !== JSON.stringify(sanitizedApplied) ||
    mode !== initialMode;

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleApply = () => {
    const errors: Record<string, string> = {};
    Object.keys(draftFilters).forEach((key) => {
      const def = ALL_61_FILTERS.find((f) => f.key === key);
      if (!def) return;
      if (def.control === 'date-range' || def.control === 'numeric-range') {
        const err = validateFilterRange(def, draftFilters[key] as RangeFilterValue);
        if (err) errors[key] = err;
      }
    });

    if (Object.keys(errors).length > 0) {
      setRangeErrors(errors);
      return;
    }

    setRangeErrors({});
    onApplyFilters(sanitizedDraft, mode);
    onClose();
  };

  const handleClearAll = () => {
    setDraftFilters({});
    setRangeErrors({});
    setMultiOptionSearch({});
  };

  const updateDraft = (key: string, value: any) => {
    setRangeErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });

    setDraftFilters((prev) => {
      const next = { ...prev };
      if (
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete next[key];
      } else if (
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !isRangeFilterActive(value)
      ) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const toggleMultiOption = (key: string, opt: string) => {
    const prevArr: string[] = Array.isArray(draftFilters[key]) ? draftFilters[key] : [];
    const exists = prevArr.some((x) => x.toLowerCase() === opt.toLowerCase());
    const nextArr = exists
      ? prevArr.filter((x) => x.toLowerCase() !== opt.toLowerCase())
      : [...prevArr, opt];
    updateDraft(key, nextArr);
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // Filter definitions based on mode & search
  const visibleFilterDefs = ALL_61_FILTERS.filter((def) => {
    if (searchFilterQuery.trim()) {
      const q = searchFilterQuery.toLowerCase().trim();
      return (
        def.label.toLowerCase().includes(q) ||
        def.group.toLowerCase().includes(q) ||
        def.key.toLowerCase().includes(q)
      );
    }
    if (mode === 'basic') {
      return def.isBasicDefault || sanitizedDraft[def.key] !== undefined;
    }
    return showAllAdvanced || def.isBasicDefault || sanitizedDraft[def.key] !== undefined;
  });

  // Group filters preserving catalog order
  const groupedFilters = visibleFilterDefs.reduce<Record<string, FilterDefinition[]>>(
    (acc, def) => {
      acc[def.group] = acc[def.group] || [];
      acc[def.group].push(def);
      return acc;
    },
    {}
  );

  const activeCount = countActiveVehicleFilters(sanitizedDraft);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={handleCloseAttempt}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* 675px Right Drawer */}
      <div className="relative w-[675px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-slate-200">
        {/* Drawer Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-slate-900">Sectional Filters</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-[#FA8A63] border border-orange-200">
                {activeCount} active
              </span>
              {companyContext &&
                companyContext !== 'All Clients' &&
                companyContext !== 'Platform Admin' &&
                companyContext !== 'Binary' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Scope: {companyContext}
                  </span>
                )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {mode === 'basic'
                ? 'Basic Mode (AND) — All applied conditions must be satisfied within current tenant & search scope.'
                : 'Advanced Mode (OR) — Matches vehicles satisfying any active filter within current tenant & search scope.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <RotateCcw size={12} />
                Reset all
              </button>
            )}
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Toolbar & Search Inside Drawer */}
        <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setMode('basic')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'basic'
                  ? 'bg-[#FA8A63] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Basic (AND)
            </button>
            <button
              type="button"
              onClick={() => setMode('advanced')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'advanced'
                  ? 'bg-[#FA8A63] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Advanced (OR)
            </button>
          </div>

          {/* Search within 61 filters */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Find a filter from 61 definitions..."
              value={searchFilterQuery}
              onChange={(e) => setSearchFilterQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FA8A63]"
            />
            {searchFilterQuery && (
              <button
                type="button"
                onClick={() => setSearchFilterQuery('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {mode === 'advanced' && (
            <button
              type="button"
              onClick={() => setShowAllAdvanced(!showAllAdvanced)}
              className="text-[11px] font-semibold text-[#FA8A63] hover:underline shrink-0 cursor-pointer"
            >
              {showAllAdvanced ? 'Show default' : 'Show all 61'}
            </button>
          )}
        </div>

        {/* Scrollable Sectional Filters List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {Object.keys(rangeErrors).length > 0 && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>Please fix the highlighted range errors before applying filters.</span>
            </div>
          )}

          {Object.keys(groupedFilters).length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No filters found matching "{searchFilterQuery}".
            </div>
          ) : (
            Object.entries(groupedFilters).map(([groupName, filterList]) => {
              const groupActiveCount = filterList.filter(
                (f) => sanitizedDraft[f.key] !== undefined
              ).length;
              const isCollapsed = Boolean(collapsedGroups[groupName]) && !searchFilterQuery.trim();

              return (
                <div
                  key={groupName}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupName)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between text-left cursor-pointer hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Layers size={13} className="text-[#FA8A63]" />
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        {groupName}
                      </span>
                      {groupActiveCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-[#B85324]">
                          {groupActiveCount} active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="text-[10px] font-semibold">{filterList.length}</span>
                      {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="p-3 grid grid-cols-2 gap-3">
                      {filterList.map((filter) => {
                        const currentValue = draftFilters[filter.key];
                        const isActive = sanitizedDraft[filter.key] !== undefined;
                        const hasError = rangeErrors[filter.key];
                        void vendorRefreshTick;

                        const multiOptions =
                          filter.control === 'multi-select'
                            ? getOptionsForVehicleFilter(
                                filter.key,
                                scopedVehicles,
                                companyContext,
                                currentValue
                              )
                            : [];

                        const searchSuggestions =
                          filter.control === 'search-dropdown'
                            ? Array.from(
                                new Set(
                                  scopedVehicles
                                    .flatMap((v) => getVehicleFilterValues(v, filter.key))
                                    .filter(Boolean)
                                )
                              ).slice(0, 60)
                            : [];

                        const optionQuery = (multiOptionSearch[filter.key] || '')
                          .trim()
                          .toLowerCase();
                        const filteredMultiOptions = optionQuery
                          ? multiOptions.filter((o) =>
                              o.toLowerCase().includes(optionQuery)
                            )
                          : multiOptions;

                        return (
                          <div
                            key={filter.key}
                            className={`space-y-1.5 p-2.5 rounded-lg border transition-colors ${
                              hasError
                                ? 'bg-rose-50/40 border-rose-200'
                                : isActive
                                ? 'bg-orange-50/30 border-orange-200'
                                : 'bg-slate-50/50 border-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <label className="text-xs font-semibold text-slate-800 flex items-center">
                                {filter.label}
                                <InfoTooltip content={filter.note} />
                              </label>
                              {currentValue !== undefined && (
                                <button
                                  type="button"
                                  onClick={() => updateDraft(filter.key, undefined)}
                                  className="text-[10px] font-medium text-slate-400 hover:text-red-500 cursor-pointer shrink-0"
                                >
                                  Reset
                                </button>
                              )}
                            </div>

                            {/* Filter Input based on Control type */}
                            {filter.control === 'yes-no' ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateDraft(filter.key, undefined)}
                                  className={`px-2 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                                    currentValue === undefined
                                      ? 'bg-white border-slate-300 text-slate-800 shadow-2xs'
                                      : 'bg-transparent border-slate-200 text-slate-500'
                                  }`}
                                >
                                  All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateDraft(filter.key, true)}
                                  className={`px-2 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                                    currentValue === true
                                      ? 'bg-[#FA8A63] border-[#FA8A63] text-white'
                                      : 'bg-white border-slate-200 text-slate-600'
                                  }`}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateDraft(filter.key, false)}
                                  className={`px-2 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                                    currentValue === false
                                      ? 'bg-[#FA8A63] border-[#FA8A63] text-white'
                                      : 'bg-white border-slate-200 text-slate-600'
                                  }`}
                                >
                                  No
                                </button>
                              </div>
                            ) : filter.control === 'numeric-range' ||
                              filter.control === 'date-range' ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type={
                                      filter.control === 'date-range' ? 'date' : 'number'
                                    }
                                    min={filter.key === 'year' ? 1900 : undefined}
                                    max={filter.key === 'year' ? 2100 : undefined}
                                    placeholder="From"
                                    value={currentValue?.from || ''}
                                    onChange={(e) =>
                                      updateDraft(filter.key, {
                                        ...(currentValue || {}),
                                        from: e.target.value
                                      })
                                    }
                                    className="w-1/2 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                                  />
                                  <span className="text-slate-400 text-[11px]">to</span>
                                  <input
                                    type={
                                      filter.control === 'date-range' ? 'date' : 'number'
                                    }
                                    min={filter.key === 'year' ? 1900 : undefined}
                                    max={filter.key === 'year' ? 2100 : undefined}
                                    placeholder="To"
                                    value={currentValue?.to || ''}
                                    onChange={(e) =>
                                      updateDraft(filter.key, {
                                        ...(currentValue || {}),
                                        to: e.target.value
                                      })
                                    }
                                    className="w-1/2 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                                  />
                                </div>
                                <label className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentValue?.includeMissing)}
                                    onChange={(e) =>
                                      updateDraft(filter.key, {
                                        ...(currentValue || {}),
                                        includeMissing: e.target.checked
                                      })
                                    }
                                    className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63]"
                                  />
                                  <span>Include empty / missing values</span>
                                </label>
                                {hasError && (
                                  <p className="text-[10px] text-red-600 font-semibold">
                                    {hasError}
                                  </p>
                                )}
                              </div>
                            ) : filter.control === 'multi-select' ? (
                              multiOptions.length === 0 ? (
                                <div className="px-2.5 py-2 rounded border border-dashed border-slate-200 bg-slate-100/70 text-[11px] text-slate-400 italic select-none">
                                  No values available in current scope
                                </div>
                              ) : (
                                <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                                  {multiOptions.length > 5 && (
                                    <div className="px-2 py-1 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50/60">
                                      <Search size={11} className="text-slate-400 shrink-0" />
                                      <input
                                        type="text"
                                        placeholder="Search options..."
                                        value={multiOptionSearch[filter.key] || ''}
                                        onChange={(e) =>
                                          setMultiOptionSearch((prev) => ({
                                            ...prev,
                                            [filter.key]: e.target.value
                                          }))
                                        }
                                        className="w-full text-[11px] bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none"
                                      />
                                    </div>
                                  )}
                                  <div className="max-h-24 overflow-y-auto p-1 space-y-0.5">
                                    {filteredMultiOptions.length === 0 ? (
                                      <div className="px-2 py-1.5 text-[10px] text-slate-400 italic">
                                        No matching option
                                      </div>
                                    ) : (
                                      filteredMultiOptions.map((opt) => {
                                        const selectedArr: string[] = Array.isArray(currentValue)
                                          ? currentValue
                                          : [];
                                        const checked = selectedArr.some(
                                          (x) => x.toLowerCase() === opt.toLowerCase()
                                        );
                                        return (
                                          <label
                                            key={opt}
                                            className={`flex items-center gap-2 px-1.5 py-1 rounded text-[11px] cursor-pointer transition-colors ${
                                              checked
                                                ? 'bg-orange-50 text-[#B85324] font-semibold'
                                                : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={() => toggleMultiOption(filter.key, opt)}
                                              className="w-3.5 h-3.5 rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63]"
                                            />
                                            <span className="truncate">{opt}</span>
                                          </label>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )
                            ) : (
                              <div>
                                <input
                                  type="text"
                                  list={`filter-suggest-${filter.key}`}
                                  placeholder="Type to filter..."
                                  value={currentValue || ''}
                                  onChange={(e) => updateDraft(filter.key, e.target.value)}
                                  className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                                />
                                {searchSuggestions.length > 0 && (
                                  <datalist id={`filter-suggest-${filter.key}`}>
                                    {searchSuggestions.map((s) => (
                                      <option key={s} value={s} />
                                    ))}
                                  </datalist>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Fixed Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Matching <span className="font-bold text-slate-900">{liveMatchedCount}</span>{' '}
            {liveMatchedCount === 1 ? 'vehicle' : 'vehicles'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              Apply filters
            </button>
          </div>
        </div>

        {/* Discard Confirmation Modal */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-6 z-20">
            <div className="bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full space-y-3 border border-slate-200">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <AlertCircle size={18} />
                <span>Discard unsaved filter changes?</span>
              </div>
              <p className="text-xs text-slate-600">
                You have unsaved changes in your filters. Closing will revert back to your currently applied filter set.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
                >
                  Discard changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
