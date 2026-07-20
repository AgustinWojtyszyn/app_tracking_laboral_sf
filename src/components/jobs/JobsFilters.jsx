import React from 'react';
import { Search } from 'lucide-react';
import LocationCombobox from '@/components/jobs/LocationCombobox';

export default function JobsFilters({
  isEn,
  date,
  searchTerm,
  selectedLocation,
  selectedStatus,
  locationOptions,
  pageSize,
  onDateChange,
  onSearchChange,
  onLocationChange,
  onStatusChange,
  onPageSizeChange,
}) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[12rem_minmax(0,1fr)_18rem_13rem_12rem] gap-3 items-end">
        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
          <span className="mb-1 block">{isEn ? 'Date' : 'Fecha'}</span>
          <input
            data-tour="filtro-fecha"
            type="date"
            className="h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-base text-gray-900 outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            value={date}
            onChange={onDateChange}
          />
        </label>

        <div>
          <label htmlFor="jobs-search" className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1">
            {isEn ? 'Search' : 'Búsqueda'}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              id="jobs-search"
              type="search"
              value={searchTerm}
              onChange={onSearchChange}
              placeholder={isEn ? 'Search jobs...' : 'Buscar trabajos...'}
              className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-10 pr-3 text-base text-gray-900 outline-none transition focus:ring-2 focus:ring-[#1e3a8a] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-slate-200">
            {isEn ? 'Place' : 'Lugar'}
          </p>
          <LocationCombobox
            value={selectedLocation}
            options={locationOptions}
            onChange={onLocationChange}
          />
        </div>

        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
          <span className="mb-1 block">{isEn ? 'Status' : 'Estado'}</span>
          <select
            value={selectedStatus}
            onChange={onStatusChange}
            className="h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-base text-gray-900 outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            aria-label={isEn ? 'Status' : 'Estado'}
          >
            <option value="all">{isEn ? 'All' : 'Todos'}</option>
            <option value="pending">{isEn ? 'Pending' : 'Pendientes'}</option>
            <option value="in_progress">{isEn ? 'In progress' : 'En proceso'}</option>
            <option value="completed">{isEn ? 'Completed' : 'Completados'}</option>
            <option value="cancelled">{isEn ? 'Cancelled' : 'Cancelados'}</option>
          </select>
        </label>

        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
          <span className="mb-1 block">{isEn ? 'Rows per page' : 'Registros por página'}</span>
          <select
            value={pageSize}
            onChange={onPageSizeChange}
            className="h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-base text-gray-900 outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            aria-label={isEn ? 'Rows per page' : 'Registros por página'}
          >
            <option value={10}>10</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>
    </div>
  );
}
