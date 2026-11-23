<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * The source that confirms the Gregorian date of 1 Ramazan for a Zakat year
 * (ZakatNisab::$valuationDate).
 */
final readonly class ZakatValuationDateSource
{
    use Internal\ToArray;

    public function __construct(
        /** What the source says and who published it. */
        public string $reference,
        /** Where it was published. */
        public string $url,
    ) {
    }
}
