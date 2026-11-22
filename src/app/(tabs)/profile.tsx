import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Chip } from '@/components/chip';
import { Icon, Icons, type IconName } from '@/components/icon';
import { Tag } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  setColorSchemePreference,
  useColorSchemePreference,
  type ColorSchemePreference,
} from '@/hooks/color-scheme-preference';
import { useEventActions } from '@/hooks/use-event-actions';
import { switchDemoUser } from '@/data/events';
import { useCurrentUser, useDemoUsers, useMyOrganizations } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

const APPEARANCE_OPTIONS: { id: ColorSchemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Day' },
  { id: 'dark', label: 'Night' },
];

function comingSoon(feature: string) {
  Alert.alert(feature, 'This feature is coming soon.');
}

export default function ProfileScreen() {
  const theme = useTheme();
  const user = useCurrentUser();
  const demoUsers = useDemoUsers();
  const { memberships } = useMyOrganizations();
  const isOrganizer = memberships.length > 0;
  const { savedIds, rsvps } = useEventActions();
  const appearance = useColorSchemePreference();
  const responses = Object.values(rsvps);

  const stats = [
    { label: 'Saved', value: savedIds.length },
    { label: 'Going', value: responses.filter((r) => r === 'going').length },
    { label: 'Interested', value: responses.filter((r) => r === 'interested').length },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <ThemedText type="heading" style={styles.screenTitle}>
          Profile
        </ThemedText>

        {user && (
          <View style={styles.identity}>
            <Avatar name={user.displayName} size={96} />
            <ThemedText type="subtitle">{user.displayName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {user.email}
            </ThemedText>
            <View style={styles.tags}>
              <Tag label={isOrganizer ? 'Verified organizer' : 'Resident'} color={theme.primary} />
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {isOrganizer
                ? memberships.map((m) => m.organization.name).join(', ')
                : user.location}
            </ThemedText>
          </View>
        )}

        <View style={[styles.appearance, { borderBottomColor: theme.border }]}>
          <View style={styles.appearanceLabel}>
            <Icon name={Icons.switchAccount} size={20} color={theme.textSecondary} />
            <View style={styles.flex}>
              <ThemedText style={styles.rowLabel}>Demo account</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Until sign-in is ready, switch accounts to try both user types.
              </ThemedText>
            </View>
          </View>
          <View style={styles.appearanceChips}>
            {demoUsers.map((u) => (
              <Chip
                key={u.id}
                label={u.role === 'organizer' ? `Organizer: ${u.displayName}` : `Resident: ${u.displayName}`}
                selected={u.id === user?.id}
                onPress={() => switchDemoUser(u.id)}
              />
            ))}
          </View>
        </View>

        <View style={[styles.stats, { backgroundColor: theme.backgroundElement }]}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <ThemedText type="subtitle" style={{ color: theme.primary }}>
                {stat.value}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {stat.label}
              </ThemedText>
            </View>
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
          <MenuRow icon={Icons.edit} label="Edit Profile" onPress={() => comingSoon('Edit Profile')} />
          <MenuRow
            icon={Icons.heart}
            label="My Interests"
            onPress={() => comingSoon('My Interests')}
          />
          <MenuRow
            icon={Icons.bell}
            label="Notifications"
            onPress={() => router.push('/notifications')}
          />
          {isOrganizer ? (
            <MenuRow
              icon={Icons.megaphone}
              label="Organizer Tools"
              onPress={() => router.push('/organizer')}
            />
          ) : (
            <MenuRow
              icon={Icons.megaphone}
              label="Become an Organizer"
              onPress={() =>
                Alert.alert(
                  'Organizer accounts',
                  'Members of verified organizations can post and manage events. Ask your organization to be verified by the Community Connect team.'
                )
              }
            />
          )}
          <MenuRow
            icon={Icons.privacy}
            label="Privacy Policy"
            onPress={() => comingSoon('Privacy Policy')}
          />
          <MenuRow icon={Icons.help} label="Help & Feedback" onPress={() => comingSoon('Help')} />
          <MenuRow icon={Icons.logout} label="Log Out" danger onPress={() => comingSoon('Log Out')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type MenuRowProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

function MenuRow({ icon, label, onPress, danger = false }: MenuRowProps) {
  const theme = useTheme();
  const color = danger ? theme.danger : theme.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <Icon name={icon} size={20} color={danger ? theme.danger : theme.textSecondary} />
      <ThemedText style={[styles.rowLabel, { color }]}>{label}</ThemedText>
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
    gap: Spacing.one,
    marginVertical: Spacing.one,
  },
  stats: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
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
  flex: {
    flex: 1,
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
