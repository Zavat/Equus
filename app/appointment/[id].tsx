import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Calendar,
  User,
  MapPin,
  Check,
  X,
  DollarSign,
  Plus,
  Edit,
} from 'lucide-react-native';
import { ModificationsSheet } from '@/components/ModificationsSheet';

interface AppointmentDetail {
  id: string;
  farrier_id: string;
  customer_id: string;
  proposed_date: string;
  status: string;
  num_horses: number;
  total_price: number | null;
  notes: string;
  farrier: {
    full_name: string;
    phone: string | null;
  };
  customer: {
    full_name: string;
    address: string;
    city: string;
    phone: string | null;
  };
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile, isFarrier } = useAuth();
  const router = useRouter();
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModifications, setShowModifications] = useState(false);

  useEffect(() => {
    loadAppointment();
  }, [id]);

  async function loadAppointment() {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(
          `
          *,
          farrier:farrier_id(full_name, phone),
          customer:customer_id(full_name, address, city, phone)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      setAppointment(data);
    } catch (error) {
      console.error('Error loading appointment:', error);
      Alert.alert('Error', 'Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!appointment) return;

    Alert.alert(
      'Accept Appointment',
      'Are you sure you want to accept this appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('appointments')
                .update({ status: 'accepted', confirmed_date: appointment.proposed_date })
                .eq('id', appointment.id);

              if (error) throw error;

              await supabase.from('notifications').insert({
                user_id: appointment.farrier_id,
                type: 'acceptance',
                title: 'Appointment Accepted',
                body: `${appointment.customer.full_name} accepted your appointment proposal`,
                data: { appointment_id: appointment.id },
              });

              setAppointment({ ...appointment, status: 'accepted' });
              Alert.alert('Success', 'Appointment accepted!');
            } catch (error) {
              console.error('Error accepting appointment:', error);
              Alert.alert('Error', 'Failed to accept appointment');
            }
          },
        },
      ]
    );
  }

  async function handleDecline() {
    if (!appointment) return;

    Alert.alert(
      'Decline Appointment',
      'Are you sure you want to decline this appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('appointments')
                .update({ status: 'declined' })
                .eq('id', appointment.id);

              if (error) throw error;

              await supabase.from('notifications').insert({
                user_id: appointment.farrier_id,
                type: 'proposal',
                title: 'Appointment Declined',
                body: `${appointment.customer.full_name} declined your appointment proposal`,
                data: { appointment_id: appointment.id },
              });

              setAppointment({ ...appointment, status: 'declined' });
              Alert.alert('Success', 'Appointment declined');
            } catch (error) {
              console.error('Error declining appointment:', error);
              Alert.alert('Error', 'Failed to decline appointment');
            }
          },
        },
      ]
    );
  }

  async function handleStartJob() {
    if (!appointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'in_progress' })
        .eq('id', appointment.id);

      if (error) throw error;
      setAppointment({ ...appointment, status: 'in_progress' });
    } catch (error) {
      console.error('Error starting job:', error);
      Alert.alert('Error', 'Failed to start job');
    }
  }

  async function handleCompleteJob() {
    if (!appointment) return;
    setShowModifications(true);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'proposed':
        return '#FFA500';
      case 'accepted':
      case 'confirmed':
        return '#4CAF50';
      case 'in_progress':
        return '#2196F3';
      case 'completed':
        return '#9E9E9E';
      case 'declined':
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  }

  if (loading || !appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canAccept = !isFarrier && appointment.status === 'proposed';
  const canStart = isFarrier && appointment.status === 'accepted';
  const canComplete = isFarrier && appointment.status === 'in_progress';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(appointment.status) },
            ]}
          />
          <Text style={styles.statusText}>
            {appointment.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Calendar size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>
                {new Date(appointment.proposed_date).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <User size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {isFarrier ? 'Customer' : 'Farrier'}
              </Text>
              <Text style={styles.infoValue}>
                {isFarrier
                  ? appointment.customer.full_name
                  : appointment.farrier.full_name}
              </Text>
              {((isFarrier && appointment.customer.phone) ||
                (!isFarrier && appointment.farrier.phone)) && (
                <Text style={styles.infoSubtext}>
                  {isFarrier
                    ? appointment.customer.phone
                    : appointment.farrier.phone}
                </Text>
              )}
            </View>
          </View>

          {isFarrier && (
            <View style={styles.infoRow}>
              <MapPin size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>
                  {appointment.customer.address}
                </Text>
                {appointment.customer.city && (
                  <Text style={styles.infoSubtext}>
                    {appointment.customer.city}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <User size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Number of Horses</Text>
              <Text style={styles.infoValue}>{appointment.num_horses}</Text>
            </View>
          </View>

          {appointment.total_price && (
            <View style={styles.infoRow}>
              <DollarSign size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Total Price</Text>
                <Text style={styles.priceValue}>
                  €{appointment.total_price.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {appointment.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        )}

        {canAccept && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Check size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={handleDecline}
            >
              <X size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {canStart && (
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={handleStartJob}
          >
            <Text style={styles.actionButtonText}>Start Job</Text>
          </TouchableOpacity>
        )}

        {canComplete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={handleCompleteJob}
          >
            <Text style={styles.actionButtonText}>Complete & Add Modifications</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ModificationsSheet
        visible={showModifications}
        appointmentId={appointment.id}
        onClose={() => setShowModifications(false)}
        onComplete={() => {
          setShowModifications(false);
          router.back();
        }}
      />
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
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  infoSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  startButton: {
    backgroundColor: '#2196F3',
    margin: 16,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    margin: 16,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
