import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryStyles, categoryLabel } from '@/components/category';
import { Icon, Icons } from '@/components/icon';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { CommunityEvent } from '@/data/events';
import { useEventActions } from '@/hooks/use-event-actions';
import { dateTileParts } from '@/utils/format';

type EventCoverProps = {
  event: CommunityEvent;
  height?: number;
  rounded?: boolean;
  /** Extra space above the content, e.g. the status bar on full-bleed covers. */
  topInset?: number;
  /** Rendered before the badges, e.g. a back button. */
  leading?: ReactNode;
};

/**
 * Colored cover for an event, based on its category. Shows the status badge,
 * a date tile, and a save button. Can be swapped for a photo later.
 */
export function EventCover({
  event,
  height = 140,
  rounded = true,
  topInset = 0,
  leading,
}: EventCoverProps) {
  const { isSaved, toggleSaved } = useEventActions();
  const { icon, color } = CategoryStyles[event.category];
  const { month, day } = dateTileParts(event.startAt);
  const saved = isSaved(event.id);

  return (
    <View
      style={[
        styles.cover,
        { height, backgroundColor: color, paddingTop: Spacing.three + topInset },
        rounded && styles.rounded,
      ]}>
      <Icon name={icon} size={height * 0.75} color="rgba(255,255,255,0.18)" style={styles.bigIcon} />

      <View style={styles.topRow}>
        <View style={styles.badges}>
          {leading}
          <StatusBadge status={event.status} />
          <View style={styles.categoryTag}>
            <ThemedText type="caption" style={styles.categoryText}>
              {categoryLabel(event.category)}
            </ThemedText>
          </View>
        </View>
        <Pressable
          onPress={() => toggleSaved(event.id)}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved' : 'Save event'}
          hitSlop={8}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
          <Icon name={saved ? Icons.bookmarkFilled : Icons.bookmark} size={18} color={color} />
        </Pressable>
      </View>

      <View style={styles.dateTile}>
        <ThemedText type="caption" style={[styles.month, { color }]}>
          {month}
        </ThemedText>
        <ThemedText style={styles.day}>{day}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    overflow: 'hidden',
    padding: Spacing.three,
    justifyContent: 'space-between',
  },
  rounded: {
    borderRadius: Radius.md,
  },
  bigIcon: {
    position: 'absolute',
    right: -Spacing.three,
    bottom: -Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  categoryTag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  categoryText: {
    color: '#FFFFFF',
    fontWeight: 700,
  },
  saveButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTile: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    minWidth: 46,
  },
  month: {
    fontWeight: 700,
  },
  day: {
    color: '#11181C',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.7,
  },
});
