import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { TimeRange } from '@/utils/dateUtils';
import { Colors } from '@/constants/colors';

interface Appointment {
  id: string;
  proposed_date: string;
  status: string;
  customer_name?: string;
  farrier_name?: string;
  num_horses: number;
  total_price?: number;
}

interface AgendaViewProps {
  appointments: Appointment[];
  loading: boolean;
  onAppointmentPress: (appointment: Appointment) => void;
  emptyMessage?: string;
}

const timeRanges: { key: TimeRange; label: string; primary?: boolean }[] = [
  { key: 'yesterday', label: 'Yesterday', primary: true },
  { key: 'today', label: 'Today', primary: true },
  { key: 'tomorrow', label: 'Tomorrow', primary: true },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export function AgendaView({
  appointments,
  loading,
  onAppointmentPress,
  emptyMessage = 'No appointments scheduled',
}: AgendaViewProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('today');
  const [showAllRanges, setShowAllRanges] = useState(false);

  const visibleRanges = showAllRanges
    ? timeRanges
    : timeRanges.filter((r) => r.primary);

  const getStatusColor = (status: string) => {
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.rangeSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {visibleRanges.map((range) => (
            <TouchableOpacity
              key={range.key}
              style={[
                styles.rangeButton,
                selectedRange === range.key && styles.rangeButtonActive,
              ]}
              onPress={() => setSelectedRange(range.key)}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  selectedRange === range.key && styles.rangeButtonTextActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setShowAllRanges(!showAllRanges)}
          >
            <Calendar size={20} color={Colors.silver} />
            <ChevronRight
              size={16}
              color="#666"
              style={{
                transform: [{ rotate: showAllRanges ? '90deg' : '0deg' }],
              }}
            />
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.appointmentsList}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.centerContent}>
            <Calendar size={48} color={Colors.silverLight} />
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {appointments.map((appointment) => (
              <TouchableOpacity
                key={appointment.id}
                style={styles.appointmentCard}
                onPress={() => onAppointmentPress(appointment)}
              >
                <View style={styles.appointmentHeader}>
                  <View
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(appointment.status) },
                    ]}
                  />
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentCustomer}>
                      {appointment.customer_name || appointment.farrier_name}
                    </Text>
                    <Text style={styles.appointmentDate}>
                      {new Date(appointment.proposed_date).toLocaleString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </Text>
                  </View>
                  <View style={styles.appointmentMeta}>
                    <Text style={styles.metaText}>
                      {appointment.num_horses}{' '}
                      {appointment.num_horses === 1 ? 'horse' : 'horses'}
                    </Text>
                    {appointment.total_price && (
                      <Text style={styles.priceText}>
                        €{appointment.total_price.toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.statusBadge}>
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(appointment.status) },
                    ]}
                  >
                    {appointment.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  rangeSelector: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  rangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F5F5F5',
  },
  rangeButtonActive: {
    backgroundColor: Colors.silver,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  rangeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  rangeButtonTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    gap: 4,
  },
  appointmentsList: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  appointmentDate: {
    fontSize: 14,
    color: '#666',
  },
  appointmentMeta: {
    alignItems: 'flex-end',
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F5F5F5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
