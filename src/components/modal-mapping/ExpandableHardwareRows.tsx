import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Radio,
  Thermometer,
  Camera,
  Film,
  CreditCard,
  Link2,
  Infinity as InfinityIcon,
  Clock,
  Calendar,
  ArrowRight,
  Eye,
  Edit2,
  History,
  AlertTriangle,
  X,
  StopCircle
} from 'lucide-react';
import {
  ConnectionRecord,
  HardwareBinding,
  HardwareBindingMode,
  HardwareMembership,
  SUPPORTED_TIMEZONES,
  ExpandableBindingDisplayStatus,
  buildExpandableBindingRows,
  formatDateTimeWithTz,
  formatLocalInputParts,
  buildIsoWithTimezone,
  validateHardwareBindingPair
} from '../../types/modalMaster';
import { DetailsDrawerTab } from './ConnectionDetailsDrawer';
import { RowActionMenu } from '../common/RowActionMenu';

// §5 Hardware Icon Badge (Device=blue, DVR/MDVR=blue recorder, IP Camera=blue camera,
// Sensor=purple, Temp Sensor=purple thermometer, SIM=green SIM card)
export const HardwareUnitIcon: React.FC<{
  category: HardwareMembership['category'];
  modelLabel?: string;
  size?: 'sm' | 'md';
}> = ({ category, modelLabel = '', size = 'md' }) => {
  const lbl = modelLabel.toLowerCase();
  const boxCls =
    size === 'sm'
      ? 'w-6 h-6 rounded-md border flex items-center justify-center shrink-0'
      : 'w-7 h-7 rounded-lg border flex items-center justify-center shrink-0';
  const iconCls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  if (category === 'SIM') {
    return (
      <span className={`${boxCls} bg-emerald-50 border-emerald-200 text-emerald-600`} title="SIM Card">
        <CreditCard className={iconCls} />
      </span>
    );
  }
  if (category === 'Sensor') {
    const isTemp = lbl.includes('temp');
    return (
      <span
        className={`${boxCls} bg-purple-50 border-purple-200 text-purple-600`}
        title={isTemp ? 'Temperature Sensor' : 'Sensor'}
      >
        {isTemp ? <Thermometer className={iconCls} /> : <Radio className={iconCls} />}
      </span>
    );
  }
  // Device (including DVR/MDVR, IP Camera, Gateways)
  const isIpCam = lbl.includes('ip camera') || lbl.includes('camera');
  const isDvr = lbl.includes('dvr') || lbl.includes('mdvr') || lbl.includes('cctv');
  return (
    <span
      className={`${boxCls} bg-sky-50 border-sky-200 text-sky-600`}
      title={isIpCam ? 'IP Camera' : isDvr ? 'DVR / MDVR' : 'Device'}
    >
      {isIpCam ? (
        <Camera className={iconCls} />
      ) : isDvr ? (
        <Film className={iconCls} />
      ) : (
        <Cpu className={iconCls} />
      )}
    </span>
  );
};

// Compact Hardware Summary Chips (Screenshot style: [blue Device N] [purple Sensor N] [green SIM N])
export const HardwareCountChips: React.FC<{
  members: HardwareMembership[];
  onClick?: () => void;
}> = ({ members, onClick }) => {
  const devCount = members.filter((m) => m.category === 'Device').length;
  const senCount = members.filter((m) => m.category === 'Sensor').length;
  const simCount = members.filter((m) => m.category === 'SIM').length;
  const hasTemp = members.some(
    (m) => m.category === 'Sensor' && m.modelLabel.toLowerCase().includes('temp')
  );

  if (members.length === 0) {
    return <span className="text-[11px] text-slate-400 italic">No hardware</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 flex-wrap cursor-pointer text-left"
      title={members.map((m) => `${m.identifierValue} (${m.category})`).join(' · ')}
    >
      {devCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-bold tabular-nums">
          <Cpu className="w-3 h-3 text-sky-600" />
          {devCount}
        </span>
      )}
      {senCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-bold tabular-nums">
          {hasTemp && senCount === 1 ? (
            <Thermometer className="w-3 h-3 text-purple-600" />
          ) : (
            <Radio className="w-3 h-3 text-purple-600" />
          )}
          {senCount}
        </span>
      )}
      {simCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold tabular-nums">
          <CreditCard className="w-3 h-3 text-emerald-600" />
          {simCount}
        </span>
      )}
    </button>
  );
};

const BindingStatusPill: React.FC<{
  status: ExpandableBindingDisplayStatus;
  reason?: string;
}> = ({ status, reason }) => {
  const styles: Record<ExpandableBindingDisplayStatus, string> = {
    'Root (Primary)': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Bound: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
    Expired: 'bg-slate-100 text-slate-600 border-slate-200',
    Conflict: 'bg-rose-50 text-rose-700 border-rose-200',
    Canceled: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    Unbound: 'bg-amber-50 text-amber-700 border-amber-200'
  };
  const dots: Record<ExpandableBindingDisplayStatus, string> = {
    'Root (Primary)': 'bg-emerald-500',
    Bound: 'bg-emerald-500',
    Scheduled: 'bg-sky-500',
    Expired: 'bg-slate-400',
    Conflict: 'bg-rose-500',
    Canceled: 'bg-zinc-400',
    Unbound: 'bg-amber-500'
  };
  return (
    <span
      title={reason || status}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${styles[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {status}
    </span>
  );
};

interface ExpandableHardwareRowsProps {
  variant: 'connection' | 'resource';
  connection: ConnectionRecord;
  connectionBindings: HardwareBinding[];
  allGlobalBindings: HardwareBinding[];
  scopeHardwareId?: string | null;
  canEdit: boolean;
  onOpenDetails: (conn: ConnectionRecord, tab: DetailsDrawerTab) => void;
  onSaveBinding: (updated: HardwareBinding) => void;
  onEndBinding: (binding: HardwareBinding) => void;
}

export const ExpandableHardwareRows: React.FC<ExpandableHardwareRowsProps> = ({
  variant,
  connection,
  connectionBindings,
  allGlobalBindings,
  scopeHardwareId = null,
  canEdit,
  onOpenDetails,
  onSaveBinding,
  onEndBinding
}) => {
  const [hoveredParentId, setHoveredParentId] = useState<string | null>(null);
  const [editingBinding, setEditingBinding] = useState<HardwareBinding | null>(null);

  // Edit binding modal form state
  const [editFromId, setEditFromId] = useState('');
  const [editMode, setEditMode] = useState<HardwareBindingMode>('Permanent');
  const [editTz, setEditTz] = useState('Asia/Kolkata');
  const [editStartDate, setEditStartDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('10:30:00');
  const [editEndDate, setEditEndDate] = useState('');
  const [editEndTime, setEditEndTime] = useState('23:59:59');
  const [editPort, setEditPort] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      buildExpandableBindingRows(
        connection.members || [],
        connectionBindings,
        allGlobalBindings,
        scopeHardwareId
      ),
    [connection.members, connectionBindings, allGlobalBindings, scopeHardwareId]
  );

  const openEditBindingModal = (b: HardwareBinding) => {
    const tz = b.timezone || 'Asia/Kolkata';
    const st = formatLocalInputParts(b.effectiveStartAt, tz);
    const en = b.effectiveEndAt
      ? formatLocalInputParts(b.effectiveEndAt, tz)
      : { date: '2026-11-28', time: '23:59:59' };
    setEditingBinding(b);
    setEditFromId(b.fromHardwareId);
    setEditMode(b.mode);
    setEditTz(tz);
    setEditStartDate(st.date || '2026-11-13');
    setEditStartTime(st.time || '10:30:00');
    setEditEndDate(en.date);
    setEditEndTime(en.time);
    setEditPort(b.portOrSlot || '');
    setEditNotes(b.notes || '');
    setEditError(null);
  };

  const handleSubmitEditBinding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBinding) return;
    const startIso = buildIsoWithTimezone(editStartDate, editStartTime, editTz);
    const endIso = editMode === 'Temporal' ? buildIsoWithTimezone(editEndDate, editEndTime, editTz) : null;

    const { errors } = validateHardwareBindingPair(
      {
        id: editingBinding.id,
        connectionId: editingBinding.connectionId,
        fromHardwareId: editFromId,
        toHardwareId: editingBinding.toHardwareId,
        mode: editMode,
        effectiveStartAt: startIso,
        effectiveEndAt: endIso,
        timezone: editTz,
        portOrSlot: editPort.trim() || null
      },
      connection.members || [],
      connectionBindings,
      allGlobalBindings
    );
    if (errors.length > 0) {
      setEditError(errors[0]);
      return;
    }

    onSaveBinding({
      ...editingBinding,
      fromHardwareId: editFromId,
      mode: editMode,
      effectiveStartAt: startIso,
      effectiveEndAt: endIso,
      endedAt: null,
      timezone: editTz,
      portOrSlot: editPort.trim() || null,
      notes: editNotes.trim(),
      updatedAt: new Date().toISOString()
    });
    setEditingBinding(null);
  };

  const formatCompactModel = (modelLabel: string) => {
    const parts = modelLabel.split(' · ').map((p) => p.trim());
    if (parts.length >= 3) return { title: parts[0], sub: `${parts[1]} · ${parts[2]}` };
    return { title: parts[0] || modelLabel, sub: parts.slice(1).join(' · ') };
  };

  const editingTargetMem = editingBinding
    ? (connection.members || []).find((m) => m.hardwareId === editingBinding.toHardwareId)
    : null;
  const parentCandidates = (connection.members || []).filter(
    (m) =>
      (m.category === 'Device' || (editingTargetMem?.category === 'SIM' && m.category === 'Sensor')) &&
      editingBinding &&
      m.hardwareId !== editingBinding.toHardwareId
  );

  // Tree connector cell shared across both variants
  const renderTreeHardwareCell = (row: (typeof rows)[number], index: number) => {
    const { member, depth, ancestorHasNext, isLastSibling, isPrimaryRoot, isAdditionalBindingRef, binding } =
      row;
    const modelInfo = formatCompactModel(member.modelLabel);
    const isParentHighlighted = hoveredParentId === member.hardwareId;
    const hasChild = rows.some((r) => r.binding?.fromHardwareId === member.hardwareId);

    if (depth === 0) {
      return (
        <div className="flex items-center relative">
          {/* Anchor dot & downward stem for Root when it has bound children */}
          <div className="w-5 shrink-0 flex flex-col items-center justify-center relative self-stretch">
            <span className="w-2 h-2 rounded-full border border-slate-400 bg-white z-10" />
            {hasChild && (
              <span className="w-[1.5px] bg-slate-300 absolute top-1/2 bottom-[-10px]" />
            )}
          </div>
          <div
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
              isParentHighlighted
                ? 'bg-[#FFEADB] border-[#F26522] ring-2 ring-[#F26522]/25'
                : isPrimaryRoot
                ? 'bg-[#FFF5EE] border-[#FED7AA]'
                : 'bg-white border-slate-200'
            }`}
            title={`${member.identifierType}: ${member.identifierValue} · ${member.modelLabel}`}
          >
            <HardwareUnitIcon category={member.category} modelLabel={member.modelLabel} />
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-[12px] text-slate-900">
                  {member.identifierValue}
                </span>
                {isPrimaryRoot && (
                  <span className="text-[10px] font-semibold text-[#F26522]">Primary</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 truncate max-w-[230px]">
                {modelInfo.title}
                {modelInfo.sub ? ` · ${modelInfo.sub}` : ''}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Check if there is a next row in same subtree stem at depth 0
    const nextRowExistsAtAnyLevel = index < rows.length - 1;
    const isFinalOverall = isLastSibling && !nextRowExistsAtAnyLevel;

    return (
      <div className="flex items-center self-stretch relative">
        {/* Ancestor vertical guide columns */}
        {Array.from({ length: depth - 1 }).map((_, lvl) => (
          <div key={lvl} className="w-5 shrink-0 self-stretch relative flex justify-center">
            {ancestorHasNext[lvl] && (
              <span className="w-[1.5px] bg-slate-300 absolute top-[-10px] bottom-[-10px]" />
            )}
          </div>
        ))}

        {/* Current level elbow branch: vertical stem + horizontal connector + node dot / arrow */}
        <div className="w-7 shrink-0 self-stretch relative flex items-center">
          <span
            className={`w-[1.5px] bg-slate-300 absolute left-[9px] top-[-10px] ${
              isLastSibling ? 'h-[calc(50%+10px)]' : 'bottom-[-10px]'
            }`}
          />
          <span className="h-[1.5px] bg-slate-300 absolute left-[9px] right-1 top-1/2" />
          {isFinalOverall ? (
            <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] leading-none font-bold">
              ▸
            </span>
          ) : (
            <span className="w-2 h-2 rounded-full border border-slate-400 bg-white absolute right-1 top-1/2 -translate-y-1/2 z-10" />
          )}
        </div>

        <div
          className={`flex items-center gap-2.5 py-0.5 rounded-md transition-colors ${
            isParentHighlighted ? 'bg-[#FFF3EE] px-1.5 ring-1 ring-[#F26522]/40' : ''
          }`}
          title={
            binding
              ? `Binding ${binding.id}: ${row.parentMember?.identifierValue || binding.fromHardwareId} → ${member.identifierValue}${binding.portOrSlot ? ` (${binding.portOrSlot})` : ''}`
              : member.identifierValue
          }
        >
          <HardwareUnitIcon category={member.category} modelLabel={member.modelLabel} />
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-bold text-[12px] text-slate-900">
                {member.identifierValue}
              </span>
              {binding?.portOrSlot && (
                <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-600">
                  {binding.portOrSlot}
                </span>
              )}
              {isAdditionalBindingRef && binding && (
                <span className="px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200 text-[10px] font-medium text-amber-700">
                  Additional binding ({binding.id})
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 truncate max-w-[230px]">
              {modelInfo.title}
              {modelInfo.sub ? ` · ${modelInfo.sub}` : ''}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (rows.length === 0) {
    return (
      <div className="px-10 py-4 bg-[#F8FAFC] border-t border-slate-200 text-[12px] text-slate-500 flex items-center justify-between">
        <span>No hardware units recorded in this connection yet.</span>
        <button
          type="button"
          onClick={() => onOpenDetails(connection, 'hardware')}
          className="text-[#F26522] font-semibold hover:underline cursor-pointer"
        >
          Inspect Connection
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] border-t border-b border-slate-200/90 px-4 py-2.5">
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <table className="w-full border-collapse text-left">
          <thead>
            {variant === 'connection' ? (
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2 pl-3 pr-2 w-10 text-center">#</th>
                <th className="py-2 px-2.5 min-w-[270px]">Connected Hardware</th>
                <th className="py-2 px-2.5 min-w-[85px]">Category</th>
                <th className="py-2 px-2.5 min-w-[170px]">Model / Reference</th>
                <th className="py-2 px-2.5 min-w-[110px]">Identifier Type</th>
                <th className="py-2 px-2.5 min-w-[140px]">Unique Identifier</th>
                <th className="py-2 px-2.5 min-w-[130px]">Connected To</th>
                <th className="py-2 px-2.5 min-w-[115px]">Binding Mode</th>
                <th className="py-2 px-2.5 min-w-[155px]">Effective Start</th>
                <th className="py-2 px-2.5 min-w-[155px]">Effective End</th>
                <th className="py-2 px-2.5 min-w-[115px]">Binding Status</th>
                <th className="py-2 pl-2.5 pr-3 text-right w-[72px]">Actions</th>
              </tr>
            ) : (
              <tr className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2 pl-3 pr-2 w-10 text-center">#</th>
                <th className="py-2 px-2.5 min-w-[285px]">Connection / Relationship</th>
                <th className="py-2 px-2.5 min-w-[150px]">From Hardware (Primary)</th>
                <th className="py-2 px-1 w-7 text-center"></th>
                <th className="py-2 px-2.5 min-w-[165px]">To Hardware (Connected)</th>
                <th className="py-2 px-2.5 min-w-[115px]">Binding Mode</th>
                <th className="py-2 px-2.5 min-w-[155px]">Effective Start</th>
                <th className="py-2 px-2.5 min-w-[155px]">Effective End</th>
                <th className="py-2 px-2.5 min-w-[120px]">Status</th>
                <th className="py-2 pl-2.5 pr-3 text-right w-[72px]">Actions</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100 text-[12px]">
            {rows.map((row, idx) => {
              const { member, parentMember, binding, displayStatus, statusReason } = row;
              const isParentHighlighted = hoveredParentId === member.hardwareId;
              const modelParts = member.modelLabel.split(' · ');

              return (
                <tr
                  key={row.rowKey}
                  onMouseEnter={() => {
                    if (binding?.fromHardwareId) setHoveredParentId(binding.fromHardwareId);
                  }}
                  onMouseLeave={() => setHoveredParentId(null)}
                  className={`transition-colors ${
                    isParentHighlighted ? 'bg-[#FFF3EE]/60' : 'hover:bg-slate-50/90'
                  }`}
                >
                  {/* # */}
                  <td className="py-2 pl-3 pr-2 text-center text-[11px] font-medium text-slate-500 tabular-nums">
                    {row.rowNumber}
                  </td>

                  {/* Tree Hardware Column */}
                  <td className="py-1.5 px-2.5">{renderTreeHardwareCell(row, idx)}</td>

                  {variant === 'connection' ? (
                    <>
                      {/* Category */}
                      <td className="py-2 px-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            member.category === 'Device'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : member.category === 'Sensor'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {member.category}
                        </span>
                      </td>

                      {/* Model / Reference */}
                      <td className="py-2 px-2.5 text-[11.5px] text-slate-700">
                        <div className="font-medium text-slate-800 truncate max-w-[175px]" title={member.modelLabel}>
                          {modelParts[0]}
                        </div>
                        {modelParts.length > 1 && (
                          <div className="text-[10.5px] text-slate-400 truncate max-w-[175px]">
                            {modelParts.slice(1).join(' · ')}
                          </div>
                        )}
                      </td>

                      {/* Identifier Type */}
                      <td className="py-2 px-2.5 text-[11px] text-slate-600 font-medium whitespace-nowrap">
                        {member.identifierType}
                      </td>

                      {/* Unique Identifier */}
                      <td className="py-2 px-2.5 font-mono text-[11.5px] font-semibold text-slate-900 whitespace-nowrap">
                        {member.identifierValue}
                      </td>

                      {/* Connected To (Parent Identifier) */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {parentMember ? (
                          <span
                            className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-semibold text-slate-800"
                            title={`Parent: ${parentMember.identifierValue} (${parentMember.modelLabel})`}
                          >
                            <Link2 className="w-3 h-3 text-slate-400" />
                            {parentMember.identifierValue}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      {/* From Hardware (Primary) */}
                      <td className="py-2 px-2.5">
                        {binding ? (
                          <div
                            className="flex items-center gap-2"
                            title={
                              parentMember
                                ? `${parentMember.identifierValue} · ${parentMember.modelLabel}`
                                : binding.fromHardwareId
                            }
                          >
                            <HardwareUnitIcon
                              category={parentMember?.category || 'Device'}
                              modelLabel={parentMember?.modelLabel || ''}
                              size="sm"
                            />
                            <div className="leading-tight">
                              <div className="font-mono font-bold text-[11.5px] text-slate-900">
                                {parentMember?.identifierValue || binding.fromHardwareId}
                              </div>
                              <div className="text-[10.5px] text-slate-400">
                                ({parentMember?.category || 'Device'})
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <HardwareUnitIcon category={member.category} modelLabel={member.modelLabel} size="sm" />
                            <div className="leading-tight">
                              <div className="font-mono font-bold text-[11.5px] text-slate-900">
                                {member.identifierValue}
                              </div>
                              <div className="text-[10.5px] text-slate-400">({member.category})</div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Arrow */}
                      <td className="py-2 px-1 text-center text-slate-400">
                        <ArrowRight className="w-3.5 h-3.5 inline-block" />
                      </td>

                      {/* To Hardware (Connected) */}
                      <td className="py-2 px-2.5">
                        {binding ? (
                          <div
                            className="flex items-center gap-2"
                            title={`${member.identifierValue} · ${member.modelLabel}`}
                          >
                            <HardwareUnitIcon category={member.category} modelLabel={member.modelLabel} size="sm" />
                            <div className="leading-tight">
                              <div className="font-mono font-bold text-[11.5px] text-slate-900">
                                {member.identifierValue}
                              </div>
                              <div className="text-[10.5px] text-slate-400">({member.category})</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </>
                  )}

                  {/* Binding Mode */}
                  <td className="py-2 px-2.5 whitespace-nowrap">
                    {binding ? (
                      binding.mode === 'Permanent' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-semibold">
                          <InfinityIcon className="w-3 h-3" /> Permanent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[#F26522] text-[11px] font-semibold">
                          <Clock className="w-3 h-3" /> Temporal
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Effective Start */}
                  <td className="py-2 px-2.5 text-[11.5px] text-slate-700 whitespace-nowrap tabular-nums">
                    {binding ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {formatDateTimeWithTz(binding.effectiveStartAt, binding.timezone)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Effective End */}
                  <td className="py-2 px-2.5 text-[11.5px] text-slate-600 whitespace-nowrap tabular-nums">
                    {binding ? (
                      binding.endedAt || binding.effectiveEndAt ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {formatDateTimeWithTz(binding.endedAt || binding.effectiveEndAt, binding.timezone)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-2 px-2.5 whitespace-nowrap">
                    <BindingStatusPill status={displayStatus} reason={statusReason} />
                  </td>

                  {/* Actions */}
                  <td className="py-2 pl-2.5 pr-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end">
                      <RowActionMenu
                        ariaLabel={`Actions for ${member.identifierValue}`}
                        menuWidthClass="w-56"
                        items={[
                          {
                            id: 'view',
                            label: 'View hardware & binding details',
                            icon: <Eye className="w-3.5 h-3.5 text-slate-400" />,
                            onClick: () => onOpenDetails(connection, binding ? 'bindings' : 'hardware'),
                          },
                          {
                            id: 'edit',
                            label: binding ? `Edit binding ${binding.id}` : 'Edit binding',
                            icon: <Edit2 className="w-3.5 h-3.5 text-slate-400" />,
                            hidden: !(canEdit && binding),
                            onClick: () => {
                              if (binding) openEditBindingModal(binding);
                            },
                          },
                          {
                            id: 'history',
                            label: 'View binding & history',
                            icon: <History className="w-3.5 h-3.5 text-slate-400" />,
                            onClick: () => onOpenDetails(connection, 'activity'),
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inline Edit Binding Modal */}
      {editingBinding && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleSubmitEditBinding}
            className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-slate-900">
                  Edit Binding · <span className="font-mono text-[#F26522]">{editingBinding.id}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {connection.id} · {connection.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBinding(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-[12px]">
              {editError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                  {editingTargetMem?.category === 'SIM'
                    ? 'From Hardware (Parent Device / Sensor)'
                    : 'From Hardware (Parent Device)'}
                </label>
                <select
                  value={editFromId}
                  onChange={(e) => setEditFromId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
                >
                  {parentCandidates.map((m) => (
                    <option key={m.hardwareId} value={m.hardwareId}>
                      [{m.category}] {m.identifierValue} ({m.modelLabel.split(' · ')[0]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Binding Mode
                  </label>
                  <select
                    value={editMode}
                    onChange={(e) => setEditMode(e.target.value as HardwareBindingMode)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Temporal">Temporal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={editTz}
                    onChange={(e) => setEditTz(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
                  >
                    {SUPPORTED_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Effective Start
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="flex-1 h-9 px-2 rounded-lg border border-slate-200"
                      required
                    />
                    <input
                      type="time"
                      step="1"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="w-[100px] h-9 px-2 rounded-lg border border-slate-200"
                      required
                    />
                  </div>
                </div>
                {editMode === 'Temporal' && (
                  <div>
                    <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                      Effective End
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="date"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="flex-1 h-9 px-2 rounded-lg border border-slate-200"
                        required
                      />
                      <input
                        type="time"
                        step="1"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="w-[100px] h-9 px-2 rounded-lg border border-slate-200"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Port / Slot
                  </label>
                  <input
                    type="text"
                    value={editPort}
                    onChange={(e) => setEditPort(e.target.value)}
                    placeholder="e.g. CH-1, BLE-1, SIM Slot 1"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Audit note"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              {!editingBinding.endedAt ? (
                <button
                  type="button"
                  onClick={() => {
                    onEndBinding(editingBinding);
                    setEditingBinding(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[11.5px] font-semibold hover:bg-rose-100 cursor-pointer"
                >
                  <StopCircle className="w-3.5 h-3.5" /> End Binding Now
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">Binding ended (audit preserved)</span>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBinding(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#F26522] hover:bg-[#dc5719] text-white text-[12px] font-semibold cursor-pointer"
                >
                  Save Binding
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
