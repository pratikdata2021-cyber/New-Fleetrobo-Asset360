import React, { useState, useMemo, useEffect } from 'react';
import { X, Filter, Check, RotateCcw, Search } from 'lucide-react';
import { ClientCompany } from '../../types/companyModelEnablement';

export interface CompanyDirectoryFilters {
  statuses: ('Active' | 'Onboarding' | 'Inactive')[];
  industries: string[];
  locations: string[];
  hasEnabledModels: 'All' | 'Yes' | 'No';
}

export const EMPTY_COMPANY_DIRECTORY_FILTERS: CompanyDirectoryFilters = {
  statuses: [],
  industries: [],
  locations: [],
  hasEnabledModels: 'All',
};

export function countActiveCompanyFilters(f: CompanyDirectoryFilters): number {
  let count = 0;
  if (f.statuses.length > 0) count++;
  if (f.industries.length > 0) count++;
  if (f.locations.length > 0) count++;
  if (f.hasEnabledModels !== 'All') count++;
  return count;
}

interface CompanyDirectoryFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: CompanyDirectoryFilters;
  onApplyFilters: (next: CompanyDirectoryFilters) => void;
  companies: ClientCompany[];
  getCompanyModelAvailabilityCount: (company: ClientCompany) => number;
}

export const CompanyDirectoryFilterDrawer: React.FC<CompanyDirectoryFilterDrawerProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  onApplyFilters,
  companies,
  getCompanyModelAvailabilityCount,
}) => {
  const [draft, setDraft] = useState<CompanyDirectoryFilters>(appliedFilters);
  const [industryQuery, setIndustryQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDraft(appliedFilters);
      setIndustryQuery('');
      setLocationQuery('');
    }
  }, [isOpen, appliedFilters]);

  const tenantCompanies = useMemo(
    () => companies.filter((c) => !c.isPlatformOwner),
    [companies]
  );

  const industryOptions = useMemo(
    () =>
      Array.from(
        new Set(tenantCompanies.map((c) => c.industry.trim()).filter(Boolean))
      ).sort(),
    [tenantCompanies]
  );

  const locationOptions = useMemo(() => {
    const locs = new Set<string>();
    tenantCompanies.forEach((c) => {
      const label = [c.city?.trim(), c.country?.trim()].filter(Boolean).join(', ');
      if (label) locs.add(label);
    });
    return Array.from(locs).sort();
  }, [tenantCompanies]);

  const matchedCount = useMemo(() => {
    return tenantCompanies.filter((c) => {
      if (draft.statuses.length > 0 && !draft.statuses.includes(c.status)) return false;
      if (draft.industries.length > 0 && !draft.industries.includes(c.industry.trim())) return false;
      if (draft.locations.length > 0) {
        const label = [c.city?.trim(), c.country?.trim()].filter(Boolean).join(', ');
        if (!draft.locations.includes(label)) return false;
      }
      if (draft.hasEnabledModels !== 'All') {
        const count = getCompanyModelAvailabilityCount(c);
        if (draft.hasEnabledModels === 'Yes' && count <= 0) return false;
        if (draft.hasEnabledModels === 'No' && count > 0) return false;
      }
      return true;
    }).length;
  }, [tenantCompanies, draft, getCompanyModelAvailabilityCount]);

  if (!isOpen) return null;

  const activeCount = countActiveCompanyFilters(draft);

  const toggleItem = <T extends string>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const filteredIndustries = industryOptions.filter(
    (ind) => !industryQuery.trim() || ind.toLowerCase().includes(industryQuery.trim().toLowerCase())
  );
  const filteredLocations = locationOptions.filter(
    (loc) => !locationQuery.trim() || loc.toLowerCase().includes(locationQuery.trim().toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[130] overflow-hidden flex justify-end">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      <div className="relative w-[520px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#FA8A63]" />
              <h2 className="text-sm font-bold text-slate-900">Company Directory Filters</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-[#FA8A63] border border-orange-200">
                {activeCount} active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Filter tenant companies by lifecycle status, industry vertical, city/country, and enabled model access.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close company filters"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Company Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Company Status
              </label>
              {draft.statuses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, statuses: [] }))}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['Active', 'Onboarding', 'Inactive'] as const).map((st) => {
                const selected = draft.statuses.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        statuses: toggleItem(prev.statuses, st),
                      }))
                    }
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#FA8A63] border-[#FA8A63] text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5" />}
                    <span>{st}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Enabled Models Yes / No */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Enabled Models
              </label>
              {draft.hasEnabledModels !== 'All' && (
                <button
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, hasEnabledModels: 'All' }))}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['All', 'Yes', 'No'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, hasEnabledModels: opt }))}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    draft.hasEnabledModels === opt
                      ? opt === 'All'
                        ? 'bg-slate-800 border-slate-800 text-white'
                        : 'bg-[#FA8A63] border-[#FA8A63] text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt === 'All'
                    ? 'All Companies'
                    : opt === 'Yes'
                    ? 'Yes (Has Models)'
                    : 'No (0 Available)'}
                </button>
              ))}
            </div>
          </div>

          {/* Industry Multi-select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Industry
              </label>
              {draft.industries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, industries: [] }))}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-2 bg-slate-50 border-b border-slate-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={industryQuery}
                    onChange={(e) => setIndustryQuery(e.target.value)}
                    placeholder="Filter industries..."
                    className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto p-1.5 space-y-0.5">
                {filteredIndustries.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-400">No matching industries</div>
                ) : (
                  filteredIndustries.map((ind) => {
                    const checked = draft.industries.includes(ind);
                    return (
                      <button
                        key={ind}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            industries: toggleItem(prev.industries, ind),
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center gap-2 hover:bg-orange-50/50 cursor-pointer"
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                            checked ? 'bg-[#FA8A63] text-white' : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                        </span>
                        <span className={checked ? 'font-semibold text-slate-900' : 'text-slate-700'}>
                          {ind}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* City / Country Multi-select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                City / Country
              </label>
              {draft.locations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, locations: [] }))}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-2 bg-slate-50 border-b border-slate-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    placeholder="Filter city or country..."
                    className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto p-1.5 space-y-0.5">
                {filteredLocations.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-400">No recorded locations</div>
                ) : (
                  filteredLocations.map((loc) => {
                    const checked = draft.locations.includes(loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            locations: toggleItem(prev.locations, loc),
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center gap-2 hover:bg-orange-50/50 cursor-pointer"
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                            checked ? 'bg-[#FA8A63] text-white' : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                        </span>
                        <span className={checked ? 'font-semibold text-slate-900' : 'text-slate-700'}>
                          {loc}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Matching <span className="font-bold text-slate-900">{matchedCount}</span> of{' '}
            <span className="font-semibold text-slate-700">{tenantCompanies.length}</span> companies
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDraft(EMPTY_COMPANY_DIRECTORY_FILTERS)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onApplyFilters(draft);
                onClose();
              }}
              className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
