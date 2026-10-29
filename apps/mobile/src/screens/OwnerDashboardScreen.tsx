import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, FlatList,
  StatusBar, ActivityIndicator, Alert, RefreshControl,
  Modal, ScrollView,
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
  getOwnerToken,
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
  currentAvgTime, currentMaxCust, currentClosingTime
}: {
  visible: boolean; onClose: () => void;
  queueIdParam: string; token: string;
  currentName: string; currentMessage: string | null;
  currentAvgTime: number | null; currentMaxCust: number | null; currentClosingTime: string | null;
}) {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [name,    setName]    = useState(currentName);
  const [message, setMessage] = useState(currentMessage ?? '');
  const [avgTime, setAvgTime] = useState<string>(currentAvgTime?.toString() ?? '');
  const [maxCust, setMaxCust] = useState<string>(currentMaxCust?.toString() ?? '');
  const [closingTime, setClosingTime] = useState<string>(currentClosingTime ?? '');
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [saving,  setSaving]  = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const validate = (): boolean => {
    const parsed = SettingsSchema.safeParse({ name, message, avgTime, maxCust, closingTime });
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
      if (name.trim()   && name !== currentName)   ops.push(apiUpdateQueueName({ QueueId: qid, name: name.trim(), token }));
      if (message !== (currentMessage ?? ''))       ops.push(apiUpdateOwnerMessage({ QueueId: qid, Message: message || null, token }));
      if (avgTime && parseInt(avgTime, 10) !== currentAvgTime) ops.push(apiUpdateAvgServiceTime({ QueueId: qid, Minutes: parseInt(avgTime, 10), token }));
      const nextMax = maxCust === '' ? null : parseInt(maxCust, 10);
      if (nextMax !== currentMaxCust) ops.push(apiUpdateMaxCustomers({ QueueId: qid, Max: nextMax ?? 0, token }));
      if (closingTime !== (currentClosingTime ?? '')) ops.push(apiUpdateClosingTime({ QueueId: qid, timeString: closingTime, token }));
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
    { label: t('owner.queueName', 'Queue Name'),    value: name,    set: setName,    placeholder: currentName, error: errors.name },
    { label: t('owner.message',   'Public Message'), value: message, set: setMessage, placeholder: t('owner.messagePlaceholder', 'e.g. Welcome!'), error: errors.message },
    { label: t('owner.avgTime',   'Avg Service Time (min)'), value: avgTime, set: setAvgTime, placeholder: currentAvgTime?.toString() ?? '', keyboardType: 'numeric', error: errors.avgTime },
    { label: t('owner.maxCustomers', 'Max Customers'), value: maxCust, set: setMaxCust, placeholder: currentMaxCust?.toString() ?? '', keyboardType: 'numeric', error: errors.maxCust },
    { label: t('owner.closingTime', 'Closing Time (HH:MM)'), value: closingTime, set: setClosingTime, placeholder: t('owner.closingTimePlaceholder', 'e.g. 18:00'), error: errors.closingTime },
  ];

  return (
    <Modal visible={visible} animationType='slide' presentationStyle='pageSheet' onRequestClose={onClose}>
      <SafeAreaView style={modal.safe}>
        <View style={modal.header}>
          <AppText style={modal.title}>{t('owner.settings', 'Queue Settings')}</AppText>
          <TouchableOpacity onPress={onClose}><AppText style={modal.close}>x</AppText></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={modal.scroll} keyboardShouldPersistTaps='handled'>
          {fields.map((f, i) => (
            <View key={i} style={modal.field}>
              <AppText style={modal.label}>{f.label}</AppText>
              <AppTextInput
                style={[modal.input, (f.keyboardType === 'numeric' || f.keyboardType === 'number-pad' || f.label.toLowerCase().includes('time')) && { writingDirection: 'ltr', textAlign: 'left' }, f.error && { borderColor: Colors.danger }]}
                value={f.value}
                onChangeText={f.set}
                placeholder={f.placeholder}
                keyboardType={(f.keyboardType || 'default') as any}
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

  const [queueName,  setQueueName]  = useState('');
  const [message,    setMessage]    = useState<string | null>(null);
  const [avgTime,    setAvgTime]    = useState<number | null>(null);
  const [maxCust,    setMaxCust]    = useState<number | null>(null);
  const [createdAt,  setCreatedAt]  = useState<string | null>(null);
  const [closingTime, setClosingTime] = useState<string | null>(null);
  const [customers,  setCustomers]  = useState<Customer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      // Owner API is PascalCase (PropertyNamingPolicy = null): Name / OwnerMessage /
      // AvgServiceTime / MaxCustomers / Waiters[].State — camelCase kept as fallback.
      // (The previous camelCase reads here always yielded an empty dashboard.)
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
      setClosingTime(data.ClosingTime ?? data.closingTime ?? null);
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

  if (loading) return (
    <SafeAreaView style={styles.center}>
      <ActivityIndicator size='large' color={Colors.accent} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle='dark-content' backgroundColor={Colors.bgPrimary} />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.headerName}>{queueName}</AppText>
          <AppText style={styles.headerMeta}>
            {waiting} {t('queue.waiting', 'waiting')} · {inProgress} {t('queue.inProgress', 'in progress')}
          </AppText>
          {createdAt && (
            <AppText style={styles.headerMeta}>
              {t('queue.created', 'Created: {{date}}', { date: new Date(createdAt).toLocaleDateString() })}
            </AppText>
          )}
          {avgTime && (
            <AppText style={styles.headerMeta}>
              {t('queue.avgTime', 'Avg service: {{min}} min', { min: avgTime })}
            </AppText>
          )}
          {maxCust && (
            <AppText style={styles.headerMeta}>
              {t('queue.maxCustomers', 'Max: {{max}}', { max: maxCust })}
            </AppText>
          )}
          {closingTime && (
            <AppText style={styles.headerMeta}>
              {t('queue.closesAt', 'Closes at: {{time}}', { time: closingTime })}
            </AppText>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsBtn} activeOpacity={0.7}>
          <AppText style={styles.settingsIcon}>{'\u2699'}</AppText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.addCustomerBtn}
        onPress={() => navigation.navigate('Join', { queueId: queueIdStr, ownerReturn: true })}
        activeOpacity={0.85}
      >
        <AppText style={styles.addCustomerBtnText}>{t('queue.addCustomer', 'Add customer')}</AppText>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        {[
          { label: t('queue.status.waiting',    'Waiting'),     value: waiting,                                       color: Colors.statusWaiting },
          { label: t('queue.status.inProgress', 'In Progress'), value: inProgress,                                    color: Colors.statusProgress },
          { label: t('queue.status.served',     'Served'),      value: servedCount,                                    color: Colors.success },
        ].map(stat => (
          <View key={stat.label} style={[styles.stat, { borderTopColor: stat.color }]}>
            <AppText style={[styles.statValue, { color: stat.color }]}>{stat.value}</AppText>
            <AppText style={styles.statLabel}>{stat.label}</AppText>
          </View>
        ))}
      </View>

      <FlatList
        data={customers.filter(c => c.Status !== 'served')}
        keyExtractor={item => String(item.Id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}><AppText style={styles.emptyIcon}>done</AppText><AppText style={styles.emptyText}>{t('queue.empty', 'No customers')}</AppText></View>
        }
        renderItem={({ item, index }) => {
          const isWaiting = item.Status === 'waiting';
          const estimatedWait = isWaiting && avgTime
            ? (index + 1) * avgTime
            : null;
          return (
            <View style={[styles.card, { borderStartColor: statusColor(item.Status) }]}>
              <View style={styles.cardLeft}>
                <AppText style={styles.rank}>#{index + 1}</AppText>
                <View style={styles.customerInfo}>
                  <AppText style={styles.customerName}>{item.Name}</AppText>
                  {item.PhoneNumber && (
                    <AppText style={styles.phoneNumber} writingDirection="ltr">{item.PhoneNumber}</AppText>
                  )}
                  <View style={[styles.badge, { backgroundColor: statusColor(item.Status) + '25' }]}>
                    <AppText style={[styles.badgeText, { color: statusColor(item.Status) }]}>
                      {t(getStatusI18nKey(item.Status), item.Status)}
                    </AppText>
                  </View>
                  {estimatedWait && (
                    <AppText style={styles.waitTime}>
                      {t('queue.estimatedWait', '~{{min}} min', { min: estimatedWait })}
                    </AppText>
                  )}
                </View>
              </View>
              <View style={styles.actions}>
                {item.Status === 'waiting' && (
                  <>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setInProgress(item)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('owner.startServing', 'Start serving {{name}}', { name: item.Name })}>
                    <AppText style={styles.actionText}>{t('owner.startServingShort', 'Start')}</AppText>
                    </TouchableOpacity>
                  </>
                )}
                {item.Status === 'in_progress' && (
                  <>
                    <TouchableOpacity style={[styles.actionBtn, styles.backstepBtn, pendingServeIds.size > 0 && styles.actionDisabled]} onPress={() => setWaiting(item)} disabled={pendingServeIds.size > 0} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('owner.moveBack', 'Move {{name}} back to waiting', { name: item.Name })}>
                      <AppText style={styles.backstepText} numberOfLines={1}>↶ {t('owner.backToWaiting', 'Back to waiting')}</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.serveBtn, pendingServeIds.size > 0 && styles.actionDisabled]} onPress={() => serve(item)} disabled={pendingServeIds.size > 0} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('owner.markServed', 'Mark {{name}} as served', { name: item.Name })}>
                      <AppText style={styles.actionText}>{pendingServeIds.has(item.Id) ? t('owner.servingPending', 'Serving…') : t('owner.markServedShort', 'Served')}</AppText>
                    </TouchableOpacity>
                  </>
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bgPrimary },
  center:      { flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSecondary, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  headerName:  { fontSize: Typography.lg, fontWeight: '700', color: Colors.accent, flexShrink: 1, flexWrap: 'wrap' },
  headerMeta:  { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  addCustomerBtn: { alignSelf: 'flex-end', marginHorizontal: Spacing.base, marginTop: Spacing.sm, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.accent },
  addCustomerBtnText: { color: Colors.accentContrast, fontWeight: '700', fontSize: Typography.sm },
  settingsBtn: { padding: Spacing.sm },
  settingsIcon:{ fontSize: 22 },
  statsRow:    { flexDirection: 'row', padding: Spacing.base, gap: Spacing.sm },
  stat:        { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', borderTopWidth: 3, ...Shadow.sm },
  statValue:   { fontSize: Typography.xl, fontWeight: '700' },
  statLabel:   { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2, textAlign: 'center', flexShrink: 1 },
  list:        { padding: Spacing.base, paddingBottom: Spacing.xl },
  card:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.base, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, borderStartWidth: 3, ...Shadow.sm },
  cardLeft:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1, flexShrink: 1, minWidth: 0 },
  customerInfo:{ flex: 1, flexShrink: 1, minWidth: 0 },
  rank:        { fontSize: Typography.md, fontWeight: '700', color: Colors.textMuted, width: 28 },
  customerName:{ fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  badge:       { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full, alignSelf: 'flex-start' },
  badgeText:   { fontSize: Typography.xs, fontWeight: '600', flexShrink: 0, includeFontPadding: false, lineHeight: Typography.md },
  phoneNumber: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2, fontFamily: 'monospace' },
  waitTime:    { fontSize: Typography.xs, color: Colors.accent, marginTop: 2, fontWeight: '500' },
  actions:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionBtn:   { flex: 1, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surfaceStrong, alignItems: 'center', justifyContent: 'center', minWidth: 72, minHeight: 40 },
  serveBtn:    { backgroundColor: Colors.success },
  backstepBtn:{ backgroundColor: Colors.surfaceHover, borderWidth: 1, borderColor: Colors.accent },
  backstepText:{ color: Colors.accentDark, fontSize: Typography.xs, fontWeight: '700' },
  actionDisabled: { opacity: 0.6 },
  actionText:  { fontSize: Typography.xs, fontWeight: '600', color: Colors.textPrimary },
  empty:       { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon:   { fontSize: 48, marginBottom: Spacing.base },
  emptyText:   { color: Colors.textMuted, fontSize: Typography.base },
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


