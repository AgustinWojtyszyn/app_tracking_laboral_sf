
import React, { useState, useEffect } from 'react';
import { jobsService } from '@/services/jobs.service';
import { exportService } from '@/services/export.service';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Trash2, Edit2, Calendar, MapPin, DollarSign, User, Eye, MessageCircle, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JobForm from '@/components/jobs/JobForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { formatCurrency } from '@/utils/formatters';
import JobDetailModal from '@/components/jobs/JobDetailModal';

export default function DailyJobsPage() {
    const { user, isAdmin } = useAuth();
  const { addToast } = useToast();
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [clearing, setClearing] = useState(false);
  const hasJobs = jobs.length > 0;
  const clearDisabled = clearing || loading;

  useEffect(() => {
    if (user) fetchJobs();
  }, [date, user]);

  const fetchJobs = async () => {
    setLoading(true);
    const result = await jobsService.getJobsByDay(date);
    if (result.success) {
      setJobs(result.data);
    } else {
      addToast(result.error, 'error');
    }
    setLoading(false);
  };

  const handleShare = () => {
    if (!jobs || jobs.length === 0) {
      addToast(isEn ? 'No jobs to share.' : 'No hay trabajos para compartir.', 'error');
      return;
    }
    const title = isEn
      ? `Daily jobs - ${date}`
      : `Trabajos diarios - ${date}`;
    exportService.shareJobsViaWhatsApp(jobs, title);
  };

    const handleDelete = async (id) => {
        if (!isAdmin) {
            addToast(isEn ? 'Only administrators can delete jobs.' : 'Solo los administradores pueden eliminar trabajos.', 'error');
            return;
        }

    const result = await jobsService.deleteJob(id);
    if (result.success) {
        addToast(result.message, 'success');
        fetchJobs();
    } else {
        addToast(result.error, 'error');
    }
  };

  const handleClearCompleted = async () => {
    if (!isAdmin) {
      addToast(isEn ? 'Only administrators can clean completed jobs.' : 'Solo los administradores pueden limpiar trabajos completados.', 'error');
      return;
    }
    setClearing(true);
    const result = await jobsService.deleteCompletedJobs(date, date);
    if (result.success) {
      const removed = result.removed || 0;
      addToast(
        removed === 0
          ? (isEn ? 'No completed jobs to remove.' : 'No hay trabajos completados para eliminar.')
          : (isEn ? `Removed ${removed} completed jobs.` : `Se eliminaron ${removed} trabajos completados.`),
        'success'
      );
      fetchJobs();
    } else {
      addToast(result.error, 'error');
    }
    setClearing(false);
  };

  const totals = jobs.reduce((acc, job) => {
    const status = (job.status || '').trim().toLowerCase();
    return {
      hours: acc.hours + (Number(job.hours_worked) || 0),
      cost: acc.cost + (status === 'completed' ? 0 : (Number(job.cost_spent) || 0)),
      charge: acc.charge + (status === 'completed' ? 0 : (Number(job.amount_to_charge) || 0)),
    };
  }, { hours: 0, cost: 0, charge: 0 });

  return (
    <div className="space-y-8">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-50">
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            <h1 className="text-3xl md:text-3xl font-bold text-gray-900 dark:text-slate-50 hidden md:block">
              {isEn ? 'Daily Jobs' : 'Trabajos Diarios'}
            </h1>
            <input 
                type="date" 
                className="w-full md:w-48 py-2.5 px-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 text-sm md:text-base"
                value={date}
                onChange={(e) => setDate(e.target.value)}
            />
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch justify-end gap-3 w-full">
          <Button
            variant="default"
            className="w-full sm:w-auto min-w-[150px] sm:min-w-[170px] h-12 md:h-14 text-base md:text-lg shadow-md bg-gradient-to-r from-[#1D976C] to-[#93F9B9] text-[#0b4f31] hover:from-[#168b60] hover:to-[#83efad] border-0 gap-2"
            onClick={() => exportService.exportDayToExcel(date, jobs)}
            disabled={!hasJobs || loading}
          >
            <FileSpreadsheet className="w-5 h-5" /> {isEn ? 'Export to Excel' : 'Exportar a Excel'}
          </Button>
          <Button
            variant="default"
            className="w-full sm:w-auto min-w-[150px] sm:min-w-[170px] h-12 md:h-14 text-base md:text-lg shadow-md bg-[#25D366] hover:bg-[#1ebe5a] text-white border-0 gap-2"
            onClick={handleShare}
            disabled={!hasJobs || loading}
          >
            <MessageCircle className="w-5 h-5" /> {isEn ? 'Share WhatsApp' : 'Compartir WhatsApp'}
          </Button>
          <ConfirmationModal
            title={isEn ? 'Clean completed?' : '¿Limpiar completados?'}
            description={isEn ? 'Delete all completed jobs for this day.' : 'Eliminar todos los trabajos con estado completado de esta fecha.'}
            confirmLabel={isEn ? 'Delete' : 'Eliminar'}
            onConfirm={handleClearCompleted}
            trigger={
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto min-w-[120px] sm:min-w-[140px] h-11 md:h-11 text-sm md:text-sm lg:text-base shadow-sm bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                disabled={clearDisabled}
              >
                <Trash2 className="w-5 h-5 mr-2" /> {clearing ? (isEn ? 'Cleaning...' : 'Limpiando...') : (isEn ? 'Clear completed' : 'Limpiar completados')}
              </Button>
            }
          />
          <div className="w-full sm:w-auto min-w-[120px] sm:min-w-[140px]">
            <JobForm onSuccess={fetchJobs} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-slate-900 p-5 rounded-xl border border-blue-100 dark:border-slate-700 text-center card-lg">
            <span className="text-sm md:text-base text-blue-600 dark:text-blue-200 font-semibold uppercase tracking-wide">
              {isEn ? 'Total Hours' : 'Total Horas'}
            </span>
            <p className="text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{totals.hours}</p>
        </div>
        <div className="bg-green-50 dark:bg-slate-900 p-5 rounded-xl border border-green-100 dark:border-slate-700 text-center card-lg">
             <span className="text-sm md:text-base text-green-600 dark:text-green-200 font-semibold uppercase tracking-wide">
               {isEn ? 'Total Cost' : 'Total Costo'}
             </span>
             <p className="text-2xl md:text-3xl font-bold text-green-900 dark:text-green-100 mt-1">{formatCurrency(totals.cost)}</p>
        </div>
        <div className="bg-purple-50 dark:bg-slate-900 p-5 rounded-xl border border-purple-100 dark:border-slate-700 text-center card-lg">
             <span className="text-sm md:text-base text-purple-600 dark:text-purple-200 font-semibold uppercase tracking-wide">
               {isEn ? 'Total to Charge' : 'Total a Cobrar'}
             </span>
             <p className="text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">{formatCurrency(totals.charge)}</p>
        </div>
      </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-gray-200 dark:border-slate-800 overflow-hidden card-lg">
                {loading ? (
                    <LoadingSpinner />
                ) : jobs.length === 0 ? (
                    <div className="p-14 text-center flex flex-col items-center text-gray-500 dark:text-slate-300 gap-3">
                        <Calendar className="w-16 h-16 mb-2 text-gray-300" />
                        <p className="text-lg font-medium">{isEn ? 'No jobs for this date.' : 'No hay trabajos para esta fecha.'}</p>
                    </div>
                ) : (
                    <>
                                {/* Desktop View */}
                        <div className="hidden md:block">
                            <table className="w-full table-fixed text-base md:text-lg text-left">
                                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-100 uppercase font-semibold border-b border-gray-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 w-[22%] break-words">{isEn ? 'Description' : 'Descripción'}</th>
                                        <th className="px-4 py-3 text-right w-[8%] min-w-[80px]">{isEn ? 'Hours' : 'Horas'}</th>
                                        <th className="px-4 py-3 w-[16%] break-words">{isEn ? 'Worker' : 'Trabajador'}</th>
                                        <th className="px-4 py-3 w-[14%] break-words">{isEn ? 'Group' : 'Grupo'}</th>
                                        <th className="px-4 py-3 text-center w-[9%]">{isEn ? 'Status' : 'Estado'}</th>
                                        <th className="px-4 py-3 text-right w-[10%] min-w-[120px]">{isEn ? 'Cost' : 'Costo'}</th>
                                        <th className="px-4 py-3 w-[14%] break-words text-center">{isEn ? 'Location' : 'Ubicación'}</th>
                                        <th className="px-4 py-3 text-right w-[10%] min-w-[130px]">{isEn ? 'Charge' : 'Cobrar'}</th>
                                        <th className="px-4 py-3 text-center w-[11%]">{isEn ? 'Actions' : 'Acciones'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {jobs.map((job) => (
                                        <tr
                                            key={job.id}
                                            className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-50 break-words">{job.description}</td>
                                            <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{job.hours_worked}</td>
                                            <td className="px-4 py-3 text-gray-700 dark:text-slate-200 break-words whitespace-nowrap overflow-hidden text-ellipsis">{job.workers?.display_name || job.workers?.alias || '-'}</td>
                                            <td className="px-4 py-3 break-words whitespace-nowrap overflow-hidden text-ellipsis">{job.groups?.name || '-'}</td>
                                            <td className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-slate-100">
                                              {job.status === 'completed'
                                                ? (isEn ? 'Completed' : 'Completado')
                                                : job.status === 'archived'
                                                ? (isEn ? 'Archived' : 'Archivado')
                                                : (isEn ? 'Pending' : 'Pendiente')}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{formatCurrency(job.cost_spent)}</td>
                                            <td className="px-4 py-3 break-words text-center whitespace-nowrap overflow-hidden text-ellipsis">{job.location}</td>
                                            <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{formatCurrency(job.amount_to_charge)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-4 flex-wrap">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSelectedJob(job)}
                                                        className="h-9 px-3 rounded-full text-[#1e3a8a] border-blue-200 text-sm font-semibold shadow-sm"
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" /> {isEn ? 'View' : 'Ver detalle'}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setEditingJob(job)}
                                                        className="h-9 px-3 rounded-full bg-[#1e3a8a] hover:bg-blue-900 text-white text-sm font-semibold shadow-sm"
                                                    >
                                                        <Edit2 className="w-4 h-4 mr-1" /> {isEn ? 'Edit' : 'Editar'}
                                                    </Button>
                                                    {isAdmin && (
                                                      <ConfirmationModal
                                                          title={isEn ? 'Delete job?' : '¿Eliminar trabajo?'}
                                                          onConfirm={() => handleDelete(job.id)}
                                                          trigger={
                                                              <Button
                                                                  variant="ghost"
                                                                  size="icon"
                                                                  className="h-9 w-9 text-red-600"
                                                              >
                                                                  <Trash2 className="w-5 h-5" />
                                                              </Button>
                                                          }
                                                      />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
{/* Mobile View (Cards) */}
                        <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-800">
                            {jobs.map((job) => (
                                <div
                                            key={job.id}
                                            className="p-4 bg-white dark:bg-slate-900 flex flex-col gap-2"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-base md:text-lg text-gray-900 dark:text-slate-50">{job.description || (isEn ? 'No description' : 'Sin descripción')}</p>
                                                    <div className="flex items-center text-sm text-gray-500 dark:text-slate-300 mt-1">
                                                        <MapPin className="w-4 h-4 mr-1" />
                                                        {job.location || (isEn ? 'No location' : 'Sin ubicación')}
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-500 dark:text-slate-300 mt-1">
                                                        <User className="w-4 h-4 mr-1" />
                                                        {job.workers?.display_name || job.workers?.alias || (isEn ? 'No worker' : 'Sin trabajador')}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                            <p className="font-bold text-green-700 dark:text-green-400 text-lg md:text-xl">
                                              {formatCurrency(job.amount_to_charge)}
                                            </p>
                                                    <span
                                                className={`text-xs md:text-sm px-3 py-1.5 rounded-full uppercase font-bold ${
                                                    job.status === 'completed'
                                                        ? 'bg-green-100 text-green-700'
                                                        : job.status === 'archived'
                                                        ? 'bg-gray-100 text-gray-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                }`}
                                                    >
                                                        {job.status === 'pending'
                                                          ? (isEn ? 'Pending' : 'Pendiente')
                                                          : job.status === 'completed'
                                                          ? (isEn ? 'Completed' : 'Completado')
                                                          : (isEn ? 'Archived' : 'Archivado')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-sm md:text-base text-gray-600 dark:text-slate-200 mt-2 bg-gray-50 dark:bg-slate-800 p-2.5 rounded-lg">
                                                <span>{job.groups ? `${isEn ? 'Group' : 'Grupo'}: ${job.groups.name}` : (isEn ? 'Personal' : 'Personal')}</span>
                                                <span className="flex items-center">
                                                    <DollarSign className="w-4 h-4 mr-1" /> {isEn ? 'Cost' : 'Costo'}: {formatCurrency(job.cost_spent)}
                                                </span>
                                            </div>

                                            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedJob(job)}
                                                    className="h-9 px-3 rounded-full text-[#1e3a8a] border-blue-200 text-xs font-semibold shadow-sm"
                                                >
                                                    <Eye className="w-4 h-4 mr-1" /> {isEn ? 'View' : 'Ver detalle'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingJob(job)}
                                                    className="h-9 px-3 rounded-full bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-semibold shadow-sm"
                                                >
                                                    <Edit2 className="w-4 h-4 mr-1" /> {isEn ? 'Edit' : 'Editar'}
                                                </Button>
                                                {isAdmin && (
                                                  <ConfirmationModal
                                                      title={isEn ? 'Delete?' : '¿Eliminar?'}
                                                      onConfirm={() => handleDelete(job.id)}
                                                      trigger={
                                                          <Button
                                                              variant="outline"
                                                              size="sm"
                                                              className="h-9 text-red-600 border-red-200"
                                                          >
                                                              <Trash2 className="w-4 h-4 mr-1" /> {isEn ? 'Delete' : 'Eliminar'}
                                                          </Button>
                                                      }
                                                  />
                                                )}
                                            </div>
                                        </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {editingJob && (
                <JobForm
                    jobToEdit={editingJob}
                    onSuccess={() => {
                        setEditingJob(null);
                        fetchJobs();
                    }}
                />
            )}
            {selectedJob && (
              <JobDetailModal
                job={selectedJob}
                onClose={() => setSelectedJob(null)}
                onEdit={(job) => {
                  setSelectedJob(null);
                  setEditingJob(job);
                }}
              />
            )}
        </div>
    );
}
