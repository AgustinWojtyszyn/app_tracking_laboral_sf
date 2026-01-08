
import React from 'react';
import JobForm from '@/components/jobs/JobForm';

// Simple wrapper page if needed for routing directly to a form, 
// though mostly we use the modal. keeping it for /jobs/new route
export default function JobFormPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-[#1e3a8a]">Gestión de Trabajo</h1>
      <div className="bg-white p-6 rounded-lg shadow">
         <JobForm onSuccess={() => window.history.back()} />
      </div>
    </div>
  );
}
