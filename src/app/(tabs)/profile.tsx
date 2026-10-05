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
import { useCurrentUser } from '@/hooks/use-events';
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
              <Tag
                label={user.role === 'organizer' ? 'Organizer' : 'Resident'}
                color={theme.primary}
              />
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {user.location}
            </ThemedText>
          </View>
        )}

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
            onPress={() => comingSoon('Notifications')}
          />
          <MenuRow
            icon={Icons.megaphone}
            label="Become an Organizer"
            onPress={() =>
              Alert.alert(
                'Organizer accounts',
                'Verified organizations will be able to post and manage events. This is coming soon.'
              )
            }
          />
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
