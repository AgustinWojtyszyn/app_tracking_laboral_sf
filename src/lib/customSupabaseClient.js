import { createClient } from '@supabase/supabase-js';

export const isLocalSupabaseUrl = (url) => (
  ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)
);

export const validateSupabaseConfig = ({
  supabaseUrl,
  supabaseAnonKey,
  isProduction = false,
}) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error('Invalid VITE_SUPABASE_URL: expected a valid URL');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Invalid VITE_SUPABASE_URL: expected http or https protocol');
  }

  if (isProduction && parsedUrl.protocol !== 'https:') {
    throw new Error('Invalid VITE_SUPABASE_URL: HTTPS is required in production');
  }

  return {
    supabaseUrl: parsedUrl.toString().replace(/\/$/, ''),
    supabaseAnonKey,
    host: parsedUrl.host,
    isLocal: isLocalSupabaseUrl(parsedUrl),
  };
};

const supabaseConfig = validateSupabaseConfig({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  isProduction: import.meta.env.PROD,
});

const { supabaseUrl, supabaseAnonKey } = supabaseConfig;

const resolveHost = (value) => {
  try {
    return new URL(value).host;
  } catch {
    return value || 'invalid-url';
  }
};

const host = resolveHost(supabaseUrl);
if (!globalThis.__supabaseUrlHostLogged) {
  console.info(`[Supabase] URL host: ${host}`);
  globalThis.__supabaseUrlHostLogged = true;
}

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

const runDevHealthCheck = async () => {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/jobs?select=id&limit=1`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (response.status === 404 || body?.code === 'PGRST205') {
        console.error('App apuntando a proyecto equivocado o DB no migrada');
      }
    }
  } catch (error) {
    console.warn('Supabase health check failed:', error);
  }
};

if (import.meta.env.DEV && typeof window !== 'undefined' && !globalThis.__supabaseHealthCheckRan) {
  globalThis.__supabaseHealthCheckRan = true;
  void runDevHealthCheck();
}

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
