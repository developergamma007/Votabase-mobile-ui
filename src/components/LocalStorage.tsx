// LocalStorageExample.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dummyData from '../Json/dummyBooth.json'
import { bgColors } from '../constants/colors';

export default function LocalStorageExample() {
  const [userData, setUserData] = useState(null);
  // Dummy JSON to save locally
  // const dummyData = {
  //   userId: 1,
  //   name: 'John Doe',
  //   email: 'john@example.com',
  //   preferences: {
  //     theme: 'dark',
  //     notifications: true,
  //   },
  // };

  // Save data to local storage
  const saveData = async () => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(dummyData));
      Alert.alert('✅ Saved!', 'Dummy data stored successfully.');
    } catch (error) {
      console.error('Error saving data', error);
    }
  };

  // Load data from local storage
  const loadData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('userData');
      if (jsonValue != null) {
        setUserData(JSON.parse(jsonValue));
      } else {
        Alert.alert('ℹ️ No Data Found', 'Please save data first.');
      }
    } catch (error) {
      console.error('Error reading data', error);
    }
  };

  // Clear data
  const clearData = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      setUserData(null);
      Alert.alert('🧹 Cleared!', 'Local data removed.');
    } catch (error) {
      console.error('Error clearing data', error);
    }
  };

  return (
    <View className={`flex-1 ${bgColors.white} justify-center items-center p-6`}>
      <Text className="text-xl font-bold mb-6 text-gray-800">
        Local JSON Storage Test
      </Text>
      <TouchableOpacity
        onPress={saveData}
        className={`${bgColors.blue500} w-64 py-3 rounded-lg mb-4`}
      >
        <Text className="text-white text-center font-semibold">💾 Save Dummy Data</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={loadData}
        className={`${bgColors.green500} w-64 py-3 rounded-lg mb-4`}
      >
        <Text className="text-white text-center font-semibold">📦 Load Data</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={clearData}
        className={`${bgColors.red500} w-64 py-3 rounded-lg mb-6`}
      >
        <Text className="text-white text-center font-semibold">🧹 Clear Data</Text>
      </TouchableOpacity>
      {userData && (
        <View className={`mt-4 p-4 ${bgColors.gray100} w-80 rounded-lg`}>
          <Text className="font-semibold text-gray-800">Loaded Data:</Text>
          <Text className="text-gray-700 mt-2">{JSON.stringify(userData, null, 2)}</Text>
        </View>
      )}
    </View>
  );
}
