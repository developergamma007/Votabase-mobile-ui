import React, { useEffect, useState, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppDropdown } from '../../components/AppDropdown';
import LinearGradient from 'react-native-linear-gradient';
import { CRUDAPI, ensureUserProfileReady, getAssemblyCode } from '../../apis/Api';
import { getBoothCardTitle, resolveBoothDisplayNo } from '../../helpers/boothDisplay';
import { premium } from '../../constants/premiumTheme';
import AssemblyContextBar from '../../components/AssemblyContextBar';

export default function SearchBooth() {
  const navigation = useNavigation();
  const BOOTH_CACHE_KEY = 'boothSnapshotLite';

  const [search, setSearch] = useState('');
  const [assemblyData, setAssemblyData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadingBoothId, setLoadingBoothId] = useState<any>(null);

  const [asmItems, setAsmItems] = useState([]);
  const [selectedAsm, setSelectedAsm] = useState('');
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
      (ward.booths || []).map((booth: any) => {
        const boothId = booth.boothId ?? booth.id ?? booth.booth_id;
        const boothNo = booth.boothNo ?? booth.booth_no ?? resolveBoothDisplayNo({ boothId });
        return {
          ...booth,
          boothId,
          boothNo,
          boothNameEn: booth.boothNameEn ?? booth.nameEn ?? booth.booth_add_en ?? booth.pollingStationAdrEn ?? '',
          boothNameLocal: booth.boothNameLocal ?? booth.nameLocal ?? booth.booth_add_local ?? '',
          voters: booth.voters || [],
          wardId: ward.wardId ?? ward.id ?? ward.ward_id,
          wardNameEn: ward.wardNameEn ?? ward.nameEn ?? ward.ward_name_en,
        };
      })
    );
  }, [assemblyData]);


  const filteredData = (allBooths || []).filter((item) => {
    if (selectedWard !== 'ALL' && String(item.wardId) !== selectedWard) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const haystack = `${item.boothNameEn || ''} ${item.boothNameLocal || ''} ${item.boothNo || ''} ${getBoothCardTitle(item)}`.toLowerCase();
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
      <AssemblyContextBar
        selectedAsm={selectedAsm}
        setSelectedAsm={setSelectedAsm}
        asmItems={asmItems}
        onSelectItem={(item) => fetchSnapshotFromApi(item.value)}
      />

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
                <AppDropdown
                  value={selectedWard}
                  items={wardItems}
                  onChange={setSelectedWard}
                  placeholder="Select Ward"
                />
              </View>
            </View>

            <View style={styles.summaryPillsRow}>
              <View style={[styles.statPill, styles.statPillTotal]}>
                <Text style={styles.statPillTotalText}>
                  Total Voters: <Text style={styles.pillValue}>{summaryStats.totalVoters.toLocaleString()}</Text>
                </Text>
              </View>
              <View style={[styles.statPill, styles.statPillMale]}>
                <Text style={styles.statPillMaleText}>
                  Male: <Text style={styles.pillValue}>{summaryStats.totalMale.toLocaleString()}</Text>
                </Text>
              </View>
              <View style={[styles.statPill, styles.statPillFemale]}>
                <Text style={styles.statPillFemaleText}>
                  Female: <Text style={styles.pillValue}>{summaryStats.totalFemale.toLocaleString()}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryRow}>
                {renderSummaryCard('Total Wards', summaryStats.totalWards, '#3730A3')}
                {renderSummaryCard('Total Booths', summaryStats.totalBooths, '#075985')}
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
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#06B6D4', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.cardAccent}
              />
              <View style={styles.cardBody}>
                <Text style={styles.boothTitle}>
                  {getBoothCardTitle(booth)}
                </Text>
                <View style={styles.statsRow}>
                  <View style={[styles.statPill, styles.statPillTotal]}>
                    <Text style={styles.statPillTotalText}>
                      Total Voters: <Text style={styles.pillValue}>{stats.total}</Text>
                    </Text>
                  </View>
                  <View style={[styles.statPill, styles.statPillMale]}>
                    <Text style={styles.statPillMaleText}>
                      Male: <Text style={styles.pillValue}>{stats.male}</Text>
                    </Text>
                  </View>
                  <View style={[styles.statPill, styles.statPillFemale]}>
                    <Text style={styles.statPillFemaleText}>
                      Female: <Text style={styles.pillValue}>{stats.female}</Text>
                    </Text>
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
  container: { flex: 1, backgroundColor: premium.bg },
  contextHeader: { padding: 16, paddingBottom: 10, zIndex: 3000, backgroundColor: premium.bg },
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
  contextLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginRight: 15 },
  dropdown: { borderColor: '#E2E8F0', borderRadius: 8, minHeight: 40 },
  dropdownPanel: { borderColor: '#E2E8F0' },

  listContent: { padding: 16, paddingTop: 0 },
  searchSection: {
    backgroundColor: premium.bgCard,
    padding: 20,
    borderRadius: premium.radius.xl,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: premium.border,
    ...premium.shadow.card,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: premium.radius.lg,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: premium.border,
    ...premium.shadow.soft,
  },
  searchInput: { flex: 1, height: 52, color: premium.text, marginLeft: 10, fontSize: 13, fontWeight: '500' },

  summaryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  summaryGrid: { marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: premium.bgCard,
    padding: 16,
    borderRadius: premium.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premium.border,
    ...premium.shadow.soft,
  },
  summaryLabel: { fontSize: 10, fontWeight: '800', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },

  boothCard: {
    backgroundColor: '#F8FBFF',
    borderRadius: 22,
    marginBottom: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardAccent: { width: 7 },
  cardBody: { flex: 1, padding: 18 },
  boothTitle: { fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 22, marginBottom: 14 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  statPillTotal: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  statPillTotalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3730A3',
  },
  statPillMale: {
    backgroundColor: '#E0F2FE',
    borderColor: '#7DD3FC',
  },
  statPillMaleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#075985',
  },
  statPillFemale: {
    backgroundColor: '#FCE7F3',
    borderColor: '#F9A8D4',
  },
  statPillFemaleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9D174D',
  },
  pillValue: { fontWeight: '800' },

  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#64748B', fontSize: 14 },
});
