import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { TextField } from '@/components/form-field';
import { Icon, Icons } from '@/components/icon';
import { useCroppedPhotoPicker } from '@/components/photo-cropper';
import { SettingsScreen, SettingsSection } from '@/components/settings-screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  cancelPendingEmail,
  confirmPendingEmail,
  MUNICIPALITY_NAMES,
  requestEmailChange,
  updateProfile,
} from '@/data/account';
import type { Profile } from '@/data/types';
import { ValidationError } from '@/data/types';
import { useCurrentUser } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

export default function EditProfileScreen() {
  const user = useCurrentUser();
  // Mount the form once the profile has loaded so fields start filled in.
  return user ? <EditProfileForm key={user.id} user={user} /> : <SettingsScreen title="Edit Profile">{null}</SettingsScreen>;
}

function EditProfileForm({ user }: { user: Profile }) {
  const theme = useTheme();
  const [avatarUri, setAvatarUri] = useState(user.avatarUri);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.pendingEmail ?? user.email);
  const [phone, setPhone] = useState(user.phone);
  const [municipality, setMunicipality] = useState(user.municipality);
  const [barangay, setBarangay] = useState(user.barangay);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  // Pick, then crop in the app (square, shown as a circle).
  const photo = useCroppedPhotoPicker(setAvatarUri, { aspect: 1, shape: 'circle', outputWidth: 600 });
  const pickPhoto = photo.pick;

  const save = async () => {
    setError(null);
    setSaved(false);
    try {
      await updateProfile({ displayName, phone, municipality, barangay, avatarUri });
      if (email.trim().toLowerCase() !== (user.pendingEmail ?? user.email)) {
        await requestEmailChange(email);
      }
      setSaved(true);
    } catch (err) {
      setError({ field: (err as ValidationError).field, message: (err as Error).message });
    }
  };
  const fieldError = (f: string) => (error?.field === f ? error.message : undefined);

  return (
    <SettingsScreen
      title="Edit Profile"
      footer={
        <>
          {saved && (
            <ThemedText type="small" style={styles.center} themeColor="success">
              Profile saved.
            </ThemedText>
          )}
          {error && !error.field && (
            <ThemedText type="small" style={styles.center} themeColor="danger">
              {error.message}
            </ThemedText>
          )}
          <Button label="Save changes" icon={Icons.check} onPress={save} style={styles.full} />
        </>
      }>
      <View style={styles.photo}>
        <Avatar name={displayName || user.displayName} size={104} uri={avatarUri} />
        <View style={styles.row}>
          <Button label="Change photo" icon={Icons.camera} variant="outline" onPress={pickPhoto} style={styles.small} />
          {avatarUri && (
            <Button label="Remove" variant="outline" onPress={() => setAvatarUri(undefined)} style={styles.small} />
          )}
        </View>
      </View>

      <SettingsSection title="Personal information">
        <TextField label="Full name" value={displayName} onChangeText={setDisplayName} maxLength={60} error={fieldError('displayName')} />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          error={fieldError('email')}
        />
        {user.pendingEmail && (
          <View style={[styles.notice, { backgroundColor: theme.warningSoft }]}>
            <Icon name={Icons.mail} size={18} color={theme.warning} />
            <View style={styles.flex}>
              <ThemedText type="small">
                We sent a verification link to {user.pendingEmail}. Your email stays {user.email} until
                it’s verified.
              </ThemedText>
              <View style={styles.row}>
                <Button label="I verified it (demo)" variant="outline" onPress={confirmPendingEmail} style={styles.small} />
                <Button
                  label="Cancel change"
                  variant="outline"
                  onPress={async () => {
                    await cancelPendingEmail();
                    setEmail(user.email);
                  }}
                  style={styles.small}
                />
              </View>
            </View>
          </View>
        )}
        <TextField
          label="Contact number"
          value={phone}
          onChangeText={setPhone}
          placeholder="09XXXXXXXXX"
          keyboardType="phone-pad"
          maxLength={13}
          error={fieldError('phone')}
        />
      </SettingsSection>

      <SettingsSection title="Where you live" description="Used to show events near you.">
        <View style={styles.chips}>
          {MUNICIPALITY_NAMES.map((m) => (
            <Chip key={m} label={m} selected={municipality === m} onPress={() => setMunicipality(m)} />
          ))}
        </View>
        {fieldError('municipality') && (
          <ThemedText type="caption" themeColor="danger">
            {fieldError('municipality')}
          </ThemedText>
        )}
        <TextField label="Barangay" value={barangay} onChangeText={setBarangay} placeholder="e.g. Caraycaray" maxLength={40} />
      </SettingsSection>
      {photo.cropper}
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  photo: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // `flex: 0` cancels Button's default `flex: 1`. Without it Android keeps
  // flex 1 and squeezes these buttons to zero width (tall empty pills).
  small: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    paddingHorizontal: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  notice: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  flex: {
    flex: 1,
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  full: {
    flex: 0,
    width: '100%',
  },
});
