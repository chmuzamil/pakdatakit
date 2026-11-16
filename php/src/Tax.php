<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Js;

/**
 * National Tax Number (NTN) and Sales Tax Registration Number (STRN) checks.
 */
final class Tax
{
    /**
     * Analyzes a National Tax Number: a 13-digit CNIC for individuals, or 7
     * digits (optionally followed by a check digit) for businesses. FBR does
     * not publish a check-digit algorithm, so this checks the format only.
     * Returns null if the format is invalid.
     */
    public static function analyzeNtn(?string $ntn): ?NtnInfo
    {
        $trimmed = Js::toAsciiDigits(Js::trim($ntn ?? ''));
        if (Cnic::validate($trimmed)) {
            $digits = Js::stripSeparators($trimmed);
            return new NtnInfo(
                'individual',
                $digits,
                substr($digits, 0, 5) . '-' . substr($digits, 5, 7) . '-' . $digits[12],
            );
        }

        $match = Js::match('/^([0-9]{7})(?:[-‐‑‒–— ]?([0-9]))?\z/u', $trimmed);
        if ($match === null) {
            return null;
        }
        $base = (string) $match[1];
        $check = $match[2] ?? null;
        return new NtnInfo('business', $base . ($check ?? ''), $check === null ? $base : $base . '-' . $check);
    }

    /** Validates the format of an NTN. See analyzeNtn(). Never throws. */
    public static function validateNtn(?string $ntn): bool
    {
        return self::analyzeNtn($ntn) !== null;
    }

    /**
     * Validates the format of a Sales Tax Registration Number: 13 digits,
     * with optional spaces or dashes. Format only. Never throws.
     */
    public static function validateStrn(?string $strn): bool
    {
        return Js::test('/^[0-9]{13}\z/u', Js::stripSeparators(Js::toAsciiDigits($strn ?? '')));
    }
}
