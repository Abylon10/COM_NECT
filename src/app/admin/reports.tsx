import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminCard } from '@/components/admin-ui';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { TextField } from '@/components/form-field';
import { Icon, Icons } from '@/components/icon';
import { LoadingAnimation } from '@/components/loading-animation';
import { SettingsScreen } from '@/components/settings-screen';
import { StatusBadge, Tag } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  dismissReports,
  REPORT_REASON_LABEL,
  removeReportedEvent,
  type ReportGroup,
} from '@/data/admin';
import { useReportGroups } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { formatEventDate, formatTimeRange, timeAgo } from '@/utils/format';

export default function AdminReportsScreen() {
  const [filter, setFilter] = useState<'open' | 'resolved'>('open');
  const { groups, loading } = useReportGroups(filter);
  const [removing, setRemoving] = useState<ReportGroup | null>(null);
  const [dismissing, setDismissing] = useState<ReportGroup | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const closeRemove = () => {
    setRemoving(null);
    setReason('');
    setError('');
  };

  const remove = async () => {
    if (!removing) return;
    try {
      await removeReportedEvent(removing.eventId, reason);
      closeRemove();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <SettingsScreen title="Event Reports">
      <View style={styles.chips}>
        <Chip label="Open" selected={filter === 'open'} onPress={() => setFilter('open')} />
        <Chip label="Resolved" selected={filter === 'resolved'} onPress={() => setFilter('resolved')} />
      </View>

      {loading ? (
        <LoadingAnimation label="Loading reports…" scale={0.8} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Icons.flag}
          title={filter === 'open' ? 'No open reports' : 'Nothing resolved yet'}
          message="When residents report an event from its details page, it shows up here."
        />
      ) : (
        <View style={styles.list}>
          {groups.map((g) => (
            <ReportCard
              key={g.eventId}
              group={g}
              onDismiss={() => setDismissing(g)}
              onRemove={() => setRemoving(g)}
            />
          ))}
        </View>
      )}

      <ConfirmDialog
        visible={dismissing !== null}
        title="Dismiss these reports?"
        message="The event stays up and the reports are marked resolved."
        confirmLabel="Dismiss"
        onConfirm={async () => {
          if (dismissing) await dismissReports(dismissing.eventId);
          setDismissing(null);
        }}
        onCancel={() => setDismissing(null)}
      />
      <ConfirmDialog
        visible={removing !== null}
        title="Remove this event?"
        message={`“${removing?.eventTitle ?? ''}” will be taken down for everyone, and the organizer will see your reason.`}
        confirmLabel="Remove event"
        destructive
        confirmDisabled={reason.trim().length < 5}
        onConfirm={remove}
        onCancel={closeRemove}>
        <TextField
          label="Reason for the organizer"
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. The details are misleading. Please repost with the correct fee."
          multiline
          maxLength={300}
          error={error || undefined}
        />
      </ConfirmDialog>
    </SettingsScreen>
  );
}

function ReportCard({
  group: g,
  onDismiss,
  onRemove,
}: {
  group: ReportGroup;
  onDismiss: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const open = g.status === 'open';

  return (
    <AdminCard>
      <View style={styles.top}>
        {open ? (
          <Tag label={`${g.reports.length} report${g.reports.length === 1 ? '' : 's'}`} color={theme.danger} />
        ) : (
          <Tag
            label={g.status === 'removed' ? 'Event removed' : 'Dismissed'}
            color={g.status === 'removed' ? theme.danger : theme.textSecondary}
          />
        )}
        {g.event && <StatusBadge status={g.event.status} />}
        <ThemedText type="caption" themeColor="textSecondary" style={styles.right}>
          {timeAgo(g.latestAt)}
        </ThemedText>
      </View>

      <ThemedText type="heading">{g.eventTitle}</ThemedText>
      {g.event ? (
        <ThemedText type="small" themeColor="textSecondary">
          {g.event.organizationName} · {formatEventDate(g.event.startAt)},{' '}
          {formatTimeRange(g.event.startAt, g.event.endAt)} · {g.event.venue}
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No longer listed.
        </ThemedText>
      )}

      <View style={styles.reports}>
        {g.reports.map((r) => (
          <View key={r.id} style={[styles.report, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.reportHead}>
              <Icon name={Icons.flag} size={14} color={theme.danger} />
              <ThemedText type="smallBold" style={styles.flex}>
                {REPORT_REASON_LABEL[r.reason]}
              </ThemedText>
            </View>
            {r.details ? <ThemedText type="small">“{r.details}”</ThemedText> : null}
            <ThemedText type="caption" themeColor="textSecondary">
              {r.reporterName} · {timeAgo(r.createdAt)}
            </ThemedText>
          </View>
        ))}
      </View>

      {open && (
        <View style={styles.actions}>
          <Button label="Dismiss" variant="outline" onPress={onDismiss} />
          <Button
            label="Remove event"
            icon={Icons.trash}
            onPress={onRemove}
            disabled={!g.event}
            style={g.event ? { backgroundColor: theme.danger, borderColor: theme.danger } : undefined}
          />
        </View>
      )}
    </AdminCard>
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
    alignItems: 'center',
    gap: Spacing.two,
  },
  right: {
    marginLeft: 'auto',
  },
  reports: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  report: {
    borderRadius: Radius.sm,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  reportHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
