import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { CategoryStyles } from '@/components/category';
import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { EventWithOrganization } from '@/data/types';
import { useMyInterests, useRecommendedEvents } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { dateTileParts, formatTime } from '@/utils/format';

/** "Recommended for you": upcoming events matching the user's interests. */
export function RecommendedStrip() {
  const theme = useTheme();
  const { interests, loading } = useMyInterests();
  const events = useRecommendedEvents();
  const hasInterests = interests.selected.length + interests.custom.length > 0;

  if (loading) return null;

  if (!hasInterests) {
    return (
      <Pressable
        onPress={() => router.push('/settings/interests')}
        accessibilityRole="button"
        style={[styles.prompt, { backgroundColor: theme.primarySoft }]}>
        <Icon name={Icons.heart} size={20} color={theme.primary} />
        <ThemedText type="small" style={styles.flex}>
          Pick your interests to see recommended events first.
        </ThemedText>
        <Icon name={Icons.chevronRight} size={16} color={theme.primary} />
      </Pressable>
    );
  }
  if (events.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <ThemedText type="heading">Recommended for you</ThemedText>
        <Pressable onPress={() => router.push('/settings/interests')} hitSlop={8} accessibilityRole="button">
          <ThemedText type="link">Edit interests</ThemedText>
        </Pressable>
      </View>
      <FlatList
        horizontal
        data={events}
        keyExtractor={(e) => e.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <MiniCard event={item} />}
      />
      <ThemedText type="smallBold" themeColor="textSecondary">
        All events
      </ThemedText>
    </View>
  );
}

function MiniCard({ event }: { event: EventWithOrganization }) {
  const theme = useTheme();
  const { color, icon } = CategoryStyles[event.category];
  const { month, day } = dateTileParts(event.startAt);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, recommended`}
      style={({ pressed }) => [
        styles.card,
        { borderColor: theme.border, backgroundColor: theme.card },
        pressed && { opacity: 0.85 },
      ]}>
      <View style={[styles.cover, { backgroundColor: color }]}>
        <Icon name={icon} size={56} color="#FFFFFF" style={styles.coverIcon} />
        <View style={styles.date}>
          <ThemedText type="caption" style={{ color, fontWeight: 700 }}>
            {month} {day}
          </ThemedText>
        </View>
      </View>
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {event.title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {formatTime(event.startAt)} · {event.venue}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  list: {
    gap: Spacing.three,
  },
  card: {
    width: 200,
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  cover: {
    height: 84,
    justifyContent: 'flex-end',
    padding: Spacing.two,
    overflow: 'hidden',
  },
  coverIcon: {
    position: 'absolute',
    right: -6,
    top: 8,
    opacity: 0.25,
  },
  date: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  body: {
    padding: Spacing.two,
    gap: Spacing.half,
    minHeight: 64,
  },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginBottom: Spacing.one,
  },
  flex: {
    flex: 1,
  },
});
