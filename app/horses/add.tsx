import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';
import { HorseSex } from '@/types/database';
import { uploadImage } from '@/utils/uploadImage';

export default function AddHorseScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<HorseSex | null>(null);
  const [isShod, setIsShod] = useState(true);
  const [workType, setWorkType] = useState<'trim' | 'two_shoes' | 'four_shoes'>('four_shoes');
  const [issues, setIssues] = useState('');
  const [pathologies, setPathologies] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [lastShoeingDate, setLastShoeingDate] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need permission to access your photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need permission to access your camera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  function showImageOptions() {
    Alert.alert('Horse Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function uploadPhoto(horseId: string): Promise<string | null> {
    if (!photoUri) return null;
    setUploading(true);

    try {
      const photoUrl = await uploadImage(photoUri, horseId);
      return photoUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter a name for the horse');
      return;
    }
    if (!sex) {
      Alert.alert('Missing Information', 'Please select the horse\'s sex');
      return;
    }

    setLoading(true);

    try {
      const horseData: any = {
        owner_id: profile!.id,
        name: name.trim(),
        sex,
        is_shod: isShod,
        work_type: workType,
        special_notes: specialNotes.trim(),
      };

      if (breed.trim()) horseData.breed = breed.trim();
      if (dateOfBirth) horseData.date_of_birth = dateOfBirth;
      if (issues.trim()) horseData.issues = issues.trim();
      if (pathologies.trim()) horseData.pathologies = pathologies.trim();
      if (lastShoeingDate) horseData.last_shoeing_date = lastShoeingDate;

      const { data: horse, error: horseError } = await supabase
        .from('horses')
        .insert(horseData)
        .select()
        .single();

      if (horseError) throw horseError;

      if (photoUri) {
        const photoUrl = await uploadPhoto(horse.id);
        if (photoUrl) {
          await supabase
            .from('horses')
            .update({ primary_photo_url: photoUrl })
            .eq('id', horse.id);

          await supabase.from('horse_photos').insert({
            horse_id: horse.id,
            photo_url: photoUrl,
            is_primary: true,
            display_order: 0,
          });
        }
      }

      Alert.alert('Success', 'Horse added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error adding horse:', error);
      Alert.alert('Error', 'Failed to add horse. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Horse</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading || uploading}>
          <Text style={[styles.saveButton, (loading || uploading) && styles.buttonDisabled]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoContainer}
            onPress={showImageOptions}
            disabled={uploading}
          >
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setPhotoUri(null)}
                >
                  <X size={16} color="#FFF" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Camera size={32} color="#007AFF" />
                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter horse name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Breed</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Thoroughbred"
              value={breed}
              onChangeText={setBreed}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sex *</Text>
            <View style={styles.sexSelector}>
              <TouchableOpacity
                style={[styles.sexButton, sex === 'male' && styles.sexButtonActive]}
                onPress={() => setSex('male')}
              >
                <Text style={[styles.sexButtonText, sex === 'male' && styles.sexButtonTextActive]}>
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sexButton, sex === 'female' && styles.sexButtonActive]}
                onPress={() => setSex('female')}
              >
                <Text style={[styles.sexButtonText, sex === 'female' && styles.sexButtonTextActive]}>
                  Female
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sexButton, sex === 'gelding' && styles.sexButtonActive]}
                onPress={() => setSex('gelding')}
              >
                <Text style={[styles.sexButtonText, sex === 'gelding' && styles.sexButtonTextActive]}>
                  Gelding
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shoeing</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.shodSelector}>
              <TouchableOpacity
                style={[styles.shodButton, isShod && styles.shodButtonActive]}
                onPress={() => setIsShod(true)}
              >
                <Text style={[styles.shodButtonText, isShod && styles.shodButtonTextActive]}>
                  Shod
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shodButton, !isShod && styles.shodButtonActive]}
                onPress={() => setIsShod(false)}
              >
                <Text style={[styles.shodButtonText, !isShod && styles.shodButtonTextActive]}>
                  Barefoot
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isShod && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Work Type</Text>
              <View style={styles.workTypeSelector}>
                <TouchableOpacity
                  style={[styles.workTypeButton, workType === 'trim' && styles.workTypeButtonActive]}
                  onPress={() => setWorkType('trim')}
                >
                  <Text style={[styles.workTypeText, workType === 'trim' && styles.workTypeTextActive]}>
                    Trim
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.workTypeButton, workType === 'two_shoes' && styles.workTypeButtonActive]}
                  onPress={() => setWorkType('two_shoes')}
                >
                  <Text style={[styles.workTypeText, workType === 'two_shoes' && styles.workTypeTextActive]}>
                    2 Shoes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.workTypeButton, workType === 'four_shoes' && styles.workTypeButtonActive]}
                  onPress={() => setWorkType('four_shoes')}
                >
                  <Text style={[styles.workTypeText, workType === 'four_shoes' && styles.workTypeTextActive]}>
                    4 Shoes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Shoeing Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={lastShoeingDate}
              onChangeText={setLastShoeingDate}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Issues</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Behavioral or health issues..."
              value={issues}
              onChangeText={setIssues}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pathologies / Medical Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Medical conditions, allergies..."
              value={pathologies}
              onChangeText={setPathologies}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Special Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Leather pads, aluminum shoes, special handling..."
              value={specialNotes}
              onChangeText={setSpecialNotes}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  buttonDisabled: {
    color: '#B0C4DE',
  },
  content: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 24,
    marginBottom: 16,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '600',
  },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F44336',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sexSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  sexButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  sexButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  sexButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sexButtonTextActive: {
    color: '#FFF',
  },
  shodSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  shodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  shodButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  shodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  shodButtonTextActive: {
    color: '#FFF',
  },
  workTypeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  workTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  workTypeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  workTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  workTypeTextActive: {
    color: '#FFF',
  },
});
