<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Js;
use PakDataKit\Internal\Unicode;

/**
 * Pakistani passport number checks.
 */
final class Passport
{
    /**
     * Validates the format of a Pakistani passport number: two letters
     * followed by seven digits, e.g. `AB1234567`. Case, surrounding spaces
     * and spaces or dashes between the letters and digits are ignored.
     *
     * DGIP does not publish the format, so this checks the common shape
     * only; other passport types may differ. See DATA.md in the repository.
     * Never throws.
     */
    public static function validate(?string $passport): bool
    {
        $compact = Js::replace('/[-‐‑‒–— ]/u', '', Unicode::upper(Js::toAsciiDigits(Js::trim($passport ?? ''))));
        return Js::test('/^[A-Z]{2}[0-9]{7}\z/u', $compact);
    }
}
