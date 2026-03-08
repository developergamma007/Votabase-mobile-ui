// Dashboard.js
import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, FlatList, ActivityIndicator } from 'react-native';
// import boothData from '../Json/dummyBooth.json'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { bgColors } from '../../constants/colors';
import { CRUDAPI } from '../../apis/Api';

export default function SearchBooth() {
  const BOOTH_CACHE_KEY = 'boothSnapshotLite';

  const [search, setSearch] = useState('');
  const [assemblyData, setAssemblyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadingBoothId, setLoadingBoothId] = useState(null);
  const navigation = useNavigation();

  const loadData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(BOOTH_CACHE_KEY);
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

  const fetchSnapshotFromApi = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await CRUDAPI.loadDataLite();
      const snapshotResult = response?.data?.result;

      if (!snapshotResult) {
        throw new Error('Snapshot data not found');
      }

      if (typeof snapshotResult === 'string') {
        const resp = await fetch(snapshotResult);
        if (!resp.ok) throw new Error(`Snapshot link fetch failed: ${resp.status}`);
        const snapshotJson = await resp.json();
        setAssemblyData(snapshotJson);
        await AsyncStorage.setItem(BOOTH_CACHE_KEY, JSON.stringify(snapshotJson));
      } else {
        setAssemblyData(snapshotResult);
        await AsyncStorage.setItem(BOOTH_CACHE_KEY, JSON.stringify(snapshotResult));
      }
    } catch (error) {
      console.log('Error fetching snapshot from API, falling back to local cache:', error);
      await loadData();
      setLoadError('Failed to fetch latest snapshot. Showing local data if available.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshotFromApi();
  }, []);

  const allBooths = assemblyData?.assembly && assemblyData?.assembly?.wards?.flatMap(ward =>
    (ward.booths || []).map(booth => ({
      ...booth,
      boothId: booth.boothId ?? booth.id ?? booth.booth_no,
      boothNameEn: booth.boothNameEn ?? booth.nameEn ?? booth.booth_add_en ?? '',
      boothNameLocal: booth.boothNameLocal ?? booth.nameLocal ?? booth.booth_add_local ?? '',
      voters: booth.voters || [],
      wardId: ward.wardId ?? ward.id ?? ward.ward_id,
      wardNameEn: ward.wardNameEn ?? ward.nameEn ?? ward.ward_name_en,
      wardNameLocal: ward.wardNameLocal ?? ward.nameLocal ?? ward.ward_name_local
    }))
  );

  const filteredData = (allBooths || []).filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const haystack = `${item.boothNameEn || ''} ${item.boothNameLocal || ''} ${item.boothId || ''}`.toLowerCase();
    return haystack.includes(q);
  });

  const getBoothStats = (booth) => {
    const stats = booth?.voterStats || {};
    const voters = booth?.voters || [];
    return {
      total: Number.isFinite(stats.total) ? stats.total : voters.length,
      male: Number.isFinite(stats.male) ? stats.male : voters.filter(v => (v.gender || '').toUpperCase().startsWith('M')).length,
      female: Number.isFinite(stats.female) ? stats.female : voters.filter(v => (v.gender || '').toUpperCase().startsWith('F')).length,
    };
  };

  const openBooth = async (booth) => {
    try {
      setLoadingBoothId(booth.boothId);
      const response = await CRUDAPI.fetchBoothVoters(booth.boothId);
      const boothPayload = response?.data?.result;
      if (boothPayload) {
        navigation.navigate("Voter List", { booth: boothPayload });
        return;
      }
      navigation.navigate("Voter List", { booth });
    } catch (error) {
      console.log('Failed to fetch booth voters, opening cached booth data:', error?.message || error);
      navigation.navigate("Voter List", { booth });
    } finally {
      setLoadingBoothId(null);
    }
  };

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
        keyExtractor={(item) => String(item.boothId)}
        showsVerticalScrollIndicator={true}
        renderItem={({ item: booth }) => (
          <TouchableOpacity
            className={` border ${bgColors.white} rounded-2xl mb-3 p-3 shadow-sm`}
            onPress={() => openBooth(booth)}
          >
            {/* Booth Title */}
            <Text className="text-base font-semibold text-black">
              {booth.boothId}
              {booth.boothNameEn ? ` - ${booth.boothNameEn}` : ''}
              {booth.boothNameEn || booth.boothNameLocal ? '.' : ''}
            </Text>
            {booth.voters && (
              <View className="flex-row flex-wrap items-center mt-1">
                {(() => {
                  const stats = getBoothStats(booth);
                  return (
                    <>
                      <Text className="text-sm text-gray-800 mr-1">Total Voters:</Text>
                      <Text className="font-bold text-black mr-3">{stats.total}</Text>
                      <Text className="text-sm text-gray-800 mr-1">Male:</Text>
                      <Text className="font-bold text-black mr-3">{stats.male}</Text>
                      <Text className="text-sm text-gray-800 mr-1">Female:</Text>
                      <Text className="font-bold text-black">{stats.female}</Text>
                    </>
                  );
                })()}
                {loadingBoothId === booth.boothId && (
                  <ActivityIndicator size="small" style={{ marginLeft: 8 }} />
                )}
              </View>

            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <View className="items-center mt-8">
              <ActivityIndicator size="small" />
              <Text className="text-center text-gray-500 mt-3">Loading booths...</Text>
            </View>
          ) : (
            <View>
              {!!loadError && (
                <Text className="text-center text-red-500 mt-4 px-4">
                  {loadError}
                </Text>
              )}
              <Text className="text-center text-gray-500 mt-5">
                No booths found.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}
