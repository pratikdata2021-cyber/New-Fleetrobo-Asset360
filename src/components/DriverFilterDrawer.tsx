import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { Driver, DRIVER_LOOKUPS } from '../types/driver';
import { ALL_27_DRIVER_FILTERS, DriverFilterDefinition } from '../types/driverFilters';
import { getCanonicalTransporterNames, getCanonicalTransporterVendors } from '../data/vendorsSeed';
import { InfoTooltip } from './InfoTooltip';

interface DriverFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: Record<string, any>;
  filterMode: 'basic' | 'advanced';
  onApplyFilters: (filters: Record<string, any>, mode: 'basic' | 'advanced') => void;
  totalMatchedCount: number;
}

export const DriverFilterDrawer: React.FC<DriverFilterDrawerProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  filterMode: initialMode,
  onApplyFilters,
  totalMatchedCount
}) => {
  const [mode, setMode] = useState<'basic' | 'advanced'>(initialMode);
  const [draftFilters, setDraftFilters] = useState<Record<string, any>>({ ...appliedFilters });
  const [searchFilterQuery, setSearchFilterQuery] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [rangeErrors, setRangeErrors] = useState<Record<string, string>>({});
  const [vendorRefreshTick, setVendorRefreshTick] = useState(0);

  useEffect(() => {
    const onVendorsUpdated = () => setVendorRefreshTick(t => t + 1);
    window.addEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
    return () => window.removeEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
  }, []);


  const isDirty = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters) || mode !== initialMode;

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
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
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

  const handleApply = () => {
    // Validate range errors
    const errs: Record<string, string> = {};
    Object.keys(draftFilters).forEach((key) => {
      const val = draftFilters[key];
      if (val && typeof val === 'object' && val.from && val.to) {
        if (Number(val.from) > Number(val.to)) {
          errs[key] = 'From value cannot exceed To value.';
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

  const handleClearAll = () => {
    setDraftFilters({});
    setRangeErrors({});
  };

  // Transporter options respond to selected companies and include canonical Transporter Vendors
  const availableTransporters = useMemo(() => {
    void vendorRefreshTick;
    const selectedCompanies: string[] = draftFilters.company || [];
    if (selectedCompanies.length === 0) {
      return getCanonicalTransporterNames(undefined, DRIVER_LOOKUPS.transporters);
    }
    const set = new Set<string>();
    selectedCompanies.forEach((comp) => {
      const canonical = getCanonicalTransporterVendors(comp).map(v => v.name);
      canonical.forEach((t) => set.add(t));
      const ts = DRIVER_LOOKUPS.companyTransporterMap[comp] || [];
      ts.forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [draftFilters.company, vendorRefreshTick]);

  // Grouped filters by section
  const groupedFilters = useMemo(() => {
    const q = searchFilterQuery.toLowerCase().trim();
    const groups: Record<string, DriverFilterDefinition[]> = {};

    ALL_27_DRIVER_FILTERS.forEach((def) => {
      if (!q || def.label.toLowerCase().includes(q) || def.section.toLowerCase().includes(q)) {
        if (!groups[def.section]) {
          groups[def.section] = [];
        }
        groups[def.section].push(def);
      }
    });

    return groups;
  }, [searchFilterQuery]);

  const activeCount = Object.keys(draftFilters).length;

  if (!isOpen) return null;

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
                : 'Advanced Mode (OR) — Matches drivers satisfying any active criteria (Status remains AND).'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseAttempt}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                mode === 'basic' ? 'bg-[#FA8A63] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Basic (AND)
            </button>
            <button
              type="button"
              onClick={() => setMode('advanced')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'advanced' ? 'bg-[#FA8A63] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
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
              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FA8A63]"
            />
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-[#FA8A63] hover:underline font-semibold shrink-0 cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Scrollable Filters List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {Object.keys(groupedFilters).length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No filters found matching "{searchFilterQuery}".
            </div>
          ) : (
            Object.entries(groupedFilters).map(([sectionName, filterList]) => (
              <div key={sectionName} className="space-y-2.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span>{sectionName}</span>
                  <span className="text-slate-400">{filterList.length}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {filterList.map((filter) => {
                    const currentValue = draftFilters[filter.key];
                    const hasError = rangeErrors[filter.key];
                    const options = filter.key === 'transporter' ? availableTransporters : (filter.options || []);

                    return (
                      <div key={filter.key} className="space-y-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-800 flex items-center">
                            {filter.label}
                            <InfoTooltip content={filter.tooltip} />
                          </label>
                          {currentValue !== undefined && (
                            <button
                              type="button"
                              onClick={() => updateDraft(filter.key, undefined)}
                              className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {/* Filter Input based on Control type */}
                        {filter.control === 'multi' && (
                          <div className="space-y-1">
                            <select
                              value={Array.isArray(currentValue) ? (currentValue[0] || '') : (currentValue || '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateDraft(filter.key, val ? [val] : undefined);
                              }}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                            >
                              <option value="">All / Any</option>
                              {options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {filter.control === 'text' && (
                          <input
                            type="text"
                            placeholder={`Contains ${filter.label.toLowerCase()}...`}
                            value={currentValue || ''}
                            onChange={(e) => updateDraft(filter.key, e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                          />
                        )}

                        {filter.control === 'date' && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={currentValue?.from || ''}
                              onChange={(e) => updateDraft(filter.key, { ...currentValue, from: e.target.value })}
                              className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-700"
                              title="From date"
                            />
                            <span className="text-slate-400 text-xs">to</span>
                            <input
                              type="date"
                              value={currentValue?.to || ''}
                              onChange={(e) => updateDraft(filter.key, { ...currentValue, to: e.target.value })}
                              className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-700"
                              title="To date"
                            />
                          </div>
                        )}

                        {filter.control === 'number' && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                placeholder="Min"
                                value={currentValue?.from || ''}
                                onChange={(e) => updateDraft(filter.key, { ...currentValue, from: e.target.value })}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700"
                              />
                              <span className="text-slate-400 text-xs">-</span>
                              <input
                                type="number"
                                placeholder="Max"
                                value={currentValue?.to || ''}
                                onChange={(e) => updateDraft(filter.key, { ...currentValue, to: e.target.value })}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700"
                              />
                            </div>
                            {hasError && <p className="text-[10px] text-red-500">{hasError}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600">
            {totalMatchedCount === 0 ? (
              <span className="text-amber-600 font-semibold">0 drivers match current criteria</span>
            ) : (
              <span>Estimated matches: <strong className="text-slate-900">{totalMatchedCount}</strong> drivers</span>
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
