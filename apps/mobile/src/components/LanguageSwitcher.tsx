import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigationState } from '@react-navigation/native';
import AppText from './AppText';
import { changeAppLanguage, saveNavigationStateForLanguageReload } from '../i18n/config';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const navigationState = useNavigationState(state => state);
  const [switching, setSwitching] = useState(false);
  const nextLanguage = i18n.language === 'ar' ? 'en' : 'ar';

  const switchLanguage = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      await saveNavigationStateForLanguageReload(navigationState);
      await changeAppLanguage(nextLanguage);
    } catch {
      Alert.alert(t('common.error', 'Something went wrong'), t('language.changeError', 'Could not change the app language.'));
      setSwitching(false);
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t('language.switch', 'Switch language')}
      style={[styles.button, switching && styles.disabled]}
      onPress={switchLanguage}
      disabled={switching}
      activeOpacity={0.75}
    >
      <AppText style={styles.buttonText}>{i18n.language === 'ar' ? 'EN' : 'عربي'}</AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 52,
    minHeight: 38,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderWidth: 1,
    borderColor: Colors.accentDark,
  },
  buttonText: { color: Colors.accentContrast, fontSize: Typography.sm, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
