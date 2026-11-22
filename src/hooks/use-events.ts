import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  getCurrentUser,
  getMyApplication,
  getMyOrganizations,
  getSessionKind,
  isSignedIn,
} from '@/data/account';
import {
  getAdminOrganizations,
  getAdminStats,
  getApplication,
  getApplications,
  getFeedback,
  getReportGroups,
  getUsers,
  type AdminStats,
  type ApplicationWithApplicant,
  type UserQuery,
} from '@/data/admin';
import {
  getDataVersion,
  getEvent,
  getEventHistory,
  getEvents,
  getEventsByIds,
  getEventStats,
  getLocations,
  getMyMapEvents,
  getOrganizations,
  getRecommendedEvents,
  subscribeToChanges,
  type AppNotification,
  type EventFilters,
  type EventWithOrganization,
  type NotificationSettings,
  type Organization,
  type OrganizationMembership,
  type OrganizerApplication,
  type Profile,
  type UserInterests,
} from '@/data/events';
import { getMyInterests } from '@/data/interests';
import { getNotifications, getNotificationSettings } from '@/data/notifications';

/** Increases whenever data changes (an event is edited, the user signs in, ...). */
export function useDataVersion() {
  return useSyncExternalStore(subscribeToChanges, getDataVersion, getDataVersion);
}

/** Whether someone is signed in. Synchronous so navigation never flashes. */
export function useIsSignedIn() {
  return useSyncExternalStore(subscribeToChanges, isSignedIn, isSignedIn);
}

/** 'signedOut' | 'user' | 'admin', synchronously, for the navigation guards. */
export function useSessionKind() {
  return useSyncExternalStore(subscribeToChanges, getSessionKind, getSessionKind);
}

/**
 * Runs an async loader whenever `key` or the data changes, and ignores results
 * from stale requests. `key` must describe everything the loader depends on.
 */
function useLoader<T>(key: string, load: () => Promise<T>, initial: T) {
  const version = useDataVersion();
  const fullKey = `${key}#${version}`;
  const [state, setState] = useState({ data: initial, loading: true });

  useEffect(() => {
    let active = true;
    load()
      .then((data) => {
        if (active) setState({ data, loading: false });
      })
      // Signed-out screens may still be mounted for a moment after log out.
      .catch(() => {
        if (active) setState({ data: initial, loading: false });
      });
    return () => {
      active = false;
    };
    // `load` and `initial` are recreated every render; `fullKey` captures the inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  return { data: state.data, loading: state.loading };
}

export function useEvents(filters: EventFilters) {
  const { data, loading } = useLoader(JSON.stringify(filters), () => getEvents(filters), []);
  return { events: data, loading };
}

export function useRecommendedEvents() {
  return useLoader<EventWithOrganization[]>('recommended', getRecommendedEvents, []).data;
}

export function useEventsByIds(ids: string[]) {
  const { data, loading } = useLoader(ids.join(','), () => getEventsByIds(ids), []);
  return { events: data, loading };
}

export function useEvent(id: string) {
  const { data, loading } = useLoader<EventWithOrganization | null>(id, () => getEvent(id), null);
  return { event: data, loading };
}

export function useEventStats(id: string) {
  return useLoader(`stats:${id}`, () => getEventStats(id), { going: 0, interested: 0, saved: 0 }).data;
}

export function useEventHistory() {
  const { data, loading } = useLoader('history', getEventHistory, []);
  return { events: data, loading };
}

export function useMyMapEvents() {
  const { data, loading } = useLoader('map-events', getMyMapEvents, []);
  return { events: data, loading };
}

export function useOrganizations() {
  return useLoader<Organization[]>('organizations', getOrganizations, []).data;
}

export function useLocations() {
  return useLoader<string[]>('locations', getLocations, []).data;
}

export function useCurrentUser() {
  return useLoader<Profile | null>('current-user', getCurrentUser, null).data;
}

/** Verified organizations the current user can post for (empty for residents). */
export function useMyOrganizations() {
  const { data, loading } = useLoader<OrganizationMembership[]>(
    'my-organizations',
    getMyOrganizations,
    []
  );
  return { memberships: data, loading };
}

export function useMyApplication() {
  const { data, loading } = useLoader<OrganizerApplication | null>(
    'my-application',
    getMyApplication,
    null
  );
  return { application: data, loading };
}

export function useMyInterests() {
  const { data, loading } = useLoader<UserInterests>('interests', getMyInterests, {
    selected: [],
    custom: [],
  });
  return { interests: data, loading };
}

export function useNotifications() {
  const { data, loading } = useLoader<AppNotification[]>('notifications', getNotifications, []);
  return { notifications: data, loading, unread: data.filter((n) => !n.read).length };
}

export function useNotificationSettings() {
  const { data, loading } = useLoader<NotificationSettings | null>(
    'notification-settings',
    getNotificationSettings,
    null
  );
  return { settings: data, loading };
}

// ---------------------------------------------------------------------------
// Admin console
// ---------------------------------------------------------------------------

const EMPTY_STATS: AdminStats = {
  pendingApplications: 0,
  openReports: 0,
  users: 0,
  organizers: 0,
  verifiedOrganizations: 0,
  upcomingEvents: 0,
  feedback: 0,
};

export function useAdminStats() {
  return useLoader('admin-stats', getAdminStats, EMPTY_STATS).data;
}

export function useApplications(filter: 'pending' | 'all') {
  const { data, loading } = useLoader(`admin-apps:${filter}`, () => getApplications(filter), []);
  return { applications: data, loading };
}

export function useApplication(id: string) {
  const { data, loading } = useLoader<ApplicationWithApplicant | null>(
    `admin-app:${id}`,
    () => getApplication(id),
    null
  );
  return { application: data, loading };
}

export function useReportGroups(filter: 'open' | 'resolved') {
  const { data, loading } = useLoader(`admin-reports:${filter}`, () => getReportGroups(filter), []);
  return { groups: data, loading };
}

export function useAdminOrganizations() {
  const { data, loading } = useLoader('admin-orgs', getAdminOrganizations, []);
  return { organizations: data, loading };
}

export function useAdminUsers(query: UserQuery) {
  const { data, loading } = useLoader(`admin-users:${JSON.stringify(query)}`, () => getUsers(query), []);
  return { users: data, loading };
}

export function useFeedback() {
  const { data, loading } = useLoader('admin-feedback', getFeedback, []);
  return { feedback: data, loading };
}
