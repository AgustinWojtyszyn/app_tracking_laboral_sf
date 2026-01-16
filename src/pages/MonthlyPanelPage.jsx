
import React, { useState, useEffect } from 'react';
import { useJobs } from '@/hooks/useJobs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency, formatNumber, formatDate } from '@/utils/formatters';
import { getMonthStart, getMonthEnd } from '@/utils/dates';
import { CalendarDays, Briefcase, DollarSign, Clock, Share2, Trash2, MessageCircle, FileSpreadsheet } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ExcelExportButton from '@/components/common/ExcelExportButton';
import JobFilters from '@/components/jobs/JobFilters';
import { useFilters } from '@/hooks/useFilters';
import { Button } from '@/components/ui/button';
import { exportService } from '@/services/export.service';
import { jobsService } from '@/services/jobs.service';
import ConfirmationModal from '@/components/common/ConfirmationModal';

export default function MonthlyPanelPage() {
  const { user, isAdmin } = useAuth();
  const { getJobsByDateRange, loading } = useJobs();
  const { t, language } = useLanguage();
  const { addToast } = useToast();
  const isEn = language === 'en';
  const [jobs, setJobs] = useState([]);
  const [clearing, setClearing] = useState(false);
  const [clearingPending, setClearingPending] = useState(false);
  
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
  const hasJobs = filteredJobs.length > 0;
  const clearDisabled = clearing || loading;
  const clearPendingDisabled = clearingPending || loading;

  const totals = filteredJobs.reduce((acc, job) => {
    const status = (job.status || '').trim().toLowerCase();
    const hours = acc.hours + (Number(job.hours_worked) || 0);
    const cost = acc.cost + (status === 'completed' ? 0 : (Number(job.cost_spent) || 0));
    const charge = acc.charge + (status === 'completed' ? 0 : (Number(job.amount_to_charge) || 0));
    return { hours, cost, charge };
  }, { hours: 0, cost: 0, charge: 0 });

  // Group by day for calendar view
  const jobsByDay = filteredJobs.reduce((acc, job) => {
    const d = job.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(job);
    return acc;
  }, {});

  const handleShare = () => {
    if (!filteredJobs || filteredJobs.length === 0) return;
    const title = isEn
      ? `Monthly orders ${filters.startDate} to ${filters.endDate}`
      : `Órdenes mensuales ${filters.startDate} a ${filters.endDate}`;
    exportService.shareJobsViaWhatsApp(filteredJobs, title);
  };

  const handleClearCompleted = async () => {
    if (!isAdmin) {
      addToast(isEn ? 'Only administrators can clean completed jobs.' : 'Solo los administradores pueden limpiar trabajos completados.', 'error');
      return;
    }
    setClearing(true);
    const result = await jobsService.deleteCompletedJobs(filters.startDate, filters.endDate);
    if (result.success) {
      const removed = result.removed || 0;
      addToast(
        removed === 0
          ? (isEn ? 'No completed jobs to remove.' : 'No hay trabajos completados para eliminar.')
          : (isEn ? `Removed ${removed} completed jobs.` : `Se eliminaron ${removed} trabajos completados.`),
        'success'
      );
      fetchJobs();
    } else {
      addToast(result.error, 'error');
    }
    setClearing(false);
  };

  const handleClearPending = async () => {
    if (!isAdmin) {
      addToast(isEn ? 'Only administrators can clean pending jobs.' : 'Solo los administradores pueden limpiar trabajos pendientes.', 'error');
      return;
    }
    setClearingPending(true);
    const result = await jobsService.deletePendingJobs(filters.startDate, filters.endDate);
    if (result.success) {
      const removed = result.removed || 0;
      addToast(
        removed === 0
          ? (isEn ? 'No pending jobs to remove.' : 'No hay trabajos pendientes para eliminar.')
          : (isEn ? `Removed ${removed} pending jobs.` : `Se eliminaron ${removed} trabajos pendientes.`),
        'success'
      );
      fetchJobs();
    } else {
      addToast(result.error, 'error');
    }
    setClearingPending(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-lg md:text-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
	        <h1 className="text-4xl md:text-5xl font-bold text-[#1e3a8a] dark:text-slate-50">{t('monthlyPage.title')}</h1>
	        <p className="text-xl md:text-2xl text-gray-500 dark:text-slate-300">{t('monthlyPage.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap md:flex-nowrap items-stretch justify-end gap-3 w-full md:w-auto">
          <Button
            variant="default"
            onClick={handleShare}
            disabled={!hasJobs || loading}
            className="gap-2 min-w-[170px] w-full sm:w-auto text-base md:text-lg h-12 md:h-14 shadow-md bg-[#25D366] hover:bg-[#1ebe5a] text-white border-0"
          >
            <MessageCircle className="w-5 h-5" />
            {isEn ? 'Share WhatsApp' : 'Compartir WhatsApp'}
          </Button>
          <ConfirmationModal
            title={isEn ? 'Clean completed?' : '¿Limpiar completados?'}
            description={isEn ? 'Delete all completed jobs in the selected range.' : 'Eliminar todos los trabajos con estado completado en el rango seleccionado.'}
            confirmLabel={isEn ? 'Delete' : 'Eliminar'}
            onConfirm={handleClearCompleted}
            trigger={
              <Button
                type="button"
                variant="destructive"
                disabled={clearDisabled}
                className="gap-2 min-w-[170px] w-full sm:w-auto text-base md:text-lg h-12 md:h-14 shadow-sm bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4" />
                {clearing ? (isEn ? 'Cleaning...' : 'Limpiando...') : (isEn ? 'Clear completed' : 'Limpiar completados')}
              </Button>
            }
          />
          <ConfirmationModal
            title={isEn ? 'Clean pending?' : '¿Limpiar pendientes?'}
            description={isEn ? 'Delete all pending jobs in the selected range.' : 'Eliminar todos los trabajos pendientes en el rango seleccionado.'}
            confirmLabel={isEn ? 'Delete pending' : 'Eliminar pendientes'}
            onConfirm={handleClearPending}
            trigger={
              <Button
                type="button"
                variant="secondary"
                disabled={clearPendingDisabled}
                className="gap-2 min-w-[170px] w-full sm:w-auto text-base md:text-lg h-12 md:h-14 shadow-sm bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              >
                <Trash2 className="w-4 h-4" />
                {clearingPending ? (isEn ? 'Cleaning pending...' : 'Limpiando pendientes...') : (isEn ? 'Clear pending' : 'Limpiar pendientes')}
              </Button>
            }
          />
          <ExcelExportButton 
              jobs={filteredJobs} 
              grouped={true}
              startDate={filters.startDate}
              endDate={filters.endDate}
              label={isEn ? 'Export to Excel' : 'Exportar a Excel'}
              icon={FileSpreadsheet}
              className="min-w-[170px] w-full sm:w-auto text-base md:text-lg h-12 md:h-14 shadow-md bg-gradient-to-r from-[#1D976C] to-[#93F9B9] text-[#0b4f31] hover:from-[#168b60] hover:to-[#83efad] border-0"
          />
        </div>
      </div>

      <JobFilters filters={filters} onChange={setFilter} />

      {/* Tabla consolidada */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden card-lg">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-slate-50">{isEn ? 'Summary table' : 'Tabla resumen'}</h2>
          <span className="text-sm md:text-base text-gray-500 dark:text-slate-300">{filteredJobs.length} {isEn ? 'records' : 'registros'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs md:text-sm text-left">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-100 uppercase font-semibold border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-3 md:px-4 py-3">{t('monthlyPage.columns.date')}</th>
                <th className="px-3 md:px-4 py-3">{t('monthlyPage.columns.description')}</th>
                <th className="px-3 md:px-4 py-3">{t('monthlyPage.columns.location')}</th>
                <th className="px-3 md:px-4 py-3">{t('monthlyPage.columns.worker')}</th>
                <th className="px-3 md:px-4 py-3">{t('monthlyPage.columns.type')}</th>
                <th className="px-3 md:px-4 py-3">{t('monthlyPage.columns.group')}</th>
                <th className="px-3 md:px-4 py-3 text-right">{t('monthlyPage.columns.hours')}</th>
                <th className="px-3 md:px-4 py-3 text-right">{t('monthlyPage.columns.cost')}</th>
                <th className="px-3 md:px-4 py-3 text-right">{t('monthlyPage.columns.charge')}</th>
                <th className="px-3 md:px-4 py-3 text-center">{t('monthlyPage.columns.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 md:px-4 py-6 text-center text-gray-500 dark:text-slate-300 text-sm md:text-base">
                    {t('monthlyPage.emptyDesc')}
                  </td>
                </tr>
              ) : filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="px-3 md:px-4 py-3 text-gray-800 dark:text-slate-50">{formatDate(job.date)}</td>
                  <td className="px-3 md:px-4 py-3 font-semibold text-gray-900 dark:text-slate-50">{job.description}</td>
                  <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.location || '-'}</td>
                  <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.workers?.display_name || job.workers?.alias || '-'}</td>
                  <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.job_type || job.type || '-'}</td>
                  <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.groups?.name || '-'}</td>
                  <td className="px-3 md:px-4 py-3 text-right text-gray-900 dark:text-slate-50">{job.hours_worked}</td>
                  <td className="px-3 md:px-4 py-3 text-right text-gray-900 dark:text-slate-50">
                    {formatCurrency(job.cost_spent)}
                  </td>
                  <td className="px-3 md:px-4 py-3 text-right font-semibold text-green-700 dark:text-green-300">
                    {formatCurrency((job.status || '').trim().toLowerCase() === 'completed' ? 0 : job.amount_to_charge)}
                  </td>
                  <td className="px-3 md:px-4 py-3 text-center">
                    <span className={`text-[10px] md:text-xs px-3 py-1.5 rounded-full font-semibold ${
                      job.status === 'completed' ? 'bg-green-100 text-green-700' :
                      job.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {job.status === 'pending' ? t('monthlyPage.status.pending') : job.status === 'completed' ? t('monthlyPage.status.completed') : t('monthlyPage.status.archived')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
          <div className="grid gap-6">
             {Object.keys(jobsByDay).length === 0 ? (
                 <div className="bg-white dark:bg-slate-900 p-14 rounded-2xl shadow-sm border border-dashed border-gray-300 dark:border-slate-800 text-center text-xl">
                     <CalendarDays className="w-14 h-14 mx-auto text-gray-300 dark:text-slate-600 mb-4" />
                     <h3 className="text-3xl font-semibold text-gray-900 dark:text-slate-50">{t('monthlyPage.emptyTitle')}</h3>
                     <p className="text-lg text-gray-500 dark:text-slate-300 mt-1">{t('monthlyPage.emptyDesc')}</p>
                 </div>
             ) : (
                 Object.keys(jobsByDay).sort().reverse().map(date => {
                     const dayJobs = jobsByDay[date];
                     const dayTotal = dayJobs.reduce((sum, j) => {
                        const status = (j.status || '').trim().toLowerCase();
                        return sum + (status === 'completed' ? 0 : Number(j.amount_to_charge) || 0);
                     }, 0);
                     
                     return (
                         <div key={date} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow card-lg">
                             <div className="bg-gray-50/80 dark:bg-slate-800/80 p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center backdrop-blur-sm">
                                 <div className="flex items-center font-bold text-gray-800 dark:text-slate-50 text-xl md:text-2xl">
                                     <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm mr-3 border border-gray-100 dark:border-slate-800">
                                        <CalendarDays className="w-7 h-7 text-[#1e3a8a]" />
                                     </div>
                                     <span className="capitalize">{formatDate(date)}</span>
                                 </div>
                                 <span className="font-bold text-[#1e3a8a] bg-blue-50 dark:bg-blue-900/30 px-5 py-2 rounded-full border border-blue-100 dark:border-blue-800 text-xl md:text-2xl">
                                     {formatCurrency(dayTotal)}
                                 </span>
                             </div>
                             <div className="divide-y divide-gray-100 dark:divide-slate-800">
                                 {dayJobs.map(job => (
                                    <div key={job.id} className="p-6 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-gray-50/50 dark:hover:bg-slate-800/60 transition-colors gap-3">
                                         <div className="flex-1 min-w-0">
                                            <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-slate-50 truncate">{job.description}</p>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className="text-base md:text-lg text-gray-500 dark:text-slate-300">{job.location || '-'}</span>
                                                <span className="text-base md:text-lg bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-gray-600 dark:text-slate-200">
                                                    {job.workers?.display_name || job.workers?.alias || (isEn ? 'No worker' : 'Sin trabajador')}
                                                </span>
                                                {job.groups && (
                                                    <span className="text-base md:text-lg bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-gray-600 dark:text-slate-200">
                                                        {job.groups.name}
                                                    </span>
                                                )}
                                                <span className="text-base md:text-lg bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-gray-600 dark:text-slate-200">
                                                    {job.job_type || job.type || (isEn ? 'Type' : 'Tipo')}
                                                </span>
                                            </div>
                                         </div>
                                         <div className="flex items-center justify-between sm:justify-end gap-4 min-w-[170px]">
                                             <div className="text-right">
                                                <span className="block text-base md:text-lg text-gray-400 dark:text-slate-400 uppercase tracking-wide">{t('monthlyPage.chargeLabel')}</span>
                                                 <span className="font-semibold text-gray-900 dark:text-slate-50 text-xl md:text-2xl">{formatCurrency(job.amount_to_charge)}</span>
                                                 <span className="block text-base text-gray-500 dark:text-slate-300">
                                                    {isEn ? 'Hours' : 'Horas'}: {job.hours_worked}
                                                 </span>
                                             </div>
                                             <div className="text-right w-24">
                                                 <span className={`text-base md:text-lg px-4 py-2 rounded-full font-medium ${
                                                     job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                     job.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                                                     'bg-yellow-100 text-yellow-700'
                                                 }`}>
                                                     {job.status === 'pending' ? t('monthlyPage.status.pending') : job.status === 'completed' ? t('monthlyPage.status.completed') : t('monthlyPage.status.archived')}
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
