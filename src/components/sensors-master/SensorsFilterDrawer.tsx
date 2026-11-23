import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Gauge,
  Layers,
  Search,
  X
} from 'lucide-react';
import {
  EffectiveSensorStatus,
  SENSOR_EFFECTIVE_STATUS_OPTIONS,
  SENSOR_MAPPING_FILTER_STATUS_OPTIONS,
  SensorMappingFilterStatus,
  SensorRecord
} from '../../types/modalMaster';
import { getModelCategoryById } from '../../types/modelCategoryMaster';

export interface SensorsAdvancedFilters {
  organizations: string[];
  kinds: string[];
  manufacturers: string[];
  models: string[];
  identifierTypes: string[];
  measurementCapabilities: string[];
  measurementUnits: string[];
  measurementRanges: string[];
  measurementRangeQuery: string;
  connectionModes: string[];
  sensorStatuses: EffectiveSensorStatus[];
  mappingStatuses: SensorMappingFilterStatus[];
  inventoryLocations: string[];
  registeredFrom: string;
  registeredTo: string;
  updatedFrom: string;
  updatedTo: string;
}

export const DEFAULT_SENSORS_FILTERS: SensorsAdvancedFilters = {
  organizations: [],
  kinds: [],
  manufacturers: [],
  models: [],
  identifierTypes: [],
  measurementCapabilities: [],
  measurementUnits: [],
  measurementRanges: [],
  measurementRangeQuery: '',
  connectionModes: [],
  sensorStatuses: [],
  mappingStatuses: [],
  inventoryLocations: [],
  registeredFrom: '',
  registeredTo: '',
  updatedFrom: '',
  updatedTo: ''
};

export function resolveSensorConnectionMode(sensor: SensorRecord): string {
  if (!sensor.modelTypeId) return '';
  const model = getModelCategoryById(sensor.modelTypeId);
  if (!model || model.category !== 'Sensor') return '';
  return (model.connectionMode || '').trim();
}

export function countActiveSensorFilters(
  filters: SensorsAdvancedFilters,
  isPlatformAdmin: boolean
): number {
  return (
    (isPlatformAdmin && filters.organizations.length > 0 ? 1 : 0) +
    (filters.kinds.length > 0 ? 1 : 0) +
    (filters.manufacturers.length > 0 ? 1 : 0) +
    (filters.models.length > 0 ? 1 : 0) +
    (filters.identifierTypes.length > 0 ? 1 : 0) +
    (filters.measurementCapabilities.length > 0 ? 1 : 0) +
    (filters.measurementUnits.length > 0 ? 1 : 0) +
    (filters.measurementRanges.length > 0 || filters.measurementRangeQuery.trim() ? 1 : 0) +
    (filters.connectionModes.length > 0 ? 1 : 0) +
    (filters.sensorStatuses.length > 0 ? 1 : 0) +
    (filters.mappingStatuses.length > 0 ? 1 : 0) +
    (filters.inventoryLocations.length > 0 ? 1 : 0) +
    (filters.registeredFrom || filters.registeredTo ? 1 : 0) +
    (filters.updatedFrom || filters.updatedTo ? 1 : 0)
  );
}

export function matchesSensorsFilters(
  sensor: SensorRecord,
  filters: SensorsAdvancedFilters,
  effectiveStatus: EffectiveSensorStatus,
  mappingStatus: SensorMappingFilterStatus,
  isPlatformAdmin: boolean
): boolean {
  if (
    isPlatformAdmin &&
    filters.organizations.length > 0 &&
    !filters.organizations.includes((sensor.company || '').trim())
  ) {
    return false;
  }

  if (filters.kinds.length > 0 && !filters.kinds.includes((sensor.kind || '').trim())) {
    return false;
  }

  if (
    filters.manufacturers.length > 0 &&
    !filters.manufacturers.includes((sensor.manufacturer || '').trim())
  ) {
    return false;
  }

  if (filters.models.length > 0 && !filters.models.includes((sensor.modelText || '').trim())) {
    return false;
  }

  if (
    filters.identifierTypes.length > 0 &&
    !filters.identifierTypes.includes((sensor.identifierType || '').trim())
  ) {
    return false;
  }

  if (
    filters.measurementCapabilities.length > 0 &&
    !filters.measurementCapabilities.includes((sensor.measurementCapability || '').trim())
  ) {
    return false;
  }

  if (
    filters.measurementUnits.length > 0 &&
    !filters.measurementUnits.includes((sensor.measurementUnit || '').trim())
  ) {
    return false;
  }

  if (filters.measurementRanges.length > 0) {
    const rangeStr = (sensor.measurementRange || '').trim();
    if (!rangeStr || !filters.measurementRanges.includes(rangeStr)) {
      return false;
    }
  }

  if (filters.measurementRangeQuery.trim()) {
    const rq = filters.measurementRangeQuery.trim().toLowerCase();
    const rangeStr = (sensor.measurementRange || '').trim().toLowerCase();
    if (!rangeStr.includes(rq)) {
      return false;
    }
  }

  if (filters.connectionModes.length > 0) {
    const connMode = resolveSensorConnectionMode(sensor);
    if (!connMode || !filters.connectionModes.includes(connMode)) {
      return false;
    }
  }

  if (
    filters.sensorStatuses.length > 0 &&
    !filters.sensorStatuses.includes(effectiveStatus)
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
    !filters.inventoryLocations.includes((sensor.inventoryLocation || '').trim())
  ) {
    return false;
  }

  if (filters.registeredFrom || filters.registeredTo) {
    const regDay = (sensor.registeredAt || '').slice(0, 10);
    if (!regDay) return false;
    if (filters.registeredFrom && regDay < filters.registeredFrom) return false;
    if (filters.registeredTo && regDay > filters.registeredTo) return false;
  }

  if (filters.updatedFrom || filters.updatedTo) {
    const updDay = (sensor.updatedAt || '').slice(0, 10);
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
}

const SearchableMultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = 'All'
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
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

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
              ? selected.join(', ')
              : `${selected.length} selected (${selected[0]} +${selected.length - 1})`}
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
                        {opt}
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

interface SensorsFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: SensorsAdvancedFilters;
  onApplyFilters: (next: SensorsAdvancedFilters) => void;
  authorizedSensors: SensorRecord[];
  enabledSensorModels?: {
    typeName: string;
    manufacturer: string;
    modelReference: string;
    identifierType?: string;
    measurementType?: string;
    measurementUnit?: string;
    connectionMode?: string;
  }[];
  effectiveStatusById: Map<string, EffectiveSensorStatus>;
  mappingStatusById: Map<string, SensorMappingFilterStatus>;
  isPlatformAdmin: boolean;
}

export const SensorsFilterDrawer: React.FC<SensorsFilterDrawerProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  onApplyFilters,
  authorizedSensors,
  enabledSensorModels = [],
  effectiveStatusById,
  mappingStatusById,
  isPlatformAdmin
}) => {
  const [draft, setDraft] = useState<SensorsAdvancedFilters>(appliedFilters);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    classification: false,
    measurement: false,
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

  // Scope candidate pool when organization(s) selected inside draft for dependent dropdowns
  const scopedForOptions = useMemo(() => {
    if (!isPlatformAdmin || draft.organizations.length === 0) return authorizedSensors;
    return authorizedSensors.filter((s) =>
      draft.organizations.includes((s.company || '').trim())
    );
  }, [authorizedSensors, isPlatformAdmin, draft.organizations]);

  // Dynamic options from actual authorized Sensor records and tenant-enabled Sensor models (zero invented presets)
  const options = useMemo(() => {
    const organizations = Array.from(
      new Set(authorizedSensors.map((s) => (s.company || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const kinds = Array.from(
      new Set([
        ...scopedForOptions.map((s) => (s.kind || '').trim()),
        ...enabledSensorModels.map((m) => (m.typeName || '').trim())
      ].filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const manufacturers = Array.from(
      new Set([
        ...scopedForOptions.map((s) => (s.manufacturer || '').trim()),
        ...enabledSensorModels.map((m) => (m.manufacturer || '').trim())
      ].filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const models = Array.from(
      new Set([
        ...scopedForOptions.map((s) => (s.modelText || '').trim()),
        ...enabledSensorModels.map((m) => (m.modelReference || '').trim())
      ].filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const identifierTypes = Array.from(
      new Set(
        scopedForOptions.map((s) => (s.identifierType || '').trim()).filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const measurementCapabilities = Array.from(
      new Set(
        scopedForOptions
          .map((s) => (s.measurementCapability || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const measurementUnits = Array.from(
      new Set(
        scopedForOptions.map((s) => (s.measurementUnit || '').trim()).filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const measurementRanges = Array.from(
      new Set(
        scopedForOptions.map((s) => (s.measurementRange || '').trim()).filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const connectionModes = Array.from(
      new Set(
        scopedForOptions.map((s) => resolveSensorConnectionMode(s)).filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const inventoryLocations = Array.from(
      new Set(
        scopedForOptions
          .map((s) => (s.inventoryLocation || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return {
      organizations,
      kinds,
      manufacturers,
      models,
      identifierTypes,
      measurementCapabilities,
      measurementUnits,
      measurementRanges,
      connectionModes,
      inventoryLocations
    };
  }, [authorizedSensors, scopedForOptions, enabledSensorModels]);

  const draftFilterCount = useMemo(
    () => countActiveSensorFilters(draft, isPlatformAdmin),
    [draft, isPlatformAdmin]
  );

  const previewCount = useMemo(() => {
    return authorizedSensors.filter((s) => {
      const eff = effectiveStatusById.get(s.id) || 'Inventory';
      const mapSt = mappingStatusById.get(s.id) || 'Unmapped';
      return matchesSensorsFilters(s, draft, eff, mapSt, isPlatformAdmin);
    }).length;
  }, [authorizedSensors, draft, effectiveStatusById, mappingStatusById, isPlatformAdmin]);

  if (!isOpen) return null;

  const handleResetDraft = () => {
    setDraft(DEFAULT_SENSORS_FILTERS);
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
            <h2 className="text-base font-bold text-slate-900">Filter Sensors</h2>
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
                  label="Sensor Type"
                  options={options.kinds}
                  selected={draft.kinds}
                  onChange={(next) => setDraft((p) => ({ ...p, kinds: next }))}
                  placeholder="All Sensor Types"
                />
                <SearchableMultiSelect
                  label="Vendor / Manufacturer"
                  options={options.manufacturers}
                  selected={draft.manufacturers}
                  onChange={(next) => setDraft((p) => ({ ...p, manufacturers: next }))}
                  placeholder="All Manufacturers"
                />
                <SearchableMultiSelect
                  label="Sensor Model"
                  options={options.models}
                  selected={draft.models}
                  onChange={(next) => setDraft((p) => ({ ...p, models: next }))}
                  placeholder="All Models"
                />
                {options.identifierTypes.length > 0 && (
                  <SearchableMultiSelect
                    label="Identifier Type"
                    options={options.identifierTypes}
                    selected={draft.identifierTypes}
                    onChange={(next) => setDraft((p) => ({ ...p, identifierTypes: next }))}
                    placeholder="All Identifier Types"
                  />
                )}
              </div>
            )}
          </div>

          {/* Section 2: Measurement & Technical Data */}
          <div className="rounded-xl border border-slate-200 overflow-visible bg-white">
            <button
              type="button"
              onClick={() => toggleSection('measurement')}
              className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-xl flex items-center justify-between font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-600" />
                <span>2. Measurement &amp; Technical Data</span>
              </div>
              {collapsed.measurement ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {!collapsed.measurement && (
              <div className="p-4 space-y-3">
                <SearchableMultiSelect
                  label="Measurement Capability / Type"
                  options={options.measurementCapabilities}
                  selected={draft.measurementCapabilities}
                  onChange={(next) =>
                    setDraft((p) => ({ ...p, measurementCapabilities: next }))
                  }
                  placeholder="All Capabilities"
                />
                <SearchableMultiSelect
                  label="Measurement Unit"
                  options={options.measurementUnits}
                  selected={draft.measurementUnits}
                  onChange={(next) => setDraft((p) => ({ ...p, measurementUnits: next }))}
                  placeholder="All Units"
                />
                {options.measurementRanges.length > 0 && (
                  <SearchableMultiSelect
                    label="Measurement Range"
                    options={options.measurementRanges}
                    selected={draft.measurementRanges}
                    onChange={(next) => setDraft((p) => ({ ...p, measurementRanges: next }))}
                    placeholder="All Saved Ranges"
                  />
                )}
                <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800">
                      Range Text Search
                    </label>
                    {draft.measurementRangeQuery && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((p) => ({ ...p, measurementRangeQuery: '' }))
                        }
                        className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={draft.measurementRangeQuery}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, measurementRangeQuery: e.target.value }))
                    }
                    placeholder="Search saved range text (e.g. 600 L, +85)..."
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>
                {options.connectionModes.length > 0 && (
                  <SearchableMultiSelect
                    label="Sensor Connection Mode"
                    options={options.connectionModes}
                    selected={draft.connectionModes}
                    onChange={(next) => setDraft((p) => ({ ...p, connectionModes: next }))}
                    placeholder="All Connection Modes"
                  />
                )}
              </div>
            )}
          </div>

          {/* Section 3: Inventory & Asset Mapping */}
          <div className="rounded-xl border border-slate-200 overflow-visible bg-white">
            <button
              type="button"
              onClick={() => toggleSection('inventory')}
              className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-xl flex items-center justify-between font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <span>3. Inventory &amp; Asset Mapping</span>
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
                  label="Sensor Status"
                  options={SENSOR_EFFECTIVE_STATUS_OPTIONS}
                  selected={draft.sensorStatuses}
                  onChange={(next) =>
                    setDraft((p) => ({
                      ...p,
                      sensorStatuses: next as EffectiveSensorStatus[]
                    }))
                  }
                  placeholder="All Sensor Statuses"
                />
                <SearchableMultiSelect
                  label="Mapping Status"
                  options={SENSOR_MAPPING_FILTER_STATUS_OPTIONS}
                  selected={draft.mappingStatuses}
                  onChange={(next) =>
                    setDraft((p) => ({
                      ...p,
                      mappingStatuses: next as SensorMappingFilterStatus[]
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
