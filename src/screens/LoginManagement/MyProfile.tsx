import React, { useContext, useEffect, useState } from "react";
import { 
    View, 
    Text, 
    Image, 
    TouchableOpacity, 
    TextInput, 
    Alert, 
    ScrollView, 
    SafeAreaView,
    ActivityIndicator
} from "react-native";
import { CRUDAPI } from "../../apis/Api";
import { AuthContext } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchImageLibrary } from "react-native-image-picker";
import { GetInitials } from "../../components/GetInitials";

export default function MyProfile() {
    const { logout } = useContext(AuthContext);
    const [profileInfo, setProfileInfo] = useState<any>({});
    const [loading, setLoading] = useState(false);
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
        } as any);
        CRUDAPI.uploadUserProfilePic(formData)
            .then((res) => console.log(res))
            .catch((err) => console.log(err))
    }

    const handleUpdate = (key, value) => {
        setForm({ ...form, [key]: value });
    };

    const getUserProfile = () => {
        setLoading(true);
        CRUDAPI.getUserProfile()
            .then((data) => { setProfileInfo(data) })
            .catch((err) => console.log(err))
            .finally(() => setLoading(false));
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

    const renderInfoRow = (label, value, key, editKey, isEditing, keyboardType = "default") => (
        <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 16, paddingHorizontal: 16, height: 60, borderWidth: 1, borderColor: isEditing ? "#3B82F6" : "#F1F5F9" }}>
                {isEditing ? (
                    <TextInput
                        value={value}
                        keyboardType={keyboardType as any}
                        onChangeText={(text) => {
                            if (editKey === "name") {
                                const parts = text.split(" ");
                                handleUpdate("firstName", parts[0] || "");
                                handleUpdate("lastName", parts.slice(1).join(" ") || "");
                            } else {
                                handleUpdate(key, text);
                            }
                        }}
                        style={{ flex: 1, fontSize: 16, color: "#1E293B", fontWeight: "500" }}
                        autoFocus
                    />
                ) : (
                    <Text style={{ flex: 1, fontSize: 16, color: "#1E293B", fontWeight: "500" }}>{value || "-"}</Text>
                )}
                <TouchableOpacity
                    onPress={() => {
                        if (isEditing) updateUserProfile();
                        setEditing({ ...editing, [editKey]: !isEditing });
                    }}
                    style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: isEditing ? "#EFF6FF" : "transparent", borderRadius: 12 }}
                >
                    <Ionicons name={isEditing ? "checkmark" : "create-outline"} size={22} color={isEditing ? "#2563EB" : "#94A3B8"} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>

                {/* Profile Picture Section */}
                <View style={{ alignItems: "center", marginBottom: 40 }}>
                    <View style={{ position: "relative" }}>
                        <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "white", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 }}>
                            {profileInfo?.profilePicUrl ? (
                                <Image
                                    source={{ uri: profileInfo?.profilePicUrl }}
                                    style={{ width: 132, height: 132, borderRadius: 66 }}
                                />
                            ) : (
                                <Text style={{ fontSize: 48, fontWeight: "bold", color: "#3B82F6" }}>
                                    {GetInitials(form.firstName, form.lastName)}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity 
                            onPress={selectProfileImage}
                            style={{ position: "absolute", bottom: 0, right: 0, backgroundColor: "#2563EB", width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "white" }}
                        >
                            <Ionicons name="camera" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                    <Text style={{ marginTop: 16, fontSize: 20, fontWeight: "bold", color: "#1E293B" }}>
                        {form.firstName} {form.lastName}
                    </Text>
                    <Text style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
                        {profileInfo.role || "Volunteer"} Account
                    </Text>
                </View>

                {/* Details Section */}
                <View style={{ backgroundColor: "white", borderRadius: 24, paddingVertical: 8 }}>
                    {renderInfoRow("Name", `${form.firstName} ${form.lastName}`, null, "name", editing.name)}
                    {renderInfoRow("Email", form.userName, "userName", "email", editing.email)}
                    {renderInfoRow("Phone", form.phone, "phone", "phone", editing.phone, "phone-pad")}
                </View>

                {/* Actions */}
                <View style={{ marginTop: 24 }}>
                    <TouchableOpacity
                        onPress={logout}
                        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FEF2F2", paddingVertical: 18, borderRadius: 20, borderWidth: 1, borderColor: "#FEE2E2" }}
                    >
                        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                        <Text style={{ color: "#EF4444", fontWeight: "bold", fontSize: 16, marginLeft: 12 }}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
