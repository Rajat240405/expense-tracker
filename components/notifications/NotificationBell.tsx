/**
 * NotificationBell.tsx
 *
 * Bell icon with unread badge + dropdown panel.
 *
 * Features:
 *   • Animated badge showing unread count (capped at 99)
 *   • Scrollable dropdown list (max-height: 400px)
 *   • Click single item → mark as read → navigate / dismiss
 *   • "Mark all read" and "Clear all" actions in dropdown header
 *   • Closes on Escape key or outside click
 *   • Works on both web and native (Capacitor WebView)
 *   • Only rendered for authenticated users
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import type { AppNotification } from '../../lib/notificationService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(ms: number): string {
    const diff = Date.now() - ms;
    const m = Math.floor(diff / 60_000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7)  return `${d}d ago`;
    return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function notificationIcon(type: AppNotification['type']): React.ReactNode {
    switch (type) {
        case 'group_expense_added':
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            );
        case 'settlement_completed':
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        case 'direct_split_created':
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M12 4v16m8-8H4" />
                </svg>
            );
        case 'invite_accepted':
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            );
        default:
            return (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

const NotificationBell: React.FC = () => {
    const { user } = useAuth();
    const { notifications, unreadCount, loading, markRead, markAllRead, clearAll } =
        useNotifications();

    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handle(e: MouseEvent) {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        function handle(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('keydown', handle);
        return () => document.removeEventListener('keydown', handle);
    }, [open]);

    const handleItemClick = useCallback(
        async (n: AppNotification) => {
            if (!n.isRead) await markRead(n.id);
            // Future: navigate to the related entity using n.entityId + n.type
        },
        [markRead]
    );

    const handleMarkAllRead = useCallback(async () => {
        await markAllRead();
    }, [markAllRead]);

    const handleClearAll = useCallback(async () => {
        await clearAll();
        setOpen(false);
    }, [clearAll]);

    // Don't render for guests
    if (!user) return null;

    const cappedCount = Math.min(unreadCount, 99);

    return (
        <div className="relative">
            {/* Bell button */}
            <button
                ref={buttonRef}
                onClick={() => setOpen((v) => !v)}
                title="Notifications"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                className={[
                    'relative p-2 rounded-xl transition-colors',
                    open
                        ? 'bg-white/[0.12] text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.08]',
                ].join(' ')}
            >
                {/* Bell SVG */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {/* Unread badge */}
                {cappedCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none shadow-md">
                        {cappedCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div
                    ref={panelRef}
                    className={[
                        'absolute right-0 mt-2 z-50',
                        'w-[340px] max-w-[calc(100vw-32px)]',
                        'bg-[#111827] border border-white/[0.10] rounded-2xl shadow-2xl shadow-black/50',
                        'flex flex-col overflow-hidden',
                    ].join(' ')}
                >
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                                    {cappedCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <>
                                    {unreadCount > 0 && <span className="text-white/20 text-xs">·</span>}
                                    <button
                                        onClick={handleClearAll}
                                        className="text-xs text-gray-500 hover:text-gray-300 font-medium transition-colors"
                                    >
                                        Clear all
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Notification list */}
                    <div className="overflow-y-auto max-h-[400px] overscroll-contain">
                        {loading ? (
                            <div className="py-10 text-center text-sm text-gray-500">
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <div className="flex justify-center mb-3">
                                    <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-500">You're all caught up</p>
                                <p className="text-xs text-gray-600 mt-1">New activity will appear here</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-white/[0.05]">
                                {notifications.map((n) => (
                                    <li key={n.id}>
                                        <button
                                            onClick={() => handleItemClick(n)}
                                            className={[
                                                'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors group',
                                                n.isRead
                                                    ? 'hover:bg-white/[0.04]'
                                                    : 'bg-blue-950/30 hover:bg-blue-950/50',
                                            ].join(' ')}
                                        >
                                            {/* Type icon */}
                                            <span className={[
                                                'flex-shrink-0 mt-0.5 p-1.5 rounded-lg',
                                                n.isRead
                                                    ? 'bg-white/[0.06] text-gray-400'
                                                    : 'bg-blue-600/20 text-blue-400',
                                            ].join(' ')}>
                                                {notificationIcon(n.type)}
                                            </span>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs leading-snug ${n.isRead ? 'text-gray-400' : 'text-gray-200'}`}>
                                                    {n.message}
                                                </p>
                                                <p className="text-[10px] text-gray-600 mt-1">
                                                    {formatRelativeTime(n.createdAt)}
                                                </p>
                                            </div>

                                            {/* Unread dot */}
                                            {!n.isRead && (
                                                <span className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-blue-500" />
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
