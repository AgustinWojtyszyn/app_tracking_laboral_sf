
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-500">Gestiona roles, permisos y seguridad en un solo lugar.</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">
            <UserCog className="w-4 h-4 mr-2" /> Usuarios y roles
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="w-4 h-4 mr-2" /> Auditoría
          </TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users" className="mt-4">
          <div className="grid lg:grid-cols-[2fr,1fr] gap-4 lg:gap-6">
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              <div className="p-4 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase text-gray-500 font-semibold">Usuarios</p>
                  <h3 className="text-lg font-semibold text-gray-900">Roles y funciones</h3>
                  <p className="text-sm text-gray-500">Elige el rol y habilita solo las funciones necesarias.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                  <div className="relative w-full md:w-60">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Buscar por email o nombre"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    <option value="admin">Admins</option>
                    <option value="user">Usuarios</option>
                  </select>
                </div>
              </div>

              <div className="divide-y">
                {filteredUsers.map((u) => {
                  const draft = drafts[u.id] || { role: u.role, permissions: normalizePermissions(u.permissions) };
                  const isAdmin = draft.role === 'admin';

                  return (
                    <div key={u.id} className="p-4 space-y-3 hover:bg-gray-50 transition">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{u.full_name || 'Sin nombre'}</p>
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="w-3 h-3 mr-1" /> {u.email}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Registrado: {formatDate(u.created_at)}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs uppercase text-gray-500 font-semibold mb-1 block">Rol</label>
                          <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={draft.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs uppercase text-gray-500 font-semibold mb-2 block">
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
                                  className={`px-3 py-1 rounded-full text-xs border transition ${
                                    active
                                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                  }`}
                                  disabled={isAdmin}
                                >
                                  {feature.label}
                                </button>
                              );
                            })}
                          </div>
                          {isAdmin && (
                            <p className="text-[11px] text-blue-700 mt-1">Los administradores tienen todas las funciones.</p>
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
                          className="bg-blue-900 text-white"
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
                  <div className="p-6 text-center text-gray-500">
                    No encontramos usuarios con esos filtros.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-lg border shadow p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-900" />
                  <div>
                    <p className="text-xs uppercase text-gray-500 font-semibold">Seguridad</p>
                    <h4 className="font-semibold text-gray-900">Transferir rol de administrador</h4>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Mueve el rol de admin a otra persona. La acción queda registrada en la auditoría.
                </p>
                <div className="space-y-3">
                  <select
                    className="w-full border rounded-lg px-3 py-2"
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
                      <Button disabled={!selectedUser} className="w-full bg-blue-900 text-white">
                        Transferir rol admin
                      </Button>
                    }
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg border shadow p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-xs uppercase text-gray-500 font-semibold">Resumen</p>
                    <h4 className="font-semibold text-gray-900">Estado rápido</h4>
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
          <div className="bg-white rounded-lg shadow overflow-hidden border">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Fecha</th>
                    <th className="px-6 py-3">Usuario</th>
                    <th className="px-6 py-3">Acción</th>
                    <th className="px-6 py-3 hidden md:table-cell">Entidad</th>
                    <th className="px-6 py-3 hidden md:table-cell">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4">{log.users?.email || 'Sistema'}</td>
                      <td className="px-6 py-4 font-medium uppercase text-xs">{log.action}</td>
                      <td className="px-6 py-4 text-xs hidden md:table-cell">{log.entity_type}</td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500 truncate max-w-xs hidden md:table-cell">
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
    <div className="p-3 rounded-lg border bg-gray-50">
      <p className="text-xs uppercase text-gray-500 font-semibold">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
