import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandHeader from '@/components/layout/BrandHeader';

const steps = [
  {
    title: '1. Solicitud',
    body: 'Enviá una solicitud de eliminación desde el email asociado a tu cuenta.'
  },
  {
    title: '2. Verificación',
    body: 'Verificaremos tu identidad y el alcance de la eliminación (cuenta completa o datos específicos).'
  },
  {
    title: '3. Confirmación',
    body: 'Te confirmaremos por email la ejecución y el alcance de la eliminación.'
  }
];

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
      <Helmet>
        <title>Eliminación de datos | App de seguimiento laboral</title>
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
              <div className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-rose-700 dark:text-rose-200" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50">Eliminación de datos de usuario</h1>
                <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">Última actualización: 9 de marzo de 2026</p>
              </div>
            </div>

            <div className="space-y-6 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Para solicitar la eliminación de tu cuenta o de tus datos, escribí a
                {' '}
                <span className="font-medium text-slate-900 dark:text-slate-50">agustinwojtyszyn99@gmail.com</span>.
                La eliminación puede incluir información de perfil, trabajos, costos, grupos y registros asociados,
                según el alcance solicitado.
              </p>

              <div className="grid gap-4">
                {steps.map((step) => (
                  <div key={step.title} className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 p-4 bg-white/70 dark:bg-slate-900/60">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-50 mb-1">{step.title}</h2>
                    <p>{step.body}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-amber-200/70 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-900/20 p-4">
                <p className="text-amber-900 dark:text-amber-100">
                  Importante: algunas obligaciones legales pueden requerir conservar ciertos registros por un período limitado.
                </p>
              </div>

              <p>
                Si necesitás acelerar el proceso, incluí en tu email: nombre completo, email de la cuenta, y el detalle de los
                datos que querés eliminar.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200/70 dark:border-slate-800/70 pt-6">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Esta página no está enlazada desde la navegación principal. Guardá el link si necesitás consultarla nuevamente.
              </p>
              <Link to="/login" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-10 rounded-full px-5 shadow-lg shadow-rose-900/30">
                  Iniciar sesión
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
