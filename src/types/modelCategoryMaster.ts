export type MainCategory = 'Device' | 'Sensor' | 'SIM';

export type DeviceFunction =
  | 'GPS Tracking'
  | 'Video Telematics'
  | 'Video Recording'
  | 'Camera'
  | 'Electronic Locking'
  | 'Face Terminal'
  | (string & {});

export type DeviceConnectivity = string;

export type SimSupportedChoice = 'Yes' | 'No' | 'Unknown';

export type SensorMeasurementType =
  | 'Temperature'
  | 'Fuel Level'
  | 'Door State'
  | 'Pressure'
  | 'Other';

export type SensorMeasurementUnit =
  | '°C'
  | '°F'
  | 'L'
  | '%'
  | 'State'
  | 'Other'
  | 'Not Applicable';

export type SensorConnectionMode =
  | 'Gateway-connected'
  | 'Standalone'
  | 'Both'
  | 'Unknown';

export type SimTypeChoice = 'M2M' | 'Standard' | 'IoT' | 'Other';

export type SimFormFactorChoice = 'Physical SIM' | 'eSIM';

export type ModelCategoryStatus = 'Active' | 'Inactive';

export interface SupportingDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface ModelCategoryRecord {
  id: string;
  category: MainCategory;
  typeName: string;
  manufacturer: string;
  modelReference: string;
  identifierType: string;
  identifierTypes?: string[];
  description: string;
  documentationUrl: string;
  status: ModelCategoryStatus;
  supportingDocs: SupportingDocument[];
  updatedAt: string;
  createdAt: string;

  // Device-specific fields
  deviceFunction?: DeviceFunction;
  deviceMode?: string;
  supportedModes?: string[];
  supportedProtocols?: string[];
  connectivity?: DeviceConnectivity[];
  simSupported?: SimSupportedChoice;

  // Sensor-specific fields
  measurementType?: SensorMeasurementType;
  measurementUnit?: SensorMeasurementUnit;
  connectionMode?: SensorConnectionMode;

  // SIM-specific fields
  simType?: SimTypeChoice;
  simFormFactor?: SimFormFactorChoice;
  validityMonths?: number | null;
}

export interface IdentifierTypeOptionMeta {
  value: string;
  label: string;
  usedFor: string;
}

export const IDENTIFIER_TYPE_META: Record<MainCategory, IdentifierTypeOptionMeta[]> = {
  Device: [
    { value: 'IMEI', label: 'IMEI (15-digit GSM/LTE)', usedFor: 'GPS Tracker, ADAS/DMS Dashcam, E-Lock (Cellular)' },
    { value: 'Serial Number', label: 'Serial Number (S/N)', usedFor: 'DVR / MDVR, IP Camera, Face Terminal, E-Lock' },
    { value: 'Device ID', label: 'Device ID / Terminal ID', usedFor: 'Face Terminal, MDVR, Custom Telematics Unit' },
    { value: 'MDVR ID', label: 'MDVR ID / Channel Unit ID', usedFor: 'DVR / MDVR, Advanced Video Telematics' },
    { value: 'MAC Address', label: 'MAC Address', usedFor: 'IP Camera, Wi-Fi / Ethernet Gateways, Face Terminal' },
    { value: 'DevEUI', label: 'DevEUI (64-bit IEEE)', usedFor: 'LoRaWAN Gateways & IoT Trackers' },
    { value: 'UUID', label: 'UUID / ONVIF Device ID', usedFor: 'IP Camera, Cloud Video / VMS Terminals' },
  ],
  Sensor: [
    { value: 'Sensor ID', label: 'Sensor ID', usedFor: 'Fuel Level Sensor, Temperature Sensor, Door Sensor' },
    { value: 'Serial Number', label: 'Serial Number (S/N)', usedFor: 'Capacitive Fuel Probe, Ultrasonic / Pressure Sensor' },
    { value: 'BLE MAC', label: 'BLE MAC Address', usedFor: 'Wireless BLE Temp, Door & TPMS Sensors' },
    { value: 'MAC Address', label: 'MAC Address', usedFor: 'Wi-Fi / Ethernet Environmental Sensors' },
    { value: 'DevEUI', label: 'DevEUI (LoRaWAN)', usedFor: 'LoRaWAN Temperature, Door & Tank Level Sensors' },
    { value: '1-Wire ID', label: '1-Wire ROM ID', usedFor: 'Wired Dallas / Digital Temperature Probes' },
    { value: 'Modbus Address', label: 'RS485 / Modbus ID', usedFor: 'RS485 Fuel Level & Industrial Bus Sensors' },
  ],
  SIM: [
    { value: 'ICCID', label: 'ICCID (18–22 digit)', usedFor: 'M2M SIM, Standard SIM, IoT eSIM (Primary)' },
    { value: 'EID', label: 'eSIM EID (32-digit)', usedFor: 'IoT eSIM Embedded Chip Profiles' },
    { value: 'IMSI', label: 'IMSI (Subscriber ID)', usedFor: 'Private APN / Core Network Carrier SIMs' },
    { value: 'MSISDN', label: 'MSISDN (Mobile Number)', usedFor: 'Voice / SMS-enabled Fleet SIMs' },
  ],
};

export const IDENTIFIER_TYPE_OPTIONS: Record<MainCategory, string[]> = {
  Device: IDENTIFIER_TYPE_META.Device.map((o) => o.value),
  Sensor: IDENTIFIER_TYPE_META.Sensor.map((o) => o.value),
  SIM: IDENTIFIER_TYPE_META.SIM.map((o) => o.value),
};

export function getRecordIdentifierTypes(
  rec?: { identifierType?: string; identifierTypes?: string[] } | null
): string[] {
  if (!rec) return [];
  const rawList =
    rec.identifierTypes && rec.identifierTypes.length > 0
      ? rec.identifierTypes
      : (rec.identifierType || '').split(',');
  const seen = new Set<string>();
  const result: string[] = [];
  rawList.forEach((item) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  });
  return result;
}

export function getRecommendedIdentifierTypes(
  category?: MainCategory | '',
  typeName?: string
): string[] {
  const tn = (typeName || '').toLowerCase();
  if (category === 'SIM' || tn.includes('esim') || tn.includes('sim')) {
    return tn.includes('esim') ? ['ICCID', 'EID'] : ['ICCID', 'IMSI', 'MSISDN'];
  }
  if (category === 'Sensor' || tn.includes('sensor') || tn.includes('temp') || tn.includes('fuel') || tn.includes('door')) {
    if (tn.includes('temp')) return ['Sensor ID', 'BLE MAC', '1-Wire ID', 'Serial Number', 'DevEUI'];
    if (tn.includes('fuel')) return ['Sensor ID', 'Serial Number', 'Modbus Address', 'BLE MAC'];
    if (tn.includes('door')) return ['Sensor ID', 'BLE MAC', 'Serial Number', 'DevEUI'];
    return ['Sensor ID', 'Serial Number', 'BLE MAC', 'DevEUI'];
  }
  if (tn.includes('adas') || tn.includes('dms') || tn.includes('dashcam')) {
    return ['IMEI', 'Serial Number', 'Device ID'];
  }
  if (tn.includes('gps') || tn.includes('tracker')) {
    return ['IMEI', 'Serial Number', 'DevEUI'];
  }
  if (tn.includes('dvr') || tn.includes('mdvr') || tn.includes('cctv')) {
    return ['Serial Number', 'MDVR ID', 'Device ID', 'IMEI'];
  }
  if (tn.includes('ip cam') || tn.includes('camera')) {
    return ['Serial Number', 'MAC Address', 'UUID'];
  }
  if (tn.includes('face') || tn.includes('terminal')) {
    return ['Serial Number', 'Device ID', 'MAC Address'];
  }
  if (tn.includes('lock')) {
    return ['Serial Number', 'IMEI', 'Device ID'];
  }
  return category ? IDENTIFIER_TYPE_OPTIONS[category] : ['IMEI', 'Serial Number', 'Sensor ID', 'ICCID'];
}

export const DEVICE_FUNCTION_OPTIONS: DeviceFunction[] = [
  'GPS Tracking',
  'Video Telematics',
  'Video Recording',
  'Camera',
  'Electronic Locking',
  'Face Terminal',
];

export const DEVICE_TYPE_SUGGESTIONS: {
  typeName: string;
  deviceFunction: DeviceFunction;
  defaultMode: string;
  identifierType: string;
}[] = [
  { typeName: 'ADAS/DMS Dashcam', deviceFunction: 'Video Telematics', defaultMode: 'ADAS', identifierType: 'IMEI' },
  { typeName: 'GPS Tracker', deviceFunction: 'GPS Tracking', defaultMode: 'GPS Tracking', identifierType: 'IMEI' },
  { typeName: 'DVR / MDVR', deviceFunction: 'Video Recording', defaultMode: 'Cam1', identifierType: 'Serial Number' },
  { typeName: 'IP Camera', deviceFunction: 'Camera', defaultMode: 'Cam1', identifierType: 'Serial Number' },
  { typeName: 'E-Lock', deviceFunction: 'Electronic Locking', defaultMode: 'Standard', identifierType: 'Serial Number' },
  { typeName: 'Face Terminal', deviceFunction: 'Face Terminal', defaultMode: 'Face Recognition', identifierType: 'Serial Number' },
];

export function getDeviceModePresets(typeName?: string, deviceFunction?: string): string[] {
  const tn = (typeName || '').toLowerCase();
  const fn = (deviceFunction || '').toLowerCase();

  if (tn.includes('adas') || tn.includes('dms') || tn.includes('dashcam') || fn === 'video telematics') {
    return ['ADAS', 'DMS'];
  }
  if (
    tn.includes('dvr') ||
    tn.includes('mdvr') ||
    tn.includes('cctv') ||
    tn.includes('ip cam') ||
    tn.includes('ip camera') ||
    tn.includes('camera') ||
    fn === 'video recording' ||
    fn === 'camera'
  ) {
    return ['Cam1', 'Cam2', 'Cam3', 'Cam4', 'Cam5', 'Cam6'];
  }
  if (tn.includes('face') || tn.includes('terminal') || fn === 'face terminal') {
    return ['Face Recognition', 'Access Control', 'Attendance', 'Standard', 'Active'];
  }
  if (tn.includes('gps') || tn.includes('tracker') || fn === 'gps tracking') {
    return ['GPS Tracking', 'Vehicle Monitoring', 'Standard'];
  }
  if (tn.includes('lock') || fn === 'electronic locking') {
    return ['Standard', 'Active'];
  }
  return [
    'ADAS',
    'DMS',
    'Cam1',
    'Cam2',
    'Cam3',
    'Cam4',
    'Cam5',
    'Cam6',
    'Face Recognition',
    'GPS Tracking',
    'Standard',
    'Active',
  ];
}

export const CONNECTIVITY_OPTIONS: DeviceConnectivity[] = [
  'Cellular',
  'LoRaWAN',
  'NB-IoT',
  'LTE-M',
  'Wi-Fi',
  'Bluetooth',
  'BLE',
  'Ethernet',
  'Satellite',
  'Sigfox',
  'Zigbee',
  'RFID / NFC',
  'CAN Bus',
  'RS232',
  'RS485',
  'OBD-II',
  'USB',
  'Other',
];

export const PLATFORM_PROTOCOL_OPTIONS: string[] = [
  'Metta',
  'BSL',
  'Streamax API',
  'Streamax Protocol',
  'ISUP',
  'ONVIF',
  'RTSP',
  'Codec8',
  'MQTT',
  'TCP',
];

export function getPlatformProtocolPresets(typeName?: string, deviceFunction?: string): string[] {
  const tn = (typeName || '').toLowerCase();
  const fn = (deviceFunction || '').toLowerCase();

  if (tn.includes('adas') || tn.includes('dms') || tn.includes('dashcam') || fn === 'video telematics') {
    return ['Metta', 'BSL', 'Streamax API', 'Streamax Protocol'];
  }
  if (tn.includes('dvr') || tn.includes('mdvr') || tn.includes('cctv') || fn === 'video recording') {
    return ['ISUP', 'ONVIF', 'Streamax API', 'Streamax Protocol', 'RTSP'];
  }
  if (
    tn.includes('ip cam') ||
    tn.includes('ip camera') ||
    tn.includes('camera') ||
    tn.includes('face') ||
    tn.includes('terminal') ||
    fn === 'camera' ||
    fn === 'face terminal'
  ) {
    return ['ISUP', 'ONVIF', 'RTSP'];
  }
  if (tn.includes('gps') || tn.includes('tracker') || tn.includes('lock') || fn === 'gps tracking' || fn === 'electronic locking') {
    return ['Codec8', 'MQTT', 'TCP'];
  }
  return PLATFORM_PROTOCOL_OPTIONS;
}

export const SIM_SUPPORTED_OPTIONS: SimSupportedChoice[] = ['Yes', 'No', 'Unknown'];

export const MEASUREMENT_TYPE_OPTIONS: SensorMeasurementType[] = [
  'Temperature',
  'Fuel Level',
  'Door State',
  'Pressure',
  'Other',
];

export const MEASUREMENT_UNIT_OPTIONS: SensorMeasurementUnit[] = [
  '°C',
  '°F',
  'L',
  '%',
  'State',
  'Other',
  'Not Applicable',
];

export const SENSOR_CONNECTION_MODE_OPTIONS: SensorConnectionMode[] = [
  'Gateway-connected',
  'Standalone',
  'Both',
  'Unknown',
];

export const SIM_TYPE_OPTIONS: SimTypeChoice[] = ['M2M', 'Standard', 'IoT', 'Other'];

export const SIM_FORM_FACTOR_OPTIONS: SimFormFactorChoice[] = ['Physical SIM', 'eSIM'];

export const KNOWN_MANUFACTURERS_PROVIDERS: Record<MainCategory, string[]> = {
  Device: [
    'MettaX',
    'Teltonika',
    'Streamax',
    'Hikvision',
    'CP Plus',
    'Dahua',
    'eSSL',
    'ZKTeco',
    'Matrix Comsec',
    'Howen',
    'Concox (Jimi IoT)',
    'Concox',
    'Queclink',
    'Meitrack',
    'Jointech',
    'Topflytech',
    'iTriangle',
    'Rosmerta',
    'Atlanta Systems',
    'Pricol',
    'Blackbox',
    'Arya Omnitalk',
    'Netradyne',
    'Mobileye',
    'DDPAI',
    '70mai',
    'Bosch',
    'Honeywell',
    'Axis Communications',
    'Godrej Security',
    'TP-Link Vigi',
    'Suprema',
    'Prama',
    'Coban',
  ],
  Sensor: [
    'Escort',
    'Omnicomm',
    'Technoton',
    'Italon',
    'Teltonika',
    'Mielta',
    'Milesight',
    'Dragino',
    'Sensata',
    'Mechatronics',
    'Honeywell',
    'Danfoss',
    'Sensitech',
    'Monnit',
    'Testo',
    'Bosch',
  ],
  SIM: [
    'Airtel',
    'Jio',
    'Vodafone Idea (Vi)',
    'Vodafone Idea',
    'Tata Communications',
    'BSNL',
    'Sensorise',
    'Aeris',
    '1NCE',
    'AT&T',
    'Singtel',
  ],
};

export function getTopIndiaManufacturersForType(
  category?: MainCategory | '',
  typeName?: string
): string[] {
  const tn = (typeName || '').trim().toLowerCase();

  if (tn.includes('adas') || tn.includes('dms') || tn.includes('dashcam')) {
    return [
      'MettaX',
      'Streamax',
      'Howen',
      'Concox (Jimi IoT)',
      'Netradyne',
      'Mobileye',
      'Hikvision',
      'DDPAI',
      '70mai',
      'BlackVue',
    ];
  }
  if (tn.includes('door')) {
    return [
      'Teltonika',
      'Escort',
      'Milesight',
      'Dragino',
      'Honeywell',
      'Sensata',
      'Bosch',
      'Aqara',
    ];
  }
  if (tn.includes('dvr') || tn.includes('mdvr') || tn.includes('cctv')) {
    return [
      'Streamax',
      'Hikvision',
      'CP Plus',
      'Dahua',
      'Howen',
      'Prama',
      'Matrix Comsec',
      'Bosch',
    ];
  }
  if (tn.includes('lock')) {
    return [
      'Jointech',
      'Topflytech',
      'Concox (Jimi IoT)',
      'Teltonika',
      'Meitrack',
      'Solex',
      'Traxze',
    ];
  }
  if (tn.includes('face') || tn.includes('terminal') || tn.includes('biometric')) {
    return [
      'Hikvision',
      'eSSL',
      'ZKTeco',
      'Matrix Comsec',
      'Dahua',
      'CP Plus',
      'Suprema',
      'Honeywell',
      'Biomatrix',
    ];
  }
  if (tn.includes('fuel')) {
    return [
      'Escort',
      'Omnicomm',
      'Technoton',
      'Italon',
      'Mielta',
      'Sensata',
      'Sensoronics',
    ];
  }
  if (tn.includes('temp')) {
    return [
      'Teltonika',
      'Escort',
      'Sensitech',
      'Milesight',
      'Dragino',
      'Monnit',
      'Testo',
      'Danfoss',
    ];
  }
  if (tn.includes('gps') || tn.includes('tracker')) {
    return [
      'Teltonika',
      'iTriangle',
      'Concox (Jimi IoT)',
      'Atlanta Systems',
      'Rosmerta',
      'Pricol',
      'Queclink',
      'Meitrack',
      'Blackbox',
      'Arya Omnitalk',
      'Coban',
    ];
  }
  if (tn.includes('sim') || tn.includes('esim') || category === 'SIM') {
    return [
      'Airtel',
      'Jio',
      'Vodafone Idea (Vi)',
      'Tata Communications',
      'BSNL',
      'Sensorise',
      'Aeris',
      '1NCE',
    ];
  }
  if (tn.includes('ip cam') || tn.includes('camera')) {
    return [
      'Hikvision',
      'CP Plus',
      'Dahua',
      'Bosch',
      'Honeywell',
      'Axis Communications',
      'Godrej Security',
      'TP-Link Vigi',
      'Matrix Comsec',
    ];
  }

  if (category && KNOWN_MANUFACTURERS_PROVIDERS[category]) {
    return KNOWN_MANUFACTURERS_PROVIDERS[category];
  }

  return Array.from(
    new Set([
      ...KNOWN_MANUFACTURERS_PROVIDERS.Device,
      ...KNOWN_MANUFACTURERS_PROVIDERS.Sensor,
      ...KNOWN_MANUFACTURERS_PROVIDERS.SIM,
    ])
  );
}

export const MODEL_CATEGORY_TOOLTIPS = {
  // Table columns & common headers
  typeName: 'Name created by Admin for a supported hardware/SIM type; this is not an individual installed unit.',
  category: 'Top-level classification: Device, Sensor or SIM. This decides which additional dynamic fields are shown.',
  manufacturerProvider: 'Vendor or hardware maker for Device/Sensor, or telecom operator/provider for SIM.',
  modelReference: "Mandatory maker's model code or reference, e.g. MC202N; do not put an asset serial number here.",
  identifierType: 'Kind of unique ID used when physical items are registered, e.g. IMEI or ICCID; not the actual ID.',
  categoryDetail: 'Short summary selected from category-specific fields: Device Function & Mode; Sensor Measurement/Unit; SIM Type/Form Factor.',
  supportingDocs: 'Number or names of attached type-level datasheets, installation guides or support files.',
  status: 'Active types can be used for new registrations; Inactive remain in historical records.',
  updatedOn: 'Date this type definition was last modified.',
  actions: 'View details, edit type, activate/deactivate; disabling a type does not erase existing assets.',
  
  // Filters & Top Controls
  search: 'Search Type Name, vendor/manufacturer or model/reference.',
  categoryFilter: 'Display all types or only Device, Sensor or SIM types.',
  statusFilter: 'Filter by whether types can be used for new registrations.',
  addTypeBtn: 'Create a new Device, Sensor or SIM type in the global catalogue.',
  rowsPerPage: 'Control how many type records appear on one page.',

  // Drawer Form fields
  formCategory: 'Choose whether this new type is a Device, Sensor or SIM. This decides which additional fields are shown.',
  formTypeName: 'Enter or pick the type name you are creating, such as ADAS/DMS Dashcam or Face Terminal.',
  formManufacturer: 'Select a Vendor from Vendor Master, a standard hardware manufacturer, or add a custom vendor.',
  formModelReference: 'Mandatory hardware model name/part number, such as MC202N. Do not enter the individual device serial/IMEI here.',
  formIdentifierType: 'Select one or more unique physical ID formats captured during client registration (e.g. IMEI + Serial Number for GPS/Dashcam, Sensor ID + BLE MAC for Sensors, ICCID + EID for SIM).',
  formDescription: 'Brief explanation of what this type represents or where it is used.',
  formSupportingDocs: 'Attach a manufacturer datasheet, installation guide or support document describing this type.',
  formDocUrl: 'Public or internal support/documentation link for the type; not a media stream or device endpoint.',
  formStatus: 'Active makes the type available for new asset registrations. Inactive retains existing references but prevents new use.',

  // Device Specific
  deviceFunction: 'Main purpose of this device type; it does not constrain which type name Admin may create.',
  deviceMode: 'Operating or channel mode for this device model (e.g. ADAS/DMS for Dashcam, Cam1–Cam6 for DVR/MDVR and IP Camera, or add a custom mode).',
  platformProtocols: 'Platform integration protocols supported by this hardware model (e.g. Metta, BSL, Streamax API, ISUP, ONVIF, Codec8). Clients choose one when registering a physical unit.',
  connectivity: 'Connection modes the manufacturer says the device type supports; select only documented modes.',
  simSupported: 'Whether a SIM can be used by this device type; this is not a SIM assignment.',

  // Sensor Specific
  measurementType: 'What this sensor type measures or detects. This does not replace the editable Type Name.',
  measurementUnit: "Unit expected for this sensor's reading; choose Not Applicable for binary states if needed.",
  connectionMode: 'Whether the sensor depends on a gateway/device or can communicate independently.',

  // SIM Specific
  simType: 'Commercial/service classification of SIM. This is different from the Admin-created Type Name and from Physical/eSIM form factor.',
  simFormFactor: 'Whether the SIM is a removable physical card or an embedded/electronic SIM profile.',
  validityMonths: "Optional default validity for this type; actual activation/expiry for an issued SIM is stored in the client's SIM record.",
};

export const INITIAL_MODEL_CATEGORY_RECORDS: ModelCategoryRecord[] = [
  {
    id: 'mcat-01',
    category: 'Device',
    typeName: 'ADAS/DMS Dashcam',
    manufacturer: 'MettaX',
    modelReference: 'MC202N',
    identifierType: 'IMEI',
    description: 'Camera-based vehicle safety/driver monitoring device type with dual camera lenses and AI coprocessor.',
    documentationUrl: 'https://docs.mettax.example/mc202n',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-11-10T10:30:00Z',
    createdAt: '2026-01-15T08:00:00Z',
    deviceFunction: 'Video Telematics',
    deviceMode: 'ADAS',
    supportedModes: ['ADAS', 'DMS'],
    supportedProtocols: ['Metta', 'BSL'],
    connectivity: ['Cellular', 'Wi-Fi'],
    simSupported: 'Yes',
  },
  {
    id: 'mcat-02',
    category: 'Device',
    typeName: 'ADAS/DMS Dashcam',
    manufacturer: 'MettaX',
    modelReference: 'MC202L',
    identifierType: 'IMEI',
    description: 'Alternate MettaX ADAS/DMS device model reference with localized GNSS and 4G LTE-M telemetry.',
    documentationUrl: 'https://docs.mettax.example/mc202l',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-11-10T11:00:00Z',
    createdAt: '2026-01-18T09:15:00Z',
    deviceFunction: 'Video Telematics',
    deviceMode: 'DMS',
    supportedModes: ['ADAS', 'DMS'],
    supportedProtocols: ['Metta', 'BSL'],
    connectivity: ['Cellular'],
    simSupported: 'Yes',
  },
  {
    id: 'mcat-03',
    category: 'Device',
    typeName: 'GPS Tracker',
    manufacturer: 'Teltonika',
    modelReference: 'FMB140',
    identifierType: 'IMEI',
    description: 'Vehicle tracking device type with internal CAN data reader and Bluetooth sensor pairing.',
    documentationUrl: 'https://wiki.teltonika-gps.example/FMB140',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-11-08T14:20:00Z',
    createdAt: '2026-02-01T10:00:00Z',
    deviceFunction: 'GPS Tracking',
    deviceMode: 'GPS Tracking',
    supportedProtocols: ['Codec8', 'MQTT', 'TCP'],
    connectivity: ['Cellular', 'Bluetooth'],
    simSupported: 'Yes',
  },
  {
    id: 'mcat-04',
    category: 'Device',
    typeName: 'DVR / MDVR',
    manufacturer: 'Streamax',
    modelReference: 'XVR-410',
    identifierType: 'Serial Number',
    description: 'In-vehicle camera recording device type; multi-channel AHD video recorder with shock-absorbing HDD caddy.',
    documentationUrl: '',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-11-05T09:40:00Z',
    createdAt: '2026-02-10T12:00:00Z',
    deviceFunction: 'Video Recording',
    deviceMode: 'Cam1',
    supportedModes: ['Cam1', 'Cam2', 'Cam3', 'Cam4', 'Cam5', 'Cam6'],
    supportedProtocols: ['ISUP', 'ONVIF', 'Streamax API', 'Streamax Protocol'],
    connectivity: ['Cellular', 'Ethernet'],
    simSupported: 'Unknown',
  },
  {
    id: 'mcat-05',
    category: 'Device',
    typeName: 'IP Camera',
    manufacturer: 'Hikvision',
    modelReference: 'DS-2CD2043G2-I',
    identifierType: 'Serial Number',
    description: 'IP camera device type; weatherproof ruggedized exterior dome camera for cargo and perimeter surveillance.',
    documentationUrl: '',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-11-02T16:15:00Z',
    createdAt: '2026-02-15T15:30:00Z',
    deviceFunction: 'Camera',
    deviceMode: 'Cam1',
    supportedModes: ['Cam1', 'Cam2', 'Cam3', 'Cam4', 'Cam5', 'Cam6'],
    supportedProtocols: ['ISUP', 'ONVIF', 'RTSP'],
    connectivity: ['Ethernet'],
    simSupported: 'No',
  },
  {
    id: 'mcat-06',
    category: 'Device',
    typeName: 'E-Lock',
    manufacturer: 'Jointech',
    modelReference: 'JT701',
    identifierType: 'Serial Number',
    description: 'Electronic lock device type for container latch and trailer barn doors.',
    documentationUrl: '',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-10-28T13:00:00Z',
    createdAt: '2026-03-01T08:30:00Z',
    deviceFunction: 'Electronic Locking',
    deviceMode: 'Standard',
    supportedProtocols: ['MQTT', 'TCP', 'Codec8'],
    connectivity: ['Cellular', 'Bluetooth'],
    simSupported: 'Unknown',
  },
  {
    id: 'mcat-07',
    category: 'Sensor',
    typeName: 'Temperature Sensor',
    manufacturer: '',
    modelReference: '',
    identifierType: 'Sensor ID',
    description: 'Temperature-reading sensor type for cold chain reefer trailers and vaccine transport boxes.',
    documentationUrl: '',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-10-25T11:20:00Z',
    createdAt: '2026-03-05T10:45:00Z',
    measurementType: 'Temperature',
    measurementUnit: '°C',
    connectionMode: 'Unknown',
  },
  {
    id: 'mcat-08',
    category: 'Sensor',
    typeName: 'Fuel Level Sensor',
    manufacturer: '',
    modelReference: '',
    identifierType: 'Sensor ID',
    description: 'Fuel-level measurement sensor type; capacitive immersion probe for diesel tanks with high damping.',
    documentationUrl: '',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-10-20T09:10:00Z',
    createdAt: '2026-03-12T14:15:00Z',
    measurementType: 'Fuel Level',
    measurementUnit: 'L',
    connectionMode: 'Unknown',
  },
  {
    id: 'mcat-09',
    category: 'Sensor',
    typeName: 'Door Sensor',
    manufacturer: '',
    modelReference: '',
    identifierType: 'Sensor ID',
    description: 'Door open/closed detection sensor type using magnetic reed switch contact.',
    documentationUrl: '',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-10-15T15:50:00Z',
    createdAt: '2026-03-20T11:00:00Z',
    measurementType: 'Door State',
    measurementUnit: 'State',
    connectionMode: 'Gateway-connected',
  },
  {
    id: 'mcat-10',
    category: 'SIM',
    typeName: 'M2M SIM',
    manufacturer: 'Airtel',
    modelReference: '',
    identifierType: 'ICCID',
    description: 'Machine-to-machine connectivity SIM type with private APN access and high industrial temperature tolerance.',
    documentationUrl: 'https://airtel.in/business/iot',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-10-10T12:00:00Z',
    createdAt: '2026-04-01T09:00:00Z',
    simType: 'M2M',
    simFormFactor: 'Physical SIM',
    validityMonths: 24,
  },
  {
    id: 'mcat-11',
    category: 'SIM',
    typeName: 'Standard SIM',
    manufacturer: 'Jio',
    modelReference: '',
    identifierType: 'ICCID',
    description: 'Standard operator SIM type for telematics hardware and vehicle tracking units.',
    documentationUrl: '',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-10-05T08:30:00Z',
    createdAt: '2026-04-05T10:30:00Z',
    simType: 'Standard',
    simFormFactor: 'Physical SIM',
    validityMonths: 12,
  },
  {
    id: 'mcat-12',
    category: 'SIM',
    typeName: 'IoT eSIM',
    manufacturer: 'Jio',
    modelReference: '',
    identifierType: 'ICCID',
    description: 'Embedded/electronic SIM type for solderable IoT chipsets with remote profile provisioning (GSMA M2M).',
    documentationUrl: '',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-10-01T14:45:00Z',
    createdAt: '2026-04-10T16:00:00Z',
    simType: 'IoT',
    simFormFactor: 'eSIM',
    validityMonths: 36,
  },
  {
    id: 'mcat-13',
    category: 'Device',
    typeName: 'Face Terminal',
    manufacturer: 'Hikvision',
    modelReference: 'DS-K1T671M',
    identifierType: 'Serial Number',
    description: 'Biometric face recognition terminal for driver verification, yard gate access control, and shift attendance.',
    documentationUrl: '',
    status: 'Active',
    supportingDocs: [],
    updatedAt: '2026-11-12T09:00:00Z',
    createdAt: '2026-11-12T09:00:00Z',
    deviceFunction: 'Face Terminal',
    deviceMode: 'Face Recognition',
    supportedModes: ['Face Recognition', 'Access Control', 'Attendance', 'Standard', 'Active'],
    supportedProtocols: ['ISUP', 'ONVIF'],
    connectivity: ['Ethernet', 'Wi-Fi'],
    simSupported: 'No',
  },
];

const LOCAL_STORAGE_KEY = 'fleetrobo_model_category_master_v1';
const CUSTOM_MODES_STORAGE_KEY = 'fleetrobo_custom_device_modes_v1';
const CUSTOM_FUNCTIONS_STORAGE_KEY = 'fleetrobo_custom_device_functions_v1';
const CUSTOM_MANUFACTURERS_STORAGE_KEY = 'fleetrobo_custom_manufacturers_v1';
const CUSTOM_IDENTIFIERS_STORAGE_KEY = 'fleetrobo_custom_identifier_types_v1';
const CUSTOM_PROTOCOLS_STORAGE_KEY = 'fleetrobo_custom_platform_protocols_v1';
const CUSTOM_CONNECTIVITY_STORAGE_KEY = 'fleetrobo_custom_connectivity_v1';

function loadCustomStringList(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function saveCustomStringItem(storageKey: string, value: string): string[] {
  const trimmed = value.trim();
  const existing = loadCustomStringList(storageKey);
  if (!trimmed) return existing;
  if (existing.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
    return existing;
  }
  const next = [...existing, trimmed];
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function loadCustomDeviceModes(): string[] {
  return loadCustomStringList(CUSTOM_MODES_STORAGE_KEY);
}

export function saveCustomDeviceMode(mode: string): string[] {
  return saveCustomStringItem(CUSTOM_MODES_STORAGE_KEY, mode);
}

export function loadCustomDeviceFunctions(): string[] {
  return loadCustomStringList(CUSTOM_FUNCTIONS_STORAGE_KEY);
}

export function saveCustomDeviceFunction(fn: string): string[] {
  return saveCustomStringItem(CUSTOM_FUNCTIONS_STORAGE_KEY, fn);
}

export function loadCustomManufacturers(): string[] {
  return loadCustomStringList(CUSTOM_MANUFACTURERS_STORAGE_KEY);
}

export function saveCustomManufacturer(name: string): string[] {
  return saveCustomStringItem(CUSTOM_MANUFACTURERS_STORAGE_KEY, name);
}

export function loadCustomIdentifierTypes(): string[] {
  return loadCustomStringList(CUSTOM_IDENTIFIERS_STORAGE_KEY);
}

export function saveCustomIdentifierType(name: string): string[] {
  return saveCustomStringItem(CUSTOM_IDENTIFIERS_STORAGE_KEY, name);
}

export function loadCustomPlatformProtocols(): string[] {
  return loadCustomStringList(CUSTOM_PROTOCOLS_STORAGE_KEY);
}

export function saveCustomPlatformProtocol(name: string): string[] {
  return saveCustomStringItem(CUSTOM_PROTOCOLS_STORAGE_KEY, name);
}

export function loadCustomConnectivityOptions(): string[] {
  return loadCustomStringList(CUSTOM_CONNECTIVITY_STORAGE_KEY);
}

export function saveCustomConnectivityOption(name: string): string[] {
  return saveCustomStringItem(CUSTOM_CONNECTIVITY_STORAGE_KEY, name);
}

export function loadModelCategoryStore(): ModelCategoryRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seedById = new Map(INITIAL_MODEL_CATEGORY_RECORDS.map((r) => [r.id, r]));
        const hydrated: ModelCategoryRecord[] = parsed.map((rec: ModelCategoryRecord): ModelCategoryRecord => {
          const seed = seedById.get(rec.id);
          const resolvedIds = getRecordIdentifierTypes(rec);
          const base = seed
            ? {
                ...rec,
                modelReference: rec.modelReference || seed.modelReference,
                manufacturer: rec.manufacturer || seed.manufacturer,
                deviceMode: rec.deviceMode || seed.deviceMode,
                supportedModes: rec.supportedModes || seed.supportedModes,
                supportedProtocols:
                  rec.supportedProtocols && rec.supportedProtocols.length > 0
                    ? rec.supportedProtocols
                    : seed.supportedProtocols,
              }
            : rec;
          return {
            ...base,
            identifierTypes:
              base.identifierTypes && base.identifierTypes.length > 0
                ? base.identifierTypes
                : resolvedIds,
          };
        });
        const existingIds = new Set(hydrated.map((r: ModelCategoryRecord) => r.id));
        const faceSeed = seedById.get('mcat-13');
        if (faceSeed && !existingIds.has('mcat-13')) {
          hydrated.push(faceSeed);
        }
        return hydrated;
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_MODEL_CATEGORY_RECORDS;
}

export function saveModelCategoryStore(records: ModelCategoryRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fleetrobo:model-access-updated'));
    }
  } catch {
    // ignore
  }
}
