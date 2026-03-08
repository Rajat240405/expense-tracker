/**
 * notificationService.ts
 *
 * Supabase CRUD for the notifications table.
 * All functions require an active auth session (enforced by RLS).
 *
 * Notification types:
 *   group_expense_added   — someone added an expense to a shared group
 *   settlement_completed  — a debt was settled
 *   direct_split_created  — someone created a 1-1 split session
 *   invite_accepted       — a group invite was accepted
 */

import { supabase } from './supabase';

// ─── Domain type (mirrors the DB row) ─────────────────────────────────────────

export type NotificationType =
    | 'group_expense_added'
    | 'settlement_completed'
    | 'direct_split_created'
    | 'invite_accepted';

export interface AppNotification {
    id:        string;
    userId:    string;
    actorId:   string | null;
    type:      NotificationType;
    entityId:  string | null;
    message:   string;
    isRead:    boolean;
    createdAt: number; // ms since epoch
}

// ─── Row → domain converter ───────────────────────────────────────────────────

function toNotification(row: Record<string, unknown>): AppNotification {
    return {
        id:        row.id as string,
        userId:    row.user_id as string,
        actorId:   (row.actor_id as string | null) ?? null,
        type:      row.type as NotificationType,
        entityId:  (row.entity_id as string | null) ?? null,
        message:   row.message as string,
        isRead:    row.is_read as boolean,
        createdAt: new Date(row.created_at as string).getTime(),
    };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Fetch the latest N notifications for the current user. */
export async function fetchNotifications(limit = 30): Promise<AppNotification[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, actor_id, type, entity_id, message, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        // Silently return empty if table doesn't exist yet (42P01) — avoids console spam during setup
        if ((error as { code?: string }).code !== '42P01') {
            console.warn('[notificationService] fetchNotifications:', error.message);
        }
        return [];
    }
    return (data ?? []).map((r) => toNotification(r as Record<string, unknown>));
}

// ─── Write: mark read ─────────────────────────────────────────────────────────

export async function markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

    if (error) console.error('[notificationService] markNotificationRead:', error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

    if (error) console.error('[notificationService] markAllNotificationsRead:', error.message);
}

export async function clearAllNotifications(): Promise<void> {
    const { error } = await supabase.from('notifications').delete().neq('id', '');
    // The RLS "delete own" policy scopes this to user's own rows
    if (error) console.error('[notificationService] clearAllNotifications:', error.message);
}

// ─── Write: create ────────────────────────────────────────────────────────────

interface CreateNotificationInput {
    userId:   string;
    actorId?: string;
    type:     NotificationType;
    entityId?: string;
    message:  string;
}

/** Insert a single notification. Silently logs on error; never throws. */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
    const { error } = await supabase.from('notifications').insert({
        user_id:   input.userId,
        actor_id:  input.actorId ?? null,
        type:      input.type,
        entity_id: input.entityId ?? null,
        message:   input.message,
        is_read:   false,
    });
    if (error) console.error('[notificationService] createNotification:', error.message);
}

/** Insert a notification for multiple recipients (fan-out). */
export async function createNotificationsForUsers(
    userIds: string[],
    base: Omit<CreateNotificationInput, 'userId'>
): Promise<void> {
    if (userIds.length === 0) return;
    const rows = userIds.map((uid) => ({
        user_id:   uid,
        actor_id:  base.actorId ?? null,
        type:      base.type,
        entity_id: base.entityId ?? null,
        message:   base.message,
        is_read:   false,
    }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) console.error('[notificationService] createNotificationsForUsers:', error.message);
}

// ─── Helpers: group-member → user_id lookup ───────────────────────────────────

/**
 * Resolves the auth.user_id (profiles.id) for a list of group_member ids.
 * Used before fan-out so we send notifications to the right users.
 *
 * Returns a map: memberId → userId
 */
export async function memberIdsToUserIds(
    memberIds: string[]
): Promise<Record<string, string>> {
    if (memberIds.length === 0) return {};
    const { data, error } = await supabase
        .from('group_members')
        .select('id, user_id')
        .in('id', memberIds);

    if (error) {
        console.error('[notificationService] memberIdsToUserIds:', error.message);
        return {};
    }
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
        map[(row as { id: string; user_id: string }).id] =
            (row as { id: string; user_id: string }).user_id;
    }
    return map;
}

/**
 * Returns all user_ids for members of a given group,
 * optionally excluding the actor (so they don't notify themselves).
 */
export async function getGroupMemberUserIds(
    groupId: string,
    excludeUserId?: string
): Promise<string[]> {
    const { data, error } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

    if (error) {
        console.error('[notificationService] getGroupMemberUserIds:', error.message);
        return [];
    }
    const ids = (data ?? [])
        .map((r) => (r as { user_id: string }).user_id)
        .filter((uid) => uid !== excludeUserId);
    return ids;
}
