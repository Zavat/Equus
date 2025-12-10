import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X, ChevronLeft } from 'lucide-react-native';
import { HorseSex } from '@/types/database';
import { Colors } from '@/constants/colors';
import * as FileSystem from "expo-file-system";

interface HorseData {
  id: string;
  name: string;
  breed: string | null;
  date_of_birth: string | null;
  sex: HorseSex;
  is_shod: boolean;
  work_type: string;
  issues: string | null;
  pathologies: string | null;
  special_notes: string | null;
  last_shoeing_date: string | null;
  primary_photo_url: string | null;
}

export default function HorseDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const router = useRouter();
  const [horse, setHorse] = useState<HorseData | null>(null);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<HorseSex>('male');
  const [isShod, setIsShod] = useState(true);
  const [workType, setWorkType] = useState<'trim' | 'two_shoes' | 'four_shoes'>('four_shoes');
  const [issues, setIssues] = useState('');
  const [pathologies, setPathologies] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [lastShoeingDate, setLastShoeingDate] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadHorse();
  }, [id]);

  async function loadHorse() {
    if (!id || !profile) return;

    try {
      const { data, error } = await supabase
        .from('horses')
        .select('*')
        .eq('id', id)
        .eq('owner_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        Alert.alert('Error', 'Horse not found');
        router.back();
        return;
      }

      setHorse(data);
      setName(data.name);
      setBreed(data.breed || '');
      setDateOfBirth(data.date_of_birth || '');
      setSex(data.sex);
      setIsShod(data.is_shod);
      setWorkType(data.work_type);
      setIssues(data.issues || '');
      setPathologies(data.pathologies || '');
      setSpecialNotes(data.special_notes || '');
      setLastShoeingDate(data.last_shoeing_date || '');
      setPhotoUri(data.primary_photo_url);
    } catch (error) {
      console.error('Error loading horse:', error);
      Alert.alert('Error', 'Failed to load horse details');
    } finally {
      setLoading(false);
    }
  }

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

  async function uploadPhoto(): Promise<string | null> {
  // Se non hai cambiato foto, restituisci quella vecchia
  if (!photoUri || photoUri === horse?.primary_photo_url) {
    return horse?.primary_photo_url || null;
  }

  setUploading(true);

  try {
    // 1. Leggi file come base64
    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 2. Converti base64 → Uint8Array
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    // 3. Estrai estensione
    const fileExt = photoUri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${id}-${Date.now()}.${fileExt}`;
    const filePath = `horses/${fileName}`;

    // 4. Upload su Supabase
    const { error: uploadError } = await supabase.storage
      .from("horses")
      .upload(filePath, array, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 5. Ottieni URL pubblico
    const { data } = supabase.storage
      .from("horses")
      .getPublicUrl(filePath);

    return data.publicUrl;

  } catch (error) {
    console.error("Error uploading photo:", error);
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

    setSaving(true);

    try {
      const photoUrl = await uploadPhoto();

      const updates: any = {
        name: name.trim(),
        sex,
        is_shod: isShod,
        work_type: workType,
        special_notes: specialNotes.trim() || null,
      };

      if (breed.trim()) updates.breed = breed.trim();
      if (dateOfBirth) updates.date_of_birth = dateOfBirth;
      if (issues.trim()) updates.issues = issues.trim();
      if (pathologies.trim()) updates.pathologies = pathologies.trim();
      if (lastShoeingDate) updates.last_shoeing_date = lastShoeingDate;
      if (photoUrl) updates.primary_photo_url = photoUrl;

      const { error } = await supabase
        .from('horses')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      if (photoUrl && photoUrl !== horse?.primary_photo_url) {
        const { data: existingPhoto } = await supabase
          .from('horse_photos')
          .select('id')
          .eq('horse_id', id)
          .eq('is_primary', true)
          .maybeSingle();

        if (existingPhoto) {
          await supabase
            .from('horse_photos')
            .update({ is_primary: false })
            .eq('id', existingPhoto.id);
        }

        await supabase.from('horse_photos').insert({
          horse_id: id as string,
          photo_url: photoUrl,
          is_primary: true,
          display_order: 0,
        });
      }

      Alert.alert('Success', 'Horse details updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error updating horse:', error);
      Alert.alert('Error', 'Failed to update horse details');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.silver} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Horse Details</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving || uploading}>
          <Text style={[styles.saveButton, (saving || uploading) && styles.buttonDisabled]}>
            {saving ? 'Saving...' : 'Save'}
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
                <Camera size={32} color={Colors.silver} />
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
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    padding: 4,
    width: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  saveButton: {
    fontSize: 16,
    color: Colors.silver,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },
  buttonDisabled: {
    color: Colors.text.light,
  },
  content: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 24,
    marginBottom: 8,
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
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: Colors.silver,
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
    backgroundColor: Colors.white,
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.dark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
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
    borderColor: Colors.border.light,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  sexButtonActive: {
    borderColor: Colors.silver,
    backgroundColor: Colors.silver,
  },
  sexButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.light,
  },
  sexButtonTextActive: {
    color: Colors.white,
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
    borderColor: Colors.border.light,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  shodButtonActive: {
    borderColor: Colors.silver,
    backgroundColor: Colors.silver,
  },
  shodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.light,
  },
  shodButtonTextActive: {
    color: Colors.white,
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
    borderColor: Colors.border.light,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  workTypeButtonActive: {
    borderColor: Colors.silver,
    backgroundColor: Colors.silver,
  },
  workTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.light,
  },
  workTypeTextActive: {
    color: Colors.white,
  },
});
