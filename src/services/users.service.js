
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
    try {
      let query = supabase.from('audit_logs').select('*, users(email)').order('timestamp', { ascending: false }).limit(50);
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: "Error al cargar logs." };
    }
  }
};
