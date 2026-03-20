import React from 'react';

export default function AdminStatCard({ label, value }) {
  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white">
      <p className="text-xs uppercase text-gray-600 dark:text-slate-100 font-semibold">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
