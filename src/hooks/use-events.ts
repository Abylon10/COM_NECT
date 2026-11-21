import { useEffect, useState, useSyncExternalStore } from 'react';

import {
  getCurrentUser,
  getDataVersion,
  getDemoUsers,
  getEvent,
  getEvents,
  getEventsByIds,
  getLocations,
  getMyOrganizations,
  getNotifications,
  getOrganizations,
  subscribeToChanges,
  type AppNotification,
  type EventFilters,
  type EventWithOrganization,
  type Organization,
  type OrganizationMembership,
  type Profile,
} from '@/data/events';

/** Increases whenever data changes (an event is edited, the demo account switches, ...). */
export function useDataVersion() {
  return useSyncExternalStore(subscribeToChanges, getDataVersion, getDataVersion);
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
    load().then((data) => {
      if (active) setState({ data, loading: false });
    });
    return () => {
      active = false;
    };
    // `load` is recreated every render; `fullKey` captures its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  return { data: state.data, loading: state.loading };
}

export function useEvents(filters: EventFilters) {
  const { data, loading } = useLoader(JSON.stringify(filters), () => getEvents(filters), []);
  return { events: data, loading };
}

export function useEventsByIds(ids: string[]) {
  const { data, loading } = useLoader(ids.join(','), () => getEventsByIds(ids), []);
  return { events: data, loading };
}

export function useEvent(id: string) {
  const { data, loading } = useLoader<EventWithOrganization | null>(id, () => getEvent(id), null);
  return { event: data, loading };
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

export function useDemoUsers() {
  return useLoader<Profile[]>('demo-users', getDemoUsers, []).data;
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

export function useNotifications() {
  const { data, loading } = useLoader<AppNotification[]>('notifications', getNotifications, []);
  return { notifications: data, loading, unread: data.filter((n) => !n.read).length };
}
