import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { exportService } from '@/services/export.service';
import { MapPin, User, Calendar, Share2, Download } from 'lucide-react';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { getJobImageTitleFromFileName, normalizeStoredJobImageAttachments } from '@/utils/jobImageAttachments';

const getAttachmentDisplayTitle = (attachment) => {
  const explicitTitle = attachment?.image_title?.trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const fileName = attachment?.file_name?.trim();
  if (fileName) {
    return getJobImageTitleFromFileName(fileName);
  }

  return 'Imagen';
};

export default function JobDetailModal({ job, onClose, onEdit }) {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!job) return null;

  const attachments = normalizeStoredJobImageAttachments(job.image_attachments);
  const displayTitle = job.title || job.description || 'Detalle de trabajo';
  const selectedImageTitle = selectedImage ? getAttachmentDisplayTitle(selectedImage) : 'Imagen adjunta';

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
          <DialogTitle className="text-2xl font-bold text-[#1e3a8a]">{displayTitle}</DialogTitle>
          <div className="flex flex-wrap gap-2 items-center text-sm text-gray-600 dark:text-slate-300">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800">
              <Calendar className="w-4 h-4" /> {formatDate(job.date)}
            </span>
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-3">
            <h3 className="text-sm uppercase font-semibold text-gray-500 dark:text-slate-400">General</h3>
            <div className="space-y-2 text-gray-800 dark:text-slate-100">
              <p className="flex items-center gap-2">Título: {job.title || 'Sin título'}</p>
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {job.location || 'Sin ubicación'}</p>
              <p className="flex items-center gap-2"><User className="w-4 h-4" /> {job.workers?.display_name || job.workers?.alias || 'Sin trabajador'}</p>
              <p className="flex items-center gap-2">Solicita: {job.requested_by || 'Sin solicitante'}</p>
              <p className="flex items-center gap-2">Grupo: {job.groups?.name || 'Personal'}</p>
              <p>Tipo: {job.job_type || job.type || '-'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm uppercase font-semibold text-gray-500 dark:text-slate-400">Facturación</h3>
              <div className="space-y-1 text-gray-700 dark:text-slate-200">
                <p>Costo trabajador: {formatCurrency(job.cost_spent)}</p>
                <p>Cobrar: {formatCurrency(job.amount_to_charge)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm uppercase font-semibold text-gray-500 dark:text-slate-400">Descripción</h3>
              <p className="text-gray-700 dark:text-slate-200 whitespace-pre-line">{job.description || 'Sin descripción'}</p>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm uppercase font-semibold text-gray-500 dark:text-slate-400">Imágenes</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {attachments.map((attachment, index) => (
                    <div key={`${attachment.image_path || 'text-only'}-${index}`} className="rounded-xl border border-gray-200 dark:border-slate-700 p-3 bg-gray-50 dark:bg-slate-800/50 space-y-3">
                      {attachment.image_url ? (
                        <button
                          type="button"
                          onClick={() => setSelectedImage(attachment)}
                          className="block w-full overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                          <img
                            src={attachment.image_url}
                            alt={attachment.image_description || `Imagen ${index + 1} de la solicitud`}
                            className="h-36 w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-700 p-4 text-sm text-gray-500 dark:text-slate-400">
                          Sin imagen cargada
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{getAttachmentDisplayTitle(attachment)}</p>
                        {attachment.image_description?.trim() ? (
                          <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-line">
                            {attachment.image_description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
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

      {selectedImage?.image_url && (
        <Dialog open={!!selectedImage} onOpenChange={(open) => { if (!open) setSelectedImage(null); }}>
          <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-900 dark:text-slate-50">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#1e3a8a]">{selectedImageTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.image_description || selectedImageTitle}
                  className="max-h-[70vh] w-full object-contain"
                />
              </div>
              {selectedImage.image_description?.trim() ? (
                <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-line">
                  {selectedImage.image_description}
                </p>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
