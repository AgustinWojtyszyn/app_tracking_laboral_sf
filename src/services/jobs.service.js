
import { supabase } from '@/lib/customSupabaseClient';
import {
  JOB_IMAGE_MAX_COUNT,
  JOB_IMAGE_SIZE_ERROR,
  normalizeJobImageDraftInput,
  sanitizeJobImageFileName,
  validateJobImageDrafts,
  validateJobImageFile,
} from '@/utils/jobImageAttachments';

const JOB_IMAGES_BUCKET = 'job-request-images';

const createStorageToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeJobImageAttachmentsForSave = (drafts) => {
  return drafts
    .slice(0, JOB_IMAGE_MAX_COUNT)
    .map((draft, index) => {
      const imageTitle = (draft?.image_title || '').trim();
      const description = (draft?.image_description || '').trim();
      const hasImage = !!(draft?.image_path || draft?.image_url);
      if (!hasImage && !imageTitle && !description) {
        return null;
      }

      return {
        image_path: draft?.image_path || null,
        image_url: draft?.image_url || null,
        image_title: imageTitle || null,
        image_description: description || null,
        file_name: draft?.file_name || null,
        mime_type: draft?.mime_type || null,
        file_size_bytes: Number.isFinite(Number(draft?.file_size_bytes)) ? Number(draft.file_size_bytes) : null,
        sort_order: index,
      };
    })
    .filter(Boolean);
};

const extractAttachmentPaths = (attachments) => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .map((attachment) => attachment?.image_path || null)
    .filter(Boolean);
};

const resolveStorageErrorMessage = (error) => {
  const message = error?.message || error?.error || '';
  if (/exceeded the maximum allowed size|file size/i.test(message)) {
    return JOB_IMAGE_SIZE_ERROR;
  }

  if (/mime type|invalid file type|content type/i.test(message)) {
    return 'Solo se permiten imágenes JPG, JPEG, PNG o WEBP';
  }

  return 'No se pudo subir una de las imágenes.';
};

const hydrateJobImageAttachments = (attachments) => {
  if (!Array.isArray(attachments)) {
    return attachments;
  }

  return attachments.map((attachment) => {
    if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) {
      return attachment;
    }

    if (attachment.image_url || !attachment.image_path) {
      return attachment;
    }

    const { data } = supabase.storage.from(JOB_IMAGES_BUCKET).getPublicUrl(attachment.image_path);
    return {
      ...attachment,
      image_url: data?.publicUrl || null,
    };
  });
};

const hydrateJobRecord = (job) => {
  if (!job || typeof job !== 'object') {
    return job;
  }

  return {
    ...job,
    image_attachments: hydrateJobImageAttachments(job.image_attachments),
  };
};

export const jobsService = {
  async cleanupUploadedImages(paths = []) {
    const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
    if (uniquePaths.length === 0) {
      return;
    }

    const { error } = await supabase.storage.from(JOB_IMAGES_BUCKET).remove(uniquePaths);
    if (error) {
      console.warn('cleanupUploadedImages error', error);
    }
  },

  async uploadJobImage(file, { userId, jobIdentifier }) {
    const validation = validateJobImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const sanitizedName = sanitizeJobImageFileName(file.name || 'imagen');
    const objectPath = `${userId}/${jobIdentifier}/${createStorageToken()}-${sanitizedName}`;
    const { error } = await supabase.storage
      .from(JOB_IMAGES_BUCKET)
      .upload(objectPath, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

    if (error) {
      throw new Error(resolveStorageErrorMessage(error));
    }

    const { data } = supabase.storage.from(JOB_IMAGES_BUCKET).getPublicUrl(objectPath);
    return {
      image_path: objectPath,
      image_url: data?.publicUrl || null,
      file_name: sanitizedName,
      mime_type: file.type || null,
      file_size_bytes: Number(file.size) || null,
    };
  },

  async saveJobWithImages({ jobId = null, jobData, imageAttachments = [], actorId = null } = {}) {
    const uploadedPaths = [];

    try {
      if (Array.isArray(imageAttachments) && imageAttachments.length > JOB_IMAGE_MAX_COUNT) {
        return { success: false, error: 'Solo podés adjuntar hasta 3 imágenes.' };
      }

      const attachmentDrafts = normalizeJobImageDraftInput(imageAttachments);
      const validationErrors = validateJobImageDrafts(attachmentDrafts);
      const firstError = validationErrors.find(Boolean);
      if (firstError) {
        return { success: false, error: firstError };
      }

      const { userId } = await this.resolveActorContext(actorId || jobData?.user_id || null);
      if (!userId) {
        return { success: false, error: 'No hay sesión activa.' };
      }

      let previousJob = null;
      if (jobId) {
        const previousResult = await supabase
          .from('jobs')
          .select('id, image_attachments')
          .eq('id', jobId)
          .single();

        if (previousResult.error) {
          throw previousResult.error;
        }

        previousJob = previousResult.data;
      }

      const jobIdentifier = jobId || jobData?.client_request_id || createStorageToken();
      const finalDrafts = [];

      for (let index = 0; index < attachmentDrafts.length; index += 1) {
        const draft = attachmentDrafts[index];
        const nextDraft = {
          ...draft,
          sort_order: index,
        };

        if (draft?.file) {
          const uploaded = await this.uploadJobImage(draft.file, { userId, jobIdentifier });
          uploadedPaths.push(uploaded.image_path);
          finalDrafts.push({
            ...nextDraft,
            ...uploaded,
            previewUrl: uploaded.image_url,
            file: null,
          });
          continue;
        }

        finalDrafts.push({
          ...nextDraft,
          previewUrl: nextDraft.image_url || null,
          file: null,
        });
      }

      const normalizedAttachments = normalizeJobImageAttachmentsForSave(finalDrafts);
      const payload = {
        ...jobData,
        image_attachments: normalizedAttachments.length > 0 ? normalizedAttachments : null,
      };

      const result = jobId
        ? await this.updateJob(jobId, payload, actorId)
        : await this.createJob(payload);

      if (!result.success) {
        await this.cleanupUploadedImages(uploadedPaths);
        return result;
      }

      if (previousJob?.image_attachments) {
        const previousPaths = extractAttachmentPaths(previousJob.image_attachments);
        const nextPaths = extractAttachmentPaths(payload.image_attachments);
        const removedPaths = previousPaths.filter((path) => !nextPaths.includes(path));
        await this.cleanupUploadedImages(removedPaths);
      }

      return {
        ...result,
        data: hydrateJobRecord({
          ...result.data,
          image_attachments: payload.image_attachments,
        }),
      };
    } catch (error) {
      await this.cleanupUploadedImages(uploadedPaths);
      console.error('saveJobWithImages error', error);
      return { success: false, error: error?.message || 'No se pudo guardar la solicitud con imágenes.' };
    }
  },

  async resolveActorContext(providedUserId = null) {
    const { data: authData } = await supabase.auth.getUser();
    const userId = providedUserId || authData?.user?.id || null;
    if (!userId) return { userId: null, groupIds: [], isAdmin: false };

    const { data: profile } = await supabase.from('users').select('role').eq('id', userId).single();
    const isAdmin = profile?.role === 'admin';

    let memberships = [];
    const membershipQuery = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (membershipQuery.error) {
      // Si la columna status no existe (error 42703) u otro error de esquema, seguimos sin filtrar por estado.
      if (membershipQuery.error.code === '42703') {
        const fallback = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId);
        memberships = fallback.data || [];
      } else {
        console.warn('resolveActorContext - error obteniendo membresías:', membershipQuery.error);
      }
    } else {
      memberships = membershipQuery.data || [];
    }

    // Normalizar a string para evitar problemas de comparación (p. ej. bigint vs string)
    const groupIds = (memberships || [])
      .map(m => m.group_id)
      .filter(Boolean)
      .map((id) => id.toString());

    return { userId, groupIds, isAdmin };
  },

  async getJobsByDateRange(startDate, endDate, filters = {}) {
    try {
      const { userId, groupIds, isAdmin } = await this.resolveActorContext(filters.currentUserId);
      const requestedGroupId = filters.groupId ? filters.groupId.toString() : null;
      if (!userId) return { success: true, data: [] };
      if (!isAdmin && requestedGroupId && requestedGroupId !== 'all' && !groupIds.includes(requestedGroupId)) {
        return { success: true, data: [] };
      }

      // Consulta principal intentando incluir relaciones de grupos, trabajadores y creador.
      // Usamos la FK explícita jobs_group_id_fkey para que PostgREST no
      // intente usar una columna inexistente llamada "groups" en jobs.
      let baseQuery = supabase
        .from('jobs')
        .select('*, groups:groups!jobs_group_id_fkey(name), workers:workers!jobs_worker_id_fkey(display_name, alias), creator:users!jobs_user_id_fkey(full_name, email)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      let orFilters = [];
      if (!isAdmin) {
        if (groupIds.length > 0) {
          // Comillas para soportar UUID/strings y evitar comparaciones fallidas
          const groupList = groupIds.map((id) => `"${id}"`).join(',');
          orFilters.push(`group_id.in.(${groupList})`);
        }
        orFilters.push(`user_id.eq.${userId}`);
        baseQuery = baseQuery.or(orFilters.join(','));
      }

      if (filters.status && filters.status !== 'all') baseQuery = baseQuery.eq('status', filters.status);
      if (filters.groupId && filters.groupId !== 'all') baseQuery = baseQuery.eq('group_id', filters.groupId);
      if (filters.workerId && filters.workerId !== 'all') baseQuery = baseQuery.eq('worker_id', filters.workerId);
      if (filters.search) {
        baseQuery = baseQuery.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
      }

      let { data, error } = await baseQuery;

      // Si hay un error de esquema relacionado con 'groups' (PGRST204),
      // hacemos un fallback a una consulta sin relaciones para no romper la app.
      if (error && error.code === 'PGRST204') {
        console.warn("Fallo relación jobs->groups, usando fallback sin joins:", error.message);

        let fallbackQuery = supabase
          .from('jobs')
          .select('*, creator:users!jobs_user_id_fkey(full_name, email)')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false });

        if (!isAdmin) {
          fallbackQuery = fallbackQuery.or(orFilters.join(','));
        }

        if (filters.status && filters.status !== 'all') fallbackQuery = fallbackQuery.eq('status', filters.status);
        if (filters.groupId && filters.groupId !== 'all') fallbackQuery = fallbackQuery.eq('group_id', filters.groupId);
        if (filters.workerId && filters.workerId !== 'all') fallbackQuery = fallbackQuery.eq('worker_id', filters.workerId);
        if (filters.search) {
          fallbackQuery = fallbackQuery.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
        }

        const fallbackResult = await fallbackQuery;
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;
      const safeData = Array.isArray(data) ? data.map(hydrateJobRecord) : [];
      return { success: true, data: safeData };
    } catch (error) {
      console.error("GetJobs Error:", error);
      return { success: false, data: [], error: "Error al cargar trabajos. Verifique su conexión." };
    }
  },

  async getJobsByDay(date) {
    return this.getJobsByDateRange(date, date);
  },

  async createJob(jobData) {
    try {
      // Prefer DB-generated idempotency_key if present.
      let { data, error } = await supabase
        .from('jobs')
        .upsert([jobData], { onConflict: 'idempotency_key' })
        .select()
        .single();

      if (error && (error.code === '42703' || /idempotency_key/i.test(error.message))) {
        // Fallback if column doesn't exist yet.
        const useIdempotency = !!jobData?.client_request_id;
        const fallback = useIdempotency
          ? supabase.from('jobs').upsert([jobData], { onConflict: 'client_request_id' }).select().single()
          : supabase.from('jobs').insert([jobData]).select().single();
        const fallbackResult = await fallback;
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;
      return { success: true, data, message: "Trabajo creado exitosamente" };
    } catch (error) {
      return { success: false, error: "Error al crear el trabajo." };
    }
  },

  async updateJob(id, jobData, actorId = null) {
    try {
      const { userId, groupIds, isAdmin } = await this.resolveActorContext(actorId);
      if (!userId) return { success: false, error: "No hay sesión activa." };

      const { data: existing, error: fetchError } = await supabase
        .from('jobs')
        .select('user_id, group_id, editable_by_group')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      if (!existing) return { success: false, error: "Trabajo no encontrado." };

      const isCreator = existing.user_id === userId;
      const canEditByGroup = existing.editable_by_group && existing.group_id && groupIds.includes(existing.group_id);
      if (!isCreator && !canEditByGroup && !isAdmin) {
        return { success: false, error: "No tienes permisos para editar este trabajo." };
      }

      const { error } = await supabase.from('jobs').update(jobData).eq('id', id);
      if (error) throw error;
      return { success: true, message: "Trabajo actualizado exitosamente" };
    } catch (error) {
      return { success: false, error: "Error al actualizar el trabajo." };
    }
  },

  async deleteJob(id, { actorId = null, allowAdmin = true } = {}) {
    try {
      const { userId, isAdmin } = await this.resolveActorContext(actorId);
      if (!userId) return { success: false, error: "No hay sesión activa." };

      const { data: existing, error: fetchError } = await supabase
        .from('jobs')
        .select('user_id, image_attachments')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      if (!existing) return { success: false, error: "Trabajo no encontrado." };

      const isCreator = existing.user_id === userId;
      const adminAllowed = allowAdmin && isAdmin;
      if (!isCreator && !adminAllowed) {
        return { success: false, error: "Solo el creador puede eliminar este trabajo." };
      }

      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      await this.cleanupUploadedImages(extractAttachmentPaths(existing.image_attachments));
      return { success: true, message: "Trabajo eliminado exitosamente" };
    } catch (error) {
      return { success: false, error: "Error al eliminar el trabajo." };
    }
  },

  async deleteCompletedJobs(startDate, endDate) {
    try {
      const { error, count } = await supabase
        .from('jobs')
        .delete({ count: 'exact' })
        .eq('status', 'completed')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      return { success: true, message: "Trabajos completados eliminados", removed: count || 0 };
    } catch (error) {
      return { success: false, error: "No se pudieron limpiar los trabajos completados." };
    }
  },

  async deletePendingJobs(startDate, endDate) {
    try {
      const { error, count } = await supabase
        .from('jobs')
        .delete({ count: 'exact' })
        .eq('status', 'pending')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      return { success: true, message: "Trabajos pendientes eliminados", removed: count || 0 };
    } catch (error) {
      return { success: false, error: "No se pudieron limpiar los trabajos pendientes." };
    }
  },

  async getJobStats(startDate, endDate) {
    try {
      const { data, error } = await supabase.rpc('get_job_stats', { start_date: startDate, end_date: endDate });
      
      if (error) {
         // Fallback manual calculation if RPC fails or doesn't exist yet
         console.warn("RPC get_job_stats failed, using fallback:", error);
         const { data: jobs } = await supabase
            .from('jobs')
            .select('hours_worked, cost_spent, amount_to_charge')
            .gte('date', startDate)
            .lte('date', endDate);
            
         if (!jobs) return { success: true, data: { total_hours: 0, total_cost: 0, total_charge: 0, job_count: 0 }};

         const stats = jobs.reduce((acc, job) => ({
             total_hours: acc.total_hours + (Number(job.hours_worked) || 0),
             total_cost: acc.total_cost + (Number(job.cost_spent) || 0),
             total_charge: acc.total_charge + (Number(job.amount_to_charge) || 0),
             job_count: acc.job_count + 1
         }), { total_hours: 0, total_cost: 0, total_charge: 0, job_count: 0 });
         
         return { success: true, data: stats };
      }
      return { success: true, data: data[0] };
    } catch (error) {
      return { success: false, error: "Error al cargar estadísticas." };
    }
  }
};
