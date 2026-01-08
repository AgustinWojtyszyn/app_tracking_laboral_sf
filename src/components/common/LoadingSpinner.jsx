
import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = "Cargando..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-gray-500">
      <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#1e3a8a]" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
