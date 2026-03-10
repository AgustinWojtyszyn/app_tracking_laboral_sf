export const JOB_IMAGE_MAX_COUNT = 3;
export const JOB_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const JOB_IMAGE_MAX_TITLE_LENGTH = 120;
export const JOB_IMAGE_MAX_DESCRIPTION_LENGTH = 200;
export const JOB_IMAGE_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const JOB_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
export const JOB_IMAGE_SIZE_ERROR = 'La imagen no puede superar los 5 MB';
export const JOB_IMAGE_TYPE_ERROR = 'Solo se permiten imágenes JPG, JPEG, PNG o WEBP';
export const JOB_IMAGE_TITLE_ERROR = `El título de la imagen no puede superar los ${JOB_IMAGE_MAX_TITLE_LENGTH} caracteres`;
export const JOB_IMAGE_DESCRIPTION_ERROR = `La descripción no puede superar los ${JOB_IMAGE_MAX_DESCRIPTION_LENGTH} caracteres`;

const EMPTY_STRING = '';

const normalizeText = (value) => (typeof value === 'string' ? value : EMPTY_STRING);

const hasAllowedExtension = (fileName) => {
  const normalizedName = normalizeText(fileName).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].some((extension) => normalizedName.endsWith(extension));
};

export const sanitizeJobImageFileName = (fileName) => {
  const normalizedName = normalizeText(fileName)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const fallbackName = normalizedName || 'imagen';
  return fallbackName.slice(0, 80);
};

export const getJobImageTitleFromFileName = (fileName) => {
  const normalizedName = normalizeText(fileName).trim();
  if (!normalizedName) {
    return 'Imagen';
  }

  return normalizedName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Imagen';
};

export const validateJobImageFile = (file) => {
  if (!file) {
    return { valid: true, error: null };
  }

  const mimeType = normalizeText(file.type).toLowerCase();
  const isValidType = JOB_IMAGE_ALLOWED_MIME_TYPES.includes(mimeType) || hasAllowedExtension(file.name);
  if (!isValidType) {
    return { valid: false, error: JOB_IMAGE_TYPE_ERROR };
  }

  if (Number(file.size) > JOB_IMAGE_MAX_SIZE_BYTES) {
    return { valid: false, error: JOB_IMAGE_SIZE_ERROR };
  }

  return { valid: true, error: null };
};

export const validateJobImageDescription = (value) => {
  const description = normalizeText(value).trim();
  const valid = description.length <= JOB_IMAGE_MAX_DESCRIPTION_LENGTH;
  return {
    valid,
    error: valid ? null : JOB_IMAGE_DESCRIPTION_ERROR,
  };
};

export const validateJobImageTitle = (value) => {
  const title = normalizeText(value).trim();
  const valid = title.length <= JOB_IMAGE_MAX_TITLE_LENGTH;
  return {
    valid,
    error: valid ? null : JOB_IMAGE_TITLE_ERROR,
  };
};

export const normalizeStoredJobImageAttachments = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .slice(0, JOB_IMAGE_MAX_COUNT)
    .map((item, index) => ({
      image_path: normalizeText(item.image_path) || null,
      image_url: normalizeText(item.image_url) || null,
      image_title: normalizeText(item.image_title),
      image_description: normalizeText(item.image_description),
      file_name: normalizeText(item.file_name) || null,
      mime_type: normalizeText(item.mime_type) || null,
      file_size_bytes: Number.isFinite(Number(item.file_size_bytes)) ? Number(item.file_size_bytes) : null,
      sort_order: Number.isInteger(item.sort_order) ? item.sort_order : index,
    }))
    .sort((left, right) => left.sort_order - right.sort_order);
};

export const createEmptyJobImageAttachment = (index) => ({
  sort_order: index,
  image_path: null,
  image_url: null,
  image_title: EMPTY_STRING,
  image_description: EMPTY_STRING,
  file_name: null,
  mime_type: null,
  file_size_bytes: null,
  file: null,
  previewUrl: null,
});

export const createJobImageDrafts = (storedValue = null) => {
  const normalized = normalizeStoredJobImageAttachments(storedValue);
  return Array.from({ length: JOB_IMAGE_MAX_COUNT }, (_, index) => {
    const existing = normalized[index];
    if (!existing) {
      return createEmptyJobImageAttachment(index);
    }

    return {
      ...createEmptyJobImageAttachment(index),
      ...existing,
      previewUrl: existing.image_url || null,
    };
  });
};

export const normalizeJobImageDraftInput = (value) => {
  if (!Array.isArray(value)) {
    return createJobImageDrafts();
  }

  return Array.from({ length: JOB_IMAGE_MAX_COUNT }, (_, index) => {
    const source = value[index];
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return createEmptyJobImageAttachment(index);
    }

    return {
      ...createEmptyJobImageAttachment(index),
      ...source,
      sort_order: Number.isInteger(source.sort_order) ? source.sort_order : index,
      image_path: normalizeText(source.image_path) || null,
      image_url: normalizeText(source.image_url) || null,
      image_title: normalizeText(source.image_title),
      image_description: normalizeText(source.image_description),
      file_name: normalizeText(source.file_name) || null,
      mime_type: normalizeText(source.mime_type) || null,
      file_size_bytes: Number.isFinite(Number(source.file_size_bytes)) ? Number(source.file_size_bytes) : null,
      file: source.file || null,
      previewUrl: normalizeText(source.previewUrl) || normalizeText(source.image_url) || null,
    };
  });
};

export const validateJobImageDrafts = (drafts) => {
  return drafts.slice(0, JOB_IMAGE_MAX_COUNT).map((draft) => {
    const fileValidation = validateJobImageFile(draft?.file || null);
    if (!fileValidation.valid) {
      return fileValidation.error;
    }

    const titleValidation = validateJobImageTitle(draft?.image_title || EMPTY_STRING);
    if (!titleValidation.valid) {
      return titleValidation.error;
    }

    const descriptionValidation = validateJobImageDescription(draft?.image_description || EMPTY_STRING);
    if (!descriptionValidation.valid) {
      return descriptionValidation.error;
    }

    return EMPTY_STRING;
  });
};
