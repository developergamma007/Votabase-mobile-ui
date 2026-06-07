import React, { useEffect, useState, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DropDownPicker from 'react-native-dropdown-picker';
import { ScrollView } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { bgColors } from '../../constants/colors';
import { CRUDAPI, ensureUserProfileReady, getAssemblyCode } from '../../apis/Api';

export default function SearchBooth() {
  const navigation = useNavigation();
  const BOOTH_CACHE_KEY = 'boothSnapshotLite';

  const [search, setSearch] = useState('');
  const [assemblyData, setAssemblyData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadingBoothId, setLoadingBoothId] = useState<any>(null);

  const [openAsm, setOpenAsm] = useState(false);
  const [asmItems, setAsmItems] = useState([]);
  const [selectedAsm, setSelectedAsm] = useState('');

  const [openWard, setOpenWard] = useState(false);
  const [wardItems, setWardItems] = useState([{ label: 'ALL', value: 'ALL' }]);
  const [selectedWard, setSelectedWard] = useState('ALL');

  const loadData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(BOOTH_CACHE_KEY);
      if (!jsonValue) return;
      setAssemblyData(JSON.parse(jsonValue));
    } catch (error) {
      console.error('Error reading data', error);
    }
  };

  const fetchAssemblies = async () => {
    try {
      const res = await CRUDAPI.getAssemblyDropdown();
      if (res?.data?.result) {
        setAsmItems(res.data.result.map(a => ({
          label: `${a.name} (${a.id})`,
          value: a.code || String(a.id)
        })));
      }
    } catch (err) {
      console.log("Failed to fetch assemblies", err);
    }
  };

  const fetchSnapshotFromApi = async (asmCode) => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await CRUDAPI.loadDataLite(asmCode);
      const snapshotResult = response?.data?.result;
      if (!snapshotResult) throw new Error('Snapshot data not found');

      let finalData;
      if (typeof snapshotResult === 'string') {
        const resp = await fetch(snapshotResult);
        finalData = await resp.json();
      } else {
        finalData = snapshotResult;
      }
      setAssemblyData(finalData);
      await AsyncStorage.setItem(BOOTH_CACHE_KEY, JSON.stringify(finalData));
    } catch (error) {
      console.log('Error fetching snapshot from API:', error);
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await ensureUserProfileReady();
      const current = await getAssemblyCode();
      setSelectedAsm(current);
      await fetchAssemblies();
      await fetchSnapshotFromApi(current);
    };
    init();
  }, []);

  useEffect(() => {
    const asm = assemblyData?.assembly || assemblyData;
    const wards = asm?.wards || [];
    if (wards.length > 0) {
      const items = [{ label: 'ALL', value: 'ALL' }];
      wards.forEach((w: any) => {
        items.push({
          label: w.wardNameEn || `Ward ${w.wardId}`,
          value: String(w.wardId)
        });
      });
      setWardItems(items);
    }
  }, [assemblyData]);

  const summaryStats = useMemo(() => {
    const asm = assemblyData?.assembly || assemblyData;
    const wards = asm?.wards || [];
    let totalBooths = 0;
    let totalVoters = 0;
    let totalMale = 0;
    let totalFemale = 0;

    wards.forEach((w: any) => {
      (w.booths || []).forEach((b: any) => {
        const s = b.voterStats || {};
        totalBooths += 1;
        totalVoters += s.total || 0;
        totalMale += s.male || 0;
        totalFemale += s.female || 0;
      });
    });

    return { totalWards: wards.length, totalBooths, totalVoters, totalMale, totalFemale };
  }, [assemblyData]);

  const allBooths = useMemo(() => {
    const asm = assemblyData?.assembly || assemblyData;
    const wards = asm?.wards || [];
    return wards.flatMap((ward: any) =>
      (ward.booths || []).map((booth: any) => ({
        ...booth,
        boothId: booth.boothId ?? booth.id ?? booth.booth_no,
        boothNameEn: booth.boothNameEn ?? booth.nameEn ?? booth.booth_add_en ?? '',
        boothNameLocal: booth.boothNameLocal ?? booth.nameLocal ?? booth.booth_add_local ?? '',
        voters: booth.voters || [],
        wardId: ward.wardId ?? ward.id ?? ward.ward_id,
        wardNameEn: ward.wardNameEn ?? ward.nameEn ?? ward.ward_name_en,
      }))
    );
  }, [assemblyData]);


  const filteredData = (allBooths || []).filter((item) => {
    if (selectedWard !== 'ALL' && String(item.wardId) !== selectedWard) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const haystack = `${item.boothNameEn || ''} ${item.boothNameLocal || ''} ${item.boothId || ''}`.toLowerCase();
    return haystack.includes(q);
  });

  const getBoothStats = (booth) => {
    const stats = booth?.voterStats || {};
    const voters = booth?.voters || [];
    return {
      total: Number.isFinite(stats.total) ? stats.total : voters.length,
      male: Number.isFinite(stats.male) ? stats.male : voters.filter(v => (v.gender || '').toUpperCase().startsWith('M')).length,
      female: Number.isFinite(stats.female) ? stats.female : voters.filter(v => (v.gender || '').toUpperCase().startsWith('F')).length,
    };
  };

  const openBooth = async (booth) => {
    const cachedVoters = booth?.voters || [];
    if (cachedVoters.length > 0) {
      navigation.navigate('Search Voter', { booth });
      return;
    }
    try {
      setLoadingBoothId(booth.boothId);
      const boothNo = booth.boothNo ?? (booth.boothId >= 10000 ? booth.boothId % 10000 : undefined);
      const response = await CRUDAPI.fetchBoothVoters(booth.boothId, booth.wardId, boothNo);
      const boothPayload = response?.data?.result ?? response?.result;
      if (boothPayload) {
        navigation.navigate('Search Voter', { booth: boothPayload });
        return;
      }
      navigation.navigate('Search Voter', { booth });
    } catch (error) {
      console.log('Failed to fetch booth voters, opening cached booth data:', error?.message || error);
      navigation.navigate('Search Voter', { booth });
    } finally {
      setLoadingBoothId(null);
    }
  };

  const renderSummaryCard = (label, value, color) => (
    <View style={styles.summaryCard}>
      <Text style={[styles.summaryLabel, { color }]}>{label.toUpperCase()}</Text>
      <Text style={styles.summaryValue}>{value.toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Context - Persistent */}
      <View style={styles.contextHeader}>
        <View style={styles.contextRow}>
          <Text style={styles.contextLabel}>CONTEXT</Text>
          <View style={{ flex: 1 }}>
              <DropDownPicker
                open={openAsm}
                value={selectedAsm}
                items={asmItems}
                setOpen={setOpenAsm}
                setValue={setSelectedAsm}
                onSelectItem={(item) => fetchSnapshotFromApi(item.value)}
                placeholder="Select Assembly"
                style={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12, minHeight: 46 }}
                dropDownContainerStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12 }}
                textStyle={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}
                placeholderStyle={{ color: '#94A3B8' }}
                listMode="SCROLLVIEW"
              />
          </View>
        </View>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => String(item.boothId)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={[styles.searchSection, { zIndex: 1000 }]}>
              <View style={styles.searchInputWrap}>
                <Ionicons name="search-outline" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search booth name or booth number"
                  placeholderTextColor="#94A3B8"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

              <View style={{ marginTop: 12, zIndex: 1000 }}>
                <DropDownPicker
                  open={openWard}
                  value={selectedWard}
                  items={wardItems}
                  setOpen={setOpenWard}
                  setValue={setSelectedWard}
                  placeholder="Select Ward"
                  style={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12, minHeight: 46 }}
                  dropDownContainerStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12, zIndex: 5000 }}
                  textStyle={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}
                  placeholderStyle={{ color: '#94A3B8' }}
                  listMode="SCROLLVIEW"
                />
              </View>
            </View>

            {/* Summary Grid */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryRow}>
                {renderSummaryCard('Total Wards', summaryStats.totalWards, '#3B82F6')}
                {renderSummaryCard('Total Booths', summaryStats.totalBooths, '#000')}
              </View>
              <View style={styles.summaryRow}>
                {renderSummaryCard('Total Voters', summaryStats.totalVoters, '#000')}
                {renderSummaryCard('Male Voters', summaryStats.totalMale, '#3B82F6')}
              </View>
              <View style={styles.summaryRow}>
                {renderSummaryCard('Female Voters', summaryStats.totalFemale, '#D946EF')}
                <View style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        }
        renderItem={({ item: booth }) => {
          const stats = getBoothStats(booth);
          return (
            <TouchableOpacity
              style={styles.boothCard}
              onPress={() => openBooth(booth)}
            >
              <View style={styles.cardAccent} />
              <View style={styles.cardBody}>
                <Text style={styles.boothTitle}>
                  {booth.boothId} - {booth.boothNameEn || booth.boothNameLocal}
                </Text>
                <View style={styles.statsRow}>
                  <View style={[styles.statPill, { backgroundColor: '#EEF2FF' }]}>
                    <Text style={styles.pillLabel}>Total Voters <Text style={styles.pillValue}>{stats.total}</Text></Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={styles.pillLabel}>Male <Text style={styles.pillValue}>{stats.male}</Text></Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: '#FDF2F8' }]}>
                    <Text style={styles.pillLabel}>Female <Text style={styles.pillValue}>{stats.female}</Text></Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? <ActivityIndicator size="large" color="#3B82F6" /> : <Text style={styles.emptyText}>No booths found.</Text>}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  contextHeader: { padding: 16, paddingBottom: 10, zIndex: 3000, backgroundColor: '#F8FAFC' },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  contextLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginRight: 15 },
  dropdown: { borderColor: '#E2E8F0', borderRadius: 8, minHeight: 40 },
  dropdownPanel: { borderColor: '#E2E8F0' },

  listContent: { padding: 16, paddingTop: 0 },
  searchSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: 45, color: '#1E293B', marginLeft: 8 },

  summaryGrid: { marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryLabel: { fontSize: 10, fontWeight: '800', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },

  boothCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardAccent: { width: 4, backgroundColor: '#0EA5E9' },
  cardBody: { flex: 1, padding: 16 },
  boothTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  pillLabel: { fontSize: 12, color: '#475569' },
  pillValue: { fontWeight: 'bold', color: '#1E293B' },

  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#64748B', fontSize: 14 },
});
