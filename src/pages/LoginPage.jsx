
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import Input from '@/components/Input';
import Alert from '@/components/Alert';
import LanguageToggle from '@/components/layout/LanguageToggle';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { ArrowLeft, Lock } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { signIn, resendVerification, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    const newErrors = {};
    
    if (!formData.email) newErrors.email = 'El email es requerido';
    else if (!emailRegex.test(formData.email)) newErrors.email = 'Ingresa un email válido';
    
    if (!formData.password) newErrors.password = 'La contraseña es requerida';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    if (!validate()) return;

    setLoading(true);
    const { success, error } = await signIn(formData.email, formData.password);
    setLoading(false);

    if (success) {
      navigate('/app/trabajos-diarios');
    } else {
      if (error && error.includes("Email not confirmed")) {
         setAuthError({
             type: 'warning',
             message: "Debes confirmar tu email antes de ingresar.",
             action: true
         });
      } else if (error && error.includes("Invalid login credentials")) {
          setAuthError({ type: 'error', message: "Email o contraseña incorrectos." });
      } else {
          setAuthError({ type: 'error', message: error || "Error al iniciar sesión" });
      }
    }
  };

  const handleResetPassword = async () => {
    setAuthError(null);
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Ingresa tu email para recuperarla';
    else if (!emailRegex.test(formData.email)) newErrors.email = 'Ingresa un email válido';

    if (Object.keys(newErrors).length) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    setResetting(true);
    const res = await resetPassword(formData.email);
    setResetting(false);
    setAuthError({
      type: res.success ? 'success' : 'error',
      message: res.message || (res.success ? 'Email enviado' : 'No se pudo enviar el email')
    });
  };

  const handleResend = async () => {
      setResending(true);
      const res = await resendVerification(formData.email);
      setResending(false);
      if(res.success) {
          setAuthError({ type: 'success', message: 'Email de confirmación reenviado. Revisa tu bandeja de entrada.' });
      } else {
          setAuthError({ type: 'error', message: res.message });
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-gray-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-gray-900 dark:text-slate-50 p-4 font-sans transition-colors duration-300">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 right-10 h-64 w-64 bg-blue-300/25 dark:bg-blue-500/25 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 left-6 h-56 w-56 bg-indigo-300/20 dark:bg-indigo-500/25 blur-[120px] rounded-full" />
      </div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg relative"
      >
        <div className="flex justify-end items-center gap-2 mb-4">
          <ThemeToggle className="shadow-md bg-background/80 backdrop-blur-md border border-border/70" />
          <LanguageToggle />
        </div>
        <Link to="/" className="inline-flex items-center text-lg md:text-xl font-semibold text-[#1e3a8a] hover:text-blue-900 mb-12 transition-colors">
          <ArrowLeft className="w-6 h-6 mr-3" />
          {t('auth.backHome')}
        </Link>
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)] border border-gray-100 dark:border-slate-800 p-10 md:p-12 transition-colors duration-300">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-[#1e3a8a] dark:text-blue-200" />
            </div>
            <h1 className="text-2xl font-bold text-[#1e3a8a] dark:text-blue-200">{t('auth.loginTitle')}</h1>
            <p className="text-sm text-gray-500 dark:text-slate-300 mt-2">{t('auth.loginSubtitle')}</p>
          </div>

          {authError && (
            <div className="mb-6">
              <Alert variant={authError.type} onClose={() => setAuthError(null)}>
                {authError.message}
                {authError.action && (
                    <div className="mt-3">
                        <Button 
                          variant="secondary" 
                          onClick={handleResend} 
                          disabled={resending} 
                          className="h-9 text-xs w-auto px-4"
                        >
                            Reenviar confirmación
                        </Button>
                    </div>
                )}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.1 }}
            >
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                error={errors.email}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
              />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.2 }}
            >
              <Input
                id="password"
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                error={errors.password}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
              />
            </motion.div>

            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetPassword}
                disabled={resetting}
                className="px-0 h-auto font-semibold text-[#1e3a8a] hover:text-blue-700 dark:text-blue-200 dark:hover:text-blue-300"
              >
                {resetting ? 'Enviando...' : 'Olvidé mi contraseña'}
              </Button>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }}
              className="pt-2"
            >
              <Button type="submit" disabled={loading} className="w-full shadow-lg shadow-blue-900/10">
                {loading ? "Iniciando sesión..." : "Ingresar"}
              </Button>
            </motion.div>
          </form>

          <div className="text-center text-sm mt-8 pt-6 border-t border-gray-100">
            <span className="text-gray-600 dark:text-slate-300">{t('auth.noAccount')} </span>
            <Link to="/register" className="font-semibold text-[#1e3a8a] dark:text-blue-200 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors">
              {t('auth.registerCta')}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
