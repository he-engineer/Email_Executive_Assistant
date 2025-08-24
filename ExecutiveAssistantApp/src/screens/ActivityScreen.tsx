import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { ActivityLogEntry } from '../types';
import ActivityLogService from '../services/ActivityLogService';

const ActivityScreen: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | ActivityLogEntry['action']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [stats, setStats] = useState({
    totalActivities: 0,
    briefsGenerated: 0,
    emailsSent: 0,
    emailsSnoozed: 0,
    draftsGenerated: 0,
    activitiesByDay: {} as { [date: string]: number },
  });

  useEffect(() => {
    loadActivities();
    loadStats();
  }, []);

  useEffect(() => {
    filterActivities();
  }, [activities, selectedFilter, searchQuery]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      const activityLog = await ActivityLogService.getActivityLog();
      setActivities(activityLog);
    } catch (error) {
      Alert.alert('Error', 'Failed to load activity log');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const activityStats = await ActivityLogService.getActivityStats(7);
      setStats(activityStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];

    // Filter by action type
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(activity => activity.action === selectedFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.details.toLowerCase().includes(query) ||
        activity.action.toLowerCase().includes(query)
      );
    }

    setFilteredActivities(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadActivities(), loadStats()]);
    setRefreshing(false);
  };

  const handleClearLog = () => {
    Alert.alert(
      'Clear Activity Log',
      'Are you sure you want to clear all activity history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await ActivityLogService.clearActivityLog();
              await loadActivities();
              await loadStats();
              Alert.alert('Success', 'Activity log cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear activity log');
            }
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      const csvData = await ActivityLogService.exportActivityLog();
      if (csvData) {
        // In a real app, you would use a file sharing library here
        Alert.alert(
          'Export Complete',
          `Exported ${activities.length} activities. In a production app, this would save to a file or share via email.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export activity log');
    }
    setShowExportModal(false);
  };

  const formatActivityTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (action: ActivityLogEntry['action']): string => {
    switch (action) {
      case 'brief_generated':
        return '📊';
      case 'email_sent':
        return '📧';
      case 'email_snoozed':
        return '⏰';
      case 'draft_generated':
        return '✏️';
      default:
        return '📝';
    }
  };

  const getActivityLabel = (action: ActivityLogEntry['action']): string => {
    switch (action) {
      case 'brief_generated':
        return 'Brief Generated';
      case 'email_sent':
        return 'Email Sent';
      case 'email_snoozed':
        return 'Email Snoozed';
      case 'draft_generated':
        return 'Draft Generated';
      default:
        return action;
    }
  };

  const renderStatsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>This Week's Activity</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.briefsGenerated}</Text>
          <Text style={styles.statLabel}>Briefs</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.emailsSent}</Text>
          <Text style={styles.statLabel}>Emails Sent</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.draftsGenerated}</Text>
          <Text style={styles.statLabel}>Drafts</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.emailsSnoozed}</Text>
          <Text style={styles.statLabel}>Snoozed</Text>
        </View>
      </View>
    </View>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'all' && styles.selectedFilter]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterText, selectedFilter === 'all' && styles.selectedFilterText]}>
            All
          </Text>
        </TouchableOpacity>
        
        {(['brief_generated', 'email_sent', 'draft_generated', 'email_snoozed'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, selectedFilter === filter && styles.selectedFilter]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[styles.filterText, selectedFilter === filter && styles.selectedFilterText]}>
              {getActivityIcon(filter)} {getActivityLabel(filter)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderActivityItem = (activity: ActivityLogEntry) => (
    <View key={activity.id} style={styles.activityItem}>
      <View style={styles.activityHeader}>
        <View style={styles.activityTitleRow}>
          <Text style={styles.activityIcon}>{getActivityIcon(activity.action)}</Text>
          <View style={styles.activityInfo}>
            <Text style={styles.activityLabel}>{getActivityLabel(activity.action)}</Text>
            <Text style={styles.activityTime}>{formatActivityTime(activity.timestamp)}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.activityDetails}>{activity.details}</Text>
      
      {activity.threadId && (
        <Text style={styles.threadId}>Thread: {activity.threadId.substring(0, 12)}...</Text>
      )}
    </View>
  );

  const renderExportModal = () => (
    <Modal
      visible={showExportModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowExportModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Export Activity Log</Text>
          <Text style={styles.modalText}>
            Export {activities.length} activities to CSV format?
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalExportButton}
              onPress={handleExport}
            >
              <Text style={styles.modalExportText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading activity...</Text>
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
          <Text style={styles.title}>Activity Log</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowExportModal(true)}
            >
              <Text style={styles.headerButtonText}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleClearLog}
            >
              <Text style={styles.headerButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderStatsSection()}

        <View style={styles.section}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search activities..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {renderFilterButtons()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recent Activity ({filteredActivities.length})
          </Text>
          
          {filteredActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery || selectedFilter !== 'all' 
                  ? 'No activities match your filters' 
                  : 'No activities yet'
                }
              </Text>
            </View>
          ) : (
            filteredActivities.map(renderActivityItem)
          )}
        </View>
      </View>

      {renderExportModal()}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: '#e8f4ff',
  },
  headerButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  selectedFilter: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedFilterText: {
    color: '#fff',
  },
  activityItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityHeader: {
    marginBottom: 8,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#888',
  },
  activityDetails: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 32,
    marginBottom: 4,
  },
  threadId: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
    marginLeft: 32,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  modalExportButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalExportText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
});

export default ActivityScreen;