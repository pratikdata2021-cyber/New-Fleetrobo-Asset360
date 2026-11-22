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
  HardwareLifecycleStatus,
  SENSOR_CATALOGUE,
  SENSOR_COLUMNS,
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
import { getRecordIdentifierTypes } from '../types/modelCategoryMaster';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';

const SENSOR_CATEGORIES: SensorCategory[] = ['Temperature Sensor', 'Fuel Sensor'];

const ALL_SENSOR_MANUFACTURERS = [
  'Teltonika',
  'Sensitech',
  'WIKA',
  'Monnit',
  'Digital Matter',
  'Milesight',
  'Escort',
  'Epsilon',
  'Omnicomm'
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

  // Model access sync from Binary Platform Admin -> Company Management
  const [modelAccessTick, setModelAccessTick] = useState(0);
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
  const [filterUnit, setFilterUnit] = useState<string>('All');
  const [filterLifecycle, setFilterLifecycle] = useState<string>('All');

  useEffect(() => {
    setFilterCompany('All');
  }, [currentCompany]);

  // Enabled Sensor models for the active company (or selected filter company in Platform Admin)
  const enabledSensorModels = useMemo(() => {
    const scopeCompany = isPlatformAdmin && filterCompany !== 'All' ? filterCompany : currentCompany;
    return getEnabledModelsForCompanyName(scopeCompany).filter(
      (m) => m.category === 'Sensor'
    );
  }, [currentCompany, isPlatformAdmin, filterCompany, modelAccessTick]);

  const enabledSensorCategories = useMemo<string[]>(() => {
    const cats = Array.from(new Set(enabledSensorModels.map((m) => m.typeName)));
    return cats.length > 0 ? cats : ['Temperature Sensor', 'Fuel Level Sensor', 'Door Sensor'];
  }, [enabledSensorModels]);

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
    () => enabledSensorCategories[0] || 'Temperature Sensor'
  );
  const [formSerial, setFormSerial] = useState('');
  const [formIdentifierType, setFormIdentifierType] = useState('Serial Number');
  const [formManufacturer, setFormManufacturer] = useState(
    () => enabledSensorModels[0]?.manufacturer || 'Teltonika'
  );
  const [formModelText, setFormModelText] = useState(
    () => enabledSensorModels[0]?.modelReference || 'EYE Sensor'
  );
  const [formMeasurementCap, setFormMeasurementCap] = useState<string>(
    () => enabledSensorModels[0]?.measurementType || 'Temperature'
  );
  const [formUnit, setFormUnit] = useState<string>(
    () => enabledSensorModels[0]?.measurementUnit || '°C'
  );
  const [formRange, setFormRange] = useState('−40 to +85 °C');
  const [formCapabilities, setFormCapabilities] = useState<string[]>(['BLE']);
  const [formCompany, setFormCompany] = useState(() =>
    currentCompany && currentCompany !== 'Platform Admin' && currentCompany !== 'Binary'
      ? currentCompany
      : availableOrganizations[0] || MODAL_OWNERS[0]
  );

  const effectiveFormCompany = isPlatformAdmin
    ? formCompany || availableOrganizations[0] || 'Adani Mundra'
    : currentCompany;

  const formEnabledSensorModels = useMemo(() => {
    return getEnabledModelsForCompanyName(effectiveFormCompany).filter(
      (m) => m.category === 'Sensor'
    );
  }, [effectiveFormCompany, modelAccessTick]);

  const formEnabledSensorCategories = useMemo<string[]>(() => {
    const cats = Array.from(new Set(formEnabledSensorModels.map((m) => m.typeName)));
    return cats.length > 0 ? cats : ['Temperature Sensor', 'Fuel Level Sensor', 'Door Sensor'];
  }, [formEnabledSensorModels]);
  const [formLocation, setFormLocation] = useState(MODAL_LOCATIONS[0]);
  const [formLifecycle, setFormLifecycle] = useState<HardwareLifecycleStatus>('Active');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Saved view creation state
  const [newViewName, setNewViewName] = useState('');

  // Bulk operation state
  const [bulkAction, setBulkAction] = useState<
    'Update ownership' | 'Update inventory status' | 'Decommission eligible' | 'Delete eligible'
  >('Update ownership');
  const [bulkTargetOwner, setBulkTargetOwner] = useState(MODAL_OWNERS[0]);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<HardwareLifecycleStatus>('Active');
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);

  // Direct upload state
  const sensorUpload = useDirectUploadState(activeDrawer === 'import');

  useEffect(() => {
    saveSavedModalViews(savedViews);
  }, [savedViews]);

  // Derived form options from formEnabledSensorModels for the selected category
  const modelsForSelectedCategory = useMemo(() => {
    return formEnabledSensorModels.filter(
      (m) =>
        m.typeName === formKind ||
        (formKind === 'Fuel Sensor' && m.typeName === 'Fuel Level Sensor') ||
        (formKind === 'Fuel Level Sensor' && m.typeName === 'Fuel Sensor')
    );
  }, [formEnabledSensorModels, formKind]);

  const availableManufacturers = useMemo<string[]>(() => {
    if (modelsForSelectedCategory.length > 0) {
      const mfgs = Array.from(
        new Set(modelsForSelectedCategory.map((m) => m.manufacturer).filter(Boolean))
      );
      if (mfgs.length > 0) return mfgs;
    }
    const catDef = SENSOR_CATALOGUE[formKind as any];
    return catDef ? Object.keys(catDef.manufacturers) : ALL_SENSOR_MANUFACTURERS;
  }, [modelsForSelectedCategory, formKind]);

  const availableModels = useMemo<
    { model: string; capabilities: string[]; defaultRange: string }[]
  >(() => {
    if (modelsForSelectedCategory.length > 0) {
      const byMfg = modelsForSelectedCategory.filter((m) => m.manufacturer === formManufacturer);
      const list = byMfg.length > 0 ? byMfg : modelsForSelectedCategory;
      const validModels = list
        .map((m) => ({
          model: m.modelReference || m.typeName,
          capabilities: ['BLE'],
          defaultRange:
            m.measurementType === 'Temperature'
              ? '−40 to +85 °C'
              : m.measurementType === 'Fuel Level'
              ? '0–600 L'
              : 'State'
        }))
        .filter((x) => Boolean(x.model));
      if (validModels.length > 0) return validModels;
    }
    const catDef = SENSOR_CATALOGUE[formKind as any];
    if (!catDef) {
      return [
        {
          model: formModelText || 'EYE Sensor',
          capabilities: ['BLE'],
          defaultRange: '−40 to +85 °C'
        }
      ];
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

  const selectedSensorModelSpec = useMemo(() => {
    return (
      modelsForSelectedCategory.find(
        (m) =>
          (m.manufacturer === formManufacturer && m.modelReference === formModelText) ||
          m.manufacturer === formManufacturer
      ) ||
      modelsForSelectedCategory[0] ||
      formEnabledSensorModels[0] ||
      null
    );
  }, [modelsForSelectedCategory, formManufacturer, formModelText, formEnabledSensorModels]);

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

  // Keep defaults aligned when company or enabled models change
  useEffect(() => {
    if (editingSensor) return;
    if (formEnabledSensorModels.length > 0) {
      const first =
        formEnabledSensorModels.find((m) => m.typeName === formKind) || formEnabledSensorModels[0];
      setFormKind(first.typeName);
      setFormManufacturer(first.manufacturer || 'Teltonika');
      setFormModelText(first.modelReference || first.typeName);
      setFormMeasurementCap(first.measurementType || 'Temperature');
      setFormUnit(first.measurementUnit || '°C');
    }
  }, [effectiveFormCompany, formEnabledSensorModels, editingSensor]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingSensor(null);
    const targetOrg = isPlatformAdmin
      ? filterCompany !== 'All'
        ? filterCompany
        : availableOrganizations[0] || MODAL_OWNERS[0]
      : currentCompany || MODAL_OWNERS[0];
    const targetModels = getEnabledModelsForCompanyName(targetOrg).filter(
      (m) => m.category === 'Sensor'
    );
    const targetCats = Array.from(new Set(targetModels.map((m) => m.typeName)));
    const nextNum = 10001 + store.sensors.length;
    const initialKind = targetCats[0] || enabledSensorCategories[0] || 'Temperature Sensor';
    const initialSpec =
      targetModels.find((m) => m.typeName === initialKind) || targetModels[0] || enabledSensorModels[0];
    const mfg = initialSpec?.manufacturer || 'Teltonika';
    const modelStr = initialSpec?.modelReference || 'EYE Sensor';

    setFormName('');
    setFormDeviceId(`SENS-${nextNum}`);
    setFormKind(initialKind);
    setFormIdentifierType(getRecordIdentifierTypes(initialSpec)[0] || 'Serial Number');
    setFormSerial(`SN-SENSOR-${260000 + store.sensors.length}`);
    setFormManufacturer(mfg);
    setFormModelText(modelStr);
    setFormMeasurementCap(initialSpec?.measurementType || 'Temperature');
    setFormUnit(initialSpec?.measurementUnit || '°C');
    setFormRange(initialSpec?.measurementType === 'Temperature' ? '−40 to +85 °C' : '0–600 L');
    setFormCapabilities(['BLE']);
    setFormCompany(targetOrg);
    setFormLocation('Mundra CT2');
    setFormLifecycle('Active');
    setFormNotes('');
    setFormError(null);
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
    setFormMeasurementCap(record.measurementCapability);
    setFormUnit(record.measurementUnit);
    setFormRange(record.measurementRange);
    setFormCapabilities([...record.capabilities]);
    setFormCompany(record.company || currentCompany || 'Adani Mundra');
    setFormLocation(record.inventoryLocation || 'Mundra CT2');
    setFormLifecycle(record.hardwareLifecycle);
    setFormNotes(record.notes);
    setFormError(null);
    setActiveDrawer('form');
  };

  // Dynamic sensor type change
  const handleSensorTypeChange = (newType: SensorCategory) => {
    setFormKind(newType);
    const matching = formEnabledSensorModels.filter(
      (m) =>
        m.typeName === newType ||
        (newType === 'Fuel Sensor' && m.typeName === 'Fuel Level Sensor') ||
        (newType === 'Fuel Level Sensor' && m.typeName === 'Fuel Sensor')
    );
    if (matching.length > 0) {
      const first = matching[0];
      setFormManufacturer(first.manufacturer || 'Teltonika');
      setFormModelText(first.modelReference || first.typeName);
      setFormMeasurementCap(first.measurementType || 'Temperature');
      setFormUnit(first.measurementUnit || '°C');
      setFormRange(first.measurementType === 'Temperature' ? '−40 to +85 °C' : '0–600 L');
    } else {
      const catDef = SENSOR_CATALOGUE[newType as any];
      if (catDef) {
        const firstMfg = Object.keys(catDef.manufacturers)[0];
        const firstModel = catDef.manufacturers[firstMfg].models[0];
        setFormManufacturer(firstMfg);
        setFormModelText(firstModel.model);
        setFormMeasurementCap(catDef.measurementCapability);
        setFormUnit(catDef.defaultUnit);
        setFormRange(firstModel.defaultRange);
        setFormCapabilities([...firstModel.capabilities]);
      }
    }
  };

  // Dynamic manufacturer change
  const handleManufacturerChange = (newMfg: string) => {
    setFormManufacturer(newMfg);
    const matching = modelsForSelectedCategory.filter((m) => m.manufacturer === newMfg);
    if (matching.length > 0) {
      const first = matching[0];
      setFormModelText(first.modelReference || first.typeName);
      setFormMeasurementCap(first.measurementType || 'Temperature');
      setFormUnit(first.measurementUnit || '°C');
    } else {
      const catDef = SENSOR_CATALOGUE[formKind as any];
      const mfgEntry = catDef?.manufacturers[newMfg];
      if (mfgEntry && mfgEntry.models.length > 0) {
        const firstModel = mfgEntry.models[0];
        setFormModelText(firstModel.model);
        setFormRange(firstModel.defaultRange);
        setFormCapabilities([...firstModel.capabilities]);
      }
    }
  };

  // Dynamic model change
  const handleModelChange = (newModel: string) => {
    setFormModelText(newModel);
    const catDef = SENSOR_CATALOGUE[formKind as any];
    const mfgEntry = catDef?.manufacturers[formManufacturer];
    const found = mfgEntry?.models.find((m) => m.model === newModel);
    if (found) {
      setFormRange(found.defaultRange);
      setFormCapabilities([...found.capabilities]);
    }
  };

  // Save Sensor
  const handleSaveSensor = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    const trimmedId = formDeviceId.trim();
    const trimmedSerial = formSerial.trim() || `SN-${trimmedId}`;

    if (!trimmedName || !trimmedId) {
      setFormError('Please complete all required fields marked with *.');
      return;
    }

    // Cross-module uniqueness across both devices AND sensors
    const duplicateInDevices = store.devices.some(
      (d) =>
        d.deviceId.toLowerCase() === trimmedId.toLowerCase() ||
        (trimmedSerial && d.serial.toLowerCase() === trimmedSerial.toLowerCase())
    );
    const duplicateInSensors = store.sensors.some(
      (s) =>
        s.id !== editingSensor?.id &&
        (s.deviceId.toLowerCase() === trimmedId.toLowerCase() ||
          (trimmedSerial && s.serial.toLowerCase() === trimmedSerial.toLowerCase()))
    );

    if (duplicateInDevices || duplicateInSensors) {
      setFormError('Device/Sensor ID and physical serial must be unique.');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const finalCompany = isPlatformAdmin
      ? formCompany || availableOrganizations[0] || 'Adani Mundra'
      : currentCompany || formCompany || 'Adani Mundra';
    const finalLocation = formLocation || 'Mundra CT2';

    if (editingSensor) {
      const updatedRecord: SensorRecord = {
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
        measurementCapability: formMeasurementCap,
        measurementUnit: formUnit,
        measurementRange: formRange.trim(),
        company: finalCompany,
        inventoryLocation: finalLocation,
        hardwareLifecycle: formLifecycle,
        notes: formNotes.trim(),
        updatedAt: todayStr
      };
      setStore((prev) => ({
        ...prev,
        sensors: prev.sensors.map((s) => (s.id === editingSensor.id ? updatedRecord : s))
      }));
      showToast(`Sensor ${trimmedId} updated.`);
    } else {
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
        measurementCapability: formMeasurementCap,
        measurementUnit: formUnit,
        measurementRange: formRange.trim(),
        company: finalCompany,
        inventoryLocation: finalLocation,
        hardwareLifecycle: formLifecycle,
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
      showToast(`Sensor ${trimmedId} created.`);
    }

    setActiveDrawer(null);
  };

  // Filtered & Sorted Sensors (strictly scoped to active client when not Platform Admin)
  const filteredSensors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const companyTarget =
      !isPlatformAdmin && currentCompany
        ? currentCompany.trim().toLowerCase()
        : isPlatformAdmin && filterCompany !== 'All'
        ? filterCompany.trim().toLowerCase()
        : null;
    return store.sensors.filter((s) => {
      if (companyTarget && (s.company || '').trim().toLowerCase() !== companyTarget) return false;
      if (filterKind !== 'All' && s.kind !== filterKind) return false;
      if (filterManufacturer !== 'All' && s.manufacturer !== filterManufacturer) return false;
      if (filterUnit !== 'All' && s.measurementUnit !== filterUnit) return false;
      if (filterLifecycle !== 'All' && s.hardwareLifecycle !== filterLifecycle) return false;
      if (q) {
        const hay = [
          s.name,
          s.deviceId,
          s.kind,
          s.manufacturer,
          s.modelText,
          s.serial,
          s.measurementCapability,
          s.measurementUnit,
          s.measurementRange,
          s.company,
          s.inventoryLocation,
          s.hardwareLifecycle
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [store.sensors, currentCompany, isPlatformAdmin, filterCompany, searchQuery, filterKind, filterManufacturer, filterUnit, filterLifecycle]);

  const sortedSensors = useMemo(() => {
    if (!sortKey) return filteredSensors;
    const copy = [...filteredSensors];
    copy.sort((a, b) => {
      const av = String((a as any)[sortKey] ?? '').toLowerCase();
      const bv = String((b as any)[sortKey] ?? '').toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filteredSensors, sortKey, sortDir]);

  const totalRecords = sortedSensors.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const currentRows = sortedSensors.slice(startIdx, startIdx + pageSize);

  const visibleColumns = useMemo(
    () => SENSOR_COLUMNS.filter((c) => !hiddenCols.includes(c.key)),
    [hiddenCols]
  );

  const activeFilterCount =
    (isPlatformAdmin && filterCompany !== 'All' ? 1 : 0) +
    (filterKind !== 'All' ? 1 : 0) +
    (filterManufacturer !== 'All' ? 1 : 0) +
    (filterUnit !== 'All' ? 1 : 0) +
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
  const openInspector = (rec: SensorRecord) => {
    setInspectedSensor(rec);
    setInspectorTab('overview');
    setActiveDrawer('inspector');
  };

  const [sensorToDelete, setSensorToDelete] = useState<SensorRecord | null>(null);

  const handleConfirmDeleteSensor = () => {
    if (!sensorToDelete) return;
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

  // Bulk eligibility calculation
  const selectedSensorRecords = useMemo(
    () => store.sensors.filter((s) => selectedIds.has(s.id)),
    [store.sensors, selectedIds]
  );

  const bulkEligibility = useMemo(() => {
    const eligible: SensorRecord[] = [];
    const skipped: { record: SensorRecord; reason: string }[] = [];

    selectedSensorRecords.forEach((sen) => {
      if (bulkAction === 'Decommission eligible' || bulkAction === 'Delete eligible') {
        const hasActiveConn = store.connections.some(
          (c) => c.status === 'Active' && (c.memberIds?.includes(sen.id) || c.hardwareId === sen.id)
        );
        if (hasActiveConn) {
          skipped.push({
            record: sen,
            reason: 'Linked to an Active connection in Modal Mapping'
          });
        } else {
          eligible.push(sen);
        }
      } else {
        eligible.push(sen);
      }
    });

    return { eligible, skipped };
  }, [selectedSensorRecords, bulkAction, store.connections]);

  const executeBulkDeleteSensors = (reason?: string) => {
    const eligibleIds = new Set(bulkEligibility.eligible.map((s) => s.id));
    if (eligibleIds.size === 0) return;

    setStore((prev) => ({
      ...prev,
      sensors: prev.sensors.filter((s) => !eligibleIds.has(s.id))
    }));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      eligibleIds.forEach((id) => next.delete(id));
      return next;
    });
    if (inspectedSensor && eligibleIds.has(inspectedSensor.id)) {
      setInspectedSensor(null);
    }
    showToast(
      `Deleted ${eligibleIds.size} sensor(s)${bulkEligibility.skipped.length > 0 ? `, ${bulkEligibility.skipped.length} skipped` : ''}${reason ? ` · ${reason}` : ''}`
    );
    setPendingBulkDelete(false);
    setActiveDrawer(null);
  };

  const handleApplyBulk = () => {
    if (selectedSensorRecords.length === 0) return;
    if (bulkAction === 'Delete eligible') {
      if (bulkEligibility.eligible.length === 0) return;
      setPendingBulkDelete(true);
      return;
    }
    const eligibleIds = new Set(bulkEligibility.eligible.map((s) => s.id));
    const todayStr = new Date().toISOString().slice(0, 10);

    setStore((prev) => ({
      ...prev,
      sensors: prev.sensors.map((s) => {
        if (!eligibleIds.has(s.id)) return s;
        if (bulkAction === 'Update ownership') {
          return { ...s, company: bulkTargetOwner, updatedAt: todayStr };
        }
        if (bulkAction === 'Update inventory status') {
          return { ...s, hardwareLifecycle: bulkTargetStatus, updatedAt: todayStr };
        }
        if (bulkAction === 'Decommission eligible') {
          return { ...s, hardwareLifecycle: 'Decommissioned', updatedAt: todayStr };
        }
        return s;
      })
    }));

    showToast(
      `Bulk action completed: ${bulkEligibility.eligible.length} updated, ${bulkEligibility.skipped.length} skipped.`
    );
    setActiveDrawer(null);
  };

  // Direct CSV/JSON upload execution
  const processSensorsUpload = (fmt: 'csv' | 'json', rawText: string, fileName: string, fileSize?: number) => {
    const raw = rawText.trim();
    if (!raw) {
      sensorUpload.fail('Uploaded file is empty.');
      return;
    }

    const valid: Partial<SensorRecord>[] = [];
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
              reason: `Duplicate Sensor ID (${deviceId}) or serial (${serial})`
            });
            return;
          }
          seenIds.add(deviceId.toLowerCase());
          seenSerials.add(serial.toLowerCase());
          const sType: SensorCategory =
            item.kind === 'Fuel Sensor' ? 'Fuel Sensor' : 'Temperature Sensor';
          valid.push({
            deviceId,
            name,
            kind: sType,
            manufacturer: item.manufacturer || (sType === 'Fuel Sensor' ? 'Escort' : 'Teltonika'),
            modelText: item.modelText || (sType === 'Fuel Sensor' ? 'TD-BLE' : 'EYE Sensor'),
            serial,
            measurementCapability: sType === 'Fuel Sensor' ? 'Fuel level' : 'Temperature',
            measurementUnit: item.measurementUnit || (sType === 'Fuel Sensor' ? 'L' : '°C'),
            measurementRange: item.measurementRange || (sType === 'Fuel Sensor' ? '0–600 L' : '−40 to +85 °C'),
            company: item.company || 'Adani Port',
            inventoryLocation: item.inventoryLocation || 'Mundra CT2',
            hardwareLifecycle: item.hardwareLifecycle || 'Inventory'
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
          hardwareLifecycle
        ] = cols;
        if (!name || !deviceId || !serial) {
          invalid.push({
            line: idx + 1,
            reason: 'CSV row requires at least Sensor name, Sensor ID, and Serial number'
          });
          return;
        }
        if (seenIds.has(deviceId.toLowerCase()) || seenSerials.has(serial.toLowerCase())) {
          invalid.push({
            line: idx + 1,
            reason: `Duplicate Sensor ID (${deviceId}) or Serial (${serial})`
          });
          return;
        }
        seenIds.add(deviceId.toLowerCase());
        seenSerials.add(serial.toLowerCase());
        const sType: SensorCategory =
          kind === 'Fuel Sensor' ? 'Fuel Sensor' : 'Temperature Sensor';
        valid.push({
          name,
          deviceId,
          kind: sType,
          manufacturer: manufacturer || (sType === 'Fuel Sensor' ? 'Escort' : 'Teltonika'),
          modelText: modelText || (sType === 'Fuel Sensor' ? 'TD-BLE' : 'EYE Sensor'),
          serial,
          measurementCapability:
            measurementCapability === 'Fuel level' || sType === 'Fuel Sensor'
              ? 'Fuel level'
              : 'Temperature',
          measurementUnit: (['°C', '°F', 'L', '%'].includes(measurementUnit)
            ? measurementUnit
            : sType === 'Fuel Sensor'
            ? 'L'
            : '°C') as SensorRecord['measurementUnit'],
          measurementRange:
            measurementRange || (sType === 'Fuel Sensor' ? '0–600 L' : '−40 to +85 °C'),
          company: company || 'Adani Port',
          inventoryLocation: 'Mundra CT2',
          hardwareLifecycle: (HARDWARE_LIFECYCLE_OPTIONS.includes(
            hardwareLifecycle as HardwareLifecycleStatus
          )
            ? hardwareLifecycle
            : 'Inventory') as HardwareLifecycleStatus
        });
      });
    }

    if (valid.length === 0) {
      sensorUpload.fail(
        invalid[0]?.reason || 'No valid new sensor rows found (duplicates or missing required fields).'
      );
      return;
    }

    sensorUpload.startUploading(fileName, formatUploadFileSize(fileSize), () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const created: SensorRecord[] = valid.map((v, i) => ({
        id: `sen-import-${Date.now()}-${i}`,
        deviceId: v.deviceId!,
        name: v.name!,
        kind: (v.kind as SensorCategory) || 'Temperature Sensor',
        role: 'peripheral',
        category: (v.kind as SensorCategory) || 'Temperature Sensor',
        manufacturer: v.manufacturer || 'Teltonika',
        modelText: v.modelText || 'EYE Sensor',
        serial: v.serial!,
        capabilities: ['BLE'],
        measurementCapability: v.measurementCapability || 'Temperature',
        measurementUnit: (v.measurementUnit as SensorRecord['measurementUnit']) || '°C',
        measurementRange: v.measurementRange || '−40 to +85 °C',
        company: v.company || 'Adani Port',
        inventoryLocation: v.inventoryLocation || 'Mundra CT2',
        hardwareLifecycle: (v.hardwareLifecycle as HardwareLifecycleStatus) || 'Inventory',
        registeredAt: todayStr,
        updatedAt: todayStr,
        notes: 'Imported via bulk CSV/JSON'
      }));

      setStore((prev) => ({
        ...prev,
        sensors: [...created, ...prev.sensors]
      }));
      setSortKey('');
      setCurrentPage(1);
      showToast(`Imported ${created.length} Sensor(s) (${invalid.length} skipped).`);
      return {
        headline: 'Sensors uploaded successfully',
        description: `${created.length} sensor record${created.length === 1 ? '' : 's'} imported from ${fileName}.${
          invalid.length > 0 ? ` ${invalid.length} duplicate or invalid row${invalid.length === 1 ? '' : 's'} skipped.` : ''
        }`,
        stats: [
          { label: 'Uploaded', value: created.length, tone: 'emerald' },
          { label: 'Skipped', value: invalid.length, tone: invalid.length > 0 ? 'amber' : 'slate' }
        ]
      };
    });
  };

  // Lifecycle pill styling
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

  // Linked connections for inspected sensor
  const inspectedConnections = useMemo(() => {
    if (!inspectedSensor) return [];
    return store.connections.filter(
      (c) => c.memberIds?.includes(inspectedSensor.id) || c.hardwareId === inspectedSensor.id
    );
  }, [inspectedSensor, store.connections]);

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
                setFilterCompany('All');
                setFilterKind('All');
                setFilterManufacturer('All');
                setFilterUnit('All');
                setFilterLifecycle('All');
                setSelectedIds(new Set());
                setCurrentPage(1);
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
                downloadModalCsv('FleetRobo_sensors_export.csv', visibleColumns, sortedSensors);
                showToast(
                  `Exported ${sortedSensors.length} Sensor records to FleetRobo_sensors_export.csv`
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
                onClick={() => {
                  setFilterCompany('All');
                  setFilterKind('All');
                  setFilterManufacturer('All');
                  setFilterUnit('All');
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

          {/* 1. FILTERS DRAWER */}
          {activeDrawer === 'filters' && (
            <div className="w-[520px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-5 py-4 border-b border-[#e3e8ee] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">Filter Sensors</h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    Filter registered Temperature and Fuel Sensors by type, manufacturer, unit, or status.
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
                    Sensor type
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
                    {SENSOR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                    Manufacturer
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
                    {ALL_SENSOR_MANUFACTURERS.map((mfg) => (
                      <option key={mfg} value={mfg}>
                        {mfg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                    Measurement unit
                  </label>
                  <select
                    value={filterUnit}
                    onChange={(e) => {
                      setFilterUnit(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                  >
                    <option value="All">All</option>
                    <option value="°C">°C</option>
                    <option value="L">L</option>
                    <option value="%">%</option>
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
                    setFilterUnit('All');
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
                            kind: filterKind,
                            manufacturer: filterManufacturer,
                            measurementUnit: filterUnit,
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
                            Query: {view.query || 'None'} · Sort: {view.sortKey} ({view.sortDir})
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSearchQuery(view.query || '');
                              setFilterKind(view.filters.kind || 'All');
                              setFilterManufacturer(view.filters.manufacturer || 'All');
                              setFilterUnit(view.filters.measurementUnit || 'All');
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
                        label="Vendor / Manufacturer"
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
                    {renderLifecycleBadge(inspectedSensor.hardwareLifecycle)}
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
                        ['Sensor name', inspectedSensor.name.replace(/\s*·\s*.*$/, '')],
                        ['Sensor ID', inspectedSensor.deviceId],
                        ['Sensor type', inspectedSensor.kind],
                        ['Role', inspectedSensor.role],
                        ['Manufacturer', inspectedSensor.manufacturer],
                        ['Model', inspectedSensor.modelText],
                        ['Serial number', inspectedSensor.serial],
                        ['Measurement capability', inspectedSensor.measurementCapability],
                        ['Measurement unit', inspectedSensor.measurementUnit],
                        ['Range', inspectedSensor.measurementRange],
                        ['Inventory status', inspectedSensor.hardwareLifecycle],
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
                          {inspectedSensor.capabilities.map((cap) => (
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
                    {[
                      {
                        date: inspectedSensor.updatedAt,
                        title: 'Sensor calibration & inventory state verified',
                        detail: `Measurement ${inspectedSensor.measurementCapability} (${inspectedSensor.measurementUnit}, ${inspectedSensor.measurementRange}) verified at ${inspectedSensor.inventoryLocation}.`
                      },
                      {
                        date: inspectedSensor.registeredAt,
                        title: 'Sensor hardware onboarded in Sensor Master',
                        detail: `Registered ${inspectedSensor.manufacturer} ${inspectedSensor.modelText} with serial ${inspectedSensor.serial}.`
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
                    Bulk Operations · Sensors
                  </h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    {selectedSensorRecords.length} Sensor record(s) currently selected.
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
                {selectedSensorRecords.length === 0 ? (
                  <div className="p-6 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] text-center text-[12px] text-[#5c6b7a]">
                    Select one or more Sensors in the table first to run a bulk operation.
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
                        <option value="Update ownership">Update ownership</option>
                        <option value="Update inventory status">Update inventory status</option>
                        <option value="Decommission eligible">Decommission eligible</option>
                        <option value="Delete eligible">Delete eligible</option>
                      </select>
                    </div>

                    {bulkAction === 'Update ownership' && (
                      <div>
                        <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                          Target owner / customer
                        </label>
                        <select
                          value={bulkTargetOwner}
                          onChange={(e) => setBulkTargetOwner(e.target.value)}
                          className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                        >
                          {MODAL_OWNERS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

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
                        Sensors linked to an <strong>Active</strong> connection in Modal Mapping are
                        protected and automatically skipped during bulk{' '}
                        {bulkAction === 'Delete eligible' ? 'deletion' : 'decommissioning'}.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-slate-100 text-slate-700">
                        {selectedSensorRecords.length} Selected
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
                    ? `Delete ${bulkEligibility.eligible.length} eligible sensor(s)`
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
                  <h2 className="text-[16px] font-bold text-[#17212b]">Import Sensors</h2>
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
                  dropSubtitle="Import sensors directly. Duplicate IDs or Serials are skipped automatically."
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
                    const csv =
                      'Sensor name,Sensor ID,Sensor type,Manufacturer,Model,Serial number,Measurement capability,Measurement unit,Range,Ownership,Inventory status\n' +
                      'Fuel Sensor — Tank fuel level · Mundra CT2,SENS-9101,Fuel Sensor,Escort,TD-BLE,SN-SENSOR-9101,Fuel level,L,0–600 L,Adani Port,Inventory';
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'fleetrobo_sensors_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  onUseSample={() => {
                    const suffix = Math.floor(100 + Math.random() * 899);
                    const sampleCsv =
                      `Sensor name,Sensor ID,Sensor type,Manufacturer,Model,Serial number,Measurement capability,Measurement unit,Range,Ownership,Inventory status\n` +
                      `Fuel Sensor — Tank fuel level · Mundra CT2 ${suffix},SENS-9${suffix},Fuel Sensor,Escort,TD-BLE,SN-SENSOR-9${suffix},Fuel level,L,0–600 L,Adani Port,Inventory`;
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

      {/* Delete Sensor Confirmation Modal with Confirmation Chips */}
      {(() => {
        if (!sensorToDelete) return null;
        const activeLinks = store.connections.filter(
          (c) =>
            c.status === 'Active' &&
            (c.memberIds?.includes(sensorToDelete.id) || c.hardwareId === sensorToDelete.id)
        );
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
            confirmLabel="Delete Sensor"
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
                label: sensorToDelete.hardwareLifecycle,
                tone: sensorToDelete.hardwareLifecycle === 'Active' ? 'emerald' : 'slate',
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
                label: 'Permanent Sensor Removal',
                tone: 'rose',
              },
            ]}
            warningNote={
              activeLinks.length > 0 ? (
                <>
                  This sensor is linked in{' '}
                  <strong>{activeLinks.map((c) => c.connectionId || c.id).join(', ')}</strong>.
                  Deleting it will remove it from active sensor telemetry inventory.
                </>
              ) : undefined
            }
            onCancel={() => setSensorToDelete(null)}
            onConfirm={handleConfirmDeleteSensor}
          />
        );
      })()}

      {/* Bulk Delete Sensors Confirmation Modal with Confirmation Chips */}
      <DeleteConfirmationModal
        isOpen={pendingBulkDelete}
        title={`Delete ${bulkEligibility.eligible.length} Eligible Sensor(s)?`}
        description="Permanently remove eligible selected sensors from inventory. Sensors linked to Active Modal Mapping connections are automatically excluded."
        confirmLabel={`Confirm Delete (${bulkEligibility.eligible.length})`}
        targetChips={[
          ...bulkEligibility.eligible.slice(0, 5).map((s) => ({
            id: s.id,
            label: s.deviceId,
            sublabel: s.name,
            tone: 'purple' as const,
          })),
          ...(bulkEligibility.eligible.length > 5
            ? [
                {
                  id: 'more-sens',
                  label: `+${bulkEligibility.eligible.length - 5} more`,
                  tone: 'slate' as const,
                },
              ]
            : []),
        ]}
        confirmationChips={[
          {
            id: 'selected',
            label: `${selectedSensorRecords.length} Selected`,
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
        onConfirm={executeBulkDeleteSensors}
      />
    </div>
  );
};
