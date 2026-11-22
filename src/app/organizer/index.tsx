import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Icon, Icons } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { EventWithOrganization } from '@/data/events';
import { useEvents, useEventStats, useMyOrganizations } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { formatEventDate, formatTimeRange } from '@/utils/format';

export default function OrganizerToolsScreen() {
  const theme = useTheme();
  const { memberships, loading } = useMyOrganizations();
  const { events } = useEvents({});
  const orgIds = memberships.map((m) => m.organizationId);
  const myEvents = events.filter((e) => orgIds.includes(e.organizationId));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Organizer Tools" />
      <View style={styles.container}>
        {!loading && memberships.length === 0 ? (
          <EmptyState
            icon={Icons.megaphone}
            title="For verified organizers"
            message="Only members of a verified organization can post and manage events. Switch to the organizer demo account on your Profile to try it."
          />
        ) : (
          <FlatList
            data={myEvents}
            keyExtractor={(e) => e.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.headerBlock}>
                {memberships.map((m) => (
                  <View
                    key={m.organizationId}
                    style={[styles.orgCard, { backgroundColor: theme.primarySoft }]}>
                    <View style={styles.row}>
                      <ThemedText type="heading" style={styles.flexShrink}>
                        {m.organization.name}
                      </ThemedText>
                      <Icon name={Icons.verified} size={18} color={theme.primary} />
                    </View>
                    <ThemedText type="caption" themeColor="textSecondary">
                      Verified organization · You are {m.memberRole === 'admin' ? 'an admin' : 'an editor'}
                    </ThemedText>
                  </View>
                ))}
                <Button
                  label="New event"
                  icon={Icons.add}
                  onPress={() => router.push('/organizer/new')}
                  style={styles.newButton}
                />
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Your events ({myEvents.length})
                </ThemedText>
              </View>
            }
            renderItem={({ item }) => <ManagedEventRow event={item} />}
            ListEmptyComponent={
              <EmptyState
                icon={Icons.calendar}
                title="No events yet"
                message="Tap New event to post your organization's first event."
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function ManagedEventRow({ event }: { event: EventWithOrganization }) {
  const theme = useTheme();
  const stats = useEventStats(event.id);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/organizer/[id]', params: { id: event.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${event.title}`}
      style={({ pressed }) => [
        styles.eventRow,
        { borderColor: theme.border, backgroundColor: theme.card },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <View style={styles.flex}>
        <View style={styles.row}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.flexShrink}>
            {event.title}
          </ThemedText>
          <StatusBadge status={event.status} />
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatEventDate(event.startAt)} · {formatTimeRange(event.startAt, event.endAt)}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {stats.going} going · {stats.interested} interested · {stats.saved} saved
        </ThemedText>
      </View>
      <Icon name={Icons.edit} size={18} color={theme.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  headerBlock: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  orgCard: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
    gap: Spacing.half,
  },
  flexShrink: {
    flexShrink: 1,
  },
  newButton: {
    flex: 0,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
});
