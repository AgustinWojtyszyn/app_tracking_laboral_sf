
import { supabase } from '@/lib/customSupabaseClient';

export const jobsService = {
  async resolveActorContext(providedUserId = null) {
    const { data: authData } = await supabase.auth.getUser();
    const userId = providedUserId || authData?.user?.id || null;
    if (!userId) return { userId: null, groupIds: [], isAdmin: false };

    const { data: profile } = await supabase.from('users').select('role').eq('id', userId).single();
    const isAdmin = profile?.role === 'admin';

    let memberships = [];
    const membershipQuery = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (membershipQuery.error) {
      // Si la columna status no existe (error 42703) u otro error de esquema, seguimos sin filtrar por estado.
      if (membershipQuery.error.code === '42703') {
        const fallback = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId);
        memberships = fallback.data || [];
      } else {
        console.warn('resolveActorContext - error obteniendo membresías:', membershipQuery.error);
      }
    } else {
      memberships = membershipQuery.data || [];
    }

    const groupIds = (memberships || [])
      .map(m => m.group_id)
      .filter(Boolean);

    return { userId, groupIds, isAdmin };
  },

  async getJobsByDateRange(startDate, endDate, filters = {}) {
    try {
      const { userId, groupIds, isAdmin } = await this.resolveActorContext(filters.currentUserId);
      if (!userId) return { success: true, data: [] };
      if (!isAdmin && filters.groupId && filters.groupId !== 'all' && !groupIds.includes(filters.groupId)) {
        return { success: true, data: [] };
      }

      // Consulta principal intentando incluir relaciones de grupos y trabajadores internos.
      // Usamos la FK explícita jobs_group_id_fkey para que PostgREST no
      // intente usar una columna inexistente llamada "groups" en jobs.
      let baseQuery = supabase
        .from('jobs')
        .select('*, groups:groups!jobs_group_id_fkey(name), workers:workers!jobs_worker_id_fkey(display_name, alias)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      let orFilters = [];
      if (!isAdmin) {
        if (groupIds.length > 0) {
          const groupList = groupIds.join(',');
          orFilters.push(`group_id.in.(${groupList})`);
        }
        orFilters.push(`user_id.eq.${userId}`);
        baseQuery = baseQuery.or(orFilters.join(','));
      }

      if (filters.status && filters.status !== 'all') baseQuery = baseQuery.eq('status', filters.status);
      if (filters.groupId && filters.groupId !== 'all') baseQuery = baseQuery.eq('group_id', filters.groupId);
      if (filters.workerId && filters.workerId !== 'all') baseQuery = baseQuery.eq('worker_id', filters.workerId);
      if (filters.search) {
        baseQuery = baseQuery.or(`description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
      }

      let { data, error } = await baseQuery;

      // Si hay un error de esquema relacionado con 'groups' (PGRST204),
      // hacemos un fallback a una consulta sin relaciones para no romper la app.
      if (error && error.code === 'PGRST204') {
        console.warn("Fallo relación jobs->groups, usando fallback sin joins:", error.message);

        let fallbackQuery = supabase
          .from('jobs')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false });

        if (!isAdmin) {
          fallbackQuery = fallbackQuery.or(orFilters.join(','));
        }

        if (filters.status && filters.status !== 'all') fallbackQuery = fallbackQuery.eq('status', filters.status);
        if (filters.groupId && filters.groupId !== 'all') fallbackQuery = fallbackQuery.eq('group_id', filters.groupId);
        if (filters.workerId && filters.workerId !== 'all') fallbackQuery = fallbackQuery.eq('worker_id', filters.workerId);
        if (filters.search) {
          fallbackQuery = fallbackQuery.or(`description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
        }

        const fallbackResult = await fallbackQuery;
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("GetJobs Error:", error);
      return { success: false, error: "Error al cargar trabajos. Verifique su conexión." };
    }
  },

  async getJobsByDay(date) {
    return this.getJobsByDateRange(date, date);
  },

  async createJob(jobData) {
    try {
      const { data, error } = await supabase.from('jobs').insert([jobData]).select().single();
      if (error) throw error;
      return { success: true, data, message: "Trabajo creado exitosamente" };
    } catch (error) {
      return { success: false, error: "Error al crear el trabajo." };
    }
  },

  async updateJob(id, jobData, actorId = null) {
    try {
      const { userId, groupIds, isAdmin } = await this.resolveActorContext(actorId);
      if (!userId) return { success: false, error: "No hay sesión activa." };

      const { data: existing, error: fetchError } = await supabase
        .from('jobs')
        .select('user_id, group_id, editable_by_group')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      if (!existing) return { success: false, error: "Trabajo no encontrado." };

      const isCreator = existing.user_id === userId;
      const canEditByGroup = existing.editable_by_group && existing.group_id && groupIds.includes(existing.group_id);
      if (!isCreator && !canEditByGroup && !isAdmin) {
        return { success: false, error: "No tienes permisos para editar este trabajo." };
      }

      const { error } = await supabase.from('jobs').update(jobData).eq('id', id);
      if (error) throw error;
      return { success: true, message: "Trabajo actualizado exitosamente" };
    } catch (error) {
      return { success: false, error: "Error al actualizar el trabajo." };
    }
  },

  async deleteJob(id, { actorId = null, allowAdmin = true } = {}) {
    try {
      const { userId, isAdmin } = await this.resolveActorContext(actorId);
      if (!userId) return { success: false, error: "No hay sesión activa." };

      const { data: existing, error: fetchError } = await supabase
        .from('jobs')
        .select('user_id')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      if (!existing) return { success: false, error: "Trabajo no encontrado." };

      const isCreator = existing.user_id === userId;
      const adminAllowed = allowAdmin && isAdmin;
      if (!isCreator && !adminAllowed) {
        return { success: false, error: "Solo el creador puede eliminar este trabajo." };
      }

      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      return { success: true, message: "Trabajo eliminado exitosamente" };
    } catch (error) {
      return { success: false, error: "Error al eliminar el trabajo." };
    }
  },

  async deleteCompletedJobs(startDate, endDate) {
    try {
      const { error, count } = await supabase
        .from('jobs')
        .delete({ count: 'exact' })
        .eq('status', 'completed')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      return { success: true, message: "Trabajos completados eliminados", removed: count || 0 };
    } catch (error) {
      return { success: false, error: "No se pudieron limpiar los trabajos completados." };
    }
  },

  async deletePendingJobs(startDate, endDate) {
    try {
      const { error, count } = await supabase
        .from('jobs')
        .delete({ count: 'exact' })
        .eq('status', 'pending')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      return { success: true, message: "Trabajos pendientes eliminados", removed: count || 0 };
    } catch (error) {
      return { success: false, error: "No se pudieron limpiar los trabajos pendientes." };
    }
  },

  async getJobStats(startDate, endDate) {
    try {
      const { data, error } = await supabase.rpc('get_job_stats', { start_date: startDate, end_date: endDate });
      
      if (error) {
         // Fallback manual calculation if RPC fails or doesn't exist yet
         console.warn("RPC get_job_stats failed, using fallback:", error);
         const { data: jobs } = await supabase
            .from('jobs')
            .select('hours_worked, cost_spent, amount_to_charge')
            .gte('date', startDate)
            .lte('date', endDate);
            
         if (!jobs) return { success: true, data: { total_hours: 0, total_cost: 0, total_charge: 0, job_count: 0 }};

         const stats = jobs.reduce((acc, job) => ({
             total_hours: acc.total_hours + (Number(job.hours_worked) || 0),
             total_cost: acc.total_cost + (Number(job.cost_spent) || 0),
             total_charge: acc.total_charge + (Number(job.amount_to_charge) || 0),
             job_count: acc.job_count + 1
         }), { total_hours: 0, total_cost: 0, total_charge: 0, job_count: 0 });
         
         return { success: true, data: stats };
      }
      return { success: true, data: data[0] };
    } catch (error) {
      return { success: false, error: "Error al cargar estadísticas." };
    }
  }
};
