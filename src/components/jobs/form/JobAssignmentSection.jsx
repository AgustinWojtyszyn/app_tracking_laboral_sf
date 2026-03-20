import React from 'react';
import WorkerFormModal from '@/components/workers/WorkerFormModal';
import { Button } from '@/components/ui/button';

export default function JobAssignmentSection({
  formData,
  setFormData,
  errors,
  workerId,
  setWorkerId,
  onWorkerCreated,
  workers,
  groups,
  isPage
}) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Costo trabajador</label>
          <input
            type="number"
            min="0"
            step="1"
            className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
            value={formData.cost_spent ?? ''}
            onChange={e => setFormData({ ...formData, cost_spent: e.target.value })}
            placeholder="Pago al trabajador"
          />
          {errors.cost_spent && <span className="text-xs text-red-500">{errors.cost_spent}</span>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Cobrar</label>
          <input
            type="number"
            min="0"
            step="1"
            className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
            value={formData.amount_to_charge ?? ''}
            onChange={e => setFormData({ ...formData, amount_to_charge: e.target.value })}
            placeholder="Monto a cobrar"
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
                  if (onWorkerCreated) onWorkerCreated(newWorker);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
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
          <div className="flex items-center pt-2 md:pt-6">
            <input
              type="checkbox"
              id={isPage ? 'editable-page' : 'editable'}
              className="mr-2 h-4 w-4 text-[#1e3a8a]"
              checked={formData.editable_by_group}
              onChange={e => setFormData({ ...formData, editable_by_group: e.target.checked })}
            />
            <label htmlFor={isPage ? 'editable-page' : 'editable'} className="text-sm text-gray-700 dark:text-slate-100">
              Editable por grupo
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
