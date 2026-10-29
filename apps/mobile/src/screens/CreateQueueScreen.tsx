import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, AppTextInput } from '../components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Spacing, Radius, Typography, Shadow } from '../constants/theme';
import { handleCreate } from '../features/queue/handlers';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateQueue'>;

export default function CreateQueueScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [name,     setName]     = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [email, setEmail] = useState('');
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())           e.name     = t('validation.nameRequired', 'Name is required');
    if (!/^\d{4,6}$/.test(password)) e.password = t('validation.pinFormat', 'PIN must contain 4–6 digits');
    if (password !== confirm)   e.confirm   = t('validation.passwordMismatch', 'Passwords do not match');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = t('validation.invalidEmail', 'Enter a valid email address');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onCreate = async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const result = await handleCreate({ name: name.trim(), password, email: email.trim() });
      Alert.alert(
        t('create.success', 'Queue Created!'),
        `${t('create.yourId', 'Your Queue ID:')} ${result?.QueueId ?? result?.id ?? ''}`,
        [{ text: t('common.ok', 'OK'), onPress: () => navigation.replace('Home') }]
      );
    } catch (e) {
      Alert.alert(t('common.error'), (e as Error).message);
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
            <AppText style={styles.icon}>➕</AppText>
          </View>
          <AppText style={styles.title}>{t('popupForm.create.title', 'Create a Queue')}</AppText>
          <AppText style={styles.subtitle}>{t('popupForm.create.subTitle', 'Set a name and a 4–6 digit PIN for your queue.')}</AppText>

          {[
            { label: t('popupForm.create.label1', 'Queue Name'), value: name,     set: setName,     key: 'name',     placeholder: t('popupForm.create.placeholder1', 'Enter queue name'), secure: false },
            { label: t('popupForm.create.label2',  'Owner PIN'),   value: password, set: setPassword, key: 'password', placeholder: t('popupForm.create.placeholder2', '4–6 digits'), secure: true },
            { label: t('popupForm.create.confirmLabel', 'Confirm PIN'), value: confirm, set: setConfirm, key: 'confirm', placeholder: t('popupForm.create.confirmPlaceholder', 'Enter PIN again'), secure: true },
          ].map(({ label, value, set, key, placeholder, secure }) => (
            <View key={key} style={styles.fieldWrap}>
              <AppText style={styles.label}>{label}</AppText>
              <AppTextInput
                style={[styles.input, (key === 'password' || key === 'confirm') && { writingDirection: 'ltr', textAlign: 'left' }, errors[key] ? styles.inputError : null]}
                value={value}
                onChangeText={set}
                placeholder={placeholder}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={secure}
                keyboardType={secure ? 'number-pad' : 'default'}
                maxLength={secure ? 6 : undefined}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors[key] ? <AppText style={styles.errorText}>{errors[key]}</AppText> : null}
            </View>
          ))}

          <View style={styles.fieldWrap}>
            <AppText style={styles.label}>{t('popupForm.create.labelEmail', 'Owner email')}</AppText>
            <AppTextInput
              style={[styles.input, { writingDirection: 'ltr', textAlign: 'left' }, errors.email ? styles.inputError : null]}
              value={email}
              onChangeText={setEmail}
              placeholder={t('popupForm.create.placeholderEmail', 'you@example.com')}
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />
            {errors.email ? <AppText style={styles.errorText}>{errors.email}</AppText> : null}
          </View>

          <TouchableOpacity style={[styles.btn, submitting && styles.btnDisabled]} onPress={onCreate} disabled={submitting} activeOpacity={0.85}>
            {submitting
              ? <ActivityIndicator size="small" color={Colors.accentContrast} />
              : <AppText style={styles.btnText}>{t('popupForm.create.action', 'Create Queue')}</AppText>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll:      { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  iconWrap:    { width: 60, height: 60, borderRadius: Radius.xl, backgroundColor: Colors.surfaceHover, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, ...Shadow.sm },
  icon:        { fontSize: 28, color: Colors.accent },
  title:       { fontSize: Typography.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  subtitle:    { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 22 },
  fieldWrap:   { width: '100%', marginBottom: Spacing.base },
  label:       { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.xs, fontWeight: '500' },
  input:       { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: Typography.base, width: '100%' },
  inputError:  { borderColor: Colors.danger },
  errorText:   { color: Colors.danger, fontSize: Typography.xs, marginTop: Spacing.xs },
  btn:         { width: '100%', backgroundColor: Colors.accent, borderRadius: Radius.full, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.lg, ...Shadow.glow },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: Colors.accentContrast, fontWeight: '800', fontSize: Typography.base },
});

