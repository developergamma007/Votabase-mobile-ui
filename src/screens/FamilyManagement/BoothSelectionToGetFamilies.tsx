import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { CRUDAPI, getAssemblyCode, GOOGLE_MAPS_API_KEY } from "../../apis/Api";
import { bgColors } from "../../constants/colors";
import DropDownPicker from "react-native-dropdown-picker";
import { GetCurrentLocation } from "../../components/GetCurrentLocation";
import { WebView } from "react-native-webview";

export default function VotersFamilyScreen() {
  const navigation = useNavigation();
  const [assemblyCode, setAssemblyCode] = useState("");
  const [openAssembly, setOpenAssembly] = useState(false);
  const [assemblyItems, setAssemblyItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"NEW" | "LIST">("NEW");

  const [familyName, setFamilyName] = useState("");
  const [familyAddress, setFamilyAddress] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberSuggestions, setMemberSuggestions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [headEpicNo, setHeadEpicNo] = useState("");
  const [headPhone, setHeadPhone] = useState("");
  const [economicStatus, setEconomicStatus] = useState("NA");
  const [familyNature, setFamilyNature] = useState("NA");
  const [familyPoints, setFamilyPoints] = useState("5");
  const [showBuildingTag, setShowBuildingTag] = useState(false);
  const [buildingName, setBuildingName] = useState("");
  const [buildingAddress, setBuildingAddress] = useState("");
  const [hasAssociation, setHasAssociation] = useState(false);
  const [associationName, setAssociationName] = useState("");
  const [associationHeadName, setAssociationHeadName] = useState("");
  const [associationHeadPhone, setAssociationHeadPhone] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [families, setFamilies] = useState<any[]>([]);
  const [familySearch, setFamilySearch] = useState("");
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openEconomic, setOpenEconomic] = useState(false);
  const [openHead, setOpenHead] = useState(false);
  const [openNature, setOpenNature] = useState(false);
  const [openPoints, setOpenPoints] = useState(false);

  const [economicItems, setEconomicItems] = useState([
    { label: "NA", value: "NA" },
    { label: "Low", value: "LOW" },
    { label: "Middle", value: "MIDDLE" },
    { label: "High", value: "HIGH" },
  ]);
  const [natureItems, setNatureItems] = useState([
    { label: "A", value: "A" },
    { label: "B", value: "B" },
    { label: "C", value: "C" },
    { label: "NA", value: "NA" },
  ]);
  const [pointItems, setPointItems] = useState([
    { label: "5", value: "5" },
    { label: "10", value: "10" },
    { label: "15", value: "15" },
    { label: "20", value: "20" },
  ]);

  useEffect(() => {
    const loadContext = async () => {
      const code = await getAssemblyCode();
      setAssemblyCode(String(code));
      try {
        const dropdownResp = await CRUDAPI.getAssemblyDropdown();
        const payload = dropdownResp?.data?.result || dropdownResp?.result || dropdownResp?.data || [];
        const items = Array.isArray(payload)
          ? payload.map((a: any) => ({
              label: a?.name || a?.label || a?.assemblyName || `${a?.code || a?.assemblyCode || ''}`,
              value: String(a?.code || a?.assemblyCode || a?.id || code),
            }))
          : [];
        setAssemblyItems(items.length ? items : [{ label: String(code), value: String(code) }]);
      } catch {
        setAssemblyItems([{ label: String(code), value: String(code) }]);
      }
    };
    loadContext();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = memberQuery.trim();
      if (!q) {
        setMemberSuggestions([]);
        return;
      }
      try {
        const res = await CRUDAPI.searchVoters({ searchQuery: q, size: 20, assemblyCode: await getAssemblyCode() });
        const payload = res?.data?.result || res?.result || res?.data || [];
        setMemberSuggestions(Array.isArray(payload) ? payload : []);
      } catch {
        setMemberSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [memberQuery]);

  const loadFamilies = async () => {
    setFamiliesLoading(true);
    try {
      const res = await CRUDAPI.fetchFamilies("", 0, 100, undefined);
      const payload = res?.content || res?.data?.content || res?.data?.result || res?.result || [];
      setFamilies(Array.isArray(payload) ? payload : []);
    } catch {
      setFamilies([]);
    } finally {
      setFamiliesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "LIST") loadFamilies();
  }, [activeTab]);

  const filteredFamilies = useMemo(() => {
    const q = familySearch.trim().toLowerCase();
    if (!q) return families;
    return families.filter((f: any) =>
      String(f?.familyName || "").toLowerCase().includes(q) ||
      String(f?.familyAddress || "").toLowerCase().includes(q)
    );
  }, [families, familySearch]);

  const addMember = (voter: any) => {
    if (!voter?.epicNo) return;
    if (members.some((m) => m.epicNo === voter.epicNo)) return;
    const boothId = voter?.boothInfo?.boothId || voter?.boothId || voter?.booth_id;
    const voterName = [voter?.firstMiddleNameEn, voter?.lastNameEn].filter(Boolean).join(" ").trim() || voter?.epicNo;
    setMembers((prev) => [...prev, {
      epicNo: voter.epicNo,
      voterName,
      phone: voter.mobile || "",
      relationName: voter.relationNameEn || voter.relationNameLocal || "",
      houseNo: voter.houseNoEn || voter.houseNoLocal || "",
      boothId
    }]);
    setMemberQuery("");
    setMemberSuggestions([]);
    if (!headEpicNo) setHeadEpicNo(voter.epicNo);
  };

  const removeMember = (epicNo: string) => {
    setMembers((prev) => prev.filter((m) => m.epicNo !== epicNo));
    if (headEpicNo === epicNo) setHeadEpicNo("");
  };

  const captureLocation = async () => {
    setError("");
    try {
      const pos: any = await GetCurrentLocation();
      if (!pos?.latitude || !pos?.longitude) {
        throw new Error("Unable to capture location.");
      }
      setLocation({ latitude: Number(pos.latitude), longitude: Number(pos.longitude) });
      setSuccess("Location captured.");
    } catch (e: any) {
      setError(e?.message || "Unable to capture location.");
    }
  };

  const createFamily = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (!familyName.trim()) throw new Error("Family name is required");
      if (!familyAddress.trim()) throw new Error("Family Address is required");
      if (members.length === 0) throw new Error("Add at least one member");
      if (!headEpicNo) throw new Error("Pick head of family");
      const boothId = members.find((m) => m.boothId)?.boothId;
      if (!boothId) throw new Error("Member booth info missing");

      await CRUDAPI.createFamily({
        familyName,
        familyAddress,
        headEpicNo,
        memberEpicNos: members.map((m) => m.epicNo),
        boothId: Number(boothId),
        phone: headPhone || members.find((m) => m.epicNo === headEpicNo)?.phone || "",
        points: Number(familyPoints || 5),
        pointsProvided: 0,
        economicStatus,
        familyNature,
        buildingName: showBuildingTag ? buildingName : null,
        buildingAddress: showBuildingTag ? buildingAddress : null,
        hasAssociation: showBuildingTag ? hasAssociation : false,
        associationName: showBuildingTag && hasAssociation ? associationName : null,
        associationHeadName: showBuildingTag && hasAssociation ? associationHeadName : null,
        associationHeadPhone: showBuildingTag && hasAssociation ? associationHeadPhone : null,
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
      });

      setSuccess("Family saved successfully.");
      setFamilyName("");
      setFamilyAddress("");
      setMembers([]);
      setHeadEpicNo("");
      setHeadPhone("");
      setEconomicStatus("NA");
      setFamilyNature("NA");
      setFamilyPoints("5");
      setShowBuildingTag(false);
      setBuildingName("");
      setBuildingAddress("");
      setHasAssociation(false);
      setAssociationName("");
      setAssociationHeadName("");
      setAssociationHeadPhone("");
      setLocation(null);
    } catch (e: any) {
      setError(e?.message || "Failed to create family.");
    } finally {
      setSaving(false);
    }
  };

  const locationMapHtml = useMemo(() => {
    if (!location || !GOOGLE_MAPS_API_KEY) return "";
    return `
      <!doctype html>
      <html>
      <head>
        <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
        <style>
          html, body, #map { margin:0; padding:0; width:100%; height:100%; background:#f8fafc; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          function initMap() {
            var pos = { lat: ${location.latitude}, lng: ${location.longitude} };
            var map = new google.maps.Map(document.getElementById('map'), { zoom: 17, center: pos });
            new google.maps.Marker({ position: pos, map: map, title: 'Household Location' });
          }
        </script>
        <script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap"></script>
      </body>
      </html>
    `;
  }, [location]);

  return (
    <View className={`flex-1 ${bgColors.white}`}>
      <ScrollView className="p-4">
        <View className="bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-3 z-50">
          <Text className="text-slate-500 text-xs font-bold mb-1">CONTEXT</Text>
          <DropDownPicker
            open={openAssembly}
            value={assemblyCode}
            items={assemblyItems}
            setOpen={setOpenAssembly}
            setValue={setAssemblyCode}
            setItems={setAssemblyItems}
            style={{ borderColor: "#CBD5E1", minHeight: 46 }}
            dropDownContainerStyle={{ borderColor: "#CBD5E1" }}
            textStyle={{ fontSize: 15, fontWeight: "700", color: "#0f172a" }}
          />
        </View>
        <View className="bg-slate-100 border border-slate-200 rounded-2xl p-2 flex-row mb-5">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl ${activeTab === "NEW" ? "bg-blue-600" : "bg-transparent"}`}
            onPress={() => setActiveTab("NEW")}
          >
            <Text className={`text-center font-bold ${activeTab === "NEW" ? "text-white" : "text-slate-700"}`}>New Family</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl ${activeTab === "LIST" ? "bg-blue-600" : "bg-transparent"}`}
            onPress={() => setActiveTab("LIST")}
          >
            <Text className={`text-center font-bold ${activeTab === "LIST" ? "text-white" : "text-slate-700"}`}>Families</Text>
          </TouchableOpacity>
        </View>

        {activeTab === "NEW" ? (
          <>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-slate-600 mb-2 font-semibold">Enter family name</Text>
                <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3" value={familyName} onChangeText={setFamilyName} placeholder="Family name" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-600 mb-2 font-semibold">Family Address</Text>
                <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3" value={familyAddress} onChangeText={setFamilyAddress} placeholder="Family Address" />
              </View>
            </View>

            <View className="mt-4 border border-dashed border-slate-300 rounded-2xl h-56 overflow-hidden bg-slate-50">
              {location && locationMapHtml ? (
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: locationMapHtml }}
                  javaScriptEnabled
                  domStorageEnabled
                  scrollEnabled={false}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-slate-500 text-base text-center px-6">
                    Capture location to preview household map.
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity className="mt-4 bg-blue-600 rounded-2xl py-4 flex-row items-center justify-center" onPress={captureLocation}>
              <Ionicons name="location-outline" size={20} color="#fff" />
              <Text className="text-white font-bold text-[14px] ml-2">Capture Household Location</Text>
            </TouchableOpacity>

            <Text className="text-slate-800 font-bold text-[20px] mt-7 mb-3">Family Members</Text>
            <View className="flex-row">
              <TextInput
                className="flex-1 border border-slate-300 bg-white rounded-xl px-4 py-3"
                placeholder="Search voter by EPIC or name"
                value={memberQuery}
                onChangeText={setMemberQuery}
              />
            </View>

            {memberSuggestions.length > 0 ? (
              <View className="border border-slate-200 rounded-xl mt-2 bg-white">
                {memberSuggestions.slice(0, 8).map((item: any, idx) => (
                  <TouchableOpacity key={`${String(item?.epicNo || item?.voterId || item?.firstMiddleNameEn || "suggestion")}-${idx}`} className="px-3 py-2 border-b border-slate-100" onPress={() => addMember(item)}>
                    <Text className="font-semibold text-slate-800">{[item.firstMiddleNameEn, item.lastNameEn].filter(Boolean).join(" ") || item.epicNo}</Text>
                    <Text className="text-slate-500 text-xs">EPIC: {item.epicNo || "-"} | Mobile: {item.mobile || "-"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View className="mt-3 border border-slate-200 rounded-2xl overflow-hidden">
              <View className="bg-slate-100 flex-row px-3 py-2">
                <Text className="flex-1 font-bold text-slate-700">Name</Text>
                <Text className="w-24 font-bold text-slate-700">EPIC</Text>
                <Text className="w-28 font-bold text-slate-700">Relation</Text>
                <Text className="w-24 font-bold text-slate-700">Phone</Text>
                <Text className="w-24 font-bold text-slate-700">House No</Text>
                <Text className="w-20 font-bold text-slate-700">Actions</Text>
              </View>
              {members.map((m, memberIndex) => (
                <View key={`${String(m?.epicNo || m?.memberId || m?.voterName || "member")}-${memberIndex}`} className="flex-row items-center px-3 py-2 border-t border-slate-100">
                  <View className="flex-1">
                    <Text className="text-slate-800 font-semibold">{m.voterName}</Text>
                    <TouchableOpacity onPress={() => setHeadEpicNo(m.epicNo)}>
                      <Text className={`text-xs mt-1 ${headEpicNo === m.epicNo ? "text-blue-600 font-bold" : "text-slate-500"}`}>
                        {headEpicNo === m.epicNo ? "Head of family" : "Set as head"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text className="w-24 text-slate-700">{m.epicNo}</Text>
                  <Text className="w-28 text-slate-700">{m.relationName || "-"}</Text>
                  <Text className="w-24 text-slate-700">{m.phone || "-"}</Text>
                  <Text className="w-24 text-slate-700">{m.houseNo || "-"}</Text>
                  <TouchableOpacity className="w-20" onPress={() => removeMember(m.epicNo)}>
                    <Text className="text-red-600 font-semibold">Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {members.length === 0 ? <Text className="px-3 py-5 text-slate-400">No members added.</Text> : null}
            </View>

            <View className="mt-5">
              <View className="flex-row gap-3">
                <View className="flex-1 z-40">
                  <Text className="text-slate-700 font-semibold mb-2">Economic status</Text>
                  <DropDownPicker
                    open={openEconomic}
                    value={economicStatus}
                    items={economicItems}
                    setOpen={setOpenEconomic}
                    setValue={setEconomicStatus}
                    setItems={setEconomicItems}
                    style={{ borderColor: "#CBD5E1", minHeight: 48 }}
                    dropDownContainerStyle={{ borderColor: "#CBD5E1" }}
                  />
                </View>
                <View className="flex-1 z-30">
                  <Text className="text-slate-700 font-semibold mb-2">Head of Family</Text>
                  <DropDownPicker
                    open={openHead}
                    value={headEpicNo}
                    items={members.map((m) => ({ label: `${m.voterName} (${m.epicNo})`, value: m.epicNo }))}
                    setOpen={setOpenHead}
                    setValue={setHeadEpicNo}
                    setItems={() => {}}
                    placeholder="Pick head of family"
                    style={{ borderColor: "#CBD5E1", minHeight: 48 }}
                    dropDownContainerStyle={{ borderColor: "#CBD5E1" }}
                  />
                </View>
              </View>
              <View className="flex-row gap-3 mt-3">
                <View className="flex-1">
                  <Text className="text-slate-700 font-semibold mb-2">Family Head Phone Number (10 digits)</Text>
                  <TextInput
                    className="border border-slate-300 bg-white rounded-xl px-4 py-3"
                    placeholder="Phone number"
                    value={headPhone}
                    onChangeText={setHeadPhone}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
                <View className="flex-1 z-20">
                  <Text className="text-slate-700 font-semibold mb-2">Family Nature</Text>
                  <DropDownPicker
                    open={openNature}
                    value={familyNature}
                    items={natureItems}
                    setOpen={setOpenNature}
                    setValue={setFamilyNature}
                    setItems={setNatureItems}
                    style={{ borderColor: "#CBD5E1", minHeight: 48 }}
                    dropDownContainerStyle={{ borderColor: "#CBD5E1" }}
                  />
                </View>
              </View>
              <View className="mt-3 z-10">
                <Text className="text-slate-700 font-semibold mb-2">Points to the family</Text>
                <DropDownPicker
                  open={openPoints}
                  value={familyPoints}
                  items={pointItems}
                  setOpen={setOpenPoints}
                  setValue={setFamilyPoints}
                  setItems={setPointItems}
                  style={{ borderColor: "#CBD5E1", minHeight: 48 }}
                  dropDownContainerStyle={{ borderColor: "#CBD5E1" }}
                />
              </View>
              <TouchableOpacity className="mt-4 bg-green-600 rounded-lg py-3" onPress={() => setShowBuildingTag((v) => !v)}>
                <Text className="text-center text-white font-semibold">Tag Building/ Apartment</Text>
              </TouchableOpacity>
            </View>

            {showBuildingTag ? (
              <View className="mt-4">
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-slate-700 font-semibold mb-2">Building/ Apartment Name</Text>
                    <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3" placeholder="Name" value={buildingName} onChangeText={setBuildingName} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-700 font-semibold mb-2">Address</Text>
                    <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3" placeholder="Building Address" value={buildingAddress} onChangeText={setBuildingAddress} />
                  </View>
                </View>

                <TouchableOpacity className="flex-row items-center mt-4" onPress={() => setHasAssociation((v) => !v)}>
                  <View className={`w-7 h-7 rounded mr-3 items-center justify-center ${hasAssociation ? "bg-blue-600" : "bg-slate-200"}`}>
                    {hasAssociation ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                  </View>
                  <Text className="text-slate-800 text-[16px] font-semibold">If have association</Text>
                </TouchableOpacity>

                {hasAssociation ? (
                  <View className="mt-4">
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <Text className="text-slate-700 font-semibold mb-2">Association Name</Text>
                        <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3" placeholder="Association Name" value={associationName} onChangeText={setAssociationName} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-slate-700 font-semibold mb-2">Association Head Name</Text>
                        <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3" placeholder="Association Head Name" value={associationHeadName} onChangeText={setAssociationHeadName} />
                      </View>
                    </View>
                    <View className="mt-3">
                      <Text className="text-slate-700 font-semibold mb-2">Association Head Phone number (10 digits)</Text>
                      <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3" placeholder="Phone number" value={associationHeadPhone} onChangeText={setAssociationHeadPhone} keyboardType="number-pad" maxLength={10} />
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {error ? <Text className="text-red-600 mt-3">{error}</Text> : null}
            {success ? <Text className="text-green-700 mt-3">{success}</Text> : null}

            <TouchableOpacity className={`mt-4 rounded-2xl py-4 ${saving ? "bg-slate-400" : "bg-blue-700"}`} onPress={createFamily} disabled={saving}>
              <Text className="text-center text-white font-bold text-[17px]">{saving ? "Saving..." : "Save Family"}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              className="border border-slate-300 bg-white rounded-xl px-4 py-3 mb-3"
              placeholder="Search family or address..."
              value={familySearch}
              onChangeText={setFamilySearch}
            />
            {familiesLoading ? <ActivityIndicator size="large" color="#2563eb" /> : null}
            {!familiesLoading && filteredFamilies.length === 0 ? <Text className="text-slate-400 mt-2">No families found.</Text> : null}
            {!familiesLoading && filteredFamilies.length > 0 ? (
              <View className="gap-2">
                {filteredFamilies.map((item: any, familyIndex: number) => (
                  <TouchableOpacity
                    key={`${String(item?.familyId || item?.familyName || "family")}-${familyIndex}`}
                    className="bg-white border border-slate-200 rounded-2xl p-4"
                    onPress={() => (navigation as any).navigate("voterFamilyDetails", { family: item, associationName: null, boothId: item.boothId })}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="font-bold text-slate-800 text-base">{item.familyName}</Text>
                      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                    </View>
                    <Text className="text-slate-500 mt-2">{item.familyAddress || "-"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
