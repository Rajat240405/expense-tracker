-- ============================================================
-- notifications-schema.sql
-- Run once in Supabase SQL editor (or via migration tool)
-- ============================================================

-- 1. Table --------------------------------------------------

create table if not exists public.notifications (
    id          uuid primary key default gen_random_uuid(),

    -- recipient
    user_id     uuid not null references auth.users (id) on delete cascade,

    -- who triggered the event (null for system notifications)
    actor_id    uuid references auth.users (id) on delete set null,

    -- e.g. 'group_expense_added' | 'settlement_completed' | 'direct_split_created' | 'invite_accepted'
    type        text not null,

    -- id of the related entity (group, expense, split, etc.)
    entity_id   uuid,

    -- human-readable message shown in the bell dropdown
    message     text not null,

    is_read     boolean not null default false,

    created_at  timestamptz not null default now()
);

-- 2. Indexes ------------------------------------------------

create index if not exists notifications_user_id_idx  on public.notifications (user_id);
create index if not exists notifications_type_idx     on public.notifications (type);
create index if not exists notifications_is_read_idx  on public.notifications (user_id, is_read);

-- 3. Row-Level Security ------------------------------------

alter table public.notifications enable row level security;

-- Users may SELECT their own notifications
create policy "notifications: select own"
    on public.notifications for select
    using (auth.uid() = user_id);

-- Users may UPDATE (mark read) their own notifications
create policy "notifications: update own"
    on public.notifications for update
    using (auth.uid() = user_id);

-- Authenticated users may INSERT notifications for others
-- (actor inserts a notification for the recipient)
create policy "notifications: insert authenticated"
    on public.notifications for insert
    with check (auth.uid() is not null);

-- Users may DELETE their own notifications (optional: clear-all)
create policy "notifications: delete own"
    on public.notifications for delete
    using (auth.uid() = user_id);

-- 4. Enable Realtime replication ---------------------------
-- Supabase Realtime must be enabled for this table.
-- Run via Dashboard → Database → Replication → Add table  (or:)

alter publication supabase_realtime add table public.notifications;
