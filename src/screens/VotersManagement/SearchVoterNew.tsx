import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Platform,
    Alert,
} from "react-native";
import { AppDropdown } from "../../components/AppDropdown";
import Ionicons from "react-native-vector-icons/Ionicons";
import { CRUDAPI, ensureUserProfileReady, getAssemblyCode, parseVoterSearchResponse } from "../../apis/Api";
import { premium } from "../../constants/premiumTheme";
import { PrinterHelper } from "../../components/PrinterHelper";
import { openVoterInfoWithQuickLocation } from "../../helpers/voterLocationNavigation";
import { getBoothCardTitle } from "../../helpers/boothDisplay";
import AssemblyContextBar from '../../components/AssemblyContextBar';

const PAGE_SIZE = 50;
const VISITED_VOTER_STORAGE_PREFIX = "voterVisited:";

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

const getVoterEpicKey = (voter: any) =>
    String(voter?.epicNo || voter?.epic || voter?.voterId || "").trim();

const hasSavedPrivateSurveyData = (voter: any) =>
    PRIVACY_FIELD_KEYS.some((key) => {
        const value = voter?.[key];
        if (Array.isArray(value)) return value.length > 0;
        return String(value ?? "").trim().length > 0;
    });

const voterWasMetByVolunteer = (voter: any) => {
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

export default function SearchVoter() {
    const navigation = useNavigation();
    const route = useRoute();
    const { booth, filteredVotersByParameter, searchMeta, searchRequest } = (route.params as any) || {};
    const BOOTH_CACHE_KEY = "boothSnapshotLite";

    /* -------------------- STATES -------------------- */
    const [view, setView] = useState<'search' | 'list'>('search');
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const [form, setForm] = useState({
        searchQuery: "",
        wards: "",
        epicId: "",
        boothNumber: "",
        mobileNumber: "",
        relationName: "",
        houseNumber: "",
        assemblyCode: "",
    });

    const [wardItems, setWardItems] = useState<any[]>([]);
    const [assemblyItems, setAssemblyItems] = useState<any[]>([]);

    const [searching, setSearching] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [voterResults, setVoterResults] = useState<any[]>([]);
    const [resultMeta, setResultMeta] = useState<any>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [errorText, setErrorText] = useState("");
    const [localSearch, setLocalSearch] = useState("");
    const [boothMap, setBoothMap] = useState<Record<string, string>>({});
    const [sessionReady, setSessionReady] = useState(false);
    const [visitedEpicKeys, setVisitedEpicKeys] = useState<Set<string>>(new Set());

    /* -------------------- INIT -------------------- */
    useEffect(() => {
        const init = async () => {
            await ensureUserProfileReady();
            const currentAsm = await getAssemblyCode();
            setForm(prev => ({ ...prev, assemblyCode: currentAsm }));
            setSessionReady(true);

            // Load Wards & Assembly Info
            const liteData = await AsyncStorage.getItem(BOOTH_CACHE_KEY);
            const fallbackData = await AsyncStorage.getItem("assemblyData");
            const parsed = JSON.parse(liteData || fallbackData || "{}");
            const asmName = parsed?.assembly?.assemblyNameEn || parsed?.assembly?.nameEn || "";
            const wards = parsed?.assembly?.wards || [];

            // Fetch Assemblies from Dropdown API
            try {
                const res = await CRUDAPI.getAssemblyDropdown();
                if (res?.data?.result) {
                    setAssemblyItems(res.data.result.map((a: any) => ({
                        label: `${a.name} (${a.id})`,
                        value: a.code || String(a.id)
                    })));
                }
            } catch (err) {
                console.log("Failed to fetch assemblies from API, falling back to profile info", err);
                const userInfoRaw = await AsyncStorage.getItem("userInfo");
                if (userInfoRaw) {
                    const user = JSON.parse(userInfoRaw);
                    if (user.assignedAssemblies && user.assignedAssemblies.length > 0) {
                        setAssemblyItems(user.assignedAssemblies.map((a: any) => ({
                            label: `${a.assemblyNameEn || a.nameEn} (${a.id || a.assemblyCode || a.code})`,
                            value: a.assemblyCode || a.code
                        })));
                    }
                }
            }
            const uniqueWards = wards.filter((w, i, self) =>
                w.wardId && self.findIndex(t => t.wardId === w.wardId) === i
            );

            setWardItems(
                uniqueWards.map((w) => ({
                    label: w.wardNameEn || `Ward ${w.wardId}`,
                    value: w.wardId,
                }))
            );

            // Build Booth Map for resolution
            const bMapping: Record<string, string> = {};
            wards.forEach((w: any) => {
                (w.booths || []).forEach((b: any) => {
                    const bId = b.boothId || b.id || b.boothNo;
                    if (bId) {
                        bMapping[String(bId)] = b.boothNameEn || b.boothLabel || b.pollingStationAdrEn || "";
                    }
                });
            });
            setBoothMap(bMapping);
        };
        init();

        if (booth || filteredVotersByParameter) {
            const data = filteredVotersByParameter || booth?.voters || [];
            const normalized = data.map((v: any) => ({
                ...v,
                firstMiddleNameEn: v.firstMiddleNameEn || v.name || "",
            }));
            setVoterResults(normalized);
            setResultMeta(searchMeta || null);
            setView('list');
        }
    }, [booth, filteredVotersByParameter, searchMeta]);

    useEffect(() => {
        const loadVisitedEpicKeys = async () => {
            try {
                const keys = await AsyncStorage.getAllKeys();
                setVisitedEpicKeys(new Set(
                    keys
                        .filter((key) => key.startsWith(VISITED_VOTER_STORAGE_PREFIX))
                        .map((key) => key.slice(VISITED_VOTER_STORAGE_PREFIX.length))
                        .filter(Boolean),
                ));
            } catch {
                setVisitedEpicKeys(new Set());
            }
        };

        loadVisitedEpicKeys();
        const unsubscribe = navigation.addListener("focus", loadVisitedEpicKeys);
        return unsubscribe;
    }, [navigation]);

    /* -------------------- HANDLERS -------------------- */
    const handleChange = (key: string, value: any) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        setForm(prev => ({
            ...prev,
            searchQuery: "",
            wards: "",
            epicId: "",
            boothNumber: "",
            mobileNumber: "",
            relationName: "",
            houseNumber: "",
        }));
        setErrorText("");
        setVoterResults([]);
        setResultMeta(null);
        setView('search');
    };

    const runSearch = async (nextPage = 0) => {
        await ensureUserProfileReady();
        const assemblyCode = form.assemblyCode || await getAssemblyCode();
        const response = await CRUDAPI.searchVoters({
            assemblyCode,
            searchQuery: form.searchQuery,
            wardId: form.wards || undefined,
            boothNumber: form.boothNumber,
            mobileNumber: form.mobileNumber,
            epicId: form.epicId,
            relationName: form.relationName,
            houseNumber: form.houseNumber,
            page: nextPage,
            size: PAGE_SIZE,
        });

        const { results: nextResults, meta } = parseVoterSearchResponse(response);

        setResultMeta(meta);
        setHasMore(Boolean(meta?.hasMore));
        setPage(nextPage);
        setVoterResults((current) => (nextPage === 0 ? nextResults : [...current, ...nextResults]));
        setView('list');
    };

    const handleSearch = async () => {
        setSearching(true);
        setErrorText("");
        try {
            await ensureUserProfileReady();
            const assemblyCode = form.assemblyCode || await getAssemblyCode();
            if (!assemblyCode) {
                setErrorText("Assembly is not configured for this login.");
                return;
            }
            if (!form.assemblyCode) {
                setForm((prev) => ({ ...prev, assemblyCode }));
            }
            setSessionReady(true);
            await runSearch(0);
        } catch (error: any) {
            setErrorText(error?.message || "Search failed");
        } finally {
            setSearching(false);
        }
    };

    const handleLoadMore = async () => {
        if (loadingMore || searching || !hasMore) return;
        setLoadingMore(true);
        try {
            await runSearch(page + 1);
        } catch (error: any) {
            console.log("Load more failed", error);
        } finally {
            setLoadingMore(false);
        }
    };


    const filteredVoters = useMemo(() => {
        if (!localSearch) return voterResults;
        const q = localSearch.toLowerCase();
        return voterResults.filter(v =>
            (v.firstMiddleNameEn || "").toLowerCase().includes(q) ||
            (v.epicNo || "").toLowerCase().includes(q)
        );
    }, [voterResults, localSearch]);
    const BoothHeader = () => {
        const targetBooth = booth || searchMeta;
        if (!targetBooth) return null;

        const voters = booth?.voters || filteredVotersByParameter || [];
        const mCount = voters.filter((v: any) => (v.gender || v.sex || "").startsWith("M")).length;
        const fCount = voters.filter((v: any) => (v.gender || v.sex || "").startsWith("F")).length;

        const headerTitle = getBoothCardTitle(
            booth || { boothId: searchMeta?.boothId, boothNameEn: searchMeta?.boothName },
        );

        return (
            <View style={styles.boothHeaderCard}>
                <Text style={styles.boothHeaderText}>{headerTitle}</Text>
                <View style={styles.boothStatsRow}>
                    <View style={[styles.statPill, styles.statPillTotal]}>
                        <Text style={styles.statPillTotalText}>
                            Total Voters: <Text style={styles.pillValue}>{voters.length || searchMeta?.total || 0}</Text>
                        </Text>
                    </View>
                    <View style={[styles.statPill, styles.statPillMale]}>
                        <Text style={styles.statPillMaleText}>
                            Male: <Text style={styles.pillValue}>{mCount || searchMeta?.male || 0}</Text>
                        </Text>
                    </View>
                    <View style={[styles.statPill, styles.statPillFemale]}>
                        <Text style={styles.statPillFemaleText}>
                            Female: <Text style={styles.pillValue}>{fCount || searchMeta?.female || 0}</Text>
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    /* -------------------- COMPONENTS -------------------- */
    const renderVoterCard = ({ item, index }: { item: any, index: number }) => {
        const gender = (item.gender || item.sex || "-").toUpperCase();
        const isFemale = gender.startsWith("F");
        const showVisitedBadge = voterWasMetByVolunteer(item) || visitedEpicKeys.has(getVoterEpicKey(item));

        // Gender-based premium colors
        const primaryColor = isFemale ? "#D946EF" : "#3B82F6";

        const bNo = booth?.boothId || item.boothId || item.boothNo || "-";
        const bName = item.boothNameEn ||
            item.boothLabel ||
            item.pollingStationAdrEn ||
            item.pollingStationNameEn ||
            item.boothName ||
            item.boothInfo?.boothNameEn ||
            item.booth?.boothNameEn ||
            boothMap[String(item.boothId)] ||
            boothMap[String(item.boothNo)] ||
            booth?.boothNameEn ||
            "";

        return (
            <TouchableOpacity
                style={[styles.premiumCard, { borderLeftColor: primaryColor }]}
                onPress={async () => {
                    if (isLocating) return;
                    setIsLocating(true);
                    await openVoterInfoWithQuickLocation(
                        navigation as any,
                        item,
                        booth,
                        (msg) => Alert.alert("Location required", msg),
                    );
                    setIsLocating(false);
                }}
                activeOpacity={0.95}
                disabled={isLocating}
            >
                <View style={styles.cardBody}>
                    {/* Top Row: Index & EPIC */}
                    <View style={styles.metaRow}>
                        <Text style={styles.indexText}>{index + 1}</Text>
                        <Text style={styles.epicIdText}>{item.epicNo || item.epic || "-"}</Text>
                        <View style={{ flex: 1 }} />
                        {showVisitedBadge ? (
                            <View style={styles.visitedMiniBadge}>
                                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                                <Text style={styles.visitedMiniBadgeText}>VISITED</Text>
                            </View>
                        ) : null}
                        <View style={[styles.genderBadge, isFemale ? styles.femaleBadge : styles.maleBadge]}>
                            <Text style={[styles.genderBadgeText, isFemale ? styles.femaleBadgeText : styles.maleBadgeText]}>
                                {gender}
                            </Text>
                        </View>
                    </View>

                    {/* Centered Name Section */}
                    <View style={styles.centeredNameWrap}>
                        <Text style={styles.nameValueCentered}>{item.firstMiddleNameEn?.toUpperCase() || "-"}</Text>
                    </View>

                    <View style={styles.cardDivider} />

                    {/* Vertical Info List */}
                    <View style={styles.infoList}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>FATHER</Text>
                            <Text style={styles.infoValue}>{item.relationFirstMiddleNameEn?.toUpperCase() || "-"}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>HOUSE NO.</Text>
                            <Text style={styles.infoValue}>{item.houseNoEn || "-"}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>AGE</Text>
                            <Text style={styles.infoValue}>{item.age || "-"}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>BOOTH</Text>
                            <Text style={styles.infoValue} numberOfLines={2}>{bName ? `${bNo} - ${bName}` : bNo}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <AssemblyContextBar
                selectedAsm={form.assemblyCode}
                setSelectedAsm={(val) => handleChange("assemblyCode", val as string)}
                asmItems={assemblyItems}
                onSelectItem={async (item) => {
                    handleChange("assemblyCode", item.value);
                    try {
                        const response = await CRUDAPI.loadDataLite(item.value);
                        const snapshotResult = response?.data?.result;
                        if (!snapshotResult) return;
                        let finalData;
                        if (typeof snapshotResult === 'string') {
                            const resp = await fetch(snapshotResult);
                            finalData = await resp.json();
                        } else {
                            finalData = snapshotResult;
                        }
                        await AsyncStorage.setItem(BOOTH_CACHE_KEY, JSON.stringify(finalData));
                        const wards = finalData?.assembly?.wards || [];
                        setWardItems(
                            wards.map((w: any) => ({
                                label: w.wardNameEn || `Ward ${w.wardId}`,
                                value: w.wardId,
                            }))
                        );
                        const bMapping: Record<string, string> = {};
                        wards.forEach((w: any) => {
                            (w.booths || []).forEach((b: any) => {
                                const bId = b.boothId || b.id || b.boothNo;
                                if (bId) {
                                    bMapping[String(bId)] = b.boothNameEn || b.boothLabel || b.pollingStationAdrEn || "";
                                }
                            });
                        });
                        setBoothMap(bMapping);
                    } catch (err) {
                        console.log("Failed to reload assembly snapshot", err);
                    }
                }}
            />

            {view === 'search' ? (
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.searchCard}>
                        <View style={styles.searchInputWrap}>
                            <Ionicons name="search-outline" size={20} color="#999" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Name / EPIC / Mobile / Serial"
                                placeholderTextColor="#94A3B8"
                                value={form.searchQuery}
                                onChangeText={(text) => handleChange("searchQuery", text)}
                            />
                        </View>

                        {showMoreFilters && (
                            <View style={styles.moreFilters}>
                                <View style={{ zIndex: 1000, marginBottom: 12 }}>
                                    <AppDropdown
                                        value={form.wards}
                                        items={wardItems}
                                        onChange={(val) => handleChange("wards", val)}
                                        placeholder="Select Ward"
                                    />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Booth Number"
                                    placeholderTextColor="#94A3B8"
                                    value={form.boothNumber}
                                    onChangeText={(text) => handleChange("boothNumber", text)}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Mobile"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                    value={form.mobileNumber}
                                    onChangeText={(text) => handleChange("mobileNumber", text)}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="EPIC / Voter ID"
                                    placeholderTextColor="#94A3B8"
                                    value={form.epicId}
                                    onChangeText={(text) => handleChange("epicId", text)}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Relation Name"
                                    placeholderTextColor="#94A3B8"
                                    value={form.relationName}
                                    onChangeText={(text) => handleChange("relationName", text)}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="House No"
                                    placeholderTextColor="#94A3B8"
                                    value={form.houseNumber}
                                    onChangeText={(text) => handleChange("houseNumber", text)}
                                />
                            </View>
                        )}

                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowMoreFilters(!showMoreFilters)}>
                                <Text style={styles.secondaryBtnText}>{showMoreFilters ? "Hide" : "More"}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={handleReset}>
                                <Text style={styles.secondaryBtnText}>Reset</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleSearch} disabled={searching}>
                                {searching ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.primaryBtnText}>Search</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}
                </ScrollView>
            ) : (
                <View style={{ flex: 1 }}>
                    {/* Header / Stats */}
                    <View style={styles.listHeader}>
                        {!booth && (
                            <View style={styles.statsRow}>
                                <View style={styles.statsInfo}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                                        <View style={[styles.pill, styles.pillTotal]}>
                                            <Text style={styles.pillTotalText}>
                                                Total Voters: <Text style={styles.pillValue}>{resultMeta?.total || 0}</Text>
                                            </Text>
                                        </View>
                                        <View style={[styles.pill, styles.pillMale]}>
                                            <Text style={styles.pillMaleText}>
                                                Male: <Text style={styles.pillValue}>{resultMeta?.male || 0}</Text>
                                            </Text>
                                        </View>
                                        <View style={[styles.pill, styles.pillFemale]}>
                                            <Text style={styles.pillFemaleText}>
                                                Female: <Text style={styles.pillValue}>{resultMeta?.female || 0}</Text>
                                            </Text>
                                        </View>
                                    </ScrollView>
                                </View>
                            </View>
                        )}

                        {/* Sub-search */}
                        <View style={styles.subSearch}>
                            <Ionicons name="search-outline" size={18} color="#999" />
                            <TextInput
                                style={styles.subSearchInput}
                                placeholder="Search"
                                placeholderTextColor="#94A3B8"
                                value={localSearch}
                                onChangeText={setLocalSearch}
                            />
                        </View>
                    </View>

                    <FlatList
                        data={filteredVoters}
                        renderItem={renderVoterCard}
                        keyExtractor={(item, index) => `${item.epicNo || ""}-${item.voterId || ""}-${index}`}
                        ListHeaderComponent={<BoothHeader />}
                        contentContainerStyle={styles.listContent}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 20 }} /> : null}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>{searching ? "Searching..." : "No voters found."}</Text>
                            </View>
                        }
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: premium.bg,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    contextWrap: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        zIndex: 2000,
        backgroundColor: premium.bg,
    },
    contextRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: premium.bgCard,
        padding: 14,
        borderRadius: premium.radius.lg,
        borderWidth: 1,
        borderColor: premium.border,
        ...premium.shadow.soft,
    },
    contextLabel: {
        fontSize: 11,
        fontWeight: "800",
        color: premium.textMuted,
        marginRight: 12,
        letterSpacing: 0.8,
    },
    contextDropdown: {
        backgroundColor: premium.bgCard,
        borderColor: premium.border,
        borderRadius: premium.radius.md,
        minHeight: 46,
    },
    contextDropdownPanel: {
        backgroundColor: premium.bgCard,
        borderColor: premium.border,
        borderRadius: premium.radius.md,
    },
    dropdownText: { fontSize: 14, color: premium.text, fontWeight: "600" },
    dropdownPlaceholder: { color: premium.textLight },
    dropdownContainer: {
        flex: 1,
    },
    dropdown: {
        borderColor: premium.border,
        borderRadius: premium.radius.md,
        minHeight: 46,
    },
    dropdownPanel: {
        borderColor: premium.border,
    },
    searchCard: {
        backgroundColor: premium.bgCard,
        borderRadius: premium.radius.xl,
        padding: 22,
        borderWidth: 1,
        borderColor: premium.border,
        ...premium.shadow.card,
    },
    searchInputWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderRadius: premium.radius.lg,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: premium.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontWeight: "600",
        color: premium.text,
    },
    moreFilters: {
        marginTop: 4,
    },
    input: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: premium.border,
        borderRadius: premium.radius.md,
        paddingHorizontal: 16,
        height: 50,
        marginBottom: 12,
        fontSize: 14,
        fontWeight: "600",
        color: premium.text,
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 14,
        gap: 10,
    },
    primaryBtn: {
        backgroundColor: premium.primary,
        borderRadius: premium.radius.md,
        paddingHorizontal: 24,
        justifyContent: "center",
        alignItems: "center",
        height: 52,
        flex: 2,
        shadowColor: premium.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
    primaryBtnText: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 15,
    },
    secondaryBtn: {
        backgroundColor: premium.bgCard,
        borderRadius: premium.radius.md,
        paddingHorizontal: 14,
        justifyContent: "center",
        alignItems: "center",
        height: 52,
        flex: 1,
        borderWidth: 1,
        borderColor: premium.border,
    },
    secondaryBtnText: {
        color: premium.textMuted,
        fontWeight: "700",
        fontSize: 13,
    },
    errorText: {
        color: "#EF4444",
        textAlign: "center",
        marginTop: 16,
    },

    /* List Styles */
    listHeader: {
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderColor: "#F1F5F9",
        zIndex: 10,
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    statsInfo: {
        flex: 1,
    },
    totalFound: {
        fontSize: 24,
        fontWeight: "900",
        color: "#0F172A",
        marginBottom: 8,
    },
    pillsRow: {
        flexDirection: "row",
        paddingVertical: 4,
    },
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        marginRight: 8,
        borderWidth: 1,
    },
    pillTotal: {
        backgroundColor: "#EEF2FF",
        borderColor: "#C7D2FE",
    },
    pillMale: {
        backgroundColor: "#E0F2FE",
        borderColor: "#7DD3FC",
    },
    pillFemale: {
        backgroundColor: "#FCE7F3",
        borderColor: "#F9A8D4",
    },
    pillTotalText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#3730A3",
    },
    pillMaleText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#075985",
    },
    pillFemaleText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#9D174D",
    },
    pillValue: {
        fontWeight: "800",
    },
    subSearch: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: premium.bgCard,
        borderRadius: premium.radius.lg,
        paddingHorizontal: 16,
        height: 52,
        marginTop: 15,
        borderWidth: 1,
        borderColor: premium.border,
        ...premium.shadow.soft,
    },
    subSearchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        color: "#334155",
    },

    listContent: {
        padding: 16,
    },
    premiumCard: {
        backgroundColor: premium.bgCard,
        borderRadius: premium.radius.lg,
        marginBottom: 14,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: premium.border,
        borderLeftWidth: 6,
        ...premium.shadow.card,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    indexText: {
        color: "#1E293B",
        fontWeight: "900",
        fontSize: 14,
        marginRight: 8,
    },
    epicIdText: {
        color: "#1E293B",
        fontWeight: "900",
        fontSize: 14,
        letterSpacing: 0.5,
    },
    cardBody: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    centeredNameWrap: {
        alignItems: "center",
        paddingVertical: 8,
    },
    nameValueCentered: {
        fontSize: 16,
        fontWeight: "900",
        color: "#0F172A",
        textAlign: "center",
    },
    nameLabelCentered: {
        fontSize: 9,
        fontWeight: "800",
        color: "#94A3B8",
        letterSpacing: 1,
        marginTop: 2,
    },
    infoList: {
        marginTop: 8,
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 6,
        alignItems: "flex-start",
    },
    infoLabel: {
        width: 85,
        fontSize: 11,
        fontWeight: "800",
        color: "#64748B",
    },
    infoValue: {
        flex: 1,
        fontSize: 13,
        fontWeight: "900",
        color: "#334155",
    },
    cardDivider: {
        height: 1,
        backgroundColor: "#F1F5F9",
        marginVertical: 4,
    },
    genderBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    visitedMiniBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ECFDF5",
        borderColor: "#A7F3D0",
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 3,
        marginRight: 6,
    },
    visitedMiniBadgeText: {
        marginLeft: 3,
        color: "#047857",
        fontSize: 9,
        fontWeight: "900",
        letterSpacing: 0.3,
    },
    femaleBadge: {
        backgroundColor: "#FDF2F8",
    },
    maleBadge: {
        backgroundColor: "#EFF6FF",
    },
    genderBadgeText: {
        fontSize: 10,
        fontWeight: "900",
    },
    femaleBadgeText: {
        color: "#D946EF",
    },
    maleBadgeText: {
        color: "#3B82F6",
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    actionIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    arrowCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#F8FAFC",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 10,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    detailRow: {
        flexDirection: "row",
        marginBottom: 4,
    },
    detailLabel: {
        width: 80,
        fontSize: 13,
        fontWeight: "bold",
        color: "#1E293B",
    },
    detailValue: {
        flex: 1,
        fontSize: 13,
        color: "#475569",
        fontWeight: "500",
    },
    genderChip: {
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 10,
    },
    femaleChip: {
        backgroundColor: "#FDF2F8",
    },
    maleChip: {
        backgroundColor: "#EEF2FF",
    },
    genderText: {
        fontSize: 11,
        fontWeight: "bold",
    },
    femaleText: {
        color: "#DB2777",
    },
    maleText: {
        color: "#2563EB",
    },

    fabNotes: {
        position: "absolute",
        bottom: 20,
        right: 20,
        backgroundColor: "#E2E8F0",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    fabText: {
        fontWeight: "bold",
        color: "#1E293B",
    },
    emptyContainer: {
        marginTop: 40,
        alignItems: "center",
    },
    emptyText: {
        color: "#64748B",
        fontSize: 14,
    },
    boothHeaderCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    boothHeaderText: {
        fontSize: 15,
        fontWeight: "900",
        color: "#0F172A",
        marginBottom: 8,
    },
    boothStatsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
    },
    statPill: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
    },
    statPillTotal: {
        backgroundColor: "#EEF2FF",
        borderColor: "#C7D2FE",
    },
    statPillTotalText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#3730A3",
    },
    statPillMale: {
        backgroundColor: "#E0F2FE",
        borderColor: "#7DD3FC",
    },
    statPillMaleText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#075985",
    },
    statPillFemale: {
        backgroundColor: "#FCE7F3",
        borderColor: "#F9A8D4",
    },
    statPillFemaleText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#9D174D",
    },
    pillValue: { fontWeight: "800" }
});
