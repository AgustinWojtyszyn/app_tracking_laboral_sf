
import { supabase } from '@/lib/customSupabaseClient';

export const jobsService = {
  async getJobsByDateRange(startDate, endDate, filters = {}) {
    try {
      // Consulta principal intentando incluir relaciones de grupos y trabajadores internos.
      // Usamos la FK explícita jobs_group_id_fkey para que PostgREST no
      // intente usar una columna inexistente llamada "groups" en jobs.
      let baseQuery = supabase
        .from('jobs')
        .select('*, groups:groups!jobs_group_id_fkey(name), workers:workers!jobs_worker_id_fkey(display_name, alias)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

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

  async updateJob(id, jobData) {
    try {
      const { error } = await supabase.from('jobs').update(jobData).eq('id', id);
      if (error) throw error;
      return { success: true, message: "Trabajo actualizado exitosamente" };
    } catch (error) {
      return { success: false, error: "Error al actualizar el trabajo." };
    }
  },

  async deleteJob(id) {
    try {
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
