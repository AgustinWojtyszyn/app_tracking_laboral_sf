import { supabase } from '@/lib/customSupabaseClient';

export const VEHICLE_STATUS = ['activo', 'mantenimiento', 'fuera_servicio'];
export const VEHICLE_TYPES = ['utilitario', 'camion', 'auto', 'moto', 'otro'];
export const VEHICLE_LICENSE_PLATE_MAX_LENGTH = 10;
export const VEHICLE_MILEAGE_MAX_DIGITS = 9;
export const VEHICLE_MILEAGE_MAX_VALUE = 999999999;
export const FUEL_AMOUNT_MAX_VALUE = 999999999.99;
export const VEHICLE_MAINTENANCE_TYPES = ['preventivo', 'correctivo'];
export const VEHICLE_MAINTENANCE_PRIORITIES = ['baja', 'media', 'alta'];
export const VEHICLE_MAINTENANCE_REQUEST_STATUSES = ['pendiente', 'en_revision', 'programado', 'realizado', 'cancelado'];
export const VEHICLE_DOCUMENT_TYPES = ['seguro', 'rto', 'licencia', 'otro'];
export const VEHICLE_DOCUMENT_STATUSES = ['vigente', 'proximo_a_vencer', 'vencido'];
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUuid = (value) => UUID_PATTERN.test(String(value || ''));

const isValidDateInput = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const isValidTimeInput = (value) => {
  if (value === null || value === undefined || value === '') return true;
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(value));
};

const isActiveDriverId = async (driverId) => {
  if (!isValidUuid(driverId)) return false;
  const { data, error } = await supabase
    .from('drivers')
    .select('id')
    .eq('id', driverId)
    .eq('is_active', true)
    .is('archived_at', null)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
};

const vehicleFuelLoadSelect = `
  *,
  vehicle:vehicles!vehicle_fuel_loads_vehicle_id_fkey (
    id,
    license_plate,
    name,
    brand,
    model,
    assigned_driver_profile_id,
    assigned_driver_profile:drivers!vehicles_assigned_driver_profile_id_fkey(id, name, is_active, archived_at)
  )
`;

const fuelEventTimestamp = (load) => {
  const parsed = new Date(`${load.load_date || ''}T${load.estimated_time || '00:00:00'}`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const withFuelMetrics = (loads = []) => {
  const byVehicle = new Map();
  [...loads]
    .sort((a, b) => fuelEventTimestamp(a) - fuelEventTimestamp(b))
    .forEach((load) => {
      const vehicleLoads = byVehicle.get(load.vehicle_id) || [];
      const previous = [...vehicleLoads].reverse().find((item) => (
        item.mileage !== null
        && item.mileage !== undefined
        && Number(load.mileage) > Number(item.mileage)
      ));
      let metrics = {
        previous_mileage: null,
        kilometers_since_previous: null,
        consumption_liters_per_100km: null,
        cost_per_km: null,
        has_consumption_metrics: false,
      };

      if (previous && load.mileage !== null && load.mileage !== undefined) {
        const kilometers = Number(load.mileage) - Number(previous.mileage);
        const liters = Number(load.liters);
        const price = Number(load.price_ars);
        if (Number.isFinite(kilometers) && kilometers > 0 && Number.isFinite(liters) && Number.isFinite(price)) {
          metrics = {
            previous_mileage: Number(previous.mileage),
            kilometers_since_previous: kilometers,
            consumption_liters_per_100km: (liters / kilometers) * 100,
            cost_per_km: price / kilometers,
            has_consumption_metrics: true,
          };
        }
      }

      Object.assign(load, metrics);
      vehicleLoads.push(load);
      byVehicle.set(load.vehicle_id, vehicleLoads);
    });

  return loads;
};

const mapSupabaseError = (error, fallback) => {
  if (error?.code === 'PGRST204') return `La estructura de la tabla no está actualizada: ${error?.message || ''}`.trim();
  if (error?.code === '23505') return 'Ya existe un vehículo con esa patente.';
  if (error?.code === '23502') return `Falta un dato obligatorio para guardar el registro: ${error?.details || error?.message || ''}`.trim();
  if (error?.code === '23503') return 'El vehículo o usuario asociado no existe o no está disponible.';
  if (error?.code === '23514') return `Algún valor no cumple las reglas de la base de datos: ${error?.details || error?.message || ''}`.trim();
  if (error?.code === '42501' || /row-level security|permission denied/i.test(error?.message || '')) {
    return 'No tenés permisos para realizar esta acción.';
  }
  return fallback;
};

const logFuelLoadPayload = () => {};

const logFuelLoadError = (error, payload) => {
  console.error('Error al crear carga de combustible JSON', JSON.stringify({
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    vehicle_id: payload?.vehicle_id || null,
  }, null, 2));
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
        .select('*, assigned_driver:assigned_driver_id(id, full_name, email), assigned_driver_profile:assigned_driver_profile_id(id, name, phone, notes, is_active, archived_at)')
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
      if (!vehicle.id && payload.assigned_driver_profile_id && !(await isActiveDriverId(payload.assigned_driver_profile_id))) {
        return { success: false, error: 'Seleccioná un chofer activo.' };
      }

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
        .select('id, name, phone, notes, is_active, archived_at, created_at, updated_at')
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

  async reactivateDriver(id) {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ is_active: true, archived_at: null })
        .eq('id', id);

      if (error) throw error;
      return { success: true, message: 'Chofer reactivado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo reactivar el chofer.') };
    }
  },

  async getFuelLoads() {
    try {
      const { data, error } = await supabase
        .from('vehicle_fuel_loads')
        .select(vehicleFuelLoadSelect)
        .order('load_date', { ascending: false })
        .order('estimated_time', { ascending: false });

      if (error) throw error;
      return { success: true, data: withFuelMetrics(data || []) };
    } catch (error) {
      const emptyResult = emptyListIfUnavailable(error);
      if (emptyResult) return emptyResult;
      return { success: false, error: mapSupabaseError(error, 'Error al cargar combustible.') };
    }
  },

  async saveFuelLoad(fuelLoad) {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id || null;
    const vehicleId = fuelLoad.vehicle_id || '';
    const priceArs = fuelLoad.price_ars;
    const litersValue = fuelLoad.liters;
    const mileage = fuelLoad.mileage;
    const loadDate = fuelLoad.load_date || '';
    const estimatedTime = fuelLoad.estimated_time;
    const notes = fuelLoad.notes;
    const normalizedMileage =
      mileage === '' || mileage === null || mileage === undefined
        ? null
        : Number(mileage);
    const normalizedTime =
      typeof estimatedTime === 'string' && estimatedTime.trim()
        ? estimatedTime.trim()
        : null;

    const payload = {
      vehicle_id: vehicleId || null,
      price_ars: Number(priceArs),
      load_date: loadDate || null,
      estimated_time: normalizedTime,
      liters: Number(litersValue),
      mileage: normalizedMileage,
      notes: notes?.trim() || null,
      created_by: currentUserId,
    };

    if (!isValidUuid(vehicleId)) return { success: false, error: 'Seleccioná un vehículo válido.' };
    if (!isValidUuid(currentUserId)) return { success: false, error: 'No se pudo identificar el usuario autenticado.' };
    if (!loadDate || !isValidDateInput(loadDate)) return { success: false, error: 'La fecha de carga debe ser válida.' };
    if (!isValidTimeInput(payload.estimated_time)) return { success: false, error: 'La hora estimada debe ser válida.' };
    if (!Number.isFinite(payload.price_ars) || payload.price_ars <= 0 || payload.price_ars > FUEL_AMOUNT_MAX_VALUE) {
      return { success: false, error: 'El precio debe ser un importe válido en pesos.' };
    }
    if (!Number.isFinite(payload.liters) || payload.liters <= 0 || payload.liters > FUEL_AMOUNT_MAX_VALUE) {
      return { success: false, error: 'Los litros deben ser un número válido.' };
    }
    if (
      payload.mileage !== null
      && (!Number.isInteger(payload.mileage) || payload.mileage < 0 || payload.mileage > 999999999)
    ) {
      return { success: false, error: `El kilometraje debe ser numérico y de hasta ${VEHICLE_MILEAGE_MAX_DIGITS} dígitos.` };
    }

    try {
      const { data: vehicleExists, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('id', vehicleId)
        .maybeSingle();

      if (vehicleError) throw vehicleError;
      if (!vehicleExists) return { success: false, error: 'El vehículo seleccionado no existe o no está disponible.' };

      logFuelLoadPayload(payload);

      const request = fuelLoad.id
        ? supabase.from('vehicle_fuel_loads').update(payload).eq('id', fuelLoad.id)
        : supabase.from('vehicle_fuel_loads').insert(payload);

      const { data, error } = await request.select('*').single();

      if (error) {
        logFuelLoadError(error, payload);
        throw error;
      }
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

  async getVehicleRoutes() {
    try {
      const { data, error } = await supabase
        .from('vehicle_daily_routes')
        .select('*, vehicle:vehicles!vehicle_daily_routes_vehicle_id_fkey(id, license_plate, name, brand, model), driver:drivers!vehicle_daily_routes_driver_id_fkey(id, name, is_active, archived_at)')
        .order('route_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      const emptyResult = emptyListIfUnavailable(error);
      if (emptyResult) return emptyResult;
      return { success: false, error: mapSupabaseError(error, 'Error al cargar recorridos.') };
    }
  },

  async saveVehicleRoute(route) {
    if (!isValidUuid(route.vehicle_id)) return { success: false, error: 'Seleccioná un vehículo válido.' };
    if (!isValidUuid(route.driver_id)) return { success: false, error: 'Seleccioná un chofer válido.' };
    if (!isValidDateInput(route.route_date)) return { success: false, error: 'La fecha del recorrido debe ser válida.' };

    const mileageStart = normalizeMileage(route.mileage_start);
    const mileageEnd = normalizeMileage(route.mileage_end);
    if (Number.isNaN(mileageStart) || Number.isNaN(mileageEnd) || mileageStart === null || mileageEnd === null) {
      return { success: false, error: `Los kilometrajes deben ser numéricos y de hasta ${VEHICLE_MILEAGE_MAX_DIGITS} dígitos.` };
    }
    if (mileageStart < 0 || mileageEnd < 0) return { success: false, error: 'Los kilometrajes no pueden ser negativos.' };
    if (mileageEnd < mileageStart) return { success: false, error: 'El kilometraje final no puede ser menor que el inicial.' };

    const visitedPlaces = Array.isArray(route.visited_places)
      ? route.visited_places.map((place) => String(place || '').trim()).filter(Boolean)
      : [];
    if (visitedPlaces.length === 0) return { success: false, error: 'Seleccioná al menos una empresa o lugar visitado.' };

    const payload = {
      vehicle_id: route.vehicle_id,
      driver_id: route.driver_id,
      route_date: route.route_date,
      mileage_start: mileageStart,
      mileage_end: mileageEnd,
      visited_places: visitedPlaces,
      observations: route.observations?.trim() || null,
    };

    try {
      if (!route.id && !(await isActiveDriverId(route.driver_id))) {
        return { success: false, error: 'Seleccioná un chofer activo.' };
      }

      const request = route.id
        ? supabase.from('vehicle_daily_routes').update(payload).eq('id', route.id)
        : supabase.from('vehicle_daily_routes').insert([payload]);
      const { data, error } = await request
        .select('*, vehicle:vehicles!vehicle_daily_routes_vehicle_id_fkey(id, license_plate, name, brand, model), driver:drivers!vehicle_daily_routes_driver_id_fkey(id, name, is_active, archived_at)')
        .single();
      if (error) throw error;
      return { success: true, data, message: route.id ? 'Recorrido actualizado.' : 'Recorrido registrado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo guardar el recorrido.') };
    }
  },

  async deleteVehicleRoute(id) {
    try {
      const { error } = await supabase.from('vehicle_daily_routes').delete().eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Recorrido eliminado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo eliminar el recorrido.') };
    }
  },

  async getMaintenanceRequests() {
    try {
      const { data, error } = await supabase
        .from('vehicle_maintenance_requests')
        .select('*, vehicle:vehicles!vehicle_maintenance_requests_vehicle_id_fkey(id, license_plate, name, brand, model), driver:drivers!vehicle_maintenance_requests_driver_id_fkey(id, name, is_active, archived_at)')
        .order('request_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      const emptyResult = emptyListIfUnavailable(error);
      if (emptyResult) return emptyResult;
      return { success: false, error: mapSupabaseError(error, 'Error al cargar avisos de mantenimiento.') };
    }
  },

  async saveMaintenanceRequest(request) {
    if (!isValidUuid(request.vehicle_id)) return { success: false, error: 'Seleccioná un vehículo válido.' };
    if (!isValidUuid(request.driver_id)) return { success: false, error: 'Seleccioná un chofer válido.' };
    if (!isValidDateInput(request.request_date)) return { success: false, error: 'La fecha debe ser válida.' };
    if (!request.issue_type?.trim()) return { success: false, error: 'Indicá el tipo de mantenimiento o problema.' };
    if (!request.description?.trim()) return { success: false, error: 'La descripción del problema es obligatoria.' };
    if (!VEHICLE_MAINTENANCE_PRIORITIES.includes(request.priority)) return { success: false, error: 'Seleccioná una prioridad válida.' };
    if (!VEHICLE_MAINTENANCE_REQUEST_STATUSES.includes(request.status)) return { success: false, error: 'Seleccioná un estado válido.' };

    const mileage = normalizeMileage(request.current_mileage);
    if (Number.isNaN(mileage) || (mileage !== null && mileage < 0)) {
      return { success: false, error: `El kilometraje debe ser numérico y de hasta ${VEHICLE_MILEAGE_MAX_DIGITS} dígitos.` };
    }
    if (request.resolved_at && !isValidDateInput(request.resolved_at)) {
      return { success: false, error: 'La fecha de resolución debe ser válida.' };
    }

    const payload = {
      vehicle_id: request.vehicle_id,
      driver_id: request.driver_id,
      request_date: request.request_date,
      issue_type: request.issue_type.trim(),
      description: request.description.trim(),
      current_mileage: mileage,
      priority: request.priority,
      status: request.status,
      admin_notes: request.admin_notes?.trim() || null,
      resolved_at: request.resolved_at || null,
    };

    try {
      if (!request.id && !(await isActiveDriverId(request.driver_id))) {
        return { success: false, error: 'Seleccioná un chofer activo.' };
      }

      const dbRequest = request.id
        ? supabase.from('vehicle_maintenance_requests').update(payload).eq('id', request.id)
        : supabase.from('vehicle_maintenance_requests').insert([payload]);
      const { data, error } = await dbRequest
        .select('*, vehicle:vehicles!vehicle_maintenance_requests_vehicle_id_fkey(id, license_plate, name, brand, model), driver:drivers!vehicle_maintenance_requests_driver_id_fkey(id, name, is_active, archived_at)')
        .single();
      if (error) throw error;
      return { success: true, data, message: request.id ? 'Aviso de mantenimiento actualizado.' : 'Aviso de mantenimiento registrado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo guardar el aviso de mantenimiento.') };
    }
  },

  async deleteMaintenanceRequest(id) {
    try {
      const { error } = await supabase.from('vehicle_maintenance_requests').delete().eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Aviso de mantenimiento eliminado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo eliminar el aviso de mantenimiento.') };
    }
  },

  async getDocumentExpirations() {
    try {
      const { data, error } = await supabase
        .from('vehicle_document_expirations')
        .select('*, vehicle:vehicles!vehicle_document_expirations_vehicle_id_fkey(id, license_plate, name, brand, model), driver:drivers!vehicle_document_expirations_driver_id_fkey(id, name, is_active, archived_at)')
        .order('expires_at', { ascending: true });
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      const emptyResult = emptyListIfUnavailable(error);
      if (emptyResult) return emptyResult;
      return { success: false, error: mapSupabaseError(error, 'Error al cargar vencimientos.') };
    }
  },

  async saveDocumentExpiration(expiration) {
    if (!VEHICLE_DOCUMENT_TYPES.includes(expiration.document_type)) return { success: false, error: 'Seleccioná un tipo de documento válido.' };
    if (!expiration.vehicle_id && !expiration.driver_id) return { success: false, error: 'Asociá el vencimiento a un vehículo o chofer.' };
    if (expiration.vehicle_id && expiration.driver_id) {
      return { success: false, error: 'El vencimiento debe pertenecer a un vehículo o a un chofer, pero no a ambos.' };
    }
    if (expiration.vehicle_id && !isValidUuid(expiration.vehicle_id)) return { success: false, error: 'Seleccioná un vehículo válido.' };
    if (expiration.driver_id && !isValidUuid(expiration.driver_id)) return { success: false, error: 'Seleccioná un chofer válido.' };
    if (!isValidDateInput(expiration.expires_at)) return { success: false, error: 'La fecha de vencimiento debe ser válida.' };
    if (!VEHICLE_DOCUMENT_STATUSES.includes(expiration.status)) return { success: false, error: 'Seleccioná un estado válido.' };

    const payload = {
      document_type: expiration.document_type,
      custom_document_name: expiration.custom_document_name?.trim() || null,
      vehicle_id: expiration.vehicle_id || null,
      driver_id: expiration.driver_id || null,
      expires_at: expiration.expires_at,
      observations: expiration.observations?.trim() || null,
      status: expiration.status,
    };

    try {
      if (!expiration.id && expiration.driver_id && !(await isActiveDriverId(expiration.driver_id))) {
        return { success: false, error: 'Seleccioná un chofer activo.' };
      }

      const request = expiration.id
        ? supabase.from('vehicle_document_expirations').update(payload).eq('id', expiration.id)
        : supabase.from('vehicle_document_expirations').insert([payload]);
      const { data, error } = await request
        .select('*, vehicle:vehicles!vehicle_document_expirations_vehicle_id_fkey(id, license_plate, name, brand, model), driver:drivers!vehicle_document_expirations_driver_id_fkey(id, name, is_active, archived_at)')
        .single();
      if (error) throw error;
      return { success: true, data, message: expiration.id ? 'Vencimiento actualizado.' : 'Vencimiento registrado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo guardar el vencimiento.') };
    }
  },

  async deleteDocumentExpiration(id) {
    try {
      const { error } = await supabase.from('vehicle_document_expirations').delete().eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Vencimiento eliminado.' };
    } catch (error) {
      return { success: false, error: mapSupabaseError(error, 'No se pudo eliminar el vencimiento.') };
    }
  },
};
