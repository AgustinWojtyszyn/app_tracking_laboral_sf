import {
  ACTION_META,
  ENTITY_LABELS,
  FIELD_LABELS,
  PERMISSION_LABELS,
  ROLE_LABELS
} from './adminAuditMeta';

export const normalizeActionKey = (action = '') => action.toLowerCase().replace(/\s+/g, '_');

const parseAuditValue = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

export const formatEntity = (entity) => {
  if (!entity) return 'Otro';
  return ENTITY_LABELS[entity] || entity;
};

export const getActionMeta = (action, language = 'es') => {
  const key = normalizeActionKey(action);
  const meta = ACTION_META[key];

  if (meta) {
    return {
      label: meta.label?.[language] || meta.label?.es || action?.replace(/_/g, ' ') || 'Acción',
      tone: meta.tone
    };
  }

  return {
    label: action?.replace(/_/g, ' ') || 'Acción',
    tone: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-100'
  };
};

export const formatAuditDetail = (log, language = 'es') => {
  const rawNew = log.new_value_resolved || log.new_value;
  const rawOld = log.old_value_resolved || log.old_value;
  const newValue = parseAuditValue(rawNew);
  const oldValue = parseAuditValue(rawOld);
  const lang = language === 'en' ? 'en' : 'es';
  const targetName = newValue?.user_name || newValue?.user_email || newValue?.user_id || 'Usuario';

  if (log.action && normalizeActionKey(log.action) === 'transfer_admin') {
    const name = newValue?.new_admin_name || newValue?.new_admin_email || 'Nuevo administrador';
    return lang === 'en'
      ? `Admin role transferred to ${name}.`
      : `Rol de admin transferido a ${name}.`;
  }

  if (log.action && normalizeActionKey(log.action) === 'group_created') {
    const groupName = newValue?.group_name || newValue?.name || 'Nuevo grupo';
    return lang === 'en'
      ? `Group "${groupName}" was created.`
      : `Se creó el grupo "${groupName}".`;
  }

  if (log.action && normalizeActionKey(log.action) === 'group_member_added') {
    const memberName = newValue?.added_user_name || newValue?.added_user_email || 'Un usuario';
    const groupName = newValue?.group_name || `#${newValue?.group_id || ''}`;
    return lang === 'en'
      ? `${memberName} was added to ${groupName}.`
      : `${memberName} agregado al grupo ${groupName}.`;
  }

  if (log.action && normalizeActionKey(log.action) === 'group_member_joined') {
    const memberName = newValue?.member_name || newValue?.member_email || 'Un usuario';
    const groupName = newValue?.group_name || `#${newValue?.group_id || ''}`;
    return lang === 'en'
      ? `${memberName} joined ${groupName}.`
      : `${memberName} se unió al grupo ${groupName}.`;
  }

  if (log.action && normalizeActionKey(log.action) === 'user_role_updated') {
    const prevRaw = oldValue?.role || '';
    const nextRaw = newValue?.role || prevRaw || '';
    const prevRole = ROLE_LABELS[prevRaw]?.[lang] || prevRaw || (lang === 'en' ? 'User' : 'Usuario');
    const nextRole = ROLE_LABELS[nextRaw]?.[lang] || nextRaw || (lang === 'en' ? 'User' : 'Usuario');

    if (prevRaw && prevRaw !== nextRaw) {
      return lang === 'en'
        ? `Role changed from ${prevRole} to ${nextRole} for ${targetName}.`
        : `Rol cambiado de ${prevRole} a ${nextRole} para ${targetName}.`;
    }

    return lang === 'en'
      ? `Role updated to ${nextRole} for ${targetName}.`
      : `Rol actualizado a ${nextRole} para ${targetName}.`;
  }

  if (log.action && normalizeActionKey(log.action) === 'user_permissions_updated') {
    const perms = Array.isArray(newValue?.permissions)
      ? newValue.permissions.map((p) => PERMISSION_LABELS[p]?.[lang] || p).join(', ')
      : '';
    const previousPerms = Array.isArray(oldValue?.permissions)
      ? oldValue.permissions.map((p) => PERMISSION_LABELS[p]?.[lang] || p).join(', ')
      : '';

    if (perms && previousPerms) {
      return lang === 'en'
        ? `Permissions updated for ${targetName}: ${previousPerms} → ${perms}.`
        : `Permisos actualizados para ${targetName}: ${previousPerms} → ${perms}.`;
    }

    return lang === 'en'
      ? `Permissions updated for ${targetName}${perms ? `: ${perms}` : ''}.`
      : `Permisos actualizados para ${targetName}${perms ? `: ${perms}` : ''}.`;
  }

  if (log.action && normalizeActionKey(log.action) === 'user_deleted') {
    const deletedName = oldValue?.user_name || oldValue?.user_email || targetName;
    return lang === 'en'
      ? `User deleted: ${deletedName}.`
      : `Usuario eliminado: ${deletedName}.`;
  }

  if (newValue && oldValue && typeof newValue === 'object' && typeof oldValue === 'object') {
    const diffs = Object.keys(newValue).slice(0, 3).map((key) => {
      if (key === 'user_id' || key.endsWith('_id')) return null;
      const before = oldValue[key];
      const after = newValue[key];
      if (before === after) return null;
      if (key === 'permissions' && Array.isArray(after)) {
        const mapped = after.map((p) => PERMISSION_LABELS[p]?.[lang] || p);
        return lang === 'en'
          ? `Permissions: ${mapped.join(', ')}`
          : `Permisos: ${mapped.join(', ')}`;
      }
      const label = FIELD_LABELS[key]?.[lang] || key;
      return `${label}: ${before ?? '—'} → ${after ?? '—'}`;
    }).filter(Boolean);
    if (diffs.length) return diffs.join(' • ');
  }

  if (newValue && typeof newValue === 'object') {
    const pairs = Object.entries(newValue)
      .filter(([key]) => !key.endsWith('_id'))
      .slice(0, 4)
      .map(([key, val]) => {
        const label = FIELD_LABELS[key]?.[lang] || key;
        if (Array.isArray(val)) {
          const mapped = val.map((p) => PERMISSION_LABELS[p]?.[lang] || p);
          return `${label}: ${mapped.join(', ')}`;
        }
        if (typeof val === 'object') {
          return `${label}: ${JSON.stringify(val)}`;
        }
        return `${label}: ${String(val)}`;
      });
    if (pairs.length) return pairs.join(' • ');
  }

  if (typeof newValue === 'string') return newValue;
  return lang === 'en' ? 'Action recorded' : 'Acción registrada';
};
