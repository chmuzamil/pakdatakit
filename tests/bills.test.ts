import { describe, expect, it } from 'vitest';
import {
  parseElectricityRef,
  validateElectricityRef,
  validateGasConsumerNumber,
} from '../src/bills.js';

describe('parseElectricityRef', () => {
  it('reads a 14-digit DISCO reference, with or without U/R', () => {
    expect(parseElectricityRef('01141111234567')).toEqual({
      type: 'reference',
      digits: '01141111234567',
      formatted: '01 14111 1234567',
      urbanRural: null,
      disco: null,
    });
    expect(parseElectricityRef('02 12624 0045901 R')).toEqual({
      type: 'reference',
      digits: '02126240045901',
      formatted: '02 12624 0045901 R',
      urbanRural: 'R',
      disco: null,
    });
    expect(parseElectricityRef('01-14111-1234567u')?.urbanRural).toBe('U');
    expect(parseElectricityRef('۰۱۱۴۱۱۱۱۲۳۴۵۶۷')?.digits).toBe(
      '01141111234567',
    );
  });

  it('reads customer IDs and K-Electric accounts', () => {
    expect(parseElectricityRef('1234567890')).toMatchObject({
      type: 'customer-id',
      disco: null,
    });
    expect(parseElectricityRef('12345678901')?.type).toBe('customer-id');
    expect(parseElectricityRef('0400012345678')).toEqual({
      type: 'k-electric',
      digits: '0400012345678',
      formatted: '0400012345678',
      urbanRural: null,
      disco: 'K-Electric',
    });
  });

  it('rejects other lengths, letters and U/R on non-references', () => {
    for (const input of [
      '',
      '123',
      '123456789',
      '123456789012',
      '1234567890123',
      '0500012345678',
      '012345678901234',
      '1234567890R',
      '0114111123456X',
      'abcdefghijklmn',
      '01141111234567UR',
    ]) {
      expect(parseElectricityRef(input), input).toBeNull();
      expect(validateElectricityRef(input), input).toBe(false);
    }
    expect(parseElectricityRef(null as unknown as string)).toBeNull();
  });
});

describe('validateGasConsumerNumber', () => {
  it('checks the published lengths', () => {
    expect(validateGasConsumerNumber('12345678901', 'SNGPL')).toBe(true);
    expect(validateGasConsumerNumber('1234567890', 'SSGC')).toBe(true);
    expect(validateGasConsumerNumber('1234 5678 90', 'ssgc' as 'SSGC')).toBe(
      true,
    );
    expect(validateGasConsumerNumber('1234567890', 'SNGPL')).toBe(false);
    expect(validateGasConsumerNumber('12345678901', 'SSGC')).toBe(false);
    expect(
      validateGasConsumerNumber('1234567890', 'OGDCL' as unknown as 'SSGC'),
    ).toBe(false);
    expect(validateGasConsumerNumber('1234567890', '__proto__' as 'SSGC')).toBe(
      false,
    );
    expect(validateGasConsumerNumber(null as unknown as string, 'SSGC')).toBe(
      false,
    );
  });
});
