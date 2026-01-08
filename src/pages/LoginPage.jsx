
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import Input from '@/components/Input';
import Alert from '@/components/Alert';
import { ArrowLeft, Lock } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { signIn, resendVerification } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
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
      navigate('/app/dashboard');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-100 p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#1e3a8a] mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio
        </Link>
        
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-[#1e3a8a]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1e3a8a]">Iniciar Sesión</h1>
            <p className="text-sm text-gray-500 mt-2">Accede a tu cuenta de Work Tracker</p>
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
              />
            </motion.div>

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
            <span className="text-gray-600">¿No tienes cuenta? </span>
            <Link to="/register" className="font-semibold text-[#1e3a8a] hover:text-blue-700 hover:underline transition-colors">
              Regístrate aquí
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
