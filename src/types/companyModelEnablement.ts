/**
 * Types and storage models for Binary Platform Admin: Company-Level Model Enablement
 */

import { ModelCategoryRecord, loadModelCategoryStore } from './modelCategoryMaster';

export interface ClientCompany {
  id: string;
  name: string;
  legalName: string;
  industry: string;
  sitesCount: number;
  status: 'Active' | 'Onboarding' | 'Inactive';
  contactEmail: string;
  contactPhone: string;
  city: string;
  country: string;
  isPlatformOwner?: boolean;
  notes?: string;
  updatedAt: string;
  createdAt: string;
}

export interface CompanyAuditEntry {
  id: string;
  companyId: string;
  companyName: string;
  modelId: string;
  modelName: string;
  category: string;
  action: 'Enabled' | 'Disabled';
  actor: string;
  timestamp: string;
  oldValue: boolean;
  newValue: boolean;
  note?: string;
}

export interface CompanyModelAccessState {
  // companyId -> { modelId -> boolean }
  accessMap: Record<string, Record<string, boolean>>;
  // companyId -> { modelId -> inUseCount }
  inUseMap: Record<string, Record<string, number>>;
  auditLogs: CompanyAuditEntry[];
}

export const INITIAL_CLIENT_COMPANIES: ClientCompany[] = [
  {
    id: 'comp-adani-mundra',
    name: 'Adani Mundra',
    legalName: 'Adani Mundra Port & SEZ Ltd',
    industry: 'Ports, Marine & SEZ Logistics',
    sitesCount: 4,
    status: 'Active',
    contactEmail: 'operations@adanimundra.example',
    contactPhone: '+91 28 3825 0400',
    city: 'Mundra, Gujarat',
    country: 'India',
    updatedAt: '2026-11-12T10:15:00Z',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'comp-adanimundra-smnl',
    name: 'Adanimundra SMNL',
    legalName: 'Adani Mundra SMNL Logistics',
    industry: 'Container Freight & Inland Logistics',
    sitesCount: 2,
    status: 'Active',
    contactEmail: 'smnl@adanimundra.example',
    contactPhone: '+91 28 3825 0410',
    city: 'Mundra, Gujarat',
    country: 'India',
    updatedAt: '2026-11-12T10:15:00Z',
    createdAt: '2026-02-10T08:00:00Z',
  },
  {
    id: 'comp-central-store',
    name: 'Central Store',
    legalName: 'Adani Central Spares & Warehouse',
    industry: 'Inventory, Spares & Warehousing',
    sitesCount: 1,
    status: 'Active',
    contactEmail: 'store@adanimundra.example',
    contactPhone: '+91 28 3825 0420',
    city: 'Mundra, Gujarat',
    country: 'India',
    updatedAt: '2026-11-12T10:15:00Z',
    createdAt: '2026-02-10T08:00:00Z',
  },
  {
    id: 'comp-ct2-terminal',
    name: 'CT2 Terminal',
    legalName: 'Adani Container Terminal 2',
    industry: 'Container Terminal Operations',
    sitesCount: 1,
    status: 'Active',
    contactEmail: 'ct2@adanimundra.example',
    contactPhone: '+91 28 3825 0430',
    city: 'Mundra, Gujarat',
    country: 'India',
    updatedAt: '2026-11-12T10:15:00Z',
    createdAt: '2026-02-10T08:00:00Z',
  },
  {
    id: 'comp-ct3-terminal',
    name: 'CT3 Terminal',
    legalName: 'Adani Container Terminal 3',
    industry: 'Container Terminal Operations',
    sitesCount: 1,
    status: 'Active',
    contactEmail: 'ct3@adanimundra.example',
    contactPhone: '+91 28 3825 0440',
    city: 'Mundra, Gujarat',
    country: 'India',
    updatedAt: '2026-11-12T10:15:00Z',
    createdAt: '2026-02-10T08:00:00Z',
  },
  {
    id: 'comp-ct4-terminal',
    name: 'CT4 Terminal',
    legalName: 'Adani International Container Terminal (AICT)',
    industry: 'Container Terminal Operations',
    sitesCount: 1,
    status: 'Active',
    contactEmail: 'ct4@adanimundra.example',
    contactPhone: '+91 28 3825 0450',
    city: 'Mundra, Gujarat',
    country: 'India',
    updatedAt: '2026-11-12T10:15:00Z',
    createdAt: '2026-02-10T08:00:00Z',
  },
  {
    id: 'comp-ct5-terminal',
    name: 'CT5 Terminal',
    legalName: 'Adani Mundra Container Terminal 5',
    industry: 'Container Terminal Operations',
    sitesCount: 1,
    status: 'Active',
    contactEmail: 'ct5@adanimundra.example',
    contactPhone: '+91 28 3825 0460',
    city: 'Mundra, Gujarat',
    country: 'India',
    updatedAt: '2026-11-12T10:15:00Z',
    createdAt: '2026-02-10T08:00:00Z',
  },
  {
    id: 'comp-adani-port',
    name: 'Adani Port',
    legalName: 'Adani Ports and Special Economic Zone Ltd',
    industry: 'Ports & Commercial Marine Operations',
    sitesCount: 6,
    status: 'Active',
    contactEmail: 'operations@adaniport.example',
    contactPhone: '+91 79 5550 0100',
    city: 'Ahmedabad, Gujarat',
    country: 'India',
    updatedAt: '2026-11-11T14:30:00Z',
    createdAt: '2026-01-05T09:00:00Z',
  },
  {
    id: 'comp-sis-cash',
    name: 'SIS Cash',
    legalName: 'SIS Cash Services Pvt Ltd',
    industry: 'Cash Logistics & Armored Transport',
    sitesCount: 12,
    status: 'Active',
    contactEmail: 'contact@siscash.example',
    contactPhone: '+91 11 4550 0200',
    city: 'New Delhi',
    country: 'India',
    updatedAt: '2026-11-10T16:00:00Z',
    createdAt: '2026-01-15T11:00:00Z',
  },
  {
    id: 'comp-akshaykalpa',
    name: 'Akshaykalpa',
    legalName: 'Akshaykalpa Farms & Foods Pvt Ltd',
    industry: 'Organic Dairy & Cold Chain Logistics',
    sitesCount: 5,
    status: 'Active',
    contactEmail: 'ops@akshaykalpa.example',
    contactPhone: '+91 80 4000 0300',
    city: 'Bengaluru, Karnataka',
    country: 'India',
    updatedAt: '2026-11-09T11:45:00Z',
    createdAt: '2026-01-20T10:30:00Z',
  },
  {
    id: 'comp-akpl',
    name: 'AKPL',
    legalName: 'AKPL Logistics Pvt Ltd',
    industry: 'Bulk Transport & Long-Haul Freight',
    sitesCount: 3,
    status: 'Active',
    contactEmail: 'support@akpl.example',
    contactPhone: '+91 22 6600 0500',
    city: 'Mumbai, Maharashtra',
    country: 'India',
    updatedAt: '2026-11-08T09:20:00Z',
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'comp-binary',
    name: 'Platform Admin',
    legalName: 'Platform Admin Core',
    industry: 'Platform Owner & Telematics Core',
    sitesCount: 2,
    status: 'Active',
    contactEmail: 'admin@platformadmin.example',
    contactPhone: '+91 12 4470 0000',
    city: 'Gurugram, Haryana',
    country: 'India',
    isPlatformOwner: true,
    updatedAt: '2026-11-12T11:00:00Z',
    createdAt: '2025-12-01T08:00:00Z',
  },
];

export const INITIAL_COMPANY_MODEL_ACCESS: Record<string, Record<string, boolean>> = {
  'comp-adani-mundra': {
    'mcat-01': true,  // MettaX MC202N: Enabled
    'mcat-02': false, // MettaX MC202L: Disabled
    'mcat-03': true,  // Teltonika FMB140: Enabled
    'mcat-04': true,  // Streamax DVR: Enabled
    'mcat-05': true,  // Hikvision IP Camera: Enabled
    'mcat-06': false, // E-Lock: Disabled
    'mcat-07': true,  // Temperature Sensor: Enabled
    'mcat-08': true,  // Fuel Level Sensor: Enabled
    'mcat-09': true,  // Door Sensor: Enabled
    'mcat-10': true,  // Airtel M2M SIM: Enabled
    'mcat-11': true,  // Jio Standard SIM: Enabled
    'mcat-12': true,  // Vodafone eSIM: Enabled
    'mcat-13': true,  // Face Terminal: Enabled
  },
  // Adani Mundra child entities inherit Adani Mundra default model access
  'comp-adanimundra-smnl': {
    'mcat-01': true, 'mcat-02': false, 'mcat-03': true, 'mcat-04': true, 'mcat-05': true, 'mcat-06': false,
    'mcat-07': true, 'mcat-08': true, 'mcat-09': true, 'mcat-10': true, 'mcat-11': true, 'mcat-12': true, 'mcat-13': true,
  },
  'comp-central-store': {
    'mcat-01': true, 'mcat-02': false, 'mcat-03': true, 'mcat-04': true, 'mcat-05': true, 'mcat-06': false,
    'mcat-07': true, 'mcat-08': true, 'mcat-09': true, 'mcat-10': true, 'mcat-11': true, 'mcat-12': true, 'mcat-13': true,
  },
  'comp-ct2-terminal': {
    'mcat-01': true, 'mcat-02': false, 'mcat-03': true, 'mcat-04': true, 'mcat-05': true, 'mcat-06': false,
    'mcat-07': true, 'mcat-08': true, 'mcat-09': true, 'mcat-10': true, 'mcat-11': true, 'mcat-12': true, 'mcat-13': true,
  },
  'comp-ct3-terminal': {
    'mcat-01': true, 'mcat-02': false, 'mcat-03': true, 'mcat-04': true, 'mcat-05': true, 'mcat-06': false,
    'mcat-07': true, 'mcat-08': true, 'mcat-09': true, 'mcat-10': true, 'mcat-11': true, 'mcat-12': true, 'mcat-13': true,
  },
  'comp-ct4-terminal': {
    'mcat-01': true, 'mcat-02': false, 'mcat-03': true, 'mcat-04': true, 'mcat-05': true, 'mcat-06': false,
    'mcat-07': true, 'mcat-08': true, 'mcat-09': true, 'mcat-10': true, 'mcat-11': true, 'mcat-12': true, 'mcat-13': true,
  },
  'comp-ct5-terminal': {
    'mcat-01': true, 'mcat-02': false, 'mcat-03': true, 'mcat-04': true, 'mcat-05': true, 'mcat-06': false,
    'mcat-07': true, 'mcat-08': true, 'mcat-09': true, 'mcat-10': true, 'mcat-11': true, 'mcat-12': true, 'mcat-13': true,
  },
  // SIS Cash (Armored cash vans need E-Locks and GPS trackers)
  'comp-sis-cash': {
    'mcat-01': true,  // MC202N
    'mcat-02': false,
    'mcat-03': true,  // FMB140
    'mcat-04': true,  // Streamax DVR
    'mcat-05': true,  // IP Camera
    'mcat-06': true,  // E-Lock (enabled for cash vault doors)
    'mcat-07': false, // Temperature
    'mcat-08': true,  // Fuel Level
    'mcat-09': true,  // Door Sensor
    'mcat-10': true,  // M2M SIM
    'mcat-11': false,
    'mcat-12': true,
    'mcat-13': false,
  },
  // Akshaykalpa (Cold chain dairy needs Temperature & Fuel sensors)
  'comp-akshaykalpa': {
    'mcat-01': true,  // MC202N
    'mcat-02': false,
    'mcat-03': true,  // FMB140
    'mcat-04': false,
    'mcat-05': false,
    'mcat-06': false,
    'mcat-07': true,  // Temperature (Reefer chillers)
    'mcat-08': true,  // Fuel
    'mcat-09': true,  // Door status
    'mcat-10': true,  // M2M SIM
    'mcat-11': false,
    'mcat-12': false,
    'mcat-13': false,
  },
  // AKPL (Bulk transport)
  'comp-akpl': {
    'mcat-01': false,
    'mcat-02': false,
    'mcat-03': true,  // FMB140
    'mcat-04': false,
    'mcat-05': false,
    'mcat-06': false,
    'mcat-07': false,
    'mcat-08': true,  // Fuel Level
    'mcat-09': false,
    'mcat-10': true,  // M2M SIM
    'mcat-11': false,
    'mcat-12': false,
    'mcat-13': false,
  },
  // Adani Port
  'comp-adani-port': {
    'mcat-01': true,  // MC202N
    'mcat-02': false,
    'mcat-03': true,  // FMB140
    'mcat-04': true,  // Streamax DVR
    'mcat-05': true,  // IP Camera
    'mcat-06': true,  // E-Lock
    'mcat-07': false,
    'mcat-08': true,  // Fuel
    'mcat-09': false,
    'mcat-10': true,  // M2M SIM
    'mcat-11': false,
    'mcat-12': true,
    'mcat-13': true,  // Face Terminal
  },
};

// In-use counts for each company to demonstrate safe impact warnings
export const INITIAL_COMPANY_IN_USE_MAP: Record<string, Record<string, number>> = {
  'comp-adani-mundra': {
    'mcat-01': 42, // MettaX MC202N has 42 active devices assigned
    'mcat-03': 18, // Teltonika FMB140 has 18 active devices assigned
    'mcat-04': 8,  // Streamax DVR has 8 active devices
    'mcat-07': 14, // Temperature Sensor has 14 active sensors
    'mcat-10': 56, // Airtel M2M SIM has 56 active SIMs
    'mcat-12': 12, // Vodafone eSIM
  },
  'comp-sis-cash': {
    'mcat-01': 24,
    'mcat-03': 48,
    'mcat-04': 32,
    'mcat-05': 28,
    'mcat-06': 64, // E-Lock has 64 active locks on armored cash vans
    'mcat-08': 45,
    'mcat-09': 38,
    'mcat-10': 96,
  },
  'comp-akshaykalpa': {
    'mcat-01': 15,
    'mcat-03': 34,
    'mcat-07': 78, // 78 active temperature probes in reefer fleet
    'mcat-08': 32,
    'mcat-09': 30,
    'mcat-10': 65,
  },
  'comp-akpl': {
    'mcat-03': 22,
    'mcat-08': 22,
    'mcat-10': 24,
  },
  'comp-adani-port': {
    'mcat-01': 35,
    'mcat-03': 50,
    'mcat-04': 20,
    'mcat-05': 16,
    'mcat-06': 25,
    'mcat-08': 42,
    'mcat-10': 70,
    'mcat-12': 15,
  },
};

export const INITIAL_AUDIT_LOGS: CompanyAuditEntry[] = [
  {
    id: 'audit-01',
    companyId: 'comp-adani-mundra',
    companyName: 'Adani Mundra',
    modelId: 'mcat-01',
    modelName: 'ADAS/DMS Dashcam (MC202N)',
    category: 'Device',
    action: 'Enabled',
    actor: 'Platform Admin',
    timestamp: '2026-11-10T14:30:00Z',
    oldValue: false,
    newValue: true,
    note: 'Initial enablement for terminal logistics fleet pilot.',
  },
  {
    id: 'audit-02',
    companyId: 'comp-adani-mundra',
    companyName: 'Adani Mundra',
    modelId: 'mcat-07',
    modelName: 'Temperature Sensor',
    category: 'Sensor',
    action: 'Enabled',
    actor: 'Platform Admin',
    timestamp: '2026-11-09T10:15:00Z',
    oldValue: false,
    newValue: true,
    note: 'Approved for cold storage port gate transfer units.',
  },
  {
    id: 'audit-03',
    companyId: 'comp-sis-cash',
    companyName: 'SIS Cash',
    modelId: 'mcat-06',
    modelName: 'E-Lock',
    category: 'Device',
    action: 'Enabled',
    actor: 'Platform Admin',
    timestamp: '2026-11-08T16:00:00Z',
    oldValue: false,
    newValue: true,
    note: 'Standardized smart container latch for armored vehicles.',
  },
];

export const COMPANY_MODEL_TOOLTIPS = {
  companyName: 'Registered client enterprise name operating on the FleetRobo platform.',
  industry: 'Primary operational domain and fleet logistics vertical.',
  sites: 'Total operational hubs, warehouses, depots, or plants mapped under this company.',
  companyStatus: 'Operational lifecycle state: Active, Onboarding, or Inactive.',
  enabledModels: 'Number of globally approved hardware models active for new vehicle registrations and mappings for this client.',
  actions: 'Available platform admin actions for managing tenant model access and configuration.',
  searchCompany: 'Filter client companies by name, legal entity, city, or contact email.',
  addCompany: 'Register a new tenant company in the FleetRobo platform ecosystem.',
  
  // Model Access Tab tooltips
  enableCol: 'Allow this company to select this model/type for new physical asset registration and mapping.',
  categoryCol: 'High-level classification: Device, Sensor, or SIM.',
  typeNameCol: 'User-defined hardware type name created in the global Model Category Master.',
  manufacturerCol: 'Hardware manufacturer or telecommunications SIM service provider.',
  modelReferenceCol: 'Manufacturer model code or hardware specification designation (e.g., MC202N, FMB140).',
  identifierTypeCol: 'Kind of identifier expected for a physical unit (e.g., IMEI, Serial Number, ICCID), not an actual physical value.',
  globalStatusCol: 'Whether the global model definition is active in Model Category Master. Globally inactive types cannot be enabled.',
  inUseStatusCol: 'Shows active physical hardware instances or PMO mappings currently assigned to this model type. Disabling in-use models requires impact confirmation.',
  
  companyContext: 'The tenant whose model access is being configured. All changes remain strictly scoped to this company.',
  enableSelectedBtn: 'Enable all currently selected model types for this client company.',
  disableSelectedBtn: 'Disable all currently selected model types for this client company.',
  saveChangesBtn: 'Commit pending model access changes to the client tenant profile with audit logging.',
  resetBtn: 'Revert unsaved toggle changes back to currently saved platform settings.',
  categoryFilter: 'Filter model catalogue by Device, Sensor, or SIM classification.',
  enablementFilter: 'Filter rows by currently enabled, disabled, or pending states.',
  globalStatusFilter: 'Filter rows by active or inactive status in global master catalogue.',
};

const STORAGE_KEYS = {
  COMPANIES: 'fleetrobo_client_companies_v1',
  ACCESS_MAP: 'fleetrobo_company_model_access_v2',
  IN_USE_MAP: 'fleetrobo_company_in_use_map_v1',
  AUDIT_LOGS: 'fleetrobo_company_audit_logs_v1',
};

export const loadClientCompanies = (): ClientCompany[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    if (raw) {
      const parsed = JSON.parse(raw) as ClientCompany[];
      const normalized = parsed.map((c) =>
        c.id === 'comp-binary' && c.name === 'Binary'
          ? { ...c, name: 'Platform Admin', legalName: 'Platform Admin Core', contactEmail: 'admin@platformadmin.example' }
          : c
      );
      const existingIds = new Set(normalized.map((c) => c.id));
      const missingInitial = INITIAL_CLIENT_COMPANIES.filter((c) => !existingIds.has(c.id));
      if (missingInitial.length > 0) {
        // Place missing initial companies right after Adani Mundra if possible
        const adaniIdx = normalized.findIndex((c) => c.id === 'comp-adani-mundra');
        if (adaniIdx >= 0) {
          const merged = [
            ...normalized.slice(0, adaniIdx + 1),
            ...missingInitial,
            ...normalized.slice(adaniIdx + 1)
          ];
          return merged;
        }
        return [...normalized, ...missingInitial];
      }
      return normalized;
    }
  } catch (e) {
    console.error('Failed to load client companies from localStorage', e);
  }
  return INITIAL_CLIENT_COMPANIES;
};

export const getAvailableClientCompanies = (): string[] => {
  return loadClientCompanies()
    .filter((c) => !c.isPlatformOwner)
    .map((c) => c.name);
};

export const saveClientCompanies = (companies: ClientCompany[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fleetrobo:model-access-updated'));
    }
  } catch (e) {
    console.error('Failed to save client companies to localStorage', e);
  }
};

export const loadCompanyModelAccessMap = (): Record<string, Record<string, boolean>> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCESS_MAP);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, Record<string, boolean>>;
      return { ...INITIAL_COMPANY_MODEL_ACCESS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load company model access from localStorage', e);
  }
  return INITIAL_COMPANY_MODEL_ACCESS;
};

export const saveCompanyModelAccessMap = (map: Record<string, Record<string, boolean>>) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_MAP, JSON.stringify(map));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fleetrobo:model-access-updated'));
    }
  } catch (e) {
    console.error('Failed to save company model access to localStorage', e);
  }
};

export const getEnabledModelsForCompanyName = (companyName: string): ModelCategoryRecord[] => {
  const globalModels = loadModelCategoryStore().filter((m) => m.status === 'Active');
  const norm = (companyName || '').trim().toLowerCase();
  if (!norm || norm === 'platform admin' || norm === 'binary') {
    return globalModels;
  }
  const companies = loadClientCompanies();
  const matchedCompany = companies.find(
    (c) => c.name.trim().toLowerCase() === norm
  );
  if (!matchedCompany || matchedCompany.isPlatformOwner) {
    return globalModels;
  }
  const accessMap = loadCompanyModelAccessMap();
  const companyAccess =
    accessMap[matchedCompany.id] ||
    INITIAL_COMPANY_MODEL_ACCESS[matchedCompany.id] ||
    accessMap['comp-adani-mundra'] ||
    {};
  return globalModels.filter((m) => !!companyAccess[m.id]);
};

export const loadCompanyInUseMap = (): Record<string, Record<string, number>> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.IN_USE_MAP);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load in-use map from localStorage', e);
  }
  return INITIAL_COMPANY_IN_USE_MAP;
};

export const loadCompanyAuditLogs = (): CompanyAuditEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load audit logs from localStorage', e);
  }
  return INITIAL_AUDIT_LOGS;
};

export const saveCompanyAuditLogs = (logs: CompanyAuditEntry[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save audit logs to localStorage', e);
  }
};
