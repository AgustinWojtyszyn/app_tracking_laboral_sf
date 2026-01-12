
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

// Protected Pages
import DailyJobsPage from '@/pages/DailyJobsPage';
import MonthlyPanelPage from '@/pages/MonthlyPanelPage';
import GroupsPage from '@/pages/GroupsPage';
import SettingsPage from '@/pages/SettingsPage';
import AdminPage from '@/pages/AdminPage';
import WorkersPage from '@/pages/WorkersPage';
import TutorialPage from '@/pages/TutorialPage';

// Components
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a]" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={user ? <Navigate to="/app/trabajos-diarios" replace /> : <LandingPage />} 
        />
        <Route 
          path="/login" 
          element={user ? <Navigate to="/app/trabajos-diarios" replace /> : <LoginPage />} 
        />
        <Route 
          path="/register" 
          element={<RegisterPage />} 
        />
        
        {/* Protected Routes */}
        <Route path="/app" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="trabajos-diarios" replace />} />
          <Route path="trabajos-diarios" element={<DailyJobsPage />} />
          <Route path="panel-mensual" element={<MonthlyPanelPage />} />
          <Route path="trabajadores" element={<WorkersPage />} />
          <Route path="grupos" element={
            <ProtectedRoute adminOnly={true}>
              <GroupsPage />
            </ProtectedRoute>
          } />
          <Route path="tutorial" element={<TutorialPage />} />
          <Route path="configuracion" element={<SettingsPage />} />
          <Route path="admin" element={
            <ProtectedRoute adminOnly={true}>
              <AdminPage />
            </ProtectedRoute>
          } />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
