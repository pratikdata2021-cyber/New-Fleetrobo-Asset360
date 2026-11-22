export interface Vehicle {
  id: string;
  public_id: string;
  registration_number: string;
  name: string;
  internal_id?: string;
  vin?: string;
  make: string;
  model: string;
  year: number | string;
  trim?: string;
  color?: string;
  serial_number?: string;
  fuel_card_number?: string;
  class?: string;
  status: 'Available' | 'In Use' | 'Maintenance' | 'Out of Service' | 'Reserved' | 'Inactive' | 'Accident / Damage' | 'Compliance Hold' | 'Stolen';
  call_sign?: string;
  company: string;
  transporter?: string;
  vendor?: string;
  driver?: string;
  hub?: string;
  client?: string;
  client_location?: string;
  online?: boolean;
  routes?: RouteMapping[];
  shared_access?: SharedAccess[];
  created_at: string;
  updated_at: string;
}

export interface RouteMapping {
  id: string;
  client: string;
  transporter: string;
  route: string;
  route_type: string;
  overspeed_rule_enabled?: boolean;
  overspeed_limit?: string;
  overspeed_duration?: string;
}

export interface SharedAccess {
  id: string;
  shared_company: string;
  is_shared: boolean;
}

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh-1',
    public_id: 'VEH-00101',
    registration_number: 'GJ21TR1781',
    name: 'Ashok Leyland 2820 12',
    internal_id: 'TRK-2820-12',
    vin: 'MB1A5BCD3M1029381',
    make: 'Ashok Leyland',
    model: '2820',
    year: 2021,
    trim: '12',
    color: 'White',
    serial_number: 'AL-2021-9901',
    fuel_card_number: 'FC-992019',
    class: 'HMV',
    status: 'Inactive',
    call_sign: 'AP-GJ-01',
    company: 'FleetRobo Demo Company',
    transporter: 'Adani Logistics',
    vendor: 'Ashok Leyland Service',
    driver: 'Rajesh Sharma',
    hub: 'Mundra Port Gate 1',
    client: 'Adani Port Logistics',
    client_location: 'Mundra Yard 4',
    online: false,
    routes: [
      {
        id: 'rt-1',
        client: 'Adani Port Logistics',
        transporter: 'Adani Logistics',
        route: 'Mundra to Ahmedabad Expressway',
        route_type: 'Primary Haulage',
        overspeed_rule_enabled: true,
        overspeed_limit: '65',
        overspeed_duration: '30'
      }
    ],
    shared_access: [
      { id: 'sh-1', shared_company: 'Western Logistics Hub', is_shared: true }
    ],
    created_at: '2024-01-15',
    updated_at: '2024-03-10'
  },
  {
    id: 'veh-2',
    public_id: 'VEH-00102',
    registration_number: 'HR29TR2349',
    name: 'Ashok Leyland 2820 20',
    internal_id: 'TRK-2820-20',
    vin: 'MB1A5BCD3M1029382',
    make: 'Ashok Leyland',
    model: '2820',
    year: 2021,
    trim: '20',
    color: 'White',
    serial_number: 'AL-2021-9902',
    fuel_card_number: 'FC-992020',
    class: 'HMV',
    status: 'In Use',
    call_sign: 'AP-HR-02',
    company: 'Binary Semantics Ltd',
    transporter: 'Western Express Transport',
    vendor: 'Ashok Leyland Service',
    driver: 'Vikram Singh',
    hub: 'Hazira Container Terminal',
    client: 'Binary Logistics Corp',
    client_location: 'Hazira Gate 2',
    online: true,
    routes: [
      {
        id: 'rt-2',
        client: 'Binary Logistics Corp',
        transporter: 'Western Express Transport',
        route: 'Hazira to Surat Hub',
        route_type: 'Local Feeder',
        overspeed_rule_enabled: true,
        overspeed_limit: '60',
        overspeed_duration: '20'
      }
    ],
    shared_access: [],
    created_at: '2024-01-16',
    updated_at: '2024-03-11'
  },
  {
    id: 'veh-3',
    public_id: 'VEH-00103',
    registration_number: 'RJ37TR2917',
    name: 'Ashok Leyland 2820 28',
    internal_id: 'TRK-2820-28',
    vin: 'MB1A5BCD3M1029383',
    make: 'Ashok Leyland',
    model: '2820',
    year: 2021,
    trim: '28',
    color: 'Silver Grey',
    serial_number: 'AL-2021-9903',
    fuel_card_number: 'FC-992021',
    class: 'HMV',
    status: 'Out of Service',
    call_sign: 'AP-RJ-03',
    company: 'Adani Port',
    transporter: 'Mundra Logistics Fleet',
    vendor: 'Leyland Authorized Center',
    driver: 'Suresh Patel',
    hub: 'Mundra South Basin',
    client: 'Adani Port Cargo',
    client_location: 'Berth 5',
    online: false,
    routes: [],
    shared_access: [],
    created_at: '2024-01-18',
    updated_at: '2024-03-12'
  },
  {
    id: 'veh-4',
    public_id: 'VEH-00104',
    registration_number: 'MH04PR6001',
    name: 'BharatBenz 3528',
    internal_id: 'TRK-BB-3528',
    vin: 'ME2BB3528M9876541',
    make: 'BharatBenz',
    model: '3528C',
    year: 2024,
    trim: 'Standard Tipper',
    color: 'Deep Blue',
    serial_number: 'BB-2024-1101',
    fuel_card_number: 'FC-881921',
    class: 'HMV',
    status: 'Reserved',
    call_sign: 'MH-CT-04',
    company: 'Binary Semantics Ltd',
    transporter: 'Adani Logistics',
    vendor: 'Daimler India Service',
    driver: 'Mohan Lal',
    hub: 'Nhava Sheva Terminal',
    client: 'Global Freight Services',
    client_location: 'JNPT Yard A',
    online: true,
    routes: [],
    shared_access: [],
    created_at: '2024-02-01',
    updated_at: '2024-03-14'
  },
  {
    id: 'veh-5',
    public_id: 'VEH-00105',
    registration_number: 'RJ22AK1852',
    name: 'BharatBenz 3528 13',
    internal_id: 'TRK-BB-13',
    vin: 'ME2BB3528M9876542',
    make: 'BharatBenz',
    model: '3528C',
    year: 2024,
    trim: '13',
    color: 'White',
    serial_number: 'BB-2024-1102',
    fuel_card_number: 'FC-881922',
    class: 'HMV',
    status: 'Available',
    call_sign: 'AP-RJ-13',
    company: 'Adani Port',
    transporter: 'Western Express Transport',
    vendor: 'Daimler India Service',
    driver: 'Amitabh Sen',
    hub: 'Kandla Multi-purpose Terminal',
    client: 'Adani Port Logistics',
    client_location: 'Kandla Dock 2',
    online: true,
    routes: [
      {
        id: 'rt-3',
        client: 'Adani Port Logistics',
        transporter: 'Western Express Transport',
        route: 'Kandla to Gandhidham Hub',
        route_type: 'Port Shuttle',
        overspeed_rule_enabled: true,
        overspeed_limit: '50',
        overspeed_duration: '15'
      }
    ],
    shared_access: [
      { id: 'sh-2', shared_company: 'Kandla Port Authority', is_shared: true }
    ],
    created_at: '2024-02-05',
    updated_at: '2024-03-15'
  },
  {
    id: 'veh-6',
    public_id: 'VEH-00106',
    registration_number: 'MH30AK2420',
    name: 'BharatBenz 3528 21',
    internal_id: 'TRK-BB-21',
    vin: 'ME2BB3528M9876543',
    make: 'BharatBenz',
    model: '3528C',
    year: 2024,
    trim: '21',
    color: 'White',
    serial_number: 'BB-2024-1103',
    fuel_card_number: 'FC-881923',
    class: 'HMV',
    status: 'Maintenance',
    call_sign: 'AP-MH-21',
    company: 'FleetRobo Demo Company',
    transporter: 'Western Express Transport',
    vendor: 'BharatBenz Hub Surat',
    driver: 'Harish Rao',
    hub: 'Surat Cargo Complex',
    client: 'FleetRobo Demo Logistics',
    client_location: 'Maintenance Bay 3',
    online: false,
    routes: [],
    shared_access: [],
    created_at: '2024-02-10',
    updated_at: '2024-03-16'
  },
  {
    id: 'veh-7',
    public_id: 'VEH-00107',
    registration_number: 'MH32QX3817',
    name: 'Cargo Van · Kandla Container Terminal',
    internal_id: 'VAN-KCT-01',
    vin: 'MAT407000M8877661',
    make: 'TATA MOTORS',
    model: '407',
    year: 2020,
    trim: 'High Deck Cargo',
    color: 'Yellow',
    serial_number: 'TM-2020-4071',
    fuel_card_number: 'FC-771829',
    class: 'LMV',
    status: 'Available',
    call_sign: 'CV-KND-01',
    company: 'FleetRobo Demo Enterprise',
    transporter: 'Kandla City Cargo',
    vendor: 'Tata Motors Commercial',
    driver: 'Ramesh Yadav',
    hub: 'Kandla Container Terminal',
    client: 'Kandla Container Authority',
    client_location: 'Gate 4',
    online: true,
    routes: [],
    shared_access: [],
    created_at: '2024-02-12',
    updated_at: '2024-03-17'
  },
  {
    id: 'veh-8',
    public_id: 'VEH-00108',
    registration_number: 'MH23HV3484',
    name: 'Cargo Van · Navi Mumbai Cash Vault',
    internal_id: 'VAN-NMC-02',
    vin: 'ME2BB1012M7766551',
    make: 'BharatBenz',
    model: '1012R',
    year: 2023,
    trim: 'Armored Vault',
    color: 'Silver Grey',
    serial_number: 'BB-2023-8821',
    fuel_card_number: 'FC-881924',
    class: 'LMV',
    status: 'In Use',
    call_sign: 'CV-NMB-02',
    company: 'FleetRobo Demo Enterprise',
    transporter: 'SecureLog Transports',
    vendor: 'Daimler India Service',
    driver: 'Praveen Kumar',
    hub: 'Navi Mumbai Central Hub',
    client: 'Reserve Logistics Network',
    client_location: 'Sector 15 Depot',
    online: true,
    routes: [],
    shared_access: [],
    created_at: '2024-02-14',
    updated_at: '2024-03-18'
  },
  {
    id: 'veh-9',
    public_id: 'VEH-00109',
    registration_number: 'MH12RB3854',
    name: 'Crane Carrier · Mumbai Airport Apron',
    internal_id: 'CRN-MUM-01',
    vin: 'YV2FMX460M5544331',
    make: 'Volvo',
    model: 'FMX 460',
    year: 2022,
    trim: 'Heavy Tipper 8x4',
    color: 'Safety Orange',
    serial_number: 'VO-2022-7711',
    fuel_card_number: 'FC-551029',
    class: 'HMV',
    status: 'Available',
    call_sign: 'AP-CRN-09',
    company: 'Adani Port',
    transporter: 'Adani Logistics',
    vendor: 'Volvo Trucks India',
    driver: 'Gurmeet Singh',
    hub: 'Mumbai Port Marine Basin',
    client: 'Adani Airport Holdings',
    client_location: 'Terminal 2 Cargo',
    online: true,
    routes: [],
    shared_access: [],
    created_at: '2024-02-20',
    updated_at: '2024-03-19'
  },
  {
    id: 'veh-10',
    public_id: 'VEH-00110',
    registration_number: 'MH24IY3521',
    name: 'Crane Carrier · Surat Manufacturing Yard',
    internal_id: 'CRN-SUR-02',
    vin: 'MAT492300M1122331',
    make: 'TATA MOTORS',
    model: 'Prima 4928',
    year: 2023,
    trim: 'Special Heavy Rig',
    color: 'Red',
    serial_number: 'TM-2023-9932',
    fuel_card_number: 'FC-771830',
    class: 'HMV',
    status: 'Accident / Damage',
    call_sign: 'AP-CRN-10',
    company: 'Adani Port',
    transporter: 'Surat Heavy Haul',
    vendor: 'Tata Motors Commercial',
    driver: 'Jitendra Dave',
    hub: 'Hazira Heavy Works',
    client: 'Surat Industrial Corp',
    client_location: 'Yard 9',
    online: false,
    routes: [],
    shared_access: [],
    created_at: '2024-02-22',
    updated_at: '2024-03-20'
  }
];

export const VAHAN_SAMPLE_DATABASE: Record<string, Partial<Vehicle>> = {
  'MH12AB1234': {
    make: 'Tata Motors',
    model: 'Signa 5530',
    year: 2023,
    trim: '5530.S',
    class: 'HMV',
    color: 'White',
    vin: 'MAT553000M1234567',
    serial_number: 'TM-SIGN-2023-01'
  },
  'GJ21TR1781': {
    make: 'Ashok Leyland',
    model: '2820',
    year: 2021,
    trim: '12',
    class: 'HMV',
    color: 'White',
    vin: 'MB1A5BCD3M1029381',
    serial_number: 'AL-2021-9901'
  },
  'HR29TR2349': {
    make: 'Ashok Leyland',
    model: '2820',
    year: 2021,
    trim: '20',
    class: 'HMV',
    color: 'White',
    vin: 'MB1A5BCD3M1029382',
    serial_number: 'AL-2021-9902'
  },
  'MH04PR6001': {
    make: 'BharatBenz',
    model: '3528C',
    year: 2024,
    trim: 'Standard Tipper',
    class: 'HMV',
    color: 'Deep Blue',
    vin: 'ME2BB3528M9876541',
    serial_number: 'BB-2024-1101'
  }
};
