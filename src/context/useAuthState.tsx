import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthContextValue, BannerState } from './authTypes';

export default function useAuthState(): AuthContextValue {
  const [userToken, setUserTokenState] = useState('');
  const setUserToken = (token: string | null) => setUserTokenState(token || '');
  const [loading, setLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [banner, setBanner] = useState<BannerState>({
    type: null,
    message: '',
  });
  const [userInfo, setUserInfo] = useState<Record<string, unknown> | false>(false);

  useEffect(() => {
    if (banner.type) {
      const timer = setTimeout(() => {
        setBanner({ type: null, message: "" });
      }, 3000);

      // Cleanup: clear timeout if banner changes or component unmounts
      return () => clearTimeout(timer);
    }
  }, [banner.type, banner.message]);

  const updateToken = async (token: string) => {
    setUserToken(token);
    await AsyncStorage.setItem('X_INIT_TOKEN', token);
  };


  const logout = async () => {
    setUserToken('');
    await AsyncStorage.removeItem('X_INIT_TOKEN');
    await AsyncStorage.removeItem('userInfo');
    // await AsyncStorage.removeItem('userData');
    // await AsyncStorage.removeItem('loggedInUser');
    // await AsyncStorage.removeItem('newLoggedInUser');
  };

  const clearLocal = async () => {
    setUserToken('');
    await AsyncStorage.removeItem('X_INIT_TOKEN');
    await AsyncStorage.removeItem('userInfo');
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('loggedInUser');
    await AsyncStorage.removeItem('newLoggedInUser');
    await AsyncStorage.removeItem('assemblyData');
    await AsyncStorage.removeItem('boothSnapshotLite');
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith('vb_cache'));
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
  };

  return {
    userToken,
    setUserToken,
    loading,
    setLoading,
    updateToken,
    logout,
    sidebarVisible,
    setSidebarVisible,
    banner,
    setBanner,
    userInfo,
    setUserInfo,
    clearLocal
  };
}
