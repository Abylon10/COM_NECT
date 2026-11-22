import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Icon, Icons } from '@/components/icon';
import { SettingsScreen } from '@/components/settings-screen';
import { Tag } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useEventHistory } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { formatEventDate } from '@/utils/format';

export default function HistoryScreen() {
  const theme = useTheme();
  const { events, loading } = useEventHistory();

  return (
    <SettingsScreen title="My Event History">
      <ThemedText type="small" themeColor="textSecondary">
        Past events you saved or responded to.
      </ThemedText>
      {!loading && events.length === 0 && (
        <EmptyState icon={Icons.history} title="No past events yet" message="Events you went to or were interested in appear here after they end." />
      )}
      <View style={styles.list}>
        {events.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.row,
              { borderColor: theme.border, backgroundColor: theme.card },
              pressed && { backgroundColor: theme.backgroundElement },
            ]}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{e.title}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {formatEventDate(e.startAt)} · {e.organization.name}
              </ThemedText>
              <View style={styles.tags}>
                {e.response === 'going' && <Tag label="You went" color={theme.primary} />}
                {e.response === 'interested' && <Tag label="Interested" color={theme.warning} />}
                {e.saved && <Tag label="Saved" color={theme.textSecondary} />}
              </View>
            </View>
            <Icon name={Icons.chevronRight} size={16} color={theme.textSecondary} />
          </Pressable>
        ))}
      </View>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  flex: {
    flex: 1,
    gap: Spacing.one,
  },
  tags: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
});
