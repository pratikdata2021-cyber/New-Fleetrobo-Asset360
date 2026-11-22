import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  ArrowLeft,
  Building2,
  Cpu,
  Radio,
  Smartphone,
  ShieldAlert,
  Save,
  RotateCcw,
  Check,
  Plus,
  Layers,
  History,
  MapPin,
  ExternalLink,
  Users,
  Eye,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { RowActionMenu } from './common/RowActionMenu';
import {
  ClientCompany,
  CompanyAuditEntry,
  COMPANY_MODEL_TOOLTIPS,
  loadClientCompanies,
  saveClientCompanies,
  loadCompanyModelAccessMap,
  saveCompanyModelAccessMap,
  loadCompanyInUseMap,
  loadCompanyAuditLogs,
  saveCompanyAuditLogs,
} from '../types/companyModelEnablement';
import {
  ModelCategoryRecord,
  getRecordIdentifierTypes,
  loadModelCategoryStore,
} from '../types/modelCategoryMaster';

// Accessible Info Tooltip using span role="button" to prevent nested button issues
const InfoTip: React.FC<{ text: string; align?: 'left' | 'right' | 'center' }> = ({
  text,
  align = 'center',
}) => {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex items-center ml-1 align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setOpen((prev) => !prev);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={text}
        className="w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 hover:text-[#FA8A63] hover:border-[#FA8A63] focus:outline-none focus:ring-1 focus:ring-[#FA8A63] inline-flex items-center justify-center text-[9px] font-bold leading-none transition-colors cursor-pointer bg-white shrink-0 select-none"
      >
        ⓘ
      </span>
      {open && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-[120] bottom-full mb-1.5 w-64 p-2 rounded-lg bg-slate-900 text-white text-[11px] font-normal leading-relaxed shadow-xl border border-slate-700 ${
            align === 'right'
              ? 'right-0'
              : align === 'left'
              ? 'left-0'
              : 'left-1/2 -translate-x-1/2'
          }`}
        >
          {text}
        </span>
      )}
    </span>
  );
};

interface CompanyManagementContentProps {
  onNavigateToModelCategoryMaster?: () => void;
}

export const CompanyManagementContent: React.FC<CompanyManagementContentProps> = ({
  onNavigateToModelCategoryMaster,
}) => {
  // Master state
  const [companies, setCompanies] = useState<ClientCompany[]>(() => loadClientCompanies());
  const [globalModels, setGlobalModels] = useState<ModelCategoryRecord[]>(() =>
    loadModelCategoryStore()
  );
  const [accessMap, setAccessMap] = useState<Record<string, Record<string, boolean>>>(() =>
    loadCompanyModelAccessMap()
  );
  const [inUseMap] = useState<Record<string, Record<string, number>>>(() =>
    loadCompanyInUseMap()
  );
  const [auditLogs, setAuditLogs] = useState<CompanyAuditEntry[]>(() => loadCompanyAuditLogs());

  // Navigation / active company detail
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'model-access' | 'overview' | 'sites' | 'activity'
  >('model-access');

  // List view filters
  const [companySearch, setCompanySearch] = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState<'All' | 'Active' | 'Onboarding' | 'Inactive'>('All');
  const [companyIndustryFilter, setCompanyIndustryFilter] = useState<string>('All');

  // Model Access tab filters
  const [modelSearch, setModelSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Device' | 'Sensor' | 'SIM'>('All');
  const [enablementFilter, setEnablementFilter] = useState<'All' | 'Enabled' | 'Disabled'>('All');
  const [globalStatusFilter, setGlobalStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Multi-select for batch operations
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  // Pending unsaved edits for the currently viewed company: modelId -> boolean
  const [pendingEdits, setPendingEdits] = useState<Record<string, boolean>>({});

  // Confirmation modal for disabling in-use models
  const [inUseWarningModal, setInUseWarningModal] = useState<{
    open: boolean;
    model: ModelCategoryRecord | null;
    inUseCount: number;
  }>({ open: false, model: null, inUseCount: 0 });

  // Add Company Modal state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({
    name: '',
    legalName: '',
    industry: 'Bulk Transport & Logistics',
    city: '',
    country: 'India',
    contactEmail: '',
    contactPhone: '',
  });

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(
    null
  );

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync global models & client companies when updated in Model Category Master
  useEffect(() => {
    const handleSync = () => {
      setGlobalModels(loadModelCategoryStore());
      setCompanies(loadClientCompanies());
      setAccessMap(loadCompanyModelAccessMap());
    };
    window.addEventListener('fleetrobo:model-access-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('fleetrobo:model-access-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Selected company object
  const selectedCompany = useMemo(() => {
    if (!selectedCompanyId) return null;
    return companies.find((c) => c.id === selectedCompanyId) || null;
  }, [selectedCompanyId, companies]);

  // Reset pending edits when switching company
  useEffect(() => {
    setPendingEdits({});
    setSelectedModelIds([]);
  }, [selectedCompanyId]);

  // Calculate enabled count for a company
  const getEnabledCountForCompany = (companyId: string) => {
    const compAccess = accessMap[companyId] || {};
    return Object.values(compAccess).filter(Boolean).length;
  };

  // Filtered companies list
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // Hide Binary itself from client model access editing list (it's the platform owner)
      if (c.isPlatformOwner) return false;

      const q = companySearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.legalName.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.contactEmail.toLowerCase().includes(q);

      const matchesStatus =
        companyStatusFilter === 'All' || c.status === companyStatusFilter;
      const matchesIndustry =
        companyIndustryFilter === 'All' || c.industry.includes(companyIndustryFilter);

      return matchesSearch && matchesStatus && matchesIndustry;
    });
  }, [companies, companySearch, companyStatusFilter, companyIndustryFilter]);

  // Filtered models list for the active company
  const filteredModels = useMemo(() => {
    if (!selectedCompanyId) return [];
    const compAccess = accessMap[selectedCompanyId] || {};

    return globalModels.filter((m) => {
      const isCurrentlyEnabled =
        pendingEdits[m.id] !== undefined ? pendingEdits[m.id] : !!compAccess[m.id];

      // Search
      const q = modelSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.typeName.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q) ||
        m.modelReference.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        getRecordIdentifierTypes(m).join(' ').toLowerCase().includes(q);

      // Category
      const matchesCategory =
        categoryFilter === 'All' || m.category === categoryFilter;

      // Enablement
      const matchesEnablement =
        enablementFilter === 'All' ||
        (enablementFilter === 'Enabled' && isCurrentlyEnabled) ||
        (enablementFilter === 'Disabled' && !isCurrentlyEnabled);

      // Global status
      const matchesGlobalStatus =
        globalStatusFilter === 'All' || m.status === globalStatusFilter;

      return (
        matchesSearch && matchesCategory && matchesEnablement && matchesGlobalStatus
      );
    });
  }, [
    selectedCompanyId,
    globalModels,
    accessMap,
    pendingEdits,
    modelSearch,
    categoryFilter,
    enablementFilter,
    globalStatusFilter,
  ]);

  // Metrics for currently viewed company
  const currentCompanyStats = useMemo(() => {
    if (!selectedCompanyId) return { total: 0, enabled: 0, devices: 0, sensors: 0, sims: 0, inUse: 0 };
    const compAccess = accessMap[selectedCompanyId] || {};
    const compInUse = inUseMap[selectedCompanyId] || {};

    let enabledCount = 0;
    let devCount = 0;
    let sensCount = 0;
    let simCount = 0;
    let inUseTotal = 0;

    globalModels.forEach((m) => {
      const isEnabled =
        pendingEdits[m.id] !== undefined ? pendingEdits[m.id] : !!compAccess[m.id];
      if (isEnabled) {
        enabledCount++;
        if (m.category === 'Device') devCount++;
        if (m.category === 'Sensor') sensCount++;
        if (m.category === 'SIM') simCount++;
      }
      if ((compInUse[m.id] || 0) > 0) {
        inUseTotal += compInUse[m.id];
      }
    });

    return {
      total: globalModels.length,
      enabled: enabledCount,
      devices: devCount,
      sensors: sensCount,
      sims: simCount,
      inUse: inUseTotal,
    };
  }, [selectedCompanyId, globalModels, accessMap, inUseMap, pendingEdits]);

  // Unsaved changes count
  const unsavedCount = Object.keys(pendingEdits).length;

  // Toggle single model
  const handleToggleModel = (model: ModelCategoryRecord) => {
    if (!selectedCompanyId) return;

    // Rule 1: A globally inactive type cannot be enabled for new use
    if (model.status === 'Inactive') {
      const currentVal =
        pendingEdits[model.id] !== undefined
          ? pendingEdits[model.id]
          : !!(accessMap[selectedCompanyId] || {})[model.id];

      // If attempting to turn on an inactive type, reject
      if (!currentVal) {
        setToast({
          message: `Cannot enable "${model.typeName}". Model is globally Inactive in Model Category Master.`,
          type: 'warning',
        });
        return;
      }
    }

    const currentVal =
      pendingEdits[model.id] !== undefined
        ? pendingEdits[model.id]
        : !!(accessMap[selectedCompanyId] || {})[model.id];

    const nextVal = !currentVal;

    // Rule 2: If model is currently enabled and in-use, warn before disabling
    const inUseCount = (inUseMap[selectedCompanyId] || {})[model.id] || 0;
    if (!nextVal && inUseCount > 0) {
      setInUseWarningModal({
        open: true,
        model,
        inUseCount,
      });
      return;
    }

    // Apply change to pending edits
    setPendingEdits((prev) => {
      const originalVal = !!(accessMap[selectedCompanyId] || {})[model.id];
      if (nextVal === originalVal) {
        const copy = { ...prev };
        delete copy[model.id];
        return copy;
      }
      return { ...prev, [model.id]: nextVal };
    });
  };

  // Confirm disable of in-use model
  const handleConfirmDisableInUse = () => {
    if (!inUseWarningModal.model || !selectedCompanyId) return;
    const modelId = inUseWarningModal.model.id;
    const originalVal = !!(accessMap[selectedCompanyId] || {})[modelId];

    setPendingEdits((prev) => {
      if (!originalVal) {
        const copy = { ...prev };
        delete copy[modelId];
        return copy;
      }
      return { ...prev, [modelId]: false };
    });

    setInUseWarningModal({ open: false, model: null, inUseCount: 0 });
    setToast({
      message: `Pending disable queued for "${inUseWarningModal.model.typeName}". Click "Save Changes" to apply.`,
      type: 'warning',
    });
  };

  // Batch Enable
  const handleBatchEnable = () => {
    if (!selectedCompanyId || selectedModelIds.length === 0) return;
    let skippedInactive = 0;

    setPendingEdits((prev) => {
      const next = { ...prev };
      selectedModelIds.forEach((id) => {
        const model = globalModels.find((m) => m.id === id);
        if (model?.status === 'Inactive') {
          skippedInactive++;
          return;
        }
        const originalVal = !!(accessMap[selectedCompanyId] || {})[id];
        if (originalVal) {
          delete next[id];
        } else {
          next[id] = true;
        }
      });
      return next;
    });

    if (skippedInactive > 0) {
      setToast({
        message: `Enabled selected models. ${skippedInactive} globally inactive model(s) were skipped.`,
        type: 'warning',
      });
    } else {
      setToast({
        message: `Queued enablement for ${selectedModelIds.length} models. Click "Save Changes" to commit.`,
        type: 'success',
      });
    }
    setSelectedModelIds([]);
  };

  // Batch Disable
  const handleBatchDisable = () => {
    if (!selectedCompanyId || selectedModelIds.length === 0) return;

    setPendingEdits((prev) => {
      const next = { ...prev };
      selectedModelIds.forEach((id) => {
        const originalVal = !!(accessMap[selectedCompanyId] || {})[id];
        if (!originalVal) {
          delete next[id];
        } else {
          next[id] = false;
        }
      });
      return next;
    });

    setToast({
      message: `Queued disable for ${selectedModelIds.length} models. Click "Save Changes" to commit.`,
      type: 'warning',
    });
    setSelectedModelIds([]);
  };

  // Save changes
  const handleSaveChanges = () => {
    if (!selectedCompanyId || unsavedCount === 0) return;

    const currentCompMap = { ...(accessMap[selectedCompanyId] || {}) };
    const newLogs: CompanyAuditEntry[] = [];
    const timestamp = new Date().toISOString();

    Object.entries(pendingEdits).forEach(([modelId, newVal]) => {
      const oldVal = !!currentCompMap[modelId];
      if (oldVal !== newVal) {
        currentCompMap[modelId] = newVal;
        const model = globalModels.find((m) => m.id === modelId);
        newLogs.push({
          id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          companyId: selectedCompanyId,
          companyName: selectedCompany?.name || 'Client',
          modelId,
          modelName: model ? `${model.typeName}${model.modelReference ? ` (${model.modelReference})` : ''}` : modelId,
          category: model?.category || 'Device',
          action: newVal ? 'Enabled' : 'Disabled',
          actor: 'Platform Admin',
          timestamp,
          oldValue: oldVal,
          newValue: newVal,
          note: `Model ${newVal ? 'enabled' : 'disabled'} by Platform Admin.`,
        });
      }
    });

    const updatedAccessMap = {
      ...accessMap,
      [selectedCompanyId]: currentCompMap,
    };

    setAccessMap(updatedAccessMap);
    saveCompanyModelAccessMap(updatedAccessMap);

    const updatedAuditLogs = [...newLogs, ...auditLogs];
    setAuditLogs(updatedAuditLogs);
    saveCompanyAuditLogs(updatedAuditLogs);

    setPendingEdits({});
    setToast({
      message: `✓ Model access updated successfully for ${selectedCompany?.name}. ${newLogs.length} change(s) saved and audited.`,
      type: 'success',
    });
  };

  // Revert changes
  const handleResetPending = () => {
    setPendingEdits({});
    setSelectedModelIds([]);
    setToast({
      message: 'Pending model access changes reverted.',
      type: 'warning',
    });
  };

  // Add Company Form Submit
  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyForm.name.trim()) return;

    const newComp: ClientCompany = {
      id: `comp-${newCompanyForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`,
      name: newCompanyForm.name.trim(),
      legalName: newCompanyForm.legalName.trim() || `${newCompanyForm.name.trim()} Pvt Ltd`,
      industry: newCompanyForm.industry,
      sitesCount: 1,
      status: 'Active',
      contactEmail: newCompanyForm.contactEmail.trim() || `ops@${newCompanyForm.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.example`,
      contactPhone: newCompanyForm.contactPhone.trim() || '+91 80 4000 0000',
      city: newCompanyForm.city.trim() || 'New Delhi',
      country: newCompanyForm.country,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const updatedCompanies = [newComp, ...companies];
    setCompanies(updatedCompanies);
    saveClientCompanies(updatedCompanies);

    // Give new company default initial model access (e.g. basic GPS Tracker & M2M SIM)
    const updatedAccessMap = {
      ...accessMap,
      [newComp.id]: {
        'mcat-03': true, // FMB140 GPS
        'mcat-10': true, // M2M SIM
      },
    };
    setAccessMap(updatedAccessMap);
    saveCompanyModelAccessMap(updatedAccessMap);

    setShowAddCompanyModal(false);
    setNewCompanyForm({
      name: '',
      legalName: '',
      industry: 'Bulk Transport & Logistics',
      city: '',
      country: 'India',
      contactEmail: '',
      contactPhone: '',
    });

    setToast({
      message: `Company "${newComp.name}" registered. Initial model access configured.`,
      type: 'success',
    });

    // Auto-open this company's Model Access
    setSelectedCompanyId(newComp.id);
    setActiveTab('model-access');
  };

  // --------------------------------------------------------------------------
  // RENDER: COMPANY DETAILS (MODEL ACCESS TAB)
  // --------------------------------------------------------------------------
  if (selectedCompanyId && selectedCompany) {
    const isBinaryTenant = selectedCompany.isPlatformOwner;

    return (
      <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`fixed top-4 right-6 z-[100] flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 border ${
              toast.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {toast.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
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

        {/* In-Use Disabling Impact Confirmation Modal */}
        {inUseWarningModal.open && inUseWarningModal.model && (
          <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Confirm Disabling Model in Active Use
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      <strong>{inUseWarningModal.model.typeName}</strong>{' '}
                      {inUseWarningModal.model.modelReference && `(${inUseWarningModal.model.modelReference})`}{' '}
                      currently has{' '}
                      <span className="font-bold text-amber-700">
                        {inUseWarningModal.inUseCount} active physical units / mappings
                      </span>{' '}
                      assigned under <strong>{selectedCompany.name}</strong>.
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span>Safe Operational Lifecycle Protection:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    • <strong>New Registrations:</strong> Prevents new vehicles or assets from being paired with this model type.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    • <strong>Existing Fleet Unaffected:</strong> Historical trips, existing {inUseWarningModal.inUseCount} device mappings, and live telemetry data will continue to function without interruption.
                  </p>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setInUseWarningModal({ open: false, model: null, inUseCount: 0 })
                  }
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Keep Enabled (Cancel)
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDisableInUse}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Confirm & Queue Disable
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Breadcrumb & Header Bar */}
        <div className="bg-white px-6 pt-4 pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCompanyId(null)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>All Companies</span>
              </button>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span>/</span>
                <span>Company Management</span>
                <span>/</span>
                <span className="text-slate-800 font-bold">{selectedCompany.name}</span>
              </div>
            </div>

            {/* Switch to another client company quick dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Jump to Company:</span>
              <select
                value={selectedCompany.id}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#FA8A63] cursor-pointer"
              >
                {companies
                  .filter((c) => !c.isPlatformOwner)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.sitesCount} sites)
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Context Banner */}
          <div className="p-4 bg-gradient-to-r from-slate-50 to-orange-50/40 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-sm font-black text-[#9D174D]">
                {selectedCompany.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900">{selectedCompany.name}</h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                    {selectedCompany.status}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Client Tenant
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>{selectedCompany.industry}</span>
                  <span>•</span>
                  <span>{selectedCompany.sitesCount} Sites</span>
                  <span>•</span>
                  <span>{selectedCompany.city}, {selectedCompany.country}</span>
                  <span>•</span>
                  <span>{selectedCompany.contactEmail}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">
                  {currentCompanyStats.enabled} / {currentCompanyStats.total} Models Enabled
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {currentCompanyStats.devices} Devices • {currentCompanyStats.sensors} Sensors • {currentCompanyStats.sims} SIMs
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 mt-4 -mb-3">
            {[
              { id: 'model-access', label: 'Model Access', count: currentCompanyStats.enabled, icon: SlidersHorizontal },
              { id: 'overview', label: 'Overview', icon: Building2 },
              { id: 'sites', label: 'Sites', count: selectedCompany.sitesCount, icon: MapPin },
              { id: 'activity', label: 'Activity & Audit Log', icon: History },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'border-[#FA8A63] text-[#B85324]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-[#FFF3EE] text-[#FA8A63]'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6">
          {activeTab === 'model-access' && (
            <div className="space-y-4">
              {/* Header Title & Actions Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">Enabled Model Types</h2>
                      <InfoTip text={COMPANY_MODEL_TOOLTIPS.companyContext} align="left" />
                      {unsavedCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                          ● {unsavedCount} Unsaved Change(s)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select which globally defined Device, Sensor and SIM types this company can use for new registrations and mappings.
                    </p>
                  </div>

                  {/* Actions & Save */}
                  <div className="flex items-center gap-2.5">
                    {unsavedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetPending}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span>Cancel / Reset</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={unsavedCount === 0}
                      onClick={handleSaveChanges}
                      className={`inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer ${
                        unsavedCount > 0
                          ? 'bg-[#FA8A63] hover:bg-[#e57953] text-white ring-2 ring-orange-200 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes {unsavedCount > 0 && `(${unsavedCount})`}</span>
                    </button>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
                  <div className="flex items-center gap-2.5 flex-1">
                    {/* Search */}
                    <div className="relative w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Search Type, Model, Manufacturer..."
                        className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-slate-50/60 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#FA8A63]"
                      />
                      {modelSearch && (
                        <button
                          type="button"
                          onClick={() => setModelSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-600">Category:</span>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value as any)}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All Categories</option>
                        <option value="Device">Device</option>
                        <option value="Sensor">Sensor</option>
                        <option value="SIM">SIM</option>
                      </select>
                      <InfoTip text={COMPANY_MODEL_TOOLTIPS.categoryFilter} align="center" />
                    </div>

                    {/* Enablement Filter */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-600">Enablement:</span>
                      <select
                        value={enablementFilter}
                        onChange={(e) => setEnablementFilter(e.target.value as any)}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All States</option>
                        <option value="Enabled">Enabled Only</option>
                        <option value="Disabled">Disabled Only</option>
                      </select>
                      <InfoTip text={COMPANY_MODEL_TOOLTIPS.enablementFilter} align="center" />
                    </div>

                    {/* Global Status Filter */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-600">Global Status:</span>
                      <select
                        value={globalStatusFilter}
                        onChange={(e) => setGlobalStatusFilter(e.target.value as any)}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-[#FA8A63]"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active in Master</option>
                        <option value="Inactive">Inactive in Master</option>
                      </select>
                      <InfoTip text={COMPANY_MODEL_TOOLTIPS.globalStatusFilter} align="center" />
                    </div>
                  </div>

                  {/* Batch Selection Actions */}
                  {selectedModelIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-orange-50/80 px-2.5 py-1 rounded-lg border border-orange-200 text-xs">
                      <span className="font-bold text-[#B85324]">
                        {selectedModelIds.length} Selected
                      </span>
                      <button
                        type="button"
                        onClick={handleBatchEnable}
                        className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 cursor-pointer"
                      >
                        Enable
                      </button>
                      <button
                        type="button"
                        onClick={handleBatchDisable}
                        className="px-2 py-0.5 rounded bg-slate-600 text-white font-bold text-[11px] hover:bg-slate-700 cursor-pointer"
                      >
                        Disable
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Master Model Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                      <th className="w-10 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredModels.length > 0 &&
                            selectedModelIds.length === filteredModels.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedModelIds(filteredModels.map((m) => m.id));
                            } else {
                              setSelectedModelIds([]);
                            }
                          }}
                          className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>Enable</span>
                          <InfoTip text={COMPANY_MODEL_TOOLTIPS.enableCol} align="left" />
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>Category</span>
                          <InfoTip text={COMPANY_MODEL_TOOLTIPS.categoryCol} align="center" />
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>Type Name</span>
                          <InfoTip text={COMPANY_MODEL_TOOLTIPS.typeNameCol} align="left" />
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>Manufacturer / Provider</span>
                          <InfoTip text={COMPANY_MODEL_TOOLTIPS.manufacturerCol} align="center" />
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>Model / Reference</span>
                          <InfoTip text={COMPANY_MODEL_TOOLTIPS.modelReferenceCol} align="center" />
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>Identifier Type</span>
                          <InfoTip text={COMPANY_MODEL_TOOLTIPS.identifierTypeCol} align="center" />
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>Global Status</span>
                          <InfoTip text={COMPANY_MODEL_TOOLTIPS.globalStatusCol} align="center" />
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span>In-Use Status</span>
                          <InfoTip text={COMPANY_MODEL_TOOLTIPS.inUseStatusCol} align="right" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredModels.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-700">No hardware models match the filter</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Adjust filters or create additional models in global Model Category Master.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredModels.map((model) => {
                        const compAccess = accessMap[selectedCompanyId] || {};
                        const isOriginalEnabled = !!compAccess[model.id];
                        const isPending = pendingEdits[model.id] !== undefined;
                        const isEnabled = isPending ? pendingEdits[model.id] : isOriginalEnabled;
                        const inUseCount = (inUseMap[selectedCompanyId] || {})[model.id] || 0;
                        const isGloballyInactive = model.status === 'Inactive';
                        const isSelected = selectedModelIds.includes(model.id);

                        return (
                          <tr
                            key={model.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isPending ? 'bg-orange-50/30' : ''
                            }`}
                          >
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedModelIds((prev) => [...prev, model.id]);
                                  } else {
                                    setSelectedModelIds((prev) =>
                                      prev.filter((id) => id !== model.id)
                                    );
                                  }
                                }}
                                className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer"
                              />
                            </td>

                            {/* Enable Toggle */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isGloballyInactive && !isEnabled}
                                  onClick={() => handleToggleModel(model)}
                                  title={
                                    isGloballyInactive && !isEnabled
                                      ? 'Globally Inactive — Cannot enable. Activate in Model Category Master first.'
                                      : isEnabled
                                      ? 'Click to disable for this company'
                                      : 'Click to enable for this company'
                                  }
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    isGloballyInactive && !isEnabled
                                      ? 'bg-slate-200 opacity-60 cursor-not-allowed'
                                      : isEnabled
                                      ? 'bg-[#FA8A63]'
                                      : 'bg-slate-300'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                      isEnabled ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <span
                                  className={`text-[11px] font-bold ${
                                    isEnabled ? 'text-emerald-700' : 'text-slate-400'
                                  }`}
                                >
                                  {isEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                                {isPending && (
                                  <span className="text-[10px] font-bold text-[#FA8A63]">
                                    (Unsaved)
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Category */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                  model.category === 'Device'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : model.category === 'Sensor'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {model.category === 'Device' && <Cpu className="w-3 h-3" />}
                                {model.category === 'Sensor' && <Radio className="w-3 h-3" />}
                                {model.category === 'SIM' && <Smartphone className="w-3 h-3" />}
                                <span>{model.category}</span>
                              </span>
                            </td>

                            {/* Type Name */}
                            <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                              {model.typeName}
                            </td>

                            {/* Manufacturer / Provider */}
                            <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                              {model.manufacturer || '—'}
                            </td>

                            {/* Model / Reference */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {model.modelReference ? (
                                <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                  {model.modelReference}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Identifier Type */}
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {getRecordIdentifierTypes(model).map((idType) => (
                                  <span
                                    key={idType}
                                    className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-semibold"
                                  >
                                    {idType}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Global Status */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  model.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    model.status === 'Active'
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-400'
                                  }`}
                                />
                                {model.status}
                              </span>
                            </td>

                            {/* In-Use Status */}
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              {inUseCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                  <span>In Use ({inUseCount})</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">0 assigned</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Informational Callout linking to Model Category Master */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100/70 border border-orange-200 flex items-center justify-center text-[#FA8A63] shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">
                      Need to create a new hardware model type?
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      New Device, Sensor, and SIM models are defined globally in the Model Category Master. Once registered, they appear here for per-company enablement.
                    </div>
                  </div>
                </div>

                {onNavigateToModelCategoryMaster && (
                  <button
                    type="button"
                    onClick={onNavigateToModelCategoryMaster}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <span>Open Model Category Master</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Activity & Audit Log Tab */}
          {activeTab === 'activity' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Model Enablement Audit Log — {selectedCompany.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Immutable history of model enablement changes made by authorized Platform Administrators.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                    <tr>
                      <th className="px-4 py-2.5">Timestamp</th>
                      <th className="px-4 py-2.5">Model / Type</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Action</th>
                      <th className="px-4 py-2.5">Actor</th>
                      <th className="px-4 py-2.5">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs
                      .filter((log) => log.companyId === selectedCompanyId)
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-slate-500 text-[11px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-900">
                            {log.modelName}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {log.category}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                log.action === 'Enabled'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 font-medium">
                            {log.actor}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                            {log.note || '—'}
                          </td>
                        </tr>
                      ))}
                    {auditLogs.filter((log) => log.companyId === selectedCompanyId).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No audit log entries recorded yet for this client company.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Company Profile</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-slate-400 mb-0.5">Company Name</div>
                    <div className="font-semibold text-slate-800">{selectedCompany.name}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-0.5">Legal Entity Name</div>
                    <div className="font-semibold text-slate-800">{selectedCompany.legalName}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-0.5">Primary Industry</div>
                    <div className="font-semibold text-slate-800">{selectedCompany.industry}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-0.5">Operating Sites</div>
                    <div className="font-semibold text-slate-800">{selectedCompany.sitesCount} Hubs / Plants</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Primary Contact & Location</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-slate-400 mb-0.5">Contact Email</div>
                    <div className="font-semibold text-slate-800">{selectedCompany.contactEmail}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-0.5">Contact Phone</div>
                    <div className="font-semibold text-slate-800">{selectedCompany.contactPhone}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-0.5">City & State</div>
                    <div className="font-semibold text-slate-800">{selectedCompany.city}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-0.5">Country</div>
                    <div className="font-semibold text-slate-800">{selectedCompany.country}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sites Tab */}
          {activeTab === 'sites' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Operating Sites & Depots ({selectedCompany.sitesCount})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Physical dispatch centers and maintenance yards mapped to {selectedCompany.name}.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                {Array.from({ length: selectedCompany.sitesCount }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start gap-2.5"
                  >
                    <MapPin className="w-4 h-4 text-[#FA8A63] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">
                        {selectedCompany.name} Site #{idx + 1}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Operational Logistics Hub • Active
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: COMPANY LIST SCREEN (DEFAULT)
  // --------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-6 z-[100] flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 border ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : toast.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {toast.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
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

      {/* Add Company Modal */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">+ Add Client Company</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Register a new client tenant to enable hardware models and manage fleet access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCompanyModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                  <InfoTip text="Display trade name of the client enterprise." align="left" />
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adani Hazira, DP World, DHL Supply Chain"
                  value={newCompanyForm.name}
                  onChange={(e) =>
                    setNewCompanyForm({ ...newCompanyForm, name: e.target.value })
                  }
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FA8A63]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Legal Entity Name
                  <InfoTip text="Registered business name for contracts and invoicing." align="left" />
                </label>
                <input
                  type="text"
                  placeholder="e.g. Adani Hazira Port Pvt Ltd"
                  value={newCompanyForm.legalName}
                  onChange={(e) =>
                    setNewCompanyForm({ ...newCompanyForm, legalName: e.target.value })
                  }
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FA8A63]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Industry Vertical
                  </label>
                  <select
                    value={newCompanyForm.industry}
                    onChange={(e) =>
                      setNewCompanyForm({ ...newCompanyForm, industry: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="Ports, Marine & SEZ Logistics">Ports, Marine & SEZ Logistics</option>
                    <option value="Cash Logistics & Armored Transport">Cash Logistics & Armored Transport</option>
                    <option value="Organic Dairy & Cold Chain Logistics">Organic Dairy & Cold Chain</option>
                    <option value="Bulk Transport & Long-Haul Freight">Bulk Transport & Long-Haul</option>
                    <option value="FMCG & Urban Distribution">FMCG & Urban Distribution</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Registered City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Surat, Mumbai, Bengaluru"
                    value={newCompanyForm.city}
                    onChange={(e) =>
                      setNewCompanyForm({ ...newCompanyForm, city: e.target.value })
                    }
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="ops@client.example"
                    value={newCompanyForm.contactEmail}
                    onChange={(e) =>
                      setNewCompanyForm({ ...newCompanyForm, contactEmail: e.target.value })
                    }
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 22 5550 0100"
                    value={newCompanyForm.contactPhone}
                    onChange={(e) =>
                      setNewCompanyForm({ ...newCompanyForm, contactPhone: e.target.value })
                    }
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Register Company & Set Models
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Container */}
      <div className="bg-white px-6 pt-4 pb-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-0.5">
              <span>Platform Admin</span>
              <span>/</span>
              <span>Company Settings</span>
              <span>/</span>
              <span className="text-slate-700 font-semibold">Company Management</span>
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Company Management
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF3EE] text-[#F26522] border border-[#F26522]/20">
                {filteredCompanies.length} Client Companies
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage client companies and their enabled hardware models.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onNavigateToModelCategoryMaster && (
              <button
                type="button"
                onClick={onNavigateToModelCategoryMaster}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Global Model Master</span>
              </button>
            )}

            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowAddCompanyModal(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Company</span>
              </button>
              <InfoTip text={COMPANY_MODEL_TOOLTIPS.addCompany} align="right" />
            </div>
          </div>
        </div>

        {/* Filters and Controls Row */}
        <div className="flex items-center justify-between pt-2 gap-3">
          <div className="flex items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Search company, industry, city..."
                className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-slate-50/60 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#FA8A63]"
              />
              {companySearch && (
                <button
                  type="button"
                  onClick={() => setCompanySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <InfoTip text={COMPANY_MODEL_TOOLTIPS.searchCompany} align="left" />

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-600">Status:</span>
              <select
                value={companyStatusFilter}
                onChange={(e) => setCompanyStatusFilter(e.target.value as any)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:outline-none focus:border-[#FA8A63]"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Inactive">Inactive</option>
              </select>
              <InfoTip text={COMPANY_MODEL_TOOLTIPS.companyStatus} align="center" />
            </div>

            {/* Industry Filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-600">Industry:</span>
              <select
                value={companyIndustryFilter}
                onChange={(e) => setCompanyIndustryFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:outline-none focus:border-[#FA8A63]"
              >
                <option value="All">All Industries</option>
                <option value="Ports">Ports & Marine</option>
                <option value="Cash">Cash Logistics</option>
                <option value="Dairy">Cold Chain & Dairy</option>
                <option value="Transport">Bulk Transport</option>
              </select>
              <InfoTip text={COMPANY_MODEL_TOOLTIPS.industry} align="center" />
            </div>

            {(companySearch || companyStatusFilter !== 'All' || companyIndustryFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setCompanySearch('');
                  setCompanyStatusFilter('All');
                  setCompanyIndustryFilter('All');
                }}
                className="text-xs text-[#FA8A63] font-semibold hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Company List Table */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                <th className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>Company Name</span>
                    <InfoTip text={COMPANY_MODEL_TOOLTIPS.companyName} align="left" />
                  </div>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>Industry</span>
                    <InfoTip text={COMPANY_MODEL_TOOLTIPS.industry} align="center" />
                  </div>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>Sites</span>
                    <InfoTip text={COMPANY_MODEL_TOOLTIPS.sites} align="center" />
                  </div>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>Company Status</span>
                    <InfoTip text={COMPANY_MODEL_TOOLTIPS.companyStatus} align="center" />
                  </div>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>Enabled Model Types</span>
                    <InfoTip text={COMPANY_MODEL_TOOLTIPS.enabledModels} align="center" />
                  </div>
                </th>
                <th className="px-3 py-3 whitespace-nowrap text-right w-[76px]">
                  <div className="flex items-center justify-end gap-1">
                    <span>Actions</span>
                    <InfoTip text={COMPANY_MODEL_TOOLTIPS.actions} align="right" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.map((company) => {
                const enabledCount = getEnabledCountForCompany(company.id);
                const totalGlobal = globalModels.length;
                const percentage = totalGlobal > 0 ? Math.round((enabledCount / totalGlobal) * 100) : 0;

                return (
                  <tr
                    key={company.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedCompanyId(company.id);
                      setActiveTab('model-access');
                    }}
                  >
                    {/* Company Name */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-[#9D174D]">
                          {company.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 hover:text-[#FA8A63] transition-colors">
                            {company.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {company.legalName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Industry */}
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {company.industry}
                      </span>
                    </td>

                    {/* Sites */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">
                        {company.sitesCount} Sites
                      </span>
                    </td>

                    {/* Company Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          company.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : company.status === 'Onboarding'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            company.status === 'Active'
                              ? 'bg-emerald-500'
                              : company.status === 'Onboarding'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        {company.status}
                      </span>
                    </td>

                    {/* Enabled Models */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="w-48">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                          <span className="text-slate-800">
                            {enabledCount} of {totalGlobal} enabled
                          </span>
                          <span className="text-slate-400">{percentage}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#FA8A63] rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3.5 whitespace-nowrap text-right">
                      <div
                        className="flex items-center justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RowActionMenu
                          ariaLabel={`Actions for ${company.name}`}
                          items={[
                            {
                              id: 'model-access',
                              label: 'Manage Model Access',
                              icon: <SlidersHorizontal className="w-3.5 h-3.5 text-[#E56B38]" />,
                              tone: 'accent',
                              onClick: () => {
                                setSelectedCompanyId(company.id);
                                setActiveTab('model-access');
                              },
                            },
                            {
                              id: 'overview',
                              label: 'Company Overview',
                              icon: <Building2 className="w-3.5 h-3.5 text-slate-400" />,
                              onClick: () => {
                                setSelectedCompanyId(company.id);
                                setActiveTab('overview');
                              },
                            },
                            {
                              id: 'sites',
                              label: 'Sites & Depots',
                              icon: <MapPin className="w-3.5 h-3.5 text-slate-400" />,
                              onClick: () => {
                                setSelectedCompanyId(company.id);
                                setActiveTab('sites');
                              },
                            },
                            {
                              id: 'activity',
                              label: 'Activity & Audit Log',
                              icon: <History className="w-3.5 h-3.5 text-slate-400" />,
                              onClick: () => {
                                setSelectedCompanyId(company.id);
                                setActiveTab('activity');
                              },
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
      </div>
    </div>
  );
};
