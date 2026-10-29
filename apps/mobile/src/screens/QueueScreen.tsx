/**
 * QueueScreen — customer-facing queue details.
 *
 * Mirrors apps/web/src/pages/QueuePage.tsx (public mode) section by section:
 *   title → owner notice bar → QR card (copy/share) → Manage/Dashboard button →
 *   waiter rows (status chip + ETA + snooze/cancel) → empty state / "Add to Queue".
 *
 * Data comes from the same endpoint as the web: GET /api/queues/q/{id}.
 * IMPORTANT: the API serializes with PropertyNamingPolicy = null → PascalCase
 * (Name / OwnerMessage / AvgServiceTime / Waiters[].State) — the old camelCase
 * reads here (data.name / data.customers / item.Status) always yielded an empty
 * page. SignalR payloads are camelCase, so both casings are accepted, like the web.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert, RefreshControl, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import * as Clipboard from 'expo-clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Spacing, Radius, Typography, Shadow } from '../constants/theme';
import {
  apiGetQueuePublic, apiCancelRegistration, apiSnoozeRegistration,
  apiUpdateCustomerStatus, apiServeCustomer, apiRevertCustomerToWaiting,
  getCancelToken, getOwnerToken, saveRecentQueue,
} from '../features/queue/services/api';
import { useQueueSignalR } from '../hooks/useQueueSignalR';
import { isTokenValid } from '../hooks/useOwnerSession';
import { Status, RANK, getStatusI18nKey } from '../constants/status';
import QrCode from '../components/QrCode';
import { useToast } from '../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'Queue'>;

/** Backend QueueCustomerDTO: Id, Name, CreatedAt, State (no phone publicly). */
type Customer = {
  Id: number;
  Name: string;
  State: Status;
  CreatedAt?: string;
};

/** Same value the web encodes: window.location.origin + /queue/{id}. */
const WEB_ORIGIN = 'https://door-meen.vercel.app';

const normalizeCustomer = (raw: unknown): Customer | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = r.Id ?? r.id;
  if (typeof id !== 'number') return null;
  const state = r.State ?? r.state ?? r.Status ?? r.status;
  const name = r.Name ?? r.name;
  const createdAt = r.CreatedAt ?? r.createdAt;
  return {
    Id: id,
    Name: typeof name === 'string' ? name : '',
    State: typeof state === 'string' ? (state as Status) : 'waiting',
    CreatedAt: typeof createdAt === 'string' ? createdAt : undefined,
  };
};

const sortUsers = (list: Customer[]) =>
  [...list].sort(
    (a, b) =>
      (RANK[a.State] ?? 1) - (RANK[b.State] ?? 1) ||
      new Date(a.CreatedAt ?? 0).getTime() - new Date(b.CreatedAt ?? 0).getTime(),
  );

export default function QueueScreen({ navigation, route }: Props) {
  const { queueId } = route.params;
  const { t } = useTranslation();
  const { showSuccess, showError, showUndo } = useToast();

  const [queueName,  setQueueName]  = useState(queueId);
  const [message,    setMessage]    = useState<string | null>(null);
  const [avgTime,    setAvgTime]    = useState<number>(15);
  const [customers,  setCustomers]  = useState<Customer[]>([]);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [notFound,   setNotFound]   = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [updatingCustomerId, setUpdatingCustomerId] = useState<number | null>(null);
  const [pendingServeIds, setPendingServeIds] = useState<Set<number>>(() => new Set());
  const serveTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const queueUrl = `${WEB_ORIGIN}/queue/${queueId}`;

  const loadQueue = useCallback(async () => {
    try {
      const data = await apiGetQueuePublic(queueId);
      // PascalCase is authoritative (see header comment); camelCase kept as fallback.
      const name = data.Name ?? data.name;
      const resolvedName = typeof name === 'string' && name ? name : queueId;
      setQueueName(resolvedName);
      // Persist to recent queues so user can return without scanning again
      saveRecentQueue(queueId, resolvedName);
      const ownerMsg = data.OwnerMessage ?? data.ownerMessage ?? data.message;
      setMessage(typeof ownerMsg === 'string' && ownerMsg ? ownerMsg : null);
      const avg = data.AvgServiceTime ?? data.avgServiceTime;
      setAvgTime(typeof avg === 'number' && avg > 0 ? avg : 15);
      const rawWaiters = data.Waiters ?? data.waiters ?? data.customers ?? [];
      const list = Array.isArray(rawWaiters)
        ? (rawWaiters.map(normalizeCustomer).filter(Boolean) as Customer[])
        : [];
      setCustomers(sortUsers(list));
      const storedOwnerToken = getOwnerToken(queueId);
      setOwnerToken(storedOwnerToken && isTokenValid(storedOwnerToken) ? storedOwnerToken : null);
      setNotFound(false);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [queueId]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Reload whenever the screen regains focus (e.g. returning from Join/Verify)
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadQueue);
    return unsub;
  }, [navigation, loadQueue]);
  // Realtime updates via SignalR (same events the web page subscribes to)
  useQueueSignalR(queueId, {
    onCustomerJoined: (c) => setCustomers(prev =>
      prev.some(x => x.Id === c.Id) ? prev : sortUsers([...prev, c as Customer])),
    onCustomerVerified: (c) => setCustomers(prev =>
      sortUsers(prev.some(x => x.Id === c.Id)
        ? prev.map(x => x.Id === c.Id ? { ...x, ...c } : x)
        : [...prev, c as Customer])),
    onCustomerLeft: (id) => setCustomers(prev => prev.filter(x => x.Id !== id)),
    onCustomerServed: (id) => {
      const timer = serveTimers.current.get(id);
      if (timer) clearTimeout(timer);
      serveTimers.current.delete(id);
      setPendingServeIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      setCustomers(prev => prev.filter(x => x.Id !== id));
    },
    onCustomerStatusChanged: (c) => setCustomers(prev =>
      sortUsers(prev.map(x => x.Id === c.Id
        ? { ...x, State: c.State, CreatedAt: c.CreatedAt ?? x.CreatedAt }
        : x))),
    onMessageUpdated: (msg) => setMessage(msg),
    onQueueUpdated: () => { loadQueue(); },
  });

  const onRefresh = () => {
    setRefreshing(true);
    loadQueue();
  };

  const handleCancel = (customer: Customer) => {
    const token = getCancelToken(customer.Id);
    if (!token) {
      showError(t('queue.noToken', 'No cancel token found for your spot.'));
      return;
    }
    Alert.alert(
      t('queue.cancelTitle', 'Leave Queue'),
      t('queue.cancelMsg', 'Are you sure you want to leave the queue?'),
      [
        { text: t('common.no', 'No'), style: 'cancel' },
        {
          text: t('common.yes', 'Yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiCancelRegistration({ queueId, customerId: customer.Id, token });
              await loadQueue();
            } catch (e) { showError((e as Error).message); }
          },
        },
      ],
    );
  };

  const handleSnooze = async (customer: Customer) => {
    const token = getCancelToken(customer.Id);
    if (!token) return;
    try {
      await apiSnoozeRegistration({ queueId, customerId: customer.Id, token });
      await loadQueue();
    } catch (e) { showError((e as Error).message); }
  };

  const handleOwnerStatusChange = async (customer: Customer) => {
    if (!ownerToken || updatingCustomerId !== null) return;
    setUpdatingCustomerId(customer.Id);
    try {
      if (customer.State === 'waiting') {
        await apiUpdateCustomerStatus({ QueueId: queueId, CustomerId: customer.Id, token: ownerToken });
        setCustomers(prev => sortUsers(prev.map(c => c.Id === customer.Id ? { ...c, State: 'in_progress' } : c)));
        showSuccess(t('owner.customerInProgress', '{{name}} is now in progress', { name: customer.Name }));
      } else if (customer.State === 'in_progress') {
        if (serveTimers.current.size > 0 || serveTimers.current.has(customer.Id)) return;
        setPendingServeIds(prev => new Set(prev).add(customer.Id));
        showUndo(
          t('owner.customerServed', '{{name}} marked as served', { name: customer.Name }),
          t('common.undo', 'Undo'),
          () => {
            const timer = serveTimers.current.get(customer.Id);
            if (timer) clearTimeout(timer);
            serveTimers.current.delete(customer.Id);
            setPendingServeIds(prev => { const next = new Set(prev); next.delete(customer.Id); return next; });
            showSuccess(t('owner.serveUndone', 'Serving cancelled. {{name}} is still in progress.', { name: customer.Name }));
          },
          5000,
        );
        const timer = setTimeout(async () => {
          serveTimers.current.delete(customer.Id);
          try {
            await apiServeCustomer({ QueueId: queueId, CustomerId: customer.Id, token: ownerToken });
            setCustomers(prev => prev.filter(c => c.Id !== customer.Id));
          } catch (e) {
            showError((e as Error).message || t('common.error'));
          } finally {
            setPendingServeIds(prev => { const next = new Set(prev); next.delete(customer.Id); return next; });
          }
        }, 5000);
        serveTimers.current.set(customer.Id, timer);
      }
    } catch (e) {
      showError((e as Error).message || t('common.error'));
    } finally {
      setUpdatingCustomerId(null);
    }
  };

  const handleOwnerBackstep = async (customer: Customer) => {
    if (!ownerToken || updatingCustomerId !== null) return;
    setUpdatingCustomerId(customer.Id);
    try {
      await apiRevertCustomerToWaiting({ QueueId: queueId, CustomerId: customer.Id, token: ownerToken });
      setCustomers(prev => sortUsers(prev.map(c => c.Id === customer.Id ? { ...c, State: 'waiting' } : c)));
      showSuccess(t('owner.customerBackToWaiting', '{{name}} moved back to waiting', { name: customer.Name }));
    } catch (e) {
      showError((e as Error).message || t('common.error'));
    } finally {
      setUpdatingCustomerId(null);
    }
  };

  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(queueUrl);
      showSuccess(t('common.copied', 'Copied!'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const shareQueue = async () => {
    try {
      await Share.share({ message: queueUrl, url: queueUrl });
    } catch { /* user dismissed the share sheet */ }
  };

  const openDashboard = () => {
    if (ownerToken) navigation.navigate('OwnerDashboard', { queueId });
    else navigation.navigate('ManageLogin', { queueId });
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle='dark-content' backgroundColor={Colors.bgPrimary} />
        <ActivityIndicator size='large' color={Colors.accent} />
      </SafeAreaView>
    );
  }

  // Queue not found — mirrors QueueNotFound on the web
  if (notFound) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle='dark-content' backgroundColor={Colors.bgPrimary} />
        <View style={styles.notFound}>
          <View style={styles.notFoundCircle}>
            <AppText style={styles.notFoundIcon}>{'\u26A0\uFE0E'}</AppText>
          </View>
          <View style={styles.notFoundTexts}>
            <AppText style={styles.notFoundTitle}>{t('queue.notFound')}</AppText>
            <AppText style={styles.notFoundDesc}>
              {t('queue.notFoundDesc', 'This queue does not exist or has been deleted.')}
            </AppText>
          </View>
          <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('Home')} activeOpacity={0.85}>
            <AppText style={styles.manageBtnText}>{'\u2302'} {t('nav.home', 'Go Home')}</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle='dark-content' backgroundColor={Colors.bgPrimary} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.accent]} tintColor={Colors.accent} />
        }
      >
        {/* Title + notice + QR + actions — one block, 24px gaps (web space-y-6) */}
        <View style={styles.topBlock}>
          {/* Queue title: h1 text-3xl font-bold accent, centered */}
          <AppText style={styles.title}>{queueName}</AppText>

          {/* Owner notice bar (web Owner Message Bar) */}
          {message != null && (
            <View style={styles.noticeBar}>
              <AppText style={styles.noticeIcon}>{'\u2709\uFE0E'}</AppText>
              <AppText style={styles.noticeText}>{message}</AppText>
            </View>
          )}

          {/* QR card (web QueueQrCard) */}
          <View style={styles.qrCard}>
            <View style={styles.qrWhiteBox}>
              <View style={styles.qrInner}>
                <QrCode value={queueUrl} size={180} />
              </View>
            </View>
            <AppText style={styles.qrUrl} writingDirection="ltr" numberOfLines={3}>{queueUrl}</AppText>
            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.btnOutline} onPress={copyLink} activeOpacity={0.85}>
                <AppText style={styles.btnOutlineText}>
                  {copied ? t('common.copied') : t('queue.copyLink', 'Copy link')}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimarySm} onPress={shareQueue} activeOpacity={0.85}>
                <AppText style={styles.btnPrimarySmText}>{t('queue.share', 'Share')}</AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Manage / Dashboard (web Action Buttons row) */}
          <TouchableOpacity style={styles.manageBtn} onPress={openDashboard} activeOpacity={0.85}>
            <AppText style={styles.manageBtnText}>
              {ownerToken ? t('queue.manageQueue', 'Manage queue') : t('queue.actions.manage')}
            </AppText>
          </TouchableOpacity>
        </View>
        {/* Customer list (web: max-w-3xl block, rows gap 12) */}
        <View style={styles.listBlock}>
          {customers.length === 0 ? (
            /* Empty state — mirrors NoCustomersFound */
            <View style={styles.emptyCard}>
              <View style={styles.emptyCircle}>
                <AppText style={styles.emptyIcon}>{'\u{1F464}'}</AppText>
              </View>
              <AppText style={styles.emptyTitle}>{t('queue.noCustomers')}</AppText>
              <AppText style={styles.emptyDesc}>{t('queue.noCustomersPublic')}</AppText>
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => navigation.navigate('Join', { queueId, ownerReturn: !!ownerToken })}
                activeOpacity={0.85}
              >
                <AppText style={styles.manageBtnText}>
                  {ownerToken ? t('queue.addToQueue', 'Add to Queue') : t('queue.joinQueue')}
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {customers.map((u) => {
                const hasCancelToken = !!getCancelToken(u.Id);
                const waitingOnly = customers.filter(x => x.State === 'waiting');
                const pos = waitingOnly.findIndex(x => x.Id === u.Id);
                const estimatedWait =
                  u.State === 'waiting' && pos >= 0 ? (pos + 1) * avgTime : null;
                const isServing = u.State === 'in_progress';
                const isDone = u.State === 'served';
                return (
                  <View key={u.Id} style={styles.waiterRow}>
                    <View style={styles.waiterSummary}>
                      <AppText style={styles.waiterName}>{u.Name}</AppText>
                    </View>
                    <View style={styles.waiterMetaRow}>
                      <View style={[
                        styles.statusChip,
                        isServing ? styles.statusServing : isDone ? styles.statusDone : styles.statusWaiting,
                      ]}>
                        <AppText style={[
                          styles.statusChipText,
                          isServing ? styles.statusServingText : isDone ? styles.statusDoneText : styles.statusWaitingText,
                        ]}>
                          {t(getStatusI18nKey(u.State), u.State)}
                        </AppText>
                      </View>
                      {estimatedWait != null && estimatedWait > 0 && (
                        <View style={styles.waitChip}>
                          <AppText style={styles.waitChipText}>
                            {'\u23F1 ~'}{estimatedWait} min
                          </AppText>
                        </View>
                      )}
                      </View>
                    {ownerToken && u.State !== 'served' ? (
                      <View style={styles.ownerActions}>
                        {u.State === 'in_progress' && (
                          <TouchableOpacity
                            style={[styles.ownerActionBtn, styles.ownerBackstepBtn, (updatingCustomerId !== null || pendingServeIds.size > 0) && styles.ownerActionDisabled]}
                            onPress={() => handleOwnerBackstep(u)}
                            disabled={updatingCustomerId !== null || pendingServeIds.size > 0}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel={t('owner.moveBack', 'Move {{name}} back to waiting', { name: u.Name })}
                          >
                            <AppText style={styles.ownerBackstepText}>↶ {t('owner.backToWaiting', 'Back to waiting')}</AppText>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.ownerActionBtn, u.State === 'in_progress' && styles.ownerServeBtn, (updatingCustomerId !== null || pendingServeIds.size > 0) && styles.ownerActionDisabled]}
                          onPress={() => handleOwnerStatusChange(u)}
                          disabled={updatingCustomerId !== null || pendingServeIds.size > 0}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel={u.State === 'waiting'
                            ? t('owner.startServing', 'Start serving {{name}}', { name: u.Name })
                            : t('owner.markServed', 'Mark {{name}} as served', { name: u.Name })}
                        >
                          <AppText style={styles.ownerActionText}>
                            {pendingServeIds.has(u.Id) ? t('owner.servingPending', 'Serving…') : updatingCustomerId === u.Id
                              ? t('queue.updating', 'Updating…')
                              : u.State === 'waiting'
                                ? t('owner.startServingAction', 'Start serving')
                                : t('owner.markServedAction', 'Mark served')}
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    ) : hasCancelToken && u.State === 'waiting' ? (
                        <View style={styles.rowActions}>
                          <View style={styles.snoozeWrap}>
                            <TouchableOpacity
                              style={styles.circleBtn}
                              onPress={() => handleSnooze(u)}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel={t('queue.moveBackOne', 'Move my place back one spot')}
                              accessibilityHint={t('queue.moveBackOneHint', 'Use this if you need more time. Your place moves back by one person.')}
                            >
                              <AppText style={styles.circleBtnText}>{'\u21BB'}</AppText>
                            </TouchableOpacity>
                            <AppText style={styles.snoozeLabel}>{t('queue.moveBackOneShort', 'Move back one place')}</AppText>
                          </View>
                          <TouchableOpacity
                            style={styles.circleBtn}
                            onPress={() => handleCancel(u)}
                            activeOpacity={0.7}
                            accessibilityLabel='Cancel'
                          >
                            <AppText style={styles.circleBtnText}>{'\u2715'}</AppText>
                          </TouchableOpacity>
                        </View>
                    ) : null}
                  </View>
                );
              })}

              {/* Join Queue button in customer mode */}
              <View style={styles.addRow}>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => navigation.navigate('Join', { queueId, ownerReturn: !!ownerToken })}
                  activeOpacity={0.85}
                >
                  <AppText style={styles.addBtnPlus}>+</AppText>
                  <AppText style={styles.addBtnText}>
                    {ownerToken
                      ? t('queue.addToQueue', 'Add to Queue')
                      : t('queue.joinQueue', 'Join Queue')}
                  </AppText>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgPrimary },
  center: { flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },

  // Page container: px-4 py-10, 32px gap between title-block and list (web gap-8)
  scroll: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.xxl,
  },
  // Title + notice + QR + actions: space-y-6 (24)
  topBlock: { gap: Spacing.lg, alignItems: 'stretch' },

  // h1: text-3xl font-bold, color accent, centered
  title: { fontSize: Typography.xxl, fontWeight: '700', color: Colors.accent, textAlign: 'center', flexShrink: 1, flexWrap: 'wrap' },

  // Owner notice bar: yellow tint, rounded-xl, envelope icon + centered text
  noticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',   // web exact
    borderColor: 'rgba(234, 179, 8, 0.4)',         // web exact
    borderWidth: 1,
    borderRadius: Radius.md,                       // rounded-xl
    paddingHorizontal: Spacing.base,               // px-4
    paddingVertical: Spacing.md,                   // py-3
    minHeight: 52,
    marginBottom: Spacing.lg,                      // web wrapper mb-6
  },
  noticeIcon: { fontSize: 18, color: Colors.warning },
  noticeText: { flex: 1, textAlign: 'center', fontSize: Typography.sm, color: Colors.textPrimary },

  // QR card — glass-card (surface, border, radius 1rem, shadow-md, p-6, max-w-448)
  qrCard: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.base,                             // space-y-4
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,                       // 1rem
    padding: Spacing.xl,                           // p-6
    ...Shadow.md,
  },
  qrWhiteBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,                       // rounded-xl
    padding: Spacing.base,                         // p-4
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Shadow.lg,                                  // shadow-lg
  },
  // Inner wrapper ensures QR grid never overflows the white card
  qrInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrUrl: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Spacing.base },

  // QR card action buttons: gap-3, btn-outline / btn-primary px-4 py-2 rounded-xl text-sm
  qrActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md },
  btnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
    backgroundColor: 'transparent',
  },
  btnOutlineText: { fontSize: Typography.sm, color: Colors.textPrimary, fontWeight: '500' },
  btnPrimarySm: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, backgroundColor: Colors.accent,
  },
  btnPrimarySmText: { fontSize: Typography.sm, color: Colors.accentContrast, fontWeight: '700' },

  // btn-primary px-6 py-3 rounded-xl (Manage / Dashboard / Join / Go Home)
  manageBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtnText: { color: Colors.accentContrast, fontSize: Typography.base, fontWeight: '700' },
  // Customer list block: rows gap 12 (web space-y-3), width 768 max on web
  listBlock: { width: '100%', gap: Spacing.md },

  // .waiter-row — rounded-2xl px-5 py-4 row space-between gap-4, glass surface
  waiterRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,                 // rounded-2xl
    paddingHorizontal: Spacing.lg,           // px-5
    paddingVertical: Spacing.base,           // py-4
    ...Shadow.sm,
  },
  waiterSummary: { flexDirection: 'row', alignItems: 'center' },
  waiterName: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary, flexWrap: 'wrap' },
  waiterMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

  // .status-chip — rounded-full px-3 py-1 text-xs font-semibold
  statusChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, justifyContent: 'center', alignSelf: 'flex-start' },
  statusChipText: { fontSize: Typography.sm, fontWeight: '700', flexShrink: 0, includeFontPadding: false },
  statusWaiting:    { backgroundColor: Colors.statusWaitingBg },
  statusWaitingText:{ color: Colors.textSecondary },
  statusServing:    { backgroundColor: Colors.statusProgressBg, borderWidth: 1, borderColor: Colors.statusProgress },
  statusServingText:{ color: Colors.statusProgress },
  statusDone:       { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  statusDoneText:   { color: Colors.textPrimary },

  // ETA chip — web inline style: indigo text-xs px-2 py-0.5 rounded-full
  waitChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',  // web exact
    borderColor: 'rgba(99, 102, 241, 0.3)',        // web exact
    borderWidth: 1,
  },
  waitChipText: { fontSize: Typography.xs, color: Colors.accentDark, fontWeight: '600' },

  // Snooze / cancel circle buttons (p-2 rounded-full, surface)
  rowActions: { flexDirection: 'row', gap: 4 },
  snoozeWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  snoozeLabel: { color: Colors.textSecondary, fontSize: Typography.xs },
  ownerActionBtn: { alignSelf: 'flex-end', minWidth: 118, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.accent },
  ownerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  ownerBackstepBtn: { flex: 1, minWidth: 120, backgroundColor: Colors.surfaceHover, borderWidth: 1, borderColor: Colors.accent },
  ownerBackstepText: { color: Colors.accentDark, fontSize: Typography.xs, fontWeight: '700' },
  ownerServeBtn: { flex: 1, minWidth: 100, backgroundColor: Colors.success },
  ownerActionDisabled: { opacity: 0.55 },
  ownerActionText: { color: Colors.accentContrast, fontSize: Typography.xs, fontWeight: '800' },
  circleBtn: {
    width: 34, height: 34, borderRadius: Radius.full,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  circleBtnText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },

  // Add to Queue — mt-6, surface pill px-6 py-3 rounded-xl, gap-2
  addRow: { marginTop: Spacing.lg, alignItems: 'center' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  addBtnPlus: { fontSize: 20, color: Colors.textPrimary },
  addBtnText: { fontSize: Typography.base, color: Colors.textPrimary },

  // NoCustomersFound — dashed glass card, p-8, icon circle + title + desc + Join
  emptyCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,                 // rounded-2xl
    padding: Spacing.xxxl,                   // p-8
    ...Shadow.md,
  },
  emptyCircle: {
    width: 64, height: 64, borderRadius: Radius.full,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  emptyIcon: { fontSize: 30, color: Colors.accent },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  emptyDesc: {
    fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center',
    marginTop: Spacing.xs,                    // mt-2
    marginBottom: Spacing.lg,                 // button mt-6
  },

  // QueueNotFound — centered, circle icon + texts + Go Home
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, padding: Spacing.xxxl },
  notFoundCircle: {
    width: 80, height: 80, borderRadius: Radius.full,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  notFoundIcon: { fontSize: 40, color: Colors.accent },
  notFoundTexts: { alignItems: 'center', gap: Spacing.sm },
  notFoundTitle: { fontSize: Typography.xxl, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  notFoundDesc: { fontSize: Typography.md, color: Colors.textMuted, textAlign: 'center' },
});





