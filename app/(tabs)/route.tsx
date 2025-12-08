import React, { useEffect, useState, useRef } from 'react';
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
  Platform,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Navigation, MapPin, Phone, CheckCircle, Sparkles } from 'lucide-react-native';
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
}

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function RouteScreen() {
  const { profile } = useAuth();
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    loadTodaysRoute();
  }, [profile]);

  useEffect(() => {
    if (selectedStopId && mapRef.current) {
      const stop = stops.find((s) => s.id === selectedStopId);
      if (stop?.latitude && stop?.longitude) {
        mapRef.current.animateToRegion({
          latitude: stop.latitude,
          longitude: stop.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      }
    }
  }, [selectedStopId]);

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

      setStops(formattedStops);

      if (formattedStops.length > 0 && mapRef.current) {
        const validStops = formattedStops.filter((s) => s.latitude && s.longitude);
        if (validStops.length > 0) {
          mapRef.current.fitToCoordinates(
            validStops.map((s) => ({
              latitude: s.latitude!,
              longitude: s.longitude!,
            })),
            {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            }
          );
        }
      }
    } catch (error) {
      console.error('Error loading route:', error);
    } finally {
      setLoading(false);
    }
  }

  function openRouteInMaps() {
    const nextStop = stops.find((s) => s.status !== 'completed');
    if (!nextStop?.latitude || !nextStop?.longitude) {
      Alert.alert('Errore', 'Indirizzo non disponibile per la prossima tappa');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${nextStop.latitude},${nextStop.longitude}&travelmode=driving`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening Google Maps:', err);
      Alert.alert('Errore', 'Impossibile aprire Google Maps');
    });
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

      const remainingStops = stops.filter((s) => s.id !== stopId && s.latitude && s.longitude);
      if (remainingStops.length > 0 && mapRef.current) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(
            remainingStops.map((s) => ({
              latitude: s.latitude!,
              longitude: s.longitude!,
            })),
            {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            }
          );
        }, 300);
      }
    } catch (error) {
      console.error('Error marking stop as completed:', error);
      Alert.alert('Errore', 'Impossibile completare la tappa');
    }
  }

  function handleStopPress(stopId: string) {
    setSelectedStopId(stopId);
  }

  const getMarkerColor = (stop: RouteStop, index: number) => {
    if (index === 0) return '#4CAF50';
    if (selectedStopId === stop.id) return '#007AFF';
    return '#FF5722';
  };

  const initialRegion = stops.length > 0 && stops[0].latitude && stops[0].longitude
    ? {
        latitude: stops[0].latitude,
        longitude: stops[0].longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : {
        latitude: 45.4642,
        longitude: 9.19,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };

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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Percorso di Oggi</Text>
        <Text style={styles.headerSubtitle}>{stops.length} tappe rimanenti</Text>
      </View>

      <View style={styles.dualView}>
        <View style={styles.listContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {stops.map((stop, index) => (
              <TouchableOpacity
                key={stop.id}
                style={[
                  styles.stopCard,
                  selectedStopId === stop.id && styles.stopCardSelected,
                  index === 0 && styles.stopCardNext,
                ]}
                onPress={() => handleStopPress(stop.id)}
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
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.mapContainer}>
          {isWeb ? (
            <View style={styles.webMapPlaceholder}>
              <MapPin size={48} color="#CCC" />
              <Text style={styles.webMapText}>Mappa disponibile su mobile</Text>
            </View>
          ) : (
            <>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                showsUserLocation
                showsMyLocationButton
              >
                {stops.map((stop, index) => {
                  if (!stop.latitude || !stop.longitude) return null;
                  return (
                    <Marker
                      key={stop.id}
                      coordinate={{
                        latitude: stop.latitude,
                        longitude: stop.longitude,
                      }}
                      pinColor={getMarkerColor(stop, index)}
                      onPress={() => setSelectedStopId(stop.id)}
                    >
                      <View style={styles.markerContainer}>
                        <View
                          style={[
                            styles.markerBadge,
                            { backgroundColor: getMarkerColor(stop, index) },
                          ]}
                        >
                          <Text style={styles.markerText}>{index + 1}</Text>
                        </View>
                      </View>
                    </Marker>
                  );
                })}
              </MapView>

              <TouchableOpacity style={styles.openMapsButton} onPress={openRouteInMaps}>
                <Navigation size={20} color="#FFF" />
                <Text style={styles.openMapsText}>Apri percorso in Maps</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
  dualView: {
    flex: 1,
    flexDirection: 'row',
  },
  listContainer: {
    flex: isWeb ? 0.5 : 0.45,
    backgroundColor: Colors.background.primary,
    padding: 16,
  },
  mapContainer: {
    flex: isWeb ? 0.5 : 0.55,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  webMapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    gap: 12,
  },
  webMapText: {
    fontSize: 16,
    color: Colors.text.light,
  },
  stopCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stopCardSelected: {
    borderColor: Colors.silver,
    backgroundColor: '#F0F7FF',
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
  },
  stopMeta: {
    fontSize: 12,
    color: Colors.text.light,
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
  markerContainer: {
    alignItems: 'center',
  },
  markerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  openMapsButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.silver,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  openMapsText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
