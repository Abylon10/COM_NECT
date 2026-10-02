import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Icon + text line, e.g. date, time, or venue. */
export function InfoRow({ icon, text }: { icon: IconName; text: string }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Icon name={icon} size={16} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.text} numberOfLines={2}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  text: {
    flex: 1,
  },
});
