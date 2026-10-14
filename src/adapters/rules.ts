import { validateCNIC } from '../cnic.js';
import { validateIBAN } from '../iban.js';
import { validatePhone } from '../phone.js';

/** A string check shared by the form-library adapters. */
export interface Rule {
  test: (value: string) => boolean;
  message: string;
}

/** Checks exposed by every adapter, keyed by the factory name. */
export const RULES = {
  cnic: { test: validateCNIC, message: 'Invalid CNIC number' },
  phone: { test: validatePhone, message: 'Invalid Pakistani mobile number' },
  iban: { test: validateIBAN, message: 'Invalid Pakistani IBAN' },
} satisfies Record<string, Rule>;

export type RuleName = keyof typeof RULES;

/** Options accepted by every adapter factory. */
export interface AdapterOptions {
  /** Error message to show instead of the default. */
  message?: string;
}
