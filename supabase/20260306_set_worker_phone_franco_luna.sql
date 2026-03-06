-- Set WhatsApp phone for worker Franco Luna
update public.workers
set phone = '+542645016032',
    updated_at = now()
where id = '6bad0803-208e-4ba9-bf23-902886d423d8';
