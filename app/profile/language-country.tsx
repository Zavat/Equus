import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Globe, MapPin, Check, X, Search } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import {
  LANGUAGES,
  COUNTRIES,
  Language,
  Country,
  getFlagEmoji,
  getLanguageByCode,
  getCountryByCode,
} from '@/constants/languages';

export default function LanguageCountryScreen() {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const { language, country, useDeviceLanguage, setLanguage, setCountry, setUseDeviceLanguage } = useLocale();
  const router = useRouter();

  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [selectedCountry, setSelectedCountry] = useState(country);
  const [useDevice, setUseDevice] = useState(useDeviceLanguage);
  const [saving, setSaving] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile) {
      setSelectedLanguage(profile.language || language);
      setSelectedCountry(profile.country || country);
      setUseDevice(profile.use_device_language ?? useDeviceLanguage);
    }
  }, [profile]);

  const selectedLangObj = getLanguageByCode(selectedLanguage);
  const selectedCountryObj = getCountryByCode(selectedCountry);

  const filteredLanguages = LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleSave() {
    if (!profile) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          language: selectedLanguage,
          country: selectedCountry,
          use_device_language: useDevice,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await setUseDeviceLanguage(useDevice);
      if (!useDevice) {
        await setLanguage(selectedLanguage);
      }
      await setCountry(selectedCountry);
      await refreshProfile();

      Alert.alert(t('common.success'), t('language.settingsUpdated'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert(t('common.error'), t('language.settingsError'));
    } finally {
      setSaving(false);
    }
  }

  function handleSelectLanguage(lang: Language) {
    setSelectedLanguage(lang.code);
    setLanguageModalVisible(false);
    setSearchQuery('');
  }

  function handleSelectCountry(c: Country) {
    setSelectedCountry(c.code);
    setCountryModalVisible(false);
    setSearchQuery('');
  }

  function handleUseDeviceToggle(value: boolean) {
    setUseDevice(value);
  }

  function renderLanguageItem({ item }: { item: Language }) {
    const isSelected = selectedLanguage === item.code;
    return (
      <TouchableOpacity
        style={[styles.listItem, isSelected && styles.listItemSelected]}
        onPress={() => handleSelectLanguage(item)}
      >
        <View style={styles.listItemContent}>
          <Text style={styles.listItemTitle}>{item.nativeName}</Text>
          <Text style={styles.listItemSubtitle}>{item.name}</Text>
        </View>
        {isSelected && <Check size={20} color={Colors.silver} />}
      </TouchableOpacity>
    );
  }

  function renderCountryItem({ item }: { item: Country }) {
    const isSelected = selectedCountry === item.code;
    return (
      <TouchableOpacity
        style={[styles.listItem, isSelected && styles.listItemSelected]}
        onPress={() => handleSelectCountry(item)}
      >
        <View style={styles.listItemContent}>
          <Text style={styles.flagText}>{getFlagEmoji(item.code)}</Text>
          <Text style={styles.listItemTitle}>{item.name}</Text>
        </View>
        {isSelected && <Check size={20} color={Colors.silver} />}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('language.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{t('language.useDeviceLanguage')}</Text>
              <Text style={styles.toggleDesc}>{t('language.useDeviceLanguageDesc')}</Text>
            </View>
            <Switch
              value={useDevice}
              onValueChange={handleUseDeviceToggle}
              trackColor={{ false: '#E0E0E0', true: Colors.silverLight }}
              thumbColor={useDevice ? Colors.silver : '#FFF'}
            />
          </View>
        </View>

        <View style={[styles.section, useDevice && styles.sectionDisabled]}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color={useDevice ? '#CCC' : Colors.silver} />
            <Text style={[styles.sectionTitle, useDevice && styles.textDisabled]}>
              {t('language.language')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.selector, useDevice && styles.selectorDisabled]}
            onPress={() => !useDevice && setLanguageModalVisible(true)}
            disabled={useDevice}
          >
            <Text style={[styles.selectorValue, useDevice && styles.textDisabled]}>
              {selectedLangObj
                ? `${selectedLangObj.nativeName} (${selectedLangObj.name})`
                : t('language.selectLanguage')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={Colors.silver} />
            <Text style={styles.sectionTitle}>{t('language.country')}</Text>
          </View>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setCountryModalVisible(true)}
          >
            <View style={styles.countrySelector}>
              {selectedCountryObj && (
                <Text style={styles.flagText}>{getFlagEmoji(selectedCountryObj.code)}</Text>
              )}
              <Text style={styles.selectorValue}>
                {selectedCountryObj?.name || t('language.selectCountry')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>{t('language.saveChanges')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={languageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('language.selectLanguage')}</Text>
            <TouchableOpacity
              onPress={() => {
                setLanguageModalVisible(false);
                setSearchQuery('');
              }}
              style={styles.closeButton}
            >
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <Search size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('language.searchLanguages')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filteredLanguages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            style={styles.list}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={countryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('language.selectCountry')}</Text>
            <TouchableOpacity
              onPress={() => {
                setCountryModalVisible(false);
                setSearchQuery('');
              }}
              style={styles.closeButton}
            >
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <Search size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('language.searchCountries')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filteredCountries}
            renderItem={renderCountryItem}
            keyExtractor={(item) => item.code}
            style={styles.list}
          />
        </SafeAreaView>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    marginTop: 16,
  },
  sectionDisabled: {
    opacity: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  textDisabled: {
    color: '#999',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  toggleDesc: {
    fontSize: 13,
    color: '#666',
  },
  selector: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectorDisabled: {
    backgroundColor: '#F9F9F9',
    borderColor: '#EEE',
  },
  selectorValue: {
    fontSize: 16,
    color: '#333',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flagText: {
    fontSize: 24,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: Colors.silver,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listItemSelected: {
    backgroundColor: '#F5F5F5',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});
