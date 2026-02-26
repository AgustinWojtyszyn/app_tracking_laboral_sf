import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const expectedProjectRef = 'kaprywsyjqmqinyggsjt';

const resolveHost = (value) => {
  try {
    return new URL(value).host;
  } catch {
    return value || 'invalid-url';
  }
};

if (!supabaseUrl || !supabaseAnonKey) {
  const message = 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables';
  console.error(message);
  throw new Error(message);
}

const host = resolveHost(supabaseUrl);
if (!globalThis.__supabaseUrlHostLogged) {
  console.info(`[Supabase] URL host: ${host}`);
  globalThis.__supabaseUrlHostLogged = true;
}

if (!supabaseUrl.includes(expectedProjectRef)) {
  const message = `Misconfigured Supabase project URL: expected ${expectedProjectRef}, got ${supabaseUrl}`;
  console.error(message);
  throw new Error(message);
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
