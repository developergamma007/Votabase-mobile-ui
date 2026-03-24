import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { bgColors } from "../../constants/colors";
import LinearGradient from "react-native-linear-gradient";
import { CRUDAPI } from "../../apis/Api";

export default function SearchVoter() {
    const navigation = useNavigation();
    const BOOTH_CACHE_KEY = "boothSnapshotLite";

    /* -------------------- STATES -------------------- */
    const [showMoreFilters, setShowMoreFilters] = useState(false);

    const [form, setForm] = useState({
        searchQuery: "",
        wards: "",
        name: "",
        epicId: "",
        boothNumber: "",
        mobileNumber: "",
        relationName: "",
        houseNumber: "",
    });

    const [openWard, setOpenWard] = useState(false);
    const [wardItems, setWardItems] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [errorText, setErrorText] = useState("");

    /* -------------------- LOAD WARDS -------------------- */
    useEffect(() => {
        const loadWards = async () => {
            const liteData = await AsyncStorage.getItem(BOOTH_CACHE_KEY);
            const fallbackData = await AsyncStorage.getItem("assemblyData");
            const parsed = JSON.parse(liteData || fallbackData || "{}");
            const wards = parsed?.assembly?.wards || [];
            const seen = new Set<string>();
            const uniqueWards = wards.filter((w) => {
                const id = w?.wardId != null ? String(w.wardId) : "";
                if (!id || seen.has(id)) return false;
                seen.add(id);
                return true;
            });

            setWardItems(
                uniqueWards.map((w) => ({
                    label: w.wardNameEn || `Ward ${w.wardId}`,
                    value: w.wardId,
                }))
            );
        };

        loadWards();
    }, []);

    /* -------------------- HANDLERS -------------------- */
    const handleChange = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        setForm({
            searchQuery: "",
            wards: "",
            name: "",
            epicId: "",
            boothNumber: "",
            mobileNumber: "",
            relationName: "",
            houseNumber: "",
        });
    };
    const handleSearch = async () => {
        setSearching(true);
        setErrorText("");
        try {
            const response = await CRUDAPI.searchVoters({
                assemblyCode: "000000000175",
                searchQuery: form.searchQuery,
                wardId: form.wards || undefined,
                boothNumber: form.boothNumber,
                mobileNumber: form.mobileNumber,
                epicId: form.epicId,
                relationName: form.relationName,
                houseNumber: form.houseNumber,
                page: 0,
                size: 50,
            });

            const filteredVoters = response?.data?.result || [];
            const searchMeta = response?.data?.meta || null;
            navigation.navigate("Voter List", {
                booth: [],
                filteredVotersByParameter: filteredVoters,
                searchMeta,
                searchRequest: {
                    assemblyCode: "000000000175",
                    searchQuery: form.searchQuery,
                    wardId: form.wards || undefined,
                    boothNumber: form.boothNumber,
                    mobileNumber: form.mobileNumber,
                    epicId: form.epicId,
                    relationName: form.relationName,
                    houseNumber: form.houseNumber,
                    size: 50,
                },
            });
        } catch (error) {
            const status = error?.response?.status;
            const detail =
                error?.response?.data?.detail ||
                error?.response?.data?.message ||
                error?.message ||
                "Unknown error";
            console.log("Search voter failed:", status, detail, error?.response?.data);
            setErrorText(`Search failed (${status || "network"}): ${detail}`);
        } finally {
            setSearching(false);
        }
    };


    /* -------------------- UI -------------------- */
    return (
        <LinearGradient
            colors={["#0C7BB3", "#0796A1"]}
            style={{ flex: 1 }}
            className="flex-1"
        >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="px-5 mt-5">

                {/* 🔍 MAIN SEARCH */}
                <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-white "
                    placeholder="Name / EPIC / Mobile / Serial"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    selectionColor="#ffffff"
                    value={form.searchQuery}
                    onChangeText={(text) => handleChange("searchQuery", text)}
                />


                {/* 🔽 MORE FILTERS SECTION */}
                {showMoreFilters && (
                    <>
                        {/* 🏛️ Ward Dropdown */}
                        <View style={{ zIndex: 3000, marginBottom: 16 }}>
                            <DropDownPicker
                                open={openWard}
                                listMode="SCROLLVIEW"
                                value={form.wards}
                                items={wardItems}
                                setOpen={setOpenWard}
                                setValue={(cb) => handleChange("wards", cb(form.wards))}
                                placeholder="Assembly / Ward / Booth"
                                style={{
                                    borderColor: "#cbd5e1",
                                    backgroundColor: "transparent",
                                }}
                                dropDownContainerStyle={{
                                    borderColor: "#cbd5e1",
                                    backgroundColor: bgColors.blue500_1,
                                }}
                                placeholderStyle={{
                                    color: "#rgba(255, 255, 255, 0.6)",
                                    fontSize: 14
                                }}
                                textStyle={{
                                    color: "#fff",  // Black color for selected value (OUTSIDE)
                                    fontSize: 14
                                }}
                                listItemContainerStyle={{
                                    backgroundColor: bgColors.blue500_1,
                                }}
                                listItemLabelStyle={{
                                    color: "#ffffff",  // White color for dropdown items (INSIDE)
                                    fontSize: 14
                                }}
                                selectedItemContainerStyle={{
                                    backgroundColor: bgColors.blue600 || "#2563eb",
                                }}
                                selectedItemLabelStyle={{
                                    color: "#ffffff",  // White color for selected item in dropdown (INSIDE)
                                    fontWeight: "bold",
                                }}
                                arrowIconStyle={{
                                    tintColor: "#FFFFFF",
                                }}
                                listMode="SCROLLVIEW"
                                scrollViewProps={{
                                    nestedScrollEnabled: true,
                                }}
                                zIndex={500}
                            />
                        </View>

                        <TextInput
                            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-white"
                            placeholder="Booth Number"
                            placeholderTextColor="rgba(255, 255, 255, 0.6)"
                            selectionColor="#ffffff"
                            value={form.boothNumber}
                            onChangeText={(text) => handleChange("boothNumber", text)}
                        />

                        <TextInput
                            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-white"
                            placeholder="Mobile"
                            placeholderTextColor="rgba(255, 255, 255, 0.6)"
                            selectionColor="#ffffff"
                            keyboardType="numeric"
                            value={form.mobileNumber}
                            onChangeText={(text) => handleChange("mobileNumber", text)}
                        />

                        <TextInput
                            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-white"
                            placeholder="EPIC / Voter ID"
                            placeholderTextColor="rgba(255, 255, 255, 0.6)"
                            selectionColor="#ffffff"
                            value={form.epicId}
                            onChangeText={(text) => handleChange("epicId", text)}
                        />

                        <TextInput
                            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-white"
                            placeholder="Relation Name"
                            placeholderTextColor="rgba(255, 255, 255, 0.6)"
                            selectionColor="#ffffff"
                            value={form.relationName}
                            onChangeText={(text) => handleChange("relationName", text)}
                        />

                        <TextInput
                            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-white"
                            placeholder="House No"
                            placeholderTextColor="rgba(255, 255, 255, 0.6)"
                            selectionColor="#ffffff"
                            value={form.houseNumber}
                            onChangeText={(text) => handleChange("houseNumber", text)}
                        />
                    </>
                )}

                {/* ⚙️ ACTION BUTTONS */}
                <View className="flex-row justify-between mt-6 mb-10">
                    <TouchableOpacity
                        onPress={() => setShowMoreFilters(!showMoreFilters)}
                        className="flex-1 border border-[#fff] rounded-lg py-3 mr-2 items-center"
                    >
                        <Text className="text-[#fff] font-semibold">
                            {showMoreFilters ? "Hide Filters" : "More Filters"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleReset}
                        className="flex-1 border border-[#fff] rounded-lg py-3 mr-2 items-center"
                    >
                        <Text className="text-[#fff] font-semibold">Reset</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSearch}
                        disabled={searching}
                        className={`flex-1 ${bgColors.blue600} rounded-lg py-3 items-center`}
                    >
                        {searching ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text className="text-white font-semibold">Search</Text>
                        )}
                    </TouchableOpacity>
                </View>
                {!!errorText && (
                    <Text className="text-white text-center mb-6">{errorText}</Text>
                )}

            </ScrollView>
        </LinearGradient>
    );
}
