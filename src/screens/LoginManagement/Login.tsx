import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { CRUDAPI } from "../../apis/Api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

const LoginScreen = () => {
  const [firstName, setFirstName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { updateToken, setUserInfo } = useContext(AuthContext);

  const handleLogin = () => {
    if (!firstName || !mobileNumber) {
      setError("Please enter first name and mobile number");
      return;
    }

    setLoading(true);
    setError("");
    login();
  };

  const login = async () => {
    const jsonReq = {
      firstName: firstName,
      phone: mobileNumber,
    };

    try {
      const response = await CRUDAPI.loginApi(jsonReq);
      if (response.success) {
        const userData = response.data.result;
        await updateToken(userData.token);
        const loggedInUser = await AsyncStorage.getItem("loggedInUser");

        if (!loggedInUser) {
          await AsyncStorage.setItem("loggedInUser", userData.userName);
          await AsyncStorage.setItem("newLoggedInUser", userData.userName);
        } else if (loggedInUser !== userData.userName) {
          await AsyncStorage.setItem("newLoggedInUser", userData.userName);
        }

        await AsyncStorage.setItem("userInfo", JSON.stringify(userData));
        await AsyncStorage.setItem("token", userData.token);
        await AsyncStorage.setItem("X_INIT_TOKEN", userData.token);
        await AsyncStorage.setItem("role", userData.role || '');
        await AsyncStorage.setItem("tenantId", userData.tenantId || '');
        if (userData.assemblyCode || userData.assemblyNo || userData.assignmentId) {
          await AsyncStorage.setItem(
            "assemblyCode",
            String(userData.assemblyCode || userData.assemblyNo || userData.assignmentId)
          );
        }
        setUserInfo(userData);
        setLoading(false);
      } else {
        setLoading(false);
        setError("Invalid first name or mobile number");
      }
    } catch (e) {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#020617" }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#0F172A", "#1E293B", "#020617"]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}
          >
            {/* Logo / Header Section */}
            <View style={{ alignItems: "center", marginBottom: 48 }}>
              <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: "rgba(255, 255, 255, 0.1)", alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" }}>
                <Ionicons name="shield-checkmark" size={40} color="#38BDF8" />
              </View>
              <Text style={{ fontSize: 32, fontWeight: "bold", color: "#F8FAFC", letterSpacing: 1 }}>Votabase</Text>
              <Text style={{ fontSize: 16, color: "#94A3B8", marginTop: 8 }}>Secure Voter Management Portal</Text>
            </View>

            {/* Login Card */}
            <View style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: 32, padding: 32, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 5 }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: "#F1F5F9", marginBottom: 8 }}>Welcome Back</Text>
              <Text style={{ fontSize: 14, color: "#64748B", marginBottom: 32 }}>Please enter your credentials to login</Text>

              {/* First Name Field */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#94A3B8", marginBottom: 8, marginLeft: 4 }}>FIRST NAME</Text>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(15, 23, 42, 0.5)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)", paddingHorizontal: 16 }}>
                  <Ionicons name="person-outline" size={20} color="#38BDF8" />
                  <TextInput
                    style={{ flex: 1, height: 56, marginLeft: 12, color: "#F1F5F9", fontSize: 16 }}
                    placeholder="Enter your first name"
                    placeholderTextColor="#475569"
                    value={firstName}
                    onChangeText={(t) => { setFirstName(t); setError(""); }}
                  />
                </View>
              </View>

              {/* Mobile Number Field */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#94A3B8", marginBottom: 8, marginLeft: 4 }}>MOBILE NUMBER</Text>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(15, 23, 42, 0.5)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)", paddingHorizontal: 16 }}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#38BDF8" />
                  <TextInput
                    style={{ flex: 1, height: 56, marginLeft: 12, color: "#F1F5F9", fontSize: 16 }}
                    placeholder="10 digit mobile number"
                    placeholderTextColor="#475569"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={mobileNumber}
                    onChangeText={(t) => { setMobileNumber(t); setError(""); }}
                  />
                </View>
              </View>

              {error ? (
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: 12, borderRadius: 12, marginBottom: 20 }}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={{ color: "#FCA5A5", fontSize: 13, marginLeft: 8, fontWeight: "500" }}>{error}</Text>
                </View>
              ) : null}

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
                style={{ height: 60, borderRadius: 16, overflow: "hidden", marginBottom: 24 }}
              >
                <LinearGradient
                  colors={["#38BDF8", "#0284C7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", letterSpacing: 0.5 }}>LOGIN</Text>
                      <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Terms Section */}
              <View style={{ alignItems: "center" }}>
                <Text style={{ textAlign: "center", fontSize: 12, color: "#64748B", lineHeight: 18 }}>
                  By continuing you agree to our{"\n"}
                  <Text style={{ color: "#38BDF8", fontWeight: "600" }}>Terms of Service</Text>
                  <Text> & </Text>
                  <Text style={{ color: "#38BDF8", fontWeight: "600" }}>Privacy Policy</Text>
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View style={{ marginTop: 40, alignItems: "center" }}>
              <Text style={{ color: "#475569", fontSize: 13 }}>© 2024 Votabase. All rights reserved.</Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

export default LoginScreen;
