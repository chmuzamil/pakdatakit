/** Result of reformatting an edited value. */
export interface FormatResult {
  /** Value to show in the input. */
  value: string;
  /** Where to put the caret in `value`. */
  caret: number;
}

/** Number of significant characters in `text` before `end`. */
function countSignificant(
  text: string,
  end: number,
  isSignificant: (ch: string) => boolean,
): number {
  let count = 0;
  for (let i = 0; i < end && i < text.length; i++) {
    if (isSignificant(text.charAt(i))) count++;
  }
  return count;
}

/** Index just after the `count`-th significant character of `text`. */
function indexAfter(
  text: string,
  count: number,
  isSignificant: (ch: string) => boolean,
): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (isSignificant(text.charAt(i)) && ++seen === count) return i + 1;
  }
  return text.length;
}

/**
 * Reformats an edited input value and works out where the caret belongs.
 *
 * The caret stays after the same number of significant characters (digits,
 * or letters and digits for IBANs) as before formatting, so separators the
 * formatter inserts or removes do not make it jump. When the caret was at the
 * end it stays at the end. Deleting only a separator (Backspace right after a
 * dash or space) deletes the character next to it instead, since the
 * formatter would put the separator straight back.
 *
 * @param raw - Value of the input after the edit
 * @param caret - Caret position after the edit
 * @param previous - Value shown before the edit
 * @param format - Formatter such as `formatCNICInput`
 * @param isSignificant - Whether a character is part of the data, not a separator
 * @param inputType - `InputEvent.inputType` of the edit, if known
 */
export function reformat(
  raw: string,
  caret: number,
  previous: string,
  format: (value: string) => string,
  isSignificant: (ch: string) => boolean,
  inputType?: string,
): FormatResult {
  let text = raw;
  let pos = Math.max(0, Math.min(caret, raw.length));

  const removedOnlySeparators =
    inputType !== undefined &&
    inputType.startsWith('delete') &&
    raw.length < previous.length &&
    countSignificant(raw, raw.length, isSignificant) ===
      countSignificant(previous, previous.length, isSignificant);

  if (removedOnlySeparators) {
    if (inputType === 'deleteContentForward') {
      for (let i = pos; i < text.length; i++) {
        if (isSignificant(text.charAt(i))) {
          text = text.slice(0, i) + text.slice(i + 1);
          break;
        }
      }
    } else if (inputType === 'deleteContentBackward') {
      for (let i = pos - 1; i >= 0; i--) {
        if (isSignificant(text.charAt(i))) {
          text = text.slice(0, i) + text.slice(i + 1);
          pos = i;
          break;
        }
      }
    }
  }

  const atEnd = pos >= text.length;
  const before = countSignificant(text, pos, isSignificant);
  const value = format(text);
  return {
    value,
    caret: atEnd
      ? value.length
      : Math.min(indexAfter(value, before, isSignificant), value.length),
  };
}

/** ASCII, Arabic-Indic and Extended Arabic-Indic (Urdu) digits. */
export function isDigit(ch: string): boolean {
  return /[0-9٠-٩۰-۹]/.test(ch);
}

/** Letters and digits, as used in IBANs. */
export function isAlphanumeric(ch: string): boolean {
  return /[A-Za-z0-9]/.test(ch);
}
