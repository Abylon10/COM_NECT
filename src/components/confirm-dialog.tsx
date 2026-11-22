import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Red confirm button for destructive actions. */
  destructive?: boolean;
  /** Disables the confirm button (e.g. until a password is typed). */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

/** Centered yes/no dialog. Works on web too, unlike Alert.alert with buttons. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Cancel" />
        <View
          style={[styles.dialog, { backgroundColor: theme.background }]}
          accessibilityRole="alert">
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {message}
          </ThemedText>
          {children}
          <View style={styles.actions}>
            <Button label="Cancel" variant="outline" onPress={onCancel} />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              disabled={confirmDisabled}
              style={destructive && !confirmDisabled ? { backgroundColor: theme.danger, borderColor: theme.danger } : undefined}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
