import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const levelLabel = (level: string) => level === 'vencido' ? 'vencido' : `${level} dias`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const smtpFrom = Deno.env.get('SMTP_FROM');
  const adminEmails = (Deno.env.get('VEHICLE_DOCUMENT_ALERT_RECIPIENTS') || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !smtpFrom || adminEmails.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'Missing required environment variables.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const { data: alerts, error } = await client.rpc('vehicle_document_alert_candidates');
  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const sent: string[] = [];
  for (const alert of alerts || []) {
    const subject = `Vencimiento ${levelLabel(alert.alert_level)}: ${alert.custom_document_name || alert.document_type}`;
    const owner = alert.vehicle_label || alert.driver_label || 'Sin asociado';
    const text = [
      `Tipo de documento: ${alert.custom_document_name || alert.document_type}`,
      `Asociado: ${owner}`,
      `Fecha de vencimiento: ${alert.expires_at}`,
      `Dias restantes: ${alert.days_remaining}`,
      `Nivel de alerta: ${alert.alert_level}`,
      alert.observations ? `Observaciones: ${alert.observations}` : null,
    ].filter(Boolean).join('\n');
    const html = `<div style="font-family:Arial,sans-serif;color:#111827">
      <h2 style="margin:0 0 12px">Alerta de vencimiento</h2>
      <p><strong>Tipo:</strong> ${escapeHtml(alert.custom_document_name || alert.document_type)}</p>
      <p><strong>Asociado:</strong> ${escapeHtml(owner)}</p>
      <p><strong>Vence:</strong> ${escapeHtml(alert.expires_at)}</p>
      <p><strong>Dias restantes:</strong> ${escapeHtml(alert.days_remaining)}</p>
      <p><strong>Nivel:</strong> ${escapeHtml(alert.alert_level)}</p>
      ${alert.observations ? `<p><strong>Observaciones:</strong> ${escapeHtml(alert.observations)}</p>` : ''}
    </div>`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: smtpFrom,
        to: adminEmails,
        subject,
        text,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const details = await emailResponse.text();
      console.error('Vehicle document alert email failed', { id: alert.id, details });
      continue;
    }

    const { error: updateError } = await client
      .from('vehicle_document_expirations')
      .update({
        last_notified_at: new Date().toISOString(),
        last_alert_level: alert.alert_level,
      })
      .eq('id', alert.id);

    if (updateError) {
      console.error('Vehicle document alert update failed', { id: alert.id, error: updateError.message });
      continue;
    }

    sent.push(alert.id);
  }

  return new Response(JSON.stringify({ success: true, sent_count: sent.length, sent }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});
