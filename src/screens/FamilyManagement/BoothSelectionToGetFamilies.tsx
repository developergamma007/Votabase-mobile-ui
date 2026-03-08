import { View, Text, TextInput, FlatList, TouchableOpacity, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { CRUDAPI } from "../../apis/Api";
import { bgColors } from "../../constants/colors";

export default function BoothForFamily() {
    const [search, setSearch] = useState("");
    const navigation = useNavigation();
    const [boothsList, setBoothsList] = useState("");
    const filtered = boothsList && boothsList?.data?.result.filter((b) =>
        b.nameEn && b.nameEn.toLowerCase().includes(search.toLowerCase())
    );

    const fetchBoothIds = async () => {
        try {
            const res = await CRUDAPI.fetchBoothIds();
            setBoothsList(res);
        } catch {
            //
        }
    }

    useEffect(() => {
        fetchBoothIds()
    }, [])

    return (
        <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={
                <View className={`${bgColors.gray100} px-4 ${bgColors.blue300}`}>
                    {/* Search Input */}
                    <View className={`${bgColors.white} rounded-2xl px-4 py-3 mb-4 mt-6`}>
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search booth..."
                            placeholderTextColor="#9CA3AF"
                            className="text-base text-black"
                        />
                    </View>
                </View>
            }
            renderItem={({ item }) => (
                <TouchableOpacity
                    className={`${bgColors.white} p-4 rounded-2xl mb-3 shadow-sm flex-row items-center mx-4 `}
                    onPress={() => navigation.navigate("families", {boothId : item.id})}
                >
                    <View className="flex-1">
                        <Text className="text-base font-semibold text-black">
                            {item.nameEn}
                        </Text>
                    </View>

                    <Ionicons
                        name="chevron-forward"
                        size={22}
                        color="#9CA3AF"
                        style={{ marginLeft: 10 }}
                    />
                </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 50 }} // for spacing at the bottom
        />

    );
}
