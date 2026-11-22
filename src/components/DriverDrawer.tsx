import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Upload, 
  FileText, 
  User, 
  Trash2,
  Calendar,
  ShieldCheck,
  Award,
  Clock,
  Edit2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Search,
  Eye,
  IdCard,
  Phone,
  Mail,
  MapPin,
  Building2,
  FileCheck,
  ChevronRight
} from 'lucide-react';
import { Driver, UserAccount, DRIVER_LOOKUPS, deriveDriverBadges } from '../types/driver';
import {
  getCanonicalTransporterVendors,
  resolveTransporterVendor,
} from '../data/vendorsSeed';
import { InfoTooltip } from './InfoTooltip';

interface DriverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'view' | 'edit';
  initialDriver: Driver | null;
  onSaveDriver: (driver: Driver) => void;
  onSwitchToEdit?: () => void;
  existingDrivers: Driver[];
  companyContext?: string;
  zIndexClass?: string;
}

type DriverSectionTab = 
  | 'all'
  | 'accounts'
  | 'basic'
  | 'transporter'
  | 'identity'
  | 'contact'
  | 'licence'
  | 'compliance'
  | 'documents'
  | 'settings';

const SECTION_TABS: { id: DriverSectionTab; label: string; order: number }[] = [
  { id: 'all', label: 'All Sections (Long Form)', order: 0 },
  { id: 'accounts', label: '1. User Accounts', order: 1 },
  { id: 'basic', label: '2. Basic & Mandatory Details', order: 2 },
  { id: 'transporter', label: '3. Transporter', order: 3 },
  { id: 'identity', label: '4. Identity & Personal', order: 4 },
  { id: 'contact', label: '5. Contact & Address', order: 5 },
  { id: 'licence', label: '6. Licence Details', order: 6 },
  { id: 'compliance', label: '7. Compliance & Verification', order: 7 },
  { id: 'documents', label: '8. Documents', order: 8 },
  { id: 'settings', label: '9. Additional Settings', order: 9 },
];

export const DriverDrawer: React.FC<DriverDrawerProps> = ({
  isOpen,
  onClose,
  mode,
  initialDriver,
  onSaveDriver,
  onSwitchToEdit,
  existingDrivers,
  companyContext,
  zIndexClass = 'z-50'
}) => {
  const isReadOnly = mode === 'view';

  // Active section tab: default to 'all' for continuous long form (matching Vehicles experience), or individual section tabs
  const [activeTab, setActiveTab] = useState<DriverSectionTab>('all');

  // Form State
  const [formData, setFormData] = useState<Partial<Driver>>({
    status: 'Active',
    company: companyContext || 'Adani Port',
    blood: 'B+',
    rfid: false,
    vendor: false,
    rto: false,
    police: false,
    training: false,
    accountCountry: 'India',
    accountRole: 'Driver',
    licenceType: 'HMV'
  });

  // User Account Selection Mode
  const [accountMode, setAccountMode] = useState<'existing' | 'new'>('new');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');

  // Sample existing platform users pool
  const MOCK_PLATFORM_USERS: UserAccount[] = [
    { id: 'usr-101', name: 'Ramesh Singh', email: 'ramesh.singh@adani.example', phone: '9876543210', country: 'India', role: 'Driver' },
    { id: 'usr-102', name: 'Sukhwinder Gill', email: 'sukhwinder.gill@adani.example', phone: '9812345678', country: 'India', role: 'Driver' },
    { id: 'usr-103', name: 'Anil Kumar Verma', email: 'anil.verma@binary.example', phone: '9765432109', country: 'India', role: 'Driver' },
    { id: 'usr-105', name: 'Pradeep Sharma', email: 'pradeep.sharma@adani.example', phone: '9934567812', country: 'India', role: 'Driver' },
    { id: 'usr-201', name: 'Kavita Iyer', email: 'kavita.iyer@adani.example', phone: '9890123456', country: 'India', role: 'Driver' },
    { id: 'usr-202', name: 'Mohd Tariq', email: 'mohd.tariq@fleetrobo.example', phone: '9715099887', country: 'United Arab Emirates', role: 'Driver' },
    { id: 'usr-203', name: 'Harish Babu', email: 'harish.babu@adani.example', phone: '9822334455', country: 'India', role: 'Driver' }
  ];

  // Saarthi Lookup state
  const [saarthiLoading, setSaarthiLoading] = useState(false);
  const [saarthiFeedback, setSaarthiFeedback] = useState<{ type: 'success' | 'error' | 'hint'; message: string } | null>(null);

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [vendorRefreshTick, setVendorRefreshTick] = useState(0);
  useEffect(() => {
    const onVendorsUpdated = () => setVendorRefreshTick(t => t + 1);
    window.addEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
    return () => window.removeEventListener('fleetrobo:vendors-updated', onVendorsUpdated);
  }, []);

  const transporterOptions = React.useMemo(() => {
    void vendorRefreshTick;
    const canonicalVendors = getCanonicalTransporterVendors(companyContext);
    const seen = new Set<string>();
    const list: Array<{ name: string; publicId?: string; id?: string }> = [];
    canonicalVendors.forEach(v => {
      if (!seen.has(v.name)) {
        seen.add(v.name);
        list.push({ name: v.name, publicId: v.public_id, id: v.id });
      }
    });
    DRIVER_LOOKUPS.transporters.forEach(t => {
      if (!seen.has(t)) {
        seen.add(t);
        list.push({ name: t });
      }
    });
    if (formData.transporter && !seen.has(formData.transporter)) {
      list.push({ name: formData.transporter });
    }
    return list;
  }, [companyContext, formData.transporter, vendorRefreshTick]);

  // Initialize or populate form
  useEffect(() => {
    if (initialDriver && mode !== 'create') {
      setFormData({ 
        ...initialDriver,
        company: initialDriver.company || companyContext || 'Adani Port',
        first: initialDriver.first || initialDriver.firstName || initialDriver.name?.split(' ')[0] || '',
        middle: initialDriver.middle || initialDriver.middleName || '',
        last: initialDriver.last || initialDriver.lastName || initialDriver.name?.split(' ').slice(1).join(' ') || '',
        firstName: initialDriver.first || initialDriver.firstName || initialDriver.name?.split(' ')[0] || '',
        middleName: initialDriver.middle || initialDriver.middleName || '',
        lastName: initialDriver.last || initialDriver.lastName || initialDriver.name?.split(' ').slice(1).join(' ') || '',
      });
      if (initialDriver.userAccountId) {
        setAccountMode('existing');
      } else {
        setAccountMode('new');
      }
    } else {
      const prefillPhone = initialDriver?.phone || '';
      const prefillName = initialDriver?.name || '';
      setFormData({
        status: 'Active',
        company: companyContext || 'Adani Port',
        transporter: 'Western Logistics',
        blood: 'B+',
        rfid: false,
        vendor: false,
        rto: false,
        police: false,
        training: false,
        accountCountry: 'India',
        accountRole: 'Driver',
        licenceType: 'HMV',
        first: prefillName.split(' ')[0] || '',
        middle: '',
        last: prefillName.split(' ').slice(1).join(' ') || '',
        name: prefillName,
        phone: prefillPhone,
        accountPhone: prefillPhone,
        accountName: prefillName,
        dob: '1990-01-01',
        licenceFrom: '2016-01-01',
        licenceTo: '2030-01-01'
      });
      setAccountMode('new');
    }
    setActiveTab('all');
    setErrors({});
    setIsDirty(false);
    setSaarthiFeedback(null);
  }, [initialDriver, isOpen, mode, companyContext]);

  if (!isOpen) return null;

  const updateField = (key: keyof Driver, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      
      // Keep Name in sync with First, Middle, Last
      if (key === 'first' || key === 'middle' || key === 'last' || key === 'firstName' || key === 'middleName' || key === 'lastName') {
        const fn = key === 'first' || key === 'firstName' ? value : (next.first || next.firstName || '');
        const mn = key === 'middle' || key === 'middleName' ? value : (next.middle || next.middleName || '');
        const ln = key === 'last' || key === 'lastName' ? value : (next.last || next.lastName || '');
        const combined = [fn, mn, ln].filter(Boolean).join(' ');
        next.name = combined;
        if (accountMode === 'new') {
          next.accountName = combined;
        }
      }

      // Sync name and phone if user account fields change
      if (key === 'accountName') {
        next.name = value;
        const parts = value.trim().split(' ');
        next.first = parts[0] || '';
        next.firstName = parts[0] || '';
        next.last = parts.slice(1).join(' ') || '';
        next.lastName = parts.slice(1).join(' ') || '';
      }
      if (key === 'accountPhone') {
        next.phone = value;
      }
      if (key === 'phone') {
        if (accountMode === 'new') {
          next.accountPhone = value;
        }
      }

      return next;
    });

    setIsDirty(true);
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const handleCloseAttempt = () => {
    if (isDirty && !isReadOnly) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Mock Saarthi Lookup Prefill
  const handleSaarthiLookup = () => {
    if (isReadOnly) return;
    const dl = formData.licence?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!dl) {
      setSaarthiFeedback({
        type: 'error',
        message: 'Enter a valid Driving Licence Number first to query Saarthi portal.'
      });
      return;
    }

    setSaarthiLoading(true);
    setSaarthiFeedback(null);

    setTimeout(() => {
      setSaarthiLoading(false);
      if (dl === 'JH0420140000189' || dl.startsWith('JH04')) {
        setFormData((prev) => ({
          ...prev,
          licence: 'JH0420140000189',
          first: 'Ramesh',
          firstName: 'Ramesh',
          middle: 'Kumar',
          middleName: 'Kumar',
          last: 'Singh',
          lastName: 'Singh',
          name: 'Ramesh Kumar Singh',
          dob: '1988-04-12',
          phone: prev.phone || '9876543210',
          licenceFrom: '2014-06-10',
          licenceTo: '2028-06-09',
          licenceType: 'HMV',
          authority: 'RTO Hazaribagh, Jharkhand',
          father: 'Kailash Singh',
          blood: 'B+',
          qualification: 'Secondary (10th)',
          experience: 12,
          rto: true,
          police: true,
          training: true,
          aadhaar: '458912345678',
          local: 'Quarter 14, Adani Port Colony, Mundra',
          localPin: '370421',
          permanent: 'Village Rampur, Dist Ghazipur, UP',
          permanentPin: '233001'
        }));
        setIsDirty(true);
        setSaarthiFeedback({
          type: 'success',
          message: 'Saarthi record matched! Prefilled verified identity, licence validity and compliance status.'
        });
      } else if (dl === 'DL0120150001234' || dl.startsWith('DL01')) {
        setFormData((prev) => ({
          ...prev,
          licence: 'DL0120150001234',
          first: 'Amit',
          firstName: 'Amit',
          middle: '',
          middleName: '',
          last: 'Sharma',
          lastName: 'Sharma',
          name: 'Amit Sharma',
          dob: '1992-07-18',
          phone: prev.phone || '9811223344',
          licenceFrom: '2015-08-01',
          licenceTo: '2035-07-31',
          licenceType: 'LMV',
          authority: 'RTO Mall Road, Delhi',
          father: 'Om Prakash Sharma',
          blood: 'O+',
          qualification: 'Senior Secondary (12th)',
          experience: 8,
          rto: true,
          police: true,
          training: true,
          aadhaar: '678912345678',
          local: 'C-42, Sector 18, Gurugram',
          localPin: '122001',
          permanent: 'House 112, Model Town, Rohtak',
          permanentPin: '124001'
        }));
        setIsDirty(true);
        setSaarthiFeedback({
          type: 'success',
          message: 'Saarthi record matched! Prefilled verified identity, licence validity and compliance status.'
        });
      } else {
        setSaarthiFeedback({
          type: 'hint',
          message: 'No automatic Saarthi record found for this test number. Try JH0420140000189 or DL0120150001234 for simulation.'
        });
      }
    }, 600);
  };

  // Quick copy local address to permanent address
  const handleCopyLocalAddress = () => {
    if (isReadOnly) return;
    setFormData((prev) => ({
      ...prev,
      permanent: prev.local || '',
      permanentPin: prev.localPin || ''
    }));
    setIsDirty(true);
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. User Accounts Validation
    if (accountMode === 'new') {
      const nameVal = formData.accountName?.trim() || formData.name?.trim() || formData.first?.trim();
      if (!nameVal) {
        newErrors.accountName = 'User Account Name is required.';
      }
      if (!formData.accountEmail || !formData.accountEmail.trim()) {
        newErrors.accountEmail = 'User Account Email is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.accountEmail.trim())) {
        newErrors.accountEmail = 'Please enter a valid email address.';
      }
      if (!formData.accountPhone && !formData.phone) {
        newErrors.accountPhone = 'User Account Phone number is required.';
      } else {
        const ph = (formData.accountPhone || formData.phone || '').replace(/\D/g, '');
        if (ph.length !== 10) {
          newErrors.accountPhone = 'Phone number must be exactly 10 digits.';
        }
      }
      if (!formData.accountCountry) {
        newErrors.accountCountry = 'Country is required.';
      }
      if (!formData.accountRole) {
        newErrors.accountRole = 'Role is required.';
      }
    } else {
      if (!formData.userAccountId) {
        newErrors.userAccountId = 'Please select an existing platform user account to link.';
      }
    }

    // Check duplicate account email against other drivers
    if (formData.accountEmail) {
      const emailDup = existingDrivers.find(
        (d) => d.id !== formData.id && d.accountEmail?.toLowerCase() === formData.accountEmail?.toLowerCase()
      );
      if (emailDup) {
        newErrors.accountEmail = 'Email is already linked to another driver account.';
      }
    }

    // 2. Section 2: Basic & Mandatory Details Validation
    if (!formData.licence || !formData.licence.trim()) {
      newErrors.licence = 'License No. is mandatory.';
    } else if (formData.licence.trim().length < 6) {
      newErrors.licence = 'License No. must be at least 6 alphanumeric characters.';
    } else {
      const licenceDup = existingDrivers.find(
        (d) => d.id !== formData.id && d.licence.toUpperCase() === formData.licence?.toUpperCase().trim()
      );
      if (licenceDup) {
        newErrors.licence = 'License No. is already registered for another driver in the system.';
      }
    }

    const firstNameVal = formData.first?.trim() || formData.firstName?.trim() || formData.name?.trim();
    if (!firstNameVal) {
      newErrors.first = 'First Name is mandatory.';
    }

    if (!formData.dob) {
      newErrors.dob = 'Date of Birth is mandatory.';
    } else {
      const dobDate = new Date(formData.dob);
      if (dobDate > new Date()) {
        newErrors.dob = 'Date of Birth cannot be in the future.';
      }
    }

    const mobileVal = (formData.phone || '').replace(/\D/g, '');
    if (!mobileVal) {
      newErrors.phone = 'Mobile No. is mandatory.';
    } else if (mobileVal.length !== 10) {
      newErrors.phone = 'Mobile No. must be exactly 10 digits.';
    }

    if (!formData.licenceFrom) {
      newErrors.licenceFrom = 'License From date is mandatory.';
    }
    if (!formData.licenceTo) {
      newErrors.licenceTo = 'License To date is mandatory.';
    }
    if (formData.licenceFrom && formData.licenceTo) {
      if (new Date(formData.licenceTo) < new Date(formData.licenceFrom)) {
        newErrors.licenceTo = 'License To date must be on or after License From date.';
      }
    }

    // Optional fields format checks
    if (formData.alternate && formData.alternate.replace(/\D/g, '').length !== 10) {
      newErrors.alternate = 'Alternate number must be exactly 10 digits.';
    }
    if (formData.emergency && formData.emergency.replace(/\D/g, '').length !== 10) {
      newErrors.emergency = 'Emergency number must be exactly 10 digits.';
    }
    if (formData.aadhaar && formData.aadhaar.replace(/\D/g, '').length !== 12) {
      newErrors.aadhaar = 'Aadhar number must be exactly 12 digits.';
    }
    if (formData.experience !== undefined && Number(formData.experience) < 0) {
      newErrors.experience = 'Experience cannot be negative.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // In tabbed mode, jump to section with error
      if (activeTab !== 'all') {
        if (newErrors.accountName || newErrors.accountEmail || newErrors.accountPhone || newErrors.accountCountry || newErrors.accountRole || newErrors.userAccountId) {
          setActiveTab('accounts');
        } else if (newErrors.licence || newErrors.first || newErrors.dob || newErrors.phone || newErrors.licenceFrom || newErrors.licenceTo) {
          setActiveTab('basic');
        } else if (newErrors.alternate || newErrors.emergency) {
          setActiveTab('contact');
        } else if (newErrors.aadhaar) {
          setActiveTab('identity');
        }
      }
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const firstName = formData.first?.trim() || formData.firstName?.trim() || formData.name?.split(' ')[0] || 'Driver';
    const middleName = formData.middle?.trim() || formData.middleName?.trim() || '';
    const lastName = formData.last?.trim() || formData.lastName?.trim() || '';
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ') || formData.accountName || 'Driver';

    const payload: Driver = {
      id: formData.id || `drv-${Date.now()}`,
      name: fullName,
      first: firstName,
      firstName: firstName,
      middle: middleName,
      middleName: middleName,
      last: lastName,
      lastName: lastName,
      phone: (formData.phone || formData.accountPhone || '9800000000').replace(/\D/g, ''),
      dob: formData.dob!,
      status: formData.status as any || 'Active',
      company: companyContext || formData.company || 'Adani Port', // Automatically derived; hidden from form
      transporter: formData.transporter || transporterOptions[0]?.name || 'Western Logistics',
      transporterVendorId:
        formData.transporterVendorId ||
        resolveTransporterVendor(formData.transporter || transporterOptions[0]?.name)?.id,
      vendor: Boolean(formData.vendor),
      licence: formData.licence!.toUpperCase().trim(),
      licenceFrom: formData.licenceFrom!,
      licenceTo: formData.licenceTo!,
      licenceType: formData.licenceType || 'HMV',
      blood: formData.blood || 'B+',
      experience: Number(formData.experience) || 0,
      father: formData.father || '',
      qualification: formData.qualification || 'Secondary (10th)',
      rfid: Boolean(formData.rfid),
      joining: formData.joining || '2023-01-01',
      alternate: formData.alternate || '',
      emergency: formData.emergency || '',
      local: formData.local || '',
      localPin: formData.localPin || '',
      permanent: formData.permanent || '',
      permanentPin: formData.permanentPin || '',
      authority: formData.authority || '',
      rto: Boolean(formData.rto),
      police: Boolean(formData.police),
      training: Boolean(formData.training),
      remarks: formData.remarks || '',
      aadhaar: formData.aadhaar || '',
      aadhaarDoc: formData.aadhaarDoc,
      licenceDoc: formData.licenceDoc,
      imageDoc: formData.imageDoc || formData.accountAvatar,
      profileDoc: formData.profileDoc || formData.accountAvatar,
      userAccountId: formData.userAccountId || (accountMode === 'new' ? `usr-${Date.now()}` : undefined),
      accountName: fullName,
      accountEmail: formData.accountEmail,
      accountPhone: formData.phone || formData.accountPhone,
      accountCountry: formData.accountCountry || 'India',
      accountRole: formData.accountRole || 'Driver',
      reg: formData.reg || 'GJ12BW4501',
      mappingActive: formData.mappingActive !== undefined ? formData.mappingActive : true,
      nextRest: formData.nextRest || '2026-11-20'
    };

    onSaveDriver(payload);
    onClose();
  };

  // File Upload Helper with <= 3MB size check
  const handleFileUpload = (field: 'aadhaarDoc' | 'licenceDoc' | 'imageDoc' | 'accountAvatar', file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      alert(`File size exceeds 3MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`);
      return;
    }
    updateField(field as any, file.name);
  };

  return (
    <div className={`fixed inset-0 ${zIndexClass} overflow-hidden flex justify-end font-sans`}>
      {/* Backdrop */}
      <div 
        onClick={handleCloseAttempt} 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
      />

      {/* 960px Right Drawer */}
      <div className="relative w-[960px] max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        
        {/* Drawer Top Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900">
                {mode === 'create'
                  ? 'Create Driver'
                  : mode === 'edit'
                  ? 'Edit Driver'
                  : 'Driver Details'}
              </h2>
              {isReadOnly && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Read Only
                </span>
              )}
              {isDirty && !isReadOnly && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Draft · unsaved
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'create'
                ? `Organization: ${companyContext || formData.company || 'Adani Port'} · 9 structured sections matching FleetRobo 2.0 standards`
                : `${formData.name || 'Driver'} · DL: ${formData.licence || '—'} · Organization: ${companyContext || formData.company || 'Adani Port'}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isReadOnly && onSwitchToEdit && (
              <button
                type="button"
                onClick={onSwitchToEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Edit2 size={13} />
                <span>Edit driver</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>



        {/* Global Error Banner */}
        {Object.keys(errors).length > 0 && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700 shrink-0">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Please correct the highlighted mandatory errors before saving:</div>
              <ul className="list-disc list-inside mt-0.5 text-[11px] space-y-0.5">
                {Object.values(errors).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Form Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* =========================================================================
              SECTION 1: USER ACCOUNTS (PRESERVED UI EXACTLY AS SHOWN IN SCREENSHOT 3)
             ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'accounts') && (
            <div id="section-accounts" className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FA8A63]" />
                    Section 1 — User Accounts
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Link an existing platform user or create a new login account for this driver.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-[#FA8A63] border border-orange-200">
                  {formData.userAccountId ? 'Linked Platform Account' : 'New Platform Account'}
                </span>
              </div>

              {/* Mode Switcher Segmented Button */}
              {!isReadOnly && (
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg max-w-sm border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAccountMode('new')}
                    className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer text-center ${
                      accountMode === 'new' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Create a new user
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountMode('existing')}
                    className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer text-center ${
                      accountMode === 'existing' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Select existing user
                  </button>
                </div>
              )}

              {/* MODE A: Select Existing User */}
              {accountMode === 'existing' && (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="Search existing users by name, email or phone..."
                      value={accountSearchQuery}
                      onChange={(e) => setAccountSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                    />
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {MOCK_PLATFORM_USERS.filter((u) => {
                      const q = accountSearchQuery.toLowerCase();
                      return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q);
                    }).map((usr) => {
                      const isAlreadyMapped = existingDrivers.some(
                        (d) => d.id !== formData.id && d.userAccountId === usr.id
                      );
                      const isSelected = formData.userAccountId === usr.id;

                      return (
                        <div
                          key={usr.id}
                          onClick={() => {
                            if (isReadOnly) return;
                            updateField('userAccountId', usr.id);
                            updateField('accountName', usr.name);
                            updateField('name', usr.name);
                            const parts = usr.name.split(' ');
                            updateField('first', parts[0] || '');
                            updateField('firstName', parts[0] || '');
                            updateField('last', parts.slice(1).join(' ') || '');
                            updateField('lastName', parts.slice(1).join(' ') || '');
                            updateField('accountEmail', usr.email);
                            updateField('accountPhone', usr.phone);
                            updateField('phone', usr.phone);
                            updateField('accountCountry', usr.country);
                            updateField('accountRole', usr.role);
                          }}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-orange-50/60 border-l-4 border-l-[#FA8A63]' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {usr.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                                <span>{usr.name}</span>
                                {isAlreadyMapped && (
                                  <span className="text-[10px] font-normal text-amber-600 bg-amber-50 px-1.5 rounded">
                                    Already assigned
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {usr.email} · {usr.phone} · {usr.role}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <span className="w-5 h-5 rounded-full bg-[#FA8A63] text-white flex items-center justify-center">
                                <Check size={12} strokeWidth={3} />
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 hover:text-slate-700 font-semibold">
                                Link
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {errors.userAccountId && (
                    <p className="text-[10px] text-red-500 font-semibold">{errors.userAccountId}</p>
                  )}
                </div>
              )}

              {/* MODE B: Create New User Form (Two-Column) */}
              {accountMode === 'new' && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 pt-1">
                  {/* Name * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Name <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="User account full name. Automatically syncs with driver first and last name. Example: Ramesh Singh." />
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      placeholder="e.g. Ramesh Singh"
                      value={formData.accountName || formData.name || ''}
                      onChange={(e) => updateField('accountName', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        errors.accountName ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    {errors.accountName && (
                      <p className="text-[10px] text-red-500 font-semibold">{errors.accountName}</p>
                    )}
                  </div>

                  {/* Email * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Email <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Unique platform login email address for telematics login and notices. Example: ramesh.singh@adani.example." />
                    </label>
                    <input
                      type="email"
                      disabled={isReadOnly}
                      placeholder="e.g. ramesh.singh@adani.example"
                      value={formData.accountEmail || ''}
                      onChange={(e) => updateField('accountEmail', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        errors.accountEmail ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    {errors.accountEmail && (
                      <p className="text-[10px] text-red-500 font-semibold">{errors.accountEmail}</p>
                    )}
                  </div>

                  {/* Phone * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Phone <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Primary 10-digit mobile contact number. Syncs with driver mobile. Example: 9876543210." />
                    </label>
                    <input
                      type="tel"
                      disabled={isReadOnly}
                      placeholder="e.g. 9876543210"
                      value={formData.accountPhone || formData.phone || ''}
                      onChange={(e) => updateField('accountPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                        errors.accountPhone ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                      } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    />
                    {errors.accountPhone && (
                      <p className="text-[10px] text-red-500 font-semibold">{errors.accountPhone}</p>
                    )}
                  </div>

                  {/* Country * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Country <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Operating national jurisdiction for telematics authentication. Example: India." />
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={formData.accountCountry || 'India'}
                      onChange={(e) => updateField('accountCountry', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                    >
                      {DRIVER_LOOKUPS.countries.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Role * */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Role <span className="text-red-500 ml-0.5">*</span>
                      <InfoTooltip content="Platform permissions tier assigned to this user. Default: Driver." />
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={formData.accountRole || 'Driver'}
                      onChange={(e) => updateField('accountRole', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                    >
                      {DRIVER_LOOKUPS.roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Profile Image */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Profile Image
                      <InfoTooltip content="Avatar image displayed on driver app and dashboard. Max 3MB." />
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        <User size={16} />
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-slate-600 truncate flex-1 font-mono text-[11px]">
                          {formData.accountAvatar || formData.imageDoc || 'No image selected'}
                        </span>
                        {!isReadOnly && (
                          <label className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold cursor-pointer shrink-0">
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload('accountAvatar', f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              SECTION 2: BASIC & MANDATORY DETAILS (IMMEDIATELY AFTER USER ACCOUNTS)
             ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'basic') && (
            <div id="section-basic" className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FA8A63]" />
                    Section 2 — Basic & Mandatory Details
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Core statutory driver licensing, identification, and validity dates.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200">
                  Mandatory Identity
                </span>
              </div>

              {/* Saarthi Portal Lookup Helper Bar */}
              {!isReadOnly && (
                <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={16} className="text-[#FA8A63] shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">National Saarthi DL Lookup</div>
                      <div className="text-[11px] text-slate-500">
                        Try sample DL <code className="font-mono text-[#FA8A63] font-bold">JH0420140000189</code> or <code className="font-mono text-[#FA8A63] font-bold">DL0120150001234</code> to prefill verified data.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={saarthiLoading}
                    onClick={handleSaarthiLookup}
                    className="px-3 py-1.5 bg-white border border-[#FA8A63] text-[#FA8A63] hover:bg-orange-50 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    {saarthiLoading ? 'Querying...' : 'Saarthi Lookup'}
                  </button>
                </div>
              )}

              {saarthiFeedback && (
                <div className={`text-xs font-semibold p-2.5 rounded-lg border flex items-center gap-2 ${
                  saarthiFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : saarthiFeedback.type === 'error'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-slate-100 text-slate-800 border-slate-200'
                }`}>
                  <CheckCircle2 size={14} className={saarthiFeedback.type === 'success' ? 'text-emerald-600' : 'text-slate-500'} />
                  <span>{saarthiFeedback.message}</span>
                </div>
              )}

              {/* 2-Column Grid for Mandatory Fields */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                {/* 1. License No. * */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    License No. <span className="text-red-500 ml-0.5">*</span>
                    <InfoTooltip content="Unique government-issued commercial driving license number. Mandatory; normalized to uppercase. Example: JH0420140000189." />
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="e.g. JH0420140000189"
                    value={formData.licence || ''}
                    onChange={(e) => updateField('licence', e.target.value.toUpperCase())}
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs font-mono font-medium text-slate-900 focus:outline-none ${
                      errors.licence ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                    } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                  />
                  {errors.licence && (
                    <p className="text-[10px] text-red-500 font-semibold">{errors.licence}</p>
                  )}
                </div>

                {/* 2. First Name * */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    First Name <span className="text-red-500 ml-0.5">*</span>
                    <InfoTooltip content="Primary given first name of driver as stated on government driving license. Example: Ramesh." />
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="e.g. Ramesh"
                    value={formData.first || formData.firstName || ''}
                    onChange={(e) => {
                      updateField('first', e.target.value);
                      updateField('firstName', e.target.value);
                    }}
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                      errors.first ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                    } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                  />
                  {errors.first && (
                    <p className="text-[10px] text-red-500 font-semibold">{errors.first}</p>
                  )}
                </div>

                {/* 3. Date of Birth * */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Date of Birth <span className="text-red-500 ml-0.5">*</span>
                    <InfoTooltip content="Official date of birth (driver must be at least 18 years of age). Mandatory. Example: 1988-04-12." />
                  </label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    max={new Date().toISOString().split('T')[0]}
                    value={formData.dob || ''}
                    onChange={(e) => updateField('dob', e.target.value)}
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                      errors.dob ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                    } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                  />
                  {errors.dob && (
                    <p className="text-[10px] text-red-500 font-semibold">{errors.dob}</p>
                  )}
                </div>

                {/* 4. Mobile No. * */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Mobile No. <span className="text-red-500 ml-0.5">*</span>
                    <InfoTooltip content="Primary 10-digit mobile phone contact number for dispatch calls and telematics alerts. Example: 9876543210." />
                  </label>
                  <input
                    type="tel"
                    disabled={isReadOnly}
                    placeholder="e.g. 9876543210"
                    value={formData.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                      errors.phone ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                    } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                  />
                  {errors.phone && (
                    <p className="text-[10px] text-red-500 font-semibold">{errors.phone}</p>
                  )}
                </div>

                {/* 5. License From * */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    License From <span className="text-red-500 ml-0.5">*</span>
                    <InfoTooltip content="Official driving licence issuance or renewal start date. Mandatory. Example: 2014-06-10." />
                  </label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    value={formData.licenceFrom || ''}
                    onChange={(e) => updateField('licenceFrom', e.target.value)}
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                      errors.licenceFrom ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                    } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                  />
                  {errors.licenceFrom && (
                    <p className="text-[10px] text-red-500 font-semibold">{errors.licenceFrom}</p>
                  )}
                </div>

                {/* 6. License To * */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    License To <span className="text-red-500 ml-0.5">*</span>
                    <InfoTooltip content="Driving license expiration validity date. Must be on or after License From. Example: 2028-06-09." />
                  </label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    min={formData.licenceFrom || undefined}
                    value={formData.licenceTo || ''}
                    onChange={(e) => updateField('licenceTo', e.target.value)}
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                      errors.licenceTo ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                    } ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                  />
                  {errors.licenceTo && (
                    <p className="text-[10px] text-red-500 font-semibold">{errors.licenceTo}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 3: TRANSPORTER (TRANSPORTER NAME & IS VENDOR)
             ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'transporter') && (
            <div id="section-transporter" className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FA8A63]" />
                    Section 3 — Transporter
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Contracted logistics fleet transporter association and contractor status.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Fleet Assignment
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                {/* Transporter Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Transporter Name
                    <InfoTooltip content="Contracted freight or transport logistics partner employing this driver. Example: Western Logistics." />
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={formData.transporter || transporterOptions[0]?.name || 'Western Logistics'}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const matched = resolveTransporterVendor(selectedName);
                      setFormData(prev => ({
                        ...prev,
                        transporter: selectedName,
                        transporterVendorId: matched?.id,
                      }));
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  >
                    {transporterOptions.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.publicId ? `${t.name} (${t.publicId})` : t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Is Vendor Checkbox */}
                <div className="space-y-1 flex flex-col justify-end">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Vendor Status
                    <InfoTooltip content="Check if driver is hired from an external third-party vendor agency." />
                  </label>
                  <div className="h-[34px] flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={Boolean(formData.vendor)}
                        onChange={(e) => updateField('vendor', e.target.checked)}
                        className="w-4 h-4 rounded text-[#FA8A63] focus:ring-[#FA8A63] cursor-pointer"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        Is Vendor (Third-party contracted driver)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 4: IDENTITY & PERSONAL DETAILS
             ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'identity') && (
            <div id="section-identity" className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FA8A63]" />
                    Section 4 — Identity & Personal Details
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Extended names, father's name, national identification, blood group and qualifications.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Personal Record
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                {/* Middle Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Middle Name
                    <InfoTooltip content="Secondary or middle name of driver. Example: Kumar." />
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="e.g. Kumar"
                    value={formData.middle || formData.middleName || ''}
                    onChange={(e) => {
                      updateField('middle', e.target.value);
                      updateField('middleName', e.target.value);
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Last Name
                    <InfoTooltip content="Family surname of driver as stated on identification. Example: Singh." />
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="e.g. Singh"
                    value={formData.last || formData.lastName || ''}
                    onChange={(e) => {
                      updateField('last', e.target.value);
                      updateField('lastName', e.target.value);
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>

                {/* Father's Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Father's Name
                    <InfoTooltip content="Father's or legal guardian's name for statutory compliance records. Example: Kailash Singh." />
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="e.g. Kailash Singh"
                    value={formData.father || ''}
                    onChange={(e) => updateField('father', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>

                {/* Aadhar Number */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Aadhar Number
                    <InfoTooltip content="12-digit Government UIDAI national identity number. Example: 4589 1234 5678." />
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="e.g. 458912345678"
                    value={formData.aadhaar || ''}
                    onChange={(e) => updateField('aadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))}
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs font-mono text-slate-900 focus:outline-none ${
                      errors.aadhaar ? 'border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                    }`}
                  />
                  {errors.aadhaar && (
                    <p className="text-[10px] text-red-500 font-semibold">{errors.aadhaar}</p>
                  )}
                </div>

                {/* Blood Group */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Blood Group
                    <InfoTooltip content="Driver blood group for emergency hospital admission and medical response. Example: B+." />
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={formData.blood || 'B+'}
                    onChange={(e) => updateField('blood', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  >
                    {DRIVER_LOOKUPS.bloodGroups.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                {/* Qualification */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Qualification
                    <InfoTooltip content="Highest formal education level completed. Example: Secondary (10th)." />
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={formData.qualification || 'Secondary (10th)'}
                    onChange={(e) => updateField('qualification', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="Primary (5th)">Primary (5th)</option>
                    <option value="Middle School (8th)">Middle School (8th)</option>
                    <option value="Secondary (10th)">Secondary (10th)</option>
                    <option value="Senior Secondary (12th)">Senior Secondary (12th)</option>
                    <option value="ITI / Technical Diploma">ITI / Technical Diploma</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Experience (in years) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Experience (in years)
                    <InfoTooltip content="Total cumulative commercial driving experience in completed years. Example: 12." />
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    disabled={isReadOnly}
                    placeholder="e.g. 12"
                    value={formData.experience !== undefined ? formData.experience : ''}
                    onChange={(e) => updateField('experience', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10)))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>

                {/* Joining Date */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Joining Date
                    <InfoTooltip content="Employment start date with current transport fleet. Example: 2021-03-15." />
                  </label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    value={formData.joining || ''}
                    onChange={(e) => updateField('joining', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 5: CONTACT & ADDRESS
             ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'contact') && (
            <div id="section-contact" className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FA8A63]" />
                    Section 5 — Contact & Address
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Emergency phone numbers, current local residence and permanent domicile.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Contact Coordinates
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                {/* Alternate No. */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Alternate No.
                    <InfoTooltip content="Secondary mobile or residential phone number. 10 digits. Example: 9876543211." />
                  </label>
                  <input
                    type="tel"
                    disabled={isReadOnly}
                    placeholder="e.g. 9876543211"
                    value={formData.alternate || ''}
                    onChange={(e) => updateField('alternate', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                      errors.alternate ? 'border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                    }`}
                  />
                  {errors.alternate && (
                    <p className="text-[10px] text-red-500 font-semibold">{errors.alternate}</p>
                  )}
                </div>

                {/* Emergency Contact No. */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Emergency Contact No.
                    <InfoTooltip content="Kin or emergency contact phone number in case of highway accident or medical crisis. Example: 9876543212." />
                  </label>
                  <input
                    type="tel"
                    disabled={isReadOnly}
                    placeholder="e.g. 9876543212"
                    value={formData.emergency || ''}
                    onChange={(e) => updateField('emergency', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none ${
                      errors.emergency ? 'border-red-500' : 'border-slate-300 focus:border-[#FA8A63]'
                    }`}
                  />
                  {errors.emergency && (
                    <p className="text-[10px] text-red-500 font-semibold">{errors.emergency}</p>
                  )}
                </div>

                {/* Local Address (Multiline) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Local Address
                    <InfoTooltip content="Current residential or hub colony address during ongoing fleet operations." />
                  </label>
                  <textarea
                    rows={2}
                    disabled={isReadOnly}
                    placeholder="e.g. Quarter 14, Adani Port Colony, Mundra"
                    value={formData.local || ''}
                    onChange={(e) => updateField('local', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] resize-none"
                  />
                </div>

                {/* Local Pincode */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Local Pincode
                    <InfoTooltip content="Postal PIN code of local residence. 6 digits. Example: 370421." />
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="e.g. 370421"
                    value={formData.localPin || ''}
                    onChange={(e) => updateField('localPin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>

                {/* Permanent Address (Multiline) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800 flex items-center">
                      Permanent Address
                      <InfoTooltip content="Official permanent home village/town domicile address as per Aadhaar." />
                    </label>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={handleCopyLocalAddress}
                        className="text-[10px] text-[#FA8A63] hover:underline font-semibold cursor-pointer"
                      >
                        Copy Local Address
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    disabled={isReadOnly}
                    placeholder="e.g. Village Rampur, Dist Ghazipur, UP"
                    value={formData.permanent || ''}
                    onChange={(e) => updateField('permanent', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] resize-none"
                  />
                </div>

                {/* Permanent Pincode */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Permanent Pincode
                    <InfoTooltip content="Postal PIN code of permanent domicile. 6 digits. Example: 233001." />
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="e.g. 233001"
                    value={formData.permanentPin || ''}
                    onChange={(e) => updateField('permanentPin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 6: LICENCE DETAILS (REMAINING INFO; DATES & DL NUMBER IN SECTION 2)
             ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'licence') && (
            <div id="section-licence" className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FA8A63]" />
                    Section 6 — Licence Details
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Authorized vehicle classification and issuing RTO authority jurisdiction details.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  RTO Authorization
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <div>
                  <strong>Active License:</strong> <span className="font-mono text-slate-900 font-bold">{formData.licence || '—'}</span>
                </div>
                <div>
                  <strong>Validity:</strong> {formData.licenceFrom || '—'} to {formData.licenceTo || '—'}
                </div>
                <span className="text-[11px] text-slate-400 italic">
                  Configured in Section 2
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                {/* License Type */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    License Type
                    <InfoTooltip content="Government motor vehicle authorized class (HMV: Heavy Motor Vehicle, HGMV: Heavy Goods Motor Vehicle, LMV: Light Motor Vehicle). Default: HMV." />
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={formData.licenceType || 'HMV'}
                    onChange={(e) => updateField('licenceType', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  >
                    <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                    <option value="HGMV">HGMV (Heavy Goods Motor Vehicle)</option>
                    <option value="LMV">LMV (Light Motor Vehicle)</option>
                    <option value="MCWG">MCWG (Motorcycle with Gear)</option>
                    <option value="Commercial Transport">Commercial Transport All India</option>
                  </select>
                </div>

                {/* Issuing Auth Address */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-800 flex items-center">
                    Issuing Auth Address
                    <InfoTooltip content="Regional Transport Office (RTO) address where the commercial licence was issued or renewed. Example: RTO Hazaribagh, Jharkhand." />
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="e.g. RTO Hazaribagh, Jharkhand"
                    value={formData.authority || ''}
                    onChange={(e) => updateField('authority', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 7: COMPLIANCE & VERIFICATION
             ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'compliance') && (
            <div id="section-compliance" className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FA8A63]" />
                    Section 7 — Compliance & Verification
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Statutory safety induction, police background clearance and official RTO certification.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {formData.rto && formData.police && formData.training ? '100% Certified' : 'Verification In-Progress'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {/* Police Verified */}
                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={Boolean(formData.police)}
                    onChange={(e) => updateField('police', e.target.checked)}
                    className="w-4 h-4 rounded text-[#FA8A63] focus:ring-[#FA8A63] mt-0.5 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center">
                      Police Verified
                      <InfoTooltip content="Police verification certificate checked and on file." />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Clear background check
                    </div>
                  </div>
                </label>

                {/* Training */}
                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={Boolean(formData.training)}
                    onChange={(e) => updateField('training', e.target.checked)}
                    className="w-4 h-4 rounded text-[#FA8A63] focus:ring-[#FA8A63] mt-0.5 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center">
                      Training
                      <InfoTooltip content="Mandatory driver safety & induction course completed." />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Defensive driving certified
                    </div>
                  </div>
                </label>

                {/* Is RTO Certified */}
                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={Boolean(formData.rto)}
                    onChange={(e) => updateField('rto', e.target.checked)}
                    className="w-4 h-4 rounded text-[#FA8A63] focus:ring-[#FA8A63] mt-0.5 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center">
                      Is RTO Certified
                      <InfoTooltip content="Licence validated directly against national RTO register." />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Official portal authenticated
                    </div>
                  </div>
                </label>
              </div>

              {/* Verification Remarks */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 flex items-center">
                  Verification Remarks
                  <InfoTooltip content="Compliance officer evaluation notes, special conditions or safety clearances." />
                </label>
                <textarea
                  rows={2}
                  disabled={isReadOnly}
                  placeholder="e.g. Certified heavy vehicle master driver. Clean record. All induction modules completed."
                  value={formData.remarks || ''}
                  onChange={(e) => updateField('remarks', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#FA8A63] resize-none"
                />
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 8: DOCUMENTS
             ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'documents') && (
            <div id="section-documents" className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FA8A63]" />
                    Section 8 — Documents
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Attach scanned verification documents (≤ 3MB each · PDF, PNG, JPG supported).
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Document Vault
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                {/* 1. Aadhar Document */}
                <div className="p-3.5 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center">
                        Aadhar Document
                        <InfoTooltip content="Upload scanned copy or e-Aadhaar PDF." />
                      </span>
                      {formData.aadhaarDoc && !isReadOnly && (
                        <button
                          type="button"
                          onClick={() => updateField('aadhaarDoc', undefined)}
                          className="text-red-500 hover:text-red-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Front & back UIDAI copy</p>
                  </div>

                  {formData.aadhaarDoc ? (
                    <div className="p-2 bg-white border border-slate-200 rounded-lg flex items-center gap-2 text-xs">
                      <FileCheck size={16} className="text-emerald-600 shrink-0" />
                      <span className="truncate flex-1 font-medium text-slate-800 text-[11px]">{formData.aadhaarDoc}</span>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <Upload size={18} className="mx-auto text-slate-400 mb-1" />
                      <div className="text-[11px] text-slate-500">Max 3 MB · PDF / JPG</div>
                      {!isReadOnly && (
                        <label className="mt-2 inline-block px-3 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                          Browse
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload('aadhaarDoc', f);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Upload Image (Driver Profile Photo) */}
                <div className="p-3.5 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center">
                        Upload Image
                        <InfoTooltip content="Passport size portrait photo with clear background." />
                      </span>
                      {(formData.imageDoc || formData.accountAvatar) && !isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            updateField('imageDoc', undefined);
                            updateField('accountAvatar', undefined);
                          }}
                          className="text-red-500 hover:text-red-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Recent passport photograph</p>
                  </div>

                  {(formData.imageDoc || formData.accountAvatar) ? (
                    <div className="p-2 bg-white border border-slate-200 rounded-lg flex items-center gap-2 text-xs">
                      <FileCheck size={16} className="text-[#FA8A63] shrink-0" />
                      <span className="truncate flex-1 font-medium text-slate-800 text-[11px]">
                        {formData.imageDoc || formData.accountAvatar}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <Upload size={18} className="mx-auto text-slate-400 mb-1" />
                      <div className="text-[11px] text-slate-500">Max 3 MB · JPG / PNG</div>
                      {!isReadOnly && (
                        <label className="mt-2 inline-block px-3 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                          Browse
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload('imageDoc', f);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Upload Driving License */}
                <div className="p-3.5 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center">
                        Upload Driving License
                        <InfoTooltip content="Scanned smart-card licence front & back." />
                      </span>
                      {formData.licenceDoc && !isReadOnly && (
                        <button
                          type="button"
                          onClick={() => updateField('licenceDoc', undefined)}
                          className="text-red-500 hover:text-red-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Commercial licence document</p>
                  </div>

                  {formData.licenceDoc ? (
                    <div className="p-2 bg-white border border-slate-200 rounded-lg flex items-center gap-2 text-xs">
                      <FileCheck size={16} className="text-[#FA8A63] shrink-0" />
                      <span className="truncate flex-1 font-medium text-slate-800 text-[11px]">{formData.licenceDoc}</span>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <Upload size={18} className="mx-auto text-slate-400 mb-1" />
                      <div className="text-[11px] text-slate-500">Max 3 MB · PDF / JPG</div>
                      {!isReadOnly && (
                        <label className="mt-2 inline-block px-3 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                          Browse
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload('licenceDoc', f);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 9: ADDITIONAL SETTINGS
             ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'settings') && (
            <div id="section-settings" className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FA8A63]" />
                    Section 9 — Additional Settings
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Fleet operational status toggle and RFID smart card authorization.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Hardware & Status
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {/* Active Status */}
                <label className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={formData.status === 'Active'}
                    onChange={(e) => updateField('status', e.target.checked ? 'Active' : 'Inactive')}
                    className="w-4 h-4 rounded text-[#FA8A63] focus:ring-[#FA8A63] mt-0.5 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center">
                      Active
                      <InfoTooltip content="Toggles whether driver is active and dispatchable in fleet operations." />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formData.status === 'Active' ? 'Operational & assignable to vehicle trips' : 'Inactive (Suspended from dispatches)'}
                    </div>
                  </div>
                </label>

                {/* RFID Enabled */}
                <label className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={Boolean(formData.rfid)}
                    onChange={(e) => updateField('rfid', e.target.checked)}
                    className="w-4 h-4 rounded text-[#FA8A63] focus:ring-[#FA8A63] mt-0.5 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center">
                      RFID Enabled
                      <InfoTooltip content="Enables RFID smart card authentication on in-vehicle telematics readers." />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formData.rfid ? 'RFID card badge active' : 'No RFID tag bound'}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}



        </div>

        {/* Drawer Sticky Bottom Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-lg">
          <div className="text-xs text-slate-500">
            {isReadOnly ? 'Viewing driver profile (Read Only)' : isDirty ? 'Unsaved changes pending' : 'All driver details in sync'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-[#FA8A63] hover:bg-[#e77a54] text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {mode === 'create' ? 'Create Driver' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Discard Changes Modal */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-6 z-40">
            <div className="bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full space-y-3 border border-slate-200 animate-in zoom-in-95 duration-100">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <AlertCircle size={18} />
                <span>Discard unsaved changes?</span>
              </div>
              <p className="text-xs text-slate-600">
                You have unsaved changes in this driver profile. Closing will discard all entered details.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
                >
                  Discard changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
