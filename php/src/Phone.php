<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Data;
use PakDataKit\Internal\Js;

/**
 * Pakistani mobile number validation, formatting and analysis.
 */
final class Phone
{
    /** @var array<string, string>|null Prefix (0XXX) to network. */
    private static ?array $prefixes = null;

    /**
     * Validates a Pakistani mobile number on an allocated `03XX` prefix.
     * Accepts local (`0300 1234567`), international (`+92`, `0092`, `92`) and
     * short (`3001234567`) forms. Never throws.
     */
    public static function validate(?string $phone): bool
    {
        return self::normalizeDigits($phone) !== null;
    }

    /** Formats a mobile number as E.164 (`+923001234567`), or null if invalid. */
    public static function format(?string $phone): ?string
    {
        $digits = self::normalizeDigits($phone);
        return $digits === null ? null : '+' . $digits;
    }

    /** Validates, formats and detects the network of a mobile number in one call. */
    public static function analyze(?string $phone): PhoneAnalysis
    {
        $formatted = self::format($phone);
        return $formatted === null
            ? new PhoneAnalysis(false, null, Networks::UNKNOWN)
            : new PhoneAnalysis(true, $formatted, Networks::getNetwork($phone));
    }

    /**
     * @internal
     * @return array<string, string>
     */
    public static function prefixes(): array
    {
        if (self::$prefixes === null) {
            self::$prefixes = [];
            foreach (Data::load('networks') as $entry) {
                self::$prefixes[$entry['prefix']] = $entry['network'];
            }
        }
        return self::$prefixes;
    }

    /** @internal Whether a `03XX` mobile prefix is allocated to an operator. */
    public static function isAllocatedPrefix(string $prefix): bool
    {
        return isset(self::prefixes()[$prefix]);
    }

    /**
     * @internal Digits with country code (no plus), or null when the input is
     * not a mobile number on an allocated prefix.
     */
    public static function normalizeDigits(?string $phone): ?string
    {
        $digits = Js::stripSeparators(Js::toAsciiDigits($phone ?? ''));
        if (str_starts_with($digits, '+')) {
            $digits = substr($digits, 1);
        } elseif (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }
        if (str_starts_with($digits, '92') && Js::utf16Length($digits) > 10) {
            $digits = substr($digits, 2);
        }
        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }
        if (!Js::test('/^3[0-9]{9}\z/u', $digits)) {
            return null;
        }
        return self::isAllocatedPrefix('0' . substr($digits, 0, 3)) ? '92' . $digits : null;
    }

    /** @internal The local mobile prefix (`0XXX`), or null if invalid. */
    public static function getPrefix(?string $phone): ?string
    {
        $digits = self::normalizeDigits($phone);
        return $digits === null ? null : '0' . substr($digits, 2, 3);
    }
}
