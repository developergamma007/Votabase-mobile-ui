// Dashboard.js
import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, Alert, FlatList } from 'react-native';
// import boothData from '../Json/dummyBooth.json'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { bgColors } from '../../constants/colors';

export default function SearchBooth() {

  const [search, setSearch] = useState('');
  const [assemblyData, setAssemblyData] = useState([]);
  const navigation = useNavigation();

  const loadData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('assemblyData');
      if (!jsonValue) {
        console.log('⚠️ No data in storage');
        return null;
      }
      const parsed = JSON.parse(jsonValue);
      setAssemblyData(parsed);
      return [];
    } catch (error) {
      console.error('Error reading data', error);
      return [];
    }
  };

  useEffect(() => {
    //  AsyncStorage.removeItem('assemblyData');
    loadData();
  }, []);

  const allBooths = assemblyData?.assembly && assemblyData?.assembly?.wards?.flatMap(ward =>
    ward.booths.map(booth => ({
      ...booth,
      wardId: ward.wardId,
      wardNameEn: ward.wardNameEn,
      wardNameLocal: ward.WardNameLocal
    }))
  );

  const filteredData = allBooths && allBooths?.filter((item) =>
    item.boothNameEn?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className={`flex-1 ${bgColors.gray100} px-4 pt-4`}>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-black"
        placeholder="Search"
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch} // Update search state
      />
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.boothId.toString()}
        showsVerticalScrollIndicator={true}
        renderItem={({ item: booth }) => (
          <TouchableOpacity
            className={` border ${bgColors.white} rounded-2xl mb-3 p-3 shadow-sm`}
            onPress={() => navigation.navigate("Voter List", { booth })}
          >
            {/* Booth Title */}
            <Text className="text-base font-semibold text-black">
              {booth.boothId}
              {booth.boothNameEn ? ` - ${booth.boothNameEn}` : ''}
              {booth.boothNameEn || booth.boothNameLocal ? '.' : ''}
            </Text>
            {booth.voters && (
              <View className="flex-row flex-wrap items-center mt-1">
                <Text className="text-sm text-gray-800 mr-1">Total Voters:</Text>
                <Text className="font-bold text-black mr-3">{booth.voters.length}</Text>
                <Text className="text-sm text-gray-800 mr-1">Male:</Text>
                <Text className="font-bold text-black mr-3">
                  {booth.voters.filter(v => v.gender === 'M').length}
                </Text>
                <Text className="text-sm text-gray-800 mr-1">Female:</Text>
                <Text className="font-bold text-black">
                  {booth.voters.filter(v => v.gender === 'F').length}
                </Text>
              </View>

            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text className="text-center text-gray-500 mt-5">
            No booths found.
          </Text>
        }
      />
    </View>
  );
}
