
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
    const selectAttempts = [
      '*, users:auth.users!audit_logs_user_id_fkey(email)', // FK pointing to auth schema
      '*, users:users!audit_logs_user_id_fkey(email)',       // FK pointing to public.users
      '*'                                                   // fallback without join
    ];

    let lastError = null;

    for (const select of selectAttempts) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(select)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (!error) {
        return { success: true, data };
      }

      lastError = error;
    }

    // If every attempt failed, return a friendly error
    return { success: false, error: lastError?.message || "Error al cargar logs." };
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
