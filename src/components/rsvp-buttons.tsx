import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icons } from '@/components/icon';
import { Spacing } from '@/constants/theme';
import type { CommunityEvent } from '@/data/events';
import { useEventActions } from '@/hooks/use-event-actions';

/** "Interested" and "Going" toggles. Disabled for cancelled events. */
export function RsvpButtons({ event }: { event: CommunityEvent }) {
  const { rsvpFor, toggleRsvp } = useEventActions();
  const response = rsvpFor(event.id);
  const disabled = event.status === 'cancelled';

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
