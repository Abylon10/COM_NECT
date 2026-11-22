import { StyleSheet, Switch, View } from 'react-native';

import { SettingsScreen, SettingsSection } from '@/components/ui/settings-screen';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { updateNotificationSettings } from '@/data/notifications';
import type { NotificationSettings } from '@/data/types';
import { useNotificationSettings } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

const GROUPS: {
  title: string;
  items: { key: keyof NotificationSettings; label: string; description: string }[];
}[] = [
  {
    title: 'Events you follow',
    items: [
      { key: 'reminders', label: 'Upcoming event reminders', description: 'The day before events you marked Going.' },
      { key: 'scheduleChanges', label: 'Schedule and location changes', description: 'When an event you saved or responded to changes its date, time or place.' },
      { key: 'cancellations', label: 'Cancellations and postponements', description: 'When an event you saved or responded to is cancelled or moved.' },
      { key: 'announcements', label: 'Organizer announcements', description: 'Messages organizers send to people following their event.' },
    ],
  },
  {
    title: 'New events',
    items: [
      { key: 'recommendations', label: 'Event recommendations', description: 'New events that match your interests.' },
      { key: 'newEvents', label: 'All new event announcements', description: 'Every new event posted in Community Connect.' },
    ],
  },
];

/** Notification settings: the six toggles the alert rules in data/notifications.ts respect. */
export default function NotificationSettingsScreen() {
  const theme = useTheme();
  const { settings } = useNotificationSettings();

  return (
    <SettingsScreen title="Notifications">
      <ThemedText type="small" themeColor="textSecondary">
        Notifications appear under the bell on Browse; tapping one opens the event. Push
        notifications to your phone come with the backend.
      </ThemedText>
      {settings &&
        GROUPS.map((group) => (
          <SettingsSection key={group.title} title={group.title}>
            {group.items.map((item) => (
              <View key={item.key} style={[styles.row, { borderBottomColor: theme.border }]}>
                <View style={styles.text}>
                  <ThemedText type="smallBold">{item.label}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {item.description}
                  </ThemedText>
                </View>
                <Switch
                  value={settings[item.key]}
                  onValueChange={(value) => updateNotificationSettings({ [item.key]: value })}
                  trackColor={{ true: theme.primary, false: theme.border }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel={item.label}
                />
              </View>
            ))}
          </SettingsSection>
        ))}
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
