export interface DriverFilterDefinition {
  id: string;
  key: string;
  label: string;
  section: 'User Accounts' | 'Ownership' | 'Primary' | 'Licence and compliance' | 'Identity';
  control: 'multi' | 'text' | 'date' | 'number';
  tooltip: string;
  options?: string[];
}

export const ALL_27_DRIVER_FILTERS: DriverFilterDefinition[] = [
  // User Accounts Section (6 filters)
  {
    id: 'df-1',
    key: 'accountStatus',
    label: 'Account Mapping',
    section: 'User Accounts',
    control: 'multi',
    tooltip: 'Filter drivers by account mapping.',
    options: ['Linked', 'Not linked']
  },
  {
    id: 'df-2',
    key: 'accountName',
    label: 'Account Name',
    section: 'User Accounts',
    control: 'text',
    tooltip: 'Filter drivers by account name.'
  },
  {
    id: 'df-3',
    key: 'accountEmail',
    label: 'Email',
    section: 'User Accounts',
    control: 'text',
    tooltip: 'Filter drivers by email.'
  },
  {
    id: 'df-4',
    key: 'accountPhone',
    label: 'Account Phone',
    section: 'User Accounts',
    control: 'text',
    tooltip: 'Filter drivers by account phone.'
  },
  {
    id: 'df-5',
    key: 'accountCountry',
    label: 'Country',
    section: 'User Accounts',
    control: 'multi',
    tooltip: 'Filter drivers by country.',
    options: ['India', 'United Arab Emirates', 'Malaysia', 'Saudi Arabia', 'Singapore', 'Other']
  },
  {
    id: 'df-6',
    key: 'accountRole',
    label: 'Role',
    section: 'User Accounts',
    control: 'multi',
    tooltip: 'Filter drivers by role.',
    options: ['Driver', 'Fleet Operator', 'Transporter Admin', 'Company Admin', 'Viewer']
  },

  // Ownership Section (4 filters)
  {
    id: 'df-7',
    key: 'company',
    label: 'Company',
    section: 'Ownership',
    control: 'multi',
    tooltip: 'Owning organisation of the driver. Selecting companies narrows the available transporters.',
    options: ['Adani Mundra', 'Adani Port', 'SIS Cash', 'Akshaykalpa', 'AKPL', 'Binary Semantics Ltd']
  },
  {
    id: 'df-8',
    key: 'transporter',
    label: 'Transporter',
    section: 'Ownership',
    control: 'multi',
    tooltip: 'Transporter linked with the owning company. Options respond to selected companies.',
    options: ['Western Logistics', 'TMS Transporter', 'Binary Logistics', 'SIS Secure Transit', 'ColdChain Express', 'AKPL Freight Partners']
  },
  {
    id: 'df-9',
    key: 'vendor',
    label: 'Vendor Status',
    section: 'Ownership',
    control: 'multi',
    tooltip: 'Whether this driver is managed under vendor operations.',
    options: ['Yes', 'No']
  },
  {
    id: 'df-10',
    key: 'joining',
    label: 'Joining Date',
    section: 'Ownership',
    control: 'date',
    tooltip: 'Date the driver joined the organisation.'
  },

  // Primary Section (4 filters)
  {
    id: 'df-11',
    key: 'status',
    label: 'Driver Status',
    section: 'Primary',
    control: 'multi',
    tooltip: 'Current operational eligibility of the driver record.',
    options: ['Active', 'Inactive', 'Suspended', 'Archived']
  },
  {
    id: 'df-12',
    key: 'licence',
    label: 'Licence Number',
    section: 'Primary',
    control: 'text',
    tooltip: 'Search for a complete or partial driving licence number.'
  },
  {
    id: 'df-13',
    key: 'reg',
    label: 'Registration Number',
    section: 'Primary',
    control: 'text',
    tooltip: 'Search registration numbers of vehicles mapped to drivers.'
  },
  {
    id: 'df-14',
    key: 'mapping',
    label: 'Mapping Status',
    section: 'Primary',
    control: 'multi',
    tooltip: 'Whether the driver has an active vehicle association, an expired one, or no mapping.',
    options: ['Mapped', 'Unmapped', 'Expired']
  },

  // Licence and compliance Section (9 filters)
  {
    id: 'df-15',
    key: 'expiry',
    label: 'Licence Expiry',
    section: 'Licence and compliance',
    control: 'multi',
    tooltip: 'Calculated from the driving licence valid-to date; includes an upcoming 30-day window.',
    options: ['Valid', 'Expiring within 30 days', 'Expired', 'Missing']
  },
  {
    id: 'df-16',
    key: 'licenceTo',
    label: 'Licence Valid To',
    section: 'Licence and compliance',
    control: 'date',
    tooltip: 'Filter the driving licence expiry date using a start and end date.'
  },
  {
    id: 'df-17',
    key: 'licenceFrom',
    label: 'Licence Valid From',
    section: 'Licence and compliance',
    control: 'date',
    tooltip: 'Filter by the driving licence validity start date.'
  },
  {
    id: 'df-18',
    key: 'licenceType',
    label: 'Licence Type',
    section: 'Licence and compliance',
    control: 'multi',
    tooltip: 'Filter drivers by licence type.',
    options: ['LMV', 'HMV', 'HGMV']
  },
  {
    id: 'df-19',
    key: 'verification',
    label: 'Verification Status',
    section: 'Licence and compliance',
    control: 'multi',
    tooltip: 'Overall status derived from RTO certification, police verification and completed training.',
    options: ['Verified', 'Pending']
  },
  {
    id: 'df-20',
    key: 'rto',
    label: 'RTO Certified',
    section: 'Licence and compliance',
    control: 'multi',
    tooltip: 'Filter drivers by rto certified.',
    options: ['Yes', 'No']
  },
  {
    id: 'df-21',
    key: 'police',
    label: 'Police Verified',
    section: 'Licence and compliance',
    control: 'multi',
    tooltip: 'Filter drivers by police verified.',
    options: ['Yes', 'No']
  },
  {
    id: 'df-22',
    key: 'training',
    label: 'Training Completed',
    section: 'Licence and compliance',
    control: 'multi',
    tooltip: 'Filter drivers by training completed.',
    options: ['Yes', 'No']
  },
  {
    id: 'df-23',
    key: 'documents',
    label: 'Document Status',
    section: 'Licence and compliance',
    control: 'multi',
    tooltip: 'Completeness of Aadhaar and driving licence document uploads.',
    options: ['Complete', 'Partial', 'Missing']
  },

  // Identity Section (4 filters)
  {
    id: 'df-24',
    key: 'rfid',
    label: 'RFID Enabled',
    section: 'Identity',
    control: 'multi',
    tooltip: 'Filter drivers by rfid enabled.',
    options: ['Yes', 'No']
  },
  {
    id: 'df-25',
    key: 'blood',
    label: 'Blood Group',
    section: 'Identity',
    control: 'multi',
    tooltip: 'Filter drivers by blood group.',
    options: ['A+', 'B+', 'O+', 'AB+', 'A−', 'B−', 'O−', 'AB−']
  },
  {
    id: 'df-26',
    key: 'dob',
    label: 'Date of Birth',
    section: 'Identity',
    control: 'date',
    tooltip: 'Filter drivers by date of birth.'
  },
  {
    id: 'df-27',
    key: 'experience',
    label: 'Driving Experience (years)',
    section: 'Identity',
    control: 'number',
    tooltip: 'Filter drivers by driving experience (years).'
  }
];

// 28 Core Directory Columns
export interface DriverColumnDef {
  key: string;
  label: string;
  minWidth: string;
  defaultVisible: boolean;
  required?: boolean;
  category: string;
}

export const DRIVER_COLUMNS_CATALOGUE: DriverColumnDef[] = [
  // Primary
  { key: 'name', label: 'Name', minWidth: '205px', defaultVisible: true, required: true, category: 'Primary' },
  { key: 'licence', label: 'Licence Number', minWidth: '180px', defaultVisible: true, category: 'Primary' },
  { key: 'phone', label: 'Mobile Number', minWidth: '160px', defaultVisible: true, category: 'Primary' },
  { key: 'status', label: 'Driver Status', minWidth: '145px', defaultVisible: true, category: 'Primary' },
  { key: 'reg', label: 'Assigned Vehicle Reg. No.', minWidth: '195px', defaultVisible: true, category: 'Primary' },
  { key: 'licenceTo', label: 'Licence Valid To', minWidth: '165px', defaultVisible: true, category: 'Primary' },

  // User Accounts
  { key: 'accountStatus', label: 'Account Linkage', minWidth: '165px', defaultVisible: true, category: 'User Accounts' },
  { key: 'accountName', label: 'Account Name', minWidth: '185px', defaultVisible: false, category: 'User Accounts' },
  { key: 'accountEmail', label: 'Email', minWidth: '245px', defaultVisible: true, category: 'User Accounts' },
  { key: 'accountPhone', label: 'Account Phone', minWidth: '165px', defaultVisible: false, category: 'User Accounts' },
  { key: 'accountCountry', label: 'Country', minWidth: '145px', defaultVisible: false, category: 'User Accounts' },
  { key: 'accountRole', label: 'Role', minWidth: '165px', defaultVisible: true, category: 'User Accounts' },

  // Ownership
  { key: 'company', label: 'Company', minWidth: '205px', defaultVisible: false, category: 'Ownership' },
  { key: 'transporter', label: 'Transporter', minWidth: '185px', defaultVisible: false, category: 'Ownership' },
  { key: 'joining', label: 'Joining Date', minWidth: '150px', defaultVisible: false, category: 'Ownership' },
  { key: 'vendor', label: 'Vendor Linked', minWidth: '140px', defaultVisible: false, category: 'Ownership' },

  // Licence and Compliance
  { key: 'verification', label: 'Verification Status', minWidth: '170px', defaultVisible: false, category: 'Licence and Compliance' },
  { key: 'licenceType', label: 'Licence Type', minWidth: '145px', defaultVisible: false, category: 'Licence and Compliance' },
  { key: 'licenceFrom', label: 'Licence Valid From', minWidth: '165px', defaultVisible: false, category: 'Licence and Compliance' },
  { key: 'rto', label: 'RTO Certified', minWidth: '140px', defaultVisible: false, category: 'Licence and Compliance' },
  { key: 'police', label: 'Police Verified', minWidth: '145px', defaultVisible: false, category: 'Licence and Compliance' },
  { key: 'training', label: 'Training Completed', minWidth: '165px', defaultVisible: false, category: 'Licence and Compliance' },
  { key: 'documents', label: 'Document Status', minWidth: '175px', defaultVisible: false, category: 'Licence and Compliance' },

  // Identity
  { key: 'dob', label: 'Date of Birth', minWidth: '150px', defaultVisible: false, category: 'Identity' },
  { key: 'blood', label: 'Blood Group', minWidth: '130px', defaultVisible: false, category: 'Identity' },
  { key: 'experience', label: 'Driving Experience', minWidth: '165px', defaultVisible: false, category: 'Identity' },
  { key: 'rfid', label: 'RFID Enabled', minWidth: '140px', defaultVisible: false, category: 'Identity' },

  // Legacy / Rest
  { key: 'nextRest', label: 'Next Rest Due', minWidth: '175px', defaultVisible: false, category: 'Rest' }
];

export const DEFAULT_DRIVER_VISIBLE_COLUMNS = [
  'name',
  'licence',
  'phone',
  'status',
  'reg',
  'licenceTo',
  'accountStatus',
  'accountEmail',
  'accountRole'
];

import {
  Driver,
  DRIVER_LOOKUPS,
  deriveDriverBadges,
  isGlobalDriverAdminContext
} from './driver';
import { getCanonicalTransporterVendors, getCanonicalTransporterNames } from '../data/vendorsSeed';
import { ModalMasterStore, loadModalMasterStore } from './modalMaster';

export interface DriverRangeFilterValue {
  from?: string;
  to?: string;
  includeMissing?: boolean;
}

const DRIVER_FILTER_DEF_MAP = new Map<string, DriverFilterDefinition>(
  ALL_27_DRIVER_FILTERS.map((d) => [d.key, d])
);

export function normalizeDriverFilterKey(key: string): string {
  if (key === 'expiryStatus') return 'expiry';
  return key;
}

export function getDriverFilterDefinition(key: string): DriverFilterDefinition | undefined {
  return DRIVER_FILTER_DEF_MAP.get(normalizeDriverFilterKey(key));
}

export function isDriverRangeFilterActive(val: unknown): boolean {
  if (!val || typeof val !== 'object') return false;
  const r = val as DriverRangeFilterValue;
  return Boolean(
    (r.from !== undefined && String(r.from).trim() !== '') ||
      (r.to !== undefined && String(r.to).trim() !== '') ||
      r.includeMissing
  );
}

export function sanitizeDriverFilters(
  raw: Record<string, any> | undefined | null
): Record<string, any> {
  if (!raw || typeof raw !== 'object') return {};
  const cleaned: Record<string, any> = {};
  Object.entries(raw).forEach(([rawKey, val]) => {
    if (val === undefined || val === null) return;
    const key = normalizeDriverFilterKey(rawKey);

    // Migrate legacy Saved View `{ reg: ['Assigned'] }` -> `{ mapping: ['Mapped'] }`
    if (key === 'reg' && Array.isArray(val)) {
      const mappedStates: string[] = [];
      if (val.includes('Assigned')) mappedStates.push('Mapped');
      if (val.includes('Unassigned')) mappedStates.push('Unmapped');
      if (mappedStates.length > 0) {
        cleaned.mapping = Array.from(new Set([...(cleaned.mapping || []), ...mappedStates]));
      }
      return;
    }

    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed) cleaned[key] = trimmed;
      return;
    }

    if (typeof val === 'number') {
      if (!Number.isNaN(val)) {
        const def = getDriverFilterDefinition(key);
        if (def?.control === 'number') {
          cleaned[key] = { from: String(val) };
        } else {
          cleaned[key] = val;
        }
      }
      return;
    }

    if (Array.isArray(val)) {
      const list = Array.from(
        new Set(val.map((v) => String(v).trim()).filter(Boolean))
      );
      if (list.length > 0) {
        if (cleaned[key] && Array.isArray(cleaned[key])) {
          cleaned[key] = Array.from(new Set([...cleaned[key], ...list]));
        } else {
          cleaned[key] = list;
        }
      }
      return;
    }

    if (typeof val === 'object') {
      const obj: DriverRangeFilterValue = {};
      if (val.from !== undefined && String(val.from).trim() !== '') {
        obj.from = String(val.from).trim();
      }
      if (val.to !== undefined && String(val.to).trim() !== '') {
        obj.to = String(val.to).trim();
      }
      if (val.includeMissing) obj.includeMissing = true;
      if (isDriverRangeFilterActive(obj)) {
        cleaned[key] = obj;
      }
    }
  });
  return cleaned;
}

export function countActiveDriverFilters(filters: Record<string, any> | undefined | null): number {
  return Object.keys(sanitizeDriverFilters(filters)).length;
}

function parseDateBoundaryMs(dateStr?: string, endOfDay: boolean = false): number | null {
  const raw = (dateStr || '').trim();
  if (!raw) return null;
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    const dt = endOfDay
      ? new Date(y, m - 1, d, 23, 59, 59, 999)
      : new Date(y, m - 1, d, 0, 0, 0, 0);
    if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
      return dt.getTime();
    }
    return null;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const dt = endOfDay
    ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999)
    : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
  return dt.getTime();
}

export function validateDriverFilterRange(
  def: DriverFilterDefinition,
  val: DriverRangeFilterValue | undefined
): string | null {
  if (!val) return null;
  const hasFrom = val.from !== undefined && String(val.from).trim() !== '';
  const hasTo = val.to !== undefined && String(val.to).trim() !== '';
  if (!hasFrom && !hasTo) return null;

  if (def.control === 'date') {
    const fromMs = hasFrom ? parseDateBoundaryMs(val.from, false) : null;
    const toMs = hasTo ? parseDateBoundaryMs(val.to, false) : null;
    if (hasFrom && fromMs === null) return 'Enter a valid From date.';
    if (hasTo && toMs === null) return 'Enter a valid To date.';
    if (fromMs !== null && toMs !== null && fromMs > toMs) {
      return 'From date cannot be later than To date.';
    }
    return null;
  }

  if (def.control === 'number') {
    const fromNum = hasFrom ? Number(val.from) : null;
    const toNum = hasTo ? Number(val.to) : null;
    if (hasFrom && (fromNum === null || !Number.isFinite(fromNum))) {
      return 'Enter a valid minimum number.';
    }
    if (hasTo && (toNum === null || !Number.isFinite(toNum))) {
      return 'Enter a valid maximum number.';
    }
    if (fromNum !== null && fromNum < 0) return 'Minimum value cannot be negative.';
    if (toNum !== null && toNum < 0) return 'Maximum value cannot be negative.';
    if (fromNum !== null && toNum !== null && fromNum > toNum) {
      return 'Min value cannot exceed Max value.';
    }
    return null;
  }

  return null;
}

export function getOptionsForDriverFilter(
  def: DriverFilterDefinition,
  ctx: {
    drivers: Driver[];
    companyContext?: string;
    selectedCompanies?: string[];
  }
): string[] {
  const isGlobal = isGlobalDriverAdminContext(ctx.companyContext);

  if (def.key === 'company') {
    if (!isGlobal && ctx.companyContext) {
      return [ctx.companyContext.trim()];
    }
    const set = new Set<string>(DRIVER_LOOKUPS.companies);
    ctx.drivers.forEach((d) => {
      if (d.company?.trim()) set.add(d.company.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  if (def.key === 'transporter') {
    const targetCompanies =
      ctx.selectedCompanies && ctx.selectedCompanies.length > 0
        ? ctx.selectedCompanies
        : !isGlobal && ctx.companyContext
        ? [ctx.companyContext.trim()]
        : [];

    if (targetCompanies.length > 0) {
      const set = new Set<string>();
      targetCompanies.forEach((comp) => {
        getCanonicalTransporterVendors(comp).forEach((v) => {
          if (v.name?.trim()) set.add(v.name.trim());
        });
        (DRIVER_LOOKUPS.companyTransporterMap[comp] || []).forEach((t) => set.add(t));
      });
      ctx.drivers.forEach((d) => {
        if (
          d.transporter?.trim() &&
          targetCompanies.some(
            (c) => c.trim().toLowerCase() === (d.company || '').trim().toLowerCase()
          )
        ) {
          set.add(d.transporter.trim());
        }
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    }

    const all = getCanonicalTransporterNames(undefined, DRIVER_LOOKUPS.transporters);
    const set = new Set<string>(all);
    ctx.drivers.forEach((d) => {
      if (d.transporter?.trim()) set.add(d.transporter.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  const baseOptions = [...(def.options || [])];
  const seenLower = new Set(baseOptions.map((o) => o.toLowerCase()));

  if (def.key === 'accountCountry' || def.key === 'accountRole' || def.key === 'licenceType' || def.key === 'blood') {
    ctx.drivers.forEach((d) => {
      const rawVal = (d as any)[def.key];
      const str = typeof rawVal === 'string' ? rawVal.trim() : '';
      if (str && !seenLower.has(str.toLowerCase())) {
        seenLower.add(str.toLowerCase());
        baseOptions.push(str);
      }
    });
  }

  return baseOptions;
}

function matchesDateRange(rawDate: string | undefined, range: DriverRangeFilterValue): boolean {
  const valMs = parseDateBoundaryMs(rawDate, false);
  if (valMs === null) {
    return Boolean(range.includeMissing);
  }
  const hasFrom = range.from !== undefined && String(range.from).trim() !== '';
  const hasTo = range.to !== undefined && String(range.to).trim() !== '';
  if (!hasFrom && !hasTo) {
    // Only includeMissing checked without bounds
    return true;
  }
  if (hasFrom) {
    const fromMs = parseDateBoundaryMs(range.from, false);
    if (fromMs !== null && valMs < fromMs) return false;
  }
  if (hasTo) {
    const toMs = parseDateBoundaryMs(range.to, true);
    if (toMs !== null && valMs > toMs) return false;
  }
  return true;
}

function matchesNumberRange(
  rawNum: number | undefined | null,
  range: DriverRangeFilterValue
): boolean {
  if (rawNum === undefined || rawNum === null || Number.isNaN(Number(rawNum))) {
    return Boolean(range.includeMissing);
  }
  const num = Number(rawNum);
  const hasFrom = range.from !== undefined && String(range.from).trim() !== '';
  const hasTo = range.to !== undefined && String(range.to).trim() !== '';
  if (!hasFrom && !hasTo) return true;
  if (hasFrom) {
    const fromNum = Number(range.from);
    if (Number.isFinite(fromNum) && num < fromNum) return false;
  }
  if (hasTo) {
    const toNum = Number(range.to);
    if (Number.isFinite(toNum) && num > toNum) return false;
  }
  return true;
}

function matchesMulti(candidate: string | undefined, selected: string[]): boolean {
  if (!candidate) return false;
  const norm = candidate.trim().toLowerCase();
  return selected.some((opt) => opt.trim().toLowerCase() === norm);
}

export function evaluateDriverSingleCondition(
  driver: Driver,
  key: string,
  filterVal: any,
  badges: ReturnType<typeof deriveDriverBadges>
): boolean {
  const normKey = normalizeDriverFilterKey(key);
  switch (normKey) {
    // User Accounts (6)
    case 'accountStatus':
      return matchesMulti(badges.accountStatus, Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'accountName':
      return (driver.accountName || '').toLowerCase().includes(String(filterVal).toLowerCase());
    case 'accountEmail':
      return (driver.accountEmail || '').toLowerCase().includes(String(filterVal).toLowerCase());
    case 'accountPhone': {
      const q = String(filterVal).toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      const phoneRaw = (driver.accountPhone || '').toLowerCase();
      const phoneDigits = phoneRaw.replace(/\D/g, '');
      return phoneRaw.includes(q) || (qDigits.length > 0 && phoneDigits.includes(qDigits));
    }
    case 'accountCountry':
      return matchesMulti(driver.accountCountry, Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'accountRole':
      return matchesMulti(driver.accountRole, Array.isArray(filterVal) ? filterVal : [String(filterVal)]);

    // Ownership (4)
    case 'company':
      return matchesMulti(driver.company, Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'transporter':
      return matchesMulti(driver.transporter, Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'vendor':
      return matchesMulti(driver.vendor ? 'Yes' : 'No', Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'joining':
      return matchesDateRange(driver.joining, filterVal as DriverRangeFilterValue);

    // Primary (4)
    case 'status':
      return matchesMulti(driver.status, Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'licence':
      return (driver.licence || '').toLowerCase().includes(String(filterVal).toLowerCase());
    case 'reg': {
      if (Array.isArray(filterVal)) {
        // Legacy fallback if raw un-sanitized filter contains ['Assigned'] / ['Unassigned']
        const wantMapped = filterVal.includes('Assigned') || filterVal.includes('Mapped');
        const wantUnmapped = filterVal.includes('Unassigned') || filterVal.includes('Unmapped');
        if (wantMapped && !wantUnmapped) return badges.mapping === 'Mapped';
        if (wantUnmapped && !wantMapped) return badges.mapping === 'Unmapped';
        return true;
      }
      const q = String(filterVal).trim().toLowerCase();
      if (!q) return true;
      return badges.mappedVehicleRegs.some((r) => r.toLowerCase().includes(q));
    }
    case 'mapping':
      return matchesMulti(badges.mapping, Array.isArray(filterVal) ? filterVal : [String(filterVal)]);

    // Licence and compliance (9)
    case 'expiry':
      return matchesMulti(badges.expiry, Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'licenceTo':
      return matchesDateRange(driver.licenceTo, filterVal as DriverRangeFilterValue);
    case 'licenceFrom':
      return matchesDateRange(driver.licenceFrom, filterVal as DriverRangeFilterValue);
    case 'licenceType':
      return matchesMulti(driver.licenceType, Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'verification':
      return matchesMulti(badges.verification, Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'rto':
      return matchesMulti(driver.rto ? 'Yes' : 'No', Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'police':
      return matchesMulti(driver.police ? 'Yes' : 'No', Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'training':
      return matchesMulti(driver.training ? 'Yes' : 'No', Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'documents':
      return matchesMulti(badges.documents, Array.isArray(filterVal) ? filterVal : [String(filterVal)]);

    // Identity (4)
    case 'rfid':
      return matchesMulti(driver.rfid ? 'Yes' : 'No', Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'blood':
      return matchesMulti(driver.blood, Array.isArray(filterVal) ? filterVal : [String(filterVal)]);
    case 'dob':
      return matchesDateRange(driver.dob, filterVal as DriverRangeFilterValue);
    case 'experience': {
      const rangeVal: DriverRangeFilterValue =
        typeof filterVal === 'object' && !Array.isArray(filterVal)
          ? filterVal
          : { from: String(filterVal) };
      return matchesNumberRange(driver.experience, rangeVal);
    }

    default:
      return false;
  }
}

export function evaluateDriverFilters(
  driver: Driver,
  rawFilters: Record<string, any>,
  mode: 'basic' | 'advanced',
  ctx?: {
    modalStore?: Pick<ModalMasterStore, 'connections' | 'resourceAllocations' | 'resourceRelationships'>;
    allDriverIds?: Set<string>;
    nowMs?: number;
  }
): boolean {
  const filters = sanitizeDriverFilters(rawFilters);
  const keys = Object.keys(filters);
  if (keys.length === 0) return true;

  const store = ctx?.modalStore || loadModalMasterStore();
  const badges = deriveDriverBadges(driver, store, ctx?.nowMs ?? Date.now(), ctx?.allDriverIds);

  if (mode === 'advanced') {
    // Operational Status remains an AND constraint in Advanced (OR) mode
    if (filters.status) {
      if (!evaluateDriverSingleCondition(driver, 'status', filters.status, badges)) {
        return false;
      }
    }
    const otherKeys = keys.filter((k) => k !== 'status');
    if (otherKeys.length === 0) return true;
    return otherKeys.some((k) =>
      evaluateDriverSingleCondition(driver, k, filters[k], badges)
    );
  }

  return keys.every((k) =>
    evaluateDriverSingleCondition(driver, k, filters[k], badges)
  );
}

