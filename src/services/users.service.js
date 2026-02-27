
import { supabase } from '@/lib/customSupabaseClient';

export const usersService = {
  async resolveCurrentUserId() {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  },

  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: "Error al cargar usuarios." };
    }
  },

  async transferAdminRole(targetUserId) {
    try {
      const actingUserId = await this.resolveCurrentUserId();

      const { data: targetUser } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', targetUserId)
        .maybeSingle();

      const { error } = await supabase.rpc('transfer_admin_role', { target_user_id: targetUserId });
      if (error) throw error;

      await this.logAuditEvent({
        action: 'transfer_admin',
        entityType: 'users',
        newValue: {
          new_admin: targetUserId,
          new_admin_email: targetUser?.email || null,
          new_admin_name: targetUser?.full_name || null
        },
        userId: actingUserId
      });

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

    const parseValue = (value) => {
      if (!value) return null;
      if (typeof value === 'object') return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    const logs = (data || []).map((log) => ({
      ...log,
      new_value_parsed: parseValue(log.new_value),
      old_value_parsed: parseValue(log.old_value)
    }));

    // Enriquecer con email/nombre de usuarios (actor y usuarios mencionados)
    const userIds = new Set(logs.map((log) => log.user_id).filter(Boolean));

    logs.forEach((log) => {
      const candidates = [
        log.new_value_parsed?.new_admin,
        log.new_value_parsed?.created_by,
        log.new_value_parsed?.added_user_id,
        log.new_value_parsed?.member_id,
        log.new_value_parsed?.user_id,
        log.old_value_parsed?.user_id
      ].filter(Boolean);
      candidates.forEach((id) => userIds.add(id));
    });

    let userEmails = {};
    let userNames = {};

    if (userIds.size) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', Array.from(userIds));

      if (usersData) {
        userEmails = usersData.reduce((acc, u) => {
          acc[u.id] = u.email;
          return acc;
        }, {});
        userNames = usersData.reduce((acc, u) => {
          acc[u.id] = u.full_name;
          return acc;
        }, {});
      }
    }

    const enriched = logs.map((log) => {
      const newValue = { ...(log.new_value_parsed || {}) };
      const oldValue = { ...(log.old_value_parsed || {}) };

      if (newValue.new_admin) {
        newValue.new_admin_email = userEmails[newValue.new_admin] || null;
        newValue.new_admin_name = userNames[newValue.new_admin] || null;
      }

      if (newValue.added_user_id) {
        newValue.added_user_email = newValue.added_user_email || userEmails[newValue.added_user_id] || null;
        newValue.added_user_name = newValue.added_user_name || userNames[newValue.added_user_id] || null;
      }

      if (newValue.member_id) {
        newValue.member_email = newValue.member_email || userEmails[newValue.member_id] || null;
        newValue.member_name = newValue.member_name || userNames[newValue.member_id] || null;
      }

      if (newValue.created_by) {
        newValue.created_by_email = newValue.created_by_email || userEmails[newValue.created_by] || null;
        newValue.created_by_name = newValue.created_by_name || userNames[newValue.created_by] || null;
      }

      if (newValue.user_id) {
        newValue.user_email = newValue.user_email || userEmails[newValue.user_id] || null;
        newValue.user_name = newValue.user_name || userNames[newValue.user_id] || null;
      }

      return {
        ...log,
        user_email: userEmails[log.user_id] || null,
        user_full_name: userNames[log.user_id] || null,
        new_value_resolved: newValue,
        old_value_resolved: oldValue
      };
    });

    return { success: true, data: enriched };
  },

  async clearAuditLogs() {
    try {
      let totalDeleted = 0;

      // Borrado por lotes explícitos para evitar errores de sintaxis y asegurar eliminación
      while (true) {
        const { data: rows, error: fetchError } = await supabase
          .from('audit_logs')
          .select('id')
          .limit(1000);

        if (fetchError) throw fetchError;
        if (!rows || rows.length === 0) break;

        const ids = rows.map((r) => r.id);
        const { count, error: deleteError } = await supabase
          .from('audit_logs')
          .delete()
          .in('id', ids)
          .select('id', { count: 'exact' });

        if (deleteError) throw deleteError;
        totalDeleted += count || 0;

        // Si no se borró nada en esta pasada, salimos para evitar loops
        if (!count) break;
      }

      return { success: true, message: totalDeleted > 0 ? 'Historial de auditoría limpiado.' : 'No había registros para limpiar.' };
    } catch (error) {
      console.error('clearAuditLogs - error:', error);
      return { success: false, error: error.message || 'No se pudo limpiar la auditoría.' };
    }
  },

  async logAuditEvent({ action, entityType, newValue = null, oldValue = null, userId = null }) {
    try {
      const payload = {
        action,
        entity_type: entityType,
        new_value: newValue,
        old_value: oldValue,
        user_id: userId || null
      };

      const { error } = await supabase.from('audit_logs').insert([payload]);
      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('logAuditEvent - error al registrar auditoría:', error);
      return { success: false, error: error.message || 'No se pudo registrar la auditoría.' };
    }
  },

  async updateUserRole(userId, role) {
    try {
      const actingUserId = await this.resolveCurrentUserId();

      const { data: currentUser } = await supabase
        .from('users')
        .select('id, role, permissions, email, full_name')
        .eq('id', userId)
        .maybeSingle();

      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;

      await this.logAuditEvent({
        action: 'user_role_updated',
        entityType: 'users',
        newValue: {
          user_id: userId,
          role,
          user_email: currentUser?.email || null,
          user_name: currentUser?.full_name || null
        },
        oldValue: {
          user_id: userId,
          role: currentUser?.role || null
        },
        userId: actingUserId
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: "No se pudo actualizar el rol. Revisa tus permisos." };
    }
  },

  async updateUserPermissions(userId, permissions = []) {
    const cleanPermissions = Array.isArray(permissions) ? permissions : [];

    try {
      const actingUserId = await this.resolveCurrentUserId();

      const { data: currentUser } = await supabase
        .from('users')
        .select('id, role, permissions, email, full_name')
        .eq('id', userId)
        .maybeSingle();

      const { error } = await supabase
        .from('users')
        .update({ permissions: cleanPermissions })
        .eq('id', userId);

      if (error) throw error;

      await this.logAuditEvent({
        action: 'user_permissions_updated',
        entityType: 'users',
        newValue: {
          user_id: userId,
          permissions: cleanPermissions,
          user_email: currentUser?.email || null,
          user_name: currentUser?.full_name || null
        },
        oldValue: {
          user_id: userId,
          permissions: currentUser?.permissions || []
        },
        userId: actingUserId
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: "No se pudieron guardar los permisos para este usuario." };
    }
  },

  async deleteUser(userId) {
    try {
      const actingUserId = await this.resolveCurrentUserId();

      const { data: targetUser } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .maybeSingle();

      const { error } = await supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      await this.logAuditEvent({
        action: 'user_deleted',
        entityType: 'users',
        newValue: null,
        oldValue: {
          user_id: userId,
          user_email: targetUser?.email || null,
          user_name: targetUser?.full_name || null,
          role: targetUser?.role || null
        },
        userId: actingUserId
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: "No se pudo eliminar el usuario. Revisa tus permisos." };
    }
  }
};
