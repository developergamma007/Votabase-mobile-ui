// Dashboard.js
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import LinearGradient from "react-native-linear-gradient";
import { bgColors } from "../../constants/colors";

type RootStackParamList = {
  Home: undefined;
  "Search Voter": undefined;
  "Search Booth": undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function LandingPage({ navigation }: Props) {
  return (
    <LinearGradient
      colors={["#0C7BB3", "#0796A1"]}
      style={{flex:1}}
    >
      <ScrollView >
        <View className="mt-4 mx-6 space-y-4">
          <TouchableOpacity
            onPress={() => navigation.navigate("Search Voter")}
            className={`${bgColors.white20} rounded-2xl py-6 px-5 mb-6 mt-2`}
          >
            <View className="flex-row items-center space-x-3">
              <Text className="text-white text-3xl">🔍</Text>
              <Text className="text-white text-xl font-bold ml-3">Search Voter</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("Search Booth")}
            className={`${bgColors.white20} rounded-2xl py-6 px-5 mb-6`}
          >
            <View className="flex-row items-center space-x-3">
              <Text className="text-white text-3xl">📍</Text>
              <Text className="text-white text-xl font-bold ml-3">Search Booth</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity className="bg-white/20 rounded-2xl py-10 px-5 mb-6" onPress={() => navigation.navigate("boothForFamily")}>
            <View className="flex-row items-center space-x-3">
              <Text className="text-white text-3xl">👨‍👩‍👧</Text>
              <View className="ml-3">
                <Text className="text-white text-xl font-bold">Voters Family</Text>
                <Text className="text-white/80 text-sm mt-1">
                  Household-based view for outreach planning.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white/20 rounded-2xl py-10 px-5 mb-6" onPress={() => navigation.navigate("meetings")}>
            <View className="flex-row items-center space-x-3">
              <Text className="text-white text-3xl">📅</Text>
              <View className="ml-3">
                <Text className="text-white text-xl font-bold">Meetings</Text>
                <Text className="text-white/80 text-sm mt-1">
                  Schedule, assign and track meeting notes.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white/20 rounded-2xl py-10 px-5 mb-6" onPress={() => navigation.navigate("pollDay")}>
            <View className="flex-row items-center space-x-3">
              <Text className="text-white text-3xl">🗳️</Text>
              <View className="ml-3">
                <Text className="text-white text-xl font-bold">Poll Day</Text>
                <Text className="text-white/80 text-sm mt-1">
                  Booth-wise tasks & turnout tracking.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white/20 rounded-2xl py-10 px-5 mb-6" onPress={() => navigation.navigate("print")}>
            <View className="flex-row items-center space-x-3">
              <Text className="text-white text-3xl">🖨️</Text>
              <View className="ml-3">
                <Text className="text-white text-xl font-bold">Print</Text>
                <Text className="text-white/80 text-sm mt-1">
                  PDF/Excel exports for lists and slips.
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
