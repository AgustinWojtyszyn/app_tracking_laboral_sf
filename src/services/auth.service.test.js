import { beforeEach, describe, expect, it, vi } from 'vitest';

const buildAuthService = async (authOverrides = {}) => {
  vi.resetModules();

  const supabase = {
    auth: {
      exchangeCodeForSession: vi.fn(),
      setSession: vi.fn(),
      getSession: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      ...authOverrides,
    },
    from: vi.fn(),
  };

  vi.doMock('@/lib/customSupabaseClient', () => ({
    supabase,
    customSupabaseClient: supabase,
    default: supabase,
  }));

  const { authService } = await import('./auth.service');
  return { authService, supabase };
};

describe('authService.recoverPasswordSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('intercambia el parámetro code de PKCE por sesión recuperada', async () => {
    const session = { access_token: 'session-token' };
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ data: { session }, error: null });
    const { authService, supabase } = await buildAuthService({ exchangeCodeForSession });

    const result = await authService.recoverPasswordSession('https://tracking.servifoodapp.site/reset-password?code=valid-code');

    expect(result).toEqual({ success: true, session });
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('valid-code');
  });

  it('establece sesión cuando Supabase entrega access_token y refresh_token en hash', async () => {
    const session = { access_token: 'session-token' };
    const setSession = vi.fn().mockResolvedValue({ data: { session }, error: null });
    const { authService, supabase } = await buildAuthService({ setSession });

    const result = await authService.recoverPasswordSession(
      'https://tracking.servifoodapp.site/reset-password#access_token=access&refresh_token=refresh&type=recovery',
    );

    expect(result).toEqual({ success: true, session });
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('devuelve error controlado para enlace inválido o vencido', async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: new Error('invalid request'),
    });
    const { authService } = await buildAuthService({ exchangeCodeForSession });

    const result = await authService.recoverPasswordSession('https://tracking.servifoodapp.site/reset-password?code=expired');

    expect(result.success).toBe(false);
    expect(result.message).toBe('El enlace de recuperación no es válido o ya venció.');
  });

  it('actualiza contraseña solo mediante updateUser y propaga resultado exitoso', async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    const { authService, supabase } = await buildAuthService({ updateUser });

    const result = await authService.changePassword('12345678');

    expect(result.success).toBe(true);
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: '12345678' });
  });

  it('envía el email de recuperación hacia /reset-password', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    const { authService, supabase } = await buildAuthService({ resetPasswordForEmail });

    const result = await authService.resetPassword('persona@servifood.com');

    expect(result.success).toBe(true);
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('persona@servifood.com', {
      redirectTo: 'https://tracking.servifoodapp.site/reset-password',
    });
  });
});
