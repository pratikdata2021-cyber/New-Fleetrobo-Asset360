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
