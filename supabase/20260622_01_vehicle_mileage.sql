alter table public.vehicles
  add column if not exists mileage_start integer,
  add column if not exists mileage_end integer;

alter table public.vehicles
  drop constraint if exists vehicles_mileage_start_check,
  drop constraint if exists vehicles_mileage_end_check,
  drop constraint if exists vehicles_mileage_range_check;

alter table public.vehicles
  add constraint vehicles_mileage_start_check
    check (mileage_start is null or mileage_start >= 0),
  add constraint vehicles_mileage_end_check
    check (mileage_end is null or mileage_end >= 0),
  add constraint vehicles_mileage_range_check
    check (mileage_start is null or mileage_end is null or mileage_end > mileage_start);

notify pgrst, 'reload schema';
