import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { CRUDAPI } from "../../apis/Api";
import { bgColors } from "../../constants/colors";

const LoadData = ({ navigation }) => {
  const LITE_CACHE_KEY = "boothSnapshotLite";

  const saveData = async (data) => {
    try {
      await AsyncStorage.setItem(LITE_CACHE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving data', error);
      return false;
    }
  };

  const loadAssembly = async () => {
    try {
      const res = await CRUDAPI.loadDataLite();
      const snapshotResult = res?.data?.result;
      console.log('Re-loaded data from server')
      if (!snapshotResult) throw new Error('Snapshot data not found');

      if (typeof snapshotResult === "string") {
        // Link-based contract for large snapshots.
        const resp = await fetch(snapshotResult);
        if (!resp.ok) throw new Error(`Snapshot link fetch failed: ${resp.status}`);
        const snapshotJson = await resp.json();
        await saveData(snapshotJson);
      } else {
        // New backend contract: snapshot object is returned directly.
        await saveData(snapshotResult);
      }
    } catch (error) {
      console.error('Error loading assembly data:', error);
    }
  };


  // useEffect(() => {
  //   const checkUserAndLoad = async () => {
  //     try {
  //       const loggedInUser = await AsyncStorage.getItem("loggedInUser");
  //       const newLoggedInUser = await AsyncStorage.getItem("newLoggedInUser");
  //       if ((loggedInUser != newLoggedInUser && newLoggedInUser) || !newLoggedInUser  ) { // make it equal while reloading assembly data for the same user, here in future we need to check how it is behaving for different user. (Is it loading previous data or fresh data)
  //         await loadAssembly();
  //       }
  //       navigation.navigate('Home')
  //     } catch (error) {
  //       console.error("Error reading from AsyncStorage:", error);
  //     }
  //   };
  //   checkUserAndLoad();
  // }, []);

  useEffect(() => {
  const checkUserAndLoad = async () => {
    try {
      const loggedInUser = await AsyncStorage.getItem("loggedInUser");
      const newLoggedInUser = await AsyncStorage.getItem("newLoggedInUser");

      // Load only when a DIFFERENT user logs in
      if (loggedInUser && newLoggedInUser && loggedInUser !== newLoggedInUser) {
        await loadAssembly();

        // After loading, make them equal (reset state)
        await AsyncStorage.setItem("loggedInUser", newLoggedInUser);
      }

      navigation.navigate("Home");
    } catch (error) {
      console.error("Error reading from AsyncStorage:", error);
    }
  };

  checkUserAndLoad();
}, []);


  return (
    <View className={`flex-1 justify-center items-center ${bgColors.white}`}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text className="mt-4 text-lg text-gray-700 font-medium">
        Please wait...
      </Text>
    </View>
  );
};

export default LoadData;
