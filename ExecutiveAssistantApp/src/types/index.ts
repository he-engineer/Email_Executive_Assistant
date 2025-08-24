export interface User {
  id: string;
  email: string;
  name: string;
  photo?: string;
}

export interface GoogleAccount {
  id: string;
  email: string;
  name: string;
  isPrimary: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  conflicts?: boolean;
}

export interface EmailThread {
  id: string;
  subject: string;
  participants: string[];
  lastMessageDate: Date;
  isUnread: boolean;
  urgencyScore: number;
  importance: 'high' | 'medium' | 'low';
  actionRequired: boolean;
  rationale?: string;
  snippet: string;
}

export interface DraftReply {
  id: string;
  threadId: string;
  content: string;
  tone: 'professional' | 'casual' | 'formal';
}

export interface BriefData {
  id: string;
  timestamp: Date;
  calendarEvents: CalendarEvent[];
  topEmails: EmailThread[];
  allEmails: EmailThread[];
}

export interface AppSettings {
  scheduleEnabled: boolean;
  morningTime: string;
  eveningTime: string;
  quietHours: {
    start: string;
    end: string;
  };
  emailWindow: number; // hours
  calendarWindow: number; // hours
  notificationsEnabled: boolean;
  defaultTone: 'professional' | 'casual' | 'formal';
  signature?: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  action: 'draft_generated' | 'email_sent' | 'email_snoozed' | 'brief_generated';
  details: string;
  threadId?: string;
}