
import * as XLSX from 'xlsx';
import { formatDate } from '@/utils/formatters';
import { normalizeJobStatus } from '@/utils/jobStatus';

const resolveSectorLabel = (job) => {
  const sectorType = (job?.sector_type || '').trim();
  const custom = (job?.sector_custom || '').trim();
  if (sectorType === 'Otro' && custom) {
    return custom;
  }
  return sectorType || '';
};

const equipmentName = (record) => {
  if (record?.equipment_name) return record.equipment_name;
  if (record?.vehicle) {
    return [record.vehicle.license_plate, record.vehicle.name || record.vehicle.brand, record.vehicle.model]
      .filter(Boolean)
      .join(' - ');
  }
  if (record?.plant_asset) {
    return [record.plant_asset.name, record.plant_asset.category, record.plant_asset.location_description]
      .filter(Boolean)
      .join(' - ');
  }
  return '';
};

const equipmentType = (record) => {
  if (record?.vehicle_id || record?.vehicle) return 'Vehículo';
  if (record?.plant_asset_id || record?.plant_asset) return 'Planta';
  return 'Sin vínculo';
};

export const exportService = {
  // Helper to get formatted job object
  _mapJobToRow(job) {
    const normalizedStatus = normalizeJobStatus(job?.estado || job?.status);
    const statusLabel = normalizedStatus === 'completed'
      ? 'Completado'
      : normalizedStatus === 'pending'
      ? 'Pendiente'
      : normalizedStatus === 'archived'
      ? 'Archivado'
      : 'No informado';

    return {
      Fecha: formatDate(job.date),
      Ubicación: job.location || '',
      Título: job.title || '',
      'Tipo de acción': job.action_type || '',
      'Sector / equipo': resolveSectorLabel(job),
      Descripción: job.description || '',
      Grupo: job.groups?.name || '-',
      Trabajador: job.workers?.display_name || job.workers?.alias || '-',
      Estado: statusLabel
    };
  },

  // Helper to create workbook and save
  _saveWorkbook(data, filename, sheetName = 'Trabajos') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto-width columns approximation
    const wscols = [
        {wch:12}, {wch:25}, {wch:28}, {wch:24}, {wch:26}, {wch:40}, {wch:20}, {wch:20}, {wch:15}
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  },

  exportRecordsToExcel(records, fileName = 'trabajos.xls', sheetName = 'Trabajos') {
    if (!records || records.length === 0) return;
    const data = records.map(this._mapJobToRow);
    this._saveWorkbook(data, fileName, sheetName);
  },

  exportJobsToExcel(jobs, filename = 'trabajos.xls') {
    if (!jobs || jobs.length === 0) return;
    const data = jobs.map(this._mapJobToRow);

    // Calculate totals
    data.push({}); // Spacer
    data.push({
      Fecha: 'TOTAL GENERAL'
    });

    this._saveWorkbook(data, filename);
  },

  exportDayToExcel(date, jobs) {
      this.exportJobsToExcel(jobs, `trabajos_${date}.xls`);
  },

  exportRangeToExcel(startDate, endDate, jobs) {
    if (!jobs || jobs.length === 0) return;

    // Group by date
    const grouped = jobs.reduce((acc, job) => {
        const d = job.date;
        if (!acc[d]) acc[d] = [];
        acc[d].push(job);
        return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort();
    let finalData = [];
    sortedDates.forEach(date => {
        const dayJobs = grouped[date];
        const dayData = dayJobs.map(this._mapJobToRow);
        
        // Add daily rows
        finalData = [...finalData, ...dayData];

        // Add daily total row
        finalData.push({
            Fecha: `TOTAL ${formatDate(date)}`,
            Estado: '' // Empty to avoid confusion
        });
        
        // Spacer between days
        finalData.push({});
    });

    // Grand Total
    finalData.push({
        Fecha: 'TOTAL PERÍODO'
    });

    const filename = `trabajos_${startDate}_a_${endDate}.xls`;
    this._saveWorkbook(finalData, filename);
  },

  // Build a text-friendly summary for sharing (e.g., WhatsApp)
  buildJobsShareText(jobs, title = 'Trabajos') {
    if (!jobs || jobs.length === 0) return '';

    const lines = jobs.map((job, idx) => {
      const normalizedStatus = normalizeJobStatus(job?.estado || job?.status);
      const statusLabel = normalizedStatus === 'completed'
        ? 'Completado'
        : normalizedStatus === 'archived'
        ? 'Archivado'
        : normalizedStatus === 'pending'
        ? 'Pendiente'
        : 'No informado';

      return [
        `#${idx + 1} | ${formatDate(job.date)} - ${job.title || job.description || 'Sin descripción'}`,
        `Lugar: ${job.location || '-'}`,
        `Trabajador: ${job.workers?.display_name || job.workers?.alias || '-'}`,
        `Grupo: ${job.groups?.name || '-'}`,
        `Estado: ${statusLabel}`
      ].join('\n');
    });

    return `${title}\nTotal: ${jobs.length}\n\n${lines.join('\n\n')}`;
  },

  shareJobsViaWhatsApp(jobs, title = 'Trabajos') {
    const message = this.buildJobsShareText(jobs, title);
    if (!message) return;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  _appendJsonSheet(workbook, rows, sheetName, columnWidths = []) {
    const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    worksheet['!cols'] = columnWidths;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  },

  exportEquipmentLogToExcel({
    vehicles = [],
    fuelLoads = [],
    maintenanceLogs = [],
    plantAssets = [],
    dailyOperations = [],
    incidents = [],
    maintenanceChecks = [],
  } = {}, filename = 'libro_registro_equipo.xlsx', section = 'todo') {
    const workbook = XLSX.utils.book_new();
    const shouldExport = (name) => section === 'todo' || section === name;
    const textCompare = (a, b) => String(a || '').localeCompare(String(b || ''), 'es');
    const sortedVehicles = [...vehicles].sort((a, b) => (
      textCompare(a.vehicle_type, b.vehicle_type)
      || textCompare(a.status, b.status)
      || textCompare(a.license_plate, b.license_plate)
    ));
    const sortedFuelLoads = [...fuelLoads].sort((a, b) => (
      textCompare(a.vehicle?.license_plate, b.vehicle?.license_plate)
      || textCompare(b.load_date, a.load_date)
      || textCompare(b.estimated_time, a.estimated_time)
    ));
    const sortedMaintenanceLogs = [...maintenanceLogs].sort((a, b) => (
      textCompare(a.maintenance_type, b.maintenance_type)
      || textCompare(a.vehicle?.license_plate, b.vehicle?.license_plate)
      || textCompare(b.maintenance_date, a.maintenance_date)
    ));
    const sortedPlantAssets = [...plantAssets].sort((a, b) => (
      textCompare(a.category, b.category)
      || textCompare(a.status, b.status)
      || textCompare(a.name, b.name)
    ));
    const sortedDailyOperations = [...dailyOperations].sort((a, b) => (
      textCompare(b.operation_date, a.operation_date)
      || textCompare(equipmentName(a), equipmentName(b))
    ));
    const sortedIncidents = [...incidents].sort((a, b) => (
      textCompare(b.incident_date, a.incident_date)
      || textCompare(b.incident_time, a.incident_time)
      || textCompare(equipmentName(a), equipmentName(b))
    ));
    const sortedMaintenanceChecks = [...maintenanceChecks].sort((a, b) => (
      textCompare(b.review_date, a.review_date)
      || textCompare(equipmentName(a), equipmentName(b))
    ));

    const vehiclesByType = sortedVehicles.reduce((acc, vehicle) => {
      const key = vehicle.vehicle_type || 'sin_tipo';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const plantByCategory = sortedPlantAssets.reduce((acc, asset) => {
      const key = asset.category || 'Sin categoría';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    if (shouldExport('resumen')) this._appendJsonSheet(workbook, [
      { Clasificación: 'Vehículos registrados', Total: sortedVehicles.length },
      { Clasificación: 'Cargas de combustible', Total: sortedFuelLoads.length },
      { Clasificación: 'Mantenimientos', Total: sortedMaintenanceLogs.length },
      { Clasificación: 'Elementos de planta', Total: sortedPlantAssets.length },
      { Clasificación: 'Operaciones diarias', Total: sortedDailyOperations.length },
      { Clasificación: 'Incidencias', Total: sortedIncidents.length },
      { Clasificación: 'Revisiones / calibraciones', Total: sortedMaintenanceChecks.length },
      {},
      ...Object.entries(vehiclesByType).map(([type, total]) => ({ Clasificación: `Vehículos - ${type}`, Total: total })),
      {},
      ...Object.entries(plantByCategory).map(([category, total]) => ({ Clasificación: `Planta - ${category}`, Total: total })),
    ], 'Resumen', [{ wch: 34 }, { wch: 12 }]);

    if (shouldExport('vehiculos')) this._appendJsonSheet(workbook, sortedVehicles.map((vehicle) => ({
      Clasificación: 'Vehículo',
      Tipo: vehicle.vehicle_type || '',
      Estado: vehicle.status || '',
      Patente: vehicle.license_plate || '',
      Nombre: vehicle.name || '',
      Marca: vehicle.brand || '',
      Modelo: vehicle.model || '',
      Año: vehicle.year || '',
      Chofer: vehicle.assigned_driver?.full_name || vehicle.assigned_driver?.email || '',
      'Km inicio': vehicle.mileage_start ?? '',
      'Km cierre': vehicle.mileage_end ?? '',
      'Vence registro/cédula': vehicle.registration_expires_at ? formatDate(vehicle.registration_expires_at) : '',
      'Vence seguro': vehicle.insurance_expires_at ? formatDate(vehicle.insurance_expires_at) : '',
      'Vence VTV/RTO': vehicle.inspection_expires_at ? formatDate(vehicle.inspection_expires_at) : '',
      Observaciones: vehicle.notes || '',
    })), 'Vehículos', [
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 24 }, { wch: 18 },
      { wch: 18 }, { wch: 10 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
      { wch: 16 }, { wch: 16 }, { wch: 36 },
    ]);

    if (shouldExport('combustible')) this._appendJsonSheet(workbook, sortedFuelLoads.map((load) => ({
      Clasificación: 'Combustible',
      Patente: load.vehicle?.license_plate || '',
      Vehículo: [load.vehicle?.name || load.vehicle?.brand, load.vehicle?.model].filter(Boolean).join(' '),
      Fecha: load.load_date ? formatDate(load.load_date) : '',
      'Hora estimada': load.estimated_time?.slice(0, 5) || '',
      'Precio ARS': Number(load.price_ars || 0),
      Litros: Number(load.liters || 0),
      Kilometraje: load.mileage ?? '',
      Observaciones: load.notes || '',
    })), 'Combustible', [
      { wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, { wch: 14 }, { wch: 36 },
    ]);

    if (shouldExport('mantenimiento')) this._appendJsonSheet(workbook, sortedMaintenanceLogs.map((log) => ({
      Clasificación: 'Mantenimiento',
      Tipo: log.maintenance_type || '',
      Patente: log.vehicle?.license_plate || '',
      Vehículo: [log.vehicle?.name || log.vehicle?.brand, log.vehicle?.model].filter(Boolean).join(' '),
      Fecha: log.maintenance_date ? formatDate(log.maintenance_date) : '',
      Detalle: log.detail || '',
      Kilometraje: log.mileage ?? '',
      'Valor ARS': log.value_ars === null || log.value_ars === undefined ? '' : Number(log.value_ars),
      'Próximo control': log.next_control_date ? formatDate(log.next_control_date) : '',
      Observaciones: log.notes || '',
    })), 'Mantenimiento', [
      { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 48 },
      { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 36 },
    ]);

    if (shouldExport('planta')) this._appendJsonSheet(workbook, sortedPlantAssets.map((asset) => ({
      Clasificación: 'Planta',
      Categoría: asset.category || '',
      Estado: asset.status || '',
      Nombre: asset.name || '',
      Ubicación: asset.location_description || '',
      Responsable: asset.responsible_user?.full_name || asset.responsible_user?.email || '',
      Observaciones: asset.notes || '',
    })), 'Planta', [
      { wch: 14 }, { wch: 26 }, { wch: 18 }, { wch: 28 }, { wch: 34 }, { wch: 28 },
      { wch: 40 },
    ]);

    if (shouldExport('operaciones')) this._appendJsonSheet(workbook, sortedDailyOperations.map((record) => ({
      Clasificación: 'Operación diaria',
      Fecha: record.operation_date ? formatDate(record.operation_date) : '',
      Equipo: equipmentName(record),
      'Tipo de equipo': equipmentType(record),
      Operador: record.operator_name || '',
      Turno: record.shift || '',
      'Tiempo de uso': record.usage_time || '',
      Observaciones: record.observations || '',
    })), 'Operaciones', [
      { wch: 20 }, { wch: 14 }, { wch: 34 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 42 },
    ]);

    if (shouldExport('incidencias')) this._appendJsonSheet(workbook, sortedIncidents.map((record) => ({
      Clasificación: 'Incidencia',
      Fecha: record.incident_date ? formatDate(record.incident_date) : '',
      Hora: record.incident_time?.slice(0, 5) || '',
      Equipo: equipmentName(record),
      'Tipo de equipo': equipmentType(record),
      'Realizado por': record.maintenance_done_by || '',
      Anomalía: record.anomaly_description || '',
      'Acción correctiva': record.corrective_action || '',
      'Tiempo fuera de línea': record.downtime || '',
      Observaciones: record.observations || '',
    })), 'Incidencias', [
      { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 34 }, { wch: 16 }, { wch: 24 }, { wch: 44 }, { wch: 44 }, { wch: 22 }, { wch: 42 },
    ]);

    if (shouldExport('revisiones')) this._appendJsonSheet(workbook, sortedMaintenanceChecks.map((record) => ({
      Clasificación: 'Revisión / calibración',
      Fecha: record.review_date ? formatDate(record.review_date) : '',
      Equipo: equipmentName(record),
      'Tipo de equipo': equipmentType(record),
      Responsable: '',
      Tipo: record.inspection_type || '',
      'Componente revisado': record.reviewed_component || '',
      'Estado general': record.general_status_observations || '',
      'Próxima revisión': record.next_review_date ? formatDate(record.next_review_date) : '',
    })), 'Revisiones', [
      { wch: 24 }, { wch: 14 }, { wch: 34 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 44 }, { wch: 18 },
    ]);

    XLSX.writeFile(workbook, filename);
  }
};
