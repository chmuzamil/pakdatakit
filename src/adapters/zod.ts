import { z } from 'zod';
import { RULES, type AdapterOptions, type RuleName } from './rules.js';

function schema(name: RuleName) {
  const rule = RULES[name];
  return (options: AdapterOptions = {}) =>
    z.string().refine(rule.test, { message: options.message ?? rule.message });
}

/**
 * Zod schemas for Pakistani identifiers.
 *
 * @example
 * import { z } from 'zod';
 * import { pk } from 'pakdatakit/zod';
 *
 * const form = z.object({ cnic: pk.cnic(), phone: pk.phone() });
 */
export const pk = {
  cnic: schema('cnic'),
  phone: schema('phone'),
  iban: schema('iban'),
};

export type { AdapterOptions };
