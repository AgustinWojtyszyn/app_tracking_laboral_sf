import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LanguageContext = createContext({ language: 'es', toggleLanguage: () => {}, t: (key, fallback) => fallback || key });

const translations = {
  es: {
    brand: 'Job Tracker',
    nav: {
      daily: 'Trabajos Diarios',
      monthly: 'Panel Mensual',
      history: 'Historial',
      workers: 'Trabajadores',
      groups: 'Grupos',
      settings: 'Configuración',
      admin: 'Panel Admin',
      tutorial: 'Tutorial',
      logout: 'Cerrar Sesión',
    },
    auth: {
      backHome: 'Volver al inicio',
      loginTitle: 'Iniciar Sesión',
      loginSubtitle: 'Accede a tu cuenta de Job Tracker',
      registerTitle: 'Crear Cuenta',
      registerSubtitle: 'Únete a Job Tracker para gestionar tu negocio',
      noAccount: '¿No tienes cuenta?',
      yesAccount: '¿Ya tienes cuenta?',
      registerCta: 'Regístrate aquí',
      loginCta: 'Inicia sesión aquí',
    },
    tutorial: {
      title: 'Tutorial de uso',
      intro: 'Sigue estos pasos de menor a mayor complejidad para dominar la aplicación.',
      steps: {
        step1Title: '1. Inicia sesión o crea tu cuenta',
        step1a: 'Ingresa con tu email y contraseña.',
        step1b: 'Si no tienes cuenta, regístrate y confirma tu correo.',
        step1Cta: 'Ir a Login',
        step2Title: '2. Configura tu perfil',
        step2a: 'Actualiza tu nombre y datos básicos.',
        step2b: 'Cambia tu contraseña desde Seguridad cuando lo necesites.',
        step2Cta: 'Ir a Configuración',
        step3Title: '3. Crea trabajos diarios',
        step3a: 'Desde Trabajos Diarios carga un nuevo trabajo con título, cliente y costos.',
        step3b: 'Adjunta fecha, horas y notas para dar contexto.',
        step3Cta: 'Ir a Trabajos Diarios',
        step4Title: '4. Organiza equipos y permisos',
        step4a: 'Crea grupos de trabajo y asigna miembros.',
        step4b: 'Marca quién es administrador del grupo para gestionar accesos.',
        step4Cta: 'Ir a Grupos',
        step5Title: '5. Revisa paneles y reportes',
        step5a: 'Consulta el Panel Mensual para ver horas y montos consolidados.',
        step5b: 'Usa Historial para auditar trabajos pasados y filtrar rangos.',
        step5Cta: 'Ir al Panel Mensual',
        step6Title: '6. Seguridad y administración',
        step6a: 'Verifica tu email y mantén la sesión segura.',
        step6b: 'Si eres admin, gestiona usuarios y accesos desde la sección Admin.',
        step6Cta: 'Ir a Admin',
        adminOnly: '(solo administradores)',
      },
    },
    workersPage: {
      title: 'Trabajadores',
      subtitle: 'Registros internos para asignar trabajos',
      searchPlaceholder: 'Buscar por nombre, alias o teléfono',
      emptyTitle: 'Todavía no hay trabajadores registrados.',
      emptyDesc: 'Creá registros internos de trabajadores para poder asignarlos a los trabajos.',
      statusActive: 'Activo',
      statusInactive: 'Inactivo',
      name: 'Nombre',
      alias: 'Alias',
      phone: 'Teléfono',
      status: 'Estado',
      createdAt: 'Fecha alta',
      actions: 'Acciones',
      edit: 'Editar',
      delete: 'Eliminar',
      deleteTitle: '¿Eliminar trabajador?',
      deleteDesc: 'Si tiene trabajos asociados se marcará como inactivo.',
      createCta: 'Crear trabajador',
    },
    groupsPage: {
      title: 'Grupos de Trabajo',
      subtitle: 'Colabora con otros usuarios',
      emptyTitle: 'No tienes grupos',
      emptyDesc: 'Crea un grupo para compartir trabajos y gestionar proyectos en equipo.',
      manageMembers: 'Gestionar miembros',
      adminBadge: 'Admin',
      noDescription: 'Sin descripción disponible.',
      membersLabel: 'Miembros',
      creationLabel: 'Fecha creación',
      deleteTitle: '¿Eliminar Grupo?',
      deleteDesc: 'Estás a punto de eliminar este grupo. Esta acción es irreversible.',
    },
    monthlyPage: {
      title: 'Panel Mensual',
      subtitle: 'Vista detallada por día',
      totalHours: 'Total Horas',
      totalCost: 'Total Costo',
      totalCharge: 'Total a Cobrar',
      emptyTitle: 'Sin trabajos',
      emptyDesc: 'No hay registros para el rango y filtros seleccionados.',
      chargeLabel: 'Cobrar',
      columns: {
        date: 'Fecha',
        description: 'Descripción',
        location: 'Lugar de trabajo',
        worker: 'Trabajador',
        type: 'Tipo de trabajo',
        group: 'Grupo',
        hours: 'Horas',
        cost: 'Costo',
        charge: 'Cobrar',
        status: 'Estado',
      },
      status: {
        pending: 'Pendiente',
        completed: 'Completado',
        archived: 'Archivado',
      },
    },
  },
  en: {
    brand: 'Job Tracker',
    nav: {
      daily: 'Daily Jobs',
      monthly: 'Monthly Panel',
      history: 'History',
      workers: 'Workers',
      groups: 'Groups',
      settings: 'Settings',
      admin: 'Admin Panel',
      tutorial: 'Tutorial',
      logout: 'Sign Out',
    },
    auth: {
      backHome: 'Back to home',
      loginTitle: 'Sign in',
      loginSubtitle: 'Access your Job Tracker account',
      registerTitle: 'Create Account',
      registerSubtitle: 'Join Job Tracker to run your business',
      noAccount: "Don't have an account?",
      yesAccount: 'Already have an account?',
      registerCta: 'Register here',
      loginCta: 'Sign in here',
    },
    tutorial: {
      title: 'How-to guide',
      intro: 'Follow these steps from simplest to most advanced to master the app.',
      steps: {
        step1Title: '1. Sign in or create your account',
        step1a: 'Sign in with your email and password.',
        step1b: 'If you are new, register and confirm your email.',
        step1Cta: 'Go to Login',
        step2Title: '2. Set up your profile',
        step2a: 'Update your name and basic details.',
        step2b: 'Change your password from Security when needed.',
        step2Cta: 'Go to Settings',
        step3Title: '3. Create daily jobs',
        step3a: 'From Daily Jobs add a new job with title, client and costs.',
        step3b: 'Attach date, hours and notes for context.',
        step3Cta: 'Go to Daily Jobs',
        step4Title: '4. Organize teams and permissions',
        step4a: 'Create groups and assign members.',
        step4b: 'Mark who is admin to manage access.',
        step4Cta: 'Go to Groups',
        step5Title: '5. Review dashboards and reports',
        step5a: 'Use the Monthly Panel to see consolidated hours and amounts.',
        step5b: 'Use History to audit past jobs and filter ranges.',
        step5Cta: 'Go to Monthly Panel',
        step6Title: '6. Security and administration',
        step6a: 'Verify your email and keep the session secure.',
        step6b: 'If you are an admin, manage users and access in Admin.',
        step6Cta: 'Go to Admin',
        adminOnly: '(admin only)',
      },
    },
    workersPage: {
      title: 'Workers',
      subtitle: 'Internal records to assign jobs',
      searchPlaceholder: 'Search by name, alias or phone',
      emptyTitle: 'No workers registered yet.',
      emptyDesc: 'Create worker records so you can assign them to jobs.',
      statusActive: 'Active',
      statusInactive: 'Inactive',
      name: 'Name',
      alias: 'Alias',
      phone: 'Phone',
      status: 'Status',
      createdAt: 'Created',
      actions: 'Actions',
      edit: 'Edit',
      delete: 'Delete',
      deleteTitle: 'Delete worker?',
      deleteDesc: 'If they have jobs, they will be marked as inactive.',
      createCta: 'Create worker',
    },
    groupsPage: {
      title: 'Work Groups',
      subtitle: 'Collaborate with other users',
      emptyTitle: 'You have no groups',
      emptyDesc: 'Create a group to share jobs and manage projects as a team.',
      manageMembers: 'Manage members',
      adminBadge: 'Admin',
      noDescription: 'No description available.',
      membersLabel: 'Members',
      creationLabel: 'Created on',
      deleteTitle: 'Delete Group?',
      deleteDesc: 'You are about to delete this group. This action cannot be undone.',
    },
    monthlyPage: {
      title: 'Monthly Panel',
      subtitle: 'Day-by-day view',
      totalHours: 'Total Hours',
      totalCost: 'Total Cost',
      totalCharge: 'Total to Charge',
      emptyTitle: 'No jobs',
      emptyDesc: 'No records for the selected range and filters.',
      chargeLabel: 'Charge',
      columns: {
        date: 'Date',
        description: 'Description',
        location: 'Workplace',
        worker: 'Worker',
        type: 'Job type',
        group: 'Group',
        hours: 'Hours',
        cost: 'Cost',
        charge: 'Charge',
        status: 'Status',
      },
      status: {
        pending: 'Pending',
        completed: 'Completed',
        archived: 'Archived',
      },
    },
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('es');

  useEffect(() => {
    const stored = localStorage.getItem('jt-lang');
    if (stored === 'en' || stored === 'es') {
      setLanguage(stored);
      document.documentElement.lang = stored;
    } else {
      document.documentElement.lang = 'es';
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('jt-lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => setLanguage((prev) => (prev === 'es' ? 'en' : 'es'));

  const t = useMemo(() => {
    return (key, fallback) => {
      const segments = key.split('.');
      let value = translations[language];
      let fallbackValue = translations.es;
      for (const segment of segments) {
        value = value ? value[segment] : undefined;
        fallbackValue = fallbackValue ? fallbackValue[segment] : undefined;
      }
      return value ?? fallbackValue ?? fallback ?? key;
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
