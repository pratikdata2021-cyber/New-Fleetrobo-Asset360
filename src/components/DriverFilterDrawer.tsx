import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Layers
} from 'lucide-react';
import { Driver } from '../types/driver';
import {
  ALL_27_DRIVER_FILTERS,
  DriverFilterDefinition,
  DriverRangeFilterValue,
  countActiveDriverFilters,
  evaluateDriverFilters,
  getOptionsForDriverFilter,
  isDriverRangeFilterActive,
  sanitizeDriverFilters,
  validateDriverFilterRange
} from '../types/driverFilters';
import { ModalMasterStore, loadModalMasterStore } from '../types/modalMaster';
import { InfoTooltip } from './InfoTooltip';

interface DriverFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: Record<string, any>;
  filterMode: 'basic' | 'advanced';
  onApplyFilters: (filters: Record<string, any>, mode: 'basic' | 'advanced') => void;
  totalMatchedCount: number;
  scopedDrivers?: Driver[];
  baseMatchedDrivers?: Driver[];
  companyContext?: string;
  modalStore?: Pick<ModalMasterStore, 'connections' | 'resourceAllocations' | 'resourceRelationships'>;
  showOrganisationFilter?: boolean;
  organisationFilter?: string;
  organisationOptions?: string[];
  onOrganisationFilterChange?: (org: string) => void;
}

export const DriverFilterDrawer: React.FC<DriverFilterDrawerProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  filterMode: initialMode,
  onApplyFilters,
  totalMatchedCount,
  scopedDrivers = [],
  baseMatchedDrivers,
  companyContext,
  modalStore,
  showOrganisationFilter = false,
  organisationFilter = '',
  organisationOptions = [],
  onOrganisationFilterChange
}) => {
  const [mode, setMode] = useState<'basic' | 'advanced'>(initialMode);
  const [draftFilters, setDraftFilters] = useState<Record<string, any>>(() =>
    sanitizeDriverFilters(appliedFilters)
  );
  const [draftOrg, setDraftOrg] = useState<string>(organisationFilter);
  const [searchFilterQuery, setSearchFilterQuery] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [rangeErrors, setRangeErrors] = useState<Record<string, string>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [multiOptionSearch, setMultiOptionSearch] = useState<Record<string, string>>({});
  const [vendorRefreshTick, setVendorRefreshTick] = useState(0);

  useEffect(() => {
    const onVendorsUpdated = () => setVendorRefreshTick((t) => t + 1);
    window.addEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
    return () => window.removeEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
  }, []);

  // Re-sync draft state whenever drawer opens (prevents stale drafts after Reset / Saved Views)
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setDraftFilters(sanitizeDriverFilters(appliedFilters));
      setDraftOrg(organisationFilter);
      setRangeErrors({});
      setShowDiscardConfirm(false);
      setSearchFilterQuery('');
      setMultiOptionSearch({});
    }
  }, [isOpen, appliedFilters, initialMode, organisationFilter]);

  const sanitizedDraft = useMemo(() => sanitizeDriverFilters(draftFilters), [draftFilters]);
  const sanitizedApplied = useMemo(() => sanitizeDriverFilters(appliedFilters), [appliedFilters]);
  const allDriverIds = useMemo(() => new Set(scopedDrivers.map((d) => d.id)), [scopedDrivers]);

  const liveMatchedCount = useMemo(() => {
    const store = modalStore || loadModalMasterStore();
    const matchesOrg = (d: Driver) =>
      !draftOrg || (d.company || '').trim().toLowerCase() === draftOrg.trim().toLowerCase();
    if (baseMatchedDrivers) {
      return baseMatchedDrivers.filter(
        (d) =>
          matchesOrg(d) &&
          evaluateDriverFilters(d, sanitizedDraft, mode, {
            modalStore: store,
            allDriverIds
          })
      ).length;
    }
    if (scopedDrivers.length > 0) {
      return scopedDrivers.filter(
        (d) =>
          matchesOrg(d) &&
          evaluateDriverFilters(d, sanitizedDraft, mode, {
            modalStore: store,
            allDriverIds
          })
      ).length;
    }
    return totalMatchedCount;
  }, [baseMatchedDrivers, scopedDrivers, sanitizedDraft, mode, totalMatchedCount, modalStore, allDriverIds, draftOrg]);

  // Grouped filters by 5 canonical sections
  const groupedFilters = useMemo(() => {
    const q = searchFilterQuery.toLowerCase().trim();
    const groups: Record<string, DriverFilterDefinition[]> = {};

    ALL_27_DRIVER_FILTERS.forEach((def) => {
      if (
        !q ||
        def.label.toLowerCase().includes(q) ||
        def.section.toLowerCase().includes(q)
      ) {
        if (!groups[def.section]) {
          groups[def.section] = [];
        }
        groups[def.section].push(def);
      }
    });

    return groups;
  }, [searchFilterQuery]);

  if (!isOpen) return null;

  const isDirty =
    JSON.stringify(sanitizedDraft) !== JSON.stringify(sanitizedApplied) ||
    mode !== initialMode ||
    draftOrg !== organisationFilter;

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const updateDraft = (key: string, value: any) => {
    setRangeErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
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
        !isDriverRangeFilterActive(value)
      ) {
        delete next[key];
      } else {
        next[key] = value;
      }

      // When Company selection narrows, prune incompatible Transporter selections
      if (key === 'company' && Array.isArray(next.transporter) && next.transporter.length > 0) {
        const transporterDef = ALL_27_DRIVER_FILTERS.find((f) => f.key === 'transporter');
        if (transporterDef) {
          const validTransporters = new Set(
            getOptionsForDriverFilter(transporterDef, {
              drivers: scopedDrivers,
              companyContext,
              selectedCompanies: Array.isArray(next.company) ? next.company : []
            }).map((t) => t.toLowerCase())
          );
          const filtered = next.transporter.filter((t: string) =>
            validTransporters.has(t.toLowerCase())
          );
          if (filtered.length > 0) {
            next.transporter = filtered;
          } else {
            delete next.transporter;
          }
        }
      }

      return next;
    });
  };

  const handleToggleMultiOption = (key: string, opt: string) => {
    const existing: string[] = Array.isArray(draftFilters[key]) ? draftFilters[key] : [];
    const exists = existing.some((item) => item.toLowerCase() === opt.toLowerCase());
    const updated = exists
      ? existing.filter((item) => item.toLowerCase() !== opt.toLowerCase())
      : [...existing, opt];
    updateDraft(key, updated);
  };

  const handleApply = () => {
    const errs: Record<string, string> = {};
    Object.keys(draftFilters).forEach((key) => {
      const def = ALL_27_DRIVER_FILTERS.find((f) => f.key === key);
      if (!def) return;
      if (def.control === 'date' || def.control === 'number') {
        const err = validateDriverFilterRange(def, draftFilters[key] as DriverRangeFilterValue);
        if (err) errs[key] = err;
      }
    });

    if (Object.keys(errs).length > 0) {
      setRangeErrors(errs);
      return;
    }

    setRangeErrors({});
    onOrganisationFilterChange?.(draftOrg);
    onApplyFilters(sanitizedDraft, mode);
    onClose();
  };

  const handleClearAll = () => {
    setDraftFilters({});
    setDraftOrg('');
    setRangeErrors({});
    setMultiOptionSearch({});
  };

  const toggleSection = (sectionName: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const activeCount = countActiveDriverFilters(sanitizedDraft) + (draftOrg ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={handleCloseAttempt}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* 700px Right Drawer */}
      <div className="relative w-[700px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-slate-900">Driver Sectional Filters</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-[#FA8A63] border border-orange-200">
                {activeCount} active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {mode === 'basic'
                ? 'Basic Mode (AND) — All applied conditions must be satisfied.'
                : 'Advanced Mode (OR) — Matches drivers satisfying any active criteria (Status & tenant remain AND).'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseAttempt}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
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

          {/* Search within 27 filters */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Find filter from 27 definitions..."
              value={searchFilterQuery}
              onChange={(e) => setSearchFilterQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FA8A63]"
            />
            {searchFilterQuery && (
              <button
                type="button"
                onClick={() => setSearchFilterQuery('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 text-xs text-[#FA8A63] hover:underline font-semibold shrink-0 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Clear all</span>
            </button>
          )}
        </div>

        {/* Scrollable Sectional Filters List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {showOrganisationFilter && (
            <div className="border border-slate-200 rounded-xl bg-white p-3.5 space-y-1.5 shadow-2xs">
              <label className="text-xs font-semibold text-slate-700 block">
                Organisation Name
              </label>
              <select
                value={draftOrg}
                onChange={(e) => setDraftOrg(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63] cursor-pointer"
              >
                <option value="">All Organisations</option>
                {organisationOptions.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>
          )}

          {Object.keys(groupedFilters).length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
              No filters found matching "{searchFilterQuery}".
            </div>
          ) : (
            Object.entries(groupedFilters).map(([sectionName, filterList]) => {
              const isCollapsed = Boolean(collapsedSections[sectionName]) && !searchFilterQuery.trim();
              const sectionActiveCount = filterList.filter(
                (f) => sanitizedDraft[f.key] !== undefined
              ).length;

              return (
                <div
                  key={sectionName}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                >
                  {/* Collapsible Section Header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionName)}
                    className="w-full px-3.5 py-2.5 bg-slate-50/90 hover:bg-slate-100/80 border-b border-slate-200/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Layers size={13} className="text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        {sectionName}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        ({filterList.length})
                      </span>
                      {sectionActiveCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-100 text-[#FA8A63]">
                          {sectionActiveCount} active
                        </span>
                      )}
                    </div>
                    {isCollapsed ? (
                      <ChevronDown size={14} className="text-slate-400" />
                    ) : (
                      <ChevronUp size={14} className="text-slate-400" />
                    )}
                  </button>

                  {!isCollapsed && (
                    <div className="p-3 grid grid-cols-2 gap-3">
                      {filterList.map((filter) => {
                        const currentValue = draftFilters[filter.key];
                        const hasError = rangeErrors[filter.key];
                        void vendorRefreshTick;
                        const options =
                          filter.control === 'multi'
                            ? getOptionsForDriverFilter(filter, {
                                drivers: scopedDrivers,
                                companyContext,
                                selectedCompanies: Array.isArray(draftFilters.company)
                                  ? draftFilters.company
                                  : []
                              })
                            : [];
                        const optSearch = (multiOptionSearch[filter.key] || '').trim().toLowerCase();
                        const visibleOptions = optSearch
                          ? options.filter((o) => o.toLowerCase().includes(optSearch))
                          : options;
                        const selectedMulti: string[] = Array.isArray(currentValue)
                          ? currentValue
                          : [];

                        return (
                          <div
                            key={filter.key}
                            className={`space-y-1.5 p-2.5 rounded-lg border transition-colors ${
                              sanitizedDraft[filter.key] !== undefined
                                ? 'bg-orange-50/30 border-orange-200/80'
                                : 'bg-slate-50/50 border-slate-200/70'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs font-semibold text-slate-800 flex items-center">
                                {filter.label}
                                <InfoTooltip content={filter.tooltip} />
                              </label>
                              {currentValue !== undefined && (
                                <button
                                  type="button"
                                  onClick={() => updateDraft(filter.key, undefined)}
                                  className="text-[10px] font-semibold text-slate-400 hover:text-red-500 cursor-pointer shrink-0"
                                >
                                  Reset
                                </button>
                              )}
                            </div>

                            {/* Searchable Multi-Select Checklist */}
                            {filter.control === 'multi' && (
                              <div className="space-y-1.5">
                                {options.length > 5 && (
                                  <div className="relative">
                                    <Search
                                      size={11}
                                      className="absolute left-2 top-1.5 text-slate-400"
                                    />
                                    <input
                                      type="text"
                                      placeholder={`Search ${filter.label.toLowerCase()}...`}
                                      value={multiOptionSearch[filter.key] || ''}
                                      onChange={(e) =>
                                        setMultiOptionSearch((prev) => ({
                                          ...prev,
                                          [filter.key]: e.target.value
                                        }))
                                      }
                                      className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FA8A63]"
                                    />
                                  </div>
                                )}

                                {visibleOptions.length === 0 ? (
                                  <div className="text-[11px] text-slate-400 italic py-1.5 px-2 bg-white rounded border border-slate-200">
                                    No options available
                                  </div>
                                ) : (
                                  <div className="max-h-28 overflow-y-auto bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
                                    {visibleOptions.map((opt) => {
                                      const checked = selectedMulti.some(
                                        (s) => s.toLowerCase() === opt.toLowerCase()
                                      );
                                      return (
                                        <label
                                          key={opt}
                                          className="flex items-center gap-2 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50 cursor-pointer select-none"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() =>
                                              handleToggleMultiOption(filter.key, opt)
                                            }
                                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#FA8A63] focus:ring-0 cursor-pointer shrink-0"
                                          />
                                          <span className="truncate flex-1 font-medium">
                                            {opt}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Text Search Control */}
                            {filter.control === 'text' && (
                              <input
                                type="text"
                                placeholder={`Contains ${filter.label.toLowerCase()}...`}
                                value={currentValue || ''}
                                onChange={(e) => updateDraft(filter.key, e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FA8A63]"
                              />
                            )}

                            {/* Date Range Control */}
                            {filter.control === 'date' && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="date"
                                    value={currentValue?.from || ''}
                                    onChange={(e) =>
                                      updateDraft(filter.key, {
                                        ...(typeof currentValue === 'object' ? currentValue : {}),
                                        from: e.target.value
                                      })
                                    }
                                    className={`w-full px-1.5 py-1 bg-white border rounded text-[11px] text-slate-700 focus:outline-none ${
                                      hasError
                                        ? 'border-red-400'
                                        : 'border-slate-200 focus:border-[#FA8A63]'
                                    }`}
                                    title="From date"
                                  />
                                  <span className="text-slate-400 text-[11px] shrink-0">to</span>
                                  <input
                                    type="date"
                                    value={currentValue?.to || ''}
                                    onChange={(e) =>
                                      updateDraft(filter.key, {
                                        ...(typeof currentValue === 'object' ? currentValue : {}),
                                        to: e.target.value
                                      })
                                    }
                                    className={`w-full px-1.5 py-1 bg-white border rounded text-[11px] text-slate-700 focus:outline-none ${
                                      hasError
                                        ? 'border-red-400'
                                        : 'border-slate-200 focus:border-[#FA8A63]'
                                    }`}
                                    title="To date"
                                  />
                                </div>
                                <label className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentValue?.includeMissing)}
                                    onChange={(e) =>
                                      updateDraft(filter.key, {
                                        ...(typeof currentValue === 'object' ? currentValue : {}),
                                        includeMissing: e.target.checked
                                      })
                                    }
                                    className="w-3 h-3 rounded border-slate-300 text-[#FA8A63] focus:ring-0"
                                  />
                                  <span>Include empty / missing values</span>
                                </label>
                                {hasError && (
                                  <p className="text-[10px] text-red-600 font-medium">{hasError}</p>
                                )}
                              </div>
                            )}

                            {/* Numeric Range Control */}
                            {filter.control === 'number' && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder="Min"
                                    value={currentValue?.from ?? ''}
                                    onChange={(e) =>
                                      updateDraft(filter.key, {
                                        ...(typeof currentValue === 'object' ? currentValue : {}),
                                        from: e.target.value
                                      })
                                    }
                                    className={`w-full px-2 py-1 bg-white border rounded text-xs text-slate-700 focus:outline-none ${
                                      hasError
                                        ? 'border-red-400'
                                        : 'border-slate-200 focus:border-[#FA8A63]'
                                    }`}
                                  />
                                  <span className="text-slate-400 text-xs shrink-0">-</span>
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder="Max"
                                    value={currentValue?.to ?? ''}
                                    onChange={(e) =>
                                      updateDraft(filter.key, {
                                        ...(typeof currentValue === 'object' ? currentValue : {}),
                                        to: e.target.value
                                      })
                                    }
                                    className={`w-full px-2 py-1 bg-white border rounded text-xs text-slate-700 focus:outline-none ${
                                      hasError
                                        ? 'border-red-400'
                                        : 'border-slate-200 focus:border-[#FA8A63]'
                                    }`}
                                  />
                                </div>
                                <label className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentValue?.includeMissing)}
                                    onChange={(e) =>
                                      updateDraft(filter.key, {
                                        ...(typeof currentValue === 'object' ? currentValue : {}),
                                        includeMissing: e.target.checked
                                      })
                                    }
                                    className="w-3 h-3 rounded border-slate-300 text-[#FA8A63] focus:ring-0"
                                  />
                                  <span>Include empty / missing values</span>
                                </label>
                                {hasError && (
                                  <p className="text-[10px] text-red-600 font-medium">{hasError}</p>
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

        {/* Drawer Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600">
            {liveMatchedCount === 0 ? (
              <span className="text-amber-600 font-semibold">
                0 drivers match draft criteria
              </span>
            ) : (
              <span>
                Live preview:{' '}
                <strong className="text-slate-900">{liveMatchedCount}</strong> matching{' '}
                {liveMatchedCount === 1 ? 'driver' : 'drivers'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
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
                You have unsaved changes in your filters. Closing will revert back to your
                currently applied filter set.
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
