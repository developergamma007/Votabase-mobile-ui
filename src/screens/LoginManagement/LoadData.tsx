import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { CRUDAPI } from "../../apis/Api";
import { bgColors } from "../../constants/colors";

const LoadData = ({ navigation }) => {
  const saveData = async (data) => {
    try {
      await AsyncStorage.setItem('assemblyData', JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving data', error);
      return false;
    }
  };

  const loadAssembly = async () => {
    try {
      const res = await CRUDAPI.loadData();
      const snapshotResult = res?.data?.result;
      console.log(snapshotResult)
      console.log('Re-loaded data from server')
      if (!snapshotResult) throw new Error('Snapshot data not found');

      if (typeof snapshotResult === "string") {
        // Backward compatibility: older backend may still send a URL.
        const jsonResponse = await axios.get(snapshotResult);
        await saveData(jsonResponse.data);
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
