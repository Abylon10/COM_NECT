import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { EventsMap, type EventsMapHandle, type MapEvent } from '@/components/events-map';
import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import type { RsvpResponse } from '@/data/types';
import { useMyMapEvents } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { formatEventDate, formatTime } from '@/utils/format';
import { openInGoogleMaps } from '@/utils/maps';

type Filter = 'all' | RsvpResponse;

export default function MapScreen() {
  const theme = useTheme();
  const { events, loading } = useMyMapEvents();
  const [filter, setFilter] = useState<Filter>('all');
  const map = useRef<EventsMapHandle>(null);
  const shown = events.filter((e) => filter === 'all' || e.response === filter);
  const colors: Record<RsvpResponse, string> = { going: theme.primary, interested: theme.warning };
  const openEvent = (id: string) => router.push({ pathname: '/event/[id]', params: { id } });

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <EventsMap ref={map} events={shown} colors={colors} onOpenEvent={openEvent} />

      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <View style={[styles.header, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ThemedText type="heading">My Event Map · Biliran</ThemedText>
          <View style={styles.chips}>
            <Chip label={`All (${events.length})`} selected={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label="Going" selected={filter === 'going'} onPress={() => setFilter('going')} />
            <Chip label="Interested" selected={filter === 'interested'} onPress={() => setFilter('interested')} />
          </View>
          <View style={styles.legend}>
            <Dot color={colors.going} label="Going" />
            <Dot color={colors.interested} label="Interested" />
            <ThemedText type="caption" themeColor="textSecondary">
              Pins are approximate
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.bottom} pointerEvents="box-none">
        {!loading && shown.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ThemedText type="smallBold">No events on your map yet</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Tap Going or Interested on an event and it shows up here.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            horizontal
            data={shown}
            keyExtractor={(e) => e.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cards}
            renderItem={({ item }) => (
              <MapCard event={item} color={colors[item.response]} onFocus={() => map.current?.focus(item)} onOpen={() => openEvent(item.id)} />
            )}
          />
        )}
      </View>
    </View>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.dotRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="caption">{label}</ThemedText>
    </View>
  );
}

function MapCard({ event, color, onFocus, onOpen }: { event: MapEvent; color: string; onFocus: () => void; onOpen: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onFocus}
      accessibilityRole="button"
      accessibilityLabel={`Show ${event.title} on the map`}
      style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.cardHead}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <ThemedText type="caption" style={{ color, fontWeight: 700 }}>
          {event.response === 'going' ? 'GOING' : 'INTERESTED'}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" numberOfLines={1}>
        {event.title}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
        {formatEventDate(event.startAt)} · {formatTime(event.startAt)}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
        {event.venue}, {event.location}
      </ThemedText>
      <View style={styles.cardActions}>
        <Pressable onPress={onOpen} hitSlop={6} accessibilityRole="button">
          <ThemedText type="link">Details</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => openInGoogleMaps(event.coordinates, event.venue)}
          hitSlop={6}
          accessibilityRole="link"
          style={styles.dotRow}>
          <Icon name={Icons.map} size={14} color={theme.primary} />
          <ThemedText type="link">Google Maps</ThemedText>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    margin: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BottomTabInset + Spacing.three,
  },
  cards: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  card: {
    width: 260,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.one,
  },
  empty: {
    marginHorizontal: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.half,
  },
});
