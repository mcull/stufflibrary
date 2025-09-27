-- Grant full privileges to Supabase `service_role` for complete database access
-- This upgrades from previous SELECT-only permissions to ALL PRIVILEGES
-- Guarded execution only if the role exists to avoid errors in non-Supabase environments

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    -- Grant usage on schema
    EXECUTE 'GRANT USAGE ON SCHEMA public TO service_role';

    -- Grant all privileges on existing tables
    EXECUTE 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role';

    -- Grant all privileges on existing sequences
    EXECUTE 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role';

    -- Set default privileges for future tables
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO service_role';

    -- Set default privileges for future sequences
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO service_role';

    RAISE NOTICE 'Granted ALL PRIVILEGES to service_role on schema public';
  ELSE
    RAISE NOTICE 'service_role does not exist, skipping privilege grants';
  END IF;
END
$$;