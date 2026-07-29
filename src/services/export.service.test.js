import { beforeEach, describe, expect, it, vi } from 'vitest';

const click = vi.fn();
const appendChild = vi.fn();
const createObjectURL = vi.fn(() => 'blob:excel');
const revokeObjectURL = vi.fn();

beforeEach(() => {
  click.mockClear();
  appendChild.mockClear();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();

  vi.stubGlobal('document', {
    body: { appendChild },
    createElement: vi.fn(() => ({
      click,
      remove: vi.fn(),
      set href(value) { this._href = value; },
      get href() { return this._href; },
      set download(value) { this._download = value; },
      get download() { return this._download; },
      set rel(value) { this._rel = value; },
      get rel() { return this._rel; },
    })),
  });
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
});

const rowValues = (worksheet, rowNumber) => worksheet.getRow(rowNumber).values.slice(1);

describe('exportService ExcelJS exports', () => {
  it('crea el libro de registro de equipo con hojas, encabezados, filas y anchos esperados', async () => {
    const { exportService } = await import('./export.service');

    const result = await exportService.exportEquipmentLogToExcel({
      dailyOperations: [{
        id: 'op1',
        operation_date: '2026-07-10',
        equipment_name: 'Camara 1',
        plant_asset_id: 'p1',
        operator_name: 'Fabio',
        shift: 'Manana',
        usage_time: '2 h',
        observations: 'Uso normal',
      }],
      incidents: [{
        id: 'inc1',
        incident_date: '2026-07-11',
        incident_time: '10:30',
        equipment_name: 'AA123BB - Utilitario',
        vehicle_id: 'v1',
        maintenance_done_by: 'Diego',
        anomaly_description: 'Falla menor',
        corrective_action: 'Ajuste',
        downtime: '30 min',
      }],
      maintenanceChecks: [{
        id: 'chk1',
        review_date: '2026-07-12',
        equipment_name: 'Camara 1',
        plant_asset_id: 'p1',
        inspection_type: 'preventiva',
        reviewed_component: 'Motor',
        general_status_observations: 'Correcto',
        next_review_date: '2026-08-12',
      }],
    });

    expect(result.filename).toBe('libro_registro_equipo.xlsx');
    expect(click).toHaveBeenCalledTimes(1);
    expect(result.workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Resumen',
      'Vehículos',
      'Combustible',
      'Recorridos',
      'Mantenimiento',
      'Avisos mantenimiento',
      'Vencimientos',
      'Planta',
      'Operaciones',
      'Incidencias',
      'Revisiones',
    ]);

    const operations = result.workbook.getWorksheet('Operaciones');
    expect(rowValues(operations, 1)).toEqual([
      'Clasificación',
      'Fecha',
      'Equipo',
      'Tipo de equipo',
      'Operador',
      'Turno',
      'Tiempo de uso',
      'Observaciones',
    ]);
    expect(rowValues(operations, 2)).toEqual([
      'Operación diaria',
      '10/07/2026',
      'Camara 1',
      'Planta',
      'Fabio',
      'Manana',
      '2 h',
      'Uso normal',
    ]);
    expect(operations.getColumn(3).width).toBe(34);

    const incidents = result.workbook.getWorksheet('Incidencias');
    expect(rowValues(incidents, 2)).toEqual(expect.arrayContaining([
      'Incidencia',
      'AA123BB - Utilitario',
      'Diego',
      'Falla menor',
    ]));

    const checks = result.workbook.getWorksheet('Revisiones');
    expect(rowValues(checks, 2)).toEqual(expect.arrayContaining([
      'Revisión / calibración',
      'Camara 1',
      'preventiva',
      'Motor',
      '12/08/2026',
    ]));
  });

  it('preserva filtros recibidos antes de exportar trabajos y normaliza extension a xlsx', async () => {
    const { exportService } = await import('./export.service');
    const filteredJobs = [
      {
        id: 'job-1',
        date: '2026-07-10',
        location: 'ServiFood',
        title: 'Campana',
        action_type: 'Mantenimiento',
        sector_type: 'Cocina',
        description: 'Solo registro filtrado',
        groups: { name: 'Grupo A' },
        workers: { display_name: 'Ana' },
        status: 'completed',
      },
    ];

    const result = await exportService.exportRecordsToExcel(filteredJobs, 'trabajos-filtrados.xls', 'Completados');
    const worksheet = result.workbook.getWorksheet('Completados');

    expect(result.filename).toBe('trabajos-filtrados.xlsx');
    expect(result.workbook.worksheets).toHaveLength(1);
    expect(rowValues(worksheet, 1)).toEqual([
      'Fecha',
      'Ubicación',
      'Título',
      'Tipo de acción',
      'Sector / equipo',
      'Descripción',
      'Grupo',
      'Trabajador',
      'Estado',
    ]);
    expect(worksheet.rowCount).toBe(2);
    expect(rowValues(worksheet, 2)).toEqual([
      '10/07/2026',
      'ServiFood',
      'Campana',
      'Mantenimiento',
      'Cocina',
      'Solo registro filtrado',
      'Grupo A',
      'Ana',
      'Completado',
    ]);
  });

  it('mantiene filas especiales de totales en exportacion diaria', async () => {
    const { exportService } = await import('./export.service');

    const result = await exportService.exportDayToExcel('2026-07-10', [{
      date: '2026-07-10',
      location: 'Clorox',
      title: 'Trabajo',
      status: 'pending',
    }]);
    const worksheet = result.workbook.getWorksheet('Trabajos');

    expect(result.filename).toBe('trabajos_2026-07-10.xlsx');
    expect(worksheet.rowCount).toBe(4);
    expect(rowValues(worksheet, 4)[0]).toBe('TOTAL GENERAL');
  });

  it('neutraliza formulas maliciosas sin alterar valores seguros', async () => {
    const { exportService } = await import('./export.service');

    const result = await exportService.exportRecordsToExcel([{
      date: '2026-07-10',
      location: ' =HYPERLINK("http://malicious")',
      title: '+SUM(1,1)',
      action_type: '-10',
      sector_type: '@cmd',
      description: 'Texto seguro',
      groups: { name: 'Grupo A' },
      workers: { display_name: 'Ana' },
      status: 'pending',
    }], 'seguridad.xlsx');
    const values = rowValues(result.workbook.getWorksheet('Trabajos'), 2);

    expect(values[1]).toBe('\' =HYPERLINK("http://malicious")');
    expect(values[2]).toBe("'+SUM(1,1)");
    expect(values[3]).toBe("'-10");
    expect(values[4]).toBe("'@cmd");
    expect(values[5]).toBe('Texto seguro');
    expect(values[8]).toBe('Pendiente');
  });

  it('propaga errores de generacion para que la UI muestre un mensaje amigable', async () => {
    const { exportService } = await import('./export.service');
    const original = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => {
      throw new Error('blob failed');
    });

    await expect(exportService.exportRecordsToExcel([{ date: '2026-07-10', title: 'A' }]))
      .rejects
      .toThrow('blob failed');

    URL.createObjectURL = original;
  });
});
