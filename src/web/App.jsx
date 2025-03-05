// src/web/App.jsx
import React, { useState, useEffect } from 'react';
import MessageFormatter from './MessageFormatter';
import TaskPanel from './TaskPanel';
import CalendarBanner from './CalendarBanner';
import CalendarView from './CalendarView';
import UndoDelete from './UndoDelete';
import SyncStatus from './SyncStatus';

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calendarLoaded, setCalendarLoaded] = useState(false);
  const [todayEvents, setTodayEvents] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [syncStatus, setSyncStatus] = useState({ lastSync: null, errors: [] });
  const [deletedTask, setDeletedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Load initial tasks and calendar status
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load tasks
        const tasksResponse = await fetch('/api/tasks');
        const tasksData = await tasksResponse.json();
        if (tasksData.tasks) {
          setTasks(tasksData.tasks);
        }

        // Check calendar status
        const calResponse = await fetch('/api/calendar/status');
        const calData = await calResponse.json();
        setCalendarLoaded(calData.loaded);
        if (calData.loaded) {
          const eventsResponse = await fetch('/api/calendar/today');
          const eventsData = await eventsResponse.json();
          setTodayEvents(eventsData.events);
          
          // Load calendar events
          fetchCalendarEvents();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, []);

  const fetchCalendarEvents = async (date = selectedDate, view = 'week') => {
    try {
      let start, end;
      
      if (view === 'day') {
        // Get events for a single day
        start = new Date(date);
        start.setHours(0, 0, 0, 0);
        end = new Date(date);
        end.setHours(23, 59, 59, 999);
      } else {
        // Get events for a week
        start = new Date(date);
        start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
        start.setHours(0, 0, 0, 0);
        
        end = new Date(start);
        end.setDate(end.getDate() + 6); // End of week (Saturday)
        end.setHours(23, 59, 59, 999);
      }
      
      const response = await fetch(`/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`);
      const data = await response.json();
      setCalendarEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  const handleDateChange = (date, view) => {
    setSelectedDate(date);
    fetchCalendarEvents(date, view);
  };

  // Add useEffect for real-time sync
  useEffect(() => {
    const startRealTimeSync = async () => {
      try {
        const response = await fetch('/api/notion/start-sync', { method: 'POST' });
        const { success } = await response.json();
        if (success) {
          // Set up event source for server-sent events
          const events = new EventSource('/api/notion/events');
          events.onmessage = (event) => {
            const changes = JSON.parse(event.data);
            setTasks(prevTasks => {
              const updatedTasks = [...prevTasks];
              changes.forEach(change => {
                const index = updatedTasks.findIndex(t => t.notionId === change.notionId);
                if (index >= 0) {
                  updatedTasks[index] = { ...updatedTasks[index], ...change };
                } else {
                  updatedTasks.push(change);
                }
              });
              return updatedTasks;
            });
          };
        }
      } catch (error) {
        console.error('Error starting real-time sync:', error);
      }
    };

    startRealTimeSync();
  }, []);

  const handleLoadCalendar = async () => {
    try {
      const response = await fetch('/api/calendar/load', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setCalendarLoaded(true);
        const eventsResponse = await fetch('/api/calendar/today');
        const eventsData = await eventsResponse.json();
        setTodayEvents(eventsData.events);
        
        // Load calendar events
        fetchCalendarEvents();
      }
    } catch (error) {
      console.error('Error loading calendar:', error);
    }
  };

  const handleReloadCalendar = async () => {
    try {
      const response = await fetch('/api/calendar/reload', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        const eventsResponse = await fetch('/api/calendar/today');
        const eventsData = await eventsResponse.json();
        setTodayEvents(eventsData.events);
        
        // Reload calendar events
        fetchCalendarEvents();
      }
    } catch (error) {
      console.error('Error reloading calendar:', error);
    }
  };

  const handleNotionSync = async () => {
    try {
      const response = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
        setSyncStatus(prev => ({
          ...prev,
          lastSync: new Date()
        }));
      }
    } catch (error) {
      console.error('Error syncing with Notion:', error);
      setSyncStatus(prev => ({
        ...prev,
        errors: [...prev.errors, { type: 'sync', error: error.message }]
      }));
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, 
        { role: 'user', content: input },
        { role: 'assistant', content: data.response }
      ]);
      if (data.tasks) {
        setTasks(data.tasks);
      }
      setInput('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (updatedTask) => {
    try {
      const response = await fetch(`/api/tasks/${updatedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
      const data = await response.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setSyncStatus(prev => ({
        ...prev,
        errors: [...prev.errors, { type: 'update', error: error.message }]
      }));
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      const taskToDelete = tasks.find(t => t.id === taskId);
      setDeletedTask(taskToDelete);
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      setSyncStatus(prev => ({
        ...prev,
        errors: [...prev.errors, { type: 'delete', error: error.message }]
      }));
    }
  };

  const handleUndoDelete = async () => {
    if (deletedTask) {
      try {
        const response = await fetch('/api/tasks/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: deletedTask })
        });
        const data = await response.json();
        if (data.success) {
          setTasks(data.tasks);
        }
        setDeletedTask(null);
      } catch (error) {
        console.error('Error restoring task:', error);
      }
    }
  };

  const handleClearSyncErrors = () => {
    setSyncStatus(prev => ({ ...prev, errors: [] }));
  };
  const handleTodoistSync = async () => {
    try {
      const response = await fetch('/api/todoist/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
        setSyncStatus(prev => ({
          ...prev,
          lastSync: new Date()
        }));
      }
    } catch (error) {
      console.error('Error syncing with Todoist:', error);
      setSyncStatus(prev => ({
        ...prev,
        errors: [...prev.errors, { type: 'todoist-sync', error: error.message }]
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto max-w-[1440px]">
        {!calendarLoaded && (
          <CalendarBanner 
            calendarLoaded={calendarLoaded}
            onLoadCalendar={handleLoadCalendar}
            onReloadCalendar={handleReloadCalendar}
            todayEvents={todayEvents}
          />
        )}
        
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column - Calendar */}
          <div className="col-span-3">
            {calendarLoaded ? (
              <div className="mb-4">
                <CalendarView 
                  events={calendarEvents.map(event => ({ ...event, type: 'meeting' }))}
                  tasks={tasks.map(task => ({ 
                    ...task, 
                    type: 'task',
                    start: task.deadline // Map deadline to start for calendar display
                  }))}
                  onDateChange={handleDateChange}
                />
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                <button
                  onClick={handleLoadCalendar}
                  className="w-full bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 transition-all"
                >
                  Load Calendar
                </button>
              </div>
            )}
          </div>

          {/* Center Column - Chat */}
          <div className="col-span-6">
            <div className="bg-white rounded-xl shadow-sm h-[80vh] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-auto p-6 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user' 
                        ? 'bg-blue-500 text-white rounded-br-none' 
                        : 'bg-gray-100 rounded-bl-none'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <MessageFormatter content={msg.content} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Input Area */}
              <div className="border-t p-4 bg-white rounded-b-xl">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                    className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="Type your message..."
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading}
                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-12 h-12 flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Tasks */}
          <div className="col-span-3">
            <div className="h-[80vh]">
              <TaskPanel 
                tasks={tasks}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleTaskDelete}
                onNotionSync={handleNotionSync}
                onTodoistSync={handleTodoistSync}
                />
              
              <SyncStatus 
                lastSync={syncStatus.lastSync}
                errors={syncStatus.errors}
                onClearErrors={handleClearSyncErrors}
              />
            </div>
          </div>
        </div>
      </div>
      
      {deletedTask && (
        <UndoDelete 
          task={deletedTask}
          onUndo={handleUndoDelete}
          onTimeout={() => setDeletedTask(null)}
        />
      )}
    </div>
  );
}