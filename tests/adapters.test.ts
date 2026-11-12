import { validateSync } from 'class-validator';
import Joi from 'joi';
import * as s from 'superstruct';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { object } from 'yup';
import { z } from 'zod';
import {
  IsCNIC,
  IsPakIBAN,
  IsPakPhone,
  pk as pkClassValidator,
} from '../src/adapters/class-validator.js';
import { pk as pkJoi } from '../src/adapters/joi.js';
import { pk as pkSuperstruct } from '../src/adapters/superstruct.js';
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

describe('joi adapter', () => {
  const form = Joi.object({
    cnic: pkJoi.cnic().required(),
    phone: pkJoi.phone(),
    iban: pkJoi.iban({ message: 'Bad IBAN' }),
  });

  it('accepts valid values', () => {
    expect(form.validate(VALID).error).toBeUndefined();
  });

  it('lets optional fields be missing', () => {
    expect(form.validate({ cnic: VALID.cnic }).error).toBeUndefined();
  });

  it('rejects invalid values with messages', () => {
    const { error } = form.validate(INVALID, { abortEarly: false });
    expect(error?.details.map((d) => d.message)).toEqual([
      'Invalid CNIC number',
      'Invalid Pakistani mobile number',
      'Bad IBAN',
    ]);
  });
});

describe('superstruct adapter', () => {
  const form = s.object({
    cnic: pkSuperstruct.cnic(),
    phone: s.optional(pkSuperstruct.phone()),
    iban: pkSuperstruct.iban({ message: 'Bad IBAN' }),
  });

  it('accepts valid values', () => {
    expect(s.is(VALID, form)).toBe(true);
    expect(s.is({ cnic: VALID.cnic, iban: VALID.iban }, form)).toBe(true);
  });

  it('rejects invalid values with messages', () => {
    const [error] = s.validate(INVALID, form);
    expect(error?.failures().map((f) => f.message)).toEqual([
      'Invalid CNIC number',
      'Invalid Pakistani mobile number',
      'Bad IBAN',
    ]);
  });
});

describe('class-validator adapter', () => {
  // Decorators are applied by hand so the tests do not need decorator syntax.
  class CustomerDto {
    cnic!: string;
    phone?: string;
    iban!: string;
  }
  IsCNIC()(CustomerDto.prototype, 'cnic');
  IsPakPhone()(CustomerDto.prototype, 'phone');
  IsPakIBAN({ message: 'Bad IBAN' })(CustomerDto.prototype, 'iban');

  const messages = (values: Partial<CustomerDto>) =>
    validateSync(Object.assign(new CustomerDto(), values)).flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );

  it('accepts valid values', () => {
    expect(messages(VALID)).toEqual([]);
  });

  it('rejects invalid values with messages', () => {
    expect(messages(INVALID)).toEqual([
      'Invalid CNIC number',
      'Invalid Pakistani mobile number',
      'Bad IBAN',
    ]);
  });

  it('rejects values that are not strings', () => {
    expect(
      messages({ cnic: 3520212345671 as unknown as string, iban: VALID.iban }),
    ).toEqual(['Invalid CNIC number', 'Invalid Pakistani mobile number']);
  });

  it('validates every item of an array with `each`', () => {
    class ContactsDto {
      phones!: string[];
    }
    pkClassValidator.phone({ each: true })(ContactsDto.prototype, 'phones');
    const errors = (phones: string[]) =>
      validateSync(Object.assign(new ContactsDto(), { phones })).length;
    expect(errors(['03001234567', '03211234567'])).toBe(0);
    expect(errors(['03001234567', '03601234567'])).toBe(1);
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
    for (const adapter of [
      pkValibot,
      pkYup,
      pkJoi,
      pkSuperstruct,
      pkClassValidator,
    ]) {
      expect(Object.keys(adapter)).toEqual(Object.keys(pkZod));
    }
  });
});
