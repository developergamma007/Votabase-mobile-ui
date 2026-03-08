// src/navigation/index.js
import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import { AuthContext } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AppNavigation() {
// const [token, setToken] = useState(null);

//   useEffect(() => {
//     const loadToken = async () => {
//       try {
//         const savedToken = await AsyncStorage.getItem("X_INIT_TOKEN");
//         setToken(savedToken);
//       } catch (err) {
//         console.log("Error reading token", err);
//       }
//     };
//     loadToken();
//   }, []);

  const { userToken, loading } = useContext(AuthContext);

  return (
    <NavigationContainer>
      {userToken ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
