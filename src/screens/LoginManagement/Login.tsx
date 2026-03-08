import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { CRUDAPI } from "../../apis/Api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../context/AuthContext";
import Ionicons from "react-native-vector-icons/Ionicons";
import { bgColors } from "../../constants/colors";
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

    console.log(jsonReq)
    try {
      const response = await CRUDAPI.loginApi(jsonReq);
      console.log(response)

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
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#0C7BB3", "#0796A1"]}
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Card */}
        <View
          style={{
            width: "100%",
            maxWidth: 380,
            backgroundColor: "#4fa3c7",
            borderRadius: 24,
            paddingHorizontal: 24,
            paddingVertical: 24,
          }}
        >
          {/* Title */}
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#fff",
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            Votabase
          </Text>

          {/* First Name */}
          <Text style={{ color: "#fff", marginBottom: 6 }}>First Name</Text>
          <TextInput
            style={{
              backgroundColor: "#6bb6d6",
              paddingHorizontal: 16,
              height: 38,
              marginBottom: 18,
              color: "#fff",
            }}
            placeholder="First Name"
            placeholderTextColor="#d0e7f2"
            value={firstName}
            onChangeText={setFirstName}
          />

          {/* Mobile Number */}
          <Text style={{ color: "#fff", marginBottom: 6 }}>
            Mobile Number
          </Text>
          <TextInput
            style={{
              backgroundColor: "#6bb6d6",
              paddingHorizontal: 16,
              height: 38,
              marginBottom: 24,
              color: "#fff",
            }}
            placeholder="Mobile Number"
            placeholderTextColor="#d0e7f2"
            keyboardType="phone-pad"
            maxLength={10}
            value={mobileNumber}
            onChangeText={setMobileNumber}
          />

          {error ? (
            <Text
              style={{
                color: "red",
                textAlign: "center",
                marginBottom: 12,
                fontWeight: "500",
              }}
            >
              {error}
            </Text>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity
            className={`${bgColors.blue600} rounded-lg`}
            style={{
              paddingVertical: 14,
              marginBottom: 20,
            }}
            onPress={handleLogin}
          >
            {loading ? (
              <ActivityIndicator color="#2c6f91" />
            ) : (
              <Text
                style={{
                  textAlign: "center",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Login
              </Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "#e0f1f8",
            }}
          >
            By continuing you agree to our{" "}
            <Text style={{ textDecorationLine: "underline" }}>
              Terms & Privacy
            </Text>
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

export default LoginScreen;
