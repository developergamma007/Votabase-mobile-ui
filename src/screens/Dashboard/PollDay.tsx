import React from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

export default function PollDayVoters() {
  const voters = [
    { name: "Ravi Kumar", epic: "EPIC001", phone: "9876543210", status: "Favour", booth: "12A" },
    { name: "Suma R", epic: "EPIC002", phone: "8765432109", status: "Neutral", booth: "12A" },
    { name: "Anil", epic: "EPIC003", phone: "7654321098", status: "NonFavour", booth: "15" },
  ];

  const badgeColor = (status: string) =>
    status === "Favour"
      ? "bg-green-600"
      : status === "Neutral"
      ? "bg-gray-400"
      : "bg-red-600";

  return (
    <View className="flex-1 bg-gray-50">

      {/* SEARCH */}
      <View className="px-4 pt-3">
        <View className="flex-row items-center space-x-2">
          <View className="flex-1 bg-white border text-black rounded-lg px-3 py-2">
            <TextInput placeholder="Search name / EPIC / phone" />
          </View>
        </View>

        <View className="flex-row space-x-2 mt-3">
          {["ALL", "VOTED", "NOT VOTED"].map((f) => (
            <TouchableOpacity
              key={f}
              className="border px-4 py-2 rounded-full bg-white mr-2"
            >
              <Text className="font-medium">{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* LIST */}
      <ScrollView className="px-4 mt-4" contentContainerStyle={{ paddingBottom: 140 }}>
        {voters.map((v, i) => (
          <View key={i} className="bg-white rounded-xl p-4 mb-4 border">
            <View className="flex-row justify-between">
              <View className="flex-row space-x-3">
                <View className="h-10 w-10 bg-blue-600 rounded-full items-center justify-center mr-4">
                  <Text className="text-white font-bold">
                    {v.name.charAt(0)}
                  </Text>
                </View>

                <View>
                  <Text className="font-semibold text-base">{v.name}</Text>
                  <Text className="text-gray-500">
                    {v.epic} · {v.phone}
                  </Text>

                  <View className="flex-row mt-1 space-x-2">
                    <View className={`px-2 py-0.5 rounded-full ${badgeColor(v.status)}`}>
                      <Text className="text-white text-xs">{v.status}</Text>
                    </View>
                    <View className="bg-gray-200 px-2 py-0.5 rounded-full">
                      <Text className="text-xs">{v.booth}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View className="flex-row items-center space-x-2">
                <TouchableOpacity className="border border-green-600 px-3 py-1 rounded-md mr-2">
                  <Text className="text-green-600 text-sm">VOTED</Text>
                </TouchableOpacity>

                <TouchableOpacity className="bg-red-600 px-3 py-1 rounded-md">
                  <Text className="text-white text-sm">NOT</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
        <View className="flex-row justify-between">
          <TouchableOpacity className="flex-1 mr-2 border border-blue-600 rounded-full py-3">
            <Text className="text-blue-600 font-semibold text-center">
              Show Not Voted
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 ml-2 bg-blue-600 rounded-full py-3">
            <Text className="text-white font-semibold text-center">
              Sync Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
