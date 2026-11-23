import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  List,
  Grid,
  Plus,
  FileDown,
  Upload,
  RefreshCw,
  History,
  Check,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit2,
  Eye,
  ShieldCheck,
  FileText,
  UserCheck,
  UserX,
  X,
  AlertCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Radio,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';
import {
  Driver,
  loadDriverMasterStore,
  saveDriverMasterStore,
  deriveDriverBadges,
  isDriverAuthorizedForCompany,
  TransferHistoryJob
} from '../types/driver';
import {
  DRIVER_COLUMNS_CATALOGUE,
  DEFAULT_DRIVER_VISIBLE_COLUMNS,
  countActiveDriverFilters,
  evaluateDriverFilters,
  sanitizeDriverFilters
} from '../types/driverFilters';
import {
  ModalMasterStore,
  getDriverMappingReferences,
  loadModalMasterStore
} from '../types/modalMaster';
import { resolveTransporterVendor } from '../data/vendorsSeed';
import { DriverDrawer } from './DriverDrawer';
import { DriverFilterDrawer } from './DriverFilterDrawer';
import {
  DriverBulkDrawer,
  DriverBulkActionType,
  DriverBulkParams,
  evaluateDriverBulkEligibility
} from './DriverBulkDrawer';
import { DriverImportDrawer } from './DriverImportDrawer';
import { DriverExportModal } from './DriverExportModal';
import { DriverTransferHistoryModal } from './DriverTransferHistoryModal';
import { InfoTooltip } from './InfoTooltip';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';
import { RowActionMenu } from './common/RowActionMenu';
import { DeleteConfirmationModal } from './common/DeleteConfirmationModal';

interface SavedView {
  id: string;
  name: string;
  visibleColumns: string[];
  filters: Record<string, any>;
  statusTab: string;
}

const DRIVER_SAVED_VIEWS_STORAGE_KEY = 'fleetrobo_driver_saved_views_v1';

const DEFAULT_SAVED_VIEWS: SavedView[] = [
  {
    id: 'view-default',
    name: 'Default View',
    visibleColumns: DEFAULT_DRIVER_VISIBLE_COLUMNS,
    filters: {},
    statusTab: 'all'
  },
  {
    id: 'view-pending-verification',
    name: 'Pending Verification',
    visibleColumns: ['name', 'licence', 'phone', 'verification', 'rto', 'police', 'training', 'documents'],
    filters: { verification: ['Pending'] },
    statusTab: 'all'
  },
  {
    id: 'view-expiring-licences',
    name: 'Expiring Licences (30d)',
    visibleColumns: ['name', 'licence', 'phone', 'licenceTo', 'licenceType', 'status'],
    filters: { expiry: ['Expiring within 30 days', 'Expired'] },
    statusTab: 'active'
  },
  {
    id: 'view-unlinked-accounts',
    name: 'Unlinked Accounts',
    visibleColumns: ['name', 'phone', 'accountStatus', 'licence', 'status'],
    filters: { accountStatus: ['Not linked'] },
    statusTab: 'all'
  },
  {
    id: 'view-active-fleet',
    name: 'Active Fleet Drivers',
    visibleColumns: ['name', 'reg', 'phone', 'licence', 'transporter', 'status'],
    filters: { status: ['Active'], mapping: ['Mapped'] },
    statusTab: 'active'
  }
];

function loadInitialSavedViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(DRIVER_SAVED_VIEWS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const defaultIds = new Set(DEFAULT_SAVED_VIEWS.map((v) => v.id));
        const customViews = parsed
          .filter((v) => v && typeof v.id === 'string' && !defaultIds.has(v.id))
          .map((v) => ({
            ...v,
            filters: sanitizeDriverFilters(v.filters)
          }));
        return [...DEFAULT_SAVED_VIEWS, ...customViews];
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_SAVED_VIEWS;
}

interface DriversPageContentProps {
  companyContext?: string;
  readOnly?: boolean;
  showOrganisationColumn?: boolean;
}

export const DriversPageContent: React.FC<DriversPageContentProps> = ({
  companyContext,
  readOnly = false,
  showOrganisationColumn = false,
}) => {
  // Master driver data & live Asset Mapping store
  const [drivers, setDriversState] = useState<Driver[]>(() => loadDriverMasterStore());
  const [modalStore, setModalStore] = useState<ModalMasterStore>(() => loadModalMasterStore());
  const [organisationFilter, setOrganisationFilter] = useState<string>('');

  useEffect(() => {
    const syncDrivers = () => setDriversState(loadDriverMasterStore());
    const syncModal = () => setModalStore(loadModalMasterStore());
    const syncAll = () => {
      syncDrivers();
      syncModal();
    };
    window.addEventListener('fleetrobo:resources-updated', syncDrivers);
    window.addEventListener('fleetrobo:modal-store-updated', syncModal);
    window.addEventListener('storage', syncAll);
    return () => {
      window.removeEventListener('fleetrobo:resources-updated', syncDrivers);
      window.removeEventListener('fleetrobo:modal-store-updated', syncModal);
      window.removeEventListener('storage', syncAll);
    };
  }, []);

  const setDrivers: React.Dispatch<React.SetStateAction<Driver[]>> = (valueOrUpdater) => {
    setDriversState((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      saveDriverMasterStore(next);
      return next;
    });
  };

  const allDriverIds = useMemo(() => new Set(drivers.map((d) => d.id)), [drivers]);

  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  const driverToDeleteRefs = useMemo(() => {
    if (!driverToDelete) return null;
    return getDriverMappingReferences(driverToDelete, modalStore, allDriverIds);
  }, [driverToDelete, modalStore, allDriverIds]);

  const handleConfirmDeleteDriver = () => {
    if (!driverToDelete) return;
    const refs = getDriverMappingReferences(driverToDelete, modalStore, allDriverIds);
    if (refs.hasAnyReference) {
      showToast(
        'Cannot delete driver while Asset Mapping references exist. Archive the driver record instead.',
        'error'
      );
      setDriverToDelete(null);
      return;
    }
    if (!isDriverAuthorizedForCompany(driverToDelete, companyContext)) {
      showToast('You are not authorized to delete records outside the active tenant.', 'error');
      setDriverToDelete(null);
      return;
    }
    const idToDelete = driverToDelete.id;
    setDrivers((prev) => prev.filter((d) => d.id !== idToDelete));
    setSelectedDriverIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(idToDelete);
      return next;
    });
    showToast(`Driver "${driverToDelete.name}" deleted successfully`);
    setDriverToDelete(null);
  };

  // Status Tab: 'all' | 'active' | 'inactive' | 'suspended' | 'archived'
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');

  // Column visibility & Pinning
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(DEFAULT_DRIVER_VISIBLE_COLUMNS);
  const [pinnedColumnKeys, setPinnedColumnKeys] = useState<string[]>(['name']);

  // View mode: Table vs Grid cards
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Selection state
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set());

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // QA screen states: normal | loading | error | restricted | empty
  const [qaScreenState, setQaScreenState] = useState<'normal' | 'loading' | 'error' | 'restricted' | 'empty'>('normal');

  // Saved views state (persisted locally)
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => loadInitialSavedViews());
  const [currentViewId, setCurrentViewId] = useState<string>('view-default');
  const [isSavedViewsDropdownOpen, setIsSavedViewsDropdownOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [showCreateViewInput, setShowCreateViewInput] = useState(false);

  useEffect(() => {
    try {
      const defaultIds = new Set(DEFAULT_SAVED_VIEWS.map((v) => v.id));
      const custom = savedViews.filter((v) => !defaultIds.has(v.id));
      localStorage.setItem(DRIVER_SAVED_VIEWS_STORAGE_KEY, JSON.stringify(custom));
    } catch {
      // ignore
    }
  }, [savedViews]);

  // Modals & Drawers state
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'view' | 'edit';
    driver?: Driver;
    initialTab?: number;
  }>({ isOpen: false, mode: 'create' });

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isBulkDrawerOpen, setIsBulkDrawerOpen] = useState(false);
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Session Transfer History
  const [historyJobs, setHistoryJobs] = useState<TransferHistoryJob[]>([
    {
      id: 'job-init-1',
      type: 'Import',
      name: 'Initial Master Seeding (30 drivers)',
      recordCount: 30,
      timestamp: 'Today, 09:30 AM',
      status: 'Completed'
    }
  ]);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Strict tenant scoping
  const scopedDrivers = useMemo(() => {
    return drivers.filter((d) => isDriverAuthorizedForCompany(d, companyContext));
  }, [drivers, companyContext]);

  // Clear stale selection whenever companyContext switches (prevents cross-tenant bulk actions)
  useEffect(() => {
    setSelectedDriverIds(new Set());
    setCurrentPage(1);
  }, [companyContext]);

  // Prune deleted or now-out-of-scope IDs cleanly
  useEffect(() => {
    const allowedIds = new Set(scopedDrivers.map((d) => d.id));
    setSelectedDriverIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowedIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [scopedDrivers]);

  // Status Tab Counts
  const statusCounts = useMemo(() => {
    const counts = { all: scopedDrivers.length, active: 0, inactive: 0, suspended: 0, archived: 0 };
    scopedDrivers.forEach((d) => {
      const s = d.status.toLowerCase();
      if (s === 'active') counts.active++;
      else if (s === 'inactive') counts.inactive++;
      else if (s === 'suspended') counts.suspended++;
      else if (s === 'archived') counts.archived++;
    });
    return counts;
  }, [scopedDrivers]);

  // Unique organisation options for Platform Admin filter
  const organisationOptions = useMemo(() => {
    const set = new Set<string>();
    scopedDrivers.forEach((d) => {
      if (d.company && d.company.trim()) set.add(d.company.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [scopedDrivers]);

  // Applied filter count calculation
  const appliedFilterCount = useMemo(
    () => countActiveDriverFilters(activeFilters) + (organisationFilter ? 1 : 0),
    [activeFilters, organisationFilter]
  );

  // Pre-filter drivers matching outer tenant, status tab & search (used by FilterDrawer live preview & filteredDrivers)
  const baseMatchedDrivers = useMemo(() => {
    if (qaScreenState === 'empty') return [];

    let list = [...scopedDrivers];

    if (activeStatusTab !== 'all') {
      list = list.filter((d) => d.status.toLowerCase() === activeStatusTab.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((d) => {
        const badges = deriveDriverBadges(d, modalStore, Date.now(), allDriverIds);
        return (
          d.name?.toLowerCase().includes(q) ||
          d.phone?.toLowerCase().includes(q) ||
          d.licence?.toLowerCase().includes(q) ||
          d.company?.toLowerCase().includes(q) ||
          d.transporter?.toLowerCase().includes(q) ||
          badges.mappedVehicleRegs.some((r) => r.toLowerCase().includes(q)) ||
          d.accountName?.toLowerCase().includes(q) ||
          d.accountEmail?.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [scopedDrivers, activeStatusTab, searchQuery, qaScreenState, modalStore, allDriverIds]);

  // Filtered & Sorted Drivers List
  const filteredDrivers = useMemo(() => {
    const mode = filterLogic === 'OR' ? 'advanced' : 'basic';
    let list = baseMatchedDrivers.filter((driver) => {
      if (
        organisationFilter &&
        (driver.company || '').trim().toLowerCase() !== organisationFilter.trim().toLowerCase()
      ) {
        return false;
      }
      return evaluateDriverFilters(driver, activeFilters, mode, {
        modalStore,
        allDriverIds
      });
    });

    // Sorting
    if (sortField) {
      list.sort((a, b) => {
        let valA: any = (a as any)[sortField] ?? '';
        let valB: any = (b as any)[sortField] ?? '';

        if (
          sortField === 'verification' ||
          sortField === 'documents' ||
          sortField === 'accountStatus' ||
          sortField === 'reg'
        ) {
          const badgesA = deriveDriverBadges(a, modalStore, Date.now(), allDriverIds);
          const badgesB = deriveDriverBadges(b, modalStore, Date.now(), allDriverIds);
          if (sortField === 'reg') {
            valA = badgesA.mappedVehicleRegs[0] || '';
            valB = badgesB.mappedVehicleRegs[0] || '';
          } else {
            valA = badgesA[sortField];
            valB = badgesB[sortField];
          }
        }

        if (typeof valA === 'string') {
          const cmp = valA.localeCompare(String(valB ?? ''));
          return sortDirection === 'asc' ? cmp : -cmp;
        } else if (typeof valA === 'number') {
          return sortDirection === 'asc' ? valA - Number(valB ?? 0) : Number(valB ?? 0) - valA;
        }
        return 0;
      });
    }

    return list;
  }, [
    baseMatchedDrivers,
    activeFilters,
    organisationFilter,
    filterLogic,
    sortField,
    sortDirection,
    modalStore,
    allDriverIds
  ]);

  // Paginated Drivers
  const paginatedDrivers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredDrivers.slice(startIndex, startIndex + pageSize);
  }, [filteredDrivers, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / pageSize));

  // Handle master checkbox
  const isAllPageSelected =
    paginatedDrivers.length > 0 &&
    paginatedDrivers.every((d) => selectedDriverIds.has(d.id));
  const isSomePageSelected =
    paginatedDrivers.some((d) => selectedDriverIds.has(d.id)) && !isAllPageSelected;

  const toggleSelectPage = () => {
    const next = new Set(selectedDriverIds);
    if (isAllPageSelected) {
      paginatedDrivers.forEach((d) => next.delete(d.id));
    } else {
      paginatedDrivers.forEach((d) => next.add(d.id));
    }
    setSelectedDriverIds(next);
  };

  const toggleSelectDriver = (id: string) => {
    const next = new Set(selectedDriverIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedDriverIds(next);
  };

  const selectAllFilteredAcrossPages = () => {
    const next = new Set<string>();
    filteredDrivers.forEach((d) => next.add(d.id));
    setSelectedDriverIds(next);
  };

  const clearSelection = () => {
    setSelectedDriverIds(new Set());
  };

  const selectedDriversList = useMemo(() => {
    return scopedDrivers.filter((d) => selectedDriverIds.has(d.id));
  }, [scopedDrivers, selectedDriverIds]);

  const driverCatalogueColumns = useMemo(
    () =>
      DRIVER_COLUMNS_CATALOGUE.map((col) => ({
        key: col.key,
        label: col.label,
        category: col.category,
        required: col.required,
      })),
    []
  );

  // Saved Views handlers
  const handleApplySavedView = (view: SavedView) => {
    setCurrentViewId(view.id);
    setVisibleColumnKeys(view.visibleColumns);
    setActiveFilters(sanitizeDriverFilters(view.filters));
    setActiveStatusTab(view.statusTab);
    setCurrentPage(1);
    setIsSavedViewsDropdownOpen(false);
    showToast(`Applied view "${view.name}"`, 'info');
  };

  const handleSaveCurrentView = () => {
    if (!newViewName.trim()) return;
    const newView: SavedView = {
      id: `view-custom-${Date.now()}`,
      name: newViewName.trim(),
      visibleColumns: [...visibleColumnKeys],
      filters: { ...activeFilters },
      statusTab: activeStatusTab
    };
    setSavedViews([...savedViews, newView]);
    setCurrentViewId(newView.id);
    setNewViewName('');
    setShowCreateViewInput(false);
    showToast(`Saved view "${newView.name}"`);
  };

  const handleDeleteSavedView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (DEFAULT_SAVED_VIEWS.some((v) => v.id === viewId)) {
      showToast('Cannot delete default system views', 'error');
      return;
    }
    setSavedViews(savedViews.filter((v) => v.id !== viewId));
    if (currentViewId === viewId) {
      setCurrentViewId('view-default');
    }
    showToast('Saved view removed');
  };

  // Row ellipsis menu actions (safe status transitions matching bulk policy)
  const handleToggleDriverStatus = (driver: Driver) => {
    if (!isDriverAuthorizedForCompany(driver, companyContext)) {
      showToast('Outside authorized tenant scope.', 'error');
      return;
    }
    if (driver.status === 'Archived') {
      showToast(
        'Archived drivers cannot be activated via quick toggle. Restore from Edit Driver profile.',
        'error'
      );
      return;
    }
    if (driver.status === 'Suspended') {
      showToast(
        'Suspended drivers require compliance review before reactivation. Use Bulk Activate or Edit Driver.',
        'error'
      );
      return;
    }
    const nextStatus = driver.status === 'Active' ? 'Inactive' : 'Active';
    setDrivers((prev) =>
      prev.map((d) => (d.id === driver.id ? { ...d, status: nextStatus } : d))
    );
    if (nextStatus === 'Active') {
      const badges = deriveDriverBadges(driver, modalStore, Date.now(), allDriverIds);
      if (badges.expiry === 'Expired' || badges.expiry === 'Missing') {
        showToast(
          `Driver ${driver.name} set to Active (Note: Licence ${badges.expiry.toLowerCase()})`,
          'info'
        );
        return;
      }
    }
    showToast(`Driver ${driver.name} is now ${nextStatus}`);
  };

  const handleLogHistory = (job: Omit<TransferHistoryJob, 'id' | 'timestamp'>) => {
    const newJob: TransferHistoryJob = {
      ...job,
      id: `job-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setHistoryJobs([newJob, ...historyJobs]);
  };

  // Ordered visible columns respecting pinned first
  const orderedVisibleColumns = useMemo(() => {
    const visibleDefs = DRIVER_COLUMNS_CATALOGUE.filter((c) =>
      visibleColumnKeys.includes(c.key)
    );
    const pinned = visibleDefs.filter((c) => pinnedColumnKeys.includes(c.key));
    const unpinned = visibleDefs.filter((c) => !pinnedColumnKeys.includes(c.key));
    return [...pinned, ...unpinned];
  }, [visibleColumnKeys, pinnedColumnKeys]);

  return (
    <div className="flex flex-col h-full w-full bg-[#F8FAFC] text-slate-800 font-sans text-xs">
      {/* Toast Feedback banner */}
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
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Drivers</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage driver profiles, user account linkages, licences, compliance verification, and vehicle assignments.
            </p>
          </div>

          {/* Quick CTA Actions Header */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Transfer History (Imports, Exports, Bulk Updates)"
            >
              <History size={14} className="text-slate-500" />
              <span>History</span>
              {historyJobs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {historyJobs.length}
                </span>
              )}
            </button>

            {!readOnly && (
              <button
                type="button"
                onClick={() => setIsImportDrawerOpen(true)}
                disabled={qaScreenState === 'restricted'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                title="Import Drivers from CSV"
              >
                <Upload size={14} className="text-slate-500" />
                <span>Import</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export Drivers (XLSX, CSV, XLS, HTML, PDF)"
            >
              <FileDown size={14} className="text-slate-500" />
              <span>Export</span>
            </button>

            {!readOnly && (
              <button
                type="button"
                disabled={qaScreenState === 'restricted'}
                onClick={() => setDrawerState({ isOpen: true, mode: 'create' })}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Create driver</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Tabs Bar */}
        <div className="flex items-center justify-between mt-4 border-b border-slate-200">
          <div className="flex items-center gap-6">
            {[
              { id: 'all', label: 'All drivers', count: statusCounts.all },
              { id: 'active', label: 'Active', count: statusCounts.active },
              { id: 'inactive', label: 'Inactive', count: statusCounts.inactive },
              { id: 'suspended', label: 'Suspended', count: statusCounts.suspended },
              { id: 'archived', label: 'Archived', count: statusCounts.archived }
            ].map((tab) => {
              const isActive = activeStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveStatusTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 pb-2.5 text-xs font-semibold transition-colors cursor-pointer relative ${
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

          {/* QA Screen-State Switcher (as specified in QA testing matrix) */}
          <div className="flex items-center gap-1.5 pb-2 text-[11px] text-slate-500">
            <span className="font-medium text-slate-400">QA State:</span>
            <select
              value={qaScreenState}
              onChange={(e) => setQaScreenState(e.target.value as any)}
              className="bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700 font-semibold focus:outline-none focus:border-[#FA8A63]"
            >
              <option value="normal">Normal (Live prototype)</option>
              <option value="loading">Loading Skeleton</option>
              <option value="error">Error State (Retry)</option>
              <option value="restricted">Restricted (Read-Only)</option>
              <option value="empty">Empty Directory (0 records)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Inner Toolbar */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Search & Filter Drawer Trigger & Saved Views */}
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
              placeholder="Search Drivers (name, phone, licence, company, transporter, reg)..."
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
              onClick={() => {
                setActiveFilters({});
                setOrganisationFilter('');
                setCurrentPage(1);
              }}
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
                      <div className="flex items-center gap-1">
                        {currentViewId === v.id && <Check size={13} />}
                        {!DEFAULT_SAVED_VIEWS.some((d) => d.id === v.id) && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedView(v.id, e)}
                            className="p-1 hover:text-red-600 text-slate-400 rounded"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
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

        {/* Right: Column Catalogue, View Switcher, Bulk trigger, Refresh */}
        <div className="flex items-center gap-2">
          {/* Bulk Operations CTA (enabled when >= 1 selected) */}
          {!readOnly && (
            <button
              type="button"
              disabled={selectedDriverIds.size === 0 || qaScreenState === 'restricted'}
              onClick={() => setIsBulkDrawerOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedDriverIds.size > 0
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title={
                selectedDriverIds.size === 0
                  ? 'Select one or more drivers to perform bulk actions'
                  : `Apply bulk operations to ${selectedDriverIds.size} drivers`
              }
            >
              <SlidersHorizontal size={13} />
              <span>Bulk actions</span>
              {selectedDriverIds.size > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-purple-700 text-[10px] font-bold flex items-center justify-center">
                  {selectedDriverIds.size}
                </span>
              )}
            </button>
          )}

          {/* Column Catalogue Popover */}
          <ColumnCataloguePopover
            columns={driverCatalogueColumns}
            visibleKeys={visibleColumnKeys}
            onChangeVisibleKeys={setVisibleColumnKeys}
            defaultKeys={DEFAULT_DRIVER_VISIBLE_COLUMNS}
            roleDefaultKeys={['name', 'licence', 'phone', 'status', 'reg', 'accountStatus', 'verification', 'documents']}
            pinnedKeys={pinnedColumnKeys}
            onChangePinnedKeys={setPinnedColumnKeys}
            defaultPinnedKeys={['name']}
            onToast={(msg) => showToast(msg, 'info')}
          />

          {/* Table / Grid Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1 rounded cursor-pointer transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-2xs text-[#FA8A63]' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table view"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded cursor-pointer transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-2xs text-[#FA8A63]' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Card grid view"
            >
              <Grid size={14} />
            </button>
          </div>

          {/* Refresh Prototype Button */}
          <button
            type="button"
            onClick={() => {
              setDriversState(loadDriverMasterStore());
              setModalStore(loadModalMasterStore());
              showToast('Directory refreshed', 'info');
            }}
            title="Refresh driver records"
            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Selected Records Action Bar (Appears when 1 or more rows selected) */}
      {selectedDriverIds.size > 0 && (
        <div className="px-6 py-2 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xs text-orange-950 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#FA8A63] text-white flex items-center justify-center text-[11px]">
                {selectedDriverIds.size}
              </span>
              <span>drivers selected</span>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-[11px] text-slate-600">
              Selection persists across pages
            </span>
            {selectedDriverIds.size < filteredDrivers.length && (
              <button
                type="button"
                onClick={selectAllFilteredAcrossPages}
                className="text-xs text-[#FA8A63] font-bold hover:underline cursor-pointer"
              >
                Select all {filteredDrivers.length} matching drivers
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#FA8A63] hover:bg-[#e77a54] text-white font-semibold rounded-lg shadow-2xs text-xs cursor-pointer"
            >
              <SlidersHorizontal size={13} />
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

      {/* Main Content Area: QA States vs Table View vs Grid View */}
      <div className="flex-1 overflow-auto bg-white">
        {qaScreenState === 'loading' ? (
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-lg w-full" />
            <div className="h-12 bg-slate-50 rounded-lg w-full" />
            <div className="h-12 bg-slate-50 rounded-lg w-full" />
            <div className="h-12 bg-slate-50 rounded-lg w-full" />
            <div className="h-12 bg-slate-50 rounded-lg w-full" />
            <div className="h-12 bg-slate-50 rounded-lg w-full" />
          </div>
        ) : qaScreenState === 'error' ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Failed to load driver directory</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              A connection error occurred while querying driver master records. Please retry.
            </p>
            <button
              type="button"
              onClick={() => setQaScreenState('normal')}
              className="px-4 py-1.5 bg-[#FA8A63] text-white rounded-lg font-semibold text-xs shadow-xs"
            >
              Retry
            </button>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Users size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No drivers found</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              No drivers match the current filters, search terms, or status tab.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilters({});
                  setOrganisationFilter('');
                  setActiveStatusTab('all');
                  setQaScreenState('normal');
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs"
              >
                Clear all filters
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setDrawerState({ isOpen: true, mode: 'create' })}
                  className="px-3.5 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white rounded-lg font-semibold text-xs"
                >
                  Create new driver
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid Card View */
          <div className="p-6 grid grid-cols-3 gap-4">
            {paginatedDrivers.map((driver) => {
              const badges = deriveDriverBadges(driver, modalStore, Date.now(), allDriverIds);
              const isSelected = selectedDriverIds.has(driver.id);
              const primaryVehicle = badges.mappedVehicleRegs[0];
              return (
                <div
                  key={driver.id}
                  className={`border rounded-xl p-4 bg-white hover:shadow-md transition-shadow relative space-y-3 ${
                    isSelected ? 'border-[#FA8A63] ring-1 ring-[#FA8A63]' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectDriver(driver.id)}
                        className="w-4 h-4 text-[#FA8A63] rounded border-slate-300 focus:ring-0 cursor-pointer"
                      />
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm uppercase">
                        {driver.accountAvatar ? (
                          <img
                            src={driver.accountAvatar}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          driver.name.slice(0, 2)
                        )}
                      </div>
                      <div>
                        <h4
                          onClick={() => setDrawerState({ isOpen: true, mode: 'view', driver })}
                          className="font-bold text-slate-900 hover:text-[#FA8A63] cursor-pointer text-xs"
                        >
                          {driver.name}
                        </h4>
                        <p className="text-[11px] text-slate-500">{driver.phone}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        driver.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : driver.status === 'Inactive'
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : driver.status === 'Suspended'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {driver.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block">Licence</span>
                      <span className="font-semibold text-slate-800">{driver.licence}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Vehicle</span>
                      <span className="font-semibold text-slate-800">
                        {primaryVehicle
                          ? badges.mappedVehicleRegs.length > 1
                            ? `${primaryVehicle} (+${badges.mappedVehicleRegs.length - 1})`
                            : primaryVehicle
                          : badges.mapping === 'Expired'
                          ? 'Mapping Expired'
                          : badges.hasScheduledMapping
                          ? 'Scheduled'
                          : 'Unassigned'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Phone</span>
                      <span className="font-semibold text-slate-800 truncate block">{driver.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Account</span>
                      <span
                        className={`inline-block font-semibold ${
                          badges.accountStatus === 'Linked' ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      >
                        {badges.accountStatus}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          badges.verification === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {badges.verification}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          badges.documents === 'Complete'
                            ? 'bg-blue-50 text-blue-700'
                            : badges.documents === 'Partial'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        Docs: {badges.documents}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDrawerState({ isOpen: true, mode: 'view', driver })}
                        className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => setDrawerState({ isOpen: true, mode: 'edit', driver })}
                          className="p-1 text-slate-500 hover:text-[#FA8A63] rounded hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse select-text">
              <thead className="bg-[#F8FAFC] sticky top-0 z-10 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                <tr>
                  {/* Master Checkbox Column */}
                  {!readOnly && (
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
                  )}

                  {showOrganisationColumn && (
                    <th className="px-3 py-3 border-r border-slate-100 whitespace-nowrap min-w-[160px]">
                      Organisation Name
                    </th>
                  )}

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
                {paginatedDrivers.map((driver) => {
                  const isSelected = selectedDriverIds.has(driver.id);
                  const badges = deriveDriverBadges(driver, modalStore, Date.now(), allDriverIds);

                  return (
                    <tr
                      key={driver.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        isSelected ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      {!readOnly && (
                        <td className="w-10 px-3.5 py-2.5 text-center border-r border-slate-100">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDriver(driver.id)}
                            className="w-3.5 h-3.5 text-[#FA8A63] rounded border-slate-300 focus:ring-0 cursor-pointer"
                          />
                        </td>
                      )}

                      {showOrganisationColumn && (
                        <td className="px-3 py-2.5 border-r border-slate-100 whitespace-nowrap text-slate-700 font-medium">
                          {driver.company || '—'}
                        </td>
                      )}

                      {/* Render Cell according to orderedVisibleColumns */}
                      {orderedVisibleColumns.map((col) => {
                        const isPinned = pinnedColumnKeys.includes(col.key);
                        return (
                          <td
                            key={col.key}
                            style={{ minWidth: col.minWidth }}
                            className={`px-3 py-2.5 border-r border-slate-100 whitespace-nowrap text-slate-800 ${
                              isPinned ? 'bg-white/95 sticky left-10 z-2 group-hover:bg-slate-50/95' : ''
                            }`}
                          >
                            {/* Specific Custom Cell Rendering */}
                            {col.key === 'name' ? (
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-700 uppercase shrink-0">
                                  {driver.accountAvatar ? (
                                    <img
                                      src={driver.accountAvatar}
                                      alt=""
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  ) : (
                                    driver.name.slice(0, 2)
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      onClick={() =>
                                        setDrawerState({ isOpen: true, mode: 'view', driver })
                                      }
                                      className="font-bold text-slate-900 hover:text-[#FA8A63] cursor-pointer truncate"
                                    >
                                      {driver.name}
                                    </span>
                                    {driver.rfid && (
                                      <span
                                        className="px-1 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-bold shrink-0"
                                        title="RFID enabled"
                                      >
                                        RFID
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400 block truncate">
                                    {driver.phone}
                                  </span>
                                </div>
                              </div>
                            ) : col.key === 'licence' ? (
                              <div className="flex items-center gap-1.5 font-mono text-xs">
                                <span className="font-semibold text-slate-900">{driver.licence}</span>
                                {driver.licenceType && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                    {driver.licenceType}
                                  </span>
                                )}
                              </div>
                            ) : col.key === 'phone' ? (
                              <span className="font-medium text-slate-700">{driver.phone}</span>
                            ) : col.key === 'company' ? (
                              <div>
                                <span className="font-semibold text-slate-900 block truncate">
                                  {driver.company}
                                </span>
                                {driver.transporter && (
                                  <span className="text-[11px] text-slate-400 block truncate">
                                    {driver.transporter}
                                  </span>
                                )}
                              </div>
                            ) : col.key === 'status' ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  driver.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : driver.status === 'Inactive'
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : driver.status === 'Suspended'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}
                              >
                                {driver.status}
                              </span>
                            ) : col.key === 'reg' ? (
                              badges.mappedVehicleRegs.length > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-semibold text-slate-900">
                                    {badges.mappedVehicleRegs[0]}
                                    {badges.mappedVehicleRegs.length > 1
                                      ? ` (+${badges.mappedVehicleRegs.length - 1})`
                                      : ''}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                    Mapped
                                  </span>
                                </div>
                              ) : badges.mapping === 'Expired' ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 italic">Unassigned</span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                                    Expired
                                  </span>
                                </div>
                              ) : badges.hasScheduledMapping ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 italic">Unassigned</span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                                    Scheduled
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )
                            ) : col.key === 'licenceTo' ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`font-medium ${
                                    badges.expiry === 'Expired'
                                      ? 'text-red-600 font-bold'
                                      : badges.expiry === 'Expiring within 30 days'
                                      ? 'text-amber-600 font-bold'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  {driver.licenceTo}
                                </span>
                                {badges.expiry === 'Expired' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-700">
                                    Expired
                                  </span>
                                )}
                                {badges.expiry === 'Expiring within 30 days' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                                    Expiring
                                  </span>
                                )}
                              </div>
                            ) : col.key === 'accountStatus' ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  badges.accountStatus === 'Linked'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {badges.accountStatus === 'Linked' ? (
                                  <UserCheck size={12} />
                                ) : (
                                  <UserX size={12} />
                                )}
                                {badges.accountStatus}
                              </span>
                            ) : col.key === 'accountEmail' ? (
                              <span className="text-slate-600 font-mono text-[11px] truncate block">
                                {driver.accountEmail || '—'}
                              </span>
                            ) : col.key === 'accountRole' ? (
                              <span className="text-slate-700 font-medium">
                                {driver.accountRole || '—'}
                              </span>
                            ) : col.key === 'verification' ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  badges.verification === 'Verified'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {badges.verification === 'Verified' ? (
                                  <ShieldCheck size={11} />
                                ) : (
                                  <Clock size={11} />
                                )}
                                {badges.verification}
                              </span>
                            ) : col.key === 'documents' ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  badges.documents === 'Complete'
                                    ? 'text-emerald-700 bg-emerald-50'
                                    : badges.documents === 'Partial'
                                    ? 'text-amber-700 bg-amber-50'
                                    : 'text-red-700 bg-red-50'
                                }`}
                              >
                                <FileText size={11} />
                                {badges.documents}
                              </span>
                            ) : col.key === 'rto' || col.key === 'police' || col.key === 'training' || col.key === 'vendor' || col.key === 'rfid' ? (
                              <span
                                className={`font-semibold ${
                                  (driver as any)[col.key] ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                              >
                                {(driver as any)[col.key] ? 'Yes' : 'No'}
                              </span>
                            ) : col.key === 'blood' ? (
                              driver.blood ? (
                                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-bold text-[10px] border border-red-100">
                                  {driver.blood}
                                </span>
                              ) : (
                                '—'
                              )
                            ) : col.key === 'experience' ? (
                              driver.experience !== undefined ? (
                                <span>{driver.experience} yrs</span>
                              ) : (
                                '—'
                              )
                            ) : (
                              <span>{(driver as any)[col.key]?.toString() || '—'}</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Sticky Right Actions Column */}
                      <td className="sticky right-0 bg-white/95 group-hover:bg-slate-50/95 border-l border-slate-200 px-3 py-3 text-right whitespace-nowrap z-10">
                        <div className="inline-flex items-center justify-end">
                          <RowActionMenu
                            ariaLabel={`Actions for ${driver.name}`}
                            items={
                              readOnly
                                ? [
                                    {
                                      id: 'view',
                                      label: 'View driver details',
                                      icon: <Eye size={13} className="text-slate-400" />,
                                      onClick: () =>
                                        setDrawerState({ isOpen: true, mode: 'view', driver }),
                                    },
                                  ]
                                : [
                                    {
                                      id: 'view',
                                      label: 'View driver details',
                                      icon: <Eye size={13} className="text-slate-400" />,
                                      onClick: () =>
                                        setDrawerState({ isOpen: true, mode: 'view', driver }),
                                    },
                                    {
                                      id: 'edit',
                                      label: 'Edit driver profile',
                                      icon: <Edit2 size={13} className="text-slate-400" />,
                                      onClick: () =>
                                        setDrawerState({ isOpen: true, mode: 'edit', driver }),
                                    },
                                    {
                                      id: 'account',
                                      label: 'Manage user account',
                                      icon: <UserCheck size={13} className="text-blue-500" />,
                                      onClick: () =>
                                        setDrawerState({
                                          isOpen: true,
                                          mode: 'edit',
                                          driver,
                                          initialTab: 0,
                                        }),
                                    },
                                    {
                                      id: 'docs',
                                      label: 'Upload compliance docs',
                                      icon: <FileText size={13} className="text-emerald-500" />,
                                      onClick: () =>
                                        setDrawerState({
                                          isOpen: true,
                                          mode: 'edit',
                                          driver,
                                          initialTab: 6,
                                        }),
                                    },
                                    {
                                      id: 'toggle-status',
                                      label:
                                        driver.status === 'Active'
                                          ? 'Deactivate driver'
                                          : 'Activate driver',
                                      icon:
                                        driver.status === 'Active' ? (
                                          <AlertCircle size={13} className="text-amber-500" />
                                        ) : (
                                          <CheckCircle2 size={13} className="text-emerald-500" />
                                        ),
                                      dividerBefore: true,
                                      onClick: () => handleToggleDriverStatus(driver),
                                    },
                                    {
                                      id: 'delete',
                                      label: 'Delete driver',
                                      icon: <Trash2 size={13} />,
                                      tone: 'danger',
                                      dividerBefore: true,
                                      onClick: () => setDriverToDelete(driver),
                                    },
                                  ]
                            }
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

      {/* Directory Footer with Pagination & Records Counter */}
      <div className="px-6 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
        <div className="flex items-center gap-4">
          <span>
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {filteredDrivers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, filteredDrivers.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{filteredDrivers.length}</span> drivers
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

        {/* Pagination Navigation */}
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

      {/* Driver Form Drawer (Create / View / Edit 9 Structured Sections) */}
      <DriverDrawer
        isOpen={drawerState.isOpen}
        mode={drawerState.mode}
        initialDriver={drawerState.driver || null}
        existingDrivers={drivers}
        companyContext={companyContext}
        onClose={() => setDrawerState({ isOpen: false, mode: 'create' })}
        onSaveDriver={(savedDriver: Driver) => {
          if (drawerState.mode === 'create') {
            setDrivers([savedDriver, ...drivers]);
            setSortField('');
            setCurrentPage(1);
            showToast(`Driver ${savedDriver.name} created successfully!`);
          } else {
            setDrivers(drivers.map((d) => (d.id === savedDriver.id ? savedDriver : d)));
            showToast(`Driver ${savedDriver.name} updated successfully!`);
          }
        }}
      />

      {/* Driver 27-Filter Drawer */}
      <DriverFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        appliedFilters={activeFilters}
        filterMode={filterLogic === 'OR' ? 'advanced' : 'basic'}
        totalMatchedCount={filteredDrivers.length}
        scopedDrivers={scopedDrivers}
        baseMatchedDrivers={baseMatchedDrivers}
        companyContext={companyContext}
        modalStore={modalStore}
        showOrganisationFilter={showOrganisationColumn}
        organisationFilter={organisationFilter}
        organisationOptions={organisationOptions}
        onOrganisationFilterChange={(org) => {
          setOrganisationFilter(org);
          setCurrentPage(1);
        }}
        onApplyFilters={(filters: Record<string, any>, mode: 'basic' | 'advanced') => {
          setActiveFilters(sanitizeDriverFilters(filters));
          setFilterLogic(mode === 'advanced' ? 'OR' : 'AND');
          setCurrentPage(1);
          showToast('Filters applied', 'info');
        }}
      />

      {/* Driver 6-Operation Bulk Drawer */}
      <DriverBulkDrawer
        isOpen={isBulkDrawerOpen}
        onClose={() => setIsBulkDrawerOpen(false)}
        selectedDrivers={selectedDriversList}
        companyContext={companyContext}
        modalStore={modalStore}
        allDriverIds={allDriverIds}
        onExportSelected={() => setIsExportModalOpen(true)}
        onCommitBulkAction={(
          action: DriverBulkActionType,
          values: DriverBulkParams,
          _eligibleIds: string[]
        ) => {
          // Revalidate tenant authorization & eligibility against live store at commit time
          const rechecked = evaluateDriverBulkEligibility(
            selectedDriversList,
            action,
            values,
            {
              companyContext,
              modalStore,
              allDriverIds
            }
          );
          const verifiedIds = new Set(rechecked.eligible.map((item) => item.driver.id));
          const skippedCount = rechecked.skipped.length;

          if (verifiedIds.size === 0) {
            showToast('No eligible drivers remaining to update.', 'error');
            return;
          }

          setDrivers((prev) =>
            prev.map((d) => {
              if (!verifiedIds.has(d.id)) return d;
              if (action === 'activate') return { ...d, status: 'Active' };
              if (action === 'deactivate') return { ...d, status: 'Inactive' };
              if (action === 'suspend') return { ...d, status: 'Suspended' };
              if (action === 'archive') return { ...d, status: 'Archived' };
              if (action === 'transporter') {
                const nextTransporter = values.transporter || d.transporter;
                return {
                  ...d,
                  transporter: nextTransporter,
                  transporterVendorId:
                    resolveTransporterVendor(nextTransporter)?.id ?? d.transporterVendorId
                };
              }
              if (action === 'verify') {
                const patch: Partial<Driver> = {};
                if (typeof values.rto === 'boolean') patch.rto = values.rto;
                if (typeof values.police === 'boolean') patch.police = values.police;
                if (typeof values.training === 'boolean') patch.training = values.training;
                return { ...d, ...patch };
              }
              return d;
            })
          );

          handleLogHistory({
            type: 'Bulk',
            name: `Bulk ${action.toUpperCase()}`,
            recordCount: verifiedIds.size,
            skippedCount,
            status: skippedCount > 0 ? 'Partial' : 'Completed'
          });

          showToast(
            `Bulk update applied to ${verifiedIds.size} driver${verifiedIds.size === 1 ? '' : 's'}${
              skippedCount > 0 ? ` (${skippedCount} skipped)` : ''
            }!`
          );
          clearSelection();
        }}
      />

      {/* Driver 4-Stage CSV Import Drawer */}
      <DriverImportDrawer
        isOpen={isImportDrawerOpen}
        onClose={() => setIsImportDrawerOpen(false)}
        existingDrivers={drivers}
        companyContext={companyContext}
        onImportComplete={(newDrivers: Driver[], skippedCount: number) => {
          setDrivers([...newDrivers, ...drivers]);
          setSortField('');
          setCurrentPage(1);
          handleLogHistory({
            type: 'Import',
            name: `CSV Import (${newDrivers.length} rows)`,
            recordCount: newDrivers.length,
            skippedCount,
            status: skippedCount > 0 ? 'Partial' : 'Completed'
          });
          showToast(`Successfully imported ${newDrivers.length} drivers!`);
        }}
      />

      {/* Driver 5-Format Export Modal */}
      <DriverExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        filteredDrivers={filteredDrivers}
        selectedDrivers={selectedDriversList}
        visibleColumnIds={visibleColumnKeys}
        modalStore={modalStore}
        allDriverIds={allDriverIds}
        onLogHistory={handleLogHistory}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
      />

      {/* Driver Transfer History Modal */}
      <DriverTransferHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        historyJobs={historyJobs}
        onClearHistory={() => setHistoryJobs([])}
      />

      {/* Delete Driver Confirmation Modal with Confirmation Chips & Mapping Safeguard */}
      <DeleteConfirmationModal
        isOpen={Boolean(driverToDelete)}
        title={driverToDeleteRefs?.hasAnyReference ? 'Driver Deletion Blocked' : 'Delete Driver?'}
        description={
          driverToDelete ? (
            driverToDeleteRefs?.hasAnyReference ? (
              <>
                Driver <strong className="text-slate-900 font-semibold">{driverToDelete.name}</strong> (
                {driverToDelete.licence || driverToDelete.phone}) cannot be permanently deleted because it has{' '}
                {driverToDeleteRefs.allAllocations.length} allocation
                {driverToDeleteRefs.allAllocations.length === 1 ? '' : 's'} and{' '}
                {driverToDeleteRefs.allRelationships.length} relationship
                {driverToDeleteRefs.allRelationships.length === 1 ? '' : 's'} in Asset Mapping.
              </>
            ) : (
              <>
                Are you sure you want to delete driver{' '}
                <strong className="text-slate-900 font-semibold">{driverToDelete.name}</strong> (
                {driverToDelete.licence || driverToDelete.phone})? All driver document files will be removed.
              </>
            )
          ) : (
            ''
          )
        }
        confirmLabel="Delete Driver"
        confirmDisabled={Boolean(driverToDeleteRefs?.hasAnyReference)}
        warningNote={
          driverToDeleteRefs?.hasAnyReference
            ? 'Historical or active driver assignments must not be orphaned. End active mappings in Asset Mapping and use Archive instead of deleting.'
            : undefined
        }
        targetChips={
          driverToDelete
            ? [
                { id: 'name', label: driverToDelete.name, tone: 'orange' },
                ...(driverToDelete.licence || driverToDelete.phone
                  ? [
                      {
                        id: 'lic',
                        label: driverToDelete.licence || driverToDelete.phone,
                        tone: 'blue' as const,
                      },
                    ]
                  : []),
                ...(driverToDelete.company
                  ? [{ id: 'org', label: driverToDelete.company, tone: 'purple' as const }]
                  : []),
                {
                  id: 'status',
                  label: driverToDelete.status,
                  tone: driverToDelete.status === 'Active' ? 'emerald' : 'slate',
                },
              ]
            : []
        }
        confirmationChips={
          driverToDelete && !driverToDeleteRefs?.hasAnyReference
            ? [
                {
                  id: 'docs',
                  label: 'Compliance Docs & Record Removed',
                  tone: 'amber',
                },
                {
                  id: 'scope',
                  label: 'Permanent Driver Record Delete',
                  tone: 'rose',
                },
              ]
            : []
        }
        onCancel={() => setDriverToDelete(null)}
        onConfirm={handleConfirmDeleteDriver}
      />
    </div>
  );
};
