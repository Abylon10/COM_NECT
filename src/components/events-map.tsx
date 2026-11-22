import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type { EventWithOrganization, RsvpResponse } from '@/data/types';
import { BILIRAN_REGION } from '@/utils/maps';

export type MapEvent = EventWithOrganization & { response: RsvpResponse };

export type EventsMapHandle = { focus: (event: MapEvent) => void };

type EventsMapProps = {
  events: MapEvent[];
  colors: Record<RsvpResponse, string>;
  onOpenEvent: (id: string) => void;
};

/**
 * Native map: Google Maps on Android, Apple Maps on iOS (Google Maps on iOS
 * needs a development build with an API key).
 */
export const EventsMap = forwardRef<EventsMapHandle, EventsMapProps>(function EventsMap(
  { events, colors, onOpenEvent },
  ref
) {
  const map = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    focus: (event) =>
      map.current?.animateToRegion(
        { ...event.coordinates, latitudeDelta: 0.03, longitudeDelta: 0.03 },
        400
      ),
  }));

  return (
    <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={BILIRAN_REGION} showsCompass={false}>
      {events.map((event) => (
        <Marker
          key={event.id}
          coordinate={event.coordinates}
          title={event.title}
          description={`${event.response === 'going' ? 'Going' : 'Interested'} · ${event.venue} · tap for details`}
          pinColor={colors[event.response]}
          onCalloutPress={() => onOpenEvent(event.id)}
        />
      ))}
    </MapView>
  );
});
