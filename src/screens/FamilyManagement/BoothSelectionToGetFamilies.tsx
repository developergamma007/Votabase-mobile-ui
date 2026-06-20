import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Share, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { CRUDAPI, getAssemblyCode, persistAssemblyCode } from "../../apis/Api";
import { bgColors } from "../../constants/colors";
import { AppDropdown } from "../../components/AppDropdown";
import FamilyLocationCapture, { FamilyLocationValue } from "../../components/FamilyLocationCapture";
import {
  FAMILY_AVAILABILITY_OPTIONS,
  FAMILY_POINT_OPTIONS,
  formatFamilyAvailabilityLabel,
  getNextFamilyNumber,
  getFamilyNumberPrefix,
  parseWardCodeFromWardRecord,
  familyBelongsToWard,
  hasHouseMarkingFields,
  buildVoterFromFamilyMember,
  normalizeVoterForInfo,
  sortFamiliesByNumber,
  getVoterRelationDisplay,
  getVoterPhoneDisplay,
  getVoterHouseDisplay,
  canViewFullFamilySensitiveData,
  displayPendingFamilyListName,
  hasValidFamilyMapLocation,
  buildFamilyMapTooltipText,
  mapFamilyDtoToFormState,
  isBoothLevelLogin,
} from "../../components/FamilyFormHelpers";
import { buildFamilyPointsOsmWebViewHtml } from "../../config/googleMap";
import { openVoterInfoWithQuickLocation } from "../../helpers/voterLocationNavigation";
import { AuthContext } from "../../context/AuthContext";
import FamilyTextSuggest from "../../components/FamilyTextSuggest";
import { androidDropdownScrollLock, premiumStyles } from '../../constants/premiumStyles';
import { isAdminIswotUser } from "../../components/FeatureComingSoon";

type FamilyTab = "NEW" | "PENDING" | "LIST";

export default function VotersFamilyScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userInfo } = React.useContext(AuthContext) as any;
  const role = String(userInfo?.role || "").replace("ROLE_", "").toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const canSwitchAssembly = isAdminIswotUser(userInfo);
  const isBoothLevel = isBoothLevelLogin(userInfo);
  const [assemblyCode, setAssemblyCode] = useState("");
  const [dropdownFocused, setDropdownFocused] = useState(false);
  const [assemblyItems, setAssemblyItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<FamilyTab>("NEW");
  const [editingFamilyId, setEditingFamilyId] = useState<number | null>(null);
  const [editingFamilyMeta, setEditingFamilyMeta] = useState<any>(null);
  const [editFamilyLoading, setEditFamilyLoading] = useState(false);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingAvailabilityFilter, setPendingAvailabilityFilter] = useState<string[]>([...FAMILY_AVAILABILITY_OPTIONS]);
  const canViewFullFamilyData = canViewFullFamilySensitiveData(role);

  const visibleTabs = useMemo<FamilyTab[]>(() => {
    if (isBoothLevel) return ["NEW", "PENDING"];
    return ["NEW", "PENDING", "LIST"];
  }, [isBoothLevel]);

  const [familyName, setFamilyName] = useState("");
  const [roadName, setRoadName] = useState("");
  const [buildingNumber, setBuildingNumber] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [familyNumber, setFamilyNumber] = useState("");
  const [tagLeader, setTagLeader] = useState("");
  const [familyAvailability, setFamilyAvailability] = useState("Available");
  const [familyNameSuggestions, setFamilyNameSuggestions] = useState<string[]>([]);
  const [roadSuggestions, setRoadSuggestions] = useState<string[]>([]);
  const [leaderSuggestions, setLeaderSuggestions] = useState<string[]>([]);
  const [buildingSuggestions, setBuildingSuggestions] = useState<string[]>([]);
  const [buildingNumberSuggestions, setBuildingNumberSuggestions] = useState<string[]>([]);
  const [flatSuggestions, setFlatSuggestions] = useState<string[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [associationSuggestions, setAssociationSuggestions] = useState<string[]>([]);
  const [associationHeadSuggestions, setAssociationHeadSuggestions] = useState<string[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [relationQuery, setRelationQuery] = useState("");
  const [memberSuggestions, setMemberSuggestions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [headEpicNo, setHeadEpicNo] = useState("");
  const [headPhone, setHeadPhone] = useState("");
  const [economicStatus, setEconomicStatus] = useState("NA");
  const [familyNature, setFamilyNature] = useState("NA");
  const [familyPoints, setFamilyPoints] = useState("5");
  const [buildingAddress, setBuildingAddress] = useState("");
  const [hasAssociation, setHasAssociation] = useState(false);
  const [associationName, setAssociationName] = useState("");
  const [associationHeadName, setAssociationHeadName] = useState("");
  const [associationHeadPhone, setAssociationHeadPhone] = useState("");
  const [location, setLocation] = useState<FamilyLocationValue | null>(null);

  const [families, setFamilies] = useState<any[]>([]);
  const [familySearch, setFamilySearch] = useState("");
  const [familiesLoading, setFamiliesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [wardItems, setWardItems] = useState<{ label: string; value: string; wardCode: string }[]>([]);
  const [selectedWardId, setSelectedWardId] = useState("");

  const accessWardIds = useMemo(() => {
    const ids: string[] = [];
    if (Array.isArray(userInfo?.wardIds)) ids.push(...userInfo.wardIds.map(String));
    if (Array.isArray(userInfo?.wards)) ids.push(...userInfo.wards.map(String));
    if (userInfo?.wardId) ids.push(String(userInfo.wardId));
    if (userInfo?.ward_id) ids.push(String(userInfo.ward_id));
    if (String(userInfo?.assignmentType || "").toUpperCase() === "WARD" && userInfo?.assignmentId) {
      String(userInfo.assignmentId)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .forEach((v) => ids.push(v));
    }
    return Array.from(new Set(ids.filter(Boolean)));
  }, [userInfo]);

  const selectedWard = useMemo(
    () => wardItems.find((w) => String(w.value) === String(selectedWardId)) || wardItems[0] || null,
    [wardItems, selectedWardId]
  );

  const wardNumberPrefix = useMemo(
    () => getFamilyNumberPrefix(selectedWard, assemblyCode),
    [selectedWard, assemblyCode]
  );

  const wardFamilies = useMemo(
    () => families.filter((f) => familyBelongsToWard(f, selectedWard?.value, selectedWard?.wardCode)),
    [families, selectedWard]
  );

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
    FAMILY_AVAILABILITY_OPTIONS.map((item) => ({
      label: formatFamilyAvailabilityLabel(item),
      value: item,
    }))
  );

  const headOfFamilyItems = useMemo(
    () => [...members]
      .sort((a, b) => String(a.voterName || "").localeCompare(String(b.voterName || ""), undefined, { sensitivity: "base" }))
      .map((m) => ({ label: m.voterName || m.epicNo, value: m.epicNo })),
    [members],
  );

  const resolveWardIdForSave = () => {
    if (selectedWardId) return String(selectedWardId);
    if (selectedWard?.value) return String(selectedWard.value);
    if (wardItems[0]?.value) return String(wardItems[0].value);
    if (accessWardIds[0]) return String(accessWardIds[0]);
    return "";
  };

  const loadFamilySuggestions = async () => {
    try {
      const empty = { data: { result: [] } };
      const pick = (res: any) => res?.data?.result || res?.result || [];
      const [
        familyRes,
        roadRes,
        leaderRes,
        buildingRes,
        buildingNumRes,
        flatRes,
        addressRes,
        associationRes,
        associationHeadRes,
      ] = await Promise.all([
        CRUDAPI.fetchFamilySuggestions("family").catch(() => empty),
        CRUDAPI.fetchFamilySuggestions("road").catch(() => empty),
        CRUDAPI.fetchFamilySuggestions("leader").catch(() => empty),
        CRUDAPI.fetchFamilySuggestions("building").catch(() => empty),
        CRUDAPI.fetchFamilySuggestions("buildingnumber").catch(() => empty),
        CRUDAPI.fetchFamilySuggestions("flat").catch(() => empty),
        CRUDAPI.fetchFamilySuggestions("address").catch(() => empty),
        CRUDAPI.fetchFamilySuggestions("association").catch(() => empty),
        CRUDAPI.fetchFamilySuggestions("associationhead").catch(() => empty),
      ]);
      setFamilyNameSuggestions(pick(familyRes));
      setRoadSuggestions(pick(roadRes));
      setLeaderSuggestions(pick(leaderRes));
      setBuildingSuggestions(pick(buildingRes));
      setBuildingNumberSuggestions(pick(buildingNumRes));
      setFlatSuggestions(pick(flatRes));
      setAddressSuggestions(pick(addressRes));
      setAssociationSuggestions(pick(associationRes));
      setAssociationHeadSuggestions(pick(associationHeadRes));
    } catch {
      setFamilyNameSuggestions([]);
      setRoadSuggestions([]);
      setLeaderSuggestions([]);
      setBuildingSuggestions([]);
      setBuildingNumberSuggestions([]);
      setFlatSuggestions([]);
      setAddressSuggestions([]);
      setAssociationSuggestions([]);
      setAssociationHeadSuggestions([]);
    }
  };

  const dropdownHandlers = {
    onFocus: () => setDropdownFocused(true),
    onBlur: () => setDropdownFocused(false),
  };

  useEffect(() => {
    if (editingFamilyId) return;
    if (hasHouseMarkingFields(buildingNumber, buildingName, flatNumber) && wardNumberPrefix) {
      setFamilyNumber(getNextFamilyNumber(wardFamilies, wardNumberPrefix));
    } else if (!editingFamilyId) {
      setFamilyNumber("");
    }
  }, [buildingNumber, buildingName, flatNumber, wardFamilies, wardNumberPrefix, editingFamilyId]);

  useEffect(() => {
    if (isBoothLevel && activeTab === "LIST") setActiveTab("PENDING");
  }, [isBoothLevel, activeTab]);

  useEffect(() => {
    const loadContext = async () => {
      let code = String(await getAssemblyCode() || "");
      if (canSwitchAssembly) {
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
          // Default to the first available assembly when the stored one isn't selectable.
          if (items.length && !items.some((item: any) => item.value === code)) {
            code = items[0].value;
          }
        } catch {
          setAssemblyItems([{ label: String(code), value: String(code) }]);
        }
      } else {
        setAssemblyItems([]);
      }
      setAssemblyCode(code);
      await persistAssemblyCode(code);
      await loadFamilySuggestions();
      const mapWardList = (wardsPayload: any[]) =>
        (Array.isArray(wardsPayload) ? wardsPayload : []).map((ward: any, index: number) => {
          const id = ward?.wardId ?? ward?.ward_id ?? ward?.id ?? index + 1;
          const name = ward?.wardNameEn ?? ward?.ward_name_en ?? ward?.name_en ?? ward?.name ?? "";
          const wardCode = parseWardCodeFromWardRecord({ ...ward, label: name });
          return {
            label: name || `Ward ${wardCode || id}`,
            value: String(id),
            wardCode,
          };
        });

      let wardList: { label: string; value: string; wardCode: string }[] = [];
      try {
        const wardsRes = await CRUDAPI.fetchWards(code);
        const wardsPayload = wardsRes?.data?.result || wardsRes?.result || wardsRes?.data || [];
        wardList = mapWardList(wardsPayload);
      } catch {
        wardList = [];
      }

      if (!wardList.length) {
        try {
          const lite = await AsyncStorage.getItem("boothSnapshotLite");
          const fallback = await AsyncStorage.getItem("assemblyData");
          const parsed = JSON.parse(lite || fallback || "{}");
          wardList = mapWardList(parsed?.assembly?.wards || []);
        } catch {
          wardList = [];
        }
      }

      const filtered = accessWardIds.length
        ? wardList.filter((w) => accessWardIds.includes(w.value) || accessWardIds.includes(w.wardCode))
        : wardList;
      setWardItems(filtered);
      const defaultWardId = filtered[0]?.value || "";
      if (defaultWardId) {
        setSelectedWardId(defaultWardId);
        const all = await CRUDAPI.fetchAllFamilies("", undefined, defaultWardId);
        setFamilies(sortFamiliesByNumber(all));
      }
    };
    loadContext();
  }, [canSwitchAssembly, accessWardIds]);

  useEffect(() => {
    if (!selectedWardId && wardItems.length > 0 && activeTab === "NEW") {
      setSelectedWardId(wardItems[0].value);
    }
  }, [wardItems, selectedWardId, activeTab]);

  useEffect(() => {
    if (!selectedWardId) return;
    CRUDAPI.fetchAllFamilies("", undefined, selectedWardId)
      .then((all) => setFamilies(sortFamiliesByNumber(all)))
      .catch(() => setFamilies([]));
  }, [selectedWardId]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = memberQuery.trim();
      if (!q) {
        setMemberSuggestions([]);
        return;
      }
      try {
        const wardForSearch = selectedWardId || wardItems[0]?.value;
        const res = await CRUDAPI.searchVoters({
          searchQuery: q,
          relationName: relationQuery.trim() || undefined,
          size: 20,
          assemblyCode: await getAssemblyCode(),
          wardId: wardForSearch || undefined,
        });
        const payload = res?.data?.result || res?.result || res?.data || [];
        setMemberSuggestions(Array.isArray(payload) ? payload : []);
      } catch {
        setMemberSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [memberQuery, relationQuery, selectedWardId, wardItems]);

  const loadFamilies = async () => {
    setFamiliesLoading(true);
    try {
      const wardId = selectedWardId || wardItems[0]?.value;
      const all = await CRUDAPI.fetchAllFamilies("", undefined, wardId);
      setFamilies(sortFamiliesByNumber(all));
    } catch {
      setFamilies([]);
    } finally {
      setFamiliesLoading(false);
    }
  };

  const applyFormStateFromDto = (formState: ReturnType<typeof mapFamilyDtoToFormState>) => {
    setFamilyName(formState.familyName);
    setRoadName(formState.roadName);
    setBuildingNumber(formState.buildingNumber);
    setBuildingName(formState.buildingName);
    setFlatNumber(formState.flatNumber);
    setFamilyNumber(formState.familyNumber);
    setTagLeader(formState.tagLeader);
    setFamilyAvailability(formState.familyAvailability);
    setBuildingAddress(formState.buildingAddress);
    setHasAssociation(formState.hasAssociation);
    setAssociationName(formState.associationName);
    setAssociationHeadName(formState.associationHeadName);
    setAssociationHeadPhone(formState.associationHeadPhone);
    setHeadPhone(formState.headPhone);
    setEconomicStatus(formState.economicStatus);
    setFamilyNature(formState.familyNature);
    setFamilyPoints(formState.familyPoints);
    setMembers(formState.members);
    setHeadEpicNo(formState.headEpicNo);
    setLocation(formState.location);
    if (formState.selectedWardId) setSelectedWardId(formState.selectedWardId);
    setEditingFamilyMeta(formState.editingFamilyMeta);
  };

  const resetNewFamilyForm = () => {
    setFamilyName("");
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
    setBuildingAddress("");
    setHasAssociation(false);
    setAssociationName("");
    setAssociationHeadName("");
    setAssociationHeadPhone("");
    setLocation(null);
    setMemberQuery("");
    setMemberSuggestions([]);
    setError("");
    setSuccess("");
    setEditingFamilyId(null);
    setEditingFamilyMeta(null);
    setEditFamilyLoading(false);
  };

  const openFamilyEdit = useCallback(async (familyId: number) => {
    const id = Number(familyId);
    if (!id) return;
    setActiveTab("NEW");
    setEditFamilyLoading(true);
    setError("");
    setSuccess("");
    setEditingFamilyId(id);
    try {
      const res = await CRUDAPI.fetchFamilyById(id);
      const fam = res?.data?.result || res?.result || res?.data || res;
      if (!fam?.familyId) throw new Error("Family not found.");
      applyFormStateFromDto(mapFamilyDtoToFormState(fam, { wardItems }) as any);
      setEditingFamilyId(fam.familyId);
    } catch (e: any) {
      resetNewFamilyForm();
      const apiMsg =
        e?.response?.data?.message
        || e?.response?.data?.detail
        || (typeof e?.response?.data?.data?.error === "string" ? e.response.data.data.error : null);
      setError(apiMsg || e?.message || "Unable to load family for edit.");
    } finally {
      setEditFamilyLoading(false);
    }
  }, [wardItems]);

  const closeFamilyEdit = () => {
    resetNewFamilyForm();
  };

  useEffect(() => {
    const editId = (route.params as any)?.editFamilyId;
    if (!editId || wardItems.length === 0) return;
    openFamilyEdit(Number(editId));
    (navigation as any).setParams({ editFamilyId: undefined });
  }, [(route.params as any)?.editFamilyId, wardItems.length, openFamilyEdit, navigation]);

  useEffect(() => {
    if (!editingFamilyId || editFamilyLoading || wardItems.length === 0 || selectedWardId) return;
    CRUDAPI.fetchFamilyById(editingFamilyId)
      .then((res) => {
        const fam = res?.data?.result || res?.result || res?.data || res;
        if (fam?.familyId) applyFormStateFromDto(mapFamilyDtoToFormState(fam, { wardItems }) as any);
      })
      .catch(() => {});
  }, [editingFamilyId, wardItems, editFamilyLoading, selectedWardId]);

  const downloadFamiliesExcel = async () => {
    if (!families.length) return;
    const headers = [
      "Family Name", "Road Name", "Family Number", "Flat No", "Building/Apartment Number", "Building/Apartment Name",
      "Head of Family", "Head EPIC", "Members", "Availability", "Points", "Tag Leader", "Member Details",
    ];
    const rows = families.map((f: any) => {
      const memberText = (f.members || [])
        .map((m: any, i: number) => `${i + 1}. ${m.voterName || "-"} | ${m.relationName || "-"} | ${m.epicNo || "-"}`)
        .join(" ; ");
      return [
        f.familyName, f.roadName, f.familyNumber, f.flatNumber, f.buildingNumber, f.buildingName,
        f.headName, f.headEpicNo, f.memberCount ?? f.members?.length, f.familyAvailability,
        f.points, f.tagLeader, memberText,
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    await Share.share({ title: "Families Export", message: csv });
  };

  useEffect(() => {
    if (activeTab === "LIST") loadFamilies();
    if (activeTab === "PENDING") loadPendingFamilies();
  }, [activeTab, selectedWardId, assemblyCode]);

  const filteredFamilies = useMemo(() => {
    const q = familySearch.trim().toLowerCase();
    if (!q) return families;
    return families.filter((f: any) =>
      String(f?.familyName || "").toLowerCase().includes(q) ||
      String(f?.roadName || "").toLowerCase().includes(q) ||
      String(f?.familyNumber || "").toLowerCase().includes(q)
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
    setRelationQuery("");
    setMemberSuggestions([]);
    if (!headEpicNo) setHeadEpicNo(voter.epicNo);
  };

  const openVoterInfo = async (member: any) => {
    const voterPayload = buildVoterFromFamilyMember(member, {
      boothId: member.boothId,
      wardCode: selectedWard?.wardCode,
    });
    if (!voterPayload.epicNo) return;
    setError("");
    await openVoterInfoWithQuickLocation(
      navigation as any,
      normalizeVoterForInfo(voterPayload, voterPayload.boothId),
      { boothId: voterPayload.boothId },
      (msg) => setError(msg),
    );
  };

  const loadPendingFamilies = async () => {
    const wardId = selectedWardId || wardItems[0]?.value;
    if (!wardId) {
      setPendingRows([]);
      return;
    }
    setPendingLoading(true);
    setError("");
    try {
      const res = await CRUDAPI.fetchFamilyDetails(
        wardId,
        undefined,
        undefined,
        undefined,
        0,
        500,
        assemblyCode || undefined,
      );
      const payload = res?.data?.result ?? res?.result ?? res;
      const rows = Array.isArray(payload?.rows) ? payload.rows : [];
      setPendingRows(rows);
    } catch (e: any) {
      setPendingRows([]);
      setError(e?.message || "Failed to load pending families.");
    } finally {
      setPendingLoading(false);
    }
  };

  const filteredPendingRows = useMemo(() => {
    const allowed = new Set(pendingAvailabilityFilter.map((v) => String(v).trim()));
    if (!allowed.size || allowed.size >= FAMILY_AVAILABILITY_OPTIONS.length) return pendingRows;
    return pendingRows.filter((row) => allowed.has(String(row.familyAvailability || "").trim()));
  }, [pendingRows, pendingAvailabilityFilter]);

  const pendingOnMapRows = useMemo(
    () => filteredPendingRows.filter((row) => hasValidFamilyMapLocation(row)),
    [filteredPendingRows],
  );

  const pendingNoMapRows = useMemo(
    () => filteredPendingRows.filter((row) => !hasValidFamilyMapLocation(row)),
    [filteredPendingRows],
  );

  const [selectedPendingMapFamily, setSelectedPendingMapFamily] = useState<any | null>(null);

  const pendingMapPoints = useMemo(
    () =>
      pendingOnMapRows.map((family: any) => ({
        latitude: Number(family.latitude),
        longitude: Number(family.longitude),
        familyName: family.familyName || "",
        roadName: family.roadName || "",
        familyNumber: family.familyNumber || "",
        flatNumber: family.flatNumber || "",
        familyAvailability: family.familyAvailability || "Available",
        members: family.members || [],
        familyId: family.familyId,
        boothId: family.boothId,
        rawFamily: family,
      })),
    [pendingOnMapRows],
  );

  const pendingMapHtml = useMemo(() => {
    if (!pendingMapPoints.length) return "";
    return buildFamilyPointsOsmWebViewHtml(pendingMapPoints, { fullDetails: canViewFullFamilyData });
  }, [pendingMapPoints, canViewFullFamilyData]);

  useEffect(() => {
    setSelectedPendingMapFamily(pendingMapPoints[0]?.rawFamily || null);
  }, [pendingMapPoints]);

  const handlePendingMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === "select" && Number.isFinite(data.index)) {
        const point = pendingMapPoints[data.index];
        if (point?.rawFamily) setSelectedPendingMapFamily(point.rawFamily);
      }
    } catch {
      /* ignore */
    }
  };

  const removeMember = (epicNo: string) => {
    setMembers((prev) => prev.filter((m) => m.epicNo !== epicNo));
    if (headEpicNo === epicNo) setHeadEpicNo("");
  };

  const createFamily = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (!location?.latitude || !location?.longitude) {
        throw new Error("Location is required. Please capture location before saving.");
      }
      if (!familyName.trim()) throw new Error("Family name is required");
      if (!roadName.trim()) throw new Error("Road name is required");
      const wardIdForCreate = resolveWardIdForSave();
      if (!wardIdForCreate) throw new Error("Please select a ward.");
      if (members.length === 0) throw new Error("Add at least one member");
      if (!headEpicNo) throw new Error("Pick head of family");
      const boothId = members.find((m) => m.boothId)?.boothId;
      if (!boothId) throw new Error("Member booth info missing");

      if (!hasHouseMarkingFields(buildingNumber, buildingName, flatNumber)) {
        throw new Error("Building/Apartment Number, Building/Apartment Name, and Flat Number are required");
      }
      if (!wardNumberPrefix) throw new Error("Ward is required to generate a family number.");
      const generatedFamilyNumber = getNextFamilyNumber(wardFamilies, wardNumberPrefix);

      await CRUDAPI.createFamily({
        familyName,
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
        wardId: Number(wardIdForCreate),
        phone: headPhone || members.find((m) => m.epicNo === headEpicNo)?.phone || "",
        points: Number(familyPoints || 5),
        pointsProvided: 0,
        economicStatus,
        familyNature,
        buildingAddress: buildingAddress.trim() || null,
        hasAssociation,
        associationName: hasAssociation ? associationName.trim() || null : null,
        associationHeadName: hasAssociation ? associationHeadName.trim() || null : null,
        associationHeadPhone: hasAssociation ? associationHeadPhone.trim() || null : null,
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
      });

      setSuccess("Family saved successfully.");
      await loadFamilySuggestions();
      const all = await CRUDAPI.fetchAllFamilies("", undefined, selectedWardId);
      setFamilies(sortFamiliesByNumber(all));
      await loadPendingFamilies();
      resetNewFamilyForm();
    } catch (e: any) {
      const apiMsg =
        e?.response?.data?.message
        || e?.response?.data?.detail
        || (typeof e?.response?.data?.data?.error === "string" ? e.response.data.data.error : null);
      setError(apiMsg || e?.message || "Failed to create family.");
    } finally {
      setSaving(false);
    }
  };

  const saveFamilyEdit = async () => {
    if (!editingFamilyId || !editingFamilyMeta) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (!location?.latitude || !location?.longitude) {
        throw new Error("Location is required. Please capture location before saving.");
      }
      if (!familyName.trim()) throw new Error("Family name is required");
      if (!roadName.trim()) throw new Error("Road name is required");
      if (members.length === 0) throw new Error("Add at least one member");
      if (!headEpicNo) throw new Error("Pick head of family");
      if (!hasHouseMarkingFields(buildingNumber, buildingName, flatNumber)) {
        throw new Error("Building/Apartment Number, Building/Apartment Name, and Flat Number are required");
      }
      const wardIdForUpdate =
        editingFamilyMeta.wardId || resolveWardIdForSave();
      const boothIdForUpdate =
        editingFamilyMeta.boothId
        || members.find((m) => m.boothId)?.boothId;
      if (!wardIdForUpdate || !boothIdForUpdate) {
        throw new Error("Ward and booth are required to update this family.");
      }
      const headMember = members.find((m) => m.epicNo === headEpicNo);

      await CRUDAPI.updateFamily(editingFamilyId, {
        familyName: familyName.trim(),
        roadName: roadName.trim(),
        buildingNumber: buildingNumber.trim() || null,
        buildingName: buildingName.trim() || null,
        flatNumber: flatNumber.trim() || null,
        familyNumber: editingFamilyMeta.familyNumber || familyNumber.trim() || null,
        tagLeader: tagLeader.trim() || null,
        familyAvailability,
        buildingAddress: buildingAddress.trim() || null,
        hasAssociation,
        associationName: hasAssociation ? associationName.trim() || null : null,
        associationHeadName: hasAssociation ? associationHeadName.trim() || null : null,
        associationHeadPhone: hasAssociation ? associationHeadPhone.trim() || null : null,
        phone: headPhone || headMember?.phone || "",
        points: Number(familyPoints || 5),
        pointsProvided: 0,
        latitude: location.latitude,
        longitude: location.longitude,
        boothId: Number(boothIdForUpdate),
        wardId: Number(wardIdForUpdate),
        headEpicNo,
        memberEpicNos: members.map((m) => m.epicNo),
        economicStatus,
        familyNature,
      });

      setSuccess("Family updated successfully.");
      const all = await CRUDAPI.fetchAllFamilies("", undefined, selectedWardId);
      setFamilies(sortFamiliesByNumber(all));
      await loadPendingFamilies();
      resetNewFamilyForm();
      setActiveTab("PENDING");
    } catch (e: any) {
      const apiMsg =
        e?.response?.data?.message
        || e?.response?.data?.detail
        || (typeof e?.response?.data?.data?.error === "string" ? e.response.data.data.error : null);
      setError(apiMsg || e?.message || "Failed to update family.");
    } finally {
      setSaving(false);
    }
  };

  const handleFamilyRowEdit = (family: any) => {
    if (family?.familyId) openFamilyEdit(Number(family.familyId));
  };

  return (
    <View className={`flex-1 ${bgColors.white}`}>
      <ScrollView
        className="p-4"
        nestedScrollEnabled
        keyboardShouldPersistTaps="always"
        scrollEnabled={androidDropdownScrollLock(dropdownFocused)}
      >
        {canSwitchAssembly ? (
          <View className="premium-card px-4 py-3 mb-3 z-50">
            <Text className="text-slate-500 text-xs font-bold mb-1">CONTEXT</Text>
            <AppDropdown
              value={assemblyCode}
              items={assemblyItems}
              onChange={(next) => {
                persistAssemblyCode(next);
                setAssemblyCode(next);
              }}
              {...dropdownHandlers}
            />
          </View>
        ) : null}
        <View style={premiumStyles.tabStrip}>
          {([
            { key: "NEW" as const, label: editingFamilyId ? "Edit Family" : "New Family" },
            { key: "PENDING" as const, label: "Pending Family" },
            { key: "LIST" as const, label: "Families" },
          ])
            .filter((tab) => visibleTabs.includes(tab.key))
            .map((tab) => (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.85}
              onPress={() => {
                if (editingFamilyId && tab.key !== "NEW") resetNewFamilyForm();
                setActiveTab(tab.key);
              }}
              style={[premiumStyles.tabBtn, activeTab === tab.key && premiumStyles.tabBtnActive]}
            >
              <Text style={[premiumStyles.tabBtnText, { fontSize: 12 }, activeTab === tab.key && premiumStyles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "NEW" ? (
          <>
            {editFamilyLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="text-slate-500 mt-3">Loading family details…</Text>
              </View>
            ) : null}
            {editingFamilyId && !editFamilyLoading ? (
              <View className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-2xl flex-row items-center justify-between">
                <Text className="text-blue-900 font-semibold flex-1 mr-2">
                  Editing family #{editingFamilyMeta?.familyNumber || editingFamilyId}
                </Text>
                <TouchableOpacity
                  className="bg-white border border-blue-300 px-3 py-2 rounded-lg"
                  style={familyButtonStyles.shadow}
                  onPress={() => {
                    closeFamilyEdit();
                    setActiveTab("PENDING");
                  }}
                >
                  <Text className="text-blue-700 font-bold text-xs">Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {!editFamilyLoading ? (
            <>
            <View className="mb-4 z-40">
              <Text className="text-slate-600 mb-2 font-semibold">Ward</Text>
              {wardItems.length > 1 ? (
                <AppDropdown
                  value={selectedWardId}
                  items={wardItems}
                  onChange={(next) => setSelectedWardId(String(next || ""))}
                  {...dropdownHandlers}
                />
              ) : (
                <TextInput
                  className="premium-input-muted"
                  value={selectedWard?.label || "Ward"}
                  editable={false}
                />
              )}
            </View>

            <FamilyTextSuggest
              label="Road Name (Mandatory)"
              value={roadName}
              onChangeText={setRoadName}
              suggestions={roadSuggestions}
              placeholder="Road name"
            />

            <FamilyTextSuggest
              label="Enter family name"
              value={familyName}
              onChangeText={setFamilyName}
              suggestions={familyNameSuggestions}
              placeholder="Family name"
            />

            <View className="mb-4">
              <Text className="text-slate-600 mb-2 font-semibold">Family Number</Text>
              <TextInput
                className="premium-input-muted"
                value={familyNumber}
                editable={false}
                placeholder={wardNumberPrefix ? `${wardNumberPrefix}-1` : "Select ward"}
              />
            </View>

            <FamilyTextSuggest
              label="Building/Apartment Number"
              value={buildingNumber}
              onChangeText={setBuildingNumber}
              suggestions={buildingNumberSuggestions}
              placeholder="Building/Apartment Number"
            />
            <FamilyTextSuggest
              label="Building/Apartment Name"
              value={buildingName}
              onChangeText={setBuildingName}
              suggestions={buildingSuggestions}
              placeholder="Building/Apartment Name"
            />
            <FamilyTextSuggest
              label="Flat Number"
              value={flatNumber}
              onChangeText={setFlatNumber}
              suggestions={flatSuggestions}
              placeholder="Flat Number"
            />

            <View className="mt-4">
              <FamilyTextSuggest
                label="Building/Apartment Address"
                value={buildingAddress}
                onChangeText={setBuildingAddress}
                suggestions={addressSuggestions}
                placeholder="Building/Apartment Address"
              />
              <TouchableOpacity className="flex-row items-center mt-2" style={familyButtonStyles.subtleInline} onPress={() => setHasAssociation((v) => !v)}>
                <View className={`w-7 h-7 rounded mr-2 items-center justify-center ${hasAssociation ? "bg-blue-600" : "bg-slate-200"}`}>
                  {hasAssociation ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                </View>
                <Text className="text-slate-800 text-[14px] font-semibold">If have association</Text>
              </TouchableOpacity>
            </View>

            {hasAssociation ? (
              <View className="mt-2">
                <FamilyTextSuggest
                  label="Association Name"
                  value={associationName}
                  onChangeText={setAssociationName}
                  suggestions={associationSuggestions}
                  placeholder="Association Name"
                />
                <FamilyTextSuggest
                  label="Association Head Name"
                  value={associationHeadName}
                  onChangeText={setAssociationHeadName}
                  suggestions={associationHeadSuggestions}
                  placeholder="Association Head Name"
                />
                <View className="mb-4">
                  <Text className="text-slate-700 font-semibold mb-2">Association Head Phone number (10 digits)</Text>
                  <TextInput className="premium-input" placeholder="Phone number" value={associationHeadPhone} onChangeText={setAssociationHeadPhone} keyboardType="number-pad" maxLength={10} />
                </View>
              </View>
            ) : null}

            <FamilyTextSuggest
              label="Tag a Leader"
              value={tagLeader}
              onChangeText={setTagLeader}
              suggestions={leaderSuggestions}
              placeholder="Leader name"
            />

            <View className="mt-4 z-30">
              <Text className="text-slate-700 font-semibold mb-2">Family Availability</Text>
              <AppDropdown
                value={familyAvailability}
                items={availabilityItems}
                onChange={setFamilyAvailability}
                {...dropdownHandlers}
              />
            </View>

            <FamilyLocationCapture
              location={location}
              onLocationChange={setLocation}
              onGpsSuccess={(msg) => {
                setError("");
                setSuccess(msg);
              }}
              onPinSuccess={(msg) => {
                setError("");
                setSuccess(msg);
              }}
              onError={(msg) => setError(msg)}
            />

            <Text className="text-slate-800 font-bold text-[20px] mt-7 mb-3">Family Members</Text>
            <View className="flex-row">
              <TextInput
                className="premium-input flex-1"
                placeholder="Search voter by EPIC or name"
                value={memberQuery}
                onChangeText={setMemberQuery}
              />
            </View>

            {memberQuery.trim() ? (
              <View className="border border-slate-200 rounded-xl mt-2 bg-white">
                <View className="px-3 py-2 border-b border-slate-100">
                  <TextInput
                    className="premium-input"
                    placeholder="Search by relation"
                    value={relationQuery}
                    onChangeText={setRelationQuery}
                  />
                </View>
                {memberSuggestions.length > 0 ? (
                  memberSuggestions.slice(0, 8).map((item: any, idx) => (
                    <TouchableOpacity key={`${String(item?.epicNo || item?.voterId || item?.firstMiddleNameEn || "suggestion")}-${idx}`} className="px-3 py-2 border-b border-slate-100" style={familyButtonStyles.suggestionRow} onPress={() => addMember(item)}>
                      <Text className="font-semibold text-slate-800">{[item.firstMiddleNameEn, item.lastNameEn].filter(Boolean).join(" ") || item.epicNo}</Text>
                      <Text className="text-slate-500 text-xs">
                        {item.epicNo || "-"} · {getVoterRelationDisplay(item) || "Relation -"} · {getVoterPhoneDisplay(item) || "No phone"}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text className="px-3 py-3 text-slate-400 text-xs">No voters found.</Text>
                )}
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
                      <TouchableOpacity style={familyButtonStyles.textButton} onPress={() => openVoterInfo(m)}>
                        <Text className="text-blue-700 font-semibold" numberOfLines={1}>
                          {m.voterName}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={familyButtonStyles.textButton} onPress={() => setHeadEpicNo(m.epicNo)}>
                        <Text className={`text-xs mt-1 ${headEpicNo === m.epicNo ? "text-blue-600 font-bold" : "text-slate-500"}`} numberOfLines={1}>
                          {headEpicNo === m.epicNo ? "Head of family" : "Set as head"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={[{ width: 110 }, familyButtonStyles.textButton]} onPress={() => openVoterInfo(m)}>
                      <Text className="text-blue-700" numberOfLines={1}>
                        {m.epicNo}
                      </Text>
                    </TouchableOpacity>
                    <Text className="text-slate-700" style={{ width: 120 }} numberOfLines={2}>{m.relationName || "-"}</Text>
                    <Text className="text-slate-700" style={{ width: 90 }} numberOfLines={1}>
                      {m.phone || "-"}
                    </Text>
                    <Text className="text-slate-700" style={{ width: 110 }} numberOfLines={2}>{m.houseNo || "-"}</Text>
                    <View style={{ width: 100 }}>
                      <TouchableOpacity style={familyButtonStyles.textButton} onPress={() => openVoterInfo(m)}>
                        <Text className="text-blue-600 font-semibold text-xs">View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={familyButtonStyles.textButton} onPress={() => removeMember(m.epicNo)}>
                        <Text className="text-red-600 font-semibold text-xs mt-1">Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {members.length === 0 ? <Text className="px-3 py-5 text-slate-400">No members added.</Text> : null}
              </View>
            </ScrollView>

            <View className="mt-5">
              <View className="mb-4 z-40">
                <Text className="text-slate-700 font-semibold mb-2">Economic status</Text>
                <AppDropdown
                  value={economicStatus}
                  items={economicItems}
                  onChange={setEconomicStatus}
                  {...dropdownHandlers}
                />
              </View>
              <View className="mb-4 z-30">
                <Text className="text-slate-700 font-semibold mb-2">Head of Family</Text>
                <AppDropdown
                  value={headEpicNo}
                  items={headOfFamilyItems}
                  onChange={setHeadEpicNo}
                  placeholder="Pick head of family"
                  {...dropdownHandlers}
                />
              </View>
              <View className="mb-4">
                <Text className="text-slate-700 font-semibold mb-2">Family Head Phone Number (10 digits)</Text>
                <TextInput
                  className="premium-input"
                  placeholder="Phone number"
                  value={headPhone}
                  onChangeText={setHeadPhone}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              <View className="mb-4 z-20">
                <Text className="text-slate-700 font-semibold mb-2">Family Nature</Text>
                <AppDropdown
                  value={familyNature}
                  items={natureItems}
                  onChange={setFamilyNature}
                  {...dropdownHandlers}
                />
              </View>
              <View className="mb-4 z-10">
                <Text className="text-slate-700 font-semibold mb-2">Points to the family</Text>
                <AppDropdown
                  value={familyPoints}
                  items={pointItems}
                  onChange={setFamilyPoints}
                  {...dropdownHandlers}
                />
              </View>
            </View>

            {error ? <Text className="text-red-600 mt-3">{error}</Text> : null}
            {success ? <Text className="text-green-700 mt-3">{success}</Text> : null}

            <TouchableOpacity
              className={`premium-btn mt-4 py-4 ${saving ? "bg-slate-400" : "bg-blue-700"}`}
              style={familyButtonStyles.primary}
              onPress={editingFamilyId ? saveFamilyEdit : createFamily}
              disabled={saving}
            >
              <Text className="text-center text-white font-bold text-[17px]">
                {saving ? "Saving..." : editingFamilyId ? "Save Changes" : "Save Family"}
              </Text>
            </TouchableOpacity>
            </>
            ) : null}
          </>
        ) : activeTab === "PENDING" ? (
          <>
            <Text className="text-slate-600 text-sm mb-3">
              Families in your ward — with or without GPS. Tap a row to edit the full family form.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              {FAMILY_AVAILABILITY_OPTIONS.map((label) => {
                const active = pendingAvailabilityFilter.includes(label);
                return (
                  <TouchableOpacity
                    key={label}
                    className={`mr-2 px-3 py-2 rounded-full border ${active ? "bg-blue-100 border-blue-400" : "bg-white border-slate-200"}`}
                    style={familyButtonStyles.filterPill}
                    onPress={() => {
                      setPendingAvailabilityFilter((current) => {
                        const next = active ? current.filter((x) => x !== label) : [...current, label];
                        return next.length ? next : [...FAMILY_AVAILABILITY_OPTIONS];
                      });
                    }}
                  >
                    <Text className="text-xs font-semibold text-slate-700">{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {pendingLoading ? <ActivityIndicator size="large" color="#2563eb" /> : null}
            {!pendingLoading && filteredPendingRows.length === 0 ? (
              <Text className="text-slate-400 mt-2">No families match the selected filters.</Text>
            ) : null}
            {!pendingLoading && pendingOnMapRows.length > 0 && pendingMapHtml ? (
              <View className="mt-2 mb-4">
                <Text className="text-slate-700 font-bold mb-2">Pending work map</Text>
                <Text className="text-slate-500 text-xs mb-2">
                  Tap a marker to select a family, then edit below. Colours match availability status.
                </Text>
                <View style={{ height: 280, width: "100%", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F1F5F9" }}>
                  <WebView
                    source={{ html: pendingMapHtml }}
                    originWhitelist={["*"]}
                    javaScriptEnabled
                    domStorageEnabled
                    scrollEnabled={false}
                    nestedScrollEnabled
                    onMessage={handlePendingMapMessage}
                    style={{ flex: 1 }}
                  />
                </View>
                {selectedPendingMapFamily ? (
                  <View className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <Text className="text-xs text-slate-800 whitespace-pre-line">
                      {buildFamilyMapTooltipText(selectedPendingMapFamily, role)}
                    </Text>
                    <TouchableOpacity
                      className="mt-2 self-start bg-blue-600 px-3 py-2 rounded-lg"
                      style={familyButtonStyles.shadow}
                      onPress={() => handleFamilyRowEdit(selectedPendingMapFamily)}
                    >
                      <Text className="text-white text-xs font-bold">Edit family</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : null}
            {!pendingLoading && pendingOnMapRows.length > 0 ? (
              <Text className="text-slate-700 font-bold mt-2 mb-1">On map ({pendingOnMapRows.length})</Text>
            ) : null}
            {!pendingLoading
              ? pendingOnMapRows.map((family: any) => (
                <TouchableOpacity
                  key={`onmap-${family.familyId}`}
                  className="premium-card p-4 mb-2"
                  style={familyButtonStyles.shadow}
                  onPress={() => handleFamilyRowEdit(family)}
                >
                  <Text className="font-bold text-slate-800">{displayPendingFamilyListName(family, role)}</Text>
                  <Text className="text-slate-500 text-xs mt-1">
                    {family.roadName || "-"} · #{family.familyNumber || "-"} · {family.familyAvailability || "-"}
                  </Text>
                </TouchableOpacity>
              ))
              : null}
            {!pendingLoading && pendingNoMapRows.length > 0 ? (
              <Text className="text-slate-700 font-bold mt-3 mb-1">No GPS ({pendingNoMapRows.length})</Text>
            ) : null}
            {!pendingLoading
              ? pendingNoMapRows.map((family: any) => (
                <TouchableOpacity
                  key={`nomap-${family.familyId}`}
                  className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-2"
                  style={familyButtonStyles.shadow}
                  onPress={() => handleFamilyRowEdit(family)}
                >
                  <Text className="font-bold text-slate-800">{displayPendingFamilyListName(family, role)}</Text>
                  <Text className="text-amber-800 text-xs mt-1">Location missing — open to add GPS</Text>
                </TouchableOpacity>
              ))
              : null}
          </>
        ) : (
          <>
            {isSuperAdmin ? (
              <TouchableOpacity className="bg-slate-700 rounded-xl py-3 mb-3" style={familyButtonStyles.shadow} onPress={downloadFamiliesExcel} disabled={!families.length || familiesLoading}>
                <Text className="text-center text-white font-bold">Download Excel (All Families)</Text>
              </TouchableOpacity>
            ) : null}
            <TextInput
              className="premium-input mb-3"
              placeholder="Search family, road, or number..."
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
                    style={familyButtonStyles.shadow}
                    onPress={() => handleFamilyRowEdit(item)}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="font-bold text-slate-800 text-base">{item.familyName}</Text>
                      <Ionicons name="pencil" size={18} color="#2563EB" />
                    </View>
                    <Text className="text-slate-500 mt-1">Road: {item.roadName || "-"} | Family No: {item.familyNumber || "-"} | Flat: {item.flatNumber || "-"}</Text>
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

const familyButtonStyles = StyleSheet.create({
  shadow: {
    ...premiumStyles.buttonShadow,
  },
  primary: {
    ...premiumStyles.buttonShadow,
  },
  filterPill: {
    ...premiumStyles.buttonShadow,
  },
  suggestionRow: {
    backgroundColor: "#FFFFFF",
    ...premiumStyles.buttonShadow,
  },
  subtleInline: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    ...premiumStyles.buttonShadow,
  },
  textButton: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    ...premiumStyles.buttonShadow,
  },
});
