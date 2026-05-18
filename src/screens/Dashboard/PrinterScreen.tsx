import React, { useState, useEffect, useContext } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CRUDAPI, getAssemblyCode } from "../../apis/Api";
import { AuthContext } from "../../context/AuthContext";
import { PrinterHelper } from "../../components/PrinterHelper";
import DropDownPicker from "react-native-dropdown-picker";

export default function PrinterScreen() {
    const { userInfo } = useContext(AuthContext);
    const [printers, setPrinters] = useState([]);
    const [connectedPrinter, setConnectedPrinter] = useState(null);
    const [scanStatus, setScanStatus] = useState('');
    const [scanError, setScanError] = useState('');

    // Ward / Booth / Voter state
    const [wards, setWards] = useState([]);
    const [selectedWard, setSelectedWard] = useState('');
    const [booths, setBooths] = useState([]);
    const [selectedBooth, setSelectedBooth] = useState('');
    const [voters, setVoters] = useState([]);
    const [loadingVoters, setLoadingVoters] = useState(false);
    const [printingIdx, setPrintingIdx] = useState(-1);
    const [printTemplate, setPrintTemplate] = useState(null);
    const [templateLoading, setTemplateLoading] = useState(false);
    const [assemblyCode, setAssemblyCode] = useState('');
    const [openAssembly, setOpenAssembly] = useState(false);
    const [assemblyItems, setAssemblyItems] = useState<any[]>([]);

    useEffect(() => {
        const init = async () => {
            const code = await getAssemblyCode();
            setAssemblyCode(code);
            try {
                const dropdownResp = await CRUDAPI.getAssemblyDropdown();
                const payload = dropdownResp?.data?.result || dropdownResp?.result || dropdownResp?.data || [];
                const items = Array.isArray(payload)
                    ? payload.map((a: any) => ({
                        label: a?.name || a?.label || a?.assemblyName || `${a?.code || a?.assemblyCode || ''}`,
                        value: String(a?.code || a?.assemblyCode || a?.id || code),
                    }))
                    : [];
                setAssemblyItems(items.length ? items : [{ label: String(code), value: String(code) }]);
            } catch {
                setAssemblyItems([{ label: String(code), value: String(code) }]);
            }
            loadWards(code);

            const saved = await AsyncStorage.getItem('connectedPrinter');
            if (saved) setConnectedPrinter(JSON.parse(saved));
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
            setWards(list);
        } catch (err) {
            console.error('Failed to load wards:', err);
        }
    };

    // Fetch template and booths when ward changes
    useEffect(() => {
        if (!selectedWard) {
            setPrintTemplate(null);
            setBooths([]);
            return;
        }

        setTemplateLoading(true);
        CRUDAPI.fetchMessageTemplate(selectedWard, 'PRINT').then((res) => {
            setPrintTemplate(res?.data?.result || res?.result || res || {});
        }).catch(() => setPrintTemplate(null)).finally(() => setTemplateLoading(false));

        CRUDAPI.fetchBooths(assemblyCode, selectedWard).then((res) => {
            const list = (res?.data?.result || res?.result || res || []).map(b => ({
                label: `#${b.boothNo} - ${b.boothNameEn || b.nameEn || 'Booth'}`,
                value: String(b.boothId || b.id),
                ...b
            }));
            setBooths(list);
        }).catch(() => setBooths([]));

        setSelectedBooth('');
        setVoters([]);
    }, [selectedWard]);

    // Fetch voters when booth changes
    useEffect(() => {
        if (!selectedBooth) {
            setVoters([]);
            return;
        }
        setLoadingVoters(true);
        CRUDAPI.fetchBoothVoters(selectedBooth).then((res) => {
            setVoters(res?.data?.result?.voters || res?.result?.voters || res?.voters || []);
        }).catch(() => setVoters([])).finally(() => setLoadingVoters(false));
    }, [selectedBooth]);

    const handleScanPrinters = () => {
        setScanError('');
        setScanStatus('Searching for Bluetooth printers...');
        // Mocking scan for now as native BLE library is required
        setScanStatus('Mock: Scanning for printers...');
        setTimeout(() => {
            setPrinters([
                { id: '00:11:22:33:44:55', name: 'Thermal Printer A' },
                { id: '66:77:88:99:AA:BB', name: 'Z-Printer' }
            ]);
            setScanStatus('Found 2 devices.');
        }, 1500);
    };

    const handleConnect = async (printer) => {
        if (connectedPrinter?.id === printer.id) {
            setConnectedPrinter(null);
            await AsyncStorage.removeItem('connectedPrinter');
            setScanStatus('Disconnected.');
            return;
        }
        setConnectedPrinter(printer);
        await AsyncStorage.setItem('connectedPrinter', JSON.stringify(printer));
        setScanStatus(`Connected to ${printer.name}`);
    };

    const performPrint = async (text) => {
        const success = await PrinterHelper.performPrint(connectedPrinter, text);
        if (success) {
            // Alert already handled in helper or here
        }
    };

    return (
        <View className="flex-1 bg-[#F4F3FF]">
            <ScrollView className="px-4 pt-6">
                <View className="bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-3 z-40">
                    <Text className="text-slate-500 text-xs font-bold mb-1">CONTEXT</Text>
                    <DropDownPicker
                        open={openAssembly}
                        value={assemblyCode}
                        items={assemblyItems}
                        setOpen={setOpenAssembly}
                        setValue={setAssemblyCode}
                        setItems={setAssemblyItems}
                        style={{ borderColor: '#CBD5E1', minHeight: 46 }}
                        dropDownContainerStyle={{ borderColor: '#CBD5E1' }}
                        textStyle={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}
                    />
                </View>
                <LinearGradient colors={["#0C7BB3", "#0796A1"]} className="rounded-2xl p-4 mb-5">
                    <View className="flex-row items-center justify-between">
                        <View>
                            <View className="flex-row items-center mb-1">
                                <View className={`h-3 w-3 ${connectedPrinter ? 'bg-green-500' : 'bg-gray-400'} rounded-full mr-2`} />
                                <Text className="font-semibold text-white">
                                    {connectedPrinter ? 'Ready to Print' : 'Not Connected'}
                                </Text>
                            </View>
                            <Text className="text-white text-xs">
                                {connectedPrinter ? connectedPrinter.name : 'Scan for printers'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleScanPrinters}
                            className="bg-white px-4 py-2 rounded-full shadow-sm"
                        >
                            <Text className="text-blue-600 font-semibold text-xs">Scan Printers</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {scanStatus ? <Text className="text-blue-600 text-xs mb-3 text-center italic">{scanStatus}</Text> : null}

                {/* Printer List */}
                {printers.length > 0 && !connectedPrinter && (
                    <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                        <Text className="text-gray-800 font-bold mb-3">Available Printers</Text>
                        {printers.map((p, printerIndex) => (
                            <TouchableOpacity
                                key={`${String(p?.id || p?.name || "printer")}-${printerIndex}`}
                                onPress={() => handleConnect(p)}
                                className="flex-row justify-between items-center py-3 border-b border-gray-100"
                            >
                                <View>
                                    <Text className="text-gray-700 font-medium">{p.name}</Text>
                                    <Text className="text-gray-400 text-[10px]">{p.id}</Text>
                                </View>
                                <Icon name="bluetooth" size={18} color="#0C7BB3" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Selection Logic */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <Text className="text-gray-800 font-bold mb-3">Election Context</Text>

                    <View className="mb-3">
                        <Text className="text-gray-500 text-xs mb-1">Select Ward</Text>
                        <View className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Fallback to simple select logic if Picker is not available */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-2">
                                {wards.map((w, wardIndex) => (
                                    <TouchableOpacity
                                        key={`${String(w?.value || w?.label || "ward")}-${wardIndex}`}
                                        onPress={() => setSelectedWard(w.value)}
                                        className={`px-3 py-1.5 rounded-full mr-2 ${selectedWard === w.value ? 'bg-blue-600' : 'bg-gray-100'}`}
                                    >
                                        <Text className={`text-xs ${selectedWard === w.value ? 'text-white' : 'text-gray-600'}`}>{w.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {selectedWard ? (
                        <View className="mb-3">
                            <Text className="text-gray-500 text-xs mb-1">Select Booth</Text>
                            <View className="border border-gray-200 rounded-lg overflow-hidden">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-2">
                                    {booths.map((b, boothIndex) => (
                                        <TouchableOpacity
                                            key={`${String(b?.value || b?.label || "booth")}-${boothIndex}`}
                                            onPress={() => setSelectedBooth(b.value)}
                                            className={`px-3 py-1.5 rounded-full mr-2 ${selectedBooth === b.value ? 'bg-blue-600' : 'bg-gray-100'}`}
                                        >
                                            <Text className={`text-xs ${selectedBooth === b.value ? 'text-white' : 'text-gray-600'}`}>{b.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    ) : null}

                    {printTemplate && (
                        <View className="bg-green-50 p-2 rounded-lg mt-2">
                            <Text className="text-green-700 text-[10px] font-bold">✓ Template: {printTemplate.electionName || 'Loaded'}</Text>
                        </View>
                    )}
                </View>

                {/* Search Voter */}
                {loadingVoters ? <ActivityIndicator className="mt-4" /> : (
                    voters.map((v, i) => (
                        <View key={`${String(v?.epicNo || v?.voterId || v?.serialNo || "voter")}-${i}`} className="bg-white rounded-xl p-4 mb-3 border border-gray-100 flex-row justify-between items-center">
                            <View className="flex-1">
                                <Text className="font-bold text-gray-800">{v.firstMiddleNameEn || v.name}</Text>
                                <Text className="text-gray-500 text-xs">Sl: {v.serialNo} · {v.epicNo}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => performPrint(PrinterHelper.formatVoterSlip(v, booths.find(b => b.value === selectedBooth), printTemplate))}
                                className="bg-blue-600 px-4 py-2 rounded-lg"
                            >
                                <Text className="text-white text-xs font-bold">Print</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                <View className="h-20" />
            </ScrollView>

            <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
                <TouchableOpacity
                    onPress={() => performPrint("TEST PRINT SUCCESSFUL\n")}
                    className="bg-gray-100 py-4 rounded-xl mb-2"
                >
                    <Text className="text-center text-gray-700 font-bold">Test 1 Line</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => connectedPrinter ? setConnectedPrinter(null) : handleScanPrinters()}
                    className={`${connectedPrinter ? 'bg-red-500' : 'bg-blue-600'} py-4 rounded-xl`}
                >
                    <Text className="text-center text-white font-bold">
                        {connectedPrinter ? 'Disconnect Printer' : 'Search Printers'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
