
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import { jobsService } from '@/services/jobs.service';
import { workersService } from '@/services/workers.service';
import WorkerFormModal from '@/components/workers/WorkerFormModal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export default function JobForm({ jobToEdit = null, onSuccess }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workerId, setWorkerId] = useState('');
  
  const initialForm = {
    date: new Date().toISOString().split('T')[0],
    location: '',
    description: '',
    hours_worked: '',
    cost_spent: '',
    amount_to_charge: '',
    status: 'pending',
    group_id: '',
    editable_by_group: false
  };

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (jobToEdit) {
      setFormData({
        ...jobToEdit,
        group_id: jobToEdit.group_id || '',
        hours_worked: jobToEdit.hours_worked || '',
        cost_spent: jobToEdit.cost_spent || '',
        amount_to_charge: jobToEdit.amount_to_charge || ''
      });
      setWorkerId(jobToEdit.worker_id || '');
      setOpen(true);
    } else {
        setFormData(initialForm);
        setWorkerId('');
    }
    setErrors({});
  }, [jobToEdit]);

  useEffect(() => {
    if (open) {
      fetchGroups();
      fetchWorkers();
    }
  }, [open]);

  const fetchGroups = async () => {
    // Only fetch groups where user is a member
    const { data } = await supabase.from('groups').select('id, name');
    if (data) setGroups(data);
  };

  const fetchWorkers = async () => {
    const result = await workersService.getWorkers();
    if (result.success && result.data) {
      setWorkers(result.data);
    }
  };

  const validate = () => {
    const newErrors = {};
    const hours = parseFloat(formData.hours_worked);
    const cost = formData.cost_spent === '' ? 0 : parseFloat(formData.cost_spent);
    const amount = formData.amount_to_charge === '' ? 0 : parseFloat(formData.amount_to_charge);
    const location = (formData.location || '').trim();
    const description = (formData.description || '').trim();
    const status = (formData.status || '').trim();

    if (!formData.date) newErrors.date = "La fecha es requerida";
    if (!status) newErrors.status = "Seleccioná un estado";
    if (!location) newErrors.location = "La ubicación es requerida";
    if (!description) newErrors.description = "La descripción es requerida";
    if (!workerId) newErrors.worker_id = "Seleccioná un trabajador";
    if (!formData.group_id) newErrors.group_id = "Seleccioná un grupo";
    if (!Number.isFinite(hours) || hours <= 0) newErrors.hours_worked = "Horas deben ser mayor a 0";
    if (!Number.isFinite(cost) || cost < 0) newErrors.cost_spent = "Costo no puede ser negativo";
    if (!Number.isFinite(amount) || amount < 0) newErrors.amount_to_charge = "Monto no puede ser negativo";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    // Construimos el payload solo con columnas reales de la tabla jobs,
    // evitando enviar relaciones como "groups" o "users" que vienen
    // embebidas en jobToEdit y provocan errores PGRST204.
    const payload = {
      date: formData.date,
      location: formData.location || '',
      description: formData.description || '',
      status: formData.status,
      editable_by_group: formData.editable_by_group,
      worker_id: workerId,
      group_id: formData.group_id || null,
      hours_worked: Number(formData.hours_worked),
      cost_spent: Number(formData.cost_spent),
      amount_to_charge: Number(formData.amount_to_charge),
    };
    if (!jobToEdit) {
      payload.user_id = user?.id || null;
    }

    let result;
    if (jobToEdit) {
        result = await jobsService.updateJob(jobToEdit.id, payload);
    } else {
        result = await jobsService.createJob(payload);
    }

    setLoading(false);

    if (result.success) {
        addToast(result.message, 'success');
        setOpen(false);
        setFormData(initialForm);
        if (onSuccess) onSuccess();
    } else {
        addToast(result.error, 'error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!jobToEdit && (
        <DialogTrigger asChild>
          <Button className="w-full h-11 px-4 text-sm md:text-base bg-[#1e3a8a] hover:bg-blue-900 text-white">
            Nuevo Trabajo
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 dark:text-slate-50 form-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1e3a8a] text-2xl md:text-3xl">{jobToEdit ? 'Editar Trabajo' : 'Nuevo Trabajo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Fecha *</label>
              <input
                type="date"
                className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
              {errors.date && <span className="text-xs text-red-500">{errors.date}</span>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Estado</label>
              <select
                className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                required
              >
                <option value="pending">Pendiente</option>
                <option value="completed">Completado</option>
                <option value="archived">Archivado</option>
              </select>
              {errors.status && <span className="text-xs text-red-500">{errors.status}</span>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Ubicación</label>
            <input
              className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
              value={formData.location || ''}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ej: Oficina central, Depósito, Cliente, Remoto"
              required
            />
            {errors.location && <span className="text-xs text-red-500">{errors.location}</span>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Descripción</label>
            <textarea
              className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
              rows="3"
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalles del trabajo, quién lo solicita, referencias, etc."
              required
            />
            {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Horas *</label>
              <input
                type="number"
                step="0.5"
                className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
                value={formData.hours_worked}
                onChange={e => setFormData({ ...formData, hours_worked: e.target.value })}
                required
              />
              {errors.hours_worked && <span className="text-xs text-red-500">{errors.hours_worked}</span>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Costo</label>
              <input
                type="number"
                step="0.01"
                className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
                value={formData.cost_spent}
                onChange={e => setFormData({ ...formData, cost_spent: e.target.value })}
              />
               {errors.cost_spent && <span className="text-xs text-red-500">{errors.cost_spent}</span>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-100">A Cobrar</label>
              <input
                type="number"
                step="0.01"
                className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
                value={formData.amount_to_charge}
                onChange={e => setFormData({ ...formData, amount_to_charge: e.target.value })}
              />
              {errors.amount_to_charge && <span className="text-xs text-red-500">{errors.amount_to_charge}</span>}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-end justify-between gap-2">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Trabajador asignado *</label>
                  <select
                  className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
                  value={workerId}
                  onChange={e => setWorkerId(e.target.value)}
                  required
                >
                    <option value="">Seleccionar trabajador...</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.display_name || w.alias || 'Sin nombre'}
                      </option>
                    ))}
                  </select>
                  {errors.worker_id && <span className="text-xs text-red-500">{errors.worker_id}</span>}
                  {workers.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No hay trabajadores creados. Creá uno para poder asignarlo.
                    </p>
                  )}
                    <WorkerFormModal
                      onSaved={(newWorker) => {
                        setWorkers((prev) => [...prev, newWorker]);
                        setWorkerId(newWorker.id);
                      }}
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-6 h-9 px-3 text-xs md:text-sm text-[#1e3a8a] border-blue-200"
                        >
                          + Crear trabajador
                        </Button>
                      }
                    />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Grupo</label>
              <select
                className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
                value={formData.group_id}
                onChange={e => setFormData({ ...formData, group_id: e.target.value })}
                required
              >
                <option value="">Ninguno</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              {errors.group_id && <span className="text-xs text-red-500">{errors.group_id}</span>}
            </div>
            <div className="flex items-center pt-6">
                <input
                    type="checkbox"
                    id="editable"
                    className="mr-2 h-4 w-4 text-[#1e3a8a]"
                    checked={formData.editable_by_group}
                    onChange={e => setFormData({...formData, editable_by_group: e.target.checked})}
                />
              <label htmlFor="editable" className="text-sm text-gray-700 dark:text-slate-100">Editable por grupo</label>
            </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white mt-4">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {jobToEdit ? 'Actualizar' : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
