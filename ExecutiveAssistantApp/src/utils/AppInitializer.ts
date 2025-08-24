import NotificationService from '../services/NotificationService';
import SettingsService from '../services/SettingsService';
import ActivityLogService from '../services/ActivityLogService';

class AppInitializer {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing Executive Assistant App...');

    try {
      // Initialize notification service
      await this.initializeNotifications();

      // Initialize settings
      await this.initializeSettings();

      // Clean up old data
      await this.performMaintenance();

      // Setup notification schedules
      await this.setupScheduledNotifications();

      this.isInitialized = true;
      console.log('App initialization complete');

      // Log app startup
      await ActivityLogService.logActivity(
        'brief_generated',
        'App started successfully',
      );

    } catch (error) {
      console.error('App initialization failed:', error);
    }
  }

  private async initializeNotifications(): Promise<void> {
    try {
      // Configure push notifications
      await NotificationService.configure();

      // Request permissions
      const hasPermission = await NotificationService.requestPermissions();
      console.log('Notification permissions:', hasPermission ? 'granted' : 'denied');

      // Setup notification actions/categories
      await NotificationService.setupNotificationActions();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  private async initializeSettings(): Promise<void> {
    try {
      // Load settings to trigger default creation if needed
      await SettingsService.getSettings();
      console.log('Settings initialized');
    } catch (error) {
      console.error('Failed to initialize settings:', error);
    }
  }

  private async performMaintenance(): Promise<void> {
    try {
      // Check activity log health
      const logHealth = await ActivityLogService.checkStorageHealth();
      
      if (logHealth.shouldCleanup) {
        console.log('Cleaning up old activity logs...');
        await ActivityLogService.clearOldEntries(30); // Keep 30 days
      }

      console.log(`Activity log: ${logHealth.totalEntries} entries`);
    } catch (error) {
      console.error('Failed to perform maintenance:', error);
    }
  }

  private async setupScheduledNotifications(): Promise<void> {
    try {
      // Schedule notifications based on current settings
      await NotificationService.scheduleNotifications();
      console.log('Scheduled notifications updated');
    } catch (error) {
      console.error('Failed to setup scheduled notifications:', error);
    }
  }

  isAppInitialized(): boolean {
    return this.isInitialized;
  }

  async reinitialize(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }

  // Call this when settings change
  async onSettingsChanged(): Promise<void> {
    try {
      await NotificationService.onSettingsChanged();
      console.log('Settings change processed');
    } catch (error) {
      console.error('Failed to process settings change:', error);
    }
  }

  // Call this when app comes to foreground
  async onAppForeground(): Promise<void> {
    try {
      // Clear badge count
      await NotificationService.clearBadge();
      
      // Check for any scheduled notifications that might need updating
      const settings = await SettingsService.getSettings();
      if (settings.scheduleEnabled && settings.notificationsEnabled) {
        await NotificationService.scheduleNotifications();
      }
    } catch (error) {
      console.error('Failed to process app foreground:', error);
    }
  }

  // Call this when app goes to background
  async onAppBackground(): Promise<void> {
    try {
      // Ensure all scheduled notifications are properly set
      await NotificationService.scheduleNotifications();
    } catch (error) {
      console.error('Failed to process app background:', error);
    }
  }
}

export default new AppInitializer();