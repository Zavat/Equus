import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Plus, ChevronLeft } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

interface Appointment {
  id: string;
  proposed_date: string;
  status: string;
  num_horses: number;
  customer?: { full_name: string };
  farrier?: { full_name: string };
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
const HOUR_HEIGHT = 80;

function DraggableAppointment({
  appointment,
  isFarrier,
  onPress,
  onDragEnd,
}: {
  appointment: Appointment;
  isFarrier: boolean;
  onPress: () => void;
  onDragEnd: (newDate: string) => void;
}) {
  const date = new Date(appointment.proposed_date);
  const hour = date.getHours();
  const minutes = date.getMinutes();
  const initialTop = (hour - 6) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;

  const translateY = useSharedValue(0);
  const startY = useSharedValue(initialTop);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startY.value = initialTop + translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      const newTop = startY.value + translateY.value;
      const snappedTop = Math.round(newTop / (HOUR_HEIGHT / 4)) * (HOUR_HEIGHT / 4);
      translateY.value = withSpring(snappedTop - initialTop);

      const hourOffset = Math.floor(snappedTop / HOUR_HEIGHT);
      const minuteOffset = ((snappedTop % HOUR_HEIGHT) / HOUR_HEIGHT) * 60;
      const newHour = 6 + hourOffset;
      const newMinute = Math.round(minuteOffset);

      const newDate = new Date(appointment.proposed_date);
      newDate.setHours(newHour, newMinute, 0, 0);

      runOnJS(onDragEnd)(newDate.toISOString());
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(onPress)();
    });

  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const displayName = isFarrier
    ? appointment.customer?.full_name
    : appointment.farrier?.full_name;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed':
        return '#FFA500';
      case 'accepted':
      case 'confirmed':
        return '#4CAF50';
      case 'completed':
        return '#9E9E9E';
      default:
        return Colors.silver;
    }
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.appointmentBlock,
          {
            top: initialTop,
            backgroundColor: getStatusColor(appointment.status),
          },
          animatedStyle,
        ]}
      >
        <Text style={styles.appointmentTime}>
          {new Date(appointment.proposed_date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <Text style={styles.appointmentName}>{displayName}</Text>
        <Text style={styles.appointmentHorses}>
          {appointment.num_horses} {appointment.num_horses === 1 ? 'horse' : 'horses'}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

export default function DayViewScreen() {
  const { profile, isFarrier } = useAuth();
  const router = useRouter();
  const { date } = useLocalSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDayAppointments();
  }, [date]);

  async function loadDayAppointments() {
    if (!profile || !date) return;

    try {
      setLoading(true);
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);

      const query = supabase
        .from('appointments')
        .select(`
          *,
          customer:customer_id(full_name),
          farrier:farrier_id(full_name)
        `)
        .gte('proposed_date', startOfDay.toISOString())
        .lte('proposed_date', endOfDay.toISOString())
        .order('proposed_date', { ascending: true });

      if (isFarrier) {
        query.eq('farrier_id', profile.id);
      } else {
        query.eq('customer_id', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppointmentDragEnd(appointmentId: string, newDate: string) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ proposed_date: newDate })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, proposed_date: newDate } : apt
        )
      );
    } catch (error) {
      console.error('Error updating appointment:', error);
      Alert.alert('Error', 'Failed to update appointment time');
    }
  }

  function handleLongPress(hour: number) {
    const selectedDate = new Date(date as string);
    selectedDate.setHours(hour, 0, 0, 0);
    router.push(`/calendar/create-appointment?date=${date}&hour=${hour}`);
  }

  function handleAppointmentPress(appointmentId: string) {
    router.push(`/appointment/${appointmentId}`);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text.dark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{formattedDate}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push(`/calendar/create-appointment?date=${date}`)}
        >
          <Plus size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.silver} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.timelineContainer}>
            {HOURS.map((hour) => {
              const longPressGesture = Gesture.LongPress()
                .minDuration(500)
                .onEnd(() => {
                  runOnJS(handleLongPress)(hour);
                });

              return (
                <GestureDetector key={hour} gesture={longPressGesture}>
                  <View style={styles.hourRow}>
                    <View style={styles.hourLabel}>
                      <Text style={styles.hourText}>
                        {hour.toString().padStart(2, '0')}:00
                      </Text>
                    </View>
                    <View style={styles.hourLine} />
                  </View>
                </GestureDetector>
              );
            })}

            {appointments.map((apt) => (
              <DraggableAppointment
                key={apt.id}
                appointment={apt}
                isFarrier={isFarrier}
                onPress={() => handleAppointmentPress(apt.id)}
                onDragEnd={(newDate) => handleAppointmentDragEnd(apt.id, newDate)}
              />
            ))}
          </View>
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
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.dark,
  },
  addButton: {
    backgroundColor: Colors.silver,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 60,
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  hourRow: {
    height: HOUR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabel: {
    position: 'absolute',
    left: -60,
    top: -8,
    width: 50,
  },
  hourText: {
    fontSize: 12,
    color: Colors.text.light,
    fontWeight: '500',
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.light,
  },
  appointmentBlock: {
    position: 'absolute',
    left: 60,
    right: 16,
    height: 70,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentTime: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  appointmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 2,
  },
  appointmentHorses: {
    fontSize: 11,
    color: Colors.white,
    opacity: 0.9,
  },
});
