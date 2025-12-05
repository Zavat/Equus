import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Plus, ChevronRight, Calendar } from 'lucide-react-native';
import { getWeeksSince } from '@/utils/dateUtils';

interface Horse {
  id: string;
  name: string;
  breed: string | null;
  age: number | null;
  work_type: string;
  last_shoeing_date: string | null;
  special_notes: string;
}

export default function HorsesScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHorses();
  }, []);

  async function loadHorses() {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('horses')
        .select('*')
        .eq('owner_id', profile.id)
        .order('name');

      if (error) throw error;
      setHorses(data || []);
    } catch (error) {
      console.error('Error loading horses:', error);
      Alert.alert('Error', 'Failed to load horses');
    } finally {
      setLoading(false);
    }
  }

  function getWorkTypeLabel(workType: string): string {
    switch (workType) {
      case 'trim':
        return 'Trim';
      case 'two_shoes':
        return '2 Shoes';
      case 'four_shoes':
        return '4 Shoes';
      default:
        return workType;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Horses</Text>
        <TouchableOpacity onPress={() => router.push('/horses/add')}>
          <Plus size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {horses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No horses added yet</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/horses/add')}
            >
              <Plus size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add Your First Horse</Text>
            </TouchableOpacity>
          </View>
        ) : (
          horses.map((horse) => (
            <TouchableOpacity
              key={horse.id}
              style={styles.horseCard}
              onPress={() => router.push(`/horses/${horse.id}`)}
            >
              <View style={styles.horseInfo}>
                <Text style={styles.horseName}>{horse.name}</Text>
                <View style={styles.horseDetails}>
                  {horse.breed && (
                    <Text style={styles.detailText}>{horse.breed}</Text>
                  )}
                  {horse.age && (
                    <Text style={styles.detailText}>{horse.age} years old</Text>
                  )}
                  <Text style={styles.detailText}>
                    {getWorkTypeLabel(horse.work_type)}
                  </Text>
                </View>
                {horse.last_shoeing_date && (
                  <View style={styles.lastShoeing}>
                    <Calendar size={14} color="#666" />
                    <Text style={styles.lastShoeingText}>
                      Last shoeing: {getWeeksSince(horse.last_shoeing_date)} weeks ago
                    </Text>
                  </View>
                )}
              </View>
              <ChevronRight size={20} color="#999" />
            </TouchableOpacity>
          ))
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
  backButton: {
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
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  horseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  horseInfo: {
    flex: 1,
  },
  horseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  horseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  lastShoeing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastShoeingText: {
    fontSize: 12,
    color: '#666',
  },
});
