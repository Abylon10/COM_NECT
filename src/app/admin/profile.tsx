import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AdminShell } from '@/components/admin-shell';
import { AdminCard } from '@/components/admin-ui';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { TextField } from '@/components/form-field';
import { Icon, Icons } from '@/components/icon';
import { useCroppedPhotoPicker } from '@/components/photo-cropper';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { changePassword, updateProfile } from '@/data/account';
import type { Profile } from '@/data/types';
import { ValidationError } from '@/data/types';
import { useCurrentUser } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

/** The administrator's own profile: photo, name, contact number, password. */
export default function AdminProfileScreen() {
  const user = useCurrentUser();
  return (
    <AdminShell active="profile" title="My Profile" subtitle="Your administrator account">
      {user ? <ProfileForms key={user.id} user={user} /> : null}
    </AdminShell>
  );
}

function ProfileForms({ user }: { user: Profile }) {
  const theme = useTheme();
  const [avatarUri, setAvatarUri] = useState(user.avatarUri);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [phone, setPhone] = useState(user.phone);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string; field?: string } | null>(null);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string; field?: string } | null>(null);

  const photo = useCroppedPhotoPicker(setAvatarUri, { aspect: 1, shape: 'circle', outputWidth: 600 });

  const saveProfile = async () => {
    setProfileMsg(null);
    try {
      await updateProfile({
        displayName,
        phone,
        municipality: user.municipality,
        barangay: user.barangay,
        avatarUri,
      });
      setProfileMsg({ ok: true, text: 'Profile saved.' });
    } catch (err) {
      setProfileMsg({ ok: false, text: (err as Error).message, field: (err as ValidationError).field });
    }
  };

  const savePassword = async () => {
    setPwMsg(null);
    if (next !== confirm) {
      setPwMsg({ ok: false, text: 'The new passwords don’t match.', field: 'confirm' });
      return;
    }
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setPwMsg({ ok: true, text: 'Password updated.' });
    } catch (err) {
      setPwMsg({ ok: false, text: (err as Error).message, field: (err as ValidationError).field });
    }
  };

  const profileField = (f: string) => (profileMsg && !profileMsg.ok && profileMsg.field === f ? profileMsg.text : undefined);
  const pwField = (f: string) => (pwMsg && !pwMsg.ok && pwMsg.field === f ? pwMsg.text : undefined);

  return (
    <View style={styles.columns}>
      <AdminCard style={styles.card}>
        <ThemedText type="subtitle">Profile</ThemedText>
        <View style={styles.photoRow}>
          <Pressable onPress={photo.pick} accessibilityRole="button" accessibilityLabel="Change photo">
            <Avatar name={displayName || 'Admin'} uri={avatarUri} size={88} />
            <View style={[styles.cameraBadge, { backgroundColor: theme.primary, borderColor: theme.card }]}>
              <Icon name={Icons.camera} size={14} color={theme.onPrimary} />
            </View>
          </Pressable>
          <View style={styles.photoText}>
            <ThemedText type="smallBold">Profile photo</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Shown in the admin console header.
            </ThemedText>
            <View style={styles.photoButtons}>
              <Button label="Change" variant="outline" onPress={photo.pick} style={styles.small} />
              {avatarUri && (
                <Button label="Remove" variant="outline" onPress={() => setAvatarUri(undefined)} style={styles.small} />
              )}
            </View>
          </View>
        </View>
        <TextField label="Display name" value={displayName} onChangeText={setDisplayName} maxLength={60} error={profileField('displayName')} />
        <TextField
          label="Contact number"
          value={phone}
          onChangeText={setPhone}
          placeholder="09XXXXXXXXX"
          keyboardType="phone-pad"
          maxLength={13}
          error={profileField('phone')}
        />
        <View style={styles.readOnly}>
          <ThemedText type="caption" themeColor="textSecondary">
            Sign-in email
          </ThemedText>
          <ThemedText type="small">{user.email}</ThemedText>
        </View>
        {profileMsg && (
          <ThemedText type="small" themeColor={profileMsg.ok ? 'success' : 'danger'}>
            {profileMsg.text}
          </ThemedText>
        )}
        <Button label="Save profile" icon={Icons.check} onPress={saveProfile} style={styles.full} />
      </AdminCard>

      <AdminCard style={styles.card}>
        <ThemedText type="subtitle">Change password</ThemedText>
        <TextField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry error={pwField('current')} />
        <TextField
          label="New password"
          value={next}
          onChangeText={setNext}
          placeholder="At least 8 characters"
          secureTextEntry
          error={pwField('next')}
        />
        <TextField label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry error={pwField('confirm')} />
        {pwMsg && (pwMsg.ok || !pwMsg.field) && (
          <ThemedText type="small" themeColor={pwMsg.ok ? 'success' : 'danger'}>
            {pwMsg.text}
          </ThemedText>
        )}
        <Button label="Update password" icon={Icons.lock} onPress={savePassword} style={styles.full} />
      </AdminCard>
      {photo.cropper}
    </View>
  );
}

const styles = StyleSheet.create({
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: Spacing.four,
  },
  card: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 320,
    minWidth: 0,
    gap: Spacing.three,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    flex: 1,
    gap: Spacing.one,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  small: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    minHeight: 36,
  },
  readOnly: {
    gap: Spacing.half,
  },
  full: {
    flex: 0,
    width: '100%',
  },
});
