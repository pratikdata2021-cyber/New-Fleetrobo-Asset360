export interface FilterDefinition {
  id: string;
  key: string;
  label: string;
  group: string;
  control: 'multi-select' | 'search-dropdown' | 'numeric-range' | 'date-range' | 'yes-no';
  isBasicDefault: boolean;
  note: string;
}

export const ALL_61_FILTERS: FilterDefinition[] = [
  {
    id: 'f-1',
    key: 'company',
    label: 'Company',
    group: 'Organisation',
    control: 'multi-select',
    isBasicDefault: true,
    note: 'Select once at creation or inherit from tenant context. Organisation scope; not registered-owner identity.'
  },
  {
    id: 'f-2',
    key: 'registration_number',
    label: 'Registration Number',
    group: 'Vehicle Identity',
    control: 'search-dropdown',
    isBasicDefault: true,
    note: 'Canonical registration field; mandatory; unique within the owning company.'
  },
  {
    id: 'f-3',
    key: 'name',
    label: 'Vehicle Name',
    group: 'Vehicle Identity',
    control: 'search-dropdown',
    isBasicDefault: true,
    note: 'Explicit name plus generated year/make/model/trim fallback.'
  },
  {
    id: 'f-4',
    key: 'internal_id',
    label: 'Internal ID',
    group: 'Vehicle Identity',
    control: 'search-dropdown',
    isBasicDefault: false,
    note: 'The identifier used by the operator’s own system.'
  },
  {
    id: 'f-5',
    key: 'vin',
    label: 'VIN',
    group: 'Vehicle Identity',
    control: 'search-dropdown',
    isBasicDefault: false,
    note: 'The vehicle identification number.'
  },
  {
    id: 'f-6',
    key: 'make',
    label: 'Make',
    group: 'Vehicle Identity',
    control: 'search-dropdown',
    isBasicDefault: true,
    note: 'The vehicle manufacturer or brand.'
  },
  {
    id: 'f-7',
    key: 'model',
    label: 'Machine Model',
    group: 'Vehicle Identity',
    control: 'search-dropdown',
    isBasicDefault: true,
    note: 'The machine or vehicle model designation.'
  },
  {
    id: 'f-8',
    key: 'year',
    label: 'Year',
    group: 'Vehicle Identity',
    control: 'numeric-range',
    isBasicDefault: true,
    note: 'Public API requires integer 1900–2100.'
  },
  {
    id: 'f-9',
    key: 'serial_number',
    label: 'Serial Number',
    group: 'Vehicle Identity',
    control: 'search-dropdown',
    isBasicDefault: false,
    note: 'The serial identifier stored for the vehicle.'
  },
  {
    id: 'f-10',
    key: 'fuel_card_number',
    label: 'Fuel Card Number',
    group: 'Vehicle Identity',
    control: 'search-dropdown',
    isBasicDefault: false,
    note: 'Card identifier distinct from Petro-card Child ID.'
  },
  {
    id: 'f-11',
    key: 'status',
    label: 'Vehicle Status',
    group: 'Vehicle Identity',
    control: 'multi-select',
    isBasicDefault: true,
    note: 'Vehicle operational status is independent of Online, sharing, and breakdowns.'
  },
  {
    id: 'f-12',
    key: 'call_sign',
    label: 'Call Sign',
    group: 'Vehicle Identity',
    control: 'search-dropdown',
    isBasicDefault: false,
    note: 'The radio or operational call sign used for dispatch.'
  },
  {
    id: 'f-13',
    key: 'category',
    label: 'Category',
    group: 'Vehicle Identity',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The category related to the vehicle.'
  },
  {
    id: 'f-14',
    key: 'hub',
    label: 'Hub',
    group: 'Business Relationships',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The hub selected for allocation.'
  },
  {
    id: 'f-15',
    key: 'client',
    label: 'Client',
    group: 'Business Relationships',
    control: 'multi-select',
    isBasicDefault: true,
    note: 'A route/allocation business relationship; separate from owning Company.'
  },
  {
    id: 'f-17',
    key: 'transporter',
    label: 'Transporter',
    group: 'Business Relationships',
    control: 'multi-select',
    isBasicDefault: true,
    note: 'Retain FleetRobo Transporter distinct from Vendor.'
  },
  {
    id: 'f-18',
    key: 'vendor',
    label: 'Vendor',
    group: 'Business Relationships',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'Separate service/vendor relationship.'
  },
  {
    id: 'f-19',
    key: 'driver',
    label: 'Assigned Driver',
    group: 'Resource Relationships',
    control: 'multi-select',
    isBasicDefault: true,
    note: 'The driver currently assigned from Driver Master.'
  },
  {
    id: 'f-20',
    key: 'fleets',
    label: 'Fleet / Group',
    group: 'Resource Relationships',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The fleet memberships linked to this vehicle.'
  },
  {
    id: 'f-21',
    key: 'trailers',
    label: 'Attached Trailers',
    group: 'Resource Relationships',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The currently coupled trailers shown from active connections.'
  },
  {
    id: 'f-22',
    key: 'measurement_system',
    label: 'System of Measurement',
    group: 'Measurement & Odometer',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The selected system used for vehicle measurements.'
  },
  {
    id: 'f-23',
    key: 'fuel_volume_unit',
    label: 'Fuel Volume Unit',
    group: 'Measurement & Odometer',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The selected unit for fuel volume.'
  },
  {
    id: 'f-24',
    key: 'odometer_unit',
    label: 'Odometer Unit',
    group: 'Measurement & Odometer',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The unit used for odometer readings.'
  },
  {
    id: 'f-25',
    key: 'body_type',
    label: 'Body Type',
    group: 'Body & Usage',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The selected vehicle body classification.'
  },
  {
    id: 'f-26',
    key: 'body_sub_type',
    label: 'Body Subtype',
    group: 'Body & Usage',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The specific vehicle body classification.'
  },
  {
    id: 'f-27',
    key: 'usage_type',
    label: 'Usage Type',
    group: 'Body & Usage',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The intended operating use of the vehicle.'
  },
  {
    id: 'f-28',
    key: 'ownership_type',
    label: 'Ownership Type',
    group: 'Body & Usage',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The ownership or leasing classification.'
  },
  {
    id: 'f-29',
    key: 'fuel_type',
    label: 'Fuel Type',
    group: 'Body & Usage',
    control: 'multi-select',
    isBasicDefault: true,
    note: 'The fuel or energy type used by the vehicle.'
  },
  {
    id: 'f-30',
    key: 'transmission',
    label: 'Transmission',
    group: 'Body & Usage',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The vehicle transmission classification.'
  },
  {
    id: 'f-31',
    key: 'emission_standard',
    label: 'Emission Standard',
    group: 'Regulatory & Compliance',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The applicable engine emissions standard.'
  },
  {
    id: 'f-32',
    key: 'dpf_equipped',
    label: 'DPF Equipped',
    group: 'Regulatory & Compliance',
    control: 'yes-no',
    isBasicDefault: false,
    note: 'Indicates whether a diesel particulate filter is fitted.'
  },
  {
    id: 'f-33',
    key: 'scr_equipped',
    label: 'SCR Equipped',
    group: 'Regulatory & Compliance',
    control: 'yes-no',
    isBasicDefault: false,
    note: 'Indicates whether selective catalytic reduction is fitted.'
  },
  {
    id: 'f-34',
    key: 'currency',
    label: 'Currency',
    group: 'Financial Values',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The currency used for monetary vehicle values.'
  },
  {
    id: 'f-35',
    key: 'purchased_at',
    label: 'Purchase Date',
    group: 'Lifecycle & Service Life',
    control: 'date-range',
    isBasicDefault: false,
    note: 'The recorded purchase date.'
  },
  {
    id: 'f-36',
    key: 'lease_expires_at',
    label: 'Lease Expiry Date',
    group: 'Lifecycle & Service Life',
    control: 'date-range',
    isBasicDefault: false,
    note: 'The recorded lease expiry date.'
  },
  {
    id: 'f-37',
    key: 'warranty',
    label: 'Warranty',
    group: 'Lifecycle & Service Life',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The warranty related to the vehicle.'
  },
  {
    id: 'f-38',
    key: 'loan_first_payment',
    label: 'First Payment Date',
    group: 'Financing (Loan)',
    control: 'date-range',
    isBasicDefault: false,
    note: 'The date of the first loan payment.'
  },
  {
    id: 'f-39',
    key: 'financing_status',
    label: 'Financing Status',
    group: 'Financing (Loan)',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'Public API / financing record status.'
  },
  {
    id: 'f-40',
    key: 'route',
    label: 'Route',
    group: 'Route Mapping',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'Repeatable route relationship.'
  },
  {
    id: 'f-41',
    key: 'route_type',
    label: 'Route Type',
    group: 'Route Mapping',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'Route classification distinct from vehicle class.'
  },
  {
    id: 'f-42',
    key: 'overspeed_rule_enabled',
    label: 'Overspeed Rule Enabled',
    group: 'Route Mapping',
    control: 'yes-no',
    isBasicDefault: false,
    note: 'The flag enabling the route-level overspeed limit rule.'
  },
  {
    id: 'f-43',
    key: 'allocation_date',
    label: 'Allocation Date',
    group: 'Client Allocation',
    control: 'date-range',
    isBasicDefault: false,
    note: 'The date for which the vehicle is allocated.'
  },
  {
    id: 'f-44',
    key: 'shared_company',
    label: 'Shared Company',
    group: 'Shared Access',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'Recipient organisation granted vehicle access.'
  },
  {
    id: 'f-45',
    key: 'is_shared',
    label: 'Shared Vehicle Status',
    group: 'Shared Access',
    control: 'yes-no',
    isBasicDefault: false,
    note: 'Sharing flag is relationship state, not vehicle operational status.'
  },
  {
    id: 'f-46',
    key: 'fitness_due_date',
    label: 'Fitness Due Date',
    group: 'Fitness Compliance',
    control: 'date-range',
    isBasicDefault: false,
    note: 'Fitness certificate compliance due date.'
  },
  {
    id: 'f-47',
    key: 'permit_due_date',
    label: 'Permit Due Date',
    group: 'Permit Compliance',
    control: 'date-range',
    isBasicDefault: false,
    note: 'Road permit compliance due date.'
  },
  {
    id: 'f-48',
    key: 'state_tax_due_date',
    label: 'State Tax Due Date',
    group: 'State Tax Compliance',
    control: 'date-range',
    isBasicDefault: false,
    note: 'State road tax compliance due date.'
  },
  {
    id: 'f-49',
    key: 'insurance_due_date',
    label: 'Insurance Due Date',
    group: 'Insurance Compliance',
    control: 'date-range',
    isBasicDefault: false,
    note: 'Vehicle insurance compliance due date.'
  },
  {
    id: 'f-50',
    key: 'pollution_due_date',
    label: 'Pollution Due Date',
    group: 'Pollution Compliance',
    control: 'date-range',
    isBasicDefault: false,
    note: 'Pollution under control (PUC) due date.'
  },
  {
    id: 'f-51',
    key: 'breakdown_date_time',
    label: 'Breakdown Date & Time',
    group: 'Breakdown',
    control: 'date-range',
    isBasicDefault: false,
    note: 'Recorded breakdown incident datetime.'
  },
  {
    id: 'f-52',
    key: 'alert_type',
    label: 'Alert Type',
    group: 'Alert Preferences',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'Configured vehicle alert triggers (e.g. Overspeed, Panic).'
  },
  {
    id: 'f-53',
    key: 'petrocard_child_id',
    label: 'Child ID',
    group: 'Petro-Card Settings',
    control: 'search-dropdown',
    isBasicDefault: false,
    note: 'Petro-card child reference identifier.'
  },
  {
    id: 'f-54',
    key: 'petrocard_created_at',
    label: 'Created Date',
    group: 'Petro-Card Settings',
    control: 'date-range',
    isBasicDefault: false,
    note: 'Created timestamp for petro-card configuration.'
  },
  {
    id: 'f-55',
    key: 'online',
    label: 'Online Status',
    group: 'Location & History',
    control: 'yes-no',
    isBasicDefault: true,
    note: 'Observed telematics connectivity state (Online / Offline).'
  },
  {
    id: 'f-56',
    key: 'public_id',
    label: 'Vehicle ID',
    group: 'System & Audit',
    control: 'search-dropdown',
    isBasicDefault: false,
    note: 'The generated public vehicle identifier (VH-xxxxxx).'
  },
  {
    id: 'f-57',
    key: 'created_at',
    label: 'Created At',
    group: 'System & Audit',
    control: 'date-range',
    isBasicDefault: false,
    note: 'The vehicle record creation timestamp.'
  },
  {
    id: 'f-58',
    key: 'updated_at',
    label: 'Updated At',
    group: 'System & Audit',
    control: 'date-range',
    isBasicDefault: false,
    note: 'The vehicle record last-update timestamp.'
  },
  {
    id: 'f-59',
    key: 'has_trailer',
    label: 'Has Trailer',
    group: 'Listing Filter-Only',
    control: 'yes-no',
    isBasicDefault: false,
    note: 'Presence condition for currently attached trailers.'
  },
  {
    id: 'f-60',
    key: 'has_driver',
    label: 'Has Driver',
    group: 'Listing Filter-Only',
    control: 'yes-no',
    isBasicDefault: false,
    note: 'Presence condition for an assigned driver.'
  },
  {
    id: 'f-61',
    key: 'type',
    label: 'Vehicle Type',
    group: 'Vehicle Identity',
    control: 'multi-select',
    isBasicDefault: false,
    note: 'The vehicle type classification (e.g. Truck, Bus, LCV).'
  }
];

import {
  Vehicle,
  DEMO_LOOKUPS,
  getVehicleOwningCompany,
  normalizeRegistrationNumber
} from './vehicle';
import { getCanonicalTransporterNames } from '../data/vendorsSeed';

export interface RangeFilterValue {
  from?: string;
  to?: string;
  includeMissing?: boolean;
}

const FILTER_DEF_MAP = new Map<string, FilterDefinition>(
  ALL_61_FILTERS.map((d) => [d.key, d])
);

export function getFilterDefinition(key: string): FilterDefinition | undefined {
  return FILTER_DEF_MAP.get(key);
}

export function isRangeFilterActive(val: unknown): boolean {
  if (!val || typeof val !== 'object') return false;
  const r = val as RangeFilterValue;
  return Boolean(
    (r.from !== undefined && String(r.from).trim() !== '') ||
      (r.to !== undefined && String(r.to).trim() !== '') ||
      r.includeMissing
  );
}

export function sanitizeVehicleFilters(raw: Record<string, any> | undefined | null): Record<string, any> {
  if (!raw || typeof raw !== 'object') return {};
  const cleaned: Record<string, any> = {};
  Object.entries(raw).forEach(([key, val]) => {
    if (val === undefined || val === null) return;
    if (typeof val === 'boolean') {
      cleaned[key] = val;
      return;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed) cleaned[key] = trimmed;
      return;
    }
    if (Array.isArray(val)) {
      const items = val.map((x) => String(x).trim()).filter(Boolean);
      if (items.length > 0) cleaned[key] = Array.from(new Set(items));
      return;
    }
    if (typeof val === 'object') {
      const r = val as RangeFilterValue;
      const from = r.from !== undefined ? String(r.from).trim() : '';
      const to = r.to !== undefined ? String(r.to).trim() : '';
      const includeMissing = Boolean(r.includeMissing);
      if (from || to || includeMissing) {
        cleaned[key] = {
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(includeMissing ? { includeMissing: true } : {})
        };
      }
    }
  });
  return cleaned;
}

export function countActiveVehicleFilters(raw: Record<string, any> | undefined | null): number {
  return Object.keys(sanitizeVehicleFilters(raw)).length;
}

function parseDateFilterTimestamp(raw: string, bound: 'start' | 'end' | 'value'): number | null {
  const s = (raw || '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const suffix =
      bound === 'start'
        ? 'T00:00:00.000'
        : bound === 'end'
        ? 'T23:59:59.999'
        : 'T12:00:00.000';
    const ms = Date.parse(`${s}${suffix}`);
    return Number.isNaN(ms) ? null : ms;
  }
  const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s) ? s.replace(' ', 'T') : s;
  const ms = Date.parse(normalized);
  return Number.isNaN(ms) ? null : ms;
}

export function validateFilterRange(
  def: FilterDefinition,
  value: RangeFilterValue | undefined
): string | null {
  if (!value) return null;
  const fromStr = (value.from ?? '').toString().trim();
  const toStr = (value.to ?? '').toString().trim();
  if (!fromStr || !toStr) return null;

  if (def.control === 'date-range') {
    const fromMs = parseDateFilterTimestamp(fromStr, 'start');
    const toMs = parseDateFilterTimestamp(toStr, 'end');
    if (fromMs === null || toMs === null) {
      return 'Enter valid From and To dates';
    }
    if (fromMs > toMs) {
      return 'From date cannot be after To date';
    }
    return null;
  }

  if (def.control === 'numeric-range') {
    const fromNum = Number(fromStr);
    const toNum = Number(toStr);
    if (Number.isNaN(fromNum) || Number.isNaN(toNum)) {
      return 'Enter valid numeric From and To values';
    }
    if (fromNum > toNum) {
      return 'From value cannot exceed To value';
    }
  }
  return null;
}

export function getVehicleFilterValues(veh: Vehicle, key: string): string[] {
  switch (key) {
    case 'company': {
      const owner = getVehicleOwningCompany(veh);
      return owner ? [owner] : [];
    }
    case 'vin':
      return Array.from(new Set([veh.vin, veh.chassis_number].filter((x): x is string => Boolean(x && x.trim()))));
    case 'model':
      return Array.from(
        new Set([veh.machine_model, veh.model].filter((x): x is string => Boolean(x && x.trim())))
      );
    case 'category': {
      const vals = [veh.category, veh.vehicle_segment, veh.class].filter(
        (x): x is string => Boolean(x && String(x).trim())
      );
      return Array.from(new Set(vals));
    }
    case 'fleets':
      return (veh.fleets || []).filter(Boolean);
    case 'trailers':
      return (veh.trailers || []).filter(Boolean);
    case 'route':
      return Array.from(new Set((veh.routes || []).map((r) => r.route).filter(Boolean)));
    case 'route_type':
      return Array.from(
        new Set([
          ...(veh.routes || []).map((r) => r.route_type),
          ...(veh.allocations || []).map((a) => a.route_type),
          ...(veh.outbound || []).map((o) => o.route_type || '')
        ].filter(Boolean))
      );
    case 'allocation_date':
      return (veh.allocations || []).map((a) => a.allocation_date).filter(Boolean);
    case 'shared_company':
      return Array.from(
        new Set(
          (veh.sharing || [])
            .filter((s) => s.is_shared)
            .map((s) => s.shared_company)
            .filter(Boolean)
        )
      );
    case 'fitness_due_date':
      return veh.documents?.fitness?.due_date ? [veh.documents.fitness.due_date] : [];
    case 'permit_due_date':
      return veh.documents?.permit?.due_date ? [veh.documents.permit.due_date] : [];
    case 'state_tax_due_date':
      return veh.documents?.state_tax?.due_date ? [veh.documents.state_tax.due_date] : [];
    case 'insurance_due_date': {
      const d = veh.documents?.insurance?.due_date || veh.insurance_to;
      return d ? [d] : [];
    }
    case 'pollution_due_date':
      return veh.documents?.pollution?.due_date ? [veh.documents.pollution.due_date] : [];
    case 'breakdown_date_time':
      return (veh.breakdowns || []).map((b) => b.breakdown_date_time).filter(Boolean);
    case 'alert_type':
      return Array.from(new Set((veh.alerts || []).map((a) => a.alert_type).filter(Boolean)));
    case 'petrocard_child_id':
      return veh.petro?.child_id ? [veh.petro.child_id] : [];
    case 'petrocard_created_at':
      return veh.petro?.created_at ? [veh.petro.created_at] : [];
    case 'purchased_at': {
      const p = veh.purchased_at || veh.purchase_date;
      return p ? [p] : [];
    }
    default: {
      const raw = (veh as any)[key];
      if (raw === undefined || raw === null) return [];
      if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
      const str = String(raw).trim();
      return str ? [str] : [];
    }
  }
}

export function getVehicleBooleanFilterState(veh: Vehicle, key: string): boolean {
  switch (key) {
    case 'dpf_equipped':
      return Boolean(veh.dpf_equipped);
    case 'scr_equipped':
      return Boolean(veh.scr_equipped);
    case 'overspeed_rule_enabled':
      return Boolean(veh.routes?.some((r) => r.overspeed_rule_enabled));
    case 'is_shared':
      return Boolean(veh.sharing?.some((s) => s.is_shared));
    case 'online':
      return Boolean(veh.online);
    case 'has_trailer':
      return Boolean(veh.trailers && veh.trailers.length > 0);
    case 'has_driver':
      return Boolean(veh.driver && veh.driver.trim().length > 0);
    default:
      return Boolean((veh as any)[key]);
  }
}

export function matchesVehicleFilter(veh: Vehicle, key: string, target: any): boolean {
  const def = FILTER_DEF_MAP.get(key);
  if (target === undefined || target === null || target === '') return true;

  if (def?.control === 'yes-no' || typeof target === 'boolean') {
    return getVehicleBooleanFilterState(veh, key) === Boolean(target);
  }

  if (def?.control === 'date-range') {
    const range = target as RangeFilterValue;
    const fromStr = (range.from ?? '').trim();
    const toStr = (range.to ?? '').trim();
    const includeMissing = Boolean(range.includeMissing);
    if (!fromStr && !toStr && !includeMissing) return true;

    const rawDates = getVehicleFilterValues(veh, key);
    const parsedDates = rawDates
      .map((d) => parseDateFilterTimestamp(d, 'value'))
      .filter((ms): ms is number => ms !== null);

    if (parsedDates.length === 0) {
      return includeMissing;
    }

    const fromMs = fromStr ? parseDateFilterTimestamp(fromStr, 'start') : null;
    const toMs = toStr ? parseDateFilterTimestamp(toStr, 'end') : null;
    if (!fromStr && !toStr && includeMissing) {
      // Only includeMissing toggled without bounds -> return records missing date?
      // If neither bound is set and includeMissing is true, return true for records lacking dates OR all?
      // Most intuitive: when includeMissing is only constraint, show records missing that date; when bounds + includeMissing, show matching OR missing.
      return false;
    }
    return parsedDates.some((ms) => {
      if (fromMs !== null && ms < fromMs) return false;
      if (toMs !== null && ms > toMs) return false;
      return true;
    });
  }

  if (def?.control === 'numeric-range') {
    const range = target as RangeFilterValue;
    const fromStr = (range.from ?? '').toString().trim();
    const toStr = (range.to ?? '').toString().trim();
    const includeMissing = Boolean(range.includeMissing);
    if (!fromStr && !toStr && !includeMissing) return true;

    const rawVals = getVehicleFilterValues(veh, key);
    const numVal = rawVals.length > 0 ? Number(rawVals[0]) : NaN;
    if (rawVals.length === 0 || Number.isNaN(numVal)) {
      return includeMissing;
    }
    if (!fromStr && !toStr && includeMissing) {
      return false;
    }
    if (fromStr && numVal < Number(fromStr)) return false;
    if (toStr && numVal > Number(toStr)) return false;
    return true;
  }

  if (Array.isArray(target)) {
    if (target.length === 0) return true;
    const targetLower = new Set(target.map((t) => String(t).trim().toLowerCase()));
    const values = getVehicleFilterValues(veh, key);
    return values.some((v) => targetLower.has(v.trim().toLowerCase()));
  }

  if (typeof target === 'string') {
    const needle = target.trim().toLowerCase();
    if (!needle) return true;
    const values = getVehicleFilterValues(veh, key);
    if (key === 'registration_number') {
      const normalizedNeedle = normalizeRegistrationNumber(target).toLowerCase();
      return values.some(
        (v) =>
          v.toLowerCase().includes(needle) ||
          (normalizedNeedle.length > 0 &&
            normalizeRegistrationNumber(v).toLowerCase().includes(normalizedNeedle))
      );
    }
    return values.some((v) => v.toLowerCase().includes(needle));
  }

  return true;
}

export function evaluateVehicleFilters(
  veh: Vehicle,
  filters: Record<string, any>,
  mode: 'basic' | 'advanced'
): boolean {
  const cleaned = sanitizeVehicleFilters(filters);
  const keys = Object.keys(cleaned);
  if (keys.length === 0) return true;
  if (mode === 'basic') {
    return keys.every((k) => matchesVehicleFilter(veh, k, cleaned[k]));
  }
  return keys.some((k) => matchesVehicleFilter(veh, k, cleaned[k]));
}

export function getOptionsForVehicleFilter(
  key: string,
  scopedVehicles: Vehicle[],
  companyContext?: string,
  historicalSelected?: unknown
): string[] {
  const datasetValues = Array.from(
    new Set(scopedVehicles.flatMap((v) => getVehicleFilterValues(v, key)).filter(Boolean))
  );
  const historical = Array.isArray(historicalSelected)
    ? historicalSelected.map((x) => String(x).trim()).filter(Boolean)
    : [];

  const mergeWithHistorical = (primary: string[]): string[] => {
    const merged = Array.from(new Set([...primary, ...historical].filter(Boolean)));
    return merged.sort((a, b) => a.localeCompare(b));
  };

  switch (key) {
    case 'company': {
      if (
        companyContext &&
        companyContext !== 'All Clients' &&
        companyContext !== 'Platform Admin' &&
        companyContext !== 'Binary'
      ) {
        return mergeWithHistorical([companyContext]);
      }
      return mergeWithHistorical(
        datasetValues.length > 0 ? datasetValues : DEMO_LOOKUPS.companies
      );
    }
    case 'status':
      return Array.from(new Set([...DEMO_LOOKUPS.operationalStatuses, ...historical]));
    case 'transporter': {
      const canonical = getCanonicalTransporterNames(companyContext, []);
      return mergeWithHistorical(
        canonical.length > 0 ? [...canonical, ...datasetValues] : datasetValues
      );
    }
    case 'fuel_type':
      return mergeWithHistorical([...DEMO_LOOKUPS.fuelTypes, ...datasetValues]);
    case 'type':
      return mergeWithHistorical([...DEMO_LOOKUPS.vehicleTypes, ...datasetValues]);
    case 'measurement_system':
      return mergeWithHistorical(
        datasetValues.length > 0 ? datasetValues : DEMO_LOOKUPS.measurementSystems
      );
    case 'odometer_unit':
      return mergeWithHistorical(
        datasetValues.length > 0 ? datasetValues : DEMO_LOOKUPS.odometerUnits
      );
    case 'fuel_volume_unit':
      return mergeWithHistorical(datasetValues.length > 0 ? datasetValues : ['L', 'gal']);
    // Dataset-derived / canonical relationship & spec fields (never fake 'Option 1/2/3')
    case 'vendor':
    case 'driver':
    case 'fleets':
    case 'trailers':
    case 'hub':
    case 'client':
    case 'category':
    case 'class':
    case 'make':
    case 'model':
    case 'route':
    case 'route_type':
    case 'alert_type':
    case 'shared_company':
    case 'body_type':
    case 'body_sub_type':
    case 'usage_type':
    case 'ownership_type':
    case 'transmission':
    case 'emission_standard':
    case 'currency':
    case 'warranty':
    case 'financing_status':
      return mergeWithHistorical(datasetValues);
    default:
      return mergeWithHistorical(datasetValues);
  }
}

export function formatVehicleFilterChip(key: string, val: any): string {
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.join(', ');
  if (val && typeof val === 'object') {
    const r = val as RangeFilterValue;
    const parts: string[] = [];
    if (r.from || r.to) {
      parts.push(`${r.from || '...'} – ${r.to || '...'}`);
    }
    if (r.includeMissing) {
      parts.push('incl. missing');
    }
    return parts.join(' · ') || 'Configured';
  }
  return String(val);
}
