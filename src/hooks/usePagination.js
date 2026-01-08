
import { useState } from 'react';

export const usePagination = (itemsPerPage = 20) => {
  const [currentPage, setCurrentPage] = useState(1);

  const nextPage = () => setCurrentPage(prev => prev + 1);
  const prevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToPage = (page) => setCurrentPage(page);
  
  const getPageData = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const totalPages = (totalItems) => Math.ceil(totalItems / itemsPerPage);

  return { 
    currentPage, 
    itemsPerPage,
    nextPage, 
    prevPage, 
    goToPage, 
    getPageData,
    totalPages
  };
};
