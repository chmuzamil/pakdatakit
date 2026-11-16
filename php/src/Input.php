<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Js;
use PakDataKit\Internal\Unicode;

/**
 * As-you-type formatters and checkers for form fields.
 *
 * Each check*() method returns one of:
 * - `empty`: nothing entered yet
 * - `incomplete`: what has been typed so far can still become valid
 * - `valid`: complete and valid
 * - `invalid`: cannot become valid by typing more
 *
 * None of these methods throw.
 */
final class Input
{
    public const EMPTY = 'empty';
    public const INCOMPLETE = 'incomplete';
    public const VALID = 'valid';
    public const INVALID = 'invalid';

    private const IBAN_SHAPE = '/^(P(K([0-9]([0-9]([A-Z]([A-Z]([A-Z]([A-Z]([A-Z0-9]{0,16})?)?)?)?)?)?)?)?)?\z/u';

    /** Formats a CNIC as the user types: `35202-1234567-1`. */
    public static function formatCnic(?string $value): string
    {
        $digits = substr(Js::replace('/[^0-9]/u', '', Js::toAsciiDigits($value ?? '')), 0, 13);
        if (strlen($digits) <= 5) {
            return $digits;
        }
        if (strlen($digits) <= 12) {
            return substr($digits, 0, 5) . '-' . substr($digits, 5);
        }
        return substr($digits, 0, 5) . '-' . substr($digits, 5, 7) . '-' . substr($digits, 12);
    }

    /** Checks a CNIC while the user is typing (`35202-12` is `incomplete`). */
    public static function checkCnic(?string $value): string
    {
        $text = self::clean($value ?? '');
        if ($text === '') {
            return self::EMPTY;
        }
        if (!Js::test('/^[0-9]+\z/u', $text) || strlen($text) > 13) {
            return self::INVALID;
        }
        if ($text[0] < '1' || $text[0] > '8') {
            return self::INVALID;
        }
        if (strlen($text) < 13) {
            return self::INCOMPLETE;
        }
        return Cnic::validate($text) ? self::VALID : self::INVALID;
    }

    /**
     * Formats a mobile number as the user types: `0300-1234567`, or
     * `+92 300 1234567` when the user starts with the country code.
     */
    public static function formatPhone(?string $value): string
    {
        $value ??= '';
        $split = self::splitPhone($value);
        if ($split === null) {
            return $value;
        }
        if ($split === 'incomplete') {
            return self::clean($value);
        }
        [$national, $international] = $split;
        $digits = substr(Js::replace('/[^0-9]/u', '', $national), 0, 10);
        if ($international) {
            return strlen($digits) <= 3
                ? Js::trimEnd('+92 ' . $digits)
                : '+92 ' . substr($digits, 0, 3) . ' ' . substr($digits, 3);
        }
        $local = '0' . $digits;
        return strlen($local) <= 4 ? $local : substr($local, 0, 4) . '-' . substr($local, 4);
    }

    /**
     * Checks a mobile number while the user is typing. The `03XX` prefix is
     * checked as soon as it is complete.
     */
    public static function checkPhone(?string $value): string
    {
        $value ??= '';
        if (self::clean($value) === '') {
            return self::EMPTY;
        }
        $split = self::splitPhone($value);
        if ($split === null) {
            return self::INVALID;
        }
        if ($split === 'incomplete') {
            return self::INCOMPLETE;
        }
        $national = $split[0];
        if ($national === '') {
            return self::INCOMPLETE;
        }
        if ($national[0] !== '3') {
            return self::INVALID;
        }
        if (strlen($national) >= 3 && !Phone::isAllocatedPrefix('0' . substr($national, 0, 3))) {
            return self::INVALID;
        }
        if (strlen($national) < 10) {
            return self::INCOMPLETE;
        }
        return strlen($national) === 10 ? self::VALID : self::INVALID;
    }

    /** Formats an IBAN as the user types: uppercase, in groups of four, up to 24 characters. */
    public static function formatIban(?string $value): string
    {
        $clean = substr(Js::replace('/[^A-Z0-9]/u', '', Unicode::upper($value ?? '')), 0, 24);
        return implode(' ', str_split($clean, 4));
    }

    /** Checks a Pakistani IBAN while the user is typing. */
    public static function checkIban(?string $value): string
    {
        $clean = Js::replace('/[' . Js::WS . '-]/u', '', Unicode::upper($value ?? ''));
        if ($clean === '') {
            return self::EMPTY;
        }
        if (Js::utf16Length($clean) > 24 || !Js::test(self::IBAN_SHAPE, $clean)) {
            return self::INVALID;
        }
        if (strlen($clean) < 24) {
            return self::INCOMPLETE;
        }
        return Iban::validate($clean) ? self::VALID : self::INVALID;
    }

    /** Removes the characters people use between groups of digits. */
    private static function clean(string $value): string
    {
        return Js::replace('/[' . Js::WS . '\-‐‑‒–—.\/()]/u', '', Js::toAsciiDigits($value));
    }

    /**
     * Splits phone input into the national number (without its leading 0)
     * and whether a country code was typed. Returns null when the start
     * cannot be a Pakistani number, and `incomplete` while the country code
     * is still being typed.
     *
     * @return array{0: string, 1: bool}|'incomplete'|null
     */
    private static function splitPhone(string $value): array|string|null
    {
        $text = self::clean($value);
        if (!Js::test('/^\+?[0-9]*\z/u', $text)) {
            return null;
        }
        foreach (['+92', '0092', '92'] as $code) {
            if (str_starts_with($code, $text) && strlen($text) < strlen($code)) {
                // "0" and "9" could also be the start of a local or short number.
                return $text === '0' ? ['', false] : 'incomplete';
            }
            // Mobile numbers start with 3, so a leading 92 is always the country code.
            if (str_starts_with($text, $code)) {
                $rest = substr($text, strlen($code));
                return [str_starts_with($rest, '0') ? substr($rest, 1) : $rest, true];
            }
        }
        if (str_starts_with($text, '+')) {
            return null;
        }
        return [str_starts_with($text, '0') ? substr($text, 1) : $text, false];
    }
}
