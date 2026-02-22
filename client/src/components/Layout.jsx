import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { 
  Map, 
  Truck, 
  MapPin, 
  Route, 
  Bell, 
  History, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Home,
  Users
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/vehicles', icon: Truck, label: 'Veicoli' },
  { path: '/geofences', icon: MapPin, label: 'Geofence' },
  { path: '/routes', icon: Route, label: 'Tratte' },
  { path: '/alarms', icon: Bell, label: 'Allarmi' },
  { path: '/events', icon: History, label: 'Eventi' },
  { path: '/drivers', icon: Users, label: 'Autisti' },
  { path: '/settings', icon: Settings, label: 'Impostazioni' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile header */}
      <div className="lg:hidden bg-primary-700 text-white p-4 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-2">
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-semibold">GPS Tracker</h1>
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
        "fixed top-0 left-0 h-full w-64 bg-primary-800 text-white z-50 transform transition-transform duration-200",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 flex items-center justify-between border-b border-primary-700">
          <div className="flex items-center gap-2">
            <Map className="text-primary-300" size={28} />
            <span className="text-xl font-bold">GPS Tracker</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive 
                  ? "bg-primary-600 text-white" 
                  : "text-primary-200 hover:bg-primary-700 hover:text-white"
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-300">Logged in as</p>
              <p className="font-medium">{user?.username || 'Admin'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-primary-300 hover:text-white hover:bg-primary-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="flex justify-around">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => clsx(
                "flex flex-col items-center py-2 px-3 text-xs",
                isActive ? "text-primary-600" : "text-gray-500"
              )}
            >
              <item.icon size={20} />
              <span className="mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
