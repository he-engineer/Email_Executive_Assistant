import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { AppSettings } from '../types';
import SettingsService from '../services/SettingsService';

const SettingsScreen: React.FC = () => {
  const { user, accounts, signOut, removeAccount, setPrimaryAccount } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Time picker states
  const [showMorningPicker, setShowMorningPicker] = useState(false);
  const [showEveningPicker, setShowEveningPicker] = useState(false);
  const [showQuietStartPicker, setShowQuietStartPicker] = useState(false);
  const [showQuietEndPicker, setShowQuietEndPicker] = useState(false);
  
  // Form states
  const [signature, setSignature] = useState('');
  const [emailWindow, setEmailWindow] = useState('96');
  const [calendarWindow, setCalendarWindow] = useState('24');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const currentSettings = await SettingsService.getSettings();
      setSettings(currentSettings);
      setSignature(currentSettings.signature || '');
      setEmailWindow(currentSettings.emailWindow.toString());
      setCalendarWindow(currentSettings.calendarWindow.toString());
    } catch (error) {
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    try {
      await SettingsService.updateSetting(key, value);
      if (settings) {
        setSettings({ ...settings, [key]: value });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleTimeChange = async (
    event: any,
    selectedTime: Date | undefined,
    type: 'morning' | 'evening' | 'quietStart' | 'quietEnd'
  ) => {
    if (Platform.OS === 'android') {
      setShowMorningPicker(false);
      setShowEveningPicker(false);
      setShowQuietStartPicker(false);
      setShowQuietEndPicker(false);
    }

    if (selectedTime && settings) {
      const timeString = SettingsService.formatTime(
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );

      switch (type) {
        case 'morning':
          await updateSetting('morningTime', timeString);
          break;
        case 'evening':
          await updateSetting('eveningTime', timeString);
          break;
        case 'quietStart':
          await updateSetting('quietHours', { 
            ...settings.quietHours, 
            start: timeString 
          });
          break;
        case 'quietEnd':
          await updateSetting('quietHours', { 
            ...settings.quietHours, 
            end: timeString 
          });
          break;
      }
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleRemoveAccount = (accountId: string, accountEmail: string) => {
    Alert.alert(
      'Remove Account',
      `Remove ${accountEmail} from the app?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeAccount(accountId),
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Reset all settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await SettingsService.resetToDefaults();
              await loadSettings();
              Alert.alert('Success', 'Settings reset to defaults');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  const saveSignature = async () => {
    try {
      await SettingsService.updateSignature(signature);
      Alert.alert('Success', 'Signature saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save signature');
    }
  };

  const saveWindows = async () => {
    const emailHours = parseInt(emailWindow);
    const calendarHours = parseInt(calendarWindow);

    if (!SettingsService.isValidEmailWindow(emailHours)) {
      Alert.alert('Error', 'Email window must be between 1-168 hours');
      return;
    }

    if (!SettingsService.isValidCalendarWindow(calendarHours)) {
      Alert.alert('Error', 'Calendar window must be between 1-168 hours');
      return;
    }

    try {
      await SettingsService.updateWindows(emailHours, calendarHours);
      Alert.alert('Success', 'Time windows updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update time windows');
    }
  };

  const createTimePickerTime = (timeString: string): Date => {
    const { hours, minutes } = SettingsService.parseTime(timeString);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  if (isLoading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Signed in as</Text>
            <Text style={styles.settingValue}>{user?.name}</Text>
            <Text style={styles.settingSubValue}>{user?.email}</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Connected Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connected Accounts</Text>
          
          {accounts.map((account) => (
            <View key={account.id} style={styles.accountItem}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountEmail}>{account.email}</Text>
                {account.isPrimary && (
                  <Text style={styles.primaryBadge}>Primary</Text>
                )}
              </View>
              <View style={styles.accountActions}>
                {!account.isPrimary && (
                  <TouchableOpacity
                    style={styles.setPrimaryButton}
                    onPress={() => setPrimaryAccount(account.id)}
                  >
                    <Text style={styles.setPrimaryText}>Set Primary</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveAccount(account.id, account.email)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Scheduled Briefs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scheduled Briefs</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Enable scheduled briefs</Text>
            <Switch
              value={settings.scheduleEnabled}
              onValueChange={(value) => updateSetting('scheduleEnabled', value)}
            />
          </View>

          {settings.scheduleEnabled && (
            <>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowMorningPicker(true)}
              >
                <Text style={styles.settingLabel}>Morning brief</Text>
                <Text style={styles.timeValue}>{settings.morningTime}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowEveningPicker(true)}
              >
                <Text style={styles.settingLabel}>Evening brief</Text>
                <Text style={styles.timeValue}>{settings.eveningTime}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Push notifications</Text>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) => updateSetting('notificationsEnabled', value)}
            />
          </View>

          {settings.notificationsEnabled && (
            <>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowQuietStartPicker(true)}
              >
                <Text style={styles.settingLabel}>Quiet hours start</Text>
                <Text style={styles.timeValue}>{settings.quietHours.start}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowQuietEndPicker(true)}
              >
                <Text style={styles.settingLabel}>Quiet hours end</Text>
                <Text style={styles.timeValue}>{settings.quietHours.end}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Email Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Preferences</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Default tone</Text>
            <View style={styles.toneButtons}>
              {(['professional', 'casual', 'formal'] as const).map((tone) => (
                <TouchableOpacity
                  key={tone}
                  style={[
                    styles.toneButton,
                    settings.defaultTone === tone && styles.selectedToneButton,
                  ]}
                  onPress={() => updateSetting('defaultTone', tone)}
                >
                  <Text
                    style={[
                      styles.toneButtonText,
                      settings.defaultTone === tone && styles.selectedToneButtonText,
                    ]}
                  >
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email signature</Text>
            <TextInput
              style={styles.textInput}
              value={signature}
              onChangeText={setSignature}
              placeholder="Enter your email signature"
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveSignature}>
              <Text style={styles.saveButtonText}>Save Signature</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Windows */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Windows</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email window (hours)</Text>
            <TextInput
              style={styles.numberInput}
              value={emailWindow}
              onChangeText={setEmailWindow}
              keyboardType="numeric"
              placeholder="96"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Calendar window (hours)</Text>
            <TextInput
              style={styles.numberInput}
              value={calendarWindow}
              onChangeText={setCalendarWindow}
              keyboardType="numeric"
              placeholder="24"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveWindows}>
            <Text style={styles.saveButtonText}>Save Windows</Text>
          </TouchableOpacity>
        </View>

        {/* Advanced */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          
          <TouchableOpacity style={styles.dangerButton} onPress={handleResetSettings}>
            <Text style={styles.dangerButtonText}>Reset All Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Time Pickers */}
        {showMorningPicker && (
          <DateTimePicker
            value={createTimePickerTime(settings.morningTime)}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(event, time) => handleTimeChange(event, time, 'morning')}
          />
        )}

        {showEveningPicker && (
          <DateTimePicker
            value={createTimePickerTime(settings.eveningTime)}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(event, time) => handleTimeChange(event, time, 'evening')}
          />
        )}

        {showQuietStartPicker && (
          <DateTimePicker
            value={createTimePickerTime(settings.quietHours.start)}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(event, time) => handleTimeChange(event, time, 'quietStart')}
          />
        )}

        {showQuietEndPicker && (
          <DateTimePicker
            value={createTimePickerTime(settings.quietHours.end)}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(event, time) => handleTimeChange(event, time, 'quietEnd')}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  settingSubValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  accountItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountEmail: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  primaryBadge: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#e8f4ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  accountActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  setPrimaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e8f4ff',
    borderRadius: 4,
    marginRight: 8,
  },
  setPrimaryText: {
    fontSize: 14,
    color: '#007AFF',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffe8e8',
    borderRadius: 4,
  },
  removeButtonText: {
    fontSize: 14,
    color: '#ff3b30',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  toneButtons: {
    flexDirection: 'row',
  },
  toneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  selectedToneButton: {
    backgroundColor: '#007AFF',
  },
  toneButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectedToneButtonText: {
    color: '#fff',
  },
  inputGroup: {
    marginVertical: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SettingsScreen;