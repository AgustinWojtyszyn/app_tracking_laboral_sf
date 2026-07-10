import { describe, expect, it } from 'vitest';
import {
  applyMonthlyPanelFilters,
  buildMonthlyLocationOptions,
  createLatestRequestGuard,
  filterMonthlyJobsBySearch,
  getMonthlyUnknownLocations,
  paginateMonthlyJobs,
  shouldApplyMonthlyJobsResult
} from './monthlyPanel.helpers';

const jobs = [
  { id: '1', title: 'Cambio de filtro', description: 'Preventivo mensual', location: 'Planta Norte', date: '2026-07-03', status: 'pending' },
  { id: '2', title: 'Inspeccion', description: 'Reparacion urgente', location: 'Deposito Sur', date: '2026-07-02', status: 'completed' },
  { id: '3', title: 'Revision general', description: 'Control electrico', location: 'Oficina Centro', date: '2026-07-01', status: 'archived' },
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

  it('limpia busqueda y devuelve todos los registros', () => {
    expect(filterMonthlyJobsBySearch(jobs, '')).toEqual(jobs);
  });

  it('cambiar solo el texto de busqueda cambia el resultado local', () => {
    expect(filterMonthlyJobsBySearch(jobs, 'planta')).toEqual([jobs[0]]);
    expect(filterMonthlyJobsBySearch(jobs, 'deposito')).toEqual([jobs[1]]);
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
      location: 'hospital sarmiento',
    }, normalizeStatus).map((job) => job.id)).toEqual(['1']);
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

describe('paginateMonthlyJobs', () => {
  const manyJobs = Array.from({ length: 64 }, (_, index) => ({ id: String(index + 1) }));

  it('pagina 10, 30 y 50 registros', () => {
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
