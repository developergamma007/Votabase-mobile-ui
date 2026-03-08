import React, { useContext, useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, TextInput, Alert } from "react-native";
import { CRUDAPI } from "../../apis/Api";
import { AuthContext } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchImageLibrary } from "react-native-image-picker";
import { GetInitials } from "../../components/GetInitials";
import { bgColors } from "../../constants/colors";

export default function MyProfile() {
    const { logout } = useContext(AuthContext);
    const [profileInfo, setProfileInfo] = useState({});
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        userName: "",
        phone: "",
    });
    const [editing, setEditing] = useState({
        name: false,
        email: false,
        phone: false,
    });

    const uploadProfilePic = (profileImage) => {
        if (!profileImage) {
            Alert.alert("No image selected!");
            return;
        }
        const formData = new FormData();
        formData.append("file", {
            uri: profileImage?.uri,
            name: profileImage?.fileName,
            type: profileImage?.type,
        });
        CRUDAPI.uploadUserProfilePic(formData)
            .then((res) => console.log(res))
            .catch((err) => console.log(err))
    }

    const handleUpdate = (key, value) => {
        setForm({ ...form, [key]: value });
    };

    const getUserProfile = () => {
        CRUDAPI.getUserProfile()
            .then((data) => { setProfileInfo(data) })
            .catch((err) => console.log(err))
    }
    const updateUserProfile = () => {
        CRUDAPI.updateUserProfile(form)
            .then((response) => console.log(response))
            .catch((err) => console.log(err));
    }

    const selectProfileImage = () => {
        launchImageLibrary(
            {
                mediaType: "photo",
                quality: 1,
            },
            (response) => {
                if (response.didCancel) return;
                if (response.assets?.length > 0) {
                    const pickedImage = response.assets?.[0];
                    uploadProfilePic(pickedImage);
                    setProfileInfo((prev) => ({
                        ...prev,
                        profilePicUrl: pickedImage.uri,
                    }));
                }
            }
        );
    };

    useEffect(() => {
        getUserProfile();
    }, []);

    useEffect(() => {
        if (profileInfo) {
            setForm({
                firstName: profileInfo.firstName || '',
                lastName: profileInfo.lastName || '',
                userName: profileInfo.userName || '',
                phone: profileInfo.phone || ''
            })
        }
    }, [profileInfo])

    return (
        <View className={`flex-1 ${bgColors.white} items-center p-6`}>
            {/* Profile Picture */}
            <View className="mt-10 mb-4 items-center">
                {profileInfo?.profilePicUrl ? (
                    <Image
                        source={{ uri: profileInfo?.profilePicUrl }}
                        className="w-40 h-40 rounded-full"
                    />
                ) : (
                    <View className={`w-40 h-40 rounded-full ${bgColors.customLightBlue3} items-center justify-center`}>
                        <Text className="text-4xl font-semibold text-[#2E6F91]">{GetInitials(form.firstName, form.lastName)}</Text>
                    </View>
                )}
                <TouchableOpacity onPress={selectProfileImage}>
                    <Text className="text-[#2E6F91] mt-3 font-medium">
                        Change Profile Picture
                    </Text>
                </TouchableOpacity>
            </View>

            <View className="w-full border-t border-gray-200 mt-4" />
            <View className="w-full mt-6">
                {/* ----------- NAME FIELD ---------- */}
                <View className="mt-4">
                    <Text className="text-gray-600 text-lg font-semibold">Name</Text>

                    <View className="flex-row items-center justify-between mt-1">
                        {editing.name ? (
                            <TextInput
                                value={form.firstName + " " + form.lastName}
                                onChangeText={(text) => {
                                    const parts = text.split(" ");
                                    handleUpdate("firstName", parts[0] || "");
                                    handleUpdate("lastName", parts.slice(1).join(" ") || "");
                                }}
                                className="border border-gray-300 px-3 py-2 rounded-lg w-3/4 text-gray-900"
                            />
                        ) : (
                            <Text className="text-gray-800 text-base">
                                {form.firstName + " " + form.lastName}
                            </Text>
                        )}

                        <TouchableOpacity
                            onPress={() => {
                                setEditing({ ...editing, name: !editing.name }),
                                    updateUserProfile()
                            }}
                        >
                            {editing.name ? (
                                <Ionicons name="checkmark" size={24} color="#2E6F91" />
                            ) : (
                                <Ionicons name="create-outline" size={24} color="#2E6F91" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ----------- EMAIL FIELD ---------- */}
                <View className="mt-6">
                    <Text className="text-gray-600 text-lg font-semibold">Email</Text>

                    <View className="flex-row items-center justify-between mt-1">
                        {editing.email ? (
                            <TextInput
                                value={form.userName}
                                onChangeText={(v) => handleUpdate("userName", v)}
                                className="border border-gray-300 px-3 py-2 rounded-lg w-3/4 text-gray-900"
                            />
                        ) : (
                            <Text className="text-gray-800 text-base">
                                {form.userName}
                            </Text>
                        )}

                        <TouchableOpacity
                            onPress={() => {
                                setEditing({ ...editing, email: !editing.email })
                                updateUserProfile()
                            }
                            }
                        >
                            {editing.email ? (
                                <Ionicons name="checkmark" size={24} color="#2E6F91" />
                            ) : (
                                <Ionicons name="create-outline" size={24} color="#2E6F91" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ----------- PHONE FIELD ---------- */}
                <View className="mt-6">
                    <Text className="text-gray-600 text-lg font-semibold">Phone</Text>

                    <View className="flex-row items-center justify-between mt-1">
                        {editing.phone ? (
                            <TextInput
                                value={form.phone}
                                onChangeText={(v) => handleUpdate("phone", v)}
                                keyboardType="phone-pad"
                                className="border border-gray-300 px-3 py-2 rounded-lg w-3/4 text-gray-900"
                            />
                        ) : (
                            <Text className="text-gray-800 text-base">
                                {form.phone}
                            </Text>
                        )}

                        <TouchableOpacity
                            onPress={() => { setEditing({ ...editing, phone: !editing.phone }), updateUserProfile() }} >
                            {editing.phone ? (
                                <Ionicons name="checkmark" size={24} color="#2E6F91" />
                            ) : (
                                <Ionicons name="create-outline" size={24} color="#2E6F91" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                onPress={logout}
                className={`${bgColors.customBlue} w-3/4 rounded-full py-3 ml-2 items-center mt-20`}
            >
                <Text className="text-white font-semibold">Log out</Text>
            </TouchableOpacity>

        </View >
    );
}
