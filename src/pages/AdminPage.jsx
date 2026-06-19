import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Sparkles, UserCog } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { onboardingService } from '@/services/onboarding.service';
import { useAdminUsers, normalizePermissions } from '@/hooks/useAdminUsers';
import { useAdminAudit } from '@/hooks/useAdminAudit';
import AdminUsersSection from '@/components/admin/AdminUsersSection';
import AdminAuditSection from '@/components/admin/AdminAuditSection';
import AdminStatCard from '@/components/admin/AdminStatCard';

const FEATURE_OPTIONS = [
  { key: 'jobs', label: 'Trabajos y reportes' },
  { key: 'groups', label: 'Grupos y equipos' },
  { key: 'audit', label: 'Ver auditoría' }
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'chofer', label: 'Chofer' },
  { value: 'user', label: 'Usuario' }
];

export default function AdminPage() {
  const { language } = useLanguage();
  const { user, isAdmin, userRole } = useAuth();
  const { resumeTourIfNeeded } = useOnboardingTour();
  const role = ['admin', 'solicitante', 'trabajador', 'chofer'].includes(userRole)
    ? userRole
    : (isAdmin ? 'admin' : 'solicitante');

  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const {
    users,
    usersLoading,
    drafts,
    setDrafts,
    fetchUsers,
    handleRoleChange,
    togglePermission,
    saveUserChanges,
    handleRevokeAdmin,
    handleDeleteUser,
    savingUserId,
    revokingUserId,
    deletingUserId
  } = useAdminUsers({
    currentUserId: user?.id,
    featureOptions: FEATURE_OPTIONS,
    onAuditRefresh: async () => fetchAuditLogs()
  });

  const {
    auditLogs,
    auditLoading,
    clearingAudit,
    fetchAuditLogs,
    handleClearAudit
  } = useAdminAudit();

  useEffect(() => {
    const load = async () => {
      setPageLoading(true);
      await Promise.all([fetchUsers(), fetchAuditLogs()]);
      setPageLoading(false);
    };

    load();
  }, [fetchAuditLogs, fetchUsers]);

  useEffect(() => {
    if (!user) return;
    resumeTourIfNeeded({
      role,
      onComplete: () => onboardingService.setOnboardingCompleted(user.id, role)
    });
  }, [user, role, resumeTourIfNeeded]);

  const filteredUsers = useMemo(() => {
    const searchValue = search.toLowerCase();

    return users.filter((u) => {
      const matchesSearch = [u.email, u.full_name].some((value) => {
        if (!value) return false;
        return value.toLowerCase().includes(searchValue);
      });
      const matchesRole = filterRole === 'all' ? true : (drafts[u.id]?.role || u.role) === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [users, drafts, search, filterRole]);

  const adminCount = users.filter((u) => (drafts[u.id]?.role || u.role) === 'admin').length;

  const handleResetUserDraft = (u) => {
    setDrafts((prev) => ({
      ...prev,
      [u.id]: {
        ...prev[u.id],
        role: u.role,
        permissions: normalizePermissions(u.permissions)
      }
    }));
  };

  if (pageLoading || usersLoading) return <LoadingSpinner />;

  const statsPanel = (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-4 space-y-3 text-gray-900 dark:text-white">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <div>
          <p className="text-xs uppercase text-gray-700 dark:text-slate-200 font-semibold">RESUMEN</p>
          <h4 className="font-bold text-xl text-gray-900 dark:text-slate-50">Estado rápido</h4>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <AdminStatCard label="Usuarios" value={users.length} />
        <AdminStatCard label="Admins" value={adminCount} />
        <AdminStatCard label="Permisos activos" value={Object.values(drafts).filter((d) => d.permissions?.length).length} />
        <AdminStatCard
          label="Última auditoría"
          value={auditLogs[0]?.timestamp ? new Date(auditLogs[0].timestamp).toLocaleDateString() : 'Sin registros'}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 text-gray-900 dark:text-white bg-slate-50 dark:bg-slate-950 p-4 md:p-6 rounded-2xl border border-gray-200 dark:border-slate-900">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm text-gray-900 dark:text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="font-bold text-2xl md:text-3xl text-gray-900 dark:text-slate-50">Panel de Administración</h1>
            <p className="text-base text-gray-600 dark:text-slate-300">Gestiona roles, permisos y seguridad en un solo lugar.</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200">
          <TabsTrigger value="users" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-[#1e3a8a] dark:data-[state=active]:text-blue-100">
            <UserCog className="w-4 h-4 mr-2" /> Usuarios y roles
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-[#1e3a8a] dark:data-[state=active]:text-blue-100">
            <History className="w-4 h-4 mr-2" /> Auditoría
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <AdminUsersSection
            filteredUsers={filteredUsers}
            drafts={drafts}
            featureOptions={FEATURE_OPTIONS}
            roleOptions={ROLE_OPTIONS}
            search={search}
            onSearchChange={setSearch}
            filterRole={filterRole}
            onFilterRoleChange={setFilterRole}
            currentUserId={user?.id}
            savingUserId={savingUserId}
            revokingUserId={revokingUserId}
            deletingUserId={deletingUserId}
            onRoleChange={handleRoleChange}
            onTogglePermission={togglePermission}
            onRevokeAdmin={handleRevokeAdmin}
            onDeleteUser={handleDeleteUser}
            onSaveUserChanges={saveUserChanges}
            onResetUserDraft={handleResetUserDraft}
            normalizePermissions={normalizePermissions}
            statsPanel={statsPanel}
          />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AdminAuditSection
            auditLogs={auditLogs}
            auditLoading={auditLoading}
            clearingAudit={clearingAudit}
            onClearAudit={handleClearAudit}
            language={language}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
