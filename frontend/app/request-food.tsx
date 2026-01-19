import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../utils/api';

const URGENCY_LEVELS = [
  { value: 'low', label: 'Low', color: '#3b82f6' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
];

export default function RequestFoodScreen() {
  const router = useRouter();
  const [foodType, setFoodType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location permission is needed');
    }
  };

  const getLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const addressString = address[0]
        ? `${address[0].street || ''}, ${address[0].city || ''}, ${address[0].region || ''}`
        : 'Current Location';

      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: addressString,
      });

      Alert.alert('Success', 'Location captured successfully');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get location');
    }
  };

  const handleSubmit = async () => {
    if (!foodType || !quantity || !location) {
      Alert.alert('Error', 'Please fill in all required fields and capture location');
      return;
    }

    setLoading(true);
    try {
      await api.post('/requests', {
        foodType,
        quantity: parseInt(quantity),
        urgency,
        notes,
        location,
      });

      Alert.alert('Success', 'Food request submitted successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error creating request:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Food</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.label}>Food Type Needed *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Any cooked food, Vegetables, Bread"
            value={foodType}
            onChangeText={setFoodType}
          />

          <Text style={styles.label}>Quantity (servings) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Number of servings needed"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Urgency Level *</Text>
          <View style={styles.urgencyContainer}>
            {URGENCY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.urgencyButton,
                  urgency === level.value && {
                    backgroundColor: level.color,
                    borderColor: level.color,
                  },
                ]}
                onPress={() => setUrgency(level.value)}
              >
                <Text
                  style={[
                    styles.urgencyText,
                    urgency === level.value && styles.urgencyTextSelected,
                  ]}
                >
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Additional Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any specific requirements or dietary restrictions"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Your Location *</Text>
          <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
            <Ionicons name="location" size={20} color="#fff" />
            <Text style={styles.locationButtonText}>
              {location ? 'Location Captured' : 'Capture Current Location'}
            </Text>
          </TouchableOpacity>
          {location && (
            <Text style={styles.locationText}>{location.address}</Text>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  urgencyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  urgencyButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  urgencyTextSelected: {
    color: '#fff',
  },
  locationButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
