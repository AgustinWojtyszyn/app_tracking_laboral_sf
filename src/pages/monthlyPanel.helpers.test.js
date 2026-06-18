import { describe, expect, it } from 'vitest';
import { createLatestRequestGuard, filterMonthlyJobsBySearch } from './monthlyPanel.helpers';

const jobs = [
  { id: '1', title: 'Cambio de filtro', description: 'Preventivo mensual', location: 'Planta Norte' },
  { id: '2', title: 'Inspeccion', description: 'Reparacion urgente', location: 'Deposito Sur' },
  { id: '3', title: 'Revision general', description: 'Control electrico', location: 'Oficina Centro' },
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

describe('createLatestRequestGuard', () => {
  it('evita que una respuesta vieja sobrescriba una busqueda mas reciente', () => {
    const guard = createLatestRequestGuard();
    const firstRequest = guard.next();
    const secondRequest = guard.next();

    expect(guard.isLatest(secondRequest)).toBe(true);
    expect(guard.isLatest(firstRequest)).toBe(false);
  });
});
