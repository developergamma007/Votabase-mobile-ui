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
    assignTo: null,             // assignmentId
  });

  // 2. State for controlling DropDownPicker visibility
  const [openWorkingLevel, setOpenWorkingLevel] = useState(false);
  const [openAssignTo, setOpenAssignTo] = useState(false);
  const [boothsList, setBoothsList] = useState([]);
  const [assignToItems, setAssignToItems] = useState([]);

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

  useEffect(() => {
    if (boothsList?.data?.result) {
      const formatted = boothsList.data.result?.filter((item) => item.label != "").map(item => ({
        label: item.nameEn || `Booth ${item.id}`,
        value: item.id,
      }));
      setAssignToItems(formatted);
    }
  }, [boothsList]);  // runs only when API response changes


  // Submit handler → creates JSON
  const handleSubmit = async () => {
    const dataToSend = {
      profilePicUrl: formData.profilePicUrl,
      firstName: formData.firstName.trim(),
      phone: formData.phone.trim(),
      assignmentType: formData.workingLevel,   // Parliament / Assembly / Ward / Booth
      assignmentId: formData.assignTo,         // Booth id or Assembly Id
      role: userInfo.role
    };
    const res = await CRUDAPI.addVolunteer(dataToSend)
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


            {/* Assign to (using DropDownPicker) */}
            <Text className="text-white font-semibold mb-1 text-lg mt-6">
              Assign to
            </Text>
            <View >
              <DropDownPicker
                open={openAssignTo}
                value={formData.assignTo}
                items={assignToItems}
                setOpen={setOpenAssignTo}
                setValue={(callback) => handleChange("assignTo", callback())}
                onOpen={() => setOpenWorkingLevel(false)}
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
                zIndex={100}
              />
            </View>

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