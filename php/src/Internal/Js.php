<?php

declare(strict_types=1);

namespace PakDataKit\Internal;

/**
 * Helpers that reproduce JavaScript semantics, so results match the npm
 * package exactly: whitespace classes, Math.round, number-to-string
 * conversion, toFixed rounding and localeCompare ordering.
 *
 * Every regex uses the /u flag with explicit classes ([0-9], the whitespace
 * set below, \z): with /u, PCRE's \d, \s, \w and $ differ from JavaScript's.
 * A regex that fails (invalid UTF-8, backtrack limit) counts as "no match",
 * so validators return false instead of raising an error.
 *
 * @internal
 */
final class Js
{
    /** Regex character-class body equivalent to JavaScript's \s. */
    public const WS = '\t\n\x0b\x0c\r \x{a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}';

    public const MAX_SAFE_INTEGER = 9007199254740991;

    private const URDU_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    private const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

    /** @var array<string, string>|null */
    private static ?array $digitMap = null;

    /** @var array<string, int>|null */
    private static ?array $collation = null;

    // ------------------------------------------------------------------ regex

    public static function test(string $pattern, string $subject): bool
    {
        return @preg_match($pattern, $subject) === 1;
    }

    /** @return list<string|null>|null The groups, or null if there is no match. */
    public static function match(string $pattern, string $subject): ?array
    {
        if (@preg_match($pattern, $subject, $groups, PREG_UNMATCHED_AS_NULL) !== 1) {
            return null;
        }
        return $groups;
    }

    /**
     * @return list<array{0: string, 1: int}> Each match of group 1 with its byte offset.
     */
    public static function matchAllWithOffsets(string $pattern, string $subject): array
    {
        if (!@preg_match_all($pattern, $subject, $matches, PREG_OFFSET_CAPTURE | PREG_SET_ORDER)) {
            return [];
        }
        return array_map(static fn (array $m): array => [$m[1][0], $m[1][1]], $matches);
    }

    public static function replace(string $pattern, string $replacement, string $subject): string
    {
        return @preg_replace($pattern, $replacement, $subject) ?? $subject;
    }

    /** @param callable(array<int, string>): string $callback */
    public static function replaceCallback(string $pattern, callable $callback, string $subject): string
    {
        return @preg_replace_callback($pattern, $callback, $subject) ?? $subject;
    }

    // ---------------------------------------------------------------- strings

    /** String.prototype.trim. */
    public static function trim(string $value): string
    {
        return self::replace('/^[' . self::WS . ']+|[' . self::WS . ']+\z/u', '', $value);
    }

    /** String.prototype.trimEnd. */
    public static function trimEnd(string $value): string
    {
        return self::replace('/[' . self::WS . ']+\z/u', '', $value);
    }

    /** Converts Urdu (Extended Arabic-Indic) and Arabic-Indic digits to ASCII digits. */
    public static function toAsciiDigits(string $value): string
    {
        if (self::$digitMap === null) {
            $map = [];
            foreach (self::URDU_DIGITS as $i => $digit) {
                $map[$digit] = (string) $i;
            }
            foreach (self::ARABIC_INDIC_DIGITS as $i => $digit) {
                $map[$digit] = (string) $i;
            }
            self::$digitMap = $map;
        }
        return strtr($value, self::$digitMap);
    }

    /** Removes whitespace, hyphens and dashes, dots, slashes and parentheses. */
    public static function stripSeparators(string $value): string
    {
        return self::replace('/[' . self::WS . '\-‐‑‒–—.\/()]/u', '', $value);
    }

    /** Collapses internal whitespace and trims leading/trailing whitespace. */
    public static function normalizeWhitespace(string $value): string
    {
        return self::replace('/[' . self::WS . ']+/u', ' ', self::trim($value));
    }

    /** Lowercase with collapsed whitespace. */
    public static function normalizeKey(string $value): string
    {
        return Unicode::lower(self::normalizeWhitespace($value));
    }

    /**
     * Splits a string as [...string] does: by code point.
     *
     * @return list<string>
     */
    public static function codePoints(string $value): array
    {
        if ($value === '') {
            return [];
        }
        $parts = @preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY);
        return $parts === false ? mb_str_split($value, 1, 'UTF-8') : $parts;
    }

    /** Number of code points, as [...string].length. */
    public static function codePointCount(string $value): int
    {
        return count(self::codePoints($value));
    }

    /** string.length: the number of UTF-16 code units. */
    public static function utf16Length(string $value): int
    {
        return intdiv(strlen(mb_convert_encoding($value, 'UTF-16LE', 'UTF-8')), 2);
    }

    /** string.slice(0, -count), counting UTF-16 code units. */
    public static function dropLastUtf16Units(string $value, int $count): string
    {
        $units = mb_convert_encoding($value, 'UTF-16LE', 'UTF-8');
        $keep = max(0, strlen($units) - 2 * $count);
        return mb_convert_encoding(substr($units, 0, $keep), 'UTF-8', 'UTF-16LE');
    }

    /**
     * values.sort((a, b) => a.localeCompare(b)), as a new list. The order of
     * the dataset strings comes from data/collation.php; other strings fall
     * back to byte order.
     *
     * @param list<string> $values
     * @return list<string>
     */
    public static function localeSorted(array $values): array
    {
        self::$collation ??= Data::load('collation');
        $ranks = self::$collation;
        usort($values, static function (string $a, string $b) use ($ranks): int {
            if (isset($ranks[$a], $ranks[$b])) {
                return $ranks[$a] <=> $ranks[$b];
            }
            return strcmp($a, $b);
        });
        return $values;
    }

    // ---------------------------------------------------------------- numbers

    /** Number.isSafeInteger. */
    public static function isSafeInteger(int|float $value): bool
    {
        if (is_int($value)) {
            return abs($value) <= self::MAX_SAFE_INTEGER;
        }
        return is_finite($value) && floor($value) === $value && abs($value) <= (float) self::MAX_SAFE_INTEGER;
    }

    /** Math.round: halves round towards positive infinity. */
    public static function round(float $value): float
    {
        $floor = floor($value);
        return $value - $floor >= 0.5 ? $floor + 1 : $floor;
    }

    /** Floor division, like Math.floor(a / b) on integers. */
    public static function floorDiv(int $a, int $b): int
    {
        $q = intdiv($a, $b);
        return ($a % $b !== 0 && ($a < 0) !== ($b < 0)) ? $q - 1 : $q;
    }

    /**
     * Shortest round-trip decimal digits of a positive finite float, and the
     * position n of the decimal point (value = 0.digits x 10^n). Independent
     * of the locale and of the precision ini settings.
     *
     * @return array{0: string, 1: int}
     */
    private static function shortestDigits(float $positive): array
    {
        // json_encode writes the shortest digits that round-trip when
        // serialize_precision is -1, always with "." as the decimal point.
        $previous = @ini_set('serialize_precision', '-1');
        $text = json_encode($positive);
        if ($previous !== false) {
            @ini_set('serialize_precision', $previous);
        }
        if (!is_string($text) || (float) $text !== $positive) {
            // serialize_precision could not be set: find the shortest
            // precision that round-trips. %e may use the locale's decimal
            // point, which is normalized here.
            for ($precision = 0; $precision <= 16; $precision++) {
                $text = preg_replace('/[^0-9e+\-]/i', '.', sprintf('%.' . $precision . 'e', $positive)) ?? '';
                if ((float) $text === $positive) {
                    break;
                }
            }
        }
        [$mantissa, $exponent] = array_pad(explode('e', strtolower($text)), 2, '0');
        $point = strpos($mantissa, '.');
        $integerPart = $point === false ? $mantissa : substr($mantissa, 0, $point);
        $digits = $integerPart . ($point === false ? '' : substr($mantissa, $point + 1));
        $n = strlen($integerPart) + (int) $exponent;
        while (strlen($digits) > 1 && $digits[0] === '0') {
            $digits = substr($digits, 1);
            $n--;
        }
        $digits = rtrim($digits, '0');
        if ($digits === '') {
            $digits = '0';
        }
        return [$digits, $n];
    }

    /** String(number). */
    public static function numberToString(int|float $value): string
    {
        $value = (float) $value;
        if (is_nan($value)) {
            return 'NaN';
        }
        if (is_infinite($value)) {
            return $value > 0 ? 'Infinity' : '-Infinity';
        }
        if ($value == 0.0) {
            return '0';
        }
        $sign = $value < 0 ? '-' : '';
        [$digits, $n] = self::shortestDigits(abs($value));
        $k = strlen($digits);
        if ($k <= $n && $n <= 21) {
            $text = $digits . str_repeat('0', $n - $k);
        } elseif (0 < $n && $n <= 21) {
            $text = substr($digits, 0, $n) . '.' . substr($digits, $n);
        } elseif (-6 < $n && $n <= 0) {
            $text = '0.' . str_repeat('0', -$n) . $digits;
        } else {
            $e = $n - 1;
            $exp = ($e >= 0 ? '+' : '-') . abs($e);
            $text = $k === 1 ? $digits . 'e' . $exp : $digits[0] . '.' . substr($digits, 1) . 'e' . $exp;
        }
        return $sign . $text;
    }

    /**
     * The integer value of a non-negative whole float, written from its
     * shortest round-trip digits (as Intl.NumberFormat does) with thousands
     * separators. Does not use number_format or the locale.
     */
    public static function groupInteger(float $whole): string
    {
        if ($whole == 0.0) {
            return '0';
        }
        [$digits, $n] = self::shortestDigits($whole);
        $integer = $n >= strlen($digits) ? $digits . str_repeat('0', $n - strlen($digits)) : substr($digits, 0, max($n, 0));
        if ($integer === '') {
            $integer = '0';
        }
        return strrev(implode(',', str_split(strrev($integer), 3)));
    }

    /** Number.prototype.toFixed: rounds the exact binary value half up. */
    public static function toFixed(int|float $value, int $places): string
    {
        $value = (float) $value;
        if (!is_finite($value) || abs($value) >= 1e21) {
            return self::numberToString($value);
        }
        if ($value == 0.0) {
            return $places > 0 ? '0.' . str_repeat('0', $places) : '0';
        }

        // Exact decimal expansion of the double: mantissa x 2^exponent.
        $bits = unpack('J', pack('E', abs($value)))[1];
        $exponentBits = ($bits >> 52) & 0x7FF;
        $mantissa = $bits & 0xFFFFFFFFFFFFF;
        if ($exponentBits === 0) {
            $exponent = -1074;
        } else {
            $mantissa |= 1 << 52;
            $exponent = $exponentBits - 1075;
        }

        $digits = (string) $mantissa;
        $scale = 0; // value = digits / 10^scale
        if ($exponent >= 0) {
            $digits = self::multiplyByPower($digits, 2, $exponent);
        } else {
            // m / 2^k = m x 5^k / 10^k
            $digits = self::multiplyByPower($digits, 5, -$exponent);
            $scale = -$exponent;
        }

        if ($scale > $places) {
            $cut = $scale - $places;
            $digits = str_pad($digits, $cut + 1, '0', STR_PAD_LEFT);
            $kept = substr($digits, 0, -$cut);
            if ($digits[strlen($digits) - $cut] >= '5') {
                $kept = self::addOne($kept);
            }
            $digits = $kept;
        } else {
            $digits .= str_repeat('0', $places - $scale);
        }

        $digits = ltrim($digits, '0');
        if ($places > 0) {
            $digits = str_pad($digits, $places + 1, '0', STR_PAD_LEFT);
            $digits = substr($digits, 0, -$places) . '.' . substr($digits, -$places);
        } elseif ($digits === '') {
            $digits = '0';
        }
        return ($value < 0 ? '-' : '') . $digits;
    }

    /** Multiplies a decimal digit string by base^power, exactly. */
    private static function multiplyByPower(string $digits, int $base, int $power): string
    {
        // Multiply in steps small enough for 64-bit integer arithmetic.
        $step = $base === 2 ? 30 : 13;
        $factor = $base ** $step;
        while ($power > 0) {
            $multiplier = $power >= $step ? $factor : $base ** $power;
            $power -= $step;
            $carry = 0;
            $out = '';
            for ($i = strlen($digits) - 1; $i >= 0; $i--) {
                $product = (int) $digits[$i] * $multiplier + $carry;
                $out .= (string) ($product % 10);
                $carry = intdiv($product, 10);
            }
            while ($carry > 0) {
                $out .= (string) ($carry % 10);
                $carry = intdiv($carry, 10);
            }
            $digits = strrev($out);
        }
        return $digits;
    }

    private static function addOne(string $digits): string
    {
        for ($i = strlen($digits) - 1; $i >= 0; $i--) {
            if ($digits[$i] !== '9') {
                $digits[$i] = (string) ((int) $digits[$i] + 1);
                return $digits;
            }
            $digits[$i] = '0';
        }
        return '1' . $digits;
    }
}
