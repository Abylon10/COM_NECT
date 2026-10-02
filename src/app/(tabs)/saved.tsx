import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { EventCard } from '@/components/event-card';
import { Icons, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useEventActions } from '@/hooks/use-event-actions';
import { useEventsByIds } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';

type Segment = 'saved' | 'going' | 'interested';

const SEGMENTS: { id: Segment; label: string; empty: { icon: IconName; message: string } }[] = [
  {
    id: 'saved',
    label: 'Saved',
    empty: { icon: Icons.bookmark, message: 'Tap the bookmark on an event to keep it here.' },
  },
  {
    id: 'going',
    label: 'Going',
    empty: { icon: Icons.going, message: 'Events you mark as Going will show up here.' },
  },
  {
    id: 'interested',
    label: 'Interested',
    empty: { icon: Icons.interested, message: 'Events you mark as Interested will show up here.' },
  },
];

export default function SavedScreen() {
  const theme = useTheme();
  const { savedIds, rsvps } = useEventActions();
  const [segment, setSegment] = useState<Segment>('saved');

  const ids =
    segment === 'saved'
      ? savedIds
      : Object.keys(rsvps).filter((eventId) => rsvps[eventId] === segment);
  const { events, loading } = useEventsByIds(ids);
  const current = SEGMENTS.find((s) => s.id === segment)!;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">My Events</ThemedText>
          <View style={styles.chips}>
            {SEGMENTS.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                selected={segment === s.id}
                onPress={() => setSegment(s.id)}
              />
            ))}
          </View>
        </View>

        <FlatList
          data={events}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                icon={current.empty.icon}
                title={`No ${current.label.toLowerCase()} events yet`}
                message={current.empty.message}
              />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
});
