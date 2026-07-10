import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Input from '@/components/Input';
import {
  RECOVERY_MESSAGES,
  RECOVERY_STATUS,
  canSubmitResetPassword,
  hasRecoveryTokens,
  translateAuthError,
  validateResetPasswordForm,
} from './resetPassword.helpers';

describe('resetPassword helpers', () => {
  it('valida contraseña obligatoria, confirmación obligatoria y mínimo existente', () => {
    expect(validateResetPasswordForm('', '')).toEqual({
      password: 'La contraseña es obligatoria.',
      confirmPassword: 'La confirmación es obligatoria.',
    });

    expect(validateResetPasswordForm('1234567', '1234567')).toEqual({
      password: 'La contraseña debe tener al menos 8 caracteres.',
    });
  });

  it('valida contraseñas que no coinciden', () => {
    expect(validateResetPasswordForm('12345678', '87654321')).toEqual({
      confirmPassword: 'Las contraseñas no coinciden.',
    });
  });

  it('acepta contraseñas válidas coincidentes', () => {
    expect(validateResetPasswordForm('12345678', '12345678')).toEqual({});
  });

  it('traduce errores técnicos de Supabase a mensajes en español', () => {
    expect(translateAuthError('Auth session missing!')).toBe(RECOVERY_MESSAGES.invalid);
    expect(translateAuthError('invalid flow state, expired')).toBe(RECOVERY_MESSAGES.invalid);
    expect(translateAuthError('unexpected')).toBe(RECOVERY_MESSAGES.genericUpdateError);
  });

  it('detecta enlaces de recuperación PKCE y con tokens en hash', () => {
    expect(hasRecoveryTokens('https://tracking.servifoodapp.site/reset-password?code=abc')).toBe(true);
    expect(hasRecoveryTokens('https://tracking.servifoodapp.site/reset-password#access_token=abc&refresh_token=def')).toBe(true);
    expect(hasRecoveryTokens('https://tracking.servifoodapp.site/reset-password')).toBe(false);
  });

  it('bloquea submit durante verificación, enlace inválido o envío en curso', () => {
    expect(canSubmitResetPassword(RECOVERY_STATUS.VERIFYING, false)).toBe(false);
    expect(canSubmitResetPassword(RECOVERY_STATUS.INVALID, false)).toBe(false);
    expect(canSubmitResetPassword(RECOVERY_STATUS.READY, true)).toBe(false);
    expect(canSubmitResetPassword(RECOVERY_STATUS.READY, false)).toBe(true);
  });

  it('renderiza botón accesible para mostrar contraseña', () => {
    const html = renderToStaticMarkup(
      React.createElement(Input, {
        id: 'password',
        type: 'password',
        label: 'Contraseña',
        showPasswordToggle: true,
      }),
    );

    expect(html).toContain('type="password"');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Mostrar contraseña"');
  });
});
