import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Ban, BookOpen, Building2, Car, Edit2, FileSpreadsheet, Fuel, Plus, Search, Trash2, Wrench } from 'lucide-react';
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
import {
  equipmentLogService,
  normalizeLicensePlate,
  PLANT_CATEGORIES,
  PLANT_STATUS,
  VEHICLE_LICENSE_PLATE_MAX_LENGTH,
  VEHICLE_MAINTENANCE_TYPES,
  VEHICLE_MILEAGE_MAX_DIGITS,
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

const statusClass = {
  activo: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100',
  inactivo: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200',
  mantenimiento: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100',
  fuera_servicio: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200',
  requiere_revision: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100',
};

const emptyVehicle = {
  license_plate: '',
  name: '',
  vehicle_type: 'utilitario',
  brand: '',
  model: '',
  year: '',
  assigned_driver_id: '',
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

const compactUserLabel = (user) => user?.full_name || user?.email || 'Sin asignar';

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

function VehicleFormDialog({ vehicle, users, trigger, onSaved }) {
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
              <select className={inputClass} value={form.assigned_driver_id || ''} onChange={(e) => setValue('assigned_driver_id', e.target.value)}>
                <option value="">Sin asignar</option>
                {users.filter((u) => u.role === 'chofer').map((user) => (
                  <option key={user.id} value={user.id}>{compactUserLabel(user)}</option>
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

function FuelLoadFormDialog({ fuelLoad, vehicles, selectedVehicleId = '', trigger, onSaved }) {
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
            <Field label="Hora estimada *">
              <input className={inputClass} type="time" value={form.estimated_time} onChange={(e) => setValue('estimated_time', e.target.value)} required />
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
                required
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

function MaintenanceLogFormDialog({ maintenanceLog, vehicles, selectedVehicleId = '', trigger, onSaved }) {
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

export default function EquipmentLogPage() {
  const { addToast } = useToast();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('vehicles');
  const [vehicles, setVehicles] = useState([]);
  const [fuelLoads, setFuelLoads] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [plantAssets, setPlantAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSection, setExportSection] = useState('todo');

  const canEdit = isAdmin;

  const loadUsers = async () => {
    if (!canEdit) return;
    const result = await equipmentLogService.getAssignableUsers();
    if (result.success) setUsers(result.data || []);
  };

  const loadCurrentTab = async () => {
    setLoading(true);
    const result = activeTab === 'vehicles'
      ? await Promise.all([
        equipmentLogService.getVehicles({ search }),
        equipmentLogService.getFuelLoads(),
        equipmentLogService.getMaintenanceLogs(),
      ])
      : await equipmentLogService.getPlantAssets({ search });
    setLoading(false);

    if (activeTab === 'vehicles') {
      const [vehiclesResult, fuelLoadsResult, maintenanceLogsResult] = result;
      if (vehiclesResult.success) setVehicles(vehiclesResult.data || []);
      else addToast(vehiclesResult.error, 'error');

      if (fuelLoadsResult.success) setFuelLoads(fuelLoadsResult.data || []);
      else addToast(fuelLoadsResult.error, 'error');

      if (maintenanceLogsResult.success) setMaintenanceLogs(maintenanceLogsResult.data || []);
      else addToast(maintenanceLogsResult.error, 'error');
    } else if (result.success) {
      setPlantAssets(result.data || []);
    } else {
      addToast(result.error, 'error');
    }
  };

  useEffect(() => {
    loadUsers();
  }, [canEdit]);

  useEffect(() => {
    loadCurrentTab();
  }, [activeTab, search]);

  useEffect(() => {
    if (activeTab !== 'vehicles') return;
    if (vehicles.length === 0) {
      setSelectedVehicleId('');
      return;
    }
    if (!selectedVehicleId || !vehicles.some((vehicle) => vehicle.id === selectedVehicleId)) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [activeTab, selectedVehicleId, vehicles]);

  const tabs = useMemo(() => ([
    { key: 'vehicles', label: 'Vehículos', icon: Car },
    { key: 'plant', label: 'Planta', icon: Building2 },
  ]), []);

  const handleDeactivateVehicle = async (id) => {
    const result = await equipmentLogService.deactivateVehicle(id);
    addToast(result.success ? result.message : result.error, result.success ? 'success' : 'error');
    if (result.success) loadCurrentTab();
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

  const handleExportEquipmentLog = async (section = 'todo') => {
    setExporting(true);
    const [vehiclesResult, fuelLoadsResult, maintenanceLogsResult, plantAssetsResult] = await Promise.all([
      equipmentLogService.getVehicles(),
      equipmentLogService.getFuelLoads(),
      equipmentLogService.getMaintenanceLogs(),
      equipmentLogService.getPlantAssets(),
    ]);
    setExporting(false);

    const results = [vehiclesResult, fuelLoadsResult, maintenanceLogsResult, plantAssetsResult];
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
    }, 'libro_registro_equipo.xlsx', section);
    addToast('Excel exportado correctamente.', 'success');
  };

  const createButton = activeTab === 'vehicles'
    ? (
      <VehicleFormDialog
        users={users}
        onSaved={loadCurrentTab}
        trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nuevo vehículo</Button>}
      />
    )
    : (
      <PlantFormDialog
        users={users}
        onSaved={loadCurrentTab}
        trigger={<Button className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nuevo elemento de planta</Button>}
      />
    );

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
              <p className="text-base text-gray-600 dark:text-slate-300">Control interno de vehículos, mantenimiento, cargas de combustible y sectores operativos de planta.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select className={inputClass} value={exportSection} onChange={(event) => setExportSection(event.target.value)}>
              <option value="todo">Todo el libro</option>
              <option value="vehiculos">Vehículos</option>
              <option value="combustible">Cargas</option>
              <option value="mantenimiento">Mantenimientos</option>
              <option value="planta">Planta</option>
            </select>
            <Button variant="outline" onClick={() => handleExportEquipmentLog(exportSection)} disabled={exporting} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {exporting ? 'Exportando...' : exportSection === 'todo' ? 'Exportar libro completo' : 'Exportar sección'}
            </Button>
            {canEdit && createButton}
          </div>
        </div>
      </div>

      <EquipmentSummaryCards vehicles={vehicles} maintenanceLogs={maintenanceLogs} plantAssets={plantAssets} />

      <div className="grid gap-4 lg:grid-cols-[230px,1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition lg:justify-start ${
                    active
                      ? 'bg-[#1e3a8a] text-white shadow-sm'
                      : 'text-gray-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-50">{activeTab === 'vehicles' ? 'Vehículos' : 'Planta'}</h2>
              <p className="text-sm text-gray-500 dark:text-slate-300">
                {activeTab === 'vehicles'
                  ? 'Fichas, historial de combustible, mantenimiento y vencimientos.'
                  : 'Cámaras, áreas operativas, partes comunes y equipos internos. Administración queda excluida.'}
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className={`${inputClass} pl-9`}
                placeholder={activeTab === 'vehicles' ? 'Buscar patente, nombre o marca' : 'Buscar nombre, categoría o ubicación'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="p-10"><LoadingSpinner /></div>
          ) : activeTab === 'vehicles' ? (
            <VehiclesList
              vehicles={vehicles}
              fuelLoads={fuelLoads}
              maintenanceLogs={maintenanceLogs}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={setSelectedVehicleId}
              users={users}
              canEdit={canEdit}
              onSaved={loadCurrentTab}
              onDeactivate={handleDeactivateVehicle}
              onDeleteFuelLoad={handleDeleteFuelLoad}
              onDeleteMaintenanceLog={handleDeleteMaintenanceLog}
            />
          ) : (
            <PlantAssetsList assets={plantAssets} users={users} canEdit={canEdit} onSaved={loadCurrentTab} onDelete={handleDeletePlantAsset} />
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

function EquipmentSummaryCards({ vehicles, maintenanceLogs, plantAssets }) {
  const activeVehicles = vehicles.filter((vehicle) => vehicle.status === 'activo').length;
  const upcomingExpirations = vehicles.reduce((count, vehicle) => (
    count
    + ['registration_expires_at', 'insurance_expires_at', 'inspection_expires_at']
      .filter((key) => isDateWithinDays(vehicle[key], 30)).length
  ), 0);
  const pendingMaintenance = maintenanceLogs.filter((log) => isDateWithinDays(log.next_control_date, 30)).length;
  const plantNews = plantAssets.filter((asset) => (
    ['mantenimiento', 'requiere_revision'].includes(asset.status) || Boolean(asset.notes?.trim())
  )).length;

  const cards = [
    { label: 'Vehículos activos', value: activeVehicles, detail: vehicles.length ? `${vehicles.length} en registro` : 'Sin vehículos cargados', icon: Car },
    { label: 'Vencimientos próximos', value: upcomingExpirations, detail: 'Próximos 30 días', icon: AlertCircle },
    { label: 'Mantenimientos pendientes', value: pendingMaintenance, detail: 'Con próximo control cercano', icon: Wrench },
    { label: 'Novedades de planta', value: plantNews, detail: 'Revisión, mantenimiento u observaciones', icon: Building2 },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">{card.label}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-slate-50">{card.value}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{card.detail}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-[#1e3a8a] dark:bg-blue-900/40 dark:text-blue-100">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VehiclesList({ vehicles, fuelLoads, maintenanceLogs, selectedVehicleId, onSelectVehicle, users, canEdit, onSaved, onDeactivate, onDeleteFuelLoad, onDeleteMaintenanceLog }) {
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || null;
  const selectedFuelLoads = selectedVehicleId ? fuelLoads.filter((load) => load.vehicle_id === selectedVehicleId) : [];
  const selectedMaintenanceLogs = selectedVehicleId ? maintenanceLogs.filter((log) => log.vehicle_id === selectedVehicleId) : [];

  return (
    <div className="divide-y divide-gray-100 dark:divide-slate-800">
      {vehicles.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-base font-semibold text-gray-900 dark:text-slate-50">Todavía no hay vehículos registrados.</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Agregá el primero para habilitar cargas de combustible y mantenimientos.</p>
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
                {canEdit && <th className="px-5 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {vehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className={`align-top hover:bg-gray-50 dark:hover:bg-slate-800/70 ${selectedVehicleId === vehicle.id ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}`}
                >
                  <td className="px-5 py-4 font-bold text-gray-900 dark:text-slate-50">{vehicle.license_plate}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">
                    <p className="font-semibold">{vehicle.name || vehicleTypeLabels[vehicle.vehicle_type] || 'Vehículo'}</p>
                    <p>{[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ') || '-'}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{compactUserLabel(vehicle.assigned_driver)}</td>
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
                  {canEdit && (
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <VehicleFormDialog
                          vehicle={vehicle}
                          users={users}
                          onSaved={onSaved}
                          trigger={<Button variant="ghost" size="icon"><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
                        />
                        <Button variant="ghost" size="icon" title="Ver historial" onClick={() => onSelectVehicle(vehicle.id)}>
                          <BookOpen className="h-5 w-5 text-slate-600 dark:text-slate-200" />
                        </Button>
                        <ConfirmationModal
                          title="¿Desactivar vehículo?"
                          description="El vehículo quedará fuera de servicio, pero conservará su historial."
                          confirmLabel="Sí, desactivar"
                          onConfirm={() => onDeactivate(vehicle.id)}
                          trigger={<Button variant="ghost" size="icon"><Ban className="h-5 w-5 text-red-600" /></Button>}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FuelLoadsSection
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        fuelLoads={selectedFuelLoads}
        canEdit={canEdit}
        onSaved={onSaved}
        onDelete={onDeleteFuelLoad}
      />
      <MaintenanceLogsSection
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        maintenanceLogs={selectedMaintenanceLogs}
        canEdit={canEdit}
        onSaved={onSaved}
        onDelete={onDeleteMaintenanceLog}
      />
    </div>
  );
}

function FuelLoadsSection({ vehicles, selectedVehicle, fuelLoads, canEdit, onSaved, onDelete }) {
  const disabled = !selectedVehicle;
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
            <Fuel className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Cargas de combustible</h3>
            <p className="text-sm text-gray-500 dark:text-slate-300">
              {selectedVehicle ? `Historial de ${selectedVehicle.license_plate}.` : 'Seleccioná un vehículo para ver su historial de cargas y mantenimiento.'}
            </p>
          </div>
        </div>
        {canEdit && (
          <FuelLoadFormDialog
            vehicles={vehicles}
            selectedVehicleId={selectedVehicle?.id || ''}
            onSaved={onSaved}
            trigger={<Button disabled={disabled} className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nueva carga</Button>}
          />
        )}
      </div>

      {!selectedVehicle ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-gray-600 dark:border-slate-700 dark:text-slate-300">
          Seleccioná un vehículo para ver su historial de cargas y mantenimiento.
        </div>
      ) : fuelLoads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-gray-600 dark:border-slate-700 dark:text-slate-300">
          No hay cargas de combustible para este vehículo.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-5 py-3">Vehículo</th>
                <th className="px-5 py-3">Fecha y hora</th>
                <th className="px-5 py-3">Precio</th>
                <th className="px-5 py-3">Litros</th>
                <th className="px-5 py-3">Kilometraje</th>
                <th className="px-5 py-3">Observaciones</th>
                {canEdit && <th className="px-5 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {fuelLoads.map((load) => (
                <tr key={load.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/70">
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">
                    <p className="font-semibold text-gray-900 dark:text-slate-50">{load.vehicle?.license_plate || '-'}</p>
                    <p>{[load.vehicle?.name || load.vehicle?.brand, load.vehicle?.model].filter(Boolean).join(' ') || '-'}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">
                    <p>{formatDate(load.load_date)}</p>
                    <p>{load.estimated_time?.slice(0, 5) || '-'}</p>
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-900 dark:text-slate-50">{formatCurrency(load.price_ars)}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{formatNumber(load.liters, 2)} L</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{load.mileage}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-slate-200">{load.notes || '-'}</td>
                  {canEdit && (
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <FuelLoadFormDialog
                          fuelLoad={load}
                          vehicles={vehicles}
                          onSaved={onSaved}
                          trigger={<Button variant="ghost" size="icon"><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
                        />
                        <ConfirmationModal
                          title="¿Eliminar carga de combustible?"
                          description="La carga se eliminará definitivamente."
                          confirmLabel="Sí, eliminar"
                          onConfirm={() => onDelete(load.id)}
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
      )}
    </div>
  );
}

function MaintenanceLogsSection({ vehicles, selectedVehicle, maintenanceLogs, canEdit, onSaved, onDelete }) {
  const disabled = !selectedVehicle;
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Mantenimiento</h3>
            <p className="text-sm text-gray-500 dark:text-slate-300">
              {selectedVehicle ? `Historial técnico de ${selectedVehicle.license_plate}.` : 'Seleccioná un vehículo para ver su historial de cargas y mantenimiento.'}
            </p>
          </div>
        </div>
        {canEdit && (
          <MaintenanceLogFormDialog
            vehicles={vehicles}
            selectedVehicleId={selectedVehicle?.id || ''}
            onSaved={onSaved}
            trigger={<Button disabled={disabled} className="bg-[#1e3a8a] text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" /> Nuevo mantenimiento</Button>}
          />
        )}
      </div>

      {!selectedVehicle ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-gray-600 dark:border-slate-700 dark:text-slate-300">
          Seleccioná un vehículo para ver su historial de cargas y mantenimiento.
        </div>
      ) : maintenanceLogs.length === 0 ? (
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
                {canEdit && <th className="px-5 py-3 text-right">Acciones</th>}
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
                  {canEdit && (
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <MaintenanceLogFormDialog
                          maintenanceLog={log}
                          vehicles={vehicles}
                          onSaved={onSaved}
                          trigger={<Button variant="ghost" size="icon"><Edit2 className="h-5 w-5 text-blue-600" /></Button>}
                        />
                        <ConfirmationModal
                          title="¿Eliminar mantenimiento?"
                          description="El mantenimiento se eliminará definitivamente."
                          confirmLabel="Sí, eliminar"
                          onConfirm={() => onDelete(log.id)}
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
      )}
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
                      title="¿Eliminar elemento de planta?"
                      description="El elemento se eliminará definitivamente."
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
  if (assets.length === 0) {
    return (
      <div className="p-10 text-center">
        <p className="text-base font-semibold text-gray-900 dark:text-slate-50">Todavía no hay registros de planta.</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Agregá cámaras, áreas operativas, partes comunes o equipos de planta para construir el registro.</p>
      </div>
    );
  }

  const assigned = new Set();
  const sections = plantSections.map((section) => {
    const sectionAssets = assets.filter((asset) => section.match(asset));
    sectionAssets.forEach((asset) => assigned.add(asset.id));
    return { ...section, assets: sectionAssets };
  });
  const unassigned = assets.filter((asset) => !assigned.has(asset.id));
  const news = assets.filter((asset) => (
    ['mantenimiento', 'requiere_revision'].includes(asset.status) || Boolean(asset.notes?.trim())
  ));

  return (
    <div className="space-y-6 p-4">
      {sections.map((section) => (
        <div key={section.key} className="space-y-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">{section.title}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-300">{section.description}</p>
          </div>
          {section.assets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-5 text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">
              Sin registros en esta subcategoría.
            </div>
          ) : (
            <PlantAssetRows assets={section.assets} users={users} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} />
          )}
        </div>
      ))}

      {unassigned.length > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Otros operativos</h3>
            <p className="text-sm text-gray-500 dark:text-slate-300">Registros operativos de planta sin subcategoría específica. Administración queda excluida.</p>
          </div>
          <PlantAssetRows assets={unassigned} users={users} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} />
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">Novedades / observaciones</h3>
          <p className="text-sm text-gray-500 dark:text-slate-300">Elementos con revisión, mantenimiento u observaciones cargadas.</p>
        </div>
        {news.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-5 text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">
            No hay novedades de planta registradas.
          </div>
        ) : (
          <PlantAssetRows assets={news} users={users} canEdit={canEdit} onSaved={onSaved} onDelete={onDelete} />
        )}
      </div>
    </div>
  );
}
