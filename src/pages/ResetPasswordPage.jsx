import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => (
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    password === confirmPassword
  ), [password, confirmPassword]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const result = await authService.changePassword(password);
    setLoading(false);

    if (!result.success) {
      setError(result.message || result.error || 'No se pudo actualizar la contraseña. Volvé a solicitar un nuevo enlace.');
      return;
    }

    setMessage('Contraseña actualizada correctamente. Ya podés iniciar sesión.');

    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1600);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-[#0f5b99] px-8 py-7 text-center">
          <h1 className="text-3xl font-extrabold tracking-wide text-white">ServiFood</h1>
          <p className="mt-1 text-sm text-blue-100">Sistema de mantenimiento</p>
        </div>

        <div className="px-8 py-8">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Crear nueva contraseña
          </h2>

          <p className="mt-3 text-center text-sm leading-6 text-slate-600">
            Ingresá una nueva contraseña para recuperar el acceso a tu cuenta.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Nueva contraseña
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-[#0f5b99] focus:ring-2 focus:ring-blue-100"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Confirmar contraseña
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-[#0f5b99] focus:ring-2 focus:ring-blue-100"
                placeholder="Repetí la contraseña"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full rounded-xl bg-[#0f5b99] px-4 py-3 font-bold text-white shadow-lg transition hover:bg-[#0b4778] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Actualizando...' : 'Guardar contraseña'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-semibold text-[#0f5b99] hover:underline">
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
