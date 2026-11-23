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
  EffectiveDeviceStatus,
  DeviceMappingFilterStatus,
  HardwareMappingDetails,
  DEVICE_CATALOGUE,
  DEVICE_COLUMNS,
  MODAL_FIELD_TOOLTIPS,
  SavedModalView,
  deriveDeviceStatus,
  deriveDeviceMappingFilterStatus,
  deriveHardwareMappingDetails,
  computeEffectiveConnectionStatus,
  getDeviceMappingReferences,
  loadModalMasterStore,
  saveModalMasterStore,
  loadSavedModalViews,
  saveSavedModalViews,
  downloadModalCsv,
  parseCsvLine
} from '../types/modalMaster';
import {
  DevicesFilterDrawer,
  DevicesAdvancedFilters,
  DEFAULT_DEVICES_FILTERS,
  countActiveDeviceFilters,
  matchesDevicesFilters
} from './devices-master/DevicesFilterDrawer';
import {
  DevicesBulkDrawer,
  DevicesBulkActionMode
} from './devices-master/DevicesBulkDrawer';
import {
  getEnabledModelsForCompanyName,
  getAvailableClientCompanies,
  resolveClientCompanyByNameOrId,
  isCompanyEligibleForNewRegistration
} from '../types/companyModelEnablement';
import {
  getDeviceModePresets,
  getModelCategoryById,
  getPlatformProtocolPresets,
  getRecordIdentifierTypes,
  loadCustomDeviceModes,
  saveCustomDeviceMode,
  loadCustomPlatformProtocols,
  saveCustomPlatformProtocol
} from '../types/modelCategoryMaster';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';

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
  const [statusTick, setStatusTick] = useState(0);
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
      setStatusTick((t) => t + 1);
    };
    const handleFocus = () => setStatusTick((t) => t + 1);
    window.addEventListener('fleetrobo:model-access-updated', handleSync);
    window.addEventListener('fleetrobo:modal-store-updated', handleStoreSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('storage', handleStoreSync);
    window.addEventListener('focus', handleFocus);
    const timer = window.setInterval(() => setStatusTick((t) => t + 1), 30000);
    return () => {
      window.removeEventListener('fleetrobo:model-access-updated', handleSync);
      window.removeEventListener('fleetrobo:modal-store-updated', handleStoreSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('storage', handleStoreSync);
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(timer);
    };
  }, []);

  const isPlatformAdmin = currentCompany === 'Platform Admin' || currentCompany === 'Binary';
  const availableOrganizations = useMemo(() => {
    void modelAccessTick;
    return getAvailableClientCompanies();
  }, [modelAccessTick]);

  // Toolbar & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('All');
  const [advancedFilters, setAdvancedFilters] = useState<DevicesAdvancedFilters>(
    DEFAULT_DEVICES_FILTERS
  );

  useEffect(() => {
    setFilterCompany('All');
    setAdvancedFilters(DEFAULT_DEVICES_FILTERS);
  }, [currentCompany]);

  // Authorized devices in active tenant/filter scope
  const scopedDevices = useMemo(() => {
    const companyTarget =
      !isPlatformAdmin && currentCompany
        ? currentCompany.trim().toLowerCase()
        : isPlatformAdmin && filterCompany !== 'All'
        ? filterCompany.trim().toLowerCase()
        : null;
    if (!companyTarget) return isPlatformAdmin ? store.devices : [];
    return store.devices.filter((d) => (d.company || '').trim().toLowerCase() === companyTarget);
  }, [store.devices, currentCompany, isPlatformAdmin, filterCompany]);

  // Derived effective Device status & mapping filter status
  const { effectiveStatusById, mappingStatusById, mappingDetailsById } = useMemo(() => {
    void statusTick;
    const nowMs = Date.now();
    const statusMap = new Map<string, EffectiveDeviceStatus>();
    const mappingMap = new Map<string, DeviceMappingFilterStatus>();
    const detailsMap = new Map<string, HardwareMappingDetails>();
    store.devices.forEach((d) => {
      statusMap.set(d.id, deriveDeviceStatus(d, store, nowMs));
      const details = deriveHardwareMappingDetails(d.id, store, nowMs);
      detailsMap.set(d.id, details);
      mappingMap.set(d.id, details.mappingStatus);
    });
    return {
      effectiveStatusById: statusMap,
      mappingStatusById: mappingMap,
      mappingDetailsById: detailsMap
    };
  }, [store, statusTick]);

  const getEffectiveStatus = (device: DeviceRecord): EffectiveDeviceStatus =>
    effectiveStatusById.get(device.id) ?? deriveDeviceStatus(device, store);

  // Enabled Device models for the active company (or selected filter company in Platform Admin)
  const enabledDeviceModels = useMemo(() => {
    const scopeCompany = isPlatformAdmin && filterCompany !== 'All' ? filterCompany : currentCompany;
    return getEnabledModelsForCompanyName(scopeCompany).filter(
      (m) => m.category === 'Device'
    );
  }, [currentCompany, isPlatformAdmin, filterCompany, modelAccessTick]);

  const enabledCategories = useMemo<string[]>(() => {
    return Array.from(new Set(enabledDeviceModels.map((m) => m.typeName)));
  }, [enabledDeviceModels]);

  const availableLocations = useMemo<string[]>(() => {
    return Array.from(
      new Set(scopedDevices.map((d) => (d.inventoryLocation || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [scopedDevices]);

  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hiddenCols, setHiddenCols] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Intersect selection to authorized visible scope whenever tenant/filter/devices change
  useEffect(() => {
    const allowedIds = new Set(scopedDevices.map((d) => d.id));
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowedIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [scopedDevices]);

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
    () => enabledCategories[0] || ''
  );
  const [formCompany, setFormCompany] = useState(() =>
    currentCompany && currentCompany !== 'Platform Admin' && currentCompany !== 'Binary'
      ? currentCompany
      : availableOrganizations[0] || ''
  );

  const effectiveFormCompany = isPlatformAdmin ? formCompany : currentCompany;

  const formEnabledDeviceModels = useMemo(() => {
    return getEnabledModelsForCompanyName(effectiveFormCompany).filter(
      (m) => m.category === 'Device'
    );
  }, [effectiveFormCompany, modelAccessTick]);

  // Include historical referenced model in Edit mode even if later deactivated/disabled
  const formSelectableDeviceModels = useMemo(() => {
    if (!editingDevice) return formEnabledDeviceModels;
    const historical = editingDevice.modelTypeId
      ? getModelCategoryById(editingDevice.modelTypeId)
      : undefined;
    if (historical && !formEnabledDeviceModels.some((m) => m.id === historical.id)) {
      return [historical, ...formEnabledDeviceModels];
    }
    return formEnabledDeviceModels;
  }, [editingDevice, formEnabledDeviceModels]);

  const formEnabledCategories = useMemo<string[]>(() => {
    const cats = Array.from(new Set(formSelectableDeviceModels.map((m) => m.typeName)));
    if (editingDevice && editingDevice.kind && !cats.includes(editingDevice.kind)) {
      return [editingDevice.kind, ...cats];
    }
    return cats;
  }, [formSelectableDeviceModels, editingDevice]);
  const [formManufacturer, setFormManufacturer] = useState(
    () => enabledDeviceModels[0]?.manufacturer || ''
  );
  const [formModelText, setFormModelText] = useState(
    () => enabledDeviceModels[0]?.modelReference || ''
  );
  const [formModes, setFormModes] = useState<string[]>(() => {
    const first = enabledDeviceModels[0];
    if (first?.supportedModes && first.supportedModes.length > 0) return [first.supportedModes[0]];
    if (first?.deviceMode) return [first.deviceMode];
    if (first?.deviceFunction) return [first.deviceFunction];
    return [];
  });
  const [formSerial, setFormSerial] = useState('');
  const [formImei, setFormImei] = useState('');
  const [formIdentifierType, setFormIdentifierType] = useState('');
  const [formProtocols, setFormProtocols] = useState<string[]>(() =>
    enabledDeviceModels[0]?.supportedProtocols?.[0]
      ? [enabledDeviceModels[0].supportedProtocols[0]]
      : []
  );
  const [formLocation, setFormLocation] = useState('');
  const [formLifecycle, setFormLifecycle] = useState<HardwareLifecycleStatus>('Inventory');
  const [formChannelCount, setFormChannelCount] = useState<number>(
    () => enabledDeviceModels[0]?.maxCameraChannels ?? 0
  );
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

  // Direct upload state
  const deviceUpload = useDirectUploadState(activeDrawer === 'import');

  useEffect(() => {
    saveSavedModalViews(savedViews);
  }, [savedViews]);

  // Derived form options from formSelectableDeviceModels for the selected category
  const modelsForSelectedCategory = useMemo(() => {
    return formSelectableDeviceModels.filter((m) => m.typeName === formKind);
  }, [formSelectableDeviceModels, formKind]);

  const availableManufacturers = useMemo<string[]>(() => {
    if (modelsForSelectedCategory.length > 0) {
      const list = Array.from(new Set(modelsForSelectedCategory.map((m) => m.manufacturer).filter(Boolean)));
      if (editingDevice?.manufacturer && !list.includes(editingDevice.manufacturer)) {
        return [editingDevice.manufacturer, ...list];
      }
      return list;
    }
    if (editingDevice?.manufacturer) {
      return [editingDevice.manufacturer];
    }
    return [];
  }, [modelsForSelectedCategory, editingDevice]);

  const availableModels = useMemo<
    { model: string; defaultProtocol: string; channelCount: number }[]
  >(() => {
    if (modelsForSelectedCategory.length > 0) {
      const byMfg = modelsForSelectedCategory.filter((m) => m.manufacturer === formManufacturer);
      return byMfg.map((m) => ({
        model: m.modelReference,
        defaultProtocol: m.supportedProtocols?.[0] || '',
        channelCount: m.maxCameraChannels != null ? m.maxCameraChannels : 0
      }));
    }
    if (editingDevice && editingDevice.modelText) {
      return [
        {
          model: editingDevice.modelText,
          defaultProtocol: editingDevice.platformProtocol || '',
          channelCount: editingDevice.channelCount || 0
        }
      ];
    }
    return [];
  }, [modelsForSelectedCategory, formManufacturer, editingDevice]);

  const selectedModelSpec = useMemo(() => {
    if (editingDevice?.modelTypeId) {
      const exactHistorical = formSelectableDeviceModels.find(
        (m) =>
          m.id === editingDevice.modelTypeId &&
          m.typeName === formKind &&
          m.manufacturer === formManufacturer &&
          m.modelReference === formModelText
      );
      if (exactHistorical) return exactHistorical;
    }
    return (
      formSelectableDeviceModels.find(
        (m) =>
          m.typeName === formKind &&
          m.manufacturer === formManufacturer &&
          m.modelReference === formModelText
      ) || null
    );
  }, [
    editingDevice,
    formSelectableDeviceModels,
    formKind,
    formManufacturer,
    formModelText
  ]);

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
    if (editingDevice) {
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
    }
    return Array.from(new Set([...customDeviceModes, ...formModes].filter(Boolean)));
  }, [selectedModelSpec, editingDevice, formKind, formModes, customDeviceModes]);

  const normalizeProtocol = (val?: string) => {
    const trimmed = (val || '').trim();
    if (!trimmed) return '';
    return trimmed.toUpperCase() === 'METTA' ? 'Metta' : trimmed;
  };

  const availableProtocols = useMemo<string[]>(() => {
    const fromSpec = selectedModelSpec?.supportedProtocols || [];
    const fromCatDef = editingDevice ? DEVICE_CATALOGUE[formKind]?.protocols || [] : [];
    const fromPresets = selectedModelSpec
      ? getPlatformProtocolPresets(selectedModelSpec.typeName, selectedModelSpec.deviceFunction)
      : editingDevice
      ? getPlatformProtocolPresets(formKind)
      : [];
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
  }, [selectedModelSpec, editingDevice, formKind, formProtocols, customDeviceProtocols]);

  const availableIdentifierTypes = useMemo(() => {
    const fromSpec = getRecordIdentifierTypes(selectedModelSpec);
    if (fromSpec.length > 0) return fromSpec;
    if (editingDevice?.identifierType) {
      return getRecordIdentifierTypes({ identifierType: editingDevice.identifierType });
    }
    return editingDevice ? ['Serial Number'] : [];
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
      const currentMatches = formEnabledDeviceModels.some(
        (m) =>
          m.typeName === formKind &&
          m.manufacturer === formManufacturer &&
          m.modelReference === formModelText
      );
      if (currentMatches) return;

      const firstModel =
        formEnabledDeviceModels.find((m) => m.typeName === formKind) || formEnabledDeviceModels[0];
      const presets = getDeviceModePresets(firstModel.typeName, firstModel.deviceFunction);
      const defaultMode =
        firstModel.supportedModes?.[0] ||
        firstModel.deviceMode ||
        presets[0] ||
        firstModel.deviceFunction ||
        '';
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
      setFormIdentifierType(getRecordIdentifierTypes(firstModel)[0] || '');
      setFormChannelCount(
        firstModel.maxCameraChannels != null ? firstModel.maxCameraChannels : 0
      );
    } else {
      setFormKind('');
      setFormManufacturer('');
      setFormModelText('');
      setFormModes([]);
      setFormProtocols([]);
      setFormIdentifierType('');
      setFormChannelCount(0);
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
        : availableOrganizations[0] || ''
      : currentCompany || '';
    const targetModels = getEnabledModelsForCompanyName(targetOrg).filter(
      (m) => m.category === 'Device'
    );
    const nextNum = 9001 + store.devices.length;
    const firstEnabled = targetModels[0];
    const cat: GatewayCategory = firstEnabled ? firstEnabled.typeName : '';
    const mfg = firstEnabled ? firstEnabled.manufacturer : '';
    const modelRef = firstEnabled ? firstEnabled.modelReference : '';
    const modeVal = firstEnabled
      ? firstEnabled.supportedModes?.[0] ||
        firstEnabled.deviceMode ||
        getDeviceModePresets(firstEnabled.typeName, firstEnabled.deviceFunction)[0] ||
        firstEnabled.deviceFunction ||
        ''
      : '';
    const protoVals = firstEnabled
      ? resolveDefaultProtocolsForModel(
          firstEnabled.supportedProtocols,
          firstEnabled.typeName,
          firstEnabled.deviceFunction
        )
      : [];
    const chCount =
      firstEnabled && firstEnabled.maxCameraChannels != null
        ? firstEnabled.maxCameraChannels
        : 0;

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
    setFormLocation('');
    setFormLifecycle('Inventory');
    setFormChannelCount(chCount);
    setFormNotes('');
    setFormError(
      firstEnabled
        ? null
        : 'No active Device models are enabled for this company. Enable a Device model in Company Model Access first.'
    );
    setActiveDrawer('form');
  };

  // Open Edit Form
  const handleOpenEdit = (record: DeviceRecord) => {
    setEditingDevice(record);
    setCustomDeviceModes(loadCustomDeviceModes());
    setCustomDeviceProtocols(loadCustomPlatformProtocols());
    setFormName(record.name);
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
    setFormLocation(record.inventoryLocation || '');
    setFormLifecycle(getEffectiveStatus(record));
    setFormChannelCount(record.channelCount);
    setFormNotes(record.notes);
    setFormError(null);
    setActiveDrawer('form');
  };

  // Dynamic category change in form
  const handleCategoryChange = (newKind: GatewayCategory) => {
    setFormKind(newKind);
    const matchingEnabled = formSelectableDeviceModels.filter((m) => m.typeName === newKind);
    if (matchingEnabled.length > 0) {
      const first = matchingEnabled[0];
      const presets = getDeviceModePresets(first.typeName, first.deviceFunction);
      const defaultMode =
        first.supportedModes?.[0] || first.deviceMode || presets[0] || first.deviceFunction || '';
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
      setFormIdentifierType(getRecordIdentifierTypes(first)[0] || '');
      setFormChannelCount(first.maxCameraChannels != null ? first.maxCameraChannels : 0);
      return;
    }
    setFormManufacturer('');
    setFormModelText('');
    setFormModes([]);
    setFormProtocols([]);
    setFormIdentifierType('');
    setFormChannelCount(0);
  };

  // Dynamic manufacturer change in form
  const handleManufacturerChange = (newMfg: string) => {
    setFormManufacturer(newMfg);
    const matchingEnabled = formSelectableDeviceModels.filter(
      (m) => m.typeName === formKind && m.manufacturer === newMfg
    );
    if (matchingEnabled.length > 0) {
      const first = matchingEnabled[0];
      const presets = getDeviceModePresets(first.typeName, first.deviceFunction);
      const defaultMode =
        first.supportedModes?.[0] || first.deviceMode || presets[0] || first.deviceFunction || '';
      setFormModelText(first.modelReference);
      setFormModes(defaultMode ? [defaultMode] : []);
      setFormProtocols(
        resolveDefaultProtocolsForModel(
          first.supportedProtocols,
          first.typeName,
          first.deviceFunction
        )
      );
      setFormIdentifierType(getRecordIdentifierTypes(first)[0] || '');
      setFormChannelCount(first.maxCameraChannels != null ? first.maxCameraChannels : 0);
      return;
    }
    setFormModelText('');
    setFormModes([]);
    setFormProtocols([]);
    setFormIdentifierType('');
    setFormChannelCount(0);
  };

  // Dynamic model change in form
  const handleModelChange = (newModel: string) => {
    setFormModelText(newModel);
    const matchedEnabled = formSelectableDeviceModels.find(
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
        '';
      setFormModes(defaultMode ? [defaultMode] : []);
      setFormProtocols(
        resolveDefaultProtocolsForModel(
          matchedEnabled.supportedProtocols,
          matchedEnabled.typeName,
          matchedEnabled.deviceFunction
        )
      );
      setFormIdentifierType(getRecordIdentifierTypes(matchedEnabled)[0] || '');
      setFormChannelCount(
        matchedEnabled.maxCameraChannels != null ? matchedEnabled.maxCameraChannels : 0
      );
      return;
    }
    setFormChannelCount(0);
  };

  // Save Device (Create or Edit)
  const handleSaveDevice = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const targetCompanyRaw = isPlatformAdmin ? formCompany.trim() : currentCompany.trim();
    const resolvedOrg = resolveClientCompanyByNameOrId(targetCompanyRaw);
    if (
      !resolvedOrg ||
      resolvedOrg.isPlatformOwner ||
      !isCompanyEligibleForNewRegistration(resolvedOrg)
    ) {
      if (!editingDevice || !resolvedOrg || resolvedOrg.isPlatformOwner) {
        setFormError(
          `Organization "${targetCompanyRaw || 'Unknown'}" is not an eligible active client company for device registration.`
        );
        return;
      }
    }

    const finalCompanyName = resolvedOrg.name;
    const enabledModelsForTarget = getEnabledModelsForCompanyName(finalCompanyName).filter(
      (m) => m.category === 'Device'
    );
    const exactEnabledModel = enabledModelsForTarget.find(
      (m) =>
        m.typeName === formKind &&
        m.manufacturer === formManufacturer &&
        m.modelReference === formModelText
    );

    const isHistoricalModelUnchanged =
      Boolean(editingDevice) &&
      editingDevice!.kind === formKind &&
      editingDevice!.manufacturer === formManufacturer &&
      editingDevice!.modelText === formModelText;

    if (!editingDevice && !exactEnabledModel) {
      setFormError(
        enabledModelsForTarget.length === 0
          ? `No active Device models are currently enabled for "${finalCompanyName}". Approve models or verify company status in Company Management.`
          : `Selected combination (${formKind || '—'} · ${formManufacturer || '—'} · ${formModelText || '—'}) is not an active enabled model for "${finalCompanyName}".`
      );
      return;
    }

    if (editingDevice && !isHistoricalModelUnchanged && !exactEnabledModel) {
      setFormError(
        `Cannot reassign device to an inactive or disabled model (${formKind || '—'} · ${formManufacturer || '—'} · ${formModelText || '—'}) for "${finalCompanyName}".`
      );
      return;
    }

    const matchedSpec =
      exactEnabledModel ||
      (isHistoricalModelUnchanged ? selectedModelSpec : null);

    const trimmedName = formName.trim();
    const trimmedId = formDeviceId.trim();
    const effectiveSerial = formSerial.trim();
    const effectiveImei = formImei.trim();

    const specIdTypes = getRecordIdentifierTypes(matchedSpec);
    const activeIdType =
      specIdTypes.includes(activeIdentifierType)
        ? activeIdentifierType
        : specIdTypes[0] || editingDevice?.identifierType || 'Serial Number';
    const supportsImei = specIdTypes.some((t) => t.toUpperCase() === 'IMEI');
    const supportsNonImei = specIdTypes.some(
      (t) => t.toUpperCase() !== 'IMEI' && t.toUpperCase() !== 'DEVICE ID'
    );

    const singleProtocol = formProtocols[0] ? formProtocols[0].trim() : '';

    if (!trimmedName || !trimmedId || !singleProtocol) {
      setFormError(
        'Please complete all required fields marked with * (select Platform Protocol).'
      );
      return;
    }

    if (supportsImei && !supportsNonImei && !effectiveImei) {
      setFormError(`Please enter a valid IMEI required for ${matchedSpec?.modelReference || 'this model'}.`);
      return;
    }

    if (!supportsImei && supportsNonImei && !effectiveSerial) {
      setFormError(`Please enter a valid ${activeIdType} required for ${matchedSpec?.modelReference || 'this model'}.`);
      return;
    }

    if (supportsImei && supportsNonImei && !effectiveImei && !effectiveSerial) {
      setFormError(
        `Please enter IMEI or ${
          specIdTypes.find((t) => t.toUpperCase() !== 'IMEI' && t.toUpperCase() !== 'DEVICE ID') ||
          'Serial Number'
        } for ${matchedSpec?.modelReference || 'this model'}.`
      );
      return;
    }

    // Cross-module uniqueness across devices AND sensors (checking non-empty physical identifiers)
    const duplicateInDevices = store.devices.some(
      (d) =>
        d.id !== editingDevice?.id &&
        (d.deviceId.toLowerCase() === trimmedId.toLowerCase() ||
          (effectiveSerial !== '' && d.serial.toLowerCase() === effectiveSerial.toLowerCase()) ||
          (effectiveImei !== '' && d.imei && d.imei.toLowerCase() === effectiveImei.toLowerCase()))
    );
    const duplicateInSensors = store.sensors.some(
      (s) =>
        s.deviceId.toLowerCase() === trimmedId.toLowerCase() ||
        (effectiveSerial !== '' && s.serial.toLowerCase() === effectiveSerial.toLowerCase())
    );

    if (duplicateInDevices || duplicateInSensors) {
      setFormError('Device ID, Serial Number, and IMEI must be unique across Devices and Sensors.');
      return;
    }

    const capabilities =
      matchedSpec?.connectivity && matchedSpec.connectivity.length > 0
        ? [...matchedSpec.connectivity]
        : isHistoricalModelUnchanged && editingDevice
        ? [...(editingDevice.capabilities || [])]
        : [];

    const resolvedChannelCount =
      matchedSpec?.maxCameraChannels != null
        ? matchedSpec.maxCameraChannels
        : isHistoricalModelUnchanged && editingDevice
        ? editingDevice.channelCount
        : 0;

    const resolvedSimSlots =
      matchedSpec?.simSupported === 'Yes'
        ? editingDevice?.simSlots && editingDevice.simSlots > 0
          ? editingDevice.simSlots
          : 1
        : matchedSpec?.simSupported === 'No'
        ? 0
        : editingDevice?.simSlots;

    const todayStr = new Date().toISOString().slice(0, 10);
    const modeSummary = formModes.join(', ');
    const protocolSummary = singleProtocol;
    const protocolArray = singleProtocol ? [singleProtocol] : [];

    if (editingDevice) {
      const candidateRecord: DeviceRecord = {
        ...editingDevice,
        name: trimmedName,
        deviceId: trimmedId,
        kind: formKind,
        manufacturer: formManufacturer,
        modelText: formModelText,
        modelTypeId: matchedSpec?.id || editingDevice.modelTypeId,
        identifierType: activeIdType,
        mode: modeSummary,
        modes: [...formModes],
        serial: effectiveSerial,
        imei: effectiveImei,
        capabilities,
        platformProtocol: protocolSummary,
        platformProtocols: protocolArray,
        company: finalCompanyName,
        inventoryLocation: formLocation,
        channelCount: resolvedChannelCount,
        simSlots: resolvedSimSlots,
        notes: formNotes.trim(),
        updatedAt: todayStr
      };
      const updatedRecord: DeviceRecord = {
        ...candidateRecord,
        hardwareLifecycle: deriveDeviceStatus(candidateRecord, store)
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
        modelTypeId: matchedSpec!.id,
        identifierType: activeIdType,
        mode: modeSummary,
        modes: [...formModes],
        serial: effectiveSerial,
        imei: effectiveImei,
        capabilities,
        platformProtocol: protocolSummary,
        platformProtocols: protocolArray,
        company: finalCompanyName,
        inventoryLocation: formLocation,
        hardwareLifecycle: 'Inventory',
        statusOverride: null,
        registeredAt: todayStr,
        updatedAt: todayStr,
        channelCount: resolvedChannelCount,
        ...(resolvedSimSlots !== undefined ? { simSlots: resolvedSimSlots } : {}),
        notes: formNotes.trim()
      };
      setStore((prev) => ({
        ...prev,
        devices: [newRecord, ...prev.devices]
      }));
      setSortKey('');
      setCurrentPage(1);
      showToast(`Device ${trimmedId} created (Status: Inventory).`);
    }

    setActiveDrawer(null);
  };

  // Filtered & Sorted Devices (strictly scoped to active client when not Platform Admin)
  const filteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedDevices.filter((d) => {
      const effStatus = getEffectiveStatus(d);
      const mapStatus = mappingStatusById.get(d.id) || 'Unmapped';
      if (!matchesDevicesFilters(d, advancedFilters, effStatus, mapStatus, isPlatformAdmin)) {
        return false;
      }
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
          d.company,
          d.inventoryLocation
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    scopedDevices,
    searchQuery,
    advancedFilters,
    effectiveStatusById,
    mappingStatusById,
    isPlatformAdmin
  ]);

  const sortedDevices = useMemo(() => {
    if (!sortKey) return filteredDevices;
    const copy = [...filteredDevices];
    copy.sort((a, b) => {
      const av =
        sortKey === 'hardwareLifecycle'
          ? getEffectiveStatus(a).toLowerCase()
          : String((a as any)[sortKey] ?? '').toLowerCase();
      const bv =
        sortKey === 'hardwareLifecycle'
          ? getEffectiveStatus(b).toLowerCase()
          : String((b as any)[sortKey] ?? '').toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filteredDevices, sortKey, sortDir, effectiveStatusById]);

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
    countActiveDeviceFilters(advancedFilters, isPlatformAdmin);

  const clearAllDeviceFilters = () => {
    setFilterCompany('All');
    setAdvancedFilters(DEFAULT_DEVICES_FILTERS);
    setCurrentPage(1);
  };

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
    const refs = getDeviceMappingReferences(deviceToDelete.id, store);
    if (refs.hasAnyReference) {
      showToast(
        `Cannot delete ${deviceToDelete.deviceId}: referenced in ${refs.allConnections.length || refs.allBindings.length || refs.allAllocations.length} Asset Mapping record(s).`,
        'error'
      );
      return;
    }
    const idToDelete = deviceToDelete.id;
    setStore((prev) => ({
      ...prev,
      devices: prev.devices.filter((d) => d.id !== idToDelete)
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

  // Selected devices strictly scoped to authorized visible tenant records
  const selectedDeviceRecords = useMemo(
    () => scopedDevices.filter((d) => selectedIds.has(d.id)),
    [scopedDevices, selectedIds]
  );

  const handleBulkExportSelected = (recordsToExport: DeviceRecord[]) => {
    if (recordsToExport.length === 0) return;
    const exportRows = recordsToExport.map((d) => ({
      ...d,
      hardwareLifecycle: getEffectiveStatus(d)
    }));
    downloadModalCsv('FleetRobo_devices_selected_export.csv', visibleColumns, exportRows);
    showToast(
      `Exported ${exportRows.length} selected Device record(s) to FleetRobo_devices_selected_export.csv`
    );
  };

  const handleApplyDevicesBulkUpdate = (
    mode: Exclude<DevicesBulkActionMode, 'export_selected'>,
    eligibleIds: string[],
    options?: { targetLocation?: string }
  ) => {
    const allowedScopeIds = new Set(scopedDevices.map((d) => d.id));
    const safeIds = new Set(eligibleIds.filter((id) => allowedScopeIds.has(id)));
    if (safeIds.size === 0) return;

    const nowMs = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);

    if (mode === 'delete') {
      const actuallyDeleted = new Set<string>();
      setStore((prev) => ({
        ...prev,
        devices: prev.devices.filter((d) => {
          if (!safeIds.has(d.id)) return true;
          const refs = getDeviceMappingReferences(d.id, prev, nowMs);
          if (refs.hasAnyReference) return true;
          actuallyDeleted.add(d.id);
          return false;
        })
      }));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        safeIds.forEach((id) => next.delete(id));
        return next;
      });
      if (inspectedDevice && safeIds.has(inspectedDevice.id)) {
        setInspectedDevice(null);
      }
      showToast(`Deleted ${safeIds.size} unreferenced device(s).`);
      return;
    }

    setStore((prev) => ({
      ...prev,
      devices: prev.devices.map((d) => {
        if (!safeIds.has(d.id)) return d;
        const refs = getDeviceMappingReferences(d.id, prev, nowMs);
        const eff = deriveDeviceStatus(d, prev, nowMs);

        if (mode === 'send_maintenance') {
          if (eff === 'Decommissioned' || eff === 'In Maintenance') {
            return d;
          }
          return {
            ...d,
            statusOverride: 'In Maintenance',
            hardwareLifecycle: 'In Maintenance',
            updatedAt: todayStr
          };
        }

        if (mode === 'return_service') {
          if (eff !== 'In Maintenance') return d;
          const cleared: DeviceRecord = { ...d, statusOverride: null };
          const recalc = deriveDeviceStatus(cleared, prev, nowMs);
          return {
            ...cleared,
            hardwareLifecycle: recalc,
            updatedAt: todayStr
          };
        }

        if (mode === 'update_location') {
          if (eff === 'Decommissioned') return d;
          const nextLoc = (options?.targetLocation || '').trim();
          if (!nextLoc) return d;
          return {
            ...d,
            inventoryLocation: nextLoc,
            updatedAt: todayStr
          };
        }

        if (mode === 'decommission') {
          if (eff === 'Decommissioned' || refs.hasActiveOrScheduledReference) return d;
          return {
            ...d,
            statusOverride: 'Decommissioned',
            hardwareLifecycle: 'Decommissioned',
            updatedAt: todayStr
          };
        }

        return d;
      })
    }));

    if (mode === 'send_maintenance') {
      const flaggedMapped = Array.from(safeIds).some(
        (id) => getDeviceMappingReferences(id, store, nowMs).hasActiveOrScheduledReference
      );
      showToast(
        flaggedMapped
          ? `Moved ${safeIds.size} device(s) to In Maintenance; affected open mappings are flagged Needs Attention.`
          : `Moved ${safeIds.size} device(s) to In Maintenance.`
      );
    } else if (mode === 'return_service') {
      showToast(`Returned ${safeIds.size} device(s) to service and recalculated status.`);
    } else if (mode === 'update_location') {
      showToast(`Updated Inventory Location on ${safeIds.size} device(s).`);
    } else if (mode === 'decommission') {
      showToast(`Decommissioned ${safeIds.size} device(s).`);
    }
  };

  // Direct CSV/JSON upload execution
  const processDevicesUpload = (fmt: 'csv' | 'json', rawText: string, fileName: string, fileSize?: number) => {
    const raw = rawText.trim();
    if (!raw) {
      deviceUpload.fail('Uploaded file is empty.');
      return;
    }

    const valid: DeviceRecord[] = [];
    const invalid: { line: number; reason: string }[] = [];
    const seenIds = new Set([
      ...store.devices.map((d) => d.deviceId.toLowerCase()),
      ...store.sensors.map((s) => s.deviceId.toLowerCase())
    ]);
    const seenSerials = new Set(
      [
        ...store.devices.map((d) => d.serial.trim().toLowerCase()),
        ...store.sensors.map((s) => s.serial.trim().toLowerCase())
      ].filter(Boolean)
    );
    const seenImeis = new Set(
      store.devices.map((d) => (d.imei || '').trim().toLowerCase()).filter(Boolean)
    );

    const todayStr = new Date().toISOString().slice(0, 10);

    const validateAndBuildRow = (
      lineNum: number,
      rowData: {
        name: string;
        deviceId: string;
        kind: string;
        manufacturer: string;
        modelText: string;
        mode: string;
        serial: string;
        imei: string;
        company: string;
        inventoryLocation: string;
        hardwareLifecycle: string;
      }
    ) => {
      const name = rowData.name.trim();
      const deviceId = rowData.deviceId.trim();
      const kind = rowData.kind.trim();
      const manufacturer = rowData.manufacturer.trim();
      const modelText = rowData.modelText.trim();
      const serial = rowData.serial.trim();
      const imei = rowData.imei.trim();
      const rawCompany = rowData.company.trim();
      const requestedStatus = rowData.hardwareLifecycle.trim();

      if (!name || !deviceId || !kind || !manufacturer || !modelText) {
        invalid.push({
          line: lineNum,
          reason: 'Row requires Device name, Device ID, Device category, Manufacturer, and Model.'
        });
        return;
      }

      const targetCompanyName = !isPlatformAdmin
        ? currentCompany
        : rawCompany;
      if (!targetCompanyName) {
        invalid.push({ line: lineNum, reason: 'Owner / Organization Name is required.' });
        return;
      }
      if (
        !isPlatformAdmin &&
        rawCompany &&
        rawCompany.toLowerCase() !== currentCompany.trim().toLowerCase()
      ) {
        invalid.push({
          line: lineNum,
          reason: `Cross-tenant import blocked: row company "${rawCompany}" does not match "${currentCompany}".`
        });
        return;
      }

      const resolvedOrg = resolveClientCompanyByNameOrId(targetCompanyName);
      if (
        !resolvedOrg ||
        resolvedOrg.isPlatformOwner ||
        !isCompanyEligibleForNewRegistration(resolvedOrg)
      ) {
        invalid.push({
          line: lineNum,
          reason: `Invalid or ineligible company "${targetCompanyName}".`
        });
        return;
      }

      const enabledForCompany = getEnabledModelsForCompanyName(resolvedOrg.name).filter(
        (m) => m.category === 'Device'
      );
      const matchedModel = enabledForCompany.find(
        (m) =>
          m.typeName.toLowerCase() === kind.toLowerCase() &&
          m.manufacturer.toLowerCase() === manufacturer.toLowerCase() &&
          m.modelReference.toLowerCase() === modelText.toLowerCase()
      );
      if (!matchedModel) {
        invalid.push({
          line: lineNum,
          reason: `Model "${kind} · ${manufacturer} · ${modelText}" is not active and enabled for "${resolvedOrg.name}".`
        });
        return;
      }

      const identTypes = getRecordIdentifierTypes(matchedModel);
      const primaryIdentType = identTypes[0] || matchedModel.identifierType || 'Serial Number';
      const supportsImei = identTypes.some((t) => t.toUpperCase() === 'IMEI');
      const supportsNonImei = identTypes.some(
        (t) => t.toUpperCase() !== 'IMEI' && t.toUpperCase() !== 'DEVICE ID'
      );

      if (supportsImei && !supportsNonImei && !imei) {
        invalid.push({
          line: lineNum,
          reason: `IMEI is required for model ${matchedModel.modelReference}.`
        });
        return;
      }
      if (!supportsImei && supportsNonImei && !serial) {
        invalid.push({
          line: lineNum,
          reason: `${primaryIdentType} is required for model ${matchedModel.modelReference}.`
        });
        return;
      }
      if (supportsImei && supportsNonImei && !imei && !serial) {
        invalid.push({
          line: lineNum,
          reason: `Provide IMEI or ${primaryIdentType} for model ${matchedModel.modelReference}.`
        });
        return;
      }

      if (seenIds.has(deviceId.toLowerCase())) {
        invalid.push({ line: lineNum, reason: `Duplicate Device ID (${deviceId}).` });
        return;
      }
      if (serial && seenSerials.has(serial.toLowerCase())) {
        invalid.push({ line: lineNum, reason: `Duplicate Serial (${serial}).` });
        return;
      }
      if (imei && seenImeis.has(imei.toLowerCase())) {
        invalid.push({ line: lineNum, reason: `Duplicate IMEI (${imei}).` });
        return;
      }

      seenIds.add(deviceId.toLowerCase());
      if (serial) seenSerials.add(serial.toLowerCase());
      if (imei) seenImeis.add(imei.toLowerCase());

      // Never allow import-specified forced Active on brand new devices
      let statusOverride: 'In Maintenance' | 'Decommissioned' | null = null;
      let initialLifecycle: EffectiveDeviceStatus = 'Inventory';
      if (requestedStatus === 'In Maintenance') {
        statusOverride = 'In Maintenance';
        initialLifecycle = 'In Maintenance';
      } else if (requestedStatus === 'Decommissioned') {
        statusOverride = 'Decommissioned';
        initialLifecycle = 'Decommissioned';
      }

      const modeList = rowData.mode
        ? rowData.mode.split(',').map((s) => s.trim()).filter(Boolean)
        : matchedModel.supportedModes?.[0]
        ? [matchedModel.supportedModes[0]]
        : matchedModel.deviceMode
        ? [matchedModel.deviceMode]
        : [];
      const firstProto = matchedModel.supportedProtocols?.[0] || '';

      valid.push({
        id: `dev-import-${Date.now()}-${lineNum}-${Math.random().toString(36).slice(2, 6)}`,
        deviceId,
        name,
        kind: matchedModel.typeName,
        role: 'gateway',
        manufacturer: matchedModel.manufacturer,
        modelText: matchedModel.modelReference,
        modelTypeId: matchedModel.id,
        identifierType: primaryIdentType,
        mode: modeList.join(', '),
        modes: modeList,
        serial,
        imei,
        capabilities: matchedModel.connectivity ? [...matchedModel.connectivity] : [],
        platformProtocol: firstProto,
        platformProtocols: firstProto ? [firstProto] : [],
        company: resolvedOrg.name,
        inventoryLocation: rowData.inventoryLocation.trim(),
        hardwareLifecycle: initialLifecycle,
        statusOverride,
        registeredAt: todayStr,
        updatedAt: todayStr,
        channelCount: matchedModel.maxCameraChannels != null ? matchedModel.maxCameraChannels : 0,
        ...(matchedModel.simSupported === 'Yes'
          ? { simSlots: 1 }
          : matchedModel.simSupported === 'No'
          ? { simSlots: 0 }
          : {}),
        notes: 'Imported via bulk CSV/JSON'
      });
    };

    if (fmt === 'json') {
      try {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        arr.forEach((item, idx) => {
          validateAndBuildRow(idx + 1, {
            name: String(item.name || ''),
            deviceId: String(item.deviceId || ''),
            kind: String(item.kind || ''),
            manufacturer: String(item.manufacturer || ''),
            modelText: String(item.modelText || ''),
            mode: String(item.mode || ''),
            serial: String(item.serial || ''),
            imei: String(item.imei || ''),
            company: String(item.company || ''),
            inventoryLocation: String(item.inventoryLocation || ''),
            hardwareLifecycle: String(item.hardwareLifecycle || '')
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
        const [
          name = '',
          deviceId = '',
          kind = '',
          manufacturer = '',
          modelText = '',
          mode = '',
          serial = '',
          imei = '',
          company = '',
          inventoryLocation = '',
          hardwareLifecycle = ''
        ] = cols;
        validateAndBuildRow(idx + 1, {
          name,
          deviceId,
          kind,
          manufacturer,
          modelText,
          mode,
          serial,
          imei,
          company,
          inventoryLocation,
          hardwareLifecycle
        });
      });
    }

    if (valid.length === 0) {
      deviceUpload.fail(
        invalid[0]?.reason || 'No valid new device rows found (duplicates or validation failures).'
      );
      return;
    }

    deviceUpload.startUploading(fileName, formatUploadFileSize(fileSize), () => {
      setStore((prev) => ({
        ...prev,
        devices: [...valid, ...prev.devices]
      }));
      setSortKey('');
      setCurrentPage(1);
      showToast(`Imported ${valid.length} Device(s) (${invalid.length} skipped).`);
      return {
        headline: 'Devices uploaded successfully',
        description: `${valid.length} device record${valid.length === 1 ? '' : 's'} imported from ${fileName}.${
          invalid.length > 0 ? ` ${invalid.length} duplicate or invalid row${invalid.length === 1 ? '' : 's'} skipped.` : ''
        }`,
        stats: [
          { label: 'Uploaded', value: valid.length, tone: 'emerald' },
          { label: 'Skipped', value: invalid.length, tone: invalid.length > 0 ? 'amber' : 'slate' }
        ]
      };
    });
  };

  // Lifecycle pill styling matching specification
  const renderLifecycleBadge = (status: HardwareLifecycleStatus, tooltip?: string) => {
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
        title={tooltip}
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
    return getDeviceMappingReferences(inspectedDevice.id, store).allConnections;
  }, [inspectedDevice, store]);

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
                setAdvancedFilters(DEFAULT_DEVICES_FILTERS);
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
                const exportRows = sortedDevices.map((d) => ({
                  ...d,
                  hardwareLifecycle: getEffectiveStatus(d)
                }));
                downloadModalCsv('FleetRobo_devices_export.csv', visibleColumns, exportRows);
                showToast(`Exported ${exportRows.length} Device records to FleetRobo_devices_export.csv`);
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
                onClick={clearAllDeviceFilters}
                className="text-[#9e431c] hover:underline font-medium cursor-pointer"
              >
                Clear All ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Removable Applied-Filter Chips Row */}
          {activeFilterCount > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-b border-[#e3e8ee] flex items-center gap-2 flex-wrap text-xs shrink-0">
              <span className="text-slate-500 font-medium">Applied Filters:</span>
              {isPlatformAdmin && filterCompany !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Organization Scope: {filterCompany}
                  <button
                    type="button"
                    onClick={() => {
                      setFilterCompany('All');
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {isPlatformAdmin && advancedFilters.organizations.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Organization: {advancedFilters.organizations.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, organizations: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {advancedFilters.categories.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Category: {advancedFilters.categories.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, categories: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {advancedFilters.manufacturers.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Manufacturer: {advancedFilters.manufacturers.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, manufacturers: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {advancedFilters.models.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Model: {advancedFilters.models.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, models: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {advancedFilters.identifierTypes.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Identifier Type: {advancedFilters.identifierTypes.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, identifierTypes: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {advancedFilters.modes.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Mode: {advancedFilters.modes.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, modes: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {advancedFilters.protocols.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Protocol: {advancedFilters.protocols.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, protocols: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {advancedFilters.channels.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Channels: {advancedFilters.channels.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, channels: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {advancedFilters.deviceStatuses.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Device Status: {advancedFilters.deviceStatuses.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, deviceStatuses: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {advancedFilters.mappingStatuses.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Mapping Status: {advancedFilters.mappingStatuses.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, mappingStatuses: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {advancedFilters.inventoryLocations.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Location: {advancedFilters.inventoryLocations.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, inventoryLocations: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {(advancedFilters.registeredFrom || advancedFilters.registeredTo) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Registered: {advancedFilters.registeredFrom || '...'} →{' '}
                  {advancedFilters.registeredTo || '...'}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({
                        ...p,
                        registeredFrom: '',
                        registeredTo: ''
                      }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {(advancedFilters.updatedFrom || advancedFilters.updatedTo) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Updated: {advancedFilters.updatedFrom || '...'} →{' '}
                  {advancedFilters.updatedTo || '...'}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({
                        ...p,
                        updatedFrom: '',
                        updatedTo: ''
                      }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={clearAllDeviceFilters}
                className="text-xs text-[#FA8A63] font-semibold hover:underline ml-2 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}

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
                                    {row.name}
                                  </div>
                                  <div className="text-[11px] text-[#8291a0]">
                                    {row.deviceId} · {row.manufacturer} {row.modelText}
                                  </div>
                                </button>
                              </td>
                            );
                          }
                          if (col.key === 'hardwareLifecycle') {
                            const mapDetails = mappingDetailsById.get(row.id);
                            const badgeTip = mapDetails
                              ? `Mapping: ${mapDetails.mappingStatus}${mapDetails.reason ? ` — ${mapDetails.reason}` : ''}`
                              : undefined;
                            return (
                              <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                                {renderLifecycleBadge(getEffectiveStatus(row), badgeTip)}
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
      {/* 1. ADVANCED FILTERS DRAWER */}
      <DevicesFilterDrawer
        isOpen={activeDrawer === 'filters'}
        onClose={() => setActiveDrawer(null)}
        appliedFilters={advancedFilters}
        onApplyFilters={(next) => {
          setAdvancedFilters(next);
          setCurrentPage(1);
        }}
        authorizedDevices={scopedDevices}
        effectiveStatusById={effectiveStatusById}
        mappingStatusById={mappingStatusById}
        isPlatformAdmin={isPlatformAdmin}
      />

      {/* 2. BULK OPERATIONS DRAWER */}
      <DevicesBulkDrawer
        isOpen={activeDrawer === 'bulk'}
        selectedRecords={selectedDeviceRecords}
        store={store}
        effectiveStatusById={effectiveStatusById}
        availableLocations={availableLocations}
        onClose={() => setActiveDrawer(null)}
        onClearSelection={() => setSelectedIds(new Set())}
        onExportSelected={handleBulkExportSelected}
        onApplyBulkUpdate={handleApplyDevicesBulkUpdate}
      />

      {activeDrawer && activeDrawer !== 'filters' && activeDrawer !== 'bulk' && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/35 backdrop-blur-[1px]">
          <div
            className="flex-1"
            onClick={() => setActiveDrawer(null)}
          />

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
                            kind: advancedFilters.categories[0] || 'All',
                            manufacturer: advancedFilters.manufacturers[0] || 'All',
                            hardwareLifecycle: advancedFilters.deviceStatuses[0] || 'All',
                            advancedFiltersJson: JSON.stringify(advancedFilters)
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
                              if (view.filters.advancedFiltersJson) {
                                try {
                                  const parsed = JSON.parse(view.filters.advancedFiltersJson);
                                  const rawStatuses: string[] = Array.isArray(parsed.deviceStatuses)
                                    ? parsed.deviceStatuses
                                    : [];
                                  const normalizedStatuses = Array.from(
                                    new Set(
                                      rawStatuses
                                        .map((s) => (s === 'Suspended' ? 'In Maintenance' : s))
                                        .filter(
                                          (s): s is EffectiveDeviceStatus =>
                                            s === 'Inventory' ||
                                            s === 'Active' ||
                                            s === 'In Maintenance' ||
                                            s === 'Decommissioned'
                                        )
                                    )
                                  );
                                  setAdvancedFilters({
                                    ...DEFAULT_DEVICES_FILTERS,
                                    ...parsed,
                                    organizations: isPlatformAdmin
                                      ? Array.isArray(parsed.organizations)
                                        ? parsed.organizations
                                        : []
                                      : [],
                                    deviceStatuses: normalizedStatuses
                                  });
                                } catch {
                                  setAdvancedFilters(DEFAULT_DEVICES_FILTERS);
                                }
                              } else {
                                const rawLifecycle = view.filters.hardwareLifecycle || 'All';
                                const normalizedLifecycle =
                                  rawLifecycle === 'Suspended'
                                    ? 'In Maintenance'
                                    : rawLifecycle === 'Pending Hardware Review'
                                    ? 'All'
                                    : rawLifecycle;
                                setAdvancedFilters({
                                  ...DEFAULT_DEVICES_FILTERS,
                                  categories:
                                    view.filters.kind && view.filters.kind !== 'All'
                                      ? [view.filters.kind]
                                      : [],
                                  manufacturers:
                                    view.filters.manufacturer && view.filters.manufacturer !== 'All'
                                      ? [view.filters.manufacturer]
                                      : [],
                                  deviceStatuses:
                                    normalizedLifecycle !== 'All'
                                      ? [normalizedLifecycle as EffectiveDeviceStatus]
                                      : []
                                });
                              }
                              setSortKey(
                                view.sortKey === 'inventoryLocation'
                                  ? 'deviceId'
                                  : view.sortKey || 'deviceId'
                              );
                              setSortDir(view.sortDir || 'asc');
                              setHiddenCols(
                                (view.hiddenCols || []).filter((k) => k !== 'inventoryLocation')
                              );
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
                        label="Brand"
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
                      {inspectedDevice.name}
                    </h2>
                    {renderLifecycleBadge(getEffectiveStatus(inspectedDevice))}
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
                {(() => {
                  const inspectedMapDetails = mappingDetailsById.get(inspectedDevice.id);
                  const inspectedMapStatus = inspectedMapDetails?.mappingStatus || 'Unmapped';
                  const conflictReason = inspectedMapDetails?.reason;
                  return (
                    <>
                {inspectorTab === 'overview' && (
                  <>
                    {inspectedMapStatus === 'Needs Attention' && conflictReason && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[12px] flex items-start gap-2">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">Mapping Attention Required</div>
                          <div className="text-[11px] mt-0.5">{conflictReason}</div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3.5 p-4 rounded-xl border border-[#e3e8ee] bg-[#f8fafc]">
                      {[
                        ['Device name', inspectedDevice.name],
                        ['Device ID', inspectedDevice.deviceId],
                        ['Device category', inspectedDevice.kind],
                        ['Vendor / Manufacturer', inspectedDevice.manufacturer],
                        ['Model', inspectedDevice.modelText],
                        ['Mode', inspectedDevice.mode],
                        ['Platform protocol', inspectedDevice.platformProtocol || '—'],
                        ['Device status', getEffectiveStatus(inspectedDevice)],
                        ['Mapping status', inspectedMapStatus],
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
                          {inspectedConnections.slice(0, 32).map((conn) => {
                            const effConn = computeEffectiveConnectionStatus(conn, store, Date.now());
                            return (
                            <div
                              key={conn.id}
                              className="p-3 rounded-lg border border-[#e3e8ee] flex items-center justify-between gap-2 text-[12px]"
                              title={effConn.reason}
                            >
                               <div>
                                 <div className="font-semibold text-[#17212b]">
                                   {conn.connectionId} · {conn.name}
                                 </div>
                                 <div className="text-[11px] text-[#5c6b7a]">
                                   Members: {conn.members?.length || 1} unit(s) · Updated: {conn.updatedAt?.slice(0, 10)}
                                 </div>
                                 {effConn.status === 'Needs Attention' && effConn.reason && (
                                   <div className="text-[11px] text-amber-800 mt-0.5">{effConn.reason}</div>
                                 )}
                               </div>
                               <span
                                 className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                                   effConn.status === 'Active'
                                     ? 'bg-[#eaf8f0] text-[#0f7b4b]'
                                     : effConn.status === 'Scheduled'
                                     ? 'bg-sky-50 text-sky-700'
                                     : effConn.status === 'Needs Attention'
                                     ? 'bg-amber-50 text-amber-800'
                                     : 'bg-slate-100 text-slate-600'
                                 }`}
                               >
                                 {effConn.status}
                               </span>
                             </div>
                            );
                          })}
                         </div>
                       )}
                     </div>
                   </>
                 )}

                 {inspectorTab === 'linked' && (
                   <div className="space-y-3">
                     {inspectedMapStatus === 'Needs Attention' && conflictReason && (
                       <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[12px] flex items-start gap-2">
                         <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                         <div>
                           <div className="font-semibold">Mapping Attention Required</div>
                           <div className="text-[11px] mt-0.5">{conflictReason}</div>
                         </div>
                       </div>
                     )}
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
                         const effConn = computeEffectiveConnectionStatus(conn, store, Date.now());
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
                             <div className="flex items-center justify-between gap-2">
                               <span className="font-bold text-[#17212b] font-mono">
                                 {conn.connectionId} · {conn.name}
                               </span>
                               <span
                                 className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                                   effConn.status === 'Active'
                                     ? 'bg-[#eaf8f0] text-[#0f7b4b]'
                                     : effConn.status === 'Scheduled'
                                     ? 'bg-sky-50 text-sky-700'
                                     : effConn.status === 'Needs Attention'
                                     ? 'bg-amber-50 text-amber-800'
                                     : 'bg-slate-100 text-slate-600'
                                 }`}
                               >
                                 {effConn.status}
                               </span>
                             </div>
                             <div className="text-[#5c6b7a]">
                               Client: <strong className="text-[#17212b]">{conn.companyName}</strong> · Members:{' '}
                               <strong className="text-[#17212b]">{conn.members?.length || 1}</strong> · Pairwise bindings:{' '}
                               <strong className="text-[#17212b]">{peerBindings.length}</strong>
                             </div>
                             {effConn.status === 'Needs Attention' && effConn.reason && (
                               <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                 {effConn.reason}
                               </div>
                             )}
                           </div>
                         );
                       })
                     )}
                  </div>
                )}
                    </>
                  );
                })()}

                {inspectorTab === 'activity' && (
                  <div className="space-y-3">
                    {[
                      {
                        date: inspectedDevice.updatedAt,
                        title: 'Effective Device status summary',
                        detail: `Current status is ${getEffectiveStatus(inspectedDevice)}${inspectedDevice.inventoryLocation ? ` · Location: ${inspectedDevice.inventoryLocation}` : ''} (${inspectedDevice.company}).`
                      },
                      {
                        date: inspectedDevice.registeredAt,
                        title: 'Gateway hardware registered in Devices Master',
                        detail: `Registered ${inspectedDevice.manufacturer} ${inspectedDevice.modelText}${inspectedDevice.serial ? ` · Serial ${inspectedDevice.serial}` : inspectedDevice.imei ? ` · IMEI ${inspectedDevice.imei}` : ''}.`
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

          {/* 7. DIRECT IMPORT DRAWER */}
          {activeDrawer === 'import' && (
            <div className="w-[620px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-5 py-4 border-b border-[#e3e8ee] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">Import</h2>
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
                    const org = isPlatformAdmin
                      ? filterCompany !== 'All'
                        ? filterCompany
                        : availableOrganizations[0] || 'Adani Mundra'
                      : currentCompany;
                    const csv =
                      'Device name,Device ID,Device category,Vendor / Manufacturer,Model,Mode,Serial number,IMEI,Owner,Inventory location,Inventory status\n' +
                      `ADAS/DMS Dashcam — MettaX MC202N · Mundra Hub,GTW-9101,ADAS/DMS Dashcam,MettaX,MC202N,ADAS,SN-GTW-9101,864019283799101,${org},Mundra CT2,Inventory`;
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
                    const org = isPlatformAdmin
                      ? filterCompany !== 'All'
                        ? filterCompany
                        : availableOrganizations[0] || 'Adani Mundra'
                      : currentCompany;
                    const sampleModel =
                      getEnabledModelsForCompanyName(org).find((m) => m.category === 'Device') ||
                      enabledDeviceModels[0];
                    const cat = sampleModel?.typeName || 'ADAS/DMS Dashcam';
                    const mfg = sampleModel?.manufacturer || 'MettaX';
                    const modRef = sampleModel?.modelReference || 'MC202N';
                    const modMode = sampleModel?.supportedModes?.[0] || sampleModel?.deviceMode || 'ADAS';
                    const sampleCsv =
                      `Device name,Device ID,Device category,Vendor / Manufacturer,Model,Mode,Serial number,IMEI,Owner,Inventory location,Inventory status\n` +
                      `${cat} — ${mfg} ${modRef} #${suffix},GTW-9${suffix},${cat},${mfg},${modRef},${modMode},SN-GTW-9${suffix},864019283799${suffix},${org},Mundra CT2,Inventory`;
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
        const refs = getDeviceMappingReferences(deviceToDelete.id, store);
        const effStatus = getEffectiveStatus(deviceToDelete);
        const blockedByHistory = refs.hasAnyReference;
        const connListLabel = refs.allConnections.map((c) => c.connectionId || c.id).join(', ');
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
            confirmLabel={blockedByHistory ? 'Delete Blocked (In Mapping History)' : 'Delete Device'}
            confirmDisabled={blockedByHistory}
            reasonPresets={blockedByHistory ? [] : undefined}
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
                label: effStatus,
                tone: effStatus === 'Active' ? 'emerald' : 'slate',
              },
            ]}
            confirmationChips={[
              blockedByHistory
                ? {
                    id: 'conn-link',
                    label: `Protected · Referenced in ${Math.max(refs.allConnections.length, refs.allBindings.length, refs.allAllocations.length)} Mapping Record(s)`,
                    tone: 'amber',
                  }
                : {
                    id: 'conn-link',
                    label: 'Safe to Delete · No Mapping History',
                    tone: 'emerald',
                  },
              {
                id: 'scope',
                label: 'Permanent Inventory Removal',
                tone: 'rose',
              },
            ]}
            warningNote={
              blockedByHistory ? (
                <>
                  This device is referenced by active, scheduled, or historical Asset Mapping records
                  {connListLabel ? (
                    <>
                      {' '}(<strong>{connListLabel}</strong>)
                    </>
                  ) : null}
                  . Deletion is blocked to preserve mapping audit history; use Decommission instead once active/scheduled mappings are ended.
                </>
              ) : undefined
            }
            onCancel={() => setDeviceToDelete(null)}
            onConfirm={handleConfirmDeleteDevice}
          />
        );
      })()}
    </div>
  );
};
