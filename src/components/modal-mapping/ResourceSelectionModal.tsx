/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Search,
  Truck,
  User,
  Layers,
  Store,
  MapPin,
  Wrench,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  ResourceType,
  HardwareBindingMode,
  RESOURCE_TYPES
} from '../../types/modalMaster';
import { MasterResourceItem } from './ResourceRelationshipsPanel';
import { MappingInfoTooltip } from './ModalConnectionOverlays';

export interface ExistingMappingNodeRef {
  nodeId: string;
  nodeType: ResourceType | 'Device' | 'Sensor' | 'SIM';
  identifier: string;
  displayName: string;
}

export interface ResourceSelectionResult {
  item: MasterResourceItem;
  parentNodeId: string | null;
  relationship: string;
  mode: HardwareBindingMode;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
}

interface ResourceSelectionModalProps {
  initialResourceType: ResourceType;
  allowTypeSwitch?: boolean;
  connId: string;
  targetClient: string;
  catalogByType: Record<ResourceType, MasterResourceItem[]>;
  alreadyAddedResourceKeys: Set<string>; // `${resourceType}::${id}`
  preselectedItemId?: string | null;
  onOpenCreateNew: (type: ResourceType, searchSeed?: string) => void;
  onSelect: (result: ResourceSelectionResult) => void;
  onClose: () => void;
}

function getSearchPlaceholder(type: ResourceType): string {
  switch (type) {
    case 'Vehicle':
      return 'Search Vehicle by Reg. No., Model, Transporter (e.g. GJ12AB1234)...';
    case 'Driver':
      return 'Search Driver by Name, Contact No., Licence...';
    case 'Fleet':
      return 'Search Fleet by Name, Public ID, Service Area...';
    case 'Vendor':
      return 'Search Vendor by Name, Public ID, Type...';
    case 'Place':
      return 'Search Place by Name, Address, ID...';
    case 'Equipment':
      return 'Search Equipment by Code, Name, Category...';
  }
}

function getSearchFieldLabel(type: ResourceType): string {
  switch (type) {
    case 'Vehicle':
      return 'Search Registered Vehicle (Reg. No. / Model)';
    case 'Driver':
      return 'Search Registered Driver (Name / Contact / Licence)';
    case 'Fleet':
      return 'Search Registered Fleet (Fleet Name / ID)';
    case 'Vendor':
      return 'Search Registered Vendor (Vendor Name / Code)';
    case 'Place':
      return 'Search Registered Place (Place Name / Address)';
    case 'Equipment':
      return 'Search Registered Equipment (Code / Name)';
  }
}

export const ResourceBadgeIcon: React.FC<{ type: ResourceType; className?: string }> = ({
  type,
  className = 'w-4 h-4'
}) => {
  switch (type) {
    case 'Vehicle':
      return <Truck className={`${className} text-sky-600`} />;
    case 'Driver':
      return <User className={`${className} text-purple-600`} />;
    case 'Fleet':
      return <Layers className={`${className} text-indigo-600`} />;
    case 'Vendor':
      return <Store className={`${className} text-[#F26522]`} />;
    case 'Place':
      return <MapPin className={`${className} text-emerald-600`} />;
    case 'Equipment':
      return <Wrench className={`${className} text-violet-600`} />;
  }
};

export const ResourceSelectionModal: React.FC<ResourceSelectionModalProps> = ({
  initialResourceType,
  allowTypeSwitch = false,
  connId,
  targetClient,
  catalogByType,
  alreadyAddedResourceKeys,
  preselectedItemId = null,
  onOpenCreateNew,
  onSelect,
  onClose
}) => {
  const [resourceType, setResourceType] = useState<ResourceType>(initialResourceType);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(preselectedItemId || '');

  useEffect(() => {
    if (preselectedItemId) {
      setSelectedId(preselectedItemId);
    }
  }, [preselectedItemId]);

  const [localError, setLocalError] = useState<string | null>(null);

  const pool = catalogByType[resourceType] || [];

  const filteredPool = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((item) =>
      [item.identifier, item.displayName, item.subtitle, item.company, item.id]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [pool, searchQuery]);

  const selectedItem = useMemo(
    () => pool.find((item) => item.id === selectedId) || null,
    [pool, selectedId]
  );

  const handleConfirm = () => {
    setLocalError(null);
    if (!selectedItem) {
      setLocalError(`Please select a ${resourceType} from the list or create a new one.`);
      return;
    }

    onSelect({
      item: selectedItem,
      parentNodeId: null,
      relationship: 'Connected Resource',
      mode: 'Permanent',
      startDate: '2026-11-13',
      startTime: '10:30:00',
      endDate: '2026-11-28',
      endTime: '23:59:59',
      timezone: 'Asia/Kolkata'
    });
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4">
      <div className="w-full max-w-[660px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#FFF3EE] border border-[#F26522]/25 flex items-center justify-center shrink-0">
              <ResourceBadgeIcon type={resourceType} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">
                <span>{connId}</span> · <span className="font-semibold text-slate-700">{targetClient}</span>
              </div>
              <h3 className="text-[15px] font-bold text-slate-900 truncate">
                Select {resourceType} for Mapping
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-[12px]">
          {localError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11.5px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{localError}</span>
            </div>
          )}

          {/* Optional Resource Type Tabs when opened via "+ Add Resource" */}
          {allowTypeSwitch && (
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">Resource Category</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {RESOURCE_TYPES.map((rt) => (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => {
                      setResourceType(rt);
                      setSelectedId('');
                      setSearchQuery('');
                      setLocalError(null);
                    }}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[11.5px] font-semibold cursor-pointer transition-colors ${
                      resourceType === rt
                        ? 'bg-[#FFF3EE] border-[#F26522] text-[#F26522]'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <ResourceBadgeIcon type={rt} className="w-3.5 h-3.5" />
                    {rt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Existing Resources */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="font-semibold text-slate-800">
                {getSearchFieldLabel(resourceType)} <span className="text-rose-600">*</span>
              </label>
              <button
                type="button"
                onClick={() => onOpenCreateNew(resourceType, searchQuery.trim())}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F26522] hover:underline cursor-pointer shrink-0"
              >
                <Plus className="w-3 h-3" /> Add New {resourceType}
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setLocalError(null);
                }}
                placeholder={getSearchPlaceholder(resourceType)}
                className="w-full h-9 pl-8 pr-8 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#F26522]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Results List */}
            <div className="border border-slate-200 rounded-xl bg-white max-h-56 overflow-y-auto divide-y divide-slate-100">
              {filteredPool.length === 0 ? (
                <div className="p-5 text-center space-y-2.5">
                  <div className="text-[11.5px] text-slate-500">
                    No registered {resourceType} matching &quot;{searchQuery}&quot; found.
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCreateNew(resourceType, searchQuery.trim())}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F26522] hover:bg-[#d95417] text-white text-[11.5px] font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create &amp; Register {resourceType}
                  </button>
                </div>
              ) : (
                filteredPool.map((item) => {
                  const key = `${item.resourceType}::${item.id}`;
                  const alreadyAdded = alreadyAddedResourceKeys.has(key);
                  const isSelected = selectedId === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => {
                        setSelectedId(item.id);
                        setLocalError(null);
                      }}
                      className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                        alreadyAdded
                          ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#FFF3EE] border-l-2 border-[#F26522]'
                          : 'hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900">
                            {item.identifier}
                          </span>
                          <span className="font-semibold text-slate-700 truncate">
                            {item.displayName}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {item.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.subtitle} · {item.company}
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-semibold shrink-0 px-2.5 py-1 rounded-md ${
                          alreadyAdded
                            ? 'bg-slate-100 text-slate-400'
                            : isSelected
                            ? 'bg-[#F26522] text-white'
                            : 'text-[#F26522] bg-[#FFF3EE]'
                        }`}
                      >
                        {alreadyAdded ? 'In Mapping' : isSelected ? 'Selected' : 'Select'}
                      </span>
                    </button>
                  );
                })
              )}

              {filteredPool.length > 0 && (
                <div className="sticky bottom-0 px-3 py-2 bg-[#FFF9F6] border-t border-slate-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-600">
                    Can&apos;t find your {resourceType} in {targetClient}?
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenCreateNew(resourceType, searchQuery.trim())}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F26522] hover:bg-[#d95417] text-white text-[11px] font-semibold cursor-pointer shrink-0"
                  >
                    <Plus className="w-3 h-3" /> Create &amp; Register {resourceType}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Selected Summary Card */}
          {selectedItem && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Selected {selectedItem.resourceType}: {selectedItem.identifier}
                </div>
                <div className="text-[11px] text-slate-600 truncate mt-0.5">
                  {selectedItem.displayName} · {selectedItem.subtitle}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Sticky Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-8 px-4 rounded-lg bg-[#F26522] hover:bg-[#d95417] text-white text-[12px] font-semibold cursor-pointer shadow-xs"
          >
            Select {resourceType}
          </button>
        </div>
      </div>
    </div>
  );
};
