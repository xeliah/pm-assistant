// src/storage-manager.js
import fs from 'fs';
import { dirname } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class StorageManager {
  constructor() {
    this.dataPath = path.join(process.cwd(), 'data.json');
    this.cache = null;
    this.initializeStorage();
  }

  initializeStorage() {
    if (!fs.existsSync(this.dataPath)) {
      const initialData = {
        tasks: [],
        context: [],
        lastUpdate: new Date().toISOString()
      };
      this.saveData(initialData);
    }
    // Load data into cache
    this.cache = this.loadDataFromDisk();
  }

  loadDataFromDisk() {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading data from disk:', error);
      return null;
    }
  }

  loadData() {
    if (!this.cache) {
      this.cache = this.loadDataFromDisk();
    }
    return this.cache;
  }

  saveData(data) {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
      this.cache = data; // Update cache
      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  }

  saveTasks(tasks) {
    const uniqueTasks = this.deduplicateTasks(tasks);
    const data = this.loadData() || { 
      tasks: [], 
      context: [], 
      lastUpdate: new Date().toISOString() 
    };
    data.tasks = uniqueTasks;
    data.lastUpdate = new Date().toISOString();
    return this.saveData(data);
  }

  deduplicateTasks(tasks) {
    const uniqueTasks = new Map();
    tasks.forEach(task => {
      // Use title as unique identifier
      const key = task.title.toLowerCase();
      if (!uniqueTasks.has(key)) {
        uniqueTasks.set(key, task);
      }
    });
    return Array.from(uniqueTasks.values());
  }

  getTasks() {
    const data = this.loadData();
    return data?.tasks || [];
  }
}