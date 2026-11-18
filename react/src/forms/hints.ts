import { useEffect, useMemo, useState } from 'react';
import { checkPhoneInput } from 'pakdatakit/input';
import type {
  AddressScore,
  PhoneRiskFlag,
  phoneRiskSignals,
  scoreAddress,
} from 'pakdatakit/quality';
import type { getCityByPostalCode } from 'pakdatakit/postal';
import { resolveLabels, type PakFormLabels } from './labels.js';

/** The functions hints need, loaded on demand. */
export interface PakHintsModule {
  scoreAddress: typeof scoreAddress;
  phoneRiskSignals: typeof phoneRiskSignals;
  getCityByPostalCode: typeof getCityByPostalCode;
}

let loading: Promise<PakHintsModule> | null = null;

/**
 * Loads `pakdatakit/quality` and `pakdatakit/postal` with a dynamic
 * `import()`. They bring the post office directory (about 32 kB gzipped), so
 * bundlers put them in a separate chunk that is only fetched when hints are
 * turned on. The promise is cached.
 */
export function loadPakHints(): Promise<PakHintsModule> {
  if (!loading) {
    loading = Promise.all([
      import('pakdatakit/quality'),
      import('pakdatakit/postal'),
    ]).then(
      ([quality, postal]) => ({
        scoreAddress: quality.scoreAddress,
        phoneRiskSignals: quality.phoneRiskSignals,
        getCityByPostalCode: postal.getCityByPostalCode,
      }),
      (error: unknown) => {
        loading = null;
        throw error;
      },
    );
  }
  return loading;
}

/** Input of {@link usePakHints}. */
export interface UsePakHintsInput {
  /** Load the hint functions and compute hints. Nothing is loaded while `false`. */
  enabled: boolean;
  address?: string | undefined;
  landmark?: string | undefined;
  city?: string | undefined;
  postalCode?: string | undefined;
  mobile?: string | undefined;
  /** Texts for `messages`; defaults to English. */
  labels?: PakFormLabels | undefined;
}

/** Result of {@link usePakHints}. */
export interface PakHints {
  /** `'off'` when disabled, then `'loading'`, `'ready'` or `'error'`. */
  status: 'off' | 'loading' | 'ready' | 'error';
  /** `scoreAddress` of address, landmark, city and postal code, once there is an address. */
  address: AddressScore | null;
  /** `phoneRiskSignals` of a complete mobile number (without `'invalid'`, which validation reports). */
  phoneFlags: PhoneRiskFlag[];
  /** The city of the postal code when it differs from the city entered. */
  postalCodeCity: string | null;
  /** All of the above as short sentences in the chosen language. */
  messages: string[];
}

const NEAR = /^(near|opp|opposite|nazd|qareeb|behind|beside|next to)\b/i;

/** The text given to `scoreAddress`: address, landmark, city and postal code. */
export function addressForScoring(parts: {
  address?: string | undefined;
  landmark?: string | undefined;
  city?: string | undefined;
  postalCode?: string | undefined;
}): string {
  const landmark = (parts.landmark ?? '').trim();
  return [
    (parts.address ?? '').trim(),
    landmark && !NEAR.test(landmark) ? `near ${landmark}` : landmark,
    [(parts.city ?? '').trim(), (parts.postalCode ?? '').trim()]
      .filter(Boolean)
      .join(' '),
  ]
    .filter(Boolean)
    .join(', ');
}

const sameName = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLowerCase() ===
  b.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Non-blocking delivery hints: how complete the address is, warning signs in
 * the mobile number, and a postal code that belongs to another city. The
 * hint functions (and the post office directory they use) are loaded with a
 * dynamic `import()` the first time `enabled` is `true`.
 */
export function usePakHints(input: UsePakHintsInput): PakHints {
  const [module, setModule] = useState<PakHintsModule | null>(null);
  const [failed, setFailed] = useState(false);
  const { enabled } = input;

  useEffect(() => {
    if (!enabled || module) return;
    let active = true;
    loadPakHints().then(
      (loaded) => {
        if (active) setModule(loaded);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [enabled, module]);

  const labels = input.labels ?? resolveLabels('en');
  const { address, landmark, city, postalCode, mobile } = input;

  return useMemo<PakHints>(() => {
    const off: PakHints = {
      status: 'off',
      address: null,
      phoneFlags: [],
      postalCodeCity: null,
      messages: [],
    };
    if (!enabled) return off;
    if (!module) return { ...off, status: failed ? 'error' : 'loading' };

    const messages: string[] = [];
    let score: AddressScore | null = null;
    if ((address ?? '').trim()) {
      score = module.scoreAddress(
        addressForScoring({ address, landmark, city, postalCode }),
      );
      messages.push(labels.addressScore(score.score));
      if (score.missing.length > 0) {
        messages.push(
          labels.addressMissing(
            score.missing.map((part) => labels.addressParts[part]),
          ),
        );
      }
    }

    let phoneFlags: PhoneRiskFlag[] = [];
    const phoneState = checkPhoneInput(mobile ?? '');
    if (phoneState === 'valid' || phoneState === 'invalid') {
      phoneFlags = module
        .phoneRiskSignals(mobile ?? '')
        .filter((flag) => flag !== 'invalid');
      for (const flag of phoneFlags) messages.push(labels.phoneFlags[flag]);
    }

    let postalCodeCity: string | null = null;
    const code = (postalCode ?? '').trim();
    if (/^\d{5}$/.test(code) && (city ?? '').trim()) {
      const found = module.getCityByPostalCode(code);
      if (found && !sameName(found, city ?? '')) {
        postalCodeCity = found;
        messages.push(labels.postalCodeCity(code, found));
      }
    }

    return {
      status: 'ready',
      address: score,
      phoneFlags,
      postalCodeCity,
      messages,
    };
  }, [
    enabled,
    module,
    failed,
    address,
    landmark,
    city,
    postalCode,
    mobile,
    labels,
  ]);
}
