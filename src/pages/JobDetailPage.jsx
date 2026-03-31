import React from 'react';
import { useParams } from 'react-router-dom';
import { useJobById } from '@/hooks/useJobById';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function JobDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useJobById(id);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-600">
        No hay detalle para mostrar.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      Detail
    </div>
  );
}
