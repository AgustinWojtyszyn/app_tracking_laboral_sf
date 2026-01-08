
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { jobsService } from '@/services/jobs.service';
import { Clock, DollarSign, TrendingUp, Briefcase, ArrowRight, Plus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatCurrency, formatNumber } from '@/utils/formatters';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ hours: 0, cost: 0, charge: 0 });
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's stats
    const statsResult = await jobsService.getJobStats(today, today);
    if (statsResult.success) {
        setStats({
            hours: Number(statsResult.data?.total_hours || 0),
            cost: Number(statsResult.data?.total_cost || 0),
            charge: Number(statsResult.data?.total_charge || 0)
        });
    }

    // Get today's jobs (using range for today)
    const recentResult = await jobsService.getJobsByDateRange(today, today); 
    if (recentResult.success) {
        setRecentJobs(recentResult.data.slice(0, 5));
    }
    
    setLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'} 👋</h1>
            <p className="text-gray-500 mt-1">Aquí tienes el resumen de tu actividad de hoy.</p>
        </div>
        <Link to="/app/trabajos-diarios">
          <Button className="bg-[#1e3a8a] text-white hover:bg-blue-900 shadow-lg shadow-blue-900/20 transition-all hover:scale-105">
            <Plus className="w-5 h-5 mr-2" /> Nuevo Trabajo
            </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-white to-blue-50/50 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 uppercase tracking-wider">Horas Hoy</CardTitle>
            <div className="p-2 bg-blue-100 rounded-full">
                <Clock className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(stats.hours, 1)} <span className="text-lg font-normal text-gray-500">hs</span></div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md bg-gradient-to-br from-white to-green-50/50 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-600 uppercase tracking-wider">Costo Hoy</CardTitle>
            <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{formatCurrency(stats.cost)}</div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-md bg-gradient-to-br from-white to-purple-50/50 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 uppercase tracking-wider">A Cobrar Hoy</CardTitle>
            <div className="p-2 bg-purple-100 rounded-full">
                <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{formatCurrency(stats.charge)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Briefcase className="w-6 h-6 mr-2 text-[#1e3a8a]" /> Trabajos Recientes
            </h2>
          <Link to="/app/trabajos-diarios" className="text-[#1e3a8a] hover:text-blue-900 text-sm font-medium flex items-center transition-colors">
            Ver Todo <ArrowRight className="w-5 h-5 ml-1" />
            </Link>
        </div>
        <div className="divide-y divide-gray-100">
            {recentJobs.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                <Briefcase className="w-14 h-14 mb-3 text-gray-200" />
                    <p>No tienes trabajos registrados hoy.</p>
                <Link to="/app/trabajos-diarios" className="mt-4 text-sm text-[#1e3a8a] font-medium hover:underline">
                        Registrar mi primer trabajo
                    </Link>
                </div>
            ) : (
                recentJobs.map(job => (
                    <div key={job.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{job.description || "Sin descripción"}</p>
                            <div className="flex items-center text-xs text-gray-500 mt-1 gap-3">
                                <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {job.location || 'Sin ubicación'}</span>
                                {job.groups && (
                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 truncate max-w-[150px]">
                                        {job.groups.name}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right flex items-center justify-between sm:block border-t sm:border-t-0 pt-2 sm:pt-0 mt-2 sm:mt-0 border-gray-100">
                             <div className="text-sm sm:text-right">
                                <span className="text-gray-500 text-xs sm:hidden mr-2">Monto:</span>
                                <span className="font-bold text-gray-900">{formatCurrency(job.amount_to_charge)}</span>
                             </div>
                             <div className="text-right">
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full ${
                                    job.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                    job.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>{
                                    job.status === 'pending' ? 'Pendiente' : 
                                    job.status === 'completed' ? 'Completado' : 'Archivado'
                                }</span>
                             </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
}
