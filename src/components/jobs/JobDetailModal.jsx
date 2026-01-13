import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { exportService } from '@/services/export.service';
import { MapPin, User, Calendar, Clock3, DollarSign, Share2, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

export default function JobDetailModal({ job, onClose, onEdit }) {
  if (!job) return null;

  const handleExport = () => {
    exportService.exportJobsToExcel([job], `trabajo_${job.date}.xls`);
  };

  const handleShare = () => {
    exportService.shareJobsViaWhatsApp([job], `Detalle trabajo - ${job.date}`);
  };

  const statusLabel = job.status === 'completed'
    ? 'Completado'
    : job.status === 'archived'
    ? 'Archivado'
    : 'Pendiente';

  const statusClass = job.status === 'completed'
    ? 'bg-green-100 text-green-700'
    : job.status === 'archived'
    ? 'bg-gray-100 text-gray-700'
    : 'bg-yellow-100 text-yellow-700';

  return (
    <Dialog open={!!job} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900 dark:text-slate-50">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-bold text-[#1e3a8a]">{job.description || 'Detalle de trabajo'}</DialogTitle>
          <div className="flex flex-wrap gap-2 items-center text-sm text-gray-600 dark:text-slate-300">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800">
              <Calendar className="w-4 h-4" /> {formatDate(job.date)}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800">
              <Clock3 className="w-4 h-4" /> {job.hours_worked || 0} hs
            </span>
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-3">
            <h3 className="text-sm uppercase font-semibold text-gray-500 dark:text-slate-400">General</h3>
            <div className="space-y-2 text-gray-800 dark:text-slate-100">
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {job.location || 'Sin ubicación'}</p>
              <p className="flex items-center gap-2"><User className="w-4 h-4" /> {job.workers?.display_name || job.workers?.alias || 'Sin trabajador'}</p>
              <p className="flex items-center gap-2">Grupo: {job.groups?.name || 'Personal'}</p>
              <p>Tipo: {job.job_type || job.type || '-'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm uppercase font-semibold text-gray-500 dark:text-slate-400">Descripción</h3>
              <p className="text-gray-700 dark:text-slate-200 whitespace-pre-line">{job.description || 'Sin descripción'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm uppercase font-semibold text-gray-500 dark:text-slate-400">Costos</h3>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-gray-700 dark:text-slate-200">
                <span className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> Costo</span>
                <span className="font-semibold">{formatCurrency(job.cost_spent)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700 dark:text-slate-200">
                <span className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> Cobrar</span>
                <span className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(job.amount_to_charge)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleShare} className="gap-2">
                <Share2 className="w-4 h-4" /> Compartir WhatsApp
              </Button>
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="w-4 h-4" /> Exportar a Excel
              </Button>
              <Button onClick={() => onEdit(job)} className="gap-2 bg-[#1e3a8a] hover:bg-blue-900 text-white">
                Editar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
