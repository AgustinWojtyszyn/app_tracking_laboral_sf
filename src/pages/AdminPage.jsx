
import React, { useEffect, useMemo, useState } from 'react';
import { usersService } from '@/services/users.service';
import { useToast } from '@/contexts/ToastContext';
import { formatDate } from '@/utils/formatters';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldCheck, UserCog, History, Mail, Search, Sparkles } from 'lucide-react';

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

const normalizePermissions = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((p) => p.trim()).filter(Boolean);
  }
  return [];
};

export default function AdminPage() {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

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
      } else {
        addToast(result.error, 'error');
      }
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
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

    setSavingUserId(userId);

    try {
      const roleResult = await usersService.updateUserRole(userId, draft.role);
      if (!roleResult.success) throw new Error(roleResult.error);

      const permissionsResult = await usersService.updateUserPermissions(userId, draft.permissions);
      if (!permissionsResult.success) throw new Error(permissionsResult.error);

      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: draft.role, permissions: draft.permissions } : u));
      addToast("Cambios guardados", 'success');
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
          <span className="text-2xl md:text-3xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-rose-500 to-lime-400 drop-shadow-[0_6px_14px_rgba(234,88,12,0.25)] italic">
            Servifood Catering
          </span>
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
                          <select
                            className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                            value={draft.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs uppercase text-gray-700 dark:text-slate-200 font-semibold mb-2 block">
                            Funciones activas
                          </label>
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
                          {isAdmin && (
                            <p className="text-[11px] text-blue-800 dark:text-blue-200 mt-1">Los administradores tienen todas las funciones.</p>
                          )}
                        </div>
                      </div>

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
                  <ShieldCheck className="w-5 h-5 text-blue-900 dark:text-blue-200" />
                  <div>
                    <p className="text-xs uppercase text-gray-700 dark:text-slate-200 font-semibold">SEGURIDAD</p>
                    <h4 className="font-bold text-xl text-gray-900 dark:text-slate-50">Transferir rol de administrador</h4>
                  </div>
                </div>
                <p className="text-base text-gray-500 dark:text-slate-300">
                  Mueve el rol de admin a otra persona. La acción queda registrada en la auditoría.
                </p>
                <div className="space-y-3">
                  <select
                    className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    <option value="">Selecciona un usuario</option>
                    {users.filter((u) => u.role !== 'admin').map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email} ({u.full_name || 'Sin nombre'})
                      </option>
                    ))}
                  </select>

                  <ConfirmationModal
                    title="¿Confirmar transferencia?"
                    description="Este usuario obtendrá control completo del panel."
                    onConfirm={handleTransferAdmin}
                    trigger={
                      <Button
                        disabled={!selectedUser}
                        className="w-full bg-blue-900 text-white hover:bg-blue-900 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-700 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                      >
                        Transferir rol admin
                      </Button>
                    }
                  />
                </div>
              </div>

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
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Fecha</th>
                    <th className="px-6 py-3">Usuario</th>
                    <th className="px-6 py-3">Acción</th>
                    <th className="px-6 py-3 hidden md:table-cell">Entidad</th>
                    <th className="px-6 py-3 hidden md:table-cell">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="bg-white dark:bg-slate-900">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-slate-50">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-800 dark:text-slate-50">{log.user_email || 'Sistema'}</td>
                      <td className="px-6 py-4 font-semibold uppercase text-xs text-gray-700 dark:text-slate-100">{log.action}</td>
                      <td className="px-6 py-4 text-xs hidden md:table-cell text-gray-700 dark:text-slate-100">{log.entity_type}</td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-600 dark:text-slate-200 truncate max-w-xs hidden md:table-cell">
                        {JSON.stringify(log.new_value || log.old_value)}
                      </td>
                    </tr>
                  ))}
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
