import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/form-field';
import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { DEMO_PASSWORD, signIn, type SignInMode } from '@/data/account';
import { useTheme } from '@/hooks/use-theme';

const DEMO_ACCOUNTS: Record<SignInMode, { label: string; email: string }[]> = {
  user: [
    { label: 'Resident: Ashley Reyes', email: 'ashley@example.com' },
    { label: 'Organizer: Carlo Mendoza', email: 'carlo.sk@example.com' },
  ],
  admin: [{ label: 'Administrator', email: 'admin@example.com' }],
};

export default function SignInScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Tapping the logo switches to administrator sign-in.
  const [mode, setMode] = useState<SignInMode>('user');
  const admin = mode === 'admin';

  const toggleMode = () => {
    setMode(admin ? 'user' : 'admin');
    setError('');
  };

  const submit = async (e = email, p = password) => {
    setError('');
    if (!e.trim() || !p) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await signIn(e, p, mode);
      // The layout switches to the app (or admin console) once signed in.
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Pressable
              onPress={toggleMode}
              accessibilityRole="button"
              accessibilityLabel={admin ? 'Switch to regular sign-in' : 'Switch to administrator sign-in'}
              style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <Image
                source={require('@/assets/images/brand/logo-mark.png')}
                style={styles.logo}
                contentFit="contain"
              />
              {admin && (
                <View style={[styles.adminBadge, { backgroundColor: theme.primary, borderColor: theme.background }]}>
                  <Icon name={Icons.shield} size={16} color={theme.onPrimary} />
                </View>
              )}
            </Pressable>
            <ThemedText type="title" style={styles.center}>
              {admin ? 'Welcome, Administrator' : 'Community Connect'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {admin
                ? 'Sign in to the admin console to review organizers, reports and users.'
                : 'Local events and trusted announcements for Biliran, all in one place.'}
            </ThemedText>
          </View>

          <TextField label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
          />
          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
          <Button label={busy ? 'Signing in…' : 'Sign in'} onPress={() => submit()} disabled={busy} style={styles.full} />
          {admin ? (
            <Button label="Back to regular sign-in" variant="outline" onPress={toggleMode} style={styles.full} />
          ) : (
            <Button
              label="Create an account"
              variant="outline"
              onPress={() => router.push('/sign-up')}
              style={styles.full}
            />
          )}

          <View style={[styles.demo, { backgroundColor: theme.primarySoft }]}>
            <View style={styles.row}>
              <Icon name={Icons.info} size={18} color={theme.primary} />
              <ThemedText type="smallBold">Demo accounts</ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              Sign-in uses sample accounts until the backend is connected. Password:{' '}
              {DEMO_PASSWORD}
              {admin ? '' : '. Tap the logo for administrator sign-in.'}
            </ThemedText>
            {DEMO_ACCOUNTS[mode].map((a) => (
              <Button
                key={a.email}
                label={a.label}
                variant="outline"
                onPress={() => {
                  setEmail(a.email);
                  setPassword(DEMO_PASSWORD);
                  submit(a.email, DEMO_PASSWORD);
                }}
                style={styles.full}
              />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.five,
    marginBottom: Spacing.three,
  },
  logo: {
    width: 88,
    height: 88,
  },
  adminBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  full: {
    flex: 0,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  demo: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
