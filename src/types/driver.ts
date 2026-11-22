export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  role: 'Driver' | 'Fleet Operator' | 'Transporter Admin' | 'Company Admin' | 'Viewer';
  avatar?: string;
  attachedPolicies?: string[];
  selectedPermissions?: string[];
}

export interface Driver {
  id: string;
  // User account linkage (1:1)
  userAccountId?: string;
  accountName?: string;
  accountEmail?: string;
  accountPhone?: string;
  accountCountry?: string;
  accountRole?: string;
  accountAvatar?: string;

  // Name & Identity
  first?: string;
  middle?: string;
  last?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name: string; // Synced with accountName or entered
  phone: string; // Synced with accountPhone
  dob: string; // YYYY-MM-DD, required, not future
  father?: string;
  blood?: 'A+' | 'A−' | 'B+' | 'B−' | 'AB+' | 'AB−' | 'O+' | 'O−';
  qualification?: string;
  experience?: number; // years, >= 0
  rfid?: boolean;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Archived'; // required

  // Ownership & Organization
  company: string; // Owning company
  transporter?: string;
  transporterVendorId?: string;
  joining?: string; // YYYY-MM-DD
  vendor?: boolean;

  // Contact & Address
  alternate?: string; // 10 digits in India
  emergency?: string; // 10 digits in India
  local?: string;
  localPin?: string;
  permanent?: string;
  permanentPin?: string;

  // Licence
  licence: string; // required, unique
  licenceType?: string; // LMV, HMV, HGMV
  licenceFrom: string; // YYYY-MM-DD, required
  licenceTo: string; // YYYY-MM-DD, required, >= licenceFrom
  authority?: string;

  // Compliance
  rto?: boolean;
  police?: boolean;
  training?: boolean;
  remarks?: string;

  // Documents
  aadhaar?: string; // 12 digits
  aadhaarDoc?: string; // Local preview file/data
  licenceDoc?: string; // Local preview file/data
  imageDoc?: string; // Driver photo upload
  profileDoc?: string;

  // Legacy / Dormant Operational References (preserved for directory column parity)
  reg?: string; // Vehicle registration
  mappingActive?: boolean;
  nextRest?: string;
  faceType?: string;
  faceImagesCount?: number;
}

export const DRIVER_LOOKUPS = {
  companies: ['Adani Mundra', 'Adani Port', 'SIS Cash', 'Akshaykalpa', 'AKPL', 'Binary Semantics Ltd'],
  companyTransporterMap: {
    'Adani Mundra': ['Western Logistics', 'TMS Transporter'],
    'Adani Port': ['Western Logistics', 'TMS Transporter'],
    'SIS Cash': ['SIS Secure Transit', 'TMS Transporter'],
    'Akshaykalpa': ['ColdChain Express', 'Western Logistics'],
    'AKPL': ['AKPL Freight Partners', 'TMS Transporter'],
    'Binary Semantics Ltd': ['Binary Logistics', 'TMS Transporter']
  } as Record<string, string[]>,
  transporters: ['Western Logistics', 'TMS Transporter', 'Binary Logistics', 'SIS Secure Transit', 'ColdChain Express', 'AKPL Freight Partners'],
  bloodGroups: ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'] as const,
  driverStatuses: ['Active', 'Inactive', 'Suspended', 'Archived'] as const,
  licenceTypes: ['LMV', 'HMV', 'HGMV'],
  roles: ['Driver', 'Fleet Operator', 'Transporter Admin', 'Company Admin', 'Viewer'] as const,
  countries: ['India', 'United Arab Emirates', 'Malaysia', 'Saudi Arabia', 'Singapore', 'Other'] as const,
  countryDialCodes: {
    'India': '+91',
    'United Arab Emirates': '+971',
    'Malaysia': '+60',
    'Saudi Arabia': '+966',
    'Singapore': '+65',
    'Other': '+1'
  } as Record<string, string>
};

// Seed 30 Demo Drivers
export const INITIAL_DEMO_DRIVERS: Driver[] = [
  {
    id: 'drv-001',
    userAccountId: 'usr-101',
    accountName: 'Ramesh Singh',
    accountEmail: 'ramesh.singh@adani.example',
    accountPhone: '9876543210',
    accountCountry: 'India',
    accountRole: 'Driver',
    name: 'Ramesh Singh',
    phone: '9876543210',
    dob: '1988-04-12',
    father: 'Kailash Singh',
    blood: 'B+',
    qualification: 'Secondary (10th)',
    experience: 12,
    rfid: true,
    status: 'Active',
    company: 'Adani Mundra',
    transporter: 'Western Logistics',
    joining: '2021-03-15',
    vendor: false,
    alternate: '9876543211',
    emergency: '9876543212',
    local: 'Quarter 14, Adani Port Colony, Mundra',
    localPin: '370421',
    permanent: 'Village Rampur, Dist Ghazipur, UP',
    permanentPin: '233001',
    licence: 'JH0420140000189',
    licenceType: 'HMV',
    licenceFrom: '2014-06-10',
    licenceTo: '2028-06-09',
    authority: 'RTO Hazaribagh, Jharkhand',
    rto: true,
    police: true,
    training: true,
    remarks: 'Certified heavy vehicle master driver. Clean record.',
    aadhaar: '458912345678',
    aadhaarDoc: 'aadhaar_ramesh.pdf',
    licenceDoc: 'dl_ramesh.pdf',
    reg: 'MH26AH1192',
    mappingActive: true,
    nextRest: '2026-11-15'
  },
  {
    id: 'drv-002',
    userAccountId: 'usr-102',
    accountName: 'Sukhwinder Gill',
    accountEmail: 'sukhwinder.gill@adani.example',
    accountPhone: '9812345678',
    accountCountry: 'India',
    accountRole: 'Driver',
    name: 'Sukhwinder Gill',
    phone: '9812345678',
    dob: '1985-09-22',
    father: 'Gurmeet Gill',
    blood: 'O+',
    qualification: 'Senior Secondary (12th)',
    experience: 15,
    rfid: true,
    status: 'Active',
    company: 'Adani Mundra',
    transporter: 'TMS Transporter',
    joining: '2019-08-01',
    vendor: true,
    alternate: '9812345679',
    emergency: '9812345670',
    local: 'Room 5, GIDC Phase 2, Mundra',
    localPin: '370421',
    permanent: 'PO Majitha, Amritsar, Punjab',
    permanentPin: '143601',
    licence: 'PB0220100018420',
    licenceType: 'HGMV',
    licenceFrom: '2010-04-12',
    licenceTo: '2026-11-28', // Expiring within 30 days!
    authority: 'RTO Amritsar, Punjab',
    rto: true,
    police: true,
    training: false,
    remarks: 'Refresher safety training pending renewal.',
    aadhaar: '891234567890',
    aadhaarDoc: 'aadhaar_sukhwinder.pdf',
    reg: 'GJ12AZ9820',
    mappingActive: true,
    nextRest: '2026-11-14'
  },
  {
    id: 'drv-003',
    userAccountId: 'usr-103',
    accountName: 'Anil Kumar Verma',
    accountEmail: 'anil.verma@binary.example',
    accountPhone: '9765432109',
    accountCountry: 'India',
    accountRole: 'Driver',
    name: 'Anil Kumar Verma',
    phone: '9765432109',
    dob: '1992-11-05',
    father: 'Ramswaroop Verma',
    blood: 'A+',
    qualification: 'ITI Diesel Mechanic',
    experience: 8,
    rfid: false,
    status: 'Active',
    company: 'Binary Semantics Ltd',
    transporter: 'Binary Logistics',
    joining: '2022-01-10',
    vendor: false,
    emergency: '9765432100',
    local: 'Sector 18, Gurugram, Haryana',
    localPin: '122001',
    permanent: 'Ward 4, Jhansi, UP',
    permanentPin: '284001',
    licence: 'HR2620150049211',
    licenceType: 'HMV',
    licenceFrom: '2015-08-20',
    licenceTo: '2025-08-19', // Expired!
    authority: 'RTO Gurugram',
    rto: true,
    police: true,
    training: true,
    remarks: 'Driving licence expired; renewal in process at local RTO.',
    aadhaar: '123456789012',
    aadhaarDoc: 'aadhaar_anil.png',
    licenceDoc: 'dl_anil.jpg',
    reg: 'HR26DQ1104',
    mappingActive: false,
    nextRest: '2026-11-18'
  },
  {
    id: 'drv-004',
    name: 'Mukesh Yadav', // Unlinked account
    phone: '9845123456',
    dob: '1990-03-18',
    father: 'Dharmendra Yadav',
    blood: 'AB+',
    qualification: 'Primary',
    experience: 10,
    rfid: true,
    status: 'Active',
    company: 'Adani Port',
    transporter: 'Western Logistics',
    joining: '2020-11-01',
    vendor: false,
    emergency: '9845123450',
    local: 'Yadav Chawl, Mundra Port Yard',
    localPin: '370421',
    permanent: 'Chandauli, UP',
    permanentPin: '232104',
    licence: 'UP6520120008892',
    licenceType: 'HMV',
    licenceFrom: '2012-02-14',
    licenceTo: '2029-02-13',
    authority: 'RTO Varanasi, UP',
    rto: true,
    police: false, // Pending verification
    training: true,
    remarks: 'Police verification documentation pending submission.',
    aadhaar: '987654321098',
    reg: 'GJ12CC7781',
    mappingActive: true,
    nextRest: '2026-11-20'
  },
  {
    id: 'drv-005',
    userAccountId: 'usr-105',
    accountName: 'Pradeep Sharma',
    accountEmail: 'pradeep.sharma@adani.example',
    accountPhone: '9934567812',
    accountCountry: 'India',
    accountRole: 'Driver',
    name: 'Pradeep Sharma',
    phone: '9934567812',
    dob: '1986-07-25',
    father: 'Satyanarayan Sharma',
    blood: 'A−',
    qualification: 'Secondary (10th)',
    experience: 14,
    rfid: true,
    status: 'Inactive',
    company: 'Adani Port',
    transporter: 'Western Logistics',
    joining: '2018-05-15',
    vendor: false,
    emergency: '9934567800',
    local: 'Mundra Old Town',
    localPin: '370421',
    permanent: 'Sikar, Rajasthan',
    permanentPin: '332001',
    licence: 'RJ2320090011223',
    licenceType: 'HMV',
    licenceFrom: '2009-10-01',
    licenceTo: '2027-09-30',
    authority: 'RTO Sikar',
    rto: true,
    police: true,
    training: true,
    remarks: 'On personal leave since Oct 2026.',
    aadhaar: '654321098765',
    aadhaarDoc: 'aadhaar_pradeep.pdf',
    licenceDoc: 'dl_pradeep.pdf',
    reg: 'GJ12AA1002',
    mappingActive: false
  },
  {
    id: 'drv-006',
    userAccountId: 'usr-106',
    accountName: 'Jaspal Singh Sandhu',
    accountEmail: 'jaspal.sandhu@binary.example',
    accountPhone: '9871122334',
    accountCountry: 'India',
    accountRole: 'Driver',
    name: 'Jaspal Singh Sandhu',
    phone: '9871122334',
    dob: '1983-12-30',
    father: 'Joginder Singh',
    blood: 'B+',
    qualification: 'Secondary (10th)',
    experience: 18,
    rfid: true,
    status: 'Suspended',
    company: 'SIS Cash',
    transporter: 'SIS Secure Transit',
    joining: '2017-04-01',
    vendor: false,
    emergency: '9871122330',
    local: 'Transport Nagar, Delhi',
    localPin: '110036',
    permanent: 'Ludhiana, Punjab',
    permanentPin: '141001',
    licence: 'PB1020060009941',
    licenceType: 'HGMV',
    licenceFrom: '2006-03-15',
    licenceTo: '2028-03-14',
    authority: 'RTO Ludhiana',
    rto: true,
    police: false,
    training: true,
    remarks: 'Internal safety inquiry underway regarding speeding alert.',
    aadhaar: '321098765432',
    aadhaarDoc: 'aadhaar_jaspal.pdf',
    licenceDoc: 'dl_jaspal.pdf',
    mappingActive: false
  },
  {
    id: 'drv-007',
    name: 'Balwinder Dhillon',
    phone: '9882233445',
    dob: '1979-05-14',
    father: 'Tarlochan Dhillon',
    blood: 'O+',
    qualification: 'Senior Secondary',
    experience: 22,
    rfid: false,
    status: 'Archived',
    company: 'AKPL',
    transporter: 'AKPL Freight Partners',
    joining: '2015-02-10',
    vendor: false,
    licence: 'PB0820030017721',
    licenceType: 'HMV',
    licenceFrom: '2003-01-20',
    licenceTo: '2026-01-19',
    authority: 'RTO Jalandhar',
    rto: true,
    police: true,
    training: true,
    remarks: 'Retired from fleet operations in Dec 2025. Record archived.',
    aadhaar: '789012345678',
    mappingActive: false
  },
  {
    id: 'drv-008',
    userAccountId: 'usr-108',
    accountName: 'Farhan Ali Khan',
    accountEmail: 'farhan.khan@fleetrobo.example',
    accountPhone: '9715012345',
    accountCountry: 'United Arab Emirates',
    accountRole: 'Driver',
    name: 'Farhan Ali Khan',
    phone: '9715012345',
    dob: '1991-02-14',
    father: 'Mansoor Khan',
    blood: 'A+',
    qualification: 'Diploma in Logistics',
    experience: 9,
    rfid: true,
    status: 'Active',
    company: 'Akshaykalpa',
    transporter: 'ColdChain Express',
    joining: '2022-06-01',
    vendor: true,
    local: 'Al Quoz Industrial 3, Dubai',
    localPin: '00000',
    licence: 'DXB20160087123',
    licenceType: 'HMV',
    licenceFrom: '2016-05-01',
    licenceTo: '2030-04-30',
    authority: 'RTA Dubai',
    rto: true,
    police: true,
    training: true,
    aadhaarDoc: 'passport_farhan.pdf',
    licenceDoc: 'dl_farhan.pdf',
    reg: 'DXB-TRK-901',
    mappingActive: true,
    nextRest: '2026-11-16'
  },
  {
    id: 'drv-009',
    userAccountId: 'usr-109',
    accountName: 'Kishore Das',
    accountEmail: 'kishore.das@adani.example',
    accountPhone: '9654321987',
    accountCountry: 'India',
    accountRole: 'Driver',
    name: 'Kishore Das',
    phone: '9654321987',
    dob: '1993-08-11',
    father: 'Niranjan Das',
    blood: 'AB−',
    qualification: 'Secondary (10th)',
    experience: 6,
    rfid: true,
    status: 'Active',
    company: 'Adani Port',
    transporter: 'TMS Transporter',
    joining: '2023-02-15',
    vendor: false,
    licence: 'OR0220180004512',
    licenceType: 'LMV',
    licenceFrom: '2018-03-10',
    licenceTo: '2038-03-09',
    authority: 'RTO Bhubaneswar',
    rto: false, // Not certified
    police: true,
    training: false,
    remarks: 'Induction training scheduled for next cohort.',
    aadhaar: '345678901234',
    reg: 'OD02AB3312',
    mappingActive: true,
    nextRest: '2026-11-19'
  },
  {
    id: 'drv-010',
    userAccountId: 'usr-110',
    accountName: 'Satish Chandra',
    accountEmail: 'satish.chandra@adani.example',
    accountPhone: '9988776655',
    accountCountry: 'India',
    accountRole: 'Driver',
    name: 'Satish Chandra',
    phone: '9988776655',
    dob: '1987-10-04',
    father: 'Gopal Chandra',
    blood: 'O−',
    qualification: 'High School',
    experience: 13,
    rfid: true,
    status: 'Active',
    company: 'SIS Cash',
    transporter: 'SIS Secure Transit',
    joining: '2020-04-10',
    vendor: false,
    licence: 'KA0420130006789',
    licenceType: 'HMV',
    licenceFrom: '2013-09-12',
    licenceTo: '2029-09-11',
    authority: 'RTO Yeshwantpur, Bengaluru',
    rto: true,
    police: true,
    training: true,
    aadhaar: '567890123456',
    aadhaarDoc: 'aadhaar_satish.pdf',
    licenceDoc: 'dl_satish.pdf',
    reg: 'KA04E9821',
    mappingActive: true,
    nextRest: '2026-11-17'
  },
  // Additional 20 diverse drivers to populate 30 total records
  ...Array.from({ length: 20 }).map((_, i) => {
    const idx = i + 11;
    const companyPalette = ['Adani Mundra', 'Adani Port', 'SIS Cash', 'Akshaykalpa', 'AKPL'];
    const company = companyPalette[idx % companyPalette.length];
    const transporter =
      company === 'Adani Mundra' || company === 'Adani Port'
        ? 'Western Logistics'
        : company === 'SIS Cash'
        ? 'SIS Secure Transit'
        : company === 'Akshaykalpa'
        ? 'ColdChain Express'
        : 'AKPL Freight Partners';
    const statuses: ('Active' | 'Inactive' | 'Suspended' | 'Archived')[] = ['Active', 'Active', 'Active', 'Inactive', 'Suspended'];
    const status = statuses[idx % statuses.length];
    const firstNames = ['Vikram', 'Rajesh', 'Harpreet', 'Amit', 'Manoj', 'Dinesh', 'Suresh', 'Manjeet', 'Naresh', 'Deepak'];
    const lastNames = ['Yadav', 'Patel', 'Kumar', 'Singh', 'Chaudhary', 'Gowda', 'Nair', 'Sharma', 'Reddy', 'Verma'];
    const fn = firstNames[idx % firstNames.length];
    const ln = lastNames[(idx + 3) % lastNames.length];
    const name = `${fn} ${ln}`;
    const dlNum = `DL${idx.toString().padStart(2, '0')}201500${(idx * 137).toString().padStart(5, '0')}`;
    const isLinked = idx % 4 !== 0;

    return {
      id: `drv-${idx.toString().padStart(3, '0')}`,
      ...(isLinked ? {
        userAccountId: `usr-${idx + 100}`,
        accountName: name,
        accountEmail: `${fn.toLowerCase()}.${ln.toLowerCase()}${idx}@adani.example`,
        accountPhone: `98${idx.toString().padStart(2, '0')}123456`.slice(0, 10),
        accountCountry: 'India',
        accountRole: 'Driver' as const,
      } : {}),
      name,
      phone: `98${idx.toString().padStart(2, '0')}123456`.slice(0, 10),
      dob: `198${(idx % 9) + 1}-0${(idx % 8) + 1}-15`,
      father: `${firstNames[(idx + 5) % firstNames.length]} ${ln}`,
      blood: (['A+', 'B+', 'O+', 'AB+', 'A−', 'B−', 'O−', 'AB−'] as const)[idx % 8],
      qualification: idx % 2 === 0 ? 'Secondary (10th)' : 'Senior Secondary (12th)',
      experience: (idx % 15) + 3,
      rfid: idx % 3 !== 0,
      status,
      company,
      transporter,
      joining: `202${(idx % 4) + 1}-03-10`,
      vendor: idx % 4 === 0,
      licence: dlNum,
      licenceType: idx % 3 === 0 ? 'HGMV' : 'HMV',
      licenceFrom: '2015-05-10',
      licenceTo: idx === 12 ? '2026-11-25' : idx === 15 ? '2025-05-09' : '2030-05-09',
      authority: `RTO Region ${idx}`,
      rto: idx % 5 !== 0,
      police: idx % 4 !== 0,
      training: idx % 3 !== 0,
      aadhaar: `7${idx.toString().padStart(2, '0')}123456789`.slice(0, 12),
      aadhaarDoc: idx % 3 !== 0 ? `aadhaar_${fn.toLowerCase()}.pdf` : undefined,
      licenceDoc: idx % 2 === 0 ? `dl_${fn.toLowerCase()}.pdf` : undefined,
      reg: `GJ12EX${(idx * 211).toString().slice(0, 4)}`,
      mappingActive: status === 'Active' && idx % 2 === 0,
      nextRest: `2026-11-${(idx % 15) + 12}`
    };
  })
];

export const INITIAL_DRIVERS = INITIAL_DEMO_DRIVERS;

// Helper to derive badges from a Driver record
export function deriveDriverBadges(driver: Driver) {
  // Account Status
  const accountStatus: 'Linked' | 'Not linked' = driver.userAccountId ? 'Linked' : 'Not linked';

  // Verification Status: Verified ONLY if rto && police && training are all true
  const isVerified = Boolean(driver.rto && driver.police && driver.training);
  const verification: 'Verified' | 'Pending' = isVerified ? 'Verified' : 'Pending';

  // Document Status: Complete if both Aadhaar & Licence doc present, Partial if one, Missing if none
  const hasAadhaar = Boolean(driver.aadhaarDoc);
  const hasLicence = Boolean(driver.licenceDoc);
  let documents: 'Complete' | 'Partial' | 'Missing' = 'Missing';
  if (hasAadhaar && hasLicence) {
    documents = 'Complete';
  } else if (hasAadhaar || hasLicence) {
    documents = 'Partial';
  }

  // Licence Expiry calculation against current date
  let expiry: 'Valid' | 'Expiring within 30 days' | 'Expired' | 'Missing' = 'Valid';
  if (!driver.licenceTo) {
    expiry = 'Missing';
  } else {
    const today = new Date('2026-11-11T00:00:00Z');
    const validToDate = new Date(driver.licenceTo);
    const diffTime = validToDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      expiry = 'Expired';
    } else if (diffDays <= 30) {
      expiry = 'Expiring within 30 days';
    } else {
      expiry = 'Valid';
    }
  }

  // Mapping Status
  let mapping: 'Mapped' | 'Unmapped' | 'Expired' = 'Unmapped';
  if (driver.reg) {
    mapping = driver.mappingActive ? 'Mapped' : 'Expired';
  }

  return {
    accountStatus,
    verification,
    documents,
    expiry,
    mapping
  };
}

export interface TransferHistoryJob {
  id: string;
  type: 'Import' | 'Export' | 'Bulk';
  name: string;
  recordCount: number;
  skippedCount?: number;
  timestamp: string;
  status: 'Completed' | 'Partial' | 'Failed';
  format?: 'csv' | 'xlsx' | 'xls' | 'html' | 'pdf';
  fileData?: string;
}

export const DRIVER_MASTER_STORAGE_KEY = 'fleetrobo_driver_master_v1';

export function loadDriverMasterStore(): Driver[] {
  try {
    const raw = localStorage.getItem(DRIVER_MASTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Driver[];
      }
    }
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(DRIVER_MASTER_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DRIVERS));
  } catch {
    // ignore
  }
  return INITIAL_DEMO_DRIVERS;
}

export function saveDriverMasterStore(drivers: Driver[]) {
  try {
    localStorage.setItem(DRIVER_MASTER_STORAGE_KEY, JSON.stringify(drivers));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fleetrobo:resources-updated'));
    }
  } catch {
    // ignore
  }
}
