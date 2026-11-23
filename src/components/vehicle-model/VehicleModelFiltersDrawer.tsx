import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  ALL_VEHICLE_SEGMENTS,
  MANUFACTURERS_LIST,
  VEHICLE_MODEL_FUEL_TYPES,
  VEHICLE_SEGMENTS_BY_TYPE,
  VEHICLE_TYPES,
  VehicleModelRecord,
  countDependentVehicles,
  getIconSetupSummary,
} from '../../types/vehicleModelMaster';
import { Vehicle } from '../../types/vehicle';

export interface VehicleModelFilterState {
  manufacturer: string;
  modelName: string;
  variant: string;
  vehicleType: string;
  vehicleSegment: string;
  fuelType: string;
  yearFrom: string;
  yearTo: string;
  isAcVehicle: 'All' | 'Yes' | 'No';
  iconSetup: 'All' | 'default' | 'partial' | 'full';
  status: 'All' | 'Active' | 'Inactive';
  linkedVehicles: 'All' | 'unused' | 'in_use';
  createdFrom: string;
  createdTo: string;
}

export const INITIAL_VEHICLE_MODEL_FILTERS: VehicleModelFilterState = {
  manufacturer: 'All',
  modelName: '',
  variant: 'All',
  vehicleType: 'All',
  vehicleSegment: 'All',
  fuelType: 'All',
  yearFrom: '',
  yearTo: '',
  isAcVehicle: 'All',
  iconSetup: 'All',
  status: 'All',
  linkedVehicles: 'All',
  createdFrom: '',
  createdTo: '',
};

interface VehicleModelFiltersDrawerProps {
  isOpen: boolean;
  filters: VehicleModelFilterState;
  records: VehicleModelRecord[];
  vehiclesList: Vehicle[];
  onApply: (nextFilters: VehicleModelFilterState) => void;
  onReset: () => void;
  onClose: () => void;
}

export const VehicleModelFiltersDrawer: React.FC<VehicleModelFiltersDrawerProps> = ({
  isOpen,
  filters,
  records,
  vehiclesList,
  onApply,
  onReset,
  onClose,
}) => {
  const [draft, setDraft] = useState<VehicleModelFilterState>(filters);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    identity: true,
    classification: true,
    specs: true,
    lifecycle: true,
  });

  // Sync draft when opened
  React.useEffect(() => {
    if (isOpen) {
      setDraft(filters);
    }
  }, [isOpen, filters]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const manufacturersOptions = useMemo(() => {
    const set = new Set<string>(MANUFACTURERS_LIST);
    records.forEach((r) => {
      if (r.manufacturer) set.add(r.manufacturer);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const variantOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.variant) set.add(r.variant);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const availableSegments = useMemo(() => {
    if (draft.vehicleType !== 'All' && VEHICLE_SEGMENTS_BY_TYPE[draft.vehicleType]) {
      return VEHICLE_SEGMENTS_BY_TYPE[draft.vehicleType];
    }
    const set = new Set<string>(ALL_VEHICLE_SEGMENTS);
    records.forEach((r) => {
      if (r.vehicleSegment) set.add(r.vehicleSegment);
    });
    return Array.from(set);
  }, [draft.vehicleType, records]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (draft.manufacturer !== 'All') count++;
    if (draft.modelName.trim()) count++;
    if (draft.variant !== 'All') count++;
    if (draft.vehicleType !== 'All') count++;
    if (draft.vehicleSegment !== 'All') count++;
    if (draft.fuelType !== 'All') count++;
    if (draft.yearFrom.trim() || draft.yearTo.trim()) count++;
    if (draft.isAcVehicle !== 'All') count++;
    if (draft.iconSetup !== 'All') count++;
    if (draft.status !== 'All') count++;
    if (draft.linkedVehicles !== 'All') count++;
    if (draft.createdFrom || draft.createdTo) count++;
    return count;
  }, [draft]);

  const yearRangeError = useMemo(() => {
    if (draft.yearFrom && draft.yearTo) {
      const from = Number(draft.yearFrom);
      const to = Number(draft.yearTo);
      if (!isNaN(from) && !isNaN(to) && from > to) {
        return 'From year cannot exceed To year.';
      }
    }
    return '';
  }, [draft.yearFrom, draft.yearTo]);

  const dateRangeError = useMemo(() => {
    if (draft.createdFrom && draft.createdTo) {
      if (draft.createdFrom > draft.createdTo) {
        return 'From date cannot be after To date.';
      }
    }
    return '';
  }, [draft.createdFrom, draft.createdTo]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (yearRangeError || dateRangeError) return;
    onApply(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft(INITIAL_VEHICLE_MODEL_FILTERS);
    onReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
      <div className="w-full max-w-[430px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FA8A63]">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Filter Vehicle Models</h3>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-50 text-[#FA8A63] border border-[#FA8A63]/30 text-[11px] font-bold">
                    {activeCount} active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Sectional filters for catalog identity, specs & lifecycle
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Filter Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC] text-xs">
          {/* Section 1: Model Identity */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection('identity')}
              className="w-full px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-left cursor-pointer"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                1. Model Identity
              </span>
              {openSections.identity ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
            {openSections.identity && (
              <div className="p-4 space-y-3.5">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Vehicle Manufacturer
                  </label>
                  <select
                    value={draft.manufacturer}
                    onChange={(e) => setDraft((p) => ({ ...p, manufacturer: e.target.value }))}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="All">All Manufacturers</option>
                    {manufacturersOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Vehicle Model Name
                  </label>
                  <input
                    type="text"
                    placeholder="Search by model name..."
                    value={draft.modelName}
                    onChange={(e) => setDraft((p) => ({ ...p, modelName: e.target.value }))}
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Variant / Trim
                  </label>
                  <select
                    value={draft.variant}
                    onChange={(e) => setDraft((p) => ({ ...p, variant: e.target.value }))}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="All">All Variants</option>
                    {variantOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Vehicle Classification */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection('classification')}
              className="w-full px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-left cursor-pointer"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                2. Vehicle Classification
              </span>
              {openSections.classification ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
            {openSections.classification && (
              <div className="p-4 space-y-3.5">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={draft.vehicleType}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setDraft((p) => ({
                        ...p,
                        vehicleType: nextType,
                        vehicleSegment: 'All',
                      }));
                    }}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="All">All Types</option>
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Vehicle Segment
                  </label>
                  <select
                    value={draft.vehicleSegment}
                    onChange={(e) => setDraft((p) => ({ ...p, vehicleSegment: e.target.value }))}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="All">All Segments</option>
                    {availableSegments.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Fuel Type
                  </label>
                  <select
                    value={draft.fuelType}
                    onChange={(e) => setDraft((p) => ({ ...p, fuelType: e.target.value }))}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="All">All Fuel Types</option>
                    {VEHICLE_MODEL_FUEL_TYPES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Specifications & Icons */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection('specs')}
              className="w-full px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-left cursor-pointer"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                3. Specifications & Icons
              </span>
              {openSections.specs ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
            {openSections.specs && (
              <div className="p-4 space-y-3.5">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Model Year Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="From (e.g. 2020)"
                      value={draft.yearFrom}
                      onChange={(e) => setDraft((p) => ({ ...p, yearFrom: e.target.value }))}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                    />
                    <input
                      type="number"
                      placeholder="To (e.g. 2026)"
                      value={draft.yearTo}
                      onChange={(e) => setDraft((p) => ({ ...p, yearTo: e.target.value }))}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                    />
                  </div>
                  {yearRangeError && (
                    <p className="text-[10px] text-rose-600 mt-1">{yearRangeError}</p>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    AC Vehicle Compatibility
                  </label>
                  <select
                    value={draft.isAcVehicle}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        isAcVehicle: e.target.value as 'All' | 'Yes' | 'No',
                      }))
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="All">All AC Configurations</option>
                    <option value="Yes">Yes (AC Vehicle)</option>
                    <option value="No">No (Non-AC)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Icon Setup Summary
                  </label>
                  <select
                    value={draft.iconSetup}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        iconSetup: e.target.value as 'All' | 'default' | 'partial' | 'full',
                      }))
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="All">All Icon Setups</option>
                    <option value="default">Default 7/7 (System Icons)</option>
                    <option value="partial">Custom 1–6 (Partial Custom)</option>
                    <option value="full">Custom 7/7 (Full Custom Icons)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Lifecycle & Usage */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection('lifecycle')}
              className="w-full px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-left cursor-pointer"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                4. Lifecycle & Usage
              </span>
              {openSections.lifecycle ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
            {openSections.lifecycle && (
              <div className="p-4 space-y-3.5">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Model Status
                  </label>
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        status: e.target.value as 'All' | 'Active' | 'Inactive',
                      }))
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active Only</option>
                    <option value="Inactive">Inactive Only</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Linked Vehicles in Master
                  </label>
                  <select
                    value={draft.linkedVehicles}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        linkedVehicles: e.target.value as 'All' | 'unused' | 'in_use',
                      }))
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="All">All Models (Unused & Linked)</option>
                    <option value="unused">Unused Only (0 Linked Vehicles)</option>
                    <option value="in_use">In Use Only (1+ Linked Vehicles)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Created Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={draft.createdFrom}
                      onChange={(e) => setDraft((p) => ({ ...p, createdFrom: e.target.value }))}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                    />
                    <input
                      type="date"
                      value={draft.createdTo}
                      onChange={(e) => setDraft((p) => ({ ...p, createdTo: e.target.value }))}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                    />
                  </div>
                  {dateRangeError && (
                    <p className="text-[10px] text-rose-600 mt-1">{dateRangeError}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset All</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={Boolean(yearRangeError || dateRangeError)}
              onClick={handleApply}
              className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
