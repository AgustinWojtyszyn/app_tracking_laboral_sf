import React from 'react';
import { Mail, Search, Trash2 } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { Button } from '@/components/ui/button';

export default function AdminUsersSection({
  filteredUsers,
  drafts,
  featureOptions,
  roleOptions,
  search,
  onSearchChange,
  filterRole,
  onFilterRoleChange,
  currentUserId,
  savingUserId,
  revokingUserId,
  deletingUserId,
  onRoleChange,
  onTogglePermission,
  onRevokeAdmin,
  onDeleteUser,
  onSaveUserChanges,
  onResetUserDraft,
  normalizePermissions,
  statsPanel
}) {
  return (
    <div className="grid lg:grid-cols-[2fr,1fr] gap-4 lg:gap-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden text-gray-900 dark:text-white" data-tour="admin-usuarios">
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase text-gray-700 dark:text-slate-200 font-semibold">USUARIOS</p>
            <h3 className="font-bold text-xl text-gray-900 dark:text-slate-50">Roles y funciones</h3>
            <p className="text-base text-gray-500 dark:text-slate-300">Elige el rol y habilita solo las funciones necesarias.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="relative w-full md:w-60">
              <Search className="w-4 h-4 text-gray-400 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full border border-gray-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-700 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                placeholder="Buscar por email o nombre"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <select
              className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-700 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
              value={filterRole}
              onChange={(e) => onFilterRoleChange(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="admin">Admins</option>
              <option value="chofer">Choferes</option>
              <option value="user">Usuarios</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {filteredUsers.map((u) => {
            const draft = drafts[u.id] || { role: u.role, permissions: normalizePermissions(u.permissions) };
            const isAdmin = draft.role === 'admin';
            const isCurrentUser = u.id === currentUserId;

            return (
              <div key={u.id} className="p-4 space-y-3 bg-white dark:bg-slate-900 transition border-b border-gray-100 dark:border-slate-800 last:border-b-0 text-gray-900 dark:text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-bold text-xl text-gray-900 dark:text-slate-50">{u.full_name || 'Sin nombre'}</p>
                    <div className="flex items-center text-base text-gray-600 dark:text-slate-300">
                      <Mail className="w-3 h-3 mr-1" /> {u.email}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    Registrado: {formatDate(u.created_at)}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase text-gray-700 dark:text-slate-200 font-semibold mb-1 block">ROL</label>
                    {isCurrentUser ? (
                      <div className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-semibold">
                        {roleOptions.find((r) => r.value === draft.role)?.label || draft.role}
                      </div>
                    ) : (
                      <select
                        className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                        value={draft.role}
                        onChange={(e) => onRoleChange(u.id, e.target.value)}
                      >
                        {roleOptions.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div data-tour="admin-roles">
                    <label className="text-xs uppercase text-gray-700 dark:text-slate-200 font-semibold mb-2 block">
                      Funciones activas
                    </label>
                    {isCurrentUser ? (
                      <div className="flex flex-wrap gap-2">
                        {featureOptions.map((feature) => {
                          const active = draft.role === 'admin' || draft.permissions?.includes(feature.key);
                          return (
                            <span
                              key={feature.key}
                              className={`px-3 py-1 rounded-full text-xs border ${
                                active
                                  ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-white dark:border-blue-800'
                                  : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-white dark:border-slate-700'
                              }`}
                            >
                              {feature.label}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {featureOptions.map((feature) => {
                          const active = draft.permissions?.includes(feature.key);
                          return (
                            <button
                              key={feature.key}
                              type="button"
                              onClick={() => onTogglePermission(u.id, feature.key)}
                              className={`px-3 py-1 rounded-full text-xs border transition focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 ${
                                active
                                  ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-white dark:border-blue-800'
                                  : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-white dark:border-slate-700'
                              }`}
                              disabled={isAdmin}
                            >
                              {feature.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {isAdmin && !isCurrentUser && (
                      <p className="text-[11px] text-blue-800 dark:text-blue-200 mt-1">Los administradores tienen todas las funciones.</p>
                    )}
                  </div>
                </div>

                {!isCurrentUser && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                    {isAdmin && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onRevokeAdmin(u)}
                        disabled={revokingUserId === u.id}
                      >
                        {revokingUserId === u.id ? 'Quitando admin...' : 'Quitar admin'}
                      </Button>
                    )}
                    <ConfirmationModal
                      title="¿Eliminar usuario?"
                      description="El usuario será eliminado definitivamente y esta acción quedará registrada en la auditoría."
                      confirmLabel="Sí, eliminar"
                      onConfirm={() => onDeleteUser(u)}
                      trigger={
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={deletingUserId === u.id}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {deletingUserId === u.id ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                      }
                    />
                    <Button
                      variant="outline"
                      disabled={savingUserId === u.id}
                      onClick={() => onResetUserDraft(u)}
                    >
                      Deshacer
                    </Button>
                    <Button
                      className="bg-blue-900 text-white hover:bg-blue-900 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-700 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                      onClick={() => onSaveUserChanges(u.id)}
                      disabled={savingUserId === u.id}
                    >
                      {savingUserId === u.id ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="p-6 text-center text-base text-gray-600 dark:text-slate-200">
              No encontramos usuarios con esos filtros.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {statsPanel}
      </div>
    </div>
  );
}
