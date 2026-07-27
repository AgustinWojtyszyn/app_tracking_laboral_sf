import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CheckSquare, Copy, Square } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { jobsService } from '@/services/jobs.service';
import { formatCurrency } from '@/utils/formatters';

const getJobWorkerLabel = (job) => (
  job?.workers?.display_name
  || job?.workers?.alias
  || job?.worker_name
  || 'Sin trabajador'
);

const getJobGroupLabel = (job) => job?.groups?.name || 'Sin grupo';

const getJobTypeLabel = (job) => job?.action_type || job?.job_type || job?.type || 'Sin tipo';

const getJobTitle = (job) => job?.title || job?.description || 'Trabajo sin descripción';

const buildRequestId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function CopyJobsFromDateDialog({
  open,
  visibleDate,
  onOpenChange,
  onCopy,
}) {
  const [sourceDate, setSourceDate] = useState('');
  const [targetDate, setTargetDate] = useState(visibleDate || '');
  const [sourceJobs, setSourceJobs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState('');
  const [copying, setCopying] = useState(false);
  const requestIdRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setSourceDate('');
    setTargetDate(visibleDate || '');
    setSourceJobs([]);
    setSelectedIds([]);
    setJobsError('');
    setLoadingJobs(false);
    setCopying(false);
    requestIdRef.current = null;
  }, [open, visibleDate]);

  useEffect(() => {
    if (!open || !sourceDate) return;

    let cancelled = false;
    setLoadingJobs(true);
    setJobsError('');
    setSelectedIds([]);

    jobsService.listJobsForCopyByDate(sourceDate).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setSourceJobs(Array.isArray(result.data?.items) ? result.data.items : []);
      } else {
        setSourceJobs([]);
        setJobsError(result.error || 'No se pudieron cargar los trabajos de origen.');
      }
    }).catch(() => {
      if (cancelled) return;
      setSourceJobs([]);
      setJobsError('No se pudieron cargar los trabajos de origen.');
    }).finally(() => {
      if (!cancelled) setLoadingJobs(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, sourceDate]);

  const selectedCount = selectedIds.length;
  const sourceHasJobs = sourceJobs.length > 0;
  const datesAreValid = Boolean(sourceDate && targetDate && sourceDate < targetDate);
  const canCopy = datesAreValid && selectedCount > 0 && !loadingJobs && !copying;
  const allSelected = sourceHasJobs && selectedCount === sourceJobs.length;
  const maxSourceDate = targetDate || undefined;

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleJob = (jobId) => {
    setSelectedIds((current) => (
      current.includes(jobId)
        ? current.filter((id) => id !== jobId)
        : [...current, jobId]
    ));
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : sourceJobs.map((job) => job.id).filter(Boolean));
  };

  const handleSourceDateChange = (event) => {
    setSourceDate(event.target.value);
  };

  const handleTargetDateChange = (event) => {
    setTargetDate(event.target.value);
  };

  const handleCopy = async () => {
    if (!canCopy || !onCopy) return;
    setCopying(true);
    if (!requestIdRef.current) requestIdRef.current = buildRequestId();
    try {
      await onCopy({
        jobIds: selectedIds,
        sourceDate,
        targetDate,
        copyRequestId: requestIdRef.current,
      });
    } finally {
      setCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !copying && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Copy className="h-5 w-5 text-[#1e3a8a] dark:text-blue-300" />
            Copiar trabajos de otro día
          </DialogTitle>
          <DialogDescription>
            Elegí una fecha anterior, seleccioná los trabajos y definí la fecha destino.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 overflow-hidden">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-gray-700 dark:text-slate-200">
              Fecha de origen
              <input
                type="date"
                value={sourceDate}
                max={maxSourceDate}
                onChange={handleSourceDateChange}
                disabled={copying}
                className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-gray-700 dark:text-slate-200">
              Fecha de destino
              <input
                type="date"
                value={targetDate}
                onChange={handleTargetDateChange}
                disabled={copying}
                className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              />
            </label>
          </div>

          {sourceDate && targetDate && !datesAreValid && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              La fecha de origen debe ser anterior a la fecha de destino.
            </div>
          )}

          <div className="rounded-lg border border-gray-200 dark:border-slate-800">
            <div className="flex flex-col gap-2 border-b border-gray-200 p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-slate-100">
                <CalendarDays className="h-4 w-4" />
                Trabajos encontrados
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                  {selectedCount} seleccionados
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                  disabled={!sourceHasJobs || loadingJobs || copying}
                  className="h-8 gap-2 px-3 text-xs"
                >
                  {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  Seleccionar todos
                </Button>
              </div>
            </div>

            <div className="max-h-[42vh] overflow-y-auto">
              {!sourceDate ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                  Seleccioná una fecha de origen para consultar sus trabajos.
                </div>
              ) : loadingJobs ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : jobsError ? (
                <div className="px-4 py-8 text-center text-sm text-red-600 dark:text-red-300">
                  {jobsError}
                </div>
              ) : !sourceHasJobs ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                  No hay trabajos para copiar en la fecha seleccionada.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {sourceJobs.map((job) => {
                    const checked = selectedIdSet.has(job.id);
                    return (
                      <label
                        key={job.id}
                        className="grid cursor-pointer grid-cols-[auto_1fr] gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/70"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleJob(job.id)}
                          disabled={copying}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-gray-900 dark:text-slate-50">
                            {getJobTitle(job)}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-slate-300">
                            <span>{job.location || 'Sin lugar'}</span>
                            <span>{getJobWorkerLabel(job)}</span>
                            <span>{getJobGroupLabel(job)}</span>
                            <span>{getJobTypeLabel(job)}</span>
                            <span>{formatCurrency(job.cost_spent)} / {formatCurrency(job.amount_to_charge)}</span>
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={copying}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCopy}
            disabled={!canCopy}
            className="bg-[#1e3a8a] text-white hover:bg-blue-900"
          >
            {copying ? 'Copiando...' : 'Copiar trabajos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
