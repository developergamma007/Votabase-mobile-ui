import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CRUDAPI } from "../../apis/Api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

const LoginScreen = () => {
  const { height: windowHeight } = useWindowDimensions();
  const isCompact = windowHeight < 700;
  const { updateToken, setUserInfo } = useContext(AuthContext);
  const [firstName, setFirstName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        await AsyncStorage.setItem("role", userData.role || "");
        await AsyncStorage.setItem("tenantId", userData.tenantId || "");
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
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  const horizontalPad = 24;
  const cardPad = isCompact ? 24 : 32;
  const headerGap = isCompact ? 32 : 48;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <LinearGradient colors={["#0F172A", "#1E293B", "#020617"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: horizontalPad,
                paddingTop: Platform.OS === "android" ? 20 : 12,
                paddingBottom: 24,
                minHeight: windowHeight,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          >
            <View style={[styles.header, { marginBottom: headerGap }]}>
              <View style={styles.logoBox}>
                <Ionicons name="shield-checkmark" size={40} color="#38BDF8" />
              </View>
              <Text style={styles.brandTitle}>Votabase</Text>
              <Text style={styles.brandTagline}>Secure Voter Management Portal</Text>
            </View>

            <View style={[styles.card, { padding: cardPad }]}>
              <Text style={styles.welcomeTitle}>Welcome !</Text>
              <Text style={styles.welcomeSub}>Please enter your credentials to login</Text>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>FIRST NAME</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={20} color="#38BDF8" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your first name"
                    placeholderTextColor="#475569"
                    value={firstName}
                    onChangeText={(t) => {
                      setFirstName(t);
                      setError("");
                    }}
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#38BDF8" />
                  <TextInput
                    style={styles.input}
                    placeholder="10 digit mobile number"
                    placeholderTextColor="#475569"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={mobileNumber}
                    onChangeText={(t) => {
                      setMobileNumber(t);
                      setError("");
                    }}
                  />
                </View>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
                style={styles.loginBtnWrap}
              >
                <LinearGradient
                  colors={["#38BDF8", "#0284C7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View style={styles.loginBtnInner}>
                      <Text style={styles.loginBtnText}>LOGIN</Text>
                      <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.terms}>
                By continuing you agree to our{"\n"}
                <Text style={styles.termsLink}>Terms of Service</Text>
                <Text style={styles.termsMuted}> & </Text>
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            <Text style={styles.footer}>© 2024 Votabase. All rights reserved.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    backgroundColor: "#020617",
  },
  safe: {
    flex: 1,
    width: "100%",
  },
  flex: {
    flex: 1,
    width: "100%",
  },
  scroll: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
  },
  header: {
    alignItems: "center",
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#F8FAFC",
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 16,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F1F5F9",
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: Platform.OS === "android" ? 24 : 32,
  },
  fieldBlock: {
    marginBottom: Platform.OS === "android" ? 16 : 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    minHeight: 56,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: "#F1F5F9",
    fontSize: 16,
    paddingVertical: Platform.OS === "android" ? 12 : 16,
    ...(Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" as const } : {}),
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    marginLeft: 8,
    fontWeight: "500",
    flex: 1,
  },
  loginBtnWrap: {
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: Platform.OS === "android" ? 20 : 24,
  },
  loginBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  loginBtnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  terms: {
    textAlign: "center",
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  termsLink: {
    color: "#38BDF8",
    fontWeight: "600",
  },
  termsMuted: {
    color: "#64748B",
  },
  footer: {
    color: "#475569",
    fontSize: 13,
    textAlign: "center",
    marginTop: Platform.OS === "android" ? 28 : 40,
  },
});

export default LoginScreen;
