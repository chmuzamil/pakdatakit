import { Pipe, PipeTransform } from '@angular/core';
import { getCNICInfo } from 'pakdatakit/cnic';
import { formatLakh, formatPKR } from 'pakdatakit/format';
import { validateIBAN } from 'pakdatakit/iban';
import { formatIBANInput } from 'pakdatakit/input';
import { formatPhone } from 'pakdatakit/phone';

/** How `pakPhone` writes a mobile number. */
export type PakPhoneStyle = 'local' | 'international' | 'e164';

/** How `pakPkr` writes an amount. */
export type PakPkrStyle = 'rupees' | 'lakh';

const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

/**
 * Formats a CNIC as `35202-1234567-1`. A value that is not a valid CNIC is
 * shown unchanged; `null` and `undefined` give an empty string.
 *
 * @example
 * {{ customer.cnic | pakCnic }}
 */
@Pipe({ name: 'pakCnic', standalone: true })
export class PakCnicPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    const raw = text(value);
    return getCNICInfo(raw)?.formatted ?? raw;
  }
}

/**
 * Formats a Pakistani mobile number: `0300-1234567` (default),
 * `+92 300 1234567` or `+923001234567`. A value that is not a valid mobile
 * number is shown unchanged.
 *
 * @example
 * {{ customer.phone | pakPhone }}
 * {{ customer.phone | pakPhone: 'international' }}
 */
@Pipe({ name: 'pakPhone', standalone: true })
export class PakPhonePipe implements PipeTransform {
  transform(
    value: string | null | undefined,
    style: PakPhoneStyle = 'local',
  ): string {
    const raw = text(value);
    const e164 = formatPhone(raw);
    if (e164 === null) return raw;
    if (style === 'e164') return e164;
    const national = e164.slice(3);
    return style === 'international'
      ? `+92 ${national.slice(0, 3)} ${national.slice(3)}`
      : `0${national.slice(0, 3)}-${national.slice(3)}`;
  }
}

/**
 * Formats a Pakistani IBAN in groups of four: `PK36 SCBL 0000 0011 2345 6702`.
 * A value that is not a valid IBAN is shown unchanged.
 *
 * @example
 * {{ account.iban | pakIban }}
 */
@Pipe({ name: 'pakIban', standalone: true })
export class PakIbanPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    const raw = text(value);
    return validateIBAN(raw) ? formatIBANInput(raw) : raw;
  }
}

/**
 * Formats an amount in rupees: `Rs. 150,000` (default), or with lakh and
 * crore units (`25 Lakh`). Text that is a number is accepted; `null`,
 * `undefined`, empty text and anything that is not a finite number give an
 * empty string.
 *
 * @example
 * {{ order.total | pakPkr }}
 * {{ property.price | pakPkr: 'lakh' }}
 */
@Pipe({ name: 'pakPkr', standalone: true })
export class PakPkrPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    style: PakPkrStyle = 'rupees',
  ): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' && value.trim() === '') return '';
    const amount = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(amount)) return '';
    return style === 'lakh' ? formatLakh(amount) : formatPKR(amount);
  }
}
