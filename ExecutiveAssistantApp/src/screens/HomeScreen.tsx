import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const HomeScreen: React.FC = () => {
  const { user, accounts } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [lastBriefTime, setLastBriefTime] = useState<Date | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Implement refresh logic
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleGetBrief = () => {
    // TODO: Navigate to Brief screen
    setLastBriefTime(new Date());
  };

  const formatLastBriefTime = () => {
    if (!lastBriefTime) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastBriefTime.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    
    return lastBriefTime.toLocaleDateString();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
          </Text>
          <Text style={styles.subtitle}>Ready for your daily brief?</Text>
        </View>

        <TouchableOpacity style={styles.briefButton} onPress={handleGetBrief}>
          <Text style={styles.briefButtonText}>Get Brief</Text>
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Last Brief</Text>
            <Text style={styles.statusValue}>{formatLastBriefTime()}</Text>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Connected Accounts</Text>
            <Text style={styles.statusValue}>{accounts.length}</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Activity Log</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Manage Accounts</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.accountsPreview}>
          <Text style={styles.sectionTitle}>Connected Accounts</Text>
          {accounts.map((account) => (
            <View key={account.id} style={styles.accountItem}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountEmail}>{account.email}</Text>
                {account.isPrimary && (
                  <Text style={styles.primaryBadge}>Primary</Text>
                )}
              </View>
            </View>
          ))}
          
          {accounts.length === 0 && (
            <Text style={styles.noAccountsText}>
              No accounts connected yet
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  briefButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  briefButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  statusItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  quickActions: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  accountsPreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  accountItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountEmail: {
    fontSize: 14,
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
  noAccountsText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default HomeScreen;