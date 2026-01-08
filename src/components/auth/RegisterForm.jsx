
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { Loader2 } from 'lucide-react';
import { validatePassword } from '@/utils/validators';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!formData.fullName.trim()) {
        addToast("El nombre es requerido", "error");
        return;
    }
    
    const pwdValidation = validatePassword(formData.password);
    if (!pwdValidation.valid) {
         addToast(pwdValidation.error, "error");
         return;
    }
    if (formData.password !== formData.confirmPassword) {
        addToast("Las contraseñas no coinciden", "error");
        return;
    }

    setLoading(true);
    const { success, error } = await signUp(formData.email, formData.password, formData.fullName);
    setLoading(false);

    if (success) {
      setSuccess(true);
      addToast("Registro exitoso", "success");
    } else {
        if (error && error.toLowerCase().includes("already registered")) {
            addToast("Este email ya está registrado", "error");
        } else {
            addToast(error || "Error al registrarse", "error");
        }
    }
  };

  if (success) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg border border-gray-100 text-center">
                <h2 className="text-2xl font-bold text-blue-900 mb-4">¡Registro Exitoso!</h2>
                <p className="text-gray-600 mb-6">Te enviamos un email de confirmación. Revisa tu bandeja de entrada para activar tu cuenta.</p>
                <Link to="/login">
                    <Button className="w-full bg-blue-900 hover:bg-blue-800 text-white">
                        Ir a Iniciar Sesión
                    </Button>
                </Link>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-blue-900">Crear Cuenta</h2>
          <p className="mt-2 text-gray-600">Únete para gestionar tus trabajos</p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
              <input
                type="password"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white shadow-md hover:shadow-lg transition-all"
          >
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...</> : 'Registrarse'}
          </Button>
        </form>
        <div className="text-center pt-2">
          <Link to="/login" className="text-sm text-blue-900 hover:text-blue-700 font-medium transition-colors">
            ¿Ya tienes cuenta? Ingresa aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
