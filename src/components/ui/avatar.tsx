import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { initials } from '@/utils/format';

/** Profile photo, or the person's initials when there is no photo. */
export function Avatar({ name, size = 40, uri }: { name: string; size?: number; uri?: string }) {
  const theme = useTheme();
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={shape}
        contentFit="cover"
        accessibilityLabel={`${name}'s profile photo`}
      />
    );
  }

  return (
    <View style={[styles.avatar, shape, { backgroundColor: theme.primarySoft }]}>
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
