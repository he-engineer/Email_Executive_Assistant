import { EmailThread } from '../types';
import AuthService from './AuthService';

class GmailService {
  private baseUrl = 'https://www.googleapis.com/gmail/v1';

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
      throw new Error(`Gmail API error: ${response.status}`);
    }

    return response.json();
  }

  async getThreads(maxResults: number = 50): Promise<EmailThread[]> {
    try {
      // Get thread list
      const threadsResponse = await this.makeRequest(
        `/users/me/threads?maxResults=${maxResults}&q=in:inbox`
      );

      const threads: EmailThread[] = [];

      // Get detailed info for each thread
      for (const threadInfo of threadsResponse.threads || []) {
        const threadDetail = await this.makeRequest(
          `/users/me/threads/${threadInfo.id}`
        );

        const emailThread = this.parseThread(threadDetail);
        if (emailThread) {
          threads.push(emailThread);
        }
      }

      return threads.sort((a, b) => 
        b.lastMessageDate.getTime() - a.lastMessageDate.getTime()
      );
    } catch (error) {
      console.error('Error fetching Gmail threads:', error);
      return [];
    }
  }

  async getEmailsFromWindow(hoursBack: number = 96): Promise<EmailThread[]> {
    const after = Math.floor((Date.now() - (hoursBack * 60 * 60 * 1000)) / 1000);
    
    try {
      const query = `in:inbox after:${after}`;
      const threadsResponse = await this.makeRequest(
        `/users/me/threads?q=${encodeURIComponent(query)}&maxResults=100`
      );

      const threads: EmailThread[] = [];

      for (const threadInfo of threadsResponse.threads || []) {
        const threadDetail = await this.makeRequest(
          `/users/me/threads/${threadInfo.id}`
        );

        const emailThread = this.parseThread(threadDetail);
        if (emailThread) {
          threads.push(emailThread);
        }
      }

      return this.rankThreads(threads);
    } catch (error) {
      console.error('Error fetching emails from window:', error);
      return [];
    }
  }

  private parseThread(threadData: any): EmailThread | null {
    try {
      const messages = threadData.messages || [];
      if (messages.length === 0) return null;

      const latestMessage = messages[messages.length - 1];
      const headers = latestMessage.payload?.headers || [];
      
      const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject') || 'No Subject';
      const from = getHeader('From');
      const to = getHeader('To');
      
      // Extract participants
      const participants = [from, to]
        .filter(Boolean)
        .map(email => this.extractEmailAddress(email))
        .filter(Boolean);

      // Check if unread
      const isUnread = latestMessage.labelIds?.includes('UNREAD') || false;

      // Get snippet
      const snippet = latestMessage.snippet || '';

      // Calculate urgency and importance
      const urgencyScore = this.calculateUrgencyScore(threadData);
      const importance = this.calculateImportance(threadData);
      const actionRequired = this.determineActionRequired(threadData);

      return {
        id: threadData.id,
        subject,
        participants,
        lastMessageDate: new Date(parseInt(latestMessage.internalDate)),
        isUnread,
        urgencyScore,
        importance,
        actionRequired,
        snippet,
      };
    } catch (error) {
      console.error('Error parsing thread:', error);
      return null;
    }
  }

  private extractEmailAddress(emailString: string): string {
    const match = emailString.match(/<([^>]+)>/) || emailString.match(/([^\s<>]+@[^\s<>]+)/);
    return match ? match[1] : emailString;
  }

  private calculateUrgencyScore(threadData: any): number {
    let score = 0;
    const messages = threadData.messages || [];
    const latestMessage = messages[messages.length - 1];
    
    // Recent messages get higher scores
    const hoursAgo = (Date.now() - parseInt(latestMessage.internalDate)) / (1000 * 60 * 60);
    if (hoursAgo < 2) score += 3;
    else if (hoursAgo < 24) score += 2;
    else if (hoursAgo < 72) score += 1;

    // Unread messages
    if (latestMessage.labelIds?.includes('UNREAD')) score += 2;

    // Important label
    if (latestMessage.labelIds?.includes('IMPORTANT')) score += 2;

    // Keywords in subject indicating urgency
    const subject = (threadData.messages[0]?.payload?.headers?.find(
      (h: any) => h.name === 'Subject'
    )?.value || '').toLowerCase();
    
    const urgentKeywords = ['urgent', 'asap', 'immediate', 'deadline', 'emergency', 'critical'];
    if (urgentKeywords.some(keyword => subject.includes(keyword))) {
      score += 3;
    }

    return Math.min(score, 10); // Cap at 10
  }

  private calculateImportance(threadData: any): 'high' | 'medium' | 'low' {
    const urgencyScore = this.calculateUrgencyScore(threadData);
    const messages = threadData.messages || [];
    
    // Check for VIP senders (this would typically come from a contacts database)
    // For now, we'll use domain-based heuristics
    const fromEmail = this.getFromEmail(threadData);
    const isFromVIP = this.isVIPSender(fromEmail);
    
    if (urgencyScore >= 7 || isFromVIP) return 'high';
    if (urgencyScore >= 4) return 'medium';
    return 'low';
  }

  private getFromEmail(threadData: any): string {
    const firstMessage = threadData.messages?.[0];
    const headers = firstMessage?.payload?.headers || [];
    const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
    return this.extractEmailAddress(fromHeader);
  }

  private isVIPSender(email: string): boolean {
    // This would typically check against a user's VIP list
    // For demo purposes, we'll mark certain domains as VIP
    const vipDomains = ['company.com', 'client.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return vipDomains.includes(domain);
  }

  private determineActionRequired(threadData: any): boolean {
    const messages = threadData.messages || [];
    const latestMessage = messages[messages.length - 1];
    const snippet = latestMessage.snippet?.toLowerCase() || '';
    
    // Simple heuristics for action required
    const actionKeywords = [
      'please', 'can you', 'could you', 'would you', 'need you to',
      'action required', 'response needed', 'reply', 'confirm',
      'review', 'approve', 'sign', 'meeting'
    ];
    
    return actionKeywords.some(keyword => snippet.includes(keyword));
  }

  private rankThreads(threads: EmailThread[]): EmailThread[] {
    return threads
      .map(thread => ({
        ...thread,
        rationale: this.generateRationale(thread),
      }))
      .sort((a, b) => {
        // Primary sort by importance
        const importanceWeight = { high: 3, medium: 2, low: 1 };
        const importanceDiff = importanceWeight[b.importance] - importanceWeight[a.importance];
        if (importanceDiff !== 0) return importanceDiff;
        
        // Secondary sort by urgency score
        const urgencyDiff = b.urgencyScore - a.urgencyScore;
        if (urgencyDiff !== 0) return urgencyDiff;
        
        // Tertiary sort by date
        return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
      });
  }

  private generateRationale(thread: EmailThread): string {
    const reasons = [];
    
    if (thread.urgencyScore >= 7) {
      reasons.push('High urgency score');
    }
    
    if (thread.isUnread) {
      reasons.push('Unread message');
    }
    
    if (thread.actionRequired) {
      reasons.push('Action required');
    }
    
    const hoursAgo = (Date.now() - thread.lastMessageDate.getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 24) {
      reasons.push('Recent message');
    }
    
    return reasons.join(', ') || 'Standard priority';
  }

  async sendReply(threadId: string, content: string, subject?: string): Promise<boolean> {
    try {
      // This would implement the actual email sending logic
      // For MVP, we'll just log the action
      console.log(`Sending reply to thread ${threadId}:`, content);
      
      // In a real implementation, you would:
      // 1. Get the original thread
      // 2. Format the reply properly
      // 3. Use the Gmail API to send the message
      
      return true;
    } catch (error) {
      console.error('Error sending reply:', error);
      return false;
    }
  }
}

export default new GmailService();