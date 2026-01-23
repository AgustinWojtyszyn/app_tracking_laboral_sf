
import React, { useState, useEffect, useRef } from 'react';
import { groupsService } from '@/services/groups.service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { Loader2, Trash2, UserPlus, Shield } from 'lucide-react';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { DialogClose } from '@/components/ui/dialog';

export default function GroupMembers({
  group,
  onClose,
  isGroupAdmin = false,
  isCreator = false,
  isMember = false,
  onMembersUpdated = () => {},
  onGroupUpdated = () => {}
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
    const [joinRequests, setJoinRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [editName, setEditName] = useState(group.name || '');
  const [editDescription, setEditDescription] = useState(group.description || '');
  const [processingRequests, setProcessingRequests] = useState([]);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const closeRef = useRef(null);
  const { addToast } = useToast();
  const { user } = useAuth();
  const canSeeRequests = isCreator || isMember;

  useEffect(() => {
    fetchMembers();
  }, [group.id]);

  useEffect(() => {
    setEditName(group.name || '');
    setEditDescription(group.description || '');
  }, [group.id, group.name, group.description]);

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
        if (!isCreator && !isMember) return;
        setLoadingRequests(true);
        const result = await groupsService.getJoinRequests(group.id);
        if (result.success) {
            setJoinRequests(result.data || []);
        }
        setLoadingRequests(false);
    };

    useEffect(() => {
        if (isCreator || isMember) {
            fetchJoinRequests();
        }
    }, [group.id, isCreator, isMember]);

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
      addToast(result.message, 'success');
      setNewEmail('');
      await fetchMembers();
    } else {
      addToast(result.error, 'error');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (removingMemberId === userId) return;
    setRemovingMemberId(userId);
    if (!isGroupAdmin) {
      addToast('Solo el administrador puede eliminar miembros.', 'error');
      setRemovingMemberId(null);
      return;
    }

    // Bloquear que el creador (o el propio usuario) se elimine a sí mismo
    if (group.created_by === userId) {
      addToast('El creador no puede eliminarse del grupo.', 'error');
      setRemovingMemberId(null);
      return;
    }
    if (user?.id === userId) {
      addToast('No puedes auto-eliminarte de este grupo.', 'error');
      setRemovingMemberId(null);
      return;
    }

    const result = await groupsService.removeMember(group.id, userId);
    setRemovingMemberId(null);
    if (result.success) {
      addToast(result.message, 'success');
      await fetchMembers();
    } else {
      addToast(result.error, 'error');
    }
  };

  const handleRespondRequest = async (request, accept) => {
      if (processingRequests.includes(request.id)) return;
      setProcessingRequests((prev) => [...prev, request.id]);
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
      setProcessingRequests((prev) => prev.filter((id) => id !== request.id));
      if (result.success) {
        addToast(result.message, 'success');
        await fetchMembers();
        await fetchJoinRequests();
      } else {
        addToast(result.error, 'error');
      }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!isGroupAdmin) {
      addToast('Solo administradores pueden editar el grupo.', 'error');
      return;
    }

    const trimmedName = (editName || '').trim();
    const trimmedDesc = (editDescription || '').trim();
    if (!trimmedName) {
      addToast('El nombre no puede estar vacío.', 'error');
      return;
    }

    setSavingGroup(true);
    const result = await groupsService.updateGroup(group.id, { name: trimmedName, description: trimmedDesc });
    setSavingGroup(false);

    if (result.success) {
      addToast('Grupo actualizado', 'success');
      onGroupUpdated({ id: group.id, name: trimmedName, description: trimmedDesc });
      closeRef.current?.click();
    } else {
      addToast(result.error || 'No se pudo actualizar el grupo.', 'error');
    }
  };

  const handleDeleteRequest = async (requestId) => {
      if (processingRequests.includes(requestId)) return;
      setProcessingRequests((prev) => [...prev, requestId]);
      if (!isGroupAdmin) {
        addToast('Solo el administrador puede eliminar solicitudes.', 'error');
        setProcessingRequests((prev) => prev.filter((id) => id !== requestId));
        return;
      }
      const result = await groupsService.deleteJoinRequest(requestId);
      setProcessingRequests((prev) => prev.filter((id) => id !== requestId));
      if (result.success) {
        addToast(result.message, 'success');
        await fetchJoinRequests();
      } else {
        addToast(result.error, 'error');
      }
  };

  // Usar siempre la lista actual para reflejar altas/bajas inmediatamente
  const totalMembers = members.length;
  const pendingTotal = joinRequests.length || group.pendingRequests || 0;

  return (
    <div className="space-y-6 text-gray-900 dark:text-slate-50">
        <DialogClose ref={closeRef} className="hidden" />
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
          <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-slate-50">Editar grupo</h4>
            <form onSubmit={handleUpdateGroup} className="space-y-3">
              <div>
                <label className="text-xs uppercase text-gray-600 dark:text-slate-300 font-semibold block mb-1">Nombre</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-500 dark:placeholder:text-slate-400"
                  placeholder="Nombre del grupo"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-gray-600 dark:text-slate-300 font-semibold block mb-1">Descripción</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-500 dark:placeholder:text-slate-400"
                  placeholder="Describe el propósito del grupo"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={savingGroup}
                  size="sm"
                  className="bg-blue-700 hover:bg-blue-700 text-white"
                >
                  {savingGroup ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Guardar cambios
                </Button>
              </div>
            </form>
          </div>
        )}

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
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={removingMemberId === m.user_id}
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-60"
                                                      >
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

                {canSeeRequests && (
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
                                                {isGroupAdmin ? (
                                                  <>
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                                        disabled={processingRequests.includes(r.id)}
                                                        onClick={() => handleRespondRequest(r, true)}
                                                    >
                                                        Aceptar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 border-red-200 text-xs"
                                                        disabled={processingRequests.includes(r.id)}
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
                                                            disabled={processingRequests.includes(r.id)}
                                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-60"
                                                          >
                                                            <Trash2 className="w-4 h-4" />
                                                          </Button>
                                                        }
                                                    />
                                                  </>
                                                ) : (
                                                  <span className="text-xs text-gray-500 dark:text-slate-300">Solo lectura</span>
                                                )}
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
