import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import DropDownPicker from "react-native-dropdown-picker";
import { AuthContext } from "../../context/AuthContext";
import { CRUDAPI, getAssemblyCode } from "../../apis/Api";
import { isProtectedVolunteerLogin } from "../../helpers/volunteerLoginHelpers";

export default function AddVolunteer() {
    const navigation = useNavigation();
    const route = useRoute();
    const { userInfo, setBanner } = useContext(AuthContext) as any;

    const [form, setForm] = useState({
        firstName: '',
        phone: '',
        workingLevel: 'ASSEMBLY',
        assemblyId: '',
        wardIds: [] as string[],
        boothIds: [] as string[],
    });

    const [assemblies, setAssemblies] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [booths, setBooths] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editPhone, setEditPhone] = useState('');

    // Dropdown visibility and search states
    const [openLevel, setOpenLevel] = useState(false);
    const [openAsm, setOpenAsm] = useState(false);
    const [openWard, setOpenWard] = useState(false);
    const [openBooth, setOpenBooth] = useState(false);
    const [searchWard, setSearchWard] = useState('');
    const [searchBooth, setSearchBooth] = useState('');

    const pendingEditRef = useRef<any>(null);
    const prevWorkingLevelRef = useRef<string | null>(null);
    const prevAssemblyRef = useRef<string | null>(null);

    const accessWardIds = useMemo(() => {
        const ids: string[] = [];
        if (Array.isArray(userInfo?.wardIds)) {
            userInfo.wardIds.forEach((id: any) => {
                if (id != null && String(id).trim() !== '') ids.push(String(id).trim());
            });
        }
        const assignmentType = String(userInfo?.assignmentType || userInfo?.assignment_type || '').toUpperCase();
        if (assignmentType === 'WARD' && userInfo?.assignmentId) {
            String(userInfo.assignmentId)
                .split(',')
                .map((id: string) => id.trim())
                .filter(Boolean)
                .forEach((id: string) => ids.push(id));
        }
        return Array.from(new Set(ids));
    }, [userInfo]);

    const [resolvedAssemblyId, setResolvedAssemblyId] = useState('');

    const creatorRole = useMemo(() => {
        const r = String(userInfo?.role || '').replace('ROLE_', '').toUpperCase();
        const assignmentType = String(userInfo?.assignmentType || userInfo?.assignment_type || '').toUpperCase();
        if (r === 'SUPER_ADMIN' || r === 'ADMIN') return r;
        if (assignmentType === 'ASSEMBLY' || assignmentType === 'WARD') return assignmentType;
        return r;
    }, [userInfo]);

    const creatorAssemblyId = useMemo(() => {
        if (resolvedAssemblyId) return resolvedAssemblyId;
        const fromList = userInfo?.assemblyIds?.[0] ?? userInfo?.assemblyId ?? userInfo?.assembly_id;
        if (fromList != null && String(fromList).trim() !== '') return String(fromList);
        if (creatorRole === 'ASSEMBLY' && userInfo?.assignmentId) {
            return String(userInfo.assignmentId).split(',')[0].trim();
        }
        if (creatorRole === 'SUPER_ADMIN' || creatorRole === 'ADMIN') {
            return getAssemblyCode() || '';
        }
        return '';
    }, [userInfo, creatorRole, resolvedAssemblyId]);

    const levelOptions = useMemo(() => {
        const all = [
            { label: 'Assembly', value: 'ASSEMBLY' },
            { label: 'Ward', value: 'WARD' },
            { label: 'Booth', value: 'BOOTH' },
        ];
        if (creatorRole === 'ASSEMBLY') return all.filter((item) => item.value !== 'ASSEMBLY');
        if (creatorRole === 'WARD') return all.filter((item) => item.value === 'BOOTH');
        return all;
    }, [creatorRole]);

    const lockAssemblyPicker = creatorRole === 'ASSEMBLY' || creatorRole === 'WARD';

    // Load edit data if provided in params or AsyncStorage
    useEffect(() => {
        const checkEdit = async () => {
            const params: any = route.params;
            let volunteerData = params?.volunteer ?? params?.editVolunteer;
            
            if (!volunteerData) {
                const raw = await AsyncStorage.getItem('volunteerEdit');
                if (raw) {
                    try { volunteerData = JSON.parse(raw); } catch { }
                }
            }

            if (volunteerData) {
                pendingEditRef.current = volunteerData;
                setForm({
                    firstName: volunteerData.firstName || '',
                    phone: volunteerData.phone || '',
                    workingLevel: volunteerData.workingLevel || 'ASSEMBLY',
                    assemblyId: volunteerData.assemblyId || '',
                    wardIds: [],
                    boothIds: [],
                });
                setIsEditing(true);
                setEditPhone(volunteerData.phone || '');
            }
        };
        checkEdit();
    }, [route.params]);

    useEffect(() => {
        if (pendingEditRef.current || isEditing) return;
        if (creatorRole === 'WARD' && form.workingLevel !== 'BOOTH') {
            setForm((prev) => ({ ...prev, workingLevel: 'BOOTH', wardIds: [], boothIds: [] }));
        } else if (creatorRole === 'ASSEMBLY' && form.workingLevel === 'ASSEMBLY') {
            setForm((prev) => ({ ...prev, workingLevel: 'WARD', wardIds: [], boothIds: [] }));
        }
    }, [creatorRole, isEditing, form.workingLevel]);

    useEffect(() => {
        if (!creatorAssemblyId || pendingEditRef.current) return;
        if (creatorRole === 'ASSEMBLY' || creatorRole === 'WARD') {
            setForm((prev) => (
                prev.assemblyId && String(prev.assemblyId) === String(creatorAssemblyId)
                    ? prev
                    : { ...prev, assemblyId: String(creatorAssemblyId) }
            ));
        }
    }, [creatorRole, creatorAssemblyId]);

    useEffect(() => {
        const fromProfile = userInfo?.assemblyIds?.[0] ?? userInfo?.assemblyId ?? userInfo?.assembly_id;
        if (fromProfile != null && String(fromProfile).trim() !== '') {
            setResolvedAssemblyId(String(fromProfile));
            return;
        }
        if (creatorRole !== 'WARD' && creatorRole !== 'ASSEMBLY') return;
        if (!accessWardIds.length) return;

        let cancelled = false;
        CRUDAPI.fetchWards().then((res: any) => {
            if (cancelled) return;
            const raw = Array.isArray(res) ? res : (res?.data?.result || res?.result || res?.wards || []);
            const wardSet = new Set(accessWardIds.map(String));
            const match = raw.find((item: any) => {
                const id = item.wardId ?? item.ward_id ?? item.id;
                return wardSet.has(String(id));
            });
            const asm = match?.assemblyId ?? match?.assembly_id ?? match?.assemblyNo ?? match?.assembly_no;
            if (asm != null && String(asm).trim() !== '') {
                setResolvedAssemblyId(String(asm));
            }
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [userInfo, creatorRole, accessWardIds]);

    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const res = await CRUDAPI.getAssemblyDropdown();
                const raw = res?.data?.result || [];
                const formatted = raw.map((item: any) => ({
                    value: String(item.id),
                    label: (item.name && !item.name.toLowerCase().includes('assembly') && !item.name.includes(String(item.id)))
                        ? `${item.name} (${item.id})`
                        : (item.name || `Assembly ${item.id}`),
                }));
                setAssemblies(formatted);
            } catch (err) {
                console.log("Failed to fetch assemblies", err);
            }
        };
        fetchDropdowns();
    }, []);

    // Working Level change logic
    useEffect(() => {
        if (pendingEditRef.current) return;
        if (prevWorkingLevelRef.current !== null && prevWorkingLevelRef.current !== form.workingLevel) {
            const keepAssembly = (creatorRole === 'ASSEMBLY' || creatorRole === 'WARD') && creatorAssemblyId;
            setForm((prev) => ({
                ...prev,
                assemblyId: keepAssembly ? String(creatorAssemblyId) : '',
                wardIds: [],
                boothIds: [],
            }));
            setWards([]);
            setBooths([]);
            prevAssemblyRef.current = keepAssembly ? String(creatorAssemblyId) : null;
        }
        prevWorkingLevelRef.current = form.workingLevel;
    }, [form.workingLevel]);

    // Load Wards
    useEffect(() => {
        if (!['ASSEMBLY', 'WARD', 'BOOTH'].includes(form.workingLevel)) return;
        if (!form.assemblyId) {
            setWards([]);
            if (!pendingEditRef.current) setForm((prev) => ({ ...prev, wardIds: [], boothIds: [] }));
            return;
        }
        
        const loadWards = async () => {
            try {
                const res = await CRUDAPI.fetchWards(form.assemblyId);
                let raw = Array.isArray(res) ? res : (res?.data?.result || res?.result || res?.wards || []);
                
                // Ensure raw is only wards (wards usually don't have boothId)
                if (Array.isArray(raw)) {
                    raw = raw.filter((item: any) => (item.wardId || item.ward_id) && !(item.boothId || item.booth_id));
                }

                let list = raw.map((item: any) => {
                    const id = item.wardId ?? item.ward_id ?? item.id;
                    const name = item.wardNameEn ?? item.ward_name_en ?? item.wardNameLocal ?? item.name_en ?? item.name ?? `Ward ${id}`;
                    return { value: String(id), label: name };
                });

                if (accessWardIds.length) {
                    list = list.filter((item: any) => accessWardIds.includes(String(item.value)));
                }

                if (list.length > 0) {
                    setWards([{ label: 'All Wards', value: '__ALL__' }, ...list]);
                } else {
                    setWards([]);
                }

                if (pendingEditRef.current) {
                    const pending = pendingEditRef.current;
                    const pendingWards = (pending.wardIds || []).map(String);
                    setForm(prev => ({ ...prev, wardIds: pendingWards }));
                    
                    if (pendingWards.length > 0) {
                        const boothResponses = await Promise.all(
                            pendingWards.map((wId: any) => CRUDAPI.fetchBooths(null, wId).catch(() => []))
                        );
                        const merged = boothResponses.flatMap((br: any) => {
                            const data = Array.isArray(br) ? br : (br?.data?.result || br?.result || br);
                            return Array.isArray(data) ? data : [];
                        }).map((item: any) => {
                            const bId = item.boothId ?? item.booth_id ?? item.id;
                            const bNo = item.boothNo || item.booth_no || '';
                            const bName = item.pollingStationAdrEn || item.boothNameEn || item.booth_add_en || `Booth ${bId}`;
                            return { value: String(bId), label: `${bNo ? bNo + ' - ' : ''}${bName}` };
                        });
                        const unique = Array.from(new Map(merged.map(m => [m.value, m])).values());
                        
                        if (unique.length > 0) {
                            setBooths([{ label: '-- ALL BOOTHS --', value: '__ALL__' }, ...unique]);
                        } else {
                            setBooths([]);
                        }
                        
                        setForm(prev => ({ ...prev, boothIds: (pending.boothIds || []).map(String) }));
                        pendingEditRef.current = null;
                    } else {
                        pendingEditRef.current = null;
                    }
                } else if (creatorRole === 'WARD' && accessWardIds.length) {
                    const validWardIds = accessWardIds.filter((id) => list.some((item: any) => String(item.value) === String(id)));
                    if (validWardIds.length) {
                        setForm((prev) => ({ ...prev, wardIds: validWardIds, boothIds: [] }));
                    }
                }
            } catch (err) {
                console.log("Wards load error", err);
                setWards([]);
            }
        };
        loadWards();
    }, [form.workingLevel, form.assemblyId, creatorRole, accessWardIds]);

    // Load Booths
    useEffect(() => {
        if (pendingEditRef.current) return;
        
        // If "All Wards" is selected, we could either fetch all booths for all wards or just handle it as ALL
        const isAllWards = form.wardIds.includes('__ALL__');
        const effectiveWardIds = isAllWards ? wards.filter(w => w.value !== '__ALL__').map(w => w.value) : form.wardIds;

        if (!effectiveWardIds.length) {
            setBooths([]);
            setForm(prev => ({ ...prev, boothIds: [] }));
            return;
        }

        const loadBooths = async () => {
            try {
                const responses = await Promise.all(
                    effectiveWardIds.map(wId => CRUDAPI.fetchBooths(null, wId).catch(() => []))
                );
                const merged = responses.flatMap((br: any) => {
                    const data = Array.isArray(br) ? br : (br?.data?.result || br?.result || br);
                    return Array.isArray(data) ? data : [];
                }).map((item: any) => {
                    const bId = item.boothId ?? item.booth_id ?? item.id;
                    const bNo = item.boothNo || item.booth_no || '';
                    const bName = item.pollingStationAdrEn || item.boothNameEn || item.booth_add_en || `Booth ${bId}`;
                    return { value: String(bId), label: `${bNo ? bNo + ' - ' : ''}${bName}` };
                });
                const unique = Array.from(new Map(merged.map(m => [m.value, m])).values());
                
                if (unique.length > 0) {
                    setBooths([{ label: 'All Booths', value: '__ALL__' }, ...unique]);
                } else {
                    setBooths([]);
                }
            } catch (err) {
                console.log("Booths load error", err);
                setBooths([]);
            }
        };
        loadBooths();
    }, [form.wardIds]);

    useEffect(() => {
        if (creatorRole !== 'WARD' || form.workingLevel !== 'BOOTH' || pendingEditRef.current) return;
        if (form.wardIds.length === 0 && accessWardIds.length === 1) {
            setForm((prev) => ({ ...prev, wardIds: [accessWardIds[0]] }));
        }
    }, [creatorRole, form.workingLevel, accessWardIds, form.wardIds.length, wards.length]);

    const handleWardSelection = (val: any) => {
        let selected: string[];
        if (typeof val === 'function') {
            selected = val(form.wardIds);
        } else {
            // Manual toggle for single item
            selected = form.wardIds.includes(val) 
                ? form.wardIds.filter(id => id !== val) 
                : [...form.wardIds, val];
        }

        const wardValues = wards.map(w => w.value).filter(v => v !== '__ALL__');
        
        const wasAllClicked = selected.includes('__ALL__') && !form.wardIds.includes('__ALL__');
        const wasAllUnclicked = !selected.includes('__ALL__') && form.wardIds.includes('__ALL__');

        if (wasAllClicked) {
            setForm(prev => ({ ...prev, wardIds: ['__ALL__', ...wardValues] }));
        } else if (wasAllUnclicked) {
            setForm(prev => ({ ...prev, wardIds: [] }));
        } else {
            const individualSelected = selected.filter((v: string) => v !== '__ALL__');
            if (individualSelected.length === wardValues.length && wardValues.length > 0) {
                setForm(prev => ({ ...prev, wardIds: ['__ALL__', ...wardValues] }));
            } else {
                setForm(prev => ({ ...prev, wardIds: individualSelected }));
            }
        }
    };

    const handleBoothSelection = (val: any) => {
        let selected: string[];
        if (typeof val === 'function') {
            selected = val(form.boothIds);
        } else {
            selected = form.boothIds.includes(val) 
                ? form.boothIds.filter(id => id !== val) 
                : [...form.boothIds, val];
        }

        const boothValues = booths.map(b => b.value).filter(v => v !== '__ALL__');

        const wasAllClicked = selected.includes('__ALL__') && !form.boothIds.includes('__ALL__');
        const wasAllUnclicked = !selected.includes('__ALL__') && form.boothIds.includes('__ALL__');

        if (wasAllClicked) {
            setForm(prev => ({ ...prev, boothIds: ['__ALL__', ...boothValues] }));
        } else if (wasAllUnclicked) {
            setForm(prev => ({ ...prev, boothIds: [] }));
        } else {
            const individualSelected = selected.filter((v: string) => v !== '__ALL__');
            if (individualSelected.length === boothValues.length && boothValues.length > 0) {
                setForm(prev => ({ ...prev, boothIds: ['__ALL__', ...boothValues] }));
            } else {
                setForm(prev => ({ ...prev, boothIds: individualSelected }));
            }
        }
    };

    const handleChange = (key: string, value: any) => {
        let val = value;
        if (key === 'phone') val = String(value || '').replace(/\D/g, '').slice(0, 10);
        setForm(prev => ({ ...prev, [key]: val }));
    };

    const handleReset = async () => {
        setForm({ firstName: '', phone: '', workingLevel: 'ASSEMBLY', assemblyId: '', wardIds: [], boothIds: [] });
        setIsEditing(false);
        setEditPhone('');
        await AsyncStorage.removeItem('volunteerEdit');
    };

    const resolveAssignment = () => {
        if (form.workingLevel === 'ASSEMBLY') {
            if (form.boothIds.length) return { assignmentType: 'BOOTH', assignmentId: form.boothIds.join(',') };
            if (form.wardIds.length) return { assignmentType: 'WARD', assignmentId: form.wardIds.join(',') };
            if (form.assemblyId) return { assignmentType: 'ASSEMBLY', assignmentId: form.assemblyId };
        }
        if (form.workingLevel === 'WARD') {
            if (form.boothIds.length) return { assignmentType: 'BOOTH', assignmentId: form.boothIds.join(',') };
            if (form.wardIds.length) return { assignmentType: 'WARD', assignmentId: form.wardIds.join(',') };
        }
        if (form.workingLevel === 'BOOTH') {
            if (form.boothIds.length) return { assignmentType: 'BOOTH', assignmentId: form.boothIds.join(',') };
        }
        return null;
    };

    const protectedLoginReadOnly = isEditing && isProtectedVolunteerLogin(form);

    const handleSubmit = async () => {
        if (isEditing && isProtectedVolunteerLogin(form)) {
            setBanner({
                type: 'error',
                message: 'Super Admin logins cannot be updated here. Contact a platform administrator.',
            });
            return;
        }

        const assignment = resolveAssignment();
        if (!assignment) {
            setBanner({ type: 'error', message: 'Please complete the assignment selection.' });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                firstName: form.firstName.trim(),
                phone: (isEditing ? editPhone : form.phone).trim(),
                workingLevel: form.workingLevel,
                assemblyIds: form.assemblyId ? [Number(form.assemblyId)] : [],
                wardIds: form.wardIds.map(Number),
                boothIds: form.boothIds.map(Number),
            };

            const res = isEditing 
                ? await CRUDAPI.updateVolunteer(payload) 
                : await CRUDAPI.addVolunteer(payload);

            if (res?.success) {
                setBanner({ type: 'success', message: res?.message || 'Volunteer saved successfully!' });
                handleReset();
                navigation.goBack();
            } else {
                setBanner({ type: 'error', message: res?.message || 'Failed to save volunteer.' });
            }
        } catch (error: any) {
            setBanner({ type: 'error', message: error?.message || 'An error occurred while saving.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>First Name *</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Enter Name"
                                value={form.firstName}
                                onChangeText={v => handleChange('firstName', v)}
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Phone *</Text>
                            <TextInput 
                                style={[styles.input, isEditing && styles.disabledInput]} 
                                placeholder="Enter 10 digits"
                                value={form.phone}
                                maxLength={10}
                                keyboardType="numeric"
                                editable={!isEditing}
                                onChangeText={v => handleChange('phone', v)}
                            />
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>
                            Working Level *
                            {creatorRole === 'ASSEMBLY' ? (
                                <Text style={styles.labelHint}> (You can assign Ward or Booth volunteers only)</Text>
                            ) : null}
                            {creatorRole === 'WARD' ? (
                                <Text style={styles.labelHint}> (You can assign Booth volunteers only)</Text>
                            ) : null}
                        </Text>
                        <DropDownPicker
                            open={openLevel}
                            value={form.workingLevel}
                            items={levelOptions}
                            setOpen={setOpenLevel}
                            setValue={v => handleChange('workingLevel', v(form.workingLevel))}
                            style={styles.dropdown}
                            dropDownContainerStyle={styles.dropdownPanel}
                            listMode="SCROLLVIEW"
                            zIndex={4000}
                            disabled={creatorRole === 'WARD' && levelOptions.length === 1}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Assembly *</Text>
                        {lockAssemblyPicker ? (
                            <TextInput
                                style={[styles.input, styles.disabledInput]}
                                value={
                                    assemblies.find((a) => String(a.value) === String(form.assemblyId))?.label
                                    || creatorAssemblyId
                                    || 'Assembly'
                                }
                                editable={false}
                            />
                        ) : (
                            <DropDownPicker
                                open={openAsm}
                                value={form.assemblyId}
                                items={assemblies}
                                setOpen={setOpenAsm}
                                setValue={v => handleChange('assemblyId', v(form.assemblyId))}
                                placeholder="Select Assembly"
                                style={styles.dropdown}
                                dropDownContainerStyle={styles.dropdownPanel}
                                listMode="SCROLLVIEW"
                                zIndex={3000}
                            />
                        )}
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Ward(s)</Text>
                        <TouchableOpacity 
                            style={[styles.dropdown, !form.assemblyId && styles.disabledInput]} 
                            onPress={() => form.assemblyId && setOpenWard(!openWard)}
                        >
                            <Text style={[styles.dropdownValue, !form.wardIds.length && styles.placeholder]}>
                                {form.wardIds.length > 0 
                                    ? (form.wardIds.includes('__ALL__') ? 'All Wards Selected' : `${form.wardIds.length} Ward(s) Selected`) 
                                    : (form.assemblyId ? "Select Ward(s)" : "Select Assembly First")}
                            </Text>
                            <Ionicons name={openWard ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                        </TouchableOpacity>

                        {openWard && (
                            <View style={styles.customPanel}>
                                <View style={styles.searchContainer}>
                                    <TextInput 
                                        style={styles.searchInput}
                                        placeholder="Search Wards..."
                                        onChangeText={setSearchWard}
                                        value={searchWard}
                                    />
                                </View>
                                <ScrollView style={styles.panelScroll} nestedScrollEnabled={true}>
                                    {wards.filter(w => !searchWard || w.label.toLowerCase().includes(searchWard.toLowerCase())).map((item, wardIndex) => {
                                        const isSelected = form.wardIds.includes(item.value);
                                        return (
                                            <TouchableOpacity 
                                                key={`${String(item?.value || item?.label || "ward")}-${wardIndex}`}
                                                style={[styles.listItem, isSelected && styles.listItemSelected]} 
                                                onPress={() => handleWardSelection(item.value)}
                                            >
                                                <Ionicons 
                                                    name={isSelected ? "checkbox" : "square-outline"} 
                                                    size={20} 
                                                    color={isSelected ? "#2563EB" : "#94A3B8"} 
                                                />
                                                <Text style={[styles.listItemLabel, isSelected && styles.listItemLabelSelected]}>
                                                    {item.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Booth(s)</Text>
                        <TouchableOpacity 
                            style={[styles.dropdown, !form.wardIds.length && styles.disabledInput]} 
                            onPress={() => form.wardIds.length > 0 && setOpenBooth(!openBooth)}
                        >
                            <Text style={[styles.dropdownValue, !form.boothIds.length && styles.placeholder]}>
                                {form.boothIds.length > 0 
                                    ? (form.boothIds.includes('__ALL__') ? 'All Booths Selected' : `${form.boothIds.length} Booth(s) Selected`) 
                                    : (form.wardIds.length ? "Select Booth(s)" : "Select Ward First")}
                            </Text>
                            <Ionicons name={openBooth ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                        </TouchableOpacity>

                        {openBooth && (
                            <View style={styles.customPanel}>
                                <View style={styles.searchContainer}>
                                    <TextInput 
                                        style={styles.searchInput}
                                        placeholder="Search Booths..."
                                        onChangeText={setSearchBooth}
                                        value={searchBooth}
                                    />
                                </View>
                                <ScrollView style={styles.panelScroll} nestedScrollEnabled={true}>
                                    {booths.filter(b => !searchBooth || b.label.toLowerCase().includes(searchBooth.toLowerCase())).map((item, boothIndex) => {
                                        const isSelected = form.boothIds.includes(item.value);
                                        return (
                                            <TouchableOpacity 
                                                key={`${String(item?.value || item?.label || "booth")}-${boothIndex}`}
                                                style={[styles.listItem, isSelected && styles.listItemSelected]} 
                                                onPress={() => handleBoothSelection(item.value)}
                                            >
                                                <Ionicons 
                                                    name={isSelected ? "checkbox" : "square-outline"} 
                                                    size={20} 
                                                    color={isSelected ? "#10B981" : "#94A3B8"} 
                                                />
                                                <Text style={[styles.listItemLabel, isSelected && styles.listItemLabelSelected]}>
                                                    {item.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                            <Text style={styles.resetBtnText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.submitBtn, (saving || protectedLoginReadOnly) && styles.disabledBtn]} 
                            onPress={handleSubmit}
                            disabled={saving || protectedLoginReadOnly}
                        >
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{isEditing ? 'Update' : 'Submit'}</Text>}
                        </TouchableOpacity>
                    </View>
                    {protectedLoginReadOnly ? (
                        <Text style={styles.readOnlyHint}>
                            Super Admin logins are read-only here. Contact a platform administrator to change these accounts.
                        </Text>
                    ) : null}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f1f5f9",
    },
    scrollContent: {
        padding: 16,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    row: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 10,
    },
    field: {
        flex: 1,
        marginBottom: 16,
    },
    labelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#64748B",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    hint: {
        marginTop: 6,
        fontSize: 12,
        color: "#64748B",
    },
    labelHint: {
        fontSize: 11,
        fontWeight: "500",
        color: "#64748B",
        textTransform: "none",
        letterSpacing: 0,
    },
    checkboxRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    checkboxLabel: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "600",
    },
    input: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        fontSize: 15,
        color: "#1E293B",
    },
    disabledInput: {
        backgroundColor: "#F1F5F9",
        borderColor: "#E2E8F0",
        opacity: 0.6,
    },
    dropdown: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        height: 48,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        justifyContent: "space-between",
    },
    dropdownValue: {
        fontSize: 15,
        color: "#1E293B",
        flex: 1,
    },
    placeholder: {
        color: "#94A3B8",
    },
    customPanel: {
        marginTop: 4,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        maxHeight: 300,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    panelScroll: {
        maxHeight: 240,
    },
    dropdownPanel: {
        borderColor: "#E2E8F0",
        borderRadius: 12,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    searchContainer: {
        borderBottomColor: "#F1F5F9",
        padding: 8,
    },
    searchInput: {
        backgroundColor: "#F1F5F9",
        borderRadius: 10,
        height: 40,
        borderColor: "transparent",
    },
    listItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 15,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F8FAFC",
    },
    listItemSelected: {
        backgroundColor: "rgba(37, 99, 235, 0.03)",
    },
    listItemLabel: {
        fontSize: 14,
        color: "#1E293B",
        flex: 1,
    },
    listItemLabelSelected: {
        fontWeight: "600",
        color: "#1E293B",
    },
    actionRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 20,
    },
    resetBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    resetBtnText: {
        color: "#64748B",
        fontWeight: "bold",
    },
    submitBtn: {
        backgroundColor: "#2563EB",
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        minWidth: 120,
    },
    submitBtnText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    disabledBtn: {
        backgroundColor: "#94A3B8",
    },
    readOnlyHint: {
        marginTop: 12,
        fontSize: 13,
        color: "#64748B",
        lineHeight: 18,
    },
});
