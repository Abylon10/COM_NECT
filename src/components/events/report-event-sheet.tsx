import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/form-field';
import { Icons } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { REPORT_REASONS, reportEvent } from '@/data/events';
import type { ReportReason } from '@/data/types';

type ReportEventSheetProps = {
  eventId: string;
  visible: boolean;
  onClose: () => void;
  onReported: () => void;
};

/** Lets residents flag misleading or inappropriate event posts for administrators. */
export function ReportEventSheet({ eventId, visible, onClose, onReported }: ReportEventSheetProps) {
  const [reason, setReason] = useState<ReportReason>('misleading');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      await reportEvent(eventId, reason, details);
      setDetails('');
      onReported();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <BottomSheet visible={visible} title="Report this event" onClose={onClose}>
      <ThemedText type="small" themeColor="textSecondary">
        Administrators review every report. The organizer won’t see who reported it.
      </ThemedText>
      <View style={styles.chips}>
        {REPORT_REASONS.map((r) => (
          <Chip key={r.id} label={r.label} selected={reason === r.id} onPress={() => setReason(r.id)} />
        ))}
      </View>
      <TextField
        label={reason === 'other' ? 'Details' : 'Details (optional)'}
        value={details}
        onChangeText={setDetails}
        placeholder="What's wrong with this post?"
        multiline
        maxLength={500}
        error={error || undefined}
      />
      <Button label="Send report" icon={Icons.flag} onPress={submit} style={styles.full} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  full: {
    flex: 0,
    width: '100%',
    marginBottom: Spacing.two,
  },
});
