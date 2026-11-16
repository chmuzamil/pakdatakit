<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Information encoded in a CNIC number.
 */
final readonly class CnicInfo
{
    use Internal\ToArray;

    public function __construct(
        /** The CNIC as 13 digits without separators. */
        public string $digits,
        /** The CNIC in `#####-#######-#` form. */
        public string $formatted,
        /** Province where the CNIC was first registered (from the first digit). */
        public string $province,
        /** `male` (odd last digit) or `female` (even last digit). */
        public string $gender,
    ) {
    }
}
