
import React, { useState, useEffect } from 'react';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Users, Trash2, Calendar, ShieldCheck, User } from 'lucide-react';
import GroupForm from '@/components/groups/GroupForm';
import GroupMembers from '@/components/groups/GroupMembers';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export default function GroupsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { getGroups, deleteGroup } = useGroups();
  
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    if (user) fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    setLoading(true);
    const result = await getGroups();
    if (result.success) {
        setGroups(result.data);
    } else {
        addToast(result.error, 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
      const result = await deleteGroup(id);
      if (result.success) {
          addToast(result.message, 'success');
          fetchGroups();
      } else {
          addToast(result.error, 'error');
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Grupos de Trabajo</h1>
            <p className="text-gray-500">Colabora con otros usuarios</p>
        </div>
        <GroupForm onSuccess={fetchGroups} />
      </div>

      {loading ? (
          <LoadingSpinner />
      ) : groups.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-xl shadow-sm border border-dashed border-gray-300 flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                 <Users className="w-8 h-8 text-blue-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No tienes grupos</h3>
              <p className="text-gray-500 max-w-sm mt-1 mb-6">Crea un grupo para compartir trabajos y gestionar proyectos en equipo.</p>
              <GroupForm onSuccess={fetchGroups} />
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map(group => {
                  const isCreator = group.created_by === user.id;
                  const memberCount = group.group_members?.[0]?.count || 0;

                  return (
                    <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-200 transition-all duration-300 group-card overflow-hidden flex flex-col h-full">
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-lg shadow-sm">
                                    <Users className="w-6 h-6 text-[#1e3a8a]" />
                                </div>
                                {isCreator && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-1 rounded-full border border-blue-200">
                                        Admin
                                    </span>
                                )}
                            </div>
                            
                            <h3 className="font-bold text-lg text-gray-900 mb-2">{group.name}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2">{group.description || "Sin descripción disponible."}</p>
                            
                            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500">
                                <div className="flex items-center" title="Miembros">
                                    <User className="w-3 h-3 mr-1.5" /> 
                                    {memberCount} {memberCount === 1 ? 'Miembro' : 'Miembros'}
                                </div>
                                <div className="flex items-center" title="Fecha creación">
                                    <Calendar className="w-3 h-3 mr-1.5" /> 
                                    {new Date(group.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-2">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex-1 border-gray-200 hover:border-blue-300 hover:text-blue-700 bg-white" onClick={() => setSelectedGroup(group)}>
                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                        Miembros
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden">
                                    <div className="p-6 bg-[#1e3a8a] text-white">
                                        <h2 className="text-xl font-bold">Gestionar Grupo</h2>
                                        <p className="text-blue-200 text-sm">{group.name}</p>
                                    </div>
                                    <div className="p-6">
                                        <GroupMembers group={group} onClose={() => {}} />
                                    </div>
                                </DialogContent>
                            </Dialog>
                            
                            {isCreator && (
                                <ConfirmationModal
                                    title="¿Eliminar Grupo?"
                                    description={`Estás a punto de eliminar "${group.name}". Esta acción es irreversible y eliminará todos los datos asociados.`}
                                    confirmLabel="Sí, eliminar"
                                    onConfirm={() => handleDelete(group.id)}
                                    trigger={
                                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 hover:bg-red-50">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    }
                                />
                            )}
                        </div>
                    </div>
                  );
              })}
          </div>
      )}
    </div>
  );
}
