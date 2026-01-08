
import { useState } from 'react';

export const useFilters = (initialState = {}) => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    groupId: 'all',
    userId: 'all',
    search: '',
    ...initialState
  });

  const setFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: 'all',
      groupId: 'all',
      userId: 'all',
      search: ''
    });
  };

  const applyFilters = (data) => {
      // Basic client-side filtering helper if needed
      if (!data) return [];
      return data.filter(item => {
          if (filters.status !== 'all' && item.status !== filters.status) return false;
          if (filters.groupId !== 'all' && item.group_id !== filters.groupId) return false;
          if (filters.search) {
              const term = filters.search.toLowerCase();
              const matchDesc = item.description?.toLowerCase().includes(term);
              const matchLoc = item.location?.toLowerCase().includes(term);
              if (!matchDesc && !matchLoc) return false;
          }
          return true;
      });
  };

  const getActiveFilters = () => {
      const active = {};
      Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== 'all') active[key] = value;
      });
      return active;
  };

  const hasActiveFilters = () => {
      return Object.keys(getActiveFilters()).length > 0;
  };

  return { 
      filters, 
      setFilter, 
      clearFilters, 
      applyFilters,
      getActiveFilters,
      hasActiveFilters
  };
};
