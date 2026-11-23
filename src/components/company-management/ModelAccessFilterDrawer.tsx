import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Search, Check, RotateCcw, Filter } from 'lucide-react';
import {
  MainCategory,
  ModelCategoryRecord,
  getRecordIdentifierTypes,
} from '../../types/modelCategoryMaster';
import { InUseDetail } from '../../types/companyModelEnablement';

export type YesNoAll = 'All' | 'Yes' | 'No';

export interface ModelAccessFilters {
  categories: MainCategory[];
  typeNames: string[];
  manufacturers: string[];
  modelReferences: string[];
  identifierTypes: string[];
  companyAccess: ('Enabled' | 'Disabled')[];
  globalStatuses: ('Active' | 'Inactive')[];
  currentlyAvailable: YesNoAll;
  pendingChange: YesNoAll;
  deviceFunctions: string[];
  supportedModes: string[];
  supportedProtocols: string[];
  connectivityTypes: string[];
  measurementTypes: string[];
  measurementUnits: string[];
  simTypes: string[];
  simFormFactors: string[];
  inUse: YesNoAll;
  inUseCountMin: string;
  inUseCountMax: string;
  updatedFrom: string;
  updatedTo: string;
}

export const EMPTY_MODEL_ACCESS_FILTERS: ModelAccessFilters = {
  categories: [],
  typeNames: [],
  manufacturers: [],
  modelReferences: [],
  identifierTypes: [],
  companyAccess: [],
  globalStatuses: [],
  currentlyAvailable: 'All',
  pendingChange: 'All',
  deviceFunctions: [],
  supportedModes: [],
  supportedProtocols: [],
  connectivityTypes: [],
  measurementTypes: [],
  measurementUnits: [],
  simTypes: [],
  simFormFactors: [],
  inUse: 'All',
  inUseCountMin: '',
  inUseCountMax: '',
  updatedFrom: '',
  updatedTo: '',
};

export function countActiveModelAccessFilters(f: ModelAccessFilters): number {
  let count = 0;
  if (f.categories.length > 0) count++;
  if (f.typeNames.length > 0) count++;
  if (f.manufacturers.length > 0) count++;
  if (f.modelReferences.length > 0) count++;
  if (f.identifierTypes.length > 0) count++;
  if (f.companyAccess.length > 0) count++;
  if (f.globalStatuses.length > 0) count++;
  if (f.currentlyAvailable !== 'All') count++;
  if (f.pendingChange !== 'All') count++;
  if (f.deviceFunctions.length > 0) count++;
  if (f.supportedModes.length > 0) count++;
  if (f.supportedProtocols.length > 0) count++;
  if (f.connectivityTypes.length > 0) count++;
  if (f.measurementTypes.length > 0) count++;
  if (f.measurementUnits.length > 0) count++;
  if (f.simTypes.length > 0) count++;
  if (f.simFormFactors.length > 0) count++;
  if (f.inUse !== 'All') count++;
  if (f.inUseCountMin.trim() !== '' || f.inUseCountMax.trim() !== '') count++;
  if (f.updatedFrom.trim() !== '' || f.updatedTo.trim() !== '') count++;
  return count;
}

export function clearIncompatibleCategoryFilters(
  f: ModelAccessFilters
): ModelAccessFilters {
  const cats = f.categories;
  const allowDevice = cats.length === 0 || cats.includes('Device');
  const allowSensor = cats.length === 0 || cats.includes('Sensor');
  const allowSim = cats.length === 0 || cats.includes('SIM');

  return {
    ...f,
    deviceFunctions: allowDevice ? f.deviceFunctions : [],
    supportedModes: allowDevice ? f.supportedModes : [],
    supportedProtocols: allowDevice ? f.supportedProtocols : [],
    connectivityTypes: allowDevice ? f.connectivityTypes : [],
    measurementTypes: allowSensor ? f.measurementTypes : [],
    measurementUnits: allowSensor ? f.measurementUnits : [],
    simTypes: allowSim ? f.simTypes : [],
    simFormFactors: allowSim ? f.simFormFactors : [],
  };
}

export interface ModelRowComputed {
  model: ModelCategoryRecord;
  isSavedEnabled: boolean;
  isEffectiveEnabled: boolean;
  isPending: boolean;
  isCurrentlyAvailable: boolean;
  inUseDetail: InUseDetail;
}

export function matchesModelAccessFilters(
  row: ModelRowComputed,
  f: ModelAccessFilters
): boolean {
  const { model, isEffectiveEnabled, isPending, isCurrentlyAvailable, inUseDetail } = row;

  // 1. Model Identity (AND across fields, OR within multi-select)
  if (f.categories.length > 0 && !f.categories.includes(model.category)) return false;
  if (f.typeNames.length > 0 && !f.typeNames.includes(model.typeName)) return false;
  if (f.manufacturers.length > 0 && !f.manufacturers.includes(model.manufacturer || '')) return false;
  if (f.modelReferences.length > 0 && !f.modelReferences.includes(model.modelReference || '')) return false;
  if (f.identifierTypes.length > 0) {
    const recIds = getRecordIdentifierTypes(model);
    if (!f.identifierTypes.some((idType) => recIds.includes(idType))) return false;
  }

  // 2. Access & Eligibility
  if (f.companyAccess.length > 0) {
    const label: 'Enabled' | 'Disabled' = isEffectiveEnabled ? 'Enabled' : 'Disabled';
    if (!f.companyAccess.includes(label)) return false;
  }
  if (f.globalStatuses.length > 0 && !f.globalStatuses.includes(model.status)) return false;
  if (f.currentlyAvailable === 'Yes' && !isCurrentlyAvailable) return false;
  if (f.currentlyAvailable === 'No' && isCurrentlyAvailable) return false;
  if (f.pendingChange === 'Yes' && !isPending) return false;
  if (f.pendingChange === 'No' && isPending) return false;

  // 3. Device Configuration
  if (f.deviceFunctions.length > 0) {
    if (model.category !== 'Device' || !model.deviceFunction || !f.deviceFunctions.includes(model.deviceFunction)) {
      return false;
    }
  }
  if (f.supportedModes.length > 0) {
    const modes = model.supportedModes && model.supportedModes.length > 0
      ? model.supportedModes
      : model.deviceMode
      ? [model.deviceMode]
      : [];
    if (model.category !== 'Device' || !f.supportedModes.some((m) => modes.includes(m))) {
      return false;
    }
  }
  if (f.supportedProtocols.length > 0) {
    const protos = model.supportedProtocols || [];
    if (model.category !== 'Device' || !f.supportedProtocols.some((p) => protos.includes(p))) {
      return false;
    }
  }
  if (f.connectivityTypes.length > 0) {
    const conns = model.connectivity || [];
    if (model.category !== 'Device' || !f.connectivityTypes.some((c) => conns.includes(c))) {
      return false;
    }
  }

  // 4. Sensor / SIM Configuration
  if (f.measurementTypes.length > 0) {
    if (model.category !== 'Sensor' || !model.measurementType || !f.measurementTypes.includes(model.measurementType)) {
      return false;
    }
  }
  if (f.measurementUnits.length > 0) {
    if (model.category !== 'Sensor' || !model.measurementUnit || !f.measurementUnits.includes(model.measurementUnit)) {
      return false;
    }
  }
  if (f.simTypes.length > 0) {
    if (model.category !== 'SIM' || !model.simType || !f.simTypes.includes(model.simType)) {
      return false;
    }
  }
  if (f.simFormFactors.length > 0) {
    if (model.category !== 'SIM' || !model.simFormFactor || !f.simFormFactors.includes(model.simFormFactor)) {
      return false;
    }
  }

  // 5. Usage & Audit
  const inUseCount = inUseDetail.count || 0;
  if (f.inUse === 'Yes' && inUseCount <= 0) return false;
  if (f.inUse === 'No' && inUseCount > 0) return false;
  if (f.inUseCountMin.trim() !== '') {
    const min = Number(f.inUseCountMin);
    if (!Number.isNaN(min) && inUseCount < min) return false;
  }
  if (f.inUseCountMax.trim() !== '') {
    const max = Number(f.inUseCountMax);
    if (!Number.isNaN(max) && inUseCount > max) return false;
  }

  if (f.updatedFrom.trim() !== '' || f.updatedTo.trim() !== '') {
    const updatedDay = (model.updatedAt || '').slice(0, 10);
    if (!updatedDay) return false;
    if (f.updatedFrom.trim() !== '' && updatedDay < f.updatedFrom.trim()) return false;
    if (f.updatedTo.trim() !== '' && updatedDay > f.updatedTo.trim()) return false;
  }

  return true;
}

// Searchable Multi-Select Dropdown Component
interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

const SearchableMultiSelect: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
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
    <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100" ref={containerRef}>
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
          className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-xs text-left flex items-center justify-between transition-colors cursor-pointer ${
            open ? 'border-[#FA8A63] ring-1 ring-[#FA8A63]/30' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`truncate ${selected.length === 0 ? 'text-slate-400' : 'text-slate-800 font-medium'}`}>
            {selected.length === 0
              ? placeholder
              : selected.length <= 2
              ? selected.join(', ')
              : `${selected.length} selected (${selected[0]} +${selected.length - 1})`}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
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
                <div className="py-3 text-center text-[11px] text-slate-400">No matching options</div>
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
                          checked ? 'bg-[#FA8A63] text-white' : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {checked && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                      </span>
                      <span className={`truncate ${checked ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
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

interface YesNoToggleProps {
  label: string;
  value: YesNoAll;
  onChange: (val: YesNoAll) => void;
  hint?: string;
}

const YesNoControl: React.FC<YesNoToggleProps> = ({ label, value, onChange, hint }) => (
  <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
    <div className="flex items-center justify-between">
      <label className="text-xs font-semibold text-slate-800">{label}</label>
      {value !== 'All' && (
        <button
          type="button"
          onClick={() => onChange('All')}
          className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
        >
          Reset
        </button>
      )}
    </div>
    <div className="flex items-center gap-1.5">
      {(['All', 'Yes', 'No'] as YesNoAll[]).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 px-2 py-1 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
            value === opt
              ? opt === 'All'
                ? 'bg-slate-800 border-slate-800 text-white'
                : 'bg-[#FA8A63] border-[#FA8A63] text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
    {hint && <p className="text-[10px] text-slate-400 leading-snug">{hint}</p>}
  </div>
);

interface ModelAccessFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: ModelAccessFilters;
  onApplyFilters: (next: ModelAccessFilters) => void;
  rows: ModelRowComputed[];
  companyName: string;
}

export const ModelAccessFilterDrawer: React.FC<ModelAccessFilterDrawerProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  onApplyFilters,
  rows,
  companyName,
}) => {
  const [draft, setDraft] = useState<ModelAccessFilters>(appliedFilters);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    identity: false,
    access: false,
    device: false,
    sensorSim: false,
    usage: false,
  });
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(appliedFilters);
      setRangeError(null);
    }
  }, [isOpen, appliedFilters]);

  // Dynamically derived option lists from actual catalogue records
  const options = useMemo(() => {
    const categories = Array.from(new Set(rows.map((r) => r.model.category)));
    const typeNames = Array.from(new Set(rows.map((r) => r.model.typeName).filter(Boolean))).sort();
    const manufacturers = Array.from(new Set(rows.map((r) => r.model.manufacturer).filter(Boolean))).sort();
    const modelReferences = Array.from(new Set(rows.map((r) => r.model.modelReference).filter(Boolean))).sort();
    const identifierTypes = Array.from(
      new Set(rows.flatMap((r) => getRecordIdentifierTypes(r.model)))
    ).sort();

    const deviceRows = rows.filter((r) => r.model.category === 'Device');
    const deviceFunctions = Array.from(
      new Set(deviceRows.map((r) => r.model.deviceFunction).filter(Boolean) as string[])
    ).sort();
    const supportedModes = Array.from(
      new Set(
        deviceRows.flatMap((r) =>
          r.model.supportedModes && r.model.supportedModes.length > 0
            ? r.model.supportedModes
            : r.model.deviceMode
            ? [r.model.deviceMode]
            : []
        )
      )
    ).sort();
    const supportedProtocols = Array.from(
      new Set(deviceRows.flatMap((r) => r.model.supportedProtocols || []))
    ).sort();
    const connectivityTypes = Array.from(
      new Set(deviceRows.flatMap((r) => r.model.connectivity || []))
    ).sort();

    const sensorRows = rows.filter((r) => r.model.category === 'Sensor');
    const measurementTypes = Array.from(
      new Set(sensorRows.map((r) => r.model.measurementType).filter(Boolean) as string[])
    ).sort();
    const measurementUnits = Array.from(
      new Set(sensorRows.map((r) => r.model.measurementUnit).filter(Boolean) as string[])
    ).sort();

    const simRows = rows.filter((r) => r.model.category === 'SIM');
    const simTypes = Array.from(
      new Set(simRows.map((r) => r.model.simType).filter(Boolean) as string[])
    ).sort();
    const simFormFactors = Array.from(
      new Set(simRows.map((r) => r.model.simFormFactor).filter(Boolean) as string[])
    ).sort();

    return {
      categories,
      typeNames,
      manufacturers,
      modelReferences,
      identifierTypes,
      deviceFunctions,
      supportedModes,
      supportedProtocols,
      connectivityTypes,
      measurementTypes,
      measurementUnits,
      simTypes,
      simFormFactors,
    };
  }, [rows]);

  const draftMatchedCount = useMemo(
    () => rows.filter((r) => matchesModelAccessFilters(r, draft)).length,
    [rows, draft]
  );

  if (!isOpen) return null;

  const activeCount = countActiveModelAccessFilters(draft);

  const showDeviceSection = draft.categories.length === 0 || draft.categories.includes('Device');
  const showSensorFields = draft.categories.length === 0 || draft.categories.includes('Sensor');
  const showSimFields = draft.categories.length === 0 || draft.categories.includes('SIM');
  const showSensorSimSection = showSensorFields || showSimFields;

  const toggleSection = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApply = () => {
    if (draft.inUseCountMin.trim() !== '' && draft.inUseCountMax.trim() !== '') {
      if (Number(draft.inUseCountMin) > Number(draft.inUseCountMax)) {
        setRangeError('Minimum In-Use count cannot exceed Maximum.');
        return;
      }
    }
    if (draft.updatedFrom.trim() !== '' && draft.updatedTo.trim() !== '') {
      if (draft.updatedFrom > draft.updatedTo) {
        setRangeError('Updated From date cannot be later than To date.');
        return;
      }
    }
    setRangeError(null);
    onApplyFilters(clearIncompatibleCategoryFilters(draft));
    onClose();
  };

  const handleResetAll = () => {
    setDraft(EMPTY_MODEL_ACCESS_FILTERS);
    setRangeError(null);
  };

  return (
    <div className="fixed inset-0 z-[130] overflow-hidden flex justify-end">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      <div className="relative w-[675px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2.5">
              <Filter className="w-4 h-4 text-[#FA8A63]" />
              <h2 className="text-sm font-bold text-slate-900">
                Model Access Filters — {companyName}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-[#FA8A63] border border-orange-200">
                {activeCount} active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              AND across filter groups · OR within multi-select values. Category-specific sections adjust automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter drawer"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Sections */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {rangeError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {rangeError}
            </div>
          )}

          {/* Section 1: Model Identity */}
          <div className="border border-slate-200 rounded-xl bg-white">
            <button
              type="button"
              onClick={() => toggleSection('identity')}
              className="w-full px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between rounded-t-xl cursor-pointer"
            >
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Model Identity
              </span>
              {collapsed.identity ? (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {!collapsed.identity && (
              <div className="p-3.5 grid grid-cols-2 gap-3">
                <SearchableMultiSelect
                  label="Category"
                  options={options.categories}
                  selected={draft.categories}
                  onChange={(vals) =>
                    setDraft((prev) =>
                      clearIncompatibleCategoryFilters({
                        ...prev,
                        categories: vals as MainCategory[],
                      })
                    )
                  }
                  placeholder="All categories (Device, Sensor, SIM)"
                />
                <SearchableMultiSelect
                  label="Model Type"
                  options={options.typeNames}
                  selected={draft.typeNames}
                  onChange={(vals) => setDraft((prev) => ({ ...prev, typeNames: vals }))}
                  placeholder="All model types"
                />
                <SearchableMultiSelect
                  label="Manufacturer / Provider"
                  options={options.manufacturers}
                  selected={draft.manufacturers}
                  onChange={(vals) => setDraft((prev) => ({ ...prev, manufacturers: vals }))}
                  placeholder="All manufacturers / providers"
                />
                <SearchableMultiSelect
                  label="Model Name / Number"
                  options={options.modelReferences}
                  selected={draft.modelReferences}
                  onChange={(vals) => setDraft((prev) => ({ ...prev, modelReferences: vals }))}
                  placeholder="All model numbers"
                />
                <div className="col-span-2">
                  <SearchableMultiSelect
                    label="Identifier Types"
                    options={options.identifierTypes}
                    selected={draft.identifierTypes}
                    onChange={(vals) => setDraft((prev) => ({ ...prev, identifierTypes: vals }))}
                    placeholder="All identifier formats (IMEI, Serial Number, ICCID...)"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Access & Eligibility */}
          <div className="border border-slate-200 rounded-xl bg-white">
            <button
              type="button"
              onClick={() => toggleSection('access')}
              className="w-full px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between rounded-t-xl cursor-pointer"
            >
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Access & Eligibility
              </span>
              {collapsed.access ? (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {!collapsed.access && (
              <div className="p-3.5 grid grid-cols-2 gap-3">
                <SearchableMultiSelect
                  label="Company Access"
                  options={['Enabled', 'Disabled']}
                  selected={draft.companyAccess}
                  onChange={(vals) =>
                    setDraft((prev) => ({
                      ...prev,
                      companyAccess: vals as ('Enabled' | 'Disabled')[],
                    }))
                  }
                  placeholder="Enabled or Disabled"
                />
                <SearchableMultiSelect
                  label="Global Model Status"
                  options={['Active', 'Inactive']}
                  selected={draft.globalStatuses}
                  onChange={(vals) =>
                    setDraft((prev) => ({
                      ...prev,
                      globalStatuses: vals as ('Active' | 'Inactive')[],
                    }))
                  }
                  placeholder="Active or Inactive in Master"
                />
                <YesNoControl
                  label="Currently Available"
                  value={draft.currentlyAvailable}
                  onChange={(val) => setDraft((prev) => ({ ...prev, currentlyAvailable: val }))}
                  hint="Company allowed + eligible status + globally Active"
                />
                <YesNoControl
                  label="Pending Change"
                  value={draft.pendingChange}
                  onChange={(val) => setDraft((prev) => ({ ...prev, pendingChange: val }))}
                  hint="Rows with unsaved enable/disable toggles"
                />
              </div>
            )}
          </div>

          {/* Section 3: Device Configuration */}
          {showDeviceSection && (
            <div className="border border-slate-200 rounded-xl bg-white">
              <button
                type="button"
                onClick={() => toggleSection('device')}
                className="w-full px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between rounded-t-xl cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Device Configuration
                </span>
                {collapsed.device ? (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {!collapsed.device && (
                <div className="p-3.5 grid grid-cols-2 gap-3">
                  <SearchableMultiSelect
                    label="Device Function"
                    options={options.deviceFunctions}
                    selected={draft.deviceFunctions}
                    onChange={(vals) => setDraft((prev) => ({ ...prev, deviceFunctions: vals }))}
                    placeholder="All device functions"
                  />
                  <SearchableMultiSelect
                    label="Supported Modes"
                    options={options.supportedModes}
                    selected={draft.supportedModes}
                    onChange={(vals) => setDraft((prev) => ({ ...prev, supportedModes: vals }))}
                    placeholder="All device modes"
                  />
                  <SearchableMultiSelect
                    label="Supported Protocols"
                    options={options.supportedProtocols}
                    selected={draft.supportedProtocols}
                    onChange={(vals) => setDraft((prev) => ({ ...prev, supportedProtocols: vals }))}
                    placeholder="All platform protocols"
                  />
                  <SearchableMultiSelect
                    label="Connectivity Types"
                    options={options.connectivityTypes}
                    selected={draft.connectivityTypes}
                    onChange={(vals) => setDraft((prev) => ({ ...prev, connectivityTypes: vals }))}
                    placeholder="All connectivity types"
                  />
                </div>
              )}
            </div>
          )}

          {/* Section 4: Sensor / SIM Configuration */}
          {showSensorSimSection && (
            <div className="border border-slate-200 rounded-xl bg-white">
              <button
                type="button"
                onClick={() => toggleSection('sensorSim')}
                className="w-full px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between rounded-t-xl cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  4. Sensor / SIM Configuration
                </span>
                {collapsed.sensorSim ? (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {!collapsed.sensorSim && (
                <div className="p-3.5 grid grid-cols-2 gap-3">
                  {showSensorFields && (
                    <>
                      <SearchableMultiSelect
                        label="Measurement Type"
                        options={options.measurementTypes}
                        selected={draft.measurementTypes}
                        onChange={(vals) => setDraft((prev) => ({ ...prev, measurementTypes: vals }))}
                        placeholder="All measurement types"
                      />
                      <SearchableMultiSelect
                        label="Measurement Unit"
                        options={options.measurementUnits}
                        selected={draft.measurementUnits}
                        onChange={(vals) => setDraft((prev) => ({ ...prev, measurementUnits: vals }))}
                        placeholder="All measurement units"
                      />
                    </>
                  )}
                  {showSimFields && (
                    <>
                      <SearchableMultiSelect
                        label="SIM Type"
                        options={options.simTypes}
                        selected={draft.simTypes}
                        onChange={(vals) => setDraft((prev) => ({ ...prev, simTypes: vals }))}
                        placeholder="All SIM types"
                      />
                      <SearchableMultiSelect
                        label="Form Factor"
                        options={options.simFormFactors}
                        selected={draft.simFormFactors}
                        onChange={(vals) => setDraft((prev) => ({ ...prev, simFormFactors: vals }))}
                        placeholder="All SIM form factors"
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 5: Usage & Audit */}
          <div className="border border-slate-200 rounded-xl bg-white">
            <button
              type="button"
              onClick={() => toggleSection('usage')}
              className="w-full px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between rounded-t-xl cursor-pointer"
            >
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                5. Usage & Audit
              </span>
              {collapsed.usage ? (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {!collapsed.usage && (
              <div className="p-3.5 grid grid-cols-2 gap-3">
                <YesNoControl
                  label="In Use"
                  value={draft.inUse}
                  onChange={(val) => setDraft((prev) => ({ ...prev, inUse: val }))}
                  hint="Models with assigned company inventory or mappings"
                />

                <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800">In-Use Count Range</label>
                    {(draft.inUseCountMin || draft.inUseCountMax) && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, inUseCountMin: '', inUseCountMax: '' }))
                        }
                        className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      placeholder="Min"
                      value={draft.inUseCountMin}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, inUseCountMin: e.target.value }))
                      }
                      className="w-1/2 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                    />
                    <span className="text-[11px] text-slate-400">to</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Max"
                      value={draft.inUseCountMax}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, inUseCountMax: e.target.value }))
                      }
                      className="w-1/2 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                    />
                  </div>
                </div>

                <div className="col-span-2 space-y-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800">
                      Model Updated On (Date Range)
                    </label>
                    {(draft.updatedFrom || draft.updatedTo) && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, updatedFrom: '', updatedTo: '' }))
                        }
                        className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={draft.updatedFrom}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, updatedFrom: e.target.value }))
                      }
                      className="w-1/2 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                    />
                    <span className="text-[11px] text-slate-400">to</span>
                    <input
                      type="date"
                      value={draft.updatedTo}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, updatedTo: e.target.value }))
                      }
                      className="w-1/2 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Matching <span className="font-bold text-slate-900">{draftMatchedCount}</span> of{' '}
            <span className="font-semibold text-slate-700">{rows.length}</span> global models
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
