// src/web/NotionSync.jsx
import React, { useState } from 'react';

const NotionSync = ({ onSync }) => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const handleSync = async () => {
    console.log('Sync button clicked'); // Debug log
    setSyncing(true);
    try {
      console.log('Starting sync...'); // Debug log
      await onSync();
      console.log('Sync completed'); // Debug log
      setLastSync(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
      <div className="flex-1">
        <span className="text-sm text-gray-600">
          {lastSync ? `Last sync: ${lastSync.toLocaleTimeString()}` : 'Not synced yet'}
        </span>
      </div>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center gap-1 disabled:opacity-50 transition-all"
      >
        {syncing ? (
          <>
            <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync
          </>
        )}
      </button>
    </div>
  );
};

export default NotionSync;