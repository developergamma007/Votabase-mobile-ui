import { useEffect, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { CRUDAPI } from "../../apis/Api";
import { bgColors } from "../../constants/colors";
import { AuthContext } from "../../context/AuthContext";

export default function MyVolunteers() {
  const { userInfo } = useContext(AuthContext);
  // UI States
  const [selected, setSelected] = useState([]);
  const [open, setOpen] = useState(false);
  const [workingLevel, setWorkingLevel] = useState("");
  const [items, setItems] = useState([
    { label: "All Levels", value: "" },
    { label: "Assembly", value: "ASSEMBLY" },
    { label: "Ward", value: "WARD" },
    { label: "Booth", value: "BOOTH" },
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

      const res = await CRUDAPI.getVolunteerList(
        userInfo.role,
        pageNum,
        size,
        debouncedSearch,
        "",
        "firstName",
        "desc",
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
  }, [debouncedSearch, workingLevel]);

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
  const toggleSelect = (userName) => {
    if (selected.includes(userName)) {
      setSelected(selected.filter((s) => s !== userName));
    } else {
      setSelected([...selected, userName]);
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
  return (
    <View className={`flex-1 ${bgColors.customLightBlue}`}>
      <View className={`${bgColors.white} mx-4 mt-4 rounded-3xl p-4 shadow-sm flex-1`}>

        {/* SEARCH + FILTERS */}
        <View className="flex-row space-x-2 items-center">
          <TextInput
            placeholder="Search by name / phone"
            className={`flex-1 ${bgColors.white} border border-gray-300 rounded-xl px-3 py-2`}
            placeholderTextColor="#999"
            onChangeText={setSearch}
            autoCapitalize="none"
          />

          <View className="w-36 ml-3 mb-4 z-50">
            <DropDownPicker
              open={open}
              value={workingLevel}
              items={items}
              setOpen={setOpen}
              setValue={setWorkingLevel}
              setItems={setItems}
              placeholder="Level"
              style={{ borderColor: "#D1D5DB", height: 40 }}
              dropDownContainerStyle={{ borderColor: "#D1D5DB" }}
            />
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
          <View className={`${bgColors.customLightBlue2} p-3 rounded-xl mt-5`}>
            <Text className="text-gray-700 font-semibold">
              Volunteers (Level-wise)
            </Text>
          </View>

          {/* LOADING */}
          {loading && (
            <View className="items-center py-10">
              <ActivityIndicator size="large" />
            </View>
          )}

          {/* Volunteer List */}
          {volunteersList.length > 0 &&
            volunteersList?.map((v) => (
              <View
                key={v.userName}
                className="flex-row items-center justify-between border-b border-gray-200 py-4"
              >
                <View className="flex-row items-center space-x-3">
                  <TouchableOpacity
                    onPress={() => toggleSelect(v.userName)}
                    className={`w-6 h-6 rounded-md border border-gray-500 items-center justify-center ${selected.includes(v.userName) ? bgColors.blue500 : bgColors.white
                      }`}
                  >
                    {selected.includes(v.userName) && (
                      <Text className="text-white font-bold">✓</Text>
                    )}
                  </TouchableOpacity>

                  <View>
                    <Text className="text-gray-900 font-semibold ml-3">
                      {(v.firstName + " " + v.lastName).slice(0, 12)}
                      {(v.firstName + " " + v.lastName).length > 12 ? "..." : ""}
                    </Text>
                    <Text className="text-gray-600 text-sm ml-3">{v.phone}</Text>
                  </View>
                </View>

                <View className="flex-row space-x-2">

                  {/* Assignment Type */}
                  <View className={`${bgColors.customLightGray} px-2 py-1 rounded-lg`}>
                    <Text className="text-gray-700 text-xs">
                      {v.assignmentType}
                    </Text>
                  </View>

                  {/* <TouchableOpacity
                      onPress={() => handleDeleteUndelete(v.userName, true)}
                      className={`${bgColors.red500} px-2 py-1 rounded-lg ml-2`}
                    >
                      <Text className="text-white text-xs">Edit</Text>
                    </TouchableOpacity> */}

                  {/* Delete / Undelete */}
                  {v.deleted ? (
                    <TouchableOpacity
                      onPress={() => handleDeleteUndelete(v.userName, false)}
                      className={`${bgColors.green300} px-2 py-1 rounded-lg ml-2`}
                    >
                      <Text className="text-xs">Undelete</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleDeleteUndelete(v.userName, true)}
                      className={`${bgColors.red500} px-2 py-1 rounded-lg ml-2`}
                    >
                      <Text className="text-white text-xs">Delete</Text>
                    </TouchableOpacity>
                  )}

                  {/* Block / Unblock */}
                  {v.blocked ? (
                    <TouchableOpacity
                      onPress={() => handleBlockUnblock(v.userName, false)}
                      className={`${bgColors.green300} px-2 py-1 rounded-lg ml-2`}
                    >
                      <Text className="text-xs">Unblock</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleBlockUnblock(v.userName, true)}
                      className={`${bgColors.red500} px-2 py-1 rounded-lg ml-2`}
                    >
                      <Text className="text-white text-xs">Block</Text>
                    </TouchableOpacity>
                  )}

                </View>

              </View>
            ))}

          {/* Loading More Spinner */}
          {loadingMore && (
            <View className="items-center py-6">
              <ActivityIndicator size="small" />
            </View>
          )}

          {/* Empty State */}
          {!loading && volunteersList.length === 0 && (
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
          <Text className="text-gray-600 font-semibold mt-5">Actions</Text>

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
