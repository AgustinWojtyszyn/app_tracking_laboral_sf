import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function QuickFilterChips({ filters, onChange, groups = [], workers = [] }) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const statusOptions = useMemo(() => ([
    { value: 'all', label: isEn ? 'All' : 'Todos' },
    { value: 'pending', label: isEn ? 'Pending' : 'Pendiente' },
    { value: 'completed', label: isEn ? 'Completed' : 'Completado' },
    { value: 'archived', label: isEn ? 'Archived' : 'Archivado' },
  ]), [isEn]);

  const groupOptions = useMemo(() => {
    const base = [{ id: 'all', name: isEn ? 'All' : 'Todos' }];
    const unique = new Map();
    groups.forEach((g) => {
      if (!g?.id) return;
      if (!unique.has(g.id)) {
        unique.set(g.id, g.name || g.id);
      }
    });
    const items = Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
    return [...base, ...items];
  }, [groups, isEn]);

  const workerOptions = useMemo(() => {
    const base = [{ id: 'all', name: isEn ? 'All' : 'Todos' }];
    const unique = new Map();
    workers.forEach((w) => {
      if (!w?.id) return;
      if (!unique.has(w.id)) {
        unique.set(w.id, w.name || w.id);
      }
    });
    const items = Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
    return [...base, ...items];
  }, [workers, isEn]);

  const chipClass = (active) => (
    `px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold border transition ` +
    (active
      ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
      : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800')
  );

  return (
    <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs md:text-sm font-semibold text-gray-500 dark:text-slate-300">
            {isEn ? 'Status' : 'Estado'}:
          </span>
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={chipClass(filters.status === option.value)}
              onClick={() => onChange('status', option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {groupOptions.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs md:text-sm font-semibold text-gray-500 dark:text-slate-300">
              {isEn ? 'Group' : 'Grupo'}:
            </span>
            {groupOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={chipClass(filters.groupId === option.id)}
                onClick={() => onChange('groupId', option.id)}
              >
                {option.name}
              </button>
            ))}
          </div>
        )}

        {workerOptions.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs md:text-sm font-semibold text-gray-500 dark:text-slate-300">
              {isEn ? 'Worker' : 'Trabajador'}:
            </span>
            {workerOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={chipClass(filters.workerId === option.id)}
                onClick={() => onChange('workerId', option.id)}
              >
                {option.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
