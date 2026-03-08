import { View, Text, TextInput, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { bgColors } from "../../constants/colors";
import { CRUDAPI } from "../../apis/Api";

export default function Families() {
    const route = useRoute();
    const { boothId } = route.params || {};
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [tab, setTab] = useState("all");
    const [familiesList, setFamiliesList] = useState<any[]>([]);
    const [associationsData, setAssociationsData] = useState<any>(null);

    // Pagination states
    const [page, setPage] = useState(0);
    const [size] = useState(10);
    // const [boothId] = useState(39);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const navigation = useNavigation();

    // Debounce search effect
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);
        return () => clearTimeout(handler);
    }, [search]);

    const getAssociationName = (associationId: any) => {
        if (!associationsData?.data?.result || !associationId) return null;
        const association = associationsData.data.result.find(
            (assoc: any) => assoc.associationId === associationId
        );
        return association?.associationName || null;
    };

    const fetchFamilies = async (pageNum: number, isRefresh: boolean = false) => {
        const hasAssociation = tab === "has" ? true :
            tab === "no" ? false : "";

        try {
            if (pageNum === 0 && !isRefresh) setLoading(true);
            if (pageNum > 0) setLoadingMore(true);

            const response = await CRUDAPI.fetchFamilies(hasAssociation, pageNum, size, boothId);
            const newData = response?.content ?? [];

            if (pageNum === 0) {
                setFamiliesList(newData);
            } else {
                setFamiliesList(prev => [...prev, ...newData]);
            }

            setTotalPages(response?.totalPages ?? 1);

        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    };

    // Filter families list based on search
    const filteredFamilies = debouncedSearch
        ? familiesList.filter((f: any) =>
            f.familyName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            f.familyAddress?.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
        : familiesList;

    const fetchAssociations = async () => {
        try {
            const response = await CRUDAPI.fetchAssociations(boothId);
            setAssociationsData(response)
        } catch (error) {
            console.log(error);
        }
    };

    // Load more when reaching bottom
    const loadMore = () => {
        if (!loadingMore && page + 1 < totalPages) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchFamilies(nextPage);
        }
    };

    // Pull-to-refresh
    const onRefresh = () => {
        setRefreshing(true);
        setPage(0);
        fetchFamilies(0, true);
    };

    // Initial + triggered fetch
    useEffect(() => {
        setPage(0);
        fetchFamilies(0, true);
    }, [tab, debouncedSearch]);

    useEffect(() => {
        fetchAssociations();
    }, []);

    return (
        <View className={`flex-1 ${bgColors.white} px-4`}>
            <View className={`${bgColors.gray100} rounded-2xl px-4 py-3 mb-6 mt-6`}>
                <TextInput
                    placeholder="Search family or address..."
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={setSearch}
                    className="text-base"
                />
            </View>
            {/* Tabs */}
            <View className="flex-row mb-3">
                <TouchableOpacity
                    className={`px-4 py-2 rounded-xl mr-2 ${tab === "all" ? bgColors.blue600 : bgColors.gray100
                        }`}
                    onPress={() => setTab("all")}
                >
                    <Text className={`${tab === "all" ? "text-white" : "text-gray-600"}`}>
                        All
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className={`px-4 py-2 rounded-xl mr-2 ${tab === "has" ? bgColors.blue600 : bgColors.gray100
                        }`}
                    onPress={() => setTab("has")}
                >
                    <Text className={`${tab === "has" ? "text-white" : "text-gray-600"}`}>
                        Has Association
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`px-4 py-2 rounded-xl ${tab === "no" ? bgColors.blue600 : bgColors.gray100
                        }`}
                    onPress={() => setTab("no")}
                >
                    <Text className={`${tab === "no" ? "text-white" : "text-gray-600"}`}>
                        No Association
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Family List */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                onScroll={({ nativeEvent }) => {
                    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                    const isBottomReached =
                        layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
                    if (isBottomReached) loadMore();
                }}
                scrollEventThrottle={400}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Loading */}
                {loading && (
                    <View className="items-center py-10">
                        <ActivityIndicator size="large" />
                    </View>
                )}

                {/* Family List */}
                {filteredFamilies.length > 0 &&
                    filteredFamilies.map((item: any) => (
                        <TouchableOpacity
                            key={item?.familyId?.toString()}
                            className={`${bgColors.white} p-4 rounded-2xl shadow-sm mb-3`}
                            onPress={() => (navigation as any).navigate("voterFamilyDetails", { family: item, associationName: getAssociationName(item.associationId), boothId:boothId })}
                        >
                            <View className="flex-row justify-between items-center">
                                <Text className="text-base font-semibold">{item.familyName}</Text>
                                <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
                            </View>

                            {/* Badge + Association */}
                            {item.associationId && getAssociationName(item.associationId) && (
                                <View className="flex-row items-center mt-2">
                                    <Text className={`${bgColors.blue600} text-white px-3 py-1 rounded-lg mr-2`}>{getAssociationName(item.associationId)}</Text>
                                </View>
                            )}

                            <Text className="text-gray-500 mt-2">{item.familyAddress}</Text>
                        </TouchableOpacity>
                    ))
                }

                {/* Loading More Spinner */}
                {loadingMore && (
                    <View className="items-center py-6">
                        <ActivityIndicator size="small" />
                    </View>
                )}

                {/* Empty State */}
                {!loading && filteredFamilies.length === 0 && (
                    <Text className="text-center text-gray-500 mt-6">
                        No families found.
                    </Text>
                )}
            </ScrollView>

            {/* Floating Add Button */}
            <TouchableOpacity className={`absolute bottom-6 right-6 ${bgColors.blue600} w-16 h-16 rounded-full flex items-center justify-center shadow-lg`}
                onPress={() => navigation.navigate("addFamilyDetails", {boothId : boothId})}>
                <Ionicons name="add" size={28} color="white" />
            </TouchableOpacity>
        </View>
    );
}
