import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Ban, BookOpen, Building2, CalendarClock, Car, ChevronDown, ClipboardList, Edit2, FileSpreadsheet, Fuel, Menu, Plus, RotateCcw, Search, ShieldCheck, Trash2, UserCog, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import { exportService } from '@/services/export.service';
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters';
import { JOB_LOCATIONS } from '@/constants/jobLocations';
import {
  buildEquipmentHistory,
  buildEquipmentTargetFromSelection,
  getEquipmentDisplayName,
  normalizeEquipmentItems,
} from '@/pages/equipmentLog.helpers';
import {
  equipmentLogService,
  EQUIPMENT_INSPECTION_TYPES,
  normalizeLicensePlate,
  PLANT_CATEGORIES,
  PLANT_STATUS,
  VEHICLE_LICENSE_PLATE_MAX_LENGTH,
  VEHICLE_MAINTENANCE_TYPES,
  VEHICLE_MAINTENANCE_PRIORITIES,
  VEHICLE_MAINTENANCE_REQUEST_STATUSES,
  VEHICLE_MILEAGE_MAX_DIGITS,
  VEHICLE_DOCUMENT_STATUSES,
  VEHICLE_DOCUMENT_TYPES,
  VEHICLE_STATUS,
  VEHICLE_TYPES,
} from '@/services/equipmentLog.service';

const statusLabels = {
  activo: 'Activo',
  inactivo: 'Fuera de servicio',
  mantenimiento: 'En mantenimiento',
  fuera_servicio: 'Fuera de servicio',
  requiere_revision: 'Requiere revisión',
};

const vehicleTypeLabels = {
  utilitario: 'Utilitario',
  camion: 'Camión',
  auto: 'Auto',
  moto: 'Moto',
  otro: 'Otro',
};

const maintenanceTypeLabels = {
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
};

const maintenanceTypeDescriptions = {
  preventivo: 'Tareas programadas para evitar fallas: controles, cambios y revisiones periódicas.',
  correctivo: 'Intervenciones realizadas para reparar una falla o problema detectado.',
};

const maintenancePriorityLabels = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};

const maintenanceRequestStatusLabels = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  programado: 'Programado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
};

const documentTypeLabels = {
  seguro: 'Seguro',
  rto: 'RTO / revisión técnica',
  licencia: 'Licencia de conducir',
  otro: 'Otro documento',
};

const documentStatusLabels = {
  vigente: 'Vigente',
  proximo_a_vencer: 'Próximo a vencer',
  vencido: 'Vencido',
};

const statusClass = {
  activo: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100',
  inactivo: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200',
  mantenimiento: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100',
  fuera_servicio: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200',
  requiere_revision: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100',
  baja: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100',
  media: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100',
  alta: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100',
  pendiente: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100',
  en_revision: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-100',
  programado: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-100',
  realizado: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100',
  cancelado: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200',
  vigente: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100',
  proximo_a_vencer: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100',
  vencido: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100',
};

const emptyVehicle = {
  license_plate: '',
  name: '',
  vehicle_type: 'utilitario',
  brand: '',
  model: '',
  year: '',
  assigned_driver_id: '',
  assigned_driver_profile_id: '',
  registration_expires_at: '',
  insurance_expires_at: '',
  inspection_expires_at: '',
  mileage_start: '',
  mileage_end: '',
  status: 'activo',
  notes: '',
};

const emptyPlantAsset = {
  name: '',
  category: 'Área fría',
  location_description: '',
  status: 'activo',
  responsible_user_id: '',
  notes: '',
};

const todayInputDate = () => new Date().toISOString().split('T')[0];
const currentInputTime = () => new Date().toTimeString().slice(0, 5);

const emptyFuelLoad = () => ({
  vehicle_id: '',
  price_ars: '',
  load_date: todayInputDate(),
  estimated_time: currentInputTime(),
  liters: '',
  mileage: '',
  notes: '',
});

const emptyMaintenanceLog = () => ({
  vehicle_id: '',
  maintenance_type: 'preventivo',
  maintenance_date: todayInputDate(),
  detail: '',
  mileage: '',
  value_ars: '',
  next_control_date: '',
  notes: '',
});

const emptyDailyOperation = () => ({
  target_type: 'vehicle',
  target_id: '',
  equipment_name: '',
  operation_date: todayInputDate(),
  shift: '',
  usage_time: '',
  operator_name: '',
  observations: '',
});

const emptyVehicleRoute = () => ({
  route_date: todayInputDate(),
  vehicle_id: '',
  driver_id: '',
  mileage_start: '',
  mileage_end: '',
  visited_places: [],
  observations: '',
});

const emptyMaintenanceRequest = () => ({
  vehicle_id: '',
  driver_id: '',
  request_date: todayInputDate(),
  issue_type: '',
  description: '',
  current_mileage: '',
  priority: 'media',
  status: 'pendiente',
  admin_notes: '',
  resolved_at: '',
});

const emptyDocumentExpiration = () => ({
  document_type: 'seguro',
  custom_document_name: '',
  vehicle_id: '',
  driver_id: '',
  expires_at: '',
  observations: '',
  status: 'vigente',
});

const emptyIncident = () => ({
  target_type: 'vehicle',
  target_id: '',
  equipment_name: '',
  incident_date: todayInputDate(),
  incident_time: currentInputTime(),
  anomaly_description: '',
  corrective_action: '',
  downtime: '',
  maintenance_done_by: '',
  observations: '',
});

const emptyMaintenanceCheck = () => ({
  target_type: 'vehicle',
  target_id: '',
  equipment_name: '',
  review_date: todayInputDate(),
  inspection_type: 'preventiva',
  reviewed_component: '',
  general_status_observations: '',
  next_review_date: '',
});

const compactUserLabel = (user) => user?.full_name || user?.email || 'Sin asignar';
const driverLabel = (driver) => driver?.name || 'Sin chofer asignado';
const isActiveDriver = (driver) => Boolean(driver?.is_active && !driver?.archived_at);
const driverOptionLabel = (driver) => `${driverLabel(driver)}${isActiveDriver(driver) ? '' : ' — Inactivo'}`;
const driverOptionsForSelection = (drivers, currentDriverId = '') => {
  const activeDrivers = drivers.filter(isActiveDriver);
  if (!currentDriverId || activeDrivers.some((driver) => driver.id === currentDriverId)) {
    return activeDrivers;
  }
  const currentDriver = drivers.find((driver) => driver.id === currentDriverId);
  return currentDriver ? [currentDriver, ...activeDrivers] : activeDrivers;
};
const vehicleDriverLabel = (vehicle) => (
  vehicle?.assigned_driver_profile?.name
    || (vehicle?.assigned_driver ? compactUserLabel(vehicle.assigned_driver) : null)
    || 'Sin chofer asignado'
);
const inspectionTypeLabels = {
  preventiva: 'Preventiva',
  predictiva: 'Predictiva',
  calibracion: 'Calibración',
};

const equipmentTargetFromRecord = (record) => {
  if (record?.vehicle_id) return { target_type: 'vehicle', target_id: record.vehicle_id };
  if (record?.plant_asset_id) return { target_type: 'plant_asset', target_id: record.plant_asset_id };
  return { target_type: 'vehicle', target_id: '' };
};

const equipmentLabel = (record) => {
  if (record?.equipment_name) return record.equipment_name;
  if (record?.vehicle) {
    return [record.vehicle.license_plate, record.vehicle.name || record.vehicle.brand, record.vehicle.model]
      .filter(Boolean)
      .join(' - ');
  }
  if (record?.plant_asset) {
    return [record.plant_asset.name, record.plant_asset.category, record.plant_asset.location_description]
      .filter(Boolean)
      .join(' - ');
  }
  return 'Equipo no encontrado';
};

const vehicleLabel = (vehicle) => [vehicle?.license_plate, vehicle?.name || vehicle?.brand, vehicle?.model].filter(Boolean).join(' - ') || 'Vehículo no encontrado';
function Badge({ value, children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[value] || 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100'}`}>
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-slate-200">
      <span>{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50';
const onlyDigits = (value) => String(value || '').replace(/\D/g, '');
const yearDigits = (value) => onlyDigits(value).slice(0, 4);
const mileageDigits = (value) => onlyDigits(value).slice(0, VEHICLE_MILEAGE_MAX_DIGITS);
const licensePlateValue = (value) => normalizeLicensePlate(value).slice(0, VEHICLE_LICENSE_PLATE_MAX_LENGTH);
const decimalValue = (value) => {
  const normalized = String(value || '').replace(',', '.').replace(/[^\d.]/g, '');
  const [integerPart, decimalPart = '', ...rest] = normalized.split('.');
  if (decimalPart || normalized.includes('.') || rest.length > 0) return `${integerPart}.${decimalPart.slice(0, 2)}`;
  return integerPart;
};

const selectedLength = (input) => Math.max(0, (input.selectionEnd || 0) - (input.selectionStart || 0));

const preventInvalidLimitedInput = ({ pattern, maxLength }) => (event) => {
  const data = event.data || '';
  if (!data) return;
  const input = event.currentTarget;
  const nextLength = input.value.length - selectedLength(input) + data.length;
  if (!pattern.test(data) || nextLength > maxLength) event.preventDefault();
};

const pasteLimitedValue = ({ formatter, maxLength, onValue }) => (event) => {
  event.preventDefault();
  const input = event.currentTarget;
  const pasted = event.clipboardData.getData('text');
  const start = input.selectionStart || 0;
  const end = input.selectionEnd || 0;
  const next = formatter(`${input.value.slice(0, start)}${pasted}${input.value.slice(end)}`).slice(0, maxLength);
  onValue(next);
};

function VehicleFormDialog({ vehicle, drivers, trigger, onSaved }) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyVehicle);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFormError('');
    setForm(vehicle ? {
      ...emptyVehicle,
      ...vehicle,
      assigned_driver_id: vehicle.assigned_driver_id || '',
      assigned_driver_profile_id: vehicle.assigned_driver_profile_id || '',
      registration_expires_at: vehicle.registration_expires_at || '',
      insurance_expires_at: vehicle.insurance_expires_at || '',
      inspection_expires_at: vehicle.inspection_expires_at || '',
      mileage_start: vehicle.mileage_start ?? '',
      mileage_end: vehicle.mileage_end ?? '',
      status: vehicle.status === 'inactivo' ? 'fuera_servicio' : vehicle.status || 'activo',
    } : emptyVehicle);
  }, [open, vehicle]);

  const setValue = (key, value) => {
    setFormError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    const result = await equipmentLogService.saveVehicle({
      ...form,
      license_plate: normalizeLicensePlate(form.license_plate),
    });
    setSaving(false);

    if (result.success) {
      addToast(result.message, 'success');
      setOpen(false);
      onSaved();
    } else {
      setFormError(result.error);
    }
  };

  const driverOptions = driverOptionsForSelection(drivers, form.assigned_driver_profile_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-50">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Editar vehículo' : 'Crear vehículo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {formError && (
            <div
              role="alert"
              aria-live="assertive"
              className="sticky top-0 z-20 flex items-start gap-3 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-900 shadow-lg ring-4 ring-red-100 dark:border-red-400 dark:bg-red-950 dark:text-red-50 dark:ring-red-950"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Patente *">
              <input
                className={inputClass}
                maxLength={VEHICLE_LICENSE_PLATE_MAX_LENGTH}
                value={form.license_plate}
                onBeforeInput={preventInvalidLimitedInput({ pattern: /^[a-zA-Z0-9]+$/, maxLength: VEHICLE_LICENSE_PLATE_MAX_LENGTH })}
                onPaste={pasteLimitedValue({ formatter: licensePlateValue, maxLength: VEHICLE_LICENSE_PLATE_MAX_LENGTH, onValue: (value) => setValue('license_plate', value) })}
                onChange={(e) => setValue('license_plate', licensePlateValue(e.target.value))}
                required
              />
            </Field>
            <Field label="Estado">
              <select className={inputClass} value={form.status} onChange={(e) => setValue('status', e.target.value)}>
                {VEHICLE_STATUS.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Nombre o descripción">
            <input className={inputClass} value={form.name || ''} onChange={(e) => setValue('name', e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tipo">
              <select className={inputClass} value={form.vehicle_type} onChange={(e) => setValue('vehicle_type', e.target.value)}>
                {VEHICLE_TYPES.map((type) => <option key={type} value={type}>{vehicleTypeLabels[type]}</option>)}
              </select>
            </Field>
            <Field label="Chofer asignado">
              <select className={inputClass} value={form.assigned_driver_profile_id || ''} onChange={(e) => setValue('assigned_driver_profile_id', e.target.value)}>
                <option value="">Sin chofer asignado</option>
                {driverOptions.map((driver) => (
                  <option key={driver.id} value={driver.id}>{driverOptionLabel(driver)}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Marca">
              <input className={inputClass} value={form.brand || ''} onChange={(e) => setValue('brand', e.target.value)} />
            </Field>
            <Field label="Modelo">
              <input className={inputClass} value={form.model || ''} onChange={(e) => setValue('model', e.target.value)} />
            </Field>
            <Field label="Año">
              <input
                className={inputClass}
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={form.year || ''}
                onBeforeInput={preventInvalidLimitedInput({ pattern: /^\d+$/, maxLength: 4 })}
                onPaste={pasteLimitedValue({ formatter: yearDigits, maxLength: 4, onValue: (value) => setValue('year', value) })}
                onChange={(e) => setValue('year', yearDigits(e.target.value))}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Vence registro/cédula">
              <input className={inputClass} type="date" value={form.registration_expires_at || ''} onChange={(e) => setValue('registration_expires_at', e.target.value)} />
            </Field>
            <Field label="Vence seguro">
              <input className={inputClass} type="date" value={form.insurance_expires_at || ''} onChange={(e) => setValue('insurance_expires_at', e.target.value)} />
            </Field>
            <Field label="Vence VTV/RTO">
              <input className={inputClass} type="date" value={form.inspection_expires_at || ''} onChange={(e) => setValue('inspection_expires_at', e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kilometraje inicio de actividades">
              <input
                className={inputClass}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={VEHICLE_MILEAGE_MAX_DIGITS}
                value={form.mileage_start ?? ''}
                onBeforeInput={preventInvalidLimitedInput({ pattern: /^\d+$/, maxLength: VEHICLE_MILEAGE_MAX_DIGITS })}
                onPaste={pasteLimitedValue({ formatter: mileageDigits, maxLength: VEHICLE_MILEAGE_MAX_DIGITS, onValue: (value) => setValue('mileage_start', value) })}
                onChange={(e) => setValue('mileage_start', mileageDigits(e.target.value))}
              />
            </Field>
            <Field label="Kilometraje cierre de actividades">
              <input
                className={inputClass}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={VEHICLE_MILEAGE_MAX_DIGITS}
                value={form.mileage_end ?? ''}
                onBeforeInput={preventInvalidLimitedInput({ pattern: /^\d+$/, maxLength: VEHICLE_MILEAGE_MAX_DIGITS })}
                onPaste={pasteLimitedValue({ formatter: mileageDigits, maxLength: VEHICLE_MILEAGE_MAX_DIGITS, onValue: (value) => setValue('mileage_end', value) })}
                onChange={(e) => setValue('mileage_end', mileageDigits(e.target.value))}
              />
            </Field>
          </div>
          <Field label="Observaciones">
            <textarea className={`${inputClass} min-h-24`} value={form.notes || ''} onChange={(e) => setValue('notes', e.target.value)} />
          </Field>
          {vehicle && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              Estado actual: <span className="font-semibold">{statusLabels[form.status] || form.status}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-[#1e3a8a] text-white hover:bg-blue-900">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FuelLoadFormDialog({ fuelLoad, vehicles, selectedVehicleId = '', trigger, onSaved, canEditMileage = true }) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyFuelLoad());
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFormError('');
    setForm(fuelLoad ? {
      ...emptyFuelLoad(),
      ...fuelLoad,
      vehicle_id: fuelLoad.vehicle_id || '',
      price_ars: fuelLoad.price_ars ?? '',
      load_date: fuelLoad.load_date || todayInputDate(),
      estimated_time: fuelLoad.estimated_time?.slice(0, 5) || currentInputTime(),
      liters: fuelLoad.liters ?? '',
      mileage: fuelLoad.mileage ?? '',
      notes: fuelLoad.notes || '',
    } : {
      ...emptyFuelLoad(),
      vehicle_id: selectedVehicleId || vehicles[0]?.id || '',
    });
  }, [fuelLoad, open, selectedVehicleId, vehicles]);

  const setValue = (key, value) => {
    setFormError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    const result = await equipmentLogService.saveFuelLoad(form);
    setSaving(false);

    if (result.success) {
      addToast(result.message, 'success');
      setOpen(false);
      onSaved();
    } else {
      setFormError(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-50">
        <DialogHeader>
          <DialogTitle>{fuelLoad ? 'Editar carga de combustible' : 'Registrar carga de combustible'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {formError && (
            <div
              role="alert"
              aria-live="assertive"
              className="sticky top-0 z-20 flex items-start gap-3 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-900 shadow-lg ring-4 ring-red-100 dark:border-red-400 dark:bg-red-950 dark:text-red-50 dark:ring-red-950"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <Field label="Vehículo *">
            <select className={inputClass} value={form.vehicle_id} onChange={(e) => setValue('vehicle_id', e.target.value)} required>
              <option value="">Seleccionar vehículo</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {[vehicle.license_plate, vehicle.name || vehicle.brand, vehicle.model].filter(Boolean).join(' - ')}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Precio en pesos argentinos *">
              <input className={inputClass} type="text" inputMode="decimal" value={form.price_ars} onChange={(e) => setValue('price_ars', decimalValue(e.target.value))} required />
            </Field>
            <Field label="Litros *">
              <input className={inputClass} type="text" inputMode="decimal" value={form.liters} onChange={(e) => setValue('liters', decimalValue(e.target.value))} required />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Fecha exacta *">
              <input className={inputClass} type="date" value={form.load_date} onChange={(e) => setValue('load_date', e.target.value)} required />
            </Field>
            <Field label="Hora estimada">
              <input className={inputClass} type="time" value={form.estimated_time} onChange={(e) => setValue('estimated_time', e.target.value)} />
            </Field>
            <Field label="Kilometraje">
              <input
                className={inputClass}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={VEHICLE_MILEAGE_MAX_DIGITS}
                value={form.mileage}
                onBeforeInput={preventInvalidLimitedInput({ pattern: /^\d+$/, maxLength: VEHICLE_MILEAGE_MAX_DIGITS })}
                onPaste={pasteLimitedValue({ formatter: mileageDigits, maxLength: VEHICLE_MILEAGE_MAX_DIGITS, onValue: (value) => setValue('mileage', value) })}
                onChange={(e) => setValue('mileage', mileageDigits(e.target.value))}
                disabled={!canEditMileage}
              />
            </Field>
          </div>
          <Field label="Observaciones">
            <textarea className={`${inputClass} min-h-20`} value={form.notes || ''} onChange={(e) => setValue('notes', e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || vehicles.length === 0} className="bg-[#1e3a8a] text-white hover:bg-blue-900">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceLogFormDialog({ maintenanceLog, vehicles, selectedVehicleId = '', trigger, onSaved, canEditMileage = true }) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyMaintenanceLog());
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFormError('');
    setForm(maintenanceLog ? {
      ...emptyMaintenanceLog(),
      ...maintenanceLog,
      vehicle_id: maintenanceLog.vehicle_id || '',
      maintenance_type: maintenanceLog.maintenance_type || 'preventivo',
      maintenance_date: maintenanceLog.maintenance_date || todayInputDate(),
      detail: maintenanceLog.detail || '',
      mileage: maintenanceLog.mileage ?? '',
      value_ars: maintenanceLog.value_ars ?? '',
      next_control_date: maintenanceLog.next_control_date || '',
      notes: maintenanceLog.notes || '',
    } : {
      ...emptyMaintenanceLog(),
      vehicle_id: selectedVehicleId || vehicles[0]?.id || '',
    });
  }, [maintenanceLog, open, selectedVehicleId, vehicles]);

  const setValue = (key, value) => {
    setFormError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    const result = await equipmentLogService.saveMaintenanceLog(form);
    setSaving(false);

    if (result.success) {
      addToast(result.message, 'success');
      setOpen(false);
      onSaved();
    } else {
      setFormError(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-50">
        <DialogHeader>
          <DialogTitle>{maintenanceLog ? 'Editar mantenimiento' : 'Registrar mantenimiento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {formError && (
            <div
              role="alert"
              aria-live="assertive"
              className="sticky top-0 z-20 flex items-start gap-3 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-900 shadow-lg ring-4 ring-red-100 dark:border-red-400 dark:bg-red-950 dark:text-red-50 dark:ring-red-950"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <Field label="Vehículo *">
            <select className={inputClass} value={form.vehicle_id} onChange={(e) => setValue('vehicle_id', e.target.value)} required>
              <option value="">Seleccionar vehículo</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {[vehicle.license_plate, vehicle.name || vehicle.brand, vehicle.model].filter(Boolean).join(' - ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de mantenimiento *">
            <select className={inputClass} value={form.maintenance_type} onChange={(e) => setValue('maintenance_type', e.target.value)} required>
              {VEHICLE_MAINTENANCE_TYPES.map((type) => (
                <option key={type} value={type}>{maintenanceTypeLabels[type]}</option>
              ))}
            </select>
          </Field>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950 dark:text-blue-100">
            {maintenanceTypeDescriptions[form.maintenance_type]}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Fecha *">
              <input className={inputClass} type="date" value={form.maintenance_date} onChange={(e) => setValue('maintenance_date', e.target.value)} required />
            </Field>
            <Field label="Kilometraje *">
              <input
                className={inputClass}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={VEHICLE_MILEAGE_MAX_DIGITS}
                value={form.mileage}
                onBeforeInput={preventInvalidLimitedInput({ pattern: /^\d+$/, maxLength: VEHICLE_MILEAGE_MAX_DIGITS })}
                onPaste={pasteLimitedValue({ formatter: mileageDigits, maxLength: VEHICLE_MILEAGE_MAX_DIGITS, onValue: (value) => setValue('mileage', value) })}
                onChange={(e) => setValue('mileage', mileageDigits(e.target.value))}
                disabled={!canEditMileage}
                required
              />
            </Field>
            <Field label="Costo en ARS">
              <input className={inputClass} type="text" inputMode="decimal" value={form.value_ars ?? ''} onChange={(e) => setValue('value_ars', decimalValue(e.target.value))} />
            </Field>
          </div>
          <Field label="Detalle *">
            <textarea className={`${inputClass} min-h-24`} value={form.detail} onChange={(e) => setValue('detail', e.target.value)} required />
          </Field>
          <Field label="Próximo control">
            <input className={inputClass} type="date" value={form.next_control_date || ''} onChange={(e) => setValue('next_control_date', e.target.value)} />
          </Field>
          <Field label="Observaciones">
            <textarea className={`${inputClass} min-h-20`} value={form.notes || ''} onChange={(e) => setValue('notes', e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || vehicles.length === 0} className="bg-[#1e3a8a] text-white hover:bg-blue-900">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlantFormDialog({ asset, users, trigger, onSaved }) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyPlantAsset);

  useEffect(() => {
    if (!open) return;
    setForm(asset ? { ...emptyPlantAsset, ...asset, responsible_user_id: asset.responsible_user_id || '' } : emptyPlantAsset);
  }, [asset, open]);

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const result = await equipmentLogService.savePlantAsset(form);
    setSaving(false);

    if (result.success) {
      addToast(result.message, 'success');
      setOpen(false);
      onSaved();
    } else {
      addToast(result.error, 'error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-50">
        <DialogHeader>
          <DialogTitle>{asset ? 'Editar elemento de planta' : 'Crear elemento de planta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Nombre *">
            <input className={inputClass} value={form.name || ''} onChange={(e) => setValue('name', e.target.value)} required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Categoría">
              <select className={inputClass} value={form.category} onChange={(e) => setValue('category', e.target.value)}>
                {PLANT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select className={inputClass} value={form.status} onChange={(e) => setValue('status', e.target.value)}>
                {PLANT_STATUS.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Responsable/asignado">
            <select className={inputClass} value={form.responsible_user_id || ''} onChange={(e) => setValue('responsible_user_id', e.target.value)}>
              <option value="">Sin asignar</option>
              {users.map((user) => <option key={user.id} value={user.id}>{compactUserLabel(user)}</option>)}
            </select>
          </Field>
          <Field label="Ubicación/descripción">
            <input className={inputClass} value={form.location_description || ''} onChange={(e) => setValue('location_description', e.target.value)} />
          </Field>
          <Field label="Observaciones">
            <textarea className={`${inputClass} min-h-24`} value={form.notes || ''} onChange={(e) => setValue('notes', e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-[#1e3a8a] text-white hover:bg-blue-900">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const emptyDriver = {
  name: '',
  phone: '',
  notes: '',
  is_active: true,
};

function DriverFormDialog({ driver, trigger, onSaved }) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyDriver);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFormError('');
    setForm(driver ? {
      ...emptyDriver,
      ...driver,
      phone: driver.phone || '',
      notes: driver.notes || '',
      is_active: driver.is_active ?? true,
    } : emptyDriver);
  }, [driver, open]);

  const setValue = (key, value) => {
    setFormError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    const result = driver
      ? await equipmentLogService.updateDriver(driver.id, form)
      : await equipmentLogService.createDriver(form);
    setSaving(false);

    if (result.success) {
      addToast(result.message, 'success');
      setOpen(false);
      onSaved();
    } else {
      setFormError(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-50">
        <DialogHeader>
          <DialogTitle>{driver ? 'Editar chofer' : 'Agregar chofer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {formError && (
            <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-900 shadow-lg dark:border-red-400 dark:bg-red-950 dark:text-red-50">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <Field label="Nombre *">
            <input className={inputClass} value={form.name || ''} onChange={(e) => setValue('name', e.target.value)} required />
          </Field>
          <Field label="Teléfono">
            <input className={inputClass} value={form.phone || ''} onChange={(e) => setValue('phone', e.target.value)} />
          </Field>
          <Field label="Observaciones">
            <textarea className={`${inputClass} min-h-24`} value={form.notes || ''} onChange={(e) => setValue('notes', e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-[#1e3a8a] text-white hover:bg-blue-900">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EquipmentTargetFields({ form, vehicles, plantAssets, onSelectEquipment, setValue }) {
  const selectedValue = form.target_id ? `${form.target_type}:${form.target_id}` : (form.equipment_name ? 'legacy' : '');
  const hasLegacyEquipmentName = !form.target_id && Boolean(form.equipment_name?.trim());
  const hasSelectedTargetInOptions = form.target_type === 'vehicle'
    ? vehicles.some((vehicle) => vehicle.id === form.target_id)
    : plantAssets.some((asset) => asset.id === form.target_id);
  const hasArchivedSnapshot = Boolean(form.target_id && form.equipment_name?.trim() && !hasSelectedTargetInOptions);

  return (
    <div className="grid gap-3">
      <Field label="Equipo">
        <select
          className={inputClass}
          value={selectedValue}
          onChange={(event) => onSelectEquipment(event.target.value)}
        >
          <option value="">Seleccionar equipo</option>
          {hasLegacyEquipmentName && (
            <option value="legacy">Registro anterior: {form.equipment_name}</option>
          )}
          {hasArchivedSnapshot && (
            <option value={selectedValue}>Equipo archivado/no listado: {form.equipment_name}</option>
          )}
          {vehicles.map((vehicle) => {
            const equipment = {
              type: 'vehicle',
              identifier: vehicle.license_plate,
              name: vehicle.name || vehicle.brand || vehicle.model || 'Vehículo',
            };
            return (
              <option key={vehicle.id} value={`vehicle:${vehicle.id}`}>
                {getEquipmentDisplayName(equipment)}
              </option>
            );
          })}
          {plantAssets.map((asset) => {
            const equipment = {
              type: 'plant_asset',
              identifier: asset.location_description || asset.category,
              name: asset.name || 'Equipo de planta',
            };
            return (
              <option key={asset.id} value={`plant_asset:${asset.id}`}>
                {getEquipmentDisplayName(equipment)}
              </option>
            );
          })}
        </select>
      </Field>
      {hasLegacyEquipmentName && (
        <Field label="Equipo anterior">
          <input
            className={inputClass}
            value={form.equipment_name || ''}
            onChange={(event) => setValue('equipment_name', event.target.value)}
          />
        </Field>
      )}
    </div>
  );
}

function EquipmentRecordFormDialog({ type, record, vehicles, plantAssets, trigger, onSaved }) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const emptyByType = useMemo(() => ({
    operation: emptyDailyOperation,
    incident: emptyIncident,
    check: emptyMaintenanceCheck,
  }), []);
  const [form, setForm] = useState(emptyByType[type]());

  const labels = {
    operation: {
      title: record ? 'Editar operación diaria' : 'Registrar operación diaria',
      save: equipmentLogService.saveDailyOperation,
    },
    incident: {
      title: record ? 'Editar incidencia' : 'Registrar incidencia',
      save: equipmentLogService.saveIncident,
    },
    check: {
      title: record ? 'Editar mantenimiento / calibración' : 'Registrar mantenimiento / calibración',
      save: equipmentLogService.saveMaintenanceCheck,
    },
  };

  const setValue = useCallback((key, value) => {
    setFormError('');
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'target_type') next.target_id = '';
      return next;
    });
  }, []);

  const setEquipmentTarget = useCallback((selection) => {
    if (selection === 'legacy') return;
    setFormError('');
    setForm((prev) => ({
      ...prev,
      ...buildEquipmentTargetFromSelection(selection, { vehicles, plantAssets }),
    }));
  }, [plantAssets, vehicles]);

  useEffect(() => {
    if (!open) return;
    setFormError('');
    const target = record ? equipmentTargetFromRecord(record) : { target_type: 'vehicle', target_id: '' };
    setForm(record ? {
      ...emptyByType[type](),
      ...record,
      ...target,
      incident_time: record.incident_time?.slice(0, 5) || currentInputTime(),
    } : {
      ...emptyByType[type](),
      ...target,
    });
  }, [emptyByType, open, plantAssets, record, type, vehicles]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    const result = await labels[type].save(form);
    setSaving(false);

    if (result.success) {
      addToast(result.message, 'success');
      setOpen(false);
      onSaved();
    } else {
      setFormError(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-50">
        <DialogHeader>
          <DialogTitle>{labels[type].title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {formError && (
            <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-900 shadow-lg dark:border-red-400 dark:bg-red-950 dark:text-red-50">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <EquipmentTargetFields
            form={form}
            vehicles={vehicles}
            plantAssets={plantAssets}
            onSelectEquipment={setEquipmentTarget}
            setValue={setValue}
          />

          {type === 'operation' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Fecha *">
                  <input className={inputClass} type="date" value={form.operation_date || ''} onChange={(e) => setValue('operation_date', e.target.value)} required />
                </Field>
                <Field label="Turno *">
                  <input className={inputClass} value={form.shift || ''} onChange={(e) => setValue('shift', e.target.value)} required />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tiempo de uso *">
                  <input className={inputClass} value={form.usage_time || ''} onChange={(e) => setValue('usage_time', e.target.value)} required />
                </Field>
                <Field label="Operador *">
                  <input className={inputClass} value={form.operator_name || ''} onChange={(e) => setValue('operator_name', e.target.value)} required />
                </Field>
              </div>
              <Field label="Observaciones">
                <textarea className={`${inputClass} min-h-20`} value={form.observations || ''} onChange={(e) => setValue('observations', e.target.value)} />
              </Field>
            </>
          )}

          {type === 'incident' && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Fecha *">
                  <input className={inputClass} type="date" value={form.incident_date || ''} onChange={(e) => setValue('incident_date', e.target.value)} required />
                </Field>
                <Field label="Hora">
                  <input className={inputClass} type="time" value={form.incident_time || ''} onChange={(e) => setValue('incident_time', e.target.value)} />
                </Field>
                <Field label="Tiempo fuera de línea">
                  <input className={inputClass} value={form.downtime || ''} onChange={(e) => setValue('downtime', e.target.value)} />
                </Field>
              </div>
              <Field label="Descripción de la anomalía *">
                <textarea className={`${inputClass} min-h-24`} value={form.anomaly_description || ''} onChange={(e) => setValue('anomaly_description', e.target.value)} required />
              </Field>
              <Field label="Acción correctiva aplicada *">
                <textarea className={`${inputClass} min-h-24`} value={form.corrective_action || ''} onChange={(e) => setValue('corrective_action', e.target.value)} required />
              </Field>
              <Field label="Mantenimiento realizado por">
                <input className={inputClass} value={form.maintenance_done_by || ''} onChange={(e) => setValue('maintenance_done_by', e.target.value)} />
              </Field>
              <Field label="Observaciones">
                <textarea className={`${inputClass} min-h-20`} value={form.observations || ''} onChange={(e) => setValue('observations', e.target.value)} />
              </Field>
            </>
          )}

          {type === 'check' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Fecha de revisión *">
                  <input className={inputClass} type="date" value={form.review_date || ''} onChange={(e) => setValue('review_date', e.target.value)} required />
                </Field>
                <Field label="Tipo de inspección *">
                  <select className={inputClass} value={form.inspection_type || 'preventiva'} onChange={(e) => setValue('inspection_type', e.target.value)} required>
                    {EQUIPMENT_INSPECTION_TYPES.map((typeOption) => (
                      <option key={typeOption} value={typeOption}>{inspectionTypeLabels[typeOption]}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Componente revisado *">
                <input className={inputClass} value={form.reviewed_component || ''} onChange={(e) => setValue('reviewed_component', e.target.value)} required />
              </Field>
              <Field label="Observaciones del estado general">
                <textarea className={`${inputClass} min-h-24`} value={form.general_status_observations || ''} onChange={(e) => setValue('general_status_observations', e.target.value)} />
              </Field>
              <Field label="Próxima fecha de revisión *">
                <input className={inputClass} type="date" value={form.next_review_date || ''} onChange={(e) => setValue('next_review_date', e.target.value)} required />
              </Field>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-[#1e3a8a] text-white hover:bg-blue-900">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VehicleRouteFormDialog({ route, vehicles, drivers, trigger, onSaved, defaultDriverId = '' }) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyVehicleRoute());
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFormError('');
    setForm(route ? {
      ...emptyVehicleRoute(),
      ...route,
      visited_places: Array.isArray(route.visited_places) ? route.visited_places : [],
      mileage_start: route.mileage_start ?? '',
      mileage_end: route.mileage_end ?? '',
      observations: route.observations || '',
    } : {
      ...emptyVehicleRoute(),
      vehicle_id: vehicles[0]?.id || '',
      driver_id: defaultDriverId || drivers[0]?.id || '',
    });
  }, [defaultDriverId, drivers, open, route, vehicles]);

  const setValue = (key, value) => {
    setFormError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const togglePlace = (place) => {
    setFormError('');
    setForm((prev) => {
      const current = prev.visited_places || [];
      return {
        ...prev,
        visited_places: current.includes(place)
          ? current.filter((item) => item !== place)
          : [...current, place],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const result = await equipmentLogService.saveVehicleRoute(form);
    setSaving(false);
    if (result.success) {
      addToast(result.message, 'success');
      setOpen(false);
      onSaved();
    } else {
      setFormError(result.error);
    }
  };

  const driverOptions = driverOptionsForSelection(drivers, form.driver_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-50">
        <DialogHeader><DialogTitle>{route ? 'Editar recorrido' : 'Registrar recorrido diario'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {formError && <div role="alert" className="flex items-start gap-3 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-900 dark:border-red-400 dark:bg-red-950 dark:text-red-50"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><span>{formError}</span></div>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Fecha *"><input className={inputClass} type="date" value={form.route_date || ''} onChange={(e) => setValue('route_date', e.target.value)} required /></Field>
            <Field label="Vehículo *">
              <select className={inputClass} value={form.vehicle_id} onChange={(e) => setValue('vehicle_id', e.target.value)} required>
                <option value="">Seleccionar vehículo</option>
                {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicleLabel(vehicle)}</option>)}
              </select>
            </Field>
            <Field label="Chofer *">
              <select className={inputClass} value={form.driver_id} onChange={(e) => setValue('driver_id', e.target.value)} required>
                <option value="">Seleccionar chofer</option>
                {driverOptions.map((driver) => <option key={driver.id} value={driver.id}>{driverOptionLabel(driver)}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kilometraje inicial *"><input className={inputClass} inputMode="numeric" maxLength={VEHICLE_MILEAGE_MAX_DIGITS} value={form.mileage_start} onChange={(e) => setValue('mileage_start', mileageDigits(e.target.value))} required /></Field>
            <Field label="Kilometraje final *"><input className={inputClass} inputMode="numeric" maxLength={VEHICLE_MILEAGE_MAX_DIGITS} value={form.mileage_end} onChange={(e) => setValue('mileage_end', mileageDigits(e.target.value))} required /></Field>
          </div>
          <Field label="Empresas o lugares visitados *">
            <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-slate-700">
              <div className="grid gap-2 sm:grid-cols-2">
                {JOB_LOCATIONS.map((place) => (
                  <label key={place} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-slate-800">
                    <input type="checkbox" checked={(form.visited_places || []).includes(place)} onChange={() => togglePlace(place)} />
                    <span>{place}</span>
                  </label>
                ))}
              </div>
            </div>
            {(form.visited_places || []).length > 0 && (
              <p className="text-xs text-gray-500 dark:text-slate-400">Orden: {(form.visited_places || []).join(' -> ')}</p>
            )}
          </Field>
          <Field label="Observaciones"><textarea className={`${inputClass} min-h-20`} value={form.observations || ''} onChange={(e) => setValue('observations', e.target.value)} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-[#1e3a8a] text-white hover:bg-blue-900">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceRequestFormDialog({ request, vehicles, drivers, trigger, onSaved, defaultDriverId = '', isAdmin = false }) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyMaintenanceRequest());
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFormError('');
    setForm(request ? {
      ...emptyMaintenanceRequest(),
      ...request,
      current_mileage: request.current_mileage ?? '',
      admin_notes: request.admin_notes || '',
      resolved_at: request.resolved_at || '',
    } : {
      ...emptyMaintenanceRequest(),
      vehicle_id: vehicles[0]?.id || '',
      driver_id: defaultDriverId || drivers[0]?.id || '',
    });
  }, [defaultDriverId, drivers, open, request, vehicles]);

  const setValue = (key, value) => {
    setFormError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const result = await equipmentLogService.saveMaintenanceRequest(form);
    setSaving(false);
    if (result.success) {
      addToast(result.message, 'success');
      setOpen(false);
      onSaved();
    } else {
      setFormError(result.error);
    }
  };

  const driverOptions = driverOptionsForSelection(drivers, form.driver_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-50">
        <DialogHeader><DialogTitle>{request ? 'Editar aviso de mantenimiento' : 'Informar mantenimiento'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {formError && <div role="alert" className="flex items-start gap-3 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-900 dark:border-red-400 dark:bg-red-950 dark:text-red-50"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><span>{formError}</span></div>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Vehículo *"><select className={inputClass} value={form.vehicle_id} onChange={(e) => setValue('vehicle_id', e.target.value)} required><option value="">Seleccionar</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicleLabel(vehicle)}</option>)}</select></Field>
            <Field label="Chofer *"><select className={inputClass} value={form.driver_id} onChange={(e) => setValue('driver_id', e.target.value)} required><option value="">Seleccionar</option>{driverOptions.map((driver) => <option key={driver.id} value={driver.id}>{driverOptionLabel(driver)}</option>)}</select></Field>
            <Field label="Fecha *"><input className={inputClass} type="date" value={form.request_date || ''} onChange={(e) => setValue('request_date', e.target.value)} required /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tipo de problema *"><input className={inputClass} value={form.issue_type || ''} onChange={(e) => setValue('issue_type', e.target.value)} required /></Field>
            <Field label="Prioridad"><select className={inputClass} value={form.priority} onChange={(e) => setValue('priority', e.target.value)}>{VEHICLE_MAINTENANCE_PRIORITIES.map((priority) => <option key={priority} value={priority}>{maintenancePriorityLabels[priority]}</option>)}</select></Field>
            <Field label="Kilometraje actual"><input className={inputClass} inputMode="numeric" maxLength={VEHICLE_MILEAGE_MAX_DIGITS} value={form.current_mileage ?? ''} onChange={(e) => setValue('current_mileage', mileageDigits(e.target.value))} /></Field>
          </div>
          <Field label="Descripción libre *"><textarea className={`${inputClass} min-h-24`} value={form.description || ''} onChange={(e) => setValue('description', e.target.value)} required /></Field>
          {isAdmin && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Estado"><select className={inputClass} value={form.status} onChange={(e) => setValue('status', e.target.value)}>{VEHICLE_MAINTENANCE_REQUEST_STATUSES.map((status) => <option key={status} value={status}>{maintenanceRequestStatusLabels[status]}</option>)}</select></Field>
                <Field label="Fecha de resolución"><input className={inputClass} type="date" value={form.resolved_at || ''} onChange={(e) => setValue('resolved_at', e.target.value)} /></Field>
              </div>
              <Field label="Observaciones del administrador"><textarea className={`${inputClass} min-h-20`} value={form.admin_notes || ''} onChange={(e) => setValue('admin_notes', e.target.value)} /></Field>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-[#1e3a8a] text-white hover:bg-blue-900">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DocumentExpirationFormDialog({ expiration, vehicles, drivers, trigger, onSaved }) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyDocumentExpiration());
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFormError('');
    setForm(expiration ? { ...emptyDocumentExpiration(), ...expiration, custom_document_name: expiration.custom_document_name || '', observations: expiration.observations || '' } : emptyDocumentExpiration());
  }, [expiration, open]);

  const setValue = (key, value) => {
    setFormError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const result = await equipmentLogService.saveDocumentExpiration(form);
    setSaving(false);
    if (result.success) {
      addToast(result.message, 'success');
      setOpen(false);
      onSaved();
    } else {
      setFormError(result.error);
    }
  };

  const driverOptions = driverOptionsForSelection(drivers, form.driver_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-50">
        <DialogHeader><DialogTitle>{expiration ? 'Editar vencimiento' : 'Registrar vencimiento'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {formError && <div role="alert" className="flex items-start gap-3 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-900 dark:border-red-400 dark:bg-red-950 dark:text-red-50"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><span>{formError}</span></div>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tipo *"><select className={inputClass} value={form.document_type} onChange={(e) => setValue('document_type', e.target.value)}>{VEHICLE_DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{documentTypeLabels[type]}</option>)}</select></Field>
            <Field label="Fecha de vencimiento *"><input className={inputClass} type="date" value={form.expires_at || ''} onChange={(e) => setValue('expires_at', e.target.value)} required /></Field>
            <Field label="Estado"><select className={inputClass} value={form.status} onChange={(e) => setValue('status', e.target.value)}>{VEHICLE_DOCUMENT_STATUSES.map((status) => <option key={status} value={status}>{documentStatusLabels[status]}</option>)}</select></Field>
          </div>
          {form.document_type === 'otro' && <Field label="Nombre del documento"><input className={inputClass} value={form.custom_document_name || ''} onChange={(e) => setValue('custom_document_name', e.target.value)} /></Field>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Vehículo asociado"><select className={inputClass} value={form.vehicle_id || ''} onChange={(e) => setValue('vehicle_id', e.target.value)}><option value="">Sin vehículo</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicleLabel(vehicle)}</option>)}</select></Field>
            <Field label="Chofer asociado"><select className={inputClass} value={form.driver_id || ''} onChange={(e) => setValue('driver_id', e.target.value)}><option value="">Sin chofer</option>{driverOptions.map((driver) => <option key={driver.id} value={driver.id}>{driverOptionLabel(driver)}</option>)}</select></Field>
          </div>
          <Field label="Observaciones"><textarea className={`${inputClass} min-h-20`} value={form.observations || ''} onChange={(e) => setValue('observations', e.target.value)} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-[#1e3a8a] text-white hover:bg-blue-900">{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EquipmentLogPage() {
  const { addToast } = useToast();
  const { isAdmin, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('summary');
  const [vehicles, setVehicles] = useState([]);
  const [fuelLoads, setFuelLoads] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [vehicleRoutes, setVehicleRoutes] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [documentExpirations, setDocumentExpirations] = useState([]);
  const [dailyOperations, setDailyOperations] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [maintenanceChecks, setMaintenanceChecks] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedEquipmentKey, setSelectedEquipmentKey] = useState('');
  const [plantAssets, setPlantAssets] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverStatusFilter, setDriverStatusFilter] = useState('active');
  const [togglingDriverId, setTogglingDriverId] = useState('');
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isDriver = userRole === 'chofer';
  const canManageMasterData = isAdmin;
  const canEditFuelLoads = isAdmin;
  const canCreateFuelLoads = isAdmin;
  const canDeleteFuelLoads = isAdmin;
  const canEditMaintenanceLogs = isAdmin || isDriver;
  const canCreateMaintenanceLogs = isAdmin || isDriver;
  const canDeleteMaintenanceLogs = isAdmin;
  const canEditIncidents = isAdmin || isDriver;
  const canDeleteIncidents = isAdmin;
  const canEditOperationalRecords = isAdmin;
  const canEditRoutes = isAdmin || isDriver;
  const canDeleteRoutes = isAdmin;
  const canEditMaintenanceRequests = isAdmin || isDriver;
  const canDeleteMaintenanceRequests = isAdmin;
  const canEditDocumentExpirations = isAdmin;
  const canDeleteDocumentExpirations = isAdmin;
  const activeDriverId = '';
  const activeDrivers = useMemo(() => drivers.filter(isActiveDriver), [drivers]);
  const fullDataTabs = ['summary', 'vehicles', 'routes', 'fuel', 'maintenance', 'expirations', 'driverHistory', 'plant', 'operation', 'incidents', 'checks'];
  const equipmentItems = useMemo(() => normalizeEquipmentItems({ vehicles, plantAssets }), [vehicles, plantAssets]);
  const selectedEquipment = equipmentItems.find((equipment) => equipment.key === selectedEquipmentKey) || null;
  const selectedEquipmentHistory = useMemo(() => buildEquipmentHistory({
    equipment: selectedEquipment,
    fuelLoads,
    maintenanceLogs,
    vehicleRoutes,
    maintenanceRequests,
    dailyOperations,
    incidents,
    maintenanceChecks,
  }), [dailyOperations, fuelLoads, incidents, maintenanceChecks, maintenanceLogs, maintenanceRequests, selectedEquipment, vehicleRoutes]);

  const loadUsers = async () => {
    if (!canManageMasterData) return;
    const result = await equipmentLogService.getAssignableUsers();
    if (result.success) setUsers(result.data || []);
  };

  const loadDrivers = async () => {
    const result = await equipmentLogService.getDrivers({ activeOnly: false });
    if (result.success) setDrivers(result.data || []);
    else addToast(result.error, 'error');
  };

  const loadCurrentTab = async () => {
    setLoading(true);
    const result = fullDataTabs.includes(activeTab)
      ? await Promise.all([
        equipmentLogService.getVehicles({ search }),
        equipmentLogService.getFuelLoads(),
        equipmentLogService.getMaintenanceLogs(),
        equipmentLogService.getVehicleRoutes(),
        equipmentLogService.getMaintenanceRequests(),
        equipmentLogService.getDocumentExpirations(),
        equipmentLogService.getPlantAssets({ search: activeTab === 'plant' ? search : '' }),
        equipmentLogService.getDrivers({ activeOnly: false }),
        equipmentLogService.getDailyOperations(),
        equipmentLogService.getIncidents(),
        equipmentLogService.getMaintenanceChecks(),
      ])
      : activeTab === 'drivers'
        ? await equipmentLogService.getDrivers({ activeOnly: false })
      : await equipmentLogService.getPlantAssets({ search });
    setLoading(false);

    if (fullDataTabs.includes(activeTab)) {
      const [vehiclesResult, fuelLoadsResult, maintenanceLogsResult, vehicleRoutesResult, maintenanceRequestsResult, documentExpirationsResult, plantAssetsResult, driversResult, dailyOperationsResult, incidentsResult, maintenanceChecksResult] = result;
      if (vehiclesResult.success) setVehicles(vehiclesResult.data || []);
      else addToast(vehiclesResult.error, 'error');

      if (fuelLoadsResult.success) setFuelLoads(fuelLoadsResult.data || []);
      else addToast(fuelLoadsResult.error, 'error');

      if (maintenanceLogsResult.success) setMaintenanceLogs(maintenanceLogsResult.data || []);
      else addToast(maintenanceLogsResult.error, 'error');

      if (vehicleRoutesResult.success) setVehicleRoutes(vehicleRoutesResult.data || []);
      else addToast(vehicleRoutesResult.error, 'error');

      if (maintenanceRequestsResult.success) setMaintenanceRequests(maintenanceRequestsResult.data || []);
      else addToast(maintenanceRequestsResult.error, 'error');

      if (documentExpirationsResult.success) setDocumentExpirations(documentExpirationsResult.data || []);
      else addToast(documentExpirationsResult.error, 'error');

      if (plantAssetsResult.success) setPlantAssets(plantAssetsResult.data || []);
      else addToast(plantAssetsResult.error, 'error');

      if (driversResult.success) setDrivers(driversResult.data || []);
      else addToast(driversResult.error, 'error');

      if (dailyOperationsResult.success) setDailyOperations(dailyOperationsResult.data || []);
      else addToast(dailyOperationsResult.error, 'error');

      if (incidentsResult.success) setIncidents(incidentsResult.data || []);
      else addToast(incidentsResult.error, 'error');

      if (maintenanceChecksResult.success) setMaintenanceChecks(maintenanceChecksResult.data || []);
      else addToast(maintenanceChecksResult.error, 'error');
    } else if (activeTab === 'drivers' && result.success) {
      setDrivers(result.data || []);
    } else if (result.success) {
      setPlantAssets(result.data || []);
    } else {
      addToast(result.error, 'error');
    }
  };

  useEffect(() => {
    loadUsers();
  }, [canManageMasterData]);

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    loadCurrentTab();
  }, [activeTab, search]);

  useEffect(() => {
    if (activeTab !== 'vehicles') return;
    if (!selectedVehicleId) return;
    if (!vehicles.some((vehicle) => vehicle.id === selectedVehicleId)) {
      setSelectedVehicleId('');
    }
  }, [activeTab, selectedVehicleId, vehicles]);

  useEffect(() => {
    if (!selectedEquipmentKey) return;
    if (!equipmentItems.some((equipment) => equipment.key === selectedEquipmentKey)) {
      setSelectedEquipmentKey('');
    }
  }, [equipmentItems, selectedEquipmentKey]);

  const handleVehicleSelect = (id) => {
    setSelectedVehicleId(id);
    setSelectedEquipmentKey(id ? `vehicle:${id}` : '');
  };

  const tabs = useMemo(() => ([
    { key: 'summary', label: 'Resumen', icon: ClipboardList },
    { key: 'vehicles', label: 'Vehículos', icon: Car },
    { key: 'routes', label: 'Recorridos', icon: CalendarClock },
    { key: 'fuel', label: 'Combustible', icon: Fuel },
    { key: 'maintenance', label: 'Mantenimientos', icon: Wrench },
    { key: 'expirations', label: 'Vencimientos', icon: ShieldCheck },
    { key: 'driverHistory', label: 'Historial choferes', icon: UserCog },
    { key: 'drivers', label: 'Choferes', icon: UserCog },
    { key: 'plant', label: 'Planta', icon: Building2 },
    { key: 'operation', label: 'Operación diaria', icon: CalendarClock },
    { key: 'incidents', label: 'Incidencias', icon: AlertCircle },
    { key: 'checks', label: 'Mantenimiento / Calibración', icon: Wrench },
  ]), []);
  const tabByKey = useMemo(() => Object.fromEntries(tabs.map((tab) => [tab.key, tab])), [tabs]);
  const tabTitles = {
    vehicles: 'Vehículos',
    summary: 'Resumen',
    routes: 'Recorridos',
    fuel: 'Combustible',
    maintenance: 'Mantenimientos',
    expirations: 'Vencimientos',
    driverHistory: 'Historial de actividad de choferes',
    drivers: 'Gestión de choferes',
    plant: 'Planta',
    operation: 'Operación diaria',
    incidents: 'Incidencias',
    checks: 'Mantenimiento / Calibración',
  };
  const tabDescriptions = {
    vehicles: 'Fichas, historial de combustible, mantenimiento y vencimientos.',
    summary: 'Indicadores operativos del módulo de vehículos.',
    routes: 'Recorridos diarios con kilometraje, chofer y empresas visitadas.',
    fuel: 'Cargas de combustible, consumo estimado y costo por kilómetro.',
    maintenance: 'Avisos de mantenimiento informados por choferes y seguimiento administrativo.',
    expirations: 'Seguros, RTO, licencias y otros documentos con alertas.',
    driverHistory: 'Historial de asignaciones, actividad y registros por chofer, incluso si fue desactivado.',
    drivers: 'Registro actual de choferes disponibles para asignaciones y administración operativa.',
    plant: 'Cámaras, áreas operativas, partes comunes y equipos internos. Administración queda excluida.',
    operation: 'Uso diario por equipo, fecha, turno y operador.',
    incidents: 'Fallas, anomalías, mantenimiento menor y acciones correctivas.',
    checks: 'Revisiones preventivas, predictivas y calibraciones programadas.',
  };
  const navGroups = useMemo(() => ([
    { key: 'vehicles', label: 'Vehículos', icon: Car, tabs: ['vehicles', 'routes', 'fuel', 'maintenance', 'expirations'] },
    { key: 'drivers', label: 'Choferes', icon: UserCog, tabs: ['drivers', 'driverHistory'] },
    { key: 'plant', label: 'Planta', icon: Building2, tabs: ['plant', 'operation', 'incidents', 'checks'] },
  ]), []);

  useEffect(() => {
    const activeGroup = navGroups.find((group) => group.tabs.includes(activeTab));
    setOpenNavGroup(activeGroup?.key || '');
  }, [activeTab, navGroups]);

  const handleTabSelect = (key) => {
    setActiveTab(key);
    setMobileNavOpen(false);
  };

  const handleArchiveVehicle = async (id) => {
    const result = await equipmentLogService.archiveVehicle(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) {
      setVehicles((currentVehicles) => currentVehicles.filter((vehicle) => vehicle.id !== id));
      setFuelLoads((currentLoads) => currentLoads.filter((load) => load.vehicle_id !== id));
      setMaintenanceLogs((currentLogs) => currentLogs.filter((log) => log.vehicle_id !== id));
      if (selectedVehicleId === id) setSelectedVehicleId('');
    }
  };

  const handleDeleteFuelLoad = async (id) => {
    const result = await equipmentLogService.deleteFuelLoad(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) loadCurrentTab();
  };

  const handleDeleteMaintenanceLog = async (id) => {
    const result = await equipmentLogService.deleteMaintenanceLog(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) loadCurrentTab();
  };

  const handleDeletePlantAsset = async (id) => {
    const result = await equipmentLogService.deletePlantAsset(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) loadCurrentTab();
  };

  const handleArchiveDriver = async (id) => {
    if (togglingDriverId) return;
    setTogglingDriverId(id);
    const result = await equipmentLogService.archiveDriver(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) await loadCurrentTab();
    setTogglingDriverId('');
  };

  const handleReactivateDriver = async (id) => {
    if (togglingDriverId) return;
    setTogglingDriverId(id);
    const result = await equipmentLogService.reactivateDriver(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) await loadCurrentTab();
    setTogglingDriverId('');
  };

  const handleDeleteDailyOperation = async (id) => {
    const result = await equipmentLogService.deleteDailyOperation(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) loadCurrentTab();
  };

  const handleDeleteVehicleRoute = async (id) => {
    const result = await equipmentLogService.deleteVehicleRoute(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) loadCurrentTab();
  };

  const handleDeleteMaintenanceRequest = async (id) => {
    const result = await equipmentLogService.deleteMaintenanceRequest(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) loadCurrentTab();
  };

  const handleDeleteDocumentExpiration = async (id) => {
    const result = await equipmentLogService.deleteDocumentExpiration(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) loadCurrentTab();
  };

  const handleDeleteIncident = async (id) => {
    const result = await equipmentLogService.deleteIncident(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) loadCurrentTab();
  };

  const handleDeleteMaintenanceCheck = async (id) => {
    const result = await equipmentLogService.deleteMaintenanceCheck(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) loadCurrentTab();
  };

  const handleExportEquipmentLog = async () => {
    setExporting(true);
    const [
      vehiclesResult,
      fuelLoadsResult,
      maintenanceLogsResult,
      plantAssetsResult,
      dailyOperationsResult,
      incidentsResult,
      maintenanceChecksResult,
      vehicleRoutesResult,
      maintenanceRequestsResult,
      documentExpirationsResult,
    ] = await Promise.all([
      equipmentLogService.getVehicles(),
      equipmentLogService.getFuelLoads(),
      equipmentLogService.getMaintenanceLogs(),
      equipmentLogService.getPlantAssets(),
      equipmentLogService.getDailyOperations(),
      equipmentLogService.getIncidents(),
      equipmentLogService.getMaintenanceChecks(),
      equipmentLogService.getVehicleRoutes(),
      equipmentLogService.getMaintenanceRequests(),
      equipmentLogService.getDocumentExpirations(),
    ]);
    setExporting(false);

    const results = [
      vehiclesResult,
      fuelLoadsResult,
      maintenanceLogsResult,
      plantAssetsResult,
      dailyOperationsResult,
      incidentsResult,
      maintenanceChecksResult,
      vehicleRoutesResult,
      maintenanceRequestsResult,
      documentExpirationsResult,
    ];
    const failed = results.find((result) => !result.success);
    if (failed) {
      addToast(failed.error, 'error');
      return;
    }

    exportService.exportEquipmentLogToExcel({
      vehicles: vehiclesResult.data || [],
      fuelLoads: fuelLoadsResult.data || [],
      maintenanceLogs: maintenanceLogsResult.data || [],
      plantAssets: plantAssetsResult.data || [],
      dailyOperations: dailyOperationsResult.data || [],
      incidents: incidentsResult.data || [],
      maintenanceChecks: maintenanceChecksResult.data || [],
      vehicleRoutes: vehicleRoutesResult.data || [],
      maintenanceRequests: maintenanceRequestsResult.data || [],
      documentExpirations: documentExpirationsResult.data || [],
    }, 'libro_registro_equipo.xlsx', 'todo');
    addToast('Excel exportado correctamente.', 'success');
  };

  const createButton = canManageMasterData && activeTab === 'vehicles' ? (
      <VehicleFormDialog
        drivers={activeDrivers}
        onSaved={loadCurrentTab}
        trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nuevo vehículo</Button>}
      />
    ) : canEditRoutes && activeTab === 'routes' ? (
      <VehicleRouteFormDialog
        vehicles={vehicles}
        drivers={activeDrivers}
        defaultDriverId={activeDriverId}
        onSaved={loadCurrentTab}
        trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nuevo recorrido</Button>}
      />
    ) : canCreateFuelLoads && activeTab === 'fuel' ? (
      <FuelLoadFormDialog
        vehicles={vehicles}
        onSaved={loadCurrentTab}
        canEditMileage
        trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nueva carga</Button>}
      />
    ) : canEditMaintenanceRequests && activeTab === 'maintenance' ? (
      <MaintenanceRequestFormDialog
        vehicles={vehicles}
        drivers={activeDrivers}
        defaultDriverId={activeDriverId}
        isAdmin={isAdmin}
        onSaved={loadCurrentTab}
        trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Informar mantenimiento</Button>}
      />
    ) : canEditDocumentExpirations && activeTab === 'expirations' ? (
      <DocumentExpirationFormDialog
        vehicles={vehicles}
        drivers={activeDrivers}
        onSaved={loadCurrentTab}
        trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nuevo vencimiento</Button>}
      />
    ) : canManageMasterData && activeTab === 'drivers' ? (
      <DriverFormDialog
        onSaved={loadCurrentTab}
        trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nuevo chofer</Button>}
      />
    ) : canManageMasterData && activeTab === 'plant' ? (
      <PlantFormDialog
        users={users}
        onSaved={loadCurrentTab}
        trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nuevo equipo de planta</Button>}
      />
    ) : canEditOperationalRecords && activeTab === 'operation' ? (
      <EquipmentRecordFormDialog
        type="operation"
        vehicles={vehicles}
        plantAssets={plantAssets}
        onSaved={loadCurrentTab}
        trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nueva operación</Button>}
      />
    ) : canEditIncidents && activeTab === 'incidents' ? (
      <EquipmentRecordFormDialog
        type="incident"
        vehicles={vehicles}
        plantAssets={plantAssets}
        onSaved={loadCurrentTab}
        trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nueva incidencia</Button>}
      />
    ) : canEditOperationalRecords && activeTab === 'checks' ? (
      <EquipmentRecordFormDialog
        type="check"
        vehicles={vehicles}
        plantAssets={plantAssets}
        onSaved={loadCurrentTab}
        trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nueva revisión</Button>}
      />
    ) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-[#1e3a8a] dark:bg-blue-900/40 dark:text-blue-100">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-50">Registro de equipo y planta</h1>
              <p className="text-base text-gray-600 dark:text-slate-300">Control interno de vehículos, mantenimiento, combustible y sectores operativos de planta.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={handleExportEquipmentLog} disabled={exporting} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {exporting ? 'Exportando...' : 'Exportar Excel'}
            </Button>
            {createButton}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px,1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="mb-2 flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-blue-50 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <span className="flex items-center gap-2">
              <Menu className="h-4 w-4" />
              Secciones
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${mobileNavOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`${mobileNavOpen ? 'grid' : 'hidden'} gap-2 lg:grid`}>
            <button
              type="button"
              onClick={() => handleTabSelect('summary')}
              className={`flex items-center justify-start gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                activeTab === 'summary'
                  ? 'bg-[#1e3a8a] text-white shadow-sm'
                  : 'text-gray-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <ClipboardList className="h-5 w-5" />
              Resumen
            </button>
            {navGroups.map((group) => {
              const GroupIcon = group.icon;
              const open = openNavGroup === group.key;
              const groupActive = group.tabs.includes(activeTab);
              return (
                <div key={group.key} className="rounded-xl border border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOpenNavGroup(open ? '' : group.key)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                      groupActive
                        ? 'text-[#1e3a8a] dark:text-blue-200'
                        : 'text-gray-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <GroupIcon className="h-5 w-5" />
                      {group.label}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid overflow-hidden transition-[grid-template-rows] duration-150 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="min-h-0">
                      <div className="space-y-1 px-2 pb-2">
                        {group.tabs.map((key) => {
                          const tab = tabByKey[key];
                          if (!tab) return null;
                          const Icon = tab.icon;
                          const active = activeTab === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleTabSelect(key)}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                                active
                                  ? 'bg-[#1e3a8a] text-white shadow-sm'
                                  : 'text-gray-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {tabTitles[key] || tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-50">
                {tabTitles[activeTab]}
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-300">
                {tabDescriptions[activeTab]}
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className={`${inputClass} pl-9`}
                placeholder={activeTab === 'vehicles' ? 'Buscar patente, nombre o marca' : activeTab === 'drivers' ? 'Buscar chofer o teléfono' : 'Buscar equipo, detalle o fecha'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="p-10"><LoadingSpinner /></div>
          ) : activeTab === 'summary' ? (
            <VehicleModuleSummary
              vehicles={vehicles}
              vehicleRoutes={vehicleRoutes}
              fuelLoads={fuelLoads}
              maintenanceRequests={maintenanceRequests}
              documentExpirations={documentExpirations}
              plantAssets={plantAssets}
              incidents={incidents}
              maintenanceChecks={maintenanceChecks}
            />
          ) : activeTab === 'vehicles' ? (
            <VehiclesList
              vehicles={vehicles}
              fuelLoads={fuelLoads}
              maintenanceLogs={maintenanceLogs}
              vehicleRoutes={vehicleRoutes}
              maintenanceRequests={maintenanceRequests}
              selectedVehicleHistory={selectedEquipmentHistory}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={handleVehicleSelect}
              users={users}
              drivers={drivers}
              canEdit={canManageMasterData}
              canCreateFuelLoads={canCreateFuelLoads}
              canEditFuelLoads={canEditFuelLoads}
              canDeleteFuelLoads={canDeleteFuelLoads}
              canCreateMaintenanceLogs={canCreateMaintenanceLogs}
              canEditMaintenanceLogs={canEditMaintenanceLogs}
              canDeleteMaintenanceLogs={canDeleteMaintenanceLogs}
              canEditMileage={isAdmin}
              onSaved={loadCurrentTab}
              onDeactivate={handleArchiveVehicle}
              onDeleteFuelLoad={handleDeleteFuelLoad}
              onDeleteMaintenanceLog={handleDeleteMaintenanceLog}
            />
          ) : activeTab === 'routes' ? (
            <VehicleRoutesList
              routes={vehicleRoutes}
              vehicles={vehicles}
              drivers={drivers}
              search={search}
              canEdit={canEditRoutes}
              canDelete={canDeleteRoutes}
              defaultDriverId={activeDriverId}
              onSaved={loadCurrentTab}
              onDelete={handleDeleteVehicleRoute}
            />
          ) : activeTab === 'fuel' ? (
            <FuelLoadsSection
              vehicles={vehicles}
              selectedVehicle={{ license_plate: 'todos los vehículos' }}
              fuelLoads={fuelLoads}
              canCreate={canCreateFuelLoads}
              canEdit={canEditFuelLoads}
              canDelete={canDeleteFuelLoads}
              canEditMileage={isAdmin}
              onSaved={loadCurrentTab}
              onDelete={handleDeleteFuelLoad}
            />
          ) : activeTab === 'maintenance' ? (
            <MaintenanceRequestsList
              requests={maintenanceRequests}
              vehicles={vehicles}
              drivers={drivers}
              search={search}
              canEdit={canEditMaintenanceRequests}
              canDelete={canDeleteMaintenanceRequests}
              isAdmin={isAdmin}
              defaultDriverId={activeDriverId}
              onSaved={loadCurrentTab}
              onDelete={handleDeleteMaintenanceRequest}
            />
          ) : activeTab === 'expirations' ? (
            <DocumentExpirationsList
              expirations={documentExpirations}
              vehicles={vehicles}
              drivers={drivers}
              search={search}
              canEdit={canEditDocumentExpirations}
              canDelete={canDeleteDocumentExpirations}
              onSaved={loadCurrentTab}
              onDelete={handleDeleteDocumentExpiration}
            />
          ) : activeTab === 'driverHistory' ? (
            <DriverHistoryList
              drivers={drivers}
              routes={vehicleRoutes}
              maintenanceRequests={maintenanceRequests}
              fuelLoads={fuelLoads}
              expirations={documentExpirations}
              vehicles={vehicles}
              search={search}
            />
          ) : activeTab === 'drivers' ? (
            <DriversList
              drivers={drivers}
              search={search}
              statusFilter={driverStatusFilter}
              onStatusFilterChange={setDriverStatusFilter}
              canEdit={canManageMasterData}
              onSaved={loadCurrentTab}
              onArchive={handleArchiveDriver}
              onReactivate={handleReactivateDriver}
              togglingDriverId={togglingDriverId}
            />
          ) : activeTab === 'plant' ? (
            <PlantAssetsList assets={plantAssets} users={users} canEdit={canManageMasterData} onSaved={loadCurrentTab} onDelete={handleDeletePlantAsset} />
          ) : activeTab === 'operation' ? (
            <EquipmentDailyOperationsList
              records={dailyOperations}
              vehicles={vehicles}
              plantAssets={plantAssets}
              search={search}
              canEdit={canEditOperationalRecords}
              canDelete={canEditOperationalRecords}
              onSaved={loadCurrentTab}
              onDelete={handleDeleteDailyOperation}
            />
          ) : activeTab === 'incidents' ? (
            <EquipmentIncidentsList
              records={incidents}
              vehicles={vehicles}
              plantAssets={plantAssets}
              search={search}
              canEdit={canEditIncidents}
              canDelete={canDeleteIncidents}
              onSaved={loadCurrentTab}
              onDelete={handleDeleteIncident}
            />
          ) : (
            <EquipmentMaintenanceChecksList
              records={maintenanceChecks}
              vehicles={vehicles}
              plantAssets={plantAssets}
              search={search}
              canEdit={canEditOperationalRecords}
              canDelete={canEditOperationalRecords}
              onSaved={loadCurrentTab}
              onDelete={handleDeleteMaintenanceCheck}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const isDateWithinDays = (value, days) => {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  return target >= today && target <= limit;
};

const daysUntil = (value) => {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
};

const documentVisualStatus = (expiration) => {
  const remaining = daysUntil(expiration.expires_at);
  if (remaining === null) return expiration.status || 'vigente';
  if (remaining < 0) return 'vencido';
  if (remaining <= 30) return 'proximo_a_vencer';
  return expiration.status || 'vigente';
};

function EquipmentSummaryCards({ vehicles, maintenanceLogs, plantAssets, vehicleRoutes = [], fuelLoads = [], maintenanceRequests = [], documentExpirations = [] }) {
  const activeVehicles = vehicles.filter((vehicle) => vehicle.status === 'activo').length;
  const today = todayInputDate();
  const todayRoutes = vehicleRoutes.filter((route) => route.route_date === today);
  const todayKm = todayRoutes.reduce((total, route) => total + Number(route.kilometers_traveled || 0), 0);
  const upcomingExpirations = documentExpirations.filter((expiration) => documentVisualStatus(expiration) === 'proximo_a_vencer').length;
  const expiredDocuments = documentExpirations.filter((expiration) => documentVisualStatus(expiration) === 'vencido').length;
  const pendingMaintenance = maintenanceRequests.filter((request) => !['realizado', 'cancelado'].includes(request.status)).length + maintenanceLogs.filter((log) => isDateWithinDays(log.next_control_date, 30)).length;
  const highPriorityMaintenance = maintenanceRequests.filter((request) => request.priority === 'alta' && !['realizado', 'cancelado'].includes(request.status)).length;
  const plantNews = plantAssets.filter((asset) => (
    ['mantenimiento', 'requiere_revision'].includes(asset.status) || Boolean(asset.notes?.trim())
  )).length;

  const cards = [
    { label: 'Vehículos activos', value: activeVehicles, detail: vehicles.length ? `${vehicles.length} en registro` : 'Sin vehículos cargados', icon: Car, tone: 'normal' },
    { label: 'Recorridos del día', value: todayRoutes.length, detail: `${formatNumber(todayKm, 0)} km recorridos`, icon: CalendarClock, tone: 'normal' },
    { label: 'Cargas recientes', value: fuelLoads.slice(0, 5).length, detail: 'Últimos registros de combustible', icon: Fuel, tone: 'normal' },
    { label: 'Mantenimientos pendientes', value: pendingMaintenance, detail: `${highPriorityMaintenance} de prioridad alta`, icon: Wrench, tone: highPriorityMaintenance > 0 ? 'warning' : pendingMaintenance > 0 ? 'notice' : 'normal' },
    { label: 'Vencimientos próximos', value: upcomingExpirations, detail: `${expiredDocuments} vencidos`, icon: AlertCircle, tone: expiredDocuments > 0 ? 'critical' : upcomingExpirations > 0 ? 'warning' : 'normal' },
    { label: 'Novedades de planta', value: plantNews, detail: 'Revisión, mantenimiento u observaciones', icon: Building2, tone: plantNews > 0 ? 'notice' : 'normal' },
  ];
  const toneClass = {
    normal: 'border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900',
    notice: 'border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/30',
    warning: 'border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30',
    critical: 'border-red-200 bg-red-50/80 dark:border-red-900/60 dark:bg-red-950/30',
  };
  const iconClass = {
    normal: 'bg-blue-100 text-[#1e3a8a] dark:bg-blue-900/40 dark:text-blue-100',
    notice: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-100',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-100',
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`rounded-lg border p-3 shadow-sm ${toneClass[card.tone]}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-gray-600 dark:text-slate-300">{card.label}</p>
                <p className="mt-0.5 text-2xl font-bold leading-tight text-gray-900 dark:text-slate-50">{card.value}</p>
                <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-slate-400">{card.detail}</p>
              </div>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass[card.tone]}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VehicleModuleSummary({ vehicles, vehicleRoutes, fuelLoads, maintenanceRequests, documentExpirations, plantAssets, incidents, maintenanceChecks }) {
  const openPlantIncidents = incidents.filter((incident) => incident.plant_asset_id).length;
  const pendingPlantChecks = maintenanceChecks.filter((check) => check.plant_asset_id && isDateWithinDays(check.next_review_date, 30));
  const plantNews = plantAssets.filter((asset) => (
    ['mantenimiento', 'requiere_revision'].includes(asset.status) || Boolean(asset.notes?.trim())
  ));
  const pendingMaintenance = maintenanceRequests.filter((request) => !['realizado', 'cancelado'].includes(request.status));
  const urgentMaintenance = pendingMaintenance.filter((request) => request.priority === 'alta');
  const urgentExpirations = documentExpirations.filter((expiration) => ['proximo_a_vencer', 'vencido'].includes(documentVisualStatus(expiration)));
  const summarySections = [
    {
      title: 'Vencimientos',
      items: urgentExpirations.slice(0, 5),
      tone: urgentExpirations.some((expiration) => documentVisualStatus(expiration) === 'vencido') ? 'critical' : urgentExpirations.length > 0 ? 'warning' : 'normal',
      priority: urgentExpirations.length > 0 ? 0 : 2,
      renderItem: (expiration) => `${documentTypeLabels[expiration.document_type]} - ${formatDate(expiration.expires_at)} - ${documentStatusLabels[documentVisualStatus(expiration)]}`,
    },
    {
      title: 'Mantenimientos pendientes',
      items: pendingMaintenance.slice(0, 5),
      tone: urgentMaintenance.length > 0 ? 'warning' : pendingMaintenance.length > 0 ? 'notice' : 'normal',
      priority: urgentMaintenance.length > 0 ? 0 : pendingMaintenance.length > 0 ? 1 : 2,
      renderItem: (request) => `${maintenancePriorityLabels[request.priority]} - ${vehicleLabel(request.vehicle)} - ${request.issue_type}`,
    },
    {
      title: 'Cargas recientes',
      items: fuelLoads.slice(0, 5),
      tone: 'normal',
      priority: 2,
      renderItem: (load) => `${formatDate(load.load_date)} - ${vehicleLabel(load.vehicle)} - ${formatNumber(load.liters, 2)} L`,
    },
    {
      title: 'Planta con novedades',
      items: plantNews.slice(0, 5),
      tone: plantNews.length > 0 ? 'notice' : 'normal',
      priority: plantNews.length > 0 ? 1 : 2,
      renderItem: (asset) => `${asset.name} - ${statusLabels[asset.status] || asset.status}${asset.notes ? ` - ${asset.notes}` : ''}`,
    },
    {
      title: 'Incidencias de planta',
      items: openPlantIncidents > 0 ? [{ id: 'plant-incidents', text: `${openPlantIncidents} registradas` }] : [],
      tone: openPlantIncidents > 0 ? 'warning' : 'normal',
      priority: openPlantIncidents > 0 ? 1 : 2,
      renderItem: (item) => item.text,
    },
    {
      title: 'Calibraciones pendientes',
      items: pendingPlantChecks.slice(0, 5),
      tone: pendingPlantChecks.length > 0 ? 'warning' : 'normal',
      priority: pendingPlantChecks.length > 0 ? 1 : 2,
      renderItem: (check) => `${formatDate(check.next_review_date)} - ${equipmentLabel(check)} - ${inspectionTypeLabels[check.inspection_type] || check.inspection_type}`,
    },
  ].sort((a, b) => a.priority - b.priority);
  return (
    <div className="space-y-4 p-4">
      <EquipmentSummaryCards vehicles={vehicles} vehicleRoutes={vehicleRoutes} fuelLoads={fuelLoads} maintenanceRequests={maintenanceRequests} documentExpirations={documentExpirations} maintenanceLogs={[]} plantAssets={plantAssets} />
      <div className="grid items-start gap-3 xl:grid-cols-3">
        {summarySections.map((section) => (
          <SummaryMiniList
            key={section.title}
            title={section.title}
            items={section.items}
            tone={section.tone}
            renderItem={section.renderItem}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryMiniList({ title, items, renderItem, tone = 'normal' }) {
  const toneClass = {
    normal: 'border-gray-100 dark:border-slate-800',
    notice: 'border-blue-200 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/20',
    warning: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20',
    critical: 'border-red-200 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/20',
  };
  return (
    <div className={`rounded-lg border p-3 ${toneClass[tone]}`}>
      <h3 className="text-sm font-bold text-gray-900 dark:text-slate-50">{title}</h3>
      {items.length === 0 ? (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:bg-slate-800/70 dark:text-slate-300">
          <ClipboardList className="h-4 w-4 shrink-0" />
          <span>No hay registros para mostrar.</span>
        </div>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm text-gray-700 dark:text-slate-200">
          {items.map((item) => <li key={item.id} className="rounded-md bg-white/70 px-3 py-2 shadow-sm ring-1 ring-gray-100 dark:bg-slate-800 dark:ring-slate-700">{renderItem(item)}</li>)}
        </ul>
      )}
    </div>
  );
}

function VehiclesList({
  vehicles,
  fuelLoads,
  maintenanceLogs,
  vehicleRoutes,
  maintenanceRequests,
  selectedVehicleHistory,
  selectedVehicleId,
  onSelectVehicle,
  users,
  drivers,
  canEdit,
  canCreateFuelLoads,
  canEditFuelLoads,
  canDeleteFuelLoads,
  canCreateMaintenanceLogs,
  canEditMaintenanceLogs,
  canDeleteMaintenanceLogs,
  canEditMileage,
  onSaved,
  onDeactivate,
  onDeleteFuelLoad,
  onDeleteMaintenanceLog,
}) {
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || null;
  const selectedFuelLoads = selectedVehicleId ? fuelLoads.filter((load) => load.vehicle_id === selectedVehicleId) : [];
  const selectedMaintenanceLogs = selectedVehicleId ? maintenanceLogs.filter((log) => log.vehicle_id === selectedVehicleId) : [];

  return (
    <div className="divide-y divide-gray-100 dark:divide-slate-800">
      {vehicles.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-base font-semibold text-gray-900 dark:text-slate-50">Todavía no hay vehículos registrados.</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Agregá el primero para comenzar a cargar combustible, mantenimiento y vencimientos.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-5 py-3">Patente</th>
                <th className="px-5 py-3">Vehículo</th>
                <th className="px-5 py-3">Chofer</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Kilometraje actual</th>
                <th className="px-5 py-3">Vencimientos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {vehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  onClick={() => onSelectVehicle(vehicle.id)}
                  className={`cursor-pointer align-top hover:bg-gray-50 dark:hover:bg-slate-800/70 ${selectedVehicleId === vehicle.id ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}
                >
                  <td className="px-5 py-4 font-bold text-gray-900 dark:text-slate-50">{vehicle.license_plate}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">
                    <p className="font-semibold">{vehicle.name || vehicleTypeLabels[vehicle.vehicle_type] || 'Vehículo'}</p>
                    <p>{[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ') || '-'}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{vehicleDriverLabel(vehicle)}</td>
                  <td className="px-5 py-4"><Badge value={vehicle.status}>{statusLabels[vehicle.status]}</Badge></td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">
                    <p className="font-semibold text-gray-900 dark:text-slate-50">{vehicle.mileage_end ?? vehicle.mileage_start ?? '-'}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Inicio: {vehicle.mileage_start ?? '-'} | Cierre: {vehicle.mileage_end ?? '-'}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">
                    <p>Registro: {vehicle.registration_expires_at ? formatDate(vehicle.registration_expires_at) : '-'}</p>
                    <p>Seguro: {vehicle.insurance_expires_at ? formatDate(vehicle.insurance_expires_at) : '-'}</p>
                    <p>VTV/RTO: {vehicle.inspection_expires_at ? formatDate(vehicle.inspection_expires_at) : '-'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedVehicle && (
        <VehicleDetail
          vehicle={selectedVehicle}
          vehicles={vehicles}
          fuelLoads={selectedFuelLoads}
          maintenanceLogs={selectedMaintenanceLogs}
          vehicleRoutes={vehicleRoutes.filter((route) => route.vehicle_id === selectedVehicleId)}
          maintenanceRequests={maintenanceRequests.filter((request) => request.vehicle_id === selectedVehicleId)}
          history={selectedVehicleHistory}
          users={users}
          drivers={drivers}
          canEdit={canEdit}
          canCreateFuelLoads={canCreateFuelLoads}
          canEditFuelLoads={canEditFuelLoads}
          canDeleteFuelLoads={canDeleteFuelLoads}
          canCreateMaintenanceLogs={canCreateMaintenanceLogs}
          canEditMaintenanceLogs={canEditMaintenanceLogs}
          canDeleteMaintenanceLogs={canDeleteMaintenanceLogs}
          canEditMileage={canEditMileage}
          onSaved={onSaved}
          onDeactivate={onDeactivate}
          onDeleteFuelLoad={onDeleteFuelLoad}
          onDeleteMaintenanceLog={onDeleteMaintenanceLog}
        />
      )}
    </div>
  );
}

function VehicleDetail({
  vehicle,
  vehicles,
  fuelLoads,
  maintenanceLogs,
  vehicleRoutes,
  maintenanceRequests,
  history,
  users,
  drivers,
  canEdit,
  canCreateFuelLoads,
  canEditFuelLoads,
  canDeleteFuelLoads,
  canCreateMaintenanceLogs,
  canEditMaintenanceLogs,
  canDeleteMaintenanceLogs,
  canEditMileage,
  onSaved,
  onDeactivate,
  onDeleteFuelLoad,
  onDeleteMaintenanceLog,
}) {
  return (
    <div className="space-y-5 p-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">Detalle del vehículo seleccionado</p>
            <h3 className="mt-1 text-xl font-bold text-gray-900 dark:text-slate-50">{vehicle.license_plate}</h3>
            <p className="text-sm text-gray-700 dark:text-slate-200">{[vehicle.name || vehicleTypeLabels[vehicle.vehicle_type], vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' - ') || 'Vehículo'}</p>
            <div className="mt-3 grid gap-2 text-sm text-gray-700 dark:text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              <p><span className="font-semibold">Chofer:</span> {vehicleDriverLabel(vehicle)}</p>
              <p><span className="font-semibold">Estado:</span> {statusLabels[vehicle.status] || vehicle.status}</p>
              <p><span className="font-semibold">Km actual:</span> {vehicle.mileage_end ?? vehicle.mileage_start ?? '-'}</p>
              <p><span className="font-semibold">Seguro:</span> {vehicle.insurance_expires_at ? formatDate(vehicle.insurance_expires_at) : '-'}</p>
              <p><span className="font-semibold">VTV/RTO:</span> {vehicle.inspection_expires_at ? formatDate(vehicle.inspection_expires_at) : '-'}</p>
              <p><span className="font-semibold">Registro:</span> {vehicle.registration_expires_at ? formatDate(vehicle.registration_expires_at) : '-'}</p>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <VehicleFormDialog
                vehicle={vehicle}
                drivers={drivers}
                onSaved={onSaved}
                trigger={<Button variant="outline"><Edit2 className="mr-2 h-4 w-4" /> Editar</Button>}
              />
              <ConfirmationModal
                title="¿Eliminar vehículo del listado activo?"
                description="El vehículo se archivará y conservará su historial en la base de datos."
                confirmLabel="Sí, eliminar"
                onConfirm={() => onDeactivate(vehicle.id)}
                trigger={<Button variant="outline"><Ban className="mr-2 h-4 w-4 text-red-600" /> Eliminar</Button>}
              />
            </div>
          )}
        </div>
      </div>
      <FuelLoadsSection
        vehicles={vehicles}
        selectedVehicle={vehicle}
        fuelLoads={fuelLoads}
        canCreate={canCreateFuelLoads}
        canEdit={canEditFuelLoads}
        canDelete={canDeleteFuelLoads}
        canEditMileage={canEditMileage}
        onSaved={onSaved}
        onDelete={onDeleteFuelLoad}
      />
      <MaintenanceLogsSection
        vehicles={vehicles}
        selectedVehicle={vehicle}
        maintenanceLogs={maintenanceLogs}
        canCreate={canCreateMaintenanceLogs}
        canEdit={canEditMaintenanceLogs}
        canDelete={canDeleteMaintenanceLogs}
        canEditMileage={canEditMileage}
        onSaved={onSaved}
        onDelete={onDeleteMaintenanceLog}
      />
      <VehicleHistorySection vehicle={vehicle} history={history} routes={vehicleRoutes} maintenanceRequests={maintenanceRequests} />
    </div>
  );
}

function VehicleHistorySection({ vehicle, history, routes, maintenanceRequests }) {
  const vehicleHistory = history || [];
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Historial del vehículo</h3>
        <p className="text-sm text-gray-500 dark:text-slate-300">Recorridos, combustible, mantenimientos y avisos asociados a {vehicle.license_plate}.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryMiniList title="Recorridos recientes" items={routes.slice(0, 4)} renderItem={(route) => `${formatDate(route.route_date)} - ${driverLabel(route.driver)} - ${route.kilometers_traveled} km - ${(route.visited_places || []).join(' -> ')}`} />
        <SummaryMiniList title="Avisos recientes" items={maintenanceRequests.slice(0, 4)} renderItem={(request) => `${formatDate(request.request_date)} - ${maintenanceRequestStatusLabels[request.status]} - ${request.issue_type}`} />
      </div>
      {vehicleHistory.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">
          No hay historial adicional para este vehículo.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Descripción</th>
                <th className="px-5 py-3">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {vehicleHistory.map((event) => (
                <tr key={event.id} className="align-top">
                  <td className="px-5 py-4 font-semibold text-gray-900 dark:text-slate-50">{event.label}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{event.date ? formatDate(event.date) : '-'}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{event.description || '-'}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{event.responsible || vehicleDriverLabel(vehicle)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FuelLoadsSection({ vehicles, selectedVehicle, fuelLoads, canCreate, canEdit, canDelete, canEditMileage, onSaved, onDelete }) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
            <Fuel className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Cargas de combustible</h3>
            <p className="text-sm text-gray-500 dark:text-slate-300">Historial de {selectedVehicle.license_plate}.</p>
          </div>
        </div>
        {canCreate && (
          <FuelLoadFormDialog
            vehicles={vehicles}
            selectedVehicleId={selectedVehicle?.id || ''}
            onSaved={onSaved}
            canEditMileage
            trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nueva carga</Button>}
          />
        )}
      </div>

      {fuelLoads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-gray-600 dark:border-slate-700 dark:text-slate-300">
          No hay cargas de combustible para este vehículo.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-5 py-3">Vehículo</th>
                <th className="px-5 py-3">Chofer relacionado</th>
                <th className="px-5 py-3">Fecha y hora</th>
                <th className="px-5 py-3">Precio</th>
                <th className="px-5 py-3">Litros</th>
                <th className="px-5 py-3">Kilometraje</th>
                <th className="px-5 py-3">Km desde anterior</th>
                <th className="px-5 py-3">Consumo / 100 km</th>
                <th className="px-5 py-3">Costo / km</th>
                <th className="px-5 py-3">Observaciones</th>
                {(canEdit || canDelete) && <th className="px-5 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {fuelLoads.map((load) => (
                <tr key={load.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/70">
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">
                    <p className="font-semibold text-gray-900 dark:text-slate-50">{load.vehicle?.license_plate || '-'}</p>
                    <p>{[load.vehicle?.name || load.vehicle?.brand, load.vehicle?.model].filter(Boolean).join(' ') || '-'}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{load.vehicle?.assigned_driver_profile?.name || '-'}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">
                    <p>{formatDate(load.load_date)}</p>
                    <p>{load.estimated_time?.slice(0, 5) || '-'}</p>
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-900 dark:text-slate-50">{formatCurrency(load.price_ars)}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{formatNumber(load.liters, 2)} L</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{load.mileage ?? '-'}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{load.has_consumption_metrics ? formatNumber(load.kilometers_since_previous, 0) : 'Sin datos suficientes'}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{load.has_consumption_metrics ? `${formatNumber(load.consumption_liters_per_100km, 2)} L` : 'Sin datos suficientes'}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{load.has_consumption_metrics ? formatCurrency(load.cost_per_km) : 'Sin datos suficientes'}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{load.notes || '-'}</td>
                  {(canEdit || canDelete) && (
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <FuelLoadFormDialog
                            fuelLoad={load}
                            vehicles={vehicles}
                            onSaved={onSaved}
                            canEditMileage={canEditMileage}
                            trigger={<Button variant="ghost" size="icon"><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
                          />
                        )}
                        {canDelete && (
                          <ConfirmationModal
                            title="¿Eliminar carga de combustible?"
                            description="La carga se eliminará definitivamente."
                            confirmLabel="Sí, eliminar"
                            onConfirm={() => onDelete(load.id)}
                            trigger={<Button variant="ghost" size="icon"><Trash2 className="h-5 w-5 text-red-600" /></Button>}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MaintenanceLogsSection({ vehicles, selectedVehicle, maintenanceLogs, canCreate, canEdit, canDelete, canEditMileage, onSaved, onDelete }) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Mantenimiento</h3>
            <p className="text-sm text-gray-500 dark:text-slate-300">Historial técnico de {selectedVehicle.license_plate}.</p>
          </div>
        </div>
        {canCreate && (
          <MaintenanceLogFormDialog
            vehicles={vehicles}
            selectedVehicleId={selectedVehicle?.id || ''}
            onSaved={onSaved}
            canEditMileage
            trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nuevo mantenimiento</Button>}
          />
        )}
      </div>

      {maintenanceLogs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-gray-600 dark:border-slate-700 dark:text-slate-300">
          No hay mantenimientos registrados para este vehículo.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-5 py-3">Vehículo</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Detalle</th>
                <th className="px-5 py-3">Kilometraje</th>
                <th className="px-5 py-3">Valor</th>
                <th className="px-5 py-3">Próximo control</th>
                {(canEdit || canDelete) && <th className="px-5 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {maintenanceLogs.map((log) => (
                <tr key={log.id} className="align-top hover:bg-gray-50 dark:hover:bg-slate-800/70">
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">
                    <p className="font-semibold text-gray-900 dark:text-slate-50">{log.vehicle?.license_plate || '-'}</p>
                    <p>{[log.vehicle?.name || log.vehicle?.brand, log.vehicle?.model].filter(Boolean).join(' ') || '-'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
                      {maintenanceTypeLabels[log.maintenance_type] || log.maintenance_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{formatDate(log.maintenance_date)}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{log.detail}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{log.mileage}</td>
                  <td className="px-5 py-4 font-semibold text-gray-900 dark:text-slate-50">{log.value_ars === null || log.value_ars === undefined ? '-' : formatCurrency(log.value_ars)}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">
                    <p>{log.next_control_date ? formatDate(log.next_control_date) : '-'}</p>
                    {log.notes && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{log.notes}</p>}
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <MaintenanceLogFormDialog
                            maintenanceLog={log}
                            vehicles={vehicles}
                            onSaved={onSaved}
                            canEditMileage={canEditMileage}
                            trigger={<Button variant="ghost" size="icon"><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
                          />
                        )}
                        {canDelete && (
                          <ConfirmationModal
                            title="¿Eliminar mantenimiento?"
                            description="El mantenimiento se eliminará definitivamente."
                            confirmLabel="Sí, eliminar"
                            onConfirm={() => onDelete(log.id)}
                            trigger={<Button variant="ghost" size="icon"><Trash2 className="h-5 w-5 text-red-600" /></Button>}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VehicleRoutesList({ routes, vehicles, drivers, search, canEdit, canDelete, defaultDriverId, onSaved, onDelete }) {
  const filtered = filterEquipmentRecords(routes, search);
  return (
    <EquipmentRecordTable
      emptyTitle="No hay recorridos registrados."
      emptyDetail="Cargá recorridos diarios con vehículo, chofer, kilometraje y lugares visitados."
      headers={['Fecha', 'Vehículo', 'Chofer', 'Km inicial', 'Km final', 'Km recorridos', 'Lugares', 'Observaciones']}
      records={filtered}
      renderCells={(route) => [
        formatDate(route.route_date),
        vehicleLabel(route.vehicle),
        driverLabel(route.driver),
        route.mileage_start,
        route.mileage_end,
        route.kilometers_traveled,
        (route.visited_places || []).join(' -> '),
        route.observations || '-',
      ]}
      canEdit={canEdit}
      canDelete={canDelete}
      editDialog={(route) => (
        <VehicleRouteFormDialog
          route={route}
          vehicles={vehicles}
          drivers={drivers}
          defaultDriverId={defaultDriverId}
          onSaved={onSaved}
          trigger={<Button variant="ghost" size="icon"><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
        />
      )}
      onDelete={onDelete}
      deleteTitle="¿Eliminar recorrido?"
    />
  );
}

function MaintenanceRequestsList({ requests, vehicles, drivers, search, canEdit, canDelete, isAdmin, defaultDriverId, onSaved, onDelete }) {
  const filtered = filterEquipmentRecords(requests, search);
  const unresolved = requests.filter((request) => !['realizado', 'cancelado'].includes(request.status));
  const highPriority = unresolved.filter((request) => request.priority === 'alta').length;
  const vehiclesWithOpen = new Set(unresolved.map((request) => request.vehicle_id).filter(Boolean)).size;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <SummaryMiniList title="Pendientes" items={[{ id: 'pending', text: String(unresolved.length) }]} renderItem={(item) => item.text} />
        <SummaryMiniList title="Prioridad alta" items={[{ id: 'high', text: String(highPriority) }]} renderItem={(item) => item.text} />
        <SummaryMiniList title="Vehículos sin resolver" items={[{ id: 'vehicles', text: String(vehiclesWithOpen) }]} renderItem={(item) => item.text} />
      </div>
      <EquipmentRecordTable
        emptyTitle="No hay avisos de mantenimiento."
        emptyDetail="Los choferes pueden informar problemas o solicitudes con descripción libre."
        headers={['Fecha', 'Vehículo', 'Chofer', 'Problema', 'Prioridad', 'Estado', 'Km', 'Descripción', 'Observaciones admin']}
        records={filtered}
        renderCells={(request) => [
          formatDate(request.request_date),
          vehicleLabel(request.vehicle),
          driverLabel(request.driver),
          request.issue_type,
          <Badge value={request.priority}>{maintenancePriorityLabels[request.priority]}</Badge>,
          <Badge value={request.status}>{maintenanceRequestStatusLabels[request.status]}</Badge>,
          request.current_mileage ?? '-',
          request.description,
          request.admin_notes || '-',
        ]}
        canEdit={canEdit}
        canDelete={canDelete}
        editDialog={(request) => (
          <MaintenanceRequestFormDialog
            request={request}
            vehicles={vehicles}
            drivers={drivers}
            defaultDriverId={defaultDriverId}
            isAdmin={isAdmin}
            onSaved={onSaved}
            trigger={<Button variant="ghost" size="icon"><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
          />
        )}
        onDelete={onDelete}
        deleteTitle="¿Eliminar aviso de mantenimiento?"
      />
    </div>
  );
}

function DocumentExpirationsList({ expirations, vehicles, drivers, search, canEdit, canDelete, onSaved, onDelete }) {
  const filtered = filterEquipmentRecords(expirations, search);
  return (
    <EquipmentRecordTable
      emptyTitle="No hay vencimientos registrados."
      emptyDetail="Registrá seguros, RTO, licencias u otros documentos."
      headers={['Documento', 'Asociado', 'Vence', 'Días', 'Estado', 'Última notificación', 'Observaciones']}
      records={filtered}
      renderCells={(expiration) => {
        const status = documentVisualStatus(expiration);
        const remaining = daysUntil(expiration.expires_at);
        return [
          expiration.custom_document_name || documentTypeLabels[expiration.document_type] || expiration.document_type,
          expiration.vehicle ? vehicleLabel(expiration.vehicle) : driverLabel(expiration.driver),
          formatDate(expiration.expires_at),
          remaining === null ? '-' : remaining,
          <Badge value={status}>{documentStatusLabels[status]}</Badge>,
          expiration.last_notified_at ? formatDate(expiration.last_notified_at) : '-',
          expiration.observations || '-',
        ];
      }}
      canEdit={canEdit}
      canDelete={canDelete}
      editDialog={(expiration) => (
        <DocumentExpirationFormDialog
          expiration={expiration}
          vehicles={vehicles}
          drivers={drivers}
          onSaved={onSaved}
          trigger={<Button variant="ghost" size="icon"><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
        />
      )}
      onDelete={onDelete}
      deleteTitle="¿Eliminar vencimiento?"
    />
  );
}

function DriverHistoryList({ drivers, routes, maintenanceRequests, fuelLoads, expirations, search }) {
  const term = search.trim().toLowerCase();
  const filteredDrivers = term
    ? drivers.filter((driver) => [driver.name, driver.phone, driver.notes].some((value) => String(value || '').toLowerCase().includes(term)))
    : drivers;

  if (filteredDrivers.length === 0) {
    return <div className="p-10 text-center text-sm text-gray-600 dark:text-slate-300">No hay choferes para mostrar.</div>;
  }

  return (
    <div className="space-y-4 p-4">
      {filteredDrivers.map((driver) => {
        const driverRoutes = routes.filter((route) => route.driver_id === driver.id);
        const driverRequests = maintenanceRequests.filter((request) => request.driver_id === driver.id);
        const driverFuelLoads = fuelLoads.filter((load) => load.vehicle?.assigned_driver_profile_id === driver.id);
        const driverExpirations = expirations.filter((expiration) => expiration.driver_id === driver.id);
        const totalKm = driverRoutes.reduce((total, route) => total + Number(route.kilometers_traveled || 0), 0);
        return (
          <div key={driver.id} className="rounded-lg border border-gray-100 p-4 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">{driverLabel(driver)}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-300">{driver.is_active ? 'Activo' : 'Inactivo'} - {formatNumber(totalKm, 0)} km recorridos</p>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs text-gray-600 dark:text-slate-300">
                <span>{driverRoutes.length} recorridos</span>
                <span>{driverRequests.length} avisos</span>
                <span>{driverFuelLoads.length} cargas</span>
                <span>{driverExpirations.length} vencimientos</span>
              </div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <SummaryMiniList title="Recorridos" items={driverRoutes.slice(0, 4)} renderItem={(route) => `${formatDate(route.route_date)} - ${vehicleLabel(route.vehicle)} - ${route.kilometers_traveled} km - ${(route.visited_places || []).join(' -> ')}`} />
              <SummaryMiniList title="Mantenimientos" items={driverRequests.slice(0, 4)} renderItem={(request) => `${formatDate(request.request_date)} - ${maintenanceRequestStatusLabels[request.status]} - ${request.issue_type}`} />
              <SummaryMiniList title="Combustible relacionado" items={driverFuelLoads.slice(0, 4)} renderItem={(load) => `${formatDate(load.load_date)} - ${vehicleLabel(load.vehicle)} - ${formatNumber(load.liters, 2)} L`} />
              <SummaryMiniList title="Licencias y vencimientos" items={driverExpirations.slice(0, 4)} renderItem={(expiration) => `${expiration.custom_document_name || documentTypeLabels[expiration.document_type]} - ${formatDate(expiration.expires_at)} - ${documentStatusLabels[documentVisualStatus(expiration)]}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const filterEquipmentRecords = (records, search) => {
  const term = search.trim().toLowerCase();
  if (!term) return records;
  return records.filter((record) => JSON.stringify({
    equipment: equipmentLabel(record),
    ...record,
  }).toLowerCase().includes(term));
};

function EquipmentDailyOperationsList({ records, vehicles, plantAssets, search, canEdit, canDelete, onSaved, onDelete }) {
  const filteredRecords = filterEquipmentRecords(records, search);
  return (
    <EquipmentRecordTable
      emptyTitle="No hay operaciones diarias registradas."
      emptyDetail="Cargá el primer uso diario de un vehículo o equipo de planta."
      headers={['Equipo', 'Fecha', 'Turno', 'Tiempo de uso', 'Operador', 'Observaciones']}
      records={filteredRecords}
      renderCells={(record) => [
        equipmentLabel(record),
        formatDate(record.operation_date),
        record.shift,
        record.usage_time,
        record.operator_name,
        record.observations || '-',
      ]}
      canEdit={canEdit}
      editDialog={(record) => (
        <EquipmentRecordFormDialog
          type="operation"
          record={record}
          vehicles={vehicles}
          plantAssets={plantAssets}
          onSaved={onSaved}
          trigger={<Button variant="ghost" size="icon"><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
        />
      )}
      onDelete={onDelete}
      deleteTitle="¿Eliminar operación diaria?"
      canDelete={canDelete}
    />
  );
}

function EquipmentIncidentsList({ records, vehicles, plantAssets, search, canEdit, canDelete, onSaved, onDelete }) {
  const filteredRecords = filterEquipmentRecords(records, search);
  return (
    <EquipmentRecordTable
      emptyTitle="No hay incidencias registradas."
      emptyDetail="Cargá fallas, anomalías o arreglos menores asociados a un equipo."
      headers={['Equipo', 'Fecha y hora', 'Anomalía', 'Acción correctiva', 'Fuera de línea', 'Realizado por']}
      records={filteredRecords}
      renderCells={(record) => [
        equipmentLabel(record),
        `${formatDate(record.incident_date)} ${record.incident_time ? record.incident_time.slice(0, 5) : ''}`.trim(),
        record.anomaly_description,
        record.corrective_action,
        record.downtime || '-',
        record.maintenance_done_by || '-',
      ]}
      canEdit={canEdit}
      editDialog={(record) => (
        <EquipmentRecordFormDialog
          type="incident"
          record={record}
          vehicles={vehicles}
          plantAssets={plantAssets}
          onSaved={onSaved}
          trigger={<Button variant="ghost" size="icon"><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
        />
      )}
      onDelete={onDelete}
      deleteTitle="¿Eliminar incidencia?"
      canDelete={canDelete}
    />
  );
}

function EquipmentMaintenanceChecksList({ records, vehicles, plantAssets, search, canEdit, canDelete, onSaved, onDelete }) {
  const filteredRecords = filterEquipmentRecords(records, search);
  return (
    <div className="space-y-4">
      <UpcomingChecks records={records} />
      <EquipmentRecordTable
        emptyTitle="No hay revisiones registradas."
        emptyDetail="Cargá revisiones preventivas, predictivas o calibraciones."
        headers={['Equipo', 'Revisión', 'Tipo', 'Componente', 'Estado general', 'Próxima revisión']}
        records={filteredRecords}
        renderCells={(record) => [
          equipmentLabel(record),
          formatDate(record.review_date),
          inspectionTypeLabels[record.inspection_type] || record.inspection_type,
          record.reviewed_component,
          record.general_status_observations || '-',
          formatDate(record.next_review_date),
        ]}
        canEdit={canEdit}
        editDialog={(record) => (
          <EquipmentRecordFormDialog
            type="check"
            record={record}
            vehicles={vehicles}
            plantAssets={plantAssets}
            onSaved={onSaved}
            trigger={<Button variant="ghost" size="icon"><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
          />
        )}
        onDelete={onDelete}
        deleteTitle="¿Eliminar revisión?"
        canDelete={canDelete}
      />
    </div>
  );
}

function UpcomingChecks({ records }) {
  const upcoming = records
    .filter((record) => record.next_review_date)
    .sort((a, b) => a.next_review_date.localeCompare(b.next_review_date))
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
      {upcoming.map((record) => (
        <div key={record.id} className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm dark:border-emerald-900/60 dark:bg-emerald-950">
          <p className="font-bold text-emerald-900 dark:text-emerald-100">{formatDate(record.next_review_date)}</p>
          <p className="mt-1 text-emerald-800 dark:text-emerald-200">{equipmentLabel(record)}</p>
          <p className="text-emerald-700 dark:text-emerald-300">{inspectionTypeLabels[record.inspection_type] || record.inspection_type}</p>
        </div>
      ))}
    </div>
  );
}

function EquipmentRecordTable({ emptyTitle, emptyDetail, headers, records, renderCells, canEdit, canDelete, editDialog, onDelete, deleteTitle }) {
  if (records.length === 0) {
    return (
      <div className="p-10 text-center">
        <p className="text-base font-semibold text-gray-900 dark:text-slate-50">{emptyTitle}</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{emptyDetail}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-slate-200">
          <tr>
            {headers.map((header) => <th key={header} className="px-5 py-3">{header}</th>)}
            {(canEdit || canDelete) && <th className="px-5 py-3 text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {records.map((record) => (
            <tr key={record.id} className="align-top hover:bg-gray-50 dark:hover:bg-slate-800/70">
              {renderCells(record).map((cell, index) => (
                <td key={`${record.id}-${index}`} className="max-w-[280px] px-5 py-4 text-gray-700 dark:text-slate-200">
                  <span className={index === 0 ? 'font-semibold text-gray-900 dark:text-slate-50' : ''}>{cell || '-'}</span>
                </td>
              ))}
              {(canEdit || canDelete) && (
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    {canEdit && editDialog(record)}
                    {canDelete && (
                      <ConfirmationModal
                        title={deleteTitle}
                        description="El registro se eliminará definitivamente."
                        confirmLabel="Sí, eliminar"
                        onConfirm={() => onDelete(record.id)}
                        trigger={<Button variant="ghost" size="icon"><Trash2 className="h-5 w-5 text-red-600" /></Button>}
                      />
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DriversList({
  drivers,
  search,
  statusFilter,
  onStatusFilterChange,
  canEdit,
  onSaved,
  onArchive,
  onReactivate,
  togglingDriverId,
}) {
  const term = search.trim().toLowerCase();
  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch = !term || [driver.name, driver.phone, driver.notes].some((value) => String(value || '').toLowerCase().includes(term));
    const active = isActiveDriver(driver);
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' && active)
      || (statusFilter === 'inactive' && !active);
    return matchesSearch && matchesStatus;
  });

  if (filteredDrivers.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <DriverStatusToolbar
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          resultCount={0}
        />
        <div className="p-6 text-center">
          <p className="text-base font-semibold text-gray-900 dark:text-slate-50">No hay choferes para mostrar.</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Revisá la búsqueda o el filtro de estado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <DriverStatusToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        resultCount={filteredDrivers.length}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-slate-200">
            <tr>
              <th className="w-[26%] px-5 py-3">Chofer</th>
              <th className="w-[18%] px-5 py-3">Teléfono</th>
              <th className="w-[32%] px-5 py-3">Observaciones</th>
              <th className="w-[12%] px-5 py-3">Estado</th>
              {canEdit && <th className="w-[12%] px-5 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {filteredDrivers.map((driver) => {
              const active = isActiveDriver(driver);
              const busy = togglingDriverId === driver.id;
              return (
                <tr key={driver.id} className="align-top hover:bg-gray-50 dark:hover:bg-slate-800/70">
                  <td className="px-5 py-4 font-bold text-gray-900 dark:text-slate-50">{driver.name}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{driver.phone || '-'}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{driver.notes || '-'}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100'
                        : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
                    }`}>
                      {active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <DriverFormDialog
                          driver={driver}
                          onSaved={onSaved}
                          trigger={<Button variant="ghost" size="icon" disabled={busy}><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
                        />
                        {active ? (
                          <ConfirmationModal
                            title="¿Desactivar chofer?"
                            description="El chofer dejará de aparecer para nuevas asignaciones, pero conservará todos sus recorridos e historial."
                            confirmLabel="Sí, desactivar"
                            onConfirm={() => onArchive(driver.id)}
                            trigger={<Button variant="ghost" size="icon" disabled={busy}><Ban className="h-5 w-5 text-amber-600" /></Button>}
                          />
                        ) : (
                          <ConfirmationModal
                            title="¿Reactivar chofer?"
                            description="El chofer volverá a estar disponible para nuevas asignaciones."
                            confirmLabel="Sí, reactivar"
                            onConfirm={() => onReactivate(driver.id)}
                            variant="default"
                            trigger={<Button variant="ghost" size="icon" disabled={busy}><RotateCcw className="h-5 w-5 text-emerald-600" /></Button>}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DriverStatusToolbar({ statusFilter, onStatusFilterChange, resultCount }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex w-full rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-950 sm:w-auto">
        {[
          ['active', 'Activos'],
          ['inactive', 'Inactivos'],
          ['all', 'Todos'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onStatusFilterChange(value)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition sm:flex-none ${
              statusFilter === value
                ? 'bg-[#1e3a8a] text-white shadow-sm'
                : 'text-gray-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="text-sm text-gray-500 dark:text-slate-300">{resultCount} resultados</span>
    </div>
  );
}

const plantSections = [
  {
    key: 'camaras',
    title: 'Cámaras',
    description: 'Cámaras frigoríficas y sectores de conservación.',
    match: (asset) => /cámara|camara/i.test(asset.category || ''),
  },
  {
    key: 'areas',
    title: 'Áreas operativas',
    description: 'Áreas de producción, depósito y sectores de trabajo.',
    match: (asset) => ['Área fría', 'Área caliente', 'Depósito', 'Planta alta operativa'].includes(asset.category),
  },
  {
    key: 'comunes',
    title: 'Partes comunes',
    description: 'Zonas comunes operativas, comedor y circulación interna.',
    match: (asset) => ['Parte común', 'Comedor de personal'].includes(asset.category),
  },
  {
    key: 'equipos',
    title: 'Equipos de planta',
    description: 'Equipos operativos y otros sectores técnicos.',
    match: (asset) => ['Equipo operativo', 'Otro sector operativo'].includes(asset.category),
  },
];

function PlantAssetRows({ assets, users, canEdit, onSaved, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-slate-200">
          <tr>
            <th className="px-5 py-3">Nombre</th>
            <th className="px-5 py-3">Categoría</th>
            <th className="px-5 py-3">Ubicación/sector</th>
            <th className="px-5 py-3">Responsable</th>
            <th className="px-5 py-3">Estado</th>
            <th className="px-5 py-3">Observaciones</th>
            {canEdit && <th className="px-5 py-3 text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {assets.map((asset) => (
            <tr key={asset.id} className="align-top hover:bg-gray-50 dark:hover:bg-slate-800/70">
              <td className="px-5 py-4 font-bold text-gray-900 dark:text-slate-50">{asset.name}</td>
              <td className="px-5 py-4">
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-100">{asset.category}</span>
              </td>
              <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{asset.location_description || '-'}</td>
              <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{compactUserLabel(asset.responsible_user)}</td>
              <td className="px-5 py-4"><Badge value={asset.status}>{statusLabels[asset.status]}</Badge></td>
              <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{asset.notes || '-'}</td>
              {canEdit && (
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <PlantFormDialog
                      asset={asset}
                      users={users}
                      onSaved={onSaved}
                      trigger={<Button variant="ghost" size="icon"><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
                    />
                    <ConfirmationModal
                      title="¿Eliminar elemento de planta del listado activo?"
                      description="El elemento se archivará y conservará su historial en la base de datos."
                      confirmLabel="Sí, eliminar"
                      onConfirm={() => onDelete(asset.id)}
                      trigger={<Button variant="ghost" size="icon"><Trash2 className="h-5 w-5 text-red-600" /></Button>}
                    />
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlantAssetsList({ assets, users, canEdit, onSaved, onDelete }) {
  const [categoryFilter, setCategoryFilter] = useState('todas');

  if (assets.length === 0) {
    return (
      <div className="p-10 text-center">
        <p className="text-base font-semibold text-gray-900 dark:text-slate-50">Todavía no hay registros de planta.</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Agregá cámaras, áreas operativas, partes comunes o equipos de planta para construir el registro.</p>
      </div>
    );
  }

  const newsFilter = (asset) => ['mantenimiento', 'requiere_revision'].includes(asset.status) || Boolean(asset.notes?.trim());
  const categoryOptions = [
    { key: 'todas', label: 'Todas', match: () => true },
    ...plantSections.map((section) => ({ key: section.key, label: section.title, match: section.match })),
    { key: 'novedades', label: 'Novedades / observaciones', match: newsFilter },
  ];
  const activeOption = categoryOptions.find((option) => option.key === categoryFilter) || categoryOptions[0];
  const filteredAssets = assets.filter((asset) => activeOption.match(asset));

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Registros de planta</h3>
          <p className="text-sm text-gray-500 dark:text-slate-300">Cámaras, áreas operativas, partes comunes y equipos. Administración queda excluida.</p>
        </div>
        <select className={`${inputClass} sm:w-64`} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          {categoryOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
      </div>
      {filteredAssets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-gray-600 dark:border-slate-700 dark:text-slate-300">
          No hay registros para este filtro.
        </div>
      ) : (
        <PlantAssetRows assets={filteredAssets} users={users} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} />
      )}
    </div>
  );
}
