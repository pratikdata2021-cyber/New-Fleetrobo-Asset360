export type GatewayCategory =
  | 'GPS'
  | 'ADAS/DMS'
  | 'E-Lock'
  | 'CCTV'
  | 'IP Camera'
  | 'Face Terminal'
  | string;

export type SensorCategory = 'Temperature Sensor' | 'Fuel Sensor' | 'Door Sensor' | string;

export type HardwareLifecycleStatus =
  | 'Inventory'
  | 'Active'
  | 'In Maintenance'
  | 'Suspended'
  | 'Decommissioned'
  | 'Pending Hardware Review';

export type SimLifecycleStatus =
  | 'Inventory'
  | 'Active'
  | 'Suspended'
  | 'Inactive'
  | 'Retired';

export type EffectiveDeviceStatus =
  | 'Inventory'
  | 'Active'
  | 'In Maintenance'
  | 'Decommissioned';

export const DEVICE_EFFECTIVE_STATUS_OPTIONS: EffectiveDeviceStatus[] = [
  'Inventory',
  'Active',
  'In Maintenance',
  'Decommissioned'
];

export type DeviceMappingFilterStatus =
  | 'Active Mapping'
  | 'Scheduled'
  | 'Unmapped'
  | 'Historical/Ended';

export const DEVICE_MAPPING_FILTER_STATUS_OPTIONS: DeviceMappingFilterStatus[] = [
  'Active Mapping',
  'Scheduled',
  'Unmapped',
  'Historical/Ended'
];

export type EffectiveSensorStatus = EffectiveDeviceStatus;

export const SENSOR_EFFECTIVE_STATUS_OPTIONS: EffectiveSensorStatus[] = [
  'Inventory',
  'Active',
  'In Maintenance',
  'Decommissioned'
];

export type SensorMappingFilterStatus = DeviceMappingFilterStatus;

export const SENSOR_MAPPING_FILTER_STATUS_OPTIONS: SensorMappingFilterStatus[] = [
  'Active Mapping',
  'Scheduled',
  'Unmapped',
  'Historical/Ended'
];

export type EffectiveSimInventoryStatus = 'Inventory' | 'Active' | 'Suspended' | 'Retired';

export const SIM_EFFECTIVE_STATUS_OPTIONS: EffectiveSimInventoryStatus[] = [
  'Inventory',
  'Active',
  'Suspended',
  'Retired'
];

export type SimMappingAssignmentStatus =
  | 'Active Mapping'
  | 'Scheduled'
  | 'Unassigned'
  | 'Historical/Ended'
  | 'Conflict / Needs Attention';

export const SIM_MAPPING_ASSIGNMENT_STATUS_OPTIONS: SimMappingAssignmentStatus[] = [
  'Active Mapping',
  'Scheduled',
  'Unassigned',
  'Historical/Ended',
  'Conflict / Needs Attention'
];

export interface HardwareAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  summary: string;
}

export interface DeviceRecord {
  id: string;
  deviceId: string;
  name: string;
  kind: GatewayCategory;
  role: 'gateway';
  manufacturer: string;
  modelText: string;
  modelTypeId?: string;
  identifierType?: string;
  mode: string;
  modes?: string[];
  serial: string;
  imei: string;
  capabilities: string[];
  platformProtocol: string;
  platformProtocols?: string[];
  company: string;
  inventoryLocation: string;
  hardwareLifecycle: HardwareLifecycleStatus;
  statusOverride?: 'In Maintenance' | 'Decommissioned' | null;
  legacyStatusMetadata?: {
    originalHardwareLifecycle?: string;
    pendingHardwareReview?: boolean;
    migratedAt?: string;
  };
  registeredAt: string;
  updatedAt: string;
  channelCount: number;
  simSlots?: number;
  supportedPorts?: string[];
  notes: string;
}

export interface SensorRecord {
  id: string;
  deviceId: string;
  name: string;
  kind: SensorCategory;
  role: 'peripheral';
  category: SensorCategory;
  manufacturer: string;
  modelText: string;
  modelTypeId?: string;
  identifierType?: string;
  serial: string;
  capabilities: string[];
  measurementCapability: 'Temperature' | 'Fuel level' | 'Door State' | string;
  measurementUnit: '°C' | '°F' | 'L' | '%' | 'State' | string;
  measurementRange: string;
  company: string;
  inventoryLocation: string;
  hardwareLifecycle: HardwareLifecycleStatus;
  statusOverride?: 'In Maintenance' | 'Decommissioned' | null;
  legacyStatusMetadata?: {
    originalHardwareLifecycle?: string;
    pendingHardwareReview?: boolean;
    migratedAt?: string;
  };
  auditHistory?: HardwareAuditEntry[];
  registeredAt: string;
  updatedAt: string;
  notes: string;
}

export interface SimRecord {
  id: string;
  iccid: string;
  msisdn: string;
  operator: 'Airtel' | 'Jio' | 'Vi' | 'BSNL' | 'Vodafone Idea' | 'Other' | string;
  plan:
    | 'IoT Business 10GB'
    | 'Enterprise M2M 2GB'
    | 'IoT Video 30GB'
    | 'IoT 5GB'
    | 'M2M 500MB'
    | string;
  formFactor: 'Nano (4FF)' | 'Micro (3FF)' | 'Triple (2FF/3FF/4FF)' | 'eSIM' | string;
  network: string;
  owner: string;
  location: string;
  status: SimLifecycleStatus;
  activationDate: string;
  renewalDate: string;
  notes: string;
  category?: string;
  modelTypeId?: string;
  identifierType?: string;
  serviceMode?: string;
  auditHistory?: HardwareAuditEntry[];
}

export type HardwareCategory = 'Device' | 'Sensor' | 'SIM';
export type HardwareBindingMode = 'Permanent' | 'Temporal';
export type HardwareBindingStatus = 'Scheduled' | 'Active' | 'Ended' | 'Conflict' | 'Canceled';
export type ConnectionLifecycleStatus = 'Draft' | 'Scheduled' | 'Active' | 'Inactive' | 'Needs Attention';
export type ResourceAllocationStatus = 'Scheduled' | 'Active' | 'Ended' | 'Conflict';
export type ResourceType = 'Vehicle' | 'Driver' | 'Fleet' | 'Vendor' | 'Place' | 'Equipment';

export interface HardwareMembership {
  hardwareId: string;
  category: HardwareCategory;
  modelTypeId: string;
  modelLabel: string;
  identifierType: string;
  identifierValue: string;
  registrationStatus: string;
  isPrimary?: boolean;
}

export interface ConnectionActivityEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  beforeSummary?: string;
  afterSummary: string;
}

export interface ConnectionRecord {
  id: string; // e.g. CON-1277
  connectionId: string;
  companyId: string;
  companyName: string;
  name: string;
  description?: string;
  site?: string;
  memberIds: string[];
  members: HardwareMembership[];
  status: ConnectionLifecycleStatus;
  verification?: string;
  notes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  activity: ConnectionActivityEntry[];
  // Optional compatibility references
  hardwareId?: string;
  parentId?: string;
  simId?: string;
}

export interface HardwareBinding {
  id: string; // e.g. BND-3001
  connectionId: string;
  fromHardwareId: string;
  toHardwareId: string;
  mode: HardwareBindingMode;
  effectiveStartAt: string; // ISO 8601 with offset e.g. 2026-11-12T10:30:00+05:30
  effectiveEndAt?: string | null;
  endedAt?: string | null;
  endReason?: string;
  timezone: string; // e.g. Asia/Kolkata
  portOrSlot?: string | null;
  notes?: string;
  statusOverride?: 'Canceled';
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAllocation {
  id: string; // e.g. RCA-2041
  companyId: string;
  companyName: string;
  connectionId: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceIdentifier: string; // Vehicle Registration No. or Driver Contact No.
  resourceDisplayName: string;
  hardwareId?: string | null; // null = Whole connection / All hardware in connection
  mode: HardwareBindingMode;
  effectiveStartAt: string;
  effectiveEndAt?: string | null;
  endedAt?: string | null;
  endReason?: string;
  unassignedBy?: string;
  timezone: string;
  site?: string;
  assignedBy: string;
  assignedOn: string;
  updatedAt: string;
  notes?: string;
}

export type ResourceRelationshipStatus = 'Scheduled' | 'Active' | 'Ended' | 'Conflict';

export interface ResourceRelationshipHistoryEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: 'Created' | 'Updated' | 'Ended' | 'Removed';
  summary: string;
  snapshot?: {
    relationshipCode: string;
    relationshipType: string;
    targetResourceType: ResourceType;
    targetResourceId: string;
    targetResourceIdentifier: string;
    mode: HardwareBindingMode;
    effectiveStartAt: string;
    effectiveEndAt?: string | null;
    timezone: string;
    notes?: string;
  };
}

export interface ResourceRelationship {
  id: string; // e.g. REL-4001
  companyId: string;
  companyName: string;
  sourceResourceType: ResourceType;
  sourceResourceId: string;
  sourceResourceIdentifier: string;
  sourceResourceDisplayName: string;
  relationshipCode: string;
  relationshipType: string;
  targetResourceType: ResourceType;
  targetResourceId: string;
  targetResourceIdentifier: string;
  targetResourceDisplayName: string;
  mode: HardwareBindingMode;
  effectiveStartAt: string;
  effectiveEndAt?: string | null;
  endedAt?: string | null;
  endReason?: string;
  timezone: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  history: ResourceRelationshipHistoryEntry[];
}

export interface ResourceRelationshipRule {
  code: string;
  label: string;
  sourceType: ResourceType;
  targetType: ResourceType;
  allowMultiplePerSource: boolean;
  allowMultiplePerTarget: boolean;
  preventCycles?: boolean;
  enabled: boolean;
  isCustom?: boolean;
  description: string;
}

// Legacy compatibility types for ResourceRecord / SimAssignmentEvent
export interface ResourceRecord {
  id: string;
  code: string;
  name: string;
  type: ResourceType;
  company: string;
  site: string;
  status: 'Active' | 'Available' | 'Maintenance';
}

export interface BindingRecord {
  id: string;
  type: 'device_resource' | 'sensor_device' | 'resource_resource';
  subjectId: string;
  sourceType?: ResourceType | 'Device' | 'Sensor';
  targetType: ResourceType | 'Device';
  targetId: string;
  port?: string;
  interface?: string;
  mode: 'Permanent' | 'Temporal';
  start: string;
  end: string;
  endedAt?: string;
  status: 'Active' | 'Scheduled' | 'Ended' | 'Inactive';
  verification: string;
  site?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SimAssignmentEvent {
  id: string;
  simId: string;
  iccid: string;
  connectionId: string;
  hardwareId: string;
  hardwareName: string;
  start: string;
  end: string;
}

export interface SavedModalView {
  id: string;
  pageId: 'devices' | 'sensors' | 'sims' | 'connections' | 'resources';
  companyScope?: string;
  name: string;
  query: string;
  filters: Record<string, string>;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  hiddenCols: string[];
  density?: 'comfortable' | 'compact';
}

export const MODAL_OWNERS = [
  'Adani Mundra',
  'Adanimundra SMNL',
  'Central Store',
  'CT2 Terminal',
  'CT3 Terminal',
  'CT4 Terminal',
  'CT5 Terminal',
  'Adani Port',
  'SIS Cash',
  'Akshaykalpa',
  'AKPL'
];

export const COMPANY_NAME_TO_ID: Record<string, string> = {
  'Adani Mundra': 'comp-adani-mundra',
  'Adanimundra SMNL': 'comp-adanimundra-smnl',
  'Central Store': 'comp-central-store',
  'CT2 Terminal': 'comp-ct2-terminal',
  'CT3 Terminal': 'comp-ct3-terminal',
  'CT4 Terminal': 'comp-ct4-terminal',
  'CT5 Terminal': 'comp-ct5-terminal',
  'Adani Port': 'comp-adani-port',
  'SIS Cash': 'comp-sis-cash',
  Akshaykalpa: 'comp-akshaykalpa',
  AKPL: 'comp-akpl',
  'Platform Admin': 'comp-binary',
  Binary: 'comp-binary'
};

export const MODAL_LOCATIONS = [
  'Mundra CT2',
  'Mundra South Basin',
  'Hazira Terminal',
  'Chennai CFS',
  'Pune Hub',
  'Gurugram Warehouse',
  'Bengaluru Cold Hub'
];

export const SUPPORTED_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'IST (UTC +05:30)', abbr: 'IST', offset: '+05:30' },
  { value: 'UTC', label: 'UTC (UTC +00:00)', abbr: 'UTC', offset: '+00:00' },
  { value: 'Asia/Dubai', label: 'GST (UTC +04:00)', abbr: 'GST', offset: '+04:00' },
  { value: 'Asia/Singapore', label: 'SGT (UTC +08:00)', abbr: 'SGT', offset: '+08:00' }
] as const;

export const RESOURCE_TYPES: ResourceType[] = [
  'Vehicle',
  'Driver',
  'Fleet',
  'Vendor',
  'Place',
  'Equipment'
];

export const HARDWARE_LIFECYCLE_OPTIONS: HardwareLifecycleStatus[] = [
  'Inventory',
  'Active',
  'In Maintenance',
  'Suspended',
  'Decommissioned',
  'Pending Hardware Review'
];

export const SIM_LIFECYCLE_OPTIONS: SimLifecycleStatus[] = [
  'Inventory',
  'Active',
  'Suspended',
  'Inactive',
  'Retired'
];

export const SIM_OPERATORS: SimRecord['operator'][] = [
  'Airtel',
  'Jio',
  'Vi',
  'BSNL',
  'Vodafone Idea',
  'Other'
];

export const SIM_PLANS: SimRecord['plan'][] = [
  'IoT Business 10GB',
  'Enterprise M2M 2GB',
  'IoT Video 30GB',
  'IoT 5GB',
  'M2M 500MB'
];

export const SIM_FORM_FACTORS: SimRecord['formFactor'][] = [
  'Nano (4FF)',
  'Micro (3FF)',
  'Triple (2FF/3FF/4FF)',
  'eSIM'
];

export const DEVICE_CATALOGUE: Record<
  GatewayCategory,
  {
    manufacturers: Record<
      string,
      {
        models: {
          model: string;
          capabilities: string[];
          channelCount: number;
          defaultProtocol: string;
        }[];
      }
    >;
    modes: string[];
    defaultModeOnSelect: string;
    protocols: string[];
  }
> = {
  GPS: {
    manufacturers: {
      Teltonika: {
        models: [
          { model: 'FMB140', capabilities: ['Cellular', 'BLE', 'RS485'], channelCount: 4, defaultProtocol: 'Codec8' },
          { model: 'FMB120', capabilities: ['Cellular', 'BLE', 'RS485'], channelCount: 4, defaultProtocol: 'Codec8' }
        ]
      },
      Queclink: {
        models: [
          { model: 'GV300', capabilities: ['Cellular', 'RS485', 'TCP'], channelCount: 4, defaultProtocol: 'TCP' }
        ]
      }
    },
    modes: ['GPS tracking', 'Vehicle monitoring'],
    defaultModeOnSelect: 'GPS tracking',
    protocols: ['MQTT', 'TCP', 'Codec8']
  },
  'ADAS/DMS': {
    manufacturers: {
      Mettax: {
        models: [
          { model: 'MC202N', capabilities: ['Cellular', 'AHD', 'RS485', 'BLE', 'Wi-Fi'], channelCount: 4, defaultProtocol: 'Metta' },
          { model: 'MC202L', capabilities: ['Cellular', 'AHD', 'RS485'], channelCount: 2, defaultProtocol: 'Metta' }
        ]
      },
      MettaX: {
        models: [
          { model: 'MC202N', capabilities: ['Cellular', 'AHD', 'RS485', 'BLE', 'Wi-Fi'], channelCount: 4, defaultProtocol: 'Metta' },
          { model: 'MC202L', capabilities: ['Cellular', 'AHD', 'RS485'], channelCount: 2, defaultProtocol: 'Metta' }
        ]
      },
      Streamax: {
        models: [
          { model: 'XVR-410', capabilities: ['Cellular', 'AHD', 'RS485', 'Ethernet'], channelCount: 4, defaultProtocol: 'Streamax Protocol' },
          { model: 'C6D', capabilities: ['Cellular', 'AHD', 'RS485', 'Ethernet'], channelCount: 6, defaultProtocol: 'Streamax Protocol' }
        ]
      }
    },
    modes: ['ADAS', 'DMS'],
    defaultModeOnSelect: 'ADAS',
    protocols: ['Metta', 'BSL', 'Streamax API', 'Streamax Protocol']
  },
  'E-Lock': {
    manufacturers: {
      Jointech: {
        models: [
          { model: 'JT701', capabilities: ['Cellular', 'BLE', 'RFID'], channelCount: 1, defaultProtocol: 'MQTT' }
        ]
      }
    },
    modes: ['Standard', 'Active'],
    defaultModeOnSelect: 'Standard',
    protocols: ['MQTT', 'TCP', 'Codec8']
  },
  CCTV: {
    manufacturers: {
      Streamax: {
        models: [
          { model: 'XVR-410', capabilities: ['AHD', 'Ethernet', 'Cellular', 'RS485'], channelCount: 4, defaultProtocol: 'Streamax Protocol' }
        ]
      },
      Hikvision: {
        models: [
          { model: 'DS-7104HGHI-M1/T', capabilities: ['AHD', 'Ethernet', 'ISUP', 'ONVIF'], channelCount: 4, defaultProtocol: 'ISUP' },
          { model: 'DS-7108HGHI-M1/T', capabilities: ['AHD', 'Ethernet', 'ISUP', 'ONVIF'], channelCount: 8, defaultProtocol: 'ISUP' }
        ]
      }
    },
    modes: ['Cam1', 'Cam2', 'Cam3', 'Cam4', 'Cam5', 'Cam6'],
    defaultModeOnSelect: 'Cam1',
    protocols: ['ISUP', 'ONVIF', 'RTSP']
  },
  'IP Camera': {
    manufacturers: {
      Hikvision: {
        models: [
          { model: 'DS-2CD2043G2-I', capabilities: ['Ethernet', 'ONVIF', 'RTSP', 'ISUP'], channelCount: 1, defaultProtocol: 'ONVIF' }
        ]
      }
    },
    modes: ['Cam1', 'Cam2', 'Cam3', 'Cam4', 'Cam5', 'Cam6'],
    defaultModeOnSelect: 'Cam1',
    protocols: ['ISUP', 'ONVIF', 'RTSP']
  },
  'Face Terminal': {
    manufacturers: {
      Hikvision: {
        models: [
          { model: 'DS-K1T671M', capabilities: ['Ethernet', 'Wi-Fi', 'RS485', 'ISUP'], channelCount: 1, defaultProtocol: 'ISUP' }
        ]
      }
    },
    modes: ['Standard', 'Active'],
    defaultModeOnSelect: 'Standard',
    protocols: ['ISUP', 'ONVIF', 'RTSP']
  }
};

export const SENSOR_CATALOGUE: Record<
  string,
  {
    measurementCapability: string;
    units: string[];
    defaultUnit: string;
    manufacturers: Record<
      string,
      {
        models: {
          model: string;
          capabilities: string[];
          defaultRange: string;
        }[];
      }
    >;
  }
> = {
  'Temperature Sensor': {
    measurementCapability: 'Temperature',
    units: ['°C', '°F'],
    defaultUnit: '°C',
    manufacturers: {
      Teltonika: {
        models: [{ model: 'EYE Sensor', capabilities: ['BLE'], defaultRange: '−40 to +85 °C' }]
      },
      Sensitech: {
        models: [{ model: 'TempTale BLE', capabilities: ['BLE'], defaultRange: '−30 to +70 °C' }]
      },
      Monnit: {
        models: [{ model: 'ALTA Wi-Fi Temperature', capabilities: ['Wi-Fi', 'MQTT'], defaultRange: '−40 to +125 °C' }]
      }
    }
  },
  'Fuel Sensor': {
    measurementCapability: 'Fuel level',
    units: ['L', '%'],
    defaultUnit: 'L',
    manufacturers: {
      Escort: {
        models: [
          { model: 'TD-BLE', capabilities: ['BLE'], defaultRange: '0–600 L' },
          { model: 'DU-BLE', capabilities: ['BLE'], defaultRange: '0–1000 L' }
        ]
      },
      Omnicomm: {
        models: [{ model: 'LLS 5', capabilities: ['RS485'], defaultRange: '0–1200 L' }]
      }
    }
  },
  'Door Sensor': {
    measurementCapability: 'Door State',
    units: ['State'],
    defaultUnit: 'State',
    manufacturers: {
      Generic: {
        models: [{ model: 'DS-100', capabilities: ['BLE'], defaultRange: 'Open / Closed' }]
      }
    }
  }
};

export const MODAL_FIELD_TOOLTIPS = {
  device: {
    name: 'Human-readable name for this physical Device unit.',
    deviceId: 'Stable internal identifier used across hardware, connections, and Resource relationships.',
    kind: 'Device type defined in global Model Category Master and enabled for the client.',
    company: 'Client enterprise owning this physical device record.',
    manufacturer: 'Hardware vendor or manufacturer.',
    modelText: 'Manufacturer model reference.',
    mode: 'Device-specific operating mode.',
    serial: 'Unique physical serial printed on the device.',
    imei: 'IMEI identifier for cellular-capable devices.',
    platformProtocol: 'Application-level integration used by FleetRobo.',
    inventoryLocation: 'Warehouse or operational site where the hardware is held.',
    hardwareLifecycle: 'Physical inventory status, independent of a Modal Mapping connection.',
    channelCount: 'Number of physical ports/channels supported by this device model.',
    notes: 'Optional internal notes for setup and audit history.'
  },
  sensor: {
    name: 'Human-readable name for this physical Sensor unit.',
    deviceId: 'Stable internal identifier (Sensor ID) for this physical unit.',
    kind: 'Sensor type defined in global Model Category Master and enabled for the client.',
    serial: 'Unique physical serial printed on the sensor.',
    manufacturer: 'Sensor vendor or manufacturer.',
    modelText: 'Manufacturer model reference.',
    measurementCapability: 'Physical quantity measured by this sensor.',
    measurementUnit: 'Physical unit of measurement reported by the sensor.',
    measurementRange: 'Supported measurement range.',
    capabilities: 'Supported communication bus or network interfaces.',
    company: 'Client enterprise owning this sensor unit.',
    inventoryLocation: 'Warehouse or operational site.',
    hardwareLifecycle: 'Physical inventory status.',
    notes: 'Optional internal notes.'
  },
  sim: {
    iccid: 'Unique 18–22 digit physical SIM identifier.',
    msisdn: 'Optional mobile number associated with the SIM.',
    formFactor: 'Physical SIM size or eSIM profile.',
    operator: 'Telecom network operator/provider.',
    plan: 'Carrier package or data allowance.',
    owner: 'Client company holding the SIM inventory.',
    location: 'Warehouse or operational site.',
    status: 'SIM lifecycle state.',
    activationDate: 'Carrier activation date.',
    renewalDate: 'SIM renewal or expiry date.',
    notes: 'Optional internal notes.'
  },
  mapping: {
    connectionName: 'Readable name of this overall mapping. Does not need to match a hardware model.',
    connectionId: 'Permanent record ID generated by FleetRobo; not a device IMEI/serial or ICCID.',
    description: 'Optional site/use-case notes for this mapping.',
    site: 'Optional client site context associated with the mapping.',
    category: 'Device, Sensor, or SIM only. Gateways are classified as Device.',
    enabledModelType: 'Only globally active models enabled for this client in Company Management → Model Access can be selected.',
    identifierType: 'Read-only expected identifier format from the selected model definition (e.g., IMEI, Serial Number, Sensor ID, ICCID).',
    searchIdentifier: 'Search actual registered physical hardware owned by this client using partial or full identifier.',
    fromHardware: 'First endpoint of this relationship. A Device can be a parent for another Device, Sensor, or SIM when supported.',
    toHardware: 'Second endpoint. Cannot select the same physical unit as both sides.',
    portOrSlot: 'Optional documented port or SIM slot when supported by the parent Device.',
    bindingMode: 'Permanent = starts at a specified time with no preset end. Temporal = defined start and end period.',
    effectiveStart: 'Exact date and time (with seconds) from which this pairwise relationship is valid.',
    effectiveEnd: 'Exact end of this particular hardware relationship. Required only for Temporal.',
    timezone: 'Timezone in which the entered local date and time is interpreted.',
    bindingNotes: 'Why this pair was connected or changed; useful for maintenance audit.',
    vehicleSearch: 'Search client Vehicle Master by Vehicle Registration No. (e.g. MH26AH1192).',
    driverSearch: 'Search client Driver Master by Driver Contact No. (e.g. 9876543210). Driver allocation is optional and independent of hardware bindings.',
    allocationScope: 'Whether the resource applies to the whole connection or a specific registered hardware unit.',
    allocationStart: 'Exact local date and time when this resource allocation becomes effective.',
    allocationEnd: 'Exact end of this allocation, when applicable.'
  }
};

export interface ModalColumnDef {
  key: string;
  label: string;
  minWidth: string;
  tooltip?: string;
  optional?: boolean;
}

export const DEVICE_COLUMNS: ModalColumnDef[] = [
  { key: 'company', label: 'Organization', minWidth: '165px' },
  { key: 'name', label: 'Device name', minWidth: '230px' },
  { key: 'deviceId', label: 'Device ID', minWidth: '120px' },
  { key: 'kind', label: 'Device category', minWidth: '145px' },
  { key: 'manufacturer', label: 'Vendor / Manufacturer', minWidth: '155px' },
  { key: 'modelText', label: 'Model', minWidth: '145px' },
  { key: 'identifierType', label: 'Identifier type', minWidth: '130px' },
  { key: 'mode', label: 'Mode', minWidth: '135px' },
  { key: 'platformProtocol', label: 'Platform protocol', minWidth: '145px' },
  { key: 'channelCount', label: 'Channels', minWidth: '95px' },
  { key: 'serial', label: 'Serial number', minWidth: '150px' },
  { key: 'imei', label: 'IMEI', minWidth: '160px' },
  { key: 'hardwareLifecycle', label: 'Device status', minWidth: '140px' },
  { key: 'registeredAt', label: 'Registered', minWidth: '120px' },
  { key: 'updatedAt', label: 'Updated', minWidth: '120px' }
];

export const SENSOR_COLUMNS: ModalColumnDef[] = [
  { key: 'company', label: 'Organization', minWidth: '165px' },
  { key: 'name', label: 'Sensor name', minWidth: '235px' },
  { key: 'deviceId', label: 'Sensor ID', minWidth: '130px' },
  { key: 'kind', label: 'Sensor type', minWidth: '155px' },
  { key: 'manufacturer', label: 'Vendor / Manufacturer', minWidth: '155px' },
  { key: 'modelText', label: 'Model', minWidth: '155px' },
  { key: 'identifierType', label: 'Identifier type', minWidth: '130px' },
  { key: 'serial', label: 'Serial number', minWidth: '155px' },
  { key: 'measurementCapability', label: 'Measurement capability', minWidth: '165px' },
  { key: 'measurementUnit', label: 'Measurement unit', minWidth: '135px' },
  { key: 'measurementRange', label: 'Measurement range', minWidth: '145px' },
  { key: 'hardwareLifecycle', label: 'Sensor status', minWidth: '140px' },
  { key: 'registeredAt', label: 'Registered', minWidth: '120px' },
  { key: 'updatedAt', label: 'Updated', minWidth: '120px' }
];

export const SIM_COLUMNS: ModalColumnDef[] = [
  { key: 'owner', label: 'Organization', minWidth: '165px' },
  { key: 'iccid', label: 'ICCID', minWidth: '190px' },
  { key: 'id', label: 'SIM ID', minWidth: '115px' },
  { key: 'category', label: 'SIM category', minWidth: '135px' },
  { key: 'operator', label: 'Operator / Provider', minWidth: '145px' },
  { key: 'plan', label: 'Plan / package', minWidth: '160px' },
  { key: 'formFactor', label: 'Form factor', minWidth: '135px' },
  { key: 'network', label: 'Network', minWidth: '115px' },
  { key: 'msisdn', label: 'Mobile number', minWidth: '145px' },
  { key: 'status', label: 'SIM status', minWidth: '140px' },
  { key: 'activationDate', label: 'Activation date', minWidth: '130px' },
  { key: 'renewalDate', label: 'Renewal / expiry date', minWidth: '155px' }
];

// Mandatory Default Columns for Assets Connection (aligned with Create Mapping fields)
export const MODAL_CONNECTION_DEFAULT_COLUMNS: ModalColumnDef[] = [
  {
    key: 'companyName',
    label: 'ORGANIZATION',
    minWidth: '165px',
    tooltip: 'Client organization owning this mapping.'
  },
  {
    key: 'resourceAllocation',
    label: 'RESOURCES',
    minWidth: '220px',
    tooltip: 'Mapped Vehicle, Driver, Fleet, Vendor, Place, and Equipment records from the client masters.'
  },
  {
    key: 'connectedHardware',
    label: 'CONNECTED HARDWARE',
    minWidth: '250px',
    tooltip: 'The registered Device, Sensor and SIM units included in the mapping. Click to inspect identifiers and models.'
  },
  {
    key: 'deviceCount',
    label: 'DEVICES',
    minWidth: '100px',
    tooltip: 'Number of Device records in this mapping. Gateways are counted as Devices.'
  },
  {
    key: 'sensorCount',
    label: 'SENSORS',
    minWidth: '100px',
    tooltip: 'Number of registered Sensors in this mapping, including standalone sensors.'
  },
  {
    key: 'simCount',
    label: 'SIMS',
    minWidth: '90px',
    tooltip: 'Number of SIM records selected for this mapping; each SIM is identified by its ICCID.'
  },
  {
    key: 'bindingCount',
    label: 'BINDINGS',
    minWidth: '105px',
    tooltip: 'Number of recorded pairwise relationships (Resource→Hardware, Device→Sensor, Device→SIM), each with independent effective date and time.'
  },
  {
    key: 'status',
    label: 'STATUS',
    minWidth: '135px',
    tooltip: 'Mapping lifecycle status. A mapping may contain bindings with different periods or statuses; inspect Bindings for details.'
  },
  {
    key: 'updatedAt',
    label: 'UPDATED ON',
    minWidth: '175px',
    tooltip: 'Most recent change to this mapping or its membership/bindings.'
  }
];

// Optional Columns for Assets Connection (default hidden)
export const MODAL_CONNECTION_OPTIONAL_COLUMNS: ModalColumnDef[] = [
  {
    key: 'hardwareIdentifiers',
    label: 'HARDWARE IDENTIFIERS',
    minWidth: '220px',
    optional: true,
    tooltip: 'Unique unit identifiers of all registered hardware in this mapping.'
  },
  {
    key: 'bindingHealth',
    label: 'BINDING HEALTH',
    minWidth: '140px',
    optional: true,
    tooltip: 'Validation summary across individual hardware bindings; not live device connectivity.'
  },
  {
    key: 'bindingStatusCounts',
    label: 'ACTIVE / SCHEDULED / ENDED',
    minWidth: '185px',
    optional: true,
    tooltip: 'Counts of binding periods by their effective date-time status.'
  },
  {
    key: 'effectiveFromEarliest',
    label: 'EFFECTIVE FROM (EARLIEST)',
    minWidth: '185px',
    optional: true,
    tooltip: 'Earliest pairwise binding effective start; individual start times may differ.'
  },
  {
    key: 'effectiveToLatest',
    label: 'EFFECTIVE TO (LATEST)',
    minWidth: '185px',
    optional: true,
    tooltip: "Summary only; open the Bindings list for each relationship's exact end date and time."
  },
  {
    key: 'createdBy',
    label: 'CREATED BY',
    minWidth: '140px',
    optional: true,
    tooltip: 'Original mapping creator.'
  },
  {
    key: 'createdAt',
    label: 'CREATED ON',
    minWidth: '175px',
    optional: true,
    tooltip: 'When the mapping record was first saved.'
  },
  {
    key: 'updatedBy',
    label: 'LAST UPDATED BY',
    minWidth: '145px',
    optional: true,
    tooltip: 'Person who last modified this mapping or its relationships.'
  }
];

export const ALL_MODAL_CONNECTION_COLUMNS: ModalColumnDef[] = [
  ...MODAL_CONNECTION_DEFAULT_COLUMNS,
  ...MODAL_CONNECTION_OPTIONAL_COLUMNS
];

export const MODAL_CONNECTION_SELECT_TOOLTIP =
  'Select connections for permitted bulk operations. Selection does not change records until an action is confirmed.';
export const MODAL_CONNECTION_ACTIONS_TOOLTIP =
  'View details, edit the mapping, or open additional permitted lifecycle actions.';

// Default Columns for Resource Connection View (aligned with Create Mapping fields)
export const RESOURCE_VIEW_DEFAULT_COLUMNS: ModalColumnDef[] = [
  {
    key: 'companyName',
    label: 'ORGANIZATION',
    minWidth: '165px',
    tooltip: 'Client organization owning this resource allocation.'
  },
  {
    key: 'resourceType',
    label: 'RESOURCE TYPE',
    minWidth: '130px',
    tooltip: 'Type of existing client-owned resource being allocated.'
  },
  {
    key: 'resourceIdentifier',
    label: 'RESOURCE IDENTIFIER',
    minWidth: '175px',
    tooltip: 'Lookup key of this client resource; vehicle uses registration number and driver uses mobile/contact number.'
  },
  {
    key: 'assignedHardware',
    label: 'ASSIGNED HARDWARE',
    minWidth: '195px',
    tooltip: 'Summary of Devices, Sensors, and SIMs assigned under this allocation scope. Expand row to inspect exact relationships.'
  },
  {
    key: 'bindingCount',
    label: 'BINDINGS',
    minWidth: '100px',
    tooltip: 'Count of hardware-to-hardware bindings active or scheduled within this allocation scope.'
  },
  {
    key: 'status',
    label: 'STATUS',
    minWidth: '125px',
    tooltip: 'Allocation status derived from its validity period and validation.'
  }
];

export const RESOURCE_VIEW_OPTIONAL_COLUMNS: ModalColumnDef[] = [
  {
    key: 'effectiveStartAt',
    label: 'EFFECTIVE START',
    minWidth: '175px',
    optional: true,
    tooltip: 'Exact local date and time when this resource allocation becomes effective.'
  },
  {
    key: 'effectiveEndAt',
    label: 'EFFECTIVE END',
    minWidth: '175px',
    optional: true,
    tooltip: 'Exact end of this allocation, when applicable.'
  },
  {
    key: 'assignedBy',
    label: 'ASSIGNED BY',
    minWidth: '140px',
    optional: true,
    tooltip: 'Actor who created this resource allocation.'
  },
  {
    key: 'assignedOn',
    label: 'ASSIGNED ON',
    minWidth: '170px',
    optional: true,
    tooltip: 'Timestamp when this resource allocation was saved.'
  },
  {
    key: 'unassignedBy',
    label: 'UNASSIGNED BY',
    minWidth: '145px',
    optional: true,
    tooltip: 'Actor who ended this resource allocation.'
  },
  {
    key: 'endReason',
    label: 'END REASON',
    minWidth: '180px',
    optional: true,
    tooltip: 'Recorded reason when an allocation was ended.'
  },
  {
    key: 'mode',
    label: 'BINDING MODE',
    minWidth: '130px',
    optional: true,
    tooltip: 'Permanent or Temporal validity mode for this allocation.'
  },
  {
    key: 'driverDisplayName',
    label: 'DRIVER NAME',
    minWidth: '170px',
    optional: true,
    tooltip: 'Driver name from Driver Master when Resource Type is Driver.'
  },
  {
    key: 'vehicleDisplayName',
    label: 'VEHICLE NAME',
    minWidth: '185px',
    optional: true,
    tooltip: 'Vehicle display label from Vehicle Master when Resource Type is Vehicle.'
  },
  {
    key: 'updatedAt',
    label: 'UPDATED ON',
    minWidth: '170px',
    optional: true,
    tooltip: 'Most recent update timestamp for this allocation record.'
  }
];

export const ALL_RESOURCE_VIEW_COLUMNS: ModalColumnDef[] = [
  ...RESOURCE_VIEW_DEFAULT_COLUMNS,
  ...RESOURCE_VIEW_OPTIONAL_COLUMNS
];

export const RESOURCE_VIEW_SELECT_TOOLTIP = 'Select resource allocations for permitted bulk actions.';
export const RESOURCE_VIEW_ACTIONS_TOOLTIP = 'Manage this allocation without changing unrelated hardware bindings.';

// Helper: Resolve primary physical identifier value from hardware unit based on its identifierType
export function resolveHardwareIdentifierValue(
  rec: DeviceRecord | SensorRecord | SimRecord,
  category: HardwareCategory,
  expectedIdentifierType?: string
): string {
  if (category === 'SIM') {
    return (rec as SimRecord).iccid;
  }
  const hw = rec as DeviceRecord | SensorRecord;
  const idType = (expectedIdentifierType || hw.identifierType || '').toLowerCase();
  if (idType.includes('imei')) {
    return (hw as DeviceRecord).imei || hw.serial || hw.deviceId;
  }
  if (idType.includes('serial')) {
    return hw.serial || hw.deviceId;
  }
  if (idType.includes('sensor') || idType.includes('device')) {
    return hw.deviceId || hw.serial;
  }
  return (hw as DeviceRecord).imei || hw.serial || hw.deviceId;
}

// Helper: Check half-open intervals [startA, endA) vs [startB, endB)
export function dateTimeIntervalsOverlap(
  startA: string,
  endA: string | null | undefined,
  startB: string,
  endB: string | null | undefined
): boolean {
  const sA = Date.parse(startA);
  const eA = endA ? Date.parse(endA) : Number.POSITIVE_INFINITY;
  const sB = Date.parse(startB);
  const eB = endB ? Date.parse(endB) : Number.POSITIVE_INFINITY;
  if (Number.isNaN(sA) || Number.isNaN(sB)) return false;
  return sA < eB && sB < eA;
}

// Legacy date-only interval helper kept for backward compat
export function intervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const sA = startA || '0000-01-01';
  const eA = endA || '9999-12-31';
  const sB = startB || '0000-01-01';
  const eB = endB || '9999-12-31';
  return sA <= eB && sB <= eA;
}

// Helper: Check if directed binding graph has cycle over overlapping periods
export function hasBindingCycle(
  candidate: Pick<HardwareBinding, 'id' | 'fromHardwareId' | 'toHardwareId' | 'effectiveStartAt' | 'effectiveEndAt' | 'endedAt'>,
  existingBindings: HardwareBinding[]
): boolean {
  if (candidate.fromHardwareId === candidate.toHardwareId) return true;
  const activeOrScheduled = existingBindings.filter(
    (b) =>
      b.id !== candidate.id &&
      !b.endedAt &&
      b.statusOverride !== 'Canceled' &&
      dateTimeIntervalsOverlap(
        candidate.effectiveStartAt,
        candidate.effectiveEndAt,
        b.effectiveStartAt,
        b.endedAt || b.effectiveEndAt
      )
  );
  // Check if path exists from candidate.toHardwareId -> candidate.fromHardwareId
  const visited = new Set<string>();
  const queue: string[] = [candidate.toHardwareId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === candidate.fromHardwareId) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);
    activeOrScheduled
      .filter((b) => b.fromHardwareId === curr)
      .forEach((b) => {
        if (!visited.has(b.toHardwareId)) queue.push(b.toHardwareId);
      });
  }
  return false;
}

export interface BindingValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateHardwareBindingPair(
  candidate: Partial<HardwareBinding> & {
    fromHardwareId: string;
    toHardwareId: string;
    mode: HardwareBindingMode;
    effectiveStartAt: string;
    effectiveEndAt?: string | null;
  },
  members: HardwareMembership[],
  connectionBindings: HardwareBinding[],
  allGlobalBindings: HardwareBinding[]
): BindingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!candidate.fromHardwareId || !candidate.toHardwareId) {
    errors.push('Select both From Hardware and To Hardware endpoints.');
    return { errors, warnings };
  }
  if (candidate.fromHardwareId === candidate.toHardwareId) {
    errors.push('Self-link blocked: From Hardware and To Hardware cannot be the same physical unit.');
  }

  const fromMem = members.find((m) => m.hardwareId === candidate.fromHardwareId);
  const toMem = members.find((m) => m.hardwareId === candidate.toHardwareId);

  if (fromMem && toMem) {
    // Disallow SIM as parent (From) endpoint
    if (fromMem.category === 'SIM') {
      errors.push('Invalid attachment: A SIM card cannot act as the parent (From) hardware for another unit.');
    }
    if (fromMem.category === 'Sensor' && toMem.category === 'Sensor') {
      errors.push('Incompatible pair: Sensor-to-Sensor direct binding is not supported.');
    }
  }

  const startMs = Date.parse(candidate.effectiveStartAt);
  if (Number.isNaN(startMs)) {
    errors.push('Valid Effective Start date and time are required.');
  }

  if (candidate.mode === 'Temporal') {
    const endMs = candidate.effectiveEndAt ? Date.parse(candidate.effectiveEndAt) : NaN;
    if (Number.isNaN(endMs)) {
      errors.push('Effective End date and time are required for Temporal bindings.');
    } else if (!Number.isNaN(startMs) && endMs <= startMs) {
      errors.push('Effective End must be strictly after Effective Start.');
    }
  }

  const fullCandidate: HardwareBinding = {
    id: candidate.id || '__candidate__',
    connectionId: candidate.connectionId || '',
    fromHardwareId: candidate.fromHardwareId,
    toHardwareId: candidate.toHardwareId,
    mode: candidate.mode,
    effectiveStartAt: candidate.effectiveStartAt,
    effectiveEndAt: candidate.mode === 'Temporal' ? candidate.effectiveEndAt || null : null,
    timezone: candidate.timezone || 'Asia/Kolkata',
    portOrSlot: candidate.portOrSlot || null,
    createdAt: '',
    updatedAt: ''
  };

  if (hasBindingCycle(fullCandidate, connectionBindings)) {
    errors.push('Circular binding detected (e.g., A → B → A over an overlapping period).');
  }

  // Duplicate pair or SIM overlap check across global active/scheduled bindings
  if (toMem?.category === 'SIM') {
    const simConflict = allGlobalBindings.find(
      (b) =>
        b.id !== fullCandidate.id &&
        !b.endedAt &&
        b.statusOverride !== 'Canceled' &&
        b.toHardwareId === toMem.hardwareId &&
        dateTimeIntervalsOverlap(
          fullCandidate.effectiveStartAt,
          fullCandidate.effectiveEndAt,
          b.effectiveStartAt,
          b.endedAt || b.effectiveEndAt
        )
    );
    if (simConflict) {
      errors.push(
        `SIM ${toMem.identifierValue} is already bound during an overlapping period (${simConflict.connectionId} · ${simConflict.id}). End the previous binding first or choose a non-overlapping future period.`
      );
    }
  }

  // Slot conflict on same From Hardware if portOrSlot is chosen
  if (fullCandidate.portOrSlot) {
    const slotConflict = connectionBindings.find(
      (b) =>
        b.id !== fullCandidate.id &&
        !b.endedAt &&
        b.statusOverride !== 'Canceled' &&
        b.fromHardwareId === fullCandidate.fromHardwareId &&
        b.portOrSlot === fullCandidate.portOrSlot &&
        dateTimeIntervalsOverlap(
          fullCandidate.effectiveStartAt,
          fullCandidate.effectiveEndAt,
          b.effectiveStartAt,
          b.endedAt || b.effectiveEndAt
        )
    );
    if (slotConflict) {
      errors.push(
        `Port/Slot "${fullCandidate.portOrSlot}" on ${fromMem?.identifierValue || 'From Hardware'} is already occupied in ${slotConflict.id} during this period.`
      );
    }
  }

  return { errors, warnings };
}

export function computeHardwareBindingStatus(
  binding: HardwareBinding,
  allBindings: HardwareBinding[],
  members: HardwareMembership[] = [],
  nowMs: number = Date.now()
): { status: HardwareBindingStatus; reason?: string } {
  if (binding.statusOverride === 'Canceled') return { status: 'Canceled' };
  if (binding.endedAt) return { status: 'Ended' };

  const startMs = Date.parse(binding.effectiveStartAt);
  const endMs = binding.effectiveEndAt ? Date.parse(binding.effectiveEndAt) : null;

  if (binding.mode === 'Temporal' && endMs !== null && !Number.isNaN(startMs) && endMs <= startMs) {
    return { status: 'Conflict', reason: 'Temporal end timestamp is not after start.' };
  }
  if (endMs !== null && !Number.isNaN(endMs) && nowMs >= endMs) {
    return { status: 'Ended' };
  }

  if (binding.fromHardwareId === binding.toHardwareId) {
    return { status: 'Conflict', reason: 'Self-binding is invalid.' };
  }

  const sameConnBindings = allBindings.filter((b) => b.connectionId === binding.connectionId);
  if (hasBindingCycle(binding, sameConnBindings)) {
    return { status: 'Conflict', reason: 'Circular binding dependency detected.' };
  }

  const toMem = members.find((m) => m.hardwareId === binding.toHardwareId);
  if (toMem?.category === 'SIM') {
    const simOverlap = allBindings.find(
      (b) =>
        b.id !== binding.id &&
        !b.endedAt &&
        b.statusOverride !== 'Canceled' &&
        b.toHardwareId === binding.toHardwareId &&
        dateTimeIntervalsOverlap(
          binding.effectiveStartAt,
          binding.effectiveEndAt,
          b.effectiveStartAt,
          b.endedAt || b.effectiveEndAt
        )
    );
    if (simOverlap) {
      return { status: 'Conflict', reason: `Overlapping SIM binding with ${simOverlap.connectionId}.` };
    }
  }

  if (!Number.isNaN(startMs) && startMs > nowMs) {
    return { status: 'Scheduled' };
  }
  return { status: 'Active' };
}

export interface ResourceAllocationEvaluationContext {
  connections?: ConnectionRecord[];
  store?: Pick<
    ModalMasterStore,
    'connections' | 'hardwareBindings' | 'devices' | 'sensors' | 'sims'
  >;
}

export function getNextHardwareBindingId(
  existing: HardwareBinding[],
  offset = 0
): string {
  let maxNum = 3012;
  for (const b of existing) {
    const m = /^BND-(\d+)$/.exec(b.id || '');
    if (m) {
      const n = Number(m[1]);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  return `BND-${maxNum + 1 + offset}`;
}

export function computeResourceAllocationStatus(
  alloc: ResourceAllocation,
  allAllocations: ResourceAllocation[],
  nowMs: number = Date.now(),
  context?: ResourceAllocationEvaluationContext
): { status: ResourceAllocationStatus; reason?: string } {
  if (alloc.endedAt) return { status: 'Ended' };
  const startMs = Date.parse(alloc.effectiveStartAt);
  const endMs = alloc.effectiveEndAt ? Date.parse(alloc.effectiveEndAt) : null;

  if (alloc.mode === 'Temporal' && endMs !== null && !Number.isNaN(startMs) && endMs <= startMs) {
    return { status: 'Conflict', reason: 'End timestamp must be after start.' };
  }
  if (endMs !== null && !Number.isNaN(endMs) && nowMs >= endMs) {
    return { status: 'Ended' };
  }

  const connections = context?.connections || context?.store?.connections || [];
  const parentConn =
    connections.length > 0
      ? connections.find((c) => c.id === alloc.connectionId || c.connectionId === alloc.connectionId)
      : undefined;

  if (parentConn?.status === 'Inactive') {
    return { status: 'Ended', reason: 'Parent connection is Inactive.' };
  }

  // Scoped hardware validation against parent connection membership & live physical overrides
  if (alloc.hardwareId) {
    if (
      parentConn &&
      !parentConn.memberIds?.includes(alloc.hardwareId) &&
      !parentConn.members?.some((m) => m.hardwareId === alloc.hardwareId)
    ) {
      return {
        status: 'Conflict',
        reason: `Hardware ${alloc.hardwareId} is not a member of ${parentConn.id}.`
      };
    }

    const st = context?.store;
    if (st) {
      const dev = st.devices?.find((d) => d.id === alloc.hardwareId);
      if (dev) {
        if (dev.statusOverride === 'Decommissioned' || (dev.statusOverride === undefined && dev.hardwareLifecycle === 'Decommissioned')) {
          return { status: 'Conflict', reason: `Device ${dev.deviceId} is Decommissioned.` };
        }
        if (dev.statusOverride === 'In Maintenance') {
          return { status: 'Conflict', reason: `Device ${dev.deviceId} is In Maintenance.` };
        }
      }
      const sen = st.sensors?.find((s) => s.id === alloc.hardwareId);
      if (sen) {
        if (sen.statusOverride === 'Decommissioned' || (sen.statusOverride === undefined && sen.hardwareLifecycle === 'Decommissioned')) {
          return { status: 'Conflict', reason: `Sensor ${sen.deviceId} is Decommissioned.` };
        }
        if (sen.statusOverride === 'In Maintenance') {
          return { status: 'Conflict', reason: `Sensor ${sen.deviceId} is In Maintenance.` };
        }
      }
      const sim = st.sims?.find((s) => s.id === alloc.hardwareId);
      if (sim && (sim.status === 'Retired' || sim.status === 'Suspended' || sim.status === 'Inactive')) {
        return { status: 'Conflict', reason: `SIM ${sim.iccid} carrier status is ${sim.status}.` };
      }
    }
  }

  // Check duplicate overlapping active allocation for same canonical resource on same connection & conflicting hardware scope
  const normIdf = (alloc.resourceIdentifier || '').trim().toLowerCase();
  const normComp = (alloc.companyName || '').trim().toLowerCase();
  const allocScope = alloc.hardwareId || 'ALL';

  const duplicateOverlap = allAllocations.find((other) => {
    if (other.id === alloc.id || other.endedAt) return false;
    if (other.connectionId !== alloc.connectionId || other.resourceType !== alloc.resourceType) {
      return false;
    }
    const sameResource =
      other.resourceId === alloc.resourceId ||
      (normIdf.length > 0 &&
        (other.companyName || '').trim().toLowerCase() === normComp &&
        (other.resourceIdentifier || '').trim().toLowerCase() === normIdf);
    if (!sameResource) return false;

    const otherScope = other.hardwareId || 'ALL';
    const scopeOverlaps =
      allocScope === 'ALL' || otherScope === 'ALL' || allocScope === otherScope;
    if (!scopeOverlaps) return false;

    return dateTimeIntervalsOverlap(
      alloc.effectiveStartAt,
      alloc.effectiveEndAt,
      other.effectiveStartAt,
      other.endedAt || other.effectiveEndAt
    );
  });

  if (duplicateOverlap) {
    return { status: 'Conflict', reason: `Overlaps with ${duplicateOverlap.id}.` };
  }

  if (parentConn?.status === 'Draft') {
    return { status: 'Scheduled', reason: 'Parent connection is in Draft.' };
  }

  if (!Number.isNaN(startMs) && startMs > nowMs) {
    return { status: 'Scheduled' };
  }
  return { status: 'Active' };
}

export function computeEffectiveConnectionStatus(
  conn: ConnectionRecord,
  store: Partial<
    Pick<
      ModalMasterStore,
      'connections' | 'hardwareBindings' | 'resourceAllocations' | 'devices' | 'sensors' | 'sims'
    >
  >,
  nowMs: number = Date.now()
): { status: ConnectionLifecycleStatus; reason?: string } {
  // 1. Explicit Draft or Inactive always stays Draft or Inactive
  if (conn.status === 'Draft') {
    return { status: 'Draft' };
  }
  if (conn.status === 'Inactive') {
    return { status: 'Inactive' };
  }

  const allBindings = store.hardwareBindings || [];
  const allAllocations = store.resourceAllocations || [];
  const devices = store.devices || [];
  const sensors = store.sensors || [];
  const sims = store.sims || [];
  const connections = store.connections || [conn];

  const connBindings = allBindings.filter((b) => b.connectionId === conn.id);
  const connAllocs = allAllocations.filter((a) => a.connectionId === conn.id);
  const members = conn.members || [];

  // 2. Check live physical hardware overrides for currently referenced active/scheduled hardware
  const openBindings = connBindings.filter(
    (b) => !b.endedAt && b.statusOverride !== 'Canceled'
  );
  const openAllocs = connAllocs.filter((a) => !a.endedAt);

  const referencedHwIds = new Set<string>();
  openBindings.forEach((b) => {
    referencedHwIds.add(b.fromHardwareId);
    referencedHwIds.add(b.toHardwareId);
  });
  openAllocs.forEach((a) => {
    if (a.hardwareId) referencedHwIds.add(a.hardwareId);
  });
  if (referencedHwIds.size === 0 && (openAllocs.length > 0 || conn.status === 'Needs Attention')) {
    members.forEach((m) => referencedHwIds.add(m.hardwareId));
  }

  for (const hwId of referencedHwIds) {
    const dev = devices.find((d) => d.id === hwId);
    if (dev) {
      if (
        dev.statusOverride === 'Decommissioned' ||
        (dev.statusOverride === undefined && dev.hardwareLifecycle === 'Decommissioned')
      ) {
        return {
          status: 'Needs Attention',
          reason: `Device ${dev.deviceId} is Decommissioned.`
        };
      }
      if (dev.statusOverride === 'In Maintenance') {
        return {
          status: 'Needs Attention',
          reason: `Device ${dev.deviceId} is In Maintenance.`
        };
      }
      continue;
    }

    const sen = sensors.find((s) => s.id === hwId);
    if (sen) {
      if (
        sen.statusOverride === 'Decommissioned' ||
        (sen.statusOverride === undefined && sen.hardwareLifecycle === 'Decommissioned')
      ) {
        return {
          status: 'Needs Attention',
          reason: `Sensor ${sen.deviceId} is Decommissioned.`
        };
      }
      if (sen.statusOverride === 'In Maintenance') {
        return {
          status: 'Needs Attention',
          reason: `Sensor ${sen.deviceId} is In Maintenance.`
        };
      }
      continue;
    }

    const sim = sims.find((s) => s.id === hwId);
    if (sim && (sim.status === 'Retired' || sim.status === 'Suspended')) {
      return {
        status: 'Needs Attention',
        reason: `SIM ${sim.iccid} has carrier status ${sim.status}.`
      };
    }
  }

  // 3. Evaluate pairwise hardware bindings and resource allocations
  let hasActiveLink = false;
  let hasScheduledLink = false;
  let conflictReason: string | undefined;

  for (const b of connBindings) {
    const bRes = computeHardwareBindingStatus(b, allBindings, members, nowMs);
    if (bRes.status === 'Conflict') {
      conflictReason = conflictReason || bRes.reason || `Binding ${b.id} has a conflict.`;
    } else if (bRes.status === 'Active') {
      hasActiveLink = true;
    } else if (bRes.status === 'Scheduled') {
      hasScheduledLink = true;
    }
  }

  const allocCtx: ResourceAllocationEvaluationContext = {
    connections,
    store:
      devices.length > 0 || sensors.length > 0 || sims.length > 0
        ? {
            connections,
            hardwareBindings: allBindings,
            devices,
            sensors,
            sims
          }
        : undefined
  };

  for (const a of connAllocs) {
    const aRes = computeResourceAllocationStatus(a, allAllocations, nowMs, allocCtx);
    if (aRes.status === 'Conflict') {
      conflictReason = conflictReason || aRes.reason || `Allocation ${a.id} has a conflict.`;
    } else if (aRes.status === 'Active') {
      hasActiveLink = true;
    } else if (aRes.status === 'Scheduled') {
      hasScheduledLink = true;
    }
  }

  if (conflictReason) {
    return { status: 'Needs Attention', reason: conflictReason };
  }

  if (conn.status === 'Needs Attention') {
    return {
      status: 'Needs Attention',
      reason: conn.verification || 'Mapping flagged for attention.'
    };
  }

  if (hasActiveLink) {
    return { status: 'Active' };
  }

  if (hasScheduledLink) {
    return { status: 'Scheduled' };
  }

  // If connection had bindings or allocations and all of them have now ended/canceled, it is no longer effectively Active
  if (connBindings.length > 0 || connAllocs.length > 0) {
    return {
      status: 'Inactive',
      reason: 'All associated bindings and resource allocations have ended.'
    };
  }

  // Bare membership row without any binding or resource allocation cannot activate inventory
  return {
    status: conn.status === 'Scheduled' ? 'Scheduled' : 'Draft',
    reason: 'No effective hardware bindings or resource allocations configured.'
  };
}

export interface DeviceMappingReferenceSummary {
  allConnections: ConnectionRecord[];
  allBindings: HardwareBinding[];
  allAllocations: ResourceAllocation[];
  activeOrScheduledConnections: ConnectionRecord[];
  hasAnyReference: boolean;
  hasActiveOrScheduledReference: boolean;
}

export function getDeviceMappingReferences(
  deviceId: string,
  store: Pick<ModalMasterStore, 'connections' | 'hardwareBindings' | 'resourceAllocations'> &
    Partial<Pick<ModalMasterStore, 'devices' | 'sensors' | 'sims'>>,
  nowMs: number = Date.now()
): DeviceMappingReferenceSummary {
  const connections = store.connections || [];
  const bindings = store.hardwareBindings || [];
  const allocations = store.resourceAllocations || [];

  const directConnIds = new Set<string>();
  const allConnections: ConnectionRecord[] = [];
  connections.forEach((c) => {
    const isDirect =
      c.memberIds?.includes(deviceId) ||
      c.members?.some((m) => m.hardwareId === deviceId) ||
      c.hardwareId === deviceId ||
      c.parentId === deviceId;
    if (isDirect) {
      directConnIds.add(c.id);
      allConnections.push(c);
    }
  });

  const allBindings = bindings.filter(
    (b) => b.fromHardwareId === deviceId || b.toHardwareId === deviceId
  );
  allBindings.forEach((b) => {
    if (!directConnIds.has(b.connectionId)) {
      const conn = connections.find((c) => c.id === b.connectionId);
      if (conn) {
        directConnIds.add(conn.id);
        allConnections.push(conn);
      }
    }
  });

  const allAllocations = allocations.filter(
    (a) => a.hardwareId === deviceId || (a.hardwareId == null && directConnIds.has(a.connectionId))
  );
  allAllocations.forEach((a) => {
    if (!directConnIds.has(a.connectionId)) {
      const conn = connections.find((c) => c.id === a.connectionId);
      if (conn) {
        directConnIds.add(conn.id);
        allConnections.push(conn);
      }
    }
  });

  const activeOrScheduledConnections = allConnections.filter((c) => {
    const effConnStatus = computeEffectiveConnectionStatus(c, store, nowMs).status;
    if (
      effConnStatus !== 'Active' &&
      effConnStatus !== 'Scheduled' &&
      effConnStatus !== 'Needs Attention'
    ) {
      return false;
    }
    const connBindings = allBindings.filter((b) => b.connectionId === c.id);
    const hasActiveOrSchedBinding = connBindings.some((b) => {
      const st = computeHardwareBindingStatus(b, bindings, c.members || [], nowMs).status;
      return st === 'Active' || st === 'Scheduled' || st === 'Conflict';
    });
    if (hasActiveOrSchedBinding) return true;

    const connAllocs = allAllocations.filter((a) => a.connectionId === c.id);
    const hasActiveOrSchedAlloc = connAllocs.some((a) => {
      const st = computeResourceAllocationStatus(a, allocations, nowMs, {
        connections,
        store: store as any
      }).status;
      return st === 'Active' || st === 'Scheduled' || st === 'Conflict';
    });
    return hasActiveOrSchedAlloc;
  });

  return {
    allConnections,
    allBindings,
    allAllocations,
    activeOrScheduledConnections,
    hasAnyReference:
      allConnections.length > 0 || allBindings.length > 0 || allAllocations.length > 0,
    hasActiveOrScheduledReference: activeOrScheduledConnections.length > 0
  };
}

export function deriveDeviceStatus(
  device: DeviceRecord,
  store: Pick<ModalMasterStore, 'connections' | 'hardwareBindings' | 'resourceAllocations'> &
    Partial<Pick<ModalMasterStore, 'devices' | 'sensors' | 'sims'>>,
  nowMs: number = Date.now()
): EffectiveDeviceStatus {
  // 1. Explicit administrative overrides (Decommissioned > In Maintenance)
  if (device.statusOverride === 'Decommissioned') return 'Decommissioned';
  if (device.statusOverride === undefined && device.hardwareLifecycle === 'Decommissioned') {
    return 'Decommissioned';
  }

  if (device.statusOverride === 'In Maintenance') return 'In Maintenance';
  if (
    device.statusOverride === undefined &&
    (device.hardwareLifecycle === 'In Maintenance' || device.hardwareLifecycle === 'Suspended')
  ) {
    return 'In Maintenance';
  }

  // 2. Mapping-derived Active check: Effective Active connection + currently effective Active binding or allocation
  const connections = store.connections || [];
  const bindings = store.hardwareBindings || [];
  const allocations = store.resourceAllocations || [];

  for (const conn of connections) {
    if (conn.status === 'Draft' || conn.status === 'Inactive') continue;
    const isMember =
      conn.memberIds?.includes(device.id) ||
      conn.members?.some((m) => m.hardwareId === device.id) ||
      conn.hardwareId === device.id ||
      conn.parentId === device.id;
    if (!isMember) continue;

    const effConnStatus = computeEffectiveConnectionStatus(conn, store, nowMs).status;
    if (effConnStatus !== 'Active') continue;

    const connDeviceBindings = bindings.filter(
      (b) =>
        b.connectionId === conn.id &&
        (b.fromHardwareId === device.id || b.toHardwareId === device.id)
    );
    const hasEffectiveBinding = connDeviceBindings.some(
      (b) => computeHardwareBindingStatus(b, bindings, conn.members || [], nowMs).status === 'Active'
    );
    if (hasEffectiveBinding) return 'Active';

    const hasEffectiveAllocation = allocations.some((a) => {
      if (a.connectionId !== conn.id) return false;
      if (a.hardwareId === device.id) {
        return (
          computeResourceAllocationStatus(a, allocations, nowMs, {
            connections,
            store: store as any
          }).status === 'Active'
        );
      }
      if (a.hardwareId == null && connDeviceBindings.length === 0) {
        return (
          computeResourceAllocationStatus(a, allocations, nowMs, {
            connections,
            store: store as any
          }).status === 'Active'
        );
      }
      return false;
    });
    if (hasEffectiveAllocation) return 'Active';
  }

  return 'Inventory';
}

export function deriveDeviceMappingFilterStatus(
  deviceId: string,
  store: Pick<ModalMasterStore, 'connections' | 'hardwareBindings' | 'resourceAllocations'> &
    Partial<Pick<ModalMasterStore, 'devices' | 'sensors' | 'sims'>>,
  nowMs: number = Date.now()
): DeviceMappingFilterStatus {
  const connections = store.connections || [];
  const bindings = store.hardwareBindings || [];
  const allocations = store.resourceAllocations || [];

  let hasActive = false;
  let hasScheduled = false;

  for (const conn of connections) {
    if (conn.status === 'Draft' || conn.status === 'Inactive') continue;
    const isMember =
      conn.memberIds?.includes(deviceId) ||
      conn.members?.some((m) => m.hardwareId === deviceId) ||
      conn.hardwareId === deviceId ||
      conn.parentId === deviceId;
    if (!isMember) continue;

    const effConnStatus = computeEffectiveConnectionStatus(conn, store, nowMs).status;
    const connDeviceBindings = bindings.filter(
      (b) =>
        b.connectionId === conn.id &&
        (b.fromHardwareId === deviceId || b.toHardwareId === deviceId)
    );

    if (effConnStatus === 'Active') {
      const hasEffectiveBinding = connDeviceBindings.some(
        (b) => computeHardwareBindingStatus(b, bindings, conn.members || [], nowMs).status === 'Active'
      );
      const hasEffectiveAllocation = allocations.some((a) => {
        if (a.connectionId !== conn.id) return false;
        if (a.hardwareId === deviceId) {
          return (
            computeResourceAllocationStatus(a, allocations, nowMs, {
              connections,
              store: store as any
            }).status === 'Active'
          );
        }
        if (a.hardwareId == null && connDeviceBindings.length === 0) {
          return (
            computeResourceAllocationStatus(a, allocations, nowMs, {
              connections,
              store: store as any
            }).status === 'Active'
          );
        }
        return false;
      });
      if (hasEffectiveBinding || hasEffectiveAllocation) {
        hasActive = true;
        break;
      }
    }

    if (effConnStatus === 'Active' || effConnStatus === 'Scheduled') {
      const hasScheduledBinding = connDeviceBindings.some(
        (b) =>
          computeHardwareBindingStatus(b, bindings, conn.members || [], nowMs).status === 'Scheduled'
      );
      const hasScheduledAllocation = allocations.some((a) => {
        if (a.connectionId !== conn.id) return false;
        if (a.hardwareId === deviceId) {
          return (
            computeResourceAllocationStatus(a, allocations, nowMs, {
              connections,
              store: store as any
            }).status === 'Scheduled'
          );
        }
        if (a.hardwareId == null && connDeviceBindings.length === 0) {
          return (
            computeResourceAllocationStatus(a, allocations, nowMs, {
              connections,
              store: store as any
            }).status === 'Scheduled'
          );
        }
        return false;
      });
      if (hasScheduledBinding || hasScheduledAllocation) {
        hasScheduled = true;
      }
    }
  }

  if (hasActive) return 'Active Mapping';
  if (hasScheduled) return 'Scheduled';

  const refs = getDeviceMappingReferences(deviceId, store, nowMs);
  if (refs.hasAnyReference) return 'Historical/Ended';

  return 'Unmapped';
}

function migrateDeviceRecords(
  devices: DeviceRecord[],
  store: Pick<ModalMasterStore, 'connections' | 'hardwareBindings' | 'resourceAllocations'> &
    Partial<Pick<ModalMasterStore, 'devices' | 'sensors' | 'sims'>>
): DeviceRecord[] {
  return devices.map((d) => {
    const rawLifecycle = d.hardwareLifecycle;
    const hasMeta = Boolean(d.legacyStatusMetadata);

    let nextOverride = d.statusOverride;
    if (nextOverride === undefined) {
      if (rawLifecycle === 'Decommissioned') nextOverride = 'Decommissioned';
      else if (rawLifecycle === 'In Maintenance' || rawLifecycle === 'Suspended') {
        nextOverride = 'In Maintenance';
      } else {
        nextOverride = null;
      }
    }

    const legacyStatusMetadata = hasMeta
      ? d.legacyStatusMetadata
      : {
          originalHardwareLifecycle: rawLifecycle,
          ...(rawLifecycle === 'Pending Hardware Review' ? { pendingHardwareReview: true } : {}),
          migratedAt: '2026-11-22'
        };

    const candidate: DeviceRecord = {
      ...d,
      statusOverride: nextOverride,
      legacyStatusMetadata
    };
    const effectiveStatus = deriveDeviceStatus(candidate, store);

    return {
      ...candidate,
      hardwareLifecycle: effectiveStatus
    };
  });
}

export function getSensorMappingReferences(
  sensorId: string,
  store: Pick<ModalMasterStore, 'connections' | 'hardwareBindings' | 'resourceAllocations'> &
    Partial<Pick<ModalMasterStore, 'devices' | 'sensors' | 'sims'>>,
  nowMs: number = Date.now()
): DeviceMappingReferenceSummary {
  return getDeviceMappingReferences(sensorId, store, nowMs);
}

export type VehicleMappingState =
  | 'Active Mapping'
  | 'Scheduled'
  | 'Historical/Ended'
  | 'Unmapped';

export interface VehicleMappingReferenceSummary {
  allAllocations: ResourceAllocation[];
  activeAllocations: ResourceAllocation[];
  scheduledAllocations: ResourceAllocation[];
  endedAllocations: ResourceAllocation[];
  allRelationships: ResourceRelationship[];
  activeRelationships: ResourceRelationship[];
  scheduledRelationships: ResourceRelationship[];
  endedRelationships: ResourceRelationship[];
  activeOrScheduledConnectionIds: string[];
  mappingState: VehicleMappingState;
  hasAnyReference: boolean;
  hasActiveOrScheduledReference: boolean;
}

export function getVehicleMappingReferences(
  vehicle: { id: string; registration_number?: string; company?: string; client?: string },
  store: Pick<ModalMasterStore, 'connections' | 'resourceAllocations' | 'resourceRelationships'> &
    Partial<Pick<ModalMasterStore, 'hardwareBindings' | 'devices' | 'sensors' | 'sims'>>,
  allVehicleIds?: Set<string>,
  nowMs: number = Date.now()
): VehicleMappingReferenceSummary {
  const allocations = store.resourceAllocations || [];
  const relationships = store.resourceRelationships || [];
  const connections = store.connections || [];
  const connById = new Map<string, ConnectionRecord>();
  connections.forEach((c) => {
    connById.set(c.id, c);
    if (c.connectionId) connById.set(c.connectionId, c);
  });

  const vehPlate = (vehicle.registration_number || '').trim().toUpperCase();
  const vehCompany = (vehicle.company || vehicle.client || '').trim().toLowerCase();

  const matchesVehicleResource = (
    resType: ResourceType,
    resId: string,
    resIdentifier?: string,
    resCompanyName?: string
  ): boolean => {
    if (resType !== 'Vehicle') return false;
    if (resId === vehicle.id) return true;
    // Legacy seed alias reconciliation: e.g., seed RCA 'veh-mundra-1192' matching 'veh-mundra-01' same company + plate
    if (
      vehPlate &&
      vehCompany &&
      (!allVehicleIds || !allVehicleIds.has(resId)) &&
      (resCompanyName || '').trim().toLowerCase() === vehCompany &&
      (resIdentifier || '').trim().toUpperCase() === vehPlate
    ) {
      return true;
    }
    return false;
  };

  const allAllocations = allocations.filter((a) =>
    matchesVehicleResource(a.resourceType, a.resourceId, a.resourceIdentifier, a.companyName)
  );

  const activeAllocations: ResourceAllocation[] = [];
  const scheduledAllocations: ResourceAllocation[] = [];
  const endedAllocations: ResourceAllocation[] = [];

  allAllocations.forEach((a) => {
    const conn = connById.get(a.connectionId);
    const effConnStatus = conn ? computeEffectiveConnectionStatus(conn, store, nowMs).status : undefined;
    const computed = computeResourceAllocationStatus(a, allocations, nowMs, {
      connections,
      store: store as any
    }).status;
    if (computed === 'Ended' || conn?.status === 'Inactive' || effConnStatus === 'Inactive') {
      endedAllocations.push(a);
    } else if (
      computed === 'Scheduled' ||
      conn?.status === 'Draft' ||
      effConnStatus === 'Scheduled' ||
      effConnStatus === 'Draft'
    ) {
      scheduledAllocations.push(a);
    } else if (computed === 'Active' || computed === 'Conflict') {
      activeAllocations.push(a);
    } else {
      endedAllocations.push(a);
    }
  });

  const allRelationships = relationships.filter(
    (r) =>
      matchesVehicleResource(
        r.sourceResourceType,
        r.sourceResourceId,
        r.sourceResourceIdentifier,
        r.companyName
      ) ||
      matchesVehicleResource(
        r.targetResourceType,
        r.targetResourceId,
        r.targetResourceIdentifier,
        r.companyName
      )
  );

  const activeRelationships: ResourceRelationship[] = [];
  const scheduledRelationships: ResourceRelationship[] = [];
  const endedRelationships: ResourceRelationship[] = [];

  allRelationships.forEach((r) => {
    const computed = computeResourceRelationshipStatus(r, relationships, nowMs).status;
    if (computed === 'Ended') {
      endedRelationships.push(r);
    } else if (computed === 'Scheduled') {
      scheduledRelationships.push(r);
    } else {
      activeRelationships.push(r);
    }
  });

  const activeOrScheduledConnectionIds = Array.from(
    new Set(
      [...activeAllocations, ...scheduledAllocations]
        .map((a) => a.connectionId)
        .filter(Boolean)
    )
  );

  let mappingState: VehicleMappingState = 'Unmapped';
  if (activeAllocations.length > 0) {
    mappingState = 'Active Mapping';
  } else if (scheduledAllocations.length > 0) {
    mappingState = 'Scheduled';
  } else if (allAllocations.length > 0) {
    mappingState = 'Historical/Ended';
  }

  return {
    allAllocations,
    activeAllocations,
    scheduledAllocations,
    endedAllocations,
    allRelationships,
    activeRelationships,
    scheduledRelationships,
    endedRelationships,
    activeOrScheduledConnectionIds,
    mappingState,
    hasAnyReference: allAllocations.length > 0 || allRelationships.length > 0,
    hasActiveOrScheduledReference:
      activeAllocations.length > 0 ||
      scheduledAllocations.length > 0 ||
      activeRelationships.length > 0 ||
      scheduledRelationships.length > 0
  };
}

export type DriverMappingBadge = 'Mapped' | 'Unmapped' | 'Expired';

export interface DriverMappingReferenceSummary {
  allAllocations: ResourceAllocation[];
  activeAllocations: ResourceAllocation[];
  scheduledAllocations: ResourceAllocation[];
  endedAllocations: ResourceAllocation[];
  allRelationships: ResourceRelationship[];
  activeRelationships: ResourceRelationship[];
  scheduledRelationships: ResourceRelationship[];
  endedRelationships: ResourceRelationship[];
  activeConnectionIds: string[];
  activeOrScheduledConnectionIds: string[];
  activeVehicleRegs: string[];
  allReferencedVehicleRegs: string[];
  mapping: DriverMappingBadge;
  hasAnyReference: boolean;
  hasActiveOrScheduledReference: boolean;
}

const LEGACY_DRIVER_SEED_ALIAS: Record<string, string> = {
  'drv-1': 'drv-001',
  'drv-2': 'drv-002'
};

function normalizeDriverPhoneTail10(raw?: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  return digits.slice(-10);
}

export function getDriverMappingReferences(
  driver: { id: string; phone?: string; company?: string },
  store: Pick<ModalMasterStore, 'connections' | 'resourceAllocations' | 'resourceRelationships'> &
    Partial<Pick<ModalMasterStore, 'hardwareBindings' | 'devices' | 'sensors' | 'sims'>>,
  allDriverIds?: Set<string>,
  nowMs: number = Date.now()
): DriverMappingReferenceSummary {
  const allocations = store.resourceAllocations || [];
  const relationships = store.resourceRelationships || [];
  const connections = store.connections || [];

  const connById = new Map<string, ConnectionRecord>();
  connections.forEach((c) => {
    connById.set(c.id, c);
    if (c.connectionId) connById.set(c.connectionId, c);
  });

  const drvPhone10 = normalizeDriverPhoneTail10(driver.phone);
  const drvCompany = (driver.company || '').trim().toLowerCase();

  const matchesDriverResource = (
    resType: ResourceType,
    resId: string,
    resIdentifier?: string,
    resCompanyName?: string
  ): boolean => {
    if (resType !== 'Driver') return false;
    if (resId === driver.id) return true;
    const mappedLegacyId = LEGACY_DRIVER_SEED_ALIAS[resId];
    if (mappedLegacyId && mappedLegacyId === driver.id) return true;
    // Match by same-company 10-digit mobile ONLY when resId isn't a synthetic drv-seed row or another known driver ID
    if (
      drvPhone10 &&
      drvCompany &&
      !resId.startsWith('drv-seed-') &&
      (!allDriverIds || !allDriverIds.has(resId)) &&
      (resCompanyName || '').trim().toLowerCase() === drvCompany &&
      normalizeDriverPhoneTail10(resIdentifier) === drvPhone10
    ) {
      return true;
    }
    return false;
  };

  const allAllocations = allocations.filter((a) =>
    matchesDriverResource(a.resourceType, a.resourceId, a.resourceIdentifier, a.companyName)
  );

  const activeAllocations: ResourceAllocation[] = [];
  const scheduledAllocations: ResourceAllocation[] = [];
  const endedAllocations: ResourceAllocation[] = [];

  allAllocations.forEach((a) => {
    const conn = connById.get(a.connectionId);
    const effConnStatus = conn ? computeEffectiveConnectionStatus(conn, store, nowMs).status : undefined;
    const computed = computeResourceAllocationStatus(a, allocations, nowMs, {
      connections,
      store: store as any
    }).status;
    if (computed === 'Ended' || conn?.status === 'Inactive' || effConnStatus === 'Inactive') {
      endedAllocations.push(a);
    } else if (
      computed === 'Scheduled' ||
      conn?.status === 'Draft' ||
      effConnStatus === 'Scheduled' ||
      effConnStatus === 'Draft'
    ) {
      scheduledAllocations.push(a);
    } else if (computed === 'Active' || computed === 'Conflict') {
      activeAllocations.push(a);
    } else {
      endedAllocations.push(a);
    }
  });

  const allRelationships = relationships.filter(
    (r) =>
      matchesDriverResource(
        r.sourceResourceType,
        r.sourceResourceId,
        r.sourceResourceIdentifier,
        r.companyName
      ) ||
      matchesDriverResource(
        r.targetResourceType,
        r.targetResourceId,
        r.targetResourceIdentifier,
        r.companyName
      )
  );

  const activeRelationships: ResourceRelationship[] = [];
  const scheduledRelationships: ResourceRelationship[] = [];
  const endedRelationships: ResourceRelationship[] = [];

  allRelationships.forEach((r) => {
    const computed = computeResourceRelationshipStatus(r, relationships, nowMs).status;
    if (computed === 'Ended') {
      endedRelationships.push(r);
    } else if (computed === 'Scheduled') {
      scheduledRelationships.push(r);
    } else {
      activeRelationships.push(r);
    }
  });

  const activeRegSet = new Set<string>();
  const allRegSet = new Set<string>();

  const collectVehicleRegsForAllocation = (alloc: ResourceAllocation, isActive: boolean) => {
    if (!alloc.connectionId) return;
    allocations.forEach((candidate) => {
      if (candidate.resourceType !== 'Vehicle' || candidate.connectionId !== alloc.connectionId) return;
      const plate = (candidate.resourceIdentifier || '').trim().toUpperCase();
      if (!plate) return;
      const candStatus = computeResourceAllocationStatus(candidate, allocations, nowMs, {
        connections,
        store: store as any
      }).status;
      if (isActive && (candStatus === 'Active' || candStatus === 'Conflict')) {
        activeRegSet.add(plate);
      }
      allRegSet.add(plate);
    });
  };

  activeAllocations.forEach((a) => collectVehicleRegsForAllocation(a, true));
  scheduledAllocations.forEach((a) => collectVehicleRegsForAllocation(a, false));
  endedAllocations.forEach((a) => collectVehicleRegsForAllocation(a, false));

  const collectVehicleRegsForRel = (rel: ResourceRelationship, isActive: boolean) => {
    if (rel.sourceResourceType === 'Vehicle' && rel.sourceResourceIdentifier) {
      const plate = rel.sourceResourceIdentifier.trim().toUpperCase();
      if (isActive) activeRegSet.add(plate);
      allRegSet.add(plate);
    }
    if (rel.targetResourceType === 'Vehicle' && rel.targetResourceIdentifier) {
      const plate = rel.targetResourceIdentifier.trim().toUpperCase();
      if (isActive) activeRegSet.add(plate);
      allRegSet.add(plate);
    }
  };

  activeRelationships.forEach((r) => collectVehicleRegsForRel(r, true));
  scheduledRelationships.forEach((r) => collectVehicleRegsForRel(r, false));
  endedRelationships.forEach((r) => collectVehicleRegsForRel(r, false));

  const activeConnectionIds = Array.from(
    new Set(activeAllocations.map((a) => a.connectionId).filter(Boolean))
  );
  const activeOrScheduledConnectionIds = Array.from(
    new Set([...activeAllocations, ...scheduledAllocations].map((a) => a.connectionId).filter(Boolean))
  );

  let mapping: DriverMappingBadge = 'Unmapped';
  if (activeAllocations.length > 0 || activeRelationships.length > 0) {
    mapping = 'Mapped';
  } else if (scheduledAllocations.length > 0 || scheduledRelationships.length > 0) {
    mapping = 'Unmapped';
  } else if (endedAllocations.length > 0 || endedRelationships.length > 0) {
    mapping = 'Expired';
  }

  return {
    allAllocations,
    activeAllocations,
    scheduledAllocations,
    endedAllocations,
    allRelationships,
    activeRelationships,
    scheduledRelationships,
    endedRelationships,
    activeConnectionIds,
    activeOrScheduledConnectionIds,
    activeVehicleRegs: Array.from(activeRegSet),
    allReferencedVehicleRegs: Array.from(allRegSet),
    mapping,
    hasAnyReference: allAllocations.length > 0 || allRelationships.length > 0,
    hasActiveOrScheduledReference:
      activeAllocations.length > 0 ||
      scheduledAllocations.length > 0 ||
      activeRelationships.length > 0 ||
      scheduledRelationships.length > 0
  };
}


export function deriveSensorStatus(
  sensor: SensorRecord,
  store: Pick<ModalMasterStore, 'connections' | 'hardwareBindings' | 'resourceAllocations'> &
    Partial<Pick<ModalMasterStore, 'devices' | 'sensors' | 'sims'>>,
  nowMs: number = Date.now()
): EffectiveSensorStatus {
  // 1. Explicit administrative overrides (Decommissioned > In Maintenance)
  if (sensor.statusOverride === 'Decommissioned') return 'Decommissioned';
  if (sensor.statusOverride === undefined && sensor.hardwareLifecycle === 'Decommissioned') {
    return 'Decommissioned';
  }

  if (sensor.statusOverride === 'In Maintenance') return 'In Maintenance';
  if (
    sensor.statusOverride === undefined &&
    (sensor.hardwareLifecycle === 'In Maintenance' || sensor.hardwareLifecycle === 'Suspended')
  ) {
    return 'In Maintenance';
  }

  // 2. Mapping-derived Active check: Effective Active connection + currently effective binding or standalone allocation (SIM not required)
  const connections = store.connections || [];
  const bindings = store.hardwareBindings || [];
  const allocations = store.resourceAllocations || [];

  for (const conn of connections) {
    if (conn.status === 'Draft' || conn.status === 'Inactive') continue;
    const isMember =
      conn.memberIds?.includes(sensor.id) ||
      conn.members?.some((m) => m.hardwareId === sensor.id) ||
      conn.hardwareId === sensor.id ||
      conn.parentId === sensor.id;
    if (!isMember) continue;

    const effConnStatus = computeEffectiveConnectionStatus(conn, store, nowMs).status;
    if (effConnStatus !== 'Active') continue;

    const connSensorBindings = bindings.filter(
      (b) =>
        b.connectionId === conn.id &&
        (b.fromHardwareId === sensor.id || b.toHardwareId === sensor.id)
    );
    const hasEffectiveBinding = connSensorBindings.some(
      (b) => computeHardwareBindingStatus(b, bindings, conn.members || [], nowMs).status === 'Active'
    );
    if (hasEffectiveBinding) return 'Active';

    const hasEffectiveAllocation = allocations.some((a) => {
      if (a.connectionId !== conn.id) return false;
      if (a.hardwareId === sensor.id) {
        return (
          computeResourceAllocationStatus(a, allocations, nowMs, {
            connections,
            store: store as any
          }).status === 'Active'
        );
      }
      // Standalone/direct-reporting sensor covered by whole-connection allocation when not governed by an ended/scheduled parent binding
      if (a.hardwareId == null && connSensorBindings.length === 0) {
        return (
          computeResourceAllocationStatus(a, allocations, nowMs, {
            connections,
            store: store as any
          }).status === 'Active'
        );
      }
      return false;
    });
    if (hasEffectiveAllocation) return 'Active';
  }

  return 'Inventory';
}

export function deriveSensorMappingFilterStatus(
  sensorId: string,
  store: Pick<ModalMasterStore, 'connections' | 'hardwareBindings' | 'resourceAllocations'> &
    Partial<Pick<ModalMasterStore, 'devices' | 'sensors' | 'sims'>>,
  nowMs: number = Date.now()
): SensorMappingFilterStatus {
  const connections = store.connections || [];
  const bindings = store.hardwareBindings || [];
  const allocations = store.resourceAllocations || [];

  let hasActive = false;
  let hasScheduled = false;

  for (const conn of connections) {
    if (conn.status === 'Draft' || conn.status === 'Inactive') continue;
    const isMember =
      conn.memberIds?.includes(sensorId) ||
      conn.members?.some((m) => m.hardwareId === sensorId) ||
      conn.hardwareId === sensorId ||
      conn.parentId === sensorId;
    if (!isMember) continue;

    const effConnStatus = computeEffectiveConnectionStatus(conn, store, nowMs).status;
    const connSensorBindings = bindings.filter(
      (b) =>
        b.connectionId === conn.id &&
        (b.fromHardwareId === sensorId || b.toHardwareId === sensorId)
    );

    if (effConnStatus === 'Active') {
      const hasEffectiveBinding = connSensorBindings.some(
        (b) => computeHardwareBindingStatus(b, bindings, conn.members || [], nowMs).status === 'Active'
      );
      const hasEffectiveAllocation = allocations.some((a) => {
        if (a.connectionId !== conn.id) return false;
        if (a.hardwareId === sensorId) {
          return (
            computeResourceAllocationStatus(a, allocations, nowMs, {
              connections,
              store: store as any
            }).status === 'Active'
          );
        }
        if (a.hardwareId == null && connSensorBindings.length === 0) {
          return (
            computeResourceAllocationStatus(a, allocations, nowMs, {
              connections,
              store: store as any
            }).status === 'Active'
          );
        }
        return false;
      });
      if (hasEffectiveBinding || hasEffectiveAllocation) {
        hasActive = true;
        break;
      }
    }

    if (effConnStatus === 'Active' || effConnStatus === 'Scheduled') {
      const hasScheduledBinding = connSensorBindings.some(
        (b) =>
          computeHardwareBindingStatus(b, bindings, conn.members || [], nowMs).status === 'Scheduled'
      );
      const hasScheduledAllocation = allocations.some((a) => {
        if (a.connectionId !== conn.id) return false;
        if (a.hardwareId === sensorId) {
          return (
            computeResourceAllocationStatus(a, allocations, nowMs, {
              connections,
              store: store as any
            }).status === 'Scheduled'
          );
        }
        if (a.hardwareId == null && connSensorBindings.length === 0) {
          return (
            computeResourceAllocationStatus(a, allocations, nowMs, {
              connections,
              store: store as any
            }).status === 'Scheduled'
          );
        }
        return false;
      });
      if (hasScheduledBinding || hasScheduledAllocation) {
        hasScheduled = true;
      }
    }
  }

  if (hasActive) return 'Active Mapping';
  if (hasScheduled) return 'Scheduled';

  const refs = getSensorMappingReferences(sensorId, store, nowMs);
  if (refs.hasAnyReference) return 'Historical/Ended';

  return 'Unmapped';
}

function migrateSensorRecords(
  sensors: SensorRecord[],
  store: Pick<ModalMasterStore, 'connections' | 'hardwareBindings' | 'resourceAllocations'> &
    Partial<Pick<ModalMasterStore, 'devices' | 'sensors' | 'sims'>>
): SensorRecord[] {
  return sensors.map((s) => {
    const rawLifecycle = s.hardwareLifecycle;
    const hasMeta = Boolean(s.legacyStatusMetadata);

    let nextOverride = s.statusOverride;
    if (nextOverride === undefined) {
      if (rawLifecycle === 'Decommissioned') nextOverride = 'Decommissioned';
      else if (rawLifecycle === 'In Maintenance' || rawLifecycle === 'Suspended') {
        nextOverride = 'In Maintenance';
      } else {
        nextOverride = null;
      }
    }

    const legacyStatusMetadata = hasMeta
      ? s.legacyStatusMetadata
      : {
          originalHardwareLifecycle: rawLifecycle,
          ...(rawLifecycle === 'Pending Hardware Review' ? { pendingHardwareReview: true } : {}),
          migratedAt: '2026-11-22'
        };

    const candidate: SensorRecord = {
      ...s,
      statusOverride: nextOverride,
      legacyStatusMetadata
    };
    const effectiveStatus = deriveSensorStatus(candidate, store);

    return {
      ...candidate,
      hardwareLifecycle: effectiveStatus
    };
  });
}

export interface SimMappingReferenceSummary {
  allConnections: ConnectionRecord[];
  allBindings: HardwareBinding[];
  allSimAssignments: SimAssignmentEvent[];
  activeOrScheduledConnections: ConnectionRecord[];
  hasAnyReference: boolean;
  hasActiveOrScheduledReference: boolean;
}

export interface SimComputedAssignment {
  assignmentStatus: SimMappingAssignmentStatus;
  assignedHardwareId: string;
  assignedHardwareName: string;
  assignedConnectionId: string;
  linkedHardwareNames: string[];
  linkedConnectionIds: string[];
}

export function getSimMappingReferences(
  simId: string,
  store: Pick<ModalMasterStore, 'connections' | 'hardwareBindings' | 'simAssignments'> &
    Partial<Pick<ModalMasterStore, 'resourceAllocations' | 'devices' | 'sensors' | 'sims'>>,
  nowMs: number = Date.now()
): SimMappingReferenceSummary {
  const connections = store.connections || [];
  const bindings = store.hardwareBindings || [];
  const simAssignments = store.simAssignments || [];

  const seenConnIds = new Set<string>();
  const allConnections: ConnectionRecord[] = [];
  connections.forEach((c) => {
    const isDirect =
      c.memberIds?.includes(simId) ||
      c.members?.some((m) => m.hardwareId === simId) ||
      c.simId === simId;
    if (isDirect) {
      seenConnIds.add(c.id);
      allConnections.push(c);
    }
  });

  const allBindings = bindings.filter(
    (b) => b.toHardwareId === simId || b.fromHardwareId === simId
  );
  allBindings.forEach((b) => {
    if (!seenConnIds.has(b.connectionId)) {
      const conn = connections.find((c) => c.id === b.connectionId);
      if (conn) {
        seenConnIds.add(conn.id);
        allConnections.push(conn);
      }
    }
  });

  const allSimAssignments = simAssignments.filter((sa) => sa.simId === simId);
  allSimAssignments.forEach((sa) => {
    if (!seenConnIds.has(sa.connectionId)) {
      const conn = connections.find(
        (c) => c.id === sa.connectionId || c.connectionId === sa.connectionId
      );
      if (conn) {
        seenConnIds.add(conn.id);
        allConnections.push(conn);
      }
    }
  });

  const activeOrScheduledConnections = allConnections.filter((c) => {
    const effStatus = computeEffectiveConnectionStatus(c, store, nowMs).status;
    if (effStatus !== 'Active' && effStatus !== 'Scheduled' && effStatus !== 'Needs Attention') {
      return false;
    }
    const connBindings = allBindings.filter((b) => b.connectionId === c.id);
    if (connBindings.length > 0) {
      return connBindings.some((b) => {
        const st = computeHardwareBindingStatus(b, bindings, c.members || [], nowMs).status;
        return st === 'Active' || st === 'Scheduled' || st === 'Conflict';
      });
    }
    return false;
  });

  return {
    allConnections,
    allBindings,
    allSimAssignments,
    activeOrScheduledConnections,
    hasAnyReference:
      allConnections.length > 0 ||
      allBindings.length > 0 ||
      allSimAssignments.length > 0,
    hasActiveOrScheduledReference: activeOrScheduledConnections.length > 0
  };
}

export function resolveSimComputedAssignment(
  simId: string,
  store: Pick<
    ModalMasterStore,
    'connections' | 'hardwareBindings' | 'devices' | 'sensors' | 'simAssignments'
  > &
    Partial<Pick<ModalMasterStore, 'resourceAllocations' | 'sims'>>,
  nowMs: number = Date.now()
): SimComputedAssignment {
  const connections = store.connections || [];
  const bindings = store.hardwareBindings || [];
  const devices = store.devices || [];
  const sensors = store.sensors || [];
  const simAssignments = store.simAssignments || [];

  const refs = getSimMappingReferences(simId, store, nowMs);

  const resolvePeerLabel = (peerId: string, conn?: ConnectionRecord): string => {
    const dev = devices.find((d) => d.id === peerId);
    if (dev) return `${dev.deviceId} · ${dev.name}`;
    const sen = sensors.find((s) => s.id === peerId);
    if (sen) return `${sen.deviceId} · ${sen.name}`;
    const mem = conn?.members?.find((m) => m.hardwareId === peerId);
    if (mem) return `${mem.identifierValue} · ${mem.modelLabel}`;
    return peerId;
  };

  const linkedHardwareSet = new Set<string>();
  const linkedConnSet = new Set<string>();
  refs.allConnections.forEach((c) => {
    if (c.connectionId || c.id) linkedConnSet.add(c.connectionId || c.id);
  });
  refs.allSimAssignments.forEach((sa) => {
    if (sa.connectionId) linkedConnSet.add(sa.connectionId);
    if (sa.hardwareName) linkedHardwareSet.add(sa.hardwareName);
  });

  const activeEntries: { hardwareId: string; hardwareName: string; connectionId: string }[] = [];
  const scheduledEntries: { hardwareId: string; hardwareName: string; connectionId: string }[] = [];
  const conflictEntries: { hardwareId: string; hardwareName: string; connectionId: string }[] = [];

  refs.allBindings.forEach((b) => {
    const conn = connections.find((c) => c.id === b.connectionId);
    if (conn?.status === 'Draft' || conn?.status === 'Inactive') return;
    const effConnStatus = conn
      ? computeEffectiveConnectionStatus(conn, store, nowMs).status
      : undefined;
    if (effConnStatus === 'Draft' || effConnStatus === 'Inactive') return;

    const peerId = b.fromHardwareId === simId ? b.toHardwareId : b.fromHardwareId;
    const peerLabel = resolvePeerLabel(peerId, conn);
    linkedHardwareSet.add(peerLabel);
    const connLabel = conn?.connectionId || conn?.id || b.connectionId;
    if (connLabel) linkedConnSet.add(connLabel);

    const bindingStatus = computeHardwareBindingStatus(
      b,
      bindings,
      conn?.members || [],
      nowMs
    ).status;

    if (bindingStatus === 'Conflict') {
      conflictEntries.push({
        hardwareId: peerId,
        hardwareName: peerLabel,
        connectionId: connLabel
      });
      return;
    }

    if (effConnStatus === 'Needs Attention' && !b.endedAt && b.statusOverride !== 'Canceled') {
      conflictEntries.push({
        hardwareId: peerId,
        hardwareName: peerLabel,
        connectionId: connLabel
      });
      return;
    }

    if (effConnStatus === 'Active' && bindingStatus === 'Active') {
      activeEntries.push({
        hardwareId: peerId,
        hardwareName: peerLabel,
        connectionId: connLabel
      });
      return;
    }

    if ((effConnStatus === 'Active' || effConnStatus === 'Scheduled') && bindingStatus === 'Scheduled') {
      scheduledEntries.push({
        hardwareId: peerId,
        hardwareName: peerLabel,
        connectionId: connLabel
      });
    }
  });

  // Reconcile connections mentioning this SIM without explicit HardwareBinding rows
  const todayStr = new Date(nowMs).toISOString().slice(0, 10);
  refs.allConnections.forEach((conn) => {
    const hasConnBindings = refs.allBindings.some((b) => b.connectionId === conn.id);
    if (hasConnBindings) return;
    if (conn.status === 'Draft' || conn.status === 'Inactive') return;
    if (conn.status === 'Needs Attention') {
      conflictEntries.push({
        hardwareId: conn.hardwareId || '',
        hardwareName: conn.hardwareId ? resolvePeerLabel(conn.hardwareId, conn) : conn.name,
        connectionId: conn.connectionId || conn.id
      });
    } else if (conn.status === 'Scheduled') {
      scheduledEntries.push({
        hardwareId: conn.hardwareId || '',
        hardwareName: conn.hardwareId ? resolvePeerLabel(conn.hardwareId, conn) : conn.name,
        connectionId: conn.connectionId || conn.id
      });
    }
  });

  // Reconcile legacy simAssignments ONLY if no authoritative connection binding covers that connection
  refs.allSimAssignments.forEach((sa) => {
    const matchingConn = connections.find(
      (c) => c.id === sa.connectionId || c.connectionId === sa.connectionId
    );
    if (matchingConn) {
      const hasAuthBindings = refs.allBindings.some((b) => b.connectionId === matchingConn.id);
      if (hasAuthBindings) return;
      const effStatus = computeEffectiveConnectionStatus(matchingConn, store, nowMs).status;
      if (effStatus !== 'Active' && effStatus !== 'Scheduled') return;
      const startOk = !sa.start || sa.start <= todayStr;
      const endOk = !sa.end || sa.end >= todayStr;
      if (effStatus === 'Active' && startOk && endOk) {
        if (!activeEntries.some((a) => a.connectionId === (matchingConn.connectionId || matchingConn.id))) {
          activeEntries.push({
            hardwareId: sa.hardwareId,
            hardwareName: sa.hardwareName || resolvePeerLabel(sa.hardwareId, matchingConn),
            connectionId: matchingConn.connectionId || matchingConn.id
          });
        }
      } else if (sa.start && sa.start > todayStr) {
        scheduledEntries.push({
          hardwareId: sa.hardwareId,
          hardwareName: sa.hardwareName || resolvePeerLabel(sa.hardwareId, matchingConn),
          connectionId: matchingConn.connectionId || matchingConn.id
        });
      }
      return;
    }

    // Pure legacy orphan event without connection record
    const startOk = !sa.start || sa.start <= todayStr;
    const endOk = !sa.end || sa.end >= todayStr;
    if (startOk && endOk) {
      activeEntries.push({
        hardwareId: sa.hardwareId,
        hardwareName: sa.hardwareName || sa.hardwareId,
        connectionId: sa.connectionId
      });
    } else if (sa.start && sa.start > todayStr && (!sa.end || sa.end >= sa.start)) {
      scheduledEntries.push({
        hardwareId: sa.hardwareId,
        hardwareName: sa.hardwareName || sa.hardwareId,
        connectionId: sa.connectionId
      });
    }
  });

  if (conflictEntries.length > 0 || activeEntries.length > 1) {
    const allConflicted = [...conflictEntries, ...activeEntries];
    const uniqueConns = Array.from(new Set(allConflicted.map((e) => e.connectionId).filter(Boolean)));
    const firstHw = allConflicted[0]?.hardwareName || 'Conflict';
    return {
      assignmentStatus: 'Conflict / Needs Attention',
      assignedHardwareId: allConflicted[0]?.hardwareId || '',
      assignedHardwareName:
        activeEntries.length > 1 ? `Conflict (${activeEntries.length} bindings) · ${firstHw}` : firstHw,
      assignedConnectionId: uniqueConns.join(', ') || '—',
      linkedHardwareNames: Array.from(linkedHardwareSet),
      linkedConnectionIds: Array.from(linkedConnSet)
    };
  }

  if (activeEntries.length === 1) {
    return {
      assignmentStatus: 'Active Mapping',
      assignedHardwareId: activeEntries[0].hardwareId,
      assignedHardwareName: activeEntries[0].hardwareName,
      assignedConnectionId: activeEntries[0].connectionId,
      linkedHardwareNames: Array.from(linkedHardwareSet),
      linkedConnectionIds: Array.from(linkedConnSet)
    };
  }

  if (scheduledEntries.length > 0) {
    return {
      assignmentStatus: 'Scheduled',
      assignedHardwareId: '',
      assignedHardwareName: 'Unassigned',
      assignedConnectionId: '—',
      linkedHardwareNames: Array.from(linkedHardwareSet),
      linkedConnectionIds: Array.from(linkedConnSet)
    };
  }

  if (refs.hasAnyReference) {
    return {
      assignmentStatus: 'Historical/Ended',
      assignedHardwareId: '',
      assignedHardwareName: 'Unassigned',
      assignedConnectionId: '—',
      linkedHardwareNames: Array.from(linkedHardwareSet),
      linkedConnectionIds: Array.from(linkedConnSet)
    };
  }

  return {
    assignmentStatus: 'Unassigned',
    assignedHardwareId: '',
    assignedHardwareName: 'Unassigned',
    assignedConnectionId: '—',
    linkedHardwareNames: Array.from(linkedHardwareSet),
    linkedConnectionIds: Array.from(linkedConnSet)
  };
}

export function deriveSimEffectiveInventoryStatus(
  sim: SimRecord,
  store: Pick<
    ModalMasterStore,
    'connections' | 'hardwareBindings' | 'devices' | 'sensors' | 'simAssignments'
  >,
  nowMs: number = Date.now(),
  precomputedAssignment?: SimComputedAssignment
): EffectiveSimInventoryStatus {
  if (sim.status === 'Retired') return 'Retired';
  if (sim.status === 'Suspended' || sim.status === 'Inactive') return 'Suspended';

  if (sim.status === 'Active') {
    const assignment =
      precomputedAssignment || resolveSimComputedAssignment(sim.id, store, nowMs);
    if (assignment.assignmentStatus === 'Active Mapping') {
      return 'Active';
    }
  }

  return 'Inventory';
}

export function deriveSimMappingStatus(
  simId: string,
  store: Pick<
    ModalMasterStore,
    'connections' | 'hardwareBindings' | 'devices' | 'sensors' | 'simAssignments'
  >,
  nowMs: number = Date.now()
): SimMappingAssignmentStatus {
  return resolveSimComputedAssignment(simId, store, nowMs).assignmentStatus;
}

export function computeBindingStatus(
  binding: Pick<BindingRecord, 'start' | 'end' | 'endedAt' | 'status'>,
  todayStr = '2026-11-13'
): 'Active' | 'Scheduled' | 'Ended' | 'Inactive' {
  if (binding.endedAt || binding.status === 'Ended') return 'Ended';
  if (binding.end && binding.end < todayStr) return 'Ended';
  if (binding.start && binding.start > todayStr) return 'Scheduled';
  if (binding.status === 'Inactive') return 'Inactive';
  return 'Active';
}

export function getTimezoneAbbr(tz: string): string {
  const found = SUPPORTED_TIMEZONES.find((t) => t.value === tz);
  return found ? found.abbr : tz;
}

export function getTimezoneOffset(tz: string): string {
  const found = SUPPORTED_TIMEZONES.find((t) => t.value === tz);
  return found ? found.offset : '+05:30';
}

export function formatDateTimeWithTz(
  isoStr?: string | null,
  tz: string = 'Asia/Kolkata',
  withSeconds: boolean = false
): string {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  const abbr = getTimezoneAbbr(tz);
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(withSeconds ? { second: '2-digit' } : {}),
      hour12: true
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
    const timeStr = withSeconds
      ? `${get('hour')}:${get('minute')}:${get('second')} ${get('dayPeriod').toUpperCase()}`
      : `${get('hour')}:${get('minute')} ${get('dayPeriod').toUpperCase()}`;
    return `${get('day')} ${get('month')} ${get('year')} · ${timeStr} ${abbr}`;
  } catch {
    return `${isoStr} (${abbr})`;
  }
}

export function formatLocalInputParts(isoStr?: string | null, tz: string = 'Asia/Kolkata'): { date: string; time: string } {
  if (!isoStr) return { date: '', time: '10:30:00' };
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return { date: '', time: '10:30:00' };
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(d);
    const get = (t: string) => fmt.find((p) => p.type === t)?.value || '00';
    const hour = get('hour') === '24' ? '00' : get('hour');
    return {
      date: `${get('year')}-${get('month')}-${get('day')}`,
      time: `${hour}:${get('minute')}:${get('second')}`
    };
  } catch {
    return { date: isoStr.slice(0, 10), time: '10:30:00' };
  }
}

export function buildIsoWithTimezone(dateStr: string, timeStr: string, tz: string = 'Asia/Kolkata'): string {
  if (!dateStr) return '';
  const cleanTime = timeStr && timeStr.length === 5 ? `${timeStr}:00` : timeStr || '00:00:00';
  const offset = getTimezoneOffset(tz);
  return `${dateStr}T${cleanTime}${offset}`;
}

export function compareConnectionIds(a: string, b: string): number {
  const ma = a.match(/^(.*?)(\d+)$/);
  const mb = b.match(/^(.*?)(\d+)$/);
  if (ma && mb && ma[1] === mb[1]) {
    return Number(ma[2]) - Number(mb[2]);
  }
  return a.localeCompare(b);
}

// =====================================================================
// EXPANDABLE HARDWARE TREE ROW BUILDER (Shared by Modal Connection & Resource View)
// Builds hierarchy strictly from saved HardwareBinding records (never display order).
// Supports multi-hop Device -> Device -> IP Camera, multiple bindings per hardware
// without duplicating physical units, and hardware-scoped resource filtering.
// =====================================================================
export type ExpandableBindingDisplayStatus =
  | 'Root (Primary)'
  | 'Bound'
  | 'Scheduled'
  | 'Expired'
  | 'Conflict'
  | 'Canceled'
  | 'Unbound';

export interface ExpandableBindingRow {
  rowKey: string;
  rowNumber: number;
  member: HardwareMembership;
  parentMember: HardwareMembership | null;
  binding: HardwareBinding | null;
  depth: number;
  ancestorHasNext: boolean[];
  isLastSibling: boolean;
  isPrimaryRoot: boolean;
  isAdditionalBindingRef: boolean;
  displayStatus: ExpandableBindingDisplayStatus;
  statusReason?: string;
}

export function getScopedHardwareAndBindings(
  members: HardwareMembership[],
  connBindings: HardwareBinding[],
  scopeHardwareId?: string | null
): { scopedMembers: HardwareMembership[]; scopedBindings: HardwareBinding[] } {
  if (!scopeHardwareId) {
    return { scopedMembers: members, scopedBindings: connBindings };
  }
  const rootExists = members.some((m) => m.hardwareId === scopeHardwareId);
  if (!rootExists) {
    return { scopedMembers: members, scopedBindings: connBindings };
  }
  const includedIds = new Set<string>([scopeHardwareId]);
  const queue = [scopeHardwareId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    connBindings.forEach((b) => {
      if (b.fromHardwareId === curr && !includedIds.has(b.toHardwareId)) {
        includedIds.add(b.toHardwareId);
        queue.push(b.toHardwareId);
      }
    });
  }
  return {
    scopedMembers: members.filter((m) => includedIds.has(m.hardwareId)),
    scopedBindings: connBindings.filter(
      (b) => includedIds.has(b.fromHardwareId) && includedIds.has(b.toHardwareId)
    )
  };
}

export function buildExpandableBindingRows(
  members: HardwareMembership[],
  connBindings: HardwareBinding[],
  allGlobalBindings: HardwareBinding[],
  scopeHardwareId?: string | null,
  nowMs: number = Date.now()
): ExpandableBindingRow[] {
  const { scopedMembers, scopedBindings } = getScopedHardwareAndBindings(
    members,
    connBindings,
    scopeHardwareId
  );
  if (scopedMembers.length === 0) return [];

  const memberMap = new Map<string, HardwareMembership>();
  scopedMembers.forEach((m) => memberMap.set(m.hardwareId, m));

  const incomingIds = new Set<string>();
  const outgoingMap = new Map<string, HardwareBinding[]>();
  scopedBindings.forEach((b) => {
    if (memberMap.has(b.fromHardwareId) && memberMap.has(b.toHardwareId)) {
      incomingIds.add(b.toHardwareId);
      const list = outgoingMap.get(b.fromHardwareId) || [];
      list.push(b);
      outgoingMap.set(b.fromHardwareId, list);
    }
  });

  // Order roots: explicit scopeHardwareId or primary member first, then any members without incoming edges
  const explicitRoots = scopedMembers.filter(
    (m) =>
      (scopeHardwareId ? m.hardwareId === scopeHardwareId : false) ||
      !incomingIds.has(m.hardwareId)
  );
  explicitRoots.sort((a, b) => {
    if (scopeHardwareId) {
      if (a.hardwareId === scopeHardwareId) return -1;
      if (b.hardwareId === scopeHardwareId) return 1;
    }
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return 0;
  });

  const roots =
    explicitRoots.length > 0
      ? explicitRoots
      : [scopedMembers.find((m) => m.isPrimary) || scopedMembers[0]];

  const rows: ExpandableBindingRow[] = [];
  const visitedUnitTree = new Set<string>();
  const visitedBindingIds = new Set<string>();

  const mapBindingStatus = (
    b: HardwareBinding
  ): { displayStatus: ExpandableBindingDisplayStatus; reason?: string } => {
    const computed = computeHardwareBindingStatus(b, allGlobalBindings, members, nowMs);
    if (computed.status === 'Active') return { displayStatus: 'Bound', reason: computed.reason };
    if (computed.status === 'Ended') return { displayStatus: 'Expired', reason: computed.reason };
    if (computed.status === 'Scheduled') return { displayStatus: 'Scheduled', reason: computed.reason };
    if (computed.status === 'Conflict') return { displayStatus: 'Conflict', reason: computed.reason };
    return { displayStatus: 'Canceled', reason: computed.reason };
  };

  const walkChildren = (
    parentId: string,
    depth: number,
    ancestorHasNext: boolean[],
    lineageIds: Set<string>
  ) => {
    const childrenBindings = (outgoingMap.get(parentId) || []).slice().sort((a, b) => {
      // Group Device -> Sensor -> SIM cleanly, preserving deterministic order
      const ma = memberMap.get(a.toHardwareId);
      const mb = memberMap.get(b.toHardwareId);
      const rank = (cat?: HardwareCategory) => (cat === 'Device' ? 0 : cat === 'Sensor' ? 1 : 2);
      const rDiff = rank(ma?.category) - rank(mb?.category);
      if (rDiff !== 0) return rDiff;
      return a.id.localeCompare(b.id);
    });

    childrenBindings.forEach((b, idx) => {
      const childMem = memberMap.get(b.toHardwareId);
      const parentMem = memberMap.get(b.fromHardwareId) || null;
      if (!childMem) return;
      const isLast = idx === childrenBindings.length - 1;
      const { displayStatus, reason } = mapBindingStatus(b);
      const alreadyRenderedAsNode = visitedUnitTree.has(childMem.hardwareId);

      visitedBindingIds.add(b.id);
      visitedUnitTree.add(childMem.hardwareId);

      rows.push({
        rowKey: `${b.id}-${childMem.hardwareId}`,
        rowNumber: rows.length + 1,
        member: childMem,
        parentMember: parentMem,
        binding: b,
        depth,
        ancestorHasNext,
        isLastSibling: isLast,
        isPrimaryRoot: false,
        isAdditionalBindingRef: alreadyRenderedAsNode,
        displayStatus,
        statusReason: reason
      });

      if (!alreadyRenderedAsNode && !lineageIds.has(childMem.hardwareId)) {
        const nextLineage = new Set(lineageIds);
        nextLineage.add(childMem.hardwareId);
        walkChildren(childMem.hardwareId, depth + 1, [...ancestorHasNext, !isLast], nextLineage);
      }
    });
  };

  roots.forEach((rootMem) => {
    if (visitedUnitTree.has(rootMem.hardwareId)) return;
    visitedUnitTree.add(rootMem.hardwareId);
    const hasChildren = (outgoingMap.get(rootMem.hardwareId) || []).length > 0;
    const isPrimaryRoot = Boolean(rootMem.isPrimary || scopeHardwareId === rootMem.hardwareId || hasChildren);
    rows.push({
      rowKey: `root-${rootMem.hardwareId}`,
      rowNumber: rows.length + 1,
      member: rootMem,
      parentMember: null,
      binding: null,
      depth: 0,
      ancestorHasNext: [],
      isLastSibling: true,
      isPrimaryRoot,
      isAdditionalBindingRef: false,
      displayStatus: isPrimaryRoot ? 'Root (Primary)' : 'Unbound'
    });
    walkChildren(rootMem.hardwareId, 1, [], new Set([rootMem.hardwareId]));
  });

  // Safety pass: any cyclic components or unwalked members/bindings
  scopedMembers.forEach((m) => {
    if (!visitedUnitTree.has(m.hardwareId)) {
      visitedUnitTree.add(m.hardwareId);
      const inB = scopedBindings.find((b) => b.toHardwareId === m.hardwareId && !visitedBindingIds.has(b.id)) || null;
      const pMem = inB ? memberMap.get(inB.fromHardwareId) || null : null;
      const st = inB ? mapBindingStatus(inB) : { displayStatus: 'Unbound' as ExpandableBindingDisplayStatus };
      if (inB) visitedBindingIds.add(inB.id);
      rows.push({
        rowKey: `extra-${m.hardwareId}`,
        rowNumber: rows.length + 1,
        member: m,
        parentMember: pMem,
        binding: inB,
        depth: inB ? 1 : 0,
        ancestorHasNext: [],
        isLastSibling: true,
        isPrimaryRoot: !inB && Boolean(m.isPrimary),
        isAdditionalBindingRef: false,
        displayStatus: st.displayStatus,
        statusReason: st.reason
      });
      walkChildren(m.hardwareId, inB ? 2 : 1, [], new Set([m.hardwareId]));
    }
  });

  return rows;
}

// =====================================================================
// DETERMINISTIC SEED DATA GENERATOR
// Preserves hardware masters (84 Devices, 216 Sensors, 420 SIMs) distributed
// across client companies + MD §3.3 & §4.3 demo fixtures + multi-hardware Connections.
// =====================================================================
export function generateModalMasterSeedData(): {
  devices: DeviceRecord[];
  sensors: SensorRecord[];
  sims: SimRecord[];
  connections: ConnectionRecord[];
  hardwareBindings: HardwareBinding[];
  resourceAllocations: ResourceAllocation[];
  resourceRelationships: ResourceRelationship[];
  // Legacy aliases kept for Hardware Masters / compatibility
  bindings: BindingRecord[];
  resources: ResourceRecord[];
  simAssignments: SimAssignmentEvent[];
} {
  const devices: DeviceRecord[] = [];
  const sensors: SensorRecord[] = [];
  const sims: SimRecord[] = [];
  const connections: ConnectionRecord[] = [];
  const hardwareBindings: HardwareBinding[] = [];
  const resourceAllocations: ResourceAllocation[] = [];
  const bindings: BindingRecord[] = [];
  const resources: ResourceRecord[] = [];
  const simAssignments: SimAssignmentEvent[] = [];

  const categories: GatewayCategory[] = ['GPS', 'ADAS/DMS', 'E-Lock', 'CCTV', 'IP Camera', 'Face Terminal'];
  const lifecycles: HardwareLifecycleStatus[] = ['Active', 'Inventory', 'Active', 'In Maintenance', 'Active'];

  // Curated Device fixtures for Adani Mundra matching Screenshot & 10 Presentation Scenarios
  devices.push(
    {
      id: 'dev-mundra-10292',
      deviceId: 'MTX-AD-10292',
      name: 'ADAS/DMS Dashcam — MettaX MC202N',
      kind: 'ADAS/DMS Dashcam',
      role: 'gateway',
      manufacturer: 'MettaX',
      modelText: 'MC202N',
      modelTypeId: 'mcat-01',
      identifierType: 'IMEI',
      mode: 'ADAS + DMS',
      serial: 'SN-MTX-10292',
      imei: '861753060421903',
      capabilities: ['Cellular', 'AHD', 'RS485', 'BLE', 'Wi-Fi'],
      platformProtocol: 'METTA',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Active',
      registeredAt: '2026-06-12',
      updatedAt: '2026-11-13',
      channelCount: 4,
      simSlots: 1,
      supportedPorts: ['SIM Slot 1', 'BLE-1', 'RS485-1', 'CH-1', 'CH-2'],
      notes: 'Primary ADAS/DMS dashcam unit for Mundra Vehicle Kit 01'
    },
    {
      id: 'dev-mundra-88921',
      deviceId: 'DVR-88921',
      name: 'DVR / MDVR — Streamax XVR-410',
      kind: 'DVR / MDVR',
      role: 'gateway',
      manufacturer: 'Streamax',
      modelText: 'XVR-410',
      modelTypeId: 'mcat-04',
      identifierType: 'Serial Number',
      mode: 'CAM1',
      serial: 'DVR-88921',
      imei: '',
      capabilities: ['Cellular', 'AHD', 'RS485', 'Ethernet'],
      platformProtocol: 'Streamax Protocol',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Active',
      registeredAt: '2026-06-15',
      updatedAt: '2026-11-13',
      channelCount: 4,
      supportedPorts: ['CH-1', 'CH-2', 'CH-3', 'CH-4', 'ETH-1', 'RS485-1'],
      notes: 'MDVR recorder bound to ADAS/DMS Dashcam in Mundra Vehicle Kit 01'
    },
    {
      id: 'dev-mundra-9002',
      deviceId: 'GPS-9002',
      name: 'GPS Tracker — Teltonika FMB140',
      kind: 'GPS Tracker',
      role: 'gateway',
      manufacturer: 'Teltonika',
      modelText: 'FMB140',
      modelTypeId: 'mcat-03',
      identifierType: 'IMEI',
      mode: 'GPS tracking',
      serial: 'SN-GPS-9002',
      imei: '864019283749002',
      capabilities: ['Cellular', 'BLE', 'RS485'],
      platformProtocol: 'Codec8',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra South Basin',
      hardwareLifecycle: 'Active',
      registeredAt: '2026-06-18',
      updatedAt: '2026-11-12',
      channelCount: 4,
      simSlots: 1,
      supportedPorts: ['SIM Slot 1', 'BLE-1', 'BLE-2', 'RS485-1'],
      notes: 'Fuel Monitoring 02 primary tracker'
    },
    {
      id: 'dev-mundra-hk7781',
      deviceId: 'HK-IPC-7781',
      name: 'IP Camera — Hikvision DS-2CD2043G2-I',
      kind: 'IP Camera',
      role: 'gateway',
      manufacturer: 'Hikvision',
      modelText: 'DS-2CD2043G2-I',
      modelTypeId: 'mcat-05',
      identifierType: 'Serial Number',
      mode: 'Standard',
      serial: 'HK-IPC-7781',
      imei: '',
      capabilities: ['Ethernet', 'ONVIF', 'RTSP', 'ISUP'],
      platformProtocol: 'ONVIF',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Active',
      registeredAt: '2026-06-20',
      updatedAt: '2026-11-11',
      channelCount: 1,
      supportedPorts: ['ETH-1'],
      notes: 'Exterior dome IP camera chained to DVR-88921 CH-1'
    },
    {
      id: 'dev-mundra-cam01',
      deviceId: 'CAM-4410',
      name: 'IP Camera — Hikvision DS-2CD2043G2-I',
      kind: 'IP Camera',
      role: 'gateway',
      manufacturer: 'Hikvision',
      modelText: 'DS-2CD2043G2-I',
      modelTypeId: 'mcat-05',
      identifierType: 'Serial Number',
      mode: 'Standard',
      serial: 'CAM-4410',
      imei: '',
      capabilities: ['Ethernet', 'ONVIF', 'RTSP'],
      platformProtocol: 'ONVIF',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Active',
      registeredAt: '2026-06-22',
      updatedAt: '2026-11-11',
      channelCount: 1,
      supportedPorts: ['ETH-1'],
      notes: 'Secondary yard camera for DVR Kit 03'
    },
    {
      id: 'dev-mundra-10400',
      deviceId: 'MTX-AD-10400',
      name: 'ADAS/DMS Dashcam — MettaX MC202L',
      kind: 'ADAS/DMS Dashcam',
      role: 'gateway',
      manufacturer: 'MettaX',
      modelText: 'MC202L',
      modelTypeId: 'mcat-02',
      identifierType: 'IMEI',
      mode: 'ADAS + DMS',
      serial: 'SN-MTX-10400',
      imei: '861753060410400',
      capabilities: ['Cellular', 'AHD', 'RS485'],
      platformProtocol: 'METTA',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Active',
      registeredAt: '2026-07-01',
      updatedAt: '2026-11-12',
      channelCount: 2,
      simSlots: 1,
      supportedPorts: ['SIM Slot 1', 'RS485-1'],
      notes: 'Telematics 06 scheduled unit'
    },
    {
      id: 'dev-mundra-ready01',
      deviceId: 'MTX-AD-10955',
      name: 'ADAS/DMS Dashcam — MettaX MC202N',
      kind: 'ADAS/DMS Dashcam',
      role: 'gateway',
      manufacturer: 'MettaX',
      modelText: 'MC202N',
      modelTypeId: 'mcat-01',
      identifierType: 'IMEI',
      mode: 'ADAS + DMS',
      serial: 'SN-MTX-10955',
      imei: '861753060499955',
      capabilities: ['Cellular', 'AHD', 'RS485', 'BLE'],
      platformProtocol: 'METTA',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Inventory',
      registeredAt: '2026-11-01',
      updatedAt: '2026-11-12',
      channelCount: 4,
      simSlots: 1,
      supportedPorts: ['SIM Slot 1', 'BLE-1', 'RS485-1'],
      notes: 'Unassigned stock ready for Adani Mundra mapping'
    },
    {
      id: 'dev-mundra-solo01',
      deviceId: 'GPS-7110',
      name: 'GPS Tracker — Teltonika FMB120',
      kind: 'GPS Tracker',
      role: 'gateway',
      manufacturer: 'Teltonika',
      modelText: 'FMB120',
      modelTypeId: 'mcat-03',
      identifierType: 'IMEI',
      mode: 'GPS tracking',
      serial: 'SN-GPS-7110',
      imei: '864019283747110',
      capabilities: ['Cellular', 'BLE'],
      platformProtocol: 'Codec8',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra South Basin',
      hardwareLifecycle: 'Active',
      registeredAt: '2026-09-10',
      updatedAt: '2026-11-12',
      channelCount: 4,
      simSlots: 1,
      supportedPorts: ['SIM Slot 1', 'BLE-1'],
      notes: 'Standalone GPS tracker without external peripherals'
    },
    {
      id: 'dev-mundra-gtw9032',
      deviceId: 'GTW-9032',
      name: 'ADAS/DMS Dashcam — MettaX MC202N (GTW-9032)',
      kind: 'ADAS/DMS Dashcam',
      role: 'gateway',
      manufacturer: 'MettaX',
      modelText: 'MC202N',
      modelTypeId: 'mcat-01',
      identifierType: 'IMEI',
      mode: 'ADAS + DMS',
      serial: 'SN-GTW-9032',
      imei: '861753060409032',
      capabilities: ['Cellular', 'AHD', 'RS485', 'BLE', 'Wi-Fi'],
      platformProtocol: 'METTA',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Inventory',
      registeredAt: '2026-11-05',
      updatedAt: '2026-11-13',
      channelCount: 4,
      simSlots: 1,
      supportedPorts: ['SIM Slot 1', 'BLE-1', 'BLE-2', 'RS485-1', 'CH-1', 'CH-2'],
      notes: 'Ready for Vehicle Kit demonstration (single-SIM ADAS/DMS primary unit)'
    },
    {
      id: 'dev-mundra-gtw9062',
      deviceId: 'GTW-9062',
      name: 'GPS Tracker — Teltonika FMB140 (GTW-9062)',
      kind: 'GPS Tracker',
      role: 'gateway',
      manufacturer: 'Teltonika',
      modelText: 'FMB140',
      modelTypeId: 'mcat-03',
      identifierType: 'IMEI',
      mode: 'GPS tracking',
      serial: 'SN-GTW-9062',
      imei: '864019283749062',
      capabilities: ['Cellular', 'BLE', 'RS485'],
      platformProtocol: 'Codec8',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Inventory',
      registeredAt: '2026-11-06',
      updatedAt: '2026-11-13',
      channelCount: 4,
      simSlots: 2,
      supportedPorts: ['SIM Slot 1', 'SIM Slot 2', 'BLE-1', 'BLE-2', 'RS485-1'],
      notes: 'Secondary dual-SIM gateway/tracker ready for Device-to-Device chaining'
    }
  );

  for (let i = devices.length; i < 84; i++) {
    const numNum = 9001 + i;
    if (numNum === 9032 || numNum === 9062) continue;
    const cat = categories[i % categories.length];
    const catDef = DEVICE_CATALOGUE[cat];
    const mfgNames = Object.keys(catDef.manufacturers);
    const mfg = mfgNames[i % mfgNames.length];
    const modelList = catDef.manufacturers[mfg].models;
    const modelObj = modelList[i % modelList.length];
    const loc = MODAL_LOCATIONS[i % MODAL_LOCATIONS.length];
    const owner = MODAL_OWNERS[i % MODAL_OWNERS.length];
    const lc = lifecycles[i % lifecycles.length];
    const mode = catDef.modes[i % catDef.modes.length];
    const hasImei = cat === 'GPS' || cat === 'ADAS/DMS' || cat === 'E-Lock';
    const numStr = numNum.toString();
    const modelTypeId =
      cat === 'GPS'
        ? 'mcat-03'
        : cat === 'ADAS/DMS'
        ? modelObj.model === 'MC202L'
          ? 'mcat-02'
          : 'mcat-01'
        : cat === 'CCTV'
        ? 'mcat-04'
        : cat === 'IP Camera'
        ? 'mcat-05'
        : 'mcat-06';

    devices.push({
      id: `dev-seed-${(i + 1).toString().padStart(4, '0')}`,
      deviceId: `GTW-${numStr}`,
      name: `${cat} — ${mfg} ${modelObj.model}`,
      kind: cat === 'GPS' ? 'GPS Tracker' : cat === 'ADAS/DMS' ? 'ADAS/DMS Dashcam' : cat === 'CCTV' ? 'DVR / MDVR' : cat,
      role: 'gateway',
      manufacturer: mfg,
      modelText: modelObj.model,
      modelTypeId,
      identifierType: hasImei ? 'IMEI' : 'Serial Number',
      mode,
      serial: `SN-GTW-${26000 + i}`,
      imei: hasImei ? `86401928374${(6100 + i).toString().padStart(4, '0')}` : '',
      capabilities: [...modelObj.capabilities],
      platformProtocol: modelObj.defaultProtocol,
      company: owner,
      inventoryLocation: loc,
      hardwareLifecycle: lc,
      registeredAt: `2026-0${(i % 6) + 3}-${((i % 25) + 1).toString().padStart(2, '0')}`,
      updatedAt: `2026-11-${((i % 10) + 1).toString().padStart(2, '0')}`,
      channelCount: modelObj.channelCount,
      simSlots: hasImei ? 1 : 0,
      supportedPorts: hasImei ? ['SIM Slot 1', 'BLE-1', 'RS485-1'] : ['CH-1', 'CH-2', 'ETH-1'],
      notes: i % 3 === 0 ? 'Standard device stock verified in warehouse' : ''
    });
  }

  // 2. Seed 216 Sensors (starting with curated Adani Mundra sensors)
  sensors.push(
    {
      id: 'sen-mundra-dsr8890',
      deviceId: 'DSR-8890',
      name: 'Door Sensor — Generic DS-100',
      kind: 'Door Sensor',
      role: 'peripheral',
      category: 'Door Sensor',
      manufacturer: 'Generic',
      modelText: 'DS-100',
      modelTypeId: 'mcat-09',
      identifierType: 'Sensor ID',
      serial: 'SN-DSR-8890',
      capabilities: ['BLE'],
      measurementCapability: 'Door State',
      measurementUnit: 'State',
      measurementRange: 'Open / Closed',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Active',
      registeredAt: '2026-06-15',
      updatedAt: '2026-11-13',
      notes: 'Access control door sensor bound in CON-1277'
    },
    {
      id: 'sen-mundra-dsr8891',
      deviceId: 'DSR-8891',
      name: 'Door Sensor — Generic DS-100',
      kind: 'Door Sensor',
      role: 'peripheral',
      category: 'Door Sensor',
      manufacturer: 'Generic',
      modelText: 'DS-100',
      modelTypeId: 'mcat-09',
      identifierType: 'Sensor ID',
      serial: 'SN-DSR-8891',
      capabilities: ['BLE'],
      measurementCapability: 'Door State',
      measurementUnit: 'State',
      measurementRange: 'Open / Closed',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Inventory',
      registeredAt: '2026-06-15',
      updatedAt: '2026-11-13',
      notes: 'Unassigned Door Sensor ready for Vehicle Kit demonstration'
    },
    {
      id: 'sen-mundra-tmp4015',
      deviceId: 'TMP-4015',
      name: 'Temperature Sensor — Teltonika EYE Sensor',
      kind: 'Temperature Sensor',
      role: 'peripheral',
      category: 'Temperature Sensor',
      manufacturer: 'Teltonika',
      modelText: 'EYE Sensor',
      modelTypeId: 'mcat-07',
      identifierType: 'Sensor ID',
      serial: 'SN-TMP-4015',
      capabilities: ['BLE'],
      measurementCapability: 'Temperature',
      measurementUnit: '°C',
      measurementRange: '−40 to +85 °C',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Active',
      registeredAt: '2026-06-16',
      updatedAt: '2026-11-13',
      notes: 'Reefer cabin temperature sensor scheduled for Mundra Vehicle Kit 01'
    },
    {
      id: 'sen-mundra-fls874',
      deviceId: 'FLS-ADM-000874',
      name: 'Fuel Level Sensor — Escort TD-BLE',
      kind: 'Fuel Level Sensor',
      role: 'peripheral',
      category: 'Fuel Level Sensor',
      manufacturer: 'Escort',
      modelText: 'TD-BLE',
      modelTypeId: 'mcat-08',
      identifierType: 'Sensor ID',
      serial: 'SN-FLS-000874',
      capabilities: ['BLE'],
      measurementCapability: 'Fuel level',
      measurementUnit: 'L',
      measurementRange: '0–600 L',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra South Basin',
      hardwareLifecycle: 'Active',
      registeredAt: '2026-06-18',
      updatedAt: '2026-11-12',
      notes: 'Primary tank probe for Fuel Monitoring 02'
    },
    {
      id: 'sen-mundra-fls875',
      deviceId: 'FLS-ADM-000875',
      name: 'Fuel Level Sensor — Escort DU-BLE',
      kind: 'Fuel Level Sensor',
      role: 'peripheral',
      category: 'Fuel Level Sensor',
      manufacturer: 'Escort',
      modelText: 'DU-BLE',
      modelTypeId: 'mcat-08',
      identifierType: 'Sensor ID',
      serial: 'SN-FLS-000875',
      capabilities: ['BLE'],
      measurementCapability: 'Fuel level',
      measurementUnit: 'L',
      measurementRange: '0–1000 L',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra South Basin',
      hardwareLifecycle: 'Active',
      registeredAt: '2026-06-18',
      updatedAt: '2026-11-12',
      notes: 'Secondary tank probe for Fuel Monitoring 02'
    },
    {
      id: 'sen-mundra-tmp410',
      deviceId: 'SNS-TMP-410',
      name: 'Temperature Sensor — Monnit ALTA Wi-Fi',
      kind: 'Temperature Sensor',
      role: 'peripheral',
      category: 'Temperature Sensor',
      manufacturer: 'Monnit',
      modelText: 'ALTA Wi-Fi Temperature',
      modelTypeId: 'mcat-07',
      identifierType: 'Sensor ID',
      serial: 'SN-TMP-410',
      capabilities: ['Wi-Fi', 'MQTT'],
      measurementCapability: 'Temperature',
      measurementUnit: '°C',
      measurementRange: '−40 to +125 °C',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Inventory',
      registeredAt: '2026-07-10',
      updatedAt: '2026-11-11',
      notes: 'Standalone cold-room sensor'
    },
    {
      id: 'sen-mundra-10017',
      deviceId: 'SENS-10017',
      name: 'Temperature Sensor — Teltonika EYE Sensor',
      kind: 'Temperature Sensor',
      role: 'peripheral',
      category: 'Temperature Sensor',
      manufacturer: 'Teltonika',
      modelText: 'EYE Sensor',
      modelTypeId: 'mcat-07',
      identifierType: 'Sensor ID',
      serial: 'SN-SENS-10017',
      capabilities: ['BLE'],
      measurementCapability: 'Temperature',
      measurementUnit: '°C',
      measurementRange: '−40 to +85 °C',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Inventory',
      registeredAt: '2026-11-04',
      updatedAt: '2026-11-13',
      notes: 'Ready for Vehicle Kit demonstration'
    },
    {
      id: 'sen-mundra-10027',
      deviceId: 'SENS-10027',
      name: 'Fuel Level Sensor — Escort TD-BLE',
      kind: 'Fuel Level Sensor',
      role: 'peripheral',
      category: 'Fuel Level Sensor',
      manufacturer: 'Escort',
      modelText: 'TD-BLE',
      modelTypeId: 'mcat-08',
      identifierType: 'Sensor ID',
      serial: 'SN-SENS-10027',
      capabilities: ['BLE'],
      measurementCapability: 'Fuel level',
      measurementUnit: 'L',
      measurementRange: '0–800 L',
      company: 'Adani Mundra',
      inventoryLocation: 'Mundra CT2',
      hardwareLifecycle: 'Inventory',
      registeredAt: '2026-11-04',
      updatedAt: '2026-11-13',
      notes: 'Ready for Vehicle Kit demonstration'
    }
  );

  for (let i = sensors.length; i < 216; i++) {
    const sensNum = 10001 + i;
    if (sensNum === 10017 || sensNum === 10027) continue;
    const typeChoice = i % 3 === 0 ? 'Door Sensor' : i % 2 === 0 ? 'Fuel Sensor' : 'Temperature Sensor';
    const sDef = SENSOR_CATALOGUE[typeChoice] || SENSOR_CATALOGUE['Temperature Sensor'];
    const mfgs = Object.keys(sDef.manufacturers);
    const mfg = mfgs[i % mfgs.length];
    const models = sDef.manufacturers[mfg].models;
    const modelObj = models[i % models.length];
    const loc = MODAL_LOCATIONS[i % MODAL_LOCATIONS.length];
    const owner = MODAL_OWNERS[i % MODAL_OWNERS.length];
    const lc = lifecycles[i % lifecycles.length];
    const modelTypeId =
      typeChoice === 'Temperature Sensor' ? 'mcat-07' : typeChoice === 'Fuel Sensor' ? 'mcat-08' : 'mcat-09';

    sensors.push({
      id: `sen-focus-${(i + 1).toString().padStart(4, '0')}`,
      deviceId: `SENS-${sensNum}`,
      name: `${typeChoice === 'Fuel Sensor' ? 'Fuel Level Sensor' : typeChoice} — ${mfg} ${modelObj.model} #${i + 1}`,
      kind: typeChoice === 'Fuel Sensor' ? 'Fuel Level Sensor' : typeChoice,
      role: 'peripheral',
      category: typeChoice === 'Fuel Sensor' ? 'Fuel Level Sensor' : typeChoice,
      manufacturer: mfg,
      modelText: modelObj.model,
      modelTypeId,
      identifierType: 'Sensor ID',
      serial: `SN-SENSOR-${260000 + i}`,
      capabilities: [...modelObj.capabilities],
      measurementCapability: sDef.measurementCapability,
      measurementUnit: sDef.defaultUnit,
      measurementRange: modelObj.defaultRange,
      company: owner,
      inventoryLocation: loc,
      hardwareLifecycle: lc,
      registeredAt: `2026-0${(i % 6) + 3}-${((i % 27) + 1).toString().padStart(2, '0')}`,
      updatedAt: `2026-11-${((i % 10) + 1).toString().padStart(2, '0')}`,
      notes: i % 5 === 0 ? 'Calibrated physical sensor unit' : ''
    });
  }

  // 3. Seed 420 SIMs (including curated ICCIDs from screenshot & MD)
  sims.push(
    {
      id: 'SIM-0142',
      iccid: '8991870040012340142',
      msisdn: '+91 9810040142',
      operator: 'Jio',
      plan: 'Enterprise M2M 2GB',
      formFactor: 'Nano (4FF)',
      network: '4G LTE',
      owner: 'Adani Mundra',
      location: 'Mundra CT2',
      status: 'Active',
      activationDate: '2026-05-18',
      renewalDate: '2027-05-18',
      notes: 'Primary SIM in Mundra Vehicle Kit 01',
      category: 'Standard SIM',
      modelTypeId: 'mcat-11',
      identifierType: 'ICCID'
    },
    {
      id: 'SIM-6123',
      iccid: '89912051000042876123',
      msisdn: '+91 9810076123',
      operator: 'Airtel',
      plan: 'IoT Business 10GB',
      formFactor: 'Nano (4FF)',
      network: '4G LTE',
      owner: 'Adani Mundra',
      location: 'Mundra CT2',
      status: 'Active',
      activationDate: '2026-06-01',
      renewalDate: '2027-06-01',
      notes: 'M2M SIM for Adani Mundra Telematics 06',
      category: 'M2M SIM',
      modelTypeId: 'mcat-10',
      identifierType: 'ICCID'
    },
    {
      id: 'SIM-0199',
      iccid: '89918610431245100199',
      msisdn: '+91 9810010199',
      operator: 'Airtel',
      plan: 'IoT Business 10GB',
      formFactor: 'Nano (4FF)',
      network: '4G LTE',
      owner: 'Adani Mundra',
      location: 'Mundra CT2',
      status: 'Inventory',
      activationDate: '',
      renewalDate: '',
      notes: 'Draft SIM setup 05',
      category: 'M2M SIM',
      modelTypeId: 'mcat-10',
      identifierType: 'ICCID'
    },
    {
      id: 'SIM-0006',
      iccid: '89918610431245100006',
      msisdn: '+91 9810000006',
      operator: 'Airtel',
      plan: 'IoT Business 10GB',
      formFactor: 'Nano (4FF)',
      network: '4G LTE',
      owner: 'Adani Mundra',
      location: 'Mundra CT2',
      status: 'Inventory',
      activationDate: '',
      renewalDate: '',
      notes: 'Unassigned Airtel M2M SIM ready for Vehicle Kit demonstration',
      category: 'M2M SIM',
      modelTypeId: 'mcat-10',
      identifierType: 'ICCID'
    }
  );

  const simStatuses: SimLifecycleStatus[] = ['Active', 'Inventory', 'Active', 'Suspended', 'Inventory'];
  const coreOperators: SimRecord['operator'][] = ['Airtel', 'Jio', 'Vi', 'BSNL'];

  for (let i = sims.length; i < 420; i++) {
    if (i === 6) continue;
    const iccidSuffix = i.toString().padStart(5, '0');
    const iccid = `899186104312451${iccidSuffix}`;
    const op = coreOperators[i % coreOperators.length];
    const plan = SIM_PLANS[i % SIM_PLANS.length];
    const ff = SIM_FORM_FACTORS[i % SIM_FORM_FACTORS.length];
    const owner = MODAL_OWNERS[i % MODAL_OWNERS.length];
    const loc = MODAL_LOCATIONS[i % MODAL_LOCATIONS.length];
    const st = simStatuses[i % simStatuses.length];
    const cat = ff === 'eSIM' ? 'IoT eSIM' : plan.includes('M2M') ? 'M2M SIM' : 'Standard SIM';
    const modelTypeId = cat === 'IoT eSIM' ? 'mcat-12' : cat === 'M2M SIM' ? 'mcat-10' : 'mcat-11';

    sims.push({
      id: `SIM-gen-${2000 + i}`,
      iccid,
      msisdn: i % 7 !== 0 ? `+91 98100${i.toString().padStart(5, '0')}` : '',
      operator: op,
      plan,
      formFactor: ff,
      network: '4G LTE',
      owner,
      location: loc,
      status: st,
      activationDate: st === 'Inventory' ? '' : `2026-0${(i % 5) + 4}-${((i % 26) + 1).toString().padStart(2, '0')}`,
      renewalDate: st === 'Inventory' ? '' : `2027-0${(i % 5) + 4}-${((i % 26) + 1).toString().padStart(2, '0')}`,
      notes: i % 10 === 0 ? 'Carrier batch provisioned for fleet telemetry' : '',
      category: cat,
      modelTypeId,
      identifierType: 'ICCID'
    });
  }

  // Helper to construct HardwareMembership
  const makeDeviceMem = (d: DeviceRecord, isPrimary = false): HardwareMembership => ({
    hardwareId: d.id,
    category: 'Device',
    modelTypeId: d.modelTypeId || 'mcat-01',
    modelLabel: `${d.kind} · ${d.manufacturer} · ${d.modelText}`,
    identifierType: d.identifierType || (d.imei ? 'IMEI' : 'Serial Number'),
    identifierValue: resolveHardwareIdentifierValue(d, 'Device', d.identifierType),
    registrationStatus: d.hardwareLifecycle,
    isPrimary
  });

  const makeSensorMem = (s: SensorRecord, isPrimary = false): HardwareMembership => ({
    hardwareId: s.id,
    category: 'Sensor',
    modelTypeId: s.modelTypeId || 'mcat-07',
    modelLabel: `${s.kind} · ${s.manufacturer} · ${s.modelText}`,
    identifierType: s.identifierType || 'Sensor ID',
    identifierValue: resolveHardwareIdentifierValue(s, 'Sensor', s.identifierType),
    registrationStatus: s.hardwareLifecycle,
    isPrimary
  });

  const makeSimMem = (sim: SimRecord, isPrimary = false): HardwareMembership => ({
    hardwareId: sim.id,
    category: 'SIM',
    modelTypeId: sim.modelTypeId || 'mcat-10',
    modelLabel: `${sim.category || 'M2M SIM'} · ${sim.operator} · ${sim.formFactor}`,
    identifierType: sim.identifierType || 'ICCID',
    identifierValue: sim.iccid,
    registrationStatus: sim.status,
    isPrimary
  });

  // =====================================================================
  // 4. CURATED 10 PRESENTATION SCENARIOS (Matches Reference Screenshot & MD)
  // =====================================================================

  // Scenario 4 + 5 + 6 + 8: CON-1277 Full multi-hop Vehicle Kit 01
  // MTX-AD-10292 (Primary) -> DVR-88921 -> HK-IPC-7781 (Multi-hop Device->Device->IP Camera)
  // MTX-AD-10292 -> DSR-8891 (Permanent), TMP-4015 (Temporal Scheduled), 8991870040012340142 (Permanent SIM)
  const dev10292 = devices[0]; // MTX-AD-10292
  const devDvr88921 = devices[1]; // DVR-88921
  const dev9002 = devices[2]; // GPS-9002
  const devHkCam = devices[3]; // HK-IPC-7781
  const devCam01 = devices[4]; // CAM-4410
  const dev10400 = devices[5]; // MTX-AD-10400
  const devSolo01 = devices[7]; // GPS-7110 (Single device without extra hardware)

  const senDsr8890 = sensors[0]; // DSR-8890 (CON-1277 active door sensor; leaves DSR-8891 unassigned for demo)
  const senTmp4015 = sensors[2]; // TMP-4015
  const senFls1 = sensors[3]; // FLS-ADM-000874
  const senFls2 = sensors[4]; // FLS-ADM-000875
  const senTmp410 = sensors[5]; // SNS-TMP-410

  const sim0142 = sims[0]; // 8991870040012340142
  const sim6123 = sims[1]; // 89912051000042876123
  const sim0199 = sims[2]; // 89918610431245100199

  connections.push({
    id: 'CON-1277',
    connectionId: 'CON-1277',
    companyId: 'comp-adani-mundra',
    companyName: 'Adani Mundra',
    name: 'Mundra – Port Kit 00',
    description: 'ADAS + MDVR + IP Camera + Access & Temperature + SIM',
    site: 'Mundra CT2',
    memberIds: [
      dev10292.id,
      devDvr88921.id,
      devHkCam.id,
      senDsr8890.id,
      senTmp4015.id,
      sim0142.id
    ],
    members: [
      { ...makeDeviceMem(dev10292, true), identifierValue: 'MTX-AD-10292', identifierType: 'Device ID / IMEI' },
      makeDeviceMem(devDvr88921, false),
      makeDeviceMem(devHkCam, false),
      makeSensorMem(senDsr8890, false),
      makeSensorMem(senTmp4015, false),
      makeSimMem(sim0142, false)
    ],
    status: 'Active',
    verification: 'Demo — simulated pass',
    notes: 'Multi-hop vehicle kit with Device→Device→IP Camera + Sensors + SIM',
    version: 4,
    createdAt: '2026-11-12T10:15:00+05:30',
    updatedAt: '2026-11-13T14:35:00+05:30',
    createdBy: 'Platform Admin',
    updatedBy: 'Rajesh PMO',
    activity: [
      {
        id: 'act-1277-1',
        timestamp: '2026-11-12T10:15:00+05:30',
        actor: 'Platform Admin',
        action: 'Created connection & registered 6 hardware units',
        afterSummary: 'MTX-AD-10292, DVR-88921, HK-IPC-7781, DSR-8890, TMP-4015, SIM ...0142'
      },
      {
        id: 'act-1277-2',
        timestamp: '2026-11-13T14:35:00+05:30',
        actor: 'Rajesh PMO',
        action: 'Allocated Vehicle MH26AH1192 (RCA-2041) & Driver +91 98765 43210 (RCA-2042)',
        afterSummary: 'Multi-resource active kit allocation at Mundra CT2'
      }
    ]
  });

  hardwareBindings.push(
    {
      id: 'BND-3001',
      connectionId: 'CON-1277',
      fromHardwareId: dev10292.id,
      toHardwareId: devDvr88921.id,
      mode: 'Permanent',
      effectiveStartAt: '2026-11-12T10:30:00+05:30',
      effectiveEndAt: null,
      timezone: 'Asia/Kolkata',
      portOrSlot: 'RS485-1',
      notes: 'Primary ADAS dashcam linked to MDVR recorder',
      createdAt: '2026-11-12T10:30:00+05:30',
      updatedAt: '2026-11-12T10:30:00+05:30'
    },
    {
      id: 'BND-3002',
      connectionId: 'CON-1277',
      fromHardwareId: devDvr88921.id,
      toHardwareId: devHkCam.id,
      mode: 'Permanent',
      effectiveStartAt: '2026-11-12T10:35:00+05:30',
      effectiveEndAt: null,
      timezone: 'Asia/Kolkata',
      portOrSlot: 'CH-1',
      notes: 'Multi-hop IP Camera connected through MDVR channel 1',
      createdAt: '2026-11-12T10:35:00+05:30',
      updatedAt: '2026-11-12T10:35:00+05:30'
    },
    {
      id: 'BND-3003',
      connectionId: 'CON-1277',
      fromHardwareId: dev10292.id,
      toHardwareId: senDsr8890.id,
      mode: 'Permanent',
      effectiveStartAt: '2026-11-12T10:35:00+05:30',
      effectiveEndAt: null,
      timezone: 'Asia/Kolkata',
      portOrSlot: 'BLE-1',
      notes: 'Door sensor paired to primary ADAS/DMS dashcam',
      createdAt: '2026-11-12T10:35:00+05:30',
      updatedAt: '2026-11-12T10:35:00+05:30'
    },
    {
      id: 'BND-3004',
      connectionId: 'CON-1277',
      fromHardwareId: dev10292.id,
      toHardwareId: senTmp4015.id,
      mode: 'Temporal',
      effectiveStartAt: '2026-11-18T10:32:00+05:30',
      effectiveEndAt: '2026-11-28T23:59:00+05:30',
      timezone: 'Asia/Kolkata',
      portOrSlot: 'BLE-2',
      notes: 'Scheduled winter cold-chain temperature sensor deployment',
      createdAt: '2026-11-12T10:32:00+05:30',
      updatedAt: '2026-11-12T10:32:00+05:30'
    },
    {
      id: 'BND-3005',
      connectionId: 'CON-1277',
      fromHardwareId: dev10292.id,
      toHardwareId: sim0142.id,
      mode: 'Permanent',
      effectiveStartAt: '2026-11-12T10:32:00+05:30',
      effectiveEndAt: null,
      timezone: 'Asia/Kolkata',
      portOrSlot: 'SIM Slot 1',
      notes: 'Primary cellular connectivity SIM',
      createdAt: '2026-11-12T10:32:00+05:30',
      updatedAt: '2026-11-12T10:32:00+05:30'
    }
  );

  resourceAllocations.push(
    {
      id: 'RCA-2041',
      companyId: 'comp-adani-mundra',
      companyName: 'Adani Mundra',
      connectionId: 'CON-1277',
      resourceType: 'Vehicle',
      resourceId: 'veh-mundra-1192',
      resourceIdentifier: 'MH26AH1192',
      resourceDisplayName: 'Tata Prima 5530.S · MH26AH1192',
      hardwareId: null,
      mode: 'Permanent',
      effectiveStartAt: '2026-11-12T10:30:00+05:30',
      effectiveEndAt: null,
      timezone: 'Asia/Kolkata',
      site: 'Mundra CT2',
      assignedBy: 'Rajesh PMO',
      assignedOn: '2026-11-12T10:30:00+05:30',
      updatedAt: '2026-11-13T10:30:00+05:30',
      notes: 'Primary vehicle installation for Mundra Vehicle Kit 01'
    },
    {
      id: 'RCA-2042',
      companyId: 'comp-adani-mundra',
      companyName: 'Adani Mundra',
      connectionId: 'CON-1277',
      resourceType: 'Driver',
      resourceId: 'drv-001',
      resourceIdentifier: '+91 98765 43210',
      resourceDisplayName: 'Ramesh Singh',
      hardwareId: null,
      mode: 'Temporal',
      effectiveStartAt: '2026-11-12T10:30:00+05:30',
      effectiveEndAt: '2026-11-28T18:00:00+05:30',
      timezone: 'Asia/Kolkata',
      site: 'Mundra CT2',
      assignedBy: 'Rajesh PMO',
      assignedOn: '2026-11-12T10:30:00+05:30',
      updatedAt: '2026-11-13T10:30:00+05:30',
      notes: 'Shift driver assignment sharing CON-1277 kit with Vehicle MH26AH1192'
    }
  );

  // CON-1278: Mundra – Fuel Monitoring 02 (1 Device, 2 Sensors, 0 SIM, 2 Bindings, Vehicle GJ12AB1234)
  connections.push({
    id: 'CON-1278',
    connectionId: 'CON-1278',
    companyId: 'comp-adani-mundra',
    companyName: 'Adani Mundra',
    name: 'Mundra – Fuel Monitoring 02',
    description: 'Dual tank BLE fuel level telemetry',
    site: 'Mundra South Basin',
    memberIds: [dev9002.id, senFls1.id, senFls2.id],
    members: [makeDeviceMem(dev9002, true), makeSensorMem(senFls1), makeSensorMem(senFls2)],
    status: 'Active',
    verification: 'Demo — simulated pass',
    version: 2,
    createdAt: '2026-11-10T09:00:00+05:30',
    updatedAt: '2026-11-13T11:20:00+05:30',
    createdBy: 'Platform Admin',
    updatedBy: 'Platform Admin',
    activity: [
      {
        id: 'act-1278-1',
        timestamp: '2026-11-10T09:00:00+05:30',
        actor: 'Platform Admin',
        action: 'Created Fuel Monitoring 02 with 2 fuel probes',
        afterSummary: 'GPS-9002 → FLS-ADM-000874 & FLS-ADM-000875'
      }
    ]
  });
  hardwareBindings.push(
    {
      id: 'BND-3006',
      connectionId: 'CON-1278',
      fromHardwareId: dev9002.id,
      toHardwareId: senFls1.id,
      mode: 'Permanent',
      effectiveStartAt: '2026-11-10T09:15:00+05:30',
      effectiveEndAt: null,
      timezone: 'Asia/Kolkata',
      portOrSlot: 'BLE-1',
      notes: 'Main tank sensor',
      createdAt: '2026-11-10T09:15:00+05:30',
      updatedAt: '2026-11-10T09:15:00+05:30'
    },
    {
      id: 'BND-3007',
      connectionId: 'CON-1278',
      fromHardwareId: dev9002.id,
      toHardwareId: senFls2.id,
      mode: 'Temporal',
      effectiveStartAt: '2026-10-01T08:00:00+05:30',
      effectiveEndAt: '2026-10-31T23:59:59+05:30',
      timezone: 'Asia/Kolkata',
      portOrSlot: 'BLE-2',
      notes: 'Expired pilot auxiliary tank sensor period',
      createdAt: '2026-10-01T08:00:00+05:30',
      updatedAt: '2026-10-31T23:59:59+05:30'
    },
    {
      id: 'BND-3008',
      connectionId: 'CON-1278',
      fromHardwareId: dev9002.id,
      toHardwareId: senFls2.id,
      mode: 'Permanent',
      effectiveStartAt: '2026-11-01T00:00:00+05:30',
      effectiveEndAt: null,
      timezone: 'Asia/Kolkata',
      portOrSlot: 'BLE-2',
      notes: 'Permanent re-binding after pilot validation (demonstrates multiple bindings without duplicating unit)',
      createdAt: '2026-11-01T00:00:00+05:30',
      updatedAt: '2026-11-01T00:00:00+05:30'
    }
  );
  resourceAllocations.push(
    {
      id: 'RCA-2044',
      companyId: 'comp-adani-mundra',
      companyName: 'Adani Mundra',
      connectionId: 'CON-1278',
      resourceType: 'Vehicle',
      resourceId: 'veh-mundra-1234',
      resourceIdentifier: 'GJ12AB1234',
      resourceDisplayName: 'Tata Signa 5530.S · GJ12AB1234',
      hardwareId: null,
      mode: 'Permanent',
      effectiveStartAt: '2026-11-10T10:00:00+05:30',
      effectiveEndAt: null,
      timezone: 'Asia/Kolkata',
      site: 'Mundra South Basin',
      assignedBy: 'Platform Admin',
      assignedOn: '2026-11-10T10:00:00+05:30',
      updatedAt: '2026-11-10T10:00:00+05:30'
    },
    {
      id: 'RCA-2045',
      companyId: 'comp-adani-mundra',
      companyName: 'Adani Mundra',
      connectionId: 'CON-1278',
      resourceType: 'Vehicle',
      resourceId: 'veh-mundra-9456',
      resourceIdentifier: 'GJ12CU9456',
      resourceDisplayName: 'Tata Prima 5530 · GJ12CU9456',
      hardwareId: dev9002.id,
      mode: 'Temporal',
      effectiveStartAt: '2026-11-12T08:00:00+05:30',
      effectiveEndAt: '2026-12-15T18:00:00+05:30',
      timezone: 'Asia/Kolkata',
      site: 'Mundra South Basin',
      assignedBy: 'Rajesh PMO',
      assignedOn: '2026-11-12T08:00:00+05:30',
      updatedAt: '2026-11-12T08:00:00+05:30',
      notes: 'Multi-resource allocation + hardware-scoped GPS telemetry reference'
    }
  );

  // CON-1279: Mundra – DVR Kit 03 (2 Devices, 0 Sensor, 0 SIM, 1 Binding, Draft)
  connections.push({
    id: 'CON-1279',
    connectionId: 'CON-1279',
    companyId: 'comp-adani-mundra',
    companyName: 'Adani Mundra',
    name: 'Mundra – DVR Kit 03',
    description: 'MDVR + IP Camera yard surveillance draft',
    site: 'Mundra CT2',
    memberIds: [devDvr88921.id, devCam01.id],
    members: [makeDeviceMem(devDvr88921, true), makeDeviceMem(devCam01)],
    status: 'Draft',
    verification: 'Not checked',
    version: 1,
    createdAt: '2026-11-11T16:10:00+05:30',
    updatedAt: '2026-11-12T09:40:00+05:30',
    createdBy: 'Rajesh PMO',
    updatedBy: 'Rajesh PMO',
    activity: [
      {
        id: 'act-1279-1',
        timestamp: '2026-11-11T16:10:00+05:30',
        actor: 'Rajesh PMO',
        action: 'Saved Draft connection (Device → Device)',
        afterSummary: 'DVR-88921 → CAM-4410'
      }
    ]
  });
  hardwareBindings.push({
    id: 'BND-3009',
    connectionId: 'CON-1279',
    fromHardwareId: devDvr88921.id,
    toHardwareId: devCam01.id,
    mode: 'Permanent',
    effectiveStartAt: '2026-11-12T10:00:00+05:30',
    effectiveEndAt: null,
    timezone: 'Asia/Kolkata',
    portOrSlot: 'CH-2',
    notes: 'IP camera feed into MDVR channel 2',
    createdAt: '2026-11-11T16:10:00+05:30',
    updatedAt: '2026-11-11T16:10:00+05:30'
  });

  // CON-1280: Single Device without additional hardware (Scenario 1) + Sensor-only reference
  connections.push({
    id: 'CON-1280',
    connectionId: 'CON-1280',
    companyId: 'comp-adani-mundra',
    companyName: 'Adani Mundra',
    name: 'Mundra – Solo GPS 04',
    description: 'Single standalone GPS Tracker without peripheral sensors or SIM',
    site: 'Mundra South Basin',
    memberIds: [devSolo01.id],
    members: [makeDeviceMem(devSolo01, true)],
    status: 'Active',
    verification: 'Demo — simulated pass',
    version: 1,
    createdAt: '2026-11-11T11:00:00+05:30',
    updatedAt: '2026-11-12T15:10:00+05:30',
    createdBy: 'Rajesh PMO',
    updatedBy: 'Rajesh PMO',
    activity: [
      {
        id: 'act-1280-1',
        timestamp: '2026-11-11T11:00:00+05:30',
        actor: 'Rajesh PMO',
        action: 'Activated single-device connection (no sub-bindings)',
        afterSummary: 'GPS-7110 (Standalone)'
      }
    ]
  });
  resourceAllocations.push({
    id: 'RCA-2046',
    companyId: 'comp-adani-mundra',
    companyName: 'Adani Mundra',
    connectionId: 'CON-1280',
    resourceType: 'Vehicle',
    resourceId: 'veh-mundra-solo',
    resourceIdentifier: 'GJ12XY7110',
    resourceDisplayName: 'Eicher Pro 6048 · GJ12XY7110',
    hardwareId: null,
    mode: 'Temporal',
    effectiveStartAt: '2026-10-01T08:00:00+05:30',
    effectiveEndAt: '2026-10-25T20:00:00+05:30',
    endedAt: '2026-10-25T20:00:00+05:30',
    endReason: 'Seasonal lease completed',
    unassignedBy: 'Rajesh PMO',
    timezone: 'Asia/Kolkata',
    site: 'Mundra South Basin',
    assignedBy: 'Rajesh PMO',
    assignedOn: '2026-10-01T08:00:00+05:30',
    updatedAt: '2026-10-25T20:00:00+05:30'
  });

  // CON-1281: Mundra – SIM & Conflict Guard 05 (Demonstrates SIM overlap Conflict state + standalone sensor)
  connections.push({
    id: 'CON-1281',
    connectionId: 'CON-1281',
    companyId: 'comp-adani-mundra',
    companyName: 'Adani Mundra',
    name: 'Mundra – Cold Chain Conflict 05',
    description: 'Demonstrates overlapping SIM conflict detection & temporal expiry',
    site: 'Mundra CT2',
    memberIds: [devices[6].id, senTmp410.id, sim0142.id],
    members: [makeDeviceMem(devices[6], true), makeSensorMem(senTmp410), makeSimMem(sim0142)],
    status: 'Needs Attention',
    verification: 'Conflict detected',
    version: 1,
    createdAt: '2026-11-12T13:20:00+05:30',
    updatedAt: '2026-11-13T11:20:00+05:30',
    createdBy: 'Platform Admin',
    updatedBy: 'Platform Admin',
    activity: [
      {
        id: 'act-1281-1',
        timestamp: '2026-11-12T13:20:00+05:30',
        actor: 'Platform Admin',
        action: 'Flagged overlapping SIM allocation against CON-1277',
        afterSummary: 'SIM 8991870040012340142 overlap requires resolution'
      }
    ]
  });
  hardwareBindings.push(
    {
      id: 'BND-3010',
      connectionId: 'CON-1281',
      fromHardwareId: devices[6].id,
      toHardwareId: sim0142.id,
      mode: 'Permanent',
      effectiveStartAt: '2026-11-12T13:25:00+05:30',
      effectiveEndAt: null,
      timezone: 'Asia/Kolkata',
      portOrSlot: 'SIM Slot 1',
      notes: 'Conflict sample: SIM already active in CON-1277',
      createdAt: '2026-11-12T13:25:00+05:30',
      updatedAt: '2026-11-12T13:25:00+05:30'
    },
    {
      id: 'BND-3011',
      connectionId: 'CON-1281',
      fromHardwareId: devices[6].id,
      toHardwareId: senTmp410.id,
      mode: 'Temporal',
      effectiveStartAt: '2026-10-05T08:00:00+05:30',
      effectiveEndAt: '2026-11-05T20:00:00+05:30',
      timezone: 'Asia/Kolkata',
      portOrSlot: 'BLE-1',
      notes: 'Expired cold-room monitoring window',
      createdAt: '2026-10-05T08:00:00+05:30',
      updatedAt: '2026-11-05T20:00:00+05:30'
    }
  );
  resourceAllocations.push({
    id: 'RCA-2047',
    companyId: 'comp-adani-mundra',
    companyName: 'Adani Mundra',
    connectionId: 'CON-1281',
    resourceType: 'Vehicle',
    resourceId: 'veh-mundra-conf',
    resourceIdentifier: 'GJ12CU9456',
    resourceDisplayName: 'Tata Prima 5530 · GJ12CU9456',
    hardwareId: null,
    mode: 'Permanent',
    effectiveStartAt: '2026-11-12T13:30:00+05:30',
    effectiveEndAt: null,
    timezone: 'Asia/Kolkata',
    site: 'Mundra CT2',
    assignedBy: 'Platform Admin',
    assignedOn: '2026-11-12T13:30:00+05:30',
    updatedAt: '2026-11-12T13:30:00+05:30'
  });

  // CON-1282: Mundra – Telematics 06 (1 Device, 0 Sensor, 1 SIM, 1 Binding, Vehicle MH12AB1234, Scheduled)
  connections.push({
    id: 'CON-1282',
    connectionId: 'CON-1282',
    companyId: 'comp-adani-mundra',
    companyName: 'Adani Mundra',
    name: 'Mundra – Telematics 06',
    description: 'Scheduled dashcam + M2M SIM rollout',
    site: 'Mundra CT2',
    memberIds: [dev10400.id, sim6123.id],
    members: [makeDeviceMem(dev10400, true), makeSimMem(sim6123)],
    status: 'Scheduled',
    verification: 'Pending',
    version: 1,
    createdAt: '2026-11-12T17:00:00+05:30',
    updatedAt: '2026-11-13T09:15:00+05:30',
    createdBy: 'Platform Admin',
    updatedBy: 'Platform Admin',
    activity: [
      {
        id: 'act-1282-1',
        timestamp: '2026-11-12T17:00:00+05:30',
        actor: 'Platform Admin',
        action: 'Scheduled Telematics 06 deployment for 20 Nov 2026',
        afterSummary: 'MTX-AD-10400 + SIM ...6123 + Vehicle MH12AB1234'
      }
    ]
  });
  hardwareBindings.push({
    id: 'BND-3012',
    connectionId: 'CON-1282',
    fromHardwareId: dev10400.id,
    toHardwareId: sim6123.id,
    mode: 'Permanent',
    effectiveStartAt: '2026-11-20T09:00:00+05:30',
    effectiveEndAt: null,
    timezone: 'Asia/Kolkata',
    portOrSlot: 'SIM Slot 1',
    notes: 'Scheduled future activation',
    createdAt: '2026-11-12T17:00:00+05:30',
    updatedAt: '2026-11-12T17:00:00+05:30'
  });
  resourceAllocations.push({
    id: 'RCA-2043',
    companyId: 'comp-adani-mundra',
    companyName: 'Adani Mundra',
    connectionId: 'CON-1282',
    resourceType: 'Vehicle',
    resourceId: 'veh-mundra-mh12',
    resourceIdentifier: 'MH12AB1234',
    resourceDisplayName: 'Ashok Leyland 4825 · MH12AB1234',
    hardwareId: null,
    mode: 'Permanent',
    effectiveStartAt: '2026-11-20T09:00:00+05:30',
    effectiveEndAt: null,
    timezone: 'Asia/Kolkata',
    site: 'Mundra CT2',
    assignedBy: 'Platform Admin',
    assignedOn: '2026-11-12T17:00:00+05:30',
    updatedAt: '2026-11-12T17:00:00+05:30'
  });

  // =====================================================================
  // 5. POPULATE REMAINING CONNECTIONS (Total 276 Connections across 5 Client Companies)
  // =====================================================================
  const sampleVehiclesByCompany: Record<string, { id: string; reg: string; label: string }[]> = {
    'Adani Mundra': [
      { id: 'veh-mundra-9456', reg: 'GJ12CU9456', label: 'Tata Prima 5530 · GJ12CU9456' },
      { id: 'veh-mundra-1192', reg: 'MH26AH1192', label: 'Tata Prima 5530.S · MH26AH1192' },
      { id: 'veh-mundra-1234', reg: 'GJ12AB1234', label: 'Tata Signa 5530.S · GJ12AB1234' }
    ],
    'Adani Port': [
      { id: 'veh-001', reg: 'GJ12BW4501', label: 'Tata Signa 5530 · GJ12BW4501' },
      { id: 'veh-002', reg: 'GJ12AZ9820', label: 'BharatBenz 5528TT · GJ12AZ9820' },
      { id: 'veh-004', reg: 'GJ12CC7781', label: 'Tata Prima 5530.S · GJ12CC7781' }
    ],
    'SIS Cash': [
      { id: 'veh-sis-4410', reg: 'DL01VA4410', label: 'Force Traveller Cash Van · DL01VA4410' }
    ],
    Akshaykalpa: [
      { id: 'veh-ak-7782', reg: 'KA01AG7782', label: 'Eicher Pro 2110 Reefer · KA01AG7782' }
    ],
    AKPL: [
      { id: 'veh-akpl-8812', reg: 'MH04JK8812', label: 'Ashok Leyland 4825 · MH04JK8812' }
    ]
  };

  let conSeq = 1001;
  let bndSeq = 3013;
  let rcaSeq = 2048;
  const totalTargetConnections = 276;

  while (connections.length < totalTargetConnections) {
    const idx = connections.length;
    const owner = MODAL_OWNERS[idx % MODAL_OWNERS.length];
    const companyId = COMPANY_NAME_TO_ID[owner] || 'comp-adani-port';
    const site = MODAL_LOCATIONS[idx % MODAL_LOCATIONS.length];
    // Avoid colliding with CON-1277..1282
    while (conSeq >= 1277 && conSeq <= 1282) conSeq++;
    const connId = `CON-${conSeq++}`;

    const ownerDevices = devices.filter((d) => d.company === owner);
    const ownerSensors = sensors.filter((s) => s.company === owner);
    const ownerSims = sims.filter((s) => s.owner === owner);

    const d1 = ownerDevices[idx % ownerDevices.length] || devices[idx % devices.length];
    const d2 = idx % 5 === 0 ? ownerDevices[(idx + 1) % ownerDevices.length] : null;
    const s1 = idx % 2 === 0 ? ownerSensors[idx % ownerSensors.length] || sensors[idx % sensors.length] : null;
    const s2 = idx % 7 === 0 ? ownerSensors[(idx + 1) % ownerSensors.length] : null;
    const sim1 = idx % 3 !== 2 ? ownerSims[idx % ownerSims.length] || sims[idx % sims.length] : null;

    const members: HardwareMembership[] = [];
    const seenHw = new Set<string>();
    const pushUnique = (m: HardwareMembership) => {
      if (!seenHw.has(m.hardwareId)) {
        seenHw.add(m.hardwareId);
        members.push(m);
      }
    };
    pushUnique(makeDeviceMem(d1, true));
    if (d2) pushUnique(makeDeviceMem(d2, false));
    if (s1) pushUnique(makeSensorMem(s1, false));
    if (s2) pushUnique(makeSensorMem(s2, false));
    if (sim1) pushUnique(makeSimMem(sim1, false));

    const statusCycle: ConnectionLifecycleStatus[] = [
      'Active',
      'Active',
      'Active',
      'Active',
      'Draft',
      'Scheduled',
      'Inactive',
      'Needs Attention'
    ];
    const status = statusCycle[idx % statusCycle.length];
    const dayStr = ((idx % 12) + 1).toString().padStart(2, '0');
    const createdAt = `2026-11-${dayStr}T09:30:00+05:30`;
    const updatedAt = `2026-11-${dayStr}T14:${((idx * 7) % 50 + 10).toString().padStart(2, '0')}:00+05:30`;

    connections.push({
      id: connId,
      connectionId: connId,
      companyId,
      companyName: owner,
      name: `${owner.split(' ')[0]} – ${d1.kind} Kit ${(idx + 1).toString().padStart(2, '0')}`,
      description: `${d1.modelText} operational telematics mapping at ${site}`,
      site,
      memberIds: members.map((m) => m.hardwareId),
      members,
      status,
      verification: status === 'Active' ? 'Demo — simulated pass' : 'Not checked',
      version: 1,
      createdAt,
      updatedAt,
      createdBy: idx % 2 === 0 ? 'Platform Admin' : 'Operations PMO',
      updatedBy: idx % 3 === 0 ? 'Operations PMO' : 'Platform Admin',
      activity: [
        {
          id: `act-${connId}-1`,
          timestamp: createdAt,
          actor: 'Platform Admin',
          action: 'Connection initialized',
          afterSummary: `${members.length} hardware unit(s) included`
        }
      ],
      hardwareId: d1.id
    });

    // Pairwise bindings from d1 to additional members
    members.slice(1).forEach((m, bOffset) => {
      const isTemporal = (idx + bOffset) % 4 === 0;
      const isFuture = status === 'Scheduled';
      const startIso = isFuture ? '2026-11-22T08:00:00+05:30' : createdAt;
      const endIso = isTemporal ? (isFuture ? '2026-12-22T23:59:59+05:30' : '2027-05-15T23:59:59+05:30') : null;
      const bId = `BND-${bndSeq++}`;
      hardwareBindings.push({
        id: bId,
        connectionId: connId,
        fromHardwareId: d1.id,
        toHardwareId: m.hardwareId,
        mode: isTemporal ? 'Temporal' : 'Permanent',
        effectiveStartAt: startIso,
        effectiveEndAt: endIso,
        timezone: 'Asia/Kolkata',
        portOrSlot: m.category === 'SIM' ? 'SIM Slot 1' : m.category === 'Sensor' ? `BLE-${(bOffset % 2) + 1}` : 'RS485-1',
        notes: `${d1.deviceId} → ${m.identifierValue}`,
        createdAt,
        updatedAt
      });

      if (m.category === 'SIM') {
        simAssignments.push({
          id: `sa-${simAssignments.length + 1}`,
          simId: m.hardwareId,
          iccid: m.identifierValue,
          connectionId: connId,
          hardwareId: d1.id,
          hardwareName: `${d1.deviceId} · ${d1.name}`,
          start: startIso.slice(0, 10),
          end: endIso ? endIso.slice(0, 10) : ''
        });
      }
    });

    // Allocate Vehicle (and sometimes Driver) for ~88% of non-Draft connections to hit ~258 total allocations
    if (status !== 'Draft' && idx % 6 !== 5) {
      const vehPool = sampleVehiclesByCompany[owner] || sampleVehiclesByCompany['Adani Port'];
      const veh = vehPool[idx % vehPool.length];
      const allocStart = status === 'Scheduled' ? '2026-11-22T08:00:00+05:30' : createdAt;
      const isEnded = idx % 13 === 0;
      resourceAllocations.push({
        id: `RCA-${rcaSeq++}`,
        companyId,
        companyName: owner,
        connectionId: connId,
        resourceType: 'Vehicle',
        resourceId: `${veh.id}-${idx}`,
        resourceIdentifier: veh.reg,
        resourceDisplayName: veh.label,
        hardwareId: null,
        mode: isEnded ? 'Temporal' : 'Permanent',
        effectiveStartAt: isEnded ? '2026-09-01T08:00:00+05:30' : allocStart,
        effectiveEndAt: isEnded ? '2026-10-31T23:59:59+05:30' : null,
        endedAt: isEnded ? '2026-10-31T23:59:59+05:30' : undefined,
        endReason: isEnded ? 'Vehicle rotation completed' : undefined,
        unassignedBy: isEnded ? 'Operations PMO' : undefined,
        timezone: 'Asia/Kolkata',
        site,
        assignedBy: 'Operations PMO',
        assignedOn: createdAt,
        updatedAt
      });

      if (idx % 4 === 0 && resourceAllocations.length < 258) {
        resourceAllocations.push({
          id: `RCA-${rcaSeq++}`,
          companyId,
          companyName: owner,
          connectionId: connId,
          resourceType: 'Driver',
          resourceId: `drv-seed-${idx}`,
          resourceIdentifier: `+91 98${(10000000 + idx * 713).toString().slice(0, 8)}`,
          resourceDisplayName: ['Ramesh Singh', 'Sukhwinder Gill', 'Vikram Patel', 'Kishore Das'][idx % 4],
          hardwareId: null,
          mode: 'Temporal',
          effectiveStartAt: allocStart,
          effectiveEndAt: '2026-12-30T18:00:00+05:30',
          timezone: 'Asia/Kolkata',
          site,
          assignedBy: 'Operations PMO',
          assignedOn: createdAt,
          updatedAt
        });
      }
    }
  }

  const resourceRelationships = generateDefaultResourceRelationships();

  return {
    devices,
    sensors,
    sims,
    connections,
    hardwareBindings,
    resourceAllocations,
    resourceRelationships,
    bindings,
    resources,
    simAssignments
  };
}

export const DEFAULT_RESOURCE_RELATIONSHIP_RULES: ResourceRelationshipRule[] = [
  // Driver <-> Vehicle
  {
    code: 'DRV_PRIMARY_VEH',
    label: 'Assigned Primary Driver',
    sourceType: 'Driver',
    targetType: 'Vehicle',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: false,
    enabled: true,
    description: 'Primary driver assigned to operate a vehicle (one active primary driver per vehicle at a time).'
  },
  {
    code: 'DRV_RELIEF_VEH',
    label: 'Assigned Co-Driver / Relief',
    sourceType: 'Driver',
    targetType: 'Vehicle',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Secondary or relief driver authorized for long-haul or shift handovers.'
  },
  {
    code: 'VEH_PRIMARY_DRV',
    label: 'Primary Driver Assignment',
    sourceType: 'Vehicle',
    targetType: 'Driver',
    allowMultiplePerSource: false,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Designates the primary driver for the selected vehicle.'
  },
  {
    code: 'VEH_RELIEF_DRV',
    label: 'Relief / Standby Driver',
    sourceType: 'Vehicle',
    targetType: 'Driver',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Links additional relief drivers authorized to operate the vehicle.'
  },
  // Driver <-> Fleet
  {
    code: 'DRV_MEMBER_FLT',
    label: 'Member of Fleet',
    sourceType: 'Driver',
    targetType: 'Fleet',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Driver rostered under an operational fleet.'
  },
  {
    code: 'DRV_LEAD_FLT',
    label: 'Fleet Lead / Marshal',
    sourceType: 'Driver',
    targetType: 'Fleet',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Lead driver or yard marshal overseeing fleet dispatch.'
  },
  {
    code: 'FLT_HAS_DRV',
    label: 'Assigned Driver',
    sourceType: 'Fleet',
    targetType: 'Driver',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Fleet roster membership linking drivers to fleet operations.'
  },
  // Vehicle <-> Fleet
  {
    code: 'VEH_BELONGS_FLT',
    label: 'Belongs to Fleet',
    sourceType: 'Vehicle',
    targetType: 'Fleet',
    allowMultiplePerSource: false,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Primary fleet ownership of a vehicle during an effective period.'
  },
  {
    code: 'VEH_POOL_FLT',
    label: 'Shared Pool Support For Fleet',
    sourceType: 'Vehicle',
    targetType: 'Fleet',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Temporary or shared vehicle pool allocation across fleets.'
  },
  {
    code: 'FLT_OPERATES_VEH',
    label: 'Operates Vehicle',
    sourceType: 'Fleet',
    targetType: 'Vehicle',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Fleet operational control over assigned vehicles.'
  },
  // Fleet <-> Fleet
  {
    code: 'FLT_PARENT_FLT',
    label: 'Sub-Fleet Of (Parent Fleet)',
    sourceType: 'Fleet',
    targetType: 'Fleet',
    allowMultiplePerSource: false,
    allowMultiplePerTarget: true,
    preventCycles: true,
    enabled: true,
    description: 'Hierarchical parent-child fleet structure; circular hierarchies blocked.'
  },
  {
    code: 'FLT_BACKUP_FLT',
    label: 'Backup Support Fleet',
    sourceType: 'Fleet',
    targetType: 'Fleet',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Cross-fleet overflow or contingency support pairing.'
  },
  // Vehicle <-> Vendor
  {
    code: 'VEH_OPERATED_VND',
    label: 'Operated By Transporter / Vendor',
    sourceType: 'Vehicle',
    targetType: 'Vendor',
    allowMultiplePerSource: false,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Links vehicle to its operating transporter or logistics vendor.'
  },
  {
    code: 'VEH_MAINT_VND',
    label: 'Maintained By Service Vendor',
    sourceType: 'Vehicle',
    targetType: 'Vendor',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Authorized workshop, AMC, or tyre/battery maintenance vendor.'
  },
  {
    code: 'VND_SUPPLIES_VEH',
    label: 'Supplies / Operates Vehicle',
    sourceType: 'Vendor',
    targetType: 'Vehicle',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Vendor contractual vehicle supply or fleet operation.'
  },
  // Driver <-> Vendor
  {
    code: 'DRV_CONTRACT_VND',
    label: 'Contracted / Employed By Vendor',
    sourceType: 'Driver',
    targetType: 'Vendor',
    allowMultiplePerSource: false,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Primary transporter or manpower agency managing the driver.'
  },
  {
    code: 'VND_EMPLOYS_DRV',
    label: 'Contracts / Supplies Driver',
    sourceType: 'Vendor',
    targetType: 'Driver',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Vendor driver staffing or agency relationship.'
  },
  // Fleet <-> Vendor
  {
    code: 'FLT_MANAGED_VND',
    label: 'Managed By Logistics Vendor',
    sourceType: 'Fleet',
    targetType: 'Vendor',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Fleet operations contracted or managed by a logistics vendor.'
  },
  {
    code: 'VND_OPERATES_FLT',
    label: 'Operates Fleet',
    sourceType: 'Vendor',
    targetType: 'Fleet',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Vendor executing operations for the selected fleet.'
  },
  // Resource <-> Place
  {
    code: 'VEH_BASE_PLC',
    label: 'Home Base / Terminal Hub',
    sourceType: 'Vehicle',
    targetType: 'Place',
    allowMultiplePerSource: false,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Designated home depot, yard, or port terminal for the vehicle.'
  },
  {
    code: 'VEH_ROUTE_PLC',
    label: 'Authorized Operating Site',
    sourceType: 'Vehicle',
    targetType: 'Place',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Site or terminal where vehicle is cleared to load/unload.'
  },
  {
    code: 'PLC_HOSTS_VEH',
    label: 'Stages / Houses Vehicle',
    sourceType: 'Place',
    targetType: 'Vehicle',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Terminal or yard staging specific vehicles.'
  },
  {
    code: 'DRV_BASE_PLC',
    label: 'Reporting Base / Gate',
    sourceType: 'Driver',
    targetType: 'Place',
    allowMultiplePerSource: false,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Primary reporting hub or gate assignment for the driver.'
  },
  {
    code: 'PLC_HOSTS_DRV',
    label: 'Reporting Hub For Driver',
    sourceType: 'Place',
    targetType: 'Driver',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Place acting as check-in hub for drivers.'
  },
  {
    code: 'FLT_AREA_PLC',
    label: 'Operating Hub / Yard',
    sourceType: 'Fleet',
    targetType: 'Place',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Operational hub or terminal covered by this fleet.'
  },
  {
    code: 'PLC_HOSTS_FLT',
    label: 'Hosts Fleet Operations',
    sourceType: 'Place',
    targetType: 'Fleet',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Port, depot, or yard hosting fleet operations.'
  },
  {
    code: 'VND_SITE_PLC',
    label: 'Operates At Site / Branch',
    sourceType: 'Vendor',
    targetType: 'Place',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Site or yard serviced by the vendor.'
  },
  {
    code: 'PLC_SERVICED_VND',
    label: 'Serviced By Vendor',
    sourceType: 'Place',
    targetType: 'Vendor',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Authorized logistics or facility vendor at this site.'
  },
  {
    code: 'PLC_PARENT_PLC',
    label: 'Sub-Zone / Terminal Of',
    sourceType: 'Place',
    targetType: 'Place',
    allowMultiplePerSource: false,
    allowMultiplePerTarget: true,
    preventCycles: true,
    enabled: true,
    description: 'Parent facility hierarchy (self & cycle links prevented).'
  },
  {
    code: 'PLC_CORRIDOR_PLC',
    label: 'Connected Transit Corridor',
    sourceType: 'Place',
    targetType: 'Place',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Origin-to-destination operational corridor between two places.'
  },
  // Equipment relationships
  {
    code: 'EQP_MOUNTED_VEH',
    label: 'Mounted / Coupled With Vehicle',
    sourceType: 'Equipment',
    targetType: 'Vehicle',
    allowMultiplePerSource: false,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Genset, crane attachment, or trailer equipment coupled to a vehicle.'
  },
  {
    code: 'VEH_CARRIES_EQP',
    label: 'Carries / Tows Equipment',
    sourceType: 'Vehicle',
    targetType: 'Equipment',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: false,
    enabled: true,
    description: 'Vehicle carrying or towing specialized yard/reefer equipment.'
  },
  {
    code: 'EQP_STATIONED_PLC',
    label: 'Stationed At Place / Yard',
    sourceType: 'Equipment',
    targetType: 'Place',
    allowMultiplePerSource: false,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Fixed or yard-assigned operating location for the equipment.'
  },
  {
    code: 'PLC_HOUSES_EQP',
    label: 'Houses Equipment',
    sourceType: 'Place',
    targetType: 'Equipment',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Site housing cranes, stackers, or weighbridges.'
  },
  {
    code: 'EQP_ASSIGNED_FLT',
    label: 'Assigned To Fleet',
    sourceType: 'Equipment',
    targetType: 'Fleet',
    allowMultiplePerSource: false,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Operational fleet responsible for utilizing the equipment.'
  },
  {
    code: 'FLT_OPERATES_EQP',
    label: 'Operates Equipment',
    sourceType: 'Fleet',
    targetType: 'Equipment',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Fleet managing heavy handling equipment.'
  },
  {
    code: 'EQP_OPERATOR_DRV',
    label: 'Operated By Certified Driver',
    sourceType: 'Equipment',
    targetType: 'Driver',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Certified driver/operator cleared to run this equipment.'
  },
  {
    code: 'DRV_CERTIFIED_EQP',
    label: 'Certified Operator Of Equipment',
    sourceType: 'Driver',
    targetType: 'Equipment',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Operator certification link for specialized equipment.'
  },
  {
    code: 'EQP_LEASED_VND',
    label: 'Leased / Maintained By Vendor',
    sourceType: 'Equipment',
    targetType: 'Vendor',
    allowMultiplePerSource: false,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Vendor supplying or maintaining the equipment.'
  },
  {
    code: 'VND_MAINTAINS_EQP',
    label: 'Supplies / Maintains Equipment',
    sourceType: 'Vendor',
    targetType: 'Equipment',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Vendor equipment leasing or AMC service link.'
  },
  // Same-type operational pairings
  {
    code: 'VEH_PAIRED_VEH',
    label: 'Tractor–Trailer / Convoy Pair',
    sourceType: 'Vehicle',
    targetType: 'Vehicle',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    preventCycles: false,
    enabled: true,
    description: 'Operational pairing between prime mover and trailer or escort vehicle.'
  },
  {
    code: 'DRV_BUDDY_DRV',
    label: 'Co-Driver / Team Pair',
    sourceType: 'Driver',
    targetType: 'Driver',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    enabled: true,
    description: 'Relay or team driving pairing between two drivers.'
  },
  {
    code: 'VND_PARTNER_VND',
    label: 'Subcontractor / Partner Vendor',
    sourceType: 'Vendor',
    targetType: 'Vendor',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    preventCycles: true,
    enabled: true,
    description: 'Subcontracting relationship between primary and partner vendors.'
  },
  {
    code: 'EQP_ATTACHED_EQP',
    label: 'Paired Attachment Equipment',
    sourceType: 'Equipment',
    targetType: 'Equipment',
    allowMultiplePerSource: true,
    allowMultiplePerTarget: true,
    preventCycles: true,
    enabled: true,
    description: 'Auxiliary equipment paired with primary handling equipment.'
  }
];

const REL_RULES_STORAGE_KEY = 'fleetrobo_resource_relationship_rules_v1';

export function loadResourceRelationshipRules(): ResourceRelationshipRule[] {
  try {
    const raw = localStorage.getItem(REL_RULES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as ResourceRelationshipRule[];
      }
    }
  } catch {
    // ignore storage read errors
  }
  return DEFAULT_RESOURCE_RELATIONSHIP_RULES;
}

export function saveResourceRelationshipRules(rules: ResourceRelationshipRule[]) {
  try {
    localStorage.setItem(REL_RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // ignore
  }
}

export function getAvailableRelationshipRules(
  rules: ResourceRelationshipRule[],
  sourceType: ResourceType,
  targetType?: ResourceType
): ResourceRelationshipRule[] {
  return rules.filter(
    (r) => r.enabled && r.sourceType === sourceType && (!targetType || r.targetType === targetType)
  );
}

export function computeResourceRelationshipStatus(
  rel: ResourceRelationship,
  allRelationships: ResourceRelationship[],
  nowMs: number = Date.now()
): { status: ResourceRelationshipStatus; reason?: string } {
  if (rel.endedAt) return { status: 'Ended', reason: rel.endReason };

  const startMs = Date.parse(rel.effectiveStartAt);
  const endMs = rel.effectiveEndAt ? Date.parse(rel.effectiveEndAt) : null;

  if (rel.mode === 'Temporal' && endMs !== null && !Number.isNaN(startMs) && endMs <= startMs) {
    return { status: 'Conflict', reason: 'Temporal end timestamp is not after effective start.' };
  }
  if (endMs !== null && !Number.isNaN(endMs) && nowMs >= endMs) {
    return { status: 'Ended' };
  }

  const duplicate = allRelationships.find(
    (other) =>
      other.id !== rel.id &&
      !other.endedAt &&
      other.sourceResourceType === rel.sourceResourceType &&
      other.sourceResourceId === rel.sourceResourceId &&
      other.relationshipCode === rel.relationshipCode &&
      other.targetResourceType === rel.targetResourceType &&
      other.targetResourceId === rel.targetResourceId &&
      dateTimeIntervalsOverlap(
        rel.effectiveStartAt,
        rel.effectiveEndAt,
        other.effectiveStartAt,
        other.endedAt || other.effectiveEndAt
      )
  );
  if (duplicate) {
    return { status: 'Conflict', reason: `Overlaps with duplicate relationship ${duplicate.id}.` };
  }

  if (!Number.isNaN(startMs) && startMs > nowMs) {
    return { status: 'Scheduled' };
  }
  return { status: 'Active' };
}

export function validateResourceRelationship(
  candidate: {
    id?: string;
    sourceResourceType: ResourceType;
    sourceResourceId: string;
    sourceResourceIdentifier: string;
    relationshipCode: string;
    relationshipType: string;
    targetResourceType: ResourceType;
    targetResourceId: string;
    targetResourceIdentifier: string;
    mode: HardwareBindingMode;
    effectiveStartAt: string;
    effectiveEndAt?: string | null;
  },
  existingRelationships: ResourceRelationship[],
  rules: ResourceRelationshipRule[]
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!candidate.sourceResourceId) {
    errors.push(`Select a valid ${candidate.sourceResourceType} from the Master directory.`);
  }
  if (!candidate.targetResourceId) {
    errors.push(`Select a valid Target ${candidate.targetResourceType} from the Master directory.`);
  }
  if (!candidate.relationshipCode && !candidate.relationshipType) {
    errors.push('Select a Relationship Type.');
  }

  if (
    candidate.sourceResourceId &&
    candidate.targetResourceId &&
    candidate.sourceResourceType === candidate.targetResourceType &&
    candidate.sourceResourceId === candidate.targetResourceId
  ) {
    errors.push('Self-relationship blocked: Source and Target resources cannot be the same Master record.');
  }

  const rule = rules.find(
    (r) =>
      r.enabled &&
      r.code === candidate.relationshipCode &&
      r.sourceType === candidate.sourceResourceType &&
      r.targetType === candidate.targetResourceType
  );
  if (!rule) {
    errors.push(
      `Relationship "${candidate.relationshipType || candidate.relationshipCode}" is not enabled for ${candidate.sourceResourceType} → ${candidate.targetResourceType}.`
    );
  }

  const startMs = Date.parse(candidate.effectiveStartAt);
  if (Number.isNaN(startMs)) {
    errors.push('Valid Effective Start date and time are required.');
  }

  if (candidate.mode === 'Temporal') {
    const endMs = candidate.effectiveEndAt ? Date.parse(candidate.effectiveEndAt) : NaN;
    if (Number.isNaN(endMs)) {
      errors.push('Effective End date and time are mandatory for Temporal relationships.');
    } else if (!Number.isNaN(startMs) && endMs <= startMs) {
      errors.push('Effective End must be strictly after Effective Start.');
    }
  }

  if (errors.length > 0 || !rule) {
    return { errors, warnings };
  }

  const activeOthers = existingRelationships.filter((r) => !r.endedAt && r.id !== candidate.id);

  // 1. Prevent exact duplicate relationship over overlapping effective period
  const exactDup = activeOthers.find(
    (r) =>
      r.sourceResourceType === candidate.sourceResourceType &&
      r.sourceResourceId === candidate.sourceResourceId &&
      r.relationshipCode === candidate.relationshipCode &&
      r.targetResourceType === candidate.targetResourceType &&
      r.targetResourceId === candidate.targetResourceId &&
      dateTimeIntervalsOverlap(
        candidate.effectiveStartAt,
        candidate.mode === 'Temporal' ? candidate.effectiveEndAt : null,
        r.effectiveStartAt,
        r.endedAt || r.effectiveEndAt
      )
  );
  if (exactDup) {
    errors.push(
      `Duplicate relationship blocked: ${candidate.sourceResourceIdentifier} already has "${candidate.relationshipType}" with ${candidate.targetResourceIdentifier} in ${exactDup.id} during an overlapping effective period.`
    );
  }

  // 2. Enforce exclusive source rule (when !rule.allowMultiplePerSource)
  if (!rule.allowMultiplePerSource) {
    const sourceConflict = activeOthers.find(
      (r) =>
        r.sourceResourceType === candidate.sourceResourceType &&
        r.sourceResourceId === candidate.sourceResourceId &&
        r.relationshipCode === candidate.relationshipCode &&
        r.targetResourceId !== candidate.targetResourceId &&
        dateTimeIntervalsOverlap(
          candidate.effectiveStartAt,
          candidate.mode === 'Temporal' ? candidate.effectiveEndAt : null,
          r.effectiveStartAt,
          r.endedAt || r.effectiveEndAt
        )
    );
    if (sourceConflict) {
      errors.push(
        `Rule conflict: ${candidate.sourceResourceIdentifier} can only have one active "${rule.label}" at a time (currently linked to ${sourceConflict.targetResourceIdentifier} in ${sourceConflict.id}). End the existing relationship or choose a non-overlapping future window.`
      );
    }
  }

  // 3. Enforce exclusive target rule (when !rule.allowMultiplePerTarget)
  if (!rule.allowMultiplePerTarget) {
    const targetConflict = activeOthers.find(
      (r) =>
        r.targetResourceType === candidate.targetResourceType &&
        r.targetResourceId === candidate.targetResourceId &&
        r.relationshipCode === candidate.relationshipCode &&
        r.sourceResourceId !== candidate.sourceResourceId &&
        dateTimeIntervalsOverlap(
          candidate.effectiveStartAt,
          candidate.mode === 'Temporal' ? candidate.effectiveEndAt : null,
          r.effectiveStartAt,
          r.endedAt || r.effectiveEndAt
        )
    );
    if (targetConflict) {
      errors.push(
        `Rule conflict: ${candidate.targetResourceIdentifier} already has an active "${rule.label}" from ${targetConflict.sourceResourceIdentifier} (${targetConflict.id}) during this period.`
      );
    }
  }

  // 4. Cycle prevention for hierarchical same-type rules
  if (rule.preventCycles && candidate.sourceResourceType === candidate.targetResourceType) {
    const visited = new Set<string>([candidate.sourceResourceId]);
    const queue = [candidate.targetResourceId];
    let hasCycle = false;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visited.has(curr)) {
        hasCycle = true;
        break;
      }
      visited.add(curr);
      activeOthers
        .filter(
          (r) =>
            r.sourceResourceType === candidate.sourceResourceType &&
            r.targetResourceType === candidate.targetResourceType &&
            r.relationshipCode === candidate.relationshipCode &&
            r.sourceResourceId === curr &&
            dateTimeIntervalsOverlap(
              candidate.effectiveStartAt,
              candidate.mode === 'Temporal' ? candidate.effectiveEndAt : null,
              r.effectiveStartAt,
              r.endedAt || r.effectiveEndAt
            )
        )
        .forEach((r) => queue.push(r.targetResourceId));
    }
    if (hasCycle) {
      errors.push(
        `Circular hierarchy detected: "${rule.label}" cannot form a cycle (${candidate.sourceResourceIdentifier} ⇄ ${candidate.targetResourceIdentifier}).`
      );
    }
  }

  return { errors, warnings };
}

export function generateDefaultResourceRelationships(): ResourceRelationship[] {
  return [
    {
      id: 'REL-4001',
      companyId: 'comp-adani-mundra',
      companyName: 'Adani Mundra',
      sourceResourceType: 'Driver',
      sourceResourceId: 'drv-2',
      sourceResourceIdentifier: '+91 9812345678',
      sourceResourceDisplayName: 'Sukhwinder Gill',
      relationshipCode: 'DRV_PRIMARY_VEH',
      relationshipType: 'Assigned Primary Driver',
      targetResourceType: 'Vehicle',
      targetResourceId: 'veh-2',
      targetResourceIdentifier: 'GJ12AB1234',
      targetResourceDisplayName: 'BharatBenz 3528C · GJ12AB1234',
      mode: 'Permanent',
      effectiveStartAt: '2026-10-01T08:00:00+05:30',
      effectiveEndAt: null,
      timezone: 'Asia/Kolkata',
      notes: 'Primary port shuttle operator for container trailer GJ12AB1234',
      createdBy: 'Operations PMO',
      createdAt: '2026-10-01T08:00:00+05:30',
      updatedBy: 'Operations PMO',
      updatedAt: '2026-10-01T08:00:00+05:30',
      history: [
        {
          id: 'relh-4001-1',
          timestamp: '2026-10-01T08:00:00+05:30',
          actor: 'Operations PMO',
          action: 'Created',
          summary: 'Driver +91 9812345678 (Sukhwinder Gill) assigned as Primary Driver for Vehicle GJ12AB1234 (Permanent).'
        }
      ]
    },
    {
      id: 'REL-4002',
      companyId: 'comp-adani-mundra',
      companyName: 'Adani Mundra',
      sourceResourceType: 'Vehicle',
      sourceResourceId: 'veh-1',
      sourceResourceIdentifier: 'GJ12CU9456',
      sourceResourceDisplayName: 'Tata Prima 5530.S · GJ12CU9456',
      relationshipCode: 'VEH_BELONGS_FLT',
      relationshipType: 'Belongs to Fleet',
      targetResourceType: 'Fleet',
      targetResourceId: 'flt-1001',
      targetResourceIdentifier: 'FLT-1001',
      targetResourceDisplayName: 'Adani Mundra Operations',
      mode: 'Permanent',
      effectiveStartAt: '2026-09-15T08:30:00+05:30',
      effectiveEndAt: null,
      timezone: 'Asia/Kolkata',
      notes: 'Primary Mundra dock container fleet assignment',
      createdBy: 'Fleet Supervisor',
      createdAt: '2026-09-15T08:30:00+05:30',
      updatedBy: 'Fleet Supervisor',
      updatedAt: '2026-09-15T08:30:00+05:30',
      history: [
        {
          id: 'relh-4002-1',
          timestamp: '2026-09-15T08:30:00+05:30',
          actor: 'Fleet Supervisor',
          action: 'Created',
          summary: 'Vehicle GJ12CU9456 assigned to Fleet FLT-1001 · Adani Mundra Operations (Permanent).'
        }
      ]
    },
    {
      id: 'REL-4003',
      companyId: 'comp-adani-mundra',
      companyName: 'Adani Mundra',
      sourceResourceType: 'Vehicle',
      sourceResourceId: 'veh-1',
      sourceResourceIdentifier: 'GJ12CU9456',
      sourceResourceDisplayName: 'Tata Prima 5530.S · GJ12CU9456',
      relationshipCode: 'VEH_OPERATED_VND',
      relationshipType: 'Operated By Transporter / Vendor',
      targetResourceType: 'Vendor',
      targetResourceId: 'vnd-seed-01',
      targetResourceIdentifier: 'VND-1001',
      targetResourceDisplayName: 'Western Logistics',
      mode: 'Permanent',
      effectiveStartAt: '2026-09-15T08:30:00+05:30',
      effectiveEndAt: null,
      timezone: 'Asia/Kolkata',
      notes: 'Canonical Transporter vendor linkage',
      createdBy: 'Admin User',
      createdAt: '2026-09-15T08:30:00+05:30',
      updatedBy: 'Admin User',
      updatedAt: '2026-09-15T08:30:00+05:30',
      history: [
        {
          id: 'relh-4003-1',
          timestamp: '2026-09-15T08:30:00+05:30',
          actor: 'Admin User',
          action: 'Created',
          summary: 'Vehicle GJ12CU9456 linked to Transporter Vendor VND-1001 · Western Logistics (Permanent).'
        }
      ]
    },
    {
      id: 'REL-4004',
      companyId: 'comp-adani-mundra',
      companyName: 'Adani Mundra',
      sourceResourceType: 'Driver',
      sourceResourceId: 'drv-1',
      sourceResourceIdentifier: '+91 9876543210',
      sourceResourceDisplayName: 'Ramesh Singh',
      relationshipCode: 'DRV_RELIEF_VEH',
      relationshipType: 'Assigned Co-Driver / Relief',
      targetResourceType: 'Vehicle',
      targetResourceId: 'veh-3',
      targetResourceIdentifier: 'MH26AH1192',
      targetResourceDisplayName: 'Ashok Leyland 4220 · MH26AH1192',
      mode: 'Temporal',
      effectiveStartAt: '2026-11-10T09:00:00+05:30',
      effectiveEndAt: '2026-12-20T23:59:59+05:30',
      timezone: 'Asia/Kolkata',
      notes: 'Peak terminal rotation relief assignment',
      createdBy: 'Dispatch Lead',
      createdAt: '2026-11-10T09:00:00+05:30',
      updatedBy: 'Dispatch Lead',
      updatedAt: '2026-11-12T11:15:00+05:30',
      history: [
        {
          id: 'relh-4004-2',
          timestamp: '2026-11-12T11:15:00+05:30',
          actor: 'Dispatch Lead',
          action: 'Updated',
          summary: 'Extended Temporal effective end from 30 Nov 2026 to 20 Dec 2026.'
        },
        {
          id: 'relh-4004-1',
          timestamp: '2026-11-10T09:00:00+05:30',
          actor: 'Dispatch Lead',
          action: 'Created',
          summary: 'Driver +91 9876543210 assigned as Co-Driver / Relief for Vehicle MH26AH1192.'
        }
      ]
    }
  ];
}

const STORAGE_KEY = 'fleetrobo_modal_master_v6';
const SAVED_VIEWS_KEY = 'fleetrobo_modal_saved_views_v5';

export type ModalMasterStore = ReturnType<typeof generateModalMasterSeedData>;

function ensureUniqueEntityIdsWithMap<T extends { id: string }>(
  items: T[],
  prefix: string
): { items: T[]; remappedIds: Map<string, string> } {
  const seen = new Set<string>();
  const remappedIds = new Map<string, string>();
  let maxNum = 3000;
  for (const item of items) {
    const m = /^([A-Z]+)-(\d+)$/.exec(item.id || '');
    if (m) {
      const n = Number(m[2]);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  const normalized = items.map((item) => {
    const rawId = item.id || `${prefix}-${++maxNum}`;
    if (!seen.has(rawId)) {
      seen.add(rawId);
      return item.id ? item : { ...item, id: rawId };
    }
    let candidate = `${prefix}-${++maxNum}`;
    while (seen.has(candidate)) {
      candidate = `${prefix}-${++maxNum}`;
    }
    seen.add(candidate);
    if (item.id && !remappedIds.has(item.id)) {
      remappedIds.set(item.id, candidate);
    }
    return { ...item, id: candidate };
  });
  return { items: normalized, remappedIds };
}

export function getNextResourceAllocationId(
  existing: ResourceAllocation[],
  offset = 0
): string {
  let maxNum = 2040;
  for (const alloc of existing) {
    const m = /^RCA-(\d+)$/.exec(alloc.id || '');
    if (m) {
      const n = Number(m[1]);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  return `RCA-${maxNum + 1 + offset}`;
}

export function getNextResourceRelationshipId(
  existing: ResourceRelationship[],
  offset = 0
): string {
  let maxNum = 4004;
  for (const rel of existing) {
    const m = /^REL-(\d+)$/.exec(rel.id || '');
    if (m) {
      const n = Number(m[1]);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  return `REL-${maxNum + 1 + offset}`;
}

export function loadModalMasterStore(): ModalMasterStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Array.isArray(parsed.devices) &&
        Array.isArray(parsed.sensors) &&
        Array.isArray(parsed.sims) &&
        Array.isArray(parsed.connections) &&
        Array.isArray(parsed.hardwareBindings) &&
        Array.isArray(parsed.resourceAllocations)
      ) {
        const devNorm = ensureUniqueEntityIdsWithMap<DeviceRecord>(parsed.devices, 'DEV');
        const senNorm = ensureUniqueEntityIdsWithMap<SensorRecord>(parsed.sensors, 'SEN');
        const simNorm = ensureUniqueEntityIdsWithMap<SimRecord>(parsed.sims, 'SIM');
        const conNorm = ensureUniqueEntityIdsWithMap<ConnectionRecord>(parsed.connections, 'CON');
        const bndNorm = ensureUniqueEntityIdsWithMap<HardwareBinding>(parsed.hardwareBindings, 'BND');
        const rcaNorm = ensureUniqueEntityIdsWithMap<ResourceAllocation>(parsed.resourceAllocations, 'RCA');
        const relNorm = Array.isArray(parsed.resourceRelationships)
          ? ensureUniqueEntityIdsWithMap<ResourceRelationship>(parsed.resourceRelationships, 'REL')
          : { items: generateDefaultResourceRelationships(), remappedIds: new Map<string, string>() };

        const remapHwId = (id?: string | null): string => {
          if (!id) return '';
          return (
            devNorm.remappedIds.get(id) ||
            senNorm.remappedIds.get(id) ||
            simNorm.remappedIds.get(id) ||
            id
          );
        };
        const remapConnId = (id?: string): string => {
          if (!id) return '';
          return conNorm.remappedIds.get(id) || id;
        };

        const hasFkRemaps =
          devNorm.remappedIds.size > 0 ||
          senNorm.remappedIds.size > 0 ||
          simNorm.remappedIds.size > 0 ||
          conNorm.remappedIds.size > 0;

        const reconciledConnections = hasFkRemaps
          ? conNorm.items.map((c) => ({
              ...c,
              connectionId: c.connectionId === c.id ? c.id : remapConnId(c.connectionId) || c.id,
              memberIds: (c.memberIds || []).map((mid) => remapHwId(mid)),
              members: (c.members || []).map((m) => ({
                ...m,
                hardwareId: remapHwId(m.hardwareId)
              })),
              hardwareId: c.hardwareId ? remapHwId(c.hardwareId) : c.hardwareId,
              parentId: c.parentId ? remapHwId(c.parentId) : c.parentId,
              simId: c.simId ? remapHwId(c.simId) : c.simId
            }))
          : conNorm.items;

        const reconciledBindings = hasFkRemaps
          ? bndNorm.items.map((b) => ({
              ...b,
              connectionId: remapConnId(b.connectionId),
              fromHardwareId: remapHwId(b.fromHardwareId),
              toHardwareId: remapHwId(b.toHardwareId)
            }))
          : bndNorm.items;

        const reconciledAllocations = hasFkRemaps
          ? rcaNorm.items.map((a) => ({
              ...a,
              connectionId: remapConnId(a.connectionId),
              hardwareId: a.hardwareId ? remapHwId(a.hardwareId) : a.hardwareId
            }))
          : rcaNorm.items;

        const normalizedStore: ModalMasterStore = {
          ...parsed,
          devices: devNorm.items,
          sensors: senNorm.items,
          sims: simNorm.items,
          connections: reconciledConnections,
          hardwareBindings: reconciledBindings,
          resourceAllocations: reconciledAllocations,
          resourceRelationships: relNorm.items
        };
        return {
          ...normalizedStore,
          devices: migrateDeviceRecords(normalizedStore.devices, normalizedStore),
          sensors: migrateSensorRecords(normalizedStore.sensors, normalizedStore)
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  const initial = generateModalMasterSeedData();
  const migratedInitial: ModalMasterStore = {
    ...initial,
    devices: migrateDeviceRecords(initial.devices, initial),
    sensors: migrateSensorRecords(initial.sensors, initial)
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedInitial));
  } catch {
    // ignore
  }
  return migratedInitial;
}

export function saveModalMasterStore(data: ModalMasterStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fleetrobo:modal-store-updated'));
    }
  } catch {
    // ignore
  }
}

export function loadSavedModalViews(): SavedModalView[] {
  try {
    const raw = localStorage.getItem(SAVED_VIEWS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [
    {
      id: 'sv-dev-1',
      pageId: 'devices',
      name: 'Active Mundra Devices',
      query: 'Mundra',
      filters: { hardwareLifecycle: 'Active' },
      sortKey: 'deviceId',
      sortDir: 'asc',
      hiddenCols: []
    },
    {
      id: 'sv-sen-1',
      pageId: 'sensors',
      name: 'Active Fuel & Temp Sensors',
      query: '',
      filters: { hardwareLifecycle: 'Active' },
      sortKey: 'deviceId',
      sortDir: 'asc',
      hiddenCols: []
    },
    {
      id: 'sv-sim-1',
      pageId: 'sims',
      name: 'Active Airtel SIMs',
      query: '',
      filters: { operator: 'Airtel', status: 'Active' },
      sortKey: 'iccid',
      sortDir: 'asc',
      hiddenCols: []
    },
    {
      id: 'sv-con-1',
      pageId: 'connections',
      name: 'Active Multi-Hardware Kits',
      query: '',
      filters: { status: 'Active', resourceAllocated: 'Vehicle' },
      sortKey: 'id',
      sortDir: 'asc',
      hiddenCols: []
    },
    {
      id: 'sv-res-1',
      pageId: 'resources',
      name: 'Active Vehicle Allocations',
      query: '',
      filters: { resourceType: 'Vehicle', status: 'Active' },
      sortKey: 'id',
      sortDir: 'asc',
      hiddenCols: []
    }
  ];
}

export function saveSavedModalViews(views: SavedModalView[]) {
  try {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
  } catch {
    // ignore
  }
}

// Text-safe CSV Export Utility with UTF-8 BOM (prevents scientific-notation mangling on IMEI/ICCID)
export function downloadModalCsv(
  filename: string,
  columns: ModalColumnDef[],
  rows: Record<string, any>[]
) {
  const headerLine = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const dataLines = rows.map((row) =>
    columns
      .map((c) => {
        const rawVal = row[c.key] === undefined || row[c.key] === null ? '' : String(row[c.key]);
        return `"${rawVal.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// RFC 4180-safe CSV line parser
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}
