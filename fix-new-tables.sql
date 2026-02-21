-- =============================================================================
-- New Tables Migration — Personal Expenses + Direct Splits
-- Run this in Supabase SQL Editor AFTER fix-rls-policies.sql
-- =============================================================================

-- ── personal_expenses ─────────────────────────────────────────────────────────
-- Per-user expense log with no split component.

CREATE TABLE IF NOT EXISTS personal_expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'INR',
  category    TEXT,
  description TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  timestamp   BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_expenses_user_id ON personal_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_date    ON personal_expenses(date);

ALTER TABLE personal_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own personal expenses"   ON personal_expenses;
DROP POLICY IF EXISTS "Users can insert own personal expenses" ON personal_expenses;
DROP POLICY IF EXISTS "Users can update own personal expenses" ON personal_expenses;
DROP POLICY IF EXISTS "Users can delete own personal expenses" ON personal_expenses;

CREATE POLICY "Users can view own personal expenses"
  ON personal_expenses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal expenses"
  ON personal_expenses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal expenses"
  ON personal_expenses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own personal expenses"
  ON personal_expenses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ── direct_splits ─────────────────────────────────────────────────────────────
-- A 1-to-1 split session between exactly two users.
-- user_one is always the creator; user_two joins via their profile id.

CREATE TABLE IF NOT EXISTS direct_splits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_one   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_two   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label      TEXT,                       -- optional name for this split pair
  currency   TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT different_users CHECK (user_one <> user_two)
);

CREATE INDEX IF NOT EXISTS idx_direct_splits_user_one ON direct_splits(user_one);
CREATE INDEX IF NOT EXISTS idx_direct_splits_user_two ON direct_splits(user_two);

ALTER TABLE direct_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view direct splits"   ON direct_splits;
DROP POLICY IF EXISTS "Creator can create direct splits"      ON direct_splits;
DROP POLICY IF EXISTS "Participants can update direct splits" ON direct_splits;
DROP POLICY IF EXISTS "Creator can delete direct splits"      ON direct_splits;

CREATE POLICY "Participants can view direct splits"
  ON direct_splits FOR SELECT TO authenticated
  USING (auth.uid() = user_one OR auth.uid() = user_two);

CREATE POLICY "Creator can create direct splits"
  ON direct_splits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_one);

CREATE POLICY "Participants can update direct splits"
  ON direct_splits FOR UPDATE TO authenticated
  USING (auth.uid() = user_one OR auth.uid() = user_two);

CREATE POLICY "Creator can delete direct splits"
  ON direct_splits FOR DELETE TO authenticated
  USING (auth.uid() = user_one);


-- ── direct_expenses ───────────────────────────────────────────────────────────
-- An individual expense within a direct 1:1 split session.

CREATE TABLE IF NOT EXISTS direct_expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id    UUID NOT NULL REFERENCES direct_splits(id) ON DELETE CASCADE,
  paid_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL,
  description TEXT,
  category    TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  timestamp   BIGINT NOT NULL,
  settled     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_expenses_split_id ON direct_expenses(split_id);
CREATE INDEX IF NOT EXISTS idx_direct_expenses_paid_by  ON direct_expenses(paid_by);

ALTER TABLE direct_expenses ENABLE ROW LEVEL SECURITY;

-- Helper: returns direct_split ids the current user participates in (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION get_my_direct_split_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM direct_splits
  WHERE user_one = auth.uid() OR user_two = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_my_direct_split_ids() TO authenticated;

DROP POLICY IF EXISTS "Participants can view direct expenses"   ON direct_expenses;
DROP POLICY IF EXISTS "Participants can insert direct expenses" ON direct_expenses;
DROP POLICY IF EXISTS "Payer can update direct expenses"        ON direct_expenses;
DROP POLICY IF EXISTS "Payer can delete direct expenses"        ON direct_expenses;

CREATE POLICY "Participants can view direct expenses"
  ON direct_expenses FOR SELECT TO authenticated
  USING (split_id IN (SELECT get_my_direct_split_ids()));

CREATE POLICY "Participants can insert direct expenses"
  ON direct_expenses FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = paid_by
    AND split_id IN (SELECT get_my_direct_split_ids())
  );

CREATE POLICY "Payer can update direct expenses"
  ON direct_expenses FOR UPDATE TO authenticated
  USING (auth.uid() = paid_by)
  WITH CHECK (auth.uid() = paid_by);

CREATE POLICY "Payer can delete direct expenses"
  ON direct_expenses FOR DELETE TO authenticated
  USING (auth.uid() = paid_by);
