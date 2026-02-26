
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, TrendingUp, Users, Download, ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/layout/ThemeToggle';
import LanguageToggle from '@/components/layout/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import BrandHeader from '@/components/layout/BrandHeader';

export default function LandingPage() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Helmet>
        <title>App de seguimiento laboral</title>
      </Helmet>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between sm:justify-end">
            <div className="flex sm:hidden items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <LanguageToggle />
                <ThemeToggle />
              </div>
              <Link to="/login">
                <Button
                  variant="ghost"
                  className="hidden sm:inline-flex text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/70"
                >
                  {isEn ? 'Sign in' : 'Iniciar Sesión'}
                </Button>
              </Link>
              <Link to="/register">
                <Button className="h-10 text-sm px-5 rounded-full shadow-lg shadow-blue-900/40">
                  {isEn ? 'Create account' : 'Crear cuenta'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <BrandHeader />
        </div>
        {/* Background gradient + glow */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-blue-400/30 blur-[140px] opacity-70 dark:bg-blue-600/40" />
        <div className="pointer-events-none absolute bottom-[-160px] right-[-80px] h-[420px] w-[420px] rounded-full bg-indigo-300/25 blur-[140px] opacity-70 dark:bg-indigo-500/30" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 -z-10 opacity-[0.06] dark:opacity-[0.12] [background-image:radial-gradient(circle_at_1px_1px,#64748b_1px,transparent_0)] [background-size:32px_32px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <motion.div
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6 }}
            variants={fadeIn}
            className="grid gap-12 items-center"
          >
            {/* Left column - copy */}
            <div className="text-center flex flex-col items-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-3 py-1 text-xs sm:text-sm text-slate-700 mb-4 shadow-sm shadow-slate-900/10 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-slate-900/40">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
                  ●
                </span>
                <span className="font-medium">
                  {isEn ? 'Organize all your jobs and billing in one place' : 'Organizá tus trabajos y tu facturación en un solo lugar'}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-4">
                <span className="block leading-[1.05]">{isEn ? 'Professional tracking' : 'Seguimiento profesional'}</span>
                <span className="block bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 bg-clip-text text-transparent dark:from-blue-300 dark:via-sky-400 dark:to-indigo-300">
                  {isEn ? 'for your daily work' : 'para tu trabajo diario'}
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-base sm:text-lg text-slate-700 dark:text-slate-300/90 leading-relaxed">
                {isEn
                  ? 'Log jobs, control costs, manage teams and generate reports ready to share. Designed for professionals and teams who want to move beyond spreadsheets.'
                  : 'Registra trabajos, controla costos, gestiona equipos y genera reportes listos para enviar a tu estudio contable. Pensado para profesionales y equipos que quieren dejar atrás las planillas manuales.'}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center">
                <Link to="/register" className="sm:w-auto">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button className="w-full sm:w-auto h-12 sm:h-14 text-sm sm:text-base rounded-full px-7 sm:px-8 shadow-xl shadow-blue-900/40">
                      {isEn ? 'Try it free now' : 'Probar gratis ahora'}
                      <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </motion.div>
                </Link>

                <Link to="/login" className="sm:w-auto">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto h-12 sm:h-14 rounded-full border-slate-300 bg-white/70 text-slate-900 hover:bg-slate-100 dark:border-slate-600 dark:bg-transparent dark:text-slate-100 dark:hover:bg-slate-900/60"
                    >
                      {isEn ? 'I already have an account' : 'Ya tengo cuenta'}
                    </Button>
                  </motion.div>
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 max-w-lg mx-auto">
                <StatsCard value="+30%" label={isEn ? 'Better work visibility' : 'Mejor visibilidad del trabajo'} />
                <StatsCard value="-6h" label={isEn ? 'Less time on spreadsheets/month' : 'Menos tiempo en planillas al mes'} />
                <StatsCard value="100%" label={isEn ? 'Data ready for accounting' : 'Datos listos para contabilidad'} className="hidden sm:flex" />
              </div>
            </div>

          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-18 lg:py-20 bg-background border-t border-slate-200/70 dark:border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xs font-semibold tracking-[0.25em] text-slate-400 uppercase mb-3"
            >
              {isEn ? 'Key benefits' : 'Beneficios clave'}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 dark:text-slate-50"
            >
              {isEn ? 'Everything you need to control your operation' : 'Todo lo que necesitás para tener el control de tu operación'}
            </motion.p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7"
          >
            <BenefitCard
              icon={Briefcase}
              title={isEn ? 'Job management' : 'Gestión de trabajos'}
              desc={isEn ? 'Log each job with hours, costs, location and key notes so nothing is missed.' : 'Registrá cada trabajo con horas, costos, ubicación y notas clave para no perder ningún detalle.'}
            />
            <BenefitCard
              icon={TrendingUp}
              title={isEn ? 'Financial control' : 'Control financiero'}
              desc={isEn ? 'Clear tracking of income and expenses, with monthly views to ease decisions.' : 'Seguimiento claro de ingresos y gastos, con vistas mensuales que facilitan la toma de decisiones.'}
            />
            <BenefitCard
              icon={Users}
              title={isEn ? 'Teamwork' : 'Trabajo en equipo'}
              desc={isEn ? 'Create groups, assign responsibilities and keep everyone on the same page.' : 'Organizá grupos, asigná responsabilidades y mantené a todo el equipo en la misma página.'}
            />
            <BenefitCard
              icon={Download}
              title={isEn ? 'Instant reports' : 'Reportes instantáneos'}
              desc={isEn ? 'Generate Excel reports ready to send to accounting or share with clients.' : 'Generá reportes en Excel listos para enviar a tu estudio contable o compartir con tus clientes.'}
            />
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 dark:text-slate-50">
              {isEn ? 'How does it work?' : '¿Cómo funciona?'}
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
              {isEn
                ? 'Get organized in three simple steps. No long implementations, no unnecessary complexity.'
                : 'Empezá a ordenar tu negocio en tres pasos simples. Sin implementaciones largas, sin complejidad innecesaria.'}
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12"
          >
            {/* Desktop Connector Line */}
            <div className="hidden md:block absolute top-12 left-[13%] right-[13%] h-px bg-slate-700/70 -z-0" />

            <Step
              number="1"
              title={isEn ? 'Create your account' : 'Crea tu cuenta'}
              desc={
                isEn
                  ? 'Sign up free in seconds, set your basic data and get ready to start.'
                  : 'Registrate gratis en segundos, configurá tus datos básicos y dejá lista tu cuenta para empezar.'
              }
            />
            <Step
              number="2"
              title={isEn ? 'Log your jobs' : 'Registrá tus trabajos'}
              desc={
                isEn
                  ? 'Add daily jobs, clients, amounts and expenses so everything stays centralized.'
                  : 'Cargá trabajos diarios, clientes, montos y gastos asociados para tener todo centralizado.'
              }
            />
            <Step
              number="3"
              title={isEn ? 'See your numbers' : 'Mirá tus números'}
              desc={
                isEn
                  ? 'View performance, download reports and use that info to plan next month.'
                  : 'Visualizá tu rendimiento, descargá reportes y usá esa información para planificar el próximo mes.'
              }
            />
          </motion.div>
        </div>
      </section>

    </div>
  );
}

function BenefitCard({ icon: Icon, title, desc }) {
  const itemVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={itemVariant}
      whileHover={{ y: -8 }}
      className="bg-card p-7 rounded-2xl border border-border shadow-lg shadow-slate-900/10 dark:shadow-slate-950/60 hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-5 text-blue-500 dark:text-blue-400">
        <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">{title}</h3>
      <p className="text-slate-600 dark:text-slate-300/90 leading-relaxed text-sm sm:text-[0.9rem]">{desc}</p>
    </motion.div>
  );
}

function Step({ number, title, desc }) {
  const itemVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={itemVariant} className="flex flex-col items-center text-center relative z-10">
      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-900 text-blue-300 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-semibold mb-5 sm:mb-6 shadow-xl shadow-slate-950/80">
        {number}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">{title}</h3>
      <p className="text-slate-700 dark:text-slate-300 max-w-xs leading-relaxed text-sm">{desc}</p>
    </motion.div>
  );
}

function StatsCard({ value, label, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card px-4 py-3 sm:px-5 sm:py-4 shadow-md shadow-slate-900/10 dark:shadow-slate-950/70 ${className}`}
    >
      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">{value}</div>
    </div>
  );
}

// DashboardPreview fue reemplazado por una imagen estática en el hero
