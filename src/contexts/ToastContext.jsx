
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 pointer-events-none items-center w-full px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const Toast = ({ message, type, onClose }) => {
  const bgColors = {
    success: 'bg-white border-green-500 text-green-800 dark:bg-green-950 dark:border-green-400 dark:text-green-50',
    error: 'bg-white border-red-500 text-red-800 dark:bg-red-950 dark:border-red-400 dark:text-red-50',
    warning: 'bg-white border-yellow-500 text-yellow-800 dark:bg-amber-950 dark:border-amber-400 dark:text-amber-50',
    info: 'bg-white border-blue-500 text-blue-800 dark:bg-slate-900 dark:border-blue-400 dark:text-blue-50',
  };

  const Icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = Icons[type] || Info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      className={`pointer-events-auto flex items-center p-4 md:p-5 rounded-xl shadow-xl border min-w-[280px] max-w-lg w-full md:w-auto ${bgColors[type] || bgColors.info}`}
    >
      <Icon className="w-6 h-6 mr-3 shrink-0" />
      <span className="flex-1 text-base font-semibold break-words">{message}</span>
      <button onClick={onClose} className="ml-3 hover:opacity-70 transition-opacity text-sm font-medium">
        <X className="w-4 h-4" aria-label="Cerrar" />
      </button>
    </motion.div>
  );
};

export const useToast = () => useContext(ToastContext);
