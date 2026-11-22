import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';

/** `system` follows the phone's setting; `light`/`dark` override it. */
export type ColorSchemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'appearance';

let preference: ColorSchemePreference = 'system';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function apply(next: ColorSchemePreference) {
  preference = next;
  // Re-render the app first so all text and backgrounds switch together.
  listeners.forEach((listener) => listener());
  // On iOS/Android this also switches native UI (tab bar, alerts, status bar).
  // react-native-web doesn't support it; the web hook reads `preference` instead.
  if (Platform.OS !== 'web') {
    Appearance.setColorScheme(next === 'system' ? 'auto' : next);
  }
}

/** Changes the appearance right away and remembers it on this device. */
export function setColorSchemePreference(next: ColorSchemePreference) {
  apply(next);
  AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
    // Saving is best-effort; the app keeps working with the in-memory value.
  });
}

/** Restores the saved appearance. Called once when the app starts. */
export async function loadColorSchemePreference() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') apply(saved);
  } catch {
    // Storage unavailable (e.g. private browsing on web): keep `system`.
  }
}

export function useColorSchemePreference() {
  return useSyncExternalStore(
    subscribe,
    () => preference,
    () => preference
  );
}
