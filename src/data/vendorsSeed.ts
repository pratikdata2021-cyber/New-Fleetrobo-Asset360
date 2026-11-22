export type VendorStatusKey =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'blacklisted'
  | 'connected'
  | 'syncing'
  | 'integration_error'
  | 'under_review'
  | 'preferred'
  | 'prequalified'
  | 'terminated';

export type VendorTypeKey =
  | 'vendor'
  | 'integrated_vendor'
  | 'transporter'
  | 'fuel_supplier'
  | 'maintenance_provider'
  | 'parts_supplier'
  | 'tech_provider'
  | 'logistics_partner'
  | 'insurance_provider'
  | 'towing_service'
  | 'leasing_company'
  | 'driver_staffing'
  | 'customs_broker'
  | 'telematics_provider'
  | 'freight_forwarder'
  | 'compliance_audit'
  | 'wash_detailing'
  | 'tire_service'
  | 'body_paint'
  | 'yard_storage'
  | 'charging_network';

export type VendorCountry =
  | 'India'
  | 'Malaysia'
  | 'United Arab Emirates'
  | 'Singapore'
  | 'United Kingdom'
  | 'United States';

export type AccountRole =
  | 'Vendor Admin'
  | 'Vendor Member'
  | 'Company Admin'
  | 'Fleet Operator'
  | 'Viewer';

export type PersonnelRole = 'Admin' | 'Member';

export interface PlaceRecord {
  id: string;
  name: string;
  address: string;
  country: VendorCountry;
}

export interface VendorUserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: VendorCountry;
  role: AccountRole;
  avatarDataUrl?: string;
  policies: string[];
  permissions: string[];
}

export interface ContactRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface VendorPersonnelMembership {
  contact_id: string;
  role: PersonnelRole;
  status: 'active';
  login_requested: boolean;
  added_at: string;
}

export interface VendorIntegrationConfig {
  provider_id: 'demo_telematics' | 'demo_carrier';
  provider_label: string;
  configured: boolean;
  credential_keys: string[]; // Names only, NEVER secret values
  options: Record<string, string>;
  host: string;
  namespace: string;
  webhook_url: string;
  sandbox: boolean;
}

export interface TransporterRegisteredAddress {
  pincode: string;
  country: VendorCountry;
  state: string;
  city: string;
  address: string;
  latitude?: string;
  longitude?: string;
}

export interface TransporterBillingDetails {
  address: string;
  pincode: string;
  country: VendorCountry;
  state: string;
  city: string;
}

export interface TransporterAdditionalContacts {
  company_phone?: string;
  contact_person?: string;
  contact_no?: string;
  alt_contact_no?: string;
  contact_email?: string;
  mobile_no?: string;
  alt_email?: string;
}

export interface TransporterTaxLegalInfo {
  pan_no?: string;
  gst_no?: string;
  cin_no?: string;
}

export interface VendorRecord {
  id: string;
  public_id: string;
  internal_id: string;
  business_id: string;
  name: string;
  type: VendorTypeKey;
  status: VendorStatusKey;
  email: string;
  phone: string;
  website_url: string;
  country: VendorCountry;
  place_id: string;
  user_account_id: string | null;
  personnel: VendorPersonnelMembership[];
  integration: VendorIntegrationConfig | null;
  company: string;
  created_at: string;
  updated_at: string;
  // Transporter / Logistics Provider additive fields (Sections A-F)
  transporter_code?: string;
  company_name?: string;
  client_name?: string;
  is_active?: boolean;
  logo_data_url?: string;
  registered_address?: TransporterRegisteredAddress;
  billing_same_as_registered?: boolean;
  billing_details?: TransporterBillingDetails;
  contacts_extra?: TransporterAdditionalContacts;
  tax_legal?: TransporterTaxLegalInfo;
  is_contract_signed?: boolean;
}

export interface VendorSavedView {
  name: string;
  visible: string[];
  filters: Record<string, any>;
  filterMode: 'ALL' | 'ANY';
  sortKey: string;
  sortDir: 1 | -1;
  layout: 'table' | 'grid';
}

export interface VendorColumnDef {
  key: string;
  label: string;
  filterType: 'text' | 'multi' | 'date';
  defaultVisible: boolean;
  group: 'Vendor identity' | 'Contact' | 'Address' | 'Audit' | 'Operations' | 'User Accounts';
  width: number;
  meaning: string;
  filterHelp: string;
}

export const VENDOR_COUNTRIES: VendorCountry[] = [
  'India',
  'Malaysia',
  'United Arab Emirates',
  'Singapore',
  'United Kingdom',
  'United States',
];

export const COUNTRY_STATE_CITY_MAP: Record<VendorCountry, Record<string, string[]>> = {
  India: {
    Gujarat: ['Mundra', 'Gandhidham', 'Ahmedabad', 'Surat', 'Vadodara', 'Hazira', 'Rajkot'],
    Maharashtra: ['Mumbai', 'Navi Mumbai', 'Pune', 'Thane', 'Nagpur', 'Nashik'],
    Delhi: ['New Delhi', 'Delhi NCR'],
    Haryana: ['Gurugram', 'Faridabad', 'Panipat', 'Manesar'],
    Karnataka: ['Bengaluru', 'Mangaluru', 'Mysuru', 'Hubballi'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Thoothukudi', 'Ennore'],
    'Uttar Pradesh': ['Noida', 'Greater Noida', 'Lucknow', 'Kanpur', 'Ghaziabad'],
    'West Bengal': ['Kolkata', 'Haldia', 'Durgapur'],
    Rajasthan: ['Jaipur', 'Udaipur', 'Jodhpur', 'Kota'],
    Telangana: ['Hyderabad', 'Warangal'],
  },
  Malaysia: {
    Selangor: ['Port Klang', 'Shah Alam', 'Petaling Jaya', 'Subang Jaya'],
    'Kuala Lumpur': ['Kuala Lumpur'],
    Johor: ['Johor Bahru', 'Pasir Gudang', 'Tanjung Pelepas'],
    Penang: ['George Town', 'Butterworth'],
  },
  'United Arab Emirates': {
    Dubai: ['Dubai', 'Jebel Ali', 'Al Quoz'],
    'Abu Dhabi': ['Abu Dhabi', 'Khalifa Port', 'Mussafah'],
    Sharjah: ['Sharjah', 'Hamriyah'],
  },
  Singapore: {
    'Central Region': ['Singapore', 'Marina South'],
    'West Region': ['Jurong', 'Tuas Port'],
    'East Region': ['Changi', 'Tampines'],
  },
  'United Kingdom': {
    'Greater London': ['London', 'Barking', 'Heathrow'],
    'West Midlands': ['Birmingham', 'Coventry'],
    Essex: ['Tilbury', 'Felixstowe', 'Southampton'],
  },
  'United States': {
    California: ['Los Angeles', 'Long Beach', 'Oakland', 'San Francisco'],
    Texas: ['Houston', 'Dallas', 'Austin'],
    'New Jersey': ['Newark', 'Elizabeth'],
    Illinois: ['Chicago', 'Aurora'],
  },
};

export function getStatesForCountry(country: VendorCountry | string): string[] {
  const statesObj = COUNTRY_STATE_CITY_MAP[country as VendorCountry];
  return statesObj ? Object.keys(statesObj) : [];
}

export function getCitiesForState(country: VendorCountry | string, state: string): string[] {
  const statesObj = COUNTRY_STATE_CITY_MAP[country as VendorCountry];
  if (!statesObj || !state) return [];
  return statesObj[state] || [];
}

export const VENDOR_ACCOUNT_ROLES: AccountRole[] = [
  'Vendor Admin',
  'Vendor Member',
  'Company Admin',
  'Fleet Operator',
  'Viewer',
];

export const VENDOR_STATUS_CATALOG: Array<{
  key: VendorStatusKey;
  label: string;
  tone: 'green' | 'neutral' | 'red' | 'amber';
}> = [
  { key: 'active', label: 'Active', tone: 'green' },
  { key: 'inactive', label: 'Inactive', tone: 'neutral' },
  { key: 'suspended', label: 'Suspended', tone: 'red' },
  { key: 'blacklisted', label: 'Blacklisted', tone: 'red' },
  { key: 'connected', label: 'Connected', tone: 'green' },
  { key: 'syncing', label: 'Syncing', tone: 'amber' },
  { key: 'integration_error', label: 'Integration Error', tone: 'red' },
  { key: 'under_review', label: 'Under Review', tone: 'amber' },
  { key: 'preferred', label: 'Preferred', tone: 'green' },
  { key: 'prequalified', label: 'Prequalified', tone: 'green' },
  { key: 'terminated', label: 'Terminated', tone: 'red' },
];

export const VENDOR_TYPE_CATALOG: Array<{
  key: VendorTypeKey;
  label: string;
  standardSelectable: boolean;
}> = [
  { key: 'vendor', label: 'Vendor', standardSelectable: true },
  { key: 'transporter', label: 'Transporter / Logistics Provider', standardSelectable: true },
  { key: 'integrated_vendor', label: 'Integrated Vendor', standardSelectable: false },
  { key: 'fuel_supplier', label: 'Fuel Supplier', standardSelectable: true },
  { key: 'maintenance_provider', label: 'Maintenance Provider', standardSelectable: true },
  { key: 'parts_supplier', label: 'Parts Supplier', standardSelectable: true },
  { key: 'tech_provider', label: 'Technology Provider', standardSelectable: true },
  { key: 'logistics_partner', label: 'Logistics Partner', standardSelectable: true },
  { key: 'insurance_provider', label: 'Insurance Provider', standardSelectable: true },
  { key: 'towing_service', label: 'Towing Service', standardSelectable: true },
  { key: 'leasing_company', label: 'Leasing Company', standardSelectable: true },
  { key: 'driver_staffing', label: 'Driver Staffing Agency', standardSelectable: true },
  { key: 'customs_broker', label: 'Customs Broker', standardSelectable: true },
  { key: 'telematics_provider', label: 'Telematics Provider', standardSelectable: true },
  { key: 'freight_forwarder', label: 'Freight Forwarder', standardSelectable: true },
  { key: 'compliance_audit', label: 'Compliance / Audit', standardSelectable: true },
  { key: 'wash_detailing', label: 'Wash & Detailing', standardSelectable: true },
  { key: 'tire_service', label: 'Tyre / Tire Service', standardSelectable: true },
  { key: 'body_paint', label: 'Body & Paint Shop', standardSelectable: true },
  { key: 'yard_storage', label: 'Storage / Yard', standardSelectable: true },
  { key: 'charging_network', label: 'Charging Network', standardSelectable: true },
];

export const VENDOR_POLICY_CATALOG: string[] = [
  'Vendor Base Access',
  'Vendor Administration',
  'Fleet Operations',
  'Driver Compliance',
  'Safety Monitoring',
  'Transporter Administration',
  'Integration Management',
  'Read Only',
];

export const VENDOR_PERMISSION_CATALOG: Array<{ key: string; label: string }> = [
  { key: 'vendors.view', label: 'View vendor profiles' },
  { key: 'vendors.create', label: 'Create vendor records' },
  { key: 'vendors.edit', label: 'Modify vendor information' },
  { key: 'vendors.delete', label: 'Delete eligible vendor records' },
  { key: 'vendors.personnel.view', label: 'View vendor personnel' },
  { key: 'vendors.personnel.manage', label: 'Add and remove vendor personnel' },
  { key: 'vehicles.view', label: 'View assigned vehicle resources' },
  { key: 'fleets.view', label: 'View fleet hierarchy and membership' },
  { key: 'drivers.view', label: 'View driver records' },
  { key: 'compliance.view', label: 'View compliance information' },
  { key: 'integrations.view', label: 'View connected integrations' },
  { key: 'integrations.manage', label: 'Manage integrated provider configuration' },
  { key: 'reports.export', label: 'Export permitted reports' },
  { key: 'settings.view', label: 'View workspace settings' },
];

export const DEMO_INTEGRATED_PROVIDERS = [
  {
    id: 'demo_telematics' as const,
    name: 'Telematics API (Demo)',
    description: 'Demo telematics provider schema with API key & regional endpoint option. No real connection is made.',
    credentials: [
      { key: 'api_key', label: 'API Key', type: 'password' as const, placeholder: 'Enter illustrative API key...' },
    ],
    optionKey: 'region',
    optionLabel: 'Region',
    optionChoices: ['India', 'Southeast Asia', 'Global'],
    defaultOption: 'India',
  },
  {
    id: 'demo_carrier' as const,
    name: 'Carrier Network (Demo)',
    description: 'Demo carrier integration schema with Client ID, Client Secret & operating mode. No real connection is made.',
    credentials: [
      { key: 'client_id', label: 'Client ID', type: 'text' as const, placeholder: 'Enter illustrative client ID...' },
      { key: 'client_secret', label: 'Client Secret', type: 'password' as const, placeholder: 'Enter illustrative client secret...' },
    ],
    optionKey: 'mode',
    optionLabel: 'Operating mode',
    optionChoices: ['Test', 'Live'],
    defaultOption: 'Test',
  },
];

export const VENDOR_COLUMNS: VendorColumnDef[] = [
  {
    key: 'name',
    label: 'Vendor Name',
    filterType: 'text',
    defaultVisible: true,
    group: 'Vendor identity',
    width: 215,
    meaning: 'Vendor business name; clickable to view record.',
    filterHelp: 'Case-insensitive substring match against the Vendor business name.',
  },
  {
    key: 'public_id',
    label: 'Public ID',
    filterType: 'text',
    defaultVisible: true,
    group: 'Vendor identity',
    width: 135,
    meaning: 'Auto-generated VND-####; copyable.',
    filterHelp: 'Case-insensitive substring match on the generated VND-#### public identifier.',
  },
  {
    key: 'internal_id',
    label: 'Internal ID',
    filterType: 'text',
    defaultVisible: true,
    group: 'Vendor identity',
    width: 135,
    meaning: 'Auto-generated VENDOR-####; copyable.',
    filterHelp: 'Case-insensitive substring match on the system VENDOR-#### internal identifier.',
  },
  {
    key: 'email',
    label: 'Email',
    filterType: 'text',
    defaultVisible: false,
    group: 'Contact',
    width: 215,
    meaning: 'Business contact email, not platform account email.',
    filterHelp: 'Case-insensitive substring match on the vendor business contact email.',
  },
  {
    key: 'website_url',
    label: 'Website URL',
    filterType: 'text',
    defaultVisible: false,
    group: 'Contact',
    width: 205,
    meaning: 'Business web URL; form validation.',
    filterHelp: 'Case-insensitive substring match on the vendor business website URL.',
  },
  {
    key: 'phone',
    label: 'Phone',
    filterType: 'text',
    defaultVisible: false,
    group: 'Contact',
    width: 160,
    meaning: 'Business contact phone, not User Account phone.',
    filterHelp: 'Substring match on the vendor business telephone number.',
  },
  {
    key: 'place_id',
    label: 'Address / Place',
    filterType: 'text',
    defaultVisible: true,
    group: 'Address',
    width: 215,
    meaning: 'Display linked Place name and address tooltip; store Place ID.',
    filterHelp: 'Case-insensitive substring match against the linked Place name or full address.',
  },
  {
    key: 'type',
    label: 'Vendor Type',
    filterType: 'multi',
    defaultVisible: true,
    group: 'Vendor identity',
    width: 215,
    meaning: 'Human label from Vendor Type enumeration including Transporter / Logistics Provider.',
    filterHelp: 'Multi-select filter over Vendor Type labels (e.g. Transporter / Logistics Provider).',
  },
  {
    key: 'country',
    label: 'Country',
    filterType: 'multi',
    defaultVisible: false,
    group: 'Address',
    width: 155,
    meaning: 'Vendor country; not necessarily Place country.',
    filterHelp: 'Multi-select filter matching the Vendor business country (independent of Place and Account country).',
  },
  {
    key: 'created_at',
    label: 'Created At',
    filterType: 'date',
    defaultVisible: true,
    group: 'Audit',
    width: 145,
    meaning: 'System created timestamp, source en-IN display.',
    filterHelp: 'Inclusive YYYY-MM-DD date range filter over the Vendor creation date.',
  },
  {
    key: 'updated_at',
    label: 'Updated At',
    filterType: 'date',
    defaultVisible: false,
    group: 'Audit',
    width: 145,
    meaning: 'System modified timestamp, source en-IN display.',
    filterHelp: 'Inclusive YYYY-MM-DD date range filter over the Vendor last modified date.',
  },
  {
    key: 'status',
    label: 'Vendor Status',
    filterType: 'multi',
    defaultVisible: true,
    group: 'Operations',
    width: 160,
    meaning: '11-value operational status badge, not a connection check.',
    filterHelp: 'Multi-select filter across all 11 operational statuses. Acts as mandatory AND condition in Advanced mode.',
  },
  {
    key: 'account_status',
    label: 'Account Linkage',
    filterType: 'multi',
    defaultVisible: true,
    group: 'User Accounts',
    width: 145,
    meaning: 'Computed Linked / Not linked based on user_account_id.',
    filterHelp: 'Multi-select filter for Linked vs Not linked platform User Account status.',
  },
  {
    key: 'account_name',
    label: 'Account Name',
    filterType: 'text',
    defaultVisible: false,
    group: 'User Accounts',
    width: 170,
    meaning: 'Computed joined platform-user name.',
    filterHelp: 'Case-insensitive substring match on the linked platform User Account full name.',
  },
  {
    key: 'account_email',
    label: 'Account Email',
    filterType: 'text',
    defaultVisible: false,
    group: 'User Accounts',
    width: 200,
    meaning: 'Computed joined platform-user email.',
    filterHelp: 'Case-insensitive substring match on the linked platform User Account login email.',
  },
  {
    key: 'account_phone',
    label: 'Account Phone',
    filterType: 'text',
    defaultVisible: false,
    group: 'User Accounts',
    width: 155,
    meaning: 'Computed joined platform-user phone.',
    filterHelp: 'Substring match on the linked platform User Account phone number.',
  },
  {
    key: 'account_country',
    label: 'Account Country',
    filterType: 'multi',
    defaultVisible: false,
    group: 'User Accounts',
    width: 140,
    meaning: 'Computed joined platform-user country.',
    filterHelp: 'Multi-select filter on the linked platform User Account country (distinct from Vendor Country).',
  },
  {
    key: 'account_role',
    label: 'Account Role',
    filterType: 'multi',
    defaultVisible: false,
    group: 'User Accounts',
    width: 155,
    meaning: 'Computed joined platform-user role; not personnel role.',
    filterHelp: 'Multi-select filter across the 5 platform User Account roles (not Personnel Admin/Member roles).',
  },
];

export const DEFAULT_VISIBLE_VENDOR_COLUMNS = VENDOR_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);

export const VENDOR_TOOLTIPS: Record<string, string> = {
  // Identity
  vendor_name: 'Legal or operational name used to identify this Vendor business resource. Not the personal name on the platform User Account.',
  vendor_type: 'Service-provider category. Does not automatically register this Vendor as a transporter, customer, fleet owner or equipment provider in other modules.',
  vendor_status: 'Operational status of the vendor record. Labels such as Connected do not prove provider API connectivity.',
  standard_vendor: 'Use this branch for ordinary vendor identity, business contact fields, country, Place and Personnel.',
  integrated_provider: 'Choose a demo provider-specific configuration. Provider metadata and connectivity are illustrative; no real integration occurs.',
  public_id: 'Read-only public identifier generated by FleetRobo for this vendor, such as VND-1001.',
  internal_id: 'Read-only internal identifier generated by the system, separate from Public ID and Business ID.',
  business_id: 'Source schema/export field only; not currently editable in this Vendor create form.',
  // Contact
  email: 'Optional vendor business email. Do not confuse with the linked platform user email or a Personnel Contact email.',
  phone: 'Optional vendor business phone. It may differ from linked User Account and Personnel Contact numbers.',
  website_url: 'Optional vendor website. Enter a full http:// or https:// URL; it is not an API webhook.',
  // Address
  country: 'Country associated with Vendor business identity; it is stored separately from the linked Place country.',
  primary_place: 'Link an existing Place Master record for the vendor’s primary location; the Place remains an independent resource.',
  new_place: 'Create a reusable Place record with Place name, country and full address, then link it to the current Vendor.',
  edit_place: 'Modify the linked Place record. Other records referencing the same Place may see updated address information.',
  remove_link: 'Disconnect this Vendor from its Place without deleting the Place record.',
  place_name: 'Required human-readable name of a Place Master resource, e.g. Mundra Port Office.',
  place_address: 'Required street, locality, city, postal or descriptive address for the Place record.',
  // Accounts
  user_account_linkage: 'Optional reference to one platform User Account. Distinct from Vendor Personnel contacts and membership roles.',
  select_existing_user: 'Find a simulated platform account by name, email or phone. Accounts linked to another Vendor are unavailable.',
  create_new_user: 'Prepare a simulated platform User Account with name, email, phone, country and role; no invitation will be sent.',
  skip_user_account: 'Create the Vendor without a platform login. You may link an account when editing the record later.',
  account_name: 'Platform user’s full name; minimum two characters, separate from Vendor Name.',
  account_email: 'Required unique platform-login email; it cannot duplicate an existing account email.',
  account_phone: 'Required platform account phone; India uses 10 digits after optional +91; other countries use 7–15 digits.',
  account_country: 'Country used to validate this platform user’s phone; independent from Vendor and Place country.',
  account_role: 'Platform account role, not a Vendor Personnel Admin/Member membership role.',
  upload_image: 'Optional platform user avatar. JPG or PNG only, no more than 1 MB.',
  attached_policies: 'Available in source data but its editor is not visible in current active form. Requires a clearly marked optional UI enhancement.',
  selected_permissions: 'Available in source data but its editor is not visible in current active form; no real permission enforcement in demo.',
  // Personnel
  contact: 'Choose an existing Contact. A Contact can be associated with different Vendors through separate memberships.',
  create_contact: 'Add a new shared Contact master entry, then link it to this Vendor.',
  personnel_role: 'Admin or Member applies to the current Vendor↔Contact membership only.',
  login_account: 'Checkbox records intent to create a login; demo does not actually send invites or provision authentication.',
  remove_membership: 'Remove this Contact from this Vendor only. Do not delete the Contact or User Account.',
  // Integrated
  supported_provider: 'Two illustrative provider cards are available. They are not evidence of live production integration support.',
  api_key: 'Password-style demo credential input. Required on new demo telematics setup and never persisted.',
  client_id: 'Demo carrier client identifier. Required for new demo provider configuration; not persisted.',
  client_secret: 'Password-style demo credential. Not persisted, logged, exported or displayed on Edit.',
  region: 'Illustrative demo telematics setting: India, Southeast Asia or Global.',
  operating_mode: 'Illustrative carrier setting: Test or Live. This does not switch a real external integration.',
  host: 'Advanced optional provider host metadata; not a connection test and not used for a live API call.',
  namespace: 'Optional logical provider namespace; demo metadata only.',
  webhook_url: 'Optional provider callback URL metadata; demo does not register or invoke a real webhook.',
  sandbox_environment: 'Marks intended demo sandbox configuration; does not change a live external environment.',
  // Bulk
  bulk_actions: 'Only source-confirmed bulk action is deletion of eligible vendors with an explicit review and confirmation.',
  eligible: 'Selected Vendor has no linked Personnel membership in this demo; can be deleted locally.',
  skipped: 'Vendor has linked Personnel, or otherwise cannot be deleted under current source review rules.',
  // Filters
  basic_filters: 'All populated filter conditions must match in Basic mode.',
  advanced_filters: 'Any non-status condition may match; chosen Vendor Status remains a mandatory AND condition.',
  show_all_filters: 'Reveal every source filter, not only currently visible table columns and existing selections.',
  date_range: 'Inclusive YYYY-MM-DD From and To values; From cannot be later than To.',
  // Directory
  status_tabs: 'Five source tabs: All vendors, Active, Inactive, Suspended and Integrated (the last is vendor type).',
  saved_views: 'Save, apply or remove page-local column/filter/sort/layout snapshots; selection is not saved.',
  customize_columns: 'Control 18 supported directory columns. At least one must remain visible.',
  rows_per_page: 'Shows 10, 25 or 50 vendors at a time; selection can persist across pages.',
  // Import
  csv_source: 'CSV only in reference importer. Excel XLS/XLSX input is not supported.',
  column_matching: 'Match up to six source-supported fields; Name mapping is mandatory.',
  validation: 'Reject rows with blank Name, invalid email, duplicate file names or names already in Vendor Master.',
  eligible_rows: 'Only selected valid rows will be imported; invalid rows are disabled in preview.',
  // Export
  export_scope: 'Exports all tenant Vendor records or explicitly selected Vendor IDs, not the current search/filter view.',
  export_format: 'CSV or XLSX file containing exactly the 13 source export columns.',
  // Transporter A-F fields
  company_name: 'Organisation tenant context for this Vendor / Transporter record.',
  client_name: 'Client or business unit serviced by this transporter.',
  transporter_code: 'Optional legacy external Transporter Code reference. Does not overwrite generated VND-#### Public ID or VENDOR-#### Internal ID.',
  is_active: 'Marks whether this transporter is operationally active (syncs with Active / Inactive status).',
  transporter_logo: 'Optional carrier logo image (JPG, PNG, or SVG up to 2 MB).',
  reg_pincode: 'Postal / PIN code for the registered office address.',
  reg_state: 'Required state or province for the registered address (cascades from Country).',
  reg_city: 'City or town for the registered address (cascades from State).',
  reg_address: 'Required full registered street address.',
  reg_coordinates: 'Optional GPS coordinates (Latitude -90..90, Longitude -180..180).',
  billing_same: 'Copy Registered Address fields into Billing Details and keep them synchronized.',
  company_phone: 'Main corporate telephone number.',
  contact_person: 'Primary operational point of contact name.',
  contact_no: 'Required primary contact telephone number.',
  alt_contact_no: 'Optional secondary telephone number.',
  contact_email: 'Optional point-of-contact email address.',
  mobile_no: 'Required mobile number for dispatch alerts.',
  alt_email: 'Optional secondary escalation email address.',
  pan_no: 'Indian Permanent Account Number (e.g., AAACW1234F).',
  gst_no: '15-character Goods & Services Tax Identification Number.',
  cin_no: '21-character Corporate Identification Number.',
  is_contract_signed: 'Confirms whether the master transport service agreement is signed.',
};

export const INITIAL_DEMO_PLACES: PlaceRecord[] = [
  {
    id: 'plc-mundra',
    name: 'Mundra Port Office',
    address: 'Adani Mundra Port Special Economic Zone, Kutch, Gujarat 370421, India',
    country: 'India',
  },
  {
    id: 'plc-chennai',
    name: 'Chennai Terminal Depot',
    address: 'Ennore High Road, Tondiarpet, Chennai, Tamil Nadu 600081, India',
    country: 'India',
  },
  {
    id: 'plc-hazira',
    name: 'Hazira Operations Yard',
    address: 'Mora-Bhatlai Road, Hazira Industrial Area, Surat, Gujarat 394510, India',
    country: 'India',
  },
  {
    id: 'plc-gurugram',
    name: 'Gurugram Corporate Office',
    address: 'DLF Cyber City, Phase III, Sector 24, Gurugram, Haryana 122002, India',
    country: 'India',
  },
  {
    id: 'plc-pune',
    name: 'Pune Logistics Hub',
    address: 'Chakan MIDC Phase II, Taluka Khed, Pune, Maharashtra 410501, India',
    country: 'India',
  },
];

export const INITIAL_DEMO_ACCOUNTS: VendorUserAccount[] = [
  {
    id: 'ua-101',
    name: 'Vikramaditya Mehta',
    email: 'v.mehta@westernlogistics.in',
    phone: '9820112233',
    country: 'India',
    role: 'Vendor Admin',
    policies: ['Vendor Base Access', 'Vendor Administration', 'Fleet Operations'],
    permissions: ['vendors.view', 'vendors.edit', 'vendors.personnel.view', 'vendors.personnel.manage', 'vehicles.view'],
  },
  {
    id: 'ua-102',
    name: 'Suresh Nair',
    email: 'suresh.nair@bharatfuel.co.in',
    phone: '9845098450',
    country: 'India',
    role: 'Vendor Admin',
    policies: ['Vendor Base Access'],
    permissions: ['vendors.view', 'reports.export'],
  },
  {
    id: 'ua-103',
    name: 'Ananya Krishnan',
    email: 'ananya.k@apexmaint.in',
    phone: '9811223344',
    country: 'India',
    role: 'Fleet Operator',
    policies: ['Vendor Base Access', 'Safety Monitoring'],
    permissions: ['vendors.view', 'vehicles.view', 'compliance.view'],
  },
  {
    id: 'ua-104',
    name: 'Farhan Al-Mansoor',
    email: 'farhan@gulfmaritime.ae',
    phone: '501234567',
    country: 'United Arab Emirates',
    role: 'Vendor Member',
    policies: ['Vendor Base Access', 'Read Only'],
    permissions: ['vendors.view', 'fleets.view'],
  },
  {
    id: 'ua-105',
    name: 'Tan Wei Ming',
    email: 'weiming.tan@straitstelematics.sg',
    phone: '81234567',
    country: 'Singapore',
    role: 'Company Admin',
    policies: ['Vendor Administration', 'Integration Management'],
    permissions: ['vendors.view', 'vendors.edit', 'integrations.view', 'integrations.manage'],
  },
  {
    id: 'ua-106',
    name: 'Rajeshwari Iyer',
    email: 'r.iyer@deccanparts.in',
    phone: '9765432109',
    country: 'India',
    role: 'Viewer',
    policies: ['Read Only'],
    permissions: ['vendors.view'],
  },
  {
    id: 'ua-107',
    name: 'Oliver Vance',
    email: 'o.vance@thamesinsure.co.uk',
    phone: '7700900123',
    country: 'United Kingdom',
    role: 'Vendor Admin',
    policies: ['Vendor Base Access', 'Driver Compliance'],
    permissions: ['vendors.view', 'compliance.view', 'reports.export'],
  },
  {
    id: 'ua-108',
    name: 'Prashant Deshmukh',
    email: 'p.deshmukh@sahyadritowing.in',
    phone: '9922334455',
    country: 'India',
    role: 'Vendor Member',
    policies: ['Vendor Base Access'],
    permissions: ['vendors.view', 'vehicles.view'],
  },
  {
    id: 'ua-109',
    name: 'Nurul Huda',
    email: 'nurul@klangfreight.my',
    phone: '123456789',
    country: 'Malaysia',
    role: 'Fleet Operator',
    policies: ['Fleet Operations', 'Transporter Administration'],
    permissions: ['vendors.view', 'fleets.view', 'drivers.view'],
  },
  {
    id: 'ua-110',
    name: 'Marcus Sterling',
    email: 'm.sterling@pacificleasing.us',
    phone: '4155552671',
    country: 'United States',
    role: 'Vendor Admin',
    policies: ['Vendor Administration'],
    permissions: ['vendors.view', 'vendors.edit', 'vehicles.view'],
  },
  // Unlinked available platform accounts so user can test "Select existing user" immediately
  {
    id: 'ua-111',
    name: 'Kavita Deshpande',
    email: 'kavita.deshpande@adaniport.example',
    phone: '9823011223',
    country: 'India',
    role: 'Vendor Admin',
    policies: ['Vendor Base Access', 'Vendor Administration'],
    permissions: ['vendors.view', 'vendors.edit', 'vendors.personnel.view'],
  },
  {
    id: 'ua-112',
    name: 'Devendra Solanki',
    email: 'd.solanki@mundraops.in',
    phone: '9898012345',
    country: 'India',
    role: 'Fleet Operator',
    policies: ['Fleet Operations'],
    permissions: ['vendors.view', 'vehicles.view', 'fleets.view'],
  },
  {
    id: 'ua-113',
    name: 'Harpreet Gill',
    email: 'harpreet.gill@northstarfleet.in',
    phone: '9814056789',
    country: 'India',
    role: 'Viewer',
    policies: ['Read Only'],
    permissions: ['vendors.view'],
  },
];

export const INITIAL_DEMO_CONTACTS: ContactRecord[] = [
  { id: 'cnt-201', name: 'Arvind Jadeja', email: 'arvind.jadeja@westernlogistics.in', phone: '+91 98250 11223' },
  { id: 'cnt-202', name: 'Meenal Shah', email: 'meenal.shah@westernlogistics.in', phone: '+91 98250 44556' },
  { id: 'cnt-203', name: 'Karthik Subramanian', email: 'karthik.s@bharatfuel.co.in', phone: '+91 98401 22334' },
  { id: 'cnt-204', name: 'Deepak Sharma', email: 'deepak.sharma@apexmaint.in', phone: '+91 98102 33445' },
  { id: 'cnt-205', name: 'Pooja Kulkarni', email: 'pooja.k@deccanparts.in', phone: '+91 98220 55667' },
  { id: 'cnt-206', name: 'Nitin Gadkariya', email: 'nitin.g@kutchtyres.in', phone: '+91 98791 66778' },
  { id: 'cnt-207', name: 'Ritu Verma', email: 'ritu.verma@ncrstaffing.in', phone: '+91 98115 77889' },
  { id: 'cnt-208', name: 'Sanjay Chauhan', email: 'sanjay.c@haziracustoms.in', phone: '+91 98241 88990' },
  { id: 'cnt-209', name: 'Lakshmi Narayanan', email: 'lakshmi.n@coromandelwash.in', phone: '+91 94440 99001' },
  { id: 'cnt-210', name: 'Zaid Siddiqui', email: 'zaid.s@voltgridcharge.in', phone: '+91 98209 10112' },
];

export const INITIAL_DEMO_VENDORS: VendorRecord[] = [
  {
    id: 'vnd-seed-01',
    public_id: 'VND-1001',
    internal_id: 'VENDOR-1001',
    business_id: 'BUS-WL-001',
    name: 'Western Logistics',
    type: 'transporter',
    status: 'active',
    email: 'ops@westernlogistics.in',
    phone: '+91 98201 12233',
    website_url: 'https://westernlogistics.in',
    country: 'India',
    place_id: 'plc-mundra',
    user_account_id: 'ua-101',
    personnel: [
      { contact_id: 'cnt-201', role: 'Admin', status: 'active', login_requested: true, added_at: '2026-01-12T09:30:00.000Z' },
      { contact_id: 'cnt-202', role: 'Member', status: 'active', login_requested: false, added_at: '2026-01-14T11:15:00.000Z' },
    ],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-01-10T08:00:00.000Z',
    updated_at: '2026-02-15T14:20:00.000Z',
    transporter_code: 'TRN-WL-001',
    company_name: 'Adani Port',
    client_name: 'Adani Logistics',
    is_active: true,
    registered_address: {
      pincode: '370421',
      country: 'India',
      state: 'Gujarat',
      city: 'Mundra',
      address: 'Plot 18, Adani Mundra Port Special Economic Zone, Kutch',
      latitude: '22.8396',
      longitude: '69.7241',
    },
    billing_same_as_registered: true,
    billing_details: {
      address: 'Plot 18, Adani Mundra Port Special Economic Zone, Kutch',
      pincode: '370421',
      country: 'India',
      state: 'Gujarat',
      city: 'Mundra',
    },
    contacts_extra: {
      company_phone: '02838-224100',
      contact_person: 'Vikramaditya Mehta',
      contact_no: '+91 98201 12233',
      alt_contact_no: '02838-224109',
      contact_email: 'v.mehta@westernlogistics.in',
      mobile_no: '9820112233',
      alt_email: 'dispatch@westernlogistics.in',
    },
    tax_legal: {
      pan_no: 'AAACW4512K',
      gst_no: '24AAACW4512K1Z8',
      cin_no: 'U63011GJ2012PTC071420',
    },
    is_contract_signed: true,
  },
  {
    id: 'vnd-seed-02',
    public_id: 'VND-1002',
    internal_id: 'VENDOR-1002',
    business_id: 'BUS-BF-002',
    name: 'Bharat Fuel & Bunkering Corp',
    type: 'fuel_supplier',
    status: 'preferred',
    email: 'supply@bharatfuel.co.in',
    phone: '+91 98450 98450',
    website_url: 'https://bharatfuel.co.in',
    country: 'India',
    place_id: 'plc-chennai',
    user_account_id: 'ua-102',
    personnel: [
      { contact_id: 'cnt-203', role: 'Admin', status: 'active', login_requested: true, added_at: '2026-01-18T10:00:00.000Z' },
    ],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-01-12T10:30:00.000Z',
    updated_at: '2026-02-18T09:45:00.000Z',
  },
  {
    id: 'vnd-seed-03',
    public_id: 'VND-1003',
    internal_id: 'VENDOR-1003',
    business_id: 'BUS-AM-003',
    name: 'Apex Heavy Fleet Maintenance',
    type: 'maintenance_provider',
    status: 'active',
    email: 'service@apexmaint.in',
    phone: '+91 98112 23344',
    website_url: 'https://apexmaint.in',
    country: 'India',
    place_id: 'plc-hazira',
    user_account_id: 'ua-103',
    personnel: [
      { contact_id: 'cnt-204', role: 'Admin', status: 'active', login_requested: true, added_at: '2026-01-20T12:00:00.000Z' },
    ],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-01-15T11:00:00.000Z',
    updated_at: '2026-02-19T16:10:00.000Z',
  },
  {
    id: 'vnd-seed-04',
    public_id: 'VND-1004',
    internal_id: 'VENDOR-1004',
    business_id: 'BUS-DP-004',
    name: 'Deccan OEM Spares & Parts',
    type: 'parts_supplier',
    status: 'active',
    email: 'orders@deccanparts.in',
    phone: '+91 97654 32109',
    website_url: 'https://deccanparts.in',
    country: 'India',
    place_id: 'plc-pune',
    user_account_id: 'ua-106',
    personnel: [
      { contact_id: 'cnt-205', role: 'Member', status: 'active', login_requested: false, added_at: '2026-01-22T15:30:00.000Z' },
    ],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-01-18T09:15:00.000Z',
    updated_at: '2026-02-11T13:00:00.000Z',
  },
  {
    id: 'vnd-seed-05',
    public_id: 'VND-1005',
    internal_id: 'VENDOR-1005',
    business_id: 'BUS-ST-005',
    name: 'Straits Telematics Systems',
    type: 'telematics_provider',
    status: 'connected',
    email: 'support@straitstelematics.sg',
    phone: '+65 8123 4567',
    website_url: 'https://straitstelematics.sg',
    country: 'Singapore',
    place_id: 'plc-gurugram',
    user_account_id: 'ua-105',
    personnel: [],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-01-20T07:45:00.000Z',
    updated_at: '2026-02-20T10:05:00.000Z',
  },
  {
    id: 'vnd-seed-06',
    public_id: 'VND-1006',
    internal_id: 'VENDOR-1006',
    business_id: 'BUS-GM-006',
    name: 'Gulf Maritime Forwarding LLC',
    type: 'freight_forwarder',
    status: 'prequalified',
    email: 'desk@gulfmaritime.ae',
    phone: '+971 50 123 4567',
    website_url: 'https://gulfmaritime.ae',
    country: 'United Arab Emirates',
    place_id: 'plc-mundra',
    user_account_id: 'ua-104',
    personnel: [],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-01-22T13:20:00.000Z',
    updated_at: '2026-02-14T08:40:00.000Z',
  },
  {
    id: 'vnd-seed-07',
    public_id: 'VND-1007',
    internal_id: 'VENDOR-1007',
    business_id: 'BUS-TI-007',
    name: 'Thames Commercial Fleet Insurance',
    type: 'insurance_provider',
    status: 'active',
    email: 'underwriting@thamesinsure.co.uk',
    phone: '+44 7700 900123',
    website_url: 'https://thamesinsure.co.uk',
    country: 'United Kingdom',
    place_id: 'plc-gurugram',
    user_account_id: 'ua-107',
    personnel: [],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-01-25T16:00:00.000Z',
    updated_at: '2026-02-10T12:30:00.000Z',
  },
  {
    id: 'vnd-seed-08',
    public_id: 'VND-1008',
    internal_id: 'VENDOR-1008',
    business_id: 'BUS-SH-008',
    name: 'Sahyadri 24x7 Heavy Towing',
    type: 'towing_service',
    status: 'active',
    email: 'dispatch@sahyadritowing.in',
    phone: '+91 99223 34455',
    website_url: 'https://sahyadritowing.in',
    country: 'India',
    place_id: 'plc-pune',
    user_account_id: 'ua-108',
    personnel: [],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-01-27T09:10:00.000Z',
    updated_at: '2026-02-12T17:15:00.000Z',
  },
  {
    id: 'vnd-seed-09',
    public_id: 'VND-1009',
    internal_id: 'VENDOR-1009',
    business_id: 'BUS-PL-009',
    name: 'Pacific Prime Equipment Leasing',
    type: 'leasing_company',
    status: 'under_review',
    email: 'contracts@pacificleasing.us',
    phone: '+1 415 555 2671',
    website_url: 'https://pacificleasing.us',
    country: 'United States',
    place_id: 'plc-gurugram',
    user_account_id: 'ua-110',
    personnel: [],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-01-29T14:50:00.000Z',
    updated_at: '2026-02-16T11:25:00.000Z',
  },
  {
    id: 'vnd-seed-10',
    public_id: 'VND-1010',
    internal_id: 'VENDOR-1010',
    business_id: 'BUS-NCR-010',
    name: 'NCR Commercial Driver Staffing',
    type: 'driver_staffing',
    status: 'active',
    email: 'rosters@ncrstaffing.in',
    phone: '+91 98115 77889',
    website_url: 'https://ncrstaffing.in',
    country: 'India',
    place_id: 'plc-gurugram',
    user_account_id: null,
    personnel: [
      { contact_id: 'cnt-207', role: 'Admin', status: 'active', login_requested: true, added_at: '2026-02-01T10:00:00.000Z' },
    ],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-02-01T08:30:00.000Z',
    updated_at: '2026-02-17T15:00:00.000Z',
  },
  {
    id: 'vnd-seed-11',
    public_id: 'VND-1011',
    internal_id: 'VENDOR-1011',
    business_id: 'BUS-HC-011',
    name: 'Hazira Port Customs & Clearance',
    type: 'customs_broker',
    status: 'active',
    email: 'clearance@haziracustoms.in',
    phone: '+91 98241 88990',
    website_url: 'https://haziracustoms.in',
    country: 'India',
    place_id: 'plc-hazira',
    user_account_id: null,
    personnel: [
      { contact_id: 'cnt-208', role: 'Member', status: 'active', login_requested: false, added_at: '2026-02-03T09:20:00.000Z' },
    ],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-02-02T11:40:00.000Z',
    updated_at: '2026-02-18T12:10:00.000Z',
  },
  {
    id: 'vnd-seed-12',
    public_id: 'VND-1012',
    internal_id: 'VENDOR-1012',
    business_id: 'BUS-KF-012',
    name: 'Klang Nusantara Logistics',
    type: 'logistics_partner',
    status: 'inactive',
    email: 'ops@klangfreight.my',
    phone: '+60 12 345 6789',
    website_url: 'https://klangfreight.my',
    country: 'Malaysia',
    place_id: 'plc-chennai',
    user_account_id: 'ua-109',
    personnel: [],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-02-03T10:15:00.000Z',
    updated_at: '2026-02-19T09:00:00.000Z',
  },
  {
    id: 'vnd-seed-13',
    public_id: 'VND-1013',
    internal_id: 'VENDOR-1013',
    business_id: 'BUS-KT-013',
    name: 'Kutch Highway Tyre Care',
    type: 'tire_service',
    status: 'active',
    email: 'service@kutchtyres.in',
    phone: '+91 98791 66778',
    website_url: 'https://kutchtyres.in',
    country: 'India',
    place_id: 'plc-mundra',
    user_account_id: null,
    personnel: [
      { contact_id: 'cnt-206', role: 'Admin', status: 'active', login_requested: true, added_at: '2026-02-05T14:00:00.000Z' },
    ],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-02-04T12:00:00.000Z',
    updated_at: '2026-02-19T14:30:00.000Z',
  },
  {
    id: 'vnd-seed-14',
    public_id: 'VND-1014',
    internal_id: 'VENDOR-1014',
    business_id: 'BUS-CW-014',
    name: 'Coromandel Tanker Wash & Detailing',
    type: 'wash_detailing',
    status: 'inactive',
    email: 'bay@coromandelwash.in',
    phone: '+91 94440 99001',
    website_url: 'https://coromandelwash.in',
    country: 'India',
    place_id: 'plc-chennai',
    user_account_id: null,
    personnel: [
      { contact_id: 'cnt-209', role: 'Member', status: 'active', login_requested: false, added_at: '2026-02-06T16:45:00.000Z' },
    ],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-02-05T15:20:00.000Z',
    updated_at: '2026-02-15T10:10:00.000Z',
  },
  {
    id: 'vnd-seed-15',
    public_id: 'VND-1015',
    internal_id: 'VENDOR-1015',
    business_id: 'BUS-VG-015',
    name: 'VoltGrid EV Depot Charging',
    type: 'charging_network',
    status: 'syncing',
    email: 'noc@voltgridcharge.in',
    phone: '+91 98209 10112',
    website_url: 'https://voltgridcharge.in',
    country: 'India',
    place_id: 'plc-pune',
    user_account_id: null,
    personnel: [
      { contact_id: 'cnt-210', role: 'Admin', status: 'active', login_requested: true, added_at: '2026-02-07T11:30:00.000Z' },
    ],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-02-06T09:00:00.000Z',
    updated_at: '2026-02-20T08:15:00.000Z',
  },
  {
    id: 'vnd-seed-16',
    public_id: 'VND-1016',
    internal_id: 'VENDOR-1016',
    business_id: 'BUS-VS-016',
    name: 'Veritas Transport Compliance Audit',
    type: 'compliance_audit',
    status: 'suspended',
    email: 'audits@veritascompliance.in',
    phone: '+91 98180 44556',
    website_url: 'https://veritascompliance.in',
    country: 'India',
    place_id: 'plc-gurugram',
    user_account_id: null,
    personnel: [],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-02-07T13:10:00.000Z',
    updated_at: '2026-02-18T16:40:00.000Z',
  },
  {
    id: 'vnd-seed-17',
    public_id: 'VND-1017',
    internal_id: 'VENDOR-1017',
    business_id: 'BUS-SB-017',
    name: 'Saurashtra Body & Paint Works',
    type: 'body_paint',
    status: 'suspended',
    email: 'workshop@saurashtrabody.in',
    phone: '+91 98252 77880',
    website_url: 'https://saurashtrabody.in',
    country: 'India',
    place_id: 'plc-mundra',
    user_account_id: null,
    personnel: [],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-02-08T10:00:00.000Z',
    updated_at: '2026-02-17T11:50:00.000Z',
  },
  {
    id: 'vnd-seed-18',
    public_id: 'VND-1018',
    internal_id: 'VENDOR-1018',
    business_id: 'BUS-EY-018',
    name: 'Ennore Container Yard & Storage',
    type: 'yard_storage',
    status: 'blacklisted',
    email: 'yard@ennorestorage.in',
    phone: '+91 98409 11220',
    website_url: 'https://ennorestorage.in',
    country: 'India',
    place_id: 'plc-chennai',
    user_account_id: null,
    personnel: [],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-02-09T08:20:00.000Z',
    updated_at: '2026-02-19T13:05:00.000Z',
  },
  {
    id: 'vnd-seed-19',
    public_id: 'VND-1019',
    internal_id: 'VENDOR-1019',
    business_id: 'BUS-INT-019',
    name: 'Telematics API (Demo)',
    type: 'integrated_vendor',
    status: 'connected',
    email: '',
    phone: '',
    website_url: '',
    country: 'India',
    place_id: 'plc-mundra',
    user_account_id: null,
    personnel: [],
    integration: {
      provider_id: 'demo_telematics',
      provider_label: 'Telematics API (Demo)',
      configured: true,
      credential_keys: ['api_key'],
      options: { region: 'India' },
      host: 'https://sandbox.telematics-demo.example',
      namespace: 'adani-mundra-v1',
      webhook_url: 'https://callbacks.fleetrobo.example/telematics',
      sandbox: true,
    },
    company: 'Adani Port',
    created_at: '2026-02-10T09:30:00.000Z',
    updated_at: '2026-02-20T11:00:00.000Z',
  },
  {
    id: 'vnd-seed-20',
    public_id: 'VND-1020',
    internal_id: 'VENDOR-1020',
    business_id: 'BUS-INT-020',
    name: 'Carrier Network (Demo)',
    type: 'integrated_vendor',
    status: 'integration_error',
    email: '',
    phone: '',
    website_url: '',
    country: 'India',
    place_id: 'plc-hazira',
    user_account_id: null,
    personnel: [],
    integration: {
      provider_id: 'demo_carrier',
      provider_label: 'Carrier Network (Demo)',
      configured: true,
      credential_keys: ['client_id', 'client_secret'],
      options: { mode: 'Test' },
      host: 'https://carrier-demo.example/api',
      namespace: 'hazira-carrier-sync',
      webhook_url: 'https://callbacks.fleetrobo.example/carrier',
      sandbox: true,
    },
    company: 'Adani Port',
    created_at: '2026-02-11T14:15:00.000Z',
    updated_at: '2026-02-20T15:45:00.000Z',
  },
  // Canonical Transporter / Logistics Provider records referenced across Vehicles & Drivers
  {
    id: 'vnd-seed-21',
    public_id: 'VND-1021',
    internal_id: 'VENDOR-1021',
    business_id: 'BUS-TMS-021',
    name: 'TMS Transporter',
    type: 'transporter',
    status: 'active',
    email: 'dispatch@tmstransporter.in',
    phone: '+91 98250 77100',
    website_url: 'https://tmstransporter.in',
    country: 'India',
    place_id: 'plc-hazira',
    user_account_id: null,
    personnel: [],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-02-12T09:00:00.000Z',
    updated_at: '2026-02-20T12:00:00.000Z',
    transporter_code: 'TRN-TMS-002',
    company_name: 'Adani Port',
    client_name: 'Godrej',
    is_active: true,
    registered_address: {
      pincode: '394510',
      country: 'India',
      state: 'Gujarat',
      city: 'Hazira',
      address: 'Plot 42, Hazira Industrial Belt, Surat',
      latitude: '21.1147',
      longitude: '72.6419',
    },
    billing_same_as_registered: true,
    billing_details: {
      address: 'Plot 42, Hazira Industrial Belt, Surat',
      pincode: '394510',
      country: 'India',
      state: 'Gujarat',
      city: 'Hazira',
    },
    contacts_extra: {
      company_phone: '0261-2800411',
      contact_person: 'Rajesh Parmar',
      contact_no: '+91 98250 77100',
      mobile_no: '9825077100',
      contact_email: 'r.parmar@tmstransporter.in',
    },
    tax_legal: {
      pan_no: 'AABCT8821M',
      gst_no: '24AABCT8821M1Z2',
      cin_no: 'U60231GJ2015PTC084112',
    },
    is_contract_signed: true,
  },
  {
    id: 'vnd-seed-22',
    public_id: 'VND-1022',
    internal_id: 'VENDOR-1022',
    business_id: 'BUS-CST-022',
    name: 'Coastal Transport',
    type: 'transporter',
    status: 'active',
    email: 'ops@coastaltransport.in',
    phone: '+91 98400 66210',
    website_url: 'https://coastaltransport.in',
    country: 'India',
    place_id: 'plc-chennai',
    user_account_id: null,
    personnel: [],
    integration: null,
    company: 'Adani Port',
    created_at: '2026-02-12T10:30:00.000Z',
    updated_at: '2026-02-20T12:30:00.000Z',
    transporter_code: 'TRN-CST-003',
    company_name: 'Adani Port',
    client_name: 'AMNS',
    is_active: true,
    registered_address: {
      pincode: '600081',
      country: 'India',
      state: 'Tamil Nadu',
      city: 'Chennai',
      address: '104 Ennore High Road, Tondiarpet, Chennai',
      latitude: '13.1355',
      longitude: '80.2952',
    },
    billing_same_as_registered: true,
    billing_details: {
      address: '104 Ennore High Road, Tondiarpet, Chennai',
      pincode: '600081',
      country: 'India',
      state: 'Tamil Nadu',
      city: 'Chennai',
    },
    contacts_extra: {
      company_phone: '044-25901188',
      contact_person: 'Senthil Kumar',
      contact_no: '+91 98400 66210',
      mobile_no: '9840066210',
    },
    tax_legal: {
      pan_no: 'AAACC9104P',
      gst_no: '33AAACC9104P1Z4',
    },
    is_contract_signed: true,
  },
  {
    id: 'vnd-seed-23',
    public_id: 'VND-1023',
    internal_id: 'VENDOR-1023',
    business_id: 'BUS-SIS-023',
    name: 'SIS Secure Transit',
    type: 'transporter',
    status: 'active',
    email: 'control@sissecuretransit.in',
    phone: '+91 98110 55432',
    website_url: 'https://sissecuretransit.in',
    country: 'India',
    place_id: 'plc-gurugram',
    user_account_id: null,
    personnel: [],
    integration: null,
    company: 'SIS Cash',
    created_at: '2026-02-13T08:00:00.000Z',
    updated_at: '2026-02-20T13:00:00.000Z',
    transporter_code: 'TRN-SIS-004',
    company_name: 'SIS Cash',
    client_name: 'SIS Cash',
    is_active: true,
    registered_address: {
      pincode: '122002',
      country: 'India',
      state: 'Haryana',
      city: 'Gurugram',
      address: 'Block B, Transport Plaza, Sector 24, Gurugram',
    },
    billing_same_as_registered: true,
    billing_details: {
      address: 'Block B, Transport Plaza, Sector 24, Gurugram',
      pincode: '122002',
      country: 'India',
      state: 'Haryana',
      city: 'Gurugram',
    },
    contacts_extra: {
      contact_person: 'Mahesh Tiwari',
      contact_no: '+91 98110 55432',
      mobile_no: '9811055432',
    },
    is_contract_signed: true,
  },
  {
    id: 'vnd-seed-24',
    public_id: 'VND-1024',
    internal_id: 'VENDOR-1024',
    business_id: 'BUS-CCE-024',
    name: 'ColdChain Express',
    type: 'transporter',
    status: 'active',
    email: 'reefer@coldchainexpress.in',
    phone: '+91 98452 33110',
    website_url: 'https://coldchainexpress.in',
    country: 'India',
    place_id: 'plc-pune',
    user_account_id: null,
    personnel: [],
    integration: null,
    company: 'Akshaykalpa',
    created_at: '2026-02-13T11:00:00.000Z',
    updated_at: '2026-02-20T13:15:00.000Z',
    transporter_code: 'TRN-CCE-005',
    company_name: 'Akshaykalpa',
    client_name: 'Akshaykalpa',
    is_active: true,
    registered_address: {
      pincode: '560066',
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      address: 'Whitefield Cold Logistics Park, Bengaluru',
    },
    billing_same_as_registered: true,
    billing_details: {
      address: 'Whitefield Cold Logistics Park, Bengaluru',
      pincode: '560066',
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
    },
    contacts_extra: {
      contact_person: 'Harish Gowda',
      contact_no: '+91 98452 33110',
      mobile_no: '9845233110',
    },
    is_contract_signed: true,
  },
  {
    id: 'vnd-seed-25',
    public_id: 'VND-1025',
    internal_id: 'VENDOR-1025',
    business_id: 'BUS-AKP-025',
    name: 'AKPL Freight Partners',
    type: 'transporter',
    status: 'active',
    email: 'fleet@akplfreight.in',
    phone: '+91 98211 44009',
    website_url: 'https://akplfreight.in',
    country: 'India',
    place_id: 'plc-pune',
    user_account_id: null,
    personnel: [],
    integration: null,
    company: 'AKPL',
    created_at: '2026-02-14T09:00:00.000Z',
    updated_at: '2026-02-20T13:30:00.000Z',
    transporter_code: 'TRN-AKP-006',
    company_name: 'AKPL',
    client_name: 'AKPL',
    is_active: true,
    registered_address: {
      pincode: '400072',
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      address: 'Saki Naka Freight Terminal, Andheri East, Mumbai',
    },
    billing_same_as_registered: true,
    billing_details: {
      address: 'Saki Naka Freight Terminal, Andheri East, Mumbai',
      pincode: '400072',
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
    },
    contacts_extra: {
      contact_person: 'Nikhil Sawant',
      contact_no: '+91 98211 44009',
      mobile_no: '9821144009',
    },
    is_contract_signed: true,
  },
  {
    id: 'vnd-seed-26',
    public_id: 'VND-1026',
    internal_id: 'VENDOR-1026',
    business_id: 'BUS-BIN-026',
    name: 'Binary Logistics',
    type: 'transporter',
    status: 'active',
    email: 'transport@binarylogistics.in',
    phone: '+91 98104 88992',
    website_url: 'https://binarylogistics.in',
    country: 'India',
    place_id: 'plc-gurugram',
    user_account_id: null,
    personnel: [],
    integration: null,
    company: 'Binary Semantics Ltd',
    created_at: '2026-02-14T10:30:00.000Z',
    updated_at: '2026-02-20T13:45:00.000Z',
    transporter_code: 'TRN-BIN-007',
    company_name: 'Binary Semantics Ltd',
    client_name: 'Binary Semantics Ltd',
    is_active: true,
    registered_address: {
      pincode: '122015',
      country: 'India',
      state: 'Haryana',
      city: 'Gurugram',
      address: 'Plot 38, Electronic City Phase IV, Gurugram',
    },
    billing_same_as_registered: true,
    billing_details: {
      address: 'Plot 38, Electronic City Phase IV, Gurugram',
      pincode: '122015',
      country: 'India',
      state: 'Haryana',
      city: 'Gurugram',
    },
    contacts_extra: {
      contact_person: 'Alok Sinha',
      contact_no: '+91 98104 88992',
      mobile_no: '9810488992',
    },
    is_contract_signed: true,
  },
];

export const SAMPLE_CSV_IMPORT_TEXT = `Name,Phone,Email,Website URL,Country,Address
South Coast Logistics,+91 98400 77881,ops@southcoastlogistics.in,https://southcoastlogistics.in,India,"Ennore High Road, Tondiarpet, Chennai, Tamil Nadu 600081, India"
Western Spare Supply,+91 98251 33442,sales@westernspares.in,https://westernspares.in,India,"Plot 14, Kandla SEZ Sector 2, Gandhidham, Gujarat 370230, India"
,+91 98000 00000,missingname@invalid.example,https://invalid.example,India,"Blank Vendor Row"`;

export const VENDOR_CSV_TEMPLATE = `Name,Phone,Email,Website URL,Country,Address
"Example Vendor Pvt Ltd","+91 98200 12345","contact@examplevendor.in","https://examplevendor.in","India","Mundra Port Office, Kutch, Gujarat 370421, India"`;

export function getVendorTypeLabel(typeKey: string): string {
  const found = VENDOR_TYPE_CATALOG.find(t => t.key === typeKey);
  return found ? found.label : typeKey;
}

export function getVendorStatusMeta(statusKey: string): { label: string; tone: 'green' | 'neutral' | 'red' | 'amber' } {
  const found = VENDOR_STATUS_CATALOG.find(s => s.key === statusKey);
  return found ? { label: found.label, tone: found.tone } : { label: statusKey, tone: 'neutral' };
}

export function formatEnInDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const VENDOR_MASTER_STORAGE_KEY = 'fleetrobo-vendor-master-v1';

const CANONICAL_TRANSPORTER_SEEDS = INITIAL_DEMO_VENDORS.filter(v => v.type === 'transporter');

export function migrateVendorListWithCanonicalTransporters(vendors: VendorRecord[]): VendorRecord[] {
  const updated = vendors.map(v => {
    if (v.id === 'vnd-seed-01' && v.type === 'logistics_partner') {
      const seed01 = INITIAL_DEMO_VENDORS.find(s => s.id === 'vnd-seed-01')!;
      return {
        ...seed01,
        ...v,
        type: 'transporter' as VendorTypeKey,
        transporter_code: v.transporter_code || seed01.transporter_code,
        company_name: v.company_name || seed01.company_name,
        client_name: v.client_name || seed01.client_name,
        is_active: v.is_active ?? seed01.is_active,
        registered_address: v.registered_address || seed01.registered_address,
        billing_same_as_registered: v.billing_same_as_registered ?? seed01.billing_same_as_registered,
        billing_details: v.billing_details || seed01.billing_details,
        contacts_extra: v.contacts_extra || seed01.contacts_extra,
        tax_legal: v.tax_legal || seed01.tax_legal,
        is_contract_signed: v.is_contract_signed ?? seed01.is_contract_signed,
      };
    }
    return v;
  });

  const existingIds = new Set(updated.map(v => v.id));
  const existingNames = new Set(updated.map(v => v.name.trim().toLowerCase()));
  const missingSeeds = CANONICAL_TRANSPORTER_SEEDS.filter(
    s => !existingIds.has(s.id) && !existingNames.has(s.name.trim().toLowerCase())
  );
  return missingSeeds.length > 0 ? [...updated, ...missingSeeds] : updated;
}

export function loadCanonicalVendors(): VendorRecord[] {
  try {
    const raw = localStorage.getItem(VENDOR_MASTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.vendors)) {
        return migrateVendorListWithCanonicalTransporters(parsed.vendors);
      }
    }
  } catch {
    // Ignore localStorage parse failures
  }
  return INITIAL_DEMO_VENDORS;
}

export function getCanonicalTransporterVendors(companyContext?: string): VendorRecord[] {
  const all = loadCanonicalVendors().filter(v => v.type === 'transporter');
  if (!companyContext || companyContext === 'All Companies') return all;
  const ctxLower = companyContext.trim().toLowerCase();
  // Match tenant company or company_name, or Adani Port/Mundra shared logistics, plus newly created transporters
  const matched = all.filter(v => {
    const vc = (v.company_name || v.company || '').trim().toLowerCase();
    if (!vc) return true;
    if (vc === ctxLower) return true;
    if (ctxLower.startsWith('adani') && vc.startsWith('adani')) return true;
    return false;
  });
  return matched.length > 0 ? matched : all;
}

export function getCanonicalTransporterNames(
  companyContext?: string,
  extraLegacyNames: string[] = []
): string[] {
  const canonical = getCanonicalTransporterVendors(companyContext).map(v => v.name);
  const allCanonical = loadCanonicalVendors()
    .filter(v => v.type === 'transporter')
    .map(v => v.name);
  const set = new Set<string>([...canonical, ...allCanonical, ...extraLegacyNames]);
  return Array.from(set).filter(Boolean);
}

export function resolveTransporterVendor(identifierOrName?: string): VendorRecord | undefined {
  if (!identifierOrName) return undefined;
  const needle = identifierOrName.trim().toLowerCase();
  if (!needle) return undefined;
  const transporters = loadCanonicalVendors().filter(v => v.type === 'transporter');
  return transporters.find(
    v =>
      v.id.toLowerCase() === needle ||
      v.public_id.toLowerCase() === needle ||
      v.internal_id.toLowerCase() === needle ||
      v.name.trim().toLowerCase() === needle ||
      (v.transporter_code && v.transporter_code.trim().toLowerCase() === needle)
  );
}

export function syncTransporterRenameAcrossModules(
  vendorId: string,
  oldName: string,
  newName: string
): void {
  const oldTrim = oldName.trim();
  const newTrim = newName.trim();
  if (!oldTrim || !newTrim || oldTrim === newTrim) return;

  let changed = false;

  // 1. Update Vehicles store (fleetrobo_vehicle_master_v3)
  try {
    const rawVehicles = localStorage.getItem('fleetrobo_vehicle_master_v3');
    if (rawVehicles) {
      const parsed = JSON.parse(rawVehicles);
      if (Array.isArray(parsed)) {
        const nextVehicles = parsed.map((veh: any) => {
          let touched = false;
          const matchesVeh =
            veh.transporterVendorId === vendorId ||
            (veh.transporter && veh.transporter.trim().toLowerCase() === oldTrim.toLowerCase());
          const nextVeh = { ...veh };
          if (matchesVeh) {
            nextVeh.transporter = newTrim;
            nextVeh.transporterVendorId = vendorId;
            touched = true;
          }
          if (Array.isArray(veh.routes)) {
            nextVeh.routes = veh.routes.map((rt: any) => {
              if (rt.transporter && rt.transporter.trim().toLowerCase() === oldTrim.toLowerCase()) {
                touched = true;
                return { ...rt, transporter: newTrim };
              }
              return rt;
            });
          }
          if (touched) changed = true;
          return nextVeh;
        });
        localStorage.setItem('fleetrobo_vehicle_master_v3', JSON.stringify(nextVehicles));
      }
    }
  } catch {
    // ignore storage errors
  }

  // 2. Update Drivers store (fleetrobo_driver_master_v1)
  try {
    const rawDrivers = localStorage.getItem('fleetrobo_driver_master_v1');
    if (rawDrivers) {
      const parsed = JSON.parse(rawDrivers);
      if (Array.isArray(parsed)) {
        const nextDrivers = parsed.map((drv: any) => {
          const matchesDrv =
            drv.transporterVendorId === vendorId ||
            (drv.transporter && drv.transporter.trim().toLowerCase() === oldTrim.toLowerCase());
          if (matchesDrv) {
            changed = true;
            return { ...drv, transporter: newTrim, transporterVendorId: vendorId };
          }
          return drv;
        });
        localStorage.setItem('fleetrobo_driver_master_v1', JSON.stringify(nextDrivers));
      }
    }
  } catch {
    // ignore storage errors
  }

  if (changed && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fleetrobo:resources-updated'));
  }
}
