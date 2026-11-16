<?php

declare(strict_types=1);

namespace PakDataKit;

use PakDataKit\Internal\Js;
use PakDataKit\Internal\Unicode;

/**
 * Pakistani vehicle registration number checks.
 */
final class VehiclePlate
{
    private const PATTERN = '/^([A-Z]{1,4})[-‐‑‒–— ]?([0-9]{1,4})(?:[-‐‑‒–— \/]{1,3}([0-9]{2}))?\z/u';

    /**
     * Splits a vehicle registration number into its series letters, number
     * and optional year, e.g. `LEA-1234` or `ABC 123`.
     *
     * There is no single national format, so this accepts the common shape:
     * 1-4 letters, then 1-4 digits, optionally followed by a two-digit year
     * after a separator (`LEA-1234-19`). Series letters are not checked.
     * Returns null if the plate does not have that shape.
     */
    public static function parse(?string $plate): ?VehiclePlateInfo
    {
        $match = Js::match(self::PATTERN, Unicode::upper(Js::toAsciiDigits(Js::trim($plate ?? ''))));
        if ($match === null) {
            return null;
        }
        $series = (string) $match[1];
        $number = (string) $match[2];
        return new VehiclePlateInfo($series, $number, $match[3] ?? null, $series . '-' . $number);
    }

    /** Validates the format of a vehicle registration number. See parse(). Never throws. */
    public static function validate(?string $plate): bool
    {
        return self::parse($plate) !== null;
    }
}
