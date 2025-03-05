// src/web/SyncStatus.jsx
import React, { useState, useEffect } from 'react';

const SyncStatus = ({ lastSync, errors, onClearErrors }) => {
  const [showErrors, setShowErrors] = useState(false);

  return (
    <div className="p-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-gray-600">
          {lastSync ? `Last sync: ${new Date(lastSync).toLocaleTimeString()}` : 'Not synced yet'}
        </span>
        {errors.length > 0 && (
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="text-red-500 hover:text-red-600"
          >
            {errors.length} error(s)
          </button>
        )}
      </div>

      {showErrors && errors.length > 0 && (
        <div className="mt-2 bg-red-50 p-2 rounded">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium text-red-700">Sync Errors</span>
            <button
              onClick={onClearErrors}
              className="text-red-500 hover:text-red-600"
            >
              Clear
            </button>
          </div>
          {errors.map((error, index) => (
            <div key={index} className="text-red-600 mb-1">
              {error.type}: {error.error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SyncStatus;