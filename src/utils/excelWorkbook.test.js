import { describe, expect, it } from 'vitest';
import { normalizeExcelFileName, safeExcelCell } from './excelWorkbook';

describe('excelWorkbook helpers', () => {
  it('neutraliza strings cuyo primer caracter significativo puede iniciar formula', () => {
    expect(safeExcelCell('=1+1')).toBe("'=1+1");
    expect(safeExcelCell(' +1')).toBe("' +1");
    expect(safeExcelCell('\t-10')).toBe("'\t-10");
    expect(safeExcelCell('@cmd')).toBe("'@cmd");
  });

  it('no altera datos seguros ni valores no string', () => {
    const date = new Date('2026-07-10T00:00:00');

    expect(safeExcelCell('Trabajo seguro')).toBe('Trabajo seguro');
    expect(safeExcelCell('ABC123')).toBe('ABC123');
    expect(safeExcelCell(123)).toBe(123);
    expect(safeExcelCell(true)).toBe(true);
    expect(safeExcelCell(null)).toBeNull();
    expect(safeExcelCell(undefined)).toBeUndefined();
    expect(safeExcelCell(date)).toBe(date);
  });

  it('normaliza nombres de archivo a xlsx', () => {
    expect(normalizeExcelFileName('trabajos.xls')).toBe('trabajos.xlsx');
    expect(normalizeExcelFileName('historial.xlsx')).toBe('historial.xlsx');
    expect(normalizeExcelFileName('exportacion')).toBe('exportacion.xlsx');
  });
});
