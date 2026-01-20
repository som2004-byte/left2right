import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load user-specific data based on user type
      if (user?.userType === 'admin') {
        const response = await api.get('/admin/stats');
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderDonorHome = () => (
    <View style={styles.content}>
      <View style={styles.welcomeCard}>
        <Ionicons name="gift" size={48} color="#22c55e" />
        <Text style={styles.welcomeTitle}>Welcome, {user?.name}!</Text>
        <Text style={styles.welcomeSubtitle}>
          Thank you for helping reduce food waste
        </Text>
      </View>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/donate')}
        >
          <Ionicons name="add-circle" size={40} color="#22c55e" />
          <Text style={styles.actionTitle}>Donate Food</Text>
          <Text style={styles.actionDesc}>Share surplus food</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/activity')}
        >
          <Ionicons name="time" size={40} color="#3b82f6" />
          <Text style={styles.actionTitle}>My Donations</Text>
          <Text style={styles.actionDesc}>Track your impact</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color="#22c55e" />
        <Text style={styles.infoText}>
          Your donations help feed those in need. Every meal counts!
        </Text>
      </View>
    </View>
  );

  const renderReceiverHome = () => (
    <View style={styles.content}>
      <View style={styles.welcomeCard}>
        <Ionicons name="hand-left" size={48} color="#22c55e" />
        <Text style={styles.welcomeTitle}>Welcome, {user?.name}!</Text>
        <Text style={styles.welcomeSubtitle}>
          Find available food near you
        </Text>
      </View>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/request-food')}
        >
          <Ionicons name="restaurant" size={40} color="#22c55e" />
          <Text style={styles.actionTitle}>Request Food</Text>
          <Text style={styles.actionDesc}>Submit your needs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/browse-donations')}
        >
          <Ionicons name="search" size={40} color="#3b82f6" />
          <Text style={styles.actionTitle}>Browse Food</Text>
          <Text style={styles.actionDesc}>See what's available</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color="#22c55e" />
        <Text style={styles.infoText}>
          Browse available food or submit a request. We'll match you with nearby donations.
        </Text>
      </View>
    </View>
  );

  const renderVolunteerHome = () => (
    <View style={styles.content}>
      <View style={styles.welcomeCard}>
        <Ionicons name="bicycle" size={48} color="#22c55e" />
        <Text style={styles.welcomeTitle}>Welcome, {user?.name}!</Text>
        <Text style={styles.welcomeSubtitle}>
          Help deliver food to those in need
        </Text>
      </View>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/volunteer-pickups')}
        >
          <Ionicons name="map" size={40} color="#22c55e" />
          <Text style={styles.actionTitle}>Find Pickups</Text>
          <Text style={styles.actionDesc}>View nearby donations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/activity')}
        >
          <Ionicons name="checkmark-circle" size={40} color="#3b82f6" />
          <Text style={styles.actionTitle}>My Deliveries</Text>
          <Text style={styles.actionDesc}>Track your pickups</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color="#22c55e" />
        <Text style={styles.infoText}>
          Accept pickups, verify quality, and deliver food safely.
        </Text>
      </View>
    </View>
  );

  const renderAdminHome = () => (
    <View style={styles.content}>
      <View style={styles.welcomeCard}>
        <Ionicons name="shield-checkmark" size={48} color="#22c55e" />
        <Text style={styles.welcomeTitle}>Admin Dashboard</Text>
        <Text style={styles.welcomeSubtitle}>
          Monitor platform activity
        </Text>
      </View>

      {stats && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalDonations}</Text>
            <Text style={styles.statLabel}>Total Donations</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalRequests}</Text>
            <Text style={styles.statLabel}>Food Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.activeVolunteers}</Text>
            <Text style={styles.statLabel}>Active Volunteers</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.adminButton}
        onPress={() => router.push('/admin-panel')}
      >
        <Text style={styles.adminButtonText}>View Full Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {user?.userType === 'donor' && renderDonorHome()}
      {user?.userType === 'receiver' && renderReceiverHome()}
      {user?.userType === 'volunteer' && renderVolunteerHome()}
      {user?.userType === 'admin' && renderAdminHome()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  actionDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
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
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  adminButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
