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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { bgColors } from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        { label: "Home", icon: "home-outline", action: () => { } },
        userInfo && userInfo?.role == "ADMIN" && { label: "Add Volunteer", icon: "person-add-outline", action: () => navigation.navigate("addVolunteer") },
        userInfo && userInfo?.role == "ADMIN" && { label: "My Volunteers", icon: "people-outline", action: () => navigation.navigate("myVolunteers") },
        { label: "Logs", icon: "document-text-outline", action: () => navigation.navigate("Logs") },
        { label: "Settings", icon: "settings-outline", action: () => navigation.navigate("Settings") },
        { label: "Exit", icon: "exit-outline", action: logout },
    ].filter(Boolean);;

    return (
        <Modal transparent visible={visible} animationType="none">
            <Pressable
                className={`flex-1 ${bgColors.black30}`}
                onPress={onClose}
                style={{ height: height / 2 }}
            />
            <Animated.View
                style={{
                    transform: [{ translateX: slideAnim }],
                    width: "100%",
                }}
                className="absolute left-0 top-32 w-full h-full"
            >
                <View
                    style={{
                        backgroundColor: '#0E88C6',
                        padding: 25,
                        borderRadius: 25,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOpacity: 0.2,
                        shadowRadius: 18,
                        shadowOffset: { height: 10 },
                        height: '100%',
                    }}
                >
                    {/* Header */}
                    <TouchableOpacity onPress={onClose} className='flex-row mb-5'>
                        <Ionicons name="chevron-back" size={26} color="white" />
                        <Text className="text-white text-2xl font-semibold">Go back</Text>
                    </TouchableOpacity>
                    <View
                        style={{
                            backgroundColor: '#086C94',
                            paddingVertical: 20,
                            borderRadius: 20,
                            marginTop: 70,
                        }}
                    >

                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                className="flex-row items-center px-6 py-5 border-b border-white/10"
                                onPress={() => {
                                    item.action();
                                    setSidebarVisible(false);
                                }}
                            >
                                {/* Icon Box */}
                                <View
                                    style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 8,
                                        marginRight: 20,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Ionicons
                                        name={item.icon}
                                        size={22}
                                        color="white"
                                        style={{ opacity: 1 }}
                                    />
                                </View>

                                <Text className="text-white text-lg">{item.label}</Text>
                            </TouchableOpacity>
                        ))}

                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
}
