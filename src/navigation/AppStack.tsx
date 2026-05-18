// src/navigation/AppStack.tsx
import React, { useContext, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingPage from '../screens/LoginManagement/Home';
import MyProfile from '../screens/LoginManagement/MyProfile';
import { getHeaderTitle } from '@react-navigation/elements';
import SearchBooth from '../screens/VotersManagement/SearchBooth';
import SearchVoter from '../screens/VotersManagement/SearchVoterNew';
import { Text, TouchableOpacity, View } from 'react-native';
import SidebarModal from '../components/Sidebar';
import LoadData from '../screens/LoginManagement/LoadData';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import Logs from '../screens/VotersManagement/Logs';
import { AuthContext } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Settings from '../screens/Settings';
import AddVolunteer from '../screens/VolunteersManagement/AddVolunteer';
import MyVolunteers from '../screens/VolunteersManagement/MyVolunteers';
import VolunteerAnalysis from '../screens/VolunteersManagement/VolunteerAnalysis';
import BoothForFamily from '../screens/FamilyManagement/BoothSelectionToGetFamilies';
import Families from '../screens/FamilyManagement/FamiliesInParticularBooth';
import { bgColors } from '../constants/colors';
import VoterFamilyDetails from '../screens/FamilyManagement/DetailsOfParticularFamily';
import AddFamilyDetails from '../screens/FamilyManagement/AddOrEditFamilyDetails';
import VoterDetails from '../screens/VotersManagement/VoterDetailsNew';
import Meetings from '../screens/Dashboard/Meetings';
import PrinterScreen from '../screens/Dashboard/PrinterScreen';
import PollDayVoters from '../screens/Dashboard/PollDay';
import Promotions from '../screens/Dashboard/Promotions';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  const { sidebarVisible, setSidebarVisible, banner } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const HeaderGradient = () => (
    <LinearGradient
      colors={["#0F172A", "#1E3A8A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ flex: 1 }}
    />
  );

  const HeaderLeft = ({ onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 4,
        paddingVertical: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 0,
        marginTop: -2,
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
        borderRadius: 0,
        shadowOpacity: 0,
        elevation: 0,
      }}
    >
      <Ionicons name="menu-outline" size={28} color="#FFFFFF" style={{ backgroundColor: 'transparent' }} />
    </TouchableOpacity>
  );

  const HeaderProfile = () => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile' as never)}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 4,
        paddingVertical: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 0,
        marginTop: -2,
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
        borderRadius: 0,
        shadowOpacity: 0,
        elevation: 0,
      }}
    >
      <Ionicons name="person-outline" size={26} color="#FFFFFF" style={{ backgroundColor: 'transparent' }} />
    </TouchableOpacity>
  );

  const HeaderBack = () => (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 4,
        paddingVertical: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 0,
        marginTop: -2,
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
        borderRadius: 0,
        shadowOpacity: 0,
        elevation: 0,
      }}
    >
      <Ionicons name="chevron-back-outline" size={28} color="#FFFFFF" style={{ backgroundColor: 'transparent' }} />
    </TouchableOpacity>
  );

  return (
    <>
      <SidebarModal
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />

      {banner?.type && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 12,
            left: 20,
            right: 20,
            backgroundColor: banner.type === "success" ? "#10B981" : "#EF4444",
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <Ionicons
            name={banner.type === "success" ? "checkmark-circle" : "alert-circle"}
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 10 }}
          />
          <Text style={{
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: "700",
            textAlign: "center",
          }}>
            {banner.message}
          </Text>
        </View>
      )}

      <Stack.Navigator
        screenOptions={{
          headerBackground: () => <HeaderGradient />,
          headerStyle: { backgroundColor: 'transparent' },
          headerLeftContainerStyle: {
            backgroundColor: 'transparent',
            paddingLeft: 12,
          },
          headerRightContainerStyle: {
            backgroundColor: 'transparent',
            paddingRight: 12,
          },
          headerTintColor: "#FFFFFF",
          headerTitleAlign: "center",
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '800',
            letterSpacing: 0.5,
          },
          headerLeft: () => <HeaderBack />,
          headerRight: () => <HeaderProfile />,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Load Data"
          component={LoadData}
          options={{ title: 'Sync Data', headerLeft: () => null }}
        />
        <Stack.Screen
          name="Home"
          component={LandingPage}
          options={{
            title: 'Dashboard',
            headerLeft: () => <HeaderLeft onPress={() => setSidebarVisible(true)} />,
          }}
        />
        <Stack.Screen name="Search Voter" component={SearchVoter} options={{ title: 'Search Voter' }} />
        <Stack.Screen name="Search Booth" component={SearchBooth} options={{ title: 'Search Booth' }} />
        <Stack.Screen name="Voter Info" component={VoterDetails} options={{ title: "Voter Profile" }} />
        <Stack.Screen name="Profile" component={MyProfile} options={{ title: "My Profile", headerRight: () => null }} />
        <Stack.Screen name="Logs" component={Logs} options={{ title: "Activity Logs" }} />
        <Stack.Screen name="Settings" component={Settings} options={{ title: "App Settings" }} />
        <Stack.Screen name="addVolunteer" component={AddVolunteer} options={{ title: "Add Volunteer" }} />
        <Stack.Screen name="myVolunteers" component={MyVolunteers} options={{ title: "Manage Volunteers" }} />
        <Stack.Screen name="volunteerAnalysis" component={VolunteerAnalysis} options={{ title: "Analysis" }} />
        <Stack.Screen name="addFamilyDetails" component={AddFamilyDetails} options={{ title: "Family Details" }} />
        <Stack.Screen name="boothForFamily" component={BoothForFamily} options={{ title: "Select Booth" }} />
        <Stack.Screen name="families" component={Families} options={{ title: "Families List" }} />
        <Stack.Screen name="voterFamilyDetails" component={VoterFamilyDetails} options={{ title: "Family Info" }} />
        <Stack.Screen name="meetings" component={Meetings} options={{ title: "Meetings" }} />
        <Stack.Screen name="pollDay" component={PollDayVoters} options={{ title: "Poll Day" }} />
        <Stack.Screen name="promotions" component={Promotions} options={{ title: "Promotions" }} />
        <Stack.Screen name="print" component={PrinterScreen} options={{ title: "Thermal Print" }} />
      </Stack.Navigator>
    </>
  );
}
