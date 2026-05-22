export const FAMILY_AVAILABILITY_OPTIONS = [
  'Available',
  'Not Available',
  'Entry Denied',
  'Data not Given',
  'Door Closed',
];

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
  return false;
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
  (families || []).forEach((family) => {
    const n = parseFamilyNumberSeq(family?.familyNumber, prefix);
    if (n != null && n > max) max = n;
  });
  return `${prefix}-${max + 1}`;
};

export const hasHouseMarkingFields = (buildingNumber, buildingName, flatNumber) =>
  [buildingNumber, buildingName, flatNumber].every((part) => String(part || '').trim());

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

export const getVoterPhoneDisplay = (voter = {}) => {
  const raw = voter.mobile ?? voter.mobileNumber ?? voter.phone ?? '';
  const s = String(raw).trim();
  if (!s || s === 'null' || s === 'undefined') return '';
  return s;
};

export const getVoterHouseDisplay = (voter = {}) => {
  const raw = voter.houseNoEn ?? voter.houseNoLocal ?? voter.house ?? '';
  const s = String(raw).trim();
  if (!s || s === '0' || s === 'null') return '';
  return s;
};

export const buildFamilyMapTooltipText = (point = {}) => {
  const members = Array.isArray(point.members) ? point.members : [];
  const memberLines = members.length
    ? members.map((m, index) => {
      const name = m.voterName || m.name || '-';
      const relation = m.relationName || m.relation || '-';
      const epic = m.epicNo || m.epic || '-';
      return `${index + 1}. ${name} | ${relation} | ${epic}`;
    }).join('\n')
    : 'No members listed';

  return [
    `Road name: ${point.roadName || '-'}`,
    `Family number: ${point.familyNumber || '-'}`,
    `Family Name: ${point.familyName || '-'}`,
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

export const normalizeVoterForInfo = (voter = {}, boothId) => ({
  ...voter,
  epicNo: voter.epicNo || voter.epic || '',
  voterId: voter.voterId ?? voter.id,
  firstMiddleNameEn: voter.firstMiddleNameEn || voter.name || voter.voterName || '',
  lastNameEn: voter.lastNameEn || '',
  boothId: voter.boothId || voter.boothInfo?.boothId || boothId || '',
  boothNo: voter.boothNo || voter.boothInfo?.boothNo || '',
  wardCode: voter.wardCode || voter.boothInfo?.wardCode || '',
});
