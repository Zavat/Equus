import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Navigation, MapPin, Phone, CheckCircle, Route as RouteIcon } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface RouteStop {
  id: string;
  customer_name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  proposed_date: string;
  num_horses: number;
  sequence_order: number;
  status: string;
  distance?: number;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function RouteScreen() {
  const { profile } = useAuth();
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodaysRoute();
  }, [profile]);

  async function loadTodaysRoute() {
    if (!profile) return;

    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('appointments')
        .select(
          `
          id,
          proposed_date,
          num_horses,
          sequence_order,
          status,
          customer:customer_id(
            full_name,
            address,
            city,
            latitude,
            longitude,
            phone
          )
        `
        )
        .eq('farrier_id', profile.id)
        .gte('proposed_date', today.toISOString())
        .lt('proposed_date', tomorrow.toISOString())
        .in('status', ['confirmed', 'in_progress'])
        .order('sequence_order', { ascending: true });

      if (error) throw error;

      const formattedStops: RouteStop[] = (data || []).map((apt: any) => ({
        id: apt.id,
        customer_name: apt.customer?.full_name || 'Unknown',
        address: apt.customer?.address || '',
        city: apt.customer?.city || '',
        latitude: apt.customer?.latitude,
        longitude: apt.customer?.longitude,
        phone: apt.customer?.phone,
        proposed_date: apt.proposed_date,
        num_horses: apt.num_horses,
        sequence_order: apt.sequence_order || 0,
        status: apt.status,
      }));

      const stopsWithDistance = formattedStops.map((stop, index) => {
        if (!stop.latitude || !stop.longitude) {
          return { ...stop, distance: undefined };
        }

        if (index === 0) {
          return { ...stop, distance: 0 };
        }

        const prevStop = formattedStops[index - 1];
        if (!prevStop.latitude || !prevStop.longitude) {
          return { ...stop, distance: undefined };
        }

        const distance = calculateDistance(
          prevStop.latitude,
          prevStop.longitude,
          stop.latitude,
          stop.longitude
        );

        return { ...stop, distance };
      });

      setStops(stopsWithDistance);
    } catch (error) {
      console.error('Error loading route:', error);
    } finally {
      setLoading(false);
    }
  }

  function openRouteInMaps() {
    if (stops.length === 0) {
      Alert.alert('Errore', 'Nessuna tappa disponibile');
      return;
    }

    const validStops = stops.filter((s) => s.latitude && s.longitude);
    if (validStops.length === 0) {
      Alert.alert('Errore', 'Nessun indirizzo disponibile');
      return;
    }

    const waypoints = validStops
      .map((stop) => `${stop.latitude},${stop.longitude}`)
      .join('|');

    const url = `https://www.google.com/maps/dir/?api=1&waypoints=${waypoints}&travelmode=driving`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening Google Maps:', err);
      Alert.alert('Errore', 'Impossibile aprire Google Maps');
    });
  }

  function openInAppleMaps() {
    const validStops = stops.filter((s) => s.latitude && s.longitude);

    let url: string;
    if (validStops.length === 0) {
      url = 'http://maps.apple.com/';
    } else {
      const lastStop = validStops[validStops.length - 1];
      url = `http://maps.apple.com/?daddr=${lastStop.latitude},${lastStop.longitude}&dirflg=d`;
    }

    Linking.openURL(url).catch((err) => {
      console.error('Error opening Apple Maps:', err);
      Alert.alert('Errore', 'Impossibile aprire Apple Maps');
    });
  }

  function openInGoogleMaps() {
    const validStops = stops.filter((s) => s.latitude && s.longitude);

    let url: string;
    if (validStops.length === 0) {
      url = 'https://www.google.com/maps/';
    } else {
      const waypoints = validStops
        .map((stop) => `${stop.latitude},${stop.longitude}`)
        .join('|');
      url = `https://www.google.com/maps/dir/?api=1&waypoints=${waypoints}&travelmode=driving`;
    }

    Linking.openURL(url).catch((err) => {
      console.error('Error opening Google Maps:', err);
      Alert.alert('Errore', 'Impossibile aprire Google Maps');
    });
  }

  function chooseMapsApp() {
    Alert.alert(
      'Apri in Mappe',
      'Quale app vuoi usare?',
      [
        {
          text: 'Apple Maps',
          onPress: openInAppleMaps,
        },
        {
          text: 'Google Maps',
          onPress: openInGoogleMaps,
        },
        {
          text: 'Annulla',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  }

  function callCustomer(phone: string) {
    Linking.openURL(`tel:${phone}`);
  }

  async function markCompleted(stopId: string) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', stopId);

      if (error) throw error;

      setStops((prev) => prev.filter((s) => s.id !== stopId));
    } catch (error) {
      console.error('Error marking stop as completed:', error);
      Alert.alert('Errore', 'Impossibile completare la tappa');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.silver} />
        </View>
      </SafeAreaView>
    );
  }

  if (stops.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Percorso di Oggi</Text>
        </View>
        <View style={styles.centerContent}>
          <MapPin size={48} color="#CCC" />
          <Text style={styles.emptyText}>Nessuna tappa programmata per oggi</Text>
        </View>
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity style={styles.bottomButton} onPress={chooseMapsApp}>
            <MapPin size={24} color="#FFF" />
            <Text style={styles.bottomButtonText}>Apri in Mappe</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Percorso di Oggi</Text>
        <Text style={styles.headerSubtitle}>{stops.length} tappe rimanenti</Text>
      </View>

      <TouchableOpacity style={styles.openMapsHeaderButton} onPress={openRouteInMaps}>
        <Navigation size={20} color="#FFF" />
        <Text style={styles.openMapsText}>Apri Percorso in Google Maps</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {stops.map((stop, index) => (
          <View
            key={stop.id}
            style={[
              styles.stopCard,
              index === 0 && styles.stopCardNext,
            ]}
          >
            <View style={styles.stopHeader}>
              <View style={styles.stopNumberBadge}>
                <Text style={styles.stopNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stopMainInfo}>
                <Text style={styles.stopName}>{stop.customer_name}</Text>
                <Text style={styles.stopAddress}>
                  {stop.address}
                  {stop.city && `, ${stop.city}`}
                </Text>
                <View style={styles.stopMetaRow}>
                  <Text style={styles.stopMeta}>
                    {stop.num_horses} {stop.num_horses === 1 ? 'cavallo' : 'cavalli'}
                  </Text>
                  {stop.distance !== undefined && (
                    <View style={styles.distanceContainer}>
                      <RouteIcon size={12} color="#2196F3" />
                      <Text style={styles.stopDistance}>
                        {stop.distance === 0
                          ? 'Partenza'
                          : `${stop.distance.toFixed(1)} km`}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.stopTimeRow}>
                  <Text style={styles.stopTime}>
                    {new Date(stop.proposed_date).toLocaleTimeString('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.stopActions}>
              {stop.phone && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => callCustomer(stop.phone!)}
                >
                  <Phone size={18} color={Colors.silver} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => markCompleted(stop.id)}
              >
                <CheckCircle size={18} color="#FFF" />
                <Text style={styles.completeButtonText}>Completa</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity style={styles.bottomButton} onPress={chooseMapsApp}>
          <MapPin size={24} color="#FFF" />
          <Text style={styles.bottomButtonText}>Apri in Mappe</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    backgroundColor: Colors.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.dark,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.text.light,
    marginTop: 4,
  },
  openMapsHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.silver,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.light,
    textAlign: 'center',
  },
  stopCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  stopCardNext: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  stopHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  stopNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.silver,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  stopMainInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: 4,
  },
  stopAddress: {
    fontSize: 14,
    color: Colors.text.light,
    marginBottom: 6,
  },
  stopMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopMeta: {
    fontSize: 12,
    color: Colors.text.light,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopDistance: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  stopTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopTime: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.silver,
  },
  stopActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  completeButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  openMapsText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  bottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.silver,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
});
