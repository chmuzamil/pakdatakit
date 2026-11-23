<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * The amount at or below which a withholding case collects nothing (231AB:
 * Rs 50,000 of cash withdrawn in a day, all withdrawals added up), as listed
 * by Withholding::getRates().
 */
final readonly class WithholdingThreshold
{
    use Internal\ToArray;

    public function __construct(
        /** The threshold in rupees. */
        public int|float $amount,
        /** The period the amounts are added up over, e.g. `day`. */
        public string $per,
    ) {
    }
}
