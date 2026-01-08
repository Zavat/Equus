import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeLanguage, getDeviceLanguage, getCurrentLanguage } from '@/lib/i18n';

const STORAGE_KEYS = {
  LANGUAGE: '@locale_language',
  COUNTRY: '@locale_country',
  USE_DEVICE_LANGUAGE: '@locale_use_device',
};

interface LocaleContextType {
  language: string;
  country: string;
  useDeviceLanguage: boolean;
  setLanguage: (lang: string) => Promise<void>;
  setCountry: (country: string) => Promise<void>;
  setUseDeviceLanguage: (use: boolean) => Promise<void>;
  syncFromProfile: (profileLang: string | null, profileCountry: string | null, profileUseDevice: boolean | null) => Promise<void>;
  isLoaded: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState(getDeviceLanguage());
  const [country, setCountryState] = useState('IT');
  const [useDeviceLanguage, setUseDeviceLanguageState] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadStoredSettings();
  }, []);

  async function loadStoredSettings() {
    try {
      const [storedLang, storedCountry, storedUseDevice] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
        AsyncStorage.getItem(STORAGE_KEYS.COUNTRY),
        AsyncStorage.getItem(STORAGE_KEYS.USE_DEVICE_LANGUAGE),
      ]);

      const useDevice = storedUseDevice === null ? true : storedUseDevice === 'true';
      setUseDeviceLanguageState(useDevice);

      if (storedCountry) {
        setCountryState(storedCountry);
      }

      let langToUse: string;
      if (useDevice) {
        langToUse = getDeviceLanguage();
      } else if (storedLang) {
        langToUse = storedLang;
      } else {
        langToUse = getDeviceLanguage();
      }

      setLanguageState(langToUse);
      await changeLanguage(langToUse);
    } catch (error) {
      console.error('[LocaleContext] Error loading settings:', error);
    } finally {
      setIsLoaded(true);
    }
  }

  const setLanguage = useCallback(async (lang: string) => {
    try {
      setLanguageState(lang);
      await changeLanguage(lang);
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    } catch (error) {
      console.error('[LocaleContext] Error setting language:', error);
    }
  }, []);

  const setCountry = useCallback(async (newCountry: string) => {
    try {
      setCountryState(newCountry);
      await AsyncStorage.setItem(STORAGE_KEYS.COUNTRY, newCountry);
    } catch (error) {
      console.error('[LocaleContext] Error setting country:', error);
    }
  }, []);

  const setUseDeviceLanguage = useCallback(async (use: boolean) => {
    try {
      setUseDeviceLanguageState(use);
      await AsyncStorage.setItem(STORAGE_KEYS.USE_DEVICE_LANGUAGE, String(use));

      if (use) {
        const deviceLang = getDeviceLanguage();
        setLanguageState(deviceLang);
        await changeLanguage(deviceLang);
        await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, deviceLang);
      }
    } catch (error) {
      console.error('[LocaleContext] Error setting useDeviceLanguage:', error);
    }
  }, []);

  const syncFromProfile = useCallback(async (
    profileLang: string | null,
    profileCountry: string | null,
    profileUseDevice: boolean | null
  ) => {
    try {
      const useDevice = profileUseDevice ?? true;
      setUseDeviceLanguageState(useDevice);
      await AsyncStorage.setItem(STORAGE_KEYS.USE_DEVICE_LANGUAGE, String(useDevice));

      if (profileCountry) {
        setCountryState(profileCountry);
        await AsyncStorage.setItem(STORAGE_KEYS.COUNTRY, profileCountry);
      }

      let langToUse: string;
      if (useDevice) {
        langToUse = getDeviceLanguage();
      } else if (profileLang) {
        langToUse = profileLang;
      } else {
        langToUse = getDeviceLanguage();
      }

      setLanguageState(langToUse);
      await changeLanguage(langToUse);
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, langToUse);
    } catch (error) {
      console.error('[LocaleContext] Error syncing from profile:', error);
    }
  }, []);

  const value: LocaleContextType = {
    language,
    country,
    useDeviceLanguage,
    setLanguage,
    setCountry,
    setUseDeviceLanguage,
    syncFromProfile,
    isLoaded,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
