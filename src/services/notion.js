// src/services/notion.js
import { Client } from '@notionhq/client';

export class NotionService {
  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_TOKEN,
    });
    this.databaseId = process.env.NOTION_DATABASE_ID;
    this.lastSyncTime = null;
    this.syncInProgress = false;
    this.syncErrors = [];
  }

  async updateTask(notionId, updates) {
    try {
      console.log('Updating Notion task:', { notionId, updates });
      
      // Format the properties according to Notion's API
      const properties = {};

      // Handle Title/Name
      if (updates.title) {
        properties.Name = {
          title: [{ 
            type: 'text',
            text: { content: updates.title }
          }]
        };
      }

      // Handle Priority
      if (updates.priority) {
        properties.Priority = {
          select: {
            name: this.mapPriorityToNotion(updates.priority)
          }
        };
      }

      // Handle Category
      if (updates.category) {
        properties.Category = {
          select: {
            name: updates.category
          }
        };
      }

      // Handle Due Date
      if (updates.deadline) {
        properties.Due = {
          date: {
            start: new Date(updates.deadline).toISOString().split('T')[0]
          }
        };
      }

      // Handle Status based on completion
      if (updates.completed !== undefined) {
        properties.Status = {
          status: {
            name: updates.completed ? 'Completed' : 'In Progress'
          }
        };
      }

      console.log('Sending to Notion:', { page_id: notionId, properties });

      const response = await this.notion.pages.update({
        page_id: notionId,
        properties
      });

      console.log('Notion update response:', response);
      return true;
    } catch (error) {
      console.error('Error updating Notion task:', error);
      this.syncErrors.push({
        type: 'update',
        taskId: notionId,
        error: error.message,
        timestamp: new Date()
      });
      return false;
    }
  }

  async deleteTask(notionId) {
    try {
      console.log('Archiving Notion task:', notionId);
      const response = await this.notion.pages.update({
        page_id: notionId,
        archived: true
      });
      console.log('Archive response:', response);
      return true;
    } catch (error) {
      console.error('Error archiving Notion task:', error);
      this.syncErrors.push({
        type: 'delete',
        taskId: notionId,
        error: error.message,
        timestamp: new Date()
      });
      return false;
    }
  }

  async startRealTimeSync(callback, interval = 30000) {
    const self = this; // Store 'this' reference
    setInterval(async () => {
      if (!self.syncInProgress) {
        try {
          const changes = await self.checkForChanges();
          if (changes.length > 0) {
            callback(changes);
          }
        } catch (error) {
          console.error('Real-time sync error:', error);
        }
      }
    }, interval);
  }

  async checkForChanges() {
    try {
      if (!this.databaseId) {
        console.log('Database ID not set, skipping change check');
        return [];
      }
      
      const lastCheck = this.lastSyncTime || new Date(0);
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          timestamp: 'last_edited_time',
          last_edited_time: {
            after: lastCheck.toISOString()
          }
        }
      });

      this.lastSyncTime = new Date();
      
      // Use a regular function to keep 'this' context
      const self = this;
      return response.results.map(function(page) {
        return {
          id: page.id,
          title: page.properties.Name?.title[0]?.plain_text || 'Untitled',
          priority: self.mapNotionPriority(page.properties.Priority?.select?.name),
          category: page.properties.Category?.select?.name || 'Other',
          deadline: page.properties.Due?.date?.start,
          completed: page.properties.Status?.status?.name === 'Completed',
          notionId: page.id,
          lastEdited: page.last_edited_time
        };
      });
    } catch (error) {
      console.error('Error checking for changes:', error);
      return [];
    }
  }

  async getTasks() {
    try {
      console.log('Fetching tasks from Notion...');
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
      });

      console.log('Processing Notion tasks...');
      const self = this;
      const tasks = response.results.map(function(page) {
        // Get title/name
        const title = page.properties.Name?.title[0]?.plain_text || 
                     page.properties.Task?.title[0]?.plain_text || 
                     'Untitled Task';

        // Get priority (handle different property names)
        let priority = page.properties.Priority?.select?.name || 
                      page.properties.priority?.select?.name || 
                      'medium';
        priority = self.mapNotionPriority(priority);

        // Get category (handle different property names and values)
        let category = page.properties.Category?.select?.name || 
                      page.properties.category?.select?.name || 
                      page.properties.Type?.select?.name || 
                      'Other';
        
        // Get deadline/due date (handle different property names)
        const deadline = page.properties.Due?.date?.start || 
                        page.properties.Deadline?.date?.start || 
                        page.properties['Due Date']?.date?.start;

        // Get status (handle different property names)
        const status = page.properties.Status?.status?.name || 
                      page.properties.status?.status?.name || 
                      'Not Started';
        
        const completed = ['Completed', 'Done'].includes(status);

        return {
          id: page.id,
          title,
          priority,
          category,
          deadline,
          completed,
          notionId: page.id
        };
      });

      console.log('Returning mapped tasks:', tasks);
      return tasks;
    } catch (error) {
      console.error('Error fetching Notion tasks:', error);
      return [];
    }
  }

  mapNotionPriority(notionPriority) {
    const priorityMap = {
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low'
    };
    return priorityMap[notionPriority] || 'medium';
  }

  mapPriorityToNotion(priority) {
    const priorityMap = {
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };
    return priorityMap[priority] || 'Medium';
  }

  getLastSyncStatus() {
    return {
      lastSync: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      errors: this.syncErrors.slice(-5) // Return last 5 errors
    };
  }

  clearSyncErrors() {
    this.syncErrors = [];
  }

  async verifyConnection() {
    try {
      console.log('Verifying Notion connection...');
      const response = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });
      console.log('Database properties:', response.properties);
      return true;
    } catch (error) {
      console.error('Notion connection error:', error);
      return false;
    }
  }
}

export default NotionService;