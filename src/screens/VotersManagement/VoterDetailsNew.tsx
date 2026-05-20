import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
    Platform,
    ActivityIndicator
} from "react-native";

import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView } from "react-native-webview";
import { CRUDAPI, getAssemblyCode, GOOGLE_MAPS_API_KEY } from "../../apis/Api";
import { addLog, updateLogStatus } from "../../components/LogsHelpers";
import { AuthContext } from "../../context/AuthContext";
import { bgColors } from "../../constants/colors";
import { GetCurrentLocation } from "../../components/GetCurrentLocation";
import DropDownPicker from "react-native-dropdown-picker";
import { PrinterHelper } from "../../components/PrinterHelper";

export default function VoterInfo({ navigation, route }) {
    const { voter, booth } = route.params;
    const { setBanner } = useContext(AuthContext);

    const [activeTab, setActiveTab] = useState("PRIMARY");
    const [location, setLocation] = useState(
        voter?.latitude && voter?.longitude ? { latitude: voter.latitude, longitude: voter.longitude } : null
    );
    const [selectedVoter, setSelectedVoter] = useState(voter || {});
    const [customValues, setCustomValues] = useState({});
    const [language, setLanguage] = useState("en");
    const [openDropdown, setOpenDropdown] = useState(null);
    const [govtSchemeItems, setGovtSchemeItems] = useState<Array<{ label: string, value: string }>>([]);
    const [pollDayEnabled, setPollDayEnabled] = useState(false);
    const [printTemplate, setPrintTemplate] = useState(null);
    const [saving, setSaving] = useState(false);

    const presentAddressRef = useRef<TextInput>(null);

    const mapHtml = useMemo(() => {
        const lat = Number(location?.latitude || voter?.latitude || 12.9716);
        const lng = Number(location?.longitude || voter?.longitude || 77.5946);
        return `<!doctype html><html><head><meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" /><style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style></head><body><div id="map"></div><script>function initMap(){var p={lat:${lat},lng:${lng}};var m=new google.maps.Map(document.getElementById('map'),{zoom:15,center:p,mapTypeControl:false,streetViewControl:false});new google.maps.Marker({position:p,map:m});}</script><script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap"></script></body></html>`;
    }, [location?.latitude, location?.longitude, voter?.latitude, voter?.longitude]);

    const [form, setForm] = useState({
        mobile: voter?.mobile || "",
        dob: voter?.dob || "",
        community: voter?.community || "",
        caste: voter?.caste || "",
        motherTongue: voter?.motherTongue || "",
        education: voter?.education || "",
        residenceType: voter?.residenceType || "",
        ownership: voter?.ownership || "",
        voterPoints: voter?.voterPoints || "",
        govtSchemeTracking: Array.isArray(voter?.govtSchemeTracking) ? voter.govtSchemeTracking : (voter?.govtSchemeTracking ? [voter.govtSchemeTracking] : []),
        engagementPotential: voter?.engagementPotential || "",
        ifShifted: voter?.ifShifted || "",
        status: voter?.status || "",
        civicIssue: voter?.civicIssue || "",
        natureOfVoter: voter?.natureOfVoter || "",
        notes: voter?.notes || "",
        presentAddress: voter?.presentAddress || "",
        newWard: voter?.newWard || "",
        newBoothNo: voter?.newBoothNo || "",
        newSerialNo: voter?.newSerialNo || "",
        notAvailableReason: voter?.notAvailableReason || "",
    });

    const fieldLabels = {
        mobile: "Mobile Number (10 Digits)",
        dob: "Date of Birth",
        caste: "Caste",
        community: "Community",
        civicIssue: "Civic Issues",
        natureOfVoter: "Nature (A/B/C/NA)",
        education: "Education",
        motherTongue: "Mother Tongue",
        residenceType: "Residence Type",
        ownership: "Ownership",
        voterPoints: "Voter Points",
        govtSchemeTracking: "Govt Scheme Tracking",
        engagementPotential: "Engagement Potential",
        ifShifted: "If shifted - Transport & Booth Details",
        status: "Availability",
        notes: "ENTER NOTES"
    };

    const primaryKeys = ["mobile", "dob", "caste", "community", "civicIssue", "natureOfVoter"];
    const additionalKeys = ["education", "motherTongue", "residenceType", "ownership", "voterPoints", "govtSchemeTracking", "engagementPotential", "ifShifted"];

    const dropdownOptions = {
        community: ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Others"],
        caste: ["Lingayat", "Vokkaliga", "Brahmin", "Yadava / Golla", "Kuruba", "Idiga / Billava", "Vishwakarma", "Devanga", "Nayaka / Naik", "Kumbara", "Madivala / Dhobi", "Uppara", "Besta", "Bhovi", "Holeya", "Madiga", "Adi Karnataka", "Lambani / Banjara", "Soliga", "Jenukuruba", "Kadu Kuruba", "Iruliga", "Muslim", "Christian", "Jain", "Bunt", "Kodava", "Maratha", "Mogaveera", "Tuluva", "Others"],
        motherTongue: ["Kannada", "Telugu", "Tamil", "Hindi", "Urdu", "Tulu", "Malayalam", "Konkani", "Marathi", "Lambani", "Kodava", "Sanskrit", "Gujarati", "Sindhi", "Punjabi", "Bengali", "Odia", "Others"],
        education: ["Illiterate", "Primary School (1\u20135)", "Middle School (6\u20138)", "SSLC (10th Pass)", "PUC (12th Pass)", "Diploma", "ITI", "Undergraduate Degree", "Postgraduate Degree", "Professional Degree (BE, MBBS, CA, etc.)", "PhD / Research", "Others"],
        residenceType: ["Layout", "Apartment", "Villa", "Independent House", "Slum Area", "Gated Community", "Chawl / Line House", "Row House", "Quarters (Govt / Company)", "Farm House", "Others"],
        ownership: ["Own House", "Rented House", "Leased House", "Relative\u2019s House", "Hostel / PG", "Quarters (Government / Company)", "Slum / Informal Housing", "Homeless", "Others"],
        status: ["None", "Available", "Shifted in the ward", "Shifted outside the ward", "Recommend shift to the new ward", "Not available"],
        civicIssue: ["Road Damage / Potholes", "Traffic Congestion", "Water Supply Issues", "Drinking Water Quality", "Sewage / Drainage Problems", "Stormwater Drain Overflow", "Garbage Collection Issues", "Waste Management / Dumping", "Streetlight Not Working", "Public Safety Issues", "Law and Order Problems", "Electricity Supply Issues", "Lack of Public Transport", "Bus Stop / Metro Issues", "Park and Playground Issues", "Health Facility Issues", "Hospital / Primary Health Centre Issues", "School / Education Issues", "Encroachment Problems", "Flooding During Rain", "Pollution (Air / Water / Noise)", "Mosquito Menace", "Stray Dogs Issue", "Property Tax / Documentation Issues", "Lack of Government Services Access", "Housing Problems / Slum Issues", "Employment Issues", "Price Rise / Inflation Issues", "Corruption in Local Offices", "Drain Cleaning Required", "Footpath Encroachment / Bad Footpaths", "Lake Pollution / Lake Encroachment", "Ration Card Issues", "Aadhaar / ID Documentation Issues", "Women's Safety Issues", "Senior Citizens Issues", "Welfare Scheme Issues (Pension / Subsidy Delay)", "Public Toilet Issues", "Tree Fall / Tree Cutting Issues", "Street Vendors Management Issue", "Parking Problems", "Borewell Issues", "Road Widening / Infrastructure Issues", "Others"],
        natureOfVoter: ["A", "B", "C", "NA", "Others"],
        voterPoints: ["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "Others"],
        govtSchemeTracking: ["Gruha Lakshmi (Household Cash Transfer)", "Griha Jyothi (Electricity Subsidy)", "Annabhagya (Food / Ration Support)", "Shakti (Free / Concessional Bus Travel for Women)", "Yuva Nidhi (Unemployed Youth Stipend & Skilling)", "CM Kaushalya / Kaushalya Karnataka Yojane (Skill Training)", "Nanna Guruthu (SC/ST Document Digitization)", "ELEVATE (Startup Grant / Seed Funding)", "Arogya Karnataka (State Health Scheme)", "Grama Vikasa / Gramabhivruddi Programmes (Rural Development)", "Soura Belaku (Rooftop Solar Subsidy)", "Thayi Bhagya (Mother & Child / Girl Child Welfare)", "Yuvanidhi / Youth Employment Schemes", "Local District-Level Schemes", "Pradhan Mantri Awas Yojana (PMAY \u2013 Urban / Gramin)", "Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA)", "Ayushman Bharat / PM-JAY (Health Insurance)", "Jal Jeevan Mission (Piped Drinking Water)", "Swachh Bharat Mission (Sanitation)", "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)", "Pradhan Mantri Fasal Bima Yojana (Crop Insurance)", "Ujjwala Yojana (LPG Connections)", "PM Surya / Rooftop Solar Subsidy", "PM SVANidhi (Street Vendor Micro-Credit)", "PM Kaushal Vikas Yojana (PMKVY / Skill India)", "National Social Assistance Programme (Pensions)", "Beti Bachao Beti Padhao", "Atal Pension Yojana", "National Scholarship / Scholarship Schemes", "Others"],
        engagementPotential: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Others"]
    };

    const handleChange = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (key === "status" && (value === "Shifted outside the ward" || value === "Shifted in the ward")) {
            setTimeout(() => presentAddressRef.current?.focus(), 100);
        }
    };

    useEffect(() => {
        const initializeData = async () => {
            const lang = await AsyncStorage.getItem("app_language") || "en";
            setLanguage(lang);

            const json = await AsyncStorage.getItem("assemblyData");
            if (json) {
                try {
                    const parsed = JSON.parse(json);
                    const updatedVoter = parsed.assembly?.wards
                        ?.flatMap((w) => w.booths)
                        ?.flatMap((b) => b.voters)
                        ?.find((v) => v.voterId === voter.voterId);

                    if (updatedVoter) {
                        setSelectedVoter(updatedVoter);
                        const newForm = { ...form };
                        Object.keys(form).forEach(key => {
                            if (updatedVoter[key] !== undefined) {
                                if (key === "govtSchemeTracking") {
                                    newForm[key] = Array.isArray(updatedVoter[key]) ? updatedVoter[key] : [updatedVoter[key]];
                                } else {
                                    newForm[key] = updatedVoter[key];
                                }
                            }
                        });
                        setForm(newForm);
                    }
                } catch (err) { console.error("Error parsing assembly data", err); }
            }

            const code = await getAssemblyCode().catch(() => voter.assemblyCode || '000000000151');
            CRUDAPI.fetchPollDayConfig(code).then(config => setPollDayEnabled(config?.enabled || false)).catch(() => {});
            CRUDAPI.fetchMessageTemplate(voter.wardCode || booth?.wardId, 'PRINT').then(res => setPrintTemplate(res?.data?.result || res?.result || res || {})).catch(() => {});
        };

        initializeData();
        setGovtSchemeItems(dropdownOptions.govtSchemeTracking.map(item => ({ label: item, value: item })));
    }, []);

    const fetchLocation = async () => {
        const loc = await GetCurrentLocation();
        if (loc) {
            setLocation(loc);
            setBanner({ type: "success", message: "Location captured successfully!" });
        } else {
            setBanner({ type: "error", message: "Unable to fetch location. Please check permissions." });
        }
    };

    const handleReset = () => {
        setForm({
            mobile: "", dob: "", community: "", caste: "", motherTongue: "", education: "", residenceType: "",
            ownership: "", voterPoints: "", govtSchemeTracking: [], engagementPotential: "", ifShifted: "",
            status: "", civicIssue: "", natureOfVoter: "", notes: "", presentAddress: "", newWard: "",
            newBoothNo: "", newSerialNo: "", notAvailableReason: "",
        });
        setCustomValues({});
    };

    const buildWhatsAppMessage = () => {
        const voterName = selectedVoter.firstMiddleNameEn || voter.firstMiddleNameEn || "-";
        const epic = selectedVoter.epicNo || voter.epicNo || "-";
        const boothNo = booth?.boothId || voter?.boothNo || "-";
        const serial = selectedVoter.serialNo || voter.serialNo || "-";
        const bName = booth?.boothNameEn || "-";
        const bAddress = booth?.address || "";

        return `\u270A *LOK SABHA ELECTION \u2013 2024*\n\n*Assembly:* 160 \u2013 Sarvagnanagara\n\n*Voter Name:* ${voterName}\n*EPIC ID:* ${epic}\n*Booth No:* ${boothNo}\n*Serial No:* ${serial}\n\n*Polling Booth:*\n${bName}\n${bAddress}\n\n\ud83d\udcc5 *Date:* 26-Apr-2024\n\u23f0 *Time:* 7:00 AM \u2013 6:00 PM\n\n\ud83d\ude4f Kindly cast your valuable vote.\n\n\u2014 Thank you`.trim();
    };

    const buildSMSMessage = () => {
        const voterName = selectedVoter.firstMiddleNameEn || voter.firstMiddleNameEn || "-";
        const epic = selectedVoter.epicNo || voter.epicNo || "-";
        const boothNo = booth?.boothId || voter?.boothNo || "-";
        const serial = selectedVoter.serialNo || voter.serialNo || "-";
        const bName = booth?.boothNameEn || "-";
        const bAddress = booth?.address || "";

        return `LOK SABHA ELECTION - 2024\n\nAssembly: 160 - SARVAGNANAGARA\n\nVoter Name: ${voterName}\nEPIC ID: ${epic}\nBooth No: ${boothNo} | Serial No: ${serial}\n\nPolling Booth:\n${bName}\n${bAddress}\n\nDate: 26-APR-2024\nTime: 7:00 AM - 6:00 PM\n\nKindly cast your valuable vote.\n\nThank you`.trim();
    };

    const openAction = (type) => {
        const phone = form.mobile || voter.mobile;
        if (!phone || phone.length !== 10) {
            Alert.alert("Error", "Valid 10-digit mobile number required");
            return;
        }

        if (type === 'call') {
            Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("Error", "Unable to open dialer"));
        } else if (type === 'sms') {
            const msg = buildSMSMessage();
            const url = Platform.OS === "ios" ? `sms:${phone}&body=${encodeURIComponent(msg)}` : `sms:${phone}?body=${encodeURIComponent(msg)}`;
            Linking.openURL(url).catch(() => Alert.alert("Error", "SMS not supported"));
        } else if (type === 'whatsapp') {
            const msg = buildWhatsAppMessage();
            const url = `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
            Linking.openURL(url).catch(() => Alert.alert("Error", "WhatsApp not installed"));
        }
    };

    const handleUpdate = async () => {
        if (!location?.latitude || !location?.longitude) {
            setBanner({ type: "error", message: "Location is required to update voter info." });
            return;
        }

        setSaving(true);
        const finalData = { ...form };
        // Handle "Others" logic
        Object.keys(customValues).forEach(key => {
            if (form[key] === "Others" && customValues[key]) {
                finalData[key] = customValues[key];
            }
        });

        const logId = await addLog(`Updated voter #${voter.epicNo}`, voter, booth, "pending", location);

        try {
            const assemblyData = await AsyncStorage.getItem('assemblyData');
            if (assemblyData) {
                const parsed = JSON.parse(assemblyData);
                parsed.assembly.wards = parsed.assembly.wards.map(w => ({
                    ...w, booths: w.booths.map(b => ({
                        ...b, voters: b.voters.map(v => v.voterId === voter.voterId ? { ...v, ...finalData, latitude: location.latitude, longitude: location.longitude } : v)
                    }))
                }));
                await AsyncStorage.setItem('assemblyData', JSON.stringify(parsed));
                setSelectedVoter(prev => ({ ...prev, ...finalData }));
            }

            const res = await CRUDAPI.updateVoter(voter.epicNo, {
                updateLocationLat: location.latitude,
                updateLocationLng: location.longitude,
                updateRequest: { ...finalData, latitude: location.latitude, longitude: location.longitude }
            }, { boothNo: voter?.boothNo, wardCode: voter?.wardCode || booth?.wardId });

            if (res.success) {
                await updateLogStatus(logId, "server");
                setBanner({ type: "success", message: "Voter Info updated successfully!" });
            }
        } catch (error) {
            setBanner({ type: "error", message: "Saved locally, sync pending." });
        } finally {
            setSaving(false);
        }
    };

    const renderField = (key, label) => {
        if (key === "mobile" || key === "dob" || key === "ifShifted" || key === "presentAddress" || key === "newWard" || key === "newBoothNo" || key === "newSerialNo" || key === "notAvailableReason") {
            return (
                <View key={key} style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>{label}</Text>
                    <TextInput
                        value={form[key]}
                        keyboardType={key === "mobile" ? "number-pad" : "default"}
                        placeholder={label}
                        placeholderTextColor="#94A3B8"
                        style={{ borderWidth: 1, borderColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "white", color: "#1F2937", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                        onChangeText={(text) => handleChange(key, text)}
                        multiline={key === "presentAddress" || key === "notes"}
                        numberOfLines={key === "presentAddress" ? 3 : 1}
                    />
                </View>
            );
        }

        const isMulti = key === "govtSchemeTracking";
        const items = dropdownOptions[key]?.map(opt => ({ label: opt, value: opt })) || [];

        return (
            <View key={key} style={{ marginBottom: 16, zIndex: openDropdown === key ? 1000 : 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>{label}</Text>
                <DropDownPicker
                    open={openDropdown === key}
                    value={form[key]}
                    items={isMulti ? govtSchemeItems : items}
                    setOpen={(isOpen) => setOpenDropdown(isOpen ? key : null)}
                    setValue={(callback) => {
                        const val = callback(form[key]);
                        handleChange(key, val);
                    }}
                    multiple={isMulti}
                    mode="BADGE"
                    placeholder={`Select ${label}`}
                    listMode="SCROLLVIEW"
                    style={{ backgroundColor: "#ffffff", borderColor: "#F3F4F6", borderRadius: 12, minHeight: 52 }}
                    dropDownContainerStyle={{ backgroundColor: "#ffffff", borderColor: "#F3F4F6", elevation: 5, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 }}
                    textStyle={{ color: "#1F2937", fontSize: 14, fontWeight: "600" }}
                    placeholderStyle={{ color: "#94A3B8" }}
                    badgeColors={["#3B82F6"]}
                    badgeTextStyle={{ color: "#fff" }}
                />
                {form[key] === "Others" && (
                    <TextInput
                        placeholder={`Enter ${label.toLowerCase()}`}
                        value={customValues[key]}
                        onChangeText={t => setCustomValues(prev => ({ ...prev, [key]: t }))}
                        style={{ marginTop: 8, borderStyle: "dashed", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#EFF6FF", color: "#1F2937" }}
                    />
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: "white" }}>
            {/* Header */}
            <ScrollView style={{ flex: 1, paddingHorizontal: 20, marginTop: 10 }} showsVerticalScrollIndicator={false}>
                {/* Voter Details Card */}
                <View style={{ backgroundColor: "#F9FAFB", borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: "#F3F4F6" }}>
                    <View style={{ gap: 16 }}>
                        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#111827", width: 112 }}>Name</Text>
                            <Text style={{ fontSize: 14, color: "#374151", flex: 1 }}>{language === 'en' ? (voter.firstMiddleNameEn || "-").toUpperCase() : voter.firstMiddleNameLocal}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#111827", width: 112 }}>EPIC / Voter ID</Text>
                            <Text style={{ fontSize: 14, color: "#374151", flex: 1 }}>{voter.epicNo || "-"}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#111827", width: 112 }}>Polling Booth</Text>
                            <Text style={{ fontSize: 14, color: "#374151", flex: 1 }}>
                                {booth?.boothId || voter?.boothId || voter?.boothNo || "-"} - {
                                    language === 'en' 
                                    ? (booth?.boothNameEn || voter?.boothNameEn || voter?.boothLabel || voter?.pollingStationAdrEn || voter?.pollingStationNameEn || voter?.boothName || "-") 
                                    : (booth?.boothNameLocal || voter?.boothNameLocal || voter?.pollingStationAdrLocal || "-")
                                }
                            </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#111827", width: 112 }}>Ward</Text>
                            <Text style={{ fontSize: 14, color: "#374151", flex: 1 }}>
                                {voter.wardCode || booth?.wardId || voter?.wardId || "-"} - {
                                    booth?.wardNameEn || voter?.wardNameEn || (language === 'en' ? "Vibhootipura" : "ವಿಭೂತಿಪುರ")
                                }
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Map Section */}
                <View style={{ marginBottom: 24 }}>
                    <View
                        style={{
                            height: 200,
                            borderRadius: 24,
                            overflow: "hidden",
                            borderWidth: 1,
                            borderColor: "#E2E8F0",
                            backgroundColor: "#EFF6FF",
                        }}
                    >
                        <WebView
                            originWhitelist={["*"]}
                            source={{ html: mapHtml }}
                            style={{ flex: 1, backgroundColor: "transparent" }}
                            scrollEnabled={false}
                            nestedScrollEnabled
                        />
                    </View>
                    {location ? (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => {
                                const url = Platform.select({
                                    ios: `maps:0,0?q=${location.latitude},${location.longitude}`,
                                    android: `geo:0,0?q=${location.latitude},${location.longitude}`,
                                });
                                Linking.openURL(url || "");
                            }}
                            style={{ marginTop: 10, alignSelf: "flex-end" }}
                        >
                            <Text style={{ fontSize: 12, color: "#2563EB", fontWeight: "700" }}>
                                Open in Maps
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        onPress={fetchLocation}
                        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 16, marginTop: 16, shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
                    >
                        <Ionicons name="location" size={20} color="white" />
                        <Text style={{ color: "white", fontSize: 16, fontWeight: "bold", marginLeft: 8 }}>Location Captured</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 32, gap: 12 }}>
                    <TouchableOpacity onPress={() => openAction('sms')} style={{ flex: 1, height: 56, backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="chatbubble-outline" size={22} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openAction('whatsapp')} style={{ flex: 1, height: 56, backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="logo-whatsapp" size={22} color="#22C55E" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openAction('call')} style={{ flex: 1, height: 56, backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="call-outline" size={22} color="#3B82F6" />
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 6, marginBottom: 32 }}>
                    {["PRIMARY", "ADDITIONAL", "NOTES"].map(tab => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                borderRadius: 12,
                                backgroundColor: activeTab === tab ? "#2563EB" : "transparent"
                            }}
                        >
                            <Text style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: activeTab === tab ? "white" : "#6B7280" }}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Form Sections */}
                <View style={{ marginBottom: 40 }}>
                    {activeTab === "PRIMARY" && primaryKeys.map(k => renderField(k, fieldLabels[k]))}
                    {activeTab === "ADDITIONAL" && additionalKeys.map(k => renderField(k, fieldLabels[k]))}
                    {activeTab === "NOTES" && (
                        <>
                            {renderField("status", "Available")}
                            {(form.status && form.status.includes("Shifted")) && renderField("presentAddress", "Enter present address")}
                            {form.status === "Recommend shift to the new ward" && (
                                <View style={{ gap: 16 }}>
                                    {renderField("newWard", "Ward")}
                                    {renderField("newBoothNo", "Booth No")}
                                    {renderField("newSerialNo", "Serial No")}
                                </View>
                            )}
                            {form.status === "Not available" && renderField("notAvailableReason", "Enter the reason")}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>ENTER NOTES</Text>
                                <TextInput
                                    multiline
                                    numberOfLines={5}
                                    value={form.notes}
                                    onChangeText={t => handleChange("notes", t)}
                                    placeholder="Enter notes"
                                    style={{ borderWidth: 1, borderColor: "#F3F4F6", borderRadius: 12, padding: 16, backgroundColor: "white", color: "#1F2937", height: 120, textAlignVertical: "top" }}
                                />
                            </View>
                        </>
                    )}
                </View>

                {/* Footer Actions */}
                <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
                    <TouchableOpacity onPress={handleReset} style={{ flex: 1, backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 16, borderRadius: 16 }}>
                        <Text style={{ textAlign: "center", fontWeight: "bold", color: "#111827", fontSize: 16 }}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={handleUpdate} 
                        disabled={saving}
                        style={{ flex: 1, backgroundColor: "#94A3B8", paddingVertical: 16, borderRadius: 16 }}
                    >
                        {saving ? <ActivityIndicator color="white" /> : <Text style={{ textAlign: "center", fontWeight: "bold", color: "white", fontSize: 16 }}>Update</Text>}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={async () => {
                        const slip = PrinterHelper.formatVoterSlip(selectedVoter, booth, printTemplate);
                        const connected = await AsyncStorage.getItem('connectedPrinter');
                        const printer = connected ? JSON.parse(connected) : null;
                        const success = await PrinterHelper.performPrint(printer, slip);
                        if (success) setBanner({ type: "success", message: "Print command sent!" });
                    }}
                    style={{ backgroundColor: "#B0BAD2", paddingVertical: 20, borderRadius: 16, marginBottom: 48 }}
                >
                    <Text style={{ textAlign: "center", fontWeight: "bold", color: "white", fontSize: 16 }}>Voter Slip Print</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
