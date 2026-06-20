export const FAMILY_AVAILABILITY_OPTIONS = [
  'Available',
  'Not Available',
  'Entry Denied',
  'Data not Given',
  'Door Closed',
];

export const FAMILY_AVAILABILITY_COLORS = {
  Available: '#3B82F6',
  'Not Available': '#F97316',
  'Entry Denied': '#EAB308',
  'Data not Given': '#A855F7',
  'Door Closed': '#EF4444',
};

export const FAMILY_AVAILABILITY_EMOJI = {
  Available: '🔵',
  'Not Available': '🟠',
  'Entry Denied': '🟡',
  'Data not Given': '🟣',
  'Door Closed': '🔴',
};

export const formatFamilyAvailabilityLabel = (label) => {
  const key = String(label || '').trim();
  const emoji = FAMILY_AVAILABILITY_EMOJI[key];
  return emoji ? `${key} ${emoji}` : key;
};

export const maskFamilySensitiveValue = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.length <= 4) return raw;
  return `${'*'.repeat(raw.length - 4)}${raw.slice(-4)}`;
};

export const maskEpicLastFour = maskFamilySensitiveValue;

export const maskFamilyNameLeading = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.length <= 4) return raw;
  return `${raw.slice(0, 4)}${'*'.repeat(raw.length - 4)}`;
};

export const canViewFullFamilySensitiveData = (role) => {
  const r = normalizeFamilyRole(role);
  return ['SUPER_ADMIN', 'ADMIN', 'ASSEMBLY', 'WARD'].includes(r);
};

export const isBoothFamilyRole = (role) => {
  const r = normalizeFamilyRole(role);
  return r === 'BOOTH' || r === 'USER';
};

export const shouldMaskAvailableFamilyForRole = (role, availability) => {
  if (canViewFullFamilySensitiveData(role)) return false;
  if (!isBoothFamilyRole(role)) return false;
  return String(availability || '').trim() === 'Available';
};

export const displayPendingFamilyListName = (family, role) => {
  const name = family?.familyName || 'Unnamed family';
  if (!shouldMaskAvailableFamilyForRole(role, family?.familyAvailability)) return name;
  return maskFamilyNameLeading(name);
};

export const maskMemberNameForDisplay = (role, availability, name) => {
  if (!shouldMaskAvailableFamilyForRole(role, availability)) return name || '-';
  return maskFamilyNameLeading(name || '');
};

export const maskMemberEpicForDisplay = (role, availability, epic) => {
  if (!shouldMaskAvailableFamilyForRole(role, availability)) return epic || '-';
  return maskEpicLastFour(epic || '');
};

export const maskMemberPhoneForDisplay = (role, availability, phone) => {
  if (!shouldMaskAvailableFamilyForRole(role, availability)) return phone || '-';
  return maskEpicLastFour(phone || '');
};

export const hasValidFamilyMapLocation = (family = {}) => {
  const lat = Number(family?.latitude);
  const lng = Number(family?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
};

export const FAMILY_POINT_OPTIONS = Array.from({ length: 100 }, (_, index) => ({
  label: String(index + 1),
  value: String(index + 1),
}));

export const parseFamilyNumber = (value) => {
  const n = parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const parseWardCodeFromWardRecord = (ward = {}) => {
  const name = String(
    ward?.wardNameEn ?? ward?.ward_name_en ?? ward?.ward_name ?? ward?.name_en ?? ward?.name ?? ward?.label ?? ''
  ).trim();
  const nameMatch = name.match(/^(\d+)\s*[-–]/);
  if (nameMatch) return nameMatch[1];
  const code = String(ward?.wardCode ?? ward?.ward_code ?? ward?.ward_no ?? ward?.code ?? '').trim();
  const id = String(ward?.wardId ?? ward?.ward_id ?? ward?.id ?? ward?.value ?? '').trim();
  if (code && (!id || code !== id)) return code.replace(/\s+/g, '');
  return '';
};

export const normalizeAssemblyCodeForFamily = (assemblyCode) => {
  const raw = String(assemblyCode ?? '').trim();
  if (!raw) return '';
  if (/^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? String(n) : raw;
  }
  return raw.replace(/\s+/g, '');
};

export const getFamilyNumberPrefix = (ward = {}, assemblyCode = '') => {
  const wardPart = parseWardCodeFromWardRecord(ward);
  const asmPart = normalizeAssemblyCodeForFamily(assemblyCode);
  if (asmPart && wardPart) return `${asmPart}-${wardPart}`;
  return wardPart || asmPart || '';
};

export const getWardFamilyNumberPrefix = (ward = {}) => parseWardCodeFromWardRecord(ward);

export const parseFamilyNumberSeq = (value, wardPrefix = "") => {
  const raw = String(value ?? "").trim();
  const prefix = String(wardPrefix ?? "").trim();
  if (!prefix) return parseFamilyNumber(raw);
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = raw.match(new RegExp(`^${escaped}-(\\d+)$`, "i"));
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const familyBelongsToWard = (family, wardId, wardCode) => {
  if (!wardId && !wardCode) return true;
  if (wardId != null && String(wardId).trim() !== "" && String(family?.wardId) === String(wardId)) return true;
  if (wardCode && String(family?.wardCode ?? "").trim() === String(wardCode).trim()) return true;
  const parts = String(family?.familyNumber ?? "").trim().split("-");
  if (parts.length >= 3 && wardCode) {
    const wardFromNumber = String(parts[1] ?? "").replace(/^0+/, "") || parts[1];
    const target = String(wardCode).trim().replace(/^0+/, "") || String(wardCode).trim();
    if (wardFromNumber === target) return true;
  }
  return false;
};

export const familyNumberMatchesPrefix = (familyNumber, wardPrefix = "") => {
  const prefix = String(wardPrefix ?? "").trim();
  const raw = String(familyNumber ?? "").trim();
  if (!prefix || !raw) return false;
  return raw.toLowerCase().startsWith(`${prefix.toLowerCase()}-`);
};

export const getNextFamilyNumber = (families = [], wardPrefix = "") => {
  const prefix = String(wardPrefix ?? "").trim();
  if (!prefix) {
    let max = 0;
    (families || []).forEach((family) => {
      const n = parseFamilyNumber(family?.familyNumber);
      if (n != null && n > max) max = n;
    });
    return String(max + 1);
  }
  let max = 0;
  const prefixKey = `${prefix}-`.toLowerCase();
  (families || []).forEach((family) => {
    const raw = String(family?.familyNumber ?? "").trim();
    if (!raw.toLowerCase().startsWith(prefixKey)) return;
    const n = parseFamilyNumberSeq(raw, prefix);
    if (n != null && n > max) max = n;
  });
  return `${prefix}-${max + 1}`;
};

export const familiesForNextNumber = (families = [], wardId, wardCode, wardPrefix = "") => {
  const prefix = String(wardPrefix ?? "").trim();
  return (families || []).filter((family) => {
    if (prefix && familyNumberMatchesPrefix(family?.familyNumber, prefix)) return true;
    return familyBelongsToWard(family, wardId, wardCode);
  });
};

export const hasHouseMarkingFields = (buildingNumber, buildingName, flatNumber) =>
  [buildingNumber, buildingName, flatNumber].every((part) => String(part || '').trim());

export const getWardBoothIdList = (boothItems = []) =>
  (boothItems || [])
    .map((item) => String(item?.value ?? '').trim())
    .filter((value) => value && value !== '');

export const resolveFamilyCreateBoothId = (boothItems = [], explicitBoothId = '') => {
  const booths = getWardBoothIdList(boothItems);
  const explicit = String(explicitBoothId ?? '').trim();
  if (explicit && booths.includes(explicit)) return explicit;
  return booths[0] || '';
};

export const isMemberBoothInWard = (memberBoothId, boothItems = []) => {
  const allowed = getWardBoothIdList(boothItems);
  if (!allowed.length) return true;
  const boothId = String(memberBoothId ?? '').trim();
  if (!boothId) return false;
  return allowed.includes(boothId);
};

/** Relation label for family member rows (API uses relationFirstMiddleNameEn, not relationNameEn). */
export const getVoterRelationDisplay = (voter = {}) => {
  const nameEn = [voter.relationFirstMiddleNameEn, voter.relationLastNameEn]
    .filter((p) => p != null && String(p).trim() !== '')
    .join(' ')
    .trim();
  const nameLocal = [voter.relationFirstMiddleNameLocal, voter.relationLastNameLocal]
    .filter((p) => p != null && String(p).trim() !== '')
    .join(' ')
    .trim();
  const name =
    nameEn ||
    nameLocal ||
    String(
      voter.relationNameEn ||
        voter.relation_name_en ||
        voter.rel_eng ||
        voter.fatherName ||
        voter.husbandName ||
        voter.motherName ||
        ''
    ).trim();
  const type = String(voter.relationType || voter.rel_type || '').trim();
  if (type && name) return `${type}: ${name}`;
  return name || type || '';
};

export const getVoterPhoneDisplay = (voter = {}, role = '', familyAvailability = '') => {
  const raw = voter.mobile ?? voter.mobileNumber ?? voter.phone ?? '';
  const s = String(raw).trim();
  if (!s || s === 'null' || s === 'undefined') return '';
  if (role && shouldMaskAvailableFamilyForRole(role, familyAvailability)) {
    return maskEpicLastFour(s);
  }
  return s;
};

export const getVoterHouseDisplay = (voter = {}) => {
  const raw = voter.houseNoEn ?? voter.houseNoLocal ?? voter.house ?? '';
  const s = String(raw).trim();
  if (!s || s === '0' || s === 'null') return '';
  return s;
};

export const buildFamilyMapTooltipText = (point = {}, role = '') => {
  const availability = point.familyAvailability || 'Available';
  const members = Array.isArray(point.members) ? point.members : [];
  const memberLines = members.length
    ? members.map((m, index) => {
      const name = maskMemberNameForDisplay(role, availability, m.voterName || m.name || '-');
      const relation = m.relationName || m.relation || '-';
      const epic = maskMemberEpicForDisplay(role, availability, m.epicNo || m.epic || '-');
      return `${index + 1}. ${name} | ${relation} | ${epic}`;
    }).join('\n')
    : 'No members listed';

  const familyName = shouldMaskAvailableFamilyForRole(role, availability)
    ? maskFamilyNameLeading(point.familyName || '-')
    : (point.familyName || '-');

  return [
    `Road name: ${point.roadName || '-'}`,
    `Family number: ${point.familyNumber || '-'}`,
    `Family Name: ${familyName}`,
    `Flat No: ${point.flatNumber || '-'}`,
    'Family members details:',
    memberLines,
  ].join('\n');
};

const familyNumberSortKey = (family) => {
  const raw = String(family?.familyNumber ?? "").trim();
  const dash = raw.lastIndexOf("-");
  if (dash > 0) {
    const prefix = raw.slice(0, dash);
    const seq = parseInt(raw.slice(dash + 1), 10);
    return { prefix, seq: Number.isFinite(seq) ? seq : Number.MAX_SAFE_INTEGER, raw };
  }
  const n = parseFamilyNumber(raw);
  return { prefix: "", seq: n != null ? n : Number.MAX_SAFE_INTEGER, raw };
};

export const sortFamiliesByNumber = (families = []) =>
  [...families].sort((a, b) => {
    const ak = familyNumberSortKey(a);
    const bk = familyNumberSortKey(b);
    const prefixCmp = ak.prefix.localeCompare(bk.prefix, "en", { sensitivity: "base" });
    if (prefixCmp !== 0) return prefixCmp;
    if (ak.seq !== bk.seq) return ak.seq - bk.seq;
    return String(a?.familyName || "").localeCompare(String(b?.familyName || ""), "en", { sensitivity: "base" });
  });

/** @deprecated Use sortFamiliesByNumber */
export const sortFamiliesByName = sortFamiliesByNumber;

/** Build a voter payload for Voter Info from a family member row (API or form). */
export const buildVoterFromFamilyMember = (member = {}, fallback = {}) => {
  const raw = member.rawVoter && typeof member.rawVoter === 'object' ? member.rawVoter : member;
  const voterName = String(member.voterName || member.name || raw.voterName || '').trim();
  const firstMiddle = String(
    raw.firstMiddleNameEn || raw.first_middle_name_en || raw.name_en || raw.name || voterName
  ).trim();
  const lastName = String(raw.lastNameEn || raw.last_name_en || '').trim();
  const epicNo = raw.epicNo || member.epicNo || member.epic || '';
  const boothId = member.boothId || raw.boothId || raw.booth_id || fallback.boothId || '';
  return {
    ...raw,
    epicNo,
    voterName: voterName || firstMiddle,
    firstMiddleNameEn: firstMiddle || voterName,
    lastNameEn: lastName,
    name: voterName || firstMiddle,
    boothId,
    boothNo: raw.boothNo || member.boothNo || fallback.boothNo || '',
    wardCode: raw.wardCode || member.wardCode || fallback.wardCode || '',
    wardNameEn: raw.wardNameEn || member.wardNameEn || fallback.wardNameEn || '',
  };
};

export const normalizeVoterForInfo = (voter = {}, boothId) => ({
  ...voter,
  epicNo: voter.epicNo || voter.epic || '',
  voterId: voter.voterId ?? voter.id,
  firstMiddleNameEn:
    voter.firstMiddleNameEn || voter.name_en || voter.name || voter.voterName || '',
  lastNameEn: voter.lastNameEn || voter.last_name_en || '',
  boothId: voter.boothId || voter.boothInfo?.boothId || boothId || '',
  boothNo: voter.boothNo || voter.boothInfo?.boothNo || '',
  wardCode: voter.wardCode || voter.boothInfo?.wardCode || '',
});

export const normalizeFamilyRole = (role) => String(role || '').replace(/^ROLE_/, '').toUpperCase();

/** Family analysis table/map: assembly, ward, and admin roles only (not booth). */
export const canViewFamilyAnalysis = (userInfo = {}) => {
  const role = normalizeFamilyRole(userInfo?.role);
  const level = String(
    userInfo?.workingLevel || userInfo?.assignmentType || userInfo?.assignment_type || '',
  )
    .replace(/^ROLE_/, '')
    .toUpperCase();

  if (role === 'BOOTH' || level === 'BOOTH') return false;
  if (['SUPER_ADMIN', 'ADMIN', 'ASSEMBLY', 'WARD'].includes(role)) return true;
  if (role === 'USER' && ['ASSEMBLY', 'WARD'].includes(level)) return true;
  return ['ASSEMBLY', 'WARD'].includes(level);
};

/** Booth-level field login — hide ward-wide family list (data theft risk). */
export const isBoothLevelLogin = (userInfo = {}) => {
  const role = normalizeFamilyRole(userInfo?.role);
  const level = String(
    userInfo?.workingLevel || userInfo?.assignmentType || userInfo?.assignment_type || '',
  )
    .replace(/^ROLE_/, '')
    .toUpperCase();
  return role === 'BOOTH' || level === 'BOOTH';
};

/**
 * Map GET /family/{id} DTO into New Family form state (mobile member shape).
 * @param {object} fam
 * @param {{ wardItems?: Array<{ label: string; value: string; wardCode?: string }> }} [options]
 */
export const mapFamilyDtoToFormState = (fam = {}, { wardItems = [] } = {}) => {
  const headMember = (fam.members || []).find((m) => m.head || m.is_head) || (fam.members || [])[0];
  const mappedMembers = (fam.members || []).map((m) => {
    const rawVoter = buildVoterFromFamilyMember(m, {
      boothId: fam.boothId,
      boothNo: fam.boothNo,
      wardCode: fam.wardCode,
    });
    const voterName =
      String(m.voterName || m.name || '').trim()
      || [rawVoter?.firstMiddleNameEn, rawVoter?.lastNameEn].filter(Boolean).join(' ').trim()
      || m.epicNo
      || 'Member';
    return {
      epicNo: m.epicNo || rawVoter?.epicNo || '',
      voterName,
      phone: getVoterPhoneDisplay(rawVoter) || m.phone || '',
      relationName: m.relationName || m.rel_eng || getVoterRelationDisplay(rawVoter) || '',
      houseNo: getVoterHouseDisplay(rawVoter) || m.houseNo || '',
      boothId: m.boothId || fam.boothId || rawVoter?.boothId || '',
      rawVoter,
    };
  });

  const headEpicNo = fam.headEpicNo || headMember?.epicNo || mappedMembers[0]?.epicNo || '';

  let resolvedWardId = fam.wardId ?? fam.ward_id;
  resolvedWardId = resolvedWardId != null ? String(resolvedWardId) : '';
  const wardCodeFromFamily = fam.wardCode ?? fam.ward_code;
  if (!resolvedWardId && wardCodeFromFamily && wardItems.length) {
    const byCode = wardItems.find((w) => String(w.wardCode) === String(wardCodeFromFamily));
    if (byCode) resolvedWardId = byCode.value;
  }
  const matchedWard = wardItems.find((w) => String(w.value) === String(resolvedWardId));

  const location =
    fam.latitude != null && fam.longitude != null
      ? { latitude: Number(fam.latitude), longitude: Number(fam.longitude) }
      : null;

  return {
    familyName: fam.familyName || '',
    roadName: fam.roadName || '',
    buildingNumber: fam.buildingNumber || '',
    buildingName: fam.buildingName || '',
    flatNumber: fam.flatNumber || '',
    familyNumber: fam.familyNumber || '',
    tagLeader: fam.tagLeader || '',
    familyAvailability: fam.familyAvailability || 'Available',
    buildingAddress: fam.buildingAddress || fam.familyAddress || '',
    hasAssociation: Boolean(fam.hasAssociation),
    associationName: fam.associationName || '',
    associationHeadName: fam.associationHeadName || '',
    associationHeadPhone: fam.associationHeadPhone || '',
    headPhone: fam.phone || '',
    economicStatus: fam.economicStatus || 'NA',
    familyNature: fam.familyNature || 'NA',
    familyPoints: String(fam.points ?? '5'),
    members: mappedMembers,
    headEpicNo,
    location,
    selectedWardId: resolvedWardId,
    editingFamilyMeta: {
      familyId: fam.familyId,
      boothId: fam.boothId,
      wardId: fam.wardId ?? fam.ward_id ?? (resolvedWardId ? Number(resolvedWardId) : null),
      wardCode: wardCodeFromFamily || matchedWard?.wardCode,
      wardLabel: matchedWard?.label,
      familyNumber: fam.familyNumber,
    },
  };
};
