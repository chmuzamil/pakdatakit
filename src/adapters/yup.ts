import { string } from 'yup';
import { RULES, type AdapterOptions, type RuleName } from './rules.js';

function schema(name: RuleName) {
  const rule = RULES[name];
  return (options: AdapterOptions = {}) =>
    string().test(
      `pk-${name}`,
      options.message ?? rule.message,
      // Leave empty values to .required() so optional fields still pass.
      (value) =>
        value === undefined ||
        value === null ||
        value === '' ||
        rule.test(value),
    );
}

/**
 * Yup schemas for Pakistani identifiers.
 *
 * @example
 * import { object } from 'yup';
 * import { pk } from 'pakdatakit/yup';
 *
 * const form = object({ cnic: pk.cnic().required(), phone: pk.phone() });
 */
export const pk = {
  cnic: schema('cnic'),
  phone: schema('phone'),
  iban: schema('iban'),
};

export type { AdapterOptions };
