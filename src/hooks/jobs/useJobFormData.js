import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { workersService } from '@/services/workers.service';

const buildInitialForm = () => ({
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
});

const hydrateFormForEdit = (jobToEdit, initialForm) => ({
  ...initialForm,
  ...jobToEdit,
  group_id: jobToEdit.group_id || '',
  requested_by: jobToEdit.requested_by || '',
  action_type: jobToEdit.action_type || '',
  sector_type: jobToEdit.sector_type || '',
  sector_custom: jobToEdit.sector_custom || '',
  cost_spent: jobToEdit.cost_spent ?? '',
  amount_to_charge: jobToEdit.amount_to_charge ?? ''
});

export const useJobFormData = ({ jobToEdit, isActive } = {}) => {
  const [groups, setGroups] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const requestIdRef = useRef(null);
  const addWorker = useCallback((worker) => {
    setWorkers((prev) => [...prev, worker]);
  }, []);

  const initialForm = useMemo(() => buildInitialForm(), []);

  const formDefaults = useMemo(() => {
    if (!jobToEdit) return initialForm;
    return hydrateFormForEdit(jobToEdit, initialForm);
  }, [jobToEdit, initialForm]);

  const initialWorkerId = jobToEdit?.worker_id || '';
  const initialLocationSearch = '';
  const initialImageAttachments = jobToEdit?.image_attachments || null;

  const generateRequestId = useCallback(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const getRequestId = useCallback(() => {
    if (!requestIdRef.current) {
      requestIdRef.current = generateRequestId();
    }
    return requestIdRef.current;
  }, [generateRequestId]);

  const resetRequestId = useCallback(() => {
    requestIdRef.current = null;
  }, []);

  const fetchGroups = useCallback(async () => {
    const { data } = await supabase.from('groups').select('id, name');
    if (data) setGroups(data);
  }, []);

  const fetchWorkers = useCallback(async () => {
    const result = await workersService.getWorkers();
    if (result.success && result.data) {
      setWorkers(result.data);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setDataLoading(true);
      await Promise.all([fetchGroups(), fetchWorkers()]);
      if (isMounted) {
        setDataLoading(false);
      }
    };

    if (isActive) {
      load();
    }

    if (isActive && !jobToEdit) {
      requestIdRef.current = generateRequestId();
    }

    if (jobToEdit) {
      requestIdRef.current = null;
    }

    return () => {
      isMounted = false;
    };
  }, [fetchGroups, fetchWorkers, generateRequestId, isActive, jobToEdit]);

  return {
    groups,
    workers,
    addWorker,
    dataLoading,
    initialForm,
    formDefaults,
    initialWorkerId,
    initialLocationSearch,
    initialImageAttachments,
    getRequestId,
    resetRequestId,
  };
};
