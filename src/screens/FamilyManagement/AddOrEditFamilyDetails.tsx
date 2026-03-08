import React, { useState, useEffect, useContext } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import DropDownPicker from "react-native-dropdown-picker";
import { bgColors } from "../../constants/colors";
import { CRUDAPI } from "../../apis/Api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../context/AuthContext";
import { GetCurrentLocation } from "../../components/GetCurrentLocation";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function AddFamilyDetails() {
    const route = useRoute();
    const navigation = useNavigation();
    const { setBanner } = useContext(AuthContext);
    const { boothId, family } = (route.params as any) || {};
    function NewFamilyForm() {
        const [familyName, setFamilyName] = useState(family?.familyName);
        const [address, setAddress] = useState(family?.familyAddress);
        const [economicStatus, setEconomicStatus] = useState(family?.economicStatus);
        const [headId, setHeadId] = useState(family?.headMemberId);
        const [phone, setPhone] = useState(family?.phone);
        const [familyPoints, setFamilyPoints] = useState(family?.points);
        const [pointsProvided, setPointsProvided] = useState(family?.pointsProvided);
        const [associationId, setAssociationId] = useState(family?.associationId);
        const [familyNature, setFamilyNature] = useState(family?.familyNature);
        const [members, setMembers] = useState(family?.members || []);
        const [location, setLocation] = useState({});
        const [searchQuery, setSearchQuery] = useState("");
        const [searchError, setSearchError] = useState("");
        // Dropdown states
        const [openAssociation, setOpenAssociation] = useState(false);
        const [openFamilyNature, setOpenFamilyNature] = useState(false);
        const [openEconomicStatus, setOpenEconomicStatus] = useState(false);
        const [associationsData, setAssociationsData] = useState<any>(null);
        const [associationItems, setAssociationItems] = useState<any[]>([]);
        const [votersInSelectedBooth, setVotersInSelectedBooth] = useState<any[]>([]);

        // Family Nature options
        const familyNatureItems = [
            { label: "A", value: "A" },
            { label: "B", value: "B" },
            { label: "C", value: "C" },
            { label: "NA", value: "NA" },
        ];

        // Economic Status options (example - adjust as needed)
        const economicStatusItems = [
            { label: "Upper Middle Class", value: "Upper Middle Class" },
            { label: "Middle Class", value: "Middle Class" },
            { label: "Lower Middle Class", value: "Lower Middle Class" },
            { label: "Lower Class", value: "Lower Class" },
            { label: "NA", value: "NA" },
        ];

        // Fetch associations
        useEffect(() => {
            const fetchAssociations = async () => {
                try {
                    const response = await CRUDAPI.fetchAssociations(boothId);
                    setAssociationsData(response);
                    if (response?.data?.result) {
                        const items = response.data.result.map((assoc: any) => ({
                            label: assoc.associationName || `Association ${assoc.associationId}`,
                            value: assoc.associationId,
                        }));
                        setAssociationItems(items);
                    }
                } catch (error) {
                    console.log("Error fetching associations:", error);
                }
            };
            const fetchVotersList = async () => {
                const assemblyData = await AsyncStorage.getItem("assemblyData");
                const parsed = JSON.parse(assemblyData);
                // 🗳️ Get all booths
                const allBooths =
                    parsed?.assembly?.wards?.flatMap((ward) =>
                        ward.booths.map((booth) => ({
                            ...booth,
                            wardId: ward.wardId,
                            wardNameEn: ward.wardNameEn,
                            wardNameLocal: ward.wardNameLocal,
                        }))
                    ) || [];

                // 🧠 Combine all voters across booths
                const allVotersInSelectedBooth = allBooths.flatMap((b) =>
                    (b?.voters || []).map((v) => ({
                        ...v,
                        boothInfo: {
                            boothId: b.boothId,
                            boothNameEn: b.boothNameEn,
                            boothNameLocal: b.boothNameLocal,
                        },
                    }))?.filter(voter => voter.boothInfo.boothId == boothId)
                );
                setVotersInSelectedBooth(allVotersInSelectedBooth)
            }

            fetchAssociations();
            fetchVotersList();
            if (family?.latitude) {
                setLocation({ latitude: family.latitude, longitude: family.longitude })
            }
        }, [boothId]);

        // Computed values for headEpicNo and memberEpicNos
        const headEpicNo = headId ? members.find(m => m.memberId === headId)?.epicNo : "";
        const memberEpicNos = members.map(m => m.epicNo).filter(Boolean);

        function addMember() {
            if (!searchQuery.trim()) return;
            const normalizedQuery = searchQuery.trim().toLowerCase();
            const matchedVoter = votersInSelectedBooth.find(
                (v) => v.epicNo?.toLowerCase() === normalizedQuery);
            if (!matchedVoter) {
                Alert.alert(
                    "Voter Not Found",
                    "Entered EPIC number does not exist in this booth."
                );
                return;
            }
            const newMem = {
                memberId: Date.now().toString(),
                voterName: `${matchedVoter.firstMiddleNameEn} ${matchedVoter.lastNameEn}`.trim(),
                epicNo: matchedVoter.epicNo,
            };
            setMembers((prev) => {
                const alreadyExists = prev.some(
                    (m) => m.epicNo === newMem.epicNo
                );
                if (alreadyExists) {
                    Alert.alert(
                        "Duplicate Entry",
                        "This EPIC number is already added."
                    );
                    return prev;
                }
                return [...prev, newMem]; // ✅ Add only if unique
            });
            if (!headId) setHeadId(newMem.memberId);
            setSearchQuery("");
        }

        function removeMember(id: string) {
            setMembers((prev) => prev.filter((m) => m.id !== id));
            if (id === headId) setHeadId("");
        }

        const handleUpdate = async (reqJson) => {
            const hasEmptyRequiredField = (data) => {
                const { associationId, ...rest } = data;
                return Object.values(rest).some(
                    (value) =>
                        value === undefined ||
                        value === null ||
                        value.toString().trim() === ""
                );
            };
            if (hasEmptyRequiredField(reqJson)) {
                Alert.alert(
                    "Incomplete Details",
                    "Please fill all required fields before submitting."
                );
                return; // ⛔ Stop API call
            }
            try {
                let response
                if (family) {
                    response = await CRUDAPI.updateFamily(family.familyId, reqJson);
                } else {
                    response = await CRUDAPI.createFamily(reqJson);
                }
                if (response?.success) {
                    setBanner({ type: "success", message: "Updated family details successfully" });
                    navigation.navigate("families", { boothId: boothId })
                }
                // success handling
            } catch (error) {
                setBanner({ type: "error", message: "Failed to update family details" });
            }
        };

        const fetchLocation = async () => {
            const location = await GetCurrentLocation();
            setLocation(location)
        };

        return (
            <View className={`${bgColors.white} border border-slate-200 p-4 rounded-2xl shadow-sm mt-6`}>
                <Text className="text-[18px] font-semibold text-slate-800 mb-3">
                    New Family
                </Text>

                <View className="space-y-3">

                    {/* Family Name */}
                    <InputField
                        label="Enter family name"
                        value={familyName}
                        setValue={setFamilyName}
                        placeholder="Family name"
                        className="text-16"
                    />

                    {/* Address */}
                    <InputField
                        label="Family Address"
                        value={address}
                        setValue={setAddress}
                        placeholder="Family Address"
                    />

                    {/* Members */}
                    <View className={`border border-slate-100 rounded-2xl ${bgColors.slate50}/80 p-3`}>
                        <Text className="text-[14px] font-semibold text-slate-700 mb-2">
                            Family Members
                        </Text>

                        {/* Search */}
                        <View className="flex-row gap-2 mb-2">
                            <TextInput
                                className={`flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[14px] ${bgColors.white}`}
                                placeholder="Search voter to add"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            <TouchableOpacity
                                onPress={addMember}
                                className={`${bgColors.customBlue} px-3 py-2 rounded-lg justify-center`}
                            >
                                <Text className="text-white text-[14px]">Add</Text>
                            </TouchableOpacity>
                        </View>

                        {searchError ? (
                            <Text className="text-[14px] text-red-500">{searchError}</Text>
                        ) : null}

                        {/* Members List (Card view) */}
                        <View className="space-y-2">
                            {members.length === 0 ? (
                                <Text className="text-[14px] text-slate-400 text-center">
                                    No family members yet
                                </Text>
                            ) : members.map((m) => (
                                <View
                                    key={m.epicNo}
                                    className={`${bgColors.white} border border-slate-200 rounded-xl px-3 py-2 mt-2`}
                                >
                                    <Text className="text-[14px] font-semibold text-slate-700 mt-2">{m.voterName}</Text>
                                    <Text className="text-[14px] text-slate-500 mt-2">EPIC: {m.epicNo}</Text>
                                    <TouchableOpacity
                                        onPress={() => removeMember(m.id)}
                                        className="mt-1"
                                    >
                                        <Text className="text-[14px] text-red-500">Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View>
                        <Text className="text-[14px] text-slate-600 mb-1 mt-6 mb-4">Head of Family</Text>

                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 16 }}>
                            {members.length > 0 ? (
                                members.map((m) => (
                                    <TouchableOpacity
                                        key={m.memberId}
                                        onPress={() => setHeadId(m.memberId)}
                                        className={`px-3 py-2 rounded-lg border ${headId === m.memberId
                                            ? `${bgColors.blue600} border-blue-600`
                                            : `border-slate-300 ${bgColors.white}`
                                            }`}
                                    >
                                        <Text className={`${headId === m.memberId ? "text-white" : "text-slate-600"} text-[14px]`}>
                                            {m.voterName}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text className="text-[14px] text-slate-400">
                                    No members added yet
                                </Text>
                            )}
                        </View>
                        <Text className="text-[14px] text-slate-400 mt-1 mb-6">
                            Head of family must be from the added members list.
                        </Text>
                    </View>

                    {/* Phone */}
                    <InputField
                        label="Family Head Phone Number"
                        keyboardType="number-pad"
                        value={phone}
                        setValue={setPhone}
                        placeholder="Phone"
                    />

                    {/* Points */}
                    <InputField
                        label="Points to the family"
                        keyboardType="number-pad"
                        value={familyPoints?.toString()}
                        setValue={setFamilyPoints}
                        placeholder="Points"
                    />

                    {/* Points Provided */}
                    <InputField
                        label="Points Provided"
                        keyboardType="number-pad"
                        value={pointsProvided?.toString()}
                        setValue={setPointsProvided}
                        placeholder="Points Provided"
                    />

                    {/* Economic Status */}
                    <View className="mb-5" >
                        <Text className="text-[14px] text-slate-600 mb-1">Economic Status</Text>
                        <DropDownPicker
                            open={openEconomicStatus}
                            value={economicStatus}
                            items={economicStatusItems}
                            setOpen={setOpenEconomicStatus}
                            setValue={setEconomicStatus}
                            placeholder="Select Economic status"
                            onOpen={() => {
                                setOpenAssociation(false);
                                setOpenFamilyNature(false);
                            }}
                            style={{
                                borderColor: "#cbd5e1",
                                backgroundColor: "#ffffff",
                            }}
                            dropDownContainerStyle={{
                                borderColor: "#cbd5e1",
                                backgroundColor: bgColors.blue500_1,
                            }}
                            listMode="SCROLLVIEW"
                            scrollViewProps={{
                                nestedScrollEnabled: true,
                            }}
                            placeholderStyle={{
                                color: "#94a3b8",
                                fontSize: 14
                            }}
                            textStyle={{
                                color: "#000000",  // Black color for selected value (OUTSIDE)
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
                        />
                    </View>

                    {/* Family Nature */}
                    <View className="mb-5">
                        <Text className="text-[14px] text-slate-600 mb-1">Family Nature</Text>
                        <DropDownPicker
                            open={openFamilyNature}
                            value={familyNature}
                            items={familyNatureItems}
                            placeholder="Select Family nature"
                            setOpen={setOpenFamilyNature}
                            setValue={setFamilyNature}
                            onOpen={() => {
                                setOpenAssociation(false);
                                setOpenEconomicStatus(false);
                            }}
                            style={{
                                borderColor: "#cbd5e1",
                                backgroundColor: "#ffffff",
                            }}
                            dropDownContainerStyle={{
                                borderColor: "#cbd5e1",
                                backgroundColor: bgColors.blue500_1,
                            }}
                            listMode="SCROLLVIEW"
                            scrollViewProps={{
                                nestedScrollEnabled: true,
                            }}
                            placeholderStyle={{
                                color: "#94a3b8",
                                fontSize: 14
                            }}
                            textStyle={{
                                color: "#000000",  // Black color for selected value (OUTSIDE)
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
                            zIndex={1000}
                        />
                    </View>

                    {/* Association */}
                    <View className="mb-5">
                        <Text className="text-[14px] text-slate-600 mb-1">Association (Optional)</Text>
                        <DropDownPicker
                            open={openAssociation}
                            value={associationId}
                            items={associationItems}
                            setOpen={setOpenAssociation}
                            setValue={setAssociationId}
                            placeholder="Select Association"
                            onOpen={() => {
                                setOpenFamilyNature(false);
                                setOpenEconomicStatus(false);
                            }}
                            style={{
                                borderColor: "#cbd5e1",
                                backgroundColor: "#ffffff",
                            }}
                            dropDownContainerStyle={{
                                borderColor: "#cbd5e1",
                                backgroundColor: bgColors.blue500_1,
                            }}
                            placeholderStyle={{
                                color: "#94a3b8",
                                fontSize: 14
                            }}
                            textStyle={{
                                color: "#000000",  // Black color for selected value (OUTSIDE)
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
                            listMode="SCROLLVIEW"
                            scrollViewProps={{
                                nestedScrollEnabled: true,
                            }}
                            zIndex={500}
                        />
                    </View>
                    <TouchableOpacity
                        className={`flex-row justify-center items-center py-3 rounded-full ${Object.keys(location).length != 0 ? bgColors.green600 : bgColors.customBlue}`}
                        onPress={fetchLocation}
                    >
                        <Ionicons
                            name={Object.keys(location).length != 0 ? "checkmark-circle-outline" : "location-outline"}
                            size={20}
                            color="white"
                        />
                        <Text className="text-white text-base font-semibold ml-2">
                            {Object.keys(location).length != 0 ? "Location Fetched" : "Get Location"}
                        </Text>
                    </TouchableOpacity>


                </View>
                <View className="flex-row justify-between mt-6">
                    <TouchableOpacity className={`${bgColors.transparent} py-3 px-4 rounded-xl border border-black flex-1 mr-2`}>
                        <Text className="text-center text-[14px] font-semibold text-black">
                            Preview Screen
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`${bgColors.emerald600} py-3 px-4 rounded-xl flex-1 ml-2`}
                        onPress={() => {
                            // Prepare the final data object with all required fields
                            const familyData = {
                                familyName,
                                familyAddress: address,
                                phone,
                                points: (familyPoints) || 0,
                                pointsProvided: parseInt(pointsProvided) || 0,
                                headEpicNo,
                                memberEpicNos,
                                associationId: associationId || null,
                                economicStatus,
                                familyNature,
                                boothId: boothId || null,
                                latitude: location && location?.latitude,
                                longitude: location && location?.longitude,
                            };
                            handleUpdate(familyData)
                            // TODO: Call API to submit familyData
                        }}
                    >
                        <Text className="text-center text-[14px] font-semibold text-white">
                            Update
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    function InputField({ label, value, setValue, placeholder }: any) {
        return (
            <View>
                <Text className="text-[14px] text-slate-600 mb-1">{label}</Text>
                <TextInput
                    className={`w-full rounded-lg border h-12 border-slate-200 px-3 py-2 text-[14px] ${bgColors.white} mb-5 mt-2`}
                    placeholder={placeholder}
                    value={value}
                    onChangeText={setValue}
                />
            </View>
        );
    }

    return (
        <View className={`flex-1 ${bgColors.slate50}`}>
            <ScrollView
                className="px-3"
                showsVerticalScrollIndicator={true}
            >
                <NewFamilyForm />
            </ScrollView>
        </View>
    );
}