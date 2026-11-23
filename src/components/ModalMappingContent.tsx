import React, { useState, useEffect, useMemo } from 'react';
import {
  SavedModalView,
  loadModalMasterStore,
  saveModalMasterStore,
  loadSavedModalViews,
  saveSavedModalViews,
  generateModalMasterSeedData,
  ModalMasterStore
} from '../types/modalMaster';
import { ModalConnectionTab } from './ModalConnectionTab';
import { ResourceConnectionTab } from './ResourceConnectionTab';
import { CheckCircle2, AlertTriangle, X, RotateCcw, Shield } from 'lucide-react';

interface ModalMappingContentProps {
  currentCompany?: string;
  viewRole?: 'admin' | 'customer';
}

export const ModalMappingContent: React.FC<ModalMappingContentProps> = ({
  currentCompany = 'Adani Mundra',
  viewRole = 'admin'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'modal-connection' | 'resource-connection'>(
    'modal-connection'
  );
  const [store, setStoreState] = useState<ModalMasterStore>(() => loadModalMasterStore());
  const [savedViews, setSavedViewsState] = useState<SavedModalView[]>(() => loadSavedModalViews());
  const [storageWarning, setStorageWarning] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const selfWriteRef = React.useRef(false);

  // Platform Admin views All Clients scope; Organization Admin & Customer are scoped to currentCompany
  const isPlatformAdmin = (currentCompany === 'Platform Admin' || currentCompany === 'Binary') && viewRole === 'admin';
  const activeCompanyScope = isPlatformAdmin ? 'All Clients' : currentCompany;
  const canEdit = viewRole === 'admin';

  useEffect(() => {
    try {
      const testKey = '__fleetrobo_ls_check__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
    } catch {
      setStorageWarning(true);
    }
  }, []);

  useEffect(() => {
    const syncStore = () => {
      if (!selfWriteRef.current) {
        setStoreState(loadModalMasterStore());
      }
    };
    const onExternalUpdate = () => {
      setClockTick((t) => t + 1);
      syncStore();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setClockTick((t) => t + 1);
      }
    };
    const timer = window.setInterval(() => {
      setClockTick((t) => t + 1);
    }, 60000);

    window.addEventListener('fleetrobo:modal-store-updated', syncStore);
    window.addEventListener('fleetrobo:resources-updated', onExternalUpdate);
    window.addEventListener('fleetrobo:model-access-updated', onExternalUpdate);
    window.addEventListener('fleetrobo:vendors-updated', onExternalUpdate);
    window.addEventListener('storage', syncStore);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('fleetrobo:modal-store-updated', syncStore);
      window.removeEventListener('fleetrobo:resources-updated', onExternalUpdate);
      window.removeEventListener('fleetrobo:model-access-updated', onExternalUpdate);
      window.removeEventListener('fleetrobo:vendors-updated', onExternalUpdate);
      window.removeEventListener('storage', syncStore);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  void clockTick;

  const setStore: React.Dispatch<React.SetStateAction<ModalMasterStore>> = (valueOrUpdater) => {
    setStoreState((prev) => {
      const next =
        typeof valueOrUpdater === 'function'
          ? (valueOrUpdater as (curr: ModalMasterStore) => ModalMasterStore)(prev)
          : valueOrUpdater;
      selfWriteRef.current = true;
      saveModalMasterStore(next);
      setTimeout(() => {
        selfWriteRef.current = false;
      }, 0);
      return next;
    });
  };

  const setSavedViews: React.Dispatch<React.SetStateAction<SavedModalView[]>> = (valueOrUpdater) => {
    setSavedViewsState((prev) => {
      const next =
        typeof valueOrUpdater === 'function'
          ? (valueOrUpdater as (curr: SavedModalView[]) => SavedModalView[])(prev)
          : valueOrUpdater;
      saveSavedModalViews(next);
      return next;
    });
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const handleConfirmResetSeed = () => {
    const fresh = generateModalMasterSeedData();
    setStore(fresh);
    setConfirmResetOpen(false);
    showToast('Prototype demo dataset restored.', 'success');
  };

  const scopedConnectionsCount = useMemo(() => {
    if (activeCompanyScope === 'All Clients') return store.connections.length;
    const t = activeCompanyScope.trim().toLowerCase();
    return store.connections.filter((c) => (c.companyName || '').trim().toLowerCase() === t).length;
  }, [store.connections, activeCompanyScope]);

  const scopedAllocationsCount = useMemo(() => {
    if (activeCompanyScope === 'All Clients') return store.resourceAllocations.length;
    const t = activeCompanyScope.trim().toLowerCase();
    return store.resourceAllocations.filter((a) => (a.companyName || '').trim().toLowerCase() === t).length;
  }, [store.resourceAllocations, activeCompanyScope]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-16 right-6 z-[95] flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border text-[12px] font-medium transition-all ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {storageWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-1.5 text-[11px] text-amber-800 flex items-center justify-between shrink-0">
          <span>
            Browser localStorage is unavailable or restricted. Changes are retained in memory for the active session.
          </span>
          <button
            type="button"
            onClick={() => setStorageWarning(false)}
            className="text-amber-600 hover:underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Title & Breadcrumb Header */}
      <div className="bg-white px-5 pt-3.5 pb-0 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between mb-2.5 gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-0.5">
              <span>{viewRole === 'customer' ? 'Operational Setup' : 'Asset Store'}</span>
              <span>/</span>
              <span>Assets Mapping</span>
              <span>/</span>
              <span className="text-slate-600 font-semibold">
                {activeSubTab === 'modal-connection' ? 'Assets Connection' : 'Resource Connection View'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">
                {activeSubTab === 'modal-connection' ? 'Assets Connection' : 'Resource Connection View'}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF3EE] text-[#F26522] border border-[#F26522]/20">
                {activeSubTab === 'modal-connection'
                  ? `${scopedConnectionsCount} Connections`
                  : `${scopedAllocationsCount} Allocations`}
              </span>
              {viewRole === 'customer' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  <Shield className="w-3 h-3 text-slate-500" />
                  Customer Read-Only View · {activeCompanyScope}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                title="Restore deterministic prototype seed dataset"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Reset Demo Data
              </button>
            )}
          </div>
        </div>

        {/* Local Page Sub-Tabs */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveSubTab('modal-connection')}
            className={`relative pb-2.5 text-[13px] font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'modal-connection'
                ? 'text-[#F26522]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Assets Connection</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                activeSubTab === 'modal-connection'
                  ? 'bg-[#FFF3EE] text-[#F26522]'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {scopedConnectionsCount}
            </span>
            {activeSubTab === 'modal-connection' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#F26522] rounded-t-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('resource-connection')}
            className={`relative pb-2.5 text-[13px] font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'resource-connection'
                ? 'text-[#F26522]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Resource Connection View</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                activeSubTab === 'resource-connection'
                  ? 'bg-[#FFF3EE] text-[#F26522]'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {scopedAllocationsCount}
            </span>
            {activeSubTab === 'resource-connection' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#F26522] rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {/* Active Internal View */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeSubTab === 'modal-connection' ? (
          <ModalConnectionTab
            store={store}
            setStore={setStore}
            savedViews={savedViews}
            setSavedViews={setSavedViews}
            showToast={showToast}
            activeCompanyScope={activeCompanyScope}
            isPlatformAdmin={isPlatformAdmin}
            canEdit={canEdit}
            actorName={viewRole === 'admin' ? ((currentCompany === 'Platform Admin' || currentCompany === 'Binary') ? 'Platform Admin' : `${currentCompany} Admin`) : `${currentCompany} Reviewer`}
          />
        ) : (
          <ResourceConnectionTab
            store={store}
            setStore={setStore}
            savedViews={savedViews}
            setSavedViews={setSavedViews}
            showToast={showToast}
            activeCompanyScope={activeCompanyScope}
            canEdit={canEdit}
            actorName={viewRole === 'admin' ? ((currentCompany === 'Platform Admin' || currentCompany === 'Binary') ? 'Platform Admin' : `${currentCompany} Admin`) : `${currentCompany} Reviewer`}
          />
        )}
      </div>

      {/* Reset Demo Data Confirmation Modal (MAP-P0-12) */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-[14px] font-bold text-slate-900">Reset Demo Data?</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2.5 text-[12px] text-slate-600 leading-relaxed">
              <p>
                This will replace your current local connections, hardware bindings, resource allocations, and relationship edits with the default prototype dataset.
              </p>
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 font-medium">
                Saved Views are preserved. Only confirm if you intentionally want to restore the baseline demo records.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetSeed}
                className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
