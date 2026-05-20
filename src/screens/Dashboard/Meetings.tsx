import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { CRUDAPI, getAssemblyCode, GOOGLE_MAPS_API_KEY } from '../../apis/Api';
import { GetCurrentLocation } from '../../components/GetCurrentLocation';
import { WebView } from 'react-native-webview';
import DropDownPicker from 'react-native-dropdown-picker';
import { AuthContext } from '../../context/AuthContext';

const RECIPIENTS = [
  { key: 'assembly', label: 'Assembly' },
  { key: 'ward', label: 'Ward' },
  { key: 'booth', label: 'Booth' },
];

const CHANNELS = [
  { key: 'appAlert', label: 'App Alert' },
  { key: 'whatsapp', label: 'WhatsApp' },
];

export default function Meetings() {
  const { userInfo } = useContext(AuthContext) as any;
  const [assemblyCode, setAssemblyCode] = useState('');
  const [openAssembly, setOpenAssembly] = useState(false);
  const [assemblyItems, setAssemblyItems] = useState<any[]>([]);

  const [activeMeetingTab, setActiveMeetingTab] = useState<'list' | 'new'>('list');
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'attendance'>('details');

  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);

  const [meetingMessage, setMeetingMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [newMeeting, setNewMeeting] = useState({
    title: '',
    start: '',
    end: '',
    latitude: '',
    longitude: '',
    radius: '100',
  });
  const [newMeetingRecipients, setNewMeetingRecipients] = useState({
    assembly: false,
    ward: false,
    booth: false,
  });
  const [newMeetingChannels, setNewMeetingChannels] = useState({
    appAlert: true,
    whatsapp: false,
  });

  const [attendanceList, setAttendanceList] = useState<any[]>([]);

  const isSuperAdmin = String(userInfo?.role || '').replace('ROLE_', '').toUpperCase() === 'SUPER_ADMIN';
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(String(userInfo?.role || '').replace('ROLE_', '').toUpperCase());
  const toSafeKey = (value: any, fallback: string) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    const init = async () => {
      const code = await getAssemblyCode();
      setAssemblyCode(code);
      try {
        const dropdownResp = await CRUDAPI.getAssemblyDropdown();
        const payload = dropdownResp?.data?.result || dropdownResp?.result || dropdownResp?.data || [];
        const options = Array.isArray(payload)
          ? payload.map((a: any) => ({
              label: a?.name || a?.label || a?.assemblyName || String(a?.code || a?.assemblyCode || ''),
              value: a?.code || a?.assemblyCode || String(a?.id || code),
            }))
          : [];
        setAssemblyItems(options.length ? options : [{ label: String(code), value: String(code) }]);
      } catch {
        setAssemblyItems([{ label: String(code), value: String(code) }]);
      }
      fetchMeetingsList();
    };
    init();
  }, []);

  const fetchMeetingsList = async () => {
    try {
      setLoading(true);
      const res = await CRUDAPI.fetchMeetings();
      const list = Array.isArray(res) ? res : res?.data?.result || res?.result || res?.data || [];
      const normalized = (Array.isArray(list) ? list : []).map((m: any, idx: number) => ({
        id: toSafeKey(m.id ?? m.meetingId, `meeting-${idx}`),
        title: m.title || m.meetingTitle || '-',
        dateTime: m.dateTime || m.start_time || m.startTime || m.start || '',
        description: m.description || '',
        recipients: m.recipients || '',
        latitude: Number(m.latitude ?? m.lat ?? m.location?.latitude ?? 0),
        longitude: Number(m.longitude ?? m.lng ?? m.location?.longitude ?? 0),
        radius: Number(m.radius ?? m.radiusMeters ?? 100),
      }));
      setMeetings(normalized);
      if (!selectedMeeting && normalized.length > 0) {
        setSelectedMeeting(normalized[0]);
      }
    } catch {
      setMeetingMessage('Failed to fetch meetings.');
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m: any) => {
      const rec = String(m.recipients || '').toLowerCase();
      if (!rec) return true;
      const list = rec.split(',').map((s) => s.trim());
      if (list.includes('assembly')) return isAdmin;
      if (list.includes('ward')) return isAdmin || String(userInfo?.role || '').toUpperCase().includes('WARD');
      if (list.includes('booth')) return true;
      return true;
    });
  }, [meetings, isAdmin, userInfo]);

  const selectedMeetingMapHtml = useMemo(() => {
    if (!selectedMeeting?.latitude || !selectedMeeting?.longitude) return '';
    return `<!doctype html><html><head><meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" /><style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style></head><body><div id="map"></div><script>function initMap(){var p={lat:${Number(selectedMeeting.latitude)},lng:${Number(selectedMeeting.longitude)}};var m=new google.maps.Map(document.getElementById('map'),{zoom:15,center:p});new google.maps.Marker({position:p,map:m});}</script><script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap"></script></body></html>`;
  }, [selectedMeeting]);

  const newMeetingMapHtml = useMemo(() => {
    const lat = Number(newMeeting.latitude || 12.9716);
    const lng = Number(newMeeting.longitude || 77.5946);
    return `<!doctype html><html><head><meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" /><style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style></head><body><div id="map"></div><script>function initMap(){var p={lat:${lat},lng:${lng}};var m=new google.maps.Map(document.getElementById('map'),{zoom:14,center:p});new google.maps.Marker({position:p,map:m});}</script><script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap"></script></body></html>`;
  }, [newMeeting.latitude, newMeeting.longitude]);

  const handleSaveMeeting = async () => {
    try {
      setSaving(true);
      setMeetingMessage('Saving meeting...');
      const recipients = Object.keys(newMeetingRecipients).filter((k) => (newMeetingRecipients as any)[k]).join(',');
      const channels = Object.keys(newMeetingChannels).filter((k) => (newMeetingChannels as any)[k]).join(',');
      const payload = {
        title: newMeeting.title,
        start_time: newMeeting.start,
        end_time: newMeeting.end,
        latitude: parseFloat(newMeeting.latitude) || 0,
        longitude: parseFloat(newMeeting.longitude) || 0,
        radius: parseInt(newMeeting.radius) || 100,
        recipients,
        channels,
      };
      await CRUDAPI.createMeeting(payload);
      setMeetingMessage('Meeting saved successfully!');
      setTimeout(() => setMeetingMessage(''), 1500);
      setActiveMeetingTab('list');
      fetchMeetingsList();
    } catch (err: any) {
      setMeetingMessage(err?.message || 'Failed to save meeting.');
    } finally {
      setSaving(false);
    }
  };

  const loadAttendance = async (id: any) => {
    try {
      setAttendanceLoading(true);
      const res = await CRUDAPI.fetchMeetingAttendance(id);
      const list = Array.isArray(res) ? res : res?.data?.result || res?.result || res?.data || [];
      setAttendanceList(Array.isArray(list) ? list : []);
    } catch {
      setAttendanceList([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleRecordAttendance = async () => {
    if (!selectedMeeting?.id) return;
    try {
      setAttendanceLoading(true);
      const res = await CRUDAPI.recordMeetingAttendance(selectedMeeting.id);
      const added = res?.added || res?.data?.added || res?.data?.result?.added || 0;
      setMeetingMessage(`Success: ${added} voters discovered within radius.`);
      loadAttendance(selectedMeeting.id);
      setTimeout(() => setMeetingMessage(''), 4000);
    } catch {
      setMeetingMessage('Failed to record attendance. Ensure map settings and voter locations are correct.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleAttendSelf = async () => {
    if (!selectedMeeting?.id) return;
    try {
      setAttendanceLoading(true);
      setMeetingMessage('Capturing location...');
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos: any = await GetCurrentLocation();
        lat = Number(pos?.latitude);
        lng = Number(pos?.longitude);
      } catch {
        // Continue without GPS
      }
      await CRUDAPI.attendMeetingSelf(selectedMeeting.id, lat, lng);
      setMeetingMessage('Success: You have marked your attendance.');
      loadAttendance(selectedMeeting.id);
      setTimeout(() => setMeetingMessage(''), 3000);
    } catch {
      setMeetingMessage('Failed to mark attendance.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleUseMyLocation = async () => {
    try {
      const pos: any = await GetCurrentLocation();
      setNewMeeting((prev) => ({
        ...prev,
        latitude: Number(pos?.latitude || 0).toFixed(6),
        longitude: Number(pos?.longitude || 0).toFixed(6),
      }));
    } catch {
      // ignore
    }
  };

  return (
    <View className="flex-1 bg-[#EEF3FB]">
      <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-3 z-30">
          <Text className="text-slate-500 text-xs font-bold mb-1">CONTEXT</Text>
          <DropDownPicker
            open={openAssembly}
            value={assemblyCode}
            items={assemblyItems}
            setOpen={setOpenAssembly}
            setValue={setAssemblyCode}
            setItems={setAssemblyItems}
            style={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12, minHeight: 46 }}
            dropDownContainerStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12 }}
            textStyle={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}
            placeholderStyle={{ color: '#94A3B8' }}
          />
        </View>

        <View className="bg-white rounded-2xl border border-[#d9e2f0] p-4">
          <View className="bg-[#eaf0ff] border border-[#d2dcf3] p-1 rounded-full flex-row mb-4">
            <TouchableOpacity className={`flex-1 py-2 rounded-full ${activeMeetingTab === 'list' ? 'bg-blue-600' : 'bg-transparent'}`} onPress={() => setActiveMeetingTab('list')}>
              <Text className={`text-center font-bold text-[12px] ${activeMeetingTab === 'list' ? 'text-white' : 'text-slate-600'}`}>Meetings</Text>
            </TouchableOpacity>
            {isAdmin ? (
              <TouchableOpacity className={`flex-1 py-2 rounded-full ${activeMeetingTab === 'new' ? 'bg-blue-600' : 'bg-transparent'}`} onPress={() => setActiveMeetingTab('new')}>
                <Text className={`text-center font-bold text-[12px] ${activeMeetingTab === 'new' ? 'text-white' : 'text-slate-600'}`}>New Meeting</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {activeMeetingTab === 'list' ? (
            <>
              <TouchableOpacity className="self-start bg-blue-600 rounded-lg px-4 py-2 mb-3" onPress={fetchMeetingsList}>
                <Text className="text-white font-semibold text-[12px]">Refresh Meetings</Text>
              </TouchableOpacity>
              {loading ? <ActivityIndicator size="large" color="#2563eb" /> : null}

              {filteredMeetings.map((meeting, meetingIndex) => (
                <View key={toSafeKey(meeting.id, `meeting-card-${meetingIndex}`)} className="border border-slate-200 rounded-2xl p-4 mb-3 bg-white">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-slate-900 font-extrabold text-[16px]">{meeting.title}</Text>
                      <Text className="text-slate-600 mt-1 text-[12px]">{meeting.dateTime || '-'}</Text>
                      <View className="flex-row items-center flex-wrap mt-2">
                        <Text className="text-slate-500 mr-2 font-semibold text-[11px]">INVITED:</Text>
                        {String(meeting.recipients || 'All').split(',').filter(Boolean).map((r: string, recipientIndex: number) => (
                          <View key={`${toSafeKey(meeting.id, `meeting-${meetingIndex}`)}-${r}-${recipientIndex}`} className="mr-2 mb-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300">
                            <Text className="text-slate-600 text-[10px] font-bold uppercase">{r.trim() || 'ALL'}</Text>
                          </View>
                        ))}
                        {!String(meeting.recipients || '').trim() ? (
                          <View className="mr-2 mb-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300">
                            <Text className="text-slate-600 text-[10px] font-bold uppercase">ALL</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-slate-600 mt-1 text-[12px]">Location: {(meeting.latitude || 0).toFixed(4)}, {(meeting.longitude || 0).toFixed(4)} · Radius: {meeting.radius} m</Text>
                    </View>
                    <TouchableOpacity className="border border-slate-300 rounded-lg px-4 py-2" onPress={() => { setSelectedMeeting(meeting); setActiveSubTab('details'); }}>
                      <Text className="text-slate-900 text-[14px]">Open</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {selectedMeeting ? (
                <View className="mt-1 border border-slate-200 rounded-2xl p-4 bg-white">
                  <View className="bg-[#eaf0ff] border border-[#d2dcf3] p-1 rounded-full flex-row mb-4">
                    <TouchableOpacity className={`flex-1 py-2 rounded-full ${activeSubTab === 'details' ? 'bg-blue-600' : 'bg-transparent'}`} onPress={() => setActiveSubTab('details')}>
                      <Text className={`text-center font-bold text-[12px] ${activeSubTab === 'details' ? 'text-white' : 'text-slate-600'}`}>Details</Text>
                    </TouchableOpacity>
                    {isSuperAdmin ? (
                      <TouchableOpacity className={`flex-1 py-2 rounded-full ${activeSubTab === 'attendance' ? 'bg-blue-600' : 'bg-transparent'}`} onPress={() => { setActiveSubTab('attendance'); loadAttendance(selectedMeeting.id); }}>
                        <Text className={`text-center font-bold text-[12px] ${activeSubTab === 'attendance' ? 'text-white' : 'text-slate-600'}`}>Attendance</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {activeSubTab === 'details' ? (
                    <>
                      <Text className="text-slate-900 font-extrabold text-[16px]">{selectedMeeting.title}</Text>
                      <Text className="text-slate-600 mt-1 text-[12px]">{selectedMeeting.dateTime || '-'}</Text>
                      <Text className="text-slate-600 mt-2 text-[12px]">Location: {(selectedMeeting.latitude || 0).toFixed(4)}, {(selectedMeeting.longitude || 0).toFixed(4)} · Radius: {selectedMeeting.radius} m</Text>

                      <View className="h-52 mt-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        {selectedMeetingMapHtml ? (
                          <WebView source={{ html: selectedMeetingMapHtml }} originWhitelist={['*']} javaScriptEnabled domStorageEnabled scrollEnabled={false} />
                        ) : (
                          <View className="flex-1 items-center justify-center"><Text className="text-slate-400 text-[12px]">No location available.</Text></View>
                        )}
                      </View>

                      <View className="flex-row mt-4 gap-3">
                        <TouchableOpacity className="flex-1 bg-blue-700 rounded-lg py-3" onPress={handleAttendSelf} disabled={attendanceLoading}>
                          <Text className="text-center text-white font-bold text-[12px]">Record my Attendance</Text>
                        </TouchableOpacity>
                        {isSuperAdmin ? (
                          <TouchableOpacity className="flex-1 border border-slate-300 rounded-lg py-3" onPress={handleRecordAttendance} disabled={attendanceLoading}>
                            <Text className="text-center text-slate-800 font-bold text-[12px]">Scan Radius (Admins)</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </>
                  ) : (
                    <View>
                      {attendanceLoading ? <ActivityIndicator size="small" color="#2563eb" /> : null}
                      {!attendanceLoading && attendanceList.length === 0 ? (
                        <Text className="text-slate-400 text-[12px]">No attendance recorded yet.</Text>
                      ) : null}
                      {attendanceList.map((a: any, idx: number) => (
                        <View key={toSafeKey(a.id, `attendance-${idx}`)} className="border border-slate-200 rounded-xl p-3 mb-2">
                          <Text className="text-slate-900 font-bold text-[13px]">{a.name || '-'}</Text>
                          <Text className="text-slate-600 text-[12px]">{a.phone || '-'}</Text>
                          <Text className="text-slate-500 text-[11px]">Distance: {a.distance !== null && a.distance !== undefined ? `${Number(a.distance).toFixed(1)} m` : 'No GPS'}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text className="text-slate-700 font-semibold mb-1 text-[13px]">Meeting Title</Text>
              <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3 mb-3 text-[13px]" placeholder="Enter title" value={newMeeting.title} onChangeText={(v) => setNewMeeting((p) => ({ ...p, title: v }))} />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-slate-700 font-semibold mb-1 text-[13px]">Start (local)</Text>
                  <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3 mb-3 text-[13px]" placeholder="2026-04-25T04:13" value={newMeeting.start} onChangeText={(v) => setNewMeeting((p) => ({ ...p, start: v }))} />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-700 font-semibold mb-1 text-[13px]">End (optional)</Text>
                  <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3 mb-3 text-[13px]" placeholder="2026-04-25T08:13" value={newMeeting.end} onChangeText={(v) => setNewMeeting((p) => ({ ...p, end: v }))} />
                </View>
              </View>

              <View className="mt-1">
                <Text className="text-slate-700 font-semibold mb-2 text-[13px]">Recipients</Text>
                <View className="border border-slate-300 rounded-xl p-3 bg-white flex-row flex-wrap">
                  {RECIPIENTS.map((item) => {
                    const checked = (newMeetingRecipients as any)[item.key];
                    return (
                      <TouchableOpacity key={item.key} className="w-1/2 flex-row items-center mb-3" onPress={() => setNewMeetingRecipients((prev: any) => ({ ...prev, [item.key]: !prev[item.key] }))}>
                        <View className={`w-5 h-5 rounded border mr-2 items-center justify-center ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-400'}`}>
                          {checked ? <Text className="text-white text-[10px]">✓</Text> : null}
                        </View>
                        <Text className="text-slate-800 font-semibold text-[12px]">{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="mt-2">
                <Text className="text-slate-700 font-semibold mb-2 text-[13px]">Channels</Text>
                <View className="border border-slate-300 rounded-xl p-3 bg-white flex-row flex-wrap">
                  {CHANNELS.map((item) => {
                    const checked = (newMeetingChannels as any)[item.key];
                    return (
                      <TouchableOpacity key={item.key} className="w-1/2 flex-row items-center mb-3" onPress={() => setNewMeetingChannels((prev: any) => ({ ...prev, [item.key]: !prev[item.key] }))}>
                        <View className={`w-5 h-5 rounded border mr-2 items-center justify-center ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-400'}`}>
                          {checked ? <Text className="text-white text-[10px]">✓</Text> : null}
                        </View>
                        <Text className="text-slate-800 font-semibold text-[12px]">{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="flex-row gap-3 mt-1">
                <View className="flex-1">
                  <Text className="text-slate-700 font-semibold mb-1 text-[13px]">Latitude</Text>
                  <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3 text-[13px]" placeholder="13.0390" value={newMeeting.latitude} onChangeText={(v) => setNewMeeting((p) => ({ ...p, latitude: v }))} keyboardType="numeric" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-700 font-semibold mb-1 text-[13px]">Longitude</Text>
                  <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3 text-[13px]" placeholder="77.6121" value={newMeeting.longitude} onChangeText={(v) => setNewMeeting((p) => ({ ...p, longitude: v }))} keyboardType="numeric" />
                </View>
              </View>

              <Text className="text-slate-700 font-semibold mb-1 mt-3 text-[13px]">Radius (m)</Text>
              <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3 text-[13px]" placeholder="100" value={newMeeting.radius} onChangeText={(v) => setNewMeeting((p) => ({ ...p, radius: v }))} keyboardType="numeric" />

              <View className="h-52 mt-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <WebView source={{ html: newMeetingMapHtml }} originWhitelist={['*']} javaScriptEnabled domStorageEnabled scrollEnabled={false} />
              </View>

              <View className="flex-row mt-3 gap-3">
                <TouchableOpacity className="flex-1 border border-blue-500 rounded-xl py-3" onPress={handleUseMyLocation}>
                  <Text className="text-center text-blue-700 font-bold text-[12px]">Use my location</Text>
                </TouchableOpacity>
                <TouchableOpacity className={`flex-1 rounded-xl py-3 ${saving ? 'bg-slate-400' : 'bg-blue-600'}`} onPress={handleSaveMeeting} disabled={saving}>
                  <Text className="text-center text-white font-bold text-[12px]">{saving ? 'Saving...' : 'Save Meeting'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {!!meetingMessage && (
            <Text className={`mt-3 text-[12px] ${meetingMessage.toLowerCase().includes('failed') ? 'text-red-600' : 'text-green-700'}`}>
              {meetingMessage}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
