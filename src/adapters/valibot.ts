import * as v from 'valibot';
import { RULES, type AdapterOptions, type RuleName } from './rules.js';

function schema(name: RuleName) {
  const rule = RULES[name];
  return (options: AdapterOptions = {}) =>
    v.pipe(v.string(), v.check(rule.test, options.message ?? rule.message));
}

/**
 * Valibot schemas for Pakistani identifiers.
 *
 * @example
 * import * as v from 'valibot';
 * import { pk } from 'pakdatakit/valibot';
 *
 * const form = v.object({ cnic: pk.cnic(), phone: pk.phone() });
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
