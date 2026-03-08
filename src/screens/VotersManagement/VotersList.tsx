import React, { useState, useMemo } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { bgColors } from "../../constants/colors";

const ListVoter = () => {
    const route = useRoute();
    const navigation = useNavigation();

    // booth can be a single object or an array
    const { booth, filteredVotersByParameter } = (route.params as any) || {};

    const [search, setSearch] = useState("");

    // 🧠 Normalize: always work with an array of booths
    const booths = useMemo(() => {
        if (!booth) return [];
        return Array.isArray(booth) ? booth.filter(b => b) : [booth].filter(b => b);
    }, [booth]);

    // 🗳️ Combine voters from all booths
    const allVoters = useMemo(() => {
        return booths.flatMap((b: any) =>
            (b?.voters || []).map((v: any) => ({
                ...v,
                // Handle both 'name' and 'firstMiddleNameEn' fields
                firstMiddleNameEn: v.firstMiddleNameEn || v.name || "",
                boothInfo: { boothId: b.boothId, boothNameEn: b.boothNameEn, boothNameLocal: b.boothNameLocal },
            }))
        );
    }, [booths]);

    // 🔍 Filter by name (only if filteredVotersByParameter is not provided)
    const filteredVoters = useMemo(() => {
        if (filteredVotersByParameter && Array.isArray(filteredVotersByParameter)) {
            // If filteredVotersByParameter is provided, use it as base and apply search filter
            // Ensure each voter has boothInfo and normalized name field
            const normalizedVoters = filteredVotersByParameter.map((voter: any) => ({
                ...voter,
                firstMiddleNameEn: voter.firstMiddleNameEn || voter.name || "",
            }));
            
            if (search.length === 0) {
                return normalizedVoters;
            }
            
            return normalizedVoters.filter((voter: any) => {
                const name = voter.firstMiddleNameEn || voter.name || "";
                return name.toLowerCase().includes(search.toLowerCase());
            });
        }
        // Otherwise, filter from allVoters
        if (search.length === 0) {
            return allVoters;
        }
        return allVoters.filter((voter: any) => {
            const name = voter.firstMiddleNameEn || voter.name || "";
            return name.toLowerCase().includes(search.toLowerCase());
        });
    }, [allVoters, filteredVotersByParameter, search]);

    console.log(filteredVotersByParameter, "filteredVotersByParameter");
    console.log(filteredVoters, "filteredVoters");

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            onPress={() => (navigation as any).navigate("Voter Info", { voter: item, booth: item.boothInfo })}
            className="border border-black p-4 rounded-2xl mb-5"
        >
            <View className="flex-row justify-between mb-2">
                <Text className="font-bold text-lg text-black">{item.voterId}</Text>
                <Text className="font-bold text-lg text-black">{item.epicNo}</Text>
            </View>

            <View className="space-y-2">
                <View className="flex-row mb-2">
                    <Text className="text-black font-bold w-28">Name</Text>
                    <Text className="text-black font-semibold flex-1">
                        : {(item.firstMiddleNameEn || item.name || "").toUpperCase()}
                    </Text>
                </View>

                <View className="flex-row mb-2">
                    <Text className="text-black font-bold w-28">Father</Text>
                    <Text className="text-black font-semibold flex-1">
                        : {item.relationFirstMiddleNameEn?.toUpperCase() || ""}
                    </Text>
                </View>

                <View className="flex-row mb-2">
                    <Text className="text-black font-bold w-28">House No.</Text>
                    <Text className="text-black font-semibold flex-1">: {item.houseNoEn || ""}</Text>
                </View>

                <View className="flex-row mb-2">
                    <Text className="text-black font-bold w-28">Age</Text>
                    <Text className="text-black font-semibold flex-1">: {item.age || ""}</Text>
                </View>

                <View className="flex-row mb-2">
                    <Text className="text-black font-bold w-28">Sex</Text>
                    <Text className="text-black font-semibold flex-1">: {item.gender || ""}</Text>
                </View>

                <View className="flex-row mb-2">
                    <Text className="text-black font-bold w-28">Booth</Text>
                    <Text className="text-black font-semibold flex-1">
                        : {item.boothInfo?.boothId} - {item.boothInfo?.boothNameEn}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View className={`flex-1 ${bgColors.gray100} px-4 pt-4`}>

            <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-black"
                placeholder={`Search`}
                placeholderTextColor="#999"
                value={search}
                onChangeText={setSearch}
            />
            {booth && booth.voters && !filteredVotersByParameter ? (
                <View
                    className={` border ${bgColors.white} rounded-2xl mb-3 p-3 shadow-sm`}
                >
                    {/* Booth Title */}
                    <Text className="text-base font-semibold text-black">
                        {booth.boothId}
                        {booth.boothNameEn ? ` - ${booth.boothNameEn}` : ''}
                        {booth.boothNameEn || booth.boothNameLocal ? '.' : ''}
                    </Text>
                    <View className="flex-row flex-wrap items-center mt-1">
                        <Text className="text-sm text-gray-800 mr-1">Total Voters:</Text>
                        <Text className="font-bold text-black mr-3">{booth.voters.length}</Text>
                        <Text className="text-sm text-gray-800 mr-1">Male:</Text>
                        <Text className="font-bold text-black mr-3">
                            {booth.voters.filter((v: any) => v.gender === 'M').length}
                        </Text>
                        <Text className="text-sm text-gray-800 mr-1">Female:</Text>
                        <Text className="font-bold text-black">
                            {booth.voters.filter((v: any) => v.gender === 'F').length}
                        </Text>
                    </View>
                </View>
            ) : (
                <View
                    className={` border ${bgColors.white} rounded-2xl mb-3 p-3 shadow-sm`}
                >
                    <View className="flex-row flex-wrap items-center mt-1">
                        <Text className="text-sm text-gray-800 mr-1">Total Voters:</Text>
                        <Text className="font-bold text-black mr-3">{filteredVoters?.length || 0}</Text>
                        <Text className="text-sm text-gray-800 mr-1">Male:</Text>
                        <Text className="font-bold text-black mr-3">
                            {filteredVoters?.filter((v: any) => v.gender === 'M').length || 0}
                        </Text>
                        <Text className="text-sm text-gray-800 mr-1">Female:</Text>
                        <Text className="font-bold text-black">
                            {filteredVoters?.filter((v: any) => v.gender === 'F').length || 0}
                        </Text>
                    </View>
                </View>
            )}
            <FlatList
                data={filteredVoters || []}
                keyExtractor={(item) => item.voterId?.toString() || Math.random().toString()}
                renderItem={renderItem}
                ListEmptyComponent={
                    <Text className="text-center text-gray-400 mt-10">
                        No voters found
                    </Text>
                }
            />
        </View>);
};

export default ListVoter;
