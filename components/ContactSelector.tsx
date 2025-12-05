import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Send } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

type Contact = {
  id: string;
  name: string;
  emails?: string[];
  phoneNumbers?: string[];
  isAppUser: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onContactsSelected: (contacts: Contact[]) => void;
};

export default function ContactSelector({ visible, onClose, onContactsSelected }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadContacts();
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredContacts(
        contacts.filter((contact) => contact.name.toLowerCase().includes(query))
      );
    }
  }, [searchQuery, contacts]);

  async function loadContacts() {
    try {
      setLoading(true);

      const { data: contactsData } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
      });

      const allEmails = contactsData
        .flatMap((c) => c.emails?.map((e) => e.email) || [])
        .filter(Boolean);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .in('email', allEmails);

      const appUserEmails = new Set(profiles?.map((p) => p.email) || []);

      const processedContacts: Contact[] = contactsData
        .filter((c) => c.name && (c.emails?.length || c.phoneNumbers?.length))
        .map((c) => ({
          id: c.id || '',
          name: c.name || 'Unknown',
          emails: c.emails?.map((e) => e.email).filter(Boolean),
          phoneNumbers: c.phoneNumbers?.map((p) => p.number).filter(Boolean),
          isAppUser: c.emails?.some((e) => appUserEmails.has(e.email!)) || false,
        }))
        .sort((a, b) => {
          if (a.isAppUser && !b.isAppUser) return -1;
          if (!a.isAppUser && b.isAppUser) return 1;
          return a.name.localeCompare(b.name);
        });

      setContacts(processedContacts);
      setFilteredContacts(processedContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }

  function toggleContact(contactId: string) {
    setSelectedContacts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  }

  function handleDone() {
    const selected = contacts.filter((c) => selectedContacts.has(c.id));
    onContactsSelected(selected);
    setSelectedContacts(new Set());
    setSearchQuery('');
    onClose();
  }

  function renderContact({ item }: { item: Contact }) {
    const isSelected = selectedContacts.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.contactCard, isSelected && styles.contactCardSelected]}
        onPress={() => toggleContact(item.id)}
      >
        <View style={styles.contactInfo}>
          <View style={[styles.contactAvatar, item.isAppUser && styles.contactAvatarAppUser]}>
            <Text style={styles.contactAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.contactDetails}>
            <View style={styles.contactNameRow}>
              <Text style={styles.contactName}>{item.name}</Text>
              {item.isAppUser && (
                <View style={styles.appUserBadge}>
                  <UserPlus size={12} color={Colors.white} />
                  <Text style={styles.appUserBadgeText}>App User</Text>
                </View>
              )}
              {!item.isAppUser && (
                <View style={styles.inviteBadge}>
                  <Send size={12} color={Colors.silver} />
                  <Text style={styles.inviteBadgeText}>Invite</Text>
                </View>
              )}
            </View>
            {item.emails && item.emails.length > 0 && (
              <Text style={styles.contactEmail}>{item.emails[0]}</Text>
            )}
            {item.phoneNumbers && item.phoneNumbers.length > 0 && (
              <Text style={styles.contactPhone}>{item.phoneNumbers[0]}</Text>
            )}
          </View>
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Contacts</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.text.dark} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.text.light} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={Colors.silver} />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : (
          <>
            <View style={styles.infoBar}>
              <Text style={styles.infoText}>
                {filteredContacts.filter((c) => c.isAppUser).length} app users •{' '}
                {filteredContacts.filter((c) => !c.isAppUser).length} to invite
              </Text>
              {selectedContacts.size > 0 && (
                <Text style={styles.selectedCount}>{selectedContacts.size} selected</Text>
              )}
            </View>

            <FlatList
              data={filteredContacts}
              renderItem={renderContact}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
            />

            {selectedContacts.size > 0 && (
              <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                <Text style={styles.doneButtonText}>Done ({selectedContacts.size})</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </Modal>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.dark,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text.dark,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.light,
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.light,
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.silver,
  },
  listContent: {
    padding: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  contactCardSelected: {
    borderColor: Colors.silver,
    borderWidth: 2,
    backgroundColor: '#F8F9FA',
  },
  contactInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarAppUser: {
    backgroundColor: Colors.silver,
  },
  contactAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  contactDetails: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.dark,
    marginRight: 8,
  },
  appUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.silver,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  appUserBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
  },
  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  inviteBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.silver,
  },
  contactEmail: {
    fontSize: 13,
    color: Colors.text.light,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: Colors.text.light,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.silver,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  doneButton: {
    backgroundColor: Colors.silver,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
