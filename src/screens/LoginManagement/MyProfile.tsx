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
    Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CRUDAPI } from "../../apis/Api";
import { AuthContext } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchImageLibrary } from "react-native-image-picker";
import { GetInitials } from "../../components/GetInitials";

const normalizeProfile = (data: any) => {
    if (!data) return {};
    const inner = data?.data?.result ?? data?.data ?? data?.result ?? data;
    const firstName = inner.firstName || inner.userName || "";
    return {
        firstName,
        lastName: inner.lastName || "",
        userName: inner.userName || firstName,
        phone: inner.phone || "",
        profilePicUrl: inner.profilePicUrl || "",
        role: inner.role || "",
        tenantId: inner.tenantId,
    };
};

const profileToForm = (profile: any) => ({
    firstName: profile.firstName || profile.userName || "",
    lastName: profile.lastName || "",
    userName: profile.userName || profile.firstName || "",
    phone: profile.phone || "",
});

const parsePhoneFromToken = (token: string): string => {
    try {
        const part = token.split(".")[1];
        if (!part || typeof global.atob !== "function") return "";
        const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const json = JSON.parse(global.atob(padded));
        return json?.phone ? String(json.phone) : "";
    } catch {
        return "";
    }
};

export default function MyProfile() {
    const { logout } = useContext(AuthContext);
    const [profileInfo, setProfileInfo] = useState<any>({});
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        userName: "",
        phone: "",
    });
    const [editing, setEditing] = useState({
        name: false,
        phone: false,
    });

    const applyProfile = (profile: any) => {
        const normalized = normalizeProfile(profile);
        setProfileInfo(normalized);
        setForm(profileToForm(normalized));
    };

    const loadCachedProfile = async () => {
        try {
            const raw = await AsyncStorage.getItem("userInfo");
            const storedPhone = await AsyncStorage.getItem("userPhone");
            const token = await AsyncStorage.getItem("X_INIT_TOKEN") || await AsyncStorage.getItem("token");
            const tokenPhone = token ? parsePhoneFromToken(token) : "";
            const cached = raw ? JSON.parse(raw) : {};
            applyProfile({
                ...cached,
                phone: cached.phone || storedPhone || tokenPhone || "",
            });
        } catch {
            /* ignore cache parse errors */
        }
    };

    const uploadProfilePic = async (profileImage: any) => {
        if (!profileImage?.uri) {
            Alert.alert("No image selected!");
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", {
                uri: profileImage.uri,
                name: profileImage.fileName || `profile_${Date.now()}.jpg`,
                type: profileImage.type || "image/jpeg",
            } as any);
            const res = await CRUDAPI.uploadUserProfilePic(formData);
            applyProfile(res);
            const raw = await AsyncStorage.getItem("userInfo");
            const cached = raw ? JSON.parse(raw) : {};
            await AsyncStorage.setItem("userInfo", JSON.stringify({ ...cached, ...normalizeProfile(res) }));
            Alert.alert("Success", "Profile photo updated");
        } catch (err: any) {
            const msg = err?.response?.data?.detail || err?.message || "Could not upload photo";
            Alert.alert("Upload failed", typeof msg === "string" ? msg : "Could not upload photo");
        } finally {
            setUploading(false);
        }
    };

    const handleUpdate = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const buildProfilePayload = () => ({
        firstName: (form.firstName || profileInfo.firstName || profileInfo.userName || "").trim(),
        phone: (form.phone || profileInfo.phone || "").trim(),
        profilePicUrl: profileInfo.profilePicUrl || undefined,
        tenantId: profileInfo.tenantId,
        role: profileInfo.role,
    });

    const getUserProfile = async () => {
        try {
            const data = await CRUDAPI.getUserProfile();
            const normalized = normalizeProfile(data);
            if (!normalized.phone) {
                const storedPhone = await AsyncStorage.getItem("userPhone");
                const token = await AsyncStorage.getItem("X_INIT_TOKEN") || await AsyncStorage.getItem("token");
                normalized.phone = storedPhone || (token ? parsePhoneFromToken(token) : "") || "";
            }
            applyProfile(normalized);
            const raw = await AsyncStorage.getItem("userInfo");
            const cached = raw ? JSON.parse(raw) : {};
            await AsyncStorage.setItem("userInfo", JSON.stringify({ ...cached, ...normalized }));
            if (normalized.phone) {
                await AsyncStorage.setItem("userPhone", normalized.phone);
            }
        } catch (err) {
            console.log(err);
            const storedPhone = await AsyncStorage.getItem("userPhone");
            const token = await AsyncStorage.getItem("X_INIT_TOKEN") || await AsyncStorage.getItem("token");
            const fallbackPhone = storedPhone || (token ? parsePhoneFromToken(token) : "");
            if (fallbackPhone) {
                setForm((prev) => ({ ...prev, phone: prev.phone || fallbackPhone }));
                setProfileInfo((prev: any) => ({ ...prev, phone: prev.phone || fallbackPhone }));
            }
        }
    };

    const updateUserProfile = async () => {
        const payload = buildProfilePayload();
        if (!payload.firstName || !payload.phone) {
            Alert.alert("Validation", "Name and phone are required");
            return;
        }
        try {
            const response = await CRUDAPI.updateUserProfile(payload);
            applyProfile(response);
            const raw = await AsyncStorage.getItem("userInfo");
            const cached = raw ? JSON.parse(raw) : {};
            await AsyncStorage.setItem("userInfo", JSON.stringify({ ...cached, ...normalizeProfile(response) }));
            Alert.alert("Success", "Profile updated");
        } catch (err: any) {
            const msg = err?.response?.data?.detail || err?.message || "Update failed";
            Alert.alert("Error", typeof msg === "string" ? msg : JSON.stringify(msg));
        }
    };

    const selectProfileImage = () => {
        launchImageLibrary(
            {
                mediaType: "photo",
                quality: 0.85,
                selectionLimit: 1,
            },
            (response) => {
                if (response.didCancel || response.errorCode) return;
                const pickedImage = response.assets?.[0];
                if (pickedImage) {
                    setProfileInfo((prev: any) => ({
                        ...prev,
                        profilePicUrl: pickedImage.uri,
                    }));
                    uploadProfilePic(pickedImage);
                }
            },
        );
    };

    useEffect(() => {
        loadCachedProfile().then(() => getUserProfile());
    }, []);

    const displayName = `${form.firstName || form.userName || ""} ${form.lastName || ""}`.trim() || "-";
    const nameFieldValue = displayName === "-" ? "" : displayName;

    const renderInfoRow = (
        label: string,
        value: string,
        key: string | null,
        editKey: "name" | "phone",
        isEditing: boolean,
        keyboardType = "default",
    ) => (
        <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 16, height: 60, borderWidth: 1, borderColor: isEditing ? "#3B82F6" : "#E2E8F0", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}>
                {isEditing ? (
                    <TextInput
                        value={value}
                        keyboardType={keyboardType as any}
                        onChangeText={(text) => {
                            if (editKey === "name") {
                                const parts = text.split(" ");
                                handleUpdate("firstName", parts[0] || "");
                                handleUpdate("lastName", parts.slice(1).join(" ") || "");
                            } else if (key) {
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
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F1F5F9" }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
                <View style={{ alignItems: "center", marginBottom: 40, marginTop: Platform.OS === "android" ? 8 : 0 }}>
                    <View style={{ position: "relative" }}>
                        <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "white", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 }}>
                            {profileInfo?.profilePicUrl ? (
                                <Image
                                    source={{ uri: profileInfo.profilePicUrl }}
                                    style={{ width: 132, height: 132, borderRadius: 66 }}
                                />
                            ) : (
                                <Text style={{ fontSize: 48, fontWeight: "bold", color: "#3B82F6" }}>
                                    {GetInitials(form.firstName || form.userName, form.lastName)}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={selectProfileImage}
                            disabled={uploading}
                            style={{ position: "absolute", bottom: 0, right: 0, backgroundColor: uploading ? "#94A3B8" : "#2563EB", width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "white" }}
                        >
                            <Ionicons name={uploading ? "hourglass-outline" : "camera"} size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                    <Text style={{ marginTop: 16, fontSize: 20, fontWeight: "bold", color: "#1E293B" }}>
                        {displayName}
                    </Text>
                    <Text style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
                        {(profileInfo.role || "Volunteer").replace("ROLE_", "")} Account
                    </Text>
                </View>

                <View style={{ backgroundColor: "white", borderRadius: 24, paddingVertical: 8, paddingHorizontal: 4 }}>
                    {renderInfoRow("Name", nameFieldValue, null, "name", editing.name)}
                    {renderInfoRow("Phone", form.phone, "phone", "phone", editing.phone, "phone-pad")}
                </View>

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
