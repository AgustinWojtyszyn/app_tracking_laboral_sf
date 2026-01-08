
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { 
  LayoutDashboard, Calendar, CalendarDays, History, Users, 
  Settings, ShieldAlert, LogOut, Menu, X 
} from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, signOut, isAdmin } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Trabajos Diarios', path: '/app/trabajos-diarios', icon: Calendar },
    { label: 'Panel Mensual', path: '/app/panel-mensual', icon: CalendarDays },
    { label: 'Historial', path: '/app/historial', icon: History },
    { label: 'Grupos', path: '/app/grupos', icon: Users },
    { label: 'Configuración', path: '/app/configuracion', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Admin', path: '/app/admin', icon: ShieldAlert });
  }

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#1e3a8a] text-white flex items-center justify-between px-4 z-50 shadow-md">
        <span className="font-bold text-lg">WorkManager</span>
        <button onClick={toggleSidebar}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1e3a8a] text-white transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-full lg:h-screen pt-16 lg:pt-0 shadow-xl
      `}>
        <div className="p-6 border-b border-blue-800 hidden lg:block">
          <h1 className="text-2xl font-bold">WorkManager</h1>
          <p className="text-xs text-blue-300 mt-1">Gestión de trabajos</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                  ${isActive ? "bg-blue-800 text-white shadow-md translate-x-1" : "text-blue-100 hover:bg-blue-800/50 hover:text-white hover:translate-x-1"}
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-800 bg-[#152e6e]">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium truncate">{profile?.full_name || 'Usuario'}</p>
            <p className="text-xs text-blue-300 truncate">{profile?.email}</p>
          </div>
          
          <button 
             onClick={signOut}
             className="w-full flex items-center px-4 py-2 text-sm font-medium text-blue-100 hover:text-white hover:bg-blue-800 rounded-md transition-colors"
          >
              <LogOut className="w-5 h-5 mr-3" />
              Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
