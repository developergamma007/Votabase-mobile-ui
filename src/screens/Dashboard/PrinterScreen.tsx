import React, { useState, useEffect, useContext } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CRUDAPI, getAssemblyCode } from "../../apis/Api";
import { AuthContext } from "../../context/AuthContext";
import { PrinterHelper } from "../../components/PrinterHelper";
import DropDownPicker from "react-native-dropdown-picker";
import FeatureComingSoon, { isVotabaseSuperAdmin } from "../../components/FeatureComingSoon";

export default function PrinterScreen() {
    const { userInfo } = useContext(AuthContext) as any;
    const [printers, setPrinters] = useState([]);
    const [connectedPrinter, setConnectedPrinter] = useState<any>(null);
    const [scanStatus, setScanStatus] = useState('');
    const [scanError, setScanError] = useState('');

    // Ward / Booth / Voter state
    const [wards, setWards] = useState<any[]>([]);
    const [selectedWard, setSelectedWard] = useState(null);
    const [openWard, setOpenWard] = useState(false); // for dropdown
    const [booths, setBooths] = useState<any[]>([]);
    const [selectedBooth, setSelectedBooth] = useState('');
    const [voters, setVoters] = useState<any[]>([]);
    const [loadingVoters, setLoadingVoters] = useState(false);
    const [printTemplate, setPrintTemplate] = useState<any>(null);
    const [templateLoading, setTemplateLoading] = useState(false);
    
    // Context
    const [assemblyCode, setAssemblyCode] = useState('');
    const [openAssembly, setOpenAssembly] = useState(false);
    const [assemblyItems, setAssemblyItems] = useState<any[]>([]);

    useEffect(() => {
        const init = async () => {
            const code = await getAssemblyCode();
            setAssemblyCode(code);
            try {
                const dropdownResp = await (CRUDAPI as any).getAssemblyDropdown();
                const payload = dropdownResp?.data?.result || dropdownResp?.result || dropdownResp?.data || [];
                const items = Array.isArray(payload)
                    ? payload.map((a: any) => ({
                        label: a?.name || a?.label || a?.assemblyName || `${a?.code || a?.assemblyCode || ''}`,
                        value: a?.code || a?.assemblyCode || String(a?.id || code),
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

    const loadWards = async (code: string) => {
        try {
            const res = await (CRUDAPI as any).fetchWards(code);
            const list = (res?.data?.result || res?.result || res || []).map((w: any) => ({
                label: w.wardNameEn || `Ward ${w.wardId}`,
                value: String(w.wardId),
            })).sort((a: any, b: any) => a.label.localeCompare(b.label));
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
        (CRUDAPI as any).fetchMessageTemplate(selectedWard, 'PRINT').then((res: any) => {
            setPrintTemplate(res?.data?.result || res?.result || res || {});
        }).catch(() => setPrintTemplate(null)).finally(() => setTemplateLoading(false));

        (CRUDAPI as any).fetchBooths(assemblyCode, selectedWard).then((res: any) => {
            const list = (res?.data?.result || res?.result || res || []).map((b: any) => ({
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
        (CRUDAPI as any).fetchBoothVoters(selectedBooth).then((res: any) => {
            setVoters(res?.data?.result || res?.result || []);
        }).catch(() => setVoters([])).finally(() => setLoadingVoters(false));
    }, [selectedBooth]);

    const handleScanPrinters = async () => {
        setScanStatus('Scanning for BLE devices...');
        setScanError('');
        try {
            const devices = await PrinterHelper.scanForPrinters();
            setPrinters(devices as any);
            setScanStatus(devices.length ? `Found ${devices.length} devices.` : 'No devices found.');
        } catch (e: any) {
            setScanError(e.message || 'Bluetooth scan failed.');
            setScanStatus('');
        }
    };

    const handleConnect = async (printer: any) => {
        setScanStatus(`Connecting to ${printer.name}...`);
        try {
            await PrinterHelper.connectPrinter(printer);
            setConnectedPrinter(printer);
            await AsyncStorage.setItem('connectedPrinter', JSON.stringify(printer));
            setScanStatus('Connected successfully.');
        } catch (e: any) {
            Alert.alert("Connection Failed", e.message);
            setScanStatus('');
        }
    };

    const performPrint = async (content: string) => {
        if (!connectedPrinter) {
            Alert.alert("Not Connected", "Please connect a thermal printer first.");
            return;
        }
        try {
            await PrinterHelper.printText(content);
        } catch (e: any) {
            Alert.alert("Print Error", e.message || "Failed to communicate with printer.");
        }
    };

    if (!isVotabaseSuperAdmin(userInfo)) {
        return <FeatureComingSoon />;
    }

    return (
        <View className="flex-1 bg-slate-50">
            <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
                
                {/* Context Assembly Dropdown */}
                <View className="z-50 mb-3" style={{ paddingHorizontal: 2 }}>
                    <DropDownPicker
                        open={openAssembly}
                        value={assemblyCode}
                        items={assemblyItems}
                        setOpen={setOpenAssembly}
                        setValue={setAssemblyCode}
                        setItems={setAssemblyItems}
                        onOpen={() => setOpenWard(false)}
                        placeholder="Select Context..."
                        style={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12, minHeight: 46 }}
                        dropDownContainerStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 12 }}
                        textStyle={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}
                        placeholderStyle={{ color: '#94A3B8' }}
                        zIndex={2000}
                        zIndexInverse={1000}
                    />
                </View>

                {/* Main Unified Web-Like Card */}
                <View style={{ backgroundColor: '#ffffff', borderRadius: 16, borderColor: '#e2e8f0', borderWidth: 1, overflow: 'hidden', marginBottom: 24, elevation: 1, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
                    
                    {/* Header Banner */}
                    <View style={{ padding: 16, paddingBottom: 0 }}>
                        <LinearGradient 
                            colors={["#EEF2FF", "#E0E7FF"]} 
                            start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                            style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                            <View style={{ flex: 1, paddingRight: 12 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 16, color: connectedPrinter ? '#15803d' : '#1e3a8a', marginBottom: 2 }}>
                                    {connectedPrinter ? 'Connected' : 'Not Connected'}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500' }}>
                                    {connectedPrinter ? connectedPrinter.name : 'Search for nearby printers'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => connectedPrinter ? setConnectedPrinter(null) : handleScanPrinters()}
                                style={{ backgroundColor: connectedPrinter ? '#ef4444' : '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999, elevation: 2, shadowColor: connectedPrinter ? '#ef4444' : '#3b82f6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 }}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                                    {connectedPrinter ? 'Disconnect' : 'Scan'}
                                </Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>

                    {/* Printer List Section */}
                    <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, color: '#334155', fontWeight: '600' }}>Available Thermal Printers</Text>
                            <TouchableOpacity onPress={handleScanPrinters} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="refresh" size={14} color="#3b82f6" style={{ marginRight: 4 }} />
                                <Text style={{ fontSize: 12, color: '#3b82f6', fontWeight: '600' }}>Refresh List</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {scanStatus ? <Text style={{ color: '#2563eb', fontSize: 12, marginBottom: 12, textAlign: 'center', fontStyle: 'italic' }}>{scanStatus}</Text> : null}

                        {printers.length === 0 && !connectedPrinter ? (
                            <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 4, fontWeight: '500' }}>No paired printers found.</Text>
                                <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', fontWeight: '500' }}>
                                    Click <Text style={{ color: '#334155', fontWeight: 'bold' }}>Scan</Text> to pair a new one.
                                </Text>
                            </View>
                        ) : (
                            <View style={{ gap: 8 }}>
                                {printers.map((p: any, printerIndex) => (
                                    <TouchableOpacity
                                        key={`${String(p?.id || p?.name || "printer")}-${printerIndex}`}
                                        onPress={() => handleConnect(p)}
                                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#f1f5f9', backgroundColor: '#f8fafc' }}
                                    >
                                        <View>
                                            <Text style={{ color: '#334155', fontWeight: 'bold', fontSize: 14 }}>{p.name}</Text>
                                            <Text style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{p.id}</Text>
                                        </View>
                                        <Icon name="bluetooth" size={20} color="#3b82f6" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Ward / Election Template Section */}
                    <View style={{ padding: 16 }}>
                        <Text style={{ fontSize: 14, color: '#334155', fontWeight: '600', marginBottom: 12 }}>Ward / Election Template</Text>
                        
                        <DropDownPicker
                            open={openWard}
                            value={selectedWard}
                            items={wards}
                            setOpen={setOpenWard}
                            setValue={setSelectedWard}
                            onOpen={() => setOpenAssembly(false)}
                            placeholder="Select Ward..."
                            style={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 8, minHeight: 44 }}
                            dropDownContainerStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: 8 }}
                            textStyle={{ fontSize: 14, color: '#334155' }}
                            placeholderStyle={{ color: '#94A3B8' }}
                            listMode="SCROLLVIEW"
                            scrollViewProps={{ nestedScrollEnabled: true }}
                            zIndex={1000}
                            zIndexInverse={2000}
                        />

                        {printTemplate && (
                            <Text style={{ color: '#16a34a', fontSize: 11, fontWeight: 'bold', marginTop: 8 }}>
                                ✓ Template loaded successfully.
                            </Text>
                        )}

                        <Text style={{ color: '#94a3b8', fontSize: 11, fontStyle: 'italic', marginTop: 16, marginBottom: 16, lineHeight: 16 }}>
                            Note: BLE Print is experimental. If your printer reboots, use <Text style={{ fontWeight: 'bold' }}>System Print</Text> instead (requires pairing printer in OS settings).
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <TouchableOpacity
                                onPress={() => performPrint("BLE PRINT TEST\n")}
                                style={{ flex: 1, backgroundColor: '#8fa4f6', paddingVertical: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginRight: 6 }}
                            >
                                <Icon name="print" size={16} color="white" style={{ marginRight: 6 }} />
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>BLE Print</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => performPrint("TEST 1 LINE\n")}
                                style={{ flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginLeft: 6 }}
                            >
                                <Icon name="pencil" size={16} color="#10b981" style={{ marginRight: 6 }} />
                                <Text style={{ color: '#334155', fontWeight: 'bold', fontSize: 13 }}>Test 1 Line</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Booth and Voter Selection */}
                {selectedWard ? (
                    <View style={{ zIndex: 10, marginBottom: 32 }}>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>Select Booth</Text>
                            <View style={{ borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', elevation: 1, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: 12 }}>
                                    {booths.map((b: any, boothIndex) => (
                                        <TouchableOpacity
                                            key={`${String(b?.value || b?.label || "booth")}-${boothIndex}`}
                                            onPress={() => setSelectedBooth(b.value)}
                                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, marginRight: 8, borderWidth: 1, borderColor: selectedBooth === b.value ? '#4f46e5' : '#e2e8f0', backgroundColor: selectedBooth === b.value ? '#4f46e5' : '#f8fafc' }}
                                        >
                                            <Text style={{ fontSize: 13, fontWeight: '500', color: selectedBooth === b.value ? '#ffffff' : '#475569' }}>{b.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        {selectedBooth && (
                            <View>
                                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 }}>Voters in Booth</Text>
                                {loadingVoters ? <ActivityIndicator style={{ marginTop: 16 }} color="#4f46e5" /> : (
                                    voters.length === 0 ? (
                                        <Text style={{ color: '#94a3b8', textAlign: 'center', paddingVertical: 16 }}>No voters found.</Text>
                                    ) : voters.map((v: any, i) => (
                                        <View key={`${String(v?.epicNo || v?.voterId || v?.serialNo || "voter")}-${i}`} style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontWeight: 'bold', color: '#1e293b', fontSize: 15 }}>{v.firstMiddleNameEn || v.name}</Text>
                                                <Text style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Sl: {v.serialNo}  •  EPIC: {v.epicNo}</Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => performPrint(PrinterHelper.formatVoterSlip(v, booths.find((b: any) => b.value === selectedBooth), printTemplate))}
                                                style={{ backgroundColor: '#e0e7ff', borderWidth: 1, borderColor: '#c7d2fe', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                                            >
                                                <Text style={{ color: '#4f46e5', fontSize: 12, fontWeight: 'bold' }}>Print Slip</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}
                            </View>
                        )}
                    </View>
                ) : null}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}
