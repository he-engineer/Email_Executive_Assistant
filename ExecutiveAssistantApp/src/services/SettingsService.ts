import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types';

const SETTINGS_KEY = 'app_settings';

const DEFAULT_SETTINGS: AppSettings = {
  scheduleEnabled: true,
  morningTime: '07:00',
  eveningTime: '19:00',
  quietHours: {
    start: '22:00',
    end: '07:00',
  },
  emailWindow: 96, // 4 days
  calendarWindow: 24, // 1 day
  notificationsEnabled: true,
  defaultTone: 'professional',
  signature: undefined,
};

class SettingsService {
  private cachedSettings: AppSettings | null = null;

  async getSettings(): Promise<AppSettings> {
    try {
      if (this.cachedSettings) {
        return this.cachedSettings;
      }

      const settingsData = await AsyncStorage.getItem(SETTINGS_KEY);
      
      if (!settingsData) {
        // First time user - save defaults
        await this.saveSettings(DEFAULT_SETTINGS);
        this.cachedSettings = DEFAULT_SETTINGS;
        return DEFAULT_SETTINGS;
      }

      const settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsData) };
      this.cachedSettings = settings;
      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
      this.cachedSettings = updatedSettings;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  async updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    const settings = await this.getSettings();
    await this.saveSettings({ ...settings, [key]: value });
  }

  async resetToDefaults(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SETTINGS_KEY);
      this.cachedSettings = null;
      await this.getSettings(); // This will save defaults
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw new Error('Failed to reset settings');
    }
  }

  // Helper methods for specific settings
  async toggleSchedule(): Promise<boolean> {
    const settings = await this.getSettings();
    const newValue = !settings.scheduleEnabled;
    await this.updateSetting('scheduleEnabled', newValue);
    return newValue;
  }

  async toggleNotifications(): Promise<boolean> {
    const settings = await this.getSettings();
    const newValue = !settings.notificationsEnabled;
    await this.updateSetting('notificationsEnabled', newValue);
    return newValue;
  }

  async updateScheduleTimes(morningTime: string, eveningTime: string): Promise<void> {
    await this.saveSettings({ morningTime, eveningTime });
  }

  async updateQuietHours(start: string, end: string): Promise<void> {
    await this.updateSetting('quietHours', { start, end });
  }

  async updateWindows(emailWindow: number, calendarWindow: number): Promise<void> {
    await this.saveSettings({ emailWindow, calendarWindow });
  }

  async updateTone(tone: 'professional' | 'casual' | 'formal'): Promise<void> {
    await this.updateSetting('defaultTone', tone);
  }

  async updateSignature(signature: string): Promise<void> {
    await this.updateSetting('signature', signature.trim() || undefined);
  }

  // Validation helpers
  isValidTime(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  isValidEmailWindow(hours: number): boolean {
    return hours > 0 && hours <= 168; // Max 1 week
  }

  isValidCalendarWindow(hours: number): boolean {
    return hours > 0 && hours <= 168; // Max 1 week
  }

  // Time utilities
  parseTime(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  }

  formatTime(hours: number, minutes: number): string {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  isInQuietHours(date: Date = new Date()): boolean {
    const settings = this.cachedSettings || DEFAULT_SETTINGS;
    const currentTime = this.formatTime(date.getHours(), date.getMinutes());
    const { start, end } = settings.quietHours;

    // Handle quiet hours that span midnight
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  getNextScheduledTime(type: 'morning' | 'evening'): Date {
    const settings = this.cachedSettings || DEFAULT_SETTINGS;
    const now = new Date();
    const targetTime = type === 'morning' ? settings.morningTime : settings.eveningTime;
    const { hours, minutes } = this.parseTime(targetTime);

    const nextTime = new Date();
    nextTime.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }

    return nextTime;
  }

  // Export/Import settings
  async exportSettings(): Promise<string> {
    const settings = await this.getSettings();
    return JSON.stringify(settings, null, 2);
  }

  async importSettings(settingsJson: string): Promise<void> {
    try {
      const settings = JSON.parse(settingsJson);
      
      // Validate required fields
      const requiredFields: (keyof AppSettings)[] = [
        'scheduleEnabled',
        'morningTime',
        'eveningTime',
        'notificationsEnabled',
        'defaultTone',
      ];

      for (const field of requiredFields) {
        if (!(field in settings)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate time formats
      if (!this.isValidTime(settings.morningTime) || !this.isValidTime(settings.eveningTime)) {
        throw new Error('Invalid time format');
      }

      if (settings.quietHours) {
        if (!this.isValidTime(settings.quietHours.start) || !this.isValidTime(settings.quietHours.end)) {
          throw new Error('Invalid quiet hours format');
        }
      }

      await this.saveSettings(settings);
    } catch (error) {
      console.error('Error importing settings:', error);
      throw new Error('Invalid settings format');
    }
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.cachedSettings = null;
  }
}

export default new SettingsService();