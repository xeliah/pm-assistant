// src/web/TaskPanel.jsx
import React, { useState } from 'react';
import NotionSync from './NotionSync';

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low: 'bg-green-50 text-green-700 border-green-200'
};

const CATEGORIES = [
  'Product Development',
  'Meetings',
  'Documentation',
  'Research',
  'Stakeholder Management',
  'Other'
];

const TaskPanel = ({ tasks, onTaskUpdate, onTaskDelete, onNotionSync, onTodoistSync })  => {
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const handleTaskEdit = (task) => {
    setEditingTask({ ...task });
  };

  const saveTaskEdit = async () => {
    await onTaskUpdate(editingTask);
    setEditingTask(null);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'active' && task.completed) return false;
    if (filter === 'completed' && !task.completed) return false;
    if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm h-[80vh] flex flex-col">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-700">Tasks</h2>
          <div className="flex gap-1">
            <select 
              className="text-xs px-2 py-1 border rounded bg-gray-50"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Done</option>
            </select>
            <select 
              className="text-xs px-2 py-1 border rounded bg-gray-50"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Sync buttons */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={onNotionSync}
            className="flex-1 text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 transition-all"
          >
            Sync Notion
          </button>
          <button
            onClick={onTodoistSync}
            className="flex-1 text-xs px-2 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-all"
          >
            Sync Todoist
          </button>
        </div>
        
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1">
        {filteredTasks.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-2">No tasks found</p>
        ) : (
          filteredTasks.map((task) => (
            editingTask?.id === task.id ? (
              // Edit Mode
              <div key={task.id} className="p-2 bg-white border rounded shadow-sm">
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                  className="w-full mb-1 px-2 py-1 text-sm border rounded"
                />
                <div className="grid grid-cols-2 gap-1 mb-1">
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})}
                    className="px-2 py-1 text-xs border rounded"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    value={editingTask.category}
                    onChange={(e) => setEditingTask({...editingTask, category: e.target.value})}
                    className="px-2 py-1 text-xs border rounded"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="date"
                  value={editingTask.deadline?.split('T')[0] || ''}
                  onChange={(e) => setEditingTask({...editingTask, deadline: e.target.value})}
                  className="w-full mb-1 px-2 py-1 text-xs border rounded"
                />
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => setEditingTask(null)}
                    className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveTaskEdit}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div key={task.id} 
                className={`group px-2 py-1 border rounded-md hover:shadow-sm transition-all ${
                  task.completed ? 'bg-gray-50' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onTaskUpdate({...task, completed: !task.completed})}
                    className="mt-1 h-3 w-3 rounded border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className={`text-sm truncate ${task.completed ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`px-1.5 py-0.5 text-[10px] border rounded ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                      {task.deadline && (
                        <span className="text-[10px] text-gray-500">
                          Due: {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleTaskEdit(task)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onTaskDelete(task.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
};

export default TaskPanel;   