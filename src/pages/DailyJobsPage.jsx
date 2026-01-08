
import React, { useState, useEffect } from 'react';
import { jobsService } from '@/services/jobs.service';
import { exportService } from '@/services/export.service';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Download, Trash2, Edit2, Calendar, MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JobForm from '@/components/jobs/JobForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { formatCurrency } from '@/utils/formatters';

export default function DailyJobsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null);

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

  const handleDelete = async (id) => {
    const result = await jobsService.deleteJob(id);
    if (result.success) {
      addToast(result.message, 'success');
      fetchJobs();
    } else {
      addToast(result.error, 'error');
    }
  };

  const totals = jobs.reduce((acc, job) => ({
    hours: acc.hours + (Number(job.hours_worked) || 0),
    cost: acc.cost + (Number(job.cost_spent) || 0),
    charge: acc.charge + (Number(job.amount_to_charge) || 0)
  }), { hours: 0, cost: 0, charge: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <h1 className="text-xl font-bold text-gray-900 hidden md:block">Trabajos Diarios</h1>
            <input 
                type="date" 
                className="flex-1 md:flex-none p-2 border border-gray-300 rounded focus:border-[#1e3a8a] outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
            />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
             <Button variant="outline" className="flex-1 md:flex-none" onClick={() => exportService.exportToExcel(jobs, `diario_${date}.xlsx`)}>
                <Download className="w-4 h-4 mr-2" /> <span className="md:inline hidden">Exportar</span>
             </Button>
             <div className="flex-1 md:flex-none">
                 <JobForm onSuccess={fetchJobs} />
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
            <span className="text-xs md:text-sm text-blue-600 font-medium uppercase">Total Horas</span>
            <p className="text-xl md:text-2xl font-bold text-blue-900">{totals.hours}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
             <span className="text-xs md:text-sm text-green-600 font-medium uppercase">Total Costo</span>
             <p className="text-xl md:text-2xl font-bold text-green-900">${totals.cost.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-center">
             <span className="text-xs md:text-sm text-purple-600 font-medium uppercase">Total a Cobrar</span>
             <p className="text-xl md:text-2xl font-bold text-purple-900">${totals.charge.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
            <LoadingSpinner />
        ) : jobs.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center text-gray-500">
                <Calendar className="w-12 h-12 mb-2 text-gray-300" />
                <p>No hay trabajos para esta fecha.</p>
            </div>
        ) : (
            <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 uppercase font-medium border-b">
                            <tr>
                                <th className="px-6 py-3">Descripción</th>
                                <th className="px-6 py-3">Ubicación</th>
                                <th className="px-6 py-3">Grupo</th>
                                <th className="px-6 py-3 text-right">Horas</th>
                                <th className="px-6 py-3 text-right">Costo</th>
                                <th className="px-6 py-3 text-right">Cobrar</th>
                                <th className="px-6 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {jobs.map(job => (
                                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{job.description}</td>
                                    <td className="px-6 py-4">{job.location}</td>
                                    <td className="px-6 py-4">{job.groups?.name || '-'}</td>
                                    <td className="px-6 py-4 text-right">{job.hours_worked}</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(job.cost_spent)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-green-700">{formatCurrency(job.amount_to_charge)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => setEditingJob(job)} className="h-8 w-8 text-blue-600">
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <ConfirmationModal
                                                title="¿Eliminar trabajo?"
                                                onConfirm={() => handleDelete(job.id)}
                                                trigger={
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                                                        <Trash2 className="w-4 h-4" />
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

                {/* Mobile View (Cards) */}
                <div className="md:hidden divide-y divide-gray-100">
                    {jobs.map(job => (
                        <div key={job.id} className="p-4 bg-white flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-gray-900">{job.description || "Sin descripción"}</p>
                                    <div className="flex items-center text-xs text-gray-500 mt-1">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {job.location || "Sin ubicación"}
                                    </div>
                                </div>
                                <div className="text-right">
                                     <p className="font-bold text-green-700 text-lg">{formatCurrency(job.amount_to_charge)}</p>
                                     <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                                         job.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                         job.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                                         'bg-yellow-100 text-yellow-700'
                                     }`}>{job.status === 'pending' ? 'Pendiente' : job.status}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                                <span>{job.groups ? `Grupo: ${job.groups.name}` : 'Personal'}</span>
                                <span className="flex items-center"><DollarSign className="w-3 h-3 mr-1" /> Costo: {formatCurrency(job.cost_spent)}</span>
                            </div>

                            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                                <Button variant="outline" size="sm" onClick={() => setEditingJob(job)} className="h-8 text-blue-600 border-blue-200">
                                    <Edit2 className="w-3 h-3 mr-1" /> Editar
                                </Button>
                                <ConfirmationModal
                                    title="¿Eliminar?"
                                    onConfirm={() => handleDelete(job.id)}
                                    trigger={
                                        <Button variant="outline" size="sm" className="h-8 text-red-600 border-red-200">
                                            <Trash2 className="w-3 h-3 mr-1" /> Eliminar
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
