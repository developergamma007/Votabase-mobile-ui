import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppDropdown } from '../../components/AppDropdown';
import { CRUDAPI, getAssemblyCode } from '../../apis/Api';
import { AuthContext } from '../../context/AuthContext';
import { isAdminIswotUser } from '../../components/FeatureComingSoon';

export default function Promotions() {
  const { userInfo } = useContext(AuthContext) as any;
  const role = String(userInfo?.role || '').replace('ROLE_', '').toUpperCase();
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const canSwitchAssembly = isAdminIswotUser(userInfo);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [activatedWards, setActivatedWards] = useState<any[]>([]);

  const [assemblyId, setAssemblyId] = useState('');
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const [channel, setChannel] = useState('WHATSAPP');

  const [assemblyItems, setAssemblyItems] = useState<any[]>([]);
  const [wardItems, setWardItems] = useState<any[]>([]);
  const [channelItems, setChannelItems] = useState([
    { label: 'WhatsApp', value: 'WHATSAPP' },
    { label: 'SMS', value: 'SMS' },
    ...(role === 'SUPER_ADMIN' ? [{ label: 'Print', value: 'PRINT' }] : []),
  ]);

  const [form, setForm] = useState<any>({
    authorityName: '', electionName: '', assemblyLabel: '', wardLabel: '',
    candidateName: '', candidateParty: '', candidateWardLabel: '', voteDate: '13-MAY-2024',
    voteTime: '7.00AM-6.00PM', socialLink: '', boothLocationLink: '',
    enabled: false, bannerUrl: '', showLogo: true,
  });

  const loadActivatedWards = async (asm: string) => {
    try {
      const res = await CRUDAPI.fetchActivatedWards(asm);
      const raw = res?.data?.result || res?.result || [];
      setActivatedWards(Array.isArray(raw) ? raw.filter((w: any) => w.wardLabel && String(w.wardLabel).trim() !== '') : []);
    } catch {
      setActivatedWards([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const code = await getAssemblyCode();
        if (canSwitchAssembly) {
          const res = await CRUDAPI.fetchVolunteerDropdown('ASSEMBLY');
          const raw = Array.isArray(res) ? res : (res?.data?.result || res?.result || []);
          const formatted = raw.map((item: any) => ({
            label: (item.name && !item.name.includes(String(item.id))) ? `${item.name} (${item.id})` : (item.name || `Assembly ${item.id}`),
            value: String(item.id),
          }));
          setAssemblies(formatted);
          setAssemblyItems(formatted);
          const initAsm = formatted.find((a: any) => a.value === String(code))?.value || formatted[0]?.value || String(code);
          setAssemblyId(initAsm);
        } else {
          setAssemblyId(String(code));
          setAssemblyItems([]);
        }
      } catch {
        const code = await getAssemblyCode();
        setAssemblyId(String(code));
        setAssemblyItems([{ label: String(code), value: String(code) }]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [canSwitchAssembly]);

  useEffect(() => {
    const loadWards = async () => {
      if (!assemblyId) return;
      try {
        const res = await CRUDAPI.fetchWards(assemblyId);
        const raw = Array.isArray(res) ? res : (res?.data?.result || res?.result || res?.data || []);
        const list = (Array.isArray(raw) ? raw : []).map((w: any) => ({
          label: (w.wardNameEn || w.wardName || `Ward ${w.wardId || w.id}`) + (w.wardNo ? ` - ${w.wardNo}` : ''),
          value: String(w.wardId || w.id),
        }));
        const withGlobal = isAdmin ? [{ label: 'All Wards (Global)', value: 'GLOBAL' }, ...list] : list;
        setWards(withGlobal);
        setWardItems(withGlobal);
        await loadActivatedWards(assemblyId);
      } catch {
        setWards([]);
        setWardItems([]);
      }
    };
    loadWards();
  }, [assemblyId, isAdmin]);

  const loadTemplate = async (wardId: string, ch = channel) => {
    setLoading(true);
    setFeedback({ error: '', success: '' });
    try {
      const apiWard = wardId === 'GLOBAL' ? null : wardId;
      const res = await CRUDAPI.fetchMessageTemplate(apiWard as any, ch);
      const data = res?.data?.result || res?.result || res?.data;
      if (data) {
        setForm((prev: any) => ({ ...prev, ...data }));
      } else {
        setForm((prev: any) => ({
          ...prev,
          authorityName: '', electionName: '', assemblyLabel: '', wardLabel: '',
          candidateName: '', candidateParty: '', candidateWardLabel: '',
          voteDate: '13-MAY-2024', voteTime: '7.00AM-6.00PM', socialLink: '', boothLocationLink: '', enabled: false,
        }));
      }
    } catch {
      setFeedback({ error: 'Failed to load template.', success: '' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWard?.value) {
      loadTemplate(selectedWard.value, channel);
    }
  }, [selectedWard?.value, channel]);

  const saveTemplate = async () => {
    if (!isAdmin) return;
    if (!selectedWard?.value) {
      setFeedback({ error: 'Please select a ward first.', success: '' });
      return;
    }
    setSaving(true);
    setFeedback({ error: '', success: '' });
    try {
      const wardId = selectedWard.value === 'GLOBAL' ? null : selectedWard.value;
      await CRUDAPI.saveMessageTemplate({ ...form, wardId, channel });
      setFeedback({ error: '', success: 'Template saved successfully.' });
      await loadActivatedWards(assemblyId);
    } catch {
      setFeedback({ error: 'Failed to save template.', success: '' });
    } finally {
      setSaving(false);
    }
  };

  const deactivateGlobal = async (ch: string) => {
    try {
      await CRUDAPI.deactivateAllTemplates(ch);
      setFeedback({ error: '', success: `Deactivated global ${ch}.` });
      await loadActivatedWards(assemblyId);
    } catch {
      setFeedback({ error: `Failed to deactivate global ${ch}.`, success: '' });
    }
  };

  const activatedForChannel = useMemo(() => activatedWards.filter((w: any) => String(w.channel).toUpperCase() === channel), [activatedWards, channel]);

  return (
    <View className="flex-1 bg-[#EEF3FB]">
      <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="bg-white border border-[#d8e3f3] rounded-2xl p-4">
          <Text className="text-slate-900 font-black text-[20px] mb-1">WhatsApp / SMS Promotions</Text>
          <Text className="text-slate-500 text-[13px] mb-4">Configure ward-wise message templates. WhatsApp/SMS should be enabled only after latest voter data upload.</Text>

          {loading ? <ActivityIndicator size="large" color="#2563eb" /> : null}
          {feedback.error ? <Text className="text-red-600 text-[12px] mb-2">{feedback.error}</Text> : null}
          {feedback.success ? <Text className="text-green-700 text-[12px] mb-2">{feedback.success}</Text> : null}

          {canSwitchAssembly ? (
            <View className="z-30 mb-3">
              <Text className="text-slate-600 mb-1 font-semibold text-[12px]">Select Assembly</Text>
              <AppDropdown
                value={assemblyId}
                items={assemblyItems}
                onChange={setAssemblyId}
              />
            </View>
          ) : null}
          <View className="z-20 mb-3">
            <Text className="text-slate-600 mb-1 font-semibold text-[12px]">Select Ward</Text>
            <AppDropdown
              value={selectedWard?.value || null}
              items={wardItems}
              onChange={(val) => {
                const ward = wards.find((w: any) => w.value === val) || null;
                setSelectedWard(ward);
              }}
              placeholder="Select Ward"
            />
          </View>
          <View className="z-10 mb-4">
            <Text className="text-slate-600 mb-1 font-semibold text-[12px]">Channel</Text>
            <AppDropdown
              value={channel}
              items={channelItems}
              onChange={setChannel}
            />
          </View>

          {isAdmin && !selectedWard ? (
            <View className="mb-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <Text className="text-blue-900 font-bold text-[15px]">Assembly Master Control</Text>
              <Text className="text-blue-700 mt-1 text-[12px]">Quickly enable or disable messaging for all wards in this assembly.</Text>
              <TouchableOpacity className="mt-3 border border-blue-200 rounded-xl bg-white px-4 py-3" onPress={() => setChannel('WHATSAPP')}>
                <Text className="text-slate-900 font-bold text-[14px]">WhatsApp Global</Text>
              </TouchableOpacity>
              <TouchableOpacity className="mt-1" onPress={() => deactivateGlobal('WHATSAPP')}>
                <Text className="text-red-600 font-bold text-right text-[12px]">Deactivate Global WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity className="mt-3 border border-blue-200 rounded-xl bg-white px-4 py-3" onPress={() => setChannel('SMS')}>
                <Text className="text-slate-900 font-bold text-[14px]">SMS Global</Text>
              </TouchableOpacity>
              <TouchableOpacity className="mt-1" onPress={() => deactivateGlobal('SMS')}>
                <Text className="text-red-600 font-bold text-right text-[12px]">Deactivate Global SMS</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {selectedWard ? (
            <>
              <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3 mb-2 text-[12px]" placeholder="Authority Name" value={form.authorityName || ''} onChangeText={(v) => setForm((p: any) => ({ ...p, authorityName: v }))} />
              <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3 mb-2 text-[12px]" placeholder="Election Name" value={form.electionName || ''} onChangeText={(v) => setForm((p: any) => ({ ...p, electionName: v }))} />
              <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3 mb-2 text-[12px]" placeholder="Candidate Name" value={form.candidateName || ''} onChangeText={(v) => setForm((p: any) => ({ ...p, candidateName: v }))} />
              <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3 mb-2 text-[12px]" placeholder="Candidate Party" value={form.candidateParty || ''} onChangeText={(v) => setForm((p: any) => ({ ...p, candidateParty: v }))} />
              <TextInput className="border border-slate-300 bg-white rounded-xl px-4 py-3 mb-2 text-[12px]" placeholder="Booth Location Link" value={form.boothLocationLink || ''} onChangeText={(v) => setForm((p: any) => ({ ...p, boothLocationLink: v }))} />

              <TouchableOpacity className={`mt-2 rounded-xl py-3 ${saving ? 'bg-slate-400' : 'bg-blue-600'}`} disabled={saving} onPress={saveTemplate}>
                <Text className="text-center text-white font-bold text-[13px]">{saving ? 'Saving...' : 'Save Template'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View className="border border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50">
              <Text className="text-slate-500 text-[12px]">Please select a ward to configure its templates.</Text>
            </View>
          )}

          <View className="mt-6 border-t border-slate-100 pt-4">
            <Text className="text-slate-800 font-bold text-[14px] mb-2">Activated Wards ({channel})</Text>
            {activatedForChannel.length === 0 ? <Text className="text-slate-400 text-[12px]">No wards activated yet.</Text> : null}
            <View className="flex-row flex-wrap">
              {activatedForChannel.map((aw: any, idx: number) => (
                <View key={`${String(aw?.channel || "channel")}-${String(aw?.wardId || aw?.wardLabel || "global")}-${idx}`} className="mr-2 mb-2 px-3 py-1.5 rounded-full border bg-blue-50 border-blue-200">
                  <Text className="text-blue-700 text-[11px] font-bold">{aw.wardLabel || (aw.wardId ? `Ward ${aw.wardId}` : 'Global')}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
