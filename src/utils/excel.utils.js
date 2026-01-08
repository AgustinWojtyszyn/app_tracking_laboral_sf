
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from './formatters';

export const exportJobsToExcel = (jobs, filename = 'jobs-export.xlsx') => {
  if (!jobs || jobs.length === 0) return;

  const data = jobs.map(job => ({
    Date: formatDate(job.date),
    Location: job.location || '',
    Description: job.description || '',
    'Hours Worked': job.hours_worked || 0,
    'Cost Spent': job.cost_spent || 0,
    'Amount to Charge': job.amount_to_charge || 0,
    Status: job.status,
    Group: job.groups?.name || '-'
  }));

  // Calculate totals
  const totalHours = jobs.reduce((sum, job) => sum + (Number(job.hours_worked) || 0), 0);
  const totalCost = jobs.reduce((sum, job) => sum + (Number(job.cost_spent) || 0), 0);
  const totalCharge = jobs.reduce((sum, job) => sum + (Number(job.amount_to_charge) || 0), 0);

  data.push({}); // Empty row
  data.push({
    Date: 'TOTALS',
    'Hours Worked': totalHours,
    'Cost Spent': totalCost,
    'Amount to Charge': totalCharge
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Jobs");
  XLSX.writeFile(workbook, filename);
};
