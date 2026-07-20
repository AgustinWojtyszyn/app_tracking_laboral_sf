import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function JobFormActions({
  loading,
  jobToEdit,
  onCancel,
  variant = 'footer',
  submitLabel = null
}) {
  const defaultLabel = jobToEdit ? 'Actualizar' : 'Guardar';
  const label = submitLabel || defaultLabel;

  if (variant === 'inline') {
    return (
      <Button type="submit" disabled={loading} className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white mt-4">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
      <Button
        type="button"
        variant="outline"
        className="h-11 px-4"
        disabled={loading}
        onClick={() => {
          if (onCancel) onCancel();
        }}
      >
        Cancelar
      </Button>
      <Button type="submit" disabled={loading} className="h-11 px-5 bg-[#1e3a8a] hover:bg-blue-900 text-white">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {label}
      </Button>
    </div>
  );
}
