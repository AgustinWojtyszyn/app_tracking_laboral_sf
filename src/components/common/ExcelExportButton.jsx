
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FileSpreadsheet } from 'lucide-react';
import { exportService } from '@/services/export.service';

export default function ExcelExportButton({ 
  jobs, 
  filename, 
  variant = "outline",
  label = "Exportar a Excel",
  icon: Icon = FileSpreadsheet,
  grouped = false, // If true, uses range export logic
  startDate,
  endDate,
  className = ""
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!jobs || jobs.length === 0) return;
    
    setExporting(true);
    
    // Small delay to allow UI to update loading state
    setTimeout(() => {
        if (grouped && startDate && endDate) {
            exportService.exportRangeToExcel(startDate, endDate, jobs);
        } else {
            exportService.exportJobsToExcel(jobs, filename);
        }
        setExporting(false);
    }, 500);
  };

  return (
    <Button 
      variant={variant} 
      onClick={handleExport} 
      disabled={!jobs || jobs.length === 0 || exporting}
      className={`gap-2 ${className}`}
    >
      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-5 h-5" />}
      {label}
    </Button>
  );
}
