
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { validateDateRange } from '@/utils/validators';
import { useToast } from '@/contexts/ToastContext';

export default function DateRangePicker({ startDate, endDate, onChange, onClear }) {
  const { addToast } = useToast();

  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    if (endDate && newStart > endDate) {
       // Allow user to pick, but maybe warn or just clamp? 
       // For better UX, let's just update. Validation happens on search/apply usually, 
       // but here it's often controlled.
    }
    onChange('startDate', newStart);
  };

  const handleEndDateChange = (e) => {
    const newEnd = e.target.value;
    if (startDate && newEnd < startDate) {
        // warn
    }
    onChange('endDate', newEnd);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2 rounded-md border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <CalendarIcon className="w-4 h-4 text-gray-500" />
        <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Desde</span>
            <input
            type="date"
            className="text-sm font-medium outline-none text-gray-700 bg-transparent p-0 w-32"
            value={startDate || ''}
            onChange={handleStartDateChange}
            />
        </div>
      </div>
      
      <div className="hidden sm:block w-px h-8 bg-gray-200 mx-2"></div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
        <div className="flex flex-col">
             <span className="text-[10px] text-gray-400 font-semibold uppercase">Hasta</span>
             <input
            type="date"
            className="text-sm font-medium outline-none text-gray-700 bg-transparent p-0 w-32"
            value={endDate || ''}
            onChange={handleEndDateChange}
            />
        </div>
      </div>

      {(startDate || endDate) && onClear && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 ml-auto text-gray-400 hover:text-red-500"
            onClick={onClear}
          >
              <X className="w-4 h-4" />
          </Button>
      )}
    </div>
  );
}
