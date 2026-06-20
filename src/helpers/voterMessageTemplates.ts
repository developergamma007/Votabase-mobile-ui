import { getGoogleExternalUrl } from '../config/googleMap';

export function normalizeBoothLocationLink(
  booth: Record<string, unknown> | null | undefined,
  templateLink?: string | null,
) {
  if (templateLink) return templateLink;
  const lat = booth?.latitude ?? booth?.lat ?? booth?.boothLat ?? booth?.booth_lat;
  const lng = booth?.longitude ?? booth?.lng ?? booth?.boothLng ?? booth?.booth_long;
  if (!lat || !lng) return '';
  return getGoogleExternalUrl(Number(lat), Number(lng));
}

export function buildWhatsAppMessage(
  voter: Record<string, unknown>,
  booth: Record<string, unknown> | null | undefined,
  template: Record<string, unknown> | null | undefined,
) {
  const authority = template?.authorityName || 'Greater Bengaluru Authority';
  const election = template?.electionName || 'Election-2026';
  const assembly = template?.assemblyLabel || 'Assembly:';
  const ward = template?.wardLabel || 'Ward:';
  const candidateName = template?.candidateName || '';
  const candidateParty = template?.candidateParty || '';
  const candidateWard = template?.candidateWardLabel || '';
  const voteDate = template?.voteDate || '';
  const voteTime = template?.voteTime || '';
  const socialLink = template?.socialLink || '';
  const locationLink = normalizeBoothLocationLink(booth, template?.boothLocationLink as string);
  const voterName = voter?.firstMiddleNameEn || voter?.name || '-';
  const relationLabel = voter?.relationLabel || voter?.relationType || 'Father';
  const relationName =
    voter?.relationName ||
    voter?.relationFirstMiddleNameEn ||
    voter?.fatherName ||
    voter?.motherName ||
    '';
  const epic = voter?.epicNo || '-';
  const boothNo = booth?.boothNo || voter?.boothNo || booth?.boothId || voter?.boothId || '-';
  const serial = voter?.serialNo || voter?.sl || voter?.srNo || '-';
  const boothName = booth?.boothNameEn || booth?.boothLabel || voter?.boothLabel || voter?.boothNameEn || '-';
  const boothAddress = booth?.address || booth?.boothAddress || '';

  const lines = [
    authority,
    election,
    assembly,
    ward,
    '***************************',
    'Voter details:',
    `Name: ${voterName}`,
    `${relationLabel} : ${relationName || '-'}`,
    `EPIC ID: ${epic}`,
    `BOOTH #: ${boothNo}`,
    `SERIAL #: ${serial}`,
    '***************************',
    'Booth Address:',
    boothName,
    boothAddress,
    voteDate ? `Vote On: ${voteDate}` : '',
    voteTime ? `Voting Time: ${voteTime}` : '',
    locationLink ? `Polling booth Location: ${locationLink}` : 'Polling booth Location:',
    '***************************',
    candidateParty ? `Kindly do Cast Your Valuable Vote for ${candidateParty}` : 'Kindly do Cast Your Valuable Vote',
    candidateName,
    candidateWard,
    socialLink ? `Follow us: ${socialLink}` : '',
    template?.bannerUrl && String(template.bannerUrl).startsWith('http') ? `Banner: ${template.bannerUrl}` : '',
  ];
  return lines.filter((item) => item !== '').join('\n').trim();
}

export function buildSMSMessage(
  voter: Record<string, unknown>,
  booth: Record<string, unknown> | null | undefined,
  template: Record<string, unknown> | null | undefined,
) {
  const authority = template?.authorityName || 'Greater Bengaluru Authority';
  const election = template?.electionName || 'Election-2026';
  const assembly = template?.assemblyLabel || 'Assembly:';
  const ward = template?.wardLabel || 'Ward:';
  const candidateName = template?.candidateName || '';
  const candidateParty = template?.candidateParty || '';
  const candidateWard = template?.candidateWardLabel || '';
  const voteDate = template?.voteDate || '';
  const voteTime = template?.voteTime || '';
  const socialLink = template?.socialLink || '';
  const locationLink = normalizeBoothLocationLink(booth, template?.boothLocationLink as string);
  const voterName = voter?.firstMiddleNameEn || voter?.name || '-';
  const relationLabel = voter?.relationLabel || voter?.relationType || 'Father';
  const relationName =
    voter?.relationName ||
    voter?.relationFirstMiddleNameEn ||
    voter?.fatherName ||
    voter?.motherName ||
    '';
  const epic = voter?.epicNo || '-';
  const boothNo = booth?.boothNo || voter?.boothNo || booth?.boothId || voter?.boothId || '-';
  const serial = voter?.serialNo || voter?.sl || voter?.srNo || '-';
  const boothName = booth?.boothNameEn || booth?.boothLabel || voter?.boothLabel || voter?.boothNameEn || '-';
  const boothAddress = booth?.address || booth?.boothAddress || '';

  const lines = [
    authority,
    election,
    assembly,
    ward,
    '***************************',
    'Voter details:',
    `Name: ${voterName}`,
    `${relationLabel} : ${relationName || '-'}`,
    `EPIC ID: ${epic}`,
    `BOOTH #: ${boothNo}`,
    `SERIAL #: ${serial}`,
    '***************************',
    'Booth Address:',
    boothName,
    boothAddress,
    voteDate ? `Vote On: ${voteDate}` : '',
    voteTime ? `Voting Time: ${voteTime}` : '',
    locationLink ? `Polling booth Location: ${locationLink}` : '',
    '***************************',
    candidateParty ? `Kindly do Cast Your Valuable Vote for ${candidateParty}` : 'Kindly do Cast Your Valuable Vote',
    candidateName,
    candidateWard,
    socialLink,
    template?.bannerUrl && String(template.bannerUrl).startsWith('http') ? `Banner: ${template.bannerUrl}` : '',
  ];
  return lines.filter((item) => item !== '').join('\n').trim();
}
