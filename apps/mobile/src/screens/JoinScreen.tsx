import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, AppTextInput } from '../components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Spacing, Radius, Typography, Shadow } from '../constants/theme';
import { handleJoin } from '../features/queue/handlers';
import { apiGetQueuePublic } from '../features/queue/services/api';
import { ApiError } from '../features/queue/services/api';
import { useToast } from '../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'Join'>;

export default function JoinScreen({ navigation, route }: Props) {
  const { queueId, ownerReturn } = route.params;
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();

  const [queueInfo, setQueueInfo] = useState<{ name: string; count: number; capacity: number | null; message: string | null; avgTime: number | null } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [email,   setEmail]   = useState('');
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGetQueuePublic(queueId);
        // Accept both PascalCase (authoritative) and camelCase (fallback)
        const name = data.Name ?? data.name;
        const count = data.Waiters?.length ?? data.waiters?.length ?? data.customers?.length ?? 0;
        const capacity = data.MaxCustomers ?? data.maxCustomers ?? null;
        const message = data.OwnerMessage ?? data.ownerMessage ?? data.message ?? null;
        const avgTime = data.AvgServiceTime ?? data.avgServiceTime ?? null;
        setQueueInfo({ name: typeof name === 'string' ? name : queueId, count, capacity, message, avgTime });
      } catch (e) {
        showError((e as Error).message);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [queueId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())  e.name  = t('validation.nameRequired',  'Name is required');
    if (!/^\d{10}$/.test(phone)) e.phone = t('validation.phoneTenDigits', 'Phone must be 10 digits');
    if (!/\S+@\S+\.\S+/.test(email)) e.email = t('validation.invalidEmail', 'Invalid email address');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (submitting) return;
    if (!validate()) {
      showError(t('queue.toast.validationError', 'Please fix the errors above'));
      return;
    }
    setSubmitting(true);
    try {
      const result = await handleJoin({ QueueId: queueId, Name: name, PhoneNumber: phone, Email: email });
      const customerId = result?.Id ?? result?.id ?? result?.CustomerId ?? result?.customerId;
      if (typeof customerId !== 'number') {
        throw new Error(t('join.submitFailed', 'Could not join the queue. Please try again.'));
      }
      showSuccess(t('queue.joined', 'You joined the queue'));
      if (ownerReturn) navigation.replace('OwnerDashboard', { queueId });
      else navigation.replace('Queue', { queueId });
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 409
        ? t('join.alreadyInQueue', 'You are already in this queue.')
        : (e as Error).message;
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgPrimary} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Queue info banner */}
        <View style={styles.banner}>
          <AppText style={styles.queueName}>{queueInfo?.name ?? queueId}</AppText>
          <AppText style={styles.queueMeta}>
            {queueInfo?.count ?? 0} {t('queue.inQueue', 'in queue')}
            {queueInfo?.capacity ? ` · max ${queueInfo.capacity}` : ''}
          </AppText>
          {queueInfo?.avgTime ? <AppText style={styles.queueMeta}>⏱ ~{queueInfo.avgTime} {t('queue.minEach', 'min per customer')}</AppText> : null}
          {queueInfo?.message ? <AppText style={styles.queueNote}>📝 {queueInfo.message}</AppText> : null}
        </View>

        <AppText style={styles.formTitle}>{t('join.title', 'Join the Queue')}</AppText>

        {/* Name */}
        <View style={styles.fieldWrap}>
          <AppText style={styles.label}>{t('join.name', 'Full Name')}</AppText>
          <AppTextInput
            style={[styles.input, errors.name ? styles.inputError : null]}
            placeholder={t('join.namePlaceholder', 'Your full name')}
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          {errors.name ? <AppText style={styles.errorText}>{errors.name}</AppText> : null}
        </View>

        {/* Phone */}
        <View style={styles.fieldWrap}>
          <AppText style={styles.label}>{t('join.phone', 'Phone Number')}</AppText>
          <AppTextInput
            style={[styles.input, { writingDirection: 'ltr', textAlign: 'left' }, errors.phone ? styles.inputError : null]}
            placeholder="0500000000"
            placeholderTextColor={Colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />
          {errors.phone ? <AppText style={styles.errorText}>{errors.phone}</AppText> : null}
        </View>

        {/* Email */}
        <View style={styles.fieldWrap}>
          <AppText style={styles.label}>{t('join.email', 'Email Address')}</AppText>
          <AppTextInput
            style={[styles.input, { writingDirection: 'ltr', textAlign: 'left' }, errors.email ? styles.inputError : null]}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.email ? <AppText style={styles.errorText}>{errors.email}</AppText> : null}
        </View>

        <TouchableOpacity style={[styles.btn, submitting && styles.btnDisabled]} onPress={onSubmit} disabled={submitting} activeOpacity={0.85}>
          {submitting
            ? <ActivityIndicator size="small" color={Colors.accentContrast} />
            : <AppText style={styles.btnText}>{t('join.submit', 'Join Queue')}</AppText>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bgPrimary },
  center:      { flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  scroll:      { flexGrow: 1, padding: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.xl },

  banner:      { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.accent, ...Shadow.glow },
  queueName:   { fontSize: Typography.lg, fontWeight: '700', color: Colors.accent, marginBottom: Spacing.xs },
  queueMeta:   { fontSize: Typography.sm, color: Colors.textSecondary },
  queueNote:   { fontSize: Typography.sm, color: Colors.textPrimary, marginTop: Spacing.sm, lineHeight: 20 },

  formTitle:   { fontSize: Typography.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.lg },

  fieldWrap:   { marginBottom: Spacing.base },
  label:       { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.xs, fontWeight: '500' },
  input:       { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: Typography.base },
  inputError:  { borderColor: Colors.danger },
  errorText:   { color: Colors.danger, fontSize: Typography.xs, marginTop: Spacing.xs },

  btn:         { backgroundColor: Colors.accent, borderRadius: Radius.full, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.lg, ...Shadow.glow },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: Colors.accentContrast, fontWeight: '800', fontSize: Typography.base },
});

