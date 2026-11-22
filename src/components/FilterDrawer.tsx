import React, { useState, useEffect } from 'react';
import { X, Search, Check, AlertCircle } from 'lucide-react';
import { ALL_61_FILTERS, FilterDefinition } from '../types/filters';
import { DEMO_LOOKUPS } from '../types/vehicle';
import { getCanonicalTransporterNames } from '../data/vendorsSeed';
import { InfoTooltip } from './InfoTooltip';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: Record<string, any>;
  filterMode: 'basic' | 'advanced';
  onApplyFilters: (filters: Record<string, any>, mode: 'basic' | 'advanced') => void;
  totalMatchedCount: number;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  filterMode: initialMode,
  onApplyFilters,
  totalMatchedCount,
}) => {
  const [mode, setMode] = useState<'basic' | 'advanced'>(initialMode);
  const [draftFilters, setDraftFilters] = useState<Record<string, any>>({ ...appliedFilters });
  const [searchFilterQuery, setSearchFilterQuery] = useState('');
  const [showAllAdvanced, setShowAllAdvanced] = useState(false);
  const [rangeErrors, setRangeErrors] = useState<Record<string, string>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [vendorRefreshTick, setVendorRefreshTick] = useState(0);

  useEffect(() => {
    const onVendorsUpdated = () => setVendorRefreshTick(t => t + 1);
    window.addEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
    return () => window.removeEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
  }, []);

  if (!isOpen) return null;

  const isDirty = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters) || mode !== initialMode;

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleApply = () => {
    // Validate range errors
    const errors: Record<string, string> = {};
    Object.keys(draftFilters).forEach((key) => {
      const val = draftFilters[key];
      if (val && typeof val === 'object' && val.from && val.to) {
        if (Number(val.from) > Number(val.to)) {
          errors[key] = 'From value cannot exceed To value';
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setRangeErrors(errors);
      return;
    }

    setRangeErrors({});
    onApplyFilters(draftFilters, mode);
    onClose();
  };

  const handleClearAll = () => {
    setDraftFilters({});
    setRangeErrors({});
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
  };

  // Filter definitions based on mode
  const visibleFilterDefs = ALL_61_FILTERS.filter((def) => {
    if (searchFilterQuery.trim()) {
      const q = searchFilterQuery.toLowerCase();
      return def.label.toLowerCase().includes(q) || def.group.toLowerCase().includes(q);
    }
    if (mode === 'basic') {
      return def.isBasicDefault || draftFilters[def.key] !== undefined;
    }
    return showAllAdvanced || def.isBasicDefault || draftFilters[def.key] !== undefined;
  });

  // Group filters
  const groupedFilters = visibleFilterDefs.reduce<Record<string, FilterDefinition[]>>((acc, def) => {
    acc[def.group] = acc[def.group] || [];
    acc[def.group].push(def);
    return acc;
  }, {});

  const getOptionsForFilter = (key: string): string[] => {
    if (key === 'company') return DEMO_LOOKUPS.companies;
    if (key === 'status') return [...DEMO_LOOKUPS.operationalStatuses];
    if (key === 'transporter') {
      void vendorRefreshTick;
      return getCanonicalTransporterNames(undefined, DEMO_LOOKUPS.transporters);
    }
    if (key === 'vendor') return DEMO_LOOKUPS.vendors;
    if (key === 'driver') return DEMO_LOOKUPS.drivers;
    if (key === 'fleets') return DEMO_LOOKUPS.fleets;
    if (key === 'trailers') return DEMO_LOOKUPS.trailers;
    if (key === 'hub') return DEMO_LOOKUPS.hubs;
    if (key === 'client') return DEMO_LOOKUPS.clients;
    if (key === 'route') return DEMO_LOOKUPS.routes;
    if (key === 'route_type') return DEMO_LOOKUPS.routeTypes;
    if (key === 'fuel_type') return DEMO_LOOKUPS.fuelTypes;
    if (key === 'category') return DEMO_LOOKUPS.categories;
    if (key === 'type') return DEMO_LOOKUPS.vehicleTypes;
    if (key === 'class') return DEMO_LOOKUPS.vehicleClasses;
    if (key === 'make') return DEMO_LOOKUPS.makes;
    if (key === 'model') return DEMO_LOOKUPS.models;
    if (key === 'alert_type') return DEMO_LOOKUPS.alertTypes;
    if (key === 'shared_company') return DEMO_LOOKUPS.companies;
    return ['Option 1', 'Option 2', 'Option 3'];
  };

  const activeCount = Object.keys(draftFilters).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={handleCloseAttempt} 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
      />

      {/* 675px Right Drawer */}
      <div className="relative w-[675px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-slate-900">Sectional Filters</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-[#FA8A63] border border-orange-200">
                {activeCount} active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {mode === 'basic' 
                ? 'Basic Mode (AND) — All applied conditions must be satisfied.' 
                : 'Advanced Mode (OR) — Matches vehicles satisfying any active condition.'}
            </p>
          </div>
          <button
            onClick={handleCloseAttempt}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar & Search Inside Drawer */}
        <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => setMode('basic')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                mode === 'basic' ? 'bg-[#FA8A63] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Basic (AND)
            </button>
            <button
              onClick={() => setMode('advanced')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                mode === 'advanced' ? 'bg-[#FA8A63] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
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
              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FA8A63]"
            />
          </div>

          {mode === 'advanced' && (
            <button
              onClick={() => setShowAllAdvanced(!showAllAdvanced)}
              className="text-[11px] font-semibold text-[#FA8A63] hover:underline shrink-0"
            >
              {showAllAdvanced ? 'Show default' : 'Show all 61'}
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
            Object.entries(groupedFilters).map(([groupName, filterList]) => (
              <div key={groupName} className="space-y-2.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span>{groupName}</span>
                  <span className="text-slate-400">{filterList.length}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {filterList.map((filter) => {
                    const currentValue = draftFilters[filter.key];
                    const hasError = rangeErrors[filter.key];

                    return (
                      <div key={filter.key} className="space-y-1 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-800 flex items-center">
                            {filter.label}
                            <InfoTooltip content={filter.note} />
                          </label>
                          {currentValue && (
                            <button
                              onClick={() => updateDraft(filter.key, undefined)}
                              className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
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
                              className={`px-2 py-1 text-[11px] font-medium rounded border ${
                                currentValue === undefined ? 'bg-white border-slate-300 text-slate-800' : 'bg-transparent border-slate-200 text-slate-500'
                              }`}
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => updateDraft(filter.key, true)}
                              className={`px-2 py-1 text-[11px] font-medium rounded border ${
                                currentValue === true ? 'bg-[#FA8A63] border-[#FA8A63] text-white' : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => updateDraft(filter.key, false)}
                              className={`px-2 py-1 text-[11px] font-medium rounded border ${
                                currentValue === false ? 'bg-[#FA8A63] border-[#FA8A63] text-white' : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        ) : filter.control === 'numeric-range' || filter.control === 'date-range' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                type={filter.control === 'date-range' ? 'date' : 'number'}
                                placeholder="From"
                                value={currentValue?.from || ''}
                                onChange={(e) => updateDraft(filter.key, { ...currentValue, from: e.target.value })}
                                className="w-1/2 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                              />
                              <span className="text-slate-400 text-xs">to</span>
                              <input
                                type={filter.control === 'date-range' ? 'date' : 'number'}
                                placeholder="To"
                                value={currentValue?.to || ''}
                                onChange={(e) => updateDraft(filter.key, { ...currentValue, to: e.target.value })}
                                className="w-1/2 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                              />
                            </div>
                            {hasError && (
                              <p className="text-[10px] text-red-500 font-medium">{hasError}</p>
                            )}
                          </div>
                        ) : filter.control === 'multi-select' ? (
                          <select
                            multiple
                            value={Array.isArray(currentValue) ? currentValue : []}
                            onChange={(e) => {
                              const opts = Array.from(e.target.selectedOptions, (option) => option.value);
                              updateDraft(filter.key, opts);
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63] h-16"
                          >
                            {getOptionsForFilter(filter.key).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="Type to filter..."
                            value={currentValue || ''}
                            onChange={(e) => updateDraft(filter.key, e.target.value)}
                            className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Fixed Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Matching <span className="font-bold text-slate-900">{totalMatchedCount}</span> vehicles
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Clear all
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
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
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md"
                >
                  Keep editing
                </button>
                <button
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700"
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
