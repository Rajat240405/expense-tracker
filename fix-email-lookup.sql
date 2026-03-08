-- =============================================================================
-- Fix: Email → Display Name Lookup for 1-to-1 Direct Splits
--
-- Run this in Supabase SQL Editor AFTER fix-new-tables.sql
--
-- Problems fixed:
--   1. The profiles table is missing email for users who signed up after the
--      groups-migration-schema.sql (its handle_new_user trigger didn't save email).
--   2. The client was querying profiles by email directly, which RLS blocks for
--      users who are not yet in a group/split together.
--   3. Google sign-in users store name as raw_user_meta_data->>'full_name' but
--      the old trigger/lookup missed the ->>'name' fallback key.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Fix handle_new_user so every new sign-up (email/password AND Google)
--    saves *both* display_name and email in profiles.
--    ON CONFLICT DO UPDATE ensures existing rows are back-filled correctly
--    when a user re-authenticates via a new OAuth provider.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      NEW.email
    ),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    display_name = COALESCE(
                     EXCLUDED.display_name,
                     profiles.display_name
                   );
  RETURN NEW;
END;
$$;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Back-fill email and display_name for all existing users whose profiles
--    are missing this data (covers Google + email/password sign-ups from before
--    this migration).
-- ---------------------------------------------------------------------------
UPDATE public.profiles p
SET
  email = COALESCE(p.email, au.email),
  display_name = COALESCE(
    NULLIF(TRIM(p.display_name), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'name'), ''),
    au.email
  )
FROM auth.users au
WHERE p.id = au.id
  AND (p.email IS NULL OR p.display_name IS NULL OR TRIM(p.display_name) = '');

-- ---------------------------------------------------------------------------
-- 3. RPC: get_display_name_by_email
--    Allows an authenticated user to look up a partner's display name by email
--    BEFORE a split exists (so the group-member RLS policy doesn't help yet).
--    SECURITY DEFINER: bypasses RLS to read auth.users, but only returns the
--    display_name — no sensitive data is leaked.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_display_name_by_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_name    TEXT;
BEGIN
  -- Require caller to be authenticated
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- Look up user by email in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Prefer profiles.display_name (already computed and stored)
  SELECT display_name INTO v_name
  FROM public.profiles
  WHERE id = v_user_id;

  -- Fall back to raw OAuth metadata if profiles row is stale / missing name
  IF v_name IS NULL OR TRIM(v_name) = '' THEN
    SELECT COALESCE(
      NULLIF(TRIM(raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(raw_user_meta_data->>'name'), ''),
      email
    ) INTO v_name
    FROM auth.users
    WHERE id = v_user_id;
  END IF;

  RETURN v_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_display_name_by_email(TEXT) TO authenticated;
