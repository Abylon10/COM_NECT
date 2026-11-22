import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { Icon, Icons, type IconName } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThemedText } from '@/components/ui/themed-text';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import { getNotifications, markNotificationsRead } from '@/data/notifications';
import type { AppNotification, NotificationKind } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/utils/format';

const KIND_STYLE: Record<NotificationKind, { icon: IconName; color: ThemeColor; bg: ThemeColor }> = {
  updated: { icon: Icons.editCalendar, color: 'primary', bg: 'primarySoft' },
  postponed: { icon: Icons.clock, color: 'warning', bg: 'warningSoft' },
  cancelled: { icon: Icons.eventBusy, color: 'danger', bg: 'dangerSoft' },
  new: { icon: Icons.add, color: 'primary', bg: 'primarySoft' },
  reminder: { icon: Icons.bellActive, color: 'primary', bg: 'primarySoft' },
  announcement: { icon: Icons.megaphone, color: 'primary', bg: 'primarySoft' },
  application: { icon: Icons.verified, color: 'success', bg: 'primarySoft' },
  moderation: { icon: Icons.shield, color: 'danger', bg: 'dangerSoft' },
};

/** In-app notifications (bell icon). Opening the screen marks them as read. */
export default function NotificationsScreen() {
  const theme = useTheme();
  // Load once and keep this snapshot, so items that were unread stay highlighted
  // while the screen is open even though they're marked read right away.
  const [{ notifications, loading }, setState] = useState({
    notifications: [] as AppNotification[],
    loading: true,
  });

  useEffect(() => {
    let active = true;
    getNotifications().then((list) => {
      if (!active) return;
      setState({ notifications: list, loading: false });
      if (list.some((n) => !n.read)) markNotificationsRead();
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Notifications" />
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <NotificationRow item={item} unread={!item.read} />
        )}
        ListEmptyComponent={
          loading ? (
            <LoadingAnimation label="Loading notifications…" />
          ) : (
            <EmptyState
              icon={Icons.bell}
              title="No notifications"
              message="When an event you saved or responded to changes, you'll see it here."
            />
          )
        }
        ListFooterComponent={
          notifications.length > 0 ? (
            <ThemedText type="caption" themeColor="textSecondary" style={styles.footer}>
              You get alerts for events you saved or responded to.
            </ThemedText>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

function NotificationRow({ item, unread }: { item: AppNotification; unread: boolean }) {
  const theme = useTheme();
  const style = KIND_STYLE[item.kind];

  return (
    <Pressable
      onPress={() =>
        item.eventId
          ? router.push({ pathname: '/event/[id]', params: { id: item.eventId } })
          : router.push('/settings/organizer-application')
      }
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border },
        unread && { backgroundColor: theme.primarySoft },
        pressed && { opacity: 0.8 },
      ]}>
      <View style={[styles.iconCircle, { backgroundColor: theme[style.bg] }]}>
        <Icon name={style.icon} size={22} color={theme[style.color]} />
      </View>
      <View style={styles.text}>
        <ThemedText type="smallBold">{item.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.body}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {timeAgo(item.createdAt)}
        </ThemedText>
      </View>
      {unread && <View style={[styles.dot, { backgroundColor: theme.primary }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  listContent: {
    paddingBottom: Spacing.five,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: Spacing.one,
  },
  footer: {
    textAlign: 'center',
    padding: Spacing.four,
  },
});
