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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Wrench, Calendar, MapPin, FileText, User, Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { getSuggestedAppointment } from '@/utils/aiHelpers';

interface Horse {
  id: string;
  name: string;
}

interface Farrier {
  id: string;
  full_name: string;
}

export default function RequestServiceScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [farriers, setFarriers] = useState<Farrier[]>([]);
  const [selectedHorses, setSelectedHorses] = useState<Set<string>>(new Set());
  const [selectedFarrierId, setSelectedFarrierId] = useState<string | null>(null);
  const [preferredDate, setPreferredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [generatingDate, setGeneratingDate] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!profile) return;

    try {
      const [horsesResult, farriersResult, lastFarrierResult] = await Promise.all([
        supabase
          .from('horses')
          .select('id, name')
          .eq('owner_id', profile.id)
          .order('name'),
        supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'farrier')
          .order('full_name'),
        supabase
          .from('appointments')
          .select('farrier_id')
          .eq('customer_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (horsesResult.error) throw horsesResult.error;
      if (farriersResult.error) throw farriersResult.error;

      setHorses(horsesResult.data || []);
      setFarriers(farriersResult.data || []);

      if (lastFarrierResult.data?.farrier_id) {
        setSelectedFarrierId(lastFarrierResult.data.farrier_id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoadingData(false);
    }
  }

  function toggleHorse(horseId: string) {
    setSelectedHorses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(horseId)) {
        newSet.delete(horseId);
      } else {
        newSet.add(horseId);
      }
      return newSet;
    });
  }

  async function handleGenerateSuggestedDate() {
    if (selectedHorses.size === 0) {
      Alert.alert('Error', 'Please select at least one horse first');
      return;
    }

    if (!selectedFarrierId) {
      Alert.alert('Error', 'Please select a farrier first');
      return;
    }

    setGeneratingDate(true);
    try {
      const firstHorseId = Array.from(selectedHorses)[0];
      const suggestion = await getSuggestedAppointment(selectedFarrierId, firstHorseId);

      const dateObj = new Date(`${suggestion.proposed_date}T${suggestion.start_time}`);
      const formattedDate = dateObj.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      setPreferredDate(formattedDate);
      Alert.alert('Data Suggerita', suggestion.reason);
    } catch (error) {
      console.error('Error generating suggested date:', error);
      Alert.alert('Errore', 'Impossibile generare la data suggerita');
    } finally {
      setGeneratingDate(false);
    }
  }

  async function handleSubmit() {
    if (selectedHorses.size === 0) {
      Alert.alert('Error', 'Please select at least one horse');
      return;
    }

    if (!selectedFarrierId) {
      Alert.alert('Error', 'Please select a farrier');
      return;
    }

    if (!preferredDate) {
      Alert.alert('Error', 'Please enter a preferred date');
      return;
    }

    setLoading(true);

    try {
      const selectedFarrier = farriers.find(f => f.id === selectedFarrierId);
      Alert.alert(
        'Service Request',
        `Request submitted for ${selectedHorses.size} horse(s).\n\nFarrier: ${selectedFarrier?.full_name}\nPreferred date: ${preferredDate}\n\nYou will be notified when the farrier responds.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Service</Text>
        <View style={{ width: 60 }} />
      </View>

      {loadingData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.silver} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Wrench size={20} color={Colors.silver} />
              <Text style={styles.sectionTitle}>Service Type</Text>
            </View>
            <View style={styles.serviceCard}>
              <Text style={styles.serviceTitle}>Farrier Service</Text>
              <Text style={styles.serviceDescription}>Horseshoeing and hoof care</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={20} color={Colors.silver} />
              <Text style={styles.sectionTitle}>Select Farrier</Text>
            </View>
            {farriers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No farriers available</Text>
              </View>
            ) : (
              farriers.map((farrier) => {
                const isSelected = selectedFarrierId === farrier.id;
                return (
                  <TouchableOpacity
                    key={farrier.id}
                    style={[styles.farrierCard, isSelected && styles.farrierCardSelected]}
                    onPress={() => setSelectedFarrierId(farrier.id)}
                  >
                    <Text style={[styles.farrierName, isSelected && styles.farrierNameSelected]}>
                      {farrier.full_name}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={Colors.silver} />
            <Text style={styles.sectionTitle}>Select Horses</Text>
          </View>
          {horses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No horses added yet</Text>
              <TouchableOpacity
                style={styles.addHorseButton}
                onPress={() => router.push('/horses/add')}
              >
                <Text style={styles.addHorseButtonText}>Add Horse First</Text>
              </TouchableOpacity>
            </View>
          ) : (
            horses.map((horse) => {
              const isSelected = selectedHorses.has(horse.id);
              return (
                <TouchableOpacity
                  key={horse.id}
                  style={[styles.horseCard, isSelected && styles.horseCardSelected]}
                  onPress={() => toggleHorse(horse.id)}
                >
                  <Text style={[styles.horseName, isSelected && styles.horseNameSelected]}>
                    {horse.name}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={Colors.silver} />
            <Text style={styles.sectionTitle}>Preferred Date</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g., Next week, March 15, ASAP"
            value={preferredDate}
            onChangeText={setPreferredDate}
          />
          <TouchableOpacity
            style={[styles.aiButton, generatingDate && styles.aiButtonDisabled]}
            onPress={handleGenerateSuggestedDate}
            disabled={generatingDate}
          >
            <Sparkles size={16} color={Colors.silver} />
            <Text style={styles.aiButtonText}>
              {generatingDate ? 'Generazione...' : 'Genera data suggerita con AI'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={Colors.silver} />
            <Text style={styles.sectionTitle}>Additional Notes</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any special requirements or information..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    fontSize: 16,
    color: Colors.silver,
    width: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.dark,
  },
  serviceCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.silver,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: Colors.text.light,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.light,
    marginBottom: 16,
  },
  addHorseButton: {
    backgroundColor: Colors.silver,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addHorseButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  horseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  horseCardSelected: {
    borderColor: Colors.silver,
    backgroundColor: Colors.background.primary,
  },
  horseName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  horseNameSelected: {
    color: Colors.silver,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.silver,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.silver,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.light,
    marginTop: 12,
  },
  farrierCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  farrierCardSelected: {
    borderColor: Colors.silver,
    backgroundColor: Colors.background.primary,
  },
  farrierName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  farrierNameSelected: {
    color: Colors.silver,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.silver,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.silver,
  },
});
