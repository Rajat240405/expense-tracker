import React, { useEffect, useState } from 'react';

interface SyncStatusProps {
  isGuest: boolean;
  lastSyncTime?: number;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ isGuest, lastSyncTime }) => {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastSyncTime) return;

    const updateTimeAgo = () => {
      const now = Date.now();
      const diff = now - lastSyncTime;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (seconds < 60) {
        setTimeAgo('just now');
      } else if (minutes < 60) {
        setTimeAgo(`${minutes}m ago`);
      } else if (hours < 24) {
        setTimeAgo(`${hours}h ago`);
      } else {
        setTimeAgo(`${Math.floor(hours / 24)}d ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  if (isGuest) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs">
        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"></div>
        <span className="text-gray-600 dark:text-gray-400">Local only</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-xs">
      <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400"></div>
      <span className="text-green-700 dark:text-green-400">
        {lastSyncTime ? `Synced ${timeAgo}` : 'Synced'}
      </span>
    </div>
  );
};

export default React.memo(SyncStatus);
