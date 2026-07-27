import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Activity, CalendarRange, CheckCircle2, Clock3, Mail, MapPin, Phone, Search, Trash2, Edit2, Users, X } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import { workersService } from '@/services/workers.service';
import WorkerFormModal from '@/components/workers/WorkerFormModal';
import { onboardingService } from '@/services/onboarding.service';
import { jobsService } from '@/services/jobs.service';
import { normalizeJobStatus } from '@/utils/jobStatus';

const toInputDate = (date) => {
  const normalized = new Date(date);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthRange = (referenceDate = new Date()) => {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  return { start: toInputDate(start), end: toInputDate(end) };
};

const getPreviousMonthRange = (referenceDate = new Date()) => {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0);
  return { start: toInputDate(start), end: toInputDate(end) };
};

const getLast30DaysRange = (referenceDate = new Date()) => {
  const end = new Date(referenceDate);
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - 29);
  return { start: toInputDate(start), end: toInputDate(end) };
};

const formatRangeLabel = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Período';
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return `${formatDate(startDate)} → ${formatDate(endDate)}`;
};

function WorkerActivityPanel({ worker, userId, onClose }) {
  const navigate = useNavigate();
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [periodError, setPeriodError] = useState('');
  const [jobs, setJobs] = useState([]);

  const currentMonthRange = useMemo(() => getMonthRange(), []);

  useEffect(() => {
    if (!worker) return;
    setPeriodStart(currentMonthRange.start);
    setPeriodEnd(currentMonthRange.end);
    setJobs([]);
    setError('');
    setPeriodError('');
  }, [worker?.id, currentMonthRange.end, currentMonthRange.start]);

  useEffect(() => {
    if (!worker?.id || !periodStart || !periodEnd) return;
    if (periodStart > periodEnd) {
      setPeriodError('La fecha inicial no puede ser posterior a la final.');
      setJobs([]);
      return;
    }

    let active = true;
    const fetchActivity = async () => {
      setLoading(true);
      setError('');
      setPeriodError('');
      const result = await jobsService.getJobsByDateRange(periodStart, periodEnd, {
        currentUserId: userId,
        workerId: worker.id,
      });
      if (!active) return;
      if (result.success) {
        setJobs(Array.isArray(result.data) ? result.data : []);
      } else {
        setJobs([]);
        setError('No se pudo cargar la actividad de este trabajador en este período.');
      }
      setLoading(false);
    };

    fetchActivity();
    return () => {
      active = false;
    };
  }, [periodStart, periodEnd, userId, worker?.id]);

  const recentJobs = useMemo(() => {
    return [...jobs].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 5);
  }, [jobs]);

  const normalizedJobs = useMemo(() => jobs.filter((job) => String(job?.worker_id || '') === String(worker?.id || '')), [jobs, worker?.id]);
  const pendingCount = normalizedJobs.filter((job) => normalizeJobStatus(job?.status || job?.estado) === 'pending').length;
  const completedCount = normalizedJobs.filter((job) => normalizeJobStatus(job?.status || job?.estado) === 'completed').length;
  const denominator = pendingCount + completedCount;
  const complianceValue = denominator > 0 ? Math.round((completedCount / denominator) * 100) : 0;
  const uniqueLocations = useMemo(() => {
    const locations = normalizedJobs.map((job) => String(job?.location || '').trim()).filter(Boolean);
    return new Set(locations).size;
  }, [normalizedJobs]);

  const workerGroups = useMemo(() => {
    const seen = new Set();
    const groups = [];
    if (worker?.group_id) {
      const key = String(worker.group_id);
      seen.add(key);
      groups.push({ id: key, name: worker.groups?.name || 'Grupo asociado' });
    }
    normalizedJobs.forEach((job) => {
      const groupId = job?.group_id ? String(job.group_id) : '';
      if (!groupId || seen.has(groupId)) return;
      seen.add(groupId);
      groups.push({ id: groupId, name: job?.groups?.name || 'Grupo asociado' });
    });
    return groups;
  }, [normalizedJobs, worker?.group_id, worker?.groups?.name]);

  const handleQuickRange = (preset) => {
    if (preset === 'current') {
      const range = getMonthRange();
      setPeriodStart(range.start);
      setPeriodEnd(range.end);
      return;
    }
    if (preset === 'previous') {
      const range = getPreviousMonthRange();
      setPeriodStart(range.start);
      setPeriodEnd(range.end);
      return;
    }
    const range = getLast30DaysRange();
    setPeriodStart(range.start);
    setPeriodEnd(range.end);
  };

  const handleViewAll = () => {
    navigate('/app/panel-mensual', {
      state: {
        fromWorkerActivity: true,
        workerId: worker?.id,
        startDate: periodStart,
        endDate: periodEnd,
      },
    });
  };

  const lastJob = recentJobs[0] || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Ficha operativa</p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50">{worker?.display_name || 'Trabajador'}</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300">{worker?.alias || worker?.email || 'Sin alias cargado'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${worker?.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200'}`}>
              {worker?.is_active ? 'Activo' : 'Inactivo'}
            </span>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 transition hover:bg-white hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-slate-100" aria-label="Cerrar ficha de actividad">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Grupo</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-50">{workerGroups.length > 0 ? workerGroups.map((group) => group.name).join(', ') : 'Sin grupo asignado'}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Información laboral</p>
                <p className="mt-1 text-sm text-gray-700 dark:text-slate-200">{worker?.email || worker?.phone ? `${worker?.email || 'Sin email'} • ${worker?.phone || 'Sin teléfono'}` : 'Sin datos laborales cargados'}</p>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Período analizado</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-50">{formatRangeLabel(periodStart, periodEnd)}</p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-slate-100">
              <CalendarRange className="h-4 w-4 text-[#1e3a8a]" />
              <span>Seleccionar período</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                <span className="mb-1 block">Desde</span>
                <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50" />
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                <span className="mb-1 block">Hasta</span>
                <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50" />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleQuickRange('current')} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-blue-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Este mes</button>
              <button type="button" onClick={() => handleQuickRange('previous')} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-blue-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Mes anterior</button>
              <button type="button" onClick={() => handleQuickRange('last30')} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-blue-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Últimos 30 días</button>
            </div>
            {periodError ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{periodError}</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Total de trabajos asignados</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-50">{normalizedJobs.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Pendientes</p>
          <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Completados</p>
          <p className="mt-2 text-2xl font-bold text-green-700 dark:text-green-300">{completedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Porcentaje de cumplimiento</p>
          <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">{complianceValue}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Lugares atendidos</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-50">{uniqueLocations}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Último trabajo registrado</p>
          {lastJob ? (
            <div className="mt-2 space-y-1 text-sm text-gray-700 dark:text-slate-200">
              <p className="font-semibold text-gray-900 dark:text-slate-50">{formatDate(lastJob.date)}</p>
              <p>{lastJob.description || 'Sin descripción'}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Sin trabajos registrados</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-50">Actividad reciente</h4>
            <p className="text-sm text-gray-500 dark:text-slate-400">Últimos trabajos del período seleccionado.</p>
          </div>
          <button type="button" onClick={handleViewAll} className="text-sm font-semibold text-[#1e3a8a] transition hover:text-blue-900 dark:text-blue-200 dark:hover:text-blue-100">
            Ver todos en Panel Mensual
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-3 text-sm text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
            <Activity className="h-4 w-4 animate-pulse" />
            <span>Cargando actividad…</span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">{error}</div>
        ) : recentJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
            No hay trabajos registrados para este trabajador en el período seleccionado.
          </div>
        ) : (
          <ul className="space-y-2">
            {recentJobs.map((job) => {
              const status = normalizeJobStatus(job?.status || job?.estado);
              return (
                <li key={job.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-50">{formatDate(job.date)}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100' : status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                          {status === 'completed' ? 'Completado' : status === 'pending' ? 'Pendiente' : 'Otro'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700 dark:text-slate-200">{job.description || 'Sin descripción'}</p>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">
                      {job.location ? <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span> : null}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {job?.groups?.name || 'Sin grupo'}</span>
                    <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {job?.created_at ? formatDate(job.created_at) : 'Sin fecha'}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function WorkersPage() {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const { user, isAdmin, userRole } = useAuth();
  const { resumeTourIfNeeded } = useOnboardingTour();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activityWorker, setActivityWorker] = useState(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const role = ['admin', 'solicitante', 'trabajador', 'chofer'].includes(userRole)
    ? userRole
    : (isAdmin ? 'admin' : 'solicitante');

  const fetchWorkers = async () => {
    setLoading(true);
    const result = await workersService.getWorkers({ search });
    setLoading(false);
    if (result.success) {
      setWorkers(result.data || []);
    } else {
      addToast(result.error || 'Error al cargar trabajadores', 'error');
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [search]);

  useEffect(() => {
    if (!user) return;
    resumeTourIfNeeded({
      role,
      onComplete: () => onboardingService.setOnboardingCompleted(user.id, role)
    });
  }, [user, role, resumeTourIfNeeded]);

  const handleDeleted = async (id) => {
    const result = await workersService.deleteWorker(id);
    if (result.success) {
      addToast(result.message, 'success');
      fetchWorkers();
    } else {
      addToast(result.error, 'error');
    }
  };

  const openActivity = (worker) => {
    setActivityWorker(worker);
    setActivityOpen(true);
  };

  if (loading && workers.length === 0) return <LoadingSpinner />;
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
	      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-50">{t('workersPage.title')}</h1>
	      <p className="text-base md:text-lg text-gray-500 dark:text-slate-300">{t('workersPage.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400 dark:text-slate-400" />
            <input
              type="text"
              className="pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm md:text-base focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
              placeholder={t('workersPage.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div data-tour="trabajadores-crear">
            <WorkerFormModal onSaved={fetchWorkers} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-100 dark:border-slate-800 overflow-hidden card-lg" data-tour="trabajadores-lista">
        {workers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-slate-300 flex flex-col items-center gap-4">
            <Users className="w-12 h-12 text-gray-300 dark:text-slate-500" />
            <p className="font-semibold text-lg text-gray-900 dark:text-slate-50">{t('workersPage.emptyTitle')}</p>
            <p className="text-base max-w-md text-gray-600 dark:text-slate-300">
		      {t('workersPage.emptyDesc')}
            </p>
            <WorkerFormModal
              onSaved={fetchWorkers}
              trigger={
                <Button className="mt-2 bg-[#1e3a8a] hover:bg-blue-900 text-white">
                  {t('workersPage.createCta')}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <table className="w-full text-base md:text-lg text-left">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200">
                  <tr>
                    <th className="px-7 py-4">{t('workersPage.name')}</th>
                    <th className="px-7 py-4">{t('workersPage.alias')}</th>
                    <th className="px-7 py-4">{t('workersPage.email')}</th>
                    <th className="px-7 py-4">{t('workersPage.phone')}</th>
                    <th className="px-7 py-4">{t('workersPage.status')}</th>
                    <th className="px-7 py-4">{t('workersPage.createdAt')}</th>
                    <th className="px-7 py-4 text-right">{t('workersPage.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {workers.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/70">
                      <td className="px-7 py-4 font-semibold text-gray-900 dark:text-slate-50">{w.display_name}</td>
                      <td className="px-7 py-4 text-gray-800 dark:text-slate-200">{w.alias || '-'}</td>
                      <td className="px-7 py-4 text-gray-800 dark:text-slate-200">{w.email || '-'}</td>
                      <td className="px-7 py-4 text-gray-800 dark:text-slate-200">{w.phone || '-'}</td>
                      <td className="px-7 py-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                          w.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}>
                          {w.is_active ? t('workersPage.statusActive') : t('workersPage.statusInactive')}
                        </span>
                      </td>
                      <td className="px-7 py-4 text-gray-800 dark:text-slate-200">{formatDate(w.created_at)}</td>
                      <td className="px-7 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => openActivity(w)}
                            aria-label={`Ver actividad de ${w.display_name}`}
                          >
                            <Activity className="w-5 h-5 text-blue-600" />
                          </Button>
                          <WorkerFormModal
                            worker={w}
                            onSaved={fetchWorkers}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Edit2 className="w-5 h-5 text-blue-600" />
                              </Button>
                            }
                          />
                          <ConfirmationModal
                            title="¿Eliminar trabajador?"
                            description="Si tiene trabajos asociados se marcará como inactivo."
                            onConfirm={() => handleDeleted(w.id)}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Trash2 className="w-5 h-5 text-red-600" />
                              </Button>
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-800">
              {workers.map((w) => (
                <div key={w.id} className="p-4 flex flex-col gap-1 bg-white dark:bg-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base text-gray-900 dark:text-slate-50">{w.display_name}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      w.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}>
                      {w.is_active ? t('workersPage.statusActive') : t('workersPage.statusInactive')}
                    </span>
                  </div>
                  {w.alias && (
                    <div className="text-sm text-gray-500 dark:text-slate-300">Alias: {w.alias}</div>
                  )}
                  {w.email && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-slate-300">
                      <Mail className="w-4 h-4 mr-2" /> {w.email}
                    </div>
                  )}
                  {w.phone && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-slate-300">
                      <Phone className="w-4 h-4 mr-2" /> {w.phone}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 dark:text-slate-400 mt-1">
                    Alta: {formatDate(w.created_at)}
                  </div>
                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 text-blue-600 border-blue-200 flex-1"
                      onClick={() => openActivity(w)}
                    >
                      <Activity className="w-4 h-4 mr-1" /> Ver actividad
                    </Button>
                    <WorkerFormModal
                      worker={w}
                      onSaved={fetchWorkers}
                      trigger={
                    <Button variant="outline" size="sm" className="h-9 text-blue-600 border-blue-200 flex-1">
                          <Edit2 className="w-4 h-4 mr-1" /> {t('workersPage.edit')}
                    </Button>
                  }
                />
                <ConfirmationModal
                  title={t('workersPage.deleteTitle')}
                  description={t('workersPage.deleteDesc')}
                  onConfirm={() => handleDeleted(w.id)}
                  trigger={
                    <Button variant="outline" size="sm" className="h-9 text-red-600 border-red-200 flex-1">
                          <Trash2 className="w-4 h-4 mr-1" /> {t('workersPage.delete')}
                    </Button>
                  }
                />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={activityOpen} onOpenChange={(open) => {
        setActivityOpen(open);
        if (!open) setActivityWorker(null);
      }}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-50">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a8a]">Actividad operativa del trabajador</DialogTitle>
          </DialogHeader>
          {activityWorker ? (
            <WorkerActivityPanel worker={activityWorker} userId={user?.id} onClose={() => setActivityOpen(false)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
