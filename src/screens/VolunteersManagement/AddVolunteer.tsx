import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import LinearGradient from "react-native-linear-gradient";
import { GetInitials } from "../../components/GetInitials";
import { launchImageLibrary } from "react-native-image-picker";
import { CRUDAPI } from "../../apis/Api";
import { AuthContext } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { bgColors } from "../../constants/colors";

export default function AddVolunteer() {
  const { setBanner } = useContext(AuthContext);
  const navigation = useNavigation();
  const ALL_WARDS_VALUE = "__ALL_WARDS__";
  const ALL_BOOTHS_VALUE = "__ALL_BOOTHS__";
  // 1. Single main useState object now including profilePicUrl
  const [formData, setFormData] = useState({
    firstName: "",
    phone: "",
    profilePicUrl: "",
    workingLevel: "ASSEMBLY",
    assemblyId: "",
    wardIds: [],
    boothIds: [],
  });

  // 2. State for controlling DropDownPicker visibility
  const [openWorkingLevel, setOpenWorkingLevel] = useState(false);
  const [openAssembly, setOpenAssembly] = useState(false);
  const [openWard, setOpenWard] = useState(false);
  const [openBooth, setOpenBooth] = useState(false);
  const [assemblies, setAssemblies] = useState([]);
  const [wards, setWards] = useState([]);
  const [booths, setBooths] = useState([]);

  // 3. Dropdown items (data) (Unchanged)
  const workingLevelItems = [
    { label: "Assembly", value: "ASSEMBLY" },
    { label: "Ward", value: "WARD" },
    { label: "Booth", value: "BOOTH" },
  ];

  // Helper function to update the main state
  const handleChange = (name, value) => {
    const nextValue =
      name === "phone" ? String(value || "").replace(/\D/g, "").slice(0, 10) : value;
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const fetchAssemblies = async () => {
    try {
      const res = await CRUDAPI.fetchVolunteerDropdown("ASSEMBLY");
      const formatted = (res || []).map((item) => ({
        label: item.name || `Assembly ${item.id}`,
        value: item.id,
      }));
      setAssemblies(formatted);
    } catch {
      setAssemblies([]);
    }
  };

  const fetchWards = async (assemblyId) => {
    try {
      if (!assemblyId) {
        setWards([]);
        return;
      }
      const res = await CRUDAPI.fetchWards(assemblyId);
      const formatted = (res || []).map((item) => ({
        label: item.wardNameEn || `Ward ${item.wardId}`,
        value: String(item.wardId),
      }));
      setWards(formatted);
    } catch {
      setWards([]);
    }
  };

  const fetchBooths = async (wardIds = []) => {
    try {
      if (!wardIds.length) {
        setBooths([]);
        return;
      }
      const responses = await Promise.all(wardIds.map((id) => CRUDAPI.fetchBooths(null, id)));
      const merged = responses.flat().map((item) => ({
        label: item.pollingStationAdrEn || `Booth ${item.boothId}`,
        value: String(item.boothId),
      }));
      const unique = Array.from(new Map(merged.map((item) => [String(item.value), item])).values());
      setBooths(unique);
    } catch {
      setBooths([]);
    }
  };

  useEffect(() => {
    fetchAssemblies();
  }, []);

  useEffect(() => {
    // Reset dependent selections when working level changes
    setFormData((prev) => ({
      ...prev,
      assemblyId: "",
      wardIds: [],
      boothIds: [],
    }));
    setWards([]);
    setBooths([]);
  }, [formData.workingLevel]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, wardIds: [], boothIds: [] }));
    fetchWards(formData.assemblyId);
  }, [formData.workingLevel, formData.assemblyId]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, boothIds: [] }));
    fetchBooths(formData.wardIds);
  }, [formData.workingLevel, formData.wardIds]);

  const allWardValues = wards.map((item) => String(item.value));
  const allBoothValues = booths.map((item) => String(item.value));
  const wardItems = [{ label: "All Wards", value: ALL_WARDS_VALUE }, ...wards];
  const boothItems = [{ label: "All Booths", value: ALL_BOOTHS_VALUE }, ...booths];
  const normalizeSelection = (values, allValue, allOptions) => {
    if (!Array.isArray(values)) return [];
    if (values.includes(allValue)) return allOptions;
    return values.filter((v) => v !== allValue);
  };
  const setWardIdsWithAll = (callback) => {
    setFormData((prev) => {
      const next = callback(prev.wardIds);
      return {
        ...prev,
        wardIds: normalizeSelection(next, ALL_WARDS_VALUE, allWardValues),
      };
    });
  };
  const setBoothIdsWithAll = (callback) => {
    setFormData((prev) => {
      const next = callback(prev.boothIds);
      return {
        ...prev,
        boothIds: normalizeSelection(next, ALL_BOOTHS_VALUE, allBoothValues),
      };
    });
  };

  const handleSubmit = async () => {
    if (!formData.firstName.trim()) {
      setBanner({ type: "error", message: "Please enter first name" });
      return;
    }
    if (!formData.phone || formData.phone.length !== 10) {
      setBanner({ type: "error", message: "Please enter a 10 digit phone number" });
      return;
    }
    if (!formData.assemblyId) {
      setBanner({ type: "error", message: "Please select an assembly" });
      return;
    }
    if (formData.workingLevel === "WARD" && (!formData.wardIds || !formData.wardIds.length)) {
      setBanner({ type: "error", message: "Please select at least one ward" });
      return;
    }
    if (formData.workingLevel === "BOOTH" && (!formData.boothIds || !formData.boothIds.length)) {
      setBanner({ type: "error", message: "Please select at least one booth" });
      return;
    }
    const dataToSend = {
      firstName: formData.firstName.trim(),
      phone: formData.phone.trim(),
      workingLevel: formData.workingLevel,
      assemblyIds: formData.assemblyId ? [Number(formData.assemblyId)] : [],
      wardIds: (formData.wardIds || []).map((id) => Number(id)),
      boothIds: (formData.boothIds || []).map((id) => Number(id)),
    };
    const res = await CRUDAPI.addVolunteer(dataToSend);
    if (res && res.success) {
      setBanner({ type: "success", message: "Added Volunteer successfully" });
      navigation.navigate("myVolunteers")
    } else {
      setBanner({ type: "error", message: "Failed while adding volunteer" });
    }
  };


  const pickVolunteerProfileImage = () => {
    launchImageLibrary(
      {
        mediaType: "photo",
        quality: 1,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.assets?.length > 0) {
          const img = response.assets[0];

          // If your API upload is needed, place here:
          // uploadProfilePic(img);

          handleChange("profilePicUrl", img.uri);
        }
      }
    );
  };

  return (
    <View className="flex-1">

      <LinearGradient
        colors={["#0C7BB3", "#0796A1"]}
        className="px-6"
        style={{ flex: 1 }}
      >
        <ScrollView
          className="py-6"
          showsVerticalScrollIndicator={false}
        >

          <View className={`${bgColors.white20} p-6 border border-white/30 rounded-xl`}>
            {/* Profile Image/Initials Block */}
            <View className="items-center mb-6">
              {/* Display image if URL is provided, otherwise show initials */}
              {formData.profilePicUrl ? (
                <Image
                  source={{ uri: formData.profilePicUrl }}
                  className="w-28 h-28 rounded-full"
                />
              ) : (
                <View className={`w-28 h-28 rounded-full ${bgColors.customLightBlue3} items-center justify-center`}>
                  <Text className="text-4xl font-semibold text-[#2E6F91]">
                    {GetInitials(formData.firstName)}
                  </Text>
                </View>
              )}
              <TouchableOpacity onPress={pickVolunteerProfileImage}>
                <Text className="text-white mt-3 underline">
                  Change Photo
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-white font-semibold mb-1 text-lg">First Name</Text>
            <TextInput
              placeholder="First Name"
              placeholderTextColor="#fff"
              value={formData.firstName}
              onChangeText={(t) => handleChange("firstName", t)}
              className={`${bgColors.white20} text-white px-4 py-3 rounded-xl mb-6 text-lg`}
            />
            <Text className="text-white font-semibold mb-1 text-lg">Phone</Text>
            <TextInput
              placeholder="Phone"
              placeholderTextColor="#fff"
              keyboardType="numeric"
              value={formData.phone}
              onChangeText={(t) => handleChange("phone", t)}
              className={`${bgColors.white20} text-white px-4 py-3 rounded-xl mb-6 text-lg`}
            />
            {/* Working Level (using DropDownPicker) */}
            <Text className="text-white font-semibold mb-1 text-lg">
              Working Level
            </Text>
            <View >

              <DropDownPicker
                open={openWorkingLevel}
                value={formData.workingLevel}
                items={workingLevelItems}
                setOpen={setOpenWorkingLevel}
                setValue={(callback) => handleChange("workingLevel", callback(formData.workingLevel))}
                style={{
                  backgroundColor: "#E3EDF3",
                  borderColor: "#000",
                  borderRadius: 10,
                  minHeight: 48,
                }}
                dropDownContainerStyle={{
                  borderColor: "#000",
                  maxHeight: 200,
                }}
                selectedItemContainerStyle={{
                  backgroundColor: bgColors.blue500_1,
                }}
                selectedItemLabelStyle={{
                  color: "#FFFFFF",
                  fontWeight: 600,
                }}
                textStyle={{
                  color: "#000",
                  fontSize: 14,
                }}
                placeholderStyle={{
                  color: "#888",
                }}
                tickIconStyle={{
                  tintColor: "#FFFFFF",
                }}
                listMode="SCROLLVIEW"
                scrollViewProps={{
                  nestedScrollEnabled: true,
                }}
              />
            </View>


            {formData.workingLevel === "ASSEMBLY" && (
              <>
                <Text className="text-white font-semibold mb-1 text-lg mt-6">
                  Assembly
                </Text>
                <View>
                  <DropDownPicker
                    open={openAssembly}
                    value={formData.assemblyId}
                    items={assemblies}
                    setOpen={setOpenAssembly}
                    setValue={(callback) => handleChange("assemblyId", callback(formData.assemblyId))}
                    onOpen={() => {
                      setOpenWorkingLevel(false);
                      setOpenWard(false);
                      setOpenBooth(false);
                    }}
                    style={{
                      backgroundColor: "#E3EDF3",
                      borderColor: "#000",
                      borderRadius: 10,
                      minHeight: 48,
                    }}
                    dropDownContainerStyle={{
                      borderColor: "#000",
                      maxHeight: 200,
                    }}
                    selectedItemContainerStyle={{
                      backgroundColor: bgColors.blue500_1,
                    }}
                    selectedItemLabelStyle={{
                      color: "#FFFFFF",
                      fontWeight: 600,
                    }}
                    showTickIcon={true}
                    textStyle={{
                      color: "#000",
                      fontSize: 14,
                    }}
                    placeholderStyle={{
                      color: "#888",
                    }}
                    tickIconStyle={{
                      tintColor: "#FFFFFF",
                    }}
                    listMode="SCROLLVIEW"
                    scrollViewProps={{
                      nestedScrollEnabled: true,
                    }}
                  />
                </View>

                <Text className="text-white font-semibold mb-1 text-lg mt-6">
                  Ward
                </Text>
                <View>
                  <DropDownPicker
                    multiple
                    min={0}
                    open={openWard}
                    value={formData.wardIds}
                    items={wardItems}
                    setOpen={setOpenWard}
                    setValue={setWardIdsWithAll}
                    onOpen={() => {
                      setOpenWorkingLevel(false);
                      setOpenAssembly(false);
                      setOpenBooth(false);
                    }}
                    style={{
                      backgroundColor: "#E3EDF3",
                      borderColor: "#000",
                      borderRadius: 10,
                      minHeight: 48,
                    }}
                    dropDownContainerStyle={{
                      borderColor: "#000",
                      maxHeight: 200,
                    }}
                    selectedItemContainerStyle={{
                      backgroundColor: bgColors.blue500_1,
                    }}
                    selectedItemLabelStyle={{
                      color: "#FFFFFF",
                      fontWeight: 600,
                    }}
                    showTickIcon={true}
                    textStyle={{
                      color: "#000",
                      fontSize: 14,
                    }}
                    placeholderStyle={{
                      color: "#888",
                    }}
                    tickIconStyle={{
                      tintColor: "#FFFFFF",
                    }}
                    listMode="SCROLLVIEW"
                    mode="BADGE"
                    closeAfterSelecting={false}
                    scrollViewProps={{
                      nestedScrollEnabled: true,
                    }}
                  />
                </View>

                <Text className="text-white font-semibold mb-1 text-lg mt-6">
                  Booth
                </Text>
                <View>
                  <DropDownPicker
                    multiple
                    min={0}
                    open={openBooth}
                    value={formData.boothIds}
                    items={boothItems}
                    setOpen={setOpenBooth}
                    setValue={setBoothIdsWithAll}
                    onOpen={() => {
                      setOpenWorkingLevel(false);
                      setOpenAssembly(false);
                      setOpenWard(false);
                    }}
                    style={{
                      backgroundColor: "#E3EDF3",
                      borderColor: "#000",
                      borderRadius: 10,
                      minHeight: 48,
                    }}
                    dropDownContainerStyle={{
                      borderColor: "#000",
                      maxHeight: 200,
                    }}
                    selectedItemContainerStyle={{
                      backgroundColor: bgColors.blue500_1,
                    }}
                    selectedItemLabelStyle={{
                      color: "#FFFFFF",
                      fontWeight: 600,
                    }}
                    showTickIcon={true}
                    textStyle={{
                      color: "#000",
                      fontSize: 14,
                    }}
                    placeholderStyle={{
                      color: "#888",
                    }}
                    tickIconStyle={{
                      tintColor: "#FFFFFF",
                    }}
                    listMode="SCROLLVIEW"
                    mode="BADGE"
                    closeAfterSelecting={false}
                    scrollViewProps={{
                      nestedScrollEnabled: true,
                    }}
                  />
                </View>
              </>
            )}

            {formData.workingLevel === "WARD" && (
              <>
                <Text className="text-white font-semibold mb-1 text-lg mt-6">
                  Assembly
                </Text>
                <View>
                  <DropDownPicker
                    open={openAssembly}
                    value={formData.assemblyId}
                    items={assemblies}
                    setOpen={setOpenAssembly}
                    setValue={(callback) => handleChange("assemblyId", callback(formData.assemblyId))}
                    onOpen={() => {
                      setOpenWorkingLevel(false);
                      setOpenWard(false);
                      setOpenBooth(false);
                    }}
                    style={{
                      backgroundColor: "#E3EDF3",
                      borderColor: "#000",
                      borderRadius: 10,
                      minHeight: 48,
                    }}
                    dropDownContainerStyle={{
                      borderColor: "#000",
                      maxHeight: 200,
                    }}
                    selectedItemContainerStyle={{
                      backgroundColor: bgColors.blue500_1,
                    }}
                    selectedItemLabelStyle={{
                      color: "#FFFFFF",
                      fontWeight: 600,
                    }}
                    showTickIcon={true}
                    textStyle={{
                      color: "#000",
                      fontSize: 14,
                    }}
                    placeholderStyle={{
                      color: "#888",
                    }}
                    tickIconStyle={{
                      tintColor: "#FFFFFF",
                    }}
                    listMode="SCROLLVIEW"
                    scrollViewProps={{
                      nestedScrollEnabled: true,
                    }}
                  />
                </View>

                <Text className="text-white font-semibold mb-1 text-lg mt-6">
                  Ward
                </Text>
                <View>
                  <DropDownPicker
                    multiple
                    min={0}
                    open={openWard}
                    value={formData.wardIds}
                    items={wardItems}
                    setOpen={setOpenWard}
                    setValue={setWardIdsWithAll}
                    onOpen={() => {
                      setOpenWorkingLevel(false);
                      setOpenBooth(false);
                    }}
                    style={{
                      backgroundColor: "#E3EDF3",
                      borderColor: "#000",
                      borderRadius: 10,
                      minHeight: 48,
                    }}
                    dropDownContainerStyle={{
                      borderColor: "#000",
                      maxHeight: 200,
                    }}
                    selectedItemContainerStyle={{
                      backgroundColor: bgColors.blue500_1,
                    }}
                    selectedItemLabelStyle={{
                      color: "#FFFFFF",
                      fontWeight: 600,
                    }}
                    showTickIcon={true}
                    textStyle={{
                      color: "#000",
                      fontSize: 14,
                    }}
                    placeholderStyle={{
                      color: "#888",
                    }}
                    tickIconStyle={{
                      tintColor: "#FFFFFF",
                    }}
                    listMode="SCROLLVIEW"
                    mode="BADGE"
                    closeAfterSelecting={false}
                    scrollViewProps={{
                      nestedScrollEnabled: true,
                    }}
                  />
                </View>

                <Text className="text-white font-semibold mb-1 text-lg mt-6">
                  Booth
                </Text>
                <View>
                  <DropDownPicker
                    multiple
                    min={0}
                    open={openBooth}
                    value={formData.boothIds}
                    items={boothItems}
                    setOpen={setOpenBooth}
                    setValue={setBoothIdsWithAll}
                    onOpen={() => {
                      setOpenWorkingLevel(false);
                      setOpenWard(false);
                    }}
                    style={{
                      backgroundColor: "#E3EDF3",
                      borderColor: "#000",
                      borderRadius: 10,
                      minHeight: 48,
                    }}
                    dropDownContainerStyle={{
                      borderColor: "#000",
                      maxHeight: 200,
                    }}
                    selectedItemContainerStyle={{
                      backgroundColor: bgColors.blue500_1,
                    }}
                    selectedItemLabelStyle={{
                      color: "#FFFFFF",
                      fontWeight: 600,
                    }}
                    showTickIcon={true}
                    textStyle={{
                      color: "#000",
                      fontSize: 14,
                    }}
                    placeholderStyle={{
                      color: "#888",
                    }}
                    tickIconStyle={{
                      tintColor: "#FFFFFF",
                    }}
                    listMode="SCROLLVIEW"
                    mode="BADGE"
                    closeAfterSelecting={false}
                    scrollViewProps={{
                      nestedScrollEnabled: true,
                    }}
                  />
                </View>
              </>
            )}

            {formData.workingLevel === "BOOTH" && (
              <>
                <Text className="text-white font-semibold mb-1 text-lg mt-6">
                  Assembly
                </Text>
                <View>
                  <DropDownPicker
                    open={openAssembly}
                    value={formData.assemblyId}
                    items={assemblies}
                    setOpen={setOpenAssembly}
                    setValue={(callback) => handleChange("assemblyId", callback(formData.assemblyId))}
                    onOpen={() => {
                      setOpenWorkingLevel(false);
                      setOpenWard(false);
                      setOpenBooth(false);
                    }}
                    style={{
                      backgroundColor: "#E3EDF3",
                      borderColor: "#000",
                      borderRadius: 10,
                      minHeight: 48,
                    }}
                    dropDownContainerStyle={{
                      borderColor: "#000",
                      maxHeight: 200,
                    }}
                    selectedItemContainerStyle={{
                      backgroundColor: bgColors.blue500_1,
                    }}
                    selectedItemLabelStyle={{
                      color: "#FFFFFF",
                      fontWeight: 600,
                    }}
                    textStyle={{
                      color: "#000",
                      fontSize: 14,
                    }}
                    placeholderStyle={{
                      color: "#888",
                    }}
                    tickIconStyle={{
                      tintColor: "#FFFFFF",
                    }}
                    listMode="SCROLLVIEW"
                    scrollViewProps={{
                      nestedScrollEnabled: true,
                    }}
                  />
                </View>

                <Text className="text-white font-semibold mb-1 text-lg mt-6">
                  Ward
                </Text>
                <View>
                  <DropDownPicker
                    multiple
                    min={0}
                    open={openWard}
                    value={formData.wardIds}
                    items={wardItems}
                    setOpen={setOpenWard}
                    setValue={setWardIdsWithAll}
                    onOpen={() => {
                      setOpenWorkingLevel(false);
                      setOpenBooth(false);
                    }}
                    style={{
                      backgroundColor: "#E3EDF3",
                      borderColor: "#000",
                      borderRadius: 10,
                      minHeight: 48,
                    }}
                    dropDownContainerStyle={{
                      borderColor: "#000",
                      maxHeight: 200,
                    }}
                    selectedItemContainerStyle={{
                      backgroundColor: bgColors.blue500_1,
                    }}
                    selectedItemLabelStyle={{
                      color: "#FFFFFF",
                      fontWeight: 600,
                    }}
                    textStyle={{
                      color: "#000",
                      fontSize: 14,
                    }}
                    placeholderStyle={{
                      color: "#888",
                    }}
                    tickIconStyle={{
                      tintColor: "#FFFFFF",
                    }}
                    listMode="SCROLLVIEW"
                    mode="BADGE"
                    closeAfterSelecting={false}
                    scrollViewProps={{
                      nestedScrollEnabled: true,
                    }}
                  />
                </View>

                <Text className="text-white font-semibold mb-1 text-lg mt-6">
                  Booth
                </Text>
                <View>
                  <DropDownPicker
                    multiple
                    min={0}
                    open={openBooth}
                    value={formData.boothIds}
                    items={boothItems}
                    setOpen={setOpenBooth}
                    setValue={setBoothIdsWithAll}
                    onOpen={() => {
                      setOpenWorkingLevel(false);
                    }}
                    style={{
                      backgroundColor: "#E3EDF3",
                      borderColor: "#000",
                      borderRadius: 10,
                      minHeight: 48,
                    }}
                    dropDownContainerStyle={{
                      borderColor: "#000",
                      maxHeight: 200,
                    }}
                    selectedItemContainerStyle={{
                      backgroundColor: bgColors.blue500_1,
                    }}
                    selectedItemLabelStyle={{
                      color: "#FFFFFF",
                      fontWeight: 600,
                    }}
                    textStyle={{
                      color: "#000",
                      fontSize: 14,
                    }}
                    placeholderStyle={{
                      color: "#888",
                    }}
                    tickIconStyle={{
                      tintColor: "#FFFFFF",
                    }}
                    listMode="SCROLLVIEW"
                    mode="BADGE"
                    closeAfterSelecting={false}
                    scrollViewProps={{
                      nestedScrollEnabled: true,
                    }}
                  />
                </View>
              </>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              className={`${bgColors.blue700} mt-10 py-3 rounded-xl`}
            >
              <Text className="text-white text-center text-lg font-semibold">
                Submit
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
