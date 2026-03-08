import { View, Text, TouchableOpacity, FlatList } from "react-native";
import React, { useEffect, useLayoutEffect } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";
import { bgColors } from "../../constants/colors";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function VoterFamilyDetails() {
    const route = useRoute();
    const navigation = useNavigation()
    const { family, associationName, boothId } = (route.params as any) || {};
    const familyName = route?.params?.family?.familyName || "Family";

    useLayoutEffect(() => {
        navigation.setOptions({
            title: familyName,
            headerRight: () => (
                <TouchableOpacity
                    onPress={() => navigation.navigate("addFamilyDetails", { boothId: boothId, family: family })}
                    style={{ marginLeft: 4 }}
                >
                    <Ionicons name="pencil-outline" size={28} />
                </TouchableOpacity>
            ),
        });
    }, [navigation]);

    return (
        <View className={`flex-1 ${bgColors.white} px-4 pt-6`}>
            <Text className="text-gray-600 mb-2">{family?.familyAddress}</Text>
            <View className={`${bgColors.white} p-4 rounded-2xl shadow-sm mb-4`}>
                <Text className="text-lg text-blue-600 font-medium mb-2">{associationName || "No Association Linked"}</Text>
                <View className="flex-row justify-between items-center mb-3">
                    <TouchableOpacity className={`${bgColors.blue600} px-4 py-2 rounded-xl`}>
                        <Text className="text-white font-medium">Change</Text>
                    </TouchableOpacity>
                </View>
                <View className="border-t border-gray-200 pt-3">
                    {family?.latitude && family?.longitude ?
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="location-outline" size={18} color="#1D4ED8" />
                            <Text className="ml-2 text-gray-700">{family?.latitude}</Text>
                            <Text className="ml-4 text-gray-700">{family?.longitude}</Text>
                        </View> :
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="location-outline" size={18} color="#1D4ED8" />
                            <Text className="ml-2 text-gray-700">Location not fetched </Text>
                        </View>
                    }

                </View>
            </View>
            <Text className="text-xl font-semibold mb-2">
                Members ({family?.members.length})
            </Text>
            <View className={`${bgColors.white} rounded-2xl shadow-sm`}>
                {family?.members.map((m, index) => (
                    <View
                        key={m.memberId}
                        className={`flex-row items-center p-4 ${index !== family?.members?.length - 1 ? "border-b border-gray-200" : ""
                            }`}
                    >
                        <View className={`w-10 h-10 rounded-full ${bgColors.gray200} items-center justify-center mr-3`}>
                            <Text className="text-lg font-semibold text-gray-700">
                                {m.voterName.charAt(0)}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-black font-medium">{m.voterName}</Text>
                        </View>
                        {m.epicNo && (
                            <Text className="text-gray-500 font-medium">{m.epicNo}</Text>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
}
