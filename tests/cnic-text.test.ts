import { describe, expect, it } from 'vitest';
import { findCNICs, maskCNICs, validateCNIC } from '../src/cnic.js';

const URDU = (digits: string) =>
  digits.replace(/\d/g, (d) => String.fromCharCode(0x06f0 + Number(d)));
const ARABIC = (digits: string) =>
  digits.replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));

describe('findCNICs', () => {
  it('finds a CNIC with its position', () => {
    const text = 'CNIC: 35202-1234567-1, phone 0300-1234567';
    expect(findCNICs(text)).toEqual([
      {
        raw: '35202-1234567-1',
        digits: '3520212345671',
        formatted: '35202-1234567-1',
        start: 6,
        end: 21,
      },
    ]);
    const [match] = findCNICs(text);
    expect(text.slice(match?.start, match?.end)).toBe('35202-1234567-1');
  });

  it('accepts no, matching or mixed separators', () => {
    for (const raw of [
      '3520212345671',
      '35202-1234567-1',
      '35202 1234567-1',
      '35202.1234567 1',
      '35202–1234567—1',
    ])
      expect(findCNICs(`id ${raw}.`).map((m) => m.digits)).toEqual([
        '3520212345671',
      ]);
  });

  it('reads Urdu and Arabic-Indic digits, even mixed', () => {
    expect(
      findCNICs(`${URDU('35202')}-1234567-${ARABIC('1')}`)[0],
    ).toMatchObject({ digits: '3520212345671', start: 0, end: 15 });
    expect(findCNICs(ARABIC('3520212345671'))).toHaveLength(1);
  });

  it('does not cut a CNIC out of a longer digit run', () => {
    expect(findCNICs('1235202-1234567-1')).toEqual([]);
    expect(findCNICs('35202-1234567-12')).toEqual([]);
    expect(findCNICs(`${URDU('1')}35202-1234567-1`)).toEqual([]);
    expect(findCNICs('x35202-1234567-1y')).toHaveLength(1);
  });

  it('needs a province digit and 5-7-1 groups', () => {
    expect(findCNICs('05202-1234567-1')).toEqual([]);
    expect(findCNICs('95202-1234567-1')).toEqual([]);
    expect(findCNICs('35202-123456-1')).toEqual([]);
    expect(findCNICs('35202--1234567-1')).toEqual([]);
  });

  it('also matches other 13-digit numbers that start with 1-8', () => {
    expect(findCNICs('Account: 1234567890123')).toHaveLength(1);
  });

  it('is looser than validateCNIC, which stays strict', () => {
    expect(findCNICs('35202 1234567-1')).toHaveLength(1);
    expect(validateCNIC('35202 1234567-1')).toBe(false);
  });

  it('never throws', () => {
    expect(findCNICs(null as unknown as string)).toEqual([]);
    expect(findCNICs('')).toEqual([]);
  });
});

describe('maskCNICs', () => {
  it('masks every digit and keeps the separators', () => {
    expect(maskCNICs('My CNIC is 35202-1234567-1')).toEqual({
      text: 'My CNIC is XXXXX-XXXXXXX-X',
      count: 1,
    });
    expect(maskCNICs('35202 1234567 1', { mask: '*' })).toEqual({
      text: '***** ******* *',
      count: 1,
    });
  });

  it('counts each CNIC and leaves other numbers alone', () => {
    expect(
      maskCNICs('35202-1234567-1 / 61101-7654321-2 / 0300-1234567'),
    ).toEqual({
      text: 'XXXXX-XXXXXXX-X / XXXXX-XXXXXXX-X / 0300-1234567',
      count: 2,
    });
  });

  it('masks Urdu digits too', () => {
    expect(maskCNICs(URDU('3520212345671')).text).toBe('XXXXXXXXXXXXX');
  });

  it('never throws', () => {
    expect(maskCNICs(42 as unknown as string)).toEqual({ text: '', count: 0 });
    expect(maskCNICs('no ids')).toEqual({ text: 'no ids', count: 0 });
  });
});
