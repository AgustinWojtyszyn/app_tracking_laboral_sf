
import React, { useState, useEffect } from 'react';
import { jobsService } from '@/services/jobs.service';
import { exportService } from '@/services/export.service';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Trash2, MessageCircle, FileSpreadsheet, Eye, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JobForm from '@/components/jobs/JobForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { formatCurrency, formatDate } from '@/utils/formatters';
import JobDetailModal from '@/components/jobs/JobDetailModal';

export default function DailyJobsPage() {
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [clearingPending, setClearingPending] = useState(false);
  const hasJobs = jobs.length > 0;
  const clearDisabled = clearing || loading;
  const clearPendingDisabled = clearingPending || loading;

  useEffect(() => {
    if (user) fetchJobs();
  }, [date, user]);

  const fetchJobs = async () => {
    setLoading(true);
    const result = await jobsService.getJobsByDay(date);
    if (result.success) {
      setJobs(result.data);
    } else {
      addToast(result.error, 'error');
    }
    setLoading(false);
  };

  const handleShare = () => {
    if (!jobs || jobs.length === 0) {
      addToast(isEn ? 'No jobs to share.' : 'No hay trabajos para compartir.', 'error');
      return;
    }
    const title = isEn
      ? `Daily jobs - ${date}`
      : `Trabajos diarios - ${date}`;
    exportService.shareJobsViaWhatsApp(jobs, title);
  };

  const handleClearCompleted = async () => {
    if (!isAdmin) {
      addToast(isEn ? 'Only administrators can clean completed jobs.' : 'Solo los administradores pueden limpiar trabajos completados.', 'error');
      return;
    }
    setClearing(true);
    const result = await jobsService.deleteCompletedJobs(date, date);
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
    const result = await jobsService.deletePendingJobs(date, date);
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

  const totals = jobs.reduce((acc, job) => {
    const status = (job.status || '').trim().toLowerCase();
    return {
      hours: acc.hours + (Number(job.hours_worked) || 0),
      cost: acc.cost + (status === 'completed' ? 0 : (Number(job.cost_spent) || 0)),
      charge: acc.charge + (status === 'completed' ? 0 : (Number(job.amount_to_charge) || 0)),
    };
  }, { hours: 0, cost: 0, charge: 0 });

  return (
    <div className="space-y-8">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-50">
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            <h1 className="text-3xl md:text-3xl font-bold text-gray-900 dark:text-slate-50 hidden md:block">
              {isEn ? 'Daily Jobs' : 'Trabajos Diarios'}
            </h1>
            <input 
                type="date" 
                className="w-full md:w-48 py-2.5 px-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 text-sm md:text-base"
                value={date}
                onChange={(e) => setDate(e.target.value)}
            />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end sm:gap-3 w-full">
          <Button
            variant="default"
            className="w-full sm:w-auto md:min-w-[170px] h-10 sm:h-11 md:h-14 text-sm sm:text-base md:text-lg shadow-md bg-gradient-to-r from-[#1D976C] to-[#93F9B9] text-[#0b4f31] hover:from-[#168b60] hover:to-[#83efad] border-0 gap-2"
            onClick={() => exportService.exportDayToExcel(date, jobs)}
            disabled={!hasJobs || loading}
          >
            <FileSpreadsheet className="w-5 h-5" /> {isEn ? 'Export to Excel' : 'Exportar a Excel'}
          </Button>
          <Button
            variant="default"
            className="w-full sm:w-auto md:min-w-[170px] h-10 sm:h-11 md:h-14 text-sm sm:text-base md:text-lg shadow-md bg-[#25D366] hover:bg-[#1ebe5a] text-white border-0 gap-2"
            onClick={handleShare}
            disabled={!hasJobs || loading}
          >
            <MessageCircle className="w-5 h-5" /> {isEn ? 'Share WhatsApp' : 'Compartir WhatsApp'}
          </Button>
          <ConfirmationModal
            title={isEn ? 'Clean completed?' : '¿Limpiar completados?'}
            description={isEn ? 'Delete all completed jobs for this day.' : 'Eliminar todos los trabajos con estado completado de esta fecha.'}
            confirmLabel={isEn ? 'Delete' : 'Eliminar'}
            onConfirm={handleClearCompleted}
            trigger={
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto md:min-w-[140px] h-10 sm:h-11 md:h-11 text-sm md:text-sm lg:text-base shadow-sm bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                disabled={clearDisabled}
              >
                <Trash2 className="w-5 h-5 mr-2" /> {clearing ? (isEn ? 'Cleaning...' : 'Limpiando...') : (isEn ? 'Clear completed' : 'Limpiar completados')}
              </Button>
            }
          />
          <ConfirmationModal
            title={isEn ? 'Clean pending?' : '¿Limpiar pendientes?'}
            description={isEn ? 'Delete all pending jobs for this day.' : 'Eliminar todos los trabajos pendientes de esta fecha.'}
            confirmLabel={isEn ? 'Delete pending' : 'Eliminar pendientes'}
            onConfirm={handleClearPending}
            trigger={
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto md:min-w-[140px] h-10 sm:h-11 md:h-11 text-sm md:text-sm lg:text-base shadow-sm bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                disabled={clearPendingDisabled}
              >
                <Trash2 className="w-5 h-5 mr-2" /> {clearingPending ? (isEn ? 'Cleaning pending...' : 'Limpiando pendientes...') : (isEn ? 'Clear pending' : 'Limpiar pendientes')}
              </Button>
            }
          />
          <div className="col-span-2 sm:col-span-1 w-full sm:w-auto md:min-w-[140px]">
            <JobForm onSuccess={fetchJobs} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-slate-900 p-5 rounded-xl border border-blue-100 dark:border-slate-700 text-center card-lg">
            <span className="text-sm md:text-base text-blue-600 dark:text-blue-200 font-semibold uppercase tracking-wide">
              {isEn ? 'Total Hours' : 'Total Horas'}
            </span>
            <p className="text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{totals.hours}</p>
        </div>
        <div className="bg-green-50 dark:bg-slate-900 p-5 rounded-xl border border-green-100 dark:border-slate-700 text-center card-lg">
             <span className="text-sm md:text-base text-green-600 dark:text-green-200 font-semibold uppercase tracking-wide">
               {isEn ? 'Total Cost' : 'Total Costo'}
             </span>
             <p className="text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100 mt-1">{formatCurrency(totals.cost)}</p>
        </div>
        <div className="bg-purple-50 dark:bg-slate-900 p-5 rounded-xl border border-purple-100 dark:border-slate-700 text-center card-lg">
             <span className="text-sm md:text-base text-purple-600 dark:text-purple-200 font-semibold uppercase tracking-wide">
               {isEn ? 'Total to Charge' : 'Total a Cobrar'}
             </span>
             <p className="text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">{formatCurrency(totals.charge)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden card-lg">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-slate-50">{isEn ? 'Summary table' : 'Tabla resumen'}</h2>
          <span className="text-sm md:text-base text-gray-500 dark:text-slate-300">{jobs.length} {isEn ? 'records' : 'registros'}</span>
        </div>
        <div>
          {loading ? (
            <div className="py-10 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-xs md:text-sm text-left">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-100 uppercase font-semibold border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Date' : 'Fecha'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Description' : 'Descripción'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Workplace' : 'Lugar de trabajo'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Worker' : 'Trabajador'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Job type' : 'Tipo de trabajo'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Group' : 'Grupo'}</th>
                    <th className="px-3 md:px-4 py-3 text-right">{isEn ? 'Hours' : 'Horas'}</th>
                    <th className="px-3 md:px-4 py-3 text-right">{isEn ? 'Cost' : 'Costo'}</th>
                    <th className="px-3 md:px-4 py-3 text-right">{isEn ? 'Charge' : 'Cobrar'}</th>
                    <th className="px-3 md:px-4 py-3 text-center">{isEn ? 'Status' : 'Estado'}</th>
                    <th className="px-3 md:px-4 py-3 text-center">{isEn ? 'Actions' : 'Acciones'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 md:px-4 py-6 text-center text-gray-500 dark:text-slate-300 text-sm md:text-base">
                        {t('monthlyPage.emptyDesc')}
                      </td>
                    </tr>
                  ) : jobs.map((job) => (
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
                          {job.status === 'pending'
                            ? (isEn ? 'Pending' : 'Pendiente')
                            : job.status === 'completed'
                              ? (isEn ? 'Completed' : 'Completado')
                              : (isEn ? 'Archived' : 'Archivado')}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-3 text-center">
                        <div className="flex justify-center gap-3 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedJob(job)}
                            className="h-9 px-3 rounded-full text-[#1e3a8a] border-blue-200 text-xs md:text-sm font-semibold shadow-sm"
                          >
                            <Eye className="w-4 h-4 mr-1" /> {isEn ? 'View' : 'Detalle'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingJob(job)}
                            className="h-9 px-3 rounded-full bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs md:text-sm font-semibold shadow-sm"
                          >
                            <Edit2 className="w-4 h-4 mr-1" /> {isEn ? 'Edit' : 'Editar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {editingJob && (
        <JobForm
          jobToEdit={editingJob}
          onSuccess={() => {
            setEditingJob(null);
            fetchJobs();
          }}
        />
      )}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onEdit={(job) => {
            setSelectedJob(null);
            setEditingJob(job);
          }}
        />
      )}

        </div>
    );
}
