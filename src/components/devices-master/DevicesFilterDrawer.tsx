import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Search,
  X
} from 'lucide-react';
import {
  DEVICE_EFFECTIVE_STATUS_OPTIONS,
  DEVICE_MAPPING_FILTER_STATUS_OPTIONS,
  DeviceMappingFilterStatus,
  DeviceRecord,
  EffectiveDeviceStatus
} from '../../types/modalMaster';

export interface DevicesAdvancedFilters {
  organizations: string[];
  categories: string[];
  manufacturers: string[];
  models: string[];
  identifierTypes: string[];
  modes: string[];
  protocols: string[];
  channels: string[];
  deviceStatuses: EffectiveDeviceStatus[];
  mappingStatuses: DeviceMappingFilterStatus[];
  inventoryLocations: string[];
  registeredFrom: string;
  registeredTo: string;
  updatedFrom: string;
  updatedTo: string;
}

export const DEFAULT_DEVICES_FILTERS: DevicesAdvancedFilters = {
  organizations: [],
  categories: [],
  manufacturers: [],
  models: [],
  identifierTypes: [],
  modes: [],
  protocols: [],
  channels: [],
  deviceStatuses: [],
  mappingStatuses: [],
  inventoryLocations: [],
  registeredFrom: '',
  registeredTo: '',
  updatedFrom: '',
  updatedTo: ''
};

export function extractDeviceModes(device: DeviceRecord): string[] {
  const fromArray = Array.isArray(device.modes) ? device.modes : [];
  const fromCsv = device.mode ? device.mode.split(',') : [];
  return Array.from(
    new Set([...fromArray, ...fromCsv].map((s) => s.trim()).filter(Boolean))
  );
}

export function extractDeviceProtocols(device: DeviceRecord): string[] {
  const fromArray = Array.isArray(device.platformProtocols) ? device.platformProtocols : [];
  const fromCsv = device.platformProtocol ? device.platformProtocol.split(',') : [];
  return Array.from(
    new Set([...fromArray, ...fromCsv].map((s) => s.trim()).filter(Boolean))
  );
}

export function countActiveDeviceFilters(
  filters: DevicesAdvancedFilters,
  isPlatformAdmin: boolean
): number {
  return (
    (isPlatformAdmin && filters.organizations.length > 0 ? 1 : 0) +
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.manufacturers.length > 0 ? 1 : 0) +
    (filters.models.length > 0 ? 1 : 0) +
    (filters.identifierTypes.length > 0 ? 1 : 0) +
    (filters.modes.length > 0 ? 1 : 0) +
    (filters.protocols.length > 0 ? 1 : 0) +
    (filters.channels.length > 0 ? 1 : 0) +
    (filters.deviceStatuses.length > 0 ? 1 : 0) +
    (filters.mappingStatuses.length > 0 ? 1 : 0) +
    (filters.inventoryLocations.length > 0 ? 1 : 0) +
    (filters.registeredFrom || filters.registeredTo ? 1 : 0) +
    (filters.updatedFrom || filters.updatedTo ? 1 : 0)
  );
}

export function matchesDevicesFilters(
  device: DeviceRecord,
  filters: DevicesAdvancedFilters,
  effectiveStatus: EffectiveDeviceStatus,
  mappingStatus: DeviceMappingFilterStatus,
  isPlatformAdmin: boolean
): boolean {
  if (
    isPlatformAdmin &&
    filters.organizations.length > 0 &&
    !filters.organizations.includes(device.company || '')
  ) {
    return false;
  }

  if (filters.categories.length > 0 && !filters.categories.includes(device.kind || '')) {
    return false;
  }

  if (
    filters.manufacturers.length > 0 &&
    !filters.manufacturers.includes(device.manufacturer || '')
  ) {
    return false;
  }

  if (filters.models.length > 0 && !filters.models.includes(device.modelText || '')) {
    return false;
  }

  if (
    filters.identifierTypes.length > 0 &&
    !filters.identifierTypes.includes(device.identifierType || '')
  ) {
    return false;
  }

  if (filters.modes.length > 0) {
    const devModes = extractDeviceModes(device);
    if (!filters.modes.some((m) => devModes.includes(m))) {
      return false;
    }
  }

  if (filters.protocols.length > 0) {
    const devProtocols = extractDeviceProtocols(device);
    if (!filters.protocols.some((p) => devProtocols.includes(p))) {
      return false;
    }
  }

  if (filters.channels.length > 0) {
    const chVal = device.channelCount != null ? String(device.channelCount) : '';
    if (!chVal || !filters.channels.includes(chVal)) {
      return false;
    }
  }

  if (
    filters.deviceStatuses.length > 0 &&
    !filters.deviceStatuses.includes(effectiveStatus)
  ) {
    return false;
  }

  if (
    filters.mappingStatuses.length > 0 &&
    !filters.mappingStatuses.includes(mappingStatus)
  ) {
    return false;
  }

  if (
    filters.inventoryLocations.length > 0 &&
    !filters.inventoryLocations.includes((device.inventoryLocation || '').trim())
  ) {
    return false;
  }

  if (filters.registeredFrom || filters.registeredTo) {
    const regDay = (device.registeredAt || '').slice(0, 10);
    if (!regDay) return false;
    if (filters.registeredFrom && regDay < filters.registeredFrom) return false;
    if (filters.registeredTo && regDay > filters.registeredTo) return false;
  }

  if (filters.updatedFrom || filters.updatedTo) {
    const updDay = (device.updatedAt || '').slice(0, 10);
    if (!updDay) return false;
    if (filters.updatedFrom && updDay < filters.updatedFrom) return false;
    if (filters.updatedTo && updDay > filters.updatedTo) return false;
  }

  return true;
}

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  formatOption?: (opt: string) => string;
}

const SearchableMultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = 'All',
  formatOption
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const disp = formatOption ? formatOption(o) : o;
      return disp.toLowerCase().includes(q) || o.toLowerCase().includes(q);
    });
  }, [options, query, formatOption]);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((x) => x !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div
      className="space-y-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100"
      ref={containerRef}
    >
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-800">{label}</label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`w-full h-8 px-2.5 bg-white border rounded-lg text-xs text-left flex items-center justify-between transition-colors cursor-pointer ${
            open
              ? 'border-[#FA8A63] ring-1 ring-[#FA8A63]/30'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span
            className={`truncate ${
              selected.length === 0 ? 'text-slate-400' : 'text-slate-800 font-medium'
            }`}
          >
            {selected.length === 0
              ? placeholder
              : selected.length <= 2
              ? selected.map((v) => (formatOption ? formatOption(v) : v)).join(', ')
              : `${selected.length} selected (${
                  formatOption ? formatOption(selected[0]) : selected[0]
                } +${selected.length - 1})`}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {open && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 overflow-hidden">
            <div className="p-1.5 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search options..."
                  className="w-full pl-6 pr-2 py-1 text-[11px] bg-white border border-slate-200 rounded focus:outline-none focus:border-[#FA8A63]"
                />
              </div>
            </div>
            <div className="max-h-44 overflow-y-auto divide-y divide-slate-50 p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-3 text-center text-[11px] text-slate-400">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const checked = selected.includes(opt);
                  const display = formatOption ? formatOption(opt) : opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleOption(opt)}
                      className="w-full px-2 py-1.5 rounded text-left text-xs flex items-center gap-2 hover:bg-orange-50/50 cursor-pointer"
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                          checked
                            ? 'bg-[#FA8A63] text-white'
                            : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {checked && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                      </span>
                      <span
                        className={`truncate ${
                          checked ? 'font-semibold text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {display}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface DevicesFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: DevicesAdvancedFilters;
  onApplyFilters: (next: DevicesAdvancedFilters) => void;
  authorizedDevices: DeviceRecord[];
  effectiveStatusById: Map<string, EffectiveDeviceStatus>;
  mappingStatusById: Map<string, DeviceMappingFilterStatus>;
  isPlatformAdmin: boolean;
}

export const DevicesFilterDrawer: React.FC<DevicesFilterDrawerProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  onApplyFilters,
  authorizedDevices,
  effectiveStatusById,
  mappingStatusById,
  isPlatformAdmin
}) => {
  const [draft, setDraft] = useState<DevicesAdvancedFilters>(appliedFilters);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    classification: false,
    configuration: false,
    inventory: false,
    dates: false
  });
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(appliedFilters);
      setDateError(null);
    }
  }, [isOpen, appliedFilters]);

  const toggleSection = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Dynamically derive options strictly from actual authorized device records
  const options = useMemo(() => {
    const organizations = Array.from(
      new Set(authorizedDevices.map((d) => (d.company || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const categories = Array.from(
      new Set(authorizedDevices.map((d) => (d.kind || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const manufacturers = Array.from(
      new Set(authorizedDevices.map((d) => (d.manufacturer || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const models = Array.from(
      new Set(authorizedDevices.map((d) => (d.modelText || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const identifierTypes = Array.from(
      new Set(authorizedDevices.map((d) => (d.identifierType || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const modes = Array.from(
      new Set(authorizedDevices.flatMap((d) => extractDeviceModes(d)))
    ).sort((a, b) => a.localeCompare(b));

    const protocols = Array.from(
      new Set(authorizedDevices.flatMap((d) => extractDeviceProtocols(d)))
    ).sort((a, b) => a.localeCompare(b));

    const channels = Array.from(
      new Set(
        authorizedDevices
          .map((d) => (d.channelCount != null ? String(d.channelCount) : ''))
          .filter(Boolean)
      )
    ).sort((a, b) => Number(a) - Number(b));

    const inventoryLocations = Array.from(
      new Set(
        authorizedDevices
          .map((d) => (d.inventoryLocation || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return {
      organizations,
      categories,
      manufacturers,
      models,
      identifierTypes,
      modes,
      protocols,
      channels,
      inventoryLocations
    };
  }, [authorizedDevices]);

  const draftFilterCount = useMemo(
    () => countActiveDeviceFilters(draft, isPlatformAdmin),
    [draft, isPlatformAdmin]
  );

  const previewCount = useMemo(() => {
    return authorizedDevices.filter((d) => {
      const eff = effectiveStatusById.get(d.id) || 'Inventory';
      const mapSt = mappingStatusById.get(d.id) || 'Unmapped';
      return matchesDevicesFilters(d, draft, eff, mapSt, isPlatformAdmin);
    }).length;
  }, [authorizedDevices, draft, effectiveStatusById, mappingStatusById, isPlatformAdmin]);

  if (!isOpen) return null;

  const handleResetDraft = () => {
    setDraft(DEFAULT_DEVICES_FILTERS);
    setDateError(null);
  };

  const handleApply = () => {
    if (draft.registeredFrom && draft.registeredTo && draft.registeredFrom > draft.registeredTo) {
      setDateError('Registered On "From" date cannot be after "To" date.');
      return;
    }
    if (draft.updatedFrom && draft.updatedTo && draft.updatedFrom > draft.updatedTo) {
      setDateError('Last Updated "From" date cannot be after "To" date.');
      return;
    }
    setDateError(null);
    onApplyFilters(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[520px] max-w-full h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Filter Devices</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-[#FA8A63]">
              {draftFilterCount} active
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDraft}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
            >
              Reset all
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Filter Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {dateError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {dateError}
            </div>
          )}

          {/* Section 1: Organization & Classification */}
          <div className="rounded-xl border border-slate-200 overflow-visible bg-white">
            <button
              type="button"
              onClick={() => toggleSection('classification')}
              className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-xl flex items-center justify-between font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FA8A63]" />
                <span>1. Organization &amp; Classification</span>
              </div>
              {collapsed.classification ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {!collapsed.classification && (
              <div className="p-4 space-y-3">
                {isPlatformAdmin && (
                  <SearchableMultiSelect
                    label="Organization"
                    options={options.organizations}
                    selected={draft.organizations}
                    onChange={(next) => setDraft((p) => ({ ...p, organizations: next }))}
                    placeholder="All Organizations"
                  />
                )}
                <SearchableMultiSelect
                  label="Device Category"
                  options={options.categories}
                  selected={draft.categories}
                  onChange={(next) => setDraft((p) => ({ ...p, categories: next }))}
                  placeholder="All Device Categories"
                />
                <SearchableMultiSelect
                  label="Manufacturer / Vendor"
                  options={options.manufacturers}
                  selected={draft.manufacturers}
                  onChange={(next) => setDraft((p) => ({ ...p, manufacturers: next }))}
                  placeholder="All Manufacturers"
                />
                <SearchableMultiSelect
                  label="Model Name / Number"
                  options={options.models}
                  selected={draft.models}
                  onChange={(next) => setDraft((p) => ({ ...p, models: next }))}
                  placeholder="All Models"
                />
              </div>
            )}
          </div>

          {/* Section 2: Device Configuration */}
          <div className="rounded-xl border border-slate-200 overflow-visible bg-white">
            <button
              type="button"
              onClick={() => toggleSection('configuration')}
              className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-xl flex items-center justify-between font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>2. Device Configuration</span>
              </div>
              {collapsed.configuration ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {!collapsed.configuration && (
              <div className="p-4 space-y-3">
                <SearchableMultiSelect
                  label="Identifier Type"
                  options={options.identifierTypes}
                  selected={draft.identifierTypes}
                  onChange={(next) => setDraft((p) => ({ ...p, identifierTypes: next }))}
                  placeholder="All Identifier Types"
                />
                <SearchableMultiSelect
                  label="Device Mode"
                  options={options.modes}
                  selected={draft.modes}
                  onChange={(next) => setDraft((p) => ({ ...p, modes: next }))}
                  placeholder="All Device Modes"
                />
                <SearchableMultiSelect
                  label="Platform Protocol"
                  options={options.protocols}
                  selected={draft.protocols}
                  onChange={(next) => setDraft((p) => ({ ...p, protocols: next }))}
                  placeholder="All Platform Protocols"
                />
                {options.channels.length > 0 && (
                  <SearchableMultiSelect
                    label="Number of Channels"
                    options={options.channels}
                    selected={draft.channels}
                    onChange={(next) => setDraft((p) => ({ ...p, channels: next }))}
                    placeholder="All Channel Counts"
                    formatOption={(c) => `${c} ${Number(c) === 1 ? 'Channel' : 'Channels'}`}
                  />
                )}
              </div>
            )}
          </div>

          {/* Section 3: Inventory & Mapping */}
          <div className="rounded-xl border border-slate-200 overflow-visible bg-white">
            <button
              type="button"
              onClick={() => toggleSection('inventory')}
              className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-xl flex items-center justify-between font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <span>3. Inventory &amp; Mapping</span>
              </div>
              {collapsed.inventory ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {!collapsed.inventory && (
              <div className="p-4 space-y-3">
                <SearchableMultiSelect
                  label="Device Status"
                  options={DEVICE_EFFECTIVE_STATUS_OPTIONS}
                  selected={draft.deviceStatuses}
                  onChange={(next) =>
                    setDraft((p) => ({
                      ...p,
                      deviceStatuses: next as EffectiveDeviceStatus[]
                    }))
                  }
                  placeholder="All Device Statuses"
                />
                <SearchableMultiSelect
                  label="Mapping Status"
                  options={DEVICE_MAPPING_FILTER_STATUS_OPTIONS}
                  selected={draft.mappingStatuses}
                  onChange={(next) =>
                    setDraft((p) => ({
                      ...p,
                      mappingStatuses: next as DeviceMappingFilterStatus[]
                    }))
                  }
                  placeholder="All Mapping Statuses"
                />
                <SearchableMultiSelect
                  label="Inventory Location"
                  options={options.inventoryLocations}
                  selected={draft.inventoryLocations}
                  onChange={(next) => setDraft((p) => ({ ...p, inventoryLocations: next }))}
                  placeholder="All Inventory Locations"
                />
              </div>
            )}
          </div>

          {/* Section 4: Dates */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => toggleSection('dates')}
              className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-600" />
                <span>4. Dates</span>
              </div>
              {collapsed.dates ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {!collapsed.dates && (
              <div className="p-4 space-y-3.5">
                <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-800">Registered On</label>
                    {(draft.registeredFrom || draft.registeredTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft((p) => ({ ...p, registeredFrom: '', registeredTo: '' }));
                          setDateError(null);
                        }}
                        className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">From</span>
                      <input
                        type="date"
                        value={draft.registeredFrom}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, registeredFrom: e.target.value }));
                          setDateError(null);
                        }}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-[11px] focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">To</span>
                      <input
                        type="date"
                        value={draft.registeredTo}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, registeredTo: e.target.value }));
                          setDateError(null);
                        }}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-[11px] focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-800">Last Updated</label>
                    {(draft.updatedFrom || draft.updatedTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft((p) => ({ ...p, updatedFrom: '', updatedTo: '' }));
                          setDateError(null);
                        }}
                        className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">From</span>
                      <input
                        type="date"
                        value={draft.updatedFrom}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, updatedFrom: e.target.value }));
                          setDateError(null);
                        }}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-[11px] focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">To</span>
                      <input
                        type="date"
                        value={draft.updatedTo}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, updatedTo: e.target.value }));
                          setDateError(null);
                        }}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-[11px] focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Drawer Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetDraft}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            Reset All ({draftFilterCount})
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Apply Filters ({previewCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
