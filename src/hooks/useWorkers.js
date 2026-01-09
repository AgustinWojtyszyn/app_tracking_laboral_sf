import { useState, useCallback } from 'react';
import { workersService } from '@/services/workers.service';

export const useWorkers = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getWorkers = useCallback(async (options) => {
    setLoading(true);
    const result = await workersService.getWorkers(options);
    setLoading(false);
    if (!result.success) setError(result.error);
    return result;
  }, []);

  const createWorker = useCallback(async (data) => {
    setLoading(true);
    const result = await workersService.createWorker(data);
    setLoading(false);
    if (!result.success) setError(result.error);
    return result;
  }, []);

  const updateWorker = useCallback(async (id, data) => {
    setLoading(true);
    const result = await workersService.updateWorker(id, data);
    setLoading(false);
    if (!result.success) setError(result.error);
    return result;
  }, []);

  const deleteWorker = useCallback(async (id) => {
    setLoading(true);
    const result = await workersService.deleteWorker(id);
    setLoading(false);
    if (!result.success) setError(result.error);
    return result;
  }, []);

  return { loading, error, getWorkers, createWorker, updateWorker, deleteWorker };
};
