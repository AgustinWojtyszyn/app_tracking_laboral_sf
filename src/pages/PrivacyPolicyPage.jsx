import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandHeader from '@/components/layout/BrandHeader';

const sections = [
  {
    title: 'Alcance',
    body: [
      'Esta Política de Privacidad describe cómo se trata la información cuando usás la app de seguimiento laboral (el "Servicio").',
      'Aplica al sitio web y a la aplicación web, incluidos los espacios protegidos por autenticación.'
    ]
  },
  {
    title: 'Información que podemos recopilar',
    body: [
      'Datos de cuenta y perfil, como nombre, email y preferencias básicas.',
      'Datos que cargás en el Servicio, como trabajos, costos, grupos, notas y archivos asociados.',
      'Datos técnicos y de uso, como registros de acceso, identificadores de dispositivo, dirección IP aproximada y eventos para diagnóstico y seguridad.'
    ]
  },
  {
    title: 'Cómo usamos la información',
    body: [
      'Para prestar el Servicio y permitir el acceso seguro a tu cuenta.',
      'Para generar reportes, estadísticas y vistas internas de tu información.',
      'Para seguridad, prevención de fraudes, auditorías y mantenimiento.',
      'Para soporte y comunicaciones operativas necesarias.'
    ]
  },
  {
    title: 'Compartición de información',
    body: [
      'Tu información puede ser visible para otros miembros que compartan tu organización o grupo según los permisos configurados.',
      'Podemos compartir datos con proveedores que nos ayudan a operar el Servicio (por ejemplo, infraestructura y autenticación), bajo acuerdos de confidencialidad.',
      'No vendemos tus datos personales.'
    ]
  },
  {
    title: 'Cookies y almacenamiento local',
    body: [
      'Podemos usar cookies y almacenamiento local del navegador para mantener tu sesión, preferencias y métricas básicas de uso.'
    ]
  },
  {
    title: 'Retención',
    body: [
      'Conservamos la información mientras tu cuenta esté activa o cuando sea necesario para prestar el Servicio, cumplir obligaciones legales o resolver disputas.'
    ]
  },
  {
    title: 'Seguridad',
    body: [
      'Aplicamos medidas técnicas y organizativas razonables para proteger tu información. Aun así, ningún sistema es 100% infalible.'
    ]
  },
  {
    title: 'Tus derechos',
    body: [
      'Podés solicitar acceso, corrección o eliminación de tus datos. Para ejercer estos derechos, contactá al administrador del Servicio.'
    ]
  },
  {
    title: 'Cambios en esta política',
    body: [
      'Podemos actualizar esta política ocasionalmente. Publicaremos la versión vigente en esta misma página.'
    ]
  },
  {
    title: 'Contacto',
    body: [
      'Si tenés consultas sobre privacidad, escribí al soporte o al administrador responsable de tu cuenta.'
    ]
  }
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
      <Helmet>
        <title>Política de privacidad | App de seguimiento laboral</title>
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <BrandHeader />
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mt-10 flex flex-col gap-6">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors w-fit">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Link>

          <div className="bg-white/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/70 rounded-2xl shadow-lg shadow-slate-900/10 dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)] p-6 sm:p-10">
            <div className="flex items-start gap-4 mb-6">
              <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-blue-700 dark:text-blue-200" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50">Política de privacidad</h1>
                <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">Última actualización: 9 de marzo de 2026</p>
              </div>
            </div>

            <div className="space-y-8">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
                    {section.title}
                  </h2>
                  <div className="space-y-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                    {section.body.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200/70 dark:border-slate-800/70 pt-6">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Esta página no está enlazada desde la navegación principal. Guardá el link si necesitás consultarla nuevamente.
              </p>
              <Link to="/register" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-10 rounded-full px-5 shadow-lg shadow-blue-900/30">
                  Crear cuenta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
