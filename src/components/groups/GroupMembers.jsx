
import React, { useState, useEffect } from 'react';
import { groupsService } from '@/services/groups.service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2, UserPlus, Shield } from 'lucide-react';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export default function GroupMembers({ group, onClose, isGroupAdmin = false }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
    const [joinRequests, setJoinRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
  const { toast } = useToast();
    const { user } = useAuth();

  useEffect(() => {
    fetchMembers();
  }, [group.id]);

  const fetchMembers = async () => {
    setLoading(true);
    const result = await groupsService.getGroupMembers(group.id);
        if (result.success) {
                setMembers(result.data);
        }
    setLoading(false);
  };

    const fetchJoinRequests = async () => {
        if (!isGroupAdmin) return;
        setLoadingRequests(true);
        const result = await groupsService.getJoinRequests(group.id);
        if (result.success) {
            setJoinRequests(result.data || []);
        }
        setLoadingRequests(false);
    };

    useEffect(() => {
        if (isGroupAdmin) {
            fetchJoinRequests();
        }
    }, [group.id, isGroupAdmin]);

  const handleAddMember = async (e) => {
    e.preventDefault();
        if (!newEmail) return;

        const normalizedEmail = newEmail.trim().toLowerCase();

    setAdding(true);
        const result = await groupsService.addMember(group.id, normalizedEmail);
    setAdding(false);

    if (result.success) {
        toast({ title: "Éxito", description: result.message });
        setNewEmail('');
        fetchMembers();
    } else {
        toast({ variant: "destructive", description: result.error });
    }
  };

  const handleRemoveMember = async (userId) => {
            if (!isGroupAdmin) {
                toast({ variant: 'destructive', description: 'Solo el administrador puede eliminar miembros.' });
                return;
            }
      const result = await groupsService.removeMember(group.id, userId);
      if (result.success) {
          toast({ description: result.message });
          fetchMembers();
      } else {
          toast({ variant: "destructive", description: result.error });
      }
  };

  const handleRoleChange = async (userId, currentRole) => {
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      const result = await groupsService.updateMemberRole(group.id, userId, newRole);
      if (result.success) {
          toast({ description: result.message });
          fetchMembers();
      } else {
          toast({ variant: "destructive", description: result.error });
      }
  };

  const handleRespondRequest = async (request, accept) => {
      const result = await groupsService.respondToJoinRequest(request.id, request.group_id, request.user_id, accept);
      if (result.success) {
          toast({ description: result.message });
          fetchMembers();
          fetchJoinRequests();
      } else {
          toast({ variant: 'destructive', description: result.error });
      }
  };

  return (
    <div className="space-y-6">
        {isGroupAdmin && (
          <form onSubmit={handleAddMember} className="flex gap-2">
              <input 
                  type="email" 
                  placeholder="Email del usuario a agregar"
                  className="flex-1 w-full p-2 border border-gray-300 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
              />
              <Button type="submit" disabled={adding} size="sm" className="bg-blue-900">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Agregar
              </Button>
          </form>
        )}

        <div className="border rounded-md overflow-hidden">
            {loading ? (
                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-900" /></div>
            ) : members.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Sin miembros aún.</div>
            ) : (
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                        <tr>
                            <th className="px-4 py-2 text-left">Usuario</th>
                            <th className="px-4 py-2 text-center">Rol</th>
                            <th className="px-4 py-2 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {members.map(m => (
                            <tr key={m.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <div className="font-medium">{m.users?.full_name || 'Sin nombre'}</div>
                                    <div className="text-xs text-gray-500">{m.users?.email}</div>
                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                        <span
                                                                            className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-600 border-gray-200"
                                                                            title="Rol del miembro"
                                                                        >
                                                                            Miembro
                                                                        </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                        {isGroupAdmin && (
                                                                            <ConfirmationModal 
                                                                                    title="¿Eliminar miembro?"
                                                                                    description="El usuario perderá acceso al grupo."
                                                                                    onConfirm={() => handleRemoveMember(m.user_id)}
                                                                                    trigger={
                                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                                                                    <Trash2 className="w-4 h-4" />
                                                                                            </Button>
                                                                                    }
                                                                            />
                                                                        )}
                                                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>

                {isGroupAdmin && (
                    <div className="border rounded-md overflow-hidden mt-4">
                        <div className="px-4 py-2 bg-gray-50 text-gray-700 font-semibold text-sm flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Solicitudes pendientes
                        </div>
                        {loadingRequests ? (
                            <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-blue-900" /></div>
                        ) : joinRequests.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500">No hay solicitudes pendientes.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Usuario</th>
                                        <th className="px-4 py-2 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {joinRequests.map((r) => (
                                        <tr key={r.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{r.users?.full_name || 'Sin nombre'}</div>
                                                <div className="text-xs text-gray-500">{r.users?.email}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                                    onClick={() => handleRespondRequest(r, true)}
                                                >
                                                    Aceptar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 border-red-200 text-xs"
                                                    onClick={() => handleRespondRequest(r, false)}
                                                >
                                                    Rechazar
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
    </div>
  );
}
