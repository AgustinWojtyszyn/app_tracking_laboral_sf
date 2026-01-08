
import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Alert({ children, variant = 'info', className, onClose, ...props }) {
  const variants = {
    success: {
      style: "bg-green-50 border-l-4 border-green-500 text-green-700",
      icon: CheckCircle,
      iconColor: "text-green-600"
    },
    error: {
      style: "bg-red-50 border-l-4 border-red-500 text-red-700",
      icon: AlertCircle,
      iconColor: "text-red-600"
    },
    warning: {
      style: "bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800",
      icon: AlertTriangle,
      iconColor: "text-yellow-600"
    },
    info: {
      style: "bg-blue-50 border-l-4 border-blue-500 text-blue-700",
      icon: Info,
      iconColor: "text-blue-600"
    }
  };

  const currentVariant = variants[variant] || variants.info;
  const Icon = currentVariant.icon;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={cn("relative w-full rounded-r-lg p-4 flex gap-3 shadow-sm", currentVariant.style, className)}
        role="alert"
        {...props}
      >
        <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", currentVariant.iconColor)} />
        <div className="text-sm font-medium flex-1 [&>p]:leading-relaxed">
          {children}
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
