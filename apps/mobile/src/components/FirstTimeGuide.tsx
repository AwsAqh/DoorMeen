/**
 * FirstTimeGuide — multi-step onboarding popup for first-time users.
 *
 * Shows contextual tips when users first visit key screens:
 *   • Home: welcome + overview
 *   • CreateQueue: explains PIN verification for customers (coming in official release)
 *   • JoinScreen: explains what info is collected and why
 *   • QueueScreen: points out ad spaces + draw contest
 *
 * Each guide is shown once per screen, tracked via AsyncStorage.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, Pressable,
  Animated, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { Colors, Spacing, Radius, Typography, Shadow } from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

/* ── Guide content definition ────────────────────────────────────────── */

export type GuideId =
  | 'home_welcome'
  | 'create_queue_pin'
  | 'join_queue_info'
  | 'queue_view_ads';

interface GuideStep {
  /** Emoji or symbol to show at the top */
  icon: string;
  /** i18n key for the step title */
  titleKey: string;
  /** Fallback English title */
  titleFallback: string;
  /** i18n key for the step body */
  bodyKey: string;
  /** Fallback English body */
  bodyFallback: string;
}

const GUIDE_STEPS: Record<GuideId, GuideStep[]> = {
  home_welcome: [
    {
      icon: '👋',
      titleKey: 'guide.home.step1Title',
      titleFallback: 'Welcome to DoorMeen!',
      bodyKey: 'guide.home.step1Body',
      bodyFallback: 'DoorMeen helps businesses manage queues and helps customers save time. Let us show you around!',
    },
    {
      icon: '📱',
      titleKey: 'guide.home.step2Title',
      titleFallback: 'Two ways to get started',
      bodyKey: 'guide.home.step2Body',
      bodyFallback: 'Scan a QR code to join an existing queue as a customer, or create your own queue if you run a business.',
    },
    {
      icon: '🔐',
      titleKey: 'guide.home.step3Title',
      titleFallback: 'PIN Verification is coming!',
      bodyKey: 'guide.home.step3Body',
      bodyFallback: 'In the official release, customers joining a queue will verify their identity with a PIN sent via SMS. This prevents fake entries and keeps your queue fair and secure.',
    },
  ],
  create_queue_pin: [
    {
      icon: '➕',
      titleKey: 'guide.create.step1Title',
      titleFallback: 'Creating your first queue?',
      bodyKey: 'guide.create.step1Body',
      bodyFallback: 'Set a name people can recognize and choose a secure 4–6 digit PIN. Only you will use this PIN to manage the queue.',
    },
    {
      icon: '🔒',
      titleKey: 'guide.create.step2Title',
      titleFallback: 'Customer verification is coming',
      bodyKey: 'guide.create.step2Body',
      bodyFallback: 'In the official release, every customer who joins your queue will receive a verification PIN via SMS. This ensures real people are in line — no ghost entries, no line-cutting.',
    },
    {
      icon: '✉️',
      titleKey: 'guide.create.step3Title',
      titleFallback: 'Why we ask for your email',
      bodyKey: 'guide.create.step3Body',
      bodyFallback: 'Your email lets us send you queue reports and helps verify you as the owner when full account management launches.',
    },
  ],
  join_queue_info: [
    {
      icon: '🙋',
      titleKey: 'guide.join.step1Title',
      titleFallback: 'Joining a queue',
      bodyKey: 'guide.join.step1Body',
      bodyFallback: 'Enter your name, phone, and email to take your place in line. You can watch your position update in real time!',
    },
    {
      icon: '📲',
      titleKey: 'guide.join.step2Title',
      titleFallback: 'SMS verification coming soon',
      bodyKey: 'guide.join.step2Body',
      bodyFallback: 'In the official release, you will receive a PIN via SMS to verify your spot. This guarantees nobody else can join using your number and keeps the queue fair for everyone.',
    },
  ],
  queue_view_ads: [
    {
      icon: '📢',
      titleKey: 'guide.queue.step1Title',
      titleFallback: 'Ad spaces are here!',
      bodyKey: 'guide.queue.step1Body',
      bodyFallback: 'Notice the ad banner on this page? Business owners can showcase their promotions right where customers are waiting. Prime visibility, real audience!',
    },
    {
      icon: '🎉',
      titleKey: 'guide.queue.step2Title',
      titleFallback: 'Win a FREE month of ads!',
      bodyKey: 'guide.queue.step2Body',
      bodyFallback: 'Create a queue and use it for a full day — your name and email will be entered into a draw to win one month of FREE ad space on DoorMeen!',
    },
    {
      icon: '📋',
      titleKey: 'guide.queue.step3Title',
      titleFallback: 'Draw conditions',
      bodyKey: 'guide.queue.step3Body',
      bodyFallback: '① Create a queue with a valid email\n② Use the queue for one complete business day (serve at least one customer)\n③ Your name and email automatically enter the draw\n\nWinners are announced at the end of every month!',
    },
  ],
};

/* ── Storage helpers ─────────────────────────────────────────────────── */

const storageKey = (id: GuideId) => `dm_guide_seen_${id}`;

async function hasSeenGuide(id: GuideId): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(storageKey(id))) === 'yes';
  } catch {
    return false;
  }
}

async function markGuideSeen(id: GuideId) {
  try {
    await AsyncStorage.setItem(storageKey(id), 'yes');
  } catch { /* storage may be unavailable — swallow */ }
}

/* ── Component ───────────────────────────────────────────────────────── */

interface Props {
  guideId: GuideId;
  /** Optional delay before showing (ms) */
  delay?: number;
}

export default function FirstTimeGuide({ guideId, delay = 600 }: Props) {
  const { t } = useTranslation();
  const steps = GUIDE_STEPS[guideId];

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const seen = await hasSeenGuide(guideId);
      if (active && !seen) {
        setVisible(true);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      }
    }, delay);
    return () => { active = false; clearTimeout(timer); };
  }, [guideId]);

  const goNext = useCallback(() => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      // Last step → close
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setVisible(false);
        void markGuideSeen(guideId);
      });
    }
  }, [step, steps.length, guideId, fadeAnim]);

  const dismiss = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setVisible(false);
      void markGuideSeen(guideId);
    });
  }, [guideId, fadeAnim]);

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        <Animated.View style={[styles.card, { transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
            ))}
          </View>

          {/* Icon */}
          <View style={styles.iconCircle}>
            <AppText style={styles.icon}>{current.icon}</AppText>
          </View>

          {/* Title */}
          <AppText style={styles.title}>
            {t(current.titleKey, current.titleFallback)}
          </AppText>

          {/* Body */}
          <AppText style={styles.body}>
            {t(current.bodyKey, current.bodyFallback)}
          </AppText>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={dismiss} activeOpacity={0.7}>
              <AppText style={styles.skipText}>
                {t('guide.skip', 'Skip')}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
              <AppText style={styles.nextBtnText}>
                {isLast
                  ? t('guide.gotIt', 'Got it!')
                  : t('guide.next', 'Next →')}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Step counter */}
          <AppText style={styles.counter}>
            {step + 1} / {steps.length}
          </AppText>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,26,44,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    ...Shadow.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceBorder,
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 24,
  },
  dotDone: {
    backgroundColor: Colors.accentLight,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.highlightBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.accentGlow,
  },
  icon: {
    fontSize: 30,
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.base,
  },
  skipText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadow.glow,
  },
  nextBtnText: {
    color: Colors.accentContrast,
    fontWeight: '800',
    fontSize: Typography.base,
  },
  counter: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
});

