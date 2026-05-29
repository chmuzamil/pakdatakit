import { describe, expect, it } from 'vitest';
import { createWhatsAppLink } from '../src/whatsapp.js';

describe('createWhatsAppLink', () => {
  it('creates link from local phone', () => {
    expect(createWhatsAppLink('03001234567')).toBe(
      'https://wa.me/923001234567',
    );
  });

  it('creates link from international phone', () => {
    expect(createWhatsAppLink('+923001234567')).toBe(
      'https://wa.me/923001234567',
    );
  });

  it('creates link from short phone', () => {
    expect(createWhatsAppLink('3001234567')).toBe(
      'https://wa.me/923001234567',
    );
  });

  it('creates link with message', () => {
    expect(createWhatsAppLink('03001234567', 'Assalamualaikum')).toBe(
      'https://wa.me/923001234567?text=Assalamualaikum',
    );
  });

  it('encodes special characters in message', () => {
    expect(createWhatsAppLink('03001234567', 'Hello & welcome!')).toBe(
      'https://wa.me/923001234567?text=Hello%20%26%20welcome!',
    );
  });

  it('returns empty string for invalid phone', () => {
    expect(createWhatsAppLink('invalid')).toBe('');
  });
});
