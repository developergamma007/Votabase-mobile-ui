import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import DropDownPicker from "react-native-dropdown-picker";
import { CRUDAPI } from "../../apis/Api";
import { bgColors } from "../../constants/colors";

export default function MyVolunteers() {
  const navigation = useNavigation();
  // UI States
  const [selected, setSelected] = useState([]);
  const [open, setOpen] = useState(false);
  const [openSort, setOpenSort] = useState(false);
  const [workingLevel, setWorkingLevel] = useState("");
  const [sortMode, setSortMode] = useState("latest");
  const [showDeleted, setShowDeleted] = useState(false);
  const [items, setItems] = useState([
    { label: "All Levels", value: "" },
    { label: "Assembly", value: "ASSEMBLY" },
    { label: "Ward", value: "WARD" },
    { label: "Booth", value: "BOOTH" },
  ]);
  const [sortItems, setSortItems] = useState([
    { label: "Latest Created", value: "latest" },
    { label: "Oldest Created", value: "oldest" },
    { label: "Name A-Z", value: "name-asc" },
    { label: "Name Z-A", value: "name-desc" },
  ]);

  // API + Pagination
  const [volunteersList, setVolunteersList] = useState([]);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search + Debounce
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce Effect (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 10);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch API
  const fetchVolunteerList = async (pageNum, isRefresh = false) => {
    try {
      if (pageNum === 0 && !isRefresh) setLoading(true);
      if (pageNum > 0) setLoadingMore(true);

      const sortField = "firstName";
      const sortDirection = sortMode === "name-asc" || sortMode === "oldest" ? "asc" : "desc";
      const res = await CRUDAPI.getVolunteerList(
        pageNum,
        size,
        debouncedSearch,
        "",
        sortField,
        sortDirection,
        workingLevel
      );

      const newData = (res?.content ?? []).map(v => ({
        ...v,
        deleted: v.deleted === true || v.deleted === "true" || v.deleted === 1
      }));
      if (pageNum === 0) {
        setVolunteersList(newData);
      } else {
        setVolunteersList(prev => [...prev, ...newData]);
      }

      setTotalPages(res?.totalPages ?? 1);

    } catch (e) {
      console.log("Error fetching volunteers", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Initial + triggered fetch
  useEffect(() => {
    setPage(0);
    fetchVolunteerList(0, true);
  }, [debouncedSearch, workingLevel, sortMode]);

  // On scroll bottom
  const loadMore = () => {
    if (!loadingMore && page + 1 < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchVolunteerList(nextPage);
    }
  };

  // Pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchVolunteerList(0, true);
  };

  // Toggle Selection
  const toggleSelect = (volunteerId) => {
    if (selected.includes(volunteerId)) {
      setSelected(selected.filter((s) => s !== volunteerId));
    } else {
      setSelected([...selected, volunteerId]);
    }
  };

  // Block / Unblock
  const handleBlockUnblock = async (userEmail, blockValue) => {
    const jsonReq = { userEmail, block: blockValue };
    try {
      const res = await CRUDAPI.blockVolunteer(jsonReq);
      if (res) {
        onRefresh(); // Refresh list after block/unblock
      }
    } catch (error) {
      console.log("Error blocking/unblocking:", error);
    }
  };

  const handleDeleteUndelete = async (userEmail, deleteValue) => {
    const jsonReq = {
      userEmail: userEmail,
      delete: deleteValue
    }
    try {
      const res = await CRUDAPI.removeVolunteer(jsonReq);
      if (res) fetchVolunteerList(0);
    } catch {
      //
    }
  }

  const handleBulkDelete = async () => {
    const jsonReq = {
      userEmails: selected,
      action: true
    }
    try {
      const res = await CRUDAPI.bulkRemoveVolunteer(jsonReq)
      if (res) fetchVolunteerList(0);
    } catch {
      //
    }
  }

  const handleBulkBlock = async () => {
    const jsonReq = {
      userEmails: selected,
      action: true
    }
    try {
      const res = await CRUDAPI.bulkBlockVolunteer(jsonReq)
      if (res) fetchVolunteerList(0);
    } catch {
      //
    }
  }

  const stats = volunteersList.reduce((acc, v) => {
    const deleted = v.deleted === true || v.deleted === "true" || v.deleted === 1;
    const blocked = v.blocked === true || v.blocked === "true" || v.blocked === 1;
    if (deleted) acc.deleted += 1;
    else {
      acc.total += 1;
      if (blocked) acc.blocked += 1;
      else acc.active += 1;
    }
    return acc;
  }, { total: 0, active: 0, blocked: 0, deleted: 0 });

  const visibleVolunteers = showDeleted
    ? volunteersList.filter((v) => v.deleted === true || v.deleted === "true" || v.deleted === 1)
    : volunteersList.filter((v) => !(v.deleted === true || v.deleted === "true" || v.deleted === 1));

  const getDisplayName = (v) => {
    const full = `${v.firstName || ""} ${v.lastName || ""}`.trim();
    return full || v.userName || "Volunteer";
  };

  const getInitials = (v) => {
    const name = getDisplayName(v).trim();
    if (!name) return "V";
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "V";
  };

  const getStatusLabel = (v) => {
    if (v.deleted) return "DELETED";
    if (v.blocked) return "BLOCKED";
    return "ACTIVE";
  };

  const getStatusClass = (v) => {
    if (v.deleted) return "bg-gray-200 text-gray-700";
    if (v.blocked) return "bg-red-100 text-red-700";
    return "bg-green-100 text-green-700";
  };

  const getWardText = (v) => {
    const names = Array.isArray(v.wardNames) ? v.wardNames : [];
    if (names.length) return names.join(", ");
    if (Array.isArray(v.wardIds) && v.wardIds.length) return v.wardIds.join(", ");
    return "-";
  };

  const getBoothText = (v) => {
    const names = Array.isArray(v.boothNames) ? v.boothNames : [];
    if (names.length) return names.join(", ");
    if (Array.isArray(v.boothIds) && v.boothIds.length) return v.boothIds.join(", ");
    return "-";
  };

  const handleEdit = (v) => {
    (navigation as any).navigate("addVolunteer", { editVolunteer: v });
  };

  return (
    <View className={`flex-1 ${bgColors.customLightBlue}`}>
      <View className={`${bgColors.white} mx-4 mt-4 rounded-3xl p-4 shadow-sm flex-1 border border-slate-200`}>

        {/* SEARCH + FILTERS */}
        <View className="bg-slate-100/80 rounded-2xl p-3 mb-2 border border-slate-200">
          <View className="flex-row items-center">
            <TextInput
              placeholder="Search by name / phone"
              className={`flex-1 ${bgColors.white} border border-gray-300 rounded-xl px-3 py-3`}
              placeholderTextColor="#94A3B8"
              onChangeText={setSearch}
              autoCapitalize="none"
            />

            <View className="w-36 ml-3 z-50">
              <DropDownPicker
                open={open}
                value={workingLevel}
                items={items}
                setOpen={setOpen}
                setValue={setWorkingLevel}
                setItems={setItems}
                placeholder="All Levels"
                style={{ borderColor: "#D1D5DB", minHeight: 48 }}
                dropDownContainerStyle={{ borderColor: "#D1D5DB" }}
              />
            </View>
          </View>
          <View className="mt-3 z-40">
            <DropDownPicker
              open={openSort}
              value={sortMode}
              items={sortItems}
              setOpen={setOpenSort}
              setValue={setSortMode}
              setItems={setSortItems}
              placeholder="Latest Created"
              style={{ borderColor: "#D1D5DB", minHeight: 48 }}
              dropDownContainerStyle={{ borderColor: "#D1D5DB" }}
            />
          </View>
          <View className="flex-row mt-3">
            <View className="flex-1 mr-2 rounded-xl px-3 py-2 border border-blue-200 bg-blue-100">
              <Text className="text-blue-700 font-semibold">Total</Text>
              <Text className="text-blue-800 text-xl font-bold">{stats.total}</Text>
            </View>
            <View className="flex-1 mx-1 rounded-xl px-3 py-2 border border-green-200 bg-green-100">
              <Text className="text-green-700 font-semibold">Active</Text>
              <Text className="text-green-800 text-xl font-bold">{stats.active}</Text>
            </View>
            <View className="flex-1 mx-1 rounded-xl px-3 py-2 border border-red-200 bg-red-100">
              <Text className="text-red-700 font-semibold">Blocked</Text>
              <Text className="text-red-800 text-xl font-bold">{stats.blocked}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowDeleted((cur) => !cur)}
              className={`flex-1 ml-2 rounded-xl px-3 py-2 border ${showDeleted ? "border-slate-400 bg-slate-200" : "border-slate-200 bg-slate-100"}`}
            >
              <Text className="text-slate-700 font-semibold">Deleted</Text>
              <Text className="text-slate-800 text-xl font-bold">{stats.deleted}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SCROLL LIST */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isBottomReached =
              layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
            if (isBottomReached) loadMore();
          }}
          scrollEventThrottle={400}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* LOADING */}
          {loading && (
            <View className="items-center py-10">
              <ActivityIndicator size="large" />
            </View>
          )}

          {/* Volunteer List */}
          {visibleVolunteers.length > 0 &&
            visibleVolunteers?.map((v) => {
              const selectionKey = v.userName || v.phone;
              const reactKey = v.userName ? `${v.userName}-${v.phone}` : v.phone;
              return (
              <View
                key={reactKey}
                className="mt-4 rounded-3xl border border-blue-200 bg-slate-50 p-3"
              >
                <View className="flex-row items-start">
                  <View className="w-12 h-12 rounded-2xl bg-blue-500 items-center justify-center">
                    <Text className="text-white font-bold text-base">{getInitials(v)}</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-gray-900 font-semibold text-[18px]">{getDisplayName(v)}</Text>
                    <View className="flex-row mt-2">
                      <View className="bg-blue-100 px-2 py-1 rounded-full mr-2">
                        <Text className="text-blue-700 text-[11px] font-semibold">{(v.assignmentType || "VOLUNTEER").toUpperCase()}</Text>
                      </View>
                      <View className={`px-2 py-1 rounded-full ${getStatusClass(v)}`}>
                        <Text className="text-[11px] font-semibold">{getStatusLabel(v)}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View className="mt-3 border border-slate-200 rounded-2xl p-3 bg-white">
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => toggleSelect(selectionKey)}
                      className={`w-10 h-10 rounded-xl border border-gray-300 items-center justify-center ${selected.includes(selectionKey) ? bgColors.blue500 : bgColors.white}`}
                    >
                      {selected.includes(selectionKey) ? <Text className="text-white font-bold">✓</Text> : null}
                    </TouchableOpacity>
                    <View className="ml-3 flex-1">
                      <Text className="text-gray-700">Phone : <Text className="font-bold text-gray-900">{v.phone || "-"}</Text></Text>
                      <Text className="text-gray-700 mt-1">User ID : <Text className="font-bold text-gray-900">{v.userName || "-"}</Text></Text>
                      <Text className="text-gray-700 mt-1">Wards : <Text className="font-bold text-gray-900">{getWardText(v)}</Text></Text>
                      <Text className="text-gray-700 mt-1">Booths : <Text className="font-bold text-blue-700">{getBoothText(v)}</Text></Text>
                    </View>
                  </View>

                  <View className="flex-row mt-3 flex-wrap">
                    <TouchableOpacity
                      onPress={() => handleEdit(v)}
                      className="bg-blue-600 px-4 py-2 rounded-full mr-2 mb-2"
                    >
                      <Text className="text-white text-xs font-semibold">Edit</Text>
                    </TouchableOpacity>
                    {v.deleted ? (
                      <TouchableOpacity
                        onPress={() => handleDeleteUndelete(v.userName, false)}
                        className="bg-slate-500 px-4 py-2 rounded-full mr-2 mb-2"
                      >
                        <Text className="text-white text-xs font-semibold">Undelete</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDeleteUndelete(v.userName, true)}
                        className="bg-slate-600 px-4 py-2 rounded-full mr-2 mb-2"
                      >
                        <Text className="text-white text-xs font-semibold">Delete</Text>
                      </TouchableOpacity>
                    )}

                    {v.blocked ? (
                      <TouchableOpacity
                        onPress={() => handleBlockUnblock(v.userName, false)}
                        className="bg-green-600 px-4 py-2 rounded-full mb-2"
                      >
                        <Text className="text-white text-xs font-semibold">Unblock</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleBlockUnblock(v.userName, true)}
                        className="bg-red-600 px-4 py-2 rounded-full mb-2"
                      >
                        <Text className="text-white text-xs font-semibold">Block</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
          )})}

          {/* Loading More Spinner */}
          {loadingMore && (
            <View className="items-center py-6">
              <ActivityIndicator size="small" />
            </View>
          )}

          {/* Empty State */}
          {!loading && visibleVolunteers.length === 0 && (
            <Text className="text-center text-gray-500 mt-6">
              No volunteers found.
            </Text>
          )}

          {/* Selected Count */}
          {selected.length > 0 && (
            <View className={`${bgColors.blue50} p-3 rounded-xl mt-4`}>
              <Text className="text-blue-700 font-semibold">
                Selected Volunteers: {selected.length}
              </Text>
            </View>
          )}

          {/* ACTION BUTTONS */}
          <Text className="text-gray-600 font-semibold mt-5 text-[18px]">Actions</Text>

          <View className="flex-row space-x-3 mt-3">
            <TouchableOpacity
              disabled={selected.length === 0}
              className={`px-4 py-3 rounded-xl border ${selected.length === 0
                ? `border-gray-300 ${bgColors.gray100}`
                : `border-gray-400 ${bgColors.white}`
                }`}
              onPress={handleBulkDelete}
            >
              <Text
                className={
                  selected.length === 0 ? "text-gray-400" : "text-gray-700"
                }
              >
                Delete Selected
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={selected.length === 0}
              className={`flex-1 px-4 py-3 rounded-xl ml-3 ${selected.length === 0 ? bgColors.red300 : bgColors.red500
                }`}
              onPress={handleBulkBlock}
            >
              <Text className="text-white text-center">
                Block Selected (Immediate)
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
