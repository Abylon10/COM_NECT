import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { EventStatus } from '@/data/events';
import { useTheme } from '@/hooks/use-theme';

/** Shows a badge for cancelled or postponed events. Renders nothing for scheduled ones. */
export function StatusBadge({ status }: { status: EventStatus }) {
  const theme = useTheme();
  if (status === 'scheduled') return null;

  const cancelled = status === 'cancelled';
  return (
    <View style={[styles.badge, { backgroundColor: cancelled ? theme.danger : theme.warning }]}>
      <ThemedText type="caption" style={styles.label}>
        {cancelled ? 'Cancelled' : 'Postponed'}
      </ThemedText>
    </View>
  );
}

/** Small colored tag, e.g. "Going", "Saved", or a category name. */
export function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <ThemedText type="caption" style={styles.label}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.sm,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: 700,
  },
});
