import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { object } from 'yup';
import { z } from 'zod';
import { pk as pkValibot } from '../src/adapters/valibot.js';
import { pk as pkYup } from '../src/adapters/yup.js';
import { pk as pkZod } from '../src/adapters/zod.js';

const VALID = {
  cnic: '35202-1234567-1',
  phone: '0300 1234567',
  iban: 'PK36SCBL0000001123456702',
};

const INVALID = {
  cnic: '00000-0000000-0',
  phone: '03601234567',
  iban: 'PK37SCBL0000001123456702',
};

describe('zod adapter', () => {
  const form = z.object({
    cnic: pkZod.cnic(),
    phone: pkZod.phone(),
    iban: pkZod.iban({ message: 'Bad IBAN' }),
  });

  it('accepts valid values', () => {
    expect(form.safeParse(VALID).success).toBe(true);
  });

  it('rejects invalid values with messages', () => {
    const result = form.safeParse(INVALID);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual([
      'Invalid CNIC number',
      'Invalid Pakistani mobile number',
      'Bad IBAN',
    ]);
  });
});

describe('valibot adapter', () => {
  const form = v.object({
    cnic: pkValibot.cnic(),
    phone: pkValibot.phone(),
    iban: pkValibot.iban({ message: 'Bad IBAN' }),
  });

  it('accepts valid values', () => {
    expect(v.safeParse(form, VALID).success).toBe(true);
  });

  it('rejects invalid values with messages', () => {
    const result = v.safeParse(form, INVALID);
    expect(result.success).toBe(false);
    expect(result.issues?.map((i) => i.message)).toEqual([
      'Invalid CNIC number',
      'Invalid Pakistani mobile number',
      'Bad IBAN',
    ]);
  });
});

describe('yup adapter', () => {
  const form = object({
    cnic: pkYup.cnic().required(),
    phone: pkYup.phone(),
    iban: pkYup.iban({ message: 'Bad IBAN' }),
  });

  it('accepts valid values', async () => {
    await expect(form.isValid(VALID)).resolves.toBe(true);
  });

  it('lets optional fields be empty', async () => {
    await expect(form.isValid({ cnic: VALID.cnic })).resolves.toBe(true);
  });

  it('rejects invalid values with messages', async () => {
    const errors = await form
      .validate(INVALID, { abortEarly: false })
      .catch((error: { errors: string[] }) => error.errors);
    expect(errors).toEqual([
      'Invalid CNIC number',
      'Invalid Pakistani mobile number',
      'Bad IBAN',
    ]);
  });
});

describe('tax and landline rules', () => {
  const form = z.object({
    ntn: pkZod.ntn(),
    strn: pkZod.strn(),
    landline: pkZod.landline(),
  });

  it('validates NTN, STRN and landline fields', () => {
    expect(
      form.safeParse({
        ntn: '0622438-9',
        strn: '17-00-3761-882-19',
        landline: '042-35761234',
      }).success,
    ).toBe(true);
    expect(
      form.safeParse({ ntn: '123', strn: '1', landline: '03001234567' }).error
        ?.issues.length,
    ).toBe(3);
  });

  it('exposes the same rules in every adapter', () => {
    expect(Object.keys(pkValibot)).toEqual(Object.keys(pkZod));
    expect(Object.keys(pkYup)).toEqual(Object.keys(pkZod));
  });
});
