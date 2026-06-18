
import { useState, useCallback, useEffect, useRef } from 'react';
import { jobsService } from '@/services/jobs.service';

export const createUnexpectedJobsErrorResult = (error, fallbackMessage) => ({
  success: false,
  error: error?.message || fallbackMessage,
});

export const runJobsOperation = async ({
  operation,
  fallbackMessage,
  isMounted,
  onLoading,
  onError,
}) => {
  if (isMounted()) {
    onLoading(true);
    onError(null);
  }

  try {
    const result = await operation();
    if (isMounted() && !result.success) {
      onError(result.error);
    }
    return result;
  } catch (operationError) {
    const result = createUnexpectedJobsErrorResult(operationError, fallbackMessage);
    if (isMounted()) {
      onError(result.error);
    }
    return result;
  } finally {
    if (isMounted()) {
      onLoading(false);
    }
  }
};

export const useJobs = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runOperation = useCallback(async (operation, fallbackMessage) => {
    return runJobsOperation({
      operation,
      fallbackMessage,
      isMounted: () => mountedRef.current,
      onLoading: setLoading,
      onError: setError,
    });
  }, []);

  const getJobsByDateRange = useCallback(async (start, end, filters) => {
    return runOperation(
      () => jobsService.getJobsByDateRange(start, end, filters),
      'Error al cargar trabajos. Verifique su conexión.'
    );
  }, [runOperation]);

  const createJob = useCallback(async (data) => {
    return runOperation(
      () => jobsService.createJob(data),
      'Error al crear el trabajo.'
    );
  }, [runOperation]);

  const updateJob = useCallback(async (id, data) => {
    return runOperation(
      () => jobsService.updateJob(id, data),
      'Error al actualizar el trabajo.'
    );
  }, [runOperation]);

  const deleteJob = useCallback(async (id) => {
    return runOperation(
      () => jobsService.deleteJob(id),
      'Error al eliminar el trabajo.'
    );
  }, [runOperation]);

  const deleteCompletedJobs = useCallback(async (start, end) => {
    return runOperation(
      () => jobsService.deleteCompletedJobs(start, end),
      'No se pudieron limpiar los trabajos completados.'
    );
  }, [runOperation]);

  const deletePendingJobs = useCallback(async (start, end) => {
    return runOperation(
      () => jobsService.deletePendingJobs(start, end),
      'No se pudieron limpiar los trabajos pendientes.'
    );
  }, [runOperation]);

  return {
    loading,
    error,
    getJobsByDateRange,
    createJob,
    updateJob,
    deleteJob,
    deleteCompletedJobs,
    deletePendingJobs,
  };
};
