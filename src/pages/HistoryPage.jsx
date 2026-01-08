
import React, { useState, useEffect } from 'react';
import { jobsService } from '@/services/jobs.service';
import { exportService } from '@/services/export.service';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFilters } from '@/hooks/useFilters';
import JobFilters from '@/components/jobs/JobFilters';
import { usePagination } from '@/hooks/usePagination';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getMonthStart, getTodayDate } from '@/utils/dates';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import JobForm from '@/components/jobs/JobForm';
import { History, Download, Trash2, Edit2, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';

export default function HistoryPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { filters, setFilter } = useFilters({
    startDate: getMonthStart(),
    endDate: getTodayDate(),
    status: 'all',
    search: ''
  });
  
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  const { 
    currentPage, nextPage, prevPage, goToPage, getPageData, totalPages 
  } = usePagination(15);

  useEffect(() => {
    if (user) fetchJobs();
  }, [user, filters.startDate, filters.endDate, filters.status, filters.groupId]);

  useEffect(() => {
    if (!jobs) return;
    let result = [...jobs];
    
    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(job => 
        (job.description?.toLowerCase().includes(term)) || 
        (job.location?.toLowerCase().includes(term))
      );
    }
    setFilteredJobs(result);
    goToPage(1);
  }, [filters.search, jobs]);

  const fetchJobs = async () => {
    setLoading(true);
    const data = await jobsService.getJobsByDateRange(filters.startDate, filters.endDate, filters);
    if (data.success) {
        setJobs(data.data || []);
        setFilteredJobs(data.data || []);
    } else {
        addToast(data.error, 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
      const result = await jobsService.deleteJob(id);
      if (result.success) {
          addToast("Trabajo eliminado correctamente", 'success');
          fetchJobs();
      } else {
          addToast(result.error, 'error');
      }
  };

  const currentData = getPageData(filteredJobs);
  const totalPageCount = totalPages(filteredJobs.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Trabajos</h1>
          <p className="text-gray-500">Gestión completa de registros</p>
        </div>
        <Button onClick={() => exportService.exportToExcel(filteredJobs, 'historial.xlsx')} variant="outline" className="w-full md:w-auto">
          <Download className="w-4 h-4 mr-2" /> Exportar
        </Button>
      </div>

      <JobFilters filters={filters} onChange={setFilter} />

      {loading ? (
        <LoadingSpinner />
      ) : filteredJobs.length === 0 ? (
        <EmptyState 
            icon={History}
            title="Sin resultados"
            description="No se encontraron trabajos con los filtros actuales."
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 border-b">
                <tr>
                  <th className="px-6 py-3 font-medium">Fecha</th>
                  <th className="px-6 py-3 font-medium">Descripción</th>
                  <th className="px-6 py-3 font-medium">Ubicación</th>
                  <th className="px-6 py-3 font-medium">Grupo</th>
                  <th className="px-6 py-3 font-medium text-right">Horas</th>
                  <th className="px-6 py-3 font-medium text-right">Monto</th>
                  <th className="px-6 py-3 font-medium text-center">Estado</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentData.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(job.date)}</td>
                    <td className="px-6 py-4 max-w-xs truncate" title={job.description}>{job.description}</td>
                    <td className="px-6 py-4">{job.location}</td>
                    <td className="px-6 py-4">{job.groups?.name || '-'}</td>
                    <td className="px-6 py-4 text-right">{job.hours_worked}</td>
                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(job.amount_to_charge)}</td>
                    <td className="px-6 py-4 text-center">
                       <span className={`text-xs px-2 py-1 rounded-full ${
                            job.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            job.status === 'archived' ? 'bg-gray-100 text-gray-800' : 
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                            {job.status === 'pending' ? 'Pendiente' : job.status === 'completed' ? 'Completado' : 'Archivado'}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingJob(job)}>
                            <Edit2 className="w-4 h-4 text-blue-600" />
                        </Button>
                        <ConfirmationModal
                            onConfirm={() => handleDelete(job.id)}
                            title="¿Eliminar trabajo?"
                            description="Esta acción no se puede deshacer."
                            trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Trash2 className="w-4 h-4 text-red-600" />
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

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
              {currentData.map((job) => (
                  <div key={job.id} className="p-4 bg-white flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="font-bold text-gray-900">{formatDate(job.date)}</p>
                              <p className="text-sm font-medium text-gray-800 mt-1">{job.description}</p>
                          </div>
                          <div className="text-right">
                              <p className="font-bold text-green-700">{formatCurrency(job.amount_to_charge)}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold mt-1 inline-block ${
                                    job.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                    job.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>{job.status === 'pending' ? 'Pendiente' : job.status}</span>
                          </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 flex flex-wrap gap-3 mt-1">
                          {job.location && <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {job.location}</span>}
                          {job.groups && <span>Grupo: {job.groups.name}</span>}
                      </div>

                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-50">
                        <Button variant="outline" size="sm" onClick={() => setEditingJob(job)} className="h-8 flex-1">
                            <Edit2 className="w-3 h-3 mr-1" /> Editar
                        </Button>
                        <ConfirmationModal
                            onConfirm={() => handleDelete(job.id)}
                            title="¿Eliminar?"
                            trigger={
                                <Button variant="outline" size="sm" className="h-8 flex-1 text-red-600 border-red-200">
                                    <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                                </Button>
                            }
                        />
                      </div>
                  </div>
              ))}
          </div>
          
          {/* Pagination Controls */}
          <div className="bg-gray-50 px-6 py-3 border-t flex items-center justify-between">
            <span className="text-xs md:text-sm text-gray-500">
                Página {currentPage} de {totalPageCount}
            </span>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPageCount}>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {editingJob && (
          <JobForm 
            jobToEdit={editingJob} 
            onSuccess={() => {
                setEditingJob(null);
                fetchJobs();
            }} 
          />
      )}
    </div>
  );
}
