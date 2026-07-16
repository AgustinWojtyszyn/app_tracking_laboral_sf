import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import { jobsService } from '@/services/jobs.service';
import { notifyWorker } from '@/services/jobNotifications.service';
import { createJobImageDrafts, JOB_IMAGE_MAX_COUNT } from '@/utils/jobImageAttachments';
import { actionTypeOptions, sectorTypeOptions } from '@/utils/jobs/jobFormOptions';
import { validateJobForm } from '@/utils/jobs/jobFormValidators';
import { buildJobPayload } from '@/utils/jobs/buildJobPayload';
import { useJobFormData } from '@/hooks/jobs/useJobFormData';
import { useJobFormState } from '@/hooks/jobs/useJobFormState';
import { useJobImageManager } from '@/hooks/jobs/useJobImageManager';
import JobMainInfoSection from '@/components/jobs/form/JobMainInfoSection';
import JobDetailsSection from '@/components/jobs/form/JobDetailsSection';
import JobImagesSection from '@/components/jobs/form/JobImagesSection';
import JobAssignmentSection from '@/components/jobs/form/JobAssignmentSection';
import JobFormActions from '@/components/jobs/form/JobFormActions';
export default function JobForm({ jobToEdit = null, initialJobData = null, onSuccess, mode = 'modal', onCancel }) {
  const isPage = mode === 'page';
  const isModal = !isPage;
  const { user } = useAuth();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  const isActive = isPage || open;

  const {
    groups,
    workers,
    addWorker,
    initialForm,
    formDefaults,
    initialWorkerId,
    initialLocationSearch,
    initialImageAttachments,
    getRequestId,
    resetRequestId
  } = useJobFormData({ jobToEdit, isActive, initialJobData });

  const {
    formData,
    setFormData,
    workerId,
    setWorkerId,
    locationSearch,
    setLocationSearch,
    errors,
    setErrors,
    emptyImageErrors
  } = useJobFormState({
    formDefaults,
    initialWorkerId,
    initialLocationSearch
  });

  const {
    imageAttachments,
    setImageAttachments,
    imageErrors,
    setImageErrors,
    handleImageChange,
    handleRemoveImage,
    updateImageTitle,
    updateImageDescription,
    resetImageErrors
  } = useJobImageManager({ initialDrafts: initialImageAttachments, addToast });

  useEffect(() => {
    if (jobToEdit && isModal) {
      setOpen(true);
    }
    if (!jobToEdit && isModal) {
      setOpen(false);
    }
  }, [jobToEdit, isModal]);

  useEffect(() => {
    if (!isActive) {
      submitLockRef.current = false;
    }
  }, [isActive]);

  useEffect(() => {
    if (!jobToEdit) {
      resetRequestId();
    }
  }, [jobToEdit, resetRequestId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[notify-worker-email] submit-click', { jobId: jobToEdit?.id || null });

    const validation = validateJobForm({ formData, workerId, imageAttachments });
    setErrors(validation.errors);
    setImageErrors(validation.imageErrors);

    if (!validation.isValid) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    setLoading(true);

    const requestId = jobToEdit ? null : getRequestId();
    const payload = buildJobPayload({
      formData,
      workerId,
      userId: user?.id || null,
      jobToEdit,
      requestId
    });

    const result = await jobsService.saveJobWithImages({
      jobId: jobToEdit?.id || null,
      jobData: payload,
      imageAttachments,
      actorId: user?.id || null,
    });

    setLoading(false);
    submitLockRef.current = false;

    if (result.success) {
      addToast(result.message, 'success');

      if (!jobToEdit && result?.data?.id) {
        notifyWorker(result.data.id).then((notifyErrors) => {
          if (notifyErrors.length > 0) {
            addToast(
              `Trabajo creado, pero no se pudo enviar: ${notifyErrors.join(', ')}`,
              'error'
            );
          }
        });
      }

      if (isModal) {
        setOpen(false);
      }
      setFormData(initialForm);
      setWorkerId('');
      setLocationSearch('');
      setImageAttachments(createJobImageDrafts());
      setImageErrors(emptyImageErrors);
      resetImageErrors();
      resetRequestId();
      if (onSuccess) onSuccess(result?.data);
    } else {
      addToast(result.error, 'error');
    }
  };

  const locationOptions = useMemo(() => {
    const base = [
      'Genneia',
      'ServiFood',
      'Adium (Monteverde)',
      'Padre Bueno',
      'Los Berros',
      'CCP (Calidra)',
      'Greif',
      'Easy (Better)',
      'Clorox',
      'Ferva',
      'Aes Ullum',
      'Aes Sarmiento',
      'Proviser Sarmiento',
      'Proviser Ullum',
      'Ceramica San Lorenzo',
      'Vicunha',
      'Igarreta',
      'La Segunda Seguros',
      'Molinos',
      'Bodegas Callia',
      'Grupo Comeca',
      'Argentilemon',
      'Saint Gobain (Placo)',
      'Micro Hospital Berros',
      'Centro Por La Vida',
      'Hospital Sarmiento',
      'Hospital Pocito',
      'Hospital Calingasta',
      'Hospital Barreal',
      'Hospital mental (Zonda)',
      'Hosp Valle Fertil',
      'CAPS Bermejo',
      'Caps Tamberia',
      'CARF',
      'Baez Laspiur'
    ];

    const sorted = [...base].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    if (formData.location && !sorted.includes(formData.location)) {
      return [formData.location, ...sorted];
    }

    return sorted;
  }, [formData.location]);

  const normalizeText = (value) => (
    value
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );

  const filteredLocationOptions = useMemo(() => {
    const query = normalizeText(locationSearch);
    if (!query) return locationOptions;
    return locationOptions.filter((option) => {
      const normalizedOption = normalizeText(option);
      const words = normalizedOption.split(' ').filter(Boolean);
      return normalizedOption.includes(query) || words.some((word) => word.startsWith(query));
    });
  }, [locationOptions, locationSearch]);

  const imageSectionDescription = `Podés cargar hasta ${JOB_IMAGE_MAX_COUNT} imágenes opcionales en JPG, JPEG, PNG o WEBP. Máximo 5 MB por imagen.`;

  const formBody = (
    <form onSubmit={handleSubmit} className={isPage ? 'space-y-6 mt-2' : 'space-y-4 mt-2'}>
      {isPage ? (
        <>
          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">Datos principales</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Fecha, estado y datos de contacto de la solicitud.</p>
            </div>
            <JobMainInfoSection
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              locationSearch={locationSearch}
              setLocationSearch={setLocationSearch}
              filteredLocationOptions={filteredLocationOptions}
            />
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">Detalle del trabajo</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Tipo de acción, sector/equipo y descripción manual.</p>
            </div>
            <JobDetailsSection
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              actionTypeOptions={actionTypeOptions}
              sectorTypeOptions={sectorTypeOptions}
            />
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">Imágenes</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">{imageSectionDescription}</p>
            </div>
            <JobImagesSection
              imageAttachments={imageAttachments}
              imageErrors={imageErrors}
              isPage={isPage}
              imageSectionDescription={imageSectionDescription}
              onImageChange={handleImageChange}
              onImageRemove={handleRemoveImage}
              onTitleChange={updateImageTitle}
              onDescriptionChange={updateImageDescription}
            />
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">Asignación y costos</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Trabajador asignado y montos en pesos.</p>
            </div>
            <JobAssignmentSection
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              workerId={workerId}
              setWorkerId={setWorkerId}
              workers={workers}
              groups={groups}
              isPage={isPage}
              onWorkerCreated={addWorker}
            />
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">Acciones finales</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Guardá la solicitud o cancelá la carga.</p>
            </div>
            <JobFormActions
              loading={loading}
              jobToEdit={jobToEdit}
              onCancel={onCancel}
              variant="footer"
            />
          </section>
        </>
      ) : (
        <>
          <JobMainInfoSection
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            locationSearch={locationSearch}
            setLocationSearch={setLocationSearch}
            filteredLocationOptions={filteredLocationOptions}
          />
          <JobDetailsSection
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            actionTypeOptions={actionTypeOptions}
            sectorTypeOptions={sectorTypeOptions}
          />
          <JobImagesSection
            imageAttachments={imageAttachments}
            imageErrors={imageErrors}
            isPage={isPage}
            imageSectionDescription={imageSectionDescription}
            onImageChange={handleImageChange}
            onImageRemove={handleRemoveImage}
            onTitleChange={updateImageTitle}
            onDescriptionChange={updateImageDescription}
          />
          <JobAssignmentSection
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            workerId={workerId}
            setWorkerId={setWorkerId}
            workers={workers}
            groups={groups}
            isPage={isPage}
            onWorkerCreated={addWorker}
          />
          <JobFormActions
            loading={loading}
            jobToEdit={jobToEdit}
            onCancel={onCancel}
            variant="inline"
          />
        </>
      )}
    </form>
  );

  if (isPage) {
    return formBody;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!jobToEdit && (
        <DialogTrigger asChild>
          <Button className="w-full h-11 px-4 text-sm md:text-base bg-[#1e3a8a] hover:bg-blue-900 text-white">
            Nuevo Trabajo
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 dark:text-slate-50 form-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1e3a8a] text-2xl md:text-3xl">{jobToEdit ? 'Editar Trabajo' : 'Nuevo Trabajo'}</DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
