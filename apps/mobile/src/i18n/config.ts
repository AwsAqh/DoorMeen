/**
 * i18n configuration — mirrors apps/web/src/i18n/config.ts
 * Uses AsyncStorage as the language cache instead of localStorage.
 * The same en.json / ar.json locale files are referenced from the shared
 * packages/i18n package (see monorepo workspace plan).
 *
 * RTL is handled per-screen via the `I18nManager` from react-native.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';

// Inline locale imports — swap with shared package once monorepo workspace is set up
import en from './locales/en.json';
import ar from './locales/ar.json';

const LANG_KEY = 'dm_language';

async function getSavedLanguage(): Promise<string> {
  try { return (await AsyncStorage.getItem(LANG_KEY)) ?? 'ar'; }
  catch { return 'ar'; }
}

export async function initI18n() {
  const lng = await getSavedLanguage();

  // Apply RTL layout at app start
  const isRtl = lng === 'ar';
  I18nManager.allowRTL(true);
  I18nManager.swapLeftAndRightInRTL(true);
  if (I18nManager.isRTL !== isRtl) {
    I18nManager.forceRTL(isRtl);
    await reloadAppAsync('Apply saved DoorMeen language direction');
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        ar: { translation: ar },
      },
      lng,
      fallbackLng: 'ar',
      debug: false,
      interpolation: { escapeValue: false },
    });

  i18n.on('languageChanged', async (newLng) => {
    await AsyncStorage.setItem(LANG_KEY, newLng);
  });

  return i18n;
}

export async function changeAppLanguage(language: 'en' | 'ar') {
  if (i18n.language === language) return;

  const shouldRtl = language === 'ar';
  await AsyncStorage.setItem(LANG_KEY, language);
  await i18n.changeLanguage(language);

  if (I18nManager.isRTL !== shouldRtl) {
    I18nManager.allowRTL(true);
    I18nManager.swapLeftAndRightInRTL(true);
    I18nManager.forceRTL(shouldRtl);
    await reloadAppAsync(`Switch DoorMeen to ${language.toUpperCase()}`);
  }
}

export async function saveNavigationStateForLanguageReload(state: unknown) {
  await AsyncStorage.setItem('dm_pending_navigation_state', JSON.stringify(state));
}

export async function takeNavigationStateForLanguageReload() {
  const savedState = await AsyncStorage.getItem('dm_pending_navigation_state');
  if (!savedState) return undefined;
  await AsyncStorage.removeItem('dm_pending_navigation_state');
  try { return JSON.parse(savedState); }
  catch { return undefined; }
}

export default i18n;
