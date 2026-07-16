import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JobForm from '@/components/jobs/JobForm';

export default function DailyJobCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const duplicateJobDraft = location.state?.duplicateJobDraft || null;
  const isDuplicate = Boolean(duplicateJobDraft);

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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-50">Nueva solicitud</h1>
              <p className="text-sm md:text-base text-gray-500 dark:text-slate-300">
                {isDuplicate ? 'Revisá la información precargada antes de guardar.' : 'Cargá la información completa para generar el trabajo.'}
              </p>
            </div>
          </div>
        </div>

        {isDuplicate && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-[#1e3a8a] dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
            Creando un nuevo trabajo a partir de uno existente
          </div>
        )}

        <JobForm
          mode="page"
          initialJobData={duplicateJobDraft}
          onCancel={() => navigate('/app/trabajos-diarios')}
          onSuccess={() => navigate('/app/trabajos-diarios')}
        />
      </div>
    </div>
  );
}
