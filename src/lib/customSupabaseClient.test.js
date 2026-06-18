import { describe, expect, it } from 'vitest';
import { validateSupabaseConfig } from './customSupabaseClient';

const anonKey = 'anon-test-key';

describe('validateSupabaseConfig', () => {
  it('acepta el proyecto actual', () => {
    const config = validateSupabaseConfig({
      supabaseUrl: 'https://kaprywsyjqmqinyggsjt.supabase.co',
      supabaseAnonKey: anonKey,
      isProduction: true,
    });

    expect(config.host).toBe('kaprywsyjqmqinyggsjt.supabase.co');
    expect(config.supabaseAnonKey).toBe(anonKey);
  });

  it('acepta un proyecto staging con otro ref', () => {
    const config = validateSupabaseConfig({
      supabaseUrl: 'https://stagingref123456789.supabase.co',
      supabaseAnonKey: anonKey,
      isProduction: true,
    });

    expect(config.host).toBe('stagingref123456789.supabase.co');
  });

  it('permite Supabase local durante desarrollo', () => {
    const config = validateSupabaseConfig({
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: anonKey,
      isProduction: false,
    });

    expect(config.isLocal).toBe(true);
  });

  it('rechaza URL invalida', () => {
    expect(() => validateSupabaseConfig({
      supabaseUrl: 'not a url',
      supabaseAnonKey: anonKey,
      isProduction: false,
    })).toThrow('Invalid VITE_SUPABASE_URL');
  });

  it('rechaza variables faltantes', () => {
    expect(() => validateSupabaseConfig({
      supabaseUrl: '',
      supabaseAnonKey: anonKey,
      isProduction: false,
    })).toThrow('Missing VITE_SUPABASE_URL');

    expect(() => validateSupabaseConfig({
      supabaseUrl: 'https://kaprywsyjqmqinyggsjt.supabase.co',
      supabaseAnonKey: '',
      isProduction: false,
    })).toThrow('Missing VITE_SUPABASE_URL');
  });

  it('rechaza HTTP en produccion', () => {
    expect(() => validateSupabaseConfig({
      supabaseUrl: 'http://example.supabase.co',
      supabaseAnonKey: anonKey,
      isProduction: true,
    })).toThrow('HTTPS is required in production');
  });

  it('acepta HTTPS valido en produccion', () => {
    const config = validateSupabaseConfig({
      supabaseUrl: 'https://example.supabase.co/',
      supabaseAnonKey: anonKey,
      isProduction: true,
    });

    expect(config.supabaseUrl).toBe('https://example.supabase.co');
  });
});
