import { describe, expect, it } from 'vitest';
import { isMissingEquipmentLogTableError } from './equipmentLog.service';

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
