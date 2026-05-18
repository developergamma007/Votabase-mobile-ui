import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Share, Linking } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { WebView } from "react-native-webview";
import { CRUDAPI, getAssemblyCode } from "../../apis/Api";

export default function VolunteerAnalysis() {
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState('agent');
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [assemblyCode, setAssemblyCode] = useState('');
  const [sortMode, setSortMode] = useState('name-asc');
  const [activeTab, setActiveTab] = useState("table");
  const [mapDataMode, setMapDataMode] = useState("volunteers");
  const [mapPoints, setMapPoints] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");
  const [selectedMapItem, setSelectedMapItem] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailRows, setDetailRows] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    const init = async () => {
      const code = await getAssemblyCode();
      setAssemblyCode(code);
      loadWards(code);
    };
    init();
  }, []);

  const loadWards = async (code) => {
    try {
      const res = await CRUDAPI.fetchWards(code);
      const list = (res?.data?.result || res?.result || res || []).map(w => ({
        label: w.wardNameEn || `Ward ${w.wardId}`,
        value: String(w.wardId),
      })).sort((a, b) => a.label.localeCompare(b.label));
      setWards([{ label: 'All Wards', value: '' }, ...list]);
    } catch (err) {
      console.error('Failed to load wards:', err);
    }
  };

  const loadAnalysis = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await CRUDAPI.fetchVolunteerAnalysis(selectedWard || undefined, viewMode);
      const payload = res?.data?.result || res?.result || {};
      setRows(payload?.rows || []);
      setFields(payload?.fields || []);
    } catch (err) {
      setError(err?.message || "Unable to load volunteer analysis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, [viewMode, selectedWard, assemblyCode]);

  const loadMapPoints = async () => {
    setMapLoading(true);
    setMapError("");
    try {
      const res = mapDataMode === "families"
        ? await CRUDAPI.fetchFamilyLocationPoints(selectedWard || undefined)
        : await CRUDAPI.fetchVolunteerLocationPoints(selectedWard || undefined);
      const payload = res?.data?.result || res?.result || [];
      const points = Array.isArray(payload) ? payload : [];
      const normalized = points
        .map((item) => ({
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
          name: item.name || item.familyName || "-",
          relationName: item.relationName || item.relationNameEn || "",
          epic: item.epic || item.epicNo || "",
          mobile: item.mobile || item.phone || "",
          gender: item.gender || item.sex || "",
          familyAddress: item.familyAddress || item.addressEn || item.address || "",
          headOfFamily: item.headOfFamily || item.headName || "",
          membersCount: item.membersCount ?? item.members?.length ?? item.memberCount ?? "-",
        }))
        .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
      setMapPoints(normalized);
      setSelectedMapItem(normalized[0] || null);
    } catch (err) {
      setMapError(err?.message || "Unable to load map points.");
      setMapPoints([]);
      setSelectedMapItem(null);
    } finally {
      setMapLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "map") return;
    loadMapPoints();
  }, [activeTab, mapDataMode, selectedWard]);

  const loadDetails = async () => {
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await CRUDAPI.fetchVolunteerEnrichmentDetails(selectedWard || undefined, undefined, undefined, 0, 100);
      const payload = res?.data?.result || res?.result || [];
      setDetailRows(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setDetailError(err?.message || "Unable to load enrichment details.");
      setDetailRows([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleDetails = async () => {
    const next = !showDetails;
    setShowDetails(next);
    if (next && detailRows.length === 0) await loadDetails();
  };

  const shareDetailCsv = async () => {
    const rowsForExport = detailRows || [];
    if (!rowsForExport.length) return;
    const headers = ["Ward", "Name", "EPIC", "Booth", "Updated By", "Agent Phone", "Updated At"];
    const dataRows = rowsForExport.map((r) => [
      r.wardName || "-",
      r.name || [r.firstMiddleNameEn, r.lastNameEn].filter(Boolean).join(" ") || "-",
      r.epicNo || r.epic || "-",
      r.boothNo || "-",
      r.updatedByName || "-",
      r.updatedByPhone || "-",
      formatDateTime(r.lastUpdatedAt),
    ]);
    const csv = [headers.join(","), ...dataRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    await Share.share({ title: "Volunteer Enrichment Details", message: csv });
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const raw = typeof value === "string" ? value.trim() : value;
    const needsTz = typeof raw === "string" && raw !== "" && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
    const normalized = needsTz ? `${raw}Z` : raw;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  };

  const sortedRows = useMemo(() => {
    const items = [...rows];
    if (viewMode !== "agent") {
      return items.sort((a, b) => {
        const aTime = new Date(a.lastUpdatedAt || 0).getTime();
        const bTime = new Date(b.lastUpdatedAt || 0).getTime();
        if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) return bTime - aTime;
        return String(a.label || a.groupKey || "").localeCompare(String(b.label || b.groupKey || ""), "en");
      });
    }
    if (sortMode === "name-desc") {
      return items.sort((a, b) => String(b.agentName || "").localeCompare(String(a.agentName || ""), "en"));
    }
    if (sortMode === "latest") {
      return items.sort((a, b) => {
        const aTime = new Date(a.lastUpdatedAt || 0).getTime();
        const bTime = new Date(b.lastUpdatedAt || 0).getTime();
        if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) return bTime - aTime;
        return Number(b.userId || 0) - Number(a.userId || 0);
      });
    }
    if (sortMode === "oldest") return items.sort((a, b) => Number(a.userId || 0) - Number(b.userId || 0));
    return items.sort((a, b) => String(a.agentName || "").localeCompare(String(b.agentName || ""), "en"));
  }, [rows, sortMode, viewMode]);

  const summaryTotals = useMemo(() => {
    if (viewMode === "agent") return null;
    return {
      agentsWorked: sortedRows.reduce((sum, row) => sum + (Number(row.agentsWorked) || 0), 0),
      boothsCovered: sortedRows.reduce((sum, row) => sum + (Number(row.boothsCovered) || 0), 0),
      votersMet: sortedRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
    };
  }, [sortedRows, viewMode]);

  const buildExportRows = () => {
    const baseHeaders = fields.map((f) => f.label);
    const getRowTotalUpdates = (row) => fields.reduce((sum, f) => sum + (Number(row.counts?.[f.key]) || 0), 0);

    if (viewMode === "agent") {
      return {
        headers: ["Agent Name", "Mobile No", ...baseHeaders, "Last Updated At"],
        dataRows: sortedRows.map((row) => [
          row.agentName || "",
          row.phone || "",
          ...fields.map((f) => row.counts?.[f.key] ?? 0),
          formatDateTime(row.lastUpdatedAt),
        ]),
      };
    }
    if (viewMode === "date") {
      return {
        headers: ["Date", "Agents Worked", "Booths Covered", "Voters Met", ...baseHeaders, "Total Updates", "Last Updated At"],
        dataRows: sortedRows.map((row) => [
          row.label || row.groupKey || "",
          row.agentsWorked ?? 0,
          row.boothsCovered ?? 0,
          row.total ?? 0,
          ...fields.map((f) => row.counts?.[f.key] ?? 0),
          getRowTotalUpdates(row),
          formatDateTime(row.lastUpdatedAt),
        ]),
      };
    }
    if (viewMode === "ward") {
      return {
        headers: ["Ward", "Agents", "Booths", "Voters Met", ...baseHeaders, "Total Updates", "Last Updated At"],
        dataRows: sortedRows.map((row) => [
          row.label || row.groupKey || "",
          row.agentsWorked ?? 0,
          row.boothsCovered ?? 0,
          row.total ?? 0,
          ...fields.map((f) => row.counts?.[f.key] ?? 0),
          getRowTotalUpdates(row),
          formatDateTime(row.lastUpdatedAt),
        ]),
      };
    }
    return {
      headers: ["Booth No.", "Agents", "Voters Met", ...baseHeaders, "Total Updates", "Last Updated At"],
      dataRows: sortedRows.map((row) => [
        row.label || row.groupKey || "",
        row.agentsWorked ?? 0,
        row.total ?? 0,
        ...fields.map((f) => row.counts?.[f.key] ?? 0),
        getRowTotalUpdates(row),
        formatDateTime(row.lastUpdatedAt),
      ]),
    };
  };

  const handleDownloadCsv = async () => {
    const { headers, dataRows } = buildExportRows();
    const csv = [headers.join(","), ...dataRows.map((r) => r.join(","))].join("\n");
    await Share.share({ title: "Volunteer Analysis", message: csv });
  };

  const viewOptions = [
    { label: 'Agent', value: 'agent' },
    { label: 'Date', value: 'date' },
    { label: 'Ward', value: 'ward' },
    { label: 'Booth', value: 'booth' },
  ];

  const sortOptions = [
    { label: "Name A-Z", value: "name-asc" },
    { label: "Name Z-A", value: "name-desc" },
    { label: "Latest Created", value: "latest" },
    { label: "Oldest Created", value: "oldest" },
  ];

  const hasRows = sortedRows.length > 0;
  const openInMaps = async (item) => {
    if (!item?.latitude || !item?.longitude) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
    await Linking.openURL(url);
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="p-4">
        <Text className="text-xl font-bold text-gray-800 mb-1">Volunteer Analysis</Text>
        <Text className="text-gray-500 text-xs mb-4">Data collection coverage across different dimensions.</Text>

        <View className="mb-4 flex-row gap-2">
          {["table", "map"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl border ${activeTab === tab ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"}`}
            >
              <Text className={`text-center font-semibold ${activeTab === tab ? "text-white" : "text-gray-700"}`}>{tab === "table" ? "Table" : "Map"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-semibold mb-2">Ward Filter</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {wards.map((w, wardIndex) => (
              <TouchableOpacity
                key={`${String((w as any)?.value || (w as any)?.label || "ward")}-${wardIndex}`}
                onPress={() => setSelectedWard(w.value)}
                className={`px-4 py-2 rounded-full border ${selectedWard === w.value ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-50 border-gray-200'}`}
              >
                <Text className={`text-xs ${selectedWard === w.value ? 'text-white' : 'text-gray-600'}`}>{w.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {activeTab === "table" ? (
          <>
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">View Mode</Text>
              <View className="flex-row flex-wrap gap-2">
                {viewOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setViewMode(opt.value)}
                    className={`px-4 py-2 rounded-full border ${viewMode === opt.value ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
                  >
                    <Text className={`text-xs font-bold ${viewMode === opt.value ? 'text-white' : 'text-gray-700'}`}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {viewMode === "agent" ? (
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Sort By</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  {sortOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setSortMode(opt.value)}
                      className={`px-4 py-2 rounded-full border ${sortMode === opt.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"}`}
                    >
                      <Text className={`text-xs ${sortMode === opt.value ? "text-white" : "text-gray-600"}`}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        ) : null}

        {activeTab === "table" ? (
          <View className="flex-row gap-2 mb-6">
            <TouchableOpacity
              onPress={loadAnalysis}
              className="flex-1 bg-blue-600 py-3 rounded-xl flex-row items-center justify-center"
            >
              <Icon name="refresh" size={18} color="white" />
              <Text className="text-white font-bold ml-2">{loading ? "Refreshing..." : "Get Latest Data"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDownloadCsv}
              disabled={!hasRows}
              className={`flex-1 ${hasRows ? 'bg-gray-800' : 'bg-gray-300'} py-3 rounded-xl flex-row items-center justify-center`}
            >
              <Icon name="file-download" size={18} color="white" />
              <Text className="text-white font-bold ml-2">Download CSV</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mb-6">
            <TouchableOpacity
              onPress={loadMapPoints}
              className="bg-blue-600 py-3 rounded-xl flex-row items-center justify-center"
            >
              <Icon name="refresh" size={18} color="white" />
              <Text className="text-white font-bold ml-2">
                {mapLoading ? "Refreshing..." : `Refresh ${mapDataMode === "families" ? "Families" : "Users"}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "table" ? (
          <>
            {error ? <Text className="text-red-600 text-center mb-4">{error}</Text> : null}
            {loading ? <ActivityIndicator size="large" color="#2563eb" /> : (
          <ScrollView horizontal className="mb-10">
            <View className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              {summaryTotals ? (
                <View className="bg-blue-50 px-3 py-2 border-b border-blue-100">
                  <Text className="text-[11px] text-blue-900 font-medium">
                    {viewMode !== "booth"
                      ? `Total Agents: ${summaryTotals.agentsWorked}   Total Booths: ${summaryTotals.boothsCovered}   Total Voters Met: ${summaryTotals.votersMet}`
                      : `Total Agents: ${summaryTotals.agentsWorked}   Total Voters Met: ${summaryTotals.votersMet}`}
                  </Text>
                </View>
              ) : null}
              <View className="flex-row bg-gray-50 border-b border-gray-100">
                {viewMode === "agent" ? (
                  <>
                    <Text className="w-36 p-3 font-bold text-gray-700">Agent Name</Text>
                    <Text className="w-28 p-3 font-bold text-gray-700 text-center">Mobile No</Text>
                  </>
                ) : null}
                {viewMode === "date" ? (
                  <>
                    <Text className="w-28 p-3 font-bold text-gray-700">Date</Text>
                    <Text className="w-24 p-3 font-bold text-gray-700 text-center">Agents</Text>
                    <Text className="w-24 p-3 font-bold text-gray-700 text-center">Booths</Text>
                    <Text className="w-24 p-3 font-bold text-gray-700 text-center">Voters</Text>
                  </>
                ) : null}
                {viewMode === "ward" ? (
                  <>
                    <Text className="w-28 p-3 font-bold text-gray-700">Ward</Text>
                    <Text className="w-24 p-3 font-bold text-gray-700 text-center">Agents</Text>
                    <Text className="w-24 p-3 font-bold text-gray-700 text-center">Booths</Text>
                    <Text className="w-24 p-3 font-bold text-gray-700 text-center">Voters</Text>
                  </>
                ) : null}
                {viewMode === "booth" ? (
                  <>
                    <Text className="w-24 p-3 font-bold text-gray-700">Booth No.</Text>
                    <Text className="w-24 p-3 font-bold text-gray-700 text-center">Agents</Text>
                    <Text className="w-24 p-3 font-bold text-gray-700 text-center">Voters</Text>
                  </>
                ) : null}
                {fields.map((f) => (
                  <Text key={f.key} className="w-24 p-3 font-bold text-gray-700 text-center">{f.label}</Text>
                ))}
                {["date", "booth", "ward"].includes(viewMode) ? (
                  <Text className="w-24 p-3 font-bold text-gray-700 text-center">Total</Text>
                ) : null}
                <Text className="w-40 p-3 font-bold text-gray-700">Updated At</Text>
              </View>
              {sortedRows.map((row, idx) => (
                <View key={`${String(row?.groupKey || row?.label || row?.agentName || "row")}-${idx}`} className="flex-row border-b border-gray-50 bg-white">
                  {viewMode === "agent" ? (
                    <>
                      <Text className="w-36 p-3 text-xs text-gray-800">{row.agentName || "-"}</Text>
                      <Text className="w-28 p-3 text-xs text-gray-600 text-center">{row.phone || "-"}</Text>
                    </>
                  ) : null}
                  {viewMode === "date" ? (
                    <>
                      <Text className="w-28 p-3 text-xs text-gray-800">{row.label || row.groupKey || "-"}</Text>
                      <Text className="w-24 p-3 text-xs text-gray-600 text-center">{row.agentsWorked ?? 0}</Text>
                      <Text className="w-24 p-3 text-xs text-gray-600 text-center">{row.boothsCovered ?? 0}</Text>
                      <Text className="w-24 p-3 text-xs text-gray-600 text-center">{row.total ?? 0}</Text>
                    </>
                  ) : null}
                  {viewMode === "ward" ? (
                    <>
                      <Text className="w-28 p-3 text-xs text-gray-800">{row.label || row.groupKey || "-"}</Text>
                      <Text className="w-24 p-3 text-xs text-gray-600 text-center">{row.agentsWorked ?? 0}</Text>
                      <Text className="w-24 p-3 text-xs text-gray-600 text-center">{row.boothsCovered ?? 0}</Text>
                      <Text className="w-24 p-3 text-xs text-gray-600 text-center">{row.total ?? 0}</Text>
                    </>
                  ) : null}
                  {viewMode === "booth" ? (
                    <>
                      <Text className="w-24 p-3 text-xs text-gray-800">{row.label || row.groupKey || "-"}</Text>
                      <Text className="w-24 p-3 text-xs text-gray-600 text-center">{row.agentsWorked ?? 0}</Text>
                      <Text className="w-24 p-3 text-xs text-gray-600 text-center">{row.total ?? 0}</Text>
                    </>
                  ) : null}
                  {fields.map((f) => (
                    <Text key={`${idx}-${f.key}`} className="w-24 p-3 text-center text-xs text-gray-600">
                      {row.counts?.[f.key] ?? 0}
                    </Text>
                  ))}
                  {["date", "booth", "ward"].includes(viewMode) ? (
                    <Text className="w-24 p-3 text-xs text-gray-700 text-center font-semibold">
                      {fields.reduce((sum, field) => sum + (Number(row.counts?.[field.key]) || 0), 0)}
                    </Text>
                  ) : null}
                  <Text className="w-40 p-3 text-xs text-gray-600">{formatDateTime(row.lastUpdatedAt)}</Text>
                </View>
              ))}
              {viewMode === "agent" && hasRows ? (
                <View className="flex-row border-b border-gray-100 bg-gray-50">
                  <Text className="w-36 p-3 text-xs font-bold text-gray-700">Total</Text>
                  <Text className="w-28 p-3 text-xs text-gray-500 text-center">-</Text>
                  {fields.map((f) => (
                    <Text key={`total-${f.key}`} className="w-24 p-3 text-center text-xs font-bold text-gray-700">
                      {sortedRows.reduce((sum, row) => sum + (Number(row.counts?.[f.key]) || 0), 0)}
                    </Text>
                  ))}
                  <Text className="w-40 p-3 text-xs text-gray-500">-</Text>
                </View>
              ) : null}
              {!hasRows && !loading && (
                <Text className="p-10 text-gray-400 text-center">No data available for this selection.</Text>
              )}
            </View>
          </ScrollView>
            )}
          </>
        ) : (
          <View className="mb-8">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="flex-1 bg-indigo-50 border border-indigo-100 rounded-2xl p-1 flex-row">
                {["volunteers", "families"].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setMapDataMode(mode)}
                    className={`flex-1 py-2 rounded-xl ${mapDataMode === mode ? "bg-blue-600" : "bg-white border border-gray-200"}`}
                  >
                    <Text className={`text-center text-sm font-semibold ${mapDataMode === mode ? "text-white" : "text-gray-700"}`}>
                      {mode === "volunteers" ? "Users" : "Families"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text className="text-xs font-semibold text-slate-600 mb-3">
              {mapDataMode === "families" ? "Family Location" : "User Location"}
            </Text>
            {mapError ? <Text className="text-red-600 text-center mb-3">{mapError}</Text> : null}
            {mapLoading ? <ActivityIndicator size="large" color="#2563eb" /> : null}
            {!mapLoading && mapPoints.length === 0 ? (
              <Text className="text-gray-400 text-center py-8">No captured locations found.</Text>
            ) : null}
            {!mapLoading && mapPoints.length > 0 ? (
              <View className="gap-3">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {mapPoints.map((item, idx) => (
                    <TouchableOpacity
                      key={`${String(item?.epic || item?.name || item?.latitude || "map-point")}-${idx}`}
                      onPress={() => setSelectedMapItem(item)}
                      className={`mr-2 px-3 py-2 rounded-lg border ${selectedMapItem === item ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"}`}
                    >
                      <Text className="text-xs font-semibold text-gray-800">{item.name || "Location"}</Text>
                      <Text className="text-[10px] text-gray-500">{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {selectedMapItem ? (
                  <View className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                    <Text className="font-bold text-gray-800 mb-2">{selectedMapItem.name || "-"}</Text>
                    {mapDataMode === "families" ? (
                      <>
                        <Text className="text-xs text-gray-700 mb-1">Address: {selectedMapItem.familyAddress || "-"}</Text>
                        <Text className="text-xs text-gray-700 mb-1">Head: {selectedMapItem.headOfFamily || "-"}</Text>
                        <Text className="text-xs text-gray-700 mb-1">Phone: {selectedMapItem.mobile || "-"}</Text>
                        <Text className="text-xs text-gray-700 mb-3">Members: {selectedMapItem.membersCount}</Text>
                      </>
                    ) : (
                      <>
                        <Text className="text-xs text-gray-700 mb-1">Relation: {selectedMapItem.relationName || "-"}</Text>
                        <Text className="text-xs text-gray-700 mb-1">EPIC: {selectedMapItem.epic || "-"}</Text>
                        <Text className="text-xs text-gray-700 mb-1">Mobile: {selectedMapItem.mobile || "-"}</Text>
                        <Text className="text-xs text-gray-700 mb-3">Gender: {selectedMapItem.gender || "-"}</Text>
                      </>
                    )}
                    <View className="h-48 w-full mb-3 rounded-lg overflow-hidden bg-gray-200">
                      <WebView 
                        source={{ uri: `https://maps.google.com/maps?q=${selectedMapItem.latitude},${selectedMapItem.longitude}&z=15&output=embed` }} 
                        style={{ flex: 1 }} 
                      />
                    </View>
                    <TouchableOpacity onPress={() => openInMaps(selectedMapItem)} className="bg-blue-600 rounded-lg py-2">
                      <Text className="text-white text-center font-semibold text-xs">Open Full Map</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}

        {activeTab === "table" ? (
          <View className="mb-10">
            <Text className="text-gray-700 font-semibold mb-2">Details</Text>
            <TouchableOpacity
              onPress={toggleDetails}
              className="border border-blue-300 bg-blue-50 rounded-lg py-2 mb-3"
            >
              <Text className="text-center text-blue-800 font-semibold">
                {showDetails ? "Hide Enrichment Details" : "Show Enrichment Details"}
              </Text>
            </TouchableOpacity>

            {showDetails ? (
              <>
                <View className="flex-row gap-2 mb-3">
                  <TouchableOpacity
                    onPress={shareDetailCsv}
                    disabled={!detailRows.length}
                    className={`flex-1 py-2 rounded-lg border ${detailRows.length ? "border-gray-400 bg-white" : "border-gray-200 bg-gray-100"}`}
                  >
                    <Text className={`text-center font-semibold ${detailRows.length ? "text-gray-700" : "text-gray-400"}`}>Download CSV</Text>
                  </TouchableOpacity>
                </View>
                {detailError ? <Text className="text-red-600 text-center mb-3">{detailError}</Text> : null}
                {detailLoading ? <ActivityIndicator size="small" color="#2563eb" /> : null}
                {!detailLoading && detailRows.length === 0 ? (
                  <Text className="text-gray-400 text-center py-6">No enrichment details found.</Text>
                ) : null}
                {!detailLoading && detailRows.length > 0 ? (
                  <ScrollView horizontal className="border border-gray-200 rounded-xl">
                    <View>
                      <View className="flex-row bg-gray-100 border-b border-gray-200">
                        {["Ward", "Name", "EPIC", "Booth", "Updated By", "Agent Phone", "Updated At"].map((h) => (
                          <Text key={h} className="w-28 p-2 text-xs font-bold text-gray-700">{h}</Text>
                        ))}
                      </View>
                      {detailRows.map((r, idx) => (
                        <View key={`${r.epicNo || r.epic || "row"}-${idx}`} className="flex-row border-b border-gray-100">
                          <Text className="w-28 p-2 text-xs text-gray-700">{r.wardName || "-"}</Text>
                          <Text className="w-28 p-2 text-xs text-gray-700">{r.name || [r.firstMiddleNameEn, r.lastNameEn].filter(Boolean).join(" ") || "-"}</Text>
                          <Text className="w-28 p-2 text-xs text-gray-700">{r.epicNo || r.epic || "-"}</Text>
                          <Text className="w-28 p-2 text-xs text-gray-700">{r.boothNo || "-"}</Text>
                          <Text className="w-28 p-2 text-xs text-gray-700">{r.updatedByName || "-"}</Text>
                          <Text className="w-28 p-2 text-xs text-gray-700">{r.updatedByPhone || "-"}</Text>
                          <Text className="w-40 p-2 text-xs text-gray-700">{formatDateTime(r.lastUpdatedAt)}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
