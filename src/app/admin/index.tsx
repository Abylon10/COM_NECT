import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminMenuRow, StatTile } from '@/components/admin-ui';
import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Icon, Icons } from '@/components/icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { signOut } from '@/data/account';
import { useAdminStats } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

/** Admin console home: what needs attention, then everything else. */
export default function AdminDashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const stats = useAdminStats();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const attention = stats.pendingApplications + stats.openReports;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Image
          source={require('@/assets/images/brand/logo-mark.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <View style={styles.headerText}>
          <ThemedText type="smallBold" themeColor="primary">
            Community Connect
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Admin Console
          </ThemedText>
        </View>
        <ThemeToggle />
        <Pressable
          onPress={() => setConfirmLogout(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Log out">
          <Icon name={Icons.logout} size={22} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}>
        <View style={styles.greeting}>
          <ThemedText type="title">Dashboard</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {attention > 0
              ? `Welcome back. ${attention} item${attention === 1 ? '' : 's'} need${attention === 1 ? 's' : ''} your review.`
              : 'All caught up. Nothing is waiting for review.'}
          </ThemedText>
        </View>

        <View style={styles.grid}>
          <StatTile
            label="Pending applications"
            value={stats.pendingApplications}
            icon={Icons.verified}
            tone={stats.pendingApplications ? 'warning' : 'primary'}
            onPress={() => router.push('/admin/applications')}
          />
          <StatTile
            label="Reported events"
            value={stats.openReports}
            icon={Icons.flag}
            tone={stats.openReports ? 'danger' : 'primary'}
            onPress={() => router.push('/admin/reports')}
          />
          <StatTile
            label={`Users · ${stats.organizers} organizer${stats.organizers === 1 ? '' : 's'}`}
            value={stats.users}
            icon={Icons.people}
            onPress={() => router.push('/admin/users')}
          />
          <StatTile
            label="Verified organizations"
            value={stats.verifiedOrganizations}
            icon={Icons.building}
            onPress={() => router.push('/admin/organizations')}
          />
          <StatTile label="Upcoming events" value={stats.upcomingEvents} icon={Icons.calendar} />
          <StatTile
            label="Feedback messages"
            value={stats.feedback}
            icon={Icons.chat}
            onPress={() => router.push('/admin/feedback')}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Review</ThemedText>
          <AdminMenuRow
            icon={Icons.verified}
            label="Organizer applications"
            description="Approve groups that want to post events"
            count={stats.pendingApplications}
            onPress={() => router.push('/admin/applications')}
          />
          <AdminMenuRow
            icon={Icons.flag}
            label="Event reports"
            description="Events residents flagged as wrong or inappropriate"
            count={stats.openReports}
            onPress={() => router.push('/admin/reports')}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Manage</ThemedText>
          <AdminMenuRow
            icon={Icons.building}
            label="Organizations"
            description="Verify or unverify organizing groups"
            onPress={() => router.push('/admin/organizations')}
          />
          <AdminMenuRow
            icon={Icons.people}
            label="Users"
            description="Find accounts, suspend or reinstate"
            onPress={() => router.push('/admin/users')}
          />
          <AdminMenuRow
            icon={Icons.chat}
            label="Feedback"
            description="Issues and suggestions from Help & Feedback"
            onPress={() => router.push('/admin/feedback')}
          />
        </View>

        <Button
          label="Log out"
          icon={Icons.logout}
          variant="outline"
          onPress={() => setConfirmLogout(true)}
          style={styles.full}
        />
      </ScrollView>

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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logo: {
    width: 36,
    height: 36,
  },
  headerText: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
  },
  greeting: {
    gap: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  full: {
    flex: 0,
    width: '100%',
  },
});
