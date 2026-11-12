import Joi from 'joi';
import { RULES, type AdapterOptions, type RuleName } from './rules.js';

function schema(name: RuleName) {
  const rule = RULES[name];
  return (options: AdapterOptions = {}) =>
    Joi.string().custom((value: string, helpers) =>
      rule.test(value)
        ? value
        : helpers.message({ custom: options.message ?? rule.message }),
    );
}

/**
 * Joi schemas for Pakistani identifiers.
 *
 * @example
 * import Joi from 'joi';
 * import { pk } from 'pakdatakit/joi';
 *
 * const form = Joi.object({ cnic: pk.cnic().required(), phone: pk.phone() });
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
