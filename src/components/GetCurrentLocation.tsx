
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

export const GetCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;
    return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                resolve({ latitude, longitude });
            },
            (error) => reject(error),
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000,
            }
        );
    });
};
