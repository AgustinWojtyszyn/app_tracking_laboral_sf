
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import { jobsService } from '@/services/jobs.service';
import { workersService } from '@/services/workers.service';
import WorkerFormModal from '@/components/workers/WorkerFormModal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, X } from 'lucide-react';
import { validateAmount, validateCost } from '@/utils/validators';
import {
  JOB_IMAGE_ACCEPT,
  JOB_IMAGE_MAX_COUNT,
  JOB_IMAGE_MAX_DESCRIPTION_LENGTH,
  JOB_IMAGE_MAX_TITLE_LENGTH,
  createJobImageDrafts,
  getJobImageTitleFromFileName,
  validateJobImageDrafts,
  validateJobImageFile,
} from '@/utils/jobImageAttachments';

export default function JobForm({ jobToEdit = null, onSuccess, mode = 'modal', onCancel }) {
  const isPage = mode === 'page';
  const isModal = !isPage;
  const actionTypeOptions = useMemo(() => ([
    'Reparación',
    'Cambio',
    'Quitar',
    'Instalación',
    'Revisión',
    'Limpieza',
    'Ajuste',
    'Mantenimiento preventivo',
    'Mantenimiento correctivo',
    'Desobstrucción',
    'Pintura',
    'Soldadura',
    'Otro',
  ]), []);

  const sectorTypeOptions = useMemo(() => ([
    'Cocina',
    'Horno',
    'Anafe',
    'Freidora',
    'Heladera',
    'Freezer',
    'Cámara frigorífica',
    'Aire acondicionado',
    'Extractor',
    'Campana',
    'Termotanque',
    'Tanque de agua',
    'Bomba de agua',
    'Cañerías',
    'Desagüe',
    'Baño',
    'Comedor',
    'Depósito',
    'Oficina',
    'Tablero eléctrico',
    'Iluminación',
    'Puerta',
    'Ventana',
    'Piso',
    'Otro',
  ]), []);

  const { user } = useAuth();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);
  const requestIdRef = useRef(null);
  const [groups, setGroups] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workerId, setWorkerId] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  
  const initialForm = {
    date: new Date().toISOString().split('T')[0],
    title: '',
    location: '',
    requested_by: '',
    description: '',
    status: 'pending',
    group_id: '',
    editable_by_group: false,
    action_type: '',
    sector_type: '',
    sector_custom: '',
    cost_spent: '',
    amount_to_charge: ''
  };

  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [imageAttachments, setImageAttachments] = useState(() => createJobImageDrafts());
  const [imageErrors, setImageErrors] = useState(() => Array.from({ length: JOB_IMAGE_MAX_COUNT }, () => ''));

  const generateRequestId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  useEffect(() => {
    if (jobToEdit) {
      setFormData({
        ...jobToEdit,
        group_id: jobToEdit.group_id || '',
        requested_by: jobToEdit.requested_by || '',
        action_type: jobToEdit.action_type || '',
        sector_type: jobToEdit.sector_type || '',
        sector_custom: jobToEdit.sector_custom || '',
        cost_spent: jobToEdit.cost_spent ?? '',
        amount_to_charge: jobToEdit.amount_to_charge ?? '',
      });
      setWorkerId(jobToEdit.worker_id || '');
      setLocationSearch('');
      setImageAttachments(createJobImageDrafts(jobToEdit.image_attachments));
      setImageErrors(Array.from({ length: JOB_IMAGE_MAX_COUNT }, () => ''));
      if (isModal) {
        setOpen(true);
      }
      requestIdRef.current = null;
    } else {
      setFormData(initialForm);
      setWorkerId('');
      setLocationSearch('');
      setImageAttachments(createJobImageDrafts());
      setImageErrors(Array.from({ length: JOB_IMAGE_MAX_COUNT }, () => ''));
      if (isModal) {
        setOpen(false);
      }
      requestIdRef.current = null;
    }
    setErrors({});
  }, [jobToEdit, isModal]);

  useEffect(() => {
    return () => {
      imageAttachments.forEach((attachment) => {
        if (attachment?.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
    };
  }, [imageAttachments]);

  const isActive = isPage || open;

  useEffect(() => {
    if (isActive) {
      fetchGroups();
      fetchWorkers();
    }
    if (isActive && !jobToEdit) {
      requestIdRef.current = generateRequestId();
    }
    if (!isActive) {
      submitLockRef.current = false;
    }
  }, [isActive, jobToEdit]);

  const fetchGroups = async () => {
    // Only fetch groups where user is a member
    const { data } = await supabase.from('groups').select('id, name');
    if (data) setGroups(data);
  };

  const fetchWorkers = async () => {
    const result = await workersService.getWorkers();
    if (result.success && result.data) {
      setWorkers(result.data);
    }
  };

  const validate = () => {
    const newErrors = {};
    const nextImageErrors = validateJobImageDrafts(imageAttachments);
    const location = (formData.location || '').trim();
    const title = (formData.title || '').trim();
    const requester = (formData.requested_by || '').trim();
    const description = (formData.description || '').trim();
    const status = (formData.status || '').trim();
    const actionType = (formData.action_type || '').trim();
    const sectorType = (formData.sector_type || '').trim();
    const sectorCustom = (formData.sector_custom || '').trim();
    const costValue = (formData.cost_spent ?? '').toString().trim();
    const chargeValue = (formData.amount_to_charge ?? '').toString().trim();

    if (!formData.date) newErrors.date = "La fecha es requerida";
    if (title.length > 120) newErrors.title = "El título no puede superar los 120 caracteres";
    if (!status) newErrors.status = "Seleccioná un estado";
    if (!location) newErrors.location = "La ubicación es requerida";
    if (!requester) newErrors.requested_by = "Indicá quién solicita";
    if (!description) newErrors.description = "La descripción es requerida";
    if (!actionType) newErrors.action_type = "Seleccioná un tipo de acción";
    if (!sectorType) newErrors.sector_type = "Seleccioná un sector o equipo";
    if (sectorType === 'Otro' && sectorCustom.length === 0) {
      newErrors.sector_custom = "Especificá el sector o equipo";
    }
    if (!workerId) newErrors.worker_id = "Seleccioná un trabajador";
    if (!formData.group_id) newErrors.group_id = "Seleccioná un grupo";
    if (costValue) {
      const { valid, error } = validateCost(costValue);
      if (!valid) newErrors.cost_spent = error;
    }
    if (chargeValue) {
      const { valid, error } = validateAmount(chargeValue);
      if (!valid) newErrors.amount_to_charge = error;
    }
    
    setErrors(newErrors);
    setImageErrors(nextImageErrors);
    return Object.keys(newErrors).length === 0 && nextImageErrors.every((error) => !error);
  };

  const updateImageAttachment = (index, updater) => {
    setImageAttachments((current) => current.map((attachment, attachmentIndex) => {
      if (attachmentIndex !== index) {
        return attachment;
      }

      return typeof updater === 'function' ? updater(attachment) : updater;
    }));
  };

  const setImageErrorAt = (index, value) => {
    setImageErrors((current) => current.map((error, errorIndex) => (errorIndex === index ? value : error)));
  };

  const handleImageChange = (index, file) => {
    const validation = validateJobImageFile(file);
    if (!validation.valid) {
      setImageErrorAt(index, validation.error);
      addToast(validation.error, 'error');
      return;
    }

    setImageErrorAt(index, '');
    updateImageAttachment(index, (attachment) => {
      if (attachment?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.previewUrl);
      }

      const nextTitle = (attachment?.image_title || '').trim() || getJobImageTitleFromFileName(file?.name || '');

      return {
        ...attachment,
        file,
        previewUrl: file ? URL.createObjectURL(file) : null,
        image_title: nextTitle,
        image_path: null,
        image_url: null,
        file_name: file?.name || null,
        mime_type: file?.type || null,
        file_size_bytes: Number(file?.size) || null,
      };
    });
  };

  const handleRemoveImage = (index) => {
    setImageErrorAt(index, '');
    updateImageAttachment(index, (attachment) => {
      if (attachment?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.previewUrl);
      }

      return {
        ...attachment,
        file: null,
        previewUrl: null,
        image_path: null,
        image_url: null,
        file_name: null,
        mime_type: null,
        file_size_bytes: null,
      };
    });
  };

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData?.session || null;
    if (!session) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data?.session || null;
    }
    return session?.access_token || null;
  };

  const invokeFunction = async (name, payload) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const accessToken = await getAccessToken();

    if (!supabaseUrl || !supabaseAnonKey) {
      return { error: 'Falta configuración de Supabase.' };
    }

    if (!accessToken) {
      return { error: 'No hay sesión activa.' };
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }

    if (!res.ok) {
      return { error: data?.error || `HTTP ${res.status}` };
    }

    return { data };
  };

  const notifyWorker = async (jobId) => {
    try {
      const result = await invokeFunction('notify-worker-email', { job_id: jobId });
      if (result?.error) {
        console.warn('notify-worker-email error', result.error);
        return ['Email'];
      }
      return [];
    } catch (error) {
      console.warn('notify-worker-email failed', error);
      return ['Email'];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    setLoading(true);
    const costValue = (formData.cost_spent ?? '').toString().trim();
    const chargeValue = (formData.amount_to_charge ?? '').toString().trim();
    const sectorCustomValue = (formData.sector_custom || '').toString().trim();
    // Construimos el payload solo con columnas reales de la tabla jobs,
    // evitando enviar relaciones como "groups" o "users" que vienen
    // embebidas en jobToEdit y provocan errores PGRST204.
    const payload = {
      date: formData.date,
      title: formData.title?.trim() || null,
      location: formData.location || '',
      requested_by: formData.requested_by || '',
      description: formData.description || '',
      status: formData.status,
      editable_by_group: formData.editable_by_group,
      worker_id: workerId,
      group_id: formData.group_id || null,
      action_type: formData.action_type || null,
      sector_type: formData.sector_type || null,
      sector_custom: sectorCustomValue ? sectorCustomValue : null,
      cost_spent: costValue ? Number(costValue) : 0,
      amount_to_charge: chargeValue ? Number(chargeValue) : null,
    };
    if (!jobToEdit) {
      payload.user_id = user?.id || null;
      if (!requestIdRef.current) {
        requestIdRef.current = generateRequestId();
      }
      payload.client_request_id = requestIdRef.current;
    }

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
      setImageAttachments(createJobImageDrafts());
      setImageErrors(Array.from({ length: JOB_IMAGE_MAX_COUNT }, () => ''));
      requestIdRef.current = null;
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

  const mainFields = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Fecha *</label>
          <input
            type="date"
            className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
          />
          {errors.date && <span className="text-xs text-red-500">{errors.date}</span>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Estado</label>
          <select
            className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value })}
            required
          >
            <option value="pending">Pendiente</option>
            <option value="completed">Completado</option>
            <option value="archived">Archivado</option>
          </select>
          {errors.status && <span className="text-xs text-red-500">{errors.status}</span>}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Título</label>
        <input
          type="text"
          maxLength="120"
          className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
          value={formData.title || ''}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ej: Reparación TV sala principal"
        />
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-slate-400">
          <span>Opcional. Si lo dejás vacío, se seguirá usando la descripción como referencia principal.</span>
          <span>{(formData.title || '').length}/120</span>
        </div>
        {errors.title && <span className="text-xs text-red-500">{errors.title}</span>}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Ubicación</label>
        <input
          className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
          value={locationSearch}
          onChange={e => setLocationSearch(e.target.value)}
          placeholder="Buscar empresa..."
        />
        <div className="mt-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 max-h-40 overflow-y-auto">
          {formData.location && (
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, location: '' });
                setLocationSearch('');
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-slate-800 border-b border-gray-100 dark:border-slate-800"
            >
              <span>Quitar selección</span>
              <X className="w-4 h-4" />
            </button>
          )}
          {filteredLocationOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">Sin resultados</div>
          ) : (
            filteredLocationOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, location: option });
                  setLocationSearch(option);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-800 ${
                  formData.location === option ? 'bg-blue-100 dark:bg-slate-800' : ''
                }`}
              >
                {option}
              </button>
            ))
          )}
        </div>
        {formData.location && (
          <div className="mt-1 text-xs text-gray-600 dark:text-slate-300">
            Seleccionado: <span className="font-semibold">{formData.location}</span>
          </div>
        )}
        {errors.location && <span className="text-xs text-red-500">{errors.location}</span>}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Quién solicita</label>
        <input
          className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
          value={formData.requested_by || ''}
          onChange={e => setFormData({ ...formData, requested_by: e.target.value })}
          placeholder="Nombre del solicitante"
          required
        />
        {errors.requested_by && <span className="text-xs text-red-500">{errors.requested_by}</span>}
      </div>
    </>
  );

  const detailFields = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Tipo de acción</label>
          <select
            className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
            value={formData.action_type || ''}
            onChange={e => setFormData({ ...formData, action_type: e.target.value })}
            required
          >
            <option value="">Seleccionar...</option>
            {actionTypeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {errors.action_type && <span className="text-xs text-red-500">{errors.action_type}</span>}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Sector / equipo</label>
          <select
            className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
            value={formData.sector_type || ''}
            onChange={e => {
              const nextValue = e.target.value;
              setFormData({
                ...formData,
                sector_type: nextValue,
                sector_custom: nextValue === 'Otro' ? formData.sector_custom : '',
              });
            }}
            required
          >
            <option value="">Seleccionar...</option>
            {sectorTypeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {errors.sector_type && <span className="text-xs text-red-500">{errors.sector_type}</span>}
        </div>
      </div>

      {formData.sector_type === 'Otro' && (
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Especificar sector o equipo</label>
          <input
            type="text"
            maxLength={120}
            className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
            value={formData.sector_custom || ''}
            onChange={e => setFormData({ ...formData, sector_custom: e.target.value })}
            placeholder="Ej: Cámara de fermentación"
          />
          {errors.sector_custom && <span className="text-xs text-red-500">{errors.sector_custom}</span>}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Descripción</label>
        <textarea
          className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
          rows="3"
          value={formData.description || ''}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detalles del trabajo, referencias, etc."
          required
        />
        {errors.description && <span className="text-xs text-red-500">{errors.description}</span>}
      </div>
    </>
  );

  const imageFields = (
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
                    onClick={() => handleRemoveImage(index)}
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
                    handleImageChange(index, nextFile);
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
                    updateImageAttachment(index, (current) => ({
                      ...current,
                      image_title: nextValue,
                    }));

                    const validation = validateJobImageDrafts(
                      imageAttachments.map((entry, entryIndex) => (
                        entryIndex === index
                          ? { ...entry, image_title: nextValue }
                          : entry
                      ))
                    );
                    setImageErrorAt(index, validation[index] || '');
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
                    updateImageAttachment(index, (current) => ({
                      ...current,
                      image_description: nextValue,
                    }));

                    const validation = validateJobImageDrafts(
                      imageAttachments.map((entry, entryIndex) => (
                        entryIndex === index
                          ? { ...entry, image_description: nextValue }
                          : entry
                      ))
                    );
                    setImageErrorAt(index, validation[index] || '');
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

  const assignmentFields = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Costo trabajador</label>
          <input
            type="number"
            min="0"
            step="1"
            className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
            value={formData.cost_spent ?? ''}
            onChange={e => setFormData({ ...formData, cost_spent: e.target.value })}
            placeholder="Pago al trabajador"
          />
          {errors.cost_spent && <span className="text-xs text-red-500">{errors.cost_spent}</span>}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Cobrar</label>
          <input
            type="number"
            min="0"
            step="1"
            className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
            value={formData.amount_to_charge ?? ''}
            onChange={e => setFormData({ ...formData, amount_to_charge: e.target.value })}
            placeholder="Monto a cobrar"
          />
          {errors.amount_to_charge && <span className="text-xs text-red-500">{errors.amount_to_charge}</span>}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Trabajador asignado *</label>
              <select
                className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
                value={workerId}
                onChange={e => setWorkerId(e.target.value)}
                required
              >
                <option value="">Seleccionar trabajador...</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.display_name || w.alias || 'Sin nombre'}
                  </option>
                ))}
              </select>
              {errors.worker_id && <span className="text-xs text-red-500">{errors.worker_id}</span>}
              {workers.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No hay trabajadores creados. Creá uno para poder asignarlo.
                </p>
              )}
              <WorkerFormModal
                onSaved={(newWorker) => {
                  setWorkers((prev) => [...prev, newWorker]);
                  setWorkerId(newWorker.id);
                }}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6 h-9 px-3 text-xs md:text-sm text-[#1e3a8a] border-blue-200"
                  >
                    + Crear trabajador
                  </Button>
                }
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-100">Grupo</label>
            <select
              className="w-full mt-1 p-2 border border-gray-300 dark:border-slate-700 rounded focus:border-[#1e3a8a] outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50"
              value={formData.group_id}
              onChange={e => setFormData({ ...formData, group_id: e.target.value })}
              required
            >
              <option value="">Ninguno</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            {errors.group_id && <span className="text-xs text-red-500">{errors.group_id}</span>}
          </div>
          <div className="flex items-center pt-2 md:pt-6">
            <input
              type="checkbox"
              id={isPage ? 'editable-page' : 'editable'}
              className="mr-2 h-4 w-4 text-[#1e3a8a]"
              checked={formData.editable_by_group}
              onChange={e => setFormData({ ...formData, editable_by_group: e.target.checked })}
            />
            <label htmlFor={isPage ? 'editable-page' : 'editable'} className="text-sm text-gray-700 dark:text-slate-100">
              Editable por grupo
            </label>
          </div>
        </div>
      </div>
    </>
  );

  const actionsSection = (
    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
      <Button
        type="button"
        variant="outline"
        className="h-11 px-4"
        disabled={loading}
        onClick={() => {
          if (onCancel) onCancel();
        }}
      >
        Cancelar
      </Button>
      <Button type="submit" disabled={loading} className="h-11 px-5 bg-[#1e3a8a] hover:bg-blue-900 text-white">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {jobToEdit ? 'Actualizar' : 'Guardar'}
      </Button>
    </div>
  );

  const formBody = (
    <form onSubmit={handleSubmit} className={isPage ? 'space-y-6 mt-2' : 'space-y-4 mt-2'}>
      {isPage ? (
        <>
          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">Datos principales</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Fecha, estado y datos de contacto de la solicitud.</p>
            </div>
            {mainFields}
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">Detalle del trabajo</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Tipo de acción, sector/equipo y descripción manual.</p>
            </div>
            {detailFields}
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">Imágenes</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">{imageSectionDescription}</p>
            </div>
            {imageFields}
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">Asignación y costos</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Trabajador asignado y montos en pesos.</p>
            </div>
            {assignmentFields}
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">Acciones finales</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Guardá la solicitud o cancelá la carga.</p>
            </div>
            {actionsSection}
          </section>
        </>
      ) : (
        <>
          {mainFields}
          {detailFields}
          {imageFields}
          {assignmentFields}
          <Button type="submit" disabled={loading} className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white mt-4">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {jobToEdit ? 'Actualizar' : 'Guardar'}
          </Button>
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
