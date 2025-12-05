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
import { Navigation, MapPin, Phone, CheckCircle, Sparkles } from 'lucide-react-native';
import { getOptimizedRoute, OptimizedRoute } from '@/utils/aiHelpers';

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

export default function RouteScreen() {
  const { profile } = useAuth();
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);

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
        .in('status', ['confirmed', 'in_progress', 'completed'])
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

      const firstIncomplete = formattedStops.findIndex(
        (s) => s.status !== 'completed'
      );
      if (firstIncomplete !== -1) {
        setCurrentStopIndex(firstIncomplete);
      }
    } catch (error) {
      console.error('Error loading route:', error);
    } finally {
      setLoading(false);
    }
  }

  function openGoogleMaps(stop: RouteStop) {
    if (!stop.latitude || !stop.longitude) {
      Alert.alert('Errore', 'Indirizzo non disponibile per questo cliente');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}&travelmode=driving`;
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

      setStops((prev) =>
        prev.map((s) => (s.id === stopId ? { ...s, status: 'completed' } : s))
      );

      if (currentStopIndex < stops.length - 1) {
        setCurrentStopIndex(currentStopIndex + 1);
      }
    } catch (error) {
      console.error('Error marking stop as completed:', error);
    }
  }

  async function handleOptimizeRoute() {
    if (!profile) return;
    if (stops.length === 0) {
      Alert.alert('Nessuna Tappa', 'Non ci sono tappe da ottimizzare per oggi');
      return;
    }

    setOptimizing(true);
    try {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      const result = await getOptimizedRoute(profile.id, dateString);

      setOptimizedRoute(result);

      if (result.steps && result.steps.length > 0) {
        const reorderedStops = result.order.map((idx) => stops[idx]);
        setStops(reorderedStops);

        Alert.alert(
          'Percorso Ottimizzato',
          `Tempo stimato totale: ${result.total_estimated_minutes} minuti\n\nOrdine ottimizzato applicato!`
        );
      }
    } catch (error) {
      console.error('Error optimizing route:', error);
      Alert.alert('Errore', 'Impossibile ottimizzare il percorso');
    } finally {
      setOptimizing(false);
    }
  }

  const currentStop = stops[currentStopIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Percorso di Oggi</Text>
            <Text style={styles.headerSubtitle}>
              {stops.filter((s) => s.status === 'completed').length} di{' '}
              {stops.length} completati
            </Text>
          </View>
          {stops.length > 0 && (
            <TouchableOpacity
              style={[styles.optimizeButton, optimizing && styles.optimizeButtonDisabled]}
              onPress={handleOptimizeRoute}
              disabled={optimizing}
            >
              <Sparkles size={16} color="#007AFF" />
              <Text style={styles.optimizeButtonText}>
                {optimizing ? 'Ottimizzazione...' : 'Ottimizza'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : stops.length === 0 ? (
        <View style={styles.centerContent}>
          <MapPin size={48} color="#CCC" />
          <Text style={styles.emptyText}>Nessuna tappa programmata per oggi</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {currentStop && currentStop.status !== 'completed' && (
            <View style={styles.currentStopCard}>
              <View style={styles.currentStopHeader}>
                <Text style={styles.currentStopLabel}>TAPPA CORRENTE</Text>
                <Text style={styles.currentStopNumber}>
                  #{currentStopIndex + 1}
                </Text>
              </View>
              <Text style={styles.currentStopName}>
                {currentStop.customer_name}
              </Text>
              <Text style={styles.currentStopAddress}>
                {currentStop.address}
                {currentStop.city && `, ${currentStop.city}`}
              </Text>
              <Text style={styles.currentStopMeta}>
                {currentStop.num_horses}{' '}
                {currentStop.num_horses === 1 ? 'cavallo' : 'cavalli'} •{' '}
                {new Date(currentStop.proposed_date).toLocaleTimeString(
                  'it-IT',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )}
              </Text>

              <View style={styles.currentStopActions}>
                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => openGoogleMaps(currentStop)}
                  disabled={!currentStop.latitude || !currentStop.longitude}
                >
                  <Navigation size={20} color="#FFF" />
                  <Text style={styles.navigateButtonText}>Apri su Google Maps</Text>
                </TouchableOpacity>
                {currentStop.phone && (
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => callCustomer(currentStop.phone!)}
                  >
                    <Phone size={20} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => markCompleted(currentStop.id)}
              >
                <CheckCircle size={20} color="#FFF" />
                <Text style={styles.completeButtonText}>Segna come Completato</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Tutte le Tappe</Text>
          <ScrollView style={styles.stopsList}>
            {stops.map((stop, index) => (
              <View
                key={stop.id}
                style={[
                  styles.stopCard,
                  stop.status === 'completed' && styles.stopCardCompleted,
                  index === currentStopIndex && styles.stopCardCurrent,
                ]}
              >
                <View style={styles.stopNumber}>
                  {stop.status === 'completed' ? (
                    <CheckCircle size={20} color="#4CAF50" />
                  ) : (
                    <Text style={styles.stopNumberText}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.stopInfo}>
                  <Text
                    style={[
                      styles.stopName,
                      stop.status === 'completed' && styles.stopNameCompleted,
                    ]}
                  >
                    {stop.customer_name}
                  </Text>
                  <Text style={styles.stopAddress}>
                    {stop.address}
                    {stop.city && `, ${stop.city}`}
                  </Text>
                  <Text style={styles.stopMeta}>
                    {stop.num_horses}{' '}
                    {stop.num_horses === 1 ? 'cavallo' : 'cavalli'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optimizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  optimizeButtonDisabled: {
    opacity: 0.6,
  },
  optimizeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
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
    color: '#999',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  currentStopCard: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  currentStopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentStopLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  currentStopNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  currentStopName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  currentStopAddress: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  currentStopMeta: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  currentStopActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  navigateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  navigateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  callButton: {
    width: 48,
    height: 48,
    backgroundColor: '#FFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  stopsList: {
    flex: 1,
  },
  stopCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    gap: 16,
  },
  stopCardCompleted: {
    opacity: 0.6,
  },
  stopCardCurrent: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  stopNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stopNameCompleted: {
    textDecorationLine: 'line-through',
  },
  stopAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  stopMeta: {
    fontSize: 12,
    color: '#999',
  },
});
