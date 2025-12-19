import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { AgendaView } from '@/components/AgendaView';
import { supabase } from '@/lib/supabase';
import { Plus, Route, Settings, House, Users, Mail, Wrench, Calendar as CalendarIcon } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import * as Calendar from 'expo-calendar';
import { Calendar as RNCalendar } from 'react-native-calendars';

interface AppointmentWithDetails {
  id: string;
  proposed_date: string;
  status: string;
  num_horses: number;
  total_price: number | null;
  customer?: {
    full_name: string;
  };
  farrier?: {
    full_name: string;
  };
}

interface Horse {
  id: string;
  name: string;
  sex: string;
  date_of_birth: string | null;
  is_shod: boolean;
  primary_photo_url: string | null;
}

interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  };
}

export default function HomeScreen() {
  const { profile, isFarrier, isOwner, isStable, signOut } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [farrierMarkedDates, setFarrierMarkedDates] = useState<MarkedDates>({});
  const [farrierSelectedDate, setFarrierSelectedDate] = useState<string>('');

  useEffect(() => {
    if (isFarrier) {
      loadFarrierData();
    } else if (isStable) {
      loadAppointments();
    } else if (isOwner) {
      loadOwnerData();
    }
  }, [profile, isFarrier, isOwner, isStable]);

  async function loadAppointments() {
    if (!profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(
          `
          *,
          customer:customer_id(full_name),
          farrier:farrier_id(full_name)
        `
        )
        .eq('customer_id', profile.id)
        .order('proposed_date', { ascending: true });

      if (error) throw error;

      const formattedAppointments = (data || []).map((apt: any) => ({
        id: apt.id,
        proposed_date: apt.proposed_date,
        status: apt.status,
        num_horses: apt.num_horses,
        total_price: apt.total_price,
        customer_name: apt.customer?.full_name,
        farrier_name: apt.farrier?.full_name,
      }));

      setAppointments(formattedAppointments);

      const marked: MarkedDates = {};
      data?.forEach((apt: any) => {
        const date = apt.scheduled_date || apt.proposed_date;
        if (date) {
          const dateStr = date.split('T')[0];
          marked[dateStr] = {
            marked: true,
            dotColor: Colors.silver,
          };
        }
      });
      setMarkedDates(marked);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFarrierData() {
    if (!profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(
          `
          *,
          customer:customer_id(full_name),
          farrier:farrier_id(full_name)
        `
        )
        .eq('farrier_id', profile.id)
        .order('proposed_date', { ascending: true });

      if (error) throw error;

      const formattedAppointments = (data || []).map((apt: any) => ({
        id: apt.id,
        proposed_date: apt.proposed_date,
        status: apt.status,
        num_horses: apt.num_horses,
        total_price: apt.total_price,
        customer_name: apt.customer?.full_name,
        farrier_name: apt.farrier?.full_name,
      }));

      setAppointments(formattedAppointments);

      const marked: MarkedDates = {};
      data?.forEach((apt: any) => {
        const date = apt.scheduled_date || apt.proposed_date;
        if (date) {
          const dateStr = date.split('T')[0];
          marked[dateStr] = {
            marked: true,
            dotColor: Colors.silver,
          };
        }
      });
      setFarrierMarkedDates(marked);

      await requestCalendarPermissions();
      await syncAppointmentsToDeviceCalendar(data || []);
    } catch (error) {
      console.error('Error loading farrier data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOwnerData() {
    if (!profile) return;

    try {
      setLoading(true);
      const [horsesResult, appointmentsResult] = await Promise.all([
        supabase
          .from('horses')
          .select('id, name, sex, date_of_birth, is_shod, primary_photo_url')
          .eq('owner_id', profile.id)
          .order('name'),
        supabase
          .from('appointments')
          .select('proposed_date, status, scheduled_date')
          .eq('customer_id', profile.id)
      ]);

      if (horsesResult.error) throw horsesResult.error;
      setHorses(horsesResult.data || []);

      if (appointmentsResult.data) {
        const marked: MarkedDates = {};
        appointmentsResult.data.forEach((apt: any) => {
          const date = apt.scheduled_date || apt.proposed_date;
          if (date) {
            const dateStr = date.split('T')[0];
            marked[dateStr] = {
              marked: true,
              dotColor: Colors.silver,
            };
          }
        });
        setMarkedDates(marked);
      }

      await requestCalendarPermissions();
      await syncAppointmentsToDeviceCalendar(appointmentsResult.data || []);
    } catch (error) {
      console.error('Error loading horses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function requestCalendarPermissions() {
    if (Platform.OS === 'web') return;

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const defaultCalendar = calendars.find(
          cal => cal.allowsModifications && cal.source.name === (Platform.OS === 'ios' ? 'iCloud' : 'Google')
        ) || calendars.find(cal => cal.allowsModifications);

        if (defaultCalendar) {
          setCalendarId(defaultCalendar.id);
        }
      }
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
    }
  }

  async function syncAppointmentsToDeviceCalendar(appointments: any[]) {
    if (Platform.OS === 'web' || !calendarId) return;

    try {
      for (const apt of appointments) {
        const date = apt.scheduled_date || apt.proposed_date;
        if (!date) continue;

        const startDate = new Date(date);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

        await Calendar.createEventAsync(calendarId, {
          title: 'Farrier Appointment',
          startDate,
          endDate,
          timeZone: 'UTC',
          notes: `Status: ${apt.status}`,
        });
      }
    } catch (error) {
      console.error('Error syncing to device calendar:', error);
    }
  }

  function onDayPress(day: any) {
    router.push(`/calendar/day-view?date=${day.dateString}`);
  }

  function onFarrierDayPress(day: any) {
    router.push(`/calendar/day-view?date=${day.dateString}`);
  }

  function calculateAge(dateOfBirth: string | null): string {
    if (!dateOfBirth) return 'Unknown';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    return `${age} years`;
  }

  function handleAppointmentPress(appointment: any) {
    router.push(`/appointment/${appointment.id}`);
  }

  function handleHorsePress(horseId: string) {
    router.push(`/horses/${horseId}`);
  }

  if (isFarrier) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.name}>{profile?.full_name}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Settings size={24} color={Colors.silver} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/farrier/propose')}
          >
            <Plus size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Propose Appointment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push('/(tabs)/route')}
          >
            <Route size={20} color={Colors.silver} />
            <Text style={styles.actionButtonTextSecondary}>Today's Route</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Calendar</Text>
            </View>

            <RNCalendar
              style={styles.calendar}
              markedDates={farrierMarkedDates}
              onDayPress={onFarrierDayPress}
              theme={{
                backgroundColor: Colors.white,
                calendarBackground: Colors.white,
                textSectionTitleColor: Colors.text.light,
                selectedDayBackgroundColor: Colors.silver,
                selectedDayTextColor: Colors.white,
                todayTextColor: Colors.silver,
                todayBackgroundColor: 'transparent',
                dayTextColor: Colors.text.dark,
                textDisabledColor: Colors.text.light,
                dotColor: Colors.silver,
                selectedDotColor: Colors.white,
                arrowColor: Colors.silver,
                monthTextColor: Colors.text.dark,
                indicatorColor: Colors.silver,
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontWeight: '400',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 13,
              }}
              enableSwipeMonths
              hideExtraDays={false}
              firstDay={1}
            />
          </View>

          {appointments.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
              </View>
              {appointments.slice(0, 5).map((apt) => (
                <TouchableOpacity
                  key={apt.id}
                  style={styles.appointmentCard}
                  onPress={() => handleAppointmentPress(apt)}
                >
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentCustomer}>{apt.customer_name}</Text>
                    <Text style={styles.appointmentDate}>
                      {new Date(apt.proposed_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.appointmentDetails}>
                    <Text style={styles.appointmentHorses}>{apt.num_horses} horse(s)</Text>
                    <Text style={[styles.appointmentStatus, { color: Colors.silver }]}>
                      {apt.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isStable) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.name}>{profile?.full_name}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Settings size={24} color={Colors.silver} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/horses/add')}
          >
            <Plus size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Add Horse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push('/horses')}
          >
            <House size={20} color={Colors.silver} />
            <Text style={styles.actionButtonTextSecondary}>Horses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push('/stable/consents')}
          >
            <Users size={20} color={Colors.silver} />
            <Text style={styles.actionButtonTextSecondary}>Consents</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Calendar</Text>
            </View>

            <RNCalendar
              style={styles.calendar}
              markedDates={markedDates}
              onDayPress={onDayPress}
              theme={{
                backgroundColor: Colors.white,
                calendarBackground: Colors.white,
                textSectionTitleColor: Colors.text.light,
                selectedDayBackgroundColor: Colors.silver,
                selectedDayTextColor: Colors.white,
                todayTextColor: Colors.silver,
                dayTextColor: Colors.text.dark,
                textDisabledColor: Colors.text.light,
                dotColor: Colors.silver,
                selectedDotColor: Colors.white,
                arrowColor: Colors.silver,
                monthTextColor: Colors.text.dark,
                indicatorColor: Colors.silver,
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontWeight: '400',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 13,
              }}
              enableSwipeMonths
            />
          </View>

          {appointments.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
              </View>
              {appointments.slice(0, 5).map((apt) => (
                <TouchableOpacity
                  key={apt.id}
                  style={styles.appointmentCard}
                  onPress={() => handleAppointmentPress(apt)}
                >
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentCustomer}>{apt.farrier_name}</Text>
                    <Text style={styles.appointmentDate}>
                      {new Date(apt.proposed_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.appointmentDetails}>
                    <Text style={styles.appointmentHorses}>{apt.num_horses} horse(s)</Text>
                    <Text style={[styles.appointmentStatus, { color: Colors.silver }]}>
                      {apt.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.name}>{profile?.full_name}</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Settings size={24} color={Colors.silver} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Horses</Text>
            <TouchableOpacity onPress={() => router.push('/horses/add')}>
              <Plus size={20} color={Colors.silver} />
            </TouchableOpacity>
          </View>

          {horses.length === 0 ? (
            <View style={styles.emptyHorses}>
              <Text style={styles.emptyText}>No horses yet</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/horses/add')}
              >
                <Plus size={16} color={Colors.white} />
                <Text style={styles.addButtonText}>Add Your First Horse</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horsesScroll}>
              {horses.map((horse) => (
                <TouchableOpacity
                  key={horse.id}
                  style={styles.horseCard}
                  onPress={() => handleHorsePress(horse.id)}
                >
                  <View style={styles.horseImageContainer}>
                    {horse.primary_photo_url ? (
                      <Image source={{ uri: horse.primary_photo_url }} style={styles.horseImage} />
                    ) : (
                      <View style={styles.horsePlaceholder}>
                        <Text style={styles.horsePlaceholderText}>{horse.name.charAt(0)}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.horseName}>{horse.name}</Text>
                  <View style={styles.horseDetails}>
                    <Text style={styles.horseDetailText}>{horse.sex}</Text>
                    <Text style={styles.horseDetailText}>•</Text>
                    <Text style={styles.horseDetailText}>{calculateAge(horse.date_of_birth)}</Text>
                  </View>
                  <View style={styles.shodBadge}>
                    <Text style={styles.shodBadgeText}>
                      {horse.is_shod ? 'Shod' : 'Barefoot'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Calendar</Text>
          </View>

          <RNCalendar
            style={styles.calendar}
            markedDates={markedDates}
            onDayPress={onDayPress}
            theme={{
              backgroundColor: Colors.white,
              calendarBackground: Colors.white,
              textSectionTitleColor: Colors.text.light,
              selectedDayBackgroundColor: Colors.silver,
              selectedDayTextColor: Colors.white,
              todayTextColor: Colors.silver,
              dayTextColor: Colors.text.dark,
              textDisabledColor: Colors.text.light,
              dotColor: Colors.silver,
              selectedDotColor: Colors.white,
              arrowColor: Colors.silver,
              monthTextColor: Colors.text.dark,
              indicatorColor: Colors.silver,
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '400',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 13,
            }}
            enableSwipeMonths
          />

          <TouchableOpacity
            style={styles.requestServiceButton}
            onPress={() => router.push('/services/request')}
          >
            <Wrench size={20} color={Colors.white} />
            <Text style={styles.requestServiceButtonText}>Request Service</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  greeting: {
    fontSize: 14,
    color: Colors.text.light,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.dark,
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.silver,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.silver,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    color: Colors.silver,
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: Colors.white,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.dark,
  },
  emptyHorses: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.light,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.silver,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  horsesScroll: {
    marginHorizontal: -4,
  },
  horseCard: {
    width: 160,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  horseImageContainer: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  horseImage: {
    width: '100%',
    height: '100%',
  },
  horsePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.silver,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horsePlaceholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.white,
  },
  horseName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: 4,
  },
  horseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  horseDetailText: {
    fontSize: 12,
    color: Colors.text.light,
  },
  shodBadge: {
    backgroundColor: Colors.silver,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  shodBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
  },
  calendar: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  requestServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.silver,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 8,
  },
  requestServiceButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  appointmentCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  appointmentInfo: {
    marginBottom: 8,
  },
  appointmentCustomer: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: 4,
  },
  appointmentDate: {
    fontSize: 14,
    color: Colors.text.light,
  },
  appointmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentHorses: {
    fontSize: 14,
    color: Colors.text.dark,
  },
  appointmentStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
