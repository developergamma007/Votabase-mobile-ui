// screens/Logs.js
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { getLogs, clearLogs, updateLogStatus } from "../../components/LogsHelpers";
import { useNavigation } from '@react-navigation/native';
import { CRUDAPI } from "../../apis/Api";
import { bgColors } from "../../constants/colors";

export default function Logs() {
  const [items, setItems] = useState([]);
  const navigation = useNavigation();
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (items && items.length > 0) {
      let pendingItems = items && items?.filter(item => item.status === 'pending');
      if (!pendingItems || pendingItems.length === 0) {
        setIsSynced(true);
      }
    }
  }, [items])

  const loadLogs = async () => {
    const logs = await getLogs();
    setItems(logs);
  };

  const SyncNow = async () => {
    let pendingItems = items && items?.filter(item => item.status === 'pending')?.map(item => {
      if (item) {
        const { boothInfo, ...rest } = item; // exclude boothInfo
        return rest;
      }
      return null; // or skip if you prefer
    }).filter(Boolean); // remove nulls if any
    if (!pendingItems || pendingItems.length === 0) {
      setIsSynced(true);
      return;
    }
    for (const item of pendingItems) {
      if (item) {
        const voterId = item?.voter?.voterId;
        try {
          const transformedReq = {
            updateLocationLat: item?.voter?.location && item?.voter?.location.latitude || 0,
            updateLocationLng: item?.voter?.location && item?.voter?.location.longitude || 0,
            updateRequest: item.voter
          };
          const res = await CRUDAPI.updateVoter(voterId, transformedReq);
          if(res.success){
            await updateLogStatus(item.id, "server");
            loadLogs()
          }
        } catch (error) {
          console.log(`Failed to update voter ${voterId}:`, error);
        }
      }
    }
  }

  return (
    <ScrollView className={`flex-1 ${bgColors.white} px-4 pt-6`}>

      <View className={`${bgColors.gray100} rounded-xl p-4 mb-6 border border-gray-200`}>
        {!isSynced && (
          <>
            <Text className="text-lg font-semibold text-gray-800">Offline mode</Text>
            <Text className="text-gray-500 mt-1">
              Entered data saved locally; will auto-upload when online.
            </Text>
          </>
        )}
        <TouchableOpacity
          className={`px-4 py-2 rounded-lg mt-3 ${isSynced ? bgColors.green600 : bgColors.blue600
            }`}
          onPress={SyncNow}
        >
          <Text className="text-white font-semibold text-center">
            {isSynced ? "Synced everything" : "Sync Now"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text className="text-xl font-semibold text-gray-800 mb-3">
        Latest Work (Date-wise)
      </Text>
      {items && items.length === 0 && (
        <Text className="text-gray-500 mt-10 text-center">No logs available</Text>
      )}
      {items && items.map((item, index) => (
        <View
          key={index}
          className={`${bgColors.white} border border-gray-200 rounded-xl p-4 mb-4 shadow-sm`}
        >
          <Text className="text-gray-800 text-base font-semibold mb-1">
            {item.title}
          </Text>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-gray-500 mb-2">{item.date}</Text>
              {item.status === "server" ? (
                <Text className={`${bgColors.green100} text-green-700 px-3 py-1 rounded-md text-xs`}>
                  Server updated
                </Text>
              ) : (
                <Text className={`${bgColors.yellow100} text-yellow-700 px-3 py-1 rounded-md text-xs`}>
                  Needs update
                </Text>
              )}
            </View>
            <TouchableOpacity className={`${bgColors.gray800} px-4 py-2 rounded-lg`} onPress={() => navigation.navigate("Voter Info", { voter: item.voter, booth: item.booth })}>
              <Text className="text-white font-semibold text-sm">Open Voter</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
