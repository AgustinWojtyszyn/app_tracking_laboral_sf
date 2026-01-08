
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, TrendingUp, Users, Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-[#1e3a8a] rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#1e3a8a]">Work Tracker</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost" className="hidden sm:inline-flex text-gray-600 hover:text-[#1e3a8a]">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link to="/register">
                <Button className="h-10 text-sm px-6 rounded-full shadow-md hover:shadow-lg transform transition hover:-translate-y-0.5">
                  Registrarse
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-40 overflow-hidden bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6 }}
            variants={fadeIn}
          >
            <h1 className="text-4xl tracking-tight font-extrabold text-[#1e3a8a] sm:text-5xl md:text-6xl mb-6">
              <span className="block">Seguimiento de trabajos</span>
              <span className="block text-blue-600/80">y facturación simple</span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600 md:text-xl leading-relaxed">
              Registra tus trabajos, controla gastos, gestiona equipos y exporta reportes en segundos. La herramienta definitiva para profesionales independientes y pequeñas empresas.
            </p>
            <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="w-full h-14 text-lg shadow-xl shadow-blue-900/20">
                    Comenzar Gratis
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </motion.div>
              </Link>
              <Link to="/login" className="w-full sm:w-auto mt-4 sm:mt-0">
                 <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="w-full h-14 text-lg">
                    Ya tengo cuenta
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
        
        {/* Abstract Background Element */}
        <div className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full z-0 overflow-hidden pointer-events-none opacity-30">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[100px]" />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-base font-bold text-[#1e3a8a] tracking-widest uppercase mb-2"
            >
              Beneficios
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-extrabold text-gray-900 sm:text-4xl"
            >
              Todo lo que necesitas para crecer
            </motion.p>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            <BenefitCard 
              icon={Briefcase} 
              title="Gestión de Trabajos" 
              desc="Registra cada trabajo con detalles precisos de horas, costos, ubicación y notas importantes." 
            />
            <BenefitCard 
              icon={TrendingUp} 
              title="Control Financiero" 
              desc="Visualiza tus ingresos, gastos y beneficios mensuales con gráficos claros y accionables." 
            />
            <BenefitCard 
              icon={Users} 
              title="Trabajo en Equipo" 
              desc="Crea grupos, invita colaboradores y mantén a todo tu equipo sincronizado en tiempo real." 
            />
            <BenefitCard 
              icon={Download} 
              title="Reportes Instantáneos" 
              desc="Genera y descarga reportes detallados en formato Excel listos para tu contabilidad." 
            />
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">¿Cómo funciona?</h2>
            <p className="mt-4 text-lg text-gray-600">Empieza a organizar tu negocio en tres simples pasos</p>
          </div>
          
          <motion.div 
             variants={staggerContainer}
             initial="hidden"
             whileInView="visible"
             viewport={{ once: true }}
             className="relative grid grid-cols-1 md:grid-cols-3 gap-12"
          >
            {/* Desktop Connector Line */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gray-200 -z-0" />
            
            <Step 
              number="1" 
              title="Crea tu cuenta" 
              desc="Regístrate gratis en segundos y verifica tu correo electrónico para asegurar tu información." 
            />
            <Step 
              number="2" 
              title="Registra actividad" 
              desc="Ingresa tus trabajos diarios, asigna clientes y registra cualquier gasto asociado." 
            />
            <Step 
              number="3" 
              title="Analiza y Crece" 
              desc="Consulta tu panel de control para ver el rendimiento y exporta tus datos cuando lo necesites." 
            />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-auto py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-400" />
              <span className="text-lg font-bold">Work Tracker</span>
            </div>
            
            <div className="flex space-x-8 text-sm text-gray-400">
              <Link to="/login" className="hover:text-white transition-colors">
                Iniciar Sesión
              </Link>
              <Link to="/register" className="hover:text-white transition-colors">
                Registrarse
              </Link>
            </div>
            
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Work Tracker. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
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
      className="bg-white p-8 rounded-xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300"
    >
      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-[#1e3a8a]">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed text-sm">{desc}</p>
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
      <div className="w-24 h-24 bg-white border-4 border-blue-50 text-[#1e3a8a] rounded-full flex items-center justify-center text-3xl font-extrabold mb-6 shadow-lg">
        {number}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 max-w-xs leading-relaxed">{desc}</p>
    </motion.div>
  );
}
