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
  MoreVertical,
  X,
  Cpu,
  Radio,
  Smartphone,
  Link2,
  Truck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Power,
  History,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  User,
  Trash2,
  Building2,
  Store,
  MapPin,
  Wrench
} from 'lucide-react';
import {
  ModalMasterStore,
  ConnectionRecord,
  ConnectionLifecycleStatus,
  HardwareBinding,
  HardwareBindingStatus,
  SavedModalView,
  ALL_MODAL_CONNECTION_COLUMNS,
  MODAL_CONNECTION_DEFAULT_COLUMNS,
  MODAL_CONNECTION_SELECT_TOOLTIP,
  MODAL_CONNECTION_ACTIONS_TOOLTIP,
  COMPANY_NAME_TO_ID,
  MODAL_OWNERS,
  computeHardwareBindingStatus,
  computeResourceAllocationStatus,
  formatDateTimeWithTz,
  compareConnectionIds,
  downloadModalCsv,
  parseCsvLine,
  resolveHardwareIdentifierValue
} from '../types/modalMaster';
import { getEnabledModelsForCompanyName } from '../types/companyModelEnablement';
import {
  ConnectionDetailsDrawer,
  DetailsDrawerTab
} from './modal-mapping/ConnectionDetailsDrawer';
import {
  MappingInfoTooltip,
  ModalConnectionFiltersDrawer,
  ModalConnectionSavedViewsDrawer,
  ModalConnectionExportModal,
  ModalConnectionImportDrawer,
  ModalConnectionBulkDrawer
} from './modal-mapping/ModalConnectionOverlays';
import { MappingFormDrawer } from './modal-mapping/MappingFormDrawer';
import {
  ExpandableHardwareRows,
  HardwareCountChips
} from './modal-mapping/ExpandableHardwareRows';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';
import { RowActionMenu } from './common/RowActionMenu';
import { DeleteConfirmationModal } from './common/DeleteConfirmationModal';

interface ModalConnectionTabProps {
  store: ModalMasterStore;
  setStore: React.Dispatch<React.SetStateAction<ModalMasterStore>>;
  savedViews: SavedModalView[];
  setSavedViews: React.Dispatch<React.SetStateAction<SavedModalView[]>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  activeCompanyScope: string;
  isPlatformAdmin?: boolean;
  canEdit: boolean;
  actorName: string;
}

export const ModalConnectionTab: React.FC<ModalConnectionTabProps> = ({
  store,
  setStore,
  savedViews,
  setSavedViews,
  showToast,
  activeCompanyScope,
  isPlatformAdmin = false,
  canEdit,
  actorName
}) => {
  // Independent Tab 1 state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDeviceModelId, setFilterDeviceModelId] = useState('All');
  const [filterBindingMode, setFilterBindingMode] = useState('All');
  const [filterBindingState, setFilterBindingState] = useState('All');
  const [filterResourceAllocated, setFilterResourceAllocated] = useState('All');
  const [filterUpdatedFrom, setFilterUpdatedFrom] = useState('');
  const [filterUpdatedTo, setFilterUpdatedTo] = useState('');

  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hiddenCols, setHiddenCols] = useState<string[]>(() =>
    ALL_MODAL_CONNECTION_COLUMNS.filter((c) => c.optional).map((c) => c.key)
  );
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [activeOverlay, setActiveOverlay] = useState<
    null | 'filters' | 'saved-views' | 'bulk' | 'import' | 'export'
  >(null);
  const [newViewName, setNewViewName] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(['CON-1277']));

  // Drawers
  const [detailsState, setDetailsState] = useState<{
    conn: ConnectionRecord;
    tab: DetailsDrawerTab;
  } | null>(null);
  const [formState, setFormState] = useState<{
    mode: 'create' | 'edit';
    conn?: ConnectionRecord;
  } | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ConnectionRecord | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<ConnectionRecord | null>(null);

  const handleConfirmDeleteConnection = () => {
    if (!connectionToDelete) return;
    const idToDelete = connectionToDelete.id;
    setStore((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== idToDelete),
    }));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(idToDelete);
      return next;
    });
    showToast(`Connection "${connectionToDelete.name}" (${connectionToDelete.connectionId}) deleted successfully`);
    setConnectionToDelete(null);
  };

  // Import / Export state
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');
  const [importText, setImportText] = useState('');
  const [exportScope, setExportScope] = useState<'filtered' | 'selected'>('filtered');
  const [exportFormat, setExportFormat] = useState<'visible-csv' | 'relational-bundle'>('visible-csv');

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    filterStatus,
    filterCategory,
    filterDeviceModelId,
    filterBindingMode,
    filterBindingState,
    filterResourceAllocated,
    filterUpdatedFrom,
    filterUpdatedTo,
    activeCompanyScope
  ]);

  const enabledDeviceModels = useMemo(() => {
    const scopeName = activeCompanyScope === 'All Clients' ? 'Platform Admin' : activeCompanyScope;
    return getEnabledModelsForCompanyName(scopeName).filter((m) => m.category === 'Device');
  }, [activeCompanyScope]);

  // Index bindings & allocations by connectionId
  const bindingsByConn = useMemo(() => {
    const map = new Map<string, HardwareBinding[]>();
    store.hardwareBindings.forEach((b) => {
      const arr = map.get(b.connectionId) || [];
      arr.push(b);
      map.set(b.connectionId, arr);
    });
    return map;
  }, [store.hardwareBindings]);

  const allocationsByConn = useMemo(() => {
    const map = new Map<string, ModalMasterStore['resourceAllocations']>();
    store.resourceAllocations.forEach((a) => {
      const arr = map.get(a.connectionId) || [];
      arr.push(a);
      map.set(a.connectionId, arr);
    });
    return map;
  }, [store.resourceAllocations]);

  // Enrich each parent Connection record (strictly 1 row per Connection!)
  const enrichedConnections = useMemo(() => {
    const nowMs = Date.now();
    const targetClient =
      activeCompanyScope && activeCompanyScope !== 'All Clients'
        ? activeCompanyScope.trim().toLowerCase()
        : null;

    return store.connections
      .filter((c) => !targetClient || (c.companyName || '').trim().toLowerCase() === targetClient)
      .map((conn) => {
        const members = conn.members || [];
        const deviceCount = members.filter((m) => m.category === 'Device').length;
        const sensorCount = members.filter((m) => m.category === 'Sensor').length;
        const simCount = members.filter((m) => m.category === 'SIM').length;
        const cBindings = bindingsByConn.get(conn.id) || [];
        const cAllocs = allocationsByConn.get(conn.id) || [];

        const primaryUnit = members.find((m) => m.isPrimary) || members[0] || null;
        const bindingStatuses = cBindings.map((b) =>
          computeHardwareBindingStatus(b, store.hardwareBindings, members, nowMs)
        );
        const activeBindCount = bindingStatuses.filter((s) => s.status === 'Active').length;
        const schedBindCount = bindingStatuses.filter((s) => s.status === 'Scheduled').length;
        const endedBindCount = bindingStatuses.filter((s) => s.status === 'Ended' || s.status === 'Canceled').length;
        const conflictBindCount = bindingStatuses.filter((s) => s.status === 'Conflict').length;

        let bindingHealth = 'No bindings';
        if (cBindings.length > 0) {
          if (conflictBindCount > 0) bindingHealth = 'Conflict';
          else if (activeBindCount === cBindings.length) bindingHealth = 'All valid';
          else bindingHealth = 'Mixed';
        }

        const startTimes = cBindings
          .map((b) => Date.parse(b.effectiveStartAt))
          .filter((n) => !Number.isNaN(n));
        const earliestStart =
          startTimes.length > 0 ? new Date(Math.min(...startTimes)).toISOString() : null;

        const hasOpenEnded = cBindings.some((b) => b.mode === 'Permanent' && !b.endedAt);
        const endTimes = cBindings
          .map((b) => (b.endedAt || b.effectiveEndAt ? Date.parse((b.endedAt || b.effectiveEndAt)!) : NaN))
          .filter((n) => !Number.isNaN(n));
        const latestEnd =
          cBindings.length === 0
            ? '—'
            : hasOpenEnded
            ? 'Open-ended / Mixed'
            : endTimes.length > 0
            ? formatDateTimeWithTz(new Date(Math.max(...endTimes)).toISOString(), 'Asia/Kolkata')
            : 'Open-ended / Mixed';

        const activeAllocs = cAllocs.filter(
          (a) => computeResourceAllocationStatus(a, store.resourceAllocations, nowMs).status !== 'Ended'
        );
        const activeResources = Array.from(
          new Map(activeAllocs.map((a) => [`${a.resourceType}::${a.resourceId}`, a])).values()
        );
        const activeVehicles = activeResources.filter((a) => a.resourceType === 'Vehicle');
        const activeDrivers = activeResources.filter((a) => a.resourceType === 'Driver');
        const activeVehicle = activeVehicles[0];
        const activeDriver = activeDrivers[0];

        return {
          conn,
          id: conn.id,
          name: conn.name,
          deviceCount,
          sensorCount,
          simCount,
          bindingCount: cBindings.length,
          cBindings,
          bindingStatuses: bindingStatuses.map((s) => s.status),
          cAllocs,
          primaryUnit,
          activeResources,
          activeVehicle,
          activeDriver,
          extraResourceCount: Math.max(0, activeResources.length - 2),
          bindingHealth,
          bindingStatusCounts: `${activeBindCount} Active · ${schedBindCount} Sched · ${endedBindCount} Ended`,
          earliestStart: earliestStart ? formatDateTimeWithTz(earliestStart, 'Asia/Kolkata') : '—',
          latestEnd,
          hardwareIdentifiers: members.map((m) => m.identifierValue).join(', ') || '—'
        };
      });
  }, [store.connections, store.hardwareBindings, store.resourceAllocations, bindingsByConn, allocationsByConn, activeCompanyScope]);

  // Summary bar totals (computed, no architecture counts)
  const summaryStats = useMemo(() => {
    const withBindings = enrichedConnections.filter((r) => r.bindingCount > 0).length;
    const withResources = enrichedConnections.filter((r) => r.activeResources.length > 0).length;
    return {
      total: enrichedConnections.length,
      withBindings,
      withResources
    };
  }, [enrichedConnections]);

  // Filtering
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const fromMs = filterUpdatedFrom ? Date.parse(`${filterUpdatedFrom}T00:00:00`) : null;
    const toMs = filterUpdatedTo ? Date.parse(`${filterUpdatedTo}T23:59:59`) : null;

    return enrichedConnections.filter((row) => {
      const { conn } = row;
      if (filterStatus !== 'All' && conn.status !== filterStatus) return false;
      if (filterCategory !== 'All' && !conn.members.some((m) => m.category === filterCategory)) return false;
      if (
        filterDeviceModelId !== 'All' &&
        !conn.members.some((m) => m.category === 'Device' && m.modelTypeId === filterDeviceModelId)
      ) {
        return false;
      }

      if (filterBindingMode !== 'All') {
        if (filterBindingMode === 'None' && row.cBindings.length > 0) return false;
        if (filterBindingMode !== 'None' && !row.cBindings.some((b) => b.mode === filterBindingMode)) {
          return false;
        }
      }

      if (filterBindingState !== 'All') {
        if (filterBindingState === 'None' && row.cBindings.length > 0) return false;
        if (
          filterBindingState !== 'None' &&
          !row.bindingStatuses.includes(filterBindingState as HardwareBindingStatus)
        ) {
          return false;
        }
      }

      if (filterResourceAllocated !== 'All') {
        if (filterResourceAllocated === 'Vehicle' && !row.activeVehicle) return false;
        if (filterResourceAllocated === 'Driver' && !row.activeDriver) return false;
        if (filterResourceAllocated === 'Unallocated' && (row.activeVehicle || row.activeDriver)) return false;
      }

      if (fromMs && !Number.isNaN(fromMs) && Date.parse(conn.updatedAt) < fromMs) return false;
      if (toMs && !Number.isNaN(toMs) && Date.parse(conn.updatedAt) > toMs) return false;

      if (q) {
        const hay = [
          conn.id,
          conn.name,
          conn.companyName,
          conn.site || '',
          conn.description || '',
          ...conn.members.map((m) => `${m.identifierValue} ${m.modelLabel}`),
          ...row.cAllocs.map((a) => `${a.resourceIdentifier} ${a.resourceDisplayName}`)
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    enrichedConnections,
    searchQuery,
    filterStatus,
    filterCategory,
    filterDeviceModelId,
    filterBindingMode,
    filterBindingState,
    filterResourceAllocated,
    filterUpdatedFrom,
    filterUpdatedTo
  ]);

  // Sorting (identity-aware numeric sorting on CON-XXXX)
  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'companyName') {
        cmp = a.conn.companyName.localeCompare(b.conn.companyName);
      } else if (sortKey === 'id') {
        cmp = compareConnectionIds(a.id, b.id);
      } else if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === 'deviceCount' || sortKey === 'sensorCount' || sortKey === 'simCount' || sortKey === 'bindingCount') {
        cmp = a[sortKey] - b[sortKey];
      } else if (sortKey === 'status') {
        cmp = a.conn.status.localeCompare(b.conn.status);
      } else if (sortKey === 'updatedAt') {
        cmp = Date.parse(a.conn.updatedAt) - Date.parse(b.conn.updatedAt);
      } else {
        cmp = a.id.localeCompare(b.id);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const totalRecords = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const currentRows = sortedRows.slice(startIdx, startIdx + pageSize);

  const visibleColumns = useMemo(
    () => ALL_MODAL_CONNECTION_COLUMNS.filter((c) => !hiddenCols.includes(c.key)),
    [hiddenCols]
  );

  const activeFilterCount =
    (filterStatus !== 'All' ? 1 : 0) +
    (filterCategory !== 'All' ? 1 : 0) +
    (filterDeviceModelId !== 'All' ? 1 : 0) +
    (filterBindingMode !== 'All' ? 1 : 0) +
    (filterBindingState !== 'All' ? 1 : 0) +
    (filterResourceAllocated !== 'All' ? 1 : 0) +
    (filterUpdatedFrom ? 1 : 0) +
    (filterUpdatedTo ? 1 : 0);

  const allCurrentSelected =
    currentRows.length > 0 && currentRows.every((r) => selectedIds.has(r.id));

  const toggleSelectAllOnPage = () => {
    const next = new Set(selectedIds);
    if (allCurrentSelected) currentRows.forEach((r) => next.delete(r.id));
    else currentRows.forEach((r) => next.add(r.id));
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

  // Commit Create / Edit Mapping
  const handleQuickRegisterHardware = (unit: {
    device?: ModalMasterStore['devices'][number];
    sensor?: ModalMasterStore['sensors'][number];
    sim?: ModalMasterStore['sims'][number];
  }) => {
    setStore((prev) => ({
      ...prev,
      devices:
        unit.device && !prev.devices.some((d) => d.id === unit.device!.id)
          ? [unit.device, ...prev.devices]
          : prev.devices,
      sensors:
        unit.sensor && !prev.sensors.some((s) => s.id === unit.sensor!.id)
          ? [unit.sensor, ...prev.sensors]
          : prev.sensors,
      sims:
        unit.sim && !prev.sims.some((s) => s.id === unit.sim!.id)
          ? [unit.sim, ...prev.sims]
          : prev.sims
    }));
  };

  const handleCommitMapping = (payload: {
    connection: ConnectionRecord;
    bindings: HardwareBinding[];
    allocations: ModalMasterStore['resourceAllocations'];
    addedDevices: ModalMasterStore['devices'];
    addedSensors: ModalMasterStore['sensors'];
    addedSims: ModalMasterStore['sims'];
    isEdit: boolean;
  }) => {
    setStore((prev) => {
      const otherConnections = prev.connections.filter((c) => c.id !== payload.connection.id);
      const otherBindings = prev.hardwareBindings.filter((b) => b.connectionId !== payload.connection.id);
      const otherAllocs = prev.resourceAllocations.filter((a) => a.connectionId !== payload.connection.id);
      const preservedEndedAllocs = prev.resourceAllocations.filter(
        (a) => a.connectionId === payload.connection.id && !!a.endedAt
      );
      const existingDevIds = new Set(prev.devices.map((d) => d.id));
      const existingSenIds = new Set(prev.sensors.map((s) => s.id));
      const existingSimIds = new Set(prev.sims.map((s) => s.id));

      return {
        ...prev,
        devices: [...payload.addedDevices.filter((d) => !existingDevIds.has(d.id)), ...prev.devices],
        sensors: [...payload.addedSensors.filter((s) => !existingSenIds.has(s.id)), ...prev.sensors],
        sims: [...payload.addedSims.filter((s) => !existingSimIds.has(s.id)), ...prev.sims],
        connections: payload.isEdit
          ? prev.connections.map((c) => (c.id === payload.connection.id ? payload.connection : c))
          : [payload.connection, ...otherConnections],
        hardwareBindings: [...payload.bindings, ...otherBindings],
        resourceAllocations: [...payload.allocations, ...preservedEndedAllocs, ...otherAllocs]
      };
    });
    if (!payload.isEdit) {
      setSortKey('');
      setCurrentPage(1);
    }
    setExpandedIds((prev) => new Set([...prev, payload.connection.id]));
    setFormState(null);
    showToast(
      payload.isEdit
        ? `Updated mapping ${payload.connection.id} (${payload.connection.status}).`
        : `Created mapping ${payload.connection.id} (${payload.connection.status}).`
    );
  };

  // Duplicate as Draft (without claiming active hardware silently)
  const handleDuplicateAsDraft = (conn: ConnectionRecord) => {
    const nums = store.connections
      .map((c) => Number(c.id.replace(/\D/g, '')))
      .filter((n) => !Number.isNaN(n));
    const newId = `CON-${(nums.length > 0 ? Math.max(...nums) : 1282) + 1}`;
    const nowIso = new Date().toISOString();
    const cloned: ConnectionRecord = {
      ...conn,
      id: newId,
      connectionId: newId,
      name: `${conn.name} (Draft Copy)`,
      memberIds: [],
      members: [],
      status: 'Draft',
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: actorName,
      updatedBy: actorName,
      activity: [
        {
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          actor: actorName,
          action: `Duplicated as Draft from ${conn.id}`,
          afterSummary: 'Hardware membership cleared for fresh assignment & binding validation'
        }
      ]
    };
    setStore((prev) => ({
      ...prev,
      connections: [cloned, ...prev.connections]
    }));
    setSortKey('');
    setCurrentPage(1);
    showToast(`Duplicated ${conn.id} as Draft ${newId} (select fresh hardware units to bind).`);
  };

  // Deactivate / Activate connection
  const handleConfirmDeactivate = (conn: ConnectionRecord) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.id === conn.id
          ? {
              ...c,
              status: 'Inactive',
              updatedAt: nowIso,
              updatedBy: actorName,
              version: c.version + 1,
              activity: [
                {
                  id: `act-${Date.now()}`,
                  timestamp: nowIso,
                  actor: actorName,
                  action: 'Deactivated connection',
                  beforeSummary: c.status,
                  afterSummary: 'Inactive; active pairwise bindings ended with history preserved'
                },
                ...(c.activity || [])
              ]
            }
          : c
      ),
      hardwareBindings: prev.hardwareBindings.map((b) =>
        b.connectionId === conn.id && !b.endedAt
          ? {
              ...b,
              endedAt: nowIso,
              effectiveEndAt: nowIso,
              endReason: 'Parent connection deactivated',
              updatedAt: nowIso
            }
          : b
      )
    }));
    setDeactivateTarget(null);
    showToast(`Connection ${conn.id} deactivated and active bindings ended.`);
  };

  const handleEndSingleBindingFromDrawer = (binding: HardwareBinding) => {
    const nowIso = new Date().toISOString();
    setStore((prev) => ({
      ...prev,
      hardwareBindings: prev.hardwareBindings.map((b) =>
        b.id === binding.id
          ? {
              ...b,
              endedAt: nowIso,
              effectiveEndAt: nowIso,
              endReason: 'Ended from table action',
              updatedAt: nowIso
            }
          : b
      )
    }));
    showToast(`Binding ${binding.id} ended; history preserved.`);
  };

  const handleSaveSingleBinding = (updated: HardwareBinding) => {
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

  // Export handler (supports Filtered vs Selected AND Visible Columns CSV vs 4-Sheet Relational Export)
  const runExportConnections = (singleConn?: ConnectionRecord) => {
    const selectedRows = enrichedConnections.filter((r) => selectedIds.has(r.id));
    const source = singleConn
      ? enrichedConnections.filter((r) => r.id === singleConn.id)
      : exportScope === 'selected' && selectedRows.length > 0
      ? selectedRows
      : sortedRows;

    const tag = activeCompanyScope.toLowerCase().replace(/\s+/g, '-');

    if (exportFormat === 'relational-bundle' && !singleConn) {
      downloadModalCsv(
        `fleetrobo-connections-${tag}.csv`,
        [
          { key: 'id', label: 'Connection ID', minWidth: '' },
          { key: 'name', label: 'Connection Name', minWidth: '' },
          { key: 'companyName', label: 'Client', minWidth: '' },
          { key: 'site', label: 'Site', minWidth: '' },
          { key: 'status', label: 'Status', minWidth: '' },
          { key: 'updatedAt', label: 'Updated On (IST)', minWidth: '' }
        ],
        source.map((r) => ({
          id: r.id,
          name: r.name,
          companyName: r.conn.companyName,
          site: r.conn.site || '',
          status: r.conn.status,
          updatedAt: formatDateTimeWithTz(r.conn.updatedAt, 'Asia/Kolkata', true)
        }))
      );

      downloadModalCsv(
        `fleetrobo-hardware-membership-${tag}.csv`,
        [
          { key: 'connectionId', label: 'Connection ID', minWidth: '' },
          { key: 'category', label: 'Category', minWidth: '' },
          { key: 'modelLabel', label: 'Model', minWidth: '' },
          { key: 'identifierType', label: 'Identifier Type', minWidth: '' },
          { key: 'identifierValue', label: 'Identifier (Text)', minWidth: '' },
          { key: 'registrationStatus', label: 'Registry Status', minWidth: '' }
        ],
        source.flatMap((r) =>
          r.conn.members.map((m) => ({
            connectionId: r.id,
            category: m.category,
            modelLabel: m.modelLabel,
            identifierType: m.identifierType,
            identifierValue: `'${m.identifierValue}`,
            registrationStatus: m.registrationStatus
          }))
        )
      );

      downloadModalCsv(
        `fleetrobo-hardware-bindings-${tag}.csv`,
        [
          { key: 'id', label: 'Binding ID', minWidth: '' },
          { key: 'connectionId', label: 'Connection ID', minWidth: '' },
          { key: 'fromHardwareId', label: 'From Hardware ID', minWidth: '' },
          { key: 'toHardwareId', label: 'To Hardware ID', minWidth: '' },
          { key: 'mode', label: 'Binding Mode', minWidth: '' },
          { key: 'effectiveStartAt', label: 'Effective Start', minWidth: '' },
          { key: 'effectiveEndAt', label: 'Effective End', minWidth: '' },
          { key: 'timezone', label: 'Timezone', minWidth: '' }
        ],
        source.flatMap((r) =>
          r.cBindings.map((b) => ({
            id: b.id,
            connectionId: b.connectionId,
            fromHardwareId: b.fromHardwareId,
            toHardwareId: b.toHardwareId,
            mode: b.mode,
            effectiveStartAt: formatDateTimeWithTz(b.effectiveStartAt, b.timezone, true),
            effectiveEndAt:
              b.endedAt || b.effectiveEndAt
                ? formatDateTimeWithTz(b.endedAt || b.effectiveEndAt, b.timezone, true)
                : 'Open-ended',
            timezone: b.timezone
          }))
        )
      );

      downloadModalCsv(
        `fleetrobo-resource-allocations-${tag}.csv`,
        [
          { key: 'id', label: 'Allocation ID', minWidth: '' },
          { key: 'connectionId', label: 'Connection ID', minWidth: '' },
          { key: 'resourceType', label: 'Resource Type', minWidth: '' },
          { key: 'resourceIdentifier', label: 'Resource Identifier', minWidth: '' },
          { key: 'effectiveStartAt', label: 'Effective Start', minWidth: '' },
          { key: 'effectiveEndAt', label: 'Effective End', minWidth: '' }
        ],
        source.flatMap((r) =>
          r.cAllocs.map((a) => ({
            id: a.id,
            connectionId: a.connectionId,
            resourceType: a.resourceType,
            resourceIdentifier: a.resourceIdentifier,
            effectiveStartAt: formatDateTimeWithTz(a.effectiveStartAt, a.timezone, true),
            effectiveEndAt:
              a.endedAt || a.effectiveEndAt
                ? formatDateTimeWithTz(a.endedAt || a.effectiveEndAt, a.timezone, true)
                : 'Open-ended'
          }))
        )
      );
      showToast(`Exported 4 relational CSV datasets for ${source.length} connection(s).`);
    } else {
      const cols = visibleColumns.length > 0 ? visibleColumns : MODAL_CONNECTION_DEFAULT_COLUMNS;
      downloadModalCsv(
        singleConn ? `fleetrobo-${singleConn.id}.csv` : `fleetrobo-modal-connections-${tag}.csv`,
        cols,
        source.map((r) => ({
          companyName: r.conn.companyName,
          id: r.id,
          name: r.name,
          connectedHardware: r.conn.members.map((m) => `${m.identifierValue} (${m.category})`).join('; '),
          deviceCount: r.deviceCount,
          sensorCount: r.sensorCount,
          simCount: r.simCount,
          bindingCount: r.bindingCount,
          resourceAllocation: [r.activeVehicle?.resourceIdentifier, r.activeDriver?.resourceIdentifier]
            .filter(Boolean)
            .join(' · ') || 'Not allocated',
          status: r.conn.status,
          updatedAt: formatDateTimeWithTz(r.conn.updatedAt, 'Asia/Kolkata', true),
          primaryDevice: r.primaryUnit?.identifierValue || '—',
          primaryModel: r.primaryUnit?.modelLabel || '—',
          hardwareIdentifiers: r.hardwareIdentifiers,
          bindingHealth: r.bindingHealth,
          bindingStatusCounts: r.bindingStatusCounts,
          effectiveFromEarliest: r.earliestStart,
          effectiveToLatest: r.latestEnd,
          site: r.conn.site || '—',
          createdBy: r.conn.createdBy,
          createdAt: formatDateTimeWithTz(r.conn.createdAt, 'Asia/Kolkata', true),
          updatedBy: r.conn.updatedBy,
          notes: r.conn.description || '—',
          hardwareVerification: r.conn.verification || 'Not checked'
        }))
      );
      showToast(`Exported ${source.length} connection row(s) with explicit timezone.`);
    }
    setActiveOverlay(null);
  };

  // Direct Import parser helper
  const parseConnectionImportPayload = (fmt: 'csv' | 'json', rawText: string) => {
    const raw = rawText.trim();
    if (!raw) {
      return {
        valid: [] as ConnectionRecord[],
        invalid: [] as { line: number; raw: string; reason: string }[]
      };
    }
    const valid: ConnectionRecord[] = [];
    const invalid: { line: number; raw: string; reason: string }[] = [];
    const nowIso = new Date().toISOString();
    const nums = store.connections
      .map((c) => Number(c.id.replace(/\D/g, '')))
      .filter((n) => !Number.isNaN(n));
    let nextNum = (nums.length > 0 ? Math.max(...nums) : 1282) + 1;

    const validateItem = (
      line: number,
      rawLine: string,
      name: string,
      client: string,
      hwIdent: string,
      statusRaw: string,
      siteName: string
    ) => {
      if (!name) {
        invalid.push({ line, raw: rawLine, reason: 'Missing Connection Name' });
        return;
      }
      if (!MODAL_OWNERS.some((o) => o.toLowerCase() === client.toLowerCase())) {
        invalid.push({ line, raw: rawLine, reason: `Unknown client "${client}"` });
        return;
      }
      const matchedOwner = MODAL_OWNERS.find((o) => o.toLowerCase() === client.toLowerCase())!;
      const dev = store.devices.find(
        (d) =>
          d.company.toLowerCase() === matchedOwner.toLowerCase() &&
          (d.imei === hwIdent || d.deviceId === hwIdent || d.serial === hwIdent)
      );
      const sen = store.sensors.find(
        (s) =>
          s.company.toLowerCase() === matchedOwner.toLowerCase() &&
          (s.deviceId === hwIdent || s.serial === hwIdent)
      );
      const sim = store.sims.find(
        (s) => s.owner.toLowerCase() === matchedOwner.toLowerCase() && s.iccid === hwIdent
      );
      if (!dev && !sen && !sim) {
        invalid.push({
          line,
          raw: rawLine,
          reason: `Hardware identifier "${hwIdent}" not registered under ${matchedOwner}`
        });
        return;
      }
      const id = `CON-${nextNum++}`;
      const member = dev
        ? {
            hardwareId: dev.id,
            category: 'Device' as const,
            modelTypeId: dev.modelTypeId || 'mcat-01',
            modelLabel: `${dev.kind} · ${dev.manufacturer} · ${dev.modelText}`,
            identifierType: dev.identifierType || 'IMEI',
            identifierValue: resolveHardwareIdentifierValue(dev, 'Device', dev.identifierType),
            registrationStatus: dev.hardwareLifecycle,
            isPrimary: true
          }
        : sen
        ? {
            hardwareId: sen.id,
            category: 'Sensor' as const,
            modelTypeId: sen.modelTypeId || 'mcat-07',
            modelLabel: `${sen.kind} · ${sen.manufacturer} · ${sen.modelText}`,
            identifierType: 'Sensor ID',
            identifierValue: sen.deviceId,
            registrationStatus: sen.hardwareLifecycle,
            isPrimary: true
          }
        : {
            hardwareId: sim!.id,
            category: 'SIM' as const,
            modelTypeId: sim!.modelTypeId || 'mcat-10',
            modelLabel: `${sim!.category || 'M2M SIM'} · ${sim!.operator}`,
            identifierType: sim!.identifierType || 'ICCID',
            identifierValue: sim!.iccid,
            registrationStatus: sim!.status,
            isPrimary: true
          };

      const status: ConnectionLifecycleStatus =
        statusRaw === 'Active' && member.category !== 'SIM' ? 'Active' : 'Draft';

      valid.push({
        id,
        connectionId: id,
        companyId: COMPANY_NAME_TO_ID[matchedOwner] || 'comp-adani-mundra',
        companyName: matchedOwner,
        name,
        description: 'Imported via Modal Mapping CSV/JSON',
        site: siteName || 'Mundra CT2',
        memberIds: [member.hardwareId],
        members: [member],
        status,
        verification: 'Not checked',
        version: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: actorName,
        updatedBy: actorName,
        activity: [
          {
            id: `act-${Date.now()}-${line}`,
            timestamp: nowIso,
            actor: actorName,
            action: 'Imported connection record',
            afterSummary: `${member.identifierValue} (${status})`
          }
        ]
      });
    };

    if (fmt === 'json') {
      try {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        arr.forEach((it, idx) =>
          validateItem(
            idx + 1,
            JSON.stringify(it),
            String(it.name || '').trim(),
            String(it.client || '').trim(),
            String(it.hardwareIdentifier || '').trim(),
            String(it.status || 'Draft').trim(),
            String(it.site || '').trim()
          )
        );
      } catch {
        invalid.push({ line: 1, raw, reason: 'Invalid JSON syntax' });
      }
    } else {
      raw
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0)
        .forEach((line, idx) => {
          const cols = parseCsvLine(line);
          if (idx === 0 && cols[0]?.toLowerCase() === 'name') return;
          validateItem(idx + 1, line, cols[0] || '', cols[1] || '', cols[2] || '', cols[3] || 'Draft', cols[4] || '');
        });
    }

    return { valid, invalid };
  };

  // Bulk handlers
  const selectedConnections = useMemo(
    () => enrichedConnections.filter((r) => selectedIds.has(r.id)),
    [enrichedConnections, selectedIds]
  );

  const handleBulkEndBindings = () => {
    const nowIso = new Date().toISOString();
    const connIds = new Set(selectedConnections.map((r) => r.id));
    setStore((prev) => ({
      ...prev,
      hardwareBindings: prev.hardwareBindings.map((b) =>
        connIds.has(b.connectionId) && !b.endedAt
          ? {
              ...b,
              endedAt: nowIso,
              effectiveEndAt: nowIso,
              endReason: 'Bulk end binding',
              updatedAt: nowIso
            }
          : b
      )
    }));
    showToast(`Ended active/scheduled bindings across ${connIds.size} selected connection(s).`);
    setSelectedIds(new Set());
    setActiveOverlay(null);
  };

  const handleBulkDeactivate = () => {
    const nowIso = new Date().toISOString();
    const connIds = new Set(selectedConnections.map((r) => r.id));
    setStore((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        connIds.has(c.id) ? { ...c, status: 'Inactive', updatedAt: nowIso, updatedBy: actorName } : c
      ),
      hardwareBindings: prev.hardwareBindings.map((b) =>
        connIds.has(b.connectionId) && !b.endedAt
          ? {
              ...b,
              endedAt: nowIso,
              effectiveEndAt: nowIso,
              endReason: 'Bulk deactivation',
              updatedAt: nowIso
            }
          : b
      )
    }));
    showToast(`Deactivated ${connIds.size} connection(s) and ended their active bindings.`);
    setSelectedIds(new Set());
    setActiveOverlay(null);
  };

  const statusChip = (status: ConnectionLifecycleStatus) => {
    const map: Record<ConnectionLifecycleStatus, string> = {
      Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Draft: 'bg-slate-100 text-slate-700 border-slate-200',
      Scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
      Inactive: 'bg-zinc-100 text-zinc-600 border-zinc-200',
      'Needs Attention': 'bg-amber-50 text-amber-800 border-amber-200'
    };
    const dot: Record<ConnectionLifecycleStatus, string> = {
      Active: 'bg-emerald-500',
      Draft: 'bg-slate-400',
      Scheduled: 'bg-sky-500',
      Inactive: 'bg-zinc-400',
      'Needs Attention': 'bg-amber-500'
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${map[status]}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot[status]}`} />
        {status}
      </span>
    );
  };

  const rowPad = density === 'compact' ? 'py-1.5' : 'py-2.5';
  const connSavedViews = savedViews.filter((v) => v.pageId === 'connections');

  return (
    <div className="flex-1 min-h-0 flex flex-col px-5 py-3.5 overflow-hidden bg-[#F8FAFC]">
      {/* Compact Enterprise Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 mb-2.5 flex items-center justify-between gap-2 flex-wrap shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-[340px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resources, IMEI, Sensor ID, ICCID, organization..."
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
            onClick={() => setActiveOverlay('filters')}
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-medium cursor-pointer ${
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
            columns={ALL_MODAL_CONNECTION_COLUMNS.map((c) => ({
              key: c.key,
              label: c.label,
              required: c.key === 'resourceAllocation',
              category: c.optional ? 'OPTIONAL COLUMNS' : 'DEFAULT COLUMNS',
            }))}
            visibleKeys={ALL_MODAL_CONNECTION_COLUMNS.filter((c) => !hiddenCols.includes(c.key)).map((c) => c.key)}
            onChangeVisibleKeys={(nextKeys) =>
              setHiddenCols(ALL_MODAL_CONNECTION_COLUMNS.filter((c) => !nextKeys.includes(c.key)).map((c) => c.key))
            }
            defaultKeys={MODAL_CONNECTION_DEFAULT_COLUMNS.map((c) => c.key)}
            roleDefaultKeys={MODAL_CONNECTION_DEFAULT_COLUMNS.map((c) => c.key)}
            defaultPinnedKeys={['companyName', 'resourceAllocation']}
            onToast={(msg) => showToast(msg, 'success')}
          />

          <button
            type="button"
            onClick={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Rows className="w-3.5 h-3.5" />
            <span>{density === 'compact' ? 'Compact' : 'Comfortable'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveOverlay('saved-views')}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved views</span>
          </button>

          <button
            type="button"
            onClick={() => showToast('Refreshed local Assets Connection dataset.')}
            title="Refresh local dataset"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => setActiveOverlay('bulk')}
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-medium ${
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
              onClick={() => setActiveOverlay('import')}
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
              setActiveOverlay('export');
            }}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => setFormState({ mode: 'create' })}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#F26522] hover:bg-[#d95417] text-white text-[12px] font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Mapping</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary & Expand Controls Bar */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 px-0.5 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleExpandAllOnPage}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
          >
            <ChevronsUpDown className="w-3 h-3 text-[#F26522]" />
            {allOnPageExpanded ? 'Collapse Page Rows' : 'Expand Page Rows'}
          </button>
          <span>
            <strong className="text-slate-700">{selectedIds.size}</strong> selected
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus('All');
                setFilterCategory('All');
                setFilterDeviceModelId('All');
                setFilterBindingMode('All');
                setFilterBindingState('All');
                setFilterResourceAllocated('All');
                setFilterUpdatedFrom('');
                setFilterUpdatedTo('');
              }}
              className="text-[#F26522] font-semibold hover:underline cursor-pointer"
            >
              Clear {activeFilterCount} filter(s)
            </button>
          )}
        </div>
        <div className="text-slate-600">
          <span className="font-semibold text-slate-800">{summaryStats.total}</span> connections ·{' '}
          <span className="font-semibold text-slate-800">{summaryStats.withBindings}</span> with hardware bindings ·{' '}
          <span className="font-semibold text-slate-800">{summaryStats.withResources}</span> with resources{' '}
          <span className="text-slate-400">(Click &gt; to expand hardware connections)</span>
        </div>
      </div>

      {/* Main Scrollable Table */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-20 bg-[#F8FAFC] border-b border-slate-200">
              <tr className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="sticky left-0 z-30 bg-[#F8FAFC] px-2 py-2.5 w-9 text-center border-r border-slate-100">
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
                <th className="sticky left-9 z-30 bg-[#F8FAFC] px-2.5 py-2.5 w-10 border-r border-slate-100">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={allCurrentSelected}
                      onChange={toggleSelectAllOnPage}
                      className="accent-[#F26522] cursor-pointer"
                    />
                    <MappingInfoTooltip text={MODAL_CONNECTION_SELECT_TOOLTIP} align="left" />
                  </div>
                </th>
                {visibleColumns.map((col, idx) => {
                  const sortable = [
                    'companyName',
                    'deviceCount',
                    'sensorCount',
                    'simCount',
                    'bindingCount',
                    'status',
                    'updatedAt'
                  ].includes(col.key);
                  return (
                    <th
                      key={col.key}
                      style={{ minWidth: col.minWidth }}
                      onClick={() => sortable && handleSort(col.key)}
                      className={`px-3 py-2.5 whitespace-nowrap select-none ${
                        sortable ? 'cursor-pointer hover:text-slate-800' : ''
                      }`}
                    >
                      <div className="inline-flex items-center gap-1">
                        <span>{col.label}</span>
                        {sortable && (
                          <span className="text-slate-400">
                            {sortKey === col.key ? (
                              sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#F26522]" /> : <ArrowDown className="w-3 h-3 text-[#F26522]" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-50" />
                            )}
                          </span>
                        )}
                        {col.tooltip && (
                          <MappingInfoTooltip
                            text={col.tooltip}
                            align={idx < 2 ? 'left' : idx > visibleColumns.length - 3 ? 'right' : 'center'}
                          />
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="sticky right-0 z-30 bg-[#F8FAFC] px-3 py-2.5 text-right border-l border-slate-200 w-[78px]">
                  <div className="inline-flex items-center justify-end">
                    <span>ACTIONS</span>
                    <MappingInfoTooltip text={MODAL_CONNECTION_ACTIONS_TOOLTIP} align="right" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 3} className="px-6 py-12 text-center">
                    <div className="text-[13px] font-semibold text-slate-700">No connections match the current filters.</div>
                    <p className="text-[11px] text-slate-400 mt-1">Try adjusting your search query or clearing active filters.</p>
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => {
                  const { conn } = row;
                  const isSelected = selectedIds.has(row.id);
                  const extraDev = Math.max(0, row.deviceCount - (row.primaryUnit?.category === 'Device' ? 1 : 0));
                  const extraSen = Math.max(0, row.sensorCount - (row.primaryUnit?.category === 'Sensor' ? 1 : 0));
                  const extraSim = Math.max(0, row.simCount - (row.primaryUnit?.category === 'SIM' ? 1 : 0));
                  const summaryParts = [
                    extraDev > 0 ? `+${extraDev} Device${extraDev > 1 ? 's' : ''}` : '',
                    extraSen > 0 ? `+${extraSen} Sensor${extraSen > 1 ? 's' : ''}` : '',
                    extraSim > 0 ? `+${extraSim} SIM${extraSim > 1 ? 's' : ''}` : ''
                  ].filter(Boolean);

                  const isExpanded = expandedIds.has(row.id);
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        className={`group transition-colors ${
                          isExpanded
                            ? 'bg-[#FFF9F6]'
                            : isSelected
                            ? 'bg-[#FFF3EE]/45'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td
                          className={`sticky left-0 z-10 px-2 text-center border-r border-slate-100 ${
                            isExpanded ? 'bg-[#FFF9F6]' : 'bg-white group-hover:bg-slate-50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleExpandRow(row.id)}
                            title={isExpanded ? 'Collapse hardware bindings' : 'Expand hardware bindings'}
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
                          className={`sticky left-9 z-10 px-2.5 border-r border-slate-100 ${
                            isExpanded ? 'bg-[#FFF9F6]' : 'bg-white group-hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(row.id)}
                            className="accent-[#F26522] cursor-pointer"
                          />
                        </td>

                        {visibleColumns.map((col) => {
                          if (col.key === 'companyName') {
                            return (
                              <td key={col.key} className={`px-3 ${rowPad} whitespace-nowrap`}>
                                <span className="inline-flex items-center gap-1.5 font-medium text-[#17212b]">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{conn.companyName || '—'}</span>
                                </span>
                              </td>
                            );
                          }
                          if (col.key === 'id') {
                            return (
                              <td
                                key={col.key}
                                className={`px-3 ${rowPad} font-mono font-bold text-[#17212b] whitespace-nowrap`}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleExpandRow(row.id)}
                                  className="hover:text-[#F26522] hover:underline cursor-pointer"
                                >
                                  {conn.id}
                                </button>
                              </td>
                            );
                          }
                          if (col.key === 'name') {
                            return (
                              <td key={col.key} className={`px-3 ${rowPad}`}>
                                <button
                                  type="button"
                                  onClick={() => setDetailsState({ conn, tab: 'overview' })}
                                  className="text-left font-semibold text-slate-900 hover:text-[#F26522] cursor-pointer block leading-snug"
                                >
                                  {conn.name}
                                </button>
                                <div className="text-[10.5px] text-slate-400 truncate max-w-[205px]">
                                  {conn.companyName} {conn.site ? `· ${conn.site}` : ''}
                                </div>
                              </td>
                            );
                          }
                          if (col.key === 'connectedHardware') {
                            return (
                              <td key={col.key} className={`px-3 ${rowPad}`}>
                                <div className="space-y-1">
                                  <HardwareCountChips
                                    members={conn.members}
                                    onClick={() => toggleExpandRow(row.id)}
                                  />
                                  {row.primaryUnit && (
                                    <div className="font-mono text-[10.5px] text-slate-500 truncate max-w-[235px]">
                                      {row.primaryUnit.identifierValue}
                                      {summaryParts.length > 0 ? ` · ${summaryParts.join(' · ')}` : ''}
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          }
                        if (col.key === 'deviceCount') {
                          return (
                            <td key={col.key} className={`px-3 ${rowPad}`}>
                              <button
                                type="button"
                                onClick={() => setDetailsState({ conn, tab: 'hardware' })}
                                className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-[#F26522] cursor-pointer"
                              >
                                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                                {row.deviceCount}
                              </button>
                            </td>
                          );
                        }
                        if (col.key === 'sensorCount') {
                          return (
                            <td key={col.key} className={`px-3 ${rowPad}`}>
                              <button
                                type="button"
                                onClick={() => setDetailsState({ conn, tab: 'hardware' })}
                                className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-[#F26522] cursor-pointer"
                              >
                                <Radio className="w-3.5 h-3.5 text-purple-500" />
                                {row.sensorCount}
                              </button>
                            </td>
                          );
                        }
                        if (col.key === 'simCount') {
                          return (
                            <td key={col.key} className={`px-3 ${rowPad}`}>
                              <button
                                type="button"
                                onClick={() => setDetailsState({ conn, tab: 'hardware' })}
                                className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-[#F26522] cursor-pointer"
                              >
                                <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                                {row.simCount}
                              </button>
                            </td>
                          );
                        }
                        if (col.key === 'bindingCount') {
                          return (
                            <td key={col.key} className={`px-3 ${rowPad}`}>
                              <button
                                type="button"
                                onClick={() => setDetailsState({ conn, tab: 'bindings' })}
                                className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:text-[#F26522] cursor-pointer"
                              >
                                <Link2 className="w-3.5 h-3.5 text-[#F26522]" />
                                {row.bindingCount}
                              </button>
                            </td>
                          );
                        }
                        if (col.key === 'resourceAllocation') {
                          const renderResIcon = (rt: string) => {
                            if (rt === 'Vehicle') return <Truck className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
                            if (rt === 'Driver') return <User className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
                            if (rt === 'Fleet') return <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
                            if (rt === 'Vendor') return <Store className="w-3.5 h-3.5 text-orange-600 shrink-0" />;
                            if (rt === 'Place') return <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
                            return <Wrench className="w-3.5 h-3.5 text-violet-600 shrink-0" />;
                          };
                          return (
                            <td key={col.key} className={`px-3 ${rowPad}`}>
                              {row.activeResources.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setDetailsState({ conn, tab: 'resources' })}
                                  className="text-left cursor-pointer hover:text-[#F26522] space-y-0.5"
                                >
                                  <div className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                                    {renderResIcon(row.activeResources[0].resourceType)}
                                    <span>{row.activeResources[0].resourceIdentifier}</span>
                                    <span className="text-[10px] font-medium text-slate-400">
                                      ({row.activeResources[0].resourceType})
                                    </span>
                                    {row.extraResourceCount > 0 && (
                                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]">
                                        +{row.extraResourceCount}
                                      </span>
                                    )}
                                  </div>
                                  {row.activeResources[1] && (
                                    <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5">
                                      {renderResIcon(row.activeResources[1].resourceType)}
                                      <span>{row.activeResources[1].resourceIdentifier}</span>
                                      <span className="text-[10px] text-slate-400">
                                        ({row.activeResources[1].resourceType})
                                      </span>
                                    </div>
                                  )}
                                </button>
                              ) : (
                                <span className="text-slate-400">Not allocated</span>
                              )}
                            </td>
                          );
                        }
                        if (col.key === 'status') {
                          return <td key={col.key} className={`px-3 ${rowPad}`}>{statusChip(conn.status)}</td>;
                        }
                        if (col.key === 'updatedAt') {
                          return (
                            <td key={col.key} className={`px-3 ${rowPad} text-[11px] text-slate-600 whitespace-nowrap`}>
                              {formatDateTimeWithTz(conn.updatedAt, 'Asia/Kolkata')}
                            </td>
                          );
                        }
                        if (col.key === 'primaryDevice') {
                          return <td key={col.key} className={`px-3 ${rowPad} font-mono text-[11px]`}>{row.primaryUnit?.identifierValue || '—'}</td>;
                        }
                        if (col.key === 'primaryModel') {
                          return <td key={col.key} className={`px-3 ${rowPad} text-[11px]`}>{row.primaryUnit?.modelLabel || '—'}</td>;
                        }
                        if (col.key === 'hardwareIdentifiers') {
                          return <td key={col.key} className={`px-3 ${rowPad} font-mono text-[11px] max-w-[220px] truncate`}>{row.hardwareIdentifiers}</td>;
                        }
                        if (col.key === 'bindingHealth') {
                          return <td key={col.key} className={`px-3 ${rowPad} text-[11px] font-semibold`}>{row.bindingHealth}</td>;
                        }
                        if (col.key === 'bindingStatusCounts') {
                          return <td key={col.key} className={`px-3 ${rowPad} text-[11px]`}>{row.bindingStatusCounts}</td>;
                        }
                        if (col.key === 'effectiveFromEarliest') {
                          return <td key={col.key} className={`px-3 ${rowPad} text-[11px] whitespace-nowrap`}>{row.earliestStart}</td>;
                        }
                        if (col.key === 'effectiveToLatest') {
                          return <td key={col.key} className={`px-3 ${rowPad} text-[11px] whitespace-nowrap`}>{row.latestEnd}</td>;
                        }
                        if (col.key === 'site') {
                          return <td key={col.key} className={`px-3 ${rowPad} text-[11px]`}>{conn.site || '—'}</td>;
                        }
                        if (col.key === 'createdBy') {
                          return <td key={col.key} className={`px-3 ${rowPad} text-[11px]`}>{conn.createdBy}</td>;
                        }
                        if (col.key === 'createdAt') {
                          return <td key={col.key} className={`px-3 ${rowPad} text-[11px] whitespace-nowrap`}>{formatDateTimeWithTz(conn.createdAt, 'Asia/Kolkata')}</td>;
                        }
                        if (col.key === 'updatedBy') {
                          return <td key={col.key} className={`px-3 ${rowPad} text-[11px]`}>{conn.updatedBy}</td>;
                        }
                        if (col.key === 'notes') {
                          return <td key={col.key} className={`px-3 ${rowPad} text-[11px] max-w-[190px] truncate`}>{conn.description || '—'}</td>;
                        }
                        return <td key={col.key} className={`px-3 ${rowPad} text-[11px]`}>{conn.verification || 'Not checked'}</td>;
                      })}

                      {/* Sticky Right Actions */}
                      <td
                        className={`sticky right-0 z-10 px-3 border-l border-slate-200 text-right whitespace-nowrap ${
                          isExpanded ? 'bg-[#FFF9F6]' : 'bg-white group-hover:bg-slate-50'
                        }`}
                      >
                        <div className="inline-flex items-center justify-end">
                          <RowActionMenu
                            ariaLabel={`Actions for ${conn.id}`}
                            items={[
                              {
                                id: 'view',
                                label: 'View Details',
                                icon: <Eye className="w-3.5 h-3.5 text-slate-400" />,
                                onClick: () => setDetailsState({ conn, tab: 'overview' }),
                              },
                              {
                                id: 'edit',
                                label: 'Edit Mapping',
                                icon: <Edit2 className="w-3.5 h-3.5 text-slate-400" />,
                                hidden: !canEdit,
                                onClick: () => setFormState({ mode: 'edit', conn }),
                              },
                              {
                                id: 'history',
                                label: 'View Activity & History',
                                icon: <History className="w-3.5 h-3.5 text-slate-400" />,
                                onClick: () => setDetailsState({ conn, tab: 'activity' }),
                              },
                              {
                                id: 'duplicate',
                                label: 'Duplicate as Draft',
                                icon: <Copy className="w-3.5 h-3.5 text-slate-400" />,
                                hidden: !canEdit,
                                dividerBefore: true,
                                onClick: () => handleDuplicateAsDraft(conn),
                              },
                              {
                                id: 'export',
                                label: 'Export This Record',
                                icon: <Download className="w-3.5 h-3.5 text-slate-400" />,
                                onClick: () => runExportConnections(conn),
                              },
                              {
                                id: 'deactivate',
                                label: 'Deactivate Connection',
                                icon: <Power className="w-3.5 h-3.5" />,
                                tone: 'warning',
                                hidden: !canEdit || conn.status === 'Inactive',
                                onClick: () => setDeactivateTarget(conn),
                              },
                              {
                                id: 'delete',
                                label: 'Delete Connection',
                                icon: <Trash2 className="w-3.5 h-3.5" />,
                                tone: 'danger',
                                hidden: !canEdit,
                                dividerBefore: true,
                                onClick: () => setConnectionToDelete(conn),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={visibleColumns.length + 3} className="p-0">
                          <ExpandableHardwareRows
                            variant="connection"
                            connection={conn}
                            connectionBindings={row.cBindings}
                            allGlobalBindings={store.hardwareBindings}
                            canEdit={canEdit}
                            onOpenDetails={(targetConn, tab) =>
                              setDetailsState({ conn: targetConn, tab })
                            }
                            onSaveBinding={handleSaveSingleBinding}
                            onEndBinding={handleEndSingleBindingFromDrawer}
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
            <strong className="text-slate-900">
              {totalRecords === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, totalRecords)}
            </strong>{' '}
            of <strong className="text-slate-900">{totalRecords}</strong> records
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-7 px-2 rounded border border-slate-200 bg-white text-[12px] font-medium"
              >
                {[10, 20, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(1)}
                className="px-2 h-7 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                First
              </button>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 h-7 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Prev
              </button>
              <span className="px-2 font-medium text-slate-700">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 h-7 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2 h-7 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlays & Drawers */}
      {activeOverlay === 'filters' && (
        <ModalConnectionFiltersDrawer
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterDeviceModelId={filterDeviceModelId}
          setFilterDeviceModelId={setFilterDeviceModelId}
          filterBindingMode={filterBindingMode}
          setFilterBindingMode={setFilterBindingMode}
          filterBindingState={filterBindingState}
          setFilterBindingState={setFilterBindingState}
          filterResourceAllocated={filterResourceAllocated}
          setFilterResourceAllocated={setFilterResourceAllocated}
          filterUpdatedFrom={filterUpdatedFrom}
          setFilterUpdatedFrom={setFilterUpdatedFrom}
          filterUpdatedTo={filterUpdatedTo}
          setFilterUpdatedTo={setFilterUpdatedTo}
          enabledDeviceModels={enabledDeviceModels}
          onClearAll={() => {
            setFilterStatus('All');
            setFilterCategory('All');
            setFilterDeviceModelId('All');
            setFilterBindingMode('All');
            setFilterBindingState('All');
            setFilterResourceAllocated('All');
            setFilterUpdatedFrom('');
            setFilterUpdatedTo('');
          }}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'saved-views' && (
        <ModalConnectionSavedViewsDrawer
          views={connSavedViews}
          newViewName={newViewName}
          setNewViewName={setNewViewName}
          onSaveView={() => {
            const view: SavedModalView = {
              id: `sv-con-${Date.now()}`,
              pageId: 'connections',
              companyScope: activeCompanyScope,
              name: newViewName.trim(),
              query: searchQuery,
              filters: {
                status: filterStatus,
                category: filterCategory,
                bindingMode: filterBindingMode,
                bindingState: filterBindingState,
                resourceAllocated: filterResourceAllocated
              },
              sortKey,
              sortDir,
              hiddenCols,
              density
            };
            setSavedViews((prev) => [...prev, view]);
            setNewViewName('');
            showToast(`Saved view "${view.name}".`);
          }}
          onApplyView={(v) => {
            setSearchQuery(v.query || '');
            setFilterStatus(v.filters.status || 'All');
            setFilterCategory(v.filters.category || 'All');
            setFilterBindingMode(v.filters.bindingMode || 'All');
            setFilterBindingState(v.filters.bindingState || 'All');
            setFilterResourceAllocated(v.filters.resourceAllocated || 'All');
            setSortKey(v.sortKey || 'id');
            setSortDir(v.sortDir || 'asc');
            if (v.hiddenCols?.length) setHiddenCols(v.hiddenCols);
            if (v.density) setDensity(v.density);
            setActiveOverlay(null);
            showToast(`Applied saved view "${v.name}".`);
          }}
          onDeleteView={(id) => setSavedViews((prev) => prev.filter((x) => x.id !== id))}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'export' && (
        <ModalConnectionExportModal
          selectedCount={selectedIds.size}
          filteredCount={sortedRows.length}
          exportScope={exportScope}
          setExportScope={setExportScope}
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          onExport={() => runExportConnections()}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'import' && (
        <ModalConnectionImportDrawer
          onProcessUpload={(fmt, rawContent) => {
            const parsed = parseConnectionImportPayload(fmt, rawContent);
            if (parsed.valid.length === 0) {
              return {
                uploaded: 0,
                skipped: parsed.invalid.length,
                error:
                  parsed.invalid[0]?.reason ||
                  'No valid connection rows found in the uploaded file.'
              };
            }
            setStore((prev) => ({
              ...prev,
              connections: [...parsed.valid, ...prev.connections]
            }));
            setSortKey('');
            setCurrentPage(1);
            showToast(
              `Imported ${parsed.valid.length} connection(s) (${parsed.invalid.length} skipped).`
            );
            return {
              uploaded: parsed.valid.length,
              skipped: parsed.invalid.length
            };
          }}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'bulk' && (
        <ModalConnectionBulkDrawer
          selectedCount={selectedConnections.length}
          activeSelectedCount={
            selectedConnections.filter((r) => r.conn.status === 'Active' || r.conn.status === 'Scheduled').length
          }
          activeBindingsInSelection={selectedConnections.reduce(
            (acc, r) => acc + r.bindingStatuses.filter((s) => s === 'Active' || s === 'Scheduled').length,
            0
          )}
          onExportSelected={() => {
            setExportScope('selected');
            setActiveOverlay('export');
          }}
          onDeactivateSelected={handleBulkDeactivate}
          onEndSelectedBindings={handleBulkEndBindings}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {detailsState && (
        <ConnectionDetailsDrawer
          connection={
            store.connections.find((c) => c.id === detailsState.conn.id) || detailsState.conn
          }
          initialTab={detailsState.tab}
          allBindings={store.hardwareBindings}
          allAllocations={store.resourceAllocations}
          canEdit={canEdit}
          onClose={() => setDetailsState(null)}
          onEdit={(c) => {
            setDetailsState(null);
            setFormState({ mode: 'edit', conn: c });
          }}
          onEndBinding={handleEndSingleBindingFromDrawer}
          onExportRecord={(c) => runExportConnections(c)}
        />
      )}

      {formState && (
        <MappingFormDrawer
          mode={formState.mode}
          initialConnection={formState.conn}
          store={store}
          activeCompanyScope={activeCompanyScope}
          isPlatformAdmin={isPlatformAdmin}
          actorName={actorName}
          onClose={() => setFormState(null)}
          onQuickRegisterHardware={handleQuickRegisterHardware}
          onCommit={handleCommitMapping}
          showToast={showToast}
        />
      )}

      {/* Deactivate Confirmation Modal with Confirmation Chips */}
      {deactivateTarget && (() => {
        const activeBindingsCount = store.hardwareBindings.filter(
          (b) => b.connectionId === deactivateTarget.id && !b.endedAt
        ).length;
        return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-[14px]">
                  <AlertTriangle className="w-4 h-4" /> Deactivate {deactivateTarget.connectionId || deactivateTarget.id}?
                </div>
                <button type="button" onClick={() => setDeactivateTarget(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 text-[12px] text-slate-600 space-y-3.5">
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-orange-200 bg-orange-50 text-[#B85324]">
                    {deactivateTarget.connectionId || deactivateTarget.id}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-sky-200 bg-sky-50 text-sky-700">
                    {deactivateTarget.companyName}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-200 bg-amber-50 text-amber-800">
                    {activeBindingsCount} Binding(s) to End
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                    Audit History Preserved
                  </span>
                </div>
                <p>
                  Deactivating <strong className="text-slate-900">{deactivateTarget.name}</strong> will set the connection status to{' '}
                  <strong>Inactive</strong> and end its{' '}
                  <strong>{activeBindingsCount}</strong>{' '}
                  active/scheduled pairwise binding(s) as of now while preserving full historical audit records.
                </p>
              </div>
              <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
                <button type="button" onClick={() => setDeactivateTarget(null)} className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDeactivate(deactivateTarget)}
                  className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold cursor-pointer"
                >
                  Confirm Deactivate
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Connection Confirmation Modal with Confirmation Chips */}
      {(() => {
        if (!connectionToDelete) return null;
        const activeBindingsCount = store.hardwareBindings.filter(
          (b) => b.connectionId === connectionToDelete.id && !b.endedAt
        ).length;
        const activeAllocsCount = store.resourceAllocations.filter(
          (a) => a.connectionId === connectionToDelete.id && !a.endedAt
        ).length;
        return (
          <DeleteConfirmationModal
            isOpen={Boolean(connectionToDelete)}
            zIndexClass="z-[95]"
            title="Delete Connection Mapping?"
            description={
              <>
                Are you sure you want to delete connection{' '}
                <strong className="text-slate-900 font-semibold">{connectionToDelete.name}</strong> (
                {connectionToDelete.connectionId})? This will permanently remove the hardware-vehicle
                mapping relationship.
              </>
            }
            confirmLabel="Delete Connection"
            targetChips={[
              {
                id: 'conId',
                label: connectionToDelete.connectionId || connectionToDelete.id,
                tone: 'orange',
              },
              { id: 'org', label: connectionToDelete.companyName, tone: 'blue' },
              {
                id: 'hw',
                label: `${connectionToDelete.members?.length || 0} Hardware Unit(s)`,
                tone: 'purple',
              },
              {
                id: 'status',
                label: connectionToDelete.status,
                tone: connectionToDelete.status === 'Active' ? 'emerald' : 'slate',
              },
            ]}
            confirmationChips={[
              activeBindingsCount > 0
                ? {
                    id: 'bindings',
                    label: `${activeBindingsCount} Open Hardware Binding(s)`,
                    tone: 'amber',
                  }
                : {
                    id: 'bindings',
                    label: '0 Open Bindings',
                    tone: 'emerald',
                  },
              activeAllocsCount > 0
                ? {
                    id: 'allocs',
                    label: `${activeAllocsCount} Active Resource Allocation(s)`,
                    tone: 'amber',
                  }
                : {
                    id: 'allocs',
                    label: '0 Active Allocations · Safe to Delete',
                    tone: 'emerald',
                  },
              {
                id: 'scope',
                label: 'Permanent Connection Delete',
                tone: 'rose',
              },
            ]}
            warningNote={
              activeBindingsCount > 0 || activeAllocsCount > 0 ? (
                <>
                  This connection still has open bindings or resource allocations. Recommended:{' '}
                  <strong>Deactivate Instead</strong> to preserve audit history cleanly.
                </>
              ) : undefined
            }
            secondaryAction={
              connectionToDelete.status === 'Active'
                ? {
                    label: 'Deactivate Instead',
                    tone: 'amber',
                    onClick: () => {
                      const target = connectionToDelete;
                      setConnectionToDelete(null);
                      setDeactivateTarget(target);
                    },
                  }
                : undefined
            }
            onCancel={() => setConnectionToDelete(null)}
            onConfirm={handleConfirmDeleteConnection}
          />
        );
      })()}
    </div>
  );
};
