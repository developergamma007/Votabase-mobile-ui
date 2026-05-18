import React, { useContext } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AuthContext } from "../../context/AuthContext";

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

type RootStackParamList = {
  Home: undefined;
  "Search Voter": undefined;
  "Search Booth": undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function LandingPage({ navigation }: Props) {
  const { userInfo } = useContext(AuthContext) as any;
  const resolvedName =
    userInfo?.name ||
    userInfo?.firstName ||
    userInfo?.userName ||
    userInfo?.email ||
    '';
  const firstName = resolvedName
    ? String(resolvedName).split('@')[0].split(' ')[0]
    : 'Member';

  const renderGridItem = (title: string, icon: string, route: string, color: string) => (
    <TouchableOpacity 
      style={styles.gridItem} 
      onPress={() => navigation.navigate(route as any)}
    >
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <Text style={styles.gridTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const renderWideCard = (title: string, sub: string, icon: string, route: string, color: string) => (
    <TouchableOpacity 
      style={styles.wideCard} 
      onPress={() => navigation.navigate(route as any)}
    >
      <View style={[styles.wideIconBox, { backgroundColor: color }]}>
        <Ionicons name={icon} size={28} color="#fff" />
      </View>
      <View style={styles.wideInfo}>
        <Text style={styles.wideTitle}>{title}</Text>
        <Text style={styles.wideSub} numberOfLines={2}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={["#0F172A", "#1E293B"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Hello, {firstName} 👋</Text>
          <Text style={styles.readyText}>Ready to manage your constituency?</Text>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.gridContainer}>
        {renderGridItem("Search Voter", "search-outline", "Search Voter", "#3B82F6")}
          {renderGridItem("Search Booth", "location", "Search Booth", "#10B981")}
        </View>

        {/* Featured Sections */}
        <View style={styles.sectionsContainer}>
          {renderWideCard(
            "Voters Family", 
            "Household-based view for outreach planning.", 
            "people", 
            "boothForFamily", 
            "#8B5CF6"
          )}
          {renderWideCard(
            "Meetings", 
            "Schedule, assign and track meeting notes.", 
            "calendar", 
            "meetings", 
            "#F59E0B"
          )}
          {renderWideCard(
            "Poll Day", 
            "Booth-wise tasks & turnout tracking.", 
            "checkbox", 
            "pollDay", 
            "#EF4444"
          )}
          {renderWideCard(
            "Promotions",
            "Configure WhatsApp/SMS campaigns ward-wise.",
            "megaphone",
            "promotions",
            "#0EA5E9"
          )}
          {renderWideCard(
            "Print", 
            "PDF/Excel exports for lists and slips.", 
            "print", 
            "print", 
            "#64748B"
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 30,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  readyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 24,
  },
  gridItem: {
    width: COLUMN_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  sectionsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  wideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  wideIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  wideInfo: {
    flex: 1,
  },
  wideTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
  },
  wideSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    lineHeight: 16,
  },
});
