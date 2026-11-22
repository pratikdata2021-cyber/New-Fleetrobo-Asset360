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
  SIM_COLUMNS,
  MODAL_OWNERS,
  MODAL_LOCATIONS,
  SIM_LIFECYCLE_OPTIONS,
  SIM_OPERATORS,
  SIM_PLANS,
  SIM_FORM_FACTORS,
  MODAL_FIELD_TOOLTIPS,
  SavedModalView,
  loadModalMasterStore,
  saveModalMasterStore,
  loadSavedModalViews,
  saveSavedModalViews,
  downloadModalCsv,
  parseCsvLine
} from '../types/modalMaster';
import {
  getEnabledModelsForCompanyName,
  getAvailableClientCompanies
} from '../types/companyModelEnablement';
import { getRecordIdentifierTypes } from '../types/modelCategoryMaster';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';

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

  // Model access sync from Binary Platform Admin -> Company Management
  const [modelAccessTick, setModelAccessTick] = useState(0);
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
    return () => {
      window.removeEventListener('fleetrobo:model-access-updated', handleSync);
      window.removeEventListener('fleetrobo:modal-store-updated', handleStoreSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('storage', handleStoreSync);
    };
  }, []);

  const isPlatformAdmin = currentCompany === 'Platform Admin' || currentCompany === 'Binary';
  const availableOrganizations = useMemo(() => {
    void modelAccessTick;
    return getAvailableClientCompanies();
  }, [modelAccessTick]);

  // Toolbar & Table states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOperator, setFilterOperator] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterOwner, setFilterOwner] = useState<string>('All');

  useEffect(() => {
    setFilterOwner('All');
  }, [currentCompany]);

  // Enabled SIM models for the active company (or selected Organization filter in Platform Admin)
  const enabledSimModels = useMemo(() => {
    const scopeCompany = isPlatformAdmin && filterOwner !== 'All' ? filterOwner : currentCompany;
    return getEnabledModelsForCompanyName(scopeCompany).filter(
      (m) => m.category === 'SIM'
    );
  }, [currentCompany, isPlatformAdmin, filterOwner, modelAccessTick]);

  const enabledSimCategories = useMemo<string[]>(() => {
    const cats = Array.from(new Set(enabledSimModels.map((m) => m.typeName)));
    return cats.length > 0 ? cats : ['M2M SIM', 'Standard SIM', 'IoT eSIM'];
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

  // Inspector state
  const [inspectedSim, setInspectedSim] = useState<(SimRecord & { assigned: string; connection: string }) | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'linked' | 'activity'>('overview');

  // Form state (Create / Edit SIM)
  const [editingSim, setEditingSim] = useState<SimRecord | null>(null);
  const [formIccid, setFormIccid] = useState('');
  const [formSimId, setFormSimId] = useState('');
  const [formMsisdn, setFormMsisdn] = useState('');
  const [formCategory, setFormCategory] = useState<string>(
    () => enabledSimCategories[0] || 'M2M SIM'
  );
  const [formOperator, setFormOperator] = useState<string>(
    () => enabledSimModels[0]?.manufacturer || 'Airtel'
  );
  const [formModelRef, setFormModelRef] = useState<string>(
    () => enabledSimModels[0]?.modelReference || ''
  );
  const [formPlan, setFormPlan] = useState<string>('IoT Business 10GB');
  const [formFormFactor, setFormFormFactor] = useState<SimRecord['formFactor']>('Nano (4FF)');
  const [formMode, setFormMode] = useState('M2M');
  const [formStatus, setFormStatus] = useState<SimLifecycleStatus>('Active');
  const [formActivationDate, setFormActivationDate] = useState('');
  const [formRenewalDate, setFormRenewalDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIdentifierType, setFormIdentifierType] = useState('ICCID');
  const [formOwner, setFormOwner] = useState(() =>
    currentCompany && currentCompany !== 'Platform Admin' && currentCompany !== 'Binary'
      ? currentCompany
      : availableOrganizations[0] || MODAL_OWNERS[0]
  );
  const [formError, setFormError] = useState<string | null>(null);

  const effectiveFormOwner = isPlatformAdmin
    ? formOwner || availableOrganizations[0] || 'Adani Mundra'
    : currentCompany;

  const formEnabledSimModels = useMemo(() => {
    return getEnabledModelsForCompanyName(effectiveFormOwner).filter(
      (m) => m.category === 'SIM'
    );
  }, [effectiveFormOwner, modelAccessTick]);

  const formEnabledSimCategories = useMemo<string[]>(() => {
    const cats = Array.from(new Set(formEnabledSimModels.map((m) => m.typeName)));
    return cats.length > 0 ? cats : ['M2M SIM', 'Standard SIM', 'IoT eSIM'];
  }, [formEnabledSimModels]);

  // Saved view creation state
  const [newViewName, setNewViewName] = useState('');

  // Bulk operation state
  const [bulkAction, setBulkAction] = useState<
    'Update owner' | 'Update lifecycle' | 'Update plan' | 'Retire eligible' | 'Delete eligible'
  >('Update owner');
  const [bulkTargetOwner, setBulkTargetOwner] = useState(MODAL_OWNERS[0]);
  const [bulkTargetLifecycle, setBulkTargetLifecycle] = useState<SimLifecycleStatus>('Active');
  const [bulkTargetPlan, setBulkTargetPlan] = useState<SimRecord['plan']>('IoT Business 10GB');
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);

  // Direct upload state
  const simUpload = useDirectUploadState(activeDrawer === 'import');

  useEffect(() => {
    saveSavedModalViews(savedViews);
  }, [savedViews]);

  // Derived options based on selected SIM category
  const modelsForSelectedCategory = useMemo(() => {
    return formEnabledSimModels.filter((m) => m.typeName === formCategory);
  }, [formEnabledSimModels, formCategory]);

  const availableOperators = useMemo<string[]>(() => {
    if (modelsForSelectedCategory.length > 0) {
      return Array.from(new Set(modelsForSelectedCategory.map((m) => m.manufacturer)));
    }
    return SIM_OPERATORS;
  }, [modelsForSelectedCategory]);

  const modelsForSelectedOperator = useMemo(() => {
    return modelsForSelectedCategory.filter((m) => m.manufacturer === formOperator);
  }, [modelsForSelectedCategory, formOperator]);

  const selectedSimModelSpec = useMemo(() => {
    if (editingSim?.modelTypeId) {
      const byId = modelsForSelectedCategory.find(
        (m) => m.id === editingSim.modelTypeId && m.manufacturer === formOperator
      );
      if (byId && (!formModelRef || byId.modelReference === formModelRef)) {
        return byId;
      }
    }
    return (
      modelsForSelectedCategory.find(
        (m) =>
          m.manufacturer === formOperator &&
          (!formModelRef || m.modelReference === formModelRef)
      ) ||
      modelsForSelectedCategory.find((m) => m.manufacturer === formOperator) ||
      modelsForSelectedCategory[0] ||
      formEnabledSimModels[0] ||
      null
    );
  }, [modelsForSelectedCategory, formOperator, formModelRef, formEnabledSimModels, editingSim]);

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
    if (formEnabledSimModels.length > 0) {
      const first = formEnabledSimModels.find((m) => m.typeName === formCategory) || formEnabledSimModels[0];
      setFormCategory(first.typeName);
      setFormOperator(first.manufacturer);
      setFormModelRef(first.modelReference || '');
      setFormMode(first.simType || 'M2M');
      setFormFormFactor(first.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)');
    }
  }, [effectiveFormOwner, formEnabledSimModels, editingSim]);

  // Active assignment lookup map by simId
  const activeAssignmentBySimId = useMemo(() => {
    const map = new Map<string, { hardwareName: string; connectionId: string }>();
    store.simAssignments.forEach((sa) => {
      if (!sa.end) {
        map.set(sa.simId, {
          hardwareName: sa.hardwareName,
          connectionId: sa.connectionId
        });
      }
    });
    return map;
  }, [store.simAssignments]);

  // Enriched SIM rows with computed `assigned` and `connection`
  const enrichedSims = useMemo(() => {
    return store.sims.map((sim) => {
      const active = activeAssignmentBySimId.get(sim.id);
      return {
        ...sim,
        assigned: active ? active.hardwareName : 'Unassigned',
        connection: active ? active.connectionId : '—'
      };
    });
  }, [store.sims, activeAssignmentBySimId]);

  // Open Create SIM Form
  const handleOpenCreate = () => {
    setEditingSim(null);
    const targetOrg = isPlatformAdmin
      ? filterOwner !== 'All'
        ? filterOwner
        : availableOrganizations[0] || MODAL_OWNERS[0]
      : currentCompany || MODAL_OWNERS[0];
    const targetModels = getEnabledModelsForCompanyName(targetOrg).filter(
      (m) => m.category === 'SIM'
    );
    const nextNum = 1000 + store.sims.length;
    const firstEnabled = targetModels[0] || enabledSimModels[0];
    const cat = firstEnabled ? firstEnabled.typeName : 'M2M SIM';
    const op = firstEnabled ? firstEnabled.manufacturer : 'Airtel';
    const modelRef = firstEnabled?.modelReference || '';
    const modeVal = firstEnabled ? firstEnabled.simType || 'M2M' : 'M2M';
    const ffVal: SimRecord['formFactor'] = firstEnabled?.simFormFactor === 'eSIM' ? 'eSIM' : 'Nano (4FF)';
    const firstIds = getRecordIdentifierTypes(firstEnabled);
    const idType = firstIds[0] || 'ICCID';

    const nextSuffix = (store.sims.length + 1).toString().padStart(5, '0');
    setFormOwner(targetOrg);
    setFormIdentifierType(idType);
    setFormIccid(idType === 'ICCID' ? `899186104312451${nextSuffix}` : '');
    setFormSimId(`SIM-rt-${Date.now()}`);
    setFormMsisdn('');
    setFormCategory(cat);
    setFormOperator(op);
    setFormModelRef(modelRef);
    setFormPlan(op === 'Jio' ? 'Enterprise M2M 2GB' : 'IoT Business 10GB');
    setFormFormFactor(ffVal);
    setFormMode(modeVal);
    setFormStatus('Active');
    setFormActivationDate(new Date().toISOString().slice(0, 10));
    setFormRenewalDate('');
    setFormNotes('');
    setFormError(null);
    setActiveDrawer('form');
  };

  // Open Edit SIM Form
  const handleOpenEdit = (record: SimRecord) => {
    setEditingSim(record);
    setFormOwner(record.owner || availableOrganizations[0] || 'Adani Mundra');
    setFormIccid(record.iccid);
    setFormSimId(record.id);
    setFormMsisdn(record.msisdn);
    const cat = record.category || (record.formFactor === 'eSIM' ? 'IoT eSIM' : record.plan.includes('M2M') ? 'M2M SIM' : 'Standard SIM');
    const matchedModel = enabledSimModels.find((m) => m.id === record.modelTypeId);
    const modelIds = getRecordIdentifierTypes(matchedModel);
    setFormIdentifierType(record.identifierType || modelIds[0] || 'ICCID');
    setFormCategory(cat);
    setFormFormFactor(record.formFactor);
    setFormOperator(record.operator);
    setFormModelRef(matchedModel?.modelReference || '');
    setFormPlan(record.plan);
    setFormMode(matchedModel?.simType || (record.plan.includes('M2M') ? 'M2M' : 'Standard'));
    setFormStatus(record.status);
    setFormActivationDate(record.activationDate);
    setFormRenewalDate(record.renewalDate);
    setFormNotes(record.notes);
    setFormError(null);
    setActiveDrawer('form');
  };

  // Save SIM (Create or Edit)
  const handleSaveSim = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedPrimaryId = formIccid.trim();

    if (!trimmedPrimaryId) {
      setFormError(`${activeIdentifierType} is required.`);
      return;
    }

    if (
      activeIdentifierType.trim().toUpperCase() === 'ICCID' &&
      !/^\d{18,22}$/.test(trimmedPrimaryId)
    ) {
      setFormError('ICCID must be 18–22 digits.');
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

    if (editingSim) {
      const updatedRecord: SimRecord = {
        ...editingSim,
        id: editingSim.id,
        iccid: trimmedPrimaryId,
        msisdn: formMsisdn.trim(),
        formFactor: formFormFactor,
        operator: formOperator,
        plan: formPlan,
        owner: isPlatformAdmin
          ? formOwner || availableOrganizations[0] || 'Adani Mundra'
          : currentCompany || editingSim.owner,
        status: formStatus,
        activationDate: formActivationDate,
        renewalDate: formRenewalDate,
        notes: formNotes.trim(),
        category: formCategory,
        modelTypeId: selectedSimModelSpec?.id || editingSim.modelTypeId,
        identifierType: activeIdentifierType
      };
      setStore((prev) => ({
        ...prev,
        sims: prev.sims.map((s) => (s.id === editingSim.id ? updatedRecord : s))
      }));
      showToast(`SIM (${activeIdentifierType}: ${trimmedPrimaryId}) updated.`);
    } else {
      const generatedRecordId = formSimId.trim() && !store.sims.some((s) => s.id === formSimId.trim())
        ? formSimId.trim()
        : `SIM-rt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newRecord: SimRecord = {
        id: generatedRecordId,
        iccid: trimmedPrimaryId,
        msisdn:
          activeIdentifierType.trim().toUpperCase() === 'MSISDN' && !formMsisdn.trim()
            ? trimmedPrimaryId
            : formMsisdn.trim(),
        operator: formOperator,
        plan: formPlan,
        formFactor: formFormFactor,
        network: '4G LTE',
        owner: isPlatformAdmin
          ? formOwner || availableOrganizations[0] || 'Adani Mundra'
          : currentCompany || 'Adani Mundra',
        location: '',
        status: formStatus,
        activationDate: formActivationDate,
        renewalDate: formRenewalDate,
        notes: formNotes.trim(),
        category: formCategory,
        modelTypeId: selectedSimModelSpec?.id,
        identifierType: activeIdentifierType
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
    const companyTarget = currentCompany && currentCompany !== 'Platform Admin' && currentCompany !== 'Binary' ? currentCompany.trim().toLowerCase() : null;
    return enrichedSims.filter((s) => {
      if (companyTarget && (s.owner || '').trim().toLowerCase() !== companyTarget) return false;
      if (filterOperator !== 'All' && s.operator !== filterOperator) return false;
      if (filterCategory !== 'All') {
        const cat = s.category || (s.formFactor === 'eSIM' ? 'IoT eSIM' : s.plan.includes('M2M') ? 'M2M SIM' : 'Standard SIM');
        if (cat !== filterCategory) return false;
      }
      if (filterStatus !== 'All' && s.status !== filterStatus) return false;
      if (filterOwner !== 'All' && s.owner !== filterOwner) return false;
      if (q) {
        const hay = [
          s.id,
          s.iccid,
          s.msisdn,
          s.category || '',
          s.operator,
          s.plan,
          s.formFactor,
          s.owner,
          s.location,
          s.status,
          s.assigned,
          s.connection
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedSims, currentCompany, searchQuery, filterOperator, filterCategory, filterStatus, filterOwner]);

  const sortedSims = useMemo(() => {
    if (!sortKey) return filteredSims;
    const copy = [...filteredSims];
    copy.sort((a, b) => {
      const av = String((a as any)[sortKey] ?? '').toLowerCase();
      const bv = String((b as any)[sortKey] ?? '').toLowerCase();
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

  const activeFilterCount =
    (filterOperator !== 'All' ? 1 : 0) +
    (filterStatus !== 'All' ? 1 : 0) +
    (filterOwner !== 'All' ? 1 : 0);

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
  const openInspector = (rec: SimRecord & { assigned: string; connection: string }) => {
    setInspectedSim(rec);
    setInspectorTab('overview');
    setActiveDrawer('inspector');
  };

  const [simToDelete, setSimToDelete] = useState<SimRecord | null>(null);

  const handleConfirmDeleteSim = () => {
    if (!simToDelete) return;
    const idToDelete = simToDelete.id;
    setStore((prev) => ({
      ...prev,
      sims: prev.sims.filter((s) => s.id !== idToDelete),
    }));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(idToDelete);
      return next;
    });
    showToast(`SIM "${simToDelete.iccid}" (${simToDelete.operator}) deleted successfully`);
    setSimToDelete(null);
    if (inspectedSim?.id === idToDelete) {
      setActiveDrawer(null);
      setInspectedSim(null);
    }
  };

  // Bulk eligibility calculation
  const selectedSimRecords = useMemo(
    () => enrichedSims.filter((s) => selectedIds.has(s.id)),
    [enrichedSims, selectedIds]
  );

  const bulkEligibility = useMemo(() => {
    const eligible: (SimRecord & { assigned: string; connection: string })[] = [];
    const skipped: {
      record: SimRecord & { assigned: string; connection: string };
      reason: string;
    }[] = [];

    selectedSimRecords.forEach((sim) => {
      if (bulkAction === 'Retire eligible' || bulkAction === 'Delete eligible') {
        const hasOpenAssignment = activeAssignmentBySimId.has(sim.id);
        if (hasOpenAssignment) {
          skipped.push({
            record: sim,
            reason: `Currently assigned to ${sim.assigned} (${sim.connection})`
          });
        } else {
          eligible.push(sim);
        }
      } else {
        eligible.push(sim);
      }
    });

    return { eligible, skipped };
  }, [selectedSimRecords, bulkAction, activeAssignmentBySimId]);

  const executeBulkDeleteSims = (reason?: string) => {
    const eligibleIds = new Set(bulkEligibility.eligible.map((s) => s.id));
    if (eligibleIds.size === 0) return;

    setStore((prev) => ({
      ...prev,
      sims: prev.sims.filter((s) => !eligibleIds.has(s.id))
    }));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      eligibleIds.forEach((id) => next.delete(id));
      return next;
    });
    if (inspectedSim && eligibleIds.has(inspectedSim.id)) {
      setInspectedSim(null);
    }
    showToast(
      `Deleted ${eligibleIds.size} SIM card(s)${bulkEligibility.skipped.length > 0 ? `, ${bulkEligibility.skipped.length} skipped` : ''}${reason ? ` · ${reason}` : ''}`
    );
    setPendingBulkDelete(false);
    setActiveDrawer(null);
  };

  const handleApplyBulk = () => {
    if (selectedSimRecords.length === 0) return;
    if (bulkAction === 'Delete eligible') {
      if (bulkEligibility.eligible.length === 0) return;
      setPendingBulkDelete(true);
      return;
    }
    const eligibleIds = new Set(bulkEligibility.eligible.map((s) => s.id));

    setStore((prev) => ({
      ...prev,
      sims: prev.sims.map((s) => {
        if (!eligibleIds.has(s.id)) return s;
        if (bulkAction === 'Update owner') {
          return { ...s, owner: bulkTargetOwner };
        }
        if (bulkAction === 'Update lifecycle') {
          return { ...s, status: bulkTargetLifecycle };
        }
        if (bulkAction === 'Update plan') {
          return { ...s, plan: bulkTargetPlan };
        }
        if (bulkAction === 'Retire eligible') {
          return { ...s, status: 'Retired' };
        }
        return s;
      })
    }));

    showToast(
      `Bulk action completed: ${bulkEligibility.eligible.length} updated, ${bulkEligibility.skipped.length} skipped.`
    );
    setActiveDrawer(null);
  };

  // Direct CSV/JSON upload execution
  const processSimsUpload = (fmt: 'csv' | 'json', rawText: string, fileName: string, fileSize?: number) => {
    const raw = rawText.trim();
    if (!raw) {
      simUpload.fail('Uploaded file is empty.');
      return;
    }

    const valid: Partial<SimRecord>[] = [];
    const invalid: { line: number; reason: string }[] = [];
    const seenIccids = new Set(store.sims.map((s) => s.iccid));

    if (fmt === 'json') {
      try {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        arr.forEach((item, idx) => {
          const iccid = String(item.iccid || '').trim();
          if (!/^\d{18,22}$/.test(iccid)) {
            invalid.push({
              line: idx + 1,
              reason: `ICCID "${iccid}" must be 18–22 ASCII digits`
            });
            return;
          }
          if (seenIccids.has(iccid)) {
            invalid.push({
              line: idx + 1,
              reason: `Duplicate ICCID (${iccid})`
            });
            return;
          }
          seenIccids.add(iccid);
          valid.push({
            iccid,
            msisdn: item.msisdn || '',
            operator: SIM_OPERATORS.includes(item.operator) ? item.operator : 'Airtel',
            plan: SIM_PLANS.includes(item.plan) ? item.plan : 'IoT Business 10GB',
            formFactor: SIM_FORM_FACTORS.includes(item.formFactor)
              ? item.formFactor
              : 'Nano (4FF)',
            owner: item.owner || 'Adani Port',
            location: item.location || 'Mundra CT2',
            status: SIM_LIFECYCLE_OPTIONS.includes(item.status) ? item.status : 'Inventory',
            activationDate: item.activationDate || '',
            renewalDate: item.renewalDate || ''
          });
        });
      } catch {
        simUpload.fail('Invalid JSON syntax.');
        return;
      }
    } else {
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      lines.forEach((line, idx) => {
        const cols = parseCsvLine(line);
        if (idx === 0 && cols[0]?.toLowerCase().includes('iccid')) {
          return;
        }
        const [iccid, msisdn, operator, plan, formFactor, owner, location, status] = cols;
        if (!iccid || !/^\d{18,22}$/.test(iccid)) {
          invalid.push({
            line: idx + 1,
            reason: `ICCID "${iccid || ''}" must be 18–22 ASCII digits`
          });
          return;
        }
        if (seenIccids.has(iccid)) {
          invalid.push({
            line: idx + 1,
            reason: `Duplicate ICCID (${iccid})`
          });
          return;
        }
        seenIccids.add(iccid);
        valid.push({
          iccid,
          msisdn: msisdn || '',
          operator: (SIM_OPERATORS.includes(operator as SimRecord['operator']) ? operator : 'Airtel') as SimRecord['operator'],
          plan: (SIM_PLANS.includes(plan as SimRecord['plan']) ? plan : 'IoT Business 10GB') as SimRecord['plan'],
          formFactor: (SIM_FORM_FACTORS.includes(formFactor as SimRecord['formFactor'])
            ? formFactor
            : 'Nano (4FF)') as SimRecord['formFactor'],
          owner: owner || 'Adani Port',
          location: location || 'Mundra CT2',
          status: (SIM_LIFECYCLE_OPTIONS.includes(status as SimLifecycleStatus)
            ? status
            : 'Inventory') as SimLifecycleStatus
        });
      });
    }

    if (valid.length === 0) {
      simUpload.fail(
        invalid[0]?.reason || 'No valid new SIM rows found (invalid ICCID or duplicates).'
      );
      return;
    }

    simUpload.startUploading(fileName, formatUploadFileSize(fileSize), () => {
      const created: SimRecord[] = valid.map((v, i) => ({
        id: `SIM-imp-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        iccid: v.iccid!,
        msisdn: v.msisdn || '',
        operator: v.operator || 'Airtel',
        plan: v.plan || 'IoT Business 10GB',
        formFactor: v.formFactor || 'Nano (4FF)',
        network: '4G LTE',
        owner: v.owner || 'Adani Port',
        location: v.location || 'Mundra CT2',
        status: v.status || 'Inventory',
        activationDate: v.activationDate || '',
        renewalDate: v.renewalDate || '',
        notes: 'Imported via bulk CSV/JSON'
      }));

      setStore((prev) => ({
        ...prev,
        sims: [...created, ...prev.sims]
      }));
      setSortKey('');
      setCurrentPage(1);
      showToast(`Imported ${created.length} SIM(s) (${invalid.length} skipped).`);
      return {
        headline: 'SIM cards uploaded successfully',
        description: `${created.length} SIM record${created.length === 1 ? '' : 's'} imported from ${fileName}.${
          invalid.length > 0 ? ` ${invalid.length} duplicate or invalid row${invalid.length === 1 ? '' : 's'} skipped.` : ''
        }`,
        stats: [
          { label: 'Uploaded', value: created.length, tone: 'emerald' },
          { label: 'Skipped', value: invalid.length, tone: invalid.length > 0 ? 'amber' : 'slate' }
        ]
      };
    });
  };

  // Lifecycle pill styling
  const renderSimStatusBadge = (status: SimLifecycleStatus) => {
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

  // Linked assignment events for inspected SIM
  const inspectedSimEvents = useMemo(() => {
    if (!inspectedSim) return [];
    return store.simAssignments.filter((sa) => sa.simId === inspectedSim.id);
  }, [inspectedSim, store.simAssignments]);

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
                    setFilterOwner(e.target.value);
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
                setFilterOperator('All');
                setFilterStatus('All');
                setFilterOwner('All');
                setSelectedIds(new Set());
                setCurrentPage(1);
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
                downloadModalCsv('FleetRobo_sims_export.csv', visibleColumns, sortedSims);
                showToast(`Exported ${sortedSims.length} SIM records to FleetRobo_sims_export.csv`);
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
                onClick={() => {
                  setFilterOperator('All');
                  setFilterStatus('All');
                  setFilterOwner('All');
                }}
                className="text-[#9e431c] hover:underline font-medium cursor-pointer"
              >
                Clear active filters ({activeFilterCount})
              </button>
            )}
          </div>

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
                                  {renderSimStatusBadge(row.status)}
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
      {activeDrawer && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/35 backdrop-blur-[1px]">
          <div className="flex-1" onClick={() => setActiveDrawer(null)} />

          {/* 1. FILTERS DRAWER */}
          {activeDrawer === 'filters' && (
            <div className="w-[520px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-5 py-4 border-b border-[#e3e8ee] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">Filter SIM Inventory</h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    Filter registered SIM cards by network operator, lifecycle state, or customer owner.
                  </p>
                </div>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1.5 rounded-lg text-[#5c6b7a] hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                    Operator
                  </label>
                  <select
                    value={filterOperator}
                    onChange={(e) => {
                      setFilterOperator(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                  >
                    <option value="All">All</option>
                    <option value="Airtel">Airtel</option>
                    <option value="Jio">Jio</option>
                    <option value="Vi">Vi</option>
                    <option value="BSNL">BSNL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                    Lifecycle
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                  >
                    <option value="All">All</option>
                    {SIM_LIFECYCLE_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                    Organization Name
                  </label>
                  <select
                    value={filterOwner}
                    onChange={(e) => {
                      setFilterOwner(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] text-[#17212b] focus:outline-none focus:border-[#e56b38]"
                  >
                    <option value="All">All Organizations</option>
                    {availableOrganizations.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-[#e3e8ee] bg-[#f8fafc] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setFilterOperator('All');
                    setFilterStatus('All');
                    setFilterOwner('All');
                    setCurrentPage(1);
                  }}
                  className="px-3.5 py-2 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#5c6b7a] hover:text-[#17212b] cursor-pointer"
                >
                  Reset filters
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="px-4 py-2 rounded-[7px] bg-[#e56b38] hover:bg-[#d15b2a] text-white text-[12px] font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

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
                            operator: filterOperator,
                            status: filterStatus,
                            owner: filterOwner
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
                            Query: {view.query || 'None'} · Sort: {view.sortKey} ({view.sortDir})
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSearchQuery(view.query || '');
                              setFilterOperator(view.filters.operator || 'All');
                              setFilterStatus(view.filters.status || 'All');
                              setFilterOwner(view.filters.owner || 'All');
                              setSortKey(view.sortKey || 'iccid');
                              setSortDir(view.sortDir || 'asc');
                              setHiddenCols(view.hiddenCols || []);
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
                    {renderSimStatusBadge(inspectedSim.status)}
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
                  Linked records ({inspectedSimEvents.length})
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
                        ['SIM Category', inspectedSim.category || (inspectedSim.formFactor === 'eSIM' ? 'IoT eSIM' : inspectedSim.plan.includes('M2M') ? 'M2M SIM' : 'Standard SIM')],
                        ['Operator', inspectedSim.operator],
                        ['Plan / package', inspectedSim.plan],
                        ['Form factor', inspectedSim.formFactor],
                        ['Network', inspectedSim.network],
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
                      {inspectedSimEvents.length === 0 ? (
                        <div className="p-4 rounded-lg border border-[#e3e8ee] text-[12px] text-[#5c6b7a]">
                          This SIM is currently in warehouse inventory with no assignment history.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {inspectedSimEvents.slice(0, 32).map((ev) => (
                            <div
                              key={ev.id}
                              className="p-3 rounded-lg border border-[#e3e8ee] flex items-center justify-between text-[12px]"
                            >
                              <div>
                                <div className="font-semibold text-[#17212b]">
                                  {ev.connectionId} · {ev.hardwareName}
                                </div>
                                <div className="text-[11px] text-[#5c6b7a]">
                                  Effective: {ev.start} → {ev.end || 'Present'}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  !ev.end
                                    ? 'bg-[#eaf8f0] text-[#0f7b4b]'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {!ev.end ? 'Assigned' : 'Ended'}
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
                    {inspectedSimEvents.length === 0 ? (
                      <div className="p-6 text-center rounded-lg border border-[#e3e8ee] text-[12px] text-[#5c6b7a]">
                        No linked connections or assignment events for this SIM.
                      </div>
                    ) : (
                      inspectedSimEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3.5 rounded-lg border border-[#e3e8ee] bg-white space-y-1.5 text-[12px]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold font-mono text-[#17212b]">
                              {ev.connectionId}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                !ev.end
                                  ? 'bg-[#eaf8f0] text-[#0f7b4b]'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {!ev.end ? 'Assigned' : 'Ended'}
                            </span>
                          </div>
                          <div className="text-[#17212b] font-medium">{ev.hardwareName}</div>
                          <div className="text-[11px] text-[#5c6b7a]">
                            Effective start: {ev.start} · Effective end: {ev.end || '—'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {inspectorTab === 'activity' && (
                  <div className="space-y-3">
                    {[
                      {
                        date: inspectedSim.activationDate || '2026-05-18',
                        title: `Carrier subscription status: ${inspectedSim.status}`,
                        detail: `${inspectedSim.operator} ${inspectedSim.plan} (${inspectedSim.formFactor}) held by ${inspectedSim.owner} at ${inspectedSim.location}.`
                      },
                      ...inspectedSimEvents.map((ev) => ({
                        date: ev.start,
                        title: `SIM assigned to ${ev.connectionId}`,
                        detail: `Linked to ${ev.hardwareName} (${
                          ev.end ? `Ended ${ev.end}` : 'Currently active'
                        }).`
                      }))
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] flex items-start gap-3"
                      >
                        <div className="w-2 h-2 rounded-full bg-[#e56b38] mt-1.5 shrink-0" />
                        <div>
                          <div className="text-[12px] font-semibold text-[#17212b]">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-[#5c6b7a] mt-0.5">{item.detail}</div>
                          <div className="text-[10px] font-mono text-[#8291a0] mt-1">
                            {item.date}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. BULK OPERATIONS DRAWER */}
          {activeDrawer === 'bulk' && (
            <div className="w-[560px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-5 py-4 border-b border-[#e3e8ee] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">
                    Bulk Operations · SIM Master
                  </h2>
                  <p className="text-[12px] text-[#5c6b7a] mt-0.5">
                    {selectedSimRecords.length} SIM record(s) currently selected.
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
                {selectedSimRecords.length === 0 ? (
                  <div className="p-6 rounded-lg border border-[#e3e8ee] bg-[#f8fafc] text-center text-[12px] text-[#5c6b7a]">
                    Select one or more SIM cards in the table first to run a bulk operation.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                        Bulk action
                      </label>
                      <select
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value as any)}
                        className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                      >
                        <option value="Update owner">Update owner</option>
                        <option value="Update lifecycle">Update lifecycle</option>
                        <option value="Update plan">Update plan</option>
                        <option value="Retire eligible">Retire eligible</option>
                        <option value="Delete eligible">Delete eligible</option>
                      </select>
                    </div>

                    {bulkAction === 'Update owner' && (
                      <div>
                        <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                          Target owner / customer
                        </label>
                        <select
                          value={bulkTargetOwner}
                          onChange={(e) => setBulkTargetOwner(e.target.value)}
                          className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                        >
                          {MODAL_OWNERS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {bulkAction === 'Update lifecycle' && (
                      <div>
                        <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                          Target lifecycle
                        </label>
                        <select
                          value={bulkTargetLifecycle}
                          onChange={(e) =>
                            setBulkTargetLifecycle(e.target.value as SimLifecycleStatus)
                          }
                          className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                        >
                          {SIM_LIFECYCLE_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {bulkAction === 'Update plan' && (
                      <div>
                        <label className="block text-[12px] font-semibold text-[#17212b] mb-1.5">
                          Target plan
                        </label>
                        <select
                          value={bulkTargetPlan}
                          onChange={(e) => setBulkTargetPlan(e.target.value as any)}
                          className="w-full h-[36px] px-3 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] focus:outline-none focus:border-[#e56b38]"
                        >
                          {SIM_PLANS.map((pl) => (
                            <option key={pl} value={pl}>
                              {pl}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(bulkAction === 'Retire eligible' || bulkAction === 'Delete eligible') && (
                      <div className="p-3.5 rounded-lg border border-[#fed7aa] bg-[#fff7ed] text-[12px] text-[#b45309]">
                        SIMs with an open assignment (end is blank) in Modal Mapping are protected
                        and automatically skipped during bulk{' '}
                        {bulkAction === 'Delete eligible' ? 'deletion' : 'retirement'}.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-slate-100 text-slate-700">
                        {selectedSimRecords.length} Selected
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                        <CheckCircle2 size={12} /> {bulkEligibility.eligible.length} Eligible
                      </span>
                      {bulkEligibility.skipped.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-200 bg-amber-50 text-amber-800">
                          <AlertTriangle size={12} /> {bulkEligibility.skipped.length} Assigned / Skipped
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border border-[#b9ebd0] bg-[#eaf8f0]">
                        <div className="text-[11px] text-[#0f7b4b] font-semibold">
                          {bulkAction === 'Delete eligible' ? 'Eligible to delete' : 'Eligible to update'}
                        </div>
                        <div className="text-[20px] font-bold text-[#0f7b4b]">
                          {bulkEligibility.eligible.length}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border border-[#fed7aa] bg-[#fff7ed]">
                        <div className="text-[11px] text-[#b45309] font-semibold">
                          Skipped (active assignment)
                        </div>
                        <div className="text-[20px] font-bold text-[#b45309]">
                          {bulkEligibility.skipped.length}
                        </div>
                      </div>
                    </div>

                    {bulkEligibility.skipped.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#5c6b7a]">
                          Skipped SIMs
                        </div>
                        <div className="max-h-[160px] overflow-y-auto divide-y divide-[#edf1f5] border border-[#e3e8ee] rounded-lg">
                          {bulkEligibility.skipped.map(({ record, reason }) => (
                            <div key={record.id} className="px-3 py-2 text-[11px]">
                              <span className="font-mono font-semibold text-[#17212b]">
                                {record.iccid}
                              </span>
                              <span className="text-[#dc2626] ml-1.5">— {reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="px-5 py-3.5 border-t border-[#e3e8ee] bg-[#f8fafc] flex items-center justify-end gap-2">
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="px-4 py-2 rounded-[7px] border border-[#d6dfe8] bg-white text-[12px] font-semibold text-[#5c6b7a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={bulkEligibility.eligible.length === 0}
                  onClick={handleApplyBulk}
                  className={`px-4 py-2 rounded-[7px] disabled:opacity-40 text-white text-[12px] font-semibold cursor-pointer ${
                    bulkAction === 'Delete eligible'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-[#e56b38] hover:bg-[#d15b2a]'
                  }`}
                >
                  {bulkAction === 'Delete eligible'
                    ? `Delete ${bulkEligibility.eligible.length} eligible SIM(s)`
                    : `Apply to ${bulkEligibility.eligible.length} eligible SIM(s)`}
                </button>
              </div>
            </div>
          )}

          {/* 7. DIRECT IMPORT DRAWER */}
          {activeDrawer === 'import' && (
            <div className="w-[620px] max-w-[96vw] h-full bg-white shadow-2xl border-l border-[#e3e8ee] flex flex-col z-50">
              <div className="px-5 py-4 border-b border-[#e3e8ee] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-[#17212b]">Import SIM Cards</h2>
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
                    const csv =
                      'ICCID,Mobile number,Operator,Plan / package,Form factor,Owner / customer,Inventory location,Lifecycle\n' +
                      '89918610431299912345,+91 9810012345,Airtel,IoT Business 10GB,Nano (4FF),Adani Port,Mundra CT2,Inventory';
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'fleetrobo_sims_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  onUseSample={() => {
                    const suffix = Math.floor(10000 + Math.random() * 89999);
                    const sampleCsv =
                      `ICCID,Mobile number,Operator,Plan / package,Form factor,Owner / customer,Inventory location,Lifecycle\n` +
                      `899186104312999${suffix},+91 98100${suffix},Airtel,IoT Business 10GB,Nano (4FF),Adani Port,Mundra CT2,Inventory`;
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

      {/* Delete SIM Confirmation Modal with Confirmation Chips */}
      {(() => {
        if (!simToDelete) return null;
        const activeAssign = activeAssignmentBySimId.get(simToDelete.id);
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
            confirmLabel="Delete SIM"
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
                label: simToDelete.status,
                tone: simToDelete.status === 'Active' ? 'emerald' : 'slate',
              },
            ]}
            confirmationChips={[
              activeAssign
                ? {
                    id: 'assign-check',
                    label: `Assigned in ${activeAssign.connectionId}`,
                    tone: 'amber',
                  }
                : {
                    id: 'assign-check',
                    label: 'Safe to Delete · Unassigned',
                    tone: 'emerald',
                  },
              {
                id: 'scope',
                label: 'Permanent SIM Removal',
                tone: 'rose',
              },
            ]}
            warningNote={
              activeAssign ? (
                <>
                  This SIM currently has an open binding in{' '}
                  <strong>{activeAssign.connectionId}</strong> ({activeAssign.hardwareName}). Removing
                  it will drop it from SIM Master inventory.
                </>
              ) : undefined
            }
            onCancel={() => setSimToDelete(null)}
            onConfirm={handleConfirmDeleteSim}
          />
        );
      })()}

      {/* Bulk Delete SIMs Confirmation Modal with Confirmation Chips */}
      <DeleteConfirmationModal
        isOpen={pendingBulkDelete}
        title={`Delete ${bulkEligibility.eligible.length} Eligible SIM(s)?`}
        description="Permanently remove eligible unassigned SIM cards from inventory. SIMs with open Modal Mapping bindings are automatically skipped."
        confirmLabel={`Confirm Delete (${bulkEligibility.eligible.length})`}
        targetChips={[
          ...bulkEligibility.eligible.slice(0, 5).map((s) => ({
            id: s.id,
            label: s.iccid,
            sublabel: s.operator,
            tone: 'orange' as const,
          })),
          ...(bulkEligibility.eligible.length > 5
            ? [
                {
                  id: 'more-sims',
                  label: `+${bulkEligibility.eligible.length - 5} more`,
                  tone: 'slate' as const,
                },
              ]
            : []),
        ]}
        confirmationChips={[
          {
            id: 'selected',
            label: `${selectedSimRecords.length} Selected`,
            tone: 'slate',
          },
          {
            id: 'eligible',
            label: `${bulkEligibility.eligible.length} Eligible to Delete`,
            tone: 'emerald',
          },
          ...(bulkEligibility.skipped.length > 0
            ? [
                {
                  id: 'skipped',
                  label: `${bulkEligibility.skipped.length} Skipped (Assigned)`,
                  tone: 'amber' as const,
                },
              ]
            : []),
        ]}
        onCancel={() => setPendingBulkDelete(false)}
        onConfirm={executeBulkDeleteSims}
      />
    </div>
  );
};
