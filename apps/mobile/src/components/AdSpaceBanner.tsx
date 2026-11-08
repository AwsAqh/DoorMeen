/**
 * AdSpaceBanner — highlights where ads will appear + free ad draw contest info.
 *
 * Placed on HomeScreen and QueueScreen to show users where advertisers
 * can promote, and to promote the free ad draw for early adopters.
 */
import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Modal, Pressable,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { Colors, Spacing, Radius, Typography, Shadow } from '../constants/theme';

interface Props {
  /** 'home' shows the larger promotional card; 'queue' shows an inline banner */
  variant: 'home' | 'queue';
}

export default function AdSpaceBanner({ variant }: Props) {
  const { t } = useTranslation();
  const [showDrawModal, setShowDrawModal] = useState(false);

  return (
    <>
      {variant === 'home' ? (
        /* ── Home: large promotional card ──────────────────────────────── */
        <View style={styles.homeCard}>
          {/* Simulated ad slot indicator */}
          <View style={styles.adSlotPreview}>
            <View style={styles.adSlotDashed}>
              <AppText style={styles.adSlotIcon}>📢</AppText>
              <AppText style={styles.adSlotLabel}>
                {t('adSpace.slotLabel', 'YOUR AD HERE')}
              </AppText>
              <AppText style={styles.adSlotSub}>
                {t('adSpace.slotSub', 'Premium ad space — seen by every customer')}
              </AppText>
            </View>
          </View>

          {/* Draw promo */}
          <View style={styles.drawPromo}>
            <View style={styles.drawBadge}>
              <AppText style={styles.drawBadgeText}>🎁 {t('adSpace.drawBadge', 'FREE ADS DRAW')}</AppText>
            </View>
            <AppText style={styles.drawTitle}>
              {t('adSpace.drawTitle', 'Win a FREE month of ad space!')}
            </AppText>
            <AppText style={styles.drawDesc}>
              {t('adSpace.drawDesc', 'Create a queue, use it for one full day, and your name enters the draw automatically.')}
            </AppText>
            <TouchableOpacity style={styles.drawBtn} onPress={() => setShowDrawModal(true)} activeOpacity={0.85}>
              <AppText style={styles.drawBtnText}>
                {t('adSpace.viewConditions', 'View draw conditions →')}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ── Queue: inline banner ─────────────────────────────────────── */
        <View style={styles.queueBanner}>
          <View style={styles.queueBannerInner}>
            <View style={styles.queueAdSlot}>
              <AppText style={styles.queueAdIcon}>📢</AppText>
              <View style={styles.queueAdTexts}>
                <AppText style={styles.queueAdLabel}>
                  {t('adSpace.queueAdLabel', 'Ad space')}
                </AppText>
                <AppText style={styles.queueAdSub}>
                  {t('adSpace.queueAdSub', 'Your business could be here')}
                </AppText>
              </View>
            </View>
            <TouchableOpacity
              style={styles.queueDrawPill}
              onPress={() => setShowDrawModal(true)}
              activeOpacity={0.8}
            >
              <AppText style={styles.queueDrawPillText}>
                🎁 {t('adSpace.winFree', 'Win free ads!')}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Draw conditions modal ───────────────────────────────────── */}
      <Modal visible={showDrawModal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowDrawModal(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDrawModal(false)} />
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <AppText style={styles.modalIcon}>🏆</AppText>
                <AppText style={styles.modalTitle}>
                  {t('adSpace.modalTitle', 'Free Ad Space Draw')}
                </AppText>
                <AppText style={styles.modalSubtitle}>
                  {t('adSpace.modalSubtitle', 'Here\'s how you can win a full month of free advertising on DoorMeen')}
                </AppText>
              </View>

              {/* Conditions */}
              <View style={styles.conditionsBlock}>
                <AppText style={styles.conditionsHeading}>
                  {t('adSpace.conditionsTitle', 'How to enter the draw')}
                </AppText>

                {[
                  {
                    num: '1',
                    titleKey: 'adSpace.cond1Title',
                    titleFb: 'Create a queue',
                    descKey: 'adSpace.cond1Desc',
                    descFb: 'Sign up and create a queue with a valid email address.',
                  },
                  {
                    num: '2',
                    titleKey: 'adSpace.cond2Title',
                    titleFb: 'Use it for one full day',
                    descKey: 'adSpace.cond2Desc',
                    descFb: 'Serve at least one customer through your queue in a single business day.',
                  },
                  {
                    num: '3',
                    titleKey: 'adSpace.cond3Title',
                    titleFb: 'Automatic entry',
                    descKey: 'adSpace.cond3Desc',
                    descFb: 'Your name and email are automatically entered into the monthly draw. No extra steps needed!',
                  },
                ].map(({ num, titleKey, titleFb, descKey, descFb }) => (
                  <View key={num} style={styles.condRow}>
                    <View style={styles.condNum}>
                      <AppText style={styles.condNumText}>{num}</AppText>
                    </View>
                    <View style={styles.condTexts}>
                      <AppText style={styles.condTitle}>{t(titleKey, titleFb)}</AppText>
                      <AppText style={styles.condDesc}>{t(descKey, descFb)}</AppText>
                    </View>
                  </View>
                ))}
              </View>

              {/* What you win */}
              <View style={styles.prizeBlock}>
                <AppText style={styles.prizeHeading}>
                  {t('adSpace.prizeTitle', 'What you win')}
                </AppText>
                <AppText style={styles.prizeDesc}>
                  {t('adSpace.prizeDesc', '🎯 One full month of ad space on DoorMeen queue pages and home screen — seen by every customer who waits in any queue.')}
                </AppText>
              </View>

              {/* Fine print */}
              <AppText style={styles.finePrint}>
                {t('adSpace.finePrint', 'Winners are announced at the end of each month. One entry per queue per day. DoorMeen reserves the right to modify draw terms.')}
              </AppText>
            </ScrollView>

            <Pressable style={styles.modalBtn} onPress={() => setShowDrawModal(false)} accessibilityRole="button">
              <AppText style={styles.modalBtnText}>{t('adSpace.modalClose', 'Got it!')}</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  /* ── Home variant ─────────────────────────────────────── */
  homeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    ...Shadow.md,
  },
  adSlotPreview: {
    padding: Spacing.base,
  },
  adSlotDashed: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(245,154,23,0.35)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    backgroundColor: 'rgba(245,154,23,0.04)',
  },
  adSlotIcon: { fontSize: 28, marginBottom: Spacing.xs },
  adSlotLabel: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  adSlotSub: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  drawPromo: {
    backgroundColor: Colors.highlightBg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  drawBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  drawBadgeText: {
    color: Colors.accentContrast,
    fontSize: Typography.xs,
    fontWeight: '800',
  },
  drawTitle: {
    fontSize: Typography.md,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  drawDesc: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  drawBtn: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  drawBtnText: {
    color: Colors.accentDark,
    fontSize: Typography.sm,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* ── Queue variant ────────────────────────────────────── */
  queueBanner: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  queueBannerInner: {
    gap: Spacing.sm,
  },
  queueAdSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(245,154,23,0.3)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    backgroundColor: 'rgba(245,154,23,0.04)',
  },
  queueAdIcon: { fontSize: 22 },
  queueAdTexts: { flex: 1 },
  queueAdLabel: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  queueAdSub: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  queueDrawPill: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: Colors.highlightBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(245,154,23,0.25)',
  },
  queueDrawPillText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.accentDark,
  },

  /* ── Modal ───────────────────────────────────────────── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,26,44,0.68)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    maxHeight: '88%',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadow.lg,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  modalIcon: { fontSize: 42 },
  modalTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },

  conditionsBlock: {
    marginBottom: Spacing.lg,
  },
  conditionsHeading: {
    fontSize: Typography.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  condRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.base,
    alignItems: 'flex-start',
  },
  condNum: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  condNumText: {
    color: Colors.accentContrast,
    fontWeight: '800',
    fontSize: Typography.sm,
  },
  condTexts: { flex: 1 },
  condTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  condDesc: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  prizeBlock: {
    backgroundColor: Colors.highlightBg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,154,23,0.2)',
  },
  prizeHeading: {
    fontSize: Typography.md,
    fontWeight: '700',
    color: Colors.accentDark,
    marginBottom: Spacing.sm,
  },
  prizeDesc: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  finePrint: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.base,
  },
  modalBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    alignItems: 'center',
    backgroundColor: Colors.accent,
  },
  modalBtnText: {
    color: Colors.accentContrast,
    fontSize: Typography.base,
    fontWeight: '800',
  },
});

