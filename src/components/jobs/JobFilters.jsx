
import React, { useEffect, useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import DateRangePicker from '@/components/common/DateRangePicker';

export default function JobFilters({ filters, onChange, showDates = true, showClear = true }) {
  const [groups, setGroups] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      const { data } = await supabase.from('groups').select('id, name');
      if (data) setGroups(data);
    };
    fetchGroups();
  }, []);

  const handleChange = (key, value) => {
    onChange(key, value);
  };

  const handleClear = () => {
      handleChange('startDate', '');
      handleChange('endDate', '');
      handleChange('status', 'all');
      handleChange('groupId', 'all');
      handleChange('search', '');
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 transition-all duration-300">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar - Always Visible */}
        <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
                type="text"
                className="w-full pl-10 p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none transition-all"
                placeholder="Buscar por descripción, ubicación..."
                value={filters.search}
                onChange={(e) => handleChange('search', e.target.value)}
            />
        </div>

        {/* Desktop Filters / Mobile Toggle */}
        <div className="lg:hidden">
            <Button 
                variant="outline" 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="w-full flex items-center justify-between"
            >
                <span className="flex items-center gap-2"><Filter className="w-4 h-4" /> Filtros</span>
                {isExpanded ? <X className="w-4 h-4" /> : null}
            </Button>
        </div>

        <div className={`
            flex-col lg:flex-row gap-4 items-start lg:items-center 
            ${isExpanded ? 'flex' : 'hidden lg:flex'}
        `}>
             {/* Date Range */}
            {showDates && (
                <DateRangePicker 
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    onChange={handleChange}
                    onClear={() => {
                        handleChange('startDate', '');
                        handleChange('endDate', '');
                    }}
                />
            )}

            {/* Status */}
            <div className="w-full lg:w-40">
                <select
                className="w-full p-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none"
                value={filters.status}
                onChange={(e) => handleChange('status', e.target.value)}
                >
                <option value="all">Estado: Todos</option>
                <option value="pending">Pendiente</option>
                <option value="completed">Completado</option>
                <option value="archived">Archivado</option>
                </select>
            </div>

            {/* Group */}
            <div className="w-full lg:w-40">
                <select
                className="w-full p-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none"
                value={filters.groupId}
                onChange={(e) => handleChange('groupId', e.target.value)}
                >
                <option value="all">Grupo: Todos</option>
                {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                ))}
                </select>
            </div>

            {/* Clear Button */}
            {showClear && (
                <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleClear}
                    title="Limpiar filtros"
                    className="text-gray-400 hover:text-[#1e3a8a] hover:bg-blue-50"
                >
                    <X className="w-5 h-5" />
                </Button>
            )}
        </div>
      </div>
    </div>
  );
}
