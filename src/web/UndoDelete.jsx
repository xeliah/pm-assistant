// src/web/UndoDelete.jsx
import React, { useEffect } from 'react';

const UndoDelete = ({ task, onUndo, onTimeout }) => {
  useEffect(() => {
    const timer = setTimeout(onTimeout, 5000);
    return () => clearTimeout(timer);
  }, [onTimeout]);

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <span>Deleted "{task.title}"</span>
      <button
        onClick={onUndo}
        className="text-blue-300 hover:text-blue-200 font-medium"
      >
        Undo
      </button>
    </div>
  );
};

export default UndoDelete;