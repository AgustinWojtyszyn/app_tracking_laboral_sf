
import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

function Button({ 
  children, 
  className, 
  variant = 'primary', 
  loading = false, 
  disabled, 
  type = 'button',
  onClick,
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed h-12 px-6 w-full";
  
  const variants = {
    primary: "bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 focus-visible:ring-[#1e3a8a]",
    secondary: "border-2 border-[#1e3a8a] text-[#1e3a8a] bg-transparent hover:bg-blue-50 focus-visible:ring-[#1e3a8a]",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
    success: "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type={type}
      className={cn(baseStyles, variants[variant], className)}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {typeof children === 'string' ? 'Cargando...' : children}
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}

export { Button };
export default Button;
