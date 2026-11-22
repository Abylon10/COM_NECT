import * as Linking from 'expo-linking';

import type { Coordinates } from '@/data/types';

/** Map view of Biliran province (whole island group, incl. Maripipi). */
export const BILIRAN_REGION = {
  latitude: 11.6,
  longitude: 124.47,
  latitudeDelta: 0.42,
  longitudeDelta: 0.36,
};

/** Opens the location in the Google Maps app (or website) for directions. */
export function openInGoogleMaps({ latitude, longitude }: Coordinates, label?: string) {
  const query = encodeURIComponent(label ? `${label} @${latitude},${longitude}` : `${latitude},${longitude}`);
  return Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
}
