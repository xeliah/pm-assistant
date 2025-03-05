// src/services/todoist.js
import { TodoistApi } from '@doist/todoist-api-typescript';

export class TodoistService {
  constructor() {
    // Check if the token is defined
    if (!process.env.TODOIST_API_TOKEN) {
      console.warn('TODOIST_API_TOKEN not found in environment variables');
    }
    
    this.api = new TodoistApi(process.env.TODOIST_API_TOKEN || '');
    this.projects = null;
  }

  async verifyConnection() {
    try {
      // Just try to get projects as a connection test
      this.projects = await this.api.getProjects();
      if (this.projects && Array.isArray(this.projects)) {
        console.log('Connected to Todoist successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Todoist connection error:', error);
      return false;
    }
  }

  async getTasks() {
    try {
      // Debug logging
      console.log('Fetching Todoist tasks...');
      
      // Call the API
      const tasks = await this.api.getTasks();
      
      // More logging
      console.log('Todoist tasks response type:', typeof tasks);
      console.log('Is Array:', Array.isArray(tasks));
      console.log('Task count:', Array.isArray(tasks) ? tasks.length : 'Not an array');
      
      // Handle different response types
      const tasksArray = Array.isArray(tasks) ? tasks : [];
      
      // Empty array case
      if (tasksArray.length === 0) {
        console.log('No Todoist tasks found');
        return [];
      }
      
      // Process each task
      const mappedTasks = [];
      for (const task of tasksArray) {
        try {
          let category = 'Other';
          if (task.projectId) {
            category = await this.getProjectName(task.projectId);
          }
          
          mappedTasks.push({
            id: `todoist-${task.id}`,
            title: task.content,
            priority: this.mapTodoistPriority(task.priority),
            category,
            deadline: task.due?.date,
            completed: false,
            todoistId: task.id,
            description: task.description || '',
            labels: task.labels || [],
            url: task.url
          });
        } catch (innerError) {
          console.error('Error processing Todoist task:', innerError);
        }
      }
      
      return mappedTasks;
    } catch (error) {
      console.error('Error fetching Todoist tasks:', error);
      return [];
    }
  }

  async getProjectName(projectId) {
    try {
      if (!this.projects) {
        this.projects = await this.api.getProjects();
      }
      
      const project = this.projects.find(p => p.id === projectId);
      return project ? project.name : 'Other';
    } catch (error) {
      console.error('Error getting project name:', error);
      return 'Other';
    }
  }

  async addTask(task) {
    try {
      // Find project ID if category is a project name
      let projectId = null;
      if (task.category && task.category !== 'Other') {
        if (!this.projects) {
          this.projects = await this.api.getProjects();
        }
        const project = this.projects.find(p => p.name === task.category);
        projectId = project?.id;
      }

      const todoistTask = await this.api.addTask({
        content: task.title,
        projectId: projectId,
        priority: this.mapToTodoistPriority(task.priority),
        dueDate: task.deadline,
        description: task.description || ''
      });
      
      return {
        ...task,
        todoistId: todoistTask.id,
        id: `todoist-${todoistTask.id}`,
        url: todoistTask.url
      };
    } catch (error) {
      console.error('Error adding Todoist task:', error);
      return null;
    }
  }

  async updateTask(todoistId, updates) {
    try {
      const updateData = {};
      
      if (updates.title) updateData.content = updates.title;
      if (updates.priority) updateData.priority = this.mapToTodoistPriority(updates.priority);
      if (updates.deadline) updateData.dueDate = updates.deadline;
      
      if (Object.keys(updateData).length > 0) {
        await this.api.updateTask(todoistId, updateData);
      }
      
      if (updates.completed !== undefined) {
        if (updates.completed) {
          await this.api.closeTask(todoistId);
        } else {
          await this.api.reopenTask(todoistId);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating Todoist task:', error);
      return false;
    }
  }

  async deleteTask(todoistId) {
    try {
      await this.api.deleteTask(todoistId);
      return true;
    } catch (error) {
      console.error('Error deleting Todoist task:', error);
      return false;
    }
  }

  // Priority mapping (Todoist: 1=p4, 2=p3, 3=p2, 4=p1)
  mapTodoistPriority(todoistPriority) {
    const priorityMap = {
      4: 'high',
      3: 'medium',
      2: 'medium',
      1: 'low'
    };
    return priorityMap[todoistPriority] || 'medium';
  }

  mapToTodoistPriority(priority) {
    const priorityMap = {
      'high': 4,
      'medium': 3,
      'low': 1
    };
    return priorityMap[priority] || 3;
  }
}

export default TodoistService;