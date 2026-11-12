import { describe, expect, it } from 'vitest';
import { parseVehiclePlate, validateVehiclePlate } from '../src/vehicle.js';

describe('parseVehiclePlate', () => {
  it('splits series and number', () => {
    expect(parseVehiclePlate('LEA-1234')).toEqual({
      series: 'LEA',
      number: '1234',
      year: null,
      formatted: 'LEA-1234',
    });
    expect(parseVehiclePlate('abc 123')?.formatted).toBe('ABC-123');
    expect(parseVehiclePlate('AB123')?.formatted).toBe('AB-123');
  });

  it('accepts 1–4 letters and 1–4 digits', () => {
    expect(parseVehiclePlate('A-1')?.formatted).toBe('A-1');
    expect(parseVehiclePlate('ABCD-001')).toMatchObject({
      series: 'ABCD',
      number: '001',
    });
  });

  it('reads the year on older Punjab plates', () => {
    expect(parseVehiclePlate('LEA-1234-19')).toEqual({
      series: 'LEA',
      number: '1234',
      year: '19',
      formatted: 'LEA-1234',
    });
    expect(parseVehiclePlate('LEA 1234 / 06')?.year).toBe('06');
  });

  it('converts Urdu digits', () => {
    expect(parseVehiclePlate('ABC-۱۲۳')?.number).toBe('123');
  });

  it('rejects other shapes', () => {
    expect(parseVehiclePlate('ABCDE-123')).toBeNull();
    expect(parseVehiclePlate('ABC-12345')).toBeNull();
    expect(parseVehiclePlate('123-ABC')).toBeNull();
    expect(parseVehiclePlate('ABC')).toBeNull();
    expect(parseVehiclePlate('ICT ABC-123')).toBeNull();
    expect(parseVehiclePlate('')).toBeNull();
  });
});

describe('validateVehiclePlate', () => {
  it('matches parseVehiclePlate', () => {
    expect(validateVehiclePlate('ABC-123')).toBe(true);
    expect(validateVehiclePlate('LEA-1234-19')).toBe(true);
    expect(validateVehiclePlate('ABC-12345')).toBe(false);
  });
});
