/**
 * useDirectSplitService.ts
 *
 * Returns the correct 1-1 split service implementation based on auth state:
 *   - Authenticated users  → Supabase (directSplitService)
 *   - Guest users          → localStorage (guestDirectSplitService)
 *
 * Both services share the same async API so components need no branching.
 */

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as SupabaseSvc from './directSplitService';
import * as GuestSvc    from './guestDirectSplitService';
import type { DirectSplit, DirectExpense } from '../types';

// ─── Shared interface ─────────────────────────────────────────────────────────

export interface DirectSplitService {
    fetchDirectSplits:   ()                                                    => Promise<DirectSplit[]>;
    createDirectSplit:   (input: Pick<DirectSplit, 'userTwo' | 'label' | 'currency'>) => Promise<DirectSplit>;
    deleteDirectSplit:   (id: string)                                          => Promise<void>;
    fetchDirectExpenses: (splitId: string)                                     => Promise<DirectExpense[]>;
    addDirectExpense:    (input: Omit<DirectExpense, 'id' | 'createdAt' | 'settled'>) => Promise<DirectExpense>;
    settleDirectExpense: (id: string)                                          => Promise<void>;
    deleteDirectExpense: (id: string)                                          => Promise<void>;
    /** true when data is stored locally (no cloud sync) */
    isGuest: boolean;
    /** stable user ID for the current session ('guest' for unauthenticated users) */
    currentUserId: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDirectSplitService(): DirectSplitService {
    const { user } = useAuth();

    return useMemo<DirectSplitService>(() => {
        if (user) {
            return {
                fetchDirectSplits:   SupabaseSvc.fetchDirectSplits,
                createDirectSplit:   SupabaseSvc.createDirectSplit,
                deleteDirectSplit:   SupabaseSvc.deleteDirectSplit,
                fetchDirectExpenses: SupabaseSvc.fetchDirectExpenses,
                addDirectExpense:    SupabaseSvc.addDirectExpense,
                settleDirectExpense: SupabaseSvc.settleDirectExpense,
                deleteDirectExpense: SupabaseSvc.deleteDirectExpense,
                isGuest:       false,
                currentUserId: user.id,
            };
        }

        return {
            fetchDirectSplits:   GuestSvc.fetchDirectSplits,
            createDirectSplit:   GuestSvc.createDirectSplit,
            deleteDirectSplit:   GuestSvc.deleteDirectSplit,
            fetchDirectExpenses: GuestSvc.fetchDirectExpenses,
            addDirectExpense:    GuestSvc.addDirectExpense,
            settleDirectExpense: GuestSvc.settleDirectExpense,
            deleteDirectExpense: GuestSvc.deleteDirectExpense,
            isGuest:       true,
            currentUserId: 'guest',
        };
    }, [user]);
}
