/**
 * InviteService.ts
 *
 * All Supabase calls related to group invites.
 * Kept separate so JoinGroupPage stays clean and logic is testable.
 */

import { supabase } from './supabase';

export type InviteError =
    | 'not_authenticated'
    | 'invalid_token'
    | 'already_used'
    | 'expired'
    | 'network_error';

export interface RedeemResult {
    ok: true;
    groupId: string;
}

export interface RedeemFailure {
    ok: false;
    error: InviteError;
}

/**
 * Calls the SECURITY DEFINER Postgres function `redeem_invite`.
 * This atomically validates the token, checks expiry, and stamps used_at
 * in a single transaction — preventing race-condition double-redeem.
 */
export async function redeemInvite(
    token: string
): Promise<RedeemResult | RedeemFailure> {
    const { data, error } = await supabase.rpc('redeem_invite', {
        p_token: token,
    });

    if (error) {
        console.error('[InviteService] rpc error:', error);
        return { ok: false as const, error: 'network_error' as InviteError };
    }

    if (data?.error) {
        return { ok: false as const, error: data.error as InviteError };
    }

    return { ok: true as const, groupId: data.group_id as string };
}

/**
 * Creates a new invite link for a group.
 * Returns the token to build the invite URL:
 *   `${window.location.origin}/join/${token}`
 */
export async function createInvite(
    groupId: string,
    expiresInDays?: number
): Promise<{ token: string } | { error: string }> {
    const token = crypto.randomUUID();

    const expiresAt =
        expiresInDays != null
            ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
            : null;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return { error: 'not_authenticated' };

    const { error } = await supabase.from('group_invites').insert({
        group_id: groupId,
        token,
        created_by: userId,
        expires_at: expiresAt,
    });

    if (error) {
        console.error('[InviteService] insert error:', error);
        return { error: error.message };
    }

    return { token };
}
