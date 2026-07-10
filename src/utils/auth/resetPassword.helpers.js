export const PASSWORD_MIN_LENGTH = 8;

export const RECOVERY_STATUS = {
  VERIFYING: 'verifying',
  READY: 'ready',
  INVALID: 'invalid',
  SUCCESS: 'success',
};

export const RECOVERY_MESSAGES = {
  verifying: 'Estamos verificando tu enlace...',
  invalid: 'El enlace de recuperación no es válido o ya venció.',
  requestNew: 'Solicitá un nuevo enlace para cambiar tu contraseña.',
  success: 'Tu contraseña se actualizó correctamente.',
  genericUpdateError: 'No se pudo actualizar la contraseña. Solicitá un nuevo enlace e intentá nuevamente.',
};

export function validateResetPasswordForm(password, confirmPassword) {
  const errors = {};

  if (!password) {
    errors.password = 'La contraseña es obligatoria.';
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'La confirmación es obligatoria.';
  } else if (password && password !== confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }

  return errors;
}

export function canSubmitResetPassword(status, submitting) {
  return status === RECOVERY_STATUS.READY && !submitting;
}

export function translateAuthError(error) {
  const message = typeof error === 'string' ? error : error?.message || '';
  const normalized = message.toLowerCase();

  if (!message) return RECOVERY_MESSAGES.genericUpdateError;
  if (normalized.includes('auth session missing')) return RECOVERY_MESSAGES.invalid;
  if (normalized.includes('invalid') || normalized.includes('expired') || normalized.includes('otp')) {
    return RECOVERY_MESSAGES.invalid;
  }
  if (normalized.includes('password')) {
    return `No se pudo actualizar la contraseña. Verificá que tenga al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  return RECOVERY_MESSAGES.genericUpdateError;
}

export function hasRecoveryTokens(urlString) {
  const url = new URL(urlString);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));

  return Boolean(
    url.searchParams.get('code') ||
    hash.get('access_token') ||
    hash.get('refresh_token')
  );
}
