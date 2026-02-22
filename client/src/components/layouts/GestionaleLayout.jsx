import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { 
  Building2,
  Users,
  FileText,
  Package,
  Truck,
  BarChart3,
  MapPinned,
  LogOut, 
  Menu, 
  X,
  ChevronDown,
  ChevronRight,
  UserCircle,
  Factory,
  Send,
  Warehouse,
  Car,
  Wrench,
  FileCheck,
  ShoppingCart,
  Link2,
  Boxes,
  Fuel,
  Settings as SettingsIcon,
  Receipt,
  FileInput,
  Construction
} from 'lucide-react';
import clsx from 'clsx';
import AppSelector from '../AppSelector';

// Menu structure with submenus
const navItems = [
  { 
    id: 'anagrafiche',
    icon: Users, 
    label: 'Anagrafiche',
    children: [
      { path: '/gestionale/anagrafiche/clienti', icon: UserCircle, label: 'Clienti' },
      { path: '/gestionale/anagrafiche/vettori', icon: Truck, label: 'Vettori' },
      { path: '/gestionale/anagrafiche/mittenti-destinatari', icon: Send, label: 'Mittenti/Destinatari' },
      { path: '/gestionale/anagrafiche/piattaforme', icon: Factory, label: 'Piattaforme' },
      { path: '/gestionale/anagrafiche/magazzino', icon: Warehouse, label: 'Magazzino' },
      { path: '/gestionale/anagrafiche/tipi-veicoli', icon: Car, label: 'Tipi Veicoli' },
      { path: '/gestionale/anagrafiche/autisti', icon: Users, label: 'Autisti' },
      { path: '/gestionale/anagrafiche/officine', icon: Wrench, label: 'Officine' },
      { path: '/gestionale/anagrafiche/tipi-documenti', icon: FileCheck, label: 'Tipi Documenti' },
    ]
  },
  { 
    id: 'fatture',
    icon: Receipt, 
    label: 'Fatture',
    badge: 'Soon',
    children: [
      { path: '/gestionale/fatture/clienti', icon: FileText, label: 'Fatture Clienti' },
      { path: '/gestionale/fatture/fornitori', icon: FileInput, label: 'Fatture Fornitori' },
    ]
  },
  { 
    id: 'ordini',
    icon: ShoppingCart, 
    label: 'Ordini',
    children: [
      { path: '/gestionale/ordini/lista', icon: Package, label: 'Lista Ordini' },
      { path: '/gestionale/ordini/da-abbinare', icon: Link2, label: 'Da Abbinare' },
      { path: '/gestionale/ordini/magazzino', icon: Boxes, label: 'Gestione Magazzino' },
    ]
  },
  { 
    id: 'automezzi',
    icon: Truck, 
    label: 'Automezzi',
    children: [
      { path: '/gestionale/automezzi/lista', icon: Car, label: 'Lista Automezzi' },
      { path: '/gestionale/automezzi/rifornimenti', icon: Fuel, label: 'Rifornimenti' },
      { path: '/gestionale/automezzi/manutenzioni', icon: Wrench, label: 'Manutenzioni' },
      { path: '/gestionale/automezzi/documenti', icon: FileCheck, label: 'Documenti' },
    ]
  },
  { 
    id: 'trasporti',
    icon: MapPinned, 
    label: 'Trasporti',
    badge: 'Soon',
    children: [
      { path: '/gestionale/trasporti/pianificazione', icon: MapPinned, label: 'Pianificazione' },
    ]
  },
  { 
    id: 'report',
    icon: BarChart3, 
    label: 'Report',
    badge: 'Soon',
    children: [
      { path: '/gestionale/report/dashboard', icon: BarChart3, label: 'Dashboard Report' },
    ]
  },
];

function NavItemWithSubmenu({ item, isOpen, onToggle, onNavigate }) {
  const location = useLocation();
  const isActive = item.children?.some(child => location.pathname === child.path);
  
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={clsx(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors",
          isActive || isOpen
            ? "bg-blue-900/50 text-white" 
            : "text-blue-200 hover:bg-blue-800 hover:text-white"
        )}
      >
        <div className="flex items-center gap-3">
          <item.icon size={20} />
          <span className="font-medium">{item.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {item.badge && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500 text-amber-950 rounded font-semibold">
              {item.badge}
            </span>
          )}
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>
      
      {isOpen && (
        <div className="mt-1 ml-4 pl-4 border-l border-blue-700 space-y-0.5">
          {item.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              onClick={onNavigate}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                isActive 
                  ? "bg-blue-600 text-white" 
                  : "text-blue-300 hover:bg-blue-800 hover:text-white"
              )}
            >
              <child.icon size={16} />
              <span>{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GestionaleLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState(['anagrafiche']); // Default open
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-open menu based on current path
  React.useEffect(() => {
    const currentItem = navItems.find(item => 
      item.children?.some(child => location.pathname.startsWith(child.path.split('/').slice(0, 4).join('/')))
    );
    if (currentItem && !openMenus.includes(currentItem.id)) {
      setOpenMenus(prev => [...prev, currentItem.id]);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = (menuId) => {
    setOpenMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* App Selector */}
      <AppSelector />

      <div className="flex flex-1">
        {/* Mobile header */}
        <div className="lg:hidden fixed top-[42px] left-0 right-0 bg-blue-700 text-white p-4 flex items-center justify-between z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2">
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-semibold">Gestionale</h1>
          <div className="w-10" />
        </div>

        {/* Sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={clsx(
          "fixed top-[42px] left-0 h-[calc(100vh-42px)] w-72 bg-blue-950 text-white z-50 transform transition-transform duration-200",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-4 flex items-center justify-between border-b border-blue-800">
            <div className="flex items-center gap-2">
              <Building2 className="text-blue-400" size={28} />
              <span className="text-xl font-bold">Gestionale</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">
              <X size={24} />
            </button>
          </div>

          <nav className="p-3 overflow-y-auto h-[calc(100%-140px)] custom-scrollbar">
            {navItems.map((item) => (
              <NavItemWithSubmenu
                key={item.id}
                item={item}
                isOpen={openMenus.includes(item.id)}
                onToggle={() => toggleMenu(item.id)}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-400">Logged in as</p>
                <p className="font-medium">{user?.username || 'Admin'}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-blue-400 hover:text-white hover:bg-blue-800 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="lg:ml-72 flex-1 mt-0 lg:mt-0 pt-[60px] lg:pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
