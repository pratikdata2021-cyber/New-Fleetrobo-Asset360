import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronUp,
  Columns,
  GripVertical,
  Pin,
  PinOff,
  X,
} from 'lucide-react';

export interface ColumnCatalogueItem {
  key: string;
  label: string;
  category?: string;
  required?: boolean;
}

interface ColumnCataloguePopoverProps {
  columns: ColumnCatalogueItem[];
  visibleKeys: string[];
  onChangeVisibleKeys: (nextKeys: string[]) => void;
  defaultKeys: string[];
  roleDefaultKeys?: string[];
  pinnedKeys?: string[];
  onChangePinnedKeys?: (nextPinned: string[]) => void;
  defaultPinnedKeys?: string[];
  onToast?: (msg: string) => void;
  align?: 'left' | 'right';
}

export const ColumnCataloguePopover: React.FC<ColumnCataloguePopoverProps> = ({
  columns,
  visibleKeys,
  onChangeVisibleKeys,
  defaultKeys,
  roleDefaultKeys,
  pinnedKeys,
  onChangePinnedKeys,
  defaultPinnedKeys,
  onToast,
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalPinned, setInternalPinned] = useState<string[]>(() => {
    if (defaultPinnedKeys && defaultPinnedKeys.length > 0) return defaultPinnedKeys;
    const req = columns.filter((c) => c.required).map((c) => c.key);
    return req.length > 0 ? req : columns.slice(0, 1).map((c) => c.key);
  });

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const activePinned = pinnedKeys ?? internalPinned;
  const setActivePinned = (next: string[]) => {
    if (onChangePinnedKeys) {
      onChangePinnedKeys(next);
    } else {
      setInternalPinned(next);
    }
  };

  const requiredKeys = useMemo(() => {
    const req = columns.filter((c) => c.required).map((c) => c.key);
    return req.length > 0 ? req : columns.slice(0, 1).map((c) => c.key);
  }, [columns]);

  const groupedColumns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const groups: Record<string, ColumnCatalogueItem[]> = {};
    columns.forEach((col) => {
      const cat = col.category || 'TABLE COLUMNS';
      if (!q || col.label.toLowerCase().includes(q) || cat.toLowerCase().includes(q)) {
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(col);
      }
    });
    return groups;
  }, [columns, searchQuery]);

  const isAllSelected = columns.length > 0 && columns.every((c) => visibleKeys.includes(c.key));
  const isSomeSelected = visibleKeys.length > requiredKeys.length && !isAllSelected;

  const handleToggleColumn = (col: ColumnCatalogueItem) => {
    if (col.required || requiredKeys.includes(col.key)) return;
    if (visibleKeys.includes(col.key)) {
      if (visibleKeys.length > 1) {
        onChangeVisibleKeys(visibleKeys.filter((k) => k !== col.key));
      }
    } else {
      onChangeVisibleKeys([...visibleKeys, col.key]);
    }
  };

  const handleToggleMaster = () => {
    if (isAllSelected) {
      onChangeVisibleKeys(requiredKeys);
    } else {
      onChangeVisibleKeys(columns.map((c) => c.key));
    }
  };

  const handleTogglePin = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePinned.includes(key)) {
      setActivePinned(activePinned.filter((k) => k !== key));
    } else {
      setActivePinned([...activePinned, key]);
    }
  };

  const handleTogglePinAll = () => {
    const basePins = defaultPinnedKeys && defaultPinnedKeys.length > 0 ? defaultPinnedKeys : requiredKeys;
    if (activePinned.length > basePins.length) {
      setActivePinned(basePins);
      onToast?.('Unpinned optional columns');
    } else {
      setActivePinned(visibleKeys);
      onToast?.('Pinned all visible columns');
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Customize columns"
        className={`p-1.5 bg-white border rounded-lg transition-colors cursor-pointer ${
          isOpen
            ? 'border-[#FA8A63] text-[#FA8A63] bg-orange-50/40'
            : 'border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900'
        }`}
      >
        <Columns size={15} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } mt-2 w-[340px] bg-white rounded-xl shadow-2xl border border-slate-200/90 p-3.5 z-50 text-xs font-sans text-left animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Column catalogue</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <ChevronUp size={16} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-2.5">
            <input
              type="text"
              placeholder="Search columns"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FA8A63] shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Role Default & Generic Default Presets */}
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            <button
              type="button"
              onClick={() => {
                onChangeVisibleKeys(roleDefaultKeys && roleDefaultKeys.length > 0 ? roleDefaultKeys : defaultKeys);
                onToast?.('Applied Role default columns');
              }}
              className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 text-center transition-colors shadow-2xs cursor-pointer"
            >
              Role default
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeVisibleKeys(defaultKeys);
                onToast?.('Applied Generic default columns');
              }}
              className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 text-center transition-colors shadow-2xs cursor-pointer"
            >
              Generic default
            </button>
          </div>

          <div className="h-px bg-slate-100 my-2" />

          {/* Master Select Row (Orange Checkbox) */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50/70 border border-slate-100 rounded-lg mb-2">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleMaster}
                title={isAllSelected ? 'Keep required only' : 'Select all columns'}
                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                  isAllSelected || isSomeSelected
                    ? 'bg-[#FA8A63] text-white'
                    : 'border border-slate-300 bg-white'
                }`}
              >
                {isAllSelected ? (
                  <Check size={11} strokeWidth={3} />
                ) : isSomeSelected ? (
                  <div className="w-2 h-0.5 bg-white rounded-full" />
                ) : null}
              </button>
              <span className="text-xs font-semibold text-slate-800">Select</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 border border-slate-200 text-slate-700">
                Required
              </span>
              <button
                type="button"
                onClick={handleTogglePinAll}
                title="Toggle pin state"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <Pin size={14} className="rotate-45" />
              </button>
            </div>
          </div>

          {/* Grouped Columns List */}
          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {Object.keys(groupedColumns).length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No columns match "{searchQuery}"
              </div>
            ) : (
              Object.entries(groupedColumns).map(([category, cols]) => (
                <div key={category} className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider px-1 pt-1 uppercase">
                    {category}
                  </div>
                  {cols.map((col) => {
                    const isRequired = Boolean(col.required || requiredKeys.includes(col.key));
                    const isVisible = visibleKeys.includes(col.key);
                    const isPinned = activePinned.includes(col.key);

                    return (
                      <div
                        key={col.key}
                        onClick={() => handleToggleColumn(col)}
                        className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                          isRequired ? 'cursor-default' : 'cursor-pointer'
                        } ${isVisible ? 'bg-slate-50/60 hover:bg-slate-100/60' : 'hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical size={13} className="text-slate-300 shrink-0 cursor-grab" />
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                              isVisible
                                ? 'bg-[#FA8A63] text-white'
                                : 'border border-slate-300 bg-white'
                            } ${isRequired ? 'opacity-80' : ''}`}
                          >
                            {isVisible && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span
                            className={`truncate text-xs ${
                              isVisible ? 'font-medium text-slate-800' : 'text-slate-400'
                            }`}
                          >
                            {col.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {isRequired ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                              Required
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                isVisible
                                  ? 'bg-orange-50 text-[#FA8A63] border border-orange-200/70'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {isVisible ? 'Selected' : 'Hidden'}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleTogglePin(col.key, e)}
                            title={isPinned ? 'Unpin column' : 'Pin column to left'}
                            className={`p-1 rounded hover:bg-slate-200/60 cursor-pointer ${
                              isPinned ? 'text-[#FA8A63]' : 'text-slate-300 hover:text-slate-600'
                            }`}
                          >
                            {isPinned ? <Pin size={12} className="rotate-45" /> : <PinOff size={12} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {visibleKeys.length} of {columns.length} visible
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-[#FA8A63] hover:bg-[#e77a54] text-white rounded-md text-xs font-semibold cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
