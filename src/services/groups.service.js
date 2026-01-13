
import { supabase } from '@/lib/customSupabaseClient';

export const groupsService = {
  async getAllGroups(currentUserId) {
    try {
      const { data: groups, error } = await supabase
        .from('groups')
        .select('*, group_members(count)');
      if (error) throw error;

      // Enriquecer con información de membresía del usuario actual
      if (currentUserId && groups) {
        const { data: memberships, error: membershipError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', currentUserId);

        if (membershipError) {
          console.error('Error al obtener membresías de grupos:', membershipError);
          return { success: true, data: groups.map(g => ({ ...g, isMember: false })) };
        }

        const memberGroupIds = new Set((memberships || []).map(m => m.group_id));
        const enriched = groups.map(g => ({ ...g, isMember: memberGroupIds.has(g.id) }));
        return { success: true, data: enriched };
      }

      return { success: true, data: (groups || []).map(g => ({ ...g, isMember: false })) };
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
      const rawIdentifier = (email || '').trim();
      if (!rawIdentifier) {
        return { success: false, error: "Ingresa un email o nombre" };
      }

      const isEmail = rawIdentifier.includes('@');
      const normalizedEmail = rawIdentifier.toLowerCase();
      console.log('addMember - identificador para búsqueda:', {
        rawIdentifier,
        normalizedEmail,
        mode: isEmail ? 'email' : 'name'
      });

      let query = supabase
        .from('users')
        .select('id, email, full_name')
        .limit(2);

      if (isEmail) {
        // Búsqueda exacta por email (case-insensitive)
        query = query.ilike('email', normalizedEmail);
      } else {
        // Búsqueda por nombre que contenga el texto ingresado (case-insensitive)
        query = query.ilike('full_name', `%${rawIdentifier}%`);
      }

      const { data: usersFound, error: userError } = await query;

      if (userError) {
        console.error('addMember - error en consulta de usuario:', userError);
        return { success: false, error: "Error al buscar usuario" };
      }

      if (!usersFound || usersFound.length === 0) {
        console.error('addMember - usuario no encontrado para identificador:', rawIdentifier);
        return { success: false, error: "Usuario no encontrado" };
      }

      if (usersFound.length > 1) {
        console.warn('addMember - múltiples usuarios encontrados para identificador:', rawIdentifier, usersFound);
        return { success: false, error: "Se encontraron varios usuarios con ese nombre. Usa el email completo." };
      }

      const userData = usersFound[0];

      const { error } = await supabase
        .from('group_members')
        .insert([{ group_id: groupId, user_id: userData.id }]);
      
      if (error) {
        if (error.code === '23505') return { success: false, error: "El usuario ya es miembro" };
        throw error;
      }
      return { success: true, message: "Miembro agregado exitosamente" };
    } catch (error) {
      console.error('addMember - error al agregar miembro:', error);
      return { success: false, error: error?.message || "Error al agregar miembro." };
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
  },

  async requestToJoin(groupId, userId) {
    try {
      if (!userId) return { success: false, error: 'Usuario no válido.' };

      // Evitar duplicar membresías existentes
      const { data: existingMember, error: memberError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

      if (memberError) throw memberError;
      if (existingMember) {
        return { success: false, error: 'Ya sos miembro de este grupo.' };
      }

      // Crear solicitud de ingreso
      const { error } = await supabase
        .from('group_join_requests')
        .insert([{ group_id: groupId, user_id: userId, status: 'pending' }]);

      if (error) throw error;
      return { success: true, message: 'Solicitud enviada al administrador del grupo.' };
    } catch (error) {
      console.error('requestToJoin - error:', error);
      return { success: false, error: 'Error al enviar la solicitud.' };
    }
  },

  async getJoinRequests(groupId) {
    try {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select('id, group_id, user_id, status, created_at, users(email, full_name)')
        .eq('group_id', groupId)
        .eq('status', 'pending');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('getJoinRequests - error:', error);
      return { success: false, error: 'Error al cargar solicitudes.' };
    }
  },

  async respondToJoinRequest(requestId, groupId, userId, accept) {
    try {
      if (accept) {
        // Agregar como miembro (ignorar si ya existe)
        const { error: insertError } = await supabase
          .from('group_members')
          .insert([{ group_id: groupId, user_id: userId }]);

        if (insertError && insertError.code !== '23505') throw insertError;

        const { error: updateError } = await supabase
          .from('group_join_requests')
          .update({ status: 'approved' })
          .eq('id', requestId);

        if (updateError) throw updateError;
        return { success: true, message: 'Solicitud aprobada.' };
      } else {
        const { error } = await supabase
          .from('group_join_requests')
          .update({ status: 'rejected' })
          .eq('id', requestId);

        if (error) throw error;
        return { success: true, message: 'Solicitud rechazada.' };
      }
    } catch (error) {
      console.error('respondToJoinRequest - error:', error);
      return { success: false, error: 'Error al procesar la solicitud.' };
    }
  },

  async deleteJoinRequest(requestId) {
    try {
      const { error } = await supabase
        .from('group_join_requests')
        .delete()
        .eq('id', requestId);
      if (error) throw error;
      return { success: true, message: 'Solicitud eliminada.' };
    } catch (error) {
      console.error('deleteJoinRequest - error:', error);
      return { success: false, error: 'Error al eliminar la solicitud.' };
    }
  }
};
