import { describe, expect, it } from 'vitest';
import {
  buildEquipmentHistory,
  buildEquipmentTargetFromSelection,
  normalizeEquipmentItems,
} from './equipmentLog.helpers';

describe('normalizeEquipmentItems', () => {
  it('normaliza vehiculos y equipos de planta al formato comun', () => {
    const result = normalizeEquipmentItems({
      vehicles: [{
        id: 'v1',
        license_plate: 'AA123BB',
        name: 'Utilitario 1',
        status: 'activo',
        assigned_driver_profile: { name: 'Fabio' },
      }],
      plantAssets: [{
        id: 'p1',
        name: 'Camara 1',
        location_description: 'Area fria',
        status: 'mantenimiento',
        responsible_user: { full_name: 'Daniel' },
      }],
    });

    expect(result).toEqual([
      {
        id: 'v1',
        type: 'vehicle',
        key: 'vehicle:v1',
        name: 'Utilitario 1',
        identifier: 'AA123BB',
        status: 'activo',
        responsible: 'Fabio',
      },
      {
        id: 'p1',
        type: 'plant_asset',
        key: 'plant_asset:p1',
        name: 'Camara 1',
        identifier: 'Area fria',
        status: 'mantenimiento',
        responsible: 'Daniel',
      },
    ]);
  });
});

describe('buildEquipmentHistory', () => {
  it('asocia eventos por vehicle_id y ordena cronologicamente descendente', () => {
    const history = buildEquipmentHistory({
      equipment: { id: 'v1', type: 'vehicle' },
      fuelLoads: [
        { id: 'fuel-old', vehicle_id: 'v1', load_date: '2026-07-01', estimated_time: '08:00', liters: 20, mileage: 1000 },
        { id: 'fuel-other', vehicle_id: 'v2', load_date: '2026-07-13', estimated_time: '08:00', liters: 30, mileage: 2000 },
      ],
      maintenanceLogs: [
        { id: 'mnt-new', vehicle_id: 'v1', maintenance_date: '2026-07-10', detail: 'Cambio de aceite' },
      ],
      dailyOperations: [
        { id: 'op-mid', vehicle_id: 'v1', operation_date: '2026-07-05', shift: 'Manana', usage_time: '4 h', operator_name: 'Diego' },
      ],
    });

    expect(history.map((event) => event.id)).toEqual([
      'vehicle-maintenance:mnt-new',
      'operation:op-mid',
      'fuel:fuel-old',
    ]);
  });

  it('asocia eventos de planta por plant_asset_id y excluye otros equipos', () => {
    const history = buildEquipmentHistory({
      equipment: { id: 'p1', type: 'plant_asset' },
      fuelLoads: [
        { id: 'fuel-vehicle', vehicle_id: 'p1', load_date: '2026-07-14', estimated_time: '09:00' },
      ],
      dailyOperations: [
        { id: 'op-plant', plant_asset_id: 'p1', operation_date: '2026-07-09', shift: 'Tarde', usage_time: '2 h', operator_name: 'Ismael' },
        { id: 'op-other', plant_asset_id: 'p2', operation_date: '2026-07-12', shift: 'Noche', usage_time: '3 h', operator_name: 'Daniel' },
      ],
      incidents: [
        { id: 'inc-plant', plant_asset_id: 'p1', incident_date: '2026-07-11', incident_time: '10:30', anomaly_description: 'Falla menor' },
      ],
      maintenanceChecks: [
        { id: 'chk-plant', plant_asset_id: 'p1', review_date: '2026-07-10', inspection_type: 'preventiva', reviewed_component: 'Motor' },
      ],
    });

    expect(history.map((event) => event.id)).toEqual([
      'incident:inc-plant',
      'check:chk-plant',
      'operation:op-plant',
    ]);
  });

  it('mantiene compatibilidad con registros antiguos vinculados solo por equipment_name', () => {
    const history = buildEquipmentHistory({
      equipment: { id: 'p1', type: 'plant_asset', name: 'Camara 1', identifier: 'Area fria' },
      dailyOperations: [
        { id: 'legacy-op', equipment_name: 'Camara 1', operation_date: '2026-07-08', shift: 'Manana', usage_time: '1 h', operator_name: 'Fabio' },
        { id: 'other-legacy', equipment_name: 'Otro equipo', operation_date: '2026-07-09', shift: 'Tarde', usage_time: '2 h', operator_name: 'Diego' },
      ],
    });

    expect(history.map((event) => event.id)).toEqual(['operation:legacy-op']);
  });
});

describe('buildEquipmentTargetFromSelection', () => {
  const vehicles = [{ id: 'v1', license_plate: 'AA123BB', name: 'Utilitario 1' }];
  const plantAssets = [{ id: 'p1', name: 'Camara 1', location_description: 'Area fria' }];

  it('genera vehicle_id y snapshot para vehiculos', () => {
    expect(buildEquipmentTargetFromSelection('vehicle:v1', { vehicles, plantAssets })).toEqual({
      target_type: 'vehicle',
      target_id: 'v1',
      vehicle_id: 'v1',
      plant_asset_id: null,
      equipment_name: 'AA123BB - Utilitario 1',
    });
  });

  it('genera plant_asset_id y snapshot para equipos de planta', () => {
    expect(buildEquipmentTargetFromSelection('plant_asset:p1', { vehicles, plantAssets })).toEqual({
      target_type: 'plant_asset',
      target_id: 'p1',
      vehicle_id: null,
      plant_asset_id: 'p1',
      equipment_name: 'Camara 1 - Area fria',
    });
  });

  it('nunca envia ambos FK al mismo tiempo', () => {
    const vehicleTarget = buildEquipmentTargetFromSelection('vehicle:v1', { vehicles, plantAssets });
    const plantTarget = buildEquipmentTargetFromSelection('plant_asset:p1', { vehicles, plantAssets });

    expect(Boolean(vehicleTarget.vehicle_id && vehicleTarget.plant_asset_id)).toBe(false);
    expect(Boolean(plantTarget.vehicle_id && plantTarget.plant_asset_id)).toBe(false);
  });
});
