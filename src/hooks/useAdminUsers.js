import { useCallback, useState } from 'react';
import { usersService } from '@/services/users.service';
import { useToast } from '@/contexts/ToastContext';

export const normalizePermissions = (value) => {
  if (Array.isArray(value)) return value.filter((p) => p !== 'billing');
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => p !== 'billing');
  }
  return [];
};

export const useAdminUsers = ({ currentUserId, featureOptions = [], onAuditRefresh } = {}) => {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [selectedUser, setSelectedUser] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [revokingUserId, setRevokingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const response = await usersService.getAllUsers();

      if (response.success) {
        setUsers(response.data || []);
        const draftMap = {};

        response.data?.forEach((u) => {
          draftMap[u.id] = {
            role: u.role || 'user',
            permissions: normalizePermissions(u.permissions)
          };
        });

        setDrafts(draftMap);

        const firstNonAdmin = response.data?.find((u) => u.role !== 'admin');
        setSelectedUser((prev) => prev || firstNonAdmin?.id || '');
      }
    } catch (error) {
      addToast('Error cargando usuarios', 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [addToast]);

  const handleRoleChange = useCallback((userId, role) => {
    const allFeatures = featureOptions.map((f) => f.key);

    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        role,
        permissions: role === 'admin' ? allFeatures : prev[userId]?.permissions || []
      }
    }));
  }, [featureOptions]);

  const togglePermission = useCallback((userId, permission) => {
    setDrafts((prev) => {
      const current = prev[userId] || { role: 'user', permissions: [] };
      const permissions = current.permissions.includes(permission)
        ? current.permissions.filter((p) => p !== permission)
        : [...current.permissions, permission];

      return {
        ...prev,
        [userId]: {
          ...current,
          permissions
        }
      };
    });
  }, []);

  const saveUserChanges = useCallback(async (userId) => {
    const draft = drafts[userId];
    if (!draft) return;
    if (userId === currentUserId) return;

    setSavingUserId(userId);

    try {
      const roleResult = await usersService.updateUserRole(userId, draft.role);
      if (!roleResult.success) throw new Error(roleResult.error);

      const permissionsResult = await usersService.updateUserPermissions(userId, draft.permissions);
      if (!permissionsResult.success) throw new Error(permissionsResult.error);

      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: draft.role, permissions: draft.permissions } : u));
      addToast('Cambios guardados', 'success');
      if (onAuditRefresh) await onAuditRefresh();
    } catch (error) {
      addToast(error.message || 'No se pudieron guardar los cambios', 'error');
    } finally {
      setSavingUserId(null);
    }
  }, [addToast, currentUserId, drafts, onAuditRefresh]);

  const handleTransferAdmin = useCallback(async () => {
    if (!selectedUser) return;
    try {
      setUsersLoading(true);
      const result = await usersService.transferAdminRole(selectedUser);
      if (result.success) {
        addToast('Rol de administrador transferido correctamente.', 'success');
        await fetchUsers();
        if (onAuditRefresh) await onAuditRefresh();
      } else {
        addToast(result.error, 'error');
      }
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [addToast, fetchUsers, onAuditRefresh, selectedUser]);

  const handleRevokeAdmin = useCallback(async (targetUser) => {
    if (!targetUser || targetUser.id === currentUserId) return;

    setRevokingUserId(targetUser.id);

    try {
      const result = await usersService.updateUserRole(targetUser.id, 'user');
      if (!result.success) throw new Error(result.error);

      setUsers((prev) => prev.map((u) => u.id === targetUser.id ? { ...u, role: 'user' } : u));
      setDrafts((prev) => ({
        ...prev,
        [targetUser.id]: {
          role: 'user',
          permissions: normalizePermissions(targetUser.permissions)
        }
      }));

      addToast('Admin removido correctamente.', 'success');
      if (onAuditRefresh) await onAuditRefresh();
    } catch (error) {
      addToast(error.message || 'No se pudo quitar admin', 'error');
    } finally {
      setRevokingUserId(null);
    }
  }, [addToast, currentUserId, onAuditRefresh]);

  const handleDeleteUser = useCallback(async (targetUser) => {
    if (!targetUser || targetUser.id === currentUserId) return;

    setDeletingUserId(targetUser.id);

    try {
      const result = await usersService.deleteUser(targetUser.id);
      if (!result.success) throw new Error(result.error);

      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[targetUser.id];
        return next;
      });

      if (selectedUser === targetUser.id) {
        const nextNonAdmin = users.find((u) => u.id !== targetUser.id && u.role !== 'admin');
        setSelectedUser(nextNonAdmin?.id || '');
      }

      addToast('Usuario eliminado correctamente.', 'success');
      if (onAuditRefresh) await onAuditRefresh();
    } catch (error) {
      addToast(error.message || 'No se pudo eliminar el usuario', 'error');
    } finally {
      setDeletingUserId(null);
    }
  }, [addToast, currentUserId, onAuditRefresh, selectedUser, users]);

  return {
    users,
    usersLoading,
    drafts,
    setDrafts,
    selectedUser,
    setSelectedUser,
    fetchUsers,
    handleRoleChange,
    togglePermission,
    saveUserChanges,
    handleTransferAdmin,
    handleRevokeAdmin,
    handleDeleteUser,
    savingUserId,
    revokingUserId,
    deletingUserId
  };
};
