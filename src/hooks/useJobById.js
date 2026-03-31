import { useEffect, useState } from 'react';
import { jobsService } from '@/services/jobs.service';

export const useJobById = (id) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchJob = async () => {
      if (!id) {
        setData(null);
        return;
      }
      setLoading(true);
      setError(null);
      const result = await jobsService.getJobById(id);
      if (!isMounted) return;
      if (result?.success) {
        setData(result.data || null);
      } else {
        setData(null);
        setError(result?.error || 'No se pudo cargar el detalle.');
      }
      setLoading(false);
    };

    fetchJob();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { data, loading, error };
};
