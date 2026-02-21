-- =============================================================================
-- RLS Policy Patch — run this in Supabase SQL Editor
--
-- Fixes two bugs in the original groups-migration-schema.sql AND adds an RPC
-- to make group creation atomic + RLS-safe without any circular dependency.
--
-- BUG 1 — Circular RLS deadlock on group creation
--   group_members INSERT policy checks:
--     EXISTS (SELECT 1 FROM groups WHERE created_by = auth.uid())
--   But groups SELECT policy requires a group_members row to exist first.
--   Result: the very first member insert always fails → "Failed to create group".
--   FIX A: Fixed by the groups SELECT policy below.
--   FIX B: The create_group_with_member RPC (SECURITY DEFINER) bypasses RLS
--          entirely — both inserts run in one atomic transaction.
--
-- BUG 2 — Co-member display names are invisible
--   profiles SELECT policy: USING (auth.uid() = id)
--   Only lets you see YOUR OWN profile row.
--   Result: nested profile join in group queries returns null for all other
--   members → paidByName shows a truncated UUID instead of a real name.
--   Fix: add a second SELECT policy that allows group members to see the
--   profiles of other members in shared groups.
-- =============================================================================


-- ── Fix 1 — groups SELECT policy ─────────────────────────────────────────────

DROP POLICY IF EXISTS "Group members can view their groups" ON groups;

CREATE POLICY "Group members can view their groups"
  ON groups FOR SELECT TO authenticated
  USING (
    -- Creator can always see their own group (even before being added to
    -- group_members, which breaks the circular dependency).
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = groups.id
        AND gm.user_id  = auth.uid()
    )
  );


-- ── Fix 2 — profiles SELECT policy for co-members ────────────────────────────

DROP POLICY IF EXISTS "Group members can view co-member profiles" ON profiles;

CREATE POLICY "Group members can view co-member profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    -- Your own profile (existing policy covers this too, but be explicit)
    auth.uid() = id
    OR
    -- Any user who shares at least one group with you
    EXISTS (
      SELECT 1
      FROM group_members gm1
      JOIN group_members gm2 ON gm2.group_id = gm1.group_id
      WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = profiles.id
    )
  );


-- ── Fix 3 — Atomic group creation RPC (bypasses RLS circular dependency) ─────
--
-- SECURITY DEFINER means the function runs as the Supabase owner role, so
-- neither the groups INSERT policy nor the group_members INSERT policy is
-- checked — the function enforces its own security (auth.uid() IS NOT NULL).
-- This is the canonical Supabase pattern for multi-table atomic writes.

-- Add any columns missing from the original groups table creation
ALTER TABLE groups ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS currency    TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_by  UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add missing is_you column on group_members if absent
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS is_you    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add display_name column to profiles if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url   TEXT;
-- The original schema had name/email as NOT NULL — relax them so the
-- backfill and the new trigger (which only sets display_name) don't fail
ALTER TABLE profiles ALTER COLUMN name  DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Backfill profiles rows for any existing auth users who signed up
-- before the handle_new_user trigger was created.
INSERT INTO profiles (id, display_name, email)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  au.email
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Sync display_name for existing rows that have it null
UPDATE profiles p
SET
  display_name = COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  email        = COALESCE(p.email, au.email)
FROM auth.users au
WHERE p.id = au.id
  AND (p.display_name IS NULL OR p.email IS NULL);

CREATE OR REPLACE FUNCTION create_group_with_member(
  p_name        TEXT,
  p_description TEXT    DEFAULT NULL,
  p_currency    TEXT    DEFAULT 'USD'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_user_id  UUID := auth.uid();
BEGIN
  -- Reject unauthenticated callers (auth.uid() is NULL outside a session)
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Insert the group (created_by = caller's uid)
  INSERT INTO groups (name, description, currency, created_by)
  VALUES (p_name, p_description, p_currency, v_user_id)
  RETURNING id INTO v_group_id;

  -- 2. Insert the creator's membership row in the same transaction
  INSERT INTO group_members (group_id, user_id, is_you)
  VALUES (v_group_id, v_user_id, TRUE);

  RETURN v_group_id;
END;
$$;

-- ── Fix 5 — Break self-referential RLS on group_members ─────────────────────
--
-- The group_members SELECT policy was:
--   USING (EXISTS (SELECT 1 FROM group_members WHERE user_id = auth.uid()))
-- This is self-referential: checking visibility of group_members rows requires
-- querying group_members again, which triggers the same policy. PostgreSQL
-- breaks the recursion by only returning already-visible rows, so a joiner
-- only ever sees their own member row — the creator's row is invisible.
--
-- Fix: a SECURITY DEFINER function that reads group_members WITHOUT RLS to
-- return the group_ids the caller belongs to. The policy then uses this
-- to decide visibility without any circular dependency.

CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT group_id FROM group_members WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_my_group_ids() TO authenticated;

-- Re-create the group_members SELECT policy using the helper
DROP POLICY IF EXISTS "Group members can view members" ON group_members;

CREATE POLICY "Group members can view members"
  ON group_members FOR SELECT TO authenticated
  USING (
    group_id IN (SELECT get_my_group_ids())
  );

-- Re-create the groups SELECT policy using the same helper
-- (avoids same circular issue when group_members check is needed)
DROP POLICY IF EXISTS "Group members can view their groups" ON groups;

CREATE POLICY "Group members can view their groups"
  ON groups FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR id IN (SELECT get_my_group_ids())
  );
--
-- The original redeem_invite only stamped used_at. The user was never added
-- to group_members, so they couldn't see the group after joining.

-- Create group_invites table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS group_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_group_invites_token    ON group_invites(token);
CREATE INDEX IF NOT EXISTS idx_group_invites_group_id ON group_invites(group_id);

ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read invites by token" ON group_invites;
DROP POLICY IF EXISTS "Authenticated users can create invites"        ON group_invites;
DROP POLICY IF EXISTS "Creator can update their own invites"          ON group_invites;
DROP POLICY IF EXISTS "Creator can delete their own invites"          ON group_invites;

CREATE POLICY "Authenticated users can read invites by token"
  ON group_invites FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create invites"
  ON group_invites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update their own invites"
  ON group_invites FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete their own invites"
  ON group_invites FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION redeem_invite(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite  group_invites%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  -- Fetch and lock the invite row (prevents concurrent double-redeem)
  SELECT * INTO v_invite
  FROM group_invites
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;

  -- Already used?
  IF v_invite.used_at IS NOT NULL THEN
    RETURN json_build_object('error', 'already_used');
  END IF;

  -- Expired?
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN json_build_object('error', 'expired');
  END IF;

  -- Stamp used_at
  UPDATE group_invites
  SET used_at = NOW()
  WHERE id = v_invite.id;

  -- Add the joining user to group_members.
  -- group_invites.group_id is TEXT (legacy); cast to UUID for the FK.
  -- ON CONFLICT DO NOTHING handles the case where the creator scans
  -- their own link or the user somehow joins twice.
  INSERT INTO group_members (group_id, user_id, is_you)
  VALUES (v_invite.group_id::UUID, v_user_id, FALSE)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- Return group_id so the frontend can fetch and display the group
  RETURN json_build_object(
    'ok',       true,
    'group_id', v_invite.group_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_invite(TEXT) TO authenticated;

-- ── Fix 6 — Create missing tables and fix RLS on group_expenses ──────────────
--
-- group_expenses / group_expense_participants / group_settlements likely don't
-- exist in the live DB yet. The INSERT policies also use a direct
-- EXISTS (SELECT FROM group_members) check which suffers the same
-- self-referential RLS issue as group_members itself — fixed by using
-- get_my_group_ids() instead.

CREATE TABLE IF NOT EXISTS group_expenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  description       TEXT NOT NULL,
  total_amount      NUMERIC(12, 2) NOT NULL,
  currency          TEXT NOT NULL,
  paid_by_member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE RESTRICT,
  split_type        TEXT NOT NULL CHECK (split_type IN ('equal', 'unequal', 'percentage')),
  date              DATE NOT NULL,
  timestamp         BIGINT NOT NULL,
  category          TEXT,
  created_by        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guard: if the table already existed from a partial run, ensure all columns are present
-- If the table was created with an old 'amount' column instead of 'total_amount', make it
-- nullable so inserts that only set 'total_amount' do not violate the NOT NULL constraint.
DO $$ BEGIN
  ALTER TABLE group_expenses ALTER COLUMN amount DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $$;
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS description       TEXT;
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS total_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS currency          TEXT;
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS paid_by_member_id UUID REFERENCES group_members(id) ON DELETE RESTRICT;
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS split_type        TEXT;
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS date              DATE;
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS timestamp         BIGINT;
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS category          TEXT;
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS created_by        UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE group_expenses ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_group_expenses_group_id   ON group_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_group_expenses_created_by ON group_expenses(created_by);

ALTER TABLE group_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can view expenses" ON group_expenses;
DROP POLICY IF EXISTS "Group members can add expenses"  ON group_expenses;
DROP POLICY IF EXISTS "Creator can delete expense"      ON group_expenses;

CREATE POLICY "Group members can view expenses"
  ON group_expenses FOR SELECT TO authenticated
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "Group members can add expenses"
  ON group_expenses FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND group_id IN (SELECT get_my_group_ids())
  );

CREATE POLICY "Creator can delete expense"
  ON group_expenses FOR DELETE TO authenticated
  USING (auth.uid() = created_by);


CREATE TABLE IF NOT EXISTS group_expense_participants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
  share      NUMERIC(12, 2) NOT NULL,
  UNIQUE (expense_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_gep_expense_id ON group_expense_participants(expense_id);
CREATE INDEX IF NOT EXISTS idx_gep_member_id  ON group_expense_participants(member_id);

ALTER TABLE group_expense_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can view participants"     ON group_expense_participants;
DROP POLICY IF EXISTS "Expense creator can insert participants" ON group_expense_participants;
DROP POLICY IF EXISTS "Expense creator can delete participants" ON group_expense_participants;

CREATE POLICY "Group members can view participants"
  ON group_expense_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      WHERE ge.id = group_expense_participants.expense_id
        AND ge.group_id IN (SELECT get_my_group_ids())
    )
  );

CREATE POLICY "Expense creator can insert participants"
  ON group_expense_participants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      WHERE ge.id = group_expense_participants.expense_id
        AND ge.created_by = auth.uid()
    )
  );

CREATE POLICY "Expense creator can delete participants"
  ON group_expense_participants FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      WHERE ge.id = group_expense_participants.expense_id
        AND ge.created_by = auth.uid()
    )
  );


CREATE TABLE IF NOT EXISTS group_settlements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE RESTRICT,
  to_member_id   UUID NOT NULL REFERENCES group_members(id) ON DELETE RESTRICT,
  amount         NUMERIC(12, 2) NOT NULL,
  currency       TEXT NOT NULL,
  note           TEXT,
  date           DATE NOT NULL,
  timestamp      BIGINT NOT NULL,
  created_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guard: if the table already existed from a partial run, ensure all columns are present
ALTER TABLE group_settlements ADD COLUMN IF NOT EXISTS from_member_id UUID REFERENCES group_members(id) ON DELETE RESTRICT;
ALTER TABLE group_settlements ADD COLUMN IF NOT EXISTS to_member_id   UUID REFERENCES group_members(id) ON DELETE RESTRICT;
ALTER TABLE group_settlements ADD COLUMN IF NOT EXISTS currency       TEXT;
ALTER TABLE group_settlements ADD COLUMN IF NOT EXISTS note           TEXT;
ALTER TABLE group_settlements ADD COLUMN IF NOT EXISTS date           DATE;
ALTER TABLE group_settlements ADD COLUMN IF NOT EXISTS timestamp      BIGINT;
ALTER TABLE group_settlements ADD COLUMN IF NOT EXISTS created_by     UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE group_settlements ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_group_settlements_group_id ON group_settlements(group_id);

ALTER TABLE group_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can view settlements" ON group_settlements;
DROP POLICY IF EXISTS "Group members can add settlements"  ON group_settlements;
DROP POLICY IF EXISTS "Creator can delete settlement"      ON group_settlements;

CREATE POLICY "Group members can view settlements"
  ON group_settlements FOR SELECT TO authenticated
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "Group members can add settlements"
  ON group_settlements FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND group_id IN (SELECT get_my_group_ids())
  );

CREATE POLICY "Creator can delete settlement"
  ON group_settlements FOR DELETE TO authenticated
  USING (auth.uid() = created_by);
