import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Bookmark, 
  RefreshCw, 
  Upload, 
  FileDown, 
  Plus, 
  CheckSquare, 
  Square, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal, 
  List, 
  Grid, 
  Eye, 
  Edit2, 
  Tag, 
  Radio, 
  Truck, 
  AlertCircle, 
  X, 
  Building2, 
  Shield,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { Vehicle, loadVehicleMasterStore, saveVehicleMasterStore } from '../types/vehicle';
import { FilterDrawer } from './FilterDrawer';
import { BulkOperationsDrawer, BulkActionType } from './BulkOperationsDrawer';
import { ImportDrawer } from './ImportDrawer';
import { ExportModal } from './ExportModal';
import { VehicleDrawer } from './VehicleDrawer';
import { ContextualDetailModal } from './ContextualDetailModal';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';
import { RowActionMenu } from './common/RowActionMenu';
import { DeleteConfirmationModal } from './common/DeleteConfirmationModal';

interface VehiclesPageContentProps {
  companyContext?: string;
}

const normalizeVehicle = (v: any, contextCompany?: string): Vehicle => ({
  ...v,
  machine_model: v.machine_model || v.model || 'Tata Signa 5530',
  model: v.model || v.machine_model || 'Tata Signa 5530',
  client: v.client || v.company || contextCompany || 'Adani Logistics',
  chassis_number: v.chassis_number || v.vin || 'MA3FJEB1S00654321',
  vin: v.vin || v.chassis_number || 'MA3FJEB1S00654321',
  transporter: v.transporter || 'Western Logistics',
  year: v.year || 2023,
  fuel_type: v.fuel_type || 'Diesel',
  insurance_to: v.insurance_to || v.documents?.insurance?.due_date || '2027-01-15',
  insurance_from: v.insurance_from || '2024-01-15',
  insurance_company: v.insurance_company || 'ICICI Lombard',
  registration_date: v.registration_date || '2023-04-15',
  engine_number: v.engine_number || 'ENG-TT-99401',
  machine_owner: v.machine_owner || (v.client || v.company || 'Adani Logistics Services'),
  overspeed_limit: v.overspeed_limit ?? 60,
  fuel_theft_limit: v.fuel_theft_limit ?? 0,
  fuel_refill: v.fuel_refill ?? 0,
  fuel_calibration_type: v.fuel_calibration_type || 'Linear',
  fuel_tank_capacity: v.fuel_tank_capacity || 360,
  zone: v.zone || 'West Zone',
  location: v.location || v.client_location || 'Mundra Terminal',
  active_status: v.active_status !== undefined ? v.active_status : (v.status !== 'Inactive'),
});

export const VehiclesPageContent: React.FC<VehiclesPageContentProps> = ({ companyContext }) => {
  // Master Vehicles State
  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    loadVehicleMasterStore().map((item) => normalizeVehicle(item, companyContext))
  );

  useEffect(() => {
    const sync = () => {
      setVehicles(loadVehicleMasterStore().map((item) => normalizeVehicle(item, companyContext)));
    };
    window.addEventListener('fleetrobo:resources-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('fleetrobo:resources-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, [companyContext]);

  const saveVehiclesState = (next: Vehicle[]) => {
    setVehicles(next);
    saveVehicleMasterStore(next);
  };

  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const handleConfirmDeleteVehicle = () => {
    if (!vehicleToDelete) return;
    const idToDelete = vehicleToDelete.id;
    const nextVehicles = vehicles.filter((v) => v.id !== idToDelete);
    saveVehiclesState(nextVehicles);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(idToDelete);
      return next;
    });
    showToast(`Vehicle "${vehicleToDelete.registration_number}" deleted successfully`);
    setVehicleToDelete(null);
  };

  // Directory Internal Status Tabs
  const [activeStatusTab, setActiveStatusTab] = useState<string>('All vehicles');

  // Search, Layout & Sort State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'table' | 'cards'>('table');
  const [sortKey, setSortKey] = useState<keyof Vehicle | ''>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Row Selection State (persists across pages)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({});
  const [filterMode, setFilterMode] = useState<'basic' | 'advanced'>('basic');

  // Saved Views State
  const [showSavedViewsPopover, setShowSavedViewsPopover] = useState<boolean>(false);
  const [savedViews, setSavedViews] = useState<{ id: string; name: string; filters: Record<string, any>; mode: 'basic' | 'advanced'; sortKey: keyof Vehicle | ''; sortDir: 'asc' | 'desc'; layout: 'table' | 'cards' }[]>([
    {
      id: 'sv-1',
      name: 'Default Active Mundra Fleet',
      filters: { fleets: ['Mundra Fleet'] },
      mode: 'basic',
      sortKey: 'registration_number',
      sortDir: 'asc',
      layout: 'table'
    }
  ]);
  const [newViewName, setNewViewName] = useState<string>('');
  const [viewNameError, setViewNameError] = useState<string>('');

  // Primary visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'registration_number',
    'machine_model',
    'chassis_number',
    'year',
    'fuel_type',
    'insurance_to',
    'status'
  ]);

  // Drawers & Modals State
  const [isBulkOpen, setIsBulkOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Vehicle Create / View / Edit Drawer State
  const [vehicleDrawerState, setVehicleDrawerState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'view' | 'edit';
    vehicle: Vehicle | null;
  }>({ isOpen: false, mode: 'create', vehicle: null });

  // Contextual Detail Modal (Maintenance / Settings / Relationships)
  const [contextualModalState, setContextualModalState] = useState<{
    isOpen: boolean;
    vehicle: Vehicle | null;
    targetView: 'maintenance' | 'settings' | 'relationships';
  }>({ isOpen: false, vehicle: null, targetView: 'maintenance' });

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const scopedVehicles = useMemo(() => {
    if (!companyContext || companyContext === 'Platform Admin' || companyContext === 'Binary') return vehicles;
    const target = companyContext.trim().toLowerCase();
    return vehicles.filter((v) => (v.client || v.company || '').trim().toLowerCase() === target);
  }, [vehicles, companyContext]);

  // Status Tab counts calculation
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'All vehicles': scopedVehicles.length,
      'Available': 0,
      'In Use': 0,
      'Maintenance': 0,
      'Out of Service': 0,
      'Inactive': 0
    };
    scopedVehicles.forEach((v) => {
      if (counts[v.status] !== undefined) {
        counts[v.status]++;
      }
    });
    return counts;
  }, [scopedVehicles]);

  // Filtering Logic (Basic AND / Advanced OR)
  const filteredVehicles = useMemo(() => {
    return scopedVehicles.filter((veh) => {
      // 1. Status Quick Tab
      if (activeStatusTab !== 'All vehicles' && veh.status !== activeStatusTab) {
        return false;
      }

      // 2. Global Vehicle Search (Registration No., Machine Model, Chassis No., Client, etc.)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const searchCorpus = [
          veh.registration_number,
          veh.machine_model,
          veh.model,
          veh.chassis_number,
          veh.vin,
          veh.client,
          veh.transporter,
          veh.engine_number,
          veh.year ? String(veh.year) : '',
          veh.fuel_type,
          veh.insurance_to,
          veh.machine_owner,
          veh.name,
          veh.make,
          veh.company,
          veh.internal_id,
          veh.serial_number,
          veh.call_sign,
          veh.driver,
          veh.policy_number,
          veh.zone,
          veh.location
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchCorpus.includes(q)) {
          return false;
        }
      }

      // 3. Sectional Filters (Basic = AND, Advanced = OR)
      const filterKeys = Object.keys(appliedFilters);
      if (filterKeys.length === 0) return true;

      const matchesCondition = (key: string): boolean => {
        const target = appliedFilters[key];
        let val: any = (veh as any)[key];
        if ((key === 'model' || key === 'machine_model') && !val) {
          val = veh.machine_model || veh.model;
        }
        if ((key === 'chassis_number' || key === 'vin') && !val) {
          val = veh.chassis_number || veh.vin;
        }
        if (key === 'client' && !val) {
          val = veh.client || veh.company;
        }

        if (target === undefined || target === '') return true;

        if (typeof target === 'boolean') {
          return Boolean(val) === target;
        }

        if (Array.isArray(target)) {
          if (target.length === 0) return true;
          if (Array.isArray(val)) {
            return target.some((t) => val.includes(t));
          }
          return target.includes(val);
        }

        if (typeof target === 'object' && (target.from || target.to)) {
          const numVal = Number(val);
          if (isNaN(numVal)) return true;
          if (target.from && numVal < Number(target.from)) return false;
          if (target.to && numVal > Number(target.to)) return false;
          return true;
        }

        if (typeof target === 'string') {
          return String(val || '').toLowerCase().includes(target.toLowerCase());
        }

        return true;
      };

      if (filterMode === 'basic') {
        return filterKeys.every((k) => matchesCondition(k));
      } else {
        return filterKeys.some((k) => matchesCondition(k));
      }
    });
  }, [scopedVehicles, activeStatusTab, searchQuery, appliedFilters, filterMode]);

  // Sorting Logic
  const sortedVehicles = useMemo(() => {
    if (!sortKey) return filteredVehicles;
    return [...filteredVehicles].sort((a, b) => {
      const valA = (a as any)[sortKey] ?? '';
      const valB = (b as any)[sortKey] ?? '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredVehicles, sortKey, sortDirection]);

  // Pagination Slice
  const totalRecords = sortedVehicles.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedVehicles.slice(start, start + pageSize);
  }, [sortedVehicles, currentPage, pageSize]);

  // Selection Handlers
  const isAllCurrentPageSelected = paginatedVehicles.length > 0 && paginatedVehicles.every((v) => selectedIds.has(v.id));

  const toggleSelectAllCurrentPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllCurrentPageSelected) {
        paginatedVehicles.forEach((v) => next.delete(v.id));
      } else {
        paginatedVehicles.forEach((v) => next.add(v.id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllMatching = () => {
    setSelectedIds(new Set(filteredVehicles.map((v) => v.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Sort Handler
  const handleSort = (key: keyof Vehicle) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Bulk Operations Commit
  const handleCommitBulkAction = (action: BulkActionType, value: string, eligibleVehicles: Vehicle[]) => {
    const eligibleIdSet = new Set(eligibleVehicles.map((e) => e.id));
    const nextVehicles = vehicles.map((v) => {
      if (!eligibleIdSet.has(v.id)) return v;

      const updated = { ...v, updated_at: new Date().toISOString().split('T')[0] };

      switch (action) {
        case 'status':
          updated.status = value as any;
          break;
        case 'fleet_add':
          updated.fleets = Array.from(new Set([...(v.fleets || []), value]));
          break;
        case 'fleet_remove':
          updated.fleets = (v.fleets || []).filter((f) => f !== value);
          break;
        case 'transporter':
          updated.transporter = value;
          break;
      }
      return updated;
    });

    saveVehiclesState(nextVehicles);
    handleClearSelection();
    showToast(`${eligibleVehicles.length} vehicle records updated successfully!`);
  };

  // Save Vehicle (Create or Edit)
  const handleSaveVehicle = (vehicle: Vehicle) => {
    const exists = vehicles.some((v) => v.id === vehicle.id);
    let next: Vehicle[];
    if (exists) {
      next = vehicles.map((v) => (v.id === vehicle.id ? vehicle : v));
      showToast(`Vehicle ${vehicle.registration_number} updated successfully!`);
    } else {
      next = [vehicle, ...vehicles];
      setSortKey('');
      setCurrentPage(1);
      showToast(`Vehicle ${vehicle.registration_number} created successfully!`);
    }
    saveVehiclesState(next);
  };

  // Import Callback
  const handleImportComplete = (createdCount: number, updatedCount: number, skippedCount: number) => {
    showToast(`Import finished: ${createdCount} created, ${updatedCount} updated · ${skippedCount} skipped`);
    // Reload from state or storage
    const current = localStorage.getItem('fleetrobo_vehicle_master_v3');
    if (current) {
      try {
        setVehicles(JSON.parse(current));
        setSortKey('');
        setCurrentPage(1);
      } catch (e) {
        // ignore
      }
    }
  };

  // Save Current View
  const handleSaveView = () => {
    if (!newViewName.trim()) {
      setViewNameError('Please enter a view name.');
      return;
    }
    if (savedViews.some((v) => v.name.toLowerCase() === newViewName.trim().toLowerCase())) {
      setViewNameError('A view with this name already exists.');
      return;
    }
    setViewNameError('');
    const newView = {
      id: `sv-${Date.now()}`,
      name: newViewName.trim(),
      filters: { ...appliedFilters },
      mode: filterMode,
      sortKey,
      sortDir: sortDirection,
      layout: layoutMode
    };
    setSavedViews([...savedViews, newView]);
    setNewViewName('');
    setShowSavedViewsPopover(false);
    showToast(`View "${newView.name}" saved!`);
  };

  const handleApplySavedView = (view: typeof savedViews[0]) => {
    setAppliedFilters({ ...view.filters });
    setFilterMode(view.mode);
    setSortKey(view.sortKey);
    setSortDirection(view.sortDir);
    setLayoutMode(view.layout);
    setShowSavedViewsPopover(false);
    showToast(`Applied view: ${view.name}`);
  };

  const handleDeleteSavedView = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedViews(savedViews.filter((v) => v.id !== id));
  };

  // Reset demo vehicles
  const handleResetDemo = () => {
    if (confirm('Restore demo vehicles? Any unsaved local edits will be replaced.')) {
      localStorage.removeItem('fleetrobo_vehicle_master_v3');
      saveVehiclesState(loadVehicleMasterStore());
      handleClearSelection();
      showToast('Demo vehicles restored!');
    }
  };

  // Status tag helper
  const renderStatusTag = (status: Vehicle['status']) => {
    const styleMap: Record<string, string> = {
      'Available': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'In Use': 'bg-sky-50 text-sky-700 border-sky-200',
      'Maintenance': 'bg-amber-50 text-amber-700 border-amber-200',
      'Out of Service': 'bg-slate-100 text-slate-700 border-slate-300',
      'Reserved': 'bg-purple-50 text-purple-700 border-purple-200',
      'Inactive': 'bg-slate-100 text-slate-500 border-slate-200',
      'Accident / Damage': 'bg-red-50 text-red-700 border-red-200',
      'Compliance Hold': 'bg-rose-50 text-rose-700 border-rose-200',
      'Stolen': 'bg-red-100 text-red-900 border-red-300'
    };

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styleMap[status] || 'bg-slate-100 text-slate-700'}`}>
        {status}
      </span>
    );
  };

  // Column catalogue for customization with category groups matching design reference
  const ALL_COLUMNS = [
    // PRIMARY COLUMNS (VISIBLE BY DEFAULT)
    { key: 'registration_number', label: 'Registration No.', category: 'PRIMARY COLUMNS', required: true },
    { key: 'machine_model', label: 'Machine Model', category: 'PRIMARY COLUMNS' },
    { key: 'chassis_number', label: 'Chassis No.', category: 'PRIMARY COLUMNS' },
    { key: 'year', label: 'Year of Make', category: 'PRIMARY COLUMNS' },
    { key: 'fuel_type', label: 'Fuel Type', category: 'PRIMARY COLUMNS' },
    { key: 'insurance_to', label: 'Insurance Valid Till', category: 'PRIMARY COLUMNS' },
    { key: 'status', label: 'Status', category: 'PRIMARY COLUMNS' },

    // SPECIFICATIONS & IDENTITY
    { key: 'transporter', label: 'Transporter', category: 'SPECIFICATIONS' },
    { key: 'client', label: 'Client Name', category: 'SPECIFICATIONS' },
    { key: 'vehicle_segment', label: 'Vehicle Segment', category: 'SPECIFICATIONS' },
    { key: 'engine_number', label: 'Engine No.', category: 'SPECIFICATIONS' },
    { key: 'registration_date', label: 'Registration Date', category: 'SPECIFICATIONS' },
    { key: 'machine_owner', label: 'Machine Owner', category: 'SPECIFICATIONS' },
    { key: 'name', label: 'Vehicle Name', category: 'SPECIFICATIONS' },
    { key: 'make', label: 'Make', category: 'SPECIFICATIONS' },
    { key: 'class', label: 'Asset Type / Class', category: 'SPECIFICATIONS' },
    { key: 'internal_id', label: 'Internal ID', category: 'SPECIFICATIONS' },
    { key: 'vin', label: 'VIN', category: 'SPECIFICATIONS' },

    // OPERATIONAL SETTINGS
    { key: 'zone', label: 'Zone', category: 'OPERATIONAL SETTINGS' },
    { key: 'location', label: 'Location', category: 'OPERATIONAL SETTINGS' },
    { key: 'mobile_number', label: 'Vehicle Mobile No.', category: 'OPERATIONAL SETTINGS' },
    { key: 'fuel_tank_capacity', label: 'Fuel Tank Capacity', category: 'OPERATIONAL SETTINGS' },
    { key: 'fuel_calibration_type', label: 'Fuel Calibration', category: 'OPERATIONAL SETTINGS' },
    { key: 'overspeed_limit', label: 'Overspeed Limit', category: 'OPERATIONAL SETTINGS' },
    { key: 'odometer', label: 'Odometer', category: 'OPERATIONAL SETTINGS' },
    { key: 'online', label: 'Telematics Online', category: 'OPERATIONAL SETTINGS' },
    { key: 'fleets', label: 'Fleet', category: 'OPERATIONAL SETTINGS' },
    { key: 'skills', label: 'Vehicle Skills', category: 'OPERATIONAL SETTINGS' },

    // INSURANCE & COMPLIANCE
    { key: 'purchase_date', label: 'Purchase Date', category: 'COMPLIANCE & DOCUMENTS' },
    { key: 'warranty_to', label: 'Warranty To', category: 'COMPLIANCE & DOCUMENTS' },
    { key: 'insurance_company', label: 'Insurance Company', category: 'COMPLIANCE & DOCUMENTS' },
    { key: 'insurance_from', label: 'Insurance Valid From', category: 'COMPLIANCE & DOCUMENTS' },
    { key: 'policy_number', label: 'Policy No.', category: 'COMPLIANCE & DOCUMENTS' },
    { key: 'aadhar_number', label: 'Aadhar Number', category: 'COMPLIANCE & DOCUMENTS' },
    { key: 'company', label: 'Company', category: 'COMPLIANCE & DOCUMENTS' }
  ];

  // State for pinned columns (pinned to the left)
  const [pinnedColumns, setPinnedColumns] = useState<string[]>(['registration_number']);

  const VEHICLE_DEFAULT_COLUMNS = [
    'registration_number',
    'machine_model',
    'chassis_number',
    'year',
    'fuel_type',
    'insurance_to',
    'status',
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#F8FAFC] text-slate-800 font-sans text-xs relative">
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed bottom-5 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold bg-emerald-600 text-white animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Main Page Header (Matches Drivers & Fleets Directory Header) */}
      <div className="px-6 pt-5 pb-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vehicles</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage vehicle registrations, chassis identity, operational limits, insurance compliance, and transporter assignments.
            </p>
          </div>

          {/* Quick Header CTA Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Restore sample vehicles"
            >
              <RefreshCw size={13} className="text-slate-500" />
              <span>Sample vehicles</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Import Vehicles from CSV"
            >
              <Upload size={14} className="text-slate-500" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Export Vehicles"
            >
              <FileDown size={14} className="text-slate-500" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => setVehicleDrawerState({ isOpen: true, mode: 'create', vehicle: null })}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Create vehicle</span>
            </button>
          </div>
        </div>

        {/* Status Tabs Bar */}
        <div className="flex items-center justify-between mt-4 border-b border-slate-200 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-6">
            {['All vehicles', 'Available', 'In Use', 'Maintenance', 'Out of Service', 'Inactive'].map((tab) => {
              const count = statusCounts[tab] || 0;
              const isActive = activeStatusTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveStatusTab(tab);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 pb-2.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap relative ${
                    isActive ? 'text-[#FA8A63]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-orange-100 text-[#FA8A63]' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
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

      {/* 2. Directory Inner Toolbar (Matches Drivers) */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
        {/* Left Toolbar Group: Search, Filters & Saved Views */}
        <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Vehicles (plate, model, chassis, client, transporter)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#FA8A63] rounded-lg text-xs placeholder:text-slate-400 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              Object.keys(appliedFilters).length > 0
                ? 'bg-orange-50 border-orange-200 text-[#FA8A63]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter size={13} />
            <span>Filters</span>
            {Object.keys(appliedFilters).length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#FA8A63] text-white text-[10px] font-bold flex items-center justify-center">
                {Object.keys(appliedFilters).length}
              </span>
            )}
          </button>

          {Object.keys(appliedFilters).length > 0 && (
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
              onClick={() => setShowSavedViewsPopover(!showSavedViewsPopover)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Bookmark size={13} className="text-slate-400" />
              <span>Views</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {showSavedViewsPopover && (
              <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 z-30 animate-in fade-in zoom-in-95 duration-100 space-y-2">
                <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saved Views</span>
                  <span className="text-[10px] text-slate-400">{savedViews.length} views</span>
                </div>

                <div className="space-y-0.5 max-h-48 overflow-y-auto text-xs">
                  {savedViews.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-2">No saved views yet</p>
                  ) : (
                    savedViews.map((sv) => (
                      <div
                        key={sv.id}
                        onClick={() => handleApplySavedView(sv)}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer group"
                      >
                        <span className="font-medium text-slate-700 truncate">{sv.name}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedView(sv.id, e)}
                          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 block">Save current view as:</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Inbound Fleet"
                      value={newViewName}
                      onChange={(e) => setNewViewName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#FA8A63]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveView}
                      className="px-2.5 py-1 bg-[#FA8A63] text-white rounded text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                  {viewNameError && <p className="text-[10px] text-red-500 font-medium">{viewNameError}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Toolbar Group: Bulk Actions, Customize Columns, View Switcher, Refresh */}
        <div className="flex items-center gap-2">
          {/* Bulk Operations CTA */}
          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={() => setIsBulkOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedIds.size > 0
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title={
              selectedIds.size === 0
                ? 'Select one or more vehicles to perform bulk actions'
                : `Apply bulk operations to ${selectedIds.size} vehicles`
            }
          >
            <SlidersHorizontal size={13} />
            <span>Bulk actions</span>
            {selectedIds.size > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-purple-700 text-[10px] font-bold flex items-center justify-center">
                {selectedIds.size}
              </span>
            )}
          </button>

          {/* Column Catalogue Popover */}
          <ColumnCataloguePopover
            columns={ALL_COLUMNS}
            visibleKeys={visibleColumns}
            onChangeVisibleKeys={setVisibleColumns}
            defaultKeys={VEHICLE_DEFAULT_COLUMNS}
            pinnedKeys={pinnedColumns}
            onChangePinnedKeys={setPinnedColumns}
            defaultPinnedKeys={['registration_number']}
            onToast={showToast}
          />

          {/* Table / Grid Segmented Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setLayoutMode('table')}
              className={`p-1 rounded cursor-pointer transition-colors ${
                layoutMode === 'table' ? 'bg-white shadow-2xs text-[#FA8A63]' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table view"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('cards')}
              className={`p-1 rounded cursor-pointer transition-colors ${
                layoutMode === 'cards' ? 'bg-white shadow-2xs text-[#FA8A63]' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Card grid view"
            >
              <Grid size={14} />
            </button>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => {
              showToast('Directory refreshed.');
            }}
            title="Refresh vehicle records"
            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 3. Applied Filter Chips Bar */}
      {Object.keys(appliedFilters).length > 0 && (
        <div className="px-6 py-2 bg-orange-50/40 border-b border-orange-100 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
              Applied Filters ({filterMode === 'basic' ? 'AND' : 'OR'}):
            </span>
            {Object.entries(appliedFilters).map(([k, val]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-orange-200 text-[#FA8A63] font-semibold text-[11px] shadow-2xs"
              >
                <span>
                  {k}: {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...appliedFilters };
                    delete next[k];
                    setAppliedFilters(next);
                  }}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAppliedFilters({})}
            className="text-[11px] font-semibold text-[#FA8A63] hover:underline shrink-0 cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* 4. Selected Records Action Bar (Matches Drivers) */}
      {selectedIds.size > 0 && (
        <div className="px-6 py-2 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xs text-orange-950 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#FA8A63] text-white flex items-center justify-center text-[11px]">
                {selectedIds.size}
              </span>
              <span>vehicle{selectedIds.size > 1 ? 's' : ''} selected</span>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-[11px] text-slate-600">
              Selection persists across pages
            </span>
            {selectedIds.size < filteredVehicles.length && (
              <button
                type="button"
                onClick={handleSelectAllMatching}
                className="text-xs text-[#FA8A63] font-bold hover:underline cursor-pointer"
              >
                Select all {filteredVehicles.length} matching vehicles
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#FA8A63] hover:bg-[#e77a54] text-white font-semibold rounded-lg shadow-2xs text-xs cursor-pointer"
            >
              <SlidersHorizontal size={13} />
              <span>Bulk operations</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg shadow-2xs text-xs cursor-pointer"
            >
              <FileDown size={13} />
              <span>Export selected</span>
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-800 font-semibold text-xs cursor-pointer"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* 5. Directory Content Area (Table or Cards) */}
      <div className={`flex-1 overflow-auto min-h-0 ${layoutMode === 'table' ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
        {/* State: Empty Directory */}
        {vehicles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FA8A63] flex items-center justify-center shadow-xs">
              <Truck size={30} />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold text-slate-900">Add your first vehicle</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your vehicle directory is currently empty. Create a canonical record, import your fleet CSV, or restore sample demo vehicles.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setVehicleDrawerState({ isOpen: true, mode: 'create', vehicle: null })}
                className="px-4 py-2 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-bold rounded-lg shadow-sm"
              >
                + New vehicle
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Import CSV
              </button>
              <button
                onClick={handleResetDemo}
                className="px-4 py-2 text-[#FA8A63] hover:underline text-xs font-semibold"
              >
                Use sample vehicles
              </button>
            </div>
          </div>
        ) : filteredVehicles.length === 0 ? (
          /* State: No Search / Filter Matches */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <Search size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">No matching vehicles</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                No vehicles matched your current filters, tab or search criteria.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setAppliedFilters({});
                setActiveStatusTab('All vehicles');
              }}
              className="px-3.5 py-1.5 bg-[#FA8A63] text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-[#e77a54]"
            >
              Clear search & filters
            </button>
          </div>
        ) : layoutMode === 'table' ? (
          /* TABLE VIEW (Sticky Header, Fixed Checkbox & Fixed Actions) */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse select-text">
              <thead className="bg-[#F8FAFC] sticky top-0 z-10 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                <tr>
                  {/* Fixed Selection Column */}
                  <th className="sticky left-0 z-20 bg-[#F8FAFC] px-3 py-3 border-r border-slate-100 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAllCurrentPage}
                      className="text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      {isAllCurrentPageSelected ? (
                        <CheckSquare size={15} className="text-[#FA8A63]" />
                      ) : (
                        <Square size={15} />
                      )}
                    </button>
                  </th>

                  {/* Render visible columns in strict primary order (1-9) then optional */}
                  {visibleColumns.includes('registration_number') && (
                    <th
                      onClick={() => handleSort('registration_number')}
                      className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Registration No.</span>
                        {sortKey === 'registration_number' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('machine_model') && (
                    <th
                      onClick={() => handleSort('machine_model')}
                      className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Machine Model</span>
                        {sortKey === 'machine_model' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('client') && (
                    <th
                      onClick={() => handleSort('client')}
                      className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Client Name</span>
                        {sortKey === 'client' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('chassis_number') && (
                    <th
                      onClick={() => handleSort('chassis_number')}
                      className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Chassis No.</span>
                        {sortKey === 'chassis_number' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('transporter') && (
                    <th
                      onClick={() => handleSort('transporter')}
                      className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Transporter</span>
                        {sortKey === 'transporter' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('year') && (
                    <th
                      onClick={() => handleSort('year')}
                      className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Year of Make</span>
                        {sortKey === 'year' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('fuel_type') && (
                    <th
                      onClick={() => handleSort('fuel_type')}
                      className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Fuel Type</span>
                        {sortKey === 'fuel_type' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('insurance_to') && (
                    <th
                      onClick={() => handleSort('insurance_to')}
                      className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Insurance Valid Till</span>
                        {sortKey === 'insurance_to' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('status') && (
                    <th
                      onClick={() => handleSort('status')}
                      className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Status</span>
                        {sortKey === 'status' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {/* Optional columns toggled via Customize Columns */}
                  {visibleColumns.includes('engine_number') && (
                    <th onClick={() => handleSort('engine_number')} className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1">
                        <span>Engine No.</span>
                        {sortKey === 'engine_number' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('registration_date') && (
                    <th onClick={() => handleSort('registration_date')} className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1">
                        <span>Registration Date</span>
                        {sortKey === 'registration_date' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('machine_owner') && (
                    <th onClick={() => handleSort('machine_owner')} className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1">
                        <span>Machine Owner</span>
                        {sortKey === 'machine_owner' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('vehicle_segment') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Vehicle Segment
                    </th>
                  )}

                  {visibleColumns.includes('zone') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Zone
                    </th>
                  )}

                  {visibleColumns.includes('location') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Location
                    </th>
                  )}

                  {visibleColumns.includes('mobile_number') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Vehicle Mobile No.
                    </th>
                  )}

                  {visibleColumns.includes('fuel_tank_capacity') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Fuel Tank Capacity
                    </th>
                  )}

                  {visibleColumns.includes('fuel_calibration_type') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Fuel Calibration
                    </th>
                  )}

                  {visibleColumns.includes('overspeed_limit') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Overspeed Limit
                    </th>
                  )}

                  {visibleColumns.includes('purchase_date') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Purchase Date
                    </th>
                  )}

                  {visibleColumns.includes('warranty_to') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Warranty To
                    </th>
                  )}

                  {visibleColumns.includes('insurance_company') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Insurance Company
                    </th>
                  )}

                  {visibleColumns.includes('insurance_from') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Insurance Valid From
                    </th>
                  )}

                  {visibleColumns.includes('policy_number') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Policy No.
                    </th>
                  )}

                  {visibleColumns.includes('aadhar_number') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Aadhar Number
                    </th>
                  )}

                  {visibleColumns.includes('name') && (
                    <th onClick={() => handleSort('name')} className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1">
                        <span>Vehicle Name</span>
                        {sortKey === 'name' && (sortDirection === 'asc' ? <ChevronUp size={12} className="text-[#FA8A63]" /> : <ChevronDown size={12} className="text-[#FA8A63]" />)}
                      </div>
                    </th>
                  )}

                  {visibleColumns.includes('make') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Make
                    </th>
                  )}

                  {visibleColumns.includes('class') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Asset Type / Class
                    </th>
                  )}

                  {visibleColumns.includes('internal_id') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Internal ID
                    </th>
                  )}

                  {visibleColumns.includes('vin') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      VIN
                    </th>
                  )}

                  {visibleColumns.includes('odometer') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Odometer
                    </th>
                  )}

                  {visibleColumns.includes('online') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Telematics Online
                    </th>
                  )}

                  {visibleColumns.includes('fleets') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Fleet
                    </th>
                  )}

                  {visibleColumns.includes('skills') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Vehicle Skills
                    </th>
                  )}

                  {visibleColumns.includes('company') && (
                    <th className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                      Company
                    </th>
                  )}

                  {/* Fixed Right Actions Column */}
                  <th className="sticky right-0 z-20 bg-[#F8FAFC] px-4 py-3 border-l border-slate-100 text-right font-bold text-slate-700 w-16">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedVehicles.map((vehicle) => {
                  const isSelected = selectedIds.has(vehicle.id);

                  return (
                    <tr
                      key={vehicle.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      {/* Fixed Selection Cell */}
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-3 border-r border-slate-100 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectRow(vehicle.id)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare size={15} className="text-[#FA8A63]" />
                          ) : (
                            <Square size={15} />
                          )}
                        </button>
                      </td>

                      {/* 1. Registration No. Cell (Click opens View) */}
                      {visibleColumns.includes('registration_number') && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setVehicleDrawerState({ isOpen: true, mode: 'view', vehicle })}
                            className="font-bold text-[#FA8A63] hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                          >
                            <Truck size={14} className="text-slate-400 shrink-0" />
                            <span>{vehicle.registration_number}</span>
                          </button>
                          {vehicle.class && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {vehicle.class}
                            </div>
                          )}
                        </td>
                      )}

                      {/* 2. Machine Model */}
                      {visibleColumns.includes('machine_model') && (
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                          {vehicle.machine_model || vehicle.model || '—'}
                        </td>
                      )}

                      {/* 3. Client Name */}
                      {visibleColumns.includes('client') && (
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={13} className="text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-800">{vehicle.client || vehicle.company || '—'}</span>
                          </div>
                        </td>
                      )}

                      {/* 4. Chassis No. */}
                      {visibleColumns.includes('chassis_number') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.chassis_number || vehicle.vin || '—'}
                        </td>
                      )}

                      {/* 5. Transporter */}
                      {visibleColumns.includes('transporter') && (
                        <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                          {vehicle.transporter || 'Western Logistics'}
                        </td>
                      )}

                      {/* 6. Year of Make */}
                      {visibleColumns.includes('year') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.year || '—'}
                        </td>
                      )}

                      {/* 7. Fuel Type */}
                      {visibleColumns.includes('fuel_type') && (
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              vehicle.fuel_type === 'Electric' ? 'bg-emerald-500' :
                              vehicle.fuel_type === 'CNG' ? 'bg-blue-500' :
                              vehicle.fuel_type === 'Petrol' ? 'bg-orange-400' : 'bg-amber-500'
                            }`} />
                            <span>{vehicle.fuel_type || 'Diesel'}</span>
                          </span>
                        </td>
                      )}

                      {/* 8. Insurance Valid Till */}
                      {visibleColumns.includes('insurance_to') && (
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Shield size={12} className="text-slate-400 shrink-0" />
                            <span className="font-mono text-[11px]">{vehicle.insurance_to || vehicle.documents?.insurance?.due_date || '—'}</span>
                          </div>
                        </td>
                      )}

                      {/* 9. Status */}
                      {visibleColumns.includes('status') && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderStatusTag(vehicle.status)}
                        </td>
                      )}

                      {/* Optional columns */}
                      {visibleColumns.includes('engine_number') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.engine_number || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('registration_date') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.registration_date || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('machine_owner') && (
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {vehicle.machine_owner || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('vehicle_segment') && (
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {vehicle.vehicle_segment || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('zone') && (
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {vehicle.zone || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('location') && (
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {vehicle.location || vehicle.client_location || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('mobile_number') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.mobile_number || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('fuel_tank_capacity') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.fuel_tank_capacity ? `${vehicle.fuel_tank_capacity} L` : '—'}
                        </td>
                      )}

                      {visibleColumns.includes('fuel_calibration_type') && (
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {vehicle.fuel_calibration_type || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('overspeed_limit') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.overspeed_limit ? `${vehicle.overspeed_limit} km/h` : '—'}
                        </td>
                      )}

                      {visibleColumns.includes('purchase_date') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.purchase_date || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('warranty_to') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.warranty_to || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('insurance_company') && (
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {vehicle.insurance_company || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('insurance_from') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.insurance_from || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('policy_number') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.policy_number || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('aadhar_number') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.aadhar_number || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('name') && (
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                          {vehicle.name || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('make') && (
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {vehicle.make || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('class') && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                            {vehicle.class || 'HMV'}
                          </span>
                        </td>
                      )}

                      {visibleColumns.includes('internal_id') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.internal_id || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('vin') && (
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.vin || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('odometer') && (
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {vehicle.odometer ? `${vehicle.odometer.toLocaleString()} km` : '—'}
                        </td>
                      )}

                      {visibleColumns.includes('online') && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              vehicle.online
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                vehicle.online ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {vehicle.online ? 'Online' : 'Offline'}
                          </span>
                        </td>
                      )}

                      {visibleColumns.includes('fleets') && (
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {vehicle.fleets?.join(', ') || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('skills') && (
                        <td className="px-4 py-3">
                          {(vehicle.skills || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(vehicle.skills || []).map((skill) => (
                                <span
                                  key={skill}
                                  className="px-2 py-0.5 rounded bg-[#FFF3EE] text-[#B85324] border border-[#FA8A63]/40 text-[10px] font-semibold whitespace-nowrap"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}

                      {visibleColumns.includes('company') && (
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {vehicle.company || '—'}
                        </td>
                      )}

                      {/* Fixed Right Actions Cell */}
                      <td className="sticky right-0 z-10 bg-white/95 group-hover:bg-slate-50/95 px-3 py-3 border-l border-slate-100 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end">
                          <RowActionMenu
                            ariaLabel={`Actions for ${vehicle.registration_number}`}
                            items={[
                              {
                                id: 'view',
                                label: 'View details',
                                icon: <Eye size={13} className="text-slate-400" />,
                                onClick: () => setVehicleDrawerState({ isOpen: true, mode: 'view', vehicle }),
                              },
                              {
                                id: 'edit',
                                label: 'Edit vehicle',
                                icon: <Edit2 size={13} className="text-slate-400" />,
                                onClick: () => setVehicleDrawerState({ isOpen: true, mode: 'edit', vehicle }),
                              },
                              {
                                id: 'relationships',
                                label: 'Relationships',
                                icon: <Truck size={13} className="text-slate-400" />,
                                onClick: () =>
                                  setContextualModalState({
                                    isOpen: true,
                                    vehicle,
                                    targetView: 'relationships',
                                  }),
                              },
                              {
                                id: 'routes',
                                label: 'Routes & Allocations',
                                icon: <Radio size={13} className="text-slate-400" />,
                                onClick: () => setVehicleDrawerState({ isOpen: true, mode: 'edit', vehicle }),
                              },
                              {
                                id: 'status',
                                label: 'Change status',
                                icon: <Tag size={13} className="text-[#FA8A63]" />,
                                tone: 'accent',
                                onClick: () => {
                                  setSelectedIds(new Set([vehicle.id]));
                                  setIsBulkOpen(true);
                                },
                              },
                              {
                                id: 'delete',
                                label: 'Delete vehicle',
                                icon: <Trash2 size={13} />,
                                tone: 'danger',
                                dividerBefore: true,
                                onClick: () => setVehicleToDelete(vehicle),
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
        ) : (
          /* CARD VIEW */
          <div className="p-6 grid grid-cols-3 gap-4">
            {paginatedVehicles.map((vehicle) => {
              const isSelected = selectedIds.has(vehicle.id);
              return (
                <div
                  key={vehicle.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs space-y-3 transition-all ${
                    isSelected ? 'border-[#FA8A63] bg-orange-50/10' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectRow(vehicle.id)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        {isSelected ? <CheckSquare size={15} className="text-[#FA8A63]" /> : <Square size={15} />}
                      </button>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{vehicle.registration_number}</div>
                        <div className="text-[11px] text-slate-500">{vehicle.machine_model || vehicle.model || vehicle.name}</div>
                      </div>
                    </div>
                    {renderStatusTag(vehicle.status)}
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>Chassis No.: <span className="text-slate-800 font-mono text-[11px]">{vehicle.chassis_number || vehicle.vin || '—'}</span></div>
                    <div>Fuel Type: <span className="text-slate-800">{vehicle.fuel_type || 'Diesel'}</span></div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${
                        vehicle.online ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${vehicle.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {vehicle.online ? 'Online' : 'Offline'}
                    </span>

                    <button
                      type="button"
                      onClick={() => setVehicleDrawerState({ isOpen: true, mode: 'view', vehicle })}
                      className="px-3 py-1 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-md shadow-2xs"
                    >
                      View vehicle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Directory Footer with Pagination & Records Counter (Matches Drivers) */}
      <div className="px-6 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
        <div className="flex items-center gap-4">
          <span>
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, totalRecords)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{totalRecords}</span> vehicles
            {totalRecords !== scopedVehicles.length && ` (filtered from ${scopedVehicles.length} total)`}
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
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* --- DRAWERS & MODALS (ONLY OVERLAY INSIDE 1440x900 VEHICLES MODULE) --- */}

      {/* 675px Sectional Filters Drawer */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        appliedFilters={appliedFilters}
        filterMode={filterMode}
        onApplyFilters={(f, m) => {
          setAppliedFilters(f);
          setFilterMode(m);
          setCurrentPage(1);
        }}
        totalMatchedCount={filteredVehicles.length}
      />

      {/* 675px Bulk Operations Drawer (All 7 operations) */}
      <BulkOperationsDrawer
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        selectedVehicles={vehicles.filter((v) => selectedIds.has(v.id))}
        onCommitBulkAction={handleCommitBulkAction}
        onExportSelected={() => {
          setIsBulkOpen(false);
          setIsExportOpen(true);
        }}
      />

      {/* 790px CSV Import Wizard Drawer */}
      <ImportDrawer
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        existingVehicles={vehicles}
        onImportComplete={handleImportComplete}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        filteredVehicles={filteredVehicles}
        selectedVehicles={vehicles.filter((v) => selectedIds.has(v.id))}
      />

      {/* 940px Create / View / Edit Vehicle Drawer */}
      <VehicleDrawer
        isOpen={vehicleDrawerState.isOpen}
        onClose={() => setVehicleDrawerState({ isOpen: false, mode: 'create', vehicle: null })}
        mode={vehicleDrawerState.mode}
        initialVehicle={vehicleDrawerState.vehicle}
        onSaveVehicle={handleSaveVehicle}
        onSwitchToEdit={() => setVehicleDrawerState((prev) => ({ ...prev, mode: 'edit' }))}
        existingVehicles={vehicles}
        companyContext={companyContext}
      />

      {/* Contextual Detail Modal (Maintenance / Settings / Relationships) */}
      <ContextualDetailModal
        isOpen={contextualModalState.isOpen}
        onClose={() => setContextualModalState({ isOpen: false, vehicle: null, targetView: 'maintenance' })}
        vehicle={contextualModalState.vehicle}
        targetView={contextualModalState.targetView}
      />

      {/* Delete Vehicle Confirmation Modal with Confirmation Chips */}
      <DeleteConfirmationModal
        isOpen={Boolean(vehicleToDelete)}
        title="Delete Vehicle?"
        description={
          vehicleToDelete ? (
            <>
              Are you sure you want to delete vehicle{' '}
              <strong className="text-slate-900 font-semibold">
                {vehicleToDelete.registration_number}
              </strong>{' '}
              ({vehicleToDelete.make} {vehicleToDelete.model})? Master vehicle records and
              telemetry mappings will be unlinked.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Delete Vehicle"
        targetChips={
          vehicleToDelete
            ? [
                {
                  id: 'reg',
                  label: vehicleToDelete.registration_number,
                  tone: 'orange',
                },
                {
                  id: 'make-model',
                  label: `${vehicleToDelete.make} · ${vehicleToDelete.machine_model || vehicleToDelete.model}`,
                  tone: 'blue',
                },
                ...(vehicleToDelete.client || vehicleToDelete.company
                  ? [
                      {
                        id: 'org',
                        label: vehicleToDelete.client || vehicleToDelete.company || '',
                        tone: 'purple' as const,
                      },
                    ]
                  : []),
                {
                  id: 'status',
                  label: vehicleToDelete.status,
                  tone:
                    vehicleToDelete.status === 'Available' ||
                    vehicleToDelete.status === 'In Use'
                      ? 'emerald'
                      : 'slate',
                },
              ]
            : []
        }
        confirmationChips={
          vehicleToDelete
            ? [
                {
                  id: 'telemetry',
                  label: 'Telemetry Mappings Unlinked',
                  tone: 'amber',
                },
                {
                  id: 'scope',
                  label: 'Permanent Master Record Delete',
                  tone: 'rose',
                },
              ]
            : []
        }
        onCancel={() => setVehicleToDelete(null)}
        onConfirm={handleConfirmDeleteVehicle}
      />
    </div>
  );
};
