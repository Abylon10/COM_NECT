import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminShell } from '@/components/admin-shell';
import { DataTable, TableToolbar, type Column } from '@/components/admin-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { setOrganizationVerified, type OrganizationSummary } from '@/data/admin';
import { useAdminOrganizations } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

export default function AdminOrganizationsScreen() {
  const theme = useTheme();
  const { organizations } = useAdminOrganizations();
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<OrganizationSummary | null>(null);
  const verifying = target ? !target.isVerified : false;

  const q = search.trim().toLowerCase();
  const rows = organizations.filter((o) => !q || o.name.toLowerCase().includes(q));

  const columns: Column<OrganizationSummary>[] = [
    {
      key: 'name',
      title: 'Organization',
      flex: 3,
      compact: 'primary',
      render: (o) => (
        <View>
          <ThemedText type="smallBold" numberOfLines={1}>
            {o.name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {o.description}
          </ThemedText>
        </View>
      ),
    },
    {
      key: 'members',
      title: 'App members',
      flex: 1.6,
      render: (o) => (
        <ThemedText type="small" themeColor={o.memberNames.length ? 'text' : 'textSecondary'} numberOfLines={1}>
          {o.memberNames.length ? o.memberNames.join(', ') : 'No app members'}
        </ThemedText>
      ),
    },
    {
      key: 'events',
      title: 'Upcoming',
      flex: 1,
      render: (o) => (
        <ThemedText type="small" themeColor="textSecondary">
          {o.upcomingEvents} upcoming
        </ThemedText>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      flex: 1.2,
      render: (o) => (
        <View style={styles.inline}>
          {o.isVerified ? (
            <>
              <Icon name={Icons.verified} size={16} color={theme.primary} />
              <ThemedText type="small">Verified</ThemedText>
            </>
          ) : (
            <>
              <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
              <ThemedText type="small" themeColor="textSecondary">
                Not verified
              </ThemedText>
            </>
          )}
        </View>
      ),
    },
  ];

  return (
    <AdminShell
      active="organizations"
      title="Organizations"
      subtitle="Members of verified organizations can post and manage events">
      <TableToolbar
        title="All organizations"
        count={rows.length}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search organizations"
      />
      <DataTable
        rows={rows}
        columns={columns}
        keyOf={(o) => o.id}
        labelOf={(o) => o.name}
        actions={(o) => [
          o.isVerified
            ? { label: 'Unverify', icon: Icons.block, destructive: true, onPress: () => setTarget(o) }
            : { label: 'Verify', icon: Icons.verified, onPress: () => setTarget(o) },
        ]}
      />

      <ConfirmDialog
        visible={target !== null}
        title={verifying ? `Verify ${target?.name}?` : `Unverify ${target?.name}?`}
        message={
          verifying
            ? 'Its members can post and edit events again.'
            : 'Its members won’t be able to post or edit events until it’s verified again. Existing events stay listed. They will be notified.'
        }
        confirmLabel={verifying ? 'Verify' : 'Unverify'}
        destructive={!verifying}
        onConfirm={async () => {
          if (target) await setOrganizationVerified(target.id, verifying);
          setTarget(null);
        }}
        onCancel={() => setTarget(null)}
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
