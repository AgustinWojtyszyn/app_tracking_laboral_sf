
import React, { useState, useEffect } from 'react';
import { groupsService } from '@/services/groups.service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2, UserPlus, Shield } from 'lucide-react';
import ConfirmationModal from '@/components/common/ConfirmationModal';

export default function GroupMembers({ group, onClose }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

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

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newEmail) return;

    setAdding(true);
    const result = await groupsService.addMember(group.id, newEmail);
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

  return (
    <div className="space-y-6">
        <form onSubmit={handleAddMember} className="flex gap-2">
            <input 
                type="email" 
                placeholder="Email del usuario a agregar"
                className="flex-1 p-2 border rounded text-sm"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
            />
            <Button type="submit" disabled={adding} size="sm" className="bg-blue-900">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Agregar
            </Button>
        </form>

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
                                    <button 
                                        onClick={() => handleRoleChange(m.user_id, m.role)}
                                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                            m.role === 'admin' 
                                            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' 
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                        title="Click para cambiar rol"
                                    >
                                        {m.role === 'admin' ? 'Admin' : 'Miembro'}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
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
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
  );
}
