import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/Input';
import Alert from '@/components/Alert';
import { Button } from '@/components/ui/button';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setMessage('');

    if (!email) {
      setError('El email es requerido.');
      return;
    }

    if (!emailRegex.test(email)) {
      setError('Ingresá un email válido.');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'No se pudo enviar el email de recuperación.');
      return;
    }

    setMessage(result.message || 'Te enviamos un email para restablecer tu contraseña.');
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Recuperar contraseña"
      subtitle="Ingresá tu email y te enviaremos un enlace seguro para crear una nueva contraseña."
      backTo="/login"
      backLabel="Volver al inicio de sesión"
    >
      {message ? (
        <div className="mb-6">
          <Alert variant="success">{message}</Alert>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="recoveryEmail"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error}
          disabled={loading}
        />

        <Button type="submit" disabled={loading} className="w-full shadow-lg shadow-blue-900/10">
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <Link to="/login" className="font-semibold text-[#1e3a8a] hover:text-blue-700 hover:underline dark:text-blue-200 dark:hover:text-blue-300">
          Volver
        </Link>
      </div>
    </AuthLayout>
  );
}
