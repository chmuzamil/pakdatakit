import { describe, expect, it } from 'vitest';
import {
  checkCNICInput,
  checkIBANInput,
  checkPhoneInput,
  formatCNICInput,
  formatIBANInput,
  formatPhoneInput,
} from '../src/input.js';

describe('formatCNICInput', () => {
  it.each([
    ['', ''],
    ['352', '352'],
    ['35202', '35202'],
    ['352021', '35202-1'],
    ['352021234567', '35202-1234567'],
    ['3520212345671', '35202-1234567-1'],
    ['35202-1234567-19999', '35202-1234567-1'],
    ['۳۵۲۰۲۱', '35202-1'],
    ['35a20b2', '35202'],
  ])('%j → %j', (input, output) => {
    expect(formatCNICInput(input)).toBe(output);
  });

  it('is stable when reapplied', () => {
    expect(formatCNICInput(formatCNICInput('3520212345671'))).toBe(
      '35202-1234567-1',
    );
  });
});

describe('checkCNICInput', () => {
  it.each([
    ['', 'empty'],
    ['  ', 'empty'],
    ['3', 'incomplete'],
    ['35202-12', 'incomplete'],
    ['35202-1234567-1', 'valid'],
    ['0', 'invalid'],
    ['95202', 'invalid'],
    ['35202-1234567-12', 'invalid'],
    ['35a', 'invalid'],
  ])('%j → %s', (input, state) => {
    expect(checkCNICInput(input)).toBe(state);
  });
});

describe('formatPhoneInput', () => {
  it.each([
    ['', ''],
    ['0', '0'],
    ['030', '030'],
    ['0300', '0300'],
    ['03001', '0300-1'],
    ['03001234567', '0300-1234567'],
    ['030012345678', '0300-1234567'],
    ['3001234567', '0300-1234567'],
    ['+92', '+92'],
    ['+92300', '+92 300'],
    ['+923001234567', '+92 300 1234567'],
    ['+92 (0) 300 1234567', '+92 300 1234567'],
    ['0092 300 1234567', '+92 300 1234567'],
  ])('%j → %j', (input, output) => {
    expect(formatPhoneInput(input)).toBe(output);
  });
});

describe('checkPhoneInput', () => {
  it.each([
    ['', 'empty'],
    ['0', 'incomplete'],
    ['03', 'incomplete'],
    ['0300', 'incomplete'],
    ['0300 12', 'incomplete'],
    ['+', 'incomplete'],
    ['+9', 'incomplete'],
    ['+92', 'incomplete'],
    ['92', 'incomplete'],
    ['00', 'incomplete'],
    ['0300-1234567', 'valid'],
    ['+92 300 1234567', 'valid'],
    ['3001234567', 'valid'],
    ['0360', 'invalid'],
    ['042', 'invalid'],
    ['+1 212', 'invalid'],
    ['030012345678', 'invalid'],
    ['0300-abc', 'invalid'],
  ])('%j → %s', (input, state) => {
    expect(checkPhoneInput(input)).toBe(state);
  });
});

describe('formatIBANInput', () => {
  it.each([
    ['', ''],
    ['pk36', 'PK36'],
    ['pk36s', 'PK36 S'],
    ['PK36SCBL0000001123456702', 'PK36 SCBL 0000 0011 2345 6702'],
    ['PK36 SCBL 0000 0011 2345 6702 99', 'PK36 SCBL 0000 0011 2345 6702'],
    ['pk-36-scbl', 'PK36 SCBL'],
  ])('%j → %j', (input, output) => {
    expect(formatIBANInput(input)).toBe(output);
  });
});

describe('checkIBANInput', () => {
  it.each([
    ['', 'empty'],
    ['P', 'incomplete'],
    ['pk3', 'incomplete'],
    ['PK36 SC', 'incomplete'],
    ['PK36 SCBL 0000', 'incomplete'],
    ['PK36 SCBL 0000 0011 2345 6702', 'valid'],
    ['PK37 SCBL 0000 0011 2345 6702', 'invalid'],
    ['GB29', 'invalid'],
    ['PKAB', 'invalid'],
    ['PK36 SC1', 'invalid'],
    ['PK36 SCBL 0000 0011 2345 67021', 'invalid'],
  ])('%j → %s', (input, state) => {
    expect(checkIBANInput(input)).toBe(state);
  });
});
