import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Chip } from '@/components/chip';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Icon, Icons, type IconName } from '@/components/icon';
import { Tag } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { APPLICATION_STATUS_LABEL, signOut } from '@/data/account';
import {
  setColorSchemePreference,
  useColorSchemePreference,
  type ColorSchemePreference,
} from '@/hooks/color-scheme-preference';
import { useEventActions } from '@/hooks/use-event-actions';
import { useCurrentUser, useMyApplication, useMyOrganizations } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

const APPEARANCE_OPTIONS: { id: ColorSchemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Day' },
  { id: 'dark', label: 'Night' },
];

export default function ProfileScreen() {
  const theme = useTheme();
  const user = useCurrentUser();
  const { memberships } = useMyOrganizations();
  const { application } = useMyApplication();
  const { savedIds, rsvps } = useEventActions();
  const appearance = useColorSchemePreference();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const isOrganizer = memberships.length > 0;
  const responses = Object.values(rsvps);

  // Tapping a count opens that list on the Saved tab.
  const stats = [
    { label: 'Saved', value: savedIds.length, segment: 'saved' },
    { label: 'Going', value: responses.filter((r) => r === 'going').length, segment: 'going' },
    {
      label: 'Interested',
      value: responses.filter((r) => r === 'interested').length,
      segment: 'interested',
    },
  ];

  const pendingApplication = !isOrganizer && application && application.status !== 'approved';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <ThemedText type="heading" style={styles.screenTitle}>
          Profile
        </ThemedText>

        {user && (
          <View style={styles.identity}>
            <Avatar name={user.displayName} size={96} uri={user.avatarUri} />
            <ThemedText type="subtitle">{user.displayName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {user.email}
            </ThemedText>
            <View style={styles.tags}>
              <Tag label={isOrganizer ? 'Verified organizer' : 'Resident'} color={theme.primary} />
              {pendingApplication && (
                <Tag
                  label={`Organizer application: ${APPLICATION_STATUS_LABEL[application.status]}`}
                  color={application.status === 'rejected' ? theme.danger : theme.warning}
                />
              )}
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {isOrganizer ? memberships.map((m) => m.organization.name).join(', ') : user.location}
            </ThemedText>
          </View>
        )}

        <View style={[styles.stats, { backgroundColor: theme.backgroundElement }]}>
          {stats.map((stat) => (
            <Pressable
              key={stat.label}
              onPress={() => router.navigate({ pathname: '/saved', params: { segment: stat.segment } })}
              accessibilityRole="button"
              accessibilityLabel={`${stat.value} ${stat.label}. Show list`}
              style={({ pressed }) => [styles.stat, pressed && { opacity: 0.6 }]}>
              <ThemedText type="subtitle" style={{ color: theme.primary }}>
                {stat.value}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {stat.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={[styles.appearance, { borderBottomColor: theme.border }]}>
          <View style={styles.appearanceLabel}>
            <Icon name={Icons.appearance} size={20} color={theme.textSecondary} />
            <ThemedText style={styles.rowLabel}>Appearance</ThemedText>
          </View>
          <View style={styles.appearanceChips}>
            {APPEARANCE_OPTIONS.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                selected={appearance === option.id}
                onPress={() => setColorSchemePreference(option.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.menu}>
          <MenuRow icon={Icons.edit} label="Edit Profile" href="/settings/edit-profile" />
          <MenuRow icon={Icons.lock} label="Account & Security" href="/settings/security" />
          <MenuRow icon={Icons.heart} label="My Interests" href="/settings/interests" />
          <MenuRow icon={Icons.bell} label="Notifications" href="/settings/notifications" />
          <MenuRow icon={Icons.history} label="My Event History" href="/settings/history" />
          {isOrganizer ? (
            <MenuRow icon={Icons.megaphone} label="Organizer Tools" href="/organizer" />
          ) : (
            <MenuRow
              icon={Icons.megaphone}
              label={application ? 'Organizer Application' : 'Become an Organizer'}
              detail={application ? APPLICATION_STATUS_LABEL[application.status] : undefined}
              href="/settings/organizer-application"
            />
          )}
          <MenuRow icon={Icons.privacy} label="Privacy Policy" href="/settings/privacy" />
          <MenuRow icon={Icons.help} label="Help & Feedback" href="/settings/help" />
          <MenuRow icon={Icons.logout} label="Log Out" danger onPress={() => setConfirmLogout(true)} />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmLogout}
        title="Log out?"
        message="You'll need to sign in again to see your saved events. Your account and saved events are kept."
        confirmLabel="Log out"
        destructive
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          signOut();
        }}
      />
    </SafeAreaView>
  );
}

type MenuRowProps = {
  icon: IconName;
  label: string;
  detail?: string;
  href?: Href;
  onPress?: () => void;
  danger?: boolean;
};

function MenuRow({ icon, label, detail, href, onPress, danger = false }: MenuRowProps) {
  const theme = useTheme();
  const color = danger ? theme.danger : theme.text;

  return (
    <Pressable
      onPress={onPress ?? (() => href && router.push(href))}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <Icon name={icon} size={20} color={danger ? theme.danger : theme.textSecondary} />
      <ThemedText style={[styles.rowLabel, { color }]}>{label}</ThemedText>
      {detail && (
        <ThemedText type="caption" themeColor="textSecondary">
          {detail}
        </ThemedText>
      )}
      {!danger && <Icon name={Icons.chevronRight} size={16} color={theme.textSecondary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  screenTitle: {
    textAlign: 'center',
    paddingTop: Spacing.three,
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.one,
    marginVertical: Spacing.one,
  },
  stats: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.two,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  appearance: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appearanceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  appearanceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  menu: {
    gap: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
});
