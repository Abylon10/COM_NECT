import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { EventCover } from '@/components/events/event-cover';
import { Icon, Icons } from '@/components/ui/icon';
import { InfoRow } from '@/components/ui/info-row';
import { LoadingAnimation } from '@/components/ui/loading-animation';
import { ManageEventPanel } from '@/components/events/manage-event-panel';
import { PhotoGallery } from '@/components/photos/photo-gallery';
import { ReportEventSheet } from '@/components/events/report-event-sheet';
import { RsvpButtons } from '@/components/events/rsvp-buttons';
import { ThemedText } from '@/components/ui/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useEventActions } from '@/hooks/use-event-actions';
import { useEvent, useMyOrganizations } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { formatEventDate, formatTimeRange } from '@/utils/format';
import { openInGoogleMaps } from '@/utils/maps';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Event details: cover, info, photos, how to join, RSVP buttons, report, and the organizer panel for its organizers. */
export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { event, loading } = useEvent(id);
  const { rsvpFor } = useEventActions();
  const { memberships } = useMyOrganizations();
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  if (!event) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        {loading ? (
          <View style={styles.notFound}>
            <LoadingAnimation label="Loading event…" />
          </View>
        ) : (
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

  const canManage = memberships.some((m) => m.organizationId === event.organizationId);
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

          {canManage && <ManageEventPanel event={event} />}

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <InfoRow icon={Icons.calendar} text={formatEventDate(event.startAt)} />
            <InfoRow icon={Icons.clock} text={formatTimeRange(event.startAt, event.endAt)} />
            <InfoRow icon={Icons.venue} text={event.venue} />
            <InfoRow icon={Icons.location} text={event.location} />
            <Pressable
              onPress={() => openInGoogleMaps(event.coordinates, event.venue)}
              accessibilityRole="link"
              style={styles.mapLink}>
              <Icon name={Icons.map} size={16} color={theme.primary} />
              <ThemedText type="link">Open in Google Maps</ThemedText>
            </Pressable>
          </View>

          {event.photos.length > 0 && (
            <Section title="Photos">
              <PhotoGallery photos={event.photos} title={event.title} />
            </Section>
          )}

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
        {!canManage && (
          <View style={styles.reportRow}>
            {reported ? (
              <ThemedText type="caption" themeColor="textSecondary">
                Thanks. Administrators will review this event.
              </ThemedText>
            ) : (
              <Pressable onPress={() => setReporting(true)} hitSlop={8} accessibilityRole="button" style={styles.reportLink}>
                <Icon name={Icons.flag} size={14} color={theme.textSecondary} />
                <ThemedText type="caption" themeColor="textSecondary">
                  Report this event
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <ReportEventSheet
        eventId={event.id}
        visible={reporting}
        onClose={() => setReporting(false)}
        onReported={() => {
          setReporting(false);
          setReported(true);
        }}
      />

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
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  reportRow: {
    alignItems: 'center',
    paddingBottom: Spacing.three,
  },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  manageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  editButton: {
    flex: 0,
    minWidth: 96,
  },
  flex: {
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
