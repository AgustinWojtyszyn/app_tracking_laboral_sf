-- Remove deprecated "billing" permission from users.permissions
-- Supports text[] and jsonb array types.
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
    INTO col_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'users'
    AND a.attname = 'permissions'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF col_type IS NULL THEN
    RAISE NOTICE 'Column public.users.permissions not found. Skipping cleanup.';
    RETURN;
  END IF;

  IF col_type = 'text[]' THEN
    UPDATE public.users
      SET permissions = array_remove(permissions, 'billing')
    WHERE permissions @> ARRAY['billing'];
  ELSIF col_type = 'jsonb' THEN
    UPDATE public.users
      SET permissions = COALESCE(
        (
          SELECT jsonb_agg(value)
          FROM jsonb_array_elements_text(permissions) AS value
          WHERE value <> 'billing'
        ),
        '[]'::jsonb
      )
    WHERE permissions ? 'billing';
  ELSE
    RAISE NOTICE 'Unsupported permissions column type: %', col_type;
  END IF;
END $$;
