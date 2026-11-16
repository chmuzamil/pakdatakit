import { describe, expect, it } from 'vitest';
import {
  formatCNICInput,
  formatIBANInput,
  formatPhoneInput,
} from 'pakdatakit/input';
import { isAlphanumeric, isDigit, reformat } from '../src/caret';

const cnic = (raw: string, caret: number, previous: string, type?: string) =>
  reformat(raw, caret, previous, formatCNICInput, isDigit, type);

describe('reformat', () => {
  it('moves the caret past an inserted separator when typing at the end', () => {
    expect(cnic('352021', 6, '35202', 'insertText')).toEqual({
      value: '35202-1',
      caret: 7,
    });
  });

  it('keeps the caret after the same digit when editing in the middle', () => {
    // '35202-1234567-1' with '9' typed after '352' (caret at 4).
    expect(cnic('35292-1234567-1', 4, '35202-1234567-1', 'insertText')).toEqual(
      { value: '35292-1234567-1', caret: 4 },
    );
    // Typing a digit before a dash shifts the dash; caret stays after the new digit.
    expect(cnic('352029-1234', 6, '35202-1234', 'insertText')).toEqual({
      value: '35202-91234',
      caret: 7,
    });
  });

  it('keeps the caret in place when a character is rejected', () => {
    expect(cnic('35a202', 3, '35202', 'insertText')).toEqual({
      value: '35202',
      caret: 2,
    });
  });

  it('deletes the digit before a separator on Backspace', () => {
    // Caret right after the dash in '35202-1234'; Backspace removes the dash.
    expect(cnic('352021234', 5, '35202-1234', 'deleteContentBackward')).toEqual(
      { value: '35201-234', caret: 4 },
    );
  });

  it('deletes the digit after a separator on Delete', () => {
    expect(cnic('352021234', 5, '35202-1234', 'deleteContentForward')).toEqual({
      value: '35202-234',
      caret: 5,
    });
  });

  it('places the caret correctly for pasted unformatted text', () => {
    expect(cnic('3520212345671', 13, '', 'insertFromPaste')).toEqual({
      value: '35202-1234567-1',
      caret: 15,
    });
  });

  it('handles phone numbers with a country code', () => {
    expect(
      reformat('923001', 6, '92300', formatPhoneInput, isDigit, 'insertText'),
    ).toEqual({ value: '+92 300 1', caret: 9 });
    expect(
      reformat(
        '0300-91234',
        6,
        '0300-1234',
        formatPhoneInput,
        isDigit,
        'insertText',
      ),
    ).toEqual({ value: '0300-91234', caret: 6 });
  });

  it('handles IBAN letters and spaces', () => {
    expect(
      reformat(
        'pk36s',
        5,
        'PK36',
        formatIBANInput,
        isAlphanumeric,
        'insertText',
      ),
    ).toEqual({ value: 'PK36 S', caret: 6 });
    expect(
      reformat(
        'PK36 SXCBL',
        7,
        'PK36 SCBL',
        formatIBANInput,
        isAlphanumeric,
        'insertText',
      ),
    ).toEqual({ value: 'PK36 SXCB L', caret: 7 });
  });

  it('counts Urdu digits as digits', () => {
    expect(cnic('۳۵۲۰۲۱', 6, '', 'insertText')).toEqual({
      value: '35202-1',
      caret: 7,
    });
  });
});
