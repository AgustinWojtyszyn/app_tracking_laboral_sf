import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { workersService } from '@/services/workers.service';
import { normalizeJobStatus } from '@/utils/jobStatus';

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
  status: normalizeJobStatus(jobToEdit.status || jobToEdit.estado),
  group_id: jobToEdit.group_id || '',
  requested_by: jobToEdit.requested_by || '',
  action_type: jobToEdit.action_type || '',
  sector_type: jobToEdit.sector_type || '',
  sector_custom: jobToEdit.sector_custom || '',
  cost_spent: jobToEdit.cost_spent ?? '',
  amount_to_charge: jobToEdit.amount_to_charge ?? ''
});

const hydrateFormForCreate = (initialJobData, initialForm) => ({
  ...initialForm,
  ...(initialJobData || {}),
  status: initialForm.status,
  group_id: initialJobData?.group_id || '',
  editable_by_group: Boolean(initialJobData?.editable_by_group),
  requested_by: initialJobData?.requested_by || '',
  action_type: initialJobData?.action_type || '',
  sector_type: initialJobData?.sector_type || '',
  sector_custom: initialJobData?.sector_custom || '',
  cost_spent: initialJobData?.cost_spent ?? '',
  amount_to_charge: initialJobData?.amount_to_charge ?? ''
});

export const shouldApplyJobFormLoadResult = ({ isMounted, loadId, currentLoadId }) => (
  Boolean(isMounted && loadId === currentLoadId)
);

export const useJobFormData = ({ jobToEdit, isActive, initialJobData = null } = {}) => {
  const [groups, setGroups] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const requestIdRef = useRef(null);
  const mountedRef = useRef(false);
  const loadIdRef = useRef(0);
  const addWorker = useCallback((worker) => {
    if (!mountedRef.current) return;
    setWorkers((prev) => [...prev, worker]);
  }, []);

  const initialForm = useMemo(() => buildInitialForm(), []);

  const formDefaults = useMemo(() => {
    if (jobToEdit) return hydrateFormForEdit(jobToEdit, initialForm);
    if (initialJobData) return hydrateFormForCreate(initialJobData, initialForm);
    return initialForm;
  }, [jobToEdit, initialForm, initialJobData]);

  const initialWorkerId = jobToEdit?.worker_id || initialJobData?.worker_id || '';
  const initialLocationSearch = jobToEdit ? '' : (initialJobData?.location || '');
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
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;
    if (!userId) {
      return [];
    }

    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase.from('users').select('role').eq('id', userId).maybeSingle(),
      supabase.from('group_members').select('group_id').eq('user_id', userId),
    ]);

    let query = supabase.from('groups').select('id, name, created_by').order('name', { ascending: true });
    if (profile?.role !== 'admin') {
      const groupIds = (memberships || []).map((membership) => membership.group_id).filter(Boolean);
      const quotedIds = groupIds.map((id) => `"${id}"`).join(',');
      const ownedOrMemberFilter = quotedIds
        ? `created_by.eq.${userId},id.in.(${quotedIds})`
        : `created_by.eq.${userId}`;
      query = query.or(ownedOrMemberFilter);
    }

    const { data } = await query;
    return data || [];
  }, []);

  const fetchWorkers = useCallback(async () => {
    const result = await workersService.getWorkers();
    if (result.success && result.data) {
      return result.data;
    }
    return [];
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;

    const load = async () => {
      if (!mountedRef.current) return;
      setDataLoading(true);
      try {
        const [nextGroups, nextWorkers] = await Promise.all([fetchGroups(), fetchWorkers()]);
        if (!shouldApplyJobFormLoadResult({
          isMounted: mountedRef.current,
          loadId,
          currentLoadId: loadIdRef.current
        })) return;
        setGroups(nextGroups);
        setWorkers(nextWorkers);
      } finally {
        if (shouldApplyJobFormLoadResult({
          isMounted: mountedRef.current,
          loadId,
          currentLoadId: loadIdRef.current
        })) {
          setDataLoading(false);
        }
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
      mountedRef.current = false;
      loadIdRef.current += 1;
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
