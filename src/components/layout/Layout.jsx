
import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Sidebar - Fixed on Desktop, Drawer on Mobile */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 transition-all duration-300 ease-in-out">
        <div className="container mx-auto p-4 lg:p-8 pt-20 lg:pt-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
