import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BrandHeader() {
  const { t } = useLanguage();

  return (
    <header className="w-full">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0c1d3a] via-[#1e3a8a] to-[#0c1d3a] shadow-lg rounded-2xl md:rounded-[18px] px-4 py-4 sm:px-6 sm:py-5 md:px-7 md:py-6 flex justify-center">
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="relative flex flex-col items-center text-center gap-2">
          <img
            src="/servifood_logo_white_text_HQ.png"
            alt="Servifood Catering"
            className="h-14 sm:h-20 md:h-28 w-auto drop-shadow-xl"
            loading="lazy"
          />
          <span className="text-lg sm:text-2xl md:text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-lime-200 drop-shadow-[0_10px_24px_rgba(255,255,255,0.35)] italic">
            {t('brand')}
          </span>
        </div>
      </div>
    </header>
  );
}
