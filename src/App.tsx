/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  ArrowLeft, 
  Building2, 
  LayoutGrid, 
  Users, 
  ShieldCheck, 
  Lock, 
  Package, 
  History,
  CheckCircle2,
  AlertCircle,
  PanelLeftClose,
  Edit2,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronsUpDown,
  Radio,
  Truck,
  Video,
  Shield,
  FileText,
  Navigation,
  Layers,
  Car,
  UserCheck,
  Store,
  Cpu,
  Smartphone,
  ArrowLeftRight,
  Building
} from 'lucide-react';
import { VehiclesPageContent } from './components/VehiclesPageContent';
import { DriversPageContent } from './components/DriversPageContent';
import { FleetsPageContent } from './components/FleetsPageContent';
import { VendorsPageContent } from './components/VendorsPageContent';
import { DevicesMasterContent } from './components/DevicesMasterContent';
import { SensorsMasterContent } from './components/SensorsMasterContent';
import { SimMasterContent } from './components/SimMasterContent';
import { ModalMappingContent } from './components/ModalMappingContent';
import { ModelCategoryMasterContent } from './components/ModelCategoryMasterContent';
import { VehicleModelMasterContent } from './components/VehicleModelMasterContent';
import { CompanyManagementContent } from './components/CompanyManagementContent';
import { getEnabledModelsForCompanyName } from './types/companyModelEnablement';

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active = false, 
  collapsed = false, 
  hasArrow = false, 
  isExpanded = false,
  onClick 
}: { 
  icon: any, 
  label: string, 
  active?: boolean, 
  collapsed?: boolean, 
  hasArrow?: boolean, 
  isExpanded?: boolean,
  onClick?: () => void 
}) => (
  <button 
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer ${
      active 
        ? 'bg-[#F28C5F] text-white shadow-xs' 
        : 'text-slate-600 hover:bg-slate-50'
    }`}
  >
    <div className={`flex items-center ${collapsed ? 'justify-center w-full' : 'gap-2.5'}`}>
      <Icon size={16} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </div>
  </button>
);

const SubSidebarItem = ({ 
  icon: Icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon?: any, 
  label: string, 
  active?: boolean, 
  onClick?: () => void 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
      active 
        ? 'bg-[#FEEFEA] text-[#B85324] font-semibold' 
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`}
  >
    {Icon && <Icon size={16} className={`shrink-0 ${active ? 'text-[#B85324]' : 'text-slate-500'}`} />}
    <span className="truncate">{label}</span>
  </button>
);

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'success' | 'warning' | 'default' | 'info' }) => {
  const styles = {
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    warning: 'bg-orange-50 text-orange-600 border-orange-100',
    info: 'bg-sky-50 text-sky-600 border-sky-100',
    default: 'bg-slate-100 text-slate-600 border-slate-200'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${styles[variant]}`}>
      {children}
    </span>
  );
};

const getCompanyDetails = (company: string) => {
  switch (company) {
    case 'Platform Admin':
    case 'Binary':
      return {
        initials: 'PA',
        name: 'Platform Admin',
        industry: 'Enterprise Telematics & IoT Platform',
        employees: '500–1,000 employees',
        city: 'Gurugram, India',
        country: 'India',
        email: 'admin@platformadmin.example',
        phone: '+91 124 470 0000',
      };
    case 'Akshaykalpa':
      return {
        initials: 'AK',
        name: 'Akshaykalpa Farms & Foods',
        industry: 'Organic Dairy & Cold Chain Logistics',
        employees: '1,001–5,000 employees',
        city: 'Bengaluru, India',
        country: 'India',
        email: 'ops@akshaykalpa.example',
        phone: '+91 80 4000 0300',
      };
    case 'SIS Cash':
      return {
        initials: 'SIS',
        name: 'SIS Cash Services',
        industry: 'Cash Logistics & Armored Transport',
        employees: '10,000+ employees',
        city: 'New Delhi, India',
        country: 'India',
        email: 'contact@siscash.example',
        phone: '+91 11 4550 0200',
      };
    case 'Adani Mundra':
      return {
        initials: 'AM',
        name: 'Adani Mundra Port & SEZ',
        industry: 'Ports, Special Economic Zone & Marine',
        employees: '5,001–10,000 employees',
        city: 'Mundra, India',
        country: 'India',
        email: 'operations@adanimundra.example',
        phone: '+91 28 3825 0400',
      };
    case 'AKPL':
      return {
        initials: 'AKPL',
        name: 'AKPL Logistics Pvt Ltd',
        industry: 'Bulk Transport & Fleet Management',
        employees: '501–1,000 employees',
        city: 'Mumbai, India',
        country: 'India',
        email: 'support@akpl.example',
        phone: '+91 22 6600 0500',
      };
    case 'Adani Port':
    default:
      return {
        initials: 'AP',
        name: 'Adani Port',
        industry: 'Ports & logistics',
        employees: '1,001–5,000 employees',
        city: 'Ahmedabad, India',
        country: 'India',
        email: 'operations@adaniport.example',
        phone: '+91 79 5550 0100',
      };
  }
};

export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewRole, setViewRole] = useState<'admin' | 'customer'>('customer'); // Default to customer view as requested
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [customerTab, setCustomerTab] = useState<'needsAction' | 'waiting' | 'ready' | 'closed' | 'all'>('needsAction');
  const [currentCompany, setCurrentCompany] = useState('Adani Mundra');
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Customer navigation state
  const [activeCustomerMenu, setActiveCustomerMenu] = useState('setup-vehicles');
  const [transportExpanded, setTransportExpanded] = useState(false);
  const [operationalSetupExpanded, setOperationalSetupExpanded] = useState(true);

  // Admin navigation state
  const [activeAdminMenu, setActiveAdminMenu] = useState('company-details');
  const [modalMasterExpanded, setModalMasterExpanded] = useState(true);

  // Sync company model access updates between Binary Platform Admin and Client Modal Master
  const [modelAccessTick, setModelAccessTick] = useState(0);
  useEffect(() => {
    const handleSync = () => setModelAccessTick((t) => t + 1);
    window.addEventListener('fleetrobo:model-access-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('fleetrobo:model-access-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const enabledModelsForCompany = useMemo(
    () => getEnabledModelsForCompanyName(currentCompany),
    [currentCompany, modelAccessTick]
  );

  const hasEnabledDevices = useMemo(
    () => enabledModelsForCompany.some((m) => m.category === 'Device'),
    [enabledModelsForCompany]
  );
  const hasEnabledSensors = useMemo(
    () => enabledModelsForCompany.some((m) => m.category === 'Sensor'),
    [enabledModelsForCompany]
  );
  const hasEnabledSims = useMemo(
    () => enabledModelsForCompany.some((m) => m.category === 'SIM'),
    [enabledModelsForCompany]
  );

  useEffect(() => {
    if (
      (activeAdminMenu === 'devices' && !hasEnabledDevices) ||
      (activeAdminMenu === 'sensors' && !hasEnabledSensors) ||
      (activeAdminMenu === 'sim-master' && !hasEnabledSims)
    ) {
      if (hasEnabledDevices) setActiveAdminMenu('devices');
      else if (hasEnabledSensors) setActiveAdminMenu('sensors');
      else if (hasEnabledSims) setActiveAdminMenu('sim-master');
      else setActiveAdminMenu('company-details');
    }
  }, [activeAdminMenu, hasEnabledDevices, hasEnabledSensors, hasEnabledSims]);

  const compDetails = getCompanyDetails(currentCompany);

  return (
    <div className="flex h-screen w-screen max-w-[1440px] max-h-[900px] mx-auto my-auto bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans shadow-2xl border border-slate-200 rounded-xl">
      {/* Sidebar */}
      <aside className={`${isCollapsed ? 'w-18' : 'w-60'} bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 z-20`}>
        {/* Logo & Collapse Header */}
        <div className={`h-14 px-3.5 flex items-center ${isCollapsed ? 'justify-center flex-col gap-2 py-2 h-auto' : 'justify-between'} border-b border-slate-100`}>
          {!isCollapsed ? (
            <div className="flex items-center min-w-0">
              <img 
                src="/assets/aistudio/binary-semantics-logo.png" 
                alt="Platform Admin" 
                className="h-8.5 max-w-[150px] w-auto object-contain block"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/aistudio/binary-semantics-logo.svg';
                }}
              />
            </div>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center overflow-hidden mb-1" title="Platform Admin">
              <img 
                src="/assets/aistudio/binary-semantics-mark.svg" 
                alt="Platform Admin" 
                className="w-7 h-7 object-contain block"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/aistudio/binary-semantics-logo.png';
                }}
              />
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-1.5 rounded hover:bg-slate-100 transition-colors shrink-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeftClose size={16} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {!isCollapsed && (
          <div className="px-3 pt-2.5">
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
              <ArrowLeft size={14} />
              <span>Back to work</span>
            </button>
          </div>
        )}

        {/* Navigation Section */}
        <nav className="flex-1 px-3 mt-3 space-y-0.5 overflow-y-auto">
          {viewRole === 'admin' ? (
            <>
              {!isCollapsed && (
                <div className="px-2.5 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Company settings
                </div>
              )}
              <SidebarItem icon={Building2} label="Company details" active={activeAdminMenu === 'company-details'} collapsed={isCollapsed} onClick={() => setActiveAdminMenu('company-details')} />
              {(currentCompany === 'Platform Admin' || currentCompany === 'Binary') && (
                <SidebarItem 
                  icon={Building} 
                  label="Company Management" 
                  active={activeAdminMenu === 'company-management'} 
                  collapsed={isCollapsed} 
                  onClick={() => setActiveAdminMenu('company-management')} 
                />
              )}
              <SidebarItem icon={LayoutGrid} label="Sites & structure" active={activeAdminMenu === 'sites'} collapsed={isCollapsed} onClick={() => setActiveAdminMenu('sites')} />
              <SidebarItem icon={Users} label="People" active={activeAdminMenu === 'people'} collapsed={isCollapsed} onClick={() => setActiveAdminMenu('people')} />
              <SidebarItem icon={ShieldCheck} label="Roles & permissions" active={activeAdminMenu === 'roles'} collapsed={isCollapsed} onClick={() => setActiveAdminMenu('roles')} />
              <SidebarItem icon={Lock} label="Security" active={activeAdminMenu === 'security'} collapsed={isCollapsed} onClick={() => setActiveAdminMenu('security')} />
              <SidebarItem icon={Package} label="Products & plan" active={activeAdminMenu === 'products'} collapsed={isCollapsed} onClick={() => setActiveAdminMenu('products')} />
              <SidebarItem icon={History} label="Activity" active={activeAdminMenu === 'activity'} collapsed={isCollapsed} onClick={() => setActiveAdminMenu('activity')} />

              {/* Modal Category Master (Platform Admin org & Admin View only), Modal Master & Modal Mapping below Activity */}
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                {(currentCompany === 'Platform Admin' || currentCompany === 'Binary') && (
                  <SidebarItem 
                    icon={Layers} 
                    label="Model Category Master" 
                    active={activeAdminMenu === 'modal-category-master'} 
                    collapsed={isCollapsed} 
                    onClick={() => setActiveAdminMenu('modal-category-master')} 
                  />
                )}
                <SidebarItem 
                  icon={Truck} 
                  label="Vehicle Model Master" 
                  active={activeAdminMenu === 'vehicle-model-master'} 
                  collapsed={isCollapsed} 
                  onClick={() => setActiveAdminMenu('vehicle-model-master')} 
                />
                {(hasEnabledDevices || hasEnabledSensors || hasEnabledSims) && (
                  <>
                    <SidebarItem 
                      icon={Cpu} 
                      label="Model Master" 
                      active={activeAdminMenu === 'devices' || activeAdminMenu === 'sensors' || activeAdminMenu === 'sim-master'}
                      collapsed={isCollapsed} 
                      hasArrow 
                      isExpanded={modalMasterExpanded}
                      onClick={() => {
                        if (!modalMasterExpanded) {
                          setModalMasterExpanded(true);
                        }
                        if (hasEnabledDevices) setActiveAdminMenu('devices');
                        else if (hasEnabledSensors) setActiveAdminMenu('sensors');
                        else if (hasEnabledSims) setActiveAdminMenu('sim-master');
                      }} 
                    />
                    {!isCollapsed && modalMasterExpanded && (
                      <div className="space-y-0.5 my-1 pl-1">
                        {hasEnabledDevices && (
                          <SubSidebarItem icon={Cpu} label="Devices" active={activeAdminMenu === 'devices'} onClick={() => setActiveAdminMenu('devices')} />
                        )}
                        {hasEnabledSensors && (
                          <SubSidebarItem icon={Radio} label="Sensors" active={activeAdminMenu === 'sensors'} onClick={() => setActiveAdminMenu('sensors')} />
                        )}
                        {hasEnabledSims && (
                          <SubSidebarItem icon={Smartphone} label="SIM" active={activeAdminMenu === 'sim-master'} onClick={() => setActiveAdminMenu('sim-master')} />
                        )}
                      </div>
                    )}
                  </>
                )}
                <SidebarItem 
                  icon={ArrowLeftRight} 
                  label="Assets Mapping" 
                  active={activeAdminMenu === 'modal-mapping'} 
                  collapsed={isCollapsed} 
                  onClick={() => setActiveAdminMenu('modal-mapping')} 
                />
              </div>
            </>
          ) : (
            <>
              {/* Customer View Navigation matching image_31dffb0e.png */}
              <SidebarItem icon={LayoutGrid} label="Quick Action" active={activeCustomerMenu === 'quick-action'} collapsed={isCollapsed} onClick={() => setActiveCustomerMenu('quick-action')} />
              <SidebarItem icon={Radio} label="Live" active={activeCustomerMenu === 'live'} collapsed={isCollapsed} onClick={() => setActiveCustomerMenu('live')} />
              
              {/* Transport with Subitems */}
              <div>
                <SidebarItem 
                  icon={Truck} 
                  label="Transport" 
                  active={activeCustomerMenu.startsWith('transport')} 
                  collapsed={isCollapsed} 
                  hasArrow 
                  isExpanded={transportExpanded}
                  onClick={() => setTransportExpanded(!transportExpanded)} 
                />
                {!isCollapsed && transportExpanded && (
                  <div className="space-y-0.5 my-1">
                    <SubSidebarItem label="Orders" active={activeCustomerMenu === 'transport-orders'} onClick={() => setActiveCustomerMenu('transport-orders')} />
                    <SubSidebarItem label="Plans" active={activeCustomerMenu === 'transport-plans'} onClick={() => setActiveCustomerMenu('transport-plans')} />
                    <SubSidebarItem label="Dispatch" active={activeCustomerMenu === 'transport-dispatch'} onClick={() => setActiveCustomerMenu('transport-dispatch')} />
                    <SubSidebarItem label="Reports" active={activeCustomerMenu === 'transport-reports'} onClick={() => setActiveCustomerMenu('transport-reports')} />
                  </div>
                )}
              </div>

              <SidebarItem icon={Building2} label="Plant operations" active={activeCustomerMenu === 'plant'} collapsed={isCollapsed} onClick={() => setActiveCustomerMenu('plant')} />
              <SidebarItem icon={Shield} label="Safety" active={activeCustomerMenu === 'safety'} collapsed={isCollapsed} onClick={() => setActiveCustomerMenu('safety')} />
              <SidebarItem icon={Video} label="Video" active={activeCustomerMenu === 'video'} collapsed={isCollapsed} onClick={() => setActiveCustomerMenu('video')} />
            </>
          )}
        </nav>

        {/* Pinned Bottom Utility Links for Customer View (Operational Setup with Resources, Company Settings, Help) */}
        {viewRole === 'customer' && (
          <div className="px-3 py-2 border-t border-slate-100 space-y-0.5 shrink-0">
            <div>
              <SidebarItem 
                icon={Settings} 
                label="Operational setup" 
                collapsed={isCollapsed} 
                hasArrow 
                isExpanded={operationalSetupExpanded}
                onClick={() => setOperationalSetupExpanded(!operationalSetupExpanded)} 
              />
              {!isCollapsed && operationalSetupExpanded && (
                <div className="space-y-1 my-1.5 pl-1 pr-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-800">
                    <Package size={16} className="text-slate-700" />
                    <span>Resources</span>
                  </div>
                  <SubSidebarItem icon={Users} label="Drivers" active={activeCustomerMenu === 'setup-drivers'} onClick={() => setActiveCustomerMenu('setup-drivers')} />
                  <SubSidebarItem icon={Truck} label="Vehicles" active={activeCustomerMenu === 'setup-vehicles'} onClick={() => setActiveCustomerMenu('setup-vehicles')} />
                  <SubSidebarItem icon={Layers} label="Fleets" active={activeCustomerMenu === 'setup-fleets'} onClick={() => setActiveCustomerMenu('setup-fleets')} />
                  <SubSidebarItem icon={Store} label="Vendors" active={activeCustomerMenu === 'setup-vendors'} onClick={() => setActiveCustomerMenu('setup-vendors')} />
                  <SubSidebarItem icon={ArrowLeftRight} label="Hardware & Mappings" active={activeCustomerMenu === 'setup-modal-mapping'} onClick={() => setActiveCustomerMenu('setup-modal-mapping')} />
                </div>
              )}
            </div>
            <SidebarItem icon={Building2} label="Company settings" collapsed={isCollapsed} hasArrow onClick={() => alert('Company settings clicked')} />
            <SidebarItem icon={HelpCircle} label="Help" collapsed={isCollapsed} onClick={() => alert('Help clicked')} />
          </div>
        )}

        {/* Bottom Onboarding Manager Section */}
        <div className="p-2.5 border-t border-slate-200">
          <div className={`flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 shrink-0 flex items-center justify-center">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces" 
                alt="Manager" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[11px] font-bold text-slate-900 truncate">Onboarding manager</div>
                <div className="text-[9px] text-slate-500 truncate">FleetRobo staff</div>
              </div>
            )}
            {!isCollapsed && <ChevronsUpDown size={13} className="text-slate-400 shrink-0" />}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header Container */}
        <header className="h-16 bg-[#F8FAFC] px-5 py-2 flex items-center shrink-0">
          <div className="w-full bg-white border border-slate-200/90 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] h-12 px-4 flex items-center justify-between">
            {/* Search Input Box */}
            <div className="w-[380px]">
              <div className="relative flex items-center">
                <Search className="absolute left-3 text-slate-400" size={14} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Order, Plan.... [Ctrl+K]" 
                  className="w-full pl-9 pr-3 py-1 bg-transparent border-0 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Right Group */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 pr-3 border-r border-slate-200">
                {/* Interactive Company Selector Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCompanyMenu(!showCompanyMenu)}
                    className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <span className="text-base font-black text-[#9D174D] tracking-tighter">
                      {currentCompany.includes('Adani') ? 'adani' : currentCompany === 'SIS Cash' ? 'SIS' : currentCompany === 'Akshaykalpa' ? 'AK' : (currentCompany === 'Platform Admin' || currentCompany === 'Binary') ? 'PA' : 'AKPL'}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 ml-0.5">{currentCompany === 'Binary' ? 'Platform Admin' : currentCompany}</span>
                    <ChevronDown size={13} className="text-slate-400 ml-0.5" />
                  </button>

                  {showCompanyMenu && (
                    <div className="absolute left-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                        Switch Company
                      </div>
                      {[
                        'Adani Port',
                        'SIS Cash',
                        'Akshaykalpa',
                        'Adani Mundra',
                        'Adanimundra SMNL',
                        'Central Store',
                        'CT2 Terminal',
                        'CT3 Terminal',
                        'CT4 Terminal',
                        'CT5 Terminal',
                        'AKPL',
                        'Platform Admin'
                      ].map((comp) => {
                        const isChild = ['Adanimundra SMNL', 'Central Store', 'CT2 Terminal', 'CT3 Terminal', 'CT4 Terminal', 'CT5 Terminal'].includes(comp);
                        return (
                          <button
                            key={comp}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentCompany(comp);
                              setShowCompanyMenu(false);
                              if (comp === 'Platform Admin' && viewRole === 'admin') {
                                setActiveAdminMenu('modal-category-master');
                              }
                            }}
                            className={`w-full text-left px-3 py-1.5 font-medium transition-colors flex items-center justify-between cursor-pointer ${
                              isChild ? 'pl-6 text-[11px] text-slate-600' : ''
                            } ${
                              currentCompany === comp ? 'bg-[#FFF3EE] text-[#FA8A63] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{isChild ? `↳ ${comp}` : comp}</span>
                            {currentCompany === comp && <CheckCircle2 size={12} className="text-[#FA8A63]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer hover:text-slate-900 px-1.5 py-1 rounded-lg hover:bg-slate-50 transition-colors">
                  <span>All sites</span>
                  <ChevronDown size={13} className="text-slate-400" />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pl-1 relative">
                <button className="relative p-1.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                  <Bell size={16} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>

                {/* Profile Button */}
                <div className="relative">
                  <button 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-7 h-7 rounded-full bg-[#FFE4E6] flex items-center justify-center text-[11px] font-bold text-[#9F1239] border border-[#FECDD3] cursor-pointer hover:ring-2 hover:ring-rose-300 transition-all shadow-xs"
                  >
                    {viewRole === 'admin' ? 'PA' : 'RK'}
                  </button>

                  {/* Profile Dropdown Menu */}
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3.5 py-2 border-b border-slate-100">
                        <div className="text-xs font-bold text-slate-900">
                          {viewRole === 'admin' ? 'Platform Admin' : `${currentCompany} Reviewer`}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {viewRole === 'admin' ? 'admin@platformadmin.example' : `support@${currentCompany.toLowerCase().replace(/[^a-z0-9]/g, '')}.example`}
                        </div>
                      </div>

                      <div className="p-1.5 space-y-0.5">
                        <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Switch View & Role</div>
                        <button 
                          onClick={() => { setViewRole('admin'); setShowProfileMenu(false); }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${viewRole === 'admin' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 size={13} />
                            <span>Admin View (Company Settings)</span>
                          </div>
                          {viewRole === 'admin' && <CheckCircle2 size={13} className="text-indigo-600" />}
                        </button>
                        <button 
                          onClick={() => { setViewRole('customer'); setShowProfileMenu(false); }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${viewRole === 'customer' ? 'bg-orange-50 text-orange-700 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-2">
                            <Users size={13} />
                            <span>Customer Review View</span>
                          </div>
                          {viewRole === 'customer' && <CheckCircle2 size={13} className="text-orange-600" />}
                        </button>
                      </div>

                      <div className="border-t border-slate-100 p-1.5">
                        <button 
                          onClick={() => {
                            alert(`Logged out from ${viewRole.toUpperCase()} session successfully.`);
                            setShowProfileMenu(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Lock size={13} />
                          <span>Log out current session</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className={`flex-1 overflow-y-auto ${((activeCustomerMenu === 'setup-vehicles' || activeCustomerMenu === 'setup-drivers' || activeCustomerMenu === 'setup-fleets' || activeCustomerMenu === 'setup-vendors' || activeCustomerMenu === 'setup-modal-mapping') && viewRole === 'customer') || ((activeAdminMenu === 'devices' || activeAdminMenu === 'sensors' || activeAdminMenu === 'sim-master' || activeAdminMenu === 'modal-mapping' || activeAdminMenu === 'modal-category-master' || activeAdminMenu === 'vehicle-model-master' || activeAdminMenu === 'company-management') && viewRole === 'admin') ? 'p-0' : 'px-6 py-5'}`}>
          {viewRole === 'admin' ? (
            activeAdminMenu === 'company-management' ? (
              <CompanyManagementContent 
                onNavigateToModelCategoryMaster={() => setActiveAdminMenu('modal-category-master')} 
              />
            ) : activeAdminMenu === 'modal-category-master' ? (
              <ModelCategoryMasterContent />
            ) : activeAdminMenu === 'vehicle-model-master' ? (
              <VehicleModelMasterContent currentCompany={currentCompany} />
            ) : activeAdminMenu === 'devices' ? (
              <DevicesMasterContent currentCompany={currentCompany} />
            ) : activeAdminMenu === 'sensors' ? (
              <SensorsMasterContent currentCompany={currentCompany} />
            ) : activeAdminMenu === 'sim-master' ? (
              <SimMasterContent currentCompany={currentCompany} />
            ) : activeAdminMenu === 'modal-mapping' ? (
              <ModalMappingContent currentCompany={currentCompany} viewRole={viewRole} />
            ) : (
            <div className="max-w-5xl mx-auto space-y-5">
              {/* Page Title Row */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Company details</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Your approved company profile and the defaults your team works with.</p>
                </div>
                <div className="flex items-center gap-2">
                  {(currentCompany === 'Platform Admin' || currentCompany === 'Binary') && (
                    <button 
                      onClick={() => setActiveAdminMenu('company-management')}
                      className="px-3.5 py-1.5 bg-[#FA8A63] hover:bg-[#e57953] text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Building size={14} />
                      <span>Manage Client Companies</span>
                    </button>
                  )}
                  <button className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer">
                    View submitted update
                  </button>
                </div>
              </div>

              {/* Platform Admin Banner */}
              {(currentCompany === 'Platform Admin' || currentCompany === 'Binary') && (
                <div className="bg-gradient-to-r from-orange-50 via-white to-indigo-50/40 border border-orange-200/90 rounded-xl p-4 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FA8A63] text-white flex items-center justify-center font-bold shadow-xs">
                      <Building size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">Platform Admin: Company Management & Model Access</h4>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#FFF3EE] text-[#FA8A63] border border-[#FA8A63]/30">
                          Platform Admin Context
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Manage all onboarded client companies (Adani Mundra, SIS Cash, Akshaykalpa, AKPL) and enable/disable hardware models for each tenant.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveAdminMenu('company-management')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FA8A63] hover:bg-[#e57953] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <span>Open Company Management</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* Main Info Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                    {compDetails.initials}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{compDetails.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <span>{compDetails.industry}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span>{compDetails.city}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span>{compDetails.employees}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Profile approved</Badge>
                  <Badge variant="warning">1 update in review</Badge>
                </div>
              </div>

              {/* Alert Banner */}
              <div className="bg-[#FFFBEB] border-l-4 border-[#F59E0B] p-3 flex gap-2.5 rounded-r-lg shadow-xs">
                <AlertCircle className="text-[#F59E0B] shrink-0" size={18} />
                <div>
                  <div className="text-xs font-bold text-[#92400E]">Your update is with FleetRobo for review</div>
                  <div className="text-xs text-[#B45309] mt-0.5">Contact email and company phone changed. Approved details stay in use until the review is done.</div>
                </div>
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-12 gap-5">
                {/* Left Column: Company Profile */}
                <div className="col-span-8 space-y-5">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Company profile</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">Checked and approved by FleetRobo.</p>
                      </div>
                      <button className="flex items-center gap-1.5 px-3 py-1 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer">
                        <Edit2 size={13} />
                        Edit profile
                      </button>
                    </div>

                    <div className="space-y-5">
                      {/* Organization Section */}
                      <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Organisation</h3>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <div className="text-slate-500 mb-0.5">Company name</div>
                            <div className="font-semibold text-slate-900">{compDetails.name}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-0.5">Industry</div>
                            <div className="font-semibold text-slate-900">{compDetails.industry}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-0.5">Employee size</div>
                            <div className="font-semibold text-slate-900">{compDetails.employees}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-0.5">Registered city & country</div>
                            <div className="font-semibold text-slate-900">{compDetails.city}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-0.5">Operating countries</div>
                            <div className="font-semibold text-slate-900">{compDetails.country}</div>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-slate-100"></div>

                      {/* Contact Section */}
                      <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Contact</h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-slate-500">Contact email</span>
                              <Badge variant="warning">In review</Badge>
                            </div>
                            <div className="font-semibold text-slate-900">{compDetails.email}</div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-slate-500">Company phone</span>
                              <Badge variant="warning">In review</Badge>
                            </div>
                            <div className="font-semibold text-slate-900">{compDetails.phone}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Administrator Access */}
                <div className="col-span-4 space-y-5">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-bold text-slate-900">Administrator access</h2>
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        Active
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100 mb-4 relative group cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-200">
                        {viewRole === 'admin' ? 'PA' : 'RK'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {viewRole === 'admin' ? 'Platform Admin' : 'Rohan Kumar'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {viewRole === 'admin' ? 'admin@platformadmin.example' : `rohan.kumar@${currentCompany.toLowerCase().replace(/[^a-z0-9]/g, '')}.example`}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-600">
                        You
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">Access checks</span>
                        <span className="font-bold text-slate-900">5 of 5 complete</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-emerald-500"></div>
                      </div>

                      <div className="pt-2 space-y-3 text-xs">
                        {[
                          { title: 'Identity', subtitle: 'Verified with Platform Admin', status: 'Verified' },
                          { title: 'Administrator nomination', subtitle: 'By FleetRobo', status: 'Approved' },
                          { title: 'Administrator acceptance', subtitle: 'By you', status: 'Accepted' }
                        ].map((check, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className="mt-0.5 w-4 h-4 rounded-full border border-emerald-500 flex items-center justify-center text-emerald-500 bg-emerald-50 shrink-0">
                              <CheckCircle2 size={10} strokeWidth={3} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-900 text-xs">{check.title}</div>
                              <div className="text-[10px] text-slate-500">{check.subtitle}</div>
                            </div>
                            <span className="text-[11px] font-medium text-slate-400 shrink-0">{check.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )
          ) : activeCustomerMenu === 'setup-vehicles' ? (
            /* FleetRobo 2.0 Vehicles Master Complete Module */
            <VehiclesPageContent companyContext={currentCompany} />
          ) : activeCustomerMenu === 'setup-drivers' ? (
            /* FleetRobo 2.0 Driver Master V2 Complete Module */
            <DriversPageContent companyContext={currentCompany} />
          ) : activeCustomerMenu === 'setup-fleets' ? (
            /* FleetRobo 2.0 Fleets Master Complete Module */
            <FleetsPageContent />
          ) : activeCustomerMenu === 'setup-vendors' ? (
            /* FleetRobo 2.0 Vendors Master Complete Module */
            <VendorsPageContent companyContext={currentCompany} />
          ) : activeCustomerMenu === 'setup-modal-mapping' ? (
            /* FleetRobo 2.0 Organization Customer View: Read-Only Hardware & Mappings */
            <ModalMappingContent currentCompany={currentCompany} viewRole="customer" />
          ) : (
            /* Customer View content based on active selection */
            <div className="max-w-5xl mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 capitalize">
                    {activeCustomerMenu.startsWith('setup-') 
                      ? activeCustomerMenu.replace('setup-', '') 
                      : activeCustomerMenu.replace('-', ' ')}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Viewing {activeCustomerMenu} management dashboard for Adani Port operations.
                  </p>
                </div>
                <button className="px-3.5 py-1.5 bg-[#F28C5F] text-white rounded-lg text-xs font-semibold hover:bg-[#e07b4e] transition-colors shadow-xs cursor-pointer">
                  Add New {activeCustomerMenu.startsWith('setup-') ? activeCustomerMenu.replace('setup-', '') : 'Record'}
                </button>
              </div>

              {/* Dynamic View Content Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Total Active</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">248</div>
                  <div className="text-[11px] text-emerald-600 mt-1 font-semibold">+12% from last week</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">In Transit / Operational</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">192</div>
                  <div className="text-[11px] text-sky-600 mt-1 font-semibold">98.4% uptime</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Attention Required</div>
                  <div className="text-2xl font-bold text-orange-600 mt-1">4</div>
                  <div className="text-[11px] text-orange-600 mt-1 font-semibold">Requires review</div>
                </div>
              </div>

              {/* Table / Details view */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {activeCustomerMenu} Directory & Status
                </div>
                <div className="p-8 text-center text-slate-500 text-xs">
                  Showing detailed operational records for <span className="font-semibold text-slate-800 uppercase">{activeCustomerMenu}</span>. Fully integrated with Adani Port site telemetry.
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
