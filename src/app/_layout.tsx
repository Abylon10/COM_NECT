import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { DemoBanner } from '@/components/layout/demo-banner';
import { StartupSplash } from '@/components/layout/startup-splash';
import { loadColorSchemePreference } from '@/hooks/color-scheme-preference';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EventActionsProvider } from '@/hooks/use-event-actions';
import { useSessionKind } from '@/hooks/use-events';

/** Root layout. Stack.Protected shows exactly one area: sign-in screens (signed out), the resident/organizer app, or the admin console. */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const session = useSessionKind();

  useEffect(() => {
    loadColorSchemePreference();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <EventActionsProvider>
        <DemoBanner />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Residents and organizers. Logging out swaps these for the sign-in screens. */}
            <Stack.Protected guard={session === 'user'}>
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
            {/* Administrators only get the admin console. */}
            <Stack.Protected guard={session === 'admin'}>
              <Stack.Screen name="admin/index" />
              <Stack.Screen name="admin/applications" />
              <Stack.Screen name="admin/application/[id]" />
              <Stack.Screen name="admin/reports" />
              <Stack.Screen name="admin/organizations" />
              <Stack.Screen name="admin/users" />
              <Stack.Screen name="admin/feedback" />
              <Stack.Screen name="admin/profile" />
            </Stack.Protected>
            <Stack.Protected guard={session === 'signedOut'}>
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="sign-up" />
            </Stack.Protected>
          </Stack>
        </View>
        <StartupSplash />
        <StatusBar style="auto" />
      </EventActionsProvider>
    </ThemeProvider>
  );
}
