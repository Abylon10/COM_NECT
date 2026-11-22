import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminCard } from '@/components/admin-ui';
import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Icon, Icons } from '@/components/icon';
import { LoadingAnimation } from '@/components/loading-animation';
import { SettingsScreen } from '@/components/settings-screen';
import { Tag } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { setOrganizationVerified, type OrganizationSummary } from '@/data/admin';
import { useAdminOrganizations } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

export default function AdminOrganizationsScreen() {
  const theme = useTheme();
  const { organizations, loading } = useAdminOrganizations();
  const [target, setTarget] = useState<OrganizationSummary | null>(null);
  const verifying = target ? !target.isVerified : false;

  return (
    <SettingsScreen title="Organizations">
      <ThemedText type="small" themeColor="textSecondary">
        Members of a verified organization can post and manage its events. Unverifying stops new
        posts and edits; existing events stay listed.
      </ThemedText>

      {loading ? (
        <LoadingAnimation label="Loading organizations…" scale={0.8} />
      ) : (
        <View style={styles.list}>
          {organizations.map((o) => (
            <AdminCard key={o.id}>
              <View style={styles.top}>
                <ThemedText type="heading" style={styles.flex}>
                  {o.name}
                </ThemedText>
                {o.isVerified ? (
                  <Icon name={Icons.verified} size={20} color={theme.primary} />
                ) : (
                  <Tag label="Not verified" color={theme.textSecondary} />
                )}
              </View>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {o.description}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {o.upcomingEvents} upcoming event{o.upcomingEvents === 1 ? '' : 's'} ·{' '}
                {o.memberNames.length
                  ? `Members: ${o.memberNames.join(', ')}`
                  : 'No app members yet'}
              </ThemedText>
              <Button
                label={o.isVerified ? 'Unverify' : 'Verify'}
                icon={o.isVerified ? Icons.block : Icons.verified}
                variant={o.isVerified ? 'outline' : 'solid'}
                onPress={() => setTarget(o)}
                style={styles.button}
              />
            </AdminCard>
          ))}
        </View>
      )}

      <ConfirmDialog
        visible={target !== null}
        title={verifying ? `Verify ${target?.name}?` : `Unverify ${target?.name}?`}
        message={
          verifying
            ? 'Its members can post and edit events again.'
            : 'Its members won’t be able to post or edit events until it’s verified again. They will be notified.'
        }
        confirmLabel={verifying ? 'Verify' : 'Unverify'}
        destructive={!verifying}
        onConfirm={async () => {
          if (target) await setOrganizationVerified(target.id, verifying);
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
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  button: {
    flex: 0,
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
  },
});
