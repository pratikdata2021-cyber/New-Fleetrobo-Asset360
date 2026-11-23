import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Layers,
  Cpu,
  Radio,
  Smartphone,
  RotateCcw,
  RefreshCw,
  Check,
  FileDown,
  Power,
  Lock,
  SlidersHorizontal,
  FileUp,
  Info,
} from 'lucide-react';
import { RowActionMenu } from './common/RowActionMenu';
import { DeleteConfirmationModal } from './common/DeleteConfirmationModal';
import {
  MainCategory,
  ModelCategoryRecord,
  ModelCategoryStatus,
  DeviceFunction,
  SimSupportedChoice,
  SensorMeasurementType,
  SensorMeasurementUnit,
  SensorConnectionMode,
  SimTypeChoice,
  SimFormFactorChoice,
  SupportingDocument,
  IDENTIFIER_TYPE_META,
  IDENTIFIER_TYPE_OPTIONS,
  DEVICE_FUNCTION_OPTIONS,
  CONNECTIVITY_OPTIONS,
  SIM_SUPPORTED_OPTIONS,
  MEASUREMENT_TYPE_OPTIONS,
  MEASUREMENT_UNIT_OPTIONS,
  SENSOR_CONNECTION_MODE_OPTIONS,
  SIM_TYPE_OPTIONS,
  SIM_FORM_FACTOR_OPTIONS,
  KNOWN_MANUFACTURERS_PROVIDERS,
  MODEL_CATEGORY_TOOLTIPS,
  INITIAL_MODEL_CATEGORY_RECORDS,
  DEVICE_TYPE_SUGGESTIONS,
  PLATFORM_PROTOCOL_OPTIONS,
  getDeviceModePresets,
  getPlatformProtocolPresets,
  getRecommendedIdentifierTypes,
  getRecordIdentifierTypes,
  getTopIndiaManufacturersForType,
  loadCustomConnectivityOptions,
  loadCustomDeviceFunctions,
  loadCustomDeviceModes,
  loadCustomIdentifierTypes,
  loadCustomManufacturers,
  loadCustomPlatformProtocols,
  saveCustomConnectivityOption,
  saveCustomDeviceFunction,
  saveCustomDeviceMode,
  saveCustomIdentifierType,
  saveCustomManufacturer,
  saveCustomPlatformProtocol,
  loadModelCategoryStore,
  saveModelCategoryStore,
  isValidHttpUrl,
  parseStrictPositiveInteger,
  sensorMeasurementNeedsUnit,
  buildModelDuplicateKey,
} from '../types/modelCategoryMaster';
import { ColumnCataloguePopover, ColumnCatalogueItem } from './ColumnCataloguePopover';
import {
  buildModelReferenceMap,
  ModelReferenceSummary,
} from '../utils/modelCategoryRefs';
import {
  exportFullCanonicalCsv,
  formatCategoryDetailSummary,
  getRecordValueForColumnKey,
  triggerCsvDownload,
} from '../utils/modelCategoryCsv';
import { ModelCategoryBulkDrawer } from './model-category/ModelCategoryBulkDrawer';
import { ModelCategoryImportDrawer } from './model-category/ModelCategoryImportDrawer';
import { ModelCategoryExportModal } from './model-category/ModelCategoryExportModal';

export const MODEL_CATEGORY_COLUMNS: ColumnCatalogueItem[] = [
  // 9 Default Columns
  { key: 'typeName', label: 'Model Type', category: 'PRIMARY CLASSIFICATION', required: true },
  { key: 'category', label: 'Category', category: 'PRIMARY CLASSIFICATION', required: true },
  { key: 'manufacturer', label: 'Brand', category: 'PRIMARY CLASSIFICATION' },
  { key: 'modelReference', label: 'Model Name / Number', category: 'PRIMARY CLASSIFICATION' },
  { key: 'identifierType', label: 'Identifier Types', category: 'PRIMARY CLASSIFICATION' },
  { key: 'categoryDetail', label: 'Category Details', category: 'SUMMARY' },
  { key: 'supportingDocs', label: 'Supporting Documents', category: 'DOCUMENTATION & GOVERNANCE' },
  { key: 'status', label: 'Model Status', category: 'DOCUMENTATION & GOVERNANCE' },
  { key: 'updatedAt', label: 'Updated On', category: 'DOCUMENTATION & GOVERNANCE' },

  // 15 Optional Columns (Hidden by default)
  { key: 'deviceFunction', label: 'Device Function', category: 'DEVICE ATTRIBUTES' },
  { key: 'supportedModes', label: 'Supported Modes', category: 'DEVICE ATTRIBUTES' },
  { key: 'supportedProtocols', label: 'Supported Protocols', category: 'DEVICE ATTRIBUTES' },
  { key: 'connectivity', label: 'Connectivity Types', category: 'DEVICE ATTRIBUTES' },
  { key: 'simSupported', label: 'SIM Supported', category: 'DEVICE ATTRIBUTES' },
  { key: 'maxCameraChannels', label: 'Maximum Camera Channels', category: 'DEVICE ATTRIBUTES' },
  { key: 'measurementType', label: 'Measurement Type', category: 'SENSOR ATTRIBUTES' },
  { key: 'measurementUnit', label: 'Measurement Unit', category: 'SENSOR ATTRIBUTES' },
  { key: 'connectionMode', label: 'Connection Mode', category: 'SENSOR ATTRIBUTES' },
  { key: 'simType', label: 'SIM Type', category: 'SIM ATTRIBUTES' },
  { key: 'simFormFactor', label: 'Form Factor', category: 'SIM ATTRIBUTES' },
  { key: 'validityMonths', label: 'Default Validity (Months)', category: 'SIM ATTRIBUTES' },
  { key: 'description', label: 'Description', category: 'DOCUMENTATION & GOVERNANCE' },
  { key: 'documentationUrl', label: 'Documentation URL', category: 'DOCUMENTATION & GOVERNANCE' },
  { key: 'createdAt', label: 'Created On', category: 'DOCUMENTATION & GOVERNANCE' },
];

export const DEFAULT_VISIBLE_MODEL_COLUMNS = [
  'typeName',
  'category',
  'manufacturer',
  'modelReference',
  'identifierType',
  'categoryDetail',
  'supportingDocs',
  'status',
  'updatedAt',
];

const SORTABLE_COLUMN_KEYS = new Set([
  'typeName',
  'category',
  'manufacturer',
  'modelReference',
  'status',
  'updatedAt',
  'createdAt',
  'deviceFunction',
  'simSupported',
  'maxCameraChannels',
  'measurementType',
  'measurementUnit',
  'connectionMode',
  'simType',
  'simFormFactor',
  'validityMonths',
]);

// Reusable accessible Info Tooltip component
const InfoTip: React.FC<{ text: string; align?: 'left' | 'right' | 'center' }> = ({
  text,
  align = 'center',
}) => {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex items-center ml-1 align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setOpen((prev) => !prev);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={text}
        className="w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 hover:text-[#FA8A63] hover:border-[#FA8A63] focus:outline-none focus:ring-1 focus:ring-[#FA8A63] inline-flex items-center justify-center text-[9px] font-bold leading-none transition-colors cursor-pointer bg-white shrink-0 select-none"
      >
        ⓘ
      </span>
      {open && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-[120] bottom-full mb-1.5 w-64 p-2 rounded-lg bg-slate-900 text-white text-[11px] font-normal leading-relaxed shadow-xl border border-slate-700 ${
            align === 'right'
              ? 'right-0'
              : align === 'left'
              ? 'left-0'
              : 'left-1/2 -translate-x-1/2'
          }`}
        >
          {text}
        </span>
      )}
    </span>
  );
};

interface PendingDeactivationPayload {
  record: ModelCategoryRecord;
  source: 'row' | 'edit';
  editUpdatedRecord?: ModelCategoryRecord;
}

export const ModelCategoryMasterContent: React.FC = () => {
  const [records, setRecords] = useState<ModelCategoryRecord[]>(() => loadModelCategoryStore());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | MainCategory>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ModelCategoryStatus>('All');
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('All');
  const [mfgFilterOpen, setMfgFilterOpen] = useState(false);
  const [mfgFilterSearch, setMfgFilterSearch] = useState('');

  // Sorting
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  // Column catalogue visibility & pinning
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(DEFAULT_VISIBLE_MODEL_COLUMNS);
  const [pinnedColumnKeys, setPinnedColumnKeys] = useState<string[]>(['typeName']);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(10);

  // Selection & Bulk / CSV Modals
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDrawerOpen, setIsBulkDrawerOpen] = useState(false);
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showResetDemoConfirm, setShowResetDemoConfirm] = useState(false);

  // Right-Side Filter Drawer States (5 Sections)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    basic: false,
    device: false,
    sensor: false,
    sim: false,
    audit: false,
  });

  const [fCategory, setFCategory] = useState<'All' | MainCategory>('All');
  const [fTypeName, setFTypeName] = useState('');
  const [fManufacturer, setFManufacturer] = useState('All');
  const [fModelReference, setFModelReference] = useState('');
  const [fStatus, setFStatus] = useState<'All' | ModelCategoryStatus>('All');
  const [fDeviceFunction, setFDeviceFunction] = useState('All');
  const [fSupportedMode, setFSupportedMode] = useState('');
  const [fSupportedProtocol, setFSupportedProtocol] = useState('');
  const [fConnectivity, setFConnectivity] = useState('');
  const [fSimSupported, setFSimSupported] = useState('All');
  const [fMaxCameraChannels, setFMaxCameraChannels] = useState('');
  const [fMeasurementType, setFMeasurementType] = useState('All');
  const [fMeasurementUnit, setFMeasurementUnit] = useState('All');
  const [fConnectionMode, setFConnectionMode] = useState('All');
  const [fSimType, setFSimType] = useState('All');
  const [fSimFormFactor, setFSimFormFactor] = useState('All');
  const [fValidityMonths, setFValidityMonths] = useState('');
  const [fCreatedAtFrom, setFCreatedAtFrom] = useState('');
  const [fCreatedAtTo, setFCreatedAtTo] = useState('');
  const [fUpdatedAtFrom, setFUpdatedAtFrom] = useState('');
  const [fUpdatedAtTo, setFUpdatedAtTo] = useState('');

  const toggleSection = (sec: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (fCategory !== 'All') count++;
    if (fTypeName.trim()) count++;
    if (fManufacturer !== 'All' && fManufacturer) count++;
    if (fModelReference.trim()) count++;
    if (fStatus !== 'All') count++;
    if (fDeviceFunction !== 'All' && fDeviceFunction) count++;
    if (fSupportedMode.trim()) count++;
    if (fSupportedProtocol.trim()) count++;
    if (fConnectivity.trim()) count++;
    if (fSimSupported !== 'All' && fSimSupported) count++;
    if (fMaxCameraChannels.trim()) count++;
    if (fMeasurementType !== 'All' && fMeasurementType) count++;
    if (fMeasurementUnit !== 'All' && fMeasurementUnit) count++;
    if (fConnectionMode !== 'All' && fConnectionMode) count++;
    if (fSimType !== 'All' && fSimType) count++;
    if (fSimFormFactor !== 'All' && fSimFormFactor) count++;
    if (fValidityMonths.trim()) count++;
    if (fCreatedAtFrom || fCreatedAtTo) count++;
    if (fUpdatedAtFrom || fUpdatedAtTo) count++;
    return count;
  }, [
    fCategory,
    fTypeName,
    fManufacturer,
    fModelReference,
    fStatus,
    fDeviceFunction,
    fSupportedMode,
    fSupportedProtocol,
    fConnectivity,
    fSimSupported,
    fMaxCameraChannels,
    fMeasurementType,
    fMeasurementUnit,
    fConnectionMode,
    fSimType,
    fSimFormFactor,
    fValidityMonths,
    fCreatedAtFrom,
    fCreatedAtTo,
    fUpdatedAtFrom,
    fUpdatedAtTo,
  ]);

  const handleResetAdvancedFilters = () => {
    setFCategory('All');
    setCategoryFilter('All');
    setFTypeName('');
    setFManufacturer('All');
    setManufacturerFilter('All');
    setFModelReference('');
    setFStatus('All');
    setStatusFilter('All');
    setFDeviceFunction('All');
    setFSupportedMode('');
    setFSupportedProtocol('');
    setFConnectivity('');
    setFSimSupported('All');
    setFMaxCameraChannels('');
    setFMeasurementType('All');
    setFMeasurementUnit('All');
    setFConnectionMode('All');
    setFSimType('All');
    setFSimFormFactor('All');
    setFValidityMonths('');
    setFCreatedAtFrom('');
    setFCreatedAtTo('');
    setFUpdatedAtFrom('');
    setFUpdatedAtTo('');
  };

  // Reference check refresh tick
  const [refSyncTick, setRefSyncTick] = useState(0);

  // Drawer & modal states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Confirm Deactivate Modal (used for both row action and Edit status change)
  const [pendingDeactivation, setPendingDeactivation] = useState<PendingDeactivationPayload | null>(null);

  // Delete modals (confirmed delete vs blocked delete explanation)
  const [recordToDelete, setRecordToDelete] = useState<ModelCategoryRecord | null>(null);
  const [blockedDeleteTarget, setBlockedDeleteTarget] = useState<{
    record: ModelCategoryRecord;
    refs: ModelReferenceSummary;
  } | null>(null);

  // Unsaved changes confirm dialog
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Form State — Section 1
  const [formCategory, setFormCategory] = useState<MainCategory | ''>('');
  const [formTypeName, setFormTypeName] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formCustomManufacturer, setFormCustomManufacturer] = useState('');
  const [formModelReference, setFormModelReference] = useState('');
  const [formIdentifierTypes, setFormIdentifierTypes] = useState<string[]>([]);
  const [identifierMenuOpen, setIdentifierMenuOpen] = useState(false);
  const [identifierSearch, setIdentifierSearch] = useState('');
  const [showCustomIdentifierInput, setShowCustomIdentifierInput] = useState(false);
  const [formCustomIdentifierText, setFormCustomIdentifierText] = useState('');

  // Form State — Section 3
  const [formDescription, setFormDescription] = useState('');
  const [formDocUrl, setFormDocUrl] = useState('');
  const [formStatus, setFormStatus] = useState<ModelCategoryStatus>('Active');
  const [formDocs, setFormDocs] = useState<SupportingDocument[]>([]);

  // Custom Lists
  const [customDeviceModes, setCustomDeviceModes] = useState<string[]>(() => loadCustomDeviceModes());
  const [customDeviceFunctions, setCustomDeviceFunctions] = useState<string[]>(() =>
    loadCustomDeviceFunctions()
  );
  const [customManufacturers, setCustomManufacturers] = useState<string[]>(() =>
    loadCustomManufacturers()
  );
  const [customIdentifierTypes, setCustomIdentifierTypes] = useState<string[]>(() =>
    loadCustomIdentifierTypes()
  );
  const [customPlatformProtocols, setCustomPlatformProtocols] = useState<string[]>(() =>
    loadCustomPlatformProtocols()
  );
  const [customConnectivityOptions, setCustomConnectivityOptions] = useState<string[]>(() =>
    loadCustomConnectivityOptions()
  );

  // Form State — Section 2 (Device)
  const [formDeviceFunction, setFormDeviceFunction] = useState<DeviceFunction | ''>('');
  const [formCustomDeviceFunction, setFormCustomDeviceFunction] = useState('');
  const [formDeviceModes, setFormDeviceModes] = useState<string[]>([]);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [modeSearch, setModeSearch] = useState('');
  const [showCustomModeInput, setShowCustomModeInput] = useState(false);
  const [formCustomModeText, setFormCustomModeText] = useState('');

  const [formSupportedProtocols, setFormSupportedProtocols] = useState<string[]>([]);
  const [protocolMenuOpen, setProtocolMenuOpen] = useState(false);
  const [protocolSearch, setProtocolSearch] = useState('');
  const [showCustomProtocolInput, setShowCustomProtocolInput] = useState(false);
  const [formCustomProtocolText, setFormCustomProtocolText] = useState('');

  const [formConnectivity, setFormConnectivity] = useState<string[]>([]);
  const [connectivityMenuOpen, setConnectivityMenuOpen] = useState(false);
  const [connectivitySearch, setConnectivitySearch] = useState('');
  const [showCustomConnectivityInput, setShowCustomConnectivityInput] = useState(false);
  const [formCustomConnectivityText, setFormCustomConnectivityText] = useState('');

  const [formSimSupported, setFormSimSupported] = useState<SimSupportedChoice>('Unknown');
  const [formMaxCameraChannels, setFormMaxCameraChannels] = useState<string>('');

  // Form State — Section 2 (Sensor)
  const [formMeasurementType, setFormMeasurementType] = useState<SensorMeasurementType | ''>('');
  const [formMeasurementUnit, setFormMeasurementUnit] = useState<SensorMeasurementUnit | ''>('');
  const [formConnectionMode, setFormConnectionMode] = useState<SensorConnectionMode>('Unknown');

  // Form State — Section 2 (SIM)
  const [formSimType, setFormSimType] = useState<SimTypeChoice | ''>('');
  const [formSimFormFactor, setFormSimFormFactor] = useState<SimFormFactorChoice | ''>('Physical SIM');
  const [formValidityMonths, setFormValidityMonths] = useState<string>('');

  // Form errors & pending category change
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [categoryChangePending, setCategoryChangePending] = useState<MainCategory | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const identifierDropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const connectivityDropdownRef = useRef<HTMLDivElement>(null);
  const protocolDropdownRef = useRef<HTMLDivElement>(null);
  const mfgFilterDropdownRef = useRef<HTMLDivElement>(null);

  // Sync external inventory/company access changes for reference checks
  useEffect(() => {
    const syncRefs = () => setRefSyncTick((t) => t + 1);
    window.addEventListener('fleetrobo:model-access-updated', syncRefs);
    window.addEventListener('fleetrobo:modal-master-updated', syncRefs);
    window.addEventListener('storage', syncRefs);
    return () => {
      window.removeEventListener('fleetrobo:model-access-updated', syncRefs);
      window.removeEventListener('fleetrobo:modal-master-updated', syncRefs);
      window.removeEventListener('storage', syncRefs);
    };
  }, []);

  // Outside click handler for dropdowns
  useEffect(() => {
    if (
      !identifierMenuOpen &&
      !modeMenuOpen &&
      !protocolMenuOpen &&
      !connectivityMenuOpen &&
      !mfgFilterOpen
    ) {
      return;
    }
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (identifierMenuOpen && identifierDropdownRef.current && !identifierDropdownRef.current.contains(target)) {
        setIdentifierMenuOpen(false);
      }
      if (modeMenuOpen && modeDropdownRef.current && !modeDropdownRef.current.contains(target)) {
        setModeMenuOpen(false);
      }
      if (protocolMenuOpen && protocolDropdownRef.current && !protocolDropdownRef.current.contains(target)) {
        setProtocolMenuOpen(false);
      }
      if (connectivityMenuOpen && connectivityDropdownRef.current && !connectivityDropdownRef.current.contains(target)) {
        setConnectivityMenuOpen(false);
      }
      if (mfgFilterOpen && mfgFilterDropdownRef.current && !mfgFilterDropdownRef.current.contains(target)) {
        setMfgFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [identifierMenuOpen, modeMenuOpen, protocolMenuOpen, connectivityMenuOpen, mfgFilterOpen]);

  // Reference summary map for delete guard, category lock, and deactivation preview
  const referenceMap = useMemo(() => {
    void refSyncTick;
    return buildModelReferenceMap(records);
  }, [records, refSyncTick]);

  const editingRecord = useMemo(
    () => (editingId ? records.find((r) => r.id === editingId) || null : null),
    [editingId, records]
  );

  const isEditingCategoryLocked = useMemo(() => {
    if (drawerMode !== 'edit' || !editingRecord) return false;
    return Boolean(referenceMap[editingRecord.id]?.isReferenced);
  }, [drawerMode, editingRecord, referenceMap]);

  // Distinct Manufacturer / Provider values for searchable filter
  const manufacturerFilterOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const m = r.manufacturer?.trim();
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filteredMfgDropdownOptions = useMemo(() => {
    const q = mfgFilterSearch.trim().toLowerCase();
    if (!q) return manufacturerFilterOptions;
    return manufacturerFilterOptions.filter((m) => m.toLowerCase().includes(q));
  }, [manufacturerFilterOptions, mfgFilterSearch]);

  const knownMakersForCategory = useMemo(() => {
    const typeTopMakers = getTopIndiaManufacturersForType(formCategory, formTypeName);
    const categoryExtras = formCategory ? KNOWN_MANUFACTURERS_PROVIDERS[formCategory] || [] : [];
    return Array.from(new Set([...typeTopMakers, ...categoryExtras]));
  }, [formCategory, formTypeName]);

  const isVendorOrNonBrand = (name: string): boolean => {
    const lower = name.toLowerCase();
    const badKeywords = ['freight', 'logistics', 'maintenance', 'transport', 'transit', 'partners', 'vendor', 'master', 'fleet', 'services', 'akpl', 'apex'];
    return badKeywords.some((kw) => lower.includes(kw));
  };

  const customMakersForDropdown = useMemo(() => {
    const standardLower = new Set(knownMakersForCategory.map((n) => n.toLowerCase()));
    const fromRecords = records
      .filter((r) => !formCategory || r.category === formCategory)
      .map((r) => r.manufacturer?.trim())
      .filter((m): m is string => Boolean(m) && !isVendorOrNonBrand(m));
    const merged = Array.from(new Set([...customManufacturers.filter((m) => !isVendorOrNonBrand(m)), ...fromRecords]));
    return merged.filter((m) => !standardLower.has(m.toLowerCase()) && !isVendorOrNonBrand(m));
  }, [customManufacturers, records, knownMakersForCategory, formCategory]);

  const customIdentifiersForDropdown = useMemo(() => {
    const standardLower = new Set(
      [
        ...IDENTIFIER_TYPE_OPTIONS.Device,
        ...IDENTIFIER_TYPE_OPTIONS.Sensor,
        ...IDENTIFIER_TYPE_OPTIONS.SIM,
      ].map((n) => n.toLowerCase())
    );
    const fromRecords = records.flatMap((r) => getRecordIdentifierTypes(r));
    const merged = Array.from(new Set([...customIdentifierTypes, ...fromRecords, ...formIdentifierTypes]));
    return merged.filter((id) => !standardLower.has(id.toLowerCase()));
  }, [customIdentifierTypes, records, formIdentifierTypes]);

  const allIdentifierOptionValues = useMemo(() => {
    const catValues = formCategory
      ? IDENTIFIER_TYPE_OPTIONS[formCategory]
      : [
          ...IDENTIFIER_TYPE_OPTIONS.Device,
          ...IDENTIFIER_TYPE_OPTIONS.Sensor,
          ...IDENTIFIER_TYPE_OPTIONS.SIM,
        ];
    return Array.from(
      new Set([
        ...(formTypeName.trim() ? getRecommendedIdentifierTypes(formCategory, formTypeName) : []),
        ...catValues,
        ...customIdentifiersForDropdown,
      ])
    );
  }, [formCategory, formTypeName, customIdentifiersForDropdown]);

  const customFunctionsForDropdown = useMemo(() => {
    const standardLower = new Set(DEVICE_FUNCTION_OPTIONS.map((n) => n.toLowerCase()));
    const fromRecords = records
      .map((r) => r.deviceFunction?.trim())
      .filter((fn): fn is string => Boolean(fn));
    const merged = Array.from(new Set([...customDeviceFunctions, ...fromRecords]));
    return merged.filter((fn) => !standardLower.has(fn.toLowerCase()));
  }, [customDeviceFunctions, records]);

  const deviceModePresets = useMemo(
    () => getDeviceModePresets(formTypeName, formDeviceFunction),
    [formTypeName, formDeviceFunction]
  );

  const deviceModeOptions = useMemo(() => {
    return Array.from(new Set([...deviceModePresets, ...customDeviceModes, ...formDeviceModes]));
  }, [deviceModePresets, customDeviceModes, formDeviceModes]);

  const protocolPresets = useMemo(
    () => getPlatformProtocolPresets(formTypeName, formDeviceFunction),
    [formTypeName, formDeviceFunction]
  );

  const protocolOptionList = useMemo(() => {
    return Array.from(
      new Set([
        ...protocolPresets,
        ...PLATFORM_PROTOCOL_OPTIONS,
        ...customPlatformProtocols,
        ...formSupportedProtocols,
      ])
    );
  }, [protocolPresets, customPlatformProtocols, formSupportedProtocols]);

  const connectivityOptionList = useMemo(() => {
    const fromRecords = records.flatMap((r) => r.connectivity || []);
    return Array.from(
      new Set([
        ...CONNECTIVITY_OPTIONS,
        ...customConnectivityOptions,
        ...fromRecords,
        ...formConnectivity,
      ])
    );
  }, [customConnectivityOptions, records, formConnectivity]);

  // Persist records cleanly (avoid writing on mount before user modifies? No, saveModelCategoryStore is idempotent and preserves loaded records, including [])
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    saveModelCategoryStore(records);
  }, [records]);

  // Keep selectedIds valid when records change
  useEffect(() => {
    const validSet = new Set(records.map((r) => r.id));
    setSelectedIds((prev) => prev.filter((id) => validSet.has(id)));
  }, [records]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Ordered columns respecting pinned keys first, then remaining visibleColumnKeys
  const orderedVisibleColumns = useMemo(() => {
    const colByKey = new Map(MODEL_CATEGORY_COLUMNS.map((c) => [c.key, c]));
    const pinnedVisible = pinnedColumnKeys
      .filter((k) => visibleColumnKeys.includes(k) && colByKey.has(k))
      .map((k) => colByKey.get(k)!);
    const restVisible = visibleColumnKeys
      .filter((k) => !pinnedColumnKeys.includes(k) && colByKey.has(k))
      .map((k) => colByKey.get(k)!);
    return [...pinnedVisible, ...restVisible];
  }, [visibleColumnKeys, pinnedColumnKeys]);

  // Filtered & sorted records
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = records.filter((rec) => {
      if (categoryFilter !== 'All' && rec.category !== categoryFilter) return false;
      if (statusFilter !== 'All' && rec.status !== statusFilter) return false;
      if (manufacturerFilter !== 'All') {
        if ((rec.manufacturer || '').trim().toLowerCase() !== manufacturerFilter.toLowerCase()) {
          return false;
        }
      }

      // 5-Section Advanced Filters
      if (fCategory !== 'All' && rec.category !== fCategory) return false;
      if (fTypeName.trim() && !rec.typeName.toLowerCase().includes(fTypeName.trim().toLowerCase())) return false;
      if (fManufacturer !== 'All' && fManufacturer) {
        if ((rec.manufacturer || '').trim().toLowerCase() !== fManufacturer.toLowerCase()) return false;
      }
      if (fModelReference.trim() && !(rec.modelReference || '').toLowerCase().includes(fModelReference.trim().toLowerCase())) return false;
      if (fStatus !== 'All' && rec.status !== fStatus) return false;

      if (fDeviceFunction !== 'All' && fDeviceFunction) {
        if ((rec.deviceFunction || '').trim().toLowerCase() !== fDeviceFunction.toLowerCase()) return false;
      }
      if (fSupportedMode.trim()) {
        const modes = rec.supportedModes || (rec.deviceMode ? [rec.deviceMode] : []);
        if (!modes.some((m) => m.toLowerCase().includes(fSupportedMode.trim().toLowerCase()))) return false;
      }
      if (fSupportedProtocol.trim()) {
        const protos = rec.supportedProtocols || [];
        if (!protos.some((p) => p.toLowerCase().includes(fSupportedProtocol.trim().toLowerCase()))) return false;
      }
      if (fConnectivity.trim()) {
        const conns = rec.connectivity || [];
        if (!conns.some((c) => c.toLowerCase().includes(fConnectivity.trim().toLowerCase()))) return false;
      }
      if (fSimSupported !== 'All' && fSimSupported) {
        if ((rec.simSupported || 'Unknown') !== fSimSupported) return false;
      }
      if (fMaxCameraChannels.trim()) {
        const targetChan = Number(fMaxCameraChannels);
        if (rec.maxCameraChannels !== targetChan) return false;
      }

      if (fMeasurementType !== 'All' && fMeasurementType) {
        if ((rec.measurementType || '').trim().toLowerCase() !== fMeasurementType.toLowerCase()) return false;
      }
      if (fMeasurementUnit !== 'All' && fMeasurementUnit) {
        if ((rec.measurementUnit || '').trim().toLowerCase() !== fMeasurementUnit.toLowerCase()) return false;
      }
      if (fConnectionMode !== 'All' && fConnectionMode) {
        if ((rec.connectionMode || 'Unknown') !== fConnectionMode) return false;
      }

      if (fSimType !== 'All' && fSimType) {
        if ((rec.simType || '').trim().toLowerCase() !== fSimType.toLowerCase()) return false;
      }
      if (fSimFormFactor !== 'All' && fSimFormFactor) {
        if ((rec.simFormFactor || '').trim().toLowerCase() !== fSimFormFactor.toLowerCase()) return false;
      }
      if (fValidityMonths.trim()) {
        const valMo = Number(fValidityMonths);
        if (rec.validityMonths !== valMo) return false;
      }

      if (fCreatedAtFrom && rec.createdAt) {
        if (new Date(rec.createdAt) < new Date(fCreatedAtFrom)) return false;
      }
      if (fCreatedAtTo && rec.createdAt) {
        const toDate = new Date(fCreatedAtTo);
        toDate.setHours(23, 59, 59, 999);
        if (new Date(rec.createdAt) > toDate) return false;
      }
      if (fUpdatedAtFrom && rec.updatedAt) {
        if (new Date(rec.updatedAt) < new Date(fUpdatedAtFrom)) return false;
      }
      if (fUpdatedAtTo && rec.updatedAt) {
        const toDate = new Date(fUpdatedAtTo);
        toDate.setHours(23, 59, 59, 999);
        if (new Date(rec.updatedAt) > toDate) return false;
      }

      if (q) {
        const matchTypeName = rec.typeName.toLowerCase().includes(q);
        const matchMfg = (rec.manufacturer || '').toLowerCase().includes(q);
        const matchModel = (rec.modelReference || '').toLowerCase().includes(q);
        const matchIdentifier = getRecordIdentifierTypes(rec).some((id) =>
          id.toLowerCase().includes(q)
        );
        if (!matchTypeName && !matchMfg && !matchModel && !matchIdentifier) return false;
      }
      return true;
    });

    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      if (sortKey === 'maxCameraChannels' || sortKey === 'validityMonths') {
        const numA = Number((a as unknown as Record<string, unknown>)[sortKey] ?? -1);
        const numB = Number((b as unknown as Record<string, unknown>)[sortKey] ?? -1);
        return (numA - numB) * sortDir;
      }
      const valA = getRecordValueForColumnKey(a, sortKey).toLowerCase();
      const valB = getRecordValueForColumnKey(b, sortKey).toLowerCase();
      if (valA < valB) return -1 * sortDir;
      if (valA > valB) return 1 * sortDir;
      return 0;
    });
  }, [
    records,
    searchQuery,
    categoryFilter,
    statusFilter,
    manufacturerFilter,
    sortKey,
    sortDir,
    fCategory,
    fTypeName,
    fManufacturer,
    fModelReference,
    fStatus,
    fDeviceFunction,
    fSupportedMode,
    fSupportedProtocol,
    fConnectivity,
    fSimSupported,
    fMaxCameraChannels,
    fMeasurementType,
    fMeasurementUnit,
    fConnectionMode,
    fSimType,
    fSimFormFactor,
    fValidityMonths,
    fCreatedAtFrom,
    fCreatedAtTo,
    fUpdatedAtFrom,
    fUpdatedAtTo,
  ]);

  // Tab counts for Category and Status
  const categoryCounts = useMemo(() => {
    return {
      all: records.length,
      device: records.filter((r) => r.category === 'Device').length,
      sensor: records.filter((r) => r.category === 'Sensor').length,
      sim: records.filter((r) => r.category === 'SIM').length,
    };
  }, [records]);

  const statusCounts = useMemo(() => {
    return {
      all: records.length,
      active: records.filter((r) => r.status === 'Active').length,
      inactive: records.filter((r) => r.status === 'Inactive').length,
    };
  }, [records]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Selection helpers
  const selectedRecords = useMemo(
    () => records.filter((r) => selectedIds.includes(r.id)),
    [records, selectedIds]
  );

  const allOnPageSelected =
    paginatedRecords.length > 0 &&
    paginatedRecords.every((r) => selectedIds.includes(r.id));
  const someOnPageSelected =
    paginatedRecords.some((r) => selectedIds.includes(r.id)) && !allOnPageSelected;

  const toggleSelectAllOnPage = () => {
    const pageIds = paginatedRecords.map((r) => r.id);
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Reset Demo Data (only after explicit destructive confirmation)
  const confirmResetDemoData = () => {
    setRecords(INITIAL_MODEL_CATEGORY_RECORDS);
    saveModelCategoryStore(INITIAL_MODEL_CATEGORY_RECORDS);
    setSearchQuery('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setManufacturerFilter('All');
    setSelectedIds([]);
    setPage(1);
    setShowResetDemoConfirm(false);
    showToast(
      `Restored ${INITIAL_MODEL_CATEGORY_RECORDS.length} prototype demo model definitions`,
      'info'
    );
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setManufacturerFilter('All');
    setMfgFilterSearch('');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    categoryFilter !== 'All' ||
    statusFilter !== 'All' ||
    manufacturerFilter !== 'All';

  // Open Drawer in Add mode
  const handleOpenAdd = () => {
    setCustomDeviceModes(loadCustomDeviceModes());
    setCustomDeviceFunctions(loadCustomDeviceFunctions());
    setCustomManufacturers(loadCustomManufacturers());
    setCustomIdentifierTypes(loadCustomIdentifierTypes());
    setCustomPlatformProtocols(loadCustomPlatformProtocols());
    setCustomConnectivityOptions(loadCustomConnectivityOptions());

    setDrawerMode('add');
    setEditingId(null);
    setIsDirty(false);
    setFormErrors({});

    setFormCategory('');
    setFormTypeName('');
    setFormManufacturer('');
    setFormCustomManufacturer('');
    setFormModelReference('');
    setFormIdentifierTypes([]);
    setIdentifierMenuOpen(false);
    setIdentifierSearch('');
    setShowCustomIdentifierInput(false);
    setFormCustomIdentifierText('');
    setFormDescription('');
    setFormDocUrl('');
    setFormStatus('Active');
    setFormDocs([]);

    setFormDeviceFunction('');
    setFormCustomDeviceFunction('');
    setFormDeviceModes([]);
    setModeMenuOpen(false);
    setModeSearch('');
    setShowCustomModeInput(false);
    setFormCustomModeText('');

    setFormSupportedProtocols([]);
    setProtocolMenuOpen(false);
    setProtocolSearch('');
    setShowCustomProtocolInput(false);
    setFormCustomProtocolText('');

    setFormConnectivity([]);
    setConnectivityMenuOpen(false);
    setConnectivitySearch('');
    setShowCustomConnectivityInput(false);
    setFormCustomConnectivityText('');
    setFormSimSupported('Unknown');
    setFormMaxCameraChannels('');

    setFormMeasurementType('');
    setFormMeasurementUnit('');
    setFormConnectionMode('Unknown');

    setFormSimType('');
    setFormSimFormFactor('Physical SIM');
    setFormValidityMonths('');

    setIsDrawerOpen(true);
  };

  // Open Drawer in View / Edit mode
  const handleOpenViewOrEdit = (rec: ModelCategoryRecord, mode: 'view' | 'edit') => {
    setCustomDeviceModes(loadCustomDeviceModes());
    const latestCustomFunctions = loadCustomDeviceFunctions();
    setCustomDeviceFunctions(latestCustomFunctions);
    const latestCustomMakers = loadCustomManufacturers();
    setCustomManufacturers(latestCustomMakers);
    const latestCustomIdentifiers = loadCustomIdentifierTypes();
    setCustomIdentifierTypes(latestCustomIdentifiers);
    setCustomPlatformProtocols(loadCustomPlatformProtocols());
    const latestCustomConn = loadCustomConnectivityOptions();
    setCustomConnectivityOptions(latestCustomConn);

    setDrawerMode(mode);
    setEditingId(rec.id);
    setIsDirty(false);
    setFormErrors({});

    setFormCategory(rec.category);
    setFormTypeName(rec.typeName);

    const knownList = Array.from(
      new Set([
        ...getTopIndiaManufacturersForType(rec.category, rec.typeName),
        ...(KNOWN_MANUFACTURERS_PROVIDERS[rec.category] || []),
        ...latestCustomMakers,
      ])
    );
    if (knownList.includes(rec.manufacturer)) {
      setFormManufacturer(rec.manufacturer);
      setFormCustomManufacturer('');
    } else if (rec.manufacturer) {
      setCustomManufacturers(saveCustomManufacturer(rec.manufacturer));
      setFormManufacturer(rec.manufacturer);
      setFormCustomManufacturer('');
    } else {
      setFormManufacturer('');
      setFormCustomManufacturer('');
    }

    setFormModelReference(rec.modelReference || '');

    const allKnownIdsLower = new Set(
      [
        ...IDENTIFIER_TYPE_OPTIONS.Device,
        ...IDENTIFIER_TYPE_OPTIONS.Sensor,
        ...IDENTIFIER_TYPE_OPTIONS.SIM,
        ...latestCustomIdentifiers,
      ].map((id) => id.toLowerCase())
    );
    const initialIdentifierList = getRecordIdentifierTypes(rec);
    let nextCustomIds = latestCustomIdentifiers;
    initialIdentifierList.forEach((idVal) => {
      if (!allKnownIdsLower.has(idVal.toLowerCase())) {
        nextCustomIds = saveCustomIdentifierType(idVal);
      }
    });
    if (nextCustomIds !== latestCustomIdentifiers) {
      setCustomIdentifierTypes(nextCustomIds);
    }
    setFormIdentifierTypes(initialIdentifierList);
    setIdentifierMenuOpen(false);
    setIdentifierSearch('');
    setShowCustomIdentifierInput(false);
    setFormCustomIdentifierText('');

    setFormDescription(rec.description || '');
    setFormDocUrl(rec.documentationUrl || '');
    setFormStatus(rec.status);
    setFormDocs(rec.supportingDocs || []);

    // Device specifics
    const knownFnList = [...DEVICE_FUNCTION_OPTIONS, ...latestCustomFunctions];
    if (rec.deviceFunction && knownFnList.includes(rec.deviceFunction)) {
      setFormDeviceFunction(rec.deviceFunction);
      setFormCustomDeviceFunction('');
    } else if (rec.deviceFunction) {
      setCustomDeviceFunctions(saveCustomDeviceFunction(rec.deviceFunction));
      setFormDeviceFunction(rec.deviceFunction);
      setFormCustomDeviceFunction('');
    } else {
      setFormDeviceFunction('');
      setFormCustomDeviceFunction('');
    }

    const initialModes =
      rec.supportedModes && rec.supportedModes.length > 0
        ? rec.supportedModes
        : rec.deviceMode
        ? [rec.deviceMode]
        : [];
    setFormDeviceModes(initialModes);
    setModeMenuOpen(false);
    setModeSearch('');
    setShowCustomModeInput(false);
    setFormCustomModeText('');

    setFormSupportedProtocols(rec.supportedProtocols || []);
    setProtocolMenuOpen(false);
    setProtocolSearch('');
    setShowCustomProtocolInput(false);
    setFormCustomProtocolText('');

    setFormConnectivity(rec.connectivity || []);
    setConnectivityMenuOpen(false);
    setConnectivitySearch('');
    setShowCustomConnectivityInput(false);
    setFormCustomConnectivityText('');
    setFormSimSupported(rec.simSupported || 'Unknown');
    setFormMaxCameraChannels(
      rec.maxCameraChannels !== undefined && rec.maxCameraChannels !== null
        ? String(rec.maxCameraChannels)
        : ''
    );

    // Sensor specifics
    setFormMeasurementType(rec.measurementType || '');
    setFormMeasurementUnit(rec.measurementUnit || '');
    setFormConnectionMode(rec.connectionMode || 'Unknown');

    // SIM specifics
    setFormSimType(rec.simType || '');
    setFormSimFormFactor(rec.simFormFactor || 'Physical SIM');
    setFormValidityMonths(
      rec.validityMonths !== undefined && rec.validityMonths !== null
        ? String(rec.validityMonths)
        : ''
    );

    setIsDrawerOpen(true);
  };

  // Category switch confirmation if ANY category-specific values exist
  const handleCategoryChange = (newCat: MainCategory) => {
    if (isEditingCategoryLocked) return;
    if (formCategory && formCategory !== newCat) {
      const hasCategoryOnlyValues =
        (formCategory === 'Device' &&
          (Boolean(formDeviceFunction) ||
            formDeviceModes.length > 0 ||
            formSupportedProtocols.length > 0 ||
            formConnectivity.length > 0 ||
            formSimSupported !== 'Unknown' ||
            Boolean(formMaxCameraChannels.trim()))) ||
        (formCategory === 'Sensor' &&
          (Boolean(formMeasurementType) ||
            Boolean(formMeasurementUnit) ||
            formConnectionMode !== 'Unknown')) ||
        (formCategory === 'SIM' &&
          (Boolean(formSimType) || Boolean(formValidityMonths.trim())));

      if (hasCategoryOnlyValues) {
        setCategoryChangePending(newCat);
        return;
      }
    }

    applyCategoryChange(newCat);
  };

  const applyCategoryChange = (newCat: MainCategory) => {
    setFormCategory(newCat);
    setIsDirty(true);
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.category;
      delete next.modelReference;
      delete next.deviceFunction;
      delete next.maxCameraChannels;
      delete next.measurementType;
      delete next.measurementUnit;
      delete next.simType;
      delete next.validityMonths;
      return next;
    });

    if (newCat === 'SIM') {
      setFormIdentifierTypes(['ICCID']);
    } else if (newCat === 'Device') {
      setFormIdentifierTypes(['IMEI']);
    } else if (newCat === 'Sensor') {
      setFormIdentifierTypes(['Sensor ID']);
    } else {
      setFormIdentifierTypes([]);
    }

    if (newCat !== 'Device') {
      setFormDeviceFunction('');
      setFormCustomDeviceFunction('');
      setFormDeviceModes([]);
      setFormSupportedProtocols([]);
      setFormConnectivity([]);
      setFormSimSupported('Unknown');
      setFormMaxCameraChannels('');
    }

    if (newCat !== 'Sensor') {
      setFormMeasurementType('');
      setFormMeasurementUnit('');
      setFormConnectionMode('Unknown');
    }

    if (newCat !== 'SIM') {
      setFormSimType('');
      setFormSimFormFactor('Physical SIM');
      setFormValidityMonths('');
    }

    setFormManufacturer('');
    setFormCustomManufacturer('');
    setCategoryChangePending(null);
  };

  // Close Drawer with Unsaved changes check
  const handleAttemptCloseDrawer = () => {
    if (drawerMode !== 'view' && isDirty) {
      setShowDiscardConfirm(true);
    } else {
      setIsDrawerOpen(false);
    }
  };

  // Save form
  const handleSave = () => {
    const errs: Record<string, string> = {};

    if (!formCategory) {
      errs.category = 'Category is required (Device, Sensor, or SIM).';
    }
    if (!formTypeName.trim()) {
      errs.typeName = 'Model Type is required.';
    }

    const resolvedManufacturer =
      formManufacturer === 'Other' ? formCustomManufacturer.trim() : formManufacturer.trim();

    if (!resolvedManufacturer) {
      errs.manufacturer =
        formCategory === 'SIM'
          ? 'Network Operator / Provider is required.'
          : 'Manufacturer / Brand is required.';
    }

    // Required Model Name / Number for NEW Device models; allow legacy Device edits with blank modelReference and Sensor/SIM
    const isLegacyBlankDeviceModel =
      drawerMode === 'edit' &&
      editingRecord?.category === 'Device' &&
      !(editingRecord.modelReference || '').trim();

    if (formCategory === 'Device' && !formModelReference.trim() && !isLegacyBlankDeviceModel) {
      errs.modelReference = 'Model Name / Number is required for Device models (e.g., MC202N, FMB140).';
    }

    if (formIdentifierTypes.length === 0) {
      errs.identifierType = 'Select at least one Identifier Type.';
    }

    if (formDocUrl.trim() && !isValidHttpUrl(formDocUrl)) {
      errs.docUrl = 'Documentation URL must be a valid http:// or https:// URL.';
    }

    const resolvedDeviceFunction =
      formCategory === 'Device'
        ? formDeviceFunction === 'Other'
          ? formCustomDeviceFunction.trim()
          : formDeviceFunction
        : '';

    let parsedCameraChannels: number | null = null;
    let parsedValidityMonths: number | null = null;

    // Category-specific validations
    if (formCategory === 'Device') {
      if (formDeviceFunction === 'Other' && !resolvedDeviceFunction) {
        errs.deviceFunction = 'Please enter a custom Device Function name.';
      } else if (!resolvedDeviceFunction) {
        errs.deviceFunction = 'Device Function is required for Device models.';
      }

      if (formMaxCameraChannels.trim()) {
        const parsed = parseStrictPositiveInteger(formMaxCameraChannels);
        if (Number.isNaN(parsed)) {
          errs.maxCameraChannels =
            'Maximum Camera Channels must be a positive whole integer (no decimals or text).';
        } else {
          parsedCameraChannels = parsed;
        }
      }
    } else if (formCategory === 'Sensor') {
      if (!formMeasurementType) {
        errs.measurementType = 'Measurement Type is required for Sensor models.';
      }
      if (sensorMeasurementNeedsUnit(formMeasurementType) && !formMeasurementUnit) {
        errs.measurementUnit = `Measurement Unit is required for ${formMeasurementType} sensors.`;
      }
    } else if (formCategory === 'SIM') {
      if (!formSimType) {
        errs.simType = 'SIM Type is required for SIM models.';
      }
      if (formValidityMonths.trim()) {
        const parsed = parseStrictPositiveInteger(formValidityMonths);
        if (Number.isNaN(parsed)) {
          errs.validityMonths =
            'Default Validity (Months) must be a positive whole integer (rejects decimals and mixed text).';
        } else {
          parsedValidityMonths = parsed;
        }
      }
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast('Please fix the highlighted validation errors before saving.', 'error');
      return;
    }

    // Persist any custom options added inline
    const customOnlyModes = formDeviceModes.filter((m) => !deviceModePresets.includes(m));
    if (customOnlyModes.length > 0) {
      let updatedModes = customDeviceModes;
      customOnlyModes.forEach((m) => {
        updatedModes = saveCustomDeviceMode(m);
      });
      setCustomDeviceModes(updatedModes);
    }

    const standardConnLower = new Set(CONNECTIVITY_OPTIONS.map((c) => c.toLowerCase()));
    const customOnlyConn = formConnectivity.filter(
      (c) => !standardConnLower.has(c.toLowerCase())
    );
    if (customOnlyConn.length > 0) {
      let updatedConn = customConnectivityOptions;
      customOnlyConn.forEach((c) => {
        updatedConn = saveCustomConnectivityOption(c);
      });
      setCustomConnectivityOptions(updatedConn);
    }

    if (formDeviceFunction === 'Other' && resolvedDeviceFunction) {
      setCustomDeviceFunctions(saveCustomDeviceFunction(resolvedDeviceFunction));
    }

    if (formManufacturer === 'Other' && resolvedManufacturer) {
      setCustomManufacturers(saveCustomManufacturer(resolvedManufacturer));
    }

    const standardIdentifierSet = new Set(
      [
        ...IDENTIFIER_TYPE_OPTIONS.Device,
        ...IDENTIFIER_TYPE_OPTIONS.Sensor,
        ...IDENTIFIER_TYPE_OPTIONS.SIM,
      ].map((i) => i.toLowerCase())
    );
    const customOnlyIds = formIdentifierTypes.filter(
      (idVal) => !standardIdentifierSet.has(idVal.toLowerCase())
    );
    if (customOnlyIds.length > 0) {
      let updatedIds = customIdentifierTypes;
      customOnlyIds.forEach((idVal) => {
        updatedIds = saveCustomIdentifierType(idVal);
      });
      setCustomIdentifierTypes(updatedIds);
    }

    // Duplicate check: Category + Model Type + Manufacturer / Provider + Model Name / Number
    const incomingKey = buildModelDuplicateKey({
      category: formCategory,
      typeName: formTypeName,
      manufacturer: resolvedManufacturer,
      modelReference: formModelReference,
    });

    const isDuplicate = records.some(
      (r) => r.id !== editingId && buildModelDuplicateKey(r) === incomingKey
    );

    if (isDuplicate) {
      const msg = `Duplicate model definition: same Category, Model Type, Manufacturer / Provider, and Model Name / Number (${formModelReference.trim() || '—'}) already exists.`;
      showToast(msg, 'error');
      setFormErrors({ ...errs, duplicate: msg });
      return;
    }

    const now = new Date().toISOString();

    if (drawerMode === 'add') {
      const newRecord: ModelCategoryRecord = {
        id: `mcat-${Date.now()}`,
        category: formCategory as MainCategory,
        typeName: formTypeName.trim(),
        manufacturer: resolvedManufacturer,
        modelReference: formModelReference.trim(),
        identifierType: formIdentifierTypes.join(', '),
        identifierTypes: [...formIdentifierTypes],
        description: formDescription.trim(),
        documentationUrl: formDocUrl.trim(),
        status: formStatus,
        supportingDocs: formDocs,
        updatedAt: now,
        createdAt: now,

        deviceFunction:
          formCategory === 'Device' && resolvedDeviceFunction
            ? (resolvedDeviceFunction as DeviceFunction)
            : undefined,
        deviceMode: formCategory === 'Device' ? formDeviceModes[0] || undefined : undefined,
        supportedModes:
          formCategory === 'Device' && formDeviceModes.length > 0 ? [...formDeviceModes] : undefined,
        supportedProtocols:
          formCategory === 'Device' && formSupportedProtocols.length > 0
            ? [...formSupportedProtocols]
            : undefined,
        connectivity:
          formCategory === 'Device' && formConnectivity.length > 0 ? [...formConnectivity] : undefined,
        simSupported: formCategory === 'Device' ? formSimSupported : undefined,
        maxCameraChannels: formCategory === 'Device' ? parsedCameraChannels : undefined,

        measurementType:
          formCategory === 'Sensor' ? (formMeasurementType as SensorMeasurementType) : undefined,
        measurementUnit:
          formCategory === 'Sensor' && formMeasurementUnit
            ? (formMeasurementUnit as SensorMeasurementUnit)
            : undefined,
        connectionMode: formCategory === 'Sensor' ? formConnectionMode : undefined,

        simType: formCategory === 'SIM' ? (formSimType as SimTypeChoice) : undefined,
        simFormFactor:
          formCategory === 'SIM' && formSimFormFactor
            ? (formSimFormFactor as SimFormFactorChoice)
            : undefined,
        validityMonths: formCategory === 'SIM' ? parsedValidityMonths : undefined,
      };

      setRecords((prev) => [newRecord, ...prev]);
      setSortKey('');
      setPage(1);
      showToast(`Created new model definition "${newRecord.typeName}"`, 'success');
      setIsDrawerOpen(false);
    } else if (drawerMode === 'edit' && editingId && editingRecord) {
      const updatedRecord: ModelCategoryRecord = {
        ...editingRecord,
        category: formCategory as MainCategory,
        typeName: formTypeName.trim(),
        manufacturer: resolvedManufacturer,
        modelReference: formModelReference.trim(),
        identifierType: formIdentifierTypes.join(', '),
        identifierTypes: [...formIdentifierTypes],
        description: formDescription.trim(),
        documentationUrl: formDocUrl.trim(),
        status: formStatus,
        supportingDocs: formDocs,
        updatedAt: now,

        deviceFunction:
          formCategory === 'Device' && resolvedDeviceFunction
            ? (resolvedDeviceFunction as DeviceFunction)
            : undefined,
        deviceMode: formCategory === 'Device' ? formDeviceModes[0] || undefined : undefined,
        supportedModes:
          formCategory === 'Device' && formDeviceModes.length > 0 ? [...formDeviceModes] : [],
        supportedProtocols:
          formCategory === 'Device' && formSupportedProtocols.length > 0
            ? [...formSupportedProtocols]
            : [],
        connectivity:
          formCategory === 'Device' && formConnectivity.length > 0 ? [...formConnectivity] : [],
        simSupported: formCategory === 'Device' ? formSimSupported : undefined,
        maxCameraChannels: formCategory === 'Device' ? parsedCameraChannels : undefined,

        measurementType:
          formCategory === 'Sensor' ? (formMeasurementType as SensorMeasurementType) : undefined,
        measurementUnit:
          formCategory === 'Sensor' && formMeasurementUnit
            ? (formMeasurementUnit as SensorMeasurementUnit)
            : undefined,
        connectionMode: formCategory === 'Sensor' ? formConnectionMode : undefined,

        simType: formCategory === 'SIM' ? (formSimType as SimTypeChoice) : undefined,
        simFormFactor:
          formCategory === 'SIM' && formSimFormFactor
            ? (formSimFormFactor as SimFormFactorChoice)
            : undefined,
        validityMonths: formCategory === 'SIM' ? parsedValidityMonths : undefined,
      };

      // Confirm when Edit status changes from Active -> Inactive
      if (editingRecord.status === 'Active' && formStatus === 'Inactive') {
        setPendingDeactivation({
          record: editingRecord,
          source: 'edit',
          editUpdatedRecord: updatedRecord,
        });
        return;
      }

      const wasReactivated = editingRecord.status === 'Inactive' && formStatus === 'Active';
      setRecords((prev) => prev.map((r) => (r.id === editingId ? updatedRecord : r)));
      showToast(
        wasReactivated
          ? `Updated & activated "${updatedRecord.typeName}". Global availability restored; no clients were auto-enabled.`
          : `Updated model definition "${updatedRecord.typeName}"`,
        'success'
      );
      setIsDrawerOpen(false);
    }
  };

  // Toggle status from row action
  const handleToggleStatus = (rec: ModelCategoryRecord) => {
    if (rec.status === 'Active') {
      setPendingDeactivation({ record: rec, source: 'row' });
    } else {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === rec.id ? { ...r, status: 'Active', updatedAt: new Date().toISOString() } : r
        )
      );
      showToast(
        `Activated "${rec.typeName}". Available for Platform Admin enablement; not auto-enabled for clients.`,
        'success'
      );
    }
  };

  const handleConfirmDeactivation = () => {
    if (!pendingDeactivation) return;
    if (pendingDeactivation.source === 'edit' && pendingDeactivation.editUpdatedRecord) {
      const updated = pendingDeactivation.editUpdatedRecord;
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast(
        `Saved & deactivated "${updated.typeName}". Hidden from new registrations; historical records remain intact.`,
        'info'
      );
      setPendingDeactivation(null);
      setIsDrawerOpen(false);
      return;
    }

    const target = pendingDeactivation.record;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === target.id
          ? { ...r, status: 'Inactive', updatedAt: new Date().toISOString() }
          : r
      )
    );
    showToast(
      `Deactivated "${target.typeName}". Existing records preserved; hidden from new registrations.`,
      'info'
    );
    setPendingDeactivation(null);
  };

  // Delete request with relationship guard
  const handleRequestDelete = (rec: ModelCategoryRecord) => {
    const refs = referenceMap[rec.id];
    if (refs?.isReferenced) {
      setBlockedDeleteTarget({ record: rec, refs });
      return;
    }
    setRecordToDelete(rec);
  };

  const handleConfirmDelete = () => {
    if (!recordToDelete) return;
    const refs = referenceMap[recordToDelete.id];
    if (refs?.isReferenced) {
      setRecordToDelete(null);
      setBlockedDeleteTarget({ record: recordToDelete, refs });
      return;
    }
    const idToDelete = recordToDelete.id;
    const nameToDelete = recordToDelete.typeName;
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== idToDelete);
      saveModelCategoryStore(next);
      return next;
    });
    setSelectedIds((prev) => prev.filter((id) => id !== idToDelete));
    showToast(`Deleted unreferenced model definition "${nameToDelete}"`, 'success');
    setRecordToDelete(null);
  };

  // Bulk Drawer Callbacks
  const handleApplyBulkStatus = (ids: string[], nextStatus: 'Active' | 'Inactive') => {
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    setRecords((prev) =>
      prev.map((r) => (idSet.has(r.id) ? { ...r, status: nextStatus, updatedAt: now } : r))
    );
    showToast(
      nextStatus === 'Active'
        ? `Activated ${ids.length} model definition(s) (no clients auto-enabled).`
        : `Deactivated ${ids.length} model definition(s). Existing records remain intact.`,
      nextStatus === 'Active' ? 'success' : 'info'
    );
  };

  const handleApplyBulkMetadata = (
    ids: string[],
    patch: { description?: string; documentationUrl?: string }
  ) => {
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    setRecords((prev) =>
      prev.map((r) =>
        idSet.has(r.id)
          ? {
              ...r,
              ...(patch.description !== undefined ? { description: patch.description } : {}),
              ...(patch.documentationUrl !== undefined
                ? { documentationUrl: patch.documentationUrl }
                : {}),
              updatedAt: now,
            }
          : r
      )
    );
    showToast(`Updated metadata on ${ids.length} selected model definition(s)`, 'success');
  };

  const handleExportSelectedDirect = () => {
    if (selectedRecords.length === 0) return;
    const csv = exportFullCanonicalCsv(selectedRecords);
    triggerCsvDownload(
      csv,
      `model_category_master_selected_${new Date().toISOString().slice(0, 10)}.csv`
    );
    showToast(`Exported ${selectedRecords.length} selected model definition(s) to CSV`, 'success');
  };

  // CSV Import Commit
  const handleCommitCsvImport = ({
    toCreate,
    toUpdate,
  }: {
    toCreate: Omit<ModelCategoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'supportingDocs'>[];
    toUpdate: {
      existingId: string;
      data: Omit<ModelCategoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'supportingDocs'>;
    }[];
  }) => {
    const now = new Date().toISOString();
    const updateMap = new Map(toUpdate.map((u) => [u.existingId, u.data]));
    const newRecords: ModelCategoryRecord[] = toCreate.map((item, idx) => ({
      ...item,
      id: `mcat-${Date.now()}-${idx}`,
      supportingDocs: [],
      createdAt: now,
      updatedAt: now,
    }));

    setRecords((prev) => {
      const updatedExisting = prev.map((rec) => {
        const patch = updateMap.get(rec.id);
        if (!patch) return rec;
        return {
          ...rec,
          ...patch,
          id: rec.id,
          createdAt: rec.createdAt,
          supportingDocs: rec.supportingDocs,
          updatedAt: now,
        };
      });
      return [...newRecords, ...updatedExisting];
    });

    setPage(1);
    showToast(
      `CSV import committed: ${toCreate.length} created, ${toUpdate.length} updated.`,
      'success'
    );
  };

  // Supporting documents metadata attachment (prototype metadata-only)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles: SupportingDocument[] = Array.from(e.target.files).map((f) => ({
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: f.name,
      size: f.size,
      type: f.type || 'document',
    }));
    setFormDocs((prev) => [...prev, ...newFiles]);
    setIsDirty(true);
    e.target.value = '';
    showToast(`Attached ${newFiles.length} supporting document metadata item(s)`, 'info');
  };

  const handleRemoveDoc = (id: string) => {
    setFormDocs((prev) => prev.filter((d) => d.id !== id));
    setIsDirty(true);
  };

  // Helper for rendering column header tooltip
  const getHeaderTooltip = (key: string): string | null => {
    switch (key) {
      case 'typeName':
        return MODEL_CATEGORY_TOOLTIPS.typeName;
      case 'category':
        return MODEL_CATEGORY_TOOLTIPS.category;
      case 'manufacturer':
        return MODEL_CATEGORY_TOOLTIPS.manufacturerProvider;
      case 'modelReference':
        return MODEL_CATEGORY_TOOLTIPS.modelReference;
      case 'identifierType':
        return MODEL_CATEGORY_TOOLTIPS.identifierType;
      case 'categoryDetail':
        return MODEL_CATEGORY_TOOLTIPS.categoryDetail;
      case 'supportingDocs':
        return MODEL_CATEGORY_TOOLTIPS.supportingDocs;
      case 'status':
        return MODEL_CATEGORY_TOOLTIPS.status;
      case 'updatedAt':
        return MODEL_CATEGORY_TOOLTIPS.updatedOn;
      case 'maxCameraChannels':
        return MODEL_CATEGORY_TOOLTIPS.maxCameraChannels;
      case 'connectivity':
        return MODEL_CATEGORY_TOOLTIPS.connectivity;
      case 'simSupported':
        return MODEL_CATEGORY_TOOLTIPS.simSupported;
      case 'connectionMode':
        return MODEL_CATEGORY_TOOLTIPS.connectionMode;
      default:
        return null;
    }
  };

  // Helper to render any table cell dynamically by column key
  const renderTableCell = (rec: ModelCategoryRecord, colKey: string) => {
    const isMettaX = rec.manufacturer === 'MettaX';

    switch (colKey) {
      case 'typeName':
        return (
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="hover:text-[#FA8A63]">{rec.typeName}</span>
            {isMettaX && rec.modelReference && (
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold">
                {rec.modelReference}
              </span>
            )}
          </div>
        );

      case 'category':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              rec.category === 'Device'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : rec.category === 'Sensor'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {rec.category === 'Device' && <Cpu className="w-3 h-3" />}
            {rec.category === 'Sensor' && <Radio className="w-3 h-3" />}
            {rec.category === 'SIM' && <Smartphone className="w-3 h-3" />}
            <span>{rec.category}</span>
          </span>
        );

      case 'manufacturer':
        return rec.manufacturer ? (
          <span className="font-medium text-slate-700">{rec.manufacturer}</span>
        ) : (
          <span className="text-slate-400 italic">—</span>
        );

      case 'modelReference':
        return rec.modelReference ? (
          <span className="font-mono text-[11px] font-semibold text-slate-700">
            {rec.modelReference}
          </span>
        ) : (
          <span className="text-slate-400 italic">—</span>
        );

      case 'identifierType': {
        const ids = getRecordIdentifierTypes(rec);
        return (
          <div className="flex flex-wrap gap-1">
            {ids.length > 0 ? (
              ids.map((idType) => (
                <span
                  key={idType}
                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]"
                >
                  {idType}
                </span>
              ))
            ) : (
              <span className="text-slate-400 italic">—</span>
            )}
          </div>
        );
      }

      case 'categoryDetail': {
        const detail = formatCategoryDetailSummary(rec);
        return <span className="font-medium text-slate-800">{detail || '—'}</span>;
      }

      case 'supportingDocs':
        return rec.supportingDocs.length > 0 ? (
          <span
            title="Metadata only (prototype)"
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium"
          >
            <FileText className="w-3 h-3" />
            <span>{rec.supportingDocs.length} file(s)</span>
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        );

      case 'status':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              rec.status === 'Active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                rec.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            {rec.status}
          </span>
        );

      case 'updatedAt':
        return (
          <span className="text-slate-500 text-[11px]">
            {rec.updatedAt ? new Date(rec.updatedAt).toLocaleDateString() : '—'}
          </span>
        );

      case 'createdAt':
        return (
          <span className="text-slate-500 text-[11px]">
            {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : '—'}
          </span>
        );

      case 'supportedModes':
      case 'supportedProtocols':
      case 'connectivity': {
        if (rec.category !== 'Device') return <span className="text-slate-300">—</span>;
        const list =
          colKey === 'supportedModes'
            ? rec.supportedModes && rec.supportedModes.length > 0
              ? rec.supportedModes
              : rec.deviceMode
              ? [rec.deviceMode]
              : []
            : colKey === 'supportedProtocols'
            ? rec.supportedProtocols || []
            : rec.connectivity || [];
        return list.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {list.map((item) => (
              <span
                key={item}
                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        );
      }

      case 'maxCameraChannels':
        if (rec.category !== 'Device') return <span className="text-slate-300">—</span>;
        return rec.maxCameraChannels != null ? (
          <span className="font-mono font-semibold text-slate-800">{rec.maxCameraChannels}</span>
        ) : (
          <span className="text-slate-400">—</span>
        );

      case 'validityMonths':
        if (rec.category !== 'SIM') return <span className="text-slate-300">—</span>;
        return rec.validityMonths != null ? (
          <span className="text-slate-700 font-medium">{rec.validityMonths} mo</span>
        ) : (
          <span className="text-slate-400">—</span>
        );

      case 'documentationUrl':
        return rec.documentationUrl ? (
          <a
            href={rec.documentationUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono text-[11px] max-w-[200px] truncate"
          >
            <span className="truncate">{rec.documentationUrl}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        );

      case 'description':
        return rec.description ? (
          <span className="text-slate-600 line-clamp-2 max-w-[240px]" title={rec.description}>
            {rec.description}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        );

      default: {
        const val = getRecordValueForColumnKey(rec, colKey);
        return val ? (
          <span className="text-slate-700 font-medium">{val}</span>
        ) : (
          <span className="text-slate-400">—</span>
        );
      }
    }
  };

  // Contextual Manufacturer / Brand vs Network Operator / Provider label
  const manufacturerFieldLabel =
    formCategory === 'SIM' ? 'Network Operator / Provider' : 'Brand';

  const isModelRefRequired =
    formCategory === 'Device' &&
    !(
      drawerMode === 'edit' &&
      editingRecord?.category === 'Device' &&
      !(editingRecord.modelReference || '').trim()
    );

  const deactivationRefInfo = pendingDeactivation
    ? referenceMap[pendingDeactivation.record.id]
    : null;

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden text-slate-900 select-none">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-16 right-6 z-[150] flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-medium transition-all max-w-md ${
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
          <span className="leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Main Page Header */}
      <div className="px-6 pt-5 pb-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Model Category Master</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-[#FA8A63]">
                {records.length} total
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Create and manage the global catalogue of Device, Sensor, and SIM model definitions, capabilities, and identifier formats.
            </p>
          </div>

          {/* Quick Header CTA Actions */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setShowResetDemoConfirm(true)}
              title="Prototype utility: reset local browser storage back to the 13 initial demo model definitions"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw size={13} className="text-slate-500" />
              <span>Reset demo types</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                Prototype
              </span>
            </button>



            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add model type</span>
            </button>
          </div>
        </div>

        {/* 2. Horizontal Category Tabs */}
        <div className="flex items-center justify-between mt-4 border-b border-slate-200 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-6">
            {[
              { id: 'All', label: 'All types', count: categoryCounts.all },
              { id: 'Device', label: 'Devices', count: categoryCounts.device },
              { id: 'Sensor', label: 'Sensors', count: categoryCounts.sensor },
              { id: 'SIM', label: 'SIMs', count: categoryCounts.sim },
            ].map((tab) => {
              const isActive = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(tab.id as 'All' | MainCategory);
                    setPage(1);
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

      {/* 3. Directory Inner Toolbar */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap">
          <span className="text-sm font-bold text-slate-900 shrink-0">Directory</span>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search size={14} className="text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Global search Model Type, Brand, Model Number, Identifier..."
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

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            title="Open Advanced Filter Drawer"
            className={`h-[31px] px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs relative ${
              activeAdvancedFilterCount > 0
                ? 'border-[#FA8A63] bg-[#FFF3EE] text-[#B85324]'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal size={14} className={activeAdvancedFilterCount > 0 ? 'text-[#FA8A63]' : 'text-slate-500'} />
            <span>Filter</span>
            {activeAdvancedFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#FA8A63] text-white text-[10px] font-bold inline-flex items-center justify-center">
                {activeAdvancedFilterCount}
              </span>
            )}
          </button>

          {/* Column Catalogue Popover */}
          <ColumnCataloguePopover
            columns={MODEL_CATEGORY_COLUMNS}
            visibleKeys={visibleColumnKeys}
            onChangeVisibleKeys={setVisibleColumnKeys}
            defaultKeys={DEFAULT_VISIBLE_MODEL_COLUMNS}
            pinnedKeys={pinnedColumnKeys}
            onChangePinnedKeys={setPinnedColumnKeys}
            defaultPinnedKeys={['typeName']}
            onToast={(msg) => showToast(msg, 'info')}
          />

          <button
            type="button"
            onClick={() => setIsImportDrawerOpen(true)}
            title="Import Model Category definitions from CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <FileUp size={14} className="text-slate-500" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            title="Export Selected, Filtered, or All Model Definitions to CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <FileDown size={14} className="text-slate-500" />
            <span>Export</span>
          </button>
        </div>

        {/* Right Toolbar Group: Count & Refresh */}
        <div className="flex items-center gap-2.5 text-xs text-slate-500 shrink-0">
          <span>
            Showing <strong className="text-slate-900 font-semibold">{filteredRecords.length}</strong> of{' '}
            {records.length} definitions
          </span>
          <button
            type="button"
            onClick={() => {
              setRefSyncTick((t) => t + 1);
              showToast('Directory synchronized', 'info');
            }}
            title="Refresh reference checks & view"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer transition-colors"
          >
            <RefreshCw size={13} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Applied Filter Chips Row */}
      {activeAdvancedFilterCount > 0 && (
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 font-medium">Applied Filters:</span>
          {fCategory !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
              Category: {fCategory}
              <button type="button" onClick={() => { setFCategory('All'); setCategoryFilter('All'); }} className="hover:text-rose-600"><X size={12} /></button>
            </span>
          )}
          {fStatus !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
              Status: {fStatus}
              <button type="button" onClick={() => { setFStatus('All'); setStatusFilter('All'); }} className="hover:text-rose-600"><X size={12} /></button>
            </span>
          )}
          {fTypeName.trim() && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
              Type: {fTypeName}
              <button type="button" onClick={() => setFTypeName('')} className="hover:text-rose-600"><X size={12} /></button>
            </span>
          )}
          {fManufacturer !== 'All' && fManufacturer && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
              Brand: {fManufacturer}
              <button type="button" onClick={() => setFManufacturer('All')} className="hover:text-rose-600"><X size={12} /></button>
            </span>
          )}
          {fModelReference.trim() && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
              Model Number: {fModelReference}
              <button type="button" onClick={() => setFModelReference('')} className="hover:text-rose-600"><X size={12} /></button>
            </span>
          )}
          {fDeviceFunction !== 'All' && fDeviceFunction && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
              Function: {fDeviceFunction}
              <button type="button" onClick={() => setFDeviceFunction('All')} className="hover:text-rose-600"><X size={12} /></button>
            </span>
          )}
          {fMeasurementType !== 'All' && fMeasurementType && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
              Measurement: {fMeasurementType}
              <button type="button" onClick={() => setFMeasurementType('All')} className="hover:text-rose-600"><X size={12} /></button>
            </span>
          )}
          {fSimSupported !== 'All' && fSimSupported && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
              SIM Supported: {fSimSupported}
              <button type="button" onClick={() => setFSimSupported('All')} className="hover:text-rose-600"><X size={12} /></button>
            </span>
          )}
          {fConnectionMode !== 'All' && fConnectionMode && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
              Connection Mode: {fConnectionMode}
              <button type="button" onClick={() => setFConnectionMode('All')} className="hover:text-rose-600"><X size={12} /></button>
            </span>
          )}
          {fSimType !== 'All' && fSimType && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
              SIM Type: {fSimType}
              <button type="button" onClick={() => setFSimType('All')} className="hover:text-rose-600"><X size={12} /></button>
            </span>
          )}
          {(fCreatedAtFrom || fCreatedAtTo || fUpdatedAtFrom || fUpdatedAtTo) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
              Date Range Filter Active
              <button type="button" onClick={() => { setFCreatedAtFrom(''); setFCreatedAtTo(''); setFUpdatedAtFrom(''); setFUpdatedAtTo(''); }} className="hover:text-rose-600"><X size={12} /></button>
            </span>
          )}
          <button
            type="button"
            onClick={handleResetAdvancedFilters}
            className="text-xs text-[#FA8A63] font-semibold hover:underline ml-2 cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Selection Counter Bar */}
      {selectedIds.length > 0 && (
        <div className="px-6 py-2 bg-[#FFF3EE] border-b border-[#FA8A63]/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 text-xs text-[#8C3B14]">
            <span className="px-2 py-0.5 rounded-full bg-[#FA8A63] text-white font-bold text-[11px]">
              {selectedIds.length} selected
            </span>
            <span>
              {selectedIds.length < filteredRecords.length && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(filteredRecords.map((r) => r.id))}
                  className="font-semibold underline hover:text-[#B85324] cursor-pointer"
                >
                  Select all {filteredRecords.length} filtered
                </button>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportSelectedDirect}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-orange-200 hover:bg-orange-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-[#FA8A63]" />
              Export Selected
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Bulk Actions ({selectedIds.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white/70 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Master Data Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left border-collapse text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-10 select-none">
                <tr>
                  {/* Checkbox Column */}
                  <th className="w-10 px-3 py-3 sticky left-0 z-20 bg-slate-50/95 border-r border-slate-200/60">
                    <input
                      type="checkbox"
                      aria-label="Select all rows on page"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPageSelected;
                      }}
                      onChange={toggleSelectAllOnPage}
                      className="rounded border-slate-300 accent-[#FA8A63] cursor-pointer"
                    />
                  </th>

                  {orderedVisibleColumns.map((col, idx) => {
                    const isSortable = SORTABLE_COLUMN_KEYS.has(col.key);
                    const tip = getHeaderTooltip(col.key);
                    const isFirstPinned = idx === 0 && pinnedColumnKeys.includes(col.key);
                    return (
                      <th
                        key={col.key}
                        onClick={() => {
                          if (!isSortable) return;
                          if (sortKey === col.key) setSortDir((prev) => (prev === 1 ? -1 : 1));
                          else {
                            setSortKey(col.key);
                            setSortDir(1);
                          }
                        }}
                        className={`px-4 py-3 font-semibold text-slate-700 whitespace-nowrap ${
                          isSortable ? 'hover:text-slate-900 cursor-pointer' : ''
                        } ${
                          isFirstPinned
                            ? 'sticky left-10 z-20 bg-slate-50/95 border-r border-slate-200/70 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.label}</span>
                          {tip && (
                            <InfoTip text={tip} align={idx === 0 ? 'left' : 'center'} />
                          )}
                          {isSortable &&
                            (sortKey === col.key ? (
                              sortDir === 1 ? (
                                <ArrowUp className="w-3 h-3 text-[#FA8A63]" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-[#FA8A63]" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-300" />
                            ))}
                        </div>
                      </th>
                    );
                  })}

                  <th className="px-3 py-3 text-right font-semibold text-slate-700 sticky right-0 bg-slate-50/95 border-l border-slate-200/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap w-[76px] z-20">
                    <div className="flex items-center justify-end gap-1">
                      <span>Actions</span>
                      <InfoTip text={MODEL_CATEGORY_TOOLTIPS.actions} align="right" />
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={orderedVisibleColumns.length + 2}
                      className="py-12 text-center text-slate-400"
                    >
                      <div className="max-w-sm mx-auto space-y-2">
                        <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                        <div className="text-sm font-semibold text-slate-700">
                          {records.length === 0
                            ? 'No model definitions in catalogue'
                            : 'No model definitions match your filters'}
                        </div>
                        <p className="text-xs text-slate-500">
                          {records.length === 0
                            ? 'Click "Add model type" or "Import CSV" to define a Device, Sensor, or SIM model.'
                            : 'Try adjusting your search, category, manufacturer/operator, or status filters.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((rec) => {
                    const isChecked = selectedIds.includes(rec.id);
                    const refInfo = referenceMap[rec.id];
                    const isReferenced = Boolean(refInfo?.isReferenced);

                    return (
                      <tr
                        key={rec.id}
                        className={`transition-colors group cursor-pointer ${
                          isChecked ? 'bg-[#FFF9F6]' : 'hover:bg-slate-50/80'
                        }`}
                        onClick={() => handleOpenViewOrEdit(rec, 'view')}
                      >
                        <td
                          className={`w-10 px-3 py-3 sticky left-0 z-10 border-r border-slate-100 ${
                            isChecked
                              ? 'bg-[#FFF9F6]'
                              : 'bg-white group-hover:bg-slate-50/95'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Select ${rec.typeName}`}
                            checked={isChecked}
                            onChange={() => toggleSelectRow(rec.id)}
                            className="rounded border-slate-300 accent-[#FA8A63] cursor-pointer"
                          />
                        </td>

                        {orderedVisibleColumns.map((col, idx) => {
                          const isFirstPinned = idx === 0 && pinnedColumnKeys.includes(col.key);
                          return (
                            <td
                              key={col.key}
                              className={`px-4 py-3 ${
                                isFirstPinned
                                  ? `sticky left-10 z-10 border-r border-slate-100 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.04)] ${
                                      isChecked
                                        ? 'bg-[#FFF9F6]'
                                        : 'bg-white group-hover:bg-slate-50/95'
                                    }`
                                  : ''
                              }`}
                            >
                              {renderTableCell(rec, col.key)}
                            </td>
                          );
                        })}

                        <td
                          className={`px-3 py-3 text-right sticky right-0 border-l border-slate-100 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap z-10 ${
                            isChecked
                              ? 'bg-[#FFF9F6]'
                              : 'bg-white/95 group-hover:bg-slate-50/95'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end">
                            <RowActionMenu
                              ariaLabel={`Actions for ${rec.typeName}`}
                              menuWidthClass="w-60"
                              items={[
                                {
                                  id: 'view',
                                  label: 'View details',
                                  icon: <Eye className="w-3.5 h-3.5 text-slate-400" />,
                                  onClick: () => handleOpenViewOrEdit(rec, 'view'),
                                },
                                {
                                  id: 'edit',
                                  label: 'Edit model definition',
                                  icon: <Edit2 className="w-3.5 h-3.5 text-slate-400" />,
                                  onClick: () => handleOpenViewOrEdit(rec, 'edit'),
                                },
                                {
                                  id: 'toggle-status',
                                  label: rec.status === 'Active' ? 'Deactivate' : 'Activate',
                                  icon: <Power className="w-3.5 h-3.5" />,
                                  tone: rec.status === 'Active' ? 'warning' : 'accent',
                                  onClick: () => handleToggleStatus(rec),
                                },
                                {
                                  id: 'delete',
                                  label: isReferenced ? 'Delete (Blocked)' : 'Delete model type',
                                  sublabel: isReferenced
                                    ? refInfo?.shortReason
                                    : undefined,
                                  title: isReferenced
                                    ? `Cannot delete: ${refInfo?.summaryLines.join('; ')}. Deactivate instead.`
                                    : 'Permanently delete this unreferenced model definition',
                                  badge: isReferenced ? 'In use' : undefined,
                                  icon: isReferenced ? (
                                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  ),
                                  tone: isReferenced ? 'muted' : 'danger',
                                  dividerBefore: true,
                                  onClick: () => handleRequestDelete(rec),
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

      {/* Pagination Footer */}
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
          <InfoTip text={MODEL_CATEGORY_TOOLTIPS.rowsPerPage} align="left" />
        </div>

        <div className="flex items-center gap-2">
          <span>
            Page {currentPage} of {totalPages}
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

      {/* =========================================================================
          RIGHT-SIDE ADD / EDIT / VIEW DRAWER
         ========================================================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
          <div className="w-[600px] max-w-full h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {drawerMode === 'add'
                    ? 'Add New Model Type'
                    : drawerMode === 'edit'
                    ? `Edit Model Type: ${formTypeName || 'Untitled'}`
                    : `View Model Type: ${formTypeName}`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {drawerMode === 'view'
                    ? 'Read-only model specification, capabilities, and governance details.'
                    : 'Define a reusable Device, Sensor, or SIM model in the platform catalogue.'}
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

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {formErrors.duplicate && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formErrors.duplicate}</span>
                </div>
              )}

              {/* Section 1: Primary Classification */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    1. Primary Classification
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isEditingCategoryLocked ? 'Category locked (referenced)' : 'Device / Sensor / SIM'}
                  </span>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Category <span className="text-rose-500">*</span>
                    <InfoTip text={MODEL_CATEGORY_TOOLTIPS.formCategory} align="left" />
                  </label>
                  {drawerMode === 'view' ? (
                    <div className="font-semibold text-slate-900 text-xs">{formCategory || '—'}</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2.5">
                        {(['Device', 'Sensor', 'SIM'] as MainCategory[]).map((cat) => {
                          const isSelected = formCategory === cat;
                          const isDisabled = isEditingCategoryLocked && !isSelected;
                          return (
                            <button
                              key={cat}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => handleCategoryChange(cat)}
                              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                isSelected
                                  ? 'border-[#FA8A63] bg-[#FFF3EE] text-[#B85324] ring-1 ring-[#FA8A63]'
                                  : isDisabled
                                  ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-55 cursor-not-allowed'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 cursor-pointer'
                              }`}
                            >
                              {cat === 'Device' && <Cpu className="w-3.5 h-3.5" />}
                              {cat === 'Sensor' && <Radio className="w-3.5 h-3.5" />}
                              {cat === 'SIM' && <Smartphone className="w-3.5 h-3.5" />}
                              <span>{cat}</span>
                            </button>
                          );
                        })}
                      </div>
                      {isEditingCategoryLocked && editingRecord && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Category is locked because this model is referenced downstream (
                            {referenceMap[editingRecord.id]?.shortReason.replace(' — deactivate instead', '')}
                            ).
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {formErrors.category && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.category}</p>
                  )}
                </div>

                {/* Model Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Model Type <span className="text-rose-500">*</span>
                    <InfoTip text={MODEL_CATEGORY_TOOLTIPS.formTypeName} align="left" />
                  </label>
                  {drawerMode === 'view' ? (
                    <div className="font-medium text-slate-900 text-xs">{formTypeName || '—'}</div>
                  ) : (
                    <>
                      <input
                        type="text"
                        list="model-type-name-suggestions"
                        value={formTypeName}
                        onChange={(e) => {
                          setFormTypeName(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g., ADAS/DMS Dashcam, Face Terminal, GPS Tracker, M2M SIM..."
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      />
                      <datalist id="model-type-name-suggestions">
                        {DEVICE_TYPE_SUGGESTIONS.map((s) => (
                          <option key={s.typeName} value={s.typeName} />
                        ))}
                      </datalist>
                      {(!formCategory || formCategory === 'Device') && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] font-semibold text-slate-400">Quick fill:</span>
                          {DEVICE_TYPE_SUGGESTIONS.map((s) => {
                            const active =
                              formTypeName.trim().toLowerCase() === s.typeName.toLowerCase();
                            return (
                              <button
                                key={s.typeName}
                                type="button"
                                onClick={() => {
                                  if (!formCategory) {
                                    setFormCategory('Device');
                                  }
                                  setFormTypeName(s.typeName);
                                  setFormDeviceFunction(s.deviceFunction);
                                  setFormIdentifierTypes([s.identifierType]);
                                  setFormDeviceModes(
                                    getDeviceModePresets(s.typeName, s.deviceFunction)
                                  );
                                  setFormSupportedProtocols(
                                    getPlatformProtocolPresets(s.typeName, s.deviceFunction)
                                  );
                                  setIsDirty(true);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-[#FFF3EE] text-[#B85324] border-[#FA8A63]'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {s.typeName}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                  {formErrors.typeName && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.typeName}</p>
                  )}
                </div>

                {/* Manufacturer / Brand OR Network Operator / Provider & Model Name / Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      {manufacturerFieldLabel} <span className="text-rose-500">*</span>
                      <InfoTip text={MODEL_CATEGORY_TOOLTIPS.formManufacturer} align="left" />
                    </label>
                    {drawerMode === 'view' ? (
                      <div className="font-medium text-slate-900 text-xs">
                        {formManufacturer === 'Other' ? formCustomManufacturer : formManufacturer || '—'}
                      </div>
                    ) : (
                      <>
                        <select
                          value={formManufacturer}
                          onChange={(e) => {
                            setFormManufacturer(e.target.value);
                            setIsDirty(true);
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                        >
                          <option value="">
                            {formCategory === 'SIM'
                              ? '-- Select Operator / Provider --'
                              : '-- Select Manufacturer / Brand --'}
                          </option>
                          {knownMakersForCategory.length > 0 && (
                            <optgroup
                              label={
                                formCategory === 'SIM'
                                  ? 'Telecom Operators / Providers'
                                  : formTypeName.trim()
                                  ? `Manufacturers (${formTypeName.trim()})`
                                  : 'Hardware Manufacturers / Brands'
                              }
                            >
                              {knownMakersForCategory.map((mfg) => (
                                <option key={`maker-${mfg}`} value={mfg}>
                                  {mfg}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {customMakersForDropdown.length > 0 && (
                            <optgroup
                              label={
                                formCategory === 'SIM'
                                  ? 'Custom Added Operators / Providers'
                                  : 'Custom Added Manufacturers / Brands'
                              }
                            >
                              {customMakersForDropdown.map((cMfg) => (
                                <option key={`custom-maker-${cMfg}`} value={cMfg}>
                                  {cMfg}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <option value="Other">
                            {formCategory === 'SIM'
                              ? '+ Custom Operator / Provider'
                              : '+ Custom Manufacturer / Brand'}
                          </option>
                        </select>
                        {formManufacturer === 'Other' && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <input
                              type="text"
                              value={formCustomManufacturer}
                              onChange={(e) => {
                                setFormCustomManufacturer(e.target.value);
                                setIsDirty(true);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && formCustomManufacturer.trim()) {
                                  e.preventDefault();
                                  const customVal = formCustomManufacturer.trim();
                                  setCustomManufacturers(saveCustomManufacturer(customVal));
                                  setFormManufacturer(customVal);
                                  setFormCustomManufacturer('');
                                  setIsDirty(true);
                                }
                              }}
                              placeholder={
                                formCategory === 'SIM'
                                  ? 'Enter operator / provider name...'
                                  : 'Enter manufacturer / brand name...'
                              }
                              className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FA8A63]"
                            />
                            <button
                              type="button"
                              disabled={!formCustomManufacturer.trim()}
                              onClick={() => {
                                const customVal = formCustomManufacturer.trim();
                                if (!customVal) return;
                                setCustomManufacturers(saveCustomManufacturer(customVal));
                                setFormManufacturer(customVal);
                                setFormCustomManufacturer('');
                                setIsDirty(true);
                              }}
                              className="h-8 px-2.5 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] disabled:opacity-40 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {formErrors.manufacturer && (
                      <p className="text-[11px] text-rose-600 mt-1">{formErrors.manufacturer}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Model Name / Number{' '}
                      {isModelRefRequired ? (
                        <span className="text-rose-500">*</span>
                      ) : (
                        <span className="text-slate-400 font-normal">(Optional)</span>
                      )}
                      <InfoTip text={MODEL_CATEGORY_TOOLTIPS.formModelReference} align="right" />
                    </label>
                    {drawerMode === 'view' ? (
                      <div className="font-mono text-slate-900 text-xs">
                        {formModelReference || '—'}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formModelReference}
                        onChange={(e) => {
                          setFormModelReference(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder={
                          formCategory === 'Device'
                            ? 'e.g., MC202N, FMB140 (Required)'
                            : 'e.g., EYE-SENSOR, M2M-24 (Optional)'
                        }
                        className={`w-full h-8 px-2.5 rounded-lg border text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                          formErrors.modelReference ? 'border-rose-400' : 'border-slate-200'
                        }`}
                      />
                    )}
                    {formErrors.modelReference && (
                      <p className="text-[11px] text-rose-600 mt-1">{formErrors.modelReference}</p>
                    )}
                  </div>
                </div>

                {/* Identifier Types (Multi-select) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Identifier Types <span className="text-rose-500">*</span>
                    <InfoTip text={MODEL_CATEGORY_TOOLTIPS.formIdentifierType} align="left" />
                  </label>
                  {drawerMode === 'view' ? (
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {formIdentifierTypes.length > 0 ? (
                        formIdentifierTypes.map((idItem) => (
                          <span
                            key={idItem}
                            className="px-2 py-0.5 rounded bg-orange-50 text-[#B85324] border border-orange-200 text-[11px] font-mono font-semibold"
                          >
                            {idItem}
                          </span>
                        ))
                      ) : (
                        <span className="font-mono text-slate-900">—</span>
                      )}
                    </div>
                  ) : (
                    <div ref={identifierDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIdentifierMenuOpen((prev) => !prev)}
                        className={`w-full min-h-[32px] px-2.5 py-1 rounded-lg border bg-white text-xs text-slate-900 flex items-center justify-between gap-1.5 hover:border-slate-300 focus:outline-none focus:border-[#FA8A63] cursor-pointer ${
                          formErrors.identifierType ? 'border-rose-400' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-1 flex-1 text-left">
                          {formIdentifierTypes.length === 0 ? (
                            <span className="text-slate-400">-- Choose Identifier Types --</span>
                          ) : (
                            formIdentifierTypes.map((idItem) => (
                              <span
                                key={idItem}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFF3EE] text-[#B85324] border border-[#FA8A63]/40 text-[10px] font-mono font-semibold"
                              >
                                <span>{idItem}</span>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFormIdentifierTypes((prev) =>
                                      prev.filter((item) => item !== idItem)
                                    );
                                    setIsDirty(true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setFormIdentifierTypes((prev) =>
                                        prev.filter((item) => item !== idItem)
                                      );
                                      setIsDirty(true);
                                    }
                                  }}
                                  className="text-[#B85324] hover:text-slate-900 cursor-pointer"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </span>
                              </span>
                            ))
                          )}
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                            identifierMenuOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {identifierMenuOpen && (
                        <div className="absolute left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-xl z-50 overflow-hidden min-w-[260px]">
                          <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50/70">
                            <div className="relative flex-1">
                              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={identifierSearch}
                                onChange={(e) => setIdentifierSearch(e.target.value)}
                                placeholder="Search or add custom identifier..."
                                className="w-full h-7 pl-6 pr-2 rounded border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                              />
                            </div>
                            {formIdentifierTypes.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormIdentifierTypes([]);
                                  setIsDirty(true);
                                }}
                                className="text-[11px] font-semibold text-rose-600 hover:underline px-1 cursor-pointer shrink-0"
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          <div className="max-h-60 overflow-y-auto p-1.5 space-y-2">
                            {(() => {
                              const allMeta = [
                                ...IDENTIFIER_TYPE_META.Device,
                                ...IDENTIFIER_TYPE_META.Sensor,
                                ...IDENTIFIER_TYPE_META.SIM,
                              ];
                              const q = identifierSearch.trim().toLowerCase();
                              const matchesQuery = (val: string, label?: string, usedFor?: string) =>
                                !q ||
                                val.toLowerCase().includes(q) ||
                                (label || '').toLowerCase().includes(q) ||
                                (usedFor || '').toLowerCase().includes(q);

                              const toggleIdentifier = (val: string) => {
                                setFormIdentifierTypes((prev) =>
                                  prev.includes(val)
                                    ? prev.filter((item) => item !== val)
                                    : [...prev, val]
                                );
                                setFormErrors((prev) => {
                                  if (!prev.identifierType) return prev;
                                  const next = { ...prev };
                                  delete next.identifierType;
                                  return next;
                                });
                                setIsDirty(true);
                              };

                              const renderOptionRow = (
                                key: string,
                                val: string,
                                labelText: string,
                                subText?: string
                              ) => {
                                const checked = formIdentifierTypes.includes(val);
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggleIdentifier(val)}
                                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-left transition-colors cursor-pointer ${
                                      checked
                                        ? 'bg-[#FFF3EE] text-[#B85324]'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div
                                        className={`text-xs truncate ${
                                          checked ? 'font-semibold text-[#B85324]' : 'font-medium text-slate-800'
                                        }`}
                                      >
                                        {labelText}
                                      </div>
                                      {subText && (
                                        <div className="text-[10px] text-slate-500 truncate">
                                          {subText}
                                        </div>
                                      )}
                                    </div>
                                    <span
                                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                        checked
                                          ? 'bg-[#FA8A63] border-[#FA8A63] text-white'
                                          : 'border-slate-300 bg-white'
                                      }`}
                                    >
                                      {checked && <Check className="w-2.5 h-2.5" />}
                                    </span>
                                  </button>
                                );
                              };

                              const recVals = formTypeName.trim()
                                ? getRecommendedIdentifierTypes(formCategory, formTypeName).filter((v) => {
                                    const m = allMeta.find((item) => item.value === v);
                                    return matchesQuery(v, m?.label, m?.usedFor);
                                  })
                                : [];

                              const categoryGroups = (
                                formCategory ? [formCategory] : (['Device', 'Sensor', 'SIM'] as MainCategory[])
                              )
                                .map((cat) => ({
                                  cat,
                                  items: IDENTIFIER_TYPE_META[cat].filter((m) =>
                                    matchesQuery(m.value, m.label, m.usedFor)
                                  ),
                                }))
                                .filter((g) => g.items.length > 0);

                              const customItems = customIdentifiersForDropdown.filter((cId) =>
                                matchesQuery(cId)
                              );

                              const hasExactMatch = allIdentifierOptionValues.some(
                                (opt) => opt.toLowerCase() === q
                              );

                              return (
                                <>
                                  {recVals.length > 0 && (
                                    <div className="space-y-0.5">
                                      <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Recommended for {formTypeName.trim()}
                                      </div>
                                      {recVals.map((recVal) => {
                                        const meta = allMeta.find((m) => m.value === recVal);
                                        return renderOptionRow(
                                          `rec-${recVal}`,
                                          recVal,
                                          meta ? meta.label : recVal,
                                          meta?.usedFor
                                        );
                                      })}
                                    </div>
                                  )}

                                  {categoryGroups.map((group) => (
                                    <div key={`grp-${group.cat}`} className="space-y-0.5">
                                      <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        {group.cat} Identifiers
                                      </div>
                                      {group.items.map((idOpt) =>
                                        renderOptionRow(
                                          `${group.cat}-${idOpt.value}`,
                                          idOpt.value,
                                          idOpt.label,
                                          idOpt.usedFor
                                        )
                                      )}
                                    </div>
                                  ))}

                                  {customItems.length > 0 && (
                                    <div className="space-y-0.5">
                                      <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Custom Identifier Types
                                      </div>
                                      {customItems.map((cId) =>
                                        renderOptionRow(`custom-${cId}`, cId, cId)
                                      )}
                                    </div>
                                  )}

                                  {identifierSearch.trim() && !hasExactMatch && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const customVal = identifierSearch.trim();
                                        setCustomIdentifierTypes(saveCustomIdentifierType(customVal));
                                        setFormIdentifierTypes((prev) =>
                                          prev.some((p) => p.toLowerCase() === customVal.toLowerCase())
                                            ? prev
                                            : [...prev, customVal]
                                        );
                                        setIdentifierSearch('');
                                        setFormErrors((prev) => {
                                          if (!prev.identifierType) return prev;
                                          const next = { ...prev };
                                          delete next.identifierType;
                                          return next;
                                        });
                                        setIsDirty(true);
                                      }}
                                      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-orange-50 text-[#B85324] hover:bg-orange-100 text-xs font-semibold cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add custom identifier &ldquo;{identifierSearch.trim()}&rdquo;</span>
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          <div className="border-t border-slate-100 p-1.5 bg-slate-50/70">
                            {!showCustomIdentifierInput ? (
                              <button
                                type="button"
                                onClick={() => setShowCustomIdentifierInput(true)}
                                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold text-[#B85324] hover:bg-orange-50 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Custom / Other Identifier Type</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  autoFocus
                                  value={formCustomIdentifierText}
                                  onChange={(e) => {
                                    setFormCustomIdentifierText(e.target.value);
                                    setIsDirty(true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && formCustomIdentifierText.trim()) {
                                      e.preventDefault();
                                      const customVal = formCustomIdentifierText.trim();
                                      setCustomIdentifierTypes(saveCustomIdentifierType(customVal));
                                      setFormIdentifierTypes((prev) =>
                                        prev.some((p) => p.toLowerCase() === customVal.toLowerCase())
                                          ? prev
                                          : [...prev, customVal]
                                      );
                                      setFormCustomIdentifierText('');
                                      setShowCustomIdentifierInput(false);
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="Enter custom format (e.g. Asset Tag, VIN)..."
                                  className="flex-1 h-7 px-2 rounded border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                                />
                                <button
                                  type="button"
                                  disabled={!formCustomIdentifierText.trim()}
                                  onClick={() => {
                                    const customVal = formCustomIdentifierText.trim();
                                    if (!customVal) return;
                                    setCustomIdentifierTypes(saveCustomIdentifierType(customVal));
                                    setFormIdentifierTypes((prev) =>
                                      prev.some((p) => p.toLowerCase() === customVal.toLowerCase())
                                        ? prev
                                        : [...prev, customVal]
                                    );
                                    setFormCustomIdentifierText('');
                                    setShowCustomIdentifierInput(false);
                                    setIsDirty(true);
                                  }}
                                  className="h-7 px-2.5 rounded bg-[#FA8A63] hover:bg-[#e57953] disabled:opacity-40 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                                >
                                  Add
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {formErrors.identifierType && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.identifierType}</p>
                  )}
                </div>
              </div>

              {/* Section 2: Category-Specific Attributes (STRICTLY CATEGORY-GATED) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    2. {formCategory ? `${formCategory} Specifications` : 'Category Specifications'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formCategory
                      ? `${formCategory}-only capabilities`
                      : 'Select a category above'}
                  </span>
                </div>

                {!formCategory && (
                  <div className="py-3 text-center text-xs text-slate-500">
                    Select a primary category above (<span className="font-semibold text-slate-700">Device</span>,{' '}
                    <span className="font-semibold text-slate-700">Sensor</span>, or{' '}
                    <span className="font-semibold text-slate-700">SIM</span>) to configure category-specific fields.
                  </div>
                )}

                {/* DEVICE-ONLY CONTROLS */}
                {formCategory === 'Device' && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Device Function */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          Device Function <span className="text-rose-500">*</span>
                          <InfoTip text={MODEL_CATEGORY_TOOLTIPS.deviceFunction} align="left" />
                        </label>
                        {drawerMode === 'view' ? (
                          <div className="font-medium text-slate-900 text-xs">
                            {formDeviceFunction === 'Other'
                              ? formCustomDeviceFunction || '—'
                              : formDeviceFunction || '—'}
                          </div>
                        ) : (
                          <>
                            <select
                              value={formDeviceFunction}
                              onChange={(e) => {
                                setFormDeviceFunction(e.target.value as DeviceFunction);
                                setIsDirty(true);
                              }}
                              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                            >
                              <option value="">-- Select Device Function --</option>
                              {DEVICE_FUNCTION_OPTIONS.map((fn) => (
                                <option key={fn} value={fn}>
                                  {fn}
                                </option>
                              ))}
                              {customFunctionsForDropdown.length > 0 && (
                                <optgroup label="Custom Device Functions">
                                  {customFunctionsForDropdown.map((cFn) => (
                                    <option key={`custom-fn-${cFn}`} value={cFn}>
                                      {cFn}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              <option value="Other">+ Custom / Other Device Function</option>
                            </select>
                            {formDeviceFunction === 'Other' && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <input
                                  type="text"
                                  value={formCustomDeviceFunction}
                                  onChange={(e) => {
                                    setFormCustomDeviceFunction(e.target.value);
                                    setIsDirty(true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && formCustomDeviceFunction.trim()) {
                                      e.preventDefault();
                                      const customVal = formCustomDeviceFunction.trim();
                                      setCustomDeviceFunctions(saveCustomDeviceFunction(customVal));
                                      setFormDeviceFunction(customVal);
                                      setFormCustomDeviceFunction('');
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="Enter custom device function..."
                                  className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FA8A63]"
                                />
                                <button
                                  type="button"
                                  disabled={!formCustomDeviceFunction.trim()}
                                  onClick={() => {
                                    const customVal = formCustomDeviceFunction.trim();
                                    if (!customVal) return;
                                    setCustomDeviceFunctions(saveCustomDeviceFunction(customVal));
                                    setFormDeviceFunction(customVal);
                                    setFormCustomDeviceFunction('');
                                    setIsDirty(true);
                                  }}
                                  className="h-8 px-2.5 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] disabled:opacity-40 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                                >
                                  Add
                                </button>
                              </div>
                            )}
                          </>
                        )}
                        {formErrors.deviceFunction && (
                          <p className="text-[11px] text-rose-600 mt-1">{formErrors.deviceFunction}</p>
                        )}
                      </div>

                      {/* Supported Modes */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          Supported Modes
                          <InfoTip text={MODEL_CATEGORY_TOOLTIPS.deviceMode} align="right" />
                        </label>
                        {drawerMode === 'view' ? (
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            {formDeviceModes.length > 0 ? (
                              formDeviceModes.map((modeItem) => (
                                <span
                                  key={modeItem}
                                  className="px-2 py-0.5 rounded bg-orange-50 text-[#B85324] border border-orange-200 text-[11px] font-semibold"
                                >
                                  {modeItem}
                                </span>
                              ))
                            ) : (
                              <span className="font-medium text-slate-900">—</span>
                            )}
                          </div>
                        ) : (
                          <div ref={modeDropdownRef} className="relative">
                            <button
                              type="button"
                              onClick={() => setModeMenuOpen((prev) => !prev)}
                              className="w-full min-h-[32px] px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 flex items-center justify-between gap-1.5 hover:border-slate-300 focus:outline-none focus:border-[#FA8A63] cursor-pointer"
                            >
                              <div className="flex flex-wrap items-center gap-1 flex-1 text-left">
                                {formDeviceModes.length === 0 ? (
                                  <span className="text-slate-400">-- Select Modes --</span>
                                ) : (
                                  formDeviceModes.map((modeItem) => (
                                    <span
                                      key={modeItem}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFF3EE] text-[#B85324] border border-[#FA8A63]/40 text-[10px] font-semibold"
                                    >
                                      <span>{modeItem}</span>
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFormDeviceModes((prev) =>
                                            prev.filter((m) => m !== modeItem)
                                          );
                                          setIsDirty(true);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setFormDeviceModes((prev) =>
                                              prev.filter((m) => m !== modeItem)
                                            );
                                            setIsDirty(true);
                                          }
                                        }}
                                        className="text-[#B85324] hover:text-slate-900 cursor-pointer"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </span>
                                    </span>
                                  ))
                                )}
                              </div>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                                  modeMenuOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            {modeMenuOpen && (
                              <div className="absolute left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-xl z-50 overflow-hidden min-w-[240px]">
                                <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50/70">
                                  <div className="relative flex-1">
                                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                    <input
                                      type="text"
                                      value={modeSearch}
                                      onChange={(e) => setModeSearch(e.target.value)}
                                      placeholder="Search or add custom mode..."
                                      className="w-full h-7 pl-6 pr-2 rounded border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                                    />
                                  </div>
                                  {formDeviceModes.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormDeviceModes([]);
                                        setIsDirty(true);
                                      }}
                                      className="text-[11px] font-semibold text-rose-600 hover:underline px-1 cursor-pointer shrink-0"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>

                                <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                                  {deviceModeOptions
                                    .filter((opt) =>
                                      opt.toLowerCase().includes(modeSearch.trim().toLowerCase())
                                    )
                                    .map((modeOpt) => {
                                      const checked = formDeviceModes.includes(modeOpt);
                                      return (
                                        <button
                                          key={modeOpt}
                                          type="button"
                                          onClick={() => {
                                            setFormDeviceModes((prev) =>
                                              checked
                                                ? prev.filter((m) => m !== modeOpt)
                                                : [...prev, modeOpt]
                                            );
                                            setIsDirty(true);
                                          }}
                                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                                            checked
                                              ? 'bg-[#FFF3EE] text-[#B85324] font-semibold'
                                              : 'text-slate-700 hover:bg-slate-50'
                                          }`}
                                        >
                                          <span className="truncate">{modeOpt}</span>
                                          <span
                                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                              checked
                                                ? 'bg-[#FA8A63] border-[#FA8A63] text-white'
                                                : 'border-slate-300 bg-white'
                                            }`}
                                          >
                                            {checked && <Check className="w-2.5 h-2.5" />}
                                          </span>
                                        </button>
                                      );
                                    })}

                                  {modeSearch.trim() &&
                                    !deviceModeOptions.some(
                                      (opt) =>
                                        opt.toLowerCase() === modeSearch.trim().toLowerCase()
                                    ) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const customModeName = modeSearch.trim();
                                          setCustomDeviceModes(saveCustomDeviceMode(customModeName));
                                          setFormDeviceModes((prev) =>
                                            prev.includes(customModeName)
                                              ? prev
                                              : [...prev, customModeName]
                                          );
                                          setModeSearch('');
                                          setIsDirty(true);
                                        }}
                                        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-orange-50 text-[#B85324] hover:bg-orange-100 text-xs font-semibold cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add custom mode &ldquo;{modeSearch.trim()}&rdquo;</span>
                                      </button>
                                    )}
                                </div>

                                <div className="border-t border-slate-100 p-1.5 bg-slate-50/70">
                                  {!showCustomModeInput ? (
                                    <button
                                      type="button"
                                      onClick={() => setShowCustomModeInput(true)}
                                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold text-[#B85324] hover:bg-orange-50 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>+ Custom / Other Mode</span>
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        autoFocus
                                        value={formCustomModeText}
                                        onChange={(e) => setFormCustomModeText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && formCustomModeText.trim()) {
                                            e.preventDefault();
                                            const customModeName = formCustomModeText.trim();
                                            setCustomDeviceModes(
                                              saveCustomDeviceMode(customModeName)
                                            );
                                            setFormDeviceModes((prev) =>
                                              prev.includes(customModeName)
                                                ? prev
                                                : [...prev, customModeName]
                                            );
                                            setFormCustomModeText('');
                                            setShowCustomModeInput(false);
                                            setIsDirty(true);
                                          }
                                        }}
                                        placeholder="Enter custom mode..."
                                        className="flex-1 h-7 px-2 rounded border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                                      />
                                      <button
                                        type="button"
                                        disabled={!formCustomModeText.trim()}
                                        onClick={() => {
                                          const customModeName = formCustomModeText.trim();
                                          if (!customModeName) return;
                                          setCustomDeviceModes(
                                            saveCustomDeviceMode(customModeName)
                                          );
                                          setFormDeviceModes((prev) =>
                                            prev.includes(customModeName)
                                              ? prev
                                              : [...prev, customModeName]
                                          );
                                          setFormCustomModeText('');
                                          setShowCustomModeInput(false);
                                          setIsDirty(true);
                                        }}
                                        className="h-7 px-2.5 rounded bg-[#FA8A63] hover:bg-[#e57953] disabled:opacity-40 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Supported Protocols */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1">
                        Supported Protocols
                        <InfoTip text={MODEL_CATEGORY_TOOLTIPS.platformProtocols} align="left" />
                      </label>
                      {drawerMode === 'view' ? (
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {formSupportedProtocols.length > 0 ? (
                            formSupportedProtocols.map((proto) => (
                              <span
                                key={proto}
                                className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold"
                              >
                                {proto}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-900">—</span>
                          )}
                        </div>
                      ) : (
                        <div ref={protocolDropdownRef} className="relative">
                          <button
                            type="button"
                            onClick={() => setProtocolMenuOpen((prev) => !prev)}
                            className="w-full min-h-[32px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 flex items-center justify-between gap-2 hover:border-slate-300 focus:outline-none focus:border-[#FA8A63] cursor-pointer"
                          >
                            <div className="flex flex-wrap items-center gap-1 flex-1 text-left">
                              {formSupportedProtocols.length === 0 ? (
                                <span className="text-slate-400">
                                  -- Select Supported Protocols (Metta, BSL, Streamax API, ISUP, ONVIF, Codec8...) --
                                </span>
                              ) : (
                                formSupportedProtocols.map((proto) => (
                                  <span
                                    key={proto}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold"
                                  >
                                    <span>{proto}</span>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFormSupportedProtocols((prev) =>
                                          prev.filter((p) => p !== proto)
                                        );
                                        setIsDirty(true);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setFormSupportedProtocols((prev) =>
                                            prev.filter((p) => p !== proto)
                                          );
                                          setIsDirty(true);
                                        }
                                      }}
                                      className="text-amber-600 hover:text-amber-900 cursor-pointer"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </span>
                                  </span>
                                ))
                              )}
                            </div>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                                protocolMenuOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {protocolMenuOpen && (
                            <div className="absolute left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                              <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70">
                                <div className="relative flex-1">
                                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    value={protocolSearch}
                                    onChange={(e) => setProtocolSearch(e.target.value)}
                                    placeholder="Search or type custom protocol..."
                                    className="w-full h-7 pl-6 pr-2 rounded border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                                  />
                                </div>
                                {formSupportedProtocols.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormSupportedProtocols([]);
                                      setIsDirty(true);
                                    }}
                                    className="text-[11px] font-semibold text-rose-600 hover:underline px-1 cursor-pointer shrink-0"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>

                              <div className="max-h-48 overflow-y-auto p-1.5 grid grid-cols-2 gap-1">
                                {protocolOptionList
                                  .filter((opt) =>
                                    opt.toLowerCase().includes(protocolSearch.trim().toLowerCase())
                                  )
                                  .map((pOpt) => {
                                    const checked = formSupportedProtocols.includes(pOpt);
                                    const isRecommended = protocolPresets.includes(pOpt);
                                    return (
                                      <button
                                        key={pOpt}
                                        type="button"
                                        onClick={() => {
                                          setFormSupportedProtocols((prev) =>
                                            checked
                                              ? prev.filter((p) => p !== pOpt)
                                              : [...prev, pOpt]
                                          );
                                          setIsDirty(true);
                                        }}
                                        className={`flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                                          checked
                                            ? 'bg-amber-50 text-amber-800 font-semibold'
                                            : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        <span className="truncate flex items-center gap-1.5">
                                          <span>{pOpt}</span>
                                          {isRecommended && !checked && (
                                            <span className="text-[9px] text-slate-400 font-normal">
                                              preset
                                            </span>
                                          )}
                                        </span>
                                        <span
                                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                            checked
                                              ? 'bg-[#FA8A63] border-[#FA8A63] text-white'
                                              : 'border-slate-300 bg-white'
                                          }`}
                                        >
                                          {checked && <Check className="w-2.5 h-2.5" />}
                                        </span>
                                      </button>
                                    );
                                  })}

                                {protocolSearch.trim() &&
                                  !protocolOptionList.some(
                                    (opt) =>
                                      opt.toLowerCase() === protocolSearch.trim().toLowerCase()
                                  ) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const customProto = protocolSearch.trim();
                                        setCustomPlatformProtocols(
                                          saveCustomPlatformProtocol(customProto)
                                        );
                                        setFormSupportedProtocols((prev) =>
                                          prev.includes(customProto) ? prev : [...prev, customProto]
                                        );
                                        setProtocolSearch('');
                                        setIsDirty(true);
                                      }}
                                      className="col-span-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-orange-50 text-[#B85324] hover:bg-orange-100 text-xs font-semibold cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add custom protocol &ldquo;{protocolSearch.trim()}&rdquo;</span>
                                    </button>
                                  )}
                              </div>

                              <div className="border-t border-slate-100 p-1.5 bg-slate-50/70">
                                {!showCustomProtocolInput ? (
                                  <button
                                    type="button"
                                    onClick={() => setShowCustomProtocolInput(true)}
                                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold text-[#B85324] hover:bg-orange-50 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Custom / Other Protocol</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      autoFocus
                                      value={formCustomProtocolText}
                                      onChange={(e) => setFormCustomProtocolText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && formCustomProtocolText.trim()) {
                                          e.preventDefault();
                                          const customProto = formCustomProtocolText.trim();
                                          setCustomPlatformProtocols(
                                            saveCustomPlatformProtocol(customProto)
                                          );
                                          setFormSupportedProtocols((prev) =>
                                            prev.includes(customProto)
                                              ? prev
                                              : [...prev, customProto]
                                          );
                                          setFormCustomProtocolText('');
                                          setShowCustomProtocolInput(false);
                                          setIsDirty(true);
                                        }
                                      }}
                                      placeholder="Enter custom protocol..."
                                      className="flex-1 h-7 px-2 rounded border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                                    />
                                    <button
                                      type="button"
                                      disabled={!formCustomProtocolText.trim()}
                                      onClick={() => {
                                        const customProto = formCustomProtocolText.trim();
                                        if (!customProto) return;
                                        setCustomPlatformProtocols(
                                          saveCustomPlatformProtocol(customProto)
                                        );
                                        setFormSupportedProtocols((prev) =>
                                          prev.includes(customProto)
                                            ? prev
                                            : [...prev, customProto]
                                        );
                                        setFormCustomProtocolText('');
                                        setShowCustomProtocolInput(false);
                                        setIsDirty(true);
                                      }}
                                      className="h-7 px-2.5 rounded bg-[#FA8A63] hover:bg-[#e57953] disabled:opacity-40 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                                    >
                                      Add
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* SENSOR-ONLY CONTROLS */}
                {formCategory === 'Sensor' && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          Measurement Type <span className="text-rose-500">*</span>
                          <InfoTip text={MODEL_CATEGORY_TOOLTIPS.measurementType} align="left" />
                        </label>
                        {drawerMode === 'view' ? (
                          <div className="font-medium text-slate-900 text-xs">
                            {formMeasurementType || '—'}
                          </div>
                        ) : (
                          <select
                            value={formMeasurementType}
                            onChange={(e) => {
                              setFormMeasurementType(e.target.value as SensorMeasurementType);
                              setIsDirty(true);
                            }}
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                          >
                            <option value="">-- Choose Measurement --</option>
                            {MEASUREMENT_TYPE_OPTIONS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        )}
                        {formErrors.measurementType && (
                          <p className="text-[11px] text-rose-600 mt-1">
                            {formErrors.measurementType}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          Measurement Unit{' '}
                          {sensorMeasurementNeedsUnit(formMeasurementType) && (
                            <span className="text-rose-500">*</span>
                          )}
                          <InfoTip text={MODEL_CATEGORY_TOOLTIPS.measurementUnit} align="right" />
                        </label>
                        {drawerMode === 'view' ? (
                          <div className="text-slate-900 text-xs">{formMeasurementUnit || '—'}</div>
                        ) : (
                          <select
                            value={formMeasurementUnit}
                            onChange={(e) => {
                              setFormMeasurementUnit(e.target.value as SensorMeasurementUnit);
                              setIsDirty(true);
                            }}
                            className={`w-full h-8 px-2.5 rounded-lg border bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                              formErrors.measurementUnit ? 'border-rose-400' : 'border-slate-200'
                            }`}
                          >
                            <option value="">-- Choose Unit --</option>
                            {MEASUREMENT_UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        )}
                        {formErrors.measurementUnit && (
                          <p className="text-[11px] text-rose-600 mt-1">
                            {formErrors.measurementUnit}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Sensor Connection Mode (Newly Exposed) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1">
                        Connection Mode
                        <InfoTip text={MODEL_CATEGORY_TOOLTIPS.connectionMode} align="left" />
                      </label>
                      {drawerMode === 'view' ? (
                        <div className="font-medium text-slate-900 text-xs">
                          {formConnectionMode || 'Unknown'}
                        </div>
                      ) : (
                        <select
                          value={formConnectionMode}
                          onChange={(e) => {
                            setFormConnectionMode(e.target.value as SensorConnectionMode);
                            setIsDirty(true);
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                        >
                          {SENSOR_CONNECTION_MODE_OPTIONS.map((cm) => (
                            <option key={cm} value={cm}>
                              {cm}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* SIM-ONLY CONTROLS */}
                {formCategory === 'SIM' && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          SIM Type <span className="text-rose-500">*</span>
                          <InfoTip text={MODEL_CATEGORY_TOOLTIPS.simType} align="left" />
                        </label>
                        {drawerMode === 'view' ? (
                          <div className="font-medium text-slate-900 text-xs">
                            {formSimType || '—'}
                          </div>
                        ) : (
                          <select
                            value={formSimType}
                            onChange={(e) => {
                              setFormSimType(e.target.value as SimTypeChoice);
                              setIsDirty(true);
                            }}
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                          >
                            <option value="">-- Choose SIM Type --</option>
                            {SIM_TYPE_OPTIONS.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        )}
                        {formErrors.simType && (
                          <p className="text-[11px] text-rose-600 mt-1">{formErrors.simType}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          Form Factor
                          <InfoTip text={MODEL_CATEGORY_TOOLTIPS.simFormFactor} align="right" />
                        </label>
                        {drawerMode === 'view' ? (
                          <div className="text-slate-900 text-xs">{formSimFormFactor || '—'}</div>
                        ) : (
                          <select
                            value={formSimFormFactor}
                            onChange={(e) => {
                              setFormSimFormFactor(e.target.value as SimFormFactorChoice);
                              setIsDirty(true);
                            }}
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                          >
                            {SIM_FORM_FACTOR_OPTIONS.map((ff) => (
                              <option key={ff} value={ff}>
                                {ff}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1">
                        Default Validity (Months)
                        <InfoTip text={MODEL_CATEGORY_TOOLTIPS.validityMonths} align="left" />
                      </label>
                      {drawerMode === 'view' ? (
                        <div className="text-slate-900 text-xs">
                          {formValidityMonths ? `${formValidityMonths} Months` : '—'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formValidityMonths}
                          onChange={(e) => {
                            setFormValidityMonths(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="e.g., 12, 24, 36 (positive whole integer; optional)"
                          className={`w-full h-8 px-2.5 rounded-lg border bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                            formErrors.validityMonths ? 'border-rose-400' : 'border-slate-200'
                          }`}
                        />
                      )}
                      {formErrors.validityMonths && (
                        <p className="text-[11px] text-rose-600 mt-1">{formErrors.validityMonths}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Documentation & Governance */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3. Documentation & Governance
                  </span>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Description
                    <InfoTip text={MODEL_CATEGORY_TOOLTIPS.formDescription} align="left" />
                  </label>
                  {drawerMode === 'view' ? (
                    <div className="text-slate-700 text-xs whitespace-pre-wrap">
                      {formDescription || 'No description provided.'}
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      value={formDescription}
                      onChange={(e) => {
                        setFormDescription(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Brief note on what this model definition represents or where it is used..."
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                    />
                  )}
                </div>

                {/* Documentation URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Documentation URL
                    <InfoTip text={MODEL_CATEGORY_TOOLTIPS.formDocUrl} align="left" />
                  </label>
                  {drawerMode === 'view' ? (
                    formDocUrl ? (
                      <a
                        href={formDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-mono"
                      >
                        <span>{formDocUrl}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <div className="text-slate-400 text-xs">—</div>
                    )
                  ) : (
                    <input
                      type="url"
                      value={formDocUrl}
                      onChange={(e) => {
                        setFormDocUrl(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="https://docs.manufacturer.example/hardware"
                      className={`w-full h-8 px-2.5 rounded-lg border text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        formErrors.docUrl ? 'border-rose-400' : 'border-slate-200'
                      }`}
                    />
                  )}
                  {formErrors.docUrl && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.docUrl}</p>
                  )}
                </div>

                {/* Supporting Documents (Metadata-only prototype note) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-800">
                      Supporting Documents
                      <InfoTip text={MODEL_CATEGORY_TOOLTIPS.formSupportingDocs} align="left" />
                    </label>
                    {drawerMode !== 'view' && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-[#FA8A63] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" /> Attach files
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {formDocs.length === 0 ? (
                    <div className="p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
                      No documents attached
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {formDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="font-medium text-slate-800 truncate">{doc.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              ({(doc.size / 1024).toFixed(1)} KB)
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-[9px] font-semibold text-slate-600 shrink-0">
                              Metadata only
                            </span>
                          </div>
                          {drawerMode !== 'view' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDoc(doc.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>
                      Prototype stores file name and size metadata locally; binary file bytes are not stored for download.
                    </span>
                  </p>
                </div>

                {/* Model Status */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Model Status
                      <InfoTip text={MODEL_CATEGORY_TOOLTIPS.formStatus} align="left" />
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Active models can be enabled for clients and used in new registrations. Inactive models stay readable in historical records.
                    </p>
                  </div>
                  {drawerMode === 'view' ? (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
                        formStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {formStatus}
                    </span>
                  ) : (
                    <select
                      value={formStatus}
                      onChange={(e) => {
                        setFormStatus(e.target.value as ModelCategoryStatus);
                        setIsDirty(true);
                      }}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#FA8A63] shrink-0"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Sticky Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                {drawerMode === 'view'
                  ? 'Viewing model definition'
                  : isDirty
                  ? 'Unsaved changes pending'
                  : 'Ready'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAttemptCloseDrawer}
                  className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {drawerMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {drawerMode !== 'view' && (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    {drawerMode === 'add' ? 'Save Model Type' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Operations Right-Side Drawer */}
      <ModelCategoryBulkDrawer
        isOpen={isBulkDrawerOpen}
        selectedRecords={selectedRecords}
        referenceMap={referenceMap}
        onClose={() => setIsBulkDrawerOpen(false)}
        onClearSelection={() => setSelectedIds([])}
        onExportSelected={handleExportSelectedDirect}
        onApplyBulkStatus={handleApplyBulkStatus}
        onApplyBulkMetadata={handleApplyBulkMetadata}
      />

      {/* CSV Import Right-Side Drawer */}
      <ModelCategoryImportDrawer
        isOpen={isImportDrawerOpen}
        existingRecords={records}
        onClose={() => setIsImportDrawerOpen(false)}
        onCommitImport={handleCommitCsvImport}
      />

      {/* CSV Export Modal */}
      <ModelCategoryExportModal
        isOpen={isExportModalOpen}
        allRecords={records}
        filteredRecords={filteredRecords}
        selectedRecords={selectedRecords}
        visibleColumns={orderedVisibleColumns.map((c) => ({ key: c.key, label: c.label }))}
        onClose={() => setIsExportModalOpen(false)}
        onExportComplete={(msg) => showToast(msg, 'success')}
      />

      {/* Reset Demo Data Destructive Confirmation Dialog */}
      {showResetDemoConfirm && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-[440px] max-w-full bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Reset Prototype Demo Data?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This <strong>prototype-only</strong> action will replace all local changes, custom edits, imported rows, and deletions in Model Category Master with the original{' '}
              <strong>{INITIAL_MODEL_CATEGORY_RECORDS.length}</strong> sample records. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetDemoConfirm(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetDemoData}
                className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Form Changes Confirmation Dialog */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-[380px] max-w-full bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Discard unsaved changes?</h3>
            <p className="text-xs text-slate-600">
              You have modified this model definition. Closing now will discard your uncommitted edits.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  setIsDrawerOpen(false);
                }}
                className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Change Reset Warning Dialog */}
      {categoryChangePending && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-[430px] max-w-full bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Switch Category to {categoryChangePending}?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Switching from <strong>{formCategory}</strong> to{' '}
              <strong>{categoryChangePending}</strong> will clear entered{' '}
              {formCategory}-specific specifications. Common fields and supporting documents will be preserved.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryChangePending(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Keep {formCategory}
              </button>
              <button
                type="button"
                onClick={() => applyCategoryChange(categoryChangePending)}
                className="h-8 px-3.5 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold cursor-pointer"
              >
                Switch Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal (Row Action + Edit Status Change) */}
      {pendingDeactivation && (
        <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-[450px] max-w-full bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Deactivate &ldquo;{pendingDeactivation.record.typeName}&rdquo;?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Setting <strong>Model Status</strong> to <strong>Inactive</strong> removes this model from new inventory registrations and new client enablement. Existing assets, mappings, and historical records will remain intact and readable.
            </p>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-800">Known Affected Relationships</div>
              {deactivationRefInfo && deactivationRefInfo.isReferenced ? (
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
                  {deactivationRefInfo.summaryLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-slate-500">
                  No active references detected in local browser storage (external or unloaded tenant impact unknown).
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeactivation(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivation}
                className="h-8 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Delete Explanation Modal with Deactivate Offer */}
      {blockedDeleteTarget && (
        <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-[460px] max-w-full bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <Lock className="w-5 h-5 shrink-0" />
              <span>Cannot Delete &ldquo;{blockedDeleteTarget.record.typeName}&rdquo;</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Deleting this model definition is blocked to prevent orphaned inventory or broken mappings. It is currently referenced by:
            </p>
            <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 space-y-1">
              <ul className="list-disc pl-4 space-y-1 text-xs text-rose-900">
                {blockedDeleteTarget.refs.summaryLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-slate-600">
              {blockedDeleteTarget.record.status === 'Active'
                ? 'To prevent new registrations while preserving existing records, deactivate this model instead.'
                : 'This model is already Inactive, so it cannot be used for new registrations while keeping historical records intact.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setBlockedDeleteTarget(null)}
                className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              {blockedDeleteTarget.record.status === 'Active' && (
                <button
                  type="button"
                  onClick={() => {
                    const rec = blockedDeleteTarget.record;
                    setBlockedDeleteTarget(null);
                    setPendingDeactivation({ record: rec, source: 'row' });
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5" />
                  Deactivate Instead
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unreferenced Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(recordToDelete)}
        title="Delete Model Definition?"
        description={
          recordToDelete ? (
            <>
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900 font-semibold">{recordToDelete.typeName}</strong>?
              No downstream Devices, Sensors, SIMs, Company Access rules, or Asset Mappings reference this definition.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Delete Model Type"
        targetChips={
          recordToDelete
            ? [
                {
                  id: 'type',
                  label: recordToDelete.typeName,
                  tone: 'orange',
                },
                {
                  id: 'cat',
                  label: recordToDelete.category,
                  tone:
                    recordToDelete.category === 'Device'
                      ? 'blue'
                      : recordToDelete.category === 'Sensor'
                      ? 'purple'
                      : 'slate',
                },
                ...(recordToDelete.manufacturer || recordToDelete.modelReference
                  ? [
                      {
                        id: 'ref',
                        label: [recordToDelete.manufacturer, recordToDelete.modelReference]
                          .filter(Boolean)
                          .join(' · '),
                        tone: 'slate' as const,
                      },
                    ]
                  : []),
                {
                  id: 'status',
                  label: recordToDelete.status,
                  tone: recordToDelete.status === 'Active' ? 'emerald' : 'slate',
                },
              ]
            : []
        }
        confirmationChips={
          recordToDelete
            ? [
                {
                  id: 'unreferenced-check',
                  label: 'Verified Unreferenced',
                  tone: 'emerald',
                },
                {
                  id: 'catalog-check',
                  label: 'Permanent Catalogue Removal',
                  tone: 'amber',
                },
              ]
            : []
        }
        onCancel={() => setRecordToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* 5-Section Collapsible Right-Side Filter Drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-[130] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
          <div className="w-[520px] max-w-full h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Filter Model Categories</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-[#FA8A63]">
                  {activeAdvancedFilterCount} active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetAdvancedFilters}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  Reset all
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Filter Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Section 1: Basic Classification */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('basic')}
                  className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-bold text-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#FA8A63]" />
                    <span>1. Basic Classification</span>
                  </div>
                  {collapsedSections.basic ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                </button>
                {!collapsedSections.basic && (
                  <div className="p-4 space-y-3.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Category</label>
                      <select
                        value={fCategory}
                        onChange={(e) => {
                          const val = e.target.value as 'All' | MainCategory;
                          setFCategory(val);
                          setCategoryFilter(val);
                        }}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All Categories</option>
                        <option value="Device">Device</option>
                        <option value="Sensor">Sensor</option>
                        <option value="SIM">SIM</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Model Type Name</label>
                      <input
                        type="text"
                        value={fTypeName}
                        onChange={(e) => setFTypeName(e.target.value)}
                        placeholder="e.g. ADAS/DMS Dashcam"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Brand / Manufacturer / Provider</label>
                      <select
                        value={fManufacturer}
                        onChange={(e) => setFManufacturer(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All Brands / Manufacturers</option>
                        {manufacturerFilterOptions.map((mfg) => (
                          <option key={`drawer-mfg-${mfg}`} value={mfg}>{mfg}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Model Name / Number</label>
                      <input
                        type="text"
                        value={fModelReference}
                        onChange={(e) => setFModelReference(e.target.value)}
                        placeholder="e.g. MC202N, FMB140"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Model Status</label>
                      <select
                        value={fStatus}
                        onChange={(e) => {
                          const val = e.target.value as 'All' | ModelCategoryStatus;
                          setFStatus(val);
                          setStatusFilter(val);
                        }}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Device Configuration */}
              <div className={`rounded-xl border overflow-hidden bg-white ${fCategory !== 'All' && fCategory !== 'Device' ? 'opacity-50' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleSection('device')}
                  className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-bold text-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-600" />
                    <span>2. Device Configuration</span>
                    {fCategory !== 'All' && fCategory !== 'Device' && <span className="text-[10px] text-slate-400 font-normal">(N/A for {fCategory})</span>}
                  </div>
                  {collapsedSections.device ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                </button>
                {!collapsedSections.device && (
                  <div className="p-4 space-y-3.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Device Function</label>
                      <select
                        value={fDeviceFunction}
                        onChange={(e) => setFDeviceFunction(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All Device Functions</option>
                        {DEVICE_FUNCTION_OPTIONS.map((fn) => (
                          <option key={`drawer-fn-${fn}`} value={fn}>{fn}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Supported Mode</label>
                      <input
                        type="text"
                        value={fSupportedMode}
                        onChange={(e) => setFSupportedMode(e.target.value)}
                        placeholder="e.g. ADAS, DMS, Cam1"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Supported Protocols</label>
                      <input
                        type="text"
                        value={fSupportedProtocol}
                        onChange={(e) => setFSupportedProtocol(e.target.value)}
                        placeholder="e.g. Metta, Codec8, ONVIF"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Connectivity Types</label>
                      <input
                        type="text"
                        value={fConnectivity}
                        onChange={(e) => setFConnectivity(e.target.value)}
                        placeholder="e.g. Cellular, Wi-Fi, Bluetooth"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">SIM Supported</label>
                      <select
                        value={fSimSupported}
                        onChange={(e) => setFSimSupported(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All SIM Supported Choices</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Maximum Camera Channels</label>
                      <input
                        type="number"
                        value={fMaxCameraChannels}
                        onChange={(e) => setFMaxCameraChannels(e.target.value)}
                        placeholder="e.g. 4"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Sensor Configuration */}
              <div className={`rounded-xl border overflow-hidden bg-white ${fCategory !== 'All' && fCategory !== 'Sensor' ? 'opacity-50' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleSection('sensor')}
                  className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-bold text-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-600" />
                    <span>3. Sensor Configuration</span>
                    {fCategory !== 'All' && fCategory !== 'Sensor' && <span className="text-[10px] text-slate-400 font-normal">(N/A for {fCategory})</span>}
                  </div>
                  {collapsedSections.sensor ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                </button>
                {!collapsedSections.sensor && (
                  <div className="p-4 space-y-3.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Measurement Type</label>
                      <select
                        value={fMeasurementType}
                        onChange={(e) => setFMeasurementType(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All Measurement Types</option>
                        {MEASUREMENT_TYPE_OPTIONS.map((mType) => (
                          <option key={`drawer-mType-${mType}`} value={mType}>{mType}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Measurement Unit</label>
                      <select
                        value={fMeasurementUnit}
                        onChange={(e) => setFMeasurementUnit(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All Measurement Units</option>
                        {MEASUREMENT_UNIT_OPTIONS.map((u) => (
                          <option key={`drawer-unit-${u}`} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Connection Mode</label>
                      <select
                        value={fConnectionMode}
                        onChange={(e) => setFConnectionMode(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All Connection Modes</option>
                        <option value="Gateway-connected">Gateway-connected</option>
                        <option value="Standalone">Standalone</option>
                        <option value="Both">Both</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: SIM Configuration */}
              <div className={`rounded-xl border overflow-hidden bg-white ${fCategory !== 'All' && fCategory !== 'SIM' ? 'opacity-50' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleSection('sim')}
                  className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-bold text-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>4. SIM Configuration</span>
                    {fCategory !== 'All' && fCategory !== 'SIM' && <span className="text-[10px] text-slate-400 font-normal">(N/A for {fCategory})</span>}
                  </div>
                  {collapsedSections.sim ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                </button>
                {!collapsedSections.sim && (
                  <div className="p-4 space-y-3.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">SIM Type</label>
                      <select
                        value={fSimType}
                        onChange={(e) => setFSimType(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All SIM Types</option>
                        {SIM_TYPE_OPTIONS.map((st) => (
                          <option key={`drawer-st-${st}`} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">SIM Form Factor</label>
                      <select
                        value={fSimFormFactor}
                        onChange={(e) => setFSimFormFactor(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All Form Factors</option>
                        {SIM_FORM_FACTOR_OPTIONS.map((ff) => (
                          <option key={`drawer-ff-${ff}`} value={ff}>{ff}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Default Validity (Months)</label>
                      <input
                        type="number"
                        value={fValidityMonths}
                        onChange={(e) => setFValidityMonths(e.target.value)}
                        placeholder="e.g. 24"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Audit & Dates */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection('audit')}
                  className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-bold text-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>5. Audit & Dates</span>
                  </div>
                  {collapsedSections.audit ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                </button>
                {!collapsedSections.audit && (
                  <div className="p-4 space-y-3.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Created On (Range)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">From</span>
                          <input
                            type="date"
                            value={fCreatedAtFrom}
                            onChange={(e) => setFCreatedAtFrom(e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-[11px] focus:outline-none focus:border-[#FA8A63]"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">To</span>
                          <input
                            type="date"
                            value={fCreatedAtTo}
                            onChange={(e) => setFCreatedAtTo(e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-[11px] focus:outline-none focus:border-[#FA8A63]"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Updated On (Range)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">From</span>
                          <input
                            type="date"
                            value={fUpdatedAtFrom}
                            onChange={(e) => setFUpdatedAtFrom(e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-[11px] focus:outline-none focus:border-[#FA8A63]"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">To</span>
                          <input
                            type="date"
                            value={fUpdatedAtTo}
                            onChange={(e) => setFUpdatedAtTo(e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-[11px] focus:outline-none focus:border-[#FA8A63]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Drawer Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleResetAdvancedFilters}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Reset All ({activeAdvancedFilterCount})
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Apply Filters ({filteredRecords.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
