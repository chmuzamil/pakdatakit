import networksData from '../data/networks.json';
import { getPhonePrefix } from './phone.js';

export type NetworkName = 'Jazz' | 'Zong' | 'Telenor' | 'Ufone' | 'Unknown';

interface NetworkEntry {
  prefix: string;
  network: NetworkName;
}

const PREFIX_MAP = new Map<string, NetworkName>(
  (networksData as NetworkEntry[]).map((entry) => [
    entry.prefix,
    entry.network,
  ]),
);

/**
 * Detects the mobile network for a Pakistani phone number based on its prefix.
 *
 * Returns the original issuing network (Jazz, Zong, Telenor, or Ufone).
 * Due to Mobile Number Portability (MNP), the current carrier may differ.
 *
 * @param phone - The phone number to look up
 * @returns Network name or `"Unknown"` if the prefix is not recognized
 */
export function getNetwork(phone: string): NetworkName {
  const prefix = getPhonePrefix(phone);
  if (prefix === null) {
    return 'Unknown';
  }

  return PREFIX_MAP.get(prefix) ?? 'Unknown';
}
