import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { TextField } from '@/components/form-field';
import { Icon, Icons } from '@/components/icon';
import { SettingsScreen, SettingsSection } from '@/components/settings-screen';
import { Tag } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  APPLICATION_STATUS_LABEL,
  ORGANIZATION_TYPES,
  submitOrganizerApplication,
} from '@/data/account';
import type {
  ApplicationDocument,
  ApplicationStatus,
  OrganizationType,
  OrganizerApplication,
  Profile,
} from '@/data/types';
import { ValidationError } from '@/data/types';
import { useCurrentUser, useMyApplication, useMyOrganizations } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { formatEventDate } from '@/utils/format';

const STATUS_MEANING: Record<ApplicationStatus, string> = {
  pending: 'Waiting for an administrator to review your application.',
  approved: 'Organizer privileges granted. You can now post and manage events.',
  rejected: 'Your application was not approved. You can apply again with more details.',
  requires_revision: 'An administrator needs more information. Update your application and resubmit.',
};

export default function OrganizerApplicationScreen() {
  const { memberships, loading } = useMyOrganizations();
  const { application, loading: loadingApp } = useMyApplication();
  const user = useCurrentUser();
  const [editing, setEditing] = useState(false);

  // Wait for the profile too, so the form can prefill the contact details.
  if (loading || loadingApp || !user) return <SettingsScreen title="Become an Organizer">{null}</SettingsScreen>;

  const showForm = !application || editing;

  if (memberships.length > 0 && !editing) {
    return (
      <SettingsScreen title="Organizer Status">
        <StatusCard application={application} approvedOrg={memberships[0].organization.name} />
        <Button label="Open Organizer Tools" icon={Icons.megaphone} onPress={() => router.push('/organizer')} style={styles.full} />
      </SettingsScreen>
    );
  }

  if (application && !showForm) {
    return (
      <SettingsScreen title="Organizer Application">
        <StatusCard application={application} />
        {application.status === 'requires_revision' && (
          <Button label="Update and resubmit" icon={Icons.edit} onPress={() => setEditing(true)} style={styles.full} />
        )}
        {application.status === 'rejected' && (
          <Button label="Apply again" icon={Icons.add} onPress={() => setEditing(true)} style={styles.full} />
        )}
      </SettingsScreen>
    );
  }

  return (
    <ApplicationForm
      user={user}
      // Prefill when revising; start blank after a rejection.
      initial={application?.status === 'requires_revision' ? application : undefined}
      adminNote={application?.status === 'requires_revision' ? application.adminNote : undefined}
      onSubmitted={() => setEditing(false)}
    />
  );
}

function StatusCard({ application, approvedOrg }: { application: OrganizerApplication | null; approvedOrg?: string }) {
  const theme = useTheme();
  const status: ApplicationStatus = approvedOrg ? 'approved' : application!.status;
  const color = { pending: theme.warning, approved: theme.success, rejected: theme.danger, requires_revision: theme.warning }[status];

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Tag label={APPLICATION_STATUS_LABEL[status]} color={color} />
      <ThemedText type="heading">{approvedOrg ?? application?.organizationName}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {STATUS_MEANING[status]}
      </ThemedText>
      {application && (
        <ThemedText type="caption" themeColor="textSecondary">
          Submitted {formatEventDate(application.submittedAt)} · {application.documents.length} document
          {application.documents.length === 1 ? '' : 's'}
        </ThemedText>
      )}
      {application?.adminNote && (
        <View style={[styles.note, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">Administrator’s note</ThemedText>
          <ThemedText type="small">{application.adminNote}</ThemedText>
        </View>
      )}
    </View>
  );
}


function ApplicationForm({
  user,
  initial,
  adminNote,
  onSubmitted,
}: {
  user: Profile;
  initial?: OrganizerApplication;
  adminNote?: string;
  onSubmitted: () => void;
}) {
  const theme = useTheme();
  const [organizationName, setOrganizationName] = useState(initial?.organizationName ?? '');
  const [organizationType, setOrganizationType] = useState<OrganizationType | null>(initial?.organizationType ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? user.email);
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? user.phone);
  const [documents, setDocuments] = useState<ApplicationDocument[]>(initial?.documents ?? []);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  const pickDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      setDocuments((docs) => [
        ...docs,
        ...result.assets.map((a) => ({ name: a.name, uri: a.uri, size: a.size })),
      ]);
    }
  };

  const submit = async () => {
    setError(null);
    try {
      await submitOrganizerApplication({
        organizationName,
        organizationType: organizationType ?? ('' as OrganizationType),
        description,
        contactEmail,
        contactPhone,
        documents,
      });
      onSubmitted();
    } catch (err) {
      setError({ field: (err as ValidationError).field, message: (err as Error).message });
    }
  };
  const fieldError = (f: string) => (error?.field === f ? error.message : undefined);

  return (
    <SettingsScreen
      title="Become an Organizer"
      footer={
        <>
          {error && (
            <ThemedText type="small" themeColor="danger" style={styles.center}>
              {error.field ? 'Please check the highlighted fields.' : error.message}
            </ThemedText>
          )}
          <Button label={initial ? 'Resubmit application' : 'Submit for verification'} icon={Icons.check} onPress={submit} style={styles.full} />
        </>
      }>
      <ThemedText type="small" themeColor="textSecondary">
        Organizations and authorized individuals in Biliran can apply to publish events. An
        administrator verifies each application. Once approved, organizer tools are added to this
        same account.
      </ThemedText>
      {adminNote && (
        <View style={[styles.note, { borderColor: theme.warning }]}>
          <ThemedText type="smallBold">What to revise</ThemedText>
          <ThemedText type="small">{adminNote}</ThemedText>
        </View>
      )}

      <SettingsSection title="Organization">
        <TextField label="Organization name" value={organizationName} onChangeText={setOrganizationName} maxLength={80} error={fieldError('organizationName')} />
        <View style={styles.field}>
          <ThemedText type="smallBold">
            Organization type{' '}
            {fieldError('organizationType') && (
              <ThemedText type="caption" themeColor="danger">
                {fieldError('organizationType')}
              </ThemedText>
            )}
          </ThemedText>
          <View style={styles.chips}>
            {ORGANIZATION_TYPES.map((t) => (
              <Chip key={t.id} label={t.label} selected={organizationType === t.id} onPress={() => setOrganizationType(t.id)} />
            ))}
          </View>
        </View>
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What does your organization do, and what events will you post?"
          multiline
          maxLength={600}
          error={fieldError('description')}
        />
      </SettingsSection>

      <SettingsSection title="Contact information">
        <TextField label="Contact email" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" error={fieldError('contactEmail')} />
        <TextField label="Contact number (optional)" value={contactPhone} onChangeText={setContactPhone} placeholder="09XXXXXXXXX" keyboardType="phone-pad" maxLength={13} error={fieldError('contactPhone')} />
      </SettingsSection>

      <SettingsSection
        title="Supporting documents"
        description="e.g. barangay certification, endorsement letter, SEC/CDA registration, or school recognition. PDF or photos.">
        {documents.map((d, i) => (
          <View key={`${d.uri}-${i}`} style={[styles.doc, { borderColor: theme.border }]}>
            <Icon name={Icons.document} size={20} color={theme.primary} />
            <ThemedText type="small" numberOfLines={1} style={styles.flex}>
              {d.name}
            </ThemedText>
            <Pressable onPress={() => setDocuments(documents.filter((_, j) => j !== i))} hitSlop={10} accessibilityLabel={`Remove ${d.name}`}>
              <Icon name={Icons.close} size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        ))}
        {fieldError('documents') && (
          <ThemedText type="caption" themeColor="danger">
            {fieldError('documents')}
          </ThemedText>
        )}
        <Button label="Attach documents" icon={Icons.attach} variant="outline" onPress={pickDocuments} style={styles.full} />
      </SettingsSection>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  note: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.two,
  },
  doc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    minHeight: 44,
    fontSize: 15,
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  full: {
    flex: 0,
    width: '100%',
  },
});
