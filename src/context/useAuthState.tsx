// src/context/useAuthState.js
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function useAuthState() {
  const [userToken, setUserToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [banner, setBanner] = useState({
    type: null,   // "success" | "error"
    message: "",
  });
  const [userInfo, setUserInfo] = useState(false);

  useEffect(() => {
    if (banner.type) {
      const timer = setTimeout(() => {
        setBanner({ type: null, message: "" });
      }, 3000);

      // Cleanup: clear timeout if banner changes or component unmounts
      return () => clearTimeout(timer);
    }
  }, [banner.type, banner.message]);

  const updateToken = async (token) => {
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
