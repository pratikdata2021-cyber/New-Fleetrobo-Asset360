import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Rows,
  Bookmark,
  RefreshCw,
  Layers,
  Upload,
  Download,
  Plus,
  Eye,
  Edit2,
  MoreHorizontal,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Building2
} from 'lucide-react';
import {
  DirectBulkUploadView,
  formatUploadFileSize,
  useDirectUploadState
} from './common/DirectBulkUploadView';
import { RowActionMenu } from './common/RowActionMenu';
import { DeleteConfirmationModal } from './common/DeleteConfirmationModal';
import {
  SimRecord,
  SimLifecycleStatus,
  EffectiveSimInventoryStatus,
  SimComputedAssignment,
  HardwareAuditEntry,
  SIM_COLUMNS,
  SIM_LIFECYCLE_OPTIONS,
  SIM_PLANS,
  SIM_FORM_FACTORS,
  MODAL_FIELD_TOOLTIPS,
  SavedModalView,
  loadModalMasterStore,
  saveModalMasterStore,
  loadSavedModalViews,
  saveSavedModalViews,
  downloadModalCsv,
  parseCsvLine,
  deriveSimEffectiveInventoryStatus,
  getSimMappingReferences,
  resolveSimComputedAssignment,
  computeHardwareBindingStatus
} from '../types/modalMaster';
import {
  getEnabledModelsForCompanyName,
  getAvailableClientCompanies,
  isCompanyEligibleForNewRegistration,
  resolveClientCompanyByNameOrId
} from '../types/companyModelEnablement';
import { getModelCategoryById, getRecordIdentifierTypes } from '../types/modelCategoryMaster';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';
import {
  SimFilterDrawer,
  SimAdvancedFilters,
  DEFAULT_SIM_FILTERS,
  countActiveSimFilters,
  matchesSimFilters,
  resolveSimCategoryLabel
} from './sim-master/SimFilterDrawer';
import { SimBulkDrawer, SimBulkActionMode } from './sim-master/SimBulkDrawer';

const FieldLabel: React.FC<{
  label: string;
  required?: boolean;
  tooltip: string;
}> = ({ label, required, tooltip }) => (
  <div className="flex items-center justify-between gap-1.5 mb-1">
    <label className="text-[12px] font-semibold text-[#17212b]">
      {label} {required && <span className="text-[#dc2626]">*</span>}
    </label>
    <div className="relative group inline-flex items-center">
      <button
        type="button"
        tabIndex={0}
        aria-label={`Info for ${label}`}
        className="w-[17px] h-[17px] rounded-full border border-[#d6dfe8] bg-[#f8fafc] text-[#5c6b7a] hover:text-[#17212b] hover:border-[#94a3b8] inline-flex items-center justify-center text-[11px] font-semibold cursor-help focus:outline-none focus:ring-2 focus:ring-[#e56b38]/30"
      >
        i
      </button>
      <div className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute right-0 bottom-full mb-2 w-[270px] p-2.5 rounded-lg bg-[#17212b] text-white text-[11px] leading-relaxed shadow-xl z-50 border border-slate-700">
        {tooltip}
      </div>
    </div>
  </div>
);

interface SimMasterContentProps {
  currentCompany?: string;
}

export const SimMasterContent: React.FC<SimMasterContentProps> = ({ currentCompany = 'Adani Mundra' }) => {
  const [store, setStoreState] = useState(() => loadModalMasterStore());
  const [savedViews, setSavedViews] = useState<SavedModalView[]>(() => loadSavedModalViews());
  const selfWriteRef = React.useRef(false);

  const setStore: React.Dispatch<React.SetStateAction<typeof store>> = (updater) => {
    setStoreState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      selfWriteRef.current = true;
      saveModalMasterStore(next);
      setTimeout(() => {
        selfWriteRef.current = false;
      }, 0);
      return next;
    });
  };

  // Model access sync from Binary Platform Admin -> Company Management + 60s time-window tick
  const [modelAccessTick, setModelAccessTick] = useState(0);
  const [statusTick, setStatusTick] = useState(0);
  useEffect(() => {
    const handleSync = () => setModelAccessTick((t) => t + 1);
    const handleStoreSync = () => {
      if (!selfWriteRef.current) {
        setStoreState(loadModalMasterStore());
      }
    };
    window.addEventListener('fleetrobo:model-access-updated', handleSync);
    window.addEventListener('fleetrobo:modal-store-updated', handleStoreSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('storage', handleStoreSync);
    const interval = window.setInterval(() => setStatusTick((t) => t + 1), 60000);
    return () => {
      window.removeEventListener('fleetrobo:model-access-updated', handleSync);
      window.removeEventListener('fleetrobo:modal-store-updated', handleStoreSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('storage', handleStoreSync);
      window.clearInterval(interval);
    };
  }, []);

  const isPlatformAdmin = currentCompany === 'Platform Admin' || currentCompany === 'Binary';
  const availableOrganizations = useMemo(() => {
    void modelAccessTick;
    return getAvailableClientCompanies();
  }, [modelAccessTick]);

  // Toolbar & Table states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOwner, setFilterOwner] = useState<string>('All');
  const [advancedFilters, setAdvancedFilters] = useState<SimAdvancedFilters>(DEFAULT_SIM_FILTERS);

  useEffect(() => {
    setFilterOwner('All');
    setAdvancedFilters(DEFAULT_SIM_FILTERS);
    setSelectedIds(new Set());
    setCurrentPage(1);
  }, [currentCompany]);

  const effectiveAdvancedFilters = useMemo<SimAdvancedFilters>(() => {
    if (isPlatformAdmin) return advancedFilters;
    return { ...advancedFilters, organizations: [] };
  }, [advancedFilters, isPlatformAdmin]);

  // Enabled SIM models for the active company (strict tenant scope; no generic fallback)
  const enabledSimModels = useMemo(() => {
    const scopeCompany = isPlatformAdmin && filterOwner !== 'All' ? filterOwner : currentCompany;
    return getEnabledModelsForCompanyName(scopeCompany).filter((m) => m.category === 'SIM');
  }, [currentCompany, isPlatformAdmin, filterOwner, modelAccessTick]);

  const enabledSimCategories = useMemo<string[]>(() => {
    return Array.from(new Set(enabledSimModels.map((m) => m.typeName)));
  }, [enabledSimModels]);

  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [hiddenCols, setHiddenCols] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Drawers state
  const [activeDrawer, setActiveDrawer] = useState<
    null | 'filters' | 'saved-views' | 'form' | 'inspector' | 'bulk' | 'import'
  >(null);

  // Inspector state (live synced by record ID)
  const [inspectedSimId, setInspectedSimId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'linked' | 'activity'>('overview');

  // Form state (Create / Edit SIM — exact frozen UI fields preserved)
  const [editingSim, setEditingSim] = useState<SimRecord | null>(null);
  const [formIccid, setFormIccid] = useState('');
  const [formSimId, setFormSimId] = useState('');
  const [formMsisdn, setFormMsisdn] = useState('');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formOperator, setFormOperator] = useState<string>('');
  const [formModelRef, setFormModelRef] = useState<string>('');
  const [formPlan, setFormPlan] = useState<string>(SIM_PLANS[0] || 'IoT Business 10GB');
  const [formFormFactor, setFormFormFactor] = useState<SimRecord['formFactor']>('Nano (4FF)');
  const [formMode, setFormMode] = useState('M2M');
  const [formStatus, setFormStatus] = useState<SimLifecycleStatus>('Inventory');
  const [formActivationDate, setFormActivationDate] = useState('');
  const [formRenewalDate, setFormRenewalDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIdentifierType, setFormIdentifierType] = useState('ICCID');
  const [formOwner, setFormOwner] = useState(() =>
    currentCompany && currentCompany !== 'Platform Admin' && currentCompany !== 'Binary'
      ? currentCompany
      : availableOrganizations[0] || ''
  );
  const [formError, setFormError] = useState<string | null>(null);

  const effectiveFormOwner = isPlatformAdmin
    ? formOwner || availableOrganizations[0] || ''
    : currentCompany;

  const formEnabledSimModels = useMemo(() => {
    return getEnabledModelsForCompanyName(effectiveFormOwner).filter(
      (m) => m.category === 'SIM'
    );
  }, [effectiveFormOwner, modelAccessTick]);

  const formSelectableSimModels = useMemo(() => {
    if (!editingSim) return formEnabledSimModels;
    const historical = editingSim.modelTypeId
      ? getModelCategoryById(editingSim.modelTypeId)
      : undefined;
    if (historical && !formEnabledSimModels.some((m) => m.id === historical.id)) {
      return [historical, ...formEnabledSimModels];
    }
    return formEnabledSimModels;
  }, [editingSim, formEnabledSimModels]);

  const formEnabledSimCategories = useMemo<string[]>(() => {
    const cats = Array.from(new Set(formSelectableSimModels.map((m) => m.typeName)));
    if (editingSim?.category && !cats.includes(editingSim.category)) {
      return [editingSim.category, ...cats];
    }
    return cats;
  }, [formSelectableSimModels, editingSim]);

  // Saved view creation state
  const [newViewName, setNewViewName] = useState('');

  // Direct upload state
  const simUpload = useDirectUploadState(activeDrawer === 'import');

  useEffect(() => {
    saveSavedModalViews(savedViews);
  }, [savedViews]);

  // Derived options based on selected SIM category
  const modelsForSelectedCategory = useMemo(() => {
    return formSelectableSimModels.filter((m) => m.typeName === formCategory);
  }, [formSelectableSimModels, formCategory]);

  const availableOperators = useMemo<string[]>(() => {
    if (modelsForSelectedCategory.length > 0) {
      const ops = Array.from(new Set(modelsForSelectedCategory.map((m) => m.manufacturer).filter(Boolean)));
      if (editingSim?.operator && !ops.includes(editingSim.operator)) {
        return [editingSim.operator, ...ops];
      }
      return ops;
    }
    if (editingSim?.operator) {
      return [editingSim.operator];
    }
    return [];
  }, [modelsForSelectedCategory, editingSim]);

  const modelsForSelectedOperator = useMemo(() => {
    return modelsForSelectedCategory.filter((m) => m.manufacturer === formOperator);
  }, [modelsForSelectedCategory, formOperator]);

  const selectedSimModelSpec = useMemo(() => {
    if (editingSim?.modelTypeId) {
      const byId = formSelectableSimModels.find(
        (m) =>
          m.id === editingSim.modelTypeId &&
          m.typeName === formCategory &&
          m.manufacturer === formOperator &&
          (!formModelRef || (m.modelReference || '') === formModelRef)
      );
      if (byId) return byId;
    }
    const operatorMatches = modelsForSelectedCategory.filter(
      (m) => m.manufacturer === formOperator
    );
    if (formModelRef) {
      return (
        operatorMatches.find((m) => (m.modelReference || '') === formModelRef) || null
      );
    }
    return operatorMatches[0] || null;
  }, [modelsForSelectedCategory, formCategory, formOperator, formModelRef, formSelectableSimModels, editingSim]);

  const availableIdentifierTypes = useMemo(() => {
    const fromSpec = getRecordIdentifierTypes(selectedSimModelSpec);
    if (fromSpec.length > 0) return fromSpec;
    if (editingSim?.identifierType) {
      return getRecordIdentifierTypes({ identifierType: editingSim.identifierType });
    }
    return ['ICCID'];
  }, [selectedSimModelSpec, editingSim]);

  const activeIdentifierType = useMemo(() => {
    if (formIdentifierType && availableIdentifierTypes.includes(formIdentifierType)) {
      return formIdentifierType;
    }
    return availableIdentifierTypes[0] || 'ICCID';
  }, [formIdentifierType, availableIdentifierTypes]);

  // Handle dynamic SIM category change
  const handleSimCategoryChange = (newCat: string) => {
    setFormCategory(newCat);
    const matching = formEnabledSimModels.filter((m) => m.typeName === newCat);
    if (matching.length > 0) {
      const first = matching[0];
      const firstIds = getRecordIdentifierTypes(first);
      const nextIdType = firstIds[0] || 'ICCID';
      setFormOperator(first.manufacturer);
      setFormModelRef(first.modelReference || '');
      setFormMode(first.simType || 'M2M');
      setFormFormFactor(first.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)');
      setFormIdentifierType(nextIdType);
      if (!editingSim && nextIdType !== 'ICCID' && /^899186\d+$/.test(formIccid.trim())) {
        setFormIccid('');
      }
      if (first.manufacturer === 'Jio') setFormPlan('Enterprise M2M 2GB');
      else if (first.manufacturer === 'Vodafone Idea' || first.manufacturer === 'Vi') setFormPlan('IoT 5GB');
      else setFormPlan('IoT Business 10GB');
    }
  };

  // Handle dynamic operator change
  const handleOperatorChange = (newOp: string) => {
    setFormOperator(newOp);
    const matching = formEnabledSimModels.filter(
      (m) => m.typeName === formCategory && m.manufacturer === newOp
    );
    if (matching.length > 0) {
      const first = matching[0];
      const firstIds = getRecordIdentifierTypes(first);
      const nextIdType = firstIds[0] || 'ICCID';
      setFormModelRef(first.modelReference || '');
      setFormMode(first.simType || 'M2M');
      setFormFormFactor(first.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)');
      setFormIdentifierType(nextIdType);
      if (!editingSim && nextIdType !== 'ICCID' && /^899186\d+$/.test(formIccid.trim())) {
        setFormIccid('');
      }
    }
  };

  // Handle dynamic model reference change when multiple models exist for category + operator
  const handleModelRefChange = (newRef: string) => {
    setFormModelRef(newRef);
    const matched = formEnabledSimModels.find(
      (m) =>
        m.typeName === formCategory &&
        m.manufacturer === formOperator &&
        m.modelReference === newRef
    );
    if (matched) {
      const matchedIds = getRecordIdentifierTypes(matched);
      const nextIdType = matchedIds[0] || 'ICCID';
      setFormMode(matched.simType || 'M2M');
      setFormFormFactor(matched.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)');
      setFormIdentifierType(nextIdType);
      if (!editingSim && nextIdType !== 'ICCID' && /^899186\d+$/.test(formIccid.trim())) {
        setFormIccid('');
      }
    }
  };

  // Keep defaults aligned when company or enabled models change
  useEffect(() => {
    if (editingSim) return;
    if (formEnabledSimModels.length === 0) {
      setFormCategory('');
      setFormOperator('');
      setFormModelRef('');
      setFormIdentifierType('ICCID');
      return;
    }
    const stillValid = formEnabledSimModels.find(
      (m) =>
        m.typeName === formCategory &&
        m.manufacturer === formOperator &&
        (!formModelRef || (m.modelReference || '') === formModelRef)
    );
    if (stillValid) return;

    const first =
      formEnabledSimModels.find((m) => m.typeName === formCategory) || formEnabledSimModels[0];
    const firstIds = getRecordIdentifierTypes(first);
    setFormCategory(first.typeName);
    setFormOperator(first.manufacturer);
    setFormModelRef(first.modelReference || '');
    setFormMode(first.simType || 'M2M');
    setFormFormFactor(first.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)');
    setFormIdentifierType(firstIds[0] || 'ICCID');
  }, [effectiveFormOwner, formEnabledSimModels, editingSim, formCategory, formOperator, formModelRef]);

  // Tenant-scoped SIMs + authoritative computed assignment & effective inventory status
  const authorizedSims = useMemo(() => {
    const companyTarget =
      currentCompany && currentCompany !== 'Platform Admin' && currentCompany !== 'Binary'
        ? currentCompany.trim().toLowerCase()
        : null;
    if (!companyTarget) return store.sims;
    return store.sims.filter((s) => (s.owner || '').trim().toLowerCase() === companyTarget);
  }, [store.sims, currentCompany]);

  const { assignmentById, effectiveStatusById, enrichedSims } = useMemo(() => {
    void statusTick;
    const nowMs = Date.now();
    const aMap = new Map<string, SimComputedAssignment>();
    const eMap = new Map<string, EffectiveSimInventoryStatus>();
    const rows = authorizedSims.map((sim) => {
      const computedAssignment = resolveSimComputedAssignment(sim.id, store, nowMs);
      const effectiveStatus = deriveSimEffectiveInventoryStatus(sim, store, nowMs);
      aMap.set(sim.id, computedAssignment);
      eMap.set(sim.id, effectiveStatus);
      return {
        ...sim,
        assigned: computedAssignment.assignedHardwareName,
        connection: computedAssignment.assignedConnectionId,
        effectiveStatus,
        assignmentStatus: computedAssignment.assignmentStatus,
        computedAssignment
      };
    });
    return { assignmentById: aMap, effectiveStatusById: eMap, enrichedSims: rows };
  }, [authorizedSims, store, statusTick]);

  const inspectedSim = useMemo(
    () => (inspectedSimId ? enrichedSims.find((s) => s.id === inspectedSimId) || null : null),
    [enrichedSims, inspectedSimId]
  );

  // Open Create SIM Form (Create/Edit UI fields remain strictly frozen)
  const handleOpenCreate = () => {
    setEditingSim(null);
    const targetOrg = isPlatformAdmin
      ? filterOwner !== 'All'
        ? filterOwner
        : availableOrganizations[0] || ''
      : currentCompany;
    const targetModels = getEnabledModelsForCompanyName(targetOrg).filter(
      (m) => m.category === 'SIM'
    );
    const firstEnabled = targetModels[0];
    const cat = firstEnabled ? firstEnabled.typeName : '';
    const op = firstEnabled ? firstEnabled.manufacturer : '';
    const modelRef = firstEnabled?.modelReference || '';
    const modeVal = firstEnabled ? firstEnabled.simType || 'M2M' : 'M2M';
    const ffVal: SimRecord['formFactor'] = firstEnabled?.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)';
    const firstIds = getRecordIdentifierTypes(firstEnabled);
    const idType = firstIds[0] || 'ICCID';

    setFormOwner(targetOrg);
    setFormIdentifierType(idType);
    setFormIccid('');
    setFormSimId(`SIM-rt-${Date.now()}`);
    setFormMsisdn('');
    setFormCategory(cat);
    setFormOperator(op);
    setFormModelRef(modelRef);
    setFormPlan(
      op === 'Jio'
        ? 'Enterprise M2M 2GB'
        : op === 'Vi' || op === 'Vodafone Idea'
        ? 'IoT 5GB'
        : SIM_PLANS[0] || 'IoT Business 10GB'
    );
    setFormFormFactor(ffVal);
    setFormMode(modeVal);
    setFormStatus('Inventory');
    setFormActivationDate('');
    setFormRenewalDate('');
    setFormNotes('');
    setFormError(
      firstEnabled
        ? null
        : 'No active SIM models are enabled for this company. Enable a SIM model in Company Model Access first.'
    );
    setActiveDrawer('form');
  };

  // Open Edit SIM Form
  const handleOpenEdit = (record: SimRecord) => {
    setEditingSim(record);
    setFormOwner(record.owner || availableOrganizations[0] || '');
    setFormIccid(record.iccid);
    setFormSimId(record.id);
    setFormMsisdn(record.msisdn);
    const matchedModel =
      getModelCategoryById(record.modelTypeId) ||
      enabledSimModels.find((m) => m.id === record.modelTypeId);
    const cat =
      record.category ||
      matchedModel?.typeName ||
      '';
    const modelIds = getRecordIdentifierTypes(matchedModel);
    setFormIdentifierType(record.identifierType || modelIds[0] || 'ICCID');
    setFormCategory(cat);
    setFormFormFactor(record.formFactor);
    setFormOperator(record.operator);
    setFormModelRef(matchedModel?.modelReference || '');
    setFormPlan(record.plan);
    setFormMode(
      record.serviceMode ||
        matchedModel?.simType ||
        (record.plan.includes('M2M') ? 'M2M' : 'Standard')
    );
    setFormStatus(record.status);
    setFormActivationDate(record.activationDate);
    setFormRenewalDate(record.renewalDate);
    setFormNotes(record.notes);
    setFormError(null);
    setActiveDrawer('form');
  };

  const validatePrimarySimIdentifier = (idType: string, value: string): string | null => {
    const trimmed = value.trim();
    const norm = idType.trim().toUpperCase();
    if (!trimmed) return `${idType} is required.`;
    if (norm === 'ICCID' && !/^\d{18,22}$/.test(trimmed)) {
      return 'ICCID must be 18–22 ASCII digits.';
    }
    if (norm === 'EID' && !/^[0-9A-Za-z]{32}$/.test(trimmed)) {
      return 'EID must be 32 alphanumeric characters.';
    }
    if (norm === 'IMSI' && !/^\d{15}$/.test(trimmed)) {
      return 'IMSI must be 15 ASCII digits.';
    }
    if (norm === 'MSISDN') {
      const digits = trimmed.replace(/\D/g, '');
      if (!/^\+?[\d\s-]{8,18}$/.test(trimmed) || digits.length < 8 || digits.length > 15) {
        return 'MSISDN must be a valid mobile number (8–15 digits).';
      }
    }
    return null;
  };

  // Save SIM (Create or Edit)
  const handleSaveSim = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedPrimaryId = formIccid.trim();
    const resolvedOwnerName = isPlatformAdmin
      ? (formOwner || '').trim()
      : currentCompany;
    const ownerCompany = resolveClientCompanyByNameOrId(resolvedOwnerName);

    if (
      !ownerCompany ||
      ownerCompany.isPlatformOwner ||
      (!editingSim && !isCompanyEligibleForNewRegistration(ownerCompany))
    ) {
      setFormError(
        `Organization "${resolvedOwnerName || '—'}" is inactive or ineligible for SIM registration.`
      );
      return;
    }

    if (!editingSim && formEnabledSimModels.length === 0) {
      setFormError(
        `No active SIM models are currently available for "${ownerCompany.name}". Enable SIM models or verify company status in Company Management.`
      );
      return;
    }

    if (!editingSim && !selectedSimModelSpec) {
      setFormError(
        `Select a valid enabled SIM category, operator, and model enabled for "${ownerCompany.name}".`
      );
      return;
    }

    const idErr = validatePrimarySimIdentifier(activeIdentifierType, trimmedPrimaryId);
    if (idErr) {
      setFormError(idErr);
      return;
    }

    const duplicateIdentifier = store.sims.some(
      (s) =>
        s.id !== editingSim?.id &&
        s.iccid.trim().toLowerCase() === trimmedPrimaryId.toLowerCase()
    );
    if (duplicateIdentifier) {
      setFormError(`${activeIdentifierType} "${trimmedPrimaryId}" already exists in SIM Master.`);
      return;
    }

    const trimmedMsisdn = formMsisdn.trim();
    if (trimmedMsisdn && activeIdentifierType.trim().toUpperCase() !== 'MSISDN') {
      const msisdnDigits = trimmedMsisdn.replace(/\D/g, '');
      if (!/^\+?[\d\s-]{8,18}$/.test(trimmedMsisdn) || msisdnDigits.length < 8 || msisdnDigits.length > 15) {
        setFormError('Mobile number / MSISDN must contain 8–15 digits.');
        return;
      }
    }

    if (formActivationDate && formRenewalDate && formRenewalDate < formActivationDate) {
      setFormError('Expiry / renewal date cannot be earlier than Activation date.');
      return;
    }

    const nowIso = new Date().toISOString();
    const actorLabel = isPlatformAdmin ? 'Platform Admin' : currentCompany;

    if (editingSim) {
      const refs = getSimMappingReferences(editingSim.id, store);
      const ownerChanged =
        ownerCompany.name.toLowerCase() !== (editingSim.owner || '').trim().toLowerCase();
      if (ownerChanged && refs.hasAnyReference) {
        setFormError(
          'Cannot change SIM organization while referenced in active, scheduled, or historical Asset Mapping records.'
        );
        return;
      }
      if (refs.hasActiveOrScheduledReference && formStatus !== 'Active') {
        setFormError(
          `Cannot set carrier lifecycle to "${formStatus}" while this SIM has an active or scheduled Asset Mapping (${refs.activeOrScheduledConnections.map((c) => c.connectionId || c.id).join(', ') || 'binding'}). End the mapping first.`
        );
        return;
      }
      if (
        ownerChanged &&
        editingSim.modelTypeId &&
        !getEnabledModelsForCompanyName(ownerCompany.name).some(
          (m) => m.category === 'SIM' && m.id === editingSim.modelTypeId
        )
      ) {
        setFormError(
          `Target organization "${ownerCompany.name}" does not have this SIM model enabled in Company Model Access.`
        );
        return;
      }

      const changeNotes: string[] = [];
      if (editingSim.status !== formStatus) {
        changeNotes.push(`carrier lifecycle ${editingSim.status} → ${formStatus}`);
      }
      if (editingSim.plan !== formPlan) {
        changeNotes.push(`plan "${editingSim.plan}" → "${formPlan}"`);
      }
      if (ownerChanged) {
        changeNotes.push(`owner ${editingSim.owner} → ${ownerCompany.name}`);
      }
      const auditEntry: HardwareAuditEntry = {
        id: `aud-sim-${Date.now()}`,
        timestamp: nowIso,
        actor: actorLabel,
        action: 'Updated SIM',
        summary:
          changeNotes.length > 0
            ? `Updated ${trimmedPrimaryId}: ${changeNotes.join('; ')}.`
            : `Updated SIM metadata for ${trimmedPrimaryId}.`
      };

      const updatedRecord: SimRecord = {
        ...editingSim,
        id: editingSim.id,
        iccid: trimmedPrimaryId,
        msisdn: trimmedMsisdn,
        formFactor: formFormFactor,
        operator: formOperator || editingSim.operator,
        plan: formPlan,
        owner: ownerCompany.name,
        status: formStatus,
        activationDate: formActivationDate,
        renewalDate: formRenewalDate,
        notes: formNotes.trim(),
        category: formCategory || editingSim.category,
        modelTypeId: selectedSimModelSpec?.id || editingSim.modelTypeId,
        identifierType: activeIdentifierType,
        serviceMode: formMode,
        auditHistory: [auditEntry, ...(editingSim.auditHistory || [])].slice(0, 25)
      };
      setStore((prev) => ({
        ...prev,
        sims: prev.sims.map((s) => (s.id === editingSim.id ? updatedRecord : s))
      }));
      showToast(`SIM (${activeIdentifierType}: ${trimmedPrimaryId}) updated.`);
    } else {
      const generatedRecordId =
        formSimId.trim() && !store.sims.some((s) => s.id === formSimId.trim())
          ? formSimId.trim()
          : `SIM-rt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const auditEntry: HardwareAuditEntry = {
        id: `aud-sim-${Date.now()}`,
        timestamp: nowIso,
        actor: actorLabel,
        action: 'Registered SIM',
        summary: `Registered ${formCategory || selectedSimModelSpec?.typeName} (${activeIdentifierType}: ${trimmedPrimaryId}) for ${ownerCompany.name} with carrier lifecycle "${formStatus}".`
      };
      const newRecord: SimRecord = {
        id: generatedRecordId,
        iccid: trimmedPrimaryId,
        msisdn:
          activeIdentifierType.trim().toUpperCase() === 'MSISDN' && !trimmedMsisdn
            ? trimmedPrimaryId
            : trimmedMsisdn,
        operator: formOperator || selectedSimModelSpec!.manufacturer,
        plan: formPlan,
        formFactor: formFormFactor,
        network: '',
        owner: ownerCompany.name,
        location: '',
        status: formStatus,
        activationDate: formActivationDate,
        renewalDate: formRenewalDate,
        notes: formNotes.trim(),
        category: formCategory || selectedSimModelSpec!.typeName,
        modelTypeId: selectedSimModelSpec!.id,
        identifierType: activeIdentifierType,
        serviceMode: formMode,
        auditHistory: [auditEntry]
      };
      setStore((prev) => ({
        ...prev,
        sims: [newRecord, ...prev.sims]
      }));
      setSortKey('');
      setCurrentPage(1);
      showToast(`SIM (${activeIdentifierType}: ${trimmedPrimaryId}) created.`);
    }

    setActiveDrawer(null);
  };

  const filteredSims = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedSims.filter((s) => {
      if (
        !matchesSimFilters(
          s,
          effectiveAdvancedFilters,
          s.effectiveStatus,
          s.computedAssignment,
          isPlatformAdmin
        )
      ) {
        return false;
      }
      if (q) {
        const cat = resolveSimCategoryLabel(s);
        const hay = [
          s.id,
          s.iccid,
          s.msisdn,
          cat,
          s.operator,
          s.plan,
          s.formFactor,
          s.owner,
          s.location,
          s.status,
          s.effectiveStatus,
          s.assigned,
          s.connection
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedSims, effectiveAdvancedFilters, isPlatformAdmin, searchQuery]);

  // Prune stale / hidden / cross-tenant selected IDs whenever visible filtered rows change
  useEffect(() => {
    const visibleIds = new Set(filteredSims.map((s) => s.id));
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visibleIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [filteredSims]);

  const sortedSims = useMemo(() => {
    if (!sortKey) return filteredSims;
    const copy = [...filteredSims];
    copy.sort((a, b) => {
      const av = String(
        sortKey === 'status'
          ? a.effectiveStatus
          : sortKey === 'category'
          ? resolveSimCategoryLabel(a)
          : (a as any)[sortKey] ?? ''
      ).toLowerCase();
      const bv = String(
        sortKey === 'status'
          ? b.effectiveStatus
          : sortKey === 'category'
          ? resolveSimCategoryLabel(b)
          : (b as any)[sortKey] ?? ''
      ).toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filteredSims, sortKey, sortDir]);

  const totalRecords = sortedSims.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const currentSimRows = sortedSims.slice(startIdx, startIdx + pageSize);

  const visibleColumns = useMemo(
    () => SIM_COLUMNS.filter((c) => !hiddenCols.includes(c.key)),
    [hiddenCols]
  );

  const activeFilterCount = useMemo(
    () => countActiveSimFilters(effectiveAdvancedFilters, isPlatformAdmin),
    [effectiveAdvancedFilters, isPlatformAdmin]
  );

  const clearAllSimFilters = () => {
    setFilterOwner('All');
    setAdvancedFilters(DEFAULT_SIM_FILTERS);
    setCurrentPage(1);
  };

  const handleApplyAdvancedFilters = (next: SimAdvancedFilters) => {
    setAdvancedFilters(next);
    if (isPlatformAdmin) {
      setFilterOwner(next.organizations.length === 1 ? next.organizations[0] : 'All');
    }
    setCurrentPage(1);
  };

  // Selection helpers
  const allCurrentSelected =
    currentSimRows.length > 0 && currentSimRows.every((r) => selectedIds.has(r.id));

  const toggleSelectAllOnPage = () => {
    const next = new Set(selectedIds);
    if (allCurrentSelected) {
      currentSimRows.forEach((r) => next.delete(r.id));
    } else {
      currentSimRows.forEach((r) => next.add(r.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Sort handler
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Inspector opener
  const openInspector = (rec: SimRecord) => {
    setInspectedSimId(rec.id);
    setInspectorTab('overview');
    setActiveDrawer('inspector');
  };

  const [simToDelete, setSimToDelete] = useState<SimRecord | null>(null);

  const handleConfirmDeleteSim = () => {
    if (!simToDelete) return;
    const refs = getSimMappingReferences(simToDelete.id, store);
    if (refs.hasAnyReference) {
      showToast(
        `Cannot delete ${simToDelete.iccid}: referenced in ${refs.allConnections.length || refs.allBindings.length || refs.allSimAssignments.length} Asset Mapping / assignment record(s).`,
        'error'
      );
      return;
    }
    const idToDelete = simToDelete.id;
    setStore((prev) => ({
      ...prev,
      sims: prev.sims.filter((s) => s.id !== idToDelete)
    }));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(idToDelete);
      return next;
    });
    showToast(`SIM "${simToDelete.iccid}" (${simToDelete.operator}) deleted successfully`);
    setSimToDelete(null);
    if (inspectedSimId === idToDelete) {
      setActiveDrawer(null);
      setInspectedSimId(null);
    }
  };

  // Selected SIMs strictly scoped to visible authorized records
  const selectedSimRecords = useMemo(
    () => filteredSims.filter((s) => selectedIds.has(s.id)),
    [filteredSims, selectedIds]
  );

  const availableLocations = useMemo(
    () =>
      Array.from(
        new Set(authorizedSims.map((s) => (s.location || '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [authorizedSims]
  );

  const handleBulkExportSelected = (recordsToExport: SimRecord[]) => {
    if (recordsToExport.length === 0) return;
    const exportRows = recordsToExport.map((s) => ({
      ...s,
      category: resolveSimCategoryLabel(s),
      status: effectiveStatusById.get(s.id) || deriveSimEffectiveInventoryStatus(s, store)
    }));
    downloadModalCsv('FleetRobo_sims_selected_export.csv', visibleColumns, exportRows);
    showToast(
      `Exported ${exportRows.length} selected SIM record(s) to FleetRobo_sims_selected_export.csv`
    );
  };

  const handleApplySimBulkUpdate = (
    mode: Exclude<SimBulkActionMode, 'export_selected'>,
    eligibleIds: string[],
    options?: {
      targetOwner?: string;
      targetLifecycle?: SimLifecycleStatus;
      targetPlan?: string;
      targetLocation?: string;
    }
  ) => {
    const allowedScopeIds = new Set(filteredSims.map((s) => s.id));
    const safeIds = new Set(eligibleIds.filter((id) => allowedScopeIds.has(id)));
    if (safeIds.size === 0) return;

    const nowMs = Date.now();
    const nowIso = new Date().toISOString();
    const actorLabel = isPlatformAdmin ? 'Platform Admin' : currentCompany;

    if (mode === 'delete') {
      let deletedCount = 0;
      const deletedSet = new Set<string>();
      setStore((prev) => ({
        ...prev,
        sims: prev.sims.filter((s) => {
          if (!safeIds.has(s.id)) return true;
          const refs = getSimMappingReferences(s.id, prev, nowMs);
          if (refs.hasAnyReference) return true;
          deletedSet.add(s.id);
          deletedCount += 1;
          return false;
        })
      }));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedSet.forEach((id) => next.delete(id));
        return next;
      });
      if (inspectedSimId && deletedSet.has(inspectedSimId)) {
        setInspectedSimId(null);
      }
      showToast(`Deleted ${deletedCount} unreferenced SIM card(s).`);
      return;
    }

    if (mode === 'update_owner') {
      if (!isPlatformAdmin) {
        showToast('Only Platform Admin can transfer SIM ownership.', 'error');
        return;
      }
      const nextOwnerName = (options?.targetOwner || '').trim();
      const targetComp = resolveClientCompanyByNameOrId(nextOwnerName);
      if (!targetComp || targetComp.isPlatformOwner || !isCompanyEligibleForNewRegistration(targetComp)) {
        showToast(`Target organization "${nextOwnerName}" is invalid or ineligible.`, 'error');
        return;
      }
      const targetEnabledModels = getEnabledModelsForCompanyName(targetComp.name).filter(
        (m) => m.category === 'SIM'
      );
      let transferred = 0;

      setStore((prev) => ({
        ...prev,
        sims: prev.sims.map((s) => {
          if (!safeIds.has(s.id)) return s;
          if ((s.owner || '').trim().toLowerCase() === targetComp.name.toLowerCase()) return s;
          const refs = getSimMappingReferences(s.id, prev, nowMs);
          if (refs.hasAnyReference) return s;
          if (s.modelTypeId && !targetEnabledModels.some((m) => m.id === s.modelTypeId)) {
            return s;
          }
          transferred += 1;
          const auditEntry: HardwareAuditEntry = {
            id: `aud-sim-own-${Date.now()}-${transferred}`,
            timestamp: nowIso,
            actor: actorLabel,
            action: 'Ownership Transfer',
            summary: `Transferred ownership from ${s.owner} to ${targetComp.name}.`
          };
          return {
            ...s,
            owner: targetComp.name,
            auditHistory: [auditEntry, ...(s.auditHistory || [])].slice(0, 25)
          };
        })
      }));
      showToast(`Transferred ownership on ${transferred} eligible SIM(s) to ${targetComp.name}.`);
      return;
    }

    let updatedCount = 0;
    setStore((prev) => ({
      ...prev,
      sims: prev.sims.map((s) => {
        if (!safeIds.has(s.id)) return s;
        const refs = getSimMappingReferences(s.id, prev, nowMs);

        if (mode === 'update_lifecycle') {
          const nextLifecycle = options?.targetLifecycle;
          if (!nextLifecycle || s.status === nextLifecycle) return s;
          if (refs.hasActiveOrScheduledReference && nextLifecycle !== 'Active') return s;
          updatedCount += 1;
          const projectedEff = deriveSimEffectiveInventoryStatus(
            { ...s, status: nextLifecycle },
            prev,
            nowMs
          );
          const auditEntry: HardwareAuditEntry = {
            id: `aud-sim-lc-${Date.now()}-${updatedCount}`,
            timestamp: nowIso,
            actor: actorLabel,
            action: 'Carrier Lifecycle Updated',
            summary: `Carrier lifecycle changed ${s.status} → ${nextLifecycle} (effective inventory status: ${projectedEff}).`
          };
          return {
            ...s,
            status: nextLifecycle,
            auditHistory: [auditEntry, ...(s.auditHistory || [])].slice(0, 25)
          };
        }

        if (mode === 'update_plan') {
          if (s.status === 'Retired') return s;
          const nextPlan = (options?.targetPlan || '').trim();
          if (!nextPlan || s.plan === nextPlan) return s;
          updatedCount += 1;
          const auditEntry: HardwareAuditEntry = {
            id: `aud-sim-pln-${Date.now()}-${updatedCount}`,
            timestamp: nowIso,
            actor: actorLabel,
            action: 'Plan Metadata Updated',
            summary: `Updated inventory plan metadata from "${s.plan}" to "${nextPlan}".`
          };
          return {
            ...s,
            plan: nextPlan,
            auditHistory: [auditEntry, ...(s.auditHistory || [])].slice(0, 25)
          };
        }

        if (mode === 'update_location') {
          if (s.status === 'Retired') return s;
          const nextLoc = (options?.targetLocation || '').trim();
          if (!nextLoc) return s;
          updatedCount += 1;
          const auditEntry: HardwareAuditEntry = {
            id: `aud-sim-loc-${Date.now()}-${updatedCount}`,
            timestamp: nowIso,
            actor: actorLabel,
            action: 'Location Updated',
            summary: `Updated Inventory Location to "${nextLoc}".`
          };
          return {
            ...s,
            location: nextLoc,
            auditHistory: [auditEntry, ...(s.auditHistory || [])].slice(0, 25)
          };
        }

        if (mode === 'retire') {
          if (s.status === 'Retired' || refs.hasActiveOrScheduledReference) return s;
          updatedCount += 1;
          const auditEntry: HardwareAuditEntry = {
            id: `aud-sim-ret-${Date.now()}-${updatedCount}`,
            timestamp: nowIso,
            actor: actorLabel,
            action: 'SIM Retired',
            summary: `Carrier lifecycle set to Retired (previous carrier state: ${s.status}).`
          };
          return {
            ...s,
            status: 'Retired',
            auditHistory: [auditEntry, ...(s.auditHistory || [])].slice(0, 25)
          };
        }

        return s;
      })
    }));
    showToast(`Bulk operation updated ${updatedCount} eligible SIM(s).`);
  };

  // Direct CSV/JSON upload execution (strict tenant/model validation; zero fabricated defaults)
  const processSimsUpload = (fmt: 'csv' | 'json', rawText: string, fileName: string, fileSize?: number) => {
    const raw = rawText.trim();
    if (!raw) {
      simUpload.fail('Uploaded file is empty.');
      return;
    }

    const valid: SimRecord[] = [];
    const invalid: { line: number; reason: string }[] = [];
    const seenPrimaryIds = new Set(store.sims.map((s) => s.iccid.trim().toLowerCase()));
    const nowIso = new Date().toISOString();
    const actorLabel = isPlatformAdmin ? 'Platform Admin' : currentCompany;

    const validateAndBuildRow = (
      lineNo: number,
      input: {
        primaryId: string;
        msisdn: string;
        operator: string;
        plan: string;
        formFactor: string;
        owner: string;
        location: string;
        status: string;
        category: string;
        modelRef: string;
        identifierType: string;
        serviceMode: string;
        activationDate: string;
        renewalDate: string;
      }
    ) => {
      const ownerInput = input.owner.trim();
      const targetOwnerName = isPlatformAdmin
        ? ownerInput
        : currentCompany;

      if (!isPlatformAdmin && ownerInput && ownerInput.toLowerCase() !== currentCompany.trim().toLowerCase()) {
        invalid.push({
          line: lineNo,
          reason: `Cross-tenant owner "${ownerInput}" is blocked in ${currentCompany} view`
        });
        return;
      }

      if (!targetOwnerName) {
        invalid.push({ line: lineNo, reason: 'Organization / Owner is required' });
        return;
      }

      const ownerCompany = resolveClientCompanyByNameOrId(targetOwnerName);
      if (
        !ownerCompany ||
        ownerCompany.isPlatformOwner ||
        !isCompanyEligibleForNewRegistration(ownerCompany)
      ) {
        invalid.push({
          line: lineNo,
          reason: `Organization "${targetOwnerName}" is inactive or invalid`
        });
        return;
      }

      const companyModels = getEnabledModelsForCompanyName(ownerCompany.name).filter(
        (m) => m.category === 'SIM'
      );
      if (companyModels.length === 0) {
        invalid.push({
          line: lineNo,
          reason: `No active SIM models enabled for "${ownerCompany.name}"`
        });
        return;
      }

      const opInput = input.operator.trim();
      const catInput = input.category.trim();
      const refInput = input.modelRef.trim();

      if (!opInput && !refInput && !catInput) {
        invalid.push({
          line: lineNo,
          reason: 'Network operator / SIM model is required'
        });
        return;
      }

      const matchedModels = companyModels.filter((m) => {
        if (opInput && m.manufacturer.trim().toLowerCase() !== opInput.toLowerCase()) return false;
        if (catInput && m.typeName.trim().toLowerCase() !== catInput.toLowerCase()) return false;
        if (refInput && (m.modelReference || '').trim().toLowerCase() !== refInput.toLowerCase()) {
          return false;
        }
        return true;
      });

      if (matchedModels.length === 0) {
        invalid.push({
          line: lineNo,
          reason: `No enabled SIM model matches (${[catInput, opInput, refInput].filter(Boolean).join(' · ')}) for "${ownerCompany.name}"`
        });
        return;
      }

      const resolvedModel = matchedModels[0];
      const allowedIdTypes = getRecordIdentifierTypes(resolvedModel);
      const requestedIdType = input.identifierType.trim();
      const idType = requestedIdType
        ? allowedIdTypes.find((t) => t.toLowerCase() === requestedIdType.toLowerCase()) || ''
        : allowedIdTypes[0] || 'ICCID';

      if (!idType) {
        invalid.push({
          line: lineNo,
          reason: `Identifier type "${requestedIdType}" is not supported by ${resolvedModel.typeName}`
        });
        return;
      }

      const primaryId = input.primaryId.trim();
      const idErr = validatePrimarySimIdentifier(idType, primaryId);
      if (idErr) {
        invalid.push({ line: lineNo, reason: idErr });
        return;
      }

      if (seenPrimaryIds.has(primaryId.toLowerCase())) {
        invalid.push({ line: lineNo, reason: `Duplicate ${idType} (${primaryId})` });
        return;
      }

      const planInput = input.plan.trim();
      if (!planInput) {
        invalid.push({ line: lineNo, reason: 'Plan / data package is required' });
        return;
      }

      const ffInput = input.formFactor.trim();
      const matchedFormFactor = ffInput
        ? SIM_FORM_FACTORS.find((f) => f.toLowerCase() === ffInput.toLowerCase())
        : resolvedModel.simFormFactor === 'eSIM'
        ? 'eSIM'
        : 'Nano (4FF)';
      if (!matchedFormFactor) {
        invalid.push({ line: lineNo, reason: `Invalid form factor "${ffInput}"` });
        return;
      }

      const statusInput = input.status.trim();
      const matchedLifecycle = statusInput
        ? SIM_LIFECYCLE_OPTIONS.find((st) => st.toLowerCase() === statusInput.toLowerCase())
        : 'Inventory';
      if (!matchedLifecycle) {
        invalid.push({ line: lineNo, reason: `Invalid lifecycle status "${statusInput}"` });
        return;
      }

      const msisdn = input.msisdn.trim();
      if (msisdn && idType.toUpperCase() !== 'MSISDN') {
        const digits = msisdn.replace(/\D/g, '');
        if (!/^\+?[\d\s-]{8,18}$/.test(msisdn) || digits.length < 8 || digits.length > 15) {
          invalid.push({ line: lineNo, reason: `Invalid MSISDN "${msisdn}"` });
          return;
        }
      }

      seenPrimaryIds.add(primaryId.toLowerCase());
      const indexOffset = valid.length;
      valid.push({
        id: `SIM-imp-${Date.now()}-${indexOffset}-${Math.random().toString(36).substring(2, 6)}`,
        iccid: primaryId,
        msisdn: idType.toUpperCase() === 'MSISDN' && !msisdn ? primaryId : msisdn,
        operator: resolvedModel.manufacturer,
        plan: planInput,
        formFactor: matchedFormFactor,
        network: '',
        owner: ownerCompany.name,
        location: input.location.trim(),
        status: matchedLifecycle,
        activationDate: input.activationDate.trim(),
        renewalDate: input.renewalDate.trim(),
        notes: 'Imported via bulk CSV/JSON',
        category: resolvedModel.typeName,
        modelTypeId: resolvedModel.id,
        identifierType: idType,
        serviceMode: input.serviceMode.trim() || resolvedModel.simType || '',
        auditHistory: [
          {
            id: `aud-sim-imp-${Date.now()}-${indexOffset}`,
            timestamp: nowIso,
            actor: actorLabel,
            action: 'Imported SIM',
            summary: `Imported ${resolvedModel.typeName} (${idType}: ${primaryId}) for ${ownerCompany.name} from ${fileName}.`
          }
        ]
      });
    };

    if (fmt === 'json') {
      try {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        arr.forEach((item, idx) => {
          validateAndBuildRow(idx + 1, {
            primaryId: String(item.iccid || item.identifierValue || '').trim(),
            msisdn: String(item.msisdn || '').trim(),
            operator: String(item.operator || '').trim(),
            plan: String(item.plan || '').trim(),
            formFactor: String(item.formFactor || '').trim(),
            owner: String(item.owner || '').trim(),
            location: String(item.location || '').trim(),
            status: String(item.status || '').trim(),
            category: String(item.category || '').trim(),
            modelRef: String(item.modelReference || item.modelRef || '').trim(),
            identifierType: String(item.identifierType || '').trim(),
            serviceMode: String(item.serviceMode || '').trim(),
            activationDate: String(item.activationDate || '').trim(),
            renewalDate: String(item.renewalDate || '').trim()
          });
        });
      } catch {
        simUpload.fail('Invalid JSON syntax.');
        return;
      }
    } else {
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      let headerMap: Record<string, number> | null = null;
      lines.forEach((line, idx) => {
        const cols = parseCsvLine(line);
        const lowerCols = cols.map((c) => c.trim().toLowerCase());
        if (
          idx === 0 &&
          (lowerCols.some((c) => c.includes('iccid') || c.includes('identifier')) ||
            lowerCols.some((c) => c.includes('operator')))
        ) {
          headerMap = {};
          lowerCols.forEach((h, colIdx) => {
            headerMap![h] = colIdx;
          });
          return;
        }
        const colBy = (aliases: string[], fallbackIndex: number): string => {
          if (headerMap) {
            for (const alias of aliases) {
              const foundKey = Object.keys(headerMap).find((k) => k.includes(alias));
              if (foundKey !== undefined) {
                return cols[headerMap[foundKey]] ?? '';
              }
            }
            return '';
          }
          return cols[fallbackIndex] ?? '';
        };
        validateAndBuildRow(idx + 1, {
          primaryId: colBy(['iccid', 'identifier value', 'sim identifier'], 0),
          msisdn: colBy(['mobile', 'msisdn'], 1),
          operator: colBy(['operator', 'provider'], 2),
          plan: colBy(['plan', 'package'], 3),
          formFactor: colBy(['form factor', 'formfactor'], 4),
          owner: colBy(['owner', 'organization', 'customer', 'company'], 5),
          location: colBy(['location'], 6),
          status: colBy(['lifecycle', 'status'], 7),
          category: colBy(['category'], 8),
          modelRef: colBy(['model reference', 'model ref', 'model'], 9),
          identifierType: colBy(['identifier type'], 10),
          serviceMode: colBy(['service mode', 'sim type'], 11),
          activationDate: colBy(['activation'], 12),
          renewalDate: colBy(['renewal', 'expiry'], 13)
        });
      });
    }

    if (valid.length === 0) {
      simUpload.fail(
        invalid[0]?.reason || 'No valid new SIM rows found (check tenant, enabled model, and identifier validation).'
      );
      return;
    }

    simUpload.startUploading(fileName, formatUploadFileSize(fileSize), () => {
      setStore((prev) => ({
        ...prev,
        sims: [...valid, ...prev.sims]
      }));
      setSortKey('');
      setCurrentPage(1);
      showToast(`Imported ${valid.length} SIM(s) (${invalid.length} skipped).`);
      return {
        headline: 'SIM cards uploaded successfully',
        description: `${valid.length} SIM record${valid.length === 1 ? '' : 's'} imported from ${fileName}.${
          invalid.length > 0 ? ` ${invalid.length} invalid or unauthorized row${invalid.length === 1 ? '' : 's'} skipped (${invalid[0].reason}).` : ''
        }`,
        stats: [
          { label: 'Uploaded', value: valid.length, tone: 'emerald' },
          { label: 'Skipped', value: invalid.length, tone: invalid.length > 0 ? 'amber' : 'slate' }
        ]
      };
    });
  };

  // Lifecycle / Effective Inventory pill styling
  const renderSimStatusBadge = (status: SimLifecycleStatus | EffectiveSimInventoryStatus) => {
    const map: Record<
      SimLifecycleStatus,
      { bg: string; text: string; border: string; dot: string }
    > = {
      Active: {
        bg: 'bg-[#eaf8f0]',
        text: 'text-[#0f7b4b]',
        border: 'border-[#b9ebd0]',
        dot: 'bg-[#0f7b4b]'
      },
      Inventory: {
        bg: 'bg-[#eff6ff]',
        text: 'text-[#1d4ed8]',
        border: 'border-[#bfdbfe]',
        dot: 'bg-[#1d4ed8]'
      },
      Suspended: {
        bg: 'bg-[#fff7ed]',
        text: 'text-[#b45309]',
        border: 'border-[#fed7aa]',
        dot: 'bg-[#b45309]'
      },
      Inactive: {
        bg: 'bg-[#fef2f2]',
        text: 'text-[#dc2626]',
        border: 'border-[#fecaca]',
        dot: 'bg-[#dc2626]'
      },
      Retired: {
        bg: 'bg-[#f1f5f9]',
        text: 'text-[#475569]',
        border: 'border-[#cbd5e1]',
        dot: 'bg-[#475569]'
      }
    };
    const style = map[status] || map.Inventory;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${style.bg} ${style.text} ${style.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {status}
      </span>
    );
  };

  // Authoritative linked mapping/binding/assignment records for inspected SIM
  const inspectedSimRefs = useMemo(() => {
    if (!inspectedSim) return null;
    void statusTick;
    return getSimMappingReferences(inspectedSim.id, store, Date.now());
  }, [inspectedSim, store, statusTick]);

  return (
    <div className="h-full flex flex-col bg-[#f5f7fa] text-[#17212b] overflow-hidden relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-[#17212b] text-white text-xs font-medium shadow-xl border border-slate-700">
          {toastMsg.type === 'success' ? (
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 px-[22px] pt-[14px] pb-[14px] overflow-hidden">
        {/* Page Header */}
        <div className="mb-3 shrink-0">
          <div className="text-[11px] font-medium text-[#8291a0] mb-0.5">
            Model Master / <span className="text-[#5c6b7a]">SIM Master</span>
          </div>
          <h1 className="text-[20px] font-bold text-[#17212b] leading-tight">SIM Master</h1>
          <p className="text-[12px] text-[#5c6b7a] mt-0.5">
            Carrier SIM inventory and cellular plans registered for telemetry connections.
          </p>
        </div>

        {/* Shared Card Container */}
        <div className="flex-1 flex flex-col min-h-0 bg-white border border-[#e3e8ee] rounded-[10px] shadow-[0_1px_2px_rgba(18,28,38,0.04)] overflow-hidden">
          {/* Toolbar Row */}
          <div className="px-3.5 py-2.5 border-b border-[#e3e8ee] flex items-center flex-wrap gap-2 shrink-0">
            {/* Search Input */}
            <div className="relative w-[270px]">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8291a0]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search sims name, ID, model, serial..."
                className="w-full h-[33px] pl-8 pr-7 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] placeholder:text-[#8291a0] focus:outline-none focus:border-[#e56b38]"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8291a0] hover:text-[#17212b] cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {isPlatformAdmin && (
              <div className="inline-flex items-center gap-1.5 h-[33px] px-2.5 rounded-[7px] border border-[#d6dfe8] bg-[#f8fafc]">
                <Building2 size={13} className="text-[#e56b38] shrink-0" />
                <span className="text-[11px] font-medium text-[#5c6b7a] whitespace-nowrap">Organization Name:</span>
                <select
                  value={filterOwner}
                  onChange={(e) => {
                    const nextOrg = e.target.value;
                    setFilterOwner(nextOrg);
                    setAdvancedFilters((prev) => ({
                      ...prev,
                      organizations: nextOrg === 'All' ? [] : [nextOrg]
                    }));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-[12px] font-semibold text-[#17212b] focus:outline-none cursor-pointer pr-1"
                >
                  <option value="All">All Organizations</option>
                  {availableOrganizations.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 1. Filters */}
            <button
              onClick={() => setActiveDrawer('filters')}
              className={`h-[33px] px-3 rounded-[7px] border text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeFilterCount > 0
                  ? 'border-[#f1b79d] bg-[#fff4ee] text-[#9e431c]'
                  : 'border-[#d6dfe8] bg-white text-[#17212b] hover:bg-[#f8fafc]'
              }`}
            >
              <Filter size={13} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#e56b38] text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* 2. Column Catalogue */}
            <ColumnCataloguePopover
              align="left"
              columns={SIM_COLUMNS.map((c) => ({
                key: c.key,
                label: c.label,
                required: c.key === 'iccid',
                category:
                  c.key === 'owner' || c.key === 'iccid' || c.key === 'id' || c.key === 'msisdn'
                    ? 'IDENTIFIERS'
                    : c.key === 'assigned' || c.key === 'connection'
                    ? 'ASSIGNMENTS'
                    : c.key === 'activationDate' || c.key === 'renewalDate'
                    ? 'LIFECYCLE DATES'
                    : 'PLAN & CARRIER',
              }))}
              visibleKeys={SIM_COLUMNS.filter((c) => !hiddenCols.includes(c.key)).map((c) => c.key)}
              onChangeVisibleKeys={(nextKeys) =>
                setHiddenCols(SIM_COLUMNS.filter((c) => !nextKeys.includes(c.key)).map((c) => c.key))
              }
              defaultKeys={SIM_COLUMNS.map((c) => c.key)}
              roleDefaultKeys={SIM_COLUMNS.map((c) => c.key)}
              defaultPinnedKeys={['iccid']}
              onToast={(msg) => showToast(msg, 'success')}
            />

            {/* 3. Density */}
            <button
              onClick={() => {
                setPageSize((prev) => (prev === 20 ? 10 : 20));
                setCurrentPage(1);
              }}
              className={`h-[33px] px-3 rounded-[7px] border text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                pageSize === 10
                  ? 'border-[#f1b79d] bg-[#fff4ee] text-[#9e431c]'
                  : 'border-[#d6dfe8] bg-white text-[#17212b] hover:bg-[#f8fafc]'
              }`}
              title="Toggle row density (20 vs 10 rows per page)"
            >
              <Rows size={13} />
              <span>Density</span>
            </button>

            {/* 4. Saved views */}
            <button
              onClick={() => setActiveDrawer('saved-views')}
              className="h-[33px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-medium text-[#17212b] hover:bg-[#f8fafc] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Bookmark size={13} />
              <span>Saved views</span>
            </button>

            {/* 5. Refresh */}
            <button
              onClick={() => {
                setSearchQuery('');
                clearAllSimFilters();
                setSelectedIds(new Set());
                showToast('SIM Master table refreshed.');
              }}
              className="h-[33px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-medium text-[#17212b] hover:bg-[#f8fafc] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>

            <div className="flex-1" />

            {/* 6. Bulk actions */}
            <button
              onClick={() => setActiveDrawer('bulk')}
              className={`h-[33px] px-3 rounded-[7px] border text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                selectedIds.size > 0
                  ? 'border-[#f1b79d] bg-[#fff4ee] text-[#9e431c]'
                  : 'border-[#d6dfe8] bg-white text-[#17212b] hover:bg-[#f8fafc]'
              }`}
            >
              <Layers size={13} />
              <span>Bulk actions</span>
              {selectedIds.size > 0 && (
                <span className="px-1.5 rounded-full bg-[#e56b38] text-white text-[10px] font-bold">
                  {selectedIds.size}
                </span>
              )}
            </button>

            {/* 7. Import */}
            <button
              onClick={() => setActiveDrawer('import')}
              className="h-[33px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-medium text-[#17212b] hover:bg-[#f8fafc] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Upload size={13} />
              <span>Import</span>
            </button>

            {/* 8. Export */}
            <button
              onClick={() => {
                const exportRows = sortedSims.map((s) => ({
                  ...s,
                  category: resolveSimCategoryLabel(s),
                  status: s.effectiveStatus
                }));
                downloadModalCsv('FleetRobo_sims_export.csv', visibleColumns, exportRows);
                showToast(`Exported ${exportRows.length} SIM records to FleetRobo_sims_export.csv`);
              }}
              className="h-[33px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-medium text-[#17212b] hover:bg-[#f8fafc] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} />
              <span>Export</span>
            </button>

            {/* 9. Primary CTA: Create SIM */}
            <button
              onClick={handleOpenCreate}
              disabled={enabledSimModels.length === 0}
              className={`h-[33px] px-3.5 rounded-[7px] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                enabledSimModels.length === 0
                  ? 'bg-[#cbd5e1] cursor-not-allowed text-[#64748b]'
                  : 'bg-[#e56b38] hover:bg-[#d15b2a]'
              }`}
              title={
                enabledSimModels.length === 0
                  ? `No SIM models enabled for ${currentCompany}. Enable in Company Management > Model Access.`
                  : 'Register new SIM'
              }
            >
              <Plus size={14} />
              <span>Create SIM</span>
            </button>
          </div>

          {/* Status Line Below Toolbar */}
          <div className="px-3.5 py-1.5 bg-[#f8fafc] border-b border-[#e3e8ee] text-[11px] text-[#5c6b7a] flex items-center justify-between shrink-0">
            <span>
              <strong className="font-semibold text-[#17212b]">{selectedIds.size}</strong> selected · Existing FleetRobo design · Sample/demo data; no actual hardware network is contacted
            </span>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllSimFilters}
                className="text-[#9e431c] hover:underline font-medium cursor-pointer"
              >
                Clear All ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Removable Applied-Filter Chips Row */}
          {activeFilterCount > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-b border-[#e3e8ee] flex items-center gap-2 flex-wrap text-xs shrink-0">
              <span className="text-slate-500 font-medium">Applied Filters:</span>
              {isPlatformAdmin && effectiveAdvancedFilters.organizations.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Organization: {effectiveAdvancedFilters.organizations.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setFilterOwner('All');
                      setAdvancedFilters((p) => ({ ...p, organizations: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.categories.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Category: {effectiveAdvancedFilters.categories.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, categories: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.operators.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Operator: {effectiveAdvancedFilters.operators.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, operators: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.models.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Model: {effectiveAdvancedFilters.models.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, models: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.formFactors.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Form Factor: {effectiveAdvancedFilters.formFactors.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, formFactors: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.plans.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Plan: {effectiveAdvancedFilters.plans.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, plans: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.serviceModes.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Mode: {effectiveAdvancedFilters.serviceModes.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, serviceModes: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.carrierStatuses.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Carrier Lifecycle: {effectiveAdvancedFilters.carrierStatuses.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, carrierStatuses: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.networks.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Network: {effectiveAdvancedFilters.networks.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, networks: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.effectiveStatuses.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Effective Status: {effectiveAdvancedFilters.effectiveStatuses.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, effectiveStatuses: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.assignmentStatuses.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Assignment: {effectiveAdvancedFilters.assignmentStatuses.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, assignmentStatuses: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.assignedHardware.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Hardware: {effectiveAdvancedFilters.assignedHardware.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, assignedHardware: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.connectionIds.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Connection: {effectiveAdvancedFilters.connectionIds.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, connectionIds: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {effectiveAdvancedFilters.locations.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Location: {effectiveAdvancedFilters.locations.join(', ')}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, locations: [] }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {(effectiveAdvancedFilters.activationFrom || effectiveAdvancedFilters.activationTo) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Activated: {effectiveAdvancedFilters.activationFrom || '...'} →{' '}
                  {effectiveAdvancedFilters.activationTo || '...'}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, activationFrom: '', activationTo: '' }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {(effectiveAdvancedFilters.renewalFrom || effectiveAdvancedFilters.renewalTo) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-[#B85324] font-semibold">
                  Renewal: {effectiveAdvancedFilters.renewalFrom || '...'} →{' '}
                  {effectiveAdvancedFilters.renewalTo || '...'}
                  <button
                    type="button"
                    onClick={() => {
                      setAdvancedFilters((p) => ({ ...p, renewalFrom: '', renewalTo: '' }));
                      setCurrentPage(1);
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}

          {enabledSimModels.length === 0 && (
            <div className="mx-3.5 mt-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Model Access Notice:</strong> No SIM model types are currently enabled for <strong>{currentCompany}</strong>. Registration of new SIM cards is restricted until enabled by Platform Admin in <strong>Company Management → Model Access</strong>.
                </span>
              </div>
            </div>
          )}

          {/* Scrollable Table Viewport */}
          <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-[#f8fafc] border-b border-[#e3e8ee]">
                  <tr>
                    <th className="w-[40px] px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={allCurrentSelected}
                        onChange={toggleSelectAllOnPage}
                        className="rounded border-[#cbd5e1] text-[#e56b38] focus:ring-[#e56b38] cursor-pointer"
                      />
                    </th>
                    {visibleColumns.map((col) => {
                      const isSorted = sortKey === col.key;
                      const distinctIdTypes = Array.from(
                        new Set(filteredSims.map((s) => s.identifierType || 'ICCID'))
                      );
                      const colLabel =
                        col.key === 'iccid'
                          ? distinctIdTypes.length === 1
                            ? distinctIdTypes[0]
                            : 'SIM Identifier'
                          : col.label;
                      return (
                        <th
                          key={col.key}
                          style={{ minWidth: col.minWidth }}
                          onClick={() => handleSort(col.key)}
                          className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#5c6b7a] hover:text-[#17212b] cursor-pointer select-none whitespace-nowrap"
                        >
                          <div className="inline-flex items-center gap-1">
                            <span>{colLabel}</span>
                            {isSorted ? (
                              sortDir === 'asc' ? (
                                <ArrowUp size={12} className="text-[#e56b38]" />
                              ) : (
                                <ArrowDown size={12} className="text-[#e56b38]" />
                              )
                            ) : (
                              <ArrowUpDown size={11} className="text-[#8291a0] opacity-60" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="sticky right-0 bg-[#f8fafc] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#5c6b7a] text-right border-l border-[#e3e8ee] w-[76px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f5] text-[12px]">
                  {currentSimRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visibleColumns.length + 2}
                        className="px-6 py-12 text-center text-[#5c6b7a]"
                      >
                        No SIM records match the current search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    currentSimRows.map((row) => {
                      const isSelected = selectedIds.has(row.id);
                      const catName = row.category || (row.formFactor === 'eSIM' ? 'IoT eSIM' : row.plan?.includes('M2M') ? 'M2M SIM' : 'Standard SIM');
                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-[#fff4ee]/60' : 'hover:bg-[#f8fafc]'
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(row.id)}
                              className="rounded border-[#cbd5e1] text-[#e56b38] focus:ring-[#e56b38] cursor-pointer"
                            />
                          </td>
                          {visibleColumns.map((col) => {
                            if (col.key === 'owner') {
                              return (
                                <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1.5 font-medium text-[#17212b]">
                                    <Building2 size={13} className="text-[#8291a0] shrink-0" />
                                    <span>{row.owner || '—'}</span>
                                  </span>
                                </td>
                              );
                            }
                            if (col.key === 'iccid') {
                              const rowIdType = row.identifierType || 'ICCID';
                              return (
                                <td key={col.key} className="px-3 py-2.5">
                                  <button
                                    type="button"
                                    onClick={() => openInspector(row)}
                                    className="text-left group cursor-pointer"
                                  >
                                    <div className="font-mono font-semibold text-[#17212b] group-hover:text-[#9e431c] transition-colors">
                                      {row.iccid}
                                    </div>
                                    <div className="text-[11px] text-[#8291a0]">
                                      {rowIdType} · {catName}
                                    </div>
                                  </button>
                                </td>
                              );
                            }
                            if (col.key === 'category') {
                              return (
                                <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                                    {catName}
                                  </span>
                                </td>
                              );
                            }
                            if (col.key === 'id') {
                              return (
                                <td key={col.key} className="px-3 py-2.5 whitespace-nowrap font-mono text-[11.5px] text-[#5c6b7a]">
                                  {row.id}
                                </td>
                              );
                            }
                            if (col.key === 'operator') {
                              return (
                                <td key={col.key} className="px-3 py-2.5 whitespace-nowrap font-medium text-[#17212b]">
                                  {row.operator}
                                </td>
                              );
                            }
                            if (col.key === 'status') {
                              return (
                                <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                                  {renderSimStatusBadge(row.effectiveStatus)}
                                </td>
                              );
                            }
                            if (col.key === 'assigned') {
                              return (
                                <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                                  {row.assigned === 'Unassigned' ? (
                                    <span className="text-[#8291a0]">Unassigned</span>
                                  ) : (
                                    <span className="font-medium text-[#17212b]">
                                      {row.assigned}
                                    </span>
                                  )}
                                </td>
                              );
                            }
                            if (col.key === 'connection') {
                              return (
                                <td
                                  key={col.key}
                                  className="px-3 py-2.5 font-mono text-[11.5px] text-[#5c6b7a] whitespace-nowrap"
                                >
                                  {row.connection}
                                </td>
                              );
                            }
                            return (
                              <td
                                key={col.key}
                                className="px-3 py-2.5 text-[#17212b] whitespace-nowrap"
                              >
                                {(row as any)[col.key] || '—'}
                              </td>
                            );
                          })}
                          <td className="sticky right-0 bg-white px-3 py-2.5 text-right border-l border-[#edf1f5] whitespace-nowrap">
                            <div className="inline-flex items-center justify-end">
                              <RowActionMenu
                                ariaLabel={`Actions for ${row.iccid}`}
                                items={[
                                  {
                                    id: 'view',
                                    label: 'View details',
                                    icon: <Eye size={14} className="text-slate-400" />,
                                    onClick: () => openInspector(row),
                                  },
                                  {
                                    id: 'edit',
                                    label: 'Edit SIM',
                                    icon: <Edit2 size={14} className="text-slate-400" />,
                                    onClick: () => handleOpenEdit(row),
                                  },
                                  {
                                    id: 'delete',
                                    label: 'Delete SIM',
                                    icon: <Trash2 size={14} />,
                                    tone: 'danger',
                                    dividerBefore: true,
                                    onClick: () => setSimToDelete(row),
                                  },
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-2.5 border-t border-[#e3e8ee] bg-white flex items-center justify-between text-[12px] text-[#5c6b7a] shrink-0">
            <div>
              Showing{' '}
              <strong className="font-semibold text-[#17212b]">
                {totalRecords === 0 ? 0 : startIdx + 1}–
                {Math.min(startIdx + pageSize, totalRecords)}
              </strong>{' '}
              of <strong className="font-semibold text-[#17212b]">{totalRecords}</strong> records
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-[28px] px-2 rounded border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] focus:outline-none focus:border-[#e56b38] cursor-pointer"
                >
                  {[10, 12, 20, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 rounded border border-[#d6dfe8] hover:bg-[#f8fafc] disabled:opacity-40 cursor-pointer"
                >
                  First
                </button>
                <button
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded border border-[#d6dfe8] hover:bg-[#f8fafc] disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <span className="px-2.5 font-medium text-[#17212b]">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded border border-[#d6dfe8] hover:bg-[#f8fafc] disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 rounded border border-[#d6dfe8] hover:bg-[#f8fafc] disabled:opacity-40 cursor-pointer"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          RIGHT-SIDE DRAWERS
         ===================================================================== */}
      {activeDrawer && activeDrawer !== 'filters' && activeDrawer !== 'bulk' && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/35 backdrop-blur-[1px]">
          <div className="flex-1" onClick={() => setActiveDrawer(null)} />

          {/* 3. SAVED VIEWS DRAWER */}
          {activeDrawer === 'saved-views' && (
            <div className="w-[520px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-5 py-4 border-b border-[#e3e8ee] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">Saved Views · SIM Master</h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    Save current search, filter, sort, and column configurations or load an existing view.
                  </p>
                </div>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-lg text-[#5c6b7a] hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-5">
                <div className="p-3.5 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] space-y-2.5">
                  <label className="block text-[12px] font-semibold text-[#17212b]">
                    Save current configuration as a view
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newViewName}
                      onChange={(e) => setNewViewName(e.target.value)}
                      placeholder="e.g., Unassigned Jio SIMs"
                      className="flex-1 h-[34px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                    />
                    <button
                      onClick={() => {
                        if (!newViewName.trim()) return;
                        const created: SavedModalView = {
                          id: `sv-sim-${Date.now()}`,
                          pageId: 'sims',
                          name: newViewName.trim(),
                          query: searchQuery,
                          filters: {
                            advancedSimsJson: JSON.stringify(effectiveAdvancedFilters),
                            operator:
                              effectiveAdvancedFilters.operators.length === 1
                                ? effectiveAdvancedFilters.operators[0]
                                : 'All',
                            status:
                              effectiveAdvancedFilters.effectiveStatuses.length === 1
                                ? effectiveAdvancedFilters.effectiveStatuses[0]
                                : 'All',
                            category:
                              effectiveAdvancedFilters.categories.length === 1
                                ? effectiveAdvancedFilters.categories[0]
                                : 'All',
                            owner:
                              isPlatformAdmin && effectiveAdvancedFilters.organizations.length === 1
                                ? effectiveAdvancedFilters.organizations[0]
                                : 'All'
                          },
                          sortKey,
                          sortDir,
                          hiddenCols
                        };
                        setSavedViews((prev) => [created, ...prev]);
                        setNewViewName('');
                        showToast(`Saved view "${created.name}".`);
                      }}
                      className="h-[34px] px-3.5 rounded-[7px] bg-[#e56b38] hover:bg-[#d15b2a] text-white text-[12px] font-semibold cursor-pointer"
                    >
                      Save view
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#5c6b7a]">
                    Available Views
                  </div>
                  {savedViews
                    .filter((v) => v.pageId === 'sims')
                    .map((view) => (
                      <div
                        key={view.id}
                        className="p-3 rounded-lg border border-[#e3e8ee] flex items-center justify-between hover:bg-[#f8fafc]"
                      >
                        <div>
                          <div className="text-[13px] font-semibold text-[#17212b]">
                            {view.name}
                          </div>
                          <div className="text-[11px] text-[#5c6b7a]">
                            Query: {view.query || 'None'} · Sort: {view.sortKey || 'Default'} ({view.sortDir})
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSearchQuery(view.query || '');
                              let nextFilters: SimAdvancedFilters = { ...DEFAULT_SIM_FILTERS };
                              if (view.filters.advancedSimsJson) {
                                try {
                                  const parsed = JSON.parse(view.filters.advancedSimsJson);
                                  nextFilters = {
                                    ...DEFAULT_SIM_FILTERS,
                                    ...parsed
                                  };
                                } catch {
                                  nextFilters = { ...DEFAULT_SIM_FILTERS };
                                }
                              } else {
                                if (view.filters.operator && view.filters.operator !== 'All') {
                                  nextFilters.operators = [view.filters.operator];
                                }
                                if (view.filters.category && view.filters.category !== 'All') {
                                  nextFilters.categories = [view.filters.category];
                                }
                                if (view.filters.status && view.filters.status !== 'All') {
                                  if (
                                    view.filters.status === 'Inventory' ||
                                    view.filters.status === 'Active' ||
                                    view.filters.status === 'Suspended' ||
                                    view.filters.status === 'Retired'
                                  ) {
                                    nextFilters.effectiveStatuses = [view.filters.status];
                                  } else if (view.filters.status === 'Inactive') {
                                    nextFilters.carrierStatuses = ['Inactive'];
                                  }
                                }
                                if (isPlatformAdmin && view.filters.owner && view.filters.owner !== 'All') {
                                  nextFilters.organizations = [view.filters.owner];
                                }
                              }
                              if (!isPlatformAdmin) {
                                nextFilters.organizations = [];
                              } else {
                                setFilterOwner(
                                  nextFilters.organizations.length === 1
                                    ? nextFilters.organizations[0]
                                    : 'All'
                                );
                              }
                              setAdvancedFilters(nextFilters);
                              const safeSortKey =
                                view.sortKey === 'location' ||
                                view.sortKey === 'assigned' ||
                                view.sortKey === 'connection'
                                  ? 'iccid'
                                  : view.sortKey || 'iccid';
                              setSortKey(safeSortKey);
                              setSortDir(view.sortDir || 'asc');
                              setHiddenCols(
                                (view.hiddenCols || []).filter(
                                  (k) => k !== 'location' && k !== 'assigned' && k !== 'connection'
                                )
                              );
                              setCurrentPage(1);
                              setActiveDrawer(null);
                              showToast(`Applied view "${view.name}".`);
                            }}
                            className="px-3 py-1 rounded border border-[#f1b79d] bg-[#fff4ee] text-[#9e431c] text-[11px] font-semibold cursor-pointer"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() =>
                              setSavedViews((prev) => prev.filter((x) => x.id !== view.id))
                            }
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Delete saved view"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. CREATE / EDIT SIM DRAWER (690px) */}
          {activeDrawer === 'form' && (
            <form
              onSubmit={handleSaveSim}
              className="w-[690px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50"
            >
              <div className="px-6 py-4 border-b border-[#e3e8ee] flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">
                    {editingSim ? `Edit SIM · ${editingSim.iccid}` : 'Create SIM'}
                  </h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    Register carrier SIM inventory in FleetRobo inventory. Hardware pairings are configured in Modal Mapping.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-lg text-[#5c6b7a] hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {formError && (
                  <div className="p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[12px] font-medium flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Section 1: 1. Basic Information */}
                <div className="space-y-3.5">
                  <div className="text-[12px] font-bold uppercase tracking-wider text-[#9e431c] border-b border-[#e3e8ee] pb-1.5">
                    1. Basic Information
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-3">
                      <FieldLabel
                        label="Organization Name"
                        required
                        tooltip={
                          isPlatformAdmin
                            ? 'Select the parent or child organization that will own this physical SIM.'
                            : 'Organization prefilled from your active top-bar company context.'
                        }
                      />
                      <select
                        value={formOwner}
                        disabled={!isPlatformAdmin}
                        onChange={(e) => setFormOwner(e.target.value)}
                        className={`w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] text-[12px] font-semibold text-[#17212b] focus:outline-none focus:border-[#e56b38] ${
                          !isPlatformAdmin ? 'bg-[#f8fafc] text-[#475569] cursor-not-allowed' : 'bg-white'
                        }`}
                      >
                        {Array.from(new Set([formOwner, ...availableOrganizations].filter(Boolean))).map((org) => (
                          <option key={org} value={org}>
                            {org}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel
                        label="SIM category"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.sim.formFactor}
                      />
                      <select
                        value={formCategory}
                        onChange={(e) => handleSimCategoryChange(e.target.value)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                      >
                        {formEnabledSimCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel
                        label={activeIdentifierType}
                        required
                        tooltip={
                          activeIdentifierType === 'ICCID'
                            ? MODAL_FIELD_TOOLTIPS.sim.iccid
                            : `Unique ${activeIdentifierType} configured for ${formCategory} in Model Category Master.`
                        }
                      />
                      <input
                        type="text"
                        required
                        value={formIccid}
                        onChange={(e) => setFormIccid(e.target.value)}
                        placeholder={
                          activeIdentifierType === 'ICCID'
                            ? '18–22 digit ICCID'
                            : activeIdentifierType === 'EID'
                            ? '32-digit eSIM EID'
                            : activeIdentifierType === 'IMSI'
                            ? '15-digit IMSI'
                            : activeIdentifierType === 'MSISDN'
                            ? '+91 9810000000'
                            : `Enter ${activeIdentifierType}`
                        }
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] font-mono text-[12px] focus:outline-none focus:border-[#e56b38]"
                      />
                    </div>
                    <div>
                      <FieldLabel
                        label="Form factor"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.sim.formFactor}
                      />
                      <select
                        value={formFormFactor}
                        onChange={(e) => setFormFormFactor(e.target.value as any)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                      >
                        {SIM_FORM_FACTORS.map((ff) => (
                          <option key={ff} value={ff}>
                            {ff}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: 2. Operator and Plan */}
                <div className="space-y-3.5">
                  <div className="text-[12px] font-bold uppercase tracking-wider text-[#9e431c] border-b border-[#e3e8ee] pb-1.5">
                    2. Operator and Plan
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <FieldLabel
                        label="Network operator"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.sim.operator}
                      />
                      <select
                        value={formOperator}
                        onChange={(e) => handleOperatorChange(e.target.value)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                      >
                        {availableOperators.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel
                        label="Plan / data package"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.sim.plan}
                      />
                      <select
                        value={formPlan}
                        onChange={(e) => setFormPlan(e.target.value)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                      >
                        {SIM_PLANS.map((pl) => (
                          <option key={pl} value={pl}>
                            {pl}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel
                        label="Service Mode"
                        tooltip="Commercial telematics classification from model catalog"
                      />
                      <select
                        value={formMode}
                        onChange={(e) => setFormMode(e.target.value)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                      >
                        {Array.from(
                          new Set(['M2M', 'Standard', 'IoT', 'Postpaid', 'Prepaid', 'Other', formMode].filter(Boolean))
                        ).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {(modelsForSelectedOperator.length > 1 || activeIdentifierType.toUpperCase() !== 'MSISDN') && (
                    <div className="grid grid-cols-2 gap-4">
                      {modelsForSelectedOperator.length > 1 && (
                        <div>
                          <FieldLabel
                            label="Model / Reference"
                            tooltip="Select the specific SIM model configuration from Model Category Master."
                          />
                          <select
                            value={selectedSimModelSpec?.modelReference || formModelRef}
                            onChange={(e) => handleModelRefChange(e.target.value)}
                            className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                          >
                            {modelsForSelectedOperator.map((m) => (
                              <option key={m.id} value={m.modelReference}>
                                {m.modelReference || m.typeName} ({getRecordIdentifierTypes(m).join(', ') || m.identifierType})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {activeIdentifierType.toUpperCase() !== 'MSISDN' && (
                        <div>
                          <FieldLabel
                            label="Mobile number / MSISDN"
                            tooltip={MODAL_FIELD_TOOLTIPS.sim.msisdn}
                          />
                          <input
                            type="text"
                            value={formMsisdn}
                            onChange={(e) => setFormMsisdn(e.target.value)}
                            placeholder="+91 9810000000"
                            className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] text-[12px] focus:outline-none focus:border-[#e56b38]"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 3: 3. Additional metadata */}
                <div className="space-y-3.5">
                  <div className="text-[12px] font-bold uppercase tracking-wider text-[#9e431c] border-b border-[#e3e8ee] pb-1.5">
                    3. Additional metadata
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <FieldLabel
                        label="SIM lifecycle status"
                        required
                        tooltip={MODAL_FIELD_TOOLTIPS.sim.status}
                      />
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as SimLifecycleStatus)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                      >
                        {SIM_LIFECYCLE_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel
                        label="Activation date"
                        tooltip={MODAL_FIELD_TOOLTIPS.sim.activationDate}
                      />
                      <input
                        type="date"
                        value={formActivationDate}
                        onChange={(e) => setFormActivationDate(e.target.value)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] text-[12px] focus:outline-none focus:border-[#e56b38]"
                      />
                    </div>
                    <div>
                      <FieldLabel
                        label="Expiry / renewal date"
                        tooltip={MODAL_FIELD_TOOLTIPS.sim.renewalDate}
                      />
                      <input
                        type="date"
                        value={formRenewalDate}
                        onChange={(e) => setFormRenewalDate(e.target.value)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] text-[12px] focus:outline-none focus:border-[#e56b38]"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel
                      label="Notes"
                      tooltip={MODAL_FIELD_TOOLTIPS.sim.notes}
                    />
                    <textarea
                      rows={3}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Optional internal notes for carrier batch, billing reference, or roaming rules..."
                      className="w-full p-3 rounded-[7px] border border-[#d6dfe8] text-[12px] focus:outline-none focus:border-[#e56b38]"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#e3e8ee] bg-[#f8fafc] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="px-4 py-2 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#5c6b7a] hover:text-[#17212b] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[7px] bg-[#e56b38] hover:bg-[#d15b2a] text-white text-[12px] font-semibold shadow-xs cursor-pointer"
                >
                  {editingSim ? 'Save changes' : 'Create SIM'}
                </button>
              </div>
            </form>
          )}

          {/* 5. RECORD DETAILS INSPECTOR DRAWER (690px) */}
          {activeDrawer === 'inspector' && inspectedSim && (
            <div className="w-[690px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-6 py-4 border-b border-[#e3e8ee] flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[16px] font-bold font-mono text-[#17212b]">
                      {inspectedSim.iccid}
                    </h2>
                    {renderSimStatusBadge(inspectedSim.effectiveStatus)}
                  </div>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    {inspectedSim.identifierType || 'ICCID'} · {inspectedSim.operator} ({inspectedSim.plan}) ·{' '}
                    {inspectedSim.formFactor}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(inspectedSim)}
                    className="h-[32px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#17212b] hover:bg-[#f8fafc] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setActiveDrawer(null)}
                    className="p-1.5 rounded-lg text-[#5c6b7a] hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Inspector Internal Tabs */}
              <div className="px-6 border-b border-[#e3e8ee] bg-[#f8fafc] flex items-center gap-5 shrink-0">
                <button
                  onClick={() => setInspectorTab('overview')}
                  className={`py-2.5 text-[12px] font-semibold border-b-2 transition-colors cursor-pointer ${
                    inspectorTab === 'overview'
                      ? 'border-[#e56b38] text-[#9e431c]'
                      : 'border-transparent text-[#5c6b7a] hover:text-[#17212b]'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setInspectorTab('linked')}
                  className={`py-2.5 text-[12px] font-semibold border-b-2 transition-colors cursor-pointer ${
                    inspectorTab === 'linked'
                      ? 'border-[#e56b38] text-[#9e431c]'
                      : 'border-transparent text-[#5c6b7a] hover:text-[#17212b]'
                  }`}
                >
                  Linked records ({inspectedSimRefs?.allConnections.length || 0})
                </button>
                <button
                  onClick={() => setInspectorTab('activity')}
                  className={`py-2.5 text-[12px] font-semibold border-b-2 transition-colors cursor-pointer ${
                    inspectorTab === 'activity'
                      ? 'border-[#e56b38] text-[#9e431c]'
                      : 'border-transparent text-[#5c6b7a] hover:text-[#17212b]'
                  }`}
                >
                  Activity / History
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {inspectorTab === 'overview' && (
                  <>
                    <div className="grid grid-cols-2 gap-3.5 p-4 rounded-xl border border-[#e3e8ee] bg-[#f8fafc]">
                      {[
                        [inspectedSim.identifierType || 'ICCID', inspectedSim.iccid],
                        ['Mobile number / MSISDN', inspectedSim.msisdn || '—'],
                        ['SIM Category', resolveSimCategoryLabel(inspectedSim) || '—'],
                        ['Operator', inspectedSim.operator],
                        ['Plan / package', inspectedSim.plan],
                        ['Form factor', inspectedSim.formFactor],
                        ['Network', inspectedSim.network || '—'],
                        ['Lifecycle', inspectedSim.status],
                        ['Assigned to', inspectedSim.assigned],
                        ['Assigned connection', inspectedSim.connection],
                        ['Activation date', inspectedSim.activationDate || '—'],
                        ['Expiry / renewal date', inspectedSim.renewalDate || '—']
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div className="text-[11px] text-[#5c6b7a]">{k}</div>
                          <div className="text-[12px] font-semibold text-[#17212b] mt-0.5 break-words">
                            {v}
                          </div>
                        </div>
                      ))}
                      <div className="col-span-2">
                        <div className="text-[11px] text-[#5c6b7a]">Notes</div>
                        <div className="text-[12px] text-[#17212b] mt-0.5">
                          {inspectedSim.notes || 'No notes recorded.'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#5c6b7a] mb-2.5">
                        Connected Assignment Records (up to 32 shown)
                      </h3>
                      {(!inspectedSimRefs ||
                        (inspectedSimRefs.allBindings.length === 0 &&
                          inspectedSimRefs.allSimAssignments.length === 0 &&
                          inspectedSimRefs.allConnections.length === 0)) ? (
                        <div className="p-4 rounded-lg border border-[#e3e8ee] text-[12px] text-[#5c6b7a]">
                          This SIM is currently in warehouse inventory with no assignment history.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {inspectedSimRefs.allBindings.slice(0, 32).map((bnd) => {
                            const conn = store.connections.find((c) => c.id === bnd.connectionId);
                            const parentDev = store.devices.find((d) => d.id === bnd.fromHardwareId);
                            const liveBndStatus = computeHardwareBindingStatus(
                              bnd,
                              store.hardwareBindings || [],
                              conn?.members || [],
                              Date.now()
                            ).status;
                            return (
                              <div
                                key={bnd.id}
                                className="p-3 rounded-lg border border-[#e3e8ee] flex items-center justify-between text-[12px]"
                              >
                                <div>
                                  <div className="font-semibold text-[#17212b]">
                                    {conn?.connectionId || bnd.connectionId} · {parentDev?.name || bnd.fromHardwareId}
                                  </div>
                                  <div className="text-[11px] text-[#5c6b7a]">
                                    Effective: {bnd.effectiveStartAt} → {bnd.endedAt || bnd.effectiveEndAt || 'Open'}
                                  </div>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    liveBndStatus === 'Active'
                                      ? 'bg-[#eaf8f0] text-[#0f7b4b]'
                                      : liveBndStatus === 'Scheduled'
                                      ? 'bg-sky-50 text-sky-700'
                                      : liveBndStatus === 'Conflict'
                                      ? 'bg-amber-50 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {liveBndStatus}
                                </span>
                              </div>
                            );
                          })}
                          {inspectedSimRefs.allBindings.length === 0 &&
                            inspectedSimRefs.allSimAssignments.slice(0, 32).map((ev) => (
                              <div
                                key={ev.id}
                                className="p-3 rounded-lg border border-[#e3e8ee] flex items-center justify-between text-[12px]"
                              >
                                <div>
                                  <div className="font-semibold text-[#17212b]">
                                    {ev.connectionId} · {ev.hardwareName}
                                  </div>
                                  <div className="text-[11px] text-[#5c6b7a]">
                                    Effective: {ev.start} → {ev.end || 'Open'}
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                                  {ev.end ? 'Ended' : inspectedSim.computedAssignment.assignmentStatus}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {inspectorTab === 'linked' && (
                  <div className="space-y-3">
                    {!inspectedSimRefs || inspectedSimRefs.allConnections.length === 0 ? (
                      <div className="p-6 text-center rounded-lg border border-[#e3e8ee] text-[12px] text-[#5c6b7a]">
                        No linked connections found for this SIM.
                      </div>
                    ) : (
                      inspectedSimRefs.allConnections.map((conn) => {
                        const peerBindings = inspectedSimRefs.allBindings.filter(
                          (b) => b.connectionId === conn.id
                        );
                        return (
                          <div
                            key={conn.id}
                            className="p-3.5 rounded-lg border border-[#e3e8ee] bg-white space-y-1.5 text-[12px]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold font-mono text-[#17212b]">
                                {conn.connectionId} · {conn.name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  conn.status === 'Active'
                                    ? 'bg-[#eaf8f0] text-[#0f7b4b]'
                                    : conn.status === 'Scheduled'
                                    ? 'bg-sky-50 text-sky-700'
                                    : conn.status === 'Needs Attention'
                                    ? 'bg-amber-50 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {conn.status}
                              </span>
                            </div>
                            <div className="text-[#5c6b7a]">
                              Client: <strong className="text-[#17212b]">{conn.companyName}</strong> · Pairwise bindings:{' '}
                              <strong className="text-[#17212b]">{peerBindings.length}</strong>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {inspectorTab === 'activity' && (
                  <div className="space-y-3">
                    {inspectedSim.auditHistory && inspectedSim.auditHistory.length > 0 ? (
                      inspectedSim.auditHistory.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3.5 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] flex items-start gap-3"
                        >
                          <div className="w-2 h-2 rounded-full bg-[#e56b38] mt-1.5 shrink-0" />
                          <div>
                            <div className="text-[12px] font-semibold text-[#17212b]">
                              {ev.action}
                            </div>
                            <div className="text-[11px] text-[#5c6b7a] mt-0.5">{ev.summary}</div>
                            <div className="text-[10px] font-mono text-[#8291a0] mt-1">
                              {ev.timestamp.slice(0, 19).replace('T', ' ')} · {ev.actor}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-2.5">
                        <div className="p-3.5 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-[#e56b38] mt-1.5 shrink-0" />
                          <div>
                            <div className="text-[12px] font-semibold text-[#17212b]">
                              Effective status: {inspectedSim.effectiveStatus} (Carrier: {inspectedSim.status})
                            </div>
                            <div className="text-[11px] text-[#5c6b7a] mt-0.5">
                              {inspectedSim.operator} · {inspectedSim.plan} ({inspectedSim.formFactor}) owned by{' '}
                              {inspectedSim.owner}
                              {inspectedSim.location ? ` · Location: ${inspectedSim.location}` : ''}
                            </div>
                            {inspectedSim.activationDate && (
                              <div className="text-[10px] font-mono text-[#8291a0] mt-1">
                                Activation date: {inspectedSim.activationDate}
                              </div>
                            )}
                          </div>
                        </div>
                        {inspectedSimRefs &&
                          inspectedSimRefs.allBindings.map((bnd) => {
                            const conn = store.connections.find((c) => c.id === bnd.connectionId);
                            const dev = store.devices.find((d) => d.id === bnd.fromHardwareId);
                            const bndStatus = computeHardwareBindingStatus(
                              bnd,
                              store.hardwareBindings || [],
                              conn?.members || [],
                              Date.now()
                            ).status;
                            return (
                              <div
                                key={bnd.id}
                                className="p-3.5 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] flex items-start gap-3"
                              >
                                <div className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                                <div>
                                  <div className="text-[12px] font-semibold text-[#17212b]">
                                    Binding {bnd.id} ({conn?.connectionId || bnd.connectionId}) · {bndStatus}
                                  </div>
                                  <div className="text-[11px] text-[#5c6b7a] mt-0.5">
                                    Paired with {dev?.name || bnd.fromHardwareId}
                                  </div>
                                  <div className="text-[10px] font-mono text-[#8291a0] mt-1">
                                    {bnd.effectiveStartAt} → {bnd.endedAt || bnd.effectiveEndAt || 'Open'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. DIRECT IMPORT DRAWER */}
          {activeDrawer === 'import' && (
            <div className="w-[620px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-5 py-4 border-b border-[#e3e8ee] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">Import</h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    Upload a CSV or JSON file to register SIM cards directly into inventory.
                  </p>
                </div>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-lg text-[#5c6b7a] hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <DirectBulkUploadView
                  status={simUpload.status}
                  progress={simUpload.progress}
                  fileLabel={simUpload.fileLabel}
                  fileMeta={simUpload.fileMeta}
                  errorMessage={simUpload.errorMessage}
                  doneSummary={simUpload.doneSummary}
                  accept=".csv,.json,text/csv,application/json"
                  dropTitle="Choose CSV / JSON or drag & drop"
                  dropSubtitle="Every ICCID must be 18–22 ASCII digits and unique."
                  chooseButtonLabel="Choose file"
                  downloadLabel="Download template"
                  sampleLabel="Use sample CSV"
                  templateTitle="Need a starting format?"
                  templateSubtitle="Download CSV template or upload a sample SIM record."
                  doneButtonLabel="Done"
                  onFileSelected={(file) => {
                    const lower = file.name.toLowerCase();
                    if (!lower.endsWith('.csv') && !lower.endsWith('.json')) {
                      simUpload.fail('Please upload a .csv or .json file.');
                      return;
                    }
                    const fmt: 'csv' | 'json' = lower.endsWith('.json') ? 'json' : 'csv';
                    const reader = new FileReader();
                    reader.onload = (ev) =>
                      processSimsUpload(fmt, String(ev.target?.result || ''), file.name, file.size);
                    reader.onerror = () => simUpload.fail('Unable to read the selected file.');
                    reader.readAsText(file);
                  }}
                  onDownloadTemplate={() => {
                    const sampleOrg = isPlatformAdmin
                      ? filterOwner !== 'All'
                        ? filterOwner
                        : availableOrganizations[0] || ''
                      : currentCompany;
                    const sampleModel =
                      getEnabledModelsForCompanyName(sampleOrg).find((m) => m.category === 'SIM') ||
                      enabledSimModels[0];
                    const csv =
                      'ICCID,Mobile number,Operator,Plan / package,Form factor,Owner / customer,Inventory location,Lifecycle,Category,Model reference\n' +
                      `89918610431299912345,,${sampleModel?.manufacturer || ''},IoT Business 10GB,${sampleModel?.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)'},${sampleOrg},,Inventory,${sampleModel?.typeName || ''},${sampleModel?.modelReference || ''}`;
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'fleetrobo_sims_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  onUseSample={() => {
                    const sampleOrg = isPlatformAdmin
                      ? filterOwner !== 'All'
                        ? filterOwner
                        : availableOrganizations[0] || ''
                      : currentCompany;
                    const sampleModel =
                      getEnabledModelsForCompanyName(sampleOrg).find((m) => m.category === 'SIM') ||
                      enabledSimModels[0];
                    if (!sampleModel || !sampleOrg) {
                      simUpload.fail(
                        'No active SIM model is enabled for the selected organization.'
                      );
                      return;
                    }
                    const suffix = Math.floor(10000 + Math.random() * 89999);
                    const idTypes = getRecordIdentifierTypes(sampleModel);
                    const idType = idTypes[0] || 'ICCID';
                    const samplePrimary =
                      idType === 'EID'
                        ? `890490320010010000000000000${suffix}`
                        : idType === 'IMSI'
                        ? `4041010000${suffix}`
                        : `899186104312999${suffix}`;
                    const sampleCsv =
                      `ICCID,Mobile number,Operator,Plan / package,Form factor,Owner / customer,Inventory location,Lifecycle,Category,Model reference,Identifier type\n` +
                      `${samplePrimary},,${sampleModel.manufacturer},IoT Business 10GB,${sampleModel.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)'},${sampleOrg},,Inventory,${sampleModel.typeName},${sampleModel.modelReference || ''},${idType}`;
                    processSimsUpload('csv', sampleCsv, `sample_sims_${suffix}.csv`, sampleCsv.length);
                  }}
                  onReset={simUpload.reset}
                  onDone={() => setActiveDrawer(null)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upgraded Sectional Filter SIM Inventory Right-Side Drawer */}
      <SimFilterDrawer
        isOpen={activeDrawer === 'filters'}
        onClose={() => setActiveDrawer(null)}
        appliedFilters={effectiveAdvancedFilters}
        onApplyFilters={handleApplyAdvancedFilters}
        authorizedSims={authorizedSims}
        enabledSimModels={enabledSimModels}
        effectiveStatusById={effectiveStatusById}
        assignmentById={assignmentById}
        isPlatformAdmin={isPlatformAdmin}
      />

      {/* Upgraded Sectional Bulk Operations · SIM Master Right-Side Drawer */}
      <SimBulkDrawer
        isOpen={activeDrawer === 'bulk'}
        isPlatformAdmin={isPlatformAdmin}
        selectedRecords={selectedSimRecords}
        store={store}
        effectiveStatusById={effectiveStatusById}
        availableLocations={availableLocations}
        availableOrganizations={availableOrganizations}
        onClose={() => setActiveDrawer(null)}
        onClearSelection={() => setSelectedIds(new Set())}
        onExportSelected={handleBulkExportSelected}
        onApplyBulkUpdate={handleApplySimBulkUpdate}
      />

      {/* Delete SIM Confirmation Modal (blocks active, scheduled, AND historical mapping references) */}
      {(() => {
        if (!simToDelete) return null;
        const refs = getSimMappingReferences(simToDelete.id, store);
        const effStatus =
          effectiveStatusById.get(simToDelete.id) ||
          deriveSimEffectiveInventoryStatus(simToDelete, store);
        return (
          <DeleteConfirmationModal
            isOpen={Boolean(simToDelete)}
            title="Delete SIM Card?"
            description={
              <>
                Are you sure you want to delete SIM{' '}
                <strong className="text-slate-900 font-semibold font-mono">{simToDelete.iccid}</strong>{' '}
                ({simToDelete.operator} · {simToDelete.plan})? This SIM record will be permanently
                removed.
              </>
            }
            confirmLabel={refs.hasAnyReference ? 'Deletion Blocked' : 'Delete SIM'}
            confirmDisabled={refs.hasAnyReference}
            targetChips={[
              { id: 'iccid', label: simToDelete.iccid, tone: 'orange' },
              {
                id: 'operator',
                label: simToDelete.operator,
                sublabel: simToDelete.plan,
                tone: 'blue',
              },
              { id: 'org', label: simToDelete.owner, tone: 'purple' },
              {
                id: 'status',
                label: effStatus,
                tone: effStatus === 'Active' ? 'emerald' : effStatus === 'Suspended' ? 'amber' : 'slate',
              },
            ]}
            confirmationChips={[
              refs.hasActiveOrScheduledReference
                ? {
                    id: 'assign-check',
                    label: `Blocked · ${refs.activeOrScheduledConnections.length} Active/Scheduled Mapping(s)`,
                    tone: 'rose',
                  }
                : refs.hasAnyReference
                ? {
                    id: 'assign-check',
                    label: `Blocked · ${refs.allConnections.length || refs.allBindings.length || refs.allSimAssignments.length} Historical Mapping Reference(s)`,
                    tone: 'amber',
                  }
                : {
                    id: 'assign-check',
                    label: 'Safe to Delete · No Asset Mapping References',
                    tone: 'emerald',
                  },
              {
                id: 'scope',
                label: 'Permanent SIM Removal',
                tone: 'rose',
              },
            ]}
            warningNote={
              refs.hasAnyReference ? (
                <>
                  This SIM is referenced in Asset Mapping (
                  <strong>
                    {refs.allConnections.map((c) => c.connectionId || c.id).join(', ') ||
                      refs.allSimAssignments.map((sa) => sa.connectionId).join(', ') ||
                      'binding/assignment history'}
                  </strong>
                  ) and cannot be deleted. End any active mappings and set carrier lifecycle to{' '}
                  <strong>Retired</strong> instead to preserve historical audit records.
                </>
              ) : undefined
            }
            onCancel={() => setSimToDelete(null)}
            onConfirm={handleConfirmDeleteSim}
          />
        );
      })()}
    </div>
  );
};
