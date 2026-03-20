import React from 'react';
import { Button } from '@/components/ui/button';
import { formatAuditDetail, formatEntity, getActionMeta } from '@/utils/admin/adminAuditFormatters';

export default function AdminAuditSection({ auditLogs, auditLoading, clearingAudit, onClearAudit, language }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white">
      <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase text-gray-700 dark:text-slate-200 font-semibold">Auditoría</p>
          <h3 className="font-bold text-xl text-gray-900 dark:text-slate-50">Actividad reciente</h3>
          <p className="text-sm text-gray-500 dark:text-slate-300">Mostrando las últimas 50 acciones con nombres de usuario.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-200 dark:border-slate-700">
            {auditLogs.length} registros
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAudit}
            disabled={clearingAudit}
            className="text-sm"
          >
            {clearingAudit ? 'Limpiando...' : 'Limpiar historial'}
          </Button>
        </div>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 sticky top-0">
            <tr>
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Usuario</th>
              <th className="px-6 py-3">Acción</th>
              <th className="px-6 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {auditLogs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-gray-600 dark:text-slate-200">
                  Aún no hay registros de auditoría.
                </td>
              </tr>
            )}
            {auditLogs.map((log) => {
              const actionMeta = getActionMeta(log.action, language);
              const actorName = log.user_full_name || log.user_email || 'Sistema';
              const actorEmail = log.user_email && log.user_full_name ? log.user_email : null;
              const detail = formatAuditDetail(log, language);

              return (
                <tr key={log.id} className="bg-white dark:bg-slate-900">
                  <td className="px-6 py-4 align-top">
                    <div className="font-medium text-gray-900 dark:text-slate-50">{new Date(log.timestamp).toLocaleString()}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-300">{formatEntity(log.entity_type)}</div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="font-medium text-gray-900 dark:text-slate-50">{actorName}</div>
                    {actorEmail && <div className="text-xs text-gray-500 dark:text-slate-300">{actorEmail}</div>}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${actionMeta.tone}`}>
                      {actionMeta.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 align-top text-gray-800 dark:text-slate-50">
                    <div className="text-sm">{detail}</div>
                    {log.entity_type && (
                      <div className="text-xs text-gray-500 dark:text-slate-300 mt-1">
                        {formatEntity(log.entity_type)}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
