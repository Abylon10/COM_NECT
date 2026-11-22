import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AdminShell } from '@/components/admin/admin-shell';
import { DataTable, type Column } from '@/components/admin/admin-table';
import { StatTile } from '@/components/admin/admin-ui';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, Icons } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { ApplicationWithApplicant } from '@/data/admin';
import { useAdminStats, useApplications, useReportGroups } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate, timeAgo } from '@/utils/format';

/** Admin console home: counts, then what's waiting for review. */
export default function AdminDashboardScreen() {
  const theme = useTheme();
  const stats = useAdminStats();
  const { applications } = useApplications('pending');
  const { groups } = useReportGroups('open');
  const attention = stats.pendingApplications + stats.openReports;

  const requestColumns: Column<ApplicationWithApplicant>[] = [
    {
      key: 'org',
      title: 'Organization',
      flex: 2,
      compact: 'primary',
      render: (a) => (
        <ThemedText type="smallBold" numberOfLines={1}>
          {a.organizationName}
        </ThemedText>
      ),
    },
    {
      key: 'applicant',
      title: 'Applicant',
      flex: 1.4,
      render: (a) => (
        <ThemedText type="small" numberOfLines={1}>
          {a.applicantName}
        </ThemedText>
      ),
    },
    {
      key: 'date',
      title: 'Submitted',
      flex: 1,
      render: (a) => (
        <ThemedText type="small" themeColor="textSecondary">
          {formatShortDate(a.submittedAt)}
        </ThemedText>
      ),
    },
  ];

  return (
    <AdminShell
      active="dashboard"
      title="Dashboard"
      subtitle={
        attention > 0
          ? `Welcome back. ${attention} item${attention === 1 ? '' : 's'} need${attention === 1 ? 's' : ''} your review.`
          : 'Welcome back. Nothing is waiting for review.'
      }>
      <View style={styles.grid}>
        <StatTile
          label="Organizer requests"
          value={stats.pendingApplications}
          icon={Icons.verified}
          tone={stats.pendingApplications ? 'warning' : 'primary'}
          onPress={() => router.replace('/admin/applications')}
        />
        <StatTile
          label="Reported events"
          value={stats.openReports}
          icon={Icons.flag}
          tone={stats.openReports ? 'danger' : 'primary'}
          onPress={() => router.replace('/admin/reports')}
        />
        <StatTile
          label={`Users · ${stats.organizers} organizer${stats.organizers === 1 ? '' : 's'}`}
          value={stats.users}
          icon={Icons.people}
          onPress={() => router.replace('/admin/users')}
        />
        <StatTile
          label="Verified organizations"
          value={stats.verifiedOrganizations}
          icon={Icons.building}
          onPress={() => router.replace('/admin/organizations')}
        />
        <StatTile label="Upcoming events" value={stats.upcomingEvents} icon={Icons.calendar} />
        <StatTile
          label="Feedback"
          value={stats.feedback}
          icon={Icons.chat}
          onPress={() => router.replace('/admin/feedback')}
        />
      </View>

      <View style={styles.panels}>
        <Panel title="Organizer requests" onViewAll={() => router.replace('/admin/applications')}>
          <DataTable
            rows={applications}
            columns={requestColumns}
            keyOf={(a) => a.id}
            labelOf={(a) => a.organizationName}
            onRowPress={(a) => router.push(`/admin/application/${a.id}`)}
            pageSize={5}
            empty={<EmptyState icon={Icons.verified} title="All caught up" message="No requests waiting." />}
          />
        </Panel>

        <Panel title="Reported events" onViewAll={() => router.replace('/admin/reports')}>
          <View style={[styles.list, { backgroundColor: theme.background, borderColor: theme.border }]}>
            {groups.length === 0 ? (
              <EmptyState icon={Icons.flag} title="No open reports" message="Nothing flagged right now." />
            ) : (
              groups.slice(0, 5).map((g, i) => (
                <Pressable
                  key={g.eventId}
                  onPress={() => router.replace('/admin/reports')}
                  accessibilityRole="button"
                  accessibilityLabel={`Reports for ${g.eventTitle}`}
                  style={({ pressed }) => [
                    styles.reportRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                    pressed && { backgroundColor: theme.backgroundElement },
                  ]}>
                  <View style={[styles.flagCircle, { backgroundColor: theme.dangerSoft }]}>
                    <Icon name={Icons.flag} size={16} color={theme.danger} />
                  </View>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {g.eventTitle}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {g.reports.length} report{g.reports.length === 1 ? '' : 's'} · latest {timeAgo(g.latestAt)}
                    </ThemedText>
                  </View>
                  <Icon name={Icons.chevronRight} size={16} color={theme.textSecondary} />
                </Pressable>
              ))
            )}
          </View>
        </Panel>
      </View>
    </AdminShell>
  );
}

function Panel({ title, onViewAll, children }: { title: string; onViewAll: () => void; children: ReactNode }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <ThemedText type="subtitle" style={styles.flex}>
          {title}
        </ThemedText>
        <Pressable onPress={onViewAll} accessibilityRole="button" hitSlop={8}>
          <ThemedText type="smallBold" themeColor="primary">
            View all
          </ThemedText>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  panels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
  },
  panel: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 340,
    minWidth: 0,
    gap: Spacing.three,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  list: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  flagCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
