import { router } from 'expo-router';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { EventForm } from '@/components/event-form';
import { Icons } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { createEvent } from '@/data/events';
import { useMyOrganizations } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

export default function NewEventScreen() {
  const theme = useTheme();
  const { memberships, loading } = useMyOrganizations();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <ScreenHeader title="New Event" variant="close" />
      {loading ? null : memberships.length === 0 ? (
        <EmptyState
          icon={Icons.megaphone}
          title="Not allowed"
          message="Only members of a verified organization can post events."
        />
      ) : (
        <EventForm
          memberships={memberships}
          submitLabel="Publish event"
          onSubmit={async ({ status: _status, statusNote: _note, ...input }) => {
            try {
              const event = await createEvent(input);
              router.replace({ pathname: '/event/[id]', params: { id: event.id } });
            } catch (error) {
              Alert.alert('Could not publish', (error as Error).message);
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
