
import React, { useState, useEffect } from 'react';
import { useJobs } from '@/hooks/useJobs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatCurrency, formatNumber, formatDate } from '@/utils/formatters';
import { getMonthStart, getMonthEnd } from '@/utils/dates';
import { CalendarDays, Briefcase, DollarSign, Clock } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ExcelExportButton from '@/components/common/ExcelExportButton';
import JobFilters from '@/components/jobs/JobFilters';
import { useFilters } from '@/hooks/useFilters';

export default function MonthlyPanelPage() {
  const { user } = useAuth();
  const { getJobsByDateRange, loading } = useJobs();
  const [jobs, setJobs] = useState([]);
  
  // Use filter hook for state management
  const { filters, setFilter } = useFilters({
      startDate: getMonthStart(),
      endDate: getMonthEnd(),
      status: 'all',
      groupId: 'all',
      search: ''
  });

  useEffect(() => {
    if (user && filters.startDate && filters.endDate) {
        fetchJobs();
    }
  }, [user, filters.startDate, filters.endDate, filters.status, filters.groupId]);

  const fetchJobs = async () => {
    // Pass filters including search for backend filtering if supported or client side filtering later
    const result = await getJobsByDateRange(filters.startDate, filters.endDate, filters);
    if (result.success) setJobs(result.data);
  };

  // Client-side search filtering if needed (or rely on API if implemented)
  const filteredJobs = jobs.filter(job => {
      if (!filters.search) return true;
      const term = filters.search.toLowerCase();
      return job.description?.toLowerCase().includes(term) || job.location?.toLowerCase().includes(term);
  });

  const totals = filteredJobs.reduce((acc, job) => ({
    hours: acc.hours + (Number(job.hours_worked) || 0),
    cost: acc.cost + (Number(job.cost_spent) || 0),
    charge: acc.charge + (Number(job.amount_to_charge) || 0)
  }), { hours: 0, cost: 0, charge: 0 });

  // Group by day for calendar view
  const jobsByDay = filteredJobs.reduce((acc, job) => {
    const d = job.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(job);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-[#1e3a8a]">Panel Mensual</h1>
            <p className="text-sm text-gray-500">Vista detallada por día</p>
        </div>
        <ExcelExportButton 
            jobs={filteredJobs} 
            grouped={true}
            startDate={filters.startDate}
            endDate={filters.endDate}
        />
      </div>

      <JobFilters filters={filters} onChange={setFilter} />

      {/* Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-gradient-to-br from-[#1e3a8a] to-blue-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Clock className="w-20 h-20" />
            </div>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Total Horas</p>
            <p className="text-3xl font-bold mt-1">{formatNumber(totals.hours)} hs</p>
         </div>
         <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <DollarSign className="w-20 h-20" />
            </div>
            <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider">Total Costo</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totals.cost)}</p>
         </div>
         <div className="bg-gradient-to-br from-violet-600 to-violet-800 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Briefcase className="w-20 h-20" />
            </div>
            <p className="text-violet-200 text-xs font-bold uppercase tracking-wider">Total a Cobrar</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totals.charge)}</p>
         </div>
      </div>

      {loading ? <LoadingSpinner /> : (
          <div className="grid gap-6">
             {Object.keys(jobsByDay).length === 0 ? (
                 <div className="bg-white p-12 rounded-xl shadow-sm border border-dashed border-gray-300 text-center">
                     <CalendarDays className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                     <h3 className="text-lg font-medium text-gray-900">Sin trabajos</h3>
                     <p className="text-gray-500">No hay registros para el rango y filtros seleccionados.</p>
                 </div>
             ) : (
                 Object.keys(jobsByDay).sort().reverse().map(date => {
                     const dayJobs = jobsByDay[date];
                     const dayTotal = dayJobs.reduce((sum, j) => sum + Number(j.amount_to_charge), 0);
                     
                     return (
                         <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                             <div className="bg-gray-50/80 p-4 border-b flex justify-between items-center backdrop-blur-sm">
                                 <div className="flex items-center font-bold text-gray-800">
                                     <div className="bg-white p-2 rounded-lg shadow-sm mr-3 border border-gray-100">
                                        <CalendarDays className="w-5 h-5 text-[#1e3a8a]" />
                                     </div>
                                     <span className="capitalize">{formatDate(date)}</span>
                                 </div>
                                 <span className="font-bold text-[#1e3a8a] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                     {formatCurrency(dayTotal)}
                                 </span>
                             </div>
                             <div className="divide-y divide-gray-100">
                                 {dayJobs.map(job => (
                                     <div key={job.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-gray-50/50 transition-colors gap-2">
                                         <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{job.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-500">{job.location}</span>
                                                {job.groups && (
                                                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                                        {job.groups.name}
                                                    </span>
                                                )}
                                            </div>
                                         </div>
                                         <div className="flex items-center justify-between sm:justify-end gap-4 min-w-[150px]">
                                             <div className="text-right">
                                                 <span className="block text-xs text-gray-400 uppercase">Cobrar</span>
                                                 <span className="font-semibold text-gray-900">{formatCurrency(job.amount_to_charge)}</span>
                                             </div>
                                             <div className="text-right w-20">
                                                 <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                                                     job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                     job.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                                                     'bg-yellow-100 text-yellow-700'
                                                 }`}>
                                                     {job.status === 'pending' ? 'Pendiente' : job.status === 'completed' ? 'Listo' : 'Arch.'}
                                                 </span>
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     )
                 })
             )}
          </div>
      )}
    </div>
  );
}
