
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function Card({ children, className, ...props }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-white rounded-xl shadow-lg border border-gray-100 p-6 md:p-8 transition-shadow duration-300 hover:shadow-xl", 
        className
      )} 
      {...props}
    >
      {children}
    </motion.div>
  );
}
