// @refresh reset
/**
 * NotificationContext.tsx
 *
 * Provides real-time notification state to the whole app.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  For authenticated users:                                     │
 * │  • Fetches initial notifications from Supabase on mount       │
 * │  • Subscribes to postgres_changes on the notifications table  │
 * │    filtered by user_id → new rows appear instantly            │
 * │  • Exposes markRead(), markAllRead(), clearAll()              │
 * ├──────────────────────────────────────────────────────────────┤
 * │  For guests:                                                  │
 * │  • notifications = []   unreadCount = 0                       │
 * │  • All write operations are no-ops                            │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import {
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications,
} from '../lib/notificationService';
import type { AppNotification } from '../lib/notificationService';

// ─── Context shape ────────────────────────────────────────────────────────────

interface NotificationContextValue {
    notifications:  AppNotification[];
    unreadCount:    number;
    loading:        boolean;
    markRead:       (id: string)  => Promise<void>;
    markAllRead:    ()            => Promise<void>;
    clearAll:       ()            => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function useNotifications(): NotificationContextValue {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading]             = useState(false);

    // ── Initial fetch ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        let cancelled = false;
        setLoading(true);

        fetchNotifications(30).then((data) => {
            if (!cancelled) {
                setNotifications(data);
                setLoading(false);
            }
        });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // ── Realtime subscription ─────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event:  'INSERT',
                    schema: 'public',
                    table:  'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const row = payload.new as Record<string, unknown>;
                    const incoming: AppNotification = {
                        id:        row.id as string,
                        userId:    row.user_id as string,
                        actorId:   (row.actor_id as string | null) ?? null,
                        type:      row.type as AppNotification['type'],
                        entityId:  (row.entity_id as string | null) ?? null,
                        message:   row.message as string,
                        isRead:    row.is_read as boolean,
                        createdAt: new Date(row.created_at as string).getTime(),
                    };
                    // Prepend — newest first
                    setNotifications((prev) =>
                        prev.some((n) => n.id === incoming.id)
                            ? prev
                            : [incoming, ...prev]
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event:  'UPDATE',
                    schema: 'public',
                    table:  'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const row = payload.new as Record<string, unknown>;
                    setNotifications((prev) =>
                        prev.map((n) =>
                            n.id === (row.id as string)
                                ? { ...n, isRead: row.is_read as boolean }
                                : n
                        )
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event:  'DELETE',
                    schema: 'public',
                    table:  'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const oldRow = payload.old as Record<string, unknown>;
                    setNotifications((prev) =>
                        prev.filter((n) => n.id !== (oldRow.id as string))
                    );
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // ── Write operations (optimistic-first) ───────────────────────────────────

    const markRead = useCallback(async (id: string) => {
        // Optimistic
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        await markNotificationRead(id);
    }, []);

    const markAllRead = useCallback(async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        await markAllNotificationsRead();
    }, []);

    const clearAll = useCallback(async () => {
        setNotifications([]);
        await clearAllNotifications();
    }, []);

    // ── Derived ───────────────────────────────────────────────────────────────
    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.isRead).length,
        [notifications]
    );

    const value = useMemo<NotificationContextValue>(
        () => ({ notifications, unreadCount, loading, markRead, markAllRead, clearAll }),
        [notifications, unreadCount, loading, markRead, markAllRead, clearAll]
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
