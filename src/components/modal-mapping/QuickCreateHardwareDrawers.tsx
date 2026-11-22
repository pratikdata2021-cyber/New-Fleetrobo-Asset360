import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  AlertTriangle,
  ChevronDown,
  Search,
  Check,
  Plus
} from 'lucide-react';
import {
  DeviceRecord,
  SensorRecord,
  SimRecord,
  GatewayCategory,
  SensorCategory,
  HardwareLifecycleStatus,
  SimLifecycleStatus,
  DEVICE_CATALOGUE,
  SENSOR_CATALOGUE,
  MODAL_OWNERS,
  MODAL_LOCATIONS,
  HARDWARE_LIFECYCLE_OPTIONS,
  SIM_LIFECYCLE_OPTIONS,
  SIM_OPERATORS,
  SIM_PLANS,
  SIM_FORM_FACTORS,
  MODAL_FIELD_TOOLTIPS
} from '../../types/modalMaster';
import {
  ModelCategoryRecord,
  getDeviceModePresets,
  getPlatformProtocolPresets,
  getRecordIdentifierTypes,
  loadCustomDeviceModes,
  saveCustomDeviceMode,
  loadCustomPlatformProtocols,
  saveCustomPlatformProtocol
} from '../../types/modelCategoryMaster';
import {
  getEnabledModelsForCompanyName,
  getAvailableClientCompanies
} from '../../types/companyModelEnablement';

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

const ALL_MANUFACTURERS = [
  'Teltonika',
  'Queclink',
  'Mettax',
  'Streamax',
  'Jointech',
  'Hikvision',
  'CPPLUS'
];

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

const normalizeProtocol = (val?: string) => {
  const trimmed = (val || '').trim();
  if (!trimmed) return '';
  return trimmed.toUpperCase() === 'METTA' ? 'Metta' : trimmed;
};

/* ============================================================================
 * 1. FULL CREATE DEVICE DRAWER (matches Devices Master Create Form 1:1)
 * ==========================================================================*/
interface FullCreateDeviceDrawerProps {
  targetClient: string;
  site?: string;
  initialModelDef?: ModelCategoryRecord | null;
  initialSearchText?: string;
  existingDevices: DeviceRecord[];
  existingSensors: SensorRecord[];
  onSave: (device: DeviceRecord) => void;
  onClose: () => void;
}

export const FullCreateDeviceDrawer: React.FC<FullCreateDeviceDrawerProps> = ({
  targetClient,
  site,
  initialModelDef,
  initialSearchText = '',
  existingDevices,
  existingSensors,
  onSave,
  onClose
}) => {
  const availableOrganizations = useMemo(() => {
    const dynamic = getAvailableClientCompanies();
    const list = dynamic.length > 0 ? dynamic : MODAL_OWNERS;
    return Array.from(new Set([targetClient, ...list].filter(Boolean)));
  }, [targetClient]);

  const [formCompany, setFormCompany] = useState(targetClient || availableOrganizations[0] || MODAL_OWNERS[0]);
  const formEnabledDeviceModels = useMemo(
    () => getEnabledModelsForCompanyName(formCompany).filter((m) => m.category === 'Device'),
    [formCompany]
  );

  const formEnabledCategories = useMemo<string[]>(() => {
    const cats = Array.from(new Set(formEnabledDeviceModels.map((m) => m.typeName)));
    return cats.length > 0 ? cats : ['GPS', 'ADAS/DMS', 'E-Lock', 'CCTV', 'IP Camera', 'Face Terminal'];
  }, [formEnabledDeviceModels]);

  const seedModel = initialModelDef || formEnabledDeviceModels[0] || null;
  const nextNum = 9001 + existingDevices.length;

  const [formKind, setFormKind] = useState<GatewayCategory>(() => seedModel?.typeName || formEnabledCategories[0] || 'GPS');
  const [formName, setFormName] = useState(() =>
    seedModel ? `${seedModel.typeName} — ${seedModel.manufacturer} ${seedModel.modelReference}` : ''
  );
  const [formDeviceId, setFormDeviceId] = useState(() => `GTW-${nextNum}`);
  const [formImei, setFormImei] = useState(() =>
    initialSearchText && /^\d{10,}$/.test(initialSearchText.trim()) ? initialSearchText.trim() : ''
  );
  const [formSerial, setFormSerial] = useState(() =>
    initialSearchText && !/^\d{10,}$/.test(initialSearchText.trim()) ? initialSearchText.trim() : ''
  );
  const [formManufacturer, setFormManufacturer] = useState(() => seedModel?.manufacturer || 'Teltonika');
  const [formModelText, setFormModelText] = useState(() => seedModel?.modelReference || 'FMB140');
  const [formModes, setFormModes] = useState<string[]>(() => {
    if (!seedModel) return ['Cellular'];
    const m =
      seedModel.supportedModes?.[0] ||
      seedModel.deviceMode ||
      getDeviceModePresets(seedModel.typeName, seedModel.deviceFunction)[0] ||
      seedModel.deviceFunction ||
      'Standard';
    return m ? [m] : [];
  });
  const [formProtocols, setFormProtocols] = useState<string[]>(() => {
    const list =
      seedModel?.supportedProtocols && seedModel.supportedProtocols.length > 0
        ? seedModel.supportedProtocols
        : getPlatformProtocolPresets(seedModel?.typeName || 'GPS', seedModel?.deviceFunction);
    const first = normalizeProtocol(list[0]);
    return first ? [first] : ['JT/T 808'];
  });
  const [formLocation, setFormLocation] = useState(site || MODAL_LOCATIONS[0]);
  const [formLifecycle, setFormLifecycle] = useState<HardwareLifecycleStatus>('Active');
  const [formChannelCount, setFormChannelCount] = useState(4);
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [customDeviceModes, setCustomDeviceModes] = useState<string[]>(() => loadCustomDeviceModes());
  const [deviceModeMenuOpen, setDeviceModeMenuOpen] = useState(false);
  const [deviceModeSearch, setDeviceModeSearch] = useState('');
  const [showCustomDeviceModeInput, setShowCustomDeviceModeInput] = useState(false);
  const [customDeviceModeText, setCustomDeviceModeText] = useState('');
  const deviceModeDropdownRef = useRef<HTMLDivElement | null>(null);

  const [customDeviceProtocols, setCustomDeviceProtocols] = useState<string[]>(() =>
    loadCustomPlatformProtocols()
  );
  const [deviceProtocolMenuOpen, setDeviceProtocolMenuOpen] = useState(false);
  const [deviceProtocolSearch, setDeviceProtocolSearch] = useState('');
  const [showCustomDeviceProtocolInput, setShowCustomDeviceProtocolInput] = useState(false);
  const [customDeviceProtocolText, setCustomDeviceProtocolText] = useState('');
  const deviceProtocolDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (deviceModeDropdownRef.current && !deviceModeDropdownRef.current.contains(target)) {
        setDeviceModeMenuOpen(false);
      }
      if (deviceProtocolDropdownRef.current && !deviceProtocolDropdownRef.current.contains(target)) {
        setDeviceProtocolMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const modelsForSelectedCategory = useMemo(
    () => formEnabledDeviceModels.filter((m) => m.typeName === formKind),
    [formEnabledDeviceModels, formKind]
  );

  const availableManufacturers = useMemo<string[]>(() => {
    if (modelsForSelectedCategory.length > 0) {
      return Array.from(new Set(modelsForSelectedCategory.map((m) => m.manufacturer)));
    }
    const catDef = DEVICE_CATALOGUE[formKind];
    return catDef ? Object.keys(catDef.manufacturers) : ALL_MANUFACTURERS;
  }, [modelsForSelectedCategory, formKind]);

  const availableModels = useMemo(() => {
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
  }, [modelsForSelectedCategory, formManufacturer, formKind, formModelText, availableManufacturers]);

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
      const presets = getDeviceModePresets(selectedModelSpec.typeName, selectedModelSpec.deviceFunction);
      return Array.from(
        new Set(
          [selectedModelSpec.deviceMode, ...presets, ...customDeviceModes, ...formModes].filter(
            (m): m is string => Boolean(m)
          )
        )
      );
    }
    const catDef = DEVICE_CATALOGUE[formKind];
    if (catDef) {
      return Array.from(
        new Set([...catDef.modes, catDef.defaultModeOnSelect, ...customDeviceModes, ...formModes].filter(Boolean))
      );
    }
    return Array.from(new Set(['Standard', ...customDeviceModes, ...formModes].filter(Boolean)));
  }, [selectedModelSpec, formKind, formModes, customDeviceModes]);

  const availableProtocols = useMemo<string[]>(() => {
    const fromSpec = selectedModelSpec?.supportedProtocols || [];
    const fromCatDef = DEVICE_CATALOGUE[formKind]?.protocols || [];
    const fromPresets = getPlatformProtocolPresets(
      selectedModelSpec?.typeName || formKind,
      selectedModelSpec?.deviceFunction
    );
    const baseList = fromSpec.length > 0 ? fromSpec : fromCatDef.length > 0 ? fromCatDef : fromPresets;
    const normalizedBase = [...baseList, ...customDeviceProtocols].map(normalizeProtocol).filter(Boolean);
    const normalizedSelected = formProtocols.map(normalizeProtocol).filter(Boolean);
    return Array.from(new Set([...normalizedBase, ...normalizedSelected]));
  }, [selectedModelSpec, formKind, formProtocols, customDeviceProtocols]);

  const availableIdentifierTypes = useMemo(() => {
    const fromSpec = getRecordIdentifierTypes(selectedModelSpec);
    return fromSpec.length > 0 ? fromSpec : ['IMEI', 'Serial Number'];
  }, [selectedModelSpec]);

  const activeIdentifierType = availableIdentifierTypes[0] || 'Serial Number';

  const resolveDefaultProtocols = (
    modelSupported?: string[],
    typeName?: string,
    deviceFunction?: string,
    fallbackProtocol?: string
  ): string[] => {
    const list =
      modelSupported && modelSupported.length > 0
        ? modelSupported
        : DEVICE_CATALOGUE[typeName || '']?.protocols || getPlatformProtocolPresets(typeName, deviceFunction);
    const normalized = Array.from(new Set(list.map(normalizeProtocol).filter(Boolean)));
    if (normalized.length >= 1) return [normalized[0]];
    const fb = normalizeProtocol(fallbackProtocol);
    return fb ? [fb] : [];
  };

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
      setFormProtocols(resolveDefaultProtocols(first.supportedProtocols, first.typeName, first.deviceFunction));
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
      setFormProtocols(resolveDefaultProtocols(catDef.protocols, newKind, undefined, firstModel.defaultProtocol));
      setFormChannelCount(firstModel.channelCount);
    }
  };

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
      setFormProtocols(resolveDefaultProtocols(first.supportedProtocols, first.typeName, first.deviceFunction));
      setFormChannelCount(4);
      return;
    }
    const catDef = DEVICE_CATALOGUE[formKind];
    const mfgEntry = catDef?.manufacturers[newMfg];
    if (mfgEntry && mfgEntry.models.length > 0) {
      const firstModel = mfgEntry.models[0];
      setFormModelText(firstModel.model);
      setFormProtocols(resolveDefaultProtocols(catDef.protocols, formKind, undefined, firstModel.defaultProtocol));
      setFormChannelCount(firstModel.channelCount);
    }
  };

  const handleModelChange = (newModel: string) => {
    setFormModelText(newModel);
    const matchedEnabled = formEnabledDeviceModels.find(
      (m) => m.typeName === formKind && m.manufacturer === formManufacturer && m.modelReference === newModel
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
        resolveDefaultProtocols(
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
      setFormProtocols(resolveDefaultProtocols(catDef.protocols, formKind, undefined, found.defaultProtocol));
      setFormChannelCount(found.channelCount);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedName = formName.trim().replace(/\s*·\s*.*$/, '');
    const trimmedId = formDeviceId.trim();
    const supportsImei = availableIdentifierTypes.some((t) => t.toUpperCase() === 'IMEI');
    const supportsSerial = availableIdentifierTypes.some((t) => t.toUpperCase() !== 'IMEI');
    const requiresImei = activeIdentifierType.toUpperCase() === 'IMEI';
    const effectiveSerial = formSerial.trim() || (supportsSerial || !requiresImei ? trimmedId : '');
    const effectiveImei = formImei.trim() || (supportsImei && requiresImei ? trimmedId : '');
    const singleProtocol = formProtocols[0] ? formProtocols[0].trim() : '';

    if (!trimmedName || !trimmedId || !singleProtocol) {
      setFormError('Please complete all required fields marked with * (including Platform Protocol).');
      return;
    }

    const dupDev = existingDevices.some(
      (d) =>
        d.deviceId.toLowerCase() === trimmedId.toLowerCase() ||
        (effectiveSerial && d.serial.toLowerCase() === effectiveSerial.toLowerCase()) ||
        (effectiveImei && d.imei && d.imei.toLowerCase() === effectiveImei.toLowerCase())
    );
    const dupSen = existingSensors.some(
      (s) =>
        s.deviceId.toLowerCase() === trimmedId.toLowerCase() ||
        (effectiveSerial && s.serial.toLowerCase() === effectiveSerial.toLowerCase())
    );
    if (dupDev || dupSen) {
      setFormError('Device ID, Serial Number, and IMEI must be unique across Devices and Sensors.');
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
      mode: formModes.join(', '),
      modes: [...formModes],
      serial: effectiveSerial,
      imei: effectiveImei,
      capabilities,
      platformProtocol: singleProtocol,
      platformProtocols: singleProtocol ? [singleProtocol] : [],
      company: formCompany || targetClient,
      inventoryLocation: formLocation || site || MODAL_LOCATIONS[0],
      hardwareLifecycle: formLifecycle,
      registeredAt: todayStr,
      updatedAt: todayStr,
      channelCount: Number(formChannelCount) || 1,
      simSlots: formKind.toLowerCase().includes('dashcam') || formKind.toLowerCase().includes('mdvr') ? 2 : 1,
      supportedPorts:
        formKind.toLowerCase().includes('dashcam') || formKind.toLowerCase().includes('mdvr')
          ? ['CH-1', 'CH-2', 'RS485-1', 'BLE-1', 'SIM Slot 1']
          : ['RS485-1', 'BLE-1', 'DIN-1', 'SIM Slot 1'],
      notes: formNotes.trim()
    };

    onSave(newRecord);
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-slate-900/45 backdrop-blur-[1px]">
      <form
        onSubmit={handleSubmit}
        className="w-[690px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-[#e3e8ee] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#17212b]">Create Device</h2>
            <p className="text-[12px] text-[#5c6b7a] mt-0.5">
              Register physical gateway hardware in FleetRobo inventory. Saves immediately to Devices Master &amp; selects it for mapping.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
                  tooltip="Organization that will own this physical device."
                />
                <select
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                >
                  {availableOrganizations.map((org) => (
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
                      </div>

                      <div className="max-h-44 overflow-y-auto p-1.5 space-y-0.5">
                        {availableProtocols
                          .filter((opt) =>
                            opt.toLowerCase().includes(deviceProtocolSearch.trim().toLowerCase())
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
                              placeholder="Enter custom protocol..."
                              className="flex-1 h-7 px-2 rounded border border-[#d6dfe8] bg-white text-[11px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                            />
                            <button
                              type="button"
                              disabled={!customDeviceProtocolText.trim()}
                              onClick={() => {
                                const customVal = customDeviceProtocolText.trim();
                                if (!customVal) return;
                                setCustomDeviceProtocols(saveCustomPlatformProtocol(customVal));
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel label="Inventory Location" tooltip="Site / yard / store holding this hardware" />
                <select
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px]"
                >
                  {Array.from(new Set([formLocation, ...MODAL_LOCATIONS].filter(Boolean))).map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel label="Lifecycle Status" tooltip={MODAL_FIELD_TOOLTIPS.device.hardwareLifecycle} />
                <select
                  value={formLifecycle}
                  onChange={(e) => setFormLifecycle(e.target.value as HardwareLifecycleStatus)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px]"
                >
                  {HARDWARE_LIFECYCLE_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <FieldLabel label="Notes" tooltip={MODAL_FIELD_TOOLTIPS.device.notes} />
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
            onClick={onClose}
            className="px-4 py-2 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#5c6b7a] hover:text-[#17212b] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-[7px] bg-[#e56b38] hover:bg-[#d15b2a] text-white text-[12px] font-semibold shadow-xs cursor-pointer"
          >
            Create Device
          </button>
        </div>
      </form>
    </div>
  );
};

/* ============================================================================
 * 2. FULL CREATE SENSOR DRAWER (matches Sensors Master Create Form 1:1)
 * ==========================================================================*/
interface FullCreateSensorDrawerProps {
  targetClient: string;
  site?: string;
  initialModelDef?: ModelCategoryRecord | null;
  initialSearchText?: string;
  existingDevices: DeviceRecord[];
  existingSensors: SensorRecord[];
  onSave: (sensor: SensorRecord) => void;
  onClose: () => void;
}

export const FullCreateSensorDrawer: React.FC<FullCreateSensorDrawerProps> = ({
  targetClient,
  site,
  initialModelDef,
  initialSearchText = '',
  existingDevices,
  existingSensors,
  onSave,
  onClose
}) => {
  const availableOrganizations = useMemo(() => {
    const dynamic = getAvailableClientCompanies();
    const list = dynamic.length > 0 ? dynamic : MODAL_OWNERS;
    return Array.from(new Set([targetClient, ...list].filter(Boolean)));
  }, [targetClient]);

  const [formCompany, setFormCompany] = useState(targetClient || availableOrganizations[0] || MODAL_OWNERS[0]);
  const formEnabledSensorModels = useMemo(
    () => getEnabledModelsForCompanyName(formCompany).filter((m) => m.category === 'Sensor'),
    [formCompany]
  );
  const formEnabledSensorCategories = useMemo<string[]>(() => {
    const cats = Array.from(new Set(formEnabledSensorModels.map((m) => m.typeName)));
    return cats.length > 0 ? cats : ['Temperature Sensor', 'Fuel Level Sensor', 'Door Sensor'];
  }, [formEnabledSensorModels]);

  const seedModel = initialModelDef || formEnabledSensorModels[0] || null;
  const nextNum = 10001 + existingSensors.length;

  const [formKind, setFormKind] = useState<SensorCategory>(
    () => seedModel?.typeName || formEnabledSensorCategories[0] || 'Temperature Sensor'
  );
  const [formName, setFormName] = useState(() =>
    seedModel ? `${seedModel.typeName} — ${seedModel.manufacturer} ${seedModel.modelReference || ''}`.trim() : ''
  );
  const [formDeviceId, setFormDeviceId] = useState(() => `SENS-${nextNum}`);
  const [formSerial, setFormSerial] = useState(() =>
    initialSearchText.trim() || `SN-SENSOR-${260000 + existingSensors.length}`
  );
  const [formManufacturer, setFormManufacturer] = useState(() => seedModel?.manufacturer || 'Teltonika');
  const [formModelText, setFormModelText] = useState(
    () => seedModel?.modelReference || seedModel?.typeName || 'EYE Sensor'
  );
  const [formMeasurementCap, setFormMeasurementCap] = useState<string>(
    () => seedModel?.measurementType || 'Temperature'
  );
  const [formUnit, setFormUnit] = useState<string>(() => seedModel?.measurementUnit || '°C');
  const [formRange, setFormRange] = useState(() =>
    seedModel?.measurementType === 'Temperature' ? '−40 to +85 °C' : '0–600 L'
  );
  const [formCapabilities, setFormCapabilities] = useState<string[]>(['BLE']);
  const [formLocation, setFormLocation] = useState(site || MODAL_LOCATIONS[0]);
  const [formLifecycle, setFormLifecycle] = useState<HardwareLifecycleStatus>('Active');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const modelsForSelectedCategory = useMemo(
    () =>
      formEnabledSensorModels.filter(
        (m) =>
          m.typeName === formKind ||
          (formKind === 'Fuel Sensor' && m.typeName === 'Fuel Level Sensor') ||
          (formKind === 'Fuel Level Sensor' && m.typeName === 'Fuel Sensor')
      ),
    [formEnabledSensorModels, formKind]
  );

  const availableManufacturers = useMemo<string[]>(() => {
    if (modelsForSelectedCategory.length > 0) {
      const mfgs = Array.from(new Set(modelsForSelectedCategory.map((m) => m.manufacturer).filter(Boolean)));
      if (mfgs.length > 0) return mfgs;
    }
    const catDef = SENSOR_CATALOGUE[formKind as any];
    return catDef ? Object.keys(catDef.manufacturers) : ALL_SENSOR_MANUFACTURERS;
  }, [modelsForSelectedCategory, formKind]);

  const availableModels = useMemo(() => {
    if (modelsForSelectedCategory.length > 0) {
      const byMfg = modelsForSelectedCategory.filter((m) => m.manufacturer === formManufacturer);
      const list = byMfg.length > 0 ? byMfg : modelsForSelectedCategory;
      const valid = list
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
      if (valid.length > 0) return valid;
    }
    const catDef = SENSOR_CATALOGUE[formKind as any];
    if (!catDef) {
      return [{ model: formModelText || 'EYE Sensor', capabilities: ['BLE'], defaultRange: '−40 to +85 °C' }];
    }
    return (
      catDef.manufacturers[formManufacturer]?.models ||
      catDef.manufacturers[availableManufacturers[0]]?.models ||
      []
    );
  }, [modelsForSelectedCategory, formManufacturer, formKind, formModelText, availableManufacturers]);

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
    return fromSpec.length > 0 ? fromSpec : ['Serial Number'];
  }, [selectedSensorModelSpec]);

  const activeIdentifierType = availableIdentifierTypes[0] || 'Serial Number';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    const trimmedId = formDeviceId.trim();
    const trimmedSerial = formSerial.trim() || `SN-${trimmedId}`;

    if (!trimmedName || !trimmedId) {
      setFormError('Please complete all required fields marked with *.');
      return;
    }

    const dupDev = existingDevices.some(
      (d) =>
        d.deviceId.toLowerCase() === trimmedId.toLowerCase() ||
        (trimmedSerial && d.serial.toLowerCase() === trimmedSerial.toLowerCase())
    );
    const dupSen = existingSensors.some(
      (s) =>
        s.deviceId.toLowerCase() === trimmedId.toLowerCase() ||
        (trimmedSerial && s.serial.toLowerCase() === trimmedSerial.toLowerCase())
    );
    if (dupDev || dupSen) {
      setFormError('Sensor ID and physical serial must be unique across Devices and Sensors.');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const newRecord: SensorRecord = {
      id: `sen-focus-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
      company: formCompany || targetClient,
      inventoryLocation: formLocation || site || MODAL_LOCATIONS[0],
      hardwareLifecycle: formLifecycle,
      registeredAt: todayStr,
      updatedAt: todayStr,
      notes: formNotes.trim()
    };

    onSave(newRecord);
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-slate-900/45 backdrop-blur-[1px]">
      <form
        onSubmit={handleSubmit}
        className="w-[690px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-[#e3e8ee] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#17212b]">Create Sensor</h2>
            <p className="text-[12px] text-[#5c6b7a] mt-0.5">
              Register physical sensor hardware in FleetRobo inventory. Saves immediately to Sensors Master &amp; selects it for mapping.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
                  tooltip="Organization that will own this physical sensor."
                />
                <select
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                >
                  {availableOrganizations.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel label="Sensor category" required tooltip={MODAL_FIELD_TOOLTIPS.sensor.kind} />
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
              <div>
                <FieldLabel label="Sensor name" required tooltip={MODAL_FIELD_TOOLTIPS.sensor.name} />
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
                <FieldLabel label="Sensor ID" required tooltip={MODAL_FIELD_TOOLTIPS.sensor.deviceId} />
                <input
                  type="text"
                  required
                  value={formDeviceId}
                  onChange={(e) => setFormDeviceId(e.target.value)}
                  placeholder="e.g. SENS-10001"
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] font-mono text-[12px] focus:outline-none focus:border-[#e56b38]"
                />
              </div>
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
                  tooltip={`Unique ${activeIdentifierType} configured for ${formKind}.`}
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
                <FieldLabel label="Model" required tooltip={MODAL_FIELD_TOOLTIPS.sensor.modelText} />
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel label="Inventory Location" tooltip="Site / yard / store holding this sensor" />
                <select
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px]"
                >
                  {Array.from(new Set([formLocation, ...MODAL_LOCATIONS].filter(Boolean))).map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel label="Lifecycle Status" tooltip="Current physical sensor lifecycle status" />
                <select
                  value={formLifecycle}
                  onChange={(e) => setFormLifecycle(e.target.value as HardwareLifecycleStatus)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px]"
                >
                  {HARDWARE_LIFECYCLE_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <FieldLabel label="Notes" tooltip={MODAL_FIELD_TOOLTIPS.sensor.notes} />
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
            onClick={onClose}
            className="px-4 py-2 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#5c6b7a] hover:text-[#17212b] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-[7px] bg-[#e56b38] hover:bg-[#d15b2a] text-white text-[12px] font-semibold shadow-xs cursor-pointer"
          >
            Create Sensor
          </button>
        </div>
      </form>
    </div>
  );
};

/* ============================================================================
 * 3. FULL CREATE SIM DRAWER (matches SIM Master Create Form 1:1)
 * ==========================================================================*/
interface FullCreateSimDrawerProps {
  targetClient: string;
  initialModelDef?: ModelCategoryRecord | null;
  initialSearchText?: string;
  existingSims: SimRecord[];
  onSave: (sim: SimRecord) => void;
  onClose: () => void;
}

export const FullCreateSimDrawer: React.FC<FullCreateSimDrawerProps> = ({
  targetClient,
  initialModelDef,
  initialSearchText = '',
  existingSims,
  onSave,
  onClose
}) => {
  const availableOrganizations = useMemo(() => {
    const dynamic = getAvailableClientCompanies();
    const list = dynamic.length > 0 ? dynamic : MODAL_OWNERS;
    return Array.from(new Set([targetClient, ...list].filter(Boolean)));
  }, [targetClient]);

  const [formOwner, setFormOwner] = useState(targetClient || availableOrganizations[0] || MODAL_OWNERS[0]);
  const formEnabledSimModels = useMemo(
    () => getEnabledModelsForCompanyName(formOwner).filter((m) => m.category === 'SIM'),
    [formOwner]
  );
  const formEnabledSimCategories = useMemo<string[]>(() => {
    const cats = Array.from(new Set(formEnabledSimModels.map((m) => m.typeName)));
    return cats.length > 0 ? cats : ['M2M SIM', 'Standard SIM', 'IoT eSIM'];
  }, [formEnabledSimModels]);

  const seedModel = initialModelDef || formEnabledSimModels[0] || null;
  const nextSuffix = (existingSims.length + 1).toString().padStart(5, '0');
  const seedIdType = getRecordIdentifierTypes(seedModel)[0] || 'ICCID';

  const [formCategory, setFormCategory] = useState(() => seedModel?.typeName || formEnabledSimCategories[0] || 'M2M SIM');
  const [formOperator, setFormOperator] = useState(() => seedModel?.manufacturer || 'Airtel');
  const [formModelRef, setFormModelRef] = useState(() => seedModel?.modelReference || '');
  const [formMode, setFormMode] = useState<string>(() => seedModel?.simType || 'M2M');
  const [formFormFactor, setFormFormFactor] = useState<SimRecord['formFactor']>(() =>
    seedModel?.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)'
  );
  const [formIccid, setFormIccid] = useState(() =>
    initialSearchText.trim() || (seedIdType === 'ICCID' ? `899186104312451${nextSuffix}` : '')
  );
  const [formMsisdn, setFormMsisdn] = useState('');
  const [formPlan, setFormPlan] = useState(() =>
    seedModel?.manufacturer === 'Jio' ? 'Enterprise M2M 2GB' : 'IoT Business 10GB'
  );
  const [formStatus, setFormStatus] = useState<SimLifecycleStatus>('Active');
  const [formActivationDate, setFormActivationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formRenewalDate, setFormRenewalDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const modelsForSelectedCategory = useMemo(
    () => formEnabledSimModels.filter((m) => m.typeName === formCategory),
    [formEnabledSimModels, formCategory]
  );

  const availableOperators = useMemo<string[]>(() => {
    if (modelsForSelectedCategory.length > 0) {
      return Array.from(new Set(modelsForSelectedCategory.map((m) => m.manufacturer)));
    }
    return SIM_OPERATORS;
  }, [modelsForSelectedCategory]);

  const modelsForSelectedOperator = useMemo(
    () => modelsForSelectedCategory.filter((m) => m.manufacturer === formOperator),
    [modelsForSelectedCategory, formOperator]
  );

  const selectedSimModelSpec = useMemo(() => {
    return (
      modelsForSelectedCategory.find(
        (m) => m.manufacturer === formOperator && (!formModelRef || m.modelReference === formModelRef)
      ) ||
      modelsForSelectedCategory.find((m) => m.manufacturer === formOperator) ||
      modelsForSelectedCategory[0] ||
      formEnabledSimModels[0] ||
      null
    );
  }, [modelsForSelectedCategory, formOperator, formModelRef, formEnabledSimModels]);

  const activeIdentifierType = getRecordIdentifierTypes(selectedSimModelSpec)[0] || 'ICCID';

  const handleSimCategoryChange = (newCat: string) => {
    setFormCategory(newCat);
    const matching = formEnabledSimModels.filter((m) => m.typeName === newCat);
    if (matching.length > 0) {
      const first = matching[0];
      const nextIdType = getRecordIdentifierTypes(first)[0] || 'ICCID';
      setFormOperator(first.manufacturer);
      setFormModelRef(first.modelReference || '');
      setFormMode(first.simType || 'M2M');
      setFormFormFactor(first.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)');
      if (nextIdType !== 'ICCID' && /^899186\d+$/.test(formIccid.trim())) {
        setFormIccid('');
      }
      if (first.manufacturer === 'Jio') setFormPlan('Enterprise M2M 2GB');
      else if (first.manufacturer === 'Vodafone Idea' || first.manufacturer === 'Vi') setFormPlan('IoT 5GB');
      else setFormPlan('IoT Business 10GB');
    }
  };

  const handleOperatorChange = (newOp: string) => {
    setFormOperator(newOp);
    const matching = formEnabledSimModels.filter((m) => m.typeName === formCategory && m.manufacturer === newOp);
    if (matching.length > 0) {
      const first = matching[0];
      setFormModelRef(first.modelReference || '');
      setFormMode(first.simType || 'M2M');
      setFormFormFactor(first.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)');
    }
  };

  const handleModelRefChange = (newRef: string) => {
    setFormModelRef(newRef);
    const matched = formEnabledSimModels.find(
      (m) => m.typeName === formCategory && m.manufacturer === formOperator && m.modelReference === newRef
    );
    if (matched) {
      setFormMode(matched.simType || 'M2M');
      setFormFormFactor(matched.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedPrimaryId = formIccid.trim();
    if (!trimmedPrimaryId) {
      setFormError(`${activeIdentifierType} is required.`);
      return;
    }
    if (activeIdentifierType.trim().toUpperCase() === 'ICCID' && !/^\d{18,22}$/.test(trimmedPrimaryId)) {
      setFormError('ICCID must be 18–22 digits.');
      return;
    }
    const dup = existingSims.some((s) => s.iccid.trim().toLowerCase() === trimmedPrimaryId.toLowerCase());
    if (dup) {
      setFormError(`${activeIdentifierType} "${trimmedPrimaryId}" already exists in SIM Master.`);
      return;
    }

    const newRecord: SimRecord = {
      id: `SIM-rt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      iccid: trimmedPrimaryId,
      msisdn:
        activeIdentifierType.trim().toUpperCase() === 'MSISDN' && !formMsisdn.trim()
          ? trimmedPrimaryId
          : formMsisdn.trim(),
      operator: formOperator,
      plan: formPlan,
      formFactor: formFormFactor,
      network: '4G LTE',
      owner: formOwner || targetClient,
      location: '',
      status: formStatus,
      activationDate: formActivationDate,
      renewalDate: formRenewalDate,
      notes: formNotes.trim(),
      category: formCategory,
      modelTypeId: selectedSimModelSpec?.id,
      identifierType: activeIdentifierType
    };

    onSave(newRecord);
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-slate-900/45 backdrop-blur-[1px]">
      <form
        onSubmit={handleSubmit}
        className="w-[690px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-[#e3e8ee] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#17212b]">Create SIM</h2>
            <p className="text-[12px] text-[#5c6b7a] mt-0.5">
              Register carrier SIM inventory in FleetRobo. Saves immediately to SIM Master &amp; selects it for mapping.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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

          {/* Section 1: 1. Basic Information */}
          <div className="space-y-3.5">
            <div className="text-[12px] font-bold uppercase tracking-wider text-[#9e431c] border-b border-[#e3e8ee] pb-1.5">
              1. Basic Information
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <FieldLabel
                  label="Organization Name"
                  required
                  tooltip="Organization that will own this physical SIM."
                />
                <select
                  value={formOwner}
                  onChange={(e) => setFormOwner(e.target.value)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                >
                  {availableOrganizations.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel label="SIM category" required tooltip={MODAL_FIELD_TOOLTIPS.sim.formFactor} />
                <select
                  value={formCategory}
                  onChange={(e) => handleSimCategoryChange(e.target.value)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                >
                  {formEnabledSimCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel
                  label={activeIdentifierType}
                  required
                  tooltip={
                    activeIdentifierType === 'ICCID'
                      ? MODAL_FIELD_TOOLTIPS.sim.iccid
                      : `Unique ${activeIdentifierType} configured for ${formCategory}.`
                  }
                />
                <input
                  type="text"
                  required
                  value={formIccid}
                  onChange={(e) => setFormIccid(e.target.value)}
                  placeholder={
                    activeIdentifierType === 'ICCID'
                      ? '18–22 digit ICCID'
                      : activeIdentifierType === 'EID'
                      ? '32-digit eSIM EID'
                      : activeIdentifierType === 'IMSI'
                      ? '15-digit IMSI'
                      : activeIdentifierType === 'MSISDN'
                      ? '+91 9810000000'
                      : `Enter ${activeIdentifierType}`
                  }
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] font-mono text-[12px] focus:outline-none focus:border-[#e56b38]"
                />
              </div>
              <div>
                <FieldLabel label="Form factor" required tooltip={MODAL_FIELD_TOOLTIPS.sim.formFactor} />
                <select
                  value={formFormFactor}
                  onChange={(e) => setFormFormFactor(e.target.value as any)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                >
                  {SIM_FORM_FACTORS.map((ff) => (
                    <option key={ff} value={ff}>
                      {ff}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: 2. Operator and Plan */}
          <div className="space-y-3.5">
            <div className="text-[12px] font-bold uppercase tracking-wider text-[#9e431c] border-b border-[#e3e8ee] pb-1.5">
              2. Operator and Plan
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FieldLabel label="Network operator" required tooltip={MODAL_FIELD_TOOLTIPS.sim.operator} />
                <select
                  value={formOperator}
                  onChange={(e) => handleOperatorChange(e.target.value)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                >
                  {availableOperators.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel label="Plan / data package" required tooltip={MODAL_FIELD_TOOLTIPS.sim.plan} />
                <select
                  value={formPlan}
                  onChange={(e) => setFormPlan(e.target.value)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                >
                  {SIM_PLANS.map((pl) => (
                    <option key={pl} value={pl}>
                      {pl}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel label="Service Mode" tooltip="Commercial telematics classification from model catalog" />
                <select
                  value={formMode}
                  onChange={(e) => setFormMode(e.target.value)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                >
                  {Array.from(
                    new Set(['M2M', 'Standard', 'IoT', 'Postpaid', 'Prepaid', 'Other', formMode].filter(Boolean))
                  ).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(modelsForSelectedOperator.length > 1 || activeIdentifierType.toUpperCase() !== 'MSISDN') && (
              <div className="grid grid-cols-2 gap-4">
                {modelsForSelectedOperator.length > 1 && (
                  <div>
                    <FieldLabel
                      label="Model / Reference"
                      tooltip="Select the specific SIM model configuration from Model Category Master."
                    />
                    <select
                      value={selectedSimModelSpec?.modelReference || formModelRef}
                      onChange={(e) => handleModelRefChange(e.target.value)}
                      className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                    >
                      {modelsForSelectedOperator.map((m) => (
                        <option key={m.id} value={m.modelReference}>
                          {m.modelReference || m.typeName} ({getRecordIdentifierTypes(m).join(', ') || m.identifierType})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {activeIdentifierType.toUpperCase() !== 'MSISDN' && (
                  <div>
                    <FieldLabel label="Mobile number / MSISDN" tooltip={MODAL_FIELD_TOOLTIPS.sim.msisdn} />
                    <input
                      type="text"
                      value={formMsisdn}
                      onChange={(e) => setFormMsisdn(e.target.value)}
                      placeholder="+91 9810000000"
                      className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] text-[12px] focus:outline-none focus:border-[#e56b38]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: 3. Additional metadata */}
          <div className="space-y-3.5">
            <div className="text-[12px] font-bold uppercase tracking-wider text-[#9e431c] border-b border-[#e3e8ee] pb-1.5">
              3. Additional metadata
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <FieldLabel label="SIM lifecycle status" required tooltip={MODAL_FIELD_TOOLTIPS.sim.status} />
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as SimLifecycleStatus)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                >
                  {SIM_LIFECYCLE_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel label="Activation date" tooltip={MODAL_FIELD_TOOLTIPS.sim.activationDate} />
                <input
                  type="date"
                  value={formActivationDate}
                  onChange={(e) => setFormActivationDate(e.target.value)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] text-[12px] focus:outline-none focus:border-[#e56b38]"
                />
              </div>
              <div>
                <FieldLabel label="Expiry / renewal date" tooltip={MODAL_FIELD_TOOLTIPS.sim.renewalDate} />
                <input
                  type="date"
                  value={formRenewalDate}
                  onChange={(e) => setFormRenewalDate(e.target.value)}
                  className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] text-[12px] focus:outline-none focus:border-[#e56b38]"
                />
              </div>
            </div>
            <div>
              <FieldLabel label="Notes" tooltip={MODAL_FIELD_TOOLTIPS.sim.notes} />
              <textarea
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional internal notes for carrier batch, billing reference, or roaming rules..."
                className="w-full p-3 rounded-[7px] border border-[#d6dfe8] text-[12px] focus:outline-none focus:border-[#e56b38]"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#e3e8ee] bg-[#f8fafc] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#5c6b7a] hover:text-[#17212b] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-[7px] bg-[#e56b38] hover:bg-[#d15b2a] text-white text-[12px] font-semibold shadow-xs cursor-pointer"
          >
            Create SIM
          </button>
        </div>
      </form>
    </div>
  );
};
