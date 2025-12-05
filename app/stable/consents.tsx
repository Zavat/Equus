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
import { Check, X, Clock } from 'lucide-react-native';

interface Consent {
  id: string;
  horse_id: string;
  owner_id: string;
  status: string;
  granted_at: string;
  revoked_at: string | null;
  horse: {
    name: string;
    breed: string | null;
  };
  owner: {
    full_name: string;
    email: string;
  };
}

export default function ConsentsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConsents();
  }, []);

  async function loadConsents() {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('stable_consents')
        .select(
          `
          *,
          horse:horse_id(name, breed),
          owner:owner_id(full_name, email)
        `
        )
        .eq('stable_id', profile.id)
        .order('granted_at', { ascending: false });

      if (error) throw error;
      setConsents(data || []);
    } catch (error) {
      console.error('Error loading consents:', error);
      Alert.alert('Error', 'Failed to load consents');
    } finally {
      setLoading(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'active':
        return <Check size={20} color="#4CAF50" />;
      case 'revoked':
        return <X size={20} color="#F44336" />;
      default:
        return <Clock size={20} color="#FFA500" />;
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'revoked':
        return '#F44336';
      default:
        return '#FFA500';
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Consents</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Consents</Text>
          <Text style={styles.infoText}>
            Horse owners must grant you consent to manage their horses and schedule
            appointments on their behalf. This is required for GDPR compliance.
          </Text>
        </View>

        {consents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No consents yet</Text>
            <Text style={styles.emptySubtext}>
              Horse owners can grant you consent through their app
            </Text>
          </View>
        ) : (
          consents.map((consent) => (
            <View key={consent.id} style={styles.consentCard}>
              <View style={styles.consentHeader}>
                <View style={styles.consentInfo}>
                  <Text style={styles.horseName}>{consent.horse.name}</Text>
                  {consent.horse.breed && (
                    <Text style={styles.horseBreed}>{consent.horse.breed}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(consent.status) },
                  ]}
                >
                  {getStatusIcon(consent.status)}
                  <Text style={styles.statusText}>
                    {consent.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.ownerInfo}>
                <Text style={styles.ownerLabel}>Owner</Text>
                <Text style={styles.ownerName}>{consent.owner.full_name}</Text>
                <Text style={styles.ownerEmail}>{consent.owner.email}</Text>
              </View>

              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>
                  {consent.status === 'active' ? 'Granted' : 'Revoked'}
                </Text>
                <Text style={styles.dateValue}>
                  {new Date(
                    consent.status === 'active'
                      ? consent.granted_at
                      : consent.revoked_at || consent.granted_at
                  ).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
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
  infoCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  consentCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  consentInfo: {
    flex: 1,
  },
  horseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  horseBreed: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  ownerInfo: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    marginBottom: 12,
  },
  ownerLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  ownerEmail: {
    fontSize: 14,
    color: '#666',
  },
  dateInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  dateLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    color: '#333',
  },
});
