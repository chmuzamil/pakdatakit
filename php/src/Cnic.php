<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Js;

/**
 * CNIC (Computerized National Identity Card) validation and decoding.
 */
final class Cnic
{
    // 13 digits, optionally grouped as #####-#######-# with a consistent separator.
    private const PATTERN = '/^[1-8][0-9]{4}([-‐‑‒–—. ]?)[0-9]{7}\1[0-9]\z/u';

    private const PROVINCES = [
        '1' => 'Khyber Pakhtunkhwa',
        '2' => 'Khyber Pakhtunkhwa',
        '3' => 'Punjab',
        '4' => 'Sindh',
        '5' => 'Balochistan',
        '6' => 'Islamabad Capital Territory',
        '7' => 'Gilgit-Baltistan',
        '8' => 'Azad Jammu and Kashmir',
    ];

    /**
     * Validates a Pakistani CNIC number (structure only; NADRA publishes no
     * check-digit algorithm). Accepts `3520212345671`, `35202-1234567-1`,
     * `35202 1234567 1` and Urdu digits. Never throws.
     */
    public static function validate(?string $cnic): bool
    {
        return Js::test(self::PATTERN, Js::toAsciiDigits(Js::trim($cnic ?? '')));
    }

    /**
     * Reads the province of first registration and the gender encoded in a
     * CNIC. Returns null if the CNIC is invalid.
     */
    public static function getInfo(?string $cnic): ?CnicInfo
    {
        if (!self::validate($cnic)) {
            return null;
        }
        $digits = Js::replace('/[^0-9]/u', '', Js::toAsciiDigits($cnic ?? ''));
        return new CnicInfo(
            digits: $digits,
            formatted: substr($digits, 0, 5) . '-' . substr($digits, 5, 7) . '-' . $digits[12],
            province: self::PROVINCES[$digits[0]],
            gender: ((int) $digits[12]) % 2 === 1 ? 'male' : 'female',
        );
    }
}
