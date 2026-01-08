
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { Loader2 } from 'lucide-react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { success, data, error } = await signIn(email, password);
    setLoading(false);

    if (success && data?.user) {
        navigate('/dashboard');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-blue-900">Bienvenido</h2>
          <p className="mt-2 text-gray-600">Ingresa a tu cuenta para continuar</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                type="email"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                id="password"
                type="password"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
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
