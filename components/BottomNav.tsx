import React from 'react';
import { WorkspaceView } from '../types';

interface BottomNavProps {
    activeView: WorkspaceView;
    onViewChange: (view: WorkspaceView) => void;
    onDownload: () => void;
}

type NavItem =
    | { kind: 'view'; id: WorkspaceView; label: string; icon: React.ReactNode }
    | { kind: 'action'; id: 'download'; label: string; icon: React.ReactNode; onPress: () => void };

const BottomNav: React.FC<BottomNavProps> = ({ activeView, onViewChange, onDownload }) => {
    const items: NavItem[] = [
        {
            kind: 'view',
            id: 'expenses',
            label: 'Expenses',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            ),
        },
        {
            kind: 'view',
            id: 'splits',
            label: 'Splits',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            kind: 'view',
            id: 'visualize',
            label: 'Analytics',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
        },
        {
            kind: 'action',
            id: 'download',
            label: 'Export',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            ),
            onPress: onDownload,
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 rounded-t-2xl shadow-lg">
                <div className="flex justify-between h-[68px]">
                    {items.map((item) => {
                        const isActive = item.kind === 'view' && activeView === item.id;
                        const handleClick = item.kind === 'view'
                            ? () => onViewChange(item.id)
                            : item.onPress;

                        return (
                            <button
                                key={item.id}
                                onClick={handleClick}
                                aria-label={item.label}
                                aria-current={isActive ? 'page' : undefined}
                                className={[
                                    'relative flex flex-1 flex-col items-center justify-center gap-[5px]',
                                    'transition-all duration-200 ease-out select-none active:scale-95',
                                    isActive
                                        ? 'text-[#2383e2]'
                                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300',
                                ].join(' ')}
                            >
                                <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                                    {item.icon}
                                </span>
                                <span className={`text-[10px] font-semibold tracking-wide leading-none transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-55'}`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-t-full bg-[#2383e2]" />
                                )}
                            </button>
                        );
                    })}
                </div>
                {/* Safe-area spacer for iOS notch / Android gesture bar */}
                <div className="h-[env(safe-area-inset-bottom,0px)] bg-white dark:bg-gray-900" />
            </div>
        </nav>
    );
};

export default BottomNav;
