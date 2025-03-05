// src/calendar-reader.js
import ical from 'ical';
import fs from 'fs';

export class CalendarReader {
  constructor() {
    this.events = new Map();
    this._loaded = false;
  }

  isLoaded() {
    return this._loaded;
  }

  async readCalendarFile(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = ical.parseICS(fileContent);
      
      this.events.clear();
      
      for (let k in data) {
        if (data[k].type === 'VEVENT') {
          const event = data[k];
          this.events.set(k, {
            summary: event.summary,
            start: event.start,
            end: event.end,
            description: event.description,
            location: event.location
          });
        }
      }
      
      this._loaded = true;
      return true;
    } catch (error) {
      console.error('Error reading calendar file:', error);
      this._loaded = false;
      return false;
    }
  }

  getEventsForDate(date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return Array.from(this.events.values())
      .filter(event => {
        const eventDate = new Date(event.start);
        return eventDate >= targetDate && eventDate < nextDay;
      })
      .sort((a, b) => a.start - b.start);
  }

  getEventsForRange(startDate, endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return Array.from(this.events.values())
      .filter(event => {
        const eventDate = new Date(event.start);
        return eventDate >= start && eventDate <= end;
      })
      .sort((a, b) => a.start - b.start);
  }

  getTodayEvents() {
    return this.getEventsForDate(new Date());
  }

  getTomorrowEvents() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.getEventsForDate(tomorrow);
  }

  getUpcomingEvents(days = 7) {
    const today = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);
    return this.getEventsForRange(today, future);
  }

  getFreeTimeBlocks(date = new Date()) {
    const events = this.getEventsForDate(date);
    const freeBlocks = [];
    const workStart = new Date(date);
    workStart.setHours(9, 0, 0, 0);
    const workEnd = new Date(date);
    workEnd.setHours(18, 0, 0, 0);

    let currentTime = workStart;

    events.forEach(event => {
      if (event.start > currentTime) {
        freeBlocks.push({
          start: new Date(currentTime),
          end: new Date(event.start)
        });
      }
      currentTime = new Date(event.end);
    });

    if (currentTime < workEnd) {
      freeBlocks.push({
        start: new Date(currentTime),
        end: new Date(workEnd)
      });
    }

    return freeBlocks;
  }

  formatEventTime(date) {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  getFormattedSchedule(date = new Date()) {
    const events = this.getEventsForDate(date);
    const freeBlocks = this.getFreeTimeBlocks(date);
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let schedule = `Schedule for ${dateStr}:\n\n`;
    
    if (events.length === 0) {
      schedule += "No meetings scheduled\n";
    } else {
      schedule += "Meetings:\n";
      events.forEach(event => {
        schedule += `${this.formatEventTime(event.start)} - ${this.formatEventTime(event.end)}: ${event.summary}\n`;
      });
    }
    
    if (freeBlocks.length > 0) {
      schedule += "\nAvailable time blocks:\n";
      freeBlocks.forEach(block => {
        schedule += `${this.formatEventTime(block.start)} - ${this.formatEventTime(block.end)}\n`;
      });
    }
    
    return schedule;
  }
}