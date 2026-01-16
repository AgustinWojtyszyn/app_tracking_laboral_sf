
import React, { useState, useEffect } from 'react';
import { groupsService } from '@/services/groups.service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2, UserPlus, Shield } from 'lucide-react';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export default function GroupMembers({ group, onClose, isGroupAdmin = false, isCreator = false, onMembersUpdated = () => {} }) {
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
                const rows = (result.data || []).map(m => ({
                  ...m,
                  role: m.user_id === group.created_by ? 'admin' : 'member'
                }));
                // Si por alguna razón el creador no está en la tabla, agregarlo como mínimo
                const hasCreator = rows.some(r => r.user_id === group.created_by);
                const enriched = hasCreator ? rows : [
                  ...rows,
                  {
                    id: `creator-${group.created_by}`,
                    group_id: group.id,
                    user_id: group.created_by,
                    role: 'admin',
                    users: {
                      full_name: 'Creador',
                      email: ''
                    }
                  }
                ];
                setMembers(enriched);
                onMembersUpdated(enriched.length);
        }
    setLoading(false);
  };

    const fetchJoinRequests = async () => {
        if (!isCreator) return;
        setLoadingRequests(true);
        const result = await groupsService.getJoinRequests(group.id);
        if (result.success) {
            setJoinRequests(result.data || []);
        }
        setLoadingRequests(false);
    };

    useEffect(() => {
        if (isCreator) {
            fetchJoinRequests();
        }
    }, [group.id, isCreator]);

  const handleAddMember = async (e) => {
    e.preventDefault();
        if (!newEmail) return;

        const normalizedEmail = newEmail.trim().toLowerCase();

    setAdding(true);
        const result = await groupsService.addMember(
          group.id,
          normalizedEmail,
          user?.id,
          { groupName: group.name }
        );
    setAdding(false);

    if (result.success) {
      toast({ title: "Éxito", description: result.message });
      setNewEmail('');
      await fetchMembers();
    } else {
      toast({ variant: "destructive", description: result.error });
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!isGroupAdmin) {
      toast({ variant: 'destructive', description: 'Solo el administrador puede eliminar miembros.' });
      return;
    }

    // Bloquear que el creador (o el propio usuario) se elimine a sí mismo
    if (group.created_by === userId) {
      toast({ variant: 'destructive', description: 'El creador no puede eliminarse del grupo.' });
      return;
    }
    if (user?.id === userId) {
      toast({ variant: 'destructive', description: 'No puedes auto-eliminarte de este grupo.' });
      return;
    }

    const result = await groupsService.removeMember(group.id, userId);
    if (result.success) {
      toast({ description: result.message });
      await fetchMembers();
    } else {
      toast({ variant: "destructive", description: result.error });
    }
  };

  const handleRespondRequest = async (request, accept) => {
      const result = await groupsService.respondToJoinRequest(
        request.id,
        request.group_id,
        request.user_id,
        accept,
        {
          actorId: user?.id,
          groupName: group.name,
          memberEmail: request.users?.email,
          memberName: request.users?.full_name
        }
      );
      if (result.success) {
        toast({ description: result.message });
        await fetchMembers();
        await fetchJoinRequests();
      } else {
        toast({ variant: 'destructive', description: result.error });
      }
  };

  const handleDeleteRequest = async (requestId) => {
      if (!isGroupAdmin) {
        toast({ variant: 'destructive', description: 'Solo el administrador puede eliminar solicitudes.' });
        return;
      }
      const result = await groupsService.deleteJoinRequest(requestId);
      if (result.success) {
        toast({ description: result.message });
        await fetchJoinRequests();
      } else {
        toast({ variant: 'destructive', description: result.error });
      }
  };

  // Usar siempre la lista actual para reflejar altas/bajas inmediatamente
  const totalMembers = members.length;
  const pendingTotal = joinRequests.length || group.pendingRequests || 0;

  return (
    <div className="space-y-6 text-gray-900 dark:text-slate-50">
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-600 dark:text-slate-300 mb-1">Descripción</p>
              <p className="text-sm text-gray-900 dark:text-slate-50">
                {group.description || 'Sin descripción disponible.'}
              </p>
            </div>
            <div className="flex gap-4 text-xs text-gray-700 dark:text-slate-200">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-gray-800 dark:text-slate-200" />
                <span>{totalMembers} miembros</span>
              </div>
              {isCreator && (
                <div className="flex items-center gap-1.5">
                  {loadingRequests ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-800 dark:text-slate-200" />
                  ) : (
                    <Shield className="w-4 h-4 text-gray-800 dark:text-slate-200" />
                  )}
                  <span>{loadingRequests ? 'Cargando solicitudes...' : `${pendingTotal} solicitudes`}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {isGroupAdmin && (
          <form onSubmit={handleAddMember} className="flex gap-2">
              <input 
                  type="email" 
                  placeholder="Email del usuario a agregar"
                  className="flex-1 w-full p-2 border border-gray-300 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-500 dark:placeholder:text-slate-400"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
              />
              <Button type="submit" disabled={adding} size="sm" className="bg-blue-700 hover:bg-blue-700 text-white">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Agregar
              </Button>
          </form>
        )}

        <div className="border rounded-md overflow-hidden border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            {loading ? (
                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-900" /></div>
            ) : members.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-slate-300">Sin miembros aún.</div>
            ) : (
                <table className="w-full text-sm text-gray-900 dark:text-slate-50">
                    <thead className="bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-100">
                        <tr>
                            <th className="px-4 py-2 text-left">Usuario</th>
                            <th className="px-4 py-2 text-center">Rol</th>
                            <th className="px-4 py-2 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {members.map(m => (
                                    <tr key={m.id || `${m.group_id}-${m.user_id}`} className="bg-white dark:bg-slate-900">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{m.users?.full_name || 'Sin nombre'}</div>
                                            <div className="text-xs text-gray-500 dark:text-slate-300">{m.users?.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-slate-700 ${
                                                  m.role === 'admin'
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                                                    : 'bg-gray-50 text-gray-600 dark:bg-slate-800 dark:text-slate-200'
                                                }`}
                                                title="Rol del miembro"
                                            >
                                                {m.role === 'admin' ? 'Administrador' : 'Miembro'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {isGroupAdmin && m.user_id !== group.created_by && (
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

                {isCreator && (
                    <div className="border rounded-md overflow-hidden mt-4 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 border-gray-200 dark:border-slate-700">
                        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-semibold text-sm flex items-center gap-2">
                            <Shield className="w-4 h-4 text-gray-800 dark:text-slate-100" /> Solicitudes pendientes
                        </div>
                        {loadingRequests ? (
                            <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-blue-900" /></div>
                        ) : joinRequests.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500 dark:text-slate-300">No hay solicitudes pendientes.</div>
                        ) : (
                            <table className="w-full text-sm text-gray-900 dark:text-slate-50">
                                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Usuario</th>
                                        <th className="px-4 py-2 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {joinRequests.map((r) => (
                                        <tr key={r.id} className="bg-white dark:bg-slate-900">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{r.users?.full_name || 'Sin nombre'}</div>
                                                <div className="text-xs text-gray-500 dark:text-slate-300">{r.users?.email}</div>
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
                                                <ConfirmationModal
                                                    title="¿Eliminar solicitud?"
                                                    description="La solicitud se eliminará definitivamente."
                                                    onConfirm={() => handleDeleteRequest(r.id)}
                                                    trigger={
                                                      <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                      >
                                                        <Trash2 className="w-4 h-4" />
                                                      </Button>
                                                    }
                                                />
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
