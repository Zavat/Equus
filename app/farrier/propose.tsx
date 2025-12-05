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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Users, MapPin, ChevronRight } from 'lucide-react-native';

interface Customer {
  id: string;
  full_name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

export default function ProposeAppointmentScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('09:00');
  const [numHorses, setNumHorses] = useState('1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, address, city, latitude, longitude')
        .in('role', ['owner', 'stable'])
        .order('full_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  }

  async function handlePropose() {
    if (!selectedCustomer || !proposedDate || !proposedTime) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    const horses = parseInt(numHorses);
    if (isNaN(horses) || horses < 1) {
      Alert.alert('Invalid Input', 'Please enter a valid number of horses');
      return;
    }

    setLoading(true);

    try {
      const dateTime = new Date(`${proposedDate}T${proposedTime}:00`);

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          farrier_id: profile!.id,
          customer_id: selectedCustomer.id,
          customer_type: 'owner',
          proposed_date: dateTime.toISOString(),
          status: 'proposed',
          num_horses: horses,
          notes,
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      await supabase.from('notifications').insert({
        user_id: selectedCustomer.id,
        type: 'proposal',
        title: 'New Appointment Proposal',
        body: `${profile!.full_name} has proposed an appointment for ${new Date(dateTime).toLocaleDateString()} at ${proposedTime}`,
        data: { appointment_id: appointment.id },
      });

      Alert.alert('Success', 'Appointment proposal sent!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error creating proposal:', error);
      Alert.alert('Error', 'Failed to create proposal. Please try again.');
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
        <Text style={styles.headerTitle}>Propose Appointment</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Customer</Text>
          {selectedCustomer ? (
            <TouchableOpacity
              style={styles.selectedCustomer}
              onPress={() => setSelectedCustomer(null)}
            >
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>
                  {selectedCustomer.full_name}
                </Text>
                <Text style={styles.customerAddress}>
                  {selectedCustomer.address}
                  {selectedCustomer.city && `, ${selectedCustomer.city}`}
                </Text>
              </View>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.customerList}>
              {customers.map((customer) => (
                <TouchableOpacity
                  key={customer.id}
                  style={styles.customerCard}
                  onPress={() => setSelectedCustomer(customer)}
                >
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{customer.full_name}</Text>
                    <Text style={styles.customerAddress}>
                      {customer.address}
                      {customer.city && `, ${customer.city}`}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {selectedCustomer && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date & Time</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={proposedDate}
                  onChangeText={setProposedDate}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  value={proposedTime}
                  onChangeText={setProposedTime}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Number of Horses</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  value={numHorses}
                  onChangeText={setNumHorses}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add any special instructions..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.proposeButton, loading && styles.buttonDisabled]}
              onPress={handlePropose}
              disabled={loading}
            >
              <Text style={styles.proposeButtonText}>
                {loading ? 'Sending Proposal...' : 'Send Proposal'}
              </Text>
            </TouchableOpacity>
          </>
        )}
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
  content: {
    flex: 1,
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
    marginBottom: 12,
  },
  selectedCustomer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  customerList: {
    gap: 12,
  },
  customerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 14,
    color: '#666',
  },
  changeText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  proposeButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#B0C4DE',
  },
  proposeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
