import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

export default function AdminPanelScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsResponse, usersResponse] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
      ]);
      setStats(statsResponse.data);
      setUsers(usersResponse.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Platform Statistics</Text>

          {stats && (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="gift" size={32} color="#22c55e" />
                  <Text style={styles.statNumber}>{stats.totalDonations}</Text>
                  <Text style={styles.statLabel}>Total Donations</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons name="restaurant" size={32} color="#3b82f6" />
                  <Text style={styles.statNumber}>{stats.totalRequests}</Text>
                  <Text style={styles.statLabel}>Food Requests</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons name="people" size={32} color="#f59e0b" />
                  <Text style={styles.statNumber}>{stats.totalUsers}</Text>
                  <Text style={styles.statLabel}>Total Users</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons name="bicycle" size={32} color="#8b5cf6" />
                  <Text style={styles.statNumber}>{stats.activeVolunteers}</Text>
                  <Text style={styles.statLabel}>Volunteers</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Donations by Status</Text>
              <View style={styles.statusCard}>
                {Object.entries(stats.donationsByStatus).map(([status, count]: any) => (
                  <View key={status} style={styles.statusRow}>
                    <View style={styles.statusInfo}>
                      <Ionicons
                        name={
                          status === 'available'
                            ? 'checkmark-circle'
                            : status === 'delivered'
                            ? 'checkmark-done-circle'
                            : 'time'
                        }
                        size={20}
                        color="#666"
                      />
                      <Text style={styles.statusLabel}>{status}</Text>
                    </View>
                    <Text style={styles.statusCount}>{count}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.userToggle}
            onPress={() => setShowUsers(!showUsers)}
          >
            <Text style={styles.userToggleText}>
              {showUsers ? 'Hide' : 'Show'} All Users ({users.length})
            </Text>
            <Ionicons
              name={showUsers ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#22c55e"
            />
          </TouchableOpacity>

          {showUsers && (
            <View style={styles.usersSection}>
              {users.map((user) => (
                <View key={user.id} style={styles.userCard}>
                  <View style={styles.userHeader}>
                    <Ionicons
                      name={
                        user.userType === 'donor'
                          ? 'gift'
                          : user.userType === 'receiver'
                          ? 'hand-left'
                          : user.userType === 'volunteer'
                          ? 'bicycle'
                          : 'shield-checkmark'
                      }
                      size={24}
                      color="#22c55e"
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                    <View style={styles.userTypeBadge}>
                      <Text style={styles.userTypeText}>{user.userType}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  statusCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userToggle: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  usersSection: {
    gap: 12,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  userTypeBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
    textTransform: 'capitalize',
  },
});
