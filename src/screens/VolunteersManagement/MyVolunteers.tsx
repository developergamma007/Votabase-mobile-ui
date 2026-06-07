import { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DropDownPicker from 'react-native-dropdown-picker';
import { CRUDAPI, getAssemblyCode } from '../../apis/Api';
import { AuthContext } from '../../context/AuthContext';
import { premium } from '../../constants/premiumTheme';
import ListPreview from '../../components/ListPreview';
import { isProtectedVolunteerLogin } from '../../helpers/volunteerLoginHelpers';

export default function MyVolunteers() {
  const navigation = useNavigation();
  const { userInfo, setBanner } = useContext(AuthContext) as { userInfo?: unknown; setBanner?: (b: { type: string; message: string }) => void };
  const role = String((userInfo as any)?.role || 'ADMIN').replace('ROLE_', '');
  const managerLevel = (() => {
    const r = role.toUpperCase();
    const assignmentType = String((userInfo as any)?.assignmentType || (userInfo as any)?.assignment_type || '').toUpperCase();
    if (r === 'SUPER_ADMIN' || r === 'ADMIN') return r;
    if (assignmentType === 'ASSEMBLY' || assignmentType === 'WARD') return assignmentType;
    return r;
  })();
  const [assemblyId, setAssemblyId] = useState('');

  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [openSort, setOpenSort] = useState(false);
  const [workingLevel, setWorkingLevel] = useState('');
  const [sortMode, setSortMode] = useState('latest');
  const [items, setItems] = useState([
    { label: 'All Levels', value: '' },
    { label: 'Assembly', value: 'ASSEMBLY' },
    { label: 'Ward', value: 'WARD' },
    { label: 'Booth', value: 'BOOTH' },
  ]);
  const [sortItems, setSortItems] = useState([
    { label: 'Latest Created', value: 'latest' },
    { label: 'Oldest Created', value: 'oldest' },
    { label: 'Name A-Z', value: 'name-asc' },
    { label: 'Name Z-A', value: 'name-desc' },
  ]);

  const [volunteersList, setVolunteersList] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    getAssemblyCode().then((code) => setAssemblyId(String(code || '')));
  }, []);

  const resolveSort = () => {
    switch (sortMode) {
      case 'name-asc':
        return { sortBy: 'firstName', direction: 'asc' };
      case 'name-desc':
        return { sortBy: 'firstName', direction: 'desc' };
      case 'oldest':
        return { sortBy: 'id', direction: 'asc' };
      default:
        return { sortBy: 'id', direction: 'desc' };
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchVolunteerList = async (pageNum: number, isRefresh = false) => {
    try {
      if (pageNum === 0 && !isRefresh) setLoading(true);
      if (pageNum > 0) setLoadingMore(true);

      const sortConfig = resolveSort();
      const res = await CRUDAPI.getVolunteerList(
        role,
        pageNum,
        size,
        debouncedSearch,
        '',
        sortConfig.sortBy,
        sortConfig.direction,
        workingLevel,
        'false',
        assemblyId
      );

      const newData = (res?.content ?? []).map((v: any) => ({
        ...v,
        deleted: v.deleted === true || v.deleted === 'true' || v.deleted === 1,
      }));

      if (pageNum === 0) setVolunteersList(newData);
      else setVolunteersList((prev) => [...prev, ...newData]);

      setTotalPages(res?.totalPages ?? 1);
    } catch (e) {
      console.log('Error fetching volunteers', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setPage(0);
    fetchVolunteerList(0, true);
  }, [debouncedSearch, workingLevel, sortMode, assemblyId, role]);

  useEffect(() => {
    if (managerLevel === 'WARD') {
      setItems([
        { label: 'All Levels', value: '' },
        { label: 'Booth', value: 'BOOTH' },
      ]);
    } else if (managerLevel === 'ASSEMBLY') {
      setItems([
        { label: 'All Levels', value: '' },
        { label: 'Ward', value: 'WARD' },
        { label: 'Booth', value: 'BOOTH' },
      ]);
    } else {
      setItems([
        { label: 'All Levels', value: '' },
        { label: 'Assembly', value: 'ASSEMBLY' },
        { label: 'Ward', value: 'WARD' },
        { label: 'Booth', value: 'BOOTH' },
      ]);
    }
  }, [managerLevel]);

  const loadMore = () => {
    if (!loadingMore && page + 1 < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchVolunteerList(nextPage);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchVolunteerList(0, true);
  };

  const toggleSelect = (volunteerId: string) => {
    setSelected((cur) =>
      cur.includes(volunteerId) ? cur.filter((s) => s !== volunteerId) : [...cur, volunteerId]
    );
  };

  const handleBlockUnblock = async (userEmail: string, blockValue: boolean) => {
    try {
      await CRUDAPI.blockVolunteer({ userEmail, block: blockValue });
      onRefresh();
    } catch (error) {
      console.log('Error blocking/unblocking:', error);
    }
  };

  const handleDeleteUndelete = async (userEmail: string, deleteValue: boolean) => {
    try {
      await CRUDAPI.removeVolunteer({ userEmail, delete: deleteValue });
      fetchVolunteerList(0);
    } catch {
      //
    }
  };

  const handleBulkDelete = async () => {
    try {
      await CRUDAPI.bulkRemoveVolunteer({ userEmails: selected, action: true });
      fetchVolunteerList(0);
    } catch {
      //
    }
  };

  const handleBulkBlock = async () => {
    try {
      await CRUDAPI.bulkBlockVolunteer({ userEmails: selected, action: true });
      fetchVolunteerList(0);
    } catch {
      //
    }
  };

  const isVolunteerDeleted = (v: any) => v.deleted === true || v.deleted === 'true' || v.deleted === 1;
  const visibleVolunteers = volunteersList.filter((v) => !isVolunteerDeleted(v));
  const stats = visibleVolunteers.reduce(
    (acc, v) => {
      const blocked = v.blocked === true || v.blocked === 'true' || v.blocked === 1;
      acc.total += 1;
      if (blocked) acc.blocked += 1;
      else acc.active += 1;
      return acc;
    },
    { total: 0, active: 0, blocked: 0 }
  );

  const getDisplayName = (v: any) => {
    const full = `${v.firstName || ''} ${v.lastName || ''}`.trim();
    return full || v.userName || 'Volunteer';
  };

  const getInitials = (v: any) => {
    const name = getDisplayName(v).trim();
    if (!name) return 'V';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');
  };

  const getStatusLabel = (v: any) => (v.blocked ? 'BLOCKED' : 'ACTIVE');

  const getStatusStyle = (v: any) => (v.blocked ? styles.badgeBlocked : styles.badgeActive);

  const getWardLabels = (v: any) => {
    if (Array.isArray(v.wardNames) && v.wardNames.length) return v.wardNames.map(String);
    if (Array.isArray(v.wardIds) && v.wardIds.length) return v.wardIds.map((id: any) => `Ward ${id}`);
    return [];
  };

  const getBoothLabels = (v: any) => {
    if (Array.isArray(v.boothNames) && v.boothNames.length) return v.boothNames.map(String);
    if (Array.isArray(v.boothIds) && v.boothIds.length) return v.boothIds.map((id: any) => `Booth ${id}`);
    return [];
  };

  const handleEdit = (v: any) => {
    if (isProtectedVolunteerLogin(v)) {
      setBanner?.({
        type: 'error',
        message: 'Super Admin logins cannot be edited here. Contact a platform administrator.',
      });
      return;
    }
    const assignmentType = String(v.workingLevel || v.assignmentType || 'ASSEMBLY').toUpperCase();
    const assignmentIds = String(v.assignmentId || '')
      .split(',')
      .map((val: string) => val.trim())
      .filter(Boolean);
    (navigation as any).navigate('addVolunteer', {
      editVolunteer: {
        firstName: v.firstName || v.userName || '',
        phone: v.phone || '',
        workingLevel: assignmentType,
        assemblyId: (v.assemblyIds && v.assemblyIds[0])
          ? String(v.assemblyIds[0])
          : (v.assemblyId ? String(v.assemblyId) : ''),
        wardIds: (v.wardIds && v.wardIds.length)
          ? v.wardIds.map((id: unknown) => String(id))
          : (assignmentType === 'WARD' ? assignmentIds : []),
        boothIds: (v.boothIds && v.boothIds.length)
          ? v.boothIds.map((id: unknown) => String(id))
          : (assignmentType === 'BOOTH' ? assignmentIds : []),
      },
    });
  };

  const renderStatPill = (
    label: string,
    value: number,
    variant: 'total' | 'active' | 'blocked',
    onPress?: () => void
  ) => {
    const variantStyle = STAT_PILL_VARIANTS[variant];
    const content = (
      <>
        <Text style={[styles.pillLabel, variantStyle.label]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.pillValue, variantStyle.value]}>{value}</Text>
      </>
    );
    const boxStyle = [
      styles.statPill,
      variantStyle.box,
    ];

    if (onPress) {
      return (
        <TouchableOpacity style={boxStyle} onPress={onPress} activeOpacity={0.85}>
          {content}
        </TouchableOpacity>
      );
    }

    return <View style={boxStyle}>{content}</View>;
  };

  return (
    <View style={styles.screen}>
      <View style={styles.shell}>
        <View style={styles.toolbar}>
          <View style={styles.searchRow}>
            <TextInput
              placeholder="Search by name / phone"
              placeholderTextColor={premium.textLight}
              style={styles.searchInput}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            <View style={styles.levelPicker}>
              <DropDownPicker
                open={open}
                value={workingLevel}
                items={items}
                setOpen={setOpen}
                setValue={setWorkingLevel}
                setItems={setItems}
                placeholder="All Levels"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownPanel}
                textStyle={styles.dropdownText}
                listMode="SCROLLVIEW"
              />
            </View>
          </View>

          <View style={{ zIndex: 900 }}>
            <DropDownPicker
              open={openSort}
              value={sortMode}
              items={sortItems}
              setOpen={setOpenSort}
              setValue={setSortMode}
              setItems={setSortItems}
              placeholder="Latest Created"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownPanel}
              textStyle={styles.dropdownText}
              listMode="SCROLLVIEW"
            />
          </View>

          <View style={styles.statsRow}>
            {renderStatPill('Total', stats.total, 'total')}
            {renderStatPill('Active', stats.active, 'active')}
            {renderStatPill('Blocked', stats.blocked, 'blocked')}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) loadMore();
          }}
          scrollEventThrottle={400}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        >
          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={premium.primary} />
            </View>
          )}

          {visibleVolunteers.map((v) => {
            const selectionKey = v.userName || v.phone;
            const reactKey = v.userName ? `${v.userName}-${v.phone}` : v.phone;
            const isSelected = selected.includes(selectionKey);

            return (
              <View key={reactKey} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(v)}</Text>
                  </View>
                  <View style={styles.cardHeadMeta}>
                    <Text style={styles.cardName}>{getDisplayName(v)}</Text>
                    <View style={styles.tagRow}>
                      <View style={styles.badgeLevel}>
                        <Text style={styles.badgeLevelText}>
                          {(v.assignmentType || 'VOLUNTEER').toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.badgeStatus, getStatusStyle(v)]}>
                        <Text style={styles.badgeStatusText}>{getStatusLabel(v)}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsBox}>
                  <View style={styles.detailsRow}>
                    <TouchableOpacity
                      onPress={() => toggleSelect(selectionKey)}
                      style={[styles.checkbox, isSelected && styles.checkboxOn]}
                    >
                      {isSelected ? <Text style={styles.checkMark}>✓</Text> : null}
                    </TouchableOpacity>
                    <View style={styles.detailsCol}>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLabel}>Phone : </Text>
                        <Text style={styles.infoValue}>{v.phone || '-'}</Text>
                      </View>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLabel}>User ID : </Text>
                        <Text style={styles.infoValue}>{v.userName || '-'}</Text>
                      </View>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLabel}>Wards : </Text>
                        <ListPreview items={getWardLabels(v)} />
                      </View>
                      <View style={styles.infoLine}>
                        <Text style={styles.infoLabel}>Booths : </Text>
                        <ListPreview items={getBoothLabels(v)} accentColor={premium.primary} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    {isProtectedVolunteerLogin(v) ? (
                      <View style={styles.btnEditDisabled}>
                        <Text style={styles.btnEditDisabledText}>Edit disabled</Text>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.btnEdit} onPress={() => handleEdit(v)}>
                        <Text style={styles.btnEditText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.btnNeutral}
                      onPress={() => handleDeleteUndelete(v.userName, true)}
                    >
                      <Text style={styles.btnNeutralText}>Delete</Text>
                    </TouchableOpacity>
                    {v.blocked ? (
                      <TouchableOpacity
                        style={styles.btnSuccess}
                        onPress={() => handleBlockUnblock(v.userName, false)}
                      >
                        <Text style={styles.btnSuccessText}>Unblock</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.btnDanger}
                        onPress={() => handleBlockUnblock(v.userName, true)}
                      >
                        <Text style={styles.btnDangerText}>Block</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {loadingMore && (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color={premium.primary} />
            </View>
          )}

          {!loading && visibleVolunteers.length === 0 && (
            <Text style={styles.emptyText}>No volunteers found.</Text>
          )}

          {selected.length > 0 && (
            <View style={styles.selectedBanner}>
              <Text style={styles.selectedBannerText}>Selected Volunteers: {selected.length}</Text>
            </View>
          )}

          <Text style={styles.actionsTitle}>Actions</Text>
          <View style={styles.bulkRow}>
            <TouchableOpacity
              disabled={selected.length === 0}
              style={[styles.bulkBtnOutline, selected.length === 0 && styles.bulkBtnDisabled]}
              onPress={handleBulkDelete}
            >
              <Text style={[styles.bulkBtnOutlineText, selected.length === 0 && styles.bulkBtnDisabledText]}>
                Delete Selected
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={selected.length === 0}
              style={[styles.bulkBtnDanger, selected.length === 0 && styles.bulkBtnDisabledFill]}
              onPress={handleBulkBlock}
            >
              <Text style={styles.bulkBtnDangerText}>Block Selected (Immediate)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const STAT_PILL_VARIANTS = {
  total: {
    box: { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.25)' },
    label: { color: '#1E40AF' },
    value: { color: '#1E3A8A' },
  },
  active: {
    box: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)' },
    label: { color: '#047857' },
    value: { color: '#065F46' },
  },
  blocked: {
    box: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.22)' },
    label: { color: '#B91C1C' },
    value: { color: '#991B1B' },
  },
  deleted: {
    box: { backgroundColor: 'rgba(100, 116, 139, 0.12)', borderColor: 'rgba(100, 116, 139, 0.28)' },
    label: { color: '#475569' },
    value: { color: '#334155' },
  },
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: premium.bg },
  shell: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.xl,
    borderWidth: 1,
    borderColor: premium.border,
    overflow: 'hidden',
    ...premium.shadow.card,
  },
  toolbar: {
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: premium.border,
    zIndex: 2000,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: {
    flex: 1,
    backgroundColor: premium.bgCard,
    borderWidth: 1,
    borderColor: premium.border,
    borderRadius: premium.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: premium.text,
  },
  levelPicker: { width: 130, zIndex: 3000 },
  dropdown: { borderColor: premium.border, minHeight: 46, borderRadius: premium.radius.md },
  dropdownPanel: { borderColor: premium.border },
  dropdownText: { fontSize: 13, fontWeight: '600', color: premium.text },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  statPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  pillLabel: { fontSize: 11, fontWeight: '700', flexShrink: 1, marginRight: 4 },
  pillValue: { fontSize: 17, fontWeight: '800' },
  pillDeletedActive: { backgroundColor: 'rgba(100, 116, 139, 0.22)' },
  listContent: { padding: 14, paddingBottom: 32 },
  centered: { alignItems: 'center', paddingVertical: 24 },
  card: {
    marginBottom: 14,
    borderRadius: premium.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    backgroundColor: '#F8FAFC',
    padding: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: premium.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cardHeadMeta: { marginLeft: 12, flex: 1 },
  cardName: { fontSize: 17, fontWeight: '700', color: premium.text },
  tagRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap', gap: 6 },
  badgeLevel: { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeLevelText: { fontSize: 10, fontWeight: '700', color: '#1D4ED8' },
  badgeStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeActive: { backgroundColor: '#D1FAE5' },
  badgeBlocked: { backgroundColor: '#FEE2E2' },
  badgeDeleted: { backgroundColor: '#E2E8F0' },
  badgeStatusText: { fontSize: 10, fontWeight: '700', color: premium.text },
  detailsBox: {
    marginTop: 12,
    backgroundColor: premium.bgCard,
    borderRadius: premium.radius.md,
    borderWidth: 1,
    borderColor: premium.border,
    padding: 12,
  },
  detailsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: premium.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: premium.bgCard,
  },
  checkboxOn: { backgroundColor: premium.primary, borderColor: premium.primary },
  checkMark: { color: '#fff', fontWeight: '800' },
  detailsCol: { flex: 1, marginLeft: 10 },
  infoLine: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, alignItems: 'flex-start' },
  infoLabel: { fontSize: 14, color: premium.textMuted, marginRight: 4 },
  infoValue: { fontSize: 14, fontWeight: '700', color: premium.text },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  btnEdit: { backgroundColor: premium.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  btnEditText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnEditDisabled: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnEditDisabledText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  btnNeutral: { backgroundColor: '#475569', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  btnNeutralText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnDanger: { backgroundColor: premium.error, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  btnDangerText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnSuccess: { backgroundColor: premium.success, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  btnSuccessText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: premium.textMuted, marginTop: 20 },
  selectedBanner: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: premium.radius.md,
    marginTop: 8,
  },
  selectedBannerText: { color: '#1D4ED8', fontWeight: '700' },
  actionsTitle: { fontSize: 17, fontWeight: '700', color: premium.textMuted, marginTop: 16 },
  bulkRow: { flexDirection: 'row', marginTop: 10, gap: 10 },
  bulkBtnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: premium.border,
    paddingVertical: 12,
    borderRadius: premium.radius.md,
    alignItems: 'center',
  },
  bulkBtnOutlineText: { color: premium.text, fontWeight: '600' },
  bulkBtnDanger: {
    flex: 1.2,
    backgroundColor: premium.error,
    paddingVertical: 12,
    borderRadius: premium.radius.md,
    alignItems: 'center',
  },
  bulkBtnDangerText: { color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 12 },
  bulkBtnDisabled: { opacity: 0.5 },
  bulkBtnDisabledFill: { backgroundColor: '#FCA5A5' },
  bulkBtnDisabledText: { color: premium.textLight },
});
