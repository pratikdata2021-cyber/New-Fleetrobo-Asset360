import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Wrench, 
  Bell, 
  CreditCard, 
  Calendar, 
  ShieldCheck, 
  AlertTriangle, 
  Clock,
  Radio
} from 'lucide-react';
import { Vehicle } from '../types/vehicle';

interface ContextualDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  targetView: 'maintenance' | 'settings' | 'relationships';
}

export const ContextualDetailModal: React.FC<ContextualDetailModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  targetView
}) => {
  if (!isOpen || !vehicle) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {targetView === 'maintenance'
                  ? 'Maintenance & Compliance Records'
                  : targetView === 'settings'
                  ? 'Alert & Petro-Card Settings'
                  : 'Operational Relationships'}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-[#FA8A63] border border-orange-200">
                Vehicle-Local Inspector
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {vehicle.registration_number} · {vehicle.name} ({vehicle.company})
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>

        {/* VIEW 1: MAINTENANCE & COMPLIANCE */}
        {targetView === 'maintenance' && (
          <div className="space-y-5">
            {/* 5 Regulatory Document Snapshots */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Compliance Document Snapshots
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Fitness Certificate', data: vehicle.documents?.fitness },
                  { name: 'Road Permit', data: vehicle.documents?.permit },
                  { name: 'State Road Tax', data: vehicle.documents?.state_tax },
                  { name: 'Vehicle Insurance', data: vehicle.documents?.insurance },
                  { name: 'Pollution (PUC)', data: vehicle.documents?.pollution }
                ].map((doc, idx) => {
                  const isExpired = doc.data?.due === 'Expired';
                  const isDueSoon = doc.data?.due === 'Due Soon';
                  return (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{doc.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            isExpired
                              ? 'bg-red-50 text-red-600 font-bold border border-red-200'
                              : isDueSoon
                              ? 'bg-amber-50 text-amber-600 font-bold border border-amber-200'
                              : 'bg-emerald-50 text-emerald-600 font-bold border border-emerald-200'
                          }`}
                        >
                          {doc.data?.due || 'Valid'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Record ID: <span className="text-slate-700 font-medium">{doc.data?.last_record || 'NA'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Due Date: <span className="text-slate-700 font-medium">{doc.data?.due_date || 'NA'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Breakdown Incident Events */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recorded Breakdown Events ({vehicle.breakdowns?.length || 0})
              </h4>
              {(!vehicle.breakdowns || vehicle.breakdowns.length === 0) ? (
                <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                  No active breakdown incidents recorded.
                </div>
              ) : (
                <div className="space-y-2">
                  {vehicle.breakdowns.map((bd) => (
                    <div key={bd.id} className="p-3 bg-amber-50/40 border border-amber-200 rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <AlertTriangle size={13} className="text-amber-600" />
                        <span>Incident at {bd.breakdown_date_time}</span>
                      </div>
                      <p className="text-slate-700 text-[11px]">{bd.breakdown_remarks}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Maintenance History & Schedules Modal Links */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => alert('Opening Maintenance History modal (source integration reference).')}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Maintenance History
              </button>
              <button
                onClick={() => alert('Opening Maintenance Schedules modal (source integration reference).')}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Maintenance Schedules
              </button>
              <button
                onClick={() => alert('Opening Inspection Submissions modal (source integration reference).')}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Work Orders
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: SETTINGS (ALERT PREFERENCES & PETRO-CARD) */}
        {targetView === 'settings' && (
          <div className="space-y-5">
            {/* Alert Preferences */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Configured Alert Triggers ({vehicle.alerts?.length || 0})
              </h4>
              {(!vehicle.alerts || vehicle.alerts.length === 0) ? (
                <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                  No custom alert rules configured for this vehicle.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden text-xs">
                  {vehicle.alerts.map((alt) => (
                    <div key={alt.id} className="p-3 bg-white flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{alt.alert_type}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {alt.sms_recipient && <span>SMS: {alt.sms_recipient} · </span>}
                          {alt.email_recipient && <span>Email: {alt.email_recipient} · </span>}
                          {alt.whatsapp_recipient && <span>WhatsApp: {alt.whatsapp_recipient}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Configured
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Petro-Card Configuration */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Petro-Card Settings
              </h4>
              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
                  <div className="text-slate-500 text-[11px]">Mileage</div>
                  <div className="font-bold text-slate-900 mt-0.5">{vehicle.petro?.mileage || '—'} km/l</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">Child ID</div>
                  <div className="font-bold text-slate-900 mt-0.5">{vehicle.petro?.child_id || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">Opening Diesel Quantity</div>
                  <div className="font-bold text-slate-900 mt-0.5">{vehicle.petro?.opening_diesel_quantity || '—'} (unit pending)</div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800">
              Alerts and fuel card configurations are stored at the vehicle level. Outbound dispatch notifications do not imply external SIM hardware binding.
            </div>
          </div>
        )}

        {/* VIEW 3: OPERATIONAL RELATIONSHIPS */}
        {targetView === 'relationships' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Transporter</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{vehicle.transporter || '—'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Vendor</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{vehicle.vendor || '—'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Assigned Driver</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{vehicle.driver || '—'}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Hub Location</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{vehicle.hub || '—'}</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 mb-1">Fleet / Group Memberships</div>
              <div className="flex flex-wrap gap-1.5">
                {(!vehicle.fleets || vehicle.fleets.length === 0) ? (
                  <span className="text-slate-400 italic">No fleet memberships assigned.</span>
                ) : (
                  vehicle.fleets.map((fl) => (
                    <span key={fl} className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800">
                      {fl}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
