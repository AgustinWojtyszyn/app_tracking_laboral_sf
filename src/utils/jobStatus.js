export const normalizeJobStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'completado' || normalized === 'completed') return 'completed';
  if (normalized === 'pendiente' || normalized === 'pending') return 'pending';
  if (normalized === 'archivado' || normalized === 'archived') return 'archived';

  return '';
};

