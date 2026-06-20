import React, { useState, useEffect, useMemo, useRef, useContext, useCallback } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Switch, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { CRUDAPI, getAssemblyCode } from "../../apis/Api";
import { AuthContext } from "../../context/AuthContext";
import { AppDropdown } from "../../components/AppDropdown";
import FeatureComingSoon, { isAdminIswotUser, isVotabaseSuperAdmin } from "../../components/FeatureComingSoon";

const POLL_PAGE_SIZE = 100;

function isPollVotedStatus(status: string) {
  const s = String(status || "").toUpperCase();
  return s.includes("VOTED") && !s.includes("NOT");
}

function isPollNotVotedStatus(status: string) {
  return String(status || "").toUpperCase().includes("NOT");
}

export default function PollDayVoters() {
  const { userInfo } = useContext(AuthContext) as any;
  const [tab, setTab] = useState("ALL");
  const [natureFilter, setNatureFilter] = useState("");
  const [pollQuery, setPollQuery] = useState("");
  const [pollRelationQuery, setPollRelationQuery] = useState("");
  const [pollSuggestions, setPollSuggestions] = useState<any[]>([]);
  const [pollLoading, setPollLoading] = useState(false);
  const [pollLoadingMore, setPollLoadingMore] = useState(false);
  const [showPollSuggestions, setShowPollSuggestions] = useState(false);
  const [pollVoters, setPollVoters] = useState<any[]>([]);
  const [pollPage, setPollPage] = useState(0);
  const [pollHasMore, setPollHasMore] = useState(false);
  const [pollMeta, setPollMeta] = useState<any>(null);
  const [pollError, setPollError] = useState("");
  const [pollDayEnabled, setPollDayEnabled] = useState(false);
  const [globalPollDayEnabled, setGlobalPollDayEnabled] = useState(false);

  const [assemblyCode, setAssemblyCode] = useState("");
  const [assemblyItems, setAssemblyItems] = useState<any[]>([]);

  const [natureItems, setNatureItems] = useState([
    { label: "Nature", value: "" },
    { label: "A", value: "A" },
    { label: "B", value: "B" },
    { label: "C", value: "C" },
    { label: "NA", value: "NA" },
  ]);

  const pollSearchTimerRef = useRef<any>(null);
  const isSuperAdmin = isVotabaseSuperAdmin(userInfo);
  const canSwitchAssembly = isAdminIswotUser(userInfo);

  useEffect(() => {
    const init = async () => {
      const code = await getAssemblyCode();
      setAssemblyCode(code);
      if (canSwitchAssembly) {
        try {
          const dropdownResp = await CRUDAPI.getAssemblyDropdown();
          const payload = dropdownResp?.data?.result || dropdownResp?.result || dropdownResp?.data || [];
          const items = Array.isArray(payload)
            ? payload.map((a: any) => ({
                label: a?.name || a?.label || a?.assemblyName || `${a?.code || a?.assemblyCode || ""}`,
                value: a?.code || a?.assemblyCode || String(a?.id || code),
              }))
            : [];
          setAssemblyItems(items.length ? items : [{ label: String(code), value: String(code) }]);
        } catch {
          setAssemblyItems([{ label: String(code), value: String(code) }]);
        }
      } else {
        setAssemblyItems([]);
      }
    };
    init();
  }, [canSwitchAssembly]);

  useEffect(() => {
    const checkActivation = async () => {
      if (!assemblyCode) return;
      try {
        const globalConfig = await CRUDAPI.fetchPollDayConfig(null, null);
        setGlobalPollDayEnabled(globalConfig.enabled);
        const config = await CRUDAPI.fetchPollDayConfig(assemblyCode);
        setPollDayEnabled(config.enabled);
      } catch {
        setPollDayEnabled(false);
        setGlobalPollDayEnabled(false);
      }
    };
    checkActivation();
  }, [assemblyCode]);

  const handleToggleActivation = async (val: boolean) => {
    try {
      await CRUDAPI.updatePollDayConfig(assemblyCode, null, val);
      setPollDayEnabled(val);
    } catch {
      setPollError("Failed to update activation.");
    }
  };

  const handleToggleGlobalActivation = async (val: boolean) => {
    try {
      await CRUDAPI.updatePollDayConfig(null, null, val);
      setGlobalPollDayEnabled(val);
      await CRUDAPI.updatePollDayConfig(assemblyCode, null, val);
      setPollDayEnabled(val);
    } catch {
      setPollError("Failed to update global activation.");
    }
  };

  const buildPollDisplay = (item: any) => {
    const name = [item.firstMiddleNameEn, item.lastNameEn].filter(Boolean).join(" ").trim();
    const rawStatus = item.votingStatus || item.voteStatus || item.status || item.votedStatus || "";
    const normalizedStatus = String(rawStatus).toUpperCase();
    return {
      id: item.epicNo || item.voterId || `${name}-${Date.now()}`,
      name: name || item.name || item.voterName || item.epicNo || "Unknown",
      epic: item.epicNo || item.epic || "",
      phone: item.mobile || item.phone || "",
      houseNo: item.houseNoEn || item.houseNoLocal || "",
      natureOfVoter: item.natureOfVoter || item.nature || "",
      boothNo: item.boothNo || item.boothNumber || item.booth || "",
      wardCode: item.wardCode || "",
      votedStatus: normalizedStatus || "",
    };
  };

  const parsePollSearchResponse = (res: any) => {
    const result = res?.data?.result || res?.result || [];
    const meta = res?.data?.meta || res?.meta || {};
    const list = Array.isArray(result) ? result : Array.isArray(res?.data) ? res.data : [];
    return { list, meta };
  };

  const runPollVoterFetch = useCallback(
    async (nextPage = 0, queryValue = pollQuery, append = false) => {
      if (!assemblyCode) return [];
      const isFirstPage = nextPage === 0 && !append;
      if (isFirstPage) setPollLoading(true);
      else setPollLoadingMore(true);
      setPollError("");
      try {
        const res = await CRUDAPI.searchVoters({
          assemblyCode,
          searchQuery: queryValue.trim() || undefined,
          relationName: pollRelationQuery.trim() || undefined,
          page: nextPage,
          size: POLL_PAGE_SIZE,
        });
        const { list, meta } = parsePollSearchResponse(res);
        setPollMeta(meta);
        setPollHasMore(Boolean(meta?.hasMore));
        setPollPage(nextPage);
        const mapped = list.map(buildPollDisplay);
        setPollVoters((prev) => {
          if (!append) return mapped;
          const seen = new Set(prev.map((v) => v.id));
          return [...prev, ...mapped.filter((v: any) => !seen.has(v.id))];
        });
        return list;
      } catch {
        if (!append) {
          setPollError("Unable to load voters.");
          setPollVoters([]);
          setPollMeta(null);
          setPollHasMore(false);
        }
        return [];
      } finally {
        if (isFirstPage) setPollLoading(false);
        else setPollLoadingMore(false);
      }
    },
    [assemblyCode, pollQuery, pollRelationQuery]
  );

  const fetchPollSuggestions = async (queryValue: string) => {
    if (!assemblyCode || !queryValue.trim()) {
      setPollSuggestions([]);
      return;
    }
    try {
      const res = await CRUDAPI.searchVoters({
        assemblyCode,
        searchQuery: queryValue.trim(),
        relationName: pollRelationQuery.trim() || undefined,
        page: 0,
        size: 20,
      });
      const { list } = parsePollSearchResponse(res);
      setPollSuggestions(list);
    } catch {
      setPollSuggestions([]);
    }
  };

  const loadMorePollVoters = useCallback(async () => {
    if (pollLoading || pollLoadingMore || !pollHasMore) return;
    await runPollVoterFetch(pollPage + 1, pollQuery, true);
  }, [pollLoading, pollLoadingMore, pollHasMore, pollPage, pollQuery, runPollVoterFetch]);

  useEffect(() => {
    if (!assemblyCode) return;
    if (pollSearchTimerRef.current) clearTimeout(pollSearchTimerRef.current);
    pollSearchTimerRef.current = setTimeout(() => {
      const query = pollQuery.trim();
      if (query) {
        setShowPollSuggestions(true);
        fetchPollSuggestions(query);
      } else {
        setPollSuggestions([]);
        setShowPollSuggestions(false);
      }
      runPollVoterFetch(0, pollQuery, false);
    }, 450);
    return () => clearTimeout(pollSearchTimerRef.current);
  }, [pollQuery, pollRelationQuery, assemblyCode, runPollVoterFetch]);

  const normalizeNature = (s: string) => {
    const v = String(s || "").toUpperCase().trim();
    if (["A", "FAVOUR", "FAVOR", "SUPPORTER"].includes(v)) return "A";
    if (["B", "NEUTRAL"].includes(v)) return "B";
    if (["C", "NON-FAVOUR", "NON-FAVOR", "OPPOSITION"].includes(v)) return "C";
    if (v === "NA") return "NA";
    return "";
  };

  const pollTabCounts = useMemo(() => {
    const all = Number(pollMeta?.total ?? pollVoters.length) || 0;
    const voted = pollVoters.filter((v) => isPollVotedStatus(v.votedStatus)).length;
    const notVoted = pollVoters.filter((v) => isPollNotVotedStatus(v.votedStatus)).length;
    return { all, voted, notVoted };
  }, [pollVoters, pollMeta]);

  const filteredPollVoters = useMemo(() => {
    let list = [...pollVoters];
    if (natureFilter) list = list.filter((v) => normalizeNature(v.natureOfVoter) === natureFilter);
    if (tab === "VOTED") list = list.filter((v) => isPollVotedStatus(v.votedStatus));
    if (tab === "NOT VOTED") list = list.filter((v) => isPollNotVotedStatus(v.votedStatus));
    return list;
  }, [pollVoters, natureFilter, tab]);

  const handleToggleVoted = async (voter: any, newStatus: string) => {
    if (!pollDayEnabled && !globalPollDayEnabled) {
      setPollError("Poll Day is currently not active. Please enable activation using the checkbox above.");
      return;
    }
    try {
      await CRUDAPI.updateVoterStatus(voter.epic, newStatus, voter.wardCode, voter.boothNo);
      setPollVoters((prev) => prev.map((v) => (v.id === voter.id ? { ...v, votedStatus: newStatus } : v)));
    } catch {
      setPollError("Failed to update status.");
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;
    if (nearBottom) loadMorePollVoters();
  };

  const tabLabel = (item: string) => {
    const count =
      item === "ALL" ? pollTabCounts.all : item === "VOTED" ? pollTabCounts.voted : pollTabCounts.notVoted;
    return `${item} (${count})`;
  };

  if (!isVotabaseSuperAdmin(userInfo)) {
    return <FeatureComingSoon />;
  }

  return (
    <View className="flex-1 bg-[#EEF3FB]">
      <ScrollView
        className="p-4"
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {canSwitchAssembly ? (
          <View className="bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-3 z-30">
            <Text className="text-slate-500 text-xs font-bold mb-1">CONTEXT</Text>
            <AppDropdown
              value={assemblyCode}
              items={assemblyItems}
              onChange={setAssemblyCode}
            />
          </View>
        ) : null}

        {isSuperAdmin ? (
          <View className="bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-bold text-slate-800 text-[13px]">Global Activation</Text>
              <Switch value={globalPollDayEnabled} onValueChange={handleToggleGlobalActivation} />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-slate-800 text-[13px]">Assembly Activation</Text>
              <Switch value={pollDayEnabled} onValueChange={handleToggleActivation} />
            </View>
          </View>
        ) : null}

        {!isSuperAdmin && !pollDayEnabled && !globalPollDayEnabled ? (
          <View className="bg-amber-50 p-3 border border-amber-200 rounded-2xl mb-3">
            <Text className="text-amber-800 text-[12px]">Poll Day is currently inactive. Please contact Admin for activation.</Text>
          </View>
        ) : null}

        <View className="premium-input flex-row items-center px-3 py-2">
          <Icon name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-2 text-black text-[13px] bg-transparent"
            placeholder="Search voter by EPIC or name"
            value={pollQuery}
            onChangeText={(v) => {
              setPollQuery(v);
              if (v.trim()) setShowPollSuggestions(true);
            }}
            onFocus={() => {
              if (pollQuery.trim()) setShowPollSuggestions(true);
            }}
          />
        </View>

        {showPollSuggestions && pollQuery.trim() ? (
          <View className="mt-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
            {pollLoading ? <ActivityIndicator className="m-3" color="#2563eb" /> : null}
            {!pollLoading && pollSuggestions.length === 0 ? (
              <Text className="px-3 py-3 text-slate-400 text-[12px]">No suggestions</Text>
            ) : null}
            {pollSuggestions.map((item: any, idx: number) => {
              const label = [item.firstMiddleNameEn, item.lastNameEn].filter(Boolean).join(" ").trim() || item.epicNo;
              return (
                <TouchableOpacity
                  key={`${item.epicNo || "suggest"}-${idx}`}
                  className="px-3 py-2 border-t border-slate-100"
                  onPress={() => {
                    setPollQuery(label || item.epicNo || "");
                    setShowPollSuggestions(false);
                    setPollSuggestions([]);
                  }}
                >
                  <Text className="text-slate-800 text-[13px] font-semibold">{label}</Text>
                  <Text className="text-slate-500 text-[11px]">{item.epicNo || "-"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          {["ALL", "VOTED", "NOT VOTED"].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setTab(f)}
              className={`border px-4 py-2 rounded-full mr-2 ${tab === f ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"}`}
            >
              <Text className={`font-semibold text-[12px] ${tab === f ? "text-white" : "text-slate-700"}`}>{tabLabel(f)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View className="mt-3 z-20">
          <AppDropdown
            value={natureFilter}
            items={natureItems}
            onChange={setNatureFilter}
          />
        </View>

        {pollMeta?.total ? (
          <Text className="text-slate-500 text-[11px] mt-2">
            Showing {pollVoters.length} of {pollMeta.total} voters{pollHasMore ? " — scroll for more" : ""}
          </Text>
        ) : null}

        {pollLoading && pollVoters.length === 0 ? <ActivityIndicator size="large" color="#2563eb" className="mt-4" /> : null}
        {pollError ? <Text className="text-red-600 mt-3 text-[12px]">{pollError}</Text> : null}

        <View className="mt-3">
          {filteredPollVoters.map((v, idx) => (
            <View key={`${String(v?.id || v?.epic || v?.name || "poll-voter")}-${idx}`} className="premium-card p-4 mb-3">
              <View className="flex-row">
                <View className="h-10 w-10 bg-blue-600 rounded-full items-center justify-center mr-3">
                  <Text className="text-white font-bold text-[16px]">{String(v.name || "U").charAt(0)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-extrabold text-[15px] text-slate-900">{v.name}</Text>
                  <Text className="text-slate-500 text-[12px]">{v.epic}</Text>
                  <Text className="text-slate-500 text-[12px]">{v.houseNo || "-"}</Text>
                  <View className="flex-row mt-1">
                    <View className="mr-2 px-2 py-0.5 rounded-full bg-slate-200">
                      <Text className="text-slate-700 text-[10px] font-bold">{normalizeNature(v.natureOfVoter) || "NA"}</Text>
                    </View>
                    <View className="px-2 py-0.5 rounded-full bg-slate-200">
                      <Text className="text-slate-700 text-[10px] font-bold">{v.boothNo || "-"}</Text>
                    </View>
                  </View>
                  <View className="flex-row mt-3">
                    <TouchableOpacity onPress={() => handleToggleVoted(v, "VOTED")} className="mr-2 border border-slate-300 rounded-full px-4 py-1.5">
                      <Text className="font-bold text-[12px]">VOTED</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleToggleVoted(v, "NOT VOTED")} className="border border-slate-300 rounded-full px-4 py-1.5">
                      <Text className="font-bold text-[12px]">NOT VOTED</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
          {!pollLoading && filteredPollVoters.length === 0 ? (
            <Text className="text-slate-400 text-center mt-6 text-[12px]">No voters found.</Text>
          ) : null}
          {pollLoadingMore ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="#2563eb" />
              <Text className="text-slate-500 text-[11px] mt-2">Loading more voters...</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
