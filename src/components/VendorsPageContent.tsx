import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Grid,
  List,
  RefreshCw,
  Bookmark,
  Trash2,
  Upload,
  FileDown,
  Plus,
  MoreHorizontal,
  Info,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Building2,
  Users,
  UserCheck,
  UserPlus,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Eye,
  Plug,
  FileSpreadsheet,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  DirectBulkUploadView,
  formatUploadFileSize,
  useDirectUploadState,
} from './common/DirectBulkUploadView';
import { DeleteConfirmationModal } from './common/DeleteConfirmationModal';
import {
  VendorRecord,
  VendorStatusKey,
  VendorTypeKey,
  VendorCountry,
  AccountRole,
  PersonnelRole,
  PlaceRecord,
  VendorUserAccount,
  ContactRecord,
  VendorSavedView,
  VENDOR_COUNTRIES,
  VENDOR_ACCOUNT_ROLES,
  VENDOR_STATUS_CATALOG,
  VENDOR_TYPE_CATALOG,
  VENDOR_POLICY_CATALOG,
  VENDOR_PERMISSION_CATALOG,
  DEMO_INTEGRATED_PROVIDERS,
  VENDOR_COLUMNS,
  DEFAULT_VISIBLE_VENDOR_COLUMNS,
  VENDOR_TOOLTIPS,
  INITIAL_DEMO_PLACES,
  INITIAL_DEMO_ACCOUNTS,
  INITIAL_DEMO_CONTACTS,
  INITIAL_DEMO_VENDORS,
  SAMPLE_CSV_IMPORT_TEXT,
  VENDOR_CSV_TEMPLATE,
  getVendorTypeLabel,
  getVendorStatusMeta,
  formatEnInDate,
  getInitials,
  getStatesForCountry,
  getCitiesForState,
  migrateVendorListWithCanonicalTransporters,
  syncTransporterRenameAcrossModules,
} from '../data/vendorsSeed';
import { Truck } from 'lucide-react';
import { ColumnCataloguePopover } from './ColumnCataloguePopover';
import { RowActionMenu } from './common/RowActionMenu';

const STORAGE_KEY = 'fleetrobo-vendor-master-v1';

export interface VendorsPageContentProps {
  companyContext?: string;
}

interface StoredVendorMasterState {
  vendors: VendorRecord[];
  places: PlaceRecord[];
  accounts: VendorUserAccount[];
  contacts: ContactRecord[];
  visibleColumns: string[];
  appliedFilters: Record<string, any>;
  filterMode: 'ALL' | 'ANY';
  savedViews: VendorSavedView[];
  layout: 'table' | 'grid';
  sortKey: string;
  sortDir: 1 | -1;
}

// Reusable accessible Info Tooltip component that flips inward near right edges
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
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={text}
        className="w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 hover:text-[#FA8A63] hover:border-[#FA8A63] focus:outline-none focus:ring-1 focus:ring-[#FA8A63] inline-flex items-center justify-center text-[9px] font-bold leading-none transition-colors cursor-pointer bg-white shrink-0"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-[120] bottom-full mb-1.5 w-60 p-2 rounded-lg bg-slate-900 text-white text-[11px] font-normal leading-relaxed shadow-xl border border-slate-700 ${
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

// Status Badge helper
const VendorStatusBadge: React.FC<{ status: VendorStatusKey }> = ({ status }) => {
  const meta = getVendorStatusMeta(status);
  const styles = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const dotStyles = {
    green: 'bg-emerald-500',
    neutral: 'bg-slate-400',
    red: 'bg-rose-500',
    amber: 'bg-amber-500',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${styles[meta.tone]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[meta.tone]}`} />
      {meta.label}
    </span>
  );
};

// CSV line parser supporting quoted fields, escaped quotes, and BOM removal
function parseCsvContent(rawText: string): { headers: string[]; rows: string[][] } {
  const cleaned = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return { headers: [], rows: [] };

  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '"') {
      if (inQuotes && cleaned[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && cleaned[i + 1] === '\n') i++;
      if (current.trim().length > 0) lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) lines.push(current);

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (c === ',' && !quoted) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += c;
      }
    }
    cells.push(cell.trim());
    return cells;
  };

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export const VendorsPageContent: React.FC<VendorsPageContentProps> = ({ companyContext = 'Adani Port' }) => {
  // Load initial state from localStorage or fall back to canonical demo vendors
  const loadInitialState = (): StoredVendorMasterState => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.vendors)) {
          return {
            vendors: migrateVendorListWithCanonicalTransporters(parsed.vendors),
            places: Array.isArray(parsed.places) ? parsed.places : INITIAL_DEMO_PLACES,
            accounts: Array.isArray(parsed.accounts) ? parsed.accounts : INITIAL_DEMO_ACCOUNTS,
            contacts: Array.isArray(parsed.contacts) ? parsed.contacts : INITIAL_DEMO_CONTACTS,
            visibleColumns:
              Array.isArray(parsed.visibleColumns) && parsed.visibleColumns.length > 0
                ? parsed.visibleColumns
                : DEFAULT_VISIBLE_VENDOR_COLUMNS,
            appliedFilters: parsed.appliedFilters || {},
            filterMode: parsed.filterMode === 'ANY' ? 'ANY' : 'ALL',
            savedViews: Array.isArray(parsed.savedViews) ? parsed.savedViews : [],
            layout: parsed.layout === 'grid' ? 'grid' : 'table',
            sortKey: typeof parsed.sortKey === 'string' ? parsed.sortKey : '',
            sortDir: parsed.sortDir === -1 ? -1 : 1,
          };
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return {
      vendors: INITIAL_DEMO_VENDORS,
      places: INITIAL_DEMO_PLACES,
      accounts: INITIAL_DEMO_ACCOUNTS,
      contacts: INITIAL_DEMO_CONTACTS,
      visibleColumns: DEFAULT_VISIBLE_VENDOR_COLUMNS,
      appliedFilters: {},
      filterMode: 'ALL',
      savedViews: [
        {
          name: 'Active Logistics & Fuel',
          visible: DEFAULT_VISIBLE_VENDOR_COLUMNS,
          filters: { status: ['active', 'preferred'] },
          filterMode: 'ALL',
          sortKey: 'name',
          sortDir: 1,
          layout: 'table',
        },
      ],
      layout: 'table',
      sortKey: '',
      sortDir: 1,
    };
  };

  const initialState = useMemo(() => loadInitialState(), []);

  // Core data stores
  const [vendors, setVendors] = useState<VendorRecord[]>(initialState.vendors);
  const [places, setPlaces] = useState<PlaceRecord[]>(initialState.places);
  const [accounts, setAccounts] = useState<VendorUserAccount[]>(initialState.accounts);
  const [contacts, setContacts] = useState<ContactRecord[]>(initialState.contacts);

  // Directory view states
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'inactive' | 'suspended' | 'integrated'>('all');
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'table' | 'grid'>(initialState.layout);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(10);
  const [sortKey, setSortKey] = useState<string>(initialState.sortKey);
  const [sortDir, setSortDir] = useState<1 | -1>(initialState.sortDir);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(initialState.visibleColumns);
  const [selectedVendorIds, setSelectedVendorIds] = useState<Set<string>>(new Set());

  // Applied & draft filters
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>(initialState.appliedFilters);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ANY'>(initialState.filterMode);
  const [filterDraft, setFilterDraft] = useState<Record<string, any>>({});
  const [filterDraftMode, setFilterDraftMode] = useState<'ALL' | 'ANY'>('ALL');
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [activeFilterFieldPopover, setActiveFilterFieldPopover] = useState<string | null>(null);
  const [filterOptionSearch, setFilterOptionSearch] = useState('');

  // Saved views
  const [savedViews, setSavedViews] = useState<VendorSavedView[]>(initialState.savedViews);
  const [newSavedViewName, setNewSavedViewName] = useState('');
  const [savedViewError, setSavedViewError] = useState('');

  // Popovers & overlays
  const [showSavedViewsPopover, setShowSavedViewsPopover] = useState(false);
  const [copiedIdText, setCopiedIdText] = useState<string | null>(null);

  // Active drawer & modal states
  const [activeDrawer, setActiveDrawer] = useState<null | 'filter' | 'vendor' | 'bulk' | 'import'>(null);
  const [activeDialog, setActiveDialog] = useState<
    null | 'discard-vendor' | 'discard-filter' | 'confirm-bulk-delete' | 'place' | 'export' | 'saved-view' | 'remove-personnel'
  >(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Persist non-secret state to localStorage
  useEffect(() => {
    try {
      const payload: StoredVendorMasterState = {
        vendors,
        places,
        accounts,
        contacts,
        visibleColumns: visibleColumnKeys,
        appliedFilters,
        filterMode,
        savedViews,
        layout,
        sortKey,
        sortDir,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fleetrobo:vendors-updated'));
      }
    } catch {
      // Ignore quota or private browsing errors
    }
  }, [vendors, places, accounts, contacts, visibleColumnKeys, appliedFilters, filterMode, savedViews, layout, sortKey, sortDir]);

  // Cleanse stale selected IDs if records are removed
  useEffect(() => {
    setSelectedVendorIds(prev => {
      const existing = new Set(vendors.map(v => v.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach(id => {
        if (existing.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [vendors]);

  // Vendor Drawer states (Create / Edit / View)
  const [vendorFormMode, setVendorFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'Overview' | 'Personnel'>('Overview');
  const [vendorBranch, setVendorBranch] = useState<'standard' | 'integrated'>('standard');
  const [vendorDirty, setVendorDirty] = useState(false);
  const [vendorFormError, setVendorFormError] = useState<string | null>(null);
  const [vendorFieldErrors, setVendorFieldErrors] = useState<Record<string, string>>({});

  // Standard vendor form fields
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<VendorTypeKey>('vendor');
  const [formStatus, setFormStatus] = useState<VendorStatusKey>('active');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formCountry, setFormCountry] = useState<VendorCountry>('India');
  const [formPlaceId, setFormPlaceId] = useState('');

  // Transporter / Logistics Provider conditional form fields (Sections A-F)
  const [trnCompanyName, setTrnCompanyName] = useState(companyContext || 'Adani Port');
  const [trnClientName, setTrnClientName] = useState('');
  const [trnCode, setTrnCode] = useState('');
  const [trnIsActive, setTrnIsActive] = useState(true);
  const [trnLogoDataUrl, setTrnLogoDataUrl] = useState<string | undefined>(undefined);
  const [trnRegPincode, setTrnRegPincode] = useState('');
  const [trnRegState, setTrnRegState] = useState('');
  const [trnRegCity, setTrnRegCity] = useState('');
  const [trnRegAddress, setTrnRegAddress] = useState('');
  const [trnRegLat, setTrnRegLat] = useState('');
  const [trnRegLng, setTrnRegLng] = useState('');
  const [trnBillingSame, setTrnBillingSame] = useState(true);
  const [trnBillAddress, setTrnBillAddress] = useState('');
  const [trnBillPincode, setTrnBillPincode] = useState('');
  const [trnBillCountry, setTrnBillCountry] = useState<VendorCountry>('India');
  const [trnBillState, setTrnBillState] = useState('');
  const [trnBillCity, setTrnBillCity] = useState('');
  const [trnCompanyPhone, setTrnCompanyPhone] = useState('');
  const [trnContactPerson, setTrnContactPerson] = useState('');
  const [trnContactNo, setTrnContactNo] = useState('');
  const [trnAltContactNo, setTrnAltContactNo] = useState('');
  const [trnContactEmail, setTrnContactEmail] = useState('');
  const [trnMobileNo, setTrnMobileNo] = useState('');
  const [trnAltEmail, setTrnAltEmail] = useState('');
  const [trnPanNo, setTrnPanNo] = useState('');
  const [trnGstNo, setTrnGstNo] = useState('');
  const [trnCinNo, setTrnCinNo] = useState('');
  const [trnContractSigned, setTrnContractSigned] = useState(false);

  // User Account linkage form states
  const [accountMode, setAccountMode] = useState<'new' | 'existing' | 'skip'>('new');
  const [selectedExistingAccountId, setSelectedExistingAccountId] = useState<string | null>(null);
  const [existingAccountSearch, setExistingAccountSearch] = useState('');
  const [accName, setAccName] = useState('');
  const [accEmail, setAccEmail] = useState('');
  const [accPhone, setAccPhone] = useState('');
  const [accCountry, setAccCountry] = useState<VendorCountry>('India');
  const [accRole, setAccRole] = useState<AccountRole>('Vendor Admin');
  const [accAvatar, setAccAvatar] = useState<string | undefined>(undefined);
  const [accPolicies, setAccPolicies] = useState<string[]>(['Vendor Base Access']);
  const [accPermissions, setAccPermissions] = useState<string[]>(['vendors.view']);
  const [showOptionalAccessPanel, setShowOptionalAccessPanel] = useState(false);

  // Integrated provider form states (Secrets ephemeral ONLY, never persisted)
  const [selectedProviderId, setSelectedProviderId] = useState<'' | 'demo_telematics' | 'demo_carrier'>('');
  const [pendingCredentials, setPendingCredentials] = useState<Record<string, string>>({});
  const [providerOptionVal, setProviderOptionVal] = useState<string>('');
  const [intHost, setIntHost] = useState('');
  const [intNamespace, setIntNamespace] = useState('');
  const [intWebhook, setIntWebhook] = useState('');
  const [intSandbox, setIntSandbox] = useState(true);

  // Place Modal states
  const [placeModalMode, setPlaceModalMode] = useState<'create' | 'edit'>('create');
  const [placeFormName, setPlaceFormName] = useState('');
  const [placeFormCountry, setPlaceFormCountry] = useState<VendorCountry>('India');
  const [placeFormAddress, setPlaceFormAddress] = useState('');
  const [placeFormError, setPlaceFormError] = useState('');

  // Personnel Tab states
  const [personnelAddMode, setPersonnelAddMode] = useState<'existing' | 'new'>('existing');
  const [personnelContactSearch, setPersonnelContactSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [personnelRole, setPersonnelRole] = useState<PersonnelRole>('Member');
  const [personnelLoginRequested, setPersonnelLoginRequested] = useState<boolean>(true);
  const [personnelError, setPersonnelError] = useState<string>('');
  const [contactToRemove, setContactToRemove] = useState<ContactRecord | null>(null);

  // Bulk Delete target IDs (either toolbar selection or single-row delete)
  const [bulkReviewTargetIds, setBulkReviewTargetIds] = useState<string[]>([]);

  // Import CSV Drawer direct upload state
  const vendorUpload = useDirectUploadState(activeDrawer === 'import');

  // Export Modal states
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exportError, setExportError] = useState('');

  // Lookup maps
  const placeMap = useMemo(() => {
    const map = new Map<string, PlaceRecord>();
    places.forEach(p => map.set(p.id, p));
    return map;
  }, [places]);

  const accountMap = useMemo(() => {
    const map = new Map<string, VendorUserAccount>();
    accounts.forEach(a => map.set(a.id, a));
    return map;
  }, [accounts]);

  const contactMap = useMemo(() => {
    const map = new Map<string, ContactRecord>();
    contacts.forEach(c => map.set(c.id, c));
    return map;
  }, [contacts]);

  // Helper to resolve any of the 18 column values for a vendor
  const getVendorFieldValue = (v: VendorRecord, key: string): string => {
    const acc = v.user_account_id ? accountMap.get(v.user_account_id) : undefined;
    const plc = v.place_id ? placeMap.get(v.place_id) : undefined;
    switch (key) {
      case 'name':
        return v.name || '';
      case 'public_id':
        return v.public_id || '';
      case 'internal_id':
        return v.internal_id || '';
      case 'email':
        return v.email || '';
      case 'website_url':
        return v.website_url || '';
      case 'phone':
        return v.phone || '';
      case 'place_id':
        return plc ? `${plc.name} ${plc.address}` : '';
      case 'type':
        return getVendorTypeLabel(v.type);
      case 'country':
        return v.country || '';
      case 'created_at':
        return (v.created_at || '').slice(0, 10);
      case 'updated_at':
        return (v.updated_at || '').slice(0, 10);
      case 'status':
        return v.status;
      case 'account_status':
        return acc ? 'Linked' : 'Not linked';
      case 'account_name':
        return acc ? acc.name : '';
      case 'account_email':
        return acc ? acc.email : '';
      case 'account_phone':
        return acc ? acc.phone : '';
      case 'account_country':
        return acc ? acc.country : '';
      case 'account_role':
        return acc ? acc.role : '';
      default:
        return '';
    }
  };

  // Evaluate filter match for a vendor against a filter object and mode
  const matchesFilterSet = (
    v: VendorRecord,
    filtersObj: Record<string, any>,
    mode: 'ALL' | 'ANY'
  ): boolean => {
    const activeEntries = Object.entries(filtersObj).filter(([, val]) => {
      if (val === undefined || val === null || val === '') return false;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'object') return Boolean(val.from || val.to);
      return String(val).trim().length > 0;
    });

    if (activeEntries.length === 0) return true;

    const checkSingleCondition = (key: string, cond: any): boolean => {
      const colDef = VENDOR_COLUMNS.find(c => c.key === key);
      if (!colDef) return true;
      const rawVal = getVendorFieldValue(v, key);

      if (colDef.filterType === 'text') {
        const needle = String(cond || '').trim().toLowerCase();
        if (!needle) return true;
        return rawVal.toLowerCase().includes(needle);
      }
      if (colDef.filterType === 'multi') {
        if (typeof cond === 'string') {
          const needle = cond.trim().toLowerCase();
          return !needle || rawVal.toLowerCase().includes(needle);
        }
        const arr = Array.isArray(cond) ? cond : [];
        if (arr.length === 0) return true;
        return arr.includes(rawVal);
      }
      if (colDef.filterType === 'date') {
        const dateStr = rawVal.slice(0, 10);
        if (!dateStr) return false;
        if (cond.from && dateStr < cond.from) return false;
        if (cond.to && dateStr > cond.to) return false;
        return true;
      }
      return true;
    };

    if (mode === 'ALL') {
      return activeEntries.every(([k, val]) => checkSingleCondition(k, val));
    } else {
      // Advanced mode = ANY for populated non-status conditions while selected Vendor Status remains mandatory AND guard
      const statusEntry = activeEntries.find(([k]) => k === 'status');
      if (statusEntry && !checkSingleCondition('status', statusEntry[1])) {
        return false;
      }
      const nonStatusEntries = activeEntries.filter(([k]) => k !== 'status');
      if (nonStatusEntries.length === 0) return true;
      return nonStatusEntries.some(([k, val]) => checkSingleCondition(k, val));
    }
  };

  // Top status tab counts (always from full vendors dataset per Section 2)
  const tabCounts = useMemo(() => {
    return {
      all: vendors.length,
      active: vendors.filter(v => v.status === 'active').length,
      inactive: vendors.filter(v => v.status === 'inactive').length,
      suspended: vendors.filter(v => v.status === 'suspended').length,
      integrated: vendors.filter(v => v.type === 'integrated_vendor').length,
    };
  }, [vendors]);

  // Filtered and sorted vendors
  const filteredVendors = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = vendors.filter(v => {
      // 1. Top status tab
      if (statusTab === 'active' && v.status !== 'active') return false;
      if (statusTab === 'inactive' && v.status !== 'inactive') return false;
      if (statusTab === 'suspended' && v.status !== 'suspended') return false;
      if (statusTab === 'integrated' && v.type !== 'integrated_vendor') return false;

      // 2. Search query across vendor name, IDs, email, phone, type, Place, and linked account name/email/role
      if (q) {
        const plc = v.place_id ? placeMap.get(v.place_id) : undefined;
        const acc = v.user_account_id ? accountMap.get(v.user_account_id) : undefined;
        const haystack = [
          v.name,
          v.public_id,
          v.internal_id,
          v.transporter_code || '',
          v.client_name || '',
          v.tax_legal?.pan_no || '',
          v.tax_legal?.gst_no || '',
          v.email,
          v.phone,
          getVendorTypeLabel(v.type),
          v.type,
          plc?.name || '',
          plc?.address || '',
          acc?.name || '',
          acc?.email || '',
          acc?.phone || '',
          acc?.role || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // 3. Applied Basic/Advanced filters
      return matchesFilterSet(v, appliedFilters, filterMode);
    });

    // Sort
    if (!sortKey) return list;
    return [...list].sort((a, b) => {
      const av = getVendorFieldValue(a, sortKey).toLowerCase();
      const bv = getVendorFieldValue(b, sortKey).toLowerCase();
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
  }, [vendors, statusTab, query, appliedFilters, filterMode, sortKey, sortDir, placeMap, accountMap]);

  // Live draft match count inside Filter Drawer
  const draftMatchCount = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vendors.filter(v => {
      if (statusTab === 'active' && v.status !== 'active') return false;
      if (statusTab === 'inactive' && v.status !== 'inactive') return false;
      if (statusTab === 'suspended' && v.status !== 'suspended') return false;
      if (statusTab === 'integrated' && v.type !== 'integrated_vendor') return false;
      if (q) {
        const plc = v.place_id ? placeMap.get(v.place_id) : undefined;
        const acc = v.user_account_id ? accountMap.get(v.user_account_id) : undefined;
        const haystack = [
          v.name,
          v.public_id,
          v.internal_id,
          v.transporter_code || '',
          v.client_name || '',
          v.tax_legal?.pan_no || '',
          v.tax_legal?.gst_no || '',
          v.email,
          v.phone,
          getVendorTypeLabel(v.type),
          plc?.name || '',
          plc?.address || '',
          acc?.name || '',
          acc?.email || '',
          acc?.role || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return matchesFilterSet(v, filterDraft, filterDraftMode);
    }).length;
  }, [vendors, statusTab, query, filterDraft, filterDraftMode, placeMap, accountMap]);

  // Count of populated applied filters
  const appliedFilterCount = useMemo(() => {
    return Object.values(appliedFilters).filter(val => {
      if (val === undefined || val === null || val === '') return false;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'object') return Boolean(val.from || val.to);
      return String(val).trim().length > 0;
    }).length;
  }, [appliedFilters]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStartIdx = (safePage - 1) * pageSize;
  const currentPageVendors = filteredVendors.slice(pageStartIdx, pageStartIdx + pageSize);

  const visibleColumns = useMemo(
    () => VENDOR_COLUMNS.filter(c => visibleColumnKeys.includes(c.key)),
    [visibleColumnKeys]
  );

  // Page-level selection helpers
  const allCurrentPageSelected =
    currentPageVendors.length > 0 && currentPageVendors.every(v => selectedVendorIds.has(v.id));
  const someCurrentPageSelected =
    currentPageVendors.some(v => selectedVendorIds.has(v.id)) && !allCurrentPageSelected;

  const toggleSelectCurrentPage = () => {
    setSelectedVendorIds(prev => {
      const next = new Set(prev);
      if (allCurrentPageSelected) {
        currentPageVendors.forEach(v => next.delete(v.id));
      } else {
        currentPageVendors.forEach(v => next.add(v.id));
      }
      return next;
    });
  };

  const toggleSelectSingle = (id: string) => {
    setSelectedVendorIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Copy Public/Internal ID helper
  const handleCopyId = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard?.writeText(text);
    } catch {
      // Fallback
    }
    setCopiedIdText(text);
    showToast(`Copied ${text} to clipboard`, 'info');
    setTimeout(() => {
      setCopiedIdText(curr => (curr === text ? null : curr));
    }, 1800);
  };

  // Escape key handler (dismisses innermost dialog first before drawer)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (activeDialog) {
        setActiveDialog(null);
        return;
      }
      if (showSavedViewsPopover) {
        setShowSavedViewsPopover(false);
        return;
      }
      if (activeDrawer === 'vendor') {
        attemptCloseVendorDrawer();
        return;
      }
      if (activeDrawer === 'filter') {
        attemptCloseFilterDrawer();
        return;
      }
      if (activeDrawer) {
        setActiveDrawer(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Generate unique next Public & Internal IDs
  const generateNextVendorIds = (currentList: VendorRecord[], offset = 0) => {
    let maxNum = 1000;
    currentList.forEach(v => {
      const m = v.public_id.match(/(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const nextNum = maxNum + 1 + offset;
    return {
      public_id: `VND-${nextNum}`,
      internal_id: `VENDOR-${nextNum}`,
    };
  };

  // Open Create Vendor Drawer
  const openCreateVendorDrawer = () => {
    setVendorFormMode('create');
    setEditingVendorId(null);
    setActiveDetailTab('Overview');
    setVendorBranch('standard');
    setVendorDirty(false);
    setVendorFormError(null);
    setVendorFieldErrors({});

    setFormName('');
    setFormType('vendor');
    setFormStatus('active');
    setFormEmail('');
    setFormPhone('');
    setFormWebsite('');
    setFormCountry('India');
    setFormPlaceId('');

    // Reset Transporter conditional fields
    setTrnCompanyName(companyContext || 'Adani Port');
    setTrnClientName('');
    setTrnCode('');
    setTrnIsActive(true);
    setTrnLogoDataUrl(undefined);
    setTrnRegPincode('');
    setTrnRegState('');
    setTrnRegCity('');
    setTrnRegAddress('');
    setTrnRegLat('');
    setTrnRegLng('');
    setTrnBillingSame(true);
    setTrnBillAddress('');
    setTrnBillPincode('');
    setTrnBillCountry('India');
    setTrnBillState('');
    setTrnBillCity('');
    setTrnCompanyPhone('');
    setTrnContactPerson('');
    setTrnContactNo('');
    setTrnAltContactNo('');
    setTrnContactEmail('');
    setTrnMobileNo('');
    setTrnAltEmail('');
    setTrnPanNo('');
    setTrnGstNo('');
    setTrnCinNo('');
    setTrnContractSigned(false);

    // Fresh create starts in New Account mode by default per Section 6.2
    setAccountMode('new');
    setSelectedExistingAccountId(null);
    setExistingAccountSearch('');
    setAccName('');
    setAccEmail('');
    setAccPhone('');
    setAccCountry('India');
    setAccRole('Vendor Admin');
    setAccAvatar(undefined);
    setAccPolicies(['Vendor Base Access']);
    setAccPermissions(['vendors.view']);
    setShowOptionalAccessPanel(false);

    setSelectedProviderId('');
    setPendingCredentials({});
    setProviderOptionVal('');
    setIntHost('');
    setIntNamespace('');
    setIntWebhook('');
    setIntSandbox(true);

    setActiveDrawer('vendor');
  };

  // Open View or Edit Drawer for an existing vendor
  const openExistingVendorDrawer = (
    vendor: VendorRecord,
    mode: 'view' | 'edit',
    initialTab: 'Overview' | 'Personnel' = 'Overview'
  ) => {
    setVendorFormMode(mode);
    setEditingVendorId(vendor.id);
    setActiveDetailTab(initialTab);
    setVendorBranch(vendor.type === 'integrated_vendor' ? 'integrated' : 'standard');
    setVendorDirty(false);
    setVendorFormError(null);
    setVendorFieldErrors({});

    setFormName(vendor.name);
    setFormType(vendor.type === 'integrated_vendor' ? 'vendor' : vendor.type);
    setFormStatus(vendor.status);
    setFormEmail(vendor.email || '');
    setFormPhone(vendor.phone || '');
    setFormWebsite(vendor.website_url || '');
    setFormCountry(vendor.country || 'India');
    setFormPlaceId(vendor.place_id || '');

    // Prepopulate Transporter fields seamlessly from saved record or shared Place/Vendor fields
    const linkedPlace = vendor.place_id ? placeMap.get(vendor.place_id) : undefined;
    const reg = vendor.registered_address;
    const bill = vendor.billing_details;
    const extra = vendor.contacts_extra;
    const tax = vendor.tax_legal;
    const sameAsReg = vendor.billing_same_as_registered ?? true;
    const initRegCountry = reg?.country || vendor.country || 'India';
    const initRegState = reg?.state || '';
    const initRegCity = reg?.city || '';
    const initRegAddr = reg?.address || linkedPlace?.address || '';
    const initRegPin = reg?.pincode || '';

    setTrnCompanyName(vendor.company_name || vendor.company || companyContext || 'Adani Port');
    setTrnClientName(vendor.client_name || '');
    setTrnCode(vendor.transporter_code || '');
    setTrnIsActive(vendor.is_active ?? vendor.status !== 'inactive');
    setTrnLogoDataUrl(vendor.logo_data_url);
    setTrnRegPincode(initRegPin);
    setTrnRegState(initRegState);
    setTrnRegCity(initRegCity);
    setTrnRegAddress(initRegAddr);
    setTrnRegLat(reg?.latitude || '');
    setTrnRegLng(reg?.longitude || '');
    setTrnBillingSame(sameAsReg);
    setTrnBillCountry(sameAsReg ? initRegCountry : bill?.country || initRegCountry);
    setTrnBillState(sameAsReg ? initRegState : bill?.state || '');
    setTrnBillCity(sameAsReg ? initRegCity : bill?.city || '');
    setTrnBillPincode(sameAsReg ? initRegPin : bill?.pincode || '');
    setTrnBillAddress(sameAsReg ? initRegAddr : bill?.address || '');
    setTrnCompanyPhone(extra?.company_phone || '');
    setTrnContactPerson(extra?.contact_person || '');
    setTrnContactNo(extra?.contact_no || vendor.phone || '');
    setTrnAltContactNo(extra?.alt_contact_no || '');
    setTrnContactEmail(extra?.contact_email || '');
    setTrnMobileNo(extra?.mobile_no || vendor.phone || '');
    setTrnAltEmail(extra?.alt_email || '');
    setTrnPanNo(tax?.pan_no || '');
    setTrnGstNo(tax?.gst_no || '');
    setTrnCinNo(tax?.cin_no || '');
    setTrnContractSigned(Boolean(vendor.is_contract_signed));

    // Populate account linkage
    if (vendor.user_account_id) {
      const linkedAcc = accountMap.get(vendor.user_account_id);
      if (linkedAcc) {
        setAccountMode('existing');
        setSelectedExistingAccountId(linkedAcc.id);
        setAccName(linkedAcc.name);
        setAccEmail(linkedAcc.email);
        setAccPhone(linkedAcc.phone);
        setAccCountry(linkedAcc.country);
        setAccRole(linkedAcc.role);
        setAccAvatar(linkedAcc.avatarDataUrl);
        setAccPolicies(linkedAcc.policies || ['Vendor Base Access']);
        setAccPermissions(linkedAcc.permissions || ['vendors.view']);
      } else {
        setAccountMode('skip');
        setSelectedExistingAccountId(null);
      }
    } else {
      setAccountMode('skip');
      setSelectedExistingAccountId(null);
      setAccName('');
      setAccEmail('');
      setAccPhone('');
      setAccCountry('India');
      setAccRole('Vendor Admin');
      setAccAvatar(undefined);
      setAccPolicies(['Vendor Base Access']);
      setAccPermissions(['vendors.view']);
    }
    setExistingAccountSearch('');
    setShowOptionalAccessPanel(false);

    // Populate integrated provider fields (never reveal stored secrets because none are stored)
    if (vendor.integration) {
      setSelectedProviderId(vendor.integration.provider_id);
      setPendingCredentials({});
      const prov = DEMO_INTEGRATED_PROVIDERS.find(p => p.id === vendor.integration?.provider_id);
      const optKey = prov?.optionKey || 'region';
      setProviderOptionVal(vendor.integration.options?.[optKey] || prov?.defaultOption || '');
      setIntHost(vendor.integration.host || '');
      setIntNamespace(vendor.integration.namespace || '');
      setIntWebhook(vendor.integration.webhook_url || '');
      setIntSandbox(vendor.integration.sandbox ?? true);
    } else {
      setSelectedProviderId('');
      setPendingCredentials({});
      setProviderOptionVal('');
      setIntHost('');
      setIntNamespace('');
      setIntWebhook('');
      setIntSandbox(true);
    }

    // Reset personnel inputs
    setPersonnelAddMode('existing');
    setPersonnelContactSearch('');
    setSelectedContactId('');
    setNewContactName('');
    setNewContactEmail('');
    setNewContactPhone('');
    setPersonnelRole('Member');
    setPersonnelLoginRequested(true);
    setPersonnelError('');

    setActiveDrawer('vendor');
  };

  const attemptCloseVendorDrawer = () => {
    if (vendorFormMode !== 'view' && vendorDirty) {
      setActiveDialog('discard-vendor');
    } else {
      setPendingCredentials({});
      setActiveDrawer(null);
    }
  };

  // Validate and Save Vendor (Create or Edit)
  const handleSaveVendor = () => {
    const fieldErrs: Record<string, string> = {};
    setVendorFormError(null);

    // 1. Validate Standard vs Integrated branch
    if (vendorBranch === 'standard') {
      const isTransporterType = formType === 'transporter';
      if (!formName.trim()) {
        fieldErrs.name = isTransporterType
          ? 'Vendor / Transporter Name is required.'
          : 'Vendor Name is required.';
      } else if (formName.trim().length > 191) {
        fieldErrs.name = 'Vendor Name cannot exceed 191 characters.';
      }
      if (!formType || formType === 'integrated_vendor') {
        fieldErrs.type = 'Please select a valid standard Vendor Type.';
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (isTransporterType) {
        if (!formEmail.trim()) {
          fieldErrs.email = 'Email ID is required.';
        } else if (!emailRegex.test(formEmail.trim())) {
          fieldErrs.email = 'Enter a valid Email ID.';
        }
      } else if (formEmail.trim() && !emailRegex.test(formEmail.trim())) {
        fieldErrs.email = 'Enter a valid vendor business email address.';
      }

      if (!isTransporterType && formPhone.trim()) {
        const digits = formPhone.replace(/\D/g, '');
        if (digits.length < 8) {
          fieldErrs.phone = 'Business phone must contain at least 8 numeric digits.';
        }
      }
      if (formWebsite.trim()) {
        try {
          const url = new URL(formWebsite.trim());
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            fieldErrs.website_url = 'Website URL must use http:// or https:// protocol.';
          }
        } catch {
          fieldErrs.website_url = 'Enter a valid full URL (e.g., https://example.com).';
        }
      }

      // Transporter-specific mandatory & format validations (Sections A-F)
      if (isTransporterType) {
        if (!formCountry) {
          fieldErrs.reg_country = 'Country is required.';
        }
        if (!trnRegState.trim()) {
          fieldErrs.reg_state = 'State is required.';
        }
        if (!trnRegAddress.trim()) {
          fieldErrs.reg_address = 'Registered Address is required.';
        }
        if (trnRegLat.trim()) {
          const latNum = Number(trnRegLat.trim());
          if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
            fieldErrs.reg_lat = 'Latitude must be between -90 and 90.';
          }
        }
        if (trnRegLng.trim()) {
          const lngNum = Number(trnRegLng.trim());
          if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
            fieldErrs.reg_lng = 'Longitude must be between -180 and 180.';
          }
        }

        const contactDigits = trnContactNo.replace(/\D/g, '');
        if (!trnContactNo.trim()) {
          fieldErrs.contact_no = 'Contact No. is required.';
        } else if (contactDigits.length < 8) {
          fieldErrs.contact_no = 'Contact No. must contain at least 8 numeric digits.';
        }

        const mobDigits = trnMobileNo.replace(/\D/g, '');
        let normMob = mobDigits;
        if (formCountry === 'India' && mobDigits.length === 12 && mobDigits.startsWith('91')) {
          normMob = mobDigits.slice(2);
        }
        if (!trnMobileNo.trim()) {
          fieldErrs.mobile_no = 'Mobile No. is required.';
        } else if (formCountry === 'India' ? normMob.length !== 10 : mobDigits.length < 7 || mobDigits.length > 15) {
          fieldErrs.mobile_no =
            formCountry === 'India'
              ? 'India Mobile No. must be 10 digits (after optional +91).'
              : 'Mobile No. must contain 7 to 15 digits.';
        }

        if (trnCompanyPhone.trim() && trnCompanyPhone.replace(/\D/g, '').length < 6) {
          fieldErrs.company_phone = 'Company Phone No. must contain at least 6 digits.';
        }
        if (trnAltContactNo.trim() && trnAltContactNo.replace(/\D/g, '').length < 8) {
          fieldErrs.alt_contact_no = 'Alternate Contact No. must contain at least 8 digits.';
        }
        if (trnContactEmail.trim() && !emailRegex.test(trnContactEmail.trim())) {
          fieldErrs.contact_email = 'Enter a valid Contact Email ID.';
        }
        if (trnAltEmail.trim() && !emailRegex.test(trnAltEmail.trim())) {
          fieldErrs.alt_email = 'Enter a valid Alternate Email ID.';
        }

        if (trnPanNo.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(trnPanNo.trim().toUpperCase())) {
          fieldErrs.pan_no = 'Enter a valid 10-character PAN (e.g., AAACW1234F).';
        }
        if (
          trnGstNo.trim() &&
          !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(trnGstNo.trim().toUpperCase())
        ) {
          fieldErrs.gst_no = 'Enter a valid 15-character GSTIN (e.g., 24AAACW1234F1Z5).';
        }
        if (
          trnCinNo.trim() &&
          !/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(trnCinNo.trim().toUpperCase())
        ) {
          fieldErrs.cin_no = 'Enter a valid 21-character CIN.';
        }
      }
    } else {
      // Integrated Provider branch validation
      if (!selectedProviderId) {
        fieldErrs.provider = 'Select a supported demo provider to configure.';
      } else {
        const prov = DEMO_INTEGRATED_PROVIDERS.find(p => p.id === selectedProviderId);
        if (prov && vendorFormMode === 'create') {
          // On new Integrated Provider create, required credentials must be entered
          prov.credentials.forEach(cred => {
            if (!pendingCredentials[cred.key]?.trim()) {
              fieldErrs[`cred_${cred.key}`] = `${cred.label} is required for initial provider setup.`;
            }
          });
        }
      }
    }

    // 2. Validate User Account linkage if not skipped
    if (accountMode !== 'skip') {
      if (accountMode === 'existing' && !selectedExistingAccountId) {
        fieldErrs.account_pick = 'Select an available platform user account or skip linkage.';
      } else {
        // Validate profile fields (both new account and editing selected existing account)
        if (accName.trim().length < 2) {
          fieldErrs.acc_name = 'Account Name must be at least 2 characters.';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(accEmail.trim())) {
          fieldErrs.acc_email = 'Enter a valid unique platform login email.';
        } else {
          const duplicateEmail = accounts.find(
            a =>
              a.email.toLowerCase() === accEmail.trim().toLowerCase() &&
              (accountMode === 'new' || a.id !== selectedExistingAccountId)
          );
          if (duplicateEmail) {
            fieldErrs.acc_email = 'This email is already used by another platform User Account.';
          }
        }

        // Phone normalization & validation
        const rawDigits = accPhone.replace(/\D/g, '');
        let normalizedPhone = rawDigits;
        if (accCountry === 'India') {
          if (rawDigits.length === 12 && rawDigits.startsWith('91')) {
            normalizedPhone = rawDigits.slice(2);
          }
          if (normalizedPhone.length !== 10) {
            fieldErrs.acc_phone = 'India platform account phone must be exactly 10 digits (after optional +91).';
          }
        } else {
          if (rawDigits.length < 7 || rawDigits.length > 15) {
            fieldErrs.acc_phone = 'Account phone must contain between 7 and 15 digits.';
          }
        }

        if (!fieldErrs.acc_phone) {
          const duplicatePhone = accounts.find(a => {
            const aDigits = a.phone.replace(/\D/g, '');
            const normA = a.country === 'India' && aDigits.length === 12 && aDigits.startsWith('91') ? aDigits.slice(2) : aDigits;
            return normA === normalizedPhone && (accountMode === 'new' || a.id !== selectedExistingAccountId);
          });
          if (duplicatePhone) {
            fieldErrs.acc_phone = 'This phone number is already registered to another platform User Account.';
          }
        }

        if (!VENDOR_ACCOUNT_ROLES.includes(accRole)) {
          fieldErrs.acc_role = 'Select a valid platform account role.';
        }
      }
    }

    setVendorFieldErrors(fieldErrs);
    if (Object.keys(fieldErrs).length > 0) {
      setVendorFormError('Please resolve the highlighted validation errors before saving.');
      return;
    }

    // 3. Process User Account save/update if linked
    let finalAccountId: string | null = null;
    if (accountMode !== 'skip') {
      const rawDigits = accPhone.replace(/\D/g, '');
      const normalizedPhone =
        accCountry === 'India' && rawDigits.length === 12 && rawDigits.startsWith('91')
          ? rawDigits.slice(2)
          : rawDigits;

      if (accountMode === 'new') {
        const newAccId = `ua-${Date.now()}`;
        const newAcc: VendorUserAccount = {
          id: newAccId,
          name: accName.trim(),
          email: accEmail.trim(),
          phone: normalizedPhone,
          country: accCountry,
          role: accRole,
          avatarDataUrl: accAvatar,
          policies: accPolicies,
          permissions: accPermissions,
        };
        setAccounts(prev => [newAcc, ...prev]);
        finalAccountId = newAccId;
      } else if (selectedExistingAccountId) {
        setAccounts(prev =>
          prev.map(a =>
            a.id === selectedExistingAccountId
              ? {
                  ...a,
                  name: accName.trim(),
                  email: accEmail.trim(),
                  phone: normalizedPhone,
                  country: accCountry,
                  role: accRole,
                  avatarDataUrl: accAvatar,
                  policies: accPolicies,
                  permissions: accPermissions,
                }
              : a
          )
        );
        finalAccountId = selectedExistingAccountId;
      }
    }

    const nowIso = new Date().toISOString();

    const buildTransporterPayload = () => {
      if (formType !== 'transporter') return {};
      const resolvedBilling = trnBillingSame
        ? {
            address: trnRegAddress.trim(),
            pincode: trnRegPincode.trim(),
            country: formCountry,
            state: trnRegState.trim(),
            city: trnRegCity.trim(),
          }
        : {
            address: trnBillAddress.trim(),
            pincode: trnBillPincode.trim(),
            country: trnBillCountry,
            state: trnBillState.trim(),
            city: trnBillCity.trim(),
          };
      return {
        transporter_code: trnCode.trim() || undefined,
        company_name: trnCompanyName.trim() || companyContext || 'Adani Port',
        client_name: trnClientName.trim() || undefined,
        is_active: trnIsActive,
        logo_data_url: trnLogoDataUrl,
        registered_address: {
          pincode: trnRegPincode.trim(),
          country: formCountry,
          state: trnRegState.trim(),
          city: trnRegCity.trim(),
          address: trnRegAddress.trim(),
          latitude: trnRegLat.trim() || undefined,
          longitude: trnRegLng.trim() || undefined,
        },
        billing_same_as_registered: trnBillingSame,
        billing_details: resolvedBilling,
        contacts_extra: {
          company_phone: trnCompanyPhone.trim() || undefined,
          contact_person: trnContactPerson.trim() || undefined,
          contact_no: trnContactNo.trim() || undefined,
          alt_contact_no: trnAltContactNo.trim() || undefined,
          contact_email: trnContactEmail.trim() || undefined,
          mobile_no: trnMobileNo.trim() || undefined,
          alt_email: trnAltEmail.trim() || undefined,
        },
        tax_legal: {
          pan_no: trnPanNo.trim().toUpperCase() || undefined,
          gst_no: trnGstNo.trim().toUpperCase() || undefined,
          cin_no: trnCinNo.trim().toUpperCase() || undefined,
        },
        is_contract_signed: trnContractSigned,
      };
    };

    if (vendorFormMode === 'create') {
      const ids = generateNextVendorIds(vendors);
      if (vendorBranch === 'integrated') {
        const prov = DEMO_INTEGRATED_PROVIDERS.find(p => p.id === selectedProviderId)!;
        const newVendor: VendorRecord = {
          id: `vnd-${Date.now()}`,
          public_id: ids.public_id,
          internal_id: ids.internal_id,
          business_id: '',
          name: prov.name,
          type: 'integrated_vendor',
          status: 'active',
          email: '',
          phone: '',
          website_url: '',
          country: 'India',
          place_id: '',
          user_account_id: finalAccountId,
          personnel: [],
          integration: {
            provider_id: prov.id,
            provider_label: prov.name,
            configured: true,
            credential_keys: prov.credentials.map(c => c.key),
            options: { [prov.optionKey]: providerOptionVal || prov.defaultOption },
            host: intHost.trim(),
            namespace: intNamespace.trim(),
            webhook_url: intWebhook.trim(),
            sandbox: intSandbox,
          },
          company: companyContext || 'Adani Port',
          created_at: nowIso,
          updated_at: nowIso,
        };
        // Explicitly purge ephemeral secrets
        setPendingCredentials({});
        setVendors(prev => [newVendor, ...prev]);
        setSortKey('');
        setPage(1);
        showToast('Integrated vendor created (demo metadata only; credentials not persisted)', 'success');
      } else {
        const effectivePhone =
          formType === 'transporter' ? (trnContactNo.trim() || trnMobileNo.trim() || formPhone.trim()) : formPhone.trim();
        const effectiveStatus: VendorStatusKey =
          formType === 'transporter' && !trnIsActive && formStatus === 'active'
            ? 'inactive'
            : formType === 'transporter' && trnIsActive && formStatus === 'inactive'
            ? 'active'
            : formStatus;
        const newVendor: VendorRecord = {
          id: `vnd-${Date.now()}`,
          public_id: ids.public_id,
          internal_id: ids.internal_id,
          business_id: '',
          name: formName.trim(),
          type: formType,
          status: effectiveStatus,
          email: formEmail.trim(),
          phone: effectivePhone,
          website_url: formWebsite.trim(),
          country: formCountry,
          place_id: formPlaceId,
          user_account_id: finalAccountId,
          personnel: [],
          integration: null,
          company: trnCompanyName.trim() || companyContext || 'Adani Port',
          created_at: nowIso,
          updated_at: nowIso,
          ...buildTransporterPayload(),
        };
        setVendors(prev => [newVendor, ...prev]);
        setSortKey('');
        setPage(1);
        showToast(
          formType === 'transporter'
            ? `Transporter vendor "${newVendor.name}" (${newVendor.public_id}) created`
            : 'Vendor created successfully',
          'success'
        );
      }
      setVendorDirty(false);
      setActiveDrawer(null);
    } else if (editingVendorId) {
      const previousVendor = vendors.find(v => v.id === editingVendorId);
      setVendors(prev =>
        prev.map(v => {
          if (v.id !== editingVendorId) return v;
          if (vendorBranch === 'integrated') {
            const prov = DEMO_INTEGRATED_PROVIDERS.find(p => p.id === selectedProviderId)!;
            return {
              ...v,
              name: prov.name,
              type: 'integrated_vendor',
              status: formStatus,
              email: '',
              phone: '',
              website_url: '',
              user_account_id: finalAccountId,
              integration: {
                provider_id: prov.id,
                provider_label: prov.name,
                configured: true,
                credential_keys: prov.credentials.map(c => c.key),
                options: { [prov.optionKey]: providerOptionVal || prov.defaultOption },
                host: intHost.trim(),
                namespace: intNamespace.trim(),
                webhook_url: intWebhook.trim(),
                sandbox: intSandbox,
              },
              updated_at: nowIso,
            };
          } else {
            const effectivePhone =
              formType === 'transporter' ? (trnContactNo.trim() || trnMobileNo.trim() || formPhone.trim()) : formPhone.trim();
            const effectiveStatus: VendorStatusKey =
              formType === 'transporter' && !trnIsActive && formStatus === 'active'
                ? 'inactive'
                : formType === 'transporter' && trnIsActive && formStatus === 'inactive'
                ? 'active'
                : formStatus;
            return {
              ...v,
              name: formName.trim(),
              type: formType,
              status: effectiveStatus,
              email: formEmail.trim(),
              phone: effectivePhone,
              website_url: formWebsite.trim(),
              country: formCountry,
              place_id: formPlaceId,
              company: formType === 'transporter' ? (trnCompanyName.trim() || v.company) : v.company,
              user_account_id: finalAccountId,
              updated_at: nowIso,
              ...buildTransporterPayload(),
            };
          }
        })
      );
      if (
        previousVendor &&
        vendorBranch === 'standard' &&
        formType === 'transporter' &&
        previousVendor.name.trim() !== formName.trim()
      ) {
        syncTransporterRenameAcrossModules(editingVendorId, previousVendor.name, formName.trim());
      }
      setPendingCredentials({});
      setVendorDirty(false);
      setActiveDrawer(null);
      showToast('Vendor details updated', 'success');
    }
  };

  const handleTransporterLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      file.type !== 'image/jpeg' &&
      file.type !== 'image/png' &&
      file.type !== 'image/svg+xml'
    ) {
      setVendorFieldErrors(prev => ({
        ...prev,
        trn_logo: 'Logo must be a JPG, PNG, or SVG image.',
      }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setVendorFieldErrors(prev => ({
        ...prev,
        trn_logo: 'Logo file size cannot exceed 2 MB.',
      }));
      return;
    }
    setVendorFieldErrors(prev => {
      const next = { ...prev };
      delete next.trn_logo;
      return next;
    });
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTrnLogoDataUrl(reader.result);
        setVendorDirty(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Avatar file handler (JPG/PNG <= 1MB)
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setVendorFieldErrors(prev => ({ ...prev, acc_avatar: 'Avatar must be a JPG or PNG image.' }));
      return;
    }
    if (file.size > 1024 * 1024) {
      setVendorFieldErrors(prev => ({ ...prev, acc_avatar: 'Avatar file size cannot exceed 1 MB.' }));
      return;
    }
    setVendorFieldErrors(prev => {
      const next = { ...prev };
      delete next.acc_avatar;
      return next;
    });
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAccAvatar(reader.result);
        setVendorDirty(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Place Modal handlers
  const openCreatePlaceModal = () => {
    setPlaceModalMode('create');
    setPlaceFormName('');
    setPlaceFormCountry(formCountry || 'India');
    setPlaceFormAddress('');
    setPlaceFormError('');
    setActiveDialog('place');
  };

  const openEditPlaceModal = () => {
    const plc = formPlaceId ? placeMap.get(formPlaceId) : undefined;
    if (!plc) return;
    setPlaceModalMode('edit');
    setPlaceFormName(plc.name);
    setPlaceFormCountry(plc.country);
    setPlaceFormAddress(plc.address);
    setPlaceFormError('');
    setActiveDialog('place');
  };

  const handleSavePlaceModal = () => {
    if (!placeFormName.trim() || !placeFormAddress.trim()) {
      setPlaceFormError('Both Place Name and full Place Address are required.');
      return;
    }
    if (placeModalMode === 'create') {
      const newPlace: PlaceRecord = {
        id: `plc-${Date.now()}`,
        name: placeFormName.trim(),
        country: placeFormCountry,
        address: placeFormAddress.trim(),
      };
      setPlaces(prev => [newPlace, ...prev]);
      setFormPlaceId(newPlace.id);
      setVendorDirty(true);
      showToast(`Created and linked Place "${newPlace.name}"`, 'success');
    } else if (formPlaceId) {
      setPlaces(prev =>
        prev.map(p =>
          p.id === formPlaceId
            ? {
                ...p,
                name: placeFormName.trim(),
                country: placeFormCountry,
                address: placeFormAddress.trim(),
              }
            : p
        )
      );
      setVendorDirty(true);
      showToast(`Updated shared Place "${placeFormName.trim()}"`, 'success');
    }
    setActiveDialog(null);
  };

  // Current editing/viewing vendor object
  const activeVendorRecord = useMemo(
    () => (editingVendorId ? vendors.find(v => v.id === editingVendorId) || null : null),
    [vendors, editingVendorId]
  );

  // Personnel addition handler (immediate local state commit per Section 8)
  const handleAddPersonnel = () => {
    if (!activeVendorRecord) return;
    setPersonnelError('');

    let targetContactId = '';
    if (personnelAddMode === 'existing') {
      if (!selectedContactId) {
        setPersonnelError('Please select an existing Contact to add.');
        return;
      }
      if (activeVendorRecord.personnel.some(p => p.contact_id === selectedContactId)) {
        setPersonnelError('This Contact is already linked to this Vendor.');
        return;
      }
      targetContactId = selectedContactId;
    } else {
      if (!newContactName.trim()) {
        setPersonnelError('Contact Name is required.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newContactEmail.trim())) {
        setPersonnelError('Enter a valid Contact email address.');
        return;
      }
      const dupContact = contacts.find(
        c => c.email.toLowerCase() === newContactEmail.trim().toLowerCase()
      );
      if (dupContact) {
        setPersonnelError(
          `A Contact with email "${newContactEmail.trim()}" already exists (${dupContact.name}). Switch to "Select existing contact" to link them.`
        );
        return;
      }
      const createdContact: ContactRecord = {
        id: `cnt-${Date.now()}`,
        name: newContactName.trim(),
        email: newContactEmail.trim(),
        phone: newContactPhone.trim(),
      };
      setContacts(prev => [createdContact, ...prev]);
      targetContactId = createdContact.id;
    }

    const nowIso = new Date().toISOString();
    setVendors(prev =>
      prev.map(v => {
        if (v.id !== activeVendorRecord.id) return v;
        if (v.personnel.some(p => p.contact_id === targetContactId)) return v;
        return {
          ...v,
          updated_at: nowIso,
          personnel: [
            ...v.personnel,
            {
              contact_id: targetContactId,
              role: personnelRole,
              status: 'active',
              login_requested: personnelLoginRequested,
              added_at: nowIso,
            },
          ],
        };
      })
    );

    setSelectedContactId('');
    setNewContactName('');
    setNewContactEmail('');
    setNewContactPhone('');
    setPersonnelRole('Member');
    setPersonnelLoginRequested(true);
    showToast('Vendor personnel membership added', 'success');
  };

  const confirmRemovePersonnelMembership = () => {
    if (!activeVendorRecord || !contactToRemove) return;
    const nowIso = new Date().toISOString();
    setVendors(prev =>
      prev.map(v =>
        v.id === activeVendorRecord.id
          ? {
              ...v,
              updated_at: nowIso,
              personnel: v.personnel.filter(p => p.contact_id !== contactToRemove.id),
            }
          : v
      )
    );
    setContactToRemove(null);
    setActiveDialog(null);
    showToast('Vendor contact membership removed', 'success');
  };

  // Filter Drawer open/close/apply
  const openFilterDrawer = () => {
    setFilterDraft(JSON.parse(JSON.stringify(appliedFilters)));
    setFilterDraftMode(filterMode);
    setFilterSearchQuery('');
    setActiveFilterFieldPopover(null);
    setActiveDrawer('filter');
  };

  const isFilterDraftChanged = useMemo(() => {
    return (
      JSON.stringify(filterDraft) !== JSON.stringify(appliedFilters) ||
      filterDraftMode !== filterMode
    );
  }, [filterDraft, appliedFilters, filterDraftMode, filterMode]);

  const attemptCloseFilterDrawer = () => {
    if (isFilterDraftChanged) {
      setActiveDialog('discard-filter');
    } else {
      setActiveDrawer(null);
    }
  };

  const hasInvalidDateFilter = useMemo(() => {
    for (const key of ['created_at', 'updated_at']) {
      const range = filterDraft[key];
      if (range && range.from && range.to && range.from > range.to) {
        return true;
      }
    }
    return false;
  }, [filterDraft]);

  const handleApplyFilters = () => {
    if (hasInvalidDateFilter) return;
    setAppliedFilters(JSON.parse(JSON.stringify(filterDraft)));
    setFilterMode(filterDraftMode);
    setPage(1);
    setActiveDrawer(null);
    showToast('Filters applied', 'info');
  };

  // Bulk Delete review & execution
  const openBulkDeleteDrawer = (targetIds: string[]) => {
    const existingIds = targetIds.filter(id => vendors.some(v => v.id === id));
    if (existingIds.length === 0) return;
    setBulkReviewTargetIds(existingIds);
    setActiveDrawer('bulk');
  };

  const bulkReviewSummary = useMemo(() => {
    const records = bulkReviewTargetIds
      .map(id => vendors.find(v => v.id === id))
      .filter((v): v is VendorRecord => Boolean(v));
    const eligible = records.filter(v => v.personnel.length === 0);
    const skipped = records.filter(v => v.personnel.length > 0);
    return { records, eligible, skipped };
  }, [bulkReviewTargetIds, vendors]);

  const executeConfirmedBulkDelete = () => {
    const eligibleIds = new Set(bulkReviewSummary.eligible.map(v => v.id));
    const deleteCount = eligibleIds.size;
    if (deleteCount === 0) return;

    setVendors(prev => prev.filter(v => !eligibleIds.has(v.id)));
    setSelectedVendorIds(prev => {
      const next = new Set(prev);
      eligibleIds.forEach(id => next.delete(id));
      return next;
    });
    setActiveDialog(null);
    setActiveDrawer(null);
    showToast(`Deleted ${deleteCount} local vendor record${deleteCount === 1 ? '' : 's'}`, 'success');
  };

  // Direct CSV Import logic
  const openImportDrawer = () => {
    vendorUpload.reset();
    setActiveDrawer('import');
  };

  const processVendorCsvDirect = (fileName: string, text: string, fileSize?: number) => {
    const parsed = parseCsvContent(text);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      vendorUpload.fail('CSV file must include a header row and at least one data row.');
      return;
    }

    const aliasCatalog: Record<string, string[]> = {
      name: ['name', 'vendor_name', 'full_name', 'first_name', 'contact', 'person'],
      phone: [
        'phone',
        'mobile',
        'phone_number',
        'number',
        'cell',
        'cell_phone',
        'mobile_number',
        'contact_number',
        'tel',
        'telephone',
        'telephone_number',
      ],
      email: ['email', 'email_address'],
      website_url: ['website', 'website_url'],
      country: ['country', 'country_name'],
      address: ['address', 'street_address', 'location'],
    };

    const colMap: Record<string, string> = {};
    parsed.headers.forEach(h => {
      const norm = h.trim().toLowerCase().replace(/\s+/g, '_');
      Object.entries(aliasCatalog).forEach(([canonKey, aliases]) => {
        if (!colMap[canonKey] && aliases.includes(norm)) {
          colMap[canonKey] = h;
        }
      });
    });

    const nameHeader = colMap.name || parsed.headers[0];
    const existingNames = new Set(vendors.map(v => v.name.trim().toLowerCase()));
    const seenInFile = new Set<string>();

    const getCell = (row: string[], colName?: string) => {
      if (!colName) return '';
      const idx = parsed.headers.indexOf(colName);
      return idx >= 0 ? (row[idx] || '').trim() : '';
    };

    const nowIso = new Date().toISOString();
    const updatedPlaces = [...places];
    const newVendors: VendorRecord[] = [];
    let skippedCount = 0;

    parsed.rows.forEach((row, offset) => {
      const name = getCell(row, nameHeader);
      const phone = getCell(row, colMap.phone);
      const email = getCell(row, colMap.email);
      const website_url = getCell(row, colMap.website_url);
      const rawCountry = getCell(row, colMap.country);
      const address = getCell(row, colMap.address);
      const lowerName = name.toLowerCase();

      if (
        !name ||
        (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
        seenInFile.has(lowerName) ||
        existingNames.has(lowerName)
      ) {
        skippedCount++;
        return;
      }

      seenInFile.add(lowerName);
      const country: VendorCountry = VENDOR_COUNTRIES.includes(rawCountry as VendorCountry)
        ? (rawCountry as VendorCountry)
        : 'India';

      let linkedPlaceId = '';
      if (address) {
        const existingPlace = updatedPlaces.find(
          p => p.address.trim().toLowerCase() === address.trim().toLowerCase()
        );
        if (existingPlace) {
          linkedPlaceId = existingPlace.id;
        } else {
          const createdPlace: PlaceRecord = {
            id: `plc-imp-${Date.now()}-${offset}`,
            name: address.split(',')[0].trim() || `${name} Place`,
            address,
            country,
          };
          updatedPlaces.push(createdPlace);
          linkedPlaceId = createdPlace.id;
        }
      }

      const ids = generateNextVendorIds([...vendors, ...newVendors], newVendors.length);
      newVendors.push({
        id: `vnd-imp-${Date.now()}-${offset}`,
        public_id: ids.public_id,
        internal_id: ids.internal_id,
        business_id: '',
        name,
        type: 'vendor',
        status: 'active',
        email,
        phone,
        website_url,
        country,
        place_id: linkedPlaceId,
        user_account_id: null,
        personnel: [],
        integration: null,
        company: 'Adani Port',
        created_at: nowIso,
        updated_at: nowIso,
      });
    });

    if (newVendors.length === 0) {
      vendorUpload.fail('No valid new vendor rows found (all rows had missing names, invalid email, or duplicate entries).');
      return;
    }

    vendorUpload.startUploading(fileName, formatUploadFileSize(fileSize), () => {
      setPlaces(updatedPlaces);
      setVendors(prev => [...newVendors, ...prev]);
      setSortKey('');
      setPage(1);
      showToast(`${newVendors.length} vendor${newVendors.length === 1 ? '' : 's'} imported`, 'success');
      return {
        headline: 'Vendors uploaded successfully',
        description: `Imported ${newVendors.length} vendor record${newVendors.length === 1 ? '' : 's'} from ${fileName}.${
          skippedCount > 0 ? ` ${skippedCount} duplicate or invalid row${skippedCount === 1 ? '' : 's'} skipped.` : ''
        }`,
        stats: [
          { label: 'Uploaded', value: newVendors.length, tone: 'emerald' },
          { label: 'Skipped', value: skippedCount, tone: skippedCount > 0 ? 'amber' : 'slate' },
        ],
      };
    });
  };

  const handleImportFileSelect = (file: File) => {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) {
      vendorUpload.fail('Select a CSV file. XLS/XLSX import is not enabled.');
      return;
    }
    if (!lower.endsWith('.csv') && file.type !== 'text/csv') {
      vendorUpload.fail('Select a valid .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processVendorCsvDirect(file.name, reader.result, file.size);
      }
    };
    reader.onerror = () => vendorUpload.fail('Unable to read the selected CSV file.');
    reader.readAsText(file);
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob(['\uFEFF' + VENDOR_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'FleetRobo_Vendor_Import_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Vendors (13 exact columns per Section 11)
  const openExportModal = (defaultScope: 'all' | 'selected') => {
    setExportScope(defaultScope === 'selected' && selectedVendorIds.size > 0 ? 'selected' : 'all');
    setExportFormat('csv');
    setExportError('');
    setActiveDialog('export');
  };

  const handleExecuteExport = () => {
    const recordsToExport =
      exportScope === 'selected'
        ? vendors.filter(v => selectedVendorIds.has(v.id))
        : vendors;

    if (recordsToExport.length === 0) {
      setExportError('No vendors in export scope.');
      return;
    }

    const headers = [
      'ID',
      'Internal ID',
      'Name',
      'Business ID',
      'Address',
      'Email',
      'Website URL',
      'Phone',
      'Type',
      'Country',
      'Status',
      'Date Created',
      'Date Updated',
    ];

    const rows = recordsToExport.map(v => {
      const plc = v.place_id ? placeMap.get(v.place_id) : undefined;
      return [
        v.public_id || '',
        v.internal_id || '',
        v.name || '',
        v.business_id || '',
        plc ? plc.address : '',
        v.email || '',
        v.website_url || '',
        v.phone || '',
        v.type || '',
        v.country || '',
        v.status || '',
        (v.created_at || '').slice(0, 10),
        (v.updated_at || '').slice(0, 10),
      ];
    });

    const escapeCsvCell = (val: string) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    if (exportFormat === 'csv') {
      const csvContent =
        '\uFEFF' +
        [headers.map(escapeCsvCell).join(','), ...rows.map(r => r.map(escapeCsvCell).join(','))].join(
          '\r\n'
        );
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FleetRobo_Vendors.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Browser SpreadsheetML (.xlsx download) with exact 13 columns
      const escapeXml = (s: string) =>
        String(s ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      const xmlRows = [headers, ...rows]
        .map(
          r =>
            `<Row>${r
              .map(cell => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`)
              .join('')}</Row>`
        )
        .join('');
      const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Vendors">
  <Table>${xmlRows}</Table>
 </Worksheet>
</Workbook>`;
      const blob = new Blob([workbookXml], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FleetRobo_Vendors.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    }

    setActiveDialog(null);
    showToast(
      `Exported ${recordsToExport.length} vendor${recordsToExport.length === 1 ? '' : 's'} to FleetRobo_Vendors.${exportFormat}`,
      'success'
    );
  };

  // Saved Views handlers
  const handleSaveCurrentView = () => {
    const trimmed = newSavedViewName.trim();
    if (!trimmed) {
      setSavedViewError('View name is required.');
      return;
    }
    if (trimmed.length > 40) {
      setSavedViewError('View name cannot exceed 40 characters.');
      return;
    }
    const snapshot: VendorSavedView = {
      name: trimmed,
      visible: [...visibleColumnKeys],
      filters: JSON.parse(JSON.stringify(appliedFilters)),
      filterMode,
      sortKey,
      sortDir,
      layout,
    };
    setSavedViews(prev => [...prev.filter(v => v.name !== trimmed), snapshot]);
    setNewSavedViewName('');
    setSavedViewError('');
    setActiveDialog(null);
    showToast(`Saved view "${trimmed}"`, 'success');
  };

  const handleApplySavedView = (view: VendorSavedView) => {
    setVisibleColumnKeys(view.visible.length > 0 ? view.visible : DEFAULT_VISIBLE_VENDOR_COLUMNS);
    setAppliedFilters(JSON.parse(JSON.stringify(view.filters || {})));
    setFilterMode(view.filterMode === 'ANY' ? 'ANY' : 'ALL');
    setSortKey(view.sortKey ?? '');
    setSortDir(view.sortDir === -1 ? -1 : 1);
    setLayout(view.layout === 'grid' ? 'grid' : 'table');
    setStatusTab('all');
    setPage(1);
    setShowSavedViewsPopover(false);
    showToast(`Applied saved view "${view.name}"`, 'info');
  };

  const handleDeleteSavedView = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedViews(prev => prev.filter(v => v.name !== name));
    showToast(`Removed saved view "${name}"`, 'info');
  };

  // Seed / Reset 20 demo vendors
  const handleSeedDemoVendors = () => {
    setVendors(INITIAL_DEMO_VENDORS);
    setPlaces(INITIAL_DEMO_PLACES);
    setAccounts(INITIAL_DEMO_ACCOUNTS);
    setContacts(INITIAL_DEMO_CONTACTS);
    setPage(1);
    showToast('Loaded 20 source demo vendors', 'success');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F8FAFC] text-slate-900 relative overflow-hidden select-none">
      {/* Ephemeral Toast Notification */}
      {toast && (
        <div
          className={`fixed top-16 right-6 z-[110] flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-medium transition-all ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : toast.type === 'info'
              ? 'bg-slate-900 border-slate-700 text-white'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Page Title & Subtitle Header (Matches Drivers & Vehicles) */}
      <div className="px-6 pt-5 pb-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vendor Master</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage external suppliers, service partners, integrated providers, primary Places, linked User Accounts, and Vendor personnel memberships.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSeedDemoVendors}
              title="Restore sample vendors"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw size={13} className="text-slate-500" />
              <span>Sample vendors</span>
            </button>

            <button
              type="button"
              onClick={openImportDrawer}
              title="Import Vendors from CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Upload size={14} className="text-slate-500" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={() => openExportModal('all')}
              title="Export Vendors"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileDown size={14} className="text-slate-500" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={openCreateVendorDrawer}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Create vendor</span>
            </button>
          </div>
        </div>

        {/* 2. Five Horizontal Status Tabs */}
        <div className="flex items-center justify-between mt-4 border-b border-slate-200 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-6">
            {(
              [
                { id: 'all', label: 'All vendors', count: tabCounts.all },
                { id: 'active', label: 'Active', count: tabCounts.active },
                { id: 'inactive', label: 'Inactive', count: tabCounts.inactive },
                { id: 'suspended', label: 'Suspended', count: tabCounts.suspended },
                { id: 'integrated', label: 'Integrated', count: tabCounts.integrated },
              ] as const
            ).map(t => {
              const active = statusTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setStatusTab(t.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 pb-2.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap relative ${
                    active ? 'text-[#FA8A63]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      active
                        ? 'bg-orange-100 text-[#FA8A63]'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.count}
                  </span>
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FA8A63] rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Directory Inner Toolbar (Matches Drivers & Vehicles) */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
        {/* Left Toolbar Group: Search, Filters & Saved Views */}
        <div className="flex items-center gap-2.5 flex-1 max-w-2xl min-w-0">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search Vendors (name, public ID, internal ID, email)..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#FA8A63] rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Drawer Trigger */}
          <button
            type="button"
            onClick={openFilterDrawer}
            title="Filter vendors (Basic / Advanced)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              appliedFilterCount > 0
                ? 'bg-orange-50 border-orange-200 text-[#FA8A63]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter size={13} />
            <span>Filters</span>
            {appliedFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#FA8A63] text-white text-[10px] font-bold flex items-center justify-center">
                {appliedFilterCount}
              </span>
            )}
          </button>

          {appliedFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setAppliedFilters({});
                setPage(1);
              }}
              className="text-[11px] text-slate-500 hover:text-red-600 font-semibold underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Reset
            </button>
          )}

          {/* Saved Views Popover */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowSavedViewsPopover(prev => !prev);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Bookmark size={13} className="text-slate-400" />
              <span>Views</span>
              {savedViews.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                  {savedViews.length}
                </span>
              )}
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {showSavedViewsPopover && (
              <div className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-[90] p-3">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center text-xs font-bold text-slate-800">
                    <span>Saved views</span>
                    <InfoTip text={VENDOR_TOOLTIPS.saved_views} align="left" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSavedViewsPopover(false);
                      setNewSavedViewName('');
                      setSavedViewError('');
                      setActiveDialog('saved-view');
                    }}
                    className="text-[11px] font-semibold text-[#FA8A63] hover:underline cursor-pointer"
                  >
                    + Save current view
                  </button>
                </div>

                {savedViews.length === 0 ? (
                  <div className="py-5 text-center text-xs text-slate-400">No saved views yet</div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {savedViews.map(sv => (
                      <div
                        key={sv.name}
                        onClick={() => handleApplySavedView(sv)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-xs cursor-pointer group"
                      >
                        <div>
                          <div className="font-semibold text-slate-800 group-hover:text-[#FA8A63]">
                            {sv.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {sv.visible.length} cols · {sv.layout} · {sv.filterMode}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={e => handleDeleteSavedView(sv.name, e)}
                          title="Delete saved view"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Toolbar Group: Bulk Actions, Customize Columns, View Switcher, Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={selectedVendorIds.size === 0}
            onClick={() => openBulkDeleteDrawer(Array.from(selectedVendorIds))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              selectedVendorIds.size > 0
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title="Apply bulk actions to selected vendors"
          >
            <SlidersHorizontal size={13} />
            <span>Bulk actions</span>
            {selectedVendorIds.size > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-purple-700 text-[10px] font-bold flex items-center justify-center">
                {selectedVendorIds.size}
              </span>
            )}
          </button>

          {/* Column Catalogue Popover */}
          <ColumnCataloguePopover
            columns={VENDOR_COLUMNS.map(col => ({
              key: col.key,
              label: col.label,
              category: col.group,
              required: col.key === 'name',
            }))}
            visibleKeys={visibleColumnKeys}
            onChangeVisibleKeys={setVisibleColumnKeys}
            defaultKeys={DEFAULT_VISIBLE_VENDOR_COLUMNS}
            defaultPinnedKeys={['name']}
            onToast={msg => showToast(msg, 'info')}
          />

          {/* Table / Grid Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setLayout('table')}
              title="Table view"
              className={`p-1 rounded-md transition-all cursor-pointer ${
                layout === 'table'
                  ? 'bg-white text-[#FA8A63] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setLayout('grid')}
              title="Grid view"
              className={`p-1 rounded-md transition-all cursor-pointer ${
                layout === 'grid'
                  ? 'bg-white text-[#FA8A63] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Grid size={14} />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => {
              setVendors(prev => [...prev]);
              showToast('Directory refreshed.', 'info');
            }}
            title="Refresh"
            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* 4. Optional Applied-Filter Chip Strip */}
      {appliedFilterCount > 0 && (
        <div className="bg-slate-50 px-5 py-2 border-b border-slate-200 flex items-center flex-wrap gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-slate-500">
            Active filters ({filterMode === 'ALL' ? 'Basic: Match ALL' : 'Advanced: Match ANY + Status AND'}):
          </span>
          {Object.entries(appliedFilters).map(([key, val]) => {
            if (!val) return null;
            if (Array.isArray(val) && val.length === 0) return null;
            if (typeof val === 'object' && !Array.isArray(val) && !val.from && !val.to) return null;
            const col = VENDOR_COLUMNS.find(c => c.key === key);
            if (!col) return null;

            let summary = '';
            if (Array.isArray(val)) {
              summary = val
                .map(v => (key === 'status' ? getVendorStatusMeta(v).label : v))
                .join(', ');
            } else if (typeof val === 'object') {
              summary = `${val.from || '…'} → ${val.to || '…'}`;
            } else {
              summary = String(val);
            }

            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] text-slate-700 shadow-2xs"
              >
                <span className="font-semibold text-slate-900">{col.label}:</span>
                <span className="truncate max-w-[180px]">{summary}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedFilters(prev => {
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                    setPage(1);
                  }}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setAppliedFilters({});
              setQuery('');
              setStatusTab('all');
              setPage(1);
            }}
            className="text-[11px] font-semibold text-[#FA8A63] hover:underline ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* 5. Optional Selection / Action Bar (Matches Drivers & Vehicles) */}
      {selectedVendorIds.size > 0 && (
        <div className="px-6 py-2 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800">{selectedVendorIds.size} selected</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 text-[11px]">Selection persists across pages</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openBulkDeleteDrawer(Array.from(selectedVendorIds))}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Review bulk delete</span>
            </button>
            <button
              type="button"
              onClick={() => openExportModal('selected')}
              className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-md shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown size={13} />
              <span>Export selected</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedVendorIds(new Set())}
              className="text-slate-500 hover:text-slate-800 font-semibold px-2 cursor-pointer"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* 6. Scrollable Table or Grid Directory (Matches Drivers & Vehicles) */}
      <div className="flex-1 min-h-0 overflow-auto bg-white">
        {vendors.length === 0 ? (
          /* V-001 Empty Database State */
          <div className="h-full flex flex-col items-center justify-center p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF3EE] text-[#FA8A63] flex items-center justify-center mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Add your first vendor</h2>
            <p className="text-xs text-slate-500 max-w-md mt-1 mb-5">
              Your Vendor Master directory is currently empty. Create a standard vendor or integrated provider, import a CSV file, or load the 20 source sample vendors.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={openCreateVendorDrawer}
                className="h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create vendor
              </button>
              <button
                type="button"
                onClick={openImportDrawer}
                className="h-8 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Import CSV
              </button>
              <button
                type="button"
                onClick={handleSeedDemoVendors}
                className="h-8 px-4 rounded-lg border border-[#FA8A63]/40 bg-[#FFF3EE] hover:bg-[#fee5d8] text-[#B85324] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Use sample vendors
              </button>
            </div>
          </div>
        ) : filteredVendors.length === 0 ? (
          /* V-007 Filtered Zero State */
          <div className="h-full flex flex-col items-center justify-center p-10 text-center">
            <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">No matching vendors</h2>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              No vendor records matched your current search, status tab, or filter criteria. Your underlying vendor database remains intact.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setAppliedFilters({});
                setStatusTab('all');
                setPage(1);
              }}
              className="h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold cursor-pointer"
            >
              Clear search and filters
            </button>
          </div>
        ) : layout === 'table' ? (
          /* Table Layout */
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs select-text">
              <thead className="bg-[#F8FAFC] sticky top-0 z-10 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                <tr>
                  <th className="sticky left-0 z-20 bg-[#F8FAFC] w-10 px-3 py-3 border-r border-slate-100 text-center">
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      ref={el => {
                        if (el) el.indeterminate = someCurrentPageSelected;
                      }}
                      onChange={toggleSelectCurrentPage}
                      aria-label="Select current page vendors"
                      className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer"
                    />
                  </th>
                  {visibleColumns.map(col => {
                    const isSorted = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        style={{ minWidth: col.width }}
                        onClick={() => {
                          if (isSorted) setSortDir(prev => (prev === 1 ? -1 : 1));
                          else {
                            setSortKey(col.key);
                            setSortDir(1);
                          }
                        }}
                        className="px-4 py-3 font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap select-none"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>{col.label}</span>
                          {isSorted && (
                            sortDir === 1 ? (
                              <ChevronUp size={12} className="text-[#FA8A63]" />
                            ) : (
                              <ChevronDown size={12} className="text-[#FA8A63]" />
                            )
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="w-16 px-4 py-3 text-right font-bold text-slate-700 sticky right-0 z-20 bg-[#F8FAFC] border-l border-slate-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentPageVendors.map(v => {
                  const isSelected = selectedVendorIds.has(v.id);
                  const plc = v.place_id ? placeMap.get(v.place_id) : undefined;
                  const acc = v.user_account_id ? accountMap.get(v.user_account_id) : undefined;

                  return (
                    <tr
                      key={v.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-[#FFF3EE]/60' : 'hover:bg-slate-50/90'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectSingle(v.id)}
                          aria-label={`Select ${v.name}`}
                          className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer"
                        />
                      </td>

                      {visibleColumns.map(col => {
                        if (col.key === 'name') {
                          return (
                            <td key={col.key} className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#FFF3EE] text-[#B85324] border border-[#FA8A63]/30 flex items-center justify-center text-[11px] font-bold shrink-0">
                                  {getInitials(v.name)}
                                </div>
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => openExistingVendorDrawer(v, 'view', 'Overview')}
                                    className="font-bold text-slate-900 hover:text-[#FA8A63] hover:underline text-left truncate block cursor-pointer"
                                  >
                                    {v.name}
                                  </button>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                    <span className="font-mono">{v.public_id}</span>
                                    <span>·</span>
                                    <span>{getVendorTypeLabel(v.type)}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'public_id' || col.key === 'internal_id') {
                          const idVal = v[col.key];
                          return (
                            <td key={col.key} className="px-3 py-2.5 font-mono text-[11px] text-slate-700">
                              <div className="inline-flex items-center gap-1.5">
                                <span>{idVal}</span>
                                <button
                                  type="button"
                                  onClick={e => handleCopyId(idVal, e)}
                                  title={`Copy ${idVal}`}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                                >
                                  {copiedIdText === idVal ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'place_id') {
                          return (
                            <td key={col.key} className="px-3 py-2.5">
                              {plc ? (
                                <div className="group relative inline-flex items-center gap-1.5 max-w-[200px]">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span
                                    title={`${plc.name} — ${plc.address}`}
                                    className="truncate text-slate-700 font-medium border-b border-dotted border-slate-300 cursor-help"
                                  >
                                    {plc.name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          );
                        }

                        if (col.key === 'type') {
                          return (
                            <td key={col.key} className="px-3 py-2.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                                  v.type === 'transporter'
                                    ? 'bg-[#FFF3EE] text-[#B85324] border border-[#FA8A63]/30'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {v.type === 'integrated_vendor' && (
                                  <Plug className="w-3 h-3 text-[#FA8A63]" />
                                )}
                                {v.type === 'transporter' && (
                                  <Truck className="w-3 h-3 text-[#FA8A63]" />
                                )}
                                {getVendorTypeLabel(v.type)}
                              </span>
                            </td>
                          );
                        }

                        if (col.key === 'status') {
                          return (
                            <td key={col.key} className="px-3 py-2.5">
                              <VendorStatusBadge status={v.status} />
                            </td>
                          );
                        }

                        if (col.key === 'account_status') {
                          return (
                            <td key={col.key} className="px-3 py-2.5">
                              {acc ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-semibold">
                                  <UserCheck className="w-3 h-3" /> Linked
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium">
                                  Not linked
                                </span>
                              )}
                            </td>
                          );
                        }

                        if (col.key === 'created_at' || col.key === 'updated_at') {
                          return (
                            <td key={col.key} className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                              {formatEnInDate(v[col.key])}
                            </td>
                          );
                        }

                        if (col.key === 'website_url') {
                          return (
                            <td key={col.key} className="px-3 py-2.5">
                              {v.website_url ? (
                                <span className="text-sky-600 truncate max-w-[180px] inline-block">
                                  {v.website_url}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          );
                        }

                        const val = getVendorFieldValue(v, col.key);
                        return (
                          <td key={col.key} className="px-3 py-2.5 text-slate-700">
                            {val || <span className="text-slate-400">—</span>}
                          </td>
                        );
                      })}

                      {/* Row Actions Kebab */}
                      <td className="px-3 py-2.5 text-right sticky right-0 bg-white/95 whitespace-nowrap">
                        <div className="inline-flex items-center justify-end">
                          <RowActionMenu
                            ariaLabel={`Actions for ${v.name}`}
                            items={[
                              {
                                id: 'view',
                                label: 'View details',
                                icon: <Eye className="w-3.5 h-3.5 text-slate-400" />,
                                onClick: () => openExistingVendorDrawer(v, 'view', 'Overview'),
                              },
                              {
                                id: 'edit',
                                label: 'Edit vendor',
                                icon: <Edit2 className="w-3.5 h-3.5 text-slate-400" />,
                                onClick: () => openExistingVendorDrawer(v, 'edit', 'Overview'),
                              },
                              {
                                id: 'personnel',
                                label: 'Personnel',
                                icon: <Users className="w-3.5 h-3.5 text-slate-400" />,
                                badge: v.personnel.length,
                                onClick: () => openExistingVendorDrawer(v, 'view', 'Personnel'),
                              },
                              {
                                id: 'account',
                                label: 'Manage User Account',
                                icon: <UserCheck className="w-3.5 h-3.5 text-slate-400" />,
                                onClick: () => openExistingVendorDrawer(v, 'edit', 'Overview'),
                              },
                              {
                                id: 'delete',
                                label: 'Delete vendor',
                                icon: <Trash2 className="w-3.5 h-3.5" />,
                                tone: 'danger',
                                dividerBefore: true,
                                onClick: () => openBulkDeleteDrawer([v.id]),
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
        ) : (
          /* Grid Layout (V-015) */
          <div className="p-6 grid grid-cols-3 gap-4 bg-[#F8FAFC]">
            {currentPageVendors.map(v => {
              const isSelected = selectedVendorIds.has(v.id);
              const plc = v.place_id ? placeMap.get(v.place_id) : undefined;
              return (
                <div
                  key={v.id}
                  className={`bg-white rounded-xl border p-4 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#FA8A63] ring-1 ring-[#FA8A63]/30 bg-[#FFF3EE]/20'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectSingle(v.id)}
                          className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer mt-0.5"
                        />
                        <div className="w-9 h-9 rounded-lg bg-[#FFF3EE] text-[#B85324] border border-[#FA8A63]/30 flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(v.name)}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openExistingVendorDrawer(v, 'view', 'Overview')}
                            className="text-xs font-bold text-slate-900 hover:text-[#FA8A63] truncate block text-left cursor-pointer"
                          >
                            {v.name}
                          </button>
                          <div className="text-[11px] text-slate-500 font-mono">{v.public_id}</div>
                        </div>
                      </div>
                      <VendorStatusBadge status={v.status} />
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-600 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Type:</span>
                        <span className="font-medium text-slate-800">{getVendorTypeLabel(v.type)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Primary Place:</span>
                        <span
                          title={plc ? plc.address : undefined}
                          className="font-medium text-slate-800 truncate max-w-[160px]"
                        >
                          {plc ? plc.name : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Personnel:</span>
                        <span className="font-medium text-slate-800">{v.personnel.length} linked</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => openExistingVendorDrawer(v, 'view', 'Overview')}
                      className="h-7 px-2.5 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openExistingVendorDrawer(v, 'edit', 'Overview')}
                        className="h-7 px-2.5 rounded-md bg-[#FFF3EE] text-[#B85324] hover:bg-[#fee5d8] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openBulkDeleteDrawer([v.id])}
                        title="Delete vendor"
                        className="h-7 w-7 rounded-md border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 inline-flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Directory Footer with Pagination & Records Counter (Matches Drivers & Vehicles) */}
      <div className="px-6 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
        <div className="flex items-center gap-4">
          <span>
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {filteredVendors.length === 0 ? 0 : pageStartIdx + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(pageStartIdx + pageSize, filteredVendors.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{filteredVendors.length}</span> vendors
            {filteredVendors.length !== vendors.length && ` (filtered from ${vendors.length} total)`}
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Per page:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value) as 10 | 25 | 50);
                setPage(1);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700 font-semibold focus:outline-none focus:border-[#FA8A63] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1 || filteredVendors.length === 0}
            onClick={() => setPage(1)}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="First page"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            type="button"
            disabled={safePage <= 1 || filteredVendors.length === 0}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="px-2 text-xs font-semibold text-slate-700">
            Page {safePage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={safePage >= totalPages || filteredVendors.length === 0}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Next page"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages || filteredVendors.length === 0}
            onClick={() => setPage(totalPages)}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Last page"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>

      {/* =====================================================================
          8. PAGE-LOCAL OVERLAYS: RIGHT DRAWERS & CENTERED DIALOGS
         ===================================================================== */}

      {/* 8.1 FILTER RIGHT-SIDE DRAWER */}
      {activeDrawer === 'filter' && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
          <div className="w-[440px] max-w-full h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            {/* Sticky Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Filter vendors</h2>
                <p className="text-[11px] text-slate-500">
                  Configure Basic (AND) or Advanced (OR + Status AND) directory criteria
                </p>
              </div>
              <button
                type="button"
                onClick={attemptCloseFilterDrawer}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode & Search Bar */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setFilterDraftMode('ALL')}
                    className={`h-7 px-3 rounded-md text-xs font-semibold cursor-pointer ${
                      filterDraftMode === 'ALL'
                        ? 'bg-[#FA8A63] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Basic (Match ALL)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDraftMode('ANY')}
                    className={`h-7 px-3 rounded-md text-xs font-semibold cursor-pointer ${
                      filterDraftMode === 'ANY'
                        ? 'bg-[#FA8A63] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Advanced (Match ANY)
                  </button>
                </div>
                <InfoTip
                  text={
                    filterDraftMode === 'ALL'
                      ? VENDOR_TOOLTIPS.basic_filters
                      : VENDOR_TOOLTIPS.advanced_filters
                  }
                  align="right"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filterSearchQuery}
                    onChange={e => setFilterSearchQuery(e.target.value)}
                    placeholder="Find a filter field..."
                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllFilters(prev => !prev)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                >
                  {showAllFilters ? 'Visible cols only' : 'Show all (18)'}
                </button>
                <InfoTip text={VENDOR_TOOLTIPS.show_all_filters} align="right" />
              </div>
            </div>

            {hasInvalidDateFilter && (
              <div className="px-5 py-2 bg-rose-50 border-b border-rose-200 text-[11px] text-rose-700 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Date range "From" cannot be later than "To". Please adjust before applying.</span>
              </div>
            )}

            {/* Scrollable Filter Groups */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {(
                [
                  'User Accounts',
                  'Vendor identity',
                  'Contact',
                  'Address',
                  'Operations',
                  'Audit',
                ] as const
              ).map(groupName => {
                const groupCols = VENDOR_COLUMNS.filter(col => {
                  if (col.group !== groupName) return false;
                  const isAppliedOrDraft = Boolean(
                    filterDraft[col.key] &&
                      (Array.isArray(filterDraft[col.key])
                        ? filterDraft[col.key].length > 0
                        : typeof filterDraft[col.key] === 'object'
                        ? filterDraft[col.key].from || filterDraft[col.key].to
                        : String(filterDraft[col.key]).trim().length > 0)
                  );
                  const visibleByDefault =
                    showAllFilters || visibleColumnKeys.includes(col.key) || isAppliedOrDraft;
                  if (!visibleByDefault) return false;
                  if (
                    filterSearchQuery.trim() &&
                    !col.label.toLowerCase().includes(filterSearchQuery.trim().toLowerCase())
                  ) {
                    return false;
                  }
                  return true;
                });

                if (groupCols.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {groupName}
                    </div>
                    {groupCols.map(col => {
                      const val = filterDraft[col.key];
                      const isExpanded = activeFilterFieldPopover === col.key;

                      // Compute multi options
                      let multiOptions: Array<{ value: string; label: string }> = [];
                      if (col.key === 'status') {
                        multiOptions = VENDOR_STATUS_CATALOG.map(s => ({
                          value: s.key,
                          label: s.label,
                        }));
                      } else if (col.key === 'type') {
                        multiOptions = VENDOR_TYPE_CATALOG.map(t => ({
                          value: t.label,
                          label: t.label,
                        }));
                      } else if (col.key === 'country' || col.key === 'account_country') {
                        multiOptions = VENDOR_COUNTRIES.map(c => ({ value: c, label: c }));
                      } else if (col.key === 'account_status') {
                        multiOptions = [
                          { value: 'Linked', label: 'Linked' },
                          { value: 'Not linked', label: 'Not linked' },
                        ];
                      } else if (col.key === 'account_role') {
                        multiOptions = VENDOR_ACCOUNT_ROLES.map(r => ({ value: r, label: r }));
                      }

                      const filteredMultiOptions =
                        multiOptions.length > 6 && filterOptionSearch.trim()
                          ? multiOptions.filter(o =>
                              o.label.toLowerCase().includes(filterOptionSearch.trim().toLowerCase())
                            )
                          : multiOptions;

                      return (
                        <div
                          key={col.key}
                          className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-xs font-semibold text-slate-800">{col.label}</span>
                              <InfoTip
                                text={`${col.meaning} (${col.filterHelp})`}
                                align="left"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterDraft(prev => {
                                    const next = { ...prev };
                                    delete next[col.key];
                                    return next;
                                  });
                                }}
                                className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                Clear
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterOptionSearch('');
                                  setActiveFilterFieldPopover(curr =>
                                    curr === col.key ? null : col.key
                                  );
                                }}
                                className="text-[11px] font-semibold text-[#FA8A63] hover:underline cursor-pointer"
                              >
                                {isExpanded ? 'Done' : 'Configure'}
                              </button>
                            </div>
                          </div>

                          {/* Filter input widget */}
                          {col.filterType === 'text' && (
                            <input
                              type="text"
                              value={val || ''}
                              onChange={e =>
                                setFilterDraft(prev => ({ ...prev, [col.key]: e.target.value }))
                              }
                              placeholder={`Search ${col.label.toLowerCase()}...`}
                              className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:border-[#FA8A63]"
                            />
                          )}

                          {col.filterType === 'multi' && (
                            <div className="space-y-1.5">
                              {multiOptions.length > 6 && (
                                <input
                                  type="text"
                                  value={filterOptionSearch}
                                  onChange={e => setFilterOptionSearch(e.target.value)}
                                  placeholder="Search options..."
                                  className="w-full h-7 px-2 rounded border border-slate-200 text-[11px]"
                                />
                              )}
                              <div className="max-h-36 overflow-y-auto grid grid-cols-2 gap-1 pt-1">
                                {filteredMultiOptions.map(opt => {
                                  const arr: string[] = Array.isArray(val) ? val : [];
                                  const checked = arr.includes(opt.value);
                                  return (
                                    <label
                                      key={opt.value}
                                      className="flex items-center gap-1.5 text-[11px] text-slate-700 hover:bg-slate-50 px-1.5 py-1 rounded cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          const nextArr = checked
                                            ? arr.filter(x => x !== opt.value)
                                            : [...arr, opt.value];
                                          setFilterDraft(prev => ({
                                            ...prev,
                                            [col.key]: nextArr,
                                          }));
                                        }}
                                        className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63]"
                                      />
                                      <span className="truncate">{opt.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {col.filterType === 'date' && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-0.5">
                                  From (YYYY-MM-DD)
                                </label>
                                <input
                                  type="date"
                                  value={val?.from || ''}
                                  onChange={e =>
                                    setFilterDraft(prev => ({
                                      ...prev,
                                      [col.key]: { ...(prev[col.key] || {}), from: e.target.value },
                                    }))
                                  }
                                  className="w-full h-7 px-2 rounded border border-slate-200 text-[11px]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-0.5">
                                  To (YYYY-MM-DD)
                                </label>
                                <input
                                  type="date"
                                  value={val?.to || ''}
                                  onChange={e =>
                                    setFilterDraft(prev => ({
                                      ...prev,
                                      [col.key]: { ...(prev[col.key] || {}), to: e.target.value },
                                    }))
                                  }
                                  className="w-full h-7 px-2 rounded border border-slate-200 text-[11px]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Sticky Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFilterDraft({});
                  setFilterDraftMode('ALL');
                }}
                className="text-xs font-semibold text-slate-600 hover:text-rose-600 cursor-pointer"
              >
                Clear all
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={attemptCloseFilterDrawer}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={hasInvalidDateFilter}
                  onClick={handleApplyFilters}
                  className="h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  Apply filters ({draftMatchCount} match{draftMatchCount === 1 ? '' : 'es'})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8.2 CREATE / EDIT / VIEW VENDOR WIDE RIGHT-SIDE DRAWER */}
      {activeDrawer === 'vendor' && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
          <div className="w-[740px] max-w-full h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            {/* Sticky Drawer Header */}
            <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {vendorFormMode === 'create'
                      ? 'Create a new vendor'
                      : vendorFormMode === 'edit'
                      ? 'Edit vendor'
                      : 'Vendor details'}
                  </h2>
                  {activeVendorRecord && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-semibold text-slate-700">
                      {activeVendorRecord.public_id}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {vendorFormMode === 'create'
                    ? 'Vendor Master · Configure optional platform account linkage and vendor classification'
                    : `${activeVendorRecord?.name || ''} · ${getVendorTypeLabel(
                        activeVendorRecord?.type || 'vendor'
                      )}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {vendorFormMode === 'view' && activeVendorRecord && (
                  <button
                    type="button"
                    onClick={() => setVendorFormMode('edit')}
                    className="h-8 px-3 rounded-lg bg-[#FFF3EE] text-[#B85324] hover:bg-[#fee5d8] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={attemptCloseVendorDrawer}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Saved Vendor Internal Two Tabs: Overview and Personnel */}
            {vendorFormMode !== 'create' && activeVendorRecord && (
              <div className="px-6 border-b border-slate-200 bg-slate-50/60 flex items-center gap-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('Overview')}
                  className={`relative py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                    activeDetailTab === 'Overview'
                      ? 'text-[#FA8A63]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Overview
                  {activeDetailTab === 'Overview' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#FA8A63] rounded-t-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('Personnel')}
                  className={`relative py-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeDetailTab === 'Personnel'
                      ? 'text-[#FA8A63]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Personnel</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 text-[10px]">
                    {activeVendorRecord.personnel.length}
                  </span>
                  {activeDetailTab === 'Personnel' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#FA8A63] rounded-t-full" />
                  )}
                </button>
              </div>
            )}

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {vendorFormError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{vendorFormError}</span>
                </div>
              )}

              {activeDetailTab === 'Overview' ? (
                <>
                  {/* 6.2 USER ACCOUNT LINKAGE BLOCK (First in Overview) */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          1. User account linkage
                        </h3>
                        <InfoTip text={VENDOR_TOOLTIPS.user_account_linkage} align="left" />
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          accountMode === 'skip'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : accountMode === 'new'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : selectedExistingAccountId
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {accountMode === 'skip'
                          ? 'Not linked'
                          : accountMode === 'new'
                          ? 'New account'
                          : selectedExistingAccountId
                          ? 'Linked account'
                          : 'Choose account'}
                      </span>
                    </div>

                    {/* Distinction Notice */}
                    <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600">
                      A <strong className="text-slate-800">Vendor</strong> is a business resource owned by Adani Port, distinct from a platform <strong className="text-slate-800">User Account</strong> login and from <strong className="text-slate-800">Personnel</strong> Contact memberships. In this prototype, User Account linkage is simulated locally; no authentication invite is sent.
                    </div>

                    {vendorFormMode !== 'view' && (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAccountMode('existing');
                              setVendorDirty(true);
                            }}
                            className={`h-7 px-3 rounded-md text-xs font-semibold cursor-pointer ${
                              accountMode === 'existing'
                                ? 'bg-[#FA8A63] text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Select existing user
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAccountMode('new');
                              setSelectedExistingAccountId(null);
                              setAccName('');
                              setAccEmail('');
                              setAccPhone('');
                              setAccCountry('India');
                              setAccRole('Vendor Admin');
                              setAccAvatar(undefined);
                              setVendorDirty(true);
                            }}
                            className={`h-7 px-3 rounded-md text-xs font-semibold cursor-pointer ${
                              accountMode === 'new'
                                ? 'bg-[#FA8A63] text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            + Create a new user
                          </button>
                        </div>

                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (accountMode === 'skip') {
                                setAccountMode('new');
                              } else {
                                setAccountMode('skip');
                                setSelectedExistingAccountId(null);
                              }
                              setVendorDirty(true);
                            }}
                            className="text-xs font-semibold text-[#FA8A63] hover:underline cursor-pointer"
                          >
                            {accountMode === 'skip'
                              ? '+ Link an account instead'
                              : 'Skip user account linkage for now'}
                          </button>
                          <InfoTip text={VENDOR_TOOLTIPS.skip_user_account} align="right" />
                        </div>
                      </div>
                    )}

                    {/* Existing Account Picker */}
                    {accountMode === 'existing' && vendorFormMode !== 'view' && (
                      <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700">
                            Search platform user accounts
                            <InfoTip text={VENDOR_TOOLTIPS.select_existing_user} align="left" />
                          </label>
                          <span className="text-[10px] text-slate-400">Max 30 matched results</span>
                        </div>
                        <input
                          type="text"
                          value={existingAccountSearch}
                          onChange={e => setExistingAccountSearch(e.target.value)}
                          placeholder="Search by user name, email, or phone..."
                          className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs"
                        />
                        {vendorFieldErrors.account_pick && (
                          <p className="text-[11px] text-rose-600">{vendorFieldErrors.account_pick}</p>
                        )}
                        <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-md">
                          {(() => {
                            const sq = existingAccountSearch.trim().toLowerCase();
                            const matched = accounts
                              .filter(
                                a =>
                                  !sq ||
                                  a.name.toLowerCase().includes(sq) ||
                                  a.email.toLowerCase().includes(sq) ||
                                  a.phone.toLowerCase().includes(sq)
                              )
                              .slice(0, 30);

                            if (matched.length === 0) {
                              return (
                                <div className="p-3 text-center text-xs text-slate-500">
                                  No matching platform user accounts found.{' '}
                                  <button
                                    type="button"
                                    onClick={() => setAccountMode('new')}
                                    className="text-[#FA8A63] font-semibold hover:underline cursor-pointer"
                                  >
                                    + Create a new user instead
                                  </button>
                                </div>
                              );
                            }

                            return matched.map(acc => {
                              const linkedVendor = vendors.find(
                                v => v.user_account_id === acc.id && v.id !== editingVendorId
                              );
                              const isSelected = selectedExistingAccountId === acc.id;
                              return (
                                <div
                                  key={acc.id}
                                  onClick={() => {
                                    if (linkedVendor) return;
                                    setSelectedExistingAccountId(acc.id);
                                    setAccName(acc.name);
                                    setAccEmail(acc.email);
                                    setAccPhone(acc.phone);
                                    setAccCountry(acc.country);
                                    setAccRole(acc.role);
                                    setAccAvatar(acc.avatarDataUrl);
                                    setAccPolicies(acc.policies || ['Vendor Base Access']);
                                    setAccPermissions(acc.permissions || ['vendors.view']);
                                    setVendorDirty(true);
                                  }}
                                  className={`px-3 py-2 flex items-center justify-between text-xs ${
                                    linkedVendor
                                      ? 'bg-slate-50 opacity-60 cursor-not-allowed'
                                      : isSelected
                                      ? 'bg-[#FFF3EE]/70 cursor-pointer'
                                      : 'hover:bg-slate-50 cursor-pointer'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                      {getInitials(acc.name)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-semibold text-slate-900 truncate">
                                        {acc.name}{' '}
                                        <span className="text-[10px] font-normal text-slate-500">
                                          ({acc.role})
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 truncate">
                                        {acc.email} · {acc.phone}
                                      </div>
                                    </div>
                                  </div>
                                  {linkedVendor ? (
                                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-semibold shrink-0">
                                      Linked ({linkedVendor.name})
                                    </span>
                                  ) : isSelected ? (
                                    <span className="px-2 py-0.5 rounded bg-[#FA8A63] text-white text-[10px] font-semibold shrink-0">
                                      Selected
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-[#FA8A63] font-semibold shrink-0">
                                      Select
                                    </span>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Account Profile Fields (when New or Existing Selected) */}
                    {accountMode !== 'skip' &&
                      (accountMode === 'new' || Boolean(selectedExistingAccountId)) && (
                        <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Name <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.account_name} align="left" />
                              </label>
                              <input
                                type="text"
                                disabled={vendorFormMode === 'view'}
                                value={accName}
                                onChange={e => {
                                  setAccName(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="Full name (min 2 chars)"
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                              />
                              {vendorFieldErrors.acc_name && (
                                <p className="text-[11px] text-rose-600 mt-0.5">
                                  {vendorFieldErrors.acc_name}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Email <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.account_email} align="right" />
                              </label>
                              <input
                                type="email"
                                disabled={vendorFormMode === 'view'}
                                value={accEmail}
                                onChange={e => {
                                  setAccEmail(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="user@company.example"
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                              />
                              {vendorFieldErrors.acc_email && (
                                <p className="text-[11px] text-rose-600 mt-0.5">
                                  {vendorFieldErrors.acc_email}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Country <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.account_country} align="left" />
                              </label>
                              <select
                                disabled={vendorFormMode === 'view'}
                                value={accCountry}
                                onChange={e => {
                                  setAccCountry(e.target.value as VendorCountry);
                                  setVendorDirty(true);
                                }}
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50"
                              >
                                {VENDOR_COUNTRIES.map(c => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Phone <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.account_phone} align="right" />
                              </label>
                              <input
                                type="tel"
                                disabled={vendorFormMode === 'view'}
                                value={accPhone}
                                onChange={e => {
                                  setAccPhone(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder={
                                  accCountry === 'India' ? '10 digits (or +91...)' : '7–15 digits'
                                }
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                              />
                              {vendorFieldErrors.acc_phone && (
                                <p className="text-[11px] text-rose-600 mt-0.5">
                                  {vendorFieldErrors.acc_phone}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Role <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.account_role} align="left" />
                              </label>
                              <select
                                disabled={vendorFormMode === 'view'}
                                value={accRole}
                                onChange={e => {
                                  setAccRole(e.target.value as AccountRole);
                                  setVendorDirty(true);
                                }}
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50"
                              >
                                {VENDOR_ACCOUNT_ROLES.map(r => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Upload image (optional)
                                <InfoTip text={VENDOR_TOOLTIPS.upload_image} align="right" />
                              </label>
                              <div className="flex items-center gap-2">
                                {accAvatar && (
                                  <img
                                    src={accAvatar}
                                    alt="Avatar preview"
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                )}
                                {vendorFormMode !== 'view' && (
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg"
                                    onChange={handleAvatarUpload}
                                    className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                                  />
                                )}
                              </div>
                              {vendorFieldErrors.acc_avatar && (
                                <p className="text-[11px] text-rose-600 mt-0.5">
                                  {vendorFieldErrors.acc_avatar}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* SOURCE GAP — OPTIONAL: Attached Policies & Permissions viewer */}
                          <div className="pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-slate-600">
                                  Account Policies ({accPolicies.length}/8) & Permissions ({accPermissions.length}/14)
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-bold">
                                  SOURCE GAP — OPTIONAL
                                </span>
                                <InfoTip text={VENDOR_TOOLTIPS.attached_policies} align="left" />
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowOptionalAccessPanel(prev => !prev)}
                                className="text-[11px] font-semibold text-[#FA8A63] hover:underline cursor-pointer"
                              >
                                {showOptionalAccessPanel ? 'Hide catalog' : 'Inspect source catalog'}
                              </button>
                            </div>

                            {showOptionalAccessPanel && (
                              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 text-[11px]">
                                <p className="text-slate-500">
                                  In the original prototype source, <code className="font-mono">vendorPolicyCatalog</code> (8) and <code className="font-mono">vendorPermissionCatalog</code> (14) exist in data helpers while the active form editor is dormant. No real IAM enforcement occurs.
                                </p>
                                <div>
                                  <div className="font-semibold text-slate-700 mb-1">
                                    Attached policies
                                    <InfoTip text={VENDOR_TOOLTIPS.attached_policies} align="left" />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {VENDOR_POLICY_CATALOG.map(pol => {
                                      const active = accPolicies.includes(pol);
                                      return (
                                        <button
                                          key={pol}
                                          type="button"
                                          disabled={vendorFormMode === 'view'}
                                          onClick={() => {
                                            setAccPolicies(prev =>
                                              prev.includes(pol)
                                                ? prev.filter(p => p !== pol)
                                                : [...prev, pol]
                                            );
                                            setVendorDirty(true);
                                          }}
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer ${
                                            active
                                              ? 'bg-[#FFF3EE] text-[#B85324] border-[#FA8A63]'
                                              : 'bg-white text-slate-500 border-slate-200'
                                          }`}
                                        >
                                          {pol}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <div className="font-semibold text-slate-700 mb-1">
                                    Selected permissions
                                    <InfoTip text={VENDOR_TOOLTIPS.selected_permissions} align="left" />
                                  </div>
                                  <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                                    {VENDOR_PERMISSION_CATALOG.map(perm => {
                                      const checked = accPermissions.includes(perm.key);
                                      return (
                                        <label
                                          key={perm.key}
                                          className="flex items-center gap-1.5 text-[10px] text-slate-700 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            disabled={vendorFormMode === 'view'}
                                            checked={checked}
                                            onChange={() => {
                                              setAccPermissions(prev =>
                                                prev.includes(perm.key)
                                                  ? prev.filter(k => k !== perm.key)
                                                  : [...prev, perm.key]
                                              );
                                              setVendorDirty(true);
                                            }}
                                            className="rounded border-slate-300 text-[#FA8A63]"
                                          />
                                          <span className="truncate">{perm.label}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* VENDOR CLASSIFICATION CARDS (Shown only on fresh Create per Section 4 & 6.1) */}
                  {vendorFormMode === 'create' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                        2. Vendor classification
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          onClick={() => {
                            setVendorBranch('standard');
                            setVendorDirty(true);
                          }}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            vendorBranch === 'standard'
                              ? 'border-[#FA8A63] bg-[#FFF3EE]/60 ring-1 ring-[#FA8A63]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-900">Standard Vendor</span>
                            <InfoTip text={VENDOR_TOOLTIPS.standard_vendor} align="left" />
                          </div>
                          <p className="text-[11px] text-slate-600">
                            Ordinary business supplier or service partner with contact details, country, primary Place, and Personnel.
                          </p>
                        </div>

                        <div
                          onClick={() => {
                            setVendorBranch('integrated');
                            // Source can skip a still-blank new platform user account when switching to Integrated Provider
                            if (accountMode === 'new' && !accName.trim() && !accEmail.trim() && !accPhone.trim()) {
                              setAccountMode('skip');
                            }
                            setVendorDirty(true);
                          }}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            vendorBranch === 'integrated'
                              ? 'border-[#FA8A63] bg-[#FFF3EE]/60 ring-1 ring-[#FA8A63]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-900">Integrated Provider</span>
                            <InfoTip text={VENDOR_TOOLTIPS.integrated_provider} align="right" />
                          </div>
                          <p className="text-[11px] text-slate-600">
                            Illustrative provider-specific configuration schema (Telematics API or Carrier Network demo).
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BRANCH A: STANDARD VENDOR vs TRANSPORTER SINGLE LONG FORM */}
                  {vendorBranch === 'standard' ? (
                    formType === 'transporter' ? (
                      /* CONTINUOUS SCROLLABLE TRANSPORTER FORM — SECTIONS A THROUGH F (NO ACCORDIONS, NO STEPPERS, NO OPERATIONAL RELATIONSHIPS) */
                      <div className="space-y-4">
                        {/* SECTION A: ORGANISATION & IDENTITY */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-[#FFF3EE] text-[#FA8A63] inline-flex items-center justify-center text-[11px] font-bold">
                                A
                              </span>
                              Organisation & Identity
                            </h3>
                            <span className="px-2 py-0.5 rounded bg-[#FFF3EE] text-[#B85324] text-[10px] font-semibold border border-[#FA8A63]/30">
                              Canonical Transporter Vendor
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Company Name
                                <InfoTip text={VENDOR_TOOLTIPS.company_name} align="left" />
                              </label>
                              <input
                                type="text"
                                disabled={vendorFormMode === 'view'}
                                value={trnCompanyName}
                                onChange={e => {
                                  setTrnCompanyName(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="e.g. Adani Port"
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Client Name
                                <InfoTip text={VENDOR_TOOLTIPS.client_name} align="right" />
                              </label>
                              <input
                                type="text"
                                disabled={vendorFormMode === 'view'}
                                value={trnClientName}
                                onChange={e => {
                                  setTrnClientName(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="e.g. Adani Logistics"
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Vendor / Transporter Name <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.vendor_name} align="left" />
                              </label>
                              <input
                                type="text"
                                maxLength={191}
                                disabled={vendorFormMode === 'view'}
                                value={formName}
                                onChange={e => {
                                  setFormName(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="Enter transporter / vendor name..."
                                className={`w-full h-8 px-2.5 rounded-md border text-xs disabled:bg-slate-50 ${
                                  vendorFieldErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.name && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.name}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Transporter Code (Legacy Ref)
                                <InfoTip text={VENDOR_TOOLTIPS.transporter_code} align="right" />
                              </label>
                              <input
                                type="text"
                                disabled={vendorFormMode === 'view'}
                                value={trnCode}
                                onChange={e => {
                                  setTrnCode(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="e.g. TRN-WL-001"
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs font-mono disabled:bg-slate-50"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Vendor Type <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.vendor_type} align="left" />
                              </label>
                              <select
                                disabled={vendorFormMode === 'view'}
                                value={formType}
                                onChange={e => {
                                  setFormType(e.target.value as VendorTypeKey);
                                  setVendorDirty(true);
                                }}
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50"
                              >
                                {VENDOR_TYPE_CATALOG.filter(t => t.standardSelectable).map(t => (
                                  <option key={t.key} value={t.key}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Vendor Status & Active
                                <InfoTip text={VENDOR_TOOLTIPS.is_active} align="right" />
                              </label>
                              <div className="flex items-center gap-2.5">
                                <select
                                  disabled={vendorFormMode === 'view'}
                                  value={formStatus}
                                  onChange={e => {
                                    const nextStatus = e.target.value as VendorStatusKey;
                                    setFormStatus(nextStatus);
                                    setTrnIsActive(nextStatus !== 'inactive' && nextStatus !== 'terminated' && nextStatus !== 'suspended' && nextStatus !== 'blacklisted');
                                    setVendorDirty(true);
                                  }}
                                  className="flex-1 h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50"
                                >
                                  {VENDOR_STATUS_CATALOG.map(s => (
                                    <option key={s.key} value={s.key}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    disabled={vendorFormMode === 'view'}
                                    checked={trnIsActive}
                                    onChange={e => {
                                      const checked = e.target.checked;
                                      setTrnIsActive(checked);
                                      setFormStatus(checked ? 'active' : 'inactive');
                                      setVendorDirty(true);
                                    }}
                                    className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63]"
                                  />
                                  <span>Active</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Transporter Logo Upload */}
                          <div className="pt-1">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Transporter Logo
                              <InfoTip text={VENDOR_TOOLTIPS.transporter_logo} align="left" />
                            </label>
                            <div className="flex items-center gap-3">
                              {trnLogoDataUrl ? (
                                <img
                                  src={trnLogoDataUrl}
                                  alt="Transporter logo"
                                  className="w-11 h-11 rounded-lg object-contain border border-slate-200 bg-slate-50 p-0.5 shrink-0"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                                  LOGO
                                </div>
                              )}
                              {vendorFormMode !== 'view' && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/svg+xml"
                                    onChange={handleTransporterLogoUpload}
                                    className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                                  />
                                  {trnLogoDataUrl && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTrnLogoDataUrl(undefined);
                                        setVendorDirty(true);
                                      }}
                                      className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                                    >
                                      Remove logo
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            {vendorFieldErrors.trn_logo && (
                              <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.trn_logo}</p>
                            )}
                          </div>
                        </div>

                        {/* SECTION B: REGISTERED ADDRESS */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="w-5 h-5 rounded-full bg-[#FFF3EE] text-[#FA8A63] inline-flex items-center justify-center text-[11px] font-bold">
                              B
                            </span>
                            Registered Address
                          </h3>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Country <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.country} align="left" />
                              </label>
                              <select
                                disabled={vendorFormMode === 'view'}
                                value={formCountry}
                                onChange={e => {
                                  const nextCountry = e.target.value as VendorCountry;
                                  setFormCountry(nextCountry);
                                  const nextStates = getStatesForCountry(nextCountry);
                                  const nextState = nextStates.includes(trnRegState) ? trnRegState : '';
                                  setTrnRegState(nextState);
                                  const nextCities = getCitiesForState(nextCountry, nextState);
                                  const nextCity = nextCities.includes(trnRegCity) ? trnRegCity : '';
                                  setTrnRegCity(nextCity);
                                  if (trnBillingSame) {
                                    setTrnBillCountry(nextCountry);
                                    setTrnBillState(nextState);
                                    setTrnBillCity(nextCity);
                                  }
                                  setVendorDirty(true);
                                }}
                                className={`w-full h-8 px-2.5 rounded-md border bg-white text-xs disabled:bg-slate-50 ${
                                  vendorFieldErrors.reg_country ? 'border-rose-400' : 'border-slate-200'
                                }`}
                              >
                                {VENDOR_COUNTRIES.map(c => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              {vendorFieldErrors.reg_country && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.reg_country}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                State <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.reg_state} align="right" />
                              </label>
                              {(() => {
                                const stateOptions = getStatesForCountry(formCountry);
                                const hasCustom = Boolean(trnRegState && !stateOptions.includes(trnRegState));
                                return (
                                  <select
                                    disabled={vendorFormMode === 'view'}
                                    value={trnRegState}
                                    onChange={e => {
                                      const nextState = e.target.value;
                                      setTrnRegState(nextState);
                                      const nextCities = getCitiesForState(formCountry, nextState);
                                      const nextCity = nextCities.includes(trnRegCity) ? trnRegCity : '';
                                      setTrnRegCity(nextCity);
                                      if (trnBillingSame) {
                                        setTrnBillState(nextState);
                                        setTrnBillCity(nextCity);
                                      }
                                      setVendorDirty(true);
                                    }}
                                    className={`w-full h-8 px-2.5 rounded-md border bg-white text-xs disabled:bg-slate-50 ${
                                      vendorFieldErrors.reg_state ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                                    }`}
                                  >
                                    <option value="">Select State...</option>
                                    {stateOptions.map(st => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                    {hasCustom && <option value={trnRegState}>{trnRegState}</option>}
                                  </select>
                                );
                              })()}
                              {vendorFieldErrors.reg_state && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.reg_state}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                City
                                <InfoTip text={VENDOR_TOOLTIPS.reg_city} align="left" />
                              </label>
                              {(() => {
                                const cityOptions = getCitiesForState(formCountry, trnRegState);
                                const hasCustom = Boolean(trnRegCity && !cityOptions.includes(trnRegCity));
                                return (
                                  <select
                                    disabled={vendorFormMode === 'view' || !trnRegState}
                                    value={trnRegCity}
                                    onChange={e => {
                                      const nextCity = e.target.value;
                                      setTrnRegCity(nextCity);
                                      if (trnBillingSame) setTrnBillCity(nextCity);
                                      setVendorDirty(true);
                                    }}
                                    className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50"
                                  >
                                    <option value="">{trnRegState ? 'Select City...' : 'Select State first'}</option>
                                    {cityOptions.map(ct => (
                                      <option key={ct} value={ct}>
                                        {ct}
                                      </option>
                                    ))}
                                    {hasCustom && <option value={trnRegCity}>{trnRegCity}</option>}
                                  </select>
                                );
                              })()}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                PinCode
                                <InfoTip text={VENDOR_TOOLTIPS.reg_pincode} align="right" />
                              </label>
                              <input
                                type="text"
                                disabled={vendorFormMode === 'view'}
                                value={trnRegPincode}
                                onChange={e => {
                                  const nextPin = e.target.value;
                                  setTrnRegPincode(nextPin);
                                  if (trnBillingSame) setTrnBillPincode(nextPin);
                                  setVendorDirty(true);
                                }}
                                placeholder="e.g. 370421"
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Address <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.reg_address} align="left" />
                              </label>
                              <textarea
                                rows={2}
                                disabled={vendorFormMode === 'view'}
                                value={trnRegAddress}
                                onChange={e => {
                                  const nextAddr = e.target.value;
                                  setTrnRegAddress(nextAddr);
                                  if (trnBillingSame) setTrnBillAddress(nextAddr);
                                  setVendorDirty(true);
                                }}
                                placeholder="Enter full registered street address..."
                                className={`w-full px-2.5 py-1.5 rounded-md border text-xs disabled:bg-slate-50 ${
                                  vendorFieldErrors.reg_address ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.reg_address && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.reg_address}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Address Coordinates — Latitude
                                <InfoTip text={VENDOR_TOOLTIPS.reg_coordinates} align="left" />
                              </label>
                              <input
                                type="text"
                                disabled={vendorFormMode === 'view'}
                                value={trnRegLat}
                                onChange={e => {
                                  setTrnRegLat(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="e.g. 22.8396"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs font-mono disabled:bg-slate-50 ${
                                  vendorFieldErrors.reg_lat ? 'border-rose-400' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.reg_lat && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.reg_lat}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Address Coordinates — Longitude
                                <InfoTip text={VENDOR_TOOLTIPS.reg_coordinates} align="right" />
                              </label>
                              <input
                                type="text"
                                disabled={vendorFormMode === 'view'}
                                value={trnRegLng}
                                onChange={e => {
                                  setTrnRegLng(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="e.g. 69.7241"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs font-mono disabled:bg-slate-50 ${
                                  vendorFieldErrors.reg_lng ? 'border-rose-400' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.reg_lng && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.reg_lng}</p>
                              )}
                            </div>
                          </div>

                          {/* Linked Primary Place (Place Master compatibility) */}
                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Primary Place (Place Master link)
                                  <InfoTip text={VENDOR_TOOLTIPS.primary_place} align="left" />
                                </label>
                                <select
                                  disabled={vendorFormMode === 'view'}
                                  value={formPlaceId}
                                  onChange={e => {
                                    setFormPlaceId(e.target.value);
                                    setVendorDirty(true);
                                  }}
                                  className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50"
                                >
                                  <option value="">No primary Place linked</option>
                                  {places.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.country})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {vendorFormMode !== 'view' && (
                                <div className="flex items-center gap-1.5 pt-5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={openCreatePlaceModal}
                                    className="h-8 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
                                  >
                                    + New place
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!formPlaceId}
                                    onClick={openEditPlaceModal}
                                    className="h-8 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-[11px] font-semibold text-slate-700 cursor-pointer"
                                  >
                                    Edit place
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SECTION C: BILLING DETAILS */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-[#FFF3EE] text-[#FA8A63] inline-flex items-center justify-center text-[11px] font-bold">
                                C
                              </span>
                              Billing Details
                            </h3>
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={vendorFormMode === 'view'}
                                checked={trnBillingSame}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  setTrnBillingSame(checked);
                                  if (checked) {
                                    setTrnBillCountry(formCountry);
                                    setTrnBillState(trnRegState);
                                    setTrnBillCity(trnRegCity);
                                    setTrnBillPincode(trnRegPincode);
                                    setTrnBillAddress(trnRegAddress);
                                  }
                                  setVendorDirty(true);
                                }}
                                className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63]"
                              />
                              <span>Billing address same as registered address</span>
                              <InfoTip text={VENDOR_TOOLTIPS.billing_same} align="right" />
                            </label>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Billing Country
                              </label>
                              <select
                                disabled={vendorFormMode === 'view' || trnBillingSame}
                                value={trnBillingSame ? formCountry : trnBillCountry}
                                onChange={e => {
                                  const nextC = e.target.value as VendorCountry;
                                  setTrnBillCountry(nextC);
                                  setTrnBillState('');
                                  setTrnBillCity('');
                                  setVendorDirty(true);
                                }}
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50 disabled:text-slate-500"
                              >
                                {VENDOR_COUNTRIES.map(c => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Billing State
                              </label>
                              {(() => {
                                const cVal = trnBillingSame ? formCountry : trnBillCountry;
                                const sVal = trnBillingSame ? trnRegState : trnBillState;
                                const stateOpts = getStatesForCountry(cVal);
                                const hasCustom = Boolean(sVal && !stateOpts.includes(sVal));
                                return (
                                  <select
                                    disabled={vendorFormMode === 'view' || trnBillingSame}
                                    value={sVal}
                                    onChange={e => {
                                      setTrnBillState(e.target.value);
                                      setTrnBillCity('');
                                      setVendorDirty(true);
                                    }}
                                    className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50 disabled:text-slate-500"
                                  >
                                    <option value="">Select Billing State...</option>
                                    {stateOpts.map(st => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                    {hasCustom && <option value={sVal}>{sVal}</option>}
                                  </select>
                                );
                              })()}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Billing City
                              </label>
                              {(() => {
                                const cVal = trnBillingSame ? formCountry : trnBillCountry;
                                const sVal = trnBillingSame ? trnRegState : trnBillState;
                                const ctVal = trnBillingSame ? trnRegCity : trnBillCity;
                                const cityOpts = getCitiesForState(cVal, sVal);
                                const hasCustom = Boolean(ctVal && !cityOpts.includes(ctVal));
                                return (
                                  <select
                                    disabled={vendorFormMode === 'view' || trnBillingSame || !sVal}
                                    value={ctVal}
                                    onChange={e => {
                                      setTrnBillCity(e.target.value);
                                      setVendorDirty(true);
                                    }}
                                    className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50 disabled:text-slate-500"
                                  >
                                    <option value="">{sVal ? 'Select Billing City...' : 'Select State first'}</option>
                                    {cityOpts.map(ct => (
                                      <option key={ct} value={ct}>
                                        {ct}
                                      </option>
                                    ))}
                                    {hasCustom && <option value={ctVal}>{ctVal}</option>}
                                  </select>
                                );
                              })()}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Billing Pincode
                              </label>
                              <input
                                type="text"
                                disabled={vendorFormMode === 'view' || trnBillingSame}
                                value={trnBillingSame ? trnRegPincode : trnBillPincode}
                                onChange={e => {
                                  setTrnBillPincode(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="e.g. 370421"
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50 disabled:text-slate-500"
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Billing Address
                              </label>
                              <textarea
                                rows={2}
                                disabled={vendorFormMode === 'view' || trnBillingSame}
                                value={trnBillingSame ? trnRegAddress : trnBillAddress}
                                onChange={e => {
                                  setTrnBillAddress(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="Enter billing street address..."
                                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50 disabled:text-slate-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* SECTION D: PRIMARY & ADDITIONAL CONTACTS */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="w-5 h-5 rounded-full bg-[#FFF3EE] text-[#FA8A63] inline-flex items-center justify-center text-[11px] font-bold">
                              D
                            </span>
                            Primary & Additional Contacts
                          </h3>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Company Phone No.
                                <InfoTip text={VENDOR_TOOLTIPS.company_phone} align="left" />
                              </label>
                              <input
                                type="tel"
                                disabled={vendorFormMode === 'view'}
                                value={trnCompanyPhone}
                                onChange={e => {
                                  setTrnCompanyPhone(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="e.g. 02838-224100"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs disabled:bg-slate-50 ${
                                  vendorFieldErrors.company_phone ? 'border-rose-400' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.company_phone && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.company_phone}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Contact Person
                                <InfoTip text={VENDOR_TOOLTIPS.contact_person} align="right" />
                              </label>
                              <input
                                type="text"
                                disabled={vendorFormMode === 'view'}
                                value={trnContactPerson}
                                onChange={e => {
                                  setTrnContactPerson(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="Primary contact name"
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Contact No. <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.contact_no} align="left" />
                              </label>
                              <input
                                type="tel"
                                disabled={vendorFormMode === 'view'}
                                value={trnContactNo}
                                onChange={e => {
                                  setTrnContactNo(e.target.value);
                                  setFormPhone(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="+91 98200 12345"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs disabled:bg-slate-50 ${
                                  vendorFieldErrors.contact_no ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.contact_no && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.contact_no}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Alternate Contact No.
                                <InfoTip text={VENDOR_TOOLTIPS.alt_contact_no} align="right" />
                              </label>
                              <input
                                type="tel"
                                disabled={vendorFormMode === 'view'}
                                value={trnAltContactNo}
                                onChange={e => {
                                  setTrnAltContactNo(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="Optional alternate number"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs disabled:bg-slate-50 ${
                                  vendorFieldErrors.alt_contact_no ? 'border-rose-400' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.alt_contact_no && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.alt_contact_no}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Contact Email ID
                                <InfoTip text={VENDOR_TOOLTIPS.contact_email} align="left" />
                              </label>
                              <input
                                type="email"
                                disabled={vendorFormMode === 'view'}
                                value={trnContactEmail}
                                onChange={e => {
                                  setTrnContactEmail(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="contact@transporter.in"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs disabled:bg-slate-50 ${
                                  vendorFieldErrors.contact_email ? 'border-rose-400' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.contact_email && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.contact_email}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Mobile No. <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.mobile_no} align="right" />
                              </label>
                              <input
                                type="tel"
                                disabled={vendorFormMode === 'view'}
                                value={trnMobileNo}
                                onChange={e => {
                                  setTrnMobileNo(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="e.g. 9820012345"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs disabled:bg-slate-50 ${
                                  vendorFieldErrors.mobile_no ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.mobile_no && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.mobile_no}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Email ID <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.email} align="left" />
                              </label>
                              <input
                                type="email"
                                disabled={vendorFormMode === 'view'}
                                value={formEmail}
                                onChange={e => {
                                  setFormEmail(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="ops@transporter.in"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs disabled:bg-slate-50 ${
                                  vendorFieldErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.email && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.email}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Alternate Email ID
                                <InfoTip text={VENDOR_TOOLTIPS.alt_email} align="right" />
                              </label>
                              <input
                                type="email"
                                disabled={vendorFormMode === 'view'}
                                value={trnAltEmail}
                                onChange={e => {
                                  setTrnAltEmail(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="dispatch@transporter.in"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs disabled:bg-slate-50 ${
                                  vendorFieldErrors.alt_email ? 'border-rose-400' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.alt_email && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.alt_email}</p>
                              )}
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Website URL
                                <InfoTip text={VENDOR_TOOLTIPS.website_url} align="left" />
                              </label>
                              <input
                                type="url"
                                disabled={vendorFormMode === 'view'}
                                value={formWebsite}
                                onChange={e => {
                                  setFormWebsite(e.target.value);
                                  setVendorDirty(true);
                                }}
                                placeholder="https://transporter.example"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs disabled:bg-slate-50 ${
                                  vendorFieldErrors.website_url ? 'border-rose-400' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.website_url && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.website_url}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SECTION E: TAX & LEGAL INFORMATION */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="w-5 h-5 rounded-full bg-[#FFF3EE] text-[#FA8A63] inline-flex items-center justify-center text-[11px] font-bold">
                              E
                            </span>
                            Tax & Legal Information
                          </h3>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                PAN No.
                                <InfoTip text={VENDOR_TOOLTIPS.pan_no} align="left" />
                              </label>
                              <input
                                type="text"
                                maxLength={10}
                                disabled={vendorFormMode === 'view'}
                                value={trnPanNo}
                                onChange={e => {
                                  setTrnPanNo(e.target.value.toUpperCase());
                                  setVendorDirty(true);
                                }}
                                placeholder="AAACW1234F"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs font-mono uppercase disabled:bg-slate-50 ${
                                  vendorFieldErrors.pan_no ? 'border-rose-400' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.pan_no && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.pan_no}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                GST No.
                                <InfoTip text={VENDOR_TOOLTIPS.gst_no} align="center" />
                              </label>
                              <input
                                type="text"
                                maxLength={15}
                                disabled={vendorFormMode === 'view'}
                                value={trnGstNo}
                                onChange={e => {
                                  setTrnGstNo(e.target.value.toUpperCase());
                                  setVendorDirty(true);
                                }}
                                placeholder="24AAACW1234F1Z5"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs font-mono uppercase disabled:bg-slate-50 ${
                                  vendorFieldErrors.gst_no ? 'border-rose-400' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.gst_no && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.gst_no}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                CIN No.
                                <InfoTip text={VENDOR_TOOLTIPS.cin_no} align="right" />
                              </label>
                              <input
                                type="text"
                                maxLength={21}
                                disabled={vendorFormMode === 'view'}
                                value={trnCinNo}
                                onChange={e => {
                                  setTrnCinNo(e.target.value.toUpperCase());
                                  setVendorDirty(true);
                                }}
                                placeholder="U63011GJ2012PTC071420"
                                className={`w-full h-8 px-2.5 rounded-md border text-xs font-mono uppercase disabled:bg-slate-50 ${
                                  vendorFieldErrors.cin_no ? 'border-rose-400' : 'border-slate-200'
                                }`}
                              />
                              {vendorFieldErrors.cin_no && (
                                <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.cin_no}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SECTION F: CONTRACT & COMPLIANCE (Final section of the form — no Operational Relationships) */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="w-5 h-5 rounded-full bg-[#FFF3EE] text-[#FA8A63] inline-flex items-center justify-center text-[11px] font-bold">
                              F
                            </span>
                            Contract & Compliance
                          </h3>

                          <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={vendorFormMode === 'view'}
                              checked={trnContractSigned}
                              onChange={e => {
                                setTrnContractSigned(e.target.checked);
                                setVendorDirty(true);
                              }}
                              className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63]"
                            />
                            <span>Is Contract Signed</span>
                            <InfoTip text={VENDOR_TOOLTIPS.is_contract_signed} align="left" />
                          </label>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-4">
                      {/* 6.3 Vendor Identity Section */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Vendor identity
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-3 sm:col-span-1">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Vendor Name <span className="text-rose-500">*</span>
                              <InfoTip text={VENDOR_TOOLTIPS.vendor_name} align="left" />
                            </label>
                            <input
                              type="text"
                              maxLength={191}
                              disabled={vendorFormMode === 'view'}
                              value={formName}
                              onChange={e => {
                                setFormName(e.target.value);
                                setVendorDirty(true);
                              }}
                              placeholder="Enter business name..."
                              className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                            />
                            {vendorFieldErrors.name && (
                              <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.name}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Vendor Type <span className="text-rose-500">*</span>
                              <InfoTip text={VENDOR_TOOLTIPS.vendor_type} align="center" />
                            </label>
                            <select
                              disabled={vendorFormMode === 'view'}
                              value={formType}
                              onChange={e => {
                                setFormType(e.target.value as VendorTypeKey);
                                setVendorDirty(true);
                              }}
                              className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50"
                            >
                              {VENDOR_TYPE_CATALOG.filter(t => t.standardSelectable).map(t => (
                                <option key={t.key} value={t.key}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            {vendorFieldErrors.type && (
                              <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.type}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Vendor Status
                              <InfoTip text={VENDOR_TOOLTIPS.vendor_status} align="right" />
                            </label>
                            <select
                              disabled={vendorFormMode === 'view'}
                              value={formStatus}
                              onChange={e => {
                                setFormStatus(e.target.value as VendorStatusKey);
                                setVendorDirty(true);
                              }}
                              className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50"
                            >
                              {VENDOR_STATUS_CATALOG.map(s => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* 6.4 Contact Details Section */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Contact details
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Email
                              <InfoTip text={VENDOR_TOOLTIPS.email} align="left" />
                            </label>
                            <input
                              type="email"
                              disabled={vendorFormMode === 'view'}
                              value={formEmail}
                              onChange={e => {
                                setFormEmail(e.target.value);
                                setVendorDirty(true);
                              }}
                              placeholder="ops@vendor.example"
                              className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                            />
                            {vendorFieldErrors.email && (
                              <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.email}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Phone
                              <InfoTip text={VENDOR_TOOLTIPS.phone} align="center" />
                            </label>
                            <input
                              type="tel"
                              disabled={vendorFormMode === 'view'}
                              value={formPhone}
                              onChange={e => {
                                setFormPhone(e.target.value);
                                setVendorDirty(true);
                              }}
                              placeholder="+91 98200 12345"
                              className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                            />
                            {vendorFieldErrors.phone && (
                              <p className="text-[11px] text-rose-600 mt-0.5">{vendorFieldErrors.phone}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Website URL
                              <InfoTip text={VENDOR_TOOLTIPS.website_url} align="right" />
                            </label>
                            <input
                              type="url"
                              disabled={vendorFormMode === 'view'}
                              value={formWebsite}
                              onChange={e => {
                                setFormWebsite(e.target.value);
                                setVendorDirty(true);
                              }}
                              placeholder="https://vendor.example"
                              className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                            />
                            {vendorFieldErrors.website_url && (
                              <p className="text-[11px] text-rose-600 mt-0.5">
                                {vendorFieldErrors.website_url}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 6.5 Address & Country Section */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Address & country
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Country
                              <InfoTip text={VENDOR_TOOLTIPS.country} align="left" />
                            </label>
                            <select
                              disabled={vendorFormMode === 'view'}
                              value={formCountry}
                              onChange={e => {
                                setFormCountry(e.target.value as VendorCountry);
                                setVendorDirty(true);
                              }}
                              className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50"
                            >
                              {VENDOR_COUNTRIES.map(c => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Primary Place
                              <InfoTip text={VENDOR_TOOLTIPS.primary_place} align="right" />
                            </label>
                            <select
                              disabled={vendorFormMode === 'view'}
                              value={formPlaceId}
                              onChange={e => {
                                setFormPlaceId(e.target.value);
                                setVendorDirty(true);
                              }}
                              className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50"
                            >
                              <option value="">No primary address selected</option>
                              {places.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.country})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Linked Place Address Preview & Actions */}
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                          <div className="text-xs text-slate-600 min-w-0">
                            {formPlaceId && placeMap.get(formPlaceId) ? (
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {placeMap.get(formPlaceId)!.name}{' '}
                                  <span className="text-[10px] font-normal text-slate-500">
                                    ({placeMap.get(formPlaceId)!.country})
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {placeMap.get(formPlaceId)!.address}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No primary address selected</span>
                            )}
                          </div>

                          {vendorFormMode !== 'view' && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={openCreatePlaceModal}
                                className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
                              >
                                + New place
                              </button>
                              <InfoTip text={VENDOR_TOOLTIPS.new_place} align="right" />
                              <button
                                type="button"
                                disabled={!formPlaceId}
                                onClick={openEditPlaceModal}
                                className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-[11px] font-semibold text-slate-700 cursor-pointer"
                              >
                                Edit place
                              </button>
                              <InfoTip text={VENDOR_TOOLTIPS.edit_place} align="right" />
                              {formPlaceId && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormPlaceId('');
                                      setVendorDirty(true);
                                    }}
                                    className="h-7 px-2.5 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[11px] font-semibold text-rose-700 cursor-pointer"
                                  >
                                    Remove link
                                  </button>
                                  <InfoTip text={VENDOR_TOOLTIPS.remove_link} align="right" />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    )
                  ) : (
                    /* BRANCH B: INTEGRATED PROVIDER SETUP (Section 7) */
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Integrated provider setup
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Demo provider configuration only. Secrets are never persisted in HTML, localStorage, or exports.
                          </p>
                        </div>
                        {vendorFormMode !== 'create' && (
                          <div className="w-44">
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              Vendor Status
                              <InfoTip text={VENDOR_TOOLTIPS.vendor_status} align="right" />
                            </label>
                            <select
                              disabled={vendorFormMode === 'view'}
                              value={formStatus}
                              onChange={e => {
                                setFormStatus(e.target.value as VendorStatusKey);
                                setVendorDirty(true);
                              }}
                              className="w-full h-7 px-2 rounded border border-slate-200 bg-white text-xs"
                            >
                              {VENDOR_STATUS_CATALOG.map(s => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Supported provider (demo) cards */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Supported provider (demo) <span className="text-rose-500">*</span>
                          <InfoTip text={VENDOR_TOOLTIPS.supported_provider} align="left" />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {DEMO_INTEGRATED_PROVIDERS.map(prov => {
                            const selected = selectedProviderId === prov.id;
                            return (
                              <div
                                key={prov.id}
                                onClick={() => {
                                  if (vendorFormMode === 'view') return;
                                  if (selectedProviderId !== prov.id) {
                                    // Reset provider options and pending credentials on provider switch per Section 7.3
                                    setSelectedProviderId(prov.id);
                                    setPendingCredentials({});
                                    setProviderOptionVal(prov.defaultOption);
                                    setVendorDirty(true);
                                  }
                                }}
                                className={`p-3 rounded-xl border transition-all ${
                                  vendorFormMode === 'view' ? 'cursor-default' : 'cursor-pointer'
                                } ${
                                  selected
                                    ? 'border-[#FA8A63] bg-[#FFF3EE]/60 ring-1 ring-[#FA8A63]'
                                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-slate-900">{prov.name}</span>
                                  <Plug
                                    className={`w-4 h-4 ${
                                      selected ? 'text-[#FA8A63]' : 'text-slate-400'
                                    }`}
                                  />
                                </div>
                                <p className="text-[11px] text-slate-600">{prov.description}</p>
                              </div>
                            );
                          })}
                        </div>
                        {vendorFieldErrors.provider && (
                          <p className="text-[11px] text-rose-600 mt-1">{vendorFieldErrors.provider}</p>
                        )}
                      </div>

                      {!selectedProviderId ? (
                        <div className="p-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
                          Choose a provider to load its dynamic fields
                        </div>
                      ) : (
                        (() => {
                          const prov = DEMO_INTEGRATED_PROVIDERS.find(p => p.id === selectedProviderId)!;
                          return (
                            <div className="space-y-4 pt-2 border-t border-slate-100">
                              {/* Provider credentials */}
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-800">
                                    Provider credentials
                                  </span>
                                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Not saved in HTML or local storage
                                  </span>
                                </div>

                                {vendorFormMode !== 'create' && (
                                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                                    Configured credential keys: <code className="font-mono font-semibold">{prov.credentials.map(c => c.key).join(', ')}</code>. Previously entered secrets are never stored or displayed. Leave blank to keep existing demo metadata.
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                  {prov.credentials.map(cred => (
                                    <div key={cred.key}>
                                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        {cred.label}{' '}
                                        {vendorFormMode === 'create' && (
                                          <span className="text-rose-500">*</span>
                                        )}
                                        <InfoTip
                                          text={
                                            VENDOR_TOOLTIPS[cred.key] || VENDOR_TOOLTIPS.api_key
                                          }
                                          align="left"
                                        />
                                      </label>
                                      <input
                                        type={cred.type}
                                        autoComplete="off"
                                        disabled={vendorFormMode === 'view'}
                                        value={pendingCredentials[cred.key] || ''}
                                        onChange={e => {
                                          setPendingCredentials(prev => ({
                                            ...prev,
                                            [cred.key]: e.target.value,
                                          }));
                                          setVendorDirty(true);
                                        }}
                                        placeholder={
                                          vendorFormMode === 'create'
                                            ? cred.placeholder
                                            : '•••••••• (not stored)'
                                        }
                                        className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                                      />
                                      {vendorFieldErrors[`cred_${cred.key}`] && (
                                        <p className="text-[11px] text-rose-600 mt-0.5">
                                          {vendorFieldErrors[`cred_${cred.key}`]}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Provider options */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  {prov.optionLabel}
                                  <InfoTip
                                    text={
                                      prov.optionKey === 'region'
                                        ? VENDOR_TOOLTIPS.region
                                        : VENDOR_TOOLTIPS.operating_mode
                                    }
                                    align="left"
                                  />
                                </label>
                                <select
                                  disabled={vendorFormMode === 'view'}
                                  value={providerOptionVal || prov.defaultOption}
                                  onChange={e => {
                                    setProviderOptionVal(e.target.value);
                                    setVendorDirty(true);
                                  }}
                                  className="w-64 h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs disabled:bg-slate-50"
                                >
                                  {prov.optionChoices.map(ch => (
                                    <option key={ch} value={ch}>
                                      {ch}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Advanced integration settings */}
                              <div className="pt-2 border-t border-slate-100 space-y-3">
                                <h4 className="text-xs font-bold text-slate-800">
                                  Advanced integration settings (demo metadata)
                                </h4>
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                      Host
                                      <InfoTip text={VENDOR_TOOLTIPS.host} align="left" />
                                    </label>
                                    <input
                                      type="text"
                                      disabled={vendorFormMode === 'view'}
                                      value={intHost}
                                      onChange={e => {
                                        setIntHost(e.target.value);
                                        setVendorDirty(true);
                                      }}
                                      placeholder="https://api.provider.example"
                                      className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                      Namespace
                                      <InfoTip text={VENDOR_TOOLTIPS.namespace} align="center" />
                                    </label>
                                    <input
                                      type="text"
                                      disabled={vendorFormMode === 'view'}
                                      value={intNamespace}
                                      onChange={e => {
                                        setIntNamespace(e.target.value);
                                        setVendorDirty(true);
                                      }}
                                      placeholder="adani-tenant-ns"
                                      className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                      Webhook URL
                                      <InfoTip text={VENDOR_TOOLTIPS.webhook_url} align="right" />
                                    </label>
                                    <input
                                      type="text"
                                      disabled={vendorFormMode === 'view'}
                                      value={intWebhook}
                                      onChange={e => {
                                        setIntWebhook(e.target.value);
                                        setVendorDirty(true);
                                      }}
                                      placeholder="https://callbacks.fleetrobo.example"
                                      className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs disabled:bg-slate-50"
                                    />
                                  </div>
                                </div>

                                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    disabled={vendorFormMode === 'view'}
                                    checked={intSandbox}
                                    onChange={e => {
                                      setIntSandbox(e.target.checked);
                                      setVendorDirty(true);
                                    }}
                                    className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63]"
                                  />
                                  <span>Sandbox environment</span>
                                  <InfoTip text={VENDOR_TOOLTIPS.sandbox_environment} align="left" />
                                </label>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {/* 6.6 SYSTEM INFORMATION (Read-only for saved Vendor) */}
                  {vendorFormMode !== 'create' && activeVendorRecord && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        System information (read-only)
                      </h3>
                      <div className="grid grid-cols-5 gap-3 text-xs">
                        <div>
                          <div className="text-slate-400 text-[11px]">
                            Public ID <InfoTip text={VENDOR_TOOLTIPS.public_id} align="left" />
                          </div>
                          <div className="font-mono font-semibold text-slate-900 mt-0.5">
                            {activeVendorRecord.public_id}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[11px]">
                            Internal ID <InfoTip text={VENDOR_TOOLTIPS.internal_id} align="center" />
                          </div>
                          <div className="font-mono font-semibold text-slate-900 mt-0.5">
                            {activeVendorRecord.internal_id}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[11px]">Tenant company</div>
                          <div className="font-semibold text-slate-900 mt-0.5">
                            {activeVendorRecord.company}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[11px]">Created</div>
                          <div className="font-medium text-slate-800 mt-0.5">
                            {formatEnInDate(activeVendorRecord.created_at)}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[11px]">Updated</div>
                          <div className="font-medium text-slate-800 mt-0.5">
                            {formatEnInDate(activeVendorRecord.updated_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* SECTION 8: PERSONNEL TAB (Saved Vendors only) */
                activeVendorRecord && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Linked personnel memberships ({activeVendorRecord.personnel.length})
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Contacts belong to a Vendor as Admin or Member. Removing a membership preserves the underlying Contact and any User Account.
                        </p>
                      </div>
                    </div>

                    {/* Existing Memberships List */}
                    {activeVendorRecord.personnel.length === 0 ? (
                      <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                        No personnel added
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeVendorRecord.personnel.map(mem => {
                          const cnt = contactMap.get(mem.contact_id);
                          const displayName = cnt ? cnt.name : 'Unknown contact';
                          return (
                            <div
                              key={mem.contact_id}
                              className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-[#FFF3EE] text-[#B85324] font-bold text-xs flex items-center justify-center shrink-0">
                                  {getInitials(displayName)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900">
                                      {displayName}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                      {mem.role}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                                      {mem.status}
                                    </span>
                                    {mem.login_requested && (
                                      <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-semibold">
                                        Login requested
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {cnt ? `${cnt.email} · ${cnt.phone || 'No phone'}` : mem.contact_id}
                                  </div>
                                </div>
                              </div>

                              {vendorFormMode === 'edit' && (
                                <div className="flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setContactToRemove(
                                        cnt || {
                                          id: mem.contact_id,
                                          name: 'Unknown contact',
                                          email: '',
                                          phone: '',
                                        }
                                      );
                                      setActiveDialog('remove-personnel');
                                    }}
                                    className="h-7 px-2.5 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                  <InfoTip text={VENDOR_TOOLTIPS.remove_membership} align="right" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add Personnel Form (Shown in Edit mode) */}
                    {vendorFormMode === 'edit' ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Add personnel membership
                          </h4>
                          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPersonnelAddMode('existing');
                                setSelectedContactId('');
                                setPersonnelError('');
                              }}
                              className={`h-7 px-3 rounded-md text-xs font-semibold cursor-pointer ${
                                personnelAddMode === 'existing'
                                  ? 'bg-[#FA8A63] text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Select existing contact
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPersonnelAddMode('new');
                                setSelectedContactId('');
                                setPersonnelError('');
                              }}
                              className={`h-7 px-3 rounded-md text-xs font-semibold cursor-pointer ${
                                personnelAddMode === 'new'
                                  ? 'bg-[#FA8A63] text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              + Create contact
                            </button>
                          </div>
                        </div>

                        {personnelError && (
                          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                            {personnelError}
                          </div>
                        )}

                        {personnelAddMode === 'existing' ? (
                          <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                            <label className="block text-xs font-semibold text-slate-700">
                              Choose existing Contact <span className="text-rose-500">*</span>
                              <InfoTip text={VENDOR_TOOLTIPS.contact} align="left" />
                            </label>
                            <input
                              type="text"
                              value={personnelContactSearch}
                              onChange={e => setPersonnelContactSearch(e.target.value)}
                              placeholder="Search contacts by name, email, or phone..."
                              className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs"
                            />
                            <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-md">
                              {(() => {
                                const alreadyLinkedIds = new Set(
                                  activeVendorRecord.personnel.map(p => p.contact_id)
                                );
                                const sq = personnelContactSearch.trim().toLowerCase();
                                const availableContacts = contacts.filter(
                                  c =>
                                    !alreadyLinkedIds.has(c.id) &&
                                    (!sq ||
                                      c.name.toLowerCase().includes(sq) ||
                                      c.email.toLowerCase().includes(sq) ||
                                      c.phone.toLowerCase().includes(sq))
                                );

                                if (availableContacts.length === 0) {
                                  return (
                                    <div className="p-3 text-center text-xs text-slate-400">
                                      No unlinked contacts match your search.
                                    </div>
                                  );
                                }

                                return availableContacts.map(c => (
                                  <label
                                    key={c.id}
                                    className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 text-xs cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <input
                                        type="radio"
                                        name="existing_contact_pick"
                                        checked={selectedContactId === c.id}
                                        onChange={() => setSelectedContactId(c.id)}
                                        className="text-[#FA8A63] focus:ring-[#FA8A63]"
                                      />
                                      <div>
                                        <div className="font-semibold text-slate-900">{c.name}</div>
                                        <div className="text-[10px] text-slate-500">
                                          {c.email} · {c.phone || 'No phone'}
                                        </div>
                                      </div>
                                    </div>
                                  </label>
                                ));
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Name <span className="text-rose-500">*</span>
                                <InfoTip text={VENDOR_TOOLTIPS.create_contact} align="left" />
                              </label>
                              <input
                                type="text"
                                value={newContactName}
                                onChange={e => setNewContactName(e.target.value)}
                                placeholder="Contact full name"
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Email <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="email"
                                value={newContactEmail}
                                onChange={e => setNewContactEmail(e.target.value)}
                                placeholder="contact@vendor.example"
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Phone (optional)
                              </label>
                              <input
                                type="tel"
                                value={newContactPhone}
                                onChange={e => setNewContactPhone(e.target.value)}
                                placeholder="+91 98200 00000"
                                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-semibold text-slate-700">
                                Personnel role:
                                <InfoTip text={VENDOR_TOOLTIPS.personnel_role} align="left" />
                              </label>
                              <select
                                value={personnelRole}
                                onChange={e => setPersonnelRole(e.target.value as PersonnelRole)}
                                className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-semibold"
                              >
                                <option value="Member">Member</option>
                                <option value="Admin">Admin</option>
                              </select>
                            </div>

                            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={personnelLoginRequested}
                                onChange={e => setPersonnelLoginRequested(e.target.checked)}
                                className="rounded border-slate-300 text-[#FA8A63] focus:ring-[#FA8A63]"
                              />
                              <span>Create login</span>
                              <InfoTip text={VENDOR_TOOLTIPS.login_account} align="left" />
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={handleAddPersonnel}
                            className="h-8 px-3.5 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> + Add personnel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                        <span>Switch to Edit mode to add or remove Vendor personnel memberships.</span>
                        <button
                          type="button"
                          onClick={() => setVendorFormMode('edit')}
                          className="text-xs font-semibold text-[#FA8A63] hover:underline cursor-pointer"
                        >
                          Switch to Edit mode
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Sticky Drawer Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-500">
                {vendorFormMode === 'view'
                  ? 'Read-only view mode'
                  : vendorDirty
                  ? 'Unsaved changes in form'
                  : 'All fields up to date'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={attemptCloseVendorDrawer}
                  className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {vendorFormMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {vendorFormMode !== 'view' && (
                  <button
                    type="button"
                    onClick={handleSaveVendor}
                    className="h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold shadow-2xs cursor-pointer"
                  >
                    {vendorFormMode === 'create' ? 'Create vendor' : 'Save changes'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8.3 BULK DELETE REVIEW RIGHT-SIDE DRAWER (Section 9) */}
      {activeDrawer === 'bulk' && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
          <div className="w-[460px] max-w-full h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Bulk actions — Delete selected vendors</h2>
                <p className="text-[11px] text-slate-500">
                  Eligibility review before local Vendor deletion
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Summary Counters */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-[11px] text-slate-500">Selected</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {bulkReviewSummary.records.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                  <div className="text-[11px] font-semibold text-emerald-700 flex items-center">
                    <span>Eligible</span>
                    <InfoTip text={VENDOR_TOOLTIPS.eligible} align="center" />
                  </div>
                  <div className="text-lg font-bold text-emerald-800 mt-0.5">
                    {bulkReviewSummary.eligible.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                  <div className="text-[11px] font-semibold text-amber-700 flex items-center">
                    <span>Skipped</span>
                    <InfoTip text={VENDOR_TOOLTIPS.skipped} align="right" />
                  </div>
                  <div className="text-lg font-bold text-amber-800 mt-0.5">
                    {bulkReviewSummary.skipped.length}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                Vendors with zero linked Personnel are <strong>Eligible</strong> for local deletion. Vendors with active Personnel memberships are <strong>Skipped (Has personnel)</strong> to prevent orphaned memberships. Underlying Contacts and platform User Accounts are never deleted.
              </div>

              {/* Per-record disposition list */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800">Record disposition</div>
                {bulkReviewSummary.records.map(v => {
                  const isEligible = v.personnel.length === 0;
                  return (
                    <div
                      key={v.id}
                      className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{v.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{v.public_id}</div>
                      </div>
                      {isEligible ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold shrink-0">
                          Eligible
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold shrink-0">
                          Skipped — Has personnel ({v.personnel.length})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-slate-600">
                {bulkReviewSummary.eligible.length} of {bulkReviewSummary.records.length} records can be deleted
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bulkReviewSummary.eligible.length === 0}
                  onClick={() => setActiveDialog('confirm-bulk-delete')}
                  className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold cursor-pointer"
                >
                  Delete {bulkReviewSummary.eligible.length}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8.4 DIRECT CSV IMPORT RIGHT-SIDE DRAWER */}
      {activeDrawer === 'import' && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
          <div className="w-[620px] max-w-full h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900">Import Vendors via CSV</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upload a CSV file to import vendor records directly into Vendor Master.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <DirectBulkUploadView
                status={vendorUpload.status}
                progress={vendorUpload.progress}
                fileLabel={vendorUpload.fileLabel}
                fileMeta={vendorUpload.fileMeta}
                errorMessage={vendorUpload.errorMessage}
                doneSummary={vendorUpload.doneSummary}
                accept=".csv,text/csv"
                dropTitle="Drag and drop a .csv file here, or click to browse"
                dropSubtitle="Template headers: Name, Phone, Email, Website URL, Country, Address."
                chooseButtonLabel="Choose CSV file"
                downloadLabel="Download CSV template"
                sampleLabel="Use sample CSV"
                templateTitle="Need a starting format?"
                templateSubtitle="Download standard vendor CSV template or upload sample rows."
                doneButtonLabel="View directory"
                onFileSelected={handleImportFileSelect}
                onDownloadTemplate={downloadCsvTemplate}
                onUseSample={() =>
                  processVendorCsvDirect(
                    'sample_vendors_import.csv',
                    SAMPLE_CSV_IMPORT_TEXT,
                    SAMPLE_CSV_IMPORT_TEXT.length
                  )
                }
                onReset={vendorUpload.reset}
                onDone={() => setActiveDrawer(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CENTERED CONFIRMATION & ACTION MODALS
         ===================================================================== */}

      {/* DISCARD VENDOR CHANGES MODAL */}
      {activeDialog === 'discard-vendor' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40">
          <div className="w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Discard unsaved changes?</h3>
            <p className="text-xs text-slate-600">
              You have unsaved edits in this vendor form. Closing now will discard all uncommitted changes.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingCredentials({});
                  setVendorDirty(false);
                  setActiveDialog(null);
                  setActiveDrawer(null);
                }}
                className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCARD FILTER CHANGES MODAL */}
      {activeDialog === 'discard-filter' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40">
          <div className="w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Discard unapplied filters?</h3>
            <p className="text-xs text-slate-600">
              You modified filter draft conditions without clicking Apply. Discard your filter draft changes?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveDialog(null);
                  setActiveDrawer(null);
                }}
                className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM VENDOR BULK DELETION MODAL WITH CONFIRMATION CHIPS */}
      <DeleteConfirmationModal
        isOpen={activeDialog === 'confirm-bulk-delete'}
        zIndexClass="z-[120]"
        title={`Confirm vendor deletion (${bulkReviewSummary.eligible.length})`}
        description={
          <>
            Permanently delete <strong>{bulkReviewSummary.eligible.length}</strong> eligible local
            vendor record{bulkReviewSummary.eligible.length === 1 ? '' : 's'}?
            {bulkReviewSummary.skipped.length > 0 && (
              <span>
                {' '}
                The <strong>{bulkReviewSummary.skipped.length}</strong> skipped vendor
                {bulkReviewSummary.skipped.length === 1 ? '' : 's'} with linked personnel will
                remain untouched.
              </span>
            )}{' '}
            This action cannot be undone in the local demo.
          </>
        }
        confirmLabel={`Confirm delete (${bulkReviewSummary.eligible.length})`}
        targetChips={[
          ...bulkReviewSummary.eligible.slice(0, 5).map((v) => ({
            id: v.id,
            label: v.name,
            sublabel: getVendorTypeLabel(v.type),
            tone: 'orange' as const,
          })),
          ...(bulkReviewSummary.eligible.length > 5
            ? [
                {
                  id: 'more-vendors',
                  label: `+${bulkReviewSummary.eligible.length - 5} more`,
                  tone: 'slate' as const,
                },
              ]
            : []),
        ]}
        confirmationChips={[
          {
            id: 'selected',
            label: `${bulkReviewSummary.records.length} Selected`,
            tone: 'slate',
          },
          {
            id: 'eligible',
            label: `${bulkReviewSummary.eligible.length} Eligible to Delete`,
            tone: 'emerald',
          },
          ...(bulkReviewSummary.skipped.length > 0
            ? [
                {
                  id: 'skipped',
                  label: `${bulkReviewSummary.skipped.length} Skipped (Has Personnel)`,
                  tone: 'amber' as const,
                },
              ]
            : []),
        ]}
        onCancel={() => setActiveDialog(null)}
        onConfirm={() => executeConfirmedBulkDelete()}
      />

      {/* REMOVE PERSONNEL MEMBERSHIP CONFIRMATION MODAL WITH CONFIRMATION CHIPS */}
      {activeDialog === 'remove-personnel' && contactToRemove && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Remove personnel?</h3>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-orange-200 bg-orange-50 text-[#B85324]">
                {contactToRemove.name}
              </span>
              {activeVendorRecord && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-sky-200 bg-sky-50 text-sky-700">
                  {activeVendorRecord.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={12} /> Contact Master Record Intact
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-200 bg-amber-50 text-amber-800">
                Membership Removal Only
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Remove <strong>{contactToRemove.name}</strong> from this Vendor’s personnel memberships? The Contact master record and any platform User Account will remain intact.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setContactToRemove(null);
                  setActiveDialog(null);
                }}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemovePersonnelMembership}
                className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Remove membership
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW / EDIT PLACE MODAL */}
      {activeDialog === 'place' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40">
          <div className="w-[440px] bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {placeModalMode === 'create' ? 'Create new Place' : 'Edit linked Place'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {placeModalMode === 'edit' && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                Note: Places are reusable master records. Updating this Place updates the shared address for any other record referencing it.
              </div>
            )}

            {placeFormError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {placeFormError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Place name <span className="text-rose-500">*</span>
                  <InfoTip text={VENDOR_TOOLTIPS.place_name} align="left" />
                </label>
                <input
                  type="text"
                  value={placeFormName}
                  onChange={e => setPlaceFormName(e.target.value)}
                  placeholder="e.g., Mundra Port Office"
                  className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                <select
                  value={placeFormCountry}
                  onChange={e => setPlaceFormCountry(e.target.value as VendorCountry)}
                  className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs"
                >
                  {VENDOR_COUNTRIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Place Address <span className="text-rose-500">*</span>
                  <InfoTip text={VENDOR_TOOLTIPS.place_address} align="left" />
                </label>
                <textarea
                  rows={3}
                  value={placeFormAddress}
                  onChange={e => setPlaceFormAddress(e.target.value)}
                  placeholder="Street, locality, city, state, postal code..."
                  className="w-full p-2.5 rounded-md border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePlaceModal}
                className="h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold cursor-pointer"
              >
                Save Place
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT VENDORS MODAL (Section 11) */}
      {activeDialog === 'export' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40">
          <div className="w-[440px] bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Export vendors</h3>
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              Exports <strong>all tenant vendors</strong> or <strong>explicitly selected vendor UUIDs</strong> (not active search/filter views) across the 13 source export columns. User Account joined fields and provider secrets are never exported.
            </div>

            {exportError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {exportError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Export scope
                  <InfoTip text={VENDOR_TOOLTIPS.export_scope} align="left" />
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="export_scope"
                      checked={exportScope === 'all'}
                      onChange={() => {
                        setExportScope('all');
                        setExportError('');
                      }}
                      className="text-[#FA8A63] focus:ring-[#FA8A63]"
                    />
                    <span>All tenant vendors ({vendors.length})</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 text-xs ${
                      selectedVendorIds.size === 0
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-slate-800 cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="export_scope"
                      disabled={selectedVendorIds.size === 0}
                      checked={exportScope === 'selected'}
                      onChange={() => {
                        setExportScope('selected');
                        setExportError('');
                      }}
                      className="text-[#FA8A63] focus:ring-[#FA8A63]"
                    />
                    <span>Selected vendors only ({selectedVendorIds.size})</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Export format
                  <InfoTip text={VENDOR_TOOLTIPS.export_format} align="left" />
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      exportFormat === 'csv'
                        ? 'border-[#FA8A63] bg-[#FFF3EE] text-[#B85324]'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" /> CSV (.csv)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('xlsx')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      exportFormat === 'xlsx'
                        ? 'border-[#FA8A63] bg-[#FFF3EE] text-[#B85324]'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteExport}
                className="h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold cursor-pointer"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE DIRECTORY VIEW MODAL */}
      {activeDialog === 'saved-view' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40">
          <div className="w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Save directory view</h3>
            <p className="text-xs text-slate-600">
              Saves current visible columns ({visibleColumnKeys.length}), applied filters, filter mode ({filterMode}), sort order, and {layout} layout.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                View name <span className="text-rose-500">*</span> (max 40 chars)
              </label>
              <input
                type="text"
                maxLength={40}
                value={newSavedViewName}
                onChange={e => {
                  setNewSavedViewName(e.target.value);
                  setSavedViewError('');
                }}
                placeholder="e.g., Preferred Fuel Partners"
                className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-xs"
              />
              {savedViewError && (
                <p className="text-[11px] text-rose-600 mt-1">{savedViewError}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentView}
                className="h-8 px-4 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-semibold cursor-pointer"
              >
                Save view
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
