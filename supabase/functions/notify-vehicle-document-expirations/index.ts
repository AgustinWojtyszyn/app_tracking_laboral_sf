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
const logoUrl = 'https://tracking.servifoodapp.site/servifood_logo_white_text_HQ.png';
const headerColor = '#1e3a8a';

const buildAlertEmail = (alert: Record<string, any>) => {
  const documentName = alert.custom_document_name || alert.document_type || 'Documento';
  const owner = alert.vehicle_label || alert.driver_label || 'Sin asociado';
  const daysRemaining = Number(alert.days_remaining);
  const isExpired = alert.alert_level === 'vencido' || daysRemaining < 0;
  const statusLabel = isExpired
    ? 'Documento vencido'
    : `Faltan ${daysRemaining} dia${Math.abs(daysRemaining) === 1 ? '' : 's'}`;
  const urgencyColor = isExpired ? '#b91c1c' : daysRemaining <= 7 ? '#b45309' : '#1e3a8a';
  const subject = `${isExpired ? 'Documento vencido' : 'Vencimiento proximo'}: ${documentName}`;

  const text = [
    'Alerta de vencimiento - ServiFood',
    '',
    `Tipo de documento: ${documentName}`,
    `Asociado: ${owner}`,
    `Fecha de vencimiento: ${alert.expires_at}`,
    `Dias restantes: ${alert.days_remaining}`,
    `Nivel de alerta: ${alert.alert_level}`,
    alert.observations ? `Observaciones: ${alert.observations}` : null,
    '',
    'Revisar el modulo Registro de equipo y planta para actualizar la documentacion o cargar observaciones.',
  ].filter(Boolean).join('\n');

  const html = `
    <div style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
              <tr>
                <td style="background:${headerColor};padding:20px 24px;text-align:center;">
                  <img src="${logoUrl}" alt="ServiFood" style="height:78px;max-width:320px;display:inline-block;border:0;" />
                </td>
              </tr>
              <tr>
                <td style="padding:26px 28px 8px;">
                  <div style="display:inline-block;background:${urgencyColor};color:#ffffff;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">
                    ${escapeHtml(statusLabel)}
                  </div>
                  <h1 style="margin:16px 0 8px;font-size:24px;line-height:1.25;color:#111827;">Alerta de vencimiento documental</h1>
                  <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.5;">
                    Hay documentacion del modulo <strong>Registro de equipo y planta</strong> que requiere revision.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 28px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 10px;">
                    <tr>
                      <td style="width:38%;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px 0 0 10px;padding:12px 14px;font-size:13px;color:#64748b;font-weight:700;">Documento</td>
                      <td style="background:#ffffff;border:1px solid #e5e7eb;border-left:0;border-radius:0 10px 10px 0;padding:12px 14px;font-size:14px;color:#111827;font-weight:700;">${escapeHtml(documentName)}</td>
                    </tr>
                    <tr>
                      <td style="width:38%;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px 0 0 10px;padding:12px 14px;font-size:13px;color:#64748b;font-weight:700;">Asociado</td>
                      <td style="background:#ffffff;border:1px solid #e5e7eb;border-left:0;border-radius:0 10px 10px 0;padding:12px 14px;font-size:14px;color:#111827;">${escapeHtml(owner)}</td>
                    </tr>
                    <tr>
                      <td style="width:38%;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px 0 0 10px;padding:12px 14px;font-size:13px;color:#64748b;font-weight:700;">Fecha de vencimiento</td>
                      <td style="background:#ffffff;border:1px solid #e5e7eb;border-left:0;border-radius:0 10px 10px 0;padding:12px 14px;font-size:14px;color:#111827;">${escapeHtml(alert.expires_at)}</td>
                    </tr>
                    <tr>
                      <td style="width:38%;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px 0 0 10px;padding:12px 14px;font-size:13px;color:#64748b;font-weight:700;">Nivel de alerta</td>
                      <td style="background:#ffffff;border:1px solid #e5e7eb;border-left:0;border-radius:0 10px 10px 0;padding:12px 14px;font-size:14px;color:${urgencyColor};font-weight:700;">${escapeHtml(levelLabel(alert.alert_level))}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${alert.observations ? `
              <tr>
                <td style="padding:0 28px 18px;">
                  <div style="border-left:4px solid ${headerColor};background:#f8fafc;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0 0 6px;color:#475569;font-size:13px;font-weight:700;">Observaciones</p>
                    <p style="margin:0;color:#111827;font-size:14px;line-height:1.5;">${escapeHtml(alert.observations)}</p>
                  </div>
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding:0 28px 26px;">
                  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;color:#1e3a8a;font-size:14px;line-height:1.5;">
                    Revisar la documentacion asociada y actualizar el estado desde la App de Tracking Laboral.
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 28px;text-align:center;color:#64748b;font-size:12px;">
                  ServiFood - Alertas automaticas de vencimientos
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, text, html };
};

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
    const { subject, text, html } = buildAlertEmail(alert);

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
