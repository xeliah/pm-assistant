// src/assistant.js
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

export class ProductManagerAssistant {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.context = [];
    this.calendar = null;
    this.tasks = new Map();
  }

  setCalendar(calendar) {
    this.calendar = calendar;
  }

  async chat(userInput) {
    try {
      this.context.push({ role: "user", content: userInput });

      let calendarContext = "";
      if (this.calendar && this.calendar.isLoaded()) {
        calendarContext = "\n\nToday's Schedule:\n" + this.calendar.getFormattedSchedule();
      }

      let tasksContext = "";
      if (this.tasks.size > 0) {
        tasksContext = "\n\nCurrent Tasks:\n" + Array.from(this.tasks.values())
          .map(task => `- [${task.priority.toUpperCase()}] ${task.title} (Due: ${task.deadline})`)
          .join("\n");
      }

      const systemContext = `You are a Product Manager Assistant at Scalapay. 
      Help prioritize tasks and manage schedules.
      Format your responses clearly using sections and bullet points.
      When a user mentions a task, extract it and mark it in your response using this format:
      [TASK] {title} | {priority} | {category} | {deadline}
      
      Priority should be one of: high, medium, low
      Category should be one of: Product Development, Meetings, Documentation, Research, Stakeholder Management, Other
      
      Example: [TASK] Review PRD | high | Documentation | 2024-02-25

      Format your responses like this:
      # Current Status
      - Summary of calendar and ongoing tasks
      - Any immediate deadlines or meetings
      
      # Task Analysis
      - Priority assessment
      - Dependencies and conflicts
      
      # Recommendations
      - Next steps
      - Suggested schedule
      
      ${calendarContext}
      ${tasksContext}`;

      const response = await this.anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1000,
        system: systemContext,
        messages: [...this.context]
      });

      const assistantResponse = response.content[0].text;
      
      // Extract and deduplicate tasks
      const newTasks = this.extractTasks(assistantResponse);
      this.addNewTasks(newTasks);

      this.context.push({ role: "assistant", content: assistantResponse });

      return {
        response: assistantResponse,
        tasks: Array.from(this.tasks.values())
      };
    } catch (error) {
      console.error('Error in chat:', error);
      return {
        response: "I encountered an error. Please try again.",
        tasks: Array.from(this.tasks.values())
      };
    }
  }

  extractTasks(text) {
    const taskRegex = /\[TASK\](.*?)\|(.*?)\|(.*?)\|(.*?)(?=\n|$)/g;
    const extractedTasks = [];
    let match;

    while ((match = taskRegex.exec(text)) !== null) {
      const [_, title, priority, category, deadline] = match;
      const taskTitle = title.trim();
      
      // Check if a task with this title already exists
      const existingTask = Array.from(this.tasks.values()).find(t => 
        t.title.toLowerCase() === taskTitle.toLowerCase()
      );

      if (!existingTask) {
        extractedTasks.push({
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          title: taskTitle,
          priority: priority.trim().toLowerCase(),
          category: category.trim(),
          deadline: deadline.trim(),
          createdAt: new Date().toISOString(),
          completed: false
        });
      }
    }

    return extractedTasks;
  }

  addNewTasks(newTasks) {
    newTasks.forEach(task => {
      // Only add if no task with same title exists
      const exists = Array.from(this.tasks.values()).some(
        t => t.title.toLowerCase() === task.title.toLowerCase()
      );
      if (!exists) {
        this.tasks.set(task.id, task);
      }
    });
  }

  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (task) {
      this.tasks.set(taskId, { ...task, ...updates });
      return true;
    }
    return false;
  }

  deleteTask(taskId) {
    return this.tasks.delete(taskId);
  }

  getTasks() {
    return Array.from(this.tasks.values());
  }

  clearContext() {
    this.context = [];
    return "Conversation context cleared.";
  }
}