import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DatePickerSheet, TimePickerSheet } from '@/components/date-time-pickers';
import { PickerField, TextField } from '@/components/form-field';
import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  CATEGORIES,
  type Category,
  type EventStatus,
  type EventWithOrganization,
  type OrganizationMembership,
} from '@/data/events';
import { useLocations } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import {
  formatDateOnly,
  formatTimeOnly,
  fromManilaParts,
  toManilaParts,
  todayInManila,
} from '@/utils/format';

export type EventFormValues = {
  organizationId: string;
  title: string;
  category: Category;
  startAt: string;
  endAt: string;
  venue: string;
  location: string;
  description: string;
  registrationInfo: string;
  status: EventStatus;
  statusNote: string;
};

type EventFormProps = {
  /** Organizations the user can post for. */
  memberships: OrganizationMembership[];
  /** The event being edited; omit to create a new one. */
  event?: EventWithOrganization;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => Promise<void>;
};

const STATUSES: { id: EventStatus; label: string }[] = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'postponed', label: 'Postponed' },
  { id: 'cancelled', label: 'Cancelled' },
];

type Errors = Partial<Record<'title' | 'venue' | 'location' | 'date' | 'end' | 'statusNote', string>>;

export function EventForm({ memberships, event, submitLabel, onSubmit }: EventFormProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const locations = useLocations();
  const editing = !!event;
  const start = event ? toManilaParts(event.startAt) : { date: todayInManila(), time: '08:00' };
  const end = event ? toManilaParts(event.endAt) : { date: start.date, time: '10:00' };

  const [organizationId, setOrganizationId] = useState(
    event?.organizationId ?? memberships[0]?.organizationId ?? ''
  );
  const [title, setTitle] = useState(event?.title ?? '');
  const [category, setCategory] = useState<Category>(event?.category ?? 'youth');
  const [date, setDate] = useState(start.date);
  const [startTime, setStartTime] = useState(start.time);
  const [endTime, setEndTime] = useState(end.time);
  const [venue, setVenue] = useState(event?.venue ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [registrationInfo, setRegistrationInfo] = useState(event?.registrationInfo ?? '');
  const [status, setStatus] = useState<EventStatus>(event?.status ?? 'scheduled');
  const [statusNote, setStatusNote] = useState(event?.statusNote ?? '');

  const [picker, setPicker] = useState<'date' | 'start' | 'end' | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const errors: Errors = {};
  if (!title.trim()) errors.title = 'Required';
  if (!venue.trim()) errors.venue = 'Required';
  if (!location.trim()) errors.location = 'Required';
  if (!editing && date < todayInManila()) errors.date = 'Pick today or a later date';
  if (endTime <= startTime) errors.end = 'Must be after the start';
  if (status !== 'scheduled' && !statusNote.trim()) errors.statusNote = 'Tell residents what changed';
  const visibleErrors = showErrors ? errors : {};

  const submit = async () => {
    setShowErrors(true);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        organizationId,
        title: title.trim(),
        category,
        startAt: fromManilaParts(date, startTime),
        endAt: fromManilaParts(date, endTime),
        venue: venue.trim(),
        location: location.trim(),
        description: description.trim(),
        registrationInfo: registrationInfo.trim(),
        status,
        statusNote: statusNote.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const organization = memberships.find((m) => m.organizationId === organizationId)?.organization;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.postingAs, { backgroundColor: theme.primarySoft }]}>
          <ThemedText type="caption" themeColor="textSecondary">
            Posting as
          </ThemedText>
          {editing || memberships.length < 2 ? (
            <View style={styles.row}>
              <ThemedText type="smallBold">{organization?.name}</ThemedText>
              <Icon name={Icons.verified} size={16} color={theme.primary} />
            </View>
          ) : (
            <View style={styles.chips}>
              {memberships.map((m) => (
                <Chip
                  key={m.organizationId}
                  label={m.organization.name}
                  selected={m.organizationId === organizationId}
                  onPress={() => setOrganizationId(m.organizationId)}
                />
              ))}
            </View>
          )}
        </View>

        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Youth Leadership Summit"
          maxLength={80}
          error={visibleErrors.title}
        />

        <View style={styles.field}>
          <ThemedText type="smallBold">Category</ThemedText>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                selected={category === c.id}
                onPress={() => setCategory(c.id)}
              />
            ))}
          </View>
        </View>

        <PickerField
          label="Date"
          icon={Icons.calendar}
          value={formatDateOnly(date)}
          onPress={() => setPicker('date')}
          error={visibleErrors.date}
        />
        <View style={styles.row}>
          <PickerField
            label="Starts"
            icon={Icons.clock}
            value={formatTimeOnly(startTime)}
            onPress={() => setPicker('start')}
          />
          <PickerField
            label="Ends"
            icon={Icons.clock}
            value={formatTimeOnly(endTime)}
            onPress={() => setPicker('end')}
            error={visibleErrors.end}
          />
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          Times are in Philippine time.
        </ThemedText>

        <TextField
          label="Venue"
          value={venue}
          onChangeText={setVenue}
          placeholder="e.g. NSU Gymnasium"
          maxLength={80}
          error={visibleErrors.venue}
        />

        <View style={styles.field}>
          <TextField
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Brgy. Caraycaray, Naval"
            maxLength={80}
            error={visibleErrors.location}
          />
          <View style={styles.chips}>
            {locations.map((l) => (
              <Chip key={l} label={l} selected={l === location} onPress={() => setLocation(l)} />
            ))}
          </View>
        </View>

        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What will happen at this event?"
          multiline
          maxLength={1000}
        />
        <TextField
          label="How to join"
          value={registrationInfo}
          onChangeText={setRegistrationInfo}
          placeholder="Registration steps, fees, what to bring"
          multiline
          maxLength={500}
        />

        {editing && (
          <View style={[styles.statusBox, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Status</ThemedText>
            <View style={styles.chips}>
              {STATUSES.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  selected={status === s.id}
                  onPress={() => setStatus(s.id)}
                />
              ))}
            </View>
            {status !== 'scheduled' && (
              <TextField
                label="Note for residents"
                value={statusNote}
                onChangeText={setStatusNote}
                placeholder={
                  status === 'cancelled'
                    ? 'e.g. Cancelled due to the weather advisory.'
                    : 'e.g. Moved to Nov 7 because of rain.'
                }
                multiline
                maxLength={200}
                error={visibleErrors.statusNote}
              />
            )}
            <ThemedText type="caption" themeColor="textSecondary">
              Residents who saved or responded to this event are alerted when you change its
              date, time, place or status.
            </ThemedText>
          </View>
        )}
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
        {showErrors && Object.keys(errors).length > 0 && (
          <ThemedText type="caption" themeColor="danger" style={styles.footerError}>
            Please fix the highlighted fields.
          </ThemedText>
        )}
        <Button
          label={submitting ? 'Saving…' : submitLabel}
          icon={Icons.check}
          disabled={submitting}
          onPress={submit}
          style={styles.submit}
        />
      </View>

      <DatePickerSheet
        visible={picker === 'date'}
        value={date}
        minDate={editing ? undefined : todayInManila()}
        onChange={(d) => {
          setDate(d);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <TimePickerSheet
        visible={picker === 'start'}
        title="Start time"
        value={startTime}
        onChange={(t) => {
          setStartTime(t);
          // Keep the end after the start by default.
          if (endTime <= t) setEndTime(addHours(t, 2));
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <TimePickerSheet
        visible={picker === 'end'}
        title="End time"
        value={endTime}
        onChange={(t) => {
          setEndTime(t);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </KeyboardAvoidingView>
  );
}

function addHours(time: string, hours: number) {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h + hours, 23) * 60 + (h + hours > 23 ? 59 : m);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
  },
  postingAs: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statusBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  footerError: {
    textAlign: 'center',
  },
  submit: {
    flex: 0,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
