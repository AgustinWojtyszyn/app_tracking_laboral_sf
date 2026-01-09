import { supabase } from '@/lib/customSupabaseClient';

export const workersService = {
  async getWorkers({ search = '', includeInactive = false } = {}) {
    try {
      let query = supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      if (search) {
        const term = search.toLowerCase();
        query = query.or(
          `display_name.ilike.%${term}%,alias.ilike.%${term}%,phone.ilike.%${term}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('getWorkers error', error);
      return { success: false, error: 'Error al cargar trabajadores.' };
    }
  },

  async createWorker(workerData) {
    try {
      const payload = {
        display_name: workerData.display_name,
        alias: workerData.alias || null,
        phone: workerData.phone || null,
        notes: workerData.notes || null,
        is_active: workerData.is_active ?? true,
      };

      const { data, error } = await supabase
        .from('workers')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Trabajador creado correctamente.' };
    } catch (error) {
      console.error('createWorker error', error);
      return { success: false, error: 'Error al crear el trabajador.' };
    }
  },

  async updateWorker(id, workerData) {
    try {
      const payload = {
        display_name: workerData.display_name,
        alias: workerData.alias || null,
        phone: workerData.phone || null,
        notes: workerData.notes || null,
        is_active: workerData.is_active ?? true,
      };

      const { data, error } = await supabase
        .from('workers')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Trabajador actualizado correctamente.' };
    } catch (error) {
      console.error('updateWorker error', error);
      return { success: false, error: 'Error al actualizar el trabajador.' };
    }
  },

  async deleteWorker(id) {
    try {
      // Intento de borrado físico
      const { error } = await supabase.from('workers').delete().eq('id', id);

      if (!error) {
        return { success: true, message: 'Trabajador eliminado correctamente.' };
      }

      // Si hay violación de FK, hacemos soft delete
      if (error && (error.code === '23503' || /foreign key/i.test(error.message))) {
        const { error: updateError } = await supabase
          .from('workers')
          .update({ is_active: false })
          .eq('id', id);

        if (updateError) throw updateError;
        return {
          success: true,
          message: 'El trabajador tiene trabajos asociados, se marcó como inactivo.',
        };
      }

      throw error;
    } catch (error) {
      console.error('deleteWorker error', error);
      return { success: false, error: 'Error al eliminar el trabajador.' };
    }
  },
};
