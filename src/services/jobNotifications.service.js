import { supabase } from '@/lib/customSupabaseClient';

const getAccessToken = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  let session = sessionData?.session || null;
  if (!session) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data?.session || null;
  }
  return session?.access_token || null;
};

const invokeFunction = async (name, payload) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const accessToken = await getAccessToken();

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Falta configuración de Supabase.' };
  }

  if (!accessToken) {
    return { error: 'No hay sesión activa.' };
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  if (!res.ok) {
    return { error: data?.error || `HTTP ${res.status}` };
  }

  return { data };
};

export const notifyWorker = async (jobId) => {
  try {
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const result = await invokeFunction(
      'notify-worker-email',
      { job_id: jobId }
    );
    if (result?.error) {
      console.warn('notify-worker-email error', { requestId, error: result.error });
      return ['Email'];
    }
    return [];
  } catch (error) {
    console.warn('notify-worker-email failed', error);
    return ['Email'];
  }
};
