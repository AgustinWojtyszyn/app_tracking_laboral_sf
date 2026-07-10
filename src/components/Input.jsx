
import React from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({ 
  label, 
  className, 
  error, 
  id,
  hint,
  type = "text",
  showPasswordToggle = false,
  ...props 
}) {
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
  const isPassword = type === 'password';
  const resolvedType = showPasswordToggle && isPassword && isPasswordVisible ? 'text' : type;
  const ToggleIcon = isPasswordVisible ? EyeOff : Eye;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={id} 
          className="text-sm font-semibold leading-none text-gray-800 dark:text-slate-100 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={resolvedType}
          className={cn(
            "flex h-12 w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 caret-[#1e3a8a] placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:border-[#1e3a8a] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 disabled:opacity-70 transition-colors duration-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:caret-blue-200 dark:placeholder:text-slate-400 dark:disabled:bg-slate-900 dark:disabled:text-slate-400",
            showPasswordToggle && isPassword && "pr-12",
            error && "border-red-500 focus-visible:ring-red-100 focus-visible:border-red-500",
            className
          )}
          {...props}
        />
        {showPasswordToggle && isPassword && (
          <button
            type="button"
            aria-label={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setIsPasswordVisible((current) => !current)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-gray-500 transition-colors hover:text-[#1e3a8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:text-blue-200"
          >
            <ToggleIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
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
