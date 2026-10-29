import React, { useState, useCallback, createContext, useContext, useRef, useEffect, ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Colors, Spacing, Radius, Typography, Shadow } from '../constants/theme';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showUndo: (message: string, actionLabel: string, onAction: () => void, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

interface ToastProviderProps {
  children: ReactNode;
}

const TOAST_DURATION = 2200;
const TOAST_ANIMATION_DURATION = 250;

export function ToastProvider({ children }: ToastProviderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastsRef = useRef<Toast[]>([]);
  const idCounter = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  const updateToasts = useCallback((update: (current: Toast[]) => Toast[]) => {
    const next = update(toastsRef.current);
    toastsRef.current = next;
    setToasts(next);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = TOAST_DURATION, action?: { label: string; onPress: () => void }) => {
    const id = ++idCounter.current;
    const activeUndo = !action ? toastsRef.current.find(toast => !!toast.onAction) : undefined;
    timers.current.forEach((timer, timerId) => {
      if (activeUndo && timerId === activeUndo.id) return;
      clearTimeout(timer);
      timers.current.delete(timerId);
    });
    // Keep feedback quiet and readable: show only the latest message.
    const toast = { id, message, type, actionLabel: action?.label, onAction: action?.onPress };
    updateToasts(current => activeUndo && !action ? [...current.filter(item => item.id === activeUndo.id), toast] : [toast]);
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id);
      updateToasts(current => current.filter(t => t.id !== id));
    }, duration));
  }, [updateToasts]);

  const showSuccess = useCallback((message: string, duration?: number) => showToast(message, 'success', duration), [showToast]);
  const showError = useCallback((message: string, duration?: number) => showToast(message, 'error', duration), [showToast]);
  const showInfo = useCallback((message: string, duration?: number) => showToast(message, 'info', duration), [showToast]);
  const showWarning = useCallback((message: string, duration?: number) => showToast(message, 'warning', duration), [showToast]);
  const showUndo = useCallback((message: string, actionLabel: string, onAction: () => void, duration = 5000) => {
    showToast(message, 'success', duration, { label: actionLabel, onPress: onAction });
  }, [showToast]);

  const renderToast = (toast: Toast) => {
    const accentColor = {
      success: Colors.success,
      error: Colors.danger,
      info: Colors.accent,
      warning: Colors.warning,
    }[toast.type];
    const icon = { success: '✓', error: '!', info: 'i', warning: '!' }[toast.type];
    const heading = {
      success: t('toast.heading.success', 'Done'),
      error: t('toast.heading.error', 'Something went wrong'),
      info: t('toast.heading.info', 'Notice'),
      warning: t('toast.heading.warning', 'Heads up'),
    }[toast.type];

    return (
      <Animated.View
        key={toast.id}
        style={[
          styles.toast,
          { borderColor: accentColor },
        ]}
        entering={FadeInDown.duration(TOAST_ANIMATION_DURATION)}
        exiting={FadeOutDown.duration(TOAST_ANIMATION_DURATION)}
      >
        <View style={[styles.iconBubble, { backgroundColor: `${accentColor}22` }]}>
          <AppText style={[styles.iconText, { color: accentColor }]}>{icon}</AppText>
        </View>
        <View style={styles.toastCopy}>
          <AppText style={[styles.toastHeading, { color: accentColor }]}>{heading}</AppText>
          <AppText style={styles.toastText}>{toast.message}</AppText>
        </View>
        {toast.actionLabel && toast.onAction && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={toast.actionLabel}
            onPress={() => {
              const timer = timers.current.get(toast.id);
              if (timer) clearTimeout(timer);
              timers.current.delete(toast.id);
              toast.onAction?.();
              updateToasts(current => current.filter(item => item.id !== toast.id));
            }}
            style={styles.actionButton}
            activeOpacity={0.75}
          >
            <AppText style={styles.actionText}>{toast.actionLabel}</AppText>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning, showUndo }}>
      {children}
        <View style={[styles.container, { bottom: Math.max(Spacing.md, insets.bottom) + Spacing.md }]} pointerEvents="box-none">
        {toasts.map(renderToast)}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.base,
    right: Spacing.base,
    zIndex: 9999,
    pointerEvents: 'none',
    gap: Spacing.sm,
  },
  toast: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 1,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgElevated,
    ...Shadow.glow,
    maxWidth: '92%',
  },
  iconBubble: { width: 38, height: 38, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: Typography.lg, fontWeight: '700' },
  toastCopy: { flex: 1, gap: 2 },
  toastHeading: { fontSize: Typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  toastText: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: '600',
  },
  actionButton: { marginStart: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.accent },
  actionText: { color: Colors.accentContrast, fontSize: Typography.sm, fontWeight: '800' },
});

