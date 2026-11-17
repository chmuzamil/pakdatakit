import { describe, expect, it } from 'vitest';
import cities from '../data/cities.json';
import { mapCourierStatus, normalizeCityForCourier } from '../src/courier.js';

describe('mapCourierStatus', () => {
  it('maps PostEx order statuses by name and ID', () => {
    expect(mapCourierStatus('PostEx', 'Delivered')).toBe('delivered');
    expect(mapCourierStatus('postex', 'OUT FOR DELIVERY')).toBe(
      'out-for-delivery',
    );
    expect(mapCourierStatus('PostEx', 'UnBooked')).toBe('pending');
    expect(mapCourierStatus('PostEx', 15)).toBe('picked-up');
    expect(mapCourierStatus('PostEx', '16')).toBe('returning');
    expect(mapCourierStatus('PostEx', 'En-Route to PostEx warehouse')).toBe(
      'in-transit',
    );
  });

  it('maps PostEx history codes and messages', () => {
    expect(mapCourierStatus('PostEx', '0005')).toBe('delivered');
    expect(mapCourierStatus('PostEx', 'At Merchant’s Warehouse')).toBe(
      'booked',
    );
    expect(
      mapCourierStatus('PostEx', 'Attempt Made: Customer not available'),
    ).toBe('attempted');
    expect(mapCourierStatus('PostEx', '0013')).toBe('attempted');
  });

  it('maps the one documented Leopards status', () => {
    expect(mapCourierStatus('Leopards', 'Returned to Shipper')).toBe(
      'returned',
    );
    expect(mapCourierStatus('LCS', 'returned  to shipper')).toBe('returned');
    expect(mapCourierStatus('Leopards', 'Delivered')).toBeNull();
  });

  it('returns null for couriers with no published status list', () => {
    for (const courier of ['TCS', 'M&P', 'MnP', 'Trax', 'BlueEx', 'Blue Ex']) {
      expect(mapCourierStatus(courier, 'Delivered'), courier).toBeNull();
    }
  });

  it('returns null for unknown couriers, statuses and odd input', () => {
    expect(mapCourierStatus('DHL', 'Delivered')).toBeNull();
    expect(mapCourierStatus('PostEx', 'teleported')).toBeNull();
    expect(mapCourierStatus('PostEx', 12)).toBeNull();
    expect(mapCourierStatus('PostEx', 1.5)).toBeNull();
    expect(mapCourierStatus('PostEx', -1)).toBeNull();
    expect(mapCourierStatus('PostEx', 'constructor')).toBeNull();
    expect(mapCourierStatus('constructor', 'x')).toBeNull();
    expect(mapCourierStatus(null as unknown as string, 'Delivered')).toBeNull();
    expect(mapCourierStatus('PostEx', null as unknown as string)).toBeNull();
  });
});

describe('normalizeCityForCourier', () => {
  it('maps short forms and old names to the city list', () => {
    expect(normalizeCityForCourier('LHR')).toBe('Lahore');
    expect(normalizeCityForCourier('Khi')).toBe('Karachi');
    expect(normalizeCityForCourier('Pindi')).toBe('Rawalpindi');
    expect(normalizeCityForCourier('Isb')).toBe('Islamabad');
    expect(normalizeCityForCourier('Lyallpur')).toBe('Faisalabad');
    expect(normalizeCityForCourier('D.G. Khan')).toBe('Dera Ghazi Khan');
    expect(normalizeCityForCourier('لاہور')).toBe('Lahore');
  });

  it('accepts names on the list in any case, and a trailing "city"', () => {
    expect(normalizeCityForCourier('  karachi  ')).toBe('Karachi');
    expect(normalizeCityForCourier('Karachi City')).toBe('Karachi');
    expect(normalizeCityForCourier('lhr city')).toBe('Lahore');
    for (const { city } of cities) {
      expect(normalizeCityForCourier(city.toUpperCase())).toBe(city);
    }
  });

  it('every alias points to a city on the list', () => {
    const listed = new Set(cities.map((c) => c.city));
    for (const alias of ['LHR', 'Khi', 'Pindi', 'Isb', 'Lyallpur', 'mzd']) {
      expect(listed).toContain(normalizeCityForCourier(alias));
    }
  });

  it('returns null for anything else', () => {
    expect(normalizeCityForCourier('Atlantis')).toBeNull();
    expect(normalizeCityForCourier('')).toBeNull();
    expect(normalizeCityForCourier('city')).toBeNull();
    expect(normalizeCityForCourier('constructor')).toBeNull();
    expect(normalizeCityForCourier(null as unknown as string)).toBeNull();
  });
});
