import React, { useEffect, useState } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { UserPlus, Users, Mail } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

export default function WorkersPage() {
  const { loading, getAllUsers } = useUsers();
  const { addToast } = useToast();
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    const fetchWorkers = async () => {
      const result = await getAllUsers();
      if (result.success) {
        setWorkers(result.data || []);
      } else {
        addToast(result.error || 'Error al cargar trabajadores', 'error');
      }
    };
    fetchWorkers();
  }, [getAllUsers, addToast]);

  if (loading && workers.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trabajadores</h1>
          <p className="text-gray-500">Personas a las que podés asignar trabajos</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => window.open('/register', '_blank')}
        >
          <UserPlus className="w-5 h-5" />
          Crear nuevo trabajador
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {workers.length === 0 ? (
          <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-3">
            <Users className="w-10 h-10 text-gray-300" />
            <p className="font-medium">Todavía no hay trabajadores registrados.</p>
            <p className="text-sm max-w-md">
              Para crear un trabajador, registrá un nuevo usuario desde la pantalla de registro.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-6 py-3">Nombre</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Rol</th>
                    <th className="px-6 py-3">Fecha alta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workers.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{w.full_name || 'Sin nombre'}</td>
                      <td className="px-6 py-3">{w.email}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          w.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {w.role || 'trabajador'}
                        </span>
                      </td>
                      <td className="px-6 py-3">{formatDate(w.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {workers.map((w) => (
                <div key={w.id} className="p-4 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">{w.full_name || 'Sin nombre'}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        w.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {w.role || 'trabajador'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Mail className="w-4 h-4 mr-1" /> {w.email}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Alta: {formatDate(w.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
