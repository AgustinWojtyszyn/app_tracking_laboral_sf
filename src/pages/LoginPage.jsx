
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import Input from '@/components/Input';
import Alert from '@/components/Alert';
import AuthLayout from '@/components/auth/AuthLayout';
import { Lock } from 'lucide-react';

const getLoginErrorMessage = (error) => {
  if (!error) return 'Error al iniciar sesión.';
  if (error.includes('Email not confirmed')) return 'Debes confirmar tu email antes de ingresar.';
  if (error.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
  return 'No se pudo iniciar sesión. Verificá tus datos e intentá nuevamente.';
};

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { signIn, resendVerification } = useAuth();
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
    if (loading) return;
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
             message: getLoginErrorMessage(error),
             action: true
         });
      } else {
          setAuthError({ type: 'error', message: getLoginErrorMessage(error) });
      }
    }
  };

  const handleResend = async () => {
      if (resending) return;
      setResending(true);
      const res = await resendVerification(formData.email);
      setResending(false);
      if(res.success) {
          setAuthError({ type: 'success', message: 'Email de confirmación reenviado. Revisa tu bandeja de entrada.' });
      } else {
          setAuthError({ type: 'error', message: 'No se pudo reenviar la confirmación. Intentá nuevamente.' });
      }
  };

  return (
    <AuthLayout icon={Lock} title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
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
                autoComplete="off"
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
                autoComplete="off"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                error={errors.password}
                showPasswordToggle
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
              />
            </motion.div>

            <div className="flex justify-between items-center">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-[#1e3a8a] transition-colors hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-2 dark:text-blue-200 dark:hover:text-blue-300"
              >
                Olvidé mi contraseña
              </Link>
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
    </AuthLayout>
  );
}
