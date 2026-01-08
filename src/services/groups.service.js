
import { supabase } from '@/lib/customSupabaseClient';

export const groupsService = {
  async getAllGroups() {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members(count)');
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: "Error al cargar grupos." };
    }
  },

  async getGroupMembers(groupId) {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('*, users(email, full_name)')
        .eq('group_id', groupId);
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: "Error al cargar miembros." };
    }
  },

  async createGroup(groupData) {
    try {
      const { data, error } = await supabase.from('groups').insert([groupData]).select().single();
      if (error) throw error;
      // Trigger handles adding creator as member
      return { success: true, data, message: "Grupo creado exitosamente" };
    } catch (error) {
      return { success: false, error: "Error al crear el grupo." };
    }
  },

  async updateGroup(id, updates) {
     try {
        const { error } = await supabase.from('groups').update(updates).eq('id', id);
        if (error) throw error;
        return { success: true, message: "Grupo actualizado" };
     } catch (error) {
         return { success: false, error: "Error al actualizar grupo" };
     }
  },

  async deleteGroup(id) {
      try {
          const { error } = await supabase.from('groups').delete().eq('id', id);
          if (error) throw error;
          return { success: true, message: "Grupo eliminado" };
      } catch (error) {
          return { success: false, error: "Error al eliminar grupo" };
      }
  },

  async addMember(groupId, email) {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users').select('id').eq('email', email).single();
      
      if (userError || !userData) return { success: false, error: "Usuario no encontrado" };

      const { error } = await supabase
        .from('group_members')
        .insert([{ group_id: groupId, user_id: userData.id }]);
      
      if (error) {
        if (error.code === '23505') return { success: false, error: "El usuario ya es miembro" };
        throw error;
      }
      return { success: true, message: "Miembro agregado exitosamente" };
    } catch (error) {
      return { success: false, error: "Error al agregar miembro." };
    }
  },

  async removeMember(groupId, userId) {
    try {
      const { error } = await supabase
        .from('group_members').delete().match({ group_id: groupId, user_id: userId });
      if (error) throw error;
      return { success: true, message: "Miembro eliminado" };
    } catch (error) {
      return { success: false, error: "Error al eliminar miembro." };
    }
  },

  async updateMemberRole(groupId, userId, newRole) {
    try {
      const { error } = await supabase
        .from('group_members').update({ role: newRole }).match({ group_id: groupId, user_id: userId });
      if (error) throw error;
      return { success: true, message: "Rol actualizado" };
    } catch (error) {
      return { success: false, error: "Error al actualizar rol." };
    }
  }
};
