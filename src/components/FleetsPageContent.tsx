import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Layers,
  Search,
  Filter,
  List,
  GitFork,
  Plus,
  FileDown,
  Upload,
  RefreshCw,
  MoreVertical,
  Edit2,
  Eye,
  Trash2,
  Users,
  Truck,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Bookmark,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import {
  Fleet,
  FleetStatus,
  FLEET_STATUSES,
  INITIAL_DEMO_FLEETS,
  FLEET_12_COLUMNS_CATALOGUE,
  DEFAULT_FLEET_VISIBLE_COLUMNS,
  computeFleetCounts
} from '../types/fleet';
import { FleetDrawer } from './FleetDrawer';
import { FleetFilterDrawer } from './FleetFilterDrawer';
import { FleetBulkDrawer } from './FleetBulkDrawer';
import { FleetImportModal } from './FleetImportModal';
import { FleetExportModal } from './FleetExportModal';
import { FleetHierarchyView } from './FleetHierarchyView';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';
import { RowActionMenu } from './common/RowActionMenu';
import { DeleteConfirmationModal } from './common/DeleteConfirmationModal';

interface SavedFleetView {
  id: string;
  name: string;
  visibleColumns: string[];
  filters: Record<string, any>;
  statusTab: string;
  filterMode: 'basic' | 'advanced';
}

const DEFAULT_SAVED_FLEET_VIEWS: SavedFleetView[] = [
  {
    id: 'view-default',
    name: 'Default View',
    visibleColumns: DEFAULT_FLEET_VISIBLE_COLUMNS,
    filters: {},
    statusTab: 'all',
    filterMode: 'basic'
  },
  {
    id: 'view-active-ops',
    name: 'Active Operations',
    visibleColumns: ['name', 'status', 'service_area', 'zone', 'drivers_count', 'task'],
    filters: { status: ['active', 'scaling'] },
    statusTab: 'all',
    filterMode: 'basic'
  },
  {
    id: 'view-mundra-fleets',
    name: 'Mundra Fleets',
    visibleColumns: ['name', 'service_area', 'zone', 'parent', 'drivers_count', 'status'],
    filters: { service_area: ['Mundra Port'] },
    statusTab: 'all',
    filterMode: 'basic'
  },
  {
    id: 'view-root-parents',
    name: 'Root Fleets',
    visibleColumns: ['name', 'parent', 'service_area', 'status', 'drivers_count'],
    filters: {},
    statusTab: 'all',
    filterMode: 'basic'
  }
];

export const FleetsPageContent: React.FC = () => {
  // Master Fleet state initialized with the 16 demo fleets
  const [fleets, setFleets] = useState<Fleet[]>(INITIAL_DEMO_FLEETS);

  // Status Tab: 'all' | 'active' | 'inactive' | 'on_hold' | 'scaling' | 'downsizing' | 'seasonal' | 'pilot' | 'decommissioning'
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all');

  // Directory View Mode: 'directory' (table) vs 'hierarchy' (tree)
  const [viewMode, setViewMode] = useState<'directory' | 'hierarchy'>('directory');
  const [highlightedHierarchyFleetId, setHighlightedHierarchyFleetId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({});
  const [filterMode, setFilterMode] = useState<'basic' | 'advanced'>('basic');

  // Column visibility & Pinning state
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(DEFAULT_FLEET_VISIBLE_COLUMNS);
  const [pinnedColumnKeys, setPinnedColumnKeys] = useState<string[]>(['name']);

  // Selection state
  const [selectedFleetIds, setSelectedFleetIds] = useState<Set<string>>(new Set());

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Saved views state
  const [savedViews, setSavedViews] = useState<SavedFleetView[]>(DEFAULT_SAVED_FLEET_VIEWS);
  const [currentViewId, setCurrentViewId] = useState<string>('view-default');
  const [isSavedViewsDropdownOpen, setIsSavedViewsDropdownOpen] = useState(false);
  const [showCreateViewInput, setShowCreateViewInput] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  // Single Deletion Modals state
  const [fleetToDelete, setFleetToDelete] = useState<Fleet | null>(null);
  const [blockedDeleteReason, setBlockedDeleteReason] = useState<{ fleet: Fleet; reason: string } | null>(null);

  // Drawers and Modals state
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'view' | 'edit';
    fleet?: Fleet;
    initialTab?: 'overview' | 'drivers' | 'vehicles';
  }>({ isOpen: false, mode: 'create' });

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isBulkDrawerOpen, setIsBulkDrawerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Fast map for parent name lookups
  const fleetMap = useMemo(() => {
    const map = new Map<string, Fleet>();
    fleets.forEach((f) => map.set(f.id, f));
    return map;
  }, [fleets]);

  // Status Tab Counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: fleets.length,
      active: 0,
      inactive: 0,
      on_hold: 0,
      scaling: 0,
      downsizing: 0,
      seasonal: 0,
      pilot: 0,
      decommissioning: 0
    };
    fleets.forEach((f) => {
      if (counts[f.status] !== undefined) {
        counts[f.status]++;
      }
    });
    return counts;
  }, [fleets]);

  // Applied filter count
  const appliedFilterCount = useMemo(() => {
    return Object.keys(appliedFilters).filter((k) => {
      const val = appliedFilters[k];
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'string') return val.trim().length > 0;
      if (typeof val === 'object' && val !== null) {
        return Boolean(val.from || val.to);
      }
      return Boolean(val);
    }).length;
  }, [appliedFilters]);

  // Filtered and Sorted Fleets List
  const filteredFleets = useMemo(() => {
    let list = [...fleets];

    // Status Tab filter
    if (activeStatusTab !== 'all') {
      list = list.filter((f) => f.status === activeStatusTab);
    }

    // Search Query (source fields: name, task, public_id)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.name?.toLowerCase().includes(q) ||
          f.task?.toLowerCase().includes(q) ||
          f.public_id?.toLowerCase().includes(q)
      );
    }

    // Applied Drawer Filters
    const filterKeys = Object.keys(appliedFilters).filter((k) => {
      const val = appliedFilters[k];
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'string') return val.trim().length > 0;
      if (typeof val === 'object' && val !== null) return Boolean(val.from || val.to);
      return Boolean(val);
    });

    if (filterKeys.length > 0) {
      list = list.filter((fleet) => {
        const checkCriterion = (key: string): boolean => {
          const filterVal = appliedFilters[key];

          switch (key) {
            case 'name':
              return fleet.name?.toLowerCase().includes(filterVal.toLowerCase()) || false;
            case 'public_id':
              return fleet.public_id?.toLowerCase().includes(filterVal.toLowerCase()) || false;
            case 'task':
              return fleet.task?.toLowerCase().includes(filterVal.toLowerCase()) || false;
            case 'status':
              return Array.isArray(filterVal) ? filterVal.includes(fleet.status) : fleet.status === filterVal;
            case 'service_area':
              return Array.isArray(filterVal)
                ? filterVal.includes(fleet.service_area)
                : fleet.service_area === filterVal;
            case 'zone':
              return Array.isArray(filterVal) ? filterVal.includes(fleet.zone) : fleet.zone === filterVal;
            case 'vendor':
              return Array.isArray(filterVal) ? filterVal.includes(fleet.vendor) : fleet.vendor === filterVal;
            case 'parent':
              return Array.isArray(filterVal) ? filterVal.includes(fleet.parent) : fleet.parent === filterVal;
            case 'created_at':
              if (!fleet.created_at) return false;
              const createdDate = fleet.created_at.slice(0, 10);
              if (filterVal.from && createdDate < filterVal.from) return false;
              if (filterVal.to && createdDate > filterVal.to) return false;
              return true;
            case 'updated_at':
              if (!fleet.updated_at) return false;
              const updatedDate = fleet.updated_at.slice(0, 10);
              if (filterVal.from && updatedDate < filterVal.from) return false;
              if (filterVal.to && updatedDate > filterVal.to) return false;
              return true;
            default:
              return true;
          }
        };

        if (filterMode === 'advanced') {
          // Status is always mandatory AND even in advanced mode
          const statusVal = appliedFilters['status'];
          let statusMatches = true;
          if (statusVal && Array.isArray(statusVal) && statusVal.length > 0) {
            statusMatches = statusVal.includes(fleet.status);
          }
          const nonStatusKeys = filterKeys.filter((k) => k !== 'status');
          if (nonStatusKeys.length === 0) return statusMatches;
          const otherMatches = nonStatusKeys.some((k) => checkCriterion(k));
          return statusMatches && otherMatches;
        } else {
          // Basic mode: all conditions must match (AND)
          return filterKeys.every((k) => checkCriterion(k));
        }
      });
    }

    // Sorting
    if (sortField) {
      list.sort((a, b) => {
        let valA: any = (a as any)[sortField] ?? '';
        let valB: any = (b as any)[sortField] ?? '';

        // Numeric comparisons for counts
        if (sortField === 'drivers_count') {
          valA = a.driverIds?.length || 0;
          valB = b.driverIds?.length || 0;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        if (sortField === 'drivers_online_count') {
          valA = computeFleetCounts(a).driversOnlineCount;
          valB = computeFleetCounts(b).driversOnlineCount;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        if (sortField === 'parent') {
          valA = a.parent ? fleetMap.get(a.parent)?.name || '' : '';
          valB = b.parent ? fleetMap.get(b.parent)?.name || '' : '';
        }

        if (typeof valA === 'string') {
          const cmp = valA.localeCompare(valB);
          return sortDirection === 'asc' ? cmp : -cmp;
        } else if (typeof valA === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }

    return list;
  }, [fleets, activeStatusTab, searchQuery, appliedFilters, filterMode, sortField, sortDirection, fleetMap]);

  // Paginated Fleets
  const paginatedFleets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFleets.slice(start, start + pageSize);
  }, [filteredFleets, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredFleets.length / pageSize));

  // Selection helpers
  const isAllPageSelected =
    paginatedFleets.length > 0 &&
    paginatedFleets.every((f) => selectedFleetIds.has(f.id));
  const isSomePageSelected =
    paginatedFleets.some((f) => selectedFleetIds.has(f.id)) && !isAllPageSelected;

  const toggleSelectPage = () => {
    const next = new Set(selectedFleetIds);
    if (isAllPageSelected) {
      paginatedFleets.forEach((f) => next.delete(f.id));
    } else {
      paginatedFleets.forEach((f) => next.add(f.id));
    }
    setSelectedFleetIds(next);
  };

  const toggleSelectFleet = (id: string) => {
    const next = new Set(selectedFleetIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedFleetIds(next);
  };

  const selectAllMatching = () => {
    const next = new Set<string>();
    filteredFleets.forEach((f) => next.add(f.id));
    setSelectedFleetIds(next);
  };

  const clearSelection = () => {
    setSelectedFleetIds(new Set());
  };

  const selectedFleetsList = useMemo(() => {
    return fleets.filter((f) => selectedFleetIds.has(f.id));
  }, [fleets, selectedFleetIds]);

  // Pinned vs Unpinned Ordered Columns
  const orderedVisibleColumns = useMemo(() => {
    const catalogueMap = new Map(FLEET_12_COLUMNS_CATALOGUE.map((c) => [c.key, c]));
    const visibleDefs = visibleColumnKeys
      .map((k) => catalogueMap.get(k))
      .filter(Boolean) as typeof FLEET_12_COLUMNS_CATALOGUE;

    const pinned = visibleDefs.filter((c) => pinnedColumnKeys.includes(c.key));
    const unpinned = visibleDefs.filter((c) => !pinnedColumnKeys.includes(c.key));
    return [...pinned, ...unpinned];
  }, [visibleColumnKeys, pinnedColumnKeys]);

  // Single Deletion Logic
  const handleInitiateSingleDelete = (fleet: Fleet) => {
    const driverCount = fleet.driverIds ? fleet.driverIds.length : 0;
    const vehicleCount = fleet.vehicleIds ? fleet.vehicleIds.length : 0;
    const children = fleets.filter((f) => f.parent === fleet.id);

    if (children.length > 0) {
      setBlockedDeleteReason({
        fleet,
        reason: `Cannot delete "${fleet.name}" because it has ${children.length} child fleet(s) referencing it.`
      });
      return;
    }

    if (driverCount > 0 || vehicleCount > 0) {
      setBlockedDeleteReason({
        fleet,
        reason: `Cannot delete "${fleet.name}" because it has direct members (${driverCount} drivers, ${vehicleCount} vehicles). Remove memberships first.`
      });
      return;
    }

    setFleetToDelete(fleet);
  };

  const handleConfirmSingleDelete = () => {
    if (!fleetToDelete) return;
    const idToDelete = fleetToDelete.id;
    setFleets((prev) => prev.filter((f) => f.id !== idToDelete));
    setSelectedFleetIds((prev) => {
      const next = new Set(prev);
      next.delete(idToDelete);
      return next;
    });
    showToast(`Fleet "${fleetToDelete.name}" deleted successfully`);
    setFleetToDelete(null);
  };

  // Bulk Deletion Handler
  const handleCommitBulkDelete = (eligibleIds: string[]) => {
    setFleets((prev) => prev.filter((f) => !eligibleIds.includes(f.id)));
    setSelectedFleetIds((prev) => {
      const next = new Set(prev);
      eligibleIds.forEach((id) => next.delete(id));
      return next;
    });
    showToast(`Deleted ${eligibleIds.length} eligible fleet grouping(s)`);
  };

  // Reset demo sample data
  const handleResetSampleFleets = () => {
    setFleets(INITIAL_DEMO_FLEETS);
    setSelectedFleetIds(new Set());
    setActiveStatusTab('all');
    setSearchQuery('');
    setAppliedFilters({});
    showToast('Reset to 16 canonical sample fleets', 'info');
  };

  // Saved Views handlers
  const handleApplySavedView = (view: SavedFleetView) => {
    setCurrentViewId(view.id);
    setVisibleColumnKeys(view.visibleColumns);
    setAppliedFilters(view.filters);
    setActiveStatusTab(view.statusTab);
    setFilterMode(view.filterMode);
    setCurrentPage(1);
    setIsSavedViewsDropdownOpen(false);
    showToast(`Applied view "${view.name}"`, 'info');
  };

  const handleSaveCurrentView = () => {
    if (!newViewName.trim()) return;
    const newView: SavedFleetView = {
      id: `view-custom-${Date.now()}`,
      name: newViewName.trim(),
      visibleColumns: [...visibleColumnKeys],
      filters: { ...appliedFilters },
      statusTab: activeStatusTab,
      filterMode
    };
    setSavedViews([...savedViews, newView]);
    setCurrentViewId(newView.id);
    setNewViewName('');
    setShowCreateViewInput(false);
    showToast(`Saved view "${newView.name}"`);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F8FAFC] text-slate-800 font-sans text-xs">
      {/* Toast Feedback Banner */}
      {toast && (
        <div
          className={`fixed bottom-5 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-slate-900 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : toast.type === 'error' ? (
            <AlertCircle size={16} />
          ) : (
            <Sparkles size={16} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Page Header */}
      <div className="px-6 pt-5 pb-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fleets</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage operational fleet groupings, direct driver/vehicle memberships, and hierarchical parent-child relationships.
            </p>
          </div>

          {/* Quick Header CTA Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetSampleFleets}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Reset to 16 canonical sample fleets"
            >
              <RefreshCw size={13} className="text-slate-500" />
              <span>Sample fleets</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Import Fleets from CSV (Fleet Name-only contract)"
            >
              <Upload size={14} className="text-slate-500" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export Fleets (14 fixed columns, XLSX or CSV)"
            >
              <FileDown size={14} className="text-slate-500" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerState({ isOpen: true, mode: 'create' })}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Create fleet</span>
            </button>
          </div>
        </div>

        {/* 9 Internal Fleet Status Tabs */}
        <div className="flex items-center justify-between mt-4 border-b border-slate-200 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-6">
            {[
              { id: 'all', label: 'All fleets', count: statusCounts.all },
              { id: 'active', label: 'Active', count: statusCounts.active },
              { id: 'inactive', label: 'Inactive', count: statusCounts.inactive },
              { id: 'on_hold', label: 'On Hold', count: statusCounts.on_hold },
              { id: 'scaling', label: 'Scaling', count: statusCounts.scaling },
              { id: 'downsizing', label: 'Downsizing', count: statusCounts.downsizing },
              { id: 'seasonal', label: 'Seasonal', count: statusCounts.seasonal },
              { id: 'pilot', label: 'Pilot', count: statusCounts.pilot },
              { id: 'decommissioning', label: 'Decommissioning', count: statusCounts.decommissioning }
            ].map((tab) => {
              const isActive = activeStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveStatusTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 pb-2.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap relative ${
                    isActive ? 'text-[#FA8A63]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-orange-100 text-[#FA8A63]' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FA8A63] rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Directory Inner Toolbar */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Search & Filters Drawer Trigger & Saved Views */}
        <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search fleets by name, task, ID..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#FA8A63] rounded-lg text-xs placeholder:text-slate-400 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              appliedFilterCount > 0
                ? 'bg-orange-50 border-orange-200 text-[#FA8A63]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter size={13} />
            <span>Filters</span>
            {appliedFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#FA8A63] text-white text-[10px] font-bold flex items-center justify-center">
                {appliedFilterCount}
              </span>
            )}
          </button>

          {appliedFilterCount > 0 && (
            <button
              type="button"
              onClick={() => setAppliedFilters({})}
              className="text-[11px] text-slate-500 hover:text-red-600 font-semibold underline cursor-pointer"
            >
              Reset
            </button>
          )}

          {/* Saved Views Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSavedViewsDropdownOpen(!isSavedViewsDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Bookmark size={13} className="text-slate-400" />
              <span className="max-w-[110px] truncate">
                {savedViews.find((v) => v.id === currentViewId)?.name || 'Views'}
              </span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {isSavedViewsDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Saved Views
                </div>
                <div className="space-y-0.5 max-h-56 overflow-y-auto py-1">
                  {savedViews.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => handleApplySavedView(v)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                        currentViewId === v.id
                          ? 'bg-orange-50 text-[#FA8A63] font-bold'
                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <span className="truncate">{v.name}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-1.5 mt-1">
                  {showCreateViewInput ? (
                    <div className="p-1 space-y-1.5">
                      <input
                        type="text"
                        placeholder="View name..."
                        value={newViewName}
                        onChange={(e) => setNewViewName(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-[#FA8A63]"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowCreateViewInput(false)}
                          className="px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveCurrentView}
                          className="px-2.5 py-0.5 text-[11px] font-bold bg-[#FA8A63] text-white rounded"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCreateViewInput(true)}
                      className="w-full text-left px-2 py-1 text-xs text-[#FA8A63] hover:bg-orange-50 rounded-md font-semibold flex items-center gap-1.5"
                    >
                      <Plus size={12} />
                      <span>Save current as new view</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Columns Catalogue, Directory/Hierarchy Switcher, Bulk Trigger, Refresh */}
        <div className="flex items-center gap-2">
          {/* Bulk Operations Trigger */}
          <button
            type="button"
            disabled={selectedFleetIds.size === 0}
            onClick={() => setIsBulkDrawerOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedFleetIds.size > 0
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title={
              selectedFleetIds.size === 0
                ? 'Select one or more fleets to perform bulk operations'
                : `Apply bulk operations to ${selectedFleetIds.size} fleets`
            }
          >
            <span>Bulk actions</span>
            {selectedFleetIds.size > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-purple-700 text-[10px] font-bold flex items-center justify-center">
                {selectedFleetIds.size}
              </span>
            )}
          </button>

          {/* Column Catalogue Popover */}
          <ColumnCataloguePopover
            columns={FLEET_12_COLUMNS_CATALOGUE.map((c) => ({
              key: c.key,
              label: c.label,
              category: c.group,
              required: c.required,
            }))}
            visibleKeys={visibleColumnKeys}
            onChangeVisibleKeys={setVisibleColumnKeys}
            defaultKeys={DEFAULT_FLEET_VISIBLE_COLUMNS}
            roleDefaultKeys={DEFAULT_FLEET_VISIBLE_COLUMNS}
            pinnedKeys={pinnedColumnKeys}
            onChangePinnedKeys={setPinnedColumnKeys}
            defaultPinnedKeys={['name']}
            onToast={(msg) => showToast(msg, 'info')}
          />

          {/* Directory / Hierarchy View Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('directory')}
              className={`p-1 rounded cursor-pointer transition-colors ${
                viewMode === 'directory'
                  ? 'bg-white shadow-2xs text-[#FA8A63]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table Directory view"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('hierarchy')}
              className={`p-1 rounded cursor-pointer transition-colors ${
                viewMode === 'hierarchy'
                  ? 'bg-white shadow-2xs text-[#FA8A63]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Fleet Hierarchy view"
            >
              <GitFork size={14} />
            </button>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => showToast('Fleets directory refreshed', 'info')}
            title="Refresh directory"
            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Applied Filter Chips Bar */}
      {appliedFilterCount > 0 && (
        <div className="px-6 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2 flex-wrap text-[11px]">
          <span className="font-bold text-slate-500">Active filters:</span>
          {Object.entries(appliedFilters).map(([k, val]) => {
            if (!val || (Array.isArray(val) && val.length === 0)) return null;
            const labelStr = Array.isArray(val)
              ? val.join(', ')
              : typeof val === 'object'
              ? `${val.from || 'Start'} to ${val.to || 'End'}`
              : val.toString();

            return (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-2xs"
              >
                <span className="font-semibold capitalize">{k.replace('_', ' ')}:</span>
                <span className="text-slate-900 max-w-[150px] truncate">{labelStr}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...appliedFilters };
                    delete next[k];
                    setAppliedFilters(next);
                  }}
                  className="p-0.5 hover:text-red-600 cursor-pointer"
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => setAppliedFilters({})}
            className="text-[11px] text-red-600 hover:underline font-semibold ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Multi-Selection Action Bar (Appears when >=1 row selected) */}
      {selectedFleetIds.size > 0 && (
        <div className="px-6 py-2 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xs text-orange-950 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#FA8A63] text-white flex items-center justify-center text-[11px]">
                {selectedFleetIds.size}
              </span>
              <span>fleets selected</span>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-[11px] text-slate-600">Selection persists across pages</span>
            {selectedFleetIds.size < filteredFleets.length && (
              <button
                type="button"
                onClick={selectAllMatching}
                className="text-xs text-[#FA8A63] font-bold hover:underline cursor-pointer"
              >
                Select all {filteredFleets.length} matching fleets
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#FA8A63] hover:bg-[#e77a54] text-white font-semibold rounded-lg shadow-2xs text-xs cursor-pointer"
            >
              <span>Bulk operations</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg shadow-2xs text-xs cursor-pointer"
            >
              <FileDown size={13} />
              <span>Export selected</span>
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-800 font-semibold text-xs cursor-pointer"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Main Body Area: Table Directory View vs Hierarchy Tree View */}
      <div className="flex-1 overflow-auto bg-white">
        {viewMode === 'hierarchy' ? (
          /* Hierarchy Tree View */
          <FleetHierarchyView
            fleets={fleets}
            expandedFleetId={highlightedHierarchyFleetId}
            onViewFleet={(fleet) => setDrawerState({ isOpen: true, mode: 'view', fleet })}
          />
        ) : filteredFleets.length === 0 ? (
          /* Empty State */
          <div className="py-20 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Layers size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {fleets.length === 0 ? 'Add your first fleet' : 'No matching fleets'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {fleets.length === 0
                ? 'Create a fleet grouping or restore sample data to organize drivers and vehicles.'
                : 'No fleets match your current search terms, status tabs, or applied filters.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              {fleets.length === 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDrawerState({ isOpen: true, mode: 'create' })}
                    className="px-4 py-1.5 bg-[#FA8A63] text-white rounded-lg font-semibold text-xs shadow-xs"
                  >
                    Create fleet
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSampleFleets}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs"
                  >
                    Use sample fleets
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setAppliedFilters({});
                    setActiveStatusTab('all');
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs"
                >
                  Clear filters and search
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Dense Data Table */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse select-text">
              <thead className="bg-[#F8FAFC] sticky top-0 z-10 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                <tr>
                  {/* Master Checkbox */}
                  <th className="w-10 px-3.5 py-3 text-center border-r border-slate-100 bg-[#F8FAFC]">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomePageSelected;
                      }}
                      onChange={toggleSelectPage}
                      className="w-3.5 h-3.5 text-[#FA8A63] rounded border-slate-300 focus:ring-0 cursor-pointer"
                    />
                  </th>

                  {/* Rendered Columns */}
                  {orderedVisibleColumns.map((col) => {
                    const isSorted = sortField === col.key;
                    const isPinned = pinnedColumnKeys.includes(col.key);

                    return (
                      <th
                        key={col.key}
                        style={{ minWidth: col.minWidth }}
                        className={`px-3 py-3 border-r border-slate-100 last:border-r-0 whitespace-nowrap cursor-pointer hover:bg-slate-100/70 transition-colors ${
                          isPinned ? 'bg-slate-50/80 sticky left-10 z-2' : ''
                        }`}
                        onClick={() => {
                          if (sortField === col.key) {
                            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField(col.key);
                            setSortDirection('asc');
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{col.label}</span>
                          <span className="text-slate-400 shrink-0">
                            {isSorted ? (
                              sortDirection === 'asc' ? (
                                <ChevronUp size={12} className="text-[#FA8A63]" />
                              ) : (
                                <ChevronDown size={12} className="text-[#FA8A63]" />
                              )
                            ) : null}
                          </span>
                        </div>
                      </th>
                    );
                  })}

                  {/* Sticky Right Actions Column */}
                  <th className="w-16 px-4 py-3 text-right font-bold text-slate-700 sticky right-0 bg-[#F8FAFC] border-l border-slate-200 z-10">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedFleets.map((fleet) => {
                  const isSelected = selectedFleetIds.has(fleet.id);
                  const counts = computeFleetCounts(fleet);
                  const statusDef = FLEET_STATUSES.find((s) => s.code === fleet.status);
                  const parentRecord = fleet.parent ? fleetMap.get(fleet.parent) : null;

                  return (
                    <tr
                      key={fleet.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        isSelected ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-3.5 py-2.5 text-center border-r border-slate-100">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectFleet(fleet.id)}
                          className="w-3.5 h-3.5 text-[#FA8A63] rounded border-slate-300 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Render Visible Columns */}
                      {orderedVisibleColumns.map((col) => {
                        const isPinned = pinnedColumnKeys.includes(col.key);

                        return (
                          <td
                            key={col.key}
                            style={{ minWidth: col.minWidth }}
                            className={`px-3 py-2.5 border-r border-slate-100 whitespace-nowrap text-slate-800 ${
                              isPinned
                                ? 'bg-white/95 sticky left-10 z-2 group-hover:bg-slate-50/95'
                                : ''
                            }`}
                          >
                            {/* Column Cell Rendering */}
                            {col.key === 'name' ? (
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 text-[#FA8A63] flex items-center justify-center font-bold text-[11px] shrink-0">
                                  {fleet.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <span
                                    onClick={() =>
                                      setDrawerState({ isOpen: true, mode: 'view', fleet })
                                    }
                                    className="font-bold text-slate-900 hover:text-[#FA8A63] cursor-pointer truncate block"
                                  >
                                    {fleet.name}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400 block truncate">
                                    {fleet.public_id}
                                  </span>
                                </div>
                              </div>
                            ) : col.key === 'status' ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  statusDef?.badgeClass || 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {statusDef?.label || fleet.status}
                              </span>
                            ) : col.key === 'parent' ? (
                              parentRecord ? (
                                <span className="font-medium text-slate-700 truncate block">
                                  {parentRecord.name}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )
                            ) : col.key === 'service_area' ? (
                              <span className="font-medium text-slate-700">
                                {fleet.service_area || '—'}
                              </span>
                            ) : col.key === 'zone' ? (
                              <span className="font-medium text-slate-700">
                                {fleet.zone || '—'}
                              </span>
                            ) : col.key === 'vendor' ? (
                              <span className="font-medium text-slate-700">
                                {fleet.vendor || '—'}
                              </span>
                            ) : col.key === 'public_id' ? (
                              <span className="font-mono font-semibold text-slate-600">
                                {fleet.public_id}
                              </span>
                            ) : col.key === 'company' ? (
                              <span className="font-medium text-slate-700">
                                {fleet.company || '—'}
                              </span>
                            ) : col.key === 'drivers_count' ? (
                              <span className="font-bold text-slate-900">
                                {counts.directDriversCount}
                              </span>
                            ) : col.key === 'drivers_online_count' ? (
                              <span className="font-semibold text-emerald-600">
                                {counts.driversOnlineCount}
                              </span>
                            ) : col.key === 'vehicles_count' ? (
                              <span className="font-bold text-slate-900">
                                {counts.directVehiclesCount}
                              </span>
                            ) : col.key === 'vehicles_online_count' ? (
                              <span className="font-semibold text-emerald-600">
                                {counts.vehiclesOnlineCount}
                              </span>
                            ) : col.key === 'task' ? (
                              <span className="text-slate-600 truncate block max-w-[220px]">
                                {fleet.task || '—'}
                              </span>
                            ) : col.key === 'created_at' ? (
                              <span className="text-slate-500 font-mono text-[11px]">
                                {fleet.created_at || '—'}
                              </span>
                            ) : col.key === 'updated_at' ? (
                              <span className="text-slate-500 font-mono text-[11px]">
                                {fleet.updated_at || '—'}
                              </span>
                            ) : (
                              <span>{(fleet as any)[col.key]?.toString() || '—'}</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Sticky Right Actions Column */}
                      <td className="sticky right-0 bg-white/95 group-hover:bg-slate-50/95 border-l border-slate-200 px-3 py-3 text-right whitespace-nowrap z-10">
                        <div className="inline-flex items-center justify-end">
                          <RowActionMenu
                            ariaLabel={`Actions for ${fleet.name}`}
                            items={[
                              {
                                id: 'view',
                                label: 'View fleet',
                                icon: <Eye size={13} className="text-slate-400" />,
                                onClick: () => setDrawerState({ isOpen: true, mode: 'view', fleet }),
                              },
                              {
                                id: 'edit',
                                label: 'Edit fleet',
                                icon: <Edit2 size={13} className="text-slate-400" />,
                                onClick: () => setDrawerState({ isOpen: true, mode: 'edit', fleet }),
                              },
                              {
                                id: 'drivers',
                                label: 'Assign / remove drivers',
                                icon: <Users size={13} className="text-blue-500" />,
                                onClick: () =>
                                  setDrawerState({
                                    isOpen: true,
                                    mode: 'edit',
                                    fleet,
                                    initialTab: 'drivers',
                                  }),
                              },
                              {
                                id: 'vehicles',
                                label: 'Assign / remove vehicles',
                                icon: <Truck size={13} className="text-orange-500" />,
                                onClick: () =>
                                  setDrawerState({
                                    isOpen: true,
                                    mode: 'edit',
                                    fleet,
                                    initialTab: 'vehicles',
                                  }),
                              },
                              {
                                id: 'hierarchy',
                                label: 'View hierarchy',
                                icon: <GitFork size={13} className="text-purple-500" />,
                                onClick: () => {
                                  setHighlightedHierarchyFleetId(fleet.id);
                                  setViewMode('hierarchy');
                                },
                              },
                              {
                                id: 'delete',
                                label: 'Delete fleet',
                                icon: <Trash2 size={13} />,
                                tone: 'danger',
                                dividerBefore: true,
                                onClick: () => handleInitiateSingleDelete(fleet),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Directory Footer with Pagination */}
      {viewMode === 'directory' && (
        <div className="px-6 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-4">
            <span>
              Showing{' '}
              <span className="font-semibold text-slate-800">
                {filteredFleets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * pageSize, filteredFleets.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-800">{filteredFleets.length}</span> fleets
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700 font-semibold focus:outline-none focus:border-[#FA8A63]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="First page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-2 text-xs font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Last page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: SINGLE DELETION CONFIRMATION WITH CONFIRMATION CHIPS */}
      <DeleteConfirmationModal
        isOpen={Boolean(fleetToDelete)}
        zIndexClass="z-[60]"
        title="Delete fleet?"
        description={
          fleetToDelete ? (
            <>
              Are you sure you want to delete{' '}
              <strong className="text-slate-900 font-bold">{fleetToDelete.name}</strong> (
              {fleetToDelete.public_id})? Deleting a fleet grouping removes only the organizing
              entity. Master Driver and Vehicle records are never deleted.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Delete fleet"
        targetChips={
          fleetToDelete
            ? [
                { id: 'name', label: fleetToDelete.name, tone: 'orange' },
                { id: 'pid', label: fleetToDelete.public_id, tone: 'blue' },
                {
                  id: 'drivers',
                  label: `${fleetToDelete.driverIds?.length || 0} Driver(s)`,
                  tone: 'slate',
                },
                {
                  id: 'vehicles',
                  label: `${fleetToDelete.vehicleIds?.length || 0} Vehicle(s)`,
                  tone: 'slate',
                },
              ]
            : []
        }
        confirmationChips={
          fleetToDelete
            ? [
                {
                  id: 'safe-masters',
                  label: 'Master Drivers & Vehicles Safe',
                  tone: 'emerald',
                },
                {
                  id: 'grouping-only',
                  label: 'Grouping Entity Removal Only',
                  tone: 'amber',
                },
              ]
            : []
        }
        onCancel={() => setFleetToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
      />

      {/* MODAL: BLOCKED DELETION REVIEW (PROTOTYPE SAFETY GUARD) */}
      {blockedDeleteReason && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertTriangle size={20} />
              <h4 className="text-sm font-bold text-slate-900">Deletion requires review</h4>
            </div>
            <p className="text-xs text-slate-600">{blockedDeleteReason.reason}</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBlockedDeleteReason(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetFleet = blockedDeleteReason.fleet;
                  setBlockedDeleteReason(null);
                  setDrawerState({ isOpen: true, mode: 'view', fleet: targetFleet });
                }}
                className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Review fleet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLEET CREATE / VIEW / EDIT DRAWER (3 Tabs) */}
      <FleetDrawer
        isOpen={drawerState.isOpen}
        mode={drawerState.mode}
        initialFleet={drawerState.fleet || null}
        allFleets={fleets}
        initialTab={drawerState.initialTab || 'overview'}
        onClose={() => setDrawerState({ isOpen: false, mode: 'create' })}
        onSaveFleet={(savedFleet) => {
          if (drawerState.mode === 'create') {
            setFleets([savedFleet, ...fleets]);
            setSortField('');
            setCurrentPage(1);
            showToast(`Fleet "${savedFleet.name}" created successfully`);
          } else {
            setFleets((prev) =>
              prev.map((f) => (f.id === savedFleet.id ? savedFleet : f))
            );
            showToast(`Fleet "${savedFleet.name}" updated successfully`);
          }
        }}
        onSwitchToEdit={() =>
          setDrawerState((prev) => ({ ...prev, mode: 'edit' }))
        }
      />

      {/* FLEET 10-FILTER DRAWER */}
      <FleetFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        appliedFilters={appliedFilters}
        filterMode={filterMode}
        allFleets={fleets}
        totalMatchedCount={filteredFleets.length}
        onApplyFilters={(filters, mode) => {
          setAppliedFilters(filters);
          setFilterMode(mode);
          setCurrentPage(1);
          showToast('Filters applied', 'info');
        }}
      />

      {/* FLEET BULK OPERATIONS DRAWER */}
      <FleetBulkDrawer
        isOpen={isBulkDrawerOpen}
        onClose={() => setIsBulkDrawerOpen(false)}
        selectedFleets={selectedFleetsList}
        allFleets={fleets}
        onCommitBulkDelete={handleCommitBulkDelete}
        onExportSelected={() => setIsExportModalOpen(true)}
      />

      {/* FLEET 4-STAGE CSV IMPORT MODAL */}
      <FleetImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingFleets={fleets}
        onImportComplete={(newFleets) => {
          setFleets((prev) => [...newFleets, ...prev]);
          setSortField('');
          setCurrentPage(1);
          showToast(`Successfully imported ${newFleets.length} fleet(s)`);
        }}
      />

      {/* FLEET 14-COLUMN EXPORT MODAL */}
      <FleetExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        allCompanyFleets={fleets}
        selectedFleets={selectedFleetsList}
      />
    </div>
  );
};
