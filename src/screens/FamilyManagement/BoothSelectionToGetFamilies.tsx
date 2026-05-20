import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Share } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { CRUDAPI, getAssemblyCode, GOOGLE_MAPS_API_KEY } from "../../apis/Api";
import { bgColors } from "../../constants/colors";
import DropDownPicker from "react-native-dropdown-picker";
import { GetCurrentLocation } from "../../components/GetCurrentLocation";
import { WebView } from "react-native-webview";
import {
  FAMILY_AVAILABILITY_OPTIONS,
  FAMILY_POINT_OPTIONS,
  getNextFamilyNumber,
  hasHouseMarkingFields,
  normalizeVoterForInfo,
  sortFamiliesByNumber,
  getVoterRelationDisplay,
  getVoterPhoneDisplay,
  getVoterHouseDisplay,
} from "../../components/FamilyFormHelpers";
import { AuthContext } from "../../context/AuthContext";

export default function VotersFamilyScreen() {
  const navigation = useNavigation();
  const { userInfo } = React.useContext(AuthContext) as any;
  const role = String(userInfo?.role || "").replace("ROLE_", "").toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [assemblyCode, setAssemblyCode] = useState("");
  const [openAssembly, setOpenAssembly] = useState(false);
  const [assemblyItems, setAssemblyItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"NEW" | "LIST">("NEW");

  const [familyName, setFamilyName] = useState("");
  const [familyAddress, setFamilyAddress] = useState("");
  const [roadName, setRoadName] = useState("");
  const [buildingNumber, setBuildingNumber] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [familyNumber, setFamilyNumber] = useState("");
  const [tagLeader, setTagLeader] = useState("");
  const [familyAvailability, setFamilyAvailability] = useState("Available");
  const [roadSuggestions, setRoadSuggestions] = useState<string[]>([]);
  const [leaderSuggestions, setLeaderSuggestions] = useState<string[]>([]);
  const [showRoadSuggestions, setShowRoadSuggestions] = useState(false);
  const [showLeaderSuggestions, setShowLeaderSuggestions] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberSuggestions, setMemberSuggestions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [headEpicNo, setHeadEpicNo] = useState("");
  const [headPhone, setHeadPhone] = useState("");
  const [economicStatus, setEconomicStatus] = useState("NA");
  const [familyNature, setFamilyNature] = useState("NA");
  const [familyPoints, setFamilyPoints] = useState("5");
  const [showBuildingTag, setShowBuildingTag] = useState(false);
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
  const [openAvailability, setOpenAvailability] = useState(false);

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
  const [pointItems, setPointItems] = useState(FAMILY_POINT_OPTIONS);
  const [availabilityItems, setAvailabilityItems] = useState(
    FAMILY_AVAILABILITY_OPTIONS.map((item) => ({ label: item, value: item }))
  );

  const loadFamilySuggestions = async () => {
    try {
      const [roadRes, leaderRes] = await Promise.all([
        CRUDAPI.fetchFamilySuggestions("road").catch(() => ({ data: { result: [] } })),
        CRUDAPI.fetchFamilySuggestions("leader").catch(() => ({ data: { result: [] } })),
      ]);
      setRoadSuggestions(roadRes?.data?.result || roadRes?.result || []);
      setLeaderSuggestions(leaderRes?.data?.result || leaderRes?.result || []);
    } catch {
      setRoadSuggestions([]);
      setLeaderSuggestions([]);
    }
  };

  useEffect(() => {
    if (hasHouseMarkingFields(buildingNumber, buildingName, flatNumber)) {
      setFamilyNumber(String(getNextFamilyNumber(families)));
    } else {
      setFamilyNumber("");
    }
  }, [buildingNumber, buildingName, flatNumber, families]);

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
            value: a?.code || a?.assemblyCode || String(a?.id || code),
          }))
          : [];
        setAssemblyItems(items.length ? items : [{ label: String(code), value: String(code) }]);
      } catch {
        setAssemblyItems([{ label: String(code), value: String(code) }]);
      }
      await loadFamilySuggestions();
      try {
        const all = await CRUDAPI.fetchAllFamilies("", undefined);
        setFamilies(sortFamiliesByNumber(all));
      } catch {
        // keep empty; next family number defaults to 1
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
      const all = await CRUDAPI.fetchAllFamilies("", undefined);
      setFamilies(sortFamiliesByNumber(all));
    } catch {
      setFamilies([]);
    } finally {
      setFamiliesLoading(false);
    }
  };

  const resetNewFamilyForm = () => {
    setFamilyName("");
    setFamilyAddress("");
    setRoadName("");
    setBuildingNumber("");
    setBuildingName("");
    setFlatNumber("");
    setFamilyNumber("");
    setTagLeader("");
    setFamilyAvailability("Available");
    setMembers([]);
    setHeadEpicNo("");
    setHeadPhone("");
    setEconomicStatus("NA");
    setFamilyNature("NA");
    setFamilyPoints("5");
    setShowBuildingTag(false);
    setBuildingAddress("");
    setHasAssociation(false);
    setAssociationName("");
    setAssociationHeadName("");
    setAssociationHeadPhone("");
    setLocation(null);
    setMemberQuery("");
    setMemberSuggestions([]);
    setShowRoadSuggestions(false);
    setShowLeaderSuggestions(false);
    setError("");
    setSuccess("");
  };

  const downloadFamiliesExcel = async () => {
    if (!families.length) return;
    const headers = [
      "Family Name", "Road Name", "Family Number", "Flat No", "Building Number", "Building Name",
      "Head of Family", "Head EPIC", "Members", "Availability", "Points", "Tag Leader", "Address", "Member Details",
    ];
    const rows = families.map((f: any) => {
      const memberText = (f.members || [])
        .map((m: any, i: number) => `${i + 1}. ${m.voterName || "-"} | ${m.relationName || "-"} | ${m.epicNo || "-"}`)
        .join(" ; ");
      return [
        f.familyName, f.roadName, f.familyNumber, f.flatNumber, f.buildingNumber, f.buildingName,
        f.headName, f.headEpicNo, f.memberCount ?? f.members?.length, f.familyAvailability,
        f.points, f.tagLeader, f.familyAddress, memberText,
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    await Share.share({ title: "Families Export", message: csv });
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
      phone: getVoterPhoneDisplay(voter),
      relationName: getVoterRelationDisplay(voter),
      houseNo: getVoterHouseDisplay(voter),
      boothId,
      rawVoter: voter,
    }]);
    setMemberQuery("");
    setMemberSuggestions([]);
    if (!headEpicNo) setHeadEpicNo(voter.epicNo);
  };

  const openVoterInfo = (member: any) => {
    if (!member?.rawVoter) return;
    (navigation as any).navigate("Voter Info", {
      voter: normalizeVoterForInfo(member.rawVoter, member.boothId),
      booth: { boothId: member.boothId },
    });
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
      if (!roadName.trim()) throw new Error("Road name is required");
      if (!familyAddress.trim()) throw new Error("Family Address is required");
      if (members.length === 0) throw new Error("Add at least one member");
      if (!headEpicNo) throw new Error("Pick head of family");
      const boothId = members.find((m) => m.boothId)?.boothId;
      if (!boothId) throw new Error("Member booth info missing");

      if (!hasHouseMarkingFields(buildingNumber, buildingName, flatNumber)) {
        throw new Error("Building Number, Building Name, and Flat Number are required");
      }
      const generatedFamilyNumber = String(getNextFamilyNumber(families));

      await CRUDAPI.createFamily({
        familyName,
        familyAddress,
        roadName: roadName.trim(),
        buildingNumber: buildingNumber.trim() || null,
        buildingName: buildingName.trim() || null,
        flatNumber: flatNumber.trim() || null,
        familyNumber: generatedFamilyNumber || null,
        tagLeader: tagLeader.trim() || null,
        familyAvailability,
        headEpicNo,
        memberEpicNos: members.map((m) => m.epicNo),
        boothId: Number(boothId),
        phone: headPhone || members.find((m) => m.epicNo === headEpicNo)?.phone || "",
        points: Number(familyPoints || 5),
        pointsProvided: 0,
        economicStatus,
        familyNature,
        buildingAddress: showBuildingTag ? buildingAddress : null,
        hasAssociation: showBuildingTag ? hasAssociation : false,
        associationName: showBuildingTag && hasAssociation ? associationName : null,
        associationHeadName: showBuildingTag && hasAssociation ? associationHeadName : null,
        associationHeadPhone: showBuildingTag && hasAssociation ? associationHeadPhone : null,
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
      });

      setSuccess("Family saved successfully.");
      await loadFamilySuggestions();
      const all = await CRUDAPI.fetchAllFamilies("", undefined);
      setFamilies(sortFamiliesByNumber(all));
      resetNewFamilyForm();
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
            style={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12, minHeight: 46 }}
            dropDownContainerStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12 }}
            textStyle={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}
            placeholderStyle={{ color: '#94A3B8' }}
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

            <View className="mt-4">
              <Text className="text-slate-600 mb-2 font-semibold">Road Name (Mandatory)</Text>
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 border border-slate-300 bg-white rounded-xl px-4 py-3"
                  value={roadName}
                  onChangeText={(text) => {
                    setRoadName(text);
                    setShowRoadSuggestions(true);
                  }}
                  onFocus={() => setShowRoadSuggestions(true)}
                  placeholder="Road name"
                />
                <TouchableOpacity
                  className="bg-blue-600 rounded-xl px-4 justify-center"
                  onPress={() => {
                    if (!roadName.trim()) {
                      setError("Road name is required.");
                      return;
                    }
                    setError("");
                    setSuccess("Road name added for house marking.");
                    setShowRoadSuggestions(false);
                  }}
                >
                  <Text className="text-white font-bold">Add</Text>
                </TouchableOpacity>
              </View>
              {showRoadSuggestions && roadSuggestions.length > 0 ? (
                <View className="border border-slate-200 rounded-xl mt-2 bg-white max-h-36">
                  <ScrollView nestedScrollEnabled>
                    {roadSuggestions
                      .filter((item) => !roadName.trim() || item.toLowerCase().includes(roadName.trim().toLowerCase()))
                      .slice(0, 8)
                      .map((item) => (
                        <TouchableOpacity key={item} className="px-3 py-2 border-b border-slate-100" onPress={() => { setRoadName(item); setShowRoadSuggestions(false); }}>
                          <Text className="text-slate-800">{item}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <View className="flex-row gap-3 mt-4 flex-wrap">
              <View className="flex-1 min-w-[45%]">
                <Text className="text-slate-600 mb-2 font-semibold">Building Number</Text>
                <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3" value={buildingNumber} onChangeText={setBuildingNumber} placeholder="Building Number" />
              </View>
              <View className="flex-1 min-w-[45%]">
                <Text className="text-slate-600 mb-2 font-semibold">Building Name</Text>
                <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3" value={buildingName} onChangeText={setBuildingName} placeholder="Building Name" />
              </View>
              <View className="flex-1 min-w-[45%]">
                <Text className="text-slate-600 mb-2 font-semibold">Flat Number</Text>
                <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3" value={flatNumber} onChangeText={setFlatNumber} placeholder="Flat Number" />
              </View>
              <View className="flex-1 min-w-[45%]">
                <Text className="text-slate-600 mb-2 font-semibold">Family Number</Text>
                <TextInput className="border border-slate-200 bg-slate-100 rounded-xl px-4 py-3 text-slate-600" value={familyNumber} editable={false} placeholder="Auto (1, 2, 3…)" keyboardType="number-pad" />
              </View>
            </View>

            <View className="mt-4 z-40">
              <Text className="text-slate-600 mb-2 font-semibold">Tag a Leader</Text>
              <TextInput
                className="border border-slate-300 bg-white rounded-xl px-4 py-3"
                value={tagLeader}
                onChangeText={(text) => { setTagLeader(text); setShowLeaderSuggestions(true); }}
                onFocus={() => setShowLeaderSuggestions(true)}
                placeholder="Leader name"
              />
              {showLeaderSuggestions && leaderSuggestions.length > 0 ? (
                <View className="border border-slate-200 rounded-xl mt-2 bg-white max-h-36">
                  <ScrollView nestedScrollEnabled>
                    {leaderSuggestions
                      .filter((item) => !tagLeader.trim() || item.toLowerCase().includes(tagLeader.trim().toLowerCase()))
                      .slice(0, 8)
                      .map((item) => (
                        <TouchableOpacity key={item} className="px-3 py-2 border-b border-slate-100" onPress={() => { setTagLeader(item); setShowLeaderSuggestions(false); }}>
                          <Text className="text-slate-800">{item}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <View className="mt-4 z-30">
              <Text className="text-slate-700 font-semibold mb-2">Family Availability</Text>
              <DropDownPicker
                open={openAvailability}
                value={familyAvailability}
                items={availabilityItems}
                setOpen={setOpenAvailability}
                setValue={setFamilyAvailability}
                setItems={setAvailabilityItems}
                style={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12, minHeight: 48 }}
                dropDownContainerStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12 }}
                textStyle={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}
              />
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
                    <Text className="text-slate-500 text-xs">
                      {item.epicNo || "-"} · {getVoterRelationDisplay(item) || "Relation -"} · {getVoterPhoneDisplay(item) || "No phone"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator className="mt-3 border border-slate-200 rounded-2xl">
              <View style={{ minWidth: 720 }}>
                <View className="bg-slate-100 flex-row px-3 py-2">
                  <Text className="font-bold text-slate-700" style={{ width: 140 }} numberOfLines={1}>Name</Text>
                  <Text className="font-bold text-slate-700" style={{ width: 110 }} numberOfLines={1}>EPIC</Text>
                  <Text className="font-bold text-slate-700" style={{ width: 120 }} numberOfLines={1}>Relation</Text>
                  <Text className="font-bold text-slate-700" style={{ width: 90 }} numberOfLines={1}>Phone</Text>
                  <Text className="font-bold text-slate-700" style={{ width: 110 }} numberOfLines={1}>House No</Text>
                  <Text className="font-bold text-slate-700" style={{ width: 100 }} numberOfLines={1}>Actions</Text>
                </View>
                {members.map((m, memberIndex) => (
                  <View key={`${String(m?.epicNo || m?.memberId || m?.voterName || "member")}-${memberIndex}`} className="flex-row items-center px-3 py-2 border-t border-slate-100">
                    <View style={{ width: 140 }}>
                      <TouchableOpacity onPress={() => openVoterInfo(m)}>
                        <Text className="text-blue-700 font-semibold" numberOfLines={1}>{m.voterName}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setHeadEpicNo(m.epicNo)}>
                        <Text className={`text-xs mt-1 ${headEpicNo === m.epicNo ? "text-blue-600 font-bold" : "text-slate-500"}`} numberOfLines={1}>
                          {headEpicNo === m.epicNo ? "Head of family" : "Set as head"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={{ width: 110 }} onPress={() => openVoterInfo(m)}>
                      <Text className="text-blue-700" numberOfLines={1}>{m.epicNo}</Text>
                    </TouchableOpacity>
                    <Text className="text-slate-700" style={{ width: 120 }} numberOfLines={2}>{m.relationName || "-"}</Text>
                    <Text className="text-slate-700" style={{ width: 90 }} numberOfLines={1}>{m.phone || "-"}</Text>
                    <Text className="text-slate-700" style={{ width: 110 }} numberOfLines={2}>{m.houseNo || "-"}</Text>
                    <View style={{ width: 100 }}>
                      <TouchableOpacity onPress={() => openVoterInfo(m)}>
                        <Text className="text-blue-600 font-semibold text-xs">View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeMember(m.epicNo)}>
                        <Text className="text-red-600 font-semibold text-xs mt-1">Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {members.length === 0 ? <Text className="px-3 py-5 text-slate-400">No members added.</Text> : null}
              </View>
            </ScrollView>

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
                    style={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12, minHeight: 48 }}
                    dropDownContainerStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12 }}
                    textStyle={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}
                    placeholderStyle={{ color: '#94A3B8' }}
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
                    setItems={() => { }}
                    placeholder="Pick head of family"
                    style={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12, minHeight: 48 }}
                    dropDownContainerStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12 }}
                    textStyle={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}
                    placeholderStyle={{ color: '#94A3B8' }}
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
                    style={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12, minHeight: 48 }}
                    dropDownContainerStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12 }}
                    textStyle={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}
                    placeholderStyle={{ color: '#94A3B8' }}
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
                  style={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12, minHeight: 48 }}
                  dropDownContainerStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12 }}
                  textStyle={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}
                  placeholderStyle={{ color: '#94A3B8' }}
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
                    <Text className="text-slate-700 font-semibold mb-2">Association / Building Address</Text>
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
            {isSuperAdmin ? (
              <TouchableOpacity className="bg-slate-700 rounded-xl py-3 mb-3" onPress={downloadFamiliesExcel} disabled={!families.length || familiesLoading}>
                <Text className="text-center text-white font-bold">Download Excel (All Families)</Text>
              </TouchableOpacity>
            ) : null}
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
                    <Text className="text-slate-500 mt-1">Road: {item.roadName || "-"} | Family No: {item.familyNumber || "-"} | Flat: {item.flatNumber || "-"}</Text>
                    <Text className="text-slate-500 mt-1">{item.familyAddress || "-"}</Text>
                    {(item.members || []).slice(0, 5).map((m: any, mi: number) => (
                      <Text key={`${item.familyId}-m-${mi}`} className="text-slate-600 text-xs mt-1">
                        {mi + 1}. {m.voterName} | {m.relationName || "-"} | {m.epicNo}
                      </Text>
                    ))}
                    {(item.members || []).length > 5 ? (
                      <Text className="text-slate-400 text-xs mt-1">+{(item.members || []).length - 5} more members (tap for details)</Text>
                    ) : null}
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
