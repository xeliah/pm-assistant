// src/web/CalendarView.jsx
import React, { useState, useEffect } from 'react';

const CalendarView = ({ events, tasks, onDateChange }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('day'); // 'day', 'week'
  const [displayEvents, setDisplayEvents] = useState([]);

  // Update events when date or view changes
  useEffect(() => {
    // Filter events for the selected date/range
    const filteredEvents = [...events, ...tasks].filter(event => {
      if (!event.start) return false;
      
      const eventDate = new Date(event.start);
      const eventDay = new Date(eventDate).setHours(0, 0, 0, 0);
      const selectedDay = new Date(selectedDate).setHours(0, 0, 0, 0);
      
      if (view === 'day') {
        return eventDay === selectedDay;
      } else if (view === 'week') {
        // Get start and end of week
        const weekStart = new Date(selectedDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        return eventDate >= weekStart && eventDate <= weekEnd;
      }
      return false;
    });
    
    setDisplayEvents(filteredEvents);
    
    // Notify parent of date change
    if (onDateChange) {
      onDateChange(selectedDate, view);
    }
  }, [selectedDate, view, events, tasks, onDateChange]);

  // Generate time slots for business hours (8 AM to 6 PM, 30-minute intervals)
  // This creates slots: 8:00, 8:30, 9:00, ..., 17:30, 18:00
  const timeSlots = Array.from({ length: 21 }, (_, i) => {
    const time = new Date(selectedDate);
    time.setHours(8 + Math.floor(i / 2), (i % 2) * 30, 0);
    return time;
  });

  const getEventStyle = (event) => {
    if (event.type === 'meeting') {
      return 'bg-blue-100 border-blue-300 text-blue-800';
    }
    return 'bg-purple-100 border-purple-300 text-purple-800';
  };

  const getEventsForTimeSlot = (time) => {
    return displayEvents.filter(event => {
      if (!event.start) return false;
      const eventTime = new Date(event.start);
      return eventTime.getHours() === time.getHours() &&
             eventTime.getMinutes() === time.getMinutes();
    });
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const DayView = () => (
    <div className="flex flex-col h-[600px] overflow-y-auto">
      {timeSlots.map((time, index) => {
        const currentEvents = getEventsForTimeSlot(time);
        return (
          <div key={index} className="flex border-b min-h-[50px]">
            <div className="w-16 p-1 text-xs text-gray-500 border-r sticky left-0 bg-white">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="flex-1 p-1">
              {currentEvents.map((event, eventIndex) => (
                <div
                  key={eventIndex}
                  className={`m-1 p-2 rounded-lg border ${getEventStyle(event)}`}
                >
                  <div className="font-medium text-sm">{event.summary || event.title}</div>
                  {event.location && (
                    <div className="text-xs">{event.location}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const WeekView = () => {
    // Generate days of the week
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(selectedDate);
      day.setDate(day.getDate() - day.getDay() + i);
      return day;
    });

    return (
      <div className="grid grid-cols-7 h-[600px] overflow-y-auto">
        {/* Header with day names */}
        {weekDays.map((day, index) => (
          <div key={`header-${index}`} className="p-1 text-center border-b border-r text-xs font-medium sticky top-0 bg-white z-10">
            {day.toLocaleDateString('en-US', { weekday: 'short' })}<br />
            {day.getDate()}
          </div>
        ))}
        
        {/* Calendar cells */}
        {weekDays.map((day, dayIndex) => {
          const dayEvents = displayEvents.filter(event => {
            if (!event.start) return false;
            const eventDate = new Date(event.start);
            return eventDate.getDate() === day.getDate() &&
                   eventDate.getMonth() === day.getMonth() &&
                   eventDate.getFullYear() === day.getFullYear();
          });
          
          return (
            <div key={`day-${dayIndex}`} className="border-r overflow-y-auto h-[570px]">
              {dayEvents.map((event, eventIndex) => (
                <div
                  key={eventIndex}
                  className={`m-1 p-1 rounded-lg border text-xs ${getEventStyle(event)}`}
                >
                  <div className="font-medium">{event.summary || event.title}</div>
                  {event.start && (
                    <div className="text-xs">
                      {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            ←
          </button>
          <h2 className="text-sm font-medium">
            {selectedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </h2>
          <button
            onClick={() => changeDate(1)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-2 py-1 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Today
          </button>
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="px-2 py-1 text-xs border rounded-md"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
          </select>
        </div>
      </div>
      {view === 'day' ? <DayView /> : <WeekView />}
    </div>
  );
};

export default CalendarView;