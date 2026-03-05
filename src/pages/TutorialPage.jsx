import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { onboardingService } from '@/services/onboarding.service';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { useLanguage } from '@/contexts/LanguageContext';

const normalizeRole = (userRole, isAdmin) => {
  if (['admin', 'solicitante', 'trabajador'].includes(userRole)) return userRole;
  return isAdmin ? 'admin' : 'solicitante';
};

export default function TutorialPage() {
  const { user, isAdmin, userRole } = useAuth();
  const role = normalizeRole(userRole, isAdmin);
  const navigate = useNavigate();
  const { resumeTourIfNeeded } = useOnboardingTour();
  const { language } = useLanguage();
  const isEn = language === 'en';

  useEffect(() => {
    if (!user) return;
    resumeTourIfNeeded({
      role,
      onComplete: () => onboardingService.setOnboardingCompleted(user.id, role)
    });
  }, [user, role, resumeTourIfNeeded]);

  const steps = useMemo(() => {
    if (role === 'trabajador') {
      return [
        {
          key: 'assigned-jobs',
          title: isEn ? 'Check daily jobs' : 'Ver trabajos del día',
          description: isEn
            ? 'Open the daily list, find your name, and review date, place, and description.'
            : 'Abrí la lista diaria, buscá tu nombre y revisá fecha, lugar y descripción.',
          path: '/app/trabajos-diarios',
        },
        {
          key: 'complete-job',
          title: isEn ? 'Update hours and status' : 'Cargar horas y estado',
          description: isEn
            ? 'Edit the job, load hours and costs, then mark it as completed.'
            : 'Editá el trabajo, cargá horas y costos, y marcá como completado.',
          path: '/app/trabajos-diarios',
        },
        {
          key: 'monthly-panel',
          title: isEn ? 'Review monthly panel' : 'Ver Panel Mensual',
          description: isEn
            ? 'Use filters by date and status to see totals and the daily breakdown.'
            : 'Usá filtros por fecha y estado para ver totales y el detalle por día.',
          path: '/app/panel-mensual',
        },
        {
          key: 'profile',
          title: isEn ? 'Update your profile' : 'Actualizá tu perfil',
          description: isEn
            ? 'Update your name, email, and security options to keep access safe.'
            : 'Actualizá tu nombre, email y seguridad para mantener el acceso seguro.',
          path: '/app/configuracion',
        },
      ];
    }

    return [
      {
        key: 'first-job',
        title: isEn ? 'Create a job' : 'Crear un trabajo',
        description: isEn
          ? 'Go to Daily Jobs, press New, and complete date, description, hours, and amounts.'
          : 'Entrá a Trabajos Diarios, tocá Nuevo y completá fecha, descripción, horas y montos.',
        path: '/app/trabajos-diarios',
      },
      {
        key: 'workers',
        title: isEn ? 'Add workers' : 'Cargar trabajadores',
        description: isEn
          ? 'Create worker records with name and alias so you can assign jobs correctly.'
          : 'Creá registros con nombre y alias para asignar trabajos correctamente.',
        path: '/app/trabajadores',
      },
      {
        key: 'monthly-panel',
        title: isEn ? 'Review monthly panel' : 'Ver Panel Mensual',
        description: isEn
          ? 'Filter by dates to review totals, costs, and pending/completed jobs.'
          : 'Filtrá por fechas para ver totales, costos y trabajos pendientes/completados.',
        path: '/app/panel-mensual',
      },
      {
        key: 'profile',
        title: isEn ? 'Update your profile' : 'Actualizá tu perfil',
        description: isEn
          ? 'Update your personal info and set a secure password in Settings.'
          : 'Actualizá tus datos personales y configurá una contraseña segura.',
        path: '/app/configuracion',
      }
    ];
  }, [role, isEn]);

  const handleNavigate = (path) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('onboarding_replay', '1');
    }
    navigate(path);
  };

  const handleReplayGuide = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('onboarding_replay', '1');
    }
    navigate('/app/trabajos-diarios');
  };

  const handleResetGuide = async () => {
    if (!user?.id) return;
    await onboardingService.resetOnboarding(user.id, role);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`onboarding_autostart_done:${user.id}:${role}`);
      window.sessionStorage.setItem('onboarding_restart', '1');
    }
    navigate('/app/trabajos-diarios');
  };

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8" data-tour="tutorial-hub">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-slate-50">
            {isEn ? 'Quick tutorial' : 'Tutorial rápido'}
          </h1>
          <p className="text-lg md:text-xl text-gray-500 dark:text-slate-300">
            {isEn ? 'Follow these steps to start using the app.' : 'Seguí estos pasos para empezar a usar la app.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleReplayGuide} className="bg-[#1e3a8a] hover:bg-blue-900 text-white" data-tour="tutorial-replay">
            {isEn ? 'Replay guide' : 'Repetir guía'}
          </Button>
          <Button onClick={handleResetGuide} variant="outline" className="border-gray-300 hover:bg-gray-50 text-gray-700">
            {isEn ? 'Restart guide' : 'Reiniciar guía'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-7 shadow-sm flex flex-col gap-5 min-h-[150px] md:min-h-[170px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs md:text-sm font-semibold text-blue-700 dark:text-blue-200">
                  {isEn ? `Step ${index + 1}` : `Paso ${index + 1}`}
                </p>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-50">{step.title}</h3>
                <p className="text-sm md:text-base text-gray-500 dark:text-slate-300">{step.description}</p>
              </div>
            </div>
            <Button
              onClick={() => handleNavigate(step.path)}
              className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white mt-auto"
            >
              {isEn ? 'Go' : 'Ir'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
