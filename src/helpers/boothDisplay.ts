export function resolveBoothDisplayNo(booth: Record<string, unknown> | null | undefined) {
  if (!booth) return '';
  const direct = booth.boothNo ?? booth.booth_no;
  if (direct != null && String(direct).trim() !== '') return direct;
  const id = Number(booth.boothId ?? booth.id ?? booth.booth_id);
  if (Number.isFinite(id) && id >= 10000) return id % 10000;
  return booth.boothId ?? booth.id ?? booth.booth_id ?? '';
}

export function formatBoothTitle(
  no: string | number | null | undefined,
  label: string | null | undefined,
) {
  const sNo = String(no ?? '').trim();
  const sLabel = String(label ?? '').trim();
  if (!sNo) return sLabel || '-';
  if (!sLabel || sLabel === '-') return sNo;
  const prefixPatterns = [`${sNo} -`, `${sNo}-`, `${sNo} `];
  if (prefixPatterns.some((p) => sLabel.startsWith(p))) return sLabel;
  return `${sNo} - ${sLabel}`;
}

export function getBoothCardTitle(booth: Record<string, unknown> | null | undefined) {
  const boothNo = resolveBoothDisplayNo(booth);
  const label =
    booth?.boothNameEn ||
    booth?.boothNameLocal ||
    booth?.nameEn ||
    booth?.booth_add_en ||
    booth?.pollingStationAdrEn ||
    '';
  return formatBoothTitle(boothNo, String(label || ''));
}
