import { CalendarEvent } from '../types';
import AuthService from './AuthService';

class CalendarService {
  private baseUrl = 'https://www.googleapis.com/calendar/v3';

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const accessToken = await AuthService.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status}`);
    }

    return response.json();
  }

  async getEventsForNext24Hours(): Promise<CalendarEvent[]> {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: tomorrow.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '50',
      });

      const response = await this.makeRequest(
        `/calendars/primary/events?${params.toString()}`
      );

      const events = (response.items || []).map((item: any) => 
        this.parseEvent(item)
      ).filter(Boolean);

      return this.detectConflicts(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }

  async getEventsFromWindow(hoursAhead: number = 24): Promise<CalendarEvent[]> {
    try {
      const now = new Date();
      const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

      const params = new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '100',
      });

      const response = await this.makeRequest(
        `/calendars/primary/events?${params.toString()}`
      );

      const events = (response.items || []).map((item: any) => 
        this.parseEvent(item)
      ).filter(Boolean);

      return this.detectConflicts(events);
    } catch (error) {
      console.error('Error fetching calendar events from window:', error);
      return [];
    }
  }

  private parseEvent(eventData: any): CalendarEvent | null {
    try {
      if (!eventData.start || !eventData.end) {
        return null;
      }

      // Handle all-day events
      const start = eventData.start.dateTime 
        ? new Date(eventData.start.dateTime)
        : new Date(eventData.start.date + 'T00:00:00');

      const end = eventData.end.dateTime
        ? new Date(eventData.end.dateTime)
        : new Date(eventData.end.date + 'T23:59:59');

      return {
        id: eventData.id,
        title: eventData.summary || 'No Title',
        start,
        end,
        description: eventData.description || undefined,
        location: eventData.location || undefined,
        conflicts: false, // Will be set by detectConflicts
      };
    } catch (error) {
      console.error('Error parsing calendar event:', error);
      return null;
    }
  }

  private detectConflicts(events: CalendarEvent[]): CalendarEvent[] {
    const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
    
    for (let i = 0; i < sortedEvents.length; i++) {
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const event1 = sortedEvents[i];
        const event2 = sortedEvents[j];
        
        // Check for overlap
        if (this.eventsOverlap(event1, event2)) {
          event1.conflicts = true;
          event2.conflicts = true;
        }
      }
    }
    
    return sortedEvents;
  }

  private eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    return event1.start < event2.end && event2.start < event1.end;
  }

  async getCalendars(): Promise<any[]> {
    try {
      const response = await this.makeRequest('/users/me/calendarList');
      return response.items || [];
    } catch (error) {
      console.error('Error fetching calendars:', error);
      return [];
    }
  }

  formatEventTime(event: CalendarEvent): string {
    const now = new Date();
    const isToday = event.start.toDateString() === now.toDateString();
    const isTomorrow = event.start.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    let datePrefix = '';
    if (isToday) {
      datePrefix = 'Today ';
    } else if (isTomorrow) {
      datePrefix = 'Tomorrow ';
    } else {
      datePrefix = event.start.toLocaleDateString() + ' ';
    }
    
    const timeFormat: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    
    const startTime = event.start.toLocaleTimeString([], timeFormat);
    const endTime = event.end.toLocaleTimeString([], timeFormat);
    
    return `${datePrefix}${startTime} - ${endTime}`;
  }

  calculateTravelTime(fromLocation?: string, toLocation?: string): number {
    // Simplified travel time calculation
    // In a real app, you'd use Google Maps API or similar
    if (!fromLocation || !toLocation) return 0;
    
    // Basic heuristics - this would be replaced with actual routing API
    return 30; // 30 minutes default travel time
  }

  getUpcomingEvent(): CalendarEvent | null {
    // This would be called from a cached list of today's events
    // For now, return null as we don't have a cached list
    return null;
  }
}

export default new CalendarService();