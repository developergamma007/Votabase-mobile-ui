import React from "react";
import { View, Text } from "react-native";

export function isVotabaseSuperAdmin(userInfo: { role?: string; userName?: string } | null | undefined) {
  const role = String(userInfo?.role || "").replace("ROLE_", "").toUpperCase();
  const userName = String(userInfo?.userName || "").toLowerCase();
  return role === "SUPER_ADMIN" || userName.startsWith("admin@iswot");
}

export default function FeatureComingSoon() {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16 bg-slate-50">
      <View className="bg-white border border-slate-200 rounded-2xl px-6 py-8 w-full max-w-md">
        <Text className="text-slate-700 text-center text-base">
          This feature will be available soon.
        </Text>
      </View>
    </View>
  );
}
