import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus } from 'lucide-react';
import { workersService } from '@/services/workers.service';
import { useToast } from '@/contexts/ToastContext';

export default function WorkerFormModal({
  trigger,
  onSaved,
  worker = null,
}) {
  const isEdit = !!worker;
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    display_name: '',
    alias: '',
    phone: '',
    notes: '',
    is_active: true,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (worker) {
        setForm({
          display_name: worker.display_name || '',
          alias: worker.alias || '',
          phone: worker.phone || '',
          notes: worker.notes || '',
          is_active: worker.is_active ?? true,
        });
      } else {
        setForm({ display_name: '', alias: '', phone: '', notes: '', is_active: true });
      }
      setErrors({});
    }
  }, [open, worker]);

  const validate = () => {
    const newErrors = {};
    if (!form.display_name.trim()) newErrors.display_name = 'El nombre es obligatorio';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const payload = {
      display_name: form.display_name.trim(),
      alias: form.alias.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };

    const result = isEdit
      ? await workersService.updateWorker(worker.id, payload)
      : await workersService.createWorker(payload);

    setLoading(false);

    if (result.success) {
      addToast(result.message, 'success');
      setOpen(false);
      if (onSaved) onSaved(result.data);
    } else {
      addToast(result.error, 'error');
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className="gap-2 h-11 md:h-12 px-5 md:px-6 text-base md:text-lg">
      <UserPlus className="w-5 h-5" />
      {isEdit ? 'Editar trabajador' : 'Crear trabajador'}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-900 form-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1e3a8a] text-2xl font-bold">
            {isEdit ? 'Editar trabajador' : 'Nuevo trabajador'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-100">
              Nombre completo *
            </label>
            <input
              className="mt-1 w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Ej: Juan Pérez"
            />
            {errors.display_name && (
              <p className="text-xs text-red-500 mt-1">{errors.display_name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-100">Alias</label>
              <input
                className="mt-1 w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
                value={form.alias}
                onChange={(e) => setForm({ ...form, alias: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-100">Teléfono</label>
              <input
                className="mt-1 w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-100">Notas</label>
            <textarea
              className="mt-1 w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Comentarios internos, disponibilidad, etc."
            />
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                id="worker-active"
                type="checkbox"
                className="h-4 w-4 text-[#1e3a8a]"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <label htmlFor="worker-active" className="text-sm text-gray-700 dark:text-slate-100">
                Trabajador activo
              </label>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white mt-2 flex items-center justify-center"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear trabajador'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
