import { describe, expect, it } from 'vitest';
import { runJobsOperation } from './useJobs';

describe('runJobsOperation', () => {
  it('mantiene el error devuelto por el servicio', async () => {
    const loadingStates = [];
    const errors = [];

    const result = await runJobsOperation({
      operation: async () => ({ success: false, error: 'Error normal' }),
      fallbackMessage: 'Fallback',
      isMounted: () => true,
      onLoading: (value) => loadingStates.push(value),
      onError: (value) => errors.push(value),
    });

    expect(result).toEqual({ success: false, error: 'Error normal' });
    expect(loadingStates).toEqual([true, false]);
    expect(errors).toEqual([null, 'Error normal']);
  });

  it('convierte excepciones inesperadas en resultado de error y apaga loading', async () => {
    const loadingStates = [];
    const errors = [];

    const result = await runJobsOperation({
      operation: async () => {
        throw new Error('Excepcion inesperada');
      },
      fallbackMessage: 'Fallback',
      isMounted: () => true,
      onLoading: (value) => loadingStates.push(value),
      onError: (value) => errors.push(value),
    });

    expect(result).toEqual({ success: false, error: 'Excepcion inesperada' });
    expect(loadingStates).toEqual([true, false]);
    expect(errors).toEqual([null, 'Excepcion inesperada']);
  });

  it('no actualiza estado despues de desmontar durante una operacion lenta', async () => {
    const loadingStates = [];
    const errors = [];
    let mounted = true;

    const result = await runJobsOperation({
      operation: async () => {
        mounted = false;
        return { success: true, data: [] };
      },
      fallbackMessage: 'Fallback',
      isMounted: () => mounted,
      onLoading: (value) => loadingStates.push(value),
      onError: (value) => errors.push(value),
    });

    expect(result).toEqual({ success: true, data: [] });
    expect(loadingStates).toEqual([true]);
    expect(errors).toEqual([null]);
  });
});
