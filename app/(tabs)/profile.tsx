import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  LogOut,
  Settings,
  CreditCard,
  Users,
  Inbox,
  Globe,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, signOut, isFarrier, isStable, isOwner } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace('/auth/login');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={48} color={Colors.silver} />
            </View>
          </View>
          <Text style={styles.profileName}>{profile?.full_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {profile?.role?.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.accountInfo')}</Text>

          <View style={styles.infoItem}>
            <Mail size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('auth.email')}</Text>
              <Text style={styles.infoValue}>{profile?.email}</Text>
            </View>
          </View>

          {profile?.phone && (
            <View style={styles.infoItem}>
              <Phone size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('profile.phone')}</Text>
                <Text style={styles.infoValue}>{profile.phone}</Text>
              </View>
            </View>
          )}

          {profile?.address && (
            <View style={styles.infoItem}>
              <MapPin size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('profile.address')}</Text>
                <Text style={styles.infoValue}>
                  {profile.address}
                  {profile.city && `, ${profile.city}`}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.quickActions')}</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/profile/language-country')}
          >
            <Globe size={20} color={Colors.silver} />
            <Text style={styles.actionText}>{t('profile.languageRegion')}</Text>
          </TouchableOpacity>

          {isFarrier && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/farrier/price-lists')}
            >
              <CreditCard size={20} color={Colors.silver} />
              <Text style={styles.actionText}>{t('profile.managePriceLists')}</Text>
            </TouchableOpacity>
          )}

          {isOwner && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/horses/invitations')}
            >
              <Inbox size={20} color={Colors.silver} />
              <Text style={styles.actionText}>{t('profile.invitations')}</Text>
            </TouchableOpacity>
          )}

          {!isFarrier && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/horses')}
            >
              <Users size={20} color={Colors.silver} />
              <Text style={styles.actionText}>{t('profile.myHorses')}</Text>
            </TouchableOpacity>
          )}

          {isStable && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/stable/consents')}
            >
              <Users size={20} color={Colors.silver} />
              <Text style={styles.actionText}>{t('profile.manageConsents')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <LogOut size={20} color={Colors.status.error} />
          <Text style={styles.signOutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
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
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#FFF',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.silverLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: Colors.silver,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  roleText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  actionText: {
    fontSize: 16,
    color: '#333',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
});
