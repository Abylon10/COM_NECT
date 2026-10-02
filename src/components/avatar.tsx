import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { initials } from '@/utils/format';

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primarySoft },
      ]}>
      <ThemedText style={{ color: theme.primary, fontSize: size * 0.38, fontWeight: 700 }}>
        {initials(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
