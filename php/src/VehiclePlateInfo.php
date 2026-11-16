<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of VehiclePlate::parse().
 */
final readonly class VehiclePlateInfo
{
    use Internal\ToArray;

    public function __construct(
        /** Letters before the number, e.g. `LEA`. */
        public string $series,
        /** Digits of the registration number, e.g. `1234`. */
        public string $number,
        /** Two-digit year printed on some older Punjab plates, e.g. `19`; otherwise null. */
        public ?string $year,
        /** Series and number joined with a dash, e.g. `LEA-1234` (without the year). */
        public string $formatted,
    ) {
    }
}
