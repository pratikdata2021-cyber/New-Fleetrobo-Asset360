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
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
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
  SensorRecord,
  SensorCategory,
  EffectiveSensorStatus,
  SensorMappingFilterStatus,
  SENSOR_COLUMNS,
  MODAL_FIELD_TOOLTIPS,
  SavedModalView,
  HardwareAuditEntry,
  loadModalMasterStore,
  saveModalMasterStore,
  loadSavedModalViews,
  saveSavedModalViews,
  downloadModalCsv,
  parseCsvLine,
  deriveSensorStatus,
  deriveSensorMappingFilterStatus,
  getSensorMappingReferences,
  SENSOR_EFFECTIVE_STATUS_OPTIONS
} from '../types/modalMaster';
import {
  getEnabledModelsForCompanyName,
  getAvailableClientCompanies,
  isCompanyEligibleForNewRegistration,
  resolveClientCompanyByNameOrId
} from '../types/companyModelEnablement';
import { getModelCategoryById, getRecordIdentifierTypes } from '../types/modelCategoryMaster';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';
import {
  SensorsFilterDrawer,
  SensorsAdvancedFilters,
  DEFAULT_SENSORS_FILTERS,
  countActiveSensorFilters,
  matchesSensorsFilters
} from './sensors-master/SensorsFilterDrawer';
import {
  SensorsBulkDrawer,
  SensorsBulkActionMode
} from './sensors-master/SensorsBulkDrawer';

const normalizeSensorTypeAlias = (value: string): string => {
  const norm = (value || '').trim().toLowerCase();
  if (norm === 'fuel sensor' || norm === 'fuel level sensor') return 'fuel level sensor';
  return norm;
};

const sensorTypesMatch = (a: string, b: string): boolean =>
  normalizeSensorTypeAlias(a) === normalizeSensorTypeAlias(b);

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

interface SensorsMasterContentProps {
  currentCompany?: string;
}

export const SensorsMasterContent: React.FC<SensorsMasterContentProps> = ({ currentCompany = 'Adani Mundra' }) => {
  const [store, setStoreState] = useState(() => loadModalMasterStore());
  const [savedViews, setSavedViews] = useState<SavedModalView[]>(() => loadSavedModalViews());
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

  // Model access sync + cross-tab / Mapping store sync + 60s time-window re-evaluation
  const [modelAccessTick, setModelAccessTick] = useState(0);
  const [statusTick, setStatusTick] = useState(0);
  useEffect(() => {
    const handleSync = () => setModelAccessTick((t) => t + 1);
    const handleStoreSync = () => {
      if (!selfWriteRef.current) {
        setStoreState(loadModalMasterStore());
      }
      setStatusTick((t) => t + 1);
    };
    window.addEventListener('fleetrobo:model-access-updated', handleSync);
    window.addEventListener('fleetrobo:modal-store-updated', handleStoreSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('storage', handleStoreSync);
    const timer = window.setInterval(() => setStatusTick((t) => t + 1), 60000);
    return () => {
      window.removeEventListener('fleetrobo:model-access-updated', handleSync);
      window.removeEventListener('fleetrobo:modal-store-updated', handleStoreSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('storage', handleStoreSync);
      window.clearInterval(timer);
    };
  }, []);

  const isPlatformAdmin = currentCompany === 'Platform Admin' || currentCompany === 'Binary';
  const availableOrganizations = useMemo(() => {
    void modelAccessTick;
    return getAvailableClientCompanies();
  }, [modelAccessTick]);

  // Toolbar & Drawer Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('All');
  const [advancedFilters, setAdvancedFilters] = useState<SensorsAdvancedFilters>(
    DEFAULT_SENSORS_FILTERS
  );

  useEffect(() => {
    setFilterCompany('All');
    setAdvancedFilters(DEFAULT_SENSORS_FILTERS);
  }, [currentCompany]);

  // Authorized sensors in active tenant/toolbar scope
  const scopedSensors = useMemo(() => {
    const companyTarget =
      !isPlatformAdmin && currentCompany
        ? currentCompany.trim().toLowerCase()
        : isPlatformAdmin && filterCompany !== 'All'
        ? filterCompany.trim().toLowerCase()
        : null;
    if (!companyTarget) return isPlatformAdmin ? store.sensors : [];
    return store.sensors.filter((s) => (s.company || '').trim().toLowerCase() === companyTarget);
  }, [store.sensors, currentCompany, isPlatformAdmin, filterCompany]);

  // Derived effective Sensor status & mapping filter status
  const { effectiveStatusById, mappingStatusById } = useMemo(() => {
    void statusTick;
    const nowMs = Date.now();
    const statusMap = new Map<string, EffectiveSensorStatus>();
    const mappingMap = new Map<string, SensorMappingFilterStatus>();
    store.sensors.forEach((s) => {
      statusMap.set(s.id, deriveSensorStatus(s, store, nowMs));
      mappingMap.set(s.id, deriveSensorMappingFilterStatus(s.id, store, nowMs));
    });
    return { effectiveStatusById: statusMap, mappingStatusById: mappingMap };
  }, [store, statusTick]);

  const getEffectiveStatus = (sensor: SensorRecord): EffectiveSensorStatus =>
    effectiveStatusById.get(sensor.id) ?? deriveSensorStatus(sensor, store);

  // Enabled Sensor models for the active company (or selected filter company in Platform Admin)
  const enabledSensorModels = useMemo(() => {
    const scopeCompany = isPlatformAdmin && filterCompany !== 'All' ? filterCompany : currentCompany;
    return getEnabledModelsForCompanyName(scopeCompany).filter(
      (m) => m.category === 'Sensor'
    );
  }, [currentCompany, isPlatformAdmin, filterCompany, modelAccessTick]);

  const enabledSensorCategories = useMemo<string[]>(() => {
    return Array.from(new Set(enabledSensorModels.map((m) => m.typeName)));
  }, [enabledSensorModels]);

  const availableLocations = useMemo<string[]>(() => {
    return Array.from(
      new Set(scopedSensors.map((s) => (s.inventoryLocation || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [scopedSensors]);

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
  const [inspectedSensor, setInspectedSensor] = useState<SensorRecord | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'linked' | 'activity'>('overview');

  // Form state (Create / Edit)
  const [editingSensor, setEditingSensor] = useState<SensorRecord | null>(null);
  const [formName, setFormName] = useState('');
  const [formDeviceId, setFormDeviceId] = useState('');
  const [formKind, setFormKind] = useState<SensorCategory>(
    () => enabledSensorCategories[0] || ''
  );
  const [formSerial, setFormSerial] = useState('');
  const [formIdentifierType, setFormIdentifierType] = useState('');
  const [formManufacturer, setFormManufacturer] = useState(
    () => enabledSensorModels[0]?.manufacturer || ''
  );
  const [formModelText, setFormModelText] = useState(
    () => enabledSensorModels[0]?.modelReference || enabledSensorModels[0]?.typeName || ''
  );
  const [formMeasurementCap, setFormMeasurementCap] = useState<string>(
    () => enabledSensorModels[0]?.measurementType || ''
  );
  const [formUnit, setFormUnit] = useState<string>(
    () => enabledSensorModels[0]?.measurementUnit || ''
  );
  const [formRange, setFormRange] = useState('');
  const [formCapabilities, setFormCapabilities] = useState<string[]>([]);
  const [formCompany, setFormCompany] = useState(() =>
    currentCompany && currentCompany !== 'Platform Admin' && currentCompany !== 'Binary'
      ? currentCompany
      : availableOrganizations[0] || ''
  );

  const effectiveFormCompany = isPlatformAdmin
    ? formCompany || availableOrganizations[0] || ''
    : currentCompany;

  const formEnabledSensorModels = useMemo(() => {
    return getEnabledModelsForCompanyName(effectiveFormCompany).filter(
      (m) => m.category === 'Sensor'
    );
  }, [effectiveFormCompany, modelAccessTick]);

  const formSelectableSensorModels = useMemo(() => {
    if (!editingSensor) return formEnabledSensorModels;
    const historical = editingSensor.modelTypeId
      ? getModelCategoryById(editingSensor.modelTypeId)
      : undefined;
    if (historical && !formEnabledSensorModels.some((m) => m.id === historical.id)) {
      return [historical, ...formEnabledSensorModels];
    }
    return formEnabledSensorModels;
  }, [editingSensor, formEnabledSensorModels]);

  const formEnabledSensorCategories = useMemo<string[]>(() => {
    const cats = Array.from(new Set(formSelectableSensorModels.map((m) => m.typeName)));
    if (editingSensor?.kind && !cats.includes(editingSensor.kind)) {
      return [editingSensor.kind, ...cats];
    }
    return cats;
  }, [formSelectableSensorModels, editingSensor]);
  const [formLocation, setFormLocation] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Saved view creation state
  const [newViewName, setNewViewName] = useState('');

  // Direct upload state
  const sensorUpload = useDirectUploadState(activeDrawer === 'import');

  useEffect(() => {
    saveSavedModalViews(savedViews);
  }, [savedViews]);

  // Derived form options strictly from formSelectableSensorModels for the selected category
  const modelsForSelectedCategory = useMemo(() => {
    return formSelectableSensorModels.filter((m) => sensorTypesMatch(m.typeName, formKind));
  }, [formSelectableSensorModels, formKind]);

  const availableManufacturers = useMemo<string[]>(() => {
    if (modelsForSelectedCategory.length > 0) {
      const mfgs = Array.from(
        new Set(modelsForSelectedCategory.map((m) => m.manufacturer).filter(Boolean))
      );
      if (editingSensor?.manufacturer && !mfgs.includes(editingSensor.manufacturer)) {
        return [editingSensor.manufacturer, ...mfgs];
      }
      return mfgs;
    }
    if (editingSensor?.manufacturer) {
      return [editingSensor.manufacturer];
    }
    return [];
  }, [modelsForSelectedCategory, editingSensor]);

  const availableModels = useMemo<
    { model: string; modelId?: string }[]
  >(() => {
    if (modelsForSelectedCategory.length > 0) {
      const byMfg = modelsForSelectedCategory.filter((m) => m.manufacturer === formManufacturer);
      const validModels = byMfg
        .map((m) => ({
          model: m.modelReference || m.typeName,
          modelId: m.id
        }))
        .filter((x) => Boolean(x.model));
      if (validModels.length > 0) return validModels;
    }
    if (editingSensor && editingSensor.modelText) {
      return [{ model: editingSensor.modelText, modelId: editingSensor.modelTypeId }];
    }
    return [];
  }, [modelsForSelectedCategory, formManufacturer, editingSensor]);

  // Exact matching on category=Sensor, type, manufacturer, model, and tenant-enabled/historical modelTypeId
  const selectedSensorModelSpec = useMemo(() => {
    if (editingSensor?.modelTypeId) {
      const exactHistorical = formSelectableSensorModels.find(
        (m) =>
          m.category === 'Sensor' &&
          m.id === editingSensor.modelTypeId &&
          sensorTypesMatch(m.typeName, formKind) &&
          m.manufacturer === formManufacturer &&
          (m.modelReference || m.typeName) === formModelText
      );
      if (exactHistorical) return exactHistorical;
    }
    return (
      modelsForSelectedCategory.find(
        (m) =>
          m.category === 'Sensor' &&
          m.manufacturer === formManufacturer &&
          (m.modelReference || m.typeName) === formModelText
      ) || null
    );
  }, [
    editingSensor,
    formSelectableSensorModels,
    modelsForSelectedCategory,
    formKind,
    formManufacturer,
    formModelText
  ]);

  const availableIdentifierTypes = useMemo(() => {
    const fromSpec = getRecordIdentifierTypes(selectedSensorModelSpec);
    if (fromSpec.length > 0) return fromSpec;
    if (editingSensor?.identifierType) {
      return getRecordIdentifierTypes({ identifierType: editingSensor.identifierType });
    }
    return ['Serial Number'];
  }, [selectedSensorModelSpec, editingSensor]);

  const activeIdentifierType = useMemo(() => {
    if (formIdentifierType && availableIdentifierTypes.includes(formIdentifierType)) {
      return formIdentifierType;
    }
    return availableIdentifierTypes[0] || 'Serial Number';
  }, [formIdentifierType, availableIdentifierTypes]);

  // Keep defaults aligned when company or enabled models change during Create
  useEffect(() => {
    if (editingSensor) return;
    if (formEnabledSensorModels.length > 0) {
      const first =
        formEnabledSensorModels.find((m) => sensorTypesMatch(m.typeName, formKind)) ||
        formEnabledSensorModels[0];
      setFormKind(first.typeName);
      setFormManufacturer(first.manufacturer || '');
      setFormModelText(first.modelReference || first.typeName);
      setFormMeasurementCap(first.measurementType || '');
      setFormUnit(first.measurementUnit || '');
      setFormIdentifierType(getRecordIdentifierTypes(first)[0] || '');
    } else {
      setFormKind('');
      setFormManufacturer('');
      setFormModelText('');
      setFormMeasurementCap('');
      setFormUnit('');
      setFormIdentifierType('');
    }
  }, [effectiveFormCompany, formEnabledSensorModels, editingSensor]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingSensor(null);
    const targetOrg = isPlatformAdmin
      ? filterCompany !== 'All'
        ? filterCompany
        : availableOrganizations[0] || ''
      : currentCompany || '';
    const targetModels = getEnabledModelsForCompanyName(targetOrg).filter(
      (m) => m.category === 'Sensor'
    );
    const targetCats = Array.from(new Set(targetModels.map((m) => m.typeName)));
    const nextNum = 10001 + store.sensors.length;
    const initialKind = targetCats[0] || '';
    const initialSpec = targetModels.find((m) => m.typeName === initialKind) || targetModels[0];
    const mfg = initialSpec?.manufacturer || '';
    const modelStr = initialSpec?.modelReference || initialSpec?.typeName || '';

    setFormName('');
    setFormDeviceId(`SENS-${nextNum}`);
    setFormKind(initialKind);
    setFormIdentifierType(getRecordIdentifierTypes(initialSpec)[0] || '');
    setFormSerial('');
    setFormManufacturer(mfg);
    setFormModelText(modelStr);
    setFormMeasurementCap(initialSpec?.measurementType || '');
    setFormUnit(initialSpec?.measurementUnit || '');
    setFormRange('');
    setFormCapabilities([]);
    setFormCompany(targetOrg);
    setFormLocation('');
    setFormNotes('');
    setFormError(
      initialSpec
        ? null
        : `No active Sensor models are enabled for "${targetOrg || 'this company'}". Enable a Sensor model in Company Model Access first.`
    );
    setActiveDrawer('form');
  };

  // Open Edit Form
  const handleOpenEdit = (record: SensorRecord) => {
    setEditingSensor(record);
    setFormName(record.name);
    setFormDeviceId(record.deviceId);
    setFormKind(record.kind);
    setFormIdentifierType(record.identifierType || '');
    setFormSerial(record.serial);
    setFormManufacturer(record.manufacturer);
    setFormModelText(record.modelText);
    setFormMeasurementCap(record.measurementCapability || '');
    setFormUnit(record.measurementUnit || '');
    setFormRange(record.measurementRange || '');
    setFormCapabilities([...(record.capabilities || [])]);
    setFormCompany(record.company || currentCompany || '');
    setFormLocation(record.inventoryLocation || '');
    setFormNotes(record.notes || '');
    setFormError(null);
    setActiveDrawer('form');
  };

  // Dynamic sensor type change
  const handleSensorTypeChange = (newType: SensorCategory) => {
    setFormKind(newType);
    const matching = formSelectableSensorModels.filter((m) =>
      sensorTypesMatch(m.typeName, newType)
    );
    if (matching.length > 0) {
      const first = matching[0];
      setFormManufacturer(first.manufacturer || '');
      setFormModelText(first.modelReference || first.typeName);
      setFormMeasurementCap(first.measurementType || '');
      setFormUnit(first.measurementUnit || '');
      setFormIdentifierType(getRecordIdentifierTypes(first)[0] || '');
    } else {
      setFormManufacturer('');
      setFormModelText('');
      setFormMeasurementCap('');
      setFormUnit('');
      setFormIdentifierType('');
    }
  };

  // Dynamic manufacturer change
  const handleManufacturerChange = (newMfg: string) => {
    setFormManufacturer(newMfg);
    const matching = modelsForSelectedCategory.filter((m) => m.manufacturer === newMfg);
    if (matching.length > 0) {
      const first = matching[0];
      setFormModelText(first.modelReference || first.typeName);
      setFormMeasurementCap(first.measurementType || '');
      setFormUnit(first.measurementUnit || '');
      setFormIdentifierType(getRecordIdentifierTypes(first)[0] || '');
    } else {
      setFormModelText('');
      setFormMeasurementCap('');
      setFormUnit('');
    }
  };

  // Dynamic model change
  const handleModelChange = (newModel: string) => {
    setFormModelText(newModel);
    const matched = modelsForSelectedCategory.find(
      (m) => m.manufacturer === formManufacturer && (m.modelReference || m.typeName) === newModel
    );
    if (matched) {
      setFormMeasurementCap(matched.measurementType || '');
      setFormUnit(matched.measurementUnit || '');
      setFormIdentifierType(getRecordIdentifierTypes(matched)[0] || '');
    }
  };

  // Save Sensor
  const handleSaveSensor = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    const trimmedId = formDeviceId.trim();
    const trimmedSerial = formSerial.trim();

    if (!editingSensor && formEnabledSensorModels.length === 0) {
      setFormError(
        `No active Sensor models are currently available for "${effectiveFormCompany}". Approve models or verify company status in Company Management.`
      );
      return;
    }

    if (!trimmedName || !trimmedId || !trimmedSerial || !formKind || !formManufacturer || !formModelText) {
      setFormError('Please complete all required fields marked with *.');
      return;
    }

    const finalCompany = (isPlatformAdmin ? formCompany : currentCompany).trim();
    const matchedCompany = resolveClientCompanyByNameOrId(finalCompany);
    if (
      !finalCompany ||
      !matchedCompany ||
      matchedCompany.isPlatformOwner ||
      !isCompanyEligibleForNewRegistration(matchedCompany)
    ) {
      setFormError(
        `Organization "${finalCompany || 'Unknown'}" is not an eligible client company for sensor registration.`
      );
      return;
    }

    // Validate model matches exact company-approved Sensor model (unless editing unchanged historical record)
    const isUnchangedHistoricalModel =
      Boolean(editingSensor) &&
      editingSensor!.kind === formKind &&
      editingSensor!.manufacturer === formManufacturer &&
      editingSensor!.modelText === formModelText;

    if (!isUnchangedHistoricalModel) {
      if (!selectedSensorModelSpec) {
        setFormError(
          `Selected model "${formManufacturer} ${formModelText}" does not match an active Sensor model in ${matchedCompany.name}'s Model Access.`
        );
        return;
      }
      const isEnabledForTenant = formEnabledSensorModels.some(
        (m) => m.id === selectedSensorModelSpec.id
      );
      if (!isEnabledForTenant) {
        setFormError(
          `Model "${formManufacturer} ${formModelText}" is not enabled for ${matchedCompany.name}. Enable it in Company Model Access first.`
        );
        return;
      }
    }

    // Cross-module uniqueness across both devices AND sensors
    const duplicateInDevices = store.devices.some(
      (d) =>
        d.deviceId.toLowerCase() === trimmedId.toLowerCase() ||
        d.serial.toLowerCase() === trimmedSerial.toLowerCase()
    );
    const duplicateInSensors = store.sensors.some(
      (s) =>
        s.id !== editingSensor?.id &&
        (s.deviceId.toLowerCase() === trimmedId.toLowerCase() ||
          s.serial.toLowerCase() === trimmedSerial.toLowerCase())
    );

    if (duplicateInDevices || duplicateInSensors) {
      setFormError('Device/Sensor ID and physical identifier must be unique.');
      return;
    }

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);

    if (editingSensor) {
      const nextAudit: HardwareAuditEntry = {
        id: `aud-sen-${Date.now()}`,
        timestamp: nowIso,
        actor: isPlatformAdmin ? 'Platform Admin' : matchedCompany.name,
        action: 'Updated',
        summary: `Updated sensor metadata (${trimmedId} · ${formManufacturer} ${formModelText}).`
      };
      const candidate: SensorRecord = {
        ...editingSensor,
        name: trimmedName,
        deviceId: trimmedId,
        kind: formKind,
        category: formKind,
        manufacturer: formManufacturer,
        modelText: formModelText,
        modelTypeId: selectedSensorModelSpec?.id || editingSensor.modelTypeId,
        identifierType: activeIdentifierType,
        serial: trimmedSerial,
        capabilities: formCapabilities,
        measurementCapability: selectedSensorModelSpec?.measurementType || formMeasurementCap,
        measurementUnit: selectedSensorModelSpec?.measurementUnit || formUnit,
        measurementRange: formRange.trim(),
        company: matchedCompany.name,
        inventoryLocation: formLocation.trim(),
        notes: formNotes.trim(),
        auditHistory: [nextAudit, ...(editingSensor.auditHistory || [])].slice(0, 25),
        updatedAt: todayStr
      };
      const effectiveStatus = deriveSensorStatus(candidate, store);
      const updatedRecord: SensorRecord = {
        ...candidate,
        hardwareLifecycle: effectiveStatus
      };
      setStore((prev) => ({
        ...prev,
        sensors: prev.sensors.map((s) => (s.id === editingSensor.id ? updatedRecord : s))
      }));
      if (inspectedSensor?.id === editingSensor.id) {
        setInspectedSensor(updatedRecord);
      }
      showToast(`Sensor ${trimmedId} updated.`);
    } else {
      const createAudit: HardwareAuditEntry = {
        id: `aud-sen-${Date.now()}`,
        timestamp: nowIso,
        actor: isPlatformAdmin ? 'Platform Admin' : matchedCompany.name,
        action: 'Registered',
        summary: `Registered sensor ${trimmedId} (${formManufacturer} ${formModelText}) into Inventory.`
      };
      const newRecord: SensorRecord = {
        id: `sen-focus-${Date.now()}`,
        deviceId: trimmedId,
        name: trimmedName,
        kind: formKind,
        role: 'peripheral',
        category: formKind,
        manufacturer: formManufacturer,
        modelText: formModelText,
        modelTypeId: selectedSensorModelSpec?.id,
        identifierType: activeIdentifierType,
        serial: trimmedSerial,
        capabilities: formCapabilities,
        measurementCapability: selectedSensorModelSpec?.measurementType || formMeasurementCap,
        measurementUnit: selectedSensorModelSpec?.measurementUnit || formUnit,
        measurementRange: formRange.trim(),
        company: matchedCompany.name,
        inventoryLocation: '',
        hardwareLifecycle: 'Inventory',
        statusOverride: null,
        auditHistory: [createAudit],
        registeredAt: todayStr,
        updatedAt: todayStr,
        notes: formNotes.trim()
      };
      setStore((prev) => ({
        ...prev,
        sensors: [newRecord, ...prev.sensors]
      }));
      setSortKey('');
      setCurrentPage(1);
      showToast(`Sensor ${trimmedId} created in Inventory.`);
    }

    setActiveDrawer(null);
  };

  // Filtered & Sorted Sensors (strictly scoped to authorized tenant & sectional drawer filters)
  const effectiveAdvancedFilters = useMemo<SensorsAdvancedFilters>(() => {
    if (
      isPlatformAdmin &&
      filterCompany !== 'All' &&
      advancedFilters.organizations.length === 0
    ) {
      return { ...advancedFilters, organizations: [filterCompany] };
    }
    return advancedFilters;
  }, [isPlatformAdmin, filterCompany, advancedFilters]);

  const filteredSensors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedSensors.filter((s) => {
      const eff = getEffectiveStatus(s);
      const mapSt = mappingStatusById.get(s.id) || 'Unmapped';
      if (!matchesSensorsFilters(s, effectiveAdvancedFilters, eff, mapSt, isPlatformAdmin)) {
        return false;
      }
      if (q) {
        const hay = [
          s.name,
          s.deviceId,
          s.kind,
          s.manufacturer,
          s.modelText,
          s.identifierType,
          s.serial,
          s.measurementCapability,
          s.measurementUnit,
          s.measurementRange,
          s.company,
          s.inventoryLocation,
          eff
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    scopedSensors,
    effectiveAdvancedFilters,
    isPlatformAdmin,
    searchQuery,
    effectiveStatusById,
    mappingStatusById
  ]);

  // Prune stale selections on company switch, search, or filter change
  useEffect(() => {
    const visibleIds = new Set(filteredSensors.map((s) => s.id));
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visibleIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [filteredSensors]);

  const sortedSensors = useMemo(() => {
    if (!sortKey) return filteredSensors;
    const copy = [...filteredSensors];
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
  }, [filteredSensors, sortKey, sortDir, effectiveStatusById]);

  const totalRecords = sortedSensors.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const currentRows = sortedSensors.slice(startIdx, startIdx + pageSize);

  const visibleColumns = useMemo(
    () => SENSOR_COLUMNS.filter((c) => !hiddenCols.includes(c.key)),
    [hiddenCols]
  );

  const activeFilterCount = useMemo(
    () => countActiveSensorFilters(effectiveAdvancedFilters, isPlatformAdmin),
    [effectiveAdvancedFilters, isPlatformAdmin]
  );

  const clearAllSensorFilters = () => {
    setFilterCompany('All');
    setAdvancedFilters(DEFAULT_SENSORS_FILTERS);
    setCurrentPage(1);
  };

  const handleApplyAdvancedFilters = (next: SensorsAdvancedFilters) => {
    setAdvancedFilters(next);
    if (isPlatformAdmin) {
      setFilterCompany(next.organizations.length === 1 ? next.organizations[0] : 'All');
    }
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
  const openInspector = (rec: SensorRecord) => {
    setInspectedSensor(rec);
    setInspectorTab('overview');
    setActiveDrawer('inspector');
  };

  const [sensorToDelete, setSensorToDelete] = useState<SensorRecord | null>(null);

  const handleConfirmDeleteSensor = () => {
    if (!sensorToDelete) return;
    const refs = getSensorMappingReferences(sensorToDelete.id, store);
    if (refs.hasAnyReference) {
      showToast(
        `Cannot delete ${sensorToDelete.deviceId}: referenced in ${refs.allConnections.length || refs.allBindings.length || refs.allAllocations.length} Asset Mapping record(s).`,
        'error'
      );
      return;
    }
    const idToDelete = sensorToDelete.id;
    setStore((prev) => ({
      ...prev,
      sensors: prev.sensors.filter((s) => s.id !== idToDelete),
    }));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(idToDelete);
      return next;
    });
    showToast(`Sensor "${sensorToDelete.name}" (${sensorToDelete.deviceId}) deleted successfully`);
    setSensorToDelete(null);
    if (inspectedSensor?.id === idToDelete) {
      setActiveDrawer(null);
      setInspectedSensor(null);
    }
  };

  // Selected sensors strictly scoped to authorized filtered view
  const selectedSensorRecords = useMemo(
    () => filteredSensors.filter((s) => selectedIds.has(s.id)),
    [filteredSensors, selectedIds]
  );

  const handleBulkExportSelected = (recordsToExport: SensorRecord[]) => {
    if (recordsToExport.length === 0) return;
    const exportRows = recordsToExport.map((s) => ({
      ...s,
      hardwareLifecycle: getEffectiveStatus(s)
    }));
    downloadModalCsv('FleetRobo_sensors_selected_export.csv', visibleColumns, exportRows);
    showToast(
      `Exported ${exportRows.length} selected Sensor record(s) to FleetRobo_sensors_selected_export.csv`
    );
  };

  const handleApplySensorsBulkUpdate = (
    mode: Exclude<SensorsBulkActionMode, 'export_selected'>,
    eligibleIds: string[],
    options?: { targetLocation?: string; targetOwner?: string }
  ) => {
    // Re-evaluate tenant & mapping eligibility at commit time (reject stale selections)
    const allowedScopeIds = new Set(filteredSensors.map((s) => s.id));
    const safeIds = new Set(eligibleIds.filter((id) => allowedScopeIds.has(id)));
    if (safeIds.size === 0) return;

    const nowMs = Date.now();
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);
    const actorLabel = isPlatformAdmin ? 'Platform Admin' : currentCompany;

    if (mode === 'delete') {
      let deletedCount = 0;
      const deletedSet = new Set<string>();
      setStore((prev) => ({
        ...prev,
        sensors: prev.sensors.filter((s) => {
          if (!safeIds.has(s.id)) return true;
          const refs = getSensorMappingReferences(s.id, prev, nowMs);
          if (refs.hasAnyReference) return true;
          deletedSet.add(s.id);
          deletedCount += 1;
          return false;
        })
      }));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedSet.forEach((id) => next.delete(id));
        return next;
      });
      if (inspectedSensor && deletedSet.has(inspectedSensor.id)) {
        setInspectedSensor(null);
      }
      showToast(`Deleted ${deletedCount} unreferenced sensor(s).`);
      return;
    }

    if (mode === 'update_ownership') {
      if (!isPlatformAdmin) {
        showToast('Only Platform Admin can transfer sensor ownership.', 'error');
        return;
      }
      const nextOwnerName = (options?.targetOwner || '').trim();
      const targetComp = resolveClientCompanyByNameOrId(nextOwnerName);
      if (!targetComp || targetComp.isPlatformOwner || !isCompanyEligibleForNewRegistration(targetComp)) {
        showToast(`Target organization "${nextOwnerName}" is invalid or ineligible.`, 'error');
        return;
      }
      const targetEnabledModels = getEnabledModelsForCompanyName(targetComp.name).filter(
        (m) => m.category === 'Sensor'
      );
      let transferred = 0;

      setStore((prev) => ({
        ...prev,
        sensors: prev.sensors.map((s) => {
          if (!safeIds.has(s.id)) return s;
          if ((s.company || '').trim().toLowerCase() === targetComp.name.toLowerCase()) return s;
          const refs = getSensorMappingReferences(s.id, prev, nowMs);
          if (refs.hasAnyReference) return s;
          if (s.modelTypeId && !targetEnabledModels.some((m) => m.id === s.modelTypeId)) {
            return s;
          }
          transferred += 1;
          const auditEntry: HardwareAuditEntry = {
            id: `aud-own-${Date.now()}-${transferred}`,
            timestamp: nowIso,
            actor: actorLabel,
            action: 'Ownership Transfer',
            summary: `Transferred ownership from ${s.company} to ${targetComp.name}.`
          };
          return {
            ...s,
            company: targetComp.name,
            auditHistory: [auditEntry, ...(s.auditHistory || [])].slice(0, 25),
            updatedAt: todayStr
          };
        })
      }));
      showToast(`Transferred ownership on ${transferred} eligible sensor(s) to ${targetComp.name}.`);
      return;
    }

    let updatedCount = 0;
    setStore((prev) => ({
      ...prev,
      sensors: prev.sensors.map((s) => {
        if (!safeIds.has(s.id)) return s;
        const refs = getSensorMappingReferences(s.id, prev, nowMs);
        const eff = deriveSensorStatus(s, prev, nowMs);

        if (mode === 'send_maintenance') {
          if (eff === 'Decommissioned' || eff === 'In Maintenance' || refs.hasActiveOrScheduledReference) {
            return s;
          }
          updatedCount += 1;
          const auditEntry: HardwareAuditEntry = {
            id: `aud-mnt-${Date.now()}-${updatedCount}`,
            timestamp: nowIso,
            actor: actorLabel,
            action: 'Sent to Maintenance',
            summary: `Placed into In Maintenance override (previous status: ${eff}).`
          };
          return {
            ...s,
            statusOverride: 'In Maintenance',
            hardwareLifecycle: 'In Maintenance',
            auditHistory: [auditEntry, ...(s.auditHistory || [])].slice(0, 25),
            updatedAt: todayStr
          };
        }

        if (mode === 'return_service') {
          if (eff !== 'In Maintenance') return s;
          const cleared: SensorRecord = { ...s, statusOverride: null };
          const recalc = deriveSensorStatus(cleared, prev, nowMs);
          updatedCount += 1;
          const auditEntry: HardwareAuditEntry = {
            id: `aud-ret-${Date.now()}-${updatedCount}`,
            timestamp: nowIso,
            actor: actorLabel,
            action: 'Returned to Service',
            summary: `Cleared Maintenance override; derived status recalculated to ${recalc}.`
          };
          return {
            ...cleared,
            hardwareLifecycle: recalc,
            auditHistory: [auditEntry, ...(s.auditHistory || [])].slice(0, 25),
            updatedAt: todayStr
          };
        }

        if (mode === 'update_location') {
          if (eff === 'Decommissioned') return s;
          const nextLoc = (options?.targetLocation || '').trim();
          if (!nextLoc) return s;
          updatedCount += 1;
          const auditEntry: HardwareAuditEntry = {
            id: `aud-loc-${Date.now()}-${updatedCount}`,
            timestamp: nowIso,
            actor: actorLabel,
            action: 'Location Updated',
            summary: `Updated Inventory Location to "${nextLoc}".`
          };
          return {
            ...s,
            inventoryLocation: nextLoc,
            auditHistory: [auditEntry, ...(s.auditHistory || [])].slice(0, 25),
            updatedAt: todayStr
          };
        }

        if (mode === 'decommission') {
          if (eff === 'Decommissioned' || refs.hasActiveOrScheduledReference) return s;
          updatedCount += 1;
          const auditEntry: HardwareAuditEntry = {
            id: `aud-dec-${Date.now()}-${updatedCount}`,
            timestamp: nowIso,
            actor: actorLabel,
            action: 'Decommissioned',
            summary: `Permanently decommissioned from ${eff}.`
          };
          return {
            ...s,
            statusOverride: 'Decommissioned',
            hardwareLifecycle: 'Decommissioned',
            auditHistory: [auditEntry, ...(s.auditHistory || [])].slice(0, 25),
            updatedAt: todayStr
          };
        }

        return s;
      })
    }));

    if (mode === 'send_maintenance') {
      showToast(`Moved ${updatedCount} sensor(s) to In Maintenance.`);
    } else if (mode === 'return_service') {
      showToast(`Returned ${updatedCount} sensor(s) to service and recalculated status.`);
    } else if (mode === 'update_location') {
      showToast(`Updated Inventory Location on ${updatedCount} sensor(s).`);
    } else if (mode === 'decommission') {
      showToast(`Decommissioned ${updatedCount} sensor(s).`);
    }
  };

  // Direct CSV/JSON upload execution (preserves Door Sensor / custom types, validates company-enabled models, zero fake defaults)
  const processSensorsUpload = (fmt: 'csv' | 'json', rawText: string, fileName: string, fileSize?: number) => {
    const raw = rawText.trim();
    if (!raw) {
      sensorUpload.fail('Uploaded file is empty.');
      return;
    }

    const valid: SensorRecord[] = [];
    const invalid: { line: number; reason: string }[] = [];
    const seenIds = new Set([
      ...store.devices.map((d) => d.deviceId.toLowerCase()),
      ...store.sensors.map((s) => s.deviceId.toLowerCase())
    ]);
    const seenSerials = new Set(
      [
        ...store.devices.map((d) => (d.serial || '').trim().toLowerCase()),
        ...store.sensors.map((s) => (s.serial || '').trim().toLowerCase())
      ].filter(Boolean)
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    const validateAndBuildRow = (
      lineNum: number,
      rowData: {
        name: string;
        deviceId: string;
        kind: string;
        manufacturer: string;
        modelText: string;
        serial: string;
        measurementCapability: string;
        measurementUnit: string;
        measurementRange: string;
        company: string;
        inventoryLocation: string;
      }
    ) => {
      const name = (rowData.name || '').trim();
      const deviceId = (rowData.deviceId || '').trim();
      const kind = (rowData.kind || '').trim();
      const manufacturer = (rowData.manufacturer || '').trim();
      const modelText = (rowData.modelText || '').trim();
      const serial = (rowData.serial || '').trim();
      const requestedCompany = (rowData.company || '').trim();

      if (!name || !deviceId || !serial || !kind || !manufacturer || !modelText) {
        invalid.push({
          line: lineNum,
          reason: 'Missing required Sensor name, Sensor ID, Sensor type, Manufacturer, Model, or physical identifier'
        });
        return;
      }

      if (seenIds.has(deviceId.toLowerCase()) || seenSerials.has(serial.toLowerCase())) {
        invalid.push({
          line: lineNum,
          reason: `Duplicate Sensor ID (${deviceId}) or identifier (${serial})`
        });
        return;
      }

      // Enforce strict tenant isolation
      let resolvedOrgName = currentCompany;
      if (isPlatformAdmin) {
        if (!requestedCompany) {
          invalid.push({
            line: lineNum,
            reason: 'Organization / Ownership is required for Platform Admin import'
          });
          return;
        }
        const matched = resolveClientCompanyByNameOrId(requestedCompany);
        if (!matched || matched.isPlatformOwner || !isCompanyEligibleForNewRegistration(matched)) {
          invalid.push({
            line: lineNum,
            reason: `Organization "${requestedCompany}" is unknown or ineligible for registration`
          });
          return;
        }
        resolvedOrgName = matched.name;
      } else {
        if (
          requestedCompany &&
          requestedCompany.toLowerCase() !== currentCompany.trim().toLowerCase()
        ) {
          invalid.push({
            line: lineNum,
            reason: `Cross-company import blocked ("${requestedCompany}" != "${currentCompany}")`
          });
          return;
        }
        const matched = resolveClientCompanyByNameOrId(currentCompany);
        if (!matched || !isCompanyEligibleForNewRegistration(matched)) {
          invalid.push({
            line: lineNum,
            reason: `Current company "${currentCompany}" is not eligible for registration`
          });
          return;
        }
        resolvedOrgName = matched.name;
      }

      // Match exact enabled Sensor model in Model Category Master for target company
      const tenantModels = getEnabledModelsForCompanyName(resolvedOrgName).filter(
        (m) => m.category === 'Sensor'
      );
      const matchedModel = tenantModels.find(
        (m) =>
          sensorTypesMatch(m.typeName, kind) &&
          m.manufacturer.trim().toLowerCase() === manufacturer.toLowerCase() &&
          (m.modelReference || m.typeName).trim().toLowerCase() === modelText.toLowerCase()
      );
      if (!matchedModel) {
        invalid.push({
          line: lineNum,
          reason: `Model "${kind} / ${manufacturer} ${modelText}" is not enabled for ${resolvedOrgName}`
        });
        return;
      }

      const idTypes = getRecordIdentifierTypes(matchedModel);
      const primaryIdentType = idTypes[0] || matchedModel.identifierType || 'Serial Number';

      seenIds.add(deviceId.toLowerCase());
      seenSerials.add(serial.toLowerCase());

      valid.push({
        id: `sen-import-${Date.now()}-${valid.length}`,
        deviceId,
        name,
        kind: matchedModel.typeName,
        role: 'peripheral',
        category: matchedModel.typeName,
        manufacturer: matchedModel.manufacturer,
        modelText: matchedModel.modelReference || matchedModel.typeName,
        modelTypeId: matchedModel.id,
        identifierType: primaryIdentType,
        serial,
        capabilities: [],
        measurementCapability:
          matchedModel.measurementType || rowData.measurementCapability.trim() || '',
        measurementUnit:
          matchedModel.measurementUnit || rowData.measurementUnit.trim() || '',
        measurementRange: rowData.measurementRange.trim(),
        company: resolvedOrgName,
        inventoryLocation: rowData.inventoryLocation.trim(),
        hardwareLifecycle: 'Inventory',
        statusOverride: null,
        auditHistory: [
          {
            id: `aud-imp-${Date.now()}-${valid.length}`,
            timestamp: nowIso,
            actor: isPlatformAdmin ? 'Platform Admin' : resolvedOrgName,
            action: 'Imported',
            summary: `Imported into Inventory via ${fileName}.`
          }
        ],
        registeredAt: todayStr,
        updatedAt: todayStr,
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
            kind: String(item.kind || item.category || ''),
            manufacturer: String(item.manufacturer || ''),
            modelText: String(item.modelText || item.model || ''),
            serial: String(item.serial || item.identifierValue || ''),
            measurementCapability: String(item.measurementCapability || ''),
            measurementUnit: String(item.measurementUnit || ''),
            measurementRange: String(item.measurementRange || ''),
            company: String(item.company || item.organization || ''),
            inventoryLocation: String(item.inventoryLocation || '')
          });
        });
      } catch {
        sensorUpload.fail('Invalid JSON syntax.');
        return;
      }
    } else {
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      lines.forEach((line, idx) => {
        const cols = parseCsvLine(line);
        if (idx === 0 && cols[0]?.toLowerCase().includes('sensor')) {
          return;
        }
        const [
          name = '',
          deviceId = '',
          kind = '',
          manufacturer = '',
          modelText = '',
          serial = '',
          measurementCapability = '',
          measurementUnit = '',
          measurementRange = '',
          company = '',
          col11 = '',
          col12 = ''
        ] = cols;
        // Support optional Inventory location either in col12 or col11 if col11 is not a lifecycle word
        const lifecycleKeywords = new Set([
          'inventory',
          'active',
          'in maintenance',
          'suspended',
          'decommissioned',
          'pending hardware review'
        ]);
        const inventoryLocation =
          col12.trim() ||
          (!lifecycleKeywords.has(col11.trim().toLowerCase()) ? col11.trim() : '');
        validateAndBuildRow(idx + 1, {
          name,
          deviceId,
          kind,
          manufacturer,
          modelText,
          serial,
          measurementCapability,
          measurementUnit,
          measurementRange,
          company,
          inventoryLocation
        });
      });
    }

    if (valid.length === 0) {
      sensorUpload.fail(
        invalid[0]?.reason || 'No valid new sensor rows found (duplicates, unenabled models, or missing required fields).'
      );
      return;
    }

    sensorUpload.startUploading(fileName, formatUploadFileSize(fileSize), () => {
      setStore((prev) => ({
        ...prev,
        sensors: [...valid, ...prev.sensors]
      }));
      setSortKey('');
      setCurrentPage(1);
      showToast(`Imported ${valid.length} Sensor(s) into Inventory (${invalid.length} skipped).`);
      return {
        headline: 'Sensors uploaded successfully',
        description: `${valid.length} sensor record${valid.length === 1 ? '' : 's'} imported from ${fileName}.${
          invalid.length > 0 ? ` ${invalid.length} invalid or duplicate row${invalid.length === 1 ? '' : 's'} skipped.` : ''
        }`,
        stats: [
          { label: 'Uploaded', value: valid.length, tone: 'emerald' },
          { label: 'Skipped', value: invalid.length, tone: invalid.length > 0 ? 'amber' : 'slate' }
        ]
      };
    });
  };

  // Lifecycle pill styling (4 effective statuses only)
  const renderLifecycleBadge = (status: EffectiveSensorStatus) => {
    const map: Record<
      EffectiveSensorStatus,
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
      Decommissioned: {
        bg: 'bg-[#f1f5f9]',
        text: 'text-[#475569]',
        border: 'border-[#cbd5e1]',
        dot: 'bg-[#475569]'
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

  // Linked connections for inspected sensor via mapping references
  const inspectedConnections = useMemo(() => {
    if (!inspectedSensor) return [];
    return getSensorMappingReferences(inspectedSensor.id, store).allConnections;
  }, [inspectedSensor, store]);

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
            Model Master / <span className="text-[#5c6b7a]">Sensors</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-bold text-[#17212b] leading-tight">Sensors</h1>
              <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                Temperature and Fuel Sensors registered as physical peripheral or direct-reporting telemetry hardware.
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
                placeholder="Search sensors name, ID, model, serial..."
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
                    const nextOrg = e.target.value;
                    setFilterCompany(nextOrg);
                    setAdvancedFilters((prev) => ({
                      ...prev,
                      organizations: nextOrg === 'All' ? [] : [nextOrg]
                    }));
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
              columns={SENSOR_COLUMNS.map((c) => ({
                key: c.key,
                label: c.label,
                required: c.key === 'name',
                category:
                  c.key === 'company' || c.key === 'name' || c.key === 'deviceId' || c.key === 'kind'
                    ? 'IDENTITY'
                    : c.key === 'measurementCapability' || c.key === 'measurementUnit' || c.key === 'measurementRange'
                    ? 'TELEMETRY SPEC'
                    : c.key === 'registeredAt' || c.key === 'updatedAt'
                    ? 'TIMESTAMPS'
                    : 'HARDWARE & STATUS',
              }))}
              visibleKeys={SENSOR_COLUMNS.filter((c) => !hiddenCols.includes(c.key)).map((c) => c.key)}
              onChangeVisibleKeys={(nextKeys) =>
                setHiddenCols(SENSOR_COLUMNS.filter((c) => !nextKeys.includes(c.key)).map((c) => c.key))
              }
              defaultKeys={SENSOR_COLUMNS.map((c) => c.key)}
              roleDefaultKeys={SENSOR_COLUMNS.map((c) => c.key)}
              defaultPinnedKeys={['name']}
              onToast={(msg) => showToast(msg, 'success')}
            />

            {/* 3. Density */}
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
                clearAllSensorFilters();
                setSelectedIds(new Set());
                showToast('Sensors table refreshed.');
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
                const exportRows = sortedSensors.map((s) => ({
                  ...s,
                  hardwareLifecycle: getEffectiveStatus(s)
                }));
                downloadModalCsv('FleetRobo_sensors_export.csv', visibleColumns, exportRows);
                showToast(
                  `Exported ${exportRows.length} Sensor records to FleetRobo_sensors_export.csv`
                );
              }}
              className="h-[33px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-medium text-[#17212b] hover:bg-[#f8fafc] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} />
              <span>Export</span>
            </button>

            {/* 9. Primary CTA: Create Sensor */}
            <button
              onClick={handleOpenCreate}
              disabled={enabledSensorModels.length === 0}
              title={
                enabledSensorModels.length === 0
                  ? `No Sensor models enabled for ${currentCompany}. Enable in Company Management.`
                  : 'Register a new sensor'
              }
              className={`h-[33px] px-3.5 rounded-[7px] text-[12px] font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors ${
                enabledSensorModels.length === 0
                  ? 'bg-[#d6dfe8] text-[#8291a0] cursor-not-allowed'
                  : 'bg-[#e56b38] hover:bg-[#d15b2a] text-white cursor-pointer'
              }`}
            >
              <Plus size={14} />
              <span>Create Sensor</span>
            </button>
          </div>

          {/* Company Model Access Notice when 0 sensor models enabled */}
          {enabledSensorModels.length === 0 && (
            <div className="mx-3.5 mt-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50 text-[12px] text-amber-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                <span>
                  No Sensor models are enabled for <strong>{currentCompany}</strong> by Platform Admin. Please enable Sensor types in Platform Admin &gt; Company Management to register sensors.
                </span>
              </div>
            </div>
          )}

          {/* Status Line Below Toolbar */}
          <div className="px-3.5 py-1.5 bg-[#f8fafc] border-b border-[#e3e8ee] text-[11px] text-[#5c6b7a] flex items-center justify-between shrink-0">
            <span>
              <strong className="font-semibold text-[#17212b]">{selectedIds.size}</strong> selected · Existing FleetRobo design · Sample/demo data; no actual hardware network is contacted
            </span>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllSensorFilters}
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
              {isPlatformAdmin && effectiveAdvancedFilters.organizations.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Organization: {effectiveAdvancedFilters.organizations.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setFilterCompany('All');
                      setAdvancedFilters((p) => ({ ...p, organizations: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.kinds.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Type: {effectiveAdvancedFilters.kinds.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, kinds: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.manufacturers.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Manufacturer: {effectiveAdvancedFilters.manufacturers.join(', ')}
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
              {effectiveAdvancedFilters.models.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Model: {effectiveAdvancedFilters.models.join(', ')}
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
              {effectiveAdvancedFilters.identifierTypes.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Identifier: {effectiveAdvancedFilters.identifierTypes.join(', ')}
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
              {effectiveAdvancedFilters.measurementCapabilities.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Capability: {effectiveAdvancedFilters.measurementCapabilities.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, measurementCapabilities: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.measurementUnits.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Unit: {effectiveAdvancedFilters.measurementUnits.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, measurementUnits: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {(effectiveAdvancedFilters.measurementRanges.length > 0 ||
                effectiveAdvancedFilters.measurementRangeQuery.trim()) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Range:{' '}
                  {[
                    ...effectiveAdvancedFilters.measurementRanges,
                    effectiveAdvancedFilters.measurementRangeQuery.trim()
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({
                        ...p,
                        measurementRanges: [],
                        measurementRangeQuery: ''
                      }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.connectionModes.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Connection Mode: {effectiveAdvancedFilters.connectionModes.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, connectionModes: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.sensorStatuses.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Sensor Status: {effectiveAdvancedFilters.sensorStatuses.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, sensorStatuses: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.mappingStatuses.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Mapping Status: {effectiveAdvancedFilters.mappingStatuses.join(', ')}
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
              {effectiveAdvancedFilters.inventoryLocations.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Location: {effectiveAdvancedFilters.inventoryLocations.join(', ')}
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
              {(effectiveAdvancedFilters.registeredFrom ||
                effectiveAdvancedFilters.registeredTo) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Registered: {effectiveAdvancedFilters.registeredFrom || '…'} →{' '}
                  {effectiveAdvancedFilters.registeredTo || '…'}
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
              {(effectiveAdvancedFilters.updatedFrom || effectiveAdvancedFilters.updatedTo) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Updated: {effectiveAdvancedFilters.updatedFrom || '…'} →{' '}
                  {effectiveAdvancedFilters.updatedTo || '…'}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, updatedFrom: '', updatedTo: '' }));
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
                onClick={clearAllSensorFilters}
                className="text-slate-500 hover:text-slate-900 font-semibold ml-auto cursor-pointer"
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
                      No Sensors match the current search or filter criteria.
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
                            return (
                              <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                                {renderLifecycleBadge(getEffectiveStatus(row))}
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
                                  label: 'Edit sensor',
                                  icon: <Edit2 size={14} className="text-slate-400" />,
                                  onClick: () => handleOpenEdit(row),
                                },
                                {
                                  id: 'delete',
                                  label: 'Delete sensor',
                                  icon: <Trash2 size={14} />,
                                  tone: 'danger',
                                  dividerBefore: true,
                                  onClick: () => setSensorToDelete(row),
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
          <div className="flex-1" onClick={() => setActiveDrawer(null)} />

          {/* 3. SAVED VIEWS DRAWER */}
          {activeDrawer === 'saved-views' && (
            <div className="w-[520px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-5 py-4 border-b border-[#e3e8ee] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">Saved Views · Sensors</h2>
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
                      placeholder="e.g., Escort Fuel Sensors Active"
                      className="flex-1 h-[34px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                    />
                    <button
                      onClick={() => {
                        if (!newViewName.trim()) return;
                        const created: SavedModalView = {
                          id: `sv-sen-${Date.now()}`,
                          pageId: 'sensors',
                          name: newViewName.trim(),
                          query: searchQuery,
                          filters: {
                            kind: effectiveAdvancedFilters.kinds[0] || 'All',
                            manufacturer: effectiveAdvancedFilters.manufacturers[0] || 'All',
                            measurementUnit: effectiveAdvancedFilters.measurementUnits[0] || 'All',
                            hardwareLifecycle: effectiveAdvancedFilters.sensorStatuses[0] || 'All',
                            filterCompany: isPlatformAdmin ? filterCompany : 'All',
                            advancedSensorsJson: JSON.stringify(effectiveAdvancedFilters)
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
                    .filter((v) => v.pageId === 'sensors')
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
                            Query: {view.query || 'None'} · Sort: {view.sortKey || 'Default'} ({view.sortDir})
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSearchQuery(view.query || '');
                              const legacy = (view.filters || {}) as Record<string, any>;
                              let parsedAdvanced: Partial<SensorsAdvancedFilters> | null =
                                legacy.advancedSensors || null;
                              if (!parsedAdvanced && typeof legacy.advancedSensorsJson === 'string') {
                                try {
                                  parsedAdvanced = JSON.parse(legacy.advancedSensorsJson);
                                } catch {
                                  parsedAdvanced = null;
                                }
                              }
                              if (parsedAdvanced) {
                                const restored: SensorsAdvancedFilters = {
                                  ...DEFAULT_SENSORS_FILTERS,
                                  ...parsedAdvanced,
                                  organizations: isPlatformAdmin
                                    ? parsedAdvanced.organizations || []
                                    : [],
                                  sensorStatuses: (
                                    parsedAdvanced.sensorStatuses || []
                                  ).filter((st: EffectiveSensorStatus) =>
                                    SENSOR_EFFECTIVE_STATUS_OPTIONS.includes(st)
                                  )
                                };
                                setAdvancedFilters(restored);
                                setFilterCompany(
                                  isPlatformAdmin
                                    ? legacy.filterCompany ||
                                        (restored.organizations.length === 1
                                          ? restored.organizations[0]
                                          : 'All')
                                    : 'All'
                                );
                              } else {
                                const mappedStatus: EffectiveSensorStatus[] =
                                  legacy.hardwareLifecycle &&
                                  legacy.hardwareLifecycle !== 'All'
                                    ? legacy.hardwareLifecycle === 'Suspended'
                                      ? ['In Maintenance']
                                      : SENSOR_EFFECTIVE_STATUS_OPTIONS.includes(
                                          legacy.hardwareLifecycle as EffectiveSensorStatus
                                        )
                                      ? [legacy.hardwareLifecycle as EffectiveSensorStatus]
                                      : []
                                    : [];
                                setFilterCompany(
                                  isPlatformAdmin && legacy.filterCompany
                                    ? legacy.filterCompany
                                    : 'All'
                                );
                                setAdvancedFilters({
                                  ...DEFAULT_SENSORS_FILTERS,
                                  organizations:
                                    isPlatformAdmin &&
                                    legacy.filterCompany &&
                                    legacy.filterCompany !== 'All'
                                      ? [legacy.filterCompany]
                                      : [],
                                  kinds:
                                    legacy.kind && legacy.kind !== 'All' ? [legacy.kind] : [],
                                  manufacturers:
                                    legacy.manufacturer && legacy.manufacturer !== 'All'
                                      ? [legacy.manufacturer]
                                      : [],
                                  measurementUnits:
                                    legacy.measurementUnit && legacy.measurementUnit !== 'All'
                                      ? [legacy.measurementUnit]
                                      : [],
                                  sensorStatuses: mappedStatus
                                });
                              }
                              setSortKey(view.sortKey || 'deviceId');
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

          {/* 4. CREATE / EDIT SENSOR DRAWER (690px) */}
          {activeDrawer === 'form' && (
            <form
              onSubmit={handleSaveSensor}
              className="w-[690px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50"
            >
              <div className="px-6 py-4 border-b border-[#e3e8ee] flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">
                    {editingSensor ? `Edit Sensor · ${editingSensor.deviceId}` : 'Create Sensor'}
                  </h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    Register physical sensor hardware in FleetRobo inventory. Communication links and vehicle pairings are configured in Modal Mapping.
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
                            ? 'Select the parent or child organization that will own this physical sensor.'
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
                    {/* 1. Sensor category first */}
                    <div>
                      <FieldLabel
                        label="Sensor category"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.sensor.kind}
                      />
                      <select
                        value={formKind}
                        onChange={(e) => handleSensorTypeChange(e.target.value as SensorCategory)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                      >
                        {formEnabledSensorCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Sensor name second */}
                    <div>
                      <FieldLabel
                        label="Sensor name"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.sensor.name}
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

                    {/* 3. Sensor ID */}
                    <div>
                      <FieldLabel
                        label="Sensor ID"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.sensor.deviceId}
                      />
                      <input
                        type="text"
                        required
                        value={formDeviceId}
                        onChange={(e) => setFormDeviceId(e.target.value)}
                        placeholder="e.g. SENS-10001"
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] font-mono text-[12px] focus:outline-none focus:border-[#e56b38]"
                      />
                    </div>

                    {/* 4. Physical Identifiers: Serial / MAC / Hardware Identifier */}
                    <div>
                      <FieldLabel
                        label={
                          activeIdentifierType === 'Serial Number'
                            ? 'Serial number'
                            : activeIdentifierType === 'BLE MAC'
                            ? 'BLE MAC Address'
                            : activeIdentifierType
                        }
                        required
                        tooltip={
                          activeIdentifierType === 'Serial Number'
                            ? MODAL_FIELD_TOOLTIPS.sensor.serial
                            : activeIdentifierType === 'MAC Address' || activeIdentifierType === 'BLE MAC'
                            ? 'Physical MAC or BLE hardware address'
                            : `Unique ${activeIdentifierType} configured for ${formKind} in Model Category Master.`
                        }
                      />
                      <input
                        type="text"
                        required
                        value={formSerial}
                        onChange={(e) => setFormSerial(e.target.value)}
                        placeholder={
                          activeIdentifierType === 'MAC Address' || activeIdentifierType === 'BLE MAC'
                            ? 'e.g. 58:8E:81:4A:9C:20'
                            : activeIdentifierType === 'Serial Number'
                            ? 'e.g. SN-SENSOR-260000'
                            : `Enter ${activeIdentifierType}`
                        }
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] font-mono text-[12px] focus:outline-none focus:border-[#e56b38]"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: 2. Manufacturer and model */}
                <div className="space-y-3.5">
                  <div className="text-[12px] font-bold uppercase tracking-wider text-[#9e431c] border-b border-[#e3e8ee] pb-1.5">
                    2. Manufacturer and model
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <FieldLabel
                        label="Brand"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.sensor.manufacturer}
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
                        tooltip={MODAL_FIELD_TOOLTIPS.sensor.modelText}
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
                        label="Measurement capability"
                        tooltip={MODAL_FIELD_TOOLTIPS.sensor.measurementCapability}
                      />
                      <input
                        type="text"
                        readOnly
                        value={`${formMeasurementCap} (${formUnit})`}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-[#f8fafc] text-[12px] text-[#5c6b7a] focus:outline-none"
                      />
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
                      tooltip={MODAL_FIELD_TOOLTIPS.sensor.notes}
                    />
                    <textarea
                      rows={3}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Optional internal notes for calibration, tank profile, or installation context..."
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
                  {editingSensor ? 'Save changes' : 'Create Sensor'}
                </button>
              </div>
            </form>
          )}

          {/* 5. RECORD DETAILS INSPECTOR DRAWER (690px) */}
          {activeDrawer === 'inspector' && inspectedSensor && (
            <div className="w-[690px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-6 py-4 border-b border-[#e3e8ee] flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[16px] font-bold text-[#17212b]">
                      {inspectedSensor.name}
                    </h2>
                    {renderLifecycleBadge(getEffectiveStatus(inspectedSensor))}
                  </div>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5 font-mono">
                    {inspectedSensor.deviceId} · {inspectedSensor.kind} · {inspectedSensor.manufacturer}{' '}
                    {inspectedSensor.modelText}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(inspectedSensor)}
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
                        ['Sensor name', inspectedSensor.name],
                        ['Sensor ID', inspectedSensor.deviceId],
                        ['Sensor type', inspectedSensor.kind],
                        ['Role', inspectedSensor.role],
                        ['Manufacturer', inspectedSensor.manufacturer],
                        ['Model', inspectedSensor.modelText],
                        ['Identifier type', inspectedSensor.identifierType || '—'],
                        ['Serial / Identifier', inspectedSensor.serial],
                        ['Measurement capability', inspectedSensor.measurementCapability || '—'],
                        ['Measurement unit', inspectedSensor.measurementUnit || '—'],
                        ['Range', inspectedSensor.measurementRange || '—'],
                        ['Sensor status', getEffectiveStatus(inspectedSensor)],
                        ['Mapping status', mappingStatusById.get(inspectedSensor.id) || 'Unmapped'],
                        ['Registered', inspectedSensor.registeredAt],
                        ['Updated', inspectedSensor.updatedAt]
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div className="text-[11px] text-[#5c6b7a]">{k}</div>
                          <div className="text-[12px] font-semibold text-[#17212b] mt-0.5 break-words">
                            {v}
                          </div>
                        </div>
                      ))}
                      <div>
                        <div className="text-[11px] text-[#5c6b7a] mb-1">
                          Derived model capabilities
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(inspectedSensor.capabilities || []).length === 0 ? (
                            <span className="text-[11px] text-[#8291a0]">Not specified</span>
                          ) : (
                            inspectedSensor.capabilities.map((cap) => (
                              <span
                                key={cap}
                                className="px-2 py-0.5 rounded bg-white border border-[#d6dfe8] text-[11px] font-medium text-[#17212b]"
                              >
                                {cap}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[11px] text-[#5c6b7a]">Notes</div>
                        <div className="text-[12px] text-[#17212b] mt-0.5">
                          {inspectedSensor.notes || 'No notes recorded.'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#5c6b7a] mb-2.5">
                        Connected Records (up to 32 shown)
                      </h3>
                      {inspectedConnections.length === 0 ? (
                        <div className="p-4 rounded-lg border border-[#e3e8ee] text-[12px] text-[#5c6b7a]">
                          No Modal Mapping connections reference this Sensor.
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
                                  Client: {conn.companyName} · Members: {conn.members?.length || 1}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  conn.status === 'Active'
                                    ? 'bg-[#eaf8f0] text-[#0f7b4b]'
                                    : conn.status === 'Scheduled'
                                    ? 'bg-sky-50 text-sky-700'
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
                    {inspectedConnections.length === 0 ? (
                      <div className="p-6 text-center rounded-lg border border-[#e3e8ee] text-[12px] text-[#5c6b7a]">
                        No linked connections found for this Sensor.
                      </div>
                    ) : (
                      inspectedConnections.map((conn) => {
                        const peerBindings = (store.hardwareBindings || []).filter(
                          (b) =>
                            b.connectionId === conn.id &&
                            (b.fromHardwareId === inspectedSensor.id || b.toHardwareId === inspectedSensor.id)
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
                                    : conn.status === 'Scheduled'
                                    ? 'bg-sky-50 text-sky-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {conn.status}
                              </span>
                            </div>
                            <div className="text-[#5c6b7a]">
                              Client: <strong className="text-[#17212b]">{conn.companyName}</strong> · Pairwise bindings:{' '}
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
                    {inspectedSensor.auditHistory && inspectedSensor.auditHistory.length > 0 ? (
                      inspectedSensor.auditHistory.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3.5 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] flex items-start gap-3"
                        >
                          <div className="w-2 h-2 rounded-full bg-[#e56b38] mt-1.5 shrink-0" />
                          <div>
                            <div className="text-[12px] font-semibold text-[#17212b]">
                              {ev.action}
                            </div>
                            <div className="text-[11px] text-[#5c6b7a] mt-0.5">{ev.summary}</div>
                            <div className="text-[10px] font-mono text-[#8291a0] mt-1">
                              {ev.timestamp.slice(0, 19).replace('T', ' ')} · {ev.actor}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-2.5">
                        <div className="p-3.5 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-[#e56b38] mt-1.5 shrink-0" />
                          <div>
                            <div className="text-[12px] font-semibold text-[#17212b]">
                              Effective status derived: {getEffectiveStatus(inspectedSensor)}
                            </div>
                            <div className="text-[11px] text-[#5c6b7a] mt-0.5">
                              Mapping status: {mappingStatusById.get(inspectedSensor.id) || 'Unmapped'}
                              {inspectedSensor.legacyStatusMetadata?.originalHardwareLifecycle
                                ? ` · Migrated from legacy status "${inspectedSensor.legacyStatusMetadata.originalHardwareLifecycle}"`
                                : ''}
                            </div>
                            <div className="text-[10px] font-mono text-[#8291a0] mt-1">
                              Updated {inspectedSensor.updatedAt}
                            </div>
                          </div>
                        </div>
                        <div className="p-3.5 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <div>
                            <div className="text-[12px] font-semibold text-[#17212b]">
                              Registered in Sensors Master
                            </div>
                            <div className="text-[11px] text-[#5c6b7a] mt-0.5">
                              {inspectedSensor.manufacturer} {inspectedSensor.modelText} ({inspectedSensor.identifierType || 'Identifier'}: {inspectedSensor.serial})
                            </div>
                            <div className="text-[10px] font-mono text-[#8291a0] mt-1">
                              Registered {inspectedSensor.registeredAt}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
                    Upload a CSV or JSON file to register sensors directly into inventory.
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
                  status={sensorUpload.status}
                  progress={sensorUpload.progress}
                  fileLabel={sensorUpload.fileLabel}
                  fileMeta={sensorUpload.fileMeta}
                  errorMessage={sensorUpload.errorMessage}
                  doneSummary={sensorUpload.doneSummary}
                  accept=".csv,.json,text/csv,application/json"
                  dropTitle="Choose CSV / JSON or drag & drop"
                  dropSubtitle="Import sensors directly. Duplicate IDs or invalid models are skipped automatically."
                  chooseButtonLabel="Choose file"
                  downloadLabel="Download template"
                  sampleLabel="Use sample CSV"
                  templateTitle="Need a starting format?"
                  templateSubtitle="Download CSV template or upload a sample sensor."
                  doneButtonLabel="Done"
                  onFileSelected={(file) => {
                    const lower = file.name.toLowerCase();
                    if (!lower.endsWith('.csv') && !lower.endsWith('.json')) {
                      sensorUpload.fail('Please upload a .csv or .json file.');
                      return;
                    }
                    const fmt: 'csv' | 'json' = lower.endsWith('.json') ? 'json' : 'csv';
                    const reader = new FileReader();
                    reader.onload = (ev) =>
                      processSensorsUpload(fmt, String(ev.target?.result || ''), file.name, file.size);
                    reader.onerror = () => sensorUpload.fail('Unable to read the selected file.');
                    reader.readAsText(file);
                  }}
                  onDownloadTemplate={() => {
                    const sampleOrg = isPlatformAdmin
                      ? availableOrganizations[0] || ''
                      : currentCompany;
                    const sampleModel =
                      getEnabledModelsForCompanyName(sampleOrg).find(
                        (m) => m.category === 'Sensor'
                      ) || enabledSensorModels[0];
                    const csv =
                      'Sensor name,Sensor ID,Sensor type,Manufacturer,Model,Identifier value,Measurement capability,Measurement unit,Range,Organization,Inventory location\n' +
                      `Tank Sensor Sample,SENS-9101,${sampleModel?.typeName || 'Fuel Level Sensor'},${sampleModel?.manufacturer || 'Escort'},${sampleModel?.modelReference || 'TD-BLE'},TD-BLE-9101,${sampleModel?.measurementType || 'Fuel Level'},${sampleModel?.measurementUnit || 'L'},,${sampleOrg},`;
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'fleetrobo_sensors_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  onUseSample={() => {
                    const sampleOrg = isPlatformAdmin
                      ? availableOrganizations[0] || ''
                      : currentCompany;
                    const sampleModel =
                      getEnabledModelsForCompanyName(sampleOrg).find(
                        (m) => m.category === 'Sensor'
                      ) || enabledSensorModels[0];
                    if (!sampleModel || !sampleOrg) {
                      sensorUpload.fail(
                        'No active Sensor model is enabled for the current organization.'
                      );
                      return;
                    }
                    const suffix = Math.floor(100 + Math.random() * 899);
                    const sampleCsv =
                      'Sensor name,Sensor ID,Sensor type,Manufacturer,Model,Identifier value,Measurement capability,Measurement unit,Range,Organization,Inventory location\n' +
                      `${sampleModel.typeName} Sample ${suffix},SENS-9${suffix},${sampleModel.typeName},${sampleModel.manufacturer},${sampleModel.modelReference || sampleModel.typeName},SEN-ID-9${suffix},${sampleModel.measurementType || ''},${sampleModel.measurementUnit || ''},,${sampleOrg},`;
                    processSensorsUpload('csv', sampleCsv, `sample_sensors_${suffix}.csv`, sampleCsv.length);
                  }}
                  onReset={sensorUpload.reset}
                  onDone={() => setActiveDrawer(null)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upgraded Sectional Filter Sensors Right-Side Drawer */}
      <SensorsFilterDrawer
        isOpen={activeDrawer === 'filters'}
        onClose={() => setActiveDrawer(null)}
        appliedFilters={effectiveAdvancedFilters}
        onApplyFilters={handleApplyAdvancedFilters}
        authorizedSensors={scopedSensors}
        enabledSensorModels={enabledSensorModels}
        effectiveStatusById={effectiveStatusById}
        mappingStatusById={mappingStatusById}
        isPlatformAdmin={isPlatformAdmin}
      />

      {/* Upgraded Sectional Bulk Operations Right-Side Drawer */}
      <SensorsBulkDrawer
        isOpen={activeDrawer === 'bulk'}
        isPlatformAdmin={isPlatformAdmin}
        selectedRecords={selectedSensorRecords}
        store={store}
        effectiveStatusById={effectiveStatusById}
        availableLocations={availableLocations}
        availableOrganizations={availableOrganizations}
        onClose={() => setActiveDrawer(null)}
        onClearSelection={() => setSelectedIds(new Set())}
        onExportSelected={handleBulkExportSelected}
        onApplyBulkUpdate={handleApplySensorsBulkUpdate}
      />

      {/* Delete Sensor Confirmation Modal (strictly blocks active, scheduled, AND historical mapping references) */}
      {(() => {
        if (!sensorToDelete) return null;
        const refs = getSensorMappingReferences(sensorToDelete.id, store);
        const effStatus = getEffectiveStatus(sensorToDelete);
        return (
          <DeleteConfirmationModal
            isOpen={Boolean(sensorToDelete)}
            title="Delete Sensor?"
            description={
              <>
                Are you sure you want to delete{' '}
                <strong className="text-slate-900 font-semibold">{sensorToDelete.name}</strong> (
                {sensorToDelete.deviceId})? This sensor will be permanently removed from inventory.
              </>
            }
            confirmLabel={refs.hasAnyReference ? 'Deletion Blocked' : 'Delete Sensor'}
            confirmDisabled={refs.hasAnyReference}
            targetChips={[
              { id: 'senId', label: sensorToDelete.deviceId, tone: 'orange' },
              { id: 'kind', label: sensorToDelete.kind, tone: 'purple' },
              {
                id: 'model',
                label: `${sensorToDelete.manufacturer} · ${sensorToDelete.modelText}`,
                tone: 'slate',
              },
              { id: 'org', label: sensorToDelete.company, tone: 'blue' },
              {
                id: 'status',
                label: effStatus,
                tone: effStatus === 'Active' ? 'emerald' : 'slate',
              },
            ]}
            confirmationChips={[
              refs.hasActiveOrScheduledReference
                ? {
                    id: 'conn-link',
                    label: `Blocked · ${refs.activeOrScheduledConnections.length} Active/Scheduled Mapping(s)`,
                    tone: 'rose',
                  }
                : refs.hasAnyReference
                ? {
                    id: 'conn-link',
                    label: `Blocked · ${refs.allConnections.length || refs.allBindings.length || refs.allAllocations.length} Historical Mapping Reference(s)`,
                    tone: 'amber',
                  }
                : {
                    id: 'conn-link',
                    label: 'Safe to Delete · No Asset Mapping References',
                    tone: 'emerald',
                  },
              {
                id: 'scope',
                label: 'Permanent Sensor Removal',
                tone: 'rose',
              },
            ]}
            warningNote={
              refs.hasAnyReference ? (
                <>
                  This sensor is referenced in Asset Mapping (
                  <strong>
                    {refs.allConnections.map((c) => c.connectionId || c.id).join(', ') ||
                      'binding/allocation history'}
                  </strong>
                  ) and cannot be deleted. End any active mappings and{' '}
                  <strong>Decommission</strong> it instead to preserve historical audit records.
                </>
              ) : undefined
            }
            onCancel={() => setSensorToDelete(null)}
            onConfirm={handleConfirmDeleteSensor}
          />
        );
      })()}
    </div>
  );
};
