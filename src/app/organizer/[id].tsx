import { useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { EventForm } from '@/components/events/event-form';
import { Icons } from '@/components/ui/icon';
import { goBack, ScreenHeader } from '@/components/ui/screen-header';
import { updateEvent } from '@/data/events';
import { useEvent, useMyOrganizations } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

/** Organizer: edit an existing event (also postpone / cancel with a note). */
export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { event, loading } = useEvent(id);
  const { memberships, loading: loadingOrgs } = useMyOrganizations();
  const canEdit = !!event && memberships.some((m) => m.organizationId === event.organizationId);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScreenHeader title="Edit Event" variant="close" />
      {loading || loadingOrgs ? null : !event ? (
        <EmptyState icon={Icons.eventBusy} title="Event not found" message="It may have been removed." />
      ) : !canEdit ? (
        <EmptyState
          icon={Icons.megaphone}
          title="Not allowed"
          message="Only members of the organizing group can edit this event."
        />
      ) : (
        <EventForm
          // Re-mount if a different event is opened so the fields reset.
          key={event.id}
          event={event}
          memberships={memberships}
          submitLabel="Save changes"
          onSubmit={async ({ organizationId: _org, ...update }) => {
            try {
              await updateEvent(event.id, update);
              goBack();
            } catch (error) {
              Alert.alert('Could not save', (error as Error).message);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
