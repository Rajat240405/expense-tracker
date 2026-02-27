/**
 * backupService.ts
 *
 * Full-app backup (export) and restore (import) utilities.
 *
 * Export:
 *   – Serialises personal expenses + group data into a single timestamped JSON file.
 *   – File name: expenses-backup-YYYY-MM-DD.json
 *
 * Import:
 *   – Validates the schema before touching any state.
 *   – Returns the parsed payload so callers can merge safely without duplicates.
 *   – Works for both guest (localStorage) and authenticated (Supabase) modes.
 *
 * NO React imports; NO side-effects beyond file download trigger.
 */

import type { Expense, Group, GroupExpense, Settlement } from '../types';

// ─── Schema version ───────────────────────────────────────────────────────────

export const BACKUP_SCHEMA_VERSION = 1;

// ─── Payload shape ────────────────────────────────────────────────────────────

export interface BackupPayload {
    schemaVersion: number;
    exportedAt: string;          // ISO-8601
    appVersion: string;
    personalExpenses: Expense[];
    groups: Group[];
    groupExpenses: GroupExpense[];
    settlements: Settlement[];
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Build and immediately download a full JSON backup file.
 */
export function exportFullBackup(
    personalExpenses: Expense[],
    groups: Group[],
    groupExpenses: GroupExpense[],
    settlements: Settlement[]
): void {
    const payload: BackupPayload = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: '2.0.0',
        personalExpenses,
        groups,
        groupExpenses,
        settlements,
    };

    const filename = `expenses-backup-${dateForFilename()}.json`;
    downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json');
}

// ─── Import / Validation ──────────────────────────────────────────────────────

export interface ImportResult {
    ok: true;
    payload: BackupPayload;
    stats: {
        personalExpenses: number;
        groups: number;
        groupExpenses: number;
        settlements: number;
    };
}

export interface ImportError {
    ok: false;
    message: string;
}

/**
 * Parse and validate a JSON string that was previously exported by this app.
 * Returns either a validated payload (ok: true) or a descriptive error (ok: false).
 */
export function parseBackupFile(jsonText: string): ImportResult | ImportError {
    let raw: unknown;
    try {
        raw = JSON.parse(jsonText);
    } catch {
        return { ok: false, message: 'File is not valid JSON.' };
    }

    if (typeof raw !== 'object' || raw === null) {
        return { ok: false, message: 'Backup file has an unexpected format.' };
    }

    const obj = raw as Record<string, unknown>;

    // Schema version check
    if (obj.schemaVersion !== BACKUP_SCHEMA_VERSION) {
        return {
            ok: false,
            message: `Unsupported backup version (got ${obj.schemaVersion}, expected ${BACKUP_SCHEMA_VERSION}).`,
        };
    }

    // Required arrays
    const requiredArrays: Array<keyof BackupPayload> = [
        'personalExpenses',
        'groups',
        'groupExpenses',
        'settlements',
    ];
    for (const key of requiredArrays) {
        if (!Array.isArray(obj[key])) {
            return { ok: false, message: `Backup is missing or invalid field: "${key}".` };
        }
    }

    // Shallow per-item validation
    const expenses = obj.personalExpenses as Expense[];
    for (const e of expenses) {
        if (typeof e.id !== 'string' || typeof e.amount !== 'number') {
            return { ok: false, message: 'Personal expenses contain invalid entries.' };
        }
    }

    const groups = obj.groups as Group[];
    for (const g of groups) {
        if (typeof g.id !== 'string' || typeof g.name !== 'string') {
            return { ok: false, message: 'Groups contain invalid entries.' };
        }
    }

    const payload = raw as BackupPayload;

    return {
        ok: true,
        payload,
        stats: {
            personalExpenses: payload.personalExpenses.length,
            groups: payload.groups.length,
            groupExpenses: payload.groupExpenses.length,
            settlements: payload.settlements.length,
        },
    };
}

/**
 * Merge backup personal expenses with current ones.
 * Skips duplicates by ID. Returns deduplicated merged array.
 */
export function mergePersonalExpenses(
    current: Expense[],
    incoming: Expense[]
): Expense[] {
    const existingIds = new Set(current.map((e) => e.id));
    const newItems = incoming.filter((e) => !existingIds.has(e.id));
    return [...current, ...newItems];
}

/**
 * Merge backup groups with current ones. Skips duplicates by ID.
 */
export function mergeGroups(current: Group[], incoming: Group[]): Group[] {
    const existingIds = new Set(current.map((g) => g.id));
    return [...current, ...incoming.filter((g) => !existingIds.has(g.id))];
}

/**
 * Merge group expenses / settlements. Skips duplicates by ID.
 */
export function mergeById<T extends { id: string }>(
    current: T[],
    incoming: T[]
): T[] {
    const existingIds = new Set(current.map((x) => x.id));
    return [...current, ...incoming.filter((x) => !existingIds.has(x.id))];
}

// ─── File picker helper ───────────────────────────────────────────────────────

/**
 * Opens a native file picker for .json files.
 * Resolves with the raw text content, or rejects on error / cancel.
 */
export function pickJsonFile(): Promise<string> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) {
                reject(new Error('No file selected'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        };
        // Handle cancel
        // Some browsers never fire onchange on cancel; listen once for focus
        window.addEventListener(
            'focus',
            () => setTimeout(() => { if (!input.files?.length) reject(new Error('No file selected')); }, 500),
            { once: true }
        );
        input.click();
    });
}

// ─── Private utils ────────────────────────────────────────────────────────────

function downloadFile(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function dateForFilename(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
