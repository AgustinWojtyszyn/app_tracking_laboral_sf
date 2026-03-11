import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const normalizePhone = (value: string) => {
  if (!value) return '';
  let digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);
  return digits;
};

const buildMessage = (job: Record<string, any>, worker: Record<string, any>, groupName: string | null) => {
  const workerName = worker.display_name || worker.alias || 'Trabajador';
  const requestedBy = job.requested_by || 'Sin solicitante';
  const description = job.description || 'Sin descripcion';
  const location = job.location || 'Sin ubicacion';
  const date = job.date || 'Sin fecha';
  const actionType = (job.action_type || '').trim() || 'Sin tipo de acción';
  const sectorType = (job.sector_type || '').trim();
  const sectorCustom = (job.sector_custom || '').trim();
  const sectorLabel = sectorType === 'Otro' && sectorCustom ? sectorCustom : (sectorType || 'Sin sector');

  const formatCurrency = (value: unknown) => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return 'Sin monto';
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

  const lines = [
    `Hola ${workerName}, tenes una nueva solicitud asignada.`,
    `Solicita: ${requestedBy}`,
    `Tipo de acción: ${actionType}`,
    `Sector / equipo: ${sectorLabel}`,
    `Descripción: ${description}`,
    `Costo trabajador: ${costSpent}`,
    `Cobrar: ${amountToCharge}`,
    `Lugar: ${location}`,
    `Fecha: ${date}`,
  ];

  if (groupName) {
    lines.push(`Grupo: ${groupName}`);
  }

  return lines.join('\n');
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
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN');
    const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!supabaseUrl || !serviceRoleKey || !whatsappToken || !whatsappPhoneNumberId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing environment variables.' }), {
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
      .select('id, user_id, group_id, worker_id, requested_by, location, description, date, action_type, sector_type, sector_custom, cost_spent, amount_to_charge')
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
      .select('display_name, alias, phone')
      .eq('id', job.worker_id)
      .single();

    if (workerError || !worker) {
      return new Response(JSON.stringify({ success: false, error: 'Worker not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!worker.phone) {
      return new Response(JSON.stringify({ success: false, error: 'Worker has no phone.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const normalizedPhone = normalizePhone(worker.phone);
    if (!normalizedPhone || normalizedPhone.length < 8) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid phone format.' }), {
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

    const message = buildMessage(job, worker, groupName);

    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v19.0/${whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        }),
      }
    );

    const whatsappBody = await whatsappResponse.json().catch(() => ({}));
    if (!whatsappResponse.ok) {
      return new Response(JSON.stringify({ success: false, error: 'WhatsApp API error.', details: whatsappBody }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: whatsappBody?.messages?.[0]?.id || null,
    }), {
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
