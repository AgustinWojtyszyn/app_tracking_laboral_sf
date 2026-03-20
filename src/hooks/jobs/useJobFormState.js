import { useEffect, useMemo, useState } from 'react';
import { JOB_IMAGE_MAX_COUNT } from '@/utils/jobImageAttachments';

export const useJobFormState = ({
  formDefaults,
  initialWorkerId,
  initialLocationSearch,
  initialImageErrors
} = {}) => {
  const [formData, setFormData] = useState(formDefaults);
  const [workerId, setWorkerId] = useState(initialWorkerId || '');
  const [locationSearch, setLocationSearch] = useState(initialLocationSearch || '');
  const [errors, setErrors] = useState({});

  const emptyImageErrors = useMemo(() => (
    initialImageErrors || Array.from({ length: JOB_IMAGE_MAX_COUNT }, () => '')
  ), [initialImageErrors]);

  useEffect(() => {
    setFormData(formDefaults);
    setWorkerId(initialWorkerId || '');
    setLocationSearch(initialLocationSearch || '');
    setErrors({});
  }, [formDefaults, initialWorkerId, initialLocationSearch]);

  return {
    formData,
    setFormData,
    workerId,
    setWorkerId,
    locationSearch,
    setLocationSearch,
    errors,
    setErrors,
    emptyImageErrors
  };
};
