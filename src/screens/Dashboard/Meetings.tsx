import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";

export default function Meetings() {
  const [screen, setScreen] = useState("list"); // list | detail | create
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  const meetings = [
    {
      id: 1,
      title: "Ward Coordination Meeting",
      date: "15 Nov 2025 · 1:48 AM",
      desc: "Discuss booth assignments and outreach",
      location: "12.9716, 77.5946",
      radius: "150m",
    },
    {
      id: 2,
      title: "Booth Volunteer Training",
      date: "16 Nov 2025 · 12:48 AM",
      desc: "Training for booth volunteers",
      location: "12.9352, 77.6245",
      radius: "80m",
    },
  ];

  /* ---------------- MEETINGS LIST ---------------- */
  if (screen === "list") {
    return (
      <View className="flex-1 bg-gray-100 px-4 pt-6">
        <Text className="text-2xl font-bold mb-4">Meetings</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {meetings.map((m) => (
            <View
              key={m.id}
              className="bg-white rounded-xl p-4 mb-4 shadow-sm"
            >
              <Text className="text-lg font-semibold">{m.title}</Text>
              <Text className="text-gray-500 text-sm mt-1">{m.date}</Text>

              <Text className="mt-3 text-gray-700">{m.desc}</Text>

              <Text className="text-gray-500 text-xs mt-3">
                📍 {m.location} · Radius {m.radius}
              </Text>

              <TouchableOpacity
                className="bg-blue-600 py-3 rounded-lg mt-4"
                onPress={() => {
                  setSelectedMeeting(m);
                  setScreen("detail");
                }}
              >
                <Text className="text-white text-center font-semibold">
                  Open Meeting
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* Floating Add Button */}
        <TouchableOpacity
          className="absolute bottom-6 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
          onPress={() => setScreen("create")}
        >
          <Text className="text-white text-2xl">+</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ---------------- MEETING DETAIL ---------------- */
  if (screen === "detail" && selectedMeeting) {
    return (
      <View className="flex-1 bg-white px-5 pt-6">
        <TouchableOpacity onPress={() => setScreen("list")}>
          <Text className="text-blue-600 mb-4">← Back</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold">
          {selectedMeeting.title}
        </Text>

        <Text className="text-gray-500 mt-1">
          {selectedMeeting.date}
        </Text>

        <Text className="mt-4 text-gray-700">
          {selectedMeeting.desc}
        </Text>

        <Text className="mt-4 text-gray-500 text-sm">
          📍 {selectedMeeting.location} · Radius {selectedMeeting.radius}
        </Text>

        <TouchableOpacity className="bg-green-600 py-4 rounded-xl mt-10">
          <Text className="text-white text-center font-bold">
            Mark as Attended
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ---------------- CREATE MEETING ---------------- */
  if (screen === "create") {
    return (
      <View className="flex-1 bg-gray-100 px-4 pt-6">
        <TouchableOpacity onPress={() => setScreen("list")}>
          <Text className="text-blue-600 mb-4">← Back</Text>
        </TouchableOpacity>

        <Text className="text-xl font-bold mb-4">New Meeting</Text>

        <Text className="text-gray-600 mb-1">Meeting Name</Text>
        <TextInput className="bg-white rounded-lg p-3 mb-4" />

        <Text className="text-gray-600 mb-1">Start Time</Text>
        <TextInput
          className="bg-white rounded-lg p-3 mb-4"
          placeholder="mm/dd/yyyy hh:mm"
        />

        <Text className="text-gray-600 mb-1">End Time (optional)</Text>
        <TextInput className="bg-white rounded-lg p-3 mb-4" />

        <View className="flex-row gap-3 mb-4">
          <TextInput
            className="bg-white rounded-lg p-3 flex-1"
            placeholder="Latitude"
          />
          <TextInput
            className="bg-white rounded-lg p-3 flex-1"
            placeholder="Longitude"
          />
        </View>

        <TextInput
          className="bg-white rounded-lg p-3 mb-6"
          placeholder="Radius (meters)"
          keyboardType="numeric"
        />

        <TouchableOpacity className="bg-blue-600 py-4 rounded-xl">
          <Text className="text-white text-center font-bold">
            Save Meeting
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}
