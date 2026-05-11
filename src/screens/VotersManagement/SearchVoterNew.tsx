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
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { bgColors } from "../../constants/colors";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { CRUDAPI, getAssemblyCode } from "../../apis/Api";
import { PrinterHelper } from "../../components/PrinterHelper";

const PAGE_SIZE = 50;

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

    const [openWard, setOpenWard] = useState(false);
    const [wardItems, setWardItems] = useState<any[]>([]);
    const [openAssembly, setOpenAssembly] = useState(false);
    const [assemblyItems, setAssemblyItems] = useState<any[]>([]);

    const [searching, setSearching] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [voterResults, setVoterResults] = useState<any[]>([]);
    const [resultMeta, setResultMeta] = useState<any>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [errorText, setErrorText] = useState("");
    const [localSearch, setLocalSearch] = useState("");
    const [boothMap, setBoothMap] = useState<Record<string, string>>({});

    /* -------------------- INIT -------------------- */
    useEffect(() => {
        const init = async () => {
            const currentAsm = await getAssemblyCode();
            setForm(prev => ({ ...prev, assemblyCode: currentAsm }));

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
                        value: a.code?.length || String(a.id)
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
        const response = await CRUDAPI.searchVoters({
            assemblyCode: form.assemblyCode,
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

        const nextResults = response?.data?.result || [];
        const meta = response?.data?.meta || {};

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

        return (
            <View style={styles.boothHeaderCard}>
                <Text style={styles.boothHeaderText}>
                    {booth?.boothId || searchMeta?.boothId || ""} - {booth?.boothNameEn || searchMeta?.boothName || ""}
                </Text>
                <View style={styles.boothStatsRow}>
                    <Text style={styles.statLabel}>VOTERS: <Text style={styles.statValue}>{voters.length || searchMeta?.total || 0}</Text></Text>
                    <Text style={styles.statLabel}>MALE: <Text style={styles.statValue}>{mCount || searchMeta?.male || 0}</Text></Text>
                    <Text style={styles.statLabel}>FEMALE: <Text style={styles.statValue}>{fCount || searchMeta?.female || 0}</Text></Text>
                </View>
            </View>
        );
    };

    /* -------------------- COMPONENTS -------------------- */
    const renderVoterCard = ({ item, index }: { item: any, index: number }) => {
        const gender = (item.gender || item.sex || "-").toUpperCase();
        const isFemale = gender.startsWith("F");

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
                onPress={() => navigation.navigate("Voter Info" as any, { voter: item })}
                activeOpacity={0.95}
            >
                <View style={styles.cardBody}>
                    {/* Top Row: Index & EPIC */}
                    <View style={styles.metaRow}>
                        <Text style={styles.indexText}>{index + 1}</Text>
                        <Text style={styles.epicIdText}>{item.epicNo || item.epic || "-"}</Text>
                        <View style={{ flex: 1 }} />
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
            {/* Context Section - Always Visible */}
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, zIndex: 2000, backgroundColor: '#f8fafc' }}>
                <View style={styles.contextRow}>
                    <Text style={styles.contextLabel}>CONTEXT</Text>
                    <View style={styles.dropdownContainer}>
                        <DropDownPicker
                            open={openAssembly}
                            value={form.assemblyCode}
                            items={assemblyItems}
                            setOpen={setOpenAssembly}
                            setValue={(val) => handleChange("assemblyCode", val(form.assemblyCode))}
                            placeholder="Select Assembly"
                            style={styles.dropdown}
                            dropDownContainerStyle={styles.dropdownPanel}
                        />
                    </View>
                </View>
            </View>

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
                                    <DropDownPicker
                                        open={openWard}
                                        value={form.wards}
                                        items={wardItems}
                                        setOpen={setOpenWard}
                                        setValue={(val) => handleChange("wards", val(form.wards))}
                                        placeholder="Select Ward"
                                        style={styles.dropdown}
                                        dropDownContainerStyle={styles.dropdownPanel}
                                        listMode="SCROLLVIEW"
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
                                <Text style={styles.secondaryBtnText}>{showMoreFilters ? "Hide Filters" : "More Filters"}</Text>
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
                                            <Text style={styles.pillLabel}>Total Voters: <Text style={styles.pillValue}>{resultMeta?.total || 0}</Text></Text>
                                        </View>
                                        <View style={[styles.pill, styles.pillMale]}>
                                            <Text style={styles.pillLabel}>Male: <Text style={styles.pillValue}>{resultMeta?.male || 0}</Text></Text>
                                        </View>
                                        <View style={[styles.pill, styles.pillFemale]}>
                                            <Text style={styles.pillLabel}>Female: <Text style={styles.pillValue}>{resultMeta?.female || 0}</Text></Text>
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
        backgroundColor: "#F8FAFC",
    },
    scrollContent: {
        padding: 16,
    },
    contextRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    contextLabel: {
        fontSize: 12,
        fontWeight: "800",
        color: "#64748B",
        marginRight: 12,
    },
    dropdownContainer: {
        flex: 1,
    },
    dropdown: {
        borderColor: "#E2E8F0",
        borderRadius: 8,
        minHeight: 40,
    },
    dropdownPanel: {
        borderColor: "#E2E8F0",
    },
    searchCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 8,
    },
    searchInputWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 54,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontWeight: "600",
        color: "#1E293B",
    },
    moreFilters: {
        marginTop: 4,
    },
    input: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 50,
        marginBottom: 12,
        fontSize: 14,
        fontWeight: "600",
        color: "#1E293B",
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
        gap: 8,
    },
    primaryBtn: {
        backgroundColor: "#2563EB",
        borderRadius: 14,
        paddingHorizontal: 24,
        justifyContent: "center",
        alignItems: "center",
        height: 50,
        flex: 2,
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryBtnText: {
        color: "#fff",
        fontWeight: "800",
        fontSize: 15,
    },
    secondaryBtn: {
        backgroundColor: "#F1F5F9",
        borderRadius: 14,
        paddingHorizontal: 16,
        justifyContent: "center",
        alignItems: "center",
        height: 50,
        flex: 1,
    },
    secondaryBtnText: {
        color: "#475569",
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
        paddingVertical: 6,
        borderRadius: 14,
        marginRight: 8,
        borderWidth: 1.5,
    },
    pillTotal: {
        backgroundColor: "#F0F9FF",
        borderColor: "#BAE6FD",
    },
    pillMale: {
        backgroundColor: "#F0FDF4",
        borderColor: "#BBF7D0",
    },
    pillFemale: {
        backgroundColor: "#FDF2F8",
        borderColor: "#FBCFE8",
    },
    pillLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#475569",
    },
    pillValue: {
        fontWeight: "900",
        color: "#0284C7",
    },
    subSearch: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 44,
        marginTop: 15,
        borderWidth: 1,
        borderColor: "#CBD5E1",
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
        backgroundColor: "#fff",
        borderRadius: 16,
        marginBottom: 14,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        borderLeftWidth: 6,
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
        alignItems: "center",
    },
    statLabel: {
        fontSize: 11,
        fontWeight: "800",
        color: "#64748B",
        marginRight: 15,
    },
    statValue: {
        color: "#0F172A",
        fontWeight: "900",
    }
});
