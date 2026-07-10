import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import BrandHeader from '@/components/layout/BrandHeader';
import LanguageToggle from '@/components/layout/LanguageToggle';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AuthLayout({ children, icon: Icon, title, subtitle, backTo = '/', backLabel }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen relative flex flex-col bg-gradient-to-br from-white via-slate-50 to-gray-100 p-4 font-sans text-gray-900 transition-colors duration-300 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50">
      <div className="relative z-10 mb-6">
        <BrandHeader />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-lg"
        >
          <div className="mb-4 flex items-center justify-end gap-2">
            <ThemeToggle className="border border-border/70 bg-background/80 shadow-md" />
            <LanguageToggle />
          </div>

          <Link
            to={backTo}
            className="mb-8 inline-flex items-center text-base font-semibold text-[#1e3a8a] transition-colors hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-2 dark:text-blue-200 dark:hover:text-blue-100"
          >
            <ArrowLeft className="mr-2 h-5 w-5" aria-hidden="true" />
            {backLabel || t('auth.backHome')}
          </Link>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/10 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-8 md:p-10">
            <div className="mb-8 text-center">
              {Icon ? (
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                  <Icon className="h-6 w-6 text-[#1e3a8a] dark:text-blue-200" aria-hidden="true" />
                </div>
              ) : null}
              <h1 className="text-2xl font-bold text-[#1e3a8a] dark:text-blue-200">{title}</h1>
              {subtitle ? (
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">{subtitle}</p>
              ) : null}
            </div>

            {children}
          </section>
        </motion.div>
      </main>
    </div>
  );
}
