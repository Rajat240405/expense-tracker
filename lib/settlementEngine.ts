/**
 * settlementEngine.ts
 *
 * Pure functions for creating and querying settlements.
 * NO side-effects, NO React imports.
 */

import { Settlement } from '../types';

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Builds a complete Settlement object ready to be stored.
 */
export function createSettlement(
    params: Omit<Settlement, 'id' | 'timestamp'>
): Settlement {
    return {
        ...params,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
    };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Returns all settlements for a given group, sorted newest-first.
 */
export function getGroupSettlements(
    settlements: Settlement[],
    groupId: string
): Settlement[] {
    return settlements
        .filter((s) => s.groupId === groupId)
        .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Returns settlements between two specific members (in either direction).
 */
export function getSettlementsBetween(
    settlements: Settlement[],
    groupId: string,
    memberIdA: string,
    memberIdB: string
): Settlement[] {
    return settlements.filter(
        (s) =>
            s.groupId === groupId &&
            ((s.fromMemberId === memberIdA && s.toMemberId === memberIdB) ||
                (s.fromMemberId === memberIdB && s.toMemberId === memberIdA))
    );
}

/**
 * Returns the total amount settled between two members in a specific direction.
 */
export function totalSettledFrom(
    settlements: Settlement[],
    groupId: string,
    fromMemberId: string,
    toMemberId: string
): number {
    return settlements
        .filter(
            (s) =>
                s.groupId === groupId &&
                s.fromMemberId === fromMemberId &&
                s.toMemberId === toMemberId
        )
        .reduce((sum, s) => sum + s.amount, 0);
}
