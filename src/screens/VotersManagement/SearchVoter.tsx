import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // 👈 install this if not installed
import { bgColors } from '../../constants/colors';

export default function SearchVoter() {
  const fields = [
    { key: "name", placeholder: "Name" },
    { key: "epicId", placeholder: "EPIC ID or Voter ID" },
    { key: "boothNumber", placeholder: "Booth Number" },
    { key: "mobileNumber", placeholder: "Mobile Number", keyboardType: "numeric" },
    { key: "relationName", placeholder: "Relation Name" },
    { key: "houseNumber", placeholder: "House Number" },
  ];

  const initialFormState = {
    wards: "",
    name: "",
    epicId: "",
    boothNumber: "",
    mobileNumber: "",
    relationName: "",
    houseNumber: "",
  };

  const [form, setForm] = useState(initialFormState);
  const [wardsList, setWardsList] = useState<any[]>([]);
  const navigation = useNavigation();

  useEffect(() => {
    const loadWards = async () => {
      const assemblyData = await AsyncStorage.getItem("assemblyData");
      const parsed = JSON.parse(assemblyData || "{}");
      const wards = parsed?.assembly?.wards || [];
      const seen = new Set<string>();
      const uniqueWards = wards.filter((w) => {
        const id = w?.wardId != null ? String(w.wardId) : "";
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      setWardsList(uniqueWards);
    };
    loadWards();
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setForm(initialFormState);
  };

  const handleSearch = async () => {
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
    const allVoters = allBooths.flatMap((b) =>
      (b?.voters || []).map((v) => ({
        ...v,
        boothInfo: {
          boothId: b.boothId,
          boothNameEn: b.boothNameEn,
          boothNameLocal: b.boothNameLocal,
        },
        wardId: b.wardId,
        wardNameEn: b.wardNameEn,
      }))
    );

    // 🔍 Filter voters by selected ward first (if any)
    let votersToFilter = allVoters;
    if (form.wards) {
      votersToFilter = allVoters.filter((v) => v.wardId === form.wards);
    }

    // 🕵️‍♂️ Dynamic filtering based on form fields
    const filteredVoters = votersToFilter.filter((v) => {
      const nameMatch =
        !form.name ||
        `${v.firstMiddleNameEn || ""} ${v.lastNameEn || ""}`
          .toLowerCase()
          .includes(form.name.toLowerCase());

      const mobileMatch =
        !form.mobileNumber || v.mobile?.toString().includes(form.mobileNumber);

      const houseMatch =
        !form.houseNumber ||
        v.houseNoEn?.toString().includes(form.houseNumber);

      const epicMatch =
        !form.epicId ||
        v.epicNo?.toLowerCase().includes(form.epicId.toLowerCase());

      const relationMatch =
        !form.relationName ||
        `${v.relationFirstMiddleNameEn || ""} ${v.relationLastNameEn || ""}`
          .toLowerCase()
          .includes(form.relationName.toLowerCase());

      const boothMatch =
        !form.boothNumber ||
        v.boothInfo?.boothId?.toString().includes(form.boothNumber);

      return (
        nameMatch &&
        mobileMatch &&
        houseMatch &&
        epicMatch &&
        relationMatch &&
        boothMatch
      );
    });

    navigation.navigate("Voter List", {
      booth: allBooths,
      filteredVotersByParameter: filteredVoters,
    });
  };


  return (
    <View className={`flex-1 ${bgColors.white} px-5`}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* 🏛️ Wards Dropdown */}
        <View
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 12,
            marginBottom: 16,
            marginTop: 16,
            justifyContent: 'center',
          }}
        >
          <Picker
            selectedValue={form.wards}
            onValueChange={(value) => handleChange("wards", value)}
            style={{
              marginTop: -8, // fine-tunes visual centering
              marginBottom: -8,
              color: '#000',
            }}
            dropdownIconColor="#000"
          >
            <Picker.Item label="Select Ward" value="" />
            {wardsList.map((ward) => (
              <Picker.Item
                key={ward.wardId}
                label={ward.wardNameEn || `Ward ${ward.wardId}`}
                value={ward.wardId}
              />
            ))}
          </Picker>
        </View>


        {/* 🧾 Other Input Fields */}
        {fields.map(({ key, placeholder, keyboardType }) => (
          <TextInput
            key={key}
            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-black"
            placeholder={placeholder}
            placeholderTextColor="#999"
            keyboardType={keyboardType || "default"}
            value={form[key]}
            onChangeText={(text) => handleChange(key, text)}
          />
        ))}

        {/* ⚙️ Action Buttons */}
        <View className="flex-row justify-between mt-4">
          <TouchableOpacity
            onPress={handleReset}
            className="flex-1 border border-[#2E6F91] rounded-full py-3 mr-2 items-center"
          >
            <Text className="text-[#2E6F91] font-semibold">Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSearch}
            className={`flex-1 ${bgColors.customBlue} rounded-full py-3 ml-2 items-center`}
          >
            <Text className="text-white font-semibold">Search</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
