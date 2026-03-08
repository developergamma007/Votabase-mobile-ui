import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { bgColors } from "../../constants/colors";
import LinearGradient from "react-native-linear-gradient";

export default function SearchVoter() {
    const navigation = useNavigation();

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

    /* -------------------- LOAD WARDS -------------------- */
    useEffect(() => {
        const loadWards = async () => {
            const assemblyData = await AsyncStorage.getItem("assemblyData");
            const parsed = JSON.parse(assemblyData || "{}");
            const wards = parsed?.assembly?.wards || [];

            setWardItems(
                wards.map((w) => ({
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
        const assemblyData = await AsyncStorage.getItem("assemblyData");
        const parsed = JSON.parse(assemblyData || "{}");

        const allBooths =
            parsed?.assembly?.wards?.flatMap((ward) =>
                ward.booths.map((booth) => ({
                    ...booth,
                    wardId: ward.wardId,
                    wardNameEn: ward.wardNameEn,
                }))
            ) || [];

        const allVoters = allBooths.flatMap((b) =>
            (b?.voters || []).map((v) => ({
                ...v,
                boothInfo: {
                    boothId: b.boothId,
                    boothNameEn: b.boothNameEn,
                },
                wardId: b.wardId,
                wardNameEn: b.wardNameEn,
            }))
        );

        const searchText = form.searchQuery?.toLowerCase().trim();

        const filteredVoters = allVoters.filter((v) => {
            const globalMatch =
                !searchText ||
                `${v.firstMiddleNameEn || ""} ${v.lastNameEn || ""}`.toLowerCase().includes(searchText) ||
                v.epicNo?.toLowerCase().includes(searchText) ||
                v.mobile?.toString().includes(searchText) ||
                v.voterId?.toString().includes(searchText) ||
                v.boothInfo?.boothId?.toString().includes(searchText) ||
                `${v.relationFirstMiddleNameEn || ""} ${v.relationLastNameEn || ""}`
                    .toLowerCase()
                    .includes(searchText);

            const wardMatch = !form.wards || v.wardId === form.wards;
            const boothMatch = !form.boothNumber || v.boothInfo?.boothId?.toString().includes(form.boothNumber);
            const mobileMatch = !form.mobileNumber || v.mobile?.toString().includes(form.mobileNumber);
            const houseMatch = !form.houseNumber || v.houseNoEn?.toString().includes(form.houseNumber);
            const epicMatch = !form.epicId || v.epicNo?.toLowerCase().includes(form.epicId.toLowerCase());
            const relationMatch =
                !form.relationName ||
                `${v.relationFirstMiddleNameEn || ""} ${v.relationLastNameEn || ""}`
                    .toLowerCase()
                    .includes(form.relationName.toLowerCase());

            return (
                globalMatch &&
                wardMatch &&
                boothMatch &&
                mobileMatch &&
                houseMatch &&
                epicMatch &&
                relationMatch
            );
        });

        navigation.navigate("Voter List", {
            booth: allBooths,
            filteredVotersByParameter: filteredVoters,
        });
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
                        className={`flex-1 ${bgColors.blue600} rounded-lg py-3 items-center`}
                    >
                        <Text className="text-white font-semibold">Search</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </LinearGradient>
    );
}
