import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Share } from "react-native";
import { CRUDAPI } from "../../apis/Api";
import { bgColors } from "../../constants/colors";

const buildCsv = (fields, rows) => {
  const headers = ["Agent Name", "Mobile No", ...fields.map((f) => f.label)];
  const dataRows = rows.map((row) => [
    row.agentName || "",
    row.phone || "",
    ...fields.map((f) => row.counts?.[f.key] ?? 0),
  ]);
  return [headers.join(","), ...dataRows.map((r) => r.join(","))].join("\n");
};

const buildExcelHtml = (fields, rows) => {
  const headers = ["Agent Name", "Mobile No", ...fields.map((f) => f.label)];
  const dataRows = rows.map((row) => [
    row.agentName || "",
    row.phone || "",
    ...fields.map((f) => row.counts?.[f.key] ?? 0),
  ]);
  const tableRows = [headers, ...dataRows]
    .map((r) => `<tr>${r.map((v) => `<td>${String(v)}</td>`).join("")}</tr>`)
    .join("");
  return `<table>${tableRows}</table>`;
};

export default function VolunteerAnalysis() {
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAnalysis = async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const res = await CRUDAPI.fetchVolunteerAnalysis(force);
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
    loadAnalysis(false);
  }, []);

  const handleShareCsv = async () => {
    const csv = buildCsv(fields, rows);
    await Share.share({
      title: "Volunteer Analysis (CSV)",
      message: csv,
    });
  };

  const handleShareExcel = async () => {
    const html = buildExcelHtml(fields, rows);
    await Share.share({
      title: "Volunteer Analysis (Excel)",
      message: html,
    });
  };

  const hasRows = rows.length > 0;

  return (
    <View className={`flex-1 ${bgColors.white} p-4`}>
      <Text className="text-xl font-semibold text-gray-800 mb-2">Volunteer Analysis</Text>
      <Text className="text-gray-600 mb-4">Data collection coverage by volunteer.</Text>

      <View className="flex-row gap-2 mb-4">
        <TouchableOpacity
          className={`${bgColors.blue600} px-4 py-3 rounded-lg`}
          onPress={() => loadAnalysis(true)}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-center">
            {loading ? "Refreshing..." : "Get Latest Data"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`${bgColors.gray800} px-4 py-3 rounded-lg`}
          onPress={handleShareCsv}
          disabled={!hasRows}
        >
          <Text className="text-white font-semibold text-center">Download CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`${bgColors.gray800} px-4 py-3 rounded-lg`}
          onPress={handleShareExcel}
          disabled={!hasRows}
        >
          <Text className="text-white font-semibold text-center">Download Excel</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text className="text-red-600 mb-2">{error}</Text> : null}
      {loading ? <ActivityIndicator size="large" /> : null}

      {!loading && !hasRows ? (
        <Text className="text-gray-500 mt-4">No analysis data found.</Text>
      ) : null}

      {hasRows ? (
        <ScrollView horizontal>
          <View className="border border-gray-200 rounded-lg">
            <View className="flex-row bg-gray-100 border-b border-gray-200">
              <Text className="w-40 p-2 font-semibold">Agent Name</Text>
              <Text className="w-32 p-2 font-semibold">Mobile No</Text>
              {fields.map((f) => (
                <Text key={f.key} className="w-32 p-2 font-semibold">
                  {f.label}
                </Text>
              ))}
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {rows.map((row) => (
                <View key={row.userId} className="flex-row border-b border-gray-200">
                  <Text className="w-40 p-2">{row.agentName || "-"}</Text>
                  <Text className="w-32 p-2">{row.phone || "-"}</Text>
                  {fields.map((f) => (
                    <Text key={`${row.userId}-${f.key}`} className="w-32 p-2">
                      {row.counts?.[f.key] ?? 0}
                    </Text>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}
