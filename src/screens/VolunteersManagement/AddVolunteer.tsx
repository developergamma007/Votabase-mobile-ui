import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
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
  const { setBanner, userInfo } = useContext(AuthContext);
  const navigation = useNavigation();
  // 1. Single main useState object now including profilePicUrl
  const [formData, setFormData] = useState({
    firstName: "",
    phone: "",
    profilePicUrl: "",
    workingLevel: "ASSEMBLY",   // assignmentType
    assemblyId: null,
    wardId: null,
    boothId: null,
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
        value: item.wardId,
      }));
      setWards(formatted);
    } catch {
      setWards([]);
    }
  };

  const fetchWardsAll = async () => {
    try {
      const res = await CRUDAPI.fetchWards();
      const formatted = (res || []).map((item) => ({
        label: item.wardNameEn || `Ward ${item.wardId}`,
        value: item.wardId,
      }));
      setWards(formatted);
    } catch {
      setWards([]);
    }
  };

  const fetchBooths = async (wardId, includeAll = false) => {
    try {
      if (!wardId) {
        setBooths(includeAll ? [{ label: "All Booths", value: "ALL" }] : []);
        return;
      }
      const res = await CRUDAPI.fetchBooths(null, wardId);
      const formatted = (res || []).map((item) => ({
        label: item.pollingStationAdrEn || `Booth ${item.boothId}`,
        value: item.boothId,
      }));
      const withAll = includeAll ? [{ label: "All Booths", value: "ALL" }, ...formatted] : formatted;
      setBooths(withAll);
    } catch {
      setBooths(includeAll ? [{ label: "All Booths", value: "ALL" }] : []);
    }
  };

  const fetchBoothsAll = async () => {
    try {
      const res = await CRUDAPI.fetchBooths();
      const formatted = (res || []).map((item) => ({
        label: item.pollingStationAdrEn || `Booth ${item.boothId}`,
        value: item.boothId,
      }));
      setBooths(formatted);
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
      assemblyId: null,
      wardId: null,
      boothId: null,
    }));
    setWards([]);
    setBooths([]);

    if (formData.workingLevel === "WARD") {
      fetchWardsAll();
    }
    if (formData.workingLevel === "BOOTH") {
      fetchBoothsAll();
    }
  }, [formData.workingLevel]);

  useEffect(() => {
    if (formData.workingLevel === "ASSEMBLY") {
      setFormData((prev) => ({ ...prev, wardId: null, boothId: null }));
      fetchWards(formData.assemblyId);
    }
  }, [formData.workingLevel, formData.assemblyId]);

  useEffect(() => {
    if (formData.workingLevel === "ASSEMBLY") {
      setFormData((prev) => ({ ...prev, boothId: null }));
      fetchBooths(formData.wardId, true);
    }
    if (formData.workingLevel === "WARD") {
      setFormData((prev) => ({ ...prev, boothId: null }));
      fetchBooths(formData.wardId, true);
    }
  }, [formData.workingLevel, formData.wardId]);


  // Submit handler → creates JSON
  const resolveAssignment = () => {
    if (formData.workingLevel === "ASSEMBLY") {
      if (formData.boothId && formData.boothId !== "ALL") return { assignmentType: "BOOTH", assignmentId: formData.boothId };
      if (formData.wardId) return { assignmentType: "WARD", assignmentId: formData.wardId };
      if (formData.assemblyId) return { assignmentType: "ASSEMBLY", assignmentId: formData.assemblyId };
    }
    if (formData.workingLevel === "WARD") {
      if (formData.boothId && formData.boothId !== "ALL") return { assignmentType: "BOOTH", assignmentId: formData.boothId };
      if (formData.wardId) return { assignmentType: "WARD", assignmentId: formData.wardId };
    }
    if (formData.workingLevel === "BOOTH") {
      if (formData.boothId) return { assignmentType: "BOOTH", assignmentId: formData.boothId };
    }
    return null;
  };

  const handleSubmit = async () => {
    const assignment = resolveAssignment();
    if (!assignment) {
      setBanner({ type: "error", message: "Please select the assignment level details" });
      return;
    }
    const dataToSend = {
      profilePicUrl: formData.profilePicUrl,
      firstName: formData.firstName.trim(),
      phone: formData.phone.trim(),
      assignmentType: assignment.assignmentType,
      assignmentId: assignment.assignmentId,
      role: userInfo.role
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
                    {GetInitials(formData.name)}
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
              secureTextEntry
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
                setValue={(callback) => handleChange("workingLevel", callback())}
                onOpen={() => setOpenAssignTo(false)}
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
                    setValue={(callback) => handleChange("assemblyId", callback())}
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
                    open={openWard}
                    value={formData.wardId}
                    items={wards}
                    setOpen={setOpenWard}
                    setValue={(callback) => handleChange("wardId", callback())}
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
                  Booth
                </Text>
                <View>
                  <DropDownPicker
                    open={openBooth}
                    value={formData.boothId}
                    items={booths}
                    setOpen={setOpenBooth}
                    setValue={(callback) => handleChange("boothId", callback())}
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
              </>
            )}

            {formData.workingLevel === "WARD" && (
              <>
                <Text className="text-white font-semibold mb-1 text-lg mt-6">
                  Ward
                </Text>
                <View>
                  <DropDownPicker
                    open={openWard}
                    value={formData.wardId}
                    items={wards}
                    setOpen={setOpenWard}
                    setValue={(callback) => handleChange("wardId", callback())}
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
                    open={openBooth}
                    value={formData.boothId}
                    items={booths}
                    setOpen={setOpenBooth}
                    setValue={(callback) => handleChange("boothId", callback())}
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
              </>
            )}

            {formData.workingLevel === "BOOTH" && (
              <>
                <Text className="text-white font-semibold mb-1 text-lg mt-6">
                  Booth
                </Text>
                <View>
                  <DropDownPicker
                    open={openBooth}
                    value={formData.boothId}
                    items={booths}
                    setOpen={setOpenBooth}
                    setValue={(callback) => handleChange("boothId", callback())}
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
