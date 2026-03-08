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
import ListVoter from '../screens/VotersManagement/VotersList';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import Logs from '../screens/VotersManagement/Logs';
import { AuthContext } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Settings from '../screens/Settings';
import AddVolunteer from '../screens/VolunteersManagement/AddVolunteer';
import MyVolunteers from '../screens/VolunteersManagement/MyVolunteers';
import BoothForFamily from '../screens/FamilyManagement/BoothSelectionToGetFamilies';
import Families from '../screens/FamilyManagement/FamiliesInParticularBooth';
import { bgColors } from '../constants/colors';
import VoterFamilyDetails from '../screens/FamilyManagement/DetailsOfParticularFamily';
import AddFamilyDetails from '../screens/FamilyManagement/AddOrEditFamilyDetails';
import VoterDetails from '../screens/VotersManagement/VoterDetailsNew';
import Meetings from '../screens/Dashboard/Meetings';
import PrinterScreen from '../screens/Dashboard/PrinterScreen';
import PollDayVoters from '../screens/Dashboard/PollDay';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  const { sidebarVisible, setSidebarVisible, banner } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const HeaderGradient = ({
    colors = ["#0C7BB3", "#0C7BB3"],
    start = { x: 0, y: 0 },
    end = { x: 1, y: 1 },
  }) => {
    return (
      <LinearGradient
        colors={colors}
        start={start}
        end={end}
        style={{ flex: 1 }}
      />
    );
  };
  const HeaderLeft = ({ onPress }) => (
    <TouchableOpacity onPress={onPress} style={{
      width: 30,
      height: 30,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 3,
    }}>
      <Ionicons name="menu" size={30} color="black" />
    </TouchableOpacity>
  );

  const HeaderProfile = () => (
    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ marginLeft: 2 }}>
      <Ionicons name="person-circle-outline" size={32} color="black" />
    </TouchableOpacity>
  );

  return (
    <>
      {
        <SidebarModal
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
        />
      }
      {banner.type && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 50, // 👈 adaptive spacing
            left: 0,
            right: 0,
            height: 40,
            zIndex: 50,
          }}
          className={`
          justify-center items-center
          ${banner.type === "success" ? bgColors.green600 : bgColors.red600}
          `}
          >
          <Text className="text-white text-center font-semibold px-4">
            {banner.message}
          </Text>
        </View>

      )}
      <Stack.Navigator>
        <Stack.Screen name="Load Data" component={LoadData} options={{ title: 'Load data', headerBackButtonDisplayMode: 'minimal' }} />
        <Stack.Screen name="Home" component={LandingPage} options={{
          title: 'Home',
          headerBackVisible: false,
          headerLeft: () => <HeaderLeft onPress={() => setSidebarVisible(true)} />,
          headerBackground: () => <HeaderGradient />,
          headerRight: () => (<HeaderProfile />),
          headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' }
        }} />
        <Stack.Screen name="Search Voter" component={SearchVoter} options={{ title: 'Search Voter', headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerRight: () => (<HeaderProfile />), headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="Search Booth" component={SearchBooth} options={{ title: 'Search Booth', headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerRight: () => (<HeaderProfile />), headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="Voter List" component={ListVoter} options={{ title: "Voters List", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerRight: () => (<HeaderProfile />), headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="Voter Info" component={VoterDetails} options={{ title: "Voter Info", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerRight: () => (<HeaderProfile />), headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="Profile" component={MyProfile} options={{ title: "Profile", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="Logs" component={Logs} options={{ title: "Logs", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="Settings" component={Settings} options={{ title: "Settings", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="addVolunteer" component={AddVolunteer} options={{ title: "Add Volunteer", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="myVolunteers" component={MyVolunteers} options={{ title: "My Volunteers", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="addFamilyDetails" component={AddFamilyDetails} options={{ title: "Voter's Family", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="boothForFamily" component={BoothForFamily} options={{ title: "Select Booth", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="families" component={Families} options={{ title: "Families", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="voterFamilyDetails" component={VoterFamilyDetails} options={{ title: "", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="meetings" component={Meetings} options={{ title: "Meetings", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="pollDay" component={PollDayVoters} options={{ title: "Poll Day", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
        <Stack.Screen name="print" component={PrinterScreen} options={{ title: "Print", headerBackButtonDisplayMode: 'minimal', headerBackground: () => <HeaderGradient />, headerTintColor: "#fff", headerTitleAlign: "center", headerTitleStyle: { color: '#fff', fontWeight: 'bold' } }} />
      </Stack.Navigator>
    </>
  );
}
