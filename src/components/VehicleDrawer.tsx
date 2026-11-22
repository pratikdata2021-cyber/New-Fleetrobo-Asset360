import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Trash2, 
  Edit2, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  FileText,
  Upload,
  Check,
  Calendar,
  ShieldCheck,
  Wrench,
  FileCheck,
  ChevronDown,
  Search,
  Plus
} from 'lucide-react';
import { 
  Vehicle, 
  DEMO_LOOKUPS,
  DocumentAttachment,
  loadCustomVehicleSkills,
  saveCustomVehicleSkill
} from '../types/vehicle';
import {
  ALL_VEHICLE_SEGMENTS,
  VEHICLE_TYPES,
  VehicleModelRecord,
  formatVehicleModelLabel,
  loadVehicleModelStore
} from '../types/vehicleModelMaster';
import {
  getCanonicalTransporterVendors,
  resolveTransporterVendor,
} from '../data/vendorsSeed';
import { InfoTooltip } from './InfoTooltip';

interface VehicleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'view' | 'edit';
  initialVehicle?: Vehicle | null;
  onSaveVehicle: (vehicle: Vehicle) => void;
  onSwitchToEdit?: () => void;
  existingVehicles: Vehicle[];
  companyContext?: string;
  zIndexClass?: string;
}

// Helper to format file sizes
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Reusable Document Upload Field Component
interface DocumentUploadFieldProps {
  label: string;
  tooltip: string;
  document: DocumentAttachment | null | undefined;
  onChange: (doc: DocumentAttachment | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

const DocumentUploadField: React.FC<DocumentUploadFieldProps> = ({
  label,
  tooltip,
  document,
  onChange,
  disabled = false,
  required = false,
  error
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Restriction: JPG/JPEG/PNG/PDF <= 3 MB
    if (file.size > 3 * 1024 * 1024) {
      setSizeError('File exceeds 3 MB limit. Please select a smaller file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSizeError('');
    const newDoc: DocumentAttachment = {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      uploaded_at: new Date().toISOString().split('T')[0]
    };
    onChange(newDoc);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(null);
    setSizeError('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-800 flex items-center">
          {label} {required && <span className="text-red-500 ml-0.5">*</span>}
          <InfoTooltip content={tooltip} />
        </label>
        <span className="text-[10px] text-slate-400">JPG, PNG, PDF ≤ 3MB</span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.pdf"
        disabled={disabled}
        className="hidden"
      />

      {document ? (
        <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded bg-orange-100 text-[#FA8A63] flex items-center justify-center shrink-0">
              <FileText size={15} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 truncate text-[11px]" title={document.name}>
                {document.name}
              </div>
              <div className="text-[10px] text-slate-400">
                {document.size} {document.uploaded_at ? `· Uploaded ${document.uploaded_at}` : ''}
              </div>
            </div>
          </div>

          {!disabled && (
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 text-[11px] font-semibold text-[#FA8A63] hover:bg-orange-50 rounded transition-colors cursor-pointer"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                title="Remove document"
                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full py-2.5 px-3 border border-dashed rounded-lg flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer ${
            disabled
              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-white border-slate-300 hover:border-[#FA8A63] hover:bg-orange-50/20 text-slate-600'
          }`}
        >
          <Upload size={13} className="text-slate-400" />
          <span className="font-medium text-[11px]">Click to upload document</span>
        </button>
      )}

      {(sizeError || error) && (
        <p className="text-[10px] text-red-500 font-semibold">{sizeError || error}</p>
      )}
    </div>
  );
};

export const VehicleDrawer: React.FC<VehicleDrawerProps> = ({
  isOpen,
  onClose,
  mode,
  initialVehicle,
  onSaveVehicle,
  onSwitchToEdit,
  existingVehicles,
  companyContext,
  zIndexClass = 'z-50'
}) => {
  const [formData, setFormData] = useState<Partial<Vehicle>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);
  const [prefillLoading, setPrefillLoading] = useState<boolean>(false);
  const [prefillFeedback, setPrefillFeedback] = useState<string>('');

  // Vehicle Model Master integration state
  const [vehicleModels, setVehicleModels] = useState<VehicleModelRecord[]>(() =>
    loadVehicleModelStore()
  );
  const [machineModelMenuOpen, setMachineModelMenuOpen] = useState<boolean>(false);
  const [machineModelSearch, setMachineModelSearch] = useState<string>('');
  const [modelTypeFilter, setModelTypeFilter] = useState<string>('All');
  const [modelSegmentFilter, setModelSegmentFilter] = useState<string>('All');
  const [modelCompatibilityNotice, setModelCompatibilityNotice] = useState<string>('');
  const [prefilledFromModelNotice, setPrefilledFromModelNotice] = useState<string>('');
  const machineModelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncVehicleModels = () => setVehicleModels(loadVehicleModelStore());
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fleetrobo_vehicle_model_master_v1') syncVehicleModels();
    };
    window.addEventListener('fleetrobo:vehicle-models-updated', syncVehicleModels);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('fleetrobo:vehicle-models-updated', syncVehicleModels);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!machineModelMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        machineModelDropdownRef.current &&
        !machineModelDropdownRef.current.contains(e.target as Node)
      ) {
        setMachineModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [machineModelMenuOpen]);

  // Section 7 — Vehicle Skills multi-select dropdown state
  const [skillsMenuOpen, setSkillsMenuOpen] = useState<boolean>(false);
  const [skillsSearch, setSkillsSearch] = useState<string>('');
  const [showCustomSkillInput, setShowCustomSkillInput] = useState<boolean>(false);
  const [customSkillText, setCustomSkillText] = useState<string>('');
  const [customVehicleSkills, setCustomVehicleSkills] = useState<string[]>(() =>
    loadCustomVehicleSkills()
  );
  const skillsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!skillsMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (skillsDropdownRef.current && !skillsDropdownRef.current.contains(e.target as Node)) {
        setSkillsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [skillsMenuOpen]);

  useEffect(() => {
    if (isOpen) {
      setVehicleModels(loadVehicleModelStore());
      if (mode === 'create') {
        const defaultCompany = companyContext || 'Adani Port';
        setFormData({
          company: defaultCompany, // Inherited silently; not shown as form input
          client: defaultCompany,
          status: 'Available',
          active_status: true,
          overspeed_limit: 60,
          fuel_theft_limit: 0,
          fuel_refill: 0,
          fuel_calibration_type: 'Standard',
          fuel_type: 'Diesel',
          vehicle_model_id: '',
          machine_model: '',
          model: '',
          routes: [],
          sharing: [],
          fleets: [],
          trailers: [],
          skills: [],
          ...(initialVehicle?.registration_number
            ? { registration_number: initialVehicle.registration_number }
            : {})
        });
      } else if (initialVehicle) {
        setFormData({
          ...initialVehicle,
          machine_model: initialVehicle.machine_model || initialVehicle.model,
          chassis_number: initialVehicle.chassis_number || initialVehicle.vin,
          skills: initialVehicle.skills || [],
          active_status: initialVehicle.active_status !== undefined 
            ? initialVehicle.active_status 
            : initialVehicle.status !== 'Inactive'
        });
      }
      setFieldErrors({});
      setIsDirty(false);
      setPrefillFeedback('');
      setMachineModelMenuOpen(false);
      setMachineModelSearch('');
      setModelTypeFilter(
        mode !== 'create' && initialVehicle?.type ? initialVehicle.type : 'All'
      );
      setModelSegmentFilter(
        mode !== 'create' && initialVehicle?.vehicle_segment
          ? initialVehicle.vehicle_segment
          : 'All'
      );
      setModelCompatibilityNotice('');
      setPrefilledFromModelNotice('');
      setSkillsMenuOpen(false);
      setSkillsSearch('');
      setShowCustomSkillInput(false);
      setCustomSkillText('');
      setCustomVehicleSkills(loadCustomVehicleSkills());
    }
  }, [isOpen, mode, initialVehicle, companyContext]);

  const [vendorRefreshTick, setVendorRefreshTick] = useState(0);
  useEffect(() => {
    const onVendorsUpdated = () => setVendorRefreshTick(t => t + 1);
    window.addEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
    return () => window.removeEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
  }, []);

  const transporterOptions = React.useMemo(() => {
    void vendorRefreshTick;
    const canonicalVendors = getCanonicalTransporterVendors(companyContext);
    const seen = new Set<string>();
    const list: Array<{ name: string; publicId?: string; id?: string }> = [];
    canonicalVendors.forEach(v => {
      if (!seen.has(v.name)) {
        seen.add(v.name);
        list.push({ name: v.name, publicId: v.public_id, id: v.id });
      }
    });
    DEMO_LOOKUPS.transporters.forEach(t => {
      if (!seen.has(t)) {
        seen.add(t);
        list.push({ name: t });
      }
    });
    if (formData.transporter && !seen.has(formData.transporter)) {
      list.push({ name: formData.transporter });
    }
    return list;
  }, [companyContext, formData.transporter, vendorRefreshTick]);

  const activeVehicleModels = React.useMemo(
    () => vehicleModels.filter((m) => m.isActive),
    [vehicleModels]
  );

  const selectedMasterModel = React.useMemo(() => {
    if (formData.vehicle_model_id) {
      return vehicleModels.find((m) => m.id === formData.vehicle_model_id) || null;
    }
    const mm = (formData.machine_model || '').trim().toLowerCase();
    if (!mm) return null;
    return (
      vehicleModels.find(
        (m) =>
          formatVehicleModelLabel(m).toLowerCase() === mm ||
          m.modelName.toLowerCase() === mm
      ) || null
    );
  }, [vehicleModels, formData.vehicle_model_id, formData.machine_model]);

  const filteredActiveModels = React.useMemo(() => {
    const q = machineModelSearch.trim().toLowerCase();
    return activeVehicleModels.filter((m) => {
      if (modelTypeFilter !== 'All' && m.vehicleType !== modelTypeFilter) {
        return false;
      }
      if (modelSegmentFilter !== 'All' && m.vehicleSegment !== modelSegmentFilter) {
        return false;
      }
      if (q) {
        const hay = `${m.id} ${m.manufacturer} ${m.modelName} ${m.variant} ${m.vehicleType} ${m.vehicleSegment}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeVehicleModels, machineModelSearch, modelTypeFilter, modelSegmentFilter]);

  if (!isOpen) return null;

  const handleSelectVehicleModel = (m: VehicleModelRecord) => {
    if (isReadOnly) return;
    const mappedClass =
      m.vehicleSegment === 'HCV'
        ? 'HMV'
        : m.vehicleSegment === 'MCV'
        ? 'MCV'
        : m.vehicleSegment === 'LCV'
        ? 'LCV'
        : formData.class || 'HMV';

    setFormData((prev) => ({
      ...prev,
      vehicle_model_id: m.id,
      machine_model: formatVehicleModelLabel(m),
      model: m.modelName,
      make: m.manufacturer,
      trim: m.variant,
      type: m.vehicleType,
      vehicle_segment: m.vehicleSegment,
      class: mappedClass,
      fuel_type: m.fuelType || prev.fuel_type || 'Diesel',
      fuel_tank_capacity:
        m.fuelTankCapacityL !== undefined && m.fuelTankCapacityL !== ''
          ? m.fuelTankCapacityL
          : prev.fuel_tank_capacity,
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.machine_model;
      return next;
    });
    setModelCompatibilityNotice('');
    setPrefilledFromModelNotice(
      `Linked ${m.id} · Prefilled manufacturer, type, segment & fuel defaults (editable).`
    );
    setMachineModelMenuOpen(false);
    setMachineModelSearch('');
    setIsDirty(true);
  };

  const handleModelFilterChange = (
    nextType: string,
    nextSegment: string
  ) => {
    setModelTypeFilter(nextType);
    setModelSegmentFilter(nextSegment);

    // Revalidate already-selected model against changed type/segment filter (PRD §8)
    if (selectedMasterModel) {
      const typeMismatch =
        nextType !== 'All' && selectedMasterModel.vehicleType !== nextType;
      const segMismatch =
        nextSegment !== 'All' &&
        selectedMasterModel.vehicleSegment !== nextSegment;
      if (typeMismatch || segMismatch) {
        setFormData((prev) => ({
          ...prev,
          vehicle_model_id: '',
          machine_model: '',
          model: '',
          type: nextType !== 'All' ? nextType : prev.type,
          vehicle_segment:
            nextSegment !== 'All' ? nextSegment : prev.vehicle_segment,
        }));
        setPrefilledFromModelNotice('');
        setModelCompatibilityNotice(
          `Cleared "${formatVehicleModelLabel(selectedMasterModel)}" because it does not match ${nextType !== 'All' ? nextType : ''} ${nextSegment !== 'All' ? nextSegment : ''}. Please pick a compatible model.`
        );
      }
    }
  };

  const isReadOnly = mode === 'view';

  const updateField = (key: keyof Vehicle, value: any) => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const handleCloseAttempt = () => {
    if (isDirty && !isReadOnly) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Prefill Details (VAHAN sample mockup)
  const handlePrefillDetails = () => {
    if (isReadOnly) return;
    const reg = formData.registration_number?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!reg) {
      setPrefillFeedback('Enter Registration Number first to lookup VAHAN data.');
      return;
    }

    setPrefillLoading(true);
    setPrefillFeedback('Querying national VAHAN register database…');

    setTimeout(() => {
      setPrefillLoading(false);
      if (reg === 'MH12AB1234') {
        setFormData((prev) => ({
          ...prev,
          registration_number: 'MH12AB1234',
          machine_model: 'Tata Signa 5530',
          model: 'Signa 5530',
          make: 'Tata Motors',
          name: 'Tata Signa 5530',
          chassis_number: 'MA3FJEB1S00654321',
          vin: 'MA3FJEB1S00654321',
          engine_number: 'ENG-TT-99401',
          registration_date: '2023-04-15',
          year: 2023,
          class: 'HMV',
          color: 'Pure White',
          fuel_type: 'Diesel',
          fuel_tank_capacity: 360,
          fuel_calibration_type: 'Linear',
          overspeed_limit: 60,
          insurance_company: 'ICICI Lombard',
          insurance_from: '2024-01-15',
          insurance_to: '2027-01-15',
          policy_number: 'POL-ICICI-49201',
          transporter: 'Western Logistics',
          machine_owner: 'Adani Logistics Services'
        }));
        setIsDirty(true);
        setPrefillFeedback('VAHAN record matched! Prefilled 14 identity, settings & insurance fields.');
      } else if (reg === 'RJ05GC0206') {
        setFormData((prev) => ({
          ...prev,
          registration_number: 'RJ05GC0206',
          machine_model: 'Ashok Leyland 2820',
          model: '2820',
          make: 'Ashok Leyland',
          name: 'Ashok Leyland 2820',
          chassis_number: 'MB1AJEB2S00918231',
          vin: 'MB1AJEB2S00918231',
          engine_number: 'ENG-AL-88124',
          registration_date: '2022-08-10',
          year: 2022,
          class: 'HMV',
          color: 'Silver Grey',
          fuel_type: 'Diesel',
          fuel_tank_capacity: 300,
          fuel_calibration_type: 'Standard',
          overspeed_limit: 65,
          insurance_company: 'HDFC ERGO General Insurance',
          insurance_from: '2023-11-20',
          insurance_to: '2026-11-19',
          policy_number: 'POL-HDFC-99102',
          transporter: 'TMS Transporter',
          machine_owner: 'Godrej Logistics Corp'
        }));
        setIsDirty(true);
        setPrefillFeedback('VAHAN record matched! Prefilled 14 identity, settings & insurance fields.');
      } else {
        setPrefillFeedback('No sample VAHAN record found for this plate. Please complete the fields manually.');
      }
    }, 600);
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Section 1 Validations
    const reg = formData.registration_number?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!reg) {
      errors.registration_number = 'Registration number is mandatory.';
    } else {
      // Uniqueness within owning company/client
      const comp = formData.company || companyContext || 'Adani Port';
      const duplicate = existingVehicles.find(
        (v) =>
          v.id !== formData.id &&
          v.company.toLowerCase() === comp.toLowerCase() &&
          v.registration_number.replace(/[^A-Z0-9]/g, '') === reg
      );
      if (duplicate) {
        errors.registration_number = `Duplicate vehicle! Plate ${reg} is already registered under ${comp}.`;
      }
    }

    const machineModel = formData.machine_model || formData.model;
    if (!machineModel?.trim()) {
      errors.machine_model = 'Machine Model is mandatory.';
    }

    const chassis = formData.chassis_number || formData.vin;
    if (!chassis?.trim()) {
      errors.chassis_number = 'Chassis No. is mandatory.';
    }

    if (!formData.registration_date) {
      errors.registration_date = 'Registration Date is mandatory.';
    }

    if (formData.year !== undefined && formData.year !== '') {
      const yr = Number(formData.year);
      if (isNaN(yr) || yr < 1900 || yr > 2100) {
        errors.year = 'Year of Make must be a four-digit integer between 1900 and 2100.';
      }
    }

    // Section 2 Validations
    if (formData.overspeed_limit === undefined || formData.overspeed_limit === '' || isNaN(Number(formData.overspeed_limit)) || Number(formData.overspeed_limit) <= 0) {
      errors.overspeed_limit = 'Over Speed Limit is mandatory and must be greater than 0.';
    }

    if (formData.fuel_theft_limit === undefined || formData.fuel_theft_limit === '' || isNaN(Number(formData.fuel_theft_limit)) || Number(formData.fuel_theft_limit) < 0) {
      errors.fuel_theft_limit = 'Fuel Theft Limit is mandatory and must be 0 or greater.';
    }

    if (formData.fuel_refill === undefined || formData.fuel_refill === '' || isNaN(Number(formData.fuel_refill)) || Number(formData.fuel_refill) < 0) {
      errors.fuel_refill = 'Fuel Refill is mandatory and must be 0 or greater.';
    }

    if (!formData.fuel_calibration_type) {
      errors.fuel_calibration_type = 'Fuel Calibration Type is mandatory.';
    }

    if (!formData.fuel_type) {
      errors.fuel_type = 'Fuel Type is mandatory.';
    }

    // Section 3 Validations
    if (!formData.insurance_company?.trim()) {
      errors.insurance_company = 'Insurance Company is mandatory.';
    }

    if (!formData.insurance_from) {
      errors.insurance_from = 'Insurance From date is mandatory.';
    }

    if (!formData.insurance_to) {
      errors.insurance_to = 'Insurance To date is mandatory.';
    } else if (formData.insurance_from && formData.insurance_to < formData.insurance_from) {
      errors.insurance_to = 'Insurance To date must be on or after Insurance From date.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const machineModelVal = formData.machine_model || formData.model || 'Signa 5530';
    const chassisVal = formData.chassis_number || formData.vin || '';

    // Auto-generate name if blank
    let generatedName = formData.name?.trim();
    if (!generatedName) {
      const parts = [formData.year, formData.make, machineModelVal, formData.trim].filter(Boolean);
      generatedName = parts.length > 0 ? parts.join(' ') : formData.registration_number?.toUpperCase();
    }

    const assignedCompany = formData.company || companyContext || 'Adani Port';

    const payload: Vehicle = {
      id: formData.id || `veh-${Date.now()}`,
      public_id: formData.public_id || `VH-${Math.floor(100000 + Math.random() * 900000)}`,
      company: assignedCompany,
      registration_number: formData.registration_number!.trim().toUpperCase(),
      name: generatedName!,

      // Section 1 — Basic Vehicle Details
      vehicle_model_id: formData.vehicle_model_id || undefined,
      machine_model: machineModelVal,
      model: formData.model || machineModelVal,
      type: formData.type || selectedMasterModel?.vehicleType || 'Truck',
      vehicle_segment: formData.vehicle_segment || selectedMasterModel?.vehicleSegment,
      client: formData.client || assignedCompany,
      chassis_number: chassisVal,
      vin: chassisVal,
      registration_date: formData.registration_date,
      engine_number: formData.engine_number?.trim(),
      transporter: formData.transporter || transporterOptions[0]?.name || DEMO_LOOKUPS.transporters[0],
      transporterVendorId:
        formData.transporterVendorId ||
        resolveTransporterVendor(formData.transporter || transporterOptions[0]?.name)?.id,
      year: formData.year ? Number(formData.year) : undefined,
      machine_owner: formData.machine_owner?.trim(),
      active_status: formData.active_status !== undefined ? formData.active_status : true,

      // Section 2 — Vehicle & Operational Settings
      overspeed_limit: Number(formData.overspeed_limit ?? 60),
      fuel_theft_limit: Number(formData.fuel_theft_limit ?? 0),
      fuel_refill: Number(formData.fuel_refill ?? 0),
      fuel_calibration_type: formData.fuel_calibration_type || 'Standard',
      fuel_type: formData.fuel_type || 'Diesel',
      fuel_tank_capacity: formData.fuel_tank_capacity ? Number(formData.fuel_tank_capacity) : undefined,
      zone: formData.zone?.trim(),
      location: formData.location?.trim() || formData.client_location,
      mobile_number: formData.mobile_number?.trim(),
      packager_number: formData.packager_number?.trim(),

      // Section 3 — Insurance Details
      insurance_company: formData.insurance_company?.trim(),
      insurance_from: formData.insurance_from,
      insurance_to: formData.insurance_to,
      policy_number: formData.policy_number?.trim(),

      // Section 4 — Purchase & Warranty
      purchase_date: formData.purchase_date,
      warranty_from: formData.warranty_from,
      warranty_to: formData.warranty_to,
      extended_warranty_from: formData.extended_warranty_from,
      extended_warranty_to: formData.extended_warranty_to,

      // Section 5 — Documents & Verification
      aadhar_number: formData.aadhar_number?.trim(),
      aadhar_document: formData.aadhar_document || null,
      rc_document: formData.rc_document || null,
      upload_document: formData.upload_document || null,
      extended_warranty_document: formData.extended_warranty_document || null,

      // Section 6 — Additional Information
      internal_id: formData.internal_id?.trim(),
      make: formData.make?.trim() || 'Tata Motors',
      trim: formData.trim?.trim(),
      color: formData.color?.trim(),
      class: formData.class?.trim() || 'HMV',
      call_sign: formData.call_sign?.trim(),
      serial_number: formData.serial_number?.trim(),
      fuel_card_number: formData.fuel_card_number?.trim(),

      // Operational Status
      status: formData.active_status === false ? 'Inactive' : (formData.status || 'Available'),
      hub: formData.hub || DEMO_LOOKUPS.hubs[0],
      client_location: formData.location?.trim() || formData.client_location || '',
      vendor: formData.vendor || DEMO_LOOKUPS.vendors[0],
      driver: formData.driver || '',
      fleets: formData.fleets || [DEMO_LOOKUPS.fleets[0]],
      trailers: formData.trailers || [],
      skills: formData.skills || [],
      routes: formData.routes || [],
      sharing: formData.sharing || [],
      online: formData.online !== undefined ? formData.online : true,
      created_at: formData.created_at || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    onSaveVehicle(payload);
    onClose();
  };

  return (
    <div className={`fixed inset-0 ${zIndexClass} overflow-hidden flex justify-end font-sans`}>
      {/* Backdrop */}
      <div onClick={handleCloseAttempt} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" />

      {/* 940px Right Drawer */}
      <div className="relative w-[960px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {mode === 'create'
                  ? 'Add Vehicle'
                  : mode === 'edit'
                  ? 'Edit Vehicle'
                  : 'Vehicle Details'}
              </h2>
              {isReadOnly && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Read Only
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'create'
                ? `Organization: ${formData.company || companyContext || 'Adani Port'} · Enter details across sectioned categories`
                : `${formData.registration_number || '—'} · ${formData.machine_model || formData.model || 'Machine'} · ${formData.company || companyContext || 'Adani Port'}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isReadOnly && onSwitchToEdit && (
              <button
                type="button"
                onClick={onSwitchToEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Edit2 size={13} />
                Edit vehicle
              </button>
            )}
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Form Body Container — Continuous Long Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7">
          <div className="space-y-7">
              {/* VAHAN Prefill Helper Bar */}
              {!isReadOnly && (
                <div className="p-3 bg-orange-50/60 border border-orange-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={16} className="text-[#FA8A63] shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">VAHAN Sample Lookup</div>
                      <div className="text-[11px] text-slate-500">
                        Try sample registrations <code className="font-mono text-[#FA8A63] font-bold">MH12AB1234</code> or <code className="font-mono text-[#FA8A63] font-bold">RJ05GC0206</code> to auto-populate form.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={prefillLoading}
                    onClick={handlePrefillDetails}
                    className="px-3 py-1.5 bg-white border border-[#FA8A63] text-[#FA8A63] hover:bg-orange-50 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    {prefillLoading ? 'Checking...' : 'Prefill Details'}
                  </button>
                </div>
              )}

              {prefillFeedback && (
                <div className="text-xs font-semibold text-slate-700 bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>{prefillFeedback}</span>
                </div>
              )}

              {/* SECTION 1 — BASIC VEHICLE DETAILS (FIRST) */}
              <div className="space-y-3.5">
                <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#FA8A63]"></span>
                      Section 1 — Basic Vehicle Details
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Essential vehicle identity, model selection, registration and ownership
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Primary Identity
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                  {/* 1. Registration No. * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Registration No. <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Unique vehicle license plate number with state code. Mandatory; normalized to uppercase. Example: MH26AH1192." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. MH26AH1192"
                      value={formData.registration_number || ''}
                      onChange={(e) => updateField('registration_number', e.target.value.toUpperCase())}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs font-medium text-slate-900 focus:outline-none ${
                        fieldErrors.registration_number ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    {fieldErrors.registration_number && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.registration_number}</p>
                    )}
                  </div>

                  {/* 2. Vehicle Type (Optional Filter for Machine Model) */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Vehicle Type
                      <InfoTooltip content="Optional body classification filter that narrows active entries in Machine Model." />
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={modelTypeFilter}
                      onChange={(e) =>
                        handleModelFilterChange(e.target.value, modelSegmentFilter)
                      }
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <option value="All">All Vehicle Types</option>
                      {VEHICLE_TYPES.map((vt) => (
                        <option key={vt} value={vt}>
                          {vt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Machine Model * (Integrated with Vehicle Model Master) */}
                  <div className="space-y-1 col-span-2" ref={machineModelDropdownRef}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800 flex items-center">
                        Machine Model <span className="text-red-500 ml-0.5">*</span>
                        <InfoTooltip content="Fetches active models from Admin → Setup → Vehicle Model Master. Selecting a model links vehicle_model_id and prefills specs." />
                      </label>
                      {selectedMasterModel && (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={selectedMasterModel.icons.poll.previewUrl}
                            alt={selectedMasterModel.modelName}
                            className="w-4 h-4 object-contain"
                          />
                          <span className="text-[10px] font-mono font-semibold text-slate-500">
                            {selectedMasterModel.id}
                          </span>
                          {!selectedMasterModel.isActive && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                              Inactive (Preserved)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {isReadOnly ? (
                      <div className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-between">
                        <span>{formData.machine_model || formData.model || '—'}</span>
                        {selectedMasterModel && (
                          <span className="text-[10px] text-slate-500">
                            {selectedMasterModel.vehicleType} · {selectedMasterModel.vehicleSegment}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMachineModelMenuOpen((prev) => !prev)}
                          className={`w-full min-h-[34px] px-3 py-1.5 bg-white border rounded-lg text-xs flex items-center justify-between gap-2 focus:outline-none cursor-pointer ${
                            fieldErrors.machine_model
                              ? 'border-red-500'
                              : 'border-slate-300 hover:border-slate-400 focus:border-[#FA8A63]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {selectedMasterModel && (
                              <img
                                src={selectedMasterModel.icons.poll.previewUrl}
                                alt=""
                                className="w-5 h-5 object-contain shrink-0"
                              />
                            )}
                            <span
                              className={
                                formData.machine_model || formData.model
                                  ? 'text-slate-900 font-medium truncate'
                                  : 'text-slate-400'
                              }
                            >
                              {formData.machine_model ||
                                formData.model ||
                                '-- Select Machine Model from Vehicle Model Master --'}
                            </span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                              machineModelMenuOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {machineModelMenuOpen && (
                          <div className="absolute left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                            {/* Search + Segment filter strip */}
                            <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                              <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  autoFocus
                                  value={machineModelSearch}
                                  onChange={(e) => setMachineModelSearch(e.target.value)}
                                  placeholder="Search by manufacturer, model name, variant, ID..."
                                  className="w-full h-7 pl-8 pr-2 rounded-md border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                                />
                              </div>
                              <select
                                value={modelSegmentFilter}
                                onChange={(e) =>
                                  handleModelFilterChange(
                                    modelTypeFilter,
                                    e.target.value
                                  )
                                }
                                className="h-7 px-2 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-700 focus:outline-none focus:border-[#FA8A63]"
                              >
                                <option value="All">All Segments</option>
                                {ALL_VEHICLE_SEGMENTS.map((seg) => (
                                  <option key={seg} value={seg}>
                                    {seg}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
                              {selectedMasterModel && !selectedMasterModel.isActive && (
                                <div className="px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 mb-1">
                                  <div className="font-bold">
                                    Preserved Inactive Model: {formatVehicleModelLabel(selectedMasterModel)}
                                  </div>
                                  <div>
                                    This model was deactivated in Vehicle Model Master. Keep as-is or choose an active replacement below.
                                  </div>
                                </div>
                              )}

                              {filteredActiveModels.length === 0 ? (
                                <div className="py-6 px-4 text-center space-y-1">
                                  <div className="text-xs font-bold text-slate-700">
                                    No vehicle models found
                                  </div>
                                  <p className="text-[11px] text-slate-500">
                                    No active models match your current filter/search. Configure models in{' '}
                                    <span className="font-semibold text-[#FA8A63]">
                                      Admin → Setup → Vehicle Model Master
                                    </span>.
                                  </p>
                                </div>
                              ) : (
                                filteredActiveModels.map((m) => {
                                  const isSelected =
                                    formData.vehicle_model_id === m.id ||
                                    (!formData.vehicle_model_id &&
                                      (formData.machine_model || '').toLowerCase() ===
                                        formatVehicleModelLabel(m).toLowerCase());
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => handleSelectVehicleModel(m)}
                                      className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#FFF3EE] text-[#B85324] border border-[#FA8A63]/40'
                                          : 'hover:bg-slate-50 text-slate-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-md border border-slate-200 bg-white p-0.5 shrink-0 flex items-center justify-center">
                                          <img
                                            src={m.icons.poll.previewUrl}
                                            alt={m.modelName}
                                            className="w-full h-full object-contain"
                                          />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-xs font-semibold truncate">
                                            {formatVehicleModelLabel(m)}
                                          </div>
                                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                            <span className="font-mono">{m.id}</span>
                                            <span>·</span>
                                            <span>{m.vehicleType}</span>
                                            <span>·</span>
                                            <span>{m.vehicleSegment}</span>
                                            {m.fuelType && (
                                              <>
                                                <span>·</span>
                                                <span>{m.fuelType}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <Check className="w-4 h-4 text-[#FA8A63] shrink-0" />
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {modelCompatibilityNotice && (
                      <p className="text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        {modelCompatibilityNotice}
                      </p>
                    )}
                    {prefilledFromModelNotice && !modelCompatibilityNotice && (
                      <p className="text-[10px] text-emerald-700 font-medium">
                        {prefilledFromModelNotice}
                      </p>
                    )}
                    {fieldErrors.machine_model && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.machine_model}</p>
                    )}
                  </div>

                  {/* 4. Chassis No. * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Chassis No. <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Manufacturer chassis identification stamped on the physical frame. Mandatory. Example: MA3FJEB1S00654321." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. MA3FJEB1S00654321"
                      value={formData.chassis_number || formData.vin || ''}
                      onChange={(e) => {
                        updateField('chassis_number', e.target.value.toUpperCase());
                        updateField('vin', e.target.value.toUpperCase());
                      }}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        fieldErrors.chassis_number ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    {fieldErrors.chassis_number && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.chassis_number}</p>
                    )}
                  </div>

                  {/* 5. Registration Date * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Registration Date <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Official government registration date from the Registration Certificate (RC). Mandatory. Example: 2023-04-15." />
                    </label>
                    <input
                      type="date"
                      disabled={isReadOnly}
                      value={formData.registration_date || ''}
                      onChange={(e) => updateField('registration_date', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        fieldErrors.registration_date ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    {fieldErrors.registration_date && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.registration_date}</p>
                    )}
                  </div>

                  {/* 6. Engine No. */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Engine No.
                      <InfoTooltip content="Unique engine block serial number stamped by manufacturer. Example: ENG-TT-99401." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. ENG-TT-99401"
                      value={formData.engine_number || ''}
                      onChange={(e) => updateField('engine_number', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* 7. Transporter Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Transporter Name
                      <InfoTooltip content="Searchable select for contracted freight or logistics carrier. Example: Western Logistics." />
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={formData.transporter || transporterOptions[0]?.name || DEMO_LOOKUPS.transporters[0]}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        const matched = resolveTransporterVendor(selectedName);
                        setFormData(prev => ({
                          ...prev,
                          transporter: selectedName,
                          transporterVendorId: matched?.id,
                        }));
                        setIsDirty(true);
                      }}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    >
                      {transporterOptions.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.publicId ? `${t.name} (${t.publicId})` : t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 8. Year of Make */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Year of Make
                      <InfoTooltip content="Calendar year of original vehicle manufacture (1900–2100). Example: 2023." />
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      placeholder="e.g. 2023"
                      value={formData.year || ''}
                      onChange={(e) => updateField('year', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        fieldErrors.year ? 'border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    {fieldErrors.year && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.year}</p>
                    )}
                  </div>

                  {/* 9. Machine Owner */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Machine Owner
                      <InfoTooltip content="Legal owner or asset leaseholder title. Example: Adani Logistics Services." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. Adani Logistics Services"
                      value={formData.machine_owner || ''}
                      onChange={(e) => updateField('machine_owner', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* 10. Active Status */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Active Status
                      <InfoTooltip content="Toggles whether vehicle is active in the fleet operations directory." />
                    </label>
                    <div className="h-[30px] flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          checked={formData.active_status !== false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            updateField('active_status', val);
                            if (!val) {
                              updateField('status', 'Inactive');
                            } else if (formData.status === 'Inactive') {
                              updateField('status', 'Available');
                            }
                          }}
                          className="w-4 h-4 rounded text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer"
                        />
                        <span className="text-xs font-medium text-slate-700">
                          {formData.active_status !== false ? 'Active (Operational)' : 'Inactive (Suspended)'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2 — VEHICLE & OPERATIONAL SETTINGS */}
              <div className="space-y-3.5 pt-2">
                <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      Section 2 — Vehicle & Operational Settings
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Speed alerts, fuel thresholds, calibration mode, and operational zone
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Telematics & Limits
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                  {/* Over Speed Limit * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Over Speed Limit (km/h) <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Speed threshold in km/h triggering alert events. Mandatory; default is 60. Example: 60." />
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      placeholder="e.g. 60"
                      value={formData.overspeed_limit ?? 60}
                      onChange={(e) => updateField('overspeed_limit', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        fieldErrors.overspeed_limit ? 'border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    {fieldErrors.overspeed_limit && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.overspeed_limit}</p>
                    )}
                  </div>

                  {/* Fuel Theft Limit * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Fuel Theft Limit (L) <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Sudden drop threshold in litres triggering fuel theft alert. Mandatory; default 0. Example: 10." />
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      placeholder="e.g. 0"
                      value={formData.fuel_theft_limit ?? 0}
                      onChange={(e) => updateField('fuel_theft_limit', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        fieldErrors.fuel_theft_limit ? 'border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    {fieldErrors.fuel_theft_limit && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.fuel_theft_limit}</p>
                    )}
                  </div>

                  {/* Fuel Refill * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Fuel Refill (L) <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Minimum increase in litres triggering a recognized fuel fill event. Mandatory; default 0. Example: 20." />
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      placeholder="e.g. 0"
                      value={formData.fuel_refill ?? 0}
                      onChange={(e) => updateField('fuel_refill', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        fieldErrors.fuel_refill ? 'border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    {fieldErrors.fuel_refill && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.fuel_refill}</p>
                    )}
                  </div>

                  {/* Fuel Calibration Type * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Fuel Calibration Type <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Sensor calculation profile applied to the tank shape. Mandatory. Example: Linear." />
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={formData.fuel_calibration_type || 'Standard'}
                      onChange={(e) => updateField('fuel_calibration_type', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        fieldErrors.fuel_calibration_type ? 'border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    >
                      {DEMO_LOOKUPS.fuelCalibrationTypes.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.fuel_calibration_type && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.fuel_calibration_type}</p>
                    )}
                  </div>

                  {/* Fuel Type * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Fuel Type <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Primary fuel or energy source. Mandatory. Example: Diesel." />
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={formData.fuel_type || 'Diesel'}
                      onChange={(e) => updateField('fuel_type', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        fieldErrors.fuel_type ? 'border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    >
                      {DEMO_LOOKUPS.fuelTypes.map((ft) => (
                        <option key={ft} value={ft}>
                          {ft}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.fuel_type && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.fuel_type}</p>
                    )}
                  </div>

                  {/* Fuel Tank Capacity */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Fuel Tank Capacity (L)
                      <InfoTooltip content="Total fuel storage tank capacity in litres. Example: 360 L." />
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      placeholder="e.g. 360"
                      value={formData.fuel_tank_capacity || ''}
                      onChange={(e) => updateField('fuel_tank_capacity', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* Zone */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Zone
                      <InfoTooltip content="Operational geographical zone or cluster assignment. Example: West Zone." />
                    </label>
                    <input
                      type="text"
                      list="zones-list"
                      disabled={isReadOnly}
                      placeholder="e.g. West Zone"
                      value={formData.zone || ''}
                      onChange={(e) => updateField('zone', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                    <datalist id="zones-list">
                      {DEMO_LOOKUPS.zones.map((z) => (
                        <option key={z} value={z} />
                      ))}
                    </datalist>
                  </div>

                  {/* Mobile No. */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Mobile No.
                      <InfoTooltip content="In-vehicle phone contact or operational driver cellular number. Example: +91 98200 12345." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. +91 98200 12345"
                      value={formData.mobile_number || ''}
                      onChange={(e) => updateField('mobile_number', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* Packager Number */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Packager Number
                      <InfoTooltip content="Consignment packaging batch code or terminal device packager ID. Example: PKG-9921." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. PKG-9921"
                      value={formData.packager_number || ''}
                      onChange={(e) => updateField('packager_number', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3 — INSURANCE DETAILS */}
              <div className="space-y-3.5 pt-2">
                <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Section 3 — Insurance Details
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Commercial motor insurance provider, validity window, and certificate number
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Compliance & Coverage
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                  {/* Insurance Company * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Insurance Company <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Underwriting commercial insurance firm. Mandatory. Example: ICICI Lombard." />
                    </label>
                    <input
                      type="text"
                      list="insurance-companies-list"
                      disabled={isReadOnly}
                      placeholder="Select or enter insurance provider..."
                      value={formData.insurance_company || ''}
                      onChange={(e) => updateField('insurance_company', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        fieldErrors.insurance_company ? 'border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    <datalist id="insurance-companies-list">
                      {DEMO_LOOKUPS.insuranceCompanies.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    {fieldErrors.insurance_company && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.insurance_company}</p>
                    )}
                  </div>

                  {/* Policy No. */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Policy No.
                      <InfoTooltip content="Unique policy reference identification number. Example: POL-ICICI-49201." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. POL-ICICI-49201"
                      value={formData.policy_number || ''}
                      onChange={(e) => updateField('policy_number', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* Insurance From * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Insurance From <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Inception or policy start date. Mandatory. Example: 2024-01-15." />
                    </label>
                    <input
                      type="date"
                      disabled={isReadOnly}
                      value={formData.insurance_from || ''}
                      onChange={(e) => updateField('insurance_from', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        fieldErrors.insurance_from ? 'border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    {fieldErrors.insurance_from && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.insurance_from}</p>
                    )}
                  </div>

                  {/* Insurance To * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Insurance To <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Policy expiration date. Mandatory; must be on or after Insurance From date. Example: 2027-01-15." />
                    </label>
                    <input
                      type="date"
                      disabled={isReadOnly}
                      value={formData.insurance_to || ''}
                      onChange={(e) => updateField('insurance_to', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        fieldErrors.insurance_to ? 'border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    {fieldErrors.insurance_to && (
                      <p className="text-[10px] text-red-500 font-semibold">{fieldErrors.insurance_to}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 4 — PURCHASE & WARRANTY */}
              <div className="space-y-3.5 pt-2">
                <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      Section 4 — Purchase & Warranty
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Invoicing date, standard manufacturer warranty, and extended coverage
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Procurement & OEM
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                  {/* Purchase Date */}
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Purchase Date
                      <InfoTooltip content="Official invoice acquisition date of the vehicle. Example: 2023-03-20." />
                    </label>
                    <input
                      type="date"
                      disabled={isReadOnly}
                      value={formData.purchase_date || ''}
                      onChange={(e) => updateField('purchase_date', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  <div className="hidden sm:block"></div>

                  {/* Warranty From & To */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Warranty From
                      <InfoTooltip content="Start date of factory warranty coverage. Example: 2023-03-20." />
                    </label>
                    <input
                      type="date"
                      disabled={isReadOnly}
                      value={formData.warranty_from || ''}
                      onChange={(e) => updateField('warranty_from', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Warranty To
                      <InfoTooltip content="Expiry date of factory warranty coverage. Example: 2026-03-19." />
                    </label>
                    <input
                      type="date"
                      disabled={isReadOnly}
                      value={formData.warranty_to || ''}
                      onChange={(e) => updateField('warranty_to', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* Extended Warranty From & To */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Extended Warranty From
                      <InfoTooltip content="Start date of extended dealer or third-party warranty. Example: 2026-03-20." />
                    </label>
                    <input
                      type="date"
                      disabled={isReadOnly}
                      value={formData.extended_warranty_from || ''}
                      onChange={(e) => updateField('extended_warranty_from', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Extended Warranty To
                      <InfoTooltip content="Expiry date of extended warranty. Example: 2028-03-19." />
                    </label>
                    <input
                      type="date"
                      disabled={isReadOnly}
                      value={formData.extended_warranty_to || ''}
                      onChange={(e) => updateField('extended_warranty_to', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5 — DOCUMENTS & VERIFICATION */}
              <div className="space-y-3.5 pt-2">
                <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Section 5 — Documents & Verification
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Identity cards, registration certificate upload, and policy schedules
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Attachments (≤ 3MB)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                  {/* Aadhar Number */}
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Aadhar Number
                      <InfoTooltip content="12-digit owner or registered operator Aadhar card identifier. Example: 8839 2019 4481." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. 8839 2019 4481"
                      value={formData.aadhar_number || ''}
                      onChange={(e) => updateField('aadhar_number', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* Aadhar Document */}
                  <DocumentUploadField
                    label="Aadhar Document"
                    tooltip="Scanned document file of owner/driver Aadhar card. Max 3MB."
                    document={formData.aadhar_document}
                    onChange={(doc) => updateField('aadhar_document', doc)}
                    disabled={isReadOnly}
                  />

                  {/* RC Document */}
                  <DocumentUploadField
                    label="RC Document"
                    tooltip="Official Registration Certificate document or smart card image. Max 3MB."
                    document={formData.rc_document}
                    onChange={(doc) => updateField('rc_document', doc)}
                    disabled={isReadOnly}
                  />

                  {/* Upload Document */}
                  <DocumentUploadField
                    label="Upload Document"
                    tooltip="General compliance or vehicle fitness document file. Max 3MB."
                    document={formData.upload_document}
                    onChange={(doc) => updateField('upload_document', doc)}
                    disabled={isReadOnly}
                  />

                  {/* Extended Warranty Document */}
                  <DocumentUploadField
                    label="Ext. Warranty Document"
                    tooltip="Warranty extension contract or dealer confirmation document. Max 3MB."
                    document={formData.extended_warranty_document}
                    onChange={(doc) => updateField('extended_warranty_document', doc)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              {/* SECTION 6 — ADDITIONAL INFORMATION */}
              <div className="space-y-3.5 pt-2">
                <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Section 6 — Additional Information
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Supplementary specifications, internal identifiers, and operational telemetry attributes
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Specifications
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                  {/* Vehicle Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Vehicle Name
                      <InfoTooltip content="Descriptive display name; auto-generated if left blank. Example: Tata Signa 5530." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. Tata Signa 5530"
                      value={formData.name || ''}
                      onChange={(e) => updateField('name', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* Make */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Make / Manufacturer
                      <InfoTooltip content="Vehicle manufacturer brand. Example: Tata Motors." />
                    </label>
                    <input
                      type="text"
                      list="makes-list"
                      disabled={isReadOnly}
                      placeholder="e.g. Tata Motors"
                      value={formData.make || ''}
                      onChange={(e) => updateField('make', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                    <datalist id="makes-list">
                      {DEMO_LOOKUPS.makes.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>

                  {/* Internal ID */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Internal ID
                      <InfoTooltip content="Customer internal enterprise reference. Example: TRK-0019." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. TRK-0019"
                      value={formData.internal_id || ''}
                      onChange={(e) => updateField('internal_id', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* Asset Type / Class */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Asset Type / Class
                      <InfoTooltip content="Vehicle statutory category. Example: HMV or LCV." />
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={formData.class || 'HMV'}
                      onChange={(e) => updateField('class', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    >
                      {DEMO_LOOKUPS.vehicleClasses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Trim */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Trim / Variant
                      <InfoTooltip content="Optional body variant or cabin grade. Example: LXI or Standard." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. LXI"
                      value={formData.trim || ''}
                      onChange={(e) => updateField('trim', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* Color */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Color
                      <InfoTooltip content="Exterior body paint colour. Example: Pure White." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. Pure White"
                      value={formData.color || ''}
                      onChange={(e) => updateField('color', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* Call Sign */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Call Sign
                      <InfoTooltip content="Radio or terminal dispatch shorthand identifier. Example: CT2-HAUL-01." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. CT2-HAUL-01"
                      value={formData.call_sign || ''}
                      onChange={(e) => updateField('call_sign', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* Serial Number */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Serial Number
                      <InfoTooltip content="Manufacturer equipment serial number. Example: SER-99402." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. SER-99402"
                      value={formData.serial_number || ''}
                      onChange={(e) => updateField('serial_number', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  {/* Fuel Card Number */}
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Fuel Card Number
                      <InfoTooltip content="Fleet corporate fuel payment card number. Example: FC-99210-A." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. FC-99210-A"
                      value={formData.fuel_card_number || ''}
                      onChange={(e) => updateField('fuel_card_number', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] ${
                        isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 7 — VEHICLE SKILLS */}
              <div className="space-y-3.5 pt-2 pb-4">
                <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      Section 7 — Vehicle Skills
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Assign operational capabilities, cargo certifications, and specialized vehicle equipment tags
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Multi-select
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Vehicle Skills (Multi-select)
                    <InfoTooltip content="Select one or more operational skills or cargo certifications for this vehicle (e.g. Reefer, Cold Chain, Heavy Duty)." />
                  </label>

                  {isReadOnly ? (
                    <div className="flex flex-wrap gap-1.5 py-1">
                      {(formData.skills || []).length > 0 ? (
                        (formData.skills || []).map((skill) => (
                          <span
                            key={skill}
                            className="px-2.5 py-1 rounded-md bg-[#FFF3EE] text-[#B85324] border border-[#FA8A63]/40 text-xs font-semibold"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No vehicle skills assigned</span>
                      )}
                    </div>
                  ) : (
                    <div ref={skillsDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setSkillsMenuOpen((prev) => !prev)}
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 flex items-center justify-between gap-2 hover:border-slate-400 focus:outline-none focus:border-[#FA8A63] cursor-pointer"
                      >
                        <div className="flex flex-wrap items-center gap-1.5 flex-1 text-left">
                          {(formData.skills || []).length === 0 ? (
                            <span className="text-slate-400">
                              -- Select Vehicle Skills (Reefer, Cold Chain, Heavy Duty...) --
                            </span>
                          ) : (
                            (formData.skills || []).map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFF3EE] text-[#B85324] border border-[#FA8A63]/40 text-[11px] font-semibold"
                              >
                                <span>{skill}</span>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateField(
                                      'skills',
                                      (formData.skills || []).filter((s) => s !== skill)
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      updateField(
                                        'skills',
                                        (formData.skills || []).filter((s) => s !== skill)
                                      );
                                    }
                                  }}
                                  className="text-[#B85324] hover:text-slate-900 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </span>
                              </span>
                            ))
                          )}
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                            skillsMenuOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {skillsMenuOpen && (
                        <div className="absolute left-0 right-0 bottom-full mb-1.5 rounded-lg border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                          <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50/70">
                            <div className="relative flex-1">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={skillsSearch}
                                onChange={(e) => setSkillsSearch(e.target.value)}
                                placeholder="Search or add custom vehicle skill..."
                                className="w-full h-7 pl-7 pr-2 rounded border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                              />
                            </div>
                            {(formData.skills || []).length > 0 && (
                              <button
                                type="button"
                                onClick={() => updateField('skills', [])}
                                className="text-[11px] font-semibold text-rose-600 hover:underline px-1.5 cursor-pointer shrink-0"
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          <div className="max-h-56 overflow-y-auto p-1.5 grid grid-cols-2 gap-1">
                            {(() => {
                              const allSkillOptions = Array.from(
                                new Set([
                                  ...DEMO_LOOKUPS.vehicleSkills,
                                  ...customVehicleSkills,
                                  ...(formData.skills || [])
                                ])
                              );
                              const q = skillsSearch.trim().toLowerCase();
                              const normalizedQ = q === 'refer' ? 'reefer' : q;
                              const filteredSkills = allSkillOptions.filter((opt) => {
                                const lower = opt.toLowerCase();
                                return (
                                  !q ||
                                  lower.includes(q) ||
                                  (normalizedQ !== q && lower.includes(normalizedQ))
                                );
                              });
                              const selectedSkills = formData.skills || [];
                              const hasExactMatch = allSkillOptions.some(
                                (opt) => opt.toLowerCase() === q
                              );

                              return (
                                <>
                                  {filteredSkills.map((skillOpt) => {
                                    const checked = selectedSkills.includes(skillOpt);
                                    return (
                                      <button
                                        key={skillOpt}
                                        type="button"
                                        onClick={() => {
                                          const nextSkills = checked
                                            ? selectedSkills.filter((s) => s !== skillOpt)
                                            : [...selectedSkills, skillOpt];
                                          updateField('skills', nextSkills);
                                        }}
                                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                                          checked
                                            ? 'bg-[#FFF3EE] text-[#B85324] font-semibold'
                                            : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        <span className="truncate">{skillOpt}</span>
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

                                  {skillsSearch.trim() && !hasExactMatch && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const customVal = skillsSearch.trim();
                                        setCustomVehicleSkills(saveCustomVehicleSkill(customVal));
                                        const curr = formData.skills || [];
                                        if (!curr.some((s) => s.toLowerCase() === customVal.toLowerCase())) {
                                          updateField('skills', [...curr, customVal]);
                                        }
                                        setSkillsSearch('');
                                      }}
                                      className="col-span-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-orange-50 text-[#B85324] hover:bg-orange-100 text-xs font-semibold cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>+ Add custom skill "{skillsSearch.trim()}"</span>
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          <div className="border-t border-slate-100 p-1.5 bg-slate-50/70">
                            {!showCustomSkillInput ? (
                              <button
                                type="button"
                                onClick={() => setShowCustomSkillInput(true)}
                                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold text-[#B85324] hover:bg-orange-50 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Custom / Other Skill</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  autoFocus
                                  value={customSkillText}
                                  onChange={(e) => setCustomSkillText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && customSkillText.trim()) {
                                      e.preventDefault();
                                      const customVal = customSkillText.trim();
                                      setCustomVehicleSkills(saveCustomVehicleSkill(customVal));
                                      const curr = formData.skills || [];
                                      if (!curr.some((s) => s.toLowerCase() === customVal.toLowerCase())) {
                                        updateField('skills', [...curr, customVal]);
                                      }
                                      setCustomSkillText('');
                                      setShowCustomSkillInput(false);
                                    }
                                  }}
                                  placeholder="Enter custom vehicle skill..."
                                  className="flex-1 h-7 px-2 rounded border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:border-[#FA8A63]"
                                />
                                <button
                                  type="button"
                                  disabled={!customSkillText.trim()}
                                  onClick={() => {
                                    const customVal = customSkillText.trim();
                                    if (!customVal) return;
                                    setCustomVehicleSkills(saveCustomVehicleSkill(customVal));
                                    const curr = formData.skills || [];
                                    if (!curr.some((s) => s.toLowerCase() === customVal.toLowerCase())) {
                                      updateField('skills', [...curr, customVal]);
                                    }
                                    setCustomSkillText('');
                                    setShowCustomSkillInput(false);
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
            </div>
        </div>

        {/* Drawer Fixed Sticky Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {isReadOnly ? 'Viewing vehicle details' : isDirty ? 'Unsaved changes pending' : 'All changes saved'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {mode === 'create' ? 'Save Vehicle' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Discard Confirmation Modal */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-6 z-40">
            <div className="bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full space-y-3 border border-slate-200">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <AlertCircle size={18} />
                <span>Discard unsaved changes?</span>
              </div>
              <p className="text-xs text-slate-600">
                You have unsaved changes in this vehicle record. Closing will discard all current inputs.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
                >
                  Discard changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
