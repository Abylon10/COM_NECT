import { StyleSheet, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Organization } from '@/data/events';
import { useTheme } from '@/hooks/use-theme';

/** "by Organization ✓" with a verified checkmark for verified organizers. */
export function OrganizerLine({ organization }: { organization: Organization }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.name}>
        by {organization.name}
      </ThemedText>
      {organization.isVerified && (
        <Icon name={Icons.verified} size={14} color={theme.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  name: {
    flexShrink: 1,
  },
});
