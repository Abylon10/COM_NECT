import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { hasEnded, type CommunityEvent } from '@/data/events';
import { useEventActions } from '@/hooks/use-event-actions';

/** "Interested" and "Going" toggles. Disabled for cancelled events; replaced by a note once the event has ended. */
export function RsvpButtons({ event }: { event: CommunityEvent }) {
  const { rsvpFor, toggleRsvp } = useEventActions();
  const response = rsvpFor(event.id);
  const disabled = event.status === 'cancelled';

  if (hasEnded(event)) {
    const was = response === 'going' ? ' · You went' : response === 'interested' ? ' · You were interested' : '';
    return (
      <ThemedText type="smallBold" themeColor="textSecondary">
        This event has ended{was}
      </ThemedText>
    );
  }

  return (
    <View style={styles.row}>
      <Button
        label="Interested"
        icon={Icons.interested}
        variant={response === 'interested' ? 'solid' : 'outline'}
        disabled={disabled}
        onPress={() => toggleRsvp(event.id, 'interested')}
      />
      <Button
        label="Going"
        icon={Icons.going}
        variant={response === 'going' ? 'solid' : 'outline'}
        disabled={disabled}
        onPress={() => toggleRsvp(event.id, 'going')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
