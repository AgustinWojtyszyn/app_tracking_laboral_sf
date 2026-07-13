import { describe, expect, it, vi } from 'vitest';
import { isMissingEquipmentLogTableError } from './equipmentLog.service';

const buildEquipmentLogService = async (supabase) => {
  vi.resetModules();
  vi.doMock('@/lib/customSupabaseClient', () => ({
    supabase,
    customSupabaseClient: supabase,
    default: supabase,
  }));

  return import('./equipmentLog.service');
};

describe('isMissingEquipmentLogTableError', () => {
  it('reconoce el 404 de PostgREST cuando una tabla no esta disponible', () => {
    expect(isMissingEquipmentLogTableError({ code: 'PGRST205' })).toBe(true);
    expect(isMissingEquipmentLogTableError({ status: 404 })).toBe(true);
  });

  it('reconoce errores de schema cache de PostgREST', () => {
    expect(isMissingEquipmentLogTableError({ message: "Could not find the table 'public.vehicles' in the schema cache" })).toBe(true);
  });

  it('no confunde errores de permisos o validacion con listado vacio', () => {
    expect(isMissingEquipmentLogTableError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isMissingEquipmentLogTableError({ code: '23505', message: 'duplicate key value' })).toBe(false);
  });
});

describe('equipmentLogService plant assets', () => {
  it('oculta elementos de planta archivados del listado normal', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const is = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ is }));
    const from = vi.fn(() => ({ select }));
    const { equipmentLogService } = await buildEquipmentLogService({ from });

    const result = await equipmentLogService.getPlantAssets();

    expect(result.success).toBe(true);
    expect(from).toHaveBeenCalledWith('plant_assets');
    expect(is).toHaveBeenCalledWith('archived_at', null);
  });

  it('archiva elementos de planta sin borrar registros asociados por cascada', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const deleteFn = vi.fn();
    const from = vi.fn(() => ({ update, delete: deleteFn }));
    const { equipmentLogService } = await buildEquipmentLogService({ from });

    const result = await equipmentLogService.deletePlantAsset('asset-1');

    expect(result.success).toBe(true);
    expect(from).toHaveBeenCalledWith('plant_assets');
    expect(update).toHaveBeenCalledWith({
      status: 'inactivo',
      archived_at: expect.any(String),
    });
    expect(eq).toHaveBeenCalledWith('id', 'asset-1');
    expect(deleteFn).not.toHaveBeenCalled();
  });
});
