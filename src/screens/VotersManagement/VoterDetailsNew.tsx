import React, { useContext, useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CRUDAPI } from "../../apis/Api";
import { addLog, updateLogStatus } from "../../components/LogsHelpers";
import { AuthContext } from "../../context/AuthContext";
import { bgColors } from "../../constants/colors";
import { GetCurrentLocation } from "../../components/GetCurrentLocation";
import DropDownPicker from "react-native-dropdown-picker";
import { Platform } from "react-native";

export default function VoterInfo() {
    const route = useRoute();
    const { voter, booth } = route.params;
    const { setBanner } = useContext(AuthContext);

    const [activeTab, setActiveTab] = useState("PRIMARY");
    const [location, setLocation] = useState(null);
    const [selectedVoter, setSelectedVoter] = useState(voter || {});
    const [customValues, setCustomValues] = useState({});
    const [language, setLanguage] = useState("en");
    const [openDropdown, setOpenDropdown] = useState(null);
    const [govtSchemeItems, setGovtSchemeItems] = useState<Array<{ label: string, value: string }>>([]);
    const presentAddressRef = useRef<TextInput>(null);
    const [form, setForm] = useState({
        mobile: "",
        dob: "",
        community: "",
        caste: "",
        motherTongue: "",
        education: "",
        residenceType: "",
        ownership: "",
        voterPoints: "",
        govtSchemeTracking: [],
        engagementPotential: 0,
        ifShifted: "",
        status: "",
        civicIssue: "",
        natureOfVoter: "",
        notes: "",
        presentAddress: "",
        newWard: "",
        newBoothNo: "",
        newSerialNo: "",
        notAvailableReason: "",
    });

    const fields = [
        { key: "mobile", label: "Mobile Number (10 Digits)" },
        { key: "dob", label: "Date of Birth" },
        { key: "caste", label: "Caste" },
        { key: "community", label: "Community" },
        { key: "civicIssue", label: "Civic Issues" },
        { key: "natureOfVoter", label: "Nature (A/B/C/NA)" },
        { key: "education", label: "Education" },
        { key: "motherTongue", label: "Mother Tongue" },
        { key: "residenceType", label: "Residence Type" },
        { key: "ownership", label: "Ownership" },
        { key: "voterPoints", label: "Voter Points" },
        { key: "govtSchemeTracking", label: "Govt Scheme Tracking" },
        { key: "status", label: "Availability" },
        { key: "engagementPotential", label: "Engangement Potential" },
        { key: "ifShifted", label: "If shifted - Transport & Booth Details" },
    ];

    const primaryKeys = [
        "mobile",
        "dob",
        "caste",
        "community",
        "civicIssue",
        "natureOfVoter",
    ];

    const additionalKeys = [
        "education",
        "motherTongue",
        "residenceType",
        "ownership",
        "voterPoints",
        "govtSchemeTracking",
        "engagementPotential",
        "ifShifted"
    ];

    const labels = {
        name: { en: "Name", kn: "ಹೆಸರು" },
        epicNo: { en: "EPIC / Voter ID", kn: "ಮತದಾರರ ಗುರುತು ಸಂಖ್ಯೆ" },
        pollingBooth: { en: "Polling Booth", kn: "ಬೂತ್ ವಿವರಗಳು" },
    };

    const sectionTitles = {
        pollingBooth: { en: "Polling Booth", kn: "ಬೂತ್ ವಿವರಗಳು" },
        voterInfo: { en: "Voter Information", kn: "ಮತದಾರ ಮಾಹಿತಿ" },
    };

    const dropdownOptions = {
        community: ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Others"],
        caste: [
            "Lingayat",
            "Vokkaliga",
            "Brahmin",
            "Yadava / Golla",
            "Kuruba",
            "Idiga / Billava",
            "Vishwakarma",
            "Devanga",
            "Nayaka / Naik",
            "Kumbara",
            "Madivala / Dhobi",
            "Uppara",
            "Besta",
            "Bhovi",
            "Holeya",
            "Madiga",
            "Adi Karnataka",
            "Lambani / Banjara",
            "Soliga",
            "Jenukuruba",
            "Kadu Kuruba",
            "Iruliga",
            "Muslim",
            "Christian",
            "Jain",
            "Bunt",
            "Kodava",
            "Maratha",
            "Mogaveera",
            "Tuluva",
            "Others"
        ],
        motherTongue: [
            "Kannada",
            "Telugu",
            "Tamil",
            "Hindi",
            "Urdu",
            "Tulu",
            "Malayalam",
            "Konkani",
            "Marathi",
            "Lambani",
            "Kodava",
            "Sanskrit",
            "Gujarati",
            "Sindhi",
            "Punjabi",
            "Bengali",
            "Odia",
            "Others"
        ],
        education: [
            "Illiterate",
            "Primary School (1–5)",
            "Middle School (6–8)",
            "SSLC (10th Pass)",
            "PUC (12th Pass)",
            "Diploma",
            "ITI",
            "Undergraduate Degree",
            "Postgraduate Degree",
            "Professional Degree (BE, MBBS, CA, etc.)",
            "PhD / Research",
            "Others"
        ],
        residenceType: [
            "Layout",
            "Apartment",
            "Villa",
            "Independent House",
            "Slum Area",
            "Gated Community",
            "Chawl / Line House",
            "Row House",
            "Quarters (Govt / Company)",
            "Farm House",
            "Others"
        ],
        ownership: [
            "Own House",
            "Rented House",
            "Leased House",
            "Relative’s House",
            "Hostel / PG",
            "Quarters (Government / Company)",
            "Slum / Informal Housing",
            "Homeless",
            "Others"
        ],
        status: [
            "None",
            "Available",
            "Shifted in the ward",
            "Shifted outside the ward",
            "Recommend shift to the new ward",
            "Not available"],
        civicIssue: [
            "Road Damage / Potholes",
            "Traffic Congestion",
            "Water Supply Issues",
            "Drinking Water Quality",
            "Sewage / Drainage Problems",
            "Stormwater Drain Overflow",
            "Garbage Collection Issues",
            "Waste Management / Dumping",
            "Streetlight Not Working",
            "Public Safety Issues",
            "Law and Order Problems",
            "Electricity Supply Issues",
            "Lack of Public Transport",
            "Bus Stop / Metro Issues",
            "Park and Playground Issues",
            "Health Facility Issues",
            "Hospital / Primary Health Centre Issues",
            "School / Education Issues",
            "Encroachment Problems",
            "Flooding During Rain",
            "Pollution (Air / Water / Noise)",
            "Mosquito Menace",
            "Stray Dogs Issue",
            "Property Tax / Documentation Issues",
            "Lack of Government Services Access",
            "Housing Problems / Slum Issues",
            "Employment Issues",
            "Price Rise / Inflation Issues",
            "Corruption in Local Offices",
            "Drain Cleaning Required",
            "Footpath Encroachment / Bad Footpaths",
            "Lake Pollution / Lake Encroachment",
            "Ration Card Issues",
            "Aadhaar / ID Documentation Issues",
            "Women's Safety Issues",
            "Senior Citizens Issues",
            "Welfare Scheme Issues (Pension / Subsidy Delay)",
            "Public Toilet Issues",
            "Tree Fall / Tree Cutting Issues",
            "Street Vendors Management Issue",
            "Parking Problems",
            "Borewell Issues",
            "Road Widening / Infrastructure Issues",
            "Others"
        ],
        natureOfVoter: ["A", "B", "C", "NA", "Others"],
        voterPoints: [
            "0.5", "1", "1.5", "2", "2.5", "3",
            "3.5", "4", "4.5", "5", "5.5", "6",
            "6.5", "7", "7.5", "8", "8.5", "9",
            "9.5", "10", "Others"
        ],
        govtSchemeTracking: [
            // Karnataka State Schemes
            "Gruha Lakshmi (Household Cash Transfer)",
            "Griha Jyothi (Electricity Subsidy)",
            "Annabhagya (Food / Ration Support)",
            "Shakti (Free / Concessional Bus Travel for Women)",
            "Yuva Nidhi (Unemployed Youth Stipend & Skilling)",
            "CM Kaushalya / Kaushalya Karnataka Yojane (Skill Training)",
            "Nanna Guruthu (SC/ST Document Digitization)",
            "ELEVATE (Startup Grant / Seed Funding)",
            "Arogya Karnataka (State Health Scheme)",
            "Grama Vikasa / Gramabhivruddi Programmes (Rural Development)",
            "Soura Belaku (Rooftop Solar Subsidy)",
            "Thayi Bhagya (Mother & Child / Girl Child Welfare)",
            "Yuvanidhi / Youth Employment Schemes",
            "Local District-Level Schemes",

            // Central Government Schemes
            "Pradhan Mantri Awas Yojana (PMAY – Urban / Gramin)",
            "Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA)",
            "Ayushman Bharat / PM-JAY (Health Insurance)",
            "Jal Jeevan Mission (Piped Drinking Water)",
            "Swachh Bharat Mission (Sanitation)",
            "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
            "Pradhan Mantri Fasal Bima Yojana (Crop Insurance)",
            "Ujjwala Yojana (LPG Connections)",
            "PM Surya / Rooftop Solar Subsidy",
            "PM SVANidhi (Street Vendor Micro-Credit)",
            "PM Kaushal Vikas Yojana (PMKVY / Skill India)",
            "National Social Assistance Programme (Pensions)",
            "Beti Bachao Beti Padhao",
            "Atal Pension Yojana",
            "National Scholarship / Scholarship Schemes",
            "Others"
        ],
        engagementPotential: [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "Others"
        ]
    };

    const handleChange = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
        
        // Focus present address input when "Shifted outside the ward" is selected
        if (key === "status" && value === "Shifted outside the ward") {
            setTimeout(() => {
                presentAddressRef.current?.focus();
            }, 100);
        }
    };


    useEffect(() => {
        const loadUpdatedVoter = async () => {
            const json = await AsyncStorage.getItem("assemblyData");
            if (!json) return;
            let parsed = null;
            try {
                parsed = JSON.parse(json);
            } catch (err) {
                console.log("Raw Value:", json);
                return;
            }
            const updatedVoter = parsed.assembly?.wards
                ?.flatMap((w) => w.booths)
                ?.flatMap((b) => b.voters)
                ?.find((v) => v.voterId === voter.voterId);

            if (updatedVoter) {
                setSelectedVoter(updatedVoter);   // ← update your state
            }
            const keys = [
                "mobile", "dob", "community", "caste", "motherTongue",
                "education", "residenceType", "ownership", "civicIssue",
                "natureOfVoter", "status", "voterPoints", "govtSchemeTracking", "engagementPotential", "ifShifted",
                "presentAddress", "newWard", "newBoothNo", "newSerialNo", "notAvailableReason"
            ];
            keys.forEach((key) => {
                // Skip "Others" check for text input fields (mobile, dob, ifShifted, presentAddress, newWard, newBoothNo, newSerialNo, notAvailableReason)
                const textInputFields = ["mobile", "dob", "ifShifted", "presentAddress", "newWard", "newBoothNo", "newSerialNo", "notAvailableReason"];
                
                if (key === "govtSchemeTracking") {
                    // Handle array for multi-select
                    const value = updatedVoter?.[key];
                    const valueArray = Array.isArray(value) ? value : (value ? [value] : []);

                    // Check if any value in the array is not in the dropdown options (custom "Others" value)
                    const dropdownValues = dropdownOptions[key] || [];
                    const customValuesInArray = valueArray.filter(v => !dropdownValues.includes(v));
                    const standardValues = valueArray.filter(v => dropdownValues.includes(v));

                    // If there are custom values, replace them with "Others" and save the custom value
                    if (customValuesInArray.length > 0) {
                        // Use the first custom value (or combine them)
                        const customValue = customValuesInArray.join(", ");
                        setCustomValues((prev) => ({
                            ...prev,
                            [key]: customValue,
                        }));
                        // Set form with "Others" + standard values
                        handleChange(key, [...standardValues, "Others"]);
                    } else {
                        handleChange(key, valueArray);
                    }
                } else if (textInputFields.includes(key)) {
                    // For text input fields, just set the value directly
                    const value = updatedVoter?.[key] ?? "";
                    handleChange(key, value);
                } else {
                    // For dropdown fields, check if value is custom "Others" value
                    const value = updatedVoter?.[key] ?? "";
                    const dropdownValues = dropdownOptions[key] || [];

                    // Only check for "Others" if dropdown has options
                    if (dropdownValues.length > 0 && value && value !== "" && !dropdownValues.includes(value)) {
                        // Set "Others" as selected and save the actual value in customValues
                        setCustomValues((prev) => ({
                            ...prev,
                            [key]: value,
                        }));
                        handleChange(key, "Others");
                    } else {
                        handleChange(key, value);
                    }
                }
            });
            const lang = await AsyncStorage.getItem("app_language");
            setLanguage(lang)
        };

        loadUpdatedVoter();
    }, []);  // ← only run once on mount

    // Initialize govtSchemeItems for multi-select
    useEffect(() => {
        const items =
            dropdownOptions.govtSchemeTracking?.map((item) => ({
                label: item,
                value: item,
            })) || [];
        // Always set items to ensure they're available
        setGovtSchemeItems(items);
    }, []);

    const fetchLocation = async () => {
        const loc = await GetCurrentLocation();
        setLocation(loc);
    };

    const handleReset = () => {
        setForm({
            mobile: "",
            dob: "",
            community: "",
            caste: "",
            motherTongue: "",
            education: "",
            residenceType: "",
            ownership: "",
            voterPoints: "",
            govtSchemeTracking: [],
            engagementPotential: 0,
            ifShifted: "",
            status: "",
            civicIssue: "",
            natureOfVoter: "",
            notes: "",
            presentAddress: "",
            newWard: "",
            newBoothNo: "",
            newSerialNo: "",
            notAvailableReason: "",
        });
    };

    const buildWhatsAppMessage = () => {
        return `
🗳️ *LOK SABHA ELECTION – 2024*

*Assembly:* 160 – Sarvagnanagara

*Voter Name:* ${voter.firstMiddleNameEn}
*EPIC ID:* ${voter.epicNo}
*Booth No:* ${booth?.boothId}
*Serial No:* ${voter.serialNo || "-"}

*Polling Booth:*
${booth?.boothNameEn}
${booth?.address || ""}

📅 *Date:* 26-Apr-2024
⏰ *Time:* 7:00 AM – 6:00 PM

🙏 Kindly cast your valuable vote.

— Thank you
`.trim();
    };

    const buildSMSMessage = () => {
        return `
LOK SABHA ELECTION - 2024

Assembly: 160 - SARVAGNANAGARA

Voter Name: ${voter.firstMiddleNameEn}
Mother: ${voter.motherName || ""}
EPIC ID: ${voter.epicNo}
Booth No: ${booth?.boothId} | Serial No: ${voter.serialNo || "-"}

Polling Booth:
${booth?.boothNameEn}
${booth?.address || ""}
Room No: ${booth?.roomNo || "1"}

Date: 26-APR-2024
Time: 7:00 AM - 6:00 PM

Kindly cast your valuable vote.

P C Mohan - Sl. No 2
BJP Candidate
Bengaluru Central Parliamentary Constituency
`.trim();
    };


    const openDialer = () => {
        Linking.openURL(`tel:${form.mobile}`).catch(() =>
            Alert.alert("Error", "Unable to open dialer")
        );
    };

    const openMessage = async () => {
        if (!form.mobile || form.mobile.length !== 10) {
            Alert.alert("Error", "Invalid mobile number");
            return;
        }

        const message = buildSMSMessage();
        const encodedMessage = encodeURIComponent(message);

        const phone = form.mobile;
        const smsUrl =
            Platform.OS === "ios"
                ? `sms:${phone}&body=${encodedMessage}`
                : `sms:${phone}?body=${encodedMessage}`;

        const supported = await Linking.canOpenURL(smsUrl);
        if (!supported) {
            Alert.alert("Error", "SMS not supported on this device");
            return;
        }

        Linking.openURL(smsUrl);
    };


    const openWhatsApp = async () => {
        if (!form.mobile || form.mobile.length !== 10) {
            Alert.alert("Error", "Invalid mobile number");
            return;
        }

        const message = buildWhatsAppMessage();
        const encodedMessage = encodeURIComponent(message);
        const phone = `91${form.mobile}`;

        const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

        const supported = await Linking.canOpenURL(whatsappUrl);
        if (!supported) {
            Alert.alert("Error", "WhatsApp not installed");
            return;
        }

        Linking.openURL(whatsappUrl);
    };


    const renderField = ({ key, label }) => {
        // TEXT INPUT FIELDS
        console.log(form)
        if (key === "mobile" || key === "dob" || key === "ifShifted") {
            return (
                <TextInput
                    value={maskValue(form[key], key)}
                    keyboardType={key === "mobile" ? "number-pad" : "default"}
                    placeholder={label}
                    maxLength={key === "mobile" ? 10 : 50}
                    className="border border-gray-300 rounded-xl px-4 py-3 bg-[#E3EDF3] text-black"
                    onChangeText={(text) => handleChange(key, text)}
                />
            );
        }


        // MULTI-SELECT FOR govtSchemeTracking
        if (key === "govtSchemeTracking") {
            const currentValue = Array.isArray(form[key]) ? form[key] : [];
            const isOthersSelected = currentValue.includes("Others");

            // Ensure items are available - fallback to generating from dropdownOptions if state is empty
            const itemsToUse = govtSchemeItems.length > 0
                ? govtSchemeItems
                : dropdownOptions[key]?.map((item) => ({
                    label: item,
                    value: item,
                })) || [];

            return (
                <View style={{ zIndex: openDropdown === key ? 1000 : 1 }}>
                    <DropDownPicker
                        open={openDropdown === key}
                        value={currentValue}
                        items={itemsToUse}
                        setOpen={(isOpen) =>
                            setOpenDropdown(isOpen ? key : null)
                        }
                        setItems={(callback) => {
                            // Prevent items from being cleared
                            setGovtSchemeItems((prevItems) => {
                                if (prevItems.length === 0) {
                                    // If items are empty, initialize them
                                    const items =
                                        dropdownOptions[key]?.map((item) => ({
                                            label: item,
                                            value: item,
                                        })) || [];
                                    return items;
                                }
                                // Otherwise, use the callback to update
                                const newItems = callback(prevItems);
                                return Array.isArray(newItems) && newItems.length > 0 ? newItems : prevItems;
                            });
                        }}
                        multiple={true}
                        mode="BADGE"
                        badgeDotColors={[bgColors.blue500_1]}
                        badgeColors={[bgColors.blue500_1]}
                        listMode={Platform.OS === "android" ? "MODAL" : "SCROLLVIEW"}
                        scrollViewProps={Platform.OS === "android" ? undefined : {
                            nestedScrollEnabled: true,
                        }}
                        setValue={(callback) => {
                            // Use the latest form value to avoid stale closures
                            setForm((prevForm) => {
                                const prevValue = Array.isArray(prevForm[key]) ? prevForm[key] : [];
                                const newValue = callback(prevValue);
                                // Ensure it's always an array
                                const valueArray = Array.isArray(newValue) ? newValue : [];

                                // Update custom values if "Others" is removed
                                if (!valueArray.includes("Others")) {
                                    setCustomValues((prev) => ({
                                        ...prev,
                                        [key]: "",
                                    }));
                                }

                                return { ...prevForm, [key]: valueArray };
                            });
                        }}
                        closeOnBackPressed={true}
                        closeAfterSelecting={false}
                        maxHeight={300}
                        placeholder={`Select ${label}`}
                        style={{
                            backgroundColor: "#E3EDF3",
                            borderColor: "#000",
                            borderRadius: 10,
                            minHeight: 48,
                        }}
                        dropDownContainerStyle={{
                            borderColor: "#000",
                            maxHeight: 300,
                        }}
                        selectedItemContainerStyle={{
                            backgroundColor: bgColors.blue500_1,
                        }}
                        selectedItemLabelStyle={{
                            color: "#FFFFFF",
                            fontWeight: 600,
                        }}
                        textStyle={{
                            color: "#000",
                            fontSize: 14,
                        }}
                        placeholderStyle={{
                            color: "#888",
                        }}
                        tickIconStyle={{
                            tintColor: "#FFFFFF",
                        }}
                        checkboxIconStyle={{
                            tintColor: bgColors.blue500_1,
                        }}
                        badgeTextStyle={{
                            color: "#FFFFFF",
                        }}
                        badgeContainerStyle={{
                            backgroundColor: bgColors.blue500_1,
                        }}
                        zIndex={1000}
                        zIndexInverse={3000}
                    />

                    {/* CUSTOM INPUT FOR OTHERS IN MULTI-SELECT */}
                    {isOthersSelected && (
                        <TextInput
                            placeholder={`Enter your ${label.toLowerCase()}`}
                            placeholderTextColor="#888"
                            value={customValues[key] || ""}
                            onChangeText={(text) =>
                                setCustomValues((prev) => ({
                                    ...prev,
                                    [key]: text,
                                }))
                            }
                            className={`border border-dashed border-gray-400 rounded-lg px-4 py-3 mt-2 text-black ${bgColors.customLightBlue4}`}
                        />
                    )}
                </View>
            );
        }

        // SINGLE SELECT DROPDOWN OPTIONS
        const items =
            dropdownOptions[key]?.map((item) => ({
                label: item,
                value: item,
            })) || [];

        return (
            <View style={{ zIndex: openDropdown === key ? 1000 : 1 }}>
                <DropDownPicker
                    open={openDropdown === key}
                    value={form[key]}
                    items={items}
                    setOpen={(isOpen) =>
                        setOpenDropdown(isOpen ? key : null)
                    }
                    listMode={Platform.OS === "android" ? "MODAL" : "SCROLLVIEW"}
                    setValue={(callback) => {
                        const value = callback(form[key]);
                        handleChange(key, value);

                        if (value !== "Others") {
                            setCustomValues((prev) => ({
                                ...prev,
                                [key]: "",
                            }));
                        }
                    }}
                    placeholder={`Select ${label}`}
                    style={{
                        backgroundColor: "#E3EDF3",
                        borderColor: "#000",
                        borderRadius: 10,
                        minHeight: 48,
                    }}
                    dropDownContainerStyle={{
                        borderColor: "#000",
                        maxHeight: 200,
                    }}
                    selectedItemContainerStyle={{
                        backgroundColor: bgColors.blue500_1,
                    }}
                    selectedItemLabelStyle={{
                        color: "#FFFFFF",
                        fontWeight: 600,
                    }}
                    textStyle={{
                        color: "#000",
                        fontSize: 14,
                    }}
                    placeholderStyle={{
                        color: "#888",
                    }}
                    tickIconStyle={{
                        tintColor: "#FFFFFF",
                    }}
                    zIndex={1000}
                    zIndexInverse={3000}
                />

                {/* CUSTOM INPUT FOR OTHERS */}
                {form[key] === "Others" && (
                        <TextInput
                            placeholder={`Enter your ${label.toLowerCase()}`}
                            placeholderTextColor="#888"
                            value={customValues[key] || ""}
                            onChangeText={(text) =>
                                setCustomValues((prev) => ({
                                    ...prev,
                                    [key]: text,
                                }))
                            }
                            className={`border border-dashed border-gray-400 rounded-lg px-4 py-3 mt-2 text-black ${bgColors.customLightBlue4}`}
                        />
                    )}
            </View>
        );
    };


    const showBanner = (type, message) => {
        setBanner({ type, message });
    };

    const handleUpdate = async () => {
        const assemblyData = await AsyncStorage.getItem('assemblyData');
        if (!assemblyData) {
            showBanner("error", "No assembly data found");
            return;
        }
        const parsedAssemblyData = JSON.parse(assemblyData);
        
        // Fetch location and wait for it (don't fail if location fetch fails)
        try {
            await fetchLocation();
        } catch (error) {
            console.log('Location fetch failed, continuing without location:', error);
        }
        const updateLocalAssembly = (data, voterId, updates, defaultLocation) => {
            // Filter out only null/undefined, but keep empty strings, 0, false, and empty arrays
            const validUpdates = Object.fromEntries(
                Object.entries(updates).filter(([_, value]) => {
                    // Only filter out null and undefined
                    return value !== null && value !== undefined;
                })
            );

            return {
                ...data,
                assembly: {
                    ...data.assembly,
                    wards: data.assembly?.wards.map((ward) => ({
                        ...ward,
                        booths: ward.booths.map((booth) => ({
                            ...booth,
                            voters: booth.voters.map((voter) =>
                                voter.voterId === voterId ? {
                                    ...voter, ...validUpdates,
                                    latitude: defaultLocation && defaultLocation.latitude,
                                    longitude: defaultLocation && defaultLocation.longitude
                                } : voter
                            ),
                        })),
                    })),
                },
            };
        };

        const finalData = {};
        Object.keys(form).forEach((key) => {
            const selected = form[key];
            const custom = customValues[key];

            // Handle multi-select for govtSchemeTracking
            if (key === "govtSchemeTracking") {
                if (Array.isArray(selected) && selected.length > 0) {
                    // If "Others" is in the array, replace it with custom value
                    if (selected.includes("Others")) {
                        const withoutOthers = selected.filter(item => item !== "Others");
                        finalData[key] = custom && custom.trim()
                            ? [...withoutOthers, custom.trim()]
                            : withoutOthers;
                    } else {
                        finalData[key] = selected;
                    }
                } else {
                    // Keep empty array for govtSchemeTracking
                    finalData[key] = [];
                }
            }
            // Handle single select with "Others" option
            else if (selected === "Others") {
                finalData[key] = custom || "";
            } else {
                // For all other fields, save the value (including empty strings)
                finalData[key] = selected !== undefined && selected !== null ? selected : "";
            }
        });
        
        console.log('Final data to save:', finalData);

        const changedFields = {};
        Object.keys(finalData).forEach((key) => {
            const newValue = finalData[key];
            // Use selectedVoter first, fallback to original voter from route params
            const oldValue = (selectedVoter && selectedVoter[key] !== undefined) 
                ? selectedVoter[key] 
                : (voter && voter[key] !== undefined ? voter[key] : undefined);

            // ⛔ Skip only null/undefined values, but allow empty strings and arrays
            if (newValue === undefined || newValue === null) {
                return;
            }

            // For arrays, skip only if completely empty
            if (key === "govtSchemeTracking") {
                if (!Array.isArray(newValue) || newValue.length === 0) {
                    return;
                }
            }

            // ✅ Add only if value actually changed
            if (key === "govtSchemeTracking") {
                // For arrays, compare arrays
                const oldArray = Array.isArray(oldValue) ? oldValue : (oldValue ? [oldValue] : []);
                const newArray = Array.isArray(newValue) ? newValue : [];
                const oldSorted = [...oldArray].sort().join(',');
                const newSorted = [...newArray].sort().join(',');
                if (oldSorted !== newSorted) {
                    changedFields[key] = newValue;
                    console.log(`Field changed - ${key}:`, { old: oldSorted, new: newSorted });
                }
            } else {
                // For other fields, compare as strings to handle type differences
                const oldStr = oldValue != null ? String(oldValue).trim() : "";
                const newStr = newValue != null ? String(newValue).trim() : "";
                if (oldStr !== newStr) {
                    changedFields[key] = newValue;
                    console.log(`Field changed - ${key}:`, { old: oldStr, new: newStr });
                }
            }
        });
        
        // If no fields changed, show message and return early
        if (Object.keys(changedFields).length === 0) {
            showBanner("info", "No changes to save");
            return;
        }

        const logId = await addLog(
            `Updated voter #${voter.epicNo}: ${Object.keys(changedFields).join(", ")}`,
            voter,
            booth,
            "pending",
            location
        );

        try {
            const updatedAssemblyData = updateLocalAssembly(
                parsedAssemblyData,
                voter.voterId,
                changedFields,
                location
            );

            await AsyncStorage.setItem('assemblyData', JSON.stringify(updatedAssemblyData));
            setSelectedVoter(prev => ({ ...prev, ...changedFields }));
            
            // Debug: Log what was saved
            console.log('Saved changedFields:', changedFields);
            console.log('Updated voter in local storage');
            console.log('Number of fields changed:', Object.keys(changedFields).length);
            
            // Show success message for local save
            showBanner("success", `Saved ${Object.keys(changedFields).length} field(s) locally`);
        } catch (error) {
            console.error('Error saving to local storage:', error);
            showBanner("error", "Failed to save to local storage");
            return;
        }

        const transformedReq = {
            updateLocationLat: location && location.latitude || 0,
            updateLocationLng: location && location.longitude || 0,
            updateRequest: {
                ...changedFields,
                latitude: voter.latitude || (location && location.latitude) || 0,
                longitude: voter.longitude || (location && location.longitude) || 0
            }
        };
        try {
            const res = await CRUDAPI.updateVoter(voter.epicNo, transformedReq, {
                boothNo: voter?.boothNo || voter?.boothInfo?.boothNo,
                wardCode: voter?.wardCode || voter?.boothInfo?.wardCode,
            });
            if (res.success) {
                await updateLogStatus(logId, "server");
                showBanner("success", "Voter Info updated successfully!")
            }
        } catch (error) {
            console.log(error)
            showBanner("error", error?.message || "Saved locally, Sync pending due to poor internet connection.")
        }
    };

    const maskValue = (value, key) => {
        if (!value) return "";

        // Only mask mobile number
        if (key === "mobile") {
            const visibleDigits = 4;
            const maskedLength = Math.max(value.length - visibleDigits, 0);
            return "*".repeat(maskedLength) + value.slice(-visibleDigits);
        }

        // No masking for other fields
        return value;
    };


    return (
        <ScrollView className="flex-1 bg-white p-4" >

            <View className={`${bgColors.gray100} p-4 rounded-2xl mb-5`}>
                <View className="space-y-2">
                    <View className="flex-row mb-2">
                        <Text className="text-black font-bold ">{labels.name[language]}  </Text>
                        <Text className="text-black flex-1">:  {language === 'en' ? voter.firstMiddleNameEn.toUpperCase() : voter.firstMiddleNameLocal}
                        </Text>
                    </View>
                    <View className="flex-row mb-2">
                        <Text className="text-black font-bold">{labels.epicNo[language]}  </Text>
                        <Text className="text-black flex-1">:  {voter.epicNo} </Text>
                    </View>
                    <View className="flex-row mb-2">
                        <Text className="text-black font-bold">{labels.pollingBooth[language]}  </Text>
                        <Text className="text-black flex-1">:  {booth?.boothId} - {language === 'en' ? booth?.boothNameEn : booth?.boothNameLocal} </Text>
                    </View>
                </View>

                <TouchableOpacity
                    className={`flex-row justify-center items-center py-3 rounded-xl ${location || voter?.latitude ? bgColors.green600 : bgColors.blue600}`}
                    onPress={fetchLocation}
                >
                    <Ionicons
                        name={location || voter?.latitude ? "checkmark-circle-outline" : "location-outline"}
                        size={20}
                        color="white"
                    />
                    <Text className="text-white text-base font-semibold ml-2">
                        {location || voter?.latitude ? "Location Fetched" : "Get Location"}
                    </Text>
                </TouchableOpacity>

                <View className="flex-row flex-wrap gap-4 mt-6">
                    <TouchableOpacity
                        onPress={openMessage}
                        className="px-4 py-3 rounded-xl border border-black w-[30%] flex-row justify-center "
                        style={{ borderWidth: 0.2 }}
                    >
                        <Ionicons name="chatbubble-outline" size={20} color="#000" />
                        <Text className="text-black text-center ml-1 pt-1">SMS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={openWhatsApp}
                        className="px-4 py-3 rounded-xl border border-black w-[30%] flex-row justify-center "
                        style={{ borderWidth: 0.2 }}
                    >
                        <Ionicons name="logo-whatsapp" size={20} color={bgColors.green600_1} />
                        <Text className="text-black text-center ml-1 pt-1">WhatsApp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={openDialer}
                        className="px-4 py-3 rounded-xl border border-black w-[30%] flex-row justify-center "
                        style={{ borderWidth: 0.2 }}
                    >
                        <Ionicons name="call-outline" size={20} color={bgColors.blue500_1} />
                        <Text className="text-black text-center ml-1 pt-1">Call</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
                {["PRIMARY", "ADDITIONAL", "NOTES"].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        className={`flex-1 py-2 rounded-xl ${activeTab === tab ? "bg-blue-700" : "bg-transparent"
                            }`}
                    >
                        <Text
                            className={`text-center font-semibold ${activeTab === tab ? "text-white" : "text-gray-700"
                                }`}
                        >
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* PRIMARY */}
            {activeTab === "PRIMARY" &&
                fields
                    .filter(f => primaryKeys.includes(f.key))
                    .map(f => (
                        <View key={f.key} className="mb-4">
                            <Text className="text-sm text-gray-600 mb-1" >{f.label}</Text>
                            {renderField(f)}
                        </View>
                    ))}

            {/* ADDITIONAL */}
            {activeTab === "ADDITIONAL" &&
                fields
                    .filter(f => additionalKeys.includes(f.key))
                    .map(f => (
                        <View key={f.key} className="mb-4">
                            <Text className="text-sm text-gray-600 mb-1">{f.label}</Text>
                            {renderField(f)}
                        </View>
                    ))}

            {/* NOTES */}
            {activeTab === "NOTES" && (
                <>
                    {/* Availability Section */}
                    <View className="mb-4">
                        <Text className="text-sm text-gray-600 mb-1">Available</Text>
                        <View style={{ zIndex: openDropdown === "status" ? 1000 : 1 }}>
                            <DropDownPicker
                                open={openDropdown === "status"}
                                value={form.status}
                                items={dropdownOptions.status?.map((item) => ({
                                    label: item,
                                    value: item,
                                })) || []}
                                setOpen={(isOpen) =>
                                    setOpenDropdown(isOpen ? "status" : null)
                                }
                                listMode={Platform.OS === "android" ? "MODAL" : "SCROLLVIEW"}
                                setValue={(callback) => {
                                    const value = callback(form.status);
                                    handleChange("status", value);
                                }}
                                placeholder="Select Availability"
                                style={{
                                    backgroundColor: "#E3EDF3",
                                    borderColor: "#000",
                                    borderRadius: 10,
                                    minHeight: 48,
                                }}
                                dropDownContainerStyle={{
                                    borderColor: "#000",
                                    maxHeight: 200,
                                }}
                                selectedItemContainerStyle={{
                                    backgroundColor: bgColors.blue500_1,
                                }}
                                selectedItemLabelStyle={{
                                    color: "#FFFFFF",
                                    fontWeight: 600,
                                }}
                                textStyle={{
                                    color: "#000",
                                    fontSize: 14,
                                }}
                                placeholderStyle={{
                                    color: "#888",
                                }}
                                tickIconStyle={{
                                    tintColor: "#FFFFFF",
                                }}
                                zIndex={1000}
                                zIndexInverse={3000}
                            />
                        </View>

                        {/* Present Address for "Shifted in the ward" or "Shifted outside the ward" */}
                        {(form.status === "Shifted in the ward" || form.status === "Shifted outside the ward") && (
                            <View className="mt-2">
                                <Text className="text-sm text-gray-600 mb-1">Enter present address</Text>
                                <TextInput
                                    ref={presentAddressRef}
                                    value={form.presentAddress}
                                    onChangeText={(text) => handleChange("presentAddress", text)}
                                    placeholder="Enter present address"
                                    multiline
                                    numberOfLines={3}
                                    className="border border-gray-300 rounded-xl px-4 py-3 bg-[#E3EDF3] text-black"
                                />
                            </View>
                        )}

                        {/* New Ward, Booth No, Serial No for "Recommend shift to the new ward" */}
                        {form.status === "Recommend shift to the new ward" && (
                            <View className="mt-2 space-y-2">
                                <View>
                                    <Text className="text-sm text-gray-600 mb-1">Ward</Text>
                                    <TextInput
                                        value={form.newWard}
                                        onChangeText={(text) => handleChange("newWard", text)}
                                        placeholder="Enter ward"
                                        className="border border-gray-300 rounded-xl px-4 py-3 bg-[#E3EDF3] text-black"
                                    />
                                </View>
                                <View>
                                    <Text className="text-sm text-gray-600 mb-1">Booth No</Text>
                                    <TextInput
                                        value={form.newBoothNo}
                                        onChangeText={(text) => handleChange("newBoothNo", text)}
                                        placeholder="Enter booth number"
                                        className="border border-gray-300 rounded-xl px-4 py-3 bg-[#E3EDF3] text-black"
                                    />
                                </View>
                                <View>
                                    <Text className="text-sm text-gray-600 mb-1">Serial No</Text>
                                    <TextInput
                                        value={form.newSerialNo}
                                        onChangeText={(text) => handleChange("newSerialNo", text)}
                                        placeholder="Enter serial number"
                                        className="border border-gray-300 rounded-xl px-4 py-3 bg-[#E3EDF3] text-black"
                                    />
                                </View>
                            </View>
                        )}

                        {/* Not Available Reason */}
                        {form.status === "Not available" && (
                            <View className="mt-2">
                                <Text className="text-sm text-gray-600 mb-1">Enter the reason</Text>
                                <TextInput
                                    value={form.notAvailableReason}
                                    onChangeText={(text) => handleChange("notAvailableReason", text)}
                                    placeholder="Enter the reason"
                                    multiline
                                    numberOfLines={3}
                                    className="border border-gray-300 rounded-xl px-4 py-3 bg-[#E3EDF3] text-black"
                                />
                            </View>
                        )}
                    </View>

                    {/* Notes Section */}
                    <View className="mb-4">
                        <Text className="text-sm text-gray-600 mb-1">ENTER NOTES</Text>
                        <TextInput
                            multiline
                            numberOfLines={5}
                            value={form.notes}
                            onChangeText={t => handleChange("notes", t)}
                            placeholder="Enter notes"
                            className="border border-gray-300 rounded-xl p-4 bg-[#E3EDF3] text-black"
                        />
                    </View>
                </>
            )}
            <View className="flex-row justify-between mt-5 mb-5 mx-5">
                <TouchableOpacity
                    onPress={handleReset}
                    className={`flex-1  py-3 rounded-xl mr-2 border border-black`}
                    style={{ borderWidth: 0.2 }}
                >
                    <Text className="text-black font-semibold text-center">Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleUpdate()}
                    className={`flex-1 ${bgColors.green600} py-3 rounded-xl`}
                >
                    <Text className="text-white font-semibold text-center">Update</Text>
                </TouchableOpacity>
            </View>
            <View className="flex-row justify-between mt-5 mb-5 mx-5">
                <TouchableOpacity
                    className={`flex-1  py-3 rounded-xl mr-2  ${bgColors.blue600}`}
                >
                    <Text className="text-white font-semibold text-center">Voter Slip Print</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
