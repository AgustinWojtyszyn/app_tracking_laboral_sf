-- Fix schema cache error when saving fuel loads with the frontend payload.
-- Supabase/PostgREST rejects payload keys that do not exist in the table.

alter table public.vehicle_fuel_loads
  add column if not exists notes text;

notify pgrst, 'reload schema';
