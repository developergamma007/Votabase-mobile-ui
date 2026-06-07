
import { PermissionsAndroid, Platform } from "react-native";
import Geolocation from 'react-native-geolocation-service';

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

export type CapturedLocation = {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
};

export type GetLocationOptions = {
    /** When true, waits for a fresh GPS fix (no cached/network-only position). */
    requireHighAccuracy?: boolean;
    maxAccuracyMeters?: number;
    /** Household GPS button — network/cell first, multiple fallbacks. */
    fastHousehold?: boolean;
};

/** Use for voter / family / meeting coordinates saved to the server. */
export const ACCURATE_GPS_OPTIONS: GetLocationOptions = {
    requireHighAccuracy: true,
    maxAccuracyMeters: 20,
};

/** Fast fix when opening voter info from a list (cached OK). */
export const QUICK_GPS_OPTIONS: GetLocationOptions = {
    requireHighAccuracy: false,
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

const watchForFirstGeoFix = (
    timeoutMs: number,
    enableHighAccuracy: boolean,
): Promise<CapturedLocation> =>
    new Promise((resolve, reject) => {
        let settled = false;
        const watchId = Geolocation.watchPosition(
            (pos) => {
                if (settled) return;
                settled = true;
                Geolocation.clearWatch(watchId);
                clearTimeout(timer);
                resolve(coordsFromPosition(pos));
            },
            () => {
                /* wait for first fix or timeout */
            },
            {
                enableHighAccuracy,
                distanceFilter: 0,
                interval: 1000,
                fastestInterval: 500,
                ...(Platform.OS === 'android'
                    ? { forceRequestLocation: true, showLocationDialog: true }
                    : {}),
            },
        );
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            Geolocation.clearWatch(watchId);
            reject(new Error('Location request timed out.'));
        }, timeoutMs);
    });

const HOUSEHOLD_GPS_TIMEOUT_MSG =
    'Could not get your location. Use Pin Mark on the map (drag/tap), or allow location and retry GPS near a window.';

export const GetCurrentLocation = async (
    options: GetLocationOptions = {},
): Promise<CapturedLocation | null> => {
    const { requireHighAccuracy = false, maxAccuracyMeters = 20, fastHousehold = false } = options;
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

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
            return await watchForAccurateGpsFix(maxAccuracyMeters, 25000);
        }
        if (fastHousehold) {
            const tries: Geolocation.GeoOptions[] = [
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 },
                { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
            ];
            for (const opts of tries) {
                try {
                    const pos = await getCurrentPosition({
                        ...opts,
                        ...(Platform.OS === 'android'
                            ? { forceRequestLocation: true, showLocationDialog: true }
                            : {}),
                    });
                    return coordsFromPosition(pos);
                } catch {
                    /* next */
                }
            }
            try {
                return await watchForFirstGeoFix(10000, false);
            } catch {
                /* fall through */
            }
            try {
                return await watchForFirstGeoFix(8000, true);
            } catch {
                /* fall through */
            }
            throw new Error(HOUSEHOLD_GPS_TIMEOUT_MSG);
        }
        const pos = await getCurrentPosition(geoOptions);
        return coordsFromPosition(pos);
    } catch (error) {
        if (fastHousehold) {
            const message = error instanceof Error ? error.message : HOUSEHOLD_GPS_TIMEOUT_MSG;
            throw new Error(message);
        }
        if (!requireHighAccuracy) return null;
        const message = error instanceof Error ? error.message : 'Could not obtain an accurate GPS fix.';
        throw new Error(message);
    }
};
