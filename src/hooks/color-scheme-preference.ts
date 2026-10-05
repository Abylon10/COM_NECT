import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';

/** `system` follows the phone's setting; `light`/`dark` override it. */
export type ColorSchemePreference = 'system' | 'light' | 'dark';

// Kept in memory for now, so it resets to `system` when the app reloads.
let preference: ColorSchemePreference = 'system';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setColorSchemePreference(next: ColorSchemePreference) {
  preference = next;
  // On iOS/Android this also switches native UI (tab bar, alerts, status bar).
  // react-native-web doesn't support it; the web hook reads `preference` instead.
  if (Platform.OS !== 'web') {
    Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
  }
  listeners.forEach((listener) => listener());
}

export function useColorSchemePreference() {
  return useSyncExternalStore(
    subscribe,
    () => preference,
    () => preference
  );
}
