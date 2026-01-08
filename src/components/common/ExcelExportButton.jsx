
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { exportService } from '@/services/export.service';

export default function ExcelExportButton({ 
  jobs, 
  filename, 
  variant = "outline",
  grouped = false, // If true, uses range export logic
  startDate,
  endDate
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
      className="gap-2"
    >
      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      Exportar Excel
    </Button>
  );
}
