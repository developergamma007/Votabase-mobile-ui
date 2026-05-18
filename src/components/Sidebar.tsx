// SidebarModal.js
import React, { useRef, useEffect, useContext, useState } from 'react';
import {
    Animated,
    View,
    Text,
    TouchableOpacity,
    Pressable,
    Dimensions,
    Modal,
    StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SidebarModal({ visible, onClose }) {
    const { logout, setSidebarVisible, userInfo } = useContext(AuthContext);
    const navigation = useNavigation();
    const slideAnim = useRef(new Animated.Value(-width)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: visible ? 0 : -width,
            duration: 320,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    const menuItems = [
        { label: "Home", icon: "home-outline", action: () => { onClose(); navigation.navigate("Home" as any); } },
        { label: "Add Volunteer", icon: "person-add-outline", action: () => { onClose(); navigation.navigate("addVolunteer" as any); } },
        { label: "Manage Volunteers", icon: "people-outline", action: () => { onClose(); navigation.navigate("myVolunteers" as any); } },
        { label: "Volunteer Analysis", icon: "bar-chart-outline", action: () => { onClose(); navigation.navigate("volunteerAnalysis" as any); } },
        { label: "Voters Family", icon: "people-circle-outline", action: () => { onClose(); navigation.navigate("boothForFamily" as any); } },
        { label: "Logs", icon: "document-text-outline", action: () => { onClose(); navigation.navigate("Logs" as any); } },
        { label: "Settings", icon: "settings-outline", action: () => { onClose(); navigation.navigate("Settings" as any); } },
        { label: "Exit", icon: "exit-outline", action: logout, isExit: true },
    ];

    const displayName =
        (userInfo as any)?.name ||
        (userInfo as any)?.firstName ||
        (userInfo as any)?.userName ||
        'User';
    const displayEmail =
        (userInfo as any)?.email ||
        (userInfo as any)?.userName ||
        '';
    const rawRole =
        String((userInfo as any)?.role || (userInfo as any)?.assignmentType || 'USER')
            .replace(/^ROLE_/, '')
            .toUpperCase();
    const displayRole = `${rawRole} Account`;
    const initialSeed = displayEmail || displayName || 'U';

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.container}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                
                <Animated.View
                    style={[
                        styles.sidebar,
                        { transform: [{ translateX: slideAnim }] }
                    ]}
                >
                    <LinearGradient
                        colors={["#0F172A", "#1E293B"]}
                        style={styles.gradient}
                    >
                        {/* Sidebar Header */}
                        <View style={styles.header}>
                            <View style={styles.profileCircle}>
                                <Text style={styles.profileInitial}>
                                    {initialSeed.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.headerInfo}>
                                <Text style={styles.userName} numberOfLines={1}>
                                    {displayEmail || displayName}
                                </Text>
                                <Text style={styles.userRole} numberOfLines={1}>
                                    {displayRole}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        {/* Menu Items */}
                        <View style={styles.menuContainer}>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity 
                                    key={`${item.label}-${index}`} 
                                    style={[styles.menuItem, item.isExit && styles.exitItem]} 
                                    onPress={item.action}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: item.isExit ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)' }]}>
                                        <Ionicons 
                                            name={item.icon} 
                                            size={20} 
                                            color={item.isExit ? '#EF4444' : '#fff'} 
                                        />
                                    </View>
                                    <Text style={[styles.menuLabel, item.isExit && styles.exitLabel]}>
                                        {item.label}
                                    </Text>
                                    {!item.isExit && <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.versionText}>Votabase v2.0.4</Text>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sidebar: {
        width: width * 0.8,
        height: '100%',
        backgroundColor: '#0F172A',
        shadowColor: "#000",
        shadowOffset: { width: 10, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
    },
    gradient: {
        flex: 1,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    profileCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    profileInitial: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerInfo: {
        flex: 1,
    },
    userName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    userRole: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 2,
    },
    closeBtn: {
        padding: 5,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginHorizontal: 20,
        marginBottom: 20,
    },
    menuContainer: {
        paddingHorizontal: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginBottom: 8,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    menuLabel: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    exitItem: {
        marginTop: 20,
    },
    exitLabel: {
        color: '#EF4444',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        width: '100%',
        alignItems: 'center',
    },
    versionText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        letterSpacing: 1,
    }
});
