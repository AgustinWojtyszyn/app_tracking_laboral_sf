import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/Input';
import Alert from '@/components/Alert';
import { Button } from '@/components/ui/button';
import {
  RECOVERY_MESSAGES,
  RECOVERY_STATUS,
  canSubmitResetPassword,
  translateAuthError,
  validateResetPasswordForm,
} from '@/utils/auth/resetPassword.helpers';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const initialized = useRef(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState(RECOVERY_STATUS.VERIFYING);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;

    const initializeRecovery = async () => {
      setStatus(RECOVERY_STATUS.VERIFYING);
      setMessage(RECOVERY_MESSAGES.verifying);

      const result = await authService.recoverPasswordSession(window.location.href);

      if (!mounted) return;

      if (!result.success) {
        setStatus(RECOVERY_STATUS.INVALID);
        setMessage(result.message || RECOVERY_MESSAGES.invalid);
        return;
      }

      setStatus(RECOVERY_STATUS.READY);
      setMessage('');
    };

    initializeRecovery();

    return () => {
      mounted = false;
    };
  }, []);

  const canSubmit = canSubmitResetPassword(status, submitting);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting || status !== RECOVERY_STATUS.READY) return;

    const nextErrors = validateResetPasswordForm(password, confirmPassword);
    setFieldErrors(nextErrors);
    setMessage('');

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const result = await authService.changePassword(password);
    setSubmitting(false);

    if (!result.success) {
      setMessage(translateAuthError(result.message || result.error));
      return;
    }

    setStatus(RECOVERY_STATUS.SUCCESS);
    setMessage(RECOVERY_MESSAGES.success);
    await authService.signOut();

    window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1600);
  };

  const showInvalid = status === RECOVERY_STATUS.INVALID;
  const showVerifying = status === RECOVERY_STATUS.VERIFYING;
  const shouldShowForm = status === RECOVERY_STATUS.READY || status === RECOVERY_STATUS.SUCCESS;
  const visibleErrors = Object.keys(fieldErrors).length > 0 ? fieldErrors : {};

  return (
    <AuthLayout
      icon={KeyRound}
      title="Crear nueva contraseña"
      subtitle="Ingresá una contraseña nueva para recuperar el acceso a tu cuenta."
      backTo="/login"
      backLabel="Volver al inicio de sesión"
    >
      {showVerifying ? (
        <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>{RECOVERY_MESSAGES.verifying}</span>
        </div>
      ) : null}

      {showInvalid ? (
        <div className="space-y-5">
          <Alert variant="error">
            <p>{message || RECOVERY_MESSAGES.invalid}</p>
            <p className="mt-1">{RECOVERY_MESSAGES.requestNew}</p>
          </Alert>

          <Link to="/forgot-password" className="block">
            <Button className="w-full">Solicitar nuevo enlace</Button>
          </Link>
        </div>
      ) : null}

      {shouldShowForm ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="newPassword"
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            hint="Mínimo 8 caracteres"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
            error={visibleErrors.password}
            disabled={submitting || status === RECOVERY_STATUS.SUCCESS}
            showPasswordToggle
          />

          <Input
            id="confirmPassword"
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            placeholder="Repetí la contraseña"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
            }}
            error={visibleErrors.confirmPassword}
            disabled={submitting || status === RECOVERY_STATUS.SUCCESS}
            showPasswordToggle
          />

          {message ? (
            <Alert variant={status === RECOVERY_STATUS.SUCCESS ? 'success' : 'error'}>
              {message}
            </Alert>
          ) : null}

          <Button type="submit" disabled={!canSubmit} className="w-full shadow-lg shadow-blue-900/10">
            {submitting ? 'Actualizando...' : 'Guardar contraseña'}
          </Button>
        </form>
      ) : null}

    </AuthLayout>
  );
}
