/**
 * balanceEngine.ts
 *
 * Pure functions for group expense balance calculations.
 * NO side-effects, NO React imports — fully unit-testable.
 */

import {
    GroupExpense,
    Settlement,
    GroupMember,
    NetBalanceMap,
    DebtInstruction,
    ParticipantShare,
} from '../types';

// ─── Net Balance Calculation ──────────────────────────────────────────────────

/**
 * Calculates the net monetary position of each member in a group.
 *
 * Algorithm:
 *   For each expense:
 *     - paidByMember receives  +totalAmount  (they fronted the money)
 *     - each participant gets  -share         (their portion of the cost)
 *   For each settlement:
 *     - fromMember gets  +amount  (they paid, reducing their debt)
 *     - toMember gets    -amount  (they received, now owed less)
 *
 * A positive balance means the member is owed money.
 * A negative balance means the member owes money.
 */
export function calculateNetBalances(
    expenses: GroupExpense[],
    settlements: Settlement[],
    members: GroupMember[]
): NetBalanceMap {
    const balances: NetBalanceMap = {};

    // Initialise all members at zero
    members.forEach((m) => {
        balances[m.id] = 0;
    });

    // Process expenses
    expenses.forEach((expense) => {
        // Payer is credited the full amount
        if (balances[expense.paidByMemberId] !== undefined) {
            balances[expense.paidByMemberId] += expense.totalAmount;
        }
        // Each participant is debited their share
        expense.participants.forEach((p) => {
            if (balances[p.memberId] !== undefined) {
                balances[p.memberId] -= p.share;
            }
        });
    });

    // Process settlements
    settlements.forEach((s) => {
        if (balances[s.fromMemberId] !== undefined) {
            balances[s.fromMemberId] += s.amount; // paid → reduced debt
        }
        if (balances[s.toMemberId] !== undefined) {
            balances[s.toMemberId] -= s.amount; // received → reduced credit
        }
    });

    return balances;
}

// ─── Debt Simplification ──────────────────────────────────────────────────────

/**
 * Transforms a NetBalanceMap into a minimal list of payment instructions
 * using the greedy two-pointer algorithm.
 *
 * The number of transactions is minimised: at most (N-1) transactions
 * for N members. Members with a zero balance are ignored.
 */
export function simplifyDebts(balances: NetBalanceMap): DebtInstruction[] {
    const EPSILON = 0.001; // treat < 0.1 paise as zero (floating-point safety)

    // Build mutable arrays of creditors (owed >) and debtors (owe <)
    const creditors: Array<{ id: string; amount: number }> = [];
    const debtors: Array<{ id: string; amount: number }> = [];

    Object.entries(balances).forEach(([id, balance]) => {
        if (balance > EPSILON) creditors.push({ id, amount: balance });
        else if (balance < -EPSILON) debtors.push({ id, amount: Math.abs(balance) });
    });

    // Sort descending so we always process the largest imbalances first
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const instructions: DebtInstruction[] = [];
    let ci = 0; // creditor pointer
    let di = 0; // debtor pointer

    while (ci < creditors.length && di < debtors.length) {
        const creditor = creditors[ci];
        const debtor = debtors[di];
        const transfer = Math.min(creditor.amount, debtor.amount);

        if (transfer > EPSILON) {
            instructions.push({
                fromMemberId: debtor.id,
                toMemberId: creditor.id,
                amount: Math.round(transfer * 100) / 100, // round to 2 dp
            });
        }

        creditor.amount -= transfer;
        debtor.amount -= transfer;

        if (creditor.amount < EPSILON) ci++;
        if (debtor.amount < EPSILON) di++;
    }

    return instructions;
}

// ─── Split Helpers ────────────────────────────────────────────────────────────

/**
 * Splits totalAmount equally among participantIds.
 * Distributes any remainder cent(s) to the first participant.
 */
export function splitEqually(
    totalAmount: number,
    participantIds: string[]
): ParticipantShare[] {
    if (participantIds.length === 0) return [];

    const base = Math.floor((totalAmount * 100) / participantIds.length); // in paise/cents
    const remainder = Math.round(totalAmount * 100) - base * participantIds.length;

    return participantIds.map((id, index) => ({
        memberId: id,
        share: (base + (index === 0 ? remainder : 0)) / 100,
    }));
}

/**
 * Splits totalAmount by percentage.
 * Returns resolved rupee/cent amounts per participant.
 *
 * @param shares  Array of { memberId, percentage } — percentages should sum to 100.
 * @throws        Error if percentages do not sum to 100 (within ±0.01 tolerance).
 */
export function splitByPercentage(
    totalAmount: number,
    shares: Array<{ memberId: string; percentage: number }>
): ParticipantShare[] {
    const total = shares.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
        throw new Error(`Percentages must sum to 100 (got ${total.toFixed(2)})`);
    }

    // Compute raw amounts
    const rawShares = shares.map((s) => ({
        memberId: s.memberId,
        rawCents: (totalAmount * s.percentage) / 100,
    }));

    // Distribute using largest-remainder method to avoid rounding drift
    const flooredCents = rawShares.map((s) => Math.floor(s.rawCents * 100));
    const fractionals = rawShares.map((s, i) => ({
        index: i,
        frac: s.rawCents * 100 - flooredCents[i],
    }));

    const targetCents = Math.round(totalAmount * 100);
    let distributed = flooredCents.reduce((a, b) => a + b, 0);
    let remainder = targetCents - distributed;

    // Give remainder cents to those with the highest fractional parts
    fractionals
        .sort((a, b) => b.frac - a.frac)
        .slice(0, remainder)
        .forEach((f) => {
            flooredCents[f.index]++;
        });

    return shares.map((s, i) => ({
        memberId: s.memberId,
        share: flooredCents[i] / 100,
    }));
}

/**
 * Validates unequal custom amounts and returns ParticipantShare[].
 *
 * @param shares  Array of { memberId, amount } — amounts should sum to totalAmount.
 * @throws        Error if amounts do not sum to totalAmount (within ±0.01 tolerance).
 */
export function splitUnequally(
    totalAmount: number,
    shares: Array<{ memberId: string; amount: number }>
): ParticipantShare[] {
    const sum = shares.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(sum - totalAmount) > 0.01) {
        throw new Error(
            `Share amounts (${sum.toFixed(2)}) must sum to total (${totalAmount.toFixed(2)})`
        );
    }
    return shares.map((s) => ({ memberId: s.memberId, share: s.amount }));
}

// ─── Convenience Accessor ─────────────────────────────────────────────────────

/**
 * Returns the display name of a member given the group's member list.
 * Falls back to the raw ID if not found.
 */
export function getMemberName(
    members: GroupMember[],
    memberId: string
): string {
    const member = members.find((m) => m.id === memberId);
    if (!member) return memberId;
    return member.isYou ? 'You' : member.name;
}
