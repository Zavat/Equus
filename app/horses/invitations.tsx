import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, CheckCircle2, XCircle, Clock } from 'lucide-react-native';

interface Invitation {
  id: string;
  stable_id: string;
  horse_id: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message: string | null;
  expires_at: string;
  created_at: string;
  stable: {
    full_name: string;
    email: string;
  };
  horse: {
    name: string;
  } | null;
}

interface Consent {
  id: string;
  horse_id: string;
  stable_id: string;
  status: 'active' | 'revoked';
  granted_at: string;
  stable: {
    full_name: string;
    email: string;
  };
  horse: {
    name: string;
  };
}

export default function InvitationsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!profile) return;

    setLoading(true);
    try {
      const { data: invitationsData, error: invError } = await supabase
        .from('stable_invitations')
        .select(`
          *,
          stable:profiles!stable_invitations_stable_id_fkey(full_name, email),
          horse:horses(name)
        `)
        .eq('owner_id', profile.id)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });

      if (invError) throw invError;

      const { data: consentsData, error: consError } = await supabase
        .from('stable_consents')
        .select(`
          *,
          stable:profiles!stable_consents_stable_id_fkey(full_name, email),
          horse:horses(name)
        `)
        .eq('owner_id', profile.id)
        .eq('status', 'active')
        .order('granted_at', { ascending: false });

      if (consError) throw consError;

      setInvitations(invitationsData || []);
      setConsents(consentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load invitations and consents');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptInvitation(invitationId: string) {
    setProcessing(invitationId);
    try {
      const { error } = await supabase
        .from('stable_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (error) throw error;

      Alert.alert('Success', 'Invitation accepted!');
      await loadData();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    } finally {
      setProcessing(null);
    }
  }

  async function handleDeclineInvitation(invitationId: string) {
    setProcessing(invitationId);
    try {
      const { error } = await supabase
        .from('stable_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

      if (error) throw error;

      Alert.alert('Success', 'Invitation declined');
      await loadData();
    } catch (error) {
      console.error('Error declining invitation:', error);
      Alert.alert('Error', 'Failed to decline invitation');
    } finally {
      setProcessing(null);
    }
  }

  async function handleRevokeConsent(consentId: string, stableName: string) {
    Alert.alert(
      'Revoke Access',
      `Are you sure you want to revoke access for ${stableName}? They will no longer be able to manage this horse.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setProcessing(consentId);
            try {
              const { error } = await supabase
                .from('stable_consents')
                .update({
                  status: 'revoked',
                  revoked_at: new Date().toISOString()
                })
                .eq('id', consentId);

              if (error) throw error;

              Alert.alert('Success', 'Access revoked');
              await loadData();
            } catch (error) {
              console.error('Error revoking consent:', error);
              Alert.alert('Error', 'Failed to revoke access');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  }

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stable Access</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stable Access</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {pendingInvitations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Invitations</Text>
            <Text style={styles.sectionSubtitle}>
              Stables requesting access to manage your horses
            </Text>

            {pendingInvitations.map((invitation) => (
              <View key={invitation.id} style={styles.invitationCard}>
                <View style={styles.invitationHeader}>
                  <Clock size={20} color="#FF9800" />
                  <Text style={styles.invitationStatus}>Pending</Text>
                </View>

                <Text style={styles.stableName}>{invitation.stable.full_name}</Text>
                <Text style={styles.stableEmail}>{invitation.stable.email}</Text>

                <View style={styles.horseInfo}>
                  <Text style={styles.horseLabel}>
                    {invitation.horse ? `Horse: ${invitation.horse.name}` : 'All your horses'}
                  </Text>
                </View>

                {invitation.message && (
                  <View style={styles.messageBox}>
                    <Text style={styles.messageLabel}>Message:</Text>
                    <Text style={styles.messageText}>{invitation.message}</Text>
                  </View>
                )}

                <View style={styles.invitationActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton]}
                    onPress={() => handleDeclineInvitation(invitation.id)}
                    disabled={processing === invitation.id}
                  >
                    <XCircle size={18} color="#FFF" />
                    <Text style={styles.actionButtonText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAcceptInvitation(invitation.id)}
                    disabled={processing === invitation.id}
                  >
                    <CheckCircle2 size={18} color="#FFF" />
                    <Text style={styles.actionButtonText}>
                      {processing === invitation.id ? 'Processing...' : 'Accept'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Consents</Text>
          <Text style={styles.sectionSubtitle}>
            Stables that currently have access to your horses
          </Text>

          {consents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No active consents. When you accept an invitation, the stable will appear here.
              </Text>
            </View>
          ) : (
            consents.map((consent) => (
              <View key={consent.id} style={styles.consentCard}>
                <View style={styles.consentHeader}>
                  <CheckCircle2 size={20} color="#4CAF50" />
                  <Text style={styles.consentStatus}>Active</Text>
                </View>

                <Text style={styles.stableName}>{consent.stable.full_name}</Text>
                <Text style={styles.stableEmail}>{consent.stable.email}</Text>

                <View style={styles.horseInfo}>
                  <Text style={styles.horseLabel}>Horse: {consent.horse.name}</Text>
                </View>

                <Text style={styles.grantedDate}>
                  Granted: {new Date(consent.granted_at).toLocaleDateString()}
                </Text>

                <TouchableOpacity
                  style={[styles.revokeButton]}
                  onPress={() => handleRevokeConsent(consent.id, consent.stable.full_name)}
                  disabled={processing === consent.id}
                >
                  <Text style={styles.revokeButtonText}>
                    {processing === consent.id ? 'Revoking...' : 'Revoke Access'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  invitationCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  consentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  invitationStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 8,
  },
  consentStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  stableName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stableEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  horseInfo: {
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  horseLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  messageBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  grantedDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  revokeButton: {
    backgroundColor: '#F44336',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  revokeButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
