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
    options: ['Adani Pvt Ltd', 'Binary Semantics Ltd', 'FleetRobo Demo Company']
  },
  {
    id: 'df-8',
    key: 'transporter',
    label: 'Transporter',
    section: 'Ownership',
    control: 'multi',
    tooltip: 'Transporter linked with the owning company. Options respond to selected companies.',
    options: ['Western Logistics', 'TMS Transporter', 'Binary Logistics']
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
