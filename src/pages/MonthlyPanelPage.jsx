
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs } from '@/hooks/useJobs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { getMonthStart, getMonthEnd } from '@/utils/dates';
import { Trash2, MessageCircle, FileSpreadsheet, Eye, Edit2 } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ExcelExportButton from '@/components/common/ExcelExportButton';
import JobFilters from '@/components/jobs/JobFilters';
import QuickFilterChips from '@/components/jobs/QuickFilterChips';
import { useFilters } from '@/hooks/useFilters';
import { Button } from '@/components/ui/button';
import { exportService } from '@/services/export.service';
import { jobsService } from '@/services/jobs.service';
import { onboardingService } from '@/services/onboarding.service';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import JobForm from '@/components/jobs/JobForm';

export default function MonthlyPanelPage() {
  const { user, isAdmin, userRole } = useAuth();
  const navigate = useNavigate();
  const { getJobsByDateRange, loading } = useJobs();
  const { t, language } = useLanguage();
  const { addToast } = useToast();
  const { resumeTourIfNeeded } = useOnboardingTour();
  const isEn = language === 'en';
  const role = ['admin', 'solicitante', 'trabajador'].includes(userRole)
    ? userRole
    : (isAdmin ? 'admin' : 'solicitante');
  const [jobs, setJobs] = useState([]);
  const [clearing, setClearing] = useState(false);
  const [clearingPending, setClearingPending] = useState(false);
  const [exportingCompleted, setExportingCompleted] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  
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
  }, [user, filters.startDate, filters.endDate, filters.status, filters.groupId, filters.workerId]);

  useEffect(() => {
    if (!user) return;
    resumeTourIfNeeded({
      role,
      onComplete: () => onboardingService.setOnboardingCompleted(user.id, role)
    });
  }, [user, role, resumeTourIfNeeded]);

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

  const handleShare = () => {
    if (!filteredJobs || filteredJobs.length === 0) return;
    const title = isEn
      ? `Monthly orders ${filters.startDate} to ${filters.endDate}`
      : `Órdenes mensuales ${filters.startDate} a ${filters.endDate}`;
    exportService.shareJobsViaWhatsApp(filteredJobs, title);
  };

  const handleExportCompletedExcel = () => {
    const completedRecords = filteredJobs.filter((record) => {
      const estado = String(record?.estado || '').toLowerCase();
      const status = String(record?.status || '').toLowerCase();
      return estado === 'completado' || status === 'completed';
    });

    if (completedRecords.length === 0) {
      addToast(
        isEn
          ? 'No completed records to export.'
          : 'No hay registros completados para exportar.',
        'error'
      );
      return;
    }

    setExportingCompleted(true);
    setTimeout(() => {
      exportService.exportRecordsToExcel(
        completedRecords,
        'mantenimiento-completados.xlsx',
        'Completados'
      );
      setExportingCompleted(false);
    }, 300);
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
        <JobFilters filters={filters} onChange={setFilter} />
      </div>
      <QuickFilterChips
        filters={filters}
        onChange={setFilter}
        groups={groupOptions}
        workers={workerOptions}
      />

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
              {filteredJobs.map((job) => (
                <div key={job.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-50 truncate">
                        {job.title || job.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-300">
                        {formatDate(job.date)}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${
                      job.status === 'completed' ? 'bg-green-100 text-green-700' :
                      job.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {job.status === 'pending' ? t('monthlyPage.status.pending') : job.status === 'completed' ? t('monthlyPage.status.completed') : t('monthlyPage.status.archived')}
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
                  </div>
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
              ) : filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/60 transition-colors">
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
                    <span className={`text-[10px] md:text-xs px-3 py-1.5 rounded-full font-semibold ${
                      job.status === 'completed' ? 'bg-green-100 text-green-700' :
                      job.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {job.status === 'pending' ? t('monthlyPage.status.pending') : job.status === 'completed' ? t('monthlyPage.status.completed') : t('monthlyPage.status.archived')}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : null}
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
