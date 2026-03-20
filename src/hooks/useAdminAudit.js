import { useCallback, useState } from 'react';
import { usersService } from '@/services/users.service';
import { useToast } from '@/contexts/ToastContext';

export const useAdminAudit = () => {
  const { addToast } = useToast();
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [clearingAudit, setClearingAudit] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      const { data, error } = await usersService.getAuditLogs();
      if (!error) setAuditLogs(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const handleClearAudit = useCallback(async () => {
    setClearingAudit(true);
    const previousLogs = auditLogs;
    setAuditLogs([]); // feedback visual inmediato

    const result = await usersService.clearAuditLogs();
    setClearingAudit(false);

    if (result.success) {
      await fetchAuditLogs();
      addToast(result.message, 'success');
    } else {
      setAuditLogs(previousLogs); // revertir si falla
      addToast(result.error || 'No se pudo limpiar la auditoría', 'error');
    }
  }, [addToast, auditLogs, fetchAuditLogs]);

  return {
    auditLogs,
    auditLoading,
    clearingAudit,
    fetchAuditLogs,
    handleClearAudit
  };
};
