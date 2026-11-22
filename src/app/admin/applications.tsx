import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminCard, useApplicationStatusColor } from '@/components/admin-ui';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { Icon, Icons } from '@/components/icon';
import { LoadingAnimation } from '@/components/loading-animation';
import { SettingsScreen } from '@/components/settings-screen';
import { Tag } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { APPLICATION_STATUS_LABEL, ORGANIZATION_TYPES } from '@/data/account';
import { useApplications } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/utils/format';

export default function AdminApplicationsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const { applications, loading } = useApplications(filter);
  const statusColor = useApplicationStatusColor();

  return (
    <SettingsScreen title="Organizer Applications">
      <View style={styles.chips}>
        <Chip label="Pending" selected={filter === 'pending'} onPress={() => setFilter('pending')} />
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
      </View>

      {loading ? (
        <LoadingAnimation label="Loading applications…" scale={0.8} />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={Icons.verified}
          title={filter === 'pending' ? 'No pending applications' : 'No applications yet'}
          message="Applications sent from Profile › Become an Organizer appear here."
        />
      ) : (
        <View style={styles.list}>
          {applications.map((a) => (
            <AdminCard
              key={a.id}
              onPress={() => router.push(`/admin/application/${a.id}`)}
              accessibilityLabel={`Review ${a.organizationName}`}>
              <View style={styles.top}>
                <Tag label={APPLICATION_STATUS_LABEL[a.status]} color={statusColor(a.status)} />
                <ThemedText type="caption" themeColor="textSecondary">
                  {timeAgo(a.updatedAt)}
                </ThemedText>
              </View>
              <ThemedText type="heading">{a.organizationName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {ORGANIZATION_TYPES.find((t) => t.id === a.organizationType)?.label} · by{' '}
                {a.applicantName}
              </ThemedText>
              <View style={styles.footer}>
                <Icon name={Icons.attach} size={16} color={theme.textSecondary} />
                <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
                  {a.documents.length} document{a.documents.length === 1 ? '' : 's'}
                </ThemedText>
                <ThemedText type="smallBold" themeColor="primary">
                  {a.status === 'pending' ? 'Review' : 'View'}
                </ThemedText>
                <Icon name={Icons.chevronRight} size={16} color={theme.primary} />
              </View>
            </AdminCard>
          ))}
        </View>
      )}
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  flex: {
    flex: 1,
  },
});
