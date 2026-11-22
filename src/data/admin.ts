/**
 * Administrator console: organizer applications, event reports,
 * organizations, users and feedback.
 *
 * Every function checks that the signed-in user is an administrator, like
 * the organizer checks in events.ts. With Supabase these checks become
 * row-level security policies on `profiles.role = 'admin'`.
 */

import {
  applications,
  deactivated,
  events,
  feedback,
  memberships,
  newId,
  notifyChange,
  organizations,
  reports,
  rsvpsByUser,
  savedByUser,
  session,
  suspended,
  users,
} from './db';
import { deliver } from './notifications';
import type {
  ApplicationStatus,
  CommunityEvent,
  EventReport,
  Feedback,
  Organization,
  OrganizerApplication,
  Profile,
  ReportReason,
} from './types';
import { PermissionError, ValidationError } from './types';

function requireAdmin() {
  const user = users.find((u) => u.id === session.userId);
  if (user?.role !== 'admin') throw new PermissionError('Administrators only.');
  return user;
}

function userName(id: string | null) {
  return users.find((u) => u.id === id)?.displayName ?? 'Deleted account';
}

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  misleading: 'Misleading or fake',
  inappropriate: 'Inappropriate content',
  spam: 'Spam',
  wrong_details: 'Wrong date, time or place',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export type AdminStats = {
  pendingApplications: number;
  openReports: number;
  users: number;
  organizers: number;
  verifiedOrganizations: number;
  upcomingEvents: number;
  feedback: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  requireAdmin();
  const now = Date.now();
  return {
    pendingApplications: applications.filter((a) => a.status === 'pending').length,
    openReports: new Set(reports.filter((r) => r.status === 'open').map((r) => r.eventId)).size,
    users: users.filter((u) => u.role !== 'admin').length,
    organizers: users.filter((u) => u.role === 'organizer').length,
    verifiedOrganizations: organizations.filter((o) => o.isVerified).length,
    upcomingEvents: events.filter((e) => Date.parse(e.endAt) > now && e.status !== 'cancelled')
      .length,
    feedback: feedback.length,
  };
}

// ---------------------------------------------------------------------------
// Organizer applications
// ---------------------------------------------------------------------------

export type ApplicationWithApplicant = OrganizerApplication & { applicantName: string };

export async function getApplications(
  filter: 'pending' | 'all' = 'pending'
): Promise<ApplicationWithApplicant[]> {
  requireAdmin();
  return applications
    .filter((a) => filter === 'all' || a.status === 'pending')
    .map((a) => ({ ...a, applicantName: userName(a.userId) }))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function getApplication(id: string): Promise<ApplicationWithApplicant | null> {
  requireAdmin();
  const app = applications.find((a) => a.id === id);
  return app ? { ...app, applicantName: userName(app.userId) } : null;
}

/**
 * Approves, rejects or asks for a revision. Approval creates a verified
 * organization with the applicant as its admin member. A note is required
 * when rejecting or asking for a revision, so the applicant knows why.
 */
export async function reviewApplication(
  id: string,
  status: Exclude<ApplicationStatus, 'pending'>,
  adminNote = ''
): Promise<void> {
  requireAdmin();
  const app = applications.find((a) => a.id === id);
  if (!app) throw new ValidationError('Application not found.');
  if (app.status !== 'pending') throw new ValidationError('This application was already reviewed.');
  const note = adminNote.trim();
  if (status !== 'approved' && note.length < 5) {
    throw new ValidationError('Tell the applicant why (at least 5 characters).', 'note');
  }

  app.status = status;
  app.adminNote = note || undefined;
  app.updatedAt = new Date().toISOString();

  const applicant = users.find((u) => u.id === app.userId);
  if (status === 'approved' && applicant) {
    const org: Organization = {
      id: newId('org'),
      name: app.organizationName,
      description: app.description,
      contactInfo: [app.contactEmail, app.contactPhone].filter(Boolean).join(' · '),
      isVerified: true,
    };
    organizations.push(org);
    memberships.push({ userId: applicant.id, organizationId: org.id, memberRole: 'admin' });
    applicant.role = 'organizer';
  }

  const text: Record<typeof status, string> = {
    approved: `${app.organizationName} is now a verified organizer. You can post events from Organizer Tools.`,
    rejected: `Your application for ${app.organizationName} was not approved. ${note}`,
    requires_revision: `Your application for ${app.organizationName} needs more information: ${note}`,
  };
  deliver([app.userId], null, {
    kind: 'application',
    title: 'Organizer application',
    body: text[status].trim(),
  });
  notifyChange();
}

// ---------------------------------------------------------------------------
// Event reports
// ---------------------------------------------------------------------------

/** All reports about one event, grouped for review. */
export type ReportGroup = {
  eventId: string;
  eventTitle: string;
  /** Null once the event was removed. */
  event: (CommunityEvent & { organizationName: string }) | null;
  status: EventReport['status'];
  reports: (EventReport & { reporterName: string })[];
  latestAt: string;
};

export async function getReportGroups(filter: 'open' | 'resolved'): Promise<ReportGroup[]> {
  requireAdmin();
  const groups = new Map<string, ReportGroup>();
  for (const r of reports) {
    const open = r.status === 'open';
    if ((filter === 'open') !== open) continue;
    let group = groups.get(r.eventId);
    if (!group) {
      const event = events.find((e) => e.id === r.eventId);
      group = {
        eventId: r.eventId,
        eventTitle: r.eventTitle,
        event: event
          ? {
              ...event,
              organizationName:
                organizations.find((o) => o.id === event.organizationId)?.name ?? '',
            }
          : null,
        status: r.status,
        reports: [],
        latestAt: r.createdAt,
      };
      groups.set(r.eventId, group);
    }
    group.reports.push({ ...r, reporterName: userName(r.userId) });
    if (r.createdAt > group.latestAt) group.latestAt = r.createdAt;
  }
  return [...groups.values()].sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

/** Closes the open reports on an event without changing the event. */
export async function dismissReports(eventId: string): Promise<void> {
  requireAdmin();
  resolveReports(eventId, 'dismissed');
  notifyChange();
}

/**
 * Takes an event down: removes it, its saves and RSVPs, closes its reports
 * and tells the organization's members why.
 */
export async function removeReportedEvent(eventId: string, reason: string): Promise<void> {
  requireAdmin();
  const note = reason.trim();
  if (note.length < 5) {
    throw new ValidationError('Tell the organizer why (at least 5 characters).', 'reason');
  }
  const index = events.findIndex((e) => e.id === eventId);
  if (index === -1) throw new ValidationError('This event was already removed.');
  const [event] = events.splice(index, 1);
  savedByUser.forEach((ids) => ids.delete(eventId));
  rsvpsByUser.forEach((map) => map.delete(eventId));
  resolveReports(eventId, 'removed');

  const members = memberships
    .filter((m) => m.organizationId === event.organizationId)
    .map((m) => m.userId);
  deliver(members, null, {
    kind: 'moderation',
    title: 'Event removed by an administrator',
    body: `${event.title}: ${note}`,
  });
  notifyChange();
}

function resolveReports(eventId: string, status: 'dismissed' | 'removed') {
  const resolvedAt = new Date().toISOString();
  for (const r of reports) {
    if (r.eventId === eventId && r.status === 'open') Object.assign(r, { status, resolvedAt });
  }
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export type OrganizationSummary = Organization & {
  memberNames: string[];
  upcomingEvents: number;
};

export async function getAdminOrganizations(): Promise<OrganizationSummary[]> {
  requireAdmin();
  const now = Date.now();
  return organizations
    .map((o) => ({
      ...o,
      memberNames: memberships
        .filter((m) => m.organizationId === o.id)
        .map((m) => userName(m.userId)),
      upcomingEvents: events.filter(
        (e) => e.organizationId === o.id && Date.parse(e.endAt) > now
      ).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Verifies or unverifies an organization. Members of an unverified
 * organization can't post or edit its events (see canManageOrganization).
 */
export async function setOrganizationVerified(id: string, verified: boolean): Promise<void> {
  requireAdmin();
  const org = organizations.find((o) => o.id === id);
  if (!org) throw new ValidationError('Organization not found.');
  org.isVerified = verified;
  const members = memberships.filter((m) => m.organizationId === id).map((m) => m.userId);
  deliver(members, null, {
    kind: 'moderation',
    title: verified ? 'Organization verified' : 'Organization verification removed',
    body: verified
      ? `${org.name} is verified again. You can post and manage its events.`
      : `${org.name} is no longer verified, so you can't post or edit its events for now. Contact the Community Connect team for details.`,
  });
  notifyChange();
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type AccountStatus = 'active' | 'deactivated' | 'suspended';

export type UserSummary = Profile & { status: AccountStatus; organizations: string[] };

export async function getUsers(query = ''): Promise<UserSummary[]> {
  requireAdmin();
  const q = query.trim().toLowerCase();
  return users
    .filter((u) => u.role !== 'admin')
    .filter(
      (u) => !q || u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
    .map((u) => ({
      ...u,
      status: (suspended.has(u.id)
        ? 'suspended'
        : deactivated.has(u.id)
          ? 'deactivated'
          : 'active') as AccountStatus,
      organizations: memberships
        .filter((m) => m.userId === u.id)
        .map((m) => organizations.find((o) => o.id === m.organizationId)?.name ?? ''),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** Suspended accounts can't sign in until an administrator lifts it. */
export async function setUserSuspended(id: string, value: boolean): Promise<void> {
  requireAdmin();
  const user = users.find((u) => u.id === id);
  if (!user || user.role === 'admin') throw new PermissionError("Administrators can't be suspended here.");
  if (value) suspended.add(id);
  else suspended.delete(id);
  notifyChange();
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export async function getFeedback(): Promise<(Feedback & { senderName: string })[]> {
  requireAdmin();
  return feedback
    .map((f) => ({ ...f, senderName: f.userId ? userName(f.userId) : 'Signed-out visitor' }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
