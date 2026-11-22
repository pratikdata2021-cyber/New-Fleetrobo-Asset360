import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  FileDown,
  Image as ImageIcon,
  Layers,
  MapPin,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';
import { RowActionMenu } from './common/RowActionMenu';
import { DeleteConfirmationModal } from './common/DeleteConfirmationModal';
import {
  ALL_VEHICLE_SEGMENTS,
  MANUFACTURERS_LIST,
  VEHICLE_MODEL_FUEL_TYPES,
  VEHICLE_SEGMENTS_BY_TYPE,
  VEHICLE_STATE_DEFINITIONS,
  VEHICLE_TYPES,
  VehicleModelIconSlot,
  VehicleModelRecord,
  VehicleStateKey,
  countDependentVehicles,
  createDefaultIconsMap,
  generateNextVehicleModelId,
  getDefaultVehicleStateIconUrl,
  getIconSetupSummary,
  getNormalizedModelComboKey,
  loadVehicleModelStore,
  resetVehicleModelStore,
  saveVehicleModelStore,
} from '../types/vehicleModelMaster';
import { loadVehicleMasterStore } from '../types/vehicle';

interface VehicleModelMasterContentProps {
  currentCompany?: string;
}

type DrawerMode = 'add' | 'edit' | 'view';
type StatusFilter = 'All' | 'Active' | 'Inactive';
type SortKey =
  | 'id'
  | 'manufacturer'
  | 'modelName'
  | 'vehicleType'
  | 'vehicleSegment'
  | 'isActive'
  | 'createdAt';

const MAX_ICON_SIZE_BYTES = 200 * 1024; // 200 KB per PRD §6C
const ALLOWED_ICON_MIME_TYPES = new Set([
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

export const VehicleModelMasterContent: React.FC<VehicleModelMasterContentProps> = ({
  currentCompany = 'Platform Admin',
}) => {
  const isPlatformAdmin =
    currentCompany === 'Platform Admin' || currentCompany === 'Binary';

  // Master store state
  const [records, setRecords] = useState<VehicleModelRecord[]>(() =>
    loadVehicleModelStore()
  );
  const [vehiclesTick, setVehiclesTick] = useState(0);

  // Sync on external storage or vehicle updates
  useEffect(() => {
    const handleVehiclesSync = () => setVehiclesTick((t) => t + 1);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fleetrobo_vehicle_model_master_v1') {
        setRecords(loadVehicleModelStore());
      }
      if (e.key === 'fleetrobo_vehicle_master_v3') {
        setVehiclesTick((t) => t + 1);
      }
    };
    window.addEventListener('fleetrobo:resources-updated', handleVehiclesSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('fleetrobo:resources-updated', handleVehiclesSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const vehiclesList = useMemo(() => {
    void vehiclesTick;
    return loadVehicleMasterStore();
  }, [vehiclesTick]);

  // Listing controls
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [segmentFilter, setSegmentFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(10);

  // Toast feedback
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);
  const showToast = (
    message: string,
    type: 'success' | 'info' | 'error' = 'success'
  ) => {
    setToast({ message, type });
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Form fields
  const [formId, setFormId] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [manufacturerMenuOpen, setManufacturerMenuOpen] = useState(false);
  const [manufacturerSearch, setManufacturerSearch] = useState('');
  const manufacturerRef = useRef<HTMLDivElement>(null);

  const [formModelName, setFormModelName] = useState('');
  const [formVariant, setFormVariant] = useState('');
  const [formVehicleType, setFormVehicleType] = useState<string>('Truck');
  const [formVehicleSegment, setFormVehicleSegment] = useState<string>('HCV');
  const [formModelYear, setFormModelYear] = useState<string>('');
  const [formFuelType, setFormFuelType] = useState<string>('Diesel');
  const [formDescription, setFormDescription] = useState('');

  // Specifications
  const [formFuelTankCapacityL, setFormFuelTankCapacityL] = useState<string>('');
  const [formPayloadCapacityKg, setFormPayloadCapacityKg] = useState<string>('');
  const [formSeatingCapacity, setFormSeatingCapacity] = useState<string>('');
  const [formAxleCount, setFormAxleCount] = useState<string>('');
  const [formIsAcVehicle, setFormIsAcVehicle] = useState(false);
  const [formIsAcReverse, setFormIsAcReverse] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  // 7-state Map Icon config
  const [formIcons, setFormIcons] = useState<
    Record<VehicleStateKey, VehicleModelIconSlot>
  >(() => createDefaultIconsMap());
  const [iconUploadErrors, setIconUploadErrors] = useState<
    Partial<Record<VehicleStateKey, string>>
  >({});
  const [activePreviewState, setActivePreviewState] =
    useState<VehicleStateKey>('poll');
  const iconFileInputsRef = useRef<
    Partial<Record<VehicleStateKey, HTMLInputElement | null>>
  >({});

  // Audit metadata
  const [formAudit, setFormAudit] = useState({
    createdBy: 'Platform Admin',
    createdAt: '',
    updatedBy: 'Platform Admin',
    updatedAt: '',
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Status Toggle / Delete confirmation modals
  const [pendingStatusToggle, setPendingStatusToggle] =
    useState<VehicleModelRecord | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<VehicleModelRecord | null>(null);

  // Close manufacturer dropdown on outside click
  useEffect(() => {
    if (!manufacturerMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        manufacturerRef.current &&
        !manufacturerRef.current.contains(e.target as Node)
      ) {
        setManufacturerMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [manufacturerMenuOpen]);

  // Dynamic segment options filtered by Vehicle Type
  const availableSegmentsForForm = useMemo(() => {
    const mapped = VEHICLE_SEGMENTS_BY_TYPE[formVehicleType];
    return mapped && mapped.length > 0 ? mapped : ALL_VEHICLE_SEGMENTS;
  }, [formVehicleType]);

  // Combined manufacturer list (seeds + existing custom)
  const allManufacturers = useMemo(() => {
    const set = new Set<string>(MANUFACTURERS_LIST);
    records.forEach((r) => {
      if (r.manufacturer?.trim()) set.add(r.manufacturer.trim());
    });
    if (formManufacturer.trim()) set.add(formManufacturer.trim());
    return Array.from(set);
  }, [records, formManufacturer]);

  // Available segment filter options for table toolbar
  const availableSegmentFilterOptions = useMemo(() => {
    if (typeFilter !== 'All' && VEHICLE_SEGMENTS_BY_TYPE[typeFilter]) {
      return VEHICLE_SEGMENTS_BY_TYPE[typeFilter];
    }
    const set = new Set<string>(ALL_VEHICLE_SEGMENTS);
    records.forEach((r) => {
      if (r.vehicleSegment) set.add(r.vehicleSegment);
    });
    return Array.from(set);
  }, [typeFilter, records]);

  // Reset segment filter if no longer valid for selected typeFilter
  useEffect(() => {
    if (
      segmentFilter !== 'All' &&
      !availableSegmentFilterOptions.includes(segmentFilter)
    ) {
      setSegmentFilter('All');
    }
  }, [segmentFilter, availableSegmentFilterOptions]);

  // Filtered & sorted records
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = records.filter((rec) => {
      if (typeFilter !== 'All' && rec.vehicleType !== typeFilter) return false;
      if (segmentFilter !== 'All' && rec.vehicleSegment !== segmentFilter)
        return false;
      if (statusFilter === 'Active' && !rec.isActive) return false;
      if (statusFilter === 'Inactive' && rec.isActive) return false;
      if (q) {
        const haystack = [
          rec.id,
          rec.manufacturer,
          rec.modelName,
          rec.variant,
          rec.vehicleType,
          rec.vehicleSegment,
          rec.fuelType,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortKey === 'isActive') {
        const av = a.isActive ? 1 : 0;
        const bv = b.isActive ? 1 : 0;
        return (bv - av) * sortDir;
      }
      const av = String(a[sortKey] || '').toLowerCase();
      const bv = String(b[sortKey] || '').toLowerCase();
      return av.localeCompare(bv) * sortDir;
    });
  }, [records, searchQuery, typeFilter, segmentFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const statusCounts = useMemo(() => {
    const active = records.filter((r) => r.isActive).length;
    return {
      all: records.length,
      active,
      inactive: records.length - active,
    };
  }, [records]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  // Drawer helpers
  const populateDrawerFromRecord = (rec: VehicleModelRecord, mode: DrawerMode) => {
    setDrawerMode(mode);
    setEditingId(rec.id);
    setFormId(rec.id);
    setFormManufacturer(rec.manufacturer);
    setManufacturerSearch('');
    setManufacturerMenuOpen(false);
    setFormModelName(rec.modelName);
    setFormVariant(rec.variant || '');
    setFormVehicleType(rec.vehicleType);
    setFormVehicleSegment(rec.vehicleSegment);
    setFormModelYear(rec.modelYear !== undefined && rec.modelYear !== '' ? String(rec.modelYear) : '');
    setFormFuelType(rec.fuelType || 'Diesel');
    setFormDescription(rec.description || '');
    setFormFuelTankCapacityL(
      rec.fuelTankCapacityL !== undefined && rec.fuelTankCapacityL !== ''
        ? String(rec.fuelTankCapacityL)
        : ''
    );
    setFormPayloadCapacityKg(
      rec.payloadCapacityKg !== undefined && rec.payloadCapacityKg !== ''
        ? String(rec.payloadCapacityKg)
        : ''
    );
    setFormSeatingCapacity(
      rec.seatingCapacity !== undefined && rec.seatingCapacity !== ''
        ? String(rec.seatingCapacity)
        : ''
    );
    setFormAxleCount(
      rec.axleCount !== undefined && rec.axleCount !== '' ? String(rec.axleCount) : ''
    );
    setFormIsAcVehicle(Boolean(rec.isAcVehicle));
    setFormIsAcReverse(Boolean(rec.isAcReverse));
    setFormIsActive(rec.isActive);

    // Clone icon slots cleanly
    const nextIcons = createDefaultIconsMap();
    for (const def of VEHICLE_STATE_DEFINITIONS) {
      if (rec.icons?.[def.key]?.previewUrl) {
        nextIcons[def.key] = { ...rec.icons[def.key] };
      }
    }
    setFormIcons(nextIcons);
    setIconUploadErrors({});
    setActivePreviewState('poll');
    setFormAudit({
      createdBy: rec.createdBy || 'Platform Admin',
      createdAt: rec.createdAt || '—',
      updatedBy: rec.updatedBy || 'Platform Admin',
      updatedAt: rec.updatedAt || '—',
    });
    setFormErrors({});
    setIsDirty(false);
    setIsDrawerOpen(true);
  };

  const handleOpenAdd = () => {
    const nextId = generateNextVehicleModelId(records);
    const today = new Date().toISOString().split('T')[0];
    setDrawerMode('add');
    setEditingId(null);
    setFormId(nextId);
    setFormManufacturer('Tata Motors');
    setManufacturerSearch('');
    setManufacturerMenuOpen(false);
    setFormModelName('');
    setFormVariant('Standard');
    setFormVehicleType('Truck');
    setFormVehicleSegment('HCV');
    setFormModelYear('2026');
    setFormFuelType('Diesel');
    setFormDescription('');
    setFormFuelTankCapacityL('');
    setFormPayloadCapacityKg('');
    setFormSeatingCapacity('');
    setFormAxleCount('');
    setFormIsAcVehicle(false);
    setFormIsAcReverse(false);
    setFormIsActive(true);
    setFormIcons(createDefaultIconsMap());
    setIconUploadErrors({});
    setActivePreviewState('poll');
    setFormAudit({
      createdBy: isPlatformAdmin ? 'Platform Admin' : `${currentCompany} Admin`,
      createdAt: today,
      updatedBy: isPlatformAdmin ? 'Platform Admin' : `${currentCompany} Admin`,
      updatedAt: today,
    });
    setFormErrors({});
    setIsDirty(false);
    setIsDrawerOpen(true);
  };

  const handleAttemptCloseDrawer = () => {
    if (drawerMode !== 'view' && isDirty) {
      setShowDiscardConfirm(true);
    } else {
      setIsDrawerOpen(false);
    }
  };

  const handleVehicleTypeChange = (nextType: string) => {
    setFormVehicleType(nextType);
    const validSegs = VEHICLE_SEGMENTS_BY_TYPE[nextType] || ALL_VEHICLE_SEGMENTS;
    if (!validSegs.includes(formVehicleSegment)) {
      setFormVehicleSegment(validSegs[0] || '');
    }
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.vehicleType;
      delete next.vehicleSegment;
      return next;
    });
    setIsDirty(true);
  };

  // Custom icon upload per state
  const handleIconUpload = (
    stateKey: VehicleStateKey,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const resetInput = () => {
      const ref = iconFileInputsRef.current[stateKey];
      if (ref) ref.value = '';
    };

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isAllowedMime =
      ALLOWED_ICON_MIME_TYPES.has(file.type) ||
      ['png', 'webp', 'svg'].includes(ext);

    if (!isAllowedMime) {
      setIconUploadErrors((prev) => ({
        ...prev,
        [stateKey]: 'Only PNG, WebP, or SVG icons are allowed.',
      }));
      resetInput();
      return;
    }

    if (file.size > MAX_ICON_SIZE_BYTES) {
      setIconUploadErrors((prev) => ({
        ...prev,
        [stateKey]: `File too large (${Math.round(file.size / 1024)} KB). Max allowed is 200 KB.`,
      }));
      resetInput();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const today = new Date().toISOString().split('T')[0];
      setFormIcons((prev) => ({
        ...prev,
        [stateKey]: {
          stateKey,
          source: 'custom',
          assetId: file.name,
          previewUrl: dataUrl,
          updatedAt: today,
          updatedBy: isPlatformAdmin ? 'Platform Admin' : `${currentCompany} Admin`,
        },
      }));
      setIconUploadErrors((prev) => {
        const next = { ...prev };
        delete next[stateKey];
        return next;
      });
      setActivePreviewState(stateKey);
      setIsDirty(true);
      showToast(`Updated custom icon for "${VEHICLE_STATE_DEFINITIONS.find((d) => d.key === stateKey)?.label}"`, 'info');
    };
    reader.readAsDataURL(file);
    resetInput();
  };

  const handleResetIconSlot = (stateKey: VehicleStateKey) => {
    const def = VEHICLE_STATE_DEFINITIONS.find((d) => d.key === stateKey);
    if (!def) return;
    setFormIcons((prev) => ({
      ...prev,
      [stateKey]: {
        stateKey,
        source: 'default',
        assetId: def.referenceFilename,
        previewUrl: getDefaultVehicleStateIconUrl(stateKey),
      },
    }));
    setIconUploadErrors((prev) => {
      const next = { ...prev };
      delete next[stateKey];
      return next;
    });
    setActivePreviewState(stateKey);
    setIsDirty(true);
  };

  const validateAndSave = () => {
    const errors: Record<string, string> = {};
    const mfg = formManufacturer.trim();
    const modelName = formModelName.trim();
    const variant = formVariant.trim();

    if (!mfg) {
      errors.manufacturer = 'Manufacturer is mandatory.';
    }
    if (!modelName) {
      errors.modelName = 'Vehicle Model Name is mandatory.';
    } else if (modelName.length > 100) {
      errors.modelName = 'Vehicle Model Name cannot exceed 100 characters.';
    }
    if (variant.length > 100) {
      errors.variant = 'Variant / Trim cannot exceed 100 characters.';
    }
    if (!formVehicleType) {
      errors.vehicleType = 'Vehicle Type is mandatory.';
    }
    if (!formVehicleSegment) {
      errors.vehicleSegment = 'Vehicle Segment is mandatory.';
    }

    if (formModelYear.trim()) {
      const yr = Number(formModelYear);
      if (isNaN(yr) || yr < 1980 || yr > 2100) {
        errors.modelYear = 'Enter a valid year between 1980 and 2100.';
      }
    }

    if (formFuelTankCapacityL.trim() && Number(formFuelTankCapacityL) < 0) {
      errors.fuelTankCapacityL = 'Fuel Tank Capacity must be ≥ 0.';
    }
    if (formPayloadCapacityKg.trim() && Number(formPayloadCapacityKg) < 0) {
      errors.payloadCapacityKg = 'Payload Capacity must be ≥ 0.';
    }
    if (formSeatingCapacity.trim() && Number(formSeatingCapacity) < 0) {
      errors.seatingCapacity = 'Seating Capacity must be ≥ 0.';
    }
    if (formAxleCount.trim() && Number(formAxleCount) < 0) {
      errors.axleCount = 'Number of Axles must be ≥ 0.';
    }

    // Check duplicate Manufacturer + Model Name + Variant combination (PRD §6A)
    if (mfg && modelName) {
      const targetCombo = getNormalizedModelComboKey(mfg, modelName, variant);
      const duplicate = records.find(
        (r) =>
          r.id !== editingId &&
          getNormalizedModelComboKey(r.manufacturer, r.modelName, r.variant) ===
            targetCombo
      );
      if (duplicate) {
        errors.duplicate = `Duplicate Vehicle Model! "${mfg} – ${modelName} (${variant || 'Standard'})" already exists as ${duplicate.id}.`;
      }
    }

    // Ensure all 7 icon slots resolve to a valid previewUrl
    const resolvedIcons = { ...formIcons };
    for (const def of VEHICLE_STATE_DEFINITIONS) {
      if (!resolvedIcons[def.key]?.previewUrl) {
        resolvedIcons[def.key] = {
          stateKey: def.key,
          source: 'default',
          assetId: def.referenceFilename,
          previewUrl: getDefaultVehicleStateIconUrl(def.key),
        };
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const actor = isPlatformAdmin ? 'Platform Admin' : `${currentCompany} Admin`;

    const payload: VehicleModelRecord = {
      id: editingId || formId || generateNextVehicleModelId(records),
      manufacturer: mfg,
      modelName,
      variant: variant || 'Standard',
      vehicleType: formVehicleType,
      vehicleSegment: formVehicleSegment,
      modelYear: formModelYear.trim() ? Number(formModelYear) : '',
      fuelType: formFuelType || 'Diesel',
      description: formDescription.trim(),
      fuelTankCapacityL: formFuelTankCapacityL.trim()
        ? Number(formFuelTankCapacityL)
        : '',
      payloadCapacityKg: formPayloadCapacityKg.trim()
        ? Number(formPayloadCapacityKg)
        : '',
      seatingCapacity: formSeatingCapacity.trim()
        ? Number(formSeatingCapacity)
        : '',
      axleCount: formAxleCount.trim() ? Number(formAxleCount) : '',
      isAcVehicle: formIsAcVehicle,
      isAcReverse: formIsAcReverse,
      isActive: formIsActive,
      icons: resolvedIcons,
      createdBy: editingId ? formAudit.createdBy : actor,
      createdAt: editingId ? formAudit.createdAt : today,
      updatedBy: actor,
      updatedAt: today,
    };

    setRecords((prev) => {
      const next = editingId
        ? prev.map((r) => (r.id === editingId ? payload : r))
        : [payload, ...prev];
      saveVehicleModelStore(next);
      return next;
    });

    showToast(
      editingId
        ? `Updated vehicle model "${payload.manufacturer} – ${payload.modelName}"`
        : `Created vehicle model ${payload.id} ("${payload.manufacturer} – ${payload.modelName}")`,
      'success'
    );
    setIsDrawerOpen(false);
    setIsDirty(false);
  };

  // Status activation / deactivation handler
  const handleConfirmStatusToggle = () => {
    if (!pendingStatusToggle) return;
    const target = pendingStatusToggle;
    const nextActive = !target.isActive;
    const today = new Date().toISOString().split('T')[0];

    setRecords((prev) => {
      const next = prev.map((r) =>
        r.id === target.id
          ? {
              ...r,
              isActive: nextActive,
              updatedAt: today,
              updatedBy: isPlatformAdmin ? 'Platform Admin' : `${currentCompany} Admin`,
            }
          : r
      );
      saveVehicleModelStore(next);
      return next;
    });

    showToast(
      nextActive
        ? `Activated "${target.manufacturer} – ${target.modelName}". Now available in Add Vehicle dropdown.`
        : `Deactivated "${target.manufacturer} – ${target.modelName}". Existing vehicles keep their link.`,
      'info'
    );
    setPendingStatusToggle(null);
  };

  // Delete confirmation handler (warns if vehicles reference it)
  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== target.id);
      saveVehicleModelStore(next);
      return next;
    });
    showToast(
      `Deleted vehicle model ${target.id} ("${target.manufacturer} – ${target.modelName}").`,
      'success'
    );
    setPendingDelete(null);
  };

  const handleExportCSV = () => {
    const headers = [
      'Model ID',
      'Manufacturer',
      'Vehicle Model Name',
      'Variant',
      'Vehicle Type',
      'Vehicle Segment',
      'Model Year',
      'Fuel Type',
      'Tank Capacity (L)',
      'Payload Capacity (kg)',
      'Seating Capacity',
      'Axles',
      'AC Vehicle',
      'AC Reverse',
      'Icon Setup',
      'Status',
      'Created Date',
    ];
    const rows = filteredRecords.map((r) => {
      const iconSum = getIconSetupSummary(r).label;
      return [
        r.id,
        r.manufacturer,
        r.modelName,
        r.variant,
        r.vehicleType,
        r.vehicleSegment,
        r.modelYear ?? '',
        r.fuelType,
        r.fuelTankCapacityL ?? '',
        r.payloadCapacityKg ?? '',
        r.seatingCapacity ?? '',
        r.axleCount ?? '',
        r.isAcVehicle ? 'Yes' : 'No',
        r.isAcReverse ? 'Yes' : 'No',
        iconSum,
        r.isActive ? 'Active' : 'Inactive',
        r.createdAt,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleetrobo-vehicle-models-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredRecords.length} vehicle model(s) to CSV`, 'info');
  };

  const handleResetDemo = () => {
    const seeded = resetVehicleModelStore();
    setRecords(seeded);
    setPage(1);
    showToast('Restored default Vehicle Model Master sample catalog', 'info');
  };

  const currentFormIconSummary = useMemo(() => {
    let customCount = 0;
    for (const def of VEHICLE_STATE_DEFINITIONS) {
      if (formIcons[def.key]?.source === 'custom') customCount++;
    }
    return {
      customCount,
      defaultCount: 7 - customCount,
      label:
        customCount === 0
          ? 'Default 7/7'
          : `Custom ${customCount}/7 + Default ${7 - customCount}/7`,
    };
  }, [formIcons]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden text-slate-900 select-none">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-16 right-6 z-[140] flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-medium transition-all ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : toast.type === 'info'
              ? 'bg-sky-50 border-sky-200 text-sky-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="px-6 pt-5 pb-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold text-slate-400">
                Setup
              </span>
              <span className="text-slate-300 text-xs">/</span>
              <span className="text-[11px] font-semibold text-[#FA8A63]">
                Vehicle Model Master
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Vehicle Model Master
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-[#FA8A63]">
                {statusCounts.active} active · {statusCounts.all} total
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                  isPlatformAdmin
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                {isPlatformAdmin
                  ? 'Platform Admin · Global Source of Truth'
                  : `${currentCompany} · Admin Setup View`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Central catalog of vehicle manufacturers, models, variants, specifications, and 7-state Track on Map icons synced directly to Add Vehicle.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetDemo}
              title="Reset sample vehicle models to default catalog"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw size={13} className="text-slate-500" />
              <span>Reset sample models</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              title="Export Vehicle Models to CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <FileDown size={14} className="text-slate-500" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add New</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Search & Filters Toolbar */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {/* Free-text search */}
          <div className="relative flex-1 min-w-[230px] max-w-md">
            <Search size={14} className="text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search Model ID, manufacturer, model name, variant..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#FA8A63] rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Vehicle Type Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-500">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-[31px] px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:outline-none focus:border-[#FA8A63] cursor-pointer hover:border-slate-300"
            >
              <option value="All">All Types</option>
              {VEHICLE_TYPES.map((vt) => (
                <option key={vt} value={vt}>
                  {vt}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Segment Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-500">Segment:</span>
            <select
              value={segmentFilter}
              onChange={(e) => {
                setSegmentFilter(e.target.value);
                setPage(1);
              }}
              className="h-[31px] px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:outline-none focus:border-[#FA8A63] cursor-pointer hover:border-slate-300"
            >
              <option value="All">All Segments</option>
              {availableSegmentFilterOptions.map((seg) => (
                <option key={seg} value={seg}>
                  {seg}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className="h-[31px] px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:outline-none focus:border-[#FA8A63] cursor-pointer hover:border-slate-300"
            >
              <option value="All">All ({statusCounts.all})</option>
              <option value="Active">Active ({statusCounts.active})</option>
              <option value="Inactive">Inactive ({statusCounts.inactive})</option>
            </select>
          </div>

          {(searchQuery ||
            typeFilter !== 'All' ||
            segmentFilter !== 'All' ||
            statusFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('All');
                setSegmentFilter('All');
                setStatusFilter('All');
                setPage(1);
              }}
              className="text-xs text-[#FA8A63] font-semibold hover:underline cursor-pointer whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-500 shrink-0">
          <span>
            Showing{' '}
            <strong className="text-slate-900 font-semibold">
              {filteredRecords.length}
            </strong>{' '}
            of {records.length} models
          </span>
          <button
            type="button"
            onClick={() => {
              setRecords(loadVehicleModelStore());
              showToast('Vehicle Model catalog refreshed', 'info');
            }}
            title="Refresh list"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer transition-colors"
          >
            <RefreshCw size={13} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* 3. Master Listing Table (PRD §5 exact columns) */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1260px] text-left border-collapse text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-10 select-none">
                <tr>
                  <th className="px-3.5 py-3 font-semibold text-slate-600 whitespace-nowrap w-[62px]">
                    S.No.
                  </th>
                  <th
                    onClick={() => handleSort('id')}
                    className="px-3.5 py-3 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Model ID</span>
                      {sortKey === 'id' ? (
                        sortDir === 1 ? (
                          <ArrowUp className="w-3 h-3 text-[#FA8A63]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-[#FA8A63]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('manufacturer')}
                    className="px-3.5 py-3 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Vehicle Manufacturer</span>
                      {sortKey === 'manufacturer' ? (
                        sortDir === 1 ? (
                          <ArrowUp className="w-3 h-3 text-[#FA8A63]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-[#FA8A63]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('modelName')}
                    className="px-3.5 py-3 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Vehicle Model Name</span>
                      {sortKey === 'modelName' ? (
                        sortDir === 1 ? (
                          <ArrowUp className="w-3 h-3 text-[#FA8A63]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-[#FA8A63]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="px-3.5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                    Variant
                  </th>
                  <th
                    onClick={() => handleSort('vehicleType')}
                    className="px-3.5 py-3 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Vehicle Type</span>
                      {sortKey === 'vehicleType' ? (
                        sortDir === 1 ? (
                          <ArrowUp className="w-3 h-3 text-[#FA8A63]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-[#FA8A63]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('vehicleSegment')}
                    className="px-3.5 py-3 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Vehicle Segment</span>
                      {sortKey === 'vehicleSegment' ? (
                        sortDir === 1 ? (
                          <ArrowUp className="w-3 h-3 text-[#FA8A63]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-[#FA8A63]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="px-3.5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                    Fuel Type
                  </th>
                  <th className="px-3.5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                    Map Icon Preview
                  </th>
                  <th className="px-3.5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                    Icon Setup
                  </th>
                  <th
                    onClick={() => handleSort('isActive')}
                    className="px-3.5 py-3 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      {sortKey === 'isActive' ? (
                        sortDir === 1 ? (
                          <ArrowUp className="w-3 h-3 text-[#FA8A63]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-[#FA8A63]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('createdAt')}
                    className="px-3.5 py-3 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Created Date</span>
                      {sortKey === 'createdAt' ? (
                        sortDir === 1 ? (
                          <ArrowUp className="w-3 h-3 text-[#FA8A63]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-[#FA8A63]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="px-3.5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                    Updated Date
                  </th>
                  <th className="px-3 py-3 text-right font-semibold text-slate-700 sticky right-0 bg-slate-50/95 border-l border-slate-200/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap w-[76px] z-10">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-400">
                      <div className="max-w-sm mx-auto space-y-2">
                        <Truck className="w-8 h-8 text-slate-300 mx-auto" />
                        <div className="text-sm font-semibold text-slate-700">
                          No vehicle models found
                        </div>
                        <p className="text-xs text-slate-500">
                          No vehicle models matched your current search and filter criteria. Click{' '}
                          <span className="font-semibold text-[#FA8A63]">+ Add New</span> to add a vehicle model.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((rec, idx) => {
                    const serialNo = (currentPage - 1) * pageSize + idx + 1;
                    const iconSummary = getIconSetupSummary(rec);
                    const dependentCount = countDependentVehicles(rec, vehiclesList);

                    return (
                      <tr
                        key={rec.id}
                        onClick={() => populateDrawerFromRecord(rec, 'view')}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="px-3.5 py-3 text-slate-500 font-medium tabular-nums">
                          {serialNo}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[11px] font-semibold">
                            {rec.id}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-medium text-slate-800 whitespace-nowrap">
                          {rec.manufacturer}
                        </td>
                        <td className="px-3.5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="group-hover:text-[#FA8A63] transition-colors">
                              {rec.modelName}
                            </span>
                            {rec.fuelType && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                                {rec.fuelType}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">
                          {rec.variant || 'Standard'}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200/80 text-[11px] font-semibold">
                            {rec.vehicleType}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                            {rec.vehicleSegment}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                          {rec.fuelType || '—'}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-8 h-8 rounded-lg border border-slate-200 bg-white p-0.5 flex items-center justify-center shadow-2xs">
                              <img
                                src={rec.icons.poll.previewUrl}
                                alt={`${rec.modelName} Polling`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="w-6 h-6 rounded border border-slate-200 bg-white p-0.5 flex items-center justify-center">
                              <img
                                src={rec.icons.move.previewUrl}
                                alt={`${rec.modelName} Moving`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="w-6 h-6 rounded border border-slate-200 bg-white p-0.5 flex items-center justify-center">
                              <img
                                src={rec.icons.towing.previewUrl}
                                alt={`${rec.modelName} Towing`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              iconSummary.customCount > 0
                                ? 'bg-orange-50 text-[#B85324] border-[#FA8A63]/40'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>{iconSummary.label}</span>
                          </span>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              rec.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                rec.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {rec.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {rec.createdAt || '—'}
                        </td>
                        <td className="px-3.5 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {rec.updatedAt || '—'}
                        </td>
                        <td
                          className="px-3 py-3 text-right sticky right-0 bg-white/95 group-hover:bg-slate-50/95 border-l border-slate-100 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end">
                            <RowActionMenu
                              ariaLabel={`Actions for ${rec.manufacturer} ${rec.modelName}`}
                              items={[
                                {
                                  id: 'view',
                                  label: 'View vehicle model',
                                  icon: <Eye className="w-3.5 h-3.5 text-slate-400" />,
                                  onClick: () => populateDrawerFromRecord(rec, 'view'),
                                },
                                {
                                  id: 'edit',
                                  label: 'Edit vehicle model',
                                  icon: <Edit2 className="w-3.5 h-3.5 text-slate-400" />,
                                  onClick: () => populateDrawerFromRecord(rec, 'edit'),
                                },
                                {
                                  id: 'toggle-status',
                                  label: rec.isActive ? 'Deactivate' : 'Activate',
                                  icon: <Power className="w-3.5 h-3.5" />,
                                  tone: rec.isActive ? 'warning' : 'accent',
                                  onClick: () => setPendingStatusToggle(rec),
                                },
                                {
                                  id: 'delete',
                                  label:
                                    dependentCount > 0
                                      ? `Delete (${dependentCount} linked)`
                                      : 'Delete model',
                                  icon: <Trash2 className="w-3.5 h-3.5" />,
                                  tone: 'danger',
                                  dividerBefore: true,
                                  onClick: () => setPendingDelete(rec),
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
        </div>
      </div>

      {/* 4. Pagination Footer */}
      <div className="bg-white px-6 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as 10 | 25 | 50);
              setPage(1);
            }}
            className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-800 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span>
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          ADD / EDIT / VIEW DRAWER (PRD §6)
         ===================================================================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/35 backdrop-blur-[1px]">
          <div className="w-[780px] max-w-full h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {drawerMode === 'add'
                      ? 'Add Vehicle Model'
                      : drawerMode === 'edit'
                      ? `Edit Vehicle Model: ${formId}`
                      : `View Vehicle Model: ${formId}`}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      formIsActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {formIsActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {drawerMode === 'view'
                    ? 'Inspect vehicle model attributes, technical capacities, and 7-state Track on Map icons.'
                    : 'Configure model identity, specifications, and state-wise map markers for Add Vehicle.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {drawerMode === 'view' && (
                  <button
                    type="button"
                    onClick={() => setDrawerMode('edit')}
                    className="h-8 px-3 rounded-lg bg-[#FFF3EE] text-[#F26522] hover:bg-[#fee5d8] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAttemptCloseDrawer}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]/50">
              {formErrors.duplicate && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formErrors.duplicate}</span>
                </div>
              )}

              {/* SECTION A — BASIC INFORMATION */}
              <div className="rounded-xl border border-slate-200 bg-white p-4.5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#FA8A63]" />
                      A. Basic Information
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      System identifier, OEM manufacturer, model name, variant, and vehicle classification
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Unique OEM + Model + Variant
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                  {/* Vehicle Model ID */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Vehicle Model ID
                      <InfoTooltip content="System-generated immutable model identifier used for Add Vehicle linkage." />
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formId}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-slate-600 focus:outline-none cursor-default"
                    />
                  </div>

                  {/* Manufacturer * (Searchable dropdown with custom entry) */}
                  <div className="space-y-1" ref={manufacturerRef}>
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Manufacturer <span className="text-rose-500 ml-0.5">*</span>
                      <InfoTooltip content="Search existing OEMs or enter a new vehicle manufacturer name." />
                    </label>
                    {drawerMode === 'view' ? (
                      <div className="h-8 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center text-xs font-semibold text-slate-800">
                        {formManufacturer || '—'}
                      </div>
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setManufacturerMenuOpen((prev) => !prev)
                          }
                          className={`w-full h-8 px-3 rounded-lg border bg-white text-xs flex items-center justify-between gap-2 focus:outline-none cursor-pointer ${
                            formErrors.manufacturer
                              ? 'border-rose-500'
                              : 'border-slate-300 hover:border-slate-400 focus:border-[#FA8A63]'
                          }`}
                        >
                          <span
                            className={
                              formManufacturer
                                ? 'text-slate-900 font-medium truncate'
                                : 'text-slate-400'
                            }
                          >
                            {formManufacturer || '-- Select Manufacturer --'}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                              manufacturerMenuOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {manufacturerMenuOpen && (
                          <div className="absolute left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-xl z-40 overflow-hidden">
                            <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                              <div className="relative">
                                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  autoFocus
                                  value={manufacturerSearch}
                                  onChange={(e) =>
                                    setManufacturerSearch(e.target.value)
                                  }
                                  placeholder="Search or type custom OEM..."
                                  className="w-full h-7 pl-6 pr-2 rounded border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                                />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                              {allManufacturers
                                .filter(
                                  (m) =>
                                    !manufacturerSearch.trim() ||
                                    m
                                      .toLowerCase()
                                      .includes(
                                        manufacturerSearch.trim().toLowerCase()
                                      )
                                )
                                .map((m) => {
                                  const selected = formManufacturer === m;
                                  return (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => {
                                        setFormManufacturer(m);
                                        setManufacturerMenuOpen(false);
                                        setManufacturerSearch('');
                                        setFormErrors((p) => {
                                          const n = { ...p };
                                          delete n.manufacturer;
                                          delete n.duplicate;
                                          return n;
                                        });
                                        setIsDirty(true);
                                      }}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer ${
                                        selected
                                          ? 'bg-[#FFF3EE] text-[#B85324] font-semibold'
                                          : 'text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span>{m}</span>
                                      {selected && (
                                        <Check className="w-3.5 h-3.5 text-[#FA8A63]" />
                                      )}
                                    </button>
                                  );
                                })}

                              {manufacturerSearch.trim() &&
                                !allManufacturers.some(
                                  (m) =>
                                    m.toLowerCase() ===
                                    manufacturerSearch.trim().toLowerCase()
                                ) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormManufacturer(
                                        manufacturerSearch.trim()
                                      );
                                      setManufacturerMenuOpen(false);
                                      setManufacturerSearch('');
                                      setIsDirty(true);
                                    }}
                                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-orange-50 text-[#B85324] hover:bg-orange-100 text-xs font-semibold cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>
                                      Use "{manufacturerSearch.trim()}"
                                    </span>
                                  </button>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {formErrors.manufacturer && (
                      <p className="text-[10px] text-rose-600 font-semibold">
                        {formErrors.manufacturer}
                      </p>
                    )}
                  </div>

                  {/* Vehicle Model Name * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Vehicle Model Name{' '}
                      <span className="text-rose-500 ml-0.5">*</span>
                      <InfoTooltip content="Primary commercial or fleet model name (max 100 chars). Example: Prima 5530.S." />
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      disabled={drawerMode === 'view'}
                      placeholder="e.g. Prima 5530.S"
                      value={formModelName}
                      onChange={(e) => {
                        setFormModelName(e.target.value);
                        setFormErrors((p) => {
                          const n = { ...p };
                          delete n.modelName;
                          delete n.duplicate;
                          return n;
                        });
                        setIsDirty(true);
                      }}
                      className={`w-full h-8 px-3 rounded-lg border text-xs focus:outline-none ${
                        formErrors.modelName
                          ? 'border-rose-500'
                          : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${
                        drawerMode === 'view'
                          ? 'bg-slate-50 text-slate-600 cursor-not-allowed'
                          : 'bg-white text-slate-900'
                      }`}
                    />
                    {formErrors.modelName && (
                      <p className="text-[10px] text-rose-600 font-semibold">
                        {formErrors.modelName}
                      </p>
                    )}
                  </div>

                  {/* Variant / Trim */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Variant / Trim
                      <InfoTooltip content="Optional body/axle trim distinction (max 100 chars). Defaults to Standard." />
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      disabled={drawerMode === 'view'}
                      placeholder="e.g. 6x4 BS6 or Standard"
                      value={formVariant}
                      onChange={(e) => {
                        setFormVariant(e.target.value);
                        setFormErrors((p) => {
                          const n = { ...p };
                          delete n.variant;
                          delete n.duplicate;
                          return n;
                        });
                        setIsDirty(true);
                      }}
                      className={`w-full h-8 px-3 rounded-lg border text-xs focus:outline-none ${
                        formErrors.variant
                          ? 'border-rose-500'
                          : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${
                        drawerMode === 'view'
                          ? 'bg-slate-50 text-slate-600 cursor-not-allowed'
                          : 'bg-white text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Vehicle Type * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Vehicle Type <span className="text-rose-500 ml-0.5">*</span>
                      <InfoTooltip content="Broad asset body classification. Dynamically filters available Vehicle Segments." />
                    </label>
                    <select
                      disabled={drawerMode === 'view'}
                      value={formVehicleType}
                      onChange={(e) => handleVehicleTypeChange(e.target.value)}
                      className={`w-full h-8 px-2.5 rounded-lg border text-xs focus:outline-none ${
                        formErrors.vehicleType
                          ? 'border-rose-500'
                          : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${
                        drawerMode === 'view'
                          ? 'bg-slate-50 text-slate-600 cursor-not-allowed'
                          : 'bg-white text-slate-900 cursor-pointer'
                      }`}
                    >
                      {VEHICLE_TYPES.map((vt) => (
                        <option key={vt} value={vt}>
                          {vt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vehicle Segment * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Vehicle Segment{' '}
                      <span className="text-rose-500 ml-0.5">*</span>
                      <InfoTooltip content="Weight/duty segment filtered by selected Vehicle Type (e.g. HCV, MCV, LCV, Passenger)." />
                    </label>
                    <select
                      disabled={drawerMode === 'view'}
                      value={formVehicleSegment}
                      onChange={(e) => {
                        setFormVehicleSegment(e.target.value);
                        setFormErrors((p) => {
                          const n = { ...p };
                          delete n.vehicleSegment;
                          return n;
                        });
                        setIsDirty(true);
                      }}
                      className={`w-full h-8 px-2.5 rounded-lg border text-xs focus:outline-none ${
                        formErrors.vehicleSegment
                          ? 'border-rose-500'
                          : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${
                        drawerMode === 'view'
                          ? 'bg-slate-50 text-slate-600 cursor-not-allowed'
                          : 'bg-white text-slate-900 cursor-pointer'
                      }`}
                    >
                      {availableSegmentsForForm.map((seg) => (
                        <option key={seg} value={seg}>
                          {seg}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model Year */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Model Year
                      <InfoTooltip content="Optional catalog release year (e.g. 2026)." />
                    </label>
                    <input
                      type="number"
                      disabled={drawerMode === 'view'}
                      placeholder="e.g. 2026"
                      value={formModelYear}
                      onChange={(e) => {
                        setFormModelYear(e.target.value);
                        setIsDirty(true);
                      }}
                      className={`w-full h-8 px-3 rounded-lg border text-xs focus:outline-none ${
                        formErrors.modelYear
                          ? 'border-rose-500'
                          : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${
                        drawerMode === 'view'
                          ? 'bg-slate-50 text-slate-600 cursor-not-allowed'
                          : 'bg-white text-slate-900'
                      }`}
                    />
                    {formErrors.modelYear && (
                      <p className="text-[10px] text-rose-600 font-semibold">
                        {formErrors.modelYear}
                      </p>
                    )}
                  </div>

                  {/* Fuel Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Fuel Type
                      <InfoTooltip content="Default propulsion energy source inherited when adding vehicles." />
                    </label>
                    <select
                      disabled={drawerMode === 'view'}
                      value={formFuelType}
                      onChange={(e) => {
                        setFormFuelType(e.target.value);
                        setIsDirty(true);
                      }}
                      className={`w-full h-8 px-2.5 rounded-lg border border-slate-300 focus:border-[#FA8A63] text-xs focus:outline-none ${
                        drawerMode === 'view'
                          ? 'bg-slate-50 text-slate-600 cursor-not-allowed'
                          : 'bg-white text-slate-900 cursor-pointer'
                      }`}
                    >
                      {VEHICLE_MODEL_FUEL_TYPES.map((ft) => (
                        <option key={ft} value={ft}>
                          {ft}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Description / Operational Notes
                    </label>
                    <textarea
                      rows={2}
                      disabled={drawerMode === 'view'}
                      placeholder="Operational application, body type notes, or deployment notes..."
                      value={formDescription}
                      onChange={(e) => {
                        setFormDescription(e.target.value);
                        setIsDirty(true);
                      }}
                      className={`w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#FA8A63] text-xs focus:outline-none resize-none ${
                        drawerMode === 'view'
                          ? 'bg-slate-50 text-slate-600 cursor-not-allowed'
                          : 'bg-white text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B — SPECIFICATIONS */}
              <div className="rounded-xl border border-slate-200 bg-white p-4.5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      B. Specifications & Status
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Capacities, axle configuration, AC compatibility, and active catalog status
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Add Vehicle Prefill Defaults
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Fuel Tank Capacity (L)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      disabled={drawerMode === 'view'}
                      placeholder="e.g. 365"
                      value={formFuelTankCapacityL}
                      onChange={(e) => {
                        setFormFuelTankCapacityL(e.target.value);
                        setIsDirty(true);
                      }}
                      className={`w-full h-8 px-3 rounded-lg border text-xs focus:outline-none ${
                        formErrors.fuelTankCapacityL
                          ? 'border-rose-500'
                          : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${
                        drawerMode === 'view'
                          ? 'bg-slate-50 text-slate-600 cursor-not-allowed'
                          : 'bg-white text-slate-900'
                      }`}
                    />
                    {formErrors.fuelTankCapacityL && (
                      <p className="text-[10px] text-rose-600 font-semibold">
                        {formErrors.fuelTankCapacityL}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Payload Capacity (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={drawerMode === 'view'}
                      placeholder="e.g. 24000"
                      value={formPayloadCapacityKg}
                      onChange={(e) => {
                        setFormPayloadCapacityKg(e.target.value);
                        setIsDirty(true);
                      }}
                      className={`w-full h-8 px-3 rounded-lg border text-xs focus:outline-none ${
                        formErrors.payloadCapacityKg
                          ? 'border-rose-500'
                          : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${
                        drawerMode === 'view'
                          ? 'bg-slate-50 text-slate-600 cursor-not-allowed'
                          : 'bg-white text-slate-900'
                      }`}
                    />
                    {formErrors.payloadCapacityKg && (
                      <p className="text-[10px] text-rose-600 font-semibold">
                        {formErrors.payloadCapacityKg}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Seating Capacity (persons)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={drawerMode === 'view'}
                      placeholder="e.g. 2 or 38 for Bus"
                      value={formSeatingCapacity}
                      onChange={(e) => {
                        setFormSeatingCapacity(e.target.value);
                        setIsDirty(true);
                      }}
                      className={`w-full h-8 px-3 rounded-lg border text-xs focus:outline-none ${
                        formErrors.seatingCapacity
                          ? 'border-rose-500'
                          : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${
                        drawerMode === 'view'
                          ? 'bg-slate-50 text-slate-600 cursor-not-allowed'
                          : 'bg-white text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Number of Axles
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={drawerMode === 'view'}
                      placeholder="e.g. 2 or 3"
                      value={formAxleCount}
                      onChange={(e) => {
                        setFormAxleCount(e.target.value);
                        setIsDirty(true);
                      }}
                      className={`w-full h-8 px-3 rounded-lg border text-xs focus:outline-none ${
                        formErrors.axleCount
                          ? 'border-rose-500'
                          : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${
                        drawerMode === 'view'
                          ? 'bg-slate-50 text-slate-600 cursor-not-allowed'
                          : 'bg-white text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Boolean Flags Row */}
                <div className="pt-2 grid grid-cols-3 gap-3 border-t border-slate-100">
                  <label
                    className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      formIsAcVehicle
                        ? 'bg-sky-50/70 border-sky-200'
                        : 'bg-slate-50 border-slate-200'
                    } ${drawerMode === 'view' ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className="text-xs font-semibold text-slate-800">
                      Is AC Vehicle
                    </span>
                    <input
                      type="checkbox"
                      disabled={drawerMode === 'view'}
                      checked={formIsAcVehicle}
                      onChange={(e) => {
                        setFormIsAcVehicle(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer"
                    />
                  </label>

                  <label
                    className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      formIsAcReverse
                        ? 'bg-sky-50/70 border-sky-200'
                        : 'bg-slate-50 border-slate-200'
                    } ${drawerMode === 'view' ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                      Is AC Reverse
                      <InfoTooltip content="Invert digital AC input polarity for legacy telematics sensors." />
                    </span>
                    <input
                      type="checkbox"
                      disabled={drawerMode === 'view'}
                      checked={formIsAcReverse}
                      onChange={(e) => {
                        setFormIsAcReverse(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer"
                    />
                  </label>

                  <label
                    className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      formIsActive
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-100 border-slate-300'
                    } ${drawerMode === 'view' ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className="text-xs font-bold text-slate-900">
                      Active <span className="text-rose-500">*</span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={drawerMode === 'view'}
                      checked={formIsActive}
                      onChange={(e) => {
                        setFormIsActive(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* SECTION C — MAP ICON / IMAGE CONFIGURATION (All 7 States) */}
              <div className="rounded-xl border border-slate-200 bg-white p-4.5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      C. Map Icon / Image Configuration (7 States)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      System default icons are pre-loaded for all 7 operational states. Upload custom icons (PNG, WebP, SVG ≤ 200 KB) or reset anytime.
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      currentFormIconSummary.customCount > 0
                        ? 'bg-orange-50 text-[#B85324] border-[#FA8A63]/40'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {currentFormIconSummary.label}
                  </span>
                </div>

                {/* Consolidated Track on Map Live Strip Preview */}
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-sky-50/40 to-emerald-50/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-[#FA8A63]" />
                      <span>Track on Map Consolidated Preview</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Active Preview:{' '}
                      <strong className="text-slate-800">
                        {
                          VEHICLE_STATE_DEFINITIONS.find(
                            (d) => d.key === activePreviewState
                          )?.label
                        }
                      </strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {VEHICLE_STATE_DEFINITIONS.map((def) => {
                      const slot = formIcons[def.key];
                      const isSelected = activePreviewState === def.key;
                      return (
                        <button
                          key={def.key}
                          type="button"
                          onClick={() => setActivePreviewState(def.key)}
                          className={`flex flex-col items-center p-2 rounded-lg border bg-white transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#FA8A63] ring-2 ring-[#FA8A63]/20 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img
                            src={slot.previewUrl}
                            alt={def.label}
                            className="w-9 h-9 object-contain"
                          />
                          <span className="text-[10px] font-semibold text-slate-800 mt-1 truncate max-w-full">
                            {def.shortLabel}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1 rounded mt-0.5 ${
                              slot.source === 'custom'
                                ? 'bg-orange-100 text-[#B85324]'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {slot.source === 'custom' ? 'Custom' : 'Default'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2-Column Grid of 7 State Cards */}
                <div className="grid grid-cols-2 gap-3.5">
                  {VEHICLE_STATE_DEFINITIONS.map((def) => {
                    const slot = formIcons[def.key];
                    const errMsg = iconUploadErrors[def.key];
                    const isCustom = slot.source === 'custom';

                    return (
                      <div
                        key={def.key}
                        className={`rounded-xl border p-3 transition-all ${
                          activePreviewState === def.key
                            ? 'border-[#FA8A63]/60 bg-orange-50/10'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900">
                                {def.label}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  isCustom
                                    ? 'bg-[#FFF3EE] text-[#B85324] border border-[#FA8A63]/40'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {isCustom ? 'Custom' : 'Default'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {def.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* 64x64 Preview Frame */}
                          <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 flex items-center justify-center shrink-0">
                            <img
                              src={slot.previewUrl}
                              alt={`${def.label} icon`}
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="text-[10px] text-slate-500 truncate font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100">
                              {slot.assetId}
                            </div>

                            {drawerMode !== 'view' && (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="file"
                                  accept=".png,.webp,.svg,image/png,image/webp,image/svg+xml"
                                  className="hidden"
                                  ref={(el) => {
                                    iconFileInputsRef.current[def.key] = el;
                                  }}
                                  onChange={(e) => handleIconUpload(def.key, e)}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    iconFileInputsRef.current[def.key]?.click()
                                  }
                                  className="flex-1 h-7 px-2.5 rounded-lg border border-slate-300 bg-white hover:border-[#FA8A63] hover:bg-orange-50/30 text-[11px] font-semibold text-slate-700 inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Upload className="w-3 h-3 text-[#FA8A63]" />
                                  <span>{isCustom ? 'Replace' : 'Upload'}</span>
                                </button>

                                {isCustom && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetIconSlot(def.key)}
                                    title={`Reset ${def.label} back to ${def.referenceFilename}`}
                                    className="h-7 px-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-600 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reset</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {errMsg && (
                          <p className="text-[10px] text-rose-600 font-semibold mt-2">
                            {errMsg}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION D — AUDIT FIELDS (READ-ONLY) */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  D. Audit Fields
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      Created By
                    </div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {formAudit.createdBy || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      Created At
                    </div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {formAudit.createdAt || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      Last Modified By
                    </div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {formAudit.updatedBy || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      Last Modified At
                    </div>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {formAudit.updatedAt || '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Sticky Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                {drawerMode === 'view'
                  ? `Viewing ${formId}`
                  : isDirty
                  ? 'Unsaved changes pending'
                  : 'All 7 operational map icons valid'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAttemptCloseDrawer}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  {drawerMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {drawerMode !== 'view' && (
                  <button
                    type="button"
                    onClick={validateAndSave}
                    className="px-5 py-2 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    {drawerMode === 'add' ? 'Save Vehicle Model' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discard Unsaved Changes Confirmation */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Discard unsaved changes?</span>
            </div>
            <p className="text-xs text-slate-600">
              You have unsaved edits in this Vehicle Model record. Closing now will discard them.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  setIsDirty(false);
                  setIsDrawerOpen(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activate / Deactivate Safeguard Modal (PRD §5) */}
      {pendingStatusToggle && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 space-y-3.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Layers className="w-4 h-4 text-[#FA8A63]" />
              <span>
                {pendingStatusToggle.isActive
                  ? 'Deactivate Vehicle Model?'
                  : 'Activate Vehicle Model?'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {pendingStatusToggle.isActive ? (
                <>
                  Deactivating{' '}
                  <strong className="text-slate-900">
                    {pendingStatusToggle.manufacturer} –{' '}
                    {pendingStatusToggle.modelName} (
                    {pendingStatusToggle.variant})
                  </strong>{' '}
                  will hide it from new{' '}
                  <span className="font-semibold">Add Vehicle</span> selections.
                </>
              ) : (
                <>
                  Activating{' '}
                  <strong className="text-slate-900">
                    {pendingStatusToggle.manufacturer} –{' '}
                    {pendingStatusToggle.modelName}
                  </strong>{' '}
                  will make it selectable in the{' '}
                  <span className="font-semibold">Add Vehicle → Machine Model</span>{' '}
                  dropdown.
                </>
              )}
            </p>
            {(() => {
              const depCount = countDependentVehicles(
                pendingStatusToggle,
                vehiclesList
              );
              return depCount > 0 ? (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                  <strong>{depCount} vehicle(s)</strong> currently reference this
                  model. Historical vehicle associations and map icons remain
                  preserved.
                </div>
              ) : null;
            })()}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingStatusToggle(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusToggle}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg cursor-pointer ${
                  pendingStatusToggle.isActive
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {pendingStatusToggle.isActive
                  ? 'Confirm Deactivate'
                  : 'Confirm Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Safeguard Modal with Confirmation Chips */}
      {(() => {
        if (!pendingDelete) return null;
        const depCount = countDependentVehicles(pendingDelete, vehiclesList);
        const iconSummary = getIconSetupSummary(pendingDelete);
        return (
          <DeleteConfirmationModal
            isOpen={Boolean(pendingDelete)}
            title={`Delete Vehicle Model ${pendingDelete.id}?`}
            description={
              <>
                Are you sure you want to permanently remove{' '}
                <strong className="text-slate-900 font-semibold">
                  {pendingDelete.manufacturer} – {pendingDelete.modelName} ({pendingDelete.variant})
                </strong>{' '}
                from Vehicle Model Master?
              </>
            }
            confirmLabel="Delete Model"
            targetChips={[
              { id: 'id', label: pendingDelete.id, tone: 'orange' },
              {
                id: 'model',
                label: `${pendingDelete.manufacturer} · ${pendingDelete.modelName}`,
                sublabel: pendingDelete.variant,
                tone: 'blue',
              },
              { id: 'vtype', label: pendingDelete.vehicleType, tone: 'purple' },
              {
                id: 'status',
                label: pendingDelete.isActive ? 'Active' : 'Inactive',
                tone: pendingDelete.isActive ? 'emerald' : 'slate',
              },
            ]}
            confirmationChips={[
              depCount > 0
                ? {
                    id: 'deps',
                    label: `${depCount} Dependent Vehicle(s) Linked`,
                    tone: 'amber',
                  }
                : {
                    id: 'deps',
                    label: '0 Dependent Vehicles · Safe to Delete',
                    tone: 'emerald',
                  },
              {
                id: 'icons',
                label: `${iconSummary.customCount}/7 Custom State Icons`,
                tone: 'slate',
              },
            ]}
            warningNote={
              depCount > 0 ? (
                <>
                  <strong>{depCount} dependent vehicle(s)</strong> currently reference this model.
                  Recommended: <strong>Deactivate Instead</strong> so linked vehicle records retain
                  their model configuration cleanly.
                </>
              ) : undefined
            }
            secondaryAction={
              pendingDelete.isActive && depCount > 0
                ? {
                    label: 'Deactivate Instead',
                    tone: 'amber',
                    onClick: () => {
                      const rec = pendingDelete;
                      setPendingDelete(null);
                      setPendingStatusToggle(rec);
                    },
                  }
                : undefined
            }
            onCancel={() => setPendingDelete(null)}
            onConfirm={handleConfirmDelete}
          />
        );
      })()}
    </div>
  );
};
