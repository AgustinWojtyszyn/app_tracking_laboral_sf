
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useJobs } from '@/hooks/useJobs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { getMonthStart, getMonthEnd } from '@/utils/dates';
import { normalizeJobStatus } from '@/utils/jobStatus';
import { Trash2, MessageCircle, FileSpreadsheet, Eye, Edit2 } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ExcelExportButton from '@/components/common/ExcelExportButton';
import JobFilters from '@/components/jobs/JobFilters';
import QuickFilterChips from '@/components/jobs/QuickFilterChips';
import LocationCombobox from '@/components/jobs/LocationCombobox';
import { useFilters } from '@/hooks/useFilters';
import { Button } from '@/components/ui/button';
import { exportService } from '@/services/export.service';
import { jobsService } from '@/services/jobs.service';
import { onboardingService } from '@/services/onboarding.service';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import JobForm from '@/components/jobs/JobForm';
import {
  applyMonthlyPanelFilters,
  buildMonthlyLocationOptions,
  buildMonthlyPeriodSummary,
  createLatestRequestGuard,
  getMonthlyUnknownLocations,
  getPreviousDateRange,
  normalizeDateOnly,
  paginateMonthlyJobs,
  shouldApplyMonthlyJobsResult
} from '@/pages/monthlyPanel.helpers';

const DEBUG_MAINTENANCE = false;

export default function MonthlyPanelPage() {
  const { user, isAdmin, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { getJobsByDateRange, loading } = useJobs();
  const { t, language } = useLanguage();
  const { addToast } = useToast();
  const { resumeTourIfNeeded } = useOnboardingTour();
  const isEn = language === 'en';
  const role = ['admin', 'solicitante', 'trabajador', 'chofer'].includes(userRole)
    ? userRole
    : (isAdmin ? 'admin' : 'solicitante');
  const [jobs, setJobs] = useState([]);
  const [clearing, setClearing] = useState(false);
  const [clearingPending, setClearingPending] = useState(false);
  const [exportingCompleted, setExportingCompleted] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deletingJobId, setDeletingJobId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const appliedIncomingFiltersRef = useRef(false);
  const mountedRef = useRef(false);
  const requestGuardRef = useRef(createLatestRequestGuard());
  const summaryRequestGuardRef = useRef(createLatestRequestGuard());
  
  // Use filter hook for state management
  const { filters, setFilter } = useFilters({
      startDate: getMonthStart(),
      endDate: getMonthEnd(),
      status: 'all',
      groupId: 'all',
      workerId: 'all',
      location: 'all',
      search: ''
  });

  const handleFilterChange = useCallback((key, value) => {
    setCurrentPage(1);
    setFilter(key, value);
  }, [setFilter]);

  useEffect(() => {
    const incomingState = location.state;
    if (!incomingState?.fromWorkerActivity || appliedIncomingFiltersRef.current) return;

    const nextStartDate = incomingState.startDate || filters.startDate;
    const nextEndDate = incomingState.endDate || filters.endDate;
    const nextWorkerId = incomingState.workerId || 'all';

    setCurrentPage(1);
    setFilter('startDate', nextStartDate);
    setFilter('endDate', nextEndDate);
    setFilter('workerId', nextWorkerId);
    appliedIncomingFiltersRef.current = true;
  }, [location.state, filters.startDate, filters.endDate, setFilter]);

  const handleRetrySummary = () => {
    void fetchMonthlySummary();
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchJobs = useCallback(async () => {
    const requestId = requestGuardRef.current.next();
    const queryFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      currentUserId: user?.id,
    };
    const result = await getJobsByDateRange(filters.startDate, filters.endDate, queryFilters);
    if (!shouldApplyMonthlyJobsResult({
      isMounted: mountedRef.current,
      isLatest: requestGuardRef.current.isLatest(requestId)
    })) return;
    if (result.success) setJobs(result.data);
  }, [
    filters.startDate,
    filters.endDate,
    user?.id,
    getJobsByDateRange
  ]);

  const fetchMonthlySummary = useCallback(async () => {
    if (!user || !filters.startDate || !filters.endDate) {
      setSummary(null);
      setSummaryError('');
      return;
    }

    const requestId = summaryRequestGuardRef.current.next();
    setSummaryLoading(true);
    setSummaryError('');

    const previousRange = getPreviousDateRange(filters.startDate, filters.endDate);
    const currentQueryFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      currentUserId: user?.id,
      status: 'all',
      groupId: filters.groupId === 'all' ? null : filters.groupId,
      workerId: filters.workerId === 'all' ? null : filters.workerId,
      location: filters.location === 'all' ? null : filters.location,
      search: filters.search,
    };
    const previousQueryFilters = {
      ...currentQueryFilters,
      startDate: previousRange.startDate,
      endDate: previousRange.endDate,
    };

    try {
      const [currentResult, previousResult] = await Promise.all([
        getJobsByDateRange(filters.startDate, filters.endDate, currentQueryFilters),
        getJobsByDateRange(previousRange.startDate, previousRange.endDate, previousQueryFilters),
      ]);
      if (!shouldApplyMonthlyJobsResult({
        isMounted: mountedRef.current,
        isLatest: summaryRequestGuardRef.current.isLatest(requestId)
      })) return;

      if (!currentResult.success || !previousResult.success) {
        throw new Error(currentResult.error || previousResult.error || 'No se pudo cargar el resumen.');
      }

      const nextSummary = buildMonthlyPeriodSummary({
        currentJobs: currentResult.data || [],
        previousJobs: previousResult.data || [],
        normalizeStatus: normalizeStatusValue,
        isEn,
      });
      setSummary(nextSummary);
    } catch (error) {
      if (!shouldApplyMonthlyJobsResult({
        isMounted: mountedRef.current,
        isLatest: summaryRequestGuardRef.current.isLatest(requestId)
      })) return;
      setSummary(null);
      setSummaryError(error?.message || (isEn ? 'The summary could not be loaded.' : 'No se pudo cargar el resumen.'));
    } finally {
      if (shouldApplyMonthlyJobsResult({
        isMounted: mountedRef.current,
        isLatest: summaryRequestGuardRef.current.isLatest(requestId)
      })) {
        setSummaryLoading(false);
      }
    }
  }, [filters.startDate, filters.endDate, filters.groupId, filters.workerId, filters.location, filters.search, user?.id, getJobsByDateRange, isEn]);

  useEffect(() => {
    if (user && filters.startDate && filters.endDate) {
        fetchJobs();
        void fetchMonthlySummary();
    }
  }, [user, filters.startDate, filters.endDate, filters.groupId, filters.workerId, filters.location, filters.search, fetchJobs, fetchMonthlySummary]);

  useEffect(() => {
    if (!user) return;
    resumeTourIfNeeded({
      role,
      onComplete: () => onboardingService.setOnboardingCompleted(user.id, role)
    });
  }, [user, role, resumeTourIfNeeded]);

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

  const normalizeStatusValue = (record) => normalizeJobStatus(record?.estado || record?.status);
  const getRawStatusValue = (record) => String(record?.estado ?? record?.status ?? '');
  const isWithinSelectedRange = (record) => {
    const recordDate = normalizeDateOnly(record?.date || record?.fecha);
    const start = normalizeDateOnly(filters.startDate);
    const end = normalizeDateOnly(filters.endDate);
    if (!recordDate || !start || !end) return false;
    return recordDate >= start && recordDate <= end;
  };
  const filteredJobs = useMemo(
    () => applyMonthlyPanelFilters(jobs, filters, normalizeStatusValue),
    [jobs, filters]
  );
  const showNoSummaryData = Boolean(summary && summary.current && summary.previous && summary.current.total === 0 && summary.previous.total === 0);
  const summaryCards = useMemo(() => {
    if (!summary?.current) return [];
    return [
      { key: 'all', label: isEn ? 'Total jobs' : 'Total de trabajos', value: summary.current.total, delta: summary.current.total - summary.previous.total, unit: 'trabajos', isPositiveGood: true },
      { key: 'pending', label: isEn ? 'Pending' : 'Pendientes', value: summary.current.pending, delta: summary.current.pending - summary.previous.pending, unit: 'trabajos', isPositiveGood: false },
      { key: 'completed', label: isEn ? 'Completed' : 'Completados', value: summary.current.completed, delta: summary.current.completed - summary.previous.completed, unit: 'trabajos', isPositiveGood: true },
      { key: 'compliance', label: isEn ? 'Compliance' : 'Cumplimiento', value: `${summary.current.completionRate.toFixed(1)}%`, delta: summary.current.complianceDelta, unit: 'puntos', isPositiveGood: true, asPercent: true },
      { key: 'workers', label: isEn ? 'Workers involved' : 'Trabajadores involucrados', value: summary.current.workers, delta: summary.current.workersDelta, unit: 'trabajadores', isPositiveGood: true },
      { key: 'locations', label: isEn ? 'Places served' : 'Lugares atendidos', value: summary.current.locations, delta: summary.current.locationsDelta, unit: 'lugares', isPositiveGood: true },
      { key: 'balance', label: isEn ? 'Estimated balance' : 'Balance estimado', value: formatCurrency(summary.current.balance), delta: summary.current.balanceDelta, unit: 'pesos', isPositiveGood: true, isCurrency: true, detail: { amountToCharge: summary.current.amountToCharge, workerCost: summary.current.workerCost, difference: summary.current.difference, previousDifference: summary.previous.difference } },
    ];
  }, [isEn, summary]);
  const locationOptions = useMemo(() => buildMonthlyLocationOptions(jobs), [jobs]);
  const unknownLocationOptions = useMemo(() => getMonthlyUnknownLocations(jobs), [jobs]);
  const pagination = useMemo(
    () => paginateMonthlyJobs(filteredJobs, currentPage, rowsPerPage),
    [filteredJobs, currentPage, rowsPerPage]
  );
  const paginatedJobs = pagination.records;
  const hasJobs = filteredJobs.length > 0;
  const clearDisabled = clearing || loading;
  const clearPendingDisabled = clearingPending || loading;

  useEffect(() => {
    if (currentPage !== pagination.currentPage) {
      setCurrentPage(pagination.currentPage);
    }
  }, [currentPage, pagination.currentPage]);

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  const visiblePageNumbers = useMemo(() => {
    const total = pagination.totalPages;
    const current = pagination.currentPage;
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

    const pages = new Set([1, total, current - 1, current, current + 1]);
    return Array.from(pages)
      .filter((page) => page >= 1 && page <= total)
      .sort((a, b) => a - b);
  }, [pagination.currentPage, pagination.totalPages]);

  const isCompletedRecord = (record) => {
    const normalized = normalizeStatusValue(record);
    return normalized === 'completed';
  };
  const getStatusMeta = (job) => {
    const normalized = normalizeStatusValue(job);
    if (normalized === 'completed') {
      return {
        badgeClass: 'bg-green-100 text-green-700',
        label: t('monthlyPage.status.completed')
      };
    }
    if (normalized === 'pending') {
      return {
        badgeClass: 'bg-yellow-100 text-yellow-700',
        label: t('monthlyPage.status.pending')
      };
    }
    if (normalized === 'archived') {
      return {
        badgeClass: 'bg-gray-100 text-gray-700',
        label: t('monthlyPage.status.archived')
      };
    }
    return {
      badgeClass: 'bg-slate-100 text-slate-700',
      label: isEn ? 'Not informed' : 'No informado'
    };
  };
  const completedJobsInView = useMemo(
    () => filteredJobs.filter((record) => isCompletedRecord(record) && isWithinSelectedRange(record)),
    [filteredJobs, filters.startDate, filters.endDate]
  );

  useEffect(() => {
    const allRawStatuses = jobs.map(getRawStatusValue);
    const allStatuses = jobs.map(normalizeStatusValue).filter(Boolean);
    const filteredStatuses = filteredJobs.map(normalizeStatusValue).filter(Boolean);
    const uniqueRawStatuses = Array.from(new Set(allRawStatuses)).sort();
    const uniqueStatuses = Array.from(new Set(allStatuses)).sort();
    const statusCounts = allStatuses.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    if (DEBUG_MAINTENANCE) {
      console.group('[MonthlyPanel] Diagnóstico exportación completados');
      console.log('Filtros activos', {
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
        groupId: filters.groupId,
        workerId: filters.workerId,
        location: filters.location,
        search: filters.search
      });
      console.log('Total registros cargados', jobs.length);
      console.log('Total registros filtrados en pantalla', filteredJobs.length);
      console.log('Total registros completados (pantalla)', completedJobsInView.length);
      const dateValues = jobs.map((job) => normalizeDateOnly(job?.date || job?.fecha)).filter(Boolean).sort();
      console.log('Fecha desde (filtro UI/backend)', filters.startDate);
      console.log('Fecha hasta (filtro UI/backend)', filters.endDate);
      console.log('Fecha mínima jobs recibidos', dateValues[0] || null);
      console.log('Fecha máxima jobs recibidos', dateValues[dateValues.length - 1] || null);
      console.log('Estados únicos RAW (dataset cargado)', uniqueRawStatuses);
      console.log('Estados únicos normalizados (dataset cargado)', uniqueStatuses);
      console.log('Conteo por estado normalizado', statusCounts);
      console.log('Estados en pantalla (muestra)', filteredStatuses.slice(0, 20));
      if (filters.status && filters.status !== 'all') {
        console.warn(`Filtro de estado activo: "${filters.status}". Esto limita lo exportable.`);
      }
      console.groupEnd();
    }
  }, [jobs, filteredJobs, completedJobsInView.length, filters]);

  const handleShare = () => {
    if (!filteredJobs || filteredJobs.length === 0) return;
    const title = isEn
      ? `Monthly orders ${filters.startDate} to ${filters.endDate}`
      : `Órdenes mensuales ${filters.startDate} a ${filters.endDate}`;
    exportService.shareJobsViaWhatsApp(filteredJobs, title);
  };

  const handleExportCompletedExcel = () => {
    // Usa registros visibles (ya respetan fecha/estado/grupo/trabajador/búsqueda).
    const completedRecords = completedJobsInView;

    if (completedRecords.length === 0) {
      addToast(
        isEn
          ? 'No completed records to export with the active filters.'
          : 'No hay registros completados para exportar con los filtros activos.',
        'error'
      );
      return;
    }

    if (!mountedRef.current) return;
    setExportingCompleted(true);
    setTimeout(async () => {
      if (!mountedRef.current) return;
      if (DEBUG_MAINTENANCE) {
        console.log('[MonthlyPanel] Fechas de completados exportados', completedRecords.map((r) => ({
          id: r.id,
          date: r.date || r.fecha || null,
          normalizedDate: normalizeDateOnly(r.date || r.fecha || null),
          status: r.status || r.estado || null
        })));
      }
      try {
        await exportService.exportRecordsToExcel(
          completedRecords,
          'mantenimiento-completados.xlsx',
          'Completados'
        );
      } catch (error) {
        addToast(isEn ? 'Export failed.' : 'No se pudo exportar el Excel.', 'error');
      } finally {
        if (mountedRef.current) setExportingCompleted(false);
      }
    }, 300);
  };

  const handleClearCompleted = async () => {
    if (!isAdmin) {
      addToast(isEn ? 'Only administrators can clean completed jobs.' : 'Solo los administradores pueden limpiar trabajos completados.', 'error');
      return;
    }
    if (!mountedRef.current) return;
    setClearing(true);
    const result = await jobsService.deleteCompletedJobs(filters.startDate, filters.endDate);
    if (!mountedRef.current) return;
    if (result.success) {
      const removed = result.removed || 0;
      addToast(
        removed === 0
          ? (isEn ? 'No completed jobs to remove.' : 'No hay trabajos completados para eliminar.')
          : (isEn ? `Removed ${removed} completed jobs.` : `Se eliminaron ${removed} trabajos completados.`),
        'success'
      );
      void fetchJobs();
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
    if (!mountedRef.current) return;
    setClearingPending(true);
    const result = await jobsService.deletePendingJobs(filters.startDate, filters.endDate);
    if (!mountedRef.current) return;
    if (result.success) {
      const removed = result.removed || 0;
      addToast(
        removed === 0
          ? (isEn ? 'No pending jobs to remove.' : 'No hay trabajos pendientes para eliminar.')
          : (isEn ? `Removed ${removed} pending jobs.` : `Se eliminaron ${removed} trabajos pendientes.`),
        'success'
      );
      void fetchJobs();
    } else {
      addToast(result.error, 'error');
    }
    setClearingPending(false);
  };

  const handleDeleteJob = async (jobId) => {
    if (!jobId || deletingJobId) return;
    if (!mountedRef.current) return;
    setDeletingJobId(jobId);
    const result = await jobsService.deleteJob(jobId, { actorId: user?.id || null });
    if (!mountedRef.current) return;
    addToast(
      result.success
        ? (isEn ? 'Job deleted.' : 'Solicitud eliminada.')
        : (result.error || (isEn ? 'Could not delete job.' : 'No se pudo eliminar la solicitud.')),
      result.success ? 'success' : 'error'
    );
    if (result.success) {
      await fetchJobs();
    }
    if (mountedRef.current) {
      setDeletingJobId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-lg md:text-xl px-4 md:px-8">
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
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCompletedExcel}
            disabled={loading || exportingCompleted}
            className="gap-2 min-w-[170px] w-full sm:w-auto text-base md:text-lg h-12 md:h-14 shadow-sm"
          >
            <FileSpreadsheet className="w-5 h-5" />
            {isEn ? 'Export completed' : 'Exportar completados'}
          </Button>
        </div>
      </div>

      <div data-tour="panel-mensual-filtros">
        <JobFilters filters={filters} onChange={handleFilterChange} />
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Lugar</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Filtrá por empresa o ubicación registrada.</p>
            </div>
            <LocationCombobox
              value={filters.location}
              options={locationOptions}
              onChange={(value) => handleFilterChange('location', value)}
            />
          </div>
          {unknownLocationOptions.length > 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Lugares adicionales detectados: {unknownLocationOptions.join(', ')}
            </p>
          ) : null}
        </div>
      </div>
      <QuickFilterChips
        filters={filters}
        onChange={handleFilterChange}
        groups={groupOptions}
        workers={workerOptions}
      />

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">{isEn ? 'Summary of the period' : 'Resumen del período'}</h2>
          <span className="text-sm text-gray-500 dark:text-slate-400">{filters.startDate} – {filters.endDate}</span>
        </div>
        {summaryLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-950/40" />
            ))}
          </div>
        ) : summaryError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
            <div className="font-semibold">{isEn ? 'Summary unavailable' : 'Resumen no disponible'}</div>
            <p className="mt-1">{summaryError}</p>
            <Button type="button" variant="outline" size="sm" onClick={handleRetrySummary} className="mt-3">
              {isEn ? 'Retry' : 'Reintentar'}
            </Button>
          </div>
        ) : summary ? (
          showNoSummaryData ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-300">
              {isEn ? 'No jobs matched the current filters for this period.' : 'No hay trabajos que coincidan con los filtros para este período.'}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => {
                const isDeltaPositive = card.delta > 0;
                const isDeltaNegative = card.delta < 0;
                const isNeutral = card.delta === 0;
                const isActive = filters.status === 'all' ? card.key === 'all' : card.key === filters.status;
                const statusFilterValue = card.key === 'all' ? 'all' : card.key === 'pending' ? 'pending' : card.key === 'completed' ? 'completed' : null;
                const changeLabel = card.asPercent
                  ? `${Math.abs(card.delta).toFixed(1)} puntos ${card.delta >= 0 ? 'más' : 'menos'} que el período anterior`
                  : card.delta === 0
                    ? 'Sin cambios'
                    : `${Math.abs(card.delta)} ${card.delta > 0 ? 'más' : 'menos'} que el período anterior`;
                const tone = isNeutral ? 'text-gray-600 dark:text-slate-300' : (card.isPositiveGood ? (isDeltaPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300') : (isDeltaNegative ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'));
                const icon = isNeutral ? '•' : (card.isPositiveGood ? (isDeltaPositive ? '↑' : '↓') : (isDeltaNegative ? '↑' : '↓'));
                return (
                  <div key={card.key} className={`rounded-lg border p-3 shadow-sm ${isActive ? 'border-[#1e3a8a] bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20' : 'border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-950/40'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{card.label}</span>
                      {statusFilterValue ? (
                        <button
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => handleFilterChange('status', statusFilterValue)}
                          className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[#1e3a8a] hover:border-[#1e3a8a]/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-2 dark:text-blue-200 dark:hover:bg-slate-800"
                        >
                          {isActive ? (isEn ? 'Active' : 'Activo') : (isEn ? 'View' : 'Ver')}
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-slate-50">{card.value}</div>
                    {card.key === 'balance' && card.detail ? (
                      <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-slate-300">
                        <div className="flex items-center justify-between gap-2">
                          <span>{isEn ? 'To charge' : 'A cobrar'}</span>
                          <span className="font-semibold">{formatCurrency(card.detail.amountToCharge)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>{isEn ? 'Worker cost' : 'Costo de trabajadores'}</span>
                          <span className="font-semibold">{formatCurrency(card.detail.workerCost)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>{isEn ? 'Difference' : 'Diferencia'}</span>
                          <span className="font-semibold">{formatCurrency(card.detail.difference)}</span>
                        </div>
                      </div>
                    ) : null}
                    <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${tone}`} aria-label={`${card.label}: ${changeLabel}`}>
                      <span>{icon}</span>
                      <span>{changeLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                <div className="font-semibold text-gray-900 dark:text-slate-50">{isEn ? 'Operational reading' : 'Lectura operativa'}</div>
                <p className="mt-1">{summary.conclusion}</p>
              </div>
            </>
          )
        ) : null}
      </section>

      {/* Tabla consolidada */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden card-lg" data-tour="panel-mensual-tabla">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-slate-50">{isEn ? 'Summary table' : 'Tabla resumen'}</h2>
          <span className="text-sm md:text-base text-gray-500 dark:text-slate-300">{filteredJobs.length} {isEn ? 'records' : 'registros'}</span>
        </div>
        <div className="md:hidden">
          {filteredJobs.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 dark:text-slate-300 text-sm">
              {t('monthlyPage.emptyDesc')}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {paginatedJobs.map((job) => (
                <div key={job.id} className="p-4 flex flex-col gap-2">
                  {(() => {
                    const statusMeta = getStatusMeta(job);
                    return (
                      <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-50 truncate">
                        {job.title || job.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-300">
                        {formatDate(job.date)}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${statusMeta.badgeClass}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-slate-300">
                    <span className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                      {job.location || '-'}
                    </span>
                    <span className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                      {job.workers?.display_name || job.workers?.alias || '-'}
                    </span>
                    <span className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                      {job.groups?.name || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-300">
                    <span>{formatCurrency(job.cost_spent)}</span>
                    <span>{formatCurrency(job.amount_to_charge)}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/jobs/${job.id}`)}
                      className="h-8 px-3 rounded-full text-[#1e3a8a] border-blue-200 text-xs font-semibold shadow-sm"
                    >
                      <Eye className="w-4 h-4 mr-1" /> {isEn ? 'View' : 'Detalle'}
                    </Button>
	                    <Button
	                      variant="outline"
	                      size="sm"
	                      onClick={() => setEditingJob(job)}
	                      className="h-8 px-3 rounded-full bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-semibold shadow-sm"
	                    >
	                      <Edit2 className="w-4 h-4 mr-1" /> {isEn ? 'Edit' : 'Editar'}
	                    </Button>
	                    <ConfirmationModal
	                      title={isEn ? 'Delete request?' : '¿Eliminar solicitud?'}
	                      description={isEn ? 'This will delete the selected request.' : 'Se eliminará la solicitud seleccionada.'}
	                      confirmLabel={isEn ? 'Delete' : 'Eliminar'}
	                      onConfirm={() => handleDeleteJob(job.id)}
	                      trigger={
	                        <Button
	                          type="button"
	                          variant="outline"
	                          size="sm"
	                          disabled={deletingJobId === job.id}
	                          className="h-8 px-3 rounded-full border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold shadow-sm"
	                        >
	                          <Trash2 className="w-4 h-4 mr-1" /> {deletingJobId === job.id ? (isEn ? 'Deleting...' : 'Eliminando...') : (isEn ? 'Delete' : 'Eliminar')}
	                        </Button>
	                      }
	                    />
	                  </div>
	                </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="hidden md:block">
          <table className="w-full text-xs md:text-sm text-left table-fixed">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-100 uppercase font-semibold border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-3 md:px-4 py-3 w-28">{t('monthlyPage.columns.date')}</th>
                <th className="px-3 md:px-4 py-3 w-[46%]">{t('monthlyPage.columns.description')}</th>
                <th className="px-3 md:px-4 py-3 w-[22%]">{t('monthlyPage.columns.creator')}</th>
                <th className="px-3 md:px-4 py-3 text-center w-24">{t('monthlyPage.columns.status')}</th>
                <th className="px-3 md:px-4 py-3 text-center w-28">{isEn ? 'Actions' : 'Acciones'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 md:px-4 py-6 text-center text-gray-500 dark:text-slate-300 text-sm md:text-base">
                    {t('monthlyPage.emptyDesc')}
                  </td>
                </tr>
              ) : paginatedJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/60 transition-colors">
                  {(() => {
                    const statusMeta = getStatusMeta(job);
                    return (
                      <>
                  <td className="px-3 md:px-4 py-3 text-gray-800 dark:text-slate-50 whitespace-nowrap">{formatDate(job.date)}</td>
                  <td className="px-3 md:px-4 py-3 text-gray-900 dark:text-slate-50">
                    <div className="font-semibold truncate">{job.title || job.description}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-300 mt-1 truncate">
                      {(job.location || '-') + ' · ' + (job.groups?.name || '-') + ' · ' + (job.job_type || job.type || '-')}
                    </div>
                  </td>
                  <td className="px-3 md:px-4 py-3 text-gray-700 dark:text-slate-200">
                    <div className="truncate">{job.creator?.full_name || job.creator?.email || '-'}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-300 mt-1 truncate">
                      {job.workers?.display_name || job.workers?.alias || '-'}
                    </div>
                  </td>
                  <td className="px-3 md:px-4 py-3 text-center">
                    <span className={`text-[10px] md:text-xs px-3 py-1.5 rounded-full font-semibold ${statusMeta.badgeClass}`}>
                      {statusMeta.label}
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
	                      <ConfirmationModal
	                        title={isEn ? 'Delete request?' : '¿Eliminar solicitud?'}
	                        description={isEn ? 'This will delete the selected request.' : 'Se eliminará la solicitud seleccionada.'}
	                        confirmLabel={isEn ? 'Delete' : 'Eliminar'}
	                        onConfirm={() => handleDeleteJob(job.id)}
	                        trigger={
	                          <Button
	                            type="button"
	                            variant="outline"
	                            size="sm"
	                            disabled={deletingJobId === job.id}
	                            className="h-9 px-3 rounded-full border-red-200 text-red-700 hover:bg-red-50 text-xs md:text-sm font-semibold shadow-sm"
	                          >
	                            <Trash2 className="w-4 h-4 mr-1" /> {deletingJobId === job.id ? (isEn ? 'Deleting...' : 'Eliminando...') : (isEn ? 'Delete' : 'Eliminar')}
	                          </Button>
	                        }
	                      />
	                    </div>
	                  </td>
                </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 px-4 py-4 dark:border-slate-800 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-slate-300 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex items-center gap-2 font-medium">
                <span>Filas por página:</span>
                <select
                  value={rowsPerPage}
                  onChange={handleRowsPerPageChange}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  aria-label="Filas por página"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <span>
                {filteredJobs.length === 0
                  ? 'Mostrando 0 de 0 registros'
                  : `Mostrando ${pagination.startIndex + 1}-${pagination.endIndex} de ${filteredJobs.length} registros`}
              </span>
              <span>
                Página {pagination.currentPage} de {pagination.totalPages}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={pagination.currentPage === 1}
                className="w-auto"
              >
                Anterior
              </Button>
              {visiblePageNumbers.map((page, index) => {
                const previous = visiblePageNumbers[index - 1];
                const showGap = previous && page - previous > 1;
                return (
                  <React.Fragment key={page}>
                    {showGap ? (
                      <span className="px-1 text-sm text-gray-400" aria-hidden="true">...</span>
                    ) : null}
                    <Button
                      type="button"
                      variant={page === pagination.currentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="h-9 w-9 px-0"
                      aria-label={`Ir a página ${page}`}
                      aria-current={page === pagination.currentPage ? 'page' : undefined}
                    >
                      {page}
                    </Button>
                  </React.Fragment>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
                disabled={pagination.currentPage === pagination.totalPages}
                className="w-auto"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : null}
      {editingJob && (
        <JobForm
          jobToEdit={editingJob}
          onSuccess={() => {
            if (!mountedRef.current) return;
            setEditingJob(null);
            void fetchJobs();
          }}
        />
      )}
    </div>
  );
}
