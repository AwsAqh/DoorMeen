import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Image,
  ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, AppTextInput } from '../components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Spacing, Radius, Typography, Shadow } from '../constants/theme';
import { useOwnerQueues } from '../hooks/useOwnerSession';
import { useRecentQueues } from '../hooks/useRecentQueues';
import LanguageSwitcher from '../components/LanguageSwitcher';
const DoorMeenLogo = require('../../assets/doormeen-logo.png');

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/** Format a timestamp into a friendly relative label (e.g. "Just now", "2h ago"). */
function timeAgo(ts: number, arabic: boolean): string {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return arabic ? 'الآن' : 'Just now';
  if (mins  < 60)  return arabic ? `قبل ${mins} د` : `${mins}m ago`;
  if (hours < 24)  return arabic ? `قبل ${hours} س` : `${hours}h ago`;
  if (days  < 7)   return arabic ? `قبل ${days} ي` : `${days}d ago`;
  return new Date(ts).toLocaleDateString(arabic ? 'ar-PS' : 'en-US');
}

export default function HomeScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const ownerQueues = useOwnerQueues();
  const { queues: recentQueues, remove: removeRecent, refresh: refreshRecent } = useRecentQueues();
  const [openId, setOpenId] = useState('');

  // Refresh recent queues list every time the screen gains focus
  useFocusEffect(
    useCallback(() => {
      refreshRecent();
    }, [refreshRecent]),
  );

  const openQueue = () => {
    const id = openId.trim();
    if (id) navigation.navigate('Queue', { queueId: id });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgPrimary} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <Image source={DoorMeenLogo} style={styles.brandImage} accessibilityLabel="DoorMeen" />
            <View><AppText style={styles.brandName}>DoorMeen</AppText><AppText style={styles.brandCaption}>{t('home.brandCaption', 'A better way to take turns')}</AppText></View>
          </View>
          <LanguageSwitcher />
        </View>

        <View style={styles.hero}>
          <View style={styles.eyebrow}><View style={styles.liveDot} /><AppText style={styles.eyebrowText}>{t('home.testing', 'EARLY ACCESS')}</AppText></View>
          <AppText style={styles.appName}>{t('home.heroTitle', 'Your time matters.')}</AppText>
          <AppText style={styles.tagline}>{t('home.heroSubtitle', 'Join a queue, keep your place, and get on with your day.')}</AppText>
        </View>

        {/* ── Primary Actions ───────────────────────────────────────────── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.card, styles.cardPrimary]}
            onPress={() => navigation.navigate('Scan')}
            activeOpacity={0.85}
          >
            <View style={styles.cardTop}><AppText style={styles.cardIndex}>01</AppText><AppText style={styles.cardArrow}>↗</AppText></View>
            <AppText style={styles.cardTitle}>{t('home.scanQr', 'Scan QR Code')}</AppText>
            <AppText style={styles.cardSubtitle}>{t('home.scanDesc', 'Scan to join a queue instantly')}</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.cardSecondary]}
            onPress={() => navigation.navigate('CreateQueue')}
            activeOpacity={0.85}
          >
            <View style={styles.cardTop}><AppText style={styles.cardIndex}>02</AppText><AppText style={styles.cardArrow}>↗</AppText></View>
            <AppText style={styles.cardTitle}>{t('home.createQueue', 'Create Queue')}</AppText>
            <AppText style={styles.cardSubtitle}>{t('home.createDesc', 'Set up a new queue for your business')}</AppText>
          </TouchableOpacity>
        </View>

        {/* ── Open by Queue ID (manual entry, no QR needed) ────────────────── */}
        <View style={styles.openSection}>
          <AppText style={styles.openLabel}>{t('home.queueIdLabel', 'Have a queue code?')}</AppText>
          <View style={styles.openWrap}>
          <AppTextInput
            style={styles.openInput}
            placeholder={t('home.queueIdPlaceholder', 'Enter Queue ID')}
            placeholderTextColor={Colors.textMuted}
            value={openId}
            onChangeText={setOpenId}
            autoCapitalize="none"
            autoCorrect={false}
            textAlign="left"
            onSubmitEditing={openQueue}
          />
          <TouchableOpacity style={styles.openBtn} onPress={openQueue} activeOpacity={0.85}>
            <AppText style={styles.openBtnText}>{t('home.open', 'Open')}</AppText>
          </TouchableOpacity>
          </View>
        </View>

        {/* ── Recent Queues ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>{t('home.recentQueues', 'Recent Queues')}</AppText>
            {recentQueues.length > 0 && (
              <AppText style={styles.sectionCount}>{recentQueues.length}</AppText>
            )}
          </View>

          {recentQueues.length === 0 ? (
            <View style={styles.emptyRecent}>
              <View style={styles.emptyRecentMark}><View style={styles.emptyRecentHand} /></View>
              <AppText style={styles.emptyRecentText}>{t('home.noRecentQueues', 'No recent queues yet')}</AppText>
              <AppText style={styles.emptyRecentSub}>Queues you visit will appear here</AppText>
            </View>
          ) : (
            recentQueues.map((q) => (
              <TouchableOpacity
                key={q.id}
                style={styles.recentItem}
                onPress={() => navigation.navigate('Queue', { queueId: q.id })}
                activeOpacity={0.8}
              >
                {/* Left: icon + text */}
                <View style={styles.recentLeft}>
                  <View style={styles.recentIconWrap}>
                    <AppText style={styles.recentIcon}>↗</AppText>
                  </View>
                  <View style={styles.recentTexts}>
                    <AppText style={styles.recentName} numberOfLines={1}>{q.name}</AppText>
                    <AppText style={styles.recentId} writingDirection="ltr" numberOfLines={1}>{q.id}</AppText>
                    <AppText style={styles.recentTime}>{timeAgo(q.visitedAt, i18n.language === 'ar')}</AppText>
                  </View>
                </View>

                {/* Right: chevron + delete */}
                <View style={styles.recentRight}>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={(event) => { event.stopPropagation(); removeRecent(q.id); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <AppText style={styles.deleteBtnText}>✕</AppText>
                  </TouchableOpacity>
                  <AppText style={styles.chevron}>›</AppText>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── My Queues (owner) ─────────────────────────────────────────── */}
        {ownerQueues.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle}>{t('home.myQueues', 'My Queues')}</AppText>
              <AppText style={styles.sectionCount}>{ownerQueues.length}</AppText>
            </View>
            {ownerQueues.map(({ id }) => (
              <TouchableOpacity
                key={id}
                style={styles.queueItem}
                onPress={() => navigation.navigate('OwnerDashboard', { queueId: id })}
                activeOpacity={0.8}
              >
                <View style={styles.queueItemLeft}>
                  <View style={styles.queueItemMark} />
                  <AppText style={styles.queueItemId} writingDirection="ltr" numberOfLines={1}>{id}</AppText>
                </View>
                <AppText style={styles.chevron}>›</AppText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <AppText style={styles.footer}>DoorMeen © 2025</AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.bgPrimary },
  scroll:       { flexGrow: 1, paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxl },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.md },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brandImage: { width: 42, height: 42, borderRadius: Radius.md },
  brandName: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: '800', letterSpacing: 0.2 },
  brandCaption: { color: Colors.textMuted, fontSize: 10, marginTop: 1 },
  hero: { alignItems: 'flex-start', paddingTop: Spacing.xxxl, paddingBottom: Spacing.xl },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: 'rgba(244,189,90,0.32)', backgroundColor: Colors.highlightBg, borderRadius: Radius.full, paddingHorizontal: 11, paddingVertical: 6, marginBottom: Spacing.md },
  liveDot: { width: 6, height: 6, borderRadius: Radius.full, backgroundColor: Colors.highlight },
  eyebrowText: { color: Colors.highlight, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  appName: { maxWidth: 340, fontSize: Typography.display, lineHeight: 48, fontWeight: '800', color: Colors.accentDark, letterSpacing: -1.2 },
  tagline: { maxWidth: 330, fontSize: Typography.base, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 24 },

  // Action cards
  actions: { gap: Spacing.md, marginBottom: Spacing.xl },
  card: { borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: 1, minHeight: 154, ...Shadow.md },
  cardPrimary: { backgroundColor: Colors.surfaceHover, borderColor: 'rgba(245,154,23,0.45)' },
  cardSecondary: { backgroundColor: Colors.surface, borderColor: Colors.surfaceBorder },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
  cardIndex: { color: Colors.accent, fontSize: Typography.xs, fontWeight: '800', letterSpacing: 1.4 },
  cardArrow: { color: Colors.highlight, fontSize: 22, fontWeight: '500' },
  cardTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  cardSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 21 },

  // Manual queue open
  openSection: { marginBottom: Spacing.xl },
  openLabel: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '700', marginBottom: Spacing.sm },
  openWrap: { flexDirection: 'row', gap: Spacing.sm },
  openInput: { flex: 1, writingDirection: 'ltr', textAlign: 'left', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: Typography.base },
  openBtn:      { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  openBtnText:  { color: Colors.accentContrast, fontWeight: '800', fontSize: Typography.base },

  // Section header (shared)
  section:      { marginBottom: Spacing.xl },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.base, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionCount: {
    fontSize: Typography.xs, fontWeight: '700',
    color: Colors.accent,
    backgroundColor: Colors.statusProgressBg,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },

  // Recent queues — empty state
  emptyRecent:  {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.xs,
  },
  emptyRecentMark: { width: 36, height: 36, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.highlight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  emptyRecentHand: { width: 2, height: 10, backgroundColor: Colors.highlight, marginTop: -7 },
  emptyRecentText:{ fontSize: Typography.sm, fontWeight: '600', color: Colors.textSecondary },
  emptyRecentSub: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },

  // Recent queues — row
  recentItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    ...Shadow.sm,
  },
  recentLeft:    { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.sm },
  recentIconWrap:{
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: Colors.statusProgressBg,
    alignItems: 'center', justifyContent: 'center',
  },
  recentIcon:    { fontSize: 18 },
  recentTexts:   { flex: 1 },
  recentName:    { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  recentId:      { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 1 },
  recentTime:    { fontSize: Typography.xs, color: Colors.accent, marginTop: 2, fontWeight: '500' },
  recentRight:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  deleteBtn:     {
    width: 26, height: 26, borderRadius: Radius.full,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 11, color: '#ef4444', fontWeight: '700' },

  // My queues section
  queueItem:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.base, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  queueItemLeft:{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.sm },
  queueItemMark: { width: 8, height: 30, borderRadius: Radius.full, backgroundColor: Colors.accent },
  queueItemId:  { fontSize: Typography.sm, color: Colors.textPrimary, flex: 1 },
  chevron:      { fontSize: 22, color: Colors.textMuted },

  footer:       { textAlign: 'center', color: Colors.textMuted, fontSize: Typography.xs, marginTop: Spacing.xxl },
});

