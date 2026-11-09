import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, FlatList,
  StatusBar, ActivityIndicator, Alert, RefreshControl,
  Modal, ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, AppTextInput } from '../components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Spacing, Radius, Typography, Shadow } from '../constants/theme';
import { useOwnerSession, isTokenValid } from '../hooks/useOwnerSession';
import { useQueueSignalR } from '../hooks/useQueueSignalR';
import { Status, RANK, getStatusI18nKey } from '../constants/status';
import {
  apiGetOwnerQueue,
  apiChangeQueuePassword,
  apiServeCustomer,
  apiUpdateCustomerStatus,
  apiRevertCustomerToWaiting,
  apiUpdateOwnerMessage,
  apiUpdateAvgServiceTime,
  apiUpdateMaxCustomers,
  apiUpdateQueueName,
  apiUpdateClosingTime,
  apiUpdateBarberPhoneNumber,
  apiUpdateLocation,
  apiUpdateMetadata,
  getOwnerToken,
  clearOwnerToken,
} from '../features/queue/services/api';
import { SettingsSchema } from '../features/queue/validations/settings.schema';
import { useToast } from '../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerDashboard'>;
type Customer = {
  Id: number;
  Name: string;
  Status: Status;
  CreatedAt: string;
  PhoneNumber?: string;
};

function statusColor(s: Status) {
  if (s === 'in_progress') return Colors.statusProgress;
  if (s === 'served')      return Colors.success;
  return Colors.statusWaiting;
}

const errorTextStyle = { color: Colors.danger, fontSize: Typography.xs, marginTop: 4 };

function SettingsModal({
  visible, onClose, queueIdParam, token, currentName, currentMessage,
  currentAvgTime, currentMaxCust, currentClosingTime,
  currentBarberPhone, currentLocation, currentMetadata,
}: {
  visible: boolean; onClose: () => void;
  queueIdParam: string; token: string;
  currentName: string; currentMessage: string | null;
  currentAvgTime: number | null; currentMaxCust: number | null; currentClosingTime: string | null;
  currentBarberPhone: string | null; currentLocation: string | null; currentMetadata: string | null;
}) {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [name,        setName]        = useState(currentName);
  const [message,     setMessage]     = useState(currentMessage ?? '');
  const [avgTime,     setAvgTime]     = useState<string>(currentAvgTime?.toString() ?? '');
  const [maxCust,     setMaxCust]     = useState<string>(currentMaxCust?.toString() ?? '');
  const [closingTime, setClosingTime] = useState<string>(currentClosingTime ?? '');
  const [barberPhone, setBarberPhone] = useState<string>(currentBarberPhone ?? '');
  const [location,    setLocation]    = useState<string>(currentLocation ?? '');
  const [metadata,    setMetadata]    = useState<string>(currentMetadata ?? '');
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [saving,      setSaving]      = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setName(currentName);
    setMessage(currentMessage ?? '');
    setAvgTime(currentAvgTime?.toString() ?? '');
    setMaxCust(currentMaxCust?.toString() ?? '');
    setClosingTime(currentClosingTime ?? '');
    setBarberPhone(currentBarberPhone ?? '');
    setLocation(currentLocation ?? '');
    setMetadata(currentMetadata ?? '');
  }, [currentName, currentMessage, currentAvgTime, currentMaxCust, currentClosingTime, currentBarberPhone, currentLocation, currentMetadata, visible]);

  const validate = (): boolean => {
    const parsed = SettingsSchema.safeParse({
      name, message, avgTime, maxCust, closingTime,
      barberPhone, location, metadata,
    });
    if (!parsed.success) {
      const newErrors: Record<string, string> = {};
      parsed.error.issues.forEach(issue => {
        if (issue.path[0]) newErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const ops: Promise<void>[] = [];
      const qid: string = queueIdParam;
      if (name.trim() && name !== currentName) ops.push(apiUpdateQueueName({ QueueId: qid, name: name.trim(), token }));
      if (message !== (currentMessage ?? '')) ops.push(apiUpdateOwnerMessage({ QueueId: qid, Message: message || null, token }));
      if (avgTime && parseInt(avgTime, 10) !== currentAvgTime) ops.push(apiUpdateAvgServiceTime({ QueueId: qid, Minutes: parseInt(avgTime, 10), token }));
      const nextMax = maxCust === '' ? null : parseInt(maxCust, 10);
      if (nextMax !== currentMaxCust) ops.push(apiUpdateMaxCustomers({ QueueId: qid, Max: nextMax ?? 0, token }));
      if (closingTime !== (currentClosingTime ?? '')) ops.push(apiUpdateClosingTime({ QueueId: qid, timeString: closingTime, token }));
      if (barberPhone !== (currentBarberPhone ?? '')) ops.push(apiUpdateBarberPhoneNumber({ QueueId: qid, Phone: barberPhone.trim(), token }));
      if (location !== (currentLocation ?? '')) ops.push(apiUpdateLocation({ QueueId: qid, Location: location.trim(), token }));
      if (metadata !== (currentMetadata ?? '')) ops.push(apiUpdateMetadata({ QueueId: qid, Metadata: metadata.trim(), token }));

      await Promise.all(ops);
      showSuccess(t('common.success', 'Saved'));
      onClose();
    } catch (e) {
      Alert.alert(t('common.error'), (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!/^\d{4,6}$/.test(newPassword)) {
      setPasswordError(t('owner.pinLengthError', 'PIN must contain 4–6 digits.'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('owner.pinMismatch', 'PINs do not match.'));
      return;
    }
    setSavingPassword(true);
    setPasswordError('');
    try {
      await apiChangeQueuePassword({ QueueId: queueIdParam, password: newPassword, token });
      setNewPassword('');
      setConfirmPassword('');
      showSuccess(t('owner.pinChanged', 'Queue PIN changed successfully'));
    } catch (e) {
      Alert.alert(t('common.error'), (e as Error).message);
    } finally {
      setSavingPassword(false);
    }
  };

  const fields = [
    { label: t('owner.queueName', 'Queue Name'), value: name, set: setName, placeholder: currentName, error: errors.name },
    { label: t('owner.message', 'Public Message'), value: message, set: setMessage, placeholder: t('owner.messagePlaceholder', 'e.g. Welcome!'), error: errors.message },
    { label: t('owner.barberPhone', 'Barber / Contact Phone'), value: barberPhone, set: setBarberPhone, placeholder: t('owner.barberPhonePlaceholder', '059xxxxxxx / 056xxxxxxx'), keyboardType: 'phone-pad', error: errors.barberPhone },
    { label: t('owner.location', 'Location'), value: location, set: setLocation, placeholder: t('owner.locationPlaceholder', 'e.g. Main Street, City'), error: errors.location },
    { label: t('owner.metadataLabel', 'Notice, Services & Prices'), value: metadata, set: setMetadata, placeholder: t('owner.metadataPlaceholder', 'Add services, price list, working hours or notes...'), multiline: true, error: errors.metadata },
    { label: t('owner.avgTime', 'Avg Service Time (min)'), value: avgTime, set: setAvgTime, placeholder: currentAvgTime?.toString() ?? '', keyboardType: 'numeric', error: errors.avgTime },
    { label: t('owner.maxCustomers', 'Max Customers'), value: maxCust, set: setMaxCust, placeholder: currentMaxCust?.toString() ?? '', keyboardType: 'numeric', error: errors.maxCust },
    { label: t('owner.closingTime', 'Closing Time (HH:MM)'), value: closingTime, set: setClosingTime, placeholder: t('owner.closingTimePlaceholder', 'e.g. 18:00'), error: errors.closingTime },
  ];

  return (
    <Modal visible={visible} animationType='slide' presentationStyle='pageSheet' onRequestClose={onClose}>
      <SafeAreaView style={modal.safe}>
        <View style={modal.header}>
          <AppText style={modal.title}>{t('owner.settings', 'Queue Settings')}</AppText>
          <TouchableOpacity onPress={onClose}><AppText style={modal.close}>✕</AppText></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={modal.scroll} keyboardShouldPersistTaps='handled'>
          {fields.map((f, i) => (
            <View key={i} style={modal.field}>
              <AppText style={modal.label}>{f.label}</AppText>
              <AppTextInput
                style={[
                  modal.input,
                  f.multiline && { minHeight: 80, textAlignVertical: 'top' },
                  (f.keyboardType === 'numeric' || f.keyboardType === 'number-pad' || f.keyboardType === 'phone-pad' || f.label.toLowerCase().includes('time')) && { writingDirection: 'ltr', textAlign: 'left' },
                  f.error && { borderColor: Colors.danger },
                ]}
                value={f.value}
                onChangeText={f.set}
                placeholder={f.placeholder}
                keyboardType={(f.keyboardType || 'default') as any}
                multiline={f.multiline}
                numberOfLines={f.multiline ? 3 : 1}
              />
              {f.error && <AppText style={errorTextStyle}>{f.error}</AppText>}
            </View>
          ))}
          <TouchableOpacity style={[modal.btn, saving && modal.btnDisabled]} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator size='small' color={Colors.accentContrast} /> : <AppText style={modal.btnText}>{t('common.save', 'Save')}</AppText>}
          </TouchableOpacity>

          <View style={modal.sectionDivider} />
          <AppText style={modal.sectionTitle}>{t('owner.resetPin', 'Reset queue PIN')}</AppText>
          <AppText style={modal.sectionHint}>{t('owner.resetPinHint', 'Choose a new 4–6 digit PIN for managing this queue.')}</AppText>
          <View style={modal.field}>
            <AppText style={modal.label}>{t('owner.newPin', 'New PIN')}</AppText>
            <AppTextInput style={[modal.input, { writingDirection: 'ltr', textAlign: 'left' }, passwordError && { borderColor: Colors.danger }]} value={newPassword} onChangeText={setNewPassword} keyboardType='number-pad' secureTextEntry maxLength={6} />
          </View>
          <View style={modal.field}>
            <AppText style={modal.label}>{t('owner.confirmPin', 'Confirm new PIN')}</AppText>
            <AppTextInput style={[modal.input, { writingDirection: 'ltr', textAlign: 'left' }, passwordError && { borderColor: Colors.danger }]} value={confirmPassword} onChangeText={setConfirmPassword} keyboardType='number-pad' secureTextEntry maxLength={6} />
          </View>
          {!!passwordError && <AppText style={errorTextStyle}>{passwordError}</AppText>}
          <TouchableOpacity style={[modal.btn, savingPassword && modal.btnDisabled]} onPress={changePassword} disabled={savingPassword} activeOpacity={0.85}>
            {savingPassword ? <ActivityIndicator size='small' color={Colors.accentContrast} /> : <AppText style={modal.btnText}>{t('owner.resetPinAction', 'Reset PIN')}</AppText>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function OwnerDashboardScreen({ navigation, route }: Props) {
  const { queueId } = route.params as { queueId: string | number };
  const queueIdStr = String(queueId);
  const { t }       = useTranslation();
  const { showSuccess, showUndo } = useToast();
  const { token, isOwner } = useOwnerSession(queueIdStr);

  const [queueName,    setQueueName]    = useState('');
  const [message,      setMessage]      = useState<string | null>(null);
  const [avgTime,      setAvgTime]      = useState<number | null>(null);
  const [maxCust,      setMaxCust]      = useState<number | null>(null);
  const [createdAt,    setCreatedAt]    = useState<string | null>(null);
  const [closingTime,  setClosingTime]  = useState<string | null>(null);
  const [barberPhone,  setBarberPhone]  = useState<string | null>(null);
  const [location,     setLocation]     = useState<string | null>(null);
  const [metadata,     setMetadata]     = useState<string | null>(null);
  const [customers,    setCustomers]    = useState<Customer[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingServeIds, setPendingServeIds] = useState<Set<number>>(() => new Set());
  const serveTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const stored = getOwnerToken(queueIdStr);
    if (!isOwner && (!stored || !isTokenValid(stored))) {
      navigation.replace('ManageLogin', { queueId: queueIdStr });
    }
  }, [isOwner, queueIdStr, navigation]);

  const loadQueue = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiGetOwnerQueue(queueIdStr, token);
      const name = data.Name ?? data.name;
      setQueueName(typeof name === 'string' && name ? name : queueIdStr);
      const ownerMsg = data.OwnerMessage ?? data.ownerMessage ?? data.message;
      setMessage(typeof ownerMsg === 'string' && ownerMsg ? ownerMsg : null);
      const avg = data.AvgServiceTime ?? data.avgServiceTime;
      setAvgTime(typeof avg === 'number' ? avg : null);
      const max = data.MaxCustomers ?? data.maxCustomers;
      setMaxCust(typeof max === 'number' ? max : null);
      const created = data.CreatedAt ?? data.createdAt;
      setCreatedAt(typeof created === 'string' ? created : null);
      
      const phone = data.BarberPhoneNumber ?? data.barberPhoneNumber ?? data.Phone ?? data.phone;
      setBarberPhone(typeof phone === 'string' && phone ? phone : null);
      const loc = data.Location ?? data.location;
      setLocation(typeof loc === 'string' && loc ? loc : null);
      const meta = data.Metadata ?? data.metadata;
      setMetadata(typeof meta === 'string' && meta ? meta : null);

      const rawReset = data.DailyResetTime ?? data.dailyResetTime ?? data.ClosingTime ?? data.closingTime;
      if (typeof rawReset === 'string') {
        const parts = rawReset.split(':');
        setClosingTime(parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : rawReset);
      } else if (rawReset && typeof rawReset === 'object' && 'hours' in rawReset) {
        const h = String((rawReset as any).hours ?? 0).padStart(2, '0');
        const m = String((rawReset as any).minutes ?? 0).padStart(2, '0');
        setClosingTime(`${h}:${m}`);
      } else {
        setClosingTime(null);
      }
      const raw = data.Waiters ?? data.waiters ?? data.customers ?? [];
      const list: Customer[] = [];
      if (Array.isArray(raw)) {
        for (const item of raw) {
          if (!item || typeof item !== 'object') continue;
          const r = item as Record<string, unknown>;
          const id = r.Id ?? r.id;
          if (typeof id !== 'number') continue;
          const st = r.State ?? r.state ?? r.Status ?? r.status;
          const nm = r.Name ?? r.name;
          const ca = r.CreatedAt ?? r.createdAt;
          const ph = r.PhoneNumber ?? r.phone;
          list.push({
            Id: id,
            Name: typeof nm === 'string' ? nm : '',
            Status: (typeof st === 'string' ? st : 'waiting') as Status,
            CreatedAt: typeof ca === 'string' ? ca : '',
            PhoneNumber: typeof ph === 'string' ? ph : undefined,
          });
        }
      }
      setCustomers(list.sort((a, b) => RANK[a.Status] - RANK[b.Status] || new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime()));
    } catch (e) { Alert.alert(t('common.error'), (e as Error).message); }
  }, [queueIdStr, token, t]);

  useEffect(() => { loadQueue().finally(() => setLoading(false)); }, [loadQueue]);

  useQueueSignalR(queueIdStr as string, {
    onCustomerJoined: (c) => setCustomers(prev => {
      if (prev.find(x => x.Id === c.Id)) return prev;
      return [...prev, c as Customer].sort((a, b) => RANK[a.Status] - RANK[b.Status] || new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime());
    }),
    onCustomerVerified: (c) => setCustomers(prev => {
      const verified = { ...c, Status: c.State } as Customer;
      const updated = prev.some(x => x.Id === c.Id)
        ? prev.map(x => x.Id === c.Id ? { ...x, ...verified } : x)
        : [...prev, verified];
      return updated.sort((a, b) => RANK[a.Status] - RANK[b.Status] || new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime());
    }),
    onCustomerLeft: (id) => setCustomers(prev => prev.filter(x => x.Id !== id)),
    onCustomerServed: (id) => {
      const timer = serveTimers.current.get(id);
      if (timer) clearTimeout(timer);
      serveTimers.current.delete(id);
      setPendingServeIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      setCustomers(prev => prev.filter(x => x.Id !== id));
    },
    onCustomerStatusChanged: (c) => setCustomers(prev =>
      prev.map(x => x.Id === c.Id ? { ...x, Status: c.Status } : x)
          .sort((a, b) => RANK[a.Status] - RANK[b.Status] || new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime())
    ),
    onQueueUpdated: () => loadQueue(),
  });

  const onRefresh = async () => { setRefreshing(true); await loadQueue(); setRefreshing(false); };

  const serve = async (c: Customer) => {
    if (!token || serveTimers.current.size > 0 || serveTimers.current.has(c.Id)) return;
    setPendingServeIds(prev => new Set(prev).add(c.Id));
    showUndo(
      t('owner.customerServed', '{{name}} marked as served', { name: c.Name }),
      t('common.undo', 'Undo'),
      () => {
        const timer = serveTimers.current.get(c.Id);
        if (timer) clearTimeout(timer);
        serveTimers.current.delete(c.Id);
        setPendingServeIds(prev => { const next = new Set(prev); next.delete(c.Id); return next; });
        showSuccess(t('owner.serveUndone', 'Serving cancelled. {{name}} is still in progress.', { name: c.Name }));
      },
      5000,
    );
    const timer = setTimeout(async () => {
      serveTimers.current.delete(c.Id);
      try {
        await apiServeCustomer({ QueueId: queueIdStr, CustomerId: c.Id, token });
        setCustomers(prev => prev.filter(x => x.Id !== c.Id));
      } catch (e) {
        Alert.alert(t('common.error'), (e as Error).message);
      } finally {
        setPendingServeIds(prev => { const next = new Set(prev); next.delete(c.Id); return next; });
      }
    }, 5000);
    serveTimers.current.set(c.Id, timer);
  };

  const setInProgress = async (c: Customer) => {
    if (!token) return;
    try {
      await apiUpdateCustomerStatus({ QueueId: queueIdStr as string, CustomerId: c.Id, token });
      setCustomers(prev => prev
        .map(x => x.Id === c.Id ? { ...x, Status: 'in_progress' as Status } : x)
        .sort((a, b) => RANK[a.Status] - RANK[b.Status] || new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime()));
      showSuccess(t('owner.customerInProgress', '{{name}} is now in progress', { name: c.Name }));
    } catch (e) { Alert.alert(t('common.error'), (e as Error).message); }
  };

  const setWaiting = async (c: Customer) => {
    if (!token) return;
    try {
      await apiRevertCustomerToWaiting({ QueueId: queueIdStr, CustomerId: c.Id, token });
      setCustomers(prev => prev
        .map(x => x.Id === c.Id ? { ...x, Status: 'waiting' as Status } : x)
        .sort((a, b) => RANK[a.Status] - RANK[b.Status] || new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime()));
      showSuccess(t('owner.customerBackToWaiting', '{{name}} moved back to waiting', { name: c.Name }));
    } catch (e) { Alert.alert(t('common.error'), (e as Error).message); }
  };

  const waiting = customers.filter(c => c.Status === 'waiting').length;
  const inProgress = customers.filter(c => c.Status === 'in_progress').length;
  const servedCount = customers.filter(c => c.Status === 'served').length;

  const handleSignOutOwner = () => {
    Alert.alert(
      t('owner.signOutTitle', 'Sign out as owner?'),
      t('owner.signOutMsg', 'You will switch back to customer view. You can sign in again with the queue password.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('owner.signOut', 'Sign out'),
          style: 'destructive',
          onPress: async () => {
            await clearOwnerToken(queueIdStr);
            showSuccess(t('owner.signedOut', 'Signed out as owner'));
            navigation.navigate('Queue', { queueId: queueIdStr });
          },
        },
      ]
    );
  };

  if (loading) return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size='large' color={Colors.accent} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle='dark-content' backgroundColor={Colors.bgPrimary} />

      {/* Top compact navigation bar */}
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Queue', { queueId: queueIdStr })}
          style={styles.navBackBtn}
          activeOpacity={0.7}
        >
          <AppText style={styles.navBackBtnText}>‹ {t('common.back', 'Back')}</AppText>
        </TouchableOpacity>
        <AppText style={styles.topNavTitle} numberOfLines={1}>{queueName}</AppText>
        <View style={styles.topNavActions}>
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={styles.iconBtn}
            activeOpacity={0.7}
            accessibilityLabel={t('owner.settings', 'Settings')}
          >
            <AppText style={styles.iconBtnText}>⚙️</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSignOutOwner}
            style={styles.signOutPill}
            activeOpacity={0.7}
            accessibilityLabel={t('owner.signOut', 'Sign out')}
          >
            <AppText style={styles.signOutPillText}>🚪 {t('owner.signOut', 'Sign out')}</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        style={styles.mainList}
        data={customers.filter(c => c.Status !== 'served')}
        keyExtractor={item => String(item.Id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        ListHeaderComponent={
          <View style={styles.listHeaderWrap}>
            {/* Header info block */}
            <View style={styles.headerInfoBlock}>
              <View style={styles.headerMetaRow}>
                <AppText style={styles.headerMetaHighlight}>
                  {waiting} {t('queue.waiting', 'waiting')} · {inProgress} {t('queue.inProgress', 'in progress')}
                </AppText>
                {closingTime && (
                  <View style={styles.closingBadge}>
                    <AppText style={styles.closingBadgeText}>
                      🕒 {t('queue.closesAt', { time: closingTime })}
                    </AppText>
                  </View>
                )}
              </View>
              <View style={styles.headerDetailsWrap}>
                {avgTime && (
                  <AppText style={styles.headerDetailItem}>
                    ⏱ {t('queue.avgTime', 'Avg service: {{min}} min', { min: avgTime })}
                  </AppText>
                )}
                {maxCust && (
                  <AppText style={styles.headerDetailItem}>
                    👥 {t('queue.maxCustomers', 'Max: {{max}}', { max: maxCust })}
                  </AppText>
                )}
                {createdAt && (
                  <AppText style={styles.headerDetailItem}>
                    📅 {t('queue.created', 'Created: {{date}}', { date: new Date(createdAt).toLocaleDateString() })}
                  </AppText>
                )}
              </View>
            </View>

            {/* Metadata summary card */}
            {(metadata || barberPhone || location) ? (
              <View style={styles.ownerMetaCard}>
                {metadata ? (
                  <View style={styles.ownerMetaRow}>
                    <AppText style={styles.ownerMetaLabel}>{t('queue.metadataLabel', 'Notice & Services')}:</AppText>
                    <AppText style={styles.ownerMetaValue} numberOfLines={3}>{metadata}</AppText>
                  </View>
                ) : null}
                {barberPhone ? (
                  <TouchableOpacity
                    style={styles.ownerMetaRow}
                    onPress={() => Linking.openURL(`tel:${barberPhone}`).catch(() => {})}
                    activeOpacity={0.7}
                  >
                    <AppText style={styles.ownerMetaLabel}>{t('queue.phone', 'Phone')}:</AppText>
                    <AppText style={[styles.ownerMetaValue, styles.ownerPhoneLink]} writingDirection="ltr">📞 {barberPhone}</AppText>
                  </TouchableOpacity>
                ) : null}
                {location ? (
                  <View style={styles.ownerMetaRow}>
                    <AppText style={styles.ownerMetaLabel}>{t('queue.location', 'Location')}:</AppText>
                    <AppText style={styles.ownerMetaValue}>📍 {location}</AppText>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Add customer button & Quick Stats */}
            <View style={styles.actionStatsHeader}>
              <TouchableOpacity
                style={styles.addCustomerBtn}
                onPress={() => navigation.navigate('Join', { queueId: queueIdStr, ownerReturn: true })}
                activeOpacity={0.85}
              >
                <AppText style={styles.addCustomerBtnText}>+ {t('queue.addCustomer', 'Add customer')}</AppText>
              </TouchableOpacity>

              <View style={styles.statsRow}>
                {[
                  { label: t('queue.status.waiting',    'Waiting'),     value: waiting,     color: Colors.statusWaiting },
                  { label: t('queue.status.inProgress', 'In Progress'), value: inProgress,  color: Colors.statusProgress },
                  { label: t('queue.status.served',     'Served'),      value: servedCount, color: Colors.success },
                ].map(stat => (
                  <View key={stat.label} style={[styles.stat, { borderTopColor: stat.color }]}>
                    <AppText style={[styles.statValue, { color: stat.color }]}>{stat.value}</AppText>
                    <AppText style={styles.statLabel}>{stat.label}</AppText>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.customersSectionTitleRow}>
              <AppText style={styles.customersSectionTitle}>
                {t('owner.customersList', 'Customers in Queue')}
              </AppText>
              <View style={styles.customersCountBadge}>
                <AppText style={styles.customersCountBadgeText}>
                  {waiting + inProgress}
                </AppText>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <AppText style={styles.emptyEmoji}>🎉</AppText>
            </View>
            <AppText style={styles.emptyTitle}>{t('queue.empty', 'No customers yet')}</AppText>
            <AppText style={styles.emptyText}>{t('queue.noCustomersOwner', 'Your queue is empty. Add the first customer or share the QR.')}</AppText>
          </View>
        }
        renderItem={({ item, index }) => {
          const isWaiting = item.Status === 'waiting';
          const estimatedWait = isWaiting && avgTime
            ? (index + 1) * avgTime
            : null;
          return (
            <View style={[styles.card, { borderStartColor: statusColor(item.Status) }]}>
              {/* Top Row: Rank, Customer Name, Status Badge, Wait Time */}
              <View style={styles.cardHeader}>
                <View style={styles.rankCircle}>
                  <AppText style={styles.rankText}>#{index + 1}</AppText>
                </View>
                <View style={styles.nameWrap}>
                  <AppText style={styles.customerName} numberOfLines={2}>{item.Name}</AppText>
                </View>
                <View style={styles.badgesWrap}>
                  <View style={[styles.badge, { backgroundColor: statusColor(item.Status) + '22' }]}>
                    <AppText style={[styles.badgeText, { color: statusColor(item.Status) }]}>
                      {t(getStatusI18nKey(item.Status), item.Status)}
                    </AppText>
                  </View>
                  {estimatedWait != null && (
                    <View style={styles.waitBadge}>
                      <AppText style={styles.waitBadgeText}>
                        ⏱ {t('queue.estimatedWait', '~{{min}} min', { min: estimatedWait })}
                      </AppText>
                    </View>
                  )}
                </View>
              </View>

              {/* Middle Row: Phone number with 1-tap dialer */}
              {item.PhoneNumber ? (
                <TouchableOpacity
                  style={styles.phonePill}
                  onPress={() => Linking.openURL(`tel:${item.PhoneNumber}`).catch(() => {})}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('owner.callCustomer', 'Call customer')}: ${item.PhoneNumber}`}
                >
                  <AppText style={styles.phonePillIcon}>📞</AppText>
                  <AppText style={styles.phoneNumber} writingDirection="ltr">{item.PhoneNumber}</AppText>
                  <AppText style={styles.callBadge}>{t('owner.callCustomer', 'Call')}</AppText>
                </TouchableOpacity>
              ) : null}

              {/* Bottom Row: Clear, spacious action buttons */}
              <View style={styles.cardActions}>
                {item.Status === 'waiting' && (
                  <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => setInProgress(item)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('owner.startServing', 'Start serving {{name}}', { name: item.Name })}
                  >
                    <AppText style={styles.startBtnIcon}>▶</AppText>
                    <AppText style={styles.startBtnText}>{t('owner.startServingAction', 'Start serving')}</AppText>
                  </TouchableOpacity>
                )}
                {item.Status === 'in_progress' && (
                  <View style={styles.inProgressActionsRow}>
                    <TouchableOpacity
                      style={[styles.backstepBtn, pendingServeIds.size > 0 && styles.actionDisabled]}
                      onPress={() => setWaiting(item)}
                      disabled={pendingServeIds.size > 0}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={t('owner.moveBack', 'Move {{name}} back to waiting', { name: item.Name })}
                    >
                      <AppText style={styles.backstepText} numberOfLines={1}>↶ {t('owner.backToWaiting', 'Back to waiting')}</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.serveBtn, pendingServeIds.size > 0 && styles.actionDisabled]}
                      onPress={() => serve(item)}
                      disabled={pendingServeIds.size > 0}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={t('owner.markServed', 'Mark {{name}} as served', { name: item.Name })}
                    >
                      <AppText style={styles.serveBtnText}>
                        {pendingServeIds.has(item.Id) ? t('owner.servingPending', 'Serving…') : `✓ ${t('owner.markServedAction', 'Mark served')}`}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />

      <SettingsModal
        visible={showSettings}
        onClose={() => { setShowSettings(false); loadQueue(); }}
        queueIdParam={queueIdStr}
        token={token!}
        currentName={queueName}
        currentMessage={message}
        currentAvgTime={avgTime}
        currentMaxCust={maxCust}
        currentClosingTime={closingTime}
        currentBarberPhone={barberPhone}
        currentLocation={location}
        currentMetadata={metadata}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bgPrimary },
  center:      { flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },

  // Top Nav Bar
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  navBackBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  navBackBtnText: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.accent,
  },
  topNavTitle: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  topNavActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  iconBtnText: {
    fontSize: 15,
  },
  signOutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  signOutPillText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.danger,
  },

  // Scrollable container (occupies full height)
  mainList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xxl,
  },
  listHeaderWrap: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },

  // Info header block inside list header
  headerInfoBlock: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 8,
    ...Shadow.sm,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerMetaHighlight: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  closingBadgeText: {
    fontSize: Typography.xs,
    color: '#D97706',
    fontWeight: '700',
  },
  headerDetailsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: 8,
  },
  headerDetailItem: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },

  // Metadata summary card
  ownerMetaCard: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,
    gap: 6,
    ...Shadow.sm,
  },
  ownerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  ownerMetaLabel: { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: '600' },
  ownerMetaValue: { fontSize: Typography.xs, color: Colors.textPrimary, flexShrink: 1 },
  ownerPhoneLink: { color: Colors.accent, fontWeight: '700' },

  // Add customer + Stats row
  actionStatsHeader: {
    gap: Spacing.sm,
  },
  addCustomerBtn: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  addCustomerBtnText: {
    color: Colors.accentContrast,
    fontWeight: '800',
    fontSize: Typography.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 3,
    ...Shadow.sm,
  },
  statValue: { fontSize: Typography.xl, fontWeight: '700' },
  statLabel: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2, textAlign: 'center', flexShrink: 1 },

  // Customers Section Header
  customersSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 4,
  },
  customersSectionTitle: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  customersCountBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  customersCountBadgeText: {
    color: Colors.accentContrast,
    fontSize: Typography.xs,
    fontWeight: '800',
  },

  // Customer Card redesign (vertical card with full breathing room)
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderStartWidth: 4,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: Typography.xs, fontWeight: '700', color: Colors.textSecondary },
  nameWrap: { flex: 1, marginHorizontal: Spacing.xs },
  customerName: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  badgesWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: Typography.xs, fontWeight: '700', flexShrink: 0, includeFontPadding: false },
  waitBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  waitBadgeText: { fontSize: Typography.xs, color: Colors.accentDark, fontWeight: '600' },

  // Phone row
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.md,
    gap: 6,
  },
  phonePillIcon: { fontSize: 13 },
  phoneNumber: { fontSize: Typography.xs, color: Colors.textPrimary, fontFamily: 'monospace', fontWeight: '600' },
  callBadge: { fontSize: 10, color: Colors.accent, fontWeight: '700', textTransform: 'uppercase', marginStart: 4 },

  // Action buttons
  cardActions: {
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
    paddingTop: Spacing.sm,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  startBtnIcon: { fontSize: 12, color: Colors.accentContrast },
  startBtnText: { color: Colors.accentContrast, fontSize: Typography.sm, fontWeight: '700' },

  inProgressActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  backstepBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceHover,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backstepText: { color: Colors.textSecondary, fontSize: Typography.xs, fontWeight: '700' },
  serveBtn: {
    flex: 1,
    backgroundColor: Colors.success,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serveBtnText: { color: Colors.white, fontSize: Typography.xs, fontWeight: '800' },
  actionDisabled: { opacity: 0.5 },

  // Empty state
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
});

const modal = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bgPrimary },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  title:       { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  close:       { fontSize: Typography.lg, color: Colors.textMuted, padding: Spacing.sm },
  scroll:      { padding: Spacing.base, paddingBottom: Spacing.xl },
  field:       { marginBottom: Spacing.base },
  label:       { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.xs, fontWeight: '500' },
  input:       { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: Typography.base },
  btn:         { backgroundColor: Colors.accent, borderRadius: Radius.full, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.lg, ...Shadow.glow },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: Colors.accentContrast, fontWeight: '800', fontSize: Typography.base },
  sectionDivider: { height: 1, backgroundColor: Colors.surfaceBorder, marginVertical: Spacing.xl },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: '700', marginBottom: Spacing.xs },
  sectionHint: { color: Colors.textMuted, fontSize: Typography.sm, marginBottom: Spacing.lg },
});


