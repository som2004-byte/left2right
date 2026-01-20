import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../utils/api';

export default function BrowseDonationsScreen() {
  const router = useRouter();
  const [donations, setDonations] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    loadLocation();
  }, []);

  useEffect(() => {
    if (location) {
      loadDonations();
    }
  }, [location]);

  const loadLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadDonations = async () => {
    try {
      const params = location
        ? `?latitude=${location.latitude}&longitude=${location.longitude}`
        : '';
      const response = await api.get(`/donations/available${params}`);
      setDonations(response.data);
    } catch (error) {
      console.error('Error loading donations:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDonations();
    setRefreshing(false);
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

  const handleContact = (donation: any) => {
    Alert.alert(
      'Contact Donor',
      `Food: ${donation.foodType}\nDonor: ${donation.donorName}\nQuantity: ${donation.quantity} servings`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Food</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {donations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fast-food-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No donations available</Text>
              <Text style={styles.emptySubtext}>
                Check back later for available food
              </Text>
            </View>
          ) : (
            donations.map((donation) => (
              <View key={donation.id} style={styles.card}>
                {donation.image && (
                  <Image
                    source={{ uri: donation.image }}
                    style={styles.foodImage}
                  />
                )}
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.foodType}>{donation.foodType}</Text>
                    {donation.distance && (
                      <View style={styles.distanceBadge}>
                        <Ionicons name="location" size={12} color="#22c55e" />
                        <Text style={styles.distanceText}>
                          {donation.distance} km
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.donorName}>
                    Donated by: {donation.donorName}
                  </Text>

                  <View style={styles.detailRow}>
                    <Ionicons name="restaurant" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {donation.quantity} servings
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      Expires: {formatDate(donation.expiryDate)}
                    </Text>
                  </View>

                  {donation.location?.address && (
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={16} color="#666" />
                      <Text style={styles.detailText} numberOfLines={2}>
                        {donation.location.address}
                      </Text>
                    </View>
                  )}

                  {donation.description && (
                    <Text style={styles.description}>{donation.description}</Text>
                  )}

                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => handleContact(donation)}
                  >
                    <Ionicons name="call" size={18} color="#fff" />
                    <Text style={styles.contactButtonText}>Contact Donor</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  foodImage: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  donorName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  contactButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
