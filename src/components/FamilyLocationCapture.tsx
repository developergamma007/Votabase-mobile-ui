import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import Ionicons from "react-native-vector-icons/Ionicons";
import { buildOsmWebViewHtml } from "../config/osmMap";
import { FAST_HOUSEHOLD_GPS_OPTIONS, GetCurrentLocation } from "./GetCurrentLocation";

export type FamilyLocationValue = {
  latitude: number;
  longitude: number;
  source?: "gps" | "pin";
  confirmed?: boolean;
  accuracy?: number | null;
};

type Props = {
  location: FamilyLocationValue | null;
  onLocationChange: (loc: FamilyLocationValue) => void;
  onGpsSuccess?: (message: string) => void;
  onPinSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

const MAP_HEIGHT = 448;

export default function FamilyLocationCapture({
  location,
  onLocationChange,
  onGpsSuccess,
  onPinSuccess,
  onError,
}: Props) {
  const [mapKey, setMapKey] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [pinHint, setPinHint] = useState("");
  const pinMarkedRef = useRef(false);
  const locationRef = useRef(location);
  locationRef.current = location;

  // Auto-center the map on the phone's current location when opening
  // without a saved location (silent — user can still tap GPS or pin).
  useEffect(() => {
    if (locationRef.current?.latitude != null) return;
    let cancelled = false;
    (async () => {
      try {
        const pos = await GetCurrentLocation(FAST_HOUSEHOLD_GPS_OPTIONS);
        if (cancelled || locationRef.current?.latitude != null) return;
        if (!pos?.latitude || !pos?.longitude) return;
        onLocationChange({
          latitude: Number(pos.latitude),
          longitude: Number(pos.longitude),
          accuracy: pos.accuracy ?? null,
          source: "gps",
        });
        setMapKey((k) => k + 1);
      } catch {
        /* keep default map center */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mapHtml = useMemo(() => {
    const lat = location?.latitude ?? 12.9716;
    const lng = location?.longitude ?? 77.5946;
    return buildOsmWebViewHtml(lat, lng, {
      zoom: location?.latitude ? 17 : 14,
      draggable: true,
      clickable: true,
    });
  }, [mapKey]);

  const onMapMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === "position" && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        pinMarkedRef.current = true;
        setPinHint("");
        onLocationChange({
          latitude: data.lat,
          longitude: data.lng,
          source: "pin",
        });
      }
    } catch {
      /* ignore */
    }
  };

  const runGps = async () => {
    setGpsLoading(true);
    setPinHint("");
    try {
      const pos = await GetCurrentLocation(FAST_HOUSEHOLD_GPS_OPTIONS);
      if (!pos?.latitude || !pos?.longitude) {
        throw new Error("Unable to capture GPS location.");
      }
      pinMarkedRef.current = false;
      onLocationChange({
        latitude: Number(pos.latitude),
        longitude: Number(pos.longitude),
        accuracy: pos.accuracy ?? null,
        source: "gps",
      });
      setMapKey((k) => k + 1);
      const acc = pos.accuracy != null ? ` (±${Math.round(pos.accuracy)} m)` : "";
      onGpsSuccess?.(
        `GPS captured: ${Number(pos.latitude).toFixed(6)}, ${Number(pos.longitude).toFixed(6)}${acc}`,
      );
    } catch (e: any) {
      const msg = e?.message || "Unable to capture GPS location.";
      onError?.(msg);
      Alert.alert("GPS", msg);
    } finally {
      setGpsLoading(false);
    }
  };

  const captureGps = () => {
    if (pinMarkedRef.current && location?.latitude != null) {
      Alert.alert(
        "Replace pin location?",
        "GPS will replace your pin-marked household location. Continue with GPS?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Use GPS", onPress: runGps },
        ],
      );
      return;
    }
    runGps();
  };

  const confirmPinMark = () => {
    if (location?.latitude == null || location?.longitude == null) {
      const msg = "Tap or drag on the map to place the household pin first.";
      setPinHint(msg);
      onError?.(msg);
      return;
    }
    pinMarkedRef.current = true;
    onLocationChange({
      ...location,
      source: "pin",
      confirmed: true,
    });
    const msg = `Pin saved: ${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`;
    setPinHint(msg);
    onPinSuccess?.(msg);
  };

  const hasCoords =
    location?.latitude != null
    && location?.longitude != null
    && Number.isFinite(Number(location.latitude))
    && Number.isFinite(Number(location.longitude));

  return (
    <View>
      <Text className="text-slate-500 text-sm mb-2 px-1">
        Option 1 — GPS: use your phone location. Option 2 — Pin mark: drag/tap the map, then tap Pin Mark.
      </Text>
      <View
        className="border border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50"
        style={{ height: MAP_HEIGHT }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
      >
        {mapHtml ? (
          <WebView
            key={`family-loc-${mapKey}`}
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            nestedScrollEnabled
            onMessage={onMapMessage}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
      {hasCoords ? (
        <Text className="text-slate-500 text-xs mt-2 text-center">
          {Number(location!.latitude).toFixed(6)}, {Number(location!.longitude).toFixed(6)}
          {pinMarkedRef.current || location?.source === "pin" ? " · Pin marked" : location?.source === "gps" ? " · GPS" : ""}
        </Text>
      ) : null}
      {pinHint ? <Text className="text-emerald-700 text-xs mt-1 text-center font-semibold">{pinHint}</Text> : null}

      <View className="mt-3 flex-row gap-2">
        <TouchableOpacity
          className={`flex-1 rounded-2xl py-3 flex-row items-center justify-center ${gpsLoading ? "bg-slate-400" : "bg-blue-600"}`}
          onPress={captureGps}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="location-outline" size={18} color="#fff" />
          )}
          <Text className="text-white font-bold text-[12px] ml-1.5" numberOfLines={2}>
            {gpsLoading ? "GPS…" : "GPS Location"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 rounded-2xl py-3 flex-row items-center justify-center bg-slate-600"
          onPress={confirmPinMark}
        >
          <Ionicons name="pin-outline" size={18} color="#fff" />
          <Text className="text-white font-bold text-[12px] ml-1.5" numberOfLines={2}>
            Pin Mark
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
