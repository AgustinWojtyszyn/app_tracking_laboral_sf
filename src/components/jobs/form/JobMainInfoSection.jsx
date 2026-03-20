import React from 'react';
import { X } from 'lucide-react';

export default function JobMainInfoSection({
  formData,
  setFormData,
  errors,
  locationSearch,
  setLocationSearch,
  filteredLocationOptions
}) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Título</label>
        <input
          type="text"
          maxLength="120"
          className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
          value={formData.title || ''}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ej: Reparación TV sala principal"
        />
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-slate-400">
          <span>Opcional. Si lo dejás vacío, se seguirá usando la descripción como referencia principal.</span>
          <span>{(formData.title || '').length}/120</span>
        </div>
        {errors.title && <span className="text-xs text-red-500">{errors.title}</span>}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Ubicación</label>
        <input
          className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
          value={locationSearch}
          onChange={e => setLocationSearch(e.target.value)}
          placeholder="Buscar empresa..."
        />
        <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 max-h-40 overflow-y-auto">
          {formData.location && (
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, location: '' });
                setLocationSearch('');
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-slate-800 border-b border-gray-100 dark:border-slate-800"
            >
              <span>Quitar selección</span>
              <X className="w-4 h-4" />
            </button>
          )}
          {filteredLocationOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">Sin resultados</div>
          ) : (
            filteredLocationOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, location: option });
                  setLocationSearch(option);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-800 ${
                  formData.location === option ? 'bg-blue-100 dark:bg-slate-800' : ''
                }`}
              >
                {option}
              </button>
            ))
          )}
        </div>
        {formData.location && (
          <div className="mt-1 text-xs text-gray-600 dark:text-slate-300">
            Seleccionado: <span className="font-semibold">{formData.location}</span>
          </div>
        )}
        {errors.location && <span className="text-xs text-red-500">{errors.location}</span>}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Quién solicita</label>
        <input
          className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
          value={formData.requested_by || ''}
          onChange={e => setFormData({ ...formData, requested_by: e.target.value })}
          placeholder="Nombre del solicitante"
          required
        />
        {errors.requested_by && <span className="text-xs text-red-500">{errors.requested_by}</span>}
      </div>
    </>
  );
}
