import React, { createContext, useEffect } from 'react';
import useAuthState from './useAuthState';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContextValue, defaultAuthContext } from './authTypes';

export const AuthContext = createContext<AuthContextValue>(defaultAuthContext);

type AuthProviderProps = { children: React.ReactNode };

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const auth = useAuthState();

  useEffect(() => {
    const loadToken = async () => {
      const savedToken = await AsyncStorage.getItem('X_INIT_TOKEN');
      auth.setUserToken(savedToken || '');
      auth.setLoading(false);
    };
    const getUserInfo = async () => {
      const data = await AsyncStorage.getItem('userInfo');
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
