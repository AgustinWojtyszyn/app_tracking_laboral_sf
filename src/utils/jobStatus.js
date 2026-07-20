export const normalizeJobStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'completado' || normalized === 'completed') return 'completed';
  if (normalized === 'pendiente' || normalized === 'pending') return 'pending';
  if (normalized === 'en proceso' || normalized === 'en_proceso' || normalized === 'in_progress') return 'in_progress';
  if (normalized === 'cancelado' || normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  if (normalized === 'archivado' || normalized === 'archived') return 'cancelled';

  return 'pending';
};

export const JOB_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', labelEn: 'Pending' },
  { value: 'in_progress', label: 'En proceso', labelEn: 'In progress' },
  { value: 'completed', label: 'Completado', labelEn: 'Completed' },
  { value: 'cancelled', label: 'Cancelado', labelEn: 'Cancelled' },
];

export const getJobStatusLabel = (status, isEn = false) => {
  const normalized = normalizeJobStatus(status);
  const option = JOB_STATUS_OPTIONS.find((item) => item.value === normalized);
  return isEn ? option?.labelEn || 'Pending' : option?.label || 'Pendiente';
};

export const getJobStatusBadgeClass = (status) => {
  const normalized = normalizeJobStatus(status);
  if (normalized === 'completed') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200';
  if (normalized === 'in_progress') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200';
  if (normalized === 'cancelled') return 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200';
};
