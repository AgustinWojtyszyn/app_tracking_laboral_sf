import React from 'react';
import servifoodLogo from '@/assets/servifood_logo.png';

export default function BrandHeader() {
  return (
    <header className="w-full">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0c1d3a] via-[#1e3a8a] to-[#0c1d3a] shadow-lg rounded-2xl md:rounded-[18px] px-7 py-6 flex justify-center">
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.08),transparent_35%)]" />
        <img
          src={servifoodLogo}
          alt="Servifood Catering"
          className="relative h-24 sm:h-28 w-auto drop-shadow-xl"
          loading="lazy"
        />
      </div>
    </header>
  );
}
