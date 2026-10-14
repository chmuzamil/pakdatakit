/**
 * EMVCo Merchant-Presented QR (MPM) encoding: a flat list of
 * `ID (2 digits) + length (2 digits) + value` fields, some of which are
 * templates containing nested fields, ending with a CRC in field 63.
 */

/** A parsed EMV field. `children` is set for template fields. */
export interface EmvField {
  id: string;
  value: string;
  children?: EmvField[];
}

/** Template field IDs whose values contain nested fields. */
export function isTemplateId(id: string): boolean {
  const n = Number(id);
  return (n >= 26 && n <= 51) || n === 62 || n === 64 || (n >= 80 && n <= 99);
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as 4 uppercase hex digits. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Encodes one field. Length counts characters, as the EMV spec requires. */
export function encodeField(id: string, value: string): string {
  const length = [...value].length;
  if (length > 99) {
    throw new RangeError(`EMV field ${id} is longer than 99 characters`);
  }
  return `${id}${String(length).padStart(2, '0')}${value}`;
}

/**
 * Parses EMV fields. Throws a `SyntaxError` if the data is malformed.
 *
 * @param data - Encoded fields
 * @param nested - Whether to parse template fields into `children`
 */
export function parseFields(data: string, nested = true): EmvField[] {
  const chars = [...data];
  const fields: EmvField[] = [];
  let i = 0;

  while (i < chars.length) {
    const header = chars.slice(i, i + 4).join('');
    if (!/^\d{4}$/.test(header)) {
      throw new SyntaxError(`Malformed EMV field at position ${i}`);
    }
    const id = header.slice(0, 2);
    const length = Number(header.slice(2));
    if (i + 4 + length > chars.length) {
      throw new SyntaxError(`EMV field ${id} is truncated`);
    }
    const value = chars.slice(i + 4, i + 4 + length).join('');
    const field: EmvField = { id, value };
    if (nested && isTemplateId(id)) {
      field.children = parseFields(value, false);
    }
    fields.push(field);
    i += 4 + length;
  }

  return fields;
}

/** Appends the CRC field (63) to an encoded payload. */
export function withCrc(payload: string): string {
  const data = `${payload}6304`;
  return `${data}${crc16(data)}`;
}
