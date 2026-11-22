import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  Pin,
  PinOff,
  GripVertical,
  RotateCcw
} from 'lucide-react';
import {
  FleetColumnDef,
  FLEET_12_COLUMNS_CATALOGUE,
  DEFAULT_FLEET_VISIBLE_COLUMNS
} from '../types/fleet';

interface FleetColumnCatalogueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  visibleColumnKeys: string[];
  pinnedColumnKeys: string[];
  onApplyColumns: (visibleKeys: string[], pinnedKeys: string[]) => void;
}

export const FleetColumnCatalogueDrawer: React.FC<FleetColumnCatalogueDrawerProps> = ({
  isOpen,
  onClose,
  visibleColumnKeys,
  pinnedColumnKeys,
  onApplyColumns
}) => {
  const [draftVisibleKeys, setDraftVisibleKeys] = useState<string[]>([...visibleColumnKeys]);
  const [draftPinnedKeys, setDraftPinnedKeys] = useState<string[]>([...pinnedColumnKeys]);
  const [searchQuery, setSearchQuery] = useState('');

  // Group columns by Category
  const groupedCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const groups: Record<string, FleetColumnDef[]> = {};

    FLEET_12_COLUMNS_CATALOGUE.forEach((col) => {
      if (!q || col.label.toLowerCase().includes(q) || col.group.toLowerCase().includes(q)) {
        if (!groups[col.group]) {
          groups[col.group] = [];
        }
        groups[col.group].push(col);
      }
    });

    return groups;
  }, [searchQuery]);

  const toggleColumn = (key: string) => {
    if (key === 'name') return; // Name is permanently required
    if (draftVisibleKeys.includes(key)) {
      setDraftVisibleKeys(draftVisibleKeys.filter((k) => k !== key));
    } else {
      setDraftVisibleKeys([...draftVisibleKeys, key]);
    }
  };

  const togglePin = (key: string) => {
    if (draftPinnedKeys.includes(key)) {
      setDraftPinnedKeys(draftPinnedKeys.filter((k) => k !== key));
    } else {
      setDraftPinnedKeys([...draftPinnedKeys, key]);
    }
  };

  const handleRoleDefault = () => {
    setDraftVisibleKeys(DEFAULT_FLEET_VISIBLE_COLUMNS);
    setDraftPinnedKeys(['name']);
  };

  const handleGenericDefault = () => {
    setDraftVisibleKeys(['name', 'status', 'service_area', 'parent', 'drivers_count']);
    setDraftPinnedKeys(['name']);
  };

  const handleMasterToggle = () => {
    if (draftVisibleKeys.length === FLEET_12_COLUMNS_CATALOGUE.length) {
      setDraftVisibleKeys(DEFAULT_FLEET_VISIBLE_COLUMNS);
    } else {
      setDraftVisibleKeys(FLEET_12_COLUMNS_CATALOGUE.map((c) => c.key));
    }
  };

  const handleApply = () => {
    // Ensure at least name is visible
    const finalVisible = draftVisibleKeys.includes('name')
      ? draftVisibleKeys
      : ['name', ...draftVisibleKeys];
    onApplyColumns(finalVisible, draftPinnedKeys);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Container (650px wide) */}
      <div className="relative w-full max-w-[650px] bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 z-10 font-sans text-xs">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Column catalogue</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Customize table layout, visible fields, and pinned anchor columns
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Presets Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search columns by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#FA8A63]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRoleDefault}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            >
              Role default
            </button>
            <button
              type="button"
              onClick={handleGenericDefault}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            >
              Generic default
            </button>
          </div>

          {/* Master Select Row */}
          <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draftVisibleKeys.length === FLEET_12_COLUMNS_CATALOGUE.length}
                onChange={handleMasterToggle}
                className="w-4 h-4 text-[#FA8A63] rounded border-slate-300"
              />
              <span className="font-bold text-slate-800">Select all columns</span>
            </div>
            <span className="text-[11px] text-slate-500">
              {draftVisibleKeys.length} of {FLEET_12_COLUMNS_CATALOGUE.length} visible
            </span>
          </div>
        </div>

        {/* Grouped Columns List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {Object.entries(groupedCategories).map(([group, cols]) => (
            <div key={group} className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                {group}
              </div>
              <div className="space-y-1.5">
                {cols.map((col) => {
                  const isVisible = draftVisibleKeys.includes(col.key);
                  const isPinned = draftPinnedKeys.includes(col.key);

                  return (
                    <div
                      key={col.key}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                        isVisible
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-100 bg-slate-50/50 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical size={14} className="text-slate-300 cursor-grab" />
                        <input
                          type="checkbox"
                          disabled={col.required}
                          checked={isVisible}
                          onChange={() => toggleColumn(col.key)}
                          className="w-4 h-4 text-[#FA8A63] rounded border-slate-300"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-semibold text-xs ${
                                isVisible ? 'text-slate-800' : 'text-slate-400'
                              }`}
                            >
                              {col.label}
                            </span>
                            {col.required && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{col.tooltip}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isVisible ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {isVisible ? 'Selected' : 'Hidden'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePin(col.key)}
                          title={isPinned ? 'Unpin column' : 'Pin column to left edge'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isPinned
                              ? 'text-[#FA8A63] bg-orange-50'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isPinned ? <Pin size={13} className="rotate-45" /> : <PinOff size={13} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            {draftPinnedKeys.length} column(s) pinned to left
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Apply columns
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
