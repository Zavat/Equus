import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from '@/locales/en.json';
import it from '@/locales/it.json';
import de from '@/locales/de.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';

export const SUPPORTED_LANGUAGES = ['en', 'it', 'de', 'es', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  en: { translation: en },
  it: { translation: it },
  de: { translation: de },
  es: { translation: es },
  fr: { translation: fr },
};

export function getDeviceLanguage(): string {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const deviceLocale = locales[0].languageCode;
    if (deviceLocale && SUPPORTED_LANGUAGES.includes(deviceLocale as SupportedLanguage)) {
      return deviceLocale;
    }
    const baseLanguage = deviceLocale?.split('-')[0];
    if (baseLanguage && SUPPORTED_LANGUAGES.includes(baseLanguage as SupportedLanguage)) {
      return baseLanguage;
    }
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export async function changeLanguage(lang: string): Promise<void> {
  const targetLang = SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage) ? lang : 'en';
  await i18n.changeLanguage(targetLang);
}

export function getCurrentLanguage(): string {
  return i18n.language || 'en';
}

export default i18n;
