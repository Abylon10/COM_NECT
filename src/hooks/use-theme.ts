/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // `null` means the scheme isn't known yet (React Native 0.88+).
  const theme = scheme ?? 'light';

  return Colors[theme];
}
