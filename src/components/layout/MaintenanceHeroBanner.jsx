import React from 'react';

export default function MaintenanceHeroBanner() {
  return (
    <section className="maintenance-hero" aria-labelledby="maintenance-hero-title">
      <div className="maintenance-hero__lights" aria-hidden="true" />
      <div className="maintenance-hero__content">
        <h1 id="maintenance-hero-title" className="maintenance-hero__title">
          PANEL DE MANTENIMIENTO
        </h1>
        <div className="maintenance-hero__stars" aria-label="Tres campeonatos mundiales">
          <span aria-hidden="true">★</span>
          <span aria-hidden="true">★</span>
          <span aria-hidden="true">★</span>
        </div>
        <img
          src="/servifood_logo_white_text_HQ.png"
          alt="ServiFood Catering"
          className="maintenance-hero__logo"
          loading="lazy"
        />
      </div>
      <div className="maintenance-hero__flag" aria-hidden="true">
        <div className="maintenance-hero__sun" />
      </div>
    </section>
  );
}
