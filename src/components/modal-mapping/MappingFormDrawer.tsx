/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Truck,
  User,
  Trash2,
  Edit2,
  AlertTriangle,
  Infinity as InfinityIcon,
  Clock,
  Package,
  Link2,
  Store,
  MapPin,
  Wrench,
  Layers,
  Cpu,
  Radio,
  Smartphone,
  Plus
} from 'lucide-react';
import {
  ModalMasterStore,
  ConnectionRecord,
  ConnectionLifecycleStatus,
  HardwareMembership,
  HardwareBinding,
  HardwareBindingMode,
  HardwareCategory,
  ResourceAllocation,
  ResourceRelationship,
  ResourceType,
  DeviceRecord,
  SensorRecord,
  SimRecord,
  MODAL_OWNERS,
  MODAL_LOCATIONS,
  SUPPORTED_TIMEZONES,
  computeHardwareBindingStatus,
  computeResourceAllocationStatus,
  validateHardwareBindingPair,
  validateResourceRelationship,
  loadResourceRelationshipRules,
  getNextResourceAllocationId,
  getNextResourceRelationshipId,
  deriveDeviceStatus,
  deriveSensorStatus,
  formatDateTimeWithTz,
  formatLocalInputParts,
  buildIsoWithTimezone
} from '../../types/modalMaster';
import {
  getEnabledModelsForCompanyName,
  getAvailableClientCompanies,
  resolveClientCompanyByNameOrId
} from '../../types/companyModelEnablement';
import { loadModelCategoryStore } from '../../types/modelCategoryMaster';
import { Vehicle, loadVehicleMasterStore, saveVehicleMasterStore } from '../../types/vehicle';
import { Driver, loadDriverMasterStore, saveDriverMasterStore } from '../../types/driver';
import { Fleet, INITIAL_DEMO_FLEETS } from '../../types/fleet';
import {
  VendorRecord,
  PlaceRecord,
  VendorTypeKey,
  VendorCountry,
  VENDOR_COUNTRIES,
  VENDOR_TYPE_CATALOG,
  INITIAL_DEMO_PLACES,
  VENDOR_MASTER_STORAGE_KEY,
  loadCanonicalVendors
} from '../../data/vendorsSeed';
import { MappingInfoTooltip } from './ModalConnectionOverlays';
import { HardwareUnitIcon } from './ExpandableHardwareRows';
import {
  HardwareCompositionModal,
  BindingDefaults,
  HardwareCompositionSaveResult
} from './HardwareCompositionModal';
import { MasterResourceItem } from './ResourceRelationshipsPanel';
import {
  ResourceSelectionModal,
  ResourceBadgeIcon,
  ExistingMappingNodeRef,
  ResourceSelectionResult
} from './ResourceSelectionModal';
import { VehicleDrawer } from '../VehicleDrawer';
import { DriverDrawer } from '../DriverDrawer';
import { FleetDrawer } from '../FleetDrawer';

interface MappingFormDrawerProps {
  mode: 'create' | 'edit';
  initialConnection?: ConnectionRecord | null;
  store: ModalMasterStore;
  activeCompanyScope: string;
  isPlatformAdmin?: boolean;
  actorName: string;
  onClose: () => void;
  onQuickRegisterHardware?: (unit: {
    device?: DeviceRecord;
    sensor?: SensorRecord;
    sim?: SimRecord;
  }) => void;
  onCommit: (payload: {
    connection: ConnectionRecord;
    bindings: HardwareBinding[];
    allocations: ResourceAllocation[];
    resourceRelationships?: ResourceRelationship[];
    addedDevices: DeviceRecord[];
    addedSensors: SensorRecord[];
    addedSims: SimRecord[];
    isEdit: boolean;
  }) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface MappingResourceNode {
  nodeId: string; // `res::${resourceType}::${resourceId}`
  resourceType: ResourceType;
  resourceId: string;
  identifier: string;
  displayName: string;
  subtitle: string;
  mode: HardwareBindingMode;
  effectiveStartAt: string;
  effectiveEndAt: string | null;
  timezone: string;
}

interface ExplicitNodeBinding {
  id: string;
  fromNodeId: string;
  relationship: string;
  toNodeId: string;
  mode: HardwareBindingMode;
  effectiveStartAt: string;
  effectiveEndAt: string | null;
  timezone: string;
}

interface UnifiedTreeRow {
  rowKey: string;
  rowNumber: string;
  depth: number;
  isLastSibling: boolean;
  ancestorHasNext: boolean[];
  kind: 'resource' | 'hardware';
  nodeId: string;
  nodeType: ResourceType | HardwareCategory;
  identifier: string;
  title: string;
  subtitle: string;
  relationshipLabel: string;
  mode: HardwareBindingMode;
  effectiveStartAt: string;
  effectiveEndAt: string | null;
  timezone: string;
  resourceNode?: MappingResourceNode;
  hardwareMember?: HardwareMembership;
  hardwareBinding?: HardwareBinding;
  explicitBinding?: ExplicitNodeBinding;
}

const DEFAULT_EQUIPMENT_MASTER: {
  id: string;
  code: string;
  name: string;
  category: string;
  site: string;
  status: string;
}[] = [
  { id: 'eqp-101', code: 'EQP-RS45', name: 'Kalmar Reach Stacker RS-45', category: 'Container Handler', site: 'Mundra CT2', status: 'Active' },
  { id: 'eqp-102', code: 'EQP-RTG09', name: 'Liebherr RTG Crane #09', category: 'Yard Crane', site: 'Mundra South Basin', status: 'Active' },
  { id: 'eqp-103', code: 'EQP-RG204', name: 'Thermo King Reefer Genset RG-204', category: 'Power Pack', site: 'Mundra CT2', status: 'Active' },
  { id: 'eqp-104', code: 'EQP-FL18', name: 'Godrej Heavy Forklift FL-18', category: 'Warehouse Forklift', site: 'Pune Hub', status: 'Available' },
  { id: 'eqp-105', code: 'EQP-WB02', name: 'Mettler Weighbridge Terminal WB-02', category: 'Weighbridge', site: 'Hazira Terminal', status: 'Active' },
  { id: 'eqp-106', code: 'EQP-DS07', name: 'Hydraulic Dock Seal & Lock DS-07', category: 'Dock Equipment', site: 'Chennai CFS', status: 'Active' }
];

function loadMasterPlaces(): PlaceRecord[] {
  try {
    const raw = localStorage.getItem(VENDOR_MASTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.places) && parsed.places.length > 0) {
        return parsed.places as PlaceRecord[];
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_DEMO_PLACES;
}

function makeResNodeId(resourceType: ResourceType, resourceId: string): string {
  return `res::${resourceType}::${resourceId}`;
}

function makeHwNodeId(hardwareId: string): string {
  return `hw::${hardwareId}`;
}

function nodeTypePillClass(type: ResourceType | HardwareCategory): string {
  switch (type) {
    case 'Vehicle':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Driver':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Fleet':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Vendor':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Place':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Equipment':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'Device':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Sensor':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'SIM':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

export const MappingFormDrawer: React.FC<MappingFormDrawerProps> = ({
  mode,
  initialConnection,
  store,
  activeCompanyScope,
  isPlatformAdmin = false,
  actorName,
  onClose,
  onQuickRegisterHardware,
  onCommit,
  showToast
}) => {
  const isEdit = mode === 'edit' && !!initialConnection;
  const availableOrganizations = useMemo(() => getAvailableClientCompanies(), []);
  const defaultClient =
    initialConnection?.companyName ||
    (activeCompanyScope === 'All Clients'
      ? availableOrganizations[0] || ''
      : activeCompanyScope);

  const [targetClient, setTargetClient] = useState<string>(defaultClient);
  const [connId] = useState(() => {
    if (initialConnection?.id) return initialConnection.id;
    const nums = store.connections
      .map((c) => Number(c.id.replace(/\D/g, '')))
      .filter((n) => !Number.isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1286;
    return `CON-${nextNum}`;
  });
  const [site] = useState(initialConnection?.site || '');

  const liveVersion = isEdit
    ? store.connections.find((c) => c.id === initialConnection!.id)?.version || initialConnection!.version
    : 1;
  const hasVersionConflict = isEdit && liveVersion !== initialConnection!.version;

  // Live Master Pools for all 6 resource types + Hardware
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadVehicleMasterStore());
  const [drivers, setDrivers] = useState<Driver[]>(() => loadDriverMasterStore());
  const [fleets, setFleets] = useState<Fleet[]>(() => INITIAL_DEMO_FLEETS);
  const [vendors, setVendors] = useState<VendorRecord[]>(() => loadCanonicalVendors());
  const [places, setPlaces] = useState<PlaceRecord[]>(() => loadMasterPlaces());
  const [equipments, setEquipments] = useState(() => DEFAULT_EQUIPMENT_MASTER);

  const [localDevices, setLocalDevices] = useState<DeviceRecord[]>(store.devices);
  const [localSensors, setLocalSensors] = useState<SensorRecord[]>(store.sensors);
  const [localSims, setLocalSims] = useState<SimRecord[]>(store.sims);
  const [modelAccessTick, setModelAccessTick] = useState(0);

  useEffect(() => {
    const onModels = () => setModelAccessTick((t) => t + 1);
    const onResources = () => {
      setVehicles(loadVehicleMasterStore());
      setDrivers(loadDriverMasterStore());
      setVendors(loadCanonicalVendors());
      setPlaces(loadMasterPlaces());
    };
    window.addEventListener('fleetrobo:model-access-updated', onModels);
    window.addEventListener('fleetrobo:resources-updated', onResources);
    window.addEventListener('fleetrobo:vendors-updated', onResources);
    return () => {
      window.removeEventListener('fleetrobo:model-access-updated', onModels);
      window.removeEventListener('fleetrobo:resources-updated', onResources);
      window.removeEventListener('fleetrobo:vendors-updated', onResources);
    };
  }, []);

  const enabledModels = useMemo(() => {
    void modelAccessTick;
    return getEnabledModelsForCompanyName(targetClient);
  }, [targetClient, modelAccessTick]);

  // Unified Master Catalog keyed by ResourceType (strictly scoped to targetClient; no Adani fallback)
  const masterCatalogByType = useMemo<Record<ResourceType, MasterResourceItem[]>>(() => {
    const normClient = targetClient.trim().toLowerCase();
    const matchesClientStrict = (comp?: string) => {
      const c = (comp || '').trim().toLowerCase();
      return Boolean(normClient && c && c === normClient);
    };
    const matchesClientOrShared = (comp?: string) => {
      const c = (comp || '').trim().toLowerCase();
      if (!c) return true;
      return Boolean(normClient && c === normClient);
    };

    const vehicleItems: MasterResourceItem[] = vehicles
      .filter((v) => matchesClientStrict(v.company || v.client))
      .map((v) => ({
        id: v.id,
        resourceType: 'Vehicle' as const,
        identifier: v.registration_number,
        displayName: `${v.machine_model || v.model || v.make || 'Vehicle'} · ${v.registration_number}`,
        company: v.company || v.client || '',
        subtitle: `${v.public_id} · ${v.transporter || 'No Transporter'} · ${v.status}`,
        status: v.status,
        details: {
          'Registration No.': v.registration_number,
          Model: v.machine_model || v.model || v.make || '—',
          Company: v.company || v.client || '—',
          Transporter: v.transporter || '—',
          Status: v.status
        }
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    const driverItems: MasterResourceItem[] = drivers
      .filter((d) => matchesClientStrict(d.company))
      .map((d) => {
        const phone = d.phone.startsWith('+') ? d.phone : `+91 ${d.phone}`;
        return {
          id: d.id,
          resourceType: 'Driver' as const,
          identifier: phone,
          displayName: d.name,
          company: d.company || '',
          subtitle: `${d.licence} · ${d.transporter} · ${d.status}`,
          status: d.status,
          details: {
            Name: d.name,
            'Contact No.': phone,
            'Licence No.': d.licence,
            Transporter: d.transporter || '—',
            Status: d.status
          }
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    const fleetItems: MasterResourceItem[] = fleets
      .filter((f) => matchesClientStrict(f.company))
      .map((f) => ({
        id: f.id,
        resourceType: 'Fleet' as const,
        identifier: f.public_id,
        displayName: f.name,
        company: f.company || '',
        subtitle: `${f.public_id} · ${f.service_area || 'General'}${f.zone ? ` · ${f.zone}` : ''} · ${f.status}`,
        status: f.status,
        details: {
          'Public ID': f.public_id,
          Name: f.name,
          'Service Area': f.service_area || '—',
          Status: f.status
        }
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    const vendorItems: MasterResourceItem[] = vendors
      .filter((v) => matchesClientOrShared(v.company_name || v.company))
      .map((v) => ({
        id: v.id,
        resourceType: 'Vendor' as const,
        identifier: v.public_id,
        displayName: v.name,
        company: v.company_name || v.company || 'Shared Vendor Master',
        subtitle: `${v.public_id} · ${v.type.toUpperCase()} · ${v.status}`,
        status: v.status,
        details: {
          'Public ID': v.public_id,
          Name: v.name,
          Type: v.type,
          Status: v.status
        }
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    const placeItems: MasterResourceItem[] = places.map((p) => ({
      id: p.id,
      resourceType: 'Place',
      identifier: p.id.toUpperCase(),
      displayName: p.name,
      company: 'Facility & Place Master',
      subtitle: `${p.id.toUpperCase()} · ${p.address}`,
      status: 'Active',
      details: {
        Name: p.name,
        Address: p.address,
        Country: p.country
      }
    }));

    const equipmentMap = new Map<string, MasterResourceItem>();
    equipments.forEach((eq) => {
      equipmentMap.set(eq.id, {
        id: eq.id,
        resourceType: 'Equipment',
        identifier: eq.code,
        displayName: eq.name,
        company: targetClient,
        subtitle: `${eq.code} · ${eq.category} · ${eq.site}`,
        status: eq.status,
        details: {
          Code: eq.code,
          Name: eq.name,
          Category: eq.category,
          Site: eq.site
        }
      });
    });
    store.resourceAllocations
      .filter((a) => a.resourceType === 'Equipment' && matchesClientStrict(a.companyName))
      .forEach((a) => {
        if (!equipmentMap.has(a.resourceId)) {
          equipmentMap.set(a.resourceId, {
            id: a.resourceId,
            resourceType: 'Equipment',
            identifier: a.resourceIdentifier,
            displayName: a.resourceDisplayName,
            company: a.companyName,
            subtitle: `${a.resourceIdentifier} · ${a.companyName}`,
            status: 'Active',
            details: {
              Identifier: a.resourceIdentifier,
              Name: a.resourceDisplayName
            }
          });
        }
      });

    return {
      Vehicle: vehicleItems,
      Driver: driverItems,
      Fleet: fleetItems,
      Vendor: vendorItems,
      Place: placeItems,
      Equipment: Array.from(equipmentMap.values())
    };
  }, [vehicles, drivers, fleets, vendors, places, equipments, store.resourceAllocations, targetClient]);

  // Hardware Composition & Bindings State (Device <-> Sensor, Device <-> SIM, Sensor <-> SIM)
  const [members, setMembers] = useState<HardwareMembership[]>(() =>
    initialConnection
      ? initialConnection.members.map((m) => ({ ...m, isPrimary: false }))
      : []
  );
  const [draftBindings, setDraftBindings] = useState<HardwareBinding[]>(() =>
    initialConnection
      ? store.hardwareBindings.filter((b) => b.connectionId === initialConnection.id && !b.endedAt)
      : []
  );

  // Resource Nodes & Explicit Node-to-Node Bindings State (Resource <-> Resource, Resource <-> Device/Sensor)
  const [resourceNodes, setResourceNodes] = useState<MappingResourceNode[]>(() => {
    if (initialConnection) {
      const existingAllocs = store.resourceAllocations.filter(
        (a) => a.connectionId === initialConnection.id && !a.endedAt
      );
      const seen = new Set<string>();
      const list: MappingResourceNode[] = [];
      existingAllocs.forEach((a) => {
        const nid = makeResNodeId(a.resourceType, a.resourceId);
        if (seen.has(nid)) return;
        seen.add(nid);
        list.push({
          nodeId: nid,
          resourceType: a.resourceType,
          resourceId: a.resourceId,
          identifier: a.resourceIdentifier,
          displayName: a.resourceDisplayName,
          subtitle: a.companyName,
          mode: a.mode,
          effectiveStartAt: a.effectiveStartAt,
          effectiveEndAt: a.effectiveEndAt || null,
          timezone: a.timezone || 'Asia/Kolkata'
        });
      });
      return list;
    }
    return [];
  });

  const [explicitNodeBindings, setExplicitNodeBindings] = useState<ExplicitNodeBinding[]>(() => {
    if (!initialConnection) return [];
    const existingAllocs = store.resourceAllocations.filter(
      (a) => a.connectionId === initialConnection.id && !a.endedAt
    );
    const seeded: ExplicitNodeBinding[] = [];
    // Hydrate Resource <-> Hardware links if hardwareId was set on allocation or primary resource -> root devices
    const rootHwIds = initialConnection.members
      .filter((m) => m.category === 'Device' || m.category === 'Sensor')
      .filter(
        (m) =>
          !store.hardwareBindings.some(
            (b) => b.connectionId === initialConnection.id && !b.endedAt && b.toHardwareId === m.hardwareId
          )
      )
      .map((m) => m.hardwareId);

    const firstAlloc = existingAllocs[0];
    existingAllocs.forEach((a) => {
      const resNid = makeResNodeId(a.resourceType, a.resourceId);
      if (a.hardwareId) {
        const hwMem = initialConnection.members.find((m) => m.hardwareId === a.hardwareId);
        if (hwMem) {
          seeded.push({
            id: `MAP-${seeded.length + 1}`,
            fromNodeId: resNid,
            relationship: hwMem.category === 'Sensor' ? 'Has Sensor' : 'Has Device',
            toNodeId: makeHwNodeId(a.hardwareId),
            mode: a.mode,
            effectiveStartAt: a.effectiveStartAt,
            effectiveEndAt: a.effectiveEndAt || null,
            timezone: a.timezone || 'Asia/Kolkata'
          });
        }
      }
    });

    if (firstAlloc && seeded.length === 0 && rootHwIds.length > 0) {
      const firstResNid = makeResNodeId(firstAlloc.resourceType, firstAlloc.resourceId);
      rootHwIds.forEach((hwId) => {
        const hwMem = initialConnection.members.find((m) => m.hardwareId === hwId);
        if (hwMem) {
          seeded.push({
            id: `MAP-${seeded.length + 1}`,
            fromNodeId: firstResNid,
            relationship: hwMem.category === 'Sensor' ? 'Has Sensor' : 'Has Device',
            toNodeId: makeHwNodeId(hwId),
            mode: firstAlloc.mode,
            effectiveStartAt: firstAlloc.effectiveStartAt,
            effectiveEndAt: firstAlloc.effectiveEndAt || null,
            timezone: firstAlloc.timezone || 'Asia/Kolkata'
          });
        }
      });
    }

    // Hydrate saved ResourceRelationships whose endpoints are in this connection
    const allocNodeSet = new Set(existingAllocs.map((a) => makeResNodeId(a.resourceType, a.resourceId)));
    (store.resourceRelationships || []).forEach((rel) => {
      if (rel.endedAt) return;
      const fromNid = makeResNodeId(rel.sourceResourceType, rel.sourceResourceId);
      const toNid = makeResNodeId(rel.targetResourceType, rel.targetResourceId);
      if (allocNodeSet.has(fromNid) && allocNodeSet.has(toNid)) {
        seeded.push({
          id: `MAP-${seeded.length + 1}`,
          fromNodeId: fromNid,
          relationship: rel.relationshipType,
          toNodeId: toNid,
          mode: rel.mode,
          effectiveStartAt: rel.effectiveStartAt,
          effectiveEndAt: rel.effectiveEndAt || null,
          timezone: rel.timezone || 'Asia/Kolkata'
        });
      }
    });

    return seeded;
  });

  // Default effective timestamp fallback for unbound hardware rows
  const DEFAULT_START_DATE = '2026-11-13';
  const DEFAULT_START_TIME = '10:30:00';
  const DEFAULT_TZ = 'Asia/Kolkata';

  // Picker Modal for Resource Selection (opens when clicking + Vehicle / + Driver / + Fleet / + Vendor / + Place / + Equipment)
  const [resourcePickerState, setResourcePickerState] = useState<{
    resourceType: ResourceType;
    allowTypeSwitch?: boolean;
    preselectedItemId?: string | null;
  } | null>(null);

  // Separate Create New flows (triggered ONLY from inside ResourceSelectionModal)
  const [createNewResourceState, setCreateNewResourceState] = useState<{
    resourceType: ResourceType;
    searchSeed?: string;
  } | null>(null);

  // Separate create modal form fields for Vendor, Place, Equipment
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorType, setNewVendorType] = useState<VendorTypeKey>('transporter');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorCity, setNewVendorCity] = useState('Mundra');
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceAddress, setNewPlaceAddress] = useState('');
  const [newPlaceCountry, setNewPlaceCountry] = useState<VendorCountry>('India');
  const [newEqpCode, setNewEqpCode] = useState('');
  const [newEqpName, setNewEqpName] = useState('');
  const [newEqpCategory, setNewEqpCategory] = useState('Container Handler');
  const [newEqpSite, setNewEqpSite] = useState(MODAL_LOCATIONS[0]);
  const [createSimpleError, setCreateSimpleError] = useState<string | null>(null);

  // Nested Hardware Composition Modal state + optional auto-binding target Resource
  const [composerState, setComposerState] = useState<{
    mode: 'add-hardware' | 'edit-binding';
    category: HardwareCategory;
    parentHardwareId?: string | null;
    parentResourceNodeId?: string | null;
    editingBinding?: HardwareBinding | null;
  } | null>(null);

  const [lastBindingDefaults, setLastBindingDefaults] = useState<BindingDefaults>({
    mode: 'Permanent',
    startDate: '2026-11-13',
    startTime: '10:30:00',
    endDate: '2026-11-28',
    endTime: '23:59:59',
    timezone: 'Asia/Kolkata'
  });

  // Edit Resource <-> Hardware explicit binding modal state
  const [editingExplicitBinding, setEditingExplicitBinding] = useState<{
    bindingId: string;
    fromLabel: string;
    toLabel: string;
    relationship: string;
    mode: HardwareBindingMode;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    timezone: string;
    error?: string | null;
  } | null>(null);

  // Form Errors & Confirmation
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<boolean>(false);

  const allGlobalBindings = useMemo(
    () => [
      ...store.hardwareBindings.filter((b) => b.connectionId !== connId),
      ...draftBindings
    ],
    [store.hardwareBindings, connId, draftBindings]
  );

  const memberMap = useMemo(() => new Map(members.map((m) => [m.hardwareId, m])), [members]);
  const resourceNodeMap = useMemo(
    () => new Map(resourceNodes.map((r) => [r.nodeId, r])),
    [resourceNodes]
  );

  // Unified list of existing nodes in this mapping
  const existingNodeRefs = useMemo<ExistingMappingNodeRef[]>(() => {
    const resRefs: ExistingMappingNodeRef[] = resourceNodes.map((r) => ({
      nodeId: r.nodeId,
      nodeType: r.resourceType,
      identifier: r.identifier,
      displayName: r.displayName
    }));
    const hwRefs: ExistingMappingNodeRef[] = members.map((m) => ({
      nodeId: makeHwNodeId(m.hardwareId),
      nodeType: m.category,
      identifier: m.identifierValue,
      displayName: m.modelLabel
    }));
    return [...resRefs, ...hwRefs];
  }, [resourceNodes, members]);

  const nodeRefMap = useMemo(
    () => new Map(existingNodeRefs.map((n) => [n.nodeId, n])),
    [existingNodeRefs]
  );

  const alreadyAddedResourceKeys = useMemo(
    () => new Set(resourceNodes.map((r) => `${r.resourceType}::${r.resourceId}`)),
    [resourceNodes]
  );

  // Build unified hierarchical tree rows from resourceNodes, members, explicitNodeBindings, and draftBindings
  const unifiedTreeRows = useMemo<UnifiedTreeRow[]>(() => {
    const rows: UnifiedTreeRow[] = [];

    // Identify children map by parent nodeId
    const explicitByParent = new Map<string, ExplicitNodeBinding[]>();
    const boundExplicitTargetIds = new Set<string>();
    explicitNodeBindings.forEach((eb) => {
      if (!nodeRefMap.has(eb.fromNodeId) || !nodeRefMap.has(eb.toNodeId)) return;
      boundExplicitTargetIds.add(eb.toNodeId);
      const list = explicitByParent.get(eb.fromNodeId) || [];
      list.push(eb);
      explicitByParent.set(eb.fromNodeId, list);
    });

    const hwBindingsByParent = new Map<string, HardwareBinding[]>();
    const boundHwTargetIds = new Set<string>();
    draftBindings.forEach((hb) => {
      if (hb.endedAt || hb.statusOverride === 'Canceled') return;
      boundHwTargetIds.add(makeHwNodeId(hb.toHardwareId));
      const parentNid = makeHwNodeId(hb.fromHardwareId);
      const list = hwBindingsByParent.get(parentNid) || [];
      list.push(hb);
      hwBindingsByParent.set(parentNid, list);
    });

    const visitedInTree = new Set<string>();

    const pushHardwareSubtree = (
      hw: HardwareMembership,
      numberPrefix: string,
      depth: number,
      isLastSibling: boolean,
      ancestorHasNext: boolean[],
      relLabel: string,
      modeVal: HardwareBindingMode,
      startAt: string,
      endAt: string | null,
      tz: string,
      hwBinding?: HardwareBinding,
      expBinding?: ExplicitNodeBinding
    ) => {
      const nid = makeHwNodeId(hw.hardwareId);
      if (visitedInTree.has(nid)) return;
      visitedInTree.add(nid);

      rows.push({
        rowKey: `${nid}-${numberPrefix}`,
        rowNumber: numberPrefix,
        depth,
        isLastSibling,
        ancestorHasNext,
        kind: 'hardware',
        nodeId: nid,
        nodeType: hw.category,
        identifier: hw.identifierValue,
        title: `${hw.category} · ${hw.identifierValue}`,
        subtitle: hw.modelLabel,
        relationshipLabel: relLabel,
        mode: modeVal,
        effectiveStartAt: startAt,
        effectiveEndAt: endAt,
        timezone: tz,
        hardwareMember: hw,
        hardwareBinding: hwBinding,
        explicitBinding: expBinding
      });

      const childHwBindings = (hwBindingsByParent.get(nid) || []).filter((cb) =>
        memberMap.has(cb.toHardwareId) && !visitedInTree.has(makeHwNodeId(cb.toHardwareId))
      );
      childHwBindings.forEach((cb, idx) => {
        const childHw = memberMap.get(cb.toHardwareId)!;
        const childIsLast = idx === childHwBindings.length - 1;
        const childAncestorNext = depth === 0 ? [] : [...ancestorHasNext, !isLastSibling];
        pushHardwareSubtree(
          childHw,
          `${numberPrefix}.${idx + 1}`,
          depth + 1,
          childIsLast,
          childAncestorNext,
          cb.portOrSlot ? `Connected (${cb.portOrSlot})` : `Connected to (${hw.category})`,
          cb.mode,
          cb.effectiveStartAt,
          cb.effectiveEndAt || null,
          cb.timezone,
          cb,
          undefined
        );
      });
    };

    const pushResourceSubtree = (
      resNode: MappingResourceNode,
      numberPrefix: string,
      isLastRoot: boolean,
      relLabel: string,
      modeVal: HardwareBindingMode,
      startAt: string,
      endAt: string | null,
      tz: string,
      expBinding?: ExplicitNodeBinding
    ) => {
      if (visitedInTree.has(resNode.nodeId)) return;
      visitedInTree.add(resNode.nodeId);

      rows.push({
        rowKey: `${resNode.nodeId}-${numberPrefix}`,
        rowNumber: numberPrefix,
        depth: 0,
        isLastSibling: isLastRoot,
        ancestorHasNext: [],
        kind: 'resource',
        nodeId: resNode.nodeId,
        nodeType: resNode.resourceType,
        identifier: resNode.identifier,
        title: `${resNode.resourceType} · ${resNode.identifier}`,
        subtitle: resNode.displayName,
        relationshipLabel: relLabel,
        mode: modeVal,
        effectiveStartAt: startAt,
        effectiveEndAt: endAt,
        timezone: tz,
        resourceNode: resNode,
        explicitBinding: expBinding
      });

      // Only hardware units (Device / Sensor) attached directly to this resource nest underneath it;
      // all resources remain peers at the same flat level (depth 0).
      const childHardwareExplicit = (explicitByParent.get(resNode.nodeId) || []).filter(
        (eb) => eb.toNodeId.startsWith('hw::') && !visitedInTree.has(eb.toNodeId)
      );
      childHardwareExplicit.forEach((eb, idx) => {
        const childIsLast = idx === childHardwareExplicit.length - 1;
        const childNum = `${numberPrefix}.${idx + 1}`;
        const hwId = eb.toNodeId.slice(4);
        const childHw = memberMap.get(hwId);
        if (childHw) {
          pushHardwareSubtree(
            childHw,
            childNum,
            1,
            childIsLast,
            [],
            eb.relationship,
            eb.mode,
            eb.effectiveStartAt,
            eb.effectiveEndAt,
            eb.timezone,
            undefined,
            eb
          );
        }
      });
    };

    // 1. All Resource Nodes rendered at the exact same flat level (no Primary, no Resource-under-Resource nesting)
    let rootCounter = 0;
    resourceNodes.forEach((r, idx) => {
      rootCounter += 1;
      const peerBindings = explicitNodeBindings.filter(
        (eb) =>
          (eb.fromNodeId === r.nodeId && eb.toNodeId.startsWith('res::')) ||
          (eb.toNodeId === r.nodeId && eb.fromNodeId.startsWith('res::'))
      );
      const relSummary =
        peerBindings.length > 0
          ? peerBindings
              .map((eb) => {
                if (eb.fromNodeId === r.nodeId) {
                  const tgt = nodeRefMap.get(eb.toNodeId);
                  return tgt ? `${eb.relationship} → ${tgt.identifier}` : eb.relationship;
                }
                const src = nodeRefMap.get(eb.fromNodeId);
                return src ? `${src.identifier} (${eb.relationship})` : eb.relationship;
              })
              .join(', ')
          : 'Connected Resource';

      pushResourceSubtree(
        r,
        `${rootCounter}`,
        idx === resourceNodes.length - 1,
        relSummary,
        r.mode,
        r.effectiveStartAt,
        r.effectiveEndAt,
        r.timezone
      );
    });

    // 2. Unbound / Standalone Hardware Roots (not targeted by any explicit binding or hardware binding)
    const rootHardwares = members.filter((m) => {
      const nid = makeHwNodeId(m.hardwareId);
      return !visitedInTree.has(nid) && !boundExplicitTargetIds.has(nid) && !boundHwTargetIds.has(nid);
    });
    rootHardwares.forEach((hw, idx) => {
      rootCounter += 1;
      pushHardwareSubtree(
        hw,
        `${rootCounter}`,
        0,
        idx === rootHardwares.length - 1,
        [],
        `Unbound ${hw.category}`,
        'Permanent',
        buildIsoWithTimezone(DEFAULT_START_DATE, DEFAULT_START_TIME, DEFAULT_TZ),
        null,
        DEFAULT_TZ
      );
    });

    // Fallback for any remaining hardware
    members.forEach((hw) => {
      const nid = makeHwNodeId(hw.hardwareId);
      if (!visitedInTree.has(nid)) {
        rootCounter += 1;
        pushHardwareSubtree(
          hw,
          `${rootCounter}`,
          0,
          true,
          [],
          hw.category,
          'Permanent',
          buildIsoWithTimezone(DEFAULT_START_DATE, DEFAULT_START_TIME, DEFAULT_TZ),
          null,
          DEFAULT_TZ
        );
      }
    });

    return rows;
  }, [
    resourceNodes,
    members,
    explicitNodeBindings,
    draftBindings,
    nodeRefMap,
    memberMap
  ]);

  // All Explicit Pairwise Bindings for Mappings Summary Table
  const summaryRows = useMemo(() => {
    const items: {
      id: string;
      kind: 'explicit' | 'hardware';
      sourceType: ResourceType | HardwareCategory;
      sourceLabel: string;
      relationship: string;
      targetType: ResourceType | HardwareCategory;
      targetLabel: string;
      scope: string;
      mode: HardwareBindingMode;
      effectiveStartAt: string;
      effectiveEndAt: string | null;
      timezone: string;
    }[] = [];

    explicitNodeBindings.forEach((eb) => {
      const src = nodeRefMap.get(eb.fromNodeId);
      const tgt = nodeRefMap.get(eb.toNodeId);
      if (!src || !tgt) return;
      items.push({
        id: eb.id,
        kind: 'explicit',
        sourceType: src.nodeType,
        sourceLabel: `${src.nodeType} · ${src.identifier}`,
        relationship: eb.relationship,
        targetType: tgt.nodeType,
        targetLabel: `${tgt.nodeType} · ${tgt.identifier}`,
        scope:
          tgt.nodeType === 'Device' || tgt.nodeType === 'Sensor'
            ? 'Direct Hardware Pair'
            : 'Resource Binding',
        mode: eb.mode,
        effectiveStartAt: eb.effectiveStartAt,
        effectiveEndAt: eb.effectiveEndAt,
        timezone: eb.timezone
      });
    });

    draftBindings.forEach((hb) => {
      const fromMem = memberMap.get(hb.fromHardwareId);
      const toMem = memberMap.get(hb.toHardwareId);
      if (!fromMem || !toMem) return;
      items.push({
        id: hb.id,
        kind: 'hardware',
        sourceType: fromMem.category,
        sourceLabel: `${fromMem.category} · ${fromMem.identifierValue}`,
        relationship: hb.portOrSlot ? `Connected (${hb.portOrSlot})` : `Has ${toMem.category}`,
        targetType: toMem.category,
        targetLabel: `${toMem.category} · ${toMem.identifierValue}`,
        scope: 'Hardware Pair',
        mode: hb.mode,
        effectiveStartAt: hb.effectiveStartAt,
        effectiveEndAt: hb.effectiveEndAt || null,
        timezone: hb.timezone
      });
    });

    return items;
  }, [explicitNodeBindings, draftBindings, nodeRefMap, memberMap]);

  // Handle selecting/adding a Resource from ResourceSelectionModal
  const handleResourceSelected = (res: ResourceSelectionResult) => {
    const startIso = buildIsoWithTimezone(res.startDate, res.startTime, res.timezone);
    const endIso =
      res.mode === 'Temporal'
        ? buildIsoWithTimezone(res.endDate, res.endTime, res.timezone)
        : null;
    const nodeId = makeResNodeId(res.item.resourceType, res.item.id);

    setResourceNodes((prev) => {
      if (prev.some((r) => r.nodeId === nodeId)) return prev;
      return [
        ...prev,
        {
          nodeId,
          resourceType: res.item.resourceType,
          resourceId: res.item.id,
          identifier: res.item.identifier,
          displayName: res.item.displayName,
          subtitle: res.item.subtitle,
          mode: res.mode,
          effectiveStartAt: startIso,
          effectiveEndAt: endIso,
          timezone: res.timezone
        }
      ];
    });

    if (res.parentNodeId) {
      const alreadyLinked = explicitNodeBindings.some(
        (b) => b.fromNodeId === res.parentNodeId && b.toNodeId === nodeId
      );
      if (!alreadyLinked) {
        setExplicitNodeBindings((prev) => [
          ...prev,
          {
            id: `MAP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            fromNodeId: res.parentNodeId!,
            relationship: res.relationship || `Has ${res.item.resourceType}`,
            toNodeId: nodeId,
            mode: res.mode,
            effectiveStartAt: startIso,
            effectiveEndAt: endIso,
            timezone: res.timezone
          }
        ]);
      }
    }

    setResourcePickerState(null);
    setFormError(null);
    showToast(
      res.parentNodeId
        ? `Added & bound ${res.item.resourceType} ${res.item.identifier}.`
        : `Selected ${res.item.resourceType} ${res.item.identifier} for mapping.`
    );
  };

  const openEditExplicitBinding = (eb: ExplicitNodeBinding) => {
    const src = nodeRefMap.get(eb.fromNodeId);
    const tgt = nodeRefMap.get(eb.toNodeId);
    const startParts = formatLocalInputParts(eb.effectiveStartAt, eb.timezone);
    const endParts = eb.effectiveEndAt
      ? formatLocalInputParts(eb.effectiveEndAt, eb.timezone)
      : { date: '2026-11-28', time: '23:59:59' };
    setEditingExplicitBinding({
      bindingId: eb.id,
      fromLabel: src ? `${src.nodeType} · ${src.identifier}` : eb.fromNodeId,
      toLabel: tgt ? `${tgt.nodeType} · ${tgt.identifier}` : eb.toNodeId,
      relationship: eb.relationship,
      mode: eb.mode,
      startDate: startParts.date || '2026-11-13',
      startTime: startParts.time || '10:30:00',
      endDate: endParts.date || '2026-11-28',
      endTime: endParts.time || '23:59:59',
      timezone: eb.timezone || 'Asia/Kolkata',
      error: null
    });
  };

  const handleSaveExplicitBindingEdit = () => {
    if (!editingExplicitBinding) return;
    const startIso = buildIsoWithTimezone(
      editingExplicitBinding.startDate,
      editingExplicitBinding.startTime,
      editingExplicitBinding.timezone
    );
    const endIso =
      editingExplicitBinding.mode === 'Temporal'
        ? buildIsoWithTimezone(
            editingExplicitBinding.endDate,
            editingExplicitBinding.endTime,
            editingExplicitBinding.timezone
          )
        : null;

    if (editingExplicitBinding.mode === 'Temporal') {
      const sMs = Date.parse(startIso);
      const eMs = endIso ? Date.parse(endIso) : NaN;
      if (Number.isNaN(sMs) || Number.isNaN(eMs) || eMs <= sMs) {
        setEditingExplicitBinding((prev) =>
          prev ? { ...prev, error: 'For Temporal validity, Effective End must be after Effective Start.' } : prev
        );
        return;
      }
    }

    setExplicitNodeBindings((prev) =>
      prev.map((eb) =>
        eb.id === editingExplicitBinding.bindingId
          ? {
              ...eb,
              relationship: editingExplicitBinding.relationship.trim() || eb.relationship,
              mode: editingExplicitBinding.mode,
              effectiveStartAt: startIso,
              effectiveEndAt: endIso,
              timezone: editingExplicitBinding.timezone
            }
          : eb
      )
    );
    showToast(`Updated binding (${editingExplicitBinding.fromLabel} → ${editingExplicitBinding.toLabel}).`);
    setEditingExplicitBinding(null);
  };

  // Handle saving from HardwareCompositionModal
  const handleCompositionSave = (
    res: HardwareCompositionSaveResult,
    keepOpenAction?: 'add-sensor' | 'add-sim'
  ) => {
    setLastBindingDefaults(res.usedDefaults);

    if (res.registeredDevice) {
      setLocalDevices((prev) =>
        prev.some((d) => d.id === res.registeredDevice!.id) ? prev : [res.registeredDevice!, ...prev]
      );
      showToast(`Registered Device ${res.registeredDevice.deviceId} under ${targetClient}.`);
    }
    if (res.registeredSensor) {
      setLocalSensors((prev) =>
        prev.some((s) => s.id === res.registeredSensor!.id) ? prev : [res.registeredSensor!, ...prev]
      );
      showToast(`Registered Sensor ${res.registeredSensor.deviceId} under ${targetClient}.`);
    }
    if (res.registeredSim) {
      setLocalSims((prev) =>
        prev.some((s) => s.id === res.registeredSim!.id) ? prev : [res.registeredSim!, ...prev]
      );
      showToast(`Registered SIM ${res.registeredSim.iccid} under ${targetClient}.`);
    }

    if (res.newMember) {
      const cleanMember: HardwareMembership = { ...res.newMember, isPrimary: false };
      setMembers((prev) =>
        prev.some((m) => m.hardwareId === cleanMember.hardwareId) ? prev : [...prev, cleanMember]
      );

      // Only attach directly to a Resource when explicitly triggered via that resource row's "+ Device" button
      const targetParentResId = composerState?.parentResourceNodeId || null;

      if (targetParentResId && !res.newBinding) {
        const startIso = buildIsoWithTimezone(
          res.usedDefaults.startDate,
          res.usedDefaults.startTime,
          res.usedDefaults.timezone
        );
        const endIso =
          res.usedDefaults.mode === 'Temporal'
            ? buildIsoWithTimezone(
                res.usedDefaults.endDate,
                res.usedDefaults.endTime,
                res.usedDefaults.timezone
              )
            : null;
        setExplicitNodeBindings((prev) => [
          ...prev,
          {
            id: `MAP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            fromNodeId: targetParentResId,
            relationship: cleanMember.category === 'Sensor' ? 'Has Sensor' : 'Has Device',
            toNodeId: makeHwNodeId(cleanMember.hardwareId),
            mode: res.usedDefaults.mode,
            effectiveStartAt: startIso,
            effectiveEndAt: endIso,
            timezone: res.usedDefaults.timezone
          }
        ]);
      }
    }

    if (res.newBinding) {
      setDraftBindings((prev) => [...prev, res.newBinding!]);
    }

    if (res.updatedBinding) {
      setDraftBindings((prev) =>
        prev.map((b) => (b.id === res.updatedBinding!.id ? res.updatedBinding! : b))
      );
      showToast(`Updated binding ${res.updatedBinding.id}.`);
    }

    if (!keepOpenAction) {
      setComposerState(null);
    }
    setFormError(null);
  };

  // Safe Remove Hardware Unit or Resource Node
  const handleRemoveResourceNode = (nodeId: string) => {
    setResourceNodes((prev) => prev.filter((r) => r.nodeId !== nodeId));
    setExplicitNodeBindings((prev) =>
      prev.filter((b) => b.fromNodeId !== nodeId && b.toNodeId !== nodeId)
    );
  };

  const handleRequestRemoveMember = (member: HardwareMembership) => {
    const hwNodeId = makeHwNodeId(member.hardwareId);
    setMembers((prev) => prev.filter((x) => x.hardwareId !== member.hardwareId));
    setDraftBindings((prev) =>
      prev.filter((b) => b.fromHardwareId !== member.hardwareId && b.toHardwareId !== member.hardwareId)
    );
    setExplicitNodeBindings((prev) =>
      prev.filter((b) => b.fromNodeId !== hwNodeId && b.toNodeId !== hwNodeId)
    );
  };

  // Callbacks from separate Create New Resource Drawers (updates catalog & highlights newly created record inside ResourceSelectionModal)
  const handleCreatedVehicle = (newVeh: Vehicle) => {
    const next = [newVeh, ...vehicles];
    saveVehicleMasterStore(next);
    setVehicles(next);
    setCreateNewResourceState(null);
    setResourcePickerState((prev) =>
      prev
        ? { ...prev, resourceType: 'Vehicle', preselectedItemId: newVeh.id }
        : { resourceType: 'Vehicle', preselectedItemId: newVeh.id }
    );
    showToast(`Vehicle ${newVeh.registration_number} registered. Review & click Select to add to mapping.`);
  };

  const handleCreatedDriver = (newDrv: Driver) => {
    const next = [newDrv, ...drivers];
    saveDriverMasterStore(next);
    setDrivers(next);
    setCreateNewResourceState(null);
    setResourcePickerState((prev) =>
      prev
        ? { ...prev, resourceType: 'Driver', preselectedItemId: newDrv.id }
        : { resourceType: 'Driver', preselectedItemId: newDrv.id }
    );
    showToast(`Driver ${newDrv.name} registered. Review & click Select to add to mapping.`);
  };

  const handleCreatedFleet = (newFleet: Fleet) => {
    setFleets((prev) => [newFleet, ...prev]);
    setCreateNewResourceState(null);
    setResourcePickerState((prev) =>
      prev
        ? { ...prev, resourceType: 'Fleet', preselectedItemId: newFleet.id }
        : { resourceType: 'Fleet', preselectedItemId: newFleet.id }
    );
    showToast(`Fleet ${newFleet.name} registered. Click Select to add to mapping.`);
  };

  const handleCreateSimpleResource = () => {
    setCreateSimpleError(null);
    if (!createNewResourceState) return;
    const rt = createNewResourceState.resourceType;

    if (rt === 'Vendor') {
      if (!newVendorName.trim()) {
        setCreateSimpleError('Vendor Name is required.');
        return;
      }
      const id = `vnd-${Date.now()}`;
      const pubId = `VND-${Math.floor(1000 + Math.random() * 9000)}`;
      const nowIso = new Date().toISOString();
      const newVendor: VendorRecord = {
        id,
        public_id: pubId,
        internal_id: `INT-${Date.now().toString().slice(-6)}`,
        business_id: `BIZ-${Date.now().toString().slice(-6)}`,
        name: newVendorName.trim(),
        type: newVendorType,
        status: 'active',
        email: '',
        phone: newVendorPhone.trim() || '+91 9800000000',
        website_url: '',
        country: 'India',
        place_id: places[0]?.id || '',
        user_account_id: null,
        personnel: [],
        integration: null,
        company: targetClient,
        company_name: targetClient,
        registered_address: {
          pincode: '370421',
          country: 'India',
          state: 'Gujarat',
          city: newVendorCity.trim() || 'Mundra',
          address: 'Port Operations Hub'
        },
        billing_details: {
          address: 'Port Operations Hub',
          pincode: '370421',
          country: 'India',
          state: 'Gujarat',
          city: newVendorCity.trim() || 'Mundra'
        },
        contacts_extra: {
          contact_no: newVendorPhone.trim() || '+91 9800000000'
        },
        created_at: nowIso,
        updated_at: nowIso
      };
      setVendors((prev) => [newVendor, ...prev]);
      try {
        const raw = localStorage.getItem(VENDOR_MASTER_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.vendors = [newVendor, ...(parsed.vendors || [])];
          localStorage.setItem(VENDOR_MASTER_STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }
      setCreateNewResourceState(null);
      setResourcePickerState((prev) =>
        prev
          ? { ...prev, resourceType: 'Vendor', preselectedItemId: newVendor.id }
          : { resourceType: 'Vendor', preselectedItemId: newVendor.id }
      );
      showToast(`Vendor ${newVendor.name} registered.`);
      return;
    }

    if (rt === 'Place') {
      if (!newPlaceName.trim() || !newPlaceAddress.trim()) {
        setCreateSimpleError('Place Name and Address are required.');
        return;
      }
      const id = `plc-${Date.now().toString().slice(-5)}`;
      const newPlace: PlaceRecord = {
        id,
        name: newPlaceName.trim(),
        address: newPlaceAddress.trim(),
        country: newPlaceCountry
      };
      setPlaces((prev) => [newPlace, ...prev]);
      try {
        const raw = localStorage.getItem(VENDOR_MASTER_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.places = [newPlace, ...(parsed.places || [])];
          localStorage.setItem(VENDOR_MASTER_STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }
      setCreateNewResourceState(null);
      setResourcePickerState((prev) =>
        prev
          ? { ...prev, resourceType: 'Place', preselectedItemId: newPlace.id }
          : { resourceType: 'Place', preselectedItemId: newPlace.id }
      );
      showToast(`Place ${newPlace.name} registered.`);
      return;
    }

    if (rt === 'Equipment') {
      if (!newEqpCode.trim() || !newEqpName.trim()) {
        setCreateSimpleError('Equipment Code and Name are required.');
        return;
      }
      const newEqp = {
        id: `eqp-${Date.now()}`,
        code: newEqpCode.trim().toUpperCase(),
        name: newEqpName.trim(),
        category: newEqpCategory.trim() || 'Yard Equipment',
        site: newEqpSite,
        status: 'Active'
      };
      setEquipments((prev) => [newEqp, ...prev]);
      setCreateNewResourceState(null);
      setResourcePickerState((prev) =>
        prev
          ? { ...prev, resourceType: 'Equipment', preselectedItemId: newEqp.id }
          : { resourceType: 'Equipment', preselectedItemId: newEqp.id }
      );
      showToast(`Equipment ${newEqp.code} registered.`);
    }
  };

  const openCreateNewFromPicker = (type: ResourceType, searchSeed?: string) => {
    setCreateSimpleError(null);
    if (type === 'Vendor') {
      setNewVendorName(searchSeed || '');
      setNewVendorPhone('');
    } else if (type === 'Place') {
      setNewPlaceName(searchSeed || '');
      setNewPlaceAddress('');
    } else if (type === 'Equipment') {
      setNewEqpCode(searchSeed ? searchSeed.toUpperCase() : '');
      setNewEqpName('');
    }
    setCreateNewResourceState({ resourceType: type, searchSeed });
  };

  const resolvedClientCompany = useMemo(
    () => resolveClientCompanyByNameOrId(targetClient),
    [targetClient]
  );

  const computedTargetStatus = useMemo<ConnectionLifecycleStatus>(() => {
    const nowMs = Date.now();
    const activeBindings = draftBindings.filter(
      (b) => !b.endedAt && b.statusOverride !== 'Canceled'
    );
    const bindingStatuses = activeBindings.map(
      (b) => computeHardwareBindingStatus(b, allGlobalBindings, members, nowMs).status
    );

    if (bindingStatuses.includes('Conflict')) return 'Needs Attention';

    const hasBlockedHardware = members.some((m) => {
      if (m.category === 'Device') {
        const dev = localDevices.find((d) => d.id === m.hardwareId);
        if (!dev) return false;
        const eff = deriveDeviceStatus(dev, store, nowMs);
        return eff === 'Decommissioned' || eff === 'In Maintenance';
      }
      if (m.category === 'Sensor') {
        const sen = localSensors.find((s) => s.id === m.hardwareId);
        if (!sen) return false;
        const eff = deriveSensorStatus(sen, store, nowMs);
        return eff === 'Decommissioned' || eff === 'In Maintenance';
      }
      if (m.category === 'SIM') {
        const sim = localSims.find((s) => s.id === m.hardwareId);
        if (!sim) return false;
        return sim.status === 'Retired' || sim.status === 'Suspended' || sim.status === 'Inactive';
      }
      return false;
    });
    if (hasBlockedHardware) return 'Needs Attention';

    const compId = resolvedClientCompany?.id || '';
    const allocCandidates: ResourceAllocation[] = [];
    resourceNodes.forEach((rn) => {
      const boundHwEdges = explicitNodeBindings.filter(
        (b) => b.fromNodeId === rn.nodeId && b.toNodeId.startsWith('hw::')
      );
      if (boundHwEdges.length === 0) {
        allocCandidates.push({
          id: `cand-${rn.nodeId}`,
          companyId: compId,
          companyName: targetClient,
          connectionId: connId,
          resourceType: rn.resourceType,
          resourceId: rn.resourceId,
          resourceIdentifier: rn.identifier,
          resourceDisplayName: rn.displayName,
          hardwareId: null,
          mode: rn.mode,
          timezone: rn.timezone,
          effectiveStartAt: rn.effectiveStartAt,
          effectiveEndAt: rn.mode === 'Temporal' ? rn.effectiveEndAt : null,
          endedAt: null,
          assignedBy: actorName,
          assignedOn: '',
          updatedAt: ''
        });
      } else {
        boundHwEdges.forEach((edge, idx) => {
          allocCandidates.push({
            id: `cand-${rn.nodeId}-${idx}`,
            companyId: compId,
            companyName: targetClient,
            connectionId: connId,
            resourceType: rn.resourceType,
            resourceId: rn.resourceId,
            resourceIdentifier: rn.identifier,
            resourceDisplayName: rn.displayName,
            hardwareId: edge.toNodeId.slice(4),
            mode: edge.mode,
            timezone: edge.timezone,
            effectiveStartAt: edge.effectiveStartAt,
            effectiveEndAt: edge.mode === 'Temporal' ? edge.effectiveEndAt : null,
            endedAt: null,
            assignedBy: actorName,
            assignedOn: '',
            updatedAt: ''
          });
        });
      }
    });
    const otherAllocs = store.resourceAllocations.filter((a) => a.connectionId !== connId);
    const allocStatuses = allocCandidates.map((a) =>
      computeResourceAllocationStatus(a, [...otherAllocs, ...allocCandidates], nowMs).status
    );
    if (allocStatuses.includes('Conflict')) return 'Needs Attention';

    if (bindingStatuses.includes('Active') || allocStatuses.includes('Active')) {
      return 'Active';
    }
    if (bindingStatuses.includes('Scheduled') || allocStatuses.includes('Scheduled')) {
      return 'Scheduled';
    }
    return 'Draft';
  }, [
    draftBindings,
    allGlobalBindings,
    members,
    localDevices,
    localSensors,
    localSims,
    store,
    resolvedClientCompany,
    targetClient,
    resourceNodes,
    explicitNodeBindings,
    connId,
    actorName
  ]);

  const executeCommit = (actionType: 'draft' | 'activate') => {
    if (hasVersionConflict) {
      setFormError(
        `Version conflict: ${connId} was modified in another view (live v${liveVersion} vs opened v${initialConnection?.version}). Close and reopen this mapping to review the latest changes before saving.`
      );
      setConfirmAction(false);
      return;
    }

    if (resourceNodes.length === 0 && members.length === 0) {
      setFormError('Add at least one Resource or Hardware unit before saving or activating.');
      setConfirmAction(false);
      return;
    }

    const matchedCompany = resolveClientCompanyByNameOrId(targetClient);
    const companyId = matchedCompany?.id || '';
    if (!companyId || matchedCompany?.isPlatformOwner) {
      setFormError(
        `Cannot save mapping: "${targetClient || 'Unknown'}" is not a valid client company.`
      );
      setConfirmAction(false);
      return;
    }

    if (
      activeCompanyScope !== 'All Clients' &&
      targetClient.trim().toLowerCase() !== activeCompanyScope.trim().toLowerCase()
    ) {
      setFormError(
        `Access denied: You can only save mappings within your authorized organization (${activeCompanyScope}).`
      );
      setConfirmAction(false);
      return;
    }

    const normTargetClient = targetClient.trim().toLowerCase();
    const initialMemberIdSet = new Set(
      (initialConnection?.members || []).map((m) => m.hardwareId)
    );
    const allModelCategories = loadModelCategoryStore();
    const enabledModelIdSet = new Set(enabledModels.map((m) => m.id));

    // Re-validate every hardware member at final commit
    const nowMs = Date.now();
    for (const m of members) {
      const isNewlyAddedMember = !initialMemberIdSet.has(m.hardwareId);

      if (m.category === 'Device') {
        const dev = localDevices.find((d) => d.id === m.hardwareId);
        if (!dev) {
          setFormError(`Device ${m.identifierValue} could not be found in Devices Master.`);
          setConfirmAction(false);
          return;
        }
        if ((dev.company || '').trim().toLowerCase() !== normTargetClient) {
          setFormError(
            `Cross-tenant hardware blocked: Device ${dev.deviceId} belongs to "${dev.company}", not "${targetClient}".`
          );
          setConfirmAction(false);
          return;
        }
        const effStatus = deriveDeviceStatus(dev, store, nowMs);
        if (effStatus === 'Decommissioned') {
          setFormError(`Device ${dev.deviceId} is Decommissioned and cannot be mapped.`);
          setConfirmAction(false);
          return;
        }
        if (effStatus === 'In Maintenance' && (isNewlyAddedMember || actionType === 'activate')) {
          setFormError(
            `Device ${dev.deviceId} is currently In Maintenance and cannot be used for an effective mapping.`
          );
          setConfirmAction(false);
          return;
        }
        if (isNewlyAddedMember) {
          const modelRec = allModelCategories.find((mc) => mc.id === dev.modelTypeId);
          if (!dev.modelTypeId || !modelRec || modelRec.status !== 'Active' || !enabledModelIdSet.has(dev.modelTypeId)) {
            setFormError(
              `Model eligibility error: Device ${dev.deviceId} model "${dev.modelText}" is inactive or not enabled for ${targetClient}.`
            );
            setConfirmAction(false);
            return;
          }
        }
      } else if (m.category === 'Sensor') {
        const sen = localSensors.find((s) => s.id === m.hardwareId);
        if (!sen) {
          setFormError(`Sensor ${m.identifierValue} could not be found in Sensors Master.`);
          setConfirmAction(false);
          return;
        }
        if ((sen.company || '').trim().toLowerCase() !== normTargetClient) {
          setFormError(
            `Cross-tenant hardware blocked: Sensor ${sen.deviceId} belongs to "${sen.company}", not "${targetClient}".`
          );
          setConfirmAction(false);
          return;
        }
        const effStatus = deriveSensorStatus(sen, store, nowMs);
        if (effStatus === 'Decommissioned') {
          setFormError(`Sensor ${sen.deviceId} is Decommissioned and cannot be mapped.`);
          setConfirmAction(false);
          return;
        }
        if (effStatus === 'In Maintenance' && (isNewlyAddedMember || actionType === 'activate')) {
          setFormError(
            `Sensor ${sen.deviceId} is currently In Maintenance and cannot be used for an effective mapping.`
          );
          setConfirmAction(false);
          return;
        }
        if (isNewlyAddedMember) {
          const modelRec = allModelCategories.find((mc) => mc.id === sen.modelTypeId);
          if (!sen.modelTypeId || !modelRec || modelRec.status !== 'Active' || !enabledModelIdSet.has(sen.modelTypeId)) {
            setFormError(
              `Model eligibility error: Sensor ${sen.deviceId} model "${sen.modelText}" is inactive or not enabled for ${targetClient}.`
            );
            setConfirmAction(false);
            return;
          }
        }
      } else if (m.category === 'SIM') {
        const sim = localSims.find((s) => s.id === m.hardwareId);
        if (!sim) {
          setFormError(`SIM ${m.identifierValue} could not be found in SIM Master.`);
          setConfirmAction(false);
          return;
        }
        if ((sim.owner || '').trim().toLowerCase() !== normTargetClient) {
          setFormError(
            `Cross-tenant hardware blocked: SIM ${sim.iccid} belongs to "${sim.owner}", not "${targetClient}".`
          );
          setConfirmAction(false);
          return;
        }
        if (sim.status === 'Retired') {
          setFormError(`SIM ${sim.iccid} is Retired and cannot be mapped.`);
          setConfirmAction(false);
          return;
        }
        if (
          (sim.status === 'Suspended' || sim.status === 'Inactive') &&
          (isNewlyAddedMember || actionType === 'activate')
        ) {
          setFormError(
            `SIM ${sim.iccid} has carrier lifecycle "${sim.status}" and cannot be activated in Asset Mapping.`
          );
          setConfirmAction(false);
          return;
        }
        if (isNewlyAddedMember && sim.modelTypeId) {
          const modelRec = allModelCategories.find((mc) => mc.id === sim.modelTypeId);
          if (!modelRec || modelRec.status !== 'Active' || !enabledModelIdSet.has(sim.modelTypeId)) {
            setFormError(
              `Model eligibility error: SIM ${sim.iccid} model is inactive or not enabled for ${targetClient}.`
            );
            setConfirmAction(false);
            return;
          }
        }
      }
    }

    // Re-validate every Resource Node against actual master records for targetClient
    const initialAllocResourceIds = new Set(
      (initialConnection
        ? store.resourceAllocations.filter((a) => a.connectionId === initialConnection.id)
        : []
      ).map((a) => `${a.resourceType}::${a.resourceId}`)
    );

    for (const rn of resourceNodes) {
      const isHistoricalAllocNode = initialAllocResourceIds.has(
        `${rn.resourceType}::${rn.resourceId}`
      );
      const catalogList = masterCatalogByType[rn.resourceType] || [];
      const inCatalog = catalogList.some((item) => item.id === rn.resourceId);
      if (!inCatalog && !isHistoricalAllocNode) {
        setFormError(
          `Resource validation failed: ${rn.resourceType} "${rn.identifier}" does not exist in ${targetClient}'s Master directory.`
        );
        setConfirmAction(false);
        return;
      }
      const sMs = Date.parse(rn.effectiveStartAt);
      if (Number.isNaN(sMs)) {
        setFormError(
          `Invalid Effective Start timestamp on ${rn.resourceType} ${rn.identifier}.`
        );
        setConfirmAction(false);
        return;
      }
      if (rn.mode === 'Temporal') {
        const eMs = rn.effectiveEndAt ? Date.parse(rn.effectiveEndAt) : NaN;
        if (Number.isNaN(eMs) || eMs <= sMs) {
          setFormError(
            `Temporal Effective End must be strictly after Start on ${rn.resourceType} ${rn.identifier}.`
          );
          setConfirmAction(false);
          return;
        }
      }
    }

    // Re-validate all active/scheduled Hardware Bindings at final commit
    const openDraftBindings = draftBindings.filter(
      (b) => !b.endedAt && b.statusOverride !== 'Canceled'
    );
    for (const b of openDraftBindings) {
      const check = validateHardwareBindingPair(
        b,
        members,
        openDraftBindings,
        allGlobalBindings
      );
      if (check.errors.length > 0) {
        setFormError(`Binding ${b.id} validation failed: ${check.errors[0]}`);
        setConfirmAction(false);
        return;
      }
    }

    // Re-validate all explicit Node-to-Node bindings & Resource Relationships at final commit
    const resToResBindings = explicitNodeBindings.filter(
      (eb) => eb.fromNodeId.startsWith('res::') && eb.toNodeId.startsWith('res::')
    );
    const rules = loadResourceRelationshipRules();
    const workingRels: ResourceRelationship[] = [...(store.resourceRelationships || [])];
    let relOffset = 0;

    for (const eb of explicitNodeBindings) {
      const sMs = Date.parse(eb.effectiveStartAt);
      if (Number.isNaN(sMs)) {
        setFormError(`Invalid Effective Start timestamp on relationship ${eb.relationship}.`);
        setConfirmAction(false);
        return;
      }
      if (eb.mode === 'Temporal') {
        const eMs = eb.effectiveEndAt ? Date.parse(eb.effectiveEndAt) : NaN;
        if (Number.isNaN(eMs) || eMs <= sMs) {
          setFormError(
            `Temporal Effective End must be strictly after Start on relationship ${eb.relationship}.`
          );
          setConfirmAction(false);
          return;
        }
      }
    }

    const nowIso = new Date().toISOString();

    for (let idx = 0; idx < resToResBindings.length; idx++) {
      const eb = resToResBindings[idx];
      const src = resourceNodeMap.get(eb.fromNodeId);
      const tgt = resourceNodeMap.get(eb.toNodeId);
      if (!src || !tgt) continue;

      const existingMatch = workingRels.find(
        (r) =>
          !r.endedAt &&
          r.sourceResourceType === src.resourceType &&
          r.sourceResourceId === src.resourceId &&
          r.targetResourceType === tgt.resourceType &&
          r.targetResourceId === tgt.resourceId &&
          (r.relationshipType === eb.relationship ||
            r.relationshipCode === eb.relationship.toUpperCase().replace(/[^A-Z0-9]+/g, '_'))
      );

      if (existingMatch) {
        continue;
      }

      const matchedRule =
        rules.find(
          (r) =>
            r.enabled &&
            r.sourceType === src.resourceType &&
            r.targetType === tgt.resourceType &&
            (r.label.toLowerCase() === eb.relationship.trim().toLowerCase() ||
              r.code.toLowerCase() ===
                eb.relationship.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'))
        ) ||
        rules.find(
          (r) =>
            r.enabled &&
            r.sourceType === src.resourceType &&
            r.targetType === tgt.resourceType
        );

      const relCode =
        matchedRule?.code || eb.relationship.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
      const relLabel = matchedRule?.label || eb.relationship;

      if (matchedRule) {
        const relCheck = validateResourceRelationship(
          {
            sourceResourceType: src.resourceType,
            sourceResourceId: src.resourceId,
            sourceResourceIdentifier: src.identifier,
            relationshipCode: relCode,
            relationshipType: relLabel,
            targetResourceType: tgt.resourceType,
            targetResourceId: tgt.resourceId,
            targetResourceIdentifier: tgt.identifier,
            mode: eb.mode,
            effectiveStartAt: eb.effectiveStartAt,
            effectiveEndAt: eb.mode === 'Temporal' ? eb.effectiveEndAt : null
          },
          workingRels,
          rules
        );
        if (relCheck.errors.length > 0) {
          setFormError(relCheck.errors[0]);
          setConfirmAction(false);
          return;
        }
      }

      const newRel: ResourceRelationship = {
        id: getNextResourceRelationshipId(workingRels, relOffset++),
        companyId,
        companyName: targetClient,
        sourceResourceType: src.resourceType,
        sourceResourceId: src.resourceId,
        sourceResourceIdentifier: src.identifier,
        sourceResourceDisplayName: src.displayName,
        relationshipCode: relCode,
        relationshipType: relLabel,
        targetResourceType: tgt.resourceType,
        targetResourceId: tgt.resourceId,
        targetResourceIdentifier: tgt.identifier,
        targetResourceDisplayName: tgt.displayName,
        mode: eb.mode,
        effectiveStartAt: eb.effectiveStartAt,
        effectiveEndAt: eb.mode === 'Temporal' ? eb.effectiveEndAt : null,
        timezone: eb.timezone,
        createdBy: actorName,
        createdAt: nowIso,
        updatedBy: actorName,
        updatedAt: nowIso,
        history: [
          {
            id: `relh-${Date.now()}-${idx}`,
            timestamp: nowIso,
            actor: actorName,
            action: 'Created',
            summary: `Created via ${connId}: ${src.identifier} (${relLabel}) → ${tgt.identifier}`
          }
        ]
      };
      workingRels.unshift(newRel);
    }

    // Reconcile Resource Allocations preserving existing open allocation IDs and metadata (MAP-P0-04)
    const priorOpenAllocs = initialConnection
      ? store.resourceAllocations.filter(
          (a) => a.connectionId === initialConnection.id && !a.endedAt
        )
      : [];
    const consumedPriorAllocIds = new Set<string>();
    let allocOffset = 0;

    const findAndConsumePriorAlloc = (
      resType: ResourceType,
      resId: string,
      hwId: string | null
    ): ResourceAllocation | undefined => {
      const exact = priorOpenAllocs.find(
        (a) =>
          !consumedPriorAllocIds.has(a.id) &&
          a.resourceType === resType &&
          a.resourceId === resId &&
          (a.hardwareId || null) === (hwId || null)
      );
      if (exact) {
        consumedPriorAllocIds.add(exact.id);
        return exact;
      }
      const fallbackSameResource = priorOpenAllocs.find(
        (a) =>
          !consumedPriorAllocIds.has(a.id) &&
          a.resourceType === resType &&
          a.resourceId === resId
      );
      if (fallbackSameResource) {
        consumedPriorAllocIds.add(fallbackSameResource.id);
        return fallbackSameResource;
      }
      return undefined;
    };

    const finalAllocations: ResourceAllocation[] = [];
    resourceNodes.forEach((rn) => {
      const boundHwEdges = explicitNodeBindings.filter(
        (b) => b.fromNodeId === rn.nodeId && b.toNodeId.startsWith('hw::')
      );
      if (boundHwEdges.length === 0) {
        const prior = findAndConsumePriorAlloc(rn.resourceType, rn.resourceId, null);
        finalAllocations.push({
          id:
            prior?.id ||
            getNextResourceAllocationId(
              [...store.resourceAllocations, ...finalAllocations],
              allocOffset++
            ),
          companyId,
          companyName: targetClient,
          connectionId: connId,
          resourceType: rn.resourceType,
          resourceId: rn.resourceId,
          resourceIdentifier: rn.identifier,
          resourceDisplayName: rn.displayName,
          hardwareId: null,
          mode: rn.mode,
          timezone: rn.timezone,
          effectiveStartAt: rn.effectiveStartAt,
          effectiveEndAt: rn.mode === 'Temporal' ? rn.effectiveEndAt : null,
          endedAt: null,
          site: prior?.site || site || undefined,
          notes: prior?.notes,
          assignedBy: prior?.assignedBy || actorName,
          assignedOn: prior?.assignedOn || nowIso,
          updatedAt: nowIso
        });
      } else {
        boundHwEdges.forEach((edge) => {
          const hwId = edge.toNodeId.slice(4);
          const prior = findAndConsumePriorAlloc(rn.resourceType, rn.resourceId, hwId);
          finalAllocations.push({
            id:
              prior?.id ||
              getNextResourceAllocationId(
                [...store.resourceAllocations, ...finalAllocations],
                allocOffset++
              ),
            companyId,
            companyName: targetClient,
            connectionId: connId,
            resourceType: rn.resourceType,
            resourceId: rn.resourceId,
            resourceIdentifier: rn.identifier,
            resourceDisplayName: rn.displayName,
            hardwareId: hwId,
            mode: edge.mode,
            timezone: edge.timezone,
            effectiveStartAt: edge.effectiveStartAt,
            effectiveEndAt: edge.mode === 'Temporal' ? edge.effectiveEndAt : null,
            endedAt: null,
            site: prior?.site || site || undefined,
            notes: prior?.notes,
            assignedBy: prior?.assignedBy || actorName,
            assignedOn: prior?.assignedOn || nowIso,
            updatedAt: nowIso
          });
        });
      }
    });

    // Any previously open allocation removed during Edit is preserved as ended history instead of vanished (MAP-P0-04)
    priorOpenAllocs.forEach((prior) => {
      if (!consumedPriorAllocIds.has(prior.id)) {
        finalAllocations.push({
          ...prior,
          endedAt: nowIso,
          endReason: 'Removed during connection edit',
          unassignedBy: actorName,
          updatedAt: nowIso
        });
      }
    });

    // When activating, require at least one valid active/scheduled binding or resource allocation (MAP-P0-01)
    if (actionType === 'activate') {
      const openAllocations = finalAllocations.filter((a) => !a.endedAt);
      if (openDraftBindings.length === 0 && openAllocations.length === 0) {
        setFormError(
          'Cannot activate mapping without an effective Hardware Binding or Resource Allocation. Add a binding/resource or use "Save as Draft".'
        );
        setConfirmAction(false);
        return;
      }
      if (computedTargetStatus === 'Needs Attention') {
        setFormError(
          'Cannot activate mapping while unresolved hardware or allocation conflicts exist. Resolve the conflict or save as Draft.'
        );
        setConfirmAction(false);
        return;
      }
    }

    const firstResLabel = resourceNodes[0]
      ? `${resourceNodes[0].identifier}`
      : members[0]?.identifierValue || connId;

    const updatedConn: ConnectionRecord = {
      id: connId,
      connectionId: connId,
      companyId,
      companyName: targetClient,
      name: initialConnection?.name || `${firstResLabel} · ${connId}`,
      description: initialConnection?.description || '',
      site,
      status: actionType === 'activate' ? computedTargetStatus : 'Draft',
      memberIds: members.map((m) => m.hardwareId),
      members: members.map((m) => ({ ...m, isPrimary: false })),
      version: liveVersion + 1,
      createdAt: initialConnection?.createdAt || nowIso,
      updatedAt: nowIso,
      createdBy: initialConnection?.createdBy || actorName,
      updatedBy: actorName,
      activity: initialConnection?.activity || []
    };

    const existingDevIds = new Set(store.devices.map((d) => d.id));
    const existingSenIds = new Set(store.sensors.map((s) => s.id));
    const existingSimIds = new Set(store.sims.map((s) => s.id));

    onCommit({
      connection: updatedConn,
      bindings: draftBindings,
      allocations: finalAllocations,
      resourceRelationships: workingRels,
      addedDevices: localDevices.filter((d) => !existingDevIds.has(d.id)),
      addedSensors: localSensors.filter((s) => !existingSenIds.has(s.id)),
      addedSims: localSims.filter((s) => !existingSimIds.has(s.id)),
      isEdit
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/45 backdrop-blur-[1px]">
      <div className="w-full max-w-[1120px] bg-[#F8FAFC] h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Sticky Drawer Header */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>Assets Mapping</span>
              <span>›</span>
              <span className="font-semibold text-slate-700">{targetClient}</span>
              <span>›</span>
              <span className="font-mono text-slate-600">{connId}</span>
            </div>
            <h2 className="text-[16px] font-bold text-slate-900 mt-0.5">
              {isEdit ? `Edit Mapping · ${connId}` : 'Create Mapping'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {hasVersionConflict && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[12px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Concurrent modification notice: Another user updated {connId} to version {liveVersion} while this form was open.
              </span>
            </div>
          )}

          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
              <button type="button" onClick={() => setFormError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ONE UNIFIED CONNECTION & MAPPING BUILDER SECTION */}
          <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
            {/* Header & Organization */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[14px] font-bold text-slate-900">
                    Connection &amp; Mapping Builder <span className="text-rose-600">*</span>
                  </h3>
                  <MappingInfoTooltip
                    text="Add resources (+ Vehicle, + Driver, + Fleet, + Vendor, + Place, + Equipment), then attach Devices, Sensors, and SIMs directly at the resource level."
                    align="left"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select resources at the top and add Devices, Sensors, and SIMs directly at the resource level.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Organization:</span>
                {isPlatformAdmin && !isEdit ? (
                  <select
                    value={targetClient}
                    onChange={(e) => {
                      const nextClient = e.target.value;
                      setTargetClient(nextClient);
                      if (resourceNodes.length > 0 || members.length > 0) {
                        setResourceNodes([]);
                        setMembers([]);
                        setDraftBindings([]);
                        setExplicitNodeBindings([]);
                        setFormError(null);
                      }
                    }}
                    className="h-7 px-2 rounded-md border border-slate-200 bg-white font-semibold text-slate-800 text-[11.5px]"
                  >
                    {availableOrganizations.map((org) => (
                      <option key={org} value={org}>
                        {org}
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong className="text-slate-800">{targetClient}</strong>
                )}
              </div>
            </div>

            {/* Unified Resource Chips Bar */}
            <div className="flex items-center justify-between gap-2.5 flex-wrap pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    setResourcePickerState({
                      resourceType: 'Vehicle'
                    })
                  }
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[12px] font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  <Truck className="w-3.5 h-3.5" /> + Vehicle
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setResourcePickerState({
                      resourceType: 'Driver'
                    })
                  }
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[12px] font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  <User className="w-3.5 h-3.5" /> + Driver
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setResourcePickerState({
                      resourceType: 'Fleet'
                    })
                  }
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[12px] font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" /> + Fleet
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setResourcePickerState({
                      resourceType: 'Vendor'
                    })
                  }
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-[12px] font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  <Store className="w-3.5 h-3.5" /> + Vendor
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setResourcePickerState({
                      resourceType: 'Place'
                    })
                  }
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[12px] font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" /> + Place
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setResourcePickerState({
                      resourceType: 'Equipment'
                    })
                  }
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 text-[12px] font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5" /> + Equipment
                </button>
              </div>
            </div>

            {/* Hierarchical Lined Tree Table */}
            {unifiedTreeRows.length === 0 ? (
              <div className="space-y-3">
                {/* Main Dashed Empty State Card */}
                <div className="rounded-xl border border-dashed border-slate-300 bg-[#FAFBFD] px-6 py-7 flex flex-col md:flex-row items-center justify-between gap-8">
                  {/* Left: Visual Connected Node Hierarchy Illustration */}
                  <div className="relative flex-1 flex items-center justify-center min-h-[195px] w-full max-w-[360px] select-none">
                    {/* Soft organic peach backdrop */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-4 top-3 bottom-1 rounded-[48%_52%_58%_42%/54%_44%_56%_46%] bg-[#FFF4EE]/75 pointer-events-none"
                    />

                    <div className="relative z-10 flex flex-col items-start">
                      {/* Level 0: Vehicle */}
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-200/90 bg-gradient-to-b from-white to-sky-50/90 shadow-xs text-[12px] font-bold text-slate-800">
                        <Truck className="w-3.5 h-3.5 text-sky-600" />
                        <span>Vehicle</span>
                      </div>

                      {/* Level 1 branches under Vehicle */}
                      <div className="relative ml-7 pl-9 pt-3 space-y-3">
                        {/* Vertical trunk from Vehicle down to Device */}
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-0 bottom-[18px] w-px bg-slate-300"
                        />

                        {/* Branch 1: Driver */}
                        <div className="relative flex items-center">
                          <span
                            aria-hidden="true"
                            className="absolute -left-9 top-1/2 -translate-y-1/2 w-7 h-px bg-slate-300"
                          />
                          <span
                            aria-hidden="true"
                            className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-slate-400 bg-white"
                          />
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-200/90 bg-gradient-to-b from-white to-purple-50/90 shadow-xs text-[12px] font-bold text-slate-800">
                            <User className="w-3.5 h-3.5 text-purple-600" />
                            <span>Driver</span>
                          </div>
                        </div>

                        {/* Branch 2: Device + Level 2 sub-branches */}
                        <div className="relative">
                          <div className="relative flex items-center">
                            <span
                              aria-hidden="true"
                              className="absolute -left-9 top-1/2 -translate-y-1/2 w-7 h-px bg-slate-300"
                            />
                            <span
                              aria-hidden="true"
                              className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-slate-400 bg-white"
                            />
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-200/90 bg-gradient-to-b from-white to-sky-50/90 shadow-xs text-[12px] font-bold text-slate-800">
                              <Cpu className="w-3.5 h-3.5 text-sky-600" />
                              <span>Device</span>
                            </div>
                          </div>

                          {/* Level 2 branches under Device */}
                          <div className="relative ml-7 pl-9 pt-3 space-y-3">
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-0 bottom-[18px] w-px bg-slate-300"
                            />

                            {/* Sub-branch: Sensor */}
                            <div className="relative flex items-center">
                              <span
                                aria-hidden="true"
                                className="absolute -left-9 top-1/2 -translate-y-1/2 w-7 h-px bg-slate-300"
                              />
                              <span
                                aria-hidden="true"
                                className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-slate-400 bg-white"
                              />
                              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-200/90 bg-gradient-to-b from-white to-purple-50/90 shadow-xs text-[12px] font-bold text-slate-800">
                                <Radio className="w-3.5 h-3.5 text-purple-600" />
                                <span>Sensor</span>
                              </div>
                            </div>

                            {/* Sub-branch: SIM */}
                            <div className="relative flex items-center">
                              <span
                                aria-hidden="true"
                                className="absolute -left-9 top-1/2 -translate-y-1/2 w-7 h-px bg-slate-300"
                              />
                              <span
                                aria-hidden="true"
                                className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-slate-400 bg-white"
                              />
                              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-200/90 bg-gradient-to-b from-white to-emerald-50/90 shadow-xs text-[12px] font-bold text-slate-800">
                                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                                <span>SIM</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Prompt & Primary CTA */}
                  <div className="flex-1 text-center space-y-3 max-w-[440px]">
                    <div className="w-10 h-10 rounded-full bg-[#FFF3EE] text-[#F26522] inline-flex items-center justify-center mx-auto">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-[15px] font-bold text-slate-900">
                        Start building your asset mapping
                      </h4>
                      <p className="text-[12px] text-slate-500 leading-relaxed">
                        Add resources (e.g., Vehicle, Driver, Fleet, Vendor, Place, Equipment) and
                        hardware (e.g., Device, Sensor, SIM), then create bindings between any two
                        nodes to define their relationship, validity, and operational context.
                      </p>
                    </div>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setResourcePickerState({
                            resourceType: 'Vehicle',
                            allowTypeSwitch: true
                          })
                        }
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#F26522] hover:bg-[#d95417] text-white text-[12.5px] font-semibold cursor-pointer shadow-xs transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add Your First Node
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom: How it works? 3-step Guide Strip */}
                <div className="px-4 py-3 rounded-xl border border-slate-100 bg-white flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="text-[12px] font-bold text-slate-800 whitespace-nowrap lg:pr-5 lg:border-r lg:border-slate-200 shrink-0">
                    How it works?
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FFF3EE] text-[#F26522] text-[11px] font-bold inline-flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold text-slate-900">
                          Add Resources &amp; Hardware
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Select and add required nodes.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FFF3EE] text-[#F26522] text-[11px] font-bold inline-flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold text-slate-900">
                          Create Bindings
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Define relationships between any two nodes (e.g., Vehicle ↔ Device, Vehicle ↔ Driver).
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FFF3EE] text-[#F26522] text-[11px] font-bold inline-flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold text-slate-900">
                          Activate Mapping
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Review and activate to make the mapping live.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
                <table className="w-full border-collapse text-left text-[11.5px]">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 w-10">#</th>
                      <th className="px-3 py-2 min-w-[270px]">Mapping / Node Hierarchy</th>
                      <th className="px-2.5 py-2 min-w-[105px]">Type</th>
                      <th className="px-2.5 py-2 min-w-[95px]">Validity</th>
                      <th className="px-2.5 py-2 min-w-[130px]">Effective Window</th>
                      <th className="px-3 py-2 text-right min-w-[165px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unifiedTreeRows.map((row) => {
                      const isDevice = row.nodeType === 'Device';
                      const isSensor = row.nodeType === 'Sensor';
                      const isResource = row.kind === 'resource';

                      const canEditBinding =
                        (!!row.hardwareBinding && !!row.hardwareMember) || !!row.explicitBinding;
                      const handleEditRowBinding = () => {
                        if (row.hardwareBinding && row.hardwareMember) {
                          setComposerState({
                            mode: 'edit-binding',
                            category: row.hardwareMember.category,
                            editingBinding: row.hardwareBinding
                          });
                        } else if (row.explicitBinding) {
                          openEditExplicitBinding(row.explicitBinding);
                        }
                      };

                      return (
                        <tr key={row.rowKey} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2 text-slate-500 tabular-nums font-medium align-middle">
                            {row.rowNumber}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <div className="flex items-center">
                              {row.depth > 0 && (
                                <div className="flex items-center shrink-0 mr-1.5">
                                  {row.ancestorHasNext.map((hasNext, idx) => (
                                    <div key={idx} className="w-4 h-8 relative shrink-0">
                                      {hasNext && <span className="absolute left-2 top-0 bottom-0 w-px bg-slate-300" />}
                                    </div>
                                  ))}
                                  <div className="w-5 h-8 relative shrink-0 mr-1">
                                    <span
                                      className={`absolute left-2 top-0 w-px bg-slate-300 ${
                                        row.isLastSibling ? 'h-4' : 'bottom-0'
                                      }`}
                                    />
                                    <span className="absolute left-2 top-4 w-2.5 h-px bg-slate-300" />
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-2 min-w-0">
                                {isResource ? (
                                  <span
                                    className={`w-7 h-7 rounded-lg border inline-flex items-center justify-center shrink-0 ${nodeTypePillClass(
                                      row.nodeType
                                    )}`}
                                  >
                                    <ResourceBadgeIcon
                                      type={row.nodeType as ResourceType}
                                      className="w-3.5 h-3.5"
                                    />
                                  </span>
                                ) : (
                                  <HardwareUnitIcon
                                    category={row.nodeType as HardwareCategory}
                                    modelLabel={row.subtitle}
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                    <span className="font-mono">{row.identifier}</span>
                                  </div>
                                  <div className="text-[10.5px] text-slate-500 truncate">{row.subtitle}</div>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2.5 py-2 align-middle">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10.5px] font-bold ${nodeTypePillClass(
                                row.nodeType
                              )}`}
                            >
                              {row.nodeType}
                            </span>
                          </td>
                          <td className="px-2.5 py-2 align-middle whitespace-nowrap">
                            {row.depth === 0 ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span
                                role={canEditBinding ? 'button' : undefined}
                                tabIndex={canEditBinding ? 0 : undefined}
                                onClick={canEditBinding ? handleEditRowBinding : undefined}
                                onKeyDown={
                                  canEditBinding
                                    ? (e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          handleEditRowBinding();
                                        }
                                      }
                                    : undefined
                                }
                                title={canEditBinding ? 'Click to edit binding validity & dates' : undefined}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10.5px] font-bold transition-all ${
                                  row.mode === 'Permanent'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                } ${canEditBinding ? 'cursor-pointer hover:ring-2 hover:ring-[#F26522]/30' : ''}`}
                              >
                                {row.mode === 'Permanent' ? (
                                  <InfinityIcon className="w-3 h-3" />
                                ) : (
                                  <Clock className="w-3 h-3" />
                                )}
                                {row.mode}
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-2 align-middle text-[10.5px] text-slate-600 whitespace-nowrap">
                            {row.depth === 0 ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <div
                                role={canEditBinding ? 'button' : undefined}
                                onClick={canEditBinding ? handleEditRowBinding : undefined}
                                className={canEditBinding ? 'cursor-pointer hover:text-slate-900' : undefined}
                                title={canEditBinding ? 'Click to edit effective window' : undefined}
                              >
                                <div>{formatDateTimeWithTz(row.effectiveStartAt, row.timezone)}</div>
                                <div className="text-slate-400">
                                  {row.mode === 'Temporal' && row.effectiveEndAt
                                    ? `to ${formatDateTimeWithTz(row.effectiveEndAt, row.timezone)}`
                                    : 'Open-ended'}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right align-middle whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              {isResource && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setComposerState({
                                        mode: 'add-hardware',
                                        category: 'Device',
                                        parentHardwareId: null,
                                        parentResourceNodeId: row.nodeId
                                      })
                                    }
                                    className="px-1.5 py-0.5 rounded border border-[#F26522]/30 bg-[#FFF3EE] hover:bg-[#ffe5db] text-[#F26522] text-[10px] font-semibold cursor-pointer"
                                  >
                                    + Device
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setComposerState({
                                        mode: 'add-hardware',
                                        category: 'Sensor',
                                        parentHardwareId: null,
                                        parentResourceNodeId: row.nodeId
                                      })
                                    }
                                    className="px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-semibold cursor-pointer"
                                  >
                                    + Sensor
                                  </button>
                                </>
                              )}
                              {isDevice && row.hardwareMember && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setComposerState({
                                        mode: 'add-hardware',
                                        category: 'Sensor',
                                        parentHardwareId: row.hardwareMember!.hardwareId
                                      })
                                    }
                                    className="px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-semibold cursor-pointer"
                                  >
                                    + Sensor
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setComposerState({
                                        mode: 'add-hardware',
                                        category: 'SIM',
                                        parentHardwareId: row.hardwareMember!.hardwareId
                                      })
                                    }
                                    className="px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-semibold cursor-pointer"
                                  >
                                    + SIM
                                  </button>
                                </>
                              )}
                              {isSensor && row.hardwareMember && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setComposerState({
                                      mode: 'add-hardware',
                                      category: 'SIM',
                                      parentHardwareId: row.hardwareMember!.hardwareId
                                    })
                                  }
                                  className="px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-semibold cursor-pointer"
                                >
                                  + SIM
                                </button>
                              )}
                              {canEditBinding && (
                                <button
                                  type="button"
                                  onClick={handleEditRowBinding}
                                  className="p-1 rounded text-slate-400 hover:text-[#F26522] cursor-pointer"
                                  title="Edit binding validity & dates"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isResource) handleRemoveResourceNode(row.nodeId);
                                  else if (row.hardwareMember) handleRequestRemoveMember(row.hardwareMember);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Remove node"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[12px] font-semibold text-slate-700 cursor-pointer shadow-xs"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => executeCommit('draft')}
              className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[12px] font-semibold text-slate-700 cursor-pointer shadow-xs"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction(true)}
              className="h-9 px-4.5 rounded-lg bg-[#F26522] hover:bg-[#d95417] text-white text-[12px] font-bold cursor-pointer shadow-xs"
            >
              Activate Mapping
            </button>
          </div>
        </div>
      </div>

      {/* Resource Search & Select Modal (Opened on + Vehicle, + Driver, + Fleet, + Vendor, + Place, + Equipment) */}
      {resourcePickerState && (
        <ResourceSelectionModal
          initialResourceType={resourcePickerState.resourceType}
          allowTypeSwitch={resourcePickerState.allowTypeSwitch}
          connId={connId}
          targetClient={targetClient}
          catalogByType={masterCatalogByType}
          alreadyAddedResourceKeys={alreadyAddedResourceKeys}
          preselectedItemId={resourcePickerState.preselectedItemId || null}
          onOpenCreateNew={openCreateNewFromPicker}
          onSelect={handleResourceSelected}
          onClose={() => setResourcePickerState(null)}
        />
      )}

      {/* Nested Hardware Composition & Binding Drawer */}
      {composerState && (
        <HardwareCompositionModal
          mode={composerState.mode}
          category={composerState.category}
          initialParentId={composerState.parentHardwareId}
          parentResourceLabel={
            composerState.parentResourceNodeId
              ? (() => {
                  const res = resourceNodeMap.get(composerState.parentResourceNodeId);
                  return res ? `${res.resourceType} · ${res.identifier}` : null;
                })()
              : null
          }
          editingBinding={composerState.editingBinding}
          connId={connId}
          targetClient={targetClient}
          site={site}
          enabledModels={enabledModels}
          members={members}
          draftBindings={draftBindings}
          allGlobalBindings={allGlobalBindings}
          allConnections={store.connections}
          allAllocations={store.resourceAllocations}
          localDevices={localDevices}
          localSensors={localSensors}
          localSims={localSims}
          defaultBinding={lastBindingDefaults}
          onQuickRegisterHardware={(unit) => {
            if (unit.device) {
              setLocalDevices((prev) =>
                prev.some((d) => d.id === unit.device!.id) ? prev : [unit.device!, ...prev]
              );
            }
            if (unit.sensor) {
              setLocalSensors((prev) =>
                prev.some((s) => s.id === unit.sensor!.id) ? prev : [unit.sensor!, ...prev]
              );
            }
            if (unit.sim) {
              setLocalSims((prev) =>
                prev.some((s) => s.id === unit.sim!.id) ? prev : [unit.sim!, ...prev]
              );
            }
            onQuickRegisterHardware?.(unit);
            const label =
              unit.device?.deviceId || unit.sensor?.deviceId || unit.sim?.iccid || 'Hardware';
            showToast(`Registered ${label} under ${targetClient} & selected.`);
          }}
          onSave={handleCompositionSave}
          onClose={() => setComposerState(null)}
        />
      )}

      {/* Confirmation Summary Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[98] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-slate-900">
                Confirm Activation · {connId}
              </h3>
              <button
                type="button"
                onClick={() => setConfirmAction(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-[12px]">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div>
                  <span className="font-semibold text-slate-600">Connection:</span>{' '}
                  <strong className="text-slate-900">{connId}</strong> ({targetClient} · {site})
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Resources Added:</span>{' '}
                  {resourceNodes.length > 0
                    ? resourceNodes.map((r) => `${r.resourceType} (${r.identifier})`).join(', ')
                    : 'None'}
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Hardware:</span>{' '}
                  {members.filter((m) => m.category === 'Device').length} Device(s),{' '}
                  {members.filter((m) => m.category === 'Sensor').length} Sensor(s),{' '}
                  {members.filter((m) => m.category === 'SIM').length} SIM(s)
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Explicit Bindings:</span>{' '}
                  {summaryRows.length} pairwise binding(s)
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Target Status:</span>{' '}
                  <strong className="text-emerald-700">{computedTargetStatus}</strong>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setConfirmAction(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmAction(false);
                  executeCommit('activate');
                }}
                className="h-8 px-4 rounded-lg bg-[#F26522] hover:bg-[#d95417] text-white text-[12px] font-bold cursor-pointer"
              >
                Confirm &amp; Save Mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEPARATE CREATE FLOWS (Triggered ONLY from inside ResourceSelectionModal) */}
      <VehicleDrawer
        isOpen={createNewResourceState?.resourceType === 'Vehicle'}
        onClose={() => setCreateNewResourceState(null)}
        mode="create"
        initialVehicle={
          createNewResourceState?.searchSeed
            ? ({ registration_number: createNewResourceState.searchSeed } as Vehicle)
            : null
        }
        onSaveVehicle={handleCreatedVehicle}
        existingVehicles={vehicles}
        companyContext={targetClient}
        zIndexClass="z-[120]"
      />
      <DriverDrawer
        isOpen={createNewResourceState?.resourceType === 'Driver'}
        onClose={() => setCreateNewResourceState(null)}
        mode="create"
        initialDriver={
          createNewResourceState?.searchSeed
            ? ({ phone: createNewResourceState.searchSeed } as Driver)
            : null
        }
        onSaveDriver={handleCreatedDriver}
        existingDrivers={drivers}
        companyContext={targetClient}
        zIndexClass="z-[120]"
      />
      <FleetDrawer
        isOpen={createNewResourceState?.resourceType === 'Fleet'}
        mode="create"
        initialFleet={
          createNewResourceState?.searchSeed
            ? ({ name: createNewResourceState.searchSeed } as Fleet)
            : null
        }
        allFleets={fleets}
        onClose={() => setCreateNewResourceState(null)}
        onSaveFleet={handleCreatedFleet}
        zIndexClass="z-[120]"
      />

      {/* Separate Create Modal for Vendor, Place, Equipment */}
      {createNewResourceState &&
        (createNewResourceState.resourceType === 'Vendor' ||
          createNewResourceState.resourceType === 'Place' ||
          createNewResourceState.resourceType === 'Equipment') && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4">
            <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#FFF3EE] border border-[#F26522]/25 flex items-center justify-center">
                    <ResourceBadgeIcon
                      type={createNewResourceState.resourceType}
                      className="w-3.5 h-3.5"
                    />
                  </div>
                  <h3 className="text-[14px] font-bold text-slate-900">
                    Create &amp; Register {createNewResourceState.resourceType}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateNewResourceState(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3 text-[12px]">
                {createSimpleError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{createSimpleError}</span>
                  </div>
                )}

                {createNewResourceState.resourceType === 'Vendor' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Vendor Name *</label>
                      <input
                        type="text"
                        autoFocus
                        value={newVendorName}
                        onChange={(e) => setNewVendorName(e.target.value)}
                        placeholder="e.g. Bharat Logistics Pvt Ltd"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#F26522]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Vendor Type</label>
                        <select
                          value={newVendorType}
                          onChange={(e) => setNewVendorType(e.target.value as VendorTypeKey)}
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white"
                        >
                          {VENDOR_TYPE_CATALOG.map((vt) => (
                            <option key={vt.key} value={vt.key}>
                              {vt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                        <input
                          type="text"
                          value={newVendorPhone}
                          onChange={(e) => setNewVendorPhone(e.target.value)}
                          placeholder="+91 98..."
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#F26522]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={newVendorCity}
                        onChange={(e) => setNewVendorCity(e.target.value)}
                        placeholder="Mundra"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#F26522]"
                      />
                    </div>
                  </>
                )}

                {createNewResourceState.resourceType === 'Place' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Place Name *</label>
                      <input
                        type="text"
                        autoFocus
                        value={newPlaceName}
                        onChange={(e) => setNewPlaceName(e.target.value)}
                        placeholder="e.g. CT2 Yard Gate"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#F26522]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Address / Zone *</label>
                      <input
                        type="text"
                        value={newPlaceAddress}
                        onChange={(e) => setNewPlaceAddress(e.target.value)}
                        placeholder="e.g. Adani Mundra Port Terminal 2"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#F26522]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Country</label>
                      <select
                        value={newPlaceCountry}
                        onChange={(e) => setNewPlaceCountry(e.target.value as VendorCountry)}
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white"
                      >
                        {VENDOR_COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {createNewResourceState.resourceType === 'Equipment' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Equipment Code *</label>
                      <input
                        type="text"
                        autoFocus
                        value={newEqpCode}
                        onChange={(e) => setNewEqpCode(e.target.value)}
                        placeholder="e.g. EQ-TRK-001"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#F26522]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Equipment Name *</label>
                      <input
                        type="text"
                        value={newEqpName}
                        onChange={(e) => setNewEqpName(e.target.value)}
                        placeholder="e.g. Hydraulic Container Crane"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#F26522]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Category</label>
                        <input
                          type="text"
                          value={newEqpCategory}
                          onChange={(e) => setNewEqpCategory(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#F26522]"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Site / Yard</label>
                        <select
                          value={newEqpSite}
                          onChange={(e) => setNewEqpSite(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white"
                        >
                          {MODAL_LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateNewResourceState(null)}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateSimpleResource}
                  className="h-8 px-4 rounded-lg bg-[#F26522] hover:bg-[#d95417] text-white text-[12px] font-bold cursor-pointer"
                >
                  Save &amp; Select
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Edit Resource <-> Hardware Binding Modal */}
      {editingExplicitBinding && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/45 backdrop-blur-[1px] p-4">
          <div className="w-full max-w-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-[#FFF3EE] border border-[#F26522]/25 inline-flex items-center justify-center shrink-0">
                  <Link2 className="w-3.5 h-3.5 text-[#F26522]" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold text-slate-900 truncate">
                    Edit Binding Validity &amp; Window
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {editingExplicitBinding.fromLabel} → {editingExplicitBinding.toLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingExplicitBinding(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-[12px]">
              {editingExplicitBinding.error && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{editingExplicitBinding.error}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Relationship Label</label>
                <input
                  type="text"
                  value={editingExplicitBinding.relationship}
                  onChange={(e) =>
                    setEditingExplicitBinding((prev) =>
                      prev ? { ...prev, relationship: e.target.value } : prev
                    )
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-[#F26522]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Binding Mode *</label>
                  <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-200/70">
                    {(['Permanent', 'Temporal'] as HardwareBindingMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setEditingExplicitBinding((prev) =>
                            prev ? { ...prev, mode: m, error: null } : prev
                          )
                        }
                        className={`h-8 rounded-md text-[11.5px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                          editingExplicitBinding.mode === m
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {m === 'Permanent' ? (
                          <InfinityIcon className="w-3.5 h-3.5 text-sky-600" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-[#F26522]" />
                        )}
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Timezone</label>
                  <select
                    value={editingExplicitBinding.timezone}
                    onChange={(e) =>
                      setEditingExplicitBinding((prev) =>
                        prev ? { ...prev, timezone: e.target.value } : prev
                      )
                    }
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-[11.5px]"
                  >
                    {SUPPORTED_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Effective Start Date &amp; Time *
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="date"
                      value={editingExplicitBinding.startDate}
                      onChange={(e) =>
                        setEditingExplicitBinding((prev) =>
                          prev ? { ...prev, startDate: e.target.value, error: null } : prev
                        )
                      }
                      className="w-[125px] h-9 px-2 rounded-lg border border-slate-200 bg-white text-[11px]"
                    />
                    <input
                      type="time"
                      step="1"
                      value={editingExplicitBinding.startTime}
                      onChange={(e) =>
                        setEditingExplicitBinding((prev) =>
                          prev ? { ...prev, startTime: e.target.value, error: null } : prev
                        )
                      }
                      className="flex-1 h-9 px-2 rounded-lg border border-slate-200 bg-white text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Effective End Date &amp; Time {editingExplicitBinding.mode === 'Temporal' && '*'}
                  </label>
                  {editingExplicitBinding.mode === 'Permanent' ? (
                    <div className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 flex items-center text-[11px]">
                      Empty (Open-ended Permanent)
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="date"
                        value={editingExplicitBinding.endDate}
                        onChange={(e) =>
                          setEditingExplicitBinding((prev) =>
                            prev ? { ...prev, endDate: e.target.value, error: null } : prev
                          )
                        }
                        className="w-[125px] h-9 px-2 rounded-lg border border-slate-200 bg-white text-[11px]"
                      />
                      <input
                        type="time"
                        step="1"
                        value={editingExplicitBinding.endTime}
                        onChange={(e) =>
                          setEditingExplicitBinding((prev) =>
                            prev ? { ...prev, endTime: e.target.value, error: null } : prev
                          )
                        }
                        className="flex-1 h-9 px-2 rounded-lg border border-slate-200 bg-white text-[11px]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingExplicitBinding(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExplicitBindingEdit}
                className="h-8 px-4 rounded-lg bg-[#F26522] hover:bg-[#d95417] text-white text-[12px] font-bold cursor-pointer"
              >
                Save Binding
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
