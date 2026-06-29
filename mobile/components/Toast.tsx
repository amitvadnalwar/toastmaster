import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

// ── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ICON: Record<ToastType, React.ComponentProps<typeof Feather>['name']> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'info',
};

const BG: Record<ToastType, string> = {
  success: '#10b981',
  error: '#ef4444',
  info: '#374151',
};

export function Toast({ visible, message, type = 'success' }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 24, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: BG[type], opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Feather name={ICON[type]} size={16} color="#fff" />
      <Text style={styles.text} numberOfLines={2}>{message}</Text>
    </Animated.View>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [state, setState] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success',
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string, type: ToastType = 'success', duration = 3000) {
    if (timer.current) clearTimeout(timer.current);
    setState({ visible: true, message, type });
    timer.current = setTimeout(() => {
      setState((prev) => ({ ...prev, visible: false }));
    }, duration);
  }

  return { showToast, toastProps: state };
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 36,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
