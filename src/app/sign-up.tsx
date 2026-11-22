import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/form-field';
import { SettingsScreen } from '@/components/settings-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { signUp } from '@/data/account';
import { ValidationError } from '@/data/types';

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await signUp({ displayName, email, password });
    } catch (err) {
      setError({ field: (err as ValidationError).field, message: (err as Error).message });
    }
  };
  const fieldError = (f: string) => (error?.field === f ? error.message : undefined);

  return (
    <SettingsScreen
      title="Create Account"
      footer={<Button label="Create account" onPress={submit} style={styles.full} />}>
      <View style={styles.form}>
        <ThemedText type="small" themeColor="textSecondary">
          New accounts start as residents. Organizations can apply to post events from your
          Profile after signing up.
        </ThemedText>
        <TextField label="Full name" value={displayName} onChangeText={setDisplayName} error={fieldError('displayName')} />
        <TextField label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" error={fieldError("email")} />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          error={fieldError('password')}
        />
        {error && !error.field ? (
          <ThemedText type="small" themeColor="danger">
            {error.message}
          </ThemedText>
        ) : null}
      </View>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.four,
  },
  full: {
    flex: 0,
    width: '100%',
  },
});
