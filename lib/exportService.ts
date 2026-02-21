/**
 * exportService.ts
 *
 * Pure export/download helpers.
 * NO side-effects beyond creating a download, NO React imports.
 */

import { Group, GroupExpense, Settlement } from '../types';
import { calculateNetBalances } from './balanceEngine';

// ─── File Download Primitive ──────────────────────────────────────────────────

function downloadFile(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

// ─── JSON Export ─────────────────────────────────────────────────────────────

export interface GroupExportPayload {
    exportedAt: string;
    appVersion: string;
    groups: Array<{
        group: Group;
        expenses: GroupExpense[];
        settlements: Settlement[];
        balanceSummary: Record<string, number>;
    }>;
}

/**
 * Serialises all groups with their expenses, settlements, and computed balances
 * and triggers a browser download of a JSON file.
 */
export function exportGroupsAsJSON(
    groups: Group[],
    allExpenses: GroupExpense[],
    allSettlements: Settlement[]
): void {
    const payload: GroupExportPayload = {
        exportedAt: new Date().toISOString(),
        appVersion: '2.0.0',
        groups: groups.map((group) => {
            const expenses = allExpenses.filter((e) => e.groupId === group.id);
            const settlements = allSettlements.filter((s) => s.groupId === group.id);
            const balanceSummary = calculateNetBalances(expenses, settlements, group.members);
            return { group, expenses, settlements, balanceSummary };
        }),
    };

    downloadFile(
        `expense-groups-export-${formatDateForFilename()}.json`,
        JSON.stringify(payload, null, 2),
        'application/json'
    );
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

/**
 * Generates a multi-section CSV (one section per group) and triggers a download.
 */
export function exportGroupsAsCSV(
    groups: Group[],
    allExpenses: GroupExpense[],
    allSettlements: Settlement[]
): void {
    const sections: string[] = [];

    groups.forEach((group) => {
        const memberMap = Object.fromEntries(group.members.map((m) => [m.id, m.isYou ? 'You' : m.name]));
        const expenses = allExpenses.filter((e) => e.groupId === group.id);
        const settlements = allSettlements.filter((s) => s.groupId === group.id);

        const lines: string[] = [];

        // Group header
        lines.push(`Group: ${escapeCsv(group.name)} | Currency: ${group.currency}`);
        lines.push(`Members: ${group.members.map((m) => (m.isYou ? 'You' : m.name)).join(', ')}`);
        lines.push('');

        // Expenses section
        lines.push('EXPENSES');
        lines.push('Date,Description,Category,Paid By,Total,Split Type,Participant Splits');
        expenses
            .sort((a, b) => a.date.localeCompare(b.date))
            .forEach((exp) => {
                const splits = exp.participants
                    .map((p) => `${memberMap[p.memberId] ?? p.memberId}:${p.share.toFixed(2)}`)
                    .join('|');
                lines.push(
                    [
                        escapeCsv(exp.date),
                        escapeCsv(exp.description),
                        escapeCsv(exp.category ?? ''),
                        escapeCsv(memberMap[exp.paidByMemberId] ?? exp.paidByMemberId),
                        exp.totalAmount.toFixed(2),
                        exp.splitType,
                        escapeCsv(splits),
                    ].join(',')
                );
            });

        lines.push('');

        // Settlements section
        lines.push('SETTLEMENTS');
        lines.push('Date,From,To,Amount,Note');
        settlements
            .sort((a, b) => a.date.localeCompare(b.date))
            .forEach((s) => {
                lines.push(
                    [
                        escapeCsv(s.date),
                        escapeCsv(memberMap[s.fromMemberId] ?? s.fromMemberId),
                        escapeCsv(memberMap[s.toMemberId] ?? s.toMemberId),
                        s.amount.toFixed(2),
                        escapeCsv(s.note ?? ''),
                    ].join(',')
                );
            });

        sections.push(lines.join('\n'));
    });

    const csvContent = sections.join('\n\n' + '─'.repeat(60) + '\n\n');

    downloadFile(
        `expense-groups-export-${formatDateForFilename()}.csv`,
        csvContent,
        'text/csv;charset=utf-8;'
    );
}

// ─── Also export personal expenses as CSV ────────────────────────────────────

export interface PersonalExpenseRow {
    id: string;
    date: string;
    amount: number;
    currency: string;
    category: string;
    note?: string;
}

/**
 * Exports the flat personal expense list (non-group) as a CSV file.
 */
export function exportPersonalExpensesAsCSV(expenses: PersonalExpenseRow[]): void {
    const lines: string[] = [
        'PERSONAL EXPENSES',
        'Date,Amount,Currency,Category,Note',
        ...expenses
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((e) =>
                [
                    escapeCsv(e.date),
                    e.amount.toFixed(2),
                    escapeCsv(e.currency ?? 'INR'),
                    escapeCsv(e.category),
                    escapeCsv(e.note ?? ''),
                ].join(',')
            ),
    ];

    downloadFile(
        `personal-expenses-export-${formatDateForFilename()}.csv`,
        lines.join('\n'),
        'text/csv;charset=utf-8;'
    );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeCsv(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function formatDateForFilename(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
