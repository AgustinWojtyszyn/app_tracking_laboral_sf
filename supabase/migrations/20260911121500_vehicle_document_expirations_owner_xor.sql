-- Enforce that each document expiration belongs to exactly one owner:
-- either a vehicle or a driver, never both.
--
-- NOT VALID keeps the migration deploy-safe if a legacy inconsistent row
-- already exists, while PostgreSQL still enforces the rule for new/updated rows.

alter table public.vehicle_document_expirations
  drop constraint if exists vehicle_document_expirations_owner_check;

alter table public.vehicle_document_expirations
  add constraint vehicle_document_expirations_owner_check
  check ((vehicle_id is not null) <> (driver_id is not null))
  not valid;
