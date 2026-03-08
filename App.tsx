/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginManagement/Login';
import "./global.css";
import { AuthProvider } from './src/context/AuthContext';
import AppNavigation from './src/navigation';

function App() {
  // const isDarkMode = useColorScheme() === 'dark'; 

  return (
    <SafeAreaProvider>
      <AuthProvider>
         <AppNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
