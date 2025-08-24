import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import SettingsService from './SettingsService';
import BriefService from './BriefService';

// Configure how notifications are handled when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private isConfigured = false;
  private scheduledNotificationIds: string[] = [];

  async configure() {
    if (this.isConfigured) return;

    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('executive-assistant', {
        name: 'Executive Assistant Briefs',
        description: 'Scheduled brief notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Set up notification listeners
    Notifications.addNotificationReceivedListener(this.handleNotificationReceived);
    Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);

    this.isConfigured = true;
  }

  private handleNotificationReceived = (notification: Notifications.Notification) => {
    console.log('NOTIFICATION RECEIVED:', notification);
  };

  private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    console.log('NOTIFICATION RESPONSE:', response);
    
    const data = response.notification.request.content.data;
    if (data?.type === 'scheduled-brief' || data?.type === 'instant-brief') {
      // Navigate to brief screen
      // This would typically use navigation service or deep linking
    }
  };

  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get notification permissions');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async scheduleNotifications(): Promise<void> {
    try {
      const settings = await SettingsService.getSettings();
      
      if (!settings.scheduleEnabled || !settings.notificationsEnabled) {
        await this.cancelAllScheduledNotifications();
        return;
      }

      // Cancel existing scheduled notifications
      await this.cancelAllScheduledNotifications();

      // Schedule morning notification
      await this.scheduleDailyNotification('morning', settings.morningTime);
      
      // Schedule evening notification
      await this.scheduleDailyNotification('evening', settings.eveningTime);

    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }

  private async scheduleDailyNotification(
    type: 'morning' | 'evening',
    time: string
  ): Promise<void> {
    const settings = await SettingsService.getSettings();
    const { hours, minutes } = SettingsService.parseTime(time);
    
    // Create a date for the next occurrence of this time
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (scheduledDate <= new Date()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    // Check if it's in quiet hours
    if (SettingsService.isInQuietHours(scheduledDate)) {
      console.log(`Skipping ${type} notification - in quiet hours`);
      return;
    }

    const title = type === 'morning' ? 'Good Morning!' : 'Evening Brief';
    const message = `Your ${type} brief is ready. Tap to view your priorities.`;

    const notificationRequest = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        data: {
          type: 'scheduled-brief',
          briefType: type,
        },
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
      },
    });

    this.scheduledNotificationIds.push(notificationRequest);
    console.log(`Scheduled ${type} notification for ${scheduledDate.toLocaleString()}`);
  }

  async sendInstantBriefNotification(briefSummary?: string): Promise<void> {
    try {
      const settings = await SettingsService.getSettings();
      
      if (!settings.notificationsEnabled) {
        return;
      }

      // Check quiet hours
      if (SettingsService.isInQuietHours()) {
        console.log('Skipping instant notification - in quiet hours');
        return;
      }

      const title = 'Your Brief is Ready';
      const message = briefSummary || 'Tap to view your latest brief with prioritized emails and calendar.';

      await Notifications.presentNotificationAsync({
        title,
        body: message,
        data: {
          type: 'instant-brief',
        },
      });

    } catch (error) {
      console.error('Error sending instant notification:', error);
    }
  }

  async sendEmailActionNotification(
    action: 'sent' | 'snoozed' | 'draft_ready',
    details: string
  ): Promise<void> {
    try {
      const settings = await SettingsService.getSettings();
      
      if (!settings.notificationsEnabled || SettingsService.isInQuietHours()) {
        return;
      }

      let title = '';
      let message = '';

      switch (action) {
        case 'sent':
          title = 'Email Sent';
          message = `Successfully sent: ${details}`;
          break;
        case 'snoozed':
          title = 'Email Snoozed';
          message = `Snoozed: ${details}`;
          break;
        case 'draft_ready':
          title = 'Draft Ready';
          message = `Draft reply ready for: ${details}`;
          break;
      }

      await Notifications.presentNotificationAsync({
        title,
        body: message,
        data: {
          type: 'email-action',
          action,
        },
      });

    } catch (error) {
      console.error('Error sending action notification:', error);
    }
  }

  async cancelAllScheduledNotifications(): Promise<void> {
    try {
      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledNotificationIds = [];
      console.log('Canceled all scheduled notifications');
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      this.scheduledNotificationIds = this.scheduledNotificationIds.filter(
        id => id !== notificationId
      );
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async getBadgeNumber(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge number:', error);
      return 0;
    }
  }

  async setBadgeNumber(number: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(number);
    } catch (error) {
      console.error('Error setting badge number:', error);
    }
  }

  async clearBadge(): Promise<void> {
    await this.setBadgeNumber(0);
  }

  // Handle notification actions (iOS categories, Android actions)
  async setupNotificationActions(): Promise<void> {
    if (Platform.OS === 'ios') {
      // iOS notification categories would be configured here
      // This requires additional iOS-specific setup in the native code
    }
  }

  // Test notification for debugging
  async sendTestNotification(): Promise<void> {
    await Notifications.presentNotificationAsync({
      title: 'Test Notification',
      body: 'This is a test notification from Executive Assistant',
      data: {
        type: 'test',
      },
    });
  }

  // Check if notifications are enabled
  async areNotificationsEnabled(): Promise<boolean> {
    const settings = await SettingsService.getSettings();
    return settings.notificationsEnabled;
  }

  // Update notification schedule when settings change
  async onSettingsChanged(): Promise<void> {
    await this.scheduleNotifications();
  }

  // Get scheduled notification IDs (for debugging)
  getScheduledNotificationIds(): string[] {
    return [...this.scheduledNotificationIds];
  }
}

export default new NotificationService();