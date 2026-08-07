import { describe, expect, it } from 'vitest';
import {
  applyMonthlyPanelFilters,
  buildMonthlyLocationOptions,
  buildMonthlyPeriodSummary,
  createLatestRequestGuard,
  filterMonthlyJobsByRequester,
  filterMonthlyJobsBySearch,
  getMonthlyUnknownLocations,
  getPreviousDateRange,
  paginateMonthlyJobs,
  shouldApplyMonthlyJobsResult
} from './monthlyPanel.helpers';

const jobs = [
  { id: '1', title: 'Cambio de filtro', description: 'Preventivo mensual', location: 'Planta Norte', requested_by: 'Juan Perez', date: '2026-07-03', status: 'pending' },
  { id: '2', title: 'Inspeccion', description: 'Reparacion urgente', location: 'Deposito Sur', requested_by: 'Maria Garcia', date: '2026-07-02', status: 'completed' },
  { id: '3', title: 'Revision general', description: 'Control electrico', location: 'Oficina Centro', requested_by: 'Carlos Lopez', date: '2026-07-01', status: 'archived' },
];

describe('filterMonthlyJobsBySearch', () => {
  it('busca por titulo', () => {
    expect(filterMonthlyJobsBySearch(jobs, 'cambio')).toEqual([jobs[0]]);
  });

  it('busca por descripcion', () => {
    expect(filterMonthlyJobsBySearch(jobs, 'urgente')).toEqual([jobs[1]]);
  });

  it('busca por ubicacion', () => {
    expect(filterMonthlyJobsBySearch(jobs, 'centro')).toEqual([jobs[2]]);
  });

  it('busca por solicitante', () => {
    expect(filterMonthlyJobsBySearch(jobs, 'maria')).toEqual([jobs[1]]);
  });

  it('limpia busqueda y devuelve todos los registros', () => {
    expect(filterMonthlyJobsBySearch(jobs, '')).toEqual(jobs);
  });

  it('cambiar solo el texto de busqueda cambia el resultado local', () => {
    expect(filterMonthlyJobsBySearch(jobs, 'planta')).toEqual([jobs[0]]);
    expect(filterMonthlyJobsBySearch(jobs, 'deposito')).toEqual([jobs[1]]);
  });
});

describe('filterMonthlyJobsByRequester', () => {
  it('filtra por inicial del nombre sin distinguir mayusculas ni tildes', () => {
    expect(filterMonthlyJobsByRequester(jobs, 'm')).toEqual([jobs[1]]);
    expect(filterMonthlyJobsByRequester(jobs, 'JUAN')).toEqual([jobs[0]]);
  });

  it('no busca por texto interno ni apellido', () => {
    expect(filterMonthlyJobsByRequester(jobs, 'garcia')).toEqual([]);
    expect(filterMonthlyJobsByRequester(jobs, 'arlos')).toEqual([]);
  });
});

describe('monthly location options', () => {
  it('carga el catalogo y agrega lugares reales no catalogados al final sin duplicados por mayusculas', () => {
    const options = buildMonthlyLocationOptions([
      { location: 'servifood' },
      { location: 'Zona Nueva' },
      { location: '  zona   nueva  ' },
      { location: 'Álamo Central' },
    ]);

    expect(options).toContain('ServiFood');
    expect(options.slice(-2)).toEqual(['Álamo Central', 'Zona Nueva']);
  });

  it('informa lugares reales fuera del catalogo', () => {
    expect(getMonthlyUnknownLocations([{ location: 'ServiFood' }, { location: 'Zona Nueva' }])).toEqual(['Zona Nueva']);
  });
});

describe('applyMonthlyPanelFilters', () => {
  const normalizeStatus = (job) => job.status;
  const baseFilters = {
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    search: '',
    status: 'all',
    groupId: 'all',
    workerId: 'all',
    requestedBy: '',
    location: 'all',
  };

  it('aplica fecha, busqueda, estado, grupo, trabajador y lugar antes de paginar', () => {
    const data = [
      { id: '1', title: 'Hospital uno', date: '2026-07-10', status: 'completed', group_id: 'g1', worker_id: 'w1', location: 'Hospital Sarmiento' },
      { id: '2', title: 'Hospital dos', date: '2026-07-11', status: 'completed', group_id: 'g1', worker_id: 'w2', location: 'Hospital Pocito' },
      { id: '3', title: 'Fuera', date: '2026-08-01', status: 'completed', group_id: 'g1', worker_id: 'w1', location: 'Hospital Sarmiento' },
    ];

    expect(applyMonthlyPanelFilters(data, {
      ...baseFilters,
      search: 'hospital',
      status: 'completed',
      groupId: 'g1',
      workerId: 'w1',
      requestedBy: '',
      location: 'hospital sarmiento',
    }, normalizeStatus).map((job) => job.id)).toEqual(['1']);
  });

  it('aplica filtro de solicitante junto con el resto', () => {
    const data = [
      { id: '1', title: 'Control', date: '2026-07-10', status: 'pending', requested_by: 'Juan Perez' },
      { id: '2', title: 'Control', date: '2026-07-11', status: 'pending', requested_by: 'Maria Garcia' },
    ];

    expect(applyMonthlyPanelFilters(data, {
      ...baseFilters,
      requestedBy: 'm',
    }, normalizeStatus).map((job) => job.id)).toEqual(['2']);
  });

  it('busca lugar sin distinguir mayusculas ni tildes', () => {
    const data = [
      { id: '1', title: 'Control', date: '2026-07-10', status: 'pending', location: 'Hospital mental (Zonda)' },
      { id: '2', title: 'Control', date: '2026-07-11', status: 'pending', location: 'Cerámica San Lorenzo' },
    ];

    expect(applyMonthlyPanelFilters(data, { ...baseFilters, search: 'HOSPITAL' }, normalizeStatus).map((job) => job.id)).toEqual(['1']);
    expect(applyMonthlyPanelFilters(data, { ...baseFilters, search: 'ceramica' }, normalizeStatus).map((job) => job.id)).toEqual(['2']);
  });

  it('ordena por fecha descendente antes de calcular pagina', () => {
    expect(applyMonthlyPanelFilters(jobs, baseFilters, normalizeStatus).map((job) => job.id)).toEqual(['1', '2', '3']);
  });
});

describe('getPreviousDateRange', () => {
  it('calcula un período anterior inclusivo con la misma cantidad de días', () => {
    expect(getPreviousDateRange('2026-07-01', '2026-07-31')).toEqual({ startDate: '2026-05-31', endDate: '2026-06-30' });
    expect(getPreviousDateRange('2026-07-15', '2026-07-21')).toEqual({ startDate: '2026-07-08', endDate: '2026-07-14' });
  });
});

describe('buildMonthlyPeriodSummary', () => {
  const normalizeStatus = (job) => job.status;

  it('cuenta total, pendientes, completados y cumplimiento con datos normales', () => {
    const currentJobs = [
      { id: '1', status: 'pending', worker_id: 'w1', location: 'Hospital Sarmiento', amount_to_charge: 100, cost_spent: 60 },
      { id: '2', status: 'completed', worker_id: 'w1', location: 'Hospital Pocito', amount_to_charge: 120, cost_spent: 70 },
      { id: '3', status: 'completed', worker_id: 'w2', location: 'Hospital Sarmiento', amount_to_charge: 80, cost_spent: 40 },
      { id: '4', status: 'archived', worker_id: 'w3', location: 'Hospital Barreal', amount_to_charge: 40, cost_spent: 20 },
    ];
    const previousJobs = [
      { id: 'a', status: 'pending', worker_id: 'w1', location: 'Hospital Sarmiento', amount_to_charge: 90, cost_spent: 50 },
      { id: 'b', status: 'pending', worker_id: 'w2', location: 'Hospital Pocito', amount_to_charge: 60, cost_spent: 30 },
      { id: 'c', status: 'completed', worker_id: 'w2', location: 'Hospital Sarmiento', amount_to_charge: 70, cost_spent: 20 },
    ];

    const summary = buildMonthlyPeriodSummary({ currentJobs, previousJobs, normalizeStatus });

    expect(summary.current.total).toBe(4);
    expect(summary.current.pending).toBe(1);
    expect(summary.current.completed).toBe(2);
    expect(summary.current.activeCount).toBe(3);
    expect(summary.current.completionRate).toBe(66.66666666666666);
    expect(summary.current.workers).toBe(3);
    expect(summary.current.locations).toBe(3);
    expect(summary.current.amountToCharge).toBe(300);
    expect(summary.current.workerCost).toBe(170);
    expect(summary.current.difference).toBe(130);
    expect(summary.current.balance).toBe(130);
    expect(summary.current.pendingDelta).toBe(1);
    expect(summary.current.completedDelta).toBe(1);
    expect(summary.current.complianceDelta).toBe(33.33333333333333);
    expect(summary.current.workersDelta).toBe(1);
    expect(summary.current.locationsDelta).toBe(1);
    expect(summary.current.balanceDelta).toBe(10);
  });

  it('cuenta trabajadores asignados únicos y omite creadores, además de lugares no vacíos', () => {
    const summary = buildMonthlyPeriodSummary({
      currentJobs: [
        { id: '1', status: 'pending', worker_id: 'w1', location: 'Hospital Sarmiento', amount_to_charge: 100, cost_spent: 80 },
        { id: '2', status: 'pending', location: '', amount_to_charge: 50, cost_spent: 20 },
        { id: '3', status: 'completed', worker_id: 'w2', location: '  ', amount_to_charge: 40, cost_spent: 10 },
        { id: '4', status: 'completed', worker_id: 'w2', location: 'Hospital Pocito', amount_to_charge: 60, cost_spent: 30, creator: { id: 'creator-1' } },
      ],
      previousJobs: [],
      normalizeStatus,
    });

    expect(summary.current.workers).toBe(2);
    expect(summary.current.locations).toBe(2);
    expect(summary.current.amountToCharge).toBe(250);
    expect(summary.current.workerCost).toBe(140);
    expect(summary.current.difference).toBe(110);
  });

  it('devuelve cumplimiento en cero cuando no hay trabajos activos', () => {
    const summary = buildMonthlyPeriodSummary({ currentJobs: [{ id: '1', status: 'archived' }], previousJobs: [], normalizeStatus });

    expect(summary.current.completionRate).toBe(0);
    expect(summary.current.complianceDelta).toBe(0);
  });

  it('excluye archivados del cumplimiento y del denominador', () => {
    const summary = buildMonthlyPeriodSummary({
      currentJobs: [{ id: '1', status: 'archived' }, { id: '2', status: 'pending' }, { id: '3', status: 'completed' }],
      previousJobs: [{ id: 'a', status: 'archived' }, { id: 'b', status: 'pending' }, { id: 'c', status: 'completed' }],
      normalizeStatus,
    });

    expect(summary.current.completionRate).toBe(50);
    expect(summary.current.completed).toBe(1);
    expect(summary.current.pending).toBe(1);
  });

  it('genera una conclusión operativa clara para los escenarios principales', () => {
    expect(buildMonthlyPeriodSummary({ currentJobs: [{ status: 'pending' }, { status: 'pending' }], previousJobs: [{ status: 'completed' }], normalizeStatus }).conclusion).toContain('Atención');
    expect(buildMonthlyPeriodSummary({ currentJobs: [{ status: 'pending' }], previousJobs: [{ status: 'pending' }, { status: 'pending' }], normalizeStatus }).conclusion).toContain('Evolución positiva');
    expect(buildMonthlyPeriodSummary({ currentJobs: [{ status: 'completed' }], previousJobs: [{ status: 'pending' }], normalizeStatus }).conclusion).toContain('cumplimiento mejoró');
    expect(buildMonthlyPeriodSummary({ currentJobs: [{ status: 'pending' }], previousJobs: [{ status: 'completed' }], normalizeStatus }).conclusion).toContain('cumplimiento');
    expect(buildMonthlyPeriodSummary({ currentJobs: [], previousJobs: [], normalizeStatus }).conclusion).toContain('No hay trabajos suficientes');
  });
});

describe('paginateMonthlyJobs', () => {
  const manyJobs = Array.from({ length: 64 }, (_, index) => ({ id: String(index + 1) }));

  it('pagina 5, 10, 30 y 50 registros', () => {
    expect(paginateMonthlyJobs(manyJobs, 1, 5).records).toHaveLength(5);
    expect(paginateMonthlyJobs(manyJobs, 1, 10).records).toHaveLength(10);
    expect(paginateMonthlyJobs(manyJobs, 1, 30).records).toHaveLength(30);
    expect(paginateMonthlyJobs(manyJobs, 1, 50).records).toHaveLength(50);
  });

  it('cambia correctamente entre paginas y reporta rango visible', () => {
    const page = paginateMonthlyJobs(manyJobs, 2, 10);

    expect(page.records[0].id).toBe('11');
    expect(page.startIndex).toBe(10);
    expect(page.endIndex).toBe(20);
    expect(page.totalPages).toBe(7);
  });

  it('evita quedar en pagina inexistente si baja la cantidad de registros', () => {
    const page = paginateMonthlyJobs(manyJobs.slice(0, 12), 7, 10);

    expect(page.currentPage).toBe(2);
    expect(page.records.map((job) => job.id)).toEqual(['11', '12']);
  });
});

describe('createLatestRequestGuard', () => {
  it('evita que una respuesta vieja sobrescriba una busqueda mas reciente', () => {
    const guard = createLatestRequestGuard();
    const firstRequest = guard.next();
    const secondRequest = guard.next();

    expect(guard.isLatest(secondRequest)).toBe(true);
    expect(guard.isLatest(firstRequest)).toBe(false);
  });
});

describe('shouldApplyMonthlyJobsResult', () => {
  it('no aplica resultados si se navega fuera mientras carga MonthlyPanel', () => {
    expect(shouldApplyMonthlyJobsResult({ isMounted: false, isLatest: true })).toBe(false);
  });

  it('no permite que una respuesta vieja reemplace una busqueda mas reciente', () => {
    expect(shouldApplyMonthlyJobsResult({ isMounted: true, isLatest: false })).toBe(false);
  });

  it('aplica resultados solo si el panel sigue montado y la respuesta es la ultima', () => {
    expect(shouldApplyMonthlyJobsResult({ isMounted: true, isLatest: true })).toBe(true);
  });
});
