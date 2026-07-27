import { describe, expect, it } from 'vitest';
import {
  buildJobsAfterStatusChange,
  getPageAfterStatusRemoval,
  getSummaryStatusCardFilter,
  isSummaryStatusCardActive,
  jobMatchesStatusFilter,
} from './dailyJobsQuickStatus';

describe('dailyJobsQuickStatus', () => {
  it('mantiene la fila cuando el filtro acepta el nuevo estado', () => {
    expect(jobMatchesStatusFilter('completed', 'all')).toBe(true);
    expect(jobMatchesStatusFilter('completed', 'completed')).toBe(true);
  });

  it('retira la fila cuando deja de coincidir con el filtro', () => {
    const result = buildJobsAfterStatusChange({
      jobs: [
        { id: 'job-1', status: 'pending', title: 'A' },
        { id: 'job-2', status: 'pending', title: 'B' },
      ],
      jobId: 'job-1',
      updatedJob: { id: 'job-1', title: 'A actualizada' },
      nextStatus: 'completed',
      selectedStatus: 'pending',
    });

    expect(result.removed).toBe(true);
    expect(result.jobs).toEqual([{ id: 'job-2', status: 'pending', title: 'B' }]);
  });

  it('actualiza la fila cuando sigue visible', () => {
    const result = buildJobsAfterStatusChange({
      jobs: [{ id: 'job-1', status: 'pending', title: 'A' }],
      jobId: 'job-1',
      updatedJob: { id: 'job-1', title: 'A actualizada' },
      nextStatus: 'completed',
      selectedStatus: 'all',
    });

    expect(result.removed).toBe(false);
    expect(result.jobs[0]).toMatchObject({
      id: 'job-1',
      title: 'A actualizada',
      status: 'completed',
      estado: 'completed',
    });
  });

  it('retrocede una pagina si la pagina actual queda vacia', () => {
    expect(getPageAfterStatusRemoval({ currentPage: 3, nextJobsLength: 0 })).toBe(2);
    expect(getPageAfterStatusRemoval({ currentPage: 1, nextJobsLength: 0 })).toBe(1);
    expect(getPageAfterStatusRemoval({ currentPage: 3, nextJobsLength: 1 })).toBe(3);
  });

  it('asocia las tarjetas de resumen con el filtro de estado existente', () => {
    expect(getSummaryStatusCardFilter('all')).toBe('all');
    expect(getSummaryStatusCardFilter('pending')).toBe('pending');
    expect(getSummaryStatusCardFilter('completed')).toBe('completed');
    expect(getSummaryStatusCardFilter('workers')).toBeNull();
    expect(getSummaryStatusCardFilter('locations')).toBeNull();
  });

  it('solo marca activa la tarjeta equivalente al estado seleccionado', () => {
    expect(isSummaryStatusCardActive('all', 'all')).toBe(true);
    expect(isSummaryStatusCardActive('pending', 'pending')).toBe(true);
    expect(isSummaryStatusCardActive('completed', 'completed')).toBe(true);
    expect(isSummaryStatusCardActive('pending', 'completed')).toBe(false);
    expect(isSummaryStatusCardActive('all', 'archived')).toBe(false);
    expect(isSummaryStatusCardActive('pending', 'cancelled')).toBe(false);
    expect(isSummaryStatusCardActive('workers', 'pending')).toBe(false);
  });
});
