import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { onboardingService } from '@/services/onboarding.service';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';

const normalizeRole = (userRole, isAdmin) => {
  if (['admin', 'solicitante', 'trabajador'].includes(userRole)) return userRole;
  return isAdmin ? 'admin' : 'solicitante';
};

export default function AdminTutorialPage() {
  const { user, isAdmin, userRole } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { resumeTourIfNeeded } = useOnboardingTour();
  const role = normalizeRole(userRole, isAdmin);

  useEffect(() => {
    if (!user) return;
    resumeTourIfNeeded({
      role,
      onComplete: () => onboardingService.setOnboardingCompleted(user.id, role)
    });
  }, [user, role, resumeTourIfNeeded]);

  const steps = useMemo(() => ([
    {
      key: 'create-group',
      title: isEn ? 'Create a group' : 'Crear un grupo',
      description: isEn ? 'Set name and description to define the project or team.' : 'Definí nombre y descripción para el proyecto o equipo.',
      path: '/app/grupos',
    },
    {
      key: 'invite-members',
      title: isEn ? 'Invite members' : 'Invitar miembros',
      description: isEn ? 'Add members by email so they can see and update jobs.' : 'Agregá miembros por email para que puedan ver y actualizar trabajos.',
      path: '/app/grupos',
    },
    {
      key: 'first-job',
      title: isEn ? 'Create the first job' : 'Crear el primer trabajo',
      description: isEn ? 'Create a daily job with date, description, hours, costs, and requester.' : 'Cargá fecha, descripción, horas, costos y solicitante del trabajo.',
      path: '/app/trabajos-diarios',
    },
    {
      key: 'workers',
      title: isEn ? 'Manage workers' : 'Gestionar trabajadores',
      description: isEn ? 'Add workers with alias and contact info for accurate assignments.' : 'Sumá trabajadores con alias y contacto para asignaciones correctas.',
      path: '/app/trabajadores',
    },
    {
      key: 'monthly-panel',
      title: isEn ? 'Review monthly panel' : 'Ver Panel Mensual',
      description: isEn ? 'Use filters to audit totals, costs, and job status by day.' : 'Usá filtros para auditar totales, costos y estados por día.',
      path: '/app/panel-mensual',
    },
    {
      key: 'admin',
      title: isEn ? 'Administer users' : 'Administrar usuarios',
      description: isEn ? 'Review users, permissions, and activity from the admin panel.' : 'Revisá usuarios, permisos y actividad desde el panel admin.',
      path: '/app/admin',
    },
  ]), [isEn]);

  const handleNavigate = (path) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('onboarding_replay', '1');
    }
    navigate(path);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8" data-tour="tutorial-admin-hub">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-slate-50">
          {isEn ? 'Admin tutorial' : 'Tutorial Admin'}
        </h1>
        <p className="text-lg md:text-xl text-gray-500 dark:text-slate-300">
          {isEn ? 'Simple steps to set up and manage your team.' : 'Pasos simples para configurar y gestionar tu equipo.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-7 shadow-sm flex flex-col gap-5 min-h-[150px] md:min-h-[170px]"
          >
            <div>
              <p className="text-xs md:text-sm font-semibold text-blue-700 dark:text-blue-200">
                {isEn ? `Step ${index + 1}` : `Paso ${index + 1}`}
              </p>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-50">{step.title}</h3>
              <p className="text-sm md:text-base text-gray-500 dark:text-slate-300">{step.description}</p>
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
