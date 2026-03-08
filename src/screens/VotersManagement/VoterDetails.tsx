// import React, { useContext, useEffect, useState } from "react";
// import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
// import { useRoute } from "@react-navigation/native";
// import Ionicons from "react-native-vector-icons/Ionicons";
// import { Dropdown } from "react-native-element-dropdown";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { CRUDAPI } from '../../apis/Api'
// import { addLog, updateLogStatus } from "../../components/LogsHelpers";
// import { AuthContext } from "../../context/AuthContext";
// import { bgColors } from "../../constants/colors";
// import { GetCurrentLocation } from "../../components/GetCurrentLocation";

// export default function VoterInfo() {
//     const route = useRoute();
//     const { voter, booth } = route.params; // voter object from navigation
//     const [form, setForm] = useState({
//         mobile: "",
//         dob: "",
//         community: "",
//         caste: "",
//         motherTongue: "",
//         education: "",
//         residenceType: "",
//         ownership: "",
//         status: "",
//         civicIssue: "",
//         natureOfVoter: "",
//     });

//     const [location, setLocation] = useState(null);
//     const [customValues, setCustomValues] = useState({});
//     const { banner, setBanner } = useContext(AuthContext);
//     const [selectedVoter, setSelectedVoter] = useState({});
//     const [language, setLanguage] = useState('');
//     const sectionTitles = {
//         pollingBooth: { en: "Polling Booth", kn: "ಬೂತ್ ವಿವರಗಳು" },
//         voterInfo: { en: "Voter Information", kn: "ಮತದಾರ ಮಾಹಿತಿ" },
//     };
//     const labels = {
//         name: { en: "Name", kn: "ಹೆಸರು" },
//         father: { en: "Father", kn: "ತಂದೆ" },
//         houseNo: { en: "House No.", kn: "ಮನೆ ಸಂಖ್ಯೆ" },
//         age: { en: "Age", kn: "ವಯಸ್ಸು" },
//         sex: { en: "Sex", kn: "ಲಿಂಗ" },
//         address: { en: "Address", kn: "ವಿಳಾಸ" },
//     };
//     const boothLabels = {
//         ward: { en: "Ward", kn: "ವಾರ್ಡ್" },
//         epicId: { en: "Epid ID", kn: "ಎಪಿಕ್ ಐಡಿ" },
//         boothNo: { en: "Booth No.", kn: "ಬೂತ್ ಸಂಖ್ಯೆ" },
//         boothAddress: { en: "Booth Address", kn: "ಬೂತ್ ವಿಳಾಸ" },
//     };

//     const showBanner = (type, message) => {
//         setBanner({ type, message });
//     };

//     // 🧩 Field configuration
//     const fields = [
//         { key: "mobile", label: "Mobile Number" },
//         { key: "dob", label: "Date of Birth" },
//         { key: "community", label: "Community" },
//         { key: "caste", label: "Caste" },
//         { key: "motherTongue", label: "Mother Tongue" },
//         { key: "education", label: "Education" },
//         { key: "residenceType", label: "Residency Type" },
//         { key: "ownership", label: "Ownership" },
//         { key: "status", label: "Present Status" },
//         { key: "civicIssue", label: "Civic Issues" },
//         { key: "natureOfVoter", label: "Nature Of Voter" },
//     ];

//     // 🗂️ Dropdown options per field
//     const dropdownOptions = {
//         community: ["Hindu", "Muslim", "Christian", "Others"],
//         caste: ["Vokkaliga", "Gowda", "Reddy", "Brahmana", "Lingayatha", "Kurubha", "SC", "ST", "Others"],
//         motherTongue: ["Kannada", "Telugu", "Tamil", "English", "Others"],
//         education: ["10th", "12th", "ITI", "Diploma", "Graduate", "Post Graduate", "Others"],
//         residenceType: ["Village / Local Area", "Residential Layout", "Apartment / Villa", "Others"],
//         ownership: ["Own House", "Rented House", "None"],
//         status: ["Available", "Shifted in the Constituency/Ward/Area/Booth", "Shifted outside the Constituency"],
//         civicIssue: ["Road", "Drinking Water", "Drainage", "Electricity", "Street lights", "Traffic", "Ration", "Hospital", "Others"],
//         natureOfVoter: ["A", "B", "C", "NA"],
//     };


//     const handleChange = (key, value) => {
//         let newValue = value;
//         if (key === "dob" || key === "mobile") {
//             newValue = value.slice(0, 10);
//         }
//         setForm(prev => ({
//             ...prev,
//             [key]: newValue
//         }));
//     };

//     useEffect(() => {
//         const loadUpdatedVoter = async () => {
//             const json = await AsyncStorage.getItem("assemblyData");
//             if (!json) return;
//             let parsed = null;
//             try {
//                 parsed = JSON.parse(json);
//             } catch (err) {
//                 console.log("Raw Value:", json);
//                 return;
//             }
//             const updatedVoter = parsed.assembly?.wards
//                 ?.flatMap((w) => w.booths)
//                 ?.flatMap((b) => b.voters)
//                 ?.find((v) => v.voterId === voter.voterId);

//             if (updatedVoter) {
//                 setSelectedVoter(updatedVoter);   // ← update your state
//             }
//             const keys = [
//                 "mobile", "dob", "community", "caste", "motherTongue",
//                 "education", "residenceType", "ownership", "civicIssue",
//                 "natureOfVoter", "status",
//             ];
//             keys.forEach((key) => {
//                 handleChange(key, updatedVoter?.[key] ?? "");
//             });
//             const lang = await AsyncStorage.getItem("app_language");
//             setLanguage(lang)
//         };

//         loadUpdatedVoter();
//     }, []);  // ← only run once on mount

//     const fetchLocation = async () => {
//         const location = await GetCurrentLocation();
//         setLocation(location)
//     };

//     const handleReset = () => {
//         setForm({
//             mobile: "",
//             dob: "",
//             community: "",
//             caste: "",
//             motherTongue: "",
//             education: "",
//             residenceType: "",
//             ownership: "",
//             status: "",
//             civicIssue: "",
//             natureOfVoter: ""
//         });
//         setLocation('')
//     };

//     const handleUpdate = async () => {
//         const assemblyData = await AsyncStorage.getItem('assemblyData');
//         const parsedAssemblyData = JSON.parse(assemblyData);
//         fetchLocation()
//         const updateLocalAssembly = (data, voterId, updates, defaultLocation) => {
//             const validUpdates = Object.fromEntries(
//                 Object.entries(updates).filter(([_, value]) => value !== '' && value != null)
//             );

//             return {
//                 ...data,
//                 assembly: {
//                     ...data.assembly,
//                     wards: data.assembly?.wards.map((ward) => ({
//                         ...ward,
//                         booths: ward.booths.map((booth) => ({
//                             ...booth,
//                             voters: booth.voters.map((voter) =>
//                                 voter.voterId === voterId ? {
//                                     ...voter, ...validUpdates,
//                                     latitude: defaultLocation && defaultLocation.latitude,
//                                     longitude: defaultLocation && defaultLocation.longitude
//                                 } : voter
//                             ),
//                         })),
//                     })),
//                 },
//             };
//         };

//         const finalData = {};
//         Object.keys(form).forEach((key) => {
//             const selected = form[key];
//             const custom = customValues[key];

//             if (
//                 selected === "Others" ||
//                 selected === "Shifted in the Constituency/Ward/Area/Booth" ||
//                 selected === "Shifted outside the Constituency"
//             ) {
//                 finalData[key] = custom || "";
//             } else {
//                 finalData[key] = selected;
//             }
//         });

//         const changedFields = {};
//         Object.keys(finalData).forEach((key) => {
//             const newValue = finalData[key];
//             const oldValue = selectedVoter[key];
//             // ⛔ Skip empty values
//             if (
//                 newValue === undefined ||
//                 newValue === null ||
//                 newValue.toString().trim() === ""
//             ) {
//                 return;
//             }
//             // ✅ Add only if value actually changed
//             if (newValue !== oldValue) {
//                 changedFields[key] = newValue;
//             }
//         });

//         const logId = await addLog(
//             `Updated voter #${voter.epicNo}: ${Object.keys(changedFields).join(", ")}`,
//             voter,
//             booth,
//             "pending",
//             location
//         );

//         const updatedAssemblyData = updateLocalAssembly(
//             parsedAssemblyData,
//             voter.voterId,
//             changedFields,
//             location
//         );

//         await AsyncStorage.setItem('assemblyData', JSON.stringify(updatedAssemblyData));
//         setSelectedVoter(prev => ({ ...prev, ...changedFields }));   // ← NEW LINE

//         const transformedReq = {
//             updateLocationLat: location && location.latitude || 0,
//             updateLocationLng: location && location.longitude || 0,
//             updateRequest: {
//                 ...changedFields,
//                 latitude: voter.latitude || (location && location.latitude) || 0,
//                 longitude: voter.longitude || (location && location.longitude) || 0
//             }
//         };
//         console.log(transformedReq)
//         try {
//             const res = await CRUDAPI.updateVoter(voter.voterId, transformedReq);
//             if (res.success) {
//                 await updateLogStatus(logId, "server");
//                 showBanner("success", "Voter Info updated successfully!")
//             }
//         } catch (error) {
//             console.log(error)
//             showBanner("error", error?.message || "Saved locally, Sync pending due to poor internet connection.")
//         }
//     };

//     const maskValue = (value) => {
//         if (!value) return "";
//         return "*".repeat(value.length);
//     };


//     const openDialer = () => {
//         Linking.openURL(`tel:${form.mobile}`).catch(() =>
//             Alert.alert("Error", "Unable to open dialer.")
//         );
//     };

//     const openMessage = () => {
//         Linking.openURL(`sms:${form.mobile}}`).catch(() =>
//             Alert.alert("Error", "Unable to open messages.")
//         );
//     };

//     const openWhatsApp = () => {
//         const message = encodeURIComponent("Hello! This is a test message from the app.");
//         const url = `whatsapp://send?phone=91${form.mobile}}&text=${message}`;
//         Linking.openURL(url).catch(() => {
//             Alert.alert("WhatsApp not installed", "Please install WhatsApp to send messages.");
//         });
//     };

//     return (
//         <ScrollView className={`flex-1 ${bgColors.white} p-4`}>
//             <Text className="text-xl mb-2 text-black text-center">
//                 {sectionTitles.voterInfo[language]}
//             </Text>
//             <View className={`${bgColors.customBlue} p-4 rounded-2xl mb-5`}>
//                 <View className="text-white text-lg font-semibold mb-2 flex-row justify-between">
//                     <Text className="font-bold text-lg text-white">{voter.voterId} </Text>
//                     <Text className="font-bold text-lg text-white">{voter.epicNo} </Text>
//                 </View>
//                 <View className="space-y-2">
//                     <View className="flex-row mb-2">
//                         <Text className="text-white font-bold w-28">{labels.name[language]}</Text>
//                         <Text className="text-white font-semibold flex-1">
//                             : {language === 'en' ? voter.firstMiddleNameEn.toUpperCase() : voter.firstMiddleNameLocal}
//                         </Text>
//                     </View>

//                     <View className="flex-row mb-2">
//                         <Text className="text-white font-bold w-28">{labels.father[language]}</Text>
//                         <Text className="text-white font-semibold flex-1">
//                             : {language === 'en' ? voter.relationFirstMiddleNameEn.toUpperCase() : voter.relationFirstMiddleNameLocal}
//                         </Text>
//                     </View>

//                     <View className="flex-row mb-2">
//                         <Text className="text-white font-bold w-28">{labels.houseNo[language]}</Text>
//                         <Text className="text-white font-semibold flex-1">
//                             : {language === 'en' ? voter.houseNoEn : voter.houseNoLocal}
//                         </Text>
//                     </View>

//                     <View className="flex-row mb-2">
//                         <Text className="text-white font-bold w-28">{labels.age[language]}</Text>
//                         <Text className="text-white font-semibold flex-1">: {voter.age || ""}</Text>
//                     </View>

//                     <View className="flex-row mb-2">
//                         <Text className="text-white font-bold w-28">{labels.sex[language]}</Text>
//                         <Text className="text-white font-semibold flex-1">: {voter.gender || ""}</Text>
//                     </View>

//                     <View className="flex-row mb-2">
//                         <Text className="text-white font-bold w-28">{labels.address[language]}</Text>
//                         <Text className="text-white font-semibold flex-1">
//                             : {(language === 'en' ? voter.addressEn : voter.addressLocal) || ''}
//                         </Text>
//                     </View>
//                 </View>

//             </View>
//             <Text className="text-xl mb-2 text-black text-center">
//                 {sectionTitles.pollingBooth[language]}
//             </Text>
//             <View className={`${bgColors.customBlue} p-4 rounded-2xl mb-5`}>
//                 <View className="space-y-2">

//                     <View className="flex-row mb-2">
//                         <Text className="text-white font-bold w-32">{boothLabels.ward[language]}</Text>
//                         <Text className="text-white font-semibold flex-1">
//                             : {(booth && booth.wardId) || "N/A"} - {(language === 'en' ? booth?.wardNameEn : booth?.wardNameLocal) || ""}
//                         </Text>
//                     </View>

//                     <View className="flex-row mb-2">
//                         <Text className="text-white font-bold w-32">{boothLabels.epicId[language]}</Text>
//                         <Text className="text-white font-semibold flex-1">
//                             : {voter.epicNo || "N/A"}
//                         </Text>
//                     </View>

//                     <View className="flex-row mb-2">
//                         <Text className="text-white font-bold w-32">{boothLabels.boothNo[language]}</Text>
//                         <Text className="text-white font-semibold flex-1">
//                             : {booth?.boothId || "N/A"}
//                         </Text>
//                     </View>

//                     <View className="flex-row mb-2">
//                         <Text className="text-white font-bold w-32">{boothLabels.boothAddress[language]}</Text>
//                         <Text className="text-white font-semibold flex-1">
//                             : {(language === 'en' ? booth?.boothNameEn : booth?.boothNameLocal) || "N/A"}
//                         </Text>
//                     </View>

//                 </View>
//             </View>
//             {/* {[
//                 { key: "mobile", label: "Mobile Number" },
//                 { key: "dob", label: "DOB" },
//                 { key: "community", label: "Community" },
//                 { key: "caste", label: "Caste" },
//                 { key: "motherTongue", label: "Mother Tongue" },
//                 { key: "education", label: "Education" },
//                 { key: "residenceType", label: "Residency Type" },
//                 { key: "ownership", label: "Ownership" },
//                 { key: "civicIssue", label: "Civic Issues" },
//                 { key: "natureOfVoter", label: "Nature Of Voter" },
//             ].map(({ key, label }) => (
//                 <View key={key} className="mb-4">
//                     <Text className="text-sm text-gray-500 mb-1 ">{label}</Text>
//                     <TextInput
//                         placeholder={label}
//                         placeholderTextColor="#888"
//                         value={form[key]}
//                         onChangeText={(text) => handleChange(key, text)}
//                         className={`border border-gray-300 rounded-lg px-4 py-3 text-black ${bgColors.customLightBlue3}`}
//                     />
//                 </View>
//             ))} */}
//             <View className={`p-5 ${bgColors.white} flex-1`}>
//                 {fields.map(({ key, label }) => (
//                     <View key={key} className="mb-4">
//                         <Text className="text-sm text-gray-600 mb-1">{label}</Text>
//                         {key === "mobile" ? (
//                             <TextInput
//                                 placeholder="Enter 10-digit mobile number"
//                                 placeholderTextColor="#888"
//                                 keyboardType="number-pad"
//                                 maxLength={10}
//                                 value={maskValue(form.mobile)}
//                                 onChangeText={(text) => handleChange("mobile", text)}
//                                 className={`border border-black rounded-lg px-4 py-3 text-black ${bgColors.customLightBlue3}`}
//                             />
//                         ) : key === "dob" ? (
//                             <TextInput
//                                 placeholder="DD/MM/YYYY"
//                                 placeholderTextColor="#888"
//                                 keyboardType="number-pad"
//                                 maxLength={10}
//                                 value={maskValue(form.dob)}
//                                 onChangeText={(text) => handleChange("dob", text)}
//                                 className={`border border-black rounded-lg px-4 py-3 text-black ${bgColors.customLightBlue3}`}
//                             />
//                         ) : (
//                             <>
//                                 <Dropdown
//                                     style={{
//                                         borderColor: "#000",
//                                         borderWidth: 1,
//                                         borderRadius: 10,
//                                         paddingHorizontal: 12,
//                                         backgroundColor: "#E3EDF3",
//                                         height: 48,
//                                     }}
//                                     placeholderStyle={{ color: "#888" }}
//                                     selectedTextStyle={{ color: "#000" }}
//                                     data={dropdownOptions[key].map((item) => ({
//                                         label: item,
//                                         value: item,
//                                     }))}
//                                     labelField="label"
//                                     valueField="value"
//                                     placeholder={`Select ${label}`}
//                                     value={form[key]}
//                                     // value={maskValue(form[key] || "")}
//                                     onChange={(item) => {
//                                         handleChange(key, item.value);
//                                         if (
//                                             item.value !== "Others" &&
//                                             item.value !== "Shifted in the Constituency/Ward/Area/Booth" &&
//                                             item.value !== "Shifted outside the Constituency"
//                                         ) {
//                                             setCustomValues({ ...customValues, [key]: "" });
//                                         }
//                                     }}
//                                 />

//                                 {/* Show custom input for these special options */}
//                                 {(
//                                     form[key] === "Others" ||
//                                     form[key] === "Shifted in the Constituency/Ward/Area/Booth" ||
//                                     form[key] === "Shifted outside the Constituency"
//                                 ) && (
//                                         <TextInput
//                                             placeholder={`Enter your ${label.toLowerCase()}`}
//                                             placeholderTextColor="#888"
//                                             value={customValues[key] || ""}
//                                             onChangeText={(text) => {
//                                                 setCustomValues({ ...customValues, [key]: text });
//                                                 // ⚠️ Don’t update form[key] here – keep dropdown stable
//                                             }}
//                                             className={`border border-dashed border-gray-400 rounded-lg px-4 py-3 mt-2 text-black ${bgColors.customLightBlue4}`}
//                                         />
//                                     )}

//                             </>
//                         )}
//                     </View>
//                 ))}

//                 <View className="flex-col space-y-4 mt-6">
//                     <TouchableOpacity
//                         className={`flex-row justify-center items-center py-3 rounded-full ${location || voter?.latitude ? bgColors.green600 : bgColors.customBlue}`}
//                         onPress={fetchLocation}
//                     >
//                         <Ionicons
//                             name={location || voter?.latitude ? "checkmark-circle-outline" : "location-outline"}
//                             size={20}
//                             color="white"
//                         />
//                         <Text className="text-white text-base font-semibold ml-2">
//                             {location || voter?.latitude ? "Location Fetched" : "Get Location"}
//                         </Text>
//                     </TouchableOpacity>

//                     {/* {location && (
//                         <Text className="mt-4 text-center">
//                             Lat: {location.latitude}{"\n"}
//                             Lng: {location.longitude}
//                         </Text>
//                     )} */}
//                     {/* ☎️ Call / 💬 Message / 🟢 WhatsApp Buttons */}
//                     <View className="flex-row justify-between mt-6 space-x-4">
//                         <TouchableOpacity
//                             onPress={openDialer}
//                             className={`flex-row items-center ${bgColors.green700} px-4 py-3 rounded-full`}
//                         >
//                             <Ionicons name="call-outline" size={20} color="white" />
//                             <Text className="text-white ml-2 font-semibold">Call</Text>
//                         </TouchableOpacity>

//                         <TouchableOpacity
//                             onPress={openMessage}
//                             className={`flex-row items-center ${bgColors.blue600} px-4 py-3 rounded-full`}
//                         >
//                             <Ionicons name="chatbubble-outline" size={20} color="white" />
//                             <Text className="text-white ml-2 font-semibold">Message</Text>
//                         </TouchableOpacity>

//                         <TouchableOpacity
//                             onPress={openWhatsApp}
//                             className={`flex-row items-center ${bgColors.green500} px-4 py-3 rounded-full`}
//                         >
//                             <Ionicons name="logo-whatsapp" size={20} color="white" />
//                             <Text className="text-white ml-2 font-semibold">WhatsApp</Text>
//                         </TouchableOpacity>
//                     </View>
//                     <View className="flex-row justify-between mt-5 mb-5 mx-5">
//                         <TouchableOpacity
//                             onPress={handleReset}
//                             className={`flex-1 ${bgColors.customLightBlue3} py-3 rounded-full mr-2`}
//                         >
//                             <Text className="text-[#2E6F91] font-semibold text-center">Reset</Text>
//                         </TouchableOpacity>
//                         <TouchableOpacity
//                             onPress={() => handleUpdate()}
//                             className={`flex-1 ${bgColors.customBlue} py-3 rounded-full`}
//                         >
//                             <Text className="text-white font-semibold text-center">Update</Text>
//                         </TouchableOpacity>
//                     </View>
//                 </View>
//             </View>

//         </ScrollView>
//     );
// }
