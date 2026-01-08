
import * as XLSX from 'xlsx';
import { formatDate, formatCurrency } from '@/utils/formatters';

export const exportService = {
  // Helper to get formatted job object
  _mapJobToRow(job) {
    return {
      Fecha: formatDate(job.date),
      Ubicación: job.location || '',
      Descripción: job.description || '',
      Grupo: job.groups?.name || '-',
      Usuario: job.users?.full_name || job.users?.email || '-',
      'Horas': Number(job.hours_worked) || 0,
      'Costo': Number(job.cost_spent) || 0,
      'Monto': Number(job.amount_to_charge) || 0,
      Estado: job.status === 'pending' ? 'Pendiente' : job.status === 'completed' ? 'Completado' : 'Archivado'
    };
  },

  // Helper to create workbook and save
  _saveWorkbook(data, filename, sheetName = 'Trabajos') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto-width columns approximation
    const wscols = [
        {wch:12}, {wch:25}, {wch:40}, {wch:15}, {wch:25}, {wch:10}, {wch:12}, {wch:12}, {wch:15}
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  },

  exportJobsToExcel(jobs, filename = 'trabajos.xlsx') {
    if (!jobs || jobs.length === 0) return;

    const data = jobs.map(this._mapJobToRow);

    // Calculate totals
    const totalHours = data.reduce((sum, item) => sum + item['Horas'], 0);
    const totalCost = data.reduce((sum, item) => sum + item['Costo'], 0);
    const totalCharge = data.reduce((sum, item) => sum + item['Monto'], 0);

    data.push({}); // Spacer
    data.push({
      Fecha: 'TOTAL GENERAL',
      'Horas': totalHours,
      'Costo': totalCost,
      'Monto': totalCharge
    });

    this._saveWorkbook(data, filename);
  },

  exportDayToExcel(date, jobs) {
      this.exportJobsToExcel(jobs, `trabajos_${date}.xlsx`);
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
    let grandTotalHours = 0;
    let grandTotalCost = 0;
    let grandTotalCharge = 0;

    sortedDates.forEach(date => {
        const dayJobs = grouped[date];
        const dayData = dayJobs.map(this._mapJobToRow);
        
        // Add daily rows
        finalData = [...finalData, ...dayData];

        // Calculate daily totals
        const dayHours = dayData.reduce((sum, item) => sum + item['Horas'], 0);
        const dayCost = dayData.reduce((sum, item) => sum + item['Costo'], 0);
        const dayCharge = dayData.reduce((sum, item) => sum + item['Monto'], 0);

        grandTotalHours += dayHours;
        grandTotalCost += dayCost;
        grandTotalCharge += dayCharge;

        // Add daily total row
        finalData.push({
            Fecha: `TOTAL ${formatDate(date)}`,
            'Horas': dayHours,
            'Costo': dayCost,
            'Monto': dayCharge,
            Estado: '' // Empty to avoid confusion
        });
        
        // Spacer between days
        finalData.push({});
    });

    // Grand Total
    finalData.push({
        Fecha: 'TOTAL PERÍODO',
        'Horas': grandTotalHours,
        'Costo': grandTotalCost,
        'Monto': grandTotalCharge
    });

    const filename = `trabajos_${startDate}_a_${endDate}.xlsx`;
    this._saveWorkbook(finalData, filename);
  }
};
