import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminCard } from '@/components/admin-ui';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Icons } from '@/components/icon';
import { SearchBar } from '@/components/search-bar';
import { SettingsScreen } from '@/components/settings-screen';
import { Tag } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { setUserSuspended, type UserSummary } from '@/data/admin';
import { useAdminUsers } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

export default function AdminUsersScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const { users, loading } = useAdminUsers(query);
  const [target, setTarget] = useState<UserSummary | null>(null);
  const suspending = target ? target.status !== 'suspended' : false;

  const statusTag = (u: UserSummary) =>
    u.status === 'suspended' ? (
      <Tag label="Suspended" color={theme.danger} />
    ) : u.status === 'deactivated' ? (
      <Tag label="Deactivated" color={theme.textSecondary} />
    ) : null;

  return (
    <SettingsScreen title="Users">
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search name or email" />

      {!loading && users.length === 0 ? (
        <EmptyState icon={Icons.people} title="No users found" message="Try another name or email." />
      ) : (
        <View style={styles.list}>
          {users.map((u) => (
            <AdminCard key={u.id} style={styles.card}>
              <Avatar name={u.displayName} uri={u.avatarUri} size={44} />
              <View style={styles.flex}>
                <View style={styles.nameRow}>
                  <ThemedText type="smallBold">{u.displayName}</ThemedText>
                  <Tag
                    label={u.role === 'organizer' ? 'Organizer' : 'Resident'}
                    color={u.role === 'organizer' ? theme.primary : theme.textSecondary}
                  />
                  {statusTag(u)}
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                  {u.email} · {u.location}
                </ThemedText>
                {u.organizations.length > 0 && (
                  <ThemedText type="caption" themeColor="textSecondary">
                    {u.organizations.join(', ')}
                  </ThemedText>
                )}
                <Button
                  label={u.status === 'suspended' ? 'Reinstate' : 'Suspend'}
                  icon={u.status === 'suspended' ? Icons.check : Icons.block}
                  variant="outline"
                  onPress={() => setTarget(u)}
                  style={styles.button}
                />
              </View>
            </AdminCard>
          ))}
        </View>
      )}

      <ConfirmDialog
        visible={target !== null}
        title={suspending ? `Suspend ${target?.displayName}?` : `Reinstate ${target?.displayName}?`}
        message={
          suspending
            ? 'They won’t be able to sign in until you reinstate the account. Their data is kept.'
            : 'They can sign in again.'
        }
        confirmLabel={suspending ? 'Suspend' : 'Reinstate'}
        destructive={suspending}
        onConfirm={async () => {
          if (target) await setUserSuspended(target.id, suspending);
          setTarget(null);
        }}
        onCancel={() => setTarget(null)}
      />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
    gap: Spacing.one,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  button: {
    flex: 0,
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
  },
});
