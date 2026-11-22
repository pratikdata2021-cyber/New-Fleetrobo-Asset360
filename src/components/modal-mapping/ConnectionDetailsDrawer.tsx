import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Cpu,
  Radio,
  Smartphone,
  Link2,
  Truck,
  History,
  StopCircle,
  Download
} from 'lucide-react';
import {
  ConnectionRecord,
  HardwareBinding,
  ResourceAllocation,
  HardwareBindingStatus,
  ResourceAllocationStatus,
  ConnectionLifecycleStatus,
  computeHardwareBindingStatus,
  computeResourceAllocationStatus,
  formatDateTimeWithTz
} from '../../types/modalMaster';
import { RowActionMenu } from '../common/RowActionMenu';

export type DetailsDrawerTab = 'overview' | 'hardware' | 'bindings' | 'resources' | 'activity';

interface ConnectionDetailsDrawerProps {
  connection: ConnectionRecord;
  initialTab: DetailsDrawerTab;
  allBindings: HardwareBinding[];
  allAllocations: ResourceAllocation[];
  canEdit: boolean;
  onClose: () => void;
  onEdit: (conn: ConnectionRecord) => void;
  onEndBinding: (binding: HardwareBinding) => void;
  onExportRecord: (conn: ConnectionRecord) => void;
}

export const ConnectionDetailsDrawer: React.FC<ConnectionDetailsDrawerProps> = ({
  connection,
  initialTab,
  allBindings,
  allAllocations,
  canEdit,
  onClose,
  onEdit,
  onEndBinding,
  onExportRecord
}) => {
  const [activeTab, setActiveTab] = useState<DetailsDrawerTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, connection.id]);

  const connBindings = allBindings.filter((b) => b.connectionId === connection.id);
  const connAllocations = allAllocations.filter((a) => a.connectionId === connection.id);

  const memberMap = new Map(connection.members.map((m) => [m.hardwareId, m]));

  const statusBadge = (status: ConnectionLifecycleStatus) => {
    const map: Record<ConnectionLifecycleStatus, string> = {
      Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Draft: 'bg-slate-100 text-slate-700 border-slate-200',
      Scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
      Inactive: 'bg-zinc-100 text-zinc-600 border-zinc-200',
      'Needs Attention': 'bg-amber-50 text-amber-800 border-amber-200'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${map[status]}`}>
        {status}
      </span>
    );
  };

  const bindingStatusBadge = (st: HardwareBindingStatus) => {
    const map: Record<HardwareBindingStatus, string> = {
      Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
      Ended: 'bg-slate-100 text-slate-600 border-slate-200',
      Conflict: 'bg-rose-50 text-rose-700 border-rose-200',
      Canceled: 'bg-zinc-100 text-zinc-500 border-zinc-200'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[st]}`}>
        {st}
      </span>
    );
  };

  const allocStatusBadge = (st: ResourceAllocationStatus) => {
    const map: Record<ResourceAllocationStatus, string> = {
      Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
      Ended: 'bg-slate-100 text-slate-600 border-slate-200',
      Conflict: 'bg-rose-50 text-rose-700 border-rose-200'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${map[st]}`}>
        {st}
      </span>
    );
  };

  const categoryIcon = (cat: string) => {
    if (cat === 'Device') return <Cpu className="w-3.5 h-3.5 text-indigo-600" />;
    if (cat === 'Sensor') return <Radio className="w-3.5 h-3.5 text-purple-600" />;
    return <Smartphone className="w-3.5 h-3.5 text-emerald-600" />;
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/35 backdrop-blur-[1px]">
      <div className="w-full max-w-[660px] bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[12px] font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                {connection.id}
              </span>
              {statusBadge(connection.status)}
              <span className="text-[11px] font-medium text-slate-500">{connection.companyName}</span>
            </div>
            <h2 className="text-[15px] font-bold text-slate-900 mt-1 truncate">{connection.name}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onExportRecord(connection)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(connection)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#F26522] hover:bg-[#d95417] text-white text-[11px] font-semibold cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Mapping
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Tabs */}
        <div className="px-5 border-b border-slate-200 bg-white flex items-center gap-5 shrink-0">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'hardware', label: `Hardware (${connection.members.length})` },
              { id: 'bindings', label: `Bindings (${connBindings.length})` },
              { id: 'resources', label: `Resources (${connAllocations.length})` },
              { id: 'activity', label: `Activity (${connection.activity?.length || 0})` }
            ] as { id: DetailsDrawerTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`relative py-2.5 text-[12px] font-semibold cursor-pointer transition-colors ${
                activeTab === t.id ? 'text-[#F26522]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
              {activeTab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F26522] rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-[12px]">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Connection ID</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">{connection.id}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Client Organization</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{connection.companyName}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Lifecycle Status</div>
                  <div className="mt-0.5">{statusBadge(connection.status)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Purpose / Description</div>
                  <div className="text-slate-700 mt-0.5">{connection.description || 'No description recorded.'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Created By / On</div>
                  <div className="text-slate-700 mt-0.5">
                    {connection.createdBy} · {formatDateTimeWithTz(connection.createdAt, 'Asia/Kolkata')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Last Updated By / On</div>
                  <div className="text-slate-700 mt-0.5">
                    {connection.updatedBy} · {formatDateTimeWithTz(connection.updatedAt, 'Asia/Kolkata')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('hardware')}
                  className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-[#F26522]/40 cursor-pointer"
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Devices</div>
                  <div className="text-[18px] font-bold text-slate-900 mt-0.5">
                    {connection.members.filter((m) => m.category === 'Device').length}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('hardware')}
                  className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-[#F26522]/40 cursor-pointer"
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Sensors</div>
                  <div className="text-[18px] font-bold text-slate-900 mt-0.5">
                    {connection.members.filter((m) => m.category === 'Sensor').length}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('hardware')}
                  className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-[#F26522]/40 cursor-pointer"
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase">SIMs</div>
                  <div className="text-[18px] font-bold text-slate-900 mt-0.5">
                    {connection.members.filter((m) => m.category === 'SIM').length}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bindings')}
                  className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-[#F26522]/40 cursor-pointer"
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Bindings</div>
                  <div className="text-[18px] font-bold text-[#F26522] mt-0.5">{connBindings.length}</div>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'hardware' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase">
                Registered Hardware Inventory ({connection.members.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Type / Model</th>
                      <th className="px-3 py-2">Identifier Type</th>
                      <th className="px-3 py-2">Unique Identifier</th>
                      <th className="px-3 py-2">Registry Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {connection.members.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                          No physical hardware attached yet.
                        </td>
                      </tr>
                    ) : (
                      connection.members.map((m) => (
                        <tr key={m.hardwareId} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                              {categoryIcon(m.category)}
                              {m.category}
                              {false && m.isPrimary && (
                                <span className="px-1.5 py-0.2 rounded bg-orange-50 text-[#F26522] border border-orange-200 text-[9px] font-bold">
                                  Primary
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{m.modelLabel}</td>
                          <td className="px-3 py-2.5 text-slate-500">{m.identifierType}</td>
                          <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">{m.identifierValue}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {m.registrationStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'bindings' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase">
                  Pairwise Hardware Bindings ({connBindings.length})
                </span>
                <span className="text-[11px] text-slate-500">Independent date-time validity per pair</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">Binding ID</th>
                      <th className="px-3 py-2">From → To</th>
                      <th className="px-3 py-2">Mode</th>
                      <th className="px-3 py-2">Effective Start</th>
                      <th className="px-3 py-2">Effective End</th>
                      <th className="px-3 py-2">Status</th>
                      {canEdit && <th className="px-3 py-2 text-right w-[68px]">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {connBindings.length === 0 ? (
                      <tr>
                        <td colSpan={canEdit ? 7 : 6} className="px-4 py-6 text-center text-slate-400">
                          0 hardware-to-hardware bindings recorded (single-unit or draft connection).
                        </td>
                      </tr>
                    ) : (
                      connBindings.map((b) => {
                        const fromMem = memberMap.get(b.fromHardwareId);
                        const toMem = memberMap.get(b.toHardwareId);
                        const st = computeHardwareBindingStatus(b, allBindings, connection.members);
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">{b.id}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1 font-mono text-[11px] text-slate-900">
                                <span>{fromMem?.identifierValue || b.fromHardwareId}</span>
                                <Link2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{toMem?.identifierValue || b.toHardwareId}</span>
                              </div>
                              {b.portOrSlot && (
                                <div className="text-[10px] text-slate-500">Port/Slot: {b.portOrSlot}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-700">{b.mode}</td>
                            <td className="px-3 py-2.5 text-[11px] text-slate-700 whitespace-nowrap">
                              {formatDateTimeWithTz(b.effectiveStartAt, b.timezone, true)}
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-slate-700 whitespace-nowrap">
                              {b.endedAt || b.effectiveEndAt
                                ? formatDateTimeWithTz(b.endedAt || b.effectiveEndAt, b.timezone, true)
                                : 'Open-ended'}
                            </td>
                            <td className="px-3 py-2.5">{bindingStatusBadge(st.status)}</td>
                            {canEdit && (
                              <td className="px-3 py-2.5 text-right">
                                {st.status !== 'Ended' && st.status !== 'Canceled' ? (
                                  <div className="inline-flex items-center justify-end">
                                    <RowActionMenu
                                      ariaLabel={`Actions for binding ${b.id}`}
                                      menuWidthClass="w-44"
                                      items={[
                                        {
                                          id: 'end-binding',
                                          label: 'End Binding',
                                          icon: <StopCircle className="w-3.5 h-3.5" />,
                                          tone: 'danger',
                                          onClick: () => onEndBinding(b),
                                        },
                                      ]}
                                    />
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Preserved</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase">
                Resource Allocations ({connAllocations.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">Allocation ID</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Identifier</th>
                      <th className="px-3 py-2">Effective Start</th>
                      <th className="px-3 py-2">Effective End</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {connAllocations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                          No Vehicle or Driver resources allocated to this connection.
                        </td>
                      </tr>
                    ) : (
                      connAllocations.map((a, idx) => {
                        const st = computeResourceAllocationStatus(a, allAllocations);
                        return (
                          <tr key={`${a.id}-${idx}`} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">{a.id}</td>
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                                <Truck className="w-3.5 h-3.5 text-slate-400" />
                                {a.resourceType}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-slate-900">{a.resourceIdentifier}</div>
                              <div className="text-[10px] text-slate-500">{a.resourceDisplayName}</div>
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-slate-700 whitespace-nowrap">
                              {formatDateTimeWithTz(a.effectiveStartAt, a.timezone)}
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-slate-700 whitespace-nowrap">
                              {a.endedAt || a.effectiveEndAt
                                ? formatDateTimeWithTz(a.endedAt || a.effectiveEndAt, a.timezone)
                                : 'Open-ended'}
                            </td>
                            <td className="px-3 py-2.5">{allocStatusBadge(st.status)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-2.5">
              {(connection.activity || []).length === 0 ? (
                <div className="p-6 text-center text-[12px] text-slate-400 border border-slate-200 rounded-xl">
                  No activity entries recorded yet.
                </div>
              ) : (
                (connection.activity || []).map((entry) => (
                  <div key={entry.id} className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-900">
                        <History className="w-3.5 h-3.5 text-[#F26522]" />
                        {entry.action}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatDateTimeWithTz(entry.timestamp, 'Asia/Kolkata')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      Actor: <span className="font-semibold text-slate-800">{entry.actor}</span>
                    </div>
                    {entry.beforeSummary && (
                      <div className="text-[11px] text-slate-500 mt-1">Before: {entry.beforeSummary}</div>
                    )}
                    <div className="text-[11px] text-slate-700 mt-0.5 bg-slate-50 rounded px-2 py-1 border border-slate-100">
                      {entry.afterSummary}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
