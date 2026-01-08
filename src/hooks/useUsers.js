
import { useState, useCallback } from 'react';
import { usersService } from '@/services/users.service';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useUsers = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const getAllUsers = useCallback(async () => {
    setLoading(true);
    const result = await usersService.getAllUsers();
    setLoading(false);
    return result;
  }, []);

  const transferAdminRole = useCallback(async (targetUserId) => {
    setLoading(true);
    const result = await usersService.transferAdminRole(targetUserId);
    setLoading(false);
    return result;
  }, []);

  const getAuditLogs = useCallback(async (filters) => {
    setLoading(true);
    const result = await usersService.getAuditLogs(filters);
    setLoading(false);
    return result;
  }, []);

  const updateProfile = useCallback(async (userId, data) => {
      setLoading(true);
      const result = await usersService.updateUserProfile(userId, data);
      setLoading(false);
      return result;
  }, []);

  return { loading, getAllUsers, transferAdminRole, getAuditLogs, updateProfile };
};
