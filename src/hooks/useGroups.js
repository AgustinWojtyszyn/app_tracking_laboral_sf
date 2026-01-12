
import { useState, useCallback } from 'react';
import { groupsService } from '@/services/groups.service';

export const useGroups = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getGroups = useCallback(async (userId) => {
    setLoading(true);
    const result = await groupsService.getAllGroups(userId);
    setLoading(false);
    if (!result.success) setError(result.error);
    return result;
  }, []);

  const createGroup = useCallback(async (data, userId) => {
    setLoading(true);
    const result = await groupsService.createGroup(data, userId);
    setLoading(false);
    return result;
  }, []);

  const deleteGroup = useCallback(async (id) => {
    setLoading(true);
    const result = await groupsService.deleteGroup(id);
    setLoading(false);
    return result;
  }, []);

  const getGroupMembers = useCallback(async (groupId) => {
      setLoading(true);
      const result = await groupsService.getGroupMembers(groupId);
      setLoading(false);
      return result;
  }, []);

  const addMember = useCallback(async (groupId, email) => {
      setLoading(true);
      const result = await groupsService.addMember(groupId, email);
      setLoading(false);
      return result;
  }, []);

  const removeMember = useCallback(async (groupId, userId) => {
      setLoading(true);
      const result = await groupsService.removeMember(groupId, userId);
      setLoading(false);
      return result;
  }, []);

  const updateMemberRole = useCallback(async (groupId, userId, role) => {
      setLoading(true);
      const result = await groupsService.updateMemberRole(groupId, userId, role);
      setLoading(false);
      return result;
  }, []);

    const requestToJoin = useCallback(async (groupId, userId) => {
      setLoading(true);
      const result = await groupsService.requestToJoin(groupId, userId);
      setLoading(false);
      return result;
    }, []);

  return { 
      loading, 
      error, 
      getGroups, 
      createGroup, 
      deleteGroup, 
      getGroupMembers, 
      addMember, 
      removeMember,
      updateMemberRole,
      requestToJoin
  };
};
