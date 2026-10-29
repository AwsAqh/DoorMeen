import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, AppTextInput } from '../components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Spacing, Radius, Typography, Shadow } from '../constants/theme';
import { handleManage } from '../features/queue/handlers';
import { useToast } from '../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageLogin'>;

export default function ManageLoginScreen({ navigation, route }: Props) {
  const { queueId } = route.params;
  const { t } = useTranslation();
  const { showError } = useToast();
  const [password,   setPassword]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onLogin = async () => {
    if (submitting) return;
    if (!password.trim()) {
      showError(t('queue.toast.wrongPassword', 'Wrong password. Please try again.'));
      return;
    }
    setSubmitting(true);
    try {
      const result = await handleManage({ QueueId: queueId, password });
      const token = result?.token ?? result?.Token ?? (typeof result === 'string' ? result : null);
      if (typeof token !== 'string' || !token) {
        throw new Error('Password verification did not return an owner token');
      }
      navigation.replace('OwnerDashboard', { queueId });
    } catch (error) {
      showError(error instanceof Error ? error.message : t('queue.toast.wrongPassword', 'Wrong password. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgPrimary} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.iconWrap}>
            <AppText style={styles.icon}>🔐</AppText>
          </View>
          <AppText style={styles.title}>{t('owner.login', 'Owner Login')}</AppText>
          <AppText style={styles.subtitle}>{queueId}</AppText>

          <View style={styles.fieldWrap}>
            <AppText style={styles.label}>{t('owner.password', 'Queue Password')}</AppText>
            <AppTextInput
              style={[styles.input, { writingDirection: 'ltr', textAlign: 'left' }]}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={onLogin}
            />
          </View>

          <TouchableOpacity style={[styles.btn, submitting && styles.btnDisabled]} onPress={onLogin} disabled={submitting} activeOpacity={0.85}>
            {submitting
              ? <ActivityIndicator size="small" color={Colors.accentContrast} />
              : <AppText style={styles.btnText}>{t('owner.loginBtn', 'Login as Owner')}</AppText>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll:    { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  iconWrap:  { width: 80, height: 80, borderRadius: Radius.full, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg, ...Shadow.glow },
  icon:      { fontSize: 36 },
  title:     { fontSize: Typography.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  subtitle:  { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.xl },
  fieldWrap: { width: '100%', marginBottom: Spacing.lg },
  label:     { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.xs, fontWeight: '500' },
  input:     { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: Typography.base, width: '100%' },
  btn:       { width: '100%', backgroundColor: Colors.accent, borderRadius: Radius.full, paddingVertical: Spacing.md, alignItems: 'center', ...Shadow.glow },
  btnDisabled: { opacity: 0.6 },
  btnText:   { color: Colors.accentContrast, fontWeight: '800', fontSize: Typography.base },
});

