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
  MoreHorizontal,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  ChevronDown,
  Building2
} from 'lucide-react';
import {
  DirectBulkUploadView,
  formatUploadFileSize,
  useDirectUploadState
} from './common/DirectBulkUploadView';
import { RowActionMenu } from './common/RowActionMenu';
import { DeleteConfirmationModal } from './common/DeleteConfirmationModal';
import {
  DeviceRecord,
  GatewayCategory,
  HardwareLifecycleStatus,
  DEVICE_CATALOGUE,
  DEVICE_COLUMNS,
  MODAL_OWNERS,
  MODAL_LOCATIONS,
  HARDWARE_LIFECYCLE_OPTIONS,
  MODAL_FIELD_TOOLTIPS,
  SavedModalView,
  loadModalMasterStore,
  saveModalMasterStore,
  loadSavedModalViews,
  saveSavedModalViews,
  downloadModalCsv,
  parseCsvLine
} from '../types/modalMaster';
import {
  getEnabledModelsForCompanyName,
  getAvailableClientCompanies
} from '../types/companyModelEnablement';
import {
  getDeviceModePresets,
  getPlatformProtocolPresets,
  getRecordIdentifierTypes,
  loadCustomDeviceModes,
  saveCustomDeviceMode,
  loadCustomPlatformProtocols,
  saveCustomPlatformProtocol
} from '../types/modelCategoryMaster';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';

const GATEWAY_CATEGORIES: GatewayCategory[] = [
  'GPS',
  'ADAS/DMS',
  'E-Lock',
  'CCTV',
  'IP Camera',
  'Face Terminal'
];

const ALL_MANUFACTURERS = [
  'Teltonika',
  'Queclink',
  'Mettax',
  'Streamax',
  'Jointech',
  'Hikvision',
  'CPPLUS'
];

const FieldLabel: React.FC<{
  label: string;
  required?: boolean;
  tooltip: string;
}> = ({ label, required, tooltip }) => (
  <div className="flex items-center justify-between gap-1.5 mb-1">
    <label className="text-[12px] font-semibold text-[#17212b]">
      {label} {required && <span className="text-[#dc2626]">*</span>}
    </label>
    <div className="relative group inline-flex items-center">
      <button
        type="button"
        tabIndex={0}
        aria-label={`Info for ${label}`}
        className="w-[17px] h-[17px] rounded-full border border-[#d6dfe8] bg-[#f8fafc] text-[#5c6b7a] hover:text-[#17212b] hover:border-[#94a3b8] inline-flex items-center justify-center text-[11px] font-semibold cursor-help focus:outline-none focus:ring-2 focus:ring-[#e56b38]/30"
      >
        i
      </button>
      <div className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute right-0 bottom-full mb-2 w-[270px] p-2.5 rounded-lg bg-[#17212b] text-white text-[11px] leading-relaxed shadow-xl z-50 border border-slate-700">
        {tooltip}
      </div>
    </div>
  </div>
);

export const DevicesMasterContent: React.FC<{ currentCompany?: string }> = ({
  currentCompany = 'Adani Mundra'
}) => {
  const [store, setStoreState] = useState(() => loadModalMasterStore());
  const [savedViews, setSavedViews] = useState<SavedModalView[]>(() => loadSavedModalViews());
  const [modelAccessTick, setModelAccessTick] = useState(0);
  const selfWriteRef = React.useRef(false);

  const setStore: React.Dispatch<React.SetStateAction<typeof store>> = (updater) => {
    setStoreState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      selfWriteRef.current = true;
      saveModalMasterStore(next);
      setTimeout(() => {
        selfWriteRef.current = false;
      }, 0);
      return next;
    });
  };

  useEffect(() => {
    const handleSync = () => setModelAccessTick((t) => t + 1);
    const handleStoreSync = () => {
      if (!selfWriteRef.current) {
        setStoreState(loadModalMasterStore());
      }
    };
    window.addEventListener('fleetrobo:model-access-updated', handleSync);
    window.addEventListener('fleetrobo:modal-store-updated', handleStoreSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('storage', handleStoreSync);
    return () => {
      window.removeEventListener('fleetrobo:model-access-updated', handleSync);
      window.removeEventListener('fleetrobo:modal-store-updated', handleStoreSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('storage', handleStoreSync);
    };
  }, []);

  const isPlatformAdmin = currentCompany === 'Platform Admin' || currentCompany === 'Binary';
  const availableOrganizations = useMemo(() => {
    void modelAccessTick;
    return getAvailableClientCompanies();
  }, [modelAccessTick]);

  // Toolbar & Table states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('All');
  const [filterKind, setFilterKind] = useState<string>('All');
  const [filterManufacturer, setFilterManufacturer] = useState<string>('All');
  const [filterLifecycle, setFilterLifecycle] = useState<string>('All');

  useEffect(() => {
    setFilterCompany('All');
  }, [currentCompany]);

  // Enabled Device models for the active company (or selected filter company in Platform Admin)
  const enabledDeviceModels = useMemo(() => {
    const scopeCompany = isPlatformAdmin && filterCompany !== 'All' ? filterCompany : currentCompany;
    return getEnabledModelsForCompanyName(scopeCompany).filter(
      (m) => m.category === 'Device'
    );
  }, [currentCompany, isPlatformAdmin, filterCompany, modelAccessTick]);

  const enabledCategories = useMemo<string[]>(() => {
    const cats = Array.from(new Set(enabledDeviceModels.map((m) => m.typeName)));
    return cats.length > 0 ? cats : GATEWAY_CATEGORIES;
  }, [enabledDeviceModels]);

  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hiddenCols, setHiddenCols] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Drawers state
  const [activeDrawer, setActiveDrawer] = useState<
    null | 'filters' | 'saved-views' | 'form' | 'inspector' | 'bulk' | 'import'
  >(null);

  // Inspector state
  const [inspectedDevice, setInspectedDevice] = useState<DeviceRecord | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'linked' | 'activity'>('overview');

  // Form state (Create / Edit)
  const [editingDevice, setEditingDevice] = useState<DeviceRecord | null>(null);
  const [formName, setFormName] = useState('');
  const [formDeviceId, setFormDeviceId] = useState('');
  const [formKind, setFormKind] = useState<GatewayCategory>(
    () => enabledCategories[0] || 'GPS'
  );
  const [formCompany, setFormCompany] = useState(() =>
    currentCompany && currentCompany !== 'Platform Admin' && currentCompany !== 'Binary'
      ? currentCompany
      : availableOrganizations[0] || MODAL_OWNERS[0]
  );

  const effectiveFormCompany = isPlatformAdmin
    ? formCompany || availableOrganizations[0] || 'Adani Mundra'
    : currentCompany;

  const formEnabledDeviceModels = useMemo(() => {
    return getEnabledModelsForCompanyName(effectiveFormCompany).filter(
      (m) => m.category === 'Device'
    );
  }, [effectiveFormCompany, modelAccessTick]);

  const formEnabledCategories = useMemo<string[]>(() => {
    const cats = Array.from(new Set(formEnabledDeviceModels.map((m) => m.typeName)));
    return cats.length > 0 ? cats : GATEWAY_CATEGORIES;
  }, [formEnabledDeviceModels]);
  const [formManufacturer, setFormManufacturer] = useState(
    () => enabledDeviceModels[0]?.manufacturer || 'Teltonika'
  );
  const [formModelText, setFormModelText] = useState(
    () => enabledDeviceModels[0]?.modelReference || 'FMB120'
  );
  const [formModes, setFormModes] = useState<string[]>(() => {
    const first = enabledDeviceModels[0];
    if (first?.supportedModes && first.supportedModes.length > 0) return [first.supportedModes[0]];
    if (first?.deviceMode) return [first.deviceMode];
    if (first?.deviceFunction) return [first.deviceFunction];
    return ['Standard'];
  });
  const [formSerial, setFormSerial] = useState('');
  const [formImei, setFormImei] = useState('');
  const [formIdentifierType, setFormIdentifierType] = useState('');
  const [formProtocols, setFormProtocols] = useState<string[]>(['Codec8']);
  const [formLocation, setFormLocation] = useState(MODAL_LOCATIONS[0]);
  const [formLifecycle, setFormLifecycle] = useState<HardwareLifecycleStatus>('Active');
  const [formChannelCount, setFormChannelCount] = useState<number>(4);
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Multi-select dropdown states for Mode and Platform Protocol
  const [customDeviceModes, setCustomDeviceModes] = useState<string[]>(() => loadCustomDeviceModes());
  const [deviceModeMenuOpen, setDeviceModeMenuOpen] = useState(false);
  const [deviceModeSearch, setDeviceModeSearch] = useState('');
  const [showCustomDeviceModeInput, setShowCustomDeviceModeInput] = useState(false);
  const [customDeviceModeText, setCustomDeviceModeText] = useState('');
  const deviceModeDropdownRef = React.useRef<HTMLDivElement | null>(null);

  const [customDeviceProtocols, setCustomDeviceProtocols] = useState<string[]>(() =>
    loadCustomPlatformProtocols()
  );
  const [deviceProtocolMenuOpen, setDeviceProtocolMenuOpen] = useState(false);
  const [deviceProtocolSearch, setDeviceProtocolSearch] = useState('');
  const [showCustomDeviceProtocolInput, setShowCustomDeviceProtocolInput] = useState(false);
  const [customDeviceProtocolText, setCustomDeviceProtocolText] = useState('');
  const deviceProtocolDropdownRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (deviceModeDropdownRef.current && !deviceModeDropdownRef.current.contains(target)) {
        setDeviceModeMenuOpen(false);
      }
      if (
        deviceProtocolDropdownRef.current &&
        !deviceProtocolDropdownRef.current.contains(target)
      ) {
        setDeviceProtocolMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (activeDrawer !== 'form') {
      setDeviceModeMenuOpen(false);
      setDeviceProtocolMenuOpen(false);
      setDeviceModeSearch('');
      setDeviceProtocolSearch('');
      setShowCustomDeviceModeInput(false);
      setCustomDeviceModeText('');
      setShowCustomDeviceProtocolInput(false);
      setCustomDeviceProtocolText('');
    }
  }, [activeDrawer]);

  // Saved view creation state
  const [newViewName, setNewViewName] = useState('');

  // Bulk operation state
  const [bulkAction, setBulkAction] = useState<
    'Update inventory status' | 'Decommission eligible' | 'Delete eligible'
  >('Update inventory status');
  const [bulkTargetStatus, setBulkTargetStatus] = useState<HardwareLifecycleStatus>('Active');
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);

  // Direct upload state
  const deviceUpload = useDirectUploadState(activeDrawer === 'import');

  useEffect(() => {
    saveSavedModalViews(savedViews);
  }, [savedViews]);

  // Derived form options from formEnabledDeviceModels for the selected category
  const modelsForSelectedCategory = useMemo(() => {
    return formEnabledDeviceModels.filter((m) => m.typeName === formKind);
  }, [formEnabledDeviceModels, formKind]);

  const availableManufacturers = useMemo<string[]>(() => {
    if (modelsForSelectedCategory.length > 0) {
      return Array.from(new Set(modelsForSelectedCategory.map((m) => m.manufacturer)));
    }
    const catDef = DEVICE_CATALOGUE[formKind];
    return catDef ? Object.keys(catDef.manufacturers) : ALL_MANUFACTURERS;
  }, [modelsForSelectedCategory, formKind]);

  const availableModels = useMemo<
    { model: string; defaultProtocol: string; channelCount: number }[]
  >(() => {
    if (modelsForSelectedCategory.length > 0) {
      const byMfg = modelsForSelectedCategory.filter((m) => m.manufacturer === formManufacturer);
      const list = byMfg.length > 0 ? byMfg : modelsForSelectedCategory;
      return list.map((m) => ({
        model: m.modelReference,
        defaultProtocol: 'MQTT',
        channelCount: 4
      }));
    }
    const catDef = DEVICE_CATALOGUE[formKind];
    if (!catDef) {
      return [{ model: formModelText || 'Standard', defaultProtocol: 'MQTT', channelCount: 1 }];
    }
    return (
      catDef.manufacturers[formManufacturer]?.models ||
      catDef.manufacturers[availableManufacturers[0]]?.models ||
      []
    );
  }, [
    modelsForSelectedCategory,
    formManufacturer,
    formKind,
    formModelText,
    availableManufacturers
  ]);

  const selectedModelSpec = useMemo(() => {
    return (
      modelsForSelectedCategory.find(
        (m) => m.manufacturer === formManufacturer && m.modelReference === formModelText
      ) ||
      modelsForSelectedCategory[0] ||
      formEnabledDeviceModels[0] ||
      null
    );
  }, [modelsForSelectedCategory, formManufacturer, formModelText, formEnabledDeviceModels]);

  const availableModes = useMemo<string[]>(() => {
    if (selectedModelSpec) {
      if (selectedModelSpec.supportedModes && selectedModelSpec.supportedModes.length > 0) {
        return Array.from(
          new Set(
            [
              ...selectedModelSpec.supportedModes,
              selectedModelSpec.deviceMode,
              ...customDeviceModes,
              ...formModes
            ].filter((m): m is string => Boolean(m))
          )
        );
      }
      const presets = getDeviceModePresets(
        selectedModelSpec.typeName,
        selectedModelSpec.deviceFunction
      );
      return Array.from(
        new Set(
          [
            selectedModelSpec.deviceMode,
            ...presets,
            ...customDeviceModes,
            ...formModes
          ].filter((m): m is string => Boolean(m))
        )
      );
    }
    const catDef = DEVICE_CATALOGUE[formKind];
    if (catDef) {
      return Array.from(
        new Set(
          [...catDef.modes, catDef.defaultModeOnSelect, ...customDeviceModes, ...formModes].filter(
            Boolean
          )
        )
      );
    }
    return Array.from(new Set(['Standard', ...customDeviceModes, ...formModes].filter(Boolean)));
  }, [selectedModelSpec, formKind, formModes, customDeviceModes]);

  const normalizeProtocol = (val?: string) => {
    const trimmed = (val || '').trim();
    if (!trimmed) return '';
    return trimmed.toUpperCase() === 'METTA' ? 'Metta' : trimmed;
  };

  const availableProtocols = useMemo<string[]>(() => {
    const fromSpec = selectedModelSpec?.supportedProtocols || [];
    const fromCatDef = DEVICE_CATALOGUE[formKind]?.protocols || [];
    const fromPresets = getPlatformProtocolPresets(
      selectedModelSpec?.typeName || formKind,
      selectedModelSpec?.deviceFunction
    );
    const baseList =
      fromSpec.length > 0
        ? fromSpec
        : fromCatDef.length > 0
        ? fromCatDef
        : fromPresets;

    const normalizedBase = [...baseList, ...customDeviceProtocols]
      .map(normalizeProtocol)
      .filter(Boolean);
    const normalizedSelected = formProtocols.map(normalizeProtocol).filter(Boolean);
    return Array.from(new Set([...normalizedBase, ...normalizedSelected]));
  }, [selectedModelSpec, formKind, formProtocols, customDeviceProtocols]);

  const availableIdentifierTypes = useMemo(() => {
    const fromSpec = getRecordIdentifierTypes(selectedModelSpec);
    if (fromSpec.length > 0) return fromSpec;
    if (editingDevice?.identifierType) {
      return getRecordIdentifierTypes({ identifierType: editingDevice.identifierType });
    }
    return ['Serial Number'];
  }, [selectedModelSpec, editingDevice]);

  const activeIdentifierType = useMemo(() => {
    if (formIdentifierType && availableIdentifierTypes.includes(formIdentifierType)) {
      return formIdentifierType;
    }
    return availableIdentifierTypes[0] || 'Serial Number';
  }, [formIdentifierType, availableIdentifierTypes]);

  const parseMultiValues = (arr?: string[], csv?: string): string[] => {
    if (arr && arr.length > 0) {
      return Array.from(new Set(arr.map((v) => v.trim()).filter(Boolean)));
    }
    if (!csv) return [];
    return Array.from(
      new Set(
        csv
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      )
    );
  };

  const resolveDefaultProtocolsForModel = (
    modelSupported?: string[],
    typeName?: string,
    deviceFunction?: string,
    fallbackProtocol?: string
  ): string[] => {
    const list =
      modelSupported && modelSupported.length > 0
        ? modelSupported
        : DEVICE_CATALOGUE[typeName || '']?.protocols ||
          getPlatformProtocolPresets(typeName, deviceFunction);
    const normalized = Array.from(new Set(list.map(normalizeProtocol).filter(Boolean)));
    if (normalized.length >= 1) return [normalized[0]];
    const fb = normalizeProtocol(fallbackProtocol);
    return fb ? [fb] : [];
  };

  // Keep Create form defaults aligned when company or enabled models change
  useEffect(() => {
    if (editingDevice) return;
    if (formEnabledDeviceModels.length > 0) {
      const firstModel =
        formEnabledDeviceModels.find((m) => m.typeName === formKind) || formEnabledDeviceModels[0];
      const presets = getDeviceModePresets(firstModel.typeName, firstModel.deviceFunction);
      const defaultMode =
        firstModel.supportedModes?.[0] ||
        firstModel.deviceMode ||
        presets[0] ||
        firstModel.deviceFunction ||
        'Standard';
      setFormKind(firstModel.typeName);
      setFormManufacturer(firstModel.manufacturer);
      setFormModelText(firstModel.modelReference);
      setFormModes(defaultMode ? [defaultMode] : []);
      setFormProtocols(
        resolveDefaultProtocolsForModel(
          firstModel.supportedProtocols,
          firstModel.typeName,
          firstModel.deviceFunction
        )
      );
      setFormChannelCount(4);
    }
  }, [effectiveFormCompany, formEnabledDeviceModels, editingDevice]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingDevice(null);
    setCustomDeviceModes(loadCustomDeviceModes());
    setCustomDeviceProtocols(loadCustomPlatformProtocols());
    const targetOrg = isPlatformAdmin
      ? filterCompany !== 'All'
        ? filterCompany
        : availableOrganizations[0] || MODAL_OWNERS[0]
      : currentCompany || MODAL_OWNERS[0];
    const targetModels = getEnabledModelsForCompanyName(targetOrg).filter(
      (m) => m.category === 'Device'
    );
    const nextNum = 9001 + store.devices.length;
    const firstEnabled = targetModels[0] || enabledDeviceModels[0];
    const cat: GatewayCategory = firstEnabled ? firstEnabled.typeName : 'GPS';
    const mfg = firstEnabled ? firstEnabled.manufacturer : 'Teltonika';
    const fallbackModelObj = DEVICE_CATALOGUE['GPS'].manufacturers['Teltonika'].models[0];
    const modelRef = firstEnabled ? firstEnabled.modelReference : fallbackModelObj.model;
    const modeVal = firstEnabled
      ? firstEnabled.supportedModes?.[0] ||
        firstEnabled.deviceMode ||
        getDeviceModePresets(firstEnabled.typeName, firstEnabled.deviceFunction)[0] ||
        firstEnabled.deviceFunction ||
        'Standard'
      : DEVICE_CATALOGUE['GPS'].defaultModeOnSelect;
    const protoVals = firstEnabled
      ? resolveDefaultProtocolsForModel(
          firstEnabled.supportedProtocols,
          firstEnabled.typeName,
          firstEnabled.deviceFunction
        )
      : [];
    const chCount = firstEnabled ? 4 : fallbackModelObj.channelCount;

    setFormName('');
    setFormDeviceId(`GTW-${nextNum}`);
    setFormKind(cat);
    setFormCompany(targetOrg);
    setFormManufacturer(mfg);
    setFormModelText(modelRef);
    setFormModes(modeVal ? [modeVal] : []);
    setFormSerial('');
    setFormImei('');
    setFormIdentifierType(getRecordIdentifierTypes(firstEnabled)[0] || '');
    setFormProtocols(protoVals);
    setFormLocation(MODAL_LOCATIONS[0]);
    setFormLifecycle('Active');
    setFormChannelCount(chCount);
    setFormNotes('');
    setFormError(null);
    setActiveDrawer('form');
  };

  // Open Edit Form
  const handleOpenEdit = (record: DeviceRecord) => {
    setEditingDevice(record);
    setCustomDeviceModes(loadCustomDeviceModes());
    setCustomDeviceProtocols(loadCustomPlatformProtocols());
    setFormName(record.name.replace(/\s*·\s*.*$/, ''));
    setFormDeviceId(record.deviceId);
    setFormKind(record.kind);
    setFormCompany(record.company);
    setFormManufacturer(record.manufacturer);
    setFormModelText(record.modelText);
    setFormModes(parseMultiValues(record.modes, record.mode));
    setFormSerial(record.serial);
    setFormImei(record.imei);
    setFormIdentifierType(record.identifierType || '');
    setFormProtocols(
      parseMultiValues(record.platformProtocols, record.platformProtocol)
        .map(normalizeProtocol)
        .filter(Boolean)
    );
    setFormLocation(record.inventoryLocation);
    setFormLifecycle(record.hardwareLifecycle);
    setFormChannelCount(record.channelCount);
    setFormNotes(record.notes);
    setFormError(null);
    setActiveDrawer('form');
  };

  // Dynamic category change in form
  const handleCategoryChange = (newKind: GatewayCategory) => {
    setFormKind(newKind);
    const matchingEnabled = formEnabledDeviceModels.filter((m) => m.typeName === newKind);
    if (matchingEnabled.length > 0) {
      const first = matchingEnabled[0];
      const presets = getDeviceModePresets(first.typeName, first.deviceFunction);
      const defaultMode =
        first.supportedModes?.[0] || first.deviceMode || presets[0] || first.deviceFunction || 'Standard';
      setFormManufacturer(first.manufacturer);
      setFormModelText(first.modelReference);
      setFormModes(defaultMode ? [defaultMode] : []);
      setFormProtocols(
        resolveDefaultProtocolsForModel(
          first.supportedProtocols,
          first.typeName,
          first.deviceFunction
        )
      );
      setFormChannelCount(4);
      return;
    }
    const catDef = DEVICE_CATALOGUE[newKind];
    if (catDef) {
      const firstMfg = Object.keys(catDef.manufacturers)[0];
      const firstModel = catDef.manufacturers[firstMfg].models[0];
      setFormManufacturer(firstMfg);
      setFormModelText(firstModel.model);
      setFormModes(catDef.defaultModeOnSelect ? [catDef.defaultModeOnSelect] : []);
      setFormProtocols(
        resolveDefaultProtocolsForModel(
          catDef.protocols,
          newKind,
          undefined,
          firstModel.defaultProtocol
        )
      );
      setFormChannelCount(firstModel.channelCount);
    }
  };

  // Dynamic manufacturer change in form
  const handleManufacturerChange = (newMfg: string) => {
    setFormManufacturer(newMfg);
    const matchingEnabled = formEnabledDeviceModels.filter(
      (m) => m.typeName === formKind && m.manufacturer === newMfg
    );
    if (matchingEnabled.length > 0) {
      const first = matchingEnabled[0];
      const presets = getDeviceModePresets(first.typeName, first.deviceFunction);
      const defaultMode =
        first.supportedModes?.[0] || first.deviceMode || presets[0] || first.deviceFunction || 'Standard';
      setFormModelText(first.modelReference);
      setFormModes(defaultMode ? [defaultMode] : []);
      setFormProtocols(
        resolveDefaultProtocolsForModel(
          first.supportedProtocols,
          first.typeName,
          first.deviceFunction
        )
      );
      setFormChannelCount(4);
      return;
    }
    const catDef = DEVICE_CATALOGUE[formKind];
    const mfgEntry = catDef?.manufacturers[newMfg];
    if (mfgEntry && mfgEntry.models.length > 0) {
      const firstModel = mfgEntry.models[0];
      setFormModelText(firstModel.model);
      setFormProtocols(
        resolveDefaultProtocolsForModel(
          catDef.protocols,
          formKind,
          undefined,
          firstModel.defaultProtocol
        )
      );
      setFormChannelCount(firstModel.channelCount);
    }
  };

  // Dynamic model change in form
  const handleModelChange = (newModel: string) => {
    setFormModelText(newModel);
    const matchedEnabled = formEnabledDeviceModels.find(
      (m) =>
        m.typeName === formKind &&
        m.manufacturer === formManufacturer &&
        m.modelReference === newModel
    );
    if (matchedEnabled) {
      const presets = getDeviceModePresets(matchedEnabled.typeName, matchedEnabled.deviceFunction);
      const defaultMode =
        matchedEnabled.supportedModes?.[0] ||
        matchedEnabled.deviceMode ||
        presets[0] ||
        matchedEnabled.deviceFunction ||
        'Standard';
      setFormModes(defaultMode ? [defaultMode] : []);
      setFormProtocols(
        resolveDefaultProtocolsForModel(
          matchedEnabled.supportedProtocols,
          matchedEnabled.typeName,
          matchedEnabled.deviceFunction
        )
      );
      setFormChannelCount(4);
      return;
    }
    const catDef = DEVICE_CATALOGUE[formKind];
    const mfgEntry = catDef?.manufacturers[formManufacturer];
    const found = mfgEntry?.models.find((m) => m.model === newModel);
    if (found) {
      setFormProtocols(
        resolveDefaultProtocolsForModel(
          catDef.protocols,
          formKind,
          undefined,
          found.defaultProtocol
        )
      );
      setFormChannelCount(found.channelCount);
    }
  };

  // Save Device (Create or Edit)
  const handleSaveDevice = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim().replace(/\s*·\s*.*$/, '');
    const trimmedId = formDeviceId.trim();
    const supportsImei = availableIdentifierTypes.some((t) => t.toUpperCase() === 'IMEI');
    const supportsSerial = availableIdentifierTypes.some((t) => t.toUpperCase() !== 'IMEI');
    const requiresImei = activeIdentifierType.toUpperCase() === 'IMEI';
    const effectiveSerial =
      formSerial.trim() || (supportsSerial || !requiresImei ? trimmedId : '');
    const effectiveImei =
      formImei.trim() || (supportsImei && requiresImei ? trimmedId : '');

    const singleProtocol = formProtocols[0] ? formProtocols[0].trim() : '';

    if (!trimmedName || !trimmedId || !singleProtocol) {
      setFormError(
        'Please complete all required fields marked with * (select Platform Protocol).'
      );
      return;
    }

    // Cross-module uniqueness across both devices AND sensors
    const duplicateInDevices = store.devices.some(
      (d) =>
        d.id !== editingDevice?.id &&
        (d.deviceId.toLowerCase() === trimmedId.toLowerCase() ||
          (effectiveSerial && d.serial.toLowerCase() === effectiveSerial.toLowerCase()) ||
          (effectiveImei && d.imei && d.imei.toLowerCase() === effectiveImei.toLowerCase()))
    );
    const duplicateInSensors = store.sensors.some(
      (s) =>
        s.deviceId.toLowerCase() === trimmedId.toLowerCase() ||
        (effectiveSerial && s.serial.toLowerCase() === effectiveSerial.toLowerCase())
    );

    if (duplicateInDevices || duplicateInSensors) {
      setFormError('Device ID must be unique across Devices and Sensors.');
      return;
    }

    const catDef = DEVICE_CATALOGUE[formKind];
    const mfgEntry = catDef?.manufacturers[formManufacturer];
    const modelObj = mfgEntry?.models.find((m) => m.model === formModelText);
    const capabilities = modelObj
      ? [...modelObj.capabilities]
      : selectedModelSpec?.connectivity && selectedModelSpec.connectivity.length > 0
      ? [...selectedModelSpec.connectivity]
      : ['Cellular'];
    const todayStr = new Date().toISOString().slice(0, 10);

    const modeSummary = formModes.join(', ');
    const protocolSummary = singleProtocol;
    const protocolArray = singleProtocol ? [singleProtocol] : [];

    if (editingDevice) {
      const updatedRecord: DeviceRecord = {
        ...editingDevice,
        name: trimmedName,
        deviceId: trimmedId,
        kind: formKind,
        manufacturer: formManufacturer,
        modelText: formModelText,
        modelTypeId: selectedModelSpec?.id || editingDevice.modelTypeId,
        identifierType: activeIdentifierType,
        mode: modeSummary,
        modes: [...formModes],
        serial: effectiveSerial,
        imei: effectiveImei,
        capabilities,
        platformProtocol: protocolSummary,
        platformProtocols: protocolArray,
        company: formCompany,
        inventoryLocation: formLocation,
        hardwareLifecycle: formLifecycle,
        channelCount: Number(formChannelCount) || 1,
        notes: formNotes.trim(),
        updatedAt: todayStr
      };
      setStore((prev) => ({
        ...prev,
        devices: prev.devices.map((d) => (d.id === editingDevice.id ? updatedRecord : d))
      }));
      showToast(`Device ${trimmedId} updated.`);
    } else {
      const newRecord: DeviceRecord = {
        id: `dev-focus-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        deviceId: trimmedId,
        name: trimmedName,
        kind: formKind,
        role: 'gateway',
        manufacturer: formManufacturer,
        modelText: formModelText,
        modelTypeId: selectedModelSpec?.id,
        identifierType: activeIdentifierType,
        mode: modeSummary,
        modes: [...formModes],
        serial: effectiveSerial,
        imei: effectiveImei,
        capabilities,
        platformProtocol: protocolSummary,
        platformProtocols: protocolArray,
        company: isPlatformAdmin
          ? formCompany || availableOrganizations[0] || 'Adani Mundra'
          : currentCompany || formCompany,
        inventoryLocation: formLocation,
        hardwareLifecycle: formLifecycle,
        registeredAt: todayStr,
        updatedAt: todayStr,
        channelCount: Number(formChannelCount) || 1,
        notes: formNotes.trim()
      };
      setStore((prev) => ({
        ...prev,
        devices: [newRecord, ...prev.devices]
      }));
      setSortKey('');
      setCurrentPage(1);
      showToast(`Device ${trimmedId} created.`);
    }

    setActiveDrawer(null);
  };

  // Filtered & Sorted Devices (strictly scoped to active client when not Platform Admin)
  const filteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const companyTarget =
      !isPlatformAdmin && currentCompany
        ? currentCompany.trim().toLowerCase()
        : isPlatformAdmin && filterCompany !== 'All'
        ? filterCompany.trim().toLowerCase()
        : null;
    return store.devices.filter((d) => {
      if (companyTarget && (d.company || '').trim().toLowerCase() !== companyTarget) return false;
      if (filterKind !== 'All' && d.kind !== filterKind) return false;
      if (filterManufacturer !== 'All' && d.manufacturer !== filterManufacturer) return false;
      if (filterLifecycle !== 'All' && d.hardwareLifecycle !== filterLifecycle) return false;
      if (q) {
        const hay = [
          d.name,
          d.deviceId,
          d.kind,
          d.manufacturer,
          d.modelText,
          d.mode,
          d.serial,
          d.imei,
          d.company
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [store.devices, currentCompany, isPlatformAdmin, filterCompany, searchQuery, filterKind, filterManufacturer, filterLifecycle]);

  const sortedDevices = useMemo(() => {
    if (!sortKey) return filteredDevices;
    const copy = [...filteredDevices];
    copy.sort((a, b) => {
      const av = String((a as any)[sortKey] ?? '').toLowerCase();
      const bv = String((b as any)[sortKey] ?? '').toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filteredDevices, sortKey, sortDir]);

  const totalRecords = sortedDevices.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const currentRows = sortedDevices.slice(startIdx, startIdx + pageSize);

  const visibleColumns = useMemo(() => {
    const hasImeiModel =
      enabledDeviceModels.length === 0 ||
      enabledDeviceModels.some((m) =>
        getRecordIdentifierTypes(m).some((t) => t.toUpperCase() === 'IMEI')
      );
    const hasSerialModel =
      enabledDeviceModels.length === 0 ||
      enabledDeviceModels.some((m) =>
        getRecordIdentifierTypes(m).some((t) => t.toUpperCase() !== 'IMEI')
      );

    return DEVICE_COLUMNS.filter((c) => {
      if (hiddenCols.includes(c.key)) return false;
      if (c.key === 'imei' && !hasImeiModel) return false;
      if (c.key === 'serial' && !hasSerialModel) return false;
      return true;
    });
  }, [hiddenCols, enabledDeviceModels]);

  const activeFilterCount =
    (isPlatformAdmin && filterCompany !== 'All' ? 1 : 0) +
    (filterKind !== 'All' ? 1 : 0) +
    (filterManufacturer !== 'All' ? 1 : 0) +
    (filterLifecycle !== 'All' ? 1 : 0);

  // Selection helpers
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

  // Sort handler
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Inspector opener
  const openInspector = (rec: DeviceRecord) => {
    setInspectedDevice(rec);
    setInspectorTab('overview');
    setActiveDrawer('inspector');
  };

  const [deviceToDelete, setDeviceToDelete] = useState<DeviceRecord | null>(null);

  const handleConfirmDeleteDevice = () => {
    if (!deviceToDelete) return;
    const idToDelete = deviceToDelete.id;
    setStore((prev) => ({
      ...prev,
      devices: prev.devices.filter((d) => d.id !== idToDelete),
    }));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(idToDelete);
      return next;
    });
    showToast(`Device "${deviceToDelete.name}" (${deviceToDelete.deviceId}) deleted successfully`);
    setDeviceToDelete(null);
    if (inspectedDevice?.id === idToDelete) {
      setActiveDrawer(null);
      setInspectedDevice(null);
    }
  };

  // Bulk eligibility calculation
  const selectedDeviceRecords = useMemo(
    () => store.devices.filter((d) => selectedIds.has(d.id)),
    [store.devices, selectedIds]
  );

  const bulkEligibility = useMemo(() => {
    const eligible: DeviceRecord[] = [];
    const skipped: { record: DeviceRecord; reason: string }[] = [];

    selectedDeviceRecords.forEach((dev) => {
      if (bulkAction === 'Decommission eligible' || bulkAction === 'Delete eligible') {
        const hasActiveConn = store.connections.some(
          (c) =>
            c.status === 'Active' &&
            (c.memberIds?.includes(dev.id) || c.hardwareId === dev.id || c.parentId === dev.id)
        );
        if (hasActiveConn) {
          skipped.push({
            record: dev,
            reason: 'Linked to an Active connection in Modal Mapping'
          });
        } else {
          eligible.push(dev);
        }
      } else {
        eligible.push(dev);
      }
    });

    return { eligible, skipped };
  }, [selectedDeviceRecords, bulkAction, store.connections]);

  const executeBulkDeleteDevices = (reason?: string) => {
    const eligibleIds = new Set(bulkEligibility.eligible.map((d) => d.id));
    if (eligibleIds.size === 0) return;

    setStore((prev) => ({
      ...prev,
      devices: prev.devices.filter((d) => !eligibleIds.has(d.id))
    }));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      eligibleIds.forEach((id) => next.delete(id));
      return next;
    });
    if (inspectedDevice && eligibleIds.has(inspectedDevice.id)) {
      setInspectedDevice(null);
    }
    showToast(
      `Deleted ${eligibleIds.size} device(s)${bulkEligibility.skipped.length > 0 ? `, ${bulkEligibility.skipped.length} skipped` : ''}${reason ? ` · ${reason}` : ''}`
    );
    setPendingBulkDelete(false);
    setActiveDrawer(null);
  };

  const handleApplyBulk = () => {
    if (selectedDeviceRecords.length === 0) return;
    if (bulkAction === 'Delete eligible') {
      if (bulkEligibility.eligible.length === 0) return;
      setPendingBulkDelete(true);
      return;
    }
    const eligibleIds = new Set(bulkEligibility.eligible.map((d) => d.id));
    const todayStr = new Date().toISOString().slice(0, 10);

    setStore((prev) => ({
      ...prev,
      devices: prev.devices.map((d) => {
        if (!eligibleIds.has(d.id)) return d;
        if (bulkAction === 'Update inventory status') {
          return { ...d, hardwareLifecycle: bulkTargetStatus, updatedAt: todayStr };
        }
        if (bulkAction === 'Decommission eligible') {
          return { ...d, hardwareLifecycle: 'Decommissioned', updatedAt: todayStr };
        }
        return d;
      })
    }));

    showToast(
      `Bulk action completed: ${bulkEligibility.eligible.length} updated, ${bulkEligibility.skipped.length} skipped.`
    );
    setActiveDrawer(null);
  };

  // Direct CSV/JSON upload execution
  const processDevicesUpload = (fmt: 'csv' | 'json', rawText: string, fileName: string, fileSize?: number) => {
    const raw = rawText.trim();
    if (!raw) {
      deviceUpload.fail('Uploaded file is empty.');
      return;
    }

    const valid: Partial<DeviceRecord>[] = [];
    const invalid: { line: number; reason: string }[] = [];
    const seenIds = new Set([
      ...store.devices.map((d) => d.deviceId.toLowerCase()),
      ...store.sensors.map((s) => s.deviceId.toLowerCase())
    ]);
    const seenSerials = new Set([
      ...store.devices.map((d) => d.serial.toLowerCase()),
      ...store.sensors.map((s) => s.serial.toLowerCase())
    ]);

    if (fmt === 'json') {
      try {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        arr.forEach((item, idx) => {
          const deviceId = String(item.deviceId || '').trim();
          const name = String(item.name || '').trim();
          const serial = String(item.serial || '').trim();
          if (!deviceId || !name || !serial) {
            invalid.push({ line: idx + 1, reason: 'Missing required name, deviceId, or serial' });
            return;
          }
          if (seenIds.has(deviceId.toLowerCase()) || seenSerials.has(serial.toLowerCase())) {
            invalid.push({
              line: idx + 1,
              reason: `Duplicate deviceId (${deviceId}) or serial (${serial})`
            });
            return;
          }
          seenIds.add(deviceId.toLowerCase());
          seenSerials.add(serial.toLowerCase());
          valid.push({
            deviceId,
            name,
            kind: (GATEWAY_CATEGORIES.includes(item.kind) ? item.kind : 'GPS') as GatewayCategory,
            manufacturer: item.manufacturer || 'Teltonika',
            modelText: item.modelText || 'FMB120',
            mode: item.mode || 'GPS tracking',
            serial,
            imei: item.imei || '',
            company: item.company || 'Adani Port',
            inventoryLocation: item.inventoryLocation || 'Mundra CT2',
            hardwareLifecycle: item.hardwareLifecycle || 'Inventory'
          });
        });
      } catch {
        deviceUpload.fail('Invalid JSON syntax.');
        return;
      }
    } else {
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      lines.forEach((line, idx) => {
        const cols = parseCsvLine(line);
        if (idx === 0 && cols[0]?.toLowerCase().includes('device')) {
          return;
        }
        const [name, deviceId, kind, manufacturer, modelText, mode, serial, imei, company, inventoryLocation, hardwareLifecycle] = cols;
        if (!name || !deviceId || !serial) {
          invalid.push({
            line: idx + 1,
            reason: 'CSV row requires at least Device name, Device ID, and Serial number'
          });
          return;
        }
        if (seenIds.has(deviceId.toLowerCase()) || seenSerials.has(serial.toLowerCase())) {
          invalid.push({
            line: idx + 1,
            reason: `Duplicate Device ID (${deviceId}) or Serial (${serial})`
          });
          return;
        }
        seenIds.add(deviceId.toLowerCase());
        seenSerials.add(serial.toLowerCase());
        valid.push({
          name,
          deviceId,
          kind: (GATEWAY_CATEGORIES.includes(kind as GatewayCategory) ? kind : 'GPS') as GatewayCategory,
          manufacturer: manufacturer || 'Teltonika',
          modelText: modelText || 'FMB120',
          mode: mode || 'GPS tracking',
          serial,
          imei: imei || '',
          company: company || 'Adani Port',
          inventoryLocation: inventoryLocation || 'Mundra CT2',
          hardwareLifecycle: (HARDWARE_LIFECYCLE_OPTIONS.includes(hardwareLifecycle as HardwareLifecycleStatus)
            ? hardwareLifecycle
            : 'Inventory') as HardwareLifecycleStatus
        });
      });
    }

    if (valid.length === 0) {
      deviceUpload.fail(
        invalid[0]?.reason || 'No valid new device rows found (duplicates or missing required fields).'
      );
      return;
    }

    deviceUpload.startUploading(fileName, formatUploadFileSize(fileSize), () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const created: DeviceRecord[] = valid.map((v, i) => ({
        id: `dev-import-${Date.now()}-${i}`,
        deviceId: v.deviceId!,
        name: v.name!,
        kind: (v.kind as GatewayCategory) || 'GPS',
        role: 'gateway',
        manufacturer: v.manufacturer || 'Teltonika',
        modelText: v.modelText || 'FMB120',
        mode: v.mode || 'GPS tracking',
        serial: v.serial!,
        imei: v.imei || '',
        capabilities: ['Cellular', 'BLE'],
        platformProtocol: 'MQTT',
        company: v.company || 'Adani Port',
        inventoryLocation: v.inventoryLocation || 'Mundra CT2',
        hardwareLifecycle: (v.hardwareLifecycle as HardwareLifecycleStatus) || 'Inventory',
        registeredAt: todayStr,
        updatedAt: todayStr,
        channelCount: 4,
        notes: 'Imported via bulk CSV/JSON'
      }));

      setStore((prev) => ({
        ...prev,
        devices: [...created, ...prev.devices]
      }));
      setSortKey('');
      setCurrentPage(1);
      showToast(`Imported ${created.length} Device(s) (${invalid.length} skipped).`);
      return {
        headline: 'Devices uploaded successfully',
        description: `${created.length} device record${created.length === 1 ? '' : 's'} imported from ${fileName}.${
          invalid.length > 0 ? ` ${invalid.length} duplicate or invalid row${invalid.length === 1 ? '' : 's'} skipped.` : ''
        }`,
        stats: [
          { label: 'Uploaded', value: created.length, tone: 'emerald' },
          { label: 'Skipped', value: invalid.length, tone: invalid.length > 0 ? 'amber' : 'slate' }
        ]
      };
    });
  };

  // Lifecycle pill styling matching specification
  const renderLifecycleBadge = (status: HardwareLifecycleStatus) => {
    const map: Record<
      HardwareLifecycleStatus,
      { bg: string; text: string; border: string; dot: string }
    > = {
      Active: {
        bg: 'bg-[#eaf8f0]',
        text: 'text-[#0f7b4b]',
        border: 'border-[#b9ebd0]',
        dot: 'bg-[#0f7b4b]'
      },
      Inventory: {
        bg: 'bg-[#eff6ff]',
        text: 'text-[#1d4ed8]',
        border: 'border-[#bfdbfe]',
        dot: 'bg-[#1d4ed8]'
      },
      'In Maintenance': {
        bg: 'bg-[#fff7ed]',
        text: 'text-[#b45309]',
        border: 'border-[#fed7aa]',
        dot: 'bg-[#b45309]'
      },
      Suspended: {
        bg: 'bg-[#fef2f2]',
        text: 'text-[#dc2626]',
        border: 'border-[#fecaca]',
        dot: 'bg-[#dc2626]'
      },
      Decommissioned: {
        bg: 'bg-[#f1f5f9]',
        text: 'text-[#475569]',
        border: 'border-[#cbd5e1]',
        dot: 'bg-[#475569]'
      },
      'Pending Hardware Review': {
        bg: 'bg-[#fefce8]',
        text: 'text-[#a16207]',
        border: 'border-[#fde047]',
        dot: 'bg-[#ca8a04]'
      }
    };
    const style = map[status] || map.Inventory;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${style.bg} ${style.text} ${style.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {status}
      </span>
    );
  };


  // Linked connections for inspected device
  const inspectedConnections = useMemo(() => {
    if (!inspectedDevice) return [];
    return store.connections.filter(
      (c) =>
        c.memberIds?.includes(inspectedDevice.id) ||
        c.hardwareId === inspectedDevice.id ||
        c.parentId === inspectedDevice.id
    );
  }, [inspectedDevice, store.connections]);

  return (
    <div className="h-full flex flex-col bg-[#f5f7fa] text-[#17212b] overflow-hidden relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-[#17212b] text-white text-xs font-medium shadow-xl border border-slate-700">
          {toastMsg.type === 'success' ? (
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 px-[22px] pt-[14px] pb-[14px] overflow-hidden">
        {/* Page Header */}
        <div className="mb-3 shrink-0">
          <div className="text-[11px] font-medium text-[#8291a0] mb-0.5">
            Model Master / <span className="text-[#5c6b7a]">Devices</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-bold text-[#17212b] leading-tight">Devices</h1>
              <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                Physical and logical Gateway Devices registered for vehicle and facility telemetry.
              </p>
            </div>
          </div>
        </div>

        {/* Shared Card Container */}
        <div className="flex-1 flex flex-col min-h-0 bg-white border border-[#e3e8ee] rounded-[10px] shadow-[0_1px_2px_rgba(18,28,38,0.04)] overflow-hidden">
          {/* Toolbar Row */}
          <div className="px-3.5 py-2.5 border-b border-[#e3e8ee] flex items-center flex-wrap gap-2 shrink-0">
            {/* Search Input */}
            <div className="relative w-[270px]">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8291a0]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search devices name, ID, model, serial..."
                className="w-full h-[33px] pl-8 pr-7 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] placeholder:text-[#8291a0] focus:outline-none focus:border-[#e56b38]"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8291a0] hover:text-[#17212b] cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {isPlatformAdmin && (
              <div className="inline-flex items-center gap-1.5 h-[33px] px-2.5 rounded-[7px] border border-[#d6dfe8] bg-[#f8fafc]">
                <Building2 size={13} className="text-[#e56b38] shrink-0" />
                <span className="text-[11px] font-medium text-[#5c6b7a] whitespace-nowrap">Organization Name:</span>
                <select
                  value={filterCompany}
                  onChange={(e) => {
                    setFilterCompany(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-[12px] font-semibold text-[#17212b] focus:outline-none cursor-pointer pr-1"
                >
                  <option value="All">All Organizations</option>
                  {availableOrganizations.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 1. Filters */}
            <button
              onClick={() => setActiveDrawer('filters')}
              className={`h-[33px] px-3 rounded-[7px] border text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeFilterCount > 0
                  ? 'border-[#f1b79d] bg-[#fff4ee] text-[#9e431c]'
                  : 'border-[#d6dfe8] bg-white text-[#17212b] hover:bg-[#f8fafc]'
              }`}
            >
              <Filter size={13} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#e56b38] text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* 2. Column Catalogue */}
            <ColumnCataloguePopover
              align="left"
              columns={DEVICE_COLUMNS.map((c) => ({
                key: c.key,
                label: c.label,
                required: c.key === 'name',
                category:
                  c.key === 'company' || c.key === 'name' || c.key === 'deviceId' || c.key === 'kind'
                    ? 'IDENTITY'
                    : c.key === 'serial' || c.key === 'imei'
                    ? 'IDENTIFIERS'
                    : c.key === 'registeredAt' || c.key === 'updatedAt'
                    ? 'TIMESTAMPS'
                    : 'HARDWARE & PROTOCOL',
              }))}
              visibleKeys={DEVICE_COLUMNS.filter((c) => !hiddenCols.includes(c.key)).map((c) => c.key)}
              onChangeVisibleKeys={(nextKeys) =>
                setHiddenCols(DEVICE_COLUMNS.filter((c) => !nextKeys.includes(c.key)).map((c) => c.key))
              }
              defaultKeys={DEVICE_COLUMNS.map((c) => c.key)}
              roleDefaultKeys={DEVICE_COLUMNS.map((c) => c.key)}
              defaultPinnedKeys={['name']}
              onToast={(msg) => showToast(msg, 'success')}
            />

            {/* 3. Density (toggles page size 20 <-> 10) */}
            <button
              onClick={() => {
                setPageSize((prev) => (prev === 20 ? 10 : 20));
                setCurrentPage(1);
              }}
              className={`h-[33px] px-3 rounded-[7px] border text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                pageSize === 10
                  ? 'border-[#f1b79d] bg-[#fff4ee] text-[#9e431c]'
                  : 'border-[#d6dfe8] bg-white text-[#17212b] hover:bg-[#f8fafc]'
              }`}
              title="Toggle row density (20 vs 10 rows per page)"
            >
              <Rows size={13} />
              <span>Density</span>
            </button>

            {/* 4. Saved views */}
            <button
              onClick={() => setActiveDrawer('saved-views')}
              className="h-[33px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-medium text-[#17212b] hover:bg-[#f8fafc] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Bookmark size={13} />
              <span>Saved views</span>
            </button>

            {/* 5. Refresh */}
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCompany('All');
                setFilterKind('All');
                setFilterManufacturer('All');
                setFilterLifecycle('All');
                setSelectedIds(new Set());
                setCurrentPage(1);
                showToast('Devices table refreshed.');
              }}
              className="h-[33px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-medium text-[#17212b] hover:bg-[#f8fafc] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>

            <div className="flex-1" />

            {/* 6. Bulk actions */}
            <button
              onClick={() => setActiveDrawer('bulk')}
              className={`h-[33px] px-3 rounded-[7px] border text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                selectedIds.size > 0
                  ? 'border-[#f1b79d] bg-[#fff4ee] text-[#9e431c]'
                  : 'border-[#d6dfe8] bg-white text-[#17212b] hover:bg-[#f8fafc]'
              }`}
            >
              <Layers size={13} />
              <span>Bulk actions</span>
              {selectedIds.size > 0 && (
                <span className="px-1.5 rounded-full bg-[#e56b38] text-white text-[10px] font-bold">
                  {selectedIds.size}
                </span>
              )}
            </button>

            {/* 7. Import */}
            <button
              onClick={() => setActiveDrawer('import')}
              className="h-[33px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-medium text-[#17212b] hover:bg-[#f8fafc] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Upload size={13} />
              <span>Import</span>
            </button>

            {/* 8. Export */}
            <button
              onClick={() => {
                downloadModalCsv('FleetRobo_devices_export.csv', visibleColumns, sortedDevices);
                showToast(`Exported ${sortedDevices.length} Device records to FleetRobo_devices_export.csv`);
              }}
              className="h-[33px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-medium text-[#17212b] hover:bg-[#f8fafc] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} />
              <span>Export</span>
            </button>

            {/* 9. Primary CTA: Create Device */}
            <button
              onClick={handleOpenCreate}
              className="h-[33px] px-3.5 rounded-[7px] bg-[#e56b38] hover:bg-[#d15b2a] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Device</span>
            </button>
          </div>

          {/* Status Line Below Toolbar */}
          <div className="px-3.5 py-1.5 bg-[#f8fafc] border-b border-[#e3e8ee] text-[11px] text-[#5c6b7a] flex items-center justify-between shrink-0">
            <span>
              <strong className="font-semibold text-[#17212b]">{selectedIds.size}</strong> selected · Existing FleetRobo design · Sample/demo data; no actual hardware network is contacted
            </span>
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilterCompany('All');
                  setFilterKind('All');
                  setFilterManufacturer('All');
                  setFilterLifecycle('All');
                }}
                className="text-[#9e431c] hover:underline font-medium cursor-pointer"
              >
                Clear active filters ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Scrollable Table Viewport */}
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-[#f8fafc] border-b border-[#e3e8ee]">
                <tr>
                  <th className="w-[40px] px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={allCurrentSelected}
                      onChange={toggleSelectAllOnPage}
                      className="rounded border-[#cbd5e1] text-[#e56b38] focus:ring-[#e56b38] cursor-pointer"
                    />
                  </th>
                  {visibleColumns.map((col) => {
                    const isSorted = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        style={{ minWidth: col.minWidth }}
                        onClick={() => handleSort(col.key)}
                        className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#5c6b7a] hover:text-[#17212b] cursor-pointer select-none whitespace-nowrap"
                      >
                        <div className="inline-flex items-center gap-1">
                          <span>{col.label}</span>
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ArrowUp size={12} className="text-[#e56b38]" />
                            ) : (
                              <ArrowDown size={12} className="text-[#e56b38]" />
                            )
                          ) : (
                            <ArrowUpDown size={11} className="text-[#8291a0] opacity-60" />
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="sticky right-0 bg-[#f8fafc] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#5c6b7a] text-right border-l border-[#e3e8ee] w-[76px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f5] text-[12px]">
                {currentRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + 2}
                      className="px-6 py-12 text-center text-[#5c6b7a]"
                    >
                      No Devices match the current search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  currentRows.map((row) => {
                    const isSelected = selectedIds.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-[#fff4ee]/60' : 'hover:bg-[#f8fafc]'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(row.id)}
                            className="rounded border-[#cbd5e1] text-[#e56b38] focus:ring-[#e56b38] cursor-pointer"
                          />
                        </td>
                        {visibleColumns.map((col) => {
                          if (col.key === 'company') {
                            return (
                              <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 font-medium text-[#17212b]">
                                  <Building2 size={13} className="text-[#8291a0] shrink-0" />
                                  <span>{row.company || '—'}</span>
                                </span>
                              </td>
                            );
                          }
                          if (col.key === 'name') {
                            return (
                              <td key={col.key} className="px-3 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => openInspector(row)}
                                  className="text-left group cursor-pointer"
                                >
                                  <div className="font-semibold text-[#17212b] group-hover:text-[#9e431c] transition-colors">
                                    {row.name.replace(/\s*·\s*.*$/, '')}
                                  </div>
                                  <div className="text-[11px] text-[#8291a0]">
                                    {row.deviceId} · {row.manufacturer} {row.modelText}
                                  </div>
                                </button>
                              </td>
                            );
                          }
                          if (col.key === 'hardwareLifecycle') {
                            return (
                              <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                                {renderLifecycleBadge(row.hardwareLifecycle)}
                              </td>
                            );
                          }
                          if (col.key === 'imei') {
                            return (
                              <td
                                key={col.key}
                                className="px-3 py-2.5 font-mono text-[11.5px] text-[#5c6b7a] whitespace-nowrap"
                              >
                                {row.imei || '—'}
                              </td>
                            );
                          }
                          if (col.key === 'deviceId' || col.key === 'serial') {
                            return (
                              <td
                                key={col.key}
                                className="px-3 py-2.5 font-mono text-[11.5px] text-[#17212b] whitespace-nowrap"
                              >
                                {(row as any)[col.key]}
                              </td>
                            );
                          }
                          return (
                            <td
                              key={col.key}
                              className="px-3 py-2.5 text-[#17212b] whitespace-nowrap"
                            >
                              {(row as any)[col.key] || '—'}
                            </td>
                          );
                        })}
                        <td className="sticky right-0 bg-white px-3 py-2.5 text-right border-l border-[#edf1f5] whitespace-nowrap">
                          <div className="inline-flex items-center justify-end">
                            <RowActionMenu
                              ariaLabel={`Actions for ${row.name}`}
                              items={[
                                {
                                  id: 'view',
                                  label: 'View details',
                                  icon: <Eye size={14} className="text-slate-400" />,
                                  onClick: () => openInspector(row),
                                },
                                {
                                  id: 'edit',
                                  label: 'Edit device',
                                  icon: <Edit2 size={14} className="text-slate-400" />,
                                  onClick: () => handleOpenEdit(row),
                                },
                                {
                                  id: 'delete',
                                  label: 'Delete device',
                                  icon: <Trash2 size={14} />,
                                  tone: 'danger',
                                  dividerBefore: true,
                                  onClick: () => setDeviceToDelete(row),
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

          {/* Pagination Footer */}
          <div className="px-4 py-2.5 border-t border-[#e3e8ee] bg-white flex items-center justify-between text-[12px] text-[#5c6b7a] shrink-0">
            <div>
              Showing{' '}
              <strong className="font-semibold text-[#17212b]">
                {totalRecords === 0 ? 0 : startIdx + 1}–
                {Math.min(startIdx + pageSize, totalRecords)}
              </strong>{' '}
              of <strong className="font-semibold text-[#17212b]">{totalRecords}</strong> records
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-[28px] px-2 rounded border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] focus:outline-none focus:border-[#e56b38] cursor-pointer"
                >
                  {[10, 12, 20, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 rounded border border-[#d6dfe8] hover:bg-[#f8fafc] disabled:opacity-40 cursor-pointer"
                >
                  First
                </button>
                <button
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded border border-[#d6dfe8] hover:bg-[#f8fafc] disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <span className="px-2.5 font-medium text-[#17212b]">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded border border-[#d6dfe8] hover:bg-[#f8fafc] disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 rounded border border-[#d6dfe8] hover:bg-[#f8fafc] disabled:opacity-40 cursor-pointer"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          RIGHT-SIDE DRAWERS
         ===================================================================== */}
      {activeDrawer && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/35 backdrop-blur-[1px]">
          <div
            className="flex-1"
            onClick={() => setActiveDrawer(null)}
          />

          {/* 1. FILTERS DRAWER */}
          {activeDrawer === 'filters' && (
            <div className="w-[520px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-5 py-4 border-b border-[#e3e8ee] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">Filter Devices</h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    Narrow down registered Gateway Devices by category, manufacturer, or inventory status.
                  </p>
                </div>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-lg text-[#5c6b7a] hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {isPlatformAdmin && (
                  <div>
                    <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                      Organization Name
                    </label>
                    <select
                      value={filterCompany}
                      onChange={(e) => {
                        setFilterCompany(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                    >
                      <option value="All">All Organizations</option>
                      {availableOrganizations.map((org) => (
                        <option key={org} value={org}>
                          {org}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                    Device category
                  </label>
                  <select
                    value={filterKind}
                    onChange={(e) => {
                      setFilterKind(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                  >
                    <option value="All">All</option>
                    {GATEWAY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                    Vendor / Manufacturer
                  </label>
                  <select
                    value={filterManufacturer}
                    onChange={(e) => {
                      setFilterManufacturer(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                  >
                    <option value="All">All</option>
                    {ALL_MANUFACTURERS.map((mfg) => (
                      <option key={mfg} value={mfg}>
                        {mfg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                    Inventory status
                  </label>
                  <select
                    value={filterLifecycle}
                    onChange={(e) => {
                      setFilterLifecycle(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                  >
                    <option value="All">All</option>
                    {HARDWARE_LIFECYCLE_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-[#e3e8ee] bg-[#f8fafc] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setFilterCompany('All');
                    setFilterKind('All');
                    setFilterManufacturer('All');
                    setFilterLifecycle('All');
                    setCurrentPage(1);
                  }}
                  className="px-3.5 py-2 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#5c6b7a] hover:text-[#17212b] cursor-pointer"
                >
                  Reset filters
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="px-4 py-2 rounded-[7px] bg-[#e56b38] hover:bg-[#d15b2a] text-white text-[12px] font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* 3. SAVED VIEWS DRAWER */}
          {activeDrawer === 'saved-views' && (
            <div className="w-[520px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-5 py-4 border-b border-[#e3e8ee] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">Saved Views · Devices</h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    Save current search, filter, sort, and column configurations or load an existing view.
                  </p>
                </div>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-lg text-[#5c6b7a] hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-5">
                <div className="p-3.5 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] space-y-2.5">
                  <label className="block text-[12px] font-semibold text-[#17212b]">
                    Save current configuration as a view
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newViewName}
                      onChange={(e) => setNewViewName(e.target.value)}
                      placeholder="e.g., Hikvision CCTV Inventory"
                      className="flex-1 h-[34px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                    />
                    <button
                      onClick={() => {
                        if (!newViewName.trim()) return;
                        const created: SavedModalView = {
                          id: `sv-dev-${Date.now()}`,
                          pageId: 'devices',
                          name: newViewName.trim(),
                          query: searchQuery,
                          filters: {
                            kind: filterKind,
                            manufacturer: filterManufacturer,
                            hardwareLifecycle: filterLifecycle
                          },
                          sortKey,
                          sortDir,
                          hiddenCols
                        };
                        setSavedViews((prev) => [created, ...prev]);
                        setNewViewName('');
                        showToast(`Saved view "${created.name}".`);
                      }}
                      className="h-[34px] px-3.5 rounded-[7px] bg-[#e56b38] hover:bg-[#d15b2a] text-white text-[12px] font-semibold cursor-pointer"
                    >
                      Save view
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#5c6b7a]">
                    Available Views
                  </div>
                  {savedViews
                    .filter((v) => v.pageId === 'devices')
                    .map((view) => (
                      <div
                        key={view.id}
                        className="p-3 rounded-lg border border-[#e3e8ee] flex items-center justify-between hover:bg-[#f8fafc]"
                      >
                        <div>
                          <div className="text-[13px] font-semibold text-[#17212b]">
                            {view.name}
                          </div>
                          <div className="text-[11px] text-[#5c6b7a]">
                            Query: {view.query || 'None'} · Sort: {view.sortKey} ({view.sortDir})
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSearchQuery(view.query || '');
                              setFilterKind(view.filters.kind || 'All');
                              setFilterManufacturer(view.filters.manufacturer || 'All');
                              setFilterLifecycle(view.filters.hardwareLifecycle || 'All');
                              setSortKey(view.sortKey || 'deviceId');
                              setSortDir(view.sortDir || 'asc');
                              setHiddenCols(view.hiddenCols || []);
                              setCurrentPage(1);
                              setActiveDrawer(null);
                              showToast(`Applied view "${view.name}".`);
                            }}
                            className="px-3 py-1 rounded border border-[#f1b79d] bg-[#fff4ee] text-[#9e431c] text-[11px] font-semibold cursor-pointer"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() =>
                              setSavedViews((prev) => prev.filter((x) => x.id !== view.id))
                            }
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Delete saved view"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. CREATE / EDIT DEVICE DRAWER (690px) */}
          {activeDrawer === 'form' && (
            <form
              onSubmit={handleSaveDevice}
              className="w-[690px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50"
            >
              <div className="px-6 py-4 border-b border-[#e3e8ee] flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">
                    {editingDevice ? `Edit Device · ${editingDevice.deviceId}` : 'Create Device'}
                  </h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    Register physical gateway hardware in FleetRobo inventory. Communication links and vehicle pairings are configured in Modal Mapping.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-lg text-[#5c6b7a] hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {formError && (
                  <div className="p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[12px] font-medium flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Section 1: 1. Basic information */}
                <div className="space-y-3.5">
                  <div className="text-[12px] font-bold uppercase tracking-wider text-[#9e431c] border-b border-[#e3e8ee] pb-1.5">
                    1. Basic information
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <FieldLabel
                        label="Organization Name"
                        required
                        tooltip={
                          isPlatformAdmin
                            ? 'Select the parent or child organization that will own this physical device.'
                            : 'Organization prefilled from your active top-bar company context.'
                        }
                      />
                      <select
                        value={formCompany}
                        disabled={!isPlatformAdmin}
                        onChange={(e) => setFormCompany(e.target.value)}
                        className={`w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] text-[12px] font-semibold text-[#17212b] focus:outline-none focus:border-[#e56b38] ${
                          !isPlatformAdmin ? 'bg-[#f8fafc] text-[#475569] cursor-not-allowed' : 'bg-white'
                        }`}
                      >
                        {Array.from(new Set([formCompany, ...availableOrganizations].filter(Boolean))).map((org) => (
                          <option key={org} value={org}>
                            {org}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel
                        label="Device category"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.device.kind}
                      />
                      <select
                        value={formKind}
                        onChange={(e) => handleCategoryChange(e.target.value as GatewayCategory)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                      >
                        {formEnabledCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel
                        label="Device name"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.device.name}
                      />
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder={`e.g. ${formKind} — ${formManufacturer} ${formModelText}`}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] text-[12px] focus:outline-none focus:border-[#e56b38]"
                      />
                    </div>
                    <div>
                      <FieldLabel
                        label="Device ID"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.device.deviceId}
                      />
                      <input
                        type="text"
                        required
                        value={formDeviceId}
                        onChange={(e) => setFormDeviceId(e.target.value)}
                        placeholder="e.g. GTW-9001"
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] font-mono text-[12px] focus:outline-none focus:border-[#e56b38]"
                      />
                    </div>
                    {availableIdentifierTypes.some((t) => t.toUpperCase() === 'IMEI') && (
                      <div>
                        <FieldLabel
                          label="IMEI"
                          tooltip="15-digit cellular IMEI identifier (falls back to Device ID if left blank)"
                        />
                        <input
                          type="text"
                          value={formImei}
                          onChange={(e) => setFormImei(e.target.value)}
                          placeholder="e.g. 358742091122334"
                          className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] font-mono text-[12px] focus:outline-none focus:border-[#e56b38]"
                        />
                      </div>
                    )}
                    {availableIdentifierTypes.some((t) => t.toUpperCase() === 'SERIAL NUMBER') && (
                      <div>
                        <FieldLabel
                          label="Serial Number"
                          tooltip="Hardware serial number (falls back to Device ID if left blank)"
                        />
                        <input
                          type="text"
                          value={formSerial}
                          onChange={(e) => setFormSerial(e.target.value)}
                          placeholder="e.g. SN-994021"
                          className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] font-mono text-[12px] focus:outline-none focus:border-[#e56b38]"
                        />
                      </div>
                    )}
                    {availableIdentifierTypes.some(
                      (t) =>
                        t.toUpperCase() !== 'IMEI' &&
                        t.toUpperCase() !== 'SERIAL NUMBER' &&
                        t.toUpperCase() !== 'DEVICE ID'
                    ) && (
                      <div>
                        <FieldLabel
                          label={
                            availableIdentifierTypes.find(
                              (t) =>
                                t.toUpperCase() !== 'IMEI' &&
                                t.toUpperCase() !== 'SERIAL NUMBER' &&
                                t.toUpperCase() !== 'DEVICE ID'
                            ) || 'Hardware Identifier'
                          }
                          tooltip="Hardware identifier configured in Model Category Master"
                        />
                        <input
                          type="text"
                          value={formSerial}
                          onChange={(e) => setFormSerial(e.target.value)}
                          placeholder="e.g. 5C:02:72:11:22:33"
                          className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] font-mono text-[12px] focus:outline-none focus:border-[#e56b38]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: 2. Manufacturer and model */}
                <div className="space-y-3.5">
                  <div className="text-[12px] font-bold uppercase tracking-wider text-[#9e431c] border-b border-[#e3e8ee] pb-1.5">
                    2. Manufacturer and model
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel
                        label="Vendor / Manufacturer"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.device.manufacturer}
                      />
                      <select
                        value={formManufacturer}
                        onChange={(e) => handleManufacturerChange(e.target.value)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                      >
                        {availableManufacturers.map((mfg) => (
                          <option key={mfg} value={mfg}>
                            {mfg}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel
                        label="Model"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.device.modelText}
                      />
                      <select
                        value={formModelText}
                        onChange={(e) => handleModelChange(e.target.value)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                      >
                        {availableModels.map((m) => (
                          <option key={m.model} value={m.model}>
                            {m.model}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel
                        label="Mode (Multi-select)"
                        tooltip={MODAL_FIELD_TOOLTIPS.device.mode}
                      />
                      <div ref={deviceModeDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setDeviceModeMenuOpen((prev) => !prev)}
                          className="w-full min-h-[36px] px-2.5 py-1.5 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] flex items-center justify-between gap-1.5 hover:border-[#94a3b8] focus:outline-none focus:border-[#e56b38] cursor-pointer"
                        >
                          <div className="flex flex-wrap items-center gap-1 flex-1 text-left">
                            {formModes.length === 0 ? (
                              <span className="text-[#8291a0]">-- Select Modes --</span>
                            ) : (
                              formModes.map((modeOpt) => (
                                <span
                                  key={modeOpt}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#fff4ee] text-[#9e431c] border border-[#e56b38]/35 text-[11px] font-semibold"
                                >
                                  <span>{modeOpt}</span>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFormModes((prev) => prev.filter((m) => m !== modeOpt));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setFormModes((prev) => prev.filter((m) => m !== modeOpt));
                                      }
                                    }}
                                    className="text-[#9e431c] hover:text-[#17212b] cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </span>
                                </span>
                              ))
                            )}
                          </div>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-[#5c6b7a] shrink-0 transition-transform ${
                              deviceModeMenuOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {deviceModeMenuOpen && (
                          <div className="absolute left-0 right-0 mt-1 rounded-lg border border-[#d6dfe8] bg-white shadow-xl z-50 overflow-hidden">
                            <div className="p-2 border-b border-[#edf1f5] flex items-center gap-1.5 bg-[#f8fafc]">
                              <div className="relative flex-1">
                                <Search className="w-3 h-3 text-[#8291a0] absolute left-2 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={deviceModeSearch}
                                  onChange={(e) => setDeviceModeSearch(e.target.value)}
                                  placeholder="Search or filter modes..."
                                  className="w-full h-7 pl-6 pr-2 rounded border border-[#d6dfe8] bg-white text-[11px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                                />
                              </div>
                              {formModes.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setFormModes([])}
                                  className="text-[11px] font-semibold text-[#dc2626] hover:underline px-1 cursor-pointer shrink-0"
                                >
                                  Clear
                                </button>
                              )}
                            </div>

                            <div className="max-h-44 overflow-y-auto p-1.5 space-y-0.5">
                              {availableModes
                                .filter((opt) =>
                                  opt.toLowerCase().includes(deviceModeSearch.trim().toLowerCase())
                                )
                                .map((modeOpt) => {
                                  const checked = formModes.includes(modeOpt);
                                  return (
                                    <button
                                      key={modeOpt}
                                      type="button"
                                      onClick={() =>
                                        setFormModes((prev) =>
                                          checked
                                            ? prev.filter((m) => m !== modeOpt)
                                            : [...prev, modeOpt]
                                        )
                                      }
                                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[12px] transition-colors cursor-pointer ${
                                        checked
                                          ? 'bg-[#fff4ee] text-[#9e431c] font-semibold'
                                          : 'text-[#17212b] hover:bg-[#f8fafc]'
                                      }`}
                                    >
                                      <span className="truncate">{modeOpt}</span>
                                      <span
                                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                          checked
                                            ? 'bg-[#e56b38] border-[#e56b38] text-white'
                                            : 'border-[#cbd5e1] bg-white'
                                        }`}
                                      >
                                        {checked && <Check className="w-2.5 h-2.5" />}
                                      </span>
                                    </button>
                                  );
                                })}

                              {deviceModeSearch.trim() &&
                                !availableModes.some(
                                  (opt) =>
                                    opt.toLowerCase() === deviceModeSearch.trim().toLowerCase()
                                ) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const customVal = deviceModeSearch.trim();
                                      setCustomDeviceModes(saveCustomDeviceMode(customVal));
                                      setFormModes((prev) =>
                                        prev.includes(customVal) ? prev : [...prev, customVal]
                                      );
                                      setDeviceModeSearch('');
                                    }}
                                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#fff4ee] text-[#9e431c] hover:bg-orange-100 text-[12px] font-semibold cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add custom mode "{deviceModeSearch.trim()}"</span>
                                  </button>
                                )}
                            </div>

                            <div className="border-t border-[#edf1f5] p-1.5 bg-[#f8fafc]">
                              {!showCustomDeviceModeInput ? (
                                <button
                                  type="button"
                                  onClick={() => setShowCustomDeviceModeInput(true)}
                                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold text-[#9e431c] hover:bg-[#fff4ee] cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Custom / Other Mode</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={customDeviceModeText}
                                    onChange={(e) => setCustomDeviceModeText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && customDeviceModeText.trim()) {
                                        e.preventDefault();
                                        const customVal = customDeviceModeText.trim();
                                        setCustomDeviceModes(saveCustomDeviceMode(customVal));
                                        setFormModes((prev) =>
                                          prev.includes(customVal) ? prev : [...prev, customVal]
                                        );
                                        setCustomDeviceModeText('');
                                        setShowCustomDeviceModeInput(false);
                                      }
                                    }}
                                    placeholder="Enter custom mode..."
                                    className="flex-1 h-7 px-2 rounded border border-[#d6dfe8] bg-white text-[11px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                                  />
                                  <button
                                    type="button"
                                    disabled={!customDeviceModeText.trim()}
                                    onClick={() => {
                                      const customVal = customDeviceModeText.trim();
                                      if (!customVal) return;
                                      setCustomDeviceModes(saveCustomDeviceMode(customVal));
                                      setFormModes((prev) =>
                                        prev.includes(customVal) ? prev : [...prev, customVal]
                                      );
                                      setCustomDeviceModeText('');
                                      setShowCustomDeviceModeInput(false);
                                    }}
                                    className="h-7 px-2.5 rounded bg-[#e56b38] hover:bg-[#d15b2a] disabled:opacity-40 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                                  >
                                    Add
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <FieldLabel
                        label="Platform Protocol"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.device.platformProtocol}
                      />
                      <div ref={deviceProtocolDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setDeviceProtocolMenuOpen((prev) => !prev)}
                          className="w-full min-h-[36px] px-2.5 py-1.5 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] flex items-center justify-between gap-1.5 hover:border-[#94a3b8] focus:outline-none focus:border-[#e56b38] cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 flex-1 text-left min-w-0">
                            {formProtocols.length === 0 ? (
                              <span className="text-[#8291a0]">-- Select Platform Protocol --</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold truncate">
                                <span>{formProtocols[0]}</span>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFormProtocols([]);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setFormProtocols([]);
                                    }
                                  }}
                                  className="text-amber-700 hover:text-[#17212b] cursor-pointer ml-0.5"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </span>
                              </span>
                            )}
                          </div>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-[#5c6b7a] shrink-0 transition-transform ${
                              deviceProtocolMenuOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {deviceProtocolMenuOpen && (
                          <div className="absolute left-0 right-0 mt-1 rounded-lg border border-[#d6dfe8] bg-white shadow-xl z-50 overflow-hidden">
                            <div className="p-2 border-b border-[#edf1f5] flex items-center gap-1.5 bg-[#f8fafc]">
                              <div className="relative flex-1">
                                <Search className="w-3 h-3 text-[#8291a0] absolute left-2 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={deviceProtocolSearch}
                                  onChange={(e) => setDeviceProtocolSearch(e.target.value)}
                                  placeholder="Search protocols..."
                                  className="w-full h-7 pl-6 pr-2 rounded border border-[#d6dfe8] bg-white text-[11px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                                />
                              </div>
                              {formProtocols.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setFormProtocols([])}
                                  className="text-[11px] font-semibold text-[#dc2626] hover:underline px-1 cursor-pointer shrink-0"
                                >
                                  Clear
                                </button>
                              )}
                            </div>

                            <div className="max-h-44 overflow-y-auto p-1.5 space-y-0.5">
                              {availableProtocols
                                .filter((opt) =>
                                  opt
                                    .toLowerCase()
                                    .includes(deviceProtocolSearch.trim().toLowerCase())
                                )
                                .map((protoOpt) => {
                                  const checked = formProtocols.length > 0 && formProtocols[0] === protoOpt;
                                  return (
                                    <button
                                      key={protoOpt}
                                      type="button"
                                      onClick={() => {
                                        setFormProtocols([protoOpt]);
                                        setDeviceProtocolMenuOpen(false);
                                      }}
                                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[12px] transition-colors cursor-pointer ${
                                        checked
                                          ? 'bg-amber-50 text-amber-800 font-semibold'
                                          : 'text-[#17212b] hover:bg-[#f8fafc]'
                                      }`}
                                    >
                                      <span className="truncate">{protoOpt}</span>
                                      <span
                                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                          checked
                                            ? 'bg-[#e56b38] border-[#e56b38] text-white'
                                            : 'border-[#cbd5e1] bg-white'
                                        }`}
                                      >
                                        {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                      </span>
                                    </button>
                                  );
                                })}

                              {deviceProtocolSearch.trim() &&
                                !availableProtocols.some(
                                  (opt) =>
                                    opt.toLowerCase() ===
                                    deviceProtocolSearch.trim().toLowerCase()
                                ) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const customVal = deviceProtocolSearch.trim();
                                      setCustomDeviceProtocols(
                                        saveCustomPlatformProtocol(customVal)
                                      );
                                      setFormProtocols([customVal]);
                                      setDeviceProtocolSearch('');
                                      setDeviceProtocolMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 text-[12px] font-semibold cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Select custom protocol "{deviceProtocolSearch.trim()}"</span>
                                  </button>
                                )}
                            </div>

                            <div className="border-t border-[#edf1f5] p-1.5 bg-[#f8fafc]">
                              {!showCustomDeviceProtocolInput ? (
                                <button
                                  type="button"
                                  onClick={() => setShowCustomDeviceProtocolInput(true)}
                                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold text-[#9e431c] hover:bg-[#fff4ee] cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Custom / Other Protocol</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={customDeviceProtocolText}
                                    onChange={(e) => setCustomDeviceProtocolText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && customDeviceProtocolText.trim()) {
                                        e.preventDefault();
                                        const customVal = customDeviceProtocolText.trim();
                                        setCustomDeviceProtocols(
                                          saveCustomPlatformProtocol(customVal)
                                        );
                                        setFormProtocols([customVal]);
                                        setCustomDeviceProtocolText('');
                                        setShowCustomDeviceProtocolInput(false);
                                        setDeviceProtocolMenuOpen(false);
                                      }
                                    }}
                                    placeholder="Enter custom protocol..."
                                    className="flex-1 h-7 px-2 rounded border border-[#d6dfe8] bg-white text-[11px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                                  />
                                  <button
                                    type="button"
                                    disabled={!customDeviceProtocolText.trim()}
                                    onClick={() => {
                                      const customVal = customDeviceProtocolText.trim();
                                      if (!customVal) return;
                                      setCustomDeviceProtocols(
                                        saveCustomPlatformProtocol(customVal)
                                      );
                                      setFormProtocols([customVal]);
                                      setCustomDeviceProtocolText('');
                                      setShowCustomDeviceProtocolInput(false);
                                      setDeviceProtocolMenuOpen(false);
                                    }}
                                    className="h-7 px-2.5 rounded bg-[#e56b38] hover:bg-[#d15b2a] disabled:opacity-40 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                                  >
                                    Add
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: 3. Additional metadata */}
                <div className="space-y-3.5">
                  <div className="text-[12px] font-bold uppercase tracking-wider text-[#9e431c] border-b border-[#e3e8ee] pb-1.5">
                    3. Additional metadata
                  </div>
                  <div>
                    <FieldLabel
                      label="Notes"
                      tooltip={MODAL_FIELD_TOOLTIPS.device.notes}
                    />
                    <textarea
                      rows={3}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Optional internal notes for setup, installation context, and change history..."
                      className="w-full p-3 rounded-[7px] border border-[#d6dfe8] text-[12px] focus:outline-none focus:border-[#e56b38]"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#e3e8ee] bg-[#f8fafc] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="px-4 py-2 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#5c6b7a] hover:text-[#17212b] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[7px] bg-[#e56b38] hover:bg-[#d15b2a] text-white text-[12px] font-semibold shadow-xs cursor-pointer"
                >
                  {editingDevice ? 'Save changes' : 'Create Device'}
                </button>
              </div>
            </form>
          )}

          {/* 5. RECORD DETAILS INSPECTOR DRAWER (690px) */}
          {activeDrawer === 'inspector' && inspectedDevice && (
            <div className="w-[690px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-6 py-4 border-b border-[#e3e8ee] flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[16px] font-bold text-[#17212b]">
                      {inspectedDevice.name.replace(/\s*·\s*.*$/, '')}
                    </h2>
                  </div>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5 font-mono">
                    {inspectedDevice.deviceId} · {inspectedDevice.kind} · {inspectedDevice.manufacturer}{' '}
                    {inspectedDevice.modelText}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(inspectedDevice)}
                    className="h-[32px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#17212b] hover:bg-[#f8fafc] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setActiveDrawer(null)}
                    className="p-1.5 rounded-lg text-[#5c6b7a] hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Inspector Internal Tabs */}
              <div className="px-6 border-b border-[#e3e8ee] bg-[#f8fafc] flex items-center gap-5 shrink-0">
                <button
                  onClick={() => setInspectorTab('overview')}
                  className={`py-2.5 text-[12px] font-semibold border-b-2 transition-colors cursor-pointer ${
                    inspectorTab === 'overview'
                      ? 'border-[#e56b38] text-[#9e431c]'
                      : 'border-transparent text-[#5c6b7a] hover:text-[#17212b]'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setInspectorTab('linked')}
                  className={`py-2.5 text-[12px] font-semibold border-b-2 transition-colors cursor-pointer ${
                    inspectorTab === 'linked'
                      ? 'border-[#e56b38] text-[#9e431c]'
                      : 'border-transparent text-[#5c6b7a] hover:text-[#17212b]'
                  }`}
                >
                  Linked records ({inspectedConnections.length})
                </button>
                <button
                  onClick={() => setInspectorTab('activity')}
                  className={`py-2.5 text-[12px] font-semibold border-b-2 transition-colors cursor-pointer ${
                    inspectorTab === 'activity'
                      ? 'border-[#e56b38] text-[#9e431c]'
                      : 'border-transparent text-[#5c6b7a] hover:text-[#17212b]'
                  }`}
                >
                  Activity / History
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {inspectorTab === 'overview' && (
                  <>
                    <div className="grid grid-cols-2 gap-3.5 p-4 rounded-xl border border-[#e3e8ee] bg-[#f8fafc]">
                      {[
                        ['Device name', inspectedDevice.name.replace(/\s*·\s*.*$/, '')],
                        ['Device ID', inspectedDevice.deviceId],
                        ['Device category', inspectedDevice.kind],
                        ['Vendor / Manufacturer', inspectedDevice.manufacturer],
                        ['Model', inspectedDevice.modelText],
                        ['Mode', inspectedDevice.mode],
                        ['Platform protocol', inspectedDevice.platformProtocol || '—'],
                        ...(inspectedDevice.imei ? [['IMEI', inspectedDevice.imei]] : []),
                        ...(inspectedDevice.serial ? [['Serial number', inspectedDevice.serial]] : []),
                        ...(!inspectedDevice.imei && !inspectedDevice.serial
                          ? [['Identifier', inspectedDevice.deviceId || '—']]
                          : [])
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div className="text-[11px] text-[#5c6b7a]">{k}</div>
                          <div className="text-[12px] font-semibold text-[#17212b] mt-0.5 break-words">
                            {v}
                          </div>
                        </div>
                      ))}
                      <div className="col-span-2">
                        <div className="text-[11px] text-[#5c6b7a] mb-1">Capabilities</div>
                        <div className="flex flex-wrap gap-1.5">
                          {inspectedDevice.capabilities.map((cap) => (
                            <span
                              key={cap}
                              className="px-2 py-0.5 rounded bg-white border border-[#d6dfe8] text-[11px] font-medium text-[#17212b]"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[11px] text-[#5c6b7a]">Notes</div>
                        <div className="text-[12px] text-[#17212b] mt-0.5">
                          {inspectedDevice.notes || 'No notes recorded.'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#5c6b7a] mb-2.5">
                        Connected Records (up to 32 shown)
                      </h3>
                      {inspectedConnections.length === 0 ? (
                        <div className="p-4 rounded-lg border border-[#e3e8ee] text-[12px] text-[#5c6b7a]">
                          No active or historical Modal Mapping connections reference this Device.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {inspectedConnections.slice(0, 32).map((conn) => (
                            <div
                              key={conn.id}
                              className="p-3 rounded-lg border border-[#e3e8ee] flex items-center justify-between text-[12px]"
                            >
                               <div>
                                 <div className="font-semibold text-[#17212b]">
                                   {conn.connectionId} · {conn.name}
                                 </div>
                                 <div className="text-[11px] text-[#5c6b7a]">
                                   Members: {conn.members?.length || 1} unit(s) · Updated: {conn.updatedAt?.slice(0, 10)}
                                 </div>
                               </div>
                               <span
                                 className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                   conn.status === 'Active'
                                     ? 'bg-[#eaf8f0] text-[#0f7b4b]'
                                     : 'bg-slate-100 text-slate-600'
                                 }`}
                               >
                                 {conn.status}
                               </span>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                   </>
                 )}

                 {inspectorTab === 'linked' && (
                   <div className="space-y-3">
                     <div className="text-[12px] text-[#5c6b7a]">
                       Showing all Modal Mapping connections where{' '}
                       <strong className="text-[#17212b]">{inspectedDevice.deviceId}</strong> is a member or bound endpoint.
                     </div>
                     {inspectedConnections.length === 0 ? (
                       <div className="p-6 text-center rounded-lg border border-[#e3e8ee] text-[12px] text-[#5c6b7a]">
                         No linked connections found for this Device.
                       </div>
                     ) : (
                       inspectedConnections.map((conn) => {
                         const peerBindings = (store.hardwareBindings || []).filter(
                           (b) =>
                             b.connectionId === conn.id &&
                             (b.fromHardwareId === inspectedDevice.id || b.toHardwareId === inspectedDevice.id)
                         );
                         return (
                           <div
                             key={conn.id}
                             className="p-3.5 rounded-lg border border-[#e3e8ee] bg-white space-y-1.5 text-[12px]"
                           >
                             <div className="flex items-center justify-between">
                               <span className="font-bold text-[#17212b] font-mono">
                                 {conn.connectionId} · {conn.name}
                               </span>
                               <span
                                 className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                   conn.status === 'Active'
                                     ? 'bg-[#eaf8f0] text-[#0f7b4b]'
                                     : 'bg-slate-100 text-slate-600'
                                 }`}
                               >
                                 {conn.status}
                               </span>
                             </div>
                             <div className="text-[#5c6b7a]">
                               Client: <strong className="text-[#17212b]">{conn.companyName}</strong> · Members:{' '}
                               <strong className="text-[#17212b]">{conn.members?.length || 1}</strong> · Pairwise bindings:{' '}
                               <strong className="text-[#17212b]">{peerBindings.length}</strong>
                             </div>
                           </div>
                         );
                       })
                     )}
                  </div>
                )}

                {inspectorTab === 'activity' && (
                  <div className="space-y-3">
                    {[
                      {
                        date: inspectedDevice.updatedAt,
                        title: 'Inventory metadata & status verified',
                        detail: `Current lifecycle state is ${inspectedDevice.hardwareLifecycle} at ${inspectedDevice.inventoryLocation} (${inspectedDevice.company}).`
                      },
                      {
                        date: inspectedDevice.registeredAt,
                        title: 'Gateway hardware onboarded in Devices Master',
                        detail: `Registered ${inspectedDevice.manufacturer} ${inspectedDevice.modelText} with serial ${inspectedDevice.serial}.`
                      }
                    ].map((ev, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] flex items-start gap-3"
                      >
                        <div className="w-2 h-2 rounded-full bg-[#e56b38] mt-1.5 shrink-0" />
                        <div>
                          <div className="text-[12px] font-semibold text-[#17212b]">
                            {ev.title}
                          </div>
                          <div className="text-[11px] text-[#5c6b7a] mt-0.5">{ev.detail}</div>
                          <div className="text-[10px] font-mono text-[#8291a0] mt-1">{ev.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. BULK OPERATIONS DRAWER */}
          {activeDrawer === 'bulk' && (
            <div className="w-[560px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-5 py-4 border-b border-[#e3e8ee] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">
                    Bulk Operations · Devices
                  </h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    {selectedDeviceRecords.length} Device record(s) currently selected.
                  </p>
                </div>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-lg text-[#5c6b7a] hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-5">
                {selectedDeviceRecords.length === 0 ? (
                  <div className="p-6 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] text-center text-[12px] text-[#5c6b7a]">
                    Select one or more Devices in the table first to run a bulk operation.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                        Bulk action
                      </label>
                      <select
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value as any)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                      >
                        <option value="Update inventory status">Update inventory status</option>
                        <option value="Decommission eligible">Decommission eligible</option>
                        <option value="Delete eligible">Delete eligible</option>
                      </select>
                    </div>

                    {bulkAction === 'Update inventory status' && (
                      <div>
                        <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                          Target inventory status
                        </label>
                        <select
                          value={bulkTargetStatus}
                          onChange={(e) =>
                            setBulkTargetStatus(e.target.value as HardwareLifecycleStatus)
                          }
                          className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                        >
                          {HARDWARE_LIFECYCLE_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(bulkAction === 'Decommission eligible' || bulkAction === 'Delete eligible') && (
                      <div className="p-3.5 rounded-lg border border-[#fed7aa] bg-[#fff7ed] text-[12px] text-[#b45309]">
                        Devices linked to an <strong>Active</strong> connection in Modal Mapping are
                        protected and automatically skipped during bulk{' '}
                        {bulkAction === 'Delete eligible' ? 'deletion' : 'decommissioning'}.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-slate-100 text-slate-700">
                        {selectedDeviceRecords.length} Selected
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                        <CheckCircle2 size={12} /> {bulkEligibility.eligible.length} Eligible
                      </span>
                      {bulkEligibility.skipped.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-200 bg-amber-50 text-amber-800">
                          <AlertTriangle size={12} /> {bulkEligibility.skipped.length} Protected / Skipped
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border border-[#b9ebd0] bg-[#eaf8f0]">
                        <div className="text-[11px] text-[#0f7b4b] font-semibold">
                          {bulkAction === 'Delete eligible' ? 'Eligible to delete' : 'Eligible to update'}
                        </div>
                        <div className="text-[20px] font-bold text-[#0f7b4b]">
                          {bulkEligibility.eligible.length}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border border-[#fed7aa] bg-[#fff7ed]">
                        <div className="text-[11px] text-[#b45309] font-semibold">
                          Skipped (active connection)
                        </div>
                        <div className="text-[20px] font-bold text-[#b45309]">
                          {bulkEligibility.skipped.length}
                        </div>
                      </div>
                    </div>

                    {bulkEligibility.skipped.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#5c6b7a]">
                          Skipped Records
                        </div>
                        <div className="max-h-[160px] overflow-y-auto divide-y divide-[#edf1f5] border border-[#e3e8ee] rounded-lg">
                          {bulkEligibility.skipped.map(({ record, reason }) => (
                            <div key={record.id} className="px-3 py-2 text-[11px]">
                              <span className="font-semibold text-[#17212b]">
                                {record.deviceId} ({record.name})
                              </span>
                              <span className="text-[#dc2626] ml-1.5">— {reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="px-5 py-3.5 border-t border-[#e3e8ee] bg-[#f8fafc] flex items-center justify-end gap-2">
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="px-4 py-2 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#5c6b7a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={bulkEligibility.eligible.length === 0}
                  onClick={handleApplyBulk}
                  className={`px-4 py-2 rounded-[7px] disabled:opacity-40 text-white text-[12px] font-semibold cursor-pointer ${
                    bulkAction === 'Delete eligible'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-[#e56b38] hover:bg-[#d15b2a]'
                  }`}
                >
                  {bulkAction === 'Delete eligible'
                    ? `Delete ${bulkEligibility.eligible.length} eligible device(s)`
                    : `Apply to ${bulkEligibility.eligible.length} eligible record(s)`}
                </button>
              </div>
            </div>
          )}

          {/* 7. DIRECT IMPORT DRAWER */}
          {activeDrawer === 'import' && (
            <div className="w-[620px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-5 py-4 border-b border-[#e3e8ee] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">Import Devices</h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    Upload a CSV or JSON file to register gateway devices directly.
                  </p>
                </div>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-lg text-[#5c6b7a] hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <DirectBulkUploadView
                  status={deviceUpload.status}
                  progress={deviceUpload.progress}
                  fileLabel={deviceUpload.fileLabel}
                  fileMeta={deviceUpload.fileMeta}
                  errorMessage={deviceUpload.errorMessage}
                  doneSummary={deviceUpload.doneSummary}
                  accept=".csv,.json,text/csv,application/json"
                  dropTitle="Choose CSV / JSON or drag & drop"
                  dropSubtitle="Import gateway devices directly. Duplicate IDs or Serial numbers are automatically skipped."
                  chooseButtonLabel="Choose file"
                  downloadLabel="Download template"
                  sampleLabel="Use sample CSV"
                  templateTitle="Need a starting format?"
                  templateSubtitle="Download CSV template or upload a sample gateway device."
                  doneButtonLabel="Done"
                  onFileSelected={(file) => {
                    const lower = file.name.toLowerCase();
                    if (!lower.endsWith('.csv') && !lower.endsWith('.json')) {
                      deviceUpload.fail('Please upload a .csv or .json file.');
                      return;
                    }
                    const fmt: 'csv' | 'json' = lower.endsWith('.json') ? 'json' : 'csv';
                    const reader = new FileReader();
                    reader.onload = (ev) =>
                      processDevicesUpload(fmt, String(ev.target?.result || ''), file.name, file.size);
                    reader.onerror = () => deviceUpload.fail('Unable to read the selected file.');
                    reader.readAsText(file);
                  }}
                  onDownloadTemplate={() => {
                    const csv =
                      'Device name,Device ID,Device category,Vendor / Manufacturer,Model,Mode,Serial number,IMEI,Owner,Inventory location,Inventory status\n' +
                      'ADAS/DMS — Mettax MC202N · Mundra Hub,GTW-9101,ADAS/DMS,Mettax,MC202N,ADAS + DMS,SN-GTW-9101,864019283799101,Adani Port,Mundra CT2,Inventory';
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'fleetrobo_devices_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  onUseSample={() => {
                    const suffix = Math.floor(100 + Math.random() * 899);
                    const sampleCsv =
                      `Device name,Device ID,Device category,Vendor / Manufacturer,Model,Mode,Serial number,IMEI,Owner,Inventory location,Inventory status\n` +
                      `ADAS/DMS — Mettax MC202N · Mundra Hub ${suffix},GTW-9${suffix},ADAS/DMS,Mettax,MC202N,ADAS + DMS,SN-GTW-9${suffix},864019283799${suffix},Adani Port,Mundra CT2,Inventory`;
                    processDevicesUpload('csv', sampleCsv, `sample_devices_${suffix}.csv`, sampleCsv.length);
                  }}
                  onReset={deviceUpload.reset}
                  onDone={() => setActiveDrawer(null)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Device Confirmation Modal with Confirmation Chips */}
      {(() => {
        if (!deviceToDelete) return null;
        const activeLinks = store.connections.filter(
          (c) =>
            c.status === 'Active' &&
            (c.memberIds?.includes(deviceToDelete.id) ||
              c.hardwareId === deviceToDelete.id ||
              c.parentId === deviceToDelete.id)
        );
        return (
          <DeleteConfirmationModal
            isOpen={Boolean(deviceToDelete)}
            title="Delete Device?"
            description={
              <>
                Are you sure you want to delete{' '}
                <strong className="text-slate-900 font-semibold">{deviceToDelete.name}</strong> (
                {deviceToDelete.deviceId})? This device will be permanently removed from inventory.
              </>
            }
            confirmLabel="Delete Device"
            targetChips={[
              { id: 'devId', label: deviceToDelete.deviceId, tone: 'orange' },
              { id: 'kind', label: deviceToDelete.kind, tone: 'blue' },
              {
                id: 'model',
                label: `${deviceToDelete.manufacturer} · ${deviceToDelete.modelText}`,
                tone: 'slate',
              },
              { id: 'org', label: deviceToDelete.company, tone: 'purple' },
              {
                id: 'status',
                label: deviceToDelete.hardwareLifecycle,
                tone: deviceToDelete.hardwareLifecycle === 'Active' ? 'emerald' : 'slate',
              },
            ]}
            confirmationChips={[
              activeLinks.length > 0
                ? {
                    id: 'conn-link',
                    label: `Linked in ${activeLinks.length} Active Connection(s)`,
                    tone: 'amber',
                  }
                : {
                    id: 'conn-link',
                    label: 'Safe to Delete · No Active Connection',
                    tone: 'emerald',
                  },
              {
                id: 'scope',
                label: 'Permanent Inventory Removal',
                tone: 'rose',
              },
            ]}
            warningNote={
              activeLinks.length > 0 ? (
                <>
                  This device is currently referenced in{' '}
                  <strong>{activeLinks.map((c) => c.connectionId || c.id).join(', ')}</strong>.
                  Removing it will detach it from future telemetry queries.
                </>
              ) : undefined
            }
            onCancel={() => setDeviceToDelete(null)}
            onConfirm={handleConfirmDeleteDevice}
          />
        );
      })()}

      {/* Bulk Delete Devices Confirmation Modal with Confirmation Chips */}
      <DeleteConfirmationModal
        isOpen={pendingBulkDelete}
        title={`Delete ${bulkEligibility.eligible.length} Eligible Device(s)?`}
        description="Permanently remove eligible selected gateway devices from inventory. Devices linked to Active Modal Mapping connections are automatically excluded."
        confirmLabel={`Confirm Delete (${bulkEligibility.eligible.length})`}
        targetChips={[
          ...bulkEligibility.eligible.slice(0, 5).map((d) => ({
            id: d.id,
            label: d.deviceId,
            sublabel: d.name,
            tone: 'orange' as const,
          })),
          ...(bulkEligibility.eligible.length > 5
            ? [
                {
                  id: 'more-devs',
                  label: `+${bulkEligibility.eligible.length - 5} more`,
                  tone: 'slate' as const,
                },
              ]
            : []),
        ]}
        confirmationChips={[
          {
            id: 'selected',
            label: `${selectedDeviceRecords.length} Selected`,
            tone: 'slate',
          },
          {
            id: 'eligible',
            label: `${bulkEligibility.eligible.length} Eligible to Delete`,
            tone: 'emerald',
          },
          ...(bulkEligibility.skipped.length > 0
            ? [
                {
                  id: 'skipped',
                  label: `${bulkEligibility.skipped.length} Skipped (Active Connection)`,
                  tone: 'amber' as const,
                },
              ]
            : []),
        ]}
        onCancel={() => setPendingBulkDelete(false)}
        onConfirm={executeBulkDeleteDevices}
      />
    </div>
  );
};
