import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Search,
  Cpu,
  Radio,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Infinity as InfinityIcon,
  Clock,
  Link2
} from 'lucide-react';
import {
  HardwareCategory,
  HardwareMembership,
  HardwareBinding,
  HardwareBindingMode,
  DeviceRecord,
  SensorRecord,
  SimRecord,
  SUPPORTED_TIMEZONES,
  MODAL_FIELD_TOOLTIPS,
  resolveHardwareIdentifierValue,
  validateHardwareBindingPair,
  formatDateTimeWithTz,
  formatLocalInputParts,
  buildIsoWithTimezone
} from '../../types/modalMaster';
import { ModelCategoryRecord, getRecordIdentifierTypes } from '../../types/modelCategoryMaster';
import { MappingInfoTooltip } from './ModalConnectionOverlays';
import {
  FullCreateDeviceDrawer,
  FullCreateSensorDrawer,
  FullCreateSimDrawer
} from './QuickCreateHardwareDrawers';

export interface BindingDefaults {
  mode: HardwareBindingMode;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
}

export interface HardwareCompositionSaveResult {
  newMember?: HardwareMembership;
  newBinding?: HardwareBinding;
  updatedBinding?: HardwareBinding;
  registeredDevice?: DeviceRecord;
  registeredSensor?: SensorRecord;
  registeredSim?: SimRecord;
  usedDefaults: BindingDefaults;
}

interface HardwareCompositionModalProps {
  mode: 'add-hardware' | 'edit-binding';
  category: HardwareCategory;
  initialParentId?: string | null;
  parentResourceLabel?: string | null;
  editingBinding?: HardwareBinding | null;
  connId: string;
  targetClient: string;
  site: string;
  enabledModels: ModelCategoryRecord[];
  members: HardwareMembership[];
  draftBindings: HardwareBinding[];
  allGlobalBindings: HardwareBinding[];
  allConnections: { id: string; name: string; companyName: string; status: string; memberIds: string[] }[];
  localDevices: DeviceRecord[];
  localSensors: SensorRecord[];
  localSims: SimRecord[];
  defaultBinding: BindingDefaults;
  onQuickRegisterHardware?: (unit: {
    device?: DeviceRecord;
    sensor?: SensorRecord;
    sim?: SimRecord;
  }) => void;
  onSave: (result: HardwareCompositionSaveResult, keepOpenAction?: 'add-sensor' | 'add-sim') => void;
  onClose: () => void;
}

export const HardwareCompositionModal: React.FC<HardwareCompositionModalProps> = ({
  mode,
  category,
  initialParentId = null,
  parentResourceLabel = null,
  editingBinding = null,
  connId,
  targetClient,
  site,
  enabledModels,
  members,
  draftBindings,
  allGlobalBindings,
  allConnections,
  localDevices,
  localSensors,
  localSims,
  defaultBinding,
  onQuickRegisterHardware,
  onSave,
  onClose
}) => {
  const isEditingBinding = mode === 'edit-binding' && !!editingBinding;

  // Parent selection ("Connected To")
  const deviceMembers = useMemo(() => members.filter((m) => m.category === 'Device'), [members]);
  const simParentMembers = useMemo(
    () => members.filter((m) => m.category === 'Device' || m.category === 'Sensor'),
    [members]
  );
  const [parentHardwareId, setParentHardwareId] = useState<string>(() => {
    if (isEditingBinding && editingBinding) return editingBinding.fromHardwareId;
    if (initialParentId) return initialParentId;
    if (category === 'SIM' && simParentMembers.length > 0) return simParentMembers[0].hardwareId;
    return '';
  });

  // Client-enabled models (used for per-unit metadata resolution & FullCreate defaults)
  const categoryModels = useMemo(
    () => enabledModels.filter((m) => m.category === category),
    [enabledModels, category]
  );
  const [selectedModelId, setSelectedModelId] = useState<string>(() => categoryModels[0]?.id || '');

  const activeModelDef = useMemo(
    () => categoryModels.find((m) => m.id === selectedModelId) || categoryModels[0] || null,
    [categoryModels, selectedModelId]
  );

  // Hardware search & selection
  const [idSearchQuery, setIdSearchQuery] = useState('');
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>(() =>
    isEditingBinding && editingBinding ? editingBinding.toHardwareId : ''
  );

  // Full Create Device / Sensor / SIM Drawer overlay
  const [showRegisterInline, setShowRegisterInline] = useState(false);
  const [pendingRegisteredUnit, setPendingRegisteredUnit] = useState<{
    device?: DeviceRecord;
    sensor?: SensorRecord;
    sim?: SimRecord;
  } | null>(null);

  // Binding validity state
  const [portOrSlot, setPortOrSlot] = useState<string>(() =>
    isEditingBinding && editingBinding ? editingBinding.portOrSlot || '' : ''
  );
  const [bMode, setBMode] = useState<HardwareBindingMode>(() =>
    isEditingBinding && editingBinding ? editingBinding.mode : defaultBinding.mode
  );
  const [bTimezone, setBTimezone] = useState<string>(() =>
    isEditingBinding && editingBinding ? editingBinding.timezone || 'Asia/Kolkata' : defaultBinding.timezone
  );
  const [bStartDate, setBStartDate] = useState<string>(() => {
    if (isEditingBinding && editingBinding) {
      return formatLocalInputParts(editingBinding.effectiveStartAt, editingBinding.timezone).date || defaultBinding.startDate;
    }
    return defaultBinding.startDate;
  });
  const [bStartTime, setBStartTime] = useState<string>(() => {
    if (isEditingBinding && editingBinding) {
      return formatLocalInputParts(editingBinding.effectiveStartAt, editingBinding.timezone).time || defaultBinding.startTime;
    }
    return defaultBinding.startTime;
  });
  const [bEndDate, setBEndDate] = useState<string>(() => {
    if (isEditingBinding && editingBinding?.effectiveEndAt) {
      return formatLocalInputParts(editingBinding.effectiveEndAt, editingBinding.timezone).date || defaultBinding.endDate;
    }
    return defaultBinding.endDate;
  });
  const [bEndTime, setBEndTime] = useState<string>(() => {
    if (isEditingBinding && editingBinding?.effectiveEndAt) {
      return formatLocalInputParts(editingBinding.effectiveEndAt, editingBinding.timezone).time || defaultBinding.endTime;
    }
    return defaultBinding.endTime;
  });
  const [bNotes, setBNotes] = useState<string>(() =>
    isEditingBinding && editingBinding ? editingBinding.notes || '' : ''
  );
  const [localError, setLocalError] = useState<string | null>(null);

  // Track effective local pool (includes any inline newly registered unit, deduplicated by id)
  const effectiveDevices = useMemo(() => {
    const d = pendingRegisteredUnit?.device;
    if (!d || localDevices.some((x) => x.id === d.id)) return localDevices;
    return [d, ...localDevices];
  }, [pendingRegisteredUnit, localDevices]);
  const effectiveSensors = useMemo(() => {
    const s = pendingRegisteredUnit?.sensor;
    if (!s || localSensors.some((x) => x.id === s.id)) return localSensors;
    return [s, ...localSensors];
  }, [pendingRegisteredUnit, localSensors]);
  const effectiveSims = useMemo(() => {
    const sim = pendingRegisteredUnit?.sim;
    if (!sim || localSims.some((x) => x.id === sim.id)) return localSims;
    return [sim, ...localSims];
  }, [pendingRegisteredUnit, localSims]);

  // Parent device capability metadata
  const parentMember = useMemo(
    () => members.find((m) => m.hardwareId === parentHardwareId) || null,
    [members, parentHardwareId]
  );
  const parentDeviceRecord = useMemo(
    () => effectiveDevices.find((d) => d.id === parentHardwareId) || null,
    [effectiveDevices, parentHardwareId]
  );
  const parentSensorRecord = useMemo(
    () => effectiveSensors.find((s) => s.id === parentHardwareId) || null,
    [effectiveSensors, parentHardwareId]
  );

  const availablePortsForParent = useMemo(() => {
    if (category === 'SIM' && parentSensorRecord) {
      return ['SIM Slot 1'];
    }
    if (!parentDeviceRecord) return [];
    const ports = parentDeviceRecord.supportedPorts || [];
    if (category === 'SIM') {
      return ports.filter((p) => p.toLowerCase().includes('sim'));
    }
    return ports.filter((p) => !p.toLowerCase().includes('sim'));
  }, [parentDeviceRecord, parentSensorRecord, category]);

  // Suggest next unoccupied port automatically when parent/category changes
  useEffect(() => {
    if (isEditingBinding || !parentHardwareId || availablePortsForParent.length === 0) return;
    if (portOrSlot && availablePortsForParent.includes(portOrSlot)) return;
    const occupiedPorts = new Set(
      draftBindings
        .filter((b) => !b.endedAt && b.fromHardwareId === parentHardwareId && b.portOrSlot)
        .map((b) => b.portOrSlot!)
    );
    const freePort = availablePortsForParent.find((p) => !occupiedPorts.has(p)) || '';
    if (freePort) setPortOrSlot(freePort);
  }, [parentHardwareId, availablePortsForParent, draftBindings, isEditingBinding, portOrSlot]);

  // Existing binding inspection helper across all connections
  const getExistingHardwareAssignments = (hwId: string) => {
    const activeBindings = allGlobalBindings.filter(
      (b) => !b.endedAt && b.statusOverride !== 'Canceled' && (b.toHardwareId === hwId || b.fromHardwareId === hwId)
    );
    const activeConns = allConnections.filter(
      (c) => c.id !== connId && (c.status === 'Active' || c.status === 'Scheduled') && c.memberIds.includes(hwId)
    );
    return { activeBindings, activeConns };
  };

  // Matching client-owned hardware units directly across all registered models
  const matchingUnits = useMemo(() => {
    if (isEditingBinding) return [];
    const q = idSearchQuery.trim().toLowerCase();
    const clientLower = targetClient.trim().toLowerCase();
    const seen = new Set<string>();

    if (category === 'Device') {
      return effectiveDevices
        .filter((d) => {
          if ((d.company || '').trim().toLowerCase() !== clientLower) return false;
          if (seen.has(d.id)) return false;
          const matchesQuery =
            !q ||
            [d.deviceId, d.serial, d.imei, d.name, d.kind, d.manufacturer, d.modelText]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(q);
          if (!matchesQuery) return false;
          seen.add(d.id);
          return true;
        })
        .slice(0, 24)
        .map((d) => {
          const matchedModel =
            categoryModels.find(
              (m) =>
                m.id === d.modelTypeId ||
                d.kind.toLowerCase().includes(m.typeName.toLowerCase()) ||
                (m.modelReference && d.modelText.toLowerCase().includes(m.modelReference.toLowerCase()))
            ) || null;
          const identTypes = matchedModel ? getRecordIdentifierTypes(matchedModel) : [];
          const primaryIdentType = identTypes[0] || matchedModel?.identifierType || (d.imei ? 'IMEI' : 'Device ID');
          const identifierValue =
            resolveHardwareIdentifierValue(d, 'Device', primaryIdentType) || d.imei || d.serial || d.deviceId;
          const modelLabel = matchedModel
            ? [matchedModel.typeName, matchedModel.manufacturer, matchedModel.modelReference].filter(Boolean).join(' · ')
            : [d.kind, d.manufacturer, d.modelText].filter(Boolean).join(' · ');

          return {
            hardwareId: d.id,
            code: d.deviceId,
            identifierType: primaryIdentType,
            identifierValue,
            modelTypeId: matchedModel?.id || d.modelTypeId || '',
            modelLabel,
            modelDef: matchedModel,
            manufacturer: d.manufacturer,
            modelText: d.modelText,
            subtitle: `${d.deviceId} · ${d.manufacturer} ${d.modelText}`,
            status: d.hardwareLifecycle,
            simSlots: d.simSlots || 0
          };
        });
    }

    if (category === 'Sensor') {
      return effectiveSensors
        .filter((s) => {
          if ((s.company || '').trim().toLowerCase() !== clientLower) return false;
          if (seen.has(s.id)) return false;
          const matchesQuery =
            !q ||
            [s.deviceId, s.serial, s.name, s.kind, s.manufacturer, s.modelText]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(q);
          if (!matchesQuery) return false;
          seen.add(s.id);
          return true;
        })
        .slice(0, 24)
        .map((s) => {
          const matchedModel =
            categoryModels.find(
              (m) =>
                m.id === s.modelTypeId ||
                s.kind.toLowerCase().includes(m.typeName.toLowerCase().replace(' level', ''))
            ) || null;
          const identTypes = matchedModel ? getRecordIdentifierTypes(matchedModel) : [];
          const primaryIdentType = identTypes[0] || matchedModel?.identifierType || 'Sensor ID';
          const identifierValue =
            resolveHardwareIdentifierValue(s, 'Sensor', primaryIdentType) || s.deviceId || s.serial;
          const modelLabel = matchedModel
            ? [matchedModel.typeName, matchedModel.manufacturer, matchedModel.modelReference].filter(Boolean).join(' · ')
            : [s.kind, s.manufacturer, s.modelText].filter(Boolean).join(' · ');

          return {
            hardwareId: s.id,
            code: s.deviceId,
            identifierType: primaryIdentType,
            identifierValue,
            modelTypeId: matchedModel?.id || s.modelTypeId || '',
            modelLabel,
            modelDef: matchedModel,
            manufacturer: s.manufacturer,
            modelText: s.modelText,
            subtitle: `${s.deviceId} · ${s.manufacturer} ${s.modelText}`,
            status: s.hardwareLifecycle,
            simSlots: 0
          };
        });
    }

    return effectiveSims
      .filter((sim) => {
        if ((sim.owner || '').trim().toLowerCase() !== clientLower) return false;
        if (seen.has(sim.id)) return false;
        const matchesQuery =
          !q ||
          [sim.iccid, sim.id, sim.msisdn, sim.operator, sim.category, sim.formFactor, sim.plan]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q);
        if (!matchesQuery) return false;
        seen.add(sim.id);
        return true;
      })
      .slice(0, 24)
      .map((sim) => {
        const matchedModel =
          categoryModels.find(
            (m) =>
              m.id === sim.modelTypeId ||
              (sim.category || '').toLowerCase() === m.typeName.toLowerCase()
          ) || null;
        const identTypes = matchedModel ? getRecordIdentifierTypes(matchedModel) : [];
        const primaryIdentType = identTypes[0] || matchedModel?.identifierType || 'ICCID';
        const modelLabel = matchedModel
          ? [matchedModel.typeName, matchedModel.manufacturer, matchedModel.modelReference].filter(Boolean).join(' · ')
          : [sim.category || 'SIM', sim.operator, sim.formFactor].filter(Boolean).join(' · ');

        return {
          hardwareId: sim.id,
          code: sim.id,
          identifierType: primaryIdentType,
          identifierValue: sim.iccid || sim.id,
          modelTypeId: matchedModel?.id || sim.modelTypeId || '',
          modelLabel,
          modelDef: matchedModel,
          manufacturer: sim.operator,
          modelText: `${sim.formFactor} · ${sim.plan}`,
          subtitle: `${sim.operator} · ${sim.formFactor} · ${sim.msisdn || 'No MSISDN'}`,
          status: sim.status,
          simSlots: 0
        };
      });
  }, [
    isEditingBinding,
    categoryModels,
    idSearchQuery,
    targetClient,
    category,
    effectiveDevices,
    effectiveSensors,
    effectiveSims
  ]);

  const selectedUnitSummary = useMemo(
    () => matchingUnits.find((u) => u.hardwareId === selectedHardwareId) || null,
    [matchingUnits, selectedHardwareId]
  );

  // Cross-client guard when searching
  const crossTenantConflict = useMemo(() => {
    const q = idSearchQuery.trim().toLowerCase();
    if (!q || q.length < 4 || isEditingBinding) return null;
    const clientLower = targetClient.trim().toLowerCase();
    if (category === 'Device') {
      const f = effectiveDevices.find(
        (d) =>
          (d.company || '').trim().toLowerCase() !== clientLower &&
          (d.imei.toLowerCase() === q || d.serial.toLowerCase() === q || d.deviceId.toLowerCase() === q)
      );
      return f ? `Identifier "${idSearchQuery.trim()}" belongs to ${f.company}. Cross-client selection is blocked.` : null;
    }
    if (category === 'Sensor') {
      const f = effectiveSensors.find(
        (s) =>
          (s.company || '').trim().toLowerCase() !== clientLower &&
          (s.deviceId.toLowerCase() === q || s.serial.toLowerCase() === q)
      );
      return f ? `Sensor "${idSearchQuery.trim()}" belongs to ${f.company}. Cross-client selection is blocked.` : null;
    }
    const fs = effectiveSims.find(
      (s) => (s.owner || '').trim().toLowerCase() !== clientLower && s.iccid.toLowerCase() === q
    );
    return fs ? `SIM ICCID "${idSearchQuery.trim()}" belongs to ${fs.owner}. Cross-client selection is blocked.` : null;
  }, [idSearchQuery, isEditingBinding, targetClient, category, effectiveDevices, effectiveSensors, effectiveSims]);

  // Sensor standalone / resource-level check
  const selectedUnitModelDef = selectedUnitSummary?.modelDef || null;
  const sensorRequiresParent =
    category === 'Sensor' &&
    selectedUnitModelDef?.connectionMode === 'Gateway-connected' &&
    !parentHardwareId &&
    !parentResourceLabel;

  // Build candidate membership & validate binding pair live
  const selectedNewMember: HardwareMembership | null = useMemo(() => {
    if (isEditingBinding && editingBinding) {
      return members.find((m) => m.hardwareId === editingBinding.toHardwareId) || null;
    }
    if (!selectedUnitSummary) return null;
    return {
      hardwareId: selectedUnitSummary.hardwareId,
      category,
      modelTypeId: selectedUnitSummary.modelTypeId,
      modelLabel: selectedUnitSummary.modelLabel,
      identifierType: selectedUnitSummary.identifierType,
      identifierValue:
        category === 'Device' && selectedUnitSummary.code
          ? `${selectedUnitSummary.code}`
          : selectedUnitSummary.identifierValue,
      registrationStatus: selectedUnitSummary.status,
      isPrimary: members.length === 0 && !parentHardwareId
    };
  }, [isEditingBinding, editingBinding, members, selectedUnitSummary, category, parentHardwareId]);

  const liveValidation = useMemo(() => {
    if (!parentHardwareId) {
      if (category === 'SIM') {
        return { errors: ['A SIM must be attached to a registered Device or Sensor.'], warnings: [] };
      }
      if (sensorRequiresParent) {
        return {
          errors: [
            `${selectedUnitModelDef?.typeName || selectedUnitSummary?.modelLabel || 'This Sensor'} is configured as Gateway-connected in Model Category Master. Select a parent Device.`
          ],
          warnings: []
        };
      }
      return { errors: [], warnings: [] };
    }

    const toHwId = isEditingBinding && editingBinding ? editingBinding.toHardwareId : selectedHardwareId;
    if (!toHwId) return { errors: [], warnings: [] };

    const augmentedMembers =
      selectedNewMember && !members.some((m) => m.hardwareId === selectedNewMember.hardwareId)
        ? [...members, selectedNewMember]
        : members;

    const startIso = buildIsoWithTimezone(bStartDate, bStartTime, bTimezone);
    const endIso = bMode === 'Temporal' ? buildIsoWithTimezone(bEndDate, bEndTime, bTimezone) : null;

    const otherGlobal = [
      ...allGlobalBindings.filter((b) => b.connectionId !== connId),
      ...draftBindings
    ];

    return validateHardwareBindingPair(
      {
        id: editingBinding?.id || '__new_inline__',
        connectionId: connId,
        fromHardwareId: parentHardwareId,
        toHardwareId: toHwId,
        mode: bMode,
        effectiveStartAt: startIso,
        effectiveEndAt: endIso,
        timezone: bTimezone,
        portOrSlot: portOrSlot || null
      },
      augmentedMembers,
      draftBindings,
      otherGlobal
    );
  }, [
    parentHardwareId,
    category,
    sensorRequiresParent,
    selectedUnitModelDef,
    selectedUnitSummary,
    isEditingBinding,
    editingBinding,
    selectedHardwareId,
    selectedNewMember,
    members,
    bStartDate,
    bStartTime,
    bEndDate,
    bEndTime,
    bMode,
    bTimezone,
    portOrSlot,
    allGlobalBindings,
    connId,
    draftBindings
  ]);

  const handleCreatedDevice = (newDev: DeviceRecord) => {
    setPendingRegisteredUnit({ device: newDev });
    onQuickRegisterHardware?.({ device: newDev });
    if (newDev.modelTypeId && categoryModels.some((m) => m.id === newDev.modelTypeId)) {
      setSelectedModelId(newDev.modelTypeId);
    }
    setSelectedHardwareId(newDev.id);
    setIdSearchQuery(newDev.imei || newDev.serial || newDev.deviceId);
    setShowRegisterInline(false);
    setLocalError(null);
  };

  const handleCreatedSensor = (newSen: SensorRecord) => {
    setPendingRegisteredUnit({ sensor: newSen });
    onQuickRegisterHardware?.({ sensor: newSen });
    if (newSen.modelTypeId && categoryModels.some((m) => m.id === newSen.modelTypeId)) {
      setSelectedModelId(newSen.modelTypeId);
    }
    setSelectedHardwareId(newSen.id);
    setIdSearchQuery(newSen.deviceId || newSen.serial);
    setShowRegisterInline(false);
    setLocalError(null);
  };

  const handleCreatedSim = (newSim: SimRecord) => {
    setPendingRegisteredUnit({ sim: newSim });
    onQuickRegisterHardware?.({ sim: newSim });
    if (newSim.modelTypeId && categoryModels.some((m) => m.id === newSim.modelTypeId)) {
      setSelectedModelId(newSim.modelTypeId);
    }
    setSelectedHardwareId(newSim.id);
    setIdSearchQuery(newSim.iccid);
    setShowRegisterInline(false);
    setLocalError(null);
  };

  const handleCommit = (keepOpenAction?: 'add-sensor' | 'add-sim') => {
    setLocalError(null);

    if (!isEditingBinding && !selectedNewMember) {
      setLocalError(`Search and select a registered ${category} first.`);
      return;
    }

    if (!isEditingBinding && selectedNewMember && members.some((m) => m.hardwareId === selectedNewMember.hardwareId)) {
      setLocalError(`${selectedNewMember.identifierValue} is already added in this connection.`);
      return;
    }

    if (liveValidation.errors.length > 0) {
      setLocalError(liveValidation.errors[0]);
      return;
    }

    // Prevent silently overwriting conflicting active assignments across connections
    if (!isEditingBinding && selectedHardwareId) {
      const { activeBindings } = getExistingHardwareAssignments(selectedHardwareId);
      const startIso = buildIsoWithTimezone(bStartDate, bStartTime, bTimezone);
      const endIso = bMode === 'Temporal' ? buildIsoWithTimezone(bEndDate, bEndTime, bTimezone) : null;
      const conflictOther = activeBindings.find((b) => {
        if (b.connectionId === connId) return false;
        const otherStart = Date.parse(b.effectiveStartAt);
        const otherEnd = b.effectiveEndAt ? Date.parse(b.effectiveEndAt) : Number.POSITIVE_INFINITY;
        const thisStart = Date.parse(startIso);
        const thisEnd = endIso ? Date.parse(endIso) : Number.POSITIVE_INFINITY;
        return thisStart < otherEnd && otherStart < thisEnd;
      });
      if (conflictOther) {
        setLocalError(
          `${category} is actively bound in ${conflictOther.connectionId} (${conflictOther.id}). Choose a non-overlapping future effective window or end the existing binding first.`
        );
        return;
      }
    }

    const usedDefaults: BindingDefaults = {
      mode: bMode,
      startDate: bStartDate,
      startTime: bStartTime,
      endDate: bEndDate,
      endTime: bEndTime,
      timezone: bTimezone
    };

    const nowIso = new Date().toISOString();
    const startIso = buildIsoWithTimezone(bStartDate, bStartTime, bTimezone);
    const endIso = bMode === 'Temporal' ? buildIsoWithTimezone(bEndDate, bEndTime, bTimezone) : null;

    if (isEditingBinding && editingBinding) {
      onSave({
        updatedBinding: {
          ...editingBinding,
          fromHardwareId: parentHardwareId,
          mode: bMode,
          effectiveStartAt: startIso,
          effectiveEndAt: endIso,
          timezone: bTimezone,
          portOrSlot: portOrSlot || null,
          notes: bNotes.trim(),
          updatedAt: nowIso
        },
        usedDefaults
      });
      return;
    }

    const newBinding: HardwareBinding | undefined = parentHardwareId
      ? {
          id: `BND-${3001 + allGlobalBindings.length + draftBindings.length + 1}`,
          connectionId: connId,
          fromHardwareId: parentHardwareId,
          toHardwareId: selectedNewMember!.hardwareId,
          mode: bMode,
          effectiveStartAt: startIso,
          effectiveEndAt: endIso,
          timezone: bTimezone,
          portOrSlot: portOrSlot || null,
          notes: bNotes.trim(),
          createdAt: nowIso,
          updatedAt: nowIso
        }
      : undefined;

    onSave(
      {
        newMember: selectedNewMember!,
        newBinding,
        registeredDevice: pendingRegisteredUnit?.device,
        registeredSensor: pendingRegisteredUnit?.sensor,
        registeredSim: pendingRegisteredUnit?.sim,
        usedDefaults
      },
      keepOpenAction
    );

    if (keepOpenAction) {
      setSelectedHardwareId('');
      setIdSearchQuery('');
      setPendingRegisteredUnit(null);
      setPortOrSlot('');
      setBNotes('');
    }
  };

  const supportsMultipleSims =
    category === 'SIM' && !!parentDeviceRecord && (parentDeviceRecord.simSlots || 0) > 1;

  const CategoryIcon = category === 'Device' ? Cpu : category === 'Sensor' ? Radio : Smartphone;
  const accentPill =
    category === 'Device'
      ? 'bg-sky-50 text-sky-700 border-sky-200'
      : category === 'Sensor'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className="fixed inset-0 z-[92] flex justify-end bg-slate-900/35 backdrop-blur-[1px]">
      <div className="w-full max-w-[540px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Compact Drawer Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`w-8 h-8 rounded-lg border inline-flex items-center justify-center shrink-0 ${accentPill}`}>
              <CategoryIcon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-bold text-slate-900 truncate">
                  {isEditingBinding
                    ? `Edit Binding · ${editingBinding?.id}`
                    : `Add ${category}${
                        parentMember
                          ? ` under ${parentMember.identifierValue}`
                          : parentResourceLabel
                          ? ` for ${parentResourceLabel}`
                          : ''
                      }`}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {targetClient} · {isEditingBinding ? 'Adjust validity, parent, or port/slot' : 'Select hardware & binding validity together'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-[12px]">
          {localError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{localError}</span>
            </div>
          )}

          {/* Connected To / Upper Layer Selection */}
          {(parentResourceLabel || ((category === 'SIM' ? simParentMembers.length > 0 : category === 'Sensor' ? deviceMembers.length > 0 : false)) || isEditingBinding) && (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#F26522]" />
                  Connected To (Upper Layer)
                </label>
                <MappingInfoTooltip
                  text="Bindings always connect to the layer immediately above (Resource → Device/Sensor, or Device → Sensor/SIM)."
                  align="right"
                />
              </div>

              {initialParentId && parentMember && !isEditingBinding ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-[#F26522]/30">
                  <div className="flex items-center gap-2 min-w-0">
                    {parentMember.category === 'Sensor' ? (
                      <Radio className="w-4 h-4 text-purple-600 shrink-0" />
                    ) : (
                      <Cpu className="w-4 h-4 text-sky-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-900 truncate">{parentMember.identifierValue}</div>
                      <div className="text-[10.5px] text-slate-500 truncate">{parentMember.modelLabel}</div>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-semibold text-[#F26522] shrink-0">Preselected</span>
                </div>
              ) : parentResourceLabel && !isEditingBinding ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-[#F26522]/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link2 className="w-4 h-4 text-[#F26522] shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{parentResourceLabel}</div>
                      <div className="text-[10.5px] text-slate-500 truncate">Resource Layer (Direct {category} Binding)</div>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-semibold text-[#F26522] shrink-0">Preselected</span>
                </div>
              ) : (
                <select
                  value={parentHardwareId}
                  onChange={(e) => {
                    setParentHardwareId(e.target.value);
                    setPortOrSlot('');
                  }}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                >
                  {category === 'Sensor' && !isEditingBinding && (
                    <option value="">Standalone Sensor (No Parent Device)</option>
                  )}
                  {(category === 'SIM' ? simParentMembers : deviceMembers)
                    .filter((d) => !isEditingBinding || d.hardwareId !== editingBinding?.toHardwareId)
                    .map((d) => (
                      <option key={d.hardwareId} value={d.hardwareId}>
                        [{d.category}] {d.identifierValue} — {d.modelLabel}
                      </option>
                    ))}
                </select>
              )}
            </div>
          )}

          {/* Hardware Selection Section (Hidden when only editing an existing binding) */}
          {!isEditingBinding && (
            <div className="space-y-3">
              {/* Direct Hardware Search */}
              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <div className="flex items-center gap-1.5">
                    <label className="font-semibold text-slate-800">
                      Search Registered {category} <span className="text-rose-600">*</span>
                    </label>
                    <MappingInfoTooltip text={MODAL_FIELD_TOOLTIPS.mapping.searchIdentifier} align="left" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRegisterInline(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F26522] hover:underline cursor-pointer shrink-0"
                  >
                    <Plus className="w-3 h-3" /> Add New {category}
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    value={idSearchQuery}
                    onChange={(e) => {
                      setIdSearchQuery(e.target.value);
                      setSelectedHardwareId('');
                      setShowRegisterInline(false);
                    }}
                    placeholder={
                      category === 'Device'
                        ? 'Search Device ID, IMEI, Serial, or Model (e.g. GTW-9032, MettaX)...'
                        : category === 'Sensor'
                        ? 'Search Sensor ID, Serial, or Model (e.g. SENS-10017, Fuel)...'
                        : 'Search SIM ICCID, MSISDN, or Operator (e.g. 89918610431245100006)...'
                    }
                    className="w-full h-9 pl-8 pr-8 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#F26522]"
                  />
                  {idSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setIdSearchQuery('');
                        setSelectedHardwareId('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {crossTenantConflict && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{crossTenantConflict}</span>
                </div>
              )}

              {/* Search Results List */}
              <div className="border border-slate-200 rounded-xl bg-white max-h-56 overflow-y-auto divide-y divide-slate-100">
                {matchingUnits.length === 0 ? (
                  <div className="p-4 text-center space-y-2">
                    <div className="text-[11.5px] text-slate-500">
                      {idSearchQuery.trim()
                        ? `No registered ${category} matching "${idSearchQuery}" found under `
                        : `No registered ${category} found under `}
                      <strong className="text-slate-700">{targetClient}</strong>.
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRegisterInline(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F26522] hover:bg-[#d95417] text-white text-[11px] font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Register {category} for {targetClient}
                    </button>
                  </div>
                ) : (
                  matchingUnits.map((unit) => {
                    const alreadyInConn = members.some((m) => m.hardwareId === unit.hardwareId);
                    const isSelected = selectedHardwareId === unit.hardwareId;
                    const { activeBindings, activeConns } = getExistingHardwareAssignments(unit.hardwareId);
                    const otherConnLabel = activeConns.map((c) => c.id).join(', ');
                    const otherBind = activeBindings.find((b) => b.connectionId !== connId);

                    return (
                      <button
                        key={unit.hardwareId}
                        type="button"
                        disabled={alreadyInConn}
                        onClick={() => {
                          setSelectedHardwareId(unit.hardwareId);
                          setLocalError(null);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                          alreadyInConn
                            ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#FFF3EE] border-l-2 border-[#F26522]'
                            : 'hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-900">
                              {category === 'Device' && unit.code !== unit.identifierValue
                                ? `${unit.code} · ${unit.identifierValue}`
                                : unit.identifierValue}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                unit.status === 'Inventory'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-sky-50 text-sky-700'
                              }`}
                            >
                              {unit.status}
                            </span>
                            {otherConnLabel && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                Bound in {otherConnLabel}
                                {otherBind
                                  ? ` (${otherBind.mode} from ${formatDateTimeWithTz(otherBind.effectiveStartAt, otherBind.timezone)})`
                                  : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">{unit.subtitle}</div>
                        </div>
                        <span
                          className={`text-[11px] font-semibold shrink-0 px-2 py-0.5 rounded-md ${
                            alreadyInConn
                              ? 'bg-slate-100 text-slate-400'
                              : isSelected
                              ? 'bg-[#F26522] text-white'
                              : 'text-[#F26522] bg-[#FFF3EE]'
                          }`}
                        >
                          {alreadyInConn ? 'In Mapping' : isSelected ? 'Selected' : 'Select'}
                        </span>
                      </button>
                    );
                  })
                )}
                {matchingUnits.length > 0 && (
                  <div className="sticky bottom-0 px-3 py-2 bg-[#FFF9F6] border-t border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-600">
                      Can&apos;t find your {category} in {targetClient}?
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRegisterInline(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F26522] hover:bg-[#d95417] text-white text-[11px] font-semibold cursor-pointer shrink-0"
                    >
                      <Plus className="w-3 h-3" /> Create &amp; Register {category}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Hardware Summary Card */}
          {selectedNewMember && (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Selected {selectedNewMember.category}: {selectedNewMember.identifierValue}
                </div>
                <div className="text-[11px] text-slate-600 truncate mt-0.5">
                  {selectedNewMember.modelLabel} · {selectedNewMember.identifierType} · Status: {selectedNewMember.registrationStatus}
                </div>
              </div>
            </div>
          )}

          {/* Binding Configuration (Shown whenever connecting to a Parent Device or Resource) */}
          {(parentHardwareId || parentResourceLabel) && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                  Pairwise Binding & Validity
                </span>
                <span className="text-[10.5px] text-slate-500">Stored as independent binding record</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Binding Mode */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Binding Mode *</label>
                  <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-200/70">
                    {(['Permanent', 'Temporal'] as HardwareBindingMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setBMode(m)}
                        className={`h-8 rounded-md text-[11.5px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                          bMode === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {m === 'Permanent' ? <InfinityIcon className="w-3.5 h-3.5 text-sky-600" /> : <Clock className="w-3.5 h-3.5 text-[#F26522]" />}
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Port / Slot (Conditional) */}
                {availablePortsForParent.length > 0 ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {category === 'SIM' ? 'SIM Slot' : 'Port / Interface'}
                    </label>
                    <select
                      value={portOrSlot}
                      onChange={(e) => setPortOrSlot(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-[11.5px]"
                    >
                      <option value="">Auto / Unspecified</option>
                      {availablePortsForParent.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Timezone</label>
                    <select
                      value={bTimezone}
                      onChange={(e) => setBTimezone(e.target.value)}
                      className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-[11px]"
                    >
                      {SUPPORTED_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Effective Start Date & Time *</label>
                  <div className="flex gap-1">
                    <input
                      type="date"
                      value={bStartDate}
                      onChange={(e) => setBStartDate(e.target.value)}
                      className="w-[125px] h-9 px-2 rounded-lg border border-slate-200 bg-white text-[11px]"
                    />
                    <input
                      type="time"
                      step="1"
                      value={bStartTime}
                      onChange={(e) => setBStartTime(e.target.value)}
                      className="flex-1 h-9 px-2 rounded-lg border border-slate-200 bg-white text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Effective End Date & Time {bMode === 'Temporal' && '*'}
                  </label>
                  {bMode === 'Permanent' ? (
                    <div className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 flex items-center text-[11px]">
                      Empty (Open-ended Permanent)
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="date"
                        value={bEndDate}
                        onChange={(e) => setBEndDate(e.target.value)}
                        className="w-[125px] h-9 px-2 rounded-lg border border-slate-200 bg-white text-[11px]"
                      />
                      <input
                        type="time"
                        step="1"
                        value={bEndTime}
                        onChange={(e) => setBEndTime(e.target.value)}
                        className="flex-1 h-9 px-2 rounded-lg border border-slate-200 bg-white text-[11px]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {availablePortsForParent.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Timezone</label>
                    <select
                      value={bTimezone}
                      onChange={(e) => setBTimezone(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-[11px]"
                    >
                      {SUPPORTED_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Audit Note (Optional)</label>
                    <input
                      type="text"
                      value={bNotes}
                      onChange={(e) => setBNotes(e.target.value)}
                      placeholder="e.g. Main cabin port"
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[11px]"
                    />
                  </div>
                </div>
              )}

              {liveValidation.errors.length > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] space-y-1">
                  {liveValidation.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!parentHardwareId && category === 'Sensor' && sensorRequiresParent && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11.5px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>{selectedUnitModelDef?.typeName || selectedUnitSummary?.modelLabel || 'This Sensor'}</strong> is configured as Gateway-connected. Select a parent Device above or use{' '}
                <strong>+ Sensor</strong> on a Device row.
              </span>
            </div>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!isEditingBinding && category === 'Sensor' && (parentHardwareId || parentResourceLabel) && (
              <button
                type="button"
                disabled={liveValidation.errors.length > 0}
                onClick={() => handleCommit('add-sensor')}
                className="h-8 px-3 rounded-lg border border-[#F26522]/40 bg-[#FFF3EE] hover:bg-[#ffe5db] disabled:opacity-50 text-[#F26522] text-[11.5px] font-semibold cursor-pointer whitespace-nowrap"
              >
                Add & Add Another Sensor
              </button>
            )}

            {!isEditingBinding && supportsMultipleSims && (
              <button
                type="button"
                disabled={liveValidation.errors.length > 0}
                onClick={() => handleCommit('add-sim')}
                className="h-8 px-3 rounded-lg border border-[#F26522]/40 bg-[#FFF3EE] hover:bg-[#ffe5db] disabled:opacity-50 text-[#F26522] text-[11.5px] font-semibold cursor-pointer whitespace-nowrap"
              >
                Add & Add Another SIM
              </button>
            )}

            <button
              type="button"
              disabled={liveValidation.errors.length > 0}
              onClick={() => handleCommit(undefined)}
              className="h-8 px-4 rounded-lg bg-[#F26522] hover:bg-[#d95417] disabled:bg-slate-300 text-white text-[12px] font-semibold cursor-pointer whitespace-nowrap"
            >
              {isEditingBinding
                ? 'Update Binding'
                : parentHardwareId || parentResourceLabel
                ? `Save ${category} & Binding`
                : `Add ${category}`}
            </button>
          </div>
        </div>
      </div>

      {/* Full Master Create Drawers Overlay (z-[110]) */}
      {showRegisterInline && category === 'Device' && (
        <FullCreateDeviceDrawer
          targetClient={targetClient}
          site={site}
          initialModelDef={activeModelDef}
          initialSearchText={idSearchQuery}
          existingDevices={effectiveDevices}
          existingSensors={effectiveSensors}
          onSave={handleCreatedDevice}
          onClose={() => setShowRegisterInline(false)}
        />
      )}
      {showRegisterInline && category === 'Sensor' && (
        <FullCreateSensorDrawer
          targetClient={targetClient}
          site={site}
          initialModelDef={activeModelDef}
          initialSearchText={idSearchQuery}
          existingDevices={effectiveDevices}
          existingSensors={effectiveSensors}
          onSave={handleCreatedSensor}
          onClose={() => setShowRegisterInline(false)}
        />
      )}
      {showRegisterInline && category === 'SIM' && (
        <FullCreateSimDrawer
          targetClient={targetClient}
          initialModelDef={activeModelDef}
          initialSearchText={idSearchQuery}
          existingSims={effectiveSims}
          onSave={handleCreatedSim}
          onClose={() => setShowRegisterInline(false)}
        />
      )}
    </div>
  );
};
