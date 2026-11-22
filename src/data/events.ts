/**
 * Events, organizations, saves, RSVPs and organizer actions.
 *
 * Right now everything is mock data in ./db (it resets when the app
 * reloads). When the backend is decided (Supabase is the proposed choice),
 * only the modules in src/data/ should need to change.
 */

import {
  coordinatesFor,
  events,
  memberships,
  newId,
  notifyChange,
  organizations,
  reports,
  requireUserId,
  rsvpsByUser,
  savedByUser,
  session,
  users,
} from './db';
import { interestsFor, matchesInterests } from './interests';
import { deliver } from './notifications';
import type {
  Category,
  CommunityEvent,
  DateRange,
  EventFilters,
  EventInput,
  EventUpdate,
  EventWithOrganization,
  Organization,
  ReportReason,
  RsvpResponse,
} from './types';
import { MAX_EVENT_PHOTOS, PermissionError, ValidationError } from './types';

export * from './types';
export { getDataVersion, subscribeToChanges } from './db';

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'youth', label: 'Youth' },
  { id: 'educational', label: 'Educational' },
  { id: 'sports', label: 'Sports' },
  { id: 'cultural', label: 'Cultural' },
  { id: 'volunteer', label: 'Volunteer' },
];

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'misleading', label: 'Misleading or fake' },
  { id: 'wrong_details', label: 'Wrong date, time or place' },
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'spam', label: 'Spam or advertising' },
  { id: 'other', label: 'Something else' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withOrganization(event: CommunityEvent): EventWithOrganization {
  const organization = organizations.find((org) => org.id === event.organizationId);
  if (!organization) {
    throw new Error(`Event ${event.id} has unknown organization ${event.organizationId}`);
  }
  return { ...event, organization };
}

function hasEnded(event: CommunityEvent, now = Date.now()) {
  return Date.parse(event.endAt) < now;
}

function byStart(a: CommunityEvent, b: CommunityEvent) {
  return a.startAt.localeCompare(b.startAt);
}

function isInDateRange(event: CommunityEvent, range: DateRange, now = new Date()) {
  if (range === 'any') return true;
  const start = new Date(event.startAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = range === 'today' ? 1 : range === 'week' ? 7 : 31;
  const end = new Date(startOfToday);
  end.setDate(end.getDate() + days);
  return start >= startOfToday && start < end;
}

function savedSet(userId: string) {
  if (!savedByUser.has(userId)) savedByUser.set(userId, new Set());
  return savedByUser.get(userId)!;
}

function rsvpMap(userId: string) {
  if (!rsvpsByUser.has(userId)) rsvpsByUser.set(userId, new Map());
  return rsvpsByUser.get(userId)!;
}

/** Everyone who saved or responded to an event. */
function followersOf(eventId: string) {
  const followers = new Set<string>();
  savedByUser.forEach((ids, userId) => ids.has(eventId) && followers.add(userId));
  rsvpsByUser.forEach((map, userId) => map.has(eventId) && followers.add(userId));
  return followers;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Upcoming events (ended ones are left out) matching the filters, by start date. */
export async function getEvents(filters: EventFilters = {}): Promise<EventWithOrganization[]> {
  const query = filters.query?.trim().toLowerCase() ?? '';

  return events
    .filter((event) => !hasEnded(event))
    .map(withOrganization)
    .filter((event) => {
      if (filters.category && event.category !== filters.category) return false;
      if (filters.organizationId && event.organizationId !== filters.organizationId) return false;
      if (filters.location && event.location !== filters.location) return false;
      if (filters.dateRange && !isInDateRange(event, filters.dateRange)) return false;
      if (!query) return true;
      return [event.title, event.organization.name, event.venue, event.location]
        .join(' ')
        .toLowerCase()
        .includes(query);
    })
    .sort(byStart);
}

/** Upcoming events that match the current user's interests. */
export async function getRecommendedEvents(): Promise<EventWithOrganization[]> {
  if (!session.userId) return [];
  const interests = interestsFor(session.userId);
  return events
    .filter((e) => !hasEnded(e) && e.status !== 'cancelled' && matchesInterests(e, interests))
    .map(withOrganization)
    .sort(byStart);
}

export async function getEventsByIds(ids: string[]): Promise<EventWithOrganization[]> {
  return events
    .filter((event) => ids.includes(event.id))
    .map(withOrganization)
    .sort(byStart);
}

export async function getEvent(id: string): Promise<EventWithOrganization | null> {
  const event = events.find((e) => e.id === id);
  return event ? withOrganization(event) : null;
}

export async function getOrganizations(): Promise<Organization[]> {
  return [...organizations].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLocations(): Promise<string[]> {
  return [...new Set(events.map((e) => e.location))].sort();
}

/** Past events the user saved or responded to, newest first. */
export async function getEventHistory(): Promise<
  (EventWithOrganization & { response?: RsvpResponse; saved: boolean })[]
> {
  const userId = requireUserId();
  const saved = savedSet(userId);
  const responses = rsvpMap(userId);
  return events
    .filter((e) => hasEnded(e) && (saved.has(e.id) || responses.has(e.id)))
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
    .map((e) => ({ ...withOrganization(e), response: responses.get(e.id), saved: saved.has(e.id) }));
}

/** Upcoming events the user is Going to or Interested in, for the map. */
export async function getMyMapEvents(): Promise<
  (EventWithOrganization & { response: RsvpResponse })[]
> {
  const userId = requireUserId();
  const responses = rsvpMap(userId);
  return events
    .filter((e) => responses.has(e.id) && !hasEnded(e))
    .sort(byStart)
    .map((e) => ({ ...withOrganization(e), response: responses.get(e.id)! }));
}

/** Engagement numbers for organizers (including the current user's own responses). */
export async function getEventStats(
  eventId: string
): Promise<{ going: number; interested: number; saved: number }> {
  const event = events.find((e) => e.id === eventId);
  if (!event) return { going: 0, interested: 0, saved: 0 };
  let going = event.goingCount;
  let interested = event.interestedCount;
  let saved = 0;
  rsvpsByUser.forEach((map) => {
    if (map.get(eventId) === 'going') going += 1;
    if (map.get(eventId) === 'interested') interested += 1;
  });
  savedByUser.forEach((ids) => ids.has(eventId) && (saved += 1));
  return { going, interested, saved };
}

// ---------------------------------------------------------------------------
// Organizer actions (verified organization members only)
// ---------------------------------------------------------------------------

function canManageOrganization(organizationId: string) {
  const org = organizations.find((o) => o.id === organizationId);
  return (
    !!org?.isVerified &&
    memberships.some((m) => m.userId === session.userId && m.organizationId === organizationId)
  );
}

function validateEvent(
  e: Pick<EventInput, 'title' | 'venue' | 'location' | 'startAt' | 'endAt' | 'photos'>
) {
  if (!e.title.trim()) throw new ValidationError('Title is required.', 'title');
  if (!e.venue.trim()) throw new ValidationError('Venue is required.', 'venue');
  if (!e.location.trim()) throw new ValidationError('Location is required.', 'location');
  if (Number.isNaN(Date.parse(e.startAt)) || Number.isNaN(Date.parse(e.endAt))) {
    throw new ValidationError('Start and end must be valid dates.');
  }
  if (Date.parse(e.endAt) <= Date.parse(e.startAt)) {
    throw new ValidationError('The event must end after it starts.', 'end');
  }
  if (e.photos.length > MAX_EVENT_PHOTOS) {
    throw new ValidationError(`Add up to ${MAX_EVENT_PHOTOS} photos.`, 'photos');
  }
}

export async function createEvent(input: EventInput): Promise<EventWithOrganization> {
  if (!canManageOrganization(input.organizationId)) {
    throw new PermissionError('Only members of a verified organization can post its events.');
  }
  validateEvent(input);
  if (Date.parse(input.endAt) <= Date.now()) {
    throw new ValidationError('This time has already passed.', 'end');
  }
  const location = input.location.trim();
  const event: CommunityEvent = {
    ...input,
    id: newId('evt'),
    title: input.title.trim(),
    venue: input.venue.trim(),
    location,
    coordinates: coordinatesFor(location),
    status: 'scheduled',
    goingCount: 0,
    interestedCount: 0,
    updatedAt: new Date().toISOString(),
  };
  events.push(event);

  // New-event alerts: everyone who wants all new events, plus residents whose
  // interests match (recommendations). Nobody gets both.
  const orgName = organizations.find((o) => o.id === event.organizationId)!.name;
  const others = users.map((u) => u.id).filter((id) => id !== session.userId);
  const matching = others.filter((id) => matchesInterests(event, interestsFor(id)));
  deliver(matching, 'recommendations', {
    kind: 'new',
    title: 'Recommended for you',
    body: `${event.title} by ${orgName} matches your interests.`,
    eventId: event.id,
  });
  deliver(
    others.filter((id) => !matching.includes(id)),
    'newEvents',
    { kind: 'new', title: 'New event posted', body: `${event.title} by ${orgName}.`, eventId: event.id }
  );

  notifyChange();
  return withOrganization(event);
}

export async function updateEvent(id: string, update: EventUpdate): Promise<EventWithOrganization> {
  const event = events.find((e) => e.id === id);
  if (!event) throw new Error('Event not found.');
  if (!canManageOrganization(event.organizationId)) {
    throw new PermissionError('Only members of the organizing group can edit this event.');
  }
  const before = { ...event };
  const next: CommunityEvent = { ...event, ...update, updatedAt: new Date().toISOString() };
  if (next.status === 'scheduled') next.statusNote = update.statusNote?.trim() || undefined;
  if (next.status !== 'scheduled' && !next.statusNote?.trim()) {
    throw new ValidationError('Add a short note telling residents what changed.', 'statusNote');
  }
  validateEvent(next);
  if (next.location !== before.location) next.coordinates = coordinatesFor(next.location);
  Object.assign(event, next);
  alertFollowers(before, event);
  notifyChange();
  return withOrganization(event);
}

/**
 * Tells everyone who saved or RSVP'd to an event when its schedule, place or
 * status changes (respecting their notification settings).
 */
function alertFollowers(before: CommunityEvent, after: CommunityEvent) {
  const scheduleChanged = before.startAt !== after.startAt || before.endAt !== after.endAt;
  const placeChanged = before.venue !== after.venue || before.location !== after.location;
  const statusChanged = before.status !== after.status;
  if (!scheduleChanged && !placeChanged && !statusChanged) return;

  const followers = followersOf(after.id);
  followers.delete(session.userId!); // the organizer who made the change

  if (statusChanged && after.status !== 'scheduled') {
    deliver(followers, 'cancellations', {
      kind: after.status,
      title: after.status === 'cancelled' ? 'Event cancelled' : 'Event postponed',
      body: `${after.title}: ${after.statusNote}`,
      eventId: after.id,
    });
    return;
  }
  const changes: string[] = [];
  if (scheduleChanged) changes.push('new date or time');
  if (placeChanged) changes.push(`now at ${after.venue}`);
  if (statusChanged) changes.push('back on schedule');
  deliver(followers, 'scheduleChanges', {
    kind: 'updated',
    title: 'Event updated',
    body: `${after.title} has changes: ${changes.join(', ')}.`,
    eventId: after.id,
  });
}

/** Organizer message to everyone following an event. */
export async function postAnnouncement(eventId: string, message: string): Promise<number> {
  const event = events.find((e) => e.id === eventId);
  if (!event) throw new Error('Event not found.');
  if (!canManageOrganization(event.organizationId)) {
    throw new PermissionError('Only members of the organizing group can post announcements.');
  }
  const text = message.trim();
  if (text.length < 5) throw new ValidationError('Write a short message.', 'message');
  const followers = followersOf(eventId);
  followers.delete(session.userId!);
  deliver(followers, 'announcements', {
    kind: 'announcement',
    title: `Announcement: ${event.title}`,
    body: text,
    eventId,
  });
  notifyChange();
  return followers.size;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

/** Residents flag misleading or inappropriate posts for administrators. */
export async function reportEvent(
  eventId: string,
  reason: ReportReason,
  details: string
): Promise<void> {
  const userId = requireUserId();
  if (reason === 'other' && details.trim().length < 10) {
    throw new ValidationError('Tell us what is wrong (at least 10 characters).', 'details');
  }
  if (reports.some((r) => r.userId === userId && r.eventId === eventId)) {
    throw new ValidationError('You already reported this event. Thank you!');
  }
  reports.push({
    id: newId('rpt'),
    userId,
    eventId,
    reason,
    details: details.trim(),
    createdAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Saves and RSVPs (current user)
// ---------------------------------------------------------------------------

export async function getSavedEventIds(): Promise<string[]> {
  return session.userId ? [...savedSet(session.userId)] : [];
}

export async function setEventSaved(eventId: string, saved: boolean): Promise<void> {
  const set = savedSet(requireUserId());
  if (saved) set.add(eventId);
  else set.delete(eventId);
  notifyChange();
}

export async function getRsvps(): Promise<Record<string, RsvpResponse>> {
  return session.userId ? Object.fromEntries(rsvpMap(session.userId)) : {};
}

/** Pass `null` to remove the user's RSVP. */
export async function setRsvp(eventId: string, response: RsvpResponse | null): Promise<void> {
  const map = rsvpMap(requireUserId());
  if (response) map.set(eventId, response);
  else map.delete(eventId);
  notifyChange();
}
