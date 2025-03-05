// src/server.js
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ProductManagerAssistant } from './assistant.js';
import { StorageManager } from './storage-manager.js';
import { CalendarReader } from './calendar-reader.js';
import path from 'path';
import NotionService from './services/notion.js';
import { EventEmitter } from 'events';
import TodoistService from './services/todoist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const eventEmitter = new EventEmitter();

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('dist'));

const storage = new StorageManager();
const assistant = new ProductManagerAssistant();
const calendar = new CalendarReader();
const notionService = new NotionService();
const todoistService = new TodoistService();

// Verify Todoist connection on startup
todoistService.verifyConnection().then(success => {
    console.log('Todoist connection status:', success ? 'Connected' : 'Failed');
  });

// Initialize system with saved tasks
const savedTasks = storage.getTasks();
console.log('Loading saved tasks:', savedTasks);
savedTasks.forEach(task => {
  assistant.tasks.set(task.id, task);
});

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const savedTasks = storage.getTasks();
    res.json({ tasks: savedTasks });
  } catch (error) {
    console.error('Error loading tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calendar endpoints
app.get('/api/calendar/status', (req, res) => {
  res.json({ loaded: calendar.isLoaded() });
});

app.post('/api/calendar/load', async (req, res) => {
  try {
    const calendarPath = path.join(process.cwd(), 'calendar.ics');
    const success = await calendar.readCalendarFile(calendarPath);
    if (success) {
      assistant.setCalendar(calendar);
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Failed to load calendar' });
    }
  } catch (error) {
    console.error('Error loading calendar:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
// Add these calendar endpoints
app.get('/api/calendar/today', async (req, res) => {
    try {
      if (!calendar.isLoaded()) {
        return res.json({ events: [] });
      }
      const events = calendar.getTodayEvents();
      res.json({ events });
    } catch (error) {
      console.error('Error getting today\'s events:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

app.get('/api/calendar/events', async (req, res) => {
    try {
      if (!calendar.isLoaded()) {
        return res.json({ events: [] });
      }
      
      const { start, end } = req.query;
      
      let events;
      if (start && end) {
        events = calendar.getEventsForRange(new Date(start), new Date(end));
      } else if (start) {
        events = calendar.getEventsForDate(new Date(start));
      } else {
        events = calendar.getUpcomingEvents(7); // Default to next 7 days
      }
      
      res.json({ events });
    } catch (error) {
      console.error('Error getting calendar events:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  app.get('/api/calendar/free-slots', async (req, res) => {
    try {
      const { date } = req.query;
      const freeSlots = calendar.getFreeTimeBlocks(date ? new Date(date) : new Date());
      res.json({ freeSlots });
    } catch (error) {
      console.error('Error getting free slots:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
 

// Task management endpoints
// Update existing task endpoints to sync with Notion
app.put('/api/tasks/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const updatedTask = req.body;
      
      const success = assistant.updateTask(taskId, updatedTask);
      if (success) {
        // Sync with Notion if task has notionId
        if (updatedTask.notionId) {
          await notionService.updateTask(updatedTask.notionId, updatedTask);
        }
        
        const tasks = assistant.getTasks();
        storage.saveTasks(tasks);
        res.json({ success: true, tasks });
      } else {
        res.status(404).json({ success: false, error: 'Task not found' });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

app.delete('/api/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const success = assistant.deleteTask(taskId);
    if (success) {
      const tasks = assistant.getTasks();
      storage.saveTasks(tasks); // Save to persistent storage
      res.json({ success: true, tasks });
    } else {
      res.status(404).json({ success: false, error: 'Task not found' });
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/calendar/reload', async (req, res) => {
    try {
      const calendarPath = path.join(process.cwd(), 'calendar.ics');
      const success = await calendar.readCalendarFile(calendarPath);
      if (success) {
        assistant.setCalendar(calendar);
        res.json({ success: true });
      } else {
        res.status(400).json({ success: false, error: 'Failed to reload calendar' });
      }
    } catch (error) {
      console.error('Error reloading calendar:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const { response, tasks } = await assistant.chat(message);
    storage.saveTasks(tasks); // Save to persistent storage
    res.json({ response, tasks });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// In server.js, update the sync endpoint

app.post('/api/notion/sync', async (req, res) => {
    console.log('Starting Notion sync...');
    try {
      // Verify connection first
      const isConnected = await notionService.verifyConnection();
      if (!isConnected) {
        throw new Error('Not connected to Notion');
      }
  
      // Get tasks from Notion
      console.log('Fetching Notion tasks...');
      const notionTasks = await notionService.getTasks();
      console.log(`Found ${notionTasks.length} tasks in Notion`);
  
      // Get current tasks
      const currentTasks = assistant.getTasks();
      console.log(`Current local tasks: ${currentTasks.length}`);
  
      // Merge tasks
      notionTasks.forEach(notionTask => {
        // Check if task already exists
        const existingTask = currentTasks.find(t => 
          t.notionId === notionTask.notionId || 
          t.title.toLowerCase() === notionTask.title.toLowerCase()
        );
  
        if (existingTask) {
          // Update existing task
          assistant.updateTask(existingTask.id, {
            ...existingTask,
            ...notionTask,
            id: existingTask.id // Keep local ID
          });
        } else {
          // Add new task
          assistant.tasks.set(notionTask.id, notionTask);
        }
      });
  
      // Save to storage
      const allTasks = assistant.getTasks();
      console.log(`Total tasks after merge: ${allTasks.length}`);
      storage.saveTasks(allTasks);
  
      res.json({ 
        success: true, 
        tasks: allTasks,
        syncDetails: {
          notionTasks: notionTasks.length,
          totalTasks: allTasks.length
        }
      });
    } catch (error) {
      console.error('Error in Notion sync:', error);
      res.status(500).json({ 
        error: 'Failed to sync with Notion',
        details: error.message
      });
    }
  });

  // Update task endpoints to handle Todoist
app.put('/api/tasks/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const updatedTask = req.body;
      
      const success = assistant.updateTask(taskId, updatedTask);
      if (success) {
        // Sync with Todoist if task has todoistId
        if (updatedTask.todoistId) {
          await todoistService.updateTask(updatedTask.todoistId, updatedTask);
        }
        // Sync with Notion if task has notionId
        if (updatedTask.notionId) {
          await notionService.updateTask(updatedTask.notionId, updatedTask);
        }
        
        const tasks = assistant.getTasks();
        storage.saveTasks(tasks);
        res.json({ success: true, tasks });
      } else {
        res.status(404).json({ success: false, error: 'Task not found' });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = assistant.tasks.get(taskId);
    
    if (task) {
      // Delete from Todoist if task has todoistId
      if (task.todoistId) {
        await todoistService.deleteTask(task.todoistId);
      }
      // Delete from Notion if task has notionId
      if (task.notionId) {
        await notionService.deleteTask(task.notionId);
      }
      
      // Then delete locally
      assistant.deleteTask(taskId);
      const tasks = assistant.getTasks();
      storage.saveTasks(tasks);
      res.json({ success: true, tasks });
    } else {
      res.status(404).json({ success: false, error: 'Task not found' });
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


  // Add real-time sync endpoints
  app.post('/api/notion/start-sync', (req, res) => {
    notionService.startRealTimeSync((changes) => {
      eventEmitter.emit('notion-changes', changes);
    });
    res.json({ success: true });
  });
  
  app.get('/api/notion/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  
    const listener = (changes) => {
      res.write(`data: ${JSON.stringify(changes)}\n\n`);
    };
  
    eventEmitter.on('notion-changes', listener);
  
    req.on('close', () => {
      eventEmitter.off('notion-changes', listener);
    });
  });
  
  // Add restore endpoint for undo functionality
  app.post('/api/tasks/restore', async (req, res) => {
    try {
      const { task } = req.body;
      
      // Restore in Notion if it has a notionId
      if (task.notionId) {
        await notionService.restoreTask(task.notionId);
      }
      
      // Restore locally
      assistant.tasks.set(task.id, task);
      const tasks = assistant.getTasks();
      storage.saveTasks(tasks);
      
      res.json({ success: true, tasks });
    } catch (error) {
      console.error('Error restoring task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }); 

// Todoist endpoints
app.post('/api/todoist/sync', async (req, res) => {
    try {
      // Get tasks from Todoist
      const todoistTasks = await todoistService.getTasks();
      
      // Merge with existing tasks
      todoistTasks.forEach(task => {
        if (!assistant.tasks.has(task.id)) {
          assistant.tasks.set(task.id, task);
        }
      });
  
      // Save to storage
      const allTasks = assistant.getTasks();
      storage.saveTasks(allTasks);
  
      res.json({ success: true, tasks: allTasks });
    } catch (error) {
      console.error('Error syncing with Todoist:', error);
      res.status(500).json({ error: 'Failed to sync with Todoist' });
    }
  });

app.listen(port, () => {
  console.log(`Server running at http://localhost:3000`);
});