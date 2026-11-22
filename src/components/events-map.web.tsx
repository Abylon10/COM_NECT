import { forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
 * Web preview only: react-native-maps doesn't run on web, so this shows an
 * embedded Google Map of Biliran. Tapping an event card centers it there.
 */
export const EventsMap = forwardRef<EventsMapHandle, EventsMapProps>(function EventsMap(_props, ref) {
  const [center, setCenter] = useState({ lat: BILIRAN_REGION.latitude, lng: BILIRAN_REGION.longitude, zoom: 11 });

  useImperativeHandle(ref, () => ({
    focus: (event) =>
      setCenter({ lat: event.coordinates.latitude, lng: event.coordinates.longitude, zoom: 16 }),
  }));

  const src = `https://maps.google.com/maps?q=${center.lat},${center.lng}&z=${center.zoom}&output=embed`;

  return (
    <View style={StyleSheet.absoluteFill}>
      <iframe title="Map of Biliran" src={src} style={{ border: 0, width: '100%', height: '100%' }} loading="lazy" />
    </View>
  );
});
