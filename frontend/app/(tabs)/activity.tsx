import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';

export default function ActivityScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [donations, setDonations] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      if (user?.userType === 'donor' || user?.userType === 'volunteer') {
        const response = await api.get('/donations');
        setDonations(response.data);
      }
      if (user?.userType === 'receiver') {
        const response = await api.get('/requests');
        setRequests(response.data);
      }
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivity();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#22c55e';
      case 'claimed':
      case 'matched':
        return '#3b82f6';
      case 'pickedup':
        return '#f59e0b';
      case 'delivered':
      case 'fulfilled':
        return '#10b981';
      case 'expired':
      case 'cancelled':
        return '#ef4444';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return 'checkmark-circle';
      case 'claimed':
      case 'matched':
        return 'hand-right';
      case 'pickedup':
        return 'car';
      case 'delivered':
      case 'fulfilled':
        return 'checkmark-done-circle';
      default:
        return 'time';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {user?.userType === 'donor' && (
          <View>
            <Text style={styles.sectionTitle}>My Donations</Text>
            {donations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="gift-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No donations yet</Text>
                <Text style={styles.emptySubtext}>
                  Start donating to help those in need
                </Text>
              </View>
            ) : (
              donations.map((donation) => (
                <View key={donation.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                      <Ionicons name="fast-food" size={20} color="#22c55e" />
                      <Text style={styles.cardTitle}>{donation.foodType}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(donation.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>{donation.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDetail}>
                    Quantity: {donation.quantity}
                  </Text>
                  <Text style={styles.cardDetail}>
                    Created: {formatDate(donation.createdAt)}
                  </Text>
                  {donation.description && (
                    <Text style={styles.cardDescription}>
                      {donation.description}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {user?.userType === 'receiver' && (
          <View>
            <Text style={styles.sectionTitle}>My Requests</Text>
            {requests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="hand-left-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No requests yet</Text>
                <Text style={styles.emptySubtext}>
                  Submit a request to find available food
                </Text>
              </View>
            ) : (
              requests.map((request) => (
                <View key={request.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                      <Ionicons name="restaurant" size={20} color="#22c55e" />
                      <Text style={styles.cardTitle}>{request.foodType}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(request.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>{request.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDetail}>
                    Quantity: {request.quantity}
                  </Text>
                  <Text style={styles.cardDetail}>
                    Urgency: {request.urgency}
                  </Text>
                  <Text style={styles.cardDetail}>
                    Created: {formatDate(request.createdAt)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {user?.userType === 'volunteer' && (
          <View>
            <Text style={styles.sectionTitle}>My Deliveries</Text>
            {donations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bicycle-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No deliveries yet</Text>
                <Text style={styles.emptySubtext}>
                  Accept pickups to start helping
                </Text>
              </View>
            ) : (
              donations.map((donation) => (
                <View key={donation.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                      <Ionicons name="fast-food" size={20} color="#22c55e" />
                      <Text style={styles.cardTitle}>{donation.foodType}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(donation.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>{donation.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDetail}>
                    Donor: {donation.donorName}
                  </Text>
                  <Text style={styles.cardDetail}>
                    Quantity: {donation.quantity}
                  </Text>
                  {donation.location?.address && (
                    <Text style={styles.cardDetail}>
                      Location: {donation.location.address}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </View>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
