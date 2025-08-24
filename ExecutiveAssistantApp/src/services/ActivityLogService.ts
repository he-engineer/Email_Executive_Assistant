import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityLogEntry } from '../types';

const ACTIVITY_LOG_KEY = 'activity_log';
const MAX_LOG_ENTRIES = 1000; // Keep last 1000 entries

class ActivityLogService {
  async logActivity(
    action: ActivityLogEntry['action'],
    details: string,
    threadId?: string
  ): Promise<void> {
    try {
      const entry: ActivityLogEntry = {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        action,
        details,
        threadId,
      };

      const existingEntries = await this.getActivityLog();
      const updatedEntries = [entry, ...existingEntries];

      // Keep only the most recent entries
      const trimmedEntries = updatedEntries.slice(0, MAX_LOG_ENTRIES);

      await AsyncStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(trimmedEntries));
      
      console.log(`Activity logged: ${action} - ${details}`);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  async getActivityLog(limit?: number): Promise<ActivityLogEntry[]> {
    try {
      const logData = await AsyncStorage.getItem(ACTIVITY_LOG_KEY);
      
      if (!logData) {
        return [];
      }

      const entries = JSON.parse(logData).map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));

      return limit ? entries.slice(0, limit) : entries;
    } catch (error) {
      console.error('Error reading activity log:', error);
      return [];
    }
  }

  async getActivityLogByType(
    action: ActivityLogEntry['action'],
    limit?: number
  ): Promise<ActivityLogEntry[]> {
    const allEntries = await this.getActivityLog();
    const filteredEntries = allEntries.filter(entry => entry.action === action);
    
    return limit ? filteredEntries.slice(0, limit) : filteredEntries;
  }

  async getActivityLogByThread(threadId: string): Promise<ActivityLogEntry[]> {
    const allEntries = await this.getActivityLog();
    return allEntries.filter(entry => entry.threadId === threadId);
  }

  async getActivityLogForTimeRange(
    startDate: Date,
    endDate: Date
  ): Promise<ActivityLogEntry[]> {
    const allEntries = await this.getActivityLog();
    
    return allEntries.filter(entry => 
      entry.timestamp >= startDate && entry.timestamp <= endDate
    );
  }

  async getTodaysActivity(): Promise<ActivityLogEntry[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.getActivityLogForTimeRange(today, tomorrow);
  }

  async getWeeklyActivity(): Promise<ActivityLogEntry[]> {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return this.getActivityLogForTimeRange(weekAgo, today);
  }

  async clearActivityLog(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ACTIVITY_LOG_KEY);
      console.log('Activity log cleared');
    } catch (error) {
      console.error('Error clearing activity log:', error);
    }
  }

  async clearOldEntries(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const allEntries = await this.getActivityLog();
      const recentEntries = allEntries.filter(entry => entry.timestamp >= cutoffDate);
      
      await AsyncStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(recentEntries));
      
      console.log(`Cleared entries older than ${daysToKeep} days`);
    } catch (error) {
      console.error('Error clearing old entries:', error);
    }
  }

  // Convenience methods for specific actions
  async logBriefGenerated(briefId: string, emailCount: number, calendarCount: number): Promise<void> {
    const details = `Generated brief with ${emailCount} emails and ${calendarCount} calendar events`;
    await this.logActivity('brief_generated', details);
  }

  async logEmailSent(threadId: string, subject: string, recipient: string): Promise<void> {
    const details = `Sent email "${subject}" to ${recipient}`;
    await this.logActivity('email_sent', details, threadId);
  }

  async logEmailSnoozed(threadId: string, subject: string, snoozeUntil: Date): Promise<void> {
    const details = `Snoozed email "${subject}" until ${snoozeUntil.toLocaleString()}`;
    await this.logActivity('email_snoozed', details, threadId);
  }

  async logDraftGenerated(threadId: string, subject: string, tone: string): Promise<void> {
    const details = `Generated ${tone} draft for "${subject}"`;
    await this.logActivity('draft_generated', details, threadId);
  }

  // Analytics methods
  async getActivityStats(days: number = 7): Promise<{
    totalActivities: number;
    briefsGenerated: number;
    emailsSent: number;
    emailsSnoozed: number;
    draftsGenerated: number;
    activitiesByDay: { [date: string]: number };
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const entries = await this.getActivityLogForTimeRange(startDate, endDate);
      
      const stats = {
        totalActivities: entries.length,
        briefsGenerated: 0,
        emailsSent: 0,
        emailsSnoozed: 0,
        draftsGenerated: 0,
        activitiesByDay: {} as { [date: string]: number },
      };

      entries.forEach(entry => {
        // Count by action type
        switch (entry.action) {
          case 'brief_generated':
            stats.briefsGenerated++;
            break;
          case 'email_sent':
            stats.emailsSent++;
            break;
          case 'email_snoozed':
            stats.emailsSnoozed++;
            break;
          case 'draft_generated':
            stats.draftsGenerated++;
            break;
        }

        // Count by day
        const dateKey = entry.timestamp.toDateString();
        stats.activitiesByDay[dateKey] = (stats.activitiesByDay[dateKey] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error calculating activity stats:', error);
      return {
        totalActivities: 0,
        briefsGenerated: 0,
        emailsSent: 0,
        emailsSnoozed: 0,
        draftsGenerated: 0,
        activitiesByDay: {},
      };
    }
  }

  async getMostActiveThreads(limit: number = 10): Promise<{
    threadId: string;
    activityCount: number;
    lastActivity: Date;
  }[]> {
    try {
      const allEntries = await this.getActivityLog();
      const threadActivities: { [threadId: string]: { count: number; lastActivity: Date } } = {};

      allEntries.forEach(entry => {
        if (entry.threadId) {
          if (!threadActivities[entry.threadId]) {
            threadActivities[entry.threadId] = { count: 0, lastActivity: entry.timestamp };
          }
          
          threadActivities[entry.threadId].count++;
          
          if (entry.timestamp > threadActivities[entry.threadId].lastActivity) {
            threadActivities[entry.threadId].lastActivity = entry.timestamp;
          }
        }
      });

      return Object.entries(threadActivities)
        .map(([threadId, data]) => ({
          threadId,
          activityCount: data.count,
          lastActivity: data.lastActivity,
        }))
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting most active threads:', error);
      return [];
    }
  }

  // Export activity log
  async exportActivityLog(startDate?: Date, endDate?: Date): Promise<string> {
    try {
      let entries: ActivityLogEntry[];
      
      if (startDate && endDate) {
        entries = await this.getActivityLogForTimeRange(startDate, endDate);
      } else {
        entries = await this.getActivityLog();
      }

      const csvHeader = 'Timestamp,Action,Details,Thread ID\n';
      const csvRows = entries.map(entry => {
        const timestamp = entry.timestamp.toISOString();
        const action = entry.action;
        const details = entry.details.replace(/,/g, ';'); // Replace commas to avoid CSV issues
        const threadId = entry.threadId || '';
        
        return `"${timestamp}","${action}","${details}","${threadId}"`;
      }).join('\n');

      return csvHeader + csvRows;
    } catch (error) {
      console.error('Error exporting activity log:', error);
      return '';
    }
  }

  // Search activity log
  async searchActivityLog(query: string): Promise<ActivityLogEntry[]> {
    try {
      const allEntries = await this.getActivityLog();
      const lowerQuery = query.toLowerCase();
      
      return allEntries.filter(entry => 
        entry.details.toLowerCase().includes(lowerQuery) ||
        entry.action.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching activity log:', error);
      return [];
    }
  }

  // Get total count of activities
  async getTotalActivityCount(): Promise<number> {
    const entries = await this.getActivityLog();
    return entries.length;
  }

  // Check if storage is getting full
  async checkStorageHealth(): Promise<{
    totalEntries: number;
    isNearLimit: boolean;
    shouldCleanup: boolean;
  }> {
    const entries = await this.getActivityLog();
    const totalEntries = entries.length;
    const isNearLimit = totalEntries > MAX_LOG_ENTRIES * 0.8; // 80% of max
    const shouldCleanup = totalEntries >= MAX_LOG_ENTRIES;

    return {
      totalEntries,
      isNearLimit,
      shouldCleanup,
    };
  }
}

export default new ActivityLogService();