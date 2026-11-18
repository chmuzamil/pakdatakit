<?php

declare(strict_types=1);

namespace PakDataKit\Internal;

/**
 * Exact money arithmetic in whole paisa, shared by the sales tax module.
 * Every port does the same steps so results match to the paisa.
 *
 * @internal
 */
final class Money
{
    /** Largest amount accepted, in rupees (one trillion). */
    public const MAX_AMOUNT = 1_000_000_000_000;

    /**
     * Converts a number to an integer count of `10^-scale` units, rounding
     * half up from the decimal digits as written (`1.005` with scale 2 is
     * 101, not the 100 that floating-point `1.005 * 100` gives). The digits
     * are the shortest round-trip form, as JavaScript's String(number).
     *
     * Returns null for anything that is not a finite int or float from 0 to
     * MAX_AMOUNT (booleans and strings included).
     */
    public static function toUnits(mixed $value, int $scale): ?int
    {
        if (!is_int($value) && !is_float($value)) {
            return null;
        }
        if (is_float($value) && !is_finite($value)) {
            return null;
        }
        if ($value < 0 || $value > self::MAX_AMOUNT) {
            return null;
        }
        // The shortest decimal form, e.g. "1.005", "1e-7" or "123".
        $match = Js::match('/^([0-9]+)(?:\.([0-9]+))?(?:e([+-][0-9]+))?\z/', Js::numberToString($value));
        if ($match === null) {
            return null;
        }
        $intPart = $match[1];
        $fracPart = $match[2] ?? '';
        $exponent = (int) ($match[3] ?? '0');
        // All digits, and where the decimal point sits after shifting by the exponent.
        $all = $intPart . $fracPart;
        $digits = ltrim($all, '0');
        if ($digits === '') {
            $digits = '0';
        }
        $point = strlen($intPart) + $exponent - strlen($all) + strlen($digits);
        // Units = digits shifted so that `scale` digits follow the point.
        $keep = $point + $scale;
        if ($keep <= 0) {
            // Everything is below half a unit unless the first dropped digit
            // is >= 5 and sits exactly at the rounding position.
            return $keep === 0 && (int) $digits[0] >= 5 ? 1 : 0;
        }
        if ($keep >= strlen($digits)) {
            return (int) ($digits . str_repeat('0', $keep - strlen($digits)));
        }
        $whole = (int) substr($digits, 0, $keep);
        return (int) $digits[$keep] >= 5 ? $whole + 1 : $whole;
    }

    /** Rupees from paisa, as a float with at most 2 decimals. */
    public static function fromPaisa(int $paisa): float
    {
        return $paisa / 100.0;
    }

    /**
     * `numerator / denominator`, both non-negative integers, rounded half up.
     * Exact on 64-bit PHP: callers keep the numerator at most 10^18.
     */
    public static function divideHalfUp(int $numerator, int $denominator): int
    {
        $quotient = intdiv($numerator, $denominator);
        $remainder = $numerator % $denominator;
        return $remainder * 2 >= $denominator ? $quotient + 1 : $quotient;
    }
}
