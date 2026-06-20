export type VoterWithLocation = Record<string, unknown> & {
  latitude?: number;
  longitude?: number;
};

/** Keep existing API shape, but do not require GPS before opening voter info. */
export async function mergeVoterWithQuickLocation<T extends VoterWithLocation>(
  voter: T,
): Promise<T> {
  return voter;
}

export async function openVoterInfoWithQuickLocation(
  navigation: { navigate: (name: string, params?: object) => void },
  voter: VoterWithLocation,
  booth?: object,
  onError?: (message: string) => void,
): Promise<boolean> {
  const withLoc = await mergeVoterWithQuickLocation(voter);
  navigation.navigate('Voter Info', { voter: withLoc, booth });
  return true;
}
