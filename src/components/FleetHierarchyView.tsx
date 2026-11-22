import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  Users,
  Truck,
  Eye,
  Search,
  ChevronsDown,
  ChevronsUp
} from 'lucide-react';
import { Fleet, FLEET_STATUSES, computeFleetCounts } from '../types/fleet';
import { INITIAL_DEMO_DRIVERS } from '../types/driver';
import { INITIAL_VEHICLES } from '../types/vehicle';

interface FleetHierarchyViewProps {
  fleets: Fleet[];
  onViewFleet: (fleet: Fleet) => void;
  expandedFleetId?: string | null;
}

export const FleetHierarchyView: React.FC<FleetHierarchyViewProps> = ({
  fleets,
  onViewFleet,
  expandedFleetId
}) => {
  const [memberFilter, setMemberFilter] = useState<'all' | 'drivers' | 'vehicles' | 'online'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (expandedFleetId) initial.add(expandedFleetId);
    // Expand root fleets by default
    fleets.filter((f) => !f.parent).forEach((f) => initial.add(f.id));
    return initial;
  });

  // Fast lookups for referenced driver and vehicle records
  const driverMap = useMemo(() => {
    const map = new Map();
    INITIAL_DEMO_DRIVERS.forEach((d) => map.set(d.id, d));
    return map;
  }, []);

  const vehicleMap = useMemo(() => {
    const map = new Map();
    INITIAL_VEHICLES.forEach((v) => map.set(v.id, v));
    return map;
  }, []);

  // Build root fleets (parent === '')
  const rootFleets = useMemo(() => {
    return fleets.filter((f) => !f.parent);
  }, [fleets]);

  // Child fleets map: parentId -> Fleet[]
  const childrenMap = useMemo(() => {
    const map = new Map<string, Fleet[]>();
    fleets.forEach((f) => {
      if (f.parent) {
        if (!map.has(f.parent)) {
          map.set(f.parent, []);
        }
        map.get(f.parent)!.push(f);
      }
    });
    return map;
  }, [fleets]);

  // Expand / Collapse all
  const handleExpandAll = () => {
    setExpandedIds(new Set(fleets.map((f) => f.id)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const toggleNode = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIds(next);
  };

  // Node search match check (checks fleet attributes, and direct member drivers/vehicles)
  const doesNodeMatchSearch = (fleet: Fleet, q: string): boolean => {
    if (!q) return true;
    if (
      fleet.name.toLowerCase().includes(q) ||
      fleet.public_id.toLowerCase().includes(q) ||
      fleet.task.toLowerCase().includes(q) ||
      fleet.status.toLowerCase().includes(q) ||
      fleet.service_area.toLowerCase().includes(q)
    ) {
      return true;
    }

    // Check member drivers
    if (fleet.driverIds) {
      const matchDriver = fleet.driverIds.some((dId) => {
        const d = driverMap.get(dId);
        return d && (d.name.toLowerCase().includes(q) || d.licence.toLowerCase().includes(q));
      });
      if (matchDriver) return true;
    }

    // Check member vehicles
    if (fleet.vehicleIds) {
      const matchVehicle = fleet.vehicleIds.some((vId) => {
        const v = vehicleMap.get(vId);
        return (
          v &&
          (v.registration_number.toLowerCase().includes(q) ||
            v.name.toLowerCase().includes(q))
        );
      });
      if (matchVehicle) return true;
    }

    // Check if any descendant matches
    const children = childrenMap.get(fleet.id) || [];
    return children.some((child) => doesNodeMatchSearch(child, q));
  };

  // Render a Fleet Node recursively
  const renderFleetNode = (fleet: Fleet, depth: number = 0, visited: Set<string> = new Set()) => {
    if (visited.has(fleet.id) || depth > 20) return null; // Cycle guard
    visited.add(fleet.id);

    const q = searchQuery.toLowerCase().trim();
    if (q && !doesNodeMatchSearch(fleet, q)) {
      return null;
    }

    const isExpanded = expandedIds.has(fleet.id) || Boolean(q);
    const childFleets = childrenMap.get(fleet.id) || [];
    const counts = computeFleetCounts(fleet);

    // Direct Drivers to show based on memberFilter
    let directDrivers = (fleet.driverIds || [])
      .map((dId) => driverMap.get(dId))
      .filter(Boolean);
    if (memberFilter === 'vehicles') {
      directDrivers = [];
    } else if (memberFilter === 'online') {
      directDrivers = directDrivers.filter((d) => d.status === 'Active');
    }

    // Direct Vehicles to show based on memberFilter
    let directVehicles = (fleet.vehicleIds || [])
      .map((vId) => vehicleMap.get(vId))
      .filter(Boolean);
    if (memberFilter === 'drivers') {
      directVehicles = [];
    } else if (memberFilter === 'online') {
      directVehicles = directVehicles.filter((v) => v.online);
    }

    const hasChildren = childFleets.length > 0 || directDrivers.length > 0 || directVehicles.length > 0;
    const statusDef = FLEET_STATUSES.find((s) => s.code === fleet.status);

    return (
      <div key={fleet.id} className="space-y-1">
        {/* Node Bar */}
        <div
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          className="pr-4 py-2.5 bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNode(fleet.id)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
            ) : (
              <div className="w-6" />
            )}

            <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#FA8A63] border border-orange-200 flex items-center justify-center shrink-0">
              <Layers size={14} />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-xs text-slate-900 truncate">{fleet.name}</span>
              <span className="font-mono text-[10px] text-slate-400 shrink-0">
                {fleet.public_id}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  statusDef?.badgeClass || 'bg-slate-100 text-slate-600'
                }`}
              >
                {statusDef?.label || fleet.status}
              </span>
              {fleet.service_area && (
                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] shrink-0">
                  {fleet.service_area}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Users size={12} className="text-slate-400" />
                {counts.directDriversCount}
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Truck size={12} className="text-slate-400" />
                {counts.directVehiclesCount}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onViewFleet(fleet)}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="View fleet details"
            >
              <Eye size={12} className="text-slate-500" />
              <span>View</span>
            </button>
          </div>
        </div>

        {/* Expanded Children and Direct Members */}
        {isExpanded && (
          <div className="space-y-1">
            {/* Direct Driver Members */}
            {directDrivers.map((driver) => (
              <div
                key={`${fleet.id}-drv-${driver.id}`}
                style={{ paddingLeft: `${(depth + 1) * 24 + 20}px` }}
                className="pr-4 py-1.5 bg-slate-50/50 hover:bg-slate-100/60 border border-slate-100 rounded-lg flex items-center justify-between text-xs text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                    D
                  </div>
                  <span className="font-medium text-slate-900">{driver.name}</span>
                  <span className="font-mono text-[10px] text-slate-400">DL: {driver.licence}</span>
                </div>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    driver.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {driver.status === 'Active' ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}

            {/* Direct Vehicle Members */}
            {directVehicles.map((vehicle) => (
              <div
                key={`${fleet.id}-veh-${vehicle.id}`}
                style={{ paddingLeft: `${(depth + 1) * 24 + 20}px` }}
                className="pr-4 py-1.5 bg-slate-50/50 hover:bg-slate-100/60 border border-slate-100 rounded-lg flex items-center justify-between text-xs text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-orange-50 text-[#FA8A63] flex items-center justify-center text-[10px] font-bold">
                    V
                  </div>
                  <span className="font-mono font-medium text-slate-900">
                    {vehicle.registration_number}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {vehicle.name} {vehicle.model ? `• ${vehicle.model}` : ''}
                  </span>
                </div>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    vehicle.online
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {vehicle.online ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}

            {/* Nested Child Fleets */}
            {childFleets.map((child) => renderFleetNode(child, depth + 1, new Set(visited)))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-4">
      {/* Hierarchy Controls Toolbar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4">
        {/* Search in hierarchy */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search loaded fleets, drivers or vehicles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#FA8A63]"
          />
        </div>

        {/* Member filter segments */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'drivers', label: 'Drivers' },
            { id: 'vehicles', label: 'Vehicles' },
            { id: 'online', label: 'Online' }
          ].map((seg) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => setMemberFilter(seg.id as any)}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                memberFilter === seg.id
                  ? 'bg-white text-[#FA8A63] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {seg.label}
            </button>
          ))}
        </div>

        {/* Expand / Collapse All */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExpandAll}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <ChevronsDown size={13} />
            <span>Expand all</span>
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <ChevronsUp size={13} />
            <span>Collapse all</span>
          </button>
        </div>
      </div>

      {/* Tree View Content */}
      <div className="space-y-2">
        {rootFleets.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-xl">
            No fleet hierarchy yet. Create fleets with parent assignments to see tree relationships.
          </div>
        ) : (
          rootFleets.map((root) => renderFleetNode(root, 0))
        )}
      </div>
    </div>
  );
};
