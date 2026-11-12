import { refine, string } from 'superstruct';
import { RULES, type AdapterOptions, type RuleName } from './rules.js';

function schema(name: RuleName) {
  const rule = RULES[name];
  return (options: AdapterOptions = {}) =>
    refine(
      string(),
      `pk-${name}`,
      (value) => rule.test(value) || (options.message ?? rule.message),
    );
}

/**
 * Superstruct structs for Pakistani identifiers.
 *
 * @example
 * import { object, optional } from 'superstruct';
 * import { pk } from 'pakdatakit/superstruct';
 *
 * const form = object({ cnic: pk.cnic(), phone: optional(pk.phone()) });
 */
export const pk = {
  cnic: schema('cnic'),
  phone: schema('phone'),
  iban: schema('iban'),
  ntn: schema('ntn'),
  strn: schema('strn'),
  landline: schema('landline'),
};

export type { AdapterOptions };
