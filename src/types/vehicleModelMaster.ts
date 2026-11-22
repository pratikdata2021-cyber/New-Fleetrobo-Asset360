import { INITIAL_VEHICLES, Vehicle, loadVehicleMasterStore } from './vehicle';

export type VehicleStateKey =
  | 'poll'
  | 'not_poll'
  | 'move'
  | 'alarm'
  | 'immobilize'
  | 'stoppage'
  | 'towing';

export interface VehicleStateDefinition {
  key: VehicleStateKey;
  label: string;
  shortLabel: string;
  referenceFilename: string;
  colorLabel: string;
  accentHex: string;
  bgTintClass: string;
  badgeClass: string;
  description: string;
}

export const VEHICLE_STATE_DEFINITIONS: VehicleStateDefinition[] = [
  {
    key: 'poll',
    label: 'Polling',
    shortLabel: 'Poll',
    referenceFilename: 'DefaultIconPoll.png',
    colorLabel: 'Green vehicle',
    accentHex: '#10B981',
    bgTintClass: 'bg-emerald-50 border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    description: 'Device actively transmitting live telemetry & GPS pings',
  },
  {
    key: 'not_poll',
    label: 'Not Polling',
    shortLabel: 'Not Poll',
    referenceFilename: 'DefaultIconNotPoll.png',
    colorLabel: 'Grey/dark vehicle',
    accentHex: '#64748B',
    bgTintClass: 'bg-slate-50 border-slate-200',
    badgeClass: 'bg-slate-200 text-slate-700',
    description: 'Telemetry device offline or no recent heartbeat received',
  },
  {
    key: 'move',
    label: 'Moving',
    shortLabel: 'Move',
    referenceFilename: 'DefaultIconMove.png',
    colorLabel: 'Yellow/amber vehicle',
    accentHex: '#F59E0B',
    bgTintClass: 'bg-amber-50 border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800',
    description: 'Vehicle actively moving above ignition & speed threshold',
  },
  {
    key: 'alarm',
    label: 'Alarm',
    shortLabel: 'Alarm',
    referenceFilename: 'DefaultIconAlarm.png',
    colorLabel: 'Blue vehicle + alarm badge',
    accentHex: '#2563EB',
    bgTintClass: 'bg-blue-50 border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-800',
    description: 'Critical alert, overspeed, SOS, or tamper condition active',
  },
  {
    key: 'immobilize',
    label: 'Immobilized',
    shortLabel: 'Immobilize',
    referenceFilename: 'DefaultIconImmobilize.png',
    colorLabel: 'Green vehicle + lock',
    accentHex: '#059669',
    bgTintClass: 'bg-teal-50 border-teal-200',
    badgeClass: 'bg-teal-100 text-teal-800',
    description: 'Remote engine cut-off / immobilization relay engaged',
  },
  {
    key: 'stoppage',
    label: 'Stoppage / Stopped',
    shortLabel: 'Stoppage',
    referenceFilename: 'DefaultIconStoppage.png',
    colorLabel: 'Red vehicle',
    accentHex: '#EF4444',
    bgTintClass: 'bg-rose-50 border-rose-200',
    badgeClass: 'bg-rose-100 text-rose-800',
    description: 'Vehicle stationary beyond configured stoppage threshold',
  },
  {
    key: 'towing',
    label: 'Towing',
    shortLabel: 'Towing',
    referenceFilename: 'Towing Icon.png',
    colorLabel: 'Orange tow indicator',
    accentHex: '#EA580C',
    bgTintClass: 'bg-orange-50 border-orange-200',
    badgeClass: 'bg-orange-100 text-orange-800',
    description: 'Unauthorized movement or towing event detected while ignition off',
  },
];

export interface VehicleModelIconSlot {
  stateKey: VehicleStateKey;
  source: 'default' | 'custom';
  assetId: string;
  previewUrl: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface VehicleModelRecord {
  id: string;
  manufacturer: string;
  modelName: string;
  variant: string;
  vehicleType: string;
  vehicleSegment: string;
  modelYear?: number | '';
  fuelType: string;
  description?: string;
  fuelTankCapacityL?: number | '';
  payloadCapacityKg?: number | '';
  seatingCapacity?: number | '';
  axleCount?: number | '';
  isAcVehicle: boolean;
  isAcReverse: boolean;
  isActive: boolean;
  icons: Record<VehicleStateKey, VehicleModelIconSlot>;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export const VEHICLE_TYPES = [
  'Truck',
  'Pickup',
  'Bus',
  'Van',
  'Light Commercial Vehicle',
  'Heavy Equipment',
  'Trailer',
  'Tanker',
] as const;

export const VEHICLE_SEGMENTS_BY_TYPE: Record<string, string[]> = {
  Truck: ['HCV', 'MCV', 'LCV', 'Heavy Commercial Vehicle'],
  Pickup: ['LCV', 'Small Commercial Vehicle'],
  Bus: ['Passenger', 'MCV', 'HCV'],
  Van: ['Passenger', 'LCV'],
  'Light Commercial Vehicle': ['LCV', 'Small Commercial Vehicle'],
  'Heavy Equipment': ['Industrial', 'HCV', 'Mining / Earthmover'],
  Trailer: ['HCV', 'Heavy Commercial Vehicle'],
  Tanker: ['HCV', 'MCV', 'Industrial'],
};

export const ALL_VEHICLE_SEGMENTS = [
  'HCV',
  'MCV',
  'LCV',
  'Passenger',
  'Industrial',
  'Heavy Commercial Vehicle',
  'Small Commercial Vehicle',
  'Mining / Earthmover',
];

export const MANUFACTURERS_LIST = [
  'Tata Motors',
  'Ashok Leyland',
  'Mahindra',
  'Eicher',
  'BharatBenz',
  'Volvo',
  'Scania',
  'Force Motors',
  'SML Isuzu',
  'Generic',
];

export const VEHICLE_MODEL_FUEL_TYPES = [
  'Diesel',
  'Petrol',
  'CNG',
  'Electric',
  'Hybrid',
  'LPG',
];

// Deterministic inline SVG data-URL system icon generator (zero broken external image dependencies)
export function getDefaultVehicleStateIconUrl(stateKey: VehicleStateKey, variantTone?: 'default' | 'customSample'): string {
  const isCustomSample = variantTone === 'customSample';
  const palette: Record<VehicleStateKey, { body: string; cab: string; badgeBg: string; stroke: string }> = {
    poll: { body: '#10B981', cab: '#047857', badgeBg: '#ECFDF5', stroke: '#065F46' },
    not_poll: { body: '#64748B', cab: '#334155', badgeBg: '#F1F5F9', stroke: '#1E293B' },
    move: { body: isCustomSample ? '#D97706' : '#F59E0B', cab: '#B45309', badgeBg: '#FFFBEB', stroke: '#78350F' },
    alarm: { body: isCustomSample ? '#1D4ED8' : '#2563EB', cab: '#1E40AF', badgeBg: '#FEE2E2', stroke: '#1E3A8A' },
    immobilize: { body: '#059669', cab: '#064E3B', badgeBg: '#D1FAE5', stroke: '#064E3B' },
    stoppage: { body: '#EF4444', cab: '#B91C1C', badgeBg: '#FEF2F2', stroke: '#7F1D1D' },
    towing: { body: '#EA580C', cab: '#9A3412', badgeBg: '#FFF7ED', stroke: '#7C2D12' },
  };
  const c = palette[stateKey];

  let overlaySvg = '';
  if (stateKey === 'poll') {
    overlaySvg = `<circle cx="50" cy="14" r="9" fill="#10B981" stroke="#ffffff" stroke-width="2"/><path d="M46 14l2.8 2.8 5.2-5.4" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (stateKey === 'not_poll') {
    overlaySvg = `<circle cx="50" cy="14" r="9" fill="#475569" stroke="#ffffff" stroke-width="2"/><path d="M46.5 10.5l7 7M53.5 10.5l-7 7" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`;
  } else if (stateKey === 'move') {
    overlaySvg = `<circle cx="50" cy="14" r="9" fill="#F59E0B" stroke="#ffffff" stroke-width="2"/><path d="M47 10l5 4-5 4" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (stateKey === 'alarm') {
    overlaySvg = `<circle cx="50" cy="14" r="9.5" fill="#EF4444" stroke="#ffffff" stroke-width="2"/><path d="M50 9.5v5.2M50 17.6h.01" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>`;
  } else if (stateKey === 'immobilize') {
    overlaySvg = `<circle cx="50" cy="14" r="9" fill="#065F46" stroke="#ffffff" stroke-width="2"/><rect x="46.5" y="13.5" width="7" height="5" rx="1" fill="#ffffff"/><path d="M48 13.5v-1.8a2 2 0 0 1 4 0v1.8" fill="none" stroke="#ffffff" stroke-width="1.6"/>`;
  } else if (stateKey === 'stoppage') {
    overlaySvg = `<circle cx="50" cy="14" r="9" fill="#DC2626" stroke="#ffffff" stroke-width="2"/><rect x="46.8" y="10.8" width="6.4" height="6.4" rx="1" fill="#ffffff"/>`;
  } else if (stateKey === 'towing') {
    overlaySvg = `<circle cx="50" cy="14" r="9" fill="#EA580C" stroke="#ffffff" stroke-width="2"/><path d="M46 16h8M48 12l2-2 2 2M50 10v5" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  const customRibbon = isCustomSample
    ? `<rect x="8" y="8" width="22" height="10" rx="4" fill="#1E293B"/><text x="19" y="15.5" font-family="Arial,sans-serif" font-size="6.5" font-weight="bold" fill="#FFFFFF" text-anchor="middle">AC</text>`
    : '';

  const truckSvg = stateKey === 'towing'
    ? `
      <!-- Tow truck + towed vehicle silhouette -->
      <rect x="7" y="29" width="21" height="14" rx="2.5" fill="#94A3B8" stroke="#475569" stroke-width="1.5"/>
      <rect x="10" y="32" width="12" height="5" rx="1" fill="#E2E8F0"/>
      <circle cx="12" cy="45" r="3.5" fill="#1E293B" stroke="#ffffff" stroke-width="1"/>
      <circle cx="23" cy="45" r="3.5" fill="#1E293B" stroke="#ffffff" stroke-width="1"/>
      <path d="M28 38l8-7h4" fill="none" stroke="${c.stroke}" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="35" y="25" width="18" height="18" rx="3" fill="${c.body}" stroke="${c.stroke}" stroke-width="1.5"/>
      <path d="M45 27h6a2 2 0 0 1 2 2v7h-8z" fill="#FEF3C7"/>
      <circle cx="39" cy="45" r="3.5" fill="#1E293B" stroke="#ffffff" stroke-width="1"/>
      <circle cx="49" cy="45" r="3.5" fill="#1E293B" stroke="#ffffff" stroke-width="1"/>
    `
    : `
      <!-- Stylized commercial vehicle profile -->
      <rect x="10" y="22" width="28" height="21" rx="3" fill="${c.body}" stroke="${c.stroke}" stroke-width="1.6"/>
      <path d="M38 26h9c2.5 0 4.5 2 5 4.8l1.2 6.2v6H38V26z" fill="${c.cab}" stroke="${c.stroke}" stroke-width="1.6"/>
      <path d="M40.5 29h6.2c1.4 0 2.5 1 2.8 2.4l.7 3.6H40.5V29z" fill="#E0F2FE"/>
      <line x1="14" y1="28" x2="34" y2="28" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.6" stroke-linecap="round"/>
      <line x1="14" y1="33" x2="29" y2="33" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="19" cy="44" r="4.5" fill="#1E293B" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="19" cy="44" r="1.6" fill="#CBD5E1"/>
      <circle cx="45" cy="44" r="4.5" fill="#1E293B" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="45" cy="44" r="1.6" fill="#CBD5E1"/>
    `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect x="2" y="2" width="60" height="60" rx="14" fill="${c.badgeBg}" stroke="${c.body}" stroke-opacity="0.28" stroke-width="1.5"/>
    ${truckSvg}
    ${customRibbon}
    ${overlaySvg}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createDefaultIconsMap(): Record<VehicleStateKey, VehicleModelIconSlot> {
  const result = {} as Record<VehicleStateKey, VehicleModelIconSlot>;
  for (const def of VEHICLE_STATE_DEFINITIONS) {
    result[def.key] = {
      stateKey: def.key,
      source: 'default',
      assetId: def.referenceFilename,
      previewUrl: getDefaultVehicleStateIconUrl(def.key),
    };
  }
  return result;
}

function createAcContainerCustomIconsMap(): Record<VehicleStateKey, VehicleModelIconSlot> {
  const base = createDefaultIconsMap();
  base.move = {
    stateKey: 'move',
    source: 'custom',
    assetId: 'ac_container_moving.svg',
    previewUrl: getDefaultVehicleStateIconUrl('move', 'customSample'),
    updatedAt: '2026-11-10',
    updatedBy: 'Platform Admin',
  };
  base.alarm = {
    stateKey: 'alarm',
    source: 'custom',
    assetId: 'ac_container_alarm.svg',
    previewUrl: getDefaultVehicleStateIconUrl('alarm', 'customSample'),
    updatedAt: '2026-11-10',
    updatedBy: 'Platform Admin',
  };
  return base;
}

export const SEED_VEHICLE_MODELS: VehicleModelRecord[] = [
  {
    id: 'VM-000101',
    manufacturer: 'Tata Motors',
    modelName: 'Prima 5530.S',
    variant: '6x4 BS6',
    vehicleType: 'Truck',
    vehicleSegment: 'HCV',
    modelYear: 2025,
    fuelType: 'Diesel',
    description: 'Heavy-duty tractor trailer configured for container and port terminal haulage.',
    fuelTankCapacityL: 365,
    payloadCapacityKg: 40000,
    seatingCapacity: 2,
    axleCount: 3,
    isAcVehicle: true,
    isAcReverse: false,
    isActive: true,
    icons: createDefaultIconsMap(),
    createdBy: 'Platform Admin',
    createdAt: '2026-10-12',
    updatedBy: 'Platform Admin',
    updatedAt: '2026-11-08',
  },
  {
    id: 'VM-000102',
    manufacturer: 'Tata Motors',
    modelName: 'Ultra T.16',
    variant: 'Standard',
    vehicleType: 'Truck',
    vehicleSegment: 'MCV',
    modelYear: 2025,
    fuelType: 'Diesel',
    description: 'Medium commercial logistics truck for regional distribution routes.',
    fuelTankCapacityL: 200,
    payloadCapacityKg: 10500,
    seatingCapacity: 3,
    axleCount: 2,
    isAcVehicle: false,
    isAcReverse: false,
    isActive: true,
    icons: createDefaultIconsMap(),
    createdBy: 'Platform Admin',
    createdAt: '2026-10-14',
    updatedBy: 'Platform Admin',
    updatedAt: '2026-11-08',
  },
  {
    id: 'VM-000103',
    manufacturer: 'Ashok Leyland',
    modelName: 'Dost+',
    variant: 'Standard',
    vehicleType: 'Pickup',
    vehicleSegment: 'LCV',
    modelYear: 2024,
    fuelType: 'Diesel',
    description: 'Last-mile light pickup for hub-to-spoke intra-city deliveries.',
    fuelTankCapacityL: 40,
    payloadCapacityKg: 1500,
    seatingCapacity: 2,
    axleCount: 2,
    isAcVehicle: false,
    isAcReverse: false,
    isActive: true,
    icons: createDefaultIconsMap(),
    createdBy: 'Platform Admin',
    createdAt: '2026-10-18',
    updatedBy: 'Platform Admin',
    updatedAt: '2026-11-09',
  },
  {
    id: 'VM-000104',
    manufacturer: 'Mahindra',
    modelName: 'Bolero Pik-Up',
    variant: 'Standard',
    vehicleType: 'Pickup',
    vehicleSegment: 'LCV',
    modelYear: 2024,
    fuelType: 'Diesel',
    description: 'Rugged utility pickup for port terminal maintenance and cargo.',
    fuelTankCapacityL: 57,
    payloadCapacityKg: 1700,
    seatingCapacity: 2,
    axleCount: 2,
    isAcVehicle: false,
    isAcReverse: false,
    isActive: true,
    icons: createDefaultIconsMap(),
    createdBy: 'Platform Admin',
    createdAt: '2026-10-20',
    updatedBy: 'Platform Admin',
    updatedAt: '2026-11-09',
  },
  {
    id: 'VM-000105',
    manufacturer: 'Eicher',
    modelName: 'Pro 2049',
    variant: 'Standard',
    vehicleType: 'Truck',
    vehicleSegment: 'LCV',
    modelYear: 2025,
    fuelType: 'Diesel',
    description: 'Compact light commercial cargo truck.',
    fuelTankCapacityL: 60,
    payloadCapacityKg: 2600,
    seatingCapacity: 3,
    axleCount: 2,
    isAcVehicle: false,
    isAcReverse: false,
    isActive: true,
    icons: createDefaultIconsMap(),
    createdBy: 'Platform Admin',
    createdAt: '2026-10-22',
    updatedBy: 'Platform Admin',
    updatedAt: '2026-11-09',
  },
  {
    id: 'VM-000106',
    manufacturer: 'Tata Motors',
    modelName: 'Starbus',
    variant: 'Standard',
    vehicleType: 'Bus',
    vehicleSegment: 'Passenger',
    modelYear: 2025,
    fuelType: 'Diesel',
    description: 'Employee shuttle and passenger transit coach.',
    fuelTankCapacityL: 160,
    payloadCapacityKg: '',
    seatingCapacity: 38,
    axleCount: 2,
    isAcVehicle: true,
    isAcReverse: false,
    isActive: true,
    icons: createDefaultIconsMap(),
    createdBy: 'Platform Admin',
    createdAt: '2026-10-25',
    updatedBy: 'Platform Admin',
    updatedAt: '2026-11-10',
  },
  {
    id: 'VM-000107',
    manufacturer: 'Force Motors',
    modelName: 'Traveller',
    variant: 'Standard',
    vehicleType: 'Van',
    vehicleSegment: 'Passenger',
    modelYear: 2024,
    fuelType: 'Diesel',
    description: 'Multi-purpose passenger & crew shuttle van.',
    fuelTankCapacityL: 70,
    payloadCapacityKg: '',
    seatingCapacity: 17,
    axleCount: 2,
    isAcVehicle: true,
    isAcReverse: false,
    isActive: true,
    icons: createDefaultIconsMap(),
    createdBy: 'Platform Admin',
    createdAt: '2026-10-27',
    updatedBy: 'Platform Admin',
    updatedAt: '2026-11-10',
  },
  {
    id: 'VM-000108',
    manufacturer: 'Generic',
    modelName: 'AC Container Van',
    variant: 'Custom',
    vehicleType: 'Truck',
    vehicleSegment: 'HCV',
    modelYear: 2025,
    fuelType: 'Diesel',
    description: 'Temperature-controlled cold-chain container van with custom moving and alarm state icons.',
    fuelTankCapacityL: 350,
    payloadCapacityKg: 24000,
    seatingCapacity: 2,
    axleCount: 3,
    isAcVehicle: true,
    isAcReverse: true,
    isActive: true,
    icons: createAcContainerCustomIconsMap(),
    createdBy: 'Platform Admin',
    createdAt: '2026-11-01',
    updatedBy: 'Platform Admin',
    updatedAt: '2026-11-10',
  },
  {
    id: 'VM-000109',
    manufacturer: 'Generic',
    modelName: 'Forklift Electric',
    variant: 'Standard',
    vehicleType: 'Heavy Equipment',
    vehicleSegment: 'Industrial',
    modelYear: 2023,
    fuelType: 'Electric',
    description: 'Warehouse & container yard electric forklift (decommissioned/inactive template).',
    fuelTankCapacityL: 0,
    payloadCapacityKg: 3500,
    seatingCapacity: 1,
    axleCount: 2,
    isAcVehicle: false,
    isAcReverse: false,
    isActive: false,
    icons: createDefaultIconsMap(),
    createdBy: 'Platform Admin',
    createdAt: '2026-11-03',
    updatedBy: 'Platform Admin',
    updatedAt: '2026-11-12',
  },
];

export const VEHICLE_MODEL_MASTER_STORAGE_KEY = 'fleetrobo_vehicle_model_master_v1';

export function loadVehicleModelStore(): VehicleModelRecord[] {
  try {
    const raw = localStorage.getItem(VEHICLE_MODEL_MASTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: VehicleModelRecord) => {
          const fallbackIcons = createDefaultIconsMap();
          const mergedIcons = { ...fallbackIcons };
          if (item.icons) {
            for (const def of VEHICLE_STATE_DEFINITIONS) {
              const slot = item.icons[def.key];
              if (slot && slot.previewUrl) {
                mergedIcons[def.key] = slot;
              }
            }
          }
          return {
            ...item,
            icons: mergedIcons,
          };
        });
      }
    }
  } catch {
    // fallback to seeds
  }
  return SEED_VEHICLE_MODELS;
}

export function saveVehicleModelStore(records: VehicleModelRecord[]): void {
  try {
    localStorage.setItem(VEHICLE_MODEL_MASTER_STORAGE_KEY, JSON.stringify(records));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fleetrobo:vehicle-models-updated'));
    }
  } catch {
    // ignore storage quota errors in demo
  }
}

export function resetVehicleModelStore(): VehicleModelRecord[] {
  saveVehicleModelStore(SEED_VEHICLE_MODELS);
  return SEED_VEHICLE_MODELS;
}

export function getActiveVehicleModels(records?: VehicleModelRecord[]): VehicleModelRecord[] {
  const list = records || loadVehicleModelStore();
  return list.filter((m) => m.isActive);
}

export function formatVehicleModelLabel(m: Pick<VehicleModelRecord, 'manufacturer' | 'modelName' | 'variant'>): string {
  const variantPart = m.variant?.trim() ? ` (${m.variant.trim()})` : '';
  return `${m.manufacturer} – ${m.modelName}${variantPart}`;
}

export function getNormalizedModelComboKey(
  manufacturer: string,
  modelName: string,
  variant?: string
): string {
  const norm = (val?: string) => (val || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${norm(manufacturer)}||${norm(modelName)}||${norm(variant || 'Standard')}`;
}

export function generateNextVehicleModelId(records: VehicleModelRecord[]): string {
  let maxNum = 100;
  for (const r of records) {
    const match = /^VM-(\d+)$/i.exec(r.id);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return `VM-${String(maxNum + 1).padStart(6, '0')}`;
}

export function getIconSetupSummary(model: VehicleModelRecord): {
  customCount: number;
  defaultCount: number;
  label: string;
} {
  let customCount = 0;
  for (const def of VEHICLE_STATE_DEFINITIONS) {
    if (model.icons?.[def.key]?.source === 'custom') {
      customCount += 1;
    }
  }
  const defaultCount = VEHICLE_STATE_DEFINITIONS.length - customCount;
  if (customCount === 0) {
    return { customCount: 0, defaultCount: 7, label: 'Default 7/7' };
  }
  return {
    customCount,
    defaultCount,
    label: `Custom ${customCount}/7 + Default ${defaultCount}/7`,
  };
}

export function countDependentVehicles(
  model: VehicleModelRecord,
  vehiclesList?: Vehicle[]
): number {
  const vehicles = vehiclesList || loadVehicleMasterStore() || INITIAL_VEHICLES;
  const formattedLabel = formatVehicleModelLabel(model).toLowerCase();
  const modelNameLower = model.modelName.trim().toLowerCase();
  return vehicles.filter((v) => {
    if (v.vehicle_model_id && v.vehicle_model_id === model.id) return true;
    const mm = (v.machine_model || v.model || '').trim().toLowerCase();
    return mm === formattedLabel || mm === modelNameLower;
  }).length;
}
