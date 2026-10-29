import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { Colors, Radius, Spacing, Typography, Shadow } from '../constants/theme';

const STORAGE_KEY = 'dm_testing_notice_seen_v1';

export default function TestingWelcomeDialog() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then(value => { if (active) setVisible(value !== 'yes'); }).catch(() => { if (active) setVisible(true); });
    return () => { active = false; };
  }, []);
  const dismiss = async () => {
    setVisible(false);
    try { await AsyncStorage.setItem(STORAGE_KEY, 'yes'); } catch { /* Keep the notice dismissible if storage is unavailable. */ }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <AppText style={styles.badge}>{t('testingNotice.badge')}</AppText>
            <AppText style={styles.title}>{t('testingNotice.title')}</AppText>
            <AppText style={styles.intro}>{t('testingNotice.intro')}</AppText>
            {(['passwordReset', 'sms', 'earlyAccess', 'ownerEmail'] as const).map(key => (
              <View key={key} style={styles.bulletRow}><View style={styles.dot} /><AppText style={styles.bullet}>{t(`testingNotice.${key}`)}</AppText></View>
            ))}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={() => void dismiss()} style={styles.button}>
            <AppText style={styles.buttonText}>{t('testingNotice.continue')}</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,26,44,0.68)', justifyContent: 'center', padding: Spacing.lg },
  card: { maxHeight: '88%', borderRadius: Radius.xl, padding: Spacing.xl, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.md },
  badge: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginBottom: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.highlightBg, color: Colors.accentDark, fontSize: Typography.xs, fontWeight: '800' },
  title: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: '800', marginBottom: Spacing.sm },
  intro: { color: Colors.textSecondary, fontSize: Typography.base, lineHeight: 23, marginBottom: Spacing.base },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.md },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 8, backgroundColor: Colors.accent },
  bullet: { flex: 1, color: Colors.textSecondary, fontSize: Typography.sm, lineHeight: 21 },
  button: { marginTop: Spacing.base, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center', backgroundColor: Colors.accent },
  buttonText: { color: Colors.accentContrast, fontSize: Typography.base, fontWeight: '800' },
});
