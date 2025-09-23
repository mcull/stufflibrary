-- Guarded grants for Supabase `service_role` (only if the role exists)
-- This avoids failures in environments where `service_role` is not present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO service_role';
    EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role';
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO service_role';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role';
  END IF;
END
$$;
