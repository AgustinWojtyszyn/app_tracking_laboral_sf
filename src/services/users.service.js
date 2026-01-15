
import { supabase } from '@/lib/customSupabaseClient';

export const usersService = {
  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: "Error al cargar usuarios." };
    }
  },

  async transferAdminRole(targetUserId) {
    try {
      const { error } = await supabase.rpc('transfer_admin_role', { target_user_id: targetUserId });
      if (error) throw error;
      return { success: true, message: "Rol de admin transferido exitosamente" };
    } catch (error) {
      return { success: false, error: "Error al transferir rol. Verifica permisos." };
    }
  },

  async getAuditLogs(filters = {}) {
    // Consulta simple sin joins para evitar errores 400 en PostgREST
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, entity_type, new_value, old_value, timestamp, user_id')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      return { success: false, error: error.message || "Error al cargar logs." };
    }

    // Enriquecer con email de usuario si está disponible
    const userIds = Array.from(new Set((data || []).map((log) => log.user_id).filter(Boolean)));
    let userEmails = {};

    if (userIds.length) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);

      if (usersData) {
        userEmails = usersData.reduce((acc, u) => {
          acc[u.id] = u.email;
          return acc;
        }, {});
      }
    }

    const enriched = (data || []).map((log) => ({
      ...log,
      user_email: userEmails[log.user_id] || null
    }));

    return { success: true, data: enriched };
  },

  async updateUserRole(userId, role) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: "No se pudo actualizar el rol. Revisa tus permisos." };
    }
  },

  async updateUserPermissions(userId, permissions = []) {
    const cleanPermissions = Array.isArray(permissions) ? permissions : [];

    try {
      const { error } = await supabase
        .from('users')
        .update({ permissions: cleanPermissions })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: "No se pudieron guardar los permisos para este usuario." };
    }
  }
};
