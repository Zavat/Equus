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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, User, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface Client {
  id: string;
  full_name: string;
  role: string;
}

interface Horse {
  id: string;
  name: string;
  owner_id: string;
}

export default function CreateAppointmentScreen() {
  const { profile, isFarrier } = useAuth();
  const router = useRouter();
  const { date, hour } = useLocalSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedHorseIds, setSelectedHorseIds] = useState<Set<string>>(new Set());
  const [selectedHour, setSelectedHour] = useState(hour ? String(hour) : '09');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadClientHorses(selectedClientId);
    } else {
      setHorses([]);
      setSelectedHorseIds(new Set());
    }
  }, [selectedClientId]);

  async function loadData() {
    if (!profile) return;

    try {
      setLoadingData(true);

      if (isFarrier) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('role', ['owner', 'stable'])
          .order('full_name');

        if (error) throw error;
        setClients(data || []);
      } else {
        const [farriersResult, horsesResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('role', 'farrier')
            .order('full_name'),
          supabase
            .from('horses')
            .select('id, name, owner_id')
            .eq('owner_id', profile.id)
            .order('name'),
        ]);

        if (farriersResult.error) throw farriersResult.error;
        if (horsesResult.error) throw horsesResult.error;

        setClients(farriersResult.data || []);
        setHorses(horsesResult.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoadingData(false);
    }
  }

  async function loadClientHorses(clientId: string) {
    try {
      const { data, error } = await supabase
        .from('horses')
        .select('id, name, owner_id')
        .eq('owner_id', clientId)
        .order('name');

      if (error) throw error;
      setHorses(data || []);
    } catch (error) {
      console.error('Error loading horses:', error);
    }
  }

  function toggleHorse(horseId: string) {
    setSelectedHorseIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(horseId)) {
        newSet.delete(horseId);
      } else {
        newSet.add(horseId);
      }
      return newSet;
    });
  }

  async function handleSubmit() {
    if (!selectedClientId) {
      Alert.alert('Error', isFarrier ? 'Please select a client' : 'Please select a farrier');
      return;
    }

    if (selectedHorseIds.size === 0) {
      Alert.alert('Error', 'Please select at least one horse');
      return;
    }

    setLoading(true);
    console.log("sono dentro handle");
    try {
      const appointmentDate = new Date(date as string);
      appointmentDate.setHours(parseInt(selectedHour), parseInt(selectedMinute), 0, 0);

      const appointmentData = {
        farrier_id: isFarrier ? profile!.id : selectedClientId,
        customer_id: isFarrier ? selectedClientId : profile!.id,
        customer_type: isFarrier
          ? (clients.find((c) => c.id === selectedClientId)?.role as 'owner' | 'stable')
          : 'owner',
        proposed_date: appointmentDate.toISOString(),
        status: 'proposed',
        num_horses: selectedHorseIds.size,
        notes,
      };

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      const horseLinks = Array.from(selectedHorseIds).map((horseId) => ({
        appointment_id: appointment.id,
        horse_id: horseId,
        work_type: 'four_shoes' as const,
        special_notes: '',
      }));

      const { error: horsesError } = await supabase
        .from('appointment_horses')
        .insert(horseLinks);

      if (horsesError) throw horsesError;

      Alert.alert('Success', 'Appointment created successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  }

  const selectedDate = new Date(date as string);
  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.text.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Appointment</Text>
        <View style={{ width: 24 }} />
      </View>

      {loadingData ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.silver} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date</Text>
            <View style={styles.dateCard}>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <User size={16} color={Colors.text.dark} />{' '}
              {isFarrier ? 'Select Client' : 'Select Farrier'}
            </Text>
            {clients.map((client) => {
              const isSelected = selectedClientId === client.id;
              return (
                <TouchableOpacity
                  key={client.id}
                  style={[styles.clientCard, isSelected && styles.clientCardSelected]}
                  onPress={() => setSelectedClientId(client.id)}
                >
                  <Text style={[styles.clientName, isSelected && styles.clientNameSelected]}>
                    {client.full_name}
                  </Text>
                  {isSelected && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
                </TouchableOpacity>
              );
            })}
          </View>

          {horses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Horses</Text>
              {horses.map((horse) => {
                const isSelected = selectedHorseIds.has(horse.id);
                return (
                  <TouchableOpacity
                    key={horse.id}
                    style={[styles.horseCard, isSelected && styles.horseCardSelected]}
                    onPress={() => toggleHorse(horse.id)}
                  >
                    <Text style={[styles.horseName, isSelected && styles.horseNameSelected]}>
                      {horse.name}
                    </Text>
                    {isSelected && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Clock size={16} color={Colors.text.dark} /> Time
            </Text>
            <View style={styles.timePickerContainer}>
              <TextInput
                style={styles.timeInput}
                value={selectedHour}
                onChangeText={setSelectedHour}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="HH"
              />
              <Text style={styles.timeSeparator}>:</Text>
              <TextInput
                style={styles.timeInput}
                value={selectedMinute}
                onChangeText={setSelectedMinute}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
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
              {loading ? 'Creating...' : 'Create Appointment test'}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: 12,
  },
  dateCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  dateText: {
    fontSize: 16,
    color: Colors.text.dark,
    fontWeight: '600',
  },
  clientCard: {
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
  clientCardSelected: {
    borderColor: Colors.silver,
    backgroundColor: Colors.background.primary,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  clientNameSelected: {
    color: Colors.silver,
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
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  timeInput: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.dark,
    textAlign: 'center',
    width: 80,
    padding: 8,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.dark,
    marginHorizontal: 8,
  },
  notesInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.silver,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
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
});
