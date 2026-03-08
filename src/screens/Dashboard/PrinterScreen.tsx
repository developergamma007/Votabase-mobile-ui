import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";

export default function PrinterScreen() {
    return (
        <View className="flex-1 bg-[#F4F3FF] px-4 pt-6">
            <LinearGradient
                colors={["#0C7BB3", "#0796A1"]}
                className="rounded-2xl p-4 mb-5"
            >
                <View className="flex-row items-center justify-between p-5 rounded">
                    <View>
                        <View className="flex-row items-center mb-1">
                            <View className="h-3 w-3 bg-green-500 rounded-full mr-2 p 5" />
                            <Text className="font-semibold text-white">Connected</Text>
                        </View>
                        <Text className="text-white">Battery: 85%</Text>
                    </View>

                    <TouchableOpacity className="bg-white px-4 py-2 rounded-full shadow-sm">
                        <Text className="text-blue-600 font-semibold">Connect</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Devices */}
            <View className="bg-white rounded-2xl p-4 mb-4">
                <Text className="text-gray-800 font-semibold mb-3">
                    Available Devices
                </Text>

                {["Wireless Printer A", "Wireless Printer B", "Wireless Printer C"].map(
                    (item, index) => (
                        <View
                            key={index}
                            className="flex-row justify-between items-center py-3 border-b border-gray-100"
                        >
                            <Text className="text-gray-700">{item}</Text>
                            <Icon name="wifi" size={20} color="#9CA3AF" />
                        </View>
                    )
                )}
            </View>

            {/* Primary Actions */}
            <View className="mt-auto mb-4">
                <LinearGradient
                    colors={["#0C7BB3", "#0796A1"]}
                    className="rounded-full py-4 mb-3"
                >
                    <Text className="text-white text-center font-semibold text-lg">
                        Disconnect
                    </Text>
                </LinearGradient>

                <TouchableOpacity className="bg-[#EEF2FF] rounded-full py-4">
                    <Text className="text-center text-indigo-700 font-semibold">
                        Print Sample
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

