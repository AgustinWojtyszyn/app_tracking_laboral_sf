
import { supabase } from '@/lib/customSupabaseClient';

export const jobsService = {
  async getJobsByDateRange(startDate, endDate, filters = {}) {
    try {
      let query = supabase
        .from('jobs')
        .select('*, groups(name), users(full_name, email)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.groupId && filters.groupId !== 'all') query = query.eq('group_id', filters.groupId);
      if (filters.userId && filters.userId !== 'all') query = query.eq('user_id', filters.userId);
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
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
