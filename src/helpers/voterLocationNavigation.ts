import { Alert } from 'react-native';
import { GetCurrentLocation, QUICK_GPS_OPTIONS } from '../components/GetCurrentLocation';

export type VoterWithLocation = Record<string, unknown> & {
  latitude?: number;
  longitude?: number;
};

/** Attach a quick GPS fix before opening voter info (matches website voter-card flow). */
export async function mergeVoterWithQuickLocation<T extends VoterWithLocation>(
  voter: T,
): Promise<T & { latitude: number; longitude: number }> {
  const loc = await GetCurrentLocation(QUICK_GPS_OPTIONS);
  if (!loc?.latitude || !loc?.longitude) {
    throw new Error('Location is required to view voter info.');
  }
  return {
    ...voter,
    latitude: loc.latitude,
    longitude: loc.longitude,
  };
}

export async function openVoterInfoWithQuickLocation(
  navigation: { navigate: (name: string, params?: object) => void },
  voter: VoterWithLocation,
  booth?: object,
  onError?: (message: string) => void,
): Promise<boolean> {
  try {
    const withLoc = await mergeVoterWithQuickLocation(voter);
    navigation.navigate('Voter Info', { voter: withLoc, booth });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to capture location.';
    if (onError) onError(message);
    else Alert.alert('Location required', message);
    return false;
  }
}
