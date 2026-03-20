import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createJobImageDrafts,
  getJobImageTitleFromFileName,
  JOB_IMAGE_MAX_COUNT,
  validateJobImageDrafts,
  validateJobImageFile
} from '@/utils/jobImageAttachments';

const createEmptyErrors = () => Array.from({ length: JOB_IMAGE_MAX_COUNT }, () => '');

export const useJobImageManager = ({ initialDrafts, addToast } = {}) => {
  const [imageAttachments, setImageAttachments] = useState(() => (
    initialDrafts ? createJobImageDrafts(initialDrafts) : createJobImageDrafts()
  ));
  const [imageErrors, setImageErrors] = useState(() => createEmptyErrors());

  const resolvedInitialDrafts = useMemo(() => (
    initialDrafts ? createJobImageDrafts(initialDrafts) : createJobImageDrafts()
  ), [initialDrafts]);

  useEffect(() => {
    setImageAttachments(resolvedInitialDrafts);
    setImageErrors(createEmptyErrors());
  }, [resolvedInitialDrafts]);

  useEffect(() => {
    return () => {
      imageAttachments.forEach((attachment) => {
        if (attachment?.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
    };
  }, [imageAttachments]);

  const updateImageAttachment = useCallback((index, updater) => {
    setImageAttachments((current) => current.map((attachment, attachmentIndex) => {
      if (attachmentIndex !== index) {
        return attachment;
      }

      return typeof updater === 'function' ? updater(attachment) : updater;
    }));
  }, []);

  const setImageErrorAt = useCallback((index, value) => {
    setImageErrors((current) => current.map((error, errorIndex) => (errorIndex === index ? value : error)));
  }, []);

  const handleImageChange = useCallback((index, file) => {
    const validation = validateJobImageFile(file);
    if (!validation.valid) {
      setImageErrorAt(index, validation.error);
      if (addToast) addToast(validation.error, 'error');
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
  }, [addToast, setImageErrorAt, updateImageAttachment]);

  const handleRemoveImage = useCallback((index) => {
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
  }, [setImageErrorAt, updateImageAttachment]);

  const updateImageTitle = useCallback((index, nextValue) => {
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
  }, [imageAttachments, setImageErrorAt, updateImageAttachment]);

  const updateImageDescription = useCallback((index, nextValue) => {
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
  }, [imageAttachments, setImageErrorAt, updateImageAttachment]);

  return {
    imageAttachments,
    setImageAttachments,
    imageErrors,
    setImageErrors,
    updateImageAttachment,
    setImageErrorAt,
    handleImageChange,
    handleRemoveImage,
    updateImageTitle,
    updateImageDescription,
    resetImageErrors: () => setImageErrors(createEmptyErrors())
  };
};
