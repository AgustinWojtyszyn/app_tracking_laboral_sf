import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const parseBool = (value: string | null) => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
};

const buildEmail = (
  job: Record<string, any>,
  worker: Record<string, any>,
  groupName: string | null
) => {
  const workerName = worker.display_name || worker.alias || 'Trabajador';
  const requestedBy = job.requested_by || 'Sin solicitante';
  const description = job.description || 'Sin descripcion';
  const location = job.location || 'Sin ubicacion';
  const date = job.date || 'Sin fecha';

  const subjectBase = groupName ? `${groupName} - Nueva solicitud` : 'Nueva solicitud asignada';

  const lines = [
    `Hola ${workerName},`,
    '',
    'Tenes una nueva solicitud asignada.',
    '',
    `Trabajo: ${description}`,
    `Lugar: ${location}`,
    `Fecha: ${date}`,
    `Solicita: ${requestedBy}`,
  ];

  if (groupName) {
    lines.push(`Grupo: ${groupName}`);
  }

  lines.push('', 'Saludos.');

  return {
    subject: subjectBase,
    content: lines.join('\n'),
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPortRaw = Deno.env.get('SMTP_PORT');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    const smtpFrom = Deno.env.get('SMTP_FROM');
    const smtpSecure = parseBool(Deno.env.get('SMTP_SECURE'));

    const smtpPort = Number(smtpPortRaw || '465');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Supabase env vars.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom || Number.isNaN(smtpPort)) {
      return new Response(JSON.stringify({ success: false, error: 'Missing SMTP env vars.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Missing auth token.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const actorId = authData.user.id;

    const body = await req.json().catch(() => ({}));
    const jobId = body?.job_id;

    if (!jobId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing job_id.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: job, error: jobError } = await adminClient
      .from('jobs')
      .select('id, user_id, group_id, worker_id, requested_by, location, description, date')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ success: false, error: 'Job not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: actorProfile } = await adminClient
      .from('users')
      .select('role')
      .eq('id', actorId)
      .maybeSingle();

    const isAdmin = actorProfile?.role === 'admin';
    if (!isAdmin && job.user_id !== actorId) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: worker, error: workerError } = await adminClient
      .from('workers')
      .select('display_name, alias, email')
      .eq('id', job.worker_id)
      .single();

    if (workerError || !worker) {
      return new Response(JSON.stringify({ success: false, error: 'Worker not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!worker.email) {
      return new Response(JSON.stringify({ success: false, error: 'Worker has no email.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    let groupName: string | null = null;
    if (job.group_id) {
      const { data: group } = await adminClient
        .from('groups')
        .select('name')
        .eq('id', job.group_id)
        .maybeSingle();
      groupName = group?.name || null;
    }

    const { subject, content } = buildEmail(job, worker, groupName);

    const client = new SmtpClient();
    try {
      if (smtpSecure || smtpPort === 465) {
        await client.connectTLS({
          hostname: smtpHost,
          port: smtpPort,
          username: smtpUser,
          password: smtpPass,
        });
      } else {
        await client.connect({
          hostname: smtpHost,
          port: smtpPort,
          username: smtpUser,
          password: smtpPass,
        });
      }

      await client.send({
        from: smtpFrom,
        to: worker.email,
        subject,
        content,
      });
    } finally {
      try {
        await client.close();
      } catch (_) {
        // ignore close errors
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Unexpected error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
