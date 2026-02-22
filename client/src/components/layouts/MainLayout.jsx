import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { 
  // Satellitare
  Satellite,
  Home,
  Truck,
  MapPin,
  Route,
  Bell,
  History,
  Users,
  Settings,
  Sliders,
  
  // Gestionale
  Building2,
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
  Receipt,
  FileInput,
  FileText,
  BarChart3,
  MapPinned,
  Package,
  
  // UI
  LogOut, 
  Menu, 
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// CONFIGURAZIONE MENU
// ============================================================================
const menuConfig = [
  {
    id: 'satellitare',
    icon: Satellite,
    label: 'Satellitare',
    color: 'emerald',
    children: [
      { path: '/', icon: Home, label: 'Dashboard' },
      { path: '/vehicles', icon: Truck, label: 'Veicoli' },
      { path: '/geofences', icon: MapPin, label: 'Geofence' },
      { path: '/routes', icon: Route, label: 'Tratte' },
      { path: '/alarms', icon: Bell, label: 'Allarmi' },
      { path: '/events', icon: History, label: 'Eventi' },
      { path: '/drivers', icon: Users, label: 'Autisti' },
      { path: '/settings', icon: Settings, label: 'Impostazioni' },
    ]
  },
  {
    id: 'gestionale',
    icon: Building2,
    label: 'Gestionale',
    color: 'blue',
    children: [
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
    ]
  },
];

// ============================================================================
// CONTEXT PER SIDEBAR
// ============================================================================
const SidebarContext = createContext(null);

export const useSidebar = () => useContext(SidebarContext);

// ============================================================================
// STORAGE KEYS
// ============================================================================
const STORAGE_KEYS = {
  COLLAPSED: 'sidebar_collapsed',
  OPEN_MENUS: 'sidebar_open_menus',
};

// ============================================================================
// COMPONENTE MENU ITEM (singolo link)
// ============================================================================
function MenuItem({ item, collapsed, onNavigate, level = 0, accentColor = 'blue' }) {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  
  const colorClasses = {
    emerald: {
      active: 'bg-emerald-600 text-white',
      hover: 'hover:bg-emerald-900/50 hover:text-white',
      text: 'text-emerald-200',
    },
    blue: {
      active: 'bg-blue-600 text-white',
      hover: 'hover:bg-blue-900/50 hover:text-white',
      text: 'text-blue-200',
    },
  };
  
  const colors = colorClasses[accentColor] || colorClasses.blue;
  
  if (collapsed && level === 0) {
    return (
      <NavLink
        to={item.path}
        onClick={onNavigate}
        title={item.label}
        className={clsx(
          "flex items-center justify-center p-3 rounded-lg transition-colors",
          isActive ? colors.active : `${colors.text} ${colors.hover}`
        )}
      >
        <item.icon size={20} />
      </NavLink>
    );
  }
  
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={clsx(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
        level > 0 ? 'text-sm' : '',
        isActive ? colors.active : `${colors.text} ${colors.hover}`
      )}
    >
      <item.icon size={level > 0 ? 16 : 20} />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

// ============================================================================
// COMPONENTE SUBMENU (categoria espandibile)
// ============================================================================
function SubMenu({ item, collapsed, openMenus, onToggle, onNavigate, level = 0, accentColor = 'blue' }) {
  const location = useLocation();
  const isOpen = openMenus.includes(item.id);
  
  // Check if any child is active
  const isChildActive = item.children?.some(child => {
    if (child.path) return location.pathname === child.path;
    if (child.children) return child.children.some(c => location.pathname === c.path);
    return false;
  });
  
  const colorClasses = {
    emerald: {
      active: 'bg-emerald-900/50 text-white',
      hover: 'hover:bg-emerald-900/30 hover:text-white',
      text: 'text-emerald-200',
      border: 'border-emerald-700',
      badge: 'bg-emerald-500 text-emerald-950',
    },
    blue: {
      active: 'bg-blue-900/50 text-white',
      hover: 'hover:bg-blue-900/30 hover:text-white',
      text: 'text-blue-200',
      border: 'border-blue-700',
      badge: 'bg-amber-500 text-amber-950',
    },
  };
  
  const colors = colorClasses[accentColor] || colorClasses.blue;
  
  // Collapsed mode - show only icon with tooltip
  if (collapsed && level === 0) {
    return (
      <div className="relative group">
        <button
          onClick={() => onToggle(item.id)}
          title={item.label}
          className={clsx(
            "flex items-center justify-center p-3 rounded-lg transition-colors w-full",
            isChildActive || isOpen ? colors.active : `${colors.text} ${colors.hover}`
          )}
        >
          <item.icon size={20} />
        </button>
        
        {/* Flyout menu on hover when collapsed */}
        <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl border border-gray-700 py-2 min-w-48">
            <div className="px-3 py-2 text-sm font-semibold text-gray-400 border-b border-gray-700 mb-1">
              {item.label}
            </div>
            {item.children?.map((child) => (
              child.path ? (
                <NavLink
                  key={child.path}
                  to={child.path}
                  onClick={onNavigate}
                  className={({ isActive }) => clsx(
                    "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                    isActive 
                      ? "bg-gray-700 text-white" 
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <child.icon size={16} />
                  <span>{child.label}</span>
                </NavLink>
              ) : (
                <div key={child.id} className="py-1">
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                    {child.label}
                  </div>
                  {child.children?.map((subChild) => (
                    <NavLink
                      key={subChild.path}
                      to={subChild.path}
                      onClick={onNavigate}
                      className={({ isActive }) => clsx(
                        "flex items-center gap-3 px-3 py-1.5 text-sm transition-colors",
                        isActive 
                          ? "bg-gray-700 text-white" 
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      )}
                    >
                      <subChild.icon size={14} />
                      <span>{subChild.label}</span>
                    </NavLink>
                  ))}
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-1">
      <button
        onClick={() => onToggle(item.id)}
        className={clsx(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
          level > 0 ? 'text-sm' : '',
          isChildActive || isOpen ? colors.active : `${colors.text} ${colors.hover}`
        )}
      >
        <div className="flex items-center gap-3">
          <item.icon size={level > 0 ? 18 : 20} />
          <span className="font-medium truncate">{item.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {item.badge && (
            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-semibold", colors.badge)}>
              {item.badge}
            </span>
          )}
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>
      
      {isOpen && (
        <div className={clsx(
          "mt-1 ml-3 pl-3 border-l space-y-0.5",
          colors.border
        )}>
          {item.children?.map((child) => (
            child.path ? (
              <MenuItem
                key={child.path}
                item={child}
                collapsed={false}
                onNavigate={onNavigate}
                level={level + 1}
                accentColor={accentColor}
              />
            ) : (
              <SubMenu
                key={child.id}
                item={child}
                collapsed={false}
                openMenus={openMenus}
                onToggle={onToggle}
                onNavigate={onNavigate}
                level={level + 1}
                accentColor={accentColor}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE CATEGORIA PRINCIPALE
// ============================================================================
function CategorySection({ category, collapsed, openMenus, onToggle, onNavigate }) {
  const location = useLocation();
  const isOpen = openMenus.includes(category.id);
  
  // Check if current path belongs to this category
  const isCategoryActive = category.children?.some(child => {
    if (child.path) {
      // Direct path match
      if (category.id === 'satellitare') {
        return !location.pathname.startsWith('/gestionale');
      }
      return location.pathname === child.path;
    }
    if (child.children) {
      return child.children.some(c => {
        if (c.path) return location.pathname === c.path;
        if (c.children) return c.children.some(cc => location.pathname === cc.path);
        return false;
      });
    }
    return false;
  });
  
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-950',
      border: 'border-emerald-800',
      headerBg: 'bg-emerald-900/50',
      headerActive: 'bg-emerald-800',
      text: 'text-emerald-400',
      textHover: 'hover:text-emerald-300',
    },
    blue: {
      bg: 'bg-blue-950',
      border: 'border-blue-800',
      headerBg: 'bg-blue-900/50',
      headerActive: 'bg-blue-800',
      text: 'text-blue-400',
      textHover: 'hover:text-blue-300',
    },
  };
  
  const colors = colorClasses[category.color] || colorClasses.blue;
  
  if (collapsed) {
    return (
      <div className={clsx("py-2 border-b", colors.border)}>
        <button
          onClick={() => onToggle(category.id)}
          title={category.label}
          className={clsx(
            "flex items-center justify-center p-3 rounded-lg transition-colors w-full mx-auto",
            isCategoryActive || isOpen ? colors.headerActive : `${colors.text} ${colors.textHover}`
          )}
        >
          <category.icon size={22} />
        </button>
        
        {isOpen && (
          <div className="mt-2 space-y-1 px-1">
            {category.children?.map((child) => (
              child.path ? (
                <MenuItem
                  key={child.path}
                  item={child}
                  collapsed={true}
                  onNavigate={onNavigate}
                  level={0}
                  accentColor={category.color}
                />
              ) : (
                <SubMenu
                  key={child.id}
                  item={child}
                  collapsed={true}
                  openMenus={openMenus}
                  onToggle={onToggle}
                  onNavigate={onNavigate}
                  level={0}
                  accentColor={category.color}
                />
              )
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={clsx("border-b", colors.border)}>
      {/* Category Header */}
      <button
        onClick={() => onToggle(category.id)}
        className={clsx(
          "w-full flex items-center justify-between px-4 py-3 transition-colors",
          isCategoryActive || isOpen ? colors.headerActive : `${colors.headerBg} ${colors.textHover}`
        )}
      >
        <div className="flex items-center gap-3">
          <category.icon size={22} className={colors.text} />
          <span className="font-semibold text-white">{category.label}</span>
        </div>
        {isOpen ? (
          <ChevronDown size={18} className={colors.text} />
        ) : (
          <ChevronRight size={18} className={colors.text} />
        )}
      </button>
      
      {/* Category Content */}
      {isOpen && (
        <div className={clsx("px-2 py-2 space-y-0.5", colors.bg)}>
          {category.children?.map((child) => (
            child.path ? (
              <MenuItem
                key={child.path}
                item={child}
                collapsed={false}
                onNavigate={onNavigate}
                level={0}
                accentColor={category.color}
              />
            ) : (
              <SubMenu
                key={child.id}
                item={child}
                collapsed={false}
                openMenus={openMenus}
                onToggle={onToggle}
                onNavigate={onNavigate}
                level={0}
                accentColor={category.color}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LAYOUT PRINCIPALE
// ============================================================================
export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Sidebar collapsed state (persisted)
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COLLAPSED);
    return saved ? JSON.parse(saved) : false;
  });
  
  // Open menus state (persisted) - default vuoto, categorie chiuse
  const [openMenus, setOpenMenus] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.OPEN_MENUS);
    return saved ? JSON.parse(saved) : [];
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLLAPSED, JSON.stringify(collapsed));
  }, [collapsed]);

  // Persist open menus
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OPEN_MENUS, JSON.stringify(openMenus));
  }, [openMenus]);

  // Auto-open correct category based on current path (solo se necessario, senza chiudere altri)
  useEffect(() => {
    const isGestionale = location.pathname.startsWith('/gestionale');
    const categoryId = isGestionale ? 'gestionale' : 'satellitare';
    
    setOpenMenus(prev => {
      let newMenus = [...prev];
      let changed = false;
      
      // Apri la categoria corrente se non è già aperta
      if (!newMenus.includes(categoryId)) {
        newMenus.push(categoryId);
        changed = true;
      }
      
      // Per il gestionale, apri anche la sottocategoria corrente senza chiudere le altre
      if (isGestionale) {
        const gestionale = menuConfig.find(c => c.id === 'gestionale');
        gestionale?.children?.forEach(section => {
          if (section.children) {
            const hasActiveChild = section.children.some(child => 
              location.pathname.startsWith(child.path?.split('/').slice(0, 4).join('/') || '')
            );
            if (hasActiveChild && !newMenus.includes(section.id)) {
              newMenus.push(section.id);
              changed = true;
            }
          }
        });
      }
      
      return changed ? newMenus : prev;
    });
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // IDs delle categorie principali (satellitare, gestionale)
  const mainCategoryIds = menuConfig.map(c => c.id);
  
  // IDs delle sottocategorie del gestionale
  const gestionaleSubcategoryIds = menuConfig
    .find(c => c.id === 'gestionale')
    ?.children?.filter(c => c.children)
    .map(c => c.id) || [];

  const toggleMenu = useCallback((menuId) => {
    setOpenMenus(prev => {
      const isCurrentlyOpen = prev.includes(menuId);
      
      // Se si sta chiudendo, semplicemente rimuovi
      if (isCurrentlyOpen) {
        return prev.filter(id => id !== menuId);
      }
      
      // Se è una categoria principale (satellitare/gestionale), chiudi l'altra categoria principale
      if (mainCategoryIds.includes(menuId)) {
        const otherMainCategories = mainCategoryIds.filter(id => id !== menuId);
        // Chiudi le altre categorie principali e tutte le loro sottocategorie
        const filtered = prev.filter(id => 
          !otherMainCategories.includes(id) && 
          !gestionaleSubcategoryIds.includes(id)
        );
        return [...filtered, menuId];
      }
      
      // Se è una sottocategoria del gestionale, chiudi le altre sottocategorie
      if (gestionaleSubcategoryIds.includes(menuId)) {
        const filtered = prev.filter(id => !gestionaleSubcategoryIds.includes(id));
        return [...filtered, menuId];
      }
      
      // Altrimenti, aggiungi normalmente
      return [...prev, menuId];
    });
  }, [mainCategoryIds, gestionaleSubcategoryIds]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  const handleNavigate = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  return (
    <SidebarContext.Provider value={{ collapsed, toggleCollapsed, openMenus, toggleMenu }}>
      <div className="min-h-screen bg-gray-100 flex">
        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 bg-gray-900 text-white p-3 flex items-center justify-between z-30">
          <button onClick={() => setMobileOpen(true)} className="p-2 hover:bg-gray-800 rounded-lg">
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-semibold">GPS System</h1>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-gray-800 rounded-lg"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Sidebar backdrop (mobile) */}
        {mobileOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={clsx(
          "fixed top-0 left-0 h-full bg-gray-900 text-white z-50 transform transition-all duration-200 flex flex-col",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarWidth
        )}>
          {/* Logo / Header */}
          <div className={clsx(
            "flex items-center border-b border-gray-800 shrink-0",
            collapsed ? "justify-center p-3" : "justify-between p-4"
          )}>
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Satellite className="text-emerald-400" size={24} />
                <span className="text-lg font-bold">GPS System</span>
              </div>
            )}
            {collapsed && <Satellite className="text-emerald-400" size={24} />}
            <button 
              onClick={() => setMobileOpen(false)} 
              className="lg:hidden p-1 hover:bg-gray-800 rounded"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto custom-scrollbar">
            {menuConfig.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                collapsed={collapsed}
                openMenus={openMenus}
                onToggle={toggleMenu}
                onNavigate={handleNavigate}
              />
            ))}
          </nav>

          {/* Footer */}
          <div className={clsx(
            "border-t border-gray-800 shrink-0",
            collapsed ? "p-2" : "p-3"
          )}>
            {/* Collapse toggle */}
            <button
              onClick={toggleCollapsed}
              className={clsx(
                "hidden lg:flex items-center gap-2 w-full p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors mb-2",
                collapsed ? "justify-center" : ""
              )}
              title={collapsed ? "Espandi menu" : "Riduci menu"}
            >
              {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
              {!collapsed && <span className="text-sm">Riduci menu</span>}
            </button>
            
            {/* Impostazioni Utente */}
            <NavLink
              to="/user-settings"
              onClick={handleNavigate}
              className={({ isActive }) => clsx(
                "flex items-center gap-2 w-full p-2 rounded-lg transition-colors mb-2",
                collapsed ? "justify-center" : "",
                isActive 
                  ? "bg-gray-700 text-white" 
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
              title="Impostazioni Utente"
            >
              <Sliders size={18} />
              {!collapsed && <span className="text-sm">Preferenze</span>}
            </NavLink>
            
            {/* User info */}
            <div className={clsx(
              "flex items-center",
              collapsed ? "justify-center" : "justify-between"
            )}>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Utente</p>
                  <p className="font-medium text-sm truncate">{user?.username || 'Admin'}</p>
                </div>
              )}
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors shrink-0"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className={clsx(
          "flex-1 min-h-screen transition-all duration-200",
          "pt-14 lg:pt-0", // Mobile header offset
          collapsed ? "lg:ml-16" : "lg:ml-64"
        )}>
          <Outlet />
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
