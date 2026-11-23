import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Bookmark,
  Trash2,
  Layers,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Power,
  StopCircle,
  Ban
} from 'lucide-react';
import {
  ALL_MODAL_CONNECTION_COLUMNS,
  MODAL_CONNECTION_DEFAULT_COLUMNS,
  SavedModalView,
  ConnectionLifecycleStatus
} from '../../types/modalMaster';
import { ModelCategoryRecord } from '../../types/modelCategoryMaster';
import {
  DirectBulkUploadView,
  formatUploadFileSize,
  useDirectUploadState
} from '../common/DirectBulkUploadView';

export const MappingInfoTooltip: React.FC<{ text: string; align?: 'left' | 'right' | 'center' }> = ({
  text,
  align = 'center'
}) => (
  <span className="relative group inline-flex items-center ml-1 align-middle" onClick={(e) => e.stopPropagation()}>
    <button
      type="button"
      tabIndex={0}
      aria-label={text}
      className="w-[15px] h-[15px] rounded-full border border-[#d6dfe8] bg-white text-[#5c6b7a] hover:text-[#17212b] hover:border-[#94a3b8] inline-flex items-center justify-center text-[10px] font-semibold cursor-help focus:outline-none"
    >
      i
    </button>
    <span
      role="tooltip"
      className={`pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute top-full mt-1.5 w-60 p-2 rounded-lg bg-[#17212b] text-white text-[11px] font-normal normal-case tracking-normal leading-relaxed shadow-xl z-[95] border border-slate-700 ${
        align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2'
      }`}
    >
      {text}
    </span>
  </span>
);

interface FiltersDrawerProps {
  isPlatformAdmin?: boolean;
  activeCompanyScope?: string;
  filterOrganization?: string;
  setFilterOrganization?: (v: string) => void;
  organizationOptions?: string[];
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterSite?: string;
  setFilterSite?: (v: string) => void;
  siteOptions?: string[];
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  filterDeviceModelId: string;
  setFilterDeviceModelId: (v: string) => void;
  filterBindingMode: string;
  setFilterBindingMode: (v: string) => void;
  filterBindingState: string;
  setFilterBindingState: (v: string) => void;
  filterBindingHealth?: string;
  setFilterBindingHealth?: (v: string) => void;
  filterResourceAllocated: string;
  setFilterResourceAllocated: (v: string) => void;
  filterUpdatedFrom: string;
  setFilterUpdatedFrom: (v: string) => void;
  filterUpdatedTo: string;
  setFilterUpdatedTo: (v: string) => void;
  enabledDeviceModels: ModelCategoryRecord[];
  activeFilterCount?: number;
  onClearAll: () => void;
  onClose: () => void;
}

export const ModalConnectionFiltersDrawer: React.FC<FiltersDrawerProps> = ({
  isPlatformAdmin = false,
  activeCompanyScope = 'All Clients',
  filterOrganization = 'All',
  setFilterOrganization,
  organizationOptions = [],
  filterStatus,
  setFilterStatus,
  filterSite = 'All',
  setFilterSite,
  siteOptions = [],
  filterCategory,
  setFilterCategory,
  filterDeviceModelId,
  setFilterDeviceModelId,
  filterBindingMode,
  setFilterBindingMode,
  filterBindingState,
  setFilterBindingState,
  filterBindingHealth = 'All',
  setFilterBindingHealth,
  filterResourceAllocated,
  setFilterResourceAllocated,
  filterUpdatedFrom,
  setFilterUpdatedFrom,
  filterUpdatedTo,
  setFilterUpdatedTo,
  enabledDeviceModels,
  activeFilterCount = 0,
  onClearAll,
  onClose
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    org_conn: true,
    hardware: true,
    binding: true,
    resource: true,
    dates: true
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasDateRangeError =
    Boolean(filterUpdatedFrom) &&
    Boolean(filterUpdatedTo) &&
    filterUpdatedFrom > filterUpdatedTo;

  const showOrgFilter = isPlatformAdmin && activeCompanyScope === 'All Clients' && Boolean(setFilterOrganization);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
      <div className="w-full max-w-[420px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F26522]">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-slate-900">Filter Connections</h3>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#FFF3EE] text-[#F26522] border border-[#F26522]/30 text-[11px] font-bold">
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-slate-500">Refine connections by status, hardware, bindings & resources</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsible Sections Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC] text-[12px]">
          {/* Section 1: Organization & Connection */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            <button
              type="button"
              onClick={() => toggleSection('org_conn')}
              className="w-full px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-left cursor-pointer"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                1. Organization & Connection
              </span>
              {openSections.org_conn ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {openSections.org_conn && (
              <div className="p-4 space-y-3.5">
                {showOrgFilter && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-800">Organization</label>
                      <MappingInfoTooltip text="Filter connections by client organization." align="right" />
                    </div>
                    <select
                      value={filterOrganization}
                      onChange={(e) => setFilterOrganization?.(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                    >
                      <option value="All">All Organizations</option>
                      {organizationOptions.map((org) => (
                        <option key={org} value={org}>
                          {org}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-800">Connection Status</label>
                    <MappingInfoTooltip
                      text="Filter by computed connection lifecycle status (Draft, Scheduled, Active, Inactive, Needs Attention)."
                      align="right"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                  >
                    {['All', 'Draft', 'Scheduled', 'Active', 'Inactive', 'Needs Attention'].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                {setFilterSite && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-800">Site / Terminal</label>
                      <MappingInfoTooltip text="Filter by recorded site or operational terminal." align="right" />
                    </div>
                    <select
                      value={filterSite}
                      onChange={(e) => setFilterSite(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                    >
                      <option value="All">All Sites</option>
                      {siteOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Hardware Composition */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            <button
              type="button"
              onClick={() => toggleSection('hardware')}
              className="w-full px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-left cursor-pointer"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                2. Hardware Composition
              </span>
              {openSections.hardware ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {openSections.hardware && (
              <div className="p-4 space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-800">Hardware Category Present</label>
                    <MappingInfoTooltip
                      text="Find connections that include at least one unit in the selected category."
                      align="right"
                    />
                  </div>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                  >
                    {['All', 'Device', 'Sensor', 'SIM'].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-800">Device Model Type</label>
                    <MappingInfoTooltip
                      text="Filter connections containing a specific registered Device model enabled for this client."
                      align="right"
                    />
                  </div>
                  <select
                    value={filterDeviceModelId}
                    onChange={(e) => setFilterDeviceModelId(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                  >
                    <option value="All">All Enabled Device Models</option>
                    {enabledDeviceModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.typeName} {m.manufacturer ? `· ${m.manufacturer}` : ''}{' '}
                        {m.modelReference ? `(${m.modelReference})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Binding & Activation */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            <button
              type="button"
              onClick={() => toggleSection('binding')}
              className="w-full px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-left cursor-pointer"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                3. Binding & Activation
              </span>
              {openSections.binding ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {openSections.binding && (
              <div className="p-4 space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-800">Binding Mode Present</label>
                    <MappingInfoTooltip
                      text="Find connections containing at least one binding with this period type."
                      align="right"
                    />
                  </div>
                  <select
                    value={filterBindingMode}
                    onChange={(e) => setFilterBindingMode(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                  >
                    {['All', 'Permanent', 'Temporal', 'None'].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-800">Binding State</label>
                    <MappingInfoTooltip
                      text="Filter by state of any contained pairwise binding."
                      align="right"
                    />
                  </div>
                  <select
                    value={filterBindingState}
                    onChange={(e) => setFilterBindingState(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                  >
                    {['All', 'Active', 'Scheduled', 'Ended', 'Conflict', 'None'].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                {setFilterBindingHealth && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-800">Binding Health</label>
                      <MappingInfoTooltip
                        text="Filter by overall binding integrity (All valid, Mixed, Conflict, or No bindings)."
                        align="right"
                      />
                    </div>
                    <select
                      value={filterBindingHealth}
                      onChange={(e) => setFilterBindingHealth(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                    >
                      {['All', 'All valid', 'Mixed', 'Conflict', 'No bindings'].map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Resource Allocation */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            <button
              type="button"
              onClick={() => toggleSection('resource')}
              className="w-full px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-left cursor-pointer"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                4. Resource Allocation
              </span>
              {openSections.resource ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {openSections.resource && (
              <div className="p-4 space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-800">Resource Allocated</label>
                    <MappingInfoTooltip
                      text="Filter connections by active allocated resource type or unallocated state."
                      align="right"
                    />
                  </div>
                  <select
                    value={filterResourceAllocated}
                    onChange={(e) => setFilterResourceAllocated(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                  >
                    {['All', 'Vehicle', 'Driver', 'Fleet', 'Vendor', 'Place', 'Equipment', 'Unallocated'].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Dates */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            <button
              type="button"
              onClick={() => toggleSection('dates')}
              className="w-full px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-left cursor-pointer"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                5. Dates
              </span>
              {openSections.dates ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {openSections.dates && (
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800">Updated On Range</label>
                  <MappingInfoTooltip
                    text="Filter by last change timestamp (From date must be on or before To date)."
                    align="right"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="block text-[10.5px] font-medium text-slate-500 mb-1">From</span>
                    <input
                      type="date"
                      value={filterUpdatedFrom}
                      max={filterUpdatedTo || undefined}
                      onChange={(e) => setFilterUpdatedFrom(e.target.value)}
                      className={`w-full h-9 px-2 rounded-lg border text-[12px] ${
                        hasDateRangeError ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <span className="block text-[10.5px] font-medium text-slate-500 mb-1">To</span>
                    <input
                      type="date"
                      value={filterUpdatedTo}
                      min={filterUpdatedFrom || undefined}
                      onChange={(e) => setFilterUpdatedTo(e.target.value)}
                      className={`w-full h-9 px-2 rounded-lg border text-[12px] ${
                        hasDateRangeError ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 bg-white'
                      }`}
                    />
                  </div>
                </div>
                {hasDateRangeError && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>"From" date must be earlier than or equal to "To" date.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between bg-white shrink-0">
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear All
          </button>
          <button
            type="button"
            disabled={hasDateRangeError}
            onClick={onClose}
            className="h-9 px-5 rounded-lg bg-[#F26522] disabled:bg-slate-300 text-white text-[12px] font-semibold hover:bg-[#d95417] cursor-pointer"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

interface ColumnsDrawerProps {
  hiddenCols: string[];
  setHiddenCols: React.Dispatch<React.SetStateAction<string[]>>;
  colSearch: string;
  setColSearch: (v: string) => void;
  onRestoreDefaults: () => void;
  onClose: () => void;
}

export const ModalConnectionColumnsDrawer: React.FC<ColumnsDrawerProps> = ({
  hiddenCols,
  setHiddenCols,
  colSearch,
  setColSearch,
  onRestoreDefaults,
  onClose
}) => {
  const lockedKeys = new Set(['id']);
  const filteredCols = ALL_MODAL_CONNECTION_COLUMNS.filter(
    (c) => !colSearch.trim() || c.label.toLowerCase().includes(colSearch.trim().toLowerCase())
  );

  const toggleCol = (key: string) => {
    if (lockedKeys.has(key)) return;
    setHiddenCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/30">
      <div className="w-full max-w-[380px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-slate-900">Configure Columns</h3>
            <p className="text-[11px] text-slate-500">CONNECTION ID & ACTIONS remain pinned.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-3 pb-2 border-b border-slate-100">
          <input
            type="text"
            value={colSearch}
            onChange={(e) => setColSearch(e.target.value)}
            placeholder="Search columns..."
            className="w-full h-8 px-3 rounded-lg border border-slate-200 text-[12px]"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {filteredCols.map((col) => {
            const isLocked = lockedKeys.has(col.key);
            const checked = !hiddenCols.includes(col.key);
            return (
              <label
                key={col.key}
                className={`flex items-center justify-between p-2 rounded-lg border text-[12px] ${
                  isLocked
                    ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isLocked}
                    onChange={() => toggleCol(col.key)}
                    className="accent-[#F26522]"
                  />
                  <span className="font-semibold text-slate-800 truncate">{col.label}</span>
                  {col.optional && (
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 text-[9px] font-semibold">
                      Optional
                    </span>
                  )}
                </div>
                {col.tooltip && <MappingInfoTooltip text={col.tooltip} align="right" />}
              </label>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={onRestoreDefaults}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Restore Defaults ({MODAL_CONNECTION_DEFAULT_COLUMNS.length})
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-[#F26522] text-white text-[12px] font-semibold hover:bg-[#d95417] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

interface SavedViewsDrawerProps {
  views: SavedModalView[];
  newViewName: string;
  setNewViewName: (v: string) => void;
  onSaveView: () => void;
  onApplyView: (v: SavedModalView) => void;
  onDeleteView: (id: string) => void;
  onClose: () => void;
}

export const ModalConnectionSavedViewsDrawer: React.FC<SavedViewsDrawerProps> = ({
  views,
  newViewName,
  setNewViewName,
  onSaveView,
  onApplyView,
  onDeleteView,
  onClose
}) => (
  <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/30">
    <div className="w-full max-w-[380px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-[#F26522]" />
          <h3 className="text-[14px] font-bold text-slate-900">Saved Views</h3>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 border-b border-slate-100 space-y-2">
        <label className="block text-[11px] font-bold text-slate-600 uppercase">Save Current Table State</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            placeholder="e.g. Mundra Active Kits"
            className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 text-[12px]"
          />
          <button
            type="button"
            onClick={onSaveView}
            disabled={!newViewName.trim()}
            className="h-8 px-3 rounded-lg bg-[#F26522] disabled:bg-slate-200 text-white text-[12px] font-semibold cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        {views.length === 0 ? (
          <div className="text-center text-[12px] text-slate-400 py-8">No saved views yet.</div>
        ) : (
          views.map((v) => (
            <div key={v.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-slate-900 truncate">{v.name}</div>
                <div className="text-[10px] text-slate-500">
                  Sort: {v.sortKey} ({v.sortDir}) · {v.density || 'comfortable'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onApplyView(v)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#F26522] text-[11px] font-semibold text-slate-800 cursor-pointer"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteView(v.id)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);

interface ExportModalProps {
  selectedCount: number;
  filteredCount: number;
  exportScope: 'filtered' | 'selected';
  setExportScope: (v: 'filtered' | 'selected') => void;
  exportFormat: 'visible-csv' | 'relational-bundle';
  setExportFormat: (v: 'visible-csv' | 'relational-bundle') => void;
  onExport: () => void;
  onClose: () => void;
}

export const ModalConnectionExportModal: React.FC<ExportModalProps> = ({
  selectedCount,
  filteredCount,
  exportScope,
  setExportScope,
  exportFormat,
  setExportFormat,
  onExport,
  onClose
}) => (
  <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/40 p-4">
    <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-[#F26522]" />
          <h3 className="text-[14px] font-bold text-slate-900">Export Assets Connections</h3>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 text-[12px]">
        <div>
          <label className="block font-bold text-slate-700 mb-1.5">Export Scope</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setExportScope('filtered')}
              className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                exportScope === 'filtered' ? 'border-[#F26522] bg-[#FFF3EE]' : 'border-slate-200'
              }`}
            >
              <div className="font-bold text-slate-900">Filtered Dataset</div>
              <div className="text-[11px] text-slate-500">{filteredCount} connection(s)</div>
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => setExportScope('selected')}
              className={`p-2.5 rounded-xl border text-left ${
                selectedCount === 0
                  ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                  : exportScope === 'selected'
                  ? 'border-[#F26522] bg-[#FFF3EE] cursor-pointer'
                  : 'border-slate-200 cursor-pointer'
              }`}
            >
              <div className="font-bold">Selected Rows</div>
              <div className="text-[11px] text-slate-500">{selectedCount} selected</div>
            </button>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1.5">Dataset Structure</label>
          <div className="space-y-2">
            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer ${
                exportFormat === 'visible-csv' ? 'border-[#F26522] bg-[#FFF3EE]/50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                checked={exportFormat === 'visible-csv'}
                onChange={() => setExportFormat('visible-csv')}
                className="mt-0.5 accent-[#F26522]"
              />
              <div>
                <div className="font-bold text-slate-900">Visible Table Columns (CSV)</div>
                <div className="text-[11px] text-slate-500">
                  Exports currently visible columns with explicit timezone and UTF-8 text-safe identifiers.
                </div>
              </div>
            </label>
            <label
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer ${
                exportFormat === 'relational-bundle' ? 'border-[#F26522] bg-[#FFF3EE]/50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                checked={exportFormat === 'relational-bundle'}
                onChange={() => setExportFormat('relational-bundle')}
                className="mt-0.5 accent-[#F26522]"
              />
              <div>
                <div className="font-bold text-slate-900">Full Relational Multi-Dataset Export (4 CSVs)</div>
                <div className="text-[11px] text-slate-500">
                  Downloads separate Connections, Hardware Membership, Pairwise Bindings, and Resource Allocations CSV files without flattening.
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
        <button type="button" onClick={onClose} className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer">
          Cancel
        </button>
        <button
          type="button"
          disabled={exportScope === 'selected' && selectedCount === 0}
          onClick={onExport}
          className="h-8 px-4 rounded-lg bg-[#F26522] disabled:bg-slate-300 text-white text-[12px] font-semibold hover:bg-[#d95417] cursor-pointer"
        >
          Download Export
        </button>
      </div>
    </div>
  </div>
);

interface ImportDrawerProps {
  onProcessUpload: (
    format: 'csv' | 'json',
    rawContent: string
  ) => { uploaded: number; skipped: number; error?: string };
  onClose: () => void;
}

const SAMPLE_CONNECTION_CSV =
  'name,client,hardwareIdentifier,status,site\n' +
  'Mundra – Cold Gate Kit,Adani Mundra,861753060499955,Draft,Mundra CT2';

export const ModalConnectionImportDrawer: React.FC<ImportDrawerProps> = ({
  onProcessUpload,
  onClose
}) => {
  const upload = useDirectUploadState(true);

  const runDirectUpload = (
    fmt: 'csv' | 'json',
    rawText: string,
    fileName: string,
    fileSize?: number
  ) => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      upload.fail('Uploaded file is empty.');
      return;
    }

    upload.startUploading(fileName, formatUploadFileSize(fileSize), () => {
      const result = onProcessUpload(fmt, trimmed);
      if (result.error || result.uploaded === 0) {
        return {
          headline: result.error || 'No valid connections imported',
          description:
            result.error ||
            `0 valid connections found in ${fileName}${
              result.skipped > 0 ? ` (${result.skipped} skipped due to missing or unknown hardware)` : ''
            }.`,
          stats: [
            { label: 'Uploaded', value: 0, tone: 'slate' },
            { label: 'Skipped', value: result.skipped, tone: 'amber' }
          ]
        };
      }

      return {
        headline: 'Connections uploaded successfully',
        description: `${result.uploaded} connection${result.uploaded === 1 ? '' : 's'} created from ${fileName}.${
          result.skipped > 0 ? ` ${result.skipped} invalid or unmatched row${result.skipped === 1 ? '' : 's'} skipped.` : ''
        }`,
        stats: [
          { label: 'Uploaded', value: result.uploaded, tone: 'emerald' },
          { label: 'Skipped', value: result.skipped, tone: result.skipped > 0 ? 'amber' : 'slate' }
        ]
      };
    });
  };

  const handleFileSelected = (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.json')) {
      upload.fail('Please upload a .csv or .json file.');
      return;
    }
    const fmt: 'csv' | 'json' = lower.endsWith('.json') ? 'json' : 'csv';
    const reader = new FileReader();
    reader.onload = (ev) => {
      runDirectUpload(fmt, String(ev.target?.result || ''), file.name, file.size);
    };
    reader.onerror = () => upload.fail('Unable to read the selected file.');
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CONNECTION_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fleetrobo_connections_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/35">
      <div className="w-full max-w-[540px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#F26522]" />
              <h3 className="text-[14px] font-bold text-slate-900">Import Connections</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Upload a CSV or JSON file to import connections directly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <DirectBulkUploadView
            status={upload.status}
            progress={upload.progress}
            fileLabel={upload.fileLabel}
            fileMeta={upload.fileMeta}
            errorMessage={upload.errorMessage}
            doneSummary={upload.doneSummary}
            accept=".csv,.json,text/csv,application/json"
            dropTitle="Choose CSV / JSON or drag & drop"
            dropSubtitle="Columns: name, client, hardwareIdentifier, status, site"
            chooseButtonLabel="Choose file"
            downloadLabel="Download template"
            sampleLabel="Use sample CSV"
            templateTitle="Need a starting format?"
            templateSubtitle="Download CSV template or upload a sample connection."
            doneButtonLabel="Done"
            onFileSelected={handleFileSelected}
            onDownloadTemplate={handleDownloadTemplate}
            onUseSample={() =>
              runDirectUpload('csv', SAMPLE_CONNECTION_CSV, 'sample_connections.csv', SAMPLE_CONNECTION_CSV.length)
            }
            onReset={upload.reset}
            onDone={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export interface BulkConnectionPreviewItem {
  id: string;
  name: string;
  companyName: string;
  effectiveStatus: ConnectionLifecycleStatus;
  openBindingCount: number;
  openAllocCount: number;
}

interface BulkDrawerProps {
  selectedCount: number;
  activeSelectedCount: number;
  activeBindingsInSelection: number;
  selectedItems?: BulkConnectionPreviewItem[];
  onExportSelected: () => void;
  onDeactivateSelected: () => void;
  onEndSelectedBindings: () => void;
  onClose: () => void;
}

export const ModalConnectionBulkDrawer: React.FC<BulkDrawerProps> = ({
  selectedCount,
  activeSelectedCount,
  activeBindingsInSelection,
  selectedItems = [],
  onExportSelected,
  onDeactivateSelected,
  onEndSelectedBindings,
  onClose
}) => {
  const [selectedAction, setSelectedAction] = useState<'export' | 'end-bindings' | 'deactivate'>('deactivate');

  const evaluation = selectedItems.map((item) => {
    if (selectedAction === 'export') {
      return {
        item,
        eligible: true,
        reason: 'Ready for CSV / relational dataset export'
      };
    }
    if (selectedAction === 'end-bindings') {
      if (item.openBindingCount > 0) {
        return {
          item,
          eligible: true,
          reason: `${item.openBindingCount} active/scheduled binding(s) will end now`
        };
      }
      return {
        item,
        eligible: false,
        reason: 'Skipped — 0 open or scheduled hardware bindings on this connection'
      };
    }
    // deactivate
    if (item.effectiveStatus === 'Inactive') {
      return {
        item,
        eligible: false,
        reason: 'Skipped — Connection is already Inactive'
      };
    }
    return {
      item,
      eligible: true,
      reason: `Will set Inactive${
        item.openBindingCount > 0 || item.openAllocCount > 0
          ? ` and end ${item.openBindingCount} binding(s) & ${item.openAllocCount} resource allocation(s)`
          : ''
      }`
    };
  });

  const eligibleRows = evaluation.filter((e) => e.eligible);
  const skippedRows = evaluation.filter((e) => !e.eligible);

  const handleConfirmAction = () => {
    if (selectedAction === 'export') {
      onExportSelected();
      return;
    }
    if (selectedAction === 'end-bindings') {
      if (eligibleRows.length === 0 && activeBindingsInSelection === 0) return;
      onEndSelectedBindings();
      return;
    }
    if (selectedAction === 'deactivate') {
      if (eligibleRows.length === 0 && activeSelectedCount === 0) return;
      onDeactivateSelected();
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex justify-end bg-slate-900/35 backdrop-blur-[1px]">
      <div className="w-[675px] max-w-full bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F26522]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-slate-900">Bulk Operations — Assets Connection</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
                  {selectedCount} Selected
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500">
                Review eligibility, skip reasons, and audit preservation before executing bulk changes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F8FAFC] text-[12px]">
          {/* Summary KPI Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200">
              <div className="text-[10.5px] font-bold uppercase text-slate-400">Selected Rows</div>
              <div className="text-[20px] font-bold text-slate-900 mt-0.5">{selectedCount}</div>
              <div className="text-[11px] text-slate-500">Connections in current scope</div>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="text-[10.5px] font-bold uppercase text-emerald-700">Eligible</div>
              <div className="text-[20px] font-bold text-emerald-800 mt-0.5">{eligibleRows.length}</div>
              <div className="text-[11px] text-emerald-700">Will be processed</div>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="text-[10.5px] font-bold uppercase text-amber-800">Skipped</div>
              <div className="text-[20px] font-bold text-amber-900 mt-0.5">{skippedRows.length}</div>
              <div className="text-[11px] text-amber-700">Protected with reason</div>
            </div>
          </div>

          {/* Step 1: Choose Bulk Action (Preserves exact 3 actions) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                1. Select Bulk Operation
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> Audit History Preserved
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setSelectedAction('export')}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                  selectedAction === 'export'
                    ? 'border-[#F26522] bg-[#FFF3EE]/60'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <Download className="w-4 h-4 text-[#F26522] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Export Selected Connections</div>
                    <div className="text-[11px] text-slate-500">
                      Open export options pre-scoped to your {selectedCount} selected connection(s).
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10.5px] font-semibold shrink-0">
                  {selectedCount} eligible
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('end-bindings')}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                  selectedAction === 'end-bindings'
                    ? 'border-amber-500 bg-amber-50/70'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <StopCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">
                      End Active/Scheduled Binding(s) ({activeBindingsInSelection})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Sets exact end timestamp to now across selected connections and preserves all historical binding records.
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-semibold shrink-0">
                  {selectedItems.filter((i) => i.openBindingCount > 0).length} connection(s)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('deactivate')}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                  selectedAction === 'deactivate'
                    ? 'border-rose-500 bg-rose-50/70'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <Power className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">
                      Deactivate Connection(s) ({selectedItems.filter((i) => i.effectiveStatus !== 'Inactive').length})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Marks selected connections Inactive and safely ends their active/scheduled pairwise bindings & resource allocations with audit logging.
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10.5px] font-semibold shrink-0">
                  {selectedItems.filter((i) => i.effectiveStatus !== 'Inactive').length} eligible
                </span>
              </button>
            </div>
          </div>

          {/* Step 2: Row-by-Row Eligibility & Skip Reasons Preview */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                2. Selected Connections Preview ({evaluation.length})
              </span>
              <span className="text-[11px] text-slate-500">
                {eligibleRows.length} Eligible · {skippedRows.length} Skipped
              </span>
            </div>
            <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-100">
              {evaluation.map(({ item, eligible, reason }) => (
                <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{item.id}</span>
                      <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                      <span className="text-[10.5px] text-slate-400">({item.companyName})</span>
                    </div>
                    <div className={`text-[11px] mt-0.5 ${eligible ? 'text-slate-600' : 'text-amber-700 font-medium'}`}>
                      {reason}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border shrink-0 ${
                      eligible
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {eligible ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Eligible
                      </>
                    ) : (
                      <>
                        <Ban className="w-3 h-3" /> Skipped
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={eligibleRows.length === 0}
            onClick={handleConfirmAction}
            className={`h-9 px-5 rounded-lg text-white text-[12px] font-semibold cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed ${
              selectedAction === 'deactivate'
                ? 'bg-rose-600 hover:bg-rose-700'
                : selectedAction === 'end-bindings'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-[#F26522] hover:bg-[#d95417]'
            }`}
          >
            {selectedAction === 'export'
              ? `Continue to Export (${eligibleRows.length})`
              : selectedAction === 'end-bindings'
              ? `Confirm End Bindings (${eligibleRows.length} Connection${eligibleRows.length === 1 ? '' : 's'})`
              : `Confirm Deactivate (${eligibleRows.length} Connection${eligibleRows.length === 1 ? '' : 's'})`}
          </button>
        </div>
      </div>
    </div>
  );
};

