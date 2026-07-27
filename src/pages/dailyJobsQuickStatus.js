import { normalizeJobStatus } from '@/utils/jobStatus';

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
