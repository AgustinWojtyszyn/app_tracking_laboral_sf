import React from 'react';
import {
  JOB_IMAGE_ACCEPT,
  JOB_IMAGE_MAX_DESCRIPTION_LENGTH,
  JOB_IMAGE_MAX_TITLE_LENGTH,
} from '@/utils/jobImageAttachments';

export default function JobImagesSection({
  imageAttachments,
  imageErrors,
  isPage,
  imageSectionDescription,
  onImageChange,
  onImageRemove,
  onTitleChange,
  onDescriptionChange
}) {
  return (
    <div className={isPage ? 'space-y-3' : 'space-y-3 rounded-xl border border-gray-200 dark:border-slate-700 p-4 bg-gray-50/70 dark:bg-slate-800/40'}>
      {!isPage && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-50">Imágenes de la solicitud</h3>
          <p className="text-xs text-gray-500 dark:text-slate-300 mt-1">{imageSectionDescription}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {imageAttachments.map((attachment, index) => {
          const hasPreview = !!(attachment.previewUrl || attachment.image_url);
          return (
            <div
              key={`job-image-${index}`}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">Imagen {index + 1}</p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Referencia visual opcional.</p>
                </div>
                {hasPreview && (
                  <button
                    type="button"
                    onClick={() => onImageRemove(index)}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                  >
                    Quitar
                  </button>
                )}
              </div>

              <div className="h-24 md:h-28 w-full rounded-md overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800">
                {hasPreview ? (
                  <img
                    src={attachment.previewUrl || attachment.image_url}
                    alt={attachment.image_description || `Vista previa de la imagen ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[11px] text-gray-400">
                    Sin imagen
                  </div>
                )}
              </div>

              <input
                type="file"
                accept={JOB_IMAGE_ACCEPT}
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] || null;
                  if (nextFile) {
                    onImageChange(index, nextFile);
                  }
                  event.target.value = '';
                }}
                className="block w-full text-[11px] text-gray-700 dark:text-slate-200 file:mr-2 file:py-1.5 file:px-2 file:rounded-md file:border-0 file:bg-[#1e3a8a] file:text-white hover:file:bg-blue-900"
              />

              <div>
                <label className="text-[11px] font-semibold text-gray-600 dark:text-slate-300">Título</label>
                <input
                  type="text"
                  maxLength={JOB_IMAGE_MAX_TITLE_LENGTH}
                  className="w-full mt-1 p-2 text-xs border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
                  value={attachment.image_title || ''}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    onTitleChange(index, nextValue);
                  }}
                  placeholder="Ej: Frente"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 dark:text-slate-300">Descripción</label>
                <input
                  type="text"
                  maxLength={JOB_IMAGE_MAX_DESCRIPTION_LENGTH}
                  className="w-full mt-1 p-2 text-xs border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
                  value={attachment.image_description || ''}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    onDescriptionChange(index, nextValue);
                  }}
                  placeholder="Detalle corto"
                />
              </div>

              {imageErrors[index] && <span className="text-xs text-red-500">{imageErrors[index]}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
