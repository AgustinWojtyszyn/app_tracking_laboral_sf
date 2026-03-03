const basePlanEs = [
  {
    route: '/app/trabajos-diarios',
    selector: '[data-tour="nuevo-trabajo"]',
    title: 'Nuevo trabajo',
    description: 'Crea tu primer trabajo desde aquí.'
  },
  {
    route: '/app/trabajos-diarios',
    selector: '[data-tour="tabla-trabajos"]',
    title: 'Tabla',
    description: 'Consulta los trabajos registrados.'
  },
  {
    route: '/app/trabajos-diarios',
    selector: '[data-tour="metricas"]',
    title: 'Métricas',
    description: 'Resumen rápido de horas y costos.'
  },
  {
    route: '/app/trabajos-diarios',
    selector: '[data-tour="filtro-fecha"]',
    title: 'Fecha',
    description: 'Filtra el día de trabajo.'
  },
  {
    route: '/app/panel-mensual',
    selector: '[data-tour="panel-mensual-filtros"]',
    title: 'Filtros',
    description: 'Selecciona rango y estado.'
  },
  {
    route: '/app/panel-mensual',
    selector: '[data-tour="panel-mensual-resumen"]',
    title: 'Resumen',
    description: 'Vista consolidada del mes.'
  },
  {
    route: '/app/panel-mensual',
    selector: '[data-tour="panel-mensual-tabla"]',
    title: 'Tabla',
    description: 'Detalle de trabajos mensuales.'
  },
  {
    route: '/app/trabajadores',
    selector: '[data-tour="trabajadores-crear"]',
    title: 'Trabajadores',
    description: 'Agrega nuevos trabajadores.'
  },
  {
    route: '/app/trabajadores',
    selector: '[data-tour="trabajadores-lista"]',
    title: 'Listado',
    description: 'Gestiona tus trabajadores.'
  },
  {
    route: '/app/grupos',
    selector: '[data-tour="grupos-crear"]',
    title: 'Grupos',
    description: 'Crea y organiza equipos.'
  },
  {
    route: '/app/grupos',
    selector: '[data-tour="grupos-miembros"]',
    title: 'Miembros',
    description: 'Gestiona miembros del grupo.',
    timeoutMs: 1200
  },
  {
    route: '/app/grupos',
    selector: '[data-tour="grupos-invitar"]',
    title: 'Invitar',
    description: 'Invita usuarios al grupo.',
    timeoutMs: 1200
  },
  {
    route: '/app/admin',
    selector: '[data-tour="admin-usuarios"]',
    title: 'Usuarios',
    description: 'Administra usuarios del sistema.',
    requiresAdmin: true
  },
  {
    route: '/app/admin',
    selector: '[data-tour="admin-roles"]',
    title: 'Roles',
    description: 'Define permisos por rol.',
    requiresAdmin: true
  },
  {
    route: '/app/tutorial',
    selector: '[data-tour="tutorial-hub"]',
    title: 'Guía',
    description: 'Repasa los pasos desde aquí.'
  },
  {
    route: '/app/tutorial',
    selector: '[data-tour="tutorial-replay"]',
    title: 'Repetir',
    description: 'Vuelve a ejecutar la guía cuando quieras.'
  }
];

const basePlanEn = [
  {
    route: '/app/trabajos-diarios',
    selector: '[data-tour="nuevo-trabajo"]',
    title: 'New job',
    description: 'Create your first job from here.'
  },
  {
    route: '/app/trabajos-diarios',
    selector: '[data-tour="tabla-trabajos"]',
    title: 'Table',
    description: 'Review the jobs you logged.'
  },
  {
    route: '/app/trabajos-diarios',
    selector: '[data-tour="metricas"]',
    title: 'Metrics',
    description: 'Quick summary of hours and costs.'
  },
  {
    route: '/app/trabajos-diarios',
    selector: '[data-tour="filtro-fecha"]',
    title: 'Date',
    description: 'Filter the work day.'
  },
  {
    route: '/app/panel-mensual',
    selector: '[data-tour="panel-mensual-filtros"]',
    title: 'Filters',
    description: 'Select range and status.'
  },
  {
    route: '/app/panel-mensual',
    selector: '[data-tour="panel-mensual-resumen"]',
    title: 'Summary',
    description: 'Monthly consolidated view.'
  },
  {
    route: '/app/panel-mensual',
    selector: '[data-tour="panel-mensual-tabla"]',
    title: 'Table',
    description: 'Monthly job details.'
  },
  {
    route: '/app/trabajadores',
    selector: '[data-tour="trabajadores-crear"]',
    title: 'Workers',
    description: 'Add new workers.'
  },
  {
    route: '/app/trabajadores',
    selector: '[data-tour="trabajadores-lista"]',
    title: 'List',
    description: 'Manage your workers.'
  },
  {
    route: '/app/grupos',
    selector: '[data-tour="grupos-crear"]',
    title: 'Groups',
    description: 'Create and organize teams.'
  },
  {
    route: '/app/grupos',
    selector: '[data-tour="grupos-miembros"]',
    title: 'Members',
    description: 'Manage group members.',
    timeoutMs: 1200
  },
  {
    route: '/app/grupos',
    selector: '[data-tour="grupos-invitar"]',
    title: 'Invite',
    description: 'Invite users to the group.',
    timeoutMs: 1200
  },
  {
    route: '/app/admin',
    selector: '[data-tour="admin-usuarios"]',
    title: 'Users',
    description: 'Manage system users.',
    requiresAdmin: true
  },
  {
    route: '/app/admin',
    selector: '[data-tour="admin-roles"]',
    title: 'Roles',
    description: 'Define permissions per role.',
    requiresAdmin: true
  },
  {
    route: '/app/tutorial',
    selector: '[data-tour="tutorial-hub"]',
    title: 'Guide',
    description: 'Review the steps from here.'
  },
  {
    route: '/app/tutorial',
    selector: '[data-tour="tutorial-replay"]',
    title: 'Replay',
    description: 'Run the guide again anytime.'
  }
];

const planByLang = {
  es: basePlanEs,
  en: basePlanEn
};

export const getPlanByRole = (role, language = 'es') => {
  const plan = planByLang[language] || planByLang.es;
  if (role === 'admin') return plan;
  return plan.filter((step) => !step.requiresAdmin);
};
