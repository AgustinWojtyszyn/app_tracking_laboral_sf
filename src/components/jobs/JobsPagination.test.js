import { describe, expect, it } from 'vitest';
import { getJobsPaginationRange } from './JobsPagination';

describe('getJobsPaginationRange', () => {
  it('devuelve 0-0 cuando no hay resultados', () => {
    expect(getJobsPaginationRange({ currentPage: 1, pageSize: 10, totalCount: 0 })).toEqual({
      from: 0,
      to: 0,
    });
  });

  it('calcula la primera pagina', () => {
    expect(getJobsPaginationRange({ currentPage: 1, pageSize: 10, totalCount: 42 })).toEqual({
      from: 1,
      to: 10,
    });
  });

  it('calcula la ultima pagina incompleta', () => {
    expect(getJobsPaginationRange({ currentPage: 5, pageSize: 10, totalCount: 42 })).toEqual({
      from: 41,
      to: 42,
    });
  });
});
