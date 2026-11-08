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

  const [barberPhone, setBarberPhone] = useState('');
  const [location, setLocation] = useState('');
  const [metadata, setMetadata] = useState('');
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
      const result = await handleCreate({ name: name.trim(), password, email: email.trim(), barberPhoneNumber: barberPhone.trim() || null, location: location.trim() || null, metadata: metadata.trim() || null });
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
      <FirstTimeGuide guideId="create_queue_pin" delay={500} />
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
            { label: t('popupForm.create.label3',  'Owner Barber Phone'), value: barberPhone, set: setBarberPhone, key: 'barberPhone', placeholder: t('popupForm.create.placeholder3', 'e.g. +1 555 123 4567'), secure: false },
            { label: t('popupForm.create.label4',  'Location'), value: location, set: setLocation, key: 'location', placeholder: t('popupForm.create.placeholder4', 'Street address, city, country'), secure: false },
            { label: t('popupForm.create.label5',  'Queue Metadata'), value: metadata, set: setMetadata, key: 'metadata', placeholder: t('popupForm.create.placeholder5', 'e.g. VIP, Married, 2–3 seats'), secure: false },
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

          <View style={styles.fieldWrap}>
            <AppText style={styles.label}>{t('popupForm.create.label3', 'Owner Barber Phone')}</AppText>
            <AppTextInput
              style={[styles.input, errors.barberPhone ? styles.inputError : null]}
              value={barberPhone}
              onChangeText={setBarberPhone}
              placeholder={t('popupForm.create.placeholder3', 'e.g. +1 555 123 4567')}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="telephoneNumber"
            />
            {errors.barberPhone ? <AppText style={styles.errorText}>{errors.barberPhone}</AppText> : null}
          </View>

          <View style={styles.fieldWrap}>
            <AppText style={styles.label}>{t('popupForm.create.label4', 'Location')}</AppText>
            <AppTextInput
              style={[styles.input, errors.location ? styles.inputError : null]}
              value={location}
              onChangeText={setLocation}
              placeholder={t('popupForm.create.placeholder4', 'Street address, city, country')}
              autoCapitalize="sentences"
              autoCorrect={false}
            />
            {errors.location ? <AppText style={styles.errorText}>{errors.location}</AppText> : null}
          </View>

          <View style={styles.fieldWrap}>
            <AppText style={styles.label}>{t('popupForm.create.label5', 'Queue Metadata')}</AppText>
            <AppTextInput
              style={[styles.input, errors.metadata ? styles.inputError : null]}
              value={metadata}
              onChangeText={setMetadata}
              placeholder={t('popupForm.create.placeholder5', 'e.g. VIP, Married, 2–3 seats')}
              multiline
              textAlignVertical="top"
              maxLength={200}
            />
            {errors.metadata ? <AppText style={styles.errorText}>{errors.metadata}</AppText> : null}
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


