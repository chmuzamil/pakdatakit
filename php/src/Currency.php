<?php

declare(strict_types=1);

namespace PakDataKit;

use InvalidArgumentException;
use PakDataKit\Internal\Js;

/**
 * Pakistani Rupee and lakh/crore formatting, and reading amounts as typed.
 * Does not use number_format, sprintf or the locale.
 */
final class Currency
{
    private const LAKH = 100_000.0;
    private const CRORE = 10_000_000.0;

    /** Whitespace around and inside an amount: space, tab, line breaks, no-break spaces. */
    private const SPACE = '[ \t\n\r\x{00A0}\x{202F}]';
    /** Rs, Rs., PKR or ₨ (after ASCII letters are lower-cased). */
    private const CURRENCY = '(rs\.?|pkr|\x{20A8})';
    /**
     * 1,234,567 (international) | 12,34,567 (Pakistani) | 1234567, then an
     * optional decimal part.
     */
    private const NUMBER = '([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,2}(?:,[0-9]{2})+,[0-9]{3}|[0-9]+)?(?:\.([0-9]*))?';
    /** × 1,000: k, thousand(s), hazar, ہزار. */
    private const THOUSAND = 'k|thousands?|hazar|\x{06C1}\x{0632}\x{0627}\x{0631}';
    /** × 100,000: lakh(s), lac(s), لاکھ. */
    private const LAKH_UNIT = 'lakhs?|lacs?|\x{0644}\x{0627}\x{06A9}\x{06BE}';
    /** × 10,000,000: crore(s), cr, کروڑ. */
    private const CRORE_UNIT = 'crores?|cr|\x{06A9}\x{0631}\x{0648}\x{0691}';
    private const AMOUNT = '/^(?:' . self::CURRENCY . self::SPACE . '*)?' . self::NUMBER
        . '(?:' . self::SPACE . '*(' . self::THOUSAND . '|' . self::LAKH_UNIT . '|' . self::CRORE_UNIT . '))?'
        . '(?:' . self::SPACE . '*' . self::CURRENCY . ')?(?:' . self::SPACE . '*(\/-))?\z/u';

    /**
     * The largest amount, in paisa: Rs. 50 trillion (50 lakh crore). Below 2^46
     * rupees (about 70 trillion) a float holds every paisa exactly.
     */
    private const MAX_PAISA = 5_000_000_000_000_000;

    /**
     * Formats an amount as `Rs. 150,000`, rounded to whole rupees.
     *
     * @throws InvalidArgumentException if the amount is NaN or infinite
     */
    public static function formatPkr(int|float $amount): string
    {
        $amount = self::finite($amount);
        $rounded = Js::round(abs($amount));
        $sign = $amount < 0 && $rounded != 0.0 ? '-' : '';
        return $sign . 'Rs. ' . Js::groupInteger($rounded);
    }

    /**
     * Formats an amount with lakh/crore units (`25 Lakh`, `1 Crore`). Values
     * are rounded to two decimals before the unit is chosen, so `9999999`
     * gives `1 Crore`. Smaller amounts fall back to formatPkr().
     *
     * @throws InvalidArgumentException if the amount is NaN or infinite
     */
    public static function formatLakh(int|float $amount): string
    {
        $amount = self::finite($amount);
        $sign = $amount < 0 ? '-' : '';
        $absolute = abs($amount);
        $crores = self::roundTo2($absolute / self::CRORE);
        if ($crores >= 1) {
            return $sign . Js::numberToString($crores) . ' Crore';
        }
        $lakhs = self::roundTo2($absolute / self::LAKH);
        return $lakhs >= 1 ? $sign . Js::numberToString($lakhs) . ' Lakh' : self::formatPkr($amount);
    }

    /** formatPkr() without throwing: null for NaN or an infinite amount. */
    public static function tryFormatPkr(int|float $amount): ?string
    {
        return is_finite((float) $amount) ? self::formatPkr($amount) : null;
    }

    /** formatLakh() without throwing: null for NaN or an infinite amount. */
    public static function tryFormatLakh(int|float $amount): ?string
    {
        return is_finite((float) $amount) ? self::formatLakh($amount) : null;
    }

    /**
     * Reads a rupee amount the way people type it in Pakistan, and returns it in
     * rupees, rounded half-up to the paisa. Returns `null` for anything that is
     * not exactly one non-negative amount; it never throws.
     *
     * Accepted:
     * - digits, with or without grouping: `150000`, `150,000` (international) or
     *   `1,50,000` (Pakistani: groups of two, then three), and decimals
     *   (`1,234.50`, `.5`, `5.`); a grouping must be complete and consistent;
     * - Urdu (`۱۵۰۰۰۰`) and Arabic-Indic (`١٥٠٠٠٠`) digits, also mixed with
     *   0-9, and the Arabic decimal and thousands separators (`٫`, `٬`);
     * - one currency mark before or after the number: `Rs`, `Rs.`, `PKR` or `₨`
     *   (any case), and a trailing `/-` (`Rs. 5,000/-`);
     * - one shorthand unit after the number, with or without a space, in any
     *   case: `k`, `thousand(s)`, `hazar`, `ہزار` (× 1,000); `lakh(s)`, `lac(s)`,
     *   `لاکھ` (× 100,000); `crore(s)`, `cr`, `کروڑ` (× 10,000,000). Decimals
     *   work with units: `1.5 lakh` is 150,000 and `2.25cr` is 22,500,000;
     * - whitespace around and between the parts (spaces, tabs, line breaks and
     *   no-break spaces).
     *
     * Rejected (`null`): empty input, negative or signed amounts (`-500`,
     * `+500`), ranges (`5-10k`), more than one number (`500 600`), two currency
     * marks or two units, leftover letters (`500 rupees`, `5kk`), grouping that
     * could be read two ways or is broken (`1,50`, `1.500,00`, `1,5000`),
     * amounts over Rs. 50 trillion (50 lakh crore), beyond which a number can no
     * longer hold every paisa exactly, and values that are not strings.
     *
     * The arithmetic is done on the digits, so the result is exact: `1.005`
     * rounds to 1.01 and `1.5 lakh` is exactly 150000.
     *
     * ```php
     * Currency::parseAmount('Rs. 1,50,000/-'); // value 150000.0, raw 'Rs. 1,50,000/-'
     * Currency::parseAmount('2.25cr');         // value 22500000.0, raw '2.25cr'
     * Currency::parseAmount('5-10k');          // null
     * ```
     *
     * @param mixed $input The amount as typed
     * @return ParsedAmount|null `value` and `raw`, or null if the input is not one amount
     */
    public static function parseAmount(mixed $input): ?ParsedAmount
    {
        if (!is_string($input)) {
            return null;
        }
        $raw = Js::replace('/^' . self::SPACE . '+|' . self::SPACE . '+\z/u', '', $input);
        // Urdu (Extended Arabic-Indic) and Arabic-Indic digits, the Arabic
        // decimal and thousands separators, then ASCII-only lower-casing.
        $text = strtr(Js::toAsciiDigits($raw), ['٫' => '.', '٬' => ',']);
        $text = strtr($text, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz');
        $match = Js::match(self::AMOUNT, $text);
        if ($match === null) {
            return null;
        }
        $before = $match[1] ?? null;
        $whole = $match[2] ?? '';
        $fraction = $match[3] ?? null;
        $unit = $match[4] ?? null;
        $after = $match[5] ?? null;
        if ($before !== null && $after !== null) {
            return null;
        }
        if ($whole === '' && ($fraction === null || $fraction === '')) {
            return null;
        }

        // Move the decimal point by the unit's power of ten, on the digit string.
        $wholeDigits = str_replace(',', '', $whole);
        $digits = $wholeDigits . ($fraction ?? '');
        $point = strlen($wholeDigits) + self::unitExponent($unit);
        $padded = str_pad($digits, $point + 3, '0');
        $rupees = substr($padded, 0, $point);
        $cents = ltrim(($rupees === '' ? '0' : $rupees) . substr($padded, $point, 2), '0');
        // Check the length first, so a long digit string cannot overflow an int.
        if (strlen($cents) > strlen((string) self::MAX_PAISA)) {
            return null;
        }
        $paisa = (int) $cents;
        if (ord($padded[$point + 2]) >= 0x35) {
            $paisa += 1; // half-up
        }
        if ($paisa > self::MAX_PAISA) {
            return null;
        }
        return new ParsedAmount($paisa / 100.0, $raw);
    }

    /**
     * Writes back an amount typed in any form parseAmount() accepts, for
     * showing next to the field ("= Rs. 150,000"): `Rs.`, international
     * grouping, and paisa only when there are any (`Rs. 1,234.50`). Returns
     * `null` when parseAmount() does; it never throws.
     *
     * @param mixed $input The amount as typed
     * @return string|null E.g. `"Rs. 150,000"` for `"1.5 lakh"`, or null
     */
    public static function formatAmountInput(mixed $input): ?string
    {
        $parsed = self::parseAmount($input);
        if ($parsed === null) {
            return null;
        }
        $cents = (int) Js::round($parsed->value * 100);
        $rupees = strrev(implode(',', str_split(strrev((string) intdiv($cents, 100)), 3)));
        $paisa = $cents % 100;
        return 'Rs. ' . $rupees . ($paisa !== 0 ? '.' . str_pad((string) $paisa, 2, '0', STR_PAD_LEFT) : '');
    }

    /** The power of ten a shorthand unit multiplies by. */
    private static function unitExponent(?string $unit): int
    {
        if ($unit === null) {
            return 0;
        }
        if (Js::test('/^(?:' . self::THOUSAND . ')\z/u', $unit)) {
            return 3;
        }
        if (Js::test('/^(?:' . self::LAKH_UNIT . ')\z/u', $unit)) {
            return 5;
        }
        return 7;
    }

    private static function roundTo2(float $value): float
    {
        return Js::round($value * 100) / 100;
    }

    private static function finite(int|float $amount): float
    {
        $amount = (float) $amount;
        if (!is_finite($amount)) {
            throw new InvalidArgumentException('Amount must be a finite number');
        }
        return $amount;
    }
}
