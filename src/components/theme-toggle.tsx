import { Pressable } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { setColorSchemePreference } from '@/hooks/color-scheme-preference';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** Sun/moon button that switches between day and night mode. */
export function ThemeToggle() {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';

  return (
    <Pressable
      onPress={() => setColorSchemePreference(isDark ? 'light' : 'dark')}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to day mode' : 'Switch to night mode'}
      hitSlop={8}
      style={({ pressed }) => pressed && { opacity: 0.6 }}>
      <Icon name={isDark ? Icons.sun : Icons.moon} size={22} color={theme.text} />
    </Pressable>
  );
}
