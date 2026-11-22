import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Filter,
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
  Layers,
  Cpu,
  Radio,
  Smartphone,
  RotateCcw,
  RefreshCw,
  Info,
  Check,
  FileDown,
  Power,
} from 'lucide-react';
import { RowActionMenu } from './common/RowActionMenu';
import { DeleteConfirmationModal } from './common/DeleteConfirmationModal';
import {
  MainCategory,
  ModelCategoryRecord,
  ModelCategoryStatus,
  DeviceFunction,
  DeviceConnectivity,
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
} from '../types/modelCategoryMaster';
import { loadCanonicalVendors, VendorRecord } from '../data/vendorsSeed';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';

export const MODEL_CATEGORY_COLUMNS = [
  { key: 'typeName', label: 'Type Name', category: 'BASIC ATTRIBUTES', required: true },
  { key: 'category', label: 'Category', category: 'BASIC ATTRIBUTES', required: true },
  { key: 'manufacturer', label: 'Vendor / Manufacturer', category: 'ORIGIN & HARDWARE' },
  { key: 'modelReference', label: 'Model / Reference', category: 'ORIGIN & HARDWARE' },
  { key: 'identifierType', label: 'Identifier Type', category: 'COMMUNICATION' },
  { key: 'categoryDetail', label: 'Category Detail', category: 'COMMUNICATION' },
  { key: 'supportingDocs', label: 'Supporting Docs', category: 'DOCUMENTATION' },
  { key: 'status', label: 'Status', category: 'GOVERNANCE' },
  { key: 'updatedAt', label: 'Updated On', category: 'GOVERNANCE' },
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

export const ModelCategoryMasterContent: React.FC = () => {
  const [records, setRecords] = useState<ModelCategoryRecord[]>(() => loadModelCategoryStore());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | MainCategory>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ModelCategoryStatus>('All');

  // Sorting
  const [sortKey, setSortKey] = useState<keyof ModelCategoryRecord | ''>('');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  // Column catalogue visibility
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(DEFAULT_VISIBLE_MODEL_COLUMNS);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(10);

  // Drawer & modal states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Confirm Inactivate Modal
  const [inactivatingRecord, setInactivatingRecord] = useState<ModelCategoryRecord | null>(null);

  // Unsaved changes confirm dialog
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Form State
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
  const [formDescription, setFormDescription] = useState('');
  const [formDocUrl, setFormDocUrl] = useState('');
  const [formStatus, setFormStatus] = useState<ModelCategoryStatus>('Active');
  const [formDocs, setFormDocs] = useState<SupportingDocument[]>([]);

  // Vendors from Vendor Master & Custom Lists
  const [vendors, setVendors] = useState<VendorRecord[]>(() => loadCanonicalVendors());
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

  const [formMeasurementType, setFormMeasurementType] = useState<SensorMeasurementType | ''>('');
  const [formMeasurementUnit, setFormMeasurementUnit] = useState<SensorMeasurementUnit | ''>('');
  const [formConnectionMode, setFormConnectionMode] = useState<SensorConnectionMode>('Unknown');

  const [formSimType, setFormSimType] = useState<SimTypeChoice | ''>('');
  const [formSimFormFactor, setFormSimFormFactor] = useState<SimFormFactorChoice | ''>('Physical SIM');
  const [formValidityMonths, setFormValidityMonths] = useState<string>('');

  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [categoryChangePending, setCategoryChangePending] = useState<MainCategory | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const identifierDropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const connectivityDropdownRef = useRef<HTMLDivElement>(null);
  const protocolDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!identifierMenuOpen && !modeMenuOpen && !protocolMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        identifierMenuOpen &&
        identifierDropdownRef.current &&
        !identifierDropdownRef.current.contains(e.target as Node)
      ) {
        setIdentifierMenuOpen(false);
      }
      if (
        modeMenuOpen &&
        modeDropdownRef.current &&
        !modeDropdownRef.current.contains(e.target as Node)
      ) {
        setModeMenuOpen(false);
      }
      if (
        protocolMenuOpen &&
        protocolDropdownRef.current &&
        !protocolDropdownRef.current.contains(e.target as Node)
      ) {
        setProtocolMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [identifierMenuOpen, modeMenuOpen, protocolMenuOpen]);

  // Sync vendors when Vendor Master updates
  useEffect(() => {
    const syncVendors = () => setVendors(loadCanonicalVendors());
    window.addEventListener('fleetrobo:vendors-updated', syncVendors);
    window.addEventListener('storage', syncVendors);
    return () => {
      window.removeEventListener('fleetrobo:vendors-updated', syncVendors);
      window.removeEventListener('storage', syncVendors);
    };
  }, []);

  const vendorNamesFromMaster = useMemo(() => {
    const unique = Array.from(
      new Set(vendors.map((v) => v.name?.trim()).filter((n): n is string => Boolean(n)))
    );
    return unique.sort((a, b) => a.localeCompare(b));
  }, [vendors]);

  const knownMakersForCategory = useMemo(() => {
    const typeTopMakers = getTopIndiaManufacturersForType(formCategory, formTypeName);
    const categoryExtras = formCategory ? KNOWN_MANUFACTURERS_PROVIDERS[formCategory] || [] : [];
    const combined = Array.from(new Set([...typeTopMakers, ...categoryExtras]));
    const vendorLower = new Set(vendorNamesFromMaster.map((n) => n.toLowerCase()));
    return combined.filter((m) => !vendorLower.has(m.toLowerCase()));
  }, [formCategory, formTypeName, vendorNamesFromMaster]);

  const customMakersForDropdown = useMemo(() => {
    const standardLower = new Set(
      [...knownMakersForCategory, ...vendorNamesFromMaster].map((n) => n.toLowerCase())
    );
    const fromRecords = records
      .map((r) => r.manufacturer?.trim())
      .filter((m): m is string => Boolean(m));
    const merged = Array.from(new Set([...customManufacturers, ...fromRecords]));
    return merged.filter((m) => !standardLower.has(m.toLowerCase()));
  }, [customManufacturers, records, knownMakersForCategory, vendorNamesFromMaster]);

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

  // Persist records
  useEffect(() => {
    saveModelCategoryStore(records);
  }, [records]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Helper to get Category Detail display
  const getCategoryDetail = (rec: ModelCategoryRecord): string => {
    if (rec.category === 'Device') {
      const modeSummary =
        rec.supportedModes && rec.supportedModes.length > 0
          ? rec.supportedModes.join(', ')
          : rec.deviceMode;
      const parts = [rec.deviceFunction, modeSummary].filter(Boolean);
      return parts.length > 0 ? parts.join(' · ') : '—';
    }
    if (rec.category === 'Sensor') {
      const parts = [rec.measurementType, rec.measurementUnit].filter(Boolean);
      return parts.length > 0 ? parts.join(' · ') : '—';
    }
    if (rec.category === 'SIM') {
      const parts = [rec.simType, rec.simFormFactor].filter(Boolean);
      return parts.length > 0 ? parts.join(' · ') : '—';
    }
    return '—';
  };

  // Filtered & sorted records
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = records.filter((rec) => {
      if (categoryFilter !== 'All' && rec.category !== categoryFilter) return false;
      if (statusFilter !== 'All' && rec.status !== statusFilter) return false;
      if (q) {
        const matchTypeName = rec.typeName.toLowerCase().includes(q);
        const matchMfg = rec.manufacturer.toLowerCase().includes(q);
        const matchModel = rec.modelReference.toLowerCase().includes(q);
        const matchIdentifier = getRecordIdentifierTypes(rec).some((id) =>
          id.toLowerCase().includes(q)
        );
        if (!matchTypeName && !matchMfg && !matchModel && !matchIdentifier) return false;
      }
      return true;
    });
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let valA = String(a[sortKey] || '').toLowerCase();
      let valB = String(b[sortKey] || '').toLowerCase();
      if (valA < valB) return -1 * sortDir;
      if (valA > valB) return 1 * sortDir;
      return 0;
    });
  }, [records, searchQuery, categoryFilter, statusFilter, sortKey, sortDir]);

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

  // Reset to demo data
  const handleResetDemoData = () => {
    setRecords(INITIAL_MODEL_CATEGORY_RECORDS);
    saveModelCategoryStore(INITIAL_MODEL_CATEGORY_RECORDS);
    setSearchQuery('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setPage(1);
    showToast('Reset Model Category Master with initial 12 sample records', 'info');
  };

  // Export current list to CSV
  const handleExportCSV = () => {
    const headers = [
      'Type Name',
      'Category',
      'Vendor / Manufacturer',
      'Model / Reference',
      'Identifier Type',
      'Category Detail',
      'Status',
      'Updated At',
    ];
    const rows = filteredRecords.map((r) => [
      `"${(r.typeName || '').replace(/"/g, '""')}"`,
      `"${(r.category || '').replace(/"/g, '""')}"`,
      `"${(r.manufacturer || '').replace(/"/g, '""')}"`,
      `"${(r.modelReference || '').replace(/"/g, '""')}"`,
      `"${getRecordIdentifierTypes(r).join(', ').replace(/"/g, '""')}"`,
      `"${getCategoryDetail(r).replace(/"/g, '""')}"`,
      `"${r.status || 'Active'}"`,
      `"${r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `model_category_master_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredRecords.length} model types to CSV`, 'success');
  };

  // Open Drawer in Add mode
  const handleOpenAdd = () => {
    setVendors(loadCanonicalVendors());
    setCustomDeviceModes(loadCustomDeviceModes());
    setCustomDeviceFunctions(loadCustomDeviceFunctions());
    setCustomManufacturers(loadCustomManufacturers());
    setCustomIdentifierTypes(loadCustomIdentifierTypes());
    setCustomPlatformProtocols(loadCustomPlatformProtocols());

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
    const latestVendors = loadCanonicalVendors();
    setVendors(latestVendors);
    setCustomDeviceModes(loadCustomDeviceModes());
    const latestCustomFunctions = loadCustomDeviceFunctions();
    setCustomDeviceFunctions(latestCustomFunctions);
    const latestCustomMakers = loadCustomManufacturers();
    setCustomManufacturers(latestCustomMakers);
    const latestCustomIdentifiers = loadCustomIdentifierTypes();
    setCustomIdentifierTypes(latestCustomIdentifiers);
    setCustomPlatformProtocols(loadCustomPlatformProtocols());


    setDrawerMode(mode);
    setEditingId(rec.id);
    setIsDirty(false);
    setFormErrors({});

    setFormCategory(rec.category);
    setFormTypeName(rec.typeName);

    const vendorNames = latestVendors.map((v) => v.name?.trim()).filter(Boolean);
    const knownList = Array.from(
      new Set([
        ...getTopIndiaManufacturersForType(rec.category, rec.typeName),
        ...(KNOWN_MANUFACTURERS_PROVIDERS[rec.category] || []),
        ...latestCustomMakers,
      ])
    );
    if (vendorNames.includes(rec.manufacturer) || knownList.includes(rec.manufacturer)) {
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

    setFormModelReference(rec.modelReference);
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
    setFormDescription(rec.description);
    setFormDocUrl(rec.documentationUrl);
    setFormStatus(rec.status);
    setFormDocs(rec.supportingDocs || []);

    // Category specifics
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

    setFormMeasurementType(rec.measurementType || '');
    setFormMeasurementUnit(rec.measurementUnit || '');
    setFormConnectionMode(rec.connectionMode || 'Unknown');

    setFormSimType(rec.simType || '');
    setFormSimFormFactor(rec.simFormFactor || 'Physical SIM');
    setFormValidityMonths(rec.validityMonths ? String(rec.validityMonths) : '');

    setIsDrawerOpen(true);
  };

  // Category switch confirmation if Sensor/SIM values exist
  const handleCategoryChange = (newCat: MainCategory) => {
    if (formCategory && formCategory !== newCat) {
      const hasCategoryOnlyValues =
        (formCategory === 'Sensor' && (formMeasurementType || formMeasurementUnit)) ||
        (formCategory === 'SIM' && formSimType);

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

    // Set default Identifier Type for that category
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
    }

    setFormMeasurementType('');
    setFormMeasurementUnit('');
    setFormConnectionMode('Unknown');

    setFormSimType('');
    setFormSimFormFactor('Physical SIM');
    setFormValidityMonths('');

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
      errs.category = 'Category is required (Device, Sensor or SIM).';
    }
    if (!formTypeName.trim()) {
      errs.typeName = 'Type Name is required (free-text description of this type).';
    }

    const resolvedManufacturer =
      formManufacturer === 'Other' ? formCustomManufacturer.trim() : formManufacturer;

    if (!resolvedManufacturer) {
      errs.manufacturer =
        formCategory === 'SIM'
          ? 'Vendor / Operator / Provider name is required.'
          : 'Vendor / Manufacturer name is required.';
    }

    if (formIdentifierTypes.length === 0) {
      errs.identifierType = 'Select at least one Identifier Type.';
    }

    if (formDocUrl.trim()) {
      try {
        new URL(formDocUrl.trim());
      } catch {
        errs.docUrl = 'Documentation URL must be a valid URL (http/https).';
      }
    }

    const resolvedDeviceFunction =
      formCategory === 'Device'
        ? formDeviceFunction === 'Other'
          ? formCustomDeviceFunction.trim()
          : formDeviceFunction
        : '';

    // Dynamic validations
    if (formCategory === 'Device') {
      if (formDeviceFunction === 'Other' && !resolvedDeviceFunction) {
        errs.deviceFunction = 'Please enter a custom Device Function name.';
      } else if (!resolvedDeviceFunction) {
        errs.deviceFunction = 'Device Function is required for Device types.';
      }
    }
    if (formCategory === 'Sensor') {
      if (!formMeasurementType) {
        errs.measurementType = 'Measurement Type is required for Sensor types.';
      }
    } else if (formCategory === 'SIM') {
      if (!formSimType) {
        errs.simType = 'SIM Type is required for SIM definitions.';
      }
      if (formValidityMonths.trim()) {
        const num = parseInt(formValidityMonths.trim(), 10);
        if (isNaN(num) || num <= 0) {
          errs.validityMonths = 'Validity must be a positive whole number of months.';
        }
      }
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast('Please fix the highlighted required fields', 'error');
      return;
    }

    const customOnlyModes = formDeviceModes.filter((m) => !deviceModePresets.includes(m));
    if (customOnlyModes.length > 0) {
      let updatedModes = customDeviceModes;
      customOnlyModes.forEach((m) => {
        updatedModes = saveCustomDeviceMode(m);
      });
      setCustomDeviceModes(updatedModes);
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

    // Check potential duplicates: Category + TypeName + Manufacturer + ModelReference
    const normalizedName = formTypeName.trim().toLowerCase();
    const normalizedMfg = resolvedManufacturer.toLowerCase();
    const normalizedModel = formModelReference.trim().toLowerCase();

    const isDuplicate = records.some(
      (r) =>
        r.id !== editingId &&
        r.category === formCategory &&
        r.typeName.trim().toLowerCase() === normalizedName &&
        r.manufacturer.trim().toLowerCase() === normalizedMfg &&
        r.modelReference.trim().toLowerCase() === normalizedModel
    );

    if (isDuplicate) {
      showToast(
        `Warning: A type with same Category, Type Name, Manufacturer and Model (${formModelReference || '—'}) already exists.`,
        'error'
      );
      errs.duplicate = 'Duplicate combination of Category, Type Name, Manufacturer and Model.';
      setFormErrors(errs);
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
          formCategory === 'Device' && formDeviceModes.length > 0 ? formDeviceModes : undefined,
        supportedProtocols:
          formCategory === 'Device' && formSupportedProtocols.length > 0
            ? formSupportedProtocols
            : undefined,


        measurementType: formCategory === 'Sensor' ? (formMeasurementType as SensorMeasurementType) : undefined,
        measurementUnit: formCategory === 'Sensor' ? (formMeasurementUnit as SensorMeasurementUnit) : undefined,
        connectionMode: formCategory === 'Sensor' ? formConnectionMode : undefined,

        simType: formCategory === 'SIM' ? (formSimType as SimTypeChoice) : undefined,
        simFormFactor: formCategory === 'SIM' ? (formSimFormFactor as SimFormFactorChoice) : undefined,
        validityMonths:
          formCategory === 'SIM' && formValidityMonths.trim()
            ? parseInt(formValidityMonths.trim(), 10)
            : null,
      };

      setRecords((prev) => [newRecord, ...prev]);
      setSortKey('');
      setPage(1);
      showToast(`Created new type definition "${newRecord.typeName}"`, 'success');
    } else if (drawerMode === 'edit' && editingId) {
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== editingId) return r;
          return {
            ...r,
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
              formCategory === 'Device' && formDeviceModes.length > 0 ? formDeviceModes : undefined,
            supportedProtocols:
              formCategory === 'Device' && formSupportedProtocols.length > 0
                ? formSupportedProtocols
                : undefined,


            measurementType: formCategory === 'Sensor' ? (formMeasurementType as SensorMeasurementType) : undefined,
            measurementUnit: formCategory === 'Sensor' ? (formMeasurementUnit as SensorMeasurementUnit) : undefined,
            connectionMode: formCategory === 'Sensor' ? formConnectionMode : undefined,

            simType: formCategory === 'SIM' ? (formSimType as SimTypeChoice) : undefined,
            simFormFactor: formCategory === 'SIM' ? (formSimFormFactor as SimFormFactorChoice) : undefined,
            validityMonths:
              formCategory === 'SIM' && formValidityMonths.trim()
                ? parseInt(formValidityMonths.trim(), 10)
                : null,
          };
        })
      );
      showToast(`Updated type definition "${formTypeName.trim()}"`, 'success');
    }

    setIsDrawerOpen(false);
  };

  // Toggle status with confirmation when inactivating
  const handleToggleStatus = (rec: ModelCategoryRecord) => {
    if (rec.status === 'Active') {
      setInactivatingRecord(rec);
    } else {
      // Direct activate
      setRecords((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, status: 'Active', updatedAt: new Date().toISOString() } : r))
      );
      showToast(`Activated type "${rec.typeName}" for new client registrations`, 'success');
    }
  };

  const confirmInactivate = () => {
    if (!inactivatingRecord) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === inactivatingRecord.id
          ? { ...r, status: 'Inactive', updatedAt: new Date().toISOString() }
          : r
      )
    );
    showToast(
      `Inactivated "${inactivatingRecord.typeName}". Existing records preserved; hidden from new registrations.`,
      'info'
    );
    setInactivatingRecord(null);
  };

  const [recordToDelete, setRecordToDelete] = useState<ModelCategoryRecord | null>(null);

  const handleConfirmDelete = () => {
    if (!recordToDelete) return;
    const idToDelete = recordToDelete.id;
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== idToDelete);
      saveModelCategoryStore(next);
      return next;
    });
    showToast(`Deleted type "${recordToDelete.typeName}" successfully`, 'success');
    setRecordToDelete(null);
  };

  // Supporting documents file upload simulation
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
    showToast(`Attached ${newFiles.length} supporting document(s)`, 'info');
  };

  const handleRemoveDoc = (id: string) => {
    setFormDocs((prev) => prev.filter((d) => d.id !== id));
    setIsDirty(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden text-slate-900 select-none">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-16 right-6 z-[130] flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-medium transition-all ${
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
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Main Page Header (Matches Drivers, Vehicles & Vendors) */}
      <div className="px-6 pt-5 pb-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Model Category Master</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-[#FA8A63]">
                {records.length} total
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Create and manage the catalog of Device, Sensor, and SIM model types, protocols, and identifier standards.
            </p>
          </div>

          {/* Quick Header CTA Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDemoData}
              title="Reset sample types for MC202N, MC202L, GPS, Sensors, and SIMs"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw size={13} className="text-slate-500" />
              <span>Reset demo types</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              title="Export Model Types to CSV"
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
              <span>Add model type</span>
            </button>
          </div>
        </div>

        {/* 2. Horizontal Category Tabs (All types, Devices, Sensors, SIMs) */}
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
                    setCategoryFilter(tab.id as any);
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

      {/* 3. Directory Inner Toolbar (Matches Drivers, Vehicles & Vendors) */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
        {/* Left Toolbar Group: Directory label, Search, Status Filter & Column Catalogue */}
        <div className="flex items-center gap-2.5 flex-1 max-w-3xl min-w-0">
          <span className="text-sm font-bold text-slate-900 shrink-0">Directory</span>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search Model Types (name, vendor, model, identifier)..."
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

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="h-[31px] px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:outline-none focus:border-[#FA8A63] cursor-pointer hover:border-slate-300 shadow-2xs"
            >
              <option value="All">All statuses ({statusCounts.all})</option>
              <option value="Active">Active ({statusCounts.active})</option>
              <option value="Inactive">Inactive ({statusCounts.inactive})</option>
            </select>
          </div>

          {/* Column Catalogue Popover */}
          <ColumnCataloguePopover
            columns={MODEL_CATEGORY_COLUMNS}
            visibleKeys={visibleColumnKeys}
            onChangeVisibleKeys={setVisibleColumnKeys}
            defaultKeys={DEFAULT_VISIBLE_MODEL_COLUMNS}
            defaultPinnedKeys={['typeName']}
            onToast={(msg) => showToast(msg, 'info')}
          />

          {(searchQuery || categoryFilter !== 'All' || statusFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('All');
                setStatusFilter('All');
                setPage(1);
              }}
              className="text-xs text-[#FA8A63] font-semibold hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Right Toolbar Group: Count & Refresh */}
        <div className="flex items-center gap-2.5 text-xs text-slate-500 shrink-0">
          <span>
            Showing <strong className="text-slate-900 font-semibold">{filteredRecords.length}</strong> of {records.length} types
          </span>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('All');
              setStatusFilter('All');
              setPage(1);
              showToast('Directory refreshed', 'info');
            }}
            title="Refresh list"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer transition-colors"
          >
            <RefreshCw size={13} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Master Data Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10 select-none">
                <tr>
                  <th
                    onClick={() => {
                      if (sortKey === 'typeName') setSortDir((prev) => (prev === 1 ? -1 : 1));
                      else {
                        setSortKey('typeName');
                        setSortDir(1);
                      }
                    }}
                    className="px-4 py-3 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap min-w-[170px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Type Name</span>
                      <InfoTip text={MODEL_CATEGORY_TOOLTIPS.typeName} align="left" />
                      {sortKey === 'typeName' ? (
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

                  {visibleColumnKeys.includes('category') && (
                    <th
                      onClick={() => {
                        if (sortKey === 'category') setSortDir((prev) => (prev === 1 ? -1 : 1));
                        else {
                          setSortKey('category');
                          setSortDir(1);
                        }
                      }}
                      className="px-4 py-3 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap min-w-[120px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>Category</span>
                        <InfoTip text={MODEL_CATEGORY_TOOLTIPS.category} align="center" />
                        {sortKey === 'category' ? (
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
                  )}

                  {visibleColumnKeys.includes('manufacturer') && (
                    <th
                      onClick={() => {
                        if (sortKey === 'manufacturer') setSortDir((prev) => (prev === 1 ? -1 : 1));
                        else {
                          setSortKey('manufacturer');
                          setSortDir(1);
                        }
                      }}
                      className="px-4 py-3 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap min-w-[170px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>Vendor / Manufacturer</span>
                        <InfoTip text={MODEL_CATEGORY_TOOLTIPS.manufacturerProvider} align="center" />
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
                  )}

                  {visibleColumnKeys.includes('modelReference') && (
                    <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[130px]">
                      <div className="flex items-center gap-1">
                        <span>Model / Reference</span>
                        <InfoTip text={MODEL_CATEGORY_TOOLTIPS.modelReference} align="center" />
                      </div>
                    </th>
                  )}

                  {visibleColumnKeys.includes('identifierType') && (
                    <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[140px]">
                      <div className="flex items-center gap-1">
                        <span>Identifier Type</span>
                        <InfoTip text={MODEL_CATEGORY_TOOLTIPS.identifierType} align="center" />
                      </div>
                    </th>
                  )}

                  {visibleColumnKeys.includes('categoryDetail') && (
                    <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[200px]">
                      <div className="flex items-center gap-1">
                        <span>Category Detail</span>
                        <InfoTip text={MODEL_CATEGORY_TOOLTIPS.categoryDetail} align="center" />
                      </div>
                    </th>
                  )}

                  {visibleColumnKeys.includes('supportingDocs') && (
                    <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[130px]">
                      <div className="flex items-center gap-1">
                        <span>Supporting Docs</span>
                        <InfoTip text={MODEL_CATEGORY_TOOLTIPS.supportingDocs} align="center" />
                      </div>
                    </th>
                  )}

                  {visibleColumnKeys.includes('status') && (
                    <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[110px]">
                      <div className="flex items-center gap-1">
                        <span>Status</span>
                        <InfoTip text={MODEL_CATEGORY_TOOLTIPS.status} align="center" />
                      </div>
                    </th>
                  )}

                  {visibleColumnKeys.includes('updatedAt') && (
                    <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[110px]">
                      <div className="flex items-center gap-1">
                        <span>Updated On</span>
                        <InfoTip text={MODEL_CATEGORY_TOOLTIPS.updatedOn} align="center" />
                      </div>
                    </th>
                  )}

                  <th className="px-3 py-3 text-right font-semibold text-slate-700 sticky right-0 bg-slate-50/95 border-l border-slate-200/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap w-[76px] z-10">
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
                  <td colSpan={visibleColumnKeys.length + 1} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="text-sm font-semibold text-slate-700">No types found</div>
                      <p className="text-xs text-slate-500">
                        No types matched your current search and category filters. Click "+ Add Type" to create one.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => {
                  const isMettaX = rec.manufacturer === 'MettaX';
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleOpenViewOrEdit(rec, 'view')}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="hover:text-[#FA8A63]">{rec.typeName}</span>
                          {isMettaX && rec.modelReference && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold">
                              {rec.modelReference}
                            </span>
                          )}
                        </div>
                      </td>

                      {visibleColumnKeys.includes('category') && (
                        <td className="px-4 py-3">
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
                        </td>
                      )}

                      {visibleColumnKeys.includes('manufacturer') && (
                        <td className="px-4 py-3 text-slate-700">
                          {rec.manufacturer ? (
                            <span className="font-medium">{rec.manufacturer}</span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                      )}

                      {visibleColumnKeys.includes('modelReference') && (
                        <td className="px-4 py-3 text-slate-700 font-mono text-[11px]">
                          {rec.modelReference ? (
                            <span className="font-semibold">{rec.modelReference}</span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                      )}

                      {visibleColumnKeys.includes('identifierType') && (
                        <td className="px-4 py-3 text-slate-700">
                          <div className="flex flex-wrap gap-1">
                            {getRecordIdentifierTypes(rec).length > 0 ? (
                              getRecordIdentifierTypes(rec).map((idType) => (
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
                        </td>
                      )}

                      {visibleColumnKeys.includes('categoryDetail') && (
                        <td className="px-4 py-3 text-slate-700">
                          <span className="font-medium text-slate-800">{getCategoryDetail(rec)}</span>
                        </td>
                      )}

                      {visibleColumnKeys.includes('supportingDocs') && (
                        <td className="px-4 py-3 text-slate-600">
                          {rec.supportingDocs.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                              <FileText className="w-3 h-3" />
                              <span>{rec.supportingDocs.length} doc(s)</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}

                      {visibleColumnKeys.includes('status') && (
                        <td className="px-4 py-3">
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
                        </td>
                      )}

                      {visibleColumnKeys.includes('updatedAt') && (
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          {rec.updatedAt ? new Date(rec.updatedAt).toLocaleDateString() : '—'}
                        </td>
                      )}

                      <td
                        className="px-3 py-3 text-right sticky right-0 bg-white/95 group-hover:bg-slate-50/95 border-l border-slate-100 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end">
                          <RowActionMenu
                            ariaLabel={`Actions for ${rec.typeName}`}
                            items={[
                              {
                                id: 'view',
                                label: 'View details',
                                icon: <Eye className="w-3.5 h-3.5 text-slate-400" />,
                                onClick: () => handleOpenViewOrEdit(rec, 'view'),
                              },
                              {
                                id: 'edit',
                                label: 'Edit type definition',
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
                                label: 'Delete type',
                                icon: <Trash2 className="w-3.5 h-3.5" />,
                                tone: 'danger',
                                dividerBefore: true,
                                onClick: () => setRecordToDelete(rec),
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
              className="p-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT-SIDE ADD / EDIT / VIEW DRAWER (~560px)
         ========================================================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
          <div className="w-[580px] max-w-full h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
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
                    ? 'Read-only model specification and hardware identifier format'
                    : 'Define a reusable Device, Sensor, or SIM type for client asset registrations.'}
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
              {/* Common Section 1: Top-Level Classification */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    1. Primary Classification
                  </span>
                  <span className="text-[10px] text-slate-400">Fixed categories only</span>
                </div>

                {/* Category Radio / Single select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Category <span className="text-rose-500">*</span>
                    <InfoTip text={MODEL_CATEGORY_TOOLTIPS.formCategory} align="left" />
                  </label>
                  {drawerMode === 'view' ? (
                    <div className="font-semibold text-slate-900 text-xs">{formCategory || '—'}</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5">
                      {(['Device', 'Sensor', 'SIM'] as MainCategory[]).map((cat) => {
                        const isSelected = formCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleCategoryChange(cat)}
                            className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#FA8A63] bg-[#FFF3EE] text-[#B85324] ring-1 ring-[#FA8A63]'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
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
                  )}
                  {formErrors.category && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.category}</p>
                  )}
                </div>

                {/* Free-text Type Name with Quick-Pick Device Categories including Face Terminal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Type Name <span className="text-rose-500">*</span>
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

                {/* Vendor / Manufacturer & Mandatory Model / Reference */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Brand{' '}
                      <span className="text-rose-500">*</span>
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
                          <option value="">-- Select Vendor or Manufacturer --</option>
                          {knownMakersForCategory.length > 0 && (
                            <optgroup
                              label={
                                formCategory === 'SIM'
                                  ? 'Top India Telecom Operators / Providers'
                                  : formTypeName.trim()
                                  ? `Top India Manufacturers (${formTypeName.trim()})`
                                  : 'Top India Hardware Manufacturers'
                              }
                            >
                              {knownMakersForCategory.map((mfg) => (
                                <option key={`maker-${mfg}`} value={mfg}>
                                  {mfg}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {vendorNamesFromMaster.length > 0 && (
                            <optgroup label="Vendors (Vendor Master)">
                              {vendorNamesFromMaster.map((vName) => (
                                <option key={`vendor-${vName}`} value={vName}>
                                  {vName}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {customMakersForDropdown.length > 0 && (
                            <optgroup label="Custom Added Vendors / Manufacturers">
                              {customMakersForDropdown.map((cMfg) => (
                                <option key={`custom-maker-${cMfg}`} value={cMfg}>
                                  {cMfg}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <option value="Other">+ Custom / Other Vendor</option>
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
                              placeholder="Enter vendor / manufacturer name..."
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
                      Model / Reference (Optional)
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
                        placeholder="e.g. MC202N, FMB140... (Optional)"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                      />
                    )}
                    {formErrors.modelReference && (
                      <p className="text-[11px] text-rose-600 mt-1">{formErrors.modelReference}</p>
                    )}
                  </div>
                </div>

                {/* Identifier Type (Multi-select) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Identifier Type (Multi-select) <span className="text-rose-500">*</span>
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
                            <span className="text-slate-400">-- Choose Identifier Formats --</span>
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
                                        Custom Added Identifier Types
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
                                      <span>+ Add custom identifier "{identifierSearch.trim()}"</span>
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
                                      setFormErrors((prev) => {
                                        if (!prev.identifierType) return prev;
                                        const next = { ...prev };
                                        delete next.identifierType;
                                        return next;
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="Enter custom format (e.g. Asset Tag, VIN, SIM No)..."
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
                                    setFormErrors((prev) => {
                                      if (!prev.identifierType) return prev;
                                      const next = { ...prev };
                                      delete next.identifierType;
                                      return next;
                                    });
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

              {/* Section 2: Category-Specific Attributes */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    2. {formCategory ? `${formCategory} Specific Attributes` : 'Category Specific Attributes'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formCategory
                      ? `${formCategory} attributes`
                      : 'Select a category above'}
                  </span>
                </div>

                {!formCategory && (
                  <div className="py-3 text-center text-xs text-slate-500">
                    Select a primary category above (<span className="font-semibold text-slate-700">Device</span>,{' '}
                    <span className="font-semibold text-slate-700">Sensor</span>, or{' '}
                    <span className="font-semibold text-slate-700">SIM</span>) to configure specific attributes.
                  </div>
                )}

                {/* Device Specific Fields: Device Function, Mode & Protocols */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1">
                        Device Function{' '}
                        {formCategory === 'Device' && <span className="text-rose-500">*</span>}
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
                              const nextFn = e.target.value as DeviceFunction;
                              setFormDeviceFunction(nextFn);
                              setIsDirty(true);
                            }}
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                          >
                            <option value="">-- Select Main Device Purpose --</option>
                            {DEVICE_FUNCTION_OPTIONS.map((fn) => (
                              <option key={fn} value={fn}>
                                {fn}
                              </option>
                            ))}
                            {customFunctionsForDropdown.length > 0 && (
                              <optgroup label="Custom Added Device Functions">
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

                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1">
                        Mode (Multi-select)
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
                                <span className="text-slate-400">
                                  -- Select Modes --
                                </span>
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
                                      <span>+ Add custom mode "{modeSearch.trim()}"</span>
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
                                          setCustomDeviceModes(saveCustomDeviceMode(customModeName));
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
                                      placeholder="Enter custom mode name..."
                                      className="flex-1 h-7 px-2 rounded border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                                    />
                                    <button
                                      type="button"
                                      disabled={!formCustomModeText.trim()}
                                      onClick={() => {
                                        const customModeName = formCustomModeText.trim();
                                        if (!customModeName) return;
                                        setCustomDeviceModes(saveCustomDeviceMode(customModeName));
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
                      {formErrors.deviceMode && (
                        <p className="text-[11px] text-rose-600 mt-1">{formErrors.deviceMode}</p>
                      )}
                    </div>
                  </div>



                  {/* Supported Platform Protocols */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Supported Platform Protocols (Optional)
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
                                -- Select Platform Protocols (Metta, BSL, Streamax API, ISUP, ONVIF, Codec8...) --
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
                                  placeholder="Search or type custom protocol (Metta, BSL, ISUP, ONVIF...)"
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
                                    <span>Add custom protocol "{protocolSearch.trim()}"</span>
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
                                          prev.includes(customProto) ? prev : [...prev, customProto]
                                        );
                                        setFormCustomProtocolText('');
                                        setShowCustomProtocolInput(false);
                                        setIsDirty(true);
                                      }
                                    }}
                                    placeholder="Enter custom platform protocol..."
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
                                        prev.includes(customProto) ? prev : [...prev, customProto]
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

                {formCategory === 'Sensor' && (
                  /* Sensor Extra Fields */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          Measurement Type <span className="text-rose-500">*</span>
                          <InfoTip text={MODEL_CATEGORY_TOOLTIPS.measurementType} align="left" />
                        </label>
                        {drawerMode === 'view' ? (
                          <div className="font-medium text-slate-900 text-xs">{formMeasurementType || '—'}</div>
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
                          <p className="text-[11px] text-rose-600 mt-1">{formErrors.measurementType}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          Measurement Unit
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
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                          >
                            <option value="">-- Choose Unit --</option>
                            {MEASUREMENT_UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {formCategory === 'SIM' && (
                  /* SIM Extra Fields */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          SIM Type <span className="text-rose-500">*</span>
                          <InfoTip text={MODEL_CATEGORY_TOOLTIPS.simType} align="left" />
                        </label>
                        {drawerMode === 'view' ? (
                          <div className="font-medium text-slate-900 text-xs">{formSimType || '—'}</div>
                        ) : (
                          <select
                            value={formSimType}
                            onChange={(e) => {
                              setFormSimType(e.target.value as SimTypeChoice);
                              setIsDirty(true);
                            }}
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                          >
                            <option value="">-- Choose SIM Classification --</option>
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
                          type="number"
                          min="1"
                          value={formValidityMonths}
                          onChange={(e) => {
                            setFormValidityMonths(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="e.g. 12, 24, 36 (leave blank if variable)"
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                        />
                      )}
                      {formErrors.validityMonths && (
                        <p className="text-[11px] text-rose-600 mt-1">{formErrors.validityMonths}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Common Section 3: Documentation & Status */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3. Documentation & Governance
                  </span>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Description (Optional)
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
                      placeholder="Brief note on what this type represents or where it is applied..."
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                    />
                  )}
                </div>

                {/* Documentation URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Documentation / Support URL (Optional)
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
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                    />
                  )}
                  {formErrors.docUrl && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.docUrl}</p>
                  )}
                </div>

                {/* Supporting Documents Attachment */}
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
                            <span className="text-[10px] text-slate-400">
                              ({(doc.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          {drawerMode !== 'view' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDoc(doc.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Toggle */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Registration Status
                      <InfoTip text={MODEL_CATEGORY_TOOLTIPS.formStatus} align="left" />
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Active types are selectable in client registration; Inactive are kept for historical records.
                    </p>
                  </div>
                  {drawerMode === 'view' ? (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
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
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#FA8A63]"
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
                  ? 'Viewing model type details'
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
                    {drawerMode === 'add' ? 'Save Type' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discard Form Changes Confirmation Dialog */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/40">
          <div className="w-[380px] bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Discard unsaved changes?</h3>
            <p className="text-xs text-slate-600">
              You have modified this model category type. Closing now will discard your uncommitted edits.
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
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/40">
          <div className="w-[420px] bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Change Category to {categoryChangePending}?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Switching from <strong>{formCategory}</strong> to <strong>{categoryChangePending}</strong> will clear existing category-specific attributes (such as Function, Measurement or SIM settings). Common fields and documents will be preserved.
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

      {/* Inactivate Confirmation Modal */}
      {inactivatingRecord && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/40">
          <div className="w-[420px] bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Inactivate Type "{inactivatingRecord.typeName}"?</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inactivating this type will hide it from new client asset registrations in Devices, Sensors or SIMs. Existing registered assets and model mappings will remain readable and intact.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInactivatingRecord(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmInactivate}
                className="h-8 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Inactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal with Confirmation Chips */}
      <DeleteConfirmationModal
        isOpen={Boolean(recordToDelete)}
        title="Delete Type Definition?"
        description={
          recordToDelete ? (
            <>
              Are you sure you want to delete{' '}
              <strong className="text-slate-900 font-semibold">{recordToDelete.typeName}</strong>?
              This will permanently remove this model type definition from the catalog.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Delete Type"
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
                  id: 'catalog-check',
                  label: 'Catalog Definition Removal',
                  tone: 'amber',
                },
                {
                  id: 'hardware-safe',
                  label: 'Registered Inventory Unchanged',
                  tone: 'emerald',
                },
              ]
            : []
        }
        onCancel={() => setRecordToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
