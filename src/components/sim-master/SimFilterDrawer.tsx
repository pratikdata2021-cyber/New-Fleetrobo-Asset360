import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Radio,
  Search,
  X
} from 'lucide-react';
import {
  EffectiveSimInventoryStatus,
  SIM_EFFECTIVE_STATUS_OPTIONS,
  SIM_LIFECYCLE_OPTIONS,
  SIM_MAPPING_ASSIGNMENT_STATUS_OPTIONS,
  SimComputedAssignment,
  SimLifecycleStatus,
  SimMappingAssignmentStatus,
  SimRecord
} from '../../types/modalMaster';
import { getModelCategoryById } from '../../types/modelCategoryMaster';

export interface SimAdvancedFilters {
  organizations: string[];
  categories: string[];
  operators: string[];
  models: string[];
  formFactors: string[];
  plans: string[];
  serviceModes: string[];
  carrierStatuses: SimLifecycleStatus[];
  networks: string[];
  effectiveStatuses: EffectiveSimInventoryStatus[];
  assignmentStatuses: SimMappingAssignmentStatus[];
  assignedHardware: string[];
  connectionIds: string[];
  locations: string[];
  activationFrom: string;
  activationTo: string;
  renewalFrom: string;
  renewalTo: string;
}

export const DEFAULT_SIM_FILTERS: SimAdvancedFilters = {
  organizations: [],
  categories: [],
  operators: [],
  models: [],
  formFactors: [],
  plans: [],
  serviceModes: [],
  carrierStatuses: [],
  networks: [],
  effectiveStatuses: [],
  assignmentStatuses: [],
  assignedHardware: [],
  connectionIds: [],
  locations: [],
  activationFrom: '',
  activationTo: '',
  renewalFrom: '',
  renewalTo: ''
};

export function resolveSimCategoryLabel(sim: SimRecord): string {
  const direct = (sim.category || '').trim();
  if (direct) return direct;
  if (sim.modelTypeId) {
    const model = getModelCategoryById(sim.modelTypeId);
    if (model?.category === 'SIM' && model.typeName) return model.typeName;
  }
  return '';
}

export function resolveSimModelLabel(sim: SimRecord): string {
  if (!sim.modelTypeId) return '';
  const model = getModelCategoryById(sim.modelTypeId);
  if (!model || model.category !== 'SIM') return '';
  return (model.modelReference || model.typeName || '').trim();
}

export function resolveSimServiceMode(sim: SimRecord): string {
  const direct = (sim.serviceMode || '').trim();
  if (direct) return direct;
  if (sim.modelTypeId) {
    const model = getModelCategoryById(sim.modelTypeId);
    if (model?.category === 'SIM' && model.simType) return model.simType.trim();
  }
  return '';
}

export function countActiveSimFilters(
  filters: SimAdvancedFilters,
  isPlatformAdmin: boolean
): number {
  return (
    (isPlatformAdmin && filters.organizations.length > 0 ? 1 : 0) +
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.operators.length > 0 ? 1 : 0) +
    (filters.models.length > 0 ? 1 : 0) +
    (filters.formFactors.length > 0 ? 1 : 0) +
    (filters.plans.length > 0 ? 1 : 0) +
    (filters.serviceModes.length > 0 ? 1 : 0) +
    (filters.carrierStatuses.length > 0 ? 1 : 0) +
    (filters.networks.length > 0 ? 1 : 0) +
    (filters.effectiveStatuses.length > 0 ? 1 : 0) +
    (filters.assignmentStatuses.length > 0 ? 1 : 0) +
    (filters.assignedHardware.length > 0 ? 1 : 0) +
    (filters.connectionIds.length > 0 ? 1 : 0) +
    (filters.locations.length > 0 ? 1 : 0) +
    (filters.activationFrom || filters.activationTo ? 1 : 0) +
    (filters.renewalFrom || filters.renewalTo ? 1 : 0)
  );
}

export function matchesSimFilters(
  sim: SimRecord,
  filters: SimAdvancedFilters,
  effectiveStatus: EffectiveSimInventoryStatus,
  assignment: SimComputedAssignment,
  isPlatformAdmin: boolean
): boolean {
  if (
    isPlatformAdmin &&
    filters.organizations.length > 0 &&
    !filters.organizations.includes((sim.owner || '').trim())
  ) {
    return false;
  }

  if (filters.categories.length > 0) {
    const cat = resolveSimCategoryLabel(sim);
    if (!cat || !filters.categories.includes(cat)) return false;
  }

  if (
    filters.operators.length > 0 &&
    !filters.operators.includes((sim.operator || '').trim())
  ) {
    return false;
  }

  if (filters.models.length > 0) {
    const mod = resolveSimModelLabel(sim);
    if (!mod || !filters.models.includes(mod)) return false;
  }

  if (
    filters.formFactors.length > 0 &&
    !filters.formFactors.includes((sim.formFactor || '').trim())
  ) {
    return false;
  }

  if (
    filters.plans.length > 0 &&
    !filters.plans.includes((sim.plan || '').trim())
  ) {
    return false;
  }

  if (filters.serviceModes.length > 0) {
    const mode = resolveSimServiceMode(sim);
    if (!mode || !filters.serviceModes.includes(mode)) return false;
  }

  if (
    filters.carrierStatuses.length > 0 &&
    !filters.carrierStatuses.includes(sim.status)
  ) {
    return false;
  }

  if (
    filters.networks.length > 0 &&
    !filters.networks.includes((sim.network || '').trim())
  ) {
    return false;
  }

  if (
    filters.effectiveStatuses.length > 0 &&
    !filters.effectiveStatuses.includes(effectiveStatus)
  ) {
    return false;
  }

  if (
    filters.assignmentStatuses.length > 0 &&
    !filters.assignmentStatuses.includes(assignment.assignmentStatus)
  ) {
    return false;
  }

  if (filters.assignedHardware.length > 0) {
    const hwCandidates = new Set<string>(assignment.linkedHardwareNames);
    if (
      assignment.assignedHardwareName &&
      assignment.assignedHardwareName !== 'Unassigned'
    ) {
      hwCandidates.add(assignment.assignedHardwareName);
    }
    const matched = filters.assignedHardware.some((h) => hwCandidates.has(h));
    if (!matched) return false;
  }

  if (filters.connectionIds.length > 0) {
    const connCandidates = new Set<string>(assignment.linkedConnectionIds);
    if (assignment.assignedConnectionId && assignment.assignedConnectionId !== '—') {
      assignment.assignedConnectionId
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .forEach((c) => connCandidates.add(c));
    }
    const matched = filters.connectionIds.some((c) => connCandidates.has(c));
    if (!matched) return false;
  }

  if (
    filters.locations.length > 0 &&
    !filters.locations.includes((sim.location || '').trim())
  ) {
    return false;
  }

  if (filters.activationFrom || filters.activationTo) {
    const actDay = (sim.activationDate || '').slice(0, 10);
    if (!actDay) return false;
    if (filters.activationFrom && actDay < filters.activationFrom) return false;
    if (filters.activationTo && actDay > filters.activationTo) return false;
  }

  if (filters.renewalFrom || filters.renewalTo) {
    const renDay = (sim.renewalDate || '').slice(0, 10);
    if (!renDay) return false;
    if (filters.renewalFrom && renDay < filters.renewalFrom) return false;
    if (filters.renewalTo && renDay > filters.renewalTo) return false;
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

interface SimFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: SimAdvancedFilters;
  onApplyFilters: (next: SimAdvancedFilters) => void;
  authorizedSims: SimRecord[];
  enabledSimModels?: {
    typeName: string;
    manufacturer: string;
    modelReference: string;
    simType?: string;
  }[];
  effectiveStatusById: Map<string, EffectiveSimInventoryStatus>;
  assignmentById: Map<string, SimComputedAssignment>;
  isPlatformAdmin: boolean;
}

export const SimFilterDrawer: React.FC<SimFilterDrawerProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  onApplyFilters,
  authorizedSims,
  enabledSimModels = [],
  effectiveStatusById,
  assignmentById,
  isPlatformAdmin
}) => {
  const [draft, setDraft] = useState<SimAdvancedFilters>(appliedFilters);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    classification: false,
    subscription: false,
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

  const scopedForOptions = useMemo(() => {
    if (!isPlatformAdmin || draft.organizations.length === 0) return authorizedSims;
    return authorizedSims.filter((s) =>
      draft.organizations.includes((s.owner || '').trim())
    );
  }, [authorizedSims, isPlatformAdmin, draft.organizations]);

  const options = useMemo(() => {
    const organizations = Array.from(
      new Set(authorizedSims.map((s) => (s.owner || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const categories = Array.from(
      new Set(
        [
          ...scopedForOptions.map((s) => resolveSimCategoryLabel(s)),
          ...enabledSimModels.map((m) => (m.typeName || '').trim())
        ].filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const operators = Array.from(
      new Set(
        [
          ...scopedForOptions.map((s) => (s.operator || '').trim()),
          ...enabledSimModels.map((m) => (m.manufacturer || '').trim())
        ].filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const models = Array.from(
      new Set(
        [
          ...scopedForOptions.map((s) => resolveSimModelLabel(s)),
          ...enabledSimModels.map((m) => (m.modelReference || m.typeName || '').trim())
        ].filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const formFactors = Array.from(
      new Set(scopedForOptions.map((s) => (s.formFactor || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const plans = Array.from(
      new Set(scopedForOptions.map((s) => (s.plan || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const serviceModes = Array.from(
      new Set(
        [
          ...scopedForOptions.map((s) => resolveSimServiceMode(s)),
          ...enabledSimModels.map((m) => (m.simType || '').trim())
        ].filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const networks = Array.from(
      new Set(scopedForOptions.map((s) => (s.network || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const hwSet = new Set<string>();
    const connSet = new Set<string>();
    scopedForOptions.forEach((s) => {
      const assign = assignmentById.get(s.id);
      if (!assign) return;
      if (assign.assignedHardwareName && assign.assignedHardwareName !== 'Unassigned') {
        hwSet.add(assign.assignedHardwareName);
      }
      assign.linkedHardwareNames.forEach((h) => hwSet.add(h));
      assign.linkedConnectionIds.forEach((c) => connSet.add(c));
    });

    const assignedHardware = Array.from(hwSet).sort((a, b) => a.localeCompare(b));
    const connectionIds = Array.from(connSet).sort((a, b) => a.localeCompare(b));

    const locations = Array.from(
      new Set(scopedForOptions.map((s) => (s.location || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return {
      organizations,
      categories,
      operators,
      models,
      formFactors,
      plans,
      serviceModes,
      networks,
      assignedHardware,
      connectionIds,
      locations
    };
  }, [authorizedSims, scopedForOptions, enabledSimModels, assignmentById]);

  const draftFilterCount = useMemo(
    () => countActiveSimFilters(draft, isPlatformAdmin),
    [draft, isPlatformAdmin]
  );

  const previewCount = useMemo(() => {
    return authorizedSims.filter((s) => {
      const eff = effectiveStatusById.get(s.id) || 'Inventory';
      const assign = assignmentById.get(s.id);
      if (!assign) return false;
      return matchesSimFilters(s, draft, eff, assign, isPlatformAdmin);
    }).length;
  }, [authorizedSims, draft, effectiveStatusById, assignmentById, isPlatformAdmin]);

  if (!isOpen) return null;

  const handleResetDraft = () => {
    setDraft(DEFAULT_SIM_FILTERS);
    setDateError(null);
  };

  const handleApply = () => {
    if (draft.activationFrom && draft.activationTo && draft.activationFrom > draft.activationTo) {
      setDateError('Activation Date "From" cannot be after "To" date.');
      return;
    }
    if (draft.renewalFrom && draft.renewalTo && draft.renewalFrom > draft.renewalTo) {
      setDateError('Expiry / Renewal Date "From" cannot be after "To" date.');
      return;
    }
    setDateError(null);
    onApplyFilters(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[520px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Filter SIM Inventory</h2>
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

          {/* Section 1: Organization & SIM Classification */}
          <div className="rounded-xl border border-slate-200 overflow-visible bg-white">
            <button
              type="button"
              onClick={() => toggleSection('classification')}
              className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-xl flex items-center justify-between font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FA8A63]" />
                <span>1. Organization &amp; SIM Classification</span>
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
                  label="SIM Category"
                  options={options.categories}
                  selected={draft.categories}
                  onChange={(next) => setDraft((p) => ({ ...p, categories: next }))}
                  placeholder="All SIM Categories"
                />
                <SearchableMultiSelect
                  label="Network Operator / Provider"
                  options={options.operators}
                  selected={draft.operators}
                  onChange={(next) => setDraft((p) => ({ ...p, operators: next }))}
                  placeholder="All Operators"
                />
                {options.models.length > 0 && (
                  <SearchableMultiSelect
                    label="Model / Reference"
                    options={options.models}
                    selected={draft.models}
                    onChange={(next) => setDraft((p) => ({ ...p, models: next }))}
                    placeholder="All Models"
                  />
                )}
                <SearchableMultiSelect
                  label="Form Factor"
                  options={options.formFactors}
                  selected={draft.formFactors}
                  onChange={(next) => setDraft((p) => ({ ...p, formFactors: next }))}
                  placeholder="All Form Factors"
                />
              </div>
            )}
          </div>

          {/* Section 2: Subscription & Service */}
          <div className="rounded-xl border border-slate-200 overflow-visible bg-white">
            <button
              type="button"
              onClick={() => toggleSection('subscription')}
              className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-xl flex items-center justify-between font-bold text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-600" />
                <span>2. Subscription &amp; Service</span>
              </div>
              {collapsed.subscription ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {!collapsed.subscription && (
              <div className="p-4 space-y-3">
                <SearchableMultiSelect
                  label="Plan / Data Package"
                  options={options.plans}
                  selected={draft.plans}
                  onChange={(next) => setDraft((p) => ({ ...p, plans: next }))}
                  placeholder="All Plans"
                />
                {options.serviceModes.length > 0 && (
                  <SearchableMultiSelect
                    label="Service Mode"
                    options={options.serviceModes}
                    selected={draft.serviceModes}
                    onChange={(next) => setDraft((p) => ({ ...p, serviceModes: next }))}
                    placeholder="All Service Modes"
                  />
                )}
                <SearchableMultiSelect
                  label="Carrier Lifecycle Status"
                  options={SIM_LIFECYCLE_OPTIONS}
                  selected={draft.carrierStatuses}
                  onChange={(next) =>
                    setDraft((p) => ({
                      ...p,
                      carrierStatuses: next as SimLifecycleStatus[]
                    }))
                  }
                  placeholder="All Carrier States"
                />
                {options.networks.length > 0 && (
                  <SearchableMultiSelect
                    label="Network"
                    options={options.networks}
                    selected={draft.networks}
                    onChange={(next) => setDraft((p) => ({ ...p, networks: next }))}
                    placeholder="All Networks"
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
                <Activity className="w-4 h-4 text-emerald-600" />
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
                  label="Effective Inventory Status"
                  options={SIM_EFFECTIVE_STATUS_OPTIONS}
                  selected={draft.effectiveStatuses}
                  onChange={(next) =>
                    setDraft((p) => ({
                      ...p,
                      effectiveStatuses: next as EffectiveSimInventoryStatus[]
                    }))
                  }
                  placeholder="All Inventory Statuses"
                />
                <SearchableMultiSelect
                  label="Assignment Status"
                  options={SIM_MAPPING_ASSIGNMENT_STATUS_OPTIONS}
                  selected={draft.assignmentStatuses}
                  onChange={(next) =>
                    setDraft((p) => ({
                      ...p,
                      assignmentStatuses: next as SimMappingAssignmentStatus[]
                    }))
                  }
                  placeholder="All Assignment Statuses"
                />
                {options.assignedHardware.length > 0 && (
                  <SearchableMultiSelect
                    label="Assigned Hardware / Device"
                    options={options.assignedHardware}
                    selected={draft.assignedHardware}
                    onChange={(next) => setDraft((p) => ({ ...p, assignedHardware: next }))}
                    placeholder="All Linked Hardware"
                  />
                )}
                {options.connectionIds.length > 0 && (
                  <SearchableMultiSelect
                    label="Connection / Mapping ID"
                    options={options.connectionIds}
                    selected={draft.connectionIds}
                    onChange={(next) => setDraft((p) => ({ ...p, connectionIds: next }))}
                    placeholder="All Connections"
                  />
                )}
                <SearchableMultiSelect
                  label="Inventory Location"
                  options={options.locations}
                  selected={draft.locations}
                  onChange={(next) => setDraft((p) => ({ ...p, locations: next }))}
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
                    <label className="font-semibold text-slate-800">Activation Date</label>
                    {(draft.activationFrom || draft.activationTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft((p) => ({ ...p, activationFrom: '', activationTo: '' }));
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
                        value={draft.activationFrom}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, activationFrom: e.target.value }));
                          setDateError(null);
                        }}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-[11px] focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">To</span>
                      <input
                        type="date"
                        value={draft.activationTo}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, activationTo: e.target.value }));
                          setDateError(null);
                        }}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-[11px] focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-800">Expiry / Renewal Date</label>
                    {(draft.renewalFrom || draft.renewalTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft((p) => ({ ...p, renewalFrom: '', renewalTo: '' }));
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
                        value={draft.renewalFrom}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, renewalFrom: e.target.value }));
                          setDateError(null);
                        }}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-[11px] focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">To</span>
                      <input
                        type="date"
                        value={draft.renewalTo}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, renewalTo: e.target.value }));
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
