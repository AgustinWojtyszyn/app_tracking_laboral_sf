
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { formatDate, formatCurrency } from '@/utils/formatters';
import JobsFilters from '@/components/jobs/JobsFilters';
import JobsPagination from '@/components/jobs/JobsPagination';
import { onboardingService } from '@/services/onboarding.service';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { wasRecentManualNav } from '@/onboarding/onboardingStorage';
import { normalizeJobStatus } from '@/utils/jobStatus';
import { JOB_LOCATIONS } from '@/constants/jobLocations';

export default function DailyJobsPage() {
  const { user, isAdmin, userRole } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const { startTour, resumeTourIfNeeded } = useOnboardingTour();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingJob, setEditingJob] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [clearingPending, setClearingPending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const reqIdRef = useRef(0);
  const exportLockRef = useRef(false);
  const shareLockRef = useRef(false);
  const filteredJobs = jobs;
  const hasJobs = filteredJobs.length > 0;
  const clearDisabled = clearing || loading || exporting || sharing;
  const clearPendingDisabled = clearingPending || loading || exporting || sharing;
  const autoTourStartedRef = useRef(false);
  const role = ['admin', 'solicitante', 'trabajador', 'chofer'].includes(userRole)
    ? userRole
    : (isAdmin ? 'admin' : 'solicitante');
  const locationOptions = useMemo(() => (
    [...JOB_LOCATIONS].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
  ), []);

  const handleLocationChange = (value) => {
    setSelectedLocation(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  };

  useEffect(() => {
    if (user) fetchJobs();
  }, [user, date, selectedLocation, debouncedSearchTerm, currentPage, pageSize]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const withTimeout = (promise, ms = 12000) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);

  const fetchJobs = async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await withTimeout(jobsService.listJobsPaginated({
        date,
        location: selectedLocation,
        search: debouncedSearchTerm,
        page: currentPage,
        pageSize,
      }), 12000);
      if (reqId !== reqIdRef.current) return;
      if (result?.success) {
        const payload = result.data || {};
        const nextJobs = Array.isArray(payload.items) ? payload.items : [];
        setJobs(nextJobs);
        setTotalCount(Number(payload.total_count || 0));
        setTotalPages(Math.max(1, Number(payload.total_pages || 1)));
        setCurrentPage(Math.max(1, Number(payload.page || currentPage || 1)));
        setPageSize(Number(payload.page_size || pageSize || 10));
        setHasPreviousPage(Boolean(payload.has_previous_page));
        setHasNextPage(Boolean(payload.has_next_page));
      } else {
        setJobs([]);
        setTotalCount(0);
        setTotalPages(1);
        setHasPreviousPage(false);
        setHasNextPage(false);
        const message = result?.error || (isEn ? 'Failed to load jobs.' : 'No se pudieron cargar los trabajos.');
        setError(message);
        addToast(message, 'error');
      }
    } catch (error) {
      if (reqId !== reqIdRef.current) return;
      console.error('[DailyJobsPage] fetchJobs failed:', error);
      setJobs([]);
      setTotalCount(0);
      setTotalPages(1);
      setHasPreviousPage(false);
      setHasNextPage(false);
      const message = error?.message === 'timeout'
        ? (isEn ? 'Request timed out.' : 'La carga tardó demasiado (timeout).')
        : (isEn ? 'Failed to load jobs.' : 'No se pudieron cargar los trabajos.');
      setError(message);
      addToast(message, 'error');
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleDateChange = (event) => {
    setDate(event.target.value);
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  const loadJobsForExport = async () => {
    const result = await jobsService.listJobsForExport({
      date,
      location: selectedLocation,
      search: debouncedSearchTerm,
    });

    if (!result.success) {
      throw new Error(result.error || 'No se pudieron preparar los trabajos.');
    }

    return Array.isArray(result.data?.items) ? result.data.items : [];
  };

  const handleExportExcel = async () => {
    if (exportLockRef.current || shareLockRef.current) return;
    exportLockRef.current = true;
    setExporting(true);
    try {
      const exportJobs = await loadJobsForExport();
      if (exportJobs.length === 0) {
        addToast(isEn ? 'No jobs to export.' : 'No hay trabajos para exportar.', 'error');
        return;
      }
      exportService.exportDayToExcel(date, exportJobs);
    } catch (error) {
      addToast(error.message || (isEn ? 'Export failed.' : 'No se pudo preparar la exportación.'), 'error');
    } finally {
      exportLockRef.current = false;
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (shareLockRef.current || exportLockRef.current) return;
    shareLockRef.current = true;
    setSharing(true);
    try {
      const exportJobs = await loadJobsForExport();
      if (exportJobs.length === 0) {
        addToast(isEn ? 'No jobs to share.' : 'No hay trabajos para compartir.', 'error');
        return;
      }
      const title = isEn
        ? `Daily jobs - ${date}`
        : `Trabajos diarios - ${date}`;
      exportService.shareJobsViaWhatsApp(exportJobs, title);
    } catch (error) {
      addToast(error.message || (isEn ? 'Share failed.' : 'No se pudo preparar el envío.'), 'error');
    } finally {
      shareLockRef.current = false;
      setSharing(false);
    }
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
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-900 p-4 md:p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-50">
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full xl:w-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-50">
              {isEn ? 'Daily Jobs' : 'Trabajos Diarios'}
            </h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end sm:gap-3 w-full xl:flex-1">
	          <Button
	            variant="default"
	            className="w-full sm:w-auto md:min-w-[170px] h-10 sm:h-11 md:h-12 text-sm sm:text-base md:text-base shadow-md bg-gradient-to-r from-[#1D976C] to-[#93F9B9] text-[#0b4f31] hover:from-[#168b60] hover:to-[#83efad] border-0 gap-2 whitespace-nowrap"
	            onClick={handleExportExcel}
	            disabled={loading || exporting || sharing}
	          >
	            <FileSpreadsheet className="w-5 h-5" /> {exporting ? (isEn ? 'Preparing...' : 'Preparando...') : (isEn ? 'Export to Excel' : 'Exportar a Excel')}
	          </Button>
	          <Button
	            variant="default"
	            className="w-full sm:w-auto md:min-w-[170px] h-10 sm:h-11 md:h-12 text-sm sm:text-base md:text-base shadow-md bg-[#25D366] hover:bg-[#1ebe5a] text-white border-0 gap-2 whitespace-nowrap"
	            onClick={handleShare}
	            disabled={loading || sharing || exporting}
	          >
	            <MessageCircle className="w-5 h-5" /> {sharing ? (isEn ? 'Preparing...' : 'Preparando...') : (isEn ? 'Share WhatsApp' : 'Compartir WhatsApp')}
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
                className="w-full sm:w-auto md:min-w-[150px] h-10 sm:h-11 md:h-11 text-sm md:text-sm lg:text-base shadow-sm bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 whitespace-nowrap"
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
                className="w-full sm:w-auto md:min-w-[150px] h-10 sm:h-11 md:h-11 text-sm md:text-sm lg:text-base shadow-sm bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 whitespace-nowrap"
                disabled={clearPendingDisabled}
              >
                <Trash2 className="w-5 h-5 mr-2" /> {clearingPending ? (isEn ? 'Cleaning pending...' : 'Limpiando pendientes...') : (isEn ? 'Clear pending' : 'Limpiar pendientes')}
              </Button>
            }
          />
          <div className="sm:ml-auto w-full sm:w-auto md:min-w-[150px]">
            <Button
              type="button"
              onClick={() => navigate('/app/trabajos-diarios/nuevo')}
              className="w-full h-11 px-4 text-sm md:text-base bg-[#1e3a8a] hover:bg-blue-900 text-white whitespace-nowrap"
              data-tour="nuevo-trabajo"
            >
              Nuevo Trabajo
            </Button>
          </div>
        </div>
      </div>

      <JobsFilters
        isEn={isEn}
        date={date}
        searchTerm={searchTerm}
        selectedLocation={selectedLocation}
        locationOptions={locationOptions}
        pageSize={pageSize}
        onDateChange={handleDateChange}
        onSearchChange={handleSearchChange}
        onLocationChange={handleLocationChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden card-lg" data-tour="tabla-trabajos">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-slate-50">{isEn ? 'Summary table' : 'Tabla resumen'}</h2>
          <span className="text-sm md:text-base text-gray-500 dark:text-slate-300">{totalCount} {isEn ? 'jobs' : 'trabajos'}</span>
        </div>
        <div>
          {loading ? (
            <div className="py-10 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-center text-sm md:text-base text-red-600 dark:text-red-300">
              {error}
            </div>
          ) : (
            <div className="table-x-scroll overflow-x-auto">
              <table className="w-full min-w-[1250px] text-xs md:text-sm text-left whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-100 uppercase font-semibold border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Date' : 'Fecha'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Description' : 'Descripción'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Workplace' : 'Lugar de trabajo'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Requester' : 'Solicitante'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Worker' : 'Trabajador'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Job type' : 'Tipo de trabajo'}</th>
                    <th className="px-3 md:px-4 py-3">{isEn ? 'Group' : 'Grupo'}</th>
                    <th className="px-3 md:px-4 py-3 text-right">{isEn ? 'Worker cost' : 'Costo trabajador'}</th>
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
                    (() => {
                      const normalizedStatus = normalizeJobStatus(job?.estado || job?.status);
                      const statusClass = normalizedStatus === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : normalizedStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : normalizedStatus === 'archived'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-slate-100 text-slate-700';
                      const statusLabel = normalizedStatus === 'completed'
                        ? (isEn ? 'Completed' : 'Completado')
                        : normalizedStatus === 'pending'
                          ? (isEn ? 'Pending' : 'Pendiente')
                          : normalizedStatus === 'archived'
                            ? (isEn ? 'Archived' : 'Archivado')
                            : (isEn ? 'Not informed' : 'No informado');
                      return (
                    <tr key={job.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-3 md:px-4 py-3 text-gray-800 dark:text-slate-50">{formatDate(job.date)}</td>
                      <td className="px-3 md:px-4 py-3 font-semibold text-gray-900 dark:text-slate-50">{job.title || job.description}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.location || '-'}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.requested_by || '-'}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.workers?.display_name || job.workers?.alias || '-'}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.job_type || job.type || '-'}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">{job.groups?.name || '-'}</td>
                      <td className="px-3 md:px-4 py-3 text-right text-gray-700 dark:text-slate-200">{formatCurrency(job.cost_spent)}</td>
                      <td className="px-3 md:px-4 py-3 text-right text-gray-700 dark:text-slate-200">{formatCurrency(job.amount_to_charge)}</td>
                      <td className="px-3 md:px-4 py-3 text-center">
                        <span className={`text-[10px] md:text-xs px-3 py-1.5 rounded-full font-semibold ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-3 text-center">
                        <div className="flex justify-center gap-3 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/app/jobs/${job.id}`)}
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
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <JobsPagination
          isEn={isEn}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          loading={loading}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
        />
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

        </div>
    );
}
