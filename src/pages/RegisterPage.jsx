
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import Input from '@/components/Input';
import Alert from '@/components/Alert';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/layout/LanguageToggle';
import { ArrowLeft, UserPlus, MailCheck } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ 
    fullName: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, resendVerification } = useAuth();
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!formData.fullName.trim()) newErrors.fullName = 'El nombre es requerido';
    
    if (!formData.email) newErrors.email = 'El email es requerido';
    else if (!emailRegex.test(formData.email)) newErrors.email = 'Ingresa un email válido';
    
    if (!formData.password) newErrors.password = 'La contraseña es requerida';
    else if (formData.password.length < 8) newErrors.password = 'Mínimo 8 caracteres';
    
    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    if (!validate()) return;

    setLoading(true);
    const { success, error } = await signUp(formData.email, formData.password, formData.fullName);
    setLoading(false);

    if (success) {
      setSuccess(true);
    } else {
       if (error && error.includes("already registered")) {
           setAuthError("Este email ya está registrado. Intenta iniciar sesión.");
       } else {
           setAuthError(error || "Error al crear la cuenta.");
       }
    }
  };
  
  const handleResend = async () => {
      setLoading(true);
      await resendVerification(formData.email);
      setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-100 p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
            <div className="flex justify-end mb-4">
                <LanguageToggle />
            </div>
            <div className="bg-white rounded-xl shadow-xl border-2 border-green-500/20 p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MailCheck className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-700 mb-2">{isEn ? 'Account created successfully!' : '¡Cuenta creada exitosamente!'}</h2>
                <p className="text-green-600/80 mb-8 leading-relaxed">
                    {isEn ? 'We sent a confirmation email to ' : 'Te enviamos un correo de confirmación a '}<span className="font-semibold text-green-700">{formData.email}</span>.<br/>
                    {isEn ? 'Please confirm it before signing in.' : 'Debes confirmarlo antes de iniciar sesión.'} <br/>
                    <span className="text-sm">{isEn ? '(Check your inbox and spam)' : '(Revisa tu bandeja de entrada y spam)'}</span>
                </p>
                
                <div className="space-y-3">
                    <Link to="/login" className="block">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/10">
                            {isEn ? 'Go to Login' : 'Ir a Iniciar Sesión'}
                        </Button>
                    </Link>
                    <Button 
                        variant="outline" 
                        onClick={handleResend} 
                        disabled={loading} 
                        className="w-full border-green-200 text-green-700 hover:bg-green-50"
                    >
                        {loading ? (isEn ? 'Resending...' : 'Reenviando...') : (isEn ? 'Resend confirmation' : 'Reenviar confirmación')}
                    </Button>
                </div>
            </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-100 p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="flex justify-end mb-4">
          <LanguageToggle />
        </div>
        <Link to="/" className="inline-flex items-center text-lg md:text-xl font-semibold text-[#1e3a8a] hover:text-blue-900 mb-12 transition-colors">
          <ArrowLeft className="w-6 h-6 mr-3" />
          {t('auth.backHome')}
        </Link>
        
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 md:p-12">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-6 h-6 text-[#1e3a8a]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1e3a8a]">{t('auth.registerTitle')}</h1>
            <p className="text-sm text-gray-500 mt-2">{t('auth.registerSubtitle')}</p>
          </div>

          {authError && (
            <div className="mb-6">
                <Alert variant="error" onClose={() => setAuthError(null)}>
                {authError}
                </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <Input
                id="fullName"
                label="Nombre Completo"
                placeholder="Juan Pérez"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                error={errors.fullName}
                />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Input
                id="email"
                label="Email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                error={errors.email}
                />
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <Input
                id="password"
                label="Contraseña"
                type="password"
                placeholder="Mínimo 8 caracteres"
                hint="Mínimo 8 caracteres"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                error={errors.password}
                />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <Input
                id="confirmPassword"
                label="Confirmar Contraseña"
                type="password"
                placeholder="Repite tu contraseña"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                error={errors.confirmPassword}
                />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="pt-2">
                <Button type="submit" disabled={loading} className="w-full shadow-lg shadow-blue-900/10">
                {loading ? "Creando cuenta..." : "Registrarse"}
                </Button>
            </motion.div>
          </form>

          <div className="text-center text-sm mt-8 pt-6 border-t border-gray-100">
            <span className="text-gray-600">{t('auth.yesAccount')} </span>
            <Link to="/login" className="font-semibold text-[#1e3a8a] hover:text-blue-700 hover:underline transition-colors">
              {t('auth.loginCta')}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
