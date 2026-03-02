import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { onboardingService } from '@/services/onboarding.service';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';

const normalizeRole = (userRole, isAdmin) => {
  if (['admin', 'solicitante', 'trabajador'].includes(userRole)) return userRole;
  return isAdmin ? 'admin' : 'solicitante';
};

export default function TutorialPage() {
  const { user, isAdmin, userRole } = useAuth();
  const role = normalizeRole(userRole, isAdmin);
  const navigate = useNavigate();
  const { resumeTourIfNeeded } = useOnboardingTour();

  const [stats, setStats] = useState({
    jobsCount: null,
    completedJobsCount: null,
    groupsCount: null,
    groupMembersCount: null
  });

  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    const loadStats = async () => {
      const next = {
        jobsCount: null,
        completedJobsCount: null,
        groupsCount: null,
        groupMembersCount: null
      };

      try {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true });
        if (!error) next.jobsCount = count ?? 0;
      } catch (error) {
        console.warn('[tutorial] jobs count', error);
      }

      try {
        const { count, error } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed');
        if (!error) next.completedJobsCount = count ?? 0;
      } catch (error) {
        console.warn('[tutorial] completed jobs count', error);
      }

      let groupIds = [];
      try {
        const { data, error } = await supabase
          .from('groups')
          .select('id')
          .eq('created_by', user.id);
        if (!error && Array.isArray(data)) {
          groupIds = data.map((group) => group.id).filter(Boolean);
        }
      } catch (error) {
        console.warn('[tutorial] groups ids', error);
      }

      try {
        const { count, error } = await supabase
          .from('groups')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', user.id);
        if (!error) {
          next.groupsCount = count ?? 0;
        } else {
          const fallback = await supabase
            .from('groups')
            .select('id', { count: 'exact', head: true });
          if (!fallback.error) next.groupsCount = fallback.count ?? 0;
        }
      } catch (error) {
        console.warn('[tutorial] groups count', error);
      }

      try {
        if (groupIds.length > 0) {
          const { count, error } = await supabase
            .from('group_members')
            .select('id', { count: 'exact', head: true })
            .in('group_id', groupIds);
          if (!error) next.groupMembersCount = count ?? 0;
        } else {
          const { count, error } = await supabase
            .from('group_members')
            .select('id', { count: 'exact', head: true });
          if (!error) next.groupMembersCount = count ?? 0;
        }
      } catch (error) {
        console.warn('[tutorial] group members count', error);
      }

      if (active) setStats(next);
    };

    loadStats();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    resumeTourIfNeeded({
      role,
      onComplete: () => onboardingService.setOnboardingCompleted(user.id, role)
    });
  }, [user, role, resumeTourIfNeeded]);

  const steps = useMemo(() => {
    if (role === 'admin') {
      return [
        {
          key: 'create-group',
          title: 'Crear un grupo',
          description: 'Organizá tus equipos y proyectos.',
          path: '/app/grupos',
          isCompleted: (s) => (s.groupsCount ?? 0) > 0
        },
        {
          key: 'invite-members',
          title: 'Invitar miembros',
          description: 'Sumá gente a tu grupo.',
          path: '/app/grupos',
          isCompleted: (s) => (s.groupMembersCount ?? 0) > 1
        },
        {
          key: 'first-job',
          title: 'Crear primer trabajo',
          description: 'Registrá tu primer trabajo.',
          path: '/app/trabajos-diarios',
          isCompleted: (s) => (s.jobsCount ?? 0) > 0
        },
        {
          key: 'monthly-panel',
          title: 'Ver Panel Mensual',
          description: 'Revisá el panel con estadísticas.',
          path: '/app/panel-mensual',
          isCompleted: (s) => (s.jobsCount ?? 0) > 0
        }
      ];
    }

    if (role === 'trabajador') {
      return [
        {
          key: 'assigned-jobs',
          title: 'Ver trabajos asignados',
          description: 'Revisá tus trabajos del día.',
          path: '/app/trabajos-diarios',
          isCompleted: (s) => (s.jobsCount ?? 0) > 0
        },
        {
          key: 'complete-job',
          title: 'Marcar completado / cargar horas',
          description: 'Actualizá horas y estado cuando termines.',
          path: '/app/trabajos-diarios',
          isCompleted: (s) => (s.completedJobsCount ?? 0) > 0
        }
      ];
    }

    return [
      {
        key: 'first-job',
        title: 'Crear primer trabajo',
        description: 'Pedí tu primer trabajo desde la app.',
        path: '/app/trabajos-diarios',
        isCompleted: (s) => (s.jobsCount ?? 0) > 0
      },
      {
        key: 'track-status',
        title: 'Ver estado en tabla',
        description: 'Seguí el avance desde la tabla.',
        path: '/app/trabajos-diarios',
        isCompleted: (s) => (s.jobsCount ?? 0) > 0
      },
      {
        key: 'monthly-panel',
        title: 'Ver Panel Mensual',
        description: 'Consultá el resumen mensual.',
        path: '/app/panel-mensual',
        isCompleted: (s) => (s.jobsCount ?? 0) > 0
      }
    ];
  }, [role]);

  const stepItems = steps.map((step) => ({
    ...step,
    completed: step.isCompleted ? step.isCompleted(stats) : false
  }));

  const completedCount = stepItems.filter((step) => step.completed).length;
  const totalCount = stepItems.length;

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
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-slate-50">Guía de inicio</h1>
          <p className="text-lg md:text-xl text-gray-500 dark:text-slate-300">
            Seguí estos pasos para completar tu configuración inicial.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleReplayGuide} className="bg-[#1e3a8a] hover:bg-blue-900 text-white" data-tour="tutorial-replay">
            Repetir guía
          </Button>
          <Button onClick={handleResetGuide} variant="outline" className="border-gray-300 hover:bg-gray-50 text-gray-700">
            Reiniciar guía
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-50">Progreso</h2>
            <p className="text-sm md:text-base text-gray-500 dark:text-slate-300">
              Completados {completedCount} de {totalCount} pasos.
            </p>
          </div>
          <div className="text-3xl font-bold text-[#1e3a8a]">{completedCount} / {totalCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stepItems.map((step) => (
          <div
            key={step.key}
            className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-50">{step.title}</h3>
                <p className="text-sm md:text-base text-gray-500 dark:text-slate-300">{step.description}</p>
              </div>
              <span
                className={`text-xs md:text-sm font-semibold px-3 py-1 rounded-full ${
                  step.completed
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100'
                }`}
              >
                {step.completed ? 'Completado' : 'Pendiente'}
              </span>
            </div>
            <Button
              onClick={() => handleNavigate(step.path)}
              className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white"
            >
              Ir
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
