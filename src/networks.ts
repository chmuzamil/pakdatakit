import networksData from '../data/networks.json';
import { getPhonePrefix } from './internal/phone-utils.js';
import { lazy } from './internal/normalize.js';

/**
 * Original issuing operator for a mobile prefix.
 *
 * `Telenor` is the operator the 034x range was originally allocated to; Telenor
 * Pakistan was merged into PTML (Ufone) in 2026. `SCO` is the Special
 * Communications Organization (0355, serving AJK and Gilgit-Baltistan).
 */
export type NetworkName =
  | 'Jazz'
  | 'Zong'
  | 'Telenor'
  | 'Ufone'
  | 'SCO'
  | 'Unknown';

interface NetworkEntry {
  prefix: string;
  network: NetworkName;
}

const prefixMap = lazy(
  () =>
    new Map<string, NetworkName>(
      (networksData as NetworkEntry[]).map((entry) => [
        entry.prefix,
        entry.network,
      ]),
    ),
);

/**
 * Detects the mobile network for a Pakistani phone number based on its prefix.
 *
 * Returns the network the prefix was originally allocated to. Due to Mobile
 * Number Portability (MNP) and operator mergers, the current carrier may differ.
 *
 * @param phone - The phone number to look up
 * @returns Network name or `"Unknown"` if the number is not a valid Pakistani mobile number
 */
export function getNetwork(phone: string): NetworkName {
  const prefix = getPhonePrefix(phone);
  if (prefix === null) {
    return 'Unknown';
  }

  return prefixMap().get(prefix) ?? 'Unknown';
}
