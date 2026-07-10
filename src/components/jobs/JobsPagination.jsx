import React from 'react';
import { Button } from '@/components/ui/button';

export const getJobsPaginationRange = ({ currentPage, pageSize, totalCount }) => {
  if (!totalCount) return { from: 0, to: 0 };

  const safePage = Math.max(1, Number(currentPage) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 10);

  return {
    from: ((safePage - 1) * safePageSize) + 1,
    to: Math.min(safePage * safePageSize, totalCount),
  };
};

export default function JobsPagination({
  isEn,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  hasPreviousPage,
  hasNextPage,
  loading,
  onPreviousPage,
  onNextPage,
}) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const { from, to } = getJobsPaginationRange({ currentPage, pageSize, totalCount });

  return (
    <div className="border-t border-gray-100 px-4 py-4 dark:border-slate-800 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-600 dark:text-slate-300">
          {isEn
            ? `Showing ${from}-${to} of ${totalCount} jobs`
            : `Mostrando ${from}-${to} de ${totalCount} trabajos`}
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPreviousPage}
            disabled={!hasPreviousPage || loading}
            className="w-auto"
          >
            {isEn ? 'Previous' : 'Anterior'}
          </Button>
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
            {isEn ? `Page ${currentPage} of ${safeTotalPages}` : `Página ${currentPage} de ${safeTotalPages}`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNextPage}
            disabled={!hasNextPage || loading}
            className="w-auto"
          >
            {isEn ? 'Next' : 'Siguiente'}
          </Button>
        </div>
      </div>
    </div>
  );
}
