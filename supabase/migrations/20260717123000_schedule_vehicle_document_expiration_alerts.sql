-- Schedule vehicle document expiration alerts.
-- Runs daily at 12:00 UTC, equivalent to 09:00 America/Argentina/Buenos_Aires.
--
-- Required Vault secrets before applying this migration:
--   vehicle_document_alert_project_url = https://kaprywsyjqmqinyggsjt.supabase.co
--   vehicle_document_alert_function_token = Supabase publishable/anon key allowed to invoke Edge Functions

create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'notify-vehicle-document-expirations-daily'
  ) then
    perform cron.unschedule('notify-vehicle-document-expirations-daily');
  end if;
end;
$$;

select cron.schedule(
  'notify-vehicle-document-expirations-daily',
  '0 12 * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'vehicle_document_alert_project_url'
      ) || '/functions/v1/notify-vehicle-document-expirations',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'vehicle_document_alert_function_token'
        ),
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'vehicle_document_alert_function_token'
        )
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
