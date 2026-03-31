import React from 'react';
import { useParams } from 'react-router-dom';
import { useJobById } from '@/hooks/useJobById';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { normalizeStoredJobImageAttachments, getJobImageTitleFromFileName } from '@/utils/jobImageAttachments';

const getAttachmentDisplayTitle = (attachment) => {
  const explicitTitle = attachment?.image_title?.trim();
  if (explicitTitle) return explicitTitle;
  const fileName = attachment?.file_name?.trim();
  if (fileName) return getJobImageTitleFromFileName(fileName);
  return 'Imagen';
};

const resolveSectorLabel = (job) => {
  const sectorType = (job?.sector_type || '').trim();
  const custom = (job?.sector_custom || '').trim();
  if (sectorType === 'Otro' && custom) {
    return custom;
  }
  return sectorType || '-';
};

export default function JobDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useJobById(id);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-600">
        No se encontró la solicitud.
      </div>
    );
  }

  const attachments = normalizeStoredJobImageAttachments(data.image_attachments);
  const title = data.title || data.description || 'Detalle de solicitud';
  const statusLabel = data.status === 'completed'
    ? 'Completado'
    : data.status === 'archived'
    ? 'Archivado'
    : 'Pendiente';
  const statusClass = data.status === 'completed'
    ? 'bg-green-100 text-green-700'
    : data.status === 'archived'
    ? 'bg-gray-100 text-gray-700'
    : 'bg-yellow-100 text-yellow-700';
  const sectorLabel = resolveSectorLabel(data);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-slate-50 rounded-2xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">{title}</h1>
            <p className="text-sm md:text-base text-slate-300 mt-1">{formatDate(data.date)}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
        </div>
      </div>

      <div className="bg-slate-900 text-slate-50 rounded-2xl p-6 shadow-sm border border-slate-800">
        <h2 className="text-sm uppercase tracking-wide text-slate-300 mb-4">Datos generales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm md:text-base">
          <div>
            <p className="text-slate-400">Ubicación</p>
            <p>{data.location || '-'}</p>
          </div>
          <div>
            <p className="text-slate-400">Trabajador</p>
            <p>{data.workers?.display_name || data.workers?.alias || 'Sin trabajador'}</p>
          </div>
          <div>
            <p className="text-slate-400">Solicitante</p>
            <p>{data.requested_by || data.creator?.full_name || data.creator?.email || 'Sin solicitante'}</p>
          </div>
          <div>
            <p className="text-slate-400">Grupo</p>
            <p>{data.groups?.name || 'Personal'}</p>
          </div>
          <div>
            <p className="text-slate-400">Tipo</p>
            <p>{data.job_type || data.type || '-'}</p>
          </div>
          <div>
            <p className="text-slate-400">Tipo de acción</p>
            <p>{data.action_type || '-'}</p>
          </div>
          <div>
            <p className="text-slate-400">Sector / equipo</p>
            <p>{sectorLabel}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-slate-50 rounded-2xl p-6 shadow-sm border border-slate-800">
        <h2 className="text-sm uppercase tracking-wide text-slate-300 mb-4">Facturación</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm md:text-base">
          <div>
            <p className="text-slate-400">Costo trabajador</p>
            <p>{formatCurrency(data.cost_spent)}</p>
          </div>
          <div>
            <p className="text-slate-400">Cobrar</p>
            <p>{formatCurrency(data.amount_to_charge)}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-slate-50 rounded-2xl p-6 shadow-sm border border-slate-800">
        <h2 className="text-sm uppercase tracking-wide text-slate-300 mb-4">Descripción</h2>
        <p className="text-sm md:text-base text-slate-100 whitespace-pre-line">
          {data.description || 'Sin descripción'}
        </p>
      </div>

      <div className="bg-slate-900 text-slate-50 rounded-2xl p-6 shadow-sm border border-slate-800">
        <h2 className="text-sm uppercase tracking-wide text-slate-300 mb-4">Imágenes</h2>
        {attachments.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {attachments.map((attachment, index) => (
              <div key={`${attachment.image_path || 'text-only'}-${index}`} className="space-y-2">
                {attachment.image_url ? (
                  <img
                    src={attachment.image_url}
                    alt={attachment.image_description || `Imagen ${index + 1}`}
                    className="h-32 w-full object-cover rounded-lg border border-slate-800"
                  />
                ) : (
                  <div className="h-32 w-full rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-400">
                    Sin imagen cargada
                  </div>
                )}
                <p className="text-xs text-slate-300 uppercase tracking-wide">
                  {getAttachmentDisplayTitle(attachment)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-300">Sin imágenes</p>
        )}
      </div>
    </div>
  );
}
