import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  X,
  Eye,
  Edit2,
  Trash2,
  History,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Truck,
  User,
  Layers,
  Building2,
  MapPin,
  Wrench,
  Settings2,
  StopCircle,
  Infinity as InfinityIcon,
  Clock,
  Link2
} from 'lucide-react';
import { RowActionMenu } from '../common/RowActionMenu';
import {
  ModalMasterStore,
  ResourceType,
  ResourceAllocation,
  HardwareBindingMode,
  ResourceRelationship,
  ResourceRelationshipRule,
  ResourceRelationshipStatus,
  RESOURCE_TYPES,
  SUPPORTED_TIMEZONES,
  COMPANY_NAME_TO_ID,
  loadModalMasterStore,
  saveModalMasterStore,
  loadResourceRelationshipRules,
  saveResourceRelationshipRules,
  getAvailableRelationshipRules,
  computeResourceRelationshipStatus,
  validateResourceRelationship,
  formatDateTimeWithTz,
  formatLocalInputParts,
  buildIsoWithTimezone
} from '../../types/modalMaster';
import { Vehicle, loadVehicleMasterStore } from '../../types/vehicle';
import { Driver, loadDriverMasterStore } from '../../types/driver';
import { Fleet, INITIAL_DEMO_FLEETS } from '../../types/fleet';
import {
  VendorRecord,
  PlaceRecord,
  INITIAL_DEMO_PLACES,
  VENDOR_MASTER_STORAGE_KEY,
  loadCanonicalVendors
} from '../../data/vendorsSeed';

export interface MasterResourceItem {
  id: string;
  resourceType: ResourceType;
  identifier: string;
  displayName: string;
  company: string;
  subtitle: string;
  status: string;
  details: Record<string, string>;
}

const CANONICAL_EQUIPMENT_MASTER: {
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

export function ResourceTypeIcon({ type, className = 'w-3.5 h-3.5' }: { type: ResourceType; className?: string }) {
  if (type === 'Vehicle') return <Truck className={`${className} text-sky-600`} />;
  if (type === 'Driver') return <User className={`${className} text-purple-600`} />;
  if (type === 'Fleet') return <Layers className={`${className} text-indigo-600`} />;
  if (type === 'Vendor') return <Building2 className={`${className} text-[#F26522]`} />;
  if (type === 'Place') return <MapPin className={`${className} text-emerald-600`} />;
  return <Wrench className={`${className} text-amber-600`} />;
}

interface ResourceRelationshipsPanelProps {
  targetClient: string;
  actorName: string;
  store: ModalMasterStore;
  selectedAllocations: ResourceAllocation[];
  onGoToHardwareResource?: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ResourceRelationshipsPanel: React.FC<ResourceRelationshipsPanelProps> = ({
  targetClient,
  actorName,
  store,
  selectedAllocations,
  onGoToHardwareResource,
  showToast
}) => {
  // Live master pools
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadVehicleMasterStore());
  const [drivers, setDrivers] = useState<Driver[]>(() => loadDriverMasterStore());
  const [vendors, setVendors] = useState<VendorRecord[]>(() => loadCanonicalVendors());
  const [places, setPlaces] = useState<PlaceRecord[]>(() => loadMasterPlaces());
  const [fleets] = useState<Fleet[]>(() => INITIAL_DEMO_FLEETS);

  // Relationships & configurable rules state
  const [relationships, setRelationships] = useState<ResourceRelationship[]>(
    () => store.resourceRelationships || loadModalMasterStore().resourceRelationships || []
  );
  const [rules, setRules] = useState<ResourceRelationshipRule[]>(() => loadResourceRelationshipRules());

  useEffect(() => {
    setRelationships(store.resourceRelationships || []);
  }, [store.resourceRelationships]);

  useEffect(() => {
    const syncMasters = () => {
      setVehicles(loadVehicleMasterStore());
      setDrivers(loadDriverMasterStore());
      setVendors(loadCanonicalVendors());
      setPlaces(loadMasterPlaces());
    };
    window.addEventListener('fleetrobo:resources-updated', syncMasters);
    window.addEventListener('fleetrobo:vendors-updated', syncMasters);
    return () => {
      window.removeEventListener('fleetrobo:resources-updated', syncMasters);
      window.removeEventListener('fleetrobo:vendors-updated', syncMasters);
    };
  }, []);

  const persistRelationships = (nextRels: ResourceRelationship[]) => {
    setRelationships(nextRels);
    const latest = loadModalMasterStore();
    saveModalMasterStore({
      ...latest,
      resourceRelationships: nextRels
    });
  };

  // Build unified Master catalog keyed by ResourceType (no duplicate records)
  const masterCatalogByType = useMemo(() => {
    const normClient = targetClient.trim().toLowerCase();
    const isAdaniClient = normClient.includes('adani');
    const matchesClient = (comp?: string) => {
      const c = (comp || '').trim().toLowerCase();
      if (!c) return true;
      if (c === normClient) return true;
      if (isAdaniClient && c.includes('adani')) return true;
      return false;
    };

    const prioritizeClient = (list: MasterResourceItem[]) =>
      [...list].sort((a, b) => {
        const aMatch = matchesClient(a.company) ? 0 : 1;
        const bMatch = matchesClient(b.company) ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return a.displayName.localeCompare(b.displayName);
      });

    const vehicleItems: MasterResourceItem[] = prioritizeClient(
      vehicles.map((v) => ({
        id: v.id,
        resourceType: 'Vehicle',
        identifier: v.registration_number,
        displayName: `${v.machine_model || v.model || 'Vehicle'} · ${v.registration_number}`,
        company: v.company || v.client || 'Adani Port',
        subtitle: `${v.public_id} · ${v.transporter || 'No Transporter'} · ${v.status}`,
        status: v.status,
        details: {
          'Master ID': v.id,
          'Public ID': v.public_id,
          'Registration No.': v.registration_number,
          Model: v.machine_model || v.model || '—',
          Company: v.company || v.client || '—',
          Transporter: v.transporter || '—',
          Status: v.status
        }
      }))
    );

    const driverItems: MasterResourceItem[] = prioritizeClient(
      drivers.map((d) => {
        const formattedPhone = d.phone.startsWith('+') ? d.phone : `+91 ${d.phone}`;
        return {
          id: d.id,
          resourceType: 'Driver',
          identifier: formattedPhone,
          displayName: d.name,
          company: d.company || 'Adani Port',
          subtitle: `${d.licence} · ${d.transporter} · ${d.status}`,
          status: d.status,
          details: {
            'Master ID': d.id,
            Name: d.name,
            'Contact No.': formattedPhone,
            'Licence No.': d.licence,
            Company: d.company || '—',
            Transporter: d.transporter || '—',
            Status: d.status
          }
        };
      })
    );

    const fleetItems: MasterResourceItem[] = prioritizeClient(
      fleets.map((f) => ({
        id: f.id,
        resourceType: 'Fleet',
        identifier: f.public_id,
        displayName: f.name,
        company: f.company || 'Adani Port',
        subtitle: `${f.public_id} · ${f.service_area || 'General'}${f.zone ? ` · ${f.zone}` : ''} · ${f.status}`,
        status: f.status,
        details: {
          'Master ID': f.id,
          'Public ID': f.public_id,
          'Fleet Name': f.name,
          'Service Area': f.service_area || '—',
          Zone: f.zone || '—',
          Vendor: f.vendor || '—',
          Status: f.status
        }
      }))
    );

    const vendorItems: MasterResourceItem[] = prioritizeClient(
      vendors.map((v) => ({
        id: v.id,
        resourceType: 'Vendor',
        identifier: v.public_id,
        displayName: v.name,
        company: v.company_name || 'Shared Vendor Master',
        subtitle: `${v.public_id} · ${v.type.toUpperCase()} · ${v.status}`,
        status: v.status,
        details: {
          'Master ID': v.id,
          'Public ID': v.public_id,
          'Vendor Name': v.name,
          Type: v.type,
          'Contact Phone': v.phone || v.contacts_extra?.contact_no || '—',
          'Primary Location': [v.registered_address?.city, v.registered_address?.state, v.country].filter(Boolean).join(', ') || '—',
          Status: v.status
        }
      }))
    );

    const placeItems: MasterResourceItem[] = places.map((p) => ({
      id: p.id,
      resourceType: 'Place',
      identifier: p.id.toUpperCase(),
      displayName: p.name,
      company: 'Facility & Place Master',
      subtitle: `${p.id.toUpperCase()} · ${p.address}`,
      status: 'Active',
      details: {
        'Master ID': p.id,
        'Place Name': p.name,
        Address: p.address,
        Country: p.country
      }
    }));

    const allocEquipmentMap = new Map<string, MasterResourceItem>();
    CANONICAL_EQUIPMENT_MASTER.forEach((eq) => {
      allocEquipmentMap.set(eq.id, {
        id: eq.id,
        resourceType: 'Equipment',
        identifier: eq.code,
        displayName: eq.name,
        company: targetClient,
        subtitle: `${eq.code} · ${eq.category} · ${eq.site}`,
        status: eq.status,
        details: {
          'Master ID': eq.id,
          'Equipment Code': eq.code,
          Name: eq.name,
          Category: eq.category,
          Site: eq.site,
          Status: eq.status
        }
      });
    });
    store.resourceAllocations
      .filter((a) => a.resourceType === 'Equipment')
      .forEach((a) => {
        if (!allocEquipmentMap.has(a.resourceId)) {
          allocEquipmentMap.set(a.resourceId, {
            id: a.resourceId,
            resourceType: 'Equipment',
            identifier: a.resourceIdentifier,
            displayName: a.resourceDisplayName,
            company: a.companyName,
            subtitle: `${a.resourceIdentifier} · ${a.companyName}`,
            status: 'Active',
            details: {
              'Master ID': a.resourceId,
              Identifier: a.resourceIdentifier,
              'Display Name': a.resourceDisplayName,
              Organization: a.companyName
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
      Equipment: Array.from(allocEquipmentMap.values())
    } as Record<ResourceType, MasterResourceItem[]>;
  }, [vehicles, drivers, fleets, vendors, places, store.resourceAllocations, targetClient]);

  // Build catalog strictly from resources selected in Step 3 (Hardware -> Resource), enriched with Master details
  const { selectedResources, selectedCatalogByType } = useMemo(() => {
    const dedup = new Map<string, MasterResourceItem>();
    const byType: Record<ResourceType, MasterResourceItem[]> = {
      Vehicle: [],
      Driver: [],
      Fleet: [],
      Vendor: [],
      Place: [],
      Equipment: []
    };

    selectedAllocations.forEach((alloc) => {
      const key = `${alloc.resourceType}::${alloc.resourceId}::${alloc.resourceIdentifier.toLowerCase()}`;
      if (dedup.has(key)) return;

      const pool = masterCatalogByType[alloc.resourceType] || [];
      const masterMatch = pool.find(
        (m) =>
          m.id === alloc.resourceId ||
          m.identifier.trim().toLowerCase() === alloc.resourceIdentifier.trim().toLowerCase()
      );

      const item: MasterResourceItem = masterMatch
        ? {
            ...masterMatch,
            id: masterMatch.id || alloc.resourceId,
            identifier: alloc.resourceIdentifier || masterMatch.identifier,
            displayName: alloc.resourceDisplayName || masterMatch.displayName
          }
        : {
            id: alloc.resourceId,
            resourceType: alloc.resourceType,
            identifier: alloc.resourceIdentifier,
            displayName: alloc.resourceDisplayName || alloc.resourceIdentifier,
            company: alloc.companyName || targetClient,
            subtitle: `${alloc.resourceType} · Selected in Step 3`,
            status: 'Active',
            details: {
              'Master ID': alloc.resourceId,
              Type: alloc.resourceType,
              Identifier: alloc.resourceIdentifier,
              'Display Name': alloc.resourceDisplayName || alloc.resourceIdentifier,
              Organization: alloc.companyName || targetClient
            }
          };

      dedup.set(key, item);
      byType[alloc.resourceType].push(item);
    });

    return {
      selectedResources: Array.from(dedup.values()),
      selectedCatalogByType: byType
    };
  }, [selectedAllocations, masterCatalogByType, targetClient]);

  const isInSelectedPool = (type: ResourceType, id: string, identifier: string) => {
    const normId = id.trim();
    const normIdent = identifier.trim().toLowerCase();
    return selectedResources.some(
      (r) =>
        r.resourceType === type &&
        (r.id === normId || r.identifier.trim().toLowerCase() === normIdent)
    );
  };

  const availableSourceTypes = useMemo(
    () => RESOURCE_TYPES.filter((rt) => (selectedCatalogByType[rt] || []).length > 0),
    [selectedCatalogByType]
  );

  // Form State
  const [editingRel, setEditingRel] = useState<ResourceRelationship | null>(null);
  const [sourceType, setSourceType] = useState<ResourceType>(
    () => availableSourceTypes[0] || 'Driver'
  );
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<MasterResourceItem | null>(null);

  const [targetType, setTargetType] = useState<ResourceType>('Vehicle');
  const [targetSearch, setTargetSearch] = useState('');
  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<MasterResourceItem | null>(null);

  const availableTargetTypes = useMemo(() => {
    const typesWithSelectableTargets = RESOURCE_TYPES.filter((rt) =>
      (selectedCatalogByType[rt] || []).some(
        (item) =>
          !(
            selectedSource &&
            sourceType === rt &&
            item.id === selectedSource.id &&
            item.identifier === selectedSource.identifier
          )
      )
    );
    const enabledForSource = new Set(
      rules.filter((r) => r.enabled && r.sourceType === sourceType).map((r) => r.targetType)
    );
    const ruleMatched = typesWithSelectableTargets.filter((rt) => enabledForSource.has(rt));
    return ruleMatched.length > 0 ? ruleMatched : typesWithSelectableTargets;
  }, [rules, sourceType, selectedCatalogByType, selectedSource]);

  const availableRelationshipTypes = useMemo(
    () => getAvailableRelationshipRules(rules, sourceType, targetType),
    [rules, sourceType, targetType]
  );

  const [relationshipCode, setRelationshipCode] = useState<string>(
    () => availableRelationshipTypes[0]?.code || ''
  );

  // Sync Source Type to only types present in selected resources
  useEffect(() => {
    if (editingRel) return;
    if (availableSourceTypes.length === 0) {
      setSelectedSource(null);
      setSourceSearch('');
      return;
    }
    if (!availableSourceTypes.includes(sourceType)) {
      const nextSrcType = availableSourceTypes[0];
      setSourceType(nextSrcType);
      const pool = selectedCatalogByType[nextSrcType] || [];
      if (pool.length === 1) {
        setSelectedSource(pool[0]);
        setSourceSearch(`${pool[0].displayName} (${pool[0].identifier})`);
      } else {
        setSelectedSource(null);
        setSourceSearch('');
      }
    } else if (
      selectedSource &&
      !selectedCatalogByType[sourceType].some(
        (m) => m.id === selectedSource.id && m.identifier === selectedSource.identifier
      )
    ) {
      setSelectedSource(null);
      setSourceSearch('');
    }
  }, [availableSourceTypes, sourceType, selectedCatalogByType, selectedSource, editingRel]);

  // Sync Target Type & Relationship Code when Source Type, selected pool, or Rules change
  useEffect(() => {
    if (editingRel) return;
    if (availableTargetTypes.length === 0) {
      setSelectedTarget(null);
      setTargetSearch('');
      return;
    }
    if (!availableTargetTypes.includes(targetType)) {
      const nextTarget =
        availableTargetTypes.find((rt) => rt !== sourceType) || availableTargetTypes[0];
      setTargetType(nextTarget);
      const pool = (selectedCatalogByType[nextTarget] || []).filter(
        (item) =>
          !(
            selectedSource &&
            sourceType === nextTarget &&
            item.id === selectedSource.id &&
            item.identifier === selectedSource.identifier
          )
      );
      if (pool.length === 1) {
        setSelectedTarget(pool[0]);
        setTargetSearch(`${pool[0].displayName} (${pool[0].identifier})`);
      } else {
        setSelectedTarget(null);
        setTargetSearch('');
      }
    } else if (
      selectedTarget &&
      !selectedCatalogByType[targetType].some(
        (m) => m.id === selectedTarget.id && m.identifier === selectedTarget.identifier
      )
    ) {
      setSelectedTarget(null);
      setTargetSearch('');
    }
  }, [availableTargetTypes, targetType, sourceType, selectedCatalogByType, selectedSource, selectedTarget, editingRel]);

  useEffect(() => {
    if (!availableRelationshipTypes.some((r) => r.code === relationshipCode)) {
      setRelationshipCode(availableRelationshipTypes[0]?.code || '');
    }
  }, [availableRelationshipTypes, relationshipCode]);

  const activeRule = useMemo(
    () => availableRelationshipTypes.find((r) => r.code === relationshipCode) || null,
    [availableRelationshipTypes, relationshipCode]
  );

  const [relMode, setRelMode] = useState<HardwareBindingMode>('Permanent');
  const [relTimezone, setRelTimezone] = useState('Asia/Kolkata');
  const [relStartDate, setRelStartDate] = useState('2026-11-14');
  const [relStartTime, setRelStartTime] = useState('09:30:00');
  const [relEndDate, setRelEndDate] = useState('2026-12-14');
  const [relEndTime, setRelEndTime] = useState('23:59:59');
  const [relNotes, setRelNotes] = useState('');
  const [relFormError, setRelFormError] = useState<string | null>(null);

  // Outside-click handler for searchable dropdowns
  const sourceBoxRef = useRef<HTMLDivElement>(null);
  const targetBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (sourceBoxRef.current && !sourceBoxRef.current.contains(e.target as Node)) {
        setSourceDropdownOpen(false);
      }
      if (targetBoxRef.current && !targetBoxRef.current.contains(e.target as Node)) {
        setTargetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filteredSourceOptions = useMemo(() => {
    const pool = selectedCatalogByType[sourceType] || [];
    const q = sourceSearch.trim().toLowerCase();
    // If search matches currently selected item text verbatim, show all selected options of this type
    if (
      !q ||
      (selectedSource && q === `${selectedSource.displayName} (${selectedSource.identifier})`.toLowerCase())
    ) {
      return pool;
    }
    return pool.filter((item) =>
      [item.identifier, item.displayName, item.id, item.company, item.subtitle]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [selectedCatalogByType, sourceType, sourceSearch, selectedSource]);

  const filteredTargetOptions = useMemo(() => {
    const pool = (selectedCatalogByType[targetType] || []).filter(
      (item) =>
        !(
          selectedSource &&
          sourceType === targetType &&
          item.id === selectedSource.id &&
          item.identifier === selectedSource.identifier
        )
    );
    const q = targetSearch.trim().toLowerCase();
    if (
      !q ||
      (selectedTarget && q === `${selectedTarget.displayName} (${selectedTarget.identifier})`.toLowerCase())
    ) {
      return pool;
    }
    return pool.filter((item) =>
      [item.identifier, item.displayName, item.id, item.company, item.subtitle]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [selectedCatalogByType, targetType, targetSearch, selectedSource, sourceType, selectedTarget]);

  // Listing Search & Filter
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ResourceRelationshipStatus>('All');
  const [showAllClientRels, setShowAllClientRels] = useState(false);

  const clientScopedRelationships = useMemo(() => {
    const norm = targetClient.trim().toLowerCase();
    return relationships.filter(
      (r) => !r.companyName || r.companyName.trim().toLowerCase() === norm || norm === 'all clients'
    );
  }, [relationships, targetClient]);

  const selectedPairRelationships = useMemo(() => {
    return clientScopedRelationships.filter(
      (r) =>
        isInSelectedPool(r.sourceResourceType, r.sourceResourceId, r.sourceResourceIdentifier) &&
        isInSelectedPool(r.targetResourceType, r.targetResourceId, r.targetResourceIdentifier)
    );
  }, [clientScopedRelationships, selectedResources]);

  const filteredRelationships = useMemo(() => {
    const baseList = showAllClientRels ? clientScopedRelationships : selectedPairRelationships;
    const q = listSearch.trim().toLowerCase();
    return baseList
      .map((rel) => ({
        rel,
        computed: computeResourceRelationshipStatus(rel, relationships)
      }))
      .filter(({ rel, computed }) => {
        if (statusFilter !== 'All' && computed.status !== statusFilter) return false;
        if (!q) return true;
        return [
          rel.id,
          rel.sourceResourceType,
          rel.sourceResourceIdentifier,
          rel.sourceResourceDisplayName,
          rel.relationshipType,
          rel.targetResourceType,
          rel.targetResourceIdentifier,
          rel.targetResourceDisplayName,
          rel.notes || ''
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);
      });
  }, [showAllClientRels, clientScopedRelationships, selectedPairRelationships, relationships, listSearch, statusFilter]);

  // View / Resource Details / History Drawer state
  const [inspectedState, setInspectedState] = useState<{
    rel: ResourceRelationship;
    tab: 'details' | 'history' | 'resources';
    focusedResource?: { type: ResourceType; id: string };
  } | null>(null);

  // Remove / End Confirmation Modal
  const [confirmRemoveRel, setConfirmRemoveRel] = useState<ResourceRelationship | null>(null);
  const [removeReason, setRemoveReason] = useState('Operational reassignment completed');

  // Configurable Rules Manager Modal
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [newRuleSource, setNewRuleSource] = useState<ResourceType>('Driver');
  const [newRuleTarget, setNewRuleTarget] = useState<ResourceType>('Vehicle');
  const [newRuleLabel, setNewRuleLabel] = useState('');
  const [newRuleMultiSource, setNewRuleMultiSource] = useState(true);
  const [newRuleMultiTarget, setNewRuleMultiTarget] = useState(true);
  const [newRuleDesc, setNewRuleDesc] = useState('');

  const resetForm = () => {
    setEditingRel(null);
    setSelectedSource(null);
    setSourceSearch('');
    setSelectedTarget(null);
    setTargetSearch('');
    setRelMode('Permanent');
    setRelNotes('');
    setRelFormError(null);
  };

  const handleLoadIntoEdit = (rel: ResourceRelationship) => {
    const srcMatch =
      (masterCatalogByType[rel.sourceResourceType] || []).find((m) => m.id === rel.sourceResourceId) || {
        id: rel.sourceResourceId,
        resourceType: rel.sourceResourceType,
        identifier: rel.sourceResourceIdentifier,
        displayName: rel.sourceResourceDisplayName,
        company: rel.companyName,
        subtitle: rel.sourceResourceId,
        status: 'Active',
        details: { 'Master ID': rel.sourceResourceId, Identifier: rel.sourceResourceIdentifier }
      };
    const tgtMatch =
      (masterCatalogByType[rel.targetResourceType] || []).find((m) => m.id === rel.targetResourceId) || {
        id: rel.targetResourceId,
        resourceType: rel.targetResourceType,
        identifier: rel.targetResourceIdentifier,
        displayName: rel.targetResourceDisplayName,
        company: rel.companyName,
        subtitle: rel.targetResourceId,
        status: 'Active',
        details: { 'Master ID': rel.targetResourceId, Identifier: rel.targetResourceIdentifier }
      };

    const tz = rel.timezone || 'Asia/Kolkata';
    const st = formatLocalInputParts(rel.effectiveStartAt, tz);
    const en = rel.effectiveEndAt
      ? formatLocalInputParts(rel.effectiveEndAt, tz)
      : { date: '2026-12-14', time: '23:59:59' };

    setEditingRel(rel);
    setSourceType(rel.sourceResourceType);
    setSelectedSource(srcMatch);
    setSourceSearch(`${srcMatch.displayName} (${srcMatch.identifier})`);
    setTargetType(rel.targetResourceType);
    setSelectedTarget(tgtMatch);
    setTargetSearch(`${tgtMatch.displayName} (${tgtMatch.identifier})`);
    setRelationshipCode(rel.relationshipCode);
    setRelMode(rel.mode);
    setRelTimezone(tz);
    setRelStartDate(st.date || '2026-11-14');
    setRelStartTime(st.time || '09:30:00');
    setRelEndDate(en.date);
    setRelEndTime(en.time);
    setRelNotes(rel.notes || '');
    setRelFormError(null);
  };

  const handleAddOrUpdateRelationship = () => {
    setRelFormError(null);
    if (!editingRel && selectedResources.length < 2) {
      setRelFormError('Select at least 2 resources in the Hardware → Resource tab before creating a relationship between them.');
      return;
    }
    if (
      !editingRel &&
      (!selectedSource ||
        !selectedTarget ||
        !isInSelectedPool(selectedSource.resourceType, selectedSource.id, selectedSource.identifier) ||
        !isInSelectedPool(selectedTarget.resourceType, selectedTarget.id, selectedTarget.identifier))
    ) {
      setRelFormError('Relationships can only be created between resources selected in the Hardware → Resource tab.');
      return;
    }

    const startIso = buildIsoWithTimezone(relStartDate, relStartTime, relTimezone);
    const endIso =
      relMode === 'Temporal' ? buildIsoWithTimezone(relEndDate, relEndTime, relTimezone) : null;

    const chosenRule = availableRelationshipTypes.find((r) => r.code === relationshipCode);

    const validation = validateResourceRelationship(
      {
        id: editingRel?.id,
        sourceResourceType: sourceType,
        sourceResourceId: selectedSource?.id || '',
        sourceResourceIdentifier: selectedSource?.identifier || '',
        relationshipCode: chosenRule?.code || relationshipCode,
        relationshipType: chosenRule?.label || '',
        targetResourceType: targetType,
        targetResourceId: selectedTarget?.id || '',
        targetResourceIdentifier: selectedTarget?.identifier || '',
        mode: relMode,
        effectiveStartAt: startIso,
        effectiveEndAt: endIso
      },
      relationships,
      rules
    );

    if (validation.errors.length > 0) {
      setRelFormError(validation.errors[0]);
      return;
    }

    const nowIso = new Date().toISOString();
    const companyId = COMPANY_NAME_TO_ID[targetClient] || 'comp-adani-mundra';

    if (editingRel) {
      const updatedRel: ResourceRelationship = {
        ...editingRel,
        sourceResourceType: sourceType,
        sourceResourceId: selectedSource!.id,
        sourceResourceIdentifier: selectedSource!.identifier,
        sourceResourceDisplayName: selectedSource!.displayName,
        relationshipCode: chosenRule!.code,
        relationshipType: chosenRule!.label,
        targetResourceType: targetType,
        targetResourceId: selectedTarget!.id,
        targetResourceIdentifier: selectedTarget!.identifier,
        targetResourceDisplayName: selectedTarget!.displayName,
        mode: relMode,
        effectiveStartAt: startIso,
        effectiveEndAt: endIso,
        timezone: relTimezone,
        notes: relNotes.trim() || undefined,
        updatedBy: actorName,
        updatedAt: nowIso,
        history: [
          {
            id: `relh-${Date.now()}`,
            timestamp: nowIso,
            actor: actorName,
            action: 'Updated',
            summary: `Updated ${selectedSource!.identifier} — ${chosenRule!.label} → ${selectedTarget!.identifier} (${relMode}${
              relMode === 'Temporal' && endIso ? ` until ${formatDateTimeWithTz(endIso, relTimezone)}` : ''
            })`,
            snapshot: {
              relationshipCode: editingRel.relationshipCode,
              relationshipType: editingRel.relationshipType,
              targetResourceType: editingRel.targetResourceType,
              targetResourceId: editingRel.targetResourceId,
              targetResourceIdentifier: editingRel.targetResourceIdentifier,
              mode: editingRel.mode,
              effectiveStartAt: editingRel.effectiveStartAt,
              effectiveEndAt: editingRel.effectiveEndAt,
              timezone: editingRel.timezone,
              notes: editingRel.notes
            }
          },
          ...(editingRel.history || [])
        ]
      };

      const nextRels = relationships.map((r) => (r.id === editingRel.id ? updatedRel : r));
      persistRelationships(nextRels);
      showToast(`Updated relationship ${editingRel.id}; previous snapshot preserved in history.`);
      resetForm();
      return;
    }

    const existingNums = relationships
      .map((r) => Number(r.id.replace(/\D/g, '')))
      .filter((n) => !Number.isNaN(n));
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 4005;
    const newId = `REL-${nextNum}`;

    const createdRel: ResourceRelationship = {
      id: newId,
      companyId,
      companyName: targetClient,
      sourceResourceType: sourceType,
      sourceResourceId: selectedSource!.id,
      sourceResourceIdentifier: selectedSource!.identifier,
      sourceResourceDisplayName: selectedSource!.displayName,
      relationshipCode: chosenRule!.code,
      relationshipType: chosenRule!.label,
      targetResourceType: targetType,
      targetResourceId: selectedTarget!.id,
      targetResourceIdentifier: selectedTarget!.identifier,
      targetResourceDisplayName: selectedTarget!.displayName,
      mode: relMode,
      effectiveStartAt: startIso,
      effectiveEndAt: endIso,
      timezone: relTimezone,
      notes: relNotes.trim() || undefined,
      createdBy: actorName,
      createdAt: nowIso,
      updatedBy: actorName,
      updatedAt: nowIso,
      history: [
        {
          id: `relh-${Date.now()}`,
          timestamp: nowIso,
          actor: actorName,
          action: 'Created',
          summary: `${sourceType} ${selectedSource!.identifier} (${selectedSource!.displayName}) — ${chosenRule!.label} → ${targetType} ${selectedTarget!.identifier} (${relMode})`
        }
      ]
    };

    const nextRels = [createdRel, ...relationships];
    persistRelationships(nextRels);
    showToast(`Saved relationship ${newId} independently (${selectedSource!.identifier} → ${selectedTarget!.identifier}).`);
    resetForm();
  };

  const handleConfirmEndOrRemove = (action: 'end-preserve' | 'delete-record') => {
    if (!confirmRemoveRel) return;
    const nowIso = new Date().toISOString();

    if (action === 'end-preserve') {
      const reason = removeReason.trim() || 'Ended by administrator';
      const nextRels = relationships.map((r) =>
        r.id === confirmRemoveRel.id
          ? {
              ...r,
              endedAt: nowIso,
              effectiveEndAt: nowIso,
              endReason: reason,
              updatedBy: actorName,
              updatedAt: nowIso,
              history: [
                {
                  id: `relh-${Date.now()}`,
                  timestamp: nowIso,
                  actor: actorName,
                  action: 'Ended' as const,
                  summary: `Ended relationship effectively now. Reason: ${reason}`
                },
                ...(r.history || [])
              ]
            }
          : r
      );
      persistRelationships(nextRels);
      showToast(`Ended relationship ${confirmRemoveRel.id}; audit history preserved.`);
    } else {
      const nextRels = relationships.filter((r) => r.id !== confirmRemoveRel.id);
      persistRelationships(nextRels);
      showToast(`Removed relationship ${confirmRemoveRel.id}.`);
      if (editingRel?.id === confirmRemoveRel.id) {
        resetForm();
      }
    }
    setConfirmRemoveRel(null);
  };

  const handleAddCustomRule = () => {
    const cleanLabel = newRuleLabel.trim();
    if (!cleanLabel) return;
    const code = `CUSTOM_${newRuleSource.toUpperCase()}_${newRuleTarget.toUpperCase()}_${Date.now()
      .toString()
      .slice(-4)}`;
    const nextRule: ResourceRelationshipRule = {
      code,
      label: cleanLabel,
      sourceType: newRuleSource,
      targetType: newRuleTarget,
      allowMultiplePerSource: newRuleMultiSource,
      allowMultiplePerTarget: newRuleMultiTarget,
      preventCycles: newRuleSource === newRuleTarget,
      enabled: true,
      isCustom: true,
      description:
        newRuleDesc.trim() ||
        `Custom configurable ${newRuleSource} → ${newRuleTarget} relationship rule.`
    };
    const nextRules = [nextRule, ...rules];
    setRules(nextRules);
    saveResourceRelationshipRules(nextRules);
    setNewRuleLabel('');
    setNewRuleDesc('');
    setSourceType(newRuleSource);
    setTargetType(newRuleTarget);
    setRelationshipCode(code);
    showToast(`Added configurable rule "${cleanLabel}" (${newRuleSource} → ${newRuleTarget}).`);
  };

  const handleToggleRule = (code: string) => {
    const next = rules.map((r) => (r.code === code ? { ...r, enabled: !r.enabled } : r));
    setRules(next);
    saveResourceRelationshipRules(next);
  };

  const statusBadge = (st: ResourceRelationshipStatus) => {
    const cls =
      st === 'Active'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : st === 'Scheduled'
        ? 'bg-sky-50 text-sky-700 border-sky-200'
        : st === 'Conflict'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
        {st}
      </span>
    );
  };

  const findMasterItem = (type: ResourceType, id: string, identifier: string, displayName: string): MasterResourceItem => {
    return (
      (masterCatalogByType[type] || []).find((m) => m.id === id) || {
        id,
        resourceType: type,
        identifier,
        displayName,
        company: targetClient,
        subtitle: id,
        status: 'Active',
        details: {
          'Master ID': id,
          Type: type,
          Identifier: identifier,
          Name: displayName
        }
      }
    );
  };

  return (
    <div className="space-y-3">
      {/* Selected Resources Scope Bar */}
      <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 flex-wrap text-[11.5px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-700 mr-1">
            Selected Resources ({selectedResources.length}):
          </span>
          {selectedResources.length === 0 ? (
            <span className="text-slate-500">
              None added yet — add resources in Hardware → Resource to link them together.
            </span>
          ) : (
            selectedResources.map((item) => (
              <span
                key={`${item.resourceType}-${item.id}-${item.identifier}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-800 text-[11px] font-medium"
              >
                <ResourceTypeIcon type={item.resourceType} className="w-3 h-3" />
                <span className="text-slate-500">{item.resourceType}:</span>
                <span className="font-mono font-semibold">{item.identifier}</span>
              </span>
            ))
          )}
        </div>
        {onGoToHardwareResource && (
          <button
            type="button"
            onClick={onGoToHardwareResource}
            className="h-7 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold cursor-pointer shrink-0"
          >
            {selectedResources.length < 2 ? '+ Select Resources in Hardware → Resource' : 'Manage Selected Resources'}
          </button>
        )}
      </div>

      {selectedResources.length < 2 && !editingRel ? (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 flex items-center justify-between gap-3 flex-wrap text-[12px]">
          <div className="flex items-start gap-2.5 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">
                {selectedResources.length === 0
                  ? 'Select at least 2 resources first'
                  : `Add at least 1 more resource (${selectedResources[0].resourceType}: ${selectedResources[0].identifier} selected)`}
              </div>
              <div className="text-[11px] text-amber-800 mt-0.5">
                Resource → Resource relationships can only be created between resources selected in the{' '}
                <strong>Hardware → Resource</strong> tab.
              </div>
            </div>
          </div>
          {onGoToHardwareResource && (
            <button
              type="button"
              onClick={onGoToHardwareResource}
              className="h-8 px-3 rounded-lg bg-[#F26522] hover:bg-[#d95417] text-white text-[11.5px] font-semibold cursor-pointer shrink-0"
            >
              Go to Hardware → Resource
            </button>
          )}
        </div>
      ) : (
      /* Resource-to-Resource Mapping Form */
      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 text-[12px]">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
              {editingRel
                ? `Edit Relationship · ${editingRel.id}`
                : 'Create Resource-to-Resource Relationship'}
            </span>
            <span className="text-[10.5px] text-slate-500">
              Scoped to selected resources · Independent of hardware bindings
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRulesModalOpen(true)}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500" /> Configure Rules ({rules.filter((r) => r.enabled).length})
          </button>
        </div>

        {relFormError && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11.5px] flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{relFormError}</span>
            </div>
            <button
              type="button"
              onClick={() => setRelFormError(null)}
              className="text-rose-500 hover:text-rose-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Row 1: Source Type | Source Resource | Target Type | Target Resource | Relationship Type */}
        <div className="grid grid-cols-12 gap-2.5">
          {/* Source Resource Type */}
          <div className="col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Source Type</label>
            <select
              value={sourceType}
              disabled={!!editingRel}
              onChange={(e) => {
                const nextType = e.target.value as ResourceType;
                setSourceType(nextType);
                const pool = selectedCatalogByType[nextType] || [];
                if (pool.length === 1) {
                  setSelectedSource(pool[0]);
                  setSourceSearch(`${pool[0].displayName} (${pool[0].identifier})`);
                } else {
                  setSelectedSource(null);
                  setSourceSearch('');
                }
                setRelFormError(null);
              }}
              className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white font-semibold disabled:bg-slate-100 disabled:text-slate-500"
            >
              {availableSourceTypes.map((rt) => (
                <option key={rt} value={rt}>
                  {rt} ({(selectedCatalogByType[rt] || []).length})
                </option>
              ))}
            </select>
          </div>

          {/* Source Resource Searchable Dropdown */}
          <div className="col-span-3 relative" ref={sourceBoxRef}>
            <label className="block font-semibold text-slate-700 mb-1">
              Source {sourceType} <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                disabled={!!editingRel}
                value={sourceSearch}
                onFocus={() => !editingRel && setSourceDropdownOpen(true)}
                onChange={(e) => {
                  setSourceSearch(e.target.value);
                  setSelectedSource(null);
                  setSourceDropdownOpen(true);
                }}
                placeholder={`Select ${sourceType} from Step 3...`}
                className="w-full h-9 pl-8 pr-7 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#F26522] disabled:bg-slate-100 disabled:text-slate-600"
              />
              {sourceSearch && !editingRel && (
                <button
                  type="button"
                  onClick={() => {
                    setSourceSearch('');
                    setSelectedSource(null);
                    setSourceDropdownOpen(true);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {sourceDropdownOpen && !editingRel && (
              <div className="absolute left-0 right-0 top-full mt-1 border border-slate-200 rounded-xl bg-white shadow-xl max-h-52 overflow-y-auto z-30 divide-y divide-slate-100">
                {filteredSourceOptions.length === 0 ? (
                  <div className="p-3 text-center text-[11px] text-slate-500">
                    No selected {sourceType} matches "{sourceSearch}".
                  </div>
                ) : (
                  filteredSourceOptions.map((item) => (
                    <button
                      key={`${item.id}-${item.identifier}`}
                      type="button"
                      onClick={() => {
                        setSelectedSource(item);
                        setSourceSearch(`${item.displayName} (${item.identifier})`);
                        setSourceDropdownOpen(false);
                        setRelFormError(null);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-orange-50/60 flex items-center justify-between gap-2 cursor-pointer ${
                        selectedSource?.id === item.id && selectedSource?.identifier === item.identifier
                          ? 'bg-[#FFF3EE]'
                          : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                          <ResourceTypeIcon type={item.resourceType} />
                          <span className="truncate">{item.displayName}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate">
                          <span className="font-mono text-slate-700">{item.identifier}</span> · {item.subtitle}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{item.id}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Target Resource Type */}
          <div className="col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Target Type</label>
            <select
              value={targetType}
              onChange={(e) => {
                const nextType = e.target.value as ResourceType;
                setTargetType(nextType);
                const pool = (selectedCatalogByType[nextType] || []).filter(
                  (item) =>
                    !(
                      selectedSource &&
                      sourceType === nextType &&
                      item.id === selectedSource.id &&
                      item.identifier === selectedSource.identifier
                    )
                );
                if (pool.length === 1) {
                  setSelectedTarget(pool[0]);
                  setTargetSearch(`${pool[0].displayName} (${pool[0].identifier})`);
                } else {
                  setSelectedTarget(null);
                  setTargetSearch('');
                }
                setRelFormError(null);
              }}
              className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white font-semibold"
            >
              {availableTargetTypes.map((rt) => (
                <option key={rt} value={rt}>
                  {rt} ({(selectedCatalogByType[rt] || []).length})
                </option>
              ))}
            </select>
          </div>

          {/* Target Resource Searchable Dropdown */}
          <div className="col-span-3 relative" ref={targetBoxRef}>
            <label className="block font-semibold text-slate-700 mb-1">
              Target {targetType} <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={targetSearch}
                onFocus={() => setTargetDropdownOpen(true)}
                onChange={(e) => {
                  setTargetSearch(e.target.value);
                  setSelectedTarget(null);
                  setTargetDropdownOpen(true);
                }}
                placeholder={`Select ${targetType} from Step 3...`}
                className="w-full h-9 pl-8 pr-7 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#F26522]"
              />
              {targetSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setTargetSearch('');
                    setSelectedTarget(null);
                    setTargetDropdownOpen(true);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {targetDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 border border-slate-200 rounded-xl bg-white shadow-xl max-h-52 overflow-y-auto z-30 divide-y divide-slate-100">
                {filteredTargetOptions.length === 0 ? (
                  <div className="p-3 text-center text-[11px] text-slate-500">
                    No other selected {targetType} available.
                  </div>
                ) : (
                  filteredTargetOptions.map((item) => (
                    <button
                      key={`${item.id}-${item.identifier}`}
                      type="button"
                      onClick={() => {
                        setSelectedTarget(item);
                        setTargetSearch(`${item.displayName} (${item.identifier})`);
                        setTargetDropdownOpen(false);
                        setRelFormError(null);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-orange-50/60 flex items-center justify-between gap-2 cursor-pointer ${
                        selectedTarget?.id === item.id && selectedTarget?.identifier === item.identifier
                          ? 'bg-[#FFF3EE]'
                          : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                          <ResourceTypeIcon type={item.resourceType} />
                          <span className="truncate">{item.displayName}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate">
                          <span className="font-mono text-slate-700">{item.identifier}</span> · {item.subtitle}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{item.id}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Dynamic Relationship Type */}
          <div className="col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Relationship Type <span className="text-rose-600">*</span>
            </label>
            <select
              value={relationshipCode}
              onChange={(e) => {
                setRelationshipCode(e.target.value);
                setRelFormError(null);
              }}
              className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
            >
              {availableRelationshipTypes.length === 0 ? (
                <option value="">No rules enabled</option>
              ) : (
                availableRelationshipTypes.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Active Rule Constraints Hint */}
        {activeRule && (
          <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-[#F26522] shrink-0" />
              <span>{activeRule.description}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 shrink-0">
              <span>{activeRule.allowMultiplePerSource ? 'Multi-target allowed' : 'Single active target'}</span>
              <span>·</span>
              <span>{activeRule.allowMultiplePerTarget ? 'Multi-source allowed' : 'Exclusive per target'}</span>
            </div>
          </div>
        )}

        {/* Row 2: Validity | Start Date & Time | End Date & Time | Timezone | Add Button */}
        <div className="grid grid-cols-12 gap-2.5 items-end">
          <div className="col-span-3">
            <label className="block font-semibold text-slate-700 mb-1">Binding Validity</label>
            <select
              value={relMode}
              onChange={(e) => setRelMode(e.target.value as HardwareBindingMode)}
              className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-[11.5px]"
            >
              <option value="Permanent">Permanent (Open-ended)</option>
              <option value="Temporal">Temporal (Defined End)</option>
            </select>
          </div>

          <div className="col-span-3">
            <label className="block font-semibold text-slate-700 mb-1">Effective Start *</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={relStartDate}
                onChange={(e) => setRelStartDate(e.target.value)}
                className="w-[115px] h-8 px-1.5 rounded-lg border border-slate-200 bg-white text-[11px]"
              />
              <input
                type="time"
                step="1"
                value={relStartTime}
                onChange={(e) => setRelStartTime(e.target.value)}
                className="flex-1 h-8 px-1.5 rounded-lg border border-slate-200 bg-white text-[11px]"
              />
            </div>
          </div>

          <div className="col-span-3">
            <label className="block font-semibold text-slate-700 mb-1">
              Effective End {relMode === 'Temporal' && '*'}
            </label>
            {relMode === 'Permanent' ? (
              <div className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 flex items-center text-[11px]">
                Open-ended
              </div>
            ) : (
              <div className="flex gap-1">
                <input
                  type="date"
                  value={relEndDate}
                  onChange={(e) => setRelEndDate(e.target.value)}
                  className="w-[115px] h-8 px-1.5 rounded-lg border border-slate-200 bg-white text-[11px]"
                />
                <input
                  type="time"
                  step="1"
                  value={relEndTime}
                  onChange={(e) => setRelEndTime(e.target.value)}
                  className="flex-1 h-8 px-1.5 rounded-lg border border-slate-200 bg-white text-[11px]"
                />
              </div>
            )}
          </div>

          <div className="col-span-1">
            <label className="block font-semibold text-slate-700 mb-1">TZ</label>
            <select
              value={relTimezone}
              onChange={(e) => setRelTimezone(e.target.value)}
              className="w-full h-8 px-1.5 rounded-lg border border-slate-200 bg-white text-[11px]"
            >
              {SUPPORTED_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label.split(' ')[0]}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 flex justify-end gap-1.5">
            {editingRel && (
              <button
                type="button"
                onClick={resetForm}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleAddOrUpdateRelationship}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#FFF3EE] hover:bg-[#ffe5db] border border-[#F26522]/35 text-[#F26522] text-[11px] font-semibold cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {editingRel ? 'Update' : 'Add Relationship'}
            </button>
          </div>
        </div>

        {/* Notes Input */}
        <div>
          <input
            type="text"
            value={relNotes}
            onChange={(e) => setRelNotes(e.target.value)}
            placeholder="Optional relationship note / operational context (e.g. Shift rotation, Subcontracted route)..."
            className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white text-[11.5px] focus:outline-none focus:border-[#F26522]"
          />
        </div>
      </div>
      )}

      {/* Search & Status Filter Strip for Relationship Listing */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="Search relationships by ID, source/target resource, or relationship type..."
            className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-[11.5px] focus:outline-none focus:border-[#F26522]"
          />
          {listSearch && (
            <button
              type="button"
              onClick={() => setListSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
          {clientScopedRelationships.length > selectedPairRelationships.length && (
            <button
              type="button"
              onClick={() => setShowAllClientRels((prev) => !prev)}
              className={`h-7 px-2.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
                showAllClientRels
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              title="Toggle between relationships strictly connecting your selected Step 3 resources vs all client relationships"
            >
              {showAllClientRels
                ? `All Client (${clientScopedRelationships.length})`
                : `Selected Only (${selectedPairRelationships.length})`}
            </button>
          )}
          {(['All', 'Active', 'Scheduled', 'Ended'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`h-7 px-2.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'border-[#F26522] bg-[#FFF3EE] text-[#F26522]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Relationship Listing Table */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
        <table className="w-full text-left text-[11.5px] border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2 min-w-[185px]">Source Resource</th>
              <th className="px-3 py-2 min-w-[190px]">Relationship</th>
              <th className="px-3 py-2 min-w-[185px]">Target Resource</th>
              <th className="px-3 py-2 min-w-[100px]">Validity</th>
              <th className="px-3 py-2 min-w-[145px]">Effective Start</th>
              <th className="px-3 py-2 min-w-[145px]">Effective End</th>
              <th className="px-3 py-2 text-right w-[72px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRelationships.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-[12px]">
                  {!showAllClientRels
                    ? 'No Resource-to-Resource relationships created between the selected Step 3 resources yet.'
                    : 'No Resource-to-Resource relationships match the current search/filter.'}
                </td>
              </tr>
            ) : (
              filteredRelationships.map(({ rel, computed }) => {
                const isEnded = computed.status === 'Ended';
                return (
                  <tr
                    key={rel.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      editingRel?.id === rel.id ? 'bg-[#FFF9F6]' : ''
                    }`}
                  >
                    {/* Source Resource */}
                    <td className="px-3 py-2 align-middle">
                      <button
                        type="button"
                        onClick={() =>
                          setInspectedState({
                            rel,
                            tab: 'resources',
                            focusedResource: { type: rel.sourceResourceType, id: rel.sourceResourceId }
                          })
                        }
                        className="text-left group cursor-pointer"
                        title="View source resource details & all relationships"
                      >
                        <div className="flex items-center gap-1.5">
                          <ResourceTypeIcon type={rel.sourceResourceType} />
                          <span className="font-mono font-bold text-slate-900 group-hover:text-[#F26522]">
                            {rel.sourceResourceIdentifier}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                            {rel.sourceResourceType}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate max-w-[190px]">
                          {rel.sourceResourceDisplayName}
                        </div>
                      </button>
                    </td>

                    {/* Relationship */}
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800">{rel.relationshipType}</span>
                        {statusBadge(computed.status)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {rel.id} · History ({rel.history?.length || 1})
                      </div>
                    </td>

                    {/* Target Resource */}
                    <td className="px-3 py-2 align-middle">
                      <button
                        type="button"
                        onClick={() =>
                          setInspectedState({
                            rel,
                            tab: 'resources',
                            focusedResource: { type: rel.targetResourceType, id: rel.targetResourceId }
                          })
                        }
                        className="text-left group cursor-pointer"
                        title="View target resource details & all relationships"
                      >
                        <div className="flex items-center gap-1.5">
                          <ResourceTypeIcon type={rel.targetResourceType} />
                          <span className="font-mono font-bold text-slate-900 group-hover:text-[#F26522]">
                            {rel.targetResourceIdentifier}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                            {rel.targetResourceType}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate max-w-[190px]">
                          {rel.targetResourceDisplayName}
                        </div>
                      </button>
                    </td>

                    {/* Validity */}
                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          rel.mode === 'Permanent' ? 'text-sky-700' : 'text-[#F26522]'
                        }`}
                      >
                        {rel.mode === 'Permanent' ? (
                          <InfinityIcon className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {rel.mode}
                      </span>
                    </td>

                    {/* Effective Start */}
                    <td className="px-3 py-2 text-[10.5px] text-slate-600 tabular-nums whitespace-nowrap align-middle">
                      {formatDateTimeWithTz(rel.effectiveStartAt, rel.timezone, true)}
                    </td>

                    {/* Effective End */}
                    <td className="px-3 py-2 text-[10.5px] text-slate-600 tabular-nums whitespace-nowrap align-middle">
                      {rel.endedAt || rel.effectiveEndAt
                        ? formatDateTimeWithTz(rel.endedAt || rel.effectiveEndAt, rel.timezone, true)
                        : '—'}
                    </td>

                    {/* Actions: View, Edit, History, Remove */}
                    <td className="px-3 py-2 text-right whitespace-nowrap align-middle">
                      <div className="inline-flex items-center justify-end">
                        <RowActionMenu
                          ariaLabel={`Actions for relationship ${rel.id}`}
                          menuWidthClass="w-56"
                          items={[
                            {
                              id: 'view',
                              label: 'View details',
                              icon: <Eye className="w-3.5 h-3.5 text-slate-400" />,
                              onClick: () => setInspectedState({ rel, tab: 'details' }),
                            },
                            {
                              id: 'edit',
                              label: 'Edit relationship',
                              icon: <Edit2 className="w-3.5 h-3.5 text-slate-400" />,
                              hidden: isEnded,
                              onClick: () => handleLoadIntoEdit(rel),
                            },
                            {
                              id: 'history',
                              label: 'View relationship history',
                              icon: <History className="w-3.5 h-3.5 text-slate-400" />,
                              onClick: () => setInspectedState({ rel, tab: 'history' }),
                            },
                            {
                              id: 'remove',
                              label: isEnded ? 'Remove ended record' : 'End / Remove relationship',
                              icon: <Trash2 className="w-3.5 h-3.5" />,
                              tone: 'danger',
                              dividerBefore: true,
                              onClick: () => {
                                setRemoveReason('Operational reassignment completed');
                                setConfirmRemoveRel(rel);
                              },
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View / History / Resource Details Drawer */}
      {inspectedState && (
        <div className="fixed inset-0 z-[95] flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
          <div className="w-full max-w-[600px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[12px] font-bold text-[#F26522]">{inspectedState.rel.id}</span>
                  {statusBadge(computeResourceRelationshipStatus(inspectedState.rel, relationships).status)}
                  <span className="text-[11px] text-slate-500">{inspectedState.rel.companyName}</span>
                </div>
                <h3 className="text-[14px] font-bold text-slate-900 mt-0.5 truncate">
                  {inspectedState.rel.sourceResourceIdentifier} — {inspectedState.rel.relationshipType} →{' '}
                  {inspectedState.rel.targetResourceIdentifier}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedState(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 border-b border-slate-200 flex gap-5 shrink-0 bg-white">
              {(
                [
                  { id: 'details', label: 'Relationship Details' },
                  { id: 'history', label: `History (${inspectedState.rel.history?.length || 0})` },
                  { id: 'resources', label: 'Resource Details & Links' }
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setInspectedState((prev) => (prev ? { ...prev, tab: t.id } : null))}
                  className={`py-2.5 text-[12px] font-semibold border-b-2 cursor-pointer ${
                    inspectedState.tab === t.id
                      ? 'border-[#F26522] text-[#F26522]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-[12px]">
              {inspectedState.tab === 'details' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        Source ({inspectedState.rel.sourceResourceType})
                      </div>
                      <div className="font-mono font-bold text-slate-900 truncate">
                        {inspectedState.rel.sourceResourceIdentifier}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {inspectedState.rel.sourceResourceDisplayName}
                      </div>
                    </div>
                    <div className="text-center px-2 shrink-0">
                      <ArrowRight className="w-4 h-4 text-[#F26522] mx-auto" />
                      <div className="text-[10px] font-semibold text-[#F26522] mt-0.5">
                        {inspectedState.rel.relationshipType}
                      </div>
                    </div>
                    <div className="min-w-0 text-right">
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        Target ({inspectedState.rel.targetResourceType})
                      </div>
                      <div className="font-mono font-bold text-slate-900 truncate">
                        {inspectedState.rel.targetResourceIdentifier}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {inspectedState.rel.targetResourceDisplayName}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Relationship ID', inspectedState.rel.id],
                      ['Validity Mode', inspectedState.rel.mode],
                      [
                        'Effective Start',
                        formatDateTimeWithTz(inspectedState.rel.effectiveStartAt, inspectedState.rel.timezone, true)
                      ],
                      [
                        'Effective End',
                        inspectedState.rel.endedAt || inspectedState.rel.effectiveEndAt
                          ? formatDateTimeWithTz(
                              inspectedState.rel.endedAt || inspectedState.rel.effectiveEndAt,
                              inspectedState.rel.timezone,
                              true
                            )
                          : 'Open-ended'
                      ],
                      ['Source Master ID', inspectedState.rel.sourceResourceId],
                      ['Target Master ID', inspectedState.rel.targetResourceId],
                      ['Created By', `${inspectedState.rel.createdBy}`],
                      ['Updated By', `${inspectedState.rel.updatedBy}`]
                    ].map(([k, v]) => (
                      <div key={k} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                        <div className="text-[10px] font-bold uppercase text-slate-400">{k}</div>
                        <div className="font-semibold text-slate-800 mt-0.5 break-words">{v}</div>
                      </div>
                    ))}
                  </div>

                  {inspectedState.rel.notes && (
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Notes</div>
                      <div className="text-slate-700 mt-0.5">{inspectedState.rel.notes}</div>
                    </div>
                  )}
                </div>
              )}

              {inspectedState.tab === 'history' && (
                <div className="space-y-2.5">
                  {(inspectedState.rel.history || []).length === 0 ? (
                    <div className="p-6 text-center text-slate-400 border border-slate-200 rounded-xl">
                      No history entries recorded yet.
                    </div>
                  ) : (
                    (inspectedState.rel.history || []).map((entry) => (
                      <div key={entry.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                            <History className="w-3.5 h-3.5 text-[#F26522]" />
                            {entry.action}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {formatDateTimeWithTz(entry.timestamp, inspectedState.rel.timezone, true)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Actor: <span className="font-semibold text-slate-700">{entry.actor}</span>
                        </div>
                        <div className="text-[11.5px] text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                          {entry.summary}
                        </div>
                        {entry.snapshot && (
                          <div className="text-[10.5px] text-slate-500 pt-0.5">
                            Prior snapshot: {entry.snapshot.relationshipType} → {entry.snapshot.targetResourceIdentifier} ({entry.snapshot.mode})
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {inspectedState.tab === 'resources' && (
                <div className="space-y-4">
                  {[
                    {
                      roleLabel: 'Source Resource',
                      item: findMasterItem(
                        inspectedState.rel.sourceResourceType,
                        inspectedState.rel.sourceResourceId,
                        inspectedState.rel.sourceResourceIdentifier,
                        inspectedState.rel.sourceResourceDisplayName
                      )
                    },
                    {
                      roleLabel: 'Target Resource',
                      item: findMasterItem(
                        inspectedState.rel.targetResourceType,
                        inspectedState.rel.targetResourceId,
                        inspectedState.rel.targetResourceIdentifier,
                        inspectedState.rel.targetResourceDisplayName
                      )
                    }
                  ].map(({ roleLabel, item }) => {
                    const linkedRels = relationships.filter(
                      (r) =>
                        (r.sourceResourceType === item.resourceType && r.sourceResourceId === item.id) ||
                        (r.targetResourceType === item.resourceType && r.targetResourceId === item.id)
                    );
                    const isFocused =
                      inspectedState.focusedResource?.type === item.resourceType &&
                      inspectedState.focusedResource?.id === item.id;

                    return (
                      <div
                        key={`${roleLabel}-${item.id}`}
                        className={`p-3.5 rounded-xl border space-y-3 ${
                          isFocused ? 'border-[#F26522]/40 bg-[#FFF9F6]' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ResourceTypeIcon type={item.resourceType} className="w-4 h-4" />
                            <div>
                              <div className="text-[10px] font-bold uppercase text-slate-400">
                                {roleLabel} · {item.resourceType} Master
                              </div>
                              <div className="font-bold text-slate-900">
                                {item.displayName} <span className="font-mono text-slate-500">({item.identifier})</span>
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          {Object.entries(item.details).map(([k, v]) => (
                            <div key={k} className="px-2.5 py-1.5 rounded bg-slate-50 border border-slate-100">
                              <span className="text-slate-400">{k}: </span>
                              <span className="font-semibold text-slate-800">{v}</span>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[10.5px] font-bold uppercase text-slate-500">
                            All Resource-to-Resource Relationships ({linkedRels.length})
                          </div>
                          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
                            {linkedRels.map((lr) => {
                              const st = computeResourceRelationshipStatus(lr, relationships).status;
                              return (
                                <div key={lr.id} className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                                  <div className="min-w-0 truncate">
                                    <span className="font-mono font-semibold text-slate-700">{lr.id}</span> ·{' '}
                                    <span className="font-semibold text-slate-900">{lr.sourceResourceIdentifier}</span>{' '}
                                    <span className="text-[#F26522] font-medium">— {lr.relationshipType} →</span>{' '}
                                    <span className="font-semibold text-slate-900">{lr.targetResourceIdentifier}</span>
                                  </div>
                                  {statusBadge(st)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove / End Active Relationship Modal */}
      {confirmRemoveRel && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-[470px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[14px] text-rose-700">
                <AlertTriangle className="w-4 h-4" />
                Confirm Relationship Removal · {confirmRemoveRel.id}
              </div>
              <button
                type="button"
                onClick={() => setConfirmRemoveRel(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-[12px]">
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-orange-200 bg-orange-50 text-[#B85324] font-mono">
                  {confirmRemoveRel.id}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-sky-200 bg-sky-50 text-sky-700">
                  {confirmRemoveRel.sourceResourceIdentifier} → {confirmRemoveRel.targetResourceIdentifier}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-purple-200 bg-purple-50 text-purple-700">
                  {confirmRemoveRel.relationshipType}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    !confirmRemoveRel.endedAt
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {!confirmRemoveRel.endedAt ? 'Active Relationship' : 'Already Ended'}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-rose-200 bg-rose-50 text-rose-700">
                  Permanent Remove Available
                </span>
              </div>
              <p className="text-slate-600">
                Are you sure you want to end or remove the relationship{' '}
                <strong className="text-slate-900">
                  {confirmRemoveRel.sourceResourceIdentifier} — {confirmRemoveRel.relationshipType} →{' '}
                  {confirmRemoveRel.targetResourceIdentifier}
                </strong>
                ?
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Reason (for ending)</label>
                <input
                  type="text"
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200"
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setConfirmRemoveRel(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                {!confirmRemoveRel.endedAt && (
                  <button
                    type="button"
                    onClick={() => handleConfirmEndOrRemove('end-preserve')}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[12px] font-semibold cursor-pointer"
                  >
                    <StopCircle className="w-3.5 h-3.5" /> End & Preserve History
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleConfirmEndOrRemove('delete-record')}
                  className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold cursor-pointer"
                >
                  Confirm Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configurable Relationship Rules Modal */}
      {rulesModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-[680px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-[14px] font-bold text-slate-900">
                  Configurable Resource Relationship Rules
                </h3>
                <p className="text-[11px] text-slate-500">
                  Enable, disable, or add relationship definitions and multiplicity rules by resource pair
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRulesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-2.5 text-[11.5px] shrink-0">
              <div className="font-bold text-slate-800">Add New Relationship Rule</div>
              <div className="grid grid-cols-12 gap-2">
                <select
                  value={newRuleSource}
                  onChange={(e) => setNewRuleSource(e.target.value as ResourceType)}
                  className="col-span-2 h-8 px-2 rounded-lg border border-slate-200 bg-white font-semibold"
                >
                  {RESOURCE_TYPES.map((rt) => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
                <select
                  value={newRuleTarget}
                  onChange={(e) => setNewRuleTarget(e.target.value as ResourceType)}
                  className="col-span-2 h-8 px-2 rounded-lg border border-slate-200 bg-white font-semibold"
                >
                  {RESOURCE_TYPES.map((rt) => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newRuleLabel}
                  onChange={(e) => setNewRuleLabel(e.target.value)}
                  placeholder="Relationship label (e.g. Escort Driver For)"
                  className="col-span-4 h-8 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
                <input
                  type="text"
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Rule description..."
                  className="col-span-4 h-8 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-4 text-[11px] text-slate-700">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRuleMultiSource}
                      onChange={(e) => setNewRuleMultiSource(e.target.checked)}
                    />
                    Allow multiple targets per source
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRuleMultiTarget}
                      onChange={(e) => setNewRuleMultiTarget(e.target.checked)}
                    />
                    Allow multiple sources per target
                  </label>
                </div>
                <button
                  type="button"
                  disabled={!newRuleLabel.trim()}
                  onClick={handleAddCustomRule}
                  className="h-8 px-3 rounded-lg bg-[#F26522] disabled:bg-slate-300 text-white font-semibold cursor-pointer"
                >
                  + Add Rule
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-[11.5px]">
              {rules.map((r) => (
                <div key={r.code} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold text-[10.5px]">
                        {r.sourceType} → {r.targetType}
                      </span>
                      <span className="font-bold text-slate-900">{r.label}</span>
                      {r.isCustom && (
                        <span className="px-1.5 py-0.2 rounded bg-[#FFF3EE] text-[#F26522] text-[10px] font-semibold">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5">{r.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleRule(r.code)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold shrink-0 cursor-pointer ${
                      r.enabled
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                  >
                    {r.enabled ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Enabled
                      </span>
                    ) : (
                      'Disabled'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
