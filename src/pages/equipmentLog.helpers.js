const compactPersonLabel = (person) => person?.name || person?.full_name || person?.email || '';

const equipmentKey = (type, id) => `${type}:${id}`;

export const getEquipmentDisplayName = (equipment) => {
  if (!equipment) return '';
  if (equipment.type === 'vehicle') {
    return [equipment.identifier, equipment.name].filter(Boolean).join(' - ');
  }
  return [equipment.name, equipment.identifier].filter(Boolean).join(' - ');
};

export const normalizeEquipmentItems = ({ vehicles = [], plantAssets = [] } = {}) => [
  ...(Array.isArray(vehicles) ? vehicles : []).map((vehicle) => ({
    id: vehicle.id,
    type: 'vehicle',
    key: equipmentKey('vehicle', vehicle.id),
    name: vehicle.name || vehicle.brand || vehicle.model || 'Vehículo',
    identifier: vehicle.license_plate || '',
    status: vehicle.status || '',
    responsible: compactPersonLabel(vehicle.assigned_driver_profile) || compactPersonLabel(vehicle.assigned_driver),
  })),
  ...(Array.isArray(plantAssets) ? plantAssets : []).map((asset) => ({
    id: asset.id,
    type: 'plant_asset',
    key: equipmentKey('plant_asset', asset.id),
    name: asset.name || 'Equipo de planta',
    identifier: asset.location_description || asset.category || '',
    status: asset.status || '',
    responsible: compactPersonLabel(asset.responsible_user),
  })),
];

export const buildEquipmentTargetFromSelection = (selection, { vehicles = [], plantAssets = [] } = {}) => {
  const [type, id] = String(selection || '').split(':');
  const equipment = normalizeEquipmentItems({ vehicles, plantAssets })
    .find((item) => item.type === type && item.id === id);

  if (!equipment) {
    return {
      target_type: 'vehicle',
      target_id: '',
      vehicle_id: null,
      plant_asset_id: null,
      equipment_name: '',
    };
  }

  return {
    target_type: equipment.type,
    target_id: equipment.id,
    vehicle_id: equipment.type === 'vehicle' ? equipment.id : null,
    plant_asset_id: equipment.type === 'plant_asset' ? equipment.id : null,
    equipment_name: getEquipmentDisplayName(equipment),
  };
};

const eventTimestamp = (date, time = '') => {
  if (!date) return 0;
  const parsed = new Date(`${date}T${time || '00:00:00'}`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const normalizeLegacyValue = (value) => String(value || '').trim().toLowerCase();

const isForEquipment = (record, equipment) => {
  if (!record || !equipment) return false;
  if (equipment.type === 'vehicle') return record.vehicle_id === equipment.id;
  if (equipment.type === 'plant_asset') return record.plant_asset_id === equipment.id;
  return false;
};

const isLegacyMatch = (record, equipment) => {
  if (record?.vehicle_id || record?.plant_asset_id || !record?.equipment_name) return false;
  const recordName = normalizeLegacyValue(record.equipment_name);
  return recordName && [
    equipment.name,
    equipment.identifier,
    getEquipmentDisplayName(equipment),
  ].some((value) => normalizeLegacyValue(value) === recordName);
};

const belongsToEquipment = (record, equipment) => isForEquipment(record, equipment) || isLegacyMatch(record, equipment);

export const buildEquipmentHistory = ({
  equipment,
  fuelLoads = [],
  maintenanceLogs = [],
  vehicleRoutes = [],
  maintenanceRequests = [],
  dailyOperations = [],
  incidents = [],
  maintenanceChecks = [],
} = {}) => {
  if (!equipment?.id || !equipment?.type) return [];

  const events = [];

  if (equipment.type === 'vehicle') {
    (Array.isArray(fuelLoads) ? fuelLoads : [])
      .filter((load) => isForEquipment(load, equipment))
      .forEach((load) => {
        events.push({
          id: `fuel:${load.id}`,
          type: 'fuel',
          label: 'Combustible',
          date: load.load_date,
          timestamp: eventTimestamp(load.load_date, load.estimated_time),
          description: `${load.liters ?? '-'} L - Km ${load.mileage ?? '-'}`,
          responsible: '',
        });
      });

    (Array.isArray(maintenanceLogs) ? maintenanceLogs : [])
      .filter((log) => isForEquipment(log, equipment))
      .forEach((log) => {
        events.push({
          id: `vehicle-maintenance:${log.id}`,
          type: 'vehicle-maintenance',
          label: 'Mantenimiento vehicular',
          date: log.maintenance_date,
          timestamp: eventTimestamp(log.maintenance_date),
          description: log.detail || log.maintenance_type || 'Mantenimiento',
          responsible: '',
        });
      });

    (Array.isArray(vehicleRoutes) ? vehicleRoutes : [])
      .filter((route) => isForEquipment(route, equipment))
      .forEach((route) => {
        events.push({
          id: `route:${route.id}`,
          type: 'route',
          label: 'Recorrido',
          date: route.route_date,
          timestamp: eventTimestamp(route.route_date),
          description: `${route.kilometers_traveled ?? 0} km - ${(route.visited_places || []).join(' -> ')}`,
          responsible: route.driver?.name || '',
        });
      });

    (Array.isArray(maintenanceRequests) ? maintenanceRequests : [])
      .filter((request) => isForEquipment(request, equipment))
      .forEach((request) => {
        events.push({
          id: `maintenance-request:${request.id}`,
          type: 'maintenance-request',
          label: 'Aviso de mantenimiento',
          date: request.request_date,
          timestamp: eventTimestamp(request.request_date),
          description: [request.issue_type, request.status, request.description].filter(Boolean).join(' - '),
          responsible: request.driver?.name || '',
        });
      });
  }

  (Array.isArray(dailyOperations) ? dailyOperations : [])
    .filter((record) => belongsToEquipment(record, equipment))
    .forEach((record) => {
      events.push({
        id: `operation:${record.id}`,
        type: 'operation',
        label: 'Operación diaria',
        date: record.operation_date,
        timestamp: eventTimestamp(record.operation_date),
        description: [record.shift, record.usage_time, record.observations].filter(Boolean).join(' - ') || 'Operación diaria',
        responsible: record.operator_name || '',
      });
    });

  (Array.isArray(incidents) ? incidents : [])
    .filter((record) => belongsToEquipment(record, equipment))
    .forEach((record) => {
      events.push({
        id: `incident:${record.id}`,
        type: 'incident',
        label: 'Incidencia',
        date: record.incident_date,
        timestamp: eventTimestamp(record.incident_date, record.incident_time),
        description: record.anomaly_description || record.corrective_action || 'Incidencia',
        responsible: record.maintenance_done_by || '',
      });
    });

  (Array.isArray(maintenanceChecks) ? maintenanceChecks : [])
    .filter((record) => belongsToEquipment(record, equipment))
    .forEach((record) => {
      events.push({
        id: `check:${record.id}`,
        type: 'check',
        label: 'Revisión de mantenimiento',
        date: record.review_date,
        timestamp: eventTimestamp(record.review_date),
        description: [record.inspection_type, record.reviewed_component, record.general_status_observations].filter(Boolean).join(' - '),
        responsible: '',
      });
    });

  return events.sort((a, b) => b.timestamp - a.timestamp);
};
