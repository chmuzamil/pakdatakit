<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Islamic (Hijri) date components.
 */
final readonly class HijriDate
{
    use Internal\ToArray;

    public function __construct(
        /** Hijri year. */
        public int $year,
        /** Month, 1 (Muharram) to 12 (Dhu al-Hijjah). */
        public int $month,
        /** Day of the month, 1 to 30. */
        public int $day,
    ) {
    }
}
