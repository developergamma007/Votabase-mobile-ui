import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from "react-native";
import Geolocation from 'react-native-geolocation-service';

export type CapturedLocation = {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
};

const LOCATION_CACHE_KEY = 'votabase_last_location';
const LOCATION_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

let memoryLocationCache: { location: CapturedLocation; timestamp: number } | null = null;

const getCachedLocation = async (): Promise<CapturedLocation | null> => {
    if (memoryLocationCache && Date.now() - memoryLocationCache.timestamp < LOCATION_CACHE_MAX_AGE_MS) {
        return memoryLocationCache.location;
    }
    try {
        const raw = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.latitude || !parsed?.longitude || !parsed?.timestamp) return null;
        if (Date.now() - parsed.timestamp > LOCATION_CACHE_MAX_AGE_MS) return null;
        const location = {
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            accuracy: parsed.accuracy ?? null,
        };
        memoryLocationCache = { location, timestamp: parsed.timestamp };
        return location;
    } catch {
        return null;
    }
};

const getStaleCachedLocation = async (): Promise<CapturedLocation | null> => {
    if (memoryLocationCache?.location) return memoryLocationCache.location;
    try {
        const raw = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.latitude || !parsed?.longitude) return null;
        return {
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            accuracy: parsed.accuracy ?? null,
        };
    } catch {
        return null;
    }
};

const setCachedLocation = async (location: CapturedLocation) => {
    const timestamp = Date.now();
    memoryLocationCache = { location, timestamp };
    try {
        await AsyncStorage.setItem(
            LOCATION_CACHE_KEY,
            JSON.stringify({ ...location, timestamp }),
        );
    } catch {
        /* best-effort */
    }
};

const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
        try {
            const status = await Geolocation.requestAuthorization('whenInUse');
            return status === 'granted';
        } catch {
            return false;
        }
    }
    const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    const fine = result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
    const coarse = result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
    return fine || coarse;
};

export type GetLocationOptions = {
    /** When true, waits for a fresh GPS fix (no cached/network-only position). */
    requireHighAccuracy?: boolean;
    maxAccuracyMeters?: number;
    /** Household GPS button — network/cell first, multiple fallbacks. */
    fastHousehold?: boolean;
    /** Opening voter info — cache first, short timeouts, mandatory fix. */
    quickVoterCard?: boolean;
};

/** Use for voter / family / meeting coordinates saved to the server. */
export const ACCURATE_GPS_OPTIONS: GetLocationOptions = {
    requireHighAccuracy: true,
    maxAccuracyMeters: 20,
};

/** Fast fix when opening voter info from a list (cached OK). */
export const QUICK_GPS_OPTIONS: GetLocationOptions = {
    requireHighAccuracy: false,
    quickVoterCard: true,
};

/** Household GPS button — works indoors better than strict GPS-only mode. */
export const FAST_HOUSEHOLD_GPS_OPTIONS: GetLocationOptions = {
    requireHighAccuracy: false,
    fastHousehold: true,
};

const coordsFromPosition = (pos: Geolocation.GeoPosition): CapturedLocation => ({
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
});

const getCurrentPosition = (options: Geolocation.GeoOptions) =>
    new Promise<Geolocation.GeoPosition>((resolve, reject) => {
        Geolocation.getCurrentPosition(resolve, reject, options);
    });

/** Refine GPS using watchPosition until accuracy is good enough or timeout. */
const watchForAccurateGpsFix = (
    maxAccuracyMeters: number,
    timeoutMs: number,
): Promise<CapturedLocation> =>
    new Promise((resolve, reject) => {
        let best: CapturedLocation | null = null;
        const watchId = Geolocation.watchPosition(
            (pos) => {
                const point = coordsFromPosition(pos);
                if (
                    !best
                    || (point.accuracy != null
                        && (best.accuracy == null || point.accuracy < best.accuracy))
                ) {
                    best = point;
                }
                if (point.accuracy != null && point.accuracy <= maxAccuracyMeters) {
                    Geolocation.clearWatch(watchId);
                    resolve(point);
                }
            },
            () => {
                /* Ignore transient GPS errors; timeout picks best fix or fails. */
            },
            {
                enableHighAccuracy: true,
                distanceFilter: 0,
                interval: 1000,
                fastestInterval: 500,
                ...(Platform.OS === 'android' ? { forceRequestLocation: true, showLocationDialog: true } : {}),
            },
        );

        setTimeout(() => {
            Geolocation.clearWatch(watchId);
            if (best) {
                resolve(best);
                return;
            }
            reject(new Error('Could not obtain an accurate GPS fix. Try moving outdoors or near a window.'));
        }, timeoutMs);
    });

const HOUSEHOLD_GPS_TIMEOUT_MSG =
    'Could not get your location. Use Pin Mark on the map (drag/tap), or allow location and retry GPS near a window.';

const VOTER_LOCATION_REQUIRED_MSG = 'Location is required to view voter info.';

export const GetCurrentLocation = async (
    options: GetLocationOptions = {},
): Promise<CapturedLocation | null> => {
    const {
        requireHighAccuracy = false,
        maxAccuracyMeters = 20,
        fastHousehold = false,
        quickVoterCard = false,
    } = options;
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
        if (quickVoterCard) throw new Error('Location permission denied. Please allow location access to view voter info.');
        return null;
    }

    const geoOptions: Geolocation.GeoOptions = {
        enableHighAccuracy: requireHighAccuracy,
        timeout: requireHighAccuracy ? 25000 : 12000,
        maximumAge: requireHighAccuracy ? 0 : 60000,
        ...(Platform.OS === 'android' && requireHighAccuracy
            ? { forceRequestLocation: true, showLocationDialog: true }
            : {}),
    };

    try {
        if (requireHighAccuracy) {
            const result = await watchForAccurateGpsFix(maxAccuracyMeters, 25000);
            await setCachedLocation(result);
            return result;
        }
        if (quickVoterCard) {
            const cached = await getCachedLocation();
            if (cached) return cached;

            const androidExtras = Platform.OS === 'android'
                ? { forceRequestLocation: true, showLocationDialog: true }
                : {};
            const tries: Geolocation.GeoOptions[] = [
                { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 },
                { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
            ];
            for (const opts of tries) {
                try {
                    const pos = await getCurrentPosition({ ...opts, ...androidExtras });
                    const result = coordsFromPosition(pos);
                    await setCachedLocation(result);
                    return result;
                } catch {
                    /* next strategy */
                }
            }

            const stale = await getStaleCachedLocation();
            if (stale) return stale;

            throw new Error(VOTER_LOCATION_REQUIRED_MSG);
        }
        if (fastHousehold) {
            // Simple two-step: cached/network fix first (usually instant),
            // then one fresh high-accuracy attempt.
            const tries: Geolocation.GeoOptions[] = [
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
            ];
            for (const opts of tries) {
                try {
                    const pos = await getCurrentPosition({
                        ...opts,
                        ...(Platform.OS === 'android'
                            ? { forceRequestLocation: true, showLocationDialog: true }
                            : {}),
                    });
                    const result = coordsFromPosition(pos);
                    await setCachedLocation(result);
                    return result;
                } catch {
                    /* next */
                }
            }
            throw new Error(HOUSEHOLD_GPS_TIMEOUT_MSG);
        }
        const pos = await getCurrentPosition(geoOptions);
        const result = coordsFromPosition(pos);
        await setCachedLocation(result);
        return result;
    } catch (error) {
        if (quickVoterCard || fastHousehold) {
            const message = error instanceof Error ? error.message : VOTER_LOCATION_REQUIRED_MSG;
            throw new Error(message);
        }
        if (!requireHighAccuracy) return null;
        const message = error instanceof Error ? error.message : 'Could not obtain an accurate GPS fix.';
        throw new Error(message);
    }
};
