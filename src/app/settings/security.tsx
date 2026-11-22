import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TextField } from '@/components/ui/form-field';
import { Icons } from '@/components/ui/icon';
import { SettingsScreen, SettingsSection } from '@/components/ui/settings-screen';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { changePassword, deactivateAccount, deleteAccount } from '@/data/account';
import { ValidationError } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

/** Account & Security: change password, deactivate or delete the account. */
export default function SecurityScreen() {
  const theme = useTheme();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwError, setPwError] = useState<{ field?: string; message: string } | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  const [dialog, setDialog] = useState<'deactivate' | 'delete' | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const savePassword = async () => {
    setPwError(null);
    setPwSaved(false);
    if (next !== confirm) {
      setPwError({ field: 'confirm', message: "Passwords don't match." });
      return;
    }
    try {
      await changePassword(current, next);
      setPwSaved(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setPwError({ field: (err as ValidationError).field, message: (err as Error).message });
    }
  };
  const pwField = (f: string) => (pwError?.field === f ? pwError.message : undefined);

  return (
    <SettingsScreen title="Account & Security">
      <SettingsSection title="Change password">
        <TextField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry error={pwField('current')} />
        <TextField label="New password" value={next} onChangeText={setNext} placeholder="At least 8 characters" secureTextEntry error={pwField('next')} />
        <TextField label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry error={pwField('confirm')} />
        {pwSaved && (
          <ThemedText type="small" themeColor="success">
            Password changed.
          </ThemedText>
        )}
        <Button label="Update password" icon={Icons.lock} onPress={savePassword} style={styles.button} />
      </SettingsSection>

      <SettingsSection
        title="Deactivate account"
        description="Hide your account for a while. Sign in again anytime to reactivate it; your saved events stay.">
        <Button label="Deactivate account" variant="outline" onPress={() => setDialog('deactivate')} style={styles.button} />
      </SettingsSection>

      <SettingsSection
        title="Delete account"
        description="Permanently delete your account, saved events, responses and notifications. This can't be undone.">
        <View>
          <Button
            label="Delete account"
            variant="outline"
            onPress={() => setDialog('delete')}
            style={[styles.button, { borderColor: theme.danger }]}
          />
        </View>
      </SettingsSection>

      <ConfirmDialog
        visible={dialog === 'deactivate'}
        title="Deactivate your account?"
        message="You'll be signed out. Signing in again reactivates your account."
        confirmLabel="Deactivate"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          deactivateAccount();
        }}
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title="Delete your account?"
        message="This permanently removes your account and data. Enter your password to confirm."
        confirmLabel="Delete forever"
        destructive
        confirmDisabled={!deletePassword}
        onCancel={() => {
          setDialog(null);
          setDeletePassword('');
          setDeleteError('');
        }}
        onConfirm={async () => {
          try {
            await deleteAccount(deletePassword);
          } catch (err) {
            setDeleteError((err as Error).message);
          }
        }}>
        <TextField
          label="Password"
          value={deletePassword}
          onChangeText={setDeletePassword}
          secureTextEntry
          error={deleteError || undefined}
        />
      </ConfirmDialog>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 0,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
  },
});
