import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminShell } from '@/components/admin-shell';
import { DataTable, TableToolbar, type Column } from '@/components/admin-table';
import { useApplicationStatusColor } from '@/components/admin-ui';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { APPLICATION_STATUS_LABEL, ORGANIZATION_TYPES } from '@/data/account';
import type { ApplicationWithApplicant } from '@/data/admin';
import { useApplications } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate } from '@/utils/format';

export default function AdminApplicationsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [search, setSearch] = useState('');
  const { applications, loading } = useApplications(filter);
  const statusColor = useApplicationStatusColor();

  const q = search.trim().toLowerCase();
  const rows = applications.filter(
    (a) =>
      !q ||
      a.organizationName.toLowerCase().includes(q) ||
      a.applicantName.toLowerCase().includes(q)
  );

  const open = (a: ApplicationWithApplicant) => router.push(`/admin/application/${a.id}`);

  const columns: Column<ApplicationWithApplicant>[] = [
    {
      key: 'org',
      title: 'Organization',
      flex: 2.4,
      compact: 'primary',
      render: (a) => (
        <View>
          <ThemedText type="smallBold" numberOfLines={1}>
            {a.organizationName}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {ORGANIZATION_TYPES.find((t) => t.id === a.organizationType)?.label}
          </ThemedText>
        </View>
      ),
    },
    {
      key: 'applicant',
      title: 'Applicant',
      flex: 1.5,
      render: (a) => (
        <ThemedText type="small" numberOfLines={1}>
          {a.applicantName}
        </ThemedText>
      ),
    },
    {
      key: 'docs',
      title: 'Documents',
      flex: 1,
      compact: 'hidden',
      render: (a) => (
        <View style={styles.inline}>
          <Icon name={Icons.attach} size={14} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            {a.documents.length}
          </ThemedText>
        </View>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      flex: 1.3,
      render: (a) => (
        <View style={styles.inline}>
          <View style={[styles.dot, { backgroundColor: statusColor(a.status) }]} />
          <ThemedText type="small">{APPLICATION_STATUS_LABEL[a.status]}</ThemedText>
        </View>
      ),
    },
    {
      key: 'submitted',
      title: 'Submitted',
      flex: 1.1,
      render: (a) => (
        <ThemedText type="small" themeColor="textSecondary">
          {formatShortDate(a.updatedAt)}
        </ThemedText>
      ),
    },
  ];

  return (
    <AdminShell
      active="applications"
      title="Organizer Requests"
      subtitle="Groups asking to become verified organizers">
      <View style={styles.chips}>
        <Chip label="Pending" selected={filter === 'pending'} onPress={() => setFilter('pending')} />
        <Chip label="All requests" selected={filter === 'all'} onPress={() => setFilter('all')} />
      </View>
      <TableToolbar
        title={filter === 'pending' ? 'Pending' : 'All requests'}
        count={rows.length}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search organization or applicant"
      />
      <DataTable
        rows={rows}
        columns={columns}
        keyOf={(a) => a.id}
        labelOf={(a) => a.organizationName}
        onRowPress={open}
        actions={(a) => [
          {
            label: a.status === 'pending' ? 'Review' : 'View details',
            icon: Icons.verified,
            onPress: () => open(a),
          },
        ]}
        empty={
          loading ? null : (
            <EmptyState
              icon={Icons.verified}
              title={filter === 'pending' ? 'No pending requests' : 'No requests yet'}
              message="Applications sent from Profile › Become an Organizer appear here."
            />
          )
        }
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
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
});
