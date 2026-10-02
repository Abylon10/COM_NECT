import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EventCover } from '@/components/event-cover';
import { Icons } from '@/components/icon';
import { InfoRow } from '@/components/info-row';
import { OrganizerLine } from '@/components/organizer-line';
import { RsvpButtons } from '@/components/rsvp-buttons';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { EventWithOrganization } from '@/data/events';
import { useEventActions } from '@/hooks/use-event-actions';
import { useTheme } from '@/hooks/use-theme';
import { formatEventDate, formatTime } from '@/utils/format';

export function EventCard({ event }: { event: EventWithOrganization }) {
  const theme = useTheme();
  const { rsvpFor } = useEventActions();
  const goingCount = event.goingCount + (rsvpFor(event.id) === 'going' ? 1 : 0);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${formatEventDate(event.startAt)}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <EventCover event={event} />

      <View style={styles.body}>
        <View style={styles.titleBlock}>
          <ThemedText type="heading" numberOfLines={2}>
            {event.title}
          </ThemedText>
          <OrganizerLine organization={event.organization} />
        </View>

        <View style={styles.info}>
          <InfoRow
            icon={Icons.calendar}
            text={`${formatEventDate(event.startAt)} · ${formatTime(event.startAt)}`}
          />
          <InfoRow icon={Icons.location} text={`${event.venue}, ${event.location}`} />
        </View>

        {event.statusNote && (
          <ThemedText
            type="caption"
            style={{ color: event.status === 'cancelled' ? theme.danger : theme.warning }}>
            {event.statusNote}
          </ThemedText>
        )}

        <ThemedText type="caption" themeColor="textSecondary">
          {goingCount} going · {event.interestedCount} interested
        </ThemedText>

        <RsvpButtons event={event} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.two,
    gap: Spacing.three,
  },
  body: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  titleBlock: {
    gap: Spacing.half,
  },
  info: {
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.9,
  },
});
