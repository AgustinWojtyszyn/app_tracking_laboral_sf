
import { useState, useCallback } from 'react';
import { jobsService } from '@/services/jobs.service';

export const useJobs = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getJobsByDateRange = useCallback(async (start, end, filters) => {
    setLoading(true);
    const result = await jobsService.getJobsByDateRange(start, end, filters);
    setLoading(false);
    if (!result.success) setError(result.error);
    return result;
  }, []);

  const createJob = useCallback(async (data) => {
    setLoading(true);
    const result = await jobsService.createJob(data);
    setLoading(false);
    return result;
  }, []);

  const updateJob = useCallback(async (id, data) => {
    setLoading(true);
    const result = await jobsService.updateJob(id, data);
    setLoading(false);
    return result;
  }, []);

  const deleteJob = useCallback(async (id) => {
    setLoading(true);
    const result = await jobsService.deleteJob(id);
    setLoading(false);
    return result;
  }, []);

  return { loading, error, getJobsByDateRange, createJob, updateJob, deleteJob };
};
