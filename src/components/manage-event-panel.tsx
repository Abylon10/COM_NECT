import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { TextField } from '@/components/form-field';
import { Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { postAnnouncement } from '@/data/events';
import type { EventWithOrganization } from '@/data/types';
import { useEventStats } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/utils/format';

/** Shown on an event's page to members of its organizing group. */
export function ManageEventPanel({ event }: { event: EventWithOrganization }) {
  const theme = useTheme();
  const stats = useEventStats(event.id);
  const [announcing, setAnnouncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState<number | null>(null);

  const send = async () => {
    setError('');
    try {
      const count = await postAnnouncement(event.id, message);
      setSentTo(count);
      setMessage('');
      setAnnouncing(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <View style={[styles.box, { backgroundColor: theme.primarySoft }]}>
      <View>
        <ThemedText type="smallBold">You manage this event</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          Last updated {timeAgo(event.updatedAt)}
        </ThemedText>
      </View>
      <View style={styles.stats}>
        {[
          ['Going', stats.going],
          ['Interested', stats.interested],
          ['Saved', stats.saved],
        ].map(([label, value]) => (
          <View key={label} style={[styles.stat, { backgroundColor: theme.background }]}>
            <ThemedText type="heading" style={{ color: theme.primary }}>
              {value}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {label}
            </ThemedText>
          </View>
        ))}
      </View>
      {sentTo !== null && (
        <ThemedText type="caption" themeColor="success">
          Announcement sent to {sentTo} {sentTo === 1 ? 'person' : 'people'} following this event.
        </ThemedText>
      )}
      <View style={styles.actions}>
        <Button
          label="Edit"
          icon={Icons.edit}
          variant="outline"
          onPress={() => router.push({ pathname: '/organizer/[id]', params: { id: event.id } })}
        />
        <Button label="Announce" icon={Icons.megaphone} onPress={() => setAnnouncing(true)} />
      </View>

      <BottomSheet visible={announcing} title="Post announcement" onClose={() => setAnnouncing(false)}>
        <ThemedText type="small" themeColor="textSecondary">
          Everyone who saved or responded to this event gets it as a notification.
        </ThemedText>
        <TextField
          label="Message"
          value={message}
          onChangeText={setMessage}
          placeholder="e.g. Registration closes tomorrow at 5 PM."
          multiline
          maxLength={300}
          error={error || undefined}
        />
        <Button label="Send announcement" icon={Icons.check} onPress={send} style={styles.full} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    gap: Spacing.three,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  full: {
    flex: 0,
    width: '100%',
    marginBottom: Spacing.two,
  },
});
