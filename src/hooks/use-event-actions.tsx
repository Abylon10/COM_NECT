import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import {
  getRsvps,
  getSavedEventIds,
  setEventSaved,
  setRsvp as saveRsvp,
  type RsvpResponse,
} from '@/data/events';

type EventActions = {
  savedIds: string[];
  rsvps: Record<string, RsvpResponse>;
  isSaved: (eventId: string) => boolean;
  rsvpFor: (eventId: string) => RsvpResponse | undefined;
  toggleSaved: (eventId: string) => void;
  /** Tapping the current response again clears it. */
  toggleRsvp: (eventId: string, response: RsvpResponse) => void;
};

const EventActionsContext = createContext<EventActions | null>(null);

/**
 * Holds the current user's saved events and RSVPs so every screen stays in
 * sync. Updates are applied immediately and then written to the data layer.
 */
export function EventActionsProvider({ children }: PropsWithChildren) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, RsvpResponse>>({});

  useEffect(() => {
    Promise.all([getSavedEventIds(), getRsvps()]).then(([saved, responses]) => {
      setSavedIds(saved);
      setRsvps(responses);
    });
  }, []);

  const toggleSaved = (eventId: string) => {
    const saved = !savedIds.includes(eventId);
    setSavedIds((ids) => (saved ? [...ids, eventId] : ids.filter((id) => id !== eventId)));
    setEventSaved(eventId, saved);
  };

  const toggleRsvp = (eventId: string, response: RsvpResponse) => {
    const next = rsvps[eventId] === response ? null : response;
    setRsvps((current) => {
      const { [eventId]: _removed, ...rest } = current;
      return next ? { ...rest, [eventId]: next } : rest;
    });
    saveRsvp(eventId, next);
  };

  const value: EventActions = {
    savedIds,
    rsvps,
    isSaved: (eventId) => savedIds.includes(eventId),
    rsvpFor: (eventId) => rsvps[eventId],
    toggleSaved,
    toggleRsvp,
  };

  return <EventActionsContext value={value}>{children}</EventActionsContext>;
}

export function useEventActions() {
  const context = use(EventActionsContext);
  if (!context) {
    throw new Error('useEventActions must be used inside <EventActionsProvider>');
  }
  return context;
}
