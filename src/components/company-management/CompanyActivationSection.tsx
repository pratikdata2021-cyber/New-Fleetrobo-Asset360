import React from 'react';
import { SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import {
  ClientCompany,
  CompanyActivationState,
  PrototypeActorInfo,
} from '../../types/companyModelEnablement';

interface CompanyActivationSectionProps {
  company: ClientCompany;
  activation: CompanyActivationState;
  activeActor: PrototypeActorInfo;
  currentlyAvailableModelsCount: number;
  grantedModelsCount: number;
  totalGlobalActiveCount: number;
  onUpdateActivation: (next: CompanyActivationState, toastMsg: string) => void;
  onOpenModelAccessTab: () => void;
}

export const CompanyActivationSection: React.FC<CompanyActivationSectionProps> = ({
  company,
  activation,
  activeActor,
  currentlyAvailableModelsCount,
  grantedModelsCount,
  totalGlobalActiveCount,
  onUpdateActivation,
  onOpenModelAccessTab,
}) => {
  const completedSteps =
    (activation.transportEntitled ? 1 : 0) +
    (activation.transportOperatingAccess ? 1 : 0) +
    (activation.transportActivated ? 1 : 0);
  const progressPct = Math.round((completedSteps / 3) * 100);

  const canGrantOperatingAccess = activation.transportEntitled;
  const canActivateTransport =
    activation.transportEntitled && activation.transportOperatingAccess;

  // Determine Next Step card copy dynamically
  let nextStepTitle = 'Grant operating access';
  let nextStepActionLabel: string | null = null;
  let onNextStepAction: (() => void) | null = null;

  if (!activation.transportEntitled) {
    nextStepTitle = 'Grant Transport entitlement';
    nextStepActionLabel = 'Grant entitlement';
    onNextStepAction = () =>
      onUpdateActivation(
        { ...activation, transportEntitled: true },
        `Transport entitlement granted for ${company.name}.`
      );
  } else if (!activation.transportOperatingAccess) {
    nextStepTitle = 'Grant operating access';
    nextStepActionLabel = null;
  } else if (!activation.transportActivated) {
    nextStepTitle = 'Activate Transport module';
    nextStepActionLabel = null;
  } else if (currentlyAvailableModelsCount === 0) {
    nextStepTitle = 'Approve hardware models in Model Access';
    nextStepActionLabel = 'Open Model Access →';
    onNextStepAction = onOpenModelAccessTab;
  } else {
    nextStepTitle = 'Ready for fleet operations';
    nextStepActionLabel = 'Manage Model Access →';
    onNextStepAction = onOpenModelAccessTab;
  }

  const modulesReady = activation.transportActivated;
  const readyToWork = activation.transportActivated && currentlyAvailableModelsCount > 0;

  const otherModulesList: {
    key: keyof CompanyActivationState['otherModules'];
    label: string;
    subtitleOff: string;
    subtitleOn: string;
  }[] = [
    {
      key: 'live',
      label: 'Live',
      subtitleOff: 'Off · not requested',
      subtitleOn: 'Active · real-time fleet tracking enabled',
    },
    {
      key: 'plantOperations',
      label: 'Plant operations',
      subtitleOff: 'Off · not requested',
      subtitleOn: 'Active · yard & gate operations enabled',
    },
    {
      key: 'safety',
      label: 'Safety',
      subtitleOff: 'Off · not requested',
      subtitleOn: 'Active · ADAS/DMS alerts enabled',
    },
    {
      key: 'video',
      label: 'Video',
      subtitleOff: 'Off · not requested',
      subtitleOn: 'Active · camera & MDVR streaming enabled',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left 8 Columns: Primary Module Activation + Other Modules */}
      <div className="lg:col-span-8 space-y-5">
        {/* Primary Transport Activation Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-bold text-slate-900">Transport</h2>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    activation.transportActivated
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-orange-50 text-[#B85324] border-orange-200/80'
                  }`}
                >
                  {activation.transportActivated ? 'Active' : 'Not active'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Requested at registration</p>
            </div>
            <div className="text-xs font-semibold text-slate-700 shrink-0">
              {completedSteps} of 3 done
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FA8A63] rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* 3-Step List */}
          <div className="space-y-3 pt-1">
            {/* Step 1: Entitlement */}
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-slate-900">1. Entitlement</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      activation.transportEntitled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {activation.transportEntitled ? 'Done' : 'Not granted'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {activation.transportEntitled
                    ? `Company can use Transport (${company.name}).`
                    : 'Grant entitlement so this company can access Transport.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextEntitled = !activation.transportEntitled;
                  onUpdateActivation(
                    {
                      ...activation,
                      transportEntitled: nextEntitled,
                      transportOperatingAccess: nextEntitled
                        ? activation.transportOperatingAccess
                        : false,
                      transportActivated: nextEntitled ? activation.transportActivated : false,
                    },
                    nextEntitled
                      ? `Transport entitlement granted for ${company.name}.`
                      : `Transport entitlement removed for ${company.name}.`
                  );
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  activation.transportEntitled
                    ? 'text-slate-800 hover:text-rose-600 hover:bg-rose-50'
                    : 'bg-[#FA8A63] hover:bg-[#e57953] text-white'
                }`}
              >
                {activation.transportEntitled ? 'Remove' : 'Grant'}
              </button>
            </div>

            {/* Step 2: Operating access */}
            <div
              className={`rounded-xl border px-4 py-3.5 flex flex-wrap items-center justify-between gap-4 ${
                canGrantOperatingAccess && !activation.transportOperatingAccess
                  ? 'border-slate-200 bg-slate-50/70'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-slate-900">
                    2. Operating access
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      activation.transportOperatingAccess
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : canGrantOperatingAccess
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {activation.transportOperatingAccess
                      ? 'Done'
                      : canGrantOperatingAccess
                      ? 'Your action'
                      : 'Blocked'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {activation.transportOperatingAccess
                    ? `${activation.dispatcherHandle} holds the Dispatcher role · ${currentlyAvailableModelsCount} of ${totalGlobalActiveCount} hardware models enabled.`
                    : `Give ${activation.dispatcherHandle} the Dispatcher role and manage allowed hardware models.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onOpenModelAccessTab}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#FA8A63]" />
                  <span>Model Access</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FFF3EE] text-[#B85324]">
                    {currentlyAvailableModelsCount}/{grantedModelsCount}
                  </span>
                </button>
                {activation.transportOperatingAccess ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateActivation(
                        {
                          ...activation,
                          transportOperatingAccess: false,
                          transportActivated: false,
                        },
                        `Dispatcher operating access revoked for ${company.name}.`
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                  >
                    Revoke
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canGrantOperatingAccess}
                    onClick={() =>
                      onUpdateActivation(
                        { ...activation, transportOperatingAccess: true },
                        `Dispatcher operating access granted for ${company.name}.`
                      )
                    }
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                      canGrantOperatingAccess
                        ? 'bg-[#FA8A63] hover:bg-[#e57953] text-white shadow-2xs cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Grant Dispatcher access
                  </button>
                )}
              </div>
            </div>

            {/* Step 3: Activation */}
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-slate-900">3. Activation</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                      activation.transportActivated
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : canActivateTransport
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {activation.transportActivated
                      ? 'Done'
                      : canActivateTransport
                      ? 'Ready'
                      : 'Not started'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {activation.transportActivated
                    ? `Transport is active for ${company.name} (${currentlyAvailableModelsCount} available model(s)).`
                    : 'Turns Transport on. Opens workspace and connects enabled hardware models.'}
                </p>
              </div>
              {activation.transportActivated ? (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateActivation(
                      { ...activation, transportActivated: false },
                      `Transport deactivated for ${company.name}. Historical data preserved.`
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer shrink-0"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canActivateTransport}
                  onClick={() =>
                    onUpdateActivation(
                      { ...activation, transportActivated: true },
                      `Transport activated for ${company.name}.`
                    )
                  }
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    canActivateTransport
                      ? 'bg-[#FA8A63] hover:bg-[#e57953] text-white shadow-2xs cursor-pointer'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  Activate
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-1">
            {!canActivateTransport
              ? 'Activate unlocks after operating access is granted.'
              : 'Hardware model availability can be adjusted anytime under 2. Operating access → Model Access.'}
          </p>
        </div>

        {/* Other Modules Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Other modules</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Turning on a module gives nobody permissions. Turning off keeps data.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {otherModulesList.map((mod) => {
              const isOn = activation.otherModules[mod.key];
              return (
                <div
                  key={mod.key}
                  className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-slate-900">{mod.label}</span>
                      {isOn && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isOn ? mod.subtitleOn : mod.subtitleOff}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateActivation(
                        {
                          ...activation,
                          otherModules: {
                            ...activation.otherModules,
                            [mod.key]: !isOn,
                          },
                        },
                        `${mod.label} turned ${!isOn ? 'on' : 'off'} for ${company.name}.`
                      )
                    }
                    className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                      isOn
                        ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {isOn ? 'Turn off' : 'Turn on'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right 4 Columns: NEXT STEP & Onboarding Progress */}
      <div className="lg:col-span-4 space-y-5">
        {/* NEXT STEP Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            NEXT STEP
          </div>
          <div className="text-[15px] font-bold text-slate-900">{nextStepTitle}</div>
          <p className="text-xs text-slate-500">
            Owner: {activeActor.name} · FleetRobo access owner
          </p>
          {onNextStepAction && nextStepActionLabel && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onNextStepAction}
                className="text-xs font-semibold text-[#B85324] hover:text-[#FA8A63] cursor-pointer"
              >
                {nextStepActionLabel}
              </button>
            </div>
          )}
        </div>

        {/* Onboarding Progress Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Onboarding progress</h3>

          <div className="space-y-3.5">
            {[
              {
                title: 'Company review',
                owner: 'FleetRobo review team',
                badge: 'Done',
                tone: 'done',
              },
              {
                title: 'Administrator access',
                owner: 'FleetRobo access manager',
                badge: activation.adminVerified ? 'Done' : 'Your action',
                tone: activation.adminVerified ? 'done' : 'action',
              },
              {
                title: 'Workspace setup',
                owner: 'Company administrator',
                badge: 'Done',
                tone: 'done',
              },
              {
                title: 'Modules',
                owner: 'FleetRobo access owner',
                badge: modulesReady ? 'Done' : 'Your action',
                tone: modulesReady ? 'done' : 'action',
              },
              {
                title: 'Ready to work',
                owner: 'Company administrator',
                badge: readyToWork ? 'Done' : 'Not started',
                tone: readyToWork ? 'done' : 'idle',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900">{item.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.owner}</div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                    item.tone === 'done'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : item.tone === 'action'
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Enabled hardware models</span>
            <span className="inline-flex items-center gap-1 font-bold text-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#FA8A63]" />
              {currentlyAvailableModelsCount} / {totalGlobalActiveCount} active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
