import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Rows,
  Bookmark,
  RefreshCw,
  Layers,
  Upload,
  Download,
  Plus,
  Eye,
  Edit2,
  History,
  StopCircle,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Truck,
  Phone,
  Clock,
  Infinity as InfinityIcon,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  User,
  MoreVertical,
  ArrowRight,
  Link2,
  Building2,
  Store,
  MapPin,
  Wrench
} from 'lucide-react';
import {
  DirectBulkUploadView,
  formatUploadFileSize,
  useDirectUploadState
} from './common/DirectBulkUploadView';
import {
  ModalMasterStore,
  ConnectionRecord,
  HardwareBinding,
  ResourceAllocation,
  ResourceAllocationStatus,
  ResourceType,
  HardwareBindingMode,
  SavedModalView,
  ALL_RESOURCE_VIEW_COLUMNS,
  RESOURCE_VIEW_DEFAULT_COLUMNS,
  RESOURCE_VIEW_SELECT_TOOLTIP,
  RESOURCE_VIEW_ACTIONS_TOOLTIP,
  RESOURCE_TYPES,
  MODAL_OWNERS,
  SUPPORTED_TIMEZONES,
  COMPANY_NAME_TO_ID,
  MODAL_FIELD_TOOLTIPS,
  computeResourceAllocationStatus,
  computeResourceRelationshipStatus,
  getScopedHardwareAndBindings,
  dateTimeIntervalsOverlap,
  formatDateTimeWithTz,
  formatLocalInputParts,
  buildIsoWithTimezone,
  compareConnectionIds,
  downloadModalCsv,
  parseCsvLine,
  getNextResourceAllocationId
} from '../types/modalMaster';
import {
  Vehicle,
  loadVehicleMasterStore,
  saveVehicleMasterStore
} from '../types/vehicle';
import {
  Driver,
  loadDriverMasterStore,
  saveDriverMasterStore
} from '../types/driver';
import {
  ExpandableHardwareRows,
  HardwareCountChips
} from './modal-mapping/ExpandableHardwareRows';
import {
  ConnectionDetailsDrawer,
  DetailsDrawerTab
} from './modal-mapping/ConnectionDetailsDrawer';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';
import { VehicleDrawer } from './VehicleDrawer';
import { DriverDrawer } from './DriverDrawer';
import { RowActionMenu } from './common/RowActionMenu';

interface ResourceConnectionTabProps {
  store: ModalMasterStore;
  setStore: React.Dispatch<React.SetStateAction<ModalMasterStore>>;
  savedViews: SavedModalView[];
  setSavedViews: React.Dispatch<React.SetStateAction<SavedModalView[]>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  activeCompanyScope: string;
  canEdit: boolean;
  actorName: string;
}

const HeaderInfoTooltip: React.FC<{ text: string; align?: 'left' | 'right' | 'center' }> = ({
  text,
  align = 'center'
}) => (
  <span className="relative group inline-flex items-center ml-1 align-middle" onClick={(e) => e.stopPropagation()}>
    <button
      type="button"
      tabIndex={0}
      aria-label={text}
      className="w-[15px] h-[15px] rounded-full border border-[#d6dfe8] bg-white text-[#5c6b7a] hover:text-[#17212b] hover:border-[#94a3b8] inline-flex items-center justify-center text-[10px] font-semibold cursor-help focus:outline-none"
    >
      i
    </button>
    <span
      role="tooltip"
      className={`pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute top-full mt-1.5 w-60 p-2 rounded-lg bg-[#17212b] text-white text-[11px] font-normal normal-case tracking-normal leading-relaxed shadow-xl z-[90] border border-slate-700 ${
        align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2'
      }`}
    >
      {text}
    </span>
  </span>
);

const FieldLabel: React.FC<{ label: string; required?: boolean; tooltip: string }> = ({
  label,
  required,
  tooltip
}) => (
  <div className="flex items-center justify-between gap-1.5 mb-1">
    <label className="text-[12px] font-semibold text-[#17212b]">
      {label} {required && <span className="text-[#dc2626]">*</span>}
    </label>
    <HeaderInfoTooltip text={tooltip} align="right" />
  </div>
);

export const ResourceConnectionTab: React.FC<ResourceConnectionTabProps> = ({
  store,
  setStore,
  savedViews,
  setSavedViews,
  showToast,
  activeCompanyScope,
  canEdit,
  actorName
}) => {
  // Live sync with Vehicle & Driver Masters
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadVehicleMasterStore());
  const [drivers, setDrivers] = useState<Driver[]>(() => loadDriverMasterStore());

  useEffect(() => {
    const syncRes = () => {
      setVehicles(loadVehicleMasterStore());
      setDrivers(loadDriverMasterStore());
    };
    window.addEventListener('fleetrobo:resources-updated', syncRes);
    window.addEventListener('storage', syncRes);
    return () => {
      window.removeEventListener('fleetrobo:resources-updated', syncRes);
      window.removeEventListener('storage', syncRes);
    };
  }, []);

  // Independent Tab 2 state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResourceType, setFilterResourceType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterMode, setFilterMode] = useState<string>('All');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hiddenCols, setHiddenCols] = useState<string[]>(() =>
    ALL_RESOURCE_VIEW_COLUMNS.filter((c) => c.optional).map((c) => c.key)
  );
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [activeDrawer, setActiveDrawer] = useState<
    null | 'filters' | 'saved-views' | 'bulk' | 'import' | 'export' | 'form' | 'view' | 'end-modal'
  >(null);

  const [newViewName, setNewViewName] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(['RCA-2041']));
  const [connDetailsState, setConnDetailsState] = useState<{
    conn: ConnectionRecord;
    tab: DetailsDrawerTab;
  } | null>(null);

  // Inspector / History state
  const [inspectedAlloc, setInspectedAlloc] = useState<ResourceAllocation | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'details' | 'history' | 'relationships'>('details');

  // End Allocation Modal state
  const [endingAlloc, setEndingAlloc] = useState<ResourceAllocation | null>(null);
  const [endDateInput, setEndDateInput] = useState('2026-11-13');
  const [endTimeInput, setEndTimeInput] = useState('18:00:00');
  const [endReasonInput, setEndReasonInput] = useState('Operational reassignment completed');

  // Create / Edit Allocation Form State
  const [editingAlloc, setEditingAlloc] = useState<ResourceAllocation | null>(null);
  const [formClient, setFormClient] = useState<string>(
    activeCompanyScope === 'All Clients' ? MODAL_OWNERS[0] : activeCompanyScope
  );
  const [formConnectionId, setFormConnectionId] = useState('');
  const [formResourceType, setFormResourceType] = useState<ResourceType>('Vehicle');
  const [formResourceLookup, setFormResourceLookup] = useState('');
  const [formSelectedResourceId, setFormSelectedResourceId] = useState('');
  const [formSelectedIdentifier, setFormSelectedIdentifier] = useState('');
  const [formSelectedDisplayName, setFormSelectedDisplayName] = useState('');
  const [formHardwareId, setFormHardwareId] = useState<string>('ALL');
  const [formMode, setFormMode] = useState<HardwareBindingMode>('Permanent');
  const [formTimezone, setFormTimezone] = useState('Asia/Kolkata');
  const [formStartDate, setFormStartDate] = useState('2026-11-13');
  const [formStartTime, setFormStartTime] = useState('10:30:00');
  const [formEndDate, setFormEndDate] = useState('2026-11-20');
  const [formEndTime, setFormEndTime] = useState('18:00:00');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Full Vehicle / Driver Create Drawer triggers inside Resource Drawer
  const [quickCreateKind, setQuickCreateKind] = useState<null | 'Vehicle' | 'Driver'>(null);
  const [qcVehicleReg, setQcVehicleReg] = useState('');
  const [qcDriverPhone, setQcDriverPhone] = useState('');

  // Direct upload & Export state
  const resourceUpload = useDirectUploadState(activeDrawer === 'import');
  const [exportScope, setExportScope] = useState<'filtered' | 'selected'>('filtered');

  // Bulk state
  const [bulkEndReason, setBulkEndReason] = useState('Bulk operational end of allocation');

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterResourceType, filterStatus, filterMode, filterDateFrom, filterDateTo, activeCompanyScope]);

  const connectionsMap = useMemo(() => {
    const map = new Map<string, ModalMasterStore['connections'][number]>();
    store.connections.forEach((c) => map.set(c.id, c));
    return map;
  }, [store.connections]);

  const bindingsByConn = useMemo(() => {
    const map = new Map<string, HardwareBinding[]>();
    store.hardwareBindings.forEach((b) => {
      const arr = map.get(b.connectionId) || [];
      arr.push(b);
      map.set(b.connectionId, arr);
    });
    return map;
  }, [store.hardwareBindings]);

  // Enrich allocations with derived status, scoped hardware & bindings
  const enrichedAllocations = useMemo(() => {
    const nowMs = Date.now();
    const companyTarget =
      activeCompanyScope && activeCompanyScope !== 'All Clients'
        ? activeCompanyScope.trim().toLowerCase()
        : null;

    return store.resourceAllocations
      .filter((a) => !companyTarget || (a.companyName || '').trim().toLowerCase() === companyTarget)
      .map((a) => {
        const conn = connectionsMap.get(a.connectionId);
        const connBindings = bindingsByConn.get(a.connectionId) || [];
        const { scopedMembers, scopedBindings } = getScopedHardwareAndBindings(
          conn?.members || [],
          connBindings,
          a.hardwareId
        );
        const computed = computeResourceAllocationStatus(a, store.resourceAllocations, nowMs);
        const hwMember = a.hardwareId
          ? conn?.members?.find((m) => m.hardwareId === a.hardwareId)
          : null;
        const assignedHardware = hwMember
          ? `${hwMember.identifierValue} (${hwMember.category})`
          : 'All hardware in connection';

        return {
          ...a,
          conn,
          connBindings,
          scopedMembers,
          scopedBindings,
          bindingCount: scopedBindings.length,
          connectionName: conn?.name || a.connectionId,
          assignedHardware,
          computedStatus: computed.status as ResourceAllocationStatus,
          statusReason: computed.reason || '',
          driverDisplayName: a.resourceType === 'Driver' ? a.resourceDisplayName : '—',
          vehicleDisplayName: a.resourceType === 'Vehicle' ? a.resourceDisplayName : '—'
        };
      });
  }, [store.resourceAllocations, connectionsMap, bindingsByConn, activeCompanyScope]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const fromMs = filterDateFrom ? Date.parse(`${filterDateFrom}T00:00:00`) : null;
    const toMs = filterDateTo ? Date.parse(`${filterDateTo}T23:59:59`) : null;

    return enrichedAllocations.filter((row) => {
      if (filterResourceType !== 'All' && row.resourceType !== filterResourceType) return false;
      if (filterStatus !== 'All' && row.computedStatus !== filterStatus) return false;
      if (filterMode !== 'All' && row.mode !== filterMode) return false;

      if (fromMs && !Number.isNaN(fromMs)) {
        const sMs = Date.parse(row.effectiveStartAt);
        if (!Number.isNaN(sMs) && sMs < fromMs) return false;
      }
      if (toMs && !Number.isNaN(toMs)) {
        const sMs = Date.parse(row.effectiveStartAt);
        if (!Number.isNaN(sMs) && sMs > toMs) return false;
      }

      if (q) {
        const conn = connectionsMap.get(row.connectionId);
        const hwIds = (conn?.members || []).map((m) => m.identifierValue).join(' ');
        const hay = [
          row.id,
          row.connectionId,
          row.connectionName,
          row.resourceType,
          row.resourceIdentifier,
          row.resourceDisplayName,
          row.assignedHardware,
          row.site || '',
          row.companyName,
          hwIds
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    enrichedAllocations,
    searchQuery,
    filterResourceType,
    filterStatus,
    filterMode,
    filterDateFrom,
    filterDateTo,
    connectionsMap
  ]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      if (sortKey === 'id' || sortKey === 'connectionId') {
        const cmp = compareConnectionIds(String((a as any)[sortKey] || ''), String((b as any)[sortKey] || ''));
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortKey === 'bindingCount') {
        const cmp = a.bindingCount - b.bindingCount;
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const av = String((a as any)[sortKey === 'status' ? 'computedStatus' : sortKey] ?? '').toLowerCase();
      const bv = String((b as any)[sortKey === 'status' ? 'computedStatus' : sortKey] ?? '').toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const totalRecords = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const currentRows = sortedRows.slice(startIdx, startIdx + pageSize);

  const visibleColumns = useMemo(
    () => ALL_RESOURCE_VIEW_COLUMNS.filter((c) => !hiddenCols.includes(c.key)),
    [hiddenCols]
  );

  const activeFilterCount =
    (filterResourceType !== 'All' ? 1 : 0) +
    (filterStatus !== 'All' ? 1 : 0) +
    (filterMode !== 'All' ? 1 : 0) +
    (filterDateFrom ? 1 : 0) +
    (filterDateTo ? 1 : 0);

  const allCurrentSelected =
    currentRows.length > 0 && currentRows.every((r) => selectedIds.has(r.id));

  const toggleSelectAllOnPage = () => {
    const next = new Set(selectedIds);
    if (allCurrentSelected) {
      currentRows.forEach((r) => next.delete(r.id));
    } else {
      currentRows.forEach((r) => next.add(r.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleExpandRow = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageExpanded =
    currentRows.length > 0 && currentRows.every((r) => expandedIds.has(r.id));

  const toggleExpandAllOnPage = () => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageExpanded) currentRows.forEach((r) => next.delete(r.id));
      else currentRows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const handleSaveBindingFromResourceTab = (updated: HardwareBinding) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => ({
      ...prev,
      hardwareBindings: prev.hardwareBindings.map((b) => (b.id === updated.id ? updated : b)),
      connections: prev.connections.map((c) =>
        c.id === updated.connectionId
          ? {
              ...c,
              updatedAt: nowIso,
              updatedBy: actorName,
              version: c.version + 1,
              activity: [
                {
                  id: `act-${Date.now()}`,
                  timestamp: nowIso,
                  actor: actorName,
                  action: `Updated binding ${updated.id} (${updated.mode})`,
                  afterSummary: `Effective ${formatDateTimeWithTz(updated.effectiveStartAt, updated.timezone)}`
                },
                ...(c.activity || [])
              ]
            }
          : c
      )
    }));
    showToast(`Updated hardware binding ${updated.id}.`);
  };

  const handleEndBindingFromResourceTab = (binding: HardwareBinding) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => ({
      ...prev,
      hardwareBindings: prev.hardwareBindings.map((b) =>
        b.id === binding.id
          ? {
              ...b,
              endedAt: nowIso,
              effectiveEndAt: nowIso,
              endReason: 'Ended from Resource Connection View',
              updatedAt: nowIso
            }
          : b
      )
    }));
    showToast(`Binding ${binding.id} ended; history preserved.`);
  };

  // Client-scoped Connections & Master Resources for Create/Edit Allocation drawer
  const clientConnections = useMemo(() => {
    const target = formClient.trim().toLowerCase();
    return store.connections.filter((c) => (c.companyName || '').trim().toLowerCase() === target);
  }, [store.connections, formClient]);

  const clientVehicles = useMemo(() => {
    const target = formClient.trim().toLowerCase();
    return vehicles.filter((v) => (v.client || v.company || '').trim().toLowerCase() === target);
  }, [vehicles, formClient]);

  const clientDrivers = useMemo(() => {
    const target = formClient.trim().toLowerCase();
    return drivers.filter((d) => (d.company || '').trim().toLowerCase() === target);
  }, [drivers, formClient]);

  const resourceSearchMatches = useMemo(() => {
    const q = formResourceLookup.trim().toLowerCase();
    if (formResourceType === 'Vehicle') {
      return clientVehicles
        .filter(
          (v) =>
            !q ||
            v.registration_number.toLowerCase().includes(q) ||
            (v.machine_model || v.model || '').toLowerCase().includes(q)
        )
        .slice(0, 12)
        .map((v) => ({
          id: v.id,
          identifier: v.registration_number,
          displayName: `${v.machine_model || v.model || 'Vehicle'} · ${v.registration_number}`,
          sub: `${v.status} · ${v.location || 'Site N/A'}`
        }));
    }
    if (formResourceType === 'Driver') {
      return clientDrivers
        .filter(
          (d) =>
            !q ||
            d.phone.toLowerCase().includes(q) ||
            d.name.toLowerCase().includes(q) ||
            d.licence.toLowerCase().includes(q)
        )
        .slice(0, 12)
        .map((d) => ({
          id: d.id,
          identifier: d.phone.startsWith('+') ? d.phone : `+91 ${d.phone}`,
          displayName: d.name,
          sub: `${d.status} · Licence ${d.licence}`
        }));
    }
    return [];
  }, [formResourceType, formResourceLookup, clientVehicles, clientDrivers]);

  const openCreateAllocation = () => {
    const defaultClient =
      activeCompanyScope === 'All Clients' ? MODAL_OWNERS[0] : activeCompanyScope;
    const firstConn = store.connections.find(
      (c) => c.companyName.toLowerCase() === defaultClient.toLowerCase()
    );
    setEditingAlloc(null);
    setFormClient(defaultClient);
    setFormConnectionId(firstConn?.id || '');
    setFormResourceType('Vehicle');
    setFormResourceLookup('');
    setFormSelectedResourceId('');
    setFormSelectedIdentifier('');
    setFormSelectedDisplayName('');
    setFormHardwareId('ALL');
    setFormMode('Permanent');
    setFormTimezone('Asia/Kolkata');
    setFormStartDate('2026-11-13');
    setFormStartTime('10:30:00');
    setFormEndDate('2026-11-20');
    setFormEndTime('18:00:00');
    setFormNotes('');
    setFormError(null);
    setQuickCreateKind(null);
    setActiveDrawer('form');
  };

  const openEditAllocation = (alloc: ResourceAllocation) => {
    setEditingAlloc(alloc);
    setFormClient(alloc.companyName);
    setFormConnectionId(alloc.connectionId);
    setFormResourceType(alloc.resourceType);
    setFormResourceLookup(alloc.resourceIdentifier);
    setFormSelectedResourceId(alloc.resourceId);
    setFormSelectedIdentifier(alloc.resourceIdentifier);
    setFormSelectedDisplayName(alloc.resourceDisplayName);
    setFormHardwareId(alloc.hardwareId || 'ALL');
    setFormMode(alloc.mode);
    setFormTimezone(alloc.timezone || 'Asia/Kolkata');
    const st = formatLocalInputParts(alloc.effectiveStartAt, alloc.timezone || 'Asia/Kolkata');
    setFormStartDate(st.date || '2026-11-13');
    setFormStartTime(st.time || '10:30:00');
    if (alloc.effectiveEndAt) {
      const en = formatLocalInputParts(alloc.effectiveEndAt, alloc.timezone || 'Asia/Kolkata');
      setFormEndDate(en.date);
      setFormEndTime(en.time);
    } else {
      setFormEndDate('2026-11-20');
      setFormEndTime('18:00:00');
    }
    setFormNotes(alloc.notes || '');
    setFormError(null);
    setQuickCreateKind(null);
    setActiveDrawer('form');
  };

  const handleCreatedVehicle = (newVeh: Vehicle) => {
    const vehicleRecord: Vehicle = {
      ...newVeh,
      company: newVeh.company || formClient,
      client: newVeh.client || formClient
    };
    const updated = [vehicleRecord, ...vehicles.filter((v) => v.id !== vehicleRecord.id)];
    setVehicles(updated);
    saveVehicleMasterStore(updated);
    setFormResourceType('Vehicle');
    setFormSelectedResourceId(vehicleRecord.id);
    setFormSelectedIdentifier(vehicleRecord.registration_number);
    setFormSelectedDisplayName(
      `${vehicleRecord.machine_model || vehicleRecord.model || 'Vehicle'} · ${vehicleRecord.registration_number}`
    );
    setFormResourceLookup(vehicleRecord.registration_number);
    setQuickCreateKind(null);
    setQcVehicleReg('');
    setFormError(null);
    showToast(`Vehicle ${vehicleRecord.registration_number} created in ${vehicleRecord.company} Master & selected.`);
  };

  const handleCreatedDriver = (newDrv: Driver) => {
    const driverRecord: Driver = {
      ...newDrv,
      company: newDrv.company || formClient
    };
    const updated = [driverRecord, ...drivers.filter((d) => d.id !== driverRecord.id)];
    setDrivers(updated);
    saveDriverMasterStore(updated);
    setFormResourceType('Driver');
    setFormSelectedResourceId(driverRecord.id);
    setFormSelectedIdentifier(driverRecord.phone);
    setFormSelectedDisplayName(driverRecord.name);
    setFormResourceLookup(driverRecord.phone);
    setQuickCreateKind(null);
    setQcDriverPhone('');
    setFormError(null);
    showToast(`Driver ${driverRecord.name} created in ${driverRecord.company} Master & selected.`);
  };

  const handleSaveAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formConnectionId) {
      setFormError('Select a Connection to allocate this resource to.');
      return;
    }

    const finalIdentifier = (formSelectedIdentifier || formResourceLookup).trim();
    if (!finalIdentifier) {
      setFormError(
        formResourceType === 'Vehicle'
          ? 'Search and select a Vehicle by Registration No.'
          : formResourceType === 'Driver'
          ? 'Search and select a Driver by Contact No.'
          : 'Enter a valid Resource Identifier.'
      );
      return;
    }

    // For Vehicle / Driver, require actual match in client's master if not custom fleet/place
    if ((formResourceType === 'Vehicle' || formResourceType === 'Driver') && !formSelectedResourceId) {
      setFormError(
        `No matching ${formResourceType} selected from ${formClient} master. Select a search result or use + Create ${formResourceType}.`
      );
      return;
    }

    const startIso = buildIsoWithTimezone(formStartDate, formStartTime, formTimezone);
    const endIso =
      formMode === 'Temporal' ? buildIsoWithTimezone(formEndDate, formEndTime, formTimezone) : null;

    if (!startIso) {
      setFormError('Effective Start date and time are required.');
      return;
    }
    if (formMode === 'Temporal') {
      if (!endIso || Date.parse(endIso) <= Date.parse(startIso)) {
        setFormError('Effective End date & time must be strictly after Effective Start.');
        return;
      }
    }

    const resId = formSelectedResourceId || `res-${formResourceType.toLowerCase()}-${Date.now()}`;
    const overlap = store.resourceAllocations.find(
      (other) =>
        other.id !== editingAlloc?.id &&
        !other.endedAt &&
        other.connectionId === formConnectionId &&
        other.resourceType === formResourceType &&
        other.resourceIdentifier.toLowerCase() === finalIdentifier.toLowerCase() &&
        dateTimeIntervalsOverlap(startIso, endIso, other.effectiveStartAt, other.endedAt || other.effectiveEndAt)
    );
    if (overlap) {
      setFormError(
        `Overlapping active allocation ${overlap.id} already exists for ${finalIdentifier} on ${formConnectionId}. End the prior allocation first or choose a non-overlapping period.`
      );
      return;
    }

    const nowIso = new Date().toISOString();
    if (editingAlloc) {
      const updated: ResourceAllocation = {
        ...editingAlloc,
        companyId: COMPANY_NAME_TO_ID[formClient] || editingAlloc.companyId,
        companyName: formClient,
        connectionId: formConnectionId,
        resourceType: formResourceType,
        resourceId: resId,
        resourceIdentifier: finalIdentifier,
        resourceDisplayName: formSelectedDisplayName || finalIdentifier,
        hardwareId: formHardwareId === 'ALL' ? null : formHardwareId,
        mode: formMode,
        effectiveStartAt: startIso,
        effectiveEndAt: endIso,
        timezone: formTimezone,
        site: editingAlloc.site || '',
        notes: formNotes.trim(),
        updatedAt: nowIso
      };
      setStore((prev) => ({
        ...prev,
        resourceAllocations: prev.resourceAllocations.map((a) => (a.id === editingAlloc.id ? updated : a))
      }));
      showToast(`Allocation ${editingAlloc.id} updated.`);
    } else {
      const newAlloc: ResourceAllocation = {
        id: getNextResourceAllocationId(store.resourceAllocations),
        companyId: COMPANY_NAME_TO_ID[formClient] || 'comp-adani-mundra',
        companyName: formClient,
        connectionId: formConnectionId,
        resourceType: formResourceType,
        resourceId: resId,
        resourceIdentifier: finalIdentifier,
        resourceDisplayName: formSelectedDisplayName || finalIdentifier,
        hardwareId: formHardwareId === 'ALL' ? null : formHardwareId,
        mode: formMode,
        effectiveStartAt: startIso,
        effectiveEndAt: endIso,
        timezone: formTimezone,
        site: '',
        assignedBy: actorName,
        assignedOn: nowIso,
        updatedAt: nowIso,
        notes: formNotes.trim()
      };
      setStore((prev) => ({
        ...prev,
        resourceAllocations: [newAlloc, ...prev.resourceAllocations],
        connections: prev.connections.map((c) =>
          c.id === formConnectionId
            ? {
                ...c,
                updatedAt: nowIso,
                updatedBy: actorName,
                activity: [
                  {
                    id: `act-${Date.now()}`,
                    timestamp: nowIso,
                    actor: actorName,
                    action: `Allocated ${formResourceType} (${finalIdentifier})`,
                    afterSummary: `Allocation ${newAlloc.id}`
                  },
                  ...(c.activity || [])
                ]
              }
            : c
        )
      }));
      setSortKey('');
      setCurrentPage(1);
      showToast(`Resource allocation ${newAlloc.id} created.`);
    }

    setActiveDrawer(null);
  };

  const handleConfirmEndAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!endingAlloc) return;
    const endedIso = buildIsoWithTimezone(
      endDateInput,
      endTimeInput,
      endingAlloc.timezone || 'Asia/Kolkata'
    );
    const nowIso = new Date().toISOString();
    setStore((prev) => ({
      ...prev,
      resourceAllocations: prev.resourceAllocations.map((a) =>
        a.id === endingAlloc.id
          ? {
              ...a,
              endedAt: endedIso || nowIso,
              effectiveEndAt: endedIso || nowIso,
              endReason: endReasonInput.trim() || 'Ended by operator',
              unassignedBy: actorName,
              updatedAt: nowIso
            }
          : a
      ),
      connections: prev.connections.map((c) =>
        c.id === endingAlloc.connectionId
          ? {
              ...c,
              updatedAt: nowIso,
              updatedBy: actorName,
              activity: [
                {
                  id: `act-${Date.now()}`,
                  timestamp: nowIso,
                  actor: actorName,
                  action: `Ended resource allocation ${endingAlloc.id}`,
                  afterSummary: `${endingAlloc.resourceType} ${endingAlloc.resourceIdentifier} · ${endReasonInput.trim()}`
                },
                ...(c.activity || [])
              ]
            }
          : c
      )
    }));
    showToast(`Allocation ${endingAlloc.id} ended; historical record preserved.`);
    setEndingAlloc(null);
    setActiveDrawer(null);
  };

  // Bulk End Allocations
  const selectedRows = useMemo(
    () => enrichedAllocations.filter((r) => selectedIds.has(r.id)),
    [enrichedAllocations, selectedIds]
  );

  const handleBulkEndAllocations = () => {
    const eligible = selectedRows.filter((r) => r.computedStatus !== 'Ended');
    if (eligible.length === 0) return;
    const eligibleIds = new Set(eligible.map((r) => r.id));
    const nowIso = new Date().toISOString();
    setStore((prev) => ({
      ...prev,
      resourceAllocations: prev.resourceAllocations.map((a) =>
        eligibleIds.has(a.id)
          ? {
              ...a,
              endedAt: nowIso,
              effectiveEndAt: nowIso,
              endReason: bulkEndReason.trim() || 'Bulk ended',
              unassignedBy: actorName,
              updatedAt: nowIso
            }
          : a
      )
    }));
    showToast(`Ended ${eligible.length} resource allocation(s) (${selectedRows.length - eligible.length} already ended).`);
    setSelectedIds(new Set());
    setActiveDrawer(null);
  };

  // Export handler (text-safe formatting + explicit timezone)
  const handleRunExport = () => {
    const source = exportScope === 'selected' && selectedRows.length > 0 ? selectedRows : sortedRows;
    const colsToExport = visibleColumns.length > 0 ? visibleColumns : RESOURCE_VIEW_DEFAULT_COLUMNS;
    const rows = source.map((r) => ({
      id: r.id,
      connectionId: r.connectionId,
      connectionName: r.connectionName,
      resourceType: r.resourceType,
      resourceIdentifier: r.resourceIdentifier,
      assignedHardware: r.assignedHardware,
      bindingCount: r.bindingCount,
      effectiveStartAt: formatDateTimeWithTz(r.effectiveStartAt, r.timezone, true),
      effectiveEndAt: r.endedAt || r.effectiveEndAt ? formatDateTimeWithTz(r.endedAt || r.effectiveEndAt, r.timezone, true) : 'Open-ended',
      status: r.computedStatus,
      companyName: r.companyName,
      site: r.site || '—',
      assignedBy: r.assignedBy,
      assignedOn: formatDateTimeWithTz(r.assignedOn, r.timezone, false),
      unassignedBy: r.unassignedBy || '—',
      endReason: r.endReason || '—',
      mode: r.mode,
      driverDisplayName: r.driverDisplayName,
      vehicleDisplayName: r.vehicleDisplayName,
      updatedAt: formatDateTimeWithTz(r.updatedAt, r.timezone, false)
    }));
    downloadModalCsv(
      `fleetrobo-resource-allocations-${activeCompanyScope.toLowerCase().replace(/\s+/g, '-')}.csv`,
      colsToExport,
      rows
    );
    showToast(`Exported ${rows.length} resource allocation record(s).`);
    setActiveDrawer(null);
  };

  // Direct CSV/JSON upload execution
  const processResourceUpload = (fmt: 'csv' | 'json', rawText: string, fileName: string, fileSize?: number) => {
    const raw = rawText.trim();
    if (!raw) {
      resourceUpload.fail('Uploaded file is empty.');
      return;
    }

    const valid: ResourceAllocation[] = [];
    const invalid: { line: number; reason: string }[] = [];
    const nowIso = new Date().toISOString();

    if (fmt === 'json') {
      try {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        arr.forEach((item, idx) => {
          const connId = String(item.connectionId || '').trim();
          const resType = (item.resourceType || 'Vehicle') as ResourceType;
          const resIdent = String(item.resourceIdentifier || '').trim();
          const conn = connectionsMap.get(connId);
          if (!conn) {
            invalid.push({ line: idx + 1, reason: `Unknown connectionId "${connId}"` });
            return;
          }
          if (!resIdent) {
            invalid.push({ line: idx + 1, reason: 'Missing resourceIdentifier' });
            return;
          }
          valid.push({
            id: getNextResourceAllocationId(store.resourceAllocations, valid.length),
            companyId: conn.companyId,
            companyName: conn.companyName,
            connectionId: conn.id,
            resourceType: resType,
            resourceId: `res-imp-${Date.now()}-${idx}`,
            resourceIdentifier: resIdent,
            resourceDisplayName: String(item.resourceDisplayName || resIdent),
            hardwareId: null,
            mode: item.mode === 'Temporal' ? 'Temporal' : 'Permanent',
            effectiveStartAt: item.effectiveStartAt || nowIso,
            effectiveEndAt: item.effectiveEndAt || null,
            timezone: item.timezone || 'Asia/Kolkata',
            site: item.site || conn.site || 'Mundra CT2',
            assignedBy: actorName,
            assignedOn: nowIso,
            updatedAt: nowIso
          });
        });
      } catch {
        resourceUpload.fail('Invalid JSON syntax.');
        return;
      }
    } else {
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      lines.forEach((line, idx) => {
        const cols = parseCsvLine(line);
        if (idx === 0 && cols[0]?.toLowerCase().includes('connection')) return;
        const [connId, resTypeRaw, resIdent, modeRaw, startIso, endIso] = cols;
        const conn = connectionsMap.get((connId || '').trim());
        if (!conn) {
          invalid.push({ line: idx + 1, reason: `Unknown Connection ID "${connId || ''}"` });
          return;
        }
        if (!resIdent) {
          invalid.push({ line: idx + 1, reason: 'Missing Resource Identifier (Reg No. or Contact No.)' });
          return;
        }
        const mode: HardwareBindingMode = modeRaw === 'Temporal' ? 'Temporal' : 'Permanent';
        if (mode === 'Temporal' && (!endIso || Date.parse(endIso) <= Date.parse(startIso || nowIso))) {
          invalid.push({ line: idx + 1, reason: 'Temporal allocation requires Effective End > Effective Start' });
          return;
        }
        valid.push({
          id: getNextResourceAllocationId(store.resourceAllocations, valid.length),
          companyId: conn.companyId,
          companyName: conn.companyName,
          connectionId: conn.id,
          resourceType: (RESOURCE_TYPES.includes(resTypeRaw as ResourceType) ? resTypeRaw : 'Vehicle') as ResourceType,
          resourceId: `res-imp-${Date.now()}-${idx}`,
          resourceIdentifier: resIdent,
          resourceDisplayName: resIdent,
          hardwareId: null,
          mode,
          effectiveStartAt: startIso || nowIso,
          effectiveEndAt: mode === 'Temporal' ? endIso : null,
          timezone: 'Asia/Kolkata',
          site: conn.site || 'Mundra CT2',
          assignedBy: actorName,
          assignedOn: nowIso,
          updatedAt: nowIso
        });
      });
    }

    if (valid.length === 0) {
      resourceUpload.fail(
        invalid[0]?.reason || 'No valid resource allocation rows found in uploaded file.'
      );
      return;
    }

    resourceUpload.startUploading(fileName, formatUploadFileSize(fileSize), () => {
      setStore((prev) => ({
        ...prev,
        resourceAllocations: [...valid, ...prev.resourceAllocations]
      }));
      setSortKey('');
      setCurrentPage(1);
      showToast(`Imported ${valid.length} resource allocation(s) (${invalid.length} skipped).`);
      return {
        headline: 'Resource allocations uploaded successfully',
        description: `${valid.length} allocation${valid.length === 1 ? '' : 's'} created from ${fileName}.${
          invalid.length > 0 ? ` ${invalid.length} invalid or unknown row${invalid.length === 1 ? '' : 's'} skipped.` : ''
        }`,
        stats: [
          { label: 'Uploaded', value: valid.length, tone: 'emerald' },
          { label: 'Skipped', value: invalid.length, tone: invalid.length > 0 ? 'amber' : 'slate' }
        ]
      };
    });
  };

  // Saved Views for Resource Connection View
  const resourceSavedViews = useMemo(
    () => savedViews.filter((v) => v.pageId === 'resources'),
    [savedViews]
  );

  const handleApplyView = (view: SavedModalView) => {
    setSearchQuery(view.query || '');
    setFilterResourceType(view.filters.resourceType || 'All');
    setFilterStatus(view.filters.status || 'All');
    setFilterMode(view.filters.mode || 'All');
    setSortKey(view.sortKey || 'id');
    setSortDir(view.sortDir || 'asc');
    if (view.hiddenCols && view.hiddenCols.length > 0) {
      setHiddenCols(view.hiddenCols);
    }
    if (view.density) setDensity(view.density);
    setActiveDrawer(null);
    showToast(`Applied saved view "${view.name}".`);
  };

  const handleSaveCurrentView = () => {
    if (!newViewName.trim()) return;
    const view: SavedModalView = {
      id: `sv-res-${Date.now()}`,
      pageId: 'resources',
      companyScope: activeCompanyScope,
      name: newViewName.trim(),
      query: searchQuery,
      filters: {
        resourceType: filterResourceType,
        status: filterStatus,
        mode: filterMode
      },
      sortKey,
      sortDir,
      hiddenCols,
      density
    };
    setSavedViews((prev) => [...prev, view]);
    setNewViewName('');
    showToast(`Saved view "${view.name}".`);
  };

  const renderStatusPill = (status: ResourceAllocationStatus) => {
    const styles: Record<ResourceAllocationStatus, string> = {
      Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
      Ended: 'bg-slate-100 text-slate-600 border-slate-200',
      Conflict: 'bg-rose-50 text-rose-700 border-rose-200'
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${styles[status]}`}>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === 'Active'
              ? 'bg-emerald-500'
              : status === 'Scheduled'
              ? 'bg-sky-500'
              : status === 'Conflict'
              ? 'bg-rose-500'
              : 'bg-slate-400'
          }`}
        />
        {status}
      </span>
    );
  };

  const historyForInspected = useMemo(() => {
    if (!inspectedAlloc) return [];
    return store.resourceAllocations
      .filter(
        (a) =>
          a.connectionId === inspectedAlloc.connectionId ||
          (a.resourceIdentifier === inspectedAlloc.resourceIdentifier && a.resourceType === inspectedAlloc.resourceType)
      )
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [inspectedAlloc, store.resourceAllocations]);

  const relationshipsForInspected = useMemo(() => {
    if (!inspectedAlloc) return [];
    return (store.resourceRelationships || [])
      .filter(
        (r) =>
          (r.sourceResourceType === inspectedAlloc.resourceType &&
            (r.sourceResourceId === inspectedAlloc.resourceId ||
              r.sourceResourceIdentifier === inspectedAlloc.resourceIdentifier)) ||
          (r.targetResourceType === inspectedAlloc.resourceType &&
            (r.targetResourceId === inspectedAlloc.resourceId ||
              r.targetResourceIdentifier === inspectedAlloc.resourceIdentifier))
      )
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [inspectedAlloc, store.resourceRelationships]);

  const rowPad = density === 'compact' ? 'py-1.5' : 'py-2.5';

  return (
    <div className="flex-1 min-h-0 flex flex-col px-5 py-3.5 overflow-hidden bg-[#F8FAFC]">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 mb-2.5 flex items-center justify-between gap-2.5 flex-wrap shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-[360px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Vehicle Reg, Driver Contact, Resource, Organization..."
              className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-slate-50/70 text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#F26522]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveDrawer('filters')}
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-medium cursor-pointer transition-colors ${
              activeFilterCount > 0
                ? 'border-[#F26522] bg-[#FFF3EE] text-[#F26522]'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#F26522] text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <ColumnCataloguePopover
            align="left"
            columns={ALL_RESOURCE_VIEW_COLUMNS.map((c) => ({
              key: c.key,
              label: c.label,
              required: c.key === 'resourceIdentifier',
              category: c.optional ? 'OPTIONAL COLUMNS' : 'DEFAULT COLUMNS',
            }))}
            visibleKeys={ALL_RESOURCE_VIEW_COLUMNS.filter((c) => !hiddenCols.includes(c.key)).map((c) => c.key)}
            onChangeVisibleKeys={(nextKeys) =>
              setHiddenCols(ALL_RESOURCE_VIEW_COLUMNS.filter((c) => !nextKeys.includes(c.key)).map((c) => c.key))
            }
            defaultKeys={RESOURCE_VIEW_DEFAULT_COLUMNS.map((c) => c.key)}
            roleDefaultKeys={RESOURCE_VIEW_DEFAULT_COLUMNS.map((c) => c.key)}
            defaultPinnedKeys={['companyName', 'resourceIdentifier']}
            onToast={(msg) => showToast(msg, 'success')}
          />

          <button
            type="button"
            onClick={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            title="Toggle row density"
          >
            <Rows className="w-3.5 h-3.5" />
            <span>{density === 'compact' ? 'Compact' : 'Comfortable'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawer('saved-views')}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved views</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setVehicles(loadVehicleMasterStore());
              setDrivers(loadDriverMasterStore());
              showToast('Refreshed local resource allocation view.');
            }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
            title="Refresh local dataset"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => setActiveDrawer('bulk')}
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-medium transition-colors ${
                selectedIds.size > 0
                  ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer'
                  : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk actions{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => setActiveDrawer('import')}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setExportScope(selectedIds.size > 0 ? 'selected' : 'filtered');
              setActiveDrawer('export');
            }}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={openCreateAllocation}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#F26522] hover:bg-[#dc5719] text-white text-[12px] font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Allocate Resource</span>
            </button>
          )}
        </div>
      </div>

      {/* Computed Summary Bar & Expand Toggle */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 px-0.5 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleExpandAllOnPage}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
          >
            <ChevronsUpDown className="w-3 h-3 text-[#F26522]" />
            {allOnPageExpanded ? 'Collapse Page Rows' : 'Expand Page Rows'}
          </button>
          {selectedIds.size > 0 ? (
            <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-[#FFF3EE] text-[#F26522] font-semibold border border-[#F26522]/20">
              {selectedIds.size} selected
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="underline hover:text-[#b84310] cursor-pointer"
              >
                Clear
              </button>
            </span>
          ) : (
            <span>Expand any allocation row to inspect exact connected hardware &amp; binding relationships.</span>
          )}
        </div>
        <div className="font-medium text-slate-600">
          {enrichedAllocations.length} allocations ·{' '}
          {enrichedAllocations.filter((a) => a.computedStatus === 'Active').length} active ·{' '}
          {enrichedAllocations.filter((a) => a.computedStatus === 'Scheduled').length} scheduled ·{' '}
          {enrichedAllocations.filter((a) => a.computedStatus === 'Ended').length} ended
        </div>
      </div>

      {/* Main Table Card */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-50 px-2 py-2.5 w-9 text-center border-b border-r border-slate-200">
                  <button
                    type="button"
                    title={allOnPageExpanded ? 'Collapse all rows on page' : 'Expand all rows on page'}
                    onClick={toggleExpandAllOnPage}
                    className="p-1 rounded text-slate-500 hover:text-[#F26522] hover:bg-orange-50 cursor-pointer"
                  >
                    {allOnPageExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#F26522]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
                <th className="sticky left-9 z-30 bg-slate-50 px-2.5 py-2.5 w-10 border-b border-slate-200">
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={allCurrentSelected}
                      onChange={toggleSelectAllOnPage}
                      className="rounded border-slate-300 text-[#F26522] focus:ring-[#F26522] cursor-pointer"
                    />
                    <HeaderInfoTooltip text={RESOURCE_VIEW_SELECT_TOOLTIP} align="left" />
                  </div>
                </th>
                {visibleColumns.map((col, idx) => {
                  return (
                    <th
                      key={col.key}
                      style={{ minWidth: col.minWidth }}
                      onClick={() => handleSort(col.key)}
                      className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 cursor-pointer select-none whitespace-nowrap hover:text-slate-800"
                    >
                      <div className="inline-flex items-center gap-1">
                        <span>{col.label}</span>
                        {col.tooltip && (
                          <HeaderInfoTooltip text={col.tooltip} align={idx < 2 ? 'left' : 'center'} />
                        )}
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[#F26522]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#F26522]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="sticky right-0 z-30 bg-slate-50 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-l border-slate-200 text-right w-[78px]">
                  <div className="inline-flex items-center justify-end gap-1">
                    <span>ACTIONS</span>
                    <HeaderInfoTooltip text={RESOURCE_VIEW_ACTIONS_TOOLTIP} align="right" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 3} className="px-6 py-14 text-center">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="text-[14px] font-semibold text-slate-800">
                        No matching resource allocations found
                      </div>
                      <p className="text-[12px] text-slate-500">
                        Adjust your search or filters, or allocate an existing client Vehicle or Driver to a mapping.
                      </p>
                      {(searchQuery || activeFilterCount > 0) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setFilterResourceType('All');
                            setFilterStatus('All');
                            setFilterMode('All');
                            setFilterDateFrom('');
                            setFilterDateTo('');
                          }}
                          className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentRows.map((row, rowIdx) => {
                  const isSelected = selectedIds.has(row.id);
                  const isExpanded = expandedIds.has(row.id);
                  return (
                    <React.Fragment key={`${row.id}-${rowIdx}`}>
                      <tr
                        className={`group transition-colors ${
                          isExpanded
                            ? 'bg-[#FFF9F6]'
                            : isSelected
                            ? 'bg-[#FFF3EE]/40'
                            : 'hover:bg-slate-50/90'
                        }`}
                      >
                        <td
                          className={`sticky left-0 z-10 px-2 ${rowPad} text-center border-r border-slate-100 ${
                            isExpanded ? 'bg-[#FFF9F6]' : 'bg-white group-hover:bg-slate-50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleExpandRow(row.id)}
                            title={isExpanded ? 'Collapse connected hardware' : 'Expand connected hardware'}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              isExpanded
                                ? 'text-[#F26522] bg-[#FFF3EE]'
                                : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td
                          className={`sticky left-9 z-10 px-2.5 ${rowPad} ${
                            isExpanded ? 'bg-[#FFF9F6]' : 'bg-white group-hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(row.id)}
                            className="rounded border-slate-300 text-[#F26522] focus:ring-[#F26522] cursor-pointer"
                          />
                        </td>
                        {visibleColumns.map((col) => {
                          const isStickyId = false;
                          let cell: React.ReactNode = null;
                          switch (col.key) {
                            case 'id':
                              cell = (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandRow(row.id)}
                                  className="font-mono font-bold text-[#17212b] hover:text-[#F26522] cursor-pointer"
                                >
                                  {row.id}
                                </button>
                              );
                              break;
                            case 'connectionId':
                              cell = (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (row.conn) setConnDetailsState({ conn: row.conn, tab: 'overview' });
                                  }}
                                  className="font-mono font-bold text-slate-900 hover:text-[#F26522] cursor-pointer"
                                >
                                  {row.connectionId}
                                </button>
                              );
                              break;
                            case 'connectionName':
                              cell = (
                                <div className="font-medium text-slate-800 truncate max-w-[220px]" title={row.connectionName}>
                                  {row.connectionName}
                                </div>
                              );
                              break;
                            case 'resourceType':
                              cell = (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 font-medium text-[11px]">
                                  {row.resourceType === 'Vehicle' && <Truck className="w-3.5 h-3.5 text-sky-600" />}
                                  {row.resourceType === 'Driver' && <User className="w-3.5 h-3.5 text-purple-600" />}
                                  {row.resourceType === 'Fleet' && <Layers className="w-3.5 h-3.5 text-indigo-600" />}
                                  {row.resourceType === 'Vendor' && <Store className="w-3.5 h-3.5 text-orange-600" />}
                                  {row.resourceType === 'Place' && <MapPin className="w-3.5 h-3.5 text-emerald-600" />}
                                  {row.resourceType === 'Equipment' && <Wrench className="w-3.5 h-3.5 text-violet-600" />}
                                  {row.resourceType}
                                </span>
                              );
                              break;
                            case 'resourceIdentifier':
                              cell = (
                                <div>
                                  <div className="font-mono font-bold text-slate-900">
                                    {row.resourceIdentifier}
                                  </div>
                                  {row.hardwareId && (
                                    <div className="text-[10px] text-slate-500 truncate max-w-[165px]">
                                      Scope: {row.assignedHardware}
                                    </div>
                                  )}
                                </div>
                              );
                              break;
                            case 'assignedHardware':
                              cell = (
                                <HardwareCountChips
                                  members={row.scopedMembers}
                                  onClick={() => toggleExpandRow(row.id)}
                                />
                              );
                              break;
                            case 'bindingCount':
                              cell = (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandRow(row.id)}
                                  className="font-bold text-slate-900 hover:text-[#F26522] tabular-nums cursor-pointer"
                                >
                                  {row.bindingCount}
                                </button>
                              );
                              break;
                            case 'effectiveStartAt':
                              cell = (
                                <span className="text-slate-700 whitespace-nowrap tabular-nums">
                                  {formatDateTimeWithTz(row.effectiveStartAt, row.timezone)}
                                </span>
                              );
                              break;
                            case 'effectiveEndAt':
                              cell = (
                                <span className="text-slate-600 whitespace-nowrap tabular-nums">
                                  {row.endedAt || row.effectiveEndAt
                                    ? formatDateTimeWithTz(row.endedAt || row.effectiveEndAt, row.timezone)
                                    : '—'}
                                </span>
                              );
                              break;
                            case 'status':
                              cell = renderStatusPill(row.computedStatus);
                              break;
                            case 'companyName':
                              cell = (
                                <span className="inline-flex items-center gap-1.5 font-medium text-[#17212b] whitespace-nowrap">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{row.companyName || '—'}</span>
                                </span>
                              );
                              break;
                            case 'site':
                              cell = <span className="text-slate-600">{row.site || '—'}</span>;
                              break;
                            case 'assignedBy':
                              cell = <span className="text-slate-600">{row.assignedBy}</span>;
                              break;
                            case 'assignedOn':
                              cell = (
                                <span className="text-slate-600 whitespace-nowrap">
                                  {formatDateTimeWithTz(row.assignedOn, row.timezone)}
                                </span>
                              );
                              break;
                            case 'unassignedBy':
                              cell = <span className="text-slate-600">{row.unassignedBy || '—'}</span>;
                              break;
                            case 'endReason':
                              cell = <span className="text-slate-600">{row.endReason || '—'}</span>;
                              break;
                            case 'mode':
                              cell = (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
                                  {row.mode === 'Permanent' ? (
                                    <InfinityIcon className="w-3.5 h-3.5 text-indigo-600" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  )}
                                  {row.mode}
                                </span>
                              );
                              break;
                            case 'driverDisplayName':
                              cell = <span className="text-slate-700">{row.driverDisplayName}</span>;
                              break;
                            case 'vehicleDisplayName':
                              cell = <span className="text-slate-700">{row.vehicleDisplayName}</span>;
                              break;
                            case 'updatedAt':
                              cell = (
                                <span className="text-slate-600 whitespace-nowrap">
                                  {formatDateTimeWithTz(row.updatedAt, row.timezone)}
                                </span>
                              );
                              break;
                          }
                          return (
                            <td
                              key={col.key}
                              className={`px-3 ${rowPad} whitespace-nowrap ${
                                isStickyId
                                  ? `sticky left-[76px] z-10 border-r border-slate-100 ${
                                      isExpanded ? 'bg-[#FFF9F6]' : 'bg-white group-hover:bg-slate-50'
                                    }`
                                  : ''
                              }`}
                            >
                              {cell}
                            </td>
                          );
                        })}
                        <td
                          className={`sticky right-0 z-10 px-3 ${rowPad} border-l border-slate-100 text-right ${
                            isExpanded ? 'bg-[#FFF9F6]' : 'bg-white group-hover:bg-slate-50'
                          }`}
                        >
                          <div className="inline-flex items-center justify-end">
                            <RowActionMenu
                              ariaLabel={`Actions for ${row.resourceIdentifier}`}
                              menuWidthClass="w-56"
                              items={[
                                {
                                  id: 'view',
                                  label: 'View allocation details',
                                  icon: <Eye className="w-3.5 h-3.5 text-slate-400" />,
                                  onClick: () => {
                                    setInspectedAlloc(row);
                                    setInspectorTab('details');
                                    setActiveDrawer('view');
                                  },
                                },
                                {
                                  id: 'edit',
                                  label: 'Edit allocation',
                                  icon: <Edit2 className="w-3.5 h-3.5 text-slate-400" />,
                                  hidden: !canEdit,
                                  onClick: () => openEditAllocation(row),
                                },
                                {
                                  id: 'history',
                                  label: 'View allocation history',
                                  icon: <History className="w-3.5 h-3.5 text-slate-400" />,
                                  onClick: () => {
                                    setInspectedAlloc(row);
                                    setInspectorTab('history');
                                    setActiveDrawer('view');
                                  },
                                },
                                {
                                  id: 'inspect-conn',
                                  label: `Inspect Connection (${row.connectionId})`,
                                  icon: <Link2 className="w-3.5 h-3.5 text-slate-400" />,
                                  hidden: !row.conn,
                                  dividerBefore: true,
                                  onClick: () => {
                                    if (row.conn) {
                                      setConnDetailsState({ conn: row.conn, tab: 'bindings' });
                                    }
                                  },
                                },
                                {
                                  id: 'end-alloc',
                                  label: 'End Allocation',
                                  icon: <StopCircle className="w-3.5 h-3.5" />,
                                  tone: 'danger',
                                  hidden: !canEdit || row.computedStatus === 'Ended',
                                  dividerBefore: true,
                                  onClick: () => {
                                    setEndingAlloc(row);
                                    setEndDateInput('2026-11-13');
                                    setEndTimeInput('18:00:00');
                                    setEndReasonInput('Operational reassignment completed');
                                    setActiveDrawer('end-modal');
                                  },
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>

                      {isExpanded && row.conn && (
                        <tr>
                          <td colSpan={visibleColumns.length + 3} className="p-0">
                            <ExpandableHardwareRows
                              variant="resource"
                              connection={row.conn}
                              connectionBindings={row.connBindings}
                              allGlobalBindings={store.hardwareBindings}
                              scopeHardwareId={row.hardwareId}
                              canEdit={canEdit}
                              onOpenDetails={(targetConn, tab) =>
                                setConnDetailsState({ conn: targetConn, tab })
                              }
                              onSaveBinding={handleSaveBindingFromResourceTab}
                              onEndBinding={handleEndBindingFromResourceTab}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between text-[12px] text-slate-600 shrink-0 flex-wrap gap-2">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-900">
              {totalRecords === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, totalRecords)}
            </span>{' '}
            of <span className="font-semibold text-slate-900">{totalRecords}</span> records
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-7 px-2 rounded border border-slate-200 bg-white text-[12px] font-medium text-slate-800 cursor-pointer"
              >
                {[10, 20, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(1)}
                className="px-2 h-7 rounded border border-slate-200 text-[11px] font-medium disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                First
              </button>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 h-7 rounded border border-slate-200 text-[11px] font-medium disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Prev
              </button>
              <span className="px-2 text-[11px] font-medium">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 h-7 rounded border border-slate-200 text-[11px] font-medium disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2 h-7 rounded border border-slate-200 text-[11px] font-medium disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* DRAWERS & MODALS FOR TAB 2                                        */}
      {/* ================================================================= */}
      {activeDrawer === 'filters' && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/30">
          <div className="w-[380px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-slate-900">Filter Resource Allocations</h3>
              <button type="button" onClick={() => setActiveDrawer(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <FieldLabel label="Resource Type" tooltip="Filter by Vehicle, Driver, or other client resource class." />
                <select
                  value={filterResourceType}
                  onChange={(e) => setFilterResourceType(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px]"
                >
                  <option value="All">All Resource Types</option>
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel label="Allocation State" tooltip="Derived from validity timestamps and end history." />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px]"
                >
                  <option value="All">All States</option>
                  <option value="Active">Active</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Ended">Ended</option>
                  <option value="Conflict">Conflict</option>
                </select>
              </div>
              <div>
                <FieldLabel label="Validity Mode" tooltip="Filter Permanent vs Temporal resource allocations." />
                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px]"
                >
                  <option value="All">All Modes</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Temporal">Temporal</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel label="Effective From" tooltip="Start of effective date range." />
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-[12px]"
                  />
                </div>
                <div>
                  <FieldLabel label="Effective To" tooltip="End of effective date range." />
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-[12px]"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setFilterResourceType('All');
                  setFilterStatus('All');
                  setFilterMode('All');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="px-4 py-1.5 rounded-lg bg-[#F26522] text-white text-[12px] font-semibold hover:bg-[#dc5719] cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDrawer === 'saved-views' && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/30">
          <div className="w-[380px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-slate-900">Saved Views</h3>
              <button type="button" onClick={() => setActiveDrawer(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100 space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Save Current State</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  placeholder="View name..."
                  className="flex-1 h-8 px-3 rounded-lg border border-slate-200 text-[12px]"
                />
                <button
                  type="button"
                  onClick={handleSaveCurrentView}
                  className="px-3 h-8 rounded-lg bg-[#F26522] text-white text-[12px] font-semibold cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {resourceSavedViews.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-lg border border-slate-200 flex items-center justify-between hover:border-[#F26522]/40"
                >
                  <button
                    type="button"
                    onClick={() => handleApplyView(v)}
                    className="text-left flex-1 cursor-pointer"
                  >
                    <div className="text-[12px] font-bold text-slate-800">{v.name}</div>
                    <div className="text-[10px] text-slate-400">
                      Sort: {v.sortKey} ({v.sortDir}) · {v.density || 'comfortable'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavedViews((prev) => prev.filter((item) => item.id !== v.id))}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeDrawer === 'bulk' && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/30">
          <div className="w-[420px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-slate-900">
                Bulk Actions ({selectedRows.length} Selected)
              </h3>
              <button type="button" onClick={() => setActiveDrawer(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {(() => {
                const eligibleCount = selectedRows.filter((r) => r.computedStatus !== 'Ended').length;
                const alreadyEndedCount = selectedRows.filter((r) => r.computedStatus === 'Ended').length;
                return (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[12px] space-y-2.5">
                    <div className="font-semibold text-slate-800">Selected Allocations Confirmation</div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-white text-slate-700">
                        {selectedRows.length} Selected
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-rose-200 bg-rose-50 text-rose-700">
                        {eligibleCount} Eligible to End
                      </span>
                      {alreadyEndedCount > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-200 bg-amber-50 text-amber-800">
                          {alreadyEndedCount} Already Ended (Skipped)
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> History Preserved
                      </span>
                    </div>
                  </div>
                );
              })()}
              <div>
                <FieldLabel label="End Reason" tooltip="Audit reason recorded when ending selected resource allocations." />
                <input
                  type="text"
                  value={bulkEndReason}
                  onChange={(e) => setBulkEndReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px]"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setExportScope('selected');
                  handleRunExport();
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Export Selected
              </button>
              <button
                type="button"
                disabled={selectedRows.filter((r) => r.computedStatus !== 'Ended').length === 0}
                onClick={handleBulkEndAllocations}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-[12px] font-semibold disabled:opacity-40 hover:bg-rose-700 cursor-pointer"
              >
                End Selected Allocations
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDrawer === 'import' && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/30">
          <div className="w-[540px] max-w-full bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">Import Resource Allocations</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upload a CSV or JSON file to allocate resources directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <DirectBulkUploadView
                status={resourceUpload.status}
                progress={resourceUpload.progress}
                fileLabel={resourceUpload.fileLabel}
                fileMeta={resourceUpload.fileMeta}
                errorMessage={resourceUpload.errorMessage}
                doneSummary={resourceUpload.doneSummary}
                accept=".csv,.json,text/csv,application/json"
                dropTitle="Choose CSV / JSON or drag & drop"
                dropSubtitle="Columns: connectionId, resourceType, resourceIdentifier, mode, effectiveStartAt, effectiveEndAt"
                chooseButtonLabel="Choose file"
                downloadLabel="Download template"
                sampleLabel="Use sample CSV"
                templateTitle="Need a starting format?"
                templateSubtitle="Download CSV template or upload a sample resource allocation."
                doneButtonLabel="Done"
                onFileSelected={(file) => {
                  const lower = file.name.toLowerCase();
                  if (!lower.endsWith('.csv') && !lower.endsWith('.json')) {
                    resourceUpload.fail('Please upload a .csv or .json file.');
                    return;
                  }
                  const fmt: 'csv' | 'json' = lower.endsWith('.json') ? 'json' : 'csv';
                  const reader = new FileReader();
                  reader.onload = (ev) =>
                    processResourceUpload(fmt, String(ev.target?.result || ''), file.name, file.size);
                  reader.onerror = () => resourceUpload.fail('Unable to read the selected file.');
                  reader.readAsText(file);
                }}
                onDownloadTemplate={() => {
                  const defaultConnId = store.connections[0]?.id || 'CON-1277';
                  const csv =
                    `connectionId,resourceType,resourceIdentifier,mode,effectiveStartAt,effectiveEndAt\n` +
                    `${defaultConnId},Vehicle,GJ12CU9456,Permanent,2026-11-13T10:30:00+05:30,`;
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'fleetrobo_resource_allocations_template.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                onUseSample={() => {
                  const defaultConnId = store.connections[0]?.id || 'CON-1277';
                  const sampleCsv =
                    `connectionId,resourceType,resourceIdentifier,mode,effectiveStartAt,effectiveEndAt\n` +
                    `${defaultConnId},Vehicle,GJ12CU9456,Permanent,2026-11-13T10:30:00+05:30,`;
                  processResourceUpload('csv', sampleCsv, 'sample_resource_allocations.csv', sampleCsv.length);
                }}
                onReset={resourceUpload.reset}
                onDone={() => setActiveDrawer(null)}
              />
            </div>
          </div>
        </div>
      )}

      {activeDrawer === 'export' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/35">
          <div className="w-[420px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-slate-900">Export Resource Allocations</h3>
              <button type="button" onClick={() => setActiveDrawer(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-[12px]">
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="radio"
                  checked={exportScope === 'filtered'}
                  onChange={() => setExportScope('filtered')}
                  className="text-[#F26522]"
                />
                <span>Currently filtered dataset ({sortedRows.length} records)</span>
              </label>
              <label
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 ${
                  selectedRows.length === 0 ? 'opacity-50' : 'cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  disabled={selectedRows.length === 0}
                  checked={exportScope === 'selected'}
                  onChange={() => setExportScope('selected')}
                  className="text-[#F26522]"
                />
                <span>Selected rows only ({selectedRows.length} records)</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Includes explicit timezone labels and text-safe formatting for identifiers.
              </p>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setActiveDrawer(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleRunExport} className="px-4 py-1.5 rounded-lg bg-[#F26522] text-white text-[12px] font-semibold cursor-pointer">
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Resource Allocation Drawer */}
      {activeDrawer === 'form' && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/35">
          <form
            onSubmit={handleSaveAllocation}
            className="w-[540px] max-w-full bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-[16px] font-bold text-slate-900">
                  {editingAlloc ? `Edit Allocation · ${editingAlloc.id}` : 'Allocate Resource to Mapping'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Client-scoped allocation referencing existing Vehicle / Driver Masters
                </p>
              </div>
              <button type="button" onClick={() => setActiveDrawer(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[12px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {activeCompanyScope === 'All Clients' && !editingAlloc && (
                <div>
                  <FieldLabel label="Target Client" required tooltip="Select which client enterprise owns the connection and resource." />
                  <select
                    value={formClient}
                    onChange={(e) => {
                      const nextClient = e.target.value;
                      setFormClient(nextClient);
                      const first = store.connections.find(
                        (c) => c.companyName.toLowerCase() === nextClient.toLowerCase()
                      );
                      setFormConnectionId(first?.id || '');
                      setFormSelectedResourceId('');
                      setFormSelectedIdentifier('');
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px]"
                  >
                    {MODAL_OWNERS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <FieldLabel label="Connection" required tooltip={MODAL_FIELD_TOOLTIPS.mapping.connectionId} />
                <select
                  value={formConnectionId}
                  onChange={(e) => {
                    setFormConnectionId(e.target.value);
                    setFormHardwareId('ALL');
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px]"
                >
                  <option value="">Select Connection...</option>
                  {clientConnections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} · {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel label="Resource Type" required tooltip="Choose existing client Resource class (Vehicle, Driver, etc.)." />
                  <select
                    value={formResourceType}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__create_vehicle__') {
                        setFormResourceType('Vehicle');
                        setFormResourceLookup('');
                        setFormSelectedResourceId('');
                        setFormSelectedIdentifier('');
                        setFormSelectedDisplayName('');
                        setQuickCreateKind('Vehicle');
                        return;
                      }
                      if (val === '__create_driver__') {
                        setFormResourceType('Driver');
                        setFormResourceLookup('');
                        setFormSelectedResourceId('');
                        setFormSelectedIdentifier('');
                        setFormSelectedDisplayName('');
                        setQuickCreateKind('Driver');
                        return;
                      }
                      setFormResourceType(val as ResourceType);
                      setFormResourceLookup('');
                      setFormSelectedResourceId('');
                      setFormSelectedIdentifier('');
                      setFormSelectedDisplayName('');
                      setQuickCreateKind(null);
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px]"
                  >
                    {RESOURCE_TYPES.map((rt) => (
                      <option key={rt} value={rt}>
                        {rt}
                      </option>
                    ))}
                    <option value="__create_vehicle__">+ Create New Vehicle...</option>
                    <option value="__create_driver__">+ Create New Driver...</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Assigned Hardware Scope" tooltip={MODAL_FIELD_TOOLTIPS.mapping.allocationScope} />
                  <select
                    value={formHardwareId}
                    onChange={(e) => setFormHardwareId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px]"
                  >
                    <option value="ALL">All hardware in connection</option>
                    {(connectionsMap.get(formConnectionId)?.members || []).map((m) => (
                      <option key={m.hardwareId} value={m.hardwareId}>
                        {m.identifierValue} ({m.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resource Lookup (Vehicle by Registration No. / Driver by Contact No.) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel
                    label={
                      formResourceType === 'Vehicle'
                        ? 'Search Vehicle by Registration No.'
                        : formResourceType === 'Driver'
                        ? 'Search Driver by Contact No.'
                        : `${formResourceType} Identifier`
                    }
                    required
                    tooltip={
                      formResourceType === 'Vehicle'
                        ? MODAL_FIELD_TOOLTIPS.mapping.vehicleSearch
                        : MODAL_FIELD_TOOLTIPS.mapping.driverSearch
                    }
                  />
                  {(formResourceType === 'Vehicle' || formResourceType === 'Driver') && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickCreateKind(formResourceType as 'Vehicle' | 'Driver');
                        if (formResourceType === 'Vehicle') setQcVehicleReg(formResourceLookup.toUpperCase());
                        else setQcDriverPhone(formResourceLookup);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F26522] hover:underline cursor-pointer shrink-0"
                    >
                      <Plus className="w-3 h-3" /> New {formResourceType}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formResourceLookup}
                  onChange={(e) => {
                    setFormResourceLookup(e.target.value);
                    setFormSelectedResourceId('');
                    setFormSelectedIdentifier('');
                  }}
                  placeholder={
                    formResourceType === 'Vehicle'
                      ? 'e.g. MH26AH1192 or GJ12AB1234'
                      : formResourceType === 'Driver'
                      ? 'e.g. 9876543210'
                      : 'Enter resource code...'
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-[12px]"
                />

                {(formResourceType === 'Vehicle' || formResourceType === 'Driver') && (
                  <div className="max-h-44 overflow-y-auto space-y-1">
                    {resourceSearchMatches.length === 0 ? (
                      <div className="p-2.5 rounded-lg bg-white border border-dashed border-slate-300 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          No matching {formResourceType} in {formClient} master.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickCreateKind(formResourceType as 'Vehicle' | 'Driver');
                            if (formResourceType === 'Vehicle') setQcVehicleReg(formResourceLookup.toUpperCase());
                            else setQcDriverPhone(formResourceLookup);
                          }}
                          className="text-[#F26522] font-bold hover:underline cursor-pointer"
                        >
                          + Create {formResourceType}
                        </button>
                      </div>
                    ) : (
                      <>
                        {resourceSearchMatches.map((item) => {
                          const isChosen = formSelectedResourceId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setFormSelectedResourceId(item.id);
                                setFormSelectedIdentifier(item.identifier);
                                setFormSelectedDisplayName(item.displayName);
                                setFormResourceLookup(item.identifier);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg border text-[12px] flex items-center justify-between cursor-pointer ${
                                isChosen
                                  ? 'border-[#F26522] bg-[#FFF3EE]'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <div>
                                <div className="font-mono font-bold text-slate-900">{item.identifier}</div>
                                <div className="text-[11px] text-slate-500">{item.displayName} · {item.sub}</div>
                              </div>
                              {isChosen && <CheckCircle2 className="w-4 h-4 text-[#F26522]" />}
                            </button>
                          );
                        })}
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setQuickCreateKind(formResourceType as 'Vehicle' | 'Driver');
                              if (formResourceType === 'Vehicle') setQcVehicleReg(formResourceLookup.toUpperCase());
                              else setQcDriverPhone(formResourceLookup);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFF3EE] hover:bg-[#ffe5db] border border-[#F26522]/30 text-[#F26522] text-[11px] font-semibold cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Create New {formResourceType}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>

              {/* Mode, Timezone, Effective Start & End Date+Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel label="Allocation Mode" required tooltip={MODAL_FIELD_TOOLTIPS.mapping.bindingMode} />
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value as HardwareBindingMode)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px]"
                  >
                    <option value="Permanent">∞ Permanent (Open-ended)</option>
                    <option value="Temporal">◷ Temporal (Defined period)</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Timezone" required tooltip={MODAL_FIELD_TOOLTIPS.mapping.timezone} />
                  <select
                    value={formTimezone}
                    onChange={(e) => setFormTimezone(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px]"
                  >
                    {SUPPORTED_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel label="Effective Start" required tooltip={MODAL_FIELD_TOOLTIPS.mapping.allocationStart} />
                  <div className="flex gap-1.5">
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="flex-1 h-9 px-2 rounded-lg border border-slate-200 text-[12px]"
                    />
                    <input
                      type="time"
                      step="1"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-[105px] h-9 px-2 rounded-lg border border-slate-200 text-[12px]"
                    />
                  </div>
                </div>

                {formMode === 'Temporal' && (
                  <div>
                    <FieldLabel label="Effective End" required tooltip={MODAL_FIELD_TOOLTIPS.mapping.allocationEnd} />
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        className="flex-1 h-9 px-2 rounded-lg border border-slate-200 text-[12px]"
                      />
                      <input
                        type="time"
                        step="1"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-[105px] h-9 px-2 rounded-lg border border-slate-200 text-[12px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <FieldLabel label="Notes" tooltip={MODAL_FIELD_TOOLTIPS.mapping.bindingNotes} />
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional operational justification"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12px]"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#F26522] hover:bg-[#dc5719] text-white text-[12px] font-semibold cursor-pointer"
              >
                {editingAlloc ? 'Save Changes' : 'Save Allocation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* End Allocation Modal */}
      {activeDrawer === 'end-modal' && endingAlloc && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/40">
          <form
            onSubmit={handleConfirmEndAllocation}
            className="w-[440px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-slate-900">
                End Resource Allocation · {endingAlloc.id}
              </h3>
              <button type="button" onClick={() => setActiveDrawer(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-[12px]">
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-orange-200 bg-orange-50 text-[#B85324] font-mono">
                  {endingAlloc.id}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-sky-200 bg-sky-50 text-sky-700">
                  {endingAlloc.resourceType} · {endingAlloc.resourceIdentifier}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-purple-200 bg-purple-50 text-purple-700 font-mono">
                  {endingAlloc.connectionId}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" /> History Preserved
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                Ending <strong>{endingAlloc.resourceType}</strong>{' '}
                <span className="font-mono font-bold text-slate-900">{endingAlloc.resourceIdentifier}</span> on{' '}
                <span className="font-mono font-bold text-slate-900">{endingAlloc.connectionId}</span>. Historical records remain preserved.
              </div>
              <div>
                <FieldLabel label="Effective End Date & Time" required tooltip="Exact date and time when this allocation stops." />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    className="flex-1 h-9 px-2.5 rounded-lg border border-slate-200"
                    required
                  />
                  <input
                    type="time"
                    step="1"
                    value={endTimeInput}
                    onChange={(e) => setEndTimeInput(e.target.value)}
                    className="w-32 h-9 px-2.5 rounded-lg border border-slate-200"
                    required
                  />
                </div>
              </div>
              <div>
                <FieldLabel label="End Reason" required tooltip="Audit reason recorded on the allocation history." />
                <input
                  type="text"
                  value={endReasonInput}
                  onChange={(e) => setEndReasonInput(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  required
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-[12px] font-semibold hover:bg-rose-700 cursor-pointer"
              >
                Confirm End Allocation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View / History Right Drawer */}
      {activeDrawer === 'view' && inspectedAlloc && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/35">
          <div className="w-[580px] max-w-full bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-bold text-[#F26522]">{inspectedAlloc.id}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[15px] font-bold text-slate-900">
                    {inspectedAlloc.resourceType}: {inspectedAlloc.resourceIdentifier}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Connection {inspectedAlloc.connectionId} · {inspectedAlloc.companyName}
                </div>
              </div>
              <button type="button" onClick={() => setActiveDrawer(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 border-b border-slate-200 flex gap-5">
              <button
                type="button"
                onClick={() => setInspectorTab('details')}
                className={`py-2.5 text-[12px] font-semibold border-b-2 cursor-pointer ${
                  inspectorTab === 'details' ? 'border-[#F26522] text-[#F26522]' : 'border-transparent text-slate-500'
                }`}
              >
                Allocation Details
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('history')}
                className={`py-2.5 text-[12px] font-semibold border-b-2 cursor-pointer ${
                  inspectorTab === 'history' ? 'border-[#F26522] text-[#F26522]' : 'border-transparent text-slate-500'
                }`}
              >
                History ({historyForInspected.length})
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('relationships')}
                className={`py-2.5 text-[12px] font-semibold border-b-2 cursor-pointer inline-flex items-center gap-1.5 ${
                  inspectorTab === 'relationships' ? 'border-[#F26522] text-[#F26522]' : 'border-transparent text-slate-500'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                Relationships ({relationshipsForInspected.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {inspectorTab === 'details' ? (
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  {[
                    ['Allocation ID', inspectedAlloc.id],
                    ['Connection', `${inspectedAlloc.connectionId} · ${connectionsMap.get(inspectedAlloc.connectionId)?.name || ''}`],
                    ['Resource Type', inspectedAlloc.resourceType],
                    ['Identifier', inspectedAlloc.resourceIdentifier],
                    ['Display Name', inspectedAlloc.resourceDisplayName],
                    ['Validity Mode', inspectedAlloc.mode],
                    ['Effective Start', formatDateTimeWithTz(inspectedAlloc.effectiveStartAt, inspectedAlloc.timezone, true)],
                    ['Effective End', inspectedAlloc.endedAt || inspectedAlloc.effectiveEndAt ? formatDateTimeWithTz(inspectedAlloc.endedAt || inspectedAlloc.effectiveEndAt, inspectedAlloc.timezone, true) : 'Open-ended'],
                    ['Assigned By', inspectedAlloc.assignedBy],
                    ['Unassigned By', inspectedAlloc.unassignedBy || '—'],
                    ['End Reason', inspectedAlloc.endReason || '—']
                  ].map(([k, v]) => (
                    <div key={k} className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                      <div className="text-[10px] font-bold uppercase text-slate-400">{k}</div>
                      <div className="font-semibold text-slate-800 mt-0.5 break-words">{v}</div>
                    </div>
                  ))}
                </div>
              ) : inspectorTab === 'history' ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Resource</th>
                        <th className="px-3 py-2">Start</th>
                        <th className="px-3 py-2">End</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyForInspected.map((h, idx) => {
                        const st = computeResourceAllocationStatus(h, store.resourceAllocations).status;
                        return (
                          <tr key={`${h.id}-${idx}`}>
                            <td className="px-3 py-2 font-mono font-semibold">{h.id}</td>
                            <td className="px-3 py-2">
                              {h.resourceType} · {h.resourceIdentifier}
                            </td>
                            <td className="px-3 py-2 text-[11px]">
                              {formatDateTimeWithTz(h.effectiveStartAt, h.timezone)}
                            </td>
                            <td className="px-3 py-2 text-[11px]">
                              {h.endedAt || h.effectiveEndAt
                                ? formatDateTimeWithTz(h.endedAt || h.effectiveEndAt, h.timezone)
                                : '—'}
                            </td>
                            <td className="px-3 py-2">{renderStatusPill(st)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-3 text-[12px]">
                  <div className="text-[11px] text-slate-500">
                    Independent Resource-to-Resource links involving{' '}
                    <span className="font-semibold text-slate-800">
                      {inspectedAlloc.resourceType} · {inspectedAlloc.resourceIdentifier}
                    </span>
                    . Managed under Create / Edit Mapping → Step 3 → Resource → Resource.
                  </div>

                  {relationshipsForInspected.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center text-slate-500">
                      No Resource-to-Resource relationships recorded for this resource yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-[11.5px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2">ID / Source</th>
                            <th className="px-3 py-2">Relationship</th>
                            <th className="px-3 py-2">Target</th>
                            <th className="px-3 py-2">Validity</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(relationshipsForInspected).map((rel) => {
                            const st = computeResourceRelationshipStatus(rel, store.resourceRelationships || []).status;
                            return (
                              <tr key={rel.id} className="hover:bg-slate-50/60">
                                <td className="px-3 py-2.5">
                                  <div className="font-mono text-[10.5px] font-bold text-[#F26522]">{rel.id}</div>
                                  <div className="font-semibold text-slate-900">
                                    {rel.sourceResourceType} · {rel.sourceResourceIdentifier}
                                  </div>
                                  <div className="text-[10px] text-slate-500">{rel.sourceResourceDisplayName}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10.5px]">
                                    <ArrowRight className="w-3 h-3 text-[#F26522]" />
                                    {rel.relationshipType}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="font-semibold text-slate-900">
                                    {rel.targetResourceType} · {rel.targetResourceIdentifier}
                                  </div>
                                  <div className="text-[10px] text-slate-500">{rel.targetResourceDisplayName}</div>
                                </td>
                                <td className="px-3 py-2.5 text-[10.5px] text-slate-600">
                                  <div className="font-semibold text-slate-700">{rel.mode}</div>
                                  <div>{formatDateTimeWithTz(rel.effectiveStartAt, rel.timezone)}</div>
                                  {(rel.endedAt || rel.effectiveEndAt) && (
                                    <div className="text-slate-400">
                                      → {formatDateTimeWithTz(rel.endedAt || rel.effectiveEndAt, rel.timezone)}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold ${
                                      st === 'Active'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : st === 'Scheduled'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {st}
                                  </span>
                                  {rel.history.length > 0 && (
                                    <div className="text-[10px] text-slate-400 mt-1">
                                      {rel.history.length} audit event(s)
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {connDetailsState && (
        <ConnectionDetailsDrawer
          connection={
            store.connections.find((c) => c.id === connDetailsState.conn.id) || connDetailsState.conn
          }
          initialTab={connDetailsState.tab}
          allBindings={store.hardwareBindings}
          allAllocations={store.resourceAllocations}
          canEdit={canEdit}
          onClose={() => setConnDetailsState(null)}
          onEdit={() => {
            setConnDetailsState(null);
            showToast('Switch to Assets Connection tab to edit full connection hardware & bindings.');
          }}
          onEndBinding={handleEndBindingFromResourceTab}
          onExportRecord={(c) => {
            downloadModalCsv(
              `fleetrobo-${c.id}.csv`,
              [
                { key: 'id', label: 'Connection ID', minWidth: '' },
                { key: 'name', label: 'Connection Name', minWidth: '' },
                { key: 'status', label: 'Status', minWidth: '' }
              ],
              [{ id: c.id, name: c.name, status: c.status }]
            );
            showToast(`Exported ${c.id}.`);
          }}
        />
      )}

      {/* Full Vehicle / Driver Master Create Drawers (z-[110]) */}
      <VehicleDrawer
        isOpen={quickCreateKind === 'Vehicle'}
        onClose={() => setQuickCreateKind(null)}
        mode="create"
        initialVehicle={qcVehicleReg ? ({ registration_number: qcVehicleReg } as Vehicle) : null}
        onSaveVehicle={handleCreatedVehicle}
        existingVehicles={vehicles}
        companyContext={formClient}
        zIndexClass="z-[110]"
      />
      <DriverDrawer
        isOpen={quickCreateKind === 'Driver'}
        onClose={() => setQuickCreateKind(null)}
        mode="create"
        initialDriver={qcDriverPhone ? ({ phone: qcDriverPhone } as Driver) : null}
        onSaveDriver={handleCreatedDriver}
        existingDrivers={drivers}
        companyContext={formClient}
        zIndexClass="z-[110]"
      />
    </div>
  );
};
