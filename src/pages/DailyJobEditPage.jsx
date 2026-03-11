import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JobForm from '@/components/jobs/JobForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { jobsService } from '@/services/jobs.service';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export default function DailyJobEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchJob = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const result = await jobsService.getJobById(id, user?.id || null);
      if (!mounted) return;
      if (result.success) {
        setJob(result.data);
      } else {
        setJob(null);
        addToast(result.error || 'No se pudo cargar el trabajo.', 'error');
      }
      setLoading(false);
    };

    fetchJob();

    return () => {
      mounted = false;
    };
  }, [id, user?.id, addToast]);

  if (loading) {
    return (
      <div className="py-10 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-[1200px] mx-auto space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/app/trabajos-diarios')}
          className="h-10 px-3 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>
        <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-slate-50">Trabajo no encontrado</h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-slate-300 mt-2">
            No pudimos cargar la solicitud solicitada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/app/trabajos-diarios')}
              className="h-10 px-3 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-50">Editar solicitud</h1>
              <p className="text-sm md:text-base text-gray-500 dark:text-slate-300">
                Actualizá los datos del trabajo seleccionado.
              </p>
            </div>
          </div>
        </div>

        <JobForm
          mode="page"
          jobToEdit={job}
          onCancel={() => navigate('/app/trabajos-diarios')}
          onSuccess={() => navigate('/app/trabajos-diarios')}
        />
      </div>
    </div>
  );
}
