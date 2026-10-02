import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { EventCover } from '@/components/event-cover';
import { Icon, Icons } from '@/components/icon';
import { InfoRow } from '@/components/info-row';
import { RsvpButtons } from '@/components/rsvp-buttons';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useEventActions } from '@/hooks/use-event-actions';
import { useEvent } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { formatEventDate, formatTimeRange } from '@/utils/format';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { event, loading } = useEvent(id);
  const { rsvpFor } = useEventActions();

  if (!event) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        {!loading && (
          <View style={styles.notFound}>
            <EmptyState
              icon={Icons.eventBusy}
              title="Event not found"
              message="This event may have been removed by its organizer."
            />
            <Button label="Back to events" onPress={goBack} style={styles.notFoundButton} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const goingCount = event.goingCount + (rsvpFor(event.id) === 'going' ? 1 : 0);
  const cancelled = event.status === 'cancelled';
  const { organization } = event;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <EventCover
          event={event}
          height={220 + insets.top}
          rounded={false}
          topInset={insets.top}
          leading={
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              style={styles.backButton}>
              <Icon name={Icons.back} size={20} color="#11181C" />
            </Pressable>
          }
        />

        <View style={styles.body}>
          {event.statusNote && (
            <View
              style={[
                styles.notice,
                { backgroundColor: cancelled ? theme.dangerSoft : theme.warningSoft },
              ]}>
              <Icon
                name={Icons.info}
                size={18}
                color={cancelled ? theme.danger : theme.warning}
              />
              <ThemedText type="small" style={styles.noticeText}>
                {event.statusNote}
              </ThemedText>
            </View>
          )}

          <View style={styles.titleBlock}>
            <ThemedText type="title">{event.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {goingCount} going · {event.interestedCount} interested
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <InfoRow icon={Icons.calendar} text={formatEventDate(event.startAt)} />
            <InfoRow icon={Icons.clock} text={formatTimeRange(event.startAt, event.endAt)} />
            <InfoRow icon={Icons.venue} text={event.venue} />
            <InfoRow icon={Icons.location} text={event.location} />
          </View>

          <Section title="About">
            <ThemedText type="small" style={styles.paragraph}>
              {event.description}
            </ThemedText>
          </Section>

          <Section title="How to join">
            <ThemedText type="small" style={styles.paragraph}>
              {event.registrationInfo}
            </ThemedText>
          </Section>

          <Section title="Organizer">
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.orgName}>
                <ThemedText type="smallBold" style={styles.flexShrink}>
                  {organization.name}
                </ThemedText>
                {organization.isVerified && (
                  <View style={[styles.verified, { backgroundColor: theme.primarySoft }]}>
                    <Icon name={Icons.verified} size={12} color={theme.primary} />
                    <ThemedText type="caption" style={{ color: theme.primary }}>
                      Verified
                    </ThemedText>
                  </View>
                )}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {organization.description}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {organization.contactInfo}
              </ThemedText>
            </View>
          </Section>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.two,
          },
        ]}>
        <View style={styles.footerInner}>
          <RsvpButtons event={event} />
        </View>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="heading">{title}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.four,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
  },
  notice: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  noticeText: {
    flex: 1,
  },
  titleBlock: {
    gap: Spacing.one,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  section: {
    gap: Spacing.two,
  },
  paragraph: {
    lineHeight: 22,
  },
  orgName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flexShrink: {
    flexShrink: 1,
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  footerInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundButton: {
    flex: 0,
    paddingHorizontal: Spacing.five,
  },
});
