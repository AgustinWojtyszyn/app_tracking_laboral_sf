
import React from 'react';
import { Users, Calendar, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/formatters';

export default function GroupCard({ group, isCreator, onViewMembers, onDelete }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="font-bold text-xl text-gray-900">{group.name}</h3>
                <p className="text-base text-gray-600 mt-1 line-clamp-2">{group.description || 'Sin descripción'}</p>
            </div>
            <div className="bg-blue-50 p-2 rounded-full">
                <Users className="w-5 h-5 text-blue-900" />
            </div>
        </div>
        
        <div className="flex items-center text-base text-gray-600 mb-6 gap-5">
            <span className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                {group.group_members[0]?.count || 0} Miembros
            </span>
            <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {formatDate(group.created_at)}
            </span>
        </div>

        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onViewMembers}>
                Gestionar
            </Button>
            {isCreator && onDelete && (
                 <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    Eliminar
                </Button>
            )}
        </div>
    </div>
  );
}
