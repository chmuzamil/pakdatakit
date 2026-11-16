<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * Result of Tax::analyzeNtn().
 */
final readonly class NtnInfo
{
    use Internal\ToArray;

    public function __construct(
        /** `individual` (a CNIC) or `business` (7-digit NTN). */
        public string $type,
        /** Digits without separators (7, 8 or 13 digits). */
        public string $digits,
        /** `1234567-8` for business NTNs with a check digit, `#####-#######-#` for CNICs. */
        public string $formatted,
    ) {
    }
}
