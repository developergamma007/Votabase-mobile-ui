import React, { createContext, useEffect } from 'react';
import useAuthState from './useAuthState';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const auth = useAuthState(); // gets: userToken, loading, updateToken, logout


  useEffect(() => {
    const loadToken = async () => {
      const savedToken = await AsyncStorage.getItem("X_INIT_TOKEN");
      auth.setUserToken(savedToken);
      auth.setLoading(false);
    };
    const getUserInfo = async () => {
      const data = await AsyncStorage.getItem("userInfo");
      if (data) auth.setUserInfo(JSON.parse(data));
    };
    getUserInfo();
    loadToken();
  }, []);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};
