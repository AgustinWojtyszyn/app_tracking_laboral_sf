
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { 
  LayoutDashboard, Calendar, CalendarDays, History, Users, UserCog,
  Settings, ShieldAlert, LogOut, Menu, X 
} from 'lucide-react';
import ThemeToggle from '@/components/layout/ThemeToggle';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, signOut, isAdmin } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Trabajos Diarios', path: '/app/trabajos-diarios', icon: Calendar },
    { label: 'Panel Mensual', path: '/app/panel-mensual', icon: CalendarDays },
    { label: 'Historial', path: '/app/historial', icon: History },
    { label: 'Trabajadores', path: '/app/trabajadores', icon: UserCog },
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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-primary text-primary-foreground flex items-center justify-between px-5 z-50 shadow-md">
        <span className="font-bold text-2xl">WorkManager</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={toggleSidebar} className="inline-flex items-center justify-center rounded-md p-1.5">
            {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-primary text-primary-foreground transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-full lg:h-screen pt-16 lg:pt-0 shadow-xl
      `}>
        <div className="p-7 border-b border-blue-800/60 hidden lg:flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">WorkManager</h1>
            <p className="text-sm text-blue-100/80 mt-1">Gestión de trabajos</p>
          </div>
          <ThemeToggle />
        </div>

        <nav className="flex-1 px-5 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center px-5 py-3.5 text-lg font-semibold rounded-lg transition-all duration-200
                  ${isActive ? "bg-blue-800 text-white shadow-md translate-x-1" : "text-blue-100 hover:bg-blue-800/50 hover:text-white hover:translate-x-1"}
                `}
              >
                <Icon className="w-7 h-7 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-5 border-t border-blue-800 bg-[#152e6e]">
          <div className="mb-4 px-1">
            <p className="text-base font-medium truncate">{profile?.full_name || 'Usuario'}</p>
            <p className="text-sm text-blue-300 truncate">{profile?.email}</p>
          </div>
          
          <button 
             onClick={signOut}
             className="w-full flex items-center px-4 py-3 text-base font-medium text-blue-100 hover:text-white hover:bg-blue-800 rounded-md transition-colors"
          >
              <LogOut className="w-6 h-6 mr-3" />
              Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
