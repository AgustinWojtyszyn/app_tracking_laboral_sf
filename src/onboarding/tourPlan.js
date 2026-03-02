const basePlan = [
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
    description: 'Gestiona miembros del grupo.'
  },
  {
    route: '/app/grupos',
    selector: '[data-tour="grupos-invitar"]',
    title: 'Invitar',
    description: 'Invita usuarios al grupo.'
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

export const getPlanByRole = (role) => {
  if (role === 'admin') return basePlan;
  return basePlan.filter((step) => !step.requiresAdmin);
};
