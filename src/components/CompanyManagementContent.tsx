import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowLeft,
  Building2,
  Cpu,
  Radio,
  Smartphone,
  ShieldAlert,
  Save,
  RotateCcw,
  Plus,
  Layers,
  History,
  MapPin,
  ExternalLink,
  SlidersHorizontal,
  FileDown,
  Layers3,
  UserCheck,
  Info,
} from 'lucide-react';
import { RowActionMenu } from './common/RowActionMenu';
import { ColumnCataloguePopover, ColumnCatalogueItem } from './ColumnCataloguePopover';
import {
  ClientCompany,
  CompanyAuditEntry,
  CompanyActivationState,
  COMPANY_MODEL_TOOLTIPS,
  InUseDetail,
  PROTOTYPE_DEMO_ACTORS,
  PrototypeActorInfo,
  getActivePrototypeActor,
  saveActivePrototypeActor,
  isCompanyEligibleForNewRegistration,
  loadClientCompanies,
  saveClientCompanies,
  loadCompanyModelAccessMap,
  saveCompanyModelAccessMap,
  loadCompanyAuditLogs,
  saveCompanyAuditLogs,
  getDefaultCompanyActivation,
  loadCompanyActivationMap,
  saveCompanyActivationMap,
} from '../types/companyModelEnablement';
import {
  ModelCategoryRecord,
  getRecordIdentifierTypes,
  loadModelCategoryStore,
} from '../types/modelCategoryMaster';
import { computeCompanyInUseDetailsMap } from '../utils/modelCategoryRefs';
import {
  ModelAccessFilterDrawer,
  ModelAccessFilters,
  ModelRowComputed,
  EMPTY_MODEL_ACCESS_FILTERS,
  countActiveModelAccessFilters,
  matchesModelAccessFilters,
} from './company-management/ModelAccessFilterDrawer';
import {
  CompanyDirectoryFilterDrawer,
  CompanyDirectoryFilters,
  EMPTY_COMPANY_DIRECTORY_FILTERS,
  countActiveCompanyFilters,
} from './company-management/CompanyDirectoryFilterDrawer';
import { ModelAccessBulkDrawer } from './company-management/ModelAccessBulkDrawer';
import { ModelAccessExportModal } from './company-management/ModelAccessExportModal';
import { CompanyActivationSection } from './company-management/CompanyActivationSection';

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
          className={`pointer-events-none absolute z-[120] bottom-full mb-1.5 w-64 p-2 rounded-lg bg-slate-900 text-white text-[11px] font-normal leading-relaxed shadow-xl border border-slate-700 whitespace-normal ${
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

// Column catalogue definitions
const COMPANY_DIRECTORY_COLUMNS: ColumnCatalogueItem[] = [
  { key: 'companyName', label: 'Company Name', category: 'DEFAULT COLUMNS', required: true },
  { key: 'industry', label: 'Industry', category: 'DEFAULT COLUMNS' },
  { key: 'sites', label: 'Sites', category: 'DEFAULT COLUMNS' },
  { key: 'status', label: 'Company Status', category: 'DEFAULT COLUMNS' },
  { key: 'enabledModelTypes', label: 'Enabled Model Types', category: 'DEFAULT COLUMNS' },
  { key: 'actions', label: 'Actions', category: 'DEFAULT COLUMNS', required: true },

  { key: 'companyId', label: 'Company ID', category: 'TENANT METADATA' },
  { key: 'location', label: 'City / Country', category: 'TENANT METADATA' },
  { key: 'contactEmail', label: 'Contact Email', category: 'TENANT METADATA' },
  { key: 'grantedModels', label: 'Granted Models', category: 'MODEL ACCESS COUNTS' },
  { key: 'availableModels', label: 'Currently Available Models', category: 'MODEL ACCESS COUNTS' },
  { key: 'categoryBreakdown', label: 'Device / Sensor / SIM Counts', category: 'MODEL ACCESS COUNTS' },
  { key: 'updatedAt', label: 'Last Updated', category: 'TENANT METADATA' },
];

const DEFAULT_COMPANY_DIRECTORY_COLUMN_KEYS = [
  'companyName',
  'industry',
  'sites',
  'status',
  'enabledModelTypes',
  'actions',
];

const MODEL_ACCESS_COLUMNS: ColumnCatalogueItem[] = [
  { key: 'companyAccess', label: 'Company Access', category: 'DEFAULT COLUMNS', required: true },
  { key: 'category', label: 'Category', category: 'DEFAULT COLUMNS' },
  { key: 'typeName', label: 'Model Type', category: 'DEFAULT COLUMNS', required: true },
  { key: 'manufacturer', label: 'Manufacturer / Provider', category: 'DEFAULT COLUMNS' },
  { key: 'modelReference', label: 'Model Name / Number', category: 'DEFAULT COLUMNS' },
  { key: 'identifierTypes', label: 'Identifier Types', category: 'DEFAULT COLUMNS' },
  { key: 'globalStatus', label: 'Global Model Status', category: 'DEFAULT COLUMNS' },
  { key: 'inUse', label: 'In Use', category: 'DEFAULT COLUMNS' },

  { key: 'modelId', label: 'Model ID', category: 'CATALOGUE DETAILS' },
  { key: 'deviceFunction', label: 'Device Function', category: 'DEVICE ATTRIBUTES' },
  { key: 'supportedModes', label: 'Supported Modes', category: 'DEVICE ATTRIBUTES' },
  { key: 'simType', label: 'SIM Type', category: 'SIM ATTRIBUTES' },
  { key: 'updatedAt', label: 'Model Last Updated', category: 'CATALOGUE DETAILS' },
  { key: 'pendingChange', label: 'Pending Change', category: 'ACCESS STATE' },
  { key: 'currentlyAvailable', label: 'Currently Available', category: 'ACCESS STATE' },
];

const DEFAULT_MODEL_ACCESS_COLUMN_KEYS = [
  'companyAccess',
  'category',
  'typeName',
  'manufacturer',
  'modelReference',
  'identifierTypes',
  'globalStatus',
  'inUse',
];

const EMPTY_IN_USE: InUseDetail = {
  count: 0,
  liveInventoryCount: 0,
  liveMappingCount: 0,
  seedBaselineCount: 0,
  provenance: 'none',
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
  const [auditLogs, setAuditLogs] = useState<CompanyAuditEntry[]>(() => loadCompanyAuditLogs());
  const [activeActor, setActiveActor] = useState<PrototypeActorInfo>(() =>
    getActivePrototypeActor()
  );
  const [inUseRefreshTick, setInUseRefreshTick] = useState(0);

  // Dynamically recompute in-use counts from live inventory/mappings + verified demo baseline
  const inUseDetailsMap = useMemo(() => {
    void inUseRefreshTick;
    return computeCompanyInUseDetailsMap(companies, globalModels);
  }, [companies, globalModels, inUseRefreshTick]);

  const [activationMap, setActivationMap] = useState<Record<string, CompanyActivationState>>(() =>
    loadCompanyActivationMap()
  );

  // Navigation / active company detail
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'admin-access' | 'sites' | 'activation' | 'activity'
  >('activation');
  const [activationSubTab, setActivationSubTab] = useState<'modules' | 'model-access'>('modules');

  // Pending unsaved edits for the currently viewed company: modelId -> boolean
  const [pendingEdits, setPendingEdits] = useState<Record<string, boolean>>({});

  // Unsaved edits confirmation on company switch / back navigation
  const [unsavedNavModal, setUnsavedNavModal] = useState<{
    open: boolean;
    targetCompanyId: string | null;
  }>({ open: false, targetCompanyId: null });

  // Company Directory search, filters & columns
  const [companySearch, setCompanySearch] = useState('');
  const [companyDirFilters, setCompanyDirFilters] = useState<CompanyDirectoryFilters>(
    EMPTY_COMPANY_DIRECTORY_FILTERS
  );
  const [isCompanyFilterDrawerOpen, setIsCompanyFilterDrawerOpen] = useState(false);
  const [companyVisibleCols, setCompanyVisibleCols] = useState<string[]>(
    DEFAULT_COMPANY_DIRECTORY_COLUMN_KEYS
  );

  // Model Access search, filters, drawers & columns
  const [modelSearch, setModelSearch] = useState('');
  const [modelFilters, setModelFilters] = useState<ModelAccessFilters>(
    EMPTY_MODEL_ACCESS_FILTERS
  );
  const [isModelFilterDrawerOpen, setIsModelFilterDrawerOpen] = useState(false);
  const [isBulkDrawerOpen, setIsBulkDrawerOpen] = useState(false);
  const [exportModalState, setExportModalState] = useState<{
    open: boolean;
    defaultScope: 'filtered' | 'selected';
  }>({ open: false, defaultScope: 'filtered' });
  const [modelVisibleCols, setModelVisibleCols] = useState<string[]>(
    DEFAULT_MODEL_ACCESS_COLUMN_KEYS
  );

  // Multi-select for bulk operations (strictly visible IDs)
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Single-row in-use confirmation modal
  const [inUseWarningModal, setInUseWarningModal] = useState<{
    open: boolean;
    model: ModelCategoryRecord | null;
    inUseDetail: InUseDetail;
  }>({ open: false, model: null, inUseDetail: EMPTY_IN_USE });

  // Add Company Modal state (no fabricated defaults)
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState<{
    name: string;
    legalName: string;
    industry: string;
    status: 'Active' | 'Onboarding';
    allowOnboardingRegistration: boolean;
    city: string;
    country: string;
    contactEmail: string;
    contactPhone: string;
  }>({
    name: '',
    legalName: '',
    industry: 'Bulk Transport & Long-Haul Freight',
    status: 'Active',
    allowOnboardingRegistration: false,
    city: '',
    country: 'India',
    contactEmail: '',
    contactPhone: '',
  });

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(
    null
  );

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync across Model Category Master, Hardware Masters, Asset Mapping, and storage events
  useEffect(() => {
    const handleSync = () => {
      setGlobalModels(loadModelCategoryStore());
      setCompanies(loadClientCompanies());
      setAccessMap(loadCompanyModelAccessMap());
      setAuditLogs(loadCompanyAuditLogs());
      setInUseRefreshTick((t) => t + 1);
    };
    window.addEventListener('fleetrobo:model-access-updated', handleSync);
    window.addEventListener('fleetrobo:modal-master-updated', handleSync);
    window.addEventListener('fleetrobo:resources-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('fleetrobo:model-access-updated', handleSync);
      window.removeEventListener('fleetrobo:modal-master-updated', handleSync);
      window.removeEventListener('fleetrobo:resources-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Selected company object
  const selectedCompany = useMemo(() => {
    if (!selectedCompanyId) return null;
    return companies.find((c) => c.id === selectedCompanyId) || null;
  }, [selectedCompanyId, companies]);

  // Helper: compute company-level model counts for Company Directory
  const getCompanyMetrics = (company: ClientCompany) => {
    const compAccess = accessMap[company.id] || {};
    const eligibleCompany = isCompanyEligibleForNewRegistration(company);

    let grantedTotal = 0;
    let grantedActiveGlobal = 0;
    let grantedInactiveGlobal = 0;
    let devicesAvailable = 0;
    let sensorsAvailable = 0;
    let simsAvailable = 0;

    globalModels.forEach((m) => {
      if (compAccess[m.id]) {
        grantedTotal++;
        if (m.status === 'Active') {
          grantedActiveGlobal++;
          if (eligibleCompany) {
            if (m.category === 'Device') devicesAvailable++;
            if (m.category === 'Sensor') sensorsAvailable++;
            if (m.category === 'SIM') simsAvailable++;
          }
        } else {
          grantedInactiveGlobal++;
        }
      }
    });

    const currentlyAvailable = eligibleCompany ? grantedActiveGlobal : 0;
    const totalGlobalActive = globalModels.filter((m) => m.status === 'Active').length;

    return {
      grantedTotal,
      grantedActiveGlobal,
      grantedInactiveGlobal,
      currentlyAvailable,
      totalGlobal: globalModels.length,
      totalGlobalActive,
      devicesAvailable,
      sensorsAvailable,
      simsAvailable,
      eligibleCompany,
    };
  };

  // Filtered companies list
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (c.isPlatformOwner) return false;

      const q = companySearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.legalName.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.contactEmail.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (
        companyDirFilters.statuses.length > 0 &&
        !companyDirFilters.statuses.includes(c.status)
      ) {
        return false;
      }
      if (
        companyDirFilters.industries.length > 0 &&
        !companyDirFilters.industries.includes(c.industry.trim())
      ) {
        return false;
      }
      if (companyDirFilters.locations.length > 0) {
        const loc = [c.city?.trim(), c.country?.trim()].filter(Boolean).join(', ');
        if (!companyDirFilters.locations.includes(loc)) return false;
      }
      if (companyDirFilters.hasEnabledModels !== 'All') {
        const { currentlyAvailable } = getCompanyMetrics(c);
        if (companyDirFilters.hasEnabledModels === 'Yes' && currentlyAvailable <= 0) return false;
        if (companyDirFilters.hasEnabledModels === 'No' && currentlyAvailable > 0) return false;
      }

      return true;
    });
  }, [companies, companySearch, companyDirFilters, accessMap, globalModels]);

  // Precompute rows for active company
  const allModelRows: ModelRowComputed[] = useMemo(() => {
    if (!selectedCompany) return [];
    const compAccess = accessMap[selectedCompany.id] || {};
    const compInUse = inUseDetailsMap[selectedCompany.id] || {};
    const companyEligible = isCompanyEligibleForNewRegistration(selectedCompany);

    return globalModels.map((model) => {
      const isSavedEnabled = !!compAccess[model.id];
      const isPending = pendingEdits[model.id] !== undefined;
      const isEffectiveEnabled = isPending ? pendingEdits[model.id] : isSavedEnabled;
      const isCurrentlyAvailable =
        isEffectiveEnabled && model.status === 'Active' && companyEligible;
      const inUseDetail = compInUse[model.id] || EMPTY_IN_USE;

      return {
        model,
        isSavedEnabled,
        isEffectiveEnabled,
        isPending,
        isCurrentlyAvailable,
        inUseDetail,
      };
    });
  }, [selectedCompany, globalModels, accessMap, inUseDetailsMap, pendingEdits]);

  // Apply search + sectional drawer filters
  const filteredRows = useMemo(() => {
    const q = modelSearch.toLowerCase().trim();
    return allModelRows.filter((row) => {
      const m = row.model;
      const matchesSearch =
        !q ||
        m.id.toLowerCase().includes(q) ||
        m.typeName.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q) ||
        m.modelReference.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        getRecordIdentifierTypes(m).join(' ').toLowerCase().includes(q);

      if (!matchesSearch) return false;
      return matchesModelAccessFilters(row, modelFilters);
    });
  }, [allModelRows, modelSearch, modelFilters]);

  // Keep selectedModelIds reconciled with currently visible filteredRows (no hidden selections)
  useEffect(() => {
    const visibleSet = new Set(filteredRows.map((r) => r.model.id));
    setSelectedModelIds((prev) => {
      const next = prev.filter((id) => visibleSet.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [filteredRows]);

  const selectedVisibleRows = useMemo(() => {
    const selSet = new Set(selectedModelIds);
    return filteredRows.filter((r) => selSet.has(r.model.id));
  }, [filteredRows, selectedModelIds]);

  const allVisibleSelected =
    filteredRows.length > 0 &&
    filteredRows.every((r) => selectedModelIds.includes(r.model.id));
  const someVisibleSelected =
    !allVisibleSelected &&
    filteredRows.some((r) => selectedModelIds.includes(r.model.id));

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  // Metrics for currently viewed company (reconciling Granted vs Currently Available)
  const currentCompanyStats = useMemo(() => {
    if (!selectedCompany) {
      return {
        totalGlobal: 0,
        totalGlobalActive: 0,
        grantedTotal: 0,
        currentlyAvailable: 0,
        grantedInactiveGlobal: 0,
        grantedDevices: 0,
        grantedSensors: 0,
        grantedSims: 0,
        inUseAssets: 0,
        inUseModelCount: 0,
        hasLiveUsage: false,
      };
    }

    let grantedTotal = 0;
    let currentlyAvailable = 0;
    let grantedInactiveGlobal = 0;
    let grantedDevices = 0;
    let grantedSensors = 0;
    let grantedSims = 0;
    let inUseAssets = 0;
    let inUseModelCount = 0;
    let hasLiveUsage = false;
    let totalGlobalActive = 0;

    allModelRows.forEach((row) => {
      if (row.model.status === 'Active') totalGlobalActive++;
      if (row.isEffectiveEnabled) {
        grantedTotal++;
        if (row.model.category === 'Device') grantedDevices++;
        if (row.model.category === 'Sensor') grantedSensors++;
        if (row.model.category === 'SIM') grantedSims++;
        if (row.model.status === 'Inactive') grantedInactiveGlobal++;
      }
      if (row.isCurrentlyAvailable) {
        currentlyAvailable++;
      }
      if (row.inUseDetail.count > 0) {
        inUseAssets += row.inUseDetail.count;
        inUseModelCount++;
        if (row.inUseDetail.provenance === 'live') hasLiveUsage = true;
      }
    });

    return {
      totalGlobal: allModelRows.length,
      totalGlobalActive,
      grantedTotal,
      currentlyAvailable,
      grantedInactiveGlobal,
      grantedDevices,
      grantedSensors,
      grantedSims,
      inUseAssets,
      inUseModelCount,
      hasLiveUsage,
    };
  }, [selectedCompany, allModelRows]);

  const unsavedCount = Object.keys(pendingEdits).length;
  const activeModelFilterCount = countActiveModelAccessFilters(modelFilters);
  const activeCompanyFilterCount = countActiveCompanyFilters(companyDirFilters);

  // Navigation guard when switching company or going back with pending edits
  const requestCompanyNavigation = (targetCompanyId: string | null) => {
    if (targetCompanyId === selectedCompanyId) return;
    if (unsavedCount > 0) {
      setUnsavedNavModal({ open: true, targetCompanyId });
      return;
    }
    setPendingEdits({});
    setSelectedModelIds([]);
    setModelFilters(EMPTY_MODEL_ACCESS_FILTERS);
    setModelSearch('');
    setSelectedCompanyId(targetCompanyId);
  };

  // Update active actor
  const handleSelectActor = (actorId: string) => {
    const found = PROTOTYPE_DEMO_ACTORS.find((a) => a.id === actorId);
    if (found) {
      setActiveActor(found);
      saveActivePrototypeActor(found);
    }
  };

  // Update company status or onboarding registration flag
  const handleUpdateCompanyEligibility = (
    companyId: string,
    patch: Partial<Pick<ClientCompany, 'status' | 'allowOnboardingRegistration'>>
  ) => {
    const updated = companies.map((c) =>
      c.id === companyId
        ? {
            ...c,
            ...patch,
            allowOnboardingRegistration:
              patch.status === 'Active'
                ? true
                : patch.status === 'Inactive'
                ? false
                : patch.allowOnboardingRegistration ?? c.allowOnboardingRegistration ?? false,
            updatedAt: new Date().toISOString(),
          }
        : c
    );
    setCompanies(updated);
    saveClientCompanies(updated);
    setToast({
      message: 'Company operational status updated and synced across registration modules.',
      type: 'success',
    });
  };

  // Update module activation & onboarding state for a company
  const handleUpdateCompanyActivation = (
    companyId: string,
    next: CompanyActivationState,
    toastMsg: string
  ) => {
    const updated = {
      ...activationMap,
      [companyId]: next,
    };
    setActivationMap(updated);
    saveCompanyActivationMap(updated);
    setToast({
      message: toastMsg,
      type: 'success',
    });
  };

  // Toggle single model
  const handleToggleModel = (row: ModelRowComputed) => {
    if (!selectedCompanyId) return;
    const { model, isEffectiveEnabled, isSavedEnabled, inUseDetail } = row;

    // Rule 1: A globally inactive model cannot be newly enabled
    if (model.status === 'Inactive' && !isEffectiveEnabled) {
      setToast({
        message: `Cannot enable "${model.typeName}". Model is globally Inactive in Model Category Master.`,
        type: 'warning',
      });
      return;
    }

    const nextVal = !isEffectiveEnabled;

    // Rule 2: If model is currently enabled and in-use, warn before disabling
    if (!nextVal && inUseDetail.count > 0) {
      setInUseWarningModal({
        open: true,
        model,
        inUseDetail,
      });
      return;
    }

    setPendingEdits((prev) => {
      if (nextVal === isSavedEnabled) {
        const copy = { ...prev };
        delete copy[model.id];
        return copy;
      }
      return { ...prev, [model.id]: nextVal };
    });
  };

  // Confirm disable of single in-use model
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

    setInUseWarningModal({ open: false, model: null, inUseDetail: EMPTY_IN_USE });
    setToast({
      message: `Pending disable queued for "${inUseWarningModal.model.typeName}". Click "Save Changes" to commit.`,
      type: 'warning',
    });
  };

  // Bulk Queue Enable (called only after confirmation inside ModelAccessBulkDrawer)
  const handleBulkQueueEnable = (eligibleModelIds: string[]) => {
    if (!selectedCompanyId || eligibleModelIds.length === 0) return;

    setPendingEdits((prev) => {
      const next = { ...prev };
      eligibleModelIds.forEach((id) => {
        const model = globalModels.find((m) => m.id === id);
        if (!model || model.status === 'Inactive') return;
        const originalVal = !!(accessMap[selectedCompanyId] || {})[id];
        if (originalVal) {
          delete next[id];
        } else {
          next[id] = true;
        }
      });
      return next;
    });

    setToast({
      message: `Queued enablement for ${eligibleModelIds.length} model(s). Click "Save Changes" to commit.`,
      type: 'success',
    });
  };

  // Bulk Queue Disable (called only after in-use impact confirmation inside ModelAccessBulkDrawer)
  const handleBulkQueueDisable = (eligibleModelIds: string[]) => {
    if (!selectedCompanyId || eligibleModelIds.length === 0) return;

    setPendingEdits((prev) => {
      const next = { ...prev };
      eligibleModelIds.forEach((id) => {
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
      message: `Queued disablement for ${eligibleModelIds.length} model(s). Click "Save Changes" to commit.`,
      type: 'warning',
    });
  };

  // Save pending changes (returns boolean success)
  const commitPendingChanges = (): number => {
    if (!selectedCompanyId || !selectedCompany || unsavedCount === 0) return 0;

    const currentCompMap = { ...(accessMap[selectedCompanyId] || {}) };
    const newLogs: CompanyAuditEntry[] = [];
    const timestamp = new Date().toISOString();

    Object.entries(pendingEdits).forEach(([modelId, newVal]) => {
      const oldVal = !!currentCompMap[modelId];
      if (oldVal !== newVal) {
        currentCompMap[modelId] = newVal;
        const model = globalModels.find((m) => m.id === modelId);
        newLogs.push({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          companyId: selectedCompanyId,
          companyName: selectedCompany.name,
          modelId,
          modelName: model
            ? `${model.typeName}${model.modelReference ? ` (${model.modelReference})` : ''}`
            : modelId,
          category: model?.category || 'Device',
          action: newVal ? 'Enabled' : 'Disabled',
          actor: activeActor.name,
          timestamp,
          oldValue: oldVal,
          newValue: newVal,
          note: `Model ${newVal ? 'enabled' : 'disabled'} by ${activeActor.name} (${activeActor.role}) for tenant ${selectedCompany.id}.`,
        });
      }
    });

    const updatedAccessMap = {
      ...accessMap,
      [selectedCompanyId]: currentCompMap,
    };

    setAccessMap(updatedAccessMap);
    saveCompanyModelAccessMap(updatedAccessMap);

    if (newLogs.length > 0) {
      const updatedAuditLogs = [...newLogs, ...auditLogs];
      setAuditLogs(updatedAuditLogs);
      saveCompanyAuditLogs(updatedAuditLogs);
    }

    setPendingEdits({});
    setSelectedModelIds([]);
    return newLogs.length;
  };

  const handleSaveChanges = () => {
    const changed = commitPendingChanges();
    if (changed > 0) {
      setToast({
        message: `Model access updated for ${selectedCompany?.name}. ${changed} change(s) committed and audited.`,
        type: 'success',
      });
    } else {
      setPendingEdits({});
    }
  };

  const handleResetPending = () => {
    setPendingEdits({});
    setSelectedModelIds([]);
    setToast({
      message: 'Pending model access changes reverted.',
      type: 'warning',
    });
  };

  // Add Company Form Submit (no fabricated defaults, no auto-granted models)
  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newCompanyForm.name.trim();
    if (!trimmedName) return;

    const nowIso = new Date().toISOString();
    const newComp: ClientCompany = {
      id: `comp-${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tenant'}-${Date.now().toString().slice(-4)}`,
      name: trimmedName,
      legalName: newCompanyForm.legalName.trim(),
      industry: newCompanyForm.industry,
      sitesCount: 1,
      status: newCompanyForm.status,
      allowOnboardingRegistration:
        newCompanyForm.status === 'Onboarding'
          ? newCompanyForm.allowOnboardingRegistration
          : true,
      contactEmail: newCompanyForm.contactEmail.trim(),
      contactPhone: newCompanyForm.contactPhone.trim(),
      city: newCompanyForm.city.trim(),
      country: newCompanyForm.country.trim(),
      updatedAt: nowIso,
      createdAt: nowIso,
    };

    const updatedCompanies = [newComp, ...companies];
    setCompanies(updatedCompanies);
    saveClientCompanies(updatedCompanies);

    // Start new company with zero model grants until explicit Platform Admin approval
    const updatedAccessMap = {
      ...accessMap,
      [newComp.id]: {},
    };
    setAccessMap(updatedAccessMap);
    saveCompanyModelAccessMap(updatedAccessMap);

    setShowAddCompanyModal(false);
    setNewCompanyForm({
      name: '',
      legalName: '',
      industry: 'Bulk Transport & Long-Haul Freight',
      status: 'Active',
      allowOnboardingRegistration: false,
      city: '',
      country: 'India',
      contactEmail: '',
      contactPhone: '',
    });

    setToast({
      message: `Company "${newComp.name}" registered with 0 pre-granted models. Approve desired models below.`,
      type: 'success',
    });

    setModelFilters(EMPTY_MODEL_ACCESS_FILTERS);
    setModelSearch('');
    setSelectedCompanyId(newComp.id);
    setActiveTab('activation');
    setActivationSubTab('model-access');
  };

  // Build applied filter chips for Model Access
  const modelFilterChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (modelFilters.categories.length > 0) {
      chips.push({
        key: 'categories',
        label: `Category: ${modelFilters.categories.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, categories: [] })),
      });
    }
    if (modelFilters.typeNames.length > 0) {
      chips.push({
        key: 'typeNames',
        label: `Model Type: ${modelFilters.typeNames.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, typeNames: [] })),
      });
    }
    if (modelFilters.manufacturers.length > 0) {
      chips.push({
        key: 'manufacturers',
        label: `Manufacturer / Provider: ${modelFilters.manufacturers.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, manufacturers: [] })),
      });
    }
    if (modelFilters.modelReferences.length > 0) {
      chips.push({
        key: 'modelReferences',
        label: `Model Name / Number: ${modelFilters.modelReferences.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, modelReferences: [] })),
      });
    }
    if (modelFilters.identifierTypes.length > 0) {
      chips.push({
        key: 'identifierTypes',
        label: `Identifier Types: ${modelFilters.identifierTypes.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, identifierTypes: [] })),
      });
    }
    if (modelFilters.companyAccess.length > 0) {
      chips.push({
        key: 'companyAccess',
        label: `Company Access: ${modelFilters.companyAccess.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, companyAccess: [] })),
      });
    }
    if (modelFilters.globalStatuses.length > 0) {
      chips.push({
        key: 'globalStatuses',
        label: `Global Status: ${modelFilters.globalStatuses.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, globalStatuses: [] })),
      });
    }
    if (modelFilters.currentlyAvailable !== 'All') {
      chips.push({
        key: 'currentlyAvailable',
        label: `Currently Available: ${modelFilters.currentlyAvailable}`,
        clear: () => setModelFilters((p) => ({ ...p, currentlyAvailable: 'All' })),
      });
    }
    if (modelFilters.pendingChange !== 'All') {
      chips.push({
        key: 'pendingChange',
        label: `Pending Change: ${modelFilters.pendingChange}`,
        clear: () => setModelFilters((p) => ({ ...p, pendingChange: 'All' })),
      });
    }
    if (modelFilters.deviceFunctions.length > 0) {
      chips.push({
        key: 'deviceFunctions',
        label: `Device Function: ${modelFilters.deviceFunctions.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, deviceFunctions: [] })),
      });
    }
    if (modelFilters.supportedModes.length > 0) {
      chips.push({
        key: 'supportedModes',
        label: `Modes: ${modelFilters.supportedModes.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, supportedModes: [] })),
      });
    }
    if (modelFilters.supportedProtocols.length > 0) {
      chips.push({
        key: 'supportedProtocols',
        label: `Protocols: ${modelFilters.supportedProtocols.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, supportedProtocols: [] })),
      });
    }
    if (modelFilters.connectivityTypes.length > 0) {
      chips.push({
        key: 'connectivityTypes',
        label: `Connectivity: ${modelFilters.connectivityTypes.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, connectivityTypes: [] })),
      });
    }
    if (modelFilters.measurementTypes.length > 0) {
      chips.push({
        key: 'measurementTypes',
        label: `Measurement Type: ${modelFilters.measurementTypes.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, measurementTypes: [] })),
      });
    }
    if (modelFilters.measurementUnits.length > 0) {
      chips.push({
        key: 'measurementUnits',
        label: `Measurement Unit: ${modelFilters.measurementUnits.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, measurementUnits: [] })),
      });
    }
    if (modelFilters.simTypes.length > 0) {
      chips.push({
        key: 'simTypes',
        label: `SIM Type: ${modelFilters.simTypes.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, simTypes: [] })),
      });
    }
    if (modelFilters.simFormFactors.length > 0) {
      chips.push({
        key: 'simFormFactors',
        label: `Form Factor: ${modelFilters.simFormFactors.join(', ')}`,
        clear: () => setModelFilters((p) => ({ ...p, simFormFactors: [] })),
      });
    }
    if (modelFilters.inUse !== 'All') {
      chips.push({
        key: 'inUse',
        label: `In Use: ${modelFilters.inUse}`,
        clear: () => setModelFilters((p) => ({ ...p, inUse: 'All' })),
      });
    }
    if (modelFilters.inUseCountMin || modelFilters.inUseCountMax) {
      chips.push({
        key: 'inUseRange',
        label: `In-Use Count: ${modelFilters.inUseCountMin || '0'}–${modelFilters.inUseCountMax || '∞'}`,
        clear: () =>
          setModelFilters((p) => ({ ...p, inUseCountMin: '', inUseCountMax: '' })),
      });
    }
    if (modelFilters.updatedFrom || modelFilters.updatedTo) {
      chips.push({
        key: 'updatedRange',
        label: `Updated: ${modelFilters.updatedFrom || '…'} to ${modelFilters.updatedTo || '…'}`,
        clear: () => setModelFilters((p) => ({ ...p, updatedFrom: '', updatedTo: '' })),
      });
    }
    return chips;
  }, [modelFilters]);

  const companyFilterChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (companyDirFilters.statuses.length > 0) {
      chips.push({
        key: 'statuses',
        label: `Status: ${companyDirFilters.statuses.join(', ')}`,
        clear: () => setCompanyDirFilters((p) => ({ ...p, statuses: [] })),
      });
    }
    if (companyDirFilters.industries.length > 0) {
      chips.push({
        key: 'industries',
        label: `Industry: ${companyDirFilters.industries.join(', ')}`,
        clear: () => setCompanyDirFilters((p) => ({ ...p, industries: [] })),
      });
    }
    if (companyDirFilters.locations.length > 0) {
      chips.push({
        key: 'locations',
        label: `City / Country: ${companyDirFilters.locations.join(', ')}`,
        clear: () => setCompanyDirFilters((p) => ({ ...p, locations: [] })),
      });
    }
    if (companyDirFilters.hasEnabledModels !== 'All') {
      chips.push({
        key: 'hasEnabledModels',
        label: `Enabled Models: ${companyDirFilters.hasEnabledModels}`,
        clear: () => setCompanyDirFilters((p) => ({ ...p, hasEnabledModels: 'All' })),
      });
    }
    return chips;
  }, [companyDirFilters]);

  // Helper for category-aware Manufacturer/Provider column context
  const renderManufacturerCell = (model: ModelCategoryRecord) => {
    const labelHint =
      model.category === 'SIM'
        ? 'Telecom Provider'
        : model.category === 'Sensor'
        ? 'Sensor OEM'
        : 'Device OEM';
    return (
      <div className="flex flex-col">
        <span className="text-slate-800 font-medium">{model.manufacturer || '—'}</span>
        <span className="text-[10px] text-slate-400">{labelHint}</span>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // RENDER: COMPANY DETAILS (MODEL ACCESS / OVERVIEW / SITES / AUDIT)
  // --------------------------------------------------------------------------
  if (selectedCompanyId && selectedCompany) {
    const companyEligible = isCompanyEligibleForNewRegistration(selectedCompany);
    const companyAuditLogs = auditLogs.filter((log) => log.companyId === selectedCompanyId);

    return (
      <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`fixed top-4 right-6 z-[160] flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 border ${
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

        {/* Unsaved Navigation Confirmation Modal */}
        {unsavedNavModal.open && (
          <div className="fixed inset-0 z-[155] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Unsaved Model Access Changes ({unsavedCount})
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      You have <strong>{unsavedCount}</strong> pending model permission edit(s) for{' '}
                      <strong>{selectedCompany.name}</strong>. Save them before switching or discard them to continue.
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUnsavedNavModal({ open: false, targetCompanyId: null })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const dest = unsavedNavModal.targetCompanyId;
                    setUnsavedNavModal({ open: false, targetCompanyId: null });
                    setPendingEdits({});
                    setSelectedModelIds([]);
                    setModelFilters(EMPTY_MODEL_ACCESS_FILTERS);
                    setModelSearch('');
                    setSelectedCompanyId(dest);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                >
                  Discard & Continue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const dest = unsavedNavModal.targetCompanyId;
                    const count = commitPendingChanges();
                    setUnsavedNavModal({ open: false, targetCompanyId: null });
                    setModelFilters(EMPTY_MODEL_ACCESS_FILTERS);
                    setModelSearch('');
                    setSelectedCompanyId(dest);
                    if (count > 0) {
                      setToast({
                        message: `Saved ${count} model access change(s) before navigating.`,
                        type: 'success',
                      });
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save & Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single-Row In-Use Disabling Impact Confirmation Modal */}
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
                      {inUseWarningModal.model.modelReference &&
                        `(${inUseWarningModal.model.modelReference})`}{' '}
                      currently has{' '}
                      <span className="font-bold text-amber-700">
                        {inUseWarningModal.inUseDetail.count} active units / mappings
                      </span>{' '}
                      assigned under <strong>{selectedCompany.name}</strong>{' '}
                      <span className="text-[11px] text-slate-500">
                        (
                        {inUseWarningModal.inUseDetail.provenance === 'live'
                          ? 'Live inventory/mapping'
                          : 'Verified demo baseline'}
                        )
                      </span>
                      .
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span>Safe Operational Lifecycle Protection:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    • <strong>New Registrations:</strong> Prevents new Devices, Sensors, SIMs, or Asset Mappings from selecting this model.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    • <strong>Historical Preservation:</strong> All {inUseWarningModal.inUseDetail.count} existing physical assets, bindings, and telemetry remain intact in details and history.
                  </p>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setInUseWarningModal({ open: false, model: null, inUseDetail: EMPTY_IN_USE })
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

        {/* Right-Side Model Access Sectional Filter Drawer */}
        <ModelAccessFilterDrawer
          isOpen={isModelFilterDrawerOpen}
          onClose={() => setIsModelFilterDrawerOpen(false)}
          appliedFilters={modelFilters}
          onApplyFilters={setModelFilters}
          rows={allModelRows}
          companyName={selectedCompany.name}
        />

        {/* Right-Side Model Access Bulk Operations Drawer */}
        <ModelAccessBulkDrawer
          isOpen={isBulkDrawerOpen}
          onClose={() => setIsBulkDrawerOpen(false)}
          company={selectedCompany}
          selectedRows={selectedVisibleRows}
          onQueueEnable={handleBulkQueueEnable}
          onQueueDisable={handleBulkQueueDisable}
          onOpenExportSelected={() =>
            setExportModalState({ open: true, defaultScope: 'selected' })
          }
          onClearSelection={() => setSelectedModelIds([])}
        />

        {/* Export Modal */}
        <ModelAccessExportModal
          isOpen={exportModalState.open}
          onClose={() => setExportModalState({ open: false, defaultScope: 'filtered' })}
          company={selectedCompany}
          filteredRows={filteredRows}
          selectedRows={selectedVisibleRows}
          defaultScope={exportModalState.defaultScope}
          onExportSuccess={(count, scope) =>
            setToast({
              message: `Exported ${count} ${scope} model row(s) for ${selectedCompany.name}.`,
              type: 'success',
            })
          }
        />

        {/* Clean Onboarding / Company Header Bar */}
        <div className="bg-white px-6 pt-5 pb-0 border-b border-slate-200 shrink-0">
          {/* Top bar: Back link + compact actor/company switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <button
              type="button"
              onClick={() => requestCompanyNavigation(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Back to companies</span>
            </button>

            <div className="flex items-center gap-2.5">
              {/* Demo Actor Selector */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                <UserCheck className="w-3.5 h-3.5 text-[#FA8A63]" />
                <span className="text-[11px] font-medium text-slate-500">Actor:</span>
                <select
                  aria-label="Active Prototype Actor"
                  value={activeActor.id}
                  onChange={(e) => handleSelectActor(e.target.value)}
                  className="bg-transparent text-[11px] font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {PROTOTYPE_DEMO_ACTORS.map((actor) => (
                    <option key={actor.id} value={actor.id}>
                      {actor.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jump to another client company */}
              <select
                aria-label="Jump to Company"
                value={selectedCompany.id}
                onChange={(e) => requestCompanyNavigation(e.target.value)}
                className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-[#FA8A63] cursor-pointer"
              >
                {companies
                  .filter((c) => !c.isPlatformOwner)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.status})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Company Title + Status Pill + Clean Subtitle */}
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-tight">
                {selectedCompany.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                  selectedCompany.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : selectedCompany.status === 'Onboarding'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {selectedCompany.status}
              </span>
              {selectedCompany.status === 'Onboarding' && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    selectedCompany.allowOnboardingRegistration
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {selectedCompany.allowOnboardingRegistration
                    ? 'Registration Approved'
                    : 'Registration Locked'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {[
                selectedCompany.industry,
                `${selectedCompany.sitesCount} Sites`,
                [selectedCompany.city, selectedCompany.country].filter(Boolean).join(', '),
                selectedCompany.id,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          {/* Clean Underline Tabs */}
          <div className="flex items-center gap-6 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'admin-access', label: 'Administrator access' },
              { id: 'sites', label: 'Sites' },
              {
                id: 'activation',
                label: 'Modules and Setup',
                badge:
                  unsavedCount > 0
                    ? `${unsavedCount} unsaved`
                    : `${currentCompanyStats.currentlyAvailable} models`,
                highlightBadge: unsavedCount > 0,
              },
              {
                id: 'activity',
                label: 'Activity',
                count: companyAuditLogs.length,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === 'activation') {
                      setActivationSubTab('modules');
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 pb-3 pt-1 text-[13px] border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'border-[#FA8A63] text-slate-900 font-bold'
                      : 'border-transparent text-slate-500 font-medium hover:text-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        tab.highlightBadge
                          ? 'bg-amber-100 text-amber-800'
                          : isActive
                          ? 'bg-[#FFF3EE] text-[#B85324]'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
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
          {activeTab === 'activation' && (() => {
            const currentActivation =
              activationMap[selectedCompany.id] || getDefaultCompanyActivation(selectedCompany);
            return (
              <div className="space-y-5">
                {activationSubTab === 'modules' && (
                  <CompanyActivationSection
                    company={selectedCompany}
                    activation={currentActivation}
                    activeActor={activeActor}
                    currentlyAvailableModelsCount={currentCompanyStats.currentlyAvailable}
                    grantedModelsCount={currentCompanyStats.grantedTotal}
                    totalGlobalActiveCount={currentCompanyStats.totalGlobalActive}
                    onUpdateActivation={(next, toastMsg) =>
                      handleUpdateCompanyActivation(selectedCompany.id, next, toastMsg)
                    }
                    onOpenModelAccessTab={() => setActivationSubTab('model-access')}
                  />
                )}

                {activationSubTab === 'model-access' && (
            <div className="space-y-4">
              {/* Company Eligibility Notice if Inactive or Onboarding without Registration */}
              {!companyEligible && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-4 text-xs text-amber-900">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">
                        {selectedCompany.status === 'Inactive'
                          ? 'Company is Inactive — New Hardware Registration Blocked'
                          : 'Company is Onboarding — Registration Locked Until Approved'}
                      </div>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        You can stage or review Granted model permissions below, but{' '}
                        <strong>Currently Available Models</strong> remains <strong>0</strong> for new Device, Sensor, SIM registrations and Asset Mappings until{' '}
                        {selectedCompany.status === 'Inactive'
                          ? 'company status is set to Active.'
                          : 'onboarding registration is explicitly approved in Company Overview.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-[11px] font-bold text-amber-900 hover:bg-amber-100/60 shrink-0 cursor-pointer"
                  >
                    Manage Status
                  </button>
                </div>
              )}

              {/* Concise Single-Line Toolbar Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                {/* Concise Toolbar: Global Model Search | Filters | Columns | Bulk Operations | Export | Save Changes */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                    {/* Search */}
                    <div className="relative w-72 max-w-full">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Search Model Type, Brand, Number, Identifier..."
                        className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-slate-50/60 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#FA8A63]"
                      />
                      {modelSearch && (
                        <button
                          type="button"
                          onClick={() => setModelSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Right-side Filter Drawer trigger */}
                    <button
                      type="button"
                      onClick={() => setIsModelFilterDrawerOpen(true)}
                      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        activeModelFilterCount > 0
                          ? 'border-[#FA8A63] bg-orange-50 text-[#B85324]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Filters</span>
                      {activeModelFilterCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FA8A63] text-white">
                          {activeModelFilterCount}
                        </span>
                      )}
                    </button>

                    {/* Column Catalogue */}
                    <ColumnCataloguePopover
                      columns={MODEL_ACCESS_COLUMNS}
                      visibleKeys={modelVisibleCols}
                      onChangeVisibleKeys={setModelVisibleCols}
                      defaultKeys={DEFAULT_MODEL_ACCESS_COLUMN_KEYS}
                      onToast={(msg) => setToast({ message: msg, type: 'success' })}
                      align="left"
                    />

                    {/* Bulk Operations Drawer trigger (when selected) */}
                    {selectedVisibleRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsBulkDrawerOpen(true)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Layers3 className="w-3.5 h-3.5" />
                        <span>Bulk Operations ({selectedVisibleRows.length})</span>
                      </button>
                    )}
                  </div>

                  {/* Right toolbar group: showing count + Export + Save Changes */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500 mr-0.5">
                      Showing <strong className="text-slate-800">{filteredRows.length}</strong> of{' '}
                      <strong className="text-slate-800">{allModelRows.length}</strong> models
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExportModalState({
                          open: true,
                          defaultScope: selectedVisibleRows.length > 0 ? 'selected' : 'filtered',
                        })
                      }
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>Export</span>
                    </button>

                    {unsavedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetPending}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span>Reset ({unsavedCount})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={unsavedCount === 0}
                      onClick={handleSaveChanges}
                      className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-bold shadow-xs transition-all ${
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

                {/* Applied Filter Chips */}
                {modelFilterChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">
                      Applied Filters:
                    </span>
                    {modelFilterChips.map((chip) => (
                      <span
                        key={chip.key}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-[#B85324] text-[11px] font-semibold"
                      >
                        <span>{chip.label}</span>
                        <button
                          type="button"
                          onClick={chip.clear}
                          className="hover:text-rose-700 cursor-pointer"
                          aria-label={`Remove ${chip.label}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setModelFilters(EMPTY_MODEL_ACCESS_FILTERS)}
                      className="text-[11px] font-bold text-slate-500 hover:text-[#FA8A63] ml-1 cursor-pointer"
                    >
                      Reset all
                    </button>
                  </div>
                )}
              </div>

              {/* Model Access Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                      <th className="w-10 px-3 py-3 text-center">
                        <input
                          ref={selectAllCheckboxRef}
                          type="checkbox"
                          aria-label="Select all visible models"
                          checked={allVisibleSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedModelIds(filteredRows.map((r) => r.model.id));
                            } else {
                              setSelectedModelIds([]);
                            }
                          }}
                          className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer"
                        />
                      </th>

                      {modelVisibleCols.includes('companyAccess') && (
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>Company Access</span>
                            <InfoTip text={COMPANY_MODEL_TOOLTIPS.enableCol} align="left" />
                          </div>
                        </th>
                      )}

                      {modelVisibleCols.includes('modelId') && (
                        <th className="px-4 py-3 whitespace-nowrap">Model ID</th>
                      )}

                      {modelVisibleCols.includes('category') && (
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>Category</span>
                            <InfoTip text={COMPANY_MODEL_TOOLTIPS.categoryCol} align="center" />
                          </div>
                        </th>
                      )}

                      {modelVisibleCols.includes('typeName') && (
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>Model Type</span>
                            <InfoTip text={COMPANY_MODEL_TOOLTIPS.typeNameCol} align="left" />
                          </div>
                        </th>
                      )}

                      {modelVisibleCols.includes('manufacturer') && (
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>Manufacturer / Provider</span>
                            <InfoTip text={COMPANY_MODEL_TOOLTIPS.manufacturerCol} align="center" />
                          </div>
                        </th>
                      )}

                      {modelVisibleCols.includes('modelReference') && (
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>Model Name / Number</span>
                            <InfoTip text={COMPANY_MODEL_TOOLTIPS.modelReferenceCol} align="center" />
                          </div>
                        </th>
                      )}

                      {modelVisibleCols.includes('identifierTypes') && (
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>Identifier Types</span>
                            <InfoTip text={COMPANY_MODEL_TOOLTIPS.identifierTypeCol} align="center" />
                          </div>
                        </th>
                      )}

                      {modelVisibleCols.includes('deviceFunction') && (
                        <th className="px-4 py-3 whitespace-nowrap">Device Function</th>
                      )}

                      {modelVisibleCols.includes('supportedModes') && (
                        <th className="px-4 py-3 whitespace-nowrap">Supported Modes</th>
                      )}

                      {modelVisibleCols.includes('simType') && (
                        <th className="px-4 py-3 whitespace-nowrap">SIM Type</th>
                      )}

                      {modelVisibleCols.includes('globalStatus') && (
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span>Global Model Status</span>
                            <InfoTip text={COMPANY_MODEL_TOOLTIPS.globalStatusCol} align="center" />
                          </div>
                        </th>
                      )}

                      {modelVisibleCols.includes('currentlyAvailable') && (
                        <th className="px-4 py-3 whitespace-nowrap">Currently Available</th>
                      )}

                      {modelVisibleCols.includes('pendingChange') && (
                        <th className="px-4 py-3 whitespace-nowrap">Pending Change</th>
                      )}

                      {modelVisibleCols.includes('updatedAt') && (
                        <th className="px-4 py-3 whitespace-nowrap">Model Last Updated</th>
                      )}

                      {modelVisibleCols.includes('inUse') && (
                        <th className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span>In Use</span>
                            <InfoTip text={COMPANY_MODEL_TOOLTIPS.inUseStatusCol} align="right" />
                          </div>
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={1 + modelVisibleCols.length}
                          className="px-4 py-12 text-center text-slate-500"
                        >
                          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-700">
                            No hardware models match the current search or filters
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Adjust your filters or manage global definitions in Model Category Master.
                          </p>
                          {(modelSearch || activeModelFilterCount > 0) && (
                            <button
                              type="button"
                              onClick={() => {
                                setModelSearch('');
                                setModelFilters(EMPTY_MODEL_ACCESS_FILTERS);
                              }}
                              className="mt-3 px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              Clear Search & Filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const {
                          model,
                          isEffectiveEnabled,
                          isPending,
                          isCurrentlyAvailable,
                          inUseDetail,
                        } = row;
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
                                aria-label={`Select ${model.typeName}`}
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedModelIds((prev) =>
                                      prev.includes(model.id) ? prev : [...prev, model.id]
                                    );
                                  } else {
                                    setSelectedModelIds((prev) =>
                                      prev.filter((id) => id !== model.id)
                                    );
                                  }
                                }}
                                className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer"
                              />
                            </td>

                            {modelVisibleCols.includes('companyAccess') && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isGloballyInactive && !isEffectiveEnabled}
                                    onClick={() => handleToggleModel(row)}
                                    title={
                                      isGloballyInactive && !isEffectiveEnabled
                                        ? 'Globally Inactive — Cannot enable. Activate in Model Category Master first.'
                                        : isEffectiveEnabled
                                        ? 'Click to disable for this company'
                                        : 'Click to enable for this company'
                                    }
                                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                      isGloballyInactive && !isEffectiveEnabled
                                        ? 'bg-slate-200 opacity-60 cursor-not-allowed'
                                        : isEffectiveEnabled
                                        ? 'bg-[#FA8A63] cursor-pointer'
                                        : 'bg-slate-300 cursor-pointer'
                                    }`}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                        isEffectiveEnabled ? 'translate-x-4' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`text-[11px] font-bold ${
                                          isEffectiveEnabled
                                            ? 'text-emerald-700'
                                            : 'text-slate-400'
                                        }`}
                                      >
                                        {isEffectiveEnabled ? 'Enabled' : 'Disabled'}
                                      </span>
                                      {isPending && (
                                        <span className="text-[10px] font-bold text-[#FA8A63]">
                                          (Unsaved)
                                        </span>
                                      )}
                                    </div>
                                    {isEffectiveEnabled && !isCurrentlyAvailable && (
                                      <span className="text-[10px] text-amber-700 font-medium">
                                        {isGloballyInactive
                                          ? 'Blocked: Global Inactive'
                                          : `Blocked: Company ${selectedCompany.status}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            )}

                            {modelVisibleCols.includes('modelId') && (
                              <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                                {model.id}
                              </td>
                            )}

                            {modelVisibleCols.includes('category') && (
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
                            )}

                            {modelVisibleCols.includes('typeName') && (
                              <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                                {model.typeName}
                              </td>
                            )}

                            {modelVisibleCols.includes('manufacturer') && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                {renderManufacturerCell(model)}
                              </td>
                            )}

                            {modelVisibleCols.includes('modelReference') && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                {model.modelReference ? (
                                  <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                    {model.modelReference}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            )}

                            {modelVisibleCols.includes('identifierTypes') && (
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {getRecordIdentifierTypes(model).map((idType) => (
                                    <span
                                      key={idType}
                                      className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-semibold whitespace-nowrap"
                                    >
                                      {idType}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            )}

                            {modelVisibleCols.includes('deviceFunction') && (
                              <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                                {model.category === 'Device' ? model.deviceFunction || '—' : '—'}
                              </td>
                            )}

                            {modelVisibleCols.includes('supportedModes') && (
                              <td className="px-4 py-3 text-slate-700">
                                {model.category === 'Device'
                                  ? (model.supportedModes?.length
                                      ? model.supportedModes.join(', ')
                                      : model.deviceMode) || '—'
                                  : '—'}
                              </td>
                            )}

                            {modelVisibleCols.includes('simType') && (
                              <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                                {model.category === 'SIM' ? model.simType || '—' : '—'}
                              </td>
                            )}

                            {modelVisibleCols.includes('globalStatus') && (
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
                            )}

                            {modelVisibleCols.includes('currentlyAvailable') && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                {isCurrentlyAvailable ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                    No
                                  </span>
                                )}
                              </td>
                            )}

                            {modelVisibleCols.includes('pendingChange') && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                {isPending ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    Pending ({isEffectiveEnabled ? 'Enable' : 'Disable'})
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            )}

                            {modelVisibleCols.includes('updatedAt') && (
                              <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                                {(model.updatedAt || '').slice(0, 10) || '—'}
                              </td>
                            )}

                            {modelVisibleCols.includes('inUse') && (
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                {inUseDetail.count > 0 ? (
                                  <div className="inline-flex items-center justify-end gap-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                      <span>In Use ({inUseDetail.count})</span>
                                    </span>
                                    <InfoTip
                                      align="right"
                                      text={
                                        inUseDetail.provenance === 'live'
                                          ? `Live store count: ${inUseDetail.liveInventoryCount} registered inventory record(s), ${inUseDetail.liveMappingCount} active mapping(s).`
                                          : `Verified demo baseline count: ${inUseDetail.seedBaselineCount} tracked active asset(s).`
                                      }
                                    />
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">0 assigned</span>
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

              {/* Informational Callout linking to Model Category Master */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100/70 border border-orange-200 flex items-center justify-center text-[#FA8A63] shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">
                      Model specifications are governed globally in Model Category Master
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      This page controls tenant permissions only. Create, edit, or delete model definitions in Model Category Master.
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
              </div>
            );
          })()}

          {/* Administrator Access Tab */}
          {activeTab === 'admin-access' && (() => {
            const currentActivation =
              activationMap[selectedCompany.id] || getDefaultCompanyActivation(selectedCompany);
            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[15px] font-bold text-slate-900">
                        Administrator &amp; Dispatcher Access
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Primary tenant administrator and operating role assignments for {selectedCompany.name}.
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        currentActivation.adminVerified
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}
                    >
                      {currentActivation.adminVerified ? 'Verified' : 'Pending verification'}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Primary Company Administrator
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {selectedCompany.contactEmail || `admin@${selectedCompany.id.replace('comp-', '')}.com`}{' '}
                          · {selectedCompany.contactPhone || 'Phone not provided'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateCompanyActivation(
                            selectedCompany.id,
                            {
                              ...currentActivation,
                              adminVerified: !currentActivation.adminVerified,
                            },
                            currentActivation.adminVerified
                              ? `Administrator verification marked pending for ${selectedCompany.name}.`
                              : `Administrator identity verified for ${selectedCompany.name}.`
                          )
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        {currentActivation.adminVerified ? 'Mark pending' : 'Verify admin'}
                      </button>
                    </div>

                    <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Operating Dispatcher Handle
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Handle <span className="font-mono font-semibold text-slate-700">{currentActivation.dispatcherHandle}</span> ·{' '}
                          {currentActivation.transportOperatingAccess
                            ? 'Dispatcher role active'
                            : 'Awaiting operating access grant'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('activation');
                          setActivationSubTab('modules');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold cursor-pointer"
                      >
                        Manage in Activation
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ACCESS OWNER
                  </div>
                  <div className="text-sm font-bold text-slate-900">{activeActor.name}</div>
                  <p className="text-xs text-slate-500">{activeActor.role}</p>
                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    All role transitions and model access approvals are recorded under the Activity tab.
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Activity & Audit Log Tab */}
          {activeTab === 'activity' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Model Enablement Audit Log — {selectedCompany.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chronological log of model enablement changes for tenant{' '}
                    <span className="font-mono">{selectedCompany.id}</span>. Stored in browser localStorage for this prototype session.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Active Actor: <strong>{activeActor.name}</strong>
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                    <tr>
                      <th className="px-4 py-2.5">Timestamp</th>
                      <th className="px-4 py-2.5">Model ID</th>
                      <th className="px-4 py-2.5">Model / Type</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Transition</th>
                      <th className="px-4 py-2.5">Actor</th>
                      <th className="px-4 py-2.5">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companyAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.modelId}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-900">
                          {log.modelName}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {log.category}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              log.action === 'Enabled'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {log.oldValue ? 'Enabled' : 'Disabled'} → {log.newValue ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 font-medium whitespace-nowrap">
                          {log.actor}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                          {log.note || '—'}
                        </td>
                      </tr>
                    ))}
                    {companyAuditLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
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
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Company Profile</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-slate-400 mb-0.5">Company ID</div>
                      <div className="font-mono font-semibold text-slate-700">{selectedCompany.id}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Company Name</div>
                      <div className="font-semibold text-slate-800">{selectedCompany.name}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Legal Entity Name</div>
                      <div className="font-semibold text-slate-800">
                        {selectedCompany.legalName || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Primary Industry</div>
                      <div className="font-semibold text-slate-800">{selectedCompany.industry}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Operating Sites</div>
                      <div className="font-semibold text-slate-800">
                        {selectedCompany.sitesCount} Hubs / Plants
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Last Updated</div>
                      <div className="font-semibold text-slate-800">
                        {selectedCompany.updatedAt ? selectedCompany.updatedAt.slice(0, 10) : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Primary Contact & Location</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-slate-400 mb-0.5">Contact Email</div>
                      <div className="font-semibold text-slate-800">
                        {selectedCompany.contactEmail || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Contact Phone</div>
                      <div className="font-semibold text-slate-800">
                        {selectedCompany.contactPhone || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">City & State</div>
                      <div className="font-semibold text-slate-800">
                        {selectedCompany.city || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-0.5">Country</div>
                      <div className="font-semibold text-slate-800">
                        {selectedCompany.country || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operational Status & Onboarding Registration Control */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Tenant Lifecycle & Hardware Registration Eligibility
                </h3>
                <p className="text-xs text-slate-500">
                  Inactive companies cannot register new Devices, Sensors, SIMs, or Asset Mappings. Onboarding companies require explicit registration approval below.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Company Status:</span>
                    <select
                      value={selectedCompany.status}
                      onChange={(e) =>
                        handleUpdateCompanyEligibility(selectedCompany.id, {
                          status: e.target.value as 'Active' | 'Onboarding' | 'Inactive',
                        })
                      }
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#FA8A63] cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Onboarding">Onboarding</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  {selectedCompany.status === 'Onboarding' && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 bg-amber-50/70 px-3 py-1.5 rounded-lg border border-amber-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedCompany.allowOnboardingRegistration)}
                        onChange={(e) =>
                          handleUpdateCompanyEligibility(selectedCompany.id, {
                            allowOnboardingRegistration: e.target.checked,
                          })
                        }
                        className="rounded border-amber-400 text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer"
                      />
                      <span>Allow new hardware registration during Onboarding</span>
                    </label>
                  )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
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
                        Operational Logistics Hub • {selectedCompany.status}
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
  // RENDER: COMPANY DIRECTORY (DEFAULT VIEW)
  // --------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-6 z-[160] flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 border ${
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

      {/* Company Directory Right-Side Filter Drawer */}
      <CompanyDirectoryFilterDrawer
        isOpen={isCompanyFilterDrawerOpen}
        onClose={() => setIsCompanyFilterDrawerOpen(false)}
        appliedFilters={companyDirFilters}
        onApplyFilters={setCompanyDirFilters}
        companies={companies}
        getCompanyModelAvailabilityCount={(c) => getCompanyMetrics(c).currentlyAvailable}
      />

      {/* Add Company Modal (No Fake Defaults & No Auto-Granted Models) */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">+ Add Client Company</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Register a new tenant company. Models start disabled (0 grants) until explicitly approved.
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
                  <InfoTip
                    text="Registered business name. Left blank if not yet provided (never auto-fabricated)."
                    align="left"
                  />
                </label>
                <input
                  type="text"
                  placeholder="Optional registered legal entity name"
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
                    <option value="Ports, Marine & SEZ Logistics">
                      Ports, Marine & SEZ Logistics
                    </option>
                    <option value="Cash Logistics & Armored Transport">
                      Cash Logistics & Armored Transport
                    </option>
                    <option value="Organic Dairy & Cold Chain Logistics">
                      Organic Dairy & Cold Chain Logistics
                    </option>
                    <option value="Bulk Transport & Long-Haul Freight">
                      Bulk Transport & Long-Haul Freight
                    </option>
                    <option value="FMCG & Urban Distribution">
                      FMCG & Urban Distribution
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Initial Company Status
                  </label>
                  <select
                    value={newCompanyForm.status}
                    onChange={(e) =>
                      setNewCompanyForm({
                        ...newCompanyForm,
                        status: e.target.value as 'Active' | 'Onboarding',
                      })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="Active">Active</option>
                    <option value="Onboarding">Onboarding</option>
                  </select>
                </div>
              </div>

              {newCompanyForm.status === 'Onboarding' && (
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCompanyForm.allowOnboardingRegistration}
                    onChange={(e) =>
                      setNewCompanyForm({
                        ...newCompanyForm,
                        allowOnboardingRegistration: e.target.checked,
                      })
                    }
                    className="rounded border-amber-400 text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer"
                  />
                  <span>
                    Allow new hardware registration while Onboarding (unchecked = blocked until Active)
                  </span>
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Registered City
                  </label>
                  <input
                    type="text"
                    placeholder="Optional city"
                    value={newCompanyForm.city}
                    onChange={(e) =>
                      setNewCompanyForm({ ...newCompanyForm, city: e.target.value })
                    }
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    placeholder="Country"
                    value={newCompanyForm.country}
                    onChange={(e) =>
                      setNewCompanyForm({ ...newCompanyForm, country: e.target.value })
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
                    placeholder="Optional contact email"
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
                    placeholder="Optional phone"
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
                  Register Company & Configure Models
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Container */}
      <div className="bg-white px-6 pt-4 pb-3 border-b border-slate-200 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
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
              Manage client tenants, lifecycle status, and company-scoped hardware model permissions.
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
                <span>Add Company</span>
              </button>
              <InfoTip text={COMPANY_MODEL_TOOLTIPS.addCompany} align="right" />
            </div>
          </div>
        </div>

        {/* Concise Toolbar: Search | Filters | Columns */}
        <div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-slate-100 gap-2.5">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="relative w-72 max-w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Search company, ID, industry, city..."
                className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-slate-50/60 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#FA8A63]"
              />
              {companySearch && (
                <button
                  type="button"
                  onClick={() => setCompanySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <InfoTip text={COMPANY_MODEL_TOOLTIPS.searchCompany} align="left" />

            <button
              type="button"
              onClick={() => setIsCompanyFilterDrawerOpen(true)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                activeCompanyFilterCount > 0
                  ? 'border-[#FA8A63] bg-orange-50 text-[#B85324]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeCompanyFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FA8A63] text-white">
                  {activeCompanyFilterCount}
                </span>
              )}
            </button>

            <ColumnCataloguePopover
              columns={COMPANY_DIRECTORY_COLUMNS}
              visibleKeys={companyVisibleCols}
              onChangeVisibleKeys={setCompanyVisibleCols}
              defaultKeys={DEFAULT_COMPANY_DIRECTORY_COLUMN_KEYS}
              onToast={(msg) => setToast({ message: msg, type: 'success' })}
              align="left"
            />
          </div>

          {(companySearch || activeCompanyFilterCount > 0) && (
            <button
              type="button"
              onClick={() => {
                setCompanySearch('');
                setCompanyDirFilters(EMPTY_COMPANY_DIRECTORY_FILTERS);
              }}
              className="text-xs text-[#FA8A63] font-semibold hover:underline cursor-pointer"
            >
              Reset All
            </button>
          )}
        </div>

        {/* Applied Company Filter Chips */}
        {companyFilterChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2.5 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Applied Filters:</span>
            {companyFilterChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-[#B85324] text-[11px] font-semibold"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.clear}
                  className="hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Company Directory Table */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                {companyVisibleCols.includes('companyId') && (
                  <th className="px-4 py-3 whitespace-nowrap">Company ID</th>
                )}
                {companyVisibleCols.includes('companyName') && (
                  <th className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>Company Name</span>
                      <InfoTip text={COMPANY_MODEL_TOOLTIPS.companyName} align="left" />
                    </div>
                  </th>
                )}
                {companyVisibleCols.includes('industry') && (
                  <th className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>Industry</span>
                      <InfoTip text={COMPANY_MODEL_TOOLTIPS.industry} align="center" />
                    </div>
                  </th>
                )}
                {companyVisibleCols.includes('location') && (
                  <th className="px-4 py-3 whitespace-nowrap">City / Country</th>
                )}
                {companyVisibleCols.includes('contactEmail') && (
                  <th className="px-4 py-3 whitespace-nowrap">Contact Email</th>
                )}
                {companyVisibleCols.includes('sites') && (
                  <th className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>Sites</span>
                      <InfoTip text={COMPANY_MODEL_TOOLTIPS.sites} align="center" />
                    </div>
                  </th>
                )}
                {companyVisibleCols.includes('status') && (
                  <th className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>Company Status</span>
                      <InfoTip text={COMPANY_MODEL_TOOLTIPS.companyStatus} align="center" />
                    </div>
                  </th>
                )}
                {companyVisibleCols.includes('enabledModelTypes') && (
                  <th className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>Enabled Model Types</span>
                      <InfoTip text={COMPANY_MODEL_TOOLTIPS.enabledModels} align="center" />
                    </div>
                  </th>
                )}
                {companyVisibleCols.includes('grantedModels') && (
                  <th className="px-4 py-3 whitespace-nowrap">Granted Models</th>
                )}
                {companyVisibleCols.includes('availableModels') && (
                  <th className="px-4 py-3 whitespace-nowrap">Currently Available</th>
                )}
                {companyVisibleCols.includes('categoryBreakdown') && (
                  <th className="px-4 py-3 whitespace-nowrap">Dev / Sen / SIM</th>
                )}
                {companyVisibleCols.includes('updatedAt') && (
                  <th className="px-4 py-3 whitespace-nowrap">Last Updated</th>
                )}
                {companyVisibleCols.includes('actions') && (
                  <th className="px-3 py-3 whitespace-nowrap text-right w-[76px]">
                    <div className="flex items-center justify-end gap-1">
                      <span>Actions</span>
                      <InfoTip text={COMPANY_MODEL_TOOLTIPS.actions} align="right" />
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td
                    colSpan={companyVisibleCols.length}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">
                      No companies match your search or filters
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCompanySearch('');
                        setCompanyDirFilters(EMPTY_COMPANY_DIRECTORY_FILTERS);
                      }}
                      className="mt-2.5 px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => {
                  const metrics = getCompanyMetrics(company);
                  const percentage =
                    metrics.totalGlobalActive > 0
                      ? Math.round((metrics.currentlyAvailable / metrics.totalGlobalActive) * 100)
                      : 0;

                  return (
                    <tr
                      key={company.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedCompanyId(company.id);
                        setActiveTab('activation');
                        setActivationSubTab('modules');
                      }}
                    >
                      {companyVisibleCols.includes('companyId') && (
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                          {company.id}
                        </td>
                      )}

                      {companyVisibleCols.includes('companyName') && (
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
                                {company.legalName || 'Legal entity not specified'}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {companyVisibleCols.includes('industry') && (
                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {company.industry}
                          </span>
                        </td>
                      )}

                      {companyVisibleCols.includes('location') && (
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                          {[company.city, company.country].filter(Boolean).join(', ') || '—'}
                        </td>
                      )}

                      {companyVisibleCols.includes('contactEmail') && (
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                          {company.contactEmail || '—'}
                        </td>
                      )}

                      {companyVisibleCols.includes('sites') && (
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">
                            {company.sitesCount} Sites
                          </span>
                        </td>
                      )}

                      {companyVisibleCols.includes('status') && (
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
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
                            {company.status === 'Onboarding' && (
                              <span className="text-[10px] text-amber-700">
                                {company.allowOnboardingRegistration
                                  ? 'Reg. approved'
                                  : 'Reg. locked'}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {companyVisibleCols.includes('enabledModelTypes') && (
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="w-56">
                            <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                              <span className="text-slate-800">
                                {metrics.currentlyAvailable} available / {metrics.totalGlobalActive} active
                              </span>
                              <span className="text-slate-400">{percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#FA8A63] rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            {(metrics.grantedInactiveGlobal > 0 || !metrics.eligibleCompany) && (
                              <div className="text-[10px] text-slate-500 mt-1">
                                {metrics.grantedTotal} granted
                                {metrics.grantedInactiveGlobal > 0
                                  ? ` (${metrics.grantedInactiveGlobal} inactive global)`
                                  : !metrics.eligibleCompany
                                  ? ` (${company.status} locked)`
                                  : ''}
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      {companyVisibleCols.includes('grantedModels') && (
                        <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-800">
                          {metrics.grantedTotal}
                        </td>
                      )}

                      {companyVisibleCols.includes('availableModels') && (
                        <td className="px-4 py-3.5 whitespace-nowrap font-bold text-[#B85324]">
                          {metrics.currentlyAvailable}
                        </td>
                      )}

                      {companyVisibleCols.includes('categoryBreakdown') && (
                        <td className="px-4 py-3.5 whitespace-nowrap text-[11px] text-slate-600 font-semibold">
                          {metrics.devicesAvailable}D / {metrics.sensorsAvailable}S /{' '}
                          {metrics.simsAvailable}M
                        </td>
                      )}

                      {companyVisibleCols.includes('updatedAt') && (
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                          {company.updatedAt ? company.updatedAt.slice(0, 10) : '—'}
                        </td>
                      )}

                      {companyVisibleCols.includes('actions') && (
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
                                    setActiveTab('activation');
                                    setActivationSubTab('model-access');
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
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
