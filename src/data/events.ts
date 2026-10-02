/**
 * All data access for the app lives here. Screens and hooks call these
 * functions and never know where the data comes from.
 *
 * Right now everything is mock data kept in memory (it resets when the app
 * reloads). When the backend is decided (Supabase is the proposed choice),
 * only this file should need to change. Every function is already `async`
 * so the swap won't ripple into the screens.
 */

export type Category = 'youth' | 'educational' | 'sports' | 'cultural' | 'volunteer';

export type EventStatus = 'scheduled' | 'cancelled' | 'postponed';

export type RsvpResponse = 'going' | 'interested';

export type UserRole = 'resident' | 'organizer';

export type Organization = {
  id: string;
  name: string;
  description: string;
  contactInfo: string;
  isVerified: boolean;
};

export type CommunityEvent = {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  category: Category;
  /** ISO 8601 timestamps. */
  startAt: string;
  endAt: string;
  venue: string;
  /** Barangay / municipality. Used by the location filter. */
  location: string;
  registrationInfo: string;
  status: EventStatus;
  /** Shown when an organizer changes or cancels the event. */
  statusNote?: string;
  /** RSVP counts from other residents (not including the current user). */
  goingCount: number;
  interestedCount: number;
  updatedAt: string;
};

export type EventWithOrganization = CommunityEvent & { organization: Organization };

export type Profile = {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  location: string;
};

export type DateRange = 'any' | 'today' | 'week' | 'month';

export type EventFilters = {
  query?: string;
  category?: Category;
  organizationId?: string;
  location?: string;
  dateRange?: DateRange;
};

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'youth', label: 'Youth' },
  { id: 'educational', label: 'Educational' },
  { id: 'sports', label: 'Sports' },
  { id: 'cultural', label: 'Cultural' },
  { id: 'volunteer', label: 'Volunteer' },
];

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const organizations: Organization[] = [
  {
    id: 'org-sk-naval',
    name: 'SK Federation of Naval',
    description: 'Sangguniang Kabataan federation coordinating youth programs across Naval.',
    contactInfo: 'sk.naval@example.com · 0917 000 0001',
    isVerified: true,
  },
  {
    id: 'org-coastal',
    name: 'Biliran Coastal Volunteers',
    description: 'Residents and students keeping Biliran shorelines clean since 2019.',
    contactInfo: 'coastalvolunteers@example.com',
    isVerified: true,
  },
  {
    id: 'org-hoops',
    name: 'Naval Inter-Barangay Hoops League',
    description: 'Community basketball league for barangay teams in Naval.',
    contactInfo: 'Facebook: Naval Hoops League',
    isVerified: true,
  },
  {
    id: 'org-compsoc',
    name: 'NSU Computer Society',
    description: 'Student organization running free tech workshops for the community.',
    contactInfo: 'compsoc@example.com',
    isVerified: true,
  },
  {
    id: 'org-kultura',
    name: 'Kultura Biliran Arts Collective',
    description: 'Local artists, dancers, and musicians promoting Biliranon culture.',
    contactInfo: 'kulturabiliran@example.com',
    isVerified: true,
  },
  {
    id: 'org-youth-office',
    name: 'Naval Youth Development Office',
    description: 'Municipal office handling scholarships, trainings, and youth services.',
    contactInfo: 'Municipal Hall, 2nd floor · (053) 000 0000',
    isVerified: true,
  },
  {
    id: 'org-redcross-youth',
    name: 'Biliran Red Cross Youth',
    description: 'Youth volunteers supporting blood drives and disaster preparedness.',
    contactInfo: 'rcy.biliran@example.com',
    isVerified: true,
  },
];

const events: CommunityEvent[] = [
  {
    id: 'evt-youth-summit',
    organizationId: 'org-sk-naval',
    title: 'Youth Leadership Summit 2026',
    description:
      'A one-day summit for young leaders aged 15–24. Talks from local officials and student leaders, workshops on project planning and public speaking, and a networking lunch.',
    category: 'youth',
    startAt: '2026-10-10T08:00:00+08:00',
    endAt: '2026-10-10T17:00:00+08:00',
    venue: 'NSU Gymnasium',
    location: 'Brgy. Caraycaray, Naval',
    registrationInfo:
      'Free. Pre-register at your barangay SK office or through the SK Federation page before Oct 8. Bring a valid school or government ID.',
    status: 'scheduled',
    goingCount: 48,
    interestedCount: 31,
    updatedAt: '2026-09-28T10:00:00+08:00',
  },
  {
    id: 'evt-scholarship-info',
    organizationId: 'org-youth-office',
    title: 'Scholarship Info Session',
    description:
      'Learn about municipal and provincial scholarship programs for SY 2027–2028: who can apply, required documents, and deadlines. Q&A with the scholarship coordinator.',
    category: 'educational',
    startAt: '2026-10-14T14:00:00+08:00',
    endAt: '2026-10-14T16:00:00+08:00',
    venue: 'Municipal Session Hall',
    location: 'Brgy. P.I. Garcia, Naval',
    registrationInfo: 'Walk-in, no registration needed. Seats are first come, first served.',
    status: 'scheduled',
    goingCount: 22,
    interestedCount: 40,
    updatedAt: '2026-09-30T09:00:00+08:00',
  },
  {
    id: 'evt-coastal-cleanup',
    organizationId: 'org-coastal',
    title: 'Coastal Cleanup Drive',
    description:
      'Join us in cleaning up the Atipolo shoreline. Volunteers are grouped into teams; trash is sorted for recycling. Snacks provided after the cleanup.',
    category: 'volunteer',
    startAt: '2026-10-17T06:00:00+08:00',
    endAt: '2026-10-17T10:00:00+08:00',
    venue: 'Atipolo Shoreline (meet at Barangay Hall)',
    location: 'Brgy. Atipolo, Naval',
    registrationInfo:
      'Sign up on arrival. Bring gloves, a water bottle, and wear closed shoes. Volunteer certificates available for students.',
    status: 'scheduled',
    goingCount: 35,
    interestedCount: 18,
    updatedAt: '2026-09-25T15:30:00+08:00',
  },
  {
    id: 'evt-fun-run',
    organizationId: 'org-redcross-youth',
    title: 'Run for a Cause 5K',
    description:
      'A 5K fun run raising funds for disaster preparedness kits for coastal barangays.',
    category: 'sports',
    startAt: '2026-10-18T05:30:00+08:00',
    endAt: '2026-10-18T08:30:00+08:00',
    venue: 'Naval Town Plaza',
    location: 'Brgy. Santissimo Rosario, Naval',
    registrationInfo: 'Registration fee ₱150 includes race bib and shirt.',
    status: 'cancelled',
    statusNote: 'Cancelled due to the weather advisory. Registration fees will be refunded.',
    goingCount: 60,
    interestedCount: 25,
    updatedAt: '2026-10-01T18:00:00+08:00',
  },
  {
    id: 'evt-hoops-opening',
    organizationId: 'org-hoops',
    title: 'Inter-Barangay League Opening Day',
    description:
      'Opening ceremony and first games of the Inter-Barangay Basketball League. Team parade, muse presentation, then back-to-back games.',
    category: 'sports',
    startAt: '2026-10-24T15:00:00+08:00',
    endAt: '2026-10-24T21:00:00+08:00',
    venue: 'Naval Town Plaza Covered Court',
    location: 'Brgy. Santissimo Rosario, Naval',
    registrationInfo:
      'Free admission for spectators. Team registration is closed for this season.',
    status: 'scheduled',
    goingCount: 120,
    interestedCount: 64,
    updatedAt: '2026-09-20T12:00:00+08:00',
  },
  {
    id: 'evt-coding-workshop',
    organizationId: 'org-compsoc',
    title: 'Build Your First App Workshop',
    description:
      'A hands-on beginner workshop on building a simple mobile app. No experience needed. Mentors from the NSU Computer Society will guide each table.',
    category: 'educational',
    startAt: '2026-10-31T13:00:00+08:00',
    endAt: '2026-10-31T17:00:00+08:00',
    venue: 'NSU ICT Laboratory',
    location: 'Brgy. Caraycaray, Naval',
    registrationInfo:
      'Limited to 40 participants. Register through the Computer Society page. Bring a laptop if you have one; a few units are available.',
    status: 'scheduled',
    goingCount: 29,
    interestedCount: 52,
    updatedAt: '2026-09-29T08:00:00+08:00',
  },
  {
    id: 'evt-cultural-night',
    organizationId: 'org-kultura',
    title: 'Biliranon Cultural Night',
    description:
      'An evening of traditional dance, live music, and spoken word by local artists. Food stalls from Naval home businesses.',
    category: 'cultural',
    startAt: '2026-11-07T18:00:00+08:00',
    endAt: '2026-11-07T22:00:00+08:00',
    venue: 'Provincial Capitol Grounds',
    location: 'Brgy. Larrazabal, Naval',
    registrationInfo: 'Free and open to all. Bring your own mat or chair.',
    status: 'postponed',
    statusNote: 'Postponed from Oct 3 because of rain. Now happening on Nov 7.',
    goingCount: 75,
    interestedCount: 90,
    updatedAt: '2026-10-01T09:00:00+08:00',
  },
  {
    id: 'evt-blood-drive',
    organizationId: 'org-redcross-youth',
    title: 'Community Blood Donation Drive',
    description:
      'Donate blood and help save lives. Medical screening is done on-site before donation.',
    category: 'volunteer',
    startAt: '2026-11-14T08:00:00+08:00',
    endAt: '2026-11-14T15:00:00+08:00',
    venue: 'Barangay Hall',
    location: 'Brgy. Larrazabal, Naval',
    registrationInfo:
      'Donors must be 18–65 years old and at least 50 kg. Eat a full meal and get enough sleep the night before.',
    status: 'scheduled',
    goingCount: 41,
    interestedCount: 27,
    updatedAt: '2026-09-27T14:00:00+08:00',
  },
];

const currentUser: Profile = {
  id: 'user-1',
  displayName: 'Ashley Reyes',
  email: 'ashley@example.com',
  role: 'resident',
  location: 'Brgy. Caraycaray, Naval',
};

const savedEventIds = new Set<string>(['evt-coastal-cleanup']);
const rsvps = new Map<string, RsvpResponse>([['evt-youth-summit', 'going']]);

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

function withOrganization(event: CommunityEvent): EventWithOrganization {
  const organization = organizations.find((org) => org.id === event.organizationId);
  if (!organization) {
    throw new Error(`Event ${event.id} has unknown organization ${event.organizationId}`);
  }
  return { ...event, organization };
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

export async function getEvents(filters: EventFilters = {}): Promise<EventWithOrganization[]> {
  const query = filters.query?.trim().toLowerCase() ?? '';

  return events
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
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function getEventsByIds(ids: string[]): Promise<EventWithOrganization[]> {
  return events
    .filter((event) => ids.includes(event.id))
    .map(withOrganization)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
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

export async function getCurrentUser(): Promise<Profile> {
  return currentUser;
}

// ---------------------------------------------------------------------------
// Saves and RSVPs (current user)
// ---------------------------------------------------------------------------

export async function getSavedEventIds(): Promise<string[]> {
  return [...savedEventIds];
}

export async function setEventSaved(eventId: string, saved: boolean): Promise<void> {
  if (saved) savedEventIds.add(eventId);
  else savedEventIds.delete(eventId);
}

export async function getRsvps(): Promise<Record<string, RsvpResponse>> {
  return Object.fromEntries(rsvps);
}

/** Pass `null` to remove the user's RSVP. */
export async function setRsvp(eventId: string, response: RsvpResponse | null): Promise<void> {
  if (response) rsvps.set(eventId, response);
  else rsvps.delete(eventId);
}
