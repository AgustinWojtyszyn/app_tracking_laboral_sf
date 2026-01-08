
import React from 'react';
import { cn } from '@/lib/utils';

export default function Input({ 
  label, 
  className, 
  error, 
  id,
  hint,
  type = "text",
  ...props 
}) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={id} 
          className="text-sm font-semibold leading-none text-gray-800 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={type}
          className={cn(
            "flex h-12 w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",
            error && "border-red-500 focus-visible:ring-red-100 focus-visible:border-red-500",
            className
          )}
          {...props}
        />
      </div>
      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="text-sm font-medium text-red-600 animate-in slide-in-from-top-1 fade-in duration-200">{error}</p>
      )}
    </div>
  );
}
