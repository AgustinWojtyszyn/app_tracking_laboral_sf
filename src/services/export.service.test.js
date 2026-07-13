import { beforeEach, describe, expect, it, vi } from 'vitest';

const appendSheet = vi.fn();
const bookNew = vi.fn(() => ({ sheets: [] }));
const jsonToSheet = vi.fn((rows) => ({ rows }));
const writeFile = vi.fn();

vi.mock('xlsx', () => ({
  utils: {
    book_new: bookNew,
    json_to_sheet: jsonToSheet,
    book_append_sheet: appendSheet,
  },
  writeFile,
}));

describe('exportService.exportEquipmentLogToExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('incluye hojas de operaciones, incidencias y revisiones', async () => {
    const { exportService } = await import('./export.service');

    exportService.exportEquipmentLogToExcel({
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

    const sheetNames = appendSheet.mock.calls.map((call) => call[2]);
    expect(sheetNames).toContain('Operaciones');
    expect(sheetNames).toContain('Incidencias');
    expect(sheetNames).toContain('Revisiones');

    const exportedRows = jsonToSheet.mock.calls.map((call) => call[0]).flat();
    expect(exportedRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ Clasificación: 'Operación diaria', Equipo: 'Camara 1', Operador: 'Fabio' }),
      expect.objectContaining({ Clasificación: 'Incidencia', Equipo: 'AA123BB - Utilitario', 'Realizado por': 'Diego' }),
      expect.objectContaining({ Clasificación: 'Revisión / calibración', Equipo: 'Camara 1', Tipo: 'preventiva' }),
    ]));
    expect(writeFile).toHaveBeenCalledWith(expect.any(Object), 'libro_registro_equipo.xlsx');
  });
});
