/** Build voter enrichment update payload — only non-empty values (matches website mobile web). */

export const voterFieldChanged = (left, right) => {
  if (Array.isArray(left) || Array.isArray(right)) {
    const a = (Array.isArray(left) ? left : left ? [left] : []).map(String).sort().join('|');
    const b = (Array.isArray(right) ? right : right ? [right] : []).map(String).sort().join('|');
    return a !== b;
  }
  return String(left ?? '').trim() !== String(right ?? '').trim();
};

export const buildVoterPayloadFromForm = (form = {}, customValues = {}) => {
  const payload = {};
  Object.entries(form).forEach(([key, value]) => {
    const custom = String(customValues[key] ?? '').trim();
    if (Array.isArray(value)) {
      const baseList = value.filter((item) => item !== 'Others');
      const list = custom ? Array.from(new Set(baseList.concat(custom))) : baseList;
      if (list.length) payload[key] = list;
      return;
    }
    const resolved = value === 'Others' || custom ? custom : value;
    if (resolved !== null && resolved !== undefined && String(resolved).trim() !== '') {
      payload[key] = resolved;
    }
  });
  if (payload.mobile != null) {
    payload.mobile = String(payload.mobile).replace(/\D/g, '').slice(0, 10);
  }
  return payload;
};

/** Send only fields the volunteer actually filled or changed — avoids clearing server data with empty strings. */
export const buildVoterUpdateRequest = (form = {}, customValues = {}, baseline = {}) => {
  const current = buildVoterPayloadFromForm(form, customValues);
  const base = buildVoterPayloadFromForm(baseline, {});
  const updateRequest = {};
  Object.keys(current).forEach((key) => {
    if (voterFieldChanged(current[key], base[key])) {
      updateRequest[key] = current[key];
    }
  });
  return updateRequest;
};

export const formStateFromVoter = (voter = {}) => ({
  mobile: voter?.mobile || '',
  dob: voter?.dob || '',
  community: voter?.community || '',
  caste: voter?.caste || '',
  motherTongue: voter?.motherTongue || '',
  education: voter?.education || '',
  residenceType: voter?.residenceType || '',
  ownership: voter?.ownership || '',
  voterPoints: voter?.voterPoints || '',
  govtSchemeTracking: Array.isArray(voter?.govtSchemeTracking)
    ? voter.govtSchemeTracking
    : voter?.govtSchemeTracking
      ? [voter.govtSchemeTracking]
      : [],
  engagementPotential: voter?.engagementPotential || '',
  ifShifted: voter?.ifShifted || '',
  status: voter?.status || '',
  civicIssue: voter?.civicIssue || '',
  natureOfVoter: voter?.natureOfVoter || '',
  notes: voter?.notes || '',
  presentAddress: voter?.presentAddress || '',
  newWard: voter?.newWard || '',
  newBoothNo: voter?.newBoothNo || '',
  newSerialNo: voter?.newSerialNo || '',
  notAvailableReason: voter?.notAvailableReason || '',
});
