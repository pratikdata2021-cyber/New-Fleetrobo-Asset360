import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Truck,
  Users,
  Search,
  Check,
  ShieldAlert,
  Clock,
  Layers,
  Edit2
} from 'lucide-react';
import {
  Fleet,
  FleetStatus,
  FLEET_STATUSES,
  FLEET_LOOKUPS,
  computeFleetCounts,
  isDescendantOrSelf
} from '../types/fleet';
import { INITIAL_DEMO_DRIVERS, Driver } from '../types/driver';
import { INITIAL_VEHICLES, Vehicle } from '../types/vehicle';
import { InfoTooltip } from './InfoTooltip';

interface FleetDrawerProps {
  isOpen: boolean;
  mode: 'create' | 'view' | 'edit';
  initialFleet: Fleet | null;
  allFleets: Fleet[];
  initialTab?: 'overview' | 'drivers' | 'vehicles';
  onClose: () => void;
  onSaveFleet: (fleet: Fleet) => void;
  onSwitchToEdit?: () => void;
  zIndexClass?: string;
}

export const FleetDrawer: React.FC<FleetDrawerProps> = ({
  isOpen,
  mode,
  initialFleet,
  allFleets,
  initialTab = 'overview',
  onClose,
  onSaveFleet,
  onSwitchToEdit,
  zIndexClass = 'z-50'
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'vehicles'>('overview');

  // Form draft state
  const [formData, setFormData] = useState<Partial<Fleet>>({
    name: '',
    status: 'active',
    task: '',
    parent: '',
    service_area: '',
    zone: '',
    vendor: '',
    driverIds: [],
    vehicleIds: [],
    driverVehicleAssignments: {}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Modals inside tabs
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [selectedDriverModalIds, setSelectedDriverModalIds] = useState<Set<string>>(new Set());

  const [isAssignVehicleOpen, setIsAssignVehicleOpen] = useState(false);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [selectedVehicleModalIds, setSelectedVehicleModalIds] = useState<Set<string>>(new Set());

  const [driverToRemove, setDriverToRemove] = useState<string | null>(null);
  const [vehicleToRemove, setVehicleToRemove] = useState<string | null>(null);

  // Initialize draft when drawer opens or initialFleet changes
  useEffect(() => {
    if (initialFleet && (mode === 'edit' || mode === 'view')) {
      setFormData({
        ...initialFleet,
        driverIds: [...(initialFleet.driverIds || [])],
        vehicleIds: [...(initialFleet.vehicleIds || [])],
        driverVehicleAssignments: { ...(initialFleet.driverVehicleAssignments || {}) }
      });
    } else {
      setFormData({
        name: '',
        company: 'Adani Port',
        status: 'active',
        task: '',
        parent: '',
        service_area: '',
        zone: '',
        vendor: '',
        driverIds: [],
        vehicleIds: [],
        driverVehicleAssignments: {}
      });
    }
    setActiveTab(initialTab || 'overview');
    setErrors({});
    setIsDirty(false);
    setShowDiscardConfirm(false);
  }, [initialFleet, mode, isOpen, initialTab]);

  // Available Zones based on selected Service Area
  const availableZones = useMemo(() => {
    if (!formData.service_area) return [];
    return FLEET_LOOKUPS.serviceAreaZones[formData.service_area] || [];
  }, [formData.service_area]);

  // Eligible Parents: excluding self and any of self's descendants
  const eligibleParents = useMemo(() => {
    return allFleets.filter((f) => {
      if (formData.id && isDescendantOrSelf(formData.id, f.id, allFleets)) {
        return false;
      }
      return true;
    });
  }, [allFleets, formData.id]);

  // Eligible Drivers for assignment modal
  const eligibleDrivers = useMemo(() => {
    const currentAssigned = new Set(formData.driverIds || []);
    const q = driverSearchQuery.toLowerCase().trim();
    return INITIAL_DEMO_DRIVERS.filter((d) => {
      if (currentAssigned.has(d.id)) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.licence.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q)
      );
    });
  }, [formData.driverIds, driverSearchQuery]);

  // Eligible Vehicles for assignment modal
  const eligibleVehicles = useMemo(() => {
    const currentAssigned = new Set(formData.vehicleIds || []);
    const q = vehicleSearchQuery.toLowerCase().trim();
    return INITIAL_VEHICLES.filter((v) => {
      if (currentAssigned.has(v.id)) return false;
      if (!q) return true;
      return (
        v.registration_number.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        (v.make && v.make.toLowerCase().includes(q))
      );
    });
  }, [formData.vehicleIds, vehicleSearchQuery]);

  // Direct Driver Member Objects
  const memberDrivers = useMemo(() => {
    const ids = new Set(formData.driverIds || []);
    return INITIAL_DEMO_DRIVERS.filter((d) => ids.has(d.id));
  }, [formData.driverIds]);

  // Direct Vehicle Member Objects
  const memberVehicles = useMemo(() => {
    const ids = new Set(formData.vehicleIds || []);
    return INITIAL_VEHICLES.filter((v) => ids.has(v.id));
  }, [formData.vehicleIds]);

  // Summary counts for read-only view
  const summaryCounts = useMemo(() => {
    return computeFleetCounts(formData as Fleet);
  }, [formData]);

  const updateField = (key: keyof Fleet, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      // If service area changes, clear incompatible zone
      if (key === 'service_area') {
        const validZones = FLEET_LOOKUPS.serviceAreaZones[value] || [];
        if (next.zone && !validZones.includes(next.zone)) {
          next.zone = '';
        }
      }
      return next;
    });
    setIsDirty(true);
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Close attempt handler guarding dirty state
  const handleCloseAttempt = () => {
    if (isDirty && mode !== 'view') {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Assign Driver Modal Handlers
  const handleConfirmAssignDrivers = () => {
    if (selectedDriverModalIds.size === 0) return;
    const nextDriverIds = [...(formData.driverIds || []), ...Array.from(selectedDriverModalIds)];
    setFormData((prev) => ({ ...prev, driverIds: nextDriverIds }));
    setIsDirty(true);
    setSelectedDriverModalIds(new Set());
    setIsAssignDriverOpen(false);
  };

  // Remove Driver Handler (cleans dependent local assignments)
  const handleConfirmRemoveDriver = () => {
    if (!driverToRemove) return;
    const nextDriverIds = (formData.driverIds || []).filter((id) => id !== driverToRemove);
    const nextAssignments = { ...(formData.driverVehicleAssignments || {}) };
    Object.keys(nextAssignments).forEach((vehId) => {
      if (nextAssignments[vehId] === driverToRemove) {
        delete nextAssignments[vehId];
      }
    });
    setFormData((prev) => ({
      ...prev,
      driverIds: nextDriverIds,
      driverVehicleAssignments: nextAssignments
    }));
    setIsDirty(true);
    setDriverToRemove(null);
  };

  // Assign Vehicle Modal Handlers
  const handleConfirmAssignVehicles = () => {
    if (selectedVehicleModalIds.size === 0) return;
    const nextVehicleIds = [...(formData.vehicleIds || []), ...Array.from(selectedVehicleModalIds)];
    setFormData((prev) => ({ ...prev, vehicleIds: nextVehicleIds }));
    setIsDirty(true);
    setSelectedVehicleModalIds(new Set());
    setIsAssignVehicleOpen(false);
  };

  // Remove Vehicle Handler (cleans vehicle assignment)
  const handleConfirmRemoveVehicle = () => {
    if (!vehicleToRemove) return;
    const nextVehicleIds = (formData.vehicleIds || []).filter((id) => id !== vehicleToRemove);
    const nextAssignments = { ...(formData.driverVehicleAssignments || {}) };
    delete nextAssignments[vehicleToRemove];
    setFormData((prev) => ({
      ...prev,
      vehicleIds: nextVehicleIds,
      driverVehicleAssignments: nextAssignments
    }));
    setIsDirty(true);
    setVehicleToRemove(null);
  };

  // Driver-Vehicle Allocation Change Handler
  const handleVehicleDriverChange = (vehicleId: string, driverId: string) => {
    if (!driverId) {
      // Unassigned
      const nextAssignments = { ...(formData.driverVehicleAssignments || {}) };
      delete nextAssignments[vehicleId];
      setFormData((prev) => ({ ...prev, driverVehicleAssignments: nextAssignments }));
      setIsDirty(true);
      return;
    }

    // Check duplicate assignment within this Fleet: driver cannot be allocated to two vehicles
    const currentAssignments = formData.driverVehicleAssignments || {};
    const alreadyAllocatedVehicle = Object.keys(currentAssignments).find(
      (vId) => vId !== vehicleId && currentAssignments[vId] === driverId
    );
    if (alreadyAllocatedVehicle) {
      alert('Driver already assigned to another Fleet Vehicle.');
      return;
    }

    // Cross-fleet conflict check: check other fleets where this driver is assigned to a DIFFERENT vehicle
    const otherFleetsWithConflict = allFleets.filter((f) => {
      if (formData.id && f.id === formData.id) return false;
      const assignments = f.driverVehicleAssignments || {};
      return Object.entries(assignments).some(
        ([vId, dId]) => dId === driverId && vId !== vehicleId
      );
    });

    if (otherFleetsWithConflict.length > 0) {
      alert(
        `Driver has a conflicting assignment in another Fleet (${otherFleetsWithConflict[0].name}). One driver cannot be assigned to different vehicles simultaneously.`
      );
      return;
    }

    const nextAssignments = { ...currentAssignments, [vehicleId]: driverId };
    setFormData((prev) => ({ ...prev, driverVehicleAssignments: nextAssignments }));
    setIsDirty(true);
  };

  // Form Submission Validation
  const handleSave = () => {
    const errs: Record<string, string> = {};

    const trimmedName = formData.name?.trim() || '';
    if (!trimmedName) {
      errs.name = 'Fleet Name is required';
    } else if (trimmedName.length > 191) {
      errs.name = 'Fleet Name exceeds 191 characters';
    }

    if (formData.task && formData.task.length > 191) {
      errs.task = 'Task / Mission must be 191 characters or fewer';
    }

    // Parent cycle check
    if (formData.id && formData.parent) {
      if (isDescendantOrSelf(formData.id, formData.parent, allFleets)) {
        errs.parent = 'A fleet cannot become its own parent or descendant';
      }
    }

    // Zone constraint check
    if (formData.zone && formData.service_area) {
      const validZones = FLEET_LOOKUPS.serviceAreaZones[formData.service_area] || [];
      if (!validZones.includes(formData.zone)) {
        errs.zone = 'Selected zone must belong to the selected service area';
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setActiveTab('overview');
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const savedRecord: Fleet = {
      id: formData.id || `flt-${Date.now()}`,
      public_id: formData.public_id || `FLT-${Math.floor(1000 + Math.random() * 9000)}`,
      name: trimmedName,
      company: formData.company || 'Adani Port',
      parent: formData.parent || '',
      service_area: formData.service_area || '',
      zone: formData.zone || '',
      vendor: formData.vendor || '',
      status: formData.status || 'active',
      task: formData.task || '',
      driverIds: formData.driverIds || [],
      vehicleIds: formData.vehicleIds || [],
      driverVehicleAssignments: formData.driverVehicleAssignments || {},
      created_at: formData.created_at || nowStr,
      updated_at: nowStr
    };

    onSaveFleet(savedRecord);
    setIsDirty(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${zIndexClass} overflow-hidden flex justify-end animate-in fade-in duration-150`}>
      {/* Backdrop */}
      <div
        onClick={handleCloseAttempt}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Container (940px wide max) */}
      <div className="relative w-full max-w-[940px] bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 z-10 font-sans">
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-[#FA8A63] flex items-center justify-center font-bold text-sm">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {mode === 'create'
                    ? 'Create a new fleet'
                    : mode === 'view'
                    ? 'Fleet details'
                    : 'Edit fleet'}
                </h2>
                {formData.public_id && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                    {formData.public_id}
                  </span>
                )}
                {formData.status && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      FLEET_STATUSES.find((s) => s.code === formData.status)?.badgeClass
                    }`}
                  >
                    {FLEET_STATUSES.find((s) => s.code === formData.status)?.label || formData.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {formData.name || 'Adani Port · Fleet Resource'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'view' && onSwitchToEdit && (
              <button
                type="button"
                onClick={onSwitchToEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                <Edit2 size={13} className="text-slate-500" />
                <span>Edit fleet</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 3 Internal Form Tabs */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center gap-8 shrink-0">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'drivers', label: 'Drivers', count: formData.driverIds?.length || 0 },
            { id: 'vehicles', label: 'Vehicles', count: formData.vehicleIds?.length || 0 }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer relative ${
                  isActive
                    ? 'border-[#FA8A63] text-[#FA8A63]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-orange-100 text-[#FA8A63]' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Context helper notice */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
                <InfoTooltip
                  content="Fleet groupings organize resources under operational units. Company is inherited from the current workspace. Member drivers and vehicles are managed in separate tabs."
                />
                <span>
                  Create and maintain a fleet grouping. Company is inherited from the current workspace (<strong className="font-semibold text-blue-950">Adani Port</strong>). Assigned members are managed in separate tabs.
                </span>
              </div>

              {/* Section 1: Fleet identity & operations */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Fleet identity & operations</h3>
                  <p className="text-xs text-slate-500">Primary name, status and descriptive mission</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Fleet Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Fleet Name</span>
                      <span className="text-red-500">*</span>
                      <InfoTooltip content="Required fleet grouping name; public API max 191 characters." />
                    </label>
                    <input
                      type="text"
                      disabled={mode === 'view'}
                      value={formData.name || ''}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="e.g. Adani Mundra Operations"
                      className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none transition-colors ${
                        errors.name
                          ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                          : 'border-slate-200 focus:border-[#FA8A63]'
                      } disabled:bg-slate-50 disabled:text-slate-600`}
                    />
                    {errors.name && <p className="text-[11px] text-red-600 font-medium">{errors.name}</p>}
                  </div>

                  {/* Fleet Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Fleet Status</span>
                      <InfoTooltip content="Status is an operational label, not a device online state." />
                    </label>
                    <select
                      disabled={mode === 'view'}
                      value={formData.status || 'active'}
                      onChange={(e) => updateField('status', e.target.value as FleetStatus)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#FA8A63] disabled:bg-slate-50"
                    >
                      {FLEET_STATUSES.map((st) => (
                        <option key={st.code} value={st.code}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Parent Fleet (Proposed repair: documented visible hierarchy selector) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Parent Fleet</span>
                      <InfoTooltip content="One immediate parent. A child does not inherit parent membership or access automatically." />
                    </label>
                    <select
                      disabled={mode === 'view'}
                      value={formData.parent || ''}
                      onChange={(e) => updateField('parent', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none transition-colors ${
                        errors.parent
                          ? 'border-red-400 bg-red-50/30'
                          : 'border-slate-200 focus:border-[#FA8A63]'
                      } disabled:bg-slate-50`}
                    >
                      <option value="">None / Not assigned (Root Fleet)</option>
                      {eligibleParents.map((pf) => (
                        <option key={pf.id} value={pf.id}>
                          {pf.name} ({pf.public_id})
                        </option>
                      ))}
                    </select>
                    {errors.parent && (
                      <p className="text-[11px] text-red-600 font-medium">{errors.parent}</p>
                    )}
                  </div>

                  {/* Task / Mission */}
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Task / Mission</span>
                      <InfoTooltip content="Descriptive mission only; not an order, route or Orchestrator job." />
                    </label>
                    <textarea
                      disabled={mode === 'view'}
                      rows={2}
                      value={formData.task || ''}
                      onChange={(e) => updateField('task', e.target.value)}
                      placeholder="e.g. Primary dock container movement and berthing logistics..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#FA8A63] disabled:bg-slate-50"
                    />
                    {errors.task && <p className="text-[11px] text-red-600 font-medium">{errors.task}</p>}
                  </div>
                </div>
              </div>

              {/* Section 2: Operating area */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Operating area</h3>
                  <p className="text-xs text-slate-500">Service area, scoped zone and independent vendor relationship</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Service Area */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Service Area</span>
                      <InfoTooltip content="Optional operational coverage; does not enforce a geofence." />
                    </label>
                    <select
                      disabled={mode === 'view'}
                      value={formData.service_area || ''}
                      onChange={(e) => updateField('service_area', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#FA8A63] disabled:bg-slate-50"
                    >
                      <option value="">None / Not assigned</option>
                      {FLEET_LOOKUPS.serviceAreas.map((sa) => (
                        <option key={sa} value={sa}>
                          {sa}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Zone (Disabled until Service Area selected) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Zone</span>
                      <InfoTooltip content="Only zones associated with the selected service area are offered." />
                    </label>
                    <select
                      disabled={mode === 'view' || !formData.service_area}
                      value={formData.zone || ''}
                      onChange={(e) => updateField('zone', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#FA8A63] disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">
                        {!formData.service_area ? 'Select Service Area first' : 'None / Not assigned'}
                      </option>
                      {availableZones.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vendor */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Vendor</span>
                      <InfoTooltip content="A vendor relationship is separate from fleet ownership or transporter mapping." />
                    </label>
                    <select
                      disabled={mode === 'view'}
                      value={formData.vendor || ''}
                      onChange={(e) => updateField('vendor', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#FA8A63] disabled:bg-slate-50"
                    >
                      <option value="">None / Independent</option>
                      {FLEET_LOOKUPS.vendors.map((vn) => (
                        <option key={vn} value={vn}>
                          {vn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Fleet summary (Visible in View/Edit mode) */}
              {(mode === 'view' || mode === 'edit') && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Fleet summary</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 block">Direct Drivers</span>
                      <span className="text-lg font-bold text-slate-900">{summaryCounts.directDriversCount}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 block">Drivers Online</span>
                      <span className="text-lg font-bold text-emerald-600">{summaryCounts.driversOnlineCount}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 block">Direct Vehicles</span>
                      <span className="text-lg font-bold text-slate-900">{summaryCounts.directVehiclesCount}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 block">Vehicles Online</span>
                      <span className="text-lg font-bold text-emerald-600">{summaryCounts.vehiclesOnlineCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/80">
                    <span>Created: {formData.created_at || '—'}</span>
                    <span>Updated: {formData.updated_at || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DRIVERS MEMBERSHIP */}
          {activeTab === 'drivers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assigned drivers</h3>
                  <p className="text-xs text-slate-500">
                    {memberDrivers.length} direct member(s) · {summaryCounts.driversOnlineCount} online
                  </p>
                </div>
                {mode !== 'view' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDriverSearchQuery('');
                      setSelectedDriverModalIds(new Set());
                      setIsAssignDriverOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Assign driver</span>
                  </button>
                )}
              </div>

              {/* Driver Members List */}
              {memberDrivers.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Users size={20} />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No members assigned</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Select an existing resource from Driver Master to link it to this fleet.
                  </p>
                  {mode !== 'view' && (
                    <button
                      type="button"
                      onClick={() => setIsAssignDriverOpen(true)}
                      className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
                    >
                      Assign driver
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {memberDrivers.map((driver) => {
                    const isOnline = driver.status === 'Active';
                    return (
                      <div
                        key={driver.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                            {driver.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{driver.name}</span>
                              <span className="font-mono text-[11px] text-slate-500">{driver.licence}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              <span>{driver.company}</span>
                              <span>•</span>
                              <span>{driver.phone}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                          {mode !== 'view' && (
                            <button
                              type="button"
                              onClick={() => setDriverToRemove(driver.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove membership"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VEHICLES MEMBERSHIP & ALLOCATION */}
          {activeTab === 'vehicles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assigned vehicles</h3>
                  <p className="text-xs text-slate-500">
                    {memberVehicles.length} direct member(s) · {summaryCounts.vehiclesOnlineCount} online
                  </p>
                </div>
                {mode !== 'view' && (
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleSearchQuery('');
                      setSelectedVehicleModalIds(new Set());
                      setIsAssignVehicleOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Assign vehicle</span>
                  </button>
                )}
              </div>

              {/* Vehicle Members List with Driver Allocation */}
              {memberVehicles.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Truck size={20} />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No members assigned</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Select an existing resource from Vehicle Master to link it to this fleet.
                  </p>
                  {mode !== 'view' && (
                    <button
                      type="button"
                      onClick={() => setIsAssignVehicleOpen(true)}
                      className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
                    >
                      Assign vehicle
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                    Optional individual Driver assignments for selected Fleet Vehicles. Assign Drivers in the Drivers tab first; one Driver cannot be allocated to two vehicles simultaneously.
                  </div>

                  {memberVehicles.map((vehicle) => {
                    const currentAssignedDriverId =
                      formData.driverVehicleAssignments?.[vehicle.id] || '';

                    return (
                      <div
                        key={vehicle.id}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-200 text-[#FA8A63] flex items-center justify-center">
                            <Truck size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                {vehicle.registration_number}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  vehicle.online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {vehicle.online ? 'Online' : 'Offline'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {vehicle.name} {vehicle.model ? `• ${vehicle.model}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Driver Allocation Dropdown */}
                        <div className="flex items-center gap-3">
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              <span>Assigned Driver</span>
                              <InfoTooltip content="Select an existing Driver from Driver Master to assign to this Fleet Vehicle. Optional; changes are saved atomically with Fleet membership." />
                            </label>
                            <select
                              disabled={mode === 'view'}
                              value={currentAssignedDriverId}
                              onChange={(e) => handleVehicleDriverChange(vehicle.id, e.target.value)}
                              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#FA8A63] disabled:bg-slate-50 max-w-[200px]"
                            >
                              <option value="">Unassigned</option>
                              {memberDrivers.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name} ({d.licence})
                                </option>
                              ))}
                            </select>
                          </div>

                          {mode !== 'view' && (
                            <button
                              type="button"
                              onClick={() => setVehicleToRemove(vehicle.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer mt-3"
                              title="Remove membership"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            {mode === 'view'
              ? 'Read-only view'
              : isDirty
              ? 'Unsaved changes in draft'
              : 'All changes saved'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {mode === 'view' ? 'Close' : 'Cancel'}
            </button>
            {mode !== 'view' && (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {mode === 'create' ? 'Create fleet' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: ASSIGN DRIVER */}
      {isAssignDriverOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assign existing driver</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose an existing driver master. A resource may belong to multiple fleets.
                </p>
              </div>
              <button
                onClick={() => setIsAssignDriverOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, licence or mobile..."
                  value={driverSearchQuery}
                  onChange={(e) => setDriverSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#FA8A63]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {eligibleDrivers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  All available demo drivers are already linked or no matches found.
                </div>
              ) : (
                eligibleDrivers.map((d) => {
                  const isChecked = selectedDriverModalIds.has(d.id);
                  return (
                    <div
                      key={d.id}
                      onClick={() => {
                        const next = new Set(selectedDriverModalIds);
                        if (next.has(d.id)) next.delete(d.id);
                        else next.add(d.id);
                        setSelectedDriverModalIds(next);
                      }}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-[#FA8A63] bg-orange-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-[#FA8A63] rounded border-slate-300"
                        />
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">{d.name}</span>
                          <span className="text-[11px] text-slate-500">DL: {d.licence} • {d.phone}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {d.company}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {selectedDriverModalIds.size} driver(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignDriverOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedDriverModalIds.size === 0}
                  onClick={handleConfirmAssignDrivers}
                  className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  Assign selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN VEHICLE */}
      {isAssignVehicleOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assign existing vehicle</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose existing vehicles from Vehicle Master. A vehicle may belong to multiple fleets.
                </p>
              </div>
              <button
                onClick={() => setIsAssignVehicleOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search registration plate or vehicle name..."
                  value={vehicleSearchQuery}
                  onChange={(e) => setVehicleSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#FA8A63]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {eligibleVehicles.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  All available demo vehicles are already linked or no matches found.
                </div>
              ) : (
                eligibleVehicles.map((v) => {
                  const isChecked = selectedVehicleModalIds.has(v.id);
                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        const next = new Set(selectedVehicleModalIds);
                        if (next.has(v.id)) next.delete(v.id);
                        else next.add(v.id);
                        setSelectedVehicleModalIds(next);
                      }}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-[#FA8A63] bg-orange-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-[#FA8A63] rounded border-slate-300"
                        />
                        <div>
                          <span className="font-mono font-bold text-xs text-slate-900 block">
                            {v.registration_number}
                          </span>
                          <span className="text-[11px] text-slate-500">{v.name} {v.model ? `• ${v.model}` : ''}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          v.online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {v.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {selectedVehicleModalIds.size} vehicle(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignVehicleOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedVehicleModalIds.size === 0}
                  onClick={handleConfirmAssignVehicles}
                  className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  Assign selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM REMOVE DRIVER */}
      {driverToRemove && (
        <div className="fixed inset-0 z-70 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertCircle size={20} />
              <h4 className="text-sm font-bold text-slate-900">Remove fleet membership?</h4>
            </div>
            <p className="text-xs text-slate-600">
              This removes the Driver from this Fleet's membership. Any dependent Driver–Vehicle assignment on this Fleet will also be cleared. Master Driver records and other Fleet memberships remain unchanged.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDriverToRemove(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Keep membership
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveDriver}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM REMOVE VEHICLE */}
      {vehicleToRemove && (
        <div className="fixed inset-0 z-70 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertCircle size={20} />
              <h4 className="text-sm font-bold text-slate-900">Remove vehicle membership?</h4>
            </div>
            <p className="text-xs text-slate-600">
              This removes the Vehicle from this Fleet's membership and clears its driver allocation. Master Vehicle records remain unaffected.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVehicleToRemove(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Keep vehicle
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveVehicle}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DISCARD DRAFT */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-70 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertCircle size={20} />
              <h4 className="text-sm font-bold text-slate-900">Discard unsaved changes?</h4>
            </div>
            <p className="text-xs text-slate-600">
              You have unsaved changes in this draft. Leaving now will discard all edits made since opening the drawer.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
              >
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
