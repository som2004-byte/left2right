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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../utils/api';

export default function VolunteerPickupsScreen() {
  const router = useRouter();
  const [donations, setDonations] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [showQualityCheck, setShowQualityCheck] = useState(false);
  const [qualityForm, setQualityForm] = useState({
    expiryStatus: 'good',
    packagingStatus: 'good',
    smellStatus: 'fresh',
  });

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

  const handleAcceptPickup = async (donationId: string) => {
    Alert.alert(
      'Accept Pickup',
      'Do you want to accept this pickup?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await api.patch(`/donations/${donationId}/status?status=claimed`);
              Alert.alert('Success', 'Pickup accepted! Please proceed to quality check.');
              await loadDonations();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to accept pickup');
            }
          },
        },
      ]
    );
  };

  const handleQualityCheck = (donation: any) => {
    setSelectedDonation(donation);
    setShowQualityCheck(true);
  };

  const submitQualityCheck = async () => {
    try {
      const overallQuality =
        qualityForm.expiryStatus === 'good' &&
        qualityForm.packagingStatus === 'good' &&
        qualityForm.smellStatus === 'fresh'
          ? 'pass'
          : 'fail';

      await api.post('/quality-check', {
        donationId: selectedDonation.id,
        expiryStatus: qualityForm.expiryStatus,
        packagingStatus: qualityForm.packagingStatus,
        smellStatus: qualityForm.smellStatus,
        overallQuality,
        notes: '',
      });

      if (overallQuality === 'pass') {
        Alert.alert('Quality Check Passed', 'Food is good to deliver!');
      } else {
        Alert.alert('Quality Check Failed', 'Food quality is not acceptable.');
      }

      setShowQualityCheck(false);
      await loadDonations();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit quality check');
    }
  };

  const handleDeliver = async (donationId: string) => {
    Alert.alert(
      'Mark as Delivered',
      'Confirm that you have delivered this food?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.patch(`/donations/${donationId}/status?status=delivered`);
              Alert.alert('Success', 'Delivery completed! Thank you for your service.');
              await loadDonations();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Pickups</Text>
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
              <Ionicons name="bicycle-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No pickups available</Text>
              <Text style={styles.emptySubtext}>
                Check back later for delivery opportunities
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
                    Donor: {donation.donorName}
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

                  <View style={styles.actions}>
                    {donation.status === 'available' && (
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAcceptPickup(donation.id)}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Accept Pickup</Text>
                      </TouchableOpacity>
                    )}

                    {donation.status === 'claimed' && (
                      <TouchableOpacity
                        style={styles.qualityButton}
                        onPress={() => handleQualityCheck(donation)}
                      >
                        <Ionicons name="clipboard" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Quality Check</Text>
                      </TouchableOpacity>
                    )}

                    {donation.status === 'pickedup' && (
                      <TouchableOpacity
                        style={styles.deliverButton}
                        onPress={() => handleDeliver(donation.id)}
                      >
                        <Ionicons name="checkmark-done" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Mark Delivered</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showQualityCheck}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQualityCheck(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Quality Check</Text>

            <View style={styles.checkItem}>
              <Text style={styles.checkLabel}>Expiry Status</Text>
              <View style={styles.optionsRow}>
                {['good', 'near_expiry', 'expired'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      qualityForm.expiryStatus === option && styles.optionButtonSelected,
                    ]}
                    onPress={() => setQualityForm({ ...qualityForm, expiryStatus: option })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        qualityForm.expiryStatus === option && styles.optionTextSelected,
                      ]}
                    >
                      {option.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.checkItem}>
              <Text style={styles.checkLabel}>Packaging Status</Text>
              <View style={styles.optionsRow}>
                {['good', 'damaged'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      qualityForm.packagingStatus === option && styles.optionButtonSelected,
                    ]}
                    onPress={() => setQualityForm({ ...qualityForm, packagingStatus: option })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        qualityForm.packagingStatus === option && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.checkItem}>
              <Text style={styles.checkLabel}>Smell Status</Text>
              <View style={styles.optionsRow}>
                {['fresh', 'acceptable', 'bad'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      qualityForm.smellStatus === option && styles.optionButtonSelected,
                    ]}
                    onPress={() => setQualityForm({ ...qualityForm, smellStatus: option })}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        qualityForm.smellStatus === option && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowQualityCheck(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={submitQualityCheck}
              >
                <Text style={styles.modalSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  actions: {
    marginTop: 12,
  },
  acceptButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qualityButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deliverButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  checkItem: {
    marginBottom: 20,
  },
  checkLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  optionButtonSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  optionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSubmitButton: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#22c55e',
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
