
import React, { useMemo, useState, useEffect, useRef } from 'react';
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
import { formatDate } from '@/utils/formatters';
import JobDetailModal from '@/components/jobs/JobDetailModal';
import QuickFilterChips from '@/components/jobs/QuickFilterChips';
import { onboardingService } from '@/services/onboarding.service';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { wasRecentManualNav } from '@/onboarding/onboardingStorage';

export default function DailyJobsPage() {
  const { user, isAdmin, userRole } = useAuth();
  const { addToast } = useToast();
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const { startTour, resumeTourIfNeeded } = useOnboardingTour();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [clearingPending, setClearingPending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');
  const reqIdRef = useRef(0);
  const groupOptions = useMemo(() => (
    jobs.reduce((acc, job) => {
      if (!job?.group_id) return acc;
      if (!acc.some((g) => g.id === job.group_id)) {
        acc.push({ id: job.group_id, name: job.groups?.name || job.group_id });
      }
      return acc;
    }, [])
  ), [jobs]);
  const workerOptions = useMemo(() => (
    jobs.reduce((acc, job) => {
      if (!job?.worker_id) return acc;
      if (!acc.some((w) => w.id === job.worker_id)) {
        const label = job.workers?.display_name || job.workers?.alias || job.worker_id;
        acc.push({ id: job.worker_id, name: label });
      }
      return acc;
    }, [])
  ), [jobs]);
  const filteredJobs = useMemo(() => (
    jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      if (groupFilter !== 'all' && (job.group_id || '') !== groupFilter) return false;
      if (workerFilter !== 'all' && (job.worker_id || '') !== workerFilter) return false;
      return true;
    })
  ), [jobs, statusFilter, groupFilter, workerFilter]);
  const hasJobs = filteredJobs.length > 0;
  const clearDisabled = clearing || loading;
  const clearPendingDisabled = clearingPending || loading;
  const autoTourStartedRef = useRef(false);
  const role = ['admin', 'solicitante', 'trabajador'].includes(userRole)
    ? userRole
    : (isAdmin ? 'admin' : 'solicitante');

  useEffect(() => {
    if (user) fetchJobs();
  }, [date, user]);

  const withTimeout = (promise, ms = 12000) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);

  const fetchJobs = async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const result = await withTimeout(jobsService.getJobsByDay(date), 12000);
      if (reqId !== reqIdRef.current) return;
      if (result?.success) {
        const nextJobs = Array.isArray(result.data) ? result.data : [];
        setJobs(nextJobs);
      } else {
        setJobs([]);
        addToast(result?.error || (isEn ? 'Failed to load jobs.' : 'No se pudieron cargar los trabajos.'), 'error');
      }
    } catch (error) {
      if (reqId !== reqIdRef.current) return;
      console.error('[DailyJobsPage] fetchJobs failed:', error);
      setJobs([]);
      addToast(
        error?.message === 'timeout'
          ? (isEn ? 'Request timed out.' : 'La carga tardó demasiado (timeout).')
          : (isEn ? 'Failed to load jobs.' : 'No se pudieron cargar los trabajos.'),
        'error'
      );
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleShare = () => {
    if (!filteredJobs || filteredJobs.length === 0) {
      addToast(isEn ? 'No jobs to share.' : 'No hay trabajos para compartir.', 'error');
      return;
    }
    const title = isEn
      ? `Daily jobs - ${date}`
      : `Trabajos diarios - ${date}`;
    exportService.shareJobsViaWhatsApp(filteredJobs, title);
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

  useEffect(() => {
    if (!user || loading) return;
    if (typeof window === 'undefined') return;

    const autostartKey = `onboarding_autostart_done:${user.id}:${role}`;
    const shouldRestart = window.sessionStorage.getItem('onboarding_restart') === '1';
    const shouldReplay = window.sessionStorage.getItem('onboarding_replay') === '1';
    const inProgress = window.sessionStorage.getItem('onboarding_in_progress') === '1';

    if (shouldRestart || shouldReplay || inProgress) {
      if (wasRecentManualNav()) return;
      const handled = resumeTourIfNeeded({
        role,
        onComplete: () => {
          onboardingService.setOnboardingCompleted(user.id, role);
          window.localStorage.setItem(autostartKey, '1');
        }
      });
      if (handled) {
        autoTourStartedRef.current = true;
        return;
      }
    }

    if (autoTourStartedRef.current) return;

    const createdAt = user?.created_at ? new Date(user.created_at).getTime() : null;
    const isNewUser = createdAt ? (Date.now() - createdAt) <= 7 * 24 * 60 * 60 * 1000 : false;
    if (jobs.length !== 0 && !isNewUser) return;
    if (window.localStorage.getItem(autostartKey) === '1') return;

    let cancelled = false;
    const run = async () => {
      const progress = await onboardingService.getOnboardingProgress(user.id);
      if (cancelled) return;
      const completed = (progress?.data || []).some((entry) => entry.role === role && entry.completed);
      if (!completed) {
        const started = startTour({
          role,
          mode: 'auto',
          onComplete: () => {
            onboardingService.setOnboardingCompleted(user.id, role);
            window.localStorage.setItem(autostartKey, '1');
          }
        });
        if (started) {
          window.localStorage.setItem(autostartKey, '1');
          autoTourStartedRef.current = true;
        }
      }
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [user, loading, jobs.length, role, startTour, resumeTourIfNeeded]);

  return (
    <div className="space-y-8">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-50">
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            <h1 className="text-3xl md:text-3xl font-bold text-gray-900 dark:text-slate-50 hidden md:block">
              {isEn ? 'Daily Jobs' : 'Trabajos Diarios'}
            </h1>
            <input 
                data-tour="filtro-fecha"
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
            onClick={() => exportService.exportDayToExcel(date, filteredJobs)}
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

      <QuickFilterChips
        filters={{ status: statusFilter, groupId: groupFilter, workerId: workerFilter }}
        onChange={(key, value) => {
          if (key === 'status') setStatusFilter(value);
          if (key === 'groupId') setGroupFilter(value);
          if (key === 'workerId') setWorkerFilter(value);
        }}
        groups={groupOptions}
        workers={workerOptions}
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden card-lg" data-tour="tabla-trabajos">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-slate-50">{isEn ? 'Summary table' : 'Tabla resumen'}</h2>
          <span className="text-sm md:text-base text-gray-500 dark:text-slate-300">{filteredJobs.length} {isEn ? 'records' : 'registros'}</span>
        </div>
        <div>
          {loading ? (
            <div className="py-10 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="table-x-scroll overflow-x-auto">
              <table className="w-full min-w-[1100px] text-xs md:text-sm text-left whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-100 uppercase font-semibold border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Date' : 'Fecha'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Description' : 'Descripción'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Workplace' : 'Lugar de trabajo'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Requester' : 'Solicitante'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Worker' : 'Trabajador'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Job type' : 'Tipo de trabajo'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Group' : 'Grupo'}</th>
                    <th className="px-3 md:px-4 py-3 text-center">{isEn ? 'Status' : 'Estado'}</th>
                    <th className="px-3 md:px-4 py-3 text-center">{isEn ? 'Actions' : 'Acciones'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 md:px-4 py-6 text-center text-gray-500 dark:text-slate-300 text-sm md:text-base">
                        {t('monthlyPage.emptyDesc')}
                      </td>
                    </tr>
                  ) : filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-3 md:px-4 py-3 text-gray-800 dark:text-slate-50">{formatDate(job.date)}</td>
                      <td className="px-3 md:px-4 py-3 font-semibold text-gray-900 dark:text-slate-50">{job.description}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.location || '-'}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.requested_by || '-'}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.workers?.display_name || job.workers?.alias || '-'}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.job_type || job.type || '-'}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.groups?.name || '-'}</td>
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
