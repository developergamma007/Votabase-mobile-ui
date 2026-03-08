
import { PermissionsAndroid, Platform } from "react-native";
import Geolocation from 'react-native-geolocation-service';

const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
        return true;
    }
    const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
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