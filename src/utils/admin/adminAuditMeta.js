export const ACTION_META = {
  group_created: {
    label: { es: 'Grupo creado', en: 'Group created' },
    tone: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100'
  },
  group_member_added: {
    label: { es: 'Miembro agregado', en: 'Member added' },
    tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100'
  },
  group_member_joined: {
    label: { es: 'Usuario se unió', en: 'User joined' },
    tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100'
  },
  transfer_admin: {
    label: { es: 'Transferencia de admin', en: 'Admin transfer' },
    tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-100'
  },
  user_role_updated: {
    label: { es: 'Rol actualizado', en: 'Role updated' },
    tone: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100'
  },
  user_permissions_updated: {
    label: { es: 'Permisos actualizados', en: 'Permissions updated' },
    tone: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-100'
  },
  user_deleted: {
    label: { es: 'Usuario eliminado', en: 'User deleted' },
    tone: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-100'
  }
};

export const ENTITY_LABELS = {
  group: 'Grupo',
  group_member: 'Miembro de grupo',
  users: 'Usuario',
  user: 'Usuario',
  job: 'Trabajo'
};

export const ROLE_LABELS = {
  admin: { es: 'Administrador', en: 'Admin' },
  user: { es: 'Usuario', en: 'User' }
};

export const PERMISSION_LABELS = {
  jobs: { es: 'Trabajos y reportes', en: 'Jobs & reports' },
  groups: { es: 'Grupos y equipos', en: 'Groups & teams' },
  audit: { es: 'Auditoría', en: 'Audit' }
};

export const FIELD_LABELS = {
  role: { es: 'Rol', en: 'Role' },
  permissions: { es: 'Permisos', en: 'Permissions' },
  group_name: { es: 'Grupo', en: 'Group' },
  member_name: { es: 'Miembro', en: 'Member' },
  added_user_name: { es: 'Miembro agregado', en: 'Added member' },
  new_admin_name: { es: 'Nuevo admin', en: 'New admin' },
  member_email: { es: 'Email', en: 'Email' },
  user_email: { es: 'Email', en: 'Email' },
  new_admin_email: { es: 'Email', en: 'Email' }
};
