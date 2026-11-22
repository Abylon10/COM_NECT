import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountBadge } from '@/components/admin-ui';
import { Avatar } from '@/components/avatar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Icon, Icons, type IconName } from '@/components/icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { signOut } from '@/data/account';
import { setColorSchemePreference } from '@/hooks/color-scheme-preference';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAdminStats, useCurrentUser } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

export type AdminSection =
  | 'dashboard'
  | 'applications'
  | 'reports'
  | 'users'
  | 'organizations'
  | 'feedback';

type NavItem = { key: AdminSection; label: string; icon: IconName; href: Href };

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Icons.home, href: '/admin' },
  { key: 'applications', label: 'Organizer requests', icon: Icons.verified, href: '/admin/applications' },
  { key: 'reports', label: 'Reported events', icon: Icons.flag, href: '/admin/reports' },
  { key: 'users', label: 'User management', icon: Icons.people, href: '/admin/users' },
  { key: 'organizations', label: 'Organizations', icon: Icons.building, href: '/admin/organizations' },
  { key: 'feedback', label: 'Feedback', icon: Icons.chat, href: '/admin/feedback' },
];

/** Width at which the sidebar is always shown (tablets, the web preview). */
const WIDE = 900;
const SIDEBAR_WIDTH = 268;

type AdminShellProps = {
  active: AdminSection;
  title: string;
  subtitle?: string;
  /** Shows a back arrow before the title (detail pages). */
  onBack?: () => void;
  /** Pinned to the bottom of the content, e.g. review buttons. */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Admin console layout: sidebar navigation + top bar + page title.
 * On phones the sidebar becomes a slide-out menu behind the ☰ button.
 */
export function AdminShell({ active, title, subtitle, onBack, footer, children }: AdminShellProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const user = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const sidebar = (
    <Sidebar
      active={active}
      onNavigate={() => setMenuOpen(false)}
      onLogout={() => {
        setMenuOpen(false);
        setConfirmLogout(true);
      }}
    />
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.backgroundElement }]} edges={['top']}>
      <View style={styles.body}>
        {wide && (
          <View style={[styles.sidebar, { backgroundColor: theme.background, borderRightColor: theme.border }]}>
            {sidebar}
          </View>
        )}

        <View style={styles.main}>
          <View style={[styles.topBar, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            {!wide && (
              <>
                <Pressable
                  onPress={() => setMenuOpen(true)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Open admin menu">
                  <Icon name={Icons.menu} size={24} color={theme.text} />
                </Pressable>
                <Brand compact />
              </>
            )}
            <View style={styles.flex} />
            <ThemeToggle />
            <View style={[styles.userChip, { borderColor: theme.border }]}>
              <Avatar name={user?.displayName ?? 'Admin'} size={26} />
              {width >= 420 && (
                <ThemedText type="caption" numberOfLines={1} style={styles.userName}>
                  Administrator
                </ThemedText>
              )}
            </View>
          </View>

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[
                styles.content,
                { padding: wide ? Spacing.five : Spacing.three },
                !footer && { paddingBottom: insets.bottom + Spacing.five },
              ]}
              keyboardShouldPersistTaps="handled">
              <View style={styles.pageHead}>
                {onBack && (
                  <Pressable
                    onPress={onBack}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    style={[styles.back, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Icon name={Icons.back} size={20} color={theme.text} />
                  </Pressable>
                )}
                <View style={styles.flex}>
                  <ThemedText type="title" style={styles.pageTitle}>
                    {title}
                  </ThemedText>
                  {subtitle && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {subtitle}
                    </ThemedText>
                  )}
                </View>
              </View>
              {children}
            </ScrollView>
            {footer && (
              <View
                style={[
                  styles.footer,
                  {
                    backgroundColor: theme.background,
                    borderTopColor: theme.border,
                    paddingBottom: insets.bottom + Spacing.two,
                  },
                ]}>
                <View style={styles.footerInner}>{footer}</View>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </View>

      {!wide && (
        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <View style={styles.drawerOverlay}>
            <View
              style={[
                styles.drawer,
                { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom },
              ]}>
              {sidebar}
            </View>
            <Pressable
              style={styles.flex}
              onPress={() => setMenuOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close admin menu"
            />
          </View>
        </Modal>
      )}

      <ConfirmDialog
        visible={confirmLogout}
        title="Log out?"
        message="You'll return to the sign-in screen."
        confirmLabel="Log out"
        onConfirm={() => {
          setConfirmLogout(false);
          signOut();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </SafeAreaView>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brand}>
      <Image
        source={require('@/assets/images/brand/logo-mark.png')}
        style={compact ? styles.logoSmall : styles.logo}
        contentFit="contain"
      />
      <View>
        <ThemedText type="smallBold" themeColor="primary">
          Community Connect
        </ThemedText>
        {!compact && (
          <ThemedText type="caption" themeColor="textSecondary">
            Admin Console
          </ThemedText>
        )}
      </View>
    </View>
  );
}

function Sidebar({
  active,
  onNavigate,
  onLogout,
}: {
  active: AdminSection;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  const theme = useTheme();
  const stats = useAdminStats();
  const dark = useColorScheme() === 'dark';
  const counts: Partial<Record<AdminSection, number>> = {
    applications: stats.pendingApplications,
    reports: stats.openReports,
  };

  return (
    <View style={styles.sidebarInner}>
      <View style={styles.sidebarBrand}>
        <Brand />
      </View>
      <View style={styles.nav}>
        {NAV.map((item) => {
          const selected = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                onNavigate();
                if (!selected) router.replace(item.href);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.navItem,
                selected && { backgroundColor: theme.primary },
                !selected && pressed && { backgroundColor: theme.backgroundElement },
              ]}>
              <Icon name={item.icon} size={20} color={selected ? theme.onPrimary : theme.textSecondary} />
              <ThemedText
                type="small"
                style={[styles.navLabel, { color: selected ? theme.onPrimary : theme.text }]}>
                {item.label}
              </ThemedText>
              <CountBadge count={counts[item.key] ?? 0} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.flex} />

      <View style={styles.nav}>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.navHeading}>
          Account
        </ThemedText>
        <Pressable
          onPress={() => setColorSchemePreference(dark ? 'light' : 'dark')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.navItem, pressed && { backgroundColor: theme.backgroundElement }]}>
          <Icon name={dark ? Icons.sun : Icons.moon} size={20} color={theme.textSecondary} />
          <ThemedText type="small" style={styles.navLabel}>
            {dark ? 'Day mode' : 'Night mode'}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onLogout}
          accessibilityRole="button"
          style={({ pressed }) => [styles.navItem, pressed && { backgroundColor: theme.backgroundElement }]}>
          <Icon name={Icons.logout} size={20} color={theme.danger} />
          <ThemedText type="small" style={[styles.navLabel, { color: theme.danger }]}>
            Log out
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  sidebarInner: {
    flex: 1,
    paddingVertical: Spacing.three,
  },
  sidebarBrand: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logo: {
    width: 36,
    height: 36,
  },
  logoSmall: {
    width: 28,
    height: 28,
  },
  nav: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  navHeading: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.sm,
  },
  navLabel: {
    flex: 1,
  },
  main: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.one,
    paddingLeft: Spacing.one,
    paddingRight: Spacing.two,
  },
  userName: {
    maxWidth: 120,
  },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    gap: Spacing.four,
  },
  pageHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  footerInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: Spacing.two,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  drawer: {
    width: 280,
    maxWidth: '85%',
  },
});
