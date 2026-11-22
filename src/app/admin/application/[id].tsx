import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AdminCard, DetailLine, useApplicationStatusColor } from '@/components/admin-ui';
import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { TextField } from '@/components/form-field';
import { Icon, Icons } from '@/components/icon';
import { LoadingAnimation } from '@/components/loading-animation';
import { SettingsScreen, SettingsSection } from '@/components/settings-screen';
import { Tag } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { APPLICATION_STATUS_LABEL, ORGANIZATION_TYPES } from '@/data/account';
import { reviewApplication } from '@/data/admin';
import type { ApplicationStatus } from '@/data/types';
import { useApplication } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { formatEventDate } from '@/utils/format';

type Decision = Exclude<ApplicationStatus, 'pending'>;

const DECISION_TEXT: Record<Decision, { title: string; message: string; confirm: string }> = {
  approved: {
    title: 'Approve this organizer?',
    message:
      'This creates a verified organization and lets the applicant post events for it. They will be notified.',
    confirm: 'Approve',
  },
  requires_revision: {
    title: 'Ask for a revision?',
    message: 'The applicant will see your note and can update and resubmit the application.',
    confirm: 'Send back',
  },
  rejected: {
    title: 'Reject this application?',
    message: 'The applicant will see your note. They can apply again later.',
    confirm: 'Reject',
  },
};

export default function AdminApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { application: app, loading } = useApplication(id);
  const statusColor = useApplicationStatusColor();
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <SettingsScreen title="Application">
        <LoadingAnimation label="Loading application…" scale={0.8} />
      </SettingsScreen>
    );
  }
  if (!app) {
    return (
      <SettingsScreen title="Application">
        <EmptyState icon={Icons.info} title="Application not found" message="It may have been removed." />
      </SettingsScreen>
    );
  }

  const pending = app.status === 'pending';

  const choose = (d: Decision) => {
    setError('');
    if (d !== 'approved' && note.trim().length < 5) {
      setError('Write a note so the applicant knows what to fix or why.');
      return;
    }
    setDecision(d);
  };

  const confirm = async () => {
    if (!decision) return;
    try {
      await reviewApplication(app.id, decision, note);
      setDecision(null);
      router.back();
    } catch (err) {
      setDecision(null);
      setError((err as Error).message);
    }
  };

  return (
    <SettingsScreen
      title="Application"
      footer={
        pending ? (
          <>
            {error ? (
              <ThemedText type="caption" themeColor="danger" style={styles.center}>
                {error}
              </ThemedText>
            ) : null}
            <View style={styles.actions}>
              <Button label="Reject" variant="outline" onPress={() => choose('rejected')} />
              <Button label="Needs revision" variant="outline" onPress={() => choose('requires_revision')} />
            </View>
            <Button label="Approve organizer" icon={Icons.verified} onPress={() => choose('approved')} style={styles.full} />
          </>
        ) : undefined
      }>
      <AdminCard>
        <View style={styles.row}>
          <Tag label={APPLICATION_STATUS_LABEL[app.status]} color={statusColor(app.status)} />
        </View>
        <ThemedText type="title">{app.organizationName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {ORGANIZATION_TYPES.find((t) => t.id === app.organizationType)?.label}
        </ThemedText>
      </AdminCard>

      <SettingsSection title="About the organization">
        <ThemedText type="small">{app.description}</ThemedText>
      </SettingsSection>

      <SettingsSection title="Applicant & contact">
        <AdminCard>
          <DetailLine label="Applicant" value={app.applicantName} />
          <DetailLine label="Contact email" value={app.contactEmail} />
          <DetailLine label="Contact number" value={app.contactPhone || 'Not given'} />
          <DetailLine
            label="Submitted"
            value={`${formatEventDate(app.submittedAt)}${app.updatedAt !== app.submittedAt ? ` · updated ${formatEventDate(app.updatedAt)}` : ''}`}
          />
        </AdminCard>
      </SettingsSection>

      <SettingsSection
        title="Supporting documents"
        description="Check that they show the group is real and the applicant represents it.">
        {app.documents.map((d) => (
          <Pressable
            key={d.name}
            disabled={!d.uri}
            onPress={() => Linking.openURL(d.uri)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${d.name}`}
            style={[styles.doc, { backgroundColor: theme.backgroundElement }]}>
            <Icon name={Icons.document} size={20} color={theme.primary} />
            <View style={styles.flex}>
              <ThemedText type="small" numberOfLines={1}>
                {d.name}
              </ThemedText>
              {d.size ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  {Math.max(1, Math.round(d.size / 1024))} KB
                  {d.uri ? '' : ' · sample file'}
                </ThemedText>
              ) : null}
            </View>
          </Pressable>
        ))}
      </SettingsSection>

      {pending ? (
        <SettingsSection
          title="Note to the applicant"
          description="Required when rejecting or asking for a revision. Optional when approving.">
          <TextField
            label="Note"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Please attach your barangay certification."
            multiline
            maxLength={300}
          />
        </SettingsSection>
      ) : app.adminNote ? (
        <SettingsSection title="Your note">
          <ThemedText type="small">{app.adminNote}</ThemedText>
        </SettingsSection>
      ) : null}

      <ConfirmDialog
        visible={decision !== null}
        title={decision ? DECISION_TEXT[decision].title : ''}
        message={decision ? DECISION_TEXT[decision].message : ''}
        confirmLabel={decision ? DECISION_TEXT[decision].confirm : ''}
        destructive={decision === 'rejected'}
        onConfirm={confirm}
        onCancel={() => setDecision(null)}
      />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  doc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  flex: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
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
