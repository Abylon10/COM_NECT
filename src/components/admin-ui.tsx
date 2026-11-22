import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, Icons, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import type { ApplicationStatus } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

/** Rounded card used across the admin console. Pressable when `onPress` is set. */
export function AdminCard({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const base = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { backgroundColor: theme.backgroundElement }]}>
      {children}
    </Pressable>
  );
}

/** Number tile on the dashboard. */
export function StatTile({
  label,
  value,
  icon,
  tone = 'primary',
  onPress,
}: {
  label: string;
  value: number;
  icon: IconName;
  tone?: Extract<ThemeColor, 'primary' | 'warning' | 'danger' | 'success'>;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const soft: Record<typeof tone, ThemeColor> = {
    primary: 'primarySoft',
    warning: 'warningSoft',
    danger: 'dangerSoft',
    success: 'primarySoft',
  };
  return (
    <AdminCard onPress={onPress} style={styles.tile} accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.tileIcon, { backgroundColor: theme[soft[tone]] }]}>
        <Icon name={icon} size={18} color={theme[tone]} />
      </View>
      <ThemedText type="title" style={styles.tileValue}>
        {value}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </AdminCard>
  );
}

/** Small pill with a number, e.g. pending items on a menu row. */
export function CountBadge({ count, tone = 'danger' }: { count: number; tone?: 'danger' | 'warning' }) {
  const theme = useTheme();
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: theme[tone] }]}>
      <ThemedText type="caption" style={styles.badgeText}>
        {count}
      </ThemedText>
    </View>
  );
}

/** Menu row on the dashboard: icon, label, description, count, chevron. */
export function AdminMenuRow({
  icon,
  label,
  description,
  count = 0,
  onPress,
}: {
  icon: IconName;
  label: string;
  description: string;
  count?: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <AdminCard onPress={onPress} style={styles.menuRow} accessibilityLabel={label}>
      <View style={[styles.tileIcon, { backgroundColor: theme.primarySoft }]}>
        <Icon name={icon} size={20} color={theme.primary} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      <CountBadge count={count} />
      <Icon name={Icons.chevronRight} size={16} color={theme.textSecondary} />
    </AdminCard>
  );
}

/** Label/value line in a details card. */
export function DetailLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.detail}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      {typeof value === 'string' ? <ThemedText type="small">{value}</ThemedText> : value}
    </View>
  );
}

/** Tag color for an organizer application's status. */
export function useApplicationStatusColor() {
  const theme = useTheme();
  return (status: ApplicationStatus) =>
    ({
      pending: theme.warning,
      approved: theme.success,
      rejected: theme.danger,
      requires_revision: theme.warning,
    })[status];
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: Spacing.one,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: {
    marginTop: Spacing.one,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
    gap: Spacing.half,
  },
  detail: {
    gap: Spacing.half,
  },
});
