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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../utils/api';

export default function DonateScreen() {
  const router = useRouter();
  const [foodType, setFoodType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Permission Required', 'Camera and media library permissions are needed');
    }
    if (locationStatus !== 'granted') {
      Alert.alert('Permission Required', 'Location permission is needed');
    }
  };

  React.useEffect(() => {
    requestPermissions();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImagePickerAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
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
    if (!foodType || !quantity || !expiryDate || !location) {
      Alert.alert('Error', 'Please fill in all required fields and capture location');
      return;
    }

    setLoading(true);
    try {
      // Create expiry date (simple date format: YYYY-MM-DD)
      const expiryDateTime = new Date(expiryDate).toISOString();

      await api.post('/donations', {
        foodType,
        quantity: parseInt(quantity),
        description,
        expiryDate: expiryDateTime,
        location,
        image,
      });

      Alert.alert('Success', 'Food donation created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error creating donation:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create donation');
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
        <Text style={styles.headerTitle}>Donate Food</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.label}>Food Type *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Cooked Rice, Vegetables, Bread"
            value={foodType}
            onChangeText={setFoodType}
          />

          <Text style={styles.label}>Quantity (servings) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Number of servings"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional details about the food"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Expiry Date (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            placeholder="2025-01-20"
            value={expiryDate}
            onChangeText={setExpiryDate}
          />

          <Text style={styles.label}>Food Image</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePickerContent}>
                <Ionicons name="camera" size={32} color="#22c55e" />
                <Text style={styles.imagePickerText}>Take or Select Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Location *</Text>
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
              {loading ? 'Creating...' : 'Create Donation'}
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
  imagePicker: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderStyle: 'dashed',
  },
  imagePickerContent: {
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
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
