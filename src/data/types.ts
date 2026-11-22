/** Shared data types. All data access goes through the modules in src/data/. */

export type Category = 'youth' | 'educational' | 'sports' | 'cultural' | 'volunteer';

export type EventStatus = 'scheduled' | 'cancelled' | 'postponed';

export type RsvpResponse = 'going' | 'interested';

/** `admin` accounts only use the admin console (they don't browse as residents). */
export type UserRole = 'resident' | 'organizer' | 'admin';

export type Coordinates = { latitude: number; longitude: number };

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
  /** Map pin. Approximate for the mock data. */
  coordinates: Coordinates;
  /**
   * Photo URIs added by the organizer; the first is the cover. Local file
   * URIs for now; with the backend these become uploaded storage URLs.
   */
  photos: string[];
  registrationInfo: string;
  status: EventStatus;
  /** Shown when an organizer changes or cancels the event. */
  statusNote?: string;
  /** RSVP counts from other residents (not including the current user). */
  goingCount: number;
  interestedCount: number;
  updatedAt: string;
};

export const MAX_EVENT_PHOTOS = 6;

export type EventWithOrganization = CommunityEvent & { organization: Organization };

export type Profile = {
  id: string;
  displayName: string;
  email: string;
  /** New email waiting for verification. */
  pendingEmail?: string;
  phone: string;
  municipality: string;
  barangay: string;
  /** "Brgy. Caraycaray, Naval" */
  location: string;
  avatarUri?: string;
  role: UserRole;
  /** When the account was created (ISO). */
  joinedAt: string;
};

export type DateRange = 'any' | 'today' | 'week' | 'month';

export type EventFilters = {
  query?: string;
  category?: Category;
  organizationId?: string;
  location?: string;
  dateRange?: DateRange;
};

export type MemberRole = 'admin' | 'editor';

export type Membership = {
  userId: string;
  organizationId: string;
  memberRole: MemberRole;
};

export type OrganizationMembership = Membership & { organization: Organization };

/** What an organizer fills in when creating an event. */
export type EventInput = {
  organizationId: string;
  title: string;
  description: string;
  category: Category;
  startAt: string;
  endAt: string;
  venue: string;
  location: string;
  registrationInfo: string;
  /** Up to MAX_EVENT_PHOTOS; the first is the cover. */
  photos: string[];
};

/** What an organizer can change on an existing event. */
export type EventUpdate = Partial<Omit<EventInput, 'organizationId'>> & {
  status?: EventStatus;
  statusNote?: string;
};

export type NotificationKind =
  | 'updated'
  | 'postponed'
  | 'cancelled'
  | 'new'
  | 'reminder'
  | 'announcement'
  | 'application'
  | 'moderation';

export type AppNotification = {
  id: string;
  /** Event the notification opens, if any. */
  eventId?: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

/** Which notifications a user wants. */
export type NotificationSettings = {
  /** Every new event posted on the platform. */
  newEvents: boolean;
  /** New events that match the user's interests. */
  recommendations: boolean;
  /** Reminder the day before events the user is Going to. */
  reminders: boolean;
  /** Date, time or place changes to saved / RSVP'd events. */
  scheduleChanges: boolean;
  /** Cancellations and postponements of saved / RSVP'd events. */
  cancellations: boolean;
  /** Messages organizers post to people following their event. */
  announcements: boolean;
};

export type InterestOption = {
  id: string;
  label: string;
  emoji: string;
  /** Event categories this interest maps to. */
  categories: Category[];
  /** Words in an event's title/description that also count as a match. */
  keywords: string[];
};

export type UserInterests = {
  /** Selected InterestOption ids. */
  selected: string[];
  /** Free-text interests the user typed, e.g. "Hiking". */
  custom: string[];
};

export type OrganizationType =
  | 'barangay'
  | 'sk'
  | 'school'
  | 'ngo'
  | 'religious'
  | 'business'
  | 'other';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'requires_revision';

export type ApplicationDocument = { name: string; uri: string; size?: number };

export type OrganizerApplicationInput = {
  organizationName: string;
  organizationType: OrganizationType;
  description: string;
  contactEmail: string;
  contactPhone: string;
  documents: ApplicationDocument[];
};

export type OrganizerApplication = OrganizerApplicationInput & {
  id: string;
  userId: string;
  status: ApplicationStatus;
  /** Administrator's remarks (reason for rejection / what to revise). */
  adminNote?: string;
  submittedAt: string;
  updatedAt: string;
};

export type ReportReason = 'misleading' | 'inappropriate' | 'spam' | 'wrong_details' | 'other';

export type ReportStatus = 'open' | 'dismissed' | 'removed';

export type EventReport = {
  id: string;
  userId: string;
  eventId: string;
  /** Kept so the report still makes sense after the event is removed. */
  eventTitle: string;
  reason: ReportReason;
  details: string;
  createdAt: string;
  status: ReportStatus;
  resolvedAt?: string;
};

export type FeedbackKind = 'issue' | 'suggestion' | 'question';

export type Feedback = {
  id: string;
  userId: string | null;
  kind: FeedbackKind;
  message: string;
  createdAt: string;
};

/** Thrown when the current user isn't allowed to do something (mirrors database rules). */
export class PermissionError extends Error {}

/** Thrown when a form value is invalid; `field` says which one. */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
  }
}
