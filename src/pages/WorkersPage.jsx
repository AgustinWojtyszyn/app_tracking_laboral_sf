import React, { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { Users, Mail, Trash2, Edit2, Search } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import { workersService } from '@/services/workers.service';
import WorkerFormModal from '@/components/workers/WorkerFormModal';

export default function WorkersPage() {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchWorkers = async () => {
    setLoading(true);
    const result = await workersService.getWorkers({ search });
    setLoading(false);
    if (result.success) {
      setWorkers(result.data || []);
    } else {
      addToast(result.error || 'Error al cargar trabajadores', 'error');
    }
  };

  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDeleted = async (id) => {
    const result = await workersService.deleteWorker(id);
    if (result.success) {
      addToast(result.message, 'success');
      fetchWorkers();
    } else {
      addToast(result.error, 'error');
    }
  };

  if (loading && workers.length === 0) return <LoadingSpinner />;
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
	      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-50">{t('workersPage.title')}</h1>
	      <p className="text-base md:text-lg text-gray-500 dark:text-slate-300">{t('workersPage.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400 dark:text-slate-400" />
            <input
              type="text"
              className="pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm md:text-base focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
              placeholder={t('workersPage.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <WorkerFormModal onSaved={fetchWorkers} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-100 dark:border-slate-800 overflow-hidden card-lg">
        {workers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-slate-300 flex flex-col items-center gap-4">
            <Users className="w-12 h-12 text-gray-300 dark:text-slate-500" />
            <p className="font-semibold text-lg text-gray-900 dark:text-slate-50">{t('workersPage.emptyTitle')}</p>
            <p className="text-base max-w-md text-gray-600 dark:text-slate-300">
		      {t('workersPage.emptyDesc')}
            </p>
            <WorkerFormModal
              onSaved={fetchWorkers}
              trigger={
                <Button className="mt-2 bg-[#1e3a8a] hover:bg-blue-900 text-white">
                  {t('workersPage.createCta')}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <table className="w-full text-base md:text-lg text-left">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200">
                  <tr>
                    <th className="px-7 py-4">{t('workersPage.name')}</th>
                    <th className="px-7 py-4">{t('workersPage.alias')}</th>
                    <th className="px-7 py-4">{t('workersPage.phone')}</th>
                    <th className="px-7 py-4">{t('workersPage.status')}</th>
                    <th className="px-7 py-4">{t('workersPage.createdAt')}</th>
                    <th className="px-7 py-4 text-right">{t('workersPage.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {workers.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/70">
                      <td className="px-7 py-4 font-semibold text-gray-900 dark:text-slate-50">{w.display_name}</td>
                      <td className="px-7 py-4 text-gray-800 dark:text-slate-200">{w.alias || '-'}</td>
                      <td className="px-7 py-4 text-gray-800 dark:text-slate-200">{w.phone || '-'}</td>
                      <td className="px-7 py-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                          w.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}>
                          {w.is_active ? t('workersPage.statusActive') : t('workersPage.statusInactive')}
                        </span>
                      </td>
                      <td className="px-7 py-4 text-gray-800 dark:text-slate-200">{formatDate(w.created_at)}</td>
                      <td className="px-7 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <WorkerFormModal
                            worker={w}
                            onSaved={fetchWorkers}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Edit2 className="w-5 h-5 text-blue-600" />
                              </Button>
                            }
                          />
                          <ConfirmationModal
                            title="¿Eliminar trabajador?"
                            description="Si tiene trabajos asociados se marcará como inactivo."
                            onConfirm={() => handleDeleted(w.id)}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Trash2 className="w-5 h-5 text-red-600" />
                              </Button>
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-800">
              {workers.map((w) => (
                <div key={w.id} className="p-4 flex flex-col gap-1 bg-white dark:bg-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base text-gray-900 dark:text-slate-50">{w.display_name}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      w.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}>
                      {w.is_active ? t('workersPage.statusActive') : t('workersPage.statusInactive')}
                    </span>
                  </div>
                  {w.alias && (
                    <div className="text-sm text-gray-500 dark:text-slate-300">Alias: {w.alias}</div>
                  )}
                  {w.phone && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-slate-300">
                      <Mail className="w-4 h-4 mr-2" /> {w.phone}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 dark:text-slate-400 mt-1">
                    Alta: {formatDate(w.created_at)}
                  </div>
                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                    <WorkerFormModal
                      worker={w}
                      onSaved={fetchWorkers}
                      trigger={
                    <Button variant="outline" size="sm" className="h-9 text-blue-600 border-blue-200 flex-1">
                          <Edit2 className="w-4 h-4 mr-1" /> {t('workersPage.edit')}
                    </Button>
                  }
                />
                <ConfirmationModal
                  title={t('workersPage.deleteTitle')}
                  description={t('workersPage.deleteDesc')}
                  onConfirm={() => handleDeleted(w.id)}
                  trigger={
                    <Button variant="outline" size="sm" className="h-9 text-red-600 border-red-200 flex-1">
                          <Trash2 className="w-4 h-4 mr-1" /> {t('workersPage.delete')}
                    </Button>
                  }
                />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
