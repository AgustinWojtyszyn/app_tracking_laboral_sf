
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import { jobsService } from '@/services/jobs.service';
import { usersService } from '@/services/users.service';
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
      setWorkerId(jobToEdit.user_id || user?.id || '');
      setOpen(true);
    } else {
        setFormData(initialForm);
        setWorkerId(user?.id || '');
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
    try {
      const result = await usersService.getAllUsers();
      if (result.success && result.data) {
        setWorkers(result.data);
        if (!workerId && user) {
          setWorkerId(user.id);
        }
      } else if (!result.success && user) {
        setWorkers([{ id: user.id, full_name: user.user_metadata?.full_name || '', email: user.email }]);
        setWorkerId(user.id);
      }
    } catch (e) {
      if (user) {
        setWorkers([{ id: user.id, full_name: user.user_metadata?.full_name || '', email: user.email }]);
        setWorkerId(user.id);
      }
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = "La fecha es requerida";
    if (Number(formData.hours_worked) <= 0) newErrors.hours_worked = "Horas deben ser mayor a 0";
    if (Number(formData.cost_spent) < 0) newErrors.cost_spent = "Costo no puede ser negativo";
    if (Number(formData.amount_to_charge) < 0) newErrors.amount_to_charge = "Monto no puede ser negativo";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const payload = {
        ...formData,
      user_id: workerId || user.id,
        group_id: formData.group_id || null,
        hours_worked: Number(formData.hours_worked),
        cost_spent: Number(formData.cost_spent),
        amount_to_charge: Number(formData.amount_to_charge),
    };

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
          <Button className="bg-[#1e3a8a] hover:bg-blue-900 text-white">Nuevo Trabajo</Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 dark:text-slate-50">
        <DialogHeader>
          <DialogTitle className="text-[#1e3a8a]">{jobToEdit ? 'Editar Trabajo' : 'Nuevo Trabajo'}</DialogTitle>
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
              >
                <option value="pending">Pendiente</option>
                <option value="completed">Completado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Ubicación</label>
            <input
              className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
              value={formData.location || ''}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ej: Oficina Central, cliente, dirección..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Descripción</label>
            <textarea
              className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
              rows="3"
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalles del trabajo, quién lo solicita, referencias, etc."
            />
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
              <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Trabajador asignado</label>
              <select
                className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
                value={workerId}
                onChange={e => setWorkerId(e.target.value)}
              >
                <option value="">Seleccionar trabajador...</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.full_name || w.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Grupo</label>
              <select
                className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
                value={formData.group_id}
                onChange={e => setFormData({ ...formData, group_id: e.target.value })}
              >
                <option value="">Ninguno</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
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
