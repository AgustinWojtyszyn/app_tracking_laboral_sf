
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import ThemeToggle from '@/components/layout/ThemeToggle';
import LanguageToggle from '@/components/layout/LanguageToggle';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <div className="fixed top-4 right-6 z-50 flex items-center gap-2">
        <LanguageToggle className="shadow-md bg-background/80 backdrop-blur-md border border-border/70" />
        <ThemeToggle className="shadow-md bg-background/80 backdrop-blur-md border border-border/70" />
      </div>
      <main className="flex-1 overflow-y-auto w-full p-4 lg:p-8 pt-20 lg:pt-8">
        <div className="max-w-7xl mx-auto space-y-6 text-[15px] sm:text-base lg:text-lg">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
