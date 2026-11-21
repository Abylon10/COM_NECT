import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon, Icons } from '@/components/icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCurrentUser, useNotifications } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

/** Top bar for the tab screens: avatar, logo, notifications bell. */
export function AppHeader() {
  const theme = useTheme();
  const user = useCurrentUser();
  const { unread } = useNotifications();

  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.navigate('/profile')}
        accessibilityLabel="Open profile"
        style={styles.side}>
        <Avatar name={user?.displayName ?? ''} size={36} />
      </Pressable>

      <View style={styles.brand}>
        <Image
          source={require('@/assets/images/brand/logo-mark.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <ThemedText style={[styles.brandText, { color: theme.primary }]}>
          Community Connect
        </ThemedText>
      </View>

      <View style={[styles.side, styles.sideRight]}>
        <ThemeToggle />
        <Pressable
          onPress={() => router.push('/notifications')}
          accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          hitSlop={8}>
          <Icon name={Icons.bell} size={22} color={theme.text} />
          {unread > 0 && <View style={[styles.unreadDot, { backgroundColor: theme.danger }]} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  side: {
    width: 68,
  },
  sideRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.three,
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  logo: {
    width: 28,
    height: 28,
  },
  unreadDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  brandText: {
    fontSize: 18,
    fontWeight: 700,
  },
});
