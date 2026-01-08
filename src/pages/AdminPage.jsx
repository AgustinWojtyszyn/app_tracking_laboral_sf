
import React, { useState, useEffect } from 'react';
import { usersService } from '@/services/users.service';
import { useToast } from '@/contexts/ToastContext';
import { formatDate } from '@/utils/formatters';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShieldCheck, UserCog, History, Mail } from 'lucide-react';

export default function AdminPage() {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await usersService.getAllUsers();
      if (data.success) {
          setUsers(data.data);
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
    } finally {
        setLoading(false);
    }
  };

  const handleTransferAdmin = async () => {
    if (!selectedUser) return;
    try {
        setLoading(true);
        const result = await usersService.transferAdminRole(selectedUser);
        if (result.success) {
            addToast("Rol de administrador transferido correctamente.", 'success');
            fetchUsers();
        } else {
            addToast(result.error, 'error');
        }
    } catch (error) {
        addToast(error.message, 'error');
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
        <p className="text-gray-500">Gestión de usuarios y seguridad</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">
            <UserCog className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="transfer">
            <ShieldCheck className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Transferir Rol</span>
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Auditoría</span>
          </TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users" className="mt-4">
            <div className="bg-white rounded-lg shadow overflow-hidden border">
                {/* Desktop */}
                <div className="hidden md:block">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Nombre Completo</th>
                                <th className="px-6 py-3">Rol</th>
                                <th className="px-6 py-3">Fecha Registro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">{u.email}</td>
                                    <td className="px-6 py-4">{u.full_name || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{formatDate(u.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Mobile */}
                <div className="md:hidden divide-y divide-gray-100">
                    {users.map(u => (
                        <div key={u.id} className="p-4 flex flex-col gap-1">
                            <div className="flex justify-between">
                                <span className="font-bold text-gray-900">{u.full_name || 'Sin nombre'}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                }`}>{u.role}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                                <Mail className="w-3 h-3 mr-1" /> {u.email}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                Registrado: {formatDate(u.created_at)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </TabsContent>

        {/* TRANSFER TAB */}
        <TabsContent value="transfer" className="mt-4">
            <div className="bg-white p-6 rounded-lg shadow border max-w-lg mx-auto">
                <h3 className="text-lg font-medium mb-4">Transferir Privilegios de Administrador</h3>
                <p className="text-sm text-gray-500 mb-6 bg-yellow-50 p-3 rounded border border-yellow-200">
                    Advertencia: Esta acción otorgará acceso completo al sistema al usuario seleccionado. 
                    Esta acción quedará registrada en los logs de auditoría.
                </p>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Seleccionar Usuario</label>
                        <select 
                            className="w-full p-2 border rounded"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                        >
                            <option value="">Seleccione un usuario...</option>
                            {users.filter(u => u.role !== 'admin').map(u => (
                                <option key={u.id} value={u.id}>{u.email} ({u.full_name || 'Sin nombre'})</option>
                            ))}
                        </select>
                    </div>

                    <ConfirmationModal 
                        title="¿Confirmar transferencia?"
                        description={`¿Estás seguro de que quieres hacer administrador a este usuario?`}
                        onConfirm={handleTransferAdmin}
                        trigger={
                            <Button disabled={!selectedUser} className="w-full bg-blue-900 text-white">
                                Transferir Rol Admin
                            </Button>
                        }
                    />
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
                            {auditLogs.map(log => (
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
