import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useColorSchemePreference } from '@/hooks/color-scheme-preference';

/**
 * The app's color scheme. A Day/Night choice applies right away from the
 * app's own store, so every screen re-renders together. Waiting for the
 * phone to report the change made text switch a moment after backgrounds.
 */
export function useColorScheme() {
  const preference = useColorSchemePreference();
  const system = useSystemColorScheme();
  return preference === 'system' ? system : preference;
}
