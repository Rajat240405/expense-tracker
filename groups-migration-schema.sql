-- =============================================================================
-- Groups Migration Schema — Strict Authenticated-Only Architecture
-- Run this in Supabase SQL Editor AFTER supabase-schema.sql
--
-- IDEMPOTENT: Safe to re-run at any time.
--   • Tables:   CREATE TABLE IF NOT EXISTS — existing data preserved
--   • Policies: Dropped by name at the top before recreating
--   • Profiles: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE trigger
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0a. Drop all policies (idempotency guard)
--     Wrapped in EXCEPTION so a fresh DB (no tables yet) doesn't error
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  -- profiles
  DROP POLICY IF EXISTS "Users can view their own profile"          ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profile"        ON profiles;
  DROP POLICY IF EXISTS "Group members can view co-member profiles" ON profiles;

  -- groups
  DROP POLICY IF EXISTS "Group members can view their groups"     ON groups;
  DROP POLICY IF EXISTS "Authenticated users can create groups"   ON groups;
  DROP POLICY IF EXISTS "Creator can update group"                ON groups;
  DROP POLICY IF EXISTS "Creator can delete group"                ON groups;

  -- group_members
  DROP POLICY IF EXISTS "Group members can view members"   ON group_members;
  DROP POLICY IF EXISTS "Creator can insert members"       ON group_members;
  DROP POLICY IF EXISTS "Creator can delete members"       ON group_members;
  DROP POLICY IF EXISTS "Members can update their own row" ON group_members;

  -- group_expenses
  DROP POLICY IF EXISTS "Group members can view expenses" ON group_expenses;
  DROP POLICY IF EXISTS "Group members can add expenses"  ON group_expenses;
  DROP POLICY IF EXISTS "Creator can delete expense"      ON group_expenses;

  -- group_expense_participants
  DROP POLICY IF EXISTS "Group members can view participants"     ON group_expense_participants;
  DROP POLICY IF EXISTS "Expense creator can insert participants" ON group_expense_participants;
  DROP POLICY IF EXISTS "Expense creator can delete participants" ON group_expense_participants;

  -- group_settlements
  DROP POLICY IF EXISTS "Group members can view settlements" ON group_settlements;
  DROP POLICY IF EXISTS "Group members can add settlements"  ON group_settlements;
  DROP POLICY IF EXISTS "Creator can delete settlement"      ON group_settlements;
EXCEPTION WHEN undefined_table THEN
  NULL;  -- Tables don't exist yet on first run — safe to continue
END $$;


-- ---------------------------------------------------------------------------
-- 0b. profiles
--     Public mirror of auth.users. All group FKs reference this table.
--     A trigger auto-inserts a row here whenever a user signs up.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Own profile access
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Allow group members to view the display_name of users in the same group.
-- Without this, the nested profiles join in GROUP_SELECT returns null for
-- co-members, breaking paidByName resolution on expenses.
CREATE POLICY "Group members can view co-member profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM group_members gm1
      JOIN group_members gm2 ON gm2.group_id = gm1.group_id
      WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = profiles.id
    )
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create a profile row on every new sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ---------------------------------------------------------------------------
-- 1. groups
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  currency    TEXT NOT NULL DEFAULT 'USD',
  created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- The creator needs to see their own group BEFORE their group_members row
-- is inserted (the member INSERT policy does an EXISTS on groups). Without
-- `auth.uid() = created_by` here, there is a circular RLS deadlock:
--   group_members INSERT → reads groups → groups SELECT needs group_members
CREATE POLICY "Group members can view their groups"
  ON groups FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = groups.id
        AND gm.user_id  = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update group"
  ON groups FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can delete group"
  ON groups FOR DELETE TO authenticated
  USING (auth.uid() = created_by);


-- ---------------------------------------------------------------------------
-- 2. group_members
--    Strict: every member must be a registered, authenticated user.
--    No named-only / guest members.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS group_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_you    BOOLEAN NOT NULL DEFAULT FALSE,  -- true for the group creator's own row
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One membership row per user per group
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id  ON group_members(user_id);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view members"
  ON group_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id  = auth.uid()
    )
  );

CREATE POLICY "Creator can insert members"
  ON group_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id         = group_members.group_id
        AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "Creator can delete members"
  ON group_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id         = group_members.group_id
        AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "Members can update their own row"
  ON group_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 3. group_expenses
-- ---------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_group_expenses_group_id   ON group_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_group_expenses_created_by ON group_expenses(created_by);

ALTER TABLE group_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view expenses"
  ON group_expenses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_expenses.group_id
        AND gm.user_id  = auth.uid()
    )
  );

CREATE POLICY "Group members can add expenses"
  ON group_expenses FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_expenses.group_id
        AND gm.user_id  = auth.uid()
    )
  );

CREATE POLICY "Creator can delete expense"
  ON group_expenses FOR DELETE TO authenticated
  USING (auth.uid() = created_by);


-- ---------------------------------------------------------------------------
-- 4. group_expense_participants
--    Each row = one member's resolved share of one expense.
-- ---------------------------------------------------------------------------

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

CREATE POLICY "Group members can view participants"
  ON group_expense_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE ge.id      = group_expense_participants.expense_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Expense creator can insert participants"
  ON group_expense_participants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      WHERE ge.id         = group_expense_participants.expense_id
        AND ge.created_by = auth.uid()
    )
  );

CREATE POLICY "Expense creator can delete participants"
  ON group_expense_participants FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      WHERE ge.id         = group_expense_participants.expense_id
        AND ge.created_by = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- 5. group_settlements
-- ---------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_group_settlements_group_id ON group_settlements(group_id);

ALTER TABLE group_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view settlements"
  ON group_settlements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_settlements.group_id
        AND gm.user_id  = auth.uid()
    )
  );

CREATE POLICY "Group members can add settlements"
  ON group_settlements FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_settlements.group_id
        AND gm.user_id  = auth.uid()
    )
  );

CREATE POLICY "Creator can delete settlement"
  ON group_settlements FOR DELETE TO authenticated
  USING (auth.uid() = created_by);


-- ---------------------------------------------------------------------------
-- 6. Upgrade group_invites: promote group_id TEXT → UUID FK
--    Uncomment and run ONLY after group-invites-schema.sql is applied
-- ---------------------------------------------------------------------------
-- ALTER TABLE group_invites
--   ALTER COLUMN group_id TYPE UUID USING group_id::UUID,
--   ADD CONSTRAINT fk_group_invites_group
--     FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
