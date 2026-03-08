import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { bgColors } from '../constants/colors';

const LANG_KEY = "app_language";

export default function Settings() {
  const { setBanner, clearLocal } = useContext(AuthContext)
  const [language, setLanguage] = useState(''); // default English

  const saveLanguage = async (lang) => {
    setLanguage(lang);
    try {
      await AsyncStorage.setItem(LANG_KEY, lang);
      console.log('Language saved:', lang);
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  useEffect(() => {
    const loadLanguage = async () => {
      const language = await AsyncStorage.getItem(LANG_KEY);
      setLanguage(language)
    }
    loadLanguage()
  }, [])

  const showBanner = (type, message) => {
    setBanner({ type, message });
  };

  return (
    <View className={`flex-1 ${bgColors.white} p-4`}>
      <Text className="text-lg font-semibold mb-2 text-gray-700">Select Language</Text>
      <View className="flex-row space-x-4">
        <TouchableOpacity
          className={`flex-1 py-3 rounded-lg mr-3 border ${language === 'en' ? `${bgColors.blue500} border-blue-500` : `${bgColors.white} border-gray-300`
            }`}
          onPress={() => { saveLanguage('en'), showBanner('success', 'Language updated successfully') }}
        >
          <Text className={`text-center font-semibold ${language === 'en' ? 'text-white' : 'text-gray-800'}`}>English</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 rounded-lg border ${language === 'kn' ? `${bgColors.blue500} border-blue-500` : `${bgColors.white} border-gray-300`
            }`}
          onPress={() => { saveLanguage('kn'), showBanner('success', 'Language updated successfully') }}
        >
          <Text className={`text-center font-semibold ${language === 'kn' ? 'text-white' : 'text-gray-800'}`}>Native</Text>
        </TouchableOpacity>
      </View>

      <Text className="mt-6 text-gray-600">
        Current selected language: {language === 'en' ? 'English' : 'Native'}
      </Text>
      <Text className="text-lg font-semibold mb-2 text-gray-700 mt-10"> Clear local data and reload the data from server</Text>
      <TouchableOpacity
        className={`${bgColors.red600} px-4 py-3 rounded-lg mb-10 mt-2`}
        onPress={clearLocal}
      >
        <Text className="text-white text-center font-semibold">
          Clear
        </Text>
      </TouchableOpacity>
    </View>
  );
}
