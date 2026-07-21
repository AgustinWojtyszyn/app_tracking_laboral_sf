
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsService } from '@/services/jobs.service';
import { exportService } from '@/services/export.service';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Trash2, MessageCircle, FileSpreadsheet, Eye, Edit2, Copy, MoreHorizontal, Plus } from 'lucide-react';
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
import { getJobStatusBadgeClass, getJobStatusLabel, JOB_STATUS_OPTIONS, normalizeJobStatus } from '@/utils/jobStatus';
import { JOB_LOCATIONS } from '@/constants/jobLocations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const getArgentinaToday = () => (
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
);

const buildDuplicateJobDraft = (job, selectedDate) => ({
  date: selectedDate || getArgentinaToday(),
  title: job?.title || '',
  location: job?.location || '',
  requested_by: job?.requested_by || '',
  description: job?.description || '',
  group_id: job?.group_id || '',
  editable_by_group: Boolean(job?.editable_by_group),
  action_type: job?.action_type || '',
  sector_type: job?.sector_type || '',
  sector_custom: job?.sector_custom || '',
  cost_spent: job?.cost_spent ?? '',
  amount_to_charge: job?.amount_to_charge ?? '',
  worker_id: job?.worker_id || '',
});

const emptySummary = {
  total: 0,
  pending: 0,
  completed: 0,
  workers: 0,
  locations: 0,
  totalCharge: 0,
  workerCost: 0,
  balance: 0,
};

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
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [summary, setSummary] = useState(emptySummary);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const reqIdRef = useRef(0);
  const summaryReqIdRef = useRef(0);
  const exportLockRef = useRef(false);
  const shareLockRef = useRef(false);
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

  const handleStatusFilterChange = (eventOrValue) => {
    const value = typeof eventOrValue === 'string' ? eventOrValue : eventOrValue.target.value;
    setSelectedStatus(value);
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
  }, [user, date, selectedLocation, selectedStatus, debouncedSearchTerm, currentPage, pageSize]);

  useEffect(() => {
    if (user) fetchSummary();
  }, [user, date, selectedLocation, debouncedSearchTerm]);

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
        status: selectedStatus,
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

  const fetchSummary = async () => {
    const reqId = ++summaryReqIdRef.current;
    const result = await jobsService.getDailyJobsSummary({
      date,
      location: selectedLocation,
      search: debouncedSearchTerm,
    });
    if (reqId !== summaryReqIdRef.current) return;
    if (result?.success) {
      setSummary({ ...emptySummary, ...(result.data || {}) });
    } else {
      setSummary(emptySummary);
    }
  };

  const handleDateChange = (event) => {
    const nextDate = event.target.value;
    if (!nextDate) return;
    setDate(nextDate);
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  const handleDuplicateJob = (job) => {
    navigate('/app/trabajos-diarios/nuevo', {
      state: {
        duplicateJobDraft: buildDuplicateJobDraft(job, date || getArgentinaToday()),
      },
    });
  };

  const loadJobsForExport = async () => {
    const result = await jobsService.listJobsForExport({
      date,
      location: selectedLocation,
      status: selectedStatus,
      search: searchTerm.trim(),
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
    const result = await jobsService.deleteCompletedJobs(date, date, {
      location: selectedLocation,
      search: searchTerm.trim(),
    });
    if (result.success) {
      const removed = result.removed || 0;
      addToast(
        removed === 0
          ? (isEn ? 'No completed jobs to remove.' : 'No hay trabajos completados para eliminar.')
          : (isEn ? `Removed ${removed} completed jobs.` : `Se eliminaron ${removed} trabajos completados.`),
        'success'
      );
      fetchJobs();
      fetchSummary();
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
    const result = await jobsService.deletePendingJobs(date, date, {
      location: selectedLocation,
      search: searchTerm.trim(),
    });
    if (result.success) {
      const removed = result.removed || 0;
      addToast(
        removed === 0
          ? (isEn ? 'No pending jobs to remove.' : 'No hay trabajos pendientes para eliminar.')
          : (isEn ? `Removed ${removed} pending jobs.` : `Se eliminaron ${removed} trabajos pendientes.`),
        'success'
      );
      fetchJobs();
      fetchSummary();
    } else {
      addToast(result.error, 'error');
    }
    setClearingPending(false);
  };

  const applyStatusChange = async (job, nextStatus) => {
    if (!job?.id) return;
    setUpdatingStatusId(job.id);
    const result = await jobsService.updateJob(job.id, { status: nextStatus }, user?.id || null);
    if (result.success) {
      addToast(isEn ? 'Status updated.' : 'Estado actualizado.', 'success');
      fetchJobs();
      fetchSummary();
    } else {
      addToast(result.error || (isEn ? 'Status could not be updated.' : 'No se pudo actualizar el estado.'), 'error');
    }
    setUpdatingStatusId(null);
  };

  const handleRowStatusChange = (job, nextStatus) => {
    const normalizedNext = normalizeJobStatus(nextStatus);
    const currentStatus = normalizeJobStatus(job?.status || job?.estado);
    if (normalizedNext === currentStatus) return;
    if (normalizedNext === 'cancelled') {
      setPendingStatusChange({ job, nextStatus: normalizedNext });
      return;
    }
    applyStatusChange(job, normalizedNext);
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
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 text-gray-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 md:p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full xl:w-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-50 md:text-3xl">
              {isEn ? 'Daily Jobs' : 'Trabajos Diarios'}
            </h2>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-end xl:flex-1">
          <Button
            type="button"
            onClick={() => navigate('/app/trabajos-diarios/nuevo')}
            className="h-11 w-full bg-[#1e3a8a] px-4 text-sm font-semibold text-white hover:bg-blue-900 sm:w-auto md:min-w-[170px] md:text-base"
            data-tour="nuevo-trabajo"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Trabajo
          </Button>
          <Button
            variant="outline"
            className="h-10 w-full gap-2 whitespace-nowrap border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 sm:w-auto md:min-w-[160px]"
            onClick={handleExportExcel}
            disabled={loading || exporting || sharing}
          >
            <FileSpreadsheet className="h-4 w-4" /> {exporting ? (isEn ? 'Preparing...' : 'Preparando...') : (isEn ? 'Export to Excel' : 'Exportar a Excel')}
          </Button>
          <Button
            variant="outline"
            className="h-10 w-full gap-2 whitespace-nowrap border-green-200 bg-white text-sm font-semibold text-green-700 hover:bg-green-50 sm:w-auto md:min-w-[165px]"
            onClick={handleShare}
            disabled={loading || sharing || exporting}
          >
            <MessageCircle className="h-4 w-4" /> {sharing ? (isEn ? 'Preparing...' : 'Preparando...') : (isEn ? 'Share WhatsApp' : 'Compartir WhatsApp')}
          </Button>
          <div className="relative w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMoreActionsOpen((open) => !open)}
              className="h-10 w-full gap-2 whitespace-nowrap text-sm font-semibold text-gray-700 dark:text-slate-200 sm:w-auto"
            >
              <MoreHorizontal className="h-4 w-4" />
              {isEn ? 'More actions' : 'Más acciones'}
            </Button>
            {moreActionsOpen && (
              <div className="absolute right-0 z-20 mt-2 grid w-full min-w-[230px] gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:w-64">
                <ConfirmationModal
                  title={isEn ? 'Clean completed?' : '¿Limpiar completados?'}
                  description={
                    isEn
                      ? `Delete ${summary.completed || 0} completed jobs for this day and active place/search filters.`
                      : `Eliminar ${summary.completed || 0} trabajos con estado completado de esta fecha y filtros activos de lugar/búsqueda.`
                  }
                  confirmLabel={isEn ? 'Delete' : 'Eliminar'}
                  onConfirm={handleClearCompleted}
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 w-full justify-start gap-2 text-sm font-semibold text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                      disabled={clearDisabled}
                    >
                      <Trash2 className="h-4 w-4" /> {clearing ? (isEn ? 'Cleaning...' : 'Limpiando...') : (isEn ? 'Clear completed' : 'Limpiar completados')}
                    </Button>
                  }
                />
                <ConfirmationModal
                  title={isEn ? 'Clean pending?' : '¿Limpiar pendientes?'}
                  description={
                    isEn
                      ? `Delete ${summary.pending || 0} pending jobs for this day and active place/search filters.`
                      : `Eliminar ${summary.pending || 0} trabajos pendientes de esta fecha y filtros activos de lugar/búsqueda.`
                  }
                  confirmLabel={isEn ? 'Delete pending' : 'Eliminar pendientes'}
                  onConfirm={handleClearPending}
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 w-full justify-start gap-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 hover:text-amber-900 dark:text-amber-200 dark:hover:bg-amber-950/40"
                      disabled={clearPendingDisabled}
                    >
                      <Trash2 className="h-4 w-4" /> {clearingPending ? (isEn ? 'Cleaning pending...' : 'Limpiando pendientes...') : (isEn ? 'Clear pending' : 'Limpiar pendientes')}
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-slate-50">
            {isEn ? 'Day summary' : 'Resumen del día'}
          </h3>
          <span className="text-xs text-gray-500 dark:text-slate-400">{formatDate(date)}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
          {[
            {
              key: 'all',
              label: isEn ? 'Total jobs' : 'Total de trabajos',
              value: summary.total,
              active: selectedStatus === 'all',
              onClick: () => handleStatusFilterChange('all'),
            },
            {
              key: 'pending',
              label: isEn ? 'Pending' : 'Pendientes',
              value: summary.pending,
              active: selectedStatus === 'pending',
              onClick: () => handleStatusFilterChange('pending'),
            },
            {
              key: 'completed',
              label: isEn ? 'Completed' : 'Completados',
              value: summary.completed,
              active: selectedStatus === 'completed',
              onClick: () => handleStatusFilterChange('completed'),
            },
            {
              key: 'workers',
              label: isEn ? 'Workers involved' : 'Trabajadores involucrados',
              value: summary.workers,
            },
            {
              key: 'locations',
              label: isEn ? 'Places served' : 'Lugares atendidos',
              value: summary.locations,
            },
          ].map((card) => {
            const content = (
              <>
                <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">{card.label}</span>
                <span className="mt-1 block text-2xl font-bold text-gray-900 dark:text-slate-50">{card.value || 0}</span>
              </>
            );
            const className = `min-h-[82px] rounded-lg border p-3 text-left transition ${
              card.active
                ? 'border-[#1e3a8a] bg-blue-50 ring-2 ring-[#1e3a8a]/20 dark:border-blue-500 dark:bg-blue-950/30'
                : 'border-gray-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-950/40'
            }`;
            return card.onClick ? (
              <button key={card.key} type="button" onClick={card.onClick} className={className}>
                {content}
              </button>
            ) : (
              <div key={card.key} className={className}>
                {content}
              </div>
            );
          })}
          <div className="min-h-[82px] rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
              {isEn ? 'Estimated balance' : 'Balance estimado'}
            </span>
            <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-slate-300">
              <div className="flex justify-between gap-2"><span>{isEn ? 'Charge' : 'A cobrar'}</span><strong>{formatCurrency(summary.totalCharge)}</strong></div>
              <div className="flex justify-between gap-2"><span>{isEn ? 'Worker cost' : 'Costo trab.'}</span><strong>{formatCurrency(summary.workerCost)}</strong></div>
              <div className="flex justify-between gap-2 text-gray-900 dark:text-slate-50"><span>{isEn ? 'Difference' : 'Diferencia'}</span><strong>{formatCurrency(summary.balance)}</strong></div>
            </div>
          </div>
        </div>
      </section>

      <JobsFilters
        isEn={isEn}
        date={date}
        searchTerm={searchTerm}
        selectedLocation={selectedLocation}
        selectedStatus={selectedStatus}
        locationOptions={locationOptions}
        pageSize={pageSize}
        onDateChange={handleDateChange}
        onSearchChange={handleSearchChange}
        onLocationChange={handleLocationChange}
        onStatusChange={handleStatusFilterChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden card-lg" data-tour="tabla-trabajos">
        <div className="px-4 md:px-6 py-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
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
                      <td colSpan={11} className="px-3 md:px-4 py-4 text-center text-gray-500 dark:text-slate-300 text-sm md:text-base">
                        {t('monthlyPage.emptyDesc')}
                      </td>
                    </tr>
                  ) : jobs.map((job) => (
                    (() => {
                      const normalizedStatus = normalizeJobStatus(job?.estado || job?.status);
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
                        <div className="flex flex-col items-center gap-2">
                          <span className={`text-[10px] md:text-xs px-3 py-1.5 rounded-full font-semibold ${getJobStatusBadgeClass(normalizedStatus)}`}>
                            {getJobStatusLabel(normalizedStatus, isEn)}
                          </span>
                          <select
                            value={normalizedStatus}
                            onChange={(event) => handleRowStatusChange(job, event.target.value)}
                            disabled={updatingStatusId === job.id}
                            className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                            aria-label={isEn ? 'Change job status' : 'Cambiar estado del trabajo'}
                          >
                            {JOB_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {isEn ? option.labelEn : option.label}
                              </option>
                            ))}
                          </select>
                        </div>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicateJob(job)}
                            className="h-9 px-3 rounded-full text-[#1e3a8a] border-blue-200 text-xs md:text-sm font-semibold shadow-sm"
                          >
                            <Copy className="w-4 h-4 mr-1" /> Duplicar
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
            fetchSummary();
          }}
        />
      )}

      <AlertDialog
        open={Boolean(pendingStatusChange)}
        onOpenChange={(open) => {
          if (!open) setPendingStatusChange(null);
        }}
      >
        <AlertDialogContent className="bg-background text-foreground border border-border shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              {isEn ? 'Cancel job?' : '¿Cancelar trabajo?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {isEn
                ? 'This will mark the selected job as cancelled.'
                : 'Esto marcará el trabajo seleccionado como cancelado.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground">
              {isEn ? 'Back' : 'Volver'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const change = pendingStatusChange;
                setPendingStatusChange(null);
                if (change?.job) applyStatusChange(change.job, change.nextStatus);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isEn ? 'Cancel job' : 'Cancelar trabajo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        </div>
    );
}
