import { describe, expect, it } from 'vitest';
import { shouldApplyJobFormLoadResult } from './useJobFormData';

describe('shouldApplyJobFormLoadResult', () => {
  it('descarta la carga de grupos si el formulario se cerro antes de resolver', () => {
    expect(shouldApplyJobFormLoadResult({
      isMounted: false,
      loadId: 1,
      currentLoadId: 1
    })).toBe(false);
  });

  it('descarta la carga de trabajadores si el formulario se cerro antes de resolver', () => {
    expect(shouldApplyJobFormLoadResult({
      isMounted: false,
      loadId: 2,
      currentLoadId: 2
    })).toBe(false);
  });

  it('descarta respuestas viejas cuando ya existe una carga mas reciente', () => {
    expect(shouldApplyJobFormLoadResult({
      isMounted: true,
      loadId: 1,
      currentLoadId: 2
    })).toBe(false);
  });

  it('permite actualizar estado solo si el formulario sigue montado y la carga es actual', () => {
    expect(shouldApplyJobFormLoadResult({
      isMounted: true,
      loadId: 3,
      currentLoadId: 3
    })).toBe(true);
  });
});
