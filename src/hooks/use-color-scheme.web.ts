import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useColorSchemePreference } from '@/hooks/color-scheme-preference';

const subscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  // `false` during static rendering and hydration, `true` once running on the client.
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const preference = useColorSchemePreference();
  const colorScheme = useRNColorScheme();

  if (!hasHydrated) {
    return 'light';
  }

  return preference === 'system' ? colorScheme : preference;
}
