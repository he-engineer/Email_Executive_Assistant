import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BriefData, EmailThread, CalendarEvent } from '../types';
import BriefService from '../services/BriefService';
import CalendarService from '../services/CalendarService';

interface BriefScreenProps {
  navigation: any;
}

const BriefScreen: React.FC<BriefScreenProps> = ({ navigation }) => {
  const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllEmails, setShowAllEmails] = useState(false);

  useEffect(() => {
    loadBrief();
  }, []);

  const loadBrief = async () => {
    try {
      setIsLoading(true);
      const data = await BriefService.generateBrief();
      setBriefData(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load brief. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await BriefService.invalidateCache();
    await loadBrief();
    setRefreshing(false);
  };

  const handleEmailPress = (email: EmailThread) => {
    // TODO: Navigate to email detail screen
    navigation.navigate('EmailDetail', { emailThread: email });
  };

  const renderCalendarSection = () => {
    if (!briefData?.calendarEvents.length) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Today's Calendar</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No events scheduled</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          📅 Today's Calendar ({briefData.calendarEvents.length})
        </Text>
        {briefData.calendarEvents.map((event) => (
          <View key={event.id} style={styles.calendarItem}>
            <View style={styles.calendarItemHeader}>
              <Text style={styles.calendarTitle}>{event.title}</Text>
              {event.conflicts && <Text style={styles.conflictBadge}>⚠️ CONFLICT</Text>}
            </View>
            <Text style={styles.calendarTime}>
              {CalendarService.formatEventTime(event)}
            </Text>
            {event.location && (
              <Text style={styles.calendarLocation}>📍 {event.location}</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderEmailSection = () => {
    if (!briefData?.topEmails.length) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📧 Priority Emails</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No priority emails found</Text>
          </View>
        </View>
      );
    }

    const emailsToShow = showAllEmails ? briefData.allEmails : briefData.topEmails;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            📧 {showAllEmails ? 'All Emails' : 'Top 3 Priority'} 
            {showAllEmails && ` (${briefData.allEmails.length})`}
          </Text>
          {briefData.allEmails.length > 3 && (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowAllEmails(!showAllEmails)}
            >
              <Text style={styles.toggleButtonText}>
                {showAllEmails ? 'Show Top 3' : 'Show All'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {emailsToShow.map((email) => (
          <TouchableOpacity
            key={email.id}
            style={styles.emailItem}
            onPress={() => handleEmailPress(email)}
          >
            <View style={styles.emailHeader}>
              <View style={styles.emailTitleRow}>
                <Text style={styles.importanceIcon}>
                  {email.importance === 'high' ? '🔴' : 
                   email.importance === 'medium' ? '🟡' : '🟢'}
                </Text>
                <Text style={styles.emailSubject} numberOfLines={2}>
                  {email.subject}
                </Text>
              </View>
              {email.isUnread && <View style={styles.unreadDot} />}
            </View>
            
            <Text style={styles.emailSnippet} numberOfLines={2}>
              {email.snippet}
            </Text>
            
            <View style={styles.emailFooter}>
              <Text style={styles.emailTime}>
                {formatEmailTime(email.lastMessageDate)}
              </Text>
              {email.rationale && (
                <Text style={styles.emailRationale}>{email.rationale}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const formatEmailTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Generating your brief...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Brief</Text>
          {briefData && (
            <Text style={styles.timestamp}>
              Generated {briefData.timestamp.toLocaleTimeString()}
            </Text>
          )}
        </View>

        {briefData && (
          <>
            {renderCalendarSection()}
            {renderEmailSection()}
          </>
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
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: '#888',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#e8f4ff',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  calendarItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  calendarItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
  },
  conflictBadge: {
    fontSize: 12,
    color: '#ff3b30',
    fontWeight: '600',
  },
  calendarTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  calendarLocation: {
    fontSize: 14,
    color: '#666',
  },
  emailItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  emailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  emailTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  importanceIcon: {
    fontSize: 12,
    marginRight: 8,
    marginTop: 2,
  },
  emailSubject: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
    lineHeight: 22,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
    marginTop: 6,
  },
  emailSnippet: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  emailFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emailTime: {
    fontSize: 12,
    color: '#888',
  },
  emailRationale: {
    fontSize: 12,
    color: '#007AFF',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default BriefScreen;