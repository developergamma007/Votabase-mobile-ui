import React, { useEffect, useMemo, useState, useContext } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { CRUDAPI, getAssemblyCode } from "../../apis/Api";
import { bgColors } from "../../constants/colors";
import { AuthContext } from "../../context/AuthContext";

export default function VolunteerAnalysis() {
  const { userInfo } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState('agent');
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState('');
  const [assemblyCode, setAssemblyCode] = useState('');

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

  const buildCsv = (fields, rows) => {
    const headers = ["Name", "ID", ...fields.map((f) => f.label)];
    const dataRows = rows.map((row) => [
      row.agentName || row.wardName || row.boothNo || row.date || "",
      row.phone || row.id || "",
      ...fields.map((f) => row.counts?.[f.key] ?? 0),
    ]);
    return [headers.join(","), ...dataRows.map((r) => r.join(","))].join("\n");
  };

  const handleShareCsv = async () => {
    const csv = buildCsv(fields, rows);
    await Share.share({
      title: "Volunteer Analysis",
      message: csv,
    });
  };

  const viewOptions = [
    { label: 'Agent', value: 'agent' },
    { label: 'Date', value: 'date' },
    { label: 'Ward', value: 'ward' },
    { label: 'Booth', value: 'booth' },
  ];

  const hasRows = rows.length > 0;

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="p-4">
        <Text className="text-xl font-bold text-gray-800 mb-1">Volunteer Analysis</Text>
        <Text className="text-gray-500 text-xs mb-4">Data collection coverage across different dimensions.</Text>

        {/* Filters */}
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

        <View className="mb-4">
          <Text className="text-gray-700 font-semibold mb-2">Ward Filter</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {wards.map((w) => (
              <TouchableOpacity
                key={w.value}
                onPress={() => setSelectedWard(w.value)}
                className={`px-4 py-2 rounded-full border ${selectedWard === w.value ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-50 border-gray-200'}`}
              >
                <Text className={`text-xs ${selectedWard === w.value ? 'text-white' : 'text-gray-600'}`}>{w.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="flex-row gap-2 mb-6">
          <TouchableOpacity
            onPress={loadAnalysis}
            className="flex-1 bg-blue-600 py-3 rounded-xl flex-row items-center justify-center"
          >
            <Icon name="refresh" size={18} color="white" />
            <Text className="text-white font-bold ml-2">Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShareCsv}
            disabled={!hasRows}
            className={`flex-1 ${hasRows ? 'bg-gray-800' : 'bg-gray-300'} py-3 rounded-xl flex-row items-center justify-center`}
          >
            <Icon name="share" size={18} color="white" />
            <Text className="text-white font-bold ml-2">Share CSV</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text className="text-red-600 text-center mb-4">{error}</Text> : null}
        {loading ? <ActivityIndicator size="large" color="#2563eb" /> : (
          <ScrollView horizontal className="mb-10">
            <View className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <View className="flex-row bg-gray-50 border-b border-gray-100">
                <Text className="w-32 p-3 font-bold text-gray-700">Entity</Text>
                {fields.map((f) => (
                  <Text key={f.key} className="w-24 p-3 font-bold text-gray-700 text-center">{f.label}</Text>
                ))}
              </View>
              {rows.map((row, idx) => (
                <View key={idx} className="flex-row border-b border-gray-50 bg-white">
                  <View className="w-32 p-3">
                    <Text className="font-semibold text-gray-800 text-xs">
                      {row.agentName || row.wardName || (row.boothNo ? `Booth ${row.boothNo}` : null) || row.date || "-"}
                    </Text>
                    {(row.phone || row.id) ? <Text className="text-gray-400 text-[10px]">{row.phone || row.id}</Text> : null}
                  </View>
                  {fields.map((f) => (
                    <Text key={`${idx}-${f.key}`} className="w-24 p-3 text-center text-xs text-gray-600">
                      {row.counts?.[f.key] ?? 0}
                    </Text>
                  ))}
                </View>
              ))}
              {!hasRows && !loading && (
                <Text className="p-10 text-gray-400 text-center">No data available for this selection.</Text>
              )}
            </View>
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );
}

