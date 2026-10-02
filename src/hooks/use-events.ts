import { useEffect, useState } from 'react';

import {
  getCurrentUser,
  getEvent,
  getEvents,
  getEventsByIds,
  getLocations,
  getOrganizations,
  type EventFilters,
  type EventWithOrganization,
  type Organization,
  type Profile,
} from '@/data/events';

/**
 * Runs an async loader whenever `key` changes and ignores results from
 * stale requests. `key` must describe everything the loader depends on.
 */
function useLoader<T>(key: string, load: () => Promise<T>, initial: T) {
  const [state, setState] = useState({ data: initial, loading: true, key });

  useEffect(() => {
    let active = true;
    load().then((data) => {
      if (active) setState({ data, loading: false, key });
    });
    return () => {
      active = false;
    };
    // `load` is recreated every render; `key` captures its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

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
