import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Users, 
  Truck, 
  Tag
} from 'lucide-react';
import { Vehicle, DEMO_LOOKUPS } from '../types/vehicle';
import { getCanonicalTransporterNames } from '../data/vendorsSeed';

export type BulkActionType = 
  | 'status' 
  | 'fleet_add' 
  | 'fleet_remove' 
  | 'transporter';

interface BulkOperationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicles: Vehicle[];
  onCommitBulkAction: (action: BulkActionType, value: string, eligibleVehicles: Vehicle[]) => void;
  onExportSelected: () => void;
}

interface ActionPreview {
  eligible: { vehicle: Vehicle; reason?: string }[];
  skipped: { vehicle: Vehicle; reason: string }[];
}

export const BulkOperationsDrawer: React.FC<BulkOperationsDrawerProps> = ({
  isOpen,
  onClose,
  selectedVehicles,
  onCommitBulkAction,
  onExportSelected
}) => {
  const [selectedAction, setSelectedAction] = useState<BulkActionType | null>(null);
  const [targetValue, setTargetValue] = useState<string>('');
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<ActionPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [vendorRefreshTick, setVendorRefreshTick] = useState(0);

  useEffect(() => {
    const onVendorsUpdated = () => setVendorRefreshTick(t => t + 1);
    window.addEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
    return () => window.removeEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
  }, []);

  if (!isOpen) return null;

  const actionCards: {
    type: BulkActionType;
    label: string;
    description: string;
    icon: any;
    dropdownLabel: string;
    options: string[];
  }[] = [
    {
      type: 'status',
      label: 'Change vehicle status',
      description: 'Update the operational availability status of selected vehicles.',
      icon: Tag,
      dropdownLabel: 'Vehicle status',
      options: [...DEMO_LOOKUPS.operationalStatuses]
    },
    {
      type: 'fleet_add',
      label: 'Add to fleet / group',
      description: 'Add selected vehicles to an operational fleet without removing prior fleets.',
      icon: Users,
      dropdownLabel: 'Fleet / Group',
      options: DEMO_LOOKUPS.fleets
    },
    {
      type: 'fleet_remove',
      label: 'Remove from fleet / group',
      description: 'Remove selected vehicles from a designated fleet membership.',
      icon: Users,
      dropdownLabel: 'Fleet / Group',
      options: DEMO_LOOKUPS.fleets
    },
    {
      type: 'transporter',
      label: 'Change transporter',
      description: 'Reassign managing transporter while preserving vendor & driver records.',
      icon: Truck,
      dropdownLabel: 'Transporter',
      options: (() => {
        void vendorRefreshTick;
        return getCanonicalTransporterNames(undefined, DEMO_LOOKUPS.transporters);
      })()
    }
  ];

  const currentActionMeta = actionCards.find((c) => c.type === selectedAction);

  const handleComputePreview = () => {
    if (!targetValue) {
      setErrorMessage('Choose a value first');
      return;
    }
    setErrorMessage('');

    const eligible: { vehicle: Vehicle; reason?: string }[] = [];
    const skipped: { vehicle: Vehicle; reason: string }[] = [];

    selectedVehicles.forEach((veh) => {
      switch (selectedAction) {
        case 'status':
          if (veh.status === targetValue) {
            skipped.push({ vehicle: veh, reason: 'Already has selected status' });
          } else {
            eligible.push({ vehicle: veh });
          }
          break;

        case 'fleet_add':
          if (veh.fleets?.includes(targetValue)) {
            skipped.push({ vehicle: veh, reason: 'Already in this fleet' });
          } else {
            eligible.push({ vehicle: veh });
          }
          break;

        case 'fleet_remove':
          if (!veh.fleets?.includes(targetValue)) {
            skipped.push({ vehicle: veh, reason: 'No existing membership' });
          } else {
            eligible.push({ vehicle: veh });
          }
          break;

        case 'transporter':
          if (veh.transporter === targetValue) {
            skipped.push({ vehicle: veh, reason: 'Already assigned' });
          } else {
            eligible.push({ vehicle: veh });
          }
          break;

        default:
          eligible.push({ vehicle: veh });
      }
    });

    setPreviewData({ eligible, skipped });
    setIsPreviewMode(true);
  };

  const handleConfirm = () => {
    if (!selectedAction || !previewData || previewData.eligible.length === 0) return;
    onCommitBulkAction(
      selectedAction,
      targetValue,
      previewData.eligible.map((e) => e.vehicle)
    );
    // Reset state and close
    setSelectedAction(null);
    setTargetValue('');
    setIsPreviewMode(false);
    setPreviewData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" />

      {/* 675px Right Drawer */}
      <div className="relative w-[675px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            {selectedAction && (
              <button
                onClick={() => {
                  if (isPreviewMode) {
                    setIsPreviewMode(false);
                  } else {
                    setSelectedAction(null);
                    setTargetValue('');
                  }
                }}
                className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Go Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isPreviewMode
                  ? 'Review Impact & Confirm'
                  : selectedAction
                  ? currentActionMeta?.label
                  : 'Bulk operations'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedVehicles.length} explicitly selected vehicles · selection persists across pages
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: All 7 Action Cards */}
          {!selectedAction && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose an operation, configure it and review eligible versus skipped vehicles before confirming. No change is made before confirmation.
              </p>

              <div className="space-y-2">
                {actionCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.type}
                      onClick={() => {
                        setSelectedAction(card.type);
                        setTargetValue(card.options[0] || '');
                      }}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-[#FA8A63] hover:bg-orange-50/20 transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[#FEEFEA] flex items-center justify-center text-slate-600 group-hover:text-[#FA8A63] transition-colors shrink-0 mt-0.5">
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-[#FA8A63] transition-colors">
                            {card.label}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{card.description}</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-[#FA8A63] transition-colors">
                        Configure →
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={onExportSelected}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Export selected ({selectedVehicles.length})
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Configure Selected Action */}
          {selectedAction && !isPreviewMode && currentActionMeta && (
            <div className="space-y-6">
              {/* Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Selected records</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{selectedVehicles.length}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">In directory</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{selectedVehicles.length}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Applied changes</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">0</div>
                </div>
              </div>

              {/* Action Details & Dropdown */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {currentActionMeta.dropdownLabel}
                  </label>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Choose the new value to apply across the selected records.
                  </p>
                  <select
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  >
                    {currentActionMeta.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {errorMessage && (
                  <p className="text-xs text-red-500 font-semibold">{errorMessage}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setSelectedAction(null);
                    setTargetValue('');
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Back
                </button>
                <button
                  onClick={handleComputePreview}
                  className="px-4 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Review changes →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview Eligible vs Skipped & Confirm */}
          {isPreviewMode && previewData && (
            <div className="space-y-6">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Selected</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{selectedVehicles.length}</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Eligible</div>
                  <div className="text-lg font-bold text-emerald-800 mt-1">{previewData.eligible.length}</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="text-[10px] uppercase font-bold text-amber-700">Skipped</div>
                  <div className="text-lg font-bold text-amber-800 mt-1">{previewData.skipped.length}</div>
                </div>
              </div>

              {/* Eligible list */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Eligible for update ({previewData.eligible.length})</span>
                </div>
                {previewData.eligible.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No vehicles are eligible for this change.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-emerald-100 rounded-lg divide-y divide-emerald-50 bg-emerald-50/20">
                    {previewData.eligible.map(({ vehicle }) => (
                      <div key={vehicle.id} className="px-3 py-2 text-xs flex items-center justify-between">
                        <span className="font-bold text-slate-800">{vehicle.registration_number}</span>
                        <span className="text-slate-500">{vehicle.name} · {vehicle.company}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Skipped list with reasons */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <AlertCircle size={14} className="text-amber-600" />
                  <span>Skipped vehicles & reason ({previewData.skipped.length})</span>
                </div>
                {previewData.skipped.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">None skipped.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-amber-100 rounded-lg divide-y divide-amber-50 bg-amber-50/20">
                    {previewData.skipped.map(({ vehicle, reason }) => (
                      <div key={vehicle.id} className="px-3 py-2 text-xs flex items-center justify-between">
                        <span className="font-bold text-slate-800">{vehicle.registration_number}</span>
                        <span className="text-amber-700 font-semibold">{reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-800">
                Only the designated <strong>{currentActionMeta?.label}</strong> attribute will be updated. All other identity records, devices, drivers, and relationship fields remain unchanged.
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={() => setIsPreviewMode(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Back
                </button>
                <button
                  disabled={previewData.eligible.length === 0}
                  onClick={handleConfirm}
                  className={`px-5 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                    previewData.eligible.length === 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#FA8A63] hover:bg-[#e77a54] text-white cursor-pointer'
                  }`}
                >
                  Confirm {previewData.eligible.length} updates
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
