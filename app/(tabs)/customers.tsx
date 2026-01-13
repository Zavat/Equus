import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Share } from 'react-native';
import { useState, useEffect } from 'react';
import { Users, Plus, Mail, Phone } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import * as Contacts from 'expo-contacts';
import ContactSelector from '@/components/ContactSelector';

type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  total_appointments?: number;
};

export default function CustomersScreen() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContactSelector, setShowContactSelector] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          customer_id,
          profiles!appointments_customer_id_fkey (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('farrier_id', user.id);

      if (error) throw error;

      const customerMap = new Map<string, Customer>();

      data?.forEach((appointment: any) => {
        const profile = appointment.profiles;
        if (profile && profile.id) {
          if (customerMap.has(profile.id)) {
            const existing = customerMap.get(profile.id)!;
            existing.total_appointments = (existing.total_appointments || 0) + 1;
          } else {
            customerMap.set(profile.id, {
              id: profile.id,
              full_name: profile.full_name || 'Unknown',
              email: profile.email,
              phone: profile.phone,
              total_appointments: 1,
            });
          }
        }
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (error: any) {
      console.error('Error loading customers:', error);
      Alert.alert('Error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCustomer() {
    const { status } = await Contacts.requestPermissionsAsync();
    console.log(status !== 'granted');
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your contacts to invite customers.',
        [{ text: 'OK' }]
      );
      return;
    }

    setShowContactSelector(true);
  }

  async function handleContactsSelected(contacts: any[]) {
    const appUsers = contacts.filter((c) => c.isAppUser);
    const nonAppUsers = contacts.filter((c) => !c.isAppUser);

    if (appUsers.length > 0) {
      Alert.alert(
        'Success',
        `Added ${appUsers.length} customer${appUsers.length !== 1 ? 's' : ''} from your contacts!`
      );
      loadCustomers();
    }

    if (nonAppUsers.length > 0) {
      Alert.alert(
        'Send Invites',
        `Would you like to invite ${nonAppUsers.length} contact${nonAppUsers.length !== 1 ? 's' : ''} to use the app?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send Invites', onPress: () => sendInvites(nonAppUsers) },
        ]
      );
    }
  }

  async function sendInvites(contacts: any[]) {
    try {
      const message = `Hey! I use HorseShoer to manage my farrier appointments. Join me on the app!`;

      await Share.share({
        message,
      });
    } catch (error) {
      console.error('Error sending invites:', error);
    }
  }

  function renderCustomer({ item }: { item: Customer }) {
    return (
      <TouchableOpacity style={styles.customerCard}>
        <View style={styles.customerHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.full_name}</Text>
            <View style={styles.contactRow}>
              <Mail size={14} color={Colors.text.light} />
              <Text style={styles.contactText}>{item.email}</Text>
            </View>
            {item.phone && (
              <View style={styles.contactRow}>
                <Phone size={14} color={Colors.text.light} />
                <Text style={styles.contactText}>{item.phone}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.customerStats}>
          <Text style={styles.statsText}>
            {item.total_appointments} appointment{item.total_appointments !== 1 ? 's' : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Customers</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.silver} />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Customers</Text>
        <Text style={styles.subtitle}>{customers.length} total customers</Text>
      </View>

      {customers.length === 0 ? (
        <View style={styles.centerContent}>
          <Users size={64} color={Colors.text.light} />
          <Text style={styles.emptyTitle}>No Customers Yet</Text>
          <Text style={styles.emptyText}>
            Add customers from your contacts or they'll appear here when they book appointments
          </Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          renderItem={renderCustomer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleAddCustomer}>
        <Plus size={28} color={Colors.white} />
      </TouchableOpacity>

      <ContactSelector
        visible={showContactSelector}
        onClose={() => setShowContactSelector(false)}
        onContactsSelected={handleContactsSelected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.light,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.light,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.light,
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    padding: 16,
  },
  customerCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.silver,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.dark,
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: Colors.text.light,
    marginLeft: 6,
  },
  customerStats: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  statsText: {
    fontSize: 14,
    color: Colors.text.light,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.silver,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
