import AsyncStorage from '@react-native-async-storage/async-storage';
import { BriefData, EmailThread, CalendarEvent, AppSettings } from '../types';
import GmailService from './GmailService';
import CalendarService from './CalendarService';
import LLMService from './LLMService';

const BRIEF_CACHE_KEY = 'cached_brief_data';
const BRIEF_TIMESTAMP_KEY = 'brief_timestamp';
const BRIEF_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

class BriefService {
  async generateBrief(settings?: AppSettings): Promise<BriefData> {
    try {
      // Check cache first
      const cachedBrief = await this.getCachedBrief();
      if (cachedBrief) {
        return cachedBrief;
      }

      // Generate new brief
      const emailWindow = settings?.emailWindow || 96; // 4 days
      const calendarWindow = settings?.calendarWindow || 24; // 1 day

      const [emails, calendarEvents] = await Promise.all([
        GmailService.getEmailsFromWindow(emailWindow),
        CalendarService.getEventsFromWindow(calendarWindow),
      ]);

      const briefData: BriefData = {
        id: `brief_${Date.now()}`,
        timestamp: new Date(),
        calendarEvents,
        topEmails: emails.slice(0, 3), // Top 3
        allEmails: emails,
      };

      // Cache the brief
      await this.cacheBrief(briefData);

      return briefData;
    } catch (error) {
      console.error('Error generating brief:', error);
      throw error;
    }
  }

  async getScheduledBrief(): Promise<BriefData | null> {
    try {
      return await this.getCachedBrief();
    } catch (error) {
      console.error('Error getting scheduled brief:', error);
      return null;
    }
  }

  private async getCachedBrief(): Promise<BriefData | null> {
    try {
      const [cachedData, timestampStr] = await Promise.all([
        AsyncStorage.getItem(BRIEF_CACHE_KEY),
        AsyncStorage.getItem(BRIEF_TIMESTAMP_KEY),
      ]);

      if (!cachedData || !timestampStr) {
        return null;
      }

      const timestamp = new Date(timestampStr);
      const now = new Date();

      // Check if cache is still valid (within 5 minutes)
      if (now.getTime() - timestamp.getTime() > BRIEF_CACHE_DURATION) {
        await this.clearCache();
        return null;
      }

      const briefData = JSON.parse(cachedData);
      // Convert date strings back to Date objects
      briefData.timestamp = new Date(briefData.timestamp);
      briefData.calendarEvents = briefData.calendarEvents.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }));
      briefData.topEmails = briefData.topEmails.map((email: any) => ({
        ...email,
        lastMessageDate: new Date(email.lastMessageDate),
      }));
      briefData.allEmails = briefData.allEmails.map((email: any) => ({
        ...email,
        lastMessageDate: new Date(email.lastMessageDate),
      }));

      return briefData;
    } catch (error) {
      console.error('Error reading cached brief:', error);
      return null;
    }
  }

  private async cacheBrief(briefData: BriefData): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(BRIEF_CACHE_KEY, JSON.stringify(briefData)),
        AsyncStorage.setItem(BRIEF_TIMESTAMP_KEY, new Date().toISOString()),
      ]);
    } catch (error) {
      console.error('Error caching brief:', error);
    }
  }

  private async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(BRIEF_CACHE_KEY),
        AsyncStorage.removeItem(BRIEF_TIMESTAMP_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async getLastBriefTimestamp(): Promise<Date | null> {
    try {
      const timestampStr = await AsyncStorage.getItem(BRIEF_TIMESTAMP_KEY);
      return timestampStr ? new Date(timestampStr) : null;
    } catch (error) {
      return null;
    }
  }

  formatBriefSummary(briefData: BriefData): string {
    const { calendarEvents, topEmails } = briefData;
    
    let summary = `Brief for ${briefData.timestamp.toLocaleDateString()}\n\n`;
    
    // Calendar summary
    if (calendarEvents.length > 0) {
      summary += `📅 Today's Calendar (${calendarEvents.length} events):\n`;
      calendarEvents.slice(0, 3).forEach(event => {
        const timeStr = CalendarService.formatEventTime(event);
        const conflictStr = event.conflicts ? ' ⚠️ CONFLICT' : '';
        summary += `• ${event.title} - ${timeStr}${conflictStr}\n`;
      });
      
      if (calendarEvents.length > 3) {
        summary += `• ... and ${calendarEvents.length - 3} more events\n`;
      }
    } else {
      summary += '📅 No calendar events scheduled\n';
    }
    
    summary += '\n';
    
    // Email summary
    if (topEmails.length > 0) {
      summary += `📧 Top Priority Emails (${topEmails.length}):\n`;
      topEmails.forEach((email, index) => {
        const urgencyIcon = email.importance === 'high' ? '🔴' : 
                           email.importance === 'medium' ? '🟡' : '🟢';
        summary += `${urgencyIcon} ${email.subject}\n`;
        if (email.rationale) {
          summary += `   └ ${email.rationale}\n`;
        }
      });
    } else {
      summary += '📧 No priority emails found\n';
    }
    
    return summary;
  }

  async invalidateCache(): Promise<void> {
    await this.clearCache();
  }
}

export default new BriefService();