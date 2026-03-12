import React, { useState, useMemo, useEffect } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { bgColors } from "../../constants/colors";
import { CRUDAPI } from "../../apis/Api";

const ListVoter = () => {
    const route = useRoute();
    const navigation = useNavigation();

    // booth can be a single object or an array
    const { booth, filteredVotersByParameter, searchMeta, searchRequest } = (route.params as any) || {};

    const [search, setSearch] = useState("");
    const [serverRows, setServerRows] = useState<any[]>(Array.isArray(filteredVotersByParameter) ? filteredVotersByParameter : []);
    const [serverMeta, setServerMeta] = useState<any>(searchMeta || null);
    const [serverPage, setServerPage] = useState<number>(searchMeta?.page ?? 0);
    const [loadingMore, setLoadingMore] = useState(false);

    const isServerSearchMode = !!searchRequest && Array.isArray(filteredVotersByParameter);

    useEffect(() => {
        if (isServerSearchMode) {
            setServerRows(Array.isArray(filteredVotersByParameter) ? filteredVotersByParameter : []);
            setServerMeta(searchMeta || null);
            setServerPage(searchMeta?.page ?? 0);
        }
    }, [isServerSearchMode, filteredVotersByParameter, searchMeta]);

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
        if (isServerSearchMode) {
            const base = serverRows || [];
            if (search.length === 0) {
                return base;
            }
            return base.filter((voter: any) => {
                const name = voter.firstMiddleNameEn || voter.name || "";
                return name.toLowerCase().includes(search.toLowerCase());
            });
        }

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
    }, [allVoters, filteredVotersByParameter, search, isServerSearchMode, serverRows]);

    const loadMoreServerRows = async () => {
        if (!isServerSearchMode) return;
        if (loadingMore) return;
        if (!serverMeta?.hasMore) return;
        try {
            setLoadingMore(true);
            const nextPage = (serverPage || 0) + 1;
            const response = await CRUDAPI.searchVoters({
                ...(searchRequest || {}),
                page: nextPage,
                size: searchRequest?.size || 50,
            });
            const moreRows = response?.data?.result || [];
            const nextMeta = response?.data?.meta || null;
            setServerRows((prev) => [...prev, ...moreRows]);
            setServerMeta(nextMeta);
            setServerPage(nextPage);
        } catch (error) {
            console.log("Load more voters failed:", error?.message || error);
        } finally {
            setLoadingMore(false);
        }
    };

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
                        <Text className="font-bold text-black mr-3">{serverMeta?.total ?? searchMeta?.total ?? filteredVoters?.length ?? 0}</Text>
                        <Text className="text-sm text-gray-800 mr-1">Male:</Text>
                        <Text className="font-bold text-black mr-3">
                            {serverMeta?.male ?? searchMeta?.male ?? filteredVoters?.filter((v: any) => v.gender === 'M').length ?? 0}
                        </Text>
                        <Text className="text-sm text-gray-800 mr-1">Female:</Text>
                        <Text className="font-bold text-black">
                            {serverMeta?.female ?? searchMeta?.female ?? filteredVoters?.filter((v: any) => v.gender === 'F').length ?? 0}
                        </Text>
                    </View>
                    {!!(serverMeta || searchMeta) && (
                        <Text className="text-xs text-gray-500 mt-2">
                            Showing {(isServerSearchMode ? serverRows.length : (filteredVoters?.length ?? 0))} of {(serverMeta?.total ?? searchMeta?.total ?? 0)}
                        </Text>
                    )}
                </View>
            )}
            <FlatList
                data={filteredVoters || []}
                keyExtractor={(item) => item.voterId?.toString() || Math.random().toString()}
                renderItem={renderItem}
                onEndReachedThreshold={0.5}
                onEndReached={loadMoreServerRows}
                ListFooterComponent={
                    loadingMore ? (
                        <View className="py-4">
                            <ActivityIndicator size="small" />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <Text className="text-center text-gray-400 mt-10">
                        No voters found
                    </Text>
                }
            />
        </View>);
};

export default ListVoter;
