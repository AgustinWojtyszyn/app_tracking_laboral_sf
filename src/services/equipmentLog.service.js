import { supabase } from '@/lib/customSupabaseClient';

export const VEHICLE_STATUS = ['activo', 'mantenimiento', 'fuera_servicio'];
export const VEHICLE_TYPES = ['utilitario', 'camion', 'auto', 'moto', 'otro'];
export const VEHICLE_LICENSE_PLATE_MAX_LENGTH = 10;
export const VEHICLE_MILEAGE_MAX_DIGITS = 9;
export const VEHICLE_MILEAGE_MAX_VALUE = 999999999;
export const FUEL_AMOUNT_MAX_VALUE = 999999999.99;
export const VEHICLE_MAINTENANCE_TYPES = ['preventivo', 'correctivo'];
export const EQUIPMENT_RECORD_TARGET_TYPES = ['vehicle', 'plant_asset'];
export const EQUIPMENT_INSPECTION_TYPES = ['preventiva', 'predictiva', 'calibracion'];
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

const normalizeMileage = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const rawMileage = String(value).trim();
  if (!/^\d+$/.test(rawMileage)) return NaN;
  if (rawMileage.length > VEHICLE_MILEAGE_MAX_DIGITS) return NaN;
  return Number(rawMileage);
};

const normalizeVehicleYear = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const rawYear = String(value).trim();
  if (!/^\d{4}$/.test(rawYear)) return NaN;
  return Number(rawYear);
};

const normalizeDecimal = (value) => {
  if (value === '' || value === null || value === undefined) return NaN;
  const rawValue = String(value).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(rawValue)) return NaN;
  return Number(rawValue);
};

const mapSupabaseError = (error, fallback) => {
  if (error?.code === '23505') return 'Ya existe un vehículo con esa patente.';
  if (error?.code === '42501' || /row-level security|permission denied/i.test(error?.message || '')) {
    return 'No tenés permisos para realizar esta acción.';
  }
  return fallback;
};

const buildEquipmentRecordPayload = (record) => {
  const targetType = record.target_type;
  const targetId = record.target_id;
  return {
    vehicle_id: targetType === 'vehicle' && targetId ? targetId : null,
    plant_asset_id: targetType === 'plant_asset' && targetId ? targetId : null,
    equipment_name: record.equipment_name?.trim() || null,
  };
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
        .select('*, assigned_driver:assigned_driver_id(id, full_name, email), assigned_driver_profile:assigned_driver_profile_id(id, name, phone, notes, user_id)')
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
    if (licensePlate.length > VEHICLE_LICENSE_PLATE_MAX_LENGTH) {
      return { success: false, error: `La patente no puede superar ${VEHICLE_LICENSE_PLATE_MAX_LENGTH} caracteres.` };
    }

    const mileageStart = normalizeMileage(vehicle.mileage_start);
    const mileageEnd = normalizeMileage(vehicle.mileage_end);
    if (Number.isNaN(mileageStart) || Number.isNaN(mileageEnd)) {
      return { success: false, error: `El kilometraje debe ser numérico y de hasta ${VEHICLE_MILEAGE_MAX_DIGITS} dígitos.` };
    }
    if (
      (mileageStart !== null && (mileageStart < 0 || mileageStart > VEHICLE_MILEAGE_MAX_VALUE))
      || (mileageEnd !== null && (mileageEnd < 0 || mileageEnd > VEHICLE_MILEAGE_MAX_VALUE))
    ) {
      return { success: false, error: `El kilometraje debe estar entre 0 y ${VEHICLE_MILEAGE_MAX_VALUE}.` };
    }
    if (mileageStart !== null && mileageEnd !== null && mileageEnd <= mileageStart) {
      return { success: false, error: 'El kilometraje al terminar la jornada debe ser SIEMPRE SUPERIOR al iniciar.' };
    }

    const currentYear = new Date().getFullYear();
    const year = normalizeVehicleYear(vehicle.year);
    if (Number.isNaN(year) || (year !== null && (year <= 1950 || year > currentYear))) {
      return { success: false, error: `Año: 4 dígitos, mayor a 1950 y máximo ${currentYear}.` };
    }

    const payload = {
      license_plate: licensePlate,
      name: vehicle.name?.trim() || null,
      vehicle_type: vehicle.vehicle_type || 'utilitario',
      brand: vehicle.brand?.trim() || null,
      model: vehicle.model?.trim() || null,
      year,
      assigned_driver_profile_id: vehicle.assigned_driver_profile_id || null,
      registration_expires_at: vehicle.registration_expires_at || null,
      insurance_expires_at: vehicle.insurance_expires_at || null,
      inspection_expires_at: vehicle.inspection_expires_at || null,
      mileage_start: mileageStart,
      mileage_end: mileageEnd,
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

  async archiveVehicle(id) {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          status: 'inactivo',
          archived_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Vehículo eliminado del listado activo.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo eliminar el vehículo.') };
    }
  },

  async deleteVehicle(id) {
    return this.archiveVehicle(id);
  },

  async deactivateVehicle(id) {
    return this.archiveVehicle(id);
  },

  async getDrivers({ activeOnly = true } = {}) {
    try {
      let query = supabase
        .from('drivers')
        .select('id, name, phone, notes, user_id, is_active, archived_at, created_at, updated_at')
        .order('name', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true).is('archived_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      const emptyResult = emptyListIfUnavailable(error);
      if (emptyResult) return emptyResult;
      return { success: false, error: mapSupabaseError(error, 'Error al cargar choferes.') };
    }
  },

  async createDriver(payload) {
    const name = payload.name?.trim();
    if (!name) return { success: false, error: 'El nombre del chofer es obligatorio.' };

    try {
      const { data, error } = await supabase
        .from('drivers')
        .insert([{
          name,
          phone: payload.phone?.trim() || null,
          notes: payload.notes?.trim() || null,
          is_active: true,
          archived_at: null,
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Chofer creado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo crear el chofer.') };
    }
  },

  async updateDriver(id, payload) {
    const name = payload.name?.trim();
    if (!name) return { success: false, error: 'El nombre del chofer es obligatorio.' };

    try {
      const { data, error } = await supabase
        .from('drivers')
        .update({
          name,
          phone: payload.phone?.trim() || null,
          notes: payload.notes?.trim() || null,
          is_active: payload.is_active ?? true,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Chofer actualizado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo actualizar el chofer.') };
    }
  },

  async archiveDriver(id) {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ is_active: false, archived_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { success: true, message: 'Chofer desactivado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo desactivar el chofer.') };
    }
  },

  async linkDriverToUser(driverId, userId) {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .update({ user_id: userId || null })
        .eq('id', driverId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Chofer vinculado al usuario.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo vincular el chofer al usuario.') };
    }
  },

  async getFuelLoads() {
    try {
      const { data, error } = await supabase
        .from('vehicle_fuel_loads')
        .select('*, vehicle:vehicle_id(id, license_plate, name, brand, model)')
        .order('load_date', { ascending: false })
        .order('estimated_time', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      const emptyResult = emptyListIfUnavailable(error);
      if (emptyResult) return emptyResult;
      return { success: false, error: mapSupabaseError(error, 'Error al cargar combustible.') };
    }
  },

  async saveFuelLoad(fuelLoad) {
    if (!fuelLoad.vehicle_id) return { success: false, error: 'Seleccioná un vehículo.' };
    if (!fuelLoad.load_date) return { success: false, error: 'La fecha de carga es obligatoria.' };
    if (!fuelLoad.estimated_time) return { success: false, error: 'La hora estimada es obligatoria.' };

    const priceArs = normalizeDecimal(fuelLoad.price_ars);
    if (Number.isNaN(priceArs) || priceArs <= 0 || priceArs > FUEL_AMOUNT_MAX_VALUE) {
      return { success: false, error: 'El precio debe ser un importe válido en pesos.' };
    }

    const liters = normalizeDecimal(fuelLoad.liters);
    if (Number.isNaN(liters) || liters <= 0 || liters > FUEL_AMOUNT_MAX_VALUE) {
      return { success: false, error: 'Los litros deben ser un número válido.' };
    }

    const mileage = normalizeMileage(fuelLoad.mileage);
    if (Number.isNaN(mileage) || mileage === null) {
      return { success: false, error: `El kilometraje debe ser numérico y de hasta ${VEHICLE_MILEAGE_MAX_DIGITS} dígitos.` };
    }

    const payload = {
      vehicle_id: fuelLoad.vehicle_id,
      price_ars: priceArs,
      load_date: fuelLoad.load_date,
      estimated_time: fuelLoad.estimated_time,
      liters,
      mileage,
      notes: fuelLoad.notes?.trim() || null,
    };

    try {
      const request = fuelLoad.id
        ? supabase.from('vehicle_fuel_loads').update(payload).eq('id', fuelLoad.id)
        : supabase.from('vehicle_fuel_loads').insert([payload]);

      const { data, error } = await request.select('*, vehicle:vehicle_id(id, license_plate, name, brand, model)').single();

      if (error) throw error;
      return { success: true, data, message: fuelLoad.id ? 'Carga de combustible actualizada.' : 'Carga de combustible registrada.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo guardar la carga de combustible.') };
    }
  },

  async deleteFuelLoad(id) {
    try {
      const { error } = await supabase
        .from('vehicle_fuel_loads')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Carga de combustible eliminada.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo eliminar la carga de combustible.') };
    }
  },

  async getMaintenanceLogs() {
    try {
      const { data, error } = await supabase
        .from('vehicle_maintenance_logs')
        .select('*, vehicle:vehicle_id(id, license_plate, name, brand, model)')
        .order('maintenance_date', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      const emptyResult = emptyListIfUnavailable(error);
      if (emptyResult) return emptyResult;
      return { success: false, error: mapSupabaseError(error, 'Error al cargar mantenimientos.') };
    }
  },

  async saveMaintenanceLog(maintenanceLog) {
    if (!maintenanceLog.vehicle_id) return { success: false, error: 'Seleccioná un vehículo.' };
    if (!VEHICLE_MAINTENANCE_TYPES.includes(maintenanceLog.maintenance_type)) {
      return { success: false, error: 'Seleccioná un tipo de mantenimiento válido.' };
    }
    if (!maintenanceLog.maintenance_date) return { success: false, error: 'La fecha es obligatoria.' };
    if (!maintenanceLog.detail?.trim()) return { success: false, error: 'El detalle es obligatorio.' };

    const mileage = normalizeMileage(maintenanceLog.mileage);
    if (Number.isNaN(mileage) || mileage === null) {
      return { success: false, error: `El kilometraje debe ser numérico y de hasta ${VEHICLE_MILEAGE_MAX_DIGITS} dígitos.` };
    }

    const valueArs = maintenanceLog.value_ars === '' || maintenanceLog.value_ars === null || maintenanceLog.value_ars === undefined
      ? null
      : normalizeDecimal(maintenanceLog.value_ars);
    if (Number.isNaN(valueArs) || (valueArs !== null && (valueArs < 0 || valueArs > FUEL_AMOUNT_MAX_VALUE))) {
      return { success: false, error: 'El valor debe ser un importe válido en pesos.' };
    }

    const payload = {
      vehicle_id: maintenanceLog.vehicle_id,
      maintenance_type: maintenanceLog.maintenance_type,
      maintenance_date: maintenanceLog.maintenance_date,
      detail: maintenanceLog.detail.trim(),
      mileage,
      value_ars: valueArs,
      next_control_date: maintenanceLog.next_control_date || null,
      notes: maintenanceLog.notes?.trim() || null,
    };

    try {
      const request = maintenanceLog.id
        ? supabase.from('vehicle_maintenance_logs').update(payload).eq('id', maintenanceLog.id)
        : supabase.from('vehicle_maintenance_logs').insert([payload]);

      const { data, error } = await request.select('*, vehicle:vehicle_id(id, license_plate, name, brand, model)').single();

      if (error) throw error;
      return { success: true, data, message: maintenanceLog.id ? 'Mantenimiento actualizado.' : 'Mantenimiento registrado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo guardar el mantenimiento.') };
    }
  },

  async deleteMaintenanceLog(id) {
    try {
      const { error } = await supabase
        .from('vehicle_maintenance_logs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Mantenimiento eliminado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo eliminar el mantenimiento.') };
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

  async archivePlantAsset(id) {
    try {
      const { error } = await supabase
        .from('plant_assets')
        .update({
          status: 'inactivo',
          archived_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Elemento de planta eliminado del listado activo.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo eliminar el elemento de planta.') };
    }
  },

  async deletePlantAsset(id) {
    return this.archivePlantAsset(id);
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

  async getDailyOperations() {
    try {
      const { data, error } = await supabase
        .from('equipment_daily_operations')
        .select('*, vehicle:vehicle_id(id, license_plate, name, brand, model), plant_asset:plant_asset_id(id, name, category, location_description)')
        .order('operation_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      const emptyResult = emptyListIfUnavailable(error);
      if (emptyResult) return emptyResult;
      return { success: false, error: mapSupabaseError(error, 'Error al cargar operaciones diarias.') };
    }
  },

  async saveDailyOperation(record) {
    if (!record.operation_date) return { success: false, error: 'La fecha es obligatoria.' };
    if (!record.shift?.trim()) return { success: false, error: 'El turno es obligatorio.' };
    if (!record.usage_time?.trim()) return { success: false, error: 'El tiempo de uso es obligatorio.' };
    if (!record.operator_name?.trim()) return { success: false, error: 'El operador es obligatorio.' };

    const payload = {
      ...buildEquipmentRecordPayload(record),
      operation_date: record.operation_date,
      shift: record.shift.trim(),
      usage_time: record.usage_time.trim(),
      operator_name: record.operator_name.trim(),
      observations: record.observations?.trim() || null,
    };

    try {
      const request = record.id
        ? supabase.from('equipment_daily_operations').update(payload).eq('id', record.id)
        : supabase.from('equipment_daily_operations').insert([payload]);

      const { data, error } = await request
        .select('*, vehicle:vehicle_id(id, license_plate, name, brand, model), plant_asset:plant_asset_id(id, name, category, location_description)')
        .single();
      if (error) throw error;
      return { success: true, data, message: record.id ? 'Operación diaria actualizada.' : 'Operación diaria registrada.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo guardar la operación diaria.') };
    }
  },

  async deleteDailyOperation(id) {
    try {
      const { error } = await supabase.from('equipment_daily_operations').delete().eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Operación diaria eliminada.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo eliminar la operación diaria.') };
    }
  },

  async getIncidents() {
    try {
      const { data, error } = await supabase
        .from('equipment_incidents')
        .select('*, vehicle:vehicle_id(id, license_plate, name, brand, model), plant_asset:plant_asset_id(id, name, category, location_description)')
        .order('incident_date', { ascending: false })
        .order('incident_time', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      const emptyResult = emptyListIfUnavailable(error);
      if (emptyResult) return emptyResult;
      return { success: false, error: mapSupabaseError(error, 'Error al cargar incidencias.') };
    }
  },

  async saveIncident(record) {
    if (!record.incident_date) return { success: false, error: 'La fecha es obligatoria.' };
    if (!record.anomaly_description?.trim()) return { success: false, error: 'La anomalía es obligatoria.' };
    if (!record.corrective_action?.trim()) return { success: false, error: 'La acción correctiva es obligatoria.' };

    const payload = {
      ...buildEquipmentRecordPayload(record),
      incident_date: record.incident_date,
      incident_time: record.incident_time || null,
      anomaly_description: record.anomaly_description.trim(),
      corrective_action: record.corrective_action.trim(),
      downtime: record.downtime?.trim() || null,
      maintenance_done_by: record.maintenance_done_by?.trim() || null,
      observations: record.observations?.trim() || null,
    };

    try {
      const request = record.id
        ? supabase.from('equipment_incidents').update(payload).eq('id', record.id)
        : supabase.from('equipment_incidents').insert([payload]);

      const { data, error } = await request
        .select('*, vehicle:vehicle_id(id, license_plate, name, brand, model), plant_asset:plant_asset_id(id, name, category, location_description)')
        .single();
      if (error) throw error;
      return { success: true, data, message: record.id ? 'Incidencia actualizada.' : 'Incidencia registrada.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo guardar la incidencia.') };
    }
  },

  async deleteIncident(id) {
    try {
      const { error } = await supabase.from('equipment_incidents').delete().eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Incidencia eliminada.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo eliminar la incidencia.') };
    }
  },

  async getMaintenanceChecks() {
    try {
      const { data, error } = await supabase
        .from('equipment_maintenance_checks')
        .select('*, vehicle:vehicle_id(id, license_plate, name, brand, model), plant_asset:plant_asset_id(id, name, category, location_description)')
        .order('review_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      const emptyResult = emptyListIfUnavailable(error);
      if (emptyResult) return emptyResult;
      return { success: false, error: mapSupabaseError(error, 'Error al cargar revisiones.') };
    }
  },

  async saveMaintenanceCheck(record) {
    if (!record.review_date) return { success: false, error: 'La fecha de revisión es obligatoria.' };
    if (!EQUIPMENT_INSPECTION_TYPES.includes(record.inspection_type)) return { success: false, error: 'Seleccioná un tipo de inspección válido.' };
    if (!record.reviewed_component?.trim()) return { success: false, error: 'El componente revisado es obligatorio.' };
    if (!record.next_review_date) return { success: false, error: 'La próxima fecha de revisión es obligatoria.' };

    const payload = {
      ...buildEquipmentRecordPayload(record),
      review_date: record.review_date,
      inspection_type: record.inspection_type,
      reviewed_component: record.reviewed_component.trim(),
      general_status_observations: record.general_status_observations?.trim() || null,
      next_review_date: record.next_review_date,
    };

    try {
      const request = record.id
        ? supabase.from('equipment_maintenance_checks').update(payload).eq('id', record.id)
        : supabase.from('equipment_maintenance_checks').insert([payload]);

      const { data, error } = await request
        .select('*, vehicle:vehicle_id(id, license_plate, name, brand, model), plant_asset:plant_asset_id(id, name, category, location_description)')
        .single();
      if (error) throw error;
      return { success: true, data, message: record.id ? 'Revisión actualizada.' : 'Revisión registrada.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo guardar la revisión.') };
    }
  },

  async deleteMaintenanceCheck(id) {
    try {
      const { error } = await supabase.from('equipment_maintenance_checks').delete().eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Revisión eliminada.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo eliminar la revisión.') };
    }
  },
};
