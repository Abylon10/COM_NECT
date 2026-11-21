import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

type ScreenHeaderProps = {
  title: string;
  /** `close` shows an X instead of a back arrow (for forms). */
  variant?: 'back' | 'close';
  onBack?: () => void;
  right?: ReactNode;
};

/** Top bar for stack screens: back/close button, centered title, optional action. */
export function ScreenHeader({ title, variant = 'back', onBack = goBack, right }: ScreenHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={variant === 'close' ? 'Close' : 'Back'}
        style={styles.side}>
        <Icon name={variant === 'close' ? Icons.close : Icons.back} size={24} color={theme.text} />
      </Pressable>
      <ThemedText type="heading" numberOfLines={1} style={styles.title}>
        {title}
      </ThemedText>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  side: {
    width: 96,
  },
  right: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});
