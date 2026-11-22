/**
 * Account, profile and organizer applications.
 *
 * Sign-in is mock-only: accounts live in memory with plain passwords. With
 * the backend this becomes Supabase Auth (hashed passwords, email
 * verification) and these functions call it instead.
 */

import {
  applications,
  deactivated,
  feedback,
  interestsByUser,
  memberships,
  MUNICIPALITIES,
  newId,
  notificationSettingsByUser,
  notificationsByUser,
  notifyChange,
  organizations,
  passwords,
  requireUserId,
  rsvpsByUser,
  savedByUser,
  session,
  users,
} from './db';
import { deliver } from './notifications';
import type {
  ApplicationStatus,
  FeedbackKind,
  OrganizationMembership,
  OrganizationType,
  OrganizerApplication,
  OrganizerApplicationInput,
  Profile,
} from './types';
import { ValidationError } from './types';

/** Password of the seeded demo accounts (mock sign-in only). */
export { DEMO_PASSWORD } from './db';

export const MUNICIPALITY_NAMES = MUNICIPALITIES.map((m) => m.name);

export const ORGANIZATION_TYPES: { id: OrganizationType; label: string }[] = [
  { id: 'barangay', label: 'Barangay / LGU office' },
  { id: 'sk', label: 'Sangguniang Kabataan' },
  { id: 'school', label: 'School or student org' },
  { id: 'ngo', label: 'Non-profit / NGO' },
  { id: 'religious', label: 'Religious group' },
  { id: 'business', label: 'Business / cooperative' },
  { id: 'other', label: 'Other' },
];

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Not approved',
  requires_revision: 'Needs revision',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX. */
const PH_MOBILE = /^(09|\+639)\d{9}$/;

function clean(s: string) {
  return s.trim().replace(/\s+/g, ' ');
}

function locationLabel(barangay: string, municipality: string) {
  return barangay ? `Brgy. ${barangay}, ${municipality}` : municipality;
}

function me() {
  const id = requireUserId();
  return users.find((u) => u.id === id)!;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/** Synchronous, so navigation can switch screens without a loading flash. */
export function isSignedIn() {
  return session.userId !== null;
}

export async function getCurrentUser(): Promise<Profile | null> {
  return users.find((u) => u.id === session.userId) ?? null;
}

/** Signs in. Signing in to a deactivated account reactivates it. */
export async function signIn(email: string, password: string): Promise<{ reactivated: boolean }> {
  const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || passwords.get(user.id) !== password) {
    throw new ValidationError('Incorrect email or password.');
  }
  const reactivated = deactivated.delete(user.id);
  session.userId = user.id;
  notifyChange();
  return { reactivated };
}

export async function signUp(input: {
  displayName: string;
  email: string;
  password: string;
}): Promise<void> {
  const displayName = clean(input.displayName);
  const email = input.email.trim().toLowerCase();
  if (displayName.length < 2) throw new ValidationError('Enter your full name.', 'displayName');
  if (!EMAIL.test(email)) throw new ValidationError('Enter a valid email address.', 'email');
  if (users.some((u) => u.email.toLowerCase() === email)) {
    throw new ValidationError('An account with this email already exists.', 'email');
  }
  if (input.password.length < 8) {
    throw new ValidationError('Use at least 8 characters.', 'password');
  }
  const id = newId('user');
  users.push({
    id,
    displayName,
    email,
    phone: '',
    municipality: 'Naval',
    barangay: '',
    location: 'Naval',
    role: 'resident',
  });
  passwords.set(id, input.password);
  session.userId = id;
  notifyChange();
}

/** Ends the session only; the account and its saved events stay. */
export async function signOut(): Promise<void> {
  session.userId = null;
  notifyChange();
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function updateProfile(update: {
  displayName: string;
  phone: string;
  municipality: string;
  barangay: string;
  avatarUri?: string;
}): Promise<void> {
  const user = me();
  const displayName = clean(update.displayName);
  const phone = update.phone.replace(/[\s-]/g, '');
  const barangay = clean(update.barangay).replace(/^brgy\.?\s*/i, '');
  if (displayName.length < 2) throw new ValidationError('Enter your full name.', 'displayName');
  if (phone && !PH_MOBILE.test(phone)) {
    throw new ValidationError('Use 09XXXXXXXXX or +639XXXXXXXXX.', 'phone');
  }
  if (!MUNICIPALITY_NAMES.includes(update.municipality)) {
    throw new ValidationError('Choose a municipality.', 'municipality');
  }
  Object.assign(user, {
    displayName,
    phone,
    municipality: update.municipality,
    barangay,
    location: locationLabel(barangay, update.municipality),
    avatarUri: update.avatarUri,
  });
  notifyChange();
}

/** Starts an email change; the new address must be verified first. */
export async function requestEmailChange(newEmail: string): Promise<void> {
  const user = me();
  const email = newEmail.trim().toLowerCase();
  if (!EMAIL.test(email)) throw new ValidationError('Enter a valid email address.', 'email');
  if (email === user.email) {
    user.pendingEmail = undefined;
  } else {
    if (users.some((u) => u.id !== user.id && u.email.toLowerCase() === email)) {
      throw new ValidationError('That email is used by another account.', 'email');
    }
    user.pendingEmail = email;
  }
  notifyChange();
}

/** Demo stand-in for clicking the link in the verification email. */
export async function confirmPendingEmail(): Promise<void> {
  const user = me();
  if (user.pendingEmail) {
    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    notifyChange();
  }
}

export async function cancelPendingEmail(): Promise<void> {
  me().pendingEmail = undefined;
  notifyChange();
}

export async function changePassword(current: string, next: string): Promise<void> {
  const id = requireUserId();
  if (passwords.get(id) !== current) {
    throw new ValidationError('Current password is incorrect.', 'current');
  }
  if (next.length < 8) throw new ValidationError('Use at least 8 characters.', 'next');
  if (next === current) throw new ValidationError('Choose a different password.', 'next');
  passwords.set(id, next);
  notifyChange();
}

/** Hides the account and signs out. Signing in again reactivates it. */
export async function deactivateAccount(): Promise<void> {
  deactivated.add(requireUserId());
  session.userId = null;
  notifyChange();
}

/** Permanently removes the account and its data. */
export async function deleteAccount(password: string): Promise<void> {
  const id = requireUserId();
  if (passwords.get(id) !== password) {
    throw new ValidationError('Password is incorrect.', 'password');
  }
  users.splice(
    users.findIndex((u) => u.id === id),
    1
  );
  passwords.delete(id);
  savedByUser.delete(id);
  rsvpsByUser.delete(id);
  notificationsByUser.delete(id);
  notificationSettingsByUser.delete(id);
  interestsByUser.delete(id);
  for (let i = memberships.length - 1; i >= 0; i--) {
    if (memberships[i].userId === id) memberships.splice(i, 1);
  }
  session.userId = null;
  notifyChange();
}

// ---------------------------------------------------------------------------
// Organizer status
// ---------------------------------------------------------------------------

/** Verified organizations the current user can post for (empty for residents). */
export async function getMyOrganizations(): Promise<OrganizationMembership[]> {
  if (!session.userId) return [];
  return memberships
    .filter((m) => m.userId === session.userId)
    .map((m) => ({ ...m, organization: organizations.find((o) => o.id === m.organizationId)! }))
    .filter((m) => m.organization.isVerified);
}

/** The user's latest organizer application, if any. */
export async function getMyApplication(): Promise<OrganizerApplication | null> {
  if (!session.userId) return null;
  const mine = applications.filter((a) => a.userId === session.userId);
  return mine.length ? { ...mine[mine.length - 1] } : null;
}

function validateApplication(input: OrganizerApplicationInput) {
  if (clean(input.organizationName).length < 3) {
    throw new ValidationError('Enter the organization name.', 'organizationName');
  }
  if (!ORGANIZATION_TYPES.some((t) => t.id === input.organizationType)) {
    throw new ValidationError('Choose an organization type.', 'organizationType');
  }
  if (clean(input.description).length < 30) {
    throw new ValidationError('Describe the organization in at least 30 characters.', 'description');
  }
  if (!EMAIL.test(input.contactEmail.trim())) {
    throw new ValidationError('Enter a valid contact email.', 'contactEmail');
  }
  const phone = input.contactPhone.replace(/[\s-]/g, '');
  if (phone && !PH_MOBILE.test(phone)) {
    throw new ValidationError('Use 09XXXXXXXXX or +639XXXXXXXXX.', 'contactPhone');
  }
  if (input.documents.length === 0) {
    throw new ValidationError(
      'Attach at least one supporting document (e.g. barangay certification or endorsement letter).',
      'documents'
    );
  }
}

/** Submits a new application, or resubmits one that needs revision. */
export async function submitOrganizerApplication(input: OrganizerApplicationInput): Promise<void> {
  const userId = requireUserId();
  validateApplication(input);
  const now = new Date().toISOString();
  const existing = [...applications].reverse().find((a) => a.userId === userId);
  if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
    throw new ValidationError('You already have an application in progress.');
  }
  const data = {
    ...input,
    organizationName: clean(input.organizationName),
    description: input.description.trim(),
    contactEmail: input.contactEmail.trim().toLowerCase(),
    contactPhone: input.contactPhone.replace(/[\s-]/g, ''),
  };
  if (existing?.status === 'requires_revision') {
    Object.assign(existing, data, { status: 'pending', adminNote: undefined, updatedAt: now });
  } else {
    applications.push({
      ...data,
      id: newId('app'),
      userId,
      status: 'pending',
      submittedAt: now,
      updatedAt: now,
    });
  }
  notifyChange();
}

/**
 * DEMO ONLY: stands in for an administrator reviewing the application, since
 * the admin side isn't built yet (open question: who verifies organizations).
 * Approval creates a verified organization with the applicant as admin.
 */
export async function demoReviewApplication(
  status: Exclude<ApplicationStatus, 'pending'>,
  adminNote?: string
): Promise<void> {
  const userId = requireUserId();
  const app = [...applications].reverse().find((a) => a.userId === userId);
  if (!app || app.status !== 'pending') throw new Error('No pending application.');
  app.status = status;
  app.adminNote = adminNote?.trim() || undefined;
  app.updatedAt = new Date().toISOString();

  if (status === 'approved') {
    const org = {
      id: newId('org'),
      name: app.organizationName,
      description: app.description,
      contactInfo: [app.contactEmail, app.contactPhone].filter(Boolean).join(' · '),
      isVerified: true,
    };
    organizations.push(org);
    memberships.push({ userId, organizationId: org.id, memberRole: 'admin' });
    users.find((u) => u.id === userId)!.role = 'organizer';
  }
  const text: Record<typeof status, string> = {
    approved: `${app.organizationName} is now a verified organizer. You can post events from Organizer Tools.`,
    rejected: `Your application for ${app.organizationName} was not approved.`,
    requires_revision: `Your application for ${app.organizationName} needs more information.`,
  };
  deliver([userId], null, { kind: 'application', title: 'Organizer application', body: text[status] });
  notifyChange();
}

// ---------------------------------------------------------------------------
// Help & feedback
// ---------------------------------------------------------------------------

export async function submitFeedback(kind: FeedbackKind, message: string): Promise<void> {
  if (message.trim().length < 10) {
    throw new ValidationError('Please write at least 10 characters.', 'message');
  }
  feedback.push({
    id: newId('fb'),
    userId: session.userId,
    kind,
    message: message.trim(),
    createdAt: new Date().toISOString(),
  });
}
