import { normalizeJobStatus } from '@/utils/jobStatus';

export const SUMMARY_STATUS_CARD_FILTERS = {
  all: 'all',
  pending: 'pending',
  completed: 'completed',
};

export const getSummaryStatusCardFilter = (cardKey) => (
  SUMMARY_STATUS_CARD_FILTERS[cardKey] || null
);

export const isSummaryStatusCardActive = (cardKey, selectedStatus) => (
  getSummaryStatusCardFilter(cardKey) === selectedStatus
);

export const jobMatchesStatusFilter = (jobStatus, selectedStatus) => {
  const rawFilter = String(selectedStatus || '').trim();
  if (!rawFilter || rawFilter === 'all') return true;
  const filter = normalizeJobStatus(rawFilter);
  return normalizeJobStatus(jobStatus) === filter;
};

export const buildJobsAfterStatusChange = ({
  jobs,
  jobId,
  updatedJob,
  nextStatus,
  selectedStatus,
}) => {
  const currentJobs = Array.isArray(jobs) ? jobs : [];
  const shouldKeep = jobMatchesStatusFilter(nextStatus, selectedStatus);

  if (!shouldKeep) {
    return {
      jobs: currentJobs.filter((job) => job?.id !== jobId),
      removed: true,
    };
  }

  return {
    jobs: currentJobs.map((job) => (
      job?.id === jobId
        ? { ...job, ...(updatedJob || {}), status: nextStatus, estado: nextStatus }
        : job
    )),
    removed: false,
  };
};

export const getPageAfterStatusRemoval = ({ currentPage, nextJobsLength }) => (
  nextJobsLength === 0 && currentPage > 1 ? currentPage - 1 : currentPage
);

export const getDailyJobsEmptyStateConfig = ({ jobs, loading, error, hasActiveFilters, isEn }) => {
  if (loading || error || !Array.isArray(jobs) || jobs.length > 0) return null;

  if (hasActiveFilters) {
    return {
      kind: 'filters',
      title: isEn ? 'No matches' : 'No hay coincidencias',
      description: isEn
        ? 'We could not find jobs with the selected filters.'
        : 'No encontramos trabajos con los filtros seleccionados.',
      actionLabel: isEn ? 'Clear filters' : 'Limpiar filtros',
    };
  }

  return {
    kind: 'empty-date',
    title: isEn ? 'No jobs for this date' : 'No hay trabajos para esta fecha',
    description: isEn
      ? 'You can create a new job or copy jobs from another day.'
      : 'Podés crear un trabajo nuevo o copiar trabajos de otro día.',
    primaryActionLabel: isEn ? 'New job' : 'Nuevo trabajo',
    secondaryActionLabel: isEn ? 'Copy jobs from another day' : 'Copiar trabajos de otro día',
  };
};
