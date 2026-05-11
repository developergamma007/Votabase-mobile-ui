import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Switch } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { CRUDAPI, getAssemblyCode } from "../../apis/Api";
import { bgColors } from "../../constants/colors";
import { AuthContext } from "../../context/AuthContext";

export default function PollDayVoters() {
  const { userInfo } = useContext(AuthContext);
  const [tab, setTab] = useState('ALL');
  const [natureFilter, setNatureFilter] = useState('');
  const [pollQuery, setPollQuery] = useState('');
  const [pollRelationQuery, setPollRelationQuery] = useState('');
  const [pollLoading, setPollLoading] = useState(false);
  const [pollVoters, setPollVoters] = useState([]);
  const [pollError, setPollError] = useState('');
  const [pollDayEnabled, setPollDayEnabled] = useState(false);
  const [globalPollDayEnabled, setGlobalPollDayEnabled] = useState(false);
  const [assemblyCode, setAssemblyCode] = useState('');
  const pollSearchTimerRef = useRef(null);

  const isSuperAdmin = userInfo?.userName === 'admin@iswot.io' || userInfo?.role === 'SUPER_ADMIN';

  useEffect(() => {
    const init = async () => {
      const code = await getAssemblyCode();
      setAssemblyCode(code);
      checkActivation(code);
    };
    init();
  }, []);

  const checkActivation = async (code) => {
    try {
      const globalConfig = await CRUDAPI.fetchPollDayConfig(null, null);
      setGlobalPollDayEnabled(globalConfig.enabled);

      const config = await CRUDAPI.fetchPollDayConfig(code);
      setPollDayEnabled(config.enabled);
    } catch (err) {
      setPollDayEnabled(false);
      setGlobalPollDayEnabled(false);
    }
  };

  const handleToggleActivation = async (val) => {
    try {
      await CRUDAPI.updatePollDayConfig(assemblyCode, null, val);
      setPollDayEnabled(val);
    } catch (err) {
      setPollError('Failed to update activation.');
    }
  };

  const handleToggleGlobalActivation = async (val) => {
    try {
      await CRUDAPI.updatePollDayConfig(null, null, val);
      setGlobalPollDayEnabled(val);
      // Sync the assembly-specific toggle as well
      await CRUDAPI.updatePollDayConfig(assemblyCode, null, val);
      setPollDayEnabled(val);
    } catch (err) {
      setPollError('Failed to update global activation.');
    }
  };

  const buildPollDisplay = (item) => {
    const name = [item.firstMiddleNameEn, item.lastNameEn].filter(Boolean).join(' ').trim();
    const rawStatus = item.votingStatus || item.voteStatus || item.status || item.votedStatus || '';
    const normalizedStatus = String(rawStatus).toUpperCase();
    return {
      id: item.epicNo || item.voterId || `${name}-${Date.now()}`,
      name: name || item.name || item.voterName || item.epicNo || 'Unknown',
      epic: item.epicNo || item.epic || '',
      phone: item.mobile || item.phone || '',
      houseNo: item.houseNoEn || item.houseNoLocal || '',
      natureOfVoter: item.natureOfVoter || item.nature || '',
      boothNo: item.boothNo || item.boothNumber || item.booth || '',
      wardCode: item.wardCode || '',
      votedStatus: normalizedStatus || '',
    };
  };

  const handleToggleVoted = async (voter, newStatus) => {
    if (!pollDayEnabled && !globalPollDayEnabled) {
      Alert.alert('Restricted', 'Poll Day is currently not active. Please enable activation.');
      return;
    }
    try {
      await CRUDAPI.updateVoterStatus(voter.epic, newStatus, voter.wardCode, voter.boothNo);
      setPollVoters((prev) =>
        prev.map((v) => (v.id === voter.id ? { ...v, votedStatus: newStatus } : v))
      );
    } catch (err) {
      setPollError('Failed to update status.');
    }
  };

  const fetchPollVoters = async (queryValue = '') => {
    setPollLoading(true);
    setPollError('');
    try {
      const res = await CRUDAPI.searchVoters({
        assemblyCode: assemblyCode,
        searchQuery: queryValue.trim() || undefined,
        relationName: pollRelationQuery.trim() || undefined,
        size: 200,
      });
      const payload = res?.data?.result || res?.result || res?.data || [];
      const list = Array.isArray(payload) ? payload : [];
      setPollVoters(list.map(buildPollDisplay));
    } catch (error) {
      setPollError('Unable to load voters.');
      setPollVoters([]);
    } finally {
      setPollLoading(false);
    }
  };

  useEffect(() => {
    if (pollSearchTimerRef.current) clearTimeout(pollSearchTimerRef.current);
    pollSearchTimerRef.current = setTimeout(() => {
      fetchPollVoters(pollQuery);
    }, 500);
    return () => clearTimeout(pollSearchTimerRef.current);
  }, [pollQuery, pollRelationQuery, assemblyCode]);

  const filteredPollVoters = useMemo(() => {
    let list = [...pollVoters];
    if (natureFilter) {
      list = list.filter((v) => String(v.natureOfVoter || '').toUpperCase() === natureFilter);
    }
    if (tab === 'VOTED') {
      list = list.filter((v) => {
        const s = String(v.votedStatus).toUpperCase();
        return s.includes('VOTED') && !s.includes('NOT');
      });
    } else if (tab === 'NOT VOTED') {
      list = list.filter((v) => String(v.votedStatus).toUpperCase().includes('NOT'));
    }
    return list;
  }, [pollVoters, natureFilter, tab]);

  const badgeColor = (status) => {
    const s = String(status).toUpperCase();
    if (s === 'FAVOUR') return 'bg-green-600';
    if (s === 'NEUTRAL') return 'bg-gray-400';
    return 'bg-red-600';
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* ADMIN CONTROLS */}
      {isSuperAdmin && (
        <View className="bg-white px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-bold text-gray-700">Global Activation</Text>
            <Switch
              value={globalPollDayEnabled}
              onValueChange={handleToggleGlobalActivation}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={globalPollDayEnabled ? "#2563eb" : "#f4f3f4"}
            />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-gray-700">Assembly Activation</Text>
            <Switch
              value={pollDayEnabled}
              onValueChange={handleToggleActivation}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={pollDayEnabled ? "#2563eb" : "#f4f3f4"}
            />
          </View>
        </View>
      )}

      {!isSuperAdmin && !pollDayEnabled && !globalPollDayEnabled && (
        <View className="bg-amber-50 p-4 border-b border-amber-200">
          <Text className="text-amber-800 font-medium text-center">
            Poll Day is currently inactive. Please contact Admin.
          </Text>
        </View>
      )}

      {/* SEARCH */}
      <View className="px-4 pt-3">
        <View className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex-row items-center">
          <Icon name="search" size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-2 text-black"
            placeholder="Search name / EPIC / phone"
            value={pollQuery}
            onChangeText={setPollQuery}
          />
        </View>

        <View className="flex-row space-x-2 mt-3">
          {["ALL", "VOTED", "NOT VOTED"].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setTab(f)}
              className={`border px-4 py-2 rounded-full mr-2 ${tab === f ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
            >
              <Text className={`font-medium ${tab === f ? 'text-white' : 'text-gray-700'}`}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row space-x-2 mt-3">
          {["", "FAVOUR", "NEUTRAL", "NON-FAVOUR"].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setNatureFilter(n)}
              className={`border px-3 py-1.5 rounded-lg mr-2 ${natureFilter === n ? 'bg-indigo-100 border-indigo-400' : 'bg-white border-gray-100'}`}
            >
              <Text className={`text-[10px] font-bold ${natureFilter === n ? 'text-indigo-700' : 'text-gray-500'}`}>{n || 'ALL NATURE'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* LIST */}
      <ScrollView className="px-4 mt-4" contentContainerStyle={{ paddingBottom: 140 }}>
        {pollLoading && <ActivityIndicator size="large" color="#2563eb" className="mt-4" />}
        {pollError ? <Text className="text-red-600 text-center mt-4">{pollError}</Text> : null}
        
        {!pollLoading && filteredPollVoters.length === 0 && (
          <Text className="text-gray-500 text-center mt-10">No voters found.</Text>
        )}

        {filteredPollVoters.map((v, i) => (
          <View key={v.id} className="bg-white rounded-xl p-4 mb-4 border border-gray-100 shadow-sm">
            <View className="flex-row justify-between">
              <View className="flex-row flex-1">
                <View className="h-10 w-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                  <Text className="text-blue-700 font-bold">{v.name.charAt(0)}</Text>
                </View>

                <View className="flex-1">
                  <Text className="font-bold text-base text-gray-800">{v.name}</Text>
                  <Text className="text-gray-500 text-sm">
                    {v.epic} · {v.phone || 'No Phone'}
                  </Text>

                  <View className="flex-row mt-1 items-center">
                    <View className={`px-2 py-0.5 rounded-full ${badgeColor(v.natureOfVoter)} mr-2`}>
                      <Text className="text-white text-[10px] font-bold">{v.natureOfVoter || 'N/A'}</Text>
                    </View>
                    <View className="bg-gray-100 px-2 py-0.5 rounded-full">
                      <Text className="text-gray-600 text-[10px]">Booth {v.boothNo}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View className="flex-row items-center">
                <TouchableOpacity 
                  onPress={() => handleToggleVoted(v, 'VOTED')}
                  className={`px-3 py-1.5 rounded-md mr-2 border ${v.votedStatus === 'VOTED' ? 'bg-green-600 border-green-600' : 'bg-white border-green-600'}`}
                >
                  <Text className={`text-xs font-bold ${v.votedStatus === 'VOTED' ? 'text-white' : 'text-green-600'}`}>VOTED</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => handleToggleVoted(v, 'NOT VOTED')}
                  className={`px-3 py-1.5 rounded-md border ${v.votedStatus === 'NOT VOTED' ? 'bg-red-600 border-red-600' : 'bg-white border-red-600'}`}
                >
                  <Text className={`text-xs font-bold ${v.votedStatus === 'NOT VOTED' ? 'text-white' : 'text-red-600'}`}>NOT</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 flex-row">
        <TouchableOpacity 
          onPress={() => setTab('NOT VOTED')}
          className="flex-1 mr-2 border border-blue-600 rounded-xl py-3"
        >
          <Text className="text-blue-600 font-bold text-center">Show Not Voted</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => fetchPollVoters(pollQuery)}
          className="flex-1 ml-2 bg-blue-600 rounded-xl py-3"
        >
          <Text className="text-white font-bold text-center">Refresh List</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

