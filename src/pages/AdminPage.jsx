
import React, { useEffect, useMemo, useState } from 'react';
import { usersService } from '@/services/users.service';
import { useToast } from '@/contexts/ToastContext';
import { formatDate } from '@/utils/formatters';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldCheck, UserCog, History, Mail, Search, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const FEATURE_OPTIONS = [
  { key: 'jobs', label: 'Trabajos y reportes' },
  { key: 'groups', label: 'Grupos y equipos' },
  { key: 'billing', label: 'Costos y facturación' },
  { key: 'audit', label: 'Ver auditoría' }
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'user', label: 'Usuario' }
];

const ACTION_META = {
  group_created: {
    label: { es: 'Grupo creado', en: 'Group created' },
    tone: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100'
  },
  group_member_added: {
    label: { es: 'Miembro agregado', en: 'Member added' },
    tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100'
  },
  group_member_joined: {
    label: { es: 'Usuario se unió', en: 'User joined' },
    tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100'
  },
  transfer_admin: {
    label: { es: 'Transferencia de admin', en: 'Admin transfer' },
    tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-100'
  },
  user_role_updated: {
    label: { es: 'Rol actualizado', en: 'Role updated' },
    tone: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100'
  },
  user_permissions_updated: {
    label: { es: 'Permisos actualizados', en: 'Permissions updated' },
    tone: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-100'
  }
};

const ENTITY_LABELS = {
  group: 'Grupo',
  group_member: 'Miembro de grupo',
  users: 'Usuario',
  user: 'Usuario',
  job: 'Trabajo',
  billing: 'Facturación'
};

const ROLE_LABELS = {
  admin: { es: 'Administrador', en: 'Admin' },
  user: { es: 'Usuario', en: 'User' }
};

const PERMISSION_LABELS = {
  jobs: { es: 'Trabajos y reportes', en: 'Jobs & reports' },
  groups: { es: 'Grupos y equipos', en: 'Groups & teams' },
  billing: { es: 'Costos y facturación', en: 'Billing' },
  audit: { es: 'Auditoría', en: 'Audit' }
};

const FIELD_LABELS = {
  role: { es: 'Rol', en: 'Role' },
  permissions: { es: 'Permisos', en: 'Permissions' },
  group_name: { es: 'Grupo', en: 'Group' },
  member_name: { es: 'Miembro', en: 'Member' },
  added_user_name: { es: 'Miembro agregado', en: 'Added member' },
  new_admin_name: { es: 'Nuevo admin', en: 'New admin' },
  member_email: { es: 'Email', en: 'Email' },
  user_email: { es: 'Email', en: 'Email' },
  new_admin_email: { es: 'Email', en: 'Email' }
};

const normalizePermissions = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((p) => p.trim()).filter(Boolean);
  }
  return [];
};

const parseAuditValue = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const formatEntity = (entity) => {
  if (!entity) return 'Otro';
  return ENTITY_LABELS[entity] || entity;
};

const normalizeActionKey = (action = '') => action.toLowerCase().replace(/\s+/g, '_');

const formatAuditDetail = (log, language = 'es') => {
  const rawNew = log.new_value_resolved || log.new_value;
  const rawOld = log.old_value_resolved || log.old_value;
  const newValue = parseAuditValue(rawNew);
  const oldValue = parseAuditValue(rawOld);
  const lang = language === 'en' ? 'en' : 'es';
  const targetName = newValue?.user_name || newValue?.user_email || newValue?.user_id || 'Usuario';

  if (log.action && normalizeActionKey(log.action) === 'transfer_admin') {
    const name = newValue?.new_admin_name || newValue?.new_admin_email || 'Nuevo administrador';
    return lang === 'en'
      ? `Admin role transferred to ${name}.`
      : `Rol de admin transferido a ${name}.`;
  }

  if (log.action && normalizeActionKey(log.action) === 'group_created') {
    const groupName = newValue?.group_name || newValue?.name || 'Nuevo grupo';
    return lang === 'en'
      ? `Group "${groupName}" was created.`
      : `Se creó el grupo "${groupName}".`;
  }

  if (log.action && normalizeActionKey(log.action) === 'group_member_added') {
    const memberName = newValue?.added_user_name || newValue?.added_user_email || 'Un usuario';
    const groupName = newValue?.group_name || `#${newValue?.group_id || ''}`;
    return lang === 'en'
      ? `${memberName} was added to ${groupName}.`
      : `${memberName} agregado al grupo ${groupName}.`;
  }

  if (log.action && normalizeActionKey(log.action) === 'group_member_joined') {
    const memberName = newValue?.member_name || newValue?.member_email || 'Un usuario';
    const groupName = newValue?.group_name || `#${newValue?.group_id || ''}`;
    return lang === 'en'
      ? `${memberName} joined ${groupName}.`
      : `${memberName} se unió al grupo ${groupName}.`;
  }

  if (log.action && normalizeActionKey(log.action) === 'user_role_updated') {
    const prevRaw = oldValue?.role || '';
    const nextRaw = newValue?.role || prevRaw || '';
    const prevRole = ROLE_LABELS[prevRaw]?.[lang] || prevRaw || (lang === 'en' ? 'User' : 'Usuario');
    const nextRole = ROLE_LABELS[nextRaw]?.[lang] || nextRaw || (lang === 'en' ? 'User' : 'Usuario');

    if (prevRaw && prevRaw !== nextRaw) {
      return lang === 'en'
        ? `Role changed from ${prevRole} to ${nextRole} for ${targetName}.`
        : `Rol cambiado de ${prevRole} a ${nextRole} para ${targetName}.`;
    }

    return lang === 'en'
      ? `Role updated to ${nextRole} for ${targetName}.`
      : `Rol actualizado a ${nextRole} para ${targetName}.`;
  }

  if (log.action && normalizeActionKey(log.action) === 'user_permissions_updated') {
    const perms = Array.isArray(newValue?.permissions)
      ? newValue.permissions.map((p) => PERMISSION_LABELS[p]?.[lang] || p).join(', ')
      : '';
    const previousPerms = Array.isArray(oldValue?.permissions)
      ? oldValue.permissions.map((p) => PERMISSION_LABELS[p]?.[lang] || p).join(', ')
      : '';

    if (perms && previousPerms) {
      return lang === 'en'
        ? `Permissions updated for ${targetName}: ${previousPerms} → ${perms}.`
        : `Permisos actualizados para ${targetName}: ${previousPerms} → ${perms}.`;
    }

    return lang === 'en'
      ? `Permissions updated for ${targetName}${perms ? `: ${perms}` : ''}.`
      : `Permisos actualizados para ${targetName}${perms ? `: ${perms}` : ''}.`;
  }

  if (newValue && oldValue && typeof newValue === 'object' && typeof oldValue === 'object') {
    const diffs = Object.keys(newValue).slice(0, 3).map((key) => {
      if (key === 'user_id' || key.endsWith('_id')) return null;
      const before = oldValue[key];
      const after = newValue[key];
      if (before === after) return null;
      if (key === 'permissions' && Array.isArray(after)) {
        const mapped = after.map((p) => PERMISSION_LABELS[p]?.[lang] || p);
        return lang === 'en'
          ? `Permissions: ${mapped.join(', ')}`
          : `Permisos: ${mapped.join(', ')}`;
      }
      const label = FIELD_LABELS[key]?.[lang] || key;
      return `${label}: ${before ?? '—'} → ${after ?? '—'}`;
    }).filter(Boolean);
    if (diffs.length) return diffs.join(' • ');
  }

  if (newValue && typeof newValue === 'object') {
    const pairs = Object.entries(newValue)
      .filter(([key]) => !key.endsWith('_id'))
      .slice(0, 4)
      .map(([key, val]) => {
        const label = FIELD_LABELS[key]?.[lang] || key;
        if (Array.isArray(val)) {
          const mapped = val.map((p) => PERMISSION_LABELS[p]?.[lang] || p);
          return `${label}: ${mapped.join(', ')}`;
        }
        if (typeof val === 'object') {
          return `${label}: ${JSON.stringify(val)}`;
        }
        return `${label}: ${String(val)}`;
      });
    if (pairs.length) return pairs.join(' • ');
  }

  if (typeof newValue === 'string') return newValue;
  return lang === 'en' ? 'Action recorded' : 'Acción registrada';
};

const getActionMeta = (action, language = 'es') => {
  const key = normalizeActionKey(action);
  const meta = ACTION_META[key];

  if (meta) {
    return {
      label: meta.label?.[language] || meta.label?.es || action?.replace(/_/g, ' ') || 'Acción',
      tone: meta.tone
    };
  }

  return {
    label: action?.replace(/_/g, ' ') || 'Acción',
    tone: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-100'
  };
};

export default function AdminPage() {
  const { addToast } = useToast();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [clearingAudit, setClearingAudit] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchAuditLogs()]);
      setLoading(false);
    };

    load();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersService.getAllUsers();

      if (response.success) {
        setUsers(response.data || []);
        const draftMap = {};

        response.data?.forEach((u) => {
          draftMap[u.id] = {
            role: u.role || 'user',
            permissions: normalizePermissions(u.permissions)
          };
        });

        setDrafts(draftMap);

        const firstNonAdmin = response.data?.find((u) => u.role !== 'admin');
        setSelectedUser((prev) => prev || firstNonAdmin?.id || '');
      }
    } catch (error) {
      addToast("Error cargando usuarios", 'error');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await usersService.getAuditLogs();
      if (!error) setAuditLogs(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleTransferAdmin = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      const result = await usersService.transferAdminRole(selectedUser);
      if (result.success) {
        addToast("Rol de administrador transferido correctamente.", 'success');
        await fetchUsers();
        await fetchAuditLogs();
      } else {
        addToast(result.error, 'error');
      }
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAudit = async () => {
    setClearingAudit(true);
    const previousLogs = auditLogs;
    setAuditLogs([]); // feedback visual inmediato

    const result = await usersService.clearAuditLogs();
    setClearingAudit(false);

    if (result.success) {
      await fetchAuditLogs();
      addToast(result.message, 'success');
    } else {
      setAuditLogs(previousLogs); // revertir si falla
      addToast(result.error || 'No se pudo limpiar la auditoría', 'error');
    }
  };

  const handleRoleChange = (userId, role) => {
    const allFeatures = FEATURE_OPTIONS.map((f) => f.key);

    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        role,
        permissions: role === 'admin' ? allFeatures : prev[userId]?.permissions || []
      }
    }));
  };

  const togglePermission = (userId, permission) => {
    setDrafts((prev) => {
      const current = prev[userId] || { role: 'user', permissions: [] };
      const permissions = current.permissions.includes(permission)
        ? current.permissions.filter((p) => p !== permission)
        : [...current.permissions, permission];

      return {
        ...prev,
        [userId]: {
          ...current,
          permissions
        }
      };
    });
  };

  const saveUserChanges = async (userId) => {
    const draft = drafts[userId];
    if (!draft) return;
    if (userId === user?.id) return;

    setSavingUserId(userId);

    try {
      const roleResult = await usersService.updateUserRole(userId, draft.role);
      if (!roleResult.success) throw new Error(roleResult.error);

      const permissionsResult = await usersService.updateUserPermissions(userId, draft.permissions);
      if (!permissionsResult.success) throw new Error(permissionsResult.error);

      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: draft.role, permissions: draft.permissions } : u));
      addToast("Cambios guardados", 'success');
      await fetchAuditLogs();
    } catch (error) {
      addToast(error.message || 'No se pudieron guardar los cambios', 'error');
    } finally {
      setSavingUserId(null);
    }
  };

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

  if (loading) return <LoadingSpinner />;

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

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200">
          <TabsTrigger value="users" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-[#1e3a8a] dark:data-[state=active]:text-blue-100">
            <UserCog className="w-4 h-4 mr-2" /> Usuarios y roles
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-[#1e3a8a] dark:data-[state=active]:text-blue-100">
            <History className="w-4 h-4 mr-2" /> Auditoría
          </TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users" className="mt-4">
          <div className="grid lg:grid-cols-[2fr,1fr] gap-4 lg:gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden text-gray-900 dark:text-white">
              <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase text-gray-700 dark:text-slate-200 font-semibold">USUARIOS</p>
                  <h3 className="font-bold text-xl text-gray-900 dark:text-slate-50">Roles y funciones</h3>
                  <p className="text-base text-gray-500 dark:text-slate-300">Elige el rol y habilita solo las funciones necesarias.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                  <div className="relative w-full md:w-60">
                    <Search className="w-4 h-4 text-gray-400 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-700 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                      placeholder="Buscar por email o nombre"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-700 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    <option value="admin">Admins</option>
                    <option value="user">Usuarios</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredUsers.map((u) => {
                  const draft = drafts[u.id] || { role: u.role, permissions: normalizePermissions(u.permissions) };
                  const isAdmin = draft.role === 'admin';
                  const isCurrentUser = u.id === user?.id;

                  return (
                    <div key={u.id} className="p-4 space-y-3 bg-white dark:bg-slate-900 transition border-b border-gray-100 dark:border-slate-800 last:border-b-0 text-gray-900 dark:text-white">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="font-bold text-xl text-gray-900 dark:text-slate-50">{u.full_name || 'Sin nombre'}</p>
                          <div className="flex items-center text-base text-gray-600 dark:text-slate-300">
                            <Mail className="w-3 h-3 mr-1" /> {u.email}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-300">
                          Registrado: {formatDate(u.created_at)}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs uppercase text-gray-700 dark:text-slate-200 font-semibold mb-1 block">ROL</label>
                          {isCurrentUser ? (
                            <div className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-semibold">
                              {ROLE_OPTIONS.find((r) => r.value === draft.role)?.label || draft.role}
                            </div>
                          ) : (
                            <select
                              className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                              value={draft.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            >
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div>
                          <label className="text-xs uppercase text-gray-700 dark:text-slate-200 font-semibold mb-2 block">
                            Funciones activas
                          </label>
                          {isCurrentUser ? (
                            <div className="flex flex-wrap gap-2">
                              {FEATURE_OPTIONS.map((feature) => {
                                const active = draft.role === 'admin' || draft.permissions?.includes(feature.key);
                                return (
                                  <span
                                    key={feature.key}
                                    className={`px-3 py-1 rounded-full text-xs border ${
                                      active
                                        ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-white dark:border-blue-800'
                                        : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-white dark:border-slate-700'
                                    }`}
                                  >
                                    {feature.label}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {FEATURE_OPTIONS.map((feature) => {
                                const active = draft.permissions?.includes(feature.key);
                                return (
                                  <button
                                    key={feature.key}
                                    type="button"
                                    onClick={() => togglePermission(u.id, feature.key)}
                                    className={`px-3 py-1 rounded-full text-xs border transition focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 ${
                                      active
                                        ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-white dark:border-blue-800'
                                        : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-white dark:border-slate-700'
                                    }`}
                                    disabled={isAdmin}
                                  >
                                    {feature.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {isAdmin && !isCurrentUser && (
                            <p className="text-[11px] text-blue-800 dark:text-blue-200 mt-1">Los administradores tienen todas las funciones.</p>
                          )}
                        </div>
                      </div>

                      {!isCurrentUser && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                          <Button
                            variant="outline"
                            disabled={savingUserId === u.id}
                            onClick={() => {
                              setDrafts((prev) => ({
                                ...prev,
                                [u.id]: {
                                  ...prev[u.id],
                                  role: u.role,
                                  permissions: normalizePermissions(u.permissions)
                                }
                              }));
                            }}
                          >
                            Deshacer
                          </Button>
                          <Button
                            className="bg-blue-900 text-white hover:bg-blue-900 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-700 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                            onClick={() => saveUserChanges(u.id)}
                            disabled={savingUserId === u.id}
                          >
                            {savingUserId === u.id ? 'Guardando...' : 'Guardar cambios'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <div className="p-6 text-center text-base text-gray-600 dark:text-slate-200">
                    No encontramos usuarios con esos filtros.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-4 space-y-3 text-gray-900 dark:text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-xs uppercase text-gray-700 dark:text-slate-200 font-semibold">RESUMEN</p>
                    <h4 className="font-bold text-xl text-gray-900 dark:text-slate-50">Estado rápido</h4>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Usuarios" value={users.length} />
                  <Stat label="Admins" value={adminCount} />
                  <Stat label="Permisos activos" value={Object.values(drafts).filter((d) => d.permissions?.length).length} />
                  <Stat
                    label="Última auditoría"
                    value={auditLogs[0]?.timestamp ? new Date(auditLogs[0].timestamp).toLocaleDateString() : 'Sin registros'}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* AUDIT TAB */}
        <TabsContent value="audit" className="mt-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs uppercase text-gray-700 dark:text-slate-200 font-semibold">Auditoría</p>
                <h3 className="font-bold text-xl text-gray-900 dark:text-slate-50">Actividad reciente</h3>
                <p className="text-sm text-gray-500 dark:text-slate-300">Mostrando las últimas 50 acciones con nombres de usuario.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-200 dark:border-slate-700">
                  {auditLogs.length} registros
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAudit}
                  disabled={clearingAudit}
                  className="text-sm"
                >
                  {clearingAudit ? 'Limpiando...' : 'Limpiar historial'}
                </Button>
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Fecha</th>
                    <th className="px-6 py-3">Usuario</th>
                    <th className="px-6 py-3">Acción</th>
                    <th className="px-6 py-3">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-6 text-center text-gray-600 dark:text-slate-200">
                        Aún no hay registros de auditoría.
                      </td>
                    </tr>
                  )}
                  {auditLogs.map((log) => {
                    const actionMeta = getActionMeta(log.action, language);
                    const actorName = log.user_full_name || log.user_email || 'Sistema';
                    const actorEmail = log.user_email && log.user_full_name ? log.user_email : null;
                    const detail = formatAuditDetail(log, language);

                    return (
                      <tr key={log.id} className="bg-white dark:bg-slate-900">
                        <td className="px-6 py-4 align-top">
                          <div className="font-medium text-gray-900 dark:text-slate-50">{new Date(log.timestamp).toLocaleString()}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-300">{formatEntity(log.entity_type)}</div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="font-medium text-gray-900 dark:text-slate-50">{actorName}</div>
                          {actorEmail && <div className="text-xs text-gray-500 dark:text-slate-300">{actorEmail}</div>}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${actionMeta.tone}`}>
                            {actionMeta.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top text-gray-800 dark:text-slate-50">
                          <div className="text-sm">{detail}</div>
                          {log.entity_type && (
                            <div className="text-xs text-gray-500 dark:text-slate-300 mt-1">
                              {formatEntity(log.entity_type)}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white">
      <p className="text-xs uppercase text-gray-600 dark:text-slate-100 font-semibold">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
