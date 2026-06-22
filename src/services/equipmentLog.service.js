import { supabase } from '@/lib/customSupabaseClient';

export const VEHICLE_STATUS = ['activo', 'inactivo', 'mantenimiento'];
export const VEHICLE_TYPES = ['utilitario', 'camion', 'auto', 'moto', 'otro'];
export const PLANT_STATUS = ['activo', 'inactivo', 'mantenimiento', 'requiere_revision'];
export const PLANT_CATEGORIES = [
  'Área fría',
  'Área caliente',
  'Depósito',
  'Cámara frigorífica',
  'Parte común',
  'Planta alta operativa',
  'Comedor de personal',
  'Equipo operativo',
  'Otro sector operativo',
];

export const normalizeLicensePlate = (value) => (
  String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '')
);

const mapSupabaseError = (error, fallback) => {
  if (error?.code === '23505') return 'Ya existe un vehículo con esa patente.';
  if (error?.code === '42501' || /row-level security|permission denied/i.test(error?.message || '')) {
    return 'No tenés permisos para realizar esta acción.';
  }
  return fallback;
};

export const isMissingEquipmentLogTableError = (error) => (
  error?.code === 'PGRST205'
  || error?.status === 404
  || /could not find the table|schema cache/i.test(error?.message || '')
);

const emptyListIfUnavailable = (error) => {
  if (!isMissingEquipmentLogTableError(error)) return null;
  return { success: true, data: [] };
};

export const equipmentLogService = {
  async getVehicles({ search = '' } = {}) {
    try {
      let query = supabase
        .from('vehicles')
        .select('*, assigned_driver:assigned_driver_id(id, full_name, email)')
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      const term = search.trim();
      if (term) {
        query = query.or(`license_plate.ilike.%${term}%,name.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      const emptyResult = emptyListIfUnavailable(error);
      if (emptyResult) return emptyResult;
      return { success: false, error: mapSupabaseError(error, 'Error al cargar vehículos.') };
    }
  },

  async saveVehicle(vehicle) {
    const licensePlate = normalizeLicensePlate(vehicle.license_plate);
    if (!licensePlate) return { success: false, error: 'La patente es obligatoria.' };

    const payload = {
      license_plate: licensePlate,
      name: vehicle.name?.trim() || null,
      vehicle_type: vehicle.vehicle_type || 'utilitario',
      brand: vehicle.brand?.trim() || null,
      model: vehicle.model?.trim() || null,
      year: vehicle.year ? Number(vehicle.year) : null,
      assigned_driver_id: vehicle.assigned_driver_id || null,
      registration_expires_at: vehicle.registration_expires_at || null,
      insurance_expires_at: vehicle.insurance_expires_at || null,
      inspection_expires_at: vehicle.inspection_expires_at || null,
      status: vehicle.status || 'activo',
      notes: vehicle.notes?.trim() || null,
    };

    try {
      const request = vehicle.id
        ? supabase.from('vehicles').update(payload).eq('id', vehicle.id)
        : supabase.from('vehicles').insert([payload]);

      const { data, error } = await request.select().single();
      if (error) throw error;
      return { success: true, data, message: vehicle.id ? 'Vehículo actualizado.' : 'Vehículo creado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo guardar el vehículo.') };
    }
  },

  async deleteVehicle(id) {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Vehículo eliminado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo eliminar el vehículo.') };
    }
  },

  async getPlantAssets({ search = '' } = {}) {
    try {
      let query = supabase
        .from('plant_assets')
        .select('*, responsible_user:responsible_user_id(id, full_name, email)')
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      const term = search.trim();
      if (term) {
        query = query.or(`name.ilike.%${term}%,category.ilike.%${term}%,location_description.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      const emptyResult = emptyListIfUnavailable(error);
      if (emptyResult) return emptyResult;
      return { success: false, error: mapSupabaseError(error, 'Error al cargar planta.') };
    }
  },

  async savePlantAsset(asset) {
    if (!asset.name?.trim()) return { success: false, error: 'El nombre es obligatorio.' };
    if (!PLANT_CATEGORIES.includes(asset.category)) return { success: false, error: 'La categoría de planta no es válida.' };

    const payload = {
      name: asset.name.trim(),
      category: asset.category,
      location_description: asset.location_description?.trim() || null,
      status: asset.status || 'activo',
      responsible_user_id: asset.responsible_user_id || null,
      notes: asset.notes?.trim() || null,
    };

    try {
      const request = asset.id
        ? supabase.from('plant_assets').update(payload).eq('id', asset.id)
        : supabase.from('plant_assets').insert([payload]);

      const { data, error } = await request.select().single();
      if (error) throw error;
      return { success: true, data, message: asset.id ? 'Elemento de planta actualizado.' : 'Elemento de planta creado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo guardar el elemento de planta.') };
    }
  },

  async deletePlantAsset(id) {
    try {
      const { error } = await supabase
        .from('plant_assets')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Elemento de planta eliminado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo eliminar el elemento de planta.') };
    }
  },

  async getAssignableUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .is('deleted_at', null)
        .in('role', ['chofer', 'admin', 'user', 'solicitante', 'trabajador'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'Error al cargar usuarios asignables.') };
    }
  },
};
