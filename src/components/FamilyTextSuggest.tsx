import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";

function filterSuggestions(suggestions: string[], query: string, limit = 8) {
  const list = (suggestions || []).filter(Boolean);
  const q = String(query || "").trim().toLowerCase();
  const filtered = q ? list.filter((item) => item.toLowerCase().includes(q)) : list;
  return filtered.slice(0, limit);
}

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
};

export default function FamilyTextSuggest({
  label,
  value,
  onChangeText,
  suggestions = [],
  placeholder,
  className = "mb-4",
}: Props) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => filterSuggestions(suggestions, value), [suggestions, value]);

  return (
    <View className={className}>
      <Text className="text-slate-600 mb-2 font-semibold">{label}</Text>
      <TextInput
        className="border border-slate-300 bg-white rounded-xl px-4 py-3"
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
      />
      {open && filtered.length > 0 ? (
        <View className="border border-slate-200 rounded-xl mt-2 bg-white max-h-36">
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filtered.map((item) => (
              <TouchableOpacity
                key={item}
                className="px-3 py-2 border-b border-slate-100"
                onPress={() => {
                  onChangeText(item);
                  setOpen(false);
                }}
              >
                <Text className="text-slate-800">{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
