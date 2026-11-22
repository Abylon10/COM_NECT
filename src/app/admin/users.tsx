import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AdminShell } from '@/components/admin-shell';
import { DataTable, TableToolbar, type Column, type Sort } from '@/components/admin-table';
import { Avatar } from '@/components/avatar';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { setUserSuspended, type AccountStatus, type UserQuery, type UserSummary } from '@/data/admin';
import { useAdminUsers } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate } from '@/utils/format';

type RoleFilter = NonNullable<UserQuery['role']>;
type StatusFilter = NonNullable<UserQuery['status']>;

const ROLE_OPTIONS: { id: RoleFilter; label: string }[] = [
  { id: 'all', label: 'All roles' },
  { id: 'resident', label: 'Residents' },
  { id: 'organizer', label: 'Organizers' },
];
const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Any status' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'deactivated', label: 'Deactivated' },
];
const STATUS_LABEL: Record<AccountStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  deactivated: 'Deactivated',
};

/** Who to suspend or reinstate, waiting for confirmation. */
type Pending = { ids: string[]; name: string; suspend: boolean } | null;

export default function AdminUsersScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<Sort>({ key: 'joined', direction: 'desc' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending>(null);

  const { users, loading } = useAdminUsers({
    search,
    role,
    status,
    sort: sort.key === 'name' ? 'name' : sort.direction === 'asc' ? 'joined_asc' : 'joined_desc',
  });
  const filterCount = (role !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0);

  const statusColor: Record<AccountStatus, string> = {
    active: theme.success,
    suspended: theme.danger,
    deactivated: theme.textSecondary,
  };

  const columns: Column<UserSummary>[] = [
    {
      key: 'name',
      title: 'User name',
      flex: 2.4,
      sortable: true,
      compact: 'primary',
      render: (u) => (
        <View style={styles.userCell}>
          <Avatar name={u.displayName} uri={u.avatarUri} size={34} />
          <View style={styles.shrink}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {u.displayName}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {u.email}
            </ThemedText>
          </View>
        </View>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      flex: 1.6,
      render: (u) =>
        u.role === 'organizer' ? (
          <View style={styles.inline}>
            <ThemedText type="small">Organizer</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Verified
            </ThemedText>
            <Icon name={Icons.verified} size={14} color={theme.primary} />
          </View>
        ) : (
          <ThemedText type="small">Resident</ThemedText>
        ),
    },
    {
      key: 'location',
      title: 'Location',
      flex: 1.6,
      compact: 'hidden',
      render: (u) => (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {u.location}
        </ThemedText>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      flex: 1.1,
      render: (u) => (
        <View style={styles.inline}>
          <View style={[styles.dot, { backgroundColor: statusColor[u.status] }]} />
          <ThemedText type="small">{STATUS_LABEL[u.status]}</ThemedText>
        </View>
      ),
    },
    {
      key: 'joined',
      title: 'Date joined',
      flex: 1.2,
      sortable: true,
      render: (u) => (
        <ThemedText type="small" themeColor="textSecondary">
          {formatShortDate(u.joinedAt)}
        </ThemedText>
      ),
    },
  ];

  const toggleSort = (key: string) =>
    setSort((s) =>
      s.key === key
        ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'joined' ? 'desc' : 'asc' }
    );

  const selectedUsers = users.filter((u) => selected.has(u.id));

  const apply = async () => {
    if (!pending) return;
    for (const id of pending.ids) await setUserSuspended(id, pending.suspend);
    setPending(null);
    setSelected(new Set());
  };

  return (
    <AdminShell active="users" title="User Management" subtitle="Manage resident and organizer accounts">
      <TableToolbar
        title="All users"
        count={users.length}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name or email"
        filterCount={filterCount}
        onFilters={() => setFiltersOpen(true)}
      />

      {selected.size > 0 && (
        <View style={[styles.bulk, { backgroundColor: theme.primarySoft }]}>
          <ThemedText type="smallBold" style={styles.flex}>
            {selected.size} selected
          </ThemedText>
          <Button
            label="Suspend"
            icon={Icons.block}
            variant="outline"
            onPress={() =>
              setPending({
                ids: selectedUsers.filter((u) => u.status !== 'suspended').map((u) => u.id),
                name: `${selected.size} user${selected.size === 1 ? '' : 's'}`,
                suspend: true,
              })
            }
            style={styles.bulkButton}
          />
          <Button
            label="Reinstate"
            icon={Icons.check}
            variant="outline"
            onPress={() =>
              setPending({
                ids: selectedUsers.filter((u) => u.status === 'suspended').map((u) => u.id),
                name: `${selected.size} user${selected.size === 1 ? '' : 's'}`,
                suspend: false,
              })
            }
            style={styles.bulkButton}
          />
          <Button label="Clear" variant="outline" onPress={() => setSelected(new Set())} style={styles.bulkButton} />
        </View>
      )}

      <DataTable
        rows={users}
        columns={columns}
        keyOf={(u) => u.id}
        labelOf={(u) => u.displayName}
        selected={selected}
        onSelectedChange={setSelected}
        sort={sort}
        onSort={toggleSort}
        pageSize={6}
        actions={(u) => [
          u.status === 'suspended'
            ? {
                label: 'Reinstate',
                icon: Icons.check,
                onPress: () => setPending({ ids: [u.id], name: u.displayName, suspend: false }),
              }
            : {
                label: 'Suspend',
                icon: Icons.block,
                destructive: true,
                onPress: () => setPending({ ids: [u.id], name: u.displayName, suspend: true }),
              },
          { label: 'Contact', icon: Icons.mail, onPress: () => Linking.openURL(`mailto:${u.email}`) },
        ]}
        empty={
          loading ? null : (
            <EmptyState icon={Icons.people} title="No users found" message="Try another search or clear the filters." />
          )
        }
      />

      <BottomSheet visible={filtersOpen} title="Filter users" onClose={() => setFiltersOpen(false)}>
        <View style={styles.sheet}>
          <ThemedText type="smallBold">Role</ThemedText>
          <View style={styles.chips}>
            {ROLE_OPTIONS.map((o) => (
              <Chip key={o.id} label={o.label} selected={role === o.id} onPress={() => setRole(o.id)} />
            ))}
          </View>
          <ThemedText type="smallBold">Status</ThemedText>
          <View style={styles.chips}>
            {STATUS_OPTIONS.map((o) => (
              <Chip key={o.id} label={o.label} selected={status === o.id} onPress={() => setStatus(o.id)} />
            ))}
          </View>
          <View style={styles.sheetActions}>
            <Button
              label="Reset"
              variant="outline"
              onPress={() => {
                setRole('all');
                setStatus('all');
              }}
            />
            <Button label="Show results" onPress={() => setFiltersOpen(false)} />
          </View>
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={pending !== null}
        title={pending?.suspend ? `Suspend ${pending?.name}?` : `Reinstate ${pending?.name}?`}
        message={
          pending && pending.ids.length === 0
            ? pending.suspend
              ? 'Everyone selected is already suspended.'
              : 'No one selected is suspended.'
            : pending?.suspend
              ? 'They won’t be able to sign in until you reinstate them. Their data is kept.'
              : 'They can sign in again.'
        }
        confirmLabel={pending?.suspend ? 'Suspend' : 'Reinstate'}
        destructive={pending?.suspend}
        confirmDisabled={pending?.ids.length === 0}
        onConfirm={apply}
        onCancel={() => setPending(null)}
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },
  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
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
  bulk: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  bulkButton: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  },
  sheet: {
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
