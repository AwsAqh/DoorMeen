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
  View, StyleSheet, TouchableOpacity, ScrollView, Platform,
  StatusBar, ActivityIndicator, Alert, RefreshControl, Share, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Spacing, Radius, Typography, Shadow } from '../constants/theme';
import {
  apiGetQueuePublic, apiCancelRegistration, apiSnoozeRegistration,
  apiUpdateCustomerStatus, apiServeCustomer, apiRevertCustomerToWaiting,
  apiSetQueuePushNotification, getCancelToken, getOwnerToken, clearOwnerToken, saveRecentQueue,
} from '../features/queue/services/api';
import { useQueueSignalR } from '../hooks/useQueueSignalR';
import { isTokenValid } from '../hooks/useOwnerSession';
import { Status, RANK, getStatusI18nKey } from '../constants/status';
import QrCode from '../components/QrCode';
import { useToast } from '../components/Toast';
import FirstTimeGuide from '../components/FirstTimeGuide';
import AdSpaceBanner from '../components/AdSpaceBanner';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type Props = NativeStackScreenProps<RootStackParamList, 'Queue'>;

/** Backend QueueCustomerDTO: Id, Name, CreatedAt, State (no phone publicly). */
type Customer = {
  Id: number;
  Name: string;
  State: Status;
  CreatedAt?: string;
  NotifyWhenRemaining?: number | null;
};

/** Same value the web encodes: window.location.origin + /queue/{id}. */
const WEB_ORIGIN = 'https://door-meen.vercel.app';

function parseClosingTime(resetTime: unknown): string {
  if (!resetTime) return '';
  let hours: number | null = null;
  let minutes: number | null = null;
  if (typeof resetTime === 'string') {
    const match = resetTime.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
    }
  } else if (typeof resetTime === 'object' && resetTime !== null) {
    const obj = resetTime as { hours?: number; Hours?: number; minutes?: number; Minutes?: number };
    hours = obj.hours ?? obj.Hours ?? 0;
    minutes = obj.minutes ?? obj.Minutes ?? 0;
  }
  if (hours === null || minutes === null || isNaN(hours) || isNaN(minutes)) return '';
  const d = new Date(0, 0, 0, hours, minutes);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const normalizeCustomer = (raw: unknown): Customer | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = r.Id ?? r.id;
  if (typeof id !== 'number') return null;
  const state = r.State ?? r.state ?? r.Status ?? r.status;
  const name = r.Name ?? r.name;
  const createdAt = r.CreatedAt ?? r.createdAt;
  const notifyWhenRemaining = r.NotifyWhenRemaining ?? r.notifyWhenRemaining;
  return {
    Id: id,
    Name: typeof name === 'string' ? name : '',
    State: typeof state === 'string' ? (state as Status) : 'waiting',
    CreatedAt: typeof createdAt === 'string' ? createdAt : undefined,
    NotifyWhenRemaining: typeof notifyWhenRemaining === 'number' ? notifyWhenRemaining : null,
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

  const [queueName,    setQueueName]    = useState(queueId);
  const [message,      setMessage]      = useState<string | null>(null);
  const [avgTime,      setAvgTime]      = useState<number>(15);
  const [closingTime,  setClosingTime]  = useState<string>('');
  const [barberPhone,  setBarberPhone]  = useState<string>('');
  const [location,     setLocation]     = useState<string>('');
  const [metadata,     setMetadata]     = useState<string>('');
  const [customers,    setCustomers]    = useState<Customer[]>([]);
  const [ownerToken,   setOwnerToken]   = useState<string | null>(null);
  const [notFound,     setNotFound]     = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [notifyThreshold, setNotifyThreshold] = useState(1);
  const [pushEnabled,  setPushEnabled]  = useState(false);
  const [savingPush, setSavingPush] = useState(false);
  const [updatingCustomerId, setUpdatingCustomerId] = useState<number | null>(null);
  const [pendingServeIds, setPendingServeIds] = useState<Set<number>>(() => new Set());
  const serveTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const queueUrl = `${WEB_ORIGIN}/queue/${queueId}`;
  const myCustomer = customers.find(c => !!getCancelToken(c.Id) && c.State === 'waiting');

  const savePushSetting = async (threshold: number | null) => {
    if (!myCustomer) return;
    setSavingPush(true);
    try {
      if (threshold === null) {
        const token = getCancelToken(myCustomer.Id);
        if (!token) throw new Error(t('queue.notifyUnavailable', 'Your queue spot could not be found.'));
        await apiSetQueuePushNotification({ queueId, customerId: myCustomer.Id, cancelToken: token, pushToken: '', notifyWhenRemaining: null });
        setPushEnabled(false);
        return;
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('queue-updates', {
          name: 'Queue updates', importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250], lightColor: '#D8A44A',
        });
      }
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) throw new Error(t('queue.notifyPermission', 'Allow notifications in your device settings to turn on queue alerts.'));

      const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
      const pushOptions = projectId && projectId !== 'YOUR_EAS_PROJECT_ID' ? { projectId } : {};
      const pushToken = (await Notifications.getExpoPushTokenAsync(pushOptions)).data;
      const cancelToken = getCancelToken(myCustomer.Id);
      if (!cancelToken) throw new Error(t('queue.notifyUnavailable', 'Your queue spot could not be found.'));
      await apiSetQueuePushNotification({ queueId, customerId: myCustomer.Id, cancelToken, pushToken, notifyWhenRemaining: threshold });
      setNotifyThreshold(threshold);
      setPushEnabled(true);
      showSuccess(t('queue.notifySaved', 'Queue alert enabled'));
    } catch (error) {
      showError((error as Error).message || t('common.error'));
    } finally {
      setSavingPush(false);
    }
  };

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
      const mySpot = list.find(c => !!getCancelToken(c.Id) && c.State === 'waiting');
      if (mySpot?.NotifyWhenRemaining != null) {
        setNotifyThreshold(mySpot.NotifyWhenRemaining);
        setPushEnabled(true);
      } else {
        setPushEnabled(false);
      }
      const storedOwnerToken = getOwnerToken(queueId);
      setOwnerToken(storedOwnerToken && isTokenValid(storedOwnerToken) ? storedOwnerToken : null);
      setNotFound(false);
      
      const phone = data.BarberPhoneNumber ?? data.barberPhoneNumber;
      setBarberPhone(typeof phone === 'string' ? phone : '');
      const loc = data.Location ?? data.location;
      setLocation(typeof loc === 'string' ? loc : '');
      const meta = data.Metadata ?? data.metadata;
      setMetadata(typeof meta === 'string' ? meta : '');

      // Extract closing time (DailyResetTime) from queue data
      const dailyReset = data.DailyResetTime ?? data.dailyResetTime;
      setClosingTime(parseClosingTime(dailyReset));
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

  const confirmSwap = (customer: Customer) => {
    Alert.alert(
      t('queue.swapConfirmTitle', 'Swap spot with next person?'),
      t('queue.swapConfirmMessage', 'Running late? You will switch places with the customer directly behind you.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('queue.swapAction', 'Swap spot'),
          style: 'default',
          onPress: () => handleSnooze(customer),
        },
      ],
    );
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

  const handleSignOutOwner = () => {
    Alert.alert(
      t('owner.signOutTitle', 'Sign out as owner?'),
      t('owner.signOutMsg', 'You will switch to customer view and can sign back in with your PIN anytime.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('owner.signOut', 'Sign out'),
          style: 'destructive',
          onPress: () => {
            clearOwnerToken(queueId);
            setOwnerToken(null);
            showSuccess(t('owner.signedOut', 'Signed out from owner mode'));
          },
        },
      ],
    );
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
          {closingTime !== '' && (
            <View style={styles.closingBadge}>
              <AppText style={styles.closingBadgeText}>
                {t('queue.closesAt', { time: closingTime })}
              </AppText>
            </View>
          )}

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

          {/* Manage / Dashboard or Owner Control Bar */}
          {ownerToken ? (
            <View style={styles.ownerBar}>
              <View style={styles.ownerBarBadge}>
                <AppText style={styles.ownerBarBadgeText}>👑 {t('queue.signedInAsOwner', 'Managing Queue')}</AppText>
              </View>
              <View style={styles.ownerBarButtons}>
                <TouchableOpacity style={styles.ownerDashboardBtn} onPress={openDashboard} activeOpacity={0.85}>
                  <AppText style={styles.ownerDashboardBtnText}>{t('queue.dashboard', 'Dashboard')}</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ownerSignOutBtn} onPress={handleSignOutOwner} activeOpacity={0.85}>
                  <AppText style={styles.ownerSignOutBtnText}>{t('owner.signOut', 'Sign out')}</AppText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.manageBtn} onPress={openDashboard} activeOpacity={0.85}>
              <AppText style={styles.manageBtnText}>
                {t('queue.actions.manage', 'Manage')}
              </AppText>
            </TouchableOpacity>
          )}

          {/* Metadata Card: notice, services, contact phone, location, closing time, avg time */}
          {(metadata !== '' || barberPhone !== '' || location !== '' || closingTime !== '' || avgTime > 0) && (
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <View style={styles.infoIconCircle}>
                  <AppText style={styles.infoIcon}>ⓘ</AppText>
                </View>
                <View style={styles.infoTitleWrap}>
                  <AppText style={styles.infoCardTitle}>{t('queue.infoTitle', 'Queue Information')}</AppText>
                  <AppText style={styles.infoCardSubtitle} numberOfLines={1}>{queueName}</AppText>
                </View>
              </View>

              <View style={styles.infoContent}>
                {metadata !== '' && (
                  <View style={styles.infoSection}>
                    <AppText style={styles.infoLabel}>{t('queue.metadataLabel', 'Notice & Services')}</AppText>
                    <View style={styles.infoTextBox}>
                      <AppText style={styles.infoTextValue}>{metadata}</AppText>
                    </View>
                  </View>
                )}

                {barberPhone !== '' && (
                  <TouchableOpacity
                    style={styles.infoRow}
                    onPress={() => Linking.openURL(`tel:${barberPhone}`).catch(() => {})}
                    activeOpacity={0.7}
                  >
                    <AppText style={styles.infoRowIcon}>📞</AppText>
                    <View style={styles.infoRowTextWrap}>
                      <AppText style={styles.infoLabel}>{t('queue.phone', 'Phone')}</AppText>
                      <AppText style={styles.infoPhoneLink} writingDirection="ltr">{barberPhone}</AppText>
                    </View>
                  </TouchableOpacity>
                )}

                {location !== '' && (
                  <View style={styles.infoRow}>
                    <AppText style={styles.infoRowIcon}>📍</AppText>
                    <View style={styles.infoRowTextWrap}>
                      <AppText style={styles.infoLabel}>{t('queue.location', 'Location')}</AppText>
                      <AppText style={styles.infoRowValue}>{location}</AppText>
                    </View>
                  </View>
                )}

                {closingTime !== '' && (
                  <View style={styles.infoRow}>
                    <AppText style={styles.infoRowIcon}>🕒</AppText>
                    <View style={styles.infoRowTextWrap}>
                      <AppText style={styles.infoLabel}>{t('queue.closingTime', 'Closing Time')}</AppText>
                      <AppText style={styles.infoRowValue}>{t('queue.closesAt', { time: closingTime })}</AppText>
                    </View>
                  </View>
                )}

                {avgTime > 0 && (
                  <View style={styles.infoRow}>
                    <AppText style={styles.infoRowIcon}>⚡</AppText>
                    <View style={styles.infoRowTextWrap}>
                      <AppText style={styles.infoLabel}>{t('queue.avgTime', 'Avg. Service Time')}</AppText>
                      <AppText style={styles.infoRowValue}>~{avgTime} {t('queue.minPerPerson', 'min / person')}</AppText>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {myCustomer && (
            <View style={styles.notifyCard}>
              <AppText style={styles.notifyTitle}>{t('queue.notifyMeWhen', 'Notify me when…')}</AppText>
              <AppText style={styles.notifyDescription}>{t('queue.notifyDescription', 'Choose how many customers can be ahead of you, including anyone currently being served.')}</AppText>
              <View style={styles.notifyChoices}>
                {[0, 1, 2, 3, 5].map(value => (
                  <TouchableOpacity key={value} style={[styles.notifyChoice, notifyThreshold === value && styles.notifyChoiceSelected]} onPress={() => setNotifyThreshold(value)} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: notifyThreshold === value }}>
                    <AppText style={[styles.notifyChoiceText, notifyThreshold === value && styles.notifyChoiceSelectedText]}>{value === 0 ? t('queue.notifyNext', 'Next') : `${value}`}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.notifyActions}>
                <TouchableOpacity disabled={savingPush} style={styles.notifyEnable} onPress={() => savePushSetting(notifyThreshold)} activeOpacity={0.8}>
                  <AppText style={styles.notifyEnableText}>{savingPush ? t('common.loading') : pushEnabled ? t('queue.updateAlert', 'Update alert') : t('queue.enableAlert', 'Enable push alert')}</AppText>
                </TouchableOpacity>
                {pushEnabled && <TouchableOpacity disabled={savingPush} onPress={() => savePushSetting(null)}><AppText style={styles.notifyDisable}>{t('queue.turnOffAlert', 'Turn off')}</AppText></TouchableOpacity>}
              </View>
            </View>
          )}
        </View>
        {/* Ad space banner */}
        <AdSpaceBanner variant="queue" />

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
                  {t('queue.joinQueue')}
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {customers.map((u) => {
                const hasCancelToken = !!getCancelToken(u.Id);
                const isMine = hasCancelToken;
                const waitingOnly = customers.filter(x => x.State === 'waiting');
                const pos = waitingOnly.findIndex(x => x.Id === u.Id);
                const mySpotNumber = pos >= 0 ? pos + 1 : null;
                const estimatedWait =
                  u.State === 'waiting' && pos >= 0 ? (pos + 1) * avgTime : null;
                const isServing = u.State === 'in_progress';
                const isDone = u.State === 'served';
                return (
                  <View key={u.Id} style={[styles.waiterRow, isMine && styles.waiterRowMine]}>
                    {isMine && (
                      <View style={styles.mySpotHeader}>
                        <View style={styles.mySpotPill}>
                          <AppText style={styles.mySpotPillText}>
                            ✨ {mySpotNumber ? `${t('queue.yourSpot', 'Your spot')}: #${mySpotNumber}` : t('queue.you', 'You')}
                          </AppText>
                        </View>
                        {isServing && (
                          <View style={styles.myTurnNowPill}>
                            <AppText style={styles.myTurnNowText}>⚡ {t('queue.yourTurnNow', "It's your turn now!")}</AppText>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={styles.waiterSummary}>
                      <AppText style={[styles.waiterName, isMine && styles.waiterNameMine]}>{u.Name}</AppText>
                      {mySpotNumber && !isMine && (
                        <View style={styles.spotNumberPill}>
                          <AppText style={styles.spotNumberPillText}>#{pos + 1}</AppText>
                        </View>
                      )}
                    </View>
                    <View style={styles.waiterMetaRow}>
                      <View style={[
                        styles.statusChip,
                        isServing ? styles.statusServing : isDone ? styles.statusDone : isMine ? styles.statusWaitingMine : styles.statusWaiting,
                      ]}>
                        <AppText style={[
                          styles.statusChipText,
                          isServing ? styles.statusServingText : isDone ? styles.statusDoneText : isMine ? styles.statusWaitingMineText : styles.statusWaitingText,
                        ]}>
                          {t(getStatusI18nKey(u.State), u.State)}
                        </AppText>
                      </View>
                      {estimatedWait != null && estimatedWait > 0 && (
                        <View style={[styles.waitChip, isMine && styles.waitChipMine]}>
                          <AppText style={[styles.waitChipText, isMine && styles.waitChipMineText]}>
                            ⏱ ~{estimatedWait} min
                          </AppText>
                        </View>
                      )}
                    </View>

                    {isMine && u.State === 'waiting' && (
                      <View style={styles.myRowActions}>
                        <TouchableOpacity
                          style={styles.swapActionBtn}
                          onPress={() => confirmSwap(u)}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel={t('queue.swapSpot', 'Delay spot (swap with next)')}
                        >
                          <AppText style={styles.swapActionIcon}>⇄</AppText>
                          <AppText style={styles.swapActionText}>
                            {t('queue.swapSpot', 'Delay spot (swap with next)')}
                          </AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.leaveActionBtn}
                          onPress={() => handleCancel(u)}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel={t('queue.leaveQueue', 'Leave queue')}
                        >
                          <AppText style={styles.leaveActionIcon}>✕</AppText>
                          <AppText style={styles.leaveActionText}>
                            {t('queue.leaveQueue', 'Leave queue')}
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    )}
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
      <FirstTimeGuide guideId="queue_view_ads" delay={1000} />
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
  closingBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadow.sm,
  },
  closingBadgeText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: '600' },

  // Info / Metadata card
  infoCard: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(216, 164, 74, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: { fontSize: 16, color: Colors.accent, fontWeight: '700' },
  infoTitleWrap: { flex: 1 },
  infoCardTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  infoCardSubtitle: { fontSize: Typography.xs, color: Colors.textMuted },
  infoContent: { gap: Spacing.md },
  infoSection: { gap: 4 },
  infoLabel: { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoTextBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  infoTextValue: { fontSize: Typography.sm, color: Colors.textPrimary, lineHeight: 20 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  infoRowIcon: { fontSize: 18 },
  infoRowTextWrap: { flex: 1 },
  infoPhoneLink: { fontSize: Typography.sm, color: Colors.accent, fontWeight: '700', marginTop: 2 },
  infoRowValue: { fontSize: Typography.sm, color: Colors.textPrimary, fontWeight: '500', marginTop: 2 },

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
  notifyCard: { width: '100%', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm, ...Shadow.sm },
  notifyTitle: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  notifyDescription: { fontSize: Typography.sm, color: Colors.textMuted, lineHeight: 20 },
  notifyChoices: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  notifyChoice: { minWidth: 44, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder },
  notifyChoiceSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  notifyChoiceText: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '600' },
  notifyChoiceSelectedText: { color: Colors.accentContrast },
  notifyActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginTop: Spacing.xs },
  notifyEnable: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  notifyEnableText: { color: Colors.accentContrast, fontSize: Typography.sm, fontWeight: '700' },
  notifyDisable: { color: Colors.danger, fontSize: Typography.sm, fontWeight: '600' },

  // Owner status bar when signed in
  ownerBar: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  ownerBarBadge: { alignSelf: 'flex-start' },
  ownerBarBadgeText: { fontSize: Typography.xs, color: Colors.accentDark, fontWeight: '700' },
  ownerBarButtons: { flexDirection: 'row', gap: Spacing.sm },
  ownerDashboardBtn: {
    flex: 2,
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerDashboardBtnText: { color: Colors.accentContrast, fontSize: Typography.sm, fontWeight: '700' },
  ownerSignOutBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceHover,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerSignOutBtnText: { color: Colors.danger, fontSize: Typography.sm, fontWeight: '600' },

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
  waiterRowMine: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    ...Shadow.md,
  },
  mySpotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 2,
  },
  mySpotPill: {
    backgroundColor: '#10B981',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  mySpotPillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: Typography.xs,
    letterSpacing: 0.3,
  },
  myTurnNowPill: {
    backgroundColor: '#059669',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  myTurnNowText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: Typography.xs,
  },
  waiterSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waiterName: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary, flexWrap: 'wrap' },
  waiterNameMine: { color: '#065F46', fontWeight: '800', fontSize: Typography.lg },
  spotNumberPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  spotNumberPillText: { fontSize: Typography.xs, fontWeight: '700', color: Colors.textSecondary },
  otherSpotNumber: { fontSize: Typography.xs, fontWeight: '700', color: Colors.textMuted },
  statusWaitingMine: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  statusWaitingMineText: {
    color: '#047857',
    fontWeight: '700',
  },
  waitChipMine: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  waitChipMineText: {
    color: '#047857',
    fontWeight: '700',
  },
  myRowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.2)',
  },
  swapActionBtn: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
  },
  swapActionIcon: { fontSize: 16, color: '#047857', fontWeight: '800' },
  swapActionText: { fontSize: Typography.xs, color: '#047857', fontWeight: '800' },
  leaveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
  },
  leaveActionIcon: { fontSize: 13, color: Colors.danger, fontWeight: '700' },
  leaveActionText: { fontSize: Typography.xs, color: Colors.danger, fontWeight: '700' },
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





