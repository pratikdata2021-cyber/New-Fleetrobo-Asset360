import { INITIAL_DEMO_DRIVERS } from './driver';
import { INITIAL_VEHICLES } from './vehicle';

export type FleetStatus =
  | 'active'
  | 'inactive'
  | 'on_hold'
  | 'scaling'
  | 'downsizing'
  | 'seasonal'
  | 'pilot'
  | 'decommissioning';

export interface Fleet {
  id: string; // internal stable identity, e.g. 'flt-1001'
  public_id: string; // visible FLT-xxxx public ID
  name: string; // required, <=191 characters
  company: string; // inherited from current workspace (e.g. 'Adani Port')
  parent: string; // optional parent Fleet internal ID, '' if none
  service_area: string; // optional configured area
  zone: string; // optional, constrained by area
  vendor: string; // optional master reference
  status: FleetStatus; // default active
  task: string; // descriptive <=191 chars
  driverIds: string[]; // existing driver record IDs
  vehicleIds: string[]; // existing vehicle record IDs
  driverVehicleAssignments: Record<string, string>; // vehicleId -> driverId
  created_at: string; // timestamp
  updated_at: string; // timestamp
}

export const FLEET_STATUSES: { code: FleetStatus; label: string; badgeClass: string }[] = [
  { code: 'active', label: 'Active', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { code: 'inactive', label: 'Inactive', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
  { code: 'on_hold', label: 'On Hold', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { code: 'scaling', label: 'Scaling', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { code: 'downsizing', label: 'Downsizing', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { code: 'seasonal', label: 'Seasonal', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { code: 'pilot', label: 'Pilot', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { code: 'decommissioning', label: 'Decommissioning', badgeClass: 'bg-red-50 text-red-700 border-red-200' }
];

export const FLEET_LOOKUPS = {
  serviceAreas: [
    'Mundra Port',
    'Hazira Operations',
    'Chennai Terminal',
    'Pune Hub',
    'Gurugram Control'
  ],
  serviceAreaZones: {
    'Mundra Port': ['Zone A (Berths 1-4)', 'Zone B (Container Terminal)', 'Zone C (Storage Yard)'],
    'Hazira Operations': ['Zone North', 'Zone South', 'Jetty Terminal'],
    'Chennai Terminal': ['Dock East', 'Dock West', 'CFS Zone'],
    'Pune Hub': ['Depot 1', 'Industrial Corridor'],
    'Gurugram Control': ['Expressway Corridor', 'NCR Logistics Hub']
  } as Record<string, string[]>,
  vendors: [
    'Western Logistics',
    'Gateway Transport',
    'Blue Line Haulage',
    'TMS Transporter'
  ]
};

export interface FleetColumnDef {
  key: string;
  label: string;
  group: 'Identity' | 'Coverage' | 'Hierarchy' | 'Relationships' | 'Operations' | 'Membership' | 'Audit';
  defaultShown: boolean;
  required?: boolean;
  minWidth: string;
  tooltip: string;
}

export const FLEET_12_COLUMNS_CATALOGUE: FleetColumnDef[] = [
  {
    key: 'name',
    label: 'Fleet Name',
    group: 'Identity',
    defaultShown: true,
    required: true,
    minWidth: '220px',
    tooltip: 'Fleet grouping label shown in directory; click to open the read-only Fleet Details drawer. Public ID appears below the name.'
  },
  {
    key: 'service_area',
    label: 'Service Area',
    group: 'Coverage',
    defaultShown: true,
    minWidth: '160px',
    tooltip: 'Optional area of operations, selected from the available service-area options; not a live geofence.'
  },
  {
    key: 'parent',
    label: 'Parent Fleet',
    group: 'Hierarchy',
    defaultShown: true,
    minWidth: '180px',
    tooltip: 'Display name of the immediate parent Fleet, not an inherited sum of members.'
  },
  {
    key: 'vendor',
    label: 'Vendor',
    group: 'Relationships',
    defaultShown: false,
    minWidth: '160px',
    tooltip: 'Optional vendor reference associated with this Fleet, distinct from account ownership and the Transporter relationship.'
  },
  {
    key: 'zone',
    label: 'Zone',
    group: 'Coverage',
    defaultShown: true,
    minWidth: '170px',
    tooltip: 'Operational zone within the selected Service Area; cannot select an invalid area/zone combination.'
  },
  {
    key: 'public_id',
    label: 'Public ID',
    group: 'Identity',
    defaultShown: false,
    minWidth: '130px',
    tooltip: 'Public Fleet identifier, for example FLT-1001; clicking can copy the ID.'
  },
  {
    key: 'company',
    label: 'Company',
    group: 'Identity',
    defaultShown: false,
    minWidth: '160px',
    tooltip: 'Workspace company owning this Fleet.'
  },
  {
    key: 'drivers_count',
    label: 'Drivers Count',
    group: 'Membership',
    defaultShown: true,
    minWidth: '140px',
    tooltip: 'Count of Drivers directly assigned to this Fleet; children do not roll up.'
  },
  {
    key: 'drivers_online_count',
    label: 'Drivers Online',
    group: 'Membership',
    defaultShown: false,
    minWidth: '140px',
    tooltip: 'Count of directly assigned Drivers whose existing Driver Master online flag is true; not Fleet Status.'
  },
  {
    key: 'vehicles_count',
    label: 'Vehicles Count',
    group: 'Membership',
    defaultShown: true,
    minWidth: '140px',
    tooltip: 'Count of Vehicles directly assigned to this Fleet; children do not roll up.'
  },
  {
    key: 'vehicles_online_count',
    label: 'Vehicles Online',
    group: 'Membership',
    defaultShown: false,
    minWidth: '140px',
    tooltip: 'Count of directly assigned Vehicles currently marked telematics online.'
  },
  {
    key: 'task',
    label: 'Task / Mission',
    group: 'Operations',
    defaultShown: true,
    minWidth: '200px',
    tooltip: 'Free-text Task / Mission description; not an executable trip, route or Orchestrator job.'
  },
  {
    key: 'status',
    label: 'Fleet Status',
    group: 'Operations',
    defaultShown: true,
    minWidth: '140px',
    tooltip: 'Fleet lifecycle/operational label; does not imply devices or resources are online.'
  },
  {
    key: 'created_at',
    label: 'Created At',
    group: 'Audit',
    defaultShown: true,
    minWidth: '150px',
    tooltip: 'Fleet creation timestamp, shown in local date/time format.'
  },
  {
    key: 'updated_at',
    label: 'Updated At',
    group: 'Audit',
    defaultShown: false,
    minWidth: '150px',
    tooltip: 'Last fleet record update timestamp, shown in local date/time format.'
  }
];

export const DEFAULT_FLEET_VISIBLE_COLUMNS = [
  'name',
  'service_area',
  'parent',
  'zone',
  'drivers_count',
  'vehicles_count',
  'task',
  'status',
  'created_at'
];

// Helper to compute live counts for a Fleet using referenced driver/vehicle pools
export function computeFleetCounts(fleet: Fleet) {
  const directDriversCount = fleet.driverIds ? fleet.driverIds.length : 0;
  const directVehiclesCount = fleet.vehicleIds ? fleet.vehicleIds.length : 0;

  // Compute online counts from referenced master records
  let driversOnlineCount = 0;
  if (fleet.driverIds && fleet.driverIds.length > 0) {
    fleet.driverIds.forEach((dId) => {
      const driverRecord = INITIAL_DEMO_DRIVERS.find((d) => d.id === dId);
      // In demo drivers, status === 'Active' simulates online
      if (driverRecord && driverRecord.status === 'Active') {
        driversOnlineCount++;
      }
    });
  }

  let vehiclesOnlineCount = 0;
  if (fleet.vehicleIds && fleet.vehicleIds.length > 0) {
    fleet.vehicleIds.forEach((vId) => {
      const vRecord = INITIAL_VEHICLES.find((v) => v.id === vId);
      if (vRecord && vRecord.online) {
        vehiclesOnlineCount++;
      }
    });
  }

  return {
    directDriversCount,
    driversOnlineCount,
    directVehiclesCount,
    vehiclesOnlineCount
  };
}

// 16 Deterministic Canonical Sample Fleets
export const INITIAL_DEMO_FLEETS: Fleet[] = [
  {
    id: 'flt-1001',
    public_id: 'FLT-1001',
    name: 'Adani Mundra Operations',
    company: 'Adani Port',
    parent: '',
    service_area: 'Mundra Port',
    zone: 'Zone A (Berths 1-4)',
    vendor: 'Western Logistics',
    status: 'active',
    task: 'Primary dock container movement and berthing logistics.',
    driverIds: ['drv-1', 'drv-2', 'drv-3'],
    vehicleIds: ['veh-1', 'veh-2', 'veh-3'],
    driverVehicleAssignments: {
      'veh-1': 'drv-1',
      'veh-2': 'drv-2'
    },
    created_at: '2026-09-15 08:30',
    updated_at: '2026-11-01 14:22'
  },
  {
    id: 'flt-1002',
    public_id: 'FLT-1002',
    name: 'Mundra Gate Logistics',
    company: 'Adani Port',
    parent: 'flt-1001',
    service_area: 'Mundra Port',
    zone: 'Zone B (Container Terminal)',
    vendor: 'Western Logistics',
    status: 'active',
    task: 'Inbound and outbound gate inspections and fast-track transit.',
    driverIds: ['drv-4', 'drv-5'],
    vehicleIds: ['veh-4', 'veh-5'],
    driverVehicleAssignments: {
      'veh-4': 'drv-4'
    },
    created_at: '2026-09-18 10:15',
    updated_at: '2026-10-28 11:45'
  },
  {
    id: 'flt-1003',
    public_id: 'FLT-1003',
    name: 'CT2 Loading Fleet',
    company: 'Adani Port',
    parent: 'flt-1001',
    service_area: 'Mundra Port',
    zone: 'Zone B (Container Terminal)',
    vendor: 'Gateway Transport',
    status: 'scaling',
    task: 'High-frequency container shuttle between berth and railhead.',
    driverIds: ['drv-6', 'drv-7'],
    vehicleIds: ['veh-6'],
    driverVehicleAssignments: {
      'veh-6': 'drv-6'
    },
    created_at: '2026-10-02 12:00',
    updated_at: '2026-11-05 09:10'
  },
  {
    id: 'flt-1004',
    public_id: 'FLT-1004',
    name: 'CT3 Terminal Fleet',
    company: 'Adani Port',
    parent: 'flt-1001',
    service_area: 'Mundra Port',
    zone: 'Zone C (Storage Yard)',
    vendor: 'Gateway Transport',
    status: 'on_hold',
    task: 'Storage yard staging and heavy container repositioning.',
    driverIds: ['drv-8'],
    vehicleIds: ['veh-7'],
    driverVehicleAssignments: {},
    created_at: '2026-10-10 14:40',
    updated_at: '2026-10-22 16:30'
  },
  {
    id: 'flt-1005',
    public_id: 'FLT-1005',
    name: 'Hazira Core Operations',
    company: 'Adani Port',
    parent: '',
    service_area: 'Hazira Operations',
    zone: 'Zone North',
    vendor: 'Blue Line Haulage',
    status: 'active',
    task: 'Liquid and bulk chemical freight transport at Hazira jetty.',
    driverIds: ['drv-9', 'drv-10'],
    vehicleIds: ['veh-8', 'veh-9'],
    driverVehicleAssignments: {
      'veh-8': 'drv-9',
      'veh-9': 'drv-10'
    },
    created_at: '2026-08-20 09:00',
    updated_at: '2026-10-30 17:15'
  },
  {
    id: 'flt-1006',
    public_id: 'FLT-1006',
    name: 'Hazira Feeder Fleet',
    company: 'Adani Port',
    parent: 'flt-1005',
    service_area: 'Hazira Operations',
    zone: 'Zone South',
    vendor: 'Blue Line Haulage',
    status: 'seasonal',
    task: 'Seasonal agricultural and fertilizer distribution.',
    driverIds: ['drv-11'],
    vehicleIds: ['veh-10'],
    driverVehicleAssignments: {
      'veh-10': 'drv-11'
    },
    created_at: '2026-09-01 11:20',
    updated_at: '2026-10-15 13:40'
  },
  {
    id: 'flt-1007',
    public_id: 'FLT-1007',
    name: 'PSA Chennai Fleet',
    company: 'Adani Port',
    parent: '',
    service_area: 'Chennai Terminal',
    zone: 'Dock East',
    vendor: 'TMS Transporter',
    status: 'active',
    task: 'East coast port terminal drayage and customs bonded movements.',
    driverIds: ['drv-12', 'drv-13'],
    vehicleIds: ['veh-11', 'veh-12'],
    driverVehicleAssignments: {
      'veh-11': 'drv-12'
    },
    created_at: '2026-07-14 07:45',
    updated_at: '2026-10-25 10:20'
  },
  {
    id: 'flt-1008',
    public_id: 'FLT-1008',
    name: 'Chennai CFS Connector',
    company: 'Adani Port',
    parent: 'flt-1007',
    service_area: 'Chennai Terminal',
    zone: 'CFS Zone',
    vendor: 'TMS Transporter',
    status: 'downsizing',
    task: 'Container freight station shuttle under fleet optimization.',
    driverIds: ['drv-14'],
    vehicleIds: ['veh-13'],
    driverVehicleAssignments: {},
    created_at: '2026-08-05 13:30',
    updated_at: '2026-11-02 08:50'
  },
  {
    id: 'flt-1009',
    public_id: 'FLT-1009',
    name: 'Pune Regional Haulage',
    company: 'Adani Port',
    parent: '',
    service_area: 'Pune Hub',
    zone: 'Industrial Corridor',
    vendor: 'Western Logistics',
    status: 'active',
    task: 'Automotive and engineering components transport to Mundra gateway.',
    driverIds: ['drv-15', 'drv-16'],
    vehicleIds: ['veh-14'],
    driverVehicleAssignments: {
      'veh-14': 'drv-15'
    },
    created_at: '2026-06-11 15:10',
    updated_at: '2026-11-04 12:35'
  },
  {
    id: 'flt-1010',
    public_id: 'FLT-1010',
    name: 'Gurugram Command Fleet',
    company: 'Adani Port',
    parent: '',
    service_area: 'Gurugram Control',
    zone: 'NCR Logistics Hub',
    vendor: 'Gateway Transport',
    status: 'pilot',
    task: 'Autonomous routing pilot and express inter-city dispatch testing.',
    driverIds: ['drv-17'],
    vehicleIds: ['veh-15'],
    driverVehicleAssignments: {
      'veh-15': 'drv-17'
    },
    created_at: '2026-10-18 09:30',
    updated_at: '2026-11-08 14:10'
  },
  {
    id: 'flt-1011',
    public_id: 'FLT-1011',
    name: 'Mundra Cold Chain Express',
    company: 'Adani Port',
    parent: 'flt-1001',
    service_area: 'Mundra Port',
    zone: 'Zone C (Storage Yard)',
    vendor: 'Western Logistics',
    status: 'seasonal',
    task: 'Reefer container movement for seafood and fruit export season.',
    driverIds: ['drv-18'],
    vehicleIds: ['veh-16'],
    driverVehicleAssignments: {
      'veh-16': 'drv-18'
    },
    created_at: '2026-09-22 16:00',
    updated_at: '2026-10-19 11:25'
  },
  {
    id: 'flt-1012',
    public_id: 'FLT-1012',
    name: 'Hazira Project Cargo',
    company: 'Adani Port',
    parent: 'flt-1005',
    service_area: 'Hazira Operations',
    zone: 'Jetty Terminal',
    vendor: 'Blue Line Haulage',
    status: 'inactive',
    task: 'Heavy over-dimensional cargo transport (inactive between contracts).',
    driverIds: [],
    vehicleIds: [],
    driverVehicleAssignments: {},
    created_at: '2026-05-10 10:00',
    updated_at: '2026-09-01 16:00'
  },
  {
    id: 'flt-1013',
    public_id: 'FLT-1013',
    name: 'Mundra Bulk Grain Fleet',
    company: 'Adani Port',
    parent: 'flt-1001',
    service_area: 'Mundra Port',
    zone: 'Zone A (Berths 1-4)',
    vendor: 'Western Logistics',
    status: 'decommissioning',
    task: 'Legacy bulk grain trucks transitioning to containerized transit.',
    driverIds: [],
    vehicleIds: [],
    driverVehicleAssignments: {},
    created_at: '2025-11-12 11:00',
    updated_at: '2026-10-01 09:40'
  },
  {
    id: 'flt-1014',
    public_id: 'FLT-1014',
    name: 'Pune Depot Shuttles',
    company: 'Adani Port',
    parent: 'flt-1009',
    service_area: 'Pune Hub',
    zone: 'Depot 1',
    vendor: 'Western Logistics',
    status: 'scaling',
    task: 'Internal depot transfers and empty container returns.',
    driverIds: ['drv-19'],
    vehicleIds: ['veh-17'],
    driverVehicleAssignments: {
      'veh-17': 'drv-19'
    },
    created_at: '2026-10-05 14:15',
    updated_at: '2026-11-06 15:30'
  },
  {
    id: 'flt-1015',
    public_id: 'FLT-1015',
    name: 'Chennai Port Transit',
    company: 'Adani Port',
    parent: 'flt-1007',
    service_area: 'Chennai Terminal',
    zone: 'Dock West',
    vendor: 'TMS Transporter',
    status: 'active',
    task: 'Inter-dock vessel transfer and priority discharge clearing.',
    driverIds: ['drv-20'],
    vehicleIds: ['veh-18'],
    driverVehicleAssignments: {
      'veh-18': 'drv-20'
    },
    created_at: '2026-08-30 11:10',
    updated_at: '2026-11-03 16:45'
  },
  {
    id: 'flt-1016',
    public_id: 'FLT-1016',
    name: 'Gurugram Express Corridor',
    company: 'Adani Port',
    parent: 'flt-1010',
    service_area: 'Gurugram Control',
    zone: 'Expressway Corridor',
    vendor: 'Gateway Transport',
    status: 'pilot',
    task: 'Dedicated high-speed container transit on Western Expressway.',
    driverIds: [],
    vehicleIds: [],
    driverVehicleAssignments: {},
    created_at: '2026-10-25 13:00',
    updated_at: '2026-11-07 10:15'
  }
];

// Hierarchy Cycle Detection Helper: checks if candidateParentId is self or descendant of fleetId
export function isDescendantOrSelf(fleetId: string, candidateParentId: string, allFleets: Fleet[]): boolean {
  if (!candidateParentId) return false;
  if (candidateParentId === fleetId) return true;

  const fleetMap = new Map<string, Fleet>();
  allFleets.forEach((f) => fleetMap.set(f.id, f));

  let currentId: string | undefined = candidateParentId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    if (currentId === fleetId) return true;
    const parentFleet = fleetMap.get(currentId);
    currentId = parentFleet ? parentFleet.parent : undefined;
  }

  return false;
}
