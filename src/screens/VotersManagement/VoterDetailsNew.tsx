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
    ActivityIndicator,
    Modal,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView } from "react-native-webview";
import { CRUDAPI, getAssemblyCode } from "../../apis/Api";
import { buildOsmWebViewHtml } from "../../config/osmMap";
import { addLog, updateLogStatus } from "../../components/LogsHelpers";
import { AuthContext } from "../../context/AuthContext";
import { bgColors } from "../../constants/colors";
import { ACCURATE_GPS_OPTIONS, GetCurrentLocation } from "../../components/GetCurrentLocation";
import { PrinterHelper } from "../../components/PrinterHelper";
import { AppDropdown, AppMultiDropdown } from "../../components/AppDropdown";
import { androidDropdownScrollLock, premiumStyles } from "../../constants/premiumStyles";
import { premium } from "../../constants/premiumTheme";
import { buildSMSMessage, buildWhatsAppMessage } from "../../helpers/voterMessageTemplates";
import {
    buildVoterUpdateRequest,
    formStateFromVoter,
} from "../../helpers/voterUpdatePayload";

const normalizeMobileValue = (value) => String(value || "").replace(/\D/g, "").slice(0, 10);

const maskTrailingValue = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (raw.length <= 4) return raw;
    return `${"*".repeat(raw.length - 4)}${raw.slice(-4)}`;
};

const VISITED_VOTER_STORAGE_PREFIX = "voterVisited:";

const getVoterEpicKey = (voter) =>
    String(voter?.epicNo || voter?.epic || voter?.voterId || "").trim();

const isVoterMarkedVisitedLocally = async (epic) => {
    if (!epic) return false;
    try {
        return await AsyncStorage.getItem(`${VISITED_VOTER_STORAGE_PREFIX}${epic}`) === "1";
    } catch {
        return false;
    }
};

const markVoterVisitedLocally = async (epic) => {
    if (!epic) return;
    try {
        await AsyncStorage.setItem(`${VISITED_VOTER_STORAGE_PREFIX}${epic}`, "1");
    } catch {
        // Ignore storage errors; server flags still protect future loads.
    }
};

const PRIVACY_FIELD_KEYS = [
    "dob",
    "caste",
    "community",
    "civicIssue",
    "natureOfVoter",
    "motherTongue",
    "education",
    "residenceType",
    "ownership",
    "voterPoints",
    "govtSchemeTracking",
    "engagementPotential",
    "ifShifted",
    "status",
    "notes",
];

const hasSavedPrivateSurveyData = (voter) =>
    PRIVACY_FIELD_KEYS.some((key) => {
        const value = voter?.[key];
        if (Array.isArray(value)) return value.length > 0;
        return String(value ?? "").trim().length > 0;
    });

const voterWasMetByVolunteer = (voter) => {
    if (!voter) return false;
    if (voter.volunteerMet) return true;
    const fields = voter.updatedFields;
    if (Array.isArray(fields) && fields.length > 0) return true;
    if (typeof fields === "string" && fields.trim()) {
        try {
            const parsed = JSON.parse(fields);
            if (Array.isArray(parsed)) return parsed.length > 0;
        } catch {
            return true;
        }
        return true;
    }
    return Boolean(voter.updatedByName || voter.updatedByPhone || hasSavedPrivateSurveyData(voter));
};

const emptyVoterForm = () => formStateFromVoter({});

const unwrapMessageTemplate = (response) =>
    response?.data?.data?.result ||
    response?.data?.result ||
    response?.result ||
    response?.data ||
    null;

const formatBoothTitle = (no, label) => {
    const sNo = String(no || "").trim();
    const sLabel = String(label || "").trim();
    if (!sNo) return sLabel || "-";
    if (!sLabel || sLabel === "-") return sNo;
    const prefixPatterns = [`${sNo} -`, `${sNo}-`, `${sNo} `];
    if (prefixPatterns.some((p) => sLabel.startsWith(p))) return sLabel;
    return `${sNo} - ${sLabel}`;
};

export default function VoterInfo({ navigation, route }) {
    const { voter, booth } = route.params;
    const { setBanner } = useContext(AuthContext);

    const [location, setLocation] = useState(
        voter?.latitude && voter?.longitude ? { latitude: voter.latitude, longitude: voter.longitude } : null
    );
    const [selectedVoter, setSelectedVoter] = useState(voter || {});
    const [customValues, setCustomValues] = useState({});
    const [language, setLanguage] = useState("en");
    const [dropdownFocused, setDropdownFocused] = useState(false);
    const [pollDayEnabled, setPollDayEnabled] = useState(false);
    const [printTemplate, setPrintTemplate] = useState(null);
    const [whatsAppTemplate, setWhatsAppTemplate] = useState(null);
    const [smsTemplate, setSmsTemplate] = useState(null);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("PRIMARY");
    const [mobileFocused, setMobileFocused] = useState(false);
    const [formDirty, setFormDirty] = useState(false);
    const [visitDisplayMode, setVisitDisplayMode] = useState(() => voterWasMetByVolunteer(voter));

    const presentAddressRef = useRef<TextInput>(null);

    const boothNumber = booth?.boothNo || voter?.boothNo || booth?.boothId || voter?.boothId || voter?.boothNo || "";
    const boothLabel =
        booth?.boothNameEn ||
        booth?.boothLabel ||
        voter?.boothLabel ||
        voter?.boothNameEn ||
        voter?.pollingStationAdrEn ||
        voter?.pollingStationNameEn ||
        voter?.boothName ||
        voter?.boothInfo?.boothNameEn ||
        "";
    const boothTitle = formatBoothTitle(boothNumber, boothLabel);
    const boothAddress =
        booth?.address ||
        booth?.boothNameEn ||
        voter?.pollingStationAdrEn ||
        voter?.pollingStationAdrLocal ||
        (language === "en" ? booth?.boothNameEn : booth?.boothNameLocal) ||
        "";
    const wardLabel =
        booth?.wardNameEn ||
        voter?.wardNameEn ||
        voter?.wardLabel ||
        (voter.wardCode || booth?.wardId || voter?.wardId
            ? `${voter.wardCode || booth?.wardId || voter?.wardId}`
            : "-");

    const mapHtml = useMemo(() => {
        const lat = Number(location?.latitude || voter?.latitude || 12.9716);
        const lng = Number(location?.longitude || voter?.longitude || 77.5946);
        return buildOsmWebViewHtml(lat, lng, { zoom: 15 });
    }, [location?.latitude, location?.longitude, voter?.latitude, voter?.longitude]);

    const [baselineForm, setBaselineForm] = useState(() =>
        voterWasMetByVolunteer(voter) ? emptyVoterForm() : formStateFromVoter(voter)
    );
    const [form, setForm] = useState(() =>
        voterWasMetByVolunteer(voter) ? emptyVoterForm() : formStateFromVoter(voter)
    );

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
        const nextValue = key === "mobile" ? normalizeMobileValue(value) : value;
        setForm(prev => ({ ...prev, [key]: nextValue }));
        setFormDirty(true);
        if (key === "status" && (value === "Shifted outside the ward" || value === "Shifted in the ward")) {
            setTimeout(() => presentAddressRef.current?.focus(), 100);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const parseDobParts = (value) => {
        const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) {
            const now = new Date();
            return { year: now.getFullYear() - 30, month: 1, day: 1 };
        }
        return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    };

    const formatDobParts = (year, month, day) =>
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const DobDateField = ({ label, value, onChange }) => {
        const initial = parseDobParts(value);
        const [pickerOpen, setPickerOpen] = useState(false);
        const [year, setYear] = useState(initial.year);
        const [month, setMonth] = useState(initial.month);
        const [day, setDay] = useState(initial.day);
        const years = useMemo(() => {
            const current = new Date().getFullYear();
            return Array.from({ length: 100 }, (_, index) => current - index);
        }, []);
        const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
        const days = useMemo(
            () => Array.from({ length: daysInMonth }, (_, index) => index + 1),
            [daysInMonth],
        );

        useEffect(() => {
            const next = parseDobParts(value);
            setYear(next.year);
            setMonth(next.month);
            setDay(Math.min(next.day, new Date(next.year, next.month, 0).getDate()));
        }, [value]);

        const openPicker = () => {
            const parts = parseDobParts(value);
            setYear(parts.year);
            setMonth(parts.month);
            setDay(parts.day);
            setPickerOpen(true);
        };

        return (
            <View style={premiumStyles.fieldWrap}>
                <Text style={premiumStyles.label}>{label}</Text>
                <View style={premiumStyles.dobRow}>
                    <TouchableOpacity activeOpacity={0.85} onPress={openPicker} style={{ flex: 1, marginRight: 8 }}>
                        <TextInput
                            style={premiumStyles.input}
                            value={value || ""}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={premium.textLight}
                            editable={false}
                            pointerEvents="none"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={openPicker} style={premiumStyles.dobCalendarBtn}>
                        <Ionicons name="calendar-outline" size={22} color={premium.primary} />
                    </TouchableOpacity>
                </View>
                <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
                    <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" }}>
                        <View style={{ backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                                <TouchableOpacity onPress={() => setPickerOpen(false)}>
                                    <Text style={{ color: "#64748B", fontWeight: "600" }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        const safeDay = Math.min(day, daysInMonth);
                                        onChange(formatDobParts(year, month, safeDay));
                                        setPickerOpen(false);
                                    }}
                                >
                                    <Text style={{ color: "#2563EB", fontWeight: "700" }}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: "row" }}>
                                <Picker selectedValue={day} onValueChange={(item) => setDay(Number(item))} style={{ flex: 1 }}>
                                    {days.map((item) => (
                                        <Picker.Item key={`d-${item}`} label={String(item)} value={item} />
                                    ))}
                                </Picker>
                                <Picker selectedValue={month} onValueChange={(item) => setMonth(Number(item))} style={{ flex: 1 }}>
                                    {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                                        <Picker.Item key={`m-${item}`} label={String(item)} value={item} />
                                    ))}
                                </Picker>
                                <Picker selectedValue={year} onValueChange={(item) => setYear(Number(item))} style={{ flex: 1.2 }}>
                                    {years.map((item) => (
                                        <Picker.Item key={`y-${item}`} label={String(item)} value={item} />
                                    ))}
                                </Picker>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    };

    useEffect(() => {
        const initializeData = async () => {
            const lang = await AsyncStorage.getItem("app_language") || "en";
            setLanguage(lang);

            let mergedVoter = voter || {};
            const json = await AsyncStorage.getItem("assemblyData");
            if (json) {
                try {
                    const parsed = JSON.parse(json);
                    const updatedVoter = parsed.assembly?.wards
                        ?.flatMap((w) => w.booths)
                        ?.flatMap((b) => b.voters)
                        ?.find((v) => v.voterId === voter.voterId);

                    if (updatedVoter) {
                        mergedVoter = { ...voter, ...updatedVoter };
                    }
                } catch (err) { console.error("Error parsing assembly data", err); }
            }
            const epic = getVoterEpicKey(mergedVoter);
            const visited = voterWasMetByVolunteer(mergedVoter) || await isVoterMarkedVisitedLocally(epic);
            const nextForm = visited ? emptyVoterForm() : formStateFromVoter(mergedVoter);
            setSelectedVoter(mergedVoter);
            setBaselineForm(nextForm);
            setForm(nextForm);
            setVisitDisplayMode(visited);
            setCustomValues({});
            setMobileFocused(false);
            setFormDirty(false);

            const code = await getAssemblyCode().catch(() => voter.assemblyCode || '000000000151');
            CRUDAPI.fetchPollDayConfig(code).then(config => setPollDayEnabled(config?.enabled || false)).catch(() => {});

            const wardId =
                voter.wardCode ||
                booth?.wardCode ||
                booth?.wardId ||
                voter?.wardId ||
                voter?.ward_id ||
                voter?.wardNo ||
                "";
            const voterEpic = voter.epicNo || voter.epic || voter.voterId;
            const fetchChannel = async (channel) => {
                try {
                    const wardRes = await CRUDAPI.fetchMessageTemplate(wardId || null, channel, voterEpic);
                    const wardTpl = unwrapMessageTemplate(wardRes);
                    if (wardTpl) return wardTpl;
                    const globalRes = await CRUDAPI.fetchMessageTemplate(null, channel);
                    return unwrapMessageTemplate(globalRes);
                } catch {
                    return null;
                }
            };
            Promise.all([
                fetchChannel('WHATSAPP'),
                fetchChannel('SMS'),
                fetchChannel('PRINT'),
            ]).then(([waTpl, smsTpl, prnTpl]) => {
                setWhatsAppTemplate(waTpl || {});
                setSmsTemplate(smsTpl || {});
                setPrintTemplate(prnTpl || {});
            }).catch(() => {});
        };

        initializeData();
    }, []);

    const fetchLocation = async () => {
        const loc = await GetCurrentLocation(ACCURATE_GPS_OPTIONS);
        if (loc) {
            setLocation(loc);
            setFormDirty(true);
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
        setFormDirty(false);
    };

    const getMessageVoterPayload = () => ({
        ...voter,
        ...selectedVoter,
        ...form,
        relationLabel: voter?.relationType || voter?.relationLabel || "Father",
        relationName: voter?.relationFirstMiddleNameEn || voter?.relationName || voter?.fatherName || "",
        boothLabel: boothLabel || boothTitle,
    });

    const openAction = (type) => {
        const phone = form.mobile || voter.mobile;
        if (!phone || phone.length !== 10) {
            Alert.alert("Error", "Valid 10-digit mobile number required");
            return;
        }

        if (type === 'call') {
            Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("Error", "Unable to open dialer"));
        } else if (type === 'sms') {
            const msg = buildSMSMessage(getMessageVoterPayload(), booth, smsTemplate);
            const url = Platform.OS === "ios" ? `sms:${phone}&body=${encodeURIComponent(msg)}` : `sms:${phone}?body=${encodeURIComponent(msg)}`;
            Linking.openURL(url).catch(() => Alert.alert("Error", "SMS not supported"));
        } else if (type === 'whatsapp') {
            const msg = buildWhatsAppMessage(getMessageVoterPayload(), booth, whatsAppTemplate);
            const url = `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
            Linking.openURL(url).catch(() => Alert.alert("Error", "WhatsApp not installed"));
        }
    };

    const handleUpdate = async () => {
        setSaving(true);
        let updateLocation = location;
        if (!updateLocation?.latitude || !updateLocation?.longitude) {
            try {
                updateLocation = await GetCurrentLocation(ACCURATE_GPS_OPTIONS);
                if (updateLocation) setLocation(updateLocation);
            } catch (error: any) {
                setBanner({ type: "error", message: error?.message || "Unable to capture location for update." });
                setSaving(false);
                return;
            }
        }
        if (!updateLocation?.latitude || !updateLocation?.longitude) {
            setBanner({ type: "error", message: "Location is required to update voter info." });
            setSaving(false);
            return;
        }

        const updateRequest = buildVoterUpdateRequest(form, customValues, baselineForm);
        updateRequest.latitude = updateLocation.latitude;
        updateRequest.longitude = updateLocation.longitude;

        const enrichmentKeys = Object.keys(updateRequest).filter((k) => k !== 'latitude' && k !== 'longitude');
        if (!enrichmentKeys.length && !formDirty) {
            setBanner({ type: "error", message: "No changes to save." });
            setSaving(false);
            return;
        }

        const savedForm = { ...form };
        Object.keys(customValues).forEach((key) => {
            if (form[key] === "Others" && customValues[key]) {
                savedForm[key] = customValues[key];
            }
        });

        const logId = await addLog(
            `Updated voter #${voter.epicNo}`,
            { ...voter, ...savedForm, ...updateRequest },
            booth,
            "pending",
            updateLocation,
        );

        try {
            const assemblyData = await AsyncStorage.getItem('assemblyData');
            if (assemblyData) {
                const parsed = JSON.parse(assemblyData);
                parsed.assembly.wards = parsed.assembly.wards.map(w => ({
                    ...w, booths: w.booths.map(b => ({
                        ...b, voters: b.voters.map(v => v.voterId === voter.voterId ? { ...v, ...savedForm, ...updateRequest, latitude: updateLocation.latitude, longitude: updateLocation.longitude } : v)
                    }))
                }));
                await AsyncStorage.setItem('assemblyData', JSON.stringify(parsed));
                setSelectedVoter(prev => ({ ...prev, ...savedForm, ...updateRequest }));
            }

            const res = await CRUDAPI.updateVoter(voter.epicNo, {
                updateLocationLat: updateLocation.latitude,
                updateLocationLng: updateLocation.longitude,
                updateRequest,
            }, { boothNo: voter?.boothNo, wardCode: voter?.wardCode || booth?.wardId });

            if (res.success) {
                await updateLogStatus(logId, "server");
                setBanner({ type: "success", message: "Voter Info updated successfully!" });
                await markVoterVisitedLocally(getVoterEpicKey(voter));
                const savedVoter = {
                    ...selectedVoter,
                    ...savedForm,
                    ...updateRequest,
                    volunteerMet: true,
                    updatedFields: enrichmentKeys,
                    latitude: updateLocation.latitude,
                    longitude: updateLocation.longitude,
                };
                setSelectedVoter(savedVoter);
                const privateForm = emptyVoterForm();
                setBaselineForm(privateForm);
                setForm(privateForm);
                setCustomValues({});
                setMobileFocused(false);
                setVisitDisplayMode(true);
                setFormDirty(false);
            }
        } catch (error: any) {
            const apiMsg =
                error?.message
                || error?.response?.data?.message
                || error?.response?.data?.detail
                || (typeof error?.data?.error === 'string' ? error.data.error : null);
            setBanner({ type: "error", message: apiMsg || "Saved locally, sync pending." });
        } finally {
            setSaving(false);
        }
    };

    const renderField = (key, label) => {
        if (key === "dob") {
            return (
                <DobDateField
                    key={key}
                    label={label}
                    value={form.dob}
                    onChange={(next) => handleChange("dob", next)}
                />
            );
        }
        if (key === "mobile") {
            const storedMobile = form.mobile || voter?.mobile || "";
            const displayValue = mobileFocused ? storedMobile : maskTrailingValue(storedMobile);
            return (
                <View key={key} style={premiumStyles.fieldWrap}>
                    <Text style={premiumStyles.label}>{label}</Text>
                    <TextInput
                        value={displayValue}
                        keyboardType="number-pad"
                        maxLength={10}
                        placeholder={label}
                        placeholderTextColor={premium.textLight}
                        style={premiumStyles.input}
                        onFocus={() => {
                            if (!form.mobile && voter?.mobile) {
                                handleChange("mobile", normalizeMobileValue(voter.mobile));
                            }
                            setMobileFocused(true);
                        }}
                        onBlur={() => setMobileFocused(false)}
                        onChangeText={(text) => handleChange("mobile", text)}
                    />
                </View>
            );
        }
        if (key === "ifShifted" || key === "presentAddress" || key === "newWard" || key === "newBoothNo" || key === "newSerialNo" || key === "notAvailableReason") {
            const isMultiline = key === "presentAddress";
            return (
                <View key={key} style={premiumStyles.fieldWrap}>
                    <Text style={premiumStyles.label}>{label}</Text>
                    <TextInput
                        ref={key === "presentAddress" ? presentAddressRef : undefined}
                        value={form[key]}
                        keyboardType="default"
                        placeholder={label}
                        placeholderTextColor={premium.textLight}
                        style={isMultiline ? premiumStyles.inputMultiline : premiumStyles.input}
                        onChangeText={(text) => handleChange(key, text)}
                        multiline={isMultiline}
                        numberOfLines={isMultiline ? 3 : 1}
                    />
                </View>
            );
        }

        const isMulti = key === "govtSchemeTracking";
        const items = dropdownOptions[key]?.map(opt => ({ label: opt, value: opt })) || [];
        const dropdownHandlers = {
            onFocus: () => setDropdownFocused(true),
            onBlur: () => setDropdownFocused(false),
        };

        return (
            <View key={key} style={premiumStyles.fieldWrapDropdown}>
                <Text style={premiumStyles.label}>{label}</Text>
                {isMulti ? (
                    <AppMultiDropdown
                        value={form[key] || []}
                        items={items}
                        onChange={(vals) => handleChange(key, vals)}
                        placeholder={`Select ${label}`}
                        {...dropdownHandlers}
                    />
                ) : (
                    <AppDropdown
                        value={form[key]}
                        items={items}
                        onChange={(val) => handleChange(key, val)}
                        placeholder={`Select ${label}`}
                        {...dropdownHandlers}
                    />
                )}
                {form[key] === "Others" && (
                    <TextInput
                        placeholder={`Enter ${label.toLowerCase()}`}
                        value={customValues[key]}
                        onChangeText={t => setCustomValues(prev => ({ ...prev, [key]: t }))}
                        style={premiumStyles.othersInput}
                    />
                )}
            </View>
        );
    };

    return (
        <View style={premiumStyles.screen}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={premiumStyles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled
                scrollEnabled={androidDropdownScrollLock(dropdownFocused)}
            >
                <View style={premiumStyles.card}>
                    {visitDisplayMode ? (
                        <View style={premiumStyles.visitedPrivacyBanner}>
                            <View style={premiumStyles.visitedPrivacyIcon}>
                                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={premiumStyles.visitedPrivacyTitle}>VISITED</Text>
                                <Text style={premiumStyles.visitedPrivacySubtitle}>Survey saved · details hidden for privacy</Text>
                            </View>
                        </View>
                    ) : null}
                    <View style={premiumStyles.detailRow}>
                        <Text style={premiumStyles.detailLabel}>Name</Text>
                        <Text style={premiumStyles.detailValue}>
                            {language === 'en'
                                ? (voter.firstMiddleNameEn || voter.voterName || voter.name || "-").toUpperCase()
                                : (voter.firstMiddleNameLocal || voter.firstMiddleNameEn || voter.voterName || "-")}
                        </Text>
                    </View>
                    <View style={premiumStyles.detailRow}>
                        <Text style={premiumStyles.detailLabel}>EPIC / Voter ID</Text>
                        <Text style={premiumStyles.detailValue}>{voter.epicNo || "-"}</Text>
                    </View>
                    <View style={[premiumStyles.detailRow, { marginBottom: 0 }]}>
                        <Text style={premiumStyles.detailLabel}>Ward</Text>
                        <Text style={premiumStyles.detailValue}>{wardLabel}</Text>
                    </View>
                </View>

                <View style={premiumStyles.boothAboveMapCard}>
                    <Text style={premiumStyles.boothAboveMapTitle}>Polling Booth</Text>
                    <Text style={premiumStyles.boothAboveMapValue}>{boothTitle}</Text>
                    {boothAddress && boothAddress !== boothTitle ? (
                        <Text style={premiumStyles.boothAboveMapAddress}>{boothAddress}</Text>
                    ) : null}
                </View>

                <View style={{ marginBottom: 24 }}>
                    <View style={premiumStyles.mapFrame}>
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
                            <Text style={{ fontSize: 12, color: premium.primary, fontWeight: "700" }}>
                                Open in Maps
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity onPress={fetchLocation} style={premiumStyles.locationBtn}>
                        <Ionicons name="location" size={20} color="white" />
                        <Text style={premiumStyles.locationBtnText}>Location Captured</Text>
                    </TouchableOpacity>
                </View>

                <View style={premiumStyles.actionRow}>
                    <TouchableOpacity
                        onPress={() => openAction('sms')}
                        style={[premiumStyles.actionBtn, premiumStyles.actionSms]}
                    >
                        <Ionicons name="chatbubble" size={26} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => openAction('whatsapp')}
                        style={[premiumStyles.actionBtn, premiumStyles.actionWhatsapp]}
                    >
                        <Ionicons name="logo-whatsapp" size={28} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => openAction('call')}
                        style={[premiumStyles.actionBtn, premiumStyles.actionCall]}
                    >
                        <Ionicons name="call" size={26} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={premiumStyles.tabStrip}>
                    {["PRIMARY", "ADDITIONAL", "NOTES"].map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                activeOpacity={0.85}
                                onPress={() => handleTabChange(tab)}
                                style={[premiumStyles.tabBtn, isActive && premiumStyles.tabBtnActive]}
                            >
                                <Text style={[premiumStyles.tabBtnText, isActive && premiumStyles.tabBtnTextActive]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {activeTab === "PRIMARY" && (
                    <View style={premiumStyles.sectionCard}>
                        {primaryKeys.map(k => renderField(k, fieldLabels[k]))}
                    </View>
                )}

                {activeTab === "ADDITIONAL" && (
                    <View style={premiumStyles.sectionCard}>
                        {additionalKeys.map(k => renderField(k, fieldLabels[k]))}
                    </View>
                )}

                {activeTab === "NOTES" && (
                    <View style={premiumStyles.sectionCard}>
                        {renderField("status", "Available")}
                        {(form.status && form.status.includes("Shifted")) && renderField("presentAddress", "Enter present address")}
                        {form.status === "Recommend shift to the new ward" && (
                            <View>
                                {renderField("newWard", "Ward")}
                                {renderField("newBoothNo", "Booth No")}
                                {renderField("newSerialNo", "Serial No")}
                            </View>
                        )}
                        {form.status === "Not available" && renderField("notAvailableReason", "Enter the reason")}
                        <View style={premiumStyles.fieldWrap}>
                            <Text style={premiumStyles.label}>ENTER NOTES</Text>
                            <TextInput
                                multiline
                                numberOfLines={5}
                                value={form.notes}
                                onChangeText={t => handleChange("notes", t)}
                                placeholder="Enter notes"
                                placeholderTextColor={premium.textLight}
                                style={premiumStyles.inputMultiline}
                            />
                        </View>
                    </View>
                )}

                <View style={premiumStyles.footerRow}>
                    <TouchableOpacity onPress={handleReset} style={premiumStyles.secondaryBtn}>
                        <Text style={premiumStyles.secondaryBtnText}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleUpdate}
                        disabled={saving || !formDirty}
                        style={[premiumStyles.updateBtn, (saving || !formDirty) && premiumStyles.updateBtnDisabled]}
                    >
                        {saving ? <ActivityIndicator color="white" /> : <Text style={premiumStyles.updateBtnText}>Update</Text>}
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
                    style={premiumStyles.printBtn}
                >
                    <Text style={premiumStyles.printBtnText}>Voter Slip Print</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
