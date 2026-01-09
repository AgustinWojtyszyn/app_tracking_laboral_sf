
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { Loader2 } from 'lucide-react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { success, data, error } = await signIn(email, password);
    setLoading(false);

  if (success && data?.user) {
      navigate('/app/trabajos-diarios');
    } else {
        if (error) {
            if (error.includes("Email not confirmed")) {
                addToast("Debes confirmar tu email antes de ingresar. Revisa tu bandeja de entrada.", "error");
            } else if (error.includes("Invalid login credentials")) {
                addToast("Email o contraseña incorrectos", "error");
            } else {
                addToast(error, "error");
            }
        }
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      addToast('Ingresá tu email para recuperar la contraseña', 'error');
      return;
    }
    if (!emailRegex.test(email)) {
      addToast('Ingresá un email válido', 'error');
      return;
    }
    setResetting(true);
    const res = await resetPassword(email);
    setResetting(false);
    addToast(res.message || (res.success ? 'Email enviado' : 'No se pudo enviar el email'), res.success ? 'success' : 'error');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-gray-900 dark:text-slate-50 p-4 transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-lg shadow-lg shadow-slate-900/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] border border-gray-100 dark:border-slate-800 relative">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-blue-900 dark:text-blue-200">Bienvenido</h2>
          <p className="mt-2 text-gray-600 dark:text-slate-300">Ingresa a tu cuenta para continuar</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-100 mb-1">Email</label>
              <input
                id="email"
                type="email"
                required
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-100 mb-1">Contraseña</label>
              <input
                id="password"
                type="password"
                required
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetPassword}
              disabled={resetting}
              className="px-0 h-auto font-semibold text-blue-900 hover:text-blue-700 dark:text-blue-200 dark:hover:text-blue-300"
            >
              {resetting ? 'Enviando...' : 'Olvidé mi contraseña'}
            </Button>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white shadow-md hover:shadow-lg transition-all"
          >
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ingresando...</> : 'Ingresar'}
          </Button>
        </form>
        <div className="text-center pt-2">
          <Link to="/register" className="text-sm text-blue-900 hover:text-blue-700 font-medium transition-colors">
            ¿No tienes cuenta? Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
}
