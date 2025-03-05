// src/web/CalendarBanner.jsx
import React from 'react';

const CalendarBanner = ({ calendarLoaded, onLoadCalendar, onReloadCalendar, todayEvents }) => {
  return (
    <div className="mb-4">
      {!calendarLoaded ? (
        <div className="bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg flex justify-between items-center">
          <span className="text-sm text-yellow-700">Load your calendar for scheduling assistance</span>
          <button
            onClick={onLoadCalendar}
            className="text-xs bg-yellow-500 text-white px-3 py-1 rounded-full hover:bg-yellow-600 transition-all"
          >
            Load Calendar
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <h2 className="text-sm font-medium text-gray-700">Today's Schedule</h2>
            <button
              onClick={onReloadCalendar}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all"
              title="Reload Calendar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {todayEvents?.length > 0 ? (
              todayEvents.map((event, index) => (
                <div key={index} className="px-3 py-2 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600">
                      {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-sm text-gray-900">{event.summary}</span>
                  </div>
                  {event.location && (
                    <div className="ml-12 text-xs text-gray-500">{event.location}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">No meetings scheduled</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarBanner;