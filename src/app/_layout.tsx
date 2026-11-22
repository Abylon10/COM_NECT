import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { loadColorSchemePreference } from '@/hooks/color-scheme-preference';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EventActionsProvider } from '@/hooks/use-event-actions';
import { useIsSignedIn } from '@/hooks/use-events';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const signedIn = useIsSignedIn();

  useEffect(() => {
    loadColorSchemePreference();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <EventActionsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Signed-in app. Logging out swaps these for the sign-in screens. */}
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="event/[id]" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="organizer/index" />
            <Stack.Screen name="organizer/new" />
            <Stack.Screen name="organizer/[id]" />
            <Stack.Screen name="settings/edit-profile" />
            <Stack.Screen name="settings/security" />
            <Stack.Screen name="settings/interests" />
            <Stack.Screen name="settings/notifications" />
            <Stack.Screen name="settings/organizer-application" />
            <Stack.Screen name="settings/history" />
            <Stack.Screen name="settings/privacy" />
            <Stack.Screen name="settings/help" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="sign-up" />
          </Stack.Protected>
        </Stack>
        <StatusBar style="auto" />
      </EventActionsProvider>
    </ThemeProvider>
  );
}
