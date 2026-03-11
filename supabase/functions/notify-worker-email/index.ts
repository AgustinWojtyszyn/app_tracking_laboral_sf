import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const RESEND_TIMEOUT_MS = 8000;

const logTiming = (label: string, startMs: number) => {
  const duration = performance.now() - startMs;
  console.log(`[timing] ${label}: ${duration.toFixed(1)}ms`);
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
  const title = job.title || 'Sin título';
  const status = job.status || 'pending';
  const editableByGroup = job.editable_by_group ? 'Sí' : 'No';
  const rawActionType = (job.action_type || '').trim();
  const rawSectorType = (job.sector_type || '').trim();
  const rawSectorCustom = (job.sector_custom || '').trim();
  const actionType = rawActionType || 'Sin tipo de acción';
  const sectorLabel = rawSectorType === 'Otro' && rawSectorCustom
    ? rawSectorCustom
    : (rawSectorType || 'Sin sector');

  const statusLabel = status === 'completed'
    ? 'Completado'
    : status === 'archived'
    ? 'Archivado'
    : 'Pendiente';

  const formatCurrency = (value: unknown) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) {
      return 'a determinar';
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const costSpent = formatCurrency(job.cost_spent);
  const amountToCharge = formatCurrency(job.amount_to_charge);

  const subjectSectorLabel = rawSectorType === 'Otro' && rawSectorCustom ? rawSectorCustom : rawSectorType;
  const subjectDetail = rawActionType && subjectSectorLabel
    ? `Nueva solicitud: ${rawActionType} en ${subjectSectorLabel}`
    : 'Nueva solicitud asignada';
  const subjectBase = groupName ? `${groupName} - ${subjectDetail}` : subjectDetail;

  const lines = [
    'Hola ' + workerName + ',',
    '',
    'Tenes una nueva solicitud asignada.',
    '',
    'Título: ' + title,
    'Estado: ' + statusLabel,
    'Solicita: ' + requestedBy,
    'Tipo de acción: ' + actionType,
    'Sector / equipo: ' + sectorLabel,
    'Descripción: ' + description,
    'Costo trabajador: ' + costSpent,
    'Cobrar: ' + amountToCharge,
    'Lugar: ' + location,
    'Fecha: ' + date,
  ];

  if (groupName) {
    lines.push('Grupo: ' + groupName);
  }
  lines.push('Editable por grupo: ' + editableByGroup);

  lines.push('', 'Saludos.');

  const logoUrl = 'https://tracking.servifoodapp.site/servifood_logo_white_text_HQ.png';
  const headerColor = '#1e3a8a';
  const html =
    '<div style="font-family: Arial, sans-serif; background:#f7f9fc; padding:24px;">' +
      '<div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">' +
        '<div style="background:' + headerColor + '; padding:18px; text-align:center;">' +
          '<img src="' + logoUrl + '" alt="ServiFood" style="height:48px; display:inline-block;" />' +
        '</div>' +
        '<div style="padding:24px; color:#111827;">' +
          '<h2 style="margin:0 0 16px; font-size:20px;">Nueva solicitud asignada</h2>' +
          '<p style="margin:6px 0;"><strong>Título:</strong> ' + title + '</p>' +
          '<p style="margin:6px 0;"><strong>Estado:</strong> ' + statusLabel + '</p>' +
          '<p style="margin:6px 0;"><strong>Solicita:</strong> ' + requestedBy + '</p>' +
          '<p style="margin:6px 0;"><strong>Tipo de acción:</strong> ' + actionType + '</p>' +
          '<p style="margin:6px 0;"><strong>Sector / equipo:</strong> ' + sectorLabel + '</p>' +
          '<p style="margin:6px 0;"><strong>Descripción:</strong> ' + description + '</p>' +
          '<p style="margin:6px 0;"><strong>Costo trabajador:</strong> ' + costSpent + '</p>' +
          '<p style="margin:6px 0;"><strong>Cobrar:</strong> ' + amountToCharge + '</p>' +
          '<p style="margin:6px 0;"><strong>Lugar:</strong> ' + location + '</p>' +
          '<p style="margin:6px 0;"><strong>Fecha:</strong> ' + date + '</p>' +
          (groupName ? ('<p style="margin:6px 0;"><strong>Grupo:</strong> ' + groupName + '</p>') : '') +
          '<p style="margin:6px 0;"><strong>Editable por grupo:</strong> ' + editableByGroup + '</p>' +
        '</div>' +
      '</div>' +
    '</div>';

  return {
    subject: subjectBase,
    content: lines.join('\n'),
    html,
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
    const totalStart = performance.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const smtpFrom = Deno.env.get('SMTP_FROM');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Supabase env vars.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!smtpFrom || !resendApiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Missing email env vars.' }), {
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

    const authStart = performance.now();
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    logTiming('auth.getUser', authStart);
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

    const jobProfileStart = performance.now();
    const [jobResult, actorProfileResult] = await Promise.all([
      adminClient
        .from('jobs')
        .select('id, user_id, group_id, worker_id, requested_by, location, description, date, title, status, editable_by_group, action_type, sector_type, sector_custom, cost_spent, amount_to_charge')
        .eq('id', jobId)
        .single(),
      adminClient
        .from('users')
        .select('role')
        .eq('id', actorId)
        .maybeSingle(),
    ]);
    logTiming('fetch job + actorProfile', jobProfileStart);

    const job = jobResult.data;
    const jobError = jobResult.error;
    if (jobError || !job) {
      return new Response(JSON.stringify({ success: false, error: 'Job not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const actorProfile = actorProfileResult.data;

    const isAdmin = actorProfile?.role === 'admin';
    if (!isAdmin && job.user_id !== actorId) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const workerGroupStart = performance.now();
    const workerPromise = adminClient
      .from('workers')
      .select('display_name, alias, email')
      .eq('id', job.worker_id)
      .single();
    const groupPromise = job.group_id
      ? adminClient
          .from('groups')
          .select('name')
          .eq('id', job.group_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });
    const [workerResult, groupResult] = await Promise.all([workerPromise, groupPromise]);
    logTiming('fetch worker + group', workerGroupStart);

    const worker = workerResult.data;
    const workerError = workerResult.error;

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

    const groupName: string | null = groupResult?.data?.name || null;

    const { subject, content, html } = buildEmail(job, worker, groupName);

    const resendStart = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: smtpFrom,
        to: worker.email,
        subject,
        text: content,
        html,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    logTiming('resend.fetch', resendStart);

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.json().catch(() => ({}));
      return new Response(JSON.stringify({
        success: false,
        error: 'Resend API error.',
        details: errorBody,
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    logTiming('total', totalStart);
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
