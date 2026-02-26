
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/layout/LanguageToggle';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { 
  Calendar, CalendarDays, Users, UserCog, BookOpen,
  Settings, ShieldAlert, LogOut, Menu, X 
} from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, user, signOut, isAdmin } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Usuario';
  const displayEmail = profile?.email || user?.email || '';

  const baseNavItems = [
    { label: t('nav.daily'), path: '/app/trabajos-diarios', icon: Calendar },
    { label: t('nav.monthly'), path: '/app/panel-mensual', icon: CalendarDays },
    { label: t('nav.workers'), path: '/app/trabajadores', icon: UserCog },
    { label: t('nav.groups'), path: '/app/grupos', icon: Users, adminOnly: true },
    { label: t('nav.admin'), path: '/app/admin', icon: ShieldAlert, adminOnly: true },
    { label: t('nav.tutorial'), path: '/app/tutorial', icon: BookOpen },
    { label: t('nav.settings'), path: '/app/configuracion', icon: Settings },
  ];

  const navItems = baseNavItems.filter((item) => (item.adminOnly ? isAdmin : true));
  const activeItem = navItems.find((item) => location.pathname === item.path);
  const currentLabel = activeItem?.label ?? t('nav.daily');

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-primary text-primary-foreground flex items-center justify-between px-4 z-50 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={toggleSidebar}
            className="inline-flex items-center justify-center rounded-md p-1.5"
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="text-sm font-semibold truncate max-w-[50vw]">{currentLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle className="h-9 px-3 text-xs bg-background/20 border border-white/20 text-white hover:text-white hover:bg-white/15" />
          <ThemeToggle className="h-9 w-9 border border-white/20 bg-background/20 text-white hover:text-white hover:bg-white/15" />
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
        flex flex-col h-full lg:h-screen pt-12 lg:pt-0 shadow-xl
      `}>
        <nav className="flex-1 px-6 py-6 space-y-3 text-nav-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center px-4 py-3 sm:px-6 sm:py-4 font-semibold rounded-xl transition-all duration-200 text-base sm:text-lg
                  ${isActive ? "bg-blue-800 text-white shadow-md translate-x-1" : "text-blue-100 hover:bg-blue-800/50 hover:text-white hover:translate-x-1"}
                `}
              >
                <Icon className="w-6 h-6 sm:w-8 sm:h-8 mr-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 sm:p-5 border-t border-blue-800 bg-[#152e6e]">
          <div className="mb-4 px-1">
            <p className="text-base sm:text-xl font-semibold leading-snug break-words">{displayName}</p>
            <p className="text-sm sm:text-lg text-blue-200 leading-snug break-words">{displayEmail}</p>
          </div>
          
          <button 
             onClick={signOut}
             className="w-full flex items-center px-4 py-3 text-sm sm:text-base font-medium text-blue-100 hover:text-white hover:bg-blue-800 rounded-md transition-colors"
          >
              <LogOut className="w-6 h-6 mr-3" />
              {t('nav.logout')}
          </button>
        </div>
      </aside>
    </>
  );
}
